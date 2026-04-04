/**
 * Materials — 실제 SI 단위 물성치 데이터베이스
 *
 * 물리 시뮬레이션에 사용되는 재료 속성을 관리한다.
 * 모든 값은 SI 단위계를 따른다:
 *   density        kg/m³
 *   yieldStrength  Pa
 *   elasticModulus Pa
 *   thermalExpansion 1/K
 */

const ROOM_TEMPERATURE = 293; // K

const MATERIALS = new Map([
  ['iron', {
    name: 'iron',
    density: 7874,
    yieldStrength: 250e6,
    elasticModulus: 200e9,
    thermalExpansion: 12e-6,
    color: '#A19D94',
    category: 'metal',
  }],
  ['concrete', {
    name: 'concrete',
    density: 2400,
    yieldStrength: 30e6,
    elasticModulus: 30e9,
    thermalExpansion: 12e-6,
    color: '#808080',
    category: 'ceramic',
  }],
  ['aluminum', {
    name: 'aluminum',
    density: 2700,
    yieldStrength: 270e6,
    elasticModulus: 69e9,
    thermalExpansion: 23e-6,
    color: '#C0C0C0',
    category: 'metal',
  }],
  ['copper', {
    name: 'copper',
    density: 8960,
    yieldStrength: 210e6,
    elasticModulus: 117e9,
    thermalExpansion: 17e-6,
    color: '#B87333',
    category: 'metal',
  }],
  ['wood', {
    name: 'wood',
    density: 600,
    yieldStrength: 40e6,
    elasticModulus: 12e9,
    thermalExpansion: 5e-6,
    color: '#8B4513',
    category: 'composite',
  }],
  ['glass', {
    name: 'glass',
    density: 2500,
    yieldStrength: 33e6,
    elasticModulus: 70e9,
    thermalExpansion: 9e-6,
    color: '#88CCEE',
    category: 'ceramic',
  }],
  ['rubber', {
    name: 'rubber',
    density: 1100,
    yieldStrength: 15e6,
    elasticModulus: 0.05e9,
    thermalExpansion: 77e-6,
    color: '#2D2D2D',
    category: 'polymer',
  }],
  ['titanium', {
    name: 'titanium',
    density: 4507,
    yieldStrength: 880e6,
    elasticModulus: 116e9,
    thermalExpansion: 8.6e-6,
    color: '#878681',
    category: 'metal',
  }],
  ['carbon_steel', {
    name: 'carbon_steel',
    density: 7850,
    yieldStrength: 350e6,
    elasticModulus: 210e9,
    thermalExpansion: 11e-6,
    color: '#71797E',
    category: 'metal',
  }],
  ['stainless_steel', {
    name: 'stainless_steel',
    density: 8000,
    yieldStrength: 515e6,
    elasticModulus: 193e9,
    thermalExpansion: 17.3e-6,
    color: '#C0C0C0',
    category: 'metal',
  }],
]);

/**
 * 온도에 따른 강도 감소 계수를 계산한다.
 *
 * 선형 보간 모델:
 *   293 K (실온) → factor = 1.0
 *   1500 K       → factor ≈ 0.3  (금속 기준)
 *
 * factor = 1 - 0.7 * (T - 293) / (1500 - 293)
 * 최솟값 0, 최댓값 1로 클램핑한다.
 */
function temperatureFactor(kelvin) {
  const fraction = (kelvin - ROOM_TEMPERATURE) / (1500 - ROOM_TEMPERATURE);
  const factor = 1 - 0.7 * fraction;
  return Math.max(0, Math.min(1, factor));
}

export default class Materials {
  /**
   * 이름으로 재료를 조회한다.
   * @param {string} name — 재료 키 (예: 'iron', 'aluminum')
   * @returns {object|null} Material 객체 또는 null
   */
  static getMaterial(name) {
    const mat = MATERIALS.get(name);
    if (!mat) return null;
    // 원본 변이를 방지하기 위해 얕은 복사를 반환한다.
    return { ...mat };
  }

  /**
   * 전체 재료 맵을 반환한다.
   * @returns {Map<string, object>}
   */
  static getAllMaterials() {
    // 각 엔트리를 복사해 외부 변이를 방지한다.
    const copy = new Map();
    for (const [key, mat] of MATERIALS) {
      copy.set(key, { ...mat });
    }
    return copy;
  }

  /**
   * 등록된 카테고리 목록을 정렬된 배열로 반환한다.
   * @returns {string[]}
   */
  static getCategories() {
    const cats = new Set();
    for (const mat of MATERIALS.values()) {
      cats.add(mat.category);
    }
    return [...cats].sort();
  }

  /**
   * 온도 보정된 재료 속성을 반환한다.
   *
   * yieldStrength와 elasticModulus에 선형 감소 계수를 적용한다.
   * density, thermalExpansion, color, category는 변경하지 않는다.
   *
   * @param {object} material — Material 객체
   * @param {number} kelvin — 온도 (K)
   * @returns {object} 보정된 Material 객체 (새 객체)
   */
  static adjustForTemperature(material, kelvin) {
    const factor = temperatureFactor(kelvin);
    return {
      ...material,
      yieldStrength: material.yieldStrength * factor,
      elasticModulus: material.elasticModulus * factor,
    };
  }
}
