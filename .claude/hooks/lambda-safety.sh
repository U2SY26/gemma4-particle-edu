#!/bin/bash
# Lambda 안전 Hook — terminate 명령에서 타 프로젝트 인스턴스 보호
# PreToolUse:Bash에서 실행

COMMAND="${TOOL_INPUT_command:-}"

# terminate 명령 감지
if echo "$COMMAND" | grep -qi "terminate"; then
  # nemotron, konbu 등 타 프로젝트 인스턴스 보호
  if echo "$COMMAND" | grep -qiE "nemotron|konbu|measuring-agi"; then
    cat >&2 <<'EOF'
⛔ BLOCKED: 다른 프로젝트 인스턴스 terminate 시도 감지
nemotron/konbu 등은 이 프로젝트(gemma4) 관할이 아닙니다.
사용자가 직접 terminate 해야 합니다.
EOF
    exit 2
  fi

  # "instance_ids" 에 여러 개가 있으면 일괄 terminate 경고
  IDS_COUNT=$(echo "$COMMAND" | grep -oP '"[a-f0-9]{32}"' | wc -l)
  if [ "$IDS_COUNT" -gt 1 ]; then
    cat >&2 <<'EOF'
⚠️ WARNING: 2개 이상 인스턴스 일괄 terminate 감지
인스턴스를 하나씩 개별 확인 후 terminate 해야 합니다.
EOF
    exit 2
  fi
fi

exit 0
