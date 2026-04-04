---
name: gemma4-edu
description: gemma4-particle-edu 프로젝트의 핵심 워크플로우. Ollama + Gemma 4 + Three.js 3D 물리 시뮬레이션 교육 플랫폼.
---

# Gemma 4 Particle Edu 워크플로우

## 프로젝트 컨텍스트
- **대회**: Kaggle Gemma 4 Good Hackathon (마감: 2026-05-18)
- **타겟 트랙**: Future of Education + Ollama Special Tech + Main
- **컨셉**: Ollama + Gemma 4 기반 무료 대화형 3D 물리 시뮬레이션 교육 플랫폼
- **포지셔닝**: Claude Artifacts 유료 인터랙티브 시뮬레이션의 무료 오픈소스 대항마

## 아키텍처
- **프론트엔드**: Vanilla JS SPA, Three.js/WebGL 3D 렌더링
- **백엔드**: Express.js + Ollama 프록시
- **AI**: Gemma 4 (Ollama 로컬 실행)
- **물리엔진**: Verlet 적분, 스프링-댐퍼, SI 단위 물성치
- **레이아웃**: Chat-First (좌측 채팅 + 우측 3D 시뮬레이션)

## 핵심 모듈

### 기존 (u2dia_particlemodel에서 복사)
- `js/PhysicsEngine.js` — Verlet 적분 물리엔진
- `js/ParticleSystem.js` — 파티클 라이프사이클
- `js/NeonRenderer.js` — Three.js WebGL 블룸 렌더러
- `js/ArchitectureGenerator.js` — 프로시저럴 구조물 생성
- `js/Materials.js` — SI 단위 물질 데이터베이스
- `js/SimulationManager.js` — 프리셋 시뮬레이션 관리
- `js/XRController.js` — WebXR 지원
- `js/i18n.js` — 다국어 (한/영)

### 신규 구현
- `js/GemmaChat.js` — Ollama API 통신, 스트리밍, JSON 파라미터 파싱
- `index.html` — Chat-First 레이아웃 (좌측 채팅 + 우측 3D)
- `server.js /api/chat` — Ollama 프록시 엔드포인트

## Gemma 4 역할
1. **자연어 → 시뮬레이션**: 학생 질문 → JSON 물리 파라미터 생성
2. **결과 해설**: 시뮬레이션 결과의 물리적 원인 설명
3. **후속 질문 유도**: 탐구 질문 제안으로 학습 흐름 유지

## 작업 규칙
1. 모든 답변은 한국어로 작성
2. 물리엔진 수정 시 기존 시뮬레이션 결과 검증
3. Three.js 렌더링 변경 시 WebGL 호환성 확인
4. Ollama API 호출 시 스트리밍 SSE 사용
5. Ollama 미연결 시 기존 키워드 NLP 폴백 유지

## 배포
- **라이브 데모**: Vercel (Ollama 없이 기본 시뮬레이션)
- **풀 기능**: 로컬 Ollama + Gemma 4
- **저장소**: https://github.com/U2SY26/gemma4-particle-edu

## 제출물 체크리스트
- [ ] Kaggle Writeup (1,500단어 이내)
- [ ] YouTube 영상 (3분 이내)
- [ ] GitHub 공개 저장소
- [ ] 라이브 데모 URL
- [ ] 커버 이미지
