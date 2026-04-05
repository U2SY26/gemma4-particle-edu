#!/usr/bin/env bash
# os-healthcheck.sh — OS 레벨 감시 (Claude 세션과 독립)
# crontab 등록: */10 * * * * /home/u2dia/github/gemma4-particle-edu/scripts/os-healthcheck.sh

LOG="/tmp/gemma4-os-healthcheck.log"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"

{
  echo ""
  echo "=== $NOW os-healthcheck ==="

  # 1. dag-benchmark.js 프로세스 생존
  DAG=$(pgrep -af "dag-benchmark.js" | wc -l)
  echo "dag-benchmark.js procs: $DAG"
  [ "$DAG" -lt 1 ] && echo "⚠️ CRITICAL: dag-benchmark.js 전체 사망"
  [ "$DAG" -eq 1 ] && echo "⚠️ WARNING: 1개만 살아있음 (기대 2)"

  # 2. Ollama API
  OLL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/ps 2>/dev/null)
  echo "ollama /api/ps: HTTP ${OLL_CODE:-TIMEOUT}"
  [ "$OLL_CODE" != "200" ] && echo "⚠️ WARNING: ollama API 미응답"

  # 3. Ollama 31B 로드 유지
  OLL_MODEL=$(curl -s http://localhost:11434/api/ps 2>/dev/null | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    ms=d.get('models',[])
    print(','.join(m['name'] for m in ms) if ms else 'NONE')
except: print('PARSE_ERR')" 2>/dev/null)
  echo "ollama loaded: $OLL_MODEL"

  # 4. Kanban 서버 응답
  KAN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5555/api/teams/team-5c22f8c3 2>/dev/null)
  echo "kanban /api/teams: HTTP ${KAN_CODE:-TIMEOUT}"
  [ "$KAN_CODE" != "200" ] && echo "⚠️ WARNING: kanban API 미응답"

  # 5. 벤치마크 파일 수
  BENCH=$(ls /home/u2dia/github/gemma4-particle-edu/docs/benchmarks/bench-*.typ 2>/dev/null | wc -l)
  echo "bench files: $BENCH/300"

  # 6. 최근 Ollama 요청 수 (10분)
  REQ=$(journalctl -u ollama --since "10 minutes ago" --no-pager 2>/dev/null | grep -c "POST.*api/chat")
  echo "ollama /api/chat last 10min: $REQ"
  [ "$REQ" -lt 1 ] && echo "⚠️ WARNING: 최근 10분 chat 요청 0건 (시뮬 멈췄을 가능성)"

  # 7. 디스크 여유
  DISK=$(df -h /home/u2dia 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
  echo "disk usage: ${DISK:-?}%"
  [ -n "$DISK" ] && [ "$DISK" -gt 90 ] && echo "⚠️ WARNING: disk >90%"

  # 8. server.js 생존
  SRV=$(pgrep -f "gemma4-particle-edu/server.js" | wc -l)
  echo "server.js: $SRV proc"

  echo "=== done ==="
} >> "$LOG" 2>&1
