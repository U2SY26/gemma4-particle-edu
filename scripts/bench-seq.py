#!/usr/bin/env python3
"""Sequential benchmark — 1 at a time, auto-rework <90%, kanban + typst"""
import json, re, time, os, sys

OLLAMA = os.environ.get('OLLAMA_BASE', 'http://localhost:11434')
MODEL = os.environ.get('OLLAMA_MODEL', 'gemma4')
KANBAN = 'http://localhost:5555'
TEAM = 'team-dc1757cd'
DOCS = os.path.join(os.path.dirname(__file__), '..', 'docs', 'benchmarks')
os.makedirs(DOCS, exist_ok=True)

SYS_PROMPT = (
    "Particle sim AI. Fill ALL physics fields with accurate SI values. "
    "ALWAYS respond with ```json "
    '{"simulation":{"prompt":"keyword","title":"...","domain":"...","physics":'
    '{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,'
    '"temperature":293,"density":2.4,"viscosity":0,"friction":0.8,"bounciness":0.3,'
    '"windX":0,"turbulence":0,"seismic":0}}}```'
)

SCENARIOS = [
    ("이집트 대피라미드", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,50]}),
    ("에펠탑 철골 트러스", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("자유의 여신상", {"gravity": [-10,-9], "density": [7,9]}),
    ("콜로세움 아치", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,35]}),
    ("부르즈 칼리파", {"gravity": [-10,-9], "springStiffness": [30,80]}),
    ("시드니 오페라하우스", {"gravity": [-10,-9], "springStiffness": [10,35], "density": [2,3]}),
    ("금문교 현수교", {"gravity": [-10,-9], "springStiffness": [20,70]}),
    ("피사의 사탑", {"gravity": [-10,-9], "density": [2,3]}),
    ("타지마할", {"gravity": [-10,-9], "density": [2,3]}),
    ("만리장성", {"gravity": [-10,-9], "springStiffness": [15,40]}),
    ("보잉 747 비행", {"gravity": [-10,-9]}),
    ("F-22 전투기", {"gravity": [-10,-9]}),
    ("스페이스X 로켓 발사", {"gravity": [-10,-9]}),
    ("자동차 정면충돌", {"gravity": [-10,-9], "bounciness": [0,0.3]}),
    ("잠수함 수중 이동", {"gravity": [-10,-9], "viscosity": [0.5,5]}),
    ("열기구 상승", {"gravity": [-2,2]}),
    ("우주왕복선 재진입", {"temperature": [1000,5000]}),
    ("화성 로버", {"gravity": [-4,-3]}),
    ("ISS 무중력", {"gravity": [-0.1,0.1]}),
    ("달 표면 점프", {"gravity": [-2,-1]}),
    ("커피잔 대류", {"temperature": [330,380]}),
    ("비눗방울", {"gravity": [-10,-9]}),
    ("촛불 열대류", {"temperature": [800,1500]}),
    ("얼음 녹는 상전이", {"temperature": [270,280]}),
    ("도미노 연쇄반응", {"gravity": [-10,-9]}),
    ("물 분자 H2O", {"gravity": [-0.1,0.1]}),
    ("NaCl 결정격자", {"gravity": [-0.1,0.1]}),
    ("DNA 이중나선", {"gravity": [-0.1,0.1]}),
    ("단백질 알파헬릭스", {"gravity": [-0.1,0.1]}),
    ("브라운 운동", {"gravity": [-0.1,0.1]}),
    ("세포 분열", {"gravity": [-3,0]}),
    ("뉴런 시냅스", {"gravity": [-3,0]}),
    ("적혈구 모세혈관", {"viscosity": [1,5]}),
    ("바이러스 캡시드", {"gravity": [-0.1,0.1]}),
    ("광합성 전자전달", {"gravity": [-0.1,0.1]}),
    ("판구조론", {"seismic": [3,10]}),
    ("화산 용암", {"temperature": [1100,1500]}),
    ("지진파 전파", {"seismic": [3,10]}),
    ("해류 열염순환", {"viscosity": [0.5,3]}),
    ("쓰나미", {"gravity": [-10,-9]}),
    ("토네이도", {"windX": [5,30], "turbulence": [3,15]}),
    ("눈보라 -30도", {"temperature": [230,250]}),
    ("태풍", {"windX": [5,20], "turbulence": [5,15]}),
    ("오로라", {"gravity": [-0.1,0.1]}),
    ("태양계 궤도", {"gravity": [-0.1,0.1]}),
    ("블랙홀 강착원반", {"gravity": [-1000,-1]}),
    ("은하 충돌", {"gravity": [-0.1,0.1]}),
    ("목성 대적반", {"gravity": [-26,-23]}),
    ("화성 먼지폭풍", {"gravity": [-4,-3]}),
    ("초신성 폭발", {"temperature": [5000,50000]}),
    ("트러스 다리", {"springStiffness": [20,60]}),
    ("내진 건물", {"seismic": [5,10]}),
    ("풍력 터빈", {"windX": [5,20]}),
    ("댐 수압", {"viscosity": [0.5,3]}),
    ("로렌츠 어트랙터", {"gravity": [-0.1,0.1]}),
    ("피보나치 나선", {"gravity": [-0.1,0.1]}),
    ("다이아몬드 결정", {"springStiffness": [40,200], "density": [3,4]}),
    ("핵융합 플라즈마", {"temperature": [10000,200000]}),
    ("자유낙하 10m", {"gravity": [-10,-9]}),
    ("심해 수압", {"viscosity": [1,10]}),
    ("용암 1200도", {"temperature": [1100,1500]}),
    ("꿀 점성", {"viscosity": [5,20]}),
    ("수영장 파동", {"viscosity": [0.5,3]}),
    ("뉴턴 요람", {"bounciness": [0.7,1]}),
    ("초전도 마이스너", {"gravity": [-0.1,0.1], "temperature": [0,100]}),
    ("끓는물 373K", {"temperature": [360,380]}),
    ("수은 액체금속", {"density": [10,15]}),
    ("지진 규모7", {"seismic": [5,10]}),
    ("맨하튼 도시", {"gravity": [-10,-9]}),
    ("DNA 복제 포크", {"gravity": [-0.1,0.1]}),
    ("심장 혈류 순환", {"viscosity": [1,5]}),

    # ── Architecture (30 more) ──
    ("앙코르와트 사원", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,40]}),
    ("마추픽추 석조도시", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,35]}),
    ("로마 수도교", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,40]}),
    ("가우디 사그라다파밀리아", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,50]}),
    ("베르사유 궁전", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,35]}),
    ("두바이 팜 아일랜드", {"gravity": [-10,-9], "density": [1.5,3], "viscosity": [0.5,3]}),
    ("베네치아 수상도시", {"gravity": [-10,-9], "density": [2,3], "viscosity": [0.5,3]}),
    ("홍콩 아파트 단지", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [20,60]}),
    ("파리 개선문", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,40]}),
    ("런던 타워브릿지", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("모스크바 성바실리 성당", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,35]}),
    ("이스탄불 아야소피아", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,40]}),
    ("시카고 빌딩", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [25,70]}),
    ("상하이 스카이라인", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [30,80]}),
    ("도쿄 타워", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("광화문 한옥", {"gravity": [-10,-9], "density": [0.4,1], "springStiffness": [5,20]}),
    ("석굴암", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,40]}),
    ("63빌딩", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [30,80]}),
    ("롤러코스터", {"gravity": [-10,-9], "springStiffness": [20,60], "bounciness": [0,0.3]}),
    ("온실 돔", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,30]}),
    ("지하철 역사", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [20,50]}),
    ("공항 터미널", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [25,60]}),
    ("원자력 격납건물", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [40,100]}),
    ("댐 붕괴", {"gravity": [-10,-9], "viscosity": [0.5,3], "density": [2,3]}),
    ("이글루", {"gravity": [-10,-9], "density": [0.3,1], "temperature": [240,270]}),
    ("로마 판테온", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,40]}),
    ("런던아이", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("스타디움 돔", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("고속도로 IC", {"gravity": [-10,-9], "density": [2,3], "friction": [0.5,1]}),
    ("해저 터널", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [30,80]}),

    # ── Transport (20 more) ──
    ("F1 레이싱카", {"gravity": [-10,-9], "friction": [0.7,1], "density": [1,2]}),
    ("KTX 터널 진입", {"gravity": [-10,-9], "density": [7,8], "windX": [5,30]}),
    ("타이타닉 항해", {"gravity": [-10,-9], "viscosity": [0.5,3], "density": [7,8]}),
    ("드론 쿼드콥터", {"gravity": [-10,-9], "windX": [0,10]}),
    ("범선 돛", {"gravity": [-10,-9], "windX": [3,20]}),
    ("마하2 충격파", {"gravity": [-10,-9], "temperature": [400,1500]}),
    ("카약 물살", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("행글라이더", {"gravity": [-10,-9], "windX": [3,15]}),
    ("스케이트보드", {"gravity": [-10,-9], "friction": [0.2,0.6]}),
    ("엘리베이터", {"gravity": [-10,-9], "springStiffness": [20,60]}),
    ("에스컬레이터", {"gravity": [-10,-9], "friction": [0.3,0.7]}),
    ("호버크래프트", {"gravity": [-10,-9], "friction": [0,0.2]}),
    ("제트스키", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("낙하산", {"gravity": [-10,-9], "windX": [1,10], "damping": [0.9,1]}),
    ("아폴로 달 착륙", {"gravity": [-2,-1]}),
    ("보이저 태양계 탈출", {"gravity": [-0.1,0.1]}),
    ("케이블카", {"gravity": [-10,-9], "springStiffness": [15,50]}),
    ("자전거 페달", {"gravity": [-10,-9], "friction": [0.3,0.8]}),
    ("화성 식민지 돔", {"gravity": [-4,-3], "temperature": [200,270]}),
    ("우주 엘리베이터", {"gravity": [-10,-1], "springStiffness": [30,100]}),

    # ── Biology/Medical (30 more) ──
    ("코로나 스파이크 단백질", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("mRNA 백신 작동", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("혈전 형성", {"gravity": [-3,0], "viscosity": [1,5]}),
    ("암세포 전이", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("CRISPR 유전자 가위", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("장내 미생물", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("망막 광수용체", {"gravity": [-3,0], "viscosity": [0.5,3]}),
    ("달팽이관 청각", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("피부 멜라닌", {"gravity": [-3,0], "viscosity": [0.5,3]}),
    ("간 해독", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("신장 네프론", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("폐포 가스교환", {"gravity": [-3,0], "viscosity": [0.5,3]}),
    ("위산 소화", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("인슐린 혈당 조절", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("근육 피로 젖산", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("골다공증", {"gravity": [-10,-9], "density": [1,2], "springStiffness": [5,20]}),
    ("관절 활액", {"gravity": [-3,0], "viscosity": [1,10]}),
    ("태아 심장 발생", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("정자 난자 수정", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("DNA 복제 포크 분자", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("텔로미어 노화", {"gravity": [-0.1,0.1], "viscosity": [0.5,3]}),
    ("프리온 잘못접힘", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("자가면역 T세포", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("알레르기 히스타민", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("통증 신호 전달", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("약물 혈뇌장벽 통과", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("줄기세포 분화", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("항생제 내성균", {"gravity": [-3,0], "viscosity": [0.5,5]}),
    ("효소 기질 복합체", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("꽃가루 수정", {"gravity": [-3,0], "viscosity": [0.5,5]}),

    # ── Chemistry/Materials (30 more) ──
    ("리튬이온 배터리", {"gravity": [-0.1,0.1], "temperature": [280,330]}),
    ("페로브스카이트 태양전지", {"gravity": [-0.1,0.1], "temperature": [280,320]}),
    ("초전도 YBCO", {"gravity": [-0.1,0.1], "temperature": [0,100]}),
    ("탄소나노튜브", {"gravity": [-0.1,0.1], "springStiffness": [50,200], "density": [1,2]}),
    ("형상기억합금", {"gravity": [-10,-9], "density": [6,8], "temperature": [280,400]}),
    ("액정 LCD", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("폴리머 사슬", {"gravity": [-0.1,0.1], "viscosity": [0.5,10]}),
    ("세라믹 소결", {"gravity": [-0.1,0.1], "temperature": [1000,2000], "density": [2,4]}),
    ("시멘트 수화 반응", {"gravity": [-10,-9], "density": [2,3], "temperature": [280,340]}),
    ("스테인리스 부동태막", {"gravity": [-0.1,0.1], "density": [7,8]}),
    ("전기도금", {"gravity": [-10,-9], "density": [7,12]}),
    ("CVD 다이아몬드", {"gravity": [-0.1,0.1], "temperature": [800,1200], "density": [3,4]}),
    ("졸겔 나노입자", {"gravity": [-0.1,0.1], "viscosity": [0.5,10]}),
    ("제올라이트 흡착", {"gravity": [-0.1,0.1], "density": [1.5,3]}),
    ("활성탄 흡착", {"gravity": [-0.1,0.1], "density": [0.3,0.8]}),
    ("이온교환 수지", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("LED 재결합 발광", {"gravity": [-0.1,0.1], "temperature": [280,350]}),
    ("양자점 형광", {"gravity": [-0.1,0.1], "temperature": [280,320]}),
    ("OLED 발광", {"gravity": [-0.1,0.1], "temperature": [280,350]}),
    ("자성유체 페로플루이드", {"gravity": [-10,-9], "viscosity": [1,10], "density": [1,2]}),
    ("에어로겔 단열", {"gravity": [-0.1,0.1], "density": [0.001,0.2], "temperature": [280,320]}),
    ("메타물질", {"gravity": [-0.1,0.1], "density": [0.5,5]}),
    ("가황 고무", {"gravity": [-10,-9], "density": [0.9,1.5], "bounciness": [0.5,0.9]}),
    ("부식 전기화학", {"gravity": [-0.1,0.1], "density": [7,8]}),
    ("에칭 패터닝", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("사출 성형", {"gravity": [-10,-9], "temperature": [400,600], "viscosity": [1,20]}),
    ("주조 용탕", {"gravity": [-10,-9], "temperature": [1000,1700], "density": [7,8]}),
    ("용접 풀", {"gravity": [-10,-9], "temperature": [1500,3500], "density": [7,8]}),
    ("레이저 커팅", {"gravity": [-10,-9], "temperature": [1000,4000]}),
    ("3D프린팅 적층", {"gravity": [-10,-9], "temperature": [350,600], "density": [1,2]}),

    # ── Space (20 more) ──
    ("명왕성 하트 평원", {"gravity": [-1,-0.3]}),
    ("금성 황산 구름", {"gravity": [-9,-8], "temperature": [700,800]}),
    ("유로파 얼음 바다", {"gravity": [-2,-1], "temperature": [80,270]}),
    ("타이탄 메탄 호수", {"gravity": [-2,-1], "temperature": [90,100]}),
    ("이오 화산", {"gravity": [-2,-1], "temperature": [1000,2000]}),
    ("오르트 구름", {"gravity": [-0.1,0.1]}),
    ("카이퍼 벨트", {"gravity": [-0.1,0.1]}),
    ("프록시마 센타우리b", {"gravity": [-12,-8]}),
    ("펄서 자기장", {"gravity": [-0.1,0.1], "temperature": [5000,100000]}),
    ("퀘이사 제트", {"gravity": [-0.1,0.1], "temperature": [10000,200000]}),
    ("은하단 충돌", {"gravity": [-0.1,0.1]}),
    ("우주 거대구조", {"gravity": [-0.1,0.1]}),
    ("우주 배경복사", {"gravity": [-0.1,0.1], "temperature": [2,4]}),
    ("제임스웹 딥필드", {"gravity": [-0.1,0.1]}),
    ("로슈 한계 조석파괴", {"gravity": [-0.1,0.1]}),
    ("스윙바이 중력도움", {"gravity": [-0.1,0.1]}),
    ("호만 궤도 전이", {"gravity": [-0.1,0.1]}),
    ("태양 코로나 질량방출", {"gravity": [-274,-270], "temperature": [10000,200000]}),
    ("태양 흑점", {"gravity": [-274,-270], "temperature": [3500,5000]}),
    ("HR도표 주계열성", {"gravity": [-0.1,0.1], "temperature": [2500,40000]}),

    # ── Earth Science (20 more) ──
    ("빙하 붕괴", {"gravity": [-10,-9], "density": [0.8,1], "temperature": [250,275]}),
    ("사막 모래폭풍", {"gravity": [-10,-9], "windX": [5,30], "turbulence": [3,15]}),
    ("간헐천 분출", {"gravity": [-10,-9], "temperature": [370,420]}),
    ("석순 동굴", {"gravity": [-10,-9], "density": [2,3], "viscosity": [0.5,3]}),
    ("산사태 토석류", {"gravity": [-10,-9], "density": [1.5,3], "friction": [0.2,0.6]}),
    ("하천 사행", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("폭포", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("조수 간만", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("용오름", {"gravity": [-10,-9], "windX": [5,30], "turbulence": [5,20]}),
    ("엘니뇨 해수온", {"gravity": [-10,-9], "temperature": [295,305], "viscosity": [0.5,3]}),
    ("오존층 파괴", {"gravity": [-10,-9], "temperature": [200,230]}),
    ("유성우 대기 진입", {"gravity": [-10,-9], "temperature": [1000,5000]}),
    ("일식 달 그림자", {"gravity": [-0.1,0.1]}),
    ("액상화", {"gravity": [-10,-9], "seismic": [3,10], "viscosity": [0.5,5]}),
    ("싱크홀", {"gravity": [-10,-9], "density": [1.5,3]}),
    ("갯벌 퇴적", {"gravity": [-10,-9], "viscosity": [0.5,5], "density": [1.5,2.5]}),
    ("맹그로브 해류", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("산호초 군집", {"gravity": [-10,-9], "viscosity": [0.5,3], "density": [1.5,3]}),
    ("고래 이동", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("반딧불이 동기화", {"gravity": [-10,-9]}),

    # ── Sports (15 more) ──
    ("축구 바나나킥", {"gravity": [-10,-9], "windX": [1,10]}),
    ("야구 너클볼", {"gravity": [-10,-9], "turbulence": [1,10]}),
    ("골프 딤플 양력", {"gravity": [-10,-9], "windX": [1,10]}),
    ("테니스 톱스핀", {"gravity": [-10,-9], "friction": [0.3,0.8]}),
    ("볼링 스트라이크", {"gravity": [-10,-9], "friction": [0.2,0.6]}),
    ("당구 3쿠션", {"gravity": [-10,-9], "bounciness": [0.7,1], "friction": [0.1,0.4]}),
    ("다이빙 회전", {"gravity": [-10,-9]}),
    ("체조 공중회전", {"gravity": [-10,-9]}),
    ("양궁 탄도", {"gravity": [-10,-9], "windX": [0,5]}),
    ("수영 접영", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("스키 점프", {"gravity": [-10,-9], "windX": [1,15]}),
    ("봅슬레이", {"gravity": [-10,-9], "friction": [0,0.1]}),
    ("서핑 파도", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("번지 점프", {"gravity": [-10,-9], "springStiffness": [5,30], "bounciness": [0.3,0.8]}),
    ("격투기 충격량", {"gravity": [-10,-9], "bounciness": [0,0.3]}),

    # ── Food/Daily (15 more) ──
    ("라면 끓는 대류", {"gravity": [-10,-9], "temperature": [370,380], "viscosity": [0.5,3]}),
    ("달걀 프라이", {"gravity": [-10,-9], "temperature": [400,500]}),
    ("빵 반죽 글루텐", {"gravity": [-10,-9], "viscosity": [5,50]}),
    ("초콜릿 결정화", {"gravity": [-10,-9], "temperature": [300,320]}),
    ("탄산 기포", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("에스프레소 크레마", {"gravity": [-10,-9], "viscosity": [1,10], "temperature": [360,370]}),
    ("솜사탕 원심력", {"gravity": [-10,-9], "temperature": [380,430]}),
    ("치즈 퐁듀", {"gravity": [-10,-9], "viscosity": [5,50], "temperature": [330,350]}),
    ("팝콘 터짐", {"gravity": [-10,-9], "temperature": [420,500]}),
    ("젠가 붕괴", {"gravity": [-10,-9], "density": [0.4,0.8], "friction": [0.3,0.7]}),
    ("종이비행기", {"gravity": [-10,-9], "windX": [0,5]}),
    ("부메랑 궤적", {"gravity": [-10,-9], "windX": [0,5]}),
    ("요요 왕복", {"gravity": [-10,-9], "springStiffness": [5,30]}),
    ("훌라후프", {"gravity": [-10,-9], "friction": [0.2,0.6]}),
    ("연 날리기", {"gravity": [-10,-9], "windX": [3,15]}),

    # ── Math/Abstract (15 more) ──
    ("줄리아 집합", {"gravity": [-0.1,0.1]}),
    ("시에르핀스키 삼각형", {"gravity": [-0.1,0.1]}),
    ("코흐 눈송이", {"gravity": [-0.1,0.1]}),
    ("셀룰러 오토마타", {"gravity": [-0.1,0.1]}),
    ("게임 오브 라이프", {"gravity": [-0.1,0.1]}),
    ("뢰슬러 어트랙터", {"gravity": [-0.1,0.1]}),
    ("토러스 매듭", {"gravity": [-0.1,0.1]}),
    ("힐베르트 곡선", {"gravity": [-0.1,0.1]}),
    ("펜로즈 타일링", {"gravity": [-0.1,0.1]}),
    ("보로노이 3D", {"gravity": [-0.1,0.1]}),
    ("스피로그래프", {"gravity": [-0.1,0.1]}),
    ("카테노이드 비누막", {"gravity": [-10,-9], "viscosity": [0.5,3]}),
    ("클라인 병", {"gravity": [-0.1,0.1]}),
    ("보이 곡면", {"gravity": [-0.1,0.1]}),
    ("구면 조화함수", {"gravity": [-0.1,0.1]}),

    # ── Industry (15 more) ──
    ("ASML EUV 리소그래피", {"gravity": [-0.1,0.1], "temperature": [280,320]}),
    ("5nm 트랜지스터", {"gravity": [-0.1,0.1], "density": [2,3]}),
    ("HBM 메모리 적층", {"gravity": [-0.1,0.1], "temperature": [280,360]}),
    ("자율주행 라이다", {"gravity": [-10,-9]}),
    ("양자컴퓨터 큐비트", {"gravity": [-0.1,0.1], "temperature": [0,1]}),
    ("뉴로모픽 칩", {"gravity": [-0.1,0.1], "temperature": [280,350]}),
    ("광컴퓨팅", {"gravity": [-0.1,0.1]}),
    ("DNA 저장장치", {"gravity": [-0.1,0.1], "viscosity": [0.5,5]}),
    ("MEMS 가속도 센서", {"gravity": [-10,-9], "density": [2,3]}),
    ("잉크젯 분사", {"gravity": [-10,-9], "viscosity": [1,10]}),
    ("플라즈마 절단", {"gravity": [-10,-9], "temperature": [5000,30000]}),
    ("원심 주조", {"gravity": [-10,-9], "density": [7,8], "temperature": [1000,1700]}),
    ("유리 광섬유", {"gravity": [-0.1,0.1], "temperature": [1500,2200], "density": [2,3]}),
    ("실리콘 단결정 성장", {"gravity": [-0.1,0.1], "temperature": [1400,1500], "density": [2,3]}),
    ("SLA 3D프린팅", {"gravity": [-10,-9], "temperature": [280,320], "density": [1,1.5]}),

    # ── Quantum/EM (10 more) ──
    ("양자 터널링", {"gravity": [-0.1,0.1]}),
    ("쿼크 모델", {"gravity": [-0.1,0.1]}),
    ("전자기 유도", {"gravity": [-10,-9]}),
    ("LC 회로 진동", {"gravity": [-0.1,0.1]}),
    ("맥스웰 전자기파", {"gravity": [-0.1,0.1]}),
    ("이상기체 PV=nRT", {"gravity": [-0.1,0.1], "temperature": [200,500]}),
    ("카르노 엔진", {"gravity": [-0.1,0.1], "temperature": [300,600]}),
    ("블랙바디 복사", {"gravity": [-0.1,0.1], "temperature": [1000,6000]}),
    ("열전도 금속", {"gravity": [-10,-9], "temperature": [300,500], "density": [7,8]}),
    ("엔트로피 확산", {"gravity": [-0.1,0.1], "temperature": [280,320]}),

    # ── Fantasy/Historic (9 more) ──
    ("드래곤 날개", {"gravity": [-10,-9], "windX": [5,20]}),
    ("공룡 소행성 충돌", {"gravity": [-10,-9], "temperature": [5000,50000], "seismic": [5,10]}),
    ("타이타닉 침몰", {"gravity": [-10,-9], "viscosity": [0.5,3], "density": [7,8]}),
    ("히로시마 충격파", {"gravity": [-10,-9], "temperature": [5000,100000]}),
    ("체르노빌 낙진", {"gravity": [-10,-9], "temperature": [1000,5000]}),
    ("바이킹 롱십", {"gravity": [-10,-9], "viscosity": [0.5,3], "windX": [3,15]}),
    ("다빈치 비행기계", {"gravity": [-10,-9], "windX": [1,10]}),
    ("라이트 형제 첫 비행", {"gravity": [-10,-9], "windX": [3,15]}),
    ("아르키메데스 유레카", {"gravity": [-10,-9], "density": [1,20], "viscosity": [0.5,3]}),
]

try:
    import urllib.request
    def fetch(url, data=None):
        req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                     headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except: return None
except: pass

def call_gemma(query):
    data = {"model": MODEL, "stream": False, "messages": [
        {"role": "system", "content": SYS_PROMPT},
        {"role": "user", "content": f"{query} 시뮬레이션 해줘"},
    ]}
    resp = fetch(f"{OLLAMA}/api/chat", data)
    if not resp: return None, ""
    content = resp.get("message", {}).get("content", "")
    m = re.search(r'```json\s*([\s\S]*?)```', content)
    if not m: return None, content
    try:
        sim = json.loads(m.group(1))["simulation"]
        return sim, content
    except: return None, content

def score(physics, expect):
    ok, total = 0, 0
    details = []
    for k, (lo, hi) in expect.items():
        v = physics.get(k)
        total += 1
        if v is not None and lo <= float(v) <= hi:
            ok += 1
            details.append(f"{k}={v} ✓")
        else:
            details.append(f"{k}={v} ✗ [{lo},{hi}]")
    pct = int(ok / total * 100) if total else 0
    stars = "★" * round(pct / 20) + "☆" * (5 - round(pct / 20))
    return pct, stars, details

def kanban_ticket(title, prio="medium"):
    r = fetch(f"{KANBAN}/api/teams/{TEAM}/tickets", {"title": title, "priority": prio})
    return r.get("ticket", {}).get("ticket_id") if r and r.get("ok") else None

def kanban_done(tid, artifact):
    if not tid: return
    fetch(f"{KANBAN}/api/tickets/{tid}/claim", {"member_id": "gemma4"})
    fetch(f"{KANBAN}/api/tickets/{tid}/artifacts",
          {"creator_member_id": "gemma4", "title": artifact[:50], "content": artifact, "artifact_type": "result"})
    fetch(f"{KANBAN}/api/tickets/{tid}/status", {"status": "Review"})
    fetch(f"{KANBAN}/api/tickets/{tid}/status", {"status": "Done"})

def main():
    total = len(SCENARIOS)
    passed, failed, reworked = 0, 0, 0
    print(f"=== 순차 벤치마크 {total}회 (90% 미만 자동 재티켓) ===\n")

    for i, (query, expect) in enumerate(SCENARIOS):
        num = i + 1
        for attempt in range(1, 3):
            label = f"{num}" if attempt == 1 else f"{num}-R"
            prio = "medium" if attempt == 1 else "high"

            sys.stdout.write(f"[{label:>5}] {query:<28} ")
            sys.stdout.flush()

            # 칸반 티켓
            tid = kanban_ticket(f"#{label}: {query}", prio)

            # Gemma4
            sim, raw = call_gemma(query)
            if not sim:
                print(f"✗ No JSON")
                kanban_done(tid, f"FAIL: No JSON")
                if attempt == 1:
                    print(f"       ↳ 재티켓")
                    reworked += 1
                    time.sleep(1)
                    continue
                else:
                    failed += 1
                    break

            p = sim.get("physics", {})
            pct, stars, details = score(p, expect)
            pc = p.get("particleCount", "?")
            title = sim.get("title", "?")[:30]

            print(f"{stars} {pct}% | {title} [{pc}p]")
            for d in details:
                if "✗" in d: print(f"       {d}")

            # Typst
            typ_path = os.path.join(DOCS, f"bench-{str(num).zfill(3)}.typ")
            with open(typ_path, "w") as f:
                f.write(f"벤치마크 #{label}: {query}\n{title}\n{stars} {pct}%\nparticles={pc}\n" + "\n".join(details))

            # 칸반 완료
            kanban_done(tid, f"{stars} {pct}% | {title} | {pc}p | {typ_path}")

            if pct >= 90:
                passed += 1
                break
            elif attempt == 1:
                print(f"       ↳ 90% 미만 → 재티켓")
                reworked += 1
                time.sleep(1)
            else:
                failed += 1

        time.sleep(1)

    print(f"\n=== 결과 ===")
    print(f"PASS (≥90%): {passed}/{total}")
    print(f"FAIL: {failed}/{total}")
    print(f"재작업: {reworked}")

if __name__ == "__main__":
    main()
