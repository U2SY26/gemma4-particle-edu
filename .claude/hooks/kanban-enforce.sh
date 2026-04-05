#!/bin/bash
FILE_PATH="${TOOL_INPUT_file_path:-${TOOL_INPUT_path:-}}"

# 예외 파일
if [[ "$FILE_PATH" == *"/.claude/"* ]] || [[ "$FILE_PATH" == *"CLAUDE.md"* ]]; then
  exit 0
fi

# 환경변수 또는 파일로 티켓 확인
if [[ -n "$KANBAN_TICKET_ID" ]] || [[ -f /tmp/kanban_ticket.txt ]]; then
  exit 0
fi

cat >&2 <<'EOF'
⛔ 칸반 티켓 없이 코드 수정 불가
EOF
exit 2
