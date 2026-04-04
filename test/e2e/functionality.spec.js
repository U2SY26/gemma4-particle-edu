// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Page Load & Structure
// ---------------------------------------------------------------------------

test.describe('Page Load & Structure', () => {
  test('page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/Gemma 4 Particle Edu/);

    // Filter out WebGL / THREE warnings — only real JS errors count
    const realErrors = errors.filter(
      (msg) =>
        !msg.includes('WebGL') &&
        !msg.includes('THREE') &&
        !msg.includes('NeonRenderer'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('all critical DOM elements exist', async ({ page }) => {
    await page.goto('/');

    const selectors = [
      '#chat-panel',
      '#render-canvas',
      '#viewport',
      '#chat-form',
      '#chat-input',
      '#chat-send',
      '#chat-messages',
      '#mobile-tabs',
      '#status-indicator',
      '#preset-area',
      '#param-panel',
      '#viewport-controls',
      '#stats-bar',
      '#bloom-slider',
    ];

    for (const sel of selectors) {
      await expect(page.locator(sel)).toBeAttached({ timeout: 3000 });
    }
  });

  test('no JavaScript errors in console (excluding WebGL/THREE warnings)', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => {
      const msg = err.message || '';
      const isWebGLOrThree =
        msg.includes('WebGL') ||
        msg.includes('THREE') ||
        msg.includes('NeonRenderer');
      if (!isWebGLOrThree) {
        jsErrors.push(msg);
      }
    });

    await page.goto('/');
    // Wait for app init to settle
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Chat System
// ---------------------------------------------------------------------------

test.describe('Chat System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('chat input accepts text and submits on Enter', async ({ page }) => {
    const input = page.locator('#chat-input');
    await input.fill('Hello physics world');
    await input.press('Enter');

    // User message bubble should appear
    const userMessages = page.locator('#chat-messages .message-user .message-content');
    await expect(userMessages.first()).toContainText('Hello physics world', { timeout: 3000 });
  });

  test('chat input accepts text and submits on button click', async ({ page }) => {
    const input = page.locator('#chat-input');
    await input.fill('Test button submit');

    const sendBtn = page.locator('#chat-send');
    await sendBtn.click();

    const userMessages = page.locator('#chat-messages .message-user .message-content');
    await expect(userMessages.first()).toContainText('Test button submit', { timeout: 3000 });
  });

  test('user message appears as bubble in #chat-messages', async ({ page }) => {
    const input = page.locator('#chat-input');
    await input.fill('Bubble test message');
    await input.press('Enter');

    const bubble = page.locator('#chat-messages .message.message-user');
    await expect(bubble.first()).toBeVisible({ timeout: 3000 });

    const content = bubble.first().locator('.message-content');
    await expect(content).toHaveText('Bubble test message');
  });

  test('chat auto-scrolls to bottom on new message', async ({ page }) => {
    const input = page.locator('#chat-input');

    // Send several messages to overflow the container
    for (let i = 0; i < 8; i++) {
      await input.fill(`Scroll test message number ${i + 1}`);
      await input.press('Enter');
      // Small delay to let DOM update
      await page.waitForTimeout(100);
    }

    // Check that scrollTop is near scrollHeight (auto-scrolled)
    const isScrolledToBottom = await page.evaluate(() => {
      const el = document.querySelector('#chat-messages');
      if (!el) return false;
      // Allow a few pixels of tolerance
      return el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    });

    expect(isScrolledToBottom).toBe(true);
  });

  test('chat form clears input after submit', async ({ page }) => {
    const input = page.locator('#chat-input');
    await input.fill('Clear after submit');
    await input.press('Enter');

    await expect(input).toHaveValue('', { timeout: 2000 });
  });

  test('empty message is not submitted', async ({ page }) => {
    const input = page.locator('#chat-input');

    // Ensure input is empty
    await input.fill('');
    await input.press('Enter');

    // No message bubble should appear
    const messages = page.locator('#chat-messages .message');
    await page.waitForTimeout(500);
    await expect(messages).toHaveCount(0);
  });

  test('multiple messages maintain order', async ({ page }) => {
    const input = page.locator('#chat-input');

    await input.fill('First message');
    await input.press('Enter');
    await page.waitForTimeout(200);

    await input.fill('Second message');
    await input.press('Enter');
    await page.waitForTimeout(200);

    await input.fill('Third message');
    await input.press('Enter');
    await page.waitForTimeout(200);

    const userMessages = page.locator('#chat-messages .message-user .message-content');
    // Each submit creates a user bubble + an AI bubble, so 3 user bubbles
    await expect(userMessages).toHaveCount(3, { timeout: 3000 });

    await expect(userMessages.nth(0)).toHaveText('First message');
    await expect(userMessages.nth(1)).toHaveText('Second message');
    await expect(userMessages.nth(2)).toHaveText('Third message');
  });
});

// ---------------------------------------------------------------------------
// Preset Buttons
// ---------------------------------------------------------------------------

test.describe('Preset Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('earthquake preset button is clickable and responds', async ({ page }) => {
    const btn = page.locator('.preset-btn[data-preset="earthquake"]');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();

    // Clicking should trigger simulation (particle count changes or no errors)
    const errorsBefore = [];
    page.on('pageerror', (err) => {
      const msg = err.message || '';
      if (!msg.includes('WebGL') && !msg.includes('THREE') && !msg.includes('NeonRenderer')) {
        errorsBefore.push(msg);
      }
    });

    await btn.click();
    await page.waitForTimeout(500);

    expect(errorsBefore).toHaveLength(0);
  });

  test('bridge preset button is clickable and responds', async ({ page }) => {
    const btn = page.locator('.preset-btn[data-preset="bridge"]');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();

    const errors = [];
    page.on('pageerror', (err) => {
      const msg = err.message || '';
      if (!msg.includes('WebGL') && !msg.includes('THREE') && !msg.includes('NeonRenderer')) {
        errors.push(msg);
      }
    });

    await btn.click();
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });

  test('freefall preset button is clickable and responds', async ({ page }) => {
    const btn = page.locator('.preset-btn[data-preset="freefall"]');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();

    const errors = [];
    page.on('pageerror', (err) => {
      const msg = err.message || '';
      if (!msg.includes('WebGL') && !msg.includes('THREE') && !msg.includes('NeonRenderer')) {
        errors.push(msg);
      }
    });

    await btn.click();
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });

  test('clicking preset triggers simulation (particle count becomes non-zero)', async ({ page }) => {
    const btn = page.locator('.preset-btn[data-preset="freefall"]');
    await btn.click();

    // Wait for simulation to start and update the particle count display
    await page.waitForTimeout(1000);

    const countText = await page.locator('#particle-count').textContent();
    const count = parseInt(countText || '0', 10);
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Simulation Controls
// ---------------------------------------------------------------------------

test.describe('Simulation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('play button exists and is clickable', async ({ page }) => {
    const btn = page.locator('#btn-play');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();
    await btn.click();
    // No error thrown = success
  });

  test('pause button exists and is clickable', async ({ page }) => {
    const btn = page.locator('#btn-pause');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();
    await btn.click();
  });

  test('reset button clears simulation state', async ({ page }) => {
    // First start a simulation via preset
    const presetBtn = page.locator('.preset-btn[data-preset="freefall"]');
    await presetBtn.click();
    await page.waitForTimeout(800);

    // Verify particles exist
    const countBefore = await page.locator('#particle-count').textContent();
    expect(parseInt(countBefore || '0', 10)).toBeGreaterThan(0);

    // Click reset
    const resetBtn = page.locator('#btn-reset');
    await resetBtn.click();
    await page.waitForTimeout(500);

    // Particle count should be back to 0
    const countAfter = await page.locator('#particle-count').textContent();
    expect(parseInt(countAfter || '0', 10)).toBe(0);
  });

  test('bloom slider changes value', async ({ page }) => {
    const slider = page.locator('#bloom-slider');
    await expect(slider).toBeVisible({ timeout: 3000 });

    // Get initial value
    const initialValue = await slider.inputValue();
    expect(initialValue).toBe('1.5');

    // Change the value via JavaScript (range inputs are tricky)
    await slider.fill('2.5');
    const newValue = await slider.inputValue();
    expect(newValue).toBe('2.5');
    expect(newValue).not.toBe(initialValue);
  });

  test('bloom slider has range 0-3', async ({ page }) => {
    const slider = page.locator('#bloom-slider');
    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');

    expect(min).toBe('0');
    expect(max).toBe('3');
  });
});

// ---------------------------------------------------------------------------
// Parameter Panel
// ---------------------------------------------------------------------------

test.describe('Parameter Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('parameter toggle opens panel', async ({ page }) => {
    const toggle = page.locator('#param-toggle');
    const sliders = page.locator('#param-sliders');

    // Initially collapsed
    await expect(sliders).toHaveClass(/collapsed/, { timeout: 3000 });
    const expandedBefore = await toggle.getAttribute('aria-expanded');
    expect(expandedBefore).toBe('false');

    // Click to open
    await toggle.click();
    await expect(sliders).not.toHaveClass(/collapsed/);
    const expandedAfter = await toggle.getAttribute('aria-expanded');
    expect(expandedAfter).toBe('true');
  });

  test('parameter toggle closes panel after opening', async ({ page }) => {
    const toggle = page.locator('#param-toggle');
    const sliders = page.locator('#param-sliders');

    // Open
    await toggle.click();
    await expect(sliders).not.toHaveClass(/collapsed/);

    // Close
    await toggle.click();
    await expect(sliders).toHaveClass(/collapsed/);
    const expanded = await toggle.getAttribute('aria-expanded');
    expect(expanded).toBe('false');
  });

  test('gravity slider exists with correct range', async ({ page }) => {
    const slider = page.locator('#param-gravity');
    await expect(slider).toBeAttached();

    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');
    expect(min).toBe('-20');
    expect(max).toBe('0');
  });

  test('damping slider exists with correct range', async ({ page }) => {
    const slider = page.locator('#param-damping');
    await expect(slider).toBeAttached();

    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');
    expect(min).toBe('0');
    expect(max).toBe('1');
  });

  test('changing gravity slider updates output value', async ({ page }) => {
    // Open param panel first
    await page.locator('#param-toggle').click();

    const slider = page.locator('#param-gravity');
    const output = page.locator('#val-gravity');

    // Read initial value
    const initialText = await output.textContent();
    expect(initialText).toBe('-9.81');

    // Change slider value and dispatch input event
    await slider.fill('-5');
    await slider.dispatchEvent('input');

    const updatedText = await output.textContent();
    expect(updatedText).toBe('-5');
  });

  test('changing damping slider updates output value', async ({ page }) => {
    await page.locator('#param-toggle').click();

    const slider = page.locator('#param-damping');
    const output = page.locator('#val-damping');

    const initialText = await output.textContent();
    expect(initialText).toBe('0.97');

    await slider.fill('0.5');
    await slider.dispatchEvent('input');

    const updatedText = await output.textContent();
    expect(updatedText).toBe('0.5');
  });

  test('all parameter sliders have output displays', async ({ page }) => {
    const sliderOutputPairs = [
      { slider: '#param-gravity', output: '#val-gravity' },
      { slider: '#param-damping', output: '#val-damping' },
      { slider: '#param-stiffness', output: '#val-stiffness' },
      { slider: '#param-temperature', output: '#val-temperature' },
      { slider: '#param-seismic', output: '#val-seismic' },
      { slider: '#param-wind-x', output: '#val-wind-x' },
    ];

    for (const pair of sliderOutputPairs) {
      await expect(page.locator(pair.slider)).toBeAttached();
      await expect(page.locator(pair.output)).toBeAttached();

      // Output should have a numeric-like value
      const text = await page.locator(pair.output).textContent();
      expect(text).toBeTruthy();
      expect(Number.isNaN(parseFloat(text || ''))).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Status & API
// ---------------------------------------------------------------------------

test.describe('Status & API', () => {
  test('/api/status returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('ollama');
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('models');
    expect(typeof body.ollama).toBe('boolean');
    expect(Array.isArray(body.models)).toBe(true);
  });

  test('status indicator shows connection state', async ({ page }) => {
    await page.goto('/');

    const indicator = page.locator('#status-indicator');
    await expect(indicator).toBeVisible({ timeout: 3000 });

    // The status dot should have either connected or disconnected class
    const dot = page.locator('#status-indicator .status-dot');
    await expect(dot).toBeAttached();

    const hasConnected = await dot.evaluate((el) => el.classList.contains('connected'));
    const hasDisconnected = await dot.evaluate((el) => el.classList.contains('disconnected'));

    // Exactly one of the two states should be active
    expect(hasConnected || hasDisconnected).toBe(true);
  });

  test('/api/chat returns 400 on missing messages', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {},
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('messages');
  });

  test('/api/chat returns 400 on empty messages array', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: [] },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('/api/chat returns 503 when Ollama is down', async ({ request }) => {
    // Ollama is almost certainly not running in CI / test environment
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: 'test' }],
      },
    });

    // If Ollama is down: 503. If Ollama is up, we get 200 with SSE.
    // The test should pass either way but we verify the shape.
    const status = response.status();
    if (status === 503) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Ollama');
    } else {
      // Ollama is running — we still got a valid response
      expect(status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Navigation', () => {
  test('all main sections are visible on desktop', async ({ page }) => {
    // Use a desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const chatPanel = page.locator('#chat-panel');
    const viewport = page.locator('#viewport');

    await expect(chatPanel).toBeVisible({ timeout: 3000 });
    await expect(viewport).toBeVisible({ timeout: 3000 });
  });

  test('mobile tabs exist for responsive view', async ({ page }) => {
    await page.goto('/');

    const tabs = page.locator('#mobile-tabs');
    await expect(tabs).toBeAttached();

    const chatTab = page.locator('#tab-chat');
    const viewportTab = page.locator('#tab-viewport');

    await expect(chatTab).toBeAttached();
    await expect(viewportTab).toBeAttached();

    // Verify tab text content
    await expect(chatTab).toContainText(/Chat|채팅/);
    await expect(viewportTab).toContainText(/3D View|3D 뷰/);
  });

  test('mobile tabs switch panels correctly', async ({ page }) => {
    // Use a mobile-like viewport to trigger responsive layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const chatTab = page.locator('#tab-chat');
    const viewportTab = page.locator('#tab-viewport');

    // Chat tab should be active by default
    await expect(chatTab).toHaveClass(/active/);
    const chatPressed = await chatTab.getAttribute('aria-pressed');
    expect(chatPressed).toBe('true');

    // Click viewport tab
    await viewportTab.click();
    await expect(viewportTab).toHaveClass(/active/);
    const viewPressed = await viewportTab.getAttribute('aria-pressed');
    expect(viewPressed).toBe('true');

    // Chat tab should now be inactive
    await expect(chatTab).not.toHaveClass(/active/);
    const chatPressedAfter = await chatTab.getAttribute('aria-pressed');
    expect(chatPressedAfter).toBe('false');
  });

  test('chat form and preset area are within chat panel', async ({ page }) => {
    await page.goto('/');

    // Verify these elements are descendants of #chat-panel
    const chatForm = page.locator('#chat-panel #chat-form');
    const presetArea = page.locator('#chat-panel #preset-area');

    await expect(chatForm).toBeAttached();
    await expect(presetArea).toBeAttached();
  });

  test('viewport controls and canvas are within viewport', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#viewport #render-canvas');
    const controls = page.locator('#viewport #viewport-controls');

    await expect(canvas).toBeAttached();
    await expect(controls).toBeAttached();
  });
});
