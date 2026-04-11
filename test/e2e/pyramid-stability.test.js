import { test, expect } from '@playwright/test';

test('pyramid stays stable over 30 seconds', async ({ page }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://localhost:3000/?prompt=pyramid&lang=en');
    await page.waitForTimeout(2000);

    const measure = async () => {
        return await page.evaluate(() => {
            const app = window.__app;
            if (!app || !app.physics) return { error: 'app not ready' };
            const pos = app.physics.pos;
            const vel = app.physics.vel;
            const active = app.physics.activeCount;
            let xMin=Infinity, xMax=-Infinity, yMin=Infinity, yMax=-Infinity, zMin=Infinity, zMax=-Infinity;
            let maxVel = 0, sumVel = 0;
            for (let i = 0; i < active; i++) {
                const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
                if (x<xMin) xMin=x; if (x>xMax) xMax=x;
                if (y<yMin) yMin=y; if (y>yMax) yMax=y;
                if (z<zMin) zMin=z; if (z>zMax) zMax=z;
                const vx = vel[i*3], vy = vel[i*3+1], vz = vel[i*3+2];
                const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
                if (v > maxVel) maxVel = v;
                sumVel += v;
            }
            return {
                spreadX: +(xMax-xMin).toFixed(2),
                spreadY: +(yMax-yMin).toFixed(2),
                spreadZ: +(zMax-zMin).toFixed(2),
                yMin: +yMin.toFixed(3),
                yMax: +yMax.toFixed(3),
                maxVel: +maxVel.toFixed(4),
                avgVel: +(sumVel/active).toFixed(4),
                active,
            };
        });
    };

    const samples = [];
    for (let t = 3; t <= 30; t += 3) {
        await page.waitForTimeout(3000);
        const m = await measure();
        samples.push({ t, ...m });
        console.log(`[t=${t}s]`, JSON.stringify(m));
    }

    for (const s of samples) {
        expect(s.error).toBeUndefined();
        expect(s.spreadX).toBeLessThan(30);
        expect(s.spreadY).toBeLessThan(30);
        expect(s.spreadZ).toBeLessThan(30);
        expect(s.maxVel).toBeLessThan(20);
    }

    const first = samples[0];
    const last = samples[samples.length - 1];
    const driftX = Math.abs(last.spreadX - first.spreadX) / first.spreadX;
    const driftY = Math.abs(last.spreadY - first.spreadY) / first.spreadY;
    const driftZ = Math.abs(last.spreadZ - first.spreadZ) / first.spreadZ;
    console.log(`[DRIFT] x=${(driftX*100).toFixed(1)}% y=${(driftY*100).toFixed(1)}% z=${(driftZ*100).toFixed(1)}%`);

    expect(driftX).toBeLessThan(0.3);
    expect(driftY).toBeLessThan(0.3);
    expect(driftZ).toBeLessThan(0.3);

    console.log('ERRORS:', errors.length);
});
