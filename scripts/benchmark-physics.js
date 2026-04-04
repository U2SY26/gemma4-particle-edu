#!/usr/bin/env node
/**
 * benchmark-physics.js — 정밀 물리 벤치마크
 * 매 시뮬마다 SI 물리값 정확도 + 밀집도 + 구조 적합성 평가
 * 결과를 JSON + 마크다운 리포트로 저장
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';

// 각 시나리오에 "정답" 물리값 범위를 정의
const SCENARIOS = [
  { query: "자유낙하 10m 높이 1kg 물체", expected: { gravity: [-10,-9], damping: [0.9,1], temperature: [280,310], particleCount: [10000,50000] }, domain: "physics", label: "자유낙하" },
  { query: "달 표면에서 점프하는 우주인", expected: { gravity: [-2,-1], damping: [0.9,1], temperature: [100,400] }, domain: "astronomy", label: "달 중력" },
  { query: "목성 대기 가스 운동", expected: { gravity: [-30,-20], damping: [0.8,0.99], temperature: [100,200] }, domain: "astronomy", label: "목성 중력" },
  { query: "ISS 무중력 물방울 실험", expected: { gravity: [-0.01,0.01], viscosity: [0.1,5], temperature: [290,300] }, domain: "physics", label: "ISS 무중력" },
  { query: "태양 표면 5778K 코로나 플라즈마", expected: { gravity: [-1,1], temperature: [5000,8000] }, domain: "astronomy", label: "태양 플라즈마" },
  { query: "절대영도 근처 보스-아인슈타인 응축", expected: { temperature: [0,5], gravity: [0,0.01] }, domain: "quantum", label: "극저온 BEC" },
  { query: "마리아나 해구 심해 11000m 수압", expected: { gravity: [-10,-9], viscosity: [1,10], temperature: [270,285] }, domain: "earth_science", label: "심해 수압" },
  { query: "다이아몬드 결정 격자 sp3 결합", expected: { springStiffness: [40,200], density: [3,4], gravity: [0,0.01] }, domain: "materials", label: "다이아몬드" },
  { query: "고무공 탄성 충돌", expected: { bounciness: [0.7,1], springStiffness: [1,10], friction: [0.3,0.8] }, domain: "physics", label: "고무 탄성" },
  { query: "점성 유체 꿀 흐름", expected: { viscosity: [3,20], gravity: [-10,-9], damping: [0.8,0.95] }, domain: "physics", label: "꿀 점성" },
  { query: "진공 상태 전자기파 전파", expected: { gravity: [0,0.01], friction: [0,0.01], viscosity: [0,0.01] }, domain: "electromagnetism", label: "진공 EM" },
  { query: "용암 흐름 1200도", expected: { temperature: [1100,1500], viscosity: [2,15], gravity: [-10,-9] }, domain: "earth_science", label: "용암" },
  { query: "눈보라 -30도 강풍", expected: { temperature: [230,250], windX: [5,20], turbulence: [3,10] }, domain: "weather", label: "눈보라" },
  { query: "수영장 물 파동", expected: { gravity: [-10,-9], viscosity: [0.5,3], damping: [0.9,0.99] }, domain: "physics", label: "수영장" },
  { query: "화성 표면 중력 3.72 m/s² 먼지폭풍", expected: { gravity: [-4,-3], temperature: [200,230], windX: [5,30] }, domain: "astronomy", label: "화성" },
  { query: "수은 액체 금속 흐름", expected: { density: [10,15], viscosity: [0.1,2], temperature: [290,310] }, domain: "chemistry", label: "수은" },
  { query: "헬륨 풍선 상승", expected: { gravity: [0.5,5], density: [0.1,0.5], damping: [0.95,0.999] }, domain: "physics", label: "헬륨 부력" },
  { query: "지진 규모 7.0 진동", expected: { seismic: [5,10], seismicFreq: [1,5], gravity: [-10,-9] }, domain: "earth_science", label: "지진" },
  { query: "초전도 마이스너 효과 자기 부양", expected: { gravity: [0,0.01], temperature: [0,100], springStiffness: [30,100] }, domain: "quantum", label: "초전도" },
  { query: "물 끓는점 100도 기포 생성", expected: { temperature: [370,380], gravity: [-10,-9], viscosity: [0.1,2] }, domain: "chemistry", label: "끓는물" },
];

const SYSTEM_PROMPT = `You are a physics simulation AI. Use ACCURATE SI physical values.
ALWAYS include \`\`\`json block:
\`\`\`json
{"simulation":{"prompt":"custom","title":"...","domain":"...","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"timeScale":1.0,"friction":0.8,"bounciness":0.3,"windX":0,"windY":0,"windZ":0,"turbulence":0,"viscosity":0,"temperature":293,"seismic":0,"seismicFreq":0,"density":2.4}}}
\`\`\`
CRITICAL PHYSICS RULES:
- Space/molecule: gravity=0
- Moon: gravity=-1.62, Mars: gravity=-3.72, Jupiter: gravity=-24.79
- Temperature in Kelvin (water boils at 373K, sun surface 5778K, absolute zero ~0K)
- High viscosity for fluids (honey~10, water~1, air~0)
- Seismic >5 for earthquakes
- density: diamond=3.5, iron=7.8, water=1.0, air=0.001
Keep response short. JSON is mandatory.`;

function inRange(val, range) {
  if (!range || range.length !== 2) return { ok: true, score: 1 };
  const [min, max] = range;
  if (val >= min && val <= max) return { ok: true, score: 1, detail: `${val} ∈ [${min},${max}]` };
  // Partial credit if close
  const dist = val < min ? min - val : val - max;
  const span = max - min || 1;
  const partial = Math.max(0, 1 - dist / (span * 2));
  return { ok: false, score: partial, detail: `${val} ∉ [${min},${max}]` };
}

async function runBenchmark() {
  console.log(`=== 정밀 물리 벤치마크 (${SCENARIOS.length}개) ===\n`);

  const results = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const sc = SCENARIOS[i];
    process.stdout.write(`[${String(i+1).padStart(2)}/${SCENARIOS.length}] ${sc.label.padEnd(12)} `);

    try {
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: sc.query },
        ] }),
      });
      const data = await res.json();
      const content = data.message?.content || '';
      const match = content.match(/```json\s*([\s\S]*?)```/);

      if (!match) {
        console.log('✗ No JSON');
        results.push({ ...sc, success: false, error: 'no json', scores: {} });
        continue;
      }

      const sim = JSON.parse(match[1]).simulation;
      const p = sim?.physics || {};

      // Score each expected parameter
      const scores = {};
      let totalScore = 0, count = 0;
      for (const [key, range] of Object.entries(sc.expected)) {
        const actual = p[key];
        if (actual === undefined) {
          scores[key] = { ok: false, score: 0, detail: 'missing' };
        } else {
          scores[key] = inRange(actual, range);
        }
        totalScore += scores[key].score;
        count++;
      }

      const avgScore = count > 0 ? totalScore / count : 0;
      const pc = p.particleCount || 0;
      const denseLabel = pc >= 20000 ? '밀집' : pc >= 10000 ? '중간' : '저밀도';
      const stars = '★'.repeat(Math.round(avgScore * 5)) + '☆'.repeat(5 - Math.round(avgScore * 5));

      const failedParams = Object.entries(scores).filter(([,v]) => !v.ok).map(([k,v]) => `${k}:${v.detail}`);
      const failStr = failedParams.length > 0 ? ` MISS:[${failedParams.join(', ')}]` : '';

      console.log(`${stars} ${(avgScore*100).toFixed(0)}% ${sim.title?.slice(0,25) || '?'} [${pc}p,${denseLabel}]${failStr}`);

      results.push({
        ...sc, success: true, title: sim.title, particleCount: pc,
        density: denseLabel, avgScore, scores,
        physics: p,
      });
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
      results.push({ ...sc, success: false, error: err.message, scores: {} });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  const successful = results.filter(r => r.success);
  const avgAll = successful.reduce((s, r) => s + r.avgScore, 0) / Math.max(successful.length, 1);

  console.log(`\n=== 결과 ===`);
  console.log(`성공: ${successful.length}/${SCENARIOS.length}`);
  console.log(`평균 정확도: ${(avgAll * 100).toFixed(1)}%`);
  console.log(`\n도메인별:`);

  const byDomain = {};
  for (const r of successful) {
    if (!byDomain[r.domain]) byDomain[r.domain] = { scores: [], count: 0 };
    byDomain[r.domain].scores.push(r.avgScore);
    byDomain[r.domain].count++;
  }
  for (const [d, v] of Object.entries(byDomain).sort((a, b) => b[1].count - a[1].count)) {
    const avg = v.scores.reduce((a, b) => a + b, 0) / v.scores.length;
    console.log(`  ${d.padEnd(18)} ${(avg * 100).toFixed(0)}% (${v.count}건)`);
  }

  // Save
  const { writeFileSync } = await import('fs');
  writeFileSync(
    new URL('../data/benchmark-physics-results.json', import.meta.url).pathname,
    JSON.stringify({ total: SCENARIOS.length, successful: successful.length, avgAccuracy: avgAll, results }, null, 2)
  );
  console.log(`\nSaved to data/benchmark-physics-results.json`);
}

runBenchmark().catch(console.error);
