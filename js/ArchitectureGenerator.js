/**
 * ArchitectureGenerator — 절차적 건축 구조물 생성기
 *
 * ParticleSystem의 PhysicsEngine을 사용하여 다리, 건물, 탑, 벽, 아치 등
 * 다양한 구조물을 파티클과 스프링으로 생성한다.
 */
import Materials from './Materials.js';

const STRUCTURE_TYPES = ['bridge', 'building', 'tower', 'wall', 'arch'];

const DEFAULT_PARAMS = {
  bridge: { length: 10, height: 2, segments: 8, material: 'iron' },
  building: { floors: 5, width: 4, depth: 4, material: 'concrete' },
  tower: { height: 10, baseWidth: 3, segments: 6, material: 'carbon_steel' },
  wall: { width: 8, height: 5, rows: 5, cols: 8, material: 'concrete' },
  arch: { span: 8, height: 4, segments: 12, material: 'iron' },
};

export default class ArchitectureGenerator {
  /**
   * @param {import('./ParticleSystem.js').default} particleSystem
   */
  constructor(particleSystem) {
    this._particleSystem = particleSystem;
    this._engine = particleSystem._engine;
  }

  /**
   * 지원하는 구조물 타입 목록을 반환한다.
   * @returns {string[]}
   */
  getTypes() {
    return [...STRUCTURE_TYPES];
  }

  /**
   * 특정 타입의 기본 파라미터를 반환한다.
   * @param {string} type
   * @returns {Object|null}
   */
  static getDefaultParams(type) {
    const params = DEFAULT_PARAMS[type];
    if (!params) return null;
    return { ...params };
  }

  /**
   * 구조물을 생성한다.
   *
   * @param {string} type — 구조물 타입 (bridge, building, tower, wall, arch)
   * @param {Object} [params={}] — 타입별 파라미터 (미입력 시 기본값 사용)
   * @returns {{ particles: Object[], springs: Object[], type: string }}
   */
  generate(type, params = {}) {
    if (!STRUCTURE_TYPES.includes(type)) {
      throw new Error(`Unknown structure type: ${type}`);
    }

    const merged = { ...DEFAULT_PARAMS[type], ...params };
    const mat = Materials.getMaterial(merged.material);
    if (!mat) {
      throw new Error(`Unknown material: ${merged.material}`);
    }

    // 시뮬레이션 스케일 스프링 강성: elasticModulus / 1e6
    const stiffness = mat.elasticModulus / 1e6;
    const damping = 0.5;

    let result;
    switch (type) {
      case 'bridge':
        result = this._generateBridge(merged, mat, stiffness, damping);
        break;
      case 'building':
        result = this._generateBuilding(merged, mat, stiffness, damping);
        break;
      case 'tower':
        result = this._generateTower(merged, mat, stiffness, damping);
        break;
      case 'wall':
        result = this._generateWall(merged, mat, stiffness, damping);
        break;
      case 'arch':
        result = this._generateArch(merged, mat, stiffness, damping);
        break;
    }

    return { particles: result.particles, springs: result.springs, type };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * 파티클을 PhysicsEngine에 추가한다.
   * @returns {Object} 생성된 파티클 객체
   */
  _addParticle(x, y, z, mass, radius, fixed, materialName) {
    const id = this._engine.addParticle({
      x, y, z,
      prevX: x, prevY: y, prevZ: z,
      mass,
      radius,
      fixed,
      material: materialName,
    });
    return this._engine.getParticles().find((p) => p.id === id);
  }

  /**
   * 두 파티클 사이에 스프링을 추가한다.
   * @returns {Object} 생성된 스프링의 속성
   */
  _addSpring(pA, pB, stiffness, damping) {
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const dz = pB.z - pA.z;
    const restLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    this._engine.addSpring({
      idA: pA.id,
      idB: pB.id,
      restLength,
      stiffness,
      damping,
    });

    return { idA: pA.id, idB: pB.id, restLength, stiffness, damping };
  }

  /**
   * 재료 밀도로부터 기본 파티클 질량을 계산한다.
   */
  _calcMass(mat) {
    const radius = 0.1;
    const volume = (4 / 3) * Math.PI * radius * radius * radius;
    return mat.density * volume;
  }

  // ---------------------------------------------------------------------------
  // Bridge — 트러스 교량
  // ---------------------------------------------------------------------------

  _generateBridge(params, mat, stiffness, damping) {
    const { length, height, segments, material } = params;
    const mass = this._calcMass(mat);
    const radius = 0.1;
    const segLen = length / segments;

    const topChord = [];
    const bottomChord = [];
    const particles = [];
    const springs = [];

    // 상현재 (top chord) — y = height
    for (let i = 0; i <= segments; i++) {
      const x = i * segLen;
      const fixed = i === 0 || i === segments;
      const p = this._addParticle(x, height, 0, mass, radius, fixed, material);
      topChord.push(p);
      particles.push(p);
    }

    // 하현재 (bottom chord) — y = 0
    for (let i = 0; i <= segments; i++) {
      const x = i * segLen;
      const fixed = i === 0 || i === segments;
      const p = this._addParticle(x, 0, 0, mass, radius, fixed, material);
      bottomChord.push(p);
      particles.push(p);
    }

    // 상현재 수평 스프링
    for (let i = 0; i < segments; i++) {
      springs.push(this._addSpring(topChord[i], topChord[i + 1], stiffness, damping));
    }

    // 하현재 수평 스프링
    for (let i = 0; i < segments; i++) {
      springs.push(this._addSpring(bottomChord[i], bottomChord[i + 1], stiffness, damping));
    }

    // 수직 연결 (vertical members)
    for (let i = 0; i <= segments; i++) {
      springs.push(this._addSpring(topChord[i], bottomChord[i], stiffness, damping));
    }

    // 대각 브레이싱 (diagonal bracing) — 교차 패턴
    for (let i = 0; i < segments; i++) {
      springs.push(this._addSpring(topChord[i], bottomChord[i + 1], stiffness, damping));
      springs.push(this._addSpring(bottomChord[i], topChord[i + 1], stiffness, damping));
    }

    return { particles, springs };
  }

  // ---------------------------------------------------------------------------
  // Building — N층 건물
  // ---------------------------------------------------------------------------

  _generateBuilding(params, mat, stiffness, damping) {
    const { floors, width, depth, material } = params;
    const mass = this._calcMass(mat);
    const radius = 0.1;
    const floorHeight = 3; // 층 높이 (m)

    const particles = [];
    const springs = [];

    // 각 층에 4개의 기둥 꼭짓점 (0=LB, 1=RB, 2=RF, 3=LF)
    // floor 0 = 기초 (고정), floor 1..floors = 각 층
    const grid = []; // grid[floor][corner]

    for (let f = 0; f <= floors; f++) {
      const y = f * floorHeight;
      const fixed = f === 0;
      const row = [];

      const corners = [
        { x: -width / 2, z: -depth / 2 },
        { x: width / 2, z: -depth / 2 },
        { x: width / 2, z: depth / 2 },
        { x: -width / 2, z: depth / 2 },
      ];

      for (const c of corners) {
        const p = this._addParticle(c.x, y, c.z, mass, radius, fixed, material);
        row.push(p);
        particles.push(p);
      }

      grid.push(row);
    }

    // 층별 보 (수평 연결) — 4개 모서리를 사각형으로 연결
    for (let f = 0; f <= floors; f++) {
      const row = grid[f];
      for (let c = 0; c < 4; c++) {
        springs.push(this._addSpring(row[c], row[(c + 1) % 4], stiffness, damping));
      }
      // 대각선 보강 (플로어 대각선)
      springs.push(this._addSpring(row[0], row[2], stiffness, damping));
      springs.push(this._addSpring(row[1], row[3], stiffness, damping));
    }

    // 기둥 (수직 연결) — 인접 층 같은 모서리 연결
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < 4; c++) {
        springs.push(this._addSpring(grid[f][c], grid[f + 1][c], stiffness, damping));
      }
    }

    // 층간 대각 브레이싱 (각 면에 X 브레이싱)
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < 4; c++) {
        const nextC = (c + 1) % 4;
        springs.push(this._addSpring(grid[f][c], grid[f + 1][nextC], stiffness, damping));
        springs.push(this._addSpring(grid[f][nextC], grid[f + 1][c], stiffness, damping));
      }
    }

    return { particles, springs };
  }

  // ---------------------------------------------------------------------------
  // Tower — 수직 탑 (상부로 좁아지는 형태)
  // ---------------------------------------------------------------------------

  _generateTower(params, mat, stiffness, damping) {
    const { height, baseWidth, segments, material } = params;
    const mass = this._calcMass(mat);
    const radius = 0.1;
    const segHeight = height / segments;

    const particles = [];
    const springs = [];
    const rings = []; // rings[seg][corner] — 4개 꼭짓점

    for (let s = 0; s <= segments; s++) {
      const y = s * segHeight;
      const fixed = s === 0;

      // 테이퍼 비율: 베이스에서 꼭대기로 갈수록 좁아짐
      const taper = 1 - (s / segments) * 0.7; // 꼭대기 = 30% of base
      const halfW = (baseWidth / 2) * taper;

      const corners = [
        { x: -halfW, z: -halfW },
        { x: halfW, z: -halfW },
        { x: halfW, z: halfW },
        { x: -halfW, z: halfW },
      ];

      const ring = [];
      for (const c of corners) {
        const p = this._addParticle(c.x, y, c.z, mass, radius, fixed, material);
        ring.push(p);
        particles.push(p);
      }

      rings.push(ring);
    }

    // 각 링의 수평 연결 (사각형 + 대각선)
    for (let s = 0; s <= segments; s++) {
      const ring = rings[s];
      for (let c = 0; c < 4; c++) {
        springs.push(this._addSpring(ring[c], ring[(c + 1) % 4], stiffness, damping));
      }
      springs.push(this._addSpring(ring[0], ring[2], stiffness, damping));
      springs.push(this._addSpring(ring[1], ring[3], stiffness, damping));
    }

    // 수직 연결 (인접 링 같은 모서리)
    for (let s = 0; s < segments; s++) {
      for (let c = 0; c < 4; c++) {
        springs.push(this._addSpring(rings[s][c], rings[s + 1][c], stiffness, damping));
      }
    }

    // 크로스 브레이싱 (인접 링 사이 대각선)
    for (let s = 0; s < segments; s++) {
      for (let c = 0; c < 4; c++) {
        const nextC = (c + 1) % 4;
        springs.push(this._addSpring(rings[s][c], rings[s + 1][nextC], stiffness, damping));
        springs.push(this._addSpring(rings[s][nextC], rings[s + 1][c], stiffness, damping));
      }
    }

    return { particles, springs };
  }

  // ---------------------------------------------------------------------------
  // Wall — 평면 벽
  // ---------------------------------------------------------------------------

  _generateWall(params, mat, stiffness, damping) {
    const { width, height, rows, cols, material } = params;
    const mass = this._calcMass(mat);
    const radius = 0.1;
    const dx = width / (cols - 1);
    const dy = height / (rows - 1);

    const particles = [];
    const springs = [];
    const grid = []; // grid[row][col]

    // 파티클 배치
    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const x = c * dx;
        const y = r * dy;
        const fixed = r === 0; // 바닥 행 고정
        const p = this._addParticle(x, y, 0, mass, radius, fixed, material);
        rowArr.push(p);
        particles.push(p);
      }
      grid.push(rowArr);
    }

    // 수평 스프링
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        springs.push(this._addSpring(grid[r][c], grid[r][c + 1], stiffness, damping));
      }
    }

    // 수직 스프링
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        springs.push(this._addSpring(grid[r][c], grid[r + 1][c], stiffness, damping));
      }
    }

    // 대각선 스프링 (\ 방향과 / 방향)
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        springs.push(this._addSpring(grid[r][c], grid[r + 1][c + 1], stiffness, damping));
        springs.push(this._addSpring(grid[r][c + 1], grid[r + 1][c], stiffness, damping));
      }
    }

    return { particles, springs };
  }

  // ---------------------------------------------------------------------------
  // Arch — 아치 구조
  // ---------------------------------------------------------------------------

  _generateArch(params, mat, stiffness, damping) {
    const { span, height, segments, material } = params;
    const mass = this._calcMass(mat);
    const radius = 0.1;

    const particles = [];
    const springs = [];

    // 반원형 아치: 타원형 경로
    // x = span/2 * cos(theta), y = height * sin(theta)
    // theta: pi (left base) -> 0 (right base)
    for (let i = 0; i <= segments; i++) {
      const theta = Math.PI * (1 - i / segments);
      const x = (span / 2) * Math.cos(theta);
      const y = height * Math.sin(theta);
      const fixed = i === 0 || i === segments; // 양쪽 끝 고정
      const p = this._addParticle(x, y, 0, mass, radius, fixed, material);
      particles.push(p);
    }

    // 순차 스프링 (인접 파티클 연결)
    for (let i = 0; i < segments; i++) {
      springs.push(this._addSpring(particles[i], particles[i + 1], stiffness, damping));
    }

    // 보강 스프링 — 한 칸 건너뛰기 연결로 구조 안정성 확보
    for (let i = 0; i < segments - 1; i++) {
      springs.push(this._addSpring(particles[i], particles[i + 2], stiffness, damping));
    }

    return { particles, springs };
  }
}
