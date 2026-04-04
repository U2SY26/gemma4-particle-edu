# Gemma 4 Particle Edu: Free Interactive 3D Physics Simulation Powered by Gemma 4 + Ollama

**Track Selection**
- Primary: **Future of Education** (Impact Track)
- Secondary: **Ollama** (Special Technology Track)

---

## The Problem: Physics Shouldn't Be a Spectator Sport

A student opens her textbook to the chapter on structural mechanics. There's a diagram of a bridge with arrows showing force distribution. It's flat, static, and silent. She memorizes the formula, passes the exam, and forgets it within a month.

This is the state of physics education for most of the world. The concepts are inherently spatial and dynamic -- forces propagate through structures, materials deform under stress, buildings oscillate during earthquakes -- yet we teach them with 2D diagrams frozen on a page. The tools that could change this exist, but they're locked behind paywalls. Commercial simulation software costs hundreds of dollars per license. AI-powered interactive tools like Claude Artifacts, which can generate one-off simulations on demand, require a $20/month subscription. For students in developing countries, rural schools, or underfunded programs, these aren't options.

We built Gemma 4 Particle Edu to change that equation: a free, open-source, offline-capable 3D physics simulation platform powered by Gemma 4 running locally through Ollama. No subscriptions. No cloud dependency. No barriers.

---

## The Solution: Conversation-Driven Physics Lab

Gemma 4 Particle Edu puts a conversational AI physics tutor on the left side of the screen and a real-time 3D simulation on the right. Students learn by asking questions and watching the physics unfold.

A typical session looks like this:

1. The student types: *"What happens to a concrete 5-story building in a magnitude 7 earthquake?"*
2. Gemma 4 explains the relevant physics -- concrete's yield strength of 30 MPa, how seismic waves propagate through foundations, what lateral forces do to rigid structures -- and generates a JSON configuration for the simulation engine.
3. The 3D view renders a concrete building assembled from particles and spring-damper connections. The earthquake begins. Particles shift color from green (safe) through yellow (warning) to red (yield/failure) as stress propagates through the structure in real time.
4. Gemma 4 analyzes the result and suggests follow-up experiments: *"What if you switch to a steel-reinforced frame? Try increasing the foundation depth to 3 meters."*
5. The student iterates, building intuition through guided experimentation.

This is not a chatbot that generates throwaway code snippets. It's a dedicated physics engine guided by an AI tutor that understands what it's teaching.

---

## How Gemma 4 Powers the Experience

Gemma 4 serves three distinct roles in the system:

**Natural Language to Simulation Parameters.** When a student describes a scenario, Gemma 4 parses the intent and generates a structured JSON configuration -- structure type, material properties, environmental forces, boundary conditions -- that the physics engine consumes directly. The system prompt constrains Gemma 4 to output well-formed simulation configs with SI-unit values, ensuring consistency between explanation and execution.

**Educational Explanation.** Gemma 4 doesn't just set up simulations; it teaches. Every response includes physics context grounded in real units: density in kg/m^3, yield strength in Pascals, thermal expansion coefficients per Kelvin. Students see the numbers that drive the simulation and understand why the structure behaves as it does.

**Guided Exploration.** After each simulation, Gemma 4 proposes follow-up experiments that deepen understanding. This transforms a single question into a learning trajectory -- from "what happens" to "why" to "what if."

All three roles run entirely on Gemma 4 via Ollama on the student's local machine. Zero API costs, full data privacy, and no internet requirement after initial setup.

---

## Technical Architecture

The platform is built on four layers:

**AI Layer -- Gemma 4 via Ollama.** The Express.js server proxies requests to Ollama's local API with streaming SSE responses, giving students real-time typing feedback. A carefully engineered system prompt ensures Gemma 4 outputs both human-readable explanations and machine-parseable JSON in a single response. When Ollama is unavailable, a keyword-based NLP fallback keeps basic simulation functionality working -- the platform degrades gracefully rather than breaking.

**Physics Engine -- Custom Verlet Integration.** Position-based Verlet integration (newPos = 2*pos - prevPos + acc*dt^2) with spring-damper systems for structural connections. The engine handles gravity, wind forces, seismic oscillation, temperature effects on material strength, collision detection, and ground friction -- all in SI units with a 60Hz default timestep. Stress is computed per-particle based on spring deformation relative to material yield strength, enabling realistic structural failure visualization.

**Material Database -- 10 Real Materials.** Iron, concrete, aluminum, copper, wood, glass, rubber, titanium, carbon steel, and stainless steel -- each with physically accurate density, yield strength, elastic modulus, and thermal expansion coefficient. A temperature-dependent strength model reduces material capacity at elevated temperatures, enabling fire and thermal scenarios.

**Rendering -- Three.js WebGL with Bloom Post-Processing.** InstancedMesh rendering supports 4,096 particles and 8,192 springs at interactive frame rates. A stress-to-color mapping (green/yellow/red) provides immediate visual feedback on structural health. Unreal Bloom post-processing creates a distinctive neon aesthetic that makes simulations visually engaging for students.

**Structure Generation.** Five procedural structure types -- bridge, building, tower, wall, and arch -- are generated as particle-spring networks with configurable dimensions and materials. Each type has physically reasonable default parameters (e.g., a bridge defaults to iron with 10m span; a building defaults to concrete with 5 floors).

---

## Why Not Just Use an AI Code Generator?

Tools like Claude Artifacts can generate physics simulations on the fly. But there is a fundamental difference in approach. Code-generation tools produce a new, one-off program for each request. The physics accuracy depends entirely on what the model happens to generate -- there is no guarantee of consistent material properties, correct unit handling, or physically valid integration. Each simulation is isolated; you can't meaningfully compare results across runs.

Gemma 4 Particle Edu separates concerns. The physics engine is deterministic and validated. Material properties are sourced from engineering references. Gemma 4's role is to translate natural language into parameters for this engine, not to reinvent the physics from scratch each time. The result is reproducible, comparable, and educationally trustworthy.

| | AI Code Generation | Gemma 4 Particle Edu |
|---|---|---|
| Cost | $20/month | Free |
| Model | Closed source | Open (Gemma 4) |
| Physics | Regenerated each time | Dedicated validated engine |
| Offline | No | Yes, via Ollama |
| Consistency | Varies per generation | SI-unit based, reproducible |
| Materials | Whatever the model invents | 10 real materials with reference properties |

---

## Impact and Accessibility

**Free and offline-capable.** Once Ollama and the Gemma 4 model are downloaded, the entire platform runs without internet. This is critical for schools in regions with limited or expensive connectivity.

**Multilingual.** Full Korean and English support, with Gemma 4 automatically responding in the student's language. The i18n system covers all UI elements.

**Educationally grounded.** Every number in the system traces back to real physical properties. Students develop quantitative intuition, not just qualitative understanding.

**Open source.** The entire codebase is publicly available. Teachers can extend it with new materials, structure types, or educational scenarios tailored to their curriculum.

---

## Testing and Quality

The project includes 266 unit tests across 10 modules and 298 end-to-end tests covering 8 categories: functionality, design quality, accessibility, API integration, legal compliance, internationalization, performance/security, and responsive layout. All modules follow strict interface contracts documented in a shared interfaces file.

---

## Future Work

- Additional structure types: dam, suspension bridge, skyscraper
- Mobile-optimized touch controls for tablet use in classrooms
- Collaborative simulation sharing between students
- Fine-tuned Gemma 4 model specialized for physics domain knowledge

---

## Links

- **GitHub**: [https://github.com/U2SY26/gemma4-particle-edu](https://github.com/U2SY26/gemma4-particle-edu)
- **Live Demo**: [Vercel URL]
