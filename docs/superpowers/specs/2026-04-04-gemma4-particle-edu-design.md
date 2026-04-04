# Gemma 4 Particle Edu — 설계 문서

**작성일**: 2026-04-04
**프로젝트**: gemma4-particle-edu
**대회**: Kaggle Gemma 4 Good Hackathon
**타겟 트랙**: Future of Education + Ollama Special Tech + Main

---

## 컨셉

**한 줄 요약**: Ollama + Gemma 4로 구동되는 무료 대화형 3D 물리 시뮬레이션 교육 플랫폼

**포지셔닝**: Claude Artifacts 유료 인터랙티브 시뮬레이션의 무료 오픈소스 대항마

### 차별화

| | Claude Artifacts | Gemma 4 Particle Edu |
|---|---|---|
| 비용 | $20/월 (Pro) | 무료 |
| 모델 | 클로즈드 (Claude) | 오픈 (Gemma 4) |
| 시뮬레이션 | 매번 코드 생성 | 전문 물리엔진 내장 (Verlet, 스프링, 재료DB) |
| 물리 정확도 | 일회성 코드 | SI 단위 기반, 실제 물성치 |
| 오프라인 | 불가 | Ollama로 가능 |

---

## 타겟 사용자

- **대학생 / 일반** — 공학 시뮬레이션 수준
- **사용 시나리오**: 자유 대화로 물리 현상 탐구
- 예: "콘크리트 5층 건물에 진도 7 지진", "철 다리의 항복 강도 한계"

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│  Browser (Single Page App)                  │
│                                             │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Chat Panel   │  │  3D Simulation      │  │
│  │              │  │  (Three.js/WebGL)    │  │
│  │  학생 질문    │→│  PhysicsEngine       │  │
│  │  AI 해설     │  │  ParticleSystem      │  │
│  │  파라미터 표시 │  │  NeonRenderer        │  │
│  └──────────────┘  └─────────────────────┘  │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────┴────────────────────────┐
│  Express.js Server                          │
│  - /api/chat → Ollama (localhost:11434)     │
│  - /api/cards (기존 CRUD)                    │
│  - Static file serving                      │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────┴────────────────────────┐
│  Ollama (Local)                             │
│  - gemma4:latest                            │
│  - System prompt: 물리 교육 + JSON 출력     │
└─────────────────────────────────────────────┘
```

---

## Gemma 4 역할 (3가지)

### 1. 자연어 → 시뮬레이션 파라미터
- 입력: "철로 만든 다리에 지진이 오면?"
- 출력: `{ prompt: "bridge", physics: { density: 7.8, seismic: 6, ... } }` JSON

### 2. 결과 해설
- 시뮬레이션 결과를 보고 물리적 원인 설명
- "항복 강도를 초과해서 구조가 붕괴했습니다. 철의 항복 강도는 250 MPa이지만..."

### 3. 후속 질문 유도
- 탐구 질문 제안: "기초 깊이를 늘리면 어떻게 될까요?"
- 학습 흐름 유지

---

## 핵심 플로우

```
1. 학생: "콘크리트 5층 건물에 진도 7 지진을 시뮬레이션해줘"
2. → Gemma 4: JSON 파라미터 생성 + 사전 설명
3. → 물리엔진: 시뮬레이션 실행, 3D 렌더링
4. → Gemma 4: 결과 해설 + 후속 질문 제안
5. 학생: "내진 설계를 적용하면?"
6. → 반복
```

---

## 기존 코드 재사용 (u2dia_particlemodel)

| 파일 | 재사용 | 변경사항 |
|------|--------|---------|
| PhysicsEngine.js | 100% | 없음 |
| ParticleSystem.js | 100% | 없음 |
| NeonRenderer.js | 100% | 없음 |
| ArchitectureGenerator.js | 100% | 없음 |
| Materials.js | 100% | 없음 |
| XRController.js | 100% | 없음 |
| i18n.js | 100% | 없음 |
| SimulationManager.js | 70% | 채팅을 Gemma 4 연동으로 교체 |
| app.js | 60% | Chat-First 레이아웃으로 UI 변경 |
| index.html | 50% | 좌측 채팅 + 우측 3D 레이아웃 |
| css/style.css | 70% | 채팅 UI 스타일 추가 |
| server.js | 80% | /api/chat Ollama 프록시 추가 |

---

## 신규 구현

### 1. GemmaChat.js
- Ollama API 통신 (`POST /api/generate`)
- 스트리밍 응답 처리
- JSON 파라미터 파싱 (응답에서 시뮬레이션 파라미터 추출)
- 대화 히스토리 관리

### 2. Chat UI (index.html 내)
- 좌측 채팅 패널
- 마크다운 렌더링
- 스트리밍 타이핑 효과
- 파라미터 변경 시 하이라이트 표시

### 3. System Prompt
- 물리 교육 전문가 페르소나
- 시뮬레이션 파라미터 JSON 스키마 정의
- SI 단위 기반 설명 규칙
- 한국어/영어 지원

### 4. server.js /api/chat
- Ollama 프록시 엔드포인트
- 스트리밍 SSE 지원
- Ollama 연결 상태 체크

---

## 기술 스택

| 기술 | 용도 |
|------|------|
| Gemma 4 (Ollama) | 자연어 이해 + 교육 해설 |
| Three.js | WebGL 3D 렌더링 |
| Express.js | 서버 + Ollama 프록시 |
| Vercel | 배포 (라이브 데모) |
| Playwright | E2E 테스트 |

---

## 배포 전략

- **라이브 데모**: Vercel 배포 (Ollama 없이도 기본 시뮬레이션 작동)
- **풀 기능**: 로컬에서 Ollama + Gemma 4 실행 시 AI 채팅 활성화
- **Fallback**: Ollama 미연결 시 기존 키워드 기반 NLP 유지

---

## 영상 스토리라인 (3분)

1. **문제 제기** (30초) — "물리 교육은 왜 아직도 교과서와 수식뿐인가?"
2. **솔루션 소개** (30초) — "Gemma 4 + 3D 물리엔진 = 대화형 물리 실험실"
3. **라이브 데모** (90초) — 실제 시나리오 3개 시연
4. **임팩트** (30초) — "무료, 오프라인, 오픈소스. 누구나 접근 가능한 물리 교육"
