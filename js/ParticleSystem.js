/**
 * ParticleSystem — 파티클 라이프사이클 관리자
 *
 * PhysicsEngine 위에서 파티클 생성, 스프링 연결, 응력 모니터링,
 * 이벤트 방출을 담당한다.
 */
import Materials from './Materials.js';

export default class ParticleSystem {
  /**
   * @param {import('./PhysicsEngine.js').default} physicsEngine
   */
  constructor(physicsEngine) {
    this._engine = physicsEngine;

    /** @type {Map<number, { material: string, radius: number }>} */
    this._particleMeta = new Map();

    /**
     * 스프링별 메타데이터 (재료 정보 포함).
     * 키: "idA:idB" (작은 id가 항상 앞)
     * @type {Map<string, { material: string, crossArea: number, yieldStrength: number }>}
     */
    this._springMeta = new Map();

    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map([
      ['collision', new Set()],
      ['yield', new Set()],
      ['break', new Set()],
    ]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** 스프링 키를 항상 정렬된 순서로 생성한다. */
  static _springKey(idA, idB) {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }

  // ---------------------------------------------------------------------------
  // spawn
  // ---------------------------------------------------------------------------

  /**
   * 파티클을 생성하고 인접한 것들을 스프링으로 연결한다.
   *
   * @param {Object} config
   * @param {number}  config.count    - 생성할 파티클 수
   * @param {string}  config.material - Materials 데이터베이스 키
   * @param {{x:number, y:number, z:number}} config.position - 시작 위치
   * @param {{x:number, y:number, z:number}} config.velocity - 초기 속도
   * @param {boolean} [config.fixed=false]
   * @returns {Object[]} 생성된 파티클 배열
   */
  spawn(config) {
    const {
      count = 1,
      material: matName = 'iron',
      position = { x: 0, y: 0, z: 0 },
      velocity = { x: 0, y: 0, z: 0 },
      fixed = false,
    } = config;

    const mat = Materials.getMaterial(matName);
    if (!mat) {
      throw new Error(`Unknown material: ${matName}`);
    }

    const radius = 0.1; // 기본 반지름 (m)
    const volume = (4 / 3) * Math.PI * radius * radius * radius;
    const mass = mat.density * volume;

    const dt = this._engine.dt;
    const created = [];

    for (let i = 0; i < count; i++) {
      // 여러 파티클일 때 x축으로 나란히 배치 (간격 = 2 * radius)
      const offsetX = i * radius * 2;

      const px = position.x + offsetX;
      const py = position.y;
      const pz = position.z;

      // Verlet: prevPos = pos - velocity * dt  →  초기 속도 부여
      const prevX = px - velocity.x * dt;
      const prevY = py - velocity.y * dt;
      const prevZ = pz - velocity.z * dt;

      const id = this._engine.addParticle({
        x: px,
        y: py,
        z: pz,
        prevX,
        prevY,
        prevZ,
        mass,
        radius,
        fixed,
        material: matName,
      });

      this._particleMeta.set(id, { material: matName, radius });
      created.push(this._engine.getParticles().find((p) => p.id === id));
    }

    // 인접 파티클을 스프링으로 연결
    if (created.length > 1) {
      // 시뮬레이션 스케일로 환산한 스프링 강성
      // elasticModulus (Pa) * 단면적 / restLength  → 스프링 상수 (N/m)
      const crossArea = Math.PI * radius * radius;
      const restLength = radius * 2;
      const stiffness = (mat.elasticModulus * crossArea) / restLength;

      for (let i = 0; i < created.length - 1; i++) {
        const idA = created[i].id;
        const idB = created[i + 1].id;

        this._engine.addSpring({
          idA,
          idB,
          restLength,
          stiffness,
          damping: 0.5,
        });

        this._springMeta.set(ParticleSystem._springKey(idA, idB), {
          material: matName,
          crossArea,
          yieldStrength: mat.yieldStrength,
        });
      }
    }

    return created;
  }

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  /**
   * 물리 시뮬레이션을 한 스텝 진행하고 응력을 검사한다.
   * @param {number} dt - 타임스텝 (초)
   */
  update(dt) {
    this._engine.integrate(dt);
    this._checkStress();
  }

  /**
   * 모든 스프링의 응력을 검사하고 yield/break 이벤트를 방출한다.
   * @private
   */
  _checkStress() {
    const springs = this._engine.getSprings();
    const particles = this._engine.getParticles();
    const pMap = new Map(particles.map((p) => [p.id, p]));

    // break 대상을 모아서 루프 이후 제거 (순회 중 변이 방지)
    const toRemove = [];

    for (const s of springs) {
      const a = pMap.get(s.idA);
      const b = pMap.get(s.idB);
      if (!a || !b) continue;

      const key = ParticleSystem._springKey(s.idA, s.idB);
      const meta = this._springMeta.get(key);
      if (!meta) continue;

      // 현재 길이
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // 힘 = 강성 * |변형|
      const forceMag = Math.abs(s.stiffness * (currentLength - s.restLength));

      // 응력 = 힘 / 단면적
      const stress = forceMag / meta.crossArea;

      if (stress > 1.5 * meta.yieldStrength) {
        this._emit('break', { idA: s.idA, idB: s.idB, stress, yieldStrength: meta.yieldStrength });
        toRemove.push({ idA: s.idA, idB: s.idB, key });
      } else if (stress > meta.yieldStrength) {
        this._emit('yield', { idA: s.idA, idB: s.idB, stress, yieldStrength: meta.yieldStrength });
      }
    }

    // 파손된 스프링 제거
    for (const { idA, idB, key } of toRemove) {
      this._engine.removeSpring(idA, idB);
      this._springMeta.delete(key);
    }
  }

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  /** 모든 파티클과 스프링을 제거하고 초기 상태로 복원한다. */
  reset() {
    this._engine.reset();
    this._particleMeta.clear();
    this._springMeta.clear();
  }

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------

  /**
   * 현재 시스템 통계를 반환한다.
   * @returns {{ count: number, avgVelocity: number, maxStress: number }}
   */
  getStats() {
    const particles = this._engine.getParticles();
    const dt = this._engine.dt;

    let totalSpeed = 0;
    for (const p of particles) {
      const vx = (p.x - p.prevX) / dt;
      const vy = (p.y - p.prevY) / dt;
      const vz = (p.z - p.prevZ) / dt;
      totalSpeed += Math.sqrt(vx * vx + vy * vy + vz * vz);
    }

    const avgVelocity = particles.length > 0 ? totalSpeed / particles.length : 0;

    // 최대 응력비 (stress / yieldStrength)
    let maxStress = 0;
    const springs = this._engine.getSprings();
    const pMap = new Map(particles.map((p) => [p.id, p]));

    for (const s of springs) {
      const a = pMap.get(s.idA);
      const b = pMap.get(s.idB);
      if (!a || !b) continue;

      const key = ParticleSystem._springKey(s.idA, s.idB);
      const meta = this._springMeta.get(key);
      if (!meta) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const forceMag = Math.abs(s.stiffness * (currentLength - s.restLength));
      const stress = forceMag / meta.crossArea;
      const ratio = stress / meta.yieldStrength;

      if (ratio > maxStress) {
        maxStress = ratio;
      }
    }

    return {
      count: particles.length,
      avgVelocity,
      maxStress,
    };
  }

  // ---------------------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------------------

  /**
   * 이벤트 리스너를 등록한다.
   * @param {'collision'|'yield'|'break'} event
   * @param {Function} callback
   */
  on(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.add(callback);
    }
  }

  /**
   * 이벤트 리스너를 제거한다.
   * @param {'collision'|'yield'|'break'} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  /**
   * 이벤트를 방출한다.
   * @param {string} event
   * @param {*} data
   * @private
   */
  _emit(event, data) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(data);
    }
  }
}
