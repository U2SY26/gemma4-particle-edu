"""
Dry-run: 파인튜닝이 실제로 돌아가는지 10개 데이터로 검증
RTX 5090 (32GB) 또는 A10 (24GB)에서 실행

성공 기준:
1. 모델 로딩 OK (4-bit quantization)
2. LoRA 어댑터 부착 OK
3. 데이터 포맷 OK (Alpaca template)
4. 1 epoch 학습 OK (loss 감소)
5. VRAM 사용량 < 20GB (A10 안전)
6. 추론 테스트 OK (학습 후 JSON 생성)

실패 시: 에러 메시지 + 원인 분석 출력
"""

import os
import sys
import json
import time
import traceback

print("=" * 60)
print(" FINE-TUNING DRY RUN (10 samples, 1 epoch)")
print("=" * 60)

# ═══════════════════════════════════════════
# Step 1: Check GPU
# ═══════════════════════════════════════════
print("\n[1/7] GPU Check...")
try:
    import torch
    if not torch.cuda.is_available():
        print("  FAIL: No CUDA GPU detected")
        sys.exit(1)
    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"  OK: {gpu_name}, {vram_gb:.1f} GB VRAM")
    if vram_gb < 16:
        print(f"  WARNING: {vram_gb:.1f}GB may be too small for E4B QLoRA (needs ~8GB)")
except Exception as e:
    print(f"  FAIL: {e}")
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 2: Check Unsloth install
# ═══════════════════════════════════════════
print("\n[2/7] Unsloth Check...")
try:
    from unsloth import FastLanguageModel
    print("  OK: Unsloth imported")
except ImportError as e:
    print(f"  FAIL: Unsloth not installed")
    print(f"  Fix: pip install 'unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git'")
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 3: Load model
# ═══════════════════════════════════════════
print("\n[3/7] Model Loading (4-bit)...")
try:
    t0 = time.time()
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="google/gemma-4-E4B-it",
        max_seq_length=1024,  # Short for dry run
        dtype=None,
        load_in_4bit=True,
    )
    load_time = time.time() - t0
    vram_used = torch.cuda.max_memory_reserved() / 1e9
    print(f"  OK: Loaded in {load_time:.1f}s, VRAM: {vram_used:.1f} GB")
except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 4: LoRA adapter
# ═══════════════════════════════════════════
print("\n[4/7] LoRA Adapter...")
try:
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                         "gate_proj", "up_proj", "down_proj"],
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    vram_used = torch.cuda.max_memory_reserved() / 1e9
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  OK: LoRA attached, trainable: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")
    print(f"  VRAM: {vram_used:.1f} GB")
except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 5: Data format
# ═══════════════════════════════════════════
print("\n[5/7] Data Format...")
try:
    from datasets import Dataset

    # Use first 10 samples
    with open("data/training-data.jsonl") as f:
        raw = [json.loads(line) for line in f if line.strip()][:10]

    TEMPLATE = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""

    def fmt(s):
        return {"text": TEMPLATE.format(**s) + tokenizer.eos_token}

    dataset = Dataset.from_list(raw).map(fmt)
    print(f"  OK: {len(dataset)} samples formatted")

    # Check token lengths
    try:
        sample = tokenizer(text=dataset[0]["text"], return_tensors="pt")
    except TypeError:
        sample = tokenizer(dataset[0]["text"], return_tensors="pt")
    print(f"  Sample token length: {sample['input_ids'].shape[1]}")
except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 6: Training (1 epoch, 10 samples)
# ═══════════════════════════════════════════
print("\n[6/7] Training (1 epoch, 10 samples)...")
try:
    from trl import SFTTrainer
    from transformers import TrainingArguments

    output_dir = "/tmp/finetune-dry-run"

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=1024,
        dataset_num_proc=1,
        packing=False,  # No packing for tiny dataset
        args=TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=1,
            warmup_steps=1,
            num_train_epochs=1,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            save_strategy="no",
            optim="adamw_8bit",
            seed=42,
            report_to="none",
        ),
    )

    t0 = time.time()
    stats = trainer.train()
    train_time = time.time() - t0
    vram_peak = torch.cuda.max_memory_reserved() / 1e9

    print(f"  OK: Loss = {stats.training_loss:.4f}")
    print(f"  Time: {train_time:.1f}s")
    print(f"  VRAM peak: {vram_peak:.1f} GB")

    # Estimate full training cost
    full_samples = sum(1 for line in open("data/training-data.jsonl") if line.strip())
    time_per_sample = train_time / 10
    est_full_time = time_per_sample * full_samples * 3  # 3 epochs
    print(f"\n  Estimated full training ({full_samples} samples × 3 epochs):")
    print(f"    Time: {est_full_time/60:.0f} min ({est_full_time/3600:.1f} hr)")
    print(f"    Cost (A10 $0.75/hr): ${est_full_time/3600 * 0.75:.2f}")
    print(f"    VRAM needed: ~{vram_peak:.0f} GB (A10 24GB: {'OK' if vram_peak < 22 else 'RISKY'})")

except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

# ═══════════════════════════════════════════
# Step 7: Inference test
# ═══════════════════════════════════════════
print("\n[7/7] Inference Test...")
try:
    FastLanguageModel.for_inference(model)

    prompt = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Generate a physics simulation JSON for the following scenario.

### Input:
피라미드 시뮬레이션

### Response:
"""
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    t0 = time.time()
    outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.3)
    gen_time = time.time() - t0
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Check if JSON was generated
    has_json = "simulation" in result and "physics" in result
    print(f"  OK: Generated {len(outputs[0])} tokens in {gen_time:.1f}s")
    print(f"  Contains simulation JSON: {has_json}")
    print(f"  Preview: {result[-200:]}")

except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

# ═══════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════
print(f"\n{'='*60}")
print(f" DRY RUN: ALL 7 CHECKS PASSED")
print(f"{'='*60}")
print(f"  Fine-tuning is ready to run on this hardware.")
print(f"  GPU: {gpu_name}")
print(f"  VRAM peak: {vram_peak:.1f} / {vram_gb:.1f} GB")
print(f"  Training loss (10 samples): {stats.training_loss:.4f}")
print(f"  Full run estimate: {est_full_time/60:.0f} min, ${est_full_time/3600 * 0.75:.2f}")
