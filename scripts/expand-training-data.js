/**
 * Expand training data using Gemma 4 31B (local Ollama)
 * Generates additional scenario→JSON pairs from physics curriculum topics
 *
 * Run: node scripts/expand-training-data.js
 * Requires: Ollama running with gemma4:31b
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'gemma4:31b';
const OUTPUT = 'data/training-data.jsonl';

// Physics topics to generate training pairs for
const TOPICS = [
    // Mechanics (30)
    '자유낙하 실험 10m 높이', 'Free fall experiment from 50 meters',
    '45도 포물선 운동 초속 20m/s', 'Projectile at 30 degrees with 15 m/s',
    '이중 진자 운동', 'Double pendulum chaos simulation',
    '마찰력이 있는 빗면 30도', 'Inclined plane 45 degrees with friction',
    '용수철 진동 실험', 'Spring oscillation with damping',
    '원운동 구심력', 'Circular motion centripetal force',
    '관성 모멘트 회전', 'Moment of inertia rotation',
    '로켓 추진 시뮬레이션', 'Rocket propulsion thrust',
    '진공에서 깃털과 볼링공 낙하', 'Feather and bowling ball in vacuum',
    '탄성 충돌 2개 공', 'Elastic collision two spheres',
    '비탄성 충돌', 'Perfectly inelastic collision',
    '경사면 미끄러짐', 'Sliding down frictionless ramp',
    '회전하는 팽이', 'Spinning top gyroscope',
    '도르래 시스템', 'Pulley system with weights',
    '감쇠 진동', 'Damped harmonic oscillation',

    // Waves & Optics (20)
    '횡파 전파', 'Transverse wave propagation',
    '종파 압축파', 'Longitudinal compression wave',
    '정상파 패턴', 'Standing wave on string',
    '이중 슬릿 간섭', 'Young double slit experiment',
    '빛의 굴절 프리즘', 'Light refraction through prism',
    '음파 도플러 효과', 'Doppler effect ambulance siren',
    '공명 현상', 'Resonance frequency bridge',
    '렌즈 초점 시뮬레이션', 'Convex lens focal point',
    '회절 격자', 'Diffraction grating pattern',
    '전반사 광섬유', 'Total internal reflection fiber optic',

    // Thermodynamics (15)
    '이상기체 팽창 과정', 'Ideal gas adiabatic expansion',
    '열전도 금속 막대', 'Heat conduction copper rod',
    '물의 상전이 얼음→물→수증기', 'Water phase transition ice to steam',
    '카르노 엔진 사이클', 'Carnot engine cycle',
    '브라운 운동 입자', 'Brownian motion particles',
    '열복사 흑체', 'Blackbody radiation spectrum',
    '단열 팽창', 'Adiabatic expansion cooling',

    // Electromagnetism (20)
    '쿨롱 힘 양전하 반발', 'Coulomb repulsion positive charges',
    '평행판 축전기 전기장', 'Parallel plate capacitor E-field',
    '도선의 전류 흐름', 'Current flow through conductor',
    'PN 접합 다이오드', 'PN junction diode forward bias',
    'MOSFET 게이트 제어', 'MOSFET gate voltage control',
    '솔레노이드 자기장', 'Solenoid magnetic field',
    '패러데이 전자기 유도', 'Faraday electromagnetic induction',
    '전자기파 전파', 'Electromagnetic wave propagation',
    'RC 회로 충방전', 'RC circuit charge discharge',
    'LED 발광 원리', 'LED light emission mechanism',

    // Astronomy (15)
    '달 표면 중력 걷기', 'Walking on Moon surface gravity',
    '화성 먼지 폭풍', 'Mars dust storm simulation',
    '목성 대적점 소용돌이', 'Jupiter Great Red Spot vortex',
    '토성 고리 구조', 'Saturn ring particle dynamics',
    '태양풍 입자', 'Solar wind particle stream',
    '성운 가스 분포', 'Nebula gas distribution',
    '중성자별 자전', 'Neutron star rotation pulsar',

    // Biology (15)
    'DNA 복제 과정', 'DNA replication fork',
    '단백질 접힘 미스폴딩', 'Protein misfolding prion',
    '세포 분열 유사분열', 'Cell mitosis division',
    '적혈구 산소 운반', 'Red blood cell oxygen transport',
    '뉴런 시냅스 전달', 'Neuron synapse signal transmission',
    '바이러스 감염 세포', 'Virus infecting cell membrane',
    '광합성 엽록체', 'Photosynthesis chloroplast',

    // Chemistry (15)
    '나트륨 클로라이드 결정', 'NaCl crystal lattice formation',
    '물 분자 수소결합', 'Water hydrogen bonding network',
    '화학 반응 촉매', 'Catalytic reaction mechanism',
    '버블 핵생성', 'Bubble nucleation boiling',
    '전기분해 물 분리', 'Electrolysis water splitting',
    '중합 반응 폴리머', 'Polymerization chain reaction',
    '산화 환원 전지', 'Redox reaction battery',

    // Earth Science (10)
    '판 구조론 충돌', 'Tectonic plate collision',
    '해류 순환', 'Ocean current circulation',
    '대기 대류', 'Atmospheric convection cell',
    '쓰나미 전파', 'Tsunami wave propagation',
    '화산재 분출', 'Volcanic ash eruption plume',

    // Materials (10)
    '탄소나노튜브 구조', 'Carbon nanotube structure',
    '그래핀 시트 물성', 'Graphene sheet properties',
    '초전도체 마이스너 효과', 'Superconductor Meissner effect',
    '형상기억합금 변형', 'Shape memory alloy transformation',
    '에어로겔 단열', 'Aerogel thermal insulation',
];

const SYSTEM_PROMPT = `You are a physics simulation JSON generator. For the given scenario, output ONLY a valid JSON block.

MANDATORY format:
\`\`\`json
{"simulation":{"prompt":"custom","title":"...","domain":"physics|chemistry|biology|astronomy|earth_science|engineering|mathematics|electromagnetism","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"temperature":293,"density":2.4,"viscosity":0,"friction":0.8,"bounciness":0.3,"windX":0,"turbulence":0,"seismic":0,"electricFieldX":0,"chargeStrength":0,"gateVoltage":1}}}
\`\`\`

Rules:
- Molecular/nano scale: gravity=0
- Earth surface: gravity=-9.81
- Moon: gravity=-1.62, Mars: -3.72, Jupiter: -24.79
- Use SI units for all values
- domain must be one of: physics, chemistry, biology, astronomy, earth_science, engineering, mathematics, electromagnetism
- Output ONLY the JSON block, no other text`;

async function generate(prompt) {
    try {
        const res = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                options: { temperature: 0.2 }
            }),
        });
        const data = await res.json();
        const text = data.message?.content || '';

        // Extract JSON
        const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*"simulation"[\s\S]*\}/);
        if (!match) return null;

        let jsonStr = match[1] || match[0];
        // Repair common issues
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');

        const parsed = JSON.parse(jsonStr);
        const sim = parsed.simulation || parsed;
        if (!sim.physics) return null;

        return {
            instruction: prompt.match(/[\uAC00-\uD7AF]/)
                ? '다음 시나리오에 대한 물리 시뮬레이션 JSON을 생성하세요.'
                : 'Generate a physics simulation JSON for the following scenario.',
            input: prompt,
            output: '```json\n' + JSON.stringify({ simulation: sim }, null, 2) + '\n```',
        };
    } catch (e) {
        return null;
    }
}

async function run() {
    console.log(`Expanding training data with ${TOPICS.length} topics using ${MODEL}...`);
    console.log(`Existing data: ${readFileSync(OUTPUT, 'utf8').split('\n').filter(Boolean).length} pairs`);

    let added = 0, failed = 0;

    for (let i = 0; i < TOPICS.length; i++) {
        const topic = TOPICS[i];
        process.stdout.write(`[${i+1}/${TOPICS.length}] ${topic.slice(0, 40)}... `);

        const result = await generate(topic);
        if (result) {
            appendFileSync(OUTPUT, '\n' + JSON.stringify(result));
            added++;
            console.log('OK');
        } else {
            failed++;
            console.log('FAIL');
        }
    }

    const total = readFileSync(OUTPUT, 'utf8').split('\n').filter(Boolean).length;
    console.log(`\nDone: +${added} added, ${failed} failed`);
    console.log(`Total training pairs: ${total}`);
}

run().catch(console.error);
