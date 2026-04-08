#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Post Fine-tuning Pipeline — 학습 완료 후 자동 실행
#
# 1. GGUF 다운로드 (safe_terminate 경유)
# 2. Ollama에 모델 등록
# 3. 20 시나리오 벤치마크 (base vs fine-tuned)
# 4. 결과 칸반 보고
# 5. Kaggle 데이터셋 업데이트
# 6. git commit + push
#
# Usage: bash scripts/post-finetune-pipeline.sh <backup_dir>
# Example: bash scripts/post-finetune-pipeline.sh backups/lambda-v1-20260408-120000
# ═══════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="${1:-backups/lambda-v1-latest}"
KANBAN="http://localhost:5555"
TICKET="T-03F65E"
MODEL_NAME="gemma4-physics-edu"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

report() {
    local msg="$1"
    curl -s -X PUT "$KANBAN/api/tickets/$TICKET/progress" \
      -H "Content-Type: application/json" \
      -d "{\"note\":\"[$(date +%H:%M)] $msg\"}" > /dev/null 2>&1
    echo -e "${GREEN}[REPORT]${NC} $msg"
    notify-send "Gemma4 파인튜닝" "$msg" 2>/dev/null || true
}

# ─── [1/6] Check backup ───
echo "=== POST FINE-TUNING PIPELINE ==="
echo "Backup: $BACKUP_DIR"

if [ ! -f "$BACKUP_DIR/lora/adapter_config.json" ]; then
    echo -e "${RED}ERROR: adapter_config.json not found in $BACKUP_DIR/lora/${NC}"
    report "[ERROR] 백업 디렉토리에 어댑터 없음 — safe_terminate.sh 먼저 실행"
    exit 1
fi
report "[1/6] 백업 확인 OK — $BACKUP_DIR"

# ─── [2/6] Register in Ollama ───
echo ""
echo "[2/6] Registering in Ollama..."
if [ -d "$BACKUP_DIR/gguf" ] && ls "$BACKUP_DIR/gguf/"*.gguf 1>/dev/null 2>&1; then
    GGUF_FILE=$(ls "$BACKUP_DIR/gguf/"*.gguf | head -1)

    # Create Modelfile
    cat > "$BACKUP_DIR/gguf/Modelfile" << EOF
FROM $GGUF_FILE

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 2048

SYSTEM You are a physics simulation AI for Gemma 4 Particle Edu. Generate simulation JSON with accurate SI-unit physics parameters.
EOF

    cd "$BACKUP_DIR/gguf"
    ollama create "$MODEL_NAME" -f Modelfile 2>&1
    cd -

    # Verify
    if ollama list | grep -q "$MODEL_NAME"; then
        report "[2/6] Ollama 등록 완료 — ollama run $MODEL_NAME"
    else
        report "[2/6] Ollama 등록 실패 — 수동 확인 필요"
        exit 1
    fi
else
    report "[2/6] GGUF 파일 없음 — 수동 변환 필요"
    exit 1
fi

# ─── [3/6] Benchmark: base vs fine-tuned ───
echo ""
echo "[3/6] Running benchmark (20 scenarios)..."
report "[3/6] 벤치마크 시작 — base vs $MODEL_NAME"

cd /home/u2dia/github/gemma4-particle-edu
node scripts/benchmark-finetune.js --model="$MODEL_NAME" --base=gemma4 2>&1 | tee /tmp/benchmark-result.txt

# Extract results
BASE_SCORE=$(grep "gemma4 " /tmp/benchmark-result.txt | awk '{print $2}')
FT_SCORE=$(grep "$MODEL_NAME" /tmp/benchmark-result.txt | awk '{print $2}')
report "[3/6] 벤치마크 완료 — base: $BASE_SCORE, fine-tuned: $FT_SCORE"

# ─── [4/6] Update Kaggle dataset ───
echo ""
echo "[4/6] Updating Kaggle dataset..."
if [ -f "data/benchmark-finetune.json" ]; then
    KAGGLE_API_TOKEN="${KAGGLE_API_TOKEN:-}"
    if [ -n "$KAGGLE_API_TOKEN" ]; then
        cp data/benchmark-finetune.json kaggle-upload/
        cd kaggle-upload
        kaggle datasets version -p . -m "Add fine-tuning benchmark results" 2>&1 | tail -3
        cd -
        report "[4/6] Kaggle 데이터셋 업데이트 완료"
    else
        report "[4/6] KAGGLE_API_TOKEN 없음 — 수동 업로드 필요"
    fi
else
    report "[4/6] benchmark-finetune.json 없음"
fi

# ─── [5/6] Git commit ───
echo ""
echo "[5/6] Committing results..."
git add data/benchmark-finetune.json 2>/dev/null
git commit -m "Add fine-tuning benchmark: base vs $MODEL_NAME

$(cat /tmp/benchmark-result.txt | tail -5)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>" 2>/dev/null
git push origin main 2>/dev/null
report "[5/6] 결과 git push 완료"

# ─── [6/6] Summary ───
echo ""
echo "═══════════════════════════════════════════════"
echo " POST FINE-TUNING COMPLETE"
echo "═══════════════════════════════════════════════"
echo "  Model: $MODEL_NAME (Ollama)"
echo "  Backup: $BACKUP_DIR"
echo "  Benchmark: data/benchmark-finetune.json"
echo "  Base score: $BASE_SCORE"
echo "  Fine-tuned: $FT_SCORE"
echo ""

report "[6/6] 파인튜닝 후속 작업 전체 완료 — base: $BASE_SCORE → FT: $FT_SCORE"

# Mark ticket done
curl -s -X PUT "$KANBAN/api/tickets/$TICKET/status" \
  -H "Content-Type: application/json" -d '{"status":"Done"}' > /dev/null
