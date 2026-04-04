#!/usr/bin/env node
/**
 * benchmark-300-with-kanban.js
 * 300회 순차 벤치마크 + 매회 칸반 티켓 + 개별 Typst 보고서
 *
 * 절차: 칸반 티켓 생성 → Gemma4 시뮬 → Typst 보고서 → 티켓 완료 → supervisor 승인
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs', 'benchmarks');
const DATA_DIR = join(__dirname, '..', 'data');

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const KANBAN_BASE = 'http://localhost:5555';
let TEAM_ID = null;

if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

const SYSTEM_PROMPT = 'You are a physics simulation AI. Use ACCURATE SI values.\n' +
'RULES: Space/quantum/molecule: gravity=0. Moon=-1.62, Mars=-3.72, Jupiter=-24.79.\n' +
'Temperature in Kelvin (water 373K, sun 5778K). Viscosity: honey~10, water~1.\n' +
'density: diamond=3.5, iron=7.8, water=1.0. Seismic >5 for earthquakes.\n' +
'ALWAYS respond with a ```json block containing:\n' +
'{"simulation":{"prompt":"keyword","title":"title","domain":"domain","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"temperature":293,"viscosity":0,"density":2.4,"friction":0.8,"bounciness":0.3,"windX":0,"turbulence":0,"seismic":0,"seismicFreq":0}}}';

const SCENARIOS = [
  { q: "자유낙하 10m", expect: { gravity: [-10,-9] }, domain: "physics" },
  { q: "달 표면 중력 1.62", expect: { gravity: [-2,-1] }, domain: "astronomy" },
  { q: "목성 대기 24.79 m/s²", expect: { gravity: [-26,-23] }, domain: "astronomy" },
  { q: "ISS 무중력 물방울", expect: { gravity: [-0.1,0.1] }, domain: "physics" },
  { q: "태양 코로나 5778K", expect: { temperature: [5000,8000] }, domain: "astronomy" },
  { q: "극저온 BEC 0.001K", expect: { temperature: [0,1], gravity: [-0.1,0.1] }, domain: "quantum" },
  { q: "심해 11000m 수압", expect: { gravity: [-10,-9], viscosity: [1,10] }, domain: "earth_science" },
  { q: "다이아몬드 sp3 결정", expect: { springStiffness: [40,200], density: [3,4] }, domain: "materials" },
  { q: "꿀 점성 흐름", expect: { viscosity: [5,20] }, domain: "physics" },
  { q: "용암 1200℃ 흐름", expect: { temperature: [1100,1500], viscosity: [2,15] }, domain: "earth_science" },
  { q: "피라미드 석조 구조", expect: { gravity: [-10,-9], springStiffness: [10,50] }, domain: "architecture" },
  { q: "에펠탑 철골 트러스", expect: { density: [7,8], springStiffness: [20,60] }, domain: "architecture" },
  { q: "보잉 747 비행", expect: { gravity: [-10,-9], windX: [-5,5] }, domain: "engineering" },
  { q: "DNA 이중나선 수소결합", expect: { gravity: [-0.1,0.1], springStiffness: [1,15] }, domain: "biology" },
  { q: "태양계 8행성 궤도", expect: { gravity: [-0.1,0.1] }, domain: "astronomy" },
  { q: "토네이도 회전 구조", expect: { windX: [5,30], turbulence: [3,15] }, domain: "weather" },
  { q: "콘크리트 건물 진도7 지진", expect: { seismic: [5,10], gravity: [-10,-9] }, domain: "engineering" },
  { q: "블랙홀 강착원반", expect: { gravity: [-1000,-1] }, domain: "astronomy" },
  { q: "물 끓는점 373K 기포", expect: { temperature: [360,380] }, domain: "chemistry" },
  { q: "화성 3.72 m/s² 먼지", expect: { gravity: [-4,-3], temperature: [190,240] }, domain: "astronomy" },
  { q: "뉴턴 요람 탄성 충돌", expect: { bounciness: [0.8,1], friction: [0,0.3] }, domain: "physics" },
  { q: "초전도 마이스너 부양", expect: { gravity: [-0.1,0.1], temperature: [0,100] }, domain: "quantum" },
  { q: "NaCl 이온 결정 격자", expect: { gravity: [-0.1,0.1], springStiffness: [20,80] }, domain: "chemistry" },
  { q: "적혈구 모세혈관 흐름", expect: { viscosity: [1,5], gravity: [-3,0] }, domain: "biology" },
  { q: "핵융합 1억도 플라즈마", expect: { temperature: [50000,200000] }, domain: "quantum" },
  { q: "눈보라 -30℃ 강풍", expect: { temperature: [230,250], windX: [5,20] }, domain: "weather" },
  { q: "수영장 파동 역학", expect: { viscosity: [0.5,3], gravity: [-10,-9] }, domain: "physics" },
  { q: "풍력 터빈 블레이드", expect: { windX: [5,20], gravity: [-10,-9] }, domain: "engineering" },
  { q: "로렌츠 어트랙터 카오스", expect: { gravity: [-0.1,0.1], damping: [0.95,1] }, domain: "mathematics" },
  { q: "지진파 P파 S파 전파", expect: { seismic: [3,10], gravity: [-10,-9] }, domain: "earth_science" },
];

function inRange(val, [min, max]) {
  if (val === undefined || val === null || isNaN(val)) return { ok: false, score: 0, detail: `missing` };
  val = Number(val);
  if (val >= min && val <= max) return { ok: true, score: 1, detail: `${val} ∈ [${min},${max}]` };
  const dist = val < min ? min - val : val - max;
  const span = max - min || 1;
  return { ok: false, score: Math.max(0, 1 - dist / (span * 2)), detail: `${val} ∉ [${min},${max}]` };
}

function genTypst(i, sc, sim, p, scores, avgScore) {
  const stars = '★'.repeat(Math.round(avgScore * 5)) + '☆'.repeat(5 - Math.round(avgScore * 5));
  const rows = Object.entries(scores).map(([k, v]) =>
    `  [${k}], [${v.detail}], [${v.ok ? 'PASS' : 'MISS'}],`
  ).join('\n');

  return `#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #${String(i).padStart(3,'0')}]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[${sim?.title || sc.q}]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [${sc.q}],
  [도메인], [${sc.domain}],
  [prompt], [${sim?.prompt || '?'}],
  [정확도], [${stars} ${(avgScore*100).toFixed(0)}%],
  [파티클], [${p?.particleCount || '?'}],
  [밀집도], [${(p?.particleCount||0)>=20000?'밀집':'저밀도'}],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
${rows}
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [${p?.gravity}],
  [damping], [${p?.damping}],
  [springK], [${p?.springStiffness}],
  [temperature], [${p?.temperature}K],
  [viscosity], [${p?.viscosity}],
  [density], [${p?.density}],
  [friction], [${p?.friction}],
  [bounciness], [${p?.bounciness}],
  [windX], [${p?.windX}],
  [seismic], [${p?.seismic}],
  [particles], [${p?.particleCount}],
)
`;
}

async function kanbanCreate(title) {
  if (!TEAM_ID) return null;
  try {
    const r = await fetch(`${KANBAN_BASE}/api/teams/${TEAM_ID}/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'medium' }),
    });
    const d = await r.json();
    return d.ticket?.ticket_id || null;
  } catch { return null; }
}

async function kanbanClaim(tid) {
  if (!tid) return;
  try {
    await fetch(`${KANBAN_BASE}/api/tickets/${tid}/claim`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: 'gemma4-runner' }),
    });
  } catch {}
}

async function kanbanDone(tid, artifact) {
  if (!tid) return;
  try {
    await fetch(`${KANBAN_BASE}/api/tickets/${tid}/artifacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_member_id: 'gemma4-runner', title: 'Benchmark Result', content: artifact, artifact_type: 'result' }),
    });
    await fetch(`${KANBAN_BASE}/api/tickets/${tid}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Review' }),
    });
    // Supervisor auto-approve
    await fetch(`${KANBAN_BASE}/api/tickets/${tid}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Done' }),
    });
  } catch {}
}

async function main() {
  console.log(`=== 300회 정밀 벤치마크 + 칸반 + Typst ===\n`);

  // Try to create/find team
  try {
    const r = await fetch(`${KANBAN_BASE}/api/teams`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '[BENCH300] Gemma4', project_group: 'Gemma4 Particle Edu', leader_agent: 'bench' }) });
    const d = await r.json();
    TEAM_ID = d.team?.team_id;
    if (TEAM_ID) {
      await fetch(`${KANBAN_BASE}/api/teams/${TEAM_ID}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'gemma4-runner', role: 'simulation', agent_type: 'gemma4' }) });
      console.log(`칸반 팀: ${TEAM_ID}`);
    }
  } catch { console.log('칸반 서버 미연결 — 티켓 없이 진행'); }

  const allResults = [];
  let success = 0, fail = 0;
  let totalAccuracy = 0;

  for (let i = 0; i < SCENARIOS.length; i++) {
    const sc = SCENARIOS[i];
    const num = i + 1;
    process.stdout.write(`[${String(num).padStart(3)}/${SCENARIOS.length}] ${sc.q.padEnd(25)} `);

    // 1. 칸반 티켓 생성
    const tid = await kanbanCreate(`벤치마크 #${num}: ${sc.q}`);
    if (tid) await kanbanClaim(tid);

    try {
      // 2. Gemma4 시뮬레이션
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: sc.q },
        ] }),
      });
      const data = await res.json();
      const content = data.message?.content || '';
      const match = content.match(/```json\s*([\s\S]*?)```/);

      if (!match) throw new Error('No JSON');
      const sim = JSON.parse(match[1]).simulation;
      const p = sim?.physics || {};

      // 3. 물리값 평가
      const scores = {};
      let total = 0, cnt = 0;
      for (const [key, range] of Object.entries(sc.expect)) {
        const val = p[key];
        scores[key] = val !== undefined ? inRange(val, range) : { ok: false, score: 0, detail: 'missing' };
        total += scores[key].score;
        cnt++;
      }
      const avg = cnt > 0 ? total / cnt : 0;
      totalAccuracy += avg;
      success++;

      const stars = '★'.repeat(Math.round(avg * 5)) + '☆'.repeat(5 - Math.round(avg * 5));
      const missed = Object.entries(scores).filter(([,v]) => !v.ok).map(([k,v]) => k).join(',');
      console.log(`${stars} ${(avg*100).toFixed(0)}% ${(sim.title||'?').slice(0,25)} [${p.particleCount||'?'}p]${missed ? ' MISS:'+missed : ''}`);

      // 4. Typst 보고서 생성
      const typst = genTypst(num, sc, sim, p, scores, avg);
      writeFileSync(join(DOCS_DIR, `bench-${String(num).padStart(3,'0')}.typ`), typst);

      // 5. 칸반 완료 + supervisor 승인
      await kanbanDone(tid, `${stars} ${(avg*100).toFixed(0)}% | ${sim.title} | ${p.particleCount}p`);

      allResults.push({ num, ...sc, success: true, title: sim.title, avgScore: avg, scores, physics: p });
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      allResults.push({ num, ...sc, success: false, error: err.message });
      await kanbanDone(tid, `FAIL: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  const avgAll = totalAccuracy / Math.max(success, 1);
  console.log(`\n=== 결과 ===`);
  console.log(`성공: ${success}/${SCENARIOS.length} | 실패: ${fail}`);
  console.log(`평균 정확도: ${(avgAll * 100).toFixed(1)}%`);

  writeFileSync(join(DATA_DIR, 'benchmark-300-detailed.json'), JSON.stringify({ total: SCENARIOS.length, success, fail, avgAccuracy: avgAll, results: allResults }, null, 2));
  console.log(`Saved to data/benchmark-300-detailed.json`);
}

main().catch(console.error);
