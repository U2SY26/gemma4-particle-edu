
> **[필수] 모든 작업은 칸반보드를 통해야 합니다. 예외 없음.**
>
> ```
> 1. kanban_team_create → 팀 생성
> 2. kanban_member_spawn → 전문 에이전트 스폰 (역할 지정 필수)
> 3. kanban_ticket_create → 티켓 생성
> 4. kanban_ticket_claim → 에이전트 클레임 (역할-티켓 매칭)
> 5. kanban_ticket_progress → progress_note 등록 (필수)
> 6. 작업 수행
> 7. kanban_artifact_create → 산출물 등록 (필수)
> 8. kanban_ticket_status → Review 전환
> 9. Supervisor QA 자동 검수 → Done 또는 rework
> ```
>
> **위반 시**: InProgress 전환 차단(agent_required), Review 차단(artifact_required), Done 차단(review_required)
> **칸반 오프라인 시**: curl REST API로 재시도 3회. 오프라인 핑계로 규칙 무시 = 헌법 위반.

### progress_note 업데이트 조건 (v4.1 — 구체적 실행 규칙)

> **에이전트는 아래 5가지 시점에 반드시 progress_note를 업데이트한다.**

| 시점 | 예시 |
|------|------|
| **1. 클레임 직후** | "분석 시작. 파일 3개 확인 예정" |
| **2. 파일 읽기/분석 완료 시** | "코드 분석 완료. 수정 필요 3곳 확인" |
| **3. 코드 수정 시작 시** | "server.py 수정 시작" |
| **4. 코드 수정 완료 시** | "수정 완료. 테스트 진행 중" |
| **5. Review 전환 직전** | "산출물 등록 완료. Review 전환" |

**업데이트 방법 (둘 중 택 1):**
```
# MCP
kanban_ticket_progress(ticket_id, note="수정 완료. 테스트 진행 중")

# REST API
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/progress   -H "Content-Type: application/json"   -d '{"note":"수정 완료. 테스트 진행 중"}'
```

**미이행 시:**
- Supervisor 순회 점검 (5분마다)에서 경고 발송
- 경고 3회 누적 → 자동 unclaim (Backlog 복귀)




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

## 전문 에이전트 운영 규정 (v4.1)

> 모든 에이전트는 전문 역할이 지정되며, 역할 범위 내에서만 작업한다.

### 등록 전문가 — Gemma 파티클 교육

| 역할 | 전문 분야 | 클레임 가능 티켓 |
|------|----------|----------------|
| ai-expert | AI ��델 전문가 | Gemma, 파인튜닝 |
| physics-expert | 입자물리 전문가 | 시뮬레이션, 교육 콘텐츠 |
| frontend-expert | UI 전문가 | 시각화, 인터랙티브 |
| data-expert | 데이터 전문가 | Kaggle, 데이터셋 |

### 규칙
1. **역할 밖 작업 금지** — 전문 분야 외 티켓 클레임 불가
2. **범위 밖 작업 필요 시** → supervisor 호출 (칸반 메시지)
3. **에이전트 간 회의** → supervisor 경유, 칸반에 기록
4. **티켓 클레임 후 progress_note 필수**
5. **산출물 없이 Review 전환 불가**
6. **재작업 3회 초과 → Blocked 에스컬레���션**
7. **무활동 30분 → 자동 unclaim**

### 칸반 오프라인 대응 (v4.1)
- MCP 실패 시 curl REST API로 재시도 (3회, 10초 간격)
- 완전 오프라인 시 로컬 기록 후 복구 시 일괄 등록
- "오프라인이니 규칙 무시" = 헌법 위반

### REST API 치트시트 (MCP 대체용)

```bash
# 팀 생성
curl -X POST http://localhost:5555/api/teams -H "Content-Type: application/json" -d '{"name":"팀명","project_group":"PG"}'

# 에이전트 스폰
curl -X POST http://localhost:5555/api/teams/{team_id}/members -H "Content-Type: application/json" -d '{"role":"frontend","display_name":"Agent Name"}'

# 티켓 생성
curl -X POST http://localhost:5555/api/teams/{team_id}/tickets -H "Content-Type: application/json" -d '{"title":"제목","priority":"medium"}'

# 티켓 클레임
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/claim -H "Content-Type: application/json" -d '{"member_id":"agent-xxx"}'

# 상태 변경 ★
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/status -H "Content-Type: application/json" -d '{"status":"InProgress"}'

# progress_note 업데이트 ★
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/progress -H "Content-Type: application/json" -d '{"note":"진행 중"}'

# 산출물 등록 ★
curl -X POST http://localhost:5555/api/tickets/{ticket_id}/artifacts -H "Content-Type: application/json" -d '{"creator_member_id":"agent-xxx","title":"결과","content":"내용","artifact_type":"code"}'

# 팀 아카이브
curl -X POST http://localhost:5555/api/teams/{team_id}/archive -H "Content-Type: application/json"
```

