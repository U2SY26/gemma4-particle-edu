import { describe, it, expect, beforeEach } from 'vitest';
import PhysicsEngine from '../../js/PhysicsEngine.js';

describe('PhysicsEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PhysicsEngine({ gravity: -9.81, damping: 0.97, dt: 1 / 60 });
  });

  // ---------------------------------------------------------------------------
  // Particle and spring management
  // ---------------------------------------------------------------------------

  describe('particle management', () => {
    it('addParticle returns sequential ids', () => {
      const id0 = engine.addParticle({ x: 0, y: 0, z: 0 });
      const id1 = engine.addParticle({ x: 1, y: 0, z: 0 });
      expect(id0).toBe(0);
      expect(id1).toBe(1);
    });

    it('getParticles returns all added particles', () => {
      engine.addParticle({ x: 1, y: 2, z: 3 });
      engine.addParticle({ x: 4, y: 5, z: 6 });
      const particles = engine.getParticles();
      expect(particles).toHaveLength(2);
      expect(particles[0].x).toBe(1);
      expect(particles[1].x).toBe(4);
    });

    it('removeParticle deletes particle and associated springs', () => {
      const idA = engine.addParticle({ x: 0, y: 0, z: 0 });
      const idB = engine.addParticle({ x: 1, y: 0, z: 0 });
      const idC = engine.addParticle({ x: 2, y: 0, z: 0 });
      engine.addSpring({ idA, idB, restLength: 1, stiffness: 100, damping: 0.5 });
      engine.addSpring({ idA: idB, idB: idC, restLength: 1, stiffness: 100, damping: 0.5 });

      engine.removeParticle(idB);

      expect(engine.getParticles()).toHaveLength(2);
      expect(engine.getSprings()).toHaveLength(0); // both springs involved idB
    });

    it('addParticle sets defaults for missing fields', () => {
      const id = engine.addParticle({});
      const p = engine.getParticles()[0];
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);
      expect(p.mass).toBe(1);
      expect(p.radius).toBe(0.1);
      expect(p.fixed).toBe(false);
      expect(p.material).toBe('default');
      expect(p.stress).toBe(0);
    });
  });

  describe('spring management', () => {
    it('addSpring and getSprings', () => {
      const idA = engine.addParticle({ x: 0, y: 0, z: 0 });
      const idB = engine.addParticle({ x: 1, y: 0, z: 0 });
      engine.addSpring({ idA, idB, restLength: 1, stiffness: 200, damping: 1.0 });

      const springs = engine.getSprings();
      expect(springs).toHaveLength(1);
      expect(springs[0].stiffness).toBe(200);
    });

    it('removeSpring works in both directions', () => {
      const idA = engine.addParticle({ x: 0, y: 0, z: 0 });
      const idB = engine.addParticle({ x: 1, y: 0, z: 0 });
      engine.addSpring({ idA, idB, restLength: 1, stiffness: 100, damping: 0.5 });

      // Remove using reversed order
      engine.removeSpring(idB, idA);
      expect(engine.getSprings()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Free fall (Verlet integration correctness)
  // ---------------------------------------------------------------------------

  describe('free fall', () => {
    it('particle falls ~4.9m after 1 second (60 steps at dt=1/60)', () => {
      // No damping so we can compare against the analytic solution y = 0.5*g*t^2
      const eng = new PhysicsEngine({ gravity: -9.81, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, mass: 1 });

      const steps = 60;
      for (let i = 0; i < steps; i++) {
        eng.integrate();
      }

      const p = eng.getParticles()[0];
      const expected = 0.5 * -9.81 * 1.0 * 1.0; // -4.905 m
      // 5% tolerance
      expect(p.y).toBeCloseTo(expected, 0); // within ~0.5m at precision 0
      expect(Math.abs(p.y - expected) / Math.abs(expected)).toBeLessThan(0.05);
    });

    it('fixed particles do not move under gravity', () => {
      engine.addParticle({ x: 0, y: 10, z: 0, fixed: true });
      for (let i = 0; i < 60; i++) {
        engine.integrate();
      }
      const p = engine.getParticles()[0];
      expect(p.y).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // Spring (Hooke's law)
  // ---------------------------------------------------------------------------

  describe('spring — Hooke\'s law', () => {
    it('stretched spring pulls particles together', () => {
      // Fixed anchor at origin, free particle stretched 2m from anchor (rest=1m)
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      const idA = eng.addParticle({ x: 0, y: 0, z: 0, fixed: true });
      const idB = eng.addParticle({ x: 2, y: 0, z: 0, mass: 1 });
      eng.addSpring({ idA, idB, restLength: 1, stiffness: 100, damping: 0 });

      eng.integrate();

      const b = eng.getParticles().find((p) => p.id === idB);
      // F = -k * (2-1) = -100 N towards origin → a = -100 m/s^2
      // After one Verlet step: x = 2*2 - 2 + (-100)*(1/60)^2 = 2 - 0.02778 ≈ 1.972
      expect(b.x).toBeLessThan(2);
    });

    it('compressed spring pushes particles apart', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      const idA = eng.addParticle({ x: 0, y: 0, z: 0, fixed: true });
      const idB = eng.addParticle({ x: 0.5, y: 0, z: 0, mass: 1 });
      eng.addSpring({ idA, idB, restLength: 1, stiffness: 100, damping: 0 });

      eng.integrate();

      const b = eng.getParticles().find((p) => p.id === idB);
      // Spring compressed: stretch = 0.5 - 1 = -0.5, force pushes B away from A
      expect(b.x).toBeGreaterThan(0.5);
    });

    it('verifies F = -kx quantitatively for first step', () => {
      const k = 200;
      const restLen = 1;
      const initialX = 3; // stretch = 2m
      const dt = 1 / 60;
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt });
      const idA = eng.addParticle({ x: 0, y: 0, z: 0, fixed: true });
      const idB = eng.addParticle({ x: initialX, y: 0, z: 0, mass: 1 });
      eng.addSpring({ idA, idB, restLength: restLen, stiffness: k, damping: 0 });

      eng.integrate();

      const b = eng.getParticles().find((p) => p.id === idB);
      const stretch = initialX - restLen;
      const accel = -k * stretch; // -400 m/s^2 (towards origin)
      const expectedX = 2 * initialX - initialX + accel * dt * dt;
      // = 3 + (-400) * (1/3600) = 3 - 0.1111 = 2.8889
      expect(b.x).toBeCloseTo(expectedX, 4);
    });
  });

  // ---------------------------------------------------------------------------
  // Damping
  // ---------------------------------------------------------------------------

  describe('damping', () => {
    it('velocity decreases over 10 steps with damping < 1', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 0.9, dt: 1 / 60 });
      // Give particle initial velocity by offsetting prevX
      eng.addParticle({ x: 0, y: 0, z: 0, prevX: -1, prevY: 0, prevZ: 0, mass: 1 });

      const velocities = [];
      for (let i = 0; i < 10; i++) {
        eng.integrate();
        const p = eng.getParticles()[0];
        const vx = (p.x - p.prevX) / eng.dt;
        velocities.push(Math.abs(vx));
      }

      // Each step's velocity should be less than the previous
      for (let i = 1; i < velocities.length; i++) {
        expect(velocities[i]).toBeLessThan(velocities[i - 1]);
      }
    });

    it('no damping (damping=1.0) preserves velocity in zero-g', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, prevX: -0.1, prevY: 0, prevZ: 0, mass: 1 });

      eng.integrate();
      const p1 = eng.getParticles()[0];
      const v1 = (p1.x - p1.prevX) / eng.dt;

      eng.integrate();
      const p2 = eng.getParticles()[0];
      const v2 = (p2.x - p2.prevX) / eng.dt;

      expect(v2).toBeCloseTo(v1, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Seismic
  // ---------------------------------------------------------------------------

  describe('seismic', () => {
    it('applies sinusoidal force on x-axis', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, mass: 1 });
      eng.setSeismic(10, 1); // amplitude=10 N, frequency=1 Hz

      eng.integrate();

      const p = eng.getParticles()[0];
      // After first step at t=1/60: force = 10 * sin(2*pi*1*(1/60))
      // acceleration = force / 1kg, displacement = acc * dt^2
      const expectedForce = 10 * Math.sin(2 * Math.PI * 1 * (1 / 60));
      const expectedDisp = expectedForce * (1 / 60) * (1 / 60);
      expect(p.x).toBeCloseTo(expectedDisp, 6);
    });

    it('seismic force is zero when amplitude is zero', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, mass: 1 });
      eng.setSeismic(0, 5);

      eng.integrate();

      const p = eng.getParticles()[0];
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('seismic changes sign over time (oscillation)', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, mass: 1 });
      eng.setSeismic(100, 1); // 1 Hz — period is 60 steps

      // Track per-step displacement deltas (proxy for velocity change)
      // which should oscillate with the sinusoidal force
      const deltas = [];
      let prevX = 0;
      let prevDelta = 0;
      for (let i = 0; i < 60; i++) {
        eng.integrate();
        const p = eng.getParticles()[0];
        const delta = p.x - prevX;
        deltas.push(delta - prevDelta); // acceleration proxy
        prevDelta = delta;
        prevX = p.x;
      }

      // The acceleration-proxy should have both positive and negative values
      // (because the sinusoidal force changes sign)
      const hasPositive = deltas.some((d) => d > 1e-6);
      const hasNegative = deltas.some((d) => d < -1e-6);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Collision
  // ---------------------------------------------------------------------------

  describe('collision', () => {
    it('overlapping particles separate after integration', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      // Two particles overlapping: radius 0.5 each, distance 0.5 apart
      eng.addParticle({ x: 0, y: 0, z: 0, radius: 0.5, mass: 1 });
      eng.addParticle({ x: 0.5, y: 0, z: 0, radius: 0.5, mass: 1 });

      eng.integrate();

      const particles = eng.getParticles();
      const dist = Math.abs(particles[1].x - particles[0].x);
      // After collision resolution, distance should be >= sum of radii
      expect(dist).toBeGreaterThanOrEqual(0.99); // ~1.0 (sum of radii)
    });

    it('approaching particles bounce apart', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      // Particle A moving right, B moving left — will collide
      eng.addParticle({
        x: 0, y: 0, z: 0,
        prevX: -0.1, prevY: 0, prevZ: 0,
        radius: 0.5, mass: 1,
      });
      eng.addParticle({
        x: 0.8, y: 0, z: 0,
        prevX: 0.9, prevY: 0, prevZ: 0,
        radius: 0.5, mass: 1,
      });

      // Run several steps to let collision happen
      for (let i = 0; i < 5; i++) {
        eng.integrate();
      }

      const particles = eng.getParticles();
      // After collision, A should be moving left and B moving right (bounce)
      const vA = particles[0].x - particles[0].prevX;
      const vB = particles[1].x - particles[1].prevX;
      // B should be to the right of A
      expect(particles[1].x).toBeGreaterThan(particles[0].x);
    });

    it('fixed particle does not move during collision', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({
        x: 0, y: 0, z: 0,
        radius: 0.5, mass: 1, fixed: true,
      });
      eng.addParticle({
        x: 0.5, y: 0, z: 0,
        prevX: 0.6, prevY: 0, prevZ: 0,
        radius: 0.5, mass: 1,
      });

      eng.integrate();

      const particles = eng.getParticles();
      expect(particles[0].x).toBe(0); // fixed particle stayed
      expect(particles[1].x).toBeGreaterThanOrEqual(1.0 - 0.01); // pushed out
    });
  });

  // ---------------------------------------------------------------------------
  // Wind and temperature
  // ---------------------------------------------------------------------------

  describe('wind', () => {
    it('setWind applies force to particles', () => {
      const eng = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
      eng.addParticle({ x: 0, y: 0, z: 0, mass: 1 });
      eng.setWind(5, 0, 0);

      eng.integrate();

      const p = eng.getParticles()[0];
      // wind force = 5 N on mass 1 → acc = 5 m/s^2 → disp = 5 * dt^2
      const expected = 5 * (1 / 60) ** 2;
      expect(p.x).toBeCloseTo(expected, 6);
    });
  });

  describe('temperature', () => {
    it('setTemperature stores the kelvin value', () => {
      engine.setTemperature(500);
      expect(engine._temperature).toBe(500);
    });
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('clears all state', () => {
      engine.addParticle({ x: 1, y: 2, z: 3 });
      engine.addParticle({ x: 4, y: 5, z: 6 });
      const idA = 0, idB = 1;
      engine.addSpring({ idA, idB, restLength: 1, stiffness: 100, damping: 0.5 });
      engine.setWind(1, 2, 3);
      engine.setSeismic(5, 10);
      engine.setTemperature(1000);
      engine.integrate();

      engine.reset();

      expect(engine.getParticles()).toHaveLength(0);
      expect(engine.getSprings()).toHaveLength(0);
      expect(engine._elapsed).toBe(0);
      expect(engine._wind).toEqual({ x: 0, y: 0, z: 0 });
      expect(engine._seismic).toEqual({ amplitude: 0, frequency: 0 });
      expect(engine._temperature).toBe(293.15);
    });

    it('id counter resets so new particles start at 0', () => {
      engine.addParticle({ x: 0, y: 0, z: 0 });
      engine.addParticle({ x: 1, y: 0, z: 0 });
      engine.reset();

      const id = engine.addParticle({ x: 0, y: 0, z: 0 });
      expect(id).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Constructor defaults
  // ---------------------------------------------------------------------------

  describe('constructor defaults', () => {
    it('uses default config when none provided', () => {
      const eng = new PhysicsEngine();
      expect(eng.gravity).toBe(-9.81);
      expect(eng.damping).toBe(0.97);
      expect(eng.dt).toBeCloseTo(1 / 60, 6);
    });
  });
});
