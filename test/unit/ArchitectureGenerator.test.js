import { describe, it, expect, beforeEach } from 'vitest';
import PhysicsEngine from '../../js/PhysicsEngine.js';
import ParticleSystem from '../../js/ParticleSystem.js';
import ArchitectureGenerator from '../../js/ArchitectureGenerator.js';

describe('ArchitectureGenerator', () => {
  let engine;
  let system;
  let generator;

  beforeEach(() => {
    engine = new PhysicsEngine({ gravity: 0, damping: 1.0, dt: 1 / 60 });
    system = new ParticleSystem(engine);
    generator = new ArchitectureGenerator(system);
  });

  // ---------------------------------------------------------------------------
  // getTypes
  // ---------------------------------------------------------------------------

  describe('getTypes', () => {
    it('returns 5 structure types', () => {
      const types = generator.getTypes();
      expect(types).toHaveLength(5);
    });

    it('includes all required types', () => {
      const types = generator.getTypes();
      expect(types).toContain('bridge');
      expect(types).toContain('building');
      expect(types).toContain('tower');
      expect(types).toContain('wall');
      expect(types).toContain('arch');
    });

    it('returns a new array each time (no mutation leak)', () => {
      const a = generator.getTypes();
      const b = generator.getTypes();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefaultParams
  // ---------------------------------------------------------------------------

  describe('getDefaultParams', () => {
    it('returns expected keys for bridge', () => {
      const params = ArchitectureGenerator.getDefaultParams('bridge');
      expect(params).toHaveProperty('length');
      expect(params).toHaveProperty('height');
      expect(params).toHaveProperty('segments');
      expect(params).toHaveProperty('material');
    });

    it('returns expected keys for building', () => {
      const params = ArchitectureGenerator.getDefaultParams('building');
      expect(params).toHaveProperty('floors');
      expect(params).toHaveProperty('width');
      expect(params).toHaveProperty('depth');
      expect(params).toHaveProperty('material');
    });

    it('returns expected keys for tower', () => {
      const params = ArchitectureGenerator.getDefaultParams('tower');
      expect(params).toHaveProperty('height');
      expect(params).toHaveProperty('baseWidth');
      expect(params).toHaveProperty('segments');
      expect(params).toHaveProperty('material');
    });

    it('returns expected keys for wall', () => {
      const params = ArchitectureGenerator.getDefaultParams('wall');
      expect(params).toHaveProperty('width');
      expect(params).toHaveProperty('height');
      expect(params).toHaveProperty('rows');
      expect(params).toHaveProperty('cols');
      expect(params).toHaveProperty('material');
    });

    it('returns expected keys for arch', () => {
      const params = ArchitectureGenerator.getDefaultParams('arch');
      expect(params).toHaveProperty('span');
      expect(params).toHaveProperty('height');
      expect(params).toHaveProperty('segments');
      expect(params).toHaveProperty('material');
    });

    it('returns null for unknown type', () => {
      expect(ArchitectureGenerator.getDefaultParams('spaceship')).toBeNull();
    });

    it('returns a copy (no mutation of defaults)', () => {
      const a = ArchitectureGenerator.getDefaultParams('bridge');
      const b = ArchitectureGenerator.getDefaultParams('bridge');
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  // ---------------------------------------------------------------------------
  // generate — unknown type
  // ---------------------------------------------------------------------------

  describe('generate — error handling', () => {
    it('throws for unknown structure type', () => {
      expect(() => generator.generate('spaceship')).toThrow('Unknown structure type: spaceship');
    });

    it('throws for unknown material', () => {
      expect(() => generator.generate('bridge', { material: 'unobtanium' })).toThrow('Unknown material: unobtanium');
    });
  });

  // ---------------------------------------------------------------------------
  // generate — bridge
  // ---------------------------------------------------------------------------

  describe('generate — bridge', () => {
    it('creates particles and springs', () => {
      const result = generator.generate('bridge', { segments: 4 });
      expect(result.particles.length).toBeGreaterThan(0);
      expect(result.springs.length).toBeGreaterThan(0);
      expect(result.type).toBe('bridge');
    });

    it('has top and bottom chord particles', () => {
      const params = { length: 10, height: 2, segments: 4, material: 'iron' };
      const result = generator.generate('bridge', params);
      // segments=4 -> 5 top + 5 bottom = 10 particles
      expect(result.particles).toHaveLength(10);
    });

    it('foundation particles at ends are fixed', () => {
      const result = generator.generate('bridge', { segments: 4 });
      const fixed = result.particles.filter((p) => p.fixed);
      // 4 foundation points: top-left, top-right, bottom-left, bottom-right
      expect(fixed.length).toBe(4);
    });

    it('creates diagonal bracing springs', () => {
      const params = { segments: 4 };
      const result = generator.generate('bridge', params);
      // top horizontal: 4, bottom horizontal: 4, vertical: 5, diagonals: 2*4=8
      // total = 4 + 4 + 5 + 8 = 21
      expect(result.springs).toHaveLength(21);
    });

    it('particles are added to the physics engine', () => {
      generator.generate('bridge', { segments: 4 });
      expect(engine.getParticles().length).toBe(10);
      expect(engine.getSprings().length).toBe(21);
    });

    it('uses specified material on particles', () => {
      const result = generator.generate('bridge', { material: 'aluminum', segments: 2 });
      for (const p of result.particles) {
        expect(p.material).toBe('aluminum');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // generate — building
  // ---------------------------------------------------------------------------

  describe('generate — building', () => {
    it('creates multi-floor structure', () => {
      const result = generator.generate('building', { floors: 3 });
      expect(result.particles.length).toBeGreaterThan(0);
      expect(result.springs.length).toBeGreaterThan(0);
      expect(result.type).toBe('building');
    });

    it('has correct particle count for N floors', () => {
      const result = generator.generate('building', { floors: 5 });
      // (floors + 1) * 4 corners = 6 * 4 = 24
      expect(result.particles).toHaveLength(24);
    });

    it('foundation (floor 0) particles are fixed', () => {
      const result = generator.generate('building', { floors: 3 });
      const fixed = result.particles.filter((p) => p.fixed);
      // 4 corner particles at floor 0
      expect(fixed).toHaveLength(4);
    });

    it('upper floor particles are not fixed', () => {
      const result = generator.generate('building', { floors: 2 });
      // 3 levels * 4 corners = 12 total, 4 fixed
      const notFixed = result.particles.filter((p) => !p.fixed);
      expect(notFixed).toHaveLength(8);
    });

    it('uses concrete by default', () => {
      const result = generator.generate('building');
      for (const p of result.particles) {
        expect(p.material).toBe('concrete');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // generate — tower
  // ---------------------------------------------------------------------------

  describe('generate — tower', () => {
    it('generates with default params when no params given', () => {
      const result = generator.generate('tower');
      expect(result.particles.length).toBeGreaterThan(0);
      expect(result.springs.length).toBeGreaterThan(0);
      expect(result.type).toBe('tower');
    });

    it('base ring particles are fixed', () => {
      const result = generator.generate('tower', { segments: 4 });
      const fixed = result.particles.filter((p) => p.fixed);
      // 4 corners at base
      expect(fixed).toHaveLength(4);
    });

    it('tapers toward top (top ring is narrower)', () => {
      const result = generator.generate('tower', { baseWidth: 4, segments: 4 });
      // Base corners are at +/-2, top corners at +/-0.6 (30% of base)
      const baseParticles = result.particles.slice(0, 4);
      const topParticles = result.particles.slice(-4);

      const baseMaxX = Math.max(...baseParticles.map((p) => Math.abs(p.x)));
      const topMaxX = Math.max(...topParticles.map((p) => Math.abs(p.x)));
      expect(topMaxX).toBeLessThan(baseMaxX);
    });

    it('has correct particle count', () => {
      const result = generator.generate('tower', { segments: 6 });
      // (segments + 1) * 4 corners = 7 * 4 = 28
      expect(result.particles).toHaveLength(28);
    });

    it('uses carbon_steel by default', () => {
      const result = generator.generate('tower');
      for (const p of result.particles) {
        expect(p.material).toBe('carbon_steel');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // generate — wall
  // ---------------------------------------------------------------------------

  describe('generate — wall', () => {
    it('creates grid of particles', () => {
      const result = generator.generate('wall', { rows: 3, cols: 4 });
      expect(result.particles).toHaveLength(12); // 3 * 4
      expect(result.type).toBe('wall');
    });

    it('bottom row is fixed', () => {
      const result = generator.generate('wall', { rows: 3, cols: 4 });
      const fixed = result.particles.filter((p) => p.fixed);
      // Bottom row = cols particles
      expect(fixed).toHaveLength(4);
    });

    it('has horizontal, vertical, and diagonal springs', () => {
      const result = generator.generate('wall', { rows: 3, cols: 4 });
      // horizontal: 3 rows * 3 = 9
      // vertical: 2 * 4 = 8
      // diagonal: 2 * 2 * 3 = 12
      // total = 9 + 8 + 12 = 29
      expect(result.springs).toHaveLength(29);
    });

    it('fixed particles are at y=0', () => {
      const result = generator.generate('wall', { rows: 3, cols: 4 });
      const fixed = result.particles.filter((p) => p.fixed);
      for (const p of fixed) {
        expect(p.y).toBe(0);
      }
    });

    it('all particles have z=0 (flat wall)', () => {
      const result = generator.generate('wall', { rows: 3, cols: 4 });
      for (const p of result.particles) {
        expect(p.z).toBe(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // generate — arch
  // ---------------------------------------------------------------------------

  describe('generate — arch', () => {
    it('creates semicircular particles', () => {
      const result = generator.generate('arch', { segments: 8 });
      expect(result.particles).toHaveLength(9); // segments + 1
      expect(result.type).toBe('arch');
    });

    it('fixed at both base points', () => {
      const result = generator.generate('arch', { segments: 8 });
      const fixed = result.particles.filter((p) => p.fixed);
      expect(fixed).toHaveLength(2);
    });

    it('base points are at opposite sides of span', () => {
      const result = generator.generate('arch', { span: 8, segments: 8 });
      const fixed = result.particles.filter((p) => p.fixed);
      // Left base: x = -span/2, right base: x = span/2
      const xs = fixed.map((p) => p.x).sort((a, b) => a - b);
      expect(xs[0]).toBeCloseTo(-4, 5);
      expect(xs[1]).toBeCloseTo(4, 5);
    });

    it('apex is at correct height', () => {
      const result = generator.generate('arch', { span: 8, height: 4, segments: 12 });
      // The apex (middle particle) should be near y = height
      const ys = result.particles.map((p) => p.y);
      const maxY = Math.max(...ys);
      expect(maxY).toBeCloseTo(4, 5);
    });

    it('has sequential and reinforcement springs', () => {
      const result = generator.generate('arch', { segments: 8 });
      // sequential: 8, reinforcement (skip-one): 7
      // total = 8 + 7 = 15
      expect(result.springs).toHaveLength(15);
    });

    it('uses iron by default', () => {
      const result = generator.generate('arch');
      for (const p of result.particles) {
        expect(p.material).toBe('iron');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Common behavior across all types
  // ---------------------------------------------------------------------------

  describe('common behavior', () => {
    it('all 5 types generate valid structures', () => {
      const types = generator.getTypes();
      for (const type of types) {
        // Reset engine between types
        engine.reset();
        const result = generator.generate(type);
        expect(result.type).toBe(type);
        expect(result.particles.length).toBeGreaterThan(0);
        expect(result.springs.length).toBeGreaterThan(0);
        expect(Array.isArray(result.particles)).toBe(true);
        expect(Array.isArray(result.springs)).toBe(true);
      }
    });

    it('foundation particles are marked fixed for all types', () => {
      const types = generator.getTypes();
      for (const type of types) {
        engine.reset();
        const result = generator.generate(type);
        const fixed = result.particles.filter((p) => p.fixed);
        expect(fixed.length).toBeGreaterThan(0);
      }
    });

    it('spring stiffness is derived from material elasticModulus / 1e6', () => {
      const result = generator.generate('bridge', { segments: 2, material: 'iron' });
      const expectedStiffness = 200e9 / 1e6; // iron elasticModulus / 1e6
      for (const s of result.springs) {
        expect(s.stiffness).toBeCloseTo(expectedStiffness, 0);
      }
    });

    it('custom params override defaults', () => {
      const result = generator.generate('bridge', { segments: 2, material: 'aluminum' });
      for (const p of result.particles) {
        expect(p.material).toBe('aluminum');
      }
      const expectedStiffness = 69e9 / 1e6; // aluminum
      for (const s of result.springs) {
        expect(s.stiffness).toBeCloseTo(expectedStiffness, 0);
      }
    });

    it('particles have valid mass from material density', () => {
      const result = generator.generate('wall', { rows: 2, cols: 2, material: 'iron' });
      const radius = 0.1;
      const volume = (4 / 3) * Math.PI * radius * radius * radius;
      const expectedMass = 7874 * volume;
      for (const p of result.particles) {
        expect(p.mass).toBeCloseTo(expectedMass, 6);
      }
    });

    it('spring restLength matches actual particle distance', () => {
      const result = generator.generate('wall', { rows: 2, cols: 2 });
      const pMap = new Map(result.particles.map((p) => [p.id, p]));
      const engineSprings = engine.getSprings();

      for (const s of engineSprings) {
        const a = pMap.get(s.idA);
        const b = pMap.get(s.idB);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        expect(s.restLength).toBeCloseTo(dist, 8);
      }
    });
  });
});
