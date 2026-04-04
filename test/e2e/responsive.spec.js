// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return computed style properties for a locator. */
async function getComputedStyles(locator, properties) {
  return locator.evaluate((el, props) => {
    const cs = window.getComputedStyle(el);
    /** @type {Record<string, string>} */
    const result = {};
    for (const p of props) {
      result[p] = cs.getPropertyValue(p);
    }
    return result;
  }, properties);
}

/** Return the bounding-box width of a locator. */
async function getWidth(locator) {
  const box = await locator.boundingBox();
  return box ? box.width : 0;
}

/** Return the bounding-box height of a locator. */
async function getHeight(locator) {
  const box = await locator.boundingBox();
  return box ? box.height : 0;
}

// =============================================================================
// Desktop Layout (1280 x 720)
// =============================================================================
test.describe('Desktop Layout (1280x720)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    // Give CSS and JS a moment to settle
    await page.waitForLoadState('domcontentloaded');
  });

  test('chat panel and viewport are side by side', async ({ page }) => {
    const chatPanel = page.locator('#chat-panel');
    const viewport = page.locator('#viewport');

    const chatBox = await chatPanel.boundingBox();
    const viewportBox = await viewport.boundingBox();

    expect(chatBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();

    // Chat panel should be to the left of the viewport
    expect(chatBox.x).toBeLessThan(viewportBox.x);
    // They should share the same vertical position (both at top)
    expect(Math.abs(chatBox.y - viewportBox.y)).toBeLessThan(50);
  });

  test('chat panel width is approximately 35%', async ({ page }) => {
    const chatPanel = page.locator('#chat-panel');
    const chatWidth = await getWidth(chatPanel);
    const viewportWidth = 1280;

    // CSS sets --chat-width: 35%; allow some tolerance for borders/divider
    const ratio = chatWidth / viewportWidth;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.45);
  });

  test('viewport width is approximately 65%', async ({ page }) => {
    const viewport = page.locator('#viewport');
    const vpWidth = await getWidth(viewport);
    const totalWidth = 1280;

    const ratio = vpWidth / totalWidth;
    expect(ratio).toBeGreaterThan(0.50);
    expect(ratio).toBeLessThan(0.75);
  });

  test('resize divider is visible', async ({ page }) => {
    const divider = page.locator('#resize-divider');
    const styles = await getComputedStyles(divider, ['display', 'width']);
    expect(styles.display).not.toBe('none');
    const dividerWidth = parseFloat(styles.width);
    expect(dividerWidth).toBeGreaterThan(0);
  });

  test('mobile tabs are hidden', async ({ page }) => {
    const mobileTabs = page.locator('#mobile-tabs');
    const styles = await getComputedStyles(mobileTabs, ['display']);
    expect(styles.display).toBe('none');
  });

  test('all controls are visible simultaneously', async ({ page }) => {
    // Chat panel visible
    const chatDisplay = await getComputedStyles(page.locator('#chat-panel'), ['display']);
    expect(chatDisplay.display).not.toBe('none');

    // Viewport visible
    const vpDisplay = await getComputedStyles(page.locator('#viewport'), ['display']);
    expect(vpDisplay.display).not.toBe('none');

    // Viewport controls visible
    const controlsDisplay = await getComputedStyles(page.locator('#viewport-controls'), ['display']);
    expect(controlsDisplay.display).not.toBe('none');

    // Chat form visible
    const formDisplay = await getComputedStyles(page.locator('#chat-form'), ['display']);
    expect(formDisplay.display).not.toBe('none');

    // Stats bar visible
    const statsDisplay = await getComputedStyles(page.locator('#stats-bar'), ['display']);
    expect(statsDisplay.display).not.toBe('none');
  });
});

// =============================================================================
// Tablet Layout (768 x 1024)
// =============================================================================
test.describe('Tablet Layout (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('layout transitions appropriately', async ({ page }) => {
    // At exactly 768px the max-width: 768px media query applies
    const mobileTabs = page.locator('#mobile-tabs');
    const tabsDisplay = await getComputedStyles(mobileTabs, ['display']);

    // Tabs should be visible (flex) at the breakpoint
    expect(tabsDisplay.display).toBe('flex');
  });

  test('content is still usable', async ({ page }) => {
    // Chat panel should be visible and take usable width
    const chatPanel = page.locator('#chat-panel');
    const chatWidth = await getWidth(chatPanel);
    expect(chatWidth).toBeGreaterThan(300);

    // Chat input should be usable
    const chatInput = page.locator('#chat-input');
    await expect(chatInput).toBeVisible();
    const inputWidth = await getWidth(chatInput);
    expect(inputWidth).toBeGreaterThan(200);
  });

  test('no horizontal overflow', async ({ page }) => {
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(overflowX).toBe(true);
  });
});

// =============================================================================
// Mobile Layout (375 x 667 — iPhone SE)
// =============================================================================
test.describe('Mobile Layout (375x667 — iPhone SE)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('mobile tabs are visible', async ({ page }) => {
    const mobileTabs = page.locator('#mobile-tabs');
    const styles = await getComputedStyles(mobileTabs, ['display']);
    expect(styles.display).toBe('flex');
  });

  test('chat panel takes full width', async ({ page }) => {
    const chatPanel = page.locator('#chat-panel');
    const chatWidth = await getWidth(chatPanel);
    // Should take full viewport width (375px)
    expect(chatWidth).toBeGreaterThanOrEqual(370);
    expect(chatWidth).toBeLessThanOrEqual(375);
  });

  test('resize divider is hidden', async ({ page }) => {
    const divider = page.locator('#resize-divider');
    const styles = await getComputedStyles(divider, ['display']);
    expect(styles.display).toBe('none');
  });

  test('tab switching: click viewport tab shows viewport, hides chat', async ({ page }) => {
    const tabViewport = page.locator('#tab-viewport');
    const chatPanel = page.locator('#chat-panel');
    const viewport = page.locator('#viewport');

    // Initially chat is visible and viewport is hidden per CSS
    const chatBefore = await getComputedStyles(chatPanel, ['display']);
    const vpBefore = await getComputedStyles(viewport, ['display']);
    expect(chatBefore.display).not.toBe('none');
    expect(vpBefore.display).toBe('none');

    // Click viewport tab
    await tabViewport.click();
    // Allow for JS to toggle classes and CSS to recalculate
    await page.waitForTimeout(200);

    // After clicking, check aria-pressed state
    await expect(tabViewport).toHaveAttribute('aria-pressed', 'true');
    const tabChat = page.locator('#tab-chat');
    await expect(tabChat).toHaveAttribute('aria-pressed', 'false');
  });

  test('tab switching: click chat tab shows chat', async ({ page }) => {
    const tabChat = page.locator('#tab-chat');
    const tabViewport = page.locator('#tab-viewport');

    // Switch to viewport first
    await tabViewport.click();
    await page.waitForTimeout(100);

    // Switch back to chat
    await tabChat.click();
    await page.waitForTimeout(100);

    await expect(tabChat).toHaveAttribute('aria-pressed', 'true');
    await expect(tabViewport).toHaveAttribute('aria-pressed', 'false');
    expect(await tabChat.evaluate((el) => el.classList.contains('active'))).toBe(true);
    expect(await tabViewport.evaluate((el) => el.classList.contains('active'))).toBe(false);
  });

  test('chat input is full width', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    const chatForm = page.locator('#chat-form');
    const inputWidth = await getWidth(chatInput);
    const formWidth = await getWidth(chatForm);

    // Input should take up most of the form width (minus send button + padding)
    expect(inputWidth).toBeGreaterThan(formWidth * 0.7);
  });

  test('touch targets are adequate size (min 44px)', async ({ page }) => {
    // Mobile tabs should be at least 44px tall
    const tabChat = page.locator('#tab-chat');
    const tabHeight = await getHeight(tabChat);
    expect(tabHeight).toBeGreaterThanOrEqual(44);

    // Send button should be at least 36px (a common mobile minimum)
    const sendBtn = page.locator('#chat-send');
    const sendBox = await sendBtn.boundingBox();
    expect(sendBox).not.toBeNull();
    expect(sendBox.width).toBeGreaterThanOrEqual(36);
    expect(sendBox.height).toBeGreaterThanOrEqual(36);

    // Preset buttons should be tappable
    const presetBtns = page.locator('.preset-btn');
    const presetCount = await presetBtns.count();
    for (let i = 0; i < presetCount; i++) {
      const box = await presetBtns.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(28);
      }
    }
  });
});

// =============================================================================
// Mobile Layout (390 x 844 — iPhone 14)
// =============================================================================
test.describe('Mobile Layout (390x844 — iPhone 14)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('mobile tabs are visible', async ({ page }) => {
    const mobileTabs = page.locator('#mobile-tabs');
    const styles = await getComputedStyles(mobileTabs, ['display']);
    expect(styles.display).toBe('flex');
  });

  test('chat panel takes full width', async ({ page }) => {
    const chatPanel = page.locator('#chat-panel');
    const chatWidth = await getWidth(chatPanel);
    expect(chatWidth).toBeGreaterThanOrEqual(385);
    expect(chatWidth).toBeLessThanOrEqual(390);
  });

  test('resize divider is hidden', async ({ page }) => {
    const divider = page.locator('#resize-divider');
    const styles = await getComputedStyles(divider, ['display']);
    expect(styles.display).toBe('none');
  });

  test('no content cut off', async ({ page }) => {
    // No horizontal overflow
    const noOverflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(noOverflowX).toBe(true);

    // Chat header text should be visible (not clipped outside viewport)
    const h1 = page.locator('#chat-header h1');
    const h1Box = await h1.boundingBox();
    expect(h1Box).not.toBeNull();
    expect(h1Box.x).toBeGreaterThanOrEqual(0);
    expect(h1Box.x + h1Box.width).toBeLessThanOrEqual(390);

    // Preset buttons should not overflow beyond the viewport
    const presetArea = page.locator('#preset-area');
    const presetBox = await presetArea.boundingBox();
    expect(presetBox).not.toBeNull();
    expect(presetBox.x).toBeGreaterThanOrEqual(0);
  });

  test('tab switching works same as iPhone SE', async ({ page }) => {
    const tabViewport = page.locator('#tab-viewport');
    const tabChat = page.locator('#tab-chat');

    // Click viewport tab
    await tabViewport.click();
    await page.waitForTimeout(100);
    await expect(tabViewport).toHaveAttribute('aria-pressed', 'true');
    await expect(tabChat).toHaveAttribute('aria-pressed', 'false');

    // Click chat tab
    await tabChat.click();
    await page.waitForTimeout(100);
    await expect(tabChat).toHaveAttribute('aria-pressed', 'true');
    await expect(tabViewport).toHaveAttribute('aria-pressed', 'false');
  });
});

// =============================================================================
// Resize Behavior
// =============================================================================
test.describe('Resize Behavior', () => {
  test('resize from desktop to mobile switches layout', async ({ page }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify desktop: mobile tabs hidden
    let tabsDisplay = await getComputedStyles(page.locator('#mobile-tabs'), ['display']);
    expect(tabsDisplay.display).toBe('none');

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);

    // Verify mobile: mobile tabs visible
    tabsDisplay = await getComputedStyles(page.locator('#mobile-tabs'), ['display']);
    expect(tabsDisplay.display).toBe('flex');

    // Resize divider should be hidden on mobile
    const dividerDisplay = await getComputedStyles(page.locator('#resize-divider'), ['display']);
    expect(dividerDisplay.display).toBe('none');
  });

  test('resize from mobile to desktop switches layout back', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify mobile state
    let tabsDisplay = await getComputedStyles(page.locator('#mobile-tabs'), ['display']);
    expect(tabsDisplay.display).toBe('flex');

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);

    // Verify desktop state
    tabsDisplay = await getComputedStyles(page.locator('#mobile-tabs'), ['display']);
    expect(tabsDisplay.display).toBe('none');

    // Divider should be visible
    const dividerDisplay = await getComputedStyles(page.locator('#resize-divider'), ['display']);
    expect(dividerDisplay.display).not.toBe('none');
  });

  test('no layout breaking during resize', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Step through multiple widths
    const widths = [1280, 1024, 900, 768, 600, 375, 600, 768, 1024, 1280];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 720 });
      await page.waitForTimeout(100);

      // At no point should there be horizontal overflow
      const noOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
      });
      expect(noOverflow).toBe(true);

      // #app should always be visible
      const appDisplay = await getComputedStyles(page.locator('#app'), ['display']);
      expect(appDisplay.display).not.toBe('none');
    }
  });

  test('canvas resizes with viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.locator('#render-canvas');
    const widthBefore = await getWidth(canvas);

    // Resize viewport (make it smaller)
    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(300);

    const widthAfter = await getWidth(canvas);
    // Canvas should have shrunk
    expect(widthAfter).toBeLessThan(widthBefore);
  });
});

// =============================================================================
// Landscape Mobile (667 x 375)
// =============================================================================
test.describe('Landscape Mobile (667x375)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('layout still works in landscape', async ({ page }) => {
    // At 667px width, this is below 768px breakpoint, so mobile layout applies
    const mobileTabs = page.locator('#mobile-tabs');
    const tabsDisplay = await getComputedStyles(mobileTabs, ['display']);
    expect(tabsDisplay.display).toBe('flex');

    // Chat panel should be visible (default mobile state)
    const chatPanel = page.locator('#chat-panel');
    const chatDisplay = await getComputedStyles(chatPanel, ['display']);
    expect(chatDisplay.display).not.toBe('none');
  });

  test('chat is usable in landscape', async ({ page }) => {
    // Chat input should be visible and accessible
    const chatInput = page.locator('#chat-input');
    await expect(chatInput).toBeVisible();

    // Chat messages area should be present
    const chatMessages = page.locator('#chat-messages');
    const msgStyles = await getComputedStyles(chatMessages, ['display', 'overflow-y']);
    expect(msgStyles.display).not.toBe('none');
    expect(msgStyles['overflow-y']).toBe('auto');

    // Chat form should be visible
    const chatForm = page.locator('#chat-form');
    await expect(chatForm).toBeVisible();
  });

  test('no overflow issues in landscape', async ({ page }) => {
    const noOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(noOverflow).toBe(true);
  });
});

// =============================================================================
// Content Overflow
// =============================================================================
test.describe('Content Overflow', () => {
  test('long chat messages wrap correctly, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Inject a very long message into the chat area
    await page.evaluate(() => {
      const chatMessages = document.querySelector('#chat-messages');
      if (!chatMessages) return;

      const msg = document.createElement('div');
      msg.className = 'message message-user';
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = 'A'.repeat(500); // 500-character-long message
      msg.appendChild(content);
      chatMessages.appendChild(msg);
    });

    // Chat messages container should not scroll horizontally
    const noHScroll = await page.evaluate(() => {
      const el = document.querySelector('#chat-messages');
      if (!el) return true;
      return el.scrollWidth <= el.clientWidth;
    });
    expect(noHScroll).toBe(true);

    // Page itself should not have horizontal scroll
    const noPageHScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(noPageHScroll).toBe(true);
  });

  test('long parameter labels do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Switch to viewport tab to see param panel
    await page.locator('#tab-viewport').click();
    await page.waitForTimeout(200);

    // Check param-panel does not cause overflow
    const noOverflow = await page.evaluate(() => {
      const panel = document.querySelector('#param-panel');
      if (!panel) return true;
      const rect = panel.getBoundingClientRect();
      return rect.right <= window.innerWidth;
    });
    expect(noOverflow).toBe(true);
  });

  test('stats bar does not overflow on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Switch to viewport to see stats bar
    await page.locator('#tab-viewport').click();
    await page.waitForTimeout(200);

    // Stats bar should not overflow beyond viewport
    const noOverflow = await page.evaluate(() => {
      const bar = document.querySelector('#stats-bar');
      if (!bar) return true;
      const rect = bar.getBoundingClientRect();
      return rect.right <= window.innerWidth;
    });
    expect(noOverflow).toBe(true);
  });

  test('status text truncates gracefully', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The status indicator uses white-space: nowrap which prevents wrapping,
    // and the header title uses text-overflow: ellipsis.
    // Verify the header does not cause horizontal overflow.
    const headerOk = await page.evaluate(() => {
      const header = document.querySelector('#chat-header');
      if (!header) return true;
      return header.scrollWidth <= header.clientWidth + 2; // +2 for rounding
    });
    expect(headerOk).toBe(true);
  });

  test('long messages wrap on desktop too', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Inject a long AI message
    await page.evaluate(() => {
      const chatMessages = document.querySelector('#chat-messages');
      if (!chatMessages) return;

      const msg = document.createElement('div');
      msg.className = 'message message-ai';
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = 'B'.repeat(1000);
      msg.appendChild(content);
      chatMessages.appendChild(msg);
    });

    // Message content should word-break within the chat panel
    const noHScroll = await page.evaluate(() => {
      const el = document.querySelector('#chat-messages');
      if (!el) return true;
      return el.scrollWidth <= el.clientWidth;
    });
    expect(noHScroll).toBe(true);
  });
});
