"""
Gemma 4 E4B Physics Education Fine-tuning
Using Unsloth QLoRA on Lambda A10 (24GB) or local RTX 5090 (32GB)

SAFETY:
- Checkpoint every epoch (resume from crash)
- Auto-upload to HuggingFace Hub after training
- Auto-shutdown Lambda instance after completion
- Total cost: ~$2-3 for full pipeline

Usage:
  # On Lambda:
  bash scripts/lambda-train.sh

  # Local (RTX 5090):
  python scripts/train-gemma4-physics.py --no-shutdown
"""

import os
import sys
import json
import time
import subprocess
import torch
from pathlib import Path

# ═══════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════

MODEL_NAME = "google/gemma-2-4b-it"  # Gemma 4 E4B
MAX_SEQ_LEN = 2048
LORA_RANK = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LEARNING_RATE = 2e-4
EPOCHS = 3
BATCH_SIZE = 4
GRADIENT_ACCUMULATION = 4
OUTPUT_DIR = "models/gemma4-physics-edu"
DATA_FILE = "data/training-data.jsonl"
HF_REPO = "syu21125/gemma4-physics-edu"  # HuggingFace Hub backup
AUTO_SHUTDOWN = "--no-shutdown" not in sys.argv

print("=" * 60)
print(" GEMMA 4 PHYSICS EDUCATION FINE-TUNING")
print("=" * 60)
print(f"  Model: {MODEL_NAME}")
print(f"  LoRA: rank={LORA_RANK}, alpha={LORA_ALPHA}")
print(f"  Data: {DATA_FILE}")
print(f"  Auto-shutdown: {AUTO_SHUTDOWN}")
print(f"  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
if torch.cuda.is_available():
    vram = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"  VRAM: {vram:.1f} GB")
    if vram < 20:
        print("  WARNING: <20GB VRAM, may OOM. Consider reducing batch size.")
print("=" * 60)

start_time = time.time()

# ═══════════════════════════════════════════
# LOAD MODEL + LoRA
# ═══════════════════════════════════════════

from unsloth import FastLanguageModel

print("\n[1/5] Loading model with 4-bit quantization...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LEN,
    dtype=None,
    load_in_4bit=True,
)

print("[2/5] Adding LoRA adapter...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# ═══════════════════════════════════════════
# LOAD DATA
# ═══════════════════════════════════════════

from datasets import Dataset
from trl import SFTTrainer
from transformers import TrainingArguments

print(f"[3/5] Loading training data...")
with open(DATA_FILE) as f:
    raw_data = [json.loads(line) for line in f if line.strip()]
print(f"  {len(raw_data)} training pairs")

ALPACA_TEMPLATE = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""

def format_alpaca(sample):
    return {"text": ALPACA_TEMPLATE.format(**sample) + tokenizer.eos_token}

dataset = Dataset.from_list(raw_data).map(format_alpaca)

# ═══════════════════════════════════════════
# TRAIN with checkpoints
# ═══════════════════════════════════════════

print(f"[4/5] Training ({EPOCHS} epochs, {len(dataset)} samples)...")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    dataset_num_proc=2,
    packing=True,
    args=TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION,
        warmup_steps=10,
        num_train_epochs=EPOCHS,
        learning_rate=LEARNING_RATE,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=5,
        save_strategy="epoch",          # SAFETY: checkpoint every epoch
        save_total_limit=2,             # Keep last 2 checkpoints only
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=42,
        report_to="none",              # No wandb needed
    ),
)

# Check for existing checkpoint to resume from
last_checkpoint = None
if os.path.isdir(OUTPUT_DIR):
    checkpoints = sorted(Path(OUTPUT_DIR).glob("checkpoint-*"))
    if checkpoints:
        last_checkpoint = str(checkpoints[-1])
        print(f"  Resuming from checkpoint: {last_checkpoint}")

trainer_stats = trainer.train(resume_from_checkpoint=last_checkpoint)

elapsed_train = time.time() - start_time
print(f"\n  Training loss: {trainer_stats.training_loss:.4f}")
print(f"  Training time: {elapsed_train:.0f}s ({elapsed_train/60:.1f}min)")
print(f"  GPU peak memory: {torch.cuda.max_memory_reserved()/1e9:.1f} GB")

# Save final LoRA adapter
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"  LoRA adapter saved: {OUTPUT_DIR}")

# ═══════════════════════════════════════════
# EXPORT TO GGUF
# ═══════════════════════════════════════════

print(f"\n[5/5] Exporting to GGUF Q4_K_M...")
gguf_dir = f"{OUTPUT_DIR}-gguf"
model.save_pretrained_gguf(gguf_dir, tokenizer, quantization_method="q4_k_m")

# Create Ollama Modelfile
modelfile = f"""FROM ./{os.listdir(gguf_dir)[0] if os.path.isdir(gguf_dir) else 'model.gguf'}

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 2048

SYSTEM You are a physics simulation AI for Gemma 4 Particle Edu. Generate simulation JSON with accurate SI-unit physics parameters.
"""
with open(f"{gguf_dir}/Modelfile", "w") as f:
    f.write(modelfile)

print(f"  GGUF saved: {gguf_dir}")

# ═══════════════════════════════════════════
# BACKUP: Upload to HuggingFace Hub
# ═══════════════════════════════════════════

print(f"\n[BACKUP] Uploading to HuggingFace Hub: {HF_REPO}")
try:
    model.push_to_hub(HF_REPO, token=os.environ.get("HF_TOKEN"))
    tokenizer.push_to_hub(HF_REPO, token=os.environ.get("HF_TOKEN"))
    print(f"  LoRA adapter uploaded to: https://huggingface.co/{HF_REPO}")
except Exception as e:
    print(f"  Hub upload failed (non-critical): {e}")

# Also try uploading GGUF
try:
    model.push_to_hub_gguf(
        HF_REPO + "-gguf",
        tokenizer,
        quantization_method="q4_k_m",
        token=os.environ.get("HF_TOKEN"),
    )
    print(f"  GGUF uploaded to: https://huggingface.co/{HF_REPO}-gguf")
except Exception as e:
    print(f"  GGUF upload failed (non-critical): {e}")

# ═══════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════

total_time = time.time() - start_time
print(f"\n{'='*60}")
print(f" COMPLETE")
print(f"{'='*60}")
print(f"  Total time: {total_time:.0f}s ({total_time/60:.1f}min)")
print(f"  Training loss: {trainer_stats.training_loss:.4f}")
print(f"  LoRA: {OUTPUT_DIR}")
print(f"  GGUF: {gguf_dir}")
print(f"  Hub: https://huggingface.co/{HF_REPO}")
print(f"\n  To load in Ollama:")
print(f"    cd {gguf_dir}")
print(f"    ollama create gemma4-physics-edu -f Modelfile")
print(f"    ollama run gemma4-physics-edu")

# ═══════════════════════════════════════════
# AUTO-SHUTDOWN (Lambda safety — stop billing)
# ═══════════════════════════════════════════

if AUTO_SHUTDOWN:
    print(f"\n[SAFETY] Auto-shutdown in 60 seconds...")
    print(f"  Cancel with: kill {os.getpid()}")
    time.sleep(60)
    print(f"  Shutting down instance...")
    subprocess.run(["sudo", "shutdown", "-h", "now"])
else:
    print(f"\n  --no-shutdown flag set, instance stays running")
