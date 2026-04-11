# Gemma 4 Particle Edu: Free 3D Physics Simulation via Ollama

**Track**: Future of Education (Impact) + Ollama (Special Technology)

---

## The Problem

Physics is spatial and dynamic, but we teach it with static diagrams. Interactive simulation tools exist but cost $20+/month (Claude Artifacts) or hundreds per license. Students in underfunded schools have no access.

We built a free, open-source 3D physics simulation platform where students describe phenomena in natural language and watch them unfold in real time with accurate SI-unit physics. Runs locally via Ollama -- zero cost, zero cloud dependency.

---

## How It Works

Left panel: conversational AI tutor. Right panel: real-time 3D simulation with 25,000 particles.

1. Student types: "What happens to a concrete building in a magnitude 7 earthquake?"
2. Gemma 4 runs a 5-step DAG reasoning pipeline (Analyze, Research, Design, Generate, Validate) -- each step visible to the student in real time
3. The physics engine renders the building with particles and spring connections. Earthquake begins. Stress propagates visually.
4. Gemma 4 suggests follow-ups: "What if you switch to steel? Try increasing foundation depth."

---

## How Gemma 4 Is Used

Gemma 4 31B (Q4_K_M, 20.3GB) runs locally via Ollama and powers a **5-step DAG pipeline** where each step's output feeds the next:

| Step | Role |
|------|------|
| ANALYZE | Identify object, domain, scale from natural language |
| RESEARCH | Look up exact SI physical values (138-material reference table injected) |
| DESIGN | Plan particle layout using 15 shapes + 6 connection types |
| GENERATE | Produce simulation JSON with all physics parameters |
| VALIDATE | Self-check against physical reality, correct errors |

Single-call mode: 84% pass rate. 5-step DAG: 99.4%.

**Gemma 4 Vision**: Students can upload photos of physical objects. Gemma 4's multimodal capability analyzes the image and generates a corresponding simulation.

**Electromagnetic Physics**: Real Coulomb force calculation (Particle-in-Cell, O(n)), electric field force (F=qE), and gate voltage control for transistor simulations. Students manipulate E-field sliders and watch charged particles respond.

**Cloud Deployment**: When Ollama is unavailable, the same pipeline runs with **Gemma 4 31B via Google AI Studio** (`generativelanguage.googleapis.com`). Same API, same prompts, same 138-material reference database — the only difference is the inference backend. Activated via `?model=gemma4` URL parameter. Gemini 2.5 Pro serves as a secondary fallback. Thought tokens from Gemma 4's reasoning are filtered server-side.

**Function Calling on AI Studio Gemma 4**: The `lookup_material()` tool (138-material SI database) is exposed to Gemma 4 via Google's `functionDeclarations` format. The server performs a non-streaming call to detect `functionCall` parts, executes the tool locally against `REFERENCE_MATERIALS`, sends the `functionResponse` back, and streams the final answer as `provider: "gemma4+tools"`. A shared module (`api/chat-tools.js`) is imported by both `api/chat.js` (Vercel) and `server.js` (Express local) to keep Ollama and AI Studio paths in sync. AI Studio access is **free** (15 RPM, ~1,000 RPD, no credit card) — the same Gemini API key unlocks Gemma 4.

---

## Fine-tuning all Gemma 4 sizes (Unsloth + Lambda GPU)

We fine-tuned **all four Gemma 4 sizes** (E4B 4.5B, 26B-A4B MoE, 31B Dense) via Unsloth QLoRA on 907 Alpaca physics simulation pairs. Training on Lambda A10 (E4B) and GH200 96GB (26B, 31B). Total GPU budget: **$7.50** of our $7,500 Lambda credit.

| Model | Type | JSON | Physics | Time | Cost |
|-------|------|------|---------|------|------|
| Base 9B | Dense | 30% | 0% | 12.7s | - |
| **E4B FT** | QLoRA r=16 | **70%** | **77%** | **8.9s** | **$0.55** |
| Base 26B MoE | MoE | 95% | 22% | 9.3s | - |
| 26B FT | QLoRA r=8 | 90% | 31% | 9.3s | $2.40 |
| Base 31B | Dense | 100% | 21% | 20.6s | - |
| 31B shallow | r=8, 1ep | 100% | 18% | 21.1s | $2.55 |
| 31B deep | r=64, 3ep | 100% | 18% | 20.0s | $2.55 |

**E4B QLoRA is cost-optimal**: $0.55 for +40%p JSON and +77%p physics accuracy. Larger bases (26B, 31B) already achieve 95-100% JSON parsing, so the 907-pair dataset cannot move them further. All LoRA adapters are converted to GGUF via llama.cpp (CPU only) and registered in Ollama.

**Function calling** — layered on top of any model — closes the remaining physics accuracy gap by using `lookup_material()` to fetch exact SI values instead of letting the model guess.

---

## Technical Architecture

**Physics Engine**: Custom Verlet integration with 25,000 particles. Forces: gravity, springs, wind, viscosity, thermal agitation, seismic, flood buoyancy, Coulomb charge interaction, electric field, gate barrier. All SI units. Structural stability verified by automated Playwright tests: (1) 30-second pyramid drift test — spread stays constant to 4 decimal places (6.56×9.65×8.75 m), max particle velocity 0.006 m/s, drift under 0.1%; (2) **30-template batch stability test — all 30 built-in templates (pyramid, skyscraper, bridge, tornado, solar_system, transistor, circuit, DNA, protein, galaxy, etc.) stay stable for 20 seconds each with zero explosions, zero NaN particles, max velocity ≤ 0.78 m/s across the entire suite**. Explosion fix: particles snap to target positions at structure build time + spring displacement clamped to 5× rest length.

**138 Materials**: Steel (7850 kg/m3), water (1000), graphene (2267), DNA (1700), plasma (1025), diamond (3515), aerogel (100), blood (1060), etc. All with density, gravity, temperature, spring stiffness from CRC/NIST references.

**Rendering**: Three.js WebGL with neon bloom, instanced mesh for 25K particles at 60fps.

**Templates**: 60 built-in presets across buildings, bridges, towers, weather, nature, education — including 10 AP Physics curriculum presets (free fall, projectile motion, pendulum, wave interference, etc.)

---

## Benchmark: 300 Scenarios

Ran locally via Ollama (Gemma 4 31B, RTX 5090, 17h 43m). Evaluation: pass/fail per physics parameter.

| Metric | Value |
|--------|-------|
| Scenarios | 300 |
| Passed all checks | 293 (99.4%) |
| Materials | 138 (all with SI values) |
| Density accuracy | 93.8% exact match, avg error 3.17% |
| Gravity (Earth scenarios) | 143/143 exact (0.00% error) |
| Failures | 7 (extreme astrophysics only) |

Limitations: Binary pass/fail evaluation. Reference table injected into prompts. No novel-material testing. Full data published as Kaggle dataset.

---

## Real-World Deployment

Gemma 4 Particle Edu is deployed as a module within **Visual Science Lab** (3dweb), an educational app on Google Play with **8,470 installs and 3,680 active devices**. Students access particle simulations directly within the app via iframe embedding with URL parameter support (?prompt=pyramid&lang=ko).

This is not a demo-only project. It serves real students in a production educational app.

---

## Why Ollama Matters

The entire 300-scenario benchmark ran locally via Ollama with zero API cost.

- Model: Gemma 4 31B Q4_K_M (20.3GB), Ollama 0.20.2
- Hardware: Single RTX 5090, 17 hours 43 minutes
- Student data never leaves the machine
- Works offline after initial model download
- Schools with restricted internet can use it

The web demo supports **Gemma 4 31B via Google AI Studio** as a cloud fallback (`?model=gemma4`), using the same pipeline and prompts. Gemini 2.5 Pro serves as a secondary fallback. The Kaggle notebook demonstrates Ollama + Gemma 4 running on Kaggle GPU.

---

## Impact

- **Free**: Zero subscription, zero API cost via Ollama
- **Offline**: Full functionality without internet
- **Deployed**: Running in Visual Science Lab (8,470 installs)
- **Bilingual**: Korean + English i18n (124 labels + 60 presets)
- **Open source**: MIT license, teachers can extend
- **50 E2E tests passing**: Including 30-second pyramid drift test (0.1% drift), 30-template × 20-second batch stability (30/30 stable, zero explosions), and a live production smoke test

---

## Links

- **Video**: [https://youtu.be/RfKFMAT6lk0](https://youtu.be/RfKFMAT6lk0)
- **GitHub**: [https://github.com/U2SY26/gemma4-particle-edu](https://github.com/U2SY26/gemma4-particle-edu)
- **Live Demo**: [https://gemma4-particle-edu.vercel.app](https://gemma4-particle-edu.vercel.app)
- **Benchmark Dataset**: [Kaggle](https://www.kaggle.com/datasets/syu21125/gemma4-particle-edu-benchmark-300)
- **3dweb App**: [Google Play](https://play.google.com/store/apps/details?id=com.sciencelab.science_lab_flutter)
