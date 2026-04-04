---
name: Workflow Feedback
description: User requires kanban tracking for ALL tasks, supervisor review for deliverables, and repeated team execution until competition outputs are complete
type: feedback
---

모든 작업(아무리 사소해도)에 칸반 보드 티켓 등록 필수. 산출물은 반드시 supervisor(code-reviewer) 에이전트에게 평가받을 것.

**Why:** 사용자는 진행 상황의 완전한 가시성과 품질 게이트를 원함. 작업이 누락되거나 검증 없이 완료되는 것을 방지.

**How to apply:**
1. 어떤 작업이든 시작 전 TaskCreate로 칸반 등록
2. 작업 완료 시 TaskUpdate로 상태 변경
3. 주요 산출물 완료 시 superpowers:code-reviewer 에이전트로 평가
4. 대회 규정 산출물(Writeup, 영상, 데모, 커버이미지, GitHub) 완성될 때까지 팀 구성 반복 실행
5. 감사 루프는 매 루프마다 칸반 활용 필수
