/**
 * Generate training data for Gemma 4 fine-tuning (Unsloth LoRA)
 *
 * Sources:
 * 1. benchmark-300.json → scenario title → simulation JSON (300 pairs)
 * 2. 138 materials × 3 environments (Earth/Moon/Space) → material lookup (414 pairs)
 * 3. AP Physics curriculum scenarios → structured responses (200 pairs)
 *
 * Output: data/training-data.jsonl (Alpaca format for Unsloth)
 */

import { readFileSync, writeFileSync } from 'fs';

const benchmark = JSON.parse(readFileSync('data/benchmark-300.json', 'utf8'));

// Parse the materials from SimulationManager.js
const simSrc = readFileSync('js/SimulationManager.js', 'utf8');
const matMatch = simSrc.match(/const REFERENCE_MATERIALS = \{([\s\S]*?)\};\s*\/\/ 138/);

const lines = [];

// ═══════════════════════════════════════════
// Source 1: Benchmark scenarios (300 pairs)
// ═══════════════════════════════════════════

function parseNum(str) {
    if (!str) return null;
    const m = String(str).match(/-?[\d.]+(?:e[+-]?\d+)?/i);
    return m ? parseFloat(m[0]) : null;
}

for (const s of benchmark.scenarios) {
    const density = parseNum(s.density);
    const gravity = parseNum(s.gravity);
    const temp = parseNum(s.temperature);

    // Skip scenarios with unparseable extreme values
    if (gravity !== null && Math.abs(gravity) > 1e6) continue;
    if (temp !== null && temp > 1e6) continue;

    const physics = {
        gravity: gravity ?? -9.81,
        damping: 0.97,
        springStiffness: 20,
        particleCount: s.particles || 25000,
        temperature: temp ?? 293,
        density: density ? density / 1000 : 2.4,
        viscosity: 0,
        friction: 0.8,
        bounciness: 0.3,
    };

    const simulation = {
        prompt: 'custom',
        title: s.title,
        domain: 'engineering',
        physics,
    };

    lines.push({
        instruction: 'Generate a physics simulation JSON for the following scenario.',
        input: s.title,
        output: '```json\n' + JSON.stringify({ simulation }, null, 2) + '\n```',
    });
}

console.log(`Source 1 (Benchmark): ${lines.length} pairs`);

// ═══════════════════════════════════════════
// Source 2: Material × Environment (414 pairs)
// ═══════════════════════════════════════════

const environments = [
    { name: 'Earth', gravity: -9.81, temp: 293 },
    { name: 'Moon', gravity: -1.62, temp: 400 },
    { name: 'Space', gravity: 0, temp: 2.7 },
];

// Extract material names from REFERENCE_MATERIALS
const materialNames = [];
if (matMatch) {
    const entries = matMatch[1].matchAll(/^\s{4}(\w+):\s*\{([^}]+)\}/gm);
    for (const m of entries) {
        const name = m[1];
        const props = m[2];
        const density = props.match(/density:\s*([\d.]+)/)?.[1];
        const springK = props.match(/springK:\s*([\d.]+)/)?.[1];
        if (density) {
            materialNames.push({ name, density: parseFloat(density), springK: parseFloat(springK || 20) });
        }
    }
}

let matEnvCount = 0;
for (const mat of materialNames) {
    for (const env of environments) {
        const title = `${mat.name} structure on ${env.name}`;
        const simulation = {
            prompt: 'custom',
            title,
            domain: 'engineering',
            physics: {
                gravity: env.gravity,
                damping: 0.97,
                springStiffness: mat.springK,
                particleCount: 25000,
                temperature: env.temp,
                density: mat.density / 1000,
                viscosity: 0,
                friction: 0.8,
                bounciness: 0.3,
            },
        };

        lines.push({
            instruction: 'Generate a physics simulation JSON for the following scenario.',
            input: title,
            output: '```json\n' + JSON.stringify({ simulation }, null, 2) + '\n```',
        });
        matEnvCount++;
    }
}

console.log(`Source 2 (Material × Env): ${matEnvCount} pairs`);

// ═══════════════════════════════════════════
// Source 3: AP Physics curriculum (200 pairs)
// ═══════════════════════════════════════════

const curriculum = [
    // Mechanics
    { input: 'Free fall from 10 meters', physics: { gravity: -9.81, damping: 0.999 }, domain: 'physics' },
    { input: 'Projectile motion at 45 degrees', physics: { gravity: -9.81, damping: 0.999, windX: 5 }, domain: 'physics' },
    { input: 'Simple pendulum with 1 meter string', physics: { gravity: -9.81, damping: 0.998, springStiffness: 40 }, domain: 'physics' },
    { input: 'Elastic collision between two balls', physics: { gravity: -9.81, bounciness: 0.95, friction: 0.01 }, domain: 'physics' },
    { input: 'Inelastic collision', physics: { gravity: -9.81, bounciness: 0.1, friction: 0.5 }, domain: 'physics' },
    { input: 'Friction on an inclined plane', physics: { gravity: -9.81, friction: 0.5 }, domain: 'physics' },
    { input: 'Terminal velocity in air', physics: { gravity: -9.81, viscosity: 1.0, damping: 0.95 }, domain: 'physics' },
    { input: 'Hooke\'s law spring compression', physics: { gravity: -9.81, springStiffness: 50 }, domain: 'physics' },
    // Waves
    { input: 'Transverse wave on a string', physics: { gravity: 0, springStiffness: 15, damping: 0.98 }, domain: 'physics' },
    { input: 'Longitudinal wave (sound)', physics: { gravity: 0, springStiffness: 20, damping: 0.99 }, domain: 'physics' },
    { input: 'Standing wave pattern', physics: { gravity: 0, springStiffness: 15, damping: 0.995 }, domain: 'physics' },
    { input: 'Double slit interference', physics: { gravity: 0, damping: 0.999 }, domain: 'physics' },
    // Thermodynamics
    { input: 'Ideal gas expansion', physics: { gravity: 0, temperature: 500, damping: 0.95 }, domain: 'physics' },
    { input: 'Heat conduction in metal bar', physics: { gravity: -9.81, temperature: 800, springStiffness: 50 }, domain: 'physics' },
    { input: 'Boiling water at 100 celsius', physics: { gravity: -9.81, temperature: 373, viscosity: 0.3 }, domain: 'chemistry' },
    { input: 'Absolute zero behavior', physics: { gravity: 0, temperature: 0.01, damping: 0.9999 }, domain: 'physics' },
    // Electromagnetism
    { input: 'Electric field between parallel plates', physics: { gravity: 0, electricFieldY: 5, chargeStrength: 8 }, domain: 'electromagnetism' },
    { input: 'Coulomb force between two charges', physics: { gravity: 0, chargeStrength: 10, damping: 0.99 }, domain: 'electromagnetism' },
    { input: 'PN junction semiconductor', physics: { gravity: 0, chargeStrength: 5, electricFieldX: -3 }, domain: 'electromagnetism' },
    { input: 'MOSFET transistor gate control', physics: { gravity: 0, chargeStrength: 5, electricFieldX: -3, gateVoltage: 0 }, domain: 'electromagnetism' },
    // Astronomy
    { input: 'Mars surface with rover', physics: { gravity: -3.72, temperature: 210, damping: 0.97 }, domain: 'astronomy' },
    { input: 'Jupiter atmosphere vortex', physics: { gravity: -24.79, turbulence: 8, windX: 15 }, domain: 'astronomy' },
    { input: 'Comet approaching the sun', physics: { gravity: 0, temperature: 200, windX: -5 }, domain: 'astronomy' },
    { input: 'Black hole accretion disk', physics: { gravity: 0, damping: 0.999, turbulence: 3 }, domain: 'astronomy' },
    // Biology
    { input: 'DNA double helix structure', physics: { gravity: 0, temperature: 310, viscosity: 0.5, springStiffness: 30 }, domain: 'biology' },
    { input: 'Protein folding process', physics: { gravity: 0, temperature: 310, viscosity: 0.5, springStiffness: 20 }, domain: 'biology' },
    { input: 'Cell membrane dynamics', physics: { gravity: 0, temperature: 310, viscosity: 1.0 }, domain: 'biology' },
    { input: 'Blood flow in artery', physics: { gravity: -9.81, temperature: 310, viscosity: 3.0 }, domain: 'biology' },
    // Chemistry
    { input: 'Crystal lattice formation', physics: { gravity: 0, springStiffness: 40, temperature: 293 }, domain: 'chemistry' },
    { input: 'Water molecule hydrogen bonding', physics: { gravity: 0, springStiffness: 25, temperature: 293 }, domain: 'chemistry' },
    // Earth Science
    { input: 'Earthquake magnitude 7', physics: { gravity: -9.81, seismic: 7, seismicFreq: 3 }, domain: 'earth_science' },
    { input: 'Tornado formation', physics: { gravity: -0.5, windX: 12, windZ: 8, turbulence: 8 }, domain: 'earth_science' },
    { input: 'Volcanic eruption with lava flow', physics: { gravity: -9.81, temperature: 1500, viscosity: 8 }, domain: 'earth_science' },
];

// Generate Korean versions too
const koVersions = [
    { input: '10미터 자유낙하', en: 'Free fall from 10 meters' },
    { input: '45도 포물선 운동', en: 'Projectile motion at 45 degrees' },
    { input: '1미터 줄의 단진자', en: 'Simple pendulum with 1 meter string' },
    { input: '탄성 충돌', en: 'Elastic collision between two balls' },
    { input: '빗면에서의 마찰', en: 'Friction on an inclined plane' },
    { input: '끓는 물 100도', en: 'Boiling water at 100 celsius' },
    { input: '전기장 평행판', en: 'Electric field between parallel plates' },
    { input: 'PN 접합 반도체', en: 'PN junction semiconductor' },
    { input: 'MOSFET 트랜지스터', en: 'MOSFET transistor gate control' },
    { input: '화성 표면 탐사', en: 'Mars surface with rover' },
    { input: '목성 대기 소용돌이', en: 'Jupiter atmosphere vortex' },
    { input: 'DNA 이중나선 구조', en: 'DNA double helix structure' },
    { input: '단백질 접힘 과정', en: 'Protein folding process' },
    { input: '혈관 혈류 시뮬레이션', en: 'Blood flow in artery' },
    { input: '결정 격자 구조', en: 'Crystal lattice formation' },
    { input: '지진 규모 7', en: 'Earthquake magnitude 7' },
    { input: '토네이도 형성', en: 'Tornado formation' },
    { input: '화산 폭발 용암 흐름', en: 'Volcanic eruption with lava flow' },
];

let currCount = 0;
for (const item of curriculum) {
    const simulation = {
        prompt: 'custom',
        title: item.input,
        domain: item.domain,
        physics: { ...{ gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000, temperature: 293, density: 2.4, viscosity: 0, friction: 0.8, bounciness: 0.3 }, ...item.physics },
    };

    lines.push({
        instruction: 'Generate a physics simulation JSON for the following scenario.',
        input: item.input,
        output: '```json\n' + JSON.stringify({ simulation }, null, 2) + '\n```',
    });
    currCount++;
}

// Korean versions
for (const ko of koVersions) {
    const en = curriculum.find(c => c.input === ko.en);
    if (!en) continue;
    const simulation = {
        prompt: 'custom',
        title: ko.input,
        domain: en.domain,
        physics: { ...{ gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000, temperature: 293, density: 2.4, viscosity: 0, friction: 0.8, bounciness: 0.3 }, ...en.physics },
    };

    lines.push({
        instruction: '다음 시나리오에 대한 물리 시뮬레이션 JSON을 생성하세요.',
        input: ko.input,
        output: '```json\n' + JSON.stringify({ simulation }, null, 2) + '\n```',
    });
    currCount++;
}

console.log(`Source 3 (Curriculum): ${currCount} pairs`);

// ═══════════════════════════════════════════
// Write JSONL
// ═══════════════════════════════════════════

const jsonl = lines.map(l => JSON.stringify(l)).join('\n');
writeFileSync('data/training-data.jsonl', jsonl);

console.log(`\nTotal: ${lines.length} training pairs`);
console.log(`Output: data/training-data.jsonl (${(jsonl.length / 1024).toFixed(0)} KB)`);
