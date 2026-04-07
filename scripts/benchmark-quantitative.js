/**
 * Quantitative Benchmark Analysis
 * Compares Gemma 4 generated physics values against SI reference values.
 * Outputs per-parameter error rates instead of binary pass/fail.
 */

import { readFileSync, writeFileSync } from 'fs';

// Reference SI values for materials (subset matching benchmark data)
const REF = {
  // Metals
  steel: { density: 7850, gravity: -9.81, temp: 293 },
  iron: { density: 7874, gravity: -9.81, temp: 293 },
  aluminum: { density: 2700, gravity: -9.81, temp: 293 },
  copper: { density: 8960, gravity: -9.81, temp: 293 },
  titanium: { density: 4506, gravity: -9.81, temp: 293 },
  gold: { density: 19320, gravity: -9.81, temp: 293 },
  silver: { density: 10490, gravity: -9.81, temp: 293 },
  tin: { density: 7310, gravity: -9.81, temp: 293 },
  chromium: { density: 7190, gravity: -9.81, temp: 293 },
  lithium: { density: 534, gravity: -9.81, temp: 293 },
  // Construction
  concrete: { density: 2400, gravity: -9.81, temp: 293 },
  wood: { density: 700, gravity: -9.81, temp: 293 },
  limestone: { density: 2700, gravity: -9.81, temp: 293 },
  stone: { density: 2500, gravity: -9.81, temp: 293 },
  brick: { density: 1900, gravity: -9.81, temp: 293 },
  glass: { density: 2500, gravity: -9.81, temp: 293 },
  marble: { density: 2700, gravity: -9.81, temp: 293 },
  granite: { density: 2700, gravity: -9.81, temp: 293 },
  // Polymers
  rubber: { density: 1100, gravity: -9.81, temp: 293 },
  plastic: { density: 1100, gravity: -9.81, temp: 293 },
  nylon: { density: 1140, gravity: -9.81, temp: 293 },
  // Fluids
  water: { density: 1000, gravity: -9.81, temp: 293 },
  air: { density: 1.225, gravity: -9.81, temp: 293 },
  lava: { density: 2600, gravity: -9.81, temp: 1500 },
  ice: { density: 917, gravity: -9.81, temp: 273 },
  snow: { density: 100, gravity: -9.81, temp: 273 },
  sand: { density: 1600, gravity: -9.81, temp: 293 },
  mud: { density: 1600, gravity: -9.81, temp: 293 },
  // Biology
  dna: { density: 1700, gravity: 0, temp: 310 },
  protein: { density: 1350, gravity: 0, temp: 310 },
  blood: { density: 1060, gravity: -9.81, temp: 310 },
  cell: { density: 1050, gravity: 0, temp: 310 },
  cells: { density: 1050, gravity: 0, temp: 310 },
  bacteria: { density: 1100, gravity: -9.81, temp: 310 },
  // Astronomy
  plasma: { density: 1025, gravity: 0, temp: 5778 },
  // Advanced
  graphene: { density: 2267, gravity: 0, temp: 293 },
  silicon: { density: 2329, gravity: -9.81, temp: 293 },
  carbon: { density: 2260, gravity: 0, temp: 293 },
};

function parseNum(str) {
  if (!str) return null;
  const m = String(str).match(/-?[\d.]+(?:e[+-]?\d+)?/i);
  return m ? parseFloat(m[0]) : null;
}

function pctError(actual, expected) {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs((actual - expected) / expected) * 100;
}

// Load benchmark data
const data = JSON.parse(readFileSync('data/benchmark-300.json', 'utf8'));
const scenarios = data.scenarios;

const results = [];
let totalDensityError = 0, totalGravityError = 0, totalTempError = 0;
let countDensity = 0, countGravity = 0, countTemp = 0;

for (const s of scenarios) {
  const mat = (s.material || '').toLowerCase();
  const ref = REF[mat];

  const actualDensity = parseNum(s.density);
  const actualGravity = parseNum(s.gravity);
  const actualTemp = parseNum(s.temperature);

  const row = {
    id: s.id,
    material: mat,
    accuracy: s.accuracy,
    exploded: s.exploded,
    densityError: null,
    gravityError: null,
    tempError: null,
  };

  if (ref && actualDensity != null) {
    row.densityError = pctError(actualDensity, ref.density);
    totalDensityError += row.densityError;
    countDensity++;
  }

  if (ref && actualGravity != null) {
    row.gravityError = pctError(actualGravity, ref.gravity);
    totalGravityError += row.gravityError;
    countGravity++;
  }

  if (ref && actualTemp != null) {
    row.tempError = pctError(actualTemp, ref.temp);
    totalTempError += row.tempError;
    countTemp++;
  }

  results.push(row);
}

// Stats
const matched = results.filter(r => r.densityError !== null || r.gravityError !== null || r.tempError !== null);
const avgDensityErr = countDensity ? (totalDensityError / countDensity).toFixed(2) : 'N/A';
const avgGravityErr = countGravity ? (totalGravityError / countGravity).toFixed(2) : 'N/A';
const avgTempErr = countTemp ? (totalTempError / countTemp).toFixed(2) : 'N/A';

console.log('═══════════════════════════════════════════');
console.log(' QUANTITATIVE BENCHMARK ANALYSIS');
console.log('═══════════════════════════════════════════');
console.log(`Total scenarios: ${scenarios.length}`);
console.log(`Matched to reference: ${matched.length}`);
console.log(`Reference materials: ${Object.keys(REF).length}`);
console.log('');
console.log('Average % Error (lower is better):');
console.log(`  Density:     ${avgDensityErr}% (${countDensity} comparisons)`);
console.log(`  Gravity:     ${avgGravityErr}% (${countGravity} comparisons)`);
console.log(`  Temperature: ${avgTempErr}% (${countTemp} comparisons)`);

// Error distribution
const densityErrors = results.map(r => r.densityError).filter(e => e !== null);
const gravityErrors = results.map(r => r.gravityError).filter(e => e !== null);
const tempErrors = results.map(r => r.tempError).filter(e => e !== null);

function distribution(errors, label) {
  const exact = errors.filter(e => e === 0).length;
  const lt1 = errors.filter(e => e > 0 && e <= 1).length;
  const lt5 = errors.filter(e => e > 1 && e <= 5).length;
  const lt10 = errors.filter(e => e > 5 && e <= 10).length;
  const lt20 = errors.filter(e => e > 10 && e <= 20).length;
  const gt20 = errors.filter(e => e > 20).length;
  console.log(`\n${label} error distribution (${errors.length} values):`);
  console.log(`  Exact (0%):   ${exact} (${(exact/errors.length*100).toFixed(1)}%)`);
  console.log(`  0-1%:         ${lt1} (${(lt1/errors.length*100).toFixed(1)}%)`);
  console.log(`  1-5%:         ${lt5} (${(lt5/errors.length*100).toFixed(1)}%)`);
  console.log(`  5-10%:        ${lt10} (${(lt10/errors.length*100).toFixed(1)}%)`);
  console.log(`  10-20%:       ${lt20} (${(lt20/errors.length*100).toFixed(1)}%)`);
  console.log(`  >20%:         ${gt20} (${(gt20/errors.length*100).toFixed(1)}%)`);
}

distribution(densityErrors, 'Density');
distribution(gravityErrors, 'Gravity');
distribution(tempErrors, 'Temperature');

// Worst offenders
console.log('\n═══════════════════════════════════════════');
console.log(' WORST CASES (>10% error on any parameter)');
console.log('═══════════════════════════════════════════');
const worst = results.filter(r =>
  (r.densityError !== null && r.densityError > 10) ||
  (r.gravityError !== null && r.gravityError > 10) ||
  (r.tempError !== null && r.tempError > 10)
);
for (const w of worst) {
  console.log(`  #${w.id} ${w.material}: density=${w.densityError?.toFixed(1)}%, gravity=${w.gravityError?.toFixed(1)}%, temp=${w.tempError?.toFixed(1)}%`);
}
if (worst.length === 0) console.log('  None! All matched parameters within 10%.');

// Save results
const output = {
  summary: {
    total: scenarios.length,
    matchedToReference: matched.length,
    referenceMaterials: Object.keys(REF).length,
    avgDensityErrorPct: parseFloat(avgDensityErr) || 0,
    avgGravityErrorPct: parseFloat(avgGravityErr) || 0,
    avgTempErrorPct: parseFloat(avgTempErr) || 0,
  },
  perScenario: results.filter(r => r.densityError !== null || r.gravityError !== null || r.tempError !== null),
};

writeFileSync('data/benchmark-quantitative.json', JSON.stringify(output, null, 2));
console.log('\nSaved to data/benchmark-quantitative.json');
