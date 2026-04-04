---
name: Gemma 4 Model Config
description: 사용 가능한 Gemma 4 모델 목록과 벤치마크 대상. RTX 5090 32GB.
type: project
---

GPU: NVIDIA RTX 5090 32GB VRAM

벤치마크 대상 모델:
- gemma4:latest (E4B, 8B) — 9.6GB, 기본
- gemma4:26b (MoE) — 18GB, 고품질
- gemma4:31b — 20GB, 최고 품질

**Why:** 대회 제출 시 어떤 모델이 물리 시뮬레이션 파라미터를 가장 정확하게 생성하는지 비교 필요.

**How to apply:** 벤치마크 시 3개 모델 순차 비교, Writeup에 모델별 정확도 포함.
