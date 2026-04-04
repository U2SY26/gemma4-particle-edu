#!/usr/bin/env node
/**
 * run-300-random-v3.js — 3차 300회 랜덤 시뮬레이션
 * 이전 415회와 중복 없는 새로운 시나리오 + 대화 추론 능력 점검
 *
 * 구어체, 이모지, 후속 질문, 비유적 표현, 다국어 혼합 등
 * 실제 사용자처럼 다양한 화법으로 요청
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const SERVER_BASE = process.env.SERVER_BASE || 'http://localhost:3000';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 120000;

const SCENARIOS = [
  // === 구어체/일상 대화 (30) — 추론 능력 테스트 ===
  "야 진짜 궁금한데 블랙홀 안에 들어가면 스파게티처럼 늘어난다며? 그거 보여줘 ㅋㅋ",
  "선생님 수업시간에 빛이 물에서 꺾인다고 했는데 그게 뭐예요?",
  "아인슈타인이 말한 시공간 휘어짐 이해가 안 가는데 파티클로 설명해줄 수 있어?",
  "엄마가 압력밥솥 원리 알려달래 ㅎㅎ",
  "유튜브에서 테슬라 코일 봤는데 번개 나오는 거 어떻게 되는 거야?",
  "영화 인터스텔라에서 본 웜홀 진짜로 만들어봐!",
  "why do soap bubbles have rainbow colors? show me!",
  "지하철에서 급정거하면 사람이 앞으로 쏠리는 거 보여줘",
  "물에 기름 넣으면 왜 섞이지 않는지 시뮬레이션!",
  "달에서 농구하면 어떻게 될까? 중력이 1/6이잖아",
  "태풍의 눈이 왜 고요한지 보여줘~",
  "사하라 사막의 모래 언덕이 바람에 이동하는 거",
  "내가 좋아하는 카푸치노 우유 거품이 어떻게 만들어지는지!",
  "진공 청소기 원리가 뭐야? 빨아들이는 힘?",
  "화성에서 물이 끓는 온도가 다르다며? 기압 차이!",
  "북극곰이 빙하 위에 서있는데 빙하가 녹으면 어떻게 되는 거야",
  "전자레인지가 음식 데우는 원리 ㅋㅋ 마이크로파?",
  "스카이다이빙할 때 종단속도가 뭔지 보여줘!",
  "요즘 AI 반도체 열 문제 심각하다던데 칩 냉각 시뮬레이션",
  "손에서 정전기 나오는 거 진짜 싫은데 왜 그런 거야",
  "문어는 뼈가 없는데 어떻게 움직여? 연체동물 역학!",
  "국제우주정거장에서 물 짜면 어떻게 될까? 무중력 물방울!",
  "바다 밑 심해어가 압력을 어떻게 견디는 거야?",
  "축구에서 무회전킥 공이 흔들리는 이유 알려줘",
  "종이를 42번 접으면 달까지 갈 수 있다는데 진짜야?",
  "다이아몬드가 왜 그렇게 단단한지 원자 구조로 보여줘",
  "감기 바이러스가 세포에 침투하는 과정!",
  "식물이 햇빛으로 에너지 만드는 광합성 전자전달계",
  "��개가 치는 순간 공기가 3만도까지 올라간다던데??",
  "플라스틱이 바다에서 분해되는 과정 시뮬레이션",

  // === 건축/도시 (30) ===
  "두바이 부르즈 알 아랍 범선 모양 호텔",
  "로마 판테온 콘크리트 돔 구조",
  "가우디 사그라다 파밀리아 곡선 구조",
  "베르사유 궁전 정원 분수",
  "피사의 사탑 기울어진 구조",
  "만리장성 산악 구간",
  "타지마할 대칭 건축",
  "페트라 바위 조각 건축",
  "앙코르 와트 사원 복합체",
  "마추픽추 계단식 도시",
  "뉴욕 타임스퀘어 네온사인 숲",
  "도쿄 시부야 스크럼블 교차로 인파",
  "서울 강남역 지하상가 구조",
  "두바이 팜 아일랜드 인공섬",
  "베네치아 수상 도시 운하",
  "홍콩 빽빽한 아파트 단지",
  "싱가포르 마리나 베이 샌즈",
  "바르셀로나 블록 도시계획",
  "파리 개선문 방사형 도로",
  "런던 타워브리지 개폐식",
  "시카고 밀레니엄 파크 빈 조각",
  "모스크바 성 바실리 성당 양파 돔",
  "이스탄불 아야 소피아 돔",
  "카이로 기자 피라미드 3개 정렬",
  "산프란시스코 금문교 안개",
  "시드니 하버 브릿지 아치",
  "리우 구세주 그리스도상",
  "아테네 파르테논 신전 기둥",
  "라스베이거스 벨라지오 분수쇼",
  "상하이 스카이라인 야경",

  // === 우주/천체 (30) ===
  "목성의 대적반 초거대 폭풍",
  "토성 고리 입자 충돌",
  "명왕성 하트 모양 지형",
  "화성 올림푸스 산 (태양계 최대 화산)",
  "금성 표면 황산 구름",
  "수성의 거대 크레이터",
  "유로파 얼음 아래 바다",
  "타이탄의 메탄 호수",
  "이오의 화산 폭발",
  "해왕성의 초음속 바람",
  "오르트 구름 태양계 끝",
  "카이퍼 벨트 소천체",
  "프록시마 센타우리 b 외계행성",
  "트라피스트-1 행성계 7개 행성",
  "펄서 자기장 회전",
  "마그네타 초강력 자기장",
  "퀘이사 제트 분출",
  "은하단 충돌 암흑물질 분리",
  "우주 거대 구조 필라멘트",
  "우주 배경복사 온도 요동",
  "제임스 웹 딥필드 은하 수천개",
  "케플러 행성 공전 법칙",
  "로슈 한계 위성 파괴",
  "힐 구 중력 영향권",
  "스윙바이 행성 중력 도움",
  "호만 전이 궤도",
  "태양 코로나 질량 방출",
  "태양 흑점 자기장 루프",
  "별의 HR 도표 주계열",
  "적색편이 우주 팽창 증거",

  // === 생물/의학 (30) ===
  "코로나 바이러스 스파이크 단백질",
  "mRNA 백신 작동 원리",
  "혈관 내 혈전 형성과 용해",
  "암세포 전이 과정",
  "줄기세포가 심장세포로 분화",
  "CRISPR-Cas9 유전자 가위",
  "항생제 내성균 슈퍼버그",
  "장내 미생물 생태계 균형",
  "뇌 신경망 시냅스 전달",
  "망막 광수용체 빛 변환",
  "달팽이관 유모세포 소리 변환",
  "피부 멜라닌 자외선 차단",
  "간 해독 효소 반응",
  "신장 네프론 여과 과정",
  "폐포 가스 교환 O2/CO2",
  "위산 단백질 소화",
  "인슐린-글루카곤 혈당 조절",
  "근육 피로와 젖산 축적",
  "골다공증 뼈 밀도 감소",
  "관절 활액 윤활 메커니즘",
  "태아 심장 발생 과정",
  "정자 난자 수정 순간",
  "DNA 복제 포크",
  "텔로미어 단축과 노화",
  "후성유전학 DNA 메틸화",
  "프리온 단백질 잘못 접힘",
  "자가면역질환 T세포 오작동",
  "알레르기 히스타민 반응",
  "통증 신호 A-delta vs C 섬유",
  "약물 혈뇌장벽 통과",

  // === 화학/재료 (30) ===
  "리튬이온 배터리 충방전 사이클",
  "전고체 배터리 리튬 금속 음극",
  "페로브스카이트 태양전지 결정",
  "초전도체 쿠퍼 쌍",
  "고온 초전도 YBCO 결정",
  "탄소 나노튜브 전자 전달",
  "그래핀 양자홀 효과",
  "형상기억합금 NiTi 상전이",
  "액정 LCD 분자 배향",
  "폴리머 사슬 얽힘",
  "가황 고무 교차 결합",
  "세라믹 소결 과정",
  "시멘트 수화 반응",
  "스테인리스 부동태 피막",
  "부식 전기화학 셀",
  "전기도금 금속 증착",
  "에칭 반도체 패터닝",
  "CVD 다이아몬드 코팅",
  "졸겔 과정 나노입자 합성",
  "제올라이트 분자체 흡착",
  "활성탄 다공성 흡착",
  "이온교환수지 정수",
  "촉매 변환기 배기가스 처리",
  "효소 고정화 생물 촉매",
  "발광 다이오드 LED 재결합",
  "양자점 QD 형광",
  "유기 EL OLED 발광층",
  "자성 유체 페로플루이드",
  "에어로겔 초경량 단열",
  "메타물질 음의 굴절률",

  // === 에너지/환경 (20) ===
  "ITER 토카막 핵융합 플라즈마",
  "스텔라레이터 나선형 자기장",
  "풍력-태양광 하이브리드 발전",
  "양수 발전소 에너지 저장",
  "해양 온도차 발전 OTEC",
  "인공 광합성 수소 생산",
  "이산화탄소 직접 포집 DAC",
  "바이오차 탄소 격리",
  "미세 플라스틱 해양 분포",
  "오존 홀 복구 과정",
  "도시 열섬 효과",
  "그린 수소 전기분해 PEM",
  "암모니아 에너지 캐리어",
  "우주 태양광 발전 위성",
  "초임계 CO2 터빈",
  "소형 모듈 원자로 SMR",
  "토륨 용융염 원자로",
  "해조류 바이오연료",
  "이산화탄소 광물화 저장",
  "스마트 그리드 전력 분배",

  // === 수학/기하/컴퓨터 (20) ===
  "삼체 문제 카오스 궤도",
  "N-body 시뮬레이션 자체",
  "워리어 변환 홀로그래피",
  "퍼콜레이션 임계 전이",
  "이징 모델 자기 상전이",
  "샌드파일 모델 자기조직 임계",
  "랑톤의 개미 창발 패턴",
  "브란스우프 진동 반응",
  "튜링 패턴 반응-확산",
  "레일리-베나르 대류 패턴",
  "커스프 카타스트로프",
  "위상 공간 포인카레 단면",
  "리아푸노프 지수 카오스",
  "해밀턴 역학 위상 공간",
  "몬테카를로 pi 계산",
  "랜덤 워크 브라운 운동",
  "편향된 랜덤 워크 확산",
  "네트워크 스케일프리 그래프",
  "소세계 네트워크 6단계",
  "비국소 양자 얽힘",

  // === 스포츠/레저 (20) ===
  "올림픽 수영 접영 물결",
  "야구 너클볼 불규칙 궤적",
  "배드민턴 셔틀콕 깃털 공기역학",
  "컬링 스톤 컬 효과",
  "사격 탄도 바람 보정",
  "아이스하키 퍽 빙판 마찰",
  "트램폴린 탄성 진동",
  "인라인 스케이팅 코너링 원심력",
  "행글라이딩 열상승기류 활용",
  "프리다이빙 수압 변화",
  "클라이밍 동적 확보 추락",
  "MTB 산악자전거 서스펜션",
  "드리프트 타이어 슬립각",
  "모터보트 수면 도약",
  "윈드서핑 양력과 항력",
  "루지 공기역학 자세",
  "스노보드 반파이프 에어",
  "파쿠르 벽타기 역학",
  "줄넘기 로프 파동",
  "후프 농구 백보드 반사각",

  // === 음식/요리/농업 (20) ===
  "뻥튀기 쌀 팽창 원리",
  "설탕 캐러멜화 반응",
  "요구르트 발효 유산균",
  "된장 발효 미생물 생태",
  "맥주 양조 효모 발효",
  "와인 숙성 타닌 변화",
  "위스키 증류 기화점 차이",
  "두부 응고 단백질 네트워크",
  "떡 찧기 전분 변성",
  "과일 갈변 효소 반응",
  "참치회 세포 구조",
  "밀가루 반죽 글루텐 네트워크 형성",
  "버터 유화 크림화",
  "아이스크림 공기 혼입 오버런",
  "핫도그 소시지 유화 겔",
  "감자튀김 마이야르 반응",
  "녹차 카테킨 추출 확산",
  "커피 추출 삼투압 크레마",
  "식초 초산 발효",
  "김치 유산균 발효 온도별",

  // === 산업/기술 (20) ===
  "ASML EUV 리소그래피 광학계",
  "TSM 5nm 트랜지스터 게이트",
  "HBM 메모리 적층 TSV",
  "자율주행 라이다 포인트 클라우드 실시간",
  "양자 컴퓨터 큐비트 중첩",
  "양자 오류 정정 표면 코드",
  "뉴로모픽 칩 시냅스 회로",
  "광컴퓨팅 간섭 계산",
  "DNA 저장 장치 인코딩",
  "3D NAND 플래시 적층",
  "MEMS 가속도 센서 캔틸레버",
  "잉크젯 프린터 피에조 분사",
  "레이저 용접 키홀 형성",
  "플라즈마 절단 아크",
  "진공 증착 PVD 코팅",
  "원심 주조 파이프 제조",
  "유리 광섬유 인발",
  "실리콘 쵸크랄스키 단결정 성장",
  "사출 금형 웰드라인",
  "스테레오리소그래피 SLA 프린팅",

  // === 예술/문화/역사 (20) ===
  "빙하기 빙하 이동 경로",
  "공룡 멸종 소행성 충돌 시뮬레이션",
  "화석 형성 퇴적 압밀",
  "고대 이집트 나일강 범람",
  "폼페이 베수비오 화산 화쇄류",
  "타이타닉 침몰 선체 파단",
  "히로시마 원폭 충격파",
  "아폴로 11 달 착륙 분사",
  "첼시 챌린저호 폭발",
  "후쿠시마 원전 노심 용융",
  "체르노빌 방사성 낙진 확산",
  "메소포타미아 지구라트",
  "바이킹 롱십 파도 항해",
  "실크로드 사막 캐러밴",
  "이순신 거북선 구조",
  "레오나르도 다빈치 비행기계",
  "뉴턴의 사과 나무",
  "갈릴레오 피사 사탑 실험",
  "라이트 형제 첫 비행",
  "아르키메데스 목욕탕 유레카",

  // === 판타지/상상 (10) ===
  "드래곤 날개의 공기역학",
  "마법의 성 공중부양",
  "해저 도시 아틀란티스",
  "거대 로봇 관절 역학",
  "포탈 두 지점 연결",
  "반물질 엔진 추진",
  "테라포밍 된 화성 도시",
  "나노봇 군집 자기조립",
  "인공 태양 핵융합 구체",
  "4차원 하이퍼큐브 투영",
];

const SYSTEM_PROMPT = `You are a creative, enthusiastic particle simulation AI.
Talk naturally — use emojis, humor, and simple explanations like a fun science teacher.
Match the user's language (Korean→Korean, English→English).

ALWAYS include a \`\`\`json block:
\`\`\`json
{"simulation":{"prompt":"custom","title":"제목","description":"설명","domain":"도메인","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"timeScale":1.0,"friction":0.8,"bounciness":0.3,"windX":0,"windY":0,"windZ":0,"turbulence":0,"viscosity":0,"temperature":293},"particles":{"groups":[{"name":"name","count":5000,"shape":"sphere","params":{},"color":"cyan","role":0,"connect":"none"}]}}}
\`\`\`

Shapes: sphere,helix,grid,ring,disk,line,wave,spiral,shell,cylinder,cone,torus,random_box,point_cloud,random_sphere
Connect: chain,grid,nearest:N,all,surface,none
Colors: cyan,magenta,lime,orange,purple,blue,pink,yellow,teal,indigo

After the JSON, suggest 2 follow-up experiments. Total particles < 30000.`;

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    const hasModel = data.models?.some(m => m.name.startsWith(OLLAMA_MODEL.split(':')[0]));
    if (!hasModel) { console.error(`"${OLLAMA_MODEL}" not found`); return false; }
    console.log(`✓ ${OLLAMA_MODEL} ready`);
    return true;
  } catch { console.error('Ollama not running'); return false; }
}

async function generate(scenario, index) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const msg = attempt > 0 ? scenario + '\n\n반드시 ```json 블록을 포함해줘!' : scenario;
      const res = await fetchWithTimeout(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: msg },
        ], stream: false }),
      }, REQUEST_TIMEOUT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data.message?.content || '';
      const match = content.match(/```json\s*([\s\S]*?)```/);
      if (!match) throw new Error('No JSON');
      const sim = JSON.parse(match[1]).simulation;
      if (!sim?.prompt || !sim?.physics) throw new Error('Invalid sim');
      // Rate conversational quality
      const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(content);
      const hasFollowUp = /\?|탐구|실험|해볼|try|what if/i.test(content);
      const quality = (hasEmoji ? 1 : 0) + (hasFollowUp ? 1 : 0) + (content.length > 200 ? 1 : 0) + (sim.particles?.groups ? 1 : 0) + 1;
      return { success: true, scenario, simulation: sim, response: content, quality, attempts: attempt + 1 };
    } catch (err) {
      if (attempt === MAX_RETRIES) return { success: false, scenario, error: err.message, attempts: attempt + 1 };
    }
  }
}

async function saveToHistory(r) {
  try {
    await fetch(`${SERVER_BASE}/api/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: r.scenario, title: r.simulation?.title || '', domain: r.simulation?.domain || '',
        description: r.simulation?.description || '', prompt: r.simulation?.prompt || '',
        physics: r.simulation?.physics || {}, particleSpec: r.simulation?.particles || null,
        aiResponse: r.response, particleCount: r.simulation?.physics?.particleCount || 25000 }) });
  } catch {}
}

async function main() {
  console.log(`=== 3차 300회 랜덤 시뮬레이션 + 대화 추론 점검 ===`);
  console.log(`Model: ${OLLAMA_MODEL} | Scenarios: ${SCENARIOS.length}\n`);
  if (!(await checkOllama())) process.exit(1);

  const results = []; let success = 0, fail = 0, qualitySum = 0;
  const domainStats = {};

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i];
    process.stdout.write(`[${String(i+1).padStart(3)}/${SCENARIOS.length}] ${s.slice(0,50).padEnd(50)} `);
    const r = await generate(s, i);
    results.push(r);
    if (r.success) {
      success++; qualitySum += r.quality;
      const d = r.simulation.domain || 'unknown';
      domainStats[d] = (domainStats[d] || 0) + 1;
      process.stdout.write(`✓ Q${r.quality}/5 ${r.simulation.title?.slice(0,30)}${r.attempts>1?` [R${r.attempts-1}]`:''}\n`);
      await saveToHistory(r);
    } else {
      fail++;
      process.stdout.write(`✗ ${r.error}\n`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Results ===`);
  console.log(`Success: ${success}/${SCENARIOS.length} (${(success/SCENARIOS.length*100).toFixed(1)}%)`);
  console.log(`Failed:  ${fail}`);
  console.log(`Avg Quality: ${(qualitySum/Math.max(success,1)).toFixed(2)}/5`);
  console.log(`\n=== Domain Breakdown ===`);
  for (const [d,c] of Object.entries(domainStats).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${d.padEnd(22)} ${'█'.repeat(Math.round(c/3))} ${c}`);
  }

  const { writeFileSync } = await import('fs');
  writeFileSync(new URL('../data/simulation-results-300-v3.json', import.meta.url).pathname,
    JSON.stringify({ total: SCENARIOS.length, success, fail, avgQuality: qualitySum/Math.max(success,1), results, domainStats }, null, 2));
  console.log(`\nSaved to data/simulation-results-300-v3.json`);
}

main().catch(console.error);
