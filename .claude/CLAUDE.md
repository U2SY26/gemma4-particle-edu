# gemma4-particle-edu — 에이전트 가이드

## 프로젝트 개요
Kaggle Gemma 4 Good Hackathon 제출용 프로젝트.
Ollama + Gemma 4 기반 무료 대화형 3D 물리 시뮬레이션 교육 플랫폼.
Claude Artifacts 유료 인터랙티브 시뮬레이션의 무료 오픈소스 대항마.

## 대회 정보
- **대회**: Kaggle Gemma 4 Good Hackathon
- **마감**: 2026-05-18 (UTC 23:59)
- **타겟 트랙**: Future of Education + Ollama Special Tech + Main
- **상금**: $200,000 총상금

## 기술 스택
JavaScript, Express.js, Three.js, WebGL, Ollama, Gemma 4

## 아키텍처
- Chat-First 레이아웃 (좌측 채팅 + 우측 3D 시뮬레이션)
- Express.js 서버 + Ollama 프록시 (/api/chat)
- Verlet 적분 물리엔진 (SI 단위)
- Three.js WebGL 블룸 렌더러

## 규칙
1. 모든 답변은 한국어로 작성
2. 물리엔진 수정 시 기존 시뮬레이션 결과 검증
3. Three.js 렌더링 변경 시 WebGL 호환성 확인
4. Ollama API 호출 시 스트리밍 SSE 사용
5. Ollama 미연결 시 기존 키워드 NLP 폴백 유지

## 주요 문서
- `docs/competition-overview.md` — 대회 개요 (트랙, 상금, 제출물, 평가 기준)
- `docs/superpowers/specs/2026-04-04-gemma4-particle-edu-design.md` — 설계 문서
- `.claude/skills/gemma4-edu.md` — 프로젝트 워크플로우 스킬
- `.claude/skills/ollama-integration.md` — Ollama 연동 가이드 스킬

## 저장소
- **GitHub**: https://github.com/U2SY26/gemma4-particle-edu
- **원본**: https://github.com/U2SY26/3d_particle_simulator (u2dia_particlemodel)
