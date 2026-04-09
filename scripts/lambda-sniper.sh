#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Lambda GPU Sniper — 재고 알림 전용 (자동 생성 금지)
#
# GPU 재고를 30초마다 체크하고, 발견 시 사용자에게 알림만 한다.
# 인스턴스 생성은 절대 하지 않는다. 사용자가 직접 승인해야 한다.
#
# Usage:
#   LAMBDA_API_KEY=xxx bash scripts/lambda-sniper.sh
#
# 안전 규칙:
#   - 인스턴스 자동 생성 금지 (CLAUDE.md 규칙 #3)
#   - 알림만 → 사용자 "생성해" 후에만 생성
#   - 칸반 보고: 10분마다 상태, 발견 시 즉시
# ═══════════════════════════════════════════════════════════

set -euo pipefail

LAMBDA_API="https://cloud.lambdalabs.com/api/v1"
GPU_TARGETS="${LAMBDA_GPU_TARGETS:-gpu_1x_a10 gpu_1x_a100_sxm4 gpu_1x_h100_pcie gpu_1x_h100_sxm5 gpu_1x_gh200}"
POLL_INTERVAL="${LAMBDA_POLL:-30}"
KANBAN_URL="http://localhost:5555"
KANBAN_TICKET="${KANBAN_TICKET_ID:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

if [ -z "${LAMBDA_API_KEY:-}" ]; then
    echo -e "${RED}ERROR: LAMBDA_API_KEY not set${NC}"
    exit 1
fi

AUTH="Authorization: Bearer $LAMBDA_API_KEY"

kanban_progress() {
    [ -z "$KANBAN_TICKET" ] && return
    curl -s -X PUT "$KANBAN_URL/api/tickets/$KANBAN_TICKET/progress" \
        -H "Content-Type: application/json" \
        -d "{\"note\":\"[$(date '+%Y-%m-%d %H:%M')] $1\"}" > /dev/null 2>&1 || true
}

notify() {
    # 데스크톱 알림 (사용자에게 직접 보이게)
    notify-send "Lambda GPU 발견" "$1" 2>/dev/null || true
    echo -e "${GREEN}[$(date +%H:%M:%S)] 🔔 $1${NC}"
}

echo "═══════════════════════════════════════════════"
echo " Lambda GPU Sniper (알림 전용 — 자동 생성 금지)"
echo " 대상: $GPU_TARGETS"
echo " 주기: ${POLL_INTERVAL}초"
echo "═══════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}⚠️  GPU 발견 시 알림만 합니다. 인스턴스 생성은 사용자 승인 필요.${NC}"
echo ""

kanban_progress "GPU 스나이퍼 시작 (알림 전용). 대상: $GPU_TARGETS"

ATTEMPT=0
while true; do
    ATTEMPT=$((ATTEMPT + 1))

    AVAIL=$(curl -s -H "$AUTH" "$LAMBDA_API/instance-types" 2>/dev/null)

    FOUND=""
    for GPU in $GPU_TARGETS; do
        RESULT=$(echo "$AVAIL" | python3 -c "
import sys, json
try:
    info = json.load(sys.stdin).get('data', {}).get('$GPU', {})
    regions = info.get('regions_with_capacity_available', [])
    if regions:
        desc = info.get('instance_type', {}).get('description', '$GPU')
        price = info.get('instance_type', {}).get('price_cents_per_hour', 0) / 100
        print(f'{desc} \${price:.2f}/hr [{regions[0][\"name\"]}]')
except:
    pass
" 2>/dev/null)
        if [ -n "$RESULT" ]; then
            FOUND="${FOUND:+$FOUND | }$RESULT"
        fi
    done

    if [ -n "$FOUND" ]; then
        notify "GPU 재고 발견: $FOUND"
        kanban_progress "🔔 GPU 발견! $FOUND — 사용자 승인 대기"
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        echo -e "${GREEN}  GPU 발견: $FOUND${NC}"
        echo -e "${GREEN}  인스턴스 생성하려면 사용자가 직접 승인해야 합니다.${NC}"
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        echo ""
        # 발견 후에도 계속 모니터링 (재고가 사라질 수 있으므로)
    else
        if [ $((ATTEMPT % 20)) -eq 0 ]; then
            echo -e "[${ATTEMPT}] $(date +%H:%M:%S) ${YELLOW}재고 없음${NC} ($((ATTEMPT * POLL_INTERVAL / 60))분 경과)"
            kanban_progress "GPU 대기 #$ATTEMPT ($((ATTEMPT * POLL_INTERVAL / 60))분). 재고 없음."
        fi
    fi

    sleep $POLL_INTERVAL
done
