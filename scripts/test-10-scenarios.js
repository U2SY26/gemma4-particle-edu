/**
 * Quick 10-scenario test with local Ollama
 * Tests diverse science domains to verify prompt injection works
 */

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'gemma4';

const SCENARIOS = [
    // Physics
    { prompt: 'PN 접합 반도체 시뮬레이션', expect: { gravity: 0, domain: 'electromagnetism' } },
    { prompt: '물이 끓는 과정을 보여줘', expect: { temp_min: 373, domain: 'chemistry' } },
    // Biology
    { prompt: '혈액 순환 시뮬레이션', expect: { material: 'blood', viscosity_min: 1 } },
    { prompt: '단백질 접힘 과정', expect: { gravity: 0, domain: 'biology' } },
    // Engineering
    { prompt: '현수교 바람 테스트', expect: { gravity: -9.81, wind_min: 1 } },
    { prompt: '콘크리트 건물 지진 7.0', expect: { seismic_min: 5 } },
    // Astronomy
    { prompt: '태양 표면 플라즈마', expect: { gravity_range: [-300, -200], temp_min: 5000 } },
    { prompt: '혜성 꼬리 시뮬레이션', expect: { gravity: 0 } },
    // Electromagnetism
    { prompt: 'MOSFET 트랜지스터 작동 원리', expect: { chargeStrength_min: 1 } },
    // Chemistry
    { prompt: '다이아몬드 결정 격자 구조', expect: { gravity: 0, density_min: 3 } },
];

async function chat(prompt) {
    const systemPrompt = `You are a physics simulation AI. Generate a simulation JSON.
MANDATORY: include a \`\`\`json block with {"simulation":{"prompt":"custom","title":"...","domain":"...","physics":{...}}} format.
Use accurate SI physical values. For molecular/nano scale, gravity=0. For Earth scenarios, gravity=-9.81.`;

    const start = Date.now();
    const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: false,
            options: { temperature: 0.3 }
        }),
    });

    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const text = data.message?.content || '';

    // Extract JSON
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (!match) return { elapsed, json: null, error: 'No JSON block' };

    try {
        const parsed = JSON.parse(match[1]);
        return { elapsed, json: parsed.simulation || parsed, error: null };
    } catch (e) {
        return { elapsed, json: null, error: `Parse error: ${e.message}` };
    }
}

async function run() {
    console.log('='.repeat(60));
    console.log(' 10-SCENARIO PROMPT INJECTION TEST');
    console.log(' Model:', MODEL, '| Ollama local');
    console.log('='.repeat(60));

    let pass = 0, fail = 0;

    for (let i = 0; i < SCENARIOS.length; i++) {
        const s = SCENARIOS[i];
        process.stdout.write(`\n[${i+1}/10] ${s.prompt}... `);

        const result = await chat(s.prompt);

        if (result.error) {
            console.log(`FAIL (${result.elapsed}s) — ${result.error}`);
            fail++;
            continue;
        }

        const physics = result.json?.physics || {};
        const checks = [];

        // Validate expectations
        if (s.expect.gravity !== undefined) {
            const ok = Math.abs((physics.gravity || -9.81) - s.expect.gravity) < 1;
            checks.push(`gravity=${physics.gravity} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.gravity_range) {
            const g = physics.gravity || 0;
            const ok = g >= s.expect.gravity_range[0] && g <= s.expect.gravity_range[1];
            checks.push(`gravity=${g} ${ok ? 'OK' : 'MISS (expected ' + s.expect.gravity_range + ')'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.temp_min) {
            const ok = (physics.temperature || 293) >= s.expect.temp_min;
            checks.push(`temp=${physics.temperature} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.seismic_min) {
            const ok = (physics.seismic || 0) >= s.expect.seismic_min;
            checks.push(`seismic=${physics.seismic} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.wind_min) {
            const ok = Math.abs(physics.windX || 0) >= s.expect.wind_min;
            checks.push(`windX=${physics.windX} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.viscosity_min) {
            const ok = (physics.viscosity || 0) >= s.expect.viscosity_min;
            checks.push(`viscosity=${physics.viscosity} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.chargeStrength_min) {
            const ok = (physics.chargeStrength || 0) >= s.expect.chargeStrength_min;
            checks.push(`chargeStrength=${physics.chargeStrength} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.density_min) {
            const ok = (physics.density || 0) >= s.expect.density_min;
            checks.push(`density=${physics.density} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }
        if (s.expect.domain) {
            const ok = (result.json?.domain || '').toLowerCase() === s.expect.domain;
            checks.push(`domain=${result.json?.domain} ${ok ? 'OK' : 'MISS'}`);
            if (!ok) fail++;
            else pass++;
        }

        if (checks.length === 0) {
            // Just check JSON was valid
            checks.push('JSON OK');
            pass++;
        }

        console.log(`(${result.elapsed}s) ${checks.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(` RESULT: ${pass} PASS, ${fail} FAIL out of ${pass + fail} checks`);
    console.log('='.repeat(60));
}

run().catch(console.error);
