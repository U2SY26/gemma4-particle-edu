// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Complete i18n verification for gemma4-particle-edu.
 *
 * The app ships two locales — Korean (ko, default) and English (en).
 * The I18n class resolves dot-notation keys from JSON locale files.
 * If a key is missing from a locale file, i18n.t() returns the key itself.
 *
 * DOM contract:
 *   data-i18n            -> element.textContent
 *   data-i18n-placeholder -> element.placeholder
 *   data-i18n-aria       -> element.aria-label
 */

// ---------------------------------------------------------------------------
// Locale data duplicated here for assertion.  Kept as flat maps so tests
// do not depend on fs access inside the browser context.
// ---------------------------------------------------------------------------

const KO = {
  'app.title': 'Gemma 4 입자 교육',
  'app.subtitle': '대화형 3D 물리 시뮬레이션',
  'chat.title': 'AI 채팅',
  'chat.placeholder': '물리 질문을 입력하세요...',
  'chat.send': '전송',
  'chat.thinking': '생각 중...',
  'chat.offline': 'AI 오프라인 — Ollama 연결 필요',
  'chat.welcome': '안녕하세요! 물리 시뮬레이션에 대해 물어보세요.',
  'chat.error': '오류가 발생했습니다. 다시 시도해주세요.',
  'sim.play': '재생',
  'sim.pause': '일시정지',
  'sim.reset': '초기화',
  'sim.vr': 'VR 모드',
  'params.title': '시뮬레이션 파라미터',
  'params.gravity': '중력 (m/s²)',
  'params.damping': '감쇠',
  'params.stiffness': '강성 (GPa)',
  'params.density': '밀도 (×1000 kg/m³)',
  'params.yieldStrength': '항복 강도 (MPa)',
  'params.temperature': '온도 (K)',
  'params.seismic': '지진 가속도 (m/s²)',
  'params.foundation': '기초 깊이 (m)',
  'params.wind': '바람 (m/s²)',
  'params.friction': '마찰 계수',
  'params.bounciness': '반발 계수',
  'preset.title': '프리셋',
  'preset.earthquake': '지진 시뮬레이션',
  'preset.bridge': '다리 하중 테스트',
  'preset.freefall': '자유 낙하',
  'status.connected': 'Ollama 연결됨',
  'status.disconnected': 'Ollama 미연결',
  'locale.ko': '한국어',
  'locale.en': 'English',
};

const EN = {
  'app.title': 'Gemma 4 Particle Edu',
  'app.subtitle': 'Interactive 3D Physics Simulation',
  'chat.title': 'AI Chat',
  'chat.placeholder': 'Ask a physics question...',
  'chat.send': 'Send',
  'chat.thinking': 'Thinking...',
  'chat.offline': 'AI offline — Ollama connection required',
  'chat.welcome': 'Hello! Ask me about physics simulations.',
  'chat.error': 'An error occurred. Please try again.',
  'sim.play': 'Play',
  'sim.pause': 'Pause',
  'sim.reset': 'Reset',
  'sim.vr': 'VR Mode',
  'params.title': 'Simulation Parameters',
  'params.gravity': 'Gravity (m/s²)',
  'params.damping': 'Damping',
  'params.stiffness': 'Stiffness (GPa)',
  'params.density': 'Density (×1000 kg/m³)',
  'params.yieldStrength': 'Yield Strength (MPa)',
  'params.temperature': 'Temperature (K)',
  'params.seismic': 'Seismic Accel. (m/s²)',
  'params.foundation': 'Foundation Depth (m)',
  'params.wind': 'Wind (m/s²)',
  'params.friction': 'Friction Coefficient',
  'params.bounciness': 'Bounciness',
  'preset.title': 'Presets',
  'preset.earthquake': 'Earthquake Simulation',
  'preset.bridge': 'Bridge Load Test',
  'preset.freefall': 'Free Fall',
  'status.connected': 'Ollama connected',
  'status.disconnected': 'Ollama disconnected',
  'locale.ko': '한국어',
  'locale.en': 'English',
};

// Keys that exist in locale JSON files (shared between ko and en).
const LOCALE_JSON_KEYS = Object.keys(KO);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect every data-i18n key present in the DOM.
 * Returns an array of { key, text } objects.
 */
async function collectI18nElements(page) {
  return page.evaluate(() => {
    const result = [];
    for (const el of document.querySelectorAll('[data-i18n]')) {
      result.push({
        key: el.getAttribute('data-i18n'),
        text: el.textContent.trim(),
      });
    }
    return result;
  });
}

/**
 * Collect every data-i18n-placeholder element.
 */
async function collectPlaceholderElements(page) {
  return page.evaluate(() => {
    const result = [];
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      result.push({
        key: el.getAttribute('data-i18n-placeholder'),
        placeholder: el.placeholder || '',
      });
    }
    return result;
  });
}

/**
 * Click the locale toggle button and wait for the DOM to update.
 */
async function toggleLocale(page) {
  await page.click('#locale-toggle');
  // The locale change is synchronous in updateI18nDOM, but give the
  // browser a micro-task cycle to finish painting.
  await page.waitForTimeout(100);
}

/**
 * Wait for the app to be fully initialized with i18n applied.
 * We wait for the chat title element to exist in the DOM (attached),
 * then confirm i18n has run by checking the text is not the HTML default.
 */
async function waitForI18nReady(page) {
  // First wait for data-i18n elements to be attached to the DOM.
  // Some elements live inside collapsed panels and won't be visible,
  // so we use state: 'attached' instead of the default 'visible'.
  await page.waitForSelector('[data-i18n="chat.title"]', { state: 'attached' });
  // Then confirm the i18n module has actually applied translations.
  // The HTML default for chat.title is "Gemma 4 Particle Edu" but after
  // i18n runs with ko locale it becomes the Korean translation.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-i18n="chat.title"]');
    // i18n has run when text differs from HTML default OR matches a known locale value
    return el && el.textContent && el.textContent.trim().length > 0;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('i18n — Translation Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait until the app.js module has executed and applied i18n to the DOM.
    await waitForI18nReady(page);
  });

  test('every data-i18n element has visible text (not empty)', async ({ page }) => {
    const items = await collectI18nElements(page);
    for (const item of items) {
      expect(item.text.length, `data-i18n="${item.key}" should not be empty`).toBeGreaterThan(0);
    }
  });

  test('every data-i18n-placeholder element has a placeholder value', async ({ page }) => {
    const items = await collectPlaceholderElements(page);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.placeholder.length, `data-i18n-placeholder="${item.key}" should not be empty`).toBeGreaterThan(0);
    }
  });

  test('total data-i18n elements is greater than 15', async ({ page }) => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('[data-i18n]').length
    );
    expect(count).toBeGreaterThan(15);
  });

  test('no raw untranslated dot-notation keys visible as text', async ({ page }) => {
    const items = await collectI18nElements(page);
    // For keys that exist in the locale JSON, text must not equal the key
    // itself (which would indicate a translation miss).  Keys that are NOT
    // in the locale files are expected to render as the key (fallback).
    for (const item of items) {
      const keyInLocale = LOCALE_JSON_KEYS.includes(item.key);
      if (keyInLocale) {
        expect(item.text, `"${item.key}" should be translated, not show the raw key`).not.toBe(item.key);
      }
    }
  });
});

// ---------------------------------------------------------------------------

test.describe('i18n — Locale Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForI18nReady(page);
  });

  test('locale toggle button exists', async ({ page }) => {
    const toggle = page.locator('#locale-toggle');
    await expect(toggle).toBeVisible();
  });

  test('clicking locale toggle changes text language', async ({ page }) => {
    // Default is Korean — grab chat title text.
    const chatTitle = page.locator('[data-i18n="chat.title"]');
    const koreanText = await chatTitle.textContent();
    expect(koreanText).toBe(KO['chat.title']);

    await toggleLocale(page);

    const englishText = await chatTitle.textContent();
    expect(englishText).toBe(EN['chat.title']);
  });

  test('chat title changes between Korean and English', async ({ page }) => {
    const el = page.locator('[data-i18n="chat.title"]');
    await expect(el).toHaveText(KO['chat.title']);

    await toggleLocale(page);
    await expect(el).toHaveText(EN['chat.title']);

    // Toggle back
    await toggleLocale(page);
    await expect(el).toHaveText(KO['chat.title']);
  });

  test('placeholder text changes language', async ({ page }) => {
    const input = page.locator('[data-i18n-placeholder="chat.placeholder"]');
    await expect(input).toHaveAttribute('placeholder', KO['chat.placeholder']);

    await toggleLocale(page);
    await expect(input).toHaveAttribute('placeholder', EN['chat.placeholder']);
  });

  test('parameter labels change language', async ({ page }) => {
    const gravity = page.locator('[data-i18n="params.gravity"]');
    await expect(gravity).toHaveText(KO['params.gravity']);

    await toggleLocale(page);
    await expect(gravity).toHaveText(EN['params.gravity']);
  });

  test('preset button text changes language', async ({ page }) => {
    const earthquake = page.locator('[data-i18n="preset.earthquake"]');
    await expect(earthquake).toHaveText(KO['preset.earthquake']);

    await toggleLocale(page);
    await expect(earthquake).toHaveText(EN['preset.earthquake']);
  });

  test('status text changes language', async ({ page }) => {
    const status = page.locator('[data-i18n="status.disconnected"]');
    await expect(status).toHaveText(KO['status.disconnected']);

    await toggleLocale(page);
    await expect(status).toHaveText(EN['status.disconnected']);
  });
});

// ---------------------------------------------------------------------------

test.describe('i18n — Korean Locale (default)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForI18nReady(page);
  });

  test('chat title is Korean', async ({ page }) => {
    await expect(page.locator('[data-i18n="chat.title"]')).toHaveText(KO['chat.title']);
  });

  test('chat placeholder is Korean', async ({ page }) => {
    await expect(page.locator('#chat-input')).toHaveAttribute(
      'placeholder',
      KO['chat.placeholder']
    );
  });

  test('preset buttons show Korean text', async ({ page }) => {
    await expect(page.locator('[data-i18n="preset.earthquake"]')).toHaveText(KO['preset.earthquake']);
    await expect(page.locator('[data-i18n="preset.bridge"]')).toHaveText(KO['preset.bridge']);
    await expect(page.locator('[data-i18n="preset.freefall"]')).toHaveText(KO['preset.freefall']);
  });

  test('parameter labels are Korean', async ({ page }) => {
    await expect(page.locator('[data-i18n="params.title"]')).toHaveText(KO['params.title']);
    await expect(page.locator('[data-i18n="params.gravity"]')).toHaveText(KO['params.gravity']);
    await expect(page.locator('[data-i18n="params.damping"]')).toHaveText(KO['params.damping']);
    await expect(page.locator('[data-i18n="params.stiffness"]')).toHaveText(KO['params.stiffness']);
    await expect(page.locator('[data-i18n="params.temperature"]')).toHaveText(KO['params.temperature']);
    await expect(page.locator('[data-i18n="params.seismic"]')).toHaveText(KO['params.seismic']);
  });

  test('status shows Korean text', async ({ page }) => {
    await expect(page.locator('[data-i18n="status.disconnected"]')).toHaveText(KO['status.disconnected']);
  });
});

// ---------------------------------------------------------------------------

test.describe('i18n — English Locale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForI18nReady(page);
    await toggleLocale(page);
  });

  test('app title is English after switching', async ({ page }) => {
    await expect(page.locator('[data-i18n="chat.title"]')).toHaveText(EN['chat.title']);
  });

  test('chat placeholder is English', async ({ page }) => {
    await expect(page.locator('#chat-input')).toHaveAttribute(
      'placeholder',
      EN['chat.placeholder']
    );
  });

  test('all translatable text is English (no Korean mixing)', async ({ page }) => {
    // Gather all data-i18n elements whose key exists in the locale JSON.
    const items = await collectI18nElements(page);
    // Korean character range: Hangul syllables U+AC00–U+D7AF,
    // Hangul Jamo U+1100–U+11FF, Hangul Compat Jamo U+3130–U+318F
    const koreanRe = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

    for (const item of items) {
      // Only check keys that exist in the EN locale file, meaning they
      // should have been translated to English.
      if (EN[item.key] !== undefined) {
        expect(
          item.text,
          `data-i18n="${item.key}" text should match EN locale`
        ).toBe(EN[item.key]);
      }
    }

    // Extra sweep: among elements with keys present in EN, none should
    // contain Hangul characters.
    for (const item of items) {
      if (EN[item.key] !== undefined) {
        expect(
          koreanRe.test(item.text),
          `data-i18n="${item.key}" should not contain Korean characters in EN locale`
        ).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------

test.describe('i18n — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForI18nReady(page);
  });

  test('locale survives page interaction (does not reset)', async ({ page }) => {
    // Switch to English
    await toggleLocale(page);
    await expect(page.locator('[data-i18n="chat.title"]')).toHaveText(EN['chat.title']);

    // Interact with the page — click a preset button
    await page.click('.preset-btn[data-preset="earthquake"]');
    await page.waitForTimeout(200);

    // Locale should still be English
    await expect(page.locator('[data-i18n="chat.title"]')).toHaveText(EN['chat.title']);
    await expect(page.locator('[data-i18n="preset.earthquake"]')).toHaveText(EN['preset.earthquake']);
  });

  test('locale survives parameter panel toggle', async ({ page }) => {
    await toggleLocale(page);
    await expect(page.locator('[data-i18n="params.title"]')).toHaveText(EN['params.title']);

    // Toggle the parameter panel open/close
    await page.click('#param-toggle');
    await page.waitForTimeout(100);

    await expect(page.locator('[data-i18n="params.title"]')).toHaveText(EN['params.title']);
    await expect(page.locator('[data-i18n="params.gravity"]')).toHaveText(EN['params.gravity']);
  });

  test('both locales have the same key structure (no missing keys)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Fetch locale JSON files from the server
      const [koRes, enRes] = await Promise.all([
        fetch('/js/locales/ko.json'),
        fetch('/js/locales/en.json'),
      ]);
      const ko = await koRes.json();
      const en = await enRes.json();

      // Flatten nested keys
      function flattenKeys(obj, prefix = '') {
        const keys = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            keys.push(...flattenKeys(v, path));
          } else {
            keys.push(path);
          }
        }
        return keys;
      }

      const koKeys = flattenKeys(ko).sort();
      const enKeys = flattenKeys(en).sort();

      const missingInEn = koKeys.filter((k) => !enKeys.includes(k));
      const missingInKo = enKeys.filter((k) => !koKeys.includes(k));

      return { koKeys, enKeys, missingInEn, missingInKo };
    });

    expect(
      result.missingInEn,
      `Keys in ko.json but missing from en.json: ${result.missingInEn.join(', ')}`
    ).toHaveLength(0);
    expect(
      result.missingInKo,
      `Keys in en.json but missing from ko.json: ${result.missingInKo.join(', ')}`
    ).toHaveLength(0);
  });

  test('numbers and units do not get translated (m/s², K, FPS stay as-is)', async ({ page }) => {
    // In Korean locale
    const gravityKo = await page.locator('[data-i18n="params.gravity"]').textContent();
    expect(gravityKo).toContain('m/s²');

    const tempKo = await page.locator('[data-i18n="params.temperature"]').textContent();
    expect(tempKo).toContain('K');

    // Switch to English
    await toggleLocale(page);

    const gravityEn = await page.locator('[data-i18n="params.gravity"]').textContent();
    expect(gravityEn).toContain('m/s²');

    const tempEn = await page.locator('[data-i18n="params.temperature"]').textContent();
    expect(tempEn).toContain('K');

    // FPS stat label should remain "FPS" in both locales.
    // The stats.fps key may or may not be in the locale files, but
    // FPS as a unit should appear somewhere in the stats bar.
    const fpsStatKo = await page.locator('#fps-counter').textContent();
    // The counter shows a number, but the label next to it should be
    // stable as "FPS".
    const fpsLabel = await page.locator('[data-i18n="stats.fps"]').textContent();
    // stats.fps is not in the locale JSON, so it falls back to the
    // key itself or the HTML default text.  Either way it should contain "FPS".
    expect(fpsLabel.toUpperCase()).toContain('FPS');
  });
});

// ---------------------------------------------------------------------------

test.describe('i18n — JSON Completeness (unit-level via page.evaluate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForI18nReady(page);
  });

  test('ko.json and en.json have identical key structures', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const [koRes, enRes] = await Promise.all([
        fetch('/js/locales/ko.json'),
        fetch('/js/locales/en.json'),
      ]);
      const ko = await koRes.json();
      const en = await enRes.json();

      function flattenKeys(obj, prefix = '') {
        const keys = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            keys.push(...flattenKeys(v, path));
          } else {
            keys.push(path);
          }
        }
        return keys;
      }

      const koKeys = flattenKeys(ko).sort();
      const enKeys = flattenKeys(en).sort();

      return {
        identical: JSON.stringify(koKeys) === JSON.stringify(enKeys),
        koKeys,
        enKeys,
      };
    });

    expect(result.identical, 'ko.json and en.json must have identical key sets').toBe(true);
  });

  test('no empty string values in either locale', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const [koRes, enRes] = await Promise.all([
        fetch('/js/locales/ko.json'),
        fetch('/js/locales/en.json'),
      ]);
      const ko = await koRes.json();
      const en = await enRes.json();

      function findEmpty(obj, prefix = '') {
        const empties = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            empties.push(...findEmpty(v, path));
          } else if (typeof v === 'string' && v.trim() === '') {
            empties.push(path);
          }
        }
        return empties;
      }

      return {
        koEmpty: findEmpty(ko),
        enEmpty: findEmpty(en),
      };
    });

    expect(
      result.koEmpty,
      `ko.json has empty values at: ${result.koEmpty.join(', ')}`
    ).toHaveLength(0);
    expect(
      result.enEmpty,
      `en.json has empty values at: ${result.enEmpty.join(', ')}`
    ).toHaveLength(0);
  });

  test('all data-i18n keys used in DOM exist in locale files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const [koRes, enRes] = await Promise.all([
        fetch('/js/locales/ko.json'),
        fetch('/js/locales/en.json'),
      ]);
      const ko = await koRes.json();
      const en = await enRes.json();

      function flattenKeys(obj, prefix = '') {
        const keys = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            keys.push(...flattenKeys(v, path));
          } else {
            keys.push(path);
          }
        }
        return keys;
      }

      const localeKeys = new Set(flattenKeys(ko));
      const enLocaleKeys = new Set(flattenKeys(en));

      // Gather all data-i18n, data-i18n-placeholder, and data-i18n-aria keys
      const domKeys = new Set();
      for (const el of document.querySelectorAll('[data-i18n]')) {
        domKeys.add(el.getAttribute('data-i18n'));
      }
      for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
        domKeys.add(el.getAttribute('data-i18n-placeholder'));
      }
      for (const el of document.querySelectorAll('[data-i18n-aria]')) {
        domKeys.add(el.getAttribute('data-i18n-aria'));
      }

      const missingInKo = [...domKeys].filter((k) => !localeKeys.has(k));
      const missingInEn = [...domKeys].filter((k) => !enLocaleKeys.has(k));

      return { domKeys: [...domKeys], missingInKo, missingInEn };
    });

    // Report which DOM keys are missing from locale JSONs.
    // This test surfaces translation gaps.  If there are intentional
    // fallback-only keys (e.g., stats.fps) they should be added to the
    // locale files.
    expect(
      result.missingInKo,
      `DOM keys missing from ko.json: ${result.missingInKo.join(', ')}`
    ).toHaveLength(0);
    expect(
      result.missingInEn,
      `DOM keys missing from en.json: ${result.missingInEn.join(', ')}`
    ).toHaveLength(0);
  });

  test('all locale file keys that appear in the DOM produce correct translations', async ({ page }) => {
    // For each data-i18n element whose key exists in the locale file,
    // the displayed text must equal the translated value (ko locale by default).
    const result = await page.evaluate(async () => {
      const koRes = await fetch('/js/locales/ko.json');
      const ko = await koRes.json();

      function resolve(obj, key) {
        const parts = key.split('.');
        let cur = obj;
        for (const part of parts) {
          if (cur == null || typeof cur !== 'object') return undefined;
          cur = cur[part];
        }
        return typeof cur === 'string' ? cur : undefined;
      }

      const mismatches = [];
      for (const el of document.querySelectorAll('[data-i18n]')) {
        const key = el.getAttribute('data-i18n');
        const expected = resolve(ko, key);
        if (expected !== undefined) {
          const actual = el.textContent.trim();
          if (actual !== expected) {
            mismatches.push({ key, expected, actual });
          }
        }
      }
      return mismatches;
    });

    expect(
      result,
      `Translation mismatches: ${JSON.stringify(result)}`
    ).toHaveLength(0);
  });
});
