// Research predictions, not measured BF6 behavior. No runtime data is changed.
// Run from the repository root: node scripts/research-recoil-models.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  setSimContext, mulberry32, whash, uniformDev, genRecoilPts,
  selectedRecoilAmountFor, selectedRecoilVariationFor,
  shotIntervalAfter, spreadBounds, spreadRecoveries, applySpreadRecovery,
} from '../sim/core.js';

const data = readFileSync('data/weapons.json');
const weapons = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
setSimContext({ aimState: 'ads', stanceState: 'stand',
  compensationFn: () => 0, platformRecoilMultFn: () => 1 });

// All variants keep the site's kick magnitude, angle samples and shot times.
// Only the recovery coordinate system or recovery clock changes.
function path(w, seed, mode, count = 20) {
  const g = w.recoil.ads;
  for (const key of ['decFactor', 'decExp', 'decTimeExp', 'decOffset']) {
    assert(Number.isFinite(g[key]), `${w.id}: missing ${key}`);
  }
  const rng = mulberry32((whash(w.id) ^ seed) >>> 0);
  const amount = selectedRecoilAmountFor(w);
  const variation = selectedRecoilVariationFor(w);
  const points = [{ x: 0, y: 0 }];
  let x = 0, y = 0, age = 0;
  for (let i = 1; i < count; i++) {
    const angle = (-g.dir + uniformDev(rng, variation)) * Math.PI / 180;
    x += Math.sin(angle) * amount;
    y += Math.cos(angle) * amount;
    const interval = shotIntervalAfter(w, i);
    let elapsed = 0;
    while (elapsed < interval) {
      const step = Math.min(1 / 60, interval - elapsed);
      elapsed += step;
      const t = mode === 'continuous-clock' ? age + elapsed : elapsed;
      const recover = r => {
        const loss = (Math.abs(r) ** g.decExp + g.decOffset)
          * g.decFactor * step * t ** g.decTimeExp;
        return Math.sign(r) * Math.max(0, Math.abs(r) - loss);
      };
      if (mode === 'radial') {
        const radius = Math.hypot(x, y);
        const scale = radius ? recover(radius) / radius : 0;
        x *= scale; y *= scale;
      } else {
        x = recover(x); y = recover(y);
      }
    }
    age += interval;
    points.push({ x, y });
  }
  return points;
}

const recoil = [];
for (const id of ['m433', 'ef88', 'tr7']) {
  const w = weapons.find(w => w.id === id);
  assert(w, `Missing research weapon ${id}`);
  const modes = {};
  for (const mode of ['current-axis', 'radial', 'continuous-clock']) {
    const distances = [];
    for (let seed = 0; seed < 64; seed++) {
      const points = path(w, seed, mode);
      if (mode === 'current-axis') {
        const current = genRecoilPts(w, seed, 20);
        points.forEach((p, i) => {
          assert(Math.abs(p.x - current[i].x) < 1e-10);
          assert(Math.abs(p.y - current[i].y) < 1e-10);
        });
      }
      distances.push(Math.hypot(points.at(-1).x, points.at(-1).y));
    }
    modes[mode] = { meanPreShot20OffsetDegrees:
      distances.reduce((a, b) => a + b, 0) / distances.length };
  }
  const [minimum, maximum] = spreadBounds(w);
  const recovery = spreadRecoveries(w).firing;
  const spread = {};
  for (const hz of [45, 60, 120]) {
    let value = minimum;
    for (let shot = 1; shot < 20; shot++) {
      value = Math.min(maximum, value + w.recoilIncAds);
      value = applySpreadRecovery(value, shotIntervalAfter(w, shot),
        recovery, minimum, maximum, 1 / hz);
    }
    spread[hz] = value;
  }
  recoil.push({ id, modes, preShot20SpreadDegreesByIntegrationRate: spread });
}

const result = {
  status: 'hypotheses-only; no in-game measurements or model selection',
  inputSha256: createHash('sha256').update(data).digest('hex'),
  controls: 'Unmodified local base records; stationary ADS; no compensation; '
    + 'platform multiplier 1; 64 paired seeds; 20-shot paths. No factory '
    + 'attachment activation is inferred. Alternate spread rates retain the '
    + 'site shot schedule and fractional final step; they are not full tick simulations.',
  verification: 'Current-axis variant matches every point from genRecoilPts '
    + 'for all 192 weapon/seed combinations within 1e-10 degrees.',
  recoil,
  radialSampling: [0.5, 0.67, 1].map(exponent => ({
    candidateFormula: 'radius = maximumRadius * U ** exponent; uniform angle',
    exponent, probabilityWithinHalfRadius: 0.5 ** (1 / exponent),
  })),
};
const out = 'outputs/frosty/mechanics-model-sensitivity.json';
mkdirSync('outputs/frosty', { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
