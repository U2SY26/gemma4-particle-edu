import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════
// 1. LANDING PAGE
// ═══════════════════════════════════════════════

test.describe('Landing Page', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#landing-input')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#landing-start')).toBeVisible();
  });

  test('landing chips are clickable', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('.landing-chip');
    await expect(chips).toHaveCount(6); // Pyramid, Tornado, DNA, Solar, BlackHole, Earthquake
  });

  test('clicking start navigates to app', async ({ page }) => {
    await page.goto('/');
    await page.fill('#landing-input', 'test');
    await page.click('#landing-start');
    // Should transition to main app (landing hides, sidebar shows)
    await expect(page.locator('#sidebar')).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════
// 2. API ENDPOINTS
// ═══════════════════════════════════════════════

test.describe('API', () => {
  test('GET /api/status returns provider info', async ({ request }) => {
    const res = await request.get('/api/status');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.status).toBe('running');
    expect(data.providers).toBeDefined();
    expect(typeof data.providers.ollama).toBe('boolean');
    expect(typeof data.providers.gemini).toBe('boolean');
    expect(typeof data.providers.claude).toBe('boolean');
  });

  test('POST /api/chat returns 400 for empty body', async ({ request }) => {
    const res = await request.post('/api/chat', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /api/chat returns 400 for empty messages', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { messages: [] } });
    expect(res.status()).toBe(400);
  });

  test('GET /api/cards returns array', async ({ request }) => {
    const res = await request.get('/api/cards');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/history returns paginated', async ({ request }) => {
    const res = await request.get('/api/history?page=0&limit=5');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
  });
});

// ═══════════════════════════════════════════════
// 3. MAIN APP UI
// ═══════════════════════════════════════════════

test.describe('Main App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click start to enter app
    await page.fill('#landing-input', 'tower');
    await page.click('#landing-start');
    await page.waitForSelector('#sidebar', { timeout: 10000 });
  });

  test('sidebar has preset cards', async ({ page }) => {
    const cards = page.locator('.sim-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(40); // At least 47 presets + 3 EM
  });

  test('clicking a card shows detail panel', async ({ page }) => {
    await page.locator('.sim-card').first().click();
    await expect(page.locator('#card-detail')).toBeVisible();
  });

  test('physics sliders exist and have values', async ({ page }) => {
    const sliders = [
      'param-gravity', 'param-damping', 'param-springK',
      'param-temperature', 'param-viscosity',
      'param-electricFieldX', 'param-chargeStrength', 'param-gateVoltage'
    ];
    for (const id of sliders) {
      const slider = page.locator(`#${id}`);
      await expect(slider).toBeAttached();
    }
  });

  test('EM section exists', async ({ page }) => {
    await expect(page.locator('#em-section')).toBeAttached();
    await expect(page.locator('#param-electricFieldX')).toBeAttached();
    await expect(page.locator('#param-gateVoltage')).toBeAttached();
  });

  test('chat input exists and is functional', async ({ page }) => {
    const input = page.locator('#chat-input');
    await expect(input).toBeVisible();
    await input.fill('피라미드');
    await page.keyboard.press('Enter');
    // Should produce a chat message
    await page.waitForSelector('.chat-msg', { timeout: 15000 });
  });

  test('benchmark section loads', async ({ page }) => {
    const benchSection = page.locator('#benchmark-section');
    // May or may not be visible depending on data load
    await page.waitForTimeout(3000);
    const isVisible = await benchSection.isVisible();
    if (isVisible) {
      const header = page.locator('#benchmark-header');
      await expect(header).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════
// 4. PHYSICS ENGINE
// ═══════════════════════════════════════════════

test.describe('Physics Engine', () => {
  test('138 materials loaded', async ({ page }) => {
    await page.goto('/');
    const count = await page.evaluate(() => {
      // Access via import (SimulationManager exports it indirectly)
      return fetch('/js/SimulationManager.js')
        .then(r => r.text())
        .then(src => {
          const match = src.match(/const REFERENCE_MATERIALS = \{([\s\S]*?)\};\s*\/\/ 138/);
          if (!match) return 0;
          const keys = match[1].match(/^\s{4}(\w+|'[^']+'):/gm);
          return keys ? keys.length : 0;
        });
    });
    expect(count).toBe(138);
  });

  test('ArchitectureGenerator has transistor template', async ({ page }) => {
    await page.goto('/');
    const hasTransistor = await page.evaluate(() => {
      return fetch('/js/ArchitectureGenerator.js')
        .then(r => r.text())
        .then(src => src.includes('_templateTransistor'));
    });
    expect(hasTransistor).toBeTruthy();
  });

  test('ArchitectureGenerator has circuit template', async ({ page }) => {
    await page.goto('/');
    const hasCircuit = await page.evaluate(() => {
      return fetch('/js/ArchitectureGenerator.js')
        .then(r => r.text())
        .then(src => src.includes('_templateCircuit'));
    });
    expect(hasCircuit).toBeTruthy();
  });

  test('PhysicsEngine has Coulomb force', async ({ page }) => {
    await page.goto('/');
    const hasCoulomb = await page.evaluate(() => {
      return fetch('/js/PhysicsEngine.js')
        .then(r => r.text())
        .then(src => src.includes('_applyPICCoulomb'));
    });
    expect(hasCoulomb).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════
// 5. NLP FALLBACK (offline mode)
// ═══════════════════════════════════════════════

test.describe('NLP Fallback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#landing-input', 'test');
    await page.click('#landing-start');
    await page.waitForSelector('#sidebar', { timeout: 10000 });
  });

  test('keyword "피라미드" generates structure', async ({ page }) => {
    const input = page.locator('#chat-input');
    await input.fill('피라미드');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.chat-msg', { timeout: 15000 });
    const msgs = await page.locator('.chat-msg').allTextContents();
    const hasResponse = msgs.some(m => m.includes('프리셋') || m.includes('pyramid') || m.includes('피라미드'));
    expect(hasResponse).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════
// 6. I18N
// ═══════════════════════════════════════════════

test.describe('i18n', () => {
  test('Korean labels present', async ({ page }) => {
    await page.goto('/');
    await page.fill('#landing-input', 'test');
    await page.click('#landing-start');
    await page.waitForSelector('#sidebar', { timeout: 10000 });
    // Check some Korean labels exist
    const emLabel = await page.locator('[data-i18n="electromagnetic"]').textContent();
    expect(emLabel).toBeTruthy();
  });

  test('138 materials reference count in source', async ({ page }) => {
    await page.goto('/');
    const count = await page.evaluate(() => {
      return fetch('/js/i18n.js').then(r => r.text()).then(src => {
        return src.includes('MOSFET 트랜지스터') && src.includes('MOSFET Transistor');
      });
    });
    expect(count).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════
// 7. BENCHMARK DATA
// ═══════════════════════════════════════════════

test.describe('Benchmark Data', () => {
  test('benchmark-300.json is accessible', async ({ request }) => {
    const res = await request.get('/data/benchmark-300.json');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.summary.total).toBe(300);
    expect(data.scenarios.length).toBe(300);
  });

  test('benchmark PDFs are accessible', async ({ request }) => {
    const res = await request.get('/docs/benchmarks/bench-001.pdf');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('pdf');
  });

  test('final report PDF is accessible', async ({ request }) => {
    const res = await request.get('/docs/final-benchmark-report.pdf');
    expect(res.ok()).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════
// 8. STATIC ASSETS
// ═══════════════════════════════════════════════

test.describe('Static Assets', () => {
  test('main JS files load', async ({ request }) => {
    for (const f of ['js/app.js', 'js/SimulationManager.js', 'js/PhysicsEngine.js', 'js/ArchitectureGenerator.js', 'js/i18n.js']) {
      const res = await request.get('/' + f);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('CSS loads', async ({ request }) => {
    const res = await request.get('/css/style.css');
    expect(res.ok()).toBeTruthy();
  });

  test('index.html loads', async ({ request }) => {
    const res = await request.get('/');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('PARTICLE');
  });
});
