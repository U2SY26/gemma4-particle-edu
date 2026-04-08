/**
 * Benchmark: Fine-tuned vs Base model comparison
 * Runs same 20 core scenarios on both models and compares JSON quality
 *
 * Usage:
 *   node scripts/benchmark-finetune.js [--model gemma4-physics-edu] [--base gemma4]
 *
 * Requires: Ollama running with both models
 */

import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const FT_MODEL = args.find(a => a.startsWith('--model='))?.split('=')[1] || 'gemma4-physics-edu';
const BASE_MODEL = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'gemma4';
const OLLAMA_URL = 'http://localhost:11434/api/chat';

// 20 core scenarios covering all domains
const SCENARIOS = [
    { id: 1, input: '쿠푸 왕의 거대 피라미드', expected: { gravity: -9.81, density_range: [2500, 2900] } },
    { id: 2, input: 'DNA double helix structure', expected: { gravity: 0, temp_range: [300, 320] } },
    { id: 3, input: '달 표면 중력 실험', expected: { gravity: -1.62 } },
    { id: 4, input: 'Steel bridge earthquake test', expected: { gravity: -9.81, seismic_min: 3 } },
    { id: 5, input: '태양 표면 플라즈마', expected: { gravity_range: [-300, -200], temp_min: 5000 } },
    { id: 6, input: 'Water boiling at 100 celsius', expected: { temp_range: [370, 380] } },
    { id: 7, input: '혈액 순환 시뮬레이션', expected: { viscosity_min: 1 } },
    { id: 8, input: 'MOSFET transistor gate', expected: { chargeStrength_min: 1 } },
    { id: 9, input: '그래핀 나노시트', expected: { gravity: 0, density_range: [2000, 2500] } },
    { id: 10, input: 'Tornado simulation', expected: { turbulence_min: 3 } },
    { id: 11, input: '콘크리트 5층 건물', expected: { gravity: -9.81, density_range: [2000, 2800] } },
    { id: 12, input: 'Jupiter atmosphere vortex', expected: { gravity_range: [-26, -23] } },
    { id: 13, input: '단백질 접힘 과정', expected: { gravity: 0 } },
    { id: 14, input: 'PN junction semiconductor', expected: { gravity: 0, chargeStrength_min: 1 } },
    { id: 15, input: '화산 폭발 용암', expected: { temp_min: 1000 } },
    { id: 16, input: 'Diamond crystal lattice', expected: { gravity: 0, density_range: [3000, 4000] } },
    { id: 17, input: '눈보라 -30도', expected: { temp_range: [230, 250] } },
    { id: 18, input: 'Free fall 10 meters', expected: { gravity: -9.81 } },
    { id: 19, input: '초전도체 77K', expected: { temp_range: [70, 85] } },
    { id: 20, input: 'Ocean wave dynamics', expected: { viscosity_min: 0.1 } },
];

const SYSTEM_PROMPT = `Generate a physics simulation JSON. Include a \`\`\`json block with {"simulation":{"prompt":"custom","title":"...","domain":"...","physics":{...}}}. Use accurate SI values.`;

async function callModel(model, input) {
    const start = Date.now();
    try {
        const res = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: input }
                ],
                stream: false,
                options: { temperature: 0.3 }
            }),
        });
        const data = await res.json();
        const text = data.message?.content || '';
        const elapsed = (Date.now() - start) / 1000;

        // Extract JSON
        const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*"simulation"[\s\S]*\}/);
        if (!match) return { elapsed, physics: null, error: 'no_json' };

        let jsonStr = (match[1] || match[0]).replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(jsonStr);
        const sim = parsed.simulation || parsed;
        return { elapsed, physics: sim.physics || {}, domain: sim.domain, error: null };
    } catch (e) {
        return { elapsed: (Date.now() - start) / 1000, physics: null, error: e.message };
    }
}

function checkExpected(physics, expected) {
    if (!physics) return { pass: false, checks: ['no_physics'] };
    const checks = [];
    let pass = true;

    if (expected.gravity !== undefined) {
        const ok = Math.abs((physics.gravity ?? -9.81) - expected.gravity) < 1;
        checks.push(`gravity=${physics.gravity ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.gravity_range) {
        const g = physics.gravity ?? -9.81;
        const ok = g >= expected.gravity_range[0] && g <= expected.gravity_range[1];
        checks.push(`gravity=${g} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.temp_range) {
        const t = physics.temperature ?? 293;
        const ok = t >= expected.temp_range[0] && t <= expected.temp_range[1];
        checks.push(`temp=${t} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.temp_min) {
        const ok = (physics.temperature ?? 293) >= expected.temp_min;
        checks.push(`temp=${physics.temperature ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.density_range) {
        const d = (physics.density ?? 2.4) * (physics.density > 100 ? 1 : 1000);
        const ok = d >= expected.density_range[0] && d <= expected.density_range[1];
        checks.push(`density=${d.toFixed(0)} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.seismic_min) {
        const ok = (physics.seismic ?? 0) >= expected.seismic_min;
        checks.push(`seismic=${physics.seismic ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.viscosity_min) {
        const ok = (physics.viscosity ?? 0) >= expected.viscosity_min;
        checks.push(`viscosity=${physics.viscosity ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.turbulence_min) {
        const ok = (physics.turbulence ?? 0) >= expected.turbulence_min;
        checks.push(`turbulence=${physics.turbulence ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }
    if (expected.chargeStrength_min) {
        const ok = (physics.chargeStrength ?? 0) >= expected.chargeStrength_min;
        checks.push(`charge=${physics.chargeStrength ?? '?'} ${ok ? 'OK' : 'MISS'}`);
        if (!ok) pass = false;
    }

    return { pass, checks };
}

async function benchmark(model) {
    console.log(`\nBenchmarking: ${model}`);
    console.log('-'.repeat(50));

    let jsonOk = 0, checksPass = 0, totalChecks = 0, totalTime = 0;

    for (const s of SCENARIOS) {
        process.stdout.write(`  [${s.id}/20] ${s.input.slice(0, 30)}... `);
        const result = await callModel(model, s.input);
        totalTime += result.elapsed;

        if (result.error) {
            console.log(`FAIL (${result.elapsed.toFixed(1)}s) ${result.error}`);
            continue;
        }

        jsonOk++;
        const check = checkExpected(result.physics, s.expected);
        const passCount = check.checks.filter(c => c.includes('OK')).length;
        const totalCount = check.checks.length;
        checksPass += passCount;
        totalChecks += totalCount;

        console.log(`${check.pass ? 'PASS' : 'MISS'} (${result.elapsed.toFixed(1)}s) ${check.checks.join(', ')}`);
    }

    return {
        model,
        jsonSuccess: jsonOk,
        checksPass,
        totalChecks,
        avgTime: totalTime / SCENARIOS.length,
        totalTime,
    };
}

async function run() {
    console.log('═'.repeat(60));
    console.log(' FINE-TUNING BENCHMARK: Base vs Fine-tuned');
    console.log('═'.repeat(60));

    // Check which models are available
    try {
        const tags = await (await fetch('http://localhost:11434/api/tags')).json();
        const models = (tags.models || []).map(m => m.name);
        console.log(`Available models: ${models.join(', ')}`);

        if (!models.some(m => m.startsWith(BASE_MODEL))) {
            console.log(`WARNING: ${BASE_MODEL} not found, skipping base benchmark`);
        }
        if (!models.some(m => m.startsWith(FT_MODEL))) {
            console.log(`WARNING: ${FT_MODEL} not found — run after fine-tuning`);
        }
    } catch {
        console.log('WARNING: Cannot reach Ollama');
    }

    const results = [];

    // Base model benchmark
    const baseResult = await benchmark(BASE_MODEL);
    results.push(baseResult);

    // Fine-tuned model benchmark (if available)
    try {
        const ftResult = await benchmark(FT_MODEL);
        results.push(ftResult);
    } catch (e) {
        console.log(`\n${FT_MODEL} not available yet. Run after fine-tuning.`);
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log(' COMPARISON');
    console.log('═'.repeat(60));
    console.log(`${'Model'.padEnd(25)} ${'JSON OK'.padEnd(10)} ${'Checks'.padEnd(12)} ${'Avg Time'.padEnd(10)}`);
    for (const r of results) {
        console.log(`${r.model.padEnd(25)} ${(r.jsonSuccess + '/20').padEnd(10)} ${(r.checksPass + '/' + r.totalChecks).padEnd(12)} ${r.avgTime.toFixed(1)}s`);
    }

    // Save results
    writeFileSync('data/benchmark-finetune.json', JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
    console.log('\nSaved to data/benchmark-finetune.json');
}

run().catch(console.error);
