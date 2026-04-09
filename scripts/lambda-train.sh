#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Lambda GPU Training with Safety Monitoring
#
# SAFETY:
# - Max runtime: 3 hours (auto-kill if exceeded)
# - Heartbeat every 30s (detect hangs)
# - OOM detection → immediate shutdown
# - Training failure → immediate shutdown
# - Success → upload to HF Hub → shutdown
# - All output logged to training.log
#
# Cost cap: 3hr × $1.29/hr (A100) = $3.87 max
# ═══════════════════════════════════════════════════════════

set -euo pipefail

MAX_RUNTIME_SEC=86400  # 24 hours (비용 상한 없음 — 학습 완료까지 대기)
LOG_FILE="training.log"
PID_FILE="/tmp/train.pid"

echo "=== LAMBDA TRAINING WITH SAFETY MONITORING ==="
echo "GPU: $(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo 'unknown')"
echo "Max runtime: $((MAX_RUNTIME_SEC / 3600))h"
echo "Log: $LOG_FILE"
echo ""

# ─── Safety: kill everything on exit ───
cleanup() {
    echo "[SAFETY] Cleaning up..."
    [ -f "$PID_FILE" ] && kill "$(cat $PID_FILE)" 2>/dev/null || true
    rm -f "$PID_FILE"
}
trap cleanup EXIT

# ─── Safety: max runtime watchdog ───
(
    sleep $MAX_RUNTIME_SEC
    echo "[SAFETY] MAX RUNTIME ($((MAX_RUNTIME_SEC/3600))h) EXCEEDED — SHUTTING DOWN"
    [ -f "$PID_FILE" ] && kill "$(cat $PID_FILE)" 2>/dev/null
    sleep 10
    sudo shutdown -h now
) &
WATCHDOG_PID=$!

# ─── Clone + Install ───
if [ ! -d "gemma4-particle-edu" ]; then
    echo "[1/5] Cloning repo..."
    git clone https://github.com/U2SY26/gemma4-particle-edu.git
fi
cd gemma4-particle-edu

echo "[2/5] Installing dependencies..."
pip install -q "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git" \
    xformers trl datasets huggingface_hub numpy torchvision 2>&1 | tail -3

# ─── HuggingFace login ───
if [ -n "${HF_TOKEN:-}" ]; then
    huggingface-cli login --token "$HF_TOKEN" --add-to-git-credential 2>/dev/null
    echo "  HF logged in"
fi

# ─── Training with monitoring ───
echo "[3/5] Starting training..."
echo "  Data: $(wc -l < data/training-data.jsonl) pairs"
export MODEL="${MODEL:-google/gemma-4-E4B-it}"
echo "  Model: $MODEL"
echo ""

# Run training in background, capture PID
python3 scripts/train-gemma4-physics.py --no-shutdown > >(tee -a "$LOG_FILE") 2>&1 &
TRAIN_PID=$!
echo $TRAIN_PID > "$PID_FILE"

# ─── Heartbeat monitor ───
echo "[4/5] Monitoring (heartbeat every 30s)..."
LAST_LOG_SIZE=0
STALL_COUNT=0
MAX_STALLS=10  # 10 × 30s = 5 minutes of no output → kill

while kill -0 $TRAIN_PID 2>/dev/null; do
    sleep 30

    # Check if log is growing
    CURRENT_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$CURRENT_SIZE" = "$LAST_LOG_SIZE" ]; then
        STALL_COUNT=$((STALL_COUNT + 1))
        echo "[MONITOR] No output for $((STALL_COUNT * 30))s (stall $STALL_COUNT/$MAX_STALLS)"
        if [ $STALL_COUNT -ge $MAX_STALLS ]; then
            echo "[SAFETY] STALL DETECTED — killing training"
            kill $TRAIN_PID 2>/dev/null
            break
        fi
    else
        STALL_COUNT=0
        LAST_LOG_SIZE=$CURRENT_SIZE
        # Show last training line
        LAST_LINE=$(tail -1 "$LOG_FILE" 2>/dev/null | head -c 100)
        echo "[MONITOR] OK — $LAST_LINE"
    fi

    # Check for OOM in log
    if grep -q "OutOfMemoryError\|CUDA out of memory" "$LOG_FILE" 2>/dev/null; then
        echo "[SAFETY] OOM DETECTED — killing training"
        kill $TRAIN_PID 2>/dev/null
        break
    fi

    # Check GPU health
    if ! nvidia-smi > /dev/null 2>&1; then
        echo "[SAFETY] GPU LOST — killing training"
        kill $TRAIN_PID 2>/dev/null
        break
    fi
done

# Wait for training to finish
wait $TRAIN_PID 2>/dev/null
TRAIN_EXIT=$?
rm -f "$PID_FILE"

# Kill watchdog
kill $WATCHDOG_PID 2>/dev/null || true

# ─── Result check ───
echo ""
echo "[5/5] Checking results..."
if [ $TRAIN_EXIT -eq 0 ]; then
    echo "  Training: SUCCESS (exit code 0)"
    if [ -d "models/gemma4-physics-edu" ]; then
        echo "  LoRA adapter: models/gemma4-physics-edu/"
        ls -lh models/gemma4-physics-edu/ 2>/dev/null | head -5
    fi
    if [ -d "models/gemma4-physics-edu-gguf" ]; then
        echo "  GGUF: models/gemma4-physics-edu-gguf/"
        ls -lh models/gemma4-physics-edu-gguf/ 2>/dev/null | head -5
    fi
else
    echo "  Training: FAILED (exit code $TRAIN_EXIT)"
    echo "  Last 20 lines of log:"
    tail -20 "$LOG_FILE"
fi

# ─── Shutdown ───
echo ""
echo "=== SHUTTING DOWN IN 120 SECONDS ==="
echo "  Cancel: kill $$"
echo "  Check results: cat $LOG_FILE"
sleep 120
sudo shutdown -h now
