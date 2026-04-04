# Gemma 4 Particle Edu — 세분화 구현 계획

**작성일**: 2026-04-04
**방식**: 최대 병렬화 (모듈 1개 = 에이전트 1개)
**마감**: 2026-05-18

---

## 의존성 그래프

```
Phase 0: Scaffolding + Interface Contracts (메인 에이전트)
    │
    ├─→ Phase 1 (6 병렬 에이전트)
    │   ├── 1A: PhysicsEngine.js
    │   ├── 1B: Materials.js
    │   ├── 1C: NeonRenderer.js
    │   ├── 1D: server.js (/api/chat)
    │   ├── 1E: index.html + style.css
    │   └── 1F: i18n.js
    │
    ├─→ Phase 2 (3 병렬 에이전트)
    │   ├── 2A: ParticleSystem.js      ← 1A + 1B
    │   ├── 2B: GemmaChat.js           ← 1D
    │   └── 2C: XRController.js        ← 1C
    │
    ├─→ Phase 3 (2 병렬 에이전트)
    │   ├── 3A: ArchitectureGenerator.js ← 2A
    │   └── 3B: SimulationManager.js + app.js 통합 ← 1A,1B,1C,1E,1F,2A,2B,2C,3A
    │
    └─→ Phase 4 (2 병렬 에이전트)
        ├── 4A: E2E 테스트 (Playwright)
        └── 4B: 배포 + 제출물 준비
```

---

## Phase 0: 스캐폴딩 + 인터페이스 계약

**실행자**: 메인 에이전트
**선행 조건**: 없음

### 산출물

| ID | 산출물 | 파일 | 설명 |
|----|--------|------|------|
| 0-1 | 디렉토리 구조 | `js/`, `css/`, `test/unit/`, `test/e2e/`, `public/` | 프로젝트 골격 |
| 0-2 | 의존성 설정 | `package.json` | express, three, vitest, playwright, @types |
| 0-3 | 인터페이스 계약서 | `js/interfaces.js` | 전 모듈 클래스 시그니처 JSDoc 정의 |
| 0-4 | 테스트 설정 | `vitest.config.js` | 단위 테스트 프레임워크 |
| 0-5 | 서버 골격 | `server.js` | Express 정적 파일 서빙 (라우트 stub) |
| 0-6 | HTML 골격 | `index.html` | 빈 Chat-First 레이아웃 뼈대 |
| 0-7 | Playwright 설정 | `playwright.config.js` | E2E 테스트 설정 |

### 인터페이스 계약 정의

```javascript
// PhysicsEngine
class PhysicsEngine {
  constructor(config: { gravity, damping, dt })
  addParticle(particle) → id
  removeParticle(id)
  getParticles() → Particle[]
  setGravity(value)
  setDamping(value)
  integrate(dt) // Verlet 적분 1스텝
  applyConstraints()
  reset()
}

// Materials
class Materials {
  static getMaterial(name) → { density, yieldStrength, color, thermalExpansion }
  static getAllMaterials() → Map<string, Material>
  static getCategories() → string[]
}

// ParticleSystem
class ParticleSystem {
  constructor(physicsEngine, materials)
  spawn(config: { count, material, position, velocity }) → Particle[]
  update(dt)
  reset()
  getStats() → { count, avgVelocity, maxStress }
  on(event: 'collision' | 'yield' | 'break', callback)
}

// NeonRenderer
class NeonRenderer {
  constructor(canvas, options: { bloom, antialias })
  init() → Promise<void>
  render(particles, structures)
  resize(width, height)
  setBloom(intensity)
  setCamera(position, target)
  getCamera() → { position, target }
  dispose()
}

// ArchitectureGenerator
class ArchitectureGenerator {
  constructor(particleSystem)
  generate(type: string, params: object) → Structure
  getTypes() → string[] // bridge, building, tower, wall, ...
  static getDefaultParams(type) → object
}

// SimulationManager
class SimulationManager {
  constructor(physicsEngine, particleSystem, archGenerator, renderer)
  loadPreset(name) → SimConfig
  applyParams(json: object)
  start()
  stop()
  reset()
  isRunning() → boolean
  getState() → { time, particleCount, fps }
  on(event: 'start' | 'stop' | 'reset' | 'frame', callback)
}

// GemmaChat
class GemmaChat {
  constructor(apiEndpoint)
  send(message, history) → ReadableStream
  parseSimulationParams(response) → object | null
  getHistory() → Message[]
  clearHistory()
  checkConnection() → Promise<boolean>
  on(event: 'stream' | 'params' | 'error' | 'complete', callback)
}

// XRController
class XRController {
  constructor(renderer)
  isSupported() → boolean
  enterVR() → Promise<void>
  exitVR()
  on(event: 'select' | 'squeeze' | 'enter' | 'exit', callback)
}

// i18n
class I18n {
  constructor(defaultLocale: 'ko' | 'en')
  t(key, params?) → string
  setLocale(locale)
  getLocale() → string
  getAvailableLocales() → string[]
}
```

### 완료 기준
- [ ] 모든 디렉토리 생성됨
- [ ] `npm install` 성공
- [ ] `npx vitest --run` 실행 가능 (0 tests)
- [ ] interfaces.js에 모든 클래스 JSDoc 정의됨

---

## Phase 1: 독립 모듈 (6 병렬 에이전트)

### Agent 1A: PhysicsEngine.js

**파일**: `js/PhysicsEngine.js`, `test/unit/PhysicsEngine.test.js`
**선행**: Phase 0 (interfaces.js)
**의존성**: 없음

**구현 범위**:
- Verlet 적분 (위치, 이전위치, 가속도)
- 스프링-댐퍼 연결 (구조적 결합)
- 충돌 감지 (파티클 간 거리 기반)
- 중력, 감쇠, 바람, 지진(사인파) 외력
- 마찰, 반발 계수
- 온도에 의한 물성치 변화 반영

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/PhysicsEngine.js` | Verlet 적분 물리엔진 클래스 |
| `test/unit/PhysicsEngine.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- 자유낙하: 1초 후 위치 ≈ -4.9m (오차 5% 이내)
- 스프링: 훅의 법칙 F = -kx 검증
- 감쇠: 10스텝 후 속도 감소 확인
- 지진 외력: 사인파 진동 적용 확인
- 충돌: 두 파티클 반발 확인
- 온도 → 재료 강도 변화 반영

**완료 기준**:
- [ ] interfaces.js 시그니처와 100% 일치
- [ ] 모든 단위 테스트 통과
- [ ] SI 단위 기반 (m, kg, s, K, Pa)

---

### Agent 1B: Materials.js

**파일**: `js/Materials.js`, `test/unit/Materials.test.js`
**선행**: Phase 0
**의존성**: 없음

**구현 범위**:
- 재료 데이터베이스 (최소 10종): 철, 콘크리트, 알루미늄, 구리, 나무, 유리, 고무, 티타늄, 탄소강, 스테인리스강
- 각 재료 물성치: density(kg/m³), yieldStrength(Pa), elasticModulus(Pa), thermalExpansion(1/K), color(hex), category
- 온도별 물성치 보정 함수
- 카테고리 분류: metal, ceramic, polymer, composite

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/Materials.js` | 정적 재료 데이터베이스 클래스 |
| `test/unit/Materials.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- getMaterial('iron') → density 7874 kg/m³
- getAllMaterials() → 10종 이상
- getCategories() → ['metal', 'ceramic', 'polymer', 'composite']
- 온도 보정: 고온에서 yieldStrength 감소 확인
- 존재하지 않는 재료 → 예외 또는 null

**완료 기준**:
- [ ] 10종 이상 재료, 실제 SI 물성치
- [ ] 모든 테스트 통과

---

### Agent 1C: NeonRenderer.js

**파일**: `js/NeonRenderer.js`, `test/unit/NeonRenderer.test.js`
**선행**: Phase 0
**의존성**: three.js (CDN 또는 npm)

**구현 범위**:
- Three.js Scene, Camera, WebGLRenderer 초기화
- UnrealBloomPass 후처리 (네온 글로우 효과)
- 파티클 → InstancedMesh 렌더링 (대량 파티클 성능)
- 구조물(스프링 연결) → LineSegments 렌더링
- 카메라 OrbitControls
- 리사이즈 대응
- 응력 기반 색상 매핑 (안전=초록 → 위험=빨강)

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/NeonRenderer.js` | Three.js WebGL 블룸 렌더러 |
| `test/unit/NeonRenderer.test.js` | 단위 테스트 (mock canvas) |

**단위 테스트 항목**:
- init(): renderer, scene, camera 생성 확인
- render(): drawcall 호출 확인 (mock)
- resize(): 카메라 aspect, renderer size 갱신
- setBloom(): bloomPass strength 변경
- dispose(): 리소스 해제 확인

**완료 기준**:
- [ ] InstancedMesh 기반 대량 렌더링
- [ ] 블룸 후처리 적용
- [ ] 모든 테스트 통과

---

### Agent 1D: server.js (Express + Ollama 프록시)

**파일**: `server.js`, `test/unit/server.test.js`
**선행**: Phase 0
**의존성**: express

**구현 범위**:
- Express 정적 파일 서빙 (/, /js, /css)
- `POST /api/chat` — Ollama 프록시 (스트리밍 SSE)
- `GET /api/status` — Ollama 연결 상태 + 모델 확인
- CORS 헤더
- Ollama 미연결 시 503 응답
- 포트 설정 (env PORT || 3000)

**산출물**:
| 파일 | 설명 |
|------|------|
| `server.js` | Express 서버 (완성) |
| `test/unit/server.test.js` | API 엔드포인트 테스트 |

**단위 테스트 항목**:
- GET / → 200 + HTML
- POST /api/chat (Ollama 켜짐) → 200 + SSE stream
- POST /api/chat (Ollama 꺼짐) → 503
- GET /api/status → { ollama: true/false, model: "gemma4" }

**완료 기준**:
- [ ] SSE 스트리밍 정상 동작
- [ ] Ollama 연결/미연결 양쪽 핸들링
- [ ] 모든 테스트 통과

---

### Agent 1E: index.html + style.css (Chat-First 레이아웃)

**파일**: `index.html`, `css/style.css`
**선행**: Phase 0
**의존성**: 없음 (순수 HTML/CSS)

**구현 범위**:
- 반응형 Chat-First 레이아웃
  - 데스크탑: 좌측 채팅(35%) + 우측 3D(65%)
  - 모바일: 전체 탭 전환
- 채팅 UI: 메시지 목록, 입력창, 전송 버튼, 스트리밍 표시
- 3D 뷰포트: canvas 컨테이너, 오버레이 컨트롤
- 상태 바: Ollama 연결 상태, FPS, 파티클 수
- 다크 테마 (네온 미학과 일치)
- 시뮬레이션 파라미터 패널 (접이식)

**산출물**:
| 파일 | 설명 |
|------|------|
| `index.html` | Chat-First SPA 레이아웃 |
| `css/style.css` | 다크 네온 테마 스타일 |

**단위 테스트**: 없음 (UI는 E2E에서 검증)

**완료 기준**:
- [ ] 데스크탑/모바일 반응형 동작
- [ ] 채팅 메시지 스크롤, 입력창 동작
- [ ] 3D canvas 영역 정상 표시
- [ ] 다크 네온 테마 적용

---

### Agent 1F: i18n.js

**파일**: `js/i18n.js`, `js/locales/ko.json`, `js/locales/en.json`, `test/unit/i18n.test.js`
**선행**: Phase 0
**의존성**: 없음

**구현 범위**:
- 경량 i18n 클래스 (외부 라이브러리 없음)
- 한국어/영어 2개 로케일
- 키 기반 번역: `t('chat.placeholder')` → "질문을 입력하세요"
- 매개변수 보간: `t('sim.particles', { count: 500 })` → "파티클 500개"
- 로케일 전환 시 이벤트 발행
- UI 라벨, 상태 메시지, 에러 메시지 전체 번역 키

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/i18n.js` | i18n 클래스 |
| `js/locales/ko.json` | 한국어 번역 |
| `js/locales/en.json` | 영어 번역 |
| `test/unit/i18n.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- t('key') → 올바른 번역 반환
- t('key', params) → 매개변수 보간
- setLocale('en') → 영어 전환
- 없는 키 → 키 자체 반환 (폴백)

**완료 기준**:
- [ ] ko/en 전환 동작
- [ ] 보간 동작
- [ ] 모든 테스트 통과

---

## Phase 2: 의존 모듈 (3 병렬 에이전트)

### Agent 2A: ParticleSystem.js

**파일**: `js/ParticleSystem.js`, `test/unit/ParticleSystem.test.js`
**선행**: Agent 1A (PhysicsEngine), Agent 1B (Materials)
**의존**: PhysicsEngine, Materials

**구현 범위**:
- 파티클 생성/소멸 라이프사이클
- 재료별 파티클 속성 자동 설정 (Materials 연동)
- 스프링 연결 생성/관리 (구조적 결합)
- 응력 계산 (힘/면적) → 항복 강도 초과 시 'yield' 이벤트
- 파괴 시 스프링 제거 → 'break' 이벤트
- 통계 집계 (파티클 수, 평균 속도, 최대 응력)

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/ParticleSystem.js` | 파티클 라이프사이클 관리 |
| `test/unit/ParticleSystem.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- spawn() → 파티클 생성, PhysicsEngine에 등록
- update() → 물리 스텝 실행
- 응력 초과 → 'yield' 이벤트 발행
- 파괴 → 스프링 제거 + 'break' 이벤트
- reset() → 전체 초기화
- getStats() → 올바른 통계

**완료 기준**:
- [ ] PhysicsEngine/Materials와 정상 연동
- [ ] 이벤트 시스템 동작
- [ ] 모든 테스트 통과

---

### Agent 2B: GemmaChat.js

**파일**: `js/GemmaChat.js`, `test/unit/GemmaChat.test.js`
**선행**: Agent 1D (server.js)
**의존**: server.js /api/chat

**구현 범위**:
- `/api/chat` 엔드포인트로 스트리밍 요청
- SSE 응답 파싱 (줄 단위 JSON)
- 시스템 프롬프트 관리 (물리 교육 전문가 + JSON 스키마)
- 응답에서 시뮬레이션 파라미터 JSON 추출 (````json ... ````)
- 대화 히스토리 관리 (role: system/user/assistant)
- 연결 상태 체크 (/api/status)
- 폴백: Ollama 미연결 시 키워드 기반 NLP

**시스템 프롬프트 포함 내용**:
- 물리 교육 전문가 페르소나
- 시뮬레이션 파라미터 JSON 스키마 + 범위
- 응답 형식: 자연어 설명 + ```json 블록
- SI 단위 설명 규칙
- 후속 질문 유도 지침

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/GemmaChat.js` | Ollama 채팅 클라이언트 |
| `test/unit/GemmaChat.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- send() → 스트리밍 응답 수신
- parseSimulationParams() → JSON 정상 추출
- parseSimulationParams() → JSON 없는 응답 → null
- checkConnection() → true/false
- 폴백 NLP: "다리" → { prompt: "bridge" }
- 히스토리 관리: 추가/조회/초기화

**완료 기준**:
- [ ] SSE 스트리밍 파싱 정상
- [ ] JSON 파라미터 추출 정상
- [ ] 폴백 NLP 동작
- [ ] 모든 테스트 통과

---

### Agent 2C: XRController.js

**파일**: `js/XRController.js`, `test/unit/XRController.test.js`
**선행**: Agent 1C (NeonRenderer)
**의존**: NeonRenderer (WebGL renderer)

**구현 범위**:
- WebXR 지원 여부 감지
- VR 세션 진입/종료
- XR 참조 공간(reference space) 설정
- 컨트롤러 입력 매핑 (select, squeeze)
- XR 프레임 루프 → NeonRenderer.render() 연동
- 미지원 환경 graceful 처리

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/XRController.js` | WebXR 컨트롤러 |
| `test/unit/XRController.test.js` | 단위 테스트 (mock XR) |

**단위 테스트 항목**:
- isSupported() → navigator.xr 기반 true/false
- enterVR() → 세션 시작 (mock)
- exitVR() → 세션 종료
- 이벤트 핸들러 등록/해제

**완료 기준**:
- [ ] NeonRenderer와 정상 연동
- [ ] 미지원 환경 에러 없음
- [ ] 모든 테스트 통과

---

## Phase 3: 상위 모듈 + 통합 (2 병렬 에이전트)

### Agent 3A: ArchitectureGenerator.js

**파일**: `js/ArchitectureGenerator.js`, `test/unit/ArchitectureGenerator.test.js`
**선행**: Agent 2A (ParticleSystem)
**의존**: ParticleSystem

**구현 범위**:
- 프로시저럴 구조물 생성기
- 지원 구조물 타입:
  - `bridge` — 트러스 다리 (상현재, 하현재, 사재)
  - `building` — N층 건물 (기둥, 보, 바닥)
  - `tower` — 타워/탑
  - `wall` — 벽체
  - `arch` — 아치 구조
- 각 타입별 기본 파라미터 + 커스텀 파라미터
- 파티클 + 스프링 연결로 구조물 구성
- 기초(foundation) 파티클 고정

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/ArchitectureGenerator.js` | 프로시저럴 구조물 생성기 |
| `test/unit/ArchitectureGenerator.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- generate('bridge', params) → 파티클 + 스프링 생성
- generate('building', { floors: 5 }) → 5층 구조물
- getTypes() → 5종 이상
- getDefaultParams('bridge') → 기본 파라미터
- 기초 파티클 고정 확인

**완료 기준**:
- [ ] 5종 이상 구조물 타입
- [ ] ParticleSystem과 정상 연동
- [ ] 모든 테스트 통과

---

### Agent 3B: SimulationManager.js + app.js 통합

**파일**: `js/SimulationManager.js`, `js/app.js`, `test/unit/SimulationManager.test.js`
**선행**: Phase 1 전체 + Agent 2A, 2B, 2C, 3A
**의존**: 전체 모듈

**구현 범위**:

**SimulationManager.js**:
- 프리셋 시뮬레이션 관리 (earthquake, bridge-test, free-fall 등)
- GemmaChat → JSON 파라미터 → 시뮬레이션 적용 파이프라인
- 시뮬레이션 start/stop/reset 생명주기
- requestAnimationFrame 루프 관리
- 상태 추적 (시간, FPS, 파티클 수)

**app.js (통합)**:
- 모든 모듈 인스턴스화 + 연결
- 채팅 UI ↔ GemmaChat 바인딩
- GemmaChat 'params' 이벤트 → SimulationManager.applyParams()
- 3D canvas ↔ NeonRenderer 바인딩
- 상태 바 업데이트 (FPS, 파티클 수, Ollama 상태)
- i18n 로케일 전환 UI
- XR 진입 버튼 연결
- 파라미터 패널 ↔ SimulationManager 양방향 바인딩

**산출물**:
| 파일 | 설명 |
|------|------|
| `js/SimulationManager.js` | 시뮬레이션 관리자 |
| `js/app.js` | 메인 애플리케이션 진입점 |
| `test/unit/SimulationManager.test.js` | 단위 테스트 |

**단위 테스트 항목**:
- loadPreset('earthquake') → 올바른 파라미터 적용
- applyParams(json) → PhysicsEngine + ParticleSystem 반영
- start()/stop()/reset() 생명주기
- isRunning() 상태 추적
- getState() → 올바른 통계

**완료 기준**:
- [ ] 전체 모듈 통합 동작
- [ ] 채팅 → 시뮬레이션 파이프라인 동작
- [ ] 프리셋 시뮬레이션 3개 이상 동작
- [ ] 모든 테스트 통과

---

## Phase 4: 검증 + 배포 (2 병렬 에이전트)

### Agent 4A: E2E 테스트 (Playwright)

**파일**: `test/e2e/*.spec.js`
**선행**: Phase 3 완료
**의존**: 전체 애플리케이션

**구현 범위**:
- 시나리오 1: 페이지 로드 → 채팅 입력 → 시뮬레이션 실행 → 3D 렌더링 확인
- 시나리오 2: 프리셋 선택 → 파라미터 변경 → 시뮬레이션 재실행
- 시나리오 3: Ollama 미연결 → 폴백 NLP → 기본 시뮬레이션
- 시나리오 4: 언어 전환 (ko ↔ en)
- 시나리오 5: 반응형 레이아웃 (데스크탑 ↔ 모바일)

**산출물**:
| 파일 | 설명 |
|------|------|
| `test/e2e/chat-simulation.spec.js` | 채팅 → 시뮬레이션 E2E |
| `test/e2e/preset.spec.js` | 프리셋 시뮬레이션 E2E |
| `test/e2e/fallback.spec.js` | 폴백 시나리오 E2E |
| `test/e2e/i18n.spec.js` | 다국어 E2E |
| `test/e2e/responsive.spec.js` | 반응형 E2E |

**완료 기준**:
- [ ] 5개 시나리오 전부 통과
- [ ] CI에서 headless 실행 가능

---

### Agent 4B: 배포 + 제출물 준비

**선행**: Phase 3 완료
**의존**: 전체 애플리케이션

**구현 범위**:
- Vercel 배포 설정
- Ollama 미연결 시 데모 모드 (프리셋만 동작)
- README.md 업데이트 (설치/실행 가이드)

**산출물**:
| 파일 | 설명 |
|------|------|
| `vercel.json` | Vercel 배포 설정 |
| `README.md` | 설치/실행/데모 가이드 |
| 라이브 URL | Vercel 배포 완료 |

**제출물 준비 (수동)**:
| 항목 | 상태 | 담당 |
|------|------|------|
| Kaggle Writeup (1,500단어) | Phase 4 후 작성 | 사용자 + AI |
| YouTube 영상 (3분) | Phase 4 후 촬영 | 사용자 |
| GitHub 공개 저장소 | Phase 0부터 진행 | 자동 |
| 라이브 데모 URL | Agent 4B | 자동 |
| 커버 이미지 | Phase 4 후 | 사용자 |

**완료 기준**:
- [ ] Vercel 배포 성공
- [ ] 데모 모드 동작 확인
- [ ] README 완성

---

## 에이전트 실행 요약

| Phase | 에이전트 | 모듈 | 병렬 | 선행 |
|-------|----------|------|------|------|
| 0 | 메인 | 스캐폴딩 + 인터페이스 | - | - |
| 1 | 1A | PhysicsEngine | ✅ | P0 |
| 1 | 1B | Materials | ✅ | P0 |
| 1 | 1C | NeonRenderer | ✅ | P0 |
| 1 | 1D | server.js | ✅ | P0 |
| 1 | 1E | index.html + CSS | ✅ | P0 |
| 1 | 1F | i18n | ✅ | P0 |
| 2 | 2A | ParticleSystem | ✅ | 1A, 1B |
| 2 | 2B | GemmaChat | ✅ | 1D |
| 2 | 2C | XRController | ✅ | 1C |
| 3 | 3A | ArchitectureGenerator | ✅ | 2A |
| 3 | 3B | SimManager + app.js | ✅ | All |
| 4 | 4A | E2E 테스트 | ✅ | P3 |
| 4 | 4B | 배포 + 제출물 | ✅ | P3 |

**총 에이전트**: 14 (메인 1 + 서브 13)
**총 산출물 파일**: ~25개
**총 테스트 파일**: ~13개 (단위 8 + E2E 5)
