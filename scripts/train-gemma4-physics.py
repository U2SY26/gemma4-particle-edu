"""
Gemma 4 E4B Physics Education Fine-tuning
Using Unsloth QLoRA on Lambda A10 (24GB) or local RTX 5090 (32GB)

Usage:
  pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
  pip install xformers trl datasets
  python scripts/train-gemma4-physics.py

Output: models/gemma4-physics-edu/ (LoRA adapter)
        models/gemma4-physics-edu.gguf (Ollama-ready)
"""

import os
import json
import torch
from unsloth import FastLanguageModel
from datasets import Dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# ═══════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════

MODEL_NAME = "google/gemma-2-4b-it"  # Gemma 4 E4B (Unsloth compatible ID)
MAX_SEQ_LEN = 2048
LORA_RANK = 16          # LoRA rank (8-64, higher = more capacity)
LORA_ALPHA = 32         # Usually 2x rank
LORA_DROPOUT = 0.05
LEARNING_RATE = 2e-4
EPOCHS = 3
BATCH_SIZE = 4
GRADIENT_ACCUMULATION = 4  # Effective batch = 16
OUTPUT_DIR = "models/gemma4-physics-edu"
DATA_FILE = "data/training-data.jsonl"

# ═══════════════════════════════════════════
# LOAD MODEL + LoRA
# ═══════════════════════════════════════════

print(f"Loading {MODEL_NAME} with 4-bit quantization...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LEN,
    dtype=None,  # Auto-detect (float16 on A10, bfloat16 on A100)
    load_in_4bit=True,
)

print(f"Adding LoRA adapter (rank={LORA_RANK})...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    bias="none",
    use_gradient_checkpointing="unsloth",  # 30% less VRAM
    random_state=42,
)

# ═══════════════════════════════════════════
# LOAD DATA
# ═══════════════════════════════════════════

print(f"Loading training data from {DATA_FILE}...")
with open(DATA_FILE) as f:
    raw_data = [json.loads(line) for line in f if line.strip()]

print(f"  {len(raw_data)} training pairs loaded")

# Alpaca prompt template
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
print(f"  Dataset: {len(dataset)} formatted samples")

# ═══════════════════════════════════════════
# TRAIN
# ═══════════════════════════════════════════

print(f"\nStarting training...")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch size: {BATCH_SIZE} × {GRADIENT_ACCUMULATION} = {BATCH_SIZE * GRADIENT_ACCUMULATION}")
print(f"  Learning rate: {LEARNING_RATE}")
print(f"  Max seq len: {MAX_SEQ_LEN}")
print(f"  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if torch.cuda.is_available() else "")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    dataset_num_proc=2,
    packing=True,  # Pack short samples together for efficiency
    args=TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION,
        warmup_steps=10,
        num_train_epochs=EPOCHS,
        learning_rate=LEARNING_RATE,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        save_strategy="epoch",
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=42,
    ),
)

gpu_stats = torch.cuda.get_device_properties(0) if torch.cuda.is_available() else None
start_gpu_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 2) if gpu_stats else 0

trainer_stats = trainer.train()

# ═══════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════

used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 2) if gpu_stats else 0
print(f"\nTraining complete!")
print(f"  Training loss: {trainer_stats.training_loss:.4f}")
print(f"  GPU memory used: {used_memory} GB")
print(f"  Training time: {trainer_stats.metrics['train_runtime']:.0f}s")

# Save LoRA adapter
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"  LoRA adapter saved to: {OUTPUT_DIR}")

# ═══════════════════════════════════════════
# EXPORT TO GGUF (Ollama-ready)
# ═══════════════════════════════════════════

print(f"\nExporting to GGUF (Q4_K_M)...")
model.save_pretrained_gguf(
    f"{OUTPUT_DIR}-gguf",
    tokenizer,
    quantization_method="q4_k_m",
)
print(f"  GGUF saved to: {OUTPUT_DIR}-gguf/")

# Create Ollama Modelfile
modelfile = f"""FROM {OUTPUT_DIR}-gguf/unsloth.Q4_K_M.gguf

PARAMETER temperature 0.3
PARAMETER top_p 0.9

SYSTEM You are a physics simulation AI for Gemma 4 Particle Edu. Generate simulation JSON with accurate SI-unit physics parameters. Always include a ```json block with {{"simulation":{{...}}}} format.
"""

with open(f"{OUTPUT_DIR}-gguf/Modelfile", "w") as f:
    f.write(modelfile)
print(f"  Ollama Modelfile created")
print(f"\n  To load in Ollama:")
print(f"    cd {OUTPUT_DIR}-gguf")
print(f"    ollama create gemma4-physics-edu -f Modelfile")
print(f"    ollama run gemma4-physics-edu")
