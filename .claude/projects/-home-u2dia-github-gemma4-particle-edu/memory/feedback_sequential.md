---
name: Sequential Execution Rule
description: 시뮬레이션은 순차적으로 1개씩. 한번에 대량 배치 금지. CPU 과부하 방지.
type: feedback
---

시뮬레이션 E2E는 한 번에 대량 실행하지 말 것. 순차적으로 1개씩 실행.

**Why:** Gemma 4 추론이 CPU/GPU를 100% 사용하므로, 대량 배치 실행 시 시스템 과부하.

**How to apply:** 
- 배치 스크립트 대신 개별 실행 또는 간격(delay) 충분히 두고 순차 실행
- 시뮬레이션 테스트 시 사용자에게 진행 상황 보고 후 승인받고 다음 진행
