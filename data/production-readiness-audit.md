# Production Readiness Audit -- Particle Architect

**Auditor**: QA Automated Review  
**Date**: 2026-04-04  
**Scope**: gemma4-particle-edu (https://gemma4-particle-edu.vercel.app)  
**Files Reviewed**: index.html, css/style.css, js/app.js, js/SimulationManager.js, js/i18n.js, js/NeonRenderer.js, js/PhysicsEngine.js, js/ParticleSystem.js, js/ArchitectureGenerator.js, js/XRController.js, js/Materials.js, server.js, api/chat.js, api/status.js, vercel.json

---

## 1. First Impression (Page Load) -- Rating: 3/5

**What works:**
- The 3D WebGL canvas renders immediately on load with 25,000 ambient particles on the ground plane. Users see visual activity within 1-2 seconds.
- Top bar shows live particle count, FPS counter, and quality badge right away.
- Dark theme with neon glow is visually striking -- professional first impression.
- Bottom prompt bar provides immediate affordance for interaction.
- Auto-detection of GPU quality (LOW/MEDIUM/HIGH) prevents performance failures.

**Issues found:**
- **No loading indicator**: There is no splash screen, spinner, or skeleton UI while Three.js and the importmap CDN modules are loading. On slow connections the user sees a blank dark screen for several seconds before the canvas appears.
- **No welcome/onboarding flow**: First-time users see a dense sidebar of 50+ preset cards with no explanation of what the app does or how to start. The "AI CHAT" section with suggestion chips exists but is buried at the bottom of a long scrollable sidebar panel.
- **Sidebar auto-selects first preset and builds immediately**: The first card ("1F House") triggers `_buildStructure` on load, which may confuse users who did not expect anything to happen automatically.
- **Status text says "Ready" in English** even when language is set to Korean (hardcoded in `_init()`).
- **No `<title>` description**: The page title is just "Particle Architect" with no meta description or Open Graph tags for social sharing.

**Recommended fixes:**
1. [P1] Add a loading overlay/spinner that dismisses once `App._init()` completes.
2. [P1] Show the 3D canvas with ambient particles first; do NOT auto-build a structure until the user interacts.
3. [P2] Add a brief welcome modal or tooltip for first-time users explaining the app.
4. [P2] Use the i18n system for the initial status text ("Ready" -> use `t('ready')`).
5. [P3] Add Open Graph meta tags for link previews.

---

## 2. Chat Experience (Without Ollama) -- Rating: 2/5

**What works:**
- The fallback keyword NLP in `_processNaturalLanguage()` handles 10 recognized patterns (zero gravity, wind, elastic, viscous, slow, fast, hot, cold, reset, strong gravity) in both Korean and English.
- Suggestion chips are provided for quick prompts.
- Chat messages are styled distinctively (blue for user, green for assistant).
- Streaming message display works with a blinking cursor animation during SSE.

**Issues found:**
- **CRITICAL: API endpoint mismatch on Vercel.** The client calls `/api/ollama/status` and `/api/ollama/chat`, but the Vercel serverless functions are deployed at `/api/status` and `/api/chat` (no `/ollama/` prefix). The `vercel.json` rewrites only cover `/api/chat` and `/api/status`. This means on the live Vercel deployment, the Ollama check silently fails and AI chat ALWAYS falls back to keyword NLP.
- **CRITICAL: `/api/cards`, `/api/history`, `/api/contributions` have NO Vercel serverless functions.** These endpoints only exist in `server.js` (local Express). On Vercel, all card CRUD, history saving, and contributions will 404. The client catches these errors silently, so users never know their data is not being saved.
- **No "AI offline" feedback**: When `_sendToOllama` returns `null`, the fallback NLP runs silently. There is no message telling the user that AI is offline and they are getting limited keyword responses.
- **Fallback response is English-only**: The `_processNaturalLanguage()` function returns English-only responses (e.g., "Gravity set to 0. Particles will float freely.") even when the user writes in Korean.
- **Unrecognized input returns a long instruction string**: If the user types something not matching any keyword, the response is a raw instruction dump: `"I understood your request. Try commands like: ..."` which feels robotic and unhelpful.
- **No typing/loading indicator**: After user submits a message and before the fallback responds, there is no visual feedback that the system is processing.
- **Suggestion chips disappear after first use** and never come back, even when switching to a new card with no chat history (they reappear due to `_renderChat` but this is inconsistent if the user manually clears).

**Recommended fixes:**
1. [P0] Fix API endpoint URLs: either change client code to call `/api/chat` and `/api/status` (without `/ollama/` prefix) or add Vercel functions at `/api/ollama/chat.js` and `/api/ollama/status.js`.
2. [P0] Create Vercel serverless functions for `/api/cards`, `/api/history`, `/api/contributions` OR switch to client-side localStorage for the Vercel deployment.
3. [P1] Add a system message when AI is offline: "AI is currently offline. Using basic keyword commands." (localized).
4. [P1] Localize all fallback NLP responses (use the i18n system).
5. [P2] Add a "thinking..." indicator between user message and response.
6. [P2] Improve the unrecognized-input fallback to be friendlier and localized.

---

## 3. Preset Buttons -- Rating: 4/5

**What works:**
- 50+ presets covering buildings, bridges, towers, special structures, weather, and experiments.
- Each preset has appropriate physics parameters (steel has higher spring stiffness and density than wood, etc.).
- Clicking a preset immediately triggers `selectCard()` -> `_onCardSelect()` -> `_buildStructure()`, and particles visibly assemble into the structure within 2 seconds.
- Tags per card provide quick visual categorization.
- Duplicate and delete actions are available on hover.
- Card names are properly localized via `tPreset()` for both Korean and English.

**Issues found:**
- **50+ cards in a flat scrollable list**: No filtering, searching, or grouping. Users must scroll extensively to find a specific preset. The tag system exists but there is no tag-filter UI.
- **All cards are loaded at once**: No virtualization or lazy loading for the card list DOM.
- **Time-ago shows "just now" for all presets**: Because preset cards are generated with `new Date()` at load time, every card shows "just now" -- meaningless information.
- **Weather presets (typhoon, aurora, etc.) are mixed with architecture presets**: No visual separation by category.

**Recommended fixes:**
1. [P2] Add a search/filter bar above the card list with tag-based filtering.
2. [P2] Group presets by category with collapsible sections (buildings, bridges, experiments, etc.).
3. [P3] Remove or hide the timestamp for presets (show only for user-created cards).

---

## 4. Parameter Panel -- Rating: 4/5

**What works:**
- All sliders update in real time with immediate physics response.
- Display values update as sliders move (with appropriate formatting -- 2 decimal places for most, integer for particles/temperature).
- Sections are collapsible with smooth animations.
- Material selection auto-applies real SI-unit properties (density, Young's modulus, yield strength, Poisson ratio, thermal expansion, melting point).
- Ground selection affects friction and visual color.
- Foundation depth slider works independently.
- Visual section provides comprehensive control: color modes, bloom, particle size, opacity, background.
- Material info box shows property summary in scientific notation.

**Issues found:**
- **All parameter sections are expanded by default**: The sidebar becomes very long on load. Only the active/most-used sections should be expanded; others should be collapsed.
- **No reset-to-default button** for individual sliders or sections.
- **Particle count slider change does not actually respawn particles**: Changing the "Particles" slider updates `card.physics.particleCount` but the app does not call `particleSystem.setActiveCount()` or reinitialize positions. It only takes effect on the next structure build.
- **Foundation depth slider appears in BOTH "Material & Ground" and "Foundation & Material" sections**: Confusing duplication (`param-foundationDepth` in material-select-section and `param-foundation` in material-section).
- **Some slider ranges may be wrong**: Gravity goes from -30 to +30 but labels do not indicate units (m/s^2). Temperature goes to 5000K but the info box shows melting points exceeding that for some materials.

**Recommended fixes:**
1. [P2] Collapse most parameter sections by default; keep only Physics expanded.
2. [P2] Add a "reset to default" button per section or globally.
3. [P2] Make particle count slider actually update the simulation live (or clearly indicate it applies on next build).
4. [P3] Add unit labels to sliders where appropriate (m/s^2, K, kN/m^2, etc.).
5. [P3] Deduplicate the foundation depth controls.

---

## 5. History -- Rating: 2/5

**What works:**
- History section exists in the sidebar with a collapsible toggle.
- History items show title, domain badge, time-ago, and truncated query.
- Clicking a history item reloads physics, prompt, and particle spec onto the active card.
- "Load More" pagination is implemented.
- History count badge shows total items.

**Issues found:**
- **History depends entirely on the server API** (`/api/history`), which does NOT exist on the Vercel deployment (no serverless function). On production, history is completely non-functional.
- **History section is collapsed by default** and has count badge showing "0", giving users no hint that it could contain useful data.
- **No empty state message**: When history is empty, the section is just blank -- no "No simulations saved yet" message.
- **No delete or clear-all button** for individual history items in the UI (API has DELETE but no UI affordance).
- **History only saves when AI chat produces a simulation**: Direct prompt-bar builds and slider changes are not captured.

**Recommended fixes:**
1. [P0] Either create Vercel serverless functions for `/api/history` or fall back to `localStorage`.
2. [P2] Add an empty state message when history is empty.
3. [P2] Add a delete button on history items (swipe or icon).
4. [P3] Save prompt-bar builds to history, not just AI chat builds.

---

## 6. Mobile Experience -- Rating: 3/5

**What works:**
- Responsive CSS at 768px and 480px breakpoints.
- Layout switches to column: canvas on top (55vh), sidebar on bottom (45vh).
- Sidebar title collapses to single line (`<br>` hidden).
- Touch targets are reasonably sized (buttons, slider thumbs at 14px).
- Font sizes adjusted for mobile.
- `100dvh` used for viewport height (handles mobile browser chrome).

**Issues found:**
- **No hamburger menu or drawer**: The sidebar is always visible on mobile, consuming 45% of screen. Users cannot dismiss it to see the full 3D canvas.
- **3D canvas is only 55vh on mobile**: Very small viewing area for the main feature.
- **No touch gesture for sidebar toggle**: Users cannot swipe up/down to resize the sidebar-canvas split.
- **OrbitControls conflict with scroll**: On mobile, attempting to scroll the sidebar may accidentally orbit the 3D scene if the touch starts near the edge.
- **Bottom prompt panel overlaps the sidebar area on mobile**: The absolute-positioned bottom panel may cover sidebar content.
- **Chat container is only 180px on small screens**: Barely visible, and the suggestion chips overflow/wrap poorly.
- **No landscape orientation handling**: On phones in landscape, the layout is very cramped vertically.
- **VR Button positioned at `bottom: 90px`** may overlay other UI on mobile.

**Recommended fixes:**
1. [P1] Add a sidebar toggle button (hamburger) on mobile to show/hide the sidebar.
2. [P1] Make the canvas full-screen by default on mobile with an overlay sidebar.
3. [P2] Increase touch targets to minimum 44x44px (Apple HIG recommendation).
4. [P3] Handle landscape orientation with a horizontal layout.

---

## 7. Error Handling -- Rating: 2/5

**What works:**
- All `fetch()` calls are wrapped in try-catch.
- Ollama failure gracefully falls back to keyword NLP.
- WebGL quality auto-detection prevents GPU overload.
- Structure generation has try-catch with status message update.
- Physics engine uses `Float32Array` bounds to prevent NaN propagation.
- `dt` is clamped to `0.033` max to prevent physics explosions on tab-switch.

**Issues found:**
- **All server errors are silently swallowed**: Every `catch {}` block is empty. No console warnings, no user notifications, no retry logic. Examples:
  - Card CRUD failures (lines 185, 221, 232, 259, 458 in SimulationManager.js)
  - History save failure only logs `console.warn` -- no user feedback.
  - Contribution submit says "Offline -- saved locally" but does NOT actually save locally.
- **No SSE stream error recovery**: If the Ollama stream breaks mid-response, the streaming message element stays in the DOM with a blinking cursor forever. `_finalizeStreamingMessage()` is only called on success.
- **No WebGL context loss handling**: If the browser recovers from a WebGL context loss (common on mobile or when switching tabs), the entire renderer will break with no recovery path.
- **No `window.onerror` or `unhandledrejection` handler**: Uncaught errors will silently break functionality.
- **importmap CDN failure**: If `cdn.jsdelivr.net` is down, the entire app fails to load with no fallback or error message.
- **Vercel API 404s are silent**: On the live site, every `/api/cards`, `/api/ollama/*`, and `/api/history` call 404s silently.

**Recommended fixes:**
1. [P0] Add user-visible error notifications for critical failures (toast/snackbar system).
2. [P1] Clean up streaming message element on fetch error (add finally block).
3. [P1] Add WebGL context loss/restore handlers.
4. [P1] Add a global error handler that logs and optionally reports errors.
5. [P2] Implement actual localStorage fallback for the "saved locally" claim.
6. [P2] Add retry logic with exponential backoff for server API calls.
7. [P3] Add a CDN fallback or self-host Three.js.

---

## 8. Missing Features for Production -- Rating: 2/5

| Feature | Status | Priority |
|---------|--------|----------|
| Loading spinner/skeleton | CSS class `.skeleton` exists but UNUSED anywhere | P1 |
| Error boundary/fallback UI | Missing entirely | P1 |
| Empty states | History, card list have no empty state messages | P2 |
| Toast/notification system | Missing -- errors are silent | P1 |
| Keyboard shortcuts | None defined (no Escape to clear, no Ctrl+Enter to submit, etc.) | P3 |
| Help/about page | Missing -- no documentation or tutorial | P2 |
| Simulation sharing URL | Missing -- no way to share a configuration via link | P2 |
| Screenshot/export | No way to save the 3D view as image | P3 |
| Undo/redo | Missing for parameter changes | P3 |
| Service worker / PWA | No offline support despite being a local-first app | P3 |
| SEO / meta tags | Only `<title>` set; no description, og:image, etc. | P2 |
| Analytics | No telemetry or usage tracking | P3 |
| Rate limiting | No rate limiting on API endpoints | P2 |
| Input validation | Server accepts any JSON body without schema validation | P2 |
| CSRF protection | No CSRF tokens on mutation endpoints | P3 |
| Content Security Policy | Not set in vercel.json headers | P2 |
| `favicon.ico` | Not present | P2 |

**Additional notes:**
- The `.skeleton` shimmer animation at line 1292-1310 of style.css is fully implemented but never applied to any DOM element.
- The `GemmaChat.js` file appears to be an older/alternate implementation separate from the chat logic in `SimulationManager.js` -- dead code.

---

## 9. Performance -- Rating: 3/5

**What works:**
- Verlet integration physics engine with `Float32Array` typed arrays -- efficient.
- `InstancedMesh` for particle rendering -- correct approach for 25K-50K particles.
- Quality tier auto-detection adapts particle limits, bloom resolution, and geometry detail.
- `requestAnimationFrame` via `setAnimationLoop` with proper dt clamping.
- `frustumCulled = false` on the instanced mesh (correct since particles span the view).
- Bloom post-processing scales with quality tier.

**Issues found:**
- **No geometry/mesh disposal on simulation switch**: When switching cards, old particle positions are overwritten but no geometry or material is disposed. The `dispose()` methods exist on ParticleSystem, NeonRenderer, and XRController but are never called during card switches.
- **Card list re-renders full DOM on every change**: `_renderCardList()` does `list.innerHTML = ''` then rebuilds all 50+ cards. No virtual list or incremental updates.
- **Physics engine creates new arrays on each `setSprings()` call**: Springs array is replaced entirely with no pooling.
- **Binary search in ArchitectureGenerator runs `_generateTemplate` up to 32 times** (4 rounds x 8 iterations) during structure building, each time generating thousands of positions.
- **No `will-change` or `transform: translateZ(0)` on animated elements**: Minor, but sidebar animations could be smoother.
- **Three.js loaded from CDN on every page load**: No local bundle, no code splitting. Three.js core + addons is ~600KB+ unminified.
- **All 50+ preset cards are created in memory on first load**: Each with full physics objects and timestamps.

**Recommended fixes:**
1. [P2] Call `dispose()` methods when tearing down/switching simulations.
2. [P2] Consider a virtual list or lazy rendering for the card list.
3. [P2] Cache or skip redundant `_generateTemplate` calls in the binary search.
4. [P3] Use a CDN with pinned version and SRI hash, or self-host a bundled Three.js.

---

## 10. Polish Issues -- Rating: 3/5

**Localization issues (raw English in Korean mode):**
- `_updateStatus('Ready')`, `_updateStatus('Generating...')`, `_updateStatus('Building structure...')`, `_updateStatus('Stable')`, `_updateStatus('Simulating')` -- all hardcoded English in `app.js`. The i18n keys exist (`ready`, `generating`, `building`, `stable`) but are not used.
- `_updateStatus('Error: ' + e.message)` -- error prefix is English.
- `_timeAgo()` returns English strings: "just now", "5m ago", "2h ago", "3d ago" -- never localized.
- Contribute section: form labels "Architecture", "Civil Engineering", "Mechanical Eng." etc. in `<select>` options are English-only (lines 377-383 of index.html).
- Contribute section description has English fallback text in HTML: "Share your domain expertise!..." (line 367-369 of index.html) -- overridden by i18n but briefly visible as FOUC.
- Fallback NLP responses are English-only (as noted in Section 2).
- Structure info text: `"${type} | ${structuralParticles} structural + ${ambientParticles} ambient"` is English-only.
- Card action tooltips: "Duplicate" and "Delete" are English-only.
- Chat message bubble for unrecognized input shows English instruction text.
- Weather preset i18n: preset names like "typhoon simulation" are in Korean but `tags` arrays are English ("weather", "typhoon").

**Layout issues:**
- The `#card-detail` panel has `max-height: 55vh` which on short screens can cut off the AI chat section entirely.
- The `#chat-container` has a fixed `height: 240px` (180px on mobile) which is not enough to read multi-paragraph AI responses.
- Sidebar does not have min-height for the card list area, so if all sections are expanded, the card list gets squeezed to near-zero.
- Color picker inputs have no visual label in the grid layout when label text is long.

**Missing hover/focus states:**
- History items have hover state but no focus-visible outline for keyboard navigation.
- Suggestion chips have no focus state.
- The quality badge click-to-cycle has no visual indication it is interactive beyond cursor:pointer.

**Accessibility issues:**
- ARIA attributes are well-applied on section toggles, chat log, and inputs (good).
- However, `aria-expanded` on section titles is static in HTML (`true`) and never updated by JavaScript when sections are toggled. This means screen readers report incorrect state.
- No skip-to-content link for keyboard users.
- Color contrast: `--text-tertiary: #6e7681` on `--bg-secondary: #161b22` is approximately 3.5:1, below WCAG AA minimum of 4.5:1 for small text.
- Range slider values are not announced to screen readers (no `aria-valuenow` binding).
- The 3D canvas has no `aria-label` or alternative text description.

**Recommended fixes:**
1. [P1] Replace all hardcoded English status strings in `app.js` with `t()` calls.
2. [P1] Localize `_timeAgo()` for Korean ("방금", "5분 전", "2시간 전", "3일 전").
3. [P1] Localize all fallback NLP responses.
4. [P1] Update `aria-expanded` attributes in the toggle JavaScript.
5. [P2] Localize contribute section form option text.
6. [P2] Localize structure info text and card action tooltips.
7. [P2] Improve color contrast for tertiary text.
8. [P2] Add focus-visible outlines to all interactive elements (history items, chips, quality badge).
9. [P3] Add a skip-to-content link.
10. [P3] Add `aria-label` to the 3D canvas container.

---

## Summary Scorecard

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| 1. First Impression | 3/5 | 15% | 0.45 |
| 2. Chat Experience | 2/5 | 15% | 0.30 |
| 3. Preset Buttons | 4/5 | 10% | 0.40 |
| 4. Parameter Panel | 4/5 | 10% | 0.40 |
| 5. History | 2/5 | 5% | 0.10 |
| 6. Mobile | 3/5 | 10% | 0.30 |
| 7. Error Handling | 2/5 | 10% | 0.20 |
| 8. Missing Features | 2/5 | 10% | 0.20 |
| 9. Performance | 3/5 | 10% | 0.30 |
| 10. Polish | 3/5 | 5% | 0.15 |
| **TOTAL** | | **100%** | **2.80/5.00** |

---

## Top Priority Fixes (P0 -- Blocking for Production)

1. **Fix API endpoint mismatch on Vercel**: Client calls `/api/ollama/chat` and `/api/ollama/status`, but Vercel functions are at `/api/chat` and `/api/status`. Either rename the client URLs or add Vercel rewrites/functions.

2. **Create Vercel serverless functions (or localStorage fallback) for**: `/api/cards`, `/api/cards/:id`, `/api/cards/:id/chat`, `/api/history`, `/api/contributions`. Without these, card persistence, history, and contributions are completely broken on production.

3. **Add user-visible error feedback**: The app is completely silent about all failures. At minimum, add a toast notification system.

---

## Next Priority Fixes (P1 -- Required for Good UX)

4. Add a loading overlay during initial Three.js setup.
5. Show "AI offline" message in chat when Ollama is unreachable.
6. Fix all hardcoded English strings to use the i18n system.
7. Add a sidebar toggle/hamburger for mobile.
8. Clean up streaming message element on fetch errors.
9. Add WebGL context loss recovery.
10. Update `aria-expanded` on section toggles.

---

## File Paths Referenced

- `/home/u2dia/github/gemma4-particle-edu/index.html`
- `/home/u2dia/github/gemma4-particle-edu/css/style.css`
- `/home/u2dia/github/gemma4-particle-edu/js/app.js`
- `/home/u2dia/github/gemma4-particle-edu/js/SimulationManager.js`
- `/home/u2dia/github/gemma4-particle-edu/js/i18n.js`
- `/home/u2dia/github/gemma4-particle-edu/js/NeonRenderer.js`
- `/home/u2dia/github/gemma4-particle-edu/js/PhysicsEngine.js`
- `/home/u2dia/github/gemma4-particle-edu/js/ParticleSystem.js`
- `/home/u2dia/github/gemma4-particle-edu/js/ArchitectureGenerator.js`
- `/home/u2dia/github/gemma4-particle-edu/js/XRController.js`
- `/home/u2dia/github/gemma4-particle-edu/js/GemmaChat.js` (possibly dead code)
- `/home/u2dia/github/gemma4-particle-edu/js/Materials.js`
- `/home/u2dia/github/gemma4-particle-edu/server.js`
- `/home/u2dia/github/gemma4-particle-edu/api/chat.js`
- `/home/u2dia/github/gemma4-particle-edu/api/status.js`
- `/home/u2dia/github/gemma4-particle-edu/vercel.json`
