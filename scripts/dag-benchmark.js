#!/usr/bin/env node
/**
 * dag-benchmark.js — 마이크로스텝 DAG + 실제 물리 검증 벤치마크
 *
 * Gemma 4에게 한 번에 하나의 간단한 질문만 던짐.
 * 각 스텝 결과를 다음 스텝 입력으로 체이닝.
 * 최종 JSON으로 실제 Verlet 물리 시뮬 100프레임 실행 후 검증.
 *
 * Usage: OLLAMA_MODEL=gemma4:26b node scripts/dag-benchmark.js
 */

const OLLAMA = process.env.OLLAMA_BASE || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma4:26b';
const KANBAN = 'http://localhost:5555';
const TEAM = process.env.KANBAN_TEAM || '';

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, '..', 'docs', 'benchmarks');
if (!existsSync(DOCS)) mkdirSync(DOCS, { recursive: true });

// ============================================================
// Ollama 호출 (단일 질문 → 단일 답변)
// ============================================================
async function ask(question, context = '') {
  const messages = [];
  if (context) messages.push({ role: 'system', content: context });
  messages.push({ role: 'user', content: question });

  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, stream: false, messages }),
  });
  const data = await res.json();
  return data.message?.content || '';
}

// ============================================================
// 마이크로스텝 DAG — 7단계
// ============================================================
async function dagWorkflow(scenario) {
  const steps = {};

  // Step 1: 이게 뭐야? (1줄 답변)
  steps.identify = await ask(
    `"${scenario}" — 이것은 무엇인가요? 한 줄로 답변. 예: "로마 시대 석조 원형 경기장"`,
  );

  // Step 2: 무슨 재료? (단어만)
  steps.material = await ask(
    `"${steps.identify}" 의 주요 재료는? 단어 하나만. 예: limestone, steel, water, plasma`,
  );

  // Step 3: 밀도는? (숫자만)
  steps.density = await ask(
    `${steps.material}의 밀도는 몇 kg/m³인가요? 숫자만 답변. 예: 2500`,
  );

  // Step 4: 어떤 환경? → 중력값 (숫자만)
  steps.gravity = await ask(
    `"${scenario}"가 일어나는 환경의 중력가속도는? 숫자만 (m/s²). ` +
    `지구=-9.81, 달=-1.62, 화성=-3.72, 목성=-24.79, 우주=0, 분자수준=0`,
  );

  // Step 5: 온도는? (숫자만)
  steps.temperature = await ask(
    `"${scenario}"의 환경 온도는 몇 K(켈빈)인가요? 숫자만. ` +
    `상온=293, 끓는물=373, 용암=1500, 태양=5778, 절대영도=0`,
  );

  // Step 6: 특수 조건? (JSON)
  steps.special = await ask(
    `"${scenario}"에 필요한 특수 물리 조건이 있나요? JSON으로 답변.\n` +
    `예: {"windX": 10, "seismic": 7, "viscosity": 5}\n` +
    `없으면: {}`,
  );

  // Step 7: 최종 JSON 조립 (이전 답변 모두 포함)
  const assemblyPrompt =
    `다음 정보로 시뮬레이션 JSON을 만들어줘:\n` +
    `- 대상: ${steps.identify}\n` +
    `- 재료: ${steps.material}\n` +
    `- 밀도: ${steps.density} kg/m³\n` +
    `- 중력: ${steps.gravity} m/s²\n` +
    `- 온도: ${steps.temperature} K\n` +
    `- 특수조건: ${steps.special}\n\n` +
    `반드시 이 형식으로:\n` +
    '```json\n{"simulation":{"prompt":"keyword","title":"제목","domain":"도메인",' +
    '"physics":{"gravity":NUMBER,"damping":0.97,"springStiffness":20,' +
    '"particleCount":25000,"temperature":NUMBER,"density":NUMBER,' +
    '"viscosity":0,"friction":0.8,"bounciness":0.3,"windX":0,"turbulence":0,"seismic":0}}}\n```';

  steps.json = await ask(assemblyPrompt);

  return steps;
}

// ============================================================
// JSON 파싱
// ============================================================
function parseSimJSON(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]).simulation;
  } catch { return null; }
}

function parseNumber(text) {
  const m = text.match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

// ============================================================
// 실제 물리 시뮬 검증 (Verlet 100프레임)
// ============================================================
function verifyPhysics(physics) {
  const g = physics.gravity ?? -9.81;
  const damp = physics.damping ?? 0.97;
  const dt = 1 / 60;
  const checks = [];

  // 파티클 1개 자유낙하 시뮬 100프레임
  let y = 10, prevY = 10, vy = 0;
  let maxY = y, minY = y;
  let exploded = false;

  for (let frame = 0; frame < 100; frame++) {
    const ay = g;
    const newY = y + (y - prevY) * damp + ay * dt * dt;
    vy = (newY - prevY) / (2 * dt);
    prevY = y;
    y = newY;

    maxY = Math.max(maxY, y);
    minY = Math.min(minY, y);

    if (Math.abs(y) > 10000 || Math.abs(vy) > 10000) {
      exploded = true;
      break;
    }
  }

  // 검증 1: 폭발 안 함
  checks.push({
    name: 'stability',
    pass: !exploded,
    detail: exploded ? `폭발 (y=${y.toFixed(1)})` : `안정 (y=${y.toFixed(2)})`,
  });

  // 검증 2: 중력 방향 맞음
  if (g < -0.1) {
    checks.push({
      name: 'gravity_dir',
      pass: y < 10,
      detail: y < 10 ? `하강 OK (y=${y.toFixed(2)})` : `하강 안 함`,
    });
  } else if (g > 0.1) {
    checks.push({
      name: 'gravity_dir',
      pass: y > 10,
      detail: y > 10 ? `상승 OK` : `상승 안 함`,
    });
  } else {
    checks.push({
      name: 'gravity_dir',
      pass: Math.abs(y - 10) < 1,
      detail: `무중력 OK (drift=${Math.abs(y-10).toFixed(3)})`,
    });
  }

  // 검증 3: damping으로 에너지 감소
  checks.push({
    name: 'damping',
    pass: damp > 0 && damp < 1,
    detail: `damping=${damp} ${damp>0&&damp<1 ? 'OK' : 'INVALID'}`,
  });

  // 검증 4: 온도 합리성
  const temp = physics.temperature ?? 293;
  checks.push({
    name: 'temperature',
    pass: temp >= 0 && temp < 1e9,
    detail: `${temp}K ${temp>=0&&temp<1e9 ? 'OK' : 'INVALID'}`,
  });

  // 검증 5: 파티클 수 합리성
  const pc = physics.particleCount ?? 25000;
  checks.push({
    name: 'particle_count',
    pass: pc >= 100 && pc <= 100000,
    detail: `${pc} ${pc>=100&&pc<=100000 ? 'OK' : 'OUT OF RANGE'}`,
  });

  const passCount = checks.filter(c => c.pass).length;
  const score = Math.round(passCount / checks.length * 100);

  return { score, checks, finalY: y, exploded };
}

// ============================================================
// Typst 보고서 생성
// ============================================================
function genTypst(num, scenario, steps, sim, physics, verify) {
  const stars = '★'.repeat(Math.round(verify.score / 20)) + '☆'.repeat(5 - Math.round(verify.score / 20));
  const checksText = verify.checks.map(c =>
    `  [${c.name}], [${c.detail}], [${c.pass ? 'PASS' : 'FAIL'}],`
  ).join('\n');

  return `#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #${String(num).padStart(3,'0')}]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[${sim?.title || scenario}]
  #v(2pt)
  #text(size: 10pt)[Model: ${MODEL}]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [${steps.identify?.slice(0,60) || '?'}],
  [Step 2: 재료], [${steps.material?.slice(0,30) || '?'}],
  [Step 3: 밀도], [${steps.density?.slice(0,20) || '?'} kg/m³],
  [Step 4: 중력], [${steps.gravity?.slice(0,20) || '?'} m/s²],
  [Step 5: 온도], [${steps.temperature?.slice(0,20) || '?'} K],
  [Step 6: 특수], [${steps.special?.slice(0,40) || '{}'}],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
${checksText}
)

=== 종합
정확도: ${stars} ${verify.score}%
파티클: ${physics?.particleCount || '?'}
중력: ${physics?.gravity || '?'} m/s²
온도: ${physics?.temperature || '?'} K
시뮬 안정성: ${verify.exploded ? '✗ 폭발' : '✓ 안정'}
`;
}

// ============================================================
// 칸반
// ============================================================
async function kanbanTicket(title) {
  if (!TEAM) return null;
  try {
    const r = await fetch(`${KANBAN}/api/teams/${TEAM}/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'medium' }),
    });
    const d = await r.json();
    return d.ticket?.ticket_id || null;
  } catch { return null; }
}

async function kanbanDone(tid, artifact) {
  if (!tid) return;
  try {
    await fetch(`${KANBAN}/api/tickets/${tid}/claim`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: 'gemma4' }),
    });
    await fetch(`${KANBAN}/api/tickets/${tid}/artifacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_member_id: 'gemma4', title: artifact.slice(0,50), content: artifact, artifact_type: 'result' }),
    });
    await fetch(`${KANBAN}/api/tickets/${tid}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Review' }),
    });
    await fetch(`${KANBAN}/api/tickets/${tid}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Done' }),
    });
  } catch {}
}

// ============================================================
// 메인
// ============================================================
const SCENARIOS = [
  "이집트 대피라미드", "에펠탑 철골 트러스", "콜로세움 아치 구조", "금문교 현수교",
  "부르즈 칼리파 828m", "보잉 747 비행", "ISS 무중력 물방울", "달 표면 우주인 점프",
  "목성 대기 가스", "태양 코로나 플라즈마", "DNA 이중나선", "단백질 알파헬릭스",
  "NaCl 결정 격자", "다이아몬드 sp3", "블랙홀 강착원반", "토네이도 회전",
  "화산 용암 흐름", "지진 규모 7", "쓰나미 전파", "눈보라 -30도",
  "핵융합 플라즈마", "초전도 마이스너", "자유낙하 10m", "꿀 점성 흐름",
  "뉴턴 요람", "로렌츠 어트랙터", "태양계 8행성", "은하 충돌",
  "세포 분열", "적혈구 모세혈관",
];

async function main() {
  console.log(`=== DAG 마이크로스텝 벤치마크 ===`);
  console.log(`Model: ${MODEL} | Scenarios: ${SCENARIOS.length}\n`);

  // Verify model available
  try {
    const r = await fetch(`${OLLAMA}/api/tags`);
    const d = await r.json();
    const has = d.models?.some(m => m.name.startsWith(MODEL.split(':')[0]));
    if (!has) { console.error(`Model ${MODEL} not found`); process.exit(1); }
  } catch { console.error('Ollama not running'); process.exit(1); }

  let pass = 0, fail = 0;

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const num = i + 1;
    console.log(`\n[${String(num).padStart(3)}/${SCENARIOS.length}] ${scenario}`);

    // 칸반 티켓
    const tid = await kanbanTicket(`DAG #${num}: ${scenario}`);

    try {
      // 7단계 DAG
      console.log('  Step 1: 식별...');
      const steps = await dagWorkflow(scenario);
      console.log(`  → ${steps.identify?.slice(0,50)}`);
      console.log(`  → 재료=${steps.material?.slice(0,15)} 밀도=${steps.density?.slice(0,10)} 중력=${steps.gravity?.slice(0,10)} 온도=${steps.temperature?.slice(0,10)}`);

      // JSON 파싱
      const sim = parseSimJSON(steps.json);
      if (!sim) {
        console.log('  ✗ JSON 파싱 실패');
        fail++;
        await kanbanDone(tid, 'FAIL: No JSON');
        continue;
      }

      const physics = sim.physics || {};
      console.log(`  → title="${sim.title}" gravity=${physics.gravity} temp=${physics.temperature} particles=${physics.particleCount}`);

      // 실제 물리 검증 (Verlet 100프레임)
      const verify = verifyPhysics(physics);
      const stars = '★'.repeat(Math.round(verify.score / 20)) + '☆'.repeat(5 - Math.round(verify.score / 20));
      console.log(`  ${stars} ${verify.score}% | ${verify.exploded ? '✗ 폭발' : '✓ 안정'}`);
      for (const c of verify.checks) {
        if (!c.pass) console.log(`    ✗ ${c.name}: ${c.detail}`);
      }

      if (verify.score >= 80) pass++; else fail++;

      // Typst 보고서
      const typst = genTypst(num, scenario, steps, sim, physics, verify);
      writeFileSync(join(DOCS, `bench-${String(num).padStart(3,'0')}.typ`), typst);

      // 칸반 완료
      await kanbanDone(tid, `${stars} ${verify.score}% | ${sim.title} | ${verify.exploded ? 'EXPLODED' : 'STABLE'}`);

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      fail++;
      await kanbanDone(tid, `FAIL: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== 결과 ===`);
  console.log(`PASS (≥80%): ${pass}/${SCENARIOS.length}`);
  console.log(`FAIL: ${fail}/${SCENARIOS.length}`);
}

main().catch(console.error);
