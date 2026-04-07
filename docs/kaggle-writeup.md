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

For web deployment, the same pipeline runs with Gemini 2.5 Pro as a fallback when Ollama is unavailable. The pipeline, prompts, and 138-material reference database are identical.

---

## Technical Architecture

**Physics Engine**: Custom Verlet integration with 25,000 particles. Forces: gravity, springs, wind, viscosity, thermal agitation, seismic, flood buoyancy, Coulomb charge interaction, electric field, gate barrier. All SI units.

**138 Materials**: Steel (7850 kg/m3), water (1000), graphene (2267), DNA (1700), plasma (1025), diamond (3515), aerogel (100), blood (1060), etc. All with density, gravity, temperature, spring stiffness from CRC/NIST references.

**Rendering**: Three.js WebGL with neon bloom, instanced mesh for 25K particles at 60fps.

**Templates**: 30 built-in templates including buildings, bridges, DNA, galaxies, transistors, circuits, plus 10 AP Physics education presets (free fall, projectile motion, pendulum, wave interference, etc.)

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

The web demo uses Gemini Pro as a cloud fallback for accessibility, but the pipeline is identical. The Kaggle notebook demonstrates Ollama + Gemma 4 running on Kaggle GPU.

---

## Impact

- **Free**: Zero subscription, zero API cost via Ollama
- **Offline**: Full functionality without internet
- **Deployed**: Running in Visual Science Lab (8,470 installs)
- **Bilingual**: Korean + English i18n (124 labels + 60 presets)
- **Open source**: MIT license, teachers can extend
- **27 E2E tests passing**: Verified quality

---

## Links

- **Video**: [https://youtu.be/3e-LZPHBA2M](https://youtu.be/3e-LZPHBA2M)
- **GitHub**: [https://github.com/U2SY26/gemma4-particle-edu](https://github.com/U2SY26/gemma4-particle-edu)
- **Live Demo**: [https://gemma4-particle-edu.vercel.app](https://gemma4-particle-edu.vercel.app)
- **Benchmark Dataset**: [Kaggle](https://www.kaggle.com/datasets/syu21125/gemma4-particle-edu-benchmark-300)
- **3dweb App**: [Google Play](https://play.google.com/store/apps/details?id=com.sciencelab.science_lab_flutter)
