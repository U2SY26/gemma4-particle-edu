#!/usr/bin/env node
/**
 * run-300-extended.js — 300회 확장 시뮬레이션 E2E
 * 건축, 교통, 일상, 산업, 예술, 스포츠, 의료 등 광범위한 도메인
 *
 * Usage: OLLAMA_MODEL=gemma4 node scripts/run-300-extended.js
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const SERVER_BASE = process.env.SERVER_BASE || 'http://localhost:3000';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '120000', 10);

const SCENARIOS = [
  // === 건축/구조물 (30) ===
  "이집트 대피라미드 쿠푸왕 피라미드",
  "에펠탑 철골 트러스 구조",
  "자유의 여신상 내부 구조",
  "콜로세움 아치 구조",
  "만리장성 성벽 단면",
  "부르즈 칼리파 초고층 빌딩",
  "시드니 오페라 하우스 쉘 구조",
  "현수교: 금문교 케이블 구조",
  "돔 성당: 피렌체 두오모",
  "일본 오층탑 목조 내진 구조",
  "로마 수도교 아치 연속",
  "이글루 눈 블록 돔",
  "트레비 분수 물 흐름",
  "석굴암 돔 구조",
  "광화문 한옥 기둥보 구조",
  "63빌딩 커튼월 구조",
  "댐: 후버댐 아치 중력식",
  "해저 터널 단면",
  "고속도로 인터체인지 클로버잎",
  "올림픽 주경기장 돔",
  "풍력발전단지 터빈 배치",
  "태양광 패널 어레이",
  "원자력 발전소 격납건물",
  "런던 아이 관람차 구조",
  "롤러코스터 루프 트랙",
  "스카이다이빙 실내 풍동",
  "수영장 물 순환 시스템",
  "온실 유리 돔 구조",
  "지하철 역사 아치 터널",
  "공항 터미널 캔틸레버 지붕",

  // === 교통/탈것 (30) ===
  "보잉 747 여객기 비행",
  "F-22 랩터 전투기 공중기동",
  "스페이스X 팰컨9 로켓 발사",
  "자동차 충돌 테스트 (정면)",
  "F1 레이싱카 공기역학",
  "KTX 고속열차 터널 진입",
  "타이타닉호 선체 구조",
  "잠수함 수중 이동",
  "열기구 상승 원리",
  "드론 쿼드콥터 비행",
  "범선 돛 바람 역학",
  "우주왕복선 대기권 재진입",
  "마하 2 초음속 충격파",
  "헬리콥터 로터 양력",
  "카약 물살 흐름",
  "행글라이더 열상승기류",
  "자전거 페달 역학",
  "스케이트보드 올리 점프",
  "엘리베이터 케이블 장력",
  "에스컬레이터 계단 연동",
  "케이블카 현수선 곡선",
  "호버크래프트 공기 쿠션",
  "제트스키 수면 활주",
  "낙하산 공기저항 감속",
  "화성 탐사 로버 주행",
  "국제우주정거장 궤도",
  "보이저 태양계 탈출",
  "아폴로 달 착륙",
  "화성 식민지 돔 구조",
  "우주 엘리베이터 인장력",

  // === 일상/생활 과학 (30) ===
  "커피잔 안의 대류 현상",
  "비눗방울 표면장력",
  "촛불 불꽃의 열대류",
  "얼음이 녹는 상전이",
  "소금물 결정 성장",
  "팝콘이 터지는 순간",
  "풍선 터지는 충격파",
  "도미노 연쇄 반응",
  "물시계 모래시계 흐름",
  "진자 시계 메커니즘",
  "지퍼 맞물림 구조",
  "용수철 슬링키 계단 내려가기",
  "물에 잉크 한 방울 확산",
  "자석에 철가루 패턴",
  "레고 블록 탑 무너짐",
  "젠가 블록 제거 붕괴",
  "종이비행기 비행",
  "부메랑 회전 궤적",
  "요요 왕복 운동",
  "훌라후프 관성 회전",
  "버블랩 터지는 연쇄",
  "분수대 물 포물선",
  "우산에 빗방울 튕김",
  "눈사람 눈 뭉치기",
  "연날리기 바람 역학",
  "물수제비 돌 튕기기",
  "슬라임 점성 유체",
  "물감 마블링 패턴",
  "치즈 늘어남 점탄성",
  "달걀 낙하 충격 흡수",

  // === 산업/공학 (30) ===
  "3D 프린터 적층 제조",
  "CNC 밀링 절삭 가공",
  "레이저 커팅 열영향부",
  "용접 용접풀 형성",
  "주조 공정 용탕 흐름",
  "사출 성형 플라스틱 충전",
  "반도체 실리콘 웨이퍼 결정",
  "OLED 패널 유기물 증착",
  "배터리 리튬이온 이동",
  "태양전지 광전 효과",
  "연료전지 수소-산소 반응",
  "초전도체 마이스너 효과",
  "광섬유 전반사 전파",
  "레이더 전파 반사",
  "5G 빔포밍 안테나",
  "MRI 자기공명 스핀",
  "X-ray CT 단층촬영",
  "초음파 탐상 반사파",
  "풍동 실험 유선형",
  "수리모형 댐 월류",
  "지열 발전 열교환",
  "해수 담수화 역삼투",
  "폐수 처리 침전조",
  "쓰레기 소각로 열분해",
  "컨베이어 벨트 물류",
  "로봇팔 6축 관절",
  "자율주행 라이다 포인트클라우드",
  "드론 군집 비행",
  "수소 폭발 실험",
  "원심분리기 분리 공정",

  // === 의료/생명 (30) ===
  "심장 박동 혈류 순환",
  "폐 호흡 가스 교환",
  "적혈구 모세혈관 통과",
  "백혈구 식균 작용",
  "혈소판 혈전 형성",
  "인슐린 포도당 조절",
  "근육 수축 액틴-미오신",
  "뉴런 시냅스 전달",
  "눈 수정체 초점 조절",
  "귀 달팽이관 진동",
  "뼈 골절 치유 과정",
  "관절 연골 충격 흡수",
  "피부 상처 치유",
  "면역 T세포 공격",
  "암세포 증식 과정",
  "바이러스 세포 침입",
  "백신 항체 생성",
  "줄기세포 분화",
  "유전자 CRISPR 편집",
  "단백질 폴딩 3차 구조",
  "효소 기질 결합",
  "세포막 이온 채널",
  "미토콘드리아 ATP 합성",
  "엽록체 광합성",
  "세포 분열 유사분열",
  "감수분열 교차",
  "배아 발생 초기",
  "신경망 시냅스 가소성",
  "장내 미생물 생태계",
  "꽃가루 수정 과정",

  // === 자연현상 (30) ===
  "해일 쓰나미 전파",
  "화산 분화 용암 흐름",
  "토네이도 상세 구조",
  "번개 방전 경로",
  "눈송이 결정 성장",
  "우박 형성 과정",
  "무지개 빛 분산",
  "신기루 대기 굴절",
  "북극 빙하 붕괴",
  "사막 모래폭풍",
  "간헐천 분출",
  "석순 석유 동굴 형성",
  "산사태 토석류",
  "하천 사행 곡류",
  "폭포 물 낙하",
  "조수간만 조석",
  "용오름 해상 토네이도",
  "엘니뇨 해류 변화",
  "오존층 파괴 메커니즘",
  "태양 플레어 폭발",
  "유성우 대기 진입",
  "일식 달 그림자",
  "지진 액상화 현상",
  "카르스트 싱크홀 붕괴",
  "간석지 갯벌 퇴적",
  "맹그로브 뿌리 해류",
  "산호초 군집 형성",
  "고래 이동 해류",
  "철새 V자 편대비행",
  "반딧불이 동기화 발광",

  // === 예술/디자인 (20) ===
  "칼더 모빌 균형",
  "분수쇼 물줄기 패턴",
  "불꽃놀이 폭발 패턴",
  "만화경 대칭 패턴",
  "스노우글로브 눈 입자",
  "용암 램프 대류",
  "풍경 소리 바람 시뮬",
  "모래 시계 뒤집기",
  "물감 스플래시 아트",
  "잭슨 폴록 드리핑",
  "프랙탈 아트 줌인",
  "뫼비우스 띠 위 구슬",
  "오르골 회전 메커니즘",
  "크리스마스 트리 장식",
  "랜턴 하늘 등 상승",
  "종이접기 접히는 구조",
  "젤리피쉬 수중 유영",
  "나비 날갯짓 효과",
  "벌집 육각형 최적화",
  "거미줄 구조 진동",

  // === 스포츠/운동 (20) ===
  "축구공 바나나킥 마그누스",
  "야구공 커브볼 회전",
  "골프공 딤플 양력",
  "테니스 톱스핀 궤적",
  "볼링 스트라이크 충돌",
  "당구 3쿠션 반사",
  "다이빙 회전 관성",
  "피겨스케이팅 스핀",
  "체조 공중회전 역학",
  "양궁 화살 탄도",
  "수영 자유형 유체저항",
  "달리기 발 충격파",
  "높이뛰기 포스버리플롭",
  "장대높이뛰기 탄성에너지",
  "스키 점프 양력",
  "봅슬레이 커브 원심력",
  "서핑 파도 타기",
  "번지점프 탄성 진동",
  "암벽등반 마찰력",
  "격투기 타격 충격량",

  // === 우주/SF (20) ===
  "블랙홀 사건의 지평선",
  "웜홀 통과 시뮬레이션",
  "다이슨 구 태양 둘러싸기",
  "테라포밍 화성 대기",
  "소행성 충돌 지구 멸종",
  "중력파 시공간 왜곡",
  "암흑물질 은하 회전곡선",
  "빅뱅 우주 팽창",
  "중성자별 펄서 회전",
  "백색왜성 찬드라세카르",
  "적색거성 헬륨 플래시",
  "행성상 성운 형성",
  "쌍성 질량 전이",
  "감마선 폭발",
  "은하 초대질량 블랙홀 제트",
  "스페이스 데브리 궤도",
  "라그랑주 점 우주 정거장",
  "태양풍 자기권 상호작용",
  "목성 대적반 폭풍",
  "토성 고리 입자 역학",

  // === 음식/요리 (10) ===
  "라면 끓는 대류",
  "와인 다리 현상 (마랑고니)",
  "달걀 프라이 열전달",
  "빵 반죽 글루텐 네트워크",
  "초콜릿 템퍼링 결정화",
  "탄산음료 기포 상승",
  "아이스크림 결정 형성",
  "에스프레소 크레마 유화",
  "솜사탕 원심력 방사",
  "치즈 퐁듀 점성 흐름",

  // === 나노/미시 세계 (20) ===
  "물 분자 수소결합 네트워크",
  "탄소나노튜브 구조",
  "풀러렌 C60 축구공 분자",
  "그래핀 전자 이동",
  "양자점 QD 에너지 준위",
  "이중층 지질 세포막",
  "콜로이드 브라운 운동",
  "계면활성제 미셀 형성",
  "에어로졸 입자 분산",
  "나노입자 자기조립",
  "DNA 전기영동 이동",
  "원자 현미경 AFM 탐침",
  "실리콘 도핑 반도체",
  "페로브스카이트 결정",
  "MEMS 마이크로 기어",
  "분자 모터 ATP합성효소",
  "리보솜 단백질 번역",
  "항체 Y자 구조",
  "인지질 자기조립 리포솜",
  "바이러스 캡시드 조립",

  // === 에너지/환경 (20) ===
  "핵융합로 플라즈마 가둠",
  "풍력 터빈 날개 유동",
  "조력 발전 수류",
  "파력 발전 부이",
  "수력 발전 터빈",
  "바이오매스 연소",
  "수소 경제 연료전지 스택",
  "열펌프 냉매 순환",
  "지구 온난화 온실효과",
  "산성비 화학반응",
  "미세먼지 PM2.5 확산",
  "해양 플라스틱 쓰레기 순환",
  "방사성 폐기물 반감기",
  "탄소 포집 CCS 흡착",
  "수전해 수소 생산",
  "슈퍼커패시터 충방전",
  "압전 발전 진동 에너지",
  "열전 발전 온도차",
  "플라이휠 에너지 저장",
  "초전도 자기부상 열차",

  // === 수학/패턴 (20) ===
  "만델브로 집합 줌인",
  "줄리아 집합 변형",
  "시에르핀스키 삼각형",
  "코흐 눈송이 곡선",
  "셀룰러 오토마타 Rule 30",
  "게임 오브 라이프 글라이더",
  "리사주 패턴 3D",
  "스트레인지 어트랙터 로렌츠",
  "뢰슬러 어트랙터",
  "토러스 매듭 곡선",
  "힐베르트 곡선 공간 채움",
  "펜로즈 타일링",
  "보로노이 3D 분할",
  "들로네 삼각분할",
  "스피로그래프 패턴",
  "황금나선 피보나치",
  "카테노이드 비누막 곡면",
  "클라인 병 3D 투영",
  "보이 곡면",
  "구면 조화 함수 시각화",
];

const SYSTEM_PROMPT = `You are a universal particle simulation AI. You can simulate ANYTHING using particles in 3D space.
Respond with a brief Korean explanation + mandatory JSON block.

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "제목",
    "description": "한 줄 설명",
    "domain": "도메인",
    "physics": {
      "gravity": -9.81, "damping": 0.97, "springStiffness": 20,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.8,
      "bounciness": 0.3, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0, "temperature": 293
    },
    "particles": {
      "groups": [
        { "name": "그룹명", "count": 5000, "shape": "sphere", "params": {}, "color": "cyan", "role": 0, "connect": "none" }
      ]
    }
  }
}
\`\`\`

Shapes: sphere, helix, grid, ring, disk, line, wave, spiral, shell, cylinder, cone, torus, random_box, point_cloud, random_sphere
Connect: chain, grid, nearest:N, all, surface, none
Colors: cyan, magenta, lime, orange, purple, blue, pink, yellow, teal, indigo
Domains: architecture, transport, daily_life, industry, medical, nature, art, sports, space, food, nano, energy, mathematics

CRITICAL: Always include the JSON block. Keep particle count under 30000.`;

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function validateSimulation(sim) {
  if (!sim) return { valid: false, reason: 'null' };
  if (!sim.prompt) return { valid: false, reason: 'no prompt' };
  if (!sim.physics?.gravity === undefined) return { valid: false, reason: 'no gravity' };
  return { valid: true };
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    const models = data.models?.map(m => m.name) || [];
    const hasModel = models.some(n => n.startsWith(OLLAMA_MODEL.split(':')[0]));
    if (!hasModel) { console.error(`Model "${OLLAMA_MODEL}" not found.`); return false; }
    console.log(`✓ Model "${OLLAMA_MODEL}" ready`);
    return true;
  } catch { console.error('Ollama not running'); return false; }
}

async function generateSim(scenario, index) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: scenario },
  ];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) messages[1].content = scenario + '\n\nIMPORTANT: Include ```json block.';

      const res = await fetchWithTimeout(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
      }, REQUEST_TIMEOUT);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data.message?.content || '';
      const match = content.match(/```json\s*([\s\S]*?)```/);
      if (!match) throw new Error('No JSON block');

      const parsed = JSON.parse(match[1]);
      const sim = parsed.simulation;
      const v = validateSimulation(sim);
      if (!v.valid) throw new Error(`Validation: ${v.reason}`);

      return { success: true, scenario, simulation: sim, response: content, attempts: attempt + 1 };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { success: false, scenario, error: err.message, attempts: attempt + 1 };
      }
    }
  }
}

async function saveToHistory(result) {
  try {
    const sim = result.simulation;
    await fetch(`${SERVER_BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: result.scenario, title: sim?.title || 'Untitled',
        domain: sim?.domain || 'general', description: sim?.description || '',
        prompt: sim?.prompt || '', physics: sim?.physics || {},
        particleSpec: sim?.particles || null, aiResponse: result.response,
        particleCount: sim?.physics?.particleCount || 25000,
      }),
    });
  } catch {}
}

async function main() {
  console.log(`=== 300회 확장 시뮬레이션 E2E ===`);
  console.log(`Model: ${OLLAMA_MODEL} | Scenarios: ${SCENARIOS.length}\n`);

  if (!(await checkOllama())) process.exit(1);

  const results = [];
  let success = 0, fail = 0;
  const domainStats = {};

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i];
    process.stdout.write(`[${String(i+1).padStart(3)}/${SCENARIOS.length}] ${s.slice(0,55).padEnd(55)} `);

    const r = await generateSim(s, i);
    results.push(r);

    if (r.success) {
      success++;
      const d = r.simulation.domain || 'unknown';
      domainStats[d] = (domainStats[d] || { pass: 0, fail: 0 });
      domainStats[d].pass++;
      process.stdout.write(`✓ ${r.simulation.title?.slice(0,40)}${r.attempts > 1 ? ` [retry ${r.attempts-1}]` : ''}\n`);
      await saveToHistory(r);
    } else {
      fail++;
      process.stdout.write(`✗ ${r.error}\n`);
    }

    // Brief pause
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Results ===`);
  console.log(`Success: ${success}/${SCENARIOS.length} (${(success/SCENARIOS.length*100).toFixed(1)}%)`);
  console.log(`Failed:  ${fail}/${SCENARIOS.length}`);

  console.log('\n=== Domain Breakdown ===');
  for (const [d, s] of Object.entries(domainStats).sort((a,b) => b[1].pass - a[1].pass)) {
    const bar = '█'.repeat(Math.round(s.pass / 3));
    console.log(`  ${d.padEnd(20)} ${bar} ${s.pass}`);
  }

  // Save results
  const { writeFileSync } = await import('fs');
  const path = new URL('../data/simulation-results-300.json', import.meta.url).pathname;
  writeFileSync(path, JSON.stringify({ total: SCENARIOS.length, success, fail, results, domainStats }, null, 2));
  console.log(`\nSaved to ${path}`);
}

main().catch(console.error);
