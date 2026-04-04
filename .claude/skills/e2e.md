---
name: e2e
description: Playwright E2E 테스트 실행 및 작성. /e2e로 즉시 테스트 실행, 실패 시 자동 디버깅.
user_invocable: true
---

# E2E 테스트 워크플로우

## 빠른 실행
`/e2e` 단독 호출 시 전체 E2E 테스트를 실행하고 결과를 보고합니다.

## 사용법
- `/e2e` — 전체 E2E 테스트 실행
- `/e2e <파일명>` — 특정 테스트 파일만 실행 (예: `/e2e chat-simulation`)
- `/e2e write <시나리오>` — 새 E2E 테스트 작성

## 실행 절차

### 1. 서버 확인
```bash
# 서버가 실행 중인지 확인
curl -s http://localhost:3000/api/status || node server.js &
```

### 2. 테스트 실행
```bash
# 전체 실행
npx playwright test

# 특정 파일
npx playwright test test/e2e/<파일명>.spec.js

# 디버그 모드
npx playwright test --debug

# UI 모드
npx playwright test --ui
```

### 3. 실패 처리
테스트 실패 시:
1. 에러 메시지와 스택트레이스 분석
2. 스크린샷 확인 (test-results/ 디렉토리)
3. 관련 소스코드 읽기
4. 원인 파악 후 수정
5. 재실행으로 검증

## 테스트 작성 규칙
- 파일 위치: `test/e2e/<이름>.spec.js`
- Playwright Test 문법 사용
- 각 테스트는 독립적 (상태 공유 없음)
- 셀렉터: data-testid > id > CSS 클래스 순 우선
- 타임아웃: 액션 5초, 네비게이션 10초
- 스크린샷: 실패 시 자동 캡처

## 테스트 시나리오 목록
| 파일 | 시나리오 |
|------|---------|
| chat-simulation.spec.js | 채팅 입력 → 시뮬레이션 실행 → 3D 렌더링 |
| preset.spec.js | 프리셋 선택 → 파라미터 변경 → 재실행 |
| fallback.spec.js | Ollama 미연결 → 폴백 NLP → 기본 시뮬레이션 |
| i18n.spec.js | 언어 전환 (ko ↔ en) |
| responsive.spec.js | 반응형 레이아웃 (데스크탑 ↔ 모바일) |

## Playwright 설정
설정 파일: `playwright.config.js`
- 테스트 디렉토리: `test/e2e`
- 베이스 URL: `http://localhost:3000`
- 헤드리스 모드 기본
- 서버 자동 시작: `node server.js`


## 칸반 연동 (필수)

> 이 스킬 실행 시 반드시 칸반보드에 기록한다.

**실행 전:**
```bash
# 1. 팀/티켓이 없으면 생성
curl -X POST http://localhost:5555/api/teams/{team_id}/tickets -H "Content-Type: application/json" -d '{"title":"스킬 실행: e2e.md","priority":"medium"}'
# 2. 클레임
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/claim -H "Content-Type: application/json" -d '{"member_id":"agent-xxx"}'
# 3. progress_note
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/progress -H "Content-Type: application/json" -d '{"note":"스킬 실행 시작"}'
```

**실행 후:**
```bash
# 4. 산출물 등록
curl -X POST http://localhost:5555/api/tickets/{ticket_id}/artifacts -H "Content-Type: application/json" -d '{"creator_member_id":"agent-xxx","title":"결과","content":"...","artifact_type":"result"}'
# 5. Review 전환
curl -X PUT http://localhost:5555/api/tickets/{ticket_id}/status -H "Content-Type: application/json" -d '{"status":"Review"}'
```
