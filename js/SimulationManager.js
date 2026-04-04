/**
 * SimulationManager — Simulation orchestration layer
 *
 * Ties together PhysicsEngine, ParticleSystem, ArchitectureGenerator,
 * and NeonRenderer into a unified preset/param/animation system.
 */

const PRESETS = {
  earthquake: {
    prompt: 'building',
    physics: {
      gravity: -9.81,
      damping: 0.95,
      springStiffness: 25000,
      density: 2400,
      yieldStrength: 30e6,
      temperature: 293,
      seismic: 6,
      seismicFreq: 2.5,
      foundation: 2,
    },
  },
  bridge: {
    prompt: 'bridge',
    physics: {
      gravity: -9.81,
      damping: 0.97,
      springStiffness: 30000,
      density: 7874,
      yieldStrength: 250e6,
      temperature: 293,
      seismic: 0,
      foundation: 1,
    },
  },
  freefall: {
    prompt: 'freefall',
    physics: {
      gravity: -9.81,
      damping: 0.999,
      springStiffness: 0,
      density: 7874,
      temperature: 293,
      seismic: 0,
    },
  },
};

export default class SimulationManager {
  /**
   * @param {Object} deps
   * @param {import('./PhysicsEngine.js').default} deps.physicsEngine
   * @param {import('./ParticleSystem.js').default} deps.particleSystem
   * @param {import('./ArchitectureGenerator.js').default} deps.archGenerator
   * @param {import('./NeonRenderer.js').default} deps.renderer
   */
  constructor({ physicsEngine, particleSystem, archGenerator, renderer }) {
    this._engine = physicsEngine;
    this._particleSystem = particleSystem;
    this._archGenerator = archGenerator;
    this._renderer = renderer;

    /** @type {boolean} */
    this._running = false;

    /** @type {number|null} */
    this._rafId = null;

    /** @type {Object|null} Current applied params */
    this._currentParams = null;

    /** Elapsed simulation time in seconds */
    this._simTime = 0;

    /** FPS tracking */
    this._frameCount = 0;
    this._fps = 0;
    this._fpsLastTime = 0;

    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map([
      ['start', new Set()],
      ['stop', new Set()],
      ['reset', new Set()],
      ['frame', new Set()],
    ]);
  }

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  /**
   * Load a named preset and return its configuration.
   * Does NOT apply it — call applyParams() separately.
   * @param {string} name
   * @returns {Object} SimConfig (deep copy)
   */
  loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) {
      throw new Error(`Unknown preset: ${name}`);
    }
    // Return a deep copy to prevent external mutation
    return JSON.parse(JSON.stringify(preset));
  }

  // ---------------------------------------------------------------------------
  // Parameter application
  // ---------------------------------------------------------------------------

  /**
   * Apply a SimConfig to the physics engine and optionally generate a structure.
   * @param {Object} json — { prompt?, physics? }
   */
  applyParams(json) {
    if (!json) return;

    this._currentParams = JSON.parse(JSON.stringify(json));

    const phys = json.physics;
    if (phys) {
      if (phys.gravity !== undefined) {
        this._engine.setGravity(phys.gravity);
      }
      if (phys.damping !== undefined) {
        this._engine.setDamping(phys.damping);
      }
      if (phys.windX !== undefined || phys.windY !== undefined || phys.windZ !== undefined) {
        this._engine.setWind(
          phys.windX ?? 0,
          phys.windY ?? 0,
          phys.windZ ?? 0,
        );
      }
      if (phys.seismic !== undefined || phys.seismicFreq !== undefined) {
        this._engine.setSeismic(
          phys.seismic ?? 0,
          phys.seismicFreq ?? 0,
        );
      }
      if (phys.temperature !== undefined) {
        this._engine.setTemperature(phys.temperature);
      }
    }

    // Generate structure if prompt is provided
    if (json.prompt && this._archGenerator) {
      try {
        this._archGenerator.generate(json.prompt, phys || {});
      } catch (err) {
        console.warn('SimulationManager: archGenerator.generate failed:', err.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  /**
   * Start the animation loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._fpsLastTime = performance.now();
    this._frameCount = 0;
    this._emit('start');
    this._loop();
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._emit('stop');
  }

  /**
   * Reset the simulation: stop the loop, clear all particles/springs, reset time.
   */
  reset() {
    this.stop();
    this._particleSystem.reset();
    this._simTime = 0;
    this._fps = 0;
    this._frameCount = 0;
    this._currentParams = null;

    // Render an empty frame to clear the viewport
    if (this._renderer) {
      try {
        this._renderer.render([], []);
      } catch {
        // renderer may not be initialized
      }
    }

    this._emit('reset');
  }

  /**
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Get current simulation state.
   * @returns {{ time: number, particleCount: number, fps: number }}
   */
  getState() {
    const particles = this._engine.getParticles();
    return {
      time: this._simTime,
      particleCount: particles.length,
      fps: this._fps,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal animation loop
  // ---------------------------------------------------------------------------

  /** @private */
  _loop() {
    if (!this._running) return;

    const dt = this._engine.dt;

    // Physics step
    this._particleSystem.update(dt);
    this._simTime += dt;

    // Render
    const particles = this._engine.getParticles();
    const springs = this._engine.getSprings();
    if (this._renderer) {
      try {
        this._renderer.render(particles, springs);
      } catch {
        // renderer may fail if not initialized; continue the loop
      }
    }

    // FPS calculation
    this._frameCount++;
    const now = performance.now();
    const elapsed = now - this._fpsLastTime;
    if (elapsed >= 1000) {
      this._fps = Math.round((this._frameCount * 1000) / elapsed);
      this._frameCount = 0;
      this._fpsLastTime = now;
    }

    this._emit('frame', this.getState());

    this._rafId = requestAnimationFrame(() => this._loop());
  }

  // ---------------------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------------------

  /**
   * Register an event listener.
   * @param {'start'|'stop'|'reset'|'frame'} event
   * @param {Function} callback
   */
  on(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.add(callback);
    }
  }

  /**
   * Remove an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param {*} [data]
   * @private
   */
  _emit(event, data) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch {
        // listener errors must not break the loop
      }
    }
  }
}

export { PRESETS };
