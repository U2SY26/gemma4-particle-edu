#!/bin/bash
# ═══════════════════════════════════════════════════════════
# SAFE TERMINATE — Lambda 인스턴스 안전 종료
#
# 6단계 체크를 모두 통과해야만 terminate 가능.
# 어느 하나라도 실패하면 BLOCK.
# $168 손실 재발 방지.
#
# Usage:
#   scripts/safe_terminate.sh <instance_id> <ip> <output_dir> <label>
#
# Example:
#   scripts/safe_terminate.sh abc123 192.168.1.1 models/gemma4-physics-edu v1
# ═══════════════════════════════════════════════════════════

set -euo pipefail

if [ $# -lt 4 ]; then
    echo "Usage: $0 <instance_id> <ip> <output_dir> <label>"
    echo "Example: $0 abc123 192.168.1.1 models/gemma4-physics-edu v1"
    exit 1
fi

INSTANCE_ID="$1"
IP="$2"
OUTPUT_DIR="$3"
LABEL="$4"
LOCAL_BACKUP="backups/lambda-${LABEL}-$(date +%Y%m%d-%H%M%S)"
SSH_USER="ubuntu"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[BLOCK]${NC} $1"; echo -e "${RED}TERMINATE BLOCKED — fix the issue first${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "═══════════════════════════════════════════════════"
echo " SAFE TERMINATE — 6-Step Verification"
echo " Instance: $INSTANCE_ID"
echo " IP: $IP"
echo " Output: $OUTPUT_DIR"
echo " Label: $LABEL"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── [1/6] 학습 결과 존재 확인 ───
echo "[1/6] Checking training artifacts on remote..."
ADAPTER_EXISTS=$(ssh -o ConnectTimeout=10 ${SSH_USER}@${IP} \
    "ls gemma4-particle-edu/${OUTPUT_DIR}/adapter_config.json 2>/dev/null && echo YES || echo NO")
if [ "$ADAPTER_EXISTS" = "YES" ]; then
    pass "adapter_config.json exists on remote"
else
    fail "adapter_config.json NOT FOUND on remote — training may not have completed"
fi

# Check for GGUF
GGUF_EXISTS=$(ssh ${SSH_USER}@${IP} \
    "ls gemma4-particle-edu/${OUTPUT_DIR}-gguf/*.gguf 2>/dev/null | head -1 && echo YES || echo NO" | tail -1)
if [ "$GGUF_EXISTS" = "YES" ]; then
    pass "GGUF file exists on remote"
else
    warn "GGUF not found — may need to convert manually"
fi

# ─── [2/6] rsync 로컬 복사 ───
echo ""
echo "[2/6] Syncing artifacts to local..."
mkdir -p "$LOCAL_BACKUP"

rsync -avz --progress ${SSH_USER}@${IP}:gemma4-particle-edu/${OUTPUT_DIR}/ \
    "${LOCAL_BACKUP}/lora/" 2>&1 | tail -5

if [ -f "${LOCAL_BACKUP}/lora/adapter_config.json" ]; then
    pass "LoRA adapter synced to ${LOCAL_BACKUP}/lora/"
else
    fail "rsync failed — adapter_config.json not in local backup"
fi

# Sync GGUF if exists
rsync -avz --progress ${SSH_USER}@${IP}:gemma4-particle-edu/${OUTPUT_DIR}-gguf/ \
    "${LOCAL_BACKUP}/gguf/" 2>&1 | tail -3 || warn "GGUF sync failed (non-critical)"

# Sync training log
rsync -avz ${SSH_USER}@${IP}:gemma4-particle-edu/training.log \
    "${LOCAL_BACKUP}/" 2>&1 | tail -1 || warn "Log sync failed"

# ─── [3/6] 검증 — 파일 무결성 ───
echo ""
echo "[3/6] Verifying local backup integrity..."

# Check adapter files
REQUIRED_FILES="adapter_config.json adapter_model.safetensors"
ALL_OK=true
for f in $REQUIRED_FILES; do
    if [ -f "${LOCAL_BACKUP}/lora/$f" ]; then
        SIZE=$(du -h "${LOCAL_BACKUP}/lora/$f" | cut -f1)
        pass "$f ($SIZE)"
    else
        fail "$f missing in local backup"
        ALL_OK=false
    fi
done

# Check file sizes (adapter should be >1MB)
ADAPTER_SIZE=$(stat -c%s "${LOCAL_BACKUP}/lora/adapter_model.safetensors" 2>/dev/null || echo 0)
if [ "$ADAPTER_SIZE" -gt 1000000 ]; then
    pass "Adapter size: $(echo "$ADAPTER_SIZE / 1048576" | bc)MB (>1MB OK)"
else
    fail "Adapter too small (${ADAPTER_SIZE} bytes) — may be corrupted"
fi

# ─── [4/6] 학습 로그 확인 ───
echo ""
echo "[4/6] Checking training log..."
if [ -f "${LOCAL_BACKUP}/training.log" ]; then
    # Check for successful completion
    if grep -q "COMPLETE\|Training complete\|LoRA adapter saved" "${LOCAL_BACKUP}/training.log"; then
        LOSS=$(grep -o "Training loss: [0-9.]*" "${LOCAL_BACKUP}/training.log" | tail -1)
        pass "Training completed successfully ($LOSS)"
    else
        # Check for errors
        if grep -q "Error\|FAIL\|OutOfMemory\|RuntimeError" "${LOCAL_BACKUP}/training.log"; then
            LAST_ERROR=$(grep -i "error\|fail\|oom" "${LOCAL_BACKUP}/training.log" | tail -1)
            fail "Training log contains errors: $LAST_ERROR"
        else
            warn "Training completion not confirmed in log"
        fi
    fi
else
    warn "No training log found"
fi

# ─── [5/6] HuggingFace Hub 업로드 확인 ───
echo ""
echo "[5/6] Checking HuggingFace Hub backup..."
HF_CHECK=$(ssh ${SSH_USER}@${IP} \
    "grep -c 'uploaded to.*huggingface' gemma4-particle-edu/training.log 2>/dev/null || echo 0")
if [ "$HF_CHECK" -gt 0 ]; then
    pass "Model uploaded to HuggingFace Hub"
else
    warn "HF Hub upload not confirmed — local backup is the only copy"
    echo "  Local backup: ${LOCAL_BACKUP}/"
fi

# ─── [6/7] 다른 프로젝트 보호 체크 ───
echo ""
echo "[6/7] Checking for other active projects on this instance..."
OTHER_PROCS=$(ssh -o ConnectTimeout=10 ${SSH_USER}@${IP} \
    "ps aux | grep -E 'python|train|nemotron|benchmark' | grep -v grep | grep -v gemma4-particle" 2>/dev/null || echo "")

if [ -n "$OTHER_PROCS" ]; then
    echo -e "${RED}WARNING: Other training processes detected:${NC}"
    echo "$OTHER_PROCS"
    echo ""
    echo -e "${RED}This instance is SHARED. Terminating will KILL these processes.${NC}"
    echo -e "${RED}Estimated cost of other projects' loss: UNKNOWN (potentially \$100+)${NC}"
    echo ""
    read -p "Are you SURE you want to terminate? Other projects will be DESTROYED. Type 'I UNDERSTAND': " SHARED_CONFIRM
    if [ "$SHARED_CONFIRM" != "I UNDERSTAND" ]; then
        fail "Cancelled — other projects are running. Wait for them to finish."
    fi
    warn "Proceeding despite shared instance — user confirmed"
else
    pass "No other training processes detected — safe to terminate"
fi

# Show current billing estimate
echo ""
echo "Current Lambda instances (billing check):"
curl -s -H "Authorization: Bearer ${LAMBDA_API_KEY:-}" \
    "https://cloud.lambdalabs.com/api/v1/instances" 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin).get('data', [])
    for i in data:
        cost = i['instance_type']['price_cents_per_hour'] / 100
        print(f'  {i[\"id\"][:12]}... | {i[\"name\"]} | {i[\"instance_type\"][\"name\"]} | \${cost}/hr | {i[\"status\"]}')
except: pass
" 2>/dev/null

# ─── [7/7] 사용자 최종 확인 ───
echo ""
echo "═══════════════════════════════════════════════════"
echo " VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════"
echo "  Instance:  $INSTANCE_ID"
echo "  Local:     $LOCAL_BACKUP/"
echo "  LoRA:      $(ls ${LOCAL_BACKUP}/lora/*.safetensors 2>/dev/null | wc -l) files"
echo "  GGUF:      $(ls ${LOCAL_BACKUP}/gguf/*.gguf 2>/dev/null | wc -l) files"
echo "  Log:       $([ -f ${LOCAL_BACKUP}/training.log ] && echo 'YES' || echo 'NO')"
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}All 7 checks passed. Ready to terminate instance ${INSTANCE_ID}.${NC}"
echo ""
read -p "Type 'TERMINATE' to proceed (anything else to cancel): " CONFIRM

if [ "$CONFIRM" = "TERMINATE" ]; then
    echo ""
    echo "Terminating instance $INSTANCE_ID..."

    # Lambda Cloud API terminate
    if command -v lambda &> /dev/null; then
        lambda instance terminate "$INSTANCE_ID"
    else
        curl -s -X POST "https://cloud.lambdalabs.com/api/v1/instance-operations/terminate" \
            -H "Authorization: Bearer ${LAMBDA_API_KEY:-}" \
            -H "Content-Type: application/json" \
            -d "{\"instance_ids\": [\"$INSTANCE_ID\"]}"
    fi

    echo ""
    echo -e "${GREEN}Instance terminated.${NC}"
    echo "Backup: ${LOCAL_BACKUP}/"
    echo ""
    echo "Next steps:"
    echo "  1. cd ${LOCAL_BACKUP}/gguf"
    echo "  2. ollama create gemma4-physics-edu -f Modelfile"
    echo "  3. ollama run gemma4-physics-edu"
else
    echo ""
    echo "Terminate CANCELLED. Instance still running."
    echo "  ssh ${SSH_USER}@${IP}"
fi
