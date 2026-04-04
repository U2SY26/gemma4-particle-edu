/**
 * PhysicsEngine — Verlet integration physics engine
 *
 * SI units throughout: meters, kilograms, seconds, Kelvin, Pascals.
 * Position-based Verlet: newPos = 2*pos - prevPos + acc*dt^2
 */
export default class PhysicsEngine {
  /**
   * @param {Object} config
   * @param {number} config.gravity  - gravitational acceleration (m/s^2, negative = down)
   * @param {number} config.damping  - velocity damping factor per step (0..1)
   * @param {number} config.dt       - default timestep (seconds)
   */
  constructor(config = {}) {
    this.gravity = config.gravity ?? -9.81;
    this.damping = config.damping ?? 0.97;
    this.dt = config.dt ?? 1 / 60;

    /** @type {Map<number, Object>} */
    this._particles = new Map();
    /** @type {Array<Object>} */
    this._springs = [];

    this._nextId = 0;
    this._elapsed = 0;

    // External forces
    this._wind = { x: 0, y: 0, z: 0 };
    this._seismic = { amplitude: 0, frequency: 0 };
    this._temperature = 293.15; // default ~20 C
  }

  // ---------------------------------------------------------------------------
  // Particle management
  // ---------------------------------------------------------------------------

  /**
   * Add a particle and return its assigned id.
   * @param {Object} particle
   * @returns {number} id
   */
  addParticle(particle) {
    const id = this._nextId++;
    const p = {
      id,
      x: particle.x ?? 0,
      y: particle.y ?? 0,
      z: particle.z ?? 0,
      prevX: particle.prevX ?? particle.x ?? 0,
      prevY: particle.prevY ?? particle.y ?? 0,
      prevZ: particle.prevZ ?? particle.z ?? 0,
      ax: particle.ax ?? 0,
      ay: particle.ay ?? 0,
      az: particle.az ?? 0,
      mass: particle.mass ?? 1,
      radius: particle.radius ?? 0.1,
      fixed: particle.fixed ?? false,
      material: particle.material ?? 'default',
      stress: particle.stress ?? 0,
    };
    this._particles.set(id, p);
    return id;
  }

  /**
   * Remove a particle by id. Also removes any springs referencing it.
   * @param {number} id
   */
  removeParticle(id) {
    this._particles.delete(id);
    this._springs = this._springs.filter(
      (s) => s.idA !== id && s.idB !== id,
    );
  }

  /**
   * @returns {Object[]} array of all particles
   */
  getParticles() {
    return Array.from(this._particles.values());
  }

  // ---------------------------------------------------------------------------
  // Spring management
  // ---------------------------------------------------------------------------

  /**
   * Add a spring-damper between two particles.
   * @param {Object} spring  { idA, idB, restLength, stiffness, damping }
   */
  addSpring(spring) {
    this._springs.push({
      idA: spring.idA,
      idB: spring.idB,
      restLength: spring.restLength ?? 1,
      stiffness: spring.stiffness ?? 100,
      damping: spring.damping ?? 0.5,
    });
  }

  /**
   * Remove a spring between idA and idB (in either direction).
   * @param {number} idA
   * @param {number} idB
   */
  removeSpring(idA, idB) {
    this._springs = this._springs.filter(
      (s) =>
        !((s.idA === idA && s.idB === idB) || (s.idA === idB && s.idB === idA)),
    );
  }

  /**
   * @returns {Object[]} array of all springs
   */
  getSprings() {
    return [...this._springs];
  }

  // ---------------------------------------------------------------------------
  // Configuration setters
  // ---------------------------------------------------------------------------

  /** @param {number} value  gravitational acceleration (m/s^2) */
  setGravity(value) {
    this.gravity = value;
  }

  /** @param {number} value  damping coefficient (0..1) */
  setDamping(value) {
    this.damping = value;
  }

  /** Set wind force vector */
  setWind(x, y, z) {
    this._wind = { x, y, z };
  }

  /** Set seismic parameters */
  setSeismic(amplitude, frequency) {
    this._seismic = { amplitude, frequency };
  }

  /** @param {number} kelvin */
  setTemperature(kelvin) {
    this._temperature = kelvin;
  }

  // ---------------------------------------------------------------------------
  // Integration
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by one timestep using Verlet integration.
   * @param {number} [dt]  timestep override
   */
  integrate(dt) {
    const step = dt ?? this.dt;
    const dtSq = step * step;

    this._elapsed += step;

    // --- accumulate forces ---------------------------------------------------
    for (const p of this._particles.values()) {
      if (p.fixed) continue;

      // Reset acceleration
      p.ax = 0;
      p.ay = 0;
      p.az = 0;

      // Gravity (y-axis)
      p.ay += this.gravity;

      // Wind (force / mass → acceleration)
      p.ax += this._wind.x / p.mass;
      p.ay += this._wind.y / p.mass;
      p.az += this._wind.z / p.mass;

      // Seismic (sinusoidal on x-axis)
      if (this._seismic.amplitude !== 0) {
        const seismicForce =
          this._seismic.amplitude *
          Math.sin(2 * Math.PI * this._seismic.frequency * this._elapsed);
        p.ax += seismicForce / p.mass;
      }
    }

    // --- spring-damper forces ------------------------------------------------
    for (const s of this._springs) {
      const a = this._particles.get(s.idA);
      const b = this._particles.get(s.idB);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) continue;

      // Hooke's law: F = -k * (dist - restLength)
      const stretch = dist - s.restLength;
      const forceMagnitude = s.stiffness * stretch;

      // Unit direction from A to B
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // Relative velocity (Verlet-estimated) along spring axis for damping
      const vaX = (a.x - a.prevX) / step;
      const vaY = (a.y - a.prevY) / step;
      const vaZ = (a.z - a.prevZ) / step;
      const vbX = (b.x - b.prevX) / step;
      const vbY = (b.y - b.prevY) / step;
      const vbZ = (b.z - b.prevZ) / step;

      const relVelX = vbX - vaX;
      const relVelY = vbY - vaY;
      const relVelZ = vbZ - vaZ;
      const relVelAlongSpring = relVelX * nx + relVelY * ny + relVelZ * nz;

      const dampForce = s.damping * relVelAlongSpring;
      const totalForce = forceMagnitude + dampForce;

      const fx = totalForce * nx;
      const fy = totalForce * ny;
      const fz = totalForce * nz;

      if (!a.fixed) {
        a.ax += fx / a.mass;
        a.ay += fy / a.mass;
        a.az += fz / a.mass;
      }
      if (!b.fixed) {
        b.ax -= fx / b.mass;
        b.ay -= fy / b.mass;
        b.az -= fz / b.mass;
      }
    }

    // --- Verlet integration --------------------------------------------------
    for (const p of this._particles.values()) {
      if (p.fixed) continue;

      const newX = 2 * p.x - p.prevX + p.ax * dtSq;
      const newY = 2 * p.y - p.prevY + p.ay * dtSq;
      const newZ = 2 * p.z - p.prevZ + p.az * dtSq;

      p.prevX = p.x;
      p.prevY = p.y;
      p.prevZ = p.z;

      p.x = newX;
      p.y = newY;
      p.z = newZ;
    }

    // --- Velocity damping (applied via position adjustment) ------------------
    for (const p of this._particles.values()) {
      if (p.fixed) continue;

      // Effective velocity from Verlet: v ≈ (pos - prevPos) / dt
      // Damped velocity: v' = v * damping
      // New prevPos so that (pos - prevPos') / dt = v * damping
      // prevPos' = pos - (pos - prevPos) * damping
      p.prevX = p.x - (p.x - p.prevX) * this.damping;
      p.prevY = p.y - (p.y - p.prevY) * this.damping;
      p.prevZ = p.z - (p.z - p.prevZ) * this.damping;
    }

    // --- Collision detection & response (distance-based) ---------------------
    const particles = Array.from(this._particles.values());
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          // Normal direction from a to b
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Separate particles proportional to inverse mass
          const totalMass = a.mass + b.mass;
          const ratioA = a.fixed ? 0 : b.mass / totalMass;
          const ratioB = b.fixed ? 0 : a.mass / totalMass;

          // If both fixed, skip
          if (a.fixed && b.fixed) continue;

          // Re-normalise ratios if one is fixed
          const ratioSum = ratioA + ratioB;
          const nRatioA = ratioA / ratioSum;
          const nRatioB = ratioB / ratioSum;

          if (!a.fixed) {
            a.x -= nx * overlap * nRatioA;
            a.y -= ny * overlap * nRatioA;
            a.z -= nz * overlap * nRatioA;
          }
          if (!b.fixed) {
            b.x += nx * overlap * nRatioB;
            b.y += ny * overlap * nRatioB;
            b.z += nz * overlap * nRatioB;
          }

          // Velocity reflection (bounciness = 0.5, friction = 0.3)
          const bounciness = 0.5;
          const friction = 0.3;

          const vaX = (a.x - a.prevX);
          const vaY = (a.y - a.prevY);
          const vaZ = (a.z - a.prevZ);
          const vbX = (b.x - b.prevX);
          const vbY = (b.y - b.prevY);
          const vbZ = (b.z - b.prevZ);

          // Relative velocity
          const relX = vaX - vbX;
          const relY = vaY - vbY;
          const relZ = vaZ - vbZ;
          const relNormal = relX * nx + relY * ny + relZ * nz;

          // Only resolve if particles are approaching
          if (relNormal > 0) continue;

          // Normal impulse
          const impulseMag = -(1 + bounciness) * relNormal / (1 / a.mass + 1 / b.mass);
          const impulseX = impulseMag * nx;
          const impulseY = impulseMag * ny;
          const impulseZ = impulseMag * nz;

          // Tangential friction
          const tangX = relX - relNormal * nx;
          const tangY = relY - relNormal * ny;
          const tangZ = relZ - relNormal * nz;
          const tangLen = Math.sqrt(tangX * tangX + tangY * tangY + tangZ * tangZ);

          let frictionX = 0, frictionY = 0, frictionZ = 0;
          if (tangLen > 1e-10) {
            const frictionMag = Math.min(friction * Math.abs(impulseMag), tangLen);
            frictionX = -frictionMag * (tangX / tangLen);
            frictionY = -frictionMag * (tangY / tangLen);
            frictionZ = -frictionMag * (tangZ / tangLen);
          }

          // Apply to prevPos (Verlet velocity is encoded in position difference)
          if (!a.fixed) {
            a.prevX -= (impulseX + frictionX) / a.mass;
            a.prevY -= (impulseY + frictionY) / a.mass;
            a.prevZ -= (impulseZ + frictionZ) / a.mass;
          }
          if (!b.fixed) {
            b.prevX += (impulseX + frictionX) / b.mass;
            b.prevY += (impulseY + frictionY) / b.mass;
            b.prevZ += (impulseZ + frictionZ) / b.mass;
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  /** Clear all particles, springs, and reset state. */
  reset() {
    this._particles.clear();
    this._springs = [];
    this._nextId = 0;
    this._elapsed = 0;
    this._wind = { x: 0, y: 0, z: 0 };
    this._seismic = { amplitude: 0, frequency: 0 };
    this._temperature = 293.15;
  }
}
