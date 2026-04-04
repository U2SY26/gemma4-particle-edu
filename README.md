# Gemma 4 Particle Edu

### Interactive 3D Physics Simulation Education Platform / 대화형 3D 물리 시뮬레이션 교육 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Free, interactive 3D physics simulation education platform powered by **Gemma 4** and **Ollama**. The open-source alternative to paid interactive simulations like Claude Artifacts.

Students can describe physical phenomena in natural language and watch them come to life through real-time particle simulations with neon bloom rendering.

---

## Features

- **Chat-first interface** -- Ask physics questions in natural language and get real-time 3D simulations
- **Real-time 3D simulation** -- Verlet integration physics engine with SI-unit accuracy
- **5 procedural structure types** -- Bridge, building, tower, wall, arch
- **10 real materials** -- Steel, wood, concrete, rubber, glass and more with real SI-unit properties
- **Neon bloom WebGL rendering** -- Stunning visual effects powered by Three.js
- **WebXR VR support** -- Immersive physics exploration in virtual reality
- **Korean / English i18n** -- Full multilingual support
- **Works offline with Ollama** -- No cloud API keys or subscriptions required

---

## Quick Start

```bash
git clone https://github.com/U2SY26/gemma4-particle-edu.git
cd gemma4-particle-edu
npm install
npm start
# Open http://localhost:3000
```

### With Gemma 4 (Full AI Features)

To unlock AI-powered natural language physics simulation, install and run [Ollama](https://ollama.com/) with the Gemma 4 model:

```bash
ollama pull gemma4
ollama serve
npm start
```

The server automatically detects Ollama at `http://localhost:11434`. To use a custom Ollama host, set the environment variable:

```bash
OLLAMA_BASE=http://your-ollama-host:11434 npm start
```

### Demo Mode

Without Ollama, the app works with **preset simulations** and **keyword-based NLP fallback**. No setup required -- just run `npm start` and explore the built-in physics demos.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Vanilla JS** | Frontend -- no framework overhead |
| **Three.js** | WebGL 3D rendering with bloom post-processing |
| **Express.js** | Backend server and Ollama proxy |
| **Gemma 4** | AI model for natural language understanding (via Ollama) |
| **Verlet Integration** | Physics engine with SI-unit accuracy |

---

## Architecture

```
+--------------------------------------------------+
|                   Browser                        |
|                                                  |
|  +------------------+  +---------------------+   |
|  |   Chat Panel     |  |  3D Simulation      |   |
|  |   (Left Side)    |  |  (Right Side)       |   |
|  |                  |  |                     |   |
|  |  User input      |  |  Three.js WebGL     |   |
|  |  AI responses    |  |  Bloom renderer     |   |
|  |  NLP fallback    |  |  Verlet physics     |   |
|  +--------+---------+  +----------+----------+   |
|           |                       |              |
+-----------+-----------+-----------+--------------+
            |                       |
            v                       v
+--------------------------------------------------+
|              Express.js Server                   |
|                                                  |
|  GET  /api/status  -- Ollama health check        |
|  POST /api/chat    -- SSE streaming proxy        |
|  Static files      -- index.html, js/, css/      |
+---------------------------+----------------------+
                            |
                            v
                  +-------------------+
                  |  Ollama (local)   |
                  |  Gemma 4 model    |
                  +-------------------+
```

**Chat-First Layout**: Left panel for natural language chat, right panel for real-time 3D physics simulation. The Express.js server proxies chat requests to Ollama with SSE streaming for responsive AI interactions.

---

## Testing

```bash
npm test           # Unit tests (Vitest)
npm run test:e2e   # E2E tests (Playwright)
```

---

## Deployment

### Vercel

This project includes a `vercel.json` configuration for one-click deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/U2SY26/gemma4-particle-edu)

> **Note**: Vercel deployment runs the app in demo mode (keyword-based NLP fallback) since Ollama requires a local GPU. For full AI features, run locally with Ollama.

### Local with Ollama

For the full Gemma 4 AI experience, run the server locally with Ollama installed. See [Quick Start](#quick-start) above.

---

## Competition

**[Kaggle Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon)** -- $200,000 total prize pool

- **Track**: Future of Education + Ollama Special Tech
- **Goal**: Make science education interactive and accessible using Gemma 4
- **Deadline**: 2026-05-18 (UTC 23:59)

---

## License

[MIT](LICENSE)

---

## Attribution

- **[Gemma 4](https://ai.google.dev/gemma)** by Google DeepMind (Apache 2.0 License)
- **[Three.js](https://threejs.org/)** (MIT License)
- **[Ollama](https://ollama.com/)** (MIT License)
- **[Express.js](https://expressjs.com/)** (MIT License)

---

Made by [U2DIA](https://www.u2dia.com) for the [Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon)
