#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Lambda GPU One-Click Training Script
# Run this on a Lambda A10 (24GB) instance
# Total cost: ~$2-3, auto-shuts down after completion
# ═══════════════════════════════════════════════════════════

set -e

echo "=== GEMMA 4 PHYSICS EDU FINE-TUNING ==="
echo "GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'unknown')"
echo "VRAM: $(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null || echo 'unknown')"
echo ""

# 1. Clone repo
if [ ! -d "gemma4-particle-edu" ]; then
    git clone https://github.com/U2SY26/gemma4-particle-edu.git
fi
cd gemma4-particle-edu

# 2. Install dependencies
echo "[1/4] Installing dependencies..."
pip install -q "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install -q xformers trl datasets huggingface_hub

# 3. Login to HuggingFace (for backup upload)
if [ -n "$HF_TOKEN" ]; then
    huggingface-cli login --token "$HF_TOKEN"
    echo "  HuggingFace logged in"
else
    echo "  WARNING: HF_TOKEN not set, Hub backup will be skipped"
fi

# 4. Run training (auto-shuts down after)
echo "[2/4] Starting training..."
echo "  Data: $(wc -l < data/training-data.jsonl) training pairs"
echo "  Estimated time: ~90 minutes"
echo "  Auto-shutdown: YES (60s grace period after completion)"
echo ""

python scripts/train-gemma4-physics.py

# If we reach here, auto-shutdown was cancelled or --no-shutdown was set
echo "Training complete. Instance still running."
