#!/usr/bin/env node
/**
 * run-100-simulations.js
 *
 * Gemma 4 + Ollama를 이용해 100가지 다른 물리법칙/과학 시나리오로
 * 시뮬레이션을 생성하고 히스토리 DB에 저장합니다.
 *
 * Usage: node scripts/run-100-simulations.js
 * Requires: Ollama running with a supported model
 *
 * Environment variables:
 *   OLLAMA_BASE   - Ollama server URL (default: http://localhost:11434)
 *   SERVER_BASE   - App server URL (default: http://localhost:3000)
 *   OLLAMA_MODEL  - Model name (default: gemma4). Examples: gemma3:27b, gemma4
 *   MAX_RETRIES   - Retries per scenario on JSON parse failure (default: 3)
 *   REQUEST_TIMEOUT - Per-request timeout in ms (default: 60000)
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const SERVER_BASE = process.env.SERVER_BASE || 'http://localhost:3000';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '60000', 10);

const SCENARIOS = [
  // === 물리학 (Physics) ===
  "뉴턴의 제1법칙: 관성의 법칙을 보여주는 시뮬레이션",
  "뉴턴의 제2법칙: F=ma, 질량에 따른 가속도 차이",
  "뉴턴의 제3법칙: 작용-반작용 두 물체의 충돌",
  "자유낙하: 진공에서 깃털과 볼링공의 동시 낙하",
  "포물선 운동: 45도 각도의 포탄 궤적",
  "단진자의 등시성: 진폭이 다른 두 진자",
  "스프링 진동: 후크의 법칙 F=-kx",
  "파동 간섭: 두 점원의 이중슬릿 실험",
  "도플러 효과: 움직이는 음원의 파동 압축",
  "원심력과 구심력: 회전 운동하는 물체",
  "각운동량 보존: 피겨 스케이터의 회전",
  "탄성 충돌: 뉴턴의 요람 (Newton's Cradle)",
  "비탄성 충돌: 두 점토 덩어리의 완전 비탄성 충돌",
  "유체 역학: 베르누이 원리 - 좁은 관에서의 유속 변화",
  "표면 장력: 물방울이 구형을 유지하는 이유",

  // === 천문학 (Astronomy) ===
  "태양계: 8개 행성의 공전 궤도",
  "쌍성계: 두 별의 상호 공전",
  "블랙홀 강착원반: 물질이 빨려들어가는 나선 구조",
  "초신성 폭발: 별의 외피층이 팽창하는 순간",
  "성운에서 별의 탄생: 가스 구름의 중력 수축",
  "소행성대: 화성과 목성 사이의 소행성 분포",
  "혜성의 꼬리: 태양풍에 의한 꼬리 형성",
  "은하 충돌: 두 나선은하의 조우",
  "달의 조석력: 지구-달 시스템의 조석 변형",
  "라그랑주 점: L1~L5 안정/불안정 평형점",

  // === 화학 (Chemistry) ===
  "물 분자 (H2O): 104.5도 결합각",
  "NaCl 결정 격자: 이온 결합의 3D 구조",
  "다이아몬드 결정: sp3 혼성 정사면체 구조",
  "그래핀: 탄소 육각형 격자 시트",
  "DNA 이중나선: 염기쌍 수소결합",
  "벤젠 분자: 공명 구조의 탄소 6각형",
  "단백질 알파 헬릭스: 아미노산 나선 구조",
  "촉매 반응: 효소 활성 부위에서의 기질 결합",
  "브라운 운동: 용액 속 입자의 랜덤 워크",
  "삼투압: 반투막을 통한 용매 이동",

  // === 생물학 (Biology) ===
  "세포 분열 (유사분열): 염색체가 양극으로 이동",
  "뉴런 시냅스: 신경전달물질 확산",
  "적혈구 흐름: 모세혈관 속 혈액 순환",
  "근육 수축: 액틴-미오신 활주설",
  "바이러스 구조: 정이십면체 캡시드",
  "항체-항원 결합: Y자형 항체의 특이적 결합",
  "광합성: 틸라코이드 막의 전자전달계",
  "멘델 유전: 완두콩 교배 세대별 형질 분포",
  "생태계 먹이사슬: 포식자-피식자 개체군 동태",
  "효소 기질 복합체: 유도적합 모델",

  // === 지구과학 (Earth Science) ===
  "판 구조론: 수렴/발산 경계에서의 지각 운동",
  "화산 폭발: 마그마 분출과 화산재 확산",
  "지진파: P파와 S파의 전파 패턴",
  "토네이도: 상승 기류의 회전 구조",
  "해류: 열염순환과 대서양 컨베이어 벨트",
  "빙하 이동: 중력에 의한 빙하 흐름",
  "침식과 퇴적: 강물에 의한 삼각주 형성",
  "대기 순환: 해들리 셀, 페렐 셀, 극지방 셀",
  "오로라: 태양풍 입자와 자기장 상호작용",
  "쓰나미: 해저 지진에 의한 파동 전파",

  // === 공학 (Engineering) ===
  "트러스 다리: 하중에 따른 부재별 응력 분포",
  "내진 설계: 지진 시 면진 장치의 작동",
  "바람에 흔들리는 초고층 빌딩: 동적 응답",
  "댐의 수압: 수심에 따른 압력 분포",
  "비행기 날개: 양력 발생 원리 (에어포일)",
  "자동차 충돌 테스트: 크럼플 존의 에너지 흡수",
  "열교환기: 대류와 전도에 의한 열전달",
  "풍력 터빈: 블레이드의 회전과 풍속 관계",
  "우주 엘리베이터: 원심력과 인장 응력",
  "3D 프린팅 구조: 레이어별 적층 패턴",

  // === 수학/기하학 (Mathematics) ===
  "로렌츠 어트랙터: 카오스 이론의 나비 효과",
  "만델브로 프랙탈: 자기유사 구조의 파티클 표현",
  "피보나치 나선: 자연의 황금비 패턴",
  "뫼비우스 띠: 비방향성 단면 곡면",
  "클라인 병: 4차원 곡면의 3D 투영",
  "정다면체: 5가지 플라톤 입체 동시 표시",
  "프랙탈 나무: L-System 기반 분기 구조",
  "보로노이 다이어그램: 평면 분할의 파티클 표현",
  "리사주 곡선: 두 주파수의 합성 진동",
  "사인-코사인 파동 중첩: 푸리에 급수 시각화",

  // === 재료과학 (Materials Science) ===
  "BCC/FCC/HCP 결정 구조 비교",
  "전위(dislocation): 결정의 슬립 메커니즘",
  "상전이: 고체→액체→기체 온도 변화",
  "합금 냉각: 공정 반응에서의 미세구조 형성",
  "금속 피로: 반복 하중에 의한 균열 전파",

  // === 양자역학/입자물리 (Quantum/Particle) ===
  "수소 원자 오비탈: 1s, 2s, 2p 전자 구름",
  "양자 터널링: 포텐셜 장벽을 통과하는 입자",
  "쿼크 모델: 양성자 내부의 업-업-다운 쿼크",
  "핵분열: 우라늄 원자핵의 분열 과정",
  "핵융합: 수소 핵의 플라즈마 상태 융합",

  // === 전자기학 (Electromagnetism) ===
  "전기장 시각화: 양전하-음전하 쌍극자",
  "자기장 시각화: 막대자석 주위의 자기력선",
  "전자기 유도: 코일 내 자속 변화와 기전력",
  "LC 회로 진동: 전기 에너지와 자기 에너지 교환",
  "맥스웰 방정식: 전자기파의 전파",

  // === 열역학 (Thermodynamics) ===
  "이상 기체: PV=nRT, 온도 변화에 따른 분자 운동",
  "엔트로피 증가: 잉크 방울이 물에 퍼지는 확산",
  "카르노 엔진: 열역학적 사이클의 4단계",
  "블랙바디 복사: 온도별 스펙트럼 변화",
  "열전도: 금속 막대의 온도 구배 전파",
];

// Map each scenario index to a domain name for per-domain tracking
const DOMAIN_MAP = {};
const DOMAIN_RANGES = [
  [0, 14, 'physics'],
  [15, 24, 'astronomy'],
  [25, 34, 'chemistry'],
  [35, 44, 'biology'],
  [45, 54, 'earth_science'],
  [55, 64, 'engineering'],
  [65, 74, 'mathematics'],
  [75, 79, 'materials'],
  [80, 84, 'quantum'],
  [85, 89, 'electromagnetism'],
  [90, 94, 'thermodynamics'],
];
for (const [start, end, domain] of DOMAIN_RANGES) {
  for (let i = start; i <= end; i++) DOMAIN_MAP[i] = domain;
}

const SYSTEM_PROMPT = `You are a universal particle simulation AI for the Gemma 4 Particle Edu platform.
Generate simulation parameters for the given science scenario.

You MUST respond with a short explanation (2-3 sentences) of the simulation followed by a \`\`\`json block.
The JSON block is MANDATORY — never omit it.

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "<short descriptive title>",
    "description": "<one sentence describing what this simulates>",
    "domain": "<physics|chemistry|biology|astronomy|earth_science|engineering|mathematics|materials|quantum|electromagnetism|thermodynamics>",
    "physics": {
      "gravity": -9.81,
      "damping": 0.97,
      "springStiffness": 20,
      "particleCount": 25000,
      "timeScale": 1.0,
      "friction": 0.8,
      "bounciness": 0.3,
      "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0,
      "viscosity": 0,
      "temperature": 293
    },
    "particles": {
      "groups": [
        {
          "name": "group_name",
          "count": 5000,
          "shape": "sphere",
          "params": {},
          "color": "cyan",
          "role": 0,
          "connect": "none"
        }
      ]
    }
  }
}
\`\`\`

Available shapes: sphere, helix, grid, ring, disk, line, wave, spiral, shell, cylinder, cone, torus, random_box, point_cloud, random_sphere
Available connect: chain, grid, nearest:N, all, surface, none
Available colors: cyan, magenta, lime, orange, purple, blue, pink, yellow, teal, indigo

Use the particles.groups field to create complex multi-part simulations with multiple groups.
Adjust physics parameters to match the scientific scenario (e.g., gravity=0 for space, high viscosity for fluids).
Keep total particle count under 30000 for performance.

IMPORTANT: The \`\`\`json block must always be present and must contain a valid "simulation" object with "prompt" and "physics" fields.`;

// ==================== HELPERS ====================

/**
 * Fetch with timeout using AbortController.
 */
function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Validate that a parsed simulation object has the required fields.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateSimulation(sim) {
  if (!sim) return { valid: false, reason: 'simulation object is null/undefined' };

  // simulation.prompt must exist and be non-empty
  if (!sim.prompt || typeof sim.prompt !== 'string' || sim.prompt.trim() === '') {
    return { valid: false, reason: 'simulation.prompt is missing or empty' };
  }

  // simulation.physics must exist with at least gravity and damping
  if (!sim.physics || typeof sim.physics !== 'object') {
    return { valid: false, reason: 'simulation.physics is missing' };
  }
  if (sim.physics.gravity === undefined || sim.physics.gravity === null) {
    return { valid: false, reason: 'simulation.physics.gravity is missing' };
  }
  if (sim.physics.damping === undefined || sim.physics.damping === null) {
    return { valid: false, reason: 'simulation.physics.damping is missing' };
  }

  // If particles.groups exist, validate each group
  if (sim.particles && sim.particles.groups) {
    if (!Array.isArray(sim.particles.groups) || sim.particles.groups.length === 0) {
      return { valid: false, reason: 'simulation.particles.groups is not a non-empty array' };
    }
    for (let i = 0; i < sim.particles.groups.length; i++) {
      const g = sim.particles.groups[i];
      if (!g.count || typeof g.count !== 'number' || g.count <= 0) {
        return { valid: false, reason: `group[${i}].count is missing or invalid` };
      }
      if (!g.shape || typeof g.shape !== 'string' || g.shape.trim() === '') {
        return { valid: false, reason: `group[${i}].shape is missing or empty` };
      }
      if (g.connect === undefined || g.connect === null) {
        return { valid: false, reason: `group[${i}].connect is missing` };
      }
    }
  }

  return { valid: true };
}

// ==================== OLLAMA ====================

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    const models = data.models?.map(m => m.name) || [];
    const hasModel = models.some(n => n.startsWith(OLLAMA_MODEL.split(':')[0]));
    if (!hasModel) {
      console.error(`Model "${OLLAMA_MODEL}" not found. Available models: ${models.join(', ')}`);
      console.error(`Run: ollama pull ${OLLAMA_MODEL}`);
      return false;
    }
    console.log(`✓ Ollama running, model "${OLLAMA_MODEL}" available`);
    return true;
  } catch {
    console.error('Ollama not running. Start with: ollama serve');
    return false;
  }
}

/**
 * Attempt a single Ollama call and return parsed result or throw.
 */
async function callOllama(messages) {
  const res = await fetchWithTimeout(
    `${OLLAMA_BASE}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
    },
    REQUEST_TIMEOUT,
  );

  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

  const data = await res.json();
  const content = data.message?.content || '';

  // Extract JSON
  const match = content.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error('No JSON block in response');

  const parsed = JSON.parse(match[1]);
  const sim = parsed.simulation;

  // Validate completeness
  const validation = validateSimulation(sim);
  if (!validation.valid) throw new Error(`Validation failed: ${validation.reason}`);

  return { simulation: sim, response: content };
}

/**
 * Generate simulation with retry logic.
 * On retry, appends an explicit JSON reminder to the user message.
 */
async function generateSimulation(scenario, index) {
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userContent = attempt === 0
      ? scenario
      : `${scenario}\n\nIMPORTANT: You MUST include a \`\`\`json block with simulation parameters. Include "simulation" with "prompt", "physics" (with "gravity" and "damping"), and "particles.groups" (each with "count", "shape", and "connect").`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];

    try {
      const result = await callOllama(messages);
      return {
        success: true,
        scenario,
        simulation: result.simulation,
        response: result.response,
        attempts: attempt + 1,
      };
    } catch (err) {
      lastError = err.message;
      if (attempt < MAX_RETRIES) {
        process.stdout.write(` [retry ${attempt + 1}/${MAX_RETRIES}]`);
      }
    }
  }

  return { success: false, scenario, error: lastError, attempts: MAX_RETRIES + 1 };
}

// ==================== SAVE ====================

async function saveToHistory(result) {
  try {
    const sim = result.simulation;
    await fetch(`${SERVER_BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: result.scenario,
        title: sim?.title || 'Untitled',
        domain: sim?.domain || 'general',
        description: sim?.description || '',
        prompt: sim?.prompt || '',
        physics: sim?.physics || {},
        particleSpec: sim?.particles || null,
        aiResponse: result.response,
        particleCount: sim?.physics?.particleCount || 25000,
      }),
    });
  } catch {
    // Server might not be running; save locally
  }
}

async function saveResultsLocal(results, failed) {
  const { writeFileSync, mkdirSync } = await import('fs');
  const { dirname } = await import('path');

  const resultsPath = new URL('../data/simulation-results-100.json', import.meta.url).pathname;
  mkdirSync(dirname(resultsPath), { recursive: true });
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${resultsPath}`);

  // Save failed scenarios separately for analysis
  if (failed.length > 0) {
    const failedPath = new URL('../data/simulation-failures.json', import.meta.url).pathname;
    writeFileSync(failedPath, JSON.stringify(failed, null, 2));
    console.log(`Failed scenarios saved to ${failedPath}`);
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('=== Gemma 4 Particle Edu — 100 Simulation E2E Run ===');
  console.log(`Model: ${OLLAMA_MODEL} | Timeout: ${REQUEST_TIMEOUT}ms | Max retries: ${MAX_RETRIES}\n`);

  // Check Ollama
  const ok = await checkOllama();
  if (!ok) process.exit(1);

  const results = [];
  const failed = [];
  let successCount = 0;
  let failCount = 0;

  // Per-domain tracking
  const domainStats = {};  // { domain: { total: N, success: N, fail: N } }

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const expectedDomain = DOMAIN_MAP[i] || 'unknown';
    const progress = `[${String(i + 1).padStart(3)}/${SCENARIOS.length}]`;

    process.stdout.write(`${progress} ${scenario.slice(0, 55).padEnd(55)}...`);

    const result = await generateSimulation(scenario, i);
    result.expectedDomain = expectedDomain;
    results.push(result);

    // Init domain stats
    if (!domainStats[expectedDomain]) domainStats[expectedDomain] = { total: 0, success: 0, fail: 0 };
    domainStats[expectedDomain].total++;

    if (result.success) {
      successCount++;
      domainStats[expectedDomain].success++;
      const title = result.simulation.title || result.simulation.prompt || '?';
      const retryInfo = result.attempts > 1 ? ` (${result.attempts} attempts)` : '';
      process.stdout.write(` ✓ ${title}${retryInfo}\n`);

      // Save to history API
      await saveToHistory(result);
    } else {
      failCount++;
      domainStats[expectedDomain].fail++;
      failed.push({ index: i, scenario, error: result.error, domain: expectedDomain });
      process.stdout.write(` ✗ ${result.error}\n`);
    }

    // Small delay to avoid overloading
    await new Promise(r => setTimeout(r, 500));
  }

  // ==================== REPORT ====================

  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== RESULTS ===`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Success: ${successCount}/${SCENARIOS.length}`);
  console.log(`Failed:  ${failCount}/${SCENARIOS.length}`);
  console.log(`Rate:    ${(successCount / SCENARIOS.length * 100).toFixed(1)}%`);

  // Per-domain success rate
  console.log(`\n--- Success Rate by Domain ---`);
  const sortedDomains = Object.entries(domainStats).sort((a, b) => a[1].success / a[1].total - b[1].success / b[1].total);
  for (const [domain, stats] of sortedDomains) {
    const rate = (stats.success / stats.total * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(stats.success / stats.total * 20));
    const empty = '░'.repeat(20 - Math.round(stats.success / stats.total * 20));
    console.log(`  ${domain.padEnd(20)} ${bar}${empty} ${rate}% (${stats.success}/${stats.total})`);
  }

  // List failed scenarios
  if (failed.length > 0) {
    console.log(`\n--- Failed Scenarios ---`);
    for (const f of failed) {
      console.log(`  [${f.index}] (${f.domain}) ${f.scenario}`);
      console.log(`       Error: ${f.error}`);
    }
  }

  // Response domain distribution (from AI output)
  const aiDomains = {};
  for (const r of results) {
    if (r.success) {
      const d = r.simulation.domain || 'unknown';
      aiDomains[d] = (aiDomains[d] || 0) + 1;
    }
  }
  console.log('\n--- AI-reported Domain Breakdown ---');
  for (const [d, c] of Object.entries(aiDomains).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${c}`);
  }

  // Save all results locally
  await saveResultsLocal(results, failed);
}

main().catch(console.error);
