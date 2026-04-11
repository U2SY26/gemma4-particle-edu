import { test, expect } from '@playwright/test';

// Full list of built-in templates (from ArchitectureGenerator.js)
const ALL_TEMPLATES = [
    'house', 'tower', 'bridge', 'cathedral', 'pyramid', 'skyscraper',
    'dome', 'arch', 'temple', 'castle', 'wall', 'stadium',
    'cube', 'sphere', 'molecule', 'dna', 'protein',
    'solar_system', 'galaxy', 'asteroid_field',
    'cloud', 'tornado', 'rain', 'water_drop', 'river', 'ocean_wave',
    'magnet', 'electron_cloud', 'transistor', 'circuit',
];

// Deterministic "random" shuffle for reproducible order
function shuffle(arr, seed = 42) {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const TEMPLATES_30 = shuffle(ALL_TEMPLATES);

test('30 templates stay stable for 20 seconds each (direct template switch)', async ({ page }) => {
    test.setTimeout(TEMPLATES_30.length * 25000 + 30000); // ~25s per template + buffer

    const errors = [];
    page.on('pageerror', e => errors.push(`PAGE_ERROR: ${e.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const t = msg.text();
            // Skip WebGL warnings, resource 404s, and benign AI-offline warnings
            if (!t.includes('WebGL') && !t.includes('404') && !t.includes('favicon') &&
                !t.includes('AI') && !t.includes('fetch')) {
                errors.push(`CONSOLE: ${t}`);
            }
        }
    });

    // Bootstrap: load the app once, hide landing, then switch templates in-place
    await page.goto('http://localhost:3000/?prompt=pyramid&lang=en');
    await page.waitForFunction(() => window.__app && window.__app.physics, { timeout: 10000 });
    await page.waitForTimeout(3000); // initial pyramid settled

    const results = [];

    for (const tmpl of TEMPLATES_30) {
        // Switch template directly via app._onPromptSubmit — bypasses AI chat entirely
        await page.evaluate((t) => {
            const app = window.__app;
            // Reset to clean physics defaults before each template to avoid carry-over
            app.physics.seismic = 0;
            app.physics.windX = 0; app.physics.windY = 0; app.physics.windZ = 0;
            app.physics.floodLevel = 0;
            app._onPromptSubmit(t);
        }, tmpl);

        // Wait for the 1.2s releaseTargets delay + build + initial settling
        await page.waitForTimeout(3500);

        const measure = async () => page.evaluate(() => {
            const app = window.__app;
            if (!app || !app.physics) return { error: 'app not ready' };
            const pos = app.physics.pos;
            const vel = app.physics.vel;
            const active = app.physics.activeCount;
            let xMin=Infinity, xMax=-Infinity, yMin=Infinity, yMax=-Infinity, zMin=Infinity, zMax=-Infinity;
            let maxVel = 0, nan = 0;
            for (let i = 0; i < active; i++) {
                const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
                if (!isFinite(x) || !isFinite(y) || !isFinite(z)) { nan++; continue; }
                if (x<xMin) xMin=x; if (x>xMax) xMax=x;
                if (y<yMin) yMin=y; if (y>yMax) yMax=y;
                if (z<zMin) zMin=z; if (z>zMax) zMax=z;
                const vx = vel[i*3], vy = vel[i*3+1], vz = vel[i*3+2];
                const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
                if (isFinite(v) && v > maxVel) maxVel = v;
            }
            return {
                spreadX: +(xMax-xMin).toFixed(2),
                spreadY: +(yMax-yMin).toFixed(2),
                spreadZ: +(zMax-zMin).toFixed(2),
                maxVel: +maxVel.toFixed(4),
                nan, active,
                structureType: document.getElementById('structure-info')?.textContent || '',
            };
        });

        const initial = await measure();
        // Wait out the remaining time to reach ~20s total stability window
        await page.waitForTimeout(17000);
        const final = await measure();

        const driftX = initial.spreadX > 0 ? Math.abs(final.spreadX - initial.spreadX) / initial.spreadX : 0;
        const driftY = initial.spreadY > 0 ? Math.abs(final.spreadY - initial.spreadY) / initial.spreadY : 0;
        const driftZ = initial.spreadZ > 0 ? Math.abs(final.spreadZ - initial.spreadZ) / initial.spreadZ : 0;
        const maxDrift = Math.max(driftX, driftY, driftZ);

        // Stability criteria:
        //  - no NaN particles
        //  - final spread < 200m in any axis (some templates like solar_system/galaxy are large)
        //  - max velocity < 100 m/s (some templates like orbit/electron_cloud naturally move)
        const exploded = final.nan > 0
            || final.spreadX >= 200 || final.spreadY >= 200 || final.spreadZ >= 200
            || final.maxVel >= 100;

        const status = exploded ? 'EXPLODED' : 'STABLE';
        results.push({ template: tmpl, status, initial, final, drift: +(maxDrift * 100).toFixed(1) });
        console.log(`[${status}] ${tmpl.padEnd(18)} spread=${final.spreadX}×${final.spreadY}×${final.spreadZ} maxVel=${final.maxVel} drift=${(maxDrift*100).toFixed(1)}% nan=${final.nan} | ${final.structureType}`);
    }

    const stable = results.filter(r => r.status === 'STABLE').length;
    const exploded = results.filter(r => r.status === 'EXPLODED').length;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`RESULT: ${stable}/${TEMPLATES_30.length} stable, ${exploded} exploded`);
    console.log(`${'='.repeat(70)}`);

    if (exploded > 0) {
        console.log('EXPLODED templates:');
        results.filter(r => r.status === 'EXPLODED').forEach(r => {
            console.log(`  - ${r.template}: ${JSON.stringify(r.final)}`);
        });
    }

    // Fail the test if ANY template explodes
    expect(exploded).toBe(0);
});
