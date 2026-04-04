import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SimulationManager, { PRESETS } from '../../js/SimulationManager.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockPhysicsEngine() {
  return {
    gravity: -9.81,
    damping: 0.97,
    dt: 1 / 60,
    _temperature: 293,
    _wind: { x: 0, y: 0, z: 0 },
    _seismic: { amplitude: 0, frequency: 0 },
    setGravity: vi.fn(function (v) { this.gravity = v; }),
    setDamping: vi.fn(function (v) { this.damping = v; }),
    setWind: vi.fn(function (x, y, z) { this._wind = { x, y, z }; }),
    setSeismic: vi.fn(function (a, f) { this._seismic = { amplitude: a, frequency: f }; }),
    setTemperature: vi.fn(function (k) { this._temperature = k; }),
    getParticles: vi.fn(() => []),
    getSprings: vi.fn(() => []),
    integrate: vi.fn(),
    reset: vi.fn(),
  };
}

function createMockParticleSystem() {
  return {
    update: vi.fn(),
    reset: vi.fn(),
    getStats: vi.fn(() => ({ count: 0, avgVelocity: 0, maxStress: 0 })),
    spawn: vi.fn(() => []),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function createMockArchGenerator() {
  return {
    generate: vi.fn(() => ({ particles: [], springs: [], type: 'building' })),
    getTypes: vi.fn(() => ['building', 'bridge', 'tower']),
  };
}

function createMockRenderer() {
  return {
    render: vi.fn(),
    resize: vi.fn(),
    setBloom: vi.fn(),
    dispose: vi.fn(),
    init: vi.fn(async () => {}),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SimulationManager', () => {
  let engine;
  let particleSystem;
  let archGenerator;
  let renderer;
  let manager;

  beforeEach(() => {
    engine = createMockPhysicsEngine();
    particleSystem = createMockParticleSystem();
    archGenerator = createMockArchGenerator();
    renderer = createMockRenderer();

    manager = new SimulationManager({
      physicsEngine: engine,
      particleSystem,
      archGenerator,
      renderer,
    });

    // Mock requestAnimationFrame / cancelAnimationFrame for animation tests
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      return setTimeout(cb, 0);
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => clearTimeout(id)));
    vi.stubGlobal('performance', { now: vi.fn(() => Date.now()) });
  });

  afterEach(() => {
    manager.stop();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Presets
  // -------------------------------------------------------------------------

  describe('loadPreset', () => {
    it('returns correct config for earthquake', () => {
      const config = manager.loadPreset('earthquake');

      expect(config.prompt).toBe('building');
      expect(config.physics.gravity).toBe(-9.81);
      expect(config.physics.damping).toBe(0.95);
      expect(config.physics.springStiffness).toBe(25000);
      expect(config.physics.density).toBe(2400);
      expect(config.physics.yieldStrength).toBe(30e6);
      expect(config.physics.temperature).toBe(293);
      expect(config.physics.seismic).toBe(6);
      expect(config.physics.seismicFreq).toBe(2.5);
      expect(config.physics.foundation).toBe(2);
    });

    it('returns correct config for bridge', () => {
      const config = manager.loadPreset('bridge');

      expect(config.prompt).toBe('bridge');
      expect(config.physics.springStiffness).toBe(30000);
      expect(config.physics.density).toBe(7874);
      expect(config.physics.seismic).toBe(0);
    });

    it('returns correct config for freefall', () => {
      const config = manager.loadPreset('freefall');

      expect(config.prompt).toBe('freefall');
      expect(config.physics.damping).toBe(0.999);
      expect(config.physics.springStiffness).toBe(0);
    });

    it('returns a deep copy (not a reference to PRESETS)', () => {
      const config1 = manager.loadPreset('earthquake');
      const config2 = manager.loadPreset('earthquake');

      config1.physics.gravity = 0;
      expect(config2.physics.gravity).toBe(-9.81);
      expect(PRESETS.earthquake.physics.gravity).toBe(-9.81);
    });

    it('throws on unknown preset name', () => {
      expect(() => manager.loadPreset('nonexistent')).toThrow('Unknown preset');
    });
  });

  // -------------------------------------------------------------------------
  // applyParams
  // -------------------------------------------------------------------------

  describe('applyParams', () => {
    it('sets gravity on physics engine', () => {
      manager.applyParams({ physics: { gravity: -5 } });
      expect(engine.setGravity).toHaveBeenCalledWith(-5);
    });

    it('sets damping on physics engine', () => {
      manager.applyParams({ physics: { damping: 0.9 } });
      expect(engine.setDamping).toHaveBeenCalledWith(0.9);
    });

    it('sets wind on physics engine', () => {
      manager.applyParams({ physics: { windX: 3, windY: 1, windZ: -2 } });
      expect(engine.setWind).toHaveBeenCalledWith(3, 1, -2);
    });

    it('sets seismic on physics engine', () => {
      manager.applyParams({ physics: { seismic: 6, seismicFreq: 2.5 } });
      expect(engine.setSeismic).toHaveBeenCalledWith(6, 2.5);
    });

    it('sets temperature on physics engine', () => {
      manager.applyParams({ physics: { temperature: 500 } });
      expect(engine.setTemperature).toHaveBeenCalledWith(500);
    });

    it('calls archGenerator.generate when prompt is provided', () => {
      manager.applyParams({ prompt: 'building', physics: { gravity: -9.81 } });
      expect(archGenerator.generate).toHaveBeenCalledWith('building', { gravity: -9.81 });
    });

    it('does not call archGenerator when no prompt', () => {
      manager.applyParams({ physics: { gravity: -5 } });
      expect(archGenerator.generate).not.toHaveBeenCalled();
    });

    it('handles null gracefully', () => {
      expect(() => manager.applyParams(null)).not.toThrow();
    });

    it('handles missing physics gracefully', () => {
      expect(() => manager.applyParams({ prompt: 'building' })).not.toThrow();
      expect(archGenerator.generate).toHaveBeenCalled();
    });

    it('applies a full preset config', () => {
      const config = manager.loadPreset('earthquake');
      manager.applyParams(config);

      expect(engine.setGravity).toHaveBeenCalledWith(-9.81);
      expect(engine.setDamping).toHaveBeenCalledWith(0.95);
      expect(engine.setSeismic).toHaveBeenCalledWith(6, 2.5);
      expect(engine.setTemperature).toHaveBeenCalledWith(293);
      expect(archGenerator.generate).toHaveBeenCalledWith('building', config.physics);
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle: start / stop / isRunning
  // -------------------------------------------------------------------------

  describe('start / stop / isRunning', () => {
    it('isRunning is false initially', () => {
      expect(manager.isRunning()).toBe(false);
    });

    it('isRunning becomes true after start()', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });

    it('isRunning becomes false after stop()', () => {
      manager.start();
      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('start() is idempotent — calling twice does not double-run', () => {
      manager.start();
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });

    it('stop() is idempotent — calling while stopped is a no-op', () => {
      expect(() => manager.stop()).not.toThrow();
      expect(manager.isRunning()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  describe('reset', () => {
    it('stops the simulation', () => {
      manager.start();
      manager.reset();
      expect(manager.isRunning()).toBe(false);
    });

    it('calls particleSystem.reset()', () => {
      manager.reset();
      expect(particleSystem.reset).toHaveBeenCalled();
    });

    it('clears simulation time', () => {
      // Simulate some time passing
      manager.start();
      manager.stop();
      manager.reset();
      expect(manager.getState().time).toBe(0);
    });

    it('clears FPS counter', () => {
      manager.reset();
      expect(manager.getState().fps).toBe(0);
    });

    it('renders an empty frame to clear the viewport', () => {
      manager.reset();
      expect(renderer.render).toHaveBeenCalledWith([], []);
    });
  });

  // -------------------------------------------------------------------------
  // getState
  // -------------------------------------------------------------------------

  describe('getState', () => {
    it('returns valid object with time, particleCount, fps', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('time');
      expect(state).toHaveProperty('particleCount');
      expect(state).toHaveProperty('fps');
      expect(typeof state.time).toBe('number');
      expect(typeof state.particleCount).toBe('number');
      expect(typeof state.fps).toBe('number');
    });

    it('reports particle count from engine', () => {
      engine.getParticles.mockReturnValue([{ id: 0 }, { id: 1 }, { id: 2 }]);
      const state = manager.getState();
      expect(state.particleCount).toBe(3);
    });

    it('starts at time 0', () => {
      expect(manager.getState().time).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  describe('events', () => {
    it('on("start") fires when start() is called', () => {
      const cb = vi.fn();
      manager.on('start', cb);
      manager.start();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('on("stop") fires when stop() is called', () => {
      const cb = vi.fn();
      manager.on('stop', cb);
      manager.start();
      manager.stop();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('on("reset") fires when reset() is called', () => {
      const cb = vi.fn();
      manager.on('reset', cb);
      manager.reset();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('on("frame") callback fires during animation loop', async () => {
      const cb = vi.fn();
      manager.on('frame', cb);

      manager.start();

      // Let the mocked requestAnimationFrame fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      manager.stop();

      expect(cb).toHaveBeenCalled();
      const arg = cb.mock.calls[0][0];
      expect(arg).toHaveProperty('time');
      expect(arg).toHaveProperty('particleCount');
      expect(arg).toHaveProperty('fps');
    });

    it('off() removes a listener', () => {
      const cb = vi.fn();
      manager.on('start', cb);
      manager.off('start', cb);
      manager.start();
      expect(cb).not.toHaveBeenCalled();
    });

    it('listener errors do not break the simulation', () => {
      const badCb = vi.fn(() => { throw new Error('boom'); });
      const goodCb = vi.fn();

      manager.on('start', badCb);
      manager.on('start', goodCb);

      expect(() => manager.start()).not.toThrow();
      expect(badCb).toHaveBeenCalled();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Animation integration
  // -------------------------------------------------------------------------

  describe('animation loop integration', () => {
    it('calls particleSystem.update and renderer.render during loop', async () => {
      manager.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      manager.stop();

      expect(particleSystem.update).toHaveBeenCalled();
      expect(renderer.render).toHaveBeenCalled();
    });

    it('increments simulation time during animation', async () => {
      manager.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      manager.stop();

      expect(manager.getState().time).toBeGreaterThan(0);
    });

    it('cancelAnimationFrame is called on stop', () => {
      manager.start();
      manager.stop();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});
