// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get a computed style value for a selector.
 * Waits for the element to exist first.
 */
async function css(page, selector, prop) {
  await page.waitForSelector(selector, { timeout: 5000 });
  return page.evaluate(
    ({ sel, p }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element not found: ${sel}`);
      return getComputedStyle(el).getPropertyValue(p).trim();
    },
    { sel: selector, p: prop },
  );
}

/**
 * Resolve a CSS custom-property value from :root via getComputedStyle.
 * Returns the raw string (may be in lab/oklch in modern Chromium).
 */
async function getCSSVarRaw(page, varName) {
  return page.evaluate((name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }, varName);
}

/**
 * Resolve a computed color to an [r,g,b] tuple by painting on an offscreen
 * canvas. Works regardless of color space (lab, oklch, rgb, etc.).
 */
async function colorToRGB(page, colorStr) {
  return page.evaluate((c) => {
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }, colorStr);
}

/**
 * Get the computed background-color of a selector as [r,g,b].
 */
async function bgRGB(page, selector) {
  await page.waitForSelector(selector, { timeout: 5000 });
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const raw = getComputedStyle(el).backgroundColor;
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }, selector);
}

/**
 * Get the computed color of a selector as [r,g,b].
 */
async function textRGB(page, selector) {
  await page.waitForSelector(selector, { timeout: 5000 });
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const raw = getComputedStyle(el).color;
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }, selector);
}

/** Hex string from [r,g,b] array. */
function toHex(rgb) {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Check [r,g,b] is "dark" — all channels below threshold. */
function isDark(rgb, threshold = 40) {
  return rgb[0] < threshold && rgb[1] < threshold && rgb[2] < threshold;
}

// ---------------------------------------------------------------------------
// Shared setup: wait for #app to be in the DOM (ensures CSS is loaded)
// ---------------------------------------------------------------------------
const GOTO_OPTS = { waitUntil: 'domcontentloaded' };

// ==========================================================================
// Color Theme Consistency
// ==========================================================================
test.describe('Color Theme Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('body background is dark (#0a0a0f)', async ({ page }) => {
    const rgb = await bgRGB(page, 'body');
    expect(toHex(rgb)).toBe('#0a0a0f');
  });

  test('chat panel has correct dark background (#111118)', async ({ page }) => {
    const rgb = await bgRGB(page, '#chat-panel');
    expect(toHex(rgb)).toBe('#111118');
  });

  test('accent CSS variable resolves to neon green (#00ff88)', async ({ page }) => {
    const raw = await getCSSVarRaw(page, '--accent');
    const rgb = await colorToRGB(page, raw);
    expect(toHex(rgb)).toBe('#00ff88');
  });

  test('secondary CSS variable resolves to neon blue (#00aaff)', async ({ page }) => {
    const raw = await getCSSVarRaw(page, '--secondary');
    const rgb = await colorToRGB(page, raw);
    expect(toHex(rgb)).toBe('#00aaff');
  });

  test('text-primary CSS variable resolves to light (#e0e0e0)', async ({ page }) => {
    const raw = await getCSSVarRaw(page, '--text-primary');
    const rgb = await colorToRGB(page, raw);
    expect(toHex(rgb)).toBe('#e0e0e0');
  });

  test('body text color matches --text-primary', async ({ page }) => {
    const rgb = await textRGB(page, 'body');
    expect(toHex(rgb)).toBe('#e0e0e0');
  });

  test('no white backgrounds anywhere in the main layout', async ({ page }) => {
    const whiteElements = await page.evaluate(() => {
      const all = document.querySelectorAll('#app, #app *');
      const cv = document.createElement('canvas');
      cv.width = 1;
      cv.height = 1;
      const ctx = cv.getContext('2d');
      const results = [];
      for (const el of all) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') continue;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        if (r > 240 && g > 240 && b > 240) {
          results.push({ tag: el.tagName, id: el.id, class: el.className, r, g, b });
        }
      }
      return results;
    });
    expect(whiteElements).toEqual([]);
  });

  test('chat header title uses accent color', async ({ page }) => {
    const rgb = await textRGB(page, '#chat-header h1');
    expect(toHex(rgb)).toBe('#00ff88');
  });

  test('viewport background is dark (#0a0a0f)', async ({ page }) => {
    const rgb = await bgRGB(page, '#viewport');
    expect(toHex(rgb)).toBe('#0a0a0f');
  });

  test('chat input background is dark (#0d0d14)', async ({ page }) => {
    const rgb = await bgRGB(page, '#chat-input');
    expect(toHex(rgb)).toBe('#0d0d14');
  });

  test('send button uses accent color as background', async ({ page }) => {
    const rgb = await bgRGB(page, '#chat-send');
    expect(toHex(rgb)).toBe('#00ff88');
  });
});

// ==========================================================================
// Typography
// ==========================================================================
test.describe('Typography', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('body font-family starts with system-ui', async ({ page }) => {
    const ff = await css(page, 'body', 'font-family');
    expect(ff).toMatch(/system-ui/i);
  });

  test('--font-mono includes monospace', async ({ page }) => {
    const fontMono = await getCSSVarRaw(page, '--font-mono');
    expect(fontMono).toMatch(/monospace/i);
  });

  test('body font-size is at least 12px', async ({ page }) => {
    const fs = await css(page, 'body', 'font-size');
    expect(parseFloat(fs)).toBeGreaterThanOrEqual(12);
  });

  test('body font-size is 14px as designed', async ({ page }) => {
    await expect(page.locator('body')).toHaveCSS('font-size', '14px');
  });

  test('chat message font-size rule is 13px (>= 12px)', async ({ page }) => {
    const fs = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === '.message-content') {
              return rule.style.fontSize;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(fs).toBe('13px');
    expect(parseFloat(fs)).toBeGreaterThanOrEqual(12);
  });

  test('stat-value uses monospace font', async ({ page }) => {
    const ff = await css(page, '.stat-value', 'font-family');
    expect(ff).toMatch(/monospace/i);
  });

  test('header title handles overflow with ellipsis', async ({ page }) => {
    await expect(page.locator('#chat-header h1')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('#chat-header h1')).toHaveCSS('text-overflow', 'ellipsis');
    await expect(page.locator('#chat-header h1')).toHaveCSS('white-space', 'nowrap');
  });
});

// ==========================================================================
// Layout Integrity (Desktop 1280x720)
// ==========================================================================
test.describe('Layout Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('chat panel width is ~35% of viewport', async ({ page }) => {
    const chatWidth = await page.evaluate(() =>
      document.querySelector('#chat-panel').getBoundingClientRect().width,
    );
    const ratio = chatWidth / 1280;
    // Allow tolerance for min-width constraint (320px) and rounding
    expect(ratio).toBeGreaterThanOrEqual(0.25);
    expect(ratio).toBeLessThanOrEqual(0.45);
  });

  test('viewport takes remaining space after chat panel', async ({ page }) => {
    const dims = await page.evaluate(() => {
      const chat = document.querySelector('#chat-panel').getBoundingClientRect();
      const vp = document.querySelector('#viewport').getBoundingClientRect();
      return { chatRight: chat.right, vpLeft: vp.left, vpWidth: vp.width };
    });
    expect(dims.vpLeft).toBeGreaterThanOrEqual(dims.chatRight - 5);
    expect(dims.vpWidth).toBeGreaterThan(0);
  });

  test('chat and viewport do not overlap', async ({ page }) => {
    const overlap = await page.evaluate(() => {
      const chat = document.querySelector('#chat-panel').getBoundingClientRect();
      const vp = document.querySelector('#viewport').getBoundingClientRect();
      return chat.right > vp.left + 5;
    });
    expect(overlap).toBe(false);
  });

  test('canvas display is block', async ({ page }) => {
    await expect(page.locator('#render-canvas')).toHaveCSS('display', 'block');
  });

  test('render-canvas fills its container (width & height)', async ({ page }) => {
    const dims = await page.evaluate(() => {
      const canvas = document.querySelector('#render-canvas').getBoundingClientRect();
      const container = document.querySelector('#viewport').getBoundingClientRect();
      return {
        wRatio: canvas.width / container.width,
        hRatio: canvas.height / container.height,
      };
    });
    expect(dims.wRatio).toBeGreaterThanOrEqual(0.99);
    expect(dims.hRatio).toBeGreaterThanOrEqual(0.99);
  });

  test('no horizontal scrollbar on page', async ({ page }) => {
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHScroll).toBe(false);
  });

  test('body overflow is hidden', async ({ page }) => {
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  });

  test('stats bar is positioned absolute at bottom:0', async ({ page }) => {
    await expect(page.locator('#stats-bar')).toHaveCSS('position', 'absolute');
    await expect(page.locator('#stats-bar')).toHaveCSS('bottom', '0px');
  });

  test('viewport controls are positioned top-right', async ({ page }) => {
    await expect(page.locator('#viewport-controls')).toHaveCSS('position', 'absolute');
    await expect(page.locator('#viewport-controls')).toHaveCSS('top', '12px');
    await expect(page.locator('#viewport-controls')).toHaveCSS('right', '12px');
  });

  test('#app uses flexbox layout', async ({ page }) => {
    await expect(page.locator('#app')).toHaveCSS('display', 'flex');
  });

  test('#app fills full viewport height', async ({ page }) => {
    const height = await page.evaluate(() =>
      document.querySelector('#app').getBoundingClientRect().height,
    );
    expect(height).toBeGreaterThanOrEqual(720);
  });
});

// ==========================================================================
// Spacing & Alignment
// ==========================================================================
test.describe('Spacing & Alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('chat messages container has 16px padding', async ({ page }) => {
    await expect(page.locator('#chat-messages')).toHaveCSS('padding', '16px');
  });

  test('message-content CSS rule has padding 10px 14px', async ({ page }) => {
    const pad = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === '.message-content') {
              return rule.style.padding;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(pad).toBe('10px 14px');
  });

  test('chat form is flush with bottom of chat panel', async ({ page }) => {
    const diff = await page.evaluate(() => {
      const panel = document.querySelector('#chat-panel').getBoundingClientRect();
      const form = document.querySelector('#chat-form').getBoundingClientRect();
      return Math.abs(panel.bottom - form.bottom);
    });
    expect(diff).toBeLessThanOrEqual(1);
  });

  test('chat-form has consistent padding (10px 16px)', async ({ page }) => {
    await expect(page.locator('#chat-form')).toHaveCSS('padding', '10px 16px');
  });

  test('send button click target >= 32px', async ({ page }) => {
    const dims = await page.evaluate(() => {
      const r = document.querySelector('#chat-send').getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    expect(dims.w).toBeGreaterThanOrEqual(32);
    expect(dims.h).toBeGreaterThanOrEqual(32);
  });

  test('viewport control buttons have height >= 32px', async ({ page }) => {
    const heights = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#viewport-controls button')).map(
        (b) => b.getBoundingClientRect().height,
      );
    });
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(32);
    }
  });

  test('preset buttons have height >= 28px', async ({ page }) => {
    const heights = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.preset-btn')).map(
        (b) => b.getBoundingClientRect().height,
      ),
    );
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(28);
    }
  });

  test('padding exists on chat-header, chat-form, stats-bar', async ({ page }) => {
    for (const sel of ['#chat-header', '#chat-form', '#stats-bar']) {
      const pl = await css(page, sel, 'padding-left');
      expect(parseFloat(pl), `${sel} padding-left`).toBeGreaterThan(0);
    }
  });

  test('preset-area has horizontal padding >= 16px', async ({ page }) => {
    const pl = await css(page, '#preset-area', 'padding-left');
    const pr = await css(page, '#preset-area', 'padding-right');
    expect(parseFloat(pl)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(pr)).toBeGreaterThanOrEqual(16);
  });
});

// ==========================================================================
// Anti-Patterns
// ==========================================================================
test.describe('Anti-Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('status indicator has white-space: nowrap', async ({ page }) => {
    await expect(page.locator('#status-indicator')).toHaveCSS('white-space', 'nowrap');
  });

  test('stat-item has white-space: nowrap', async ({ page }) => {
    await expect(page.locator('.stat-item').first()).toHaveCSS('white-space', 'nowrap');
  });

  test('header title has text-overflow: ellipsis', async ({ page }) => {
    await expect(page.locator('#chat-header h1')).toHaveCSS('text-overflow', 'ellipsis');
  });

  test('all buttons have cursor: pointer', async ({ page }) => {
    const nonPointer = await page.evaluate(() => {
      const results = [];
      for (const btn of document.querySelectorAll('button')) {
        const cursor = getComputedStyle(btn).cursor;
        if (cursor !== 'pointer') {
          results.push({ id: btn.id, cursor });
        }
      }
      return results;
    });
    expect(nonPointer).toEqual([]);
  });

  test('interactive elements are focusable (tabIndex >= 0)', async ({ page }) => {
    const items = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, input, [tabindex="0"]')).map(
        (el) => ({ tag: el.tagName, id: el.id, tabIndex: el.tabIndex }),
      ),
    );
    for (const el of items) {
      expect(el.tabIndex, `${el.tag}#${el.id}`).toBeGreaterThanOrEqual(0);
    }
  });

  test('focus-visible outline rule exists (2px solid)', async ({ page }) => {
    const rule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSStyleRule && r.selectorText === ':focus-visible') {
              return { outline: r.style.outline, outlineOffset: r.style.outlineOffset };
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(rule).not.toBeNull();
    expect(rule.outline).toContain('2px');
  });

  test('Tab key can reach #chat-input', async ({ page }) => {
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.id);
      if (id === 'chat-input') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('resize divider has cursor: col-resize', async ({ page }) => {
    await expect(page.locator('#resize-divider')).toHaveCSS('cursor', 'col-resize');
  });

  test('preset buttons have white-space: nowrap', async ({ page }) => {
    await expect(page.locator('.preset-btn').first()).toHaveCSS('white-space', 'nowrap');
  });
});

// ==========================================================================
// Responsive Design — Mobile (768px)
// ==========================================================================
test.describe('Responsive Design — Mobile (768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('mobile tabs appear at <= 768px', async ({ page }) => {
    await expect(page.locator('#mobile-tabs')).toHaveCSS('display', 'flex');
  });

  test('mobile tabs are hidden on desktop (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(150);
    await expect(page.locator('#mobile-tabs')).toHaveCSS('display', 'none');
  });

  test('app layout switches to column direction', async ({ page }) => {
    await expect(page.locator('#app')).toHaveCSS('flex-direction', 'column');
  });

  test('chat panel takes full width when active', async ({ page }) => {
    const w = await page.evaluate(() =>
      document.querySelector('#chat-panel').getBoundingClientRect().width,
    );
    expect(w).toBeGreaterThanOrEqual(768 - 1);
  });

  test('chat panel has no border-right on mobile', async ({ page }) => {
    await expect(page.locator('#chat-panel')).toHaveCSS('border-right-style', 'none');
  });

  test('viewport is hidden when chat is active (default)', async ({ page }) => {
    await expect(page.locator('#viewport')).toHaveCSS('display', 'none');
  });

  test('viewport shows and chat hides when show-viewport toggled', async ({ page }) => {
    await page.evaluate(() => document.querySelector('#app').classList.add('show-viewport'));
    await page.waitForTimeout(50);
    await expect(page.locator('#viewport')).toHaveCSS('display', 'block');
    await expect(page.locator('#chat-panel')).toHaveCSS('display', 'none');
    const w = await page.evaluate(() =>
      document.querySelector('#viewport').getBoundingClientRect().width,
    );
    expect(w).toBeGreaterThanOrEqual(768 - 1);
  });

  test('resize divider is hidden on mobile', async ({ page }) => {
    await expect(page.locator('#resize-divider')).toHaveCSS('display', 'none');
  });

  test('mobile tab active state uses accent color', async ({ page }) => {
    const rgb = await textRGB(page, '.mobile-tab.active');
    expect(toHex(rgb)).toBe('#00ff88');
  });

  test('active mobile tab has accent bottom border', async ({ page }) => {
    const rgb = await page.evaluate(() => {
      const el = document.querySelector('.mobile-tab.active');
      const raw = getComputedStyle(el).borderBottomColor;
      const cv = document.createElement('canvas');
      cv.width = 1; cv.height = 1;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = raw;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    });
    expect(toHex(rgb)).toBe('#00ff88');
  });
});

// ==========================================================================
// Responsive Design — Narrow (375px)
// ==========================================================================
test.describe('Responsive Design — Narrow (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('chat panel takes full width at 375px', async ({ page }) => {
    const w = await page.evaluate(() =>
      document.querySelector('#chat-panel').getBoundingClientRect().width,
    );
    expect(w).toBeGreaterThanOrEqual(374);
  });

  test('mobile tabs are visible at 375px', async ({ page }) => {
    await expect(page.locator('#mobile-tabs')).toHaveCSS('display', 'flex');
  });

  test('message max-width is 92% in mobile media rule', async ({ page }) => {
    const maxWidth = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSMediaRule && rule.conditionText?.includes('768')) {
              for (const inner of rule.cssRules) {
                if (inner instanceof CSSStyleRule && inner.selectorText === '.message') {
                  return inner.style.maxWidth;
                }
              }
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(maxWidth).toBe('92%');
  });
});

// ==========================================================================
// Animations
// ==========================================================================
test.describe('Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('typing indicator dots animate with typingBounce', async ({ page }) => {
    // Reveal the hidden typing indicator
    await page.evaluate(() =>
      document.querySelector('#typing-indicator').removeAttribute('hidden'),
    );

    const anims = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.typing-dots .dot')).map((d) => {
        const s = getComputedStyle(d);
        return {
          name: s.animationName,
          duration: s.animationDuration,
          count: s.animationIterationCount,
        };
      }),
    );

    expect(anims).toHaveLength(3);
    for (const a of anims) {
      expect(a.name).toBe('typingBounce');
      expect(a.duration).toBe('1.4s');
      expect(a.count).toBe('infinite');
    }
  });

  test('typing indicator dots have staggered delays', async ({ page }) => {
    await page.evaluate(() =>
      document.querySelector('#typing-indicator').removeAttribute('hidden'),
    );
    const delays = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.typing-dots .dot')).map(
        (d) => getComputedStyle(d).animationDelay,
      ),
    );
    expect(delays[0]).toBe('0s');
    expect(delays[1]).toBe('0.2s');
    expect(delays[2]).toBe('0.4s');
  });

  test('messageFadeIn keyframes exist', async ({ page }) => {
    const exists = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSKeyframesRule && r.name === 'messageFadeIn') return true;
          }
        } catch { /* cross-origin */ }
      }
      return false;
    });
    expect(exists).toBe(true);
  });

  test('.message CSS rule includes messageFadeIn animation', async ({ page }) => {
    const animation = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSStyleRule && r.selectorText === '.message') {
              return r.style.animation;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(animation).toContain('messageFadeIn');
    expect(animation).toContain('0.3s');
  });

  test('typingBounce keyframes exist', async ({ page }) => {
    const exists = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSKeyframesRule && r.name === 'typingBounce') return true;
          }
        } catch { /* cross-origin */ }
      }
      return false;
    });
    expect(exists).toBe(true);
  });
});

// ==========================================================================
// Dark Mode
// ==========================================================================
test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('color-scheme meta tag is "dark"', async ({ page }) => {
    const content = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="color-scheme"]');
      return meta?.getAttribute('content') ?? null;
    });
    expect(content).toBe('dark');
  });

  test('scrollbar-width CSS rule is "thin"', async ({ page }) => {
    const val = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSStyleRule && r.selectorText === '*') {
              return r.style.scrollbarWidth;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(val).toBe('thin');
  });

  test('scrollbar-color CSS rule uses dark vars', async ({ page }) => {
    const val = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSStyleRule && r.selectorText === '*') {
              return r.style.scrollbarColor;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(val).toContain('var(--border)');
    expect(val).toContain('transparent');
  });

  test('chat input has dark background (#0d0d14)', async ({ page }) => {
    const rgb = await bgRGB(page, '#chat-input');
    expect(toHex(rgb)).toBe('#0d0d14');
  });

  test('chat input has dark border (#2a2a3a)', async ({ page }) => {
    const rgb = await page.evaluate(() => {
      const el = document.querySelector('#chat-input');
      const raw = getComputedStyle(el).borderColor;
      const cv = document.createElement('canvas');
      cv.width = 1; cv.height = 1;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = raw;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    });
    expect(toHex(rgb)).toBe('#2a2a3a');
  });

  test('chat input text color is light (#e0e0e0)', async ({ page }) => {
    const rgb = await textRGB(page, '#chat-input');
    expect(toHex(rgb)).toBe('#e0e0e0');
  });

  test('bloom-slider CSS rule uses var(--border) background', async ({ page }) => {
    const bg = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const r of sheet.cssRules) {
            if (r instanceof CSSStyleRule && r.selectorText === '#bloom-slider') {
              return r.style.background;
            }
          }
        } catch { /* cross-origin */ }
      }
      return null;
    });
    expect(bg).toContain('var(--border)');
  });

  test('locale-toggle has dark background (#0a0a0f)', async ({ page }) => {
    const rgb = await bgRGB(page, '#locale-toggle');
    expect(toHex(rgb)).toBe('#0a0a0f');
  });

  test('preset buttons have dark background (#0a0a0f)', async ({ page }) => {
    const rgb = await bgRGB(page, '.preset-btn');
    expect(toHex(rgb)).toBe('#0a0a0f');
  });
});

// ==========================================================================
// CSS Custom Properties completeness
// ==========================================================================
test.describe('CSS Custom Properties', () => {
  test('all required custom properties are defined on :root', async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });

    const missing = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const required = [
        '--bg-primary', '--bg-panel', '--bg-input', '--bg-user-msg', '--bg-ai-msg',
        '--accent', '--accent-dim', '--accent-glow',
        '--secondary', '--secondary-dim', '--secondary-glow',
        '--warning', '--text-primary', '--text-secondary', '--text-muted',
        '--border', '--border-focus',
        '--font-body', '--font-mono',
        '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
        '--transition-fast', '--transition-normal',
        '--chat-width', '--chat-min-width',
        '--header-height', '--input-height', '--stats-height', '--mobile-tab-height',
      ];
      return required.filter((v) => !style.getPropertyValue(v).trim());
    });
    expect(missing).toEqual([]);
  });
});

// ==========================================================================
// Component Structure
// ==========================================================================
test.describe('Component Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', GOTO_OPTS);
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test('chat panel is flex column', async ({ page }) => {
    await expect(page.locator('#chat-panel')).toHaveCSS('display', 'flex');
    await expect(page.locator('#chat-panel')).toHaveCSS('flex-direction', 'column');
  });

  test('chat-messages has flex-grow:1', async ({ page }) => {
    await expect(page.locator('#chat-messages')).toHaveCSS('flex-grow', '1');
  });

  test('chat-header has flex-shrink:0', async ({ page }) => {
    await expect(page.locator('#chat-header')).toHaveCSS('flex-shrink', '0');
  });

  test('chat-form has flex-shrink:0', async ({ page }) => {
    await expect(page.locator('#chat-form')).toHaveCSS('flex-shrink', '0');
  });

  test('viewport overlay covers entire viewport with pointer-events:none', async ({ page }) => {
    await expect(page.locator('#viewport-overlay')).toHaveCSS('position', 'absolute');
    await expect(page.locator('#viewport-overlay')).toHaveCSS('top', '0px');
    await expect(page.locator('#viewport-overlay')).toHaveCSS('right', '0px');
    await expect(page.locator('#viewport-overlay')).toHaveCSS('bottom', '0px');
    await expect(page.locator('#viewport-overlay')).toHaveCSS('left', '0px');
    await expect(page.locator('#viewport-overlay')).toHaveCSS('pointer-events', 'none');
  });

  test('viewport-controls restore pointer-events:auto', async ({ page }) => {
    await expect(page.locator('#viewport-controls')).toHaveCSS('pointer-events', 'auto');
  });

  test('stats-bar restores pointer-events:auto', async ({ page }) => {
    await expect(page.locator('#stats-bar')).toHaveCSS('pointer-events', 'auto');
  });
});
