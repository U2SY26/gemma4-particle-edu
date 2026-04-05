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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600000); // 600초 타임아웃
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, stream: false, messages }),
      signal: controller.signal,
    });
    const data = await res.json();
    return data.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// 마이크로스텝 DAG — 7단계 (타임아웃 300초)
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
// 300 scenarios loaded from file or inline
const SCENARIOS_30 = [
  "이집트 대피라미드", "에펠탑 철골 트러스", "콜로세움 아치 구조", "금문교 현수교",
  "부르즈 칼리파 828m", "보잉 747 비행", "ISS 무중력 물방울", "달 표면 우주인 점프",
  "목성 대기 가스", "태양 코로나 플라즈마", "DNA 이중나선", "단백질 알파헬릭스",
  "NaCl 결정 격자", "다이아몬드 sp3", "블랙홀 강착원반", "토네이도 회전",
  "화산 용암 흐름", "지진 규모 7", "쓰나미 전파", "눈보라 -30도",
  "핵융합 플라즈마", "초전도 마이스너", "자유낙하 10m", "꿀 점성 흐름",
  "뉴턴 요람", "로렌츠 어트랙터", "태양계 8행성", "은하 충돌",
  "세포 분열", "적혈구 모세혈관",
];
const SCENARIOS_EXTENDED = [
  // Architecture (30)
  "앙코르와트 사원", "마추픽추 계단도시", "로마 수도교", "사그라다 파밀리아", "베르사유 궁전 분수",
  "두바이 팜 아일랜드", "베네치아 수상 도시", "홍콩 빽빽한 아파트", "파리 개선문", "런던 타워브릿지",
  "모스크바 성 바실리", "아야 소피아 돔", "시카고 빌딩", "상하이 스카이라인", "도쿄 타워",
  "광화문 한옥", "석굴암 돔", "63빌딩", "롤러코스터 루프", "온실 유리 돔",
  "지하철 역사 터널", "공항 터미널 지붕", "원자력 격납건물", "이글루 눈돔", "로마 판테온",
  "런던 아이 관람차", "올림픽 스타디움", "고속도로 클로버잎", "해저 터널", "피사의 사탑",
  // Transport (20)
  "F1 레이싱카", "KTX 터널 진입", "타이타닉 선체", "드론 쿼드콥터", "범선 돛 바람",
  "마하2 초음속 충격파", "카약 물살", "행글라이더 열상승", "스케이트보드 올리", "엘리베이터 케이블",
  "호버크래프트 공기쿠션", "제트스키 활주", "낙하산 감속", "아폴로 달착륙", "보이저 탈출",
  "케이블카 현수선", "자전거 페달 역학", "화성 식민지 돔", "우주 엘리베이터", "에스컬레이터",
  // Biology (30)
  "코로나 스파이크 단백질", "mRNA 백신 작동", "혈전 형성", "암세포 전이", "CRISPR 유전자 가위",
  "장내 미생물 생태계", "망막 광수용체", "달팽이관 소리", "피부 멜라닌", "간 해독 효소",
  "신장 네프론 여과", "폐포 가스 교환", "위산 단백질 소화", "인슐린 혈당 조절", "근육 피로 젖산",
  "골다공증 뼈밀도", "관절 활액 윤활", "태아 심장 발생", "정자 난자 수정", "텔로미어 노화",
  "프리온 잘못 접힘", "자가면역 T세포", "알레르기 히스타민", "통증 신호 전달", "약물 혈뇌장벽",
  "줄기세포 분화", "항생제 내성균", "효소 기질 결합", "꽃가루 수정", "바이러스 캡시드",
  // Chemistry/Materials (30)
  "리튬이온 배터리", "페로브스카이트 태양전지", "초전도 YBCO", "탄소 나노튜브", "형상기억 합금",
  "액정 LCD 배향", "폴리머 사슬 얽힘", "세라믹 소결", "시멘트 수화", "스테인리스 부동태",
  "전기도금", "CVD 다이아몬드", "졸겔 나노입자", "제올라이트 흡착", "활성탄 다공성",
  "이온교환 수지", "LED 재결합", "양자점 형광", "OLED 발광층", "자성유체 페로플루이드",
  "에어로겔 단열", "메타물질 굴절", "가황 고무", "부식 전기화학", "에칭 패터닝",
  "사출 성형", "주조 용탕", "용접 풀 형성", "레이저 커팅", "3D프린팅 적층",
  // Space (20)
  "명왕성 하트 지형", "금성 황산 구름", "유로파 얼음 바다", "타이탄 메탄 호수", "이오 화산",
  "오르트 구름", "카이퍼 벨트", "프록시마 센타우리b", "펄서 자기장", "퀘이사 제트",
  "은하단 충돌", "우주 거대구조", "우주 배경복사", "제임스웹 딥필드", "로슈 한계",
  "스윙바이 궤도", "호만 전이", "태양 코로나 방출", "태양 흑점", "별의 HR도표",
  // Earth Science (20)
  "빙하 붕괴", "사하라 모래폭풍", "간헐천 분출", "석순 동굴", "산사태 토석류",
  "하천 사행 곡류", "폭포 낙하", "조수 간만", "용오름 해상 토네이도", "엘니뇨 해류",
  "오존층 파괴", "유성우 대기 진입", "일식 달그림자", "액상화 현상", "싱크홀 붕괴",
  "갯벌 퇴적", "맹그로브 해류", "산호초 군집", "고래 이동 해류", "반딧불이 동기화",
  // Sports (15)
  "축구 바나나킥", "야구 너클볼", "골프 딤플 양력", "테니스 톱스핀", "볼링 스트라이크",
  "당구 3쿠션", "다이빙 회전", "체조 공중회전", "양궁 탄도", "수영 접영",
  "스키 점프 양력", "봅슬레이 원심력", "서핑 파도타기", "번지점프 탄성", "격투기 충격량",
  // Food/Daily (15)
  "라면 끓는 대류", "달걀 프라이 열전달", "빵 반죽 글루텐", "초콜릿 결정화", "탄산 기포",
  "에스프레소 크레마", "솜사탕 원심력", "치즈 퐁듀 점성", "팝콘 터짐", "젠가 붕괴",
  "종이비행기 비행", "부메랑 궤적", "요요 왕복", "훌라후프 관성", "연 날리기 바람",
  // Math (15)
  "줄리아 집합", "시에르핀스키 삼각형", "코흐 눈송이", "셀룰러 오토마타", "게임오브라이프",
  "뢰슬러 어트랙터", "토러스 매듭", "힐베르트 곡선", "펜로즈 타일링", "보로노이 3D",
  "스피로그래프", "카테노이드 비누막", "클라인 병", "보이 곡면", "구면 조화함수",
  // Industry (15)
  "ASML EUV 리소그래피", "5nm 트랜지스터", "HBM 메모리 적층", "자율주행 라이다", "양자컴퓨터 큐비트",
  "뉴로모픽 칩", "광컴퓨팅 간섭", "DNA 저장장치", "MEMS 가속도센서", "잉크젯 분사",
  "플라즈마 절단", "원심 주조", "유리 광섬유", "실리콘 단결정", "SLA 프린팅",
  // Quantum/EM (10)
  "양자 터널링", "쿼크 모델 양성자", "전자기 유도", "LC 회로 진동", "맥스웰 전자기파",
  "이상기체 PV=nRT", "카르노 엔진", "블랙바디 복사", "금속 열전도", "엔트로피 확산",
  // Fantasy/Historic (10)
  "드래곤 날개 공기역학", "공룡 소행성 충돌", "타이타닉 침몰", "체르노빌 낙진", "바이킹 롱십",
  "다빈치 비행기계", "라이트형제 첫비행", "아르키메데스 유레카", "맨하튼 도시 전체", "해저도시 아틀란티스",
  // Extra (40)
  "심장 박동 혈류", "뇌 신경망 시냅스", "DNA 복제 포크", "항체 Y자 구조", "리보솜 번역",
  "ITER 토카막", "풍력태양광 하이브리드", "양수 발전소", "인공 광합성", "스마트 그리드",
  "삼체 문제 카오스", "N-body 시뮬", "튜링 패턴", "레일리 베나르 대류", "이징 모델 상전이",
  "커피잔 안 대류", "비눗방울 무지개", "촛불 열대류", "얼음 녹는 상전이", "도미노 연쇄",
  "물 분자 H2O", "그래핀 전자이동", "풀러렌 C60", "콜로이드 브라운", "나노입자 자기조립",
  "F-22 전투기 기동", "스페이스X 로켓", "자동차 정면충돌", "잠수함 수중이동", "열기구 상승",
  "화성 탐사 로버", "국제우주정거장 궤도", "초신성 폭발", "중성자별 펄서", "감마선 폭발",
  "타지마할 대리석", "만리장성 성벽", "시드니 오페라하우스", "가우디 성가족 성당", "스톤헨지",
];
const SCENARIOS = [...SCENARIOS_30, ...SCENARIOS_EXTENDED].slice(0, 300);

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
