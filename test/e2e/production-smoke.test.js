import { test, expect } from '@playwright/test';

// Lightweight smoke test against live production URL
test('production: pyramid loads, no pageerror, new code deployed', async ({ page }) => {
    test.setTimeout(30000);

    const errors = [];
    page.on('pageerror', e => errors.push(`PAGE_ERROR: ${e.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const t = msg.text();
            if (!t.includes('WebGL') && !t.includes('404') && !t.includes('favicon')
                && !t.includes('fetch') && !t.includes('CORS')) {
                errors.push(`CONSOLE: ${t}`);
            }
        }
    });

    await page.goto('https://gemma4-particle-edu.vercel.app/?prompt=pyramid&lang=en');
    await page.waitForFunction(() => window.__app && window.__app.physics, { timeout: 15000 });
    await page.waitForTimeout(4000); // settle

    const state = await page.evaluate(() => {
        const app = window.__app;
        const pos = app.physics.pos;
        const active = app.physics.activeCount;
        let xMin=Infinity, xMax=-Infinity, yMin=Infinity, yMax=-Infinity, zMin=Infinity, zMax=-Infinity;
        for (let i = 0; i < active; i++) {
            const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
            if (x<xMin) xMin=x; if (x>xMax) xMax=x;
            if (y<yMin) yMin=y; if (y>yMax) yMax=y;
            if (z<zMin) zMin=z; if (z>zMax) zMax=z;
        }
        return {
            hasApp: !!app,
            hasPhysics: !!app.physics,
            active,
            spread: [+(xMax-xMin).toFixed(2), +(yMax-yMin).toFixed(2), +(zMax-zMin).toFixed(2)],
            structureInfo: document.getElementById('structure-info')?.textContent || '',
        };
    });

    console.log('[PROD]', JSON.stringify(state));
    console.log('[PROD ERRORS]', errors.length, errors.slice(0, 3));

    expect(state.hasApp).toBe(true);
    expect(state.hasPhysics).toBe(true);
    expect(state.active).toBeGreaterThan(100);
    expect(state.spread[0]).toBeGreaterThan(1); // pyramid should have some width
    expect(state.spread[1]).toBeGreaterThan(1); // pyramid should have some height
    expect(errors.length).toBe(0);
});
