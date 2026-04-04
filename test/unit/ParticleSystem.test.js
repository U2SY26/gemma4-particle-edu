import { describe, it, expect, beforeEach, vi } from 'vitest';
import PhysicsEngine from '../../js/PhysicsEngine.js';
import ParticleSystem from '../../js/ParticleSystem.js';

describe('ParticleSystem', () => {
  let engine;
  let system;

  beforeEach(() => {
    engine = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
    system = new ParticleSystem(engine);
  });

  // ---------------------------------------------------------------------------
  // spawn
  // ---------------------------------------------------------------------------

  describe('spawn', () => {
    it('creates particles in PhysicsEngine', () => {
      system.spawn({ count: 3, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(engine.getParticles()).toHaveLength(3);
    });

    it('creates single particle when count is 1', () => {
      const particles = system.spawn({ count: 1, material: 'aluminum', position: { x: 5, y: 3, z: 1 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(particles).toHaveLength(1);
      expect(engine.getParticles()).toHaveLength(1);
    });

    it('sets correct material name on particles', () => {
      system.spawn({ count: 1, material: 'copper', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      const p = engine.getParticles()[0];
      expect(p.material).toBe('copper');
    });

    it('computes mass from density * volume', () => {
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      const p = engine.getParticles()[0];
      const radius = 0.1;
      const volume = (4 / 3) * Math.PI * radius * radius * radius;
      const expectedMass = 7874 * volume; // iron density = 7874 kg/m^3
      expect(p.mass).toBeCloseTo(expectedMass, 6);
    });

    it('places particles at specified position', () => {
      system.spawn({ count: 1, material: 'iron', position: { x: 10, y: 20, z: 30 }, velocity: { x: 0, y: 0, z: 0 } });
      const p = engine.getParticles()[0];
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);
      expect(p.z).toBe(30);
    });

    it('applies initial velocity via Verlet prevPos offset', () => {
      const dt = engine.dt;
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 5, y: 0, z: 0 } });
      const p = engine.getParticles()[0];
      // prevX = x - vx * dt = 0 - 5 * (1/60)
      expect(p.prevX).toBeCloseTo(-5 * dt, 10);
    });

    it('throws for unknown material', () => {
      expect(() => {
        system.spawn({ count: 1, material: 'unobtanium', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      }).toThrow('Unknown material: unobtanium');
    });

    it('respects fixed flag', () => {
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, fixed: true });
      const p = engine.getParticles()[0];
      expect(p.fixed).toBe(true);
    });

    it('connects adjacent particles with springs', () => {
      system.spawn({ count: 3, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      // 3 particles → 2 springs (0-1, 1-2)
      expect(engine.getSprings()).toHaveLength(2);
    });

    it('does not create springs for single particle', () => {
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(engine.getSprings()).toHaveLength(0);
    });

    it('spring stiffness is derived from material elasticModulus', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      const s = engine.getSprings()[0];
      const radius = 0.1;
      const crossArea = Math.PI * radius * radius;
      const restLength = radius * 2;
      const expected = (200e9 * crossArea) / restLength; // iron elasticModulus
      expect(s.stiffness).toBeCloseTo(expected, 0);
    });

    it('spring restLength equals 2 * radius', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      const s = engine.getSprings()[0];
      expect(s.restLength).toBeCloseTo(0.2, 10);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('calls physicsEngine.integrate with dt', () => {
      const spy = vi.spyOn(engine, 'integrate');
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });

      system.update(1 / 60);

      expect(spy).toHaveBeenCalledWith(1 / 60);
      spy.mockRestore();
    });

    it('does not throw with no particles', () => {
      expect(() => system.update(1 / 60)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Stress events — yield
  // ---------------------------------------------------------------------------

  describe('yield event', () => {
    it('emits yield when stress exceeds yieldStrength', () => {
      // Use rubber: yieldStrength = 15e6 Pa, elasticModulus = 0.05e9 Pa
      // Spawn fixed so integrate() does not move particles — deformation stays exact
      const yieldEvents = [];
      system.on('yield', (data) => yieldEvents.push(data));

      system.spawn({ count: 2, material: 'rubber', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, fixed: true });

      const particles = engine.getParticles();
      const springs = engine.getSprings();
      const s = springs[0];
      const radius = 0.1;
      const crossArea = Math.PI * radius * radius;

      // stress = stiffness * deformation / crossArea > yieldStrength
      // deformation > yieldStrength * crossArea / stiffness
      const minDeformation = (15e6 * crossArea) / s.stiffness;
      // Target 1.2x yield — above yield but below 1.5x (break threshold)
      const targetDeformation = minDeformation * 1.2;

      // Manually stretch the spring
      const b = particles[1];
      b.x = particles[0].x + s.restLength + targetDeformation;
      b.prevX = b.x;

      system.update(1 / 60);

      expect(yieldEvents.length).toBeGreaterThanOrEqual(1);
      expect(yieldEvents[0].stress).toBeGreaterThan(yieldEvents[0].yieldStrength);
    });
  });

  // ---------------------------------------------------------------------------
  // Stress events — break
  // ---------------------------------------------------------------------------

  describe('break event', () => {
    it('emits break and removes spring when stress exceeds 1.5x yieldStrength', () => {
      const breakEvents = [];
      system.on('break', (data) => breakEvents.push(data));

      system.spawn({ count: 2, material: 'rubber', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, fixed: true });

      const particles = engine.getParticles();
      const springs = engine.getSprings();
      const s = springs[0];
      const radius = 0.1;
      const crossArea = Math.PI * radius * radius;

      // deformation to exceed 1.5x yield
      const minDeformation = (1.5 * 15e6 * crossArea) / s.stiffness;
      const targetDeformation = minDeformation * 1.5;

      const b = particles[1];
      b.x = particles[0].x + s.restLength + targetDeformation;
      b.prevX = b.x;

      system.update(1 / 60);

      expect(breakEvents.length).toBeGreaterThanOrEqual(1);
      expect(breakEvents[0].stress).toBeGreaterThan(1.5 * breakEvents[0].yieldStrength);
      // Spring should have been removed
      expect(engine.getSprings()).toHaveLength(0);
    });

    it('does not emit yield for stress below yieldStrength', () => {
      const yieldEvents = [];
      system.on('yield', (data) => yieldEvents.push(data));

      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });

      // Tiny deformation — well below iron yieldStrength (250e6)
      const particles = engine.getParticles();
      const b = particles[1];
      b.x += 1e-10;
      b.prevX = b.x;

      system.update(1 / 60);

      expect(yieldEvents).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('clears all particles and springs', () => {
      system.spawn({ count: 3, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(engine.getParticles()).toHaveLength(3);
      expect(engine.getSprings()).toHaveLength(2);

      system.reset();

      expect(engine.getParticles()).toHaveLength(0);
      expect(engine.getSprings()).toHaveLength(0);
    });

    it('clears internal particle metadata', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      system.reset();
      expect(system._particleMeta.size).toBe(0);
    });

    it('clears internal spring metadata', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      system.reset();
      expect(system._springMeta.size).toBe(0);
    });

    it('allows spawning again after reset', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      system.reset();
      system.spawn({ count: 1, material: 'aluminum', position: { x: 1, y: 1, z: 1 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(engine.getParticles()).toHaveLength(1);
      expect(engine.getParticles()[0].material).toBe('aluminum');
    });
  });

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------

  describe('getStats', () => {
    it('returns zero stats when empty', () => {
      const stats = system.getStats();
      expect(stats.count).toBe(0);
      expect(stats.avgVelocity).toBe(0);
      expect(stats.maxStress).toBe(0);
    });

    it('returns correct particle count', () => {
      system.spawn({ count: 5, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      expect(system.getStats().count).toBe(5);
    });

    it('computes avgVelocity from Verlet velocity', () => {
      // Single particle with known velocity
      const dt = engine.dt;
      system.spawn({ count: 1, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 3, y: 4, z: 0 } });
      // speed = sqrt(3^2 + 4^2) = 5
      const stats = system.getStats();
      expect(stats.avgVelocity).toBeCloseTo(5, 4);
    });

    it('maxStress is 0 when springs are at rest length', () => {
      system.spawn({ count: 2, material: 'iron', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });
      // Particles are placed exactly restLength apart by spawn, so stress should be ~0
      const stats = system.getStats();
      expect(stats.maxStress).toBeCloseTo(0, 4);
    });

    it('maxStress reflects stress ratio when spring is deformed', () => {
      system.spawn({ count: 2, material: 'rubber', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } });

      const particles = engine.getParticles();
      const springs = engine.getSprings();
      const s = springs[0];
      const radius = 0.1;
      const crossArea = Math.PI * radius * radius;

      // Small deformation to keep the spring intact
      const deformation = 0.01;
      particles[1].x = particles[0].x + s.restLength + deformation;
      particles[1].prevX = particles[1].x;

      const expectedForce = s.stiffness * deformation;
      const expectedStress = expectedForce / crossArea;
      const expectedRatio = expectedStress / 15e6; // rubber yieldStrength

      const stats = system.getStats();
      expect(stats.maxStress).toBeCloseTo(expectedRatio, 4);
    });
  });

  // ---------------------------------------------------------------------------
  // Event system — on / off
  // ---------------------------------------------------------------------------

  describe('event system', () => {
    it('on registers a listener that receives events', () => {
      const calls = [];
      system.on('collision', (data) => calls.push(data));
      system._emit('collision', { test: true });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({ test: true });
    });

    it('off removes a previously registered listener', () => {
      const calls = [];
      const cb = (data) => calls.push(data);
      system.on('yield', cb);
      system.off('yield', cb);
      system._emit('yield', { test: true });
      expect(calls).toHaveLength(0);
    });

    it('multiple listeners on same event all fire', () => {
      const calls1 = [];
      const calls2 = [];
      system.on('break', (d) => calls1.push(d));
      system.on('break', (d) => calls2.push(d));
      system._emit('break', { x: 1 });
      expect(calls1).toHaveLength(1);
      expect(calls2).toHaveLength(1);
    });

    it('off only removes the specific callback', () => {
      const calls1 = [];
      const calls2 = [];
      const cb1 = (d) => calls1.push(d);
      const cb2 = (d) => calls2.push(d);
      system.on('collision', cb1);
      system.on('collision', cb2);
      system.off('collision', cb1);
      system._emit('collision', { x: 1 });
      expect(calls1).toHaveLength(0);
      expect(calls2).toHaveLength(1);
    });

    it('on with unknown event does not throw', () => {
      expect(() => system.on('unknown', () => {})).not.toThrow();
    });

    it('off with unknown event does not throw', () => {
      expect(() => system.off('unknown', () => {})).not.toThrow();
    });
  });
});
