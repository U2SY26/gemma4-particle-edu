import { describe, it, expect } from 'vitest';
import Materials from '../../js/Materials.js';

describe('Materials', () => {
  describe('getMaterial', () => {
    it('iron의 밀도가 7874 kg/m³이다', () => {
      const iron = Materials.getMaterial('iron');
      expect(iron).not.toBeNull();
      expect(iron.density).toBe(7874);
    });

    it('iron의 전체 속성이 올바르다', () => {
      const iron = Materials.getMaterial('iron');
      expect(iron.name).toBe('iron');
      expect(iron.yieldStrength).toBe(250e6);
      expect(iron.elasticModulus).toBe(200e9);
      expect(iron.thermalExpansion).toBe(12e-6);
      expect(iron.color).toBe('#A19D94');
      expect(iron.category).toBe('metal');
    });

    it('존재하지 않는 재료에 대해 null을 반환한다', () => {
      expect(Materials.getMaterial('nonexistent')).toBeNull();
    });

    it('반환된 객체 수정이 원본에 영향을 주지 않는다', () => {
      const a = Materials.getMaterial('iron');
      a.density = 0;
      const b = Materials.getMaterial('iron');
      expect(b.density).toBe(7874);
    });
  });

  describe('getAllMaterials', () => {
    it('10개 이상의 재료를 반환한다', () => {
      const all = Materials.getAllMaterials();
      expect(all.size).toBeGreaterThanOrEqual(10);
    });

    it('Map 타입을 반환한다', () => {
      const all = Materials.getAllMaterials();
      expect(all).toBeInstanceOf(Map);
    });

    it('알려진 재료 키가 포함되어 있다', () => {
      const all = Materials.getAllMaterials();
      const keys = [...all.keys()];
      expect(keys).toContain('iron');
      expect(keys).toContain('aluminum');
      expect(keys).toContain('rubber');
      expect(keys).toContain('titanium');
    });
  });

  describe('getCategories', () => {
    it('정렬된 4개 카테고리를 반환한다', () => {
      const cats = Materials.getCategories();
      expect(cats).toEqual(['ceramic', 'composite', 'metal', 'polymer']);
    });
  });

  describe('adjustForTemperature', () => {
    it('실온(293K)에서 속성이 변하지 않는다', () => {
      const iron = Materials.getMaterial('iron');
      const adjusted = Materials.adjustForTemperature(iron, 293);
      expect(adjusted.yieldStrength).toBeCloseTo(iron.yieldStrength, 0);
      expect(adjusted.elasticModulus).toBeCloseTo(iron.elasticModulus, 0);
    });

    it('고온에서 yieldStrength가 감소한다', () => {
      const iron = Materials.getMaterial('iron');
      const hot = Materials.adjustForTemperature(iron, 1200);
      expect(hot.yieldStrength).toBeLessThan(iron.yieldStrength);
    });

    it('고온에서 elasticModulus가 감소한다', () => {
      const iron = Materials.getMaterial('iron');
      const hot = Materials.adjustForTemperature(iron, 1200);
      expect(hot.elasticModulus).toBeLessThan(iron.elasticModulus);
    });

    it('1500K에서 강도가 약 30%로 감소한다', () => {
      const iron = Materials.getMaterial('iron');
      const hot = Materials.adjustForTemperature(iron, 1500);
      const ratio = hot.yieldStrength / iron.yieldStrength;
      expect(ratio).toBeCloseTo(0.3, 1);
    });

    it('density는 온도에 영향받지 않는다', () => {
      const iron = Materials.getMaterial('iron');
      const hot = Materials.adjustForTemperature(iron, 1500);
      expect(hot.density).toBe(iron.density);
    });

    it('원본 객체를 변이하지 않는다', () => {
      const iron = Materials.getMaterial('iron');
      const origStrength = iron.yieldStrength;
      Materials.adjustForTemperature(iron, 1500);
      expect(iron.yieldStrength).toBe(origStrength);
    });

    it('극저온에서 강도가 100%를 초과하지 않는다', () => {
      const iron = Materials.getMaterial('iron');
      const cold = Materials.adjustForTemperature(iron, 100);
      expect(cold.yieldStrength).toBeLessThanOrEqual(iron.yieldStrength * 1.001);
    });

    it('극고온에서 강도가 0 미만이 되지 않는다', () => {
      const iron = Materials.getMaterial('iron');
      const extreme = Materials.adjustForTemperature(iron, 5000);
      expect(extreme.yieldStrength).toBeGreaterThanOrEqual(0);
      expect(extreme.elasticModulus).toBeGreaterThanOrEqual(0);
    });
  });

  describe('모든 재료의 필수 필드 검증', () => {
    const requiredFields = [
      'name', 'density', 'yieldStrength', 'elasticModulus',
      'thermalExpansion', 'color', 'category',
    ];

    it('모든 재료가 필수 필드를 가지고 있다', () => {
      const all = Materials.getAllMaterials();
      for (const [key, mat] of all) {
        for (const field of requiredFields) {
          expect(mat[field], `${key} 재료에 ${field} 필드가 없음`).toBeDefined();
        }
      }
    });

    it('모든 density 값이 양수이다', () => {
      const all = Materials.getAllMaterials();
      for (const [key, mat] of all) {
        expect(mat.density, `${key}`).toBeGreaterThan(0);
      }
    });

    it('모든 color 값이 hex 형식이다', () => {
      const all = Materials.getAllMaterials();
      for (const [key, mat] of all) {
        expect(mat.color, `${key}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('모든 category가 유효한 값이다', () => {
      const validCategories = ['metal', 'ceramic', 'polymer', 'composite'];
      const all = Materials.getAllMaterials();
      for (const [key, mat] of all) {
        expect(validCategories, `${key}의 category '${mat.category}'가 유효하지 않음`)
          .toContain(mat.category);
      }
    });
  });
});
