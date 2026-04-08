#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Lambda GPU Sniper — A100 인스턴스 자동 확보
#
# Lambda Cloud에서 A100이 available될 때까지 30초마다 체크,
# 확보되면 자동으로 학습 시작.
#
# Usage:
#   LAMBDA_API_KEY=xxx HF_TOKEN=xxx bash scripts/lambda-sniper.sh
#
# 칸반 자동 보고: 5분마다 상태 업데이트
# ═══════════════════════════════════════════════════════════

set -euo pipefail

LAMBDA_API="https://cloud.lambdalabs.com/api/v1"
REGION="${LAMBDA_REGION:-us-east-1}"
GPU_TYPE="${LAMBDA_GPU:-gpu_1x_a100_sxm4}"  # 1x A100 80GB
SSH_KEY="${LAMBDA_SSH_KEY:-}"
POLL_INTERVAL=30
KANBAN_URL="http://localhost:5555"
KANBAN_TEAM="team-a170bcf1"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# ─── Validation ───
if [ -z "${LAMBDA_API_KEY:-}" ]; then
    echo -e "${RED}ERROR: LAMBDA_API_KEY not set${NC}"
    echo "  export LAMBDA_API_KEY=your_key"
    exit 1
fi

AUTH="Authorization: Bearer $LAMBDA_API_KEY"

kanban_report() {
    local msg="$1"
    curl -s -X POST "$KANBAN_URL/api/teams/$KANBAN_TEAM/tickets" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"[AUTO] $msg\",\"priority\":\"low\"}" > /dev/null 2>&1 || true
    echo -e "${CYAN}[KANBAN]${NC} $msg"
}

# ─── Phase 1: List available GPUs ───
echo "═══════════════════════════════════════════════"
echo " Lambda GPU Sniper"
echo " Target: $GPU_TYPE"
echo " Poll: every ${POLL_INTERVAL}s"
echo "═══════════════════════════════════════════════"

kanban_report "GPU 스나이퍼 시작 — $GPU_TYPE 탐색 중"

# ─── Phase 2: Snipe GPU ───
INSTANCE_ID=""
INSTANCE_IP=""
ATTEMPT=0

while [ -z "$INSTANCE_ID" ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # Check availability
    AVAIL=$(curl -s -H "$AUTH" "$LAMBDA_API/instance-types" 2>/dev/null)
    HAS_GPU=$(echo "$AVAIL" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    types = data.get('data', {})
    for name, info in types.items():
        if '$GPU_TYPE' in name:
            regions = info.get('regions_with_capacity_available', [])
            if regions:
                print(','.join(r['name'] for r in regions))
            else:
                print('NONE')
            break
    else:
        print('NOT_FOUND')
except:
    print('ERROR')
" 2>/dev/null)

    if [ "$HAS_GPU" = "NONE" ] || [ "$HAS_GPU" = "NOT_FOUND" ] || [ "$HAS_GPU" = "ERROR" ] || [ -z "$HAS_GPU" ]; then
        echo -e "[${ATTEMPT}] $(date +%H:%M:%S) ${YELLOW}No A100 available${NC} — retrying in ${POLL_INTERVAL}s"

        # Report to kanban every 20 attempts (10 min)
        if [ $((ATTEMPT % 20)) -eq 0 ]; then
            kanban_report "GPU 대기 중 — ${ATTEMPT}번째 시도 ($((ATTEMPT * POLL_INTERVAL / 60))분 경과)"
        fi

        sleep $POLL_INTERVAL
        continue
    fi

    echo -e "[${ATTEMPT}] $(date +%H:%M:%S) ${GREEN}A100 AVAILABLE in: $HAS_GPU${NC}"
    kanban_report "A100 발견! 리전: $HAS_GPU — 인스턴스 생성 중"

    # Pick first available region
    LAUNCH_REGION=$(echo "$HAS_GPU" | cut -d',' -f1)

    # Launch instance
    LAUNCH_BODY="{
        \"region_name\": \"$LAUNCH_REGION\",
        \"instance_type_name\": \"$GPU_TYPE\",
        \"name\": \"gemma4-finetune\",
        \"quantity\": 1
    }"

    # Add SSH key if provided
    if [ -n "$SSH_KEY" ]; then
        LAUNCH_BODY=$(echo "$LAUNCH_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
d['ssh_key_names'] = ['$SSH_KEY']
print(json.dumps(d))
")
    fi

    LAUNCH_RESULT=$(curl -s -X POST "$LAMBDA_API/instance-operations/launch" \
        -H "$AUTH" -H "Content-Type: application/json" \
        -d "$LAUNCH_BODY" 2>/dev/null)

    INSTANCE_ID=$(echo "$LAUNCH_RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ids = data.get('data', {}).get('instance_ids', [])
    print(ids[0] if ids else '')
except:
    print('')
" 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        ERROR=$(echo "$LAUNCH_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message','unknown'))" 2>/dev/null || echo "unknown")
        echo -e "${RED}Launch failed: $ERROR${NC}"
        kanban_report "인스턴스 생성 실패: $ERROR — 재시도"
        INSTANCE_ID=""
        sleep $POLL_INTERVAL
    fi
done

echo -e "${GREEN}Instance launched: $INSTANCE_ID${NC}"
kanban_report "인스턴스 생성 완료: $INSTANCE_ID"

# ─── Phase 3: Wait for IP ───
echo "Waiting for instance to boot..."
for i in $(seq 1 60); do
    sleep 10
    DETAILS=$(curl -s -H "$AUTH" "$LAMBDA_API/instances/$INSTANCE_ID" 2>/dev/null)
    INSTANCE_IP=$(echo "$DETAILS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('data', {}).get('ip', '') or '')
except:
    print('')
" 2>/dev/null)

    STATUS=$(echo "$DETAILS" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('data', {}).get('status', ''))
except:
    print('')
" 2>/dev/null)

    echo "  [$i/60] Status: $STATUS, IP: ${INSTANCE_IP:-pending}"

    if [ -n "$INSTANCE_IP" ] && [ "$STATUS" = "active" ]; then
        break
    fi
done

if [ -z "$INSTANCE_IP" ]; then
    echo -e "${RED}Instance failed to get IP after 10 minutes${NC}"
    kanban_report "인스턴스 IP 할당 실패 — 수동 확인 필요"
    exit 1
fi

echo -e "${GREEN}Instance ready: $INSTANCE_IP${NC}"
kanban_report "인스턴스 준비 완료: $INSTANCE_IP ($INSTANCE_ID)"

# ─── Phase 4: SSH + Start Training ───
echo ""
echo "═══════════════════════════════════════════════"
echo " Starting training on $INSTANCE_IP"
echo "═══════════════════════════════════════════════"

# Wait for SSH to be ready
for i in $(seq 1 12); do
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "echo SSH_OK" 2>/dev/null | grep -q "SSH_OK"; then
        break
    fi
    echo "  Waiting for SSH... ($i/12)"
    sleep 10
done

# Upload HF token and start training
ssh -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "
    export HF_TOKEN='${HF_TOKEN:-}'
    export MODEL='google/gemma-4-E4B-it'
    bash -c 'nohup bash -c \"
        git clone https://github.com/U2SY26/gemma4-particle-edu.git &&
        cd gemma4-particle-edu &&
        pip install -q unsloth xformers trl datasets huggingface_hub numpy torchvision &&
        python3 scripts/train-gemma4-physics.py --no-shutdown
    \" > ~/training.log 2>&1 &'
    echo TRAINING_STARTED
" 2>&1

kanban_report "학습 시작됨 — SSH: ubuntu@$INSTANCE_IP"

# ─── Phase 5: Monitor (5-minute intervals) ───
echo ""
echo "═══════════════════════════════════════════════"
echo " Monitoring (every 5 minutes)"
echo " Instance: $INSTANCE_ID"
echo " IP: $INSTANCE_IP"
echo " SSH: ssh ubuntu@$INSTANCE_IP"
echo " Log: ssh ubuntu@$INSTANCE_IP 'tail -20 training.log'"
echo " Safe terminate: scripts/safe_terminate.sh $INSTANCE_ID $INSTANCE_IP models/gemma4-physics-edu v1"
echo "═══════════════════════════════════════════════"

MONITOR_COUNT=0
while true; do
    sleep 300  # 5 minutes
    MONITOR_COUNT=$((MONITOR_COUNT + 1))

    # Check if instance still exists
    STATUS=$(curl -s -H "$AUTH" "$LAMBDA_API/instances/$INSTANCE_ID" 2>/dev/null | \
        python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status','unknown'))" 2>/dev/null || echo "unreachable")

    if [ "$STATUS" != "active" ]; then
        echo -e "${RED}[Monitor $MONITOR_COUNT] Instance status: $STATUS — may have terminated${NC}"
        kanban_report "인스턴스 상태: $STATUS — 확인 필요 (모니터 #$MONITOR_COUNT)"
        break
    fi

    # Get last log line
    LAST_LINE=$(ssh -o ConnectTimeout=10 ubuntu@$INSTANCE_IP "tail -1 ~/training.log 2>/dev/null" 2>/dev/null || echo "SSH failed")

    # Check for completion
    if echo "$LAST_LINE" | grep -q "COMPLETE\|auto-shutdown\|shutdown"; then
        echo -e "${GREEN}[Monitor $MONITOR_COUNT] TRAINING COMPLETE${NC}"
        echo "  $LAST_LINE"
        kanban_report "학습 완료! safe_terminate.sh 실행 필요"
        echo ""
        echo "Run: scripts/safe_terminate.sh $INSTANCE_ID $INSTANCE_IP models/gemma4-physics-edu v1"
        break
    fi

    # Check for errors
    if echo "$LAST_LINE" | grep -qi "error\|fail\|oom\|killed"; then
        echo -e "${RED}[Monitor $MONITOR_COUNT] ERROR DETECTED: $LAST_LINE${NC}"
        kanban_report "학습 에러: ${LAST_LINE:0:80}"
        echo ""
        echo "Check: ssh ubuntu@$INSTANCE_IP 'tail -50 training.log'"
        echo "Terminate: scripts/safe_terminate.sh $INSTANCE_ID $INSTANCE_IP models/gemma4-physics-edu v1"
        break
    fi

    # Normal report
    SHORT=$(echo "$LAST_LINE" | head -c 80)
    echo -e "${CYAN}[Monitor $MONITOR_COUNT — $(date +%H:%M)]${NC} $SHORT"

    # Kanban report every 3 checks (15 min)
    if [ $((MONITOR_COUNT % 3)) -eq 0 ]; then
        kanban_report "학습 진행 중 (${MONITOR_COUNT}×5min) — $SHORT"
    fi
done

echo ""
echo "Monitoring ended. Instance: $INSTANCE_ID, IP: $INSTANCE_IP"
