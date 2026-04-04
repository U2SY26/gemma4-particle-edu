/**
 * app.js — Main entry point for Gemma 4 Particle Edu
 *
 * Glues PhysicsEngine, ParticleSystem, ArchitectureGenerator,
 * NeonRenderer, SimulationManager, GemmaChat, XRController, and I18n
 * together with the DOM.
 */

import PhysicsEngine from './PhysicsEngine.js';
import Materials from './Materials.js';
import ParticleSystem from './ParticleSystem.js';
import NeonRenderer from './NeonRenderer.js';
import ArchitectureGenerator from './ArchitectureGenerator.js';
import SimulationManager from './SimulationManager.js';
import GemmaChat from './GemmaChat.js';
import XRController from './XRController.js';
import I18n from './i18n.js';

// =============================================================================
// Helpers
// =============================================================================

/** Safely query a DOM element by selector; returns null on miss. */
function $(selector) {
  return document.querySelector(selector);
}

/** Safely query all DOM elements by selector. */
function $$(selector) {
  return document.querySelectorAll(selector);
}

// =============================================================================
// i18n DOM update
// =============================================================================

/**
 * Walk the DOM and update every element that carries a data-i18n or
 * data-i18n-placeholder attribute.
 * @param {import('./i18n.js').default} i18n
 */
function updateI18nDOM(i18n) {
  for (const el of $$('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  }
  for (const el of $$('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = i18n.t(key);
  }
  for (const el of $$('[data-i18n-aria]')) {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', i18n.t(key));
  }
}

// =============================================================================
// Chat helpers
// =============================================================================

/**
 * Append a message bubble to the chat messages container.
 * @param {'user'|'ai'} role
 * @param {string} text
 * @returns {HTMLElement} the .message-content element for streaming updates
 */
function appendMessage(role, text) {
  const chatMessages = $('#chat-messages');
  if (!chatMessages) return document.createElement('div');

  const wrapper = document.createElement('div');
  wrapper.className = `message message-${role}`;

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;

  wrapper.appendChild(content);
  chatMessages.appendChild(wrapper);

  // Auto-scroll to bottom (instant to avoid animation lag)
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'instant' });

  return content;
}

/**
 * Scroll chat container to the bottom.
 */
function scrollChatToBottom() {
  const chatMessages = $('#chat-messages');
  if (chatMessages) {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'instant' });
  }
}

// =============================================================================
// Freefall preset helper
// =============================================================================

/**
 * Spawn a cluster of individual particles at height for the freefall preset.
 * No architecture generation — just loose particles.
 * @param {import('./ParticleSystem.js').default} particleSystem
 */
function spawnFreefallParticles(particleSystem) {
  const gridSize = 3;
  const spacing = 0.3;
  const startHeight = 10;

  for (let ix = 0; ix < gridSize; ix++) {
    for (let iy = 0; iy < gridSize; iy++) {
      for (let iz = 0; iz < gridSize; iz++) {
        particleSystem.spawn({
          count: 1,
          material: 'iron',
          position: {
            x: (ix - 1) * spacing,
            y: startHeight + iy * spacing,
            z: (iz - 1) * spacing,
          },
          velocity: { x: 0, y: 0, z: 0 },
          fixed: false,
        });
      }
    }
  }
}

// =============================================================================
// Connection status
// =============================================================================

/**
 * Update the #status-indicator element.
 * @param {boolean} connected
 * @param {import('./i18n.js').default} i18n
 */
function updateStatusIndicator(connected, i18n) {
  const indicator = $('#status-indicator');
  if (!indicator) return;

  const dot = indicator.querySelector('.status-dot');
  const text = indicator.querySelector('.status-text');

  const key = connected ? 'status.connected' : 'status.disconnected';

  indicator.title = i18n.t(key);

  if (dot) {
    dot.classList.toggle('connected', connected);
    dot.classList.toggle('disconnected', !connected);
  }

  if (text) {
    text.textContent = i18n.t(key);
    text.setAttribute('data-i18n', key);
  }
}

// =============================================================================
// Main initialization
// =============================================================================

async function init() {
  // --- Core modules ---
  const physicsEngine = new PhysicsEngine({
    gravity: -9.81,
    damping: 0.97,
    dt: 1 / 60,
  });

  const particleSystem = new ParticleSystem(physicsEngine);

  const canvas = $('#render-canvas');
  const renderer = new NeonRenderer(canvas);

  const archGenerator = new ArchitectureGenerator(particleSystem);

  const simManager = new SimulationManager({
    physicsEngine,
    particleSystem,
    archGenerator,
    renderer,
  });

  const gemmaChat = new GemmaChat('/api/chat');
  const xrController = new XRController(renderer);
  const i18n = new I18n('ko');

  // --- Initialize renderer ---
  try {
    await renderer.init();
  } catch (err) {
    console.warn('NeonRenderer init failed:', err.message);
  }

  // --- Handle canvas resize ---
  function resizeRenderer() {
    const viewport = $('#viewport');
    if (viewport && canvas) {
      const rect = viewport.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    }
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  // --- i18n ---
  // Wait for locale data to be fetched before first DOM update
  await i18n.ready();
  updateI18nDOM(i18n);
  i18n.on('localeChange', () => updateI18nDOM(i18n));

  const localeToggle = $('#locale-toggle');
  if (localeToggle) {
    localeToggle.addEventListener('click', () => {
      const next = i18n.getLocale() === 'ko' ? 'en' : 'ko';
      i18n.setLocale(next);
    });
  }

  // --- Connection status ---
  async function checkAndUpdateStatus() {
    try {
      const connected = await gemmaChat.checkConnection();
      updateStatusIndicator(connected, i18n);
    } catch {
      updateStatusIndicator(false, i18n);
    }
  }
  checkAndUpdateStatus();
  setInterval(checkAndUpdateStatus, 10000);

  // --- Stats display (driven by SimulationManager frame events) ---
  const fpsCounter = $('#fps-counter');
  const particleCount = $('#particle-count');
  const simTime = $('#sim-time');

  simManager.on('frame', (state) => {
    if (fpsCounter) fpsCounter.textContent = state.fps;
    if (particleCount) particleCount.textContent = state.particleCount;
    if (simTime) simTime.textContent = state.time.toFixed(2) + 's';
  });

  // --- Simulation controls ---
  const btnPlay = $('#btn-play');
  const btnPause = $('#btn-pause');
  const btnReset = $('#btn-reset');

  if (btnPlay) {
    btnPlay.addEventListener('click', () => simManager.start());
  }
  if (btnPause) {
    btnPause.addEventListener('click', () => simManager.stop());
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => simManager.reset());
  }

  // --- VR ---
  const btnVr = $('#btn-vr');
  if (btnVr) {
    if (!xrController.isSupported()) {
      btnVr.disabled = true;
      btnVr.title = 'WebXR not supported';
    } else {
      btnVr.addEventListener('click', async () => {
        try {
          await xrController.enterVR();
        } catch (err) {
          console.warn('VR entry failed:', err.message);
        }
      });
    }
  }

  // --- Bloom slider ---
  const bloomSlider = $('#bloom-slider');
  if (bloomSlider) {
    bloomSlider.addEventListener('input', () => {
      renderer.setBloom(parseFloat(bloomSlider.value));
    });
  }

  // --- Preset buttons ---
  for (const btn of $$('.preset-btn[data-preset]')) {
    btn.addEventListener('click', () => {
      const presetName = btn.getAttribute('data-preset');
      if (!presetName) return;

      try {
        simManager.reset();
        const config = simManager.loadPreset(presetName);

        if (presetName === 'freefall') {
          // For freefall, apply physics but spawn loose particles instead of
          // calling archGenerator
          const physOnly = { physics: config.physics };
          simManager.applyParams(physOnly);
          spawnFreefallParticles(particleSystem);
        } else {
          simManager.applyParams(config);
        }

        simManager.start();
        syncSlidersFromEngine(physicsEngine);
      } catch (err) {
        console.warn('Preset load failed:', err.message);
      }
    });
  }

  // --- Chat form ---
  const chatForm = $('#chat-form');
  const chatInput = $('#chat-input');
  const typingIndicator = $('#typing-indicator');

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const message = chatInput.value.trim();
      if (!message) return;

      // Clear input
      chatInput.value = '';

      // Add user bubble
      appendMessage('user', message);

      // Show typing indicator
      if (typingIndicator) typingIndicator.hidden = false;

      // Create AI bubble for streaming
      const aiContent = appendMessage('ai', '');

      // Send to GemmaChat
      let fullText = '';
      try {
        const stream = gemmaChat.send(message);
        const reader = stream.getReader();

        (async function readStream() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fullText += value;
              aiContent.textContent = fullText;
              scrollChatToBottom();
            }
          } catch {
            // Stream read error — ignore, fallback text may already be in place
          }
        })();
      } catch {
        // send() or getReader() threw — ignore, events will still fire
      }
    });
  }

  // GemmaChat events
  gemmaChat.on('complete', () => {
    if (typingIndicator) typingIndicator.hidden = true;
    scrollChatToBottom();
  });

  gemmaChat.on('params', (params) => {
    try {
      simManager.reset();

      if (params.prompt === 'freefall') {
        const physOnly = { physics: params.physics };
        simManager.applyParams(physOnly);
        spawnFreefallParticles(particleSystem);
      } else {
        simManager.applyParams(params);
      }

      simManager.start();
      syncSlidersFromEngine(physicsEngine);
    } catch (err) {
      console.warn('Failed to apply chat params:', err.message);
    }
  });

  gemmaChat.on('error', (err) => {
    if (typingIndicator) typingIndicator.hidden = true;
    appendMessage('ai', `Error: ${err?.message || 'Unknown error'}`);
  });

  // --- Parameter panel ---
  const paramToggle = $('#param-toggle');
  const paramSliders = $('#param-sliders');

  if (paramToggle && paramSliders) {
    paramToggle.addEventListener('click', () => {
      const isCollapsed = paramSliders.classList.toggle('collapsed');
      paramToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  // Parameter sliders — bind each one
  const sliderBindings = [
    {
      slider: '#param-gravity',
      output: '#val-gravity',
      apply: (v) => physicsEngine.setGravity(v),
    },
    {
      slider: '#param-damping',
      output: '#val-damping',
      apply: (v) => physicsEngine.setDamping(v),
    },
    {
      slider: '#param-stiffness',
      output: '#val-stiffness',
      apply: () => {
        // Stiffness affects future spring creation, not existing springs directly.
        // Store in current params for reference.
      },
    },
    {
      slider: '#param-temperature',
      output: '#val-temperature',
      apply: (v) => physicsEngine.setTemperature(v),
    },
    {
      slider: '#param-seismic',
      output: '#val-seismic',
      apply: (v) => physicsEngine.setSeismic(v, physicsEngine._seismic?.frequency ?? 2.5),
    },
    {
      slider: '#param-wind-x',
      output: '#val-wind-x',
      apply: (v) => physicsEngine.setWind(v, 0, 0),
    },
  ];

  for (const binding of sliderBindings) {
    const slider = $(binding.slider);
    const output = $(binding.output);
    if (!slider) continue;

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      if (output) output.textContent = value;
      binding.apply(value);
    });
  }

  /**
   * Sync slider positions to match the current physics engine state.
   * Called after presets or chat params are applied.
   */
  function syncSlidersFromEngine(engine) {
    const mappings = [
      { slider: '#param-gravity', output: '#val-gravity', value: engine.gravity },
      { slider: '#param-damping', output: '#val-damping', value: engine.damping },
      { slider: '#param-temperature', output: '#val-temperature', value: engine._temperature },
      { slider: '#param-seismic', output: '#val-seismic', value: engine._seismic?.amplitude ?? 0 },
      { slider: '#param-wind-x', output: '#val-wind-x', value: engine._wind?.x ?? 0 },
    ];

    for (const m of mappings) {
      const slider = $(m.slider);
      const output = $(m.output);
      if (slider) slider.value = m.value;
      if (output) output.textContent = m.value;
    }
  }

  // --- Mobile tabs ---
  const tabChat = $('#tab-chat');
  const tabViewport = $('#tab-viewport');
  const chatPanel = $('#chat-panel');
  const viewport = $('#viewport');
  const appEl = $('#app');

  if (tabChat && tabViewport && chatPanel && viewport && appEl) {
    tabChat.addEventListener('click', () => {
      appEl.classList.remove('show-viewport');
      tabChat.classList.add('active');
      tabChat.setAttribute('aria-pressed', 'true');
      tabViewport.classList.remove('active');
      tabViewport.setAttribute('aria-pressed', 'false');
    });

    tabViewport.addEventListener('click', () => {
      appEl.classList.add('show-viewport');
      tabViewport.classList.add('active');
      tabViewport.setAttribute('aria-pressed', 'true');
      tabChat.classList.remove('active');
      tabChat.setAttribute('aria-pressed', 'false');
      // Re-measure after showing
      resizeRenderer();
    });
  }

  // --- Resize divider (desktop panel resize) ---
  const resizeDivider = $('#resize-divider');

  if (resizeDivider && chatPanel) {
    let isDragging = false;

    resizeDivider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const minWidth = 280;
      const maxWidth = window.innerWidth * 0.5;
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);

      chatPanel.style.width = newWidth + 'px';
      chatPanel.style.minWidth = newWidth + 'px';
      chatPanel.style.maxWidth = newWidth + 'px';

      resizeRenderer();
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
}

// =============================================================================
// Bootstrap
// =============================================================================

try {
  init().catch((err) => {
    console.error('App initialization failed:', err);
  });
} catch (err) {
  console.error('App initialization failed (sync):', err);
}
