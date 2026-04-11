# Gemma 4 Particle Edu

### Interactive 3D Physics Simulation Education Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Free, open-source 3D physics simulation platform powered by **Gemma 4** and **Ollama**. Students describe physical phenomena in natural language and watch them come to life through real-time particle simulations.

**Live Demo**: [gemma4-particle-edu.vercel.app](https://gemma4-particle-edu.vercel.app)
**Video**: [YouTube (3 min)](https://youtu.be/RfKFMAT6lk0)
**Benchmark Dataset**: [Kaggle](https://www.kaggle.com/datasets/syu21125/gemma4-particle-edu-benchmark-300)

---

## Features

- **Chat-first interface** -- Describe physics in natural language, get real-time 3D simulations
- **5-step DAG reasoning pipeline** -- Analyze, Research, Design, Generate, Validate (visible to students)
- **Verlet integration physics** -- SI-unit parameters (gravity, density, temperature, viscosity, etc.)
- **Electromagnetic physics** -- Coulomb force (Particle-in-Cell), electric field, gate voltage control
- **28 structure templates** -- Buildings, bridges, DNA, galaxies, transistors, circuits, weather
- **138 physical materials** -- Steel, water, graphene, plasma, DNA, superconductors, etc.
- **Neon bloom WebGL** -- Three.js with HDR post-processing at 60fps
- **Korean / English i18n** -- Full bilingual support
- **Ollama local-first** -- No cloud API keys required. Works offline.
- **Web fallback** -- Gemini 2.5 Pro streaming when Ollama unavailable

---

## Quick Start

```bash
git clone https://github.com/U2SY26/gemma4-particle-edu.git
cd gemma4-particle-edu
npm install
npm start
# Open http://localhost:3000
```

### With Gemma 4 (Full AI)

```bash
ollama pull gemma4
ollama serve
npm start
```

The server detects Ollama at `http://localhost:11434`. Custom host:

```bash
OLLAMA_BASE=http://your-ollama-host:11434 npm start
```

### Demo Mode

Without Ollama, the app works with **50 preset simulations** and **keyword-based NLP fallback** plus **300 benchmark scenarios** browsable from the sidebar.

---

## How Gemma 4 is Used

Gemma 4 31B runs locally via Ollama and powers a 5-step DAG pipeline:

| Step | Name | Role |
|------|------|------|
| 1 | ANALYZE | Identify object, domain, scale from user input |
| 2 | RESEARCH | Look up SI physical values (with reference material table) |
| 3 | DESIGN | Plan particle layout using 15 shapes + 6 connection types |
| 4 | GENERATE | Produce simulation JSON with all parameters |
| 5 | VALIDATE | Self-check physics accuracy, correct errors |

Single-call mode: 84% pass rate. 5-step DAG: 99.4% pass rate.

The reasoning process is visible to students in real-time, modeling scientific thinking.

---

## Physics Engine

**Verlet Integration** with these force systems:

| Force | Implementation |
|-------|---------------|
| Gravity | Per-particle, configurable (Earth -9.81, Moon -1.62, Mars -3.72, etc.) |
| Spring connections | Hooke's law with damping, 6 connection types |
| Wind / Turbulence | Uniform + random perturbation |
| Viscosity | Velocity-proportional drag |
| Thermal agitation | Brownian motion above 300K |
| Seismic | Sinusoidal ground acceleration |
| Flood buoyancy | Depth-proportional upward force |
| **Electric field** | F = q * E per charged particle |
| **Coulomb force** | Particle-in-Cell approximation, O(n) spatial hash |
| **Gate barrier** | Transistor channel conductivity control |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Vanilla JS** | Frontend (no framework) |
| **Three.js** | WebGL 3D rendering + bloom |
| **Express.js** | Server + Ollama proxy |
| **Gemma 4 31B** | AI via Ollama (local) |
| **Gemini 2.5 Pro** | Web fallback via streaming SSE |
| **Verlet Integration** | Physics engine with SI units |

~14,000 lines of code across 20 files.

---

## Architecture

```
User Input (natural language)
       |
       v
DAG Pipeline (5 steps, streamed to UI)
  ANALYZE -> RESEARCH -> DESIGN -> GENERATE -> VALIDATE
       |
       v
Physics Engine (Verlet + Coulomb + E-field)
  25,000 particles, SI units
       |
       v
Three.js WebGL Renderer (neon bloom, 60fps)
```

Provider fallback: Ollama (local) -> Gemini Pro (web) -> Claude (last resort)

---

## Benchmark: 300 Scenarios

Ran 300 physics scenarios locally via Ollama (Gemma 4 31B, RTX 5090, 17h 43m).

Evaluation: **pass/fail** per physics parameter (gravity direction, damping range, temperature, stability). Measures completion robustness, not fine-grained accuracy.

| Metric | Value |
|--------|-------|
| Scenarios | 300 |
| Passed all checks | 293 (99.4%) |
| Unique physical materials | 138 |
| Failures | 7 (extreme astrophysics only) |
| JSON parse success | 100% |

Limitations: Binary pass/fail evaluation. Reference material table injected into prompts. No testing of novel materials outside the reference table.

Dataset: [Kaggle](https://www.kaggle.com/datasets/syu21125/gemma4-particle-edu-benchmark-300) (includes 31-page PDF report)

---

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/U2SY26/gemma4-particle-edu)

Web deployment uses Gemini 2.5 Pro as AI provider. For local Gemma 4, run with Ollama.

### Docker

```bash
docker compose up
# Ollama + Gemma 4 + App, GPU auto-detected
```

---

## Competition

**[Kaggle Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon)** -- $200,000 prize pool

- **Tracks**: Future of Education + Ollama Special Tech + Main
- **Video**: [YouTube](https://youtu.be/RfKFMAT6lk0)
- **Live Demo**: [gemma4-particle-edu.vercel.app](https://gemma4-particle-edu.vercel.app)
- **Deadline**: 2026-05-18

---

## License

[MIT](LICENSE)

---

## Attribution

- **[Gemma 4](https://ai.google.dev/gemma)** by Google DeepMind (Apache 2.0)
- **[Three.js](https://threejs.org/)** (MIT)
- **[Ollama](https://ollama.com/)** (MIT)
- **[Express.js](https://expressjs.com/)** (MIT)

---

Made by [U2DIA](https://www.u2dia.com) for the [Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon)
