import { test, expect } from '@playwright/test';

// All built-in templates — used to verify nothing regressed elsewhere
const ALL_TEMPLATES = [
    'house', 'tower', 'bridge', 'cathedral', 'pyramid', 'skyscraper',
    'dome', 'arch', 'temple', 'castle', 'wall', 'stadium',
    'cube', 'sphere', 'molecule', 'dna', 'protein',
    'solar_system', 'galaxy', 'asteroid_field',
    'cloud', 'tornado', 'rain', 'water_drop', 'river', 'ocean_wave',
    'magnet', 'electron_cloud', 'transistor', 'circuit',
];

// Types that have the new maxScale cap — must stay compact
const CAPPED_TYPES = new Set([
    'dna', 'protein', 'molecule', 'electron_cloud', 'magnet',
    'transistor', 'circuit',
]);

// Reasonable per-type size limits (full active particle range — includes ambient).
// Non-capped templates can be big (solar_system, galaxy).
const SIZE_LIMITS = {
    // Molecular/organic capped types
    dna:            { x: 10, y: 25, z: 10 },
    protein:        { x: 20, y: 25, z: 20 },
    molecule:       { x: 10, y: 15, z: 10 },
    electron_cloud: { x: 15, y: 15, z: 15 },
    magnet:         { x: 15, y: 15, z: 15 },
    // Electronic — natural chip-scale, still constrained
    transistor:     { x: 40, y: 30, z: 30 },
    circuit:        { x: 30, y: 30, z: 30 },
    // Astronomy — huge by design
    solar_system:   { x: 500, y: 50, z: 500 },
    galaxy:         { x: 500, y: 50, z: 500 },
    asteroid_field: { x: 300, y: 50, z: 300 },
    // Weather — also big
    cloud:          { x: 100, y: 50, z: 100 },
    tornado:        { x: 50, y: 100, z: 50 },
    rain:           { x: 100, y: 100, z: 100 },
    // Fluid
    water_drop:     { x: 100, y: 100, z: 100 },
    river:          { x: 300, y: 100, z: 300 },
    ocean_wave:     { x: 300, y: 100, z: 300 },
    // Architecture default — should be reasonable
    DEFAULT:        { x: 200, y: 200, z: 200 },
};

function limitFor(type) {
    return SIZE_LIMITS[type] || SIZE_LIMITS.DEFAULT;
}

test('all templates render at sensible size + molecular types stay compact', async ({ page }) => {
    test.setTimeout(ALL_TEMPLATES.length * 6000 + 30000);

    const errors = [];
    page.on('pageerror', e => errors.push(`PAGE_ERROR: ${e.message}`));

    // Bootstrap — load once, then switch templates via _onPromptSubmit directly
    await page.goto('http://localhost:3000/?prompt=pyramid&lang=en');
    await page.waitForFunction(() => window.__app && window.__app.physics, { timeout: 15000 });
    await page.waitForTimeout(3000); // initial settle

    const results = [];
    const failures = [];

    for (const tmpl of ALL_TEMPLATES) {
        // Direct template switch (bypasses chat / AI entirely)
        await page.evaluate((t) => {
            const app = window.__app;
            // Reset physics state so nothing carries over
            app.physics.seismic = 0;
            app.physics.windX = 0; app.physics.windY = 0; app.physics.windZ = 0;
            app.physics.floodLevel = 0;
            app._onPromptSubmit(t);
        }, tmpl);

        // Wait for currentStructure to actually reflect the new template
        // (avoids race where measurement happens during the 1.2s release delay)
        try {
            await page.waitForFunction(
                (t) => window.__app?.currentStructure?.metadata?.type === t,
                tmpl, { timeout: 5000 }
            );
        } catch {
            // Fall through — some templates map differently
        }
        // Small settle for physics + particleSystem sync
        await page.waitForTimeout(1500);

        const state = await page.evaluate(() => {
            const app = window.__app;
            const pos = app.physics.pos;
            const active = app.physics.activeCount;
            const structCount = app.currentStructure?.metadata?.structuralParticles || 0;
            const particleCount = app.currentStructure?.metadata?.particleCount || 0;
            const actualType = app.currentStructure?.metadata?.type || 'unknown';

            // Measure FULL active range (includes ambient) — this is what the user actually sees
            let xMin=Infinity, xMax=-Infinity, yMin=Infinity, yMax=-Infinity, zMin=Infinity, zMax=-Infinity;
            let nan = 0;
            for (let i = 0; i < active; i++) {
                const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
                if (!isFinite(x) || !isFinite(y) || !isFinite(z)) { nan++; continue; }
                if (x<xMin) xMin=x; if (x>xMax) xMax=x;
                if (y<yMin) yMin=y; if (y>yMax) yMax=y;
                if (z<zMin) zMin=z; if (z>zMax) zMax=z;
            }
            return {
                active,
                structCount,
                particleCount,
                actualType,
                spreadX: active > 0 ? +(xMax-xMin).toFixed(2) : 0,
                spreadY: active > 0 ? +(yMax-yMin).toFixed(2) : 0,
                spreadZ: active > 0 ? +(zMax-zMin).toFixed(2) : 0,
                yMin: active > 0 ? +yMin.toFixed(2) : 0,
                yMax: active > 0 ? +yMax.toFixed(2) : 0,
                nan,
            };
        });

        const lim = limitFor(tmpl);
        const tooBig = state.spreadX > lim.x || state.spreadY > lim.y || state.spreadZ > lim.z;
        const hasNaN = state.nan > 0;
        const noStructure = state.structCount === 0;
        const status = tooBig ? 'TOO_BIG' : hasNaN ? 'NAN' : noStructure ? 'EMPTY' : 'OK';

        results.push({ tmpl, status, ...state, limit: lim });
        console.log(`[${status.padEnd(7)}] ${tmpl.padEnd(18)} ` +
                    `type=${state.actualType.padEnd(16)} ` +
                    `spread=${state.spreadX}×${state.spreadY}×${state.spreadZ} ` +
                    `active=${state.active} struct=${state.structCount} nan=${state.nan}`);

        if (status !== 'OK') {
            failures.push({ tmpl, status, state, lim });
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    const ok = results.filter(r => r.status === 'OK').length;
    console.log(`RESULT: ${ok}/${ALL_TEMPLATES.length} OK`);
    console.log(`${'='.repeat(60)}`);

    if (failures.length > 0) {
        console.log('FAILURES:');
        for (const f of failures) {
            console.log(`  ${f.tmpl} (${f.status}): spread=${f.state.spreadX}×${f.state.spreadY}×${f.state.spreadZ} limit=${JSON.stringify(f.lim)}`);
        }
    }

    // Capped types must actually be compact
    const cappedResults = results.filter(r => CAPPED_TYPES.has(r.tmpl));
    for (const r of cappedResults) {
        const lim = r.limit;
        expect(r.spreadX, `${r.tmpl} X spread`).toBeLessThanOrEqual(lim.x);
        expect(r.spreadY, `${r.tmpl} Y spread`).toBeLessThanOrEqual(lim.y);
        expect(r.spreadZ, `${r.tmpl} Z spread`).toBeLessThanOrEqual(lim.z);
        expect(r.nan, `${r.tmpl} NaN count`).toBe(0);
        expect(r.structCount, `${r.tmpl} struct particles`).toBeGreaterThan(0);
        // Capped types should not leave ghost ambient particles: active should
        // equal structural (no wall of leftover ground particles).
        expect(r.active, `${r.tmpl} active == struct (no ambient wall)`).toBe(r.structCount);
    }

    // No total failures allowed
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
});

// Spec path — what Gemma 4 AI Studio actually produces.
// The random_box fix must keep environment groups from forming walls.
test('spec path: empty-params random_box auto-fits to bounding box', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:3000/?prompt=pyramid&lang=en');
    await page.waitForFunction(() => window.__app && window.__app.archGen, { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Three simulated AI specs — all failure modes we've seen
    const result = await page.evaluate(() => {
        const app = window.__app;
        const specs = [
            {
                name: 'DNA helix + env',
                groups: [
                    { name: 'Strand A', count: 2000, shape: 'helix',
                      params: { radius: 1.5, pitch: 0.5, turns: 6, center: [0, 5, 0] }, role: 2 },
                    { name: 'Strand B', count: 2000, shape: 'helix',
                      params: { radius: 1.5, pitch: 0.5, turns: 6, center: [0, 5, 0] }, role: 2 },
                    { name: 'Environment ambient particles', count: 6000,
                      shape: 'random_box', params: {}, role: 0 },
                ],
            },
            {
                name: 'Protein sphere + env',
                groups: [
                    { name: 'Core', count: 3000, shape: 'sphere',
                      params: { radius: 2, center: [0, 5, 0] }, role: 2 },
                    { name: 'Env ambient', count: 5000, shape: 'random_box', params: {}, role: 0 },
                ],
            },
            {
                name: 'Explicit params — must respect user spec',
                groups: [
                    { name: 'Core', count: 1000, shape: 'sphere',
                      params: { radius: 3, center: [0, 10, 0] }, role: 2 },
                    { name: 'Box', count: 2000, shape: 'random_box',
                      params: { width: 4, height: 4, depth: 4, center: [10, 10, 10] }, role: 0 },
                ],
            },
        ];

        const out = [];
        for (const spec of specs) {
            const s = app.archGen.generateFromSpec(spec, 25000);
            const t = s.targets;

            // Compute bounds for structural groups (first N-1 groups)
            const boxGroup = s.metadata.groups[s.metadata.groups.length - 1];
            const structStart = 0;
            const structEnd = boxGroup.startIdx;

            let sMinY=Infinity, sMaxY=-Infinity, sMinX=Infinity, sMaxX=-Infinity, sMinZ=Infinity, sMaxZ=-Infinity;
            for (let i = structStart; i < structEnd; i++) {
                const x = t[i*3], y = t[i*3+1], z = t[i*3+2];
                if (y<sMinY) sMinY=y; if (y>sMaxY) sMaxY=y;
                if (x<sMinX) sMinX=x; if (x>sMaxX) sMaxX=x;
                if (z<sMinZ) sMinZ=z; if (z>sMaxZ) sMaxZ=z;
            }

            // Compute bounds for the random_box group
            let bMinY=Infinity, bMaxY=-Infinity, bMinX=Infinity, bMaxX=-Infinity, bMinZ=Infinity, bMaxZ=-Infinity;
            for (let i = boxGroup.startIdx; i < boxGroup.endIdx; i++) {
                const x = t[i*3], y = t[i*3+1], z = t[i*3+2];
                if (y<bMinY) bMinY=y; if (y>bMaxY) bMaxY=y;
                if (x<bMinX) bMinX=x; if (x>bMaxX) bMaxX=x;
                if (z<bMinZ) bMinZ=z; if (z>bMaxZ) bMaxZ=z;
            }

            out.push({
                name: spec.name,
                struct: { yMin: +sMinY.toFixed(2), yMax: +sMaxY.toFixed(2),
                          xMin: +sMinX.toFixed(2), xMax: +sMaxX.toFixed(2) },
                box:    { yMin: +bMinY.toFixed(2), yMax: +bMaxY.toFixed(2),
                          xMin: +bMinX.toFixed(2), xMax: +bMaxX.toFixed(2) },
                boxBelowStruct: bMaxY < sMinY + 0.5,
                boxEnclosesStructY: bMinY <= sMinY && bMaxY >= sMaxY,
            });
        }
        return out;
    });

    console.log('[spec path results]');
    for (const r of result) console.log(' ', JSON.stringify(r));

    // Case 1: DNA — empty params → must auto-fit (not below helix)
    expect(result[0].boxBelowStruct, 'DNA: box must not be below helix').toBe(false);
    expect(result[0].boxEnclosesStructY, 'DNA: box must span helix Y range').toBe(true);

    // Case 2: Protein — empty params → same auto-fit behavior
    expect(result[1].boxBelowStruct, 'Protein: box must not be below core').toBe(false);
    expect(result[1].boxEnclosesStructY, 'Protein: box must span core Y range').toBe(true);

    // Case 3: Explicit params — must respect user's specified 4×4×4 at [10,10,10]
    // Box extent should be [8..12] × [8..12] × [8..12], not auto-fit
    const c3 = result[2];
    expect(c3.box.xMin).toBeGreaterThanOrEqual(7.9);
    expect(c3.box.xMax).toBeLessThanOrEqual(12.1);
    expect(c3.box.yMin).toBeGreaterThanOrEqual(7.9);
    expect(c3.box.yMax).toBeLessThanOrEqual(12.1);
});
