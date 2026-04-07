#!/bin/bash
# kanban-backfill.sh — 벤치마크 결과를 칸반에 1개씩 순차 소급 등록
# Usage: bash kanban-backfill.sh <log_file> <team_id>

LOG="${1:-/tmp/claude-1000/-home-u2dia-github-gemma4-particle-edu/2198d9bf-f238-42bd-adb9-5e97b01c209e/tasks/bjfo4uzrz.output}"
TEAM="${2:-team-5c22f8c3}"
KANBAN="http://localhost:5555"
DELAY=0.8  # 초 — WriteQueue 충돌 방지

if [ ! -f "$LOG" ]; then
  echo "Log file not found: $LOG"
  exit 1
fi

echo "=== 칸반 소급 등록 ==="
echo "Log: $LOG"
echo "Team: $TEAM"
echo "Delay: ${DELAY}s per ticket"
echo

# 로그에서 시나리오별 결과 추출
# 형식: [  N/300] 시나리오   ★★★★★ XX% | 제목 [XXXXXp]
SUCCESS=0
FAIL=0
TOTAL=0

# [  N/300] 라인과 다음 ★ 라인을 쌍으로 파싱
python3 - "$LOG" <<'PYEOF' > /tmp/parsed_results.txt
import sys, re

log_file = sys.argv[1]
with open(log_file) as f:
    content = f.read()

# Match each scenario block
pattern = re.compile(r'\[\s*(\d+)/\d+\]\s+([^\n]+?)\n.*?(★★★★★\s*\d+%|✗[^\n]*)', re.DOTALL)
for m in pattern.finditer(content):
    num = m.group(1)
    scenario = m.group(2).strip()
    result = m.group(3).strip()
    # Clean
    status = "PASS" if "★★★★★" in result else "FAIL"
    print(f"{num}|{scenario[:40]}|{status}|{result[:30]}")
PYEOF

TOTAL=$(wc -l < /tmp/parsed_results.txt)
echo "Parsed: $TOTAL scenarios"
echo

IDX=0
while IFS='|' read -r NUM SCENARIO STATUS RESULT; do
  IDX=$((IDX+1))
  printf "[%3d/%d] #%s: %-35s " "$IDX" "$TOTAL" "$NUM" "${SCENARIO:0:33}"

  # 1. 티켓 생성
  TID=$(curl -s --max-time 10 -X POST "$KANBAN/api/teams/$TEAM/tickets" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"31B #$NUM: $SCENARIO\",\"priority\":\"medium\"}" \
    2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('ticket',{}).get('ticket_id',''))" 2>/dev/null)

  if [ -z "$TID" ]; then
    echo "✗ 티켓 생성 실패"
    FAIL=$((FAIL+1))
    sleep $DELAY
    continue
  fi

  # 2. Claim
  curl -s --max-time 10 -X PUT "$KANBAN/api/tickets/$TID/claim" \
    -H "Content-Type: application/json" -d '{"member_id":"gemma4-31b"}' > /dev/null 2>&1
  sleep 0.2

  # 3. Artifact
  curl -s --max-time 10 -X POST "$KANBAN/api/tickets/$TID/artifacts" \
    -H "Content-Type: application/json" \
    -d "{\"creator_member_id\":\"gemma4-31b\",\"title\":\"$RESULT\",\"content\":\"Gemma 4 31B DAG 7-step | Scenario #$NUM | $SCENARIO | $RESULT\",\"artifact_type\":\"result\"}" > /dev/null 2>&1
  sleep 0.2

  # 4. Review
  curl -s --max-time 10 -X PUT "$KANBAN/api/tickets/$TID/status" \
    -H "Content-Type: application/json" -d '{"status":"Review"}' > /dev/null 2>&1
  sleep 0.2

  # 5. Done (supervisor 승인)
  curl -s --max-time 10 -X PUT "$KANBAN/api/tickets/$TID/status" \
    -H "Content-Type: application/json" -d '{"status":"Done"}' > /dev/null 2>&1

  echo "✓ $TID ($STATUS)"
  SUCCESS=$((SUCCESS+1))

  sleep $DELAY
done < /tmp/parsed_results.txt

echo
echo "=== 결과 ==="
echo "등록 성공: $SUCCESS/$TOTAL"
echo "실패: $FAIL/$TOTAL"
