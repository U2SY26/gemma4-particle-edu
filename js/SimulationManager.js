/**
 * SimulationManager
 * Handles simulation card CRUD, sidebar UI, physics parameter binding,
 * AI chat interface, and server communication.
 */
import { t, tPreset } from './i18n.js';

const API_BASE = '';  // Same origin
// URL param ?model=gemma4 → use Gemma 4 via Google AI Studio
const _urlModel = new URLSearchParams(window.location.search).get('model');
const AI_MODEL = _urlModel || null;  // null = default (Gemini), 'gemma4' = Gemma 4 AI Studio

// Default physics template
const BASE_PHYSICS = {
    gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000,
    timeScale: 1.0, friction: 0.8, bounciness: 0.3,
    windX: 0, windY: 0, windZ: 0, turbulence: 0,
    viscosity: 0, temperature: 293,
    foundation: 5.0, density: 2.4, elasticity: 0.3, yieldStrength: 50,
    seismic: 0, seismicFreq: 2.0, snowLoad: 0, floodLevel: 0,
    electricFieldX: 0, electricFieldY: 0, electricFieldZ: 0,
    chargeStrength: 0, gateVoltage: 1,
};

const p = (overrides) => ({ ...BASE_PHYSICS, ...overrides });

// Domain-specific physics defaults — applied when Gemma 4 specifies a domain
const DOMAIN_PHYSICS = {
    physics:       { gravity: -9.81, damping: 0.97 },
    chemistry:     { gravity: 0, damping: 0.99, viscosity: 0.5 },
    biology:       { gravity: -2.0, damping: 0.95, viscosity: 1.0 },
    astronomy:     { gravity: 0, damping: 0.999, turbulence: 0.5 },
    earth_science: { gravity: -9.81, damping: 0.90 },
    engineering:   { gravity: -9.81, damping: 0.97 },
    mathematics:      { gravity: 0, damping: 0.999 },
    electromagnetism: { gravity: 0, damping: 0.99, chargeStrength: 5, electricFieldX: -3 },
};

// 138 real physical materials with SI-unit properties
// Sources: CRC Handbook, Engineering Toolbox, NIST databases
// density: kg/m³, gravity: m/s² (default env), temp: K (typical), springK: sim stiffness
const REFERENCE_MATERIALS = {
    // ══════ METALS (25) ══════
    steel:      { density: 7850, gravity: -9.81, temp: 293, springK: 55 },
    iron:       { density: 7874, gravity: -9.81, temp: 293, springK: 50 },
    aluminum:   { density: 2700, gravity: -9.81, temp: 293, springK: 40 },
    copper:     { density: 8960, gravity: -9.81, temp: 293, springK: 45 },
    titanium:   { density: 4506, gravity: -9.81, temp: 293, springK: 50 },
    gold:       { density: 19320, gravity: -9.81, temp: 293, springK: 30 },
    silver:     { density: 10490, gravity: -9.81, temp: 293, springK: 35 },
    platinum:   { density: 21450, gravity: -9.81, temp: 293, springK: 40 },
    tungsten:   { density: 19250, gravity: -9.81, temp: 293, springK: 80 },
    zinc:       { density: 7134, gravity: -9.81, temp: 293, springK: 35 },
    nickel:     { density: 8908, gravity: -9.81, temp: 293, springK: 45 },
    lead:       { density: 11340, gravity: -9.81, temp: 293, springK: 10 },
    tin:        { density: 7310, gravity: -9.81, temp: 293, springK: 20 },
    chromium:   { density: 7190, gravity: -9.81, temp: 293, springK: 55 },
    manganese:  { density: 7470, gravity: -9.81, temp: 293, springK: 45 },
    cobalt:     { density: 8900, gravity: -9.81, temp: 293, springK: 50 },
    lithium:    { density: 534, gravity: -9.81, temp: 293, springK: 5 },
    sodium:     { density: 971, gravity: -9.81, temp: 293, springK: 3 },
    mercury:    { density: 13546, gravity: -9.81, temp: 293, springK: 1, viscosity: 1.5 },
    brass:      { density: 8500, gravity: -9.81, temp: 293, springK: 40 },
    bronze:     { density: 8800, gravity: -9.81, temp: 293, springK: 42 },
    stainless_steel: { density: 8000, gravity: -9.81, temp: 293, springK: 55 },
    cast_iron:  { density: 7200, gravity: -9.81, temp: 293, springK: 35 },
    magnesium:  { density: 1738, gravity: -9.81, temp: 293, springK: 25 },
    cesium:     { density: 1930, gravity: -9.81, temp: 293, springK: 2 },
    // ══════ CONSTRUCTION (15) ══════
    concrete:   { density: 2400, gravity: -9.81, temp: 293, springK: 35 },
    wood:       { density: 700, gravity: -9.81, temp: 293, springK: 12 },
    limestone:  { density: 2700, gravity: -9.81, temp: 293, springK: 30 },
    stone:      { density: 2500, gravity: -9.81, temp: 293, springK: 35 },
    brick:      { density: 1900, gravity: -9.81, temp: 293, springK: 25 },
    glass:      { density: 2500, gravity: -9.81, temp: 293, springK: 15 },
    marble:     { density: 2700, gravity: -9.81, temp: 293, springK: 30 },
    granite:    { density: 2700, gravity: -9.81, temp: 293, springK: 40 },
    sandstone:  { density: 2300, gravity: -9.81, temp: 293, springK: 20 },
    slate:      { density: 2800, gravity: -9.81, temp: 293, springK: 35 },
    asphalt:    { density: 2360, gravity: -9.81, temp: 293, springK: 8 },
    plywood:    { density: 600, gravity: -9.81, temp: 293, springK: 10 },
    cement:     { density: 1500, gravity: -9.81, temp: 293, springK: 30 },
    fiberglass: { density: 2550, gravity: -9.81, temp: 293, springK: 25 },
    rebar:      { density: 7850, gravity: -9.81, temp: 293, springK: 55 },
    // ══════ POLYMERS (12) ══════
    rubber:     { density: 1100, gravity: -9.81, temp: 293, springK: 5 },
    plastic:    { density: 1100, gravity: -9.81, temp: 293, springK: 8 },
    nylon:      { density: 1140, gravity: -9.81, temp: 293, springK: 10 },
    polyethylene: { density: 950, gravity: -9.81, temp: 293, springK: 4 },
    pvc:        { density: 1400, gravity: -9.81, temp: 293, springK: 12 },
    polystyrene: { density: 1050, gravity: -9.81, temp: 293, springK: 15 },
    teflon:     { density: 2200, gravity: -9.81, temp: 293, springK: 2 },
    kevlar:     { density: 1440, gravity: -9.81, temp: 293, springK: 70 },
    epoxy:      { density: 1200, gravity: -9.81, temp: 293, springK: 20 },
    silicone:   { density: 1100, gravity: -9.81, temp: 293, springK: 3 },
    acrylic:    { density: 1180, gravity: -9.81, temp: 293, springK: 15 },
    foam:       { density: 30, gravity: -9.81, temp: 293, springK: 1 },
    // ══════ CERAMICS & MINERALS (10) ══════
    ceramic:    { density: 2500, gravity: -9.81, temp: 293, springK: 45 },
    diamond:    { density: 3515, gravity: -9.81, temp: 293, springK: 150 },
    quartz:     { density: 2650, gravity: -9.81, temp: 293, springK: 40 },
    sapphire:   { density: 3980, gravity: -9.81, temp: 293, springK: 80 },
    ruby:       { density: 4010, gravity: -9.81, temp: 293, springK: 80 },
    feldspar:   { density: 2560, gravity: -9.81, temp: 293, springK: 30 },
    gypsum:     { density: 2320, gravity: -9.81, temp: 293, springK: 10 },
    talc:       { density: 2750, gravity: -9.81, temp: 293, springK: 5 },
    ite:       { density: 3200, gravity: -9.81, temp: 293, springK: 45 },
    calcite:    { density: 2710, gravity: -9.81, temp: 293, springK: 25 },
    // ══════ FLUIDS (12) ══════
    water:      { density: 1000, gravity: -9.81, temp: 293, springK: 5, viscosity: 1.0 },
    seawater:   { density: 1025, gravity: -9.81, temp: 288, springK: 5, viscosity: 1.1 },
    oil:        { density: 900, gravity: -9.81, temp: 293, springK: 2, viscosity: 30 },
    ethanol:    { density: 789, gravity: -9.81, temp: 293, springK: 2, viscosity: 1.2 },
    glycerol:   { density: 1261, gravity: -9.81, temp: 293, springK: 2, viscosity: 1400 },
    acetone:    { density: 784, gravity: -9.81, temp: 293, springK: 1, viscosity: 0.3 },
    honey:      { density: 1420, gravity: -9.81, temp: 293, springK: 1, viscosity: 10 },
    lava:       { density: 2600, gravity: -9.81, temp: 1500, springK: 3, viscosity: 8 },
    mercury_liquid: { density: 13546, gravity: -9.81, temp: 293, springK: 1, viscosity: 1.5 },
    sulfuric_acid: { density: 1840, gravity: -9.81, temp: 293, springK: 2, viscosity: 2.5 },
    liquid_nitrogen: { density: 808, gravity: -9.81, temp: 77, springK: 1, viscosity: 0.2 },
    mud:        { density: 1600, gravity: -9.81, temp: 293, springK: 2, viscosity: 5 },
    // ══════ GASES (8) ══════
    air:        { density: 1.225, gravity: -9.81, temp: 293, springK: 1, viscosity: 0 },
    co2:        { density: 1.98, gravity: -9.81, temp: 293, springK: 1 },
    helium:     { density: 0.164, gravity: -9.81, temp: 293, springK: 1 },
    hydrogen:   { density: 0.082, gravity: -9.81, temp: 293, springK: 1 },
    oxygen:     { density: 1.429, gravity: -9.81, temp: 293, springK: 1 },
    nitrogen:   { density: 1.251, gravity: -9.81, temp: 293, springK: 1 },
    argon:      { density: 1.633, gravity: -9.81, temp: 293, springK: 1 },
    methane:    { density: 0.657, gravity: -9.81, temp: 293, springK: 1 },
    // ══════ EARTH / GEOLOGICAL (8) ══════
    sand:       { density: 1600, gravity: -9.81, temp: 293, springK: 3 },
    clay:       { density: 1750, gravity: -9.81, temp: 293, springK: 5 },
    soil:       { density: 1500, gravity: -9.81, temp: 293, springK: 3 },
    basalt:     { density: 3000, gravity: -9.81, temp: 293, springK: 50 },
    obsidian:   { density: 2600, gravity: -9.81, temp: 293, springK: 45 },
    pumice:     { density: 640, gravity: -9.81, temp: 293, springK: 5 },
    coal:       { density: 1350, gravity: -9.81, temp: 293, springK: 10 },
    regolith:   { density: 1500, gravity: -1.62, temp: 400, springK: 10 },
    // ══════ ICE & SNOW (3) ══════
    ice:        { density: 917, gravity: -9.81, temp: 273, springK: 30 },
    snow:       { density: 100, gravity: -9.81, temp: 273, springK: 1 },
    dry_ice:    { density: 1560, gravity: -9.81, temp: 195, springK: 15 },
    // ══════ BIOLOGY (15) ══════
    dna:        { density: 1700, gravity: 0, temp: 310, springK: 30, viscosity: 0.5 },
    protein:    { density: 1350, gravity: 0, temp: 310, springK: 20, viscosity: 0.5 },
    blood:      { density: 1060, gravity: -9.81, temp: 310, springK: 5, viscosity: 3 },
    cell:       { density: 1050, gravity: 0, temp: 310, springK: 8, viscosity: 1 },
    bacteria:   { density: 1100, gravity: -9.81, temp: 310, springK: 5 },
    lipid:      { density: 900, gravity: 0, temp: 310, springK: 3, viscosity: 2 },
    bone:       { density: 1900, gravity: -9.81, temp: 310, springK: 50 },
    muscle:     { density: 1060, gravity: -9.81, temp: 310, springK: 8 },
    collagen:   { density: 1300, gravity: -9.81, temp: 310, springK: 15 },
    keratin:    { density: 1300, gravity: -9.81, temp: 310, springK: 20 },
    chitin:     { density: 1400, gravity: -9.81, temp: 293, springK: 25 },
    cellulose:  { density: 1500, gravity: -9.81, temp: 293, springK: 20 },
    cartilage:  { density: 1100, gravity: -9.81, temp: 310, springK: 6 },
    hemoglobin: { density: 1335, gravity: 0, temp: 310, springK: 10 },
    neuron:     { density: 1040, gravity: 0, temp: 310, springK: 5, viscosity: 1 },
    // ══════ ORGANIC / FOOD (6) ══════
    wax:        { density: 900, gravity: -9.81, temp: 293, springK: 3 },
    sugar:      { density: 1590, gravity: -9.81, temp: 293, springK: 15 },
    salt:       { density: 2160, gravity: -9.81, temp: 293, springK: 20 },
    chocolate:  { density: 1300, gravity: -9.81, temp: 304, springK: 5 },
    starch:     { density: 1500, gravity: -9.81, temp: 293, springK: 8 },
    gelatin:    { density: 1270, gravity: -9.81, temp: 310, springK: 2, viscosity: 5 },
    // ══════ TEXTILES (5) ══════
    cotton:     { density: 1550, gravity: -9.81, temp: 293, springK: 8 },
    silk:       { density: 1340, gravity: -9.81, temp: 293, springK: 12 },
    wool:       { density: 1310, gravity: -9.81, temp: 293, springK: 6 },
    leather:    { density: 860, gravity: -9.81, temp: 293, springK: 10 },
    paper:      { density: 800, gravity: -9.81, temp: 293, springK: 5 },
    // ══════ ADVANCED / NANO (12) ══════
    graphene:   { density: 2267, gravity: 0, temp: 293, springK: 100 },
    aerogel:    { density: 100, gravity: 0, temp: 293, springK: 1 },
    silicon:    { density: 2329, gravity: -9.81, temp: 293, springK: 40 },
    carbon:     { density: 2260, gravity: 0, temp: 293, springK: 50 },
    carbon_nanotube: { density: 1600, gravity: 0, temp: 293, springK: 120 },
    superconductor:  { density: 6300, gravity: -9.81, temp: 77, springK: 45 },
    ferrofluid: { density: 1300, gravity: -9.81, temp: 293, springK: 5, viscosity: 3 },
    nitinol:    { density: 6450, gravity: -9.81, temp: 373, springK: 30 },
    perovskite: { density: 5100, gravity: -9.81, temp: 293, springK: 25 },
    metamaterial: { density: 1000, gravity: -9.81, temp: 293, springK: 10 },
    piezoelectric: { density: 7500, gravity: -9.81, temp: 293, springK: 40 },
    semiconductor: { density: 2329, gravity: -9.81, temp: 293, springK: 40 },
    // ══════ ASTRONOMY (7) ══════
    plasma:     { density: 1025, gravity: 0, temp: 5778, springK: 2, viscosity: 0 },
    photon:     { density: 0, gravity: 0, temp: 2.7, springK: 1 },
    dark_matter: { density: 0, gravity: 0, temp: 2.7, springK: 1 },
    comet_ice:  { density: 600, gravity: 0, temp: 150, springK: 10 },
    nebula_gas: { density: 0.001, gravity: 0, temp: 10000, springK: 1 },
    stellar_plasma: { density: 1400, gravity: -274, temp: 5778, springK: 2 },
    neutron_star: { density: 1e17, gravity: -1e12, temp: 1e6, springK: 100 },
}; // 138 materials total

// Build reference string for LLM system prompt injection
const MATERIAL_REFERENCE_TABLE = Object.entries(REFERENCE_MATERIALS)
    .filter(([k]) => /^[a-z]/.test(k)) // English materials only for prompt
    .map(([k, v]) => `${k}: density=${v.density}, gravity=${v.gravity}, temp=${v.temp}K, springK=${v.springK}${v.viscosity ? ', viscosity=' + v.viscosity : ''}`)
    .join('\n');

// Default physics presets for quick card creation
const PRESETS = [
    // ========== BUILDINGS ==========
    { name: '1층 주택',         prompt: 'house',                tags: ['building', '1F'],     physics: p({ springStiffness: 18, foundation: 4 }) },
    { name: '2층 건물',         prompt: '2층 건물',              tags: ['building', '2F'],     physics: p({ springStiffness: 20, foundation: 5 }) },
    { name: '3층 건물',         prompt: '3층 건물',              tags: ['building', '3F'],     physics: p({ springStiffness: 22, foundation: 5 }) },
    { name: '5층 아파트',       prompt: '5층 건물',              tags: ['building', '5F'],     physics: p({ springStiffness: 25, foundation: 6 }) },
    { name: '10층 오피스',      prompt: '10층 건물',             tags: ['building', '10F'],    physics: p({ springStiffness: 30, foundation: 7 }) },
    { name: '20층 타워',        prompt: '20층 건물',             tags: ['building', 'high'],   physics: p({ springStiffness: 40, foundation: 8, density: 2.5 }) },
    { name: '강철 고층빌딩',     prompt: 'tall skyscraper',       tags: ['building', 'steel'],  physics: p({ springStiffness: 60, foundation: 9, density: 7.8, yieldStrength: 90, elasticity: 0.2 }) },
    { name: '목조 주택',        prompt: 'small house',           tags: ['building', 'wood'],   physics: p({ springStiffness: 12, foundation: 3, density: 0.6, yieldStrength: 20, elasticity: 0.5 }) },
    { name: '콘크리트 건물',     prompt: '5층 건물',              tags: ['building', 'concrete'], physics: p({ springStiffness: 35, foundation: 7, density: 2.4, yieldStrength: 45, elasticity: 0.15 }) },
    { name: '유리 건물',        prompt: '10층 건물',             tags: ['building', 'glass'],  physics: p({ springStiffness: 15, foundation: 6, density: 2.5, yieldStrength: 15, elasticity: 0.1 }) },
    { name: '지진 내진 건물',    prompt: '5층 건물',              tags: ['building', 'seismic'], physics: p({ springStiffness: 45, foundation: 9, seismic: 5, seismicFreq: 3.0, elasticity: 0.4 }) },
    { name: '약한 기초 건물',    prompt: '3층 건물',              tags: ['building', 'weak'],   physics: p({ springStiffness: 10, foundation: 1.5, density: 2.4, yieldStrength: 20 }) },

    // ========== BRIDGES ==========
    { name: '소형 인도교',       prompt: 'small bridge',          tags: ['bridge', 'small'],    physics: p({ springStiffness: 20, foundation: 4, density: 2.0 }) },
    { name: '중형 다리',        prompt: 'bridge',                tags: ['bridge', 'medium'],   physics: p({ springStiffness: 30, foundation: 6, density: 2.4 }) },
    { name: '대형 현수교',       prompt: 'large bridge',          tags: ['bridge', 'large'],    physics: p({ springStiffness: 40, foundation: 8, density: 7.8 }) },
    { name: '강풍 다리',        prompt: 'wide bridge',           tags: ['bridge', 'wind'],     physics: p({ springStiffness: 25, windX: 10, windZ: 3, turbulence: 4, foundation: 6 }) },
    { name: '강철 트러스교',     prompt: 'large bridge',          tags: ['bridge', 'steel'],    physics: p({ springStiffness: 55, foundation: 9, density: 7.8, yieldStrength: 85 }) },
    { name: '목재 다리',        prompt: 'small bridge',          tags: ['bridge', 'wood'],     physics: p({ springStiffness: 10, foundation: 3, density: 0.5, yieldStrength: 15, elasticity: 0.6 }) },
    { name: '지진 다리 테스트',  prompt: 'bridge',                tags: ['bridge', 'seismic'],  physics: p({ springStiffness: 30, seismic: 6, seismicFreq: 2.5, foundation: 7 }) },
    { name: '적설 다리',        prompt: 'bridge',                tags: ['bridge', 'snow'],     physics: p({ springStiffness: 28, snowLoad: 5, foundation: 6 }) },
    { name: '홍수 다리',        prompt: 'bridge',                tags: ['bridge', 'flood'],    physics: p({ springStiffness: 30, floodLevel: 4, viscosity: 1.5, foundation: 6 }) },
    { name: '약한 기초 다리',    prompt: 'bridge',                tags: ['bridge', 'weak'],     physics: p({ springStiffness: 15, foundation: 1.0, yieldStrength: 15 }) },

    // ========== TOWERS ==========
    { name: '전망 타워',        prompt: 'tall tower',            tags: ['tower', 'tall'],      physics: p({ springStiffness: 35, foundation: 7 }) },
    { name: '강풍 타워',        prompt: 'tower',                 tags: ['tower', 'wind'],      physics: p({ springStiffness: 15, windX: 12, windY: 3, windZ: -5, turbulence: 5 }) },
    { name: '지진 타워',        prompt: 'tower',                 tags: ['tower', 'seismic'],   physics: p({ springStiffness: 25, seismic: 7, seismicFreq: 4.0 }) },

    // ========== SPECIAL STRUCTURES ==========
    { name: '고딕 성당',        prompt: 'gothic cathedral',      tags: ['cathedral', 'gothic'], physics: p({ springStiffness: 25, foundation: 7, density: 2.6 }) },
    { name: '고전 사원',        prompt: 'classical temple',      tags: ['temple', 'classical'], physics: p({ springStiffness: 30, foundation: 8, density: 2.7 }) },
    { name: '미니어처 성',       prompt: 'small castle',          tags: ['castle', 'mini'],     physics: p({ springStiffness: 35, foundation: 8, particleCount: 15000 }) },
    { name: '거대 피라미드',     prompt: 'huge pyramid',          tags: ['pyramid', 'huge'],    physics: p({ springStiffness: 50, foundation: 10, density: 2.3, yieldStrength: 80 }) },
    { name: '경기장',           prompt: 'stadium',               tags: ['stadium', 'large'],   physics: p({ springStiffness: 22 }) },
    { name: '대형 돔',          prompt: 'large dome',            tags: ['dome', 'large'],      physics: p({ springStiffness: 28, foundation: 6 }) },
    { name: '아치 게이트',       prompt: '3 arch',               tags: ['arch', 'gate'],       physics: p({ springStiffness: 22 }) },
    { name: '성벽',             prompt: 'wide wall',             tags: ['wall', 'defense'],    physics: p({ springStiffness: 35, foundation: 8, density: 2.5 }) },

    // ========== WEATHER / ATMOSPHERIC PHYSICS ==========
    // Weather physics inspired by NVIDIA Earth-2 atmospheric modeling
    // Reference: https://developer.nvidia.com/earth-2
    // Atmospheric parameters derived from real physics:
    //   - Temperature: Kelvin (affects particle velocity via Boltzmann distribution)
    //   - Wind: m/s (pressure differential → particle drift)
    //   - Turbulence: Reynolds-number-inspired chaotic motion
    //   - Damping: viscous drag from air density at altitude
    //   - Gravity reduction: buoyancy effects in convective systems
    { name: '태풍 시뮬레이션',   prompt: 'tornado',               tags: ['weather', 'typhoon'],   physics: p({ gravity: -0.5, damping: 0.92, windX: 12, windZ: 8, turbulence: 8, viscosity: 0.3, temperature: 305, particleCount: 30000 }) },
    { name: '적란운 형성',       prompt: 'cloud',                 tags: ['weather', 'cloud'],     physics: p({ gravity: -0.2, damping: 0.98, windY: 5, turbulence: 3, viscosity: 0.5, temperature: 253, particleCount: 20000 }) },
    { name: '폭풍우',           prompt: 'rain',                  tags: ['weather', 'storm'],     physics: p({ gravity: -9.81, damping: 0.85, windX: 8, turbulence: 6, viscosity: 1.0, temperature: 288, particleCount: 25000 }) },
    { name: '눈보라',           prompt: 'rain',                  tags: ['weather', 'blizzard'],  physics: p({ gravity: -2.0, damping: 0.95, windX: 15, windZ: 10, turbulence: 7, viscosity: 0.1, temperature: 250, particleCount: 20000 }) },
    { name: '오로라',           prompt: 'magnet',                tags: ['weather', 'aurora'],    physics: p({ gravity: 0, damping: 0.995, windY: 2, turbulence: 1, viscosity: 0, temperature: 200, particleCount: 15000 }) },

    // ========== EXPERIMENTS ==========
    { name: '무중력 파티클',     prompt: 'sphere',                tags: ['zero-g', 'experiment'], physics: p({ gravity: 0, damping: 0.99, springStiffness: 5, bounciness: 0.9, friction: 0.1 }) },
    { name: '강한 중력',        prompt: 'cube',                  tags: ['gravity', 'heavy'],   physics: p({ gravity: -25, springStiffness: 8, bounciness: 0.1 }) },
    { name: '역중력',           prompt: 'pyramid',               tags: ['anti-gravity'],        physics: p({ gravity: 5, damping: 0.95, springStiffness: 10 }) },
    { name: '탄성 구조',        prompt: 'dome',                  tags: ['elastic', 'bouncy'],  physics: p({ springStiffness: 8, bounciness: 0.85, elasticity: 0.8, damping: 0.98, friction: 0.4 }) },
    { name: '점성 유체',        prompt: 'sphere',                tags: ['fluid', 'viscous'],   physics: p({ gravity: -4.0, damping: 0.85, springStiffness: 3, viscosity: 4.0, friction: 0.95, bounciness: 0.05, temperature: 350 }) },
    { name: '고온 플라즈마',     prompt: 'sphere',                tags: ['plasma', 'hot'],      physics: p({ gravity: 0.5, damping: 0.90, springStiffness: 2, particleCount: 30000, bounciness: 0.7, friction: 0.1, windY: 5, viscosity: 0.2, temperature: 4500 }) },
    { name: '극저온 동결',       prompt: 'cube',                  tags: ['cryo', 'frozen'],     physics: p({ temperature: 5, damping: 0.999, springStiffness: 50, friction: 0.99, bounciness: 0.01 }) },
    { name: '슬로우모션',       prompt: 'tower',                 tags: ['slow', 'cinematic'],  physics: p({ timeScale: 0.2, springStiffness: 20 }) },
    { name: '고속 시뮬',        prompt: 'tower',                 tags: ['fast', 'speed'],      physics: p({ timeScale: 3.0, springStiffness: 20 }) },

    // ========== ELECTROMAGNETISM ==========
    { name: 'MOSFET 트랜지스터', prompt: 'transistor',            tags: ['em', 'transistor'],   physics: p({ gravity: 0, damping: 0.99, electricFieldX: -3, chargeStrength: 5, gateVoltage: 0 }) },
    { name: '전기 회로',        prompt: 'circuit',               tags: ['em', 'circuit'],      physics: p({ gravity: 0, damping: 0.98, electricFieldX: -2, chargeStrength: 3, gateVoltage: 1 }) },
    { name: '전자기장',         prompt: 'magnet',                tags: ['em', 'field'],        physics: p({ gravity: 0, damping: 0.99, chargeStrength: 8, gateVoltage: 1 }) },

    // ========== EDUCATION CURRICULUM ==========
    // AP Physics / 물리 교과과정 연계
    { name: '자유낙하 실험',     prompt: 'sphere',                tags: ['edu', 'freefall'],    physics: p({ gravity: -9.81, damping: 0.999, springStiffness: 1, friction: 0, bounciness: 0.9 }) },
    { name: '포물선 운동',       prompt: 'sphere',                tags: ['edu', 'projectile'],  physics: p({ gravity: -9.81, damping: 0.999, windX: 3, springStiffness: 1, friction: 0 }) },
    { name: '진자 운동',         prompt: 'tower',                 tags: ['edu', 'pendulum'],    physics: p({ gravity: -9.81, damping: 0.998, springStiffness: 40, friction: 0.1 }) },
    { name: '충돌과 운동량',     prompt: 'cube',                  tags: ['edu', 'collision'],   physics: p({ gravity: -9.81, damping: 0.999, bounciness: 0.95, friction: 0.01 }) },
    { name: '파동과 간섭',       prompt: 'ocean_wave',            tags: ['edu', 'wave'],        physics: p({ gravity: -2.0, damping: 0.97, springStiffness: 15, viscosity: 0.3 }) },
    { name: '부력 실험',         prompt: 'sphere',                tags: ['edu', 'buoyancy'],    physics: p({ gravity: -9.81, damping: 0.95, floodLevel: 5, viscosity: 1.0, density: 1.0 }) },
    { name: '열역학 (팽창)',     prompt: 'cube',                  tags: ['edu', 'thermo'],      physics: p({ gravity: -9.81, damping: 0.97, temperature: 500, springStiffness: 15 }) },
    { name: '전기장과 전하',     prompt: 'electron_cloud',        tags: ['edu', 'efield'],      physics: p({ gravity: 0, damping: 0.99, electricFieldX: -5, chargeStrength: 8 }) },
    { name: '달 표면 중력',      prompt: 'sphere',                tags: ['edu', 'moon'],        physics: p({ gravity: -1.62, damping: 0.999, springStiffness: 1, friction: 0.5 }) },
    { name: '목성 대기',         prompt: 'cloud',                 tags: ['edu', 'jupiter'],     physics: p({ gravity: -24.79, damping: 0.92, turbulence: 5, windX: 10 }) },
];

export class SimulationManager {
    constructor(onCardSelect, onPhysicsChange) {
        this.cards = [];
        this.activeCardId = null;
        this.serverOnline = false;
        this._ollamaAvailable = false;
        this._aiAvailable = false;      // true if ANY provider (Ollama/Gemini/Claude) is online
        this._currentStreamText = '';    // accumulated streaming text across DAG steps
        this._chatHistory = [];
        this.onCardSelect = onCardSelect;       // callback(card)
        this.onPhysicsChange = onPhysicsChange; // callback(physicsParams)

        // Clear previous session data so each visit starts fresh
        localStorage.removeItem('sim-cards');
        localStorage.removeItem('sim-history');

        this._initUI();
        this._checkServer();
        this._loadCards();
        this._loadBenchmarkCatalog();
    }

    // ==================== SERVER ====================

    async _checkServer() {
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            if (res.ok) {
                this.serverOnline = true;
                document.getElementById('server-dot').classList.add('online');
                document.getElementById('server-label').textContent = t('online');
                this._loadHistory();

                // Check providers from the status response
                const data = await res.json();
                const ollamaInfo = data.ollama || {};
                const providers = data.providers || {};
                this._ollamaAvailable = ollamaInfo.ollama === true && ollamaInfo.model !== null;
                this._aiAvailable = this._ollamaAvailable || !!providers.gemini || !!providers.claude;

                // Determine the active provider label
                if (this._ollamaAvailable) {
                    document.getElementById('server-label').textContent = t('serverGemma4');
                    this._removeOfflineBanner();
                } else if (AI_MODEL === 'gemma4' && providers.gemini) {
                    document.getElementById('server-label').textContent = t('serverGemma4') + ' (AI Studio)';
                    this._removeOfflineBanner();
                } else if (providers.gemini) {
                    document.getElementById('server-label').textContent = t('serverGemini');
                    this._removeOfflineBanner();
                } else if (providers.claude) {
                    document.getElementById('server-label').textContent = t('serverClaude');
                    this._removeOfflineBanner();
                } else {
                    this._showOfflineBanner();
                }
            } else {
                this._showOfflineBanner();
            }
        } catch (err) {
            console.warn('[Server] Connection check failed:', err.message || err);
            this.serverOnline = false;
            this._ollamaAvailable = false;
            this._showOfflineBanner();
        }
    }

    _showOfflineBanner() {
        const serverLabel = document.getElementById('server-label');
        if (serverLabel && !this._ollamaAvailable) {
            serverLabel.textContent = t('offline');
            serverLabel.style.color = 'var(--accent-red)';
        }
        // Add inline banner in chat area if not already present
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer && !chatContainer.querySelector('.ai-offline-banner')) {
            const banner = document.createElement('div');
            banner.className = 'ai-offline-banner';
            banner.setAttribute('data-i18n', 'aiOffline');
            banner.textContent = t('aiOffline');
            chatContainer.insertBefore(banner, chatContainer.firstChild);
        }
    }

    _removeOfflineBanner() {
        const banner = document.querySelector('.ai-offline-banner');
        if (banner) banner.remove();
    }

    // ==================== CARDS CRUD ====================

    async _loadCards() {
        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`);
                if (!res.ok) throw new Error('Server returned ' + res.status);
                this.cards = await res.json();
            } catch (err) {
                console.warn('[Cards] Failed to load cards from server, trying localStorage:', err.message || err);
                // localStorage fallback for Vercel static deploy
                try {
                    this.cards = JSON.parse(localStorage.getItem('sim-cards') || '[]');
                } catch (e) {
                    console.warn('[Cards] localStorage fallback failed:', e.message || e);
                    this.cards = [];
                }
            }
        } else {
            // Offline -- try localStorage
            try {
                this.cards = JSON.parse(localStorage.getItem('sim-cards') || '[]');
            } catch (err) {
                console.warn('[Cards] localStorage load failed:', err.message || err);
                this.cards = [];
            }
        }

        // If no cards (first run or offline), create from presets
        if (this.cards.length === 0) {
            this.cards = PRESETS.map((p, i) => ({
                id: `preset-${i}`,
                name: p.name,
                prompt: p.prompt,
                tags: p.tags,
                physics: { ...p.physics },
                chat: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
            }));

            // Save to server if online
            if (this.serverOnline) {
                for (const card of this.cards) {
                    try {
                        const res = await fetch(`${API_BASE}/api/cards`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(card),
                        });
                        if (!res.ok) throw new Error('Server returned ' + res.status);
                        const saved = await res.json();
                        card.id = saved.id; // Use server-assigned ID
                    } catch (err) {
                        console.warn('[Cards] Failed to save preset card to server:', err.message || err);
                    }
                }
            }

            // Always persist to localStorage as fallback
            this._saveCardsLocal();
        }

        this._renderCardList();

        // Auto-select first card
        if (this.cards.length > 0) {
            this.selectCard(this.cards[0].id);
        }
    }

    _saveCardsLocal() {
        try {
            localStorage.setItem('sim-cards', JSON.stringify(this.cards));
        } catch (err) {
            // localStorage save failure is non-critical
            console.warn('[Cards] localStorage save failed:', err.message || err);
        }
    }

    async createCard(name, prompt, physics) {
        const card = {
            id: `local-${Date.now()}`,
            name: name || 'New Simulation',
            prompt: prompt || '',
            tags: [],
            physics: physics || { ...PRESETS[0].physics },
            chat: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
        };

        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
                if (!res.ok) throw new Error('Server returned ' + res.status);
                const saved = await res.json();
                card.id = saved.id;
            } catch (err) {
                console.warn('[Cards] Failed to create card on server:', err.message || err);
            }
        }

        this.cards.unshift(card);
        this._saveCardsLocal();
        this._renderCardList();
        this.selectCard(card.id);
        return card;
    }

    async deleteCard(id) {
        this.cards = this.cards.filter(c => c.id !== id);
        if (this.serverOnline) {
            try { await fetch(`${API_BASE}/api/cards/${id}`, { method: 'DELETE' }); } catch (err) {
                console.warn('[Cards] Failed to delete card on server:', err.message || err);
            }
        }
        this._saveCardsLocal();

        if (this.activeCardId === id) {
            this.activeCardId = null;
            document.getElementById('card-detail').classList.add('hidden');
            if (this.cards.length > 0) this.selectCard(this.cards[0].id);
        }
        this._renderCardList();
    }

    async duplicateCard(id) {
        const original = this.cards.find(c => c.id === id);
        if (!original) return;
        await this.createCard(
            original.name + ' (copy)',
            original.prompt,
            { ...original.physics }
        );
    }

    async updateCard(id, updates) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;
        Object.assign(card, updates, { updatedAt: new Date().toISOString() });

        if (this.serverOnline) {
            try {
                await fetch(`${API_BASE}/api/cards/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
            } catch (err) {
                console.warn('[Cards] Failed to update card on server:', err.message || err);
            }
        }
        this._saveCardsLocal();
    }

    // ==================== CARD SELECTION ====================

    selectCard(id) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;

        this.activeCardId = id;

        // Update active styling
        document.querySelectorAll('.sim-card').forEach(el => el.classList.remove('active'));
        const cardEl = document.querySelector(`.sim-card[data-id="${id}"]`);
        if (cardEl) cardEl.classList.add('active');

        // Show detail panel
        document.getElementById('card-detail').classList.remove('hidden');

        // Update physics sliders
        this._syncPhysicsUI(card.physics);

        // Update chat messages
        this._renderChat(card.chat);

        // Update prompt input
        document.getElementById('prompt-input').value = card.prompt;

        // Notify app
        if (this.onCardSelect) this.onCardSelect(card);
    }

    getActiveCard() {
        return this.cards.find(c => c.id === this.activeCardId) || null;
    }

    // ==================== UI RENDERING ====================

    _renderCardList() {
        const list = document.getElementById('card-list');
        list.innerHTML = '';

        for (const card of this.cards) {
            const el = document.createElement('div');
            el.className = `sim-card${card.id === this.activeCardId ? ' active' : ''}`;
            el.dataset.id = card.id;

            const tagsHtml = (card.tags || [])
                .map(t => `<span class="card-tag">${t}</span>`)
                .join('');

            const timeAgo = this._timeAgo(card.updatedAt);

            const displayName = tPreset(card.name) || card.name;
            el.innerHTML = `
                <div class="card-name">${this._escapeHtml(displayName)}</div>
                <div class="card-prompt">${this._escapeHtml(card.prompt || 'No prompt')}</div>
                <div class="card-meta">
                    <div class="card-tags">${tagsHtml}</div>
                    <span>${timeAgo}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn dup" title="Duplicate">&#9851;</button>
                    <button class="card-action-btn delete" title="Delete">&times;</button>
                </div>
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.card-action-btn')) return;
                this.selectCard(card.id);
            });

            el.querySelector('.dup').addEventListener('click', () => this.duplicateCard(card.id));
            el.querySelector('.delete').addEventListener('click', () => this.deleteCard(card.id));

            list.appendChild(el);
        }
    }

    // ==================== BENCHMARK CATALOG (300 scenarios) ====================

    async _loadBenchmarkCatalog() {
        try {
            const res = await fetch('/data/benchmark-300.json');
            if (!res.ok) return;
            const data = await res.json();
            this._benchmarkScenarios = data.scenarios || [];
            this._renderBenchmarkCatalog(this._benchmarkScenarios);

            // Setup UI
            const section = document.getElementById('benchmark-section');
            if (section) section.style.display = '';

            const header = document.getElementById('benchmark-header');
            const body = document.getElementById('benchmark-body');
            const toggle = document.getElementById('benchmark-toggle');
            if (header && body) {
                header.addEventListener('click', () => {
                    const open = body.style.display !== 'none';
                    body.style.display = open ? 'none' : '';
                    if (toggle) toggle.textContent = open ? '▼' : '▲';
                });
            }

            // Search
            const search = document.getElementById('benchmark-search');
            if (search) {
                search.addEventListener('input', () => {
                    const q = search.value.toLowerCase().trim();
                    const filtered = q
                        ? this._benchmarkScenarios.filter(s =>
                            s.title.toLowerCase().includes(q) ||
                            (s.material || '').toLowerCase().includes(q))
                        : this._benchmarkScenarios;
                    this._renderBenchmarkCatalog(filtered);
                });
            }
        } catch (err) {
            console.warn('[Benchmark] Failed to load catalog:', err.message || err);
        }
    }

    _renderBenchmarkCatalog(scenarios) {
        const list = document.getElementById('benchmark-list');
        if (!list) return;
        list.innerHTML = '';

        for (const s of scenarios) {
            const el = document.createElement('div');
            el.style.cssText = 'padding:6px 8px;margin:2px 0;border-radius:4px;cursor:pointer;font-size:11px;transition:background 0.15s;border-left:2px solid transparent';
            el.onmouseenter = () => { el.style.background = 'rgba(88,166,255,0.08)'; el.style.borderLeftColor = 'var(--accent-blue)'; };
            el.onmouseleave = () => { el.style.background = ''; el.style.borderLeftColor = 'transparent'; };

            const stars = '★'.repeat(s.stars || 5) + '☆'.repeat(5 - (s.stars || 5));
            const accColor = s.accuracy === 100 ? 'var(--accent-green)' : s.accuracy >= 80 ? 'var(--accent-yellow)' : 'var(--accent-red)';

            const pdfId = String(s.id).padStart(3, '0');
            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                    <span style="font-weight:500;color:var(--text-primary);flex:1">#${s.id} ${this._escapeHtml(s.title)}</span>
                    <a href="/docs/benchmarks/bench-${pdfId}.pdf" target="_blank" class="bench-pdf-btn" title="PDF 보고서 보기" style="font-size:10px;color:var(--accent-blue);text-decoration:none;padding:2px 6px;border:1px solid rgba(88,166,255,0.3);border-radius:3px;white-space:nowrap">📄 PDF</a>
                </div>
                <div style="display:flex;gap:8px;color:var(--text-secondary);font-size:10px">
                    <span>${this._escapeHtml(s.material || '')}</span>
                    <span style="color:${accColor}">${s.accuracy}%</span>
                    <span style="color:var(--accent-yellow)">${stars}</span>
                </div>
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.bench-pdf-btn')) return; // Don't trigger sim on PDF click
                this._applyBenchmarkScenario(s);
            });
            list.appendChild(el);
        }
    }

    async _applyBenchmarkScenario(scenario) {
        // Parse physics from benchmark data
        const parseNum = (str) => {
            if (!str) return null;
            const m = String(str).match(/-?[\d.]+(?:e[+-]?\d+)?/i);
            return m ? parseFloat(m[0]) : null;
        };

        const density = parseNum(scenario.density);
        const gravity = parseNum(scenario.gravity);
        const temp = parseNum(scenario.temperature);

        // Look up reference material physics
        const matKey = (scenario.material || '').toLowerCase();
        const reference = REFERENCE_MATERIALS[matKey] || {};

        const physics = {
            ...BASE_PHYSICS,
            gravity: gravity ?? reference.gravity ?? -9.81,
            density: density ? density / 1000 : (reference.density ? reference.density / 1000 : 2.4),
            temperature: temp ?? reference.temp ?? 293,
            springStiffness: reference.springK ?? 20,
            viscosity: reference.viscosity ?? 0,
            particleCount: scenario.particles || 25000,
        };

        // Map title keywords to prompt type
        const title = scenario.title.toLowerCase();
        let prompt = 'custom';
        const keywordMap = {
            '피라미드': 'pyramid', 'pyramid': 'pyramid', '타워': 'tower', 'tower': 'tower',
            '다리': 'bridge', 'bridge': 'bridge', '돔': 'dome', 'dome': 'dome',
            '성당': 'cathedral', 'cathedral': 'cathedral', '사원': 'temple', 'temple': 'temple',
            '성': 'castle', 'castle': 'castle', '경기장': 'stadium', 'stadium': 'stadium',
            '아치': 'arch', 'arch': 'arch', '벽': 'wall', 'wall': 'wall',
            'dna': 'dna', '나선': 'dna', '태양계': 'solar_system', 'solar': 'solar_system',
            '분자': 'molecule', 'molecule': 'molecule', '은하': 'galaxy', 'galaxy': 'galaxy',
            '블랙홀': 'sphere', 'black hole': 'sphere', '토네이도': 'tornado', 'tornado': 'tornado',
            '구름': 'cloud', 'cloud': 'cloud', '비': 'rain', 'rain': 'rain',
            '자석': 'magnet', 'magnet': 'magnet', '전자': 'electron_cloud',
            '건물': 'house', 'building': 'house', '주택': 'house', 'house': 'house',
            '단백질': 'protein', 'protein': 'protein', '세포': 'sphere', 'cell': 'sphere',
        };

        for (const [kw, p] of Object.entries(keywordMap)) {
            if (title.includes(kw)) { prompt = p; break; }
        }

        // Create a new card from this benchmark
        await this.createCard(
            `🏆 ${scenario.title}`,
            prompt,
            physics
        );

        // Send title to AI chat for full DAG pipeline processing
        if (this._aiAvailable) {
            const card = this.getActiveCard();
            if (card) {
                const input = document.getElementById('chat-input');
                if (input) input.value = scenario.title;
                this._handleChatSubmit();
            }
        }
    }

    _renderChat(messages) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        const welcome = document.getElementById('welcome-suggestions');

        if (!messages || messages.length === 0) {
            // Show welcome suggestions when no messages
            if (welcome) welcome.style.display = '';
            return;
        }

        // Hide welcome suggestions once chat has messages
        if (welcome) welcome.style.display = 'none';

        for (const msg of messages) {
            const el = document.createElement('div');
            el.className = `chat-msg ${msg.role}`;
            el.textContent = msg.content;
            container.appendChild(el);
        }

        container.scrollTop = container.scrollHeight;
    }

    // ==================== PHYSICS UI SYNC ====================

    _syncPhysicsUI(physics) {
        const paramMap = {
            'param-gravity': physics.gravity,
            'param-damping': physics.damping,
            'param-springK': physics.springStiffness,
            'param-timeScale': physics.timeScale,
            'param-friction': physics.friction,
            'param-bounciness': physics.bounciness,
            'param-particles': physics.particleCount,
            'param-foundation': physics.foundation,
            'param-density': physics.density,
            'param-elasticity': physics.elasticity,
            'param-yieldStrength': physics.yieldStrength,
            'param-windX': physics.windX,
            'param-windY': physics.windY,
            'param-windZ': physics.windZ,
            'param-turbulence': physics.turbulence,
            'param-viscosity': physics.viscosity,
            'param-temperature': physics.temperature,
            'param-seismic': physics.seismic,
            'param-seismicFreq': physics.seismicFreq,
            'param-snowLoad': physics.snowLoad,
            'param-floodLevel': physics.floodLevel,
            'param-electricFieldX': physics.electricFieldX || 0,
            'param-electricFieldY': physics.electricFieldY || 0,
            'param-electricFieldZ': physics.electricFieldZ || 0,
            'param-chargeStrength': physics.chargeStrength || 0,
            'param-gateVoltage': physics.gateVoltage ?? 1,
        };

        for (const [id, val] of Object.entries(paramMap)) {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = val;
                const display = document.querySelector(`.param-value[data-for="${id}"]`);
                if (display) display.textContent = this._formatValue(id, val);
            }
        }
    }

    _getPhysicsFromUI() {
        const g = (id) => parseFloat(document.getElementById(id).value);
        return {
            gravity: g('param-gravity'),
            damping: g('param-damping'),
            springStiffness: g('param-springK'),
            timeScale: g('param-timeScale'),
            friction: g('param-friction'),
            bounciness: g('param-bounciness'),
            particleCount: parseInt(document.getElementById('param-particles').value),
            foundation: g('param-foundation'),
            density: g('param-density'),
            elasticity: g('param-elasticity'),
            yieldStrength: g('param-yieldStrength'),
            windX: g('param-windX'),
            windY: g('param-windY'),
            windZ: g('param-windZ'),
            turbulence: g('param-turbulence'),
            viscosity: g('param-viscosity'),
            temperature: g('param-temperature'),
            seismic: g('param-seismic'),
            seismicFreq: g('param-seismicFreq'),
            snowLoad: g('param-snowLoad'),
            floodLevel: g('param-floodLevel'),
            electricFieldX: g('param-electricFieldX'),
            electricFieldY: g('param-electricFieldY'),
            electricFieldZ: g('param-electricFieldZ'),
            chargeStrength: g('param-chargeStrength'),
            gateVoltage: g('param-gateVoltage'),
        };
    }

    _formatValue(id, val) {
        if (id === 'param-particles') return Math.round(val).toString();
        if (id === 'param-temperature') return Math.round(val).toString();
        return parseFloat(val).toFixed(2);
    }

    // ==================== CHAT ====================

    async addChatMessage(role, content) {
        const card = this.getActiveCard();
        if (!card) return;

        const msg = { role, content, timestamp: new Date().toISOString() };
        card.chat.push(msg);
        this._renderChat(card.chat);

        // Save to server — but only for cards that actually exist on the server.
        // `preset-*` and `local-*` IDs are client-side placeholders that never got
        // persisted (offline mode or failed sync) and would 404 the chat endpoint.
        const isClientOnlyCard = typeof card.id === 'string' &&
            (card.id.startsWith('preset-') || card.id.startsWith('local-'));
        if (this.serverOnline && !isClientOnlyCard) {
            try {
                await fetch(`${API_BASE}/api/cards/${card.id}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(msg),
                });
            } catch (err) {
                // Chat save failure is non-critical; log silently
                console.warn('[Chat] Failed to save message to server:', err.message || err);
            }
        }
        // Always persist cards to localStorage as fallback
        this._saveCardsLocal();

        return msg;
    }

    async _handleChatSubmit() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        this.addChatMessage('user', content);
        this._chatHistory.push({ role: 'user', content });

        // Clear any previous workflow container
        this._clearWorkflowContainer();

        try {
            // Try DAG agent workflow (5-step chain) for higher accuracy
            // Falls back to single-call _sendToOllama if DAG fails
            let ollamaResponse = null;
            if (this._aiAvailable) {
                ollamaResponse = await this._dagAgentWorkflow(content);
            }
            if (!ollamaResponse) {
                // Fallback to single-call
                this._showWorkflowStep(1, '📋', t('wfPlanning'), '단일 호출 모드...', 'running');
                ollamaResponse = await this._sendToOllama(content);
            }

            if (ollamaResponse) {
                this._showWorkflowStep(5, '✨', t('wfComplete'), '시뮬레이션 준비 완료', 'done');

                // Finalize streaming message into a permanent chat message
                this._finalizeStreamingMessage();
                this.addChatMessage('assistant', ollamaResponse);
                this._chatHistory.push({ role: 'assistant', content: ollamaResponse });

                // Step 2: Parameter Generation
                this._showWorkflowStep(2, '\uD83D\uDD27', 'Generating', '\uD30C\uB77C\uBBF8\uD130 \uCD94\uCD9C \uC911...', 'running');

                // Extract simulation parameters from Gemma response
                const simParams = this._extractSimParams(ollamaResponse);

                if (simParams) {
                    const groups = simParams.particles?.groups?.length || 0;
                    const count = simParams.physics?.particleCount || 25000;
                    this._showWorkflowStep(2, '\uD83D\uDD27', 'Generating',
                        `${groups > 0 ? groups + '\uAC1C \uADF8\uB8F9, ' : ''}${count.toLocaleString()}\uAC1C \uD30C\uD2F0\uD074 \uC124\uC815 \uC644\uB8CC`, 'done');

                    const card = this.getActiveCard();
                    if (card) {
                        // Step 3: Building Structure
                        this._showWorkflowStep(3, '\uD83C\uDFD7\uFE0F', t('wfBuilding'), '\uAD6C\uC870\uBB3C \uC0DD\uC131 \uC911...', 'running');

                        if (simParams.physics) {
                            Object.assign(card.physics, simParams.physics);
                            this._syncPhysicsUI(card.physics);
                            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                        }

                        // Store particle spec on card for universal pipeline
                        // Known built-in templates — prefer these over AI-generated particle groups
                        const _KNOWN_TEMPLATES = ['house','tower','bridge','dome','pyramid','cathedral','temple','castle','wall','stadium','arch','sphere','cube','molecule','dna','protein','solar_system','galaxy','asteroid_field','cloud','tornado','rain','water_drop','river','ocean_wave','magnet','electron_cloud','transistor','circuit','skyscraper'];
                        const _searchText = ((simParams.prompt || '') + ' ' + (simParams.title || '')).toLowerCase();
                        const _matchedTemplate = _KNOWN_TEMPLATES.find(t => _searchText.includes(t));

                        if (simParams.particles && !_matchedTemplate) {
                            // Custom particle spec — no built-in template match
                            card.particleSpec = simParams.particles;
                            card.prompt = simParams.prompt || 'custom';
                            if (simParams.title) card.name = simParams.title;
                            document.getElementById('prompt-input').value = card.prompt;
                            if (this.onCardSelect) this.onCardSelect(card);
                        } else if (_matchedTemplate || simParams.prompt) {
                            // Built-in template match found, or plain prompt — use template generator
                            card.particleSpec = null;
                            card.prompt = _matchedTemplate || simParams.prompt;
                            if (simParams.title) card.name = simParams.title;
                            document.getElementById('prompt-input').value = card.prompt;
                            if (this.onCardSelect) this.onCardSelect(card);
                        }

                        this._showWorkflowStep(3, '\uD83C\uDFD7\uFE0F', t('wfBuilding'),
                            `${simParams.title || simParams.prompt || 'custom'} \uAD6C\uC870 \uC0DD\uC131 \uC644\uB8CC`, 'done');

                        // Step 4: Rendering
                        this._showWorkflowStep(4, '\uD83C\uDFA8', 'Rendering', '3D \uC2DC\uAC01\uD654 \uC801\uC6A9 \uC911...', 'running');

                        // Short delay for visual effect
                        await new Promise(r => setTimeout(r, 500));

                        this._showWorkflowStep(4, '\uD83C\uDFA8', 'Rendering', '\uB124\uC628 \uBE14\uB8F8 \uB80C\uB354\uB9C1 \uC644\uB8CC', 'done');

                        // Step 5: Complete
                        this._showWorkflowStep(5, '\u2728', t('wfComplete'),
                            `"${simParams.title || simParams.prompt || 'simulation'}" \uC2DC\uBBAC\uB808\uC774\uC158 \uD65C\uC131\uD654!`, 'done');

                        // === Gemma 4 Self-QA Loop ===
                        // After building, collect actual simulation state and ask Gemma to verify
                        if (this._aiAvailable) {
                            await this._runSelfQA(content, simParams, card);
                        }

                        // Save to history
                        this._saveToHistory({
                            query: content,
                            title: simParams.title || simParams.prompt || 'Simulation',
                            domain: simParams.domain || 'general',
                            description: simParams.description || '',
                            prompt: simParams.prompt,
                            physics: card.physics,
                            particleSpec: simParams.particles || null,
                            aiResponse: ollamaResponse,
                            particleCount: card.physics.particleCount || 25000,
                        });
                    }
                } else {
                    this._showWorkflowStep(2, '\uD83D\uDD27', 'Generating', 'JSON \uD30C\uB77C\uBBF8\uD130 \uC5C6\uC74C \u2014 \uAE30\uBCF8 \uD504\uB9AC\uC14B \uC801\uC6A9', 'done');
                }
            } else {
                // NLP Fallback
                this._showWorkflowStep(1, '\uD83D\uDCCB', t('wfPlanning'), 'AI \uC624\uD504\uB77C\uC778 \u2014 \uD0A4\uC6CC\uB4DC \uBD84\uC11D \uBAA8\uB4DC', 'done');
                this._showWorkflowStep(2, '\uD83D\uDD27', 'Generating', '\uD0A4\uC6CC\uB4DC \uAE30\uBC18 \uD30C\uB77C\uBBF8\uD130 \uC0DD\uC131', 'running');

                // Fallback to keyword NLP
                const response = this._processNaturalLanguage(content);
                this.addChatMessage('assistant', response);
                this._chatHistory.push({ role: 'assistant', content: response });

                this._showWorkflowStep(2, '\uD83D\uDD27', 'Generating', '\uD0A4\uC6CC\uB4DC \uB9E4\uCE6D \uC644\uB8CC', 'done');
                this._showWorkflowStep(3, '\uD83C\uDFD7\uFE0F', t('wfBuilding'), '\uAD6C\uC870\uBB3C \uC0DD\uC131 \uC644\uB8CC', 'done');
                this._showWorkflowStep(4, '\uD83C\uDFA8', 'Rendering', '\uB80C\uB354\uB9C1 \uC644\uB8CC', 'done');
            }
        } catch (err) {
            console.warn('[Chat] Chat submit failed:', err.message || err);
            // Clean up any lingering streaming cursor
            this._finalizeStreamingMessage();
            // Mark current workflow step as error
            this._showWorkflowStep(1, '\uD83D\uDCCB', t('wfPlanning'), `\uC624\uB958: ${err.message || '\uCC98\uB9AC \uC2E4\uD328'}`, 'error');
            // Show error message in chat
            this._showChatError(t('chatError'));
        }
    }

    _showChatError(message) {
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        const el = document.createElement('div');
        el.className = 'chat-msg error';
        el.textContent = message;
        chatBox.appendChild(el);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // ==================== GEMMA 4 SELF-QA LOOP ====================

    async _runSelfQA(userRequest, simParams, card, maxIter = 2) {
        for (let i = 0; i < maxIter; i++) {
            const state = this._collectSimState();
            const qaPrompt = `[QA ${i+1}/${maxIter}] User: "${userRequest}"
Built: ${simParams.prompt}, particles=${state.activeParticles}, gravity=${state.gravity}, temp=${state.temperature}K
Correct? Reply ONLY \`\`\`json: {"qa":"pass","reason":"..."} or corrected simulation JSON.`;
            try {
                const qaRes = await this._callOllamaSync(qaPrompt);
                if (!qaRes) break;
                const m = qaRes.match(/```json\s*([\s\S]*?)```/);
                if (!m) break;
                const parsed = JSON.parse(m[1]);
                if (parsed.qa === 'pass') {
                    this.addChatMessage('system', `🔍 QA: ${parsed.reason || '✅ 요청에 부합'}`);
                    break;
                }
                const fix = parsed.simulation;
                if (fix) {
                    this.addChatMessage('system', `🔧 QA 개선 ${i+1}: 수정 적용 중...`);
                    if (fix.physics) { Object.assign(card.physics, fix.physics); this._syncPhysicsUI(card.physics); if (this.onPhysicsChange) this.onPhysicsChange(card.physics); }
                    if (fix.particles) { card.particleSpec = fix.particles; if (this.onCardSelect) this.onCardSelect(card); }
                } else break;
            } catch (err) { console.warn('[QA]', err.message); break; }
        }
    }

    _collectSimState() {
        const card = this.getActiveCard();
        return { activeParticles: card?.physics?.particleCount || 0, gravity: card?.physics?.gravity ?? -9.81, temperature: card?.physics?.temperature ?? 293 };
    }

    /**
     * Non-streaming provider call (for QA and validation).
     * @param {string} prompt - User message
     * @param {string} [systemPrompt] - System message (defaults to QA validator)
     */
    async _callOllamaSync(prompt, systemPrompt = 'QA validator. Reply ONLY ```json.') {
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], ...(AI_MODEL && { model: AI_MODEL }) }) });
            if (!res.ok) return null;
            const reader = res.body.getReader(); const decoder = new TextDecoder();
            let full = '', buffer = '';
            while (true) { const { done, value } = await reader.read(); if (done) break;
                buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
                for (const line of lines) { if (!line.startsWith('data: ')) continue;
                    try { const j = JSON.parse(line.slice(6)); if (j.message?.content) full += j.message.content; } catch {} } }
            return full || null;
        } catch { return null; }
    }

    /**
     * Streaming provider call — shows real-time LLM text as an independent chat bubble.
     * Replit-style: each DAG step appears as its own AI message with live typing.
     * @param {string} prompt - User message
     * @param {string} systemPrompt - System prompt
     * @param {string} stepLabel - Display label (e.g. "ANALYZE", "RESEARCH")
     * @returns {Promise<string|null>} Full accumulated response text
     */
    async _callProviderStreaming(prompt, systemPrompt, stepLabel = '') {
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    ...(AI_MODEL && { model: AI_MODEL }),
                }),
            });
            if (!res.ok) return null;

            // Create a dedicated chat bubble for this step
            const chatBox = document.getElementById('chat-messages');
            const bubble = document.createElement('div');
            bubble.className = 'chat-msg assistant dag-step-msg';
            bubble.style.cssText = 'white-space:pre-wrap;word-break:break-word;line-height:1.6;border-left:3px solid var(--accent-blue);margin:4px 0;padding:8px 12px;font-size:0.88em;';
            if (stepLabel) {
                const header = document.createElement('div');
                header.style.cssText = 'color:var(--accent-blue);font-weight:700;font-size:0.85em;margin-bottom:4px;letter-spacing:0.5px;';
                header.textContent = stepLabel;
                bubble.appendChild(header);
            }
            const content = document.createElement('div');
            content.className = 'dag-step-content';
            bubble.appendChild(content);
            chatBox.appendChild(bubble);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let stepText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const j = JSON.parse(line.slice(6));
                        if (j.message?.content) {
                            stepText += j.message.content;
                            // Live typing into this step's bubble
                            content.innerHTML = this._renderStepMarkdown(stepText) + '<span class="streaming-cursor">▊</span>';
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch {}
                }
            }

            // Finalize: remove cursor, keep content
            content.innerHTML = this._renderStepMarkdown(stepText);
            return stepText || null;
        } catch { return null; }
    }

    /** Lightweight markdown for step content */
    _renderStepMarkdown(text) {
        return this._escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>')
            .replace(/```json\s*([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;font-size:0.85em;overflow-x:auto;margin:6px 0"><code>$1</code></pre>')
            .replace(/```\s*([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;font-size:0.85em;overflow-x:auto;margin:6px 0"><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
    }

    // ==================== GEMMA 4 DAG AGENT WORKFLOW ====================

    /**
     * Multi-step agent chain for higher quality simulations.
     * DAG: Analyze → Research → Design → Generate → Validate
     * Each step's output feeds the next step's input.
     * All steps stream real-time LLM reasoning to the chat UI.
     * Falls back to single-call if any step fails.
     */
    async _dagAgentWorkflow(userMessage) {
        // Reset streaming accumulator
        this._currentStreamText = '';

        // System prompts per DAG phase
        const SYS_ANALYZE = 'You are a physics simulation expert. Analyze the user\'s request to identify the object, physical properties, science domain, and scale. Respond concisely in the user\'s language (Korean or English).';
        const SYS_RESEARCH = 'You are a physics reference expert. Provide EXACT SI physical values with justification. Be PRECISE and QUANTITATIVE.\n\n' +
            '## REFERENCE MATERIAL DATA (benchmark-derived, suggested values):\n' + MATERIAL_REFERENCE_TABLE + '\n\n' +
            'If the material matches one above, use its EXACT values. For unlisted materials, derive from closest known material.';
        const SYS_DESIGN = 'You are a particle simulation designer. Plan efficient particle layouts using available shapes (helix, sphere, grid, ring, wave, spiral, shell, cylinder, cone, torus, etc.) and connections (chain, grid, nearest:N, surface, none).';
        const SYS_GENERATE = 'You are a simulation JSON generator. Synthesize the analysis, research, and design into a valid simulation JSON. Output MUST include a ```json block with {"simulation":{...}} format. Include prompt, title, domain, and physics fields.';
        const SYS_VALIDATE = 'You are a physics QA validator. Check if the generated simulation JSON matches physical reality. If all values are correct, return the same JSON. If any are wrong, return CORRECTED JSON. ALWAYS include a ```json block.\n\n' +
            '## REFERENCE VALUES:\n' + MATERIAL_REFERENCE_TABLE.split('\n').slice(0, 20).join('\n') + '\n...\nUse these to validate density, gravity, temperature accuracy.';

        // ── Step 1: ANALYZE ──
        this._showWorkflowStep(1, '🔍', t('wfAnalyze'), '요청 분석 중...', 'running');

        const step1 = await this._callProviderStreaming(
            `[STEP 1: ANALYZE]\nUser request: "${userMessage}"\n\n` +
            `Identify:\n1. What object/phenomenon to simulate\n2. Key physical properties needed\n3. Relevant science domain (physics/chemistry/biology/astronomy/earth_science/engineering/mathematics/materials)\n4. Scale (nano/human/planetary)\n\nRespond in 3-4 bullet points.`,
            SYS_ANALYZE,
            'STEP 1: ANALYZE'
        );
        if (!step1) return null;
        this._showWorkflowStep(1, '🔍', t('wfAnalyze'), '분석 완료', 'done');

        // ── Step 2: RESEARCH ──
        this._showWorkflowStep(2, '📚', t('wfResearch'), '물성치 조사 중...', 'running');

        const step2 = await this._callProviderStreaming(
            `[STEP 2: RESEARCH PHYSICAL PROPERTIES]\n` +
            `Based on this analysis:\n${step1}\n\n` +
            `List the EXACT SI physical values needed:\n` +
            `- gravity (m/s²): Earth=-9.81, Moon=-1.62, Mars=-3.72, Jupiter=-24.79, space=0\n` +
            `- density (kg/m³ ÷ 1000 for sim): iron=7.8, concrete=2.4, water=1.0, diamond=3.5\n` +
            `- springStiffness (sim scale 1-100): soft=5, medium=20, rigid=50, diamond=150\n` +
            `- temperature (K): room=293, boiling=373, lava=1500, sun=5778\n` +
            `- viscosity (sim scale): air=0, water=1, honey=10\n` +
            `- seismic, windX, turbulence as needed\n\n` +
            `List each value with justification. Be PRECISE.`,
            SYS_RESEARCH,
            'STEP 2: RESEARCH'
        );
        if (!step2) return null;
        this._showWorkflowStep(2, '📚', t('wfResearch'), '조사 완료', 'done');

        // ── Step 3: DESIGN ──
        this._showWorkflowStep(3, '📐', t('wfDesign'), '파티클 배치 설계 중...', 'running');

        const step3 = await this._callProviderStreaming(
            `[STEP 3: DESIGN PARTICLE LAYOUT]\n` +
            `Physical properties:\n${step2}\n\n` +
            `Design the particle simulation:\n` +
            `- How many particles? (20000-50000)\n` +
            `- What shape/arrangement? (helix, sphere, grid, ring, wave, spiral, shell, cylinder, cone, torus, random_box, point_cloud)\n` +
            `- What connections between particles? (chain, grid, nearest:N, all, surface, none)\n` +
            `- Which parts are structural vs ambient?\n\n` +
            `Describe the layout plan briefly.`,
            SYS_DESIGN,
            'STEP 3: DESIGN'
        );
        if (!step3) return null;
        this._showWorkflowStep(3, '📐', t('wfDesign'), '설계 완료', 'done');

        // ── Step 4: GENERATE ──
        this._showWorkflowStep(4, '🔧', t('wfGenerate'), 'JSON 생성 중...', 'running');

        const step4 = await this._callProviderStreaming(
            `[STEP 4: GENERATE SIMULATION JSON]\n` +
            `Analysis: ${step1}\n\n` +
            `Physical values: ${step2}\n\n` +
            `Layout plan: ${step3}\n\n` +
            `Now generate the FINAL simulation JSON. Use the EXACT values from Step 2.\n` +
            `Use particle groups (Option B) for complex simulations, simple prompt keyword (Option A) for basic structures.\n\n` +
            `MANDATORY format:\n` +
            '```json\n' +
            '{"simulation":{"prompt":"custom","title":"...","domain":"...","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"temperature":293,"density":2.4,"viscosity":0,"friction":0.8,"bounciness":0.3,"windX":0,"turbulence":0,"seismic":0},"particles":{"groups":[{"name":"...","count":N,"shape":"...","params":{...},"color":"cyan","role":2,"connect":"chain"}]}}}\n' +
            '```\n' +
            'Available shapes: helix, sphere, random_sphere, grid, ring, disk, line, wave, spiral, shell, cylinder, cone, torus, random_box, point_cloud\n' +
            'Available connects: chain, grid, nearest:N, all, surface, none\n' +
            'Available colors: cyan, magenta, lime, orange, purple, blue, pink, yellow, teal, indigo',
            SYS_GENERATE,
            'STEP 4: GENERATE'
        );
        if (!step4) return null;

        // Safety check: Step 4 MUST contain parseable JSON
        let step4Json = this._extractSimParams(step4);
        if (!step4Json) {
            // Retry once with stricter prompt
            this._showWorkflowStep(4, '🔧', t('wfGenerate'), 'JSON 재생성 중...', 'running');
            const step4retry = await this._callProviderStreaming(
                `The previous response did not contain valid JSON. Please generate ONLY a \`\`\`json block.\n` +
                `Requirements: {"simulation":{"prompt":"...","title":"...","domain":"...","physics":{gravity, damping, springStiffness, particleCount, temperature, density, viscosity, friction, bounciness, windX, turbulence, seismic}}}\n` +
                `Based on: ${step1.slice(0, 150)}\nValues: ${step2.slice(0, 200)}\nDesign: ${step3.slice(0, 150)}`,
                'You MUST output ONLY a ```json block. No other text. Valid JSON only.',
                'STEP 4: GENERATE (retry)'
            );
            if (step4retry) {
                step4Json = this._extractSimParams(step4retry);
            }
        }
        this._showWorkflowStep(4, '🔧', t('wfGenerate'), step4Json ? 'JSON 생성 완료' : 'JSON 생성 실패 — 기본값 적용', step4Json ? 'done' : 'error');

        // ── Step 5: VALIDATE ──
        this._showWorkflowStep(5, '✅', t('wfValidate'), '검증 중...', 'running');

        const step5 = await this._callProviderStreaming(
            `[STEP 5: VALIDATE]\n` +
            `Original request: "${userMessage}"\n` +
            `Generated JSON:\n${step4}\n\n` +
            `Check:\n1. Does gravity match the environment? (space=0, moon=-1.62, earth=-9.81)\n` +
            `2. Does density match the material?\n` +
            `3. Does temperature match the scenario?\n` +
            `4. Are all physics values physically reasonable?\n` +
            `5. Does the particle layout make sense for this object?\n\n` +
            `If ALL correct: respond with the same JSON.\n` +
            `If ANY wrong: respond with CORRECTED JSON.\n` +
            `ALWAYS include \`\`\`json block.`,
            SYS_VALIDATE,
            'STEP 5: VALIDATE'
        );
        this._showWorkflowStep(5, '✅', t('wfValidate'), '검증 완료', 'done');

        // Use step5 (validated) or step4 (if step5 failed)
        const finalResponse = step5 || step4;

        // Each step already displayed as independent chat bubble
        // Return final JSON-containing response for parameter extraction
        return finalResponse;
    }

    // ==================== WORKFLOW VISUALIZATION ====================

    _showWorkflowStep(stepNum, icon, title, detail, status = 'running') {
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;

        let container = chatBox.querySelector('.workflow-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'chat-msg assistant workflow-container';
            chatBox.appendChild(container);
        }

        let stepEl = container.querySelector(`[data-step="${stepNum}"]`);
        if (!stepEl) {
            stepEl = document.createElement('div');
            stepEl.className = `workflow-step step-${status}`;
            stepEl.setAttribute('data-step', stepNum);
            container.appendChild(stepEl);
        }

        stepEl.className = `workflow-step step-${status}`;
        stepEl.innerHTML = `
            <span class="step-icon">${status === 'done' ? '\u2705' : status === 'error' ? '\u274C' : '\u23F3'}</span>
            <span class="step-title">${icon} ${title}</span>
            <span class="step-detail">${detail}</span>
        `;

        chatBox.scrollTop = chatBox.scrollHeight;
    }

    _clearWorkflowContainer() {
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        const container = chatBox.querySelector('.workflow-container');
        if (container) container.remove();
    }

    // ==================== OLLAMA SSE CHAT ====================

    async _sendToOllama(userMessage) {
        const SYSTEM_PROMPT = `You are a friendly, passionate science educator and particle simulation AI for Gemma 4 Particle Edu.
Your personality: warm, curious, encouraging. You LOVE helping people explore science through interactive 3D simulations.

## How to Respond
1. **Greet the topic enthusiastically** — show genuine excitement about what the user wants to explore.
2. **Explain the science** (2-4 sentences) — use simple, vivid language. Analogies are great! Make it feel like a fun conversation, not a textbook.
3. **Share your thinking** — briefly explain WHY you chose the particle arrangement and physics parameters you did.
4. **ALWAYS include a \`\`\`json block** — this is MANDATORY, every response MUST have it. The simulation won't work without it.
5. **Suggest follow-up experiments** — spark curiosity with "what if" questions.

If the user speaks Korean, respond in casual, friendly Korean (반말/존댓말 mix is fine).
If the user speaks English, respond in warm conversational English.

## Capabilities
- **Physics**: pendulum, wave interference, double slit, electric field, magnetic field, collisions, projectile motion
- **Chemistry**: crystal lattice, molecular orbital, reaction kinetics, water molecule, DNA, proteins
- **Biology**: cell division, protein folding, DNA replication, neuron network, blood flow
- **Astronomy**: nebula, black hole accretion disk, comet trail, binary star, galaxy, solar system
- **Earth Science**: tectonic plates, volcano eruption, ocean current, atmosphere layers, earthquakes
- **Engineering**: stress test, fluid dynamics, heat transfer, aerodynamics, bridge structures
- **Mathematics**: fractal, attractor, topology surface, fibonacci spiral, Platonic solids
- **Architecture**: buildings, bridges, towers, cathedrals, pyramids, stadiums

## JSON Format (MANDATORY in every response)

### Option A — Simple (use a built-in template)
For common structures use a prompt keyword:
\`\`\`json
{
  "simulation": {
    "prompt": "<structure_type>",
    "physics": {
      "gravity": -9.81, "damping": 0.97, "springStiffness": 20,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.8,
      "bounciness": 0.3, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0, "temperature": 293,
      "foundation": 5.0, "density": 2.4,
      "seismic": 0, "seismicFreq": 2.0
    }
  }
}
\`\`\`
Available prompt types: house, tower, bridge, dome, pyramid, cathedral, temple, castle, wall, stadium, arch, sphere, cube, molecule, dna, protein, solar_system, galaxy, asteroid_field, cloud, tornado, rain, water_drop, river, ocean_wave, magnet, electron_cloud, transistor, circuit
NOTE: For phenomena not in the list above (pendulum, wave interference, etc.), use Option B (custom particle groups) instead.

### Option B — Custom (define particle groups for ANY science domain)
For anything beyond built-in templates, use the \`particles\` field:
\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "Descriptive Title",
    "description": "What this simulates and why",
    "domain": "physics|chemistry|biology|astronomy|earth_science|engineering|mathematics|materials|quantum|electromagnetism|thermodynamics",
    "physics": {
      "gravity": -9.81, "damping": 0.97, "springStiffness": 20,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.8,
      "bounciness": 0.3, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0, "temperature": 293
    },
    "particles": {
      "groups": [
        {
          "name": "group_name",
          "count": 200,
          "shape": "helix",
          "params": { "radius": 2, "pitch": 0.5, "turns": 5 },
          "color": "cyan",
          "role": 2,
          "connect": "chain"
        }
      ]
    }
  }
}
\`\`\`

#### Available shapes and their params:
- **helix**: radius, pitch, turns, center:[x,y,z] — spiral coil
- **sphere**: radius, center — Fibonacci-distributed points on sphere surface
- **random_sphere**: radius, center — random points inside sphere volume
- **grid**: spacing, center — 3D cubic grid
- **ring**: radius, center — circular ring
- **disk**: radius, center — flat filled circle
- **line**: length, direction:[x,y,z], center — linear arrangement
- **wave**: amplitude, wavelength, width, depth, center — sinusoidal surface
- **spiral**: radius, turns, spread, center — flat spiral (galaxy-like)
- **shell**: radius, center — hollow sphere surface
- **cylinder**: radius, height, center — cylindrical volume
- **cone**: radius, height, center — conical distribution
- **torus**: majorRadius, minorRadius, center — donut shape
- **random_box**: width, height, depth, center — random in rectangular volume
- **point_cloud**: spread, center — scattered in space

#### Available connect types:
- **chain** — sequential neighbor connections (good for strands, ropes, orbits)
- **grid** — connect to 3D grid neighbors (good for lattices, crystals)
- **nearest:N** — connect to N nearest neighbors (good for networks, clusters)
- **all** — fully connected (small groups only, <100 particles)
- **surface** — connect surface neighbors (good for membranes, shells)
- **none** — no connections (good for gas, clouds, independent particles)

#### Available colors:
cyan, magenta, lime, orange, purple, blue, pink, yellow, teal, indigo

#### Roles (particle visual weight): 1=foundation(heavy), 2=column, 3=beam, 4=brace, 5=arch/decorative

#### Domain examples (use these patterns for custom simulations):
**Biology/Chemistry:**
- DNA: two helices (backbone) + rungs between them (hydrogen bonds), gravity=0, temp=310K
- Protein folding: random_sphere (amino acids) + chain connections, gravity=0, viscosity=0.5
- Cell division: sphere (cell) splitting into two spheres, gravity=0
- Blood flow: cylinder (vessel) + point_cloud (red cells, charge=-1) + ring (valve), viscosity=3
- Chemical reaction: two sphere groups (reactants, different colors) + point_cloud (products)

**Physics/Engineering:**
- Pendulum: line (string) + sphere (bob), gravity=-9.81, damping=0.999
- Projectile: sphere launched with windX velocity, gravity=-9.81
- Wave interference: two wave groups overlapping, springK=15
- Heat transfer: grid (hot side, temp=1000K) + grid (cold side, temp=293K)
- Fluid in pipe: cylinder (pipe) + point_cloud (fluid particles), viscosity=2

**Electromagnetism:**
- PN junction: sphere (P-type, charge=+1, pink) + sphere (N-type, charge=-1, blue) + disk (depletion zone, charge=0, gray), chargeStrength=5
- Capacitor: two disk groups (plates, charge=+1/-1) + point_cloud (E-field lines), electricFieldY=5
- Transistor: cylinder (source, charge=-1) + line (channel) + cylinder (drain) + disk (gate, charge=+1), gateVoltage=0
- Electromagnetic wave: wave (E-field) + wave (B-field, rotated 90 degrees)

**Astronomy/Earth:**
- Solar system: ring (orbit) + sphere (planet) per orbit layer, gravity=0
- Galaxy: spiral (disk) + random_sphere (core) + point_cloud (halo), gravity=0
- Volcano: cone (mountain) + cylinder (magma chamber) + point_cloud (eruption), temp=1500K
- Earthquake: grid (building) + seismic=7, seismicFreq=3
- Comet: sphere (nucleus, ice) + cone (tail, spread), gravity=0, windX=-5

**Semiconductor/Nano:**
- Silicon crystal: grid with grid connections, density=2329, temp=293K
- Quantum dot: shell (outer) + random_sphere (electron cloud), gravity=0, charge=-1
- Carbon nanotube: helix (tube wall) + chain connections, gravity=0
- Graphene sheet: grid (single layer, flat), gravity=0, springK=100

**Mathematics:**
- Fractal: spiral + recursive scaling, gravity=0
- Mobius strip: helix (twisted ring, turns=0.5), gravity=0
- Fibonacci spiral: spiral (golden ratio), gravity=0

When the \`domain\` field is set, appropriate physics defaults are auto-applied (e.g., zero gravity for astronomy, high viscosity for biology).

## Few-Shot Examples

### Example 1 (Korean user asks about waves)
User: "파도 시뮬레이션 보여줘"
Assistant:
와! 해양 파도의 물리학을 탐구해볼까요? 🌊

파도는 바람 에너지가 수면에 전달되면서 만들어지는 아름다운 현상이에요.
파장과 파고는 풍속과 취송거리(바람이 부는 거리)에 따라 결정되죠.
이 시뮬레이션에서는 사인파 표면에 파티클을 배치하고 중력과 유체 점성을 적용해서 실제 바다 파도처럼 움직이게 할게요.

**🔬 시뮬레이션 설계:**
파도의 핵심은 파동 방정식이에요. wave shape로 수면을 만들고, 중력(-9.81)과 적당한 점성(0.3)으로 물의 움직임을 표현합니다.

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "Ocean Wave Dynamics",
    "description": "Wind-driven ocean wave simulation with realistic fluid physics",
    "domain": "earth_science",
    "physics": {
      "gravity": -9.81, "damping": 0.95, "springStiffness": 15,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.5,
      "bounciness": 0.1, "windX": 3, "windY": 0, "windZ": 1,
      "turbulence": 0.2, "viscosity": 0.3, "temperature": 288
    },
    "particles": {
      "groups": [
        { "name": "ocean_surface", "count": 20000, "shape": "wave", "params": { "amplitude": 3, "wavelength": 8, "width": 40, "depth": 40 }, "color": "cyan", "role": 3, "connect": "surface" },
        { "name": "foam", "count": 5000, "shape": "point_cloud", "params": { "spread": 20, "center": [0, 3, 0] }, "color": "yellow", "role": 5, "connect": "none" }
      ]
    }
  }
}
\`\`\`

💡 **더 탐구해볼까요?**
- 풍속을 높이면 파고가 어떻게 변할까요?
- 수심이 얕아지면 파도가 어떻게 변형될까요? (천수 효과)

### Example 2 (English user asks about DNA)
User: "Show me DNA double helix"
Assistant:
DNA is one of the most beautiful structures in all of biology! 🧬

The famous double helix was discovered by Watson and Crick in 1953. Two sugar-phosphate backbones twist around each other, connected by hydrogen bonds between complementary base pairs (A-T and G-C). The helix completes one full turn every 3.4 nanometers with 10 base pairs per turn.

**🔬 Simulation design:**
I'll create two intertwined helices for the backbones, with small connecting particles representing hydrogen bonds between base pairs. Zero gravity since we're at the molecular scale!

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "DNA Double Helix",
    "description": "Watson-Crick DNA double helix with sugar-phosphate backbones and hydrogen-bonded base pairs",
    "domain": "chemistry",
    "physics": {
      "gravity": 0, "damping": 0.99, "springStiffness": 30,
      "particleCount": 15000, "timeScale": 0.5, "friction": 0.9,
      "bounciness": 0.1, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0.5, "temperature": 310
    },
    "particles": {
      "groups": [
        { "name": "backbone_A", "count": 5000, "shape": "helix", "params": { "radius": 3, "pitch": 0.8, "turns": 8 }, "color": "cyan", "role": 2, "connect": "chain" },
        { "name": "backbone_B", "count": 5000, "shape": "helix", "params": { "radius": 3, "pitch": 0.8, "turns": 8, "center": [0, 0.4, 0] }, "color": "magenta", "role": 2, "connect": "chain" },
        { "name": "base_pairs", "count": 5000, "shape": "line", "params": { "length": 5, "direction": [1, 0, 0] }, "color": "lime", "role": 4, "connect": "nearest:2" }
      ]
    }
  }
}
\`\`\`

💡 **Want to explore more?**
- What happens when we "unzip" the DNA for replication?
- How does UV radiation cause thymine dimers?

## Architecture Guidelines
For buildings and cities, use multiple particle groups for structural realism:
- Foundation: grid at ground level, color=orange, connect=grid
- Columns: cylinder, vertical, color=cyan, connect=chain
- Floors: disk at each level, color=blue, connect=grid
- Facade: shell or grid surface, color=magenta, connect=nearest:4
- Details: point_cloud for windows/decorations, color=yellow, connect=none
This creates much more detailed and realistic structural simulations with visible load-bearing elements.

## REFERENCE MATERIAL PHYSICS (suggested values from benchmark data)
steel: density=7850, gravity=-9.81, temp=293K, springK=55
concrete: density=2400, gravity=-9.81, temp=293K, springK=35
iron: density=7874, gravity=-9.81, temp=293K, springK=50
wood: density=700, gravity=-9.81, temp=293K, springK=12
limestone: density=2700, gravity=-9.81, temp=293K, springK=30
water: density=1000, gravity=-9.81, temp=293K, viscosity=1
air: density=1.225, gravity=-9.81, temp=293K
blood: density=1060, gravity=-9.81, temp=310K, viscosity=3
dna: density=1700, gravity=0, temp=310K, springK=30
protein: density=1350, gravity=0, temp=310K, springK=20
plasma: density=1025, gravity=0, temp=5778K, springK=2
graphene: density=2267, gravity=0, temp=293K, springK=100
lava: density=2600, gravity=-9.81, temp=1500K, viscosity=8
ice: density=917, gravity=-9.81, temp=273K, springK=30
silicon: density=2329, gravity=-9.81, temp=293K, springK=40

## CRITICAL RULES
- You MUST include a \`\`\`json block in EVERY response. Never skip it.
- Respond in the same language as the user (Korean or English).
- Always suggest follow-up experiments to spark curiosity.
- Keep total particle count across all groups under 25000.
- Use Option B (custom particles) for anything NOT in the built-in prompt list.
- The JSON must contain "simulation" as the top-level key with at least "prompt" and "physics" fields.
- Use REFERENCE material values above. If material not listed, derive from closest match.`;

        // Build message history
        const userMsg = { role: 'user', content: userMessage };
        // Attach image for Gemma 4 Vision if pending
        if (this._pendingImage) {
            userMsg.images = [this._pendingImage.base64];
            userMsg.content = `[Analyzing uploaded image: ${this._pendingImage.name}]\n\n${userMessage}`;
            this._pendingImage = null;
        }
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...this._chatHistory.slice(-10),
            userMsg
        ];

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, ...(AI_MODEL && { model: AI_MODEL }) }),
            });

            if (!response.ok) throw new Error('Ollama unavailable');

            // SSE streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.message?.content) {
                            fullText += json.message.content;
                            // Update chat UI with streaming text
                            this._updateStreamingMessage(fullText);
                        }
                    } catch {
                        // ignore unparseable SSE frames
                    }
                }
            }

            return fullText;
        } catch (err) {
            console.warn('[Ollama] Streaming request failed:', err.message || err);
            // Clean up the blinking cursor on fetch failure
            this._finalizeStreamingMessage();
            return null; // Will trigger fallback NLP
        }
    }

    _extractSimParams(response) {
        if (!response) return null;

        // Strategy 1: Standard ```json ... ``` block
        let jsonStr = null;
        const match1 = response.match(/```json\s*([\s\S]*?)```/);
        if (match1) jsonStr = match1[1];

        // Strategy 2: ``` ... ``` without json tag
        if (!jsonStr) {
            const match2 = response.match(/```\s*([\s\S]*?)```/);
            if (match2 && match2[1].includes('"simulation"')) jsonStr = match2[1];
        }

        // Strategy 3: Find raw JSON object with "simulation" key
        if (!jsonStr) {
            const match3 = response.match(/\{[\s\S]*"simulation"[\s\S]*\}/);
            if (match3) jsonStr = match3[0];
        }

        if (!jsonStr) return null;

        // Attempt to repair common JSON issues from LLMs
        let parsed = null;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            // Repair: remove trailing commas before } or ]
            let fixed = jsonStr.replace(/,\s*([}\]])/g, '$1');
            // Repair: single quotes to double quotes (risky but common LLM error)
            fixed = fixed.replace(/'/g, '"');
            // Repair: unquoted keys
            fixed = fixed.replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');
            // Repair: remove comments
            fixed = fixed.replace(/\/\/[^\n]*/g, '');
            // Repair: truncated JSON — try to close brackets
            const openBraces = (fixed.match(/\{/g) || []).length;
            const closeBraces = (fixed.match(/\}/g) || []).length;
            for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
            const openBrackets = (fixed.match(/\[/g) || []).length;
            const closeBrackets = (fixed.match(/\]/g) || []).length;
            for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';

            try {
                parsed = JSON.parse(fixed);
                console.log('[JSON Repair] Successfully repaired malformed JSON');
            } catch (err2) {
                console.warn('[JSON] All parse attempts failed:', err2.message);
                return null;
            }
        }

        const sim = parsed.simulation || parsed;
        if (!sim || typeof sim !== 'object') return null;

        // Ensure physics object exists with defaults
        if (!sim.physics) sim.physics = {};
        sim.physics = { ...BASE_PHYSICS, ...(sim.physics || {}) };

        // Apply domain-specific physics defaults if domain is specified
        if (sim.domain && DOMAIN_PHYSICS[sim.domain]) {
            sim.physics = { ...BASE_PHYSICS, ...DOMAIN_PHYSICS[sim.domain], ...(sim.physics || {}) };
        }

        // Validate critical physics values are numbers
        const p = sim.physics;
        if (typeof p.gravity !== 'number') p.gravity = -9.81;
        if (typeof p.damping !== 'number' || p.damping <= 0 || p.damping > 1) p.damping = 0.97;
        if (typeof p.temperature !== 'number' || p.temperature < 0) p.temperature = 293;
        if (typeof p.particleCount !== 'number') p.particleCount = 25000;
        p.particleCount = Math.max(1000, Math.min(50000, Math.round(p.particleCount)));

        return sim;
    }

    _updateStreamingMessage(text) {
        // Find or create the streaming message element
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        let streamEl = chatBox.querySelector('.streaming-message');
        if (!streamEl) {
            streamEl = document.createElement('div');
            streamEl.className = 'chat-msg assistant streaming-message';
            streamEl.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:0.88em;line-height:1.6;max-height:60vh;overflow-y:auto;';
            chatBox.appendChild(streamEl);
        }
        // Simple markdown: bold (**text**) and headers (🔍 STEP)
        let html = this._escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^(🔍|📚|📐|🔧|✅)\s+(.+)$/gm, '<div style="color:var(--accent-blue);font-weight:bold;margin-top:0.8em;border-bottom:1px solid rgba(88,166,255,0.2);padding-bottom:0.3em">$1 $2</div>')
            .replace(/```json\s*([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:0.5em;border-radius:4px;font-size:0.85em;overflow-x:auto"><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
        streamEl.innerHTML = html + '<span class="streaming-cursor">▊</span>';
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    _finalizeStreamingMessage() {
        // Remove the temporary streaming element before adding the permanent message
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        const streamEl = chatBox.querySelector('.streaming-message');
        if (streamEl) streamEl.remove();
    }

    // ==================== HISTORY ====================

    async _saveToHistory(entry) {
        try {
            const res = await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            });
            if (!res.ok) throw new Error('Server returned ' + res.status);
            // Refresh history list after saving
            this._loadHistory();
        } catch (err) {
            console.warn('[History] Server save failed, using localStorage:', err.message || err);
            // localStorage fallback for Vercel static deploy
            try {
                const history = JSON.parse(localStorage.getItem('sim-history') || '[]');
                history.unshift({
                    ...entry,
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                });
                if (history.length > 100) history.length = 100;
                localStorage.setItem('sim-history', JSON.stringify(history));
                this._loadHistory();
            } catch (err) {
                console.warn('[History] localStorage fallback save failed:', err.message || err);
            }
        }
    }

    async _loadHistory(page = 0) {
        // 정적 배포(Vercel) — 서버 미접속 시 fetch 자체를 건너뛰어 콘솔 404 에러 방지
        if (this.serverOnline === false) {
            this._loadHistoryFromLocalStorage(page);
            return;
        }
        try {
            const res = await fetch(`/api/history?page=${page}&limit=20`);
            if (!res.ok) throw new Error('Server returned ' + res.status);
            const data = await res.json();
            this._renderHistoryList(data.items, page === 0);
            // Update count badge
            const countEl = document.getElementById('history-count');
            if (countEl) countEl.textContent = data.total;
            // Show/hide load more
            const loadMoreBtn = document.getElementById('load-more-history');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
                loadMoreBtn.onclick = () => this._loadHistory(page + 1);
            }
        } catch (err) {
            console.warn('[History] Server load failed, using localStorage:', err.message || err);
            // localStorage fallback for Vercel static deploy
            try {
                const history = JSON.parse(localStorage.getItem('sim-history') || '[]');
                const start = page * 20;
                const items = history.slice(start, start + 20);
                this._renderHistoryList(items, page === 0);
                const countEl = document.getElementById('history-count');
                if (countEl) countEl.textContent = history.length;
                const loadMoreBtn = document.getElementById('load-more-history');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = start + 20 < history.length ? 'block' : 'none';
                    loadMoreBtn.onclick = () => this._loadHistory(page + 1);
                }
            } catch (err) {
                console.warn('[History] localStorage fallback load failed:', err.message || err);
            }
        }
    }

    _loadHistoryFromLocalStorage(page = 0) {
        try {
            const history = JSON.parse(localStorage.getItem('sim-history') || '[]');
            const start = page * 20;
            const items = history.slice(start, start + 20);
            this._renderHistoryList(items, page === 0);
            const countEl = document.getElementById('history-count');
            if (countEl) countEl.textContent = history.length;
            const loadMoreBtn = document.getElementById('load-more-history');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = start + 20 < history.length ? 'block' : 'none';
                loadMoreBtn.onclick = () => this._loadHistory(page + 1);
            }
        } catch (err) {
            console.warn('[History] localStorage load failed:', err.message || err);
        }
    }

    _renderHistoryList(items, clear = true) {
        const list = document.getElementById('history-list');
        if (!list) return;
        if (clear) list.innerHTML = '';

        for (const item of items) {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-item-title">${this._escapeHtml(item.title)}</div>
                <div class="history-item-meta">
                    <span class="history-domain">${item.domain}</span>
                    <span class="history-time">${this._timeAgo(item.timestamp)}</span>
                </div>
                <div class="history-item-query">${this._escapeHtml(item.query).slice(0, 80)}</div>
            `;
            el.addEventListener('click', () => this._loadFromHistory(item));
            list.appendChild(el);
        }
    }

    async _loadFromHistory(item) {
        // Apply history physics to active card and sync UI
        const activeCard = this.getActiveCard();
        if (activeCard) {
            Object.assign(activeCard.physics, item.physics);
            activeCard.prompt = item.prompt;
            activeCard.particleSpec = item.particleSpec || null;
            if (item.title) activeCard.name = item.title;

            // Sync sliders to reflect the loaded physics values
            this._syncPhysicsUI(activeCard.physics);

            if (this.onPhysicsChange) this.onPhysicsChange(activeCard.physics);

            // Trigger rebuild with the loaded card
            if (this.onCardSelect) this.onCardSelect(activeCard);
        }
    }

    _processNaturalLanguage(input) {
        const lower = input.toLowerCase();
        const card = this.getActiveCard();
        if (!card) return 'No active simulation';

        // Simple natural language processing for physics changes
        if (lower.includes('무중력') || lower.includes('zero gravity') || lower.includes('gravity off')) {
            card.physics.gravity = 0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity set to 0. Particles will float freely.';
        }

        if (lower.includes('중력') && (lower.includes('강하') || lower.includes('높') || lower.includes('increase'))) {
            card.physics.gravity = -20;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity increased to -20 m/s². Heavy pull!';
        }

        if (lower.includes('바람') || lower.includes('wind')) {
            const strength = lower.includes('강') || lower.includes('strong') ? 15 : 5;
            card.physics.windX = strength;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return `Wind set to ${strength} m/s on X axis.`;
        }

        if (lower.includes('탄성') || lower.includes('bouncy') || lower.includes('elastic')) {
            card.physics.bounciness = 0.9;
            card.physics.springStiffness = 5;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Bounciness set to 0.9, spring stiffness reduced for elastic behavior.';
        }

        if (lower.includes('점성') || lower.includes('viscous') || lower.includes('fluid')) {
            card.physics.viscosity = 3.0;
            card.physics.damping = 0.85;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Viscosity set to 3.0, damping increased for fluid-like behavior.';
        }

        if (lower.includes('리셋') || lower.includes('reset') || lower.includes('초기화')) {
            card.physics = { ...PRESETS[0].physics };
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Physics reset to defaults.';
        }

        if (lower.includes('느리') || lower.includes('slow')) {
            card.physics.timeScale = 0.3;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale reduced to 0.3x. Slow motion activated.';
        }

        if (lower.includes('빠르') || lower.includes('fast')) {
            card.physics.timeScale = 3.0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale set to 3.0x. Fast forward!';
        }

        if (lower.includes('뜨거') || lower.includes('hot') || lower.includes('heat')) {
            card.physics.temperature = 3000;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 3000K. Particles will have thermal agitation.';
        }

        if (lower.includes('차가') || lower.includes('cold') || lower.includes('freeze')) {
            card.physics.temperature = 10;
            card.physics.damping = 0.999;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 10K, high damping. Near-frozen state.';
        }

        // Structure generation from keywords (AI offline fallback)
        const structureMap = {
            '피라미드': 'pyramid', 'pyramid': 'pyramid',
            '타워': 'tower', 'tower': 'tower', '탑': 'tower',
            '다리': 'bridge', 'bridge': 'bridge',
            '집': 'house', 'house': 'house', '건물': 'house', 'building': 'house',
            '돔': 'dome', 'dome': 'dome',
            '성당': 'cathedral', 'cathedral': 'cathedral',
            '성': 'castle', 'castle': 'castle',
            '경기장': 'stadium', 'stadium': 'stadium',
            '아치': 'arch', 'arch': 'arch',
            'dna': 'dna', '이중나선': 'dna', 'helix': 'dna',
            '태양계': 'solar_system', 'solar': 'solar_system',
            '은하': 'galaxy', 'galaxy': 'galaxy',
            '토네이도': 'tornado', 'tornado': 'tornado',
            '구름': 'cloud', 'cloud': 'cloud',
            '블랙홀': 'sphere', 'black hole': 'sphere', 'blackhole': 'sphere',
            '분자': 'molecule', 'molecule': 'molecule',
            '자석': 'magnet', 'magnet': 'magnet',
            '전자': 'electron_cloud', 'electron': 'electron_cloud',
            '트랜지스터': 'transistor', 'transistor': 'transistor',
            '회로': 'circuit', 'circuit': 'circuit',
            '화산': 'tornado', 'volcano': 'tornado',
            '파도': 'ocean_wave', 'wave': 'ocean_wave',
            '단백질': 'protein', 'protein': 'protein',
            '지진': 'house', 'earthquake': 'house',
            '벽': 'wall', 'wall': 'wall',
            '큐브': 'cube', 'cube': 'cube',
            '구': 'sphere', 'sphere': 'sphere',
        };

        for (const [kw, prompt] of Object.entries(structureMap)) {
            if (lower.includes(kw)) {
                card.prompt = prompt;
                card.particleSpec = null;
                document.getElementById('prompt-input').value = prompt;
                // Apply domain physics for certain types
                if (['dna', 'protein', 'molecule', 'electron_cloud'].includes(prompt)) {
                    card.physics.gravity = 0;
                    card.physics.damping = 0.99;
                } else if (['solar_system', 'galaxy', 'sphere'].includes(prompt) && lower.includes('블랙홀') || lower.includes('black')) {
                    card.physics.gravity = 0;
                    card.physics.damping = 0.999;
                } else if (['transistor', 'circuit', 'magnet'].includes(prompt)) {
                    card.physics.gravity = 0;
                    card.physics.damping = 0.99;
                    card.physics.electricFieldX = -3;
                    card.physics.chargeStrength = 5;
                }
                this._syncPhysicsUI(card.physics);
                if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                if (this.onCardSelect) this.onCardSelect(card);
                return `AI 오프라인 — "${prompt}" 프리셋으로 시뮬레이션을 생성합니다. AI 연결 시 더 정교한 시뮬레이션이 가능합니다.`;
            }
        }

        return `AI 오프라인 — 키워드로 시뮬레이션을 생성할 수 있습니다: 피라미드, 다리, DNA, 태양계, 블랙홀, 토네이도, 트랜지스터, 회로. 물리 조작: 무중력, 강한 바람, 점성, 리셋.`;
    }

    // ==================== UI INITIALIZATION ====================

    _initUI() {
        // Section toggles
        document.querySelectorAll('.section-title').forEach(title => {
            title.addEventListener('click', () => {
                const targetId = title.dataset.toggle;
                const target = document.getElementById(targetId);
                if (target) {
                    target.classList.toggle('collapsed');
                    title.classList.toggle('collapsed');
                }
            });
        });

        // Physics slider changes
        document.querySelectorAll('.param-group input[type="range"]').forEach(slider => {
            slider.addEventListener('input', () => {
                // Update display value
                const display = document.querySelector(`.param-value[data-for="${slider.id}"]`);
                if (display) display.textContent = this._formatValue(slider.id, slider.value);

                // Update card and notify
                const card = this.getActiveCard();
                if (card) {
                    card.physics = this._getPhysicsFromUI();
                    if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                }
            });

            // Save on mouse up
            slider.addEventListener('change', () => {
                const card = this.getActiveCard();
                if (card) {
                    this.updateCard(card.id, { physics: card.physics });
                }
            });
        });

        // Chat
        document.getElementById('chat-send-btn').addEventListener('click', () => this._handleChatSubmit());
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleChatSubmit();
        });

        // Image upload for Gemma 4 Vision
        const imageBtn = document.getElementById('chat-image-btn');
        const imageInput = document.getElementById('chat-image-input');
        if (imageBtn && imageInput) {
            imageBtn.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1]; // strip data:image/...;base64,
                    this._pendingImage = { base64, mimeType: file.type, name: file.name };
                    // Show preview in chat
                    this.addChatMessage('user', `[Image: ${file.name}]`);
                    // Auto-submit with image context
                    const chatInput = document.getElementById('chat-input');
                    const prompt = chatInput.value.trim() || 'Analyze this image and create a physics simulation based on what you see.';
                    chatInput.value = prompt;
                    this._handleChatSubmit();
                };
                reader.readAsDataURL(file);
                imageInput.value = ''; // reset for next upload
            });
        }

        // Suggestion chips
        const chips = document.querySelectorAll('.suggestion-chip');
        for (const chip of chips) {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = prompt;
                    // Auto-submit
                    this._handleChatSubmit();
                    // Hide suggestions after first use
                    const welcome = document.getElementById('welcome-suggestions');
                    if (welcome) welcome.style.display = 'none';
                }
            });
        }
    }

    // ==================== UTILS ====================

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
