import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Capture DNA, protein, molecule, transistor, circuit via direct template switch
const templates = ['dna', 'protein', 'molecule', 'transistor', 'circuit'];

await page.goto('http://localhost:3000/?prompt=pyramid&lang=en');
await page.waitForFunction(() => window.__app && window.__app.physics, { timeout: 15000 });
await page.waitForTimeout(3000);

for (const tmpl of templates) {
    await page.evaluate((t) => {
        const app = window.__app;
        app.physics.seismic = 0;
        app.physics.windX = 0; app.physics.windY = 0; app.physics.windZ = 0;
        app._onPromptSubmit(t);
    }, tmpl);

    await page.waitForFunction(
        (t) => window.__app?.currentStructure?.metadata?.type === t,
        tmpl, { timeout: 5000 }
    );
    await page.waitForTimeout(3000);

    const state = await page.evaluate(() => {
        const app = window.__app;
        return {
            type: app.currentStructure.metadata.type,
            particleCount: app.currentStructure.metadata.particleCount,
            structural: app.currentStructure.metadata.structuralParticles,
            ambient: app.currentStructure.metadata.ambientParticles,
            active: app.physics.activeCount,
        };
    });
    console.log(JSON.stringify({ tmpl, ...state }));

    await page.screenshot({
        path: `/tmp/render-fix-${tmpl}.png`,
        fullPage: false,
        clip: { x: 360, y: 0, width: 920, height: 800 },
    });
}

await browser.close();
console.log('[DONE] 5 screenshots saved to /tmp/render-fix-*.png');
