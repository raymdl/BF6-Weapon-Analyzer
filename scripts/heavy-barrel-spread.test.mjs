/**
 * Heavy-type barrels must reproduce the Sym reference spread curves.
 *
 * `heavy`, `heavy_ext`, and `cryo` cut ADS spread-per-shot and, alongside that,
 * scale the ADS firing-recovery coefficient and offset. The three move together
 * on purpose. `simulateSpread` recovers spread between shots at
 * `firingCoef * delta^firingExp + firingOffset`, so the flat offset is a floor
 * the per-shot influx has to clear at all: AK-205 clears its own by 5.9%, and a
 * SIPS cut on its own — the 0.80 multiplier this fixture replaced — dropped it
 * under that floor and pinned the weapon at minimum spread for the whole
 * magazine. Seven automatics behaved that way. The reference curves show every
 * one of them still climbing with a heavy barrel.
 *
 * The fixture is read off the per-weapon graphs published in the Sym Discord,
 * which are drawn from the same datamined parameters `data/weapons.json`
 * imports, so the Basic curve doubles as a check on the base spread model.
 * Graph titles are Sym codenames, resolved to site IDs through the `siteId`
 * field in `generated-data/sym/1.3.3.0/normalized.json`. A weapon whose graph
 * was captured on a non-default build carries that build in `attachments`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as core from '../sim/core.js';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const weapons = readJson('data/weapons.json');
const balance = readJson('data/balance_tables.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');
const reference = readJson('scripts/heavy-barrel-spread-reference.json');

setAttachmentContext({
  ...attachments, ...balance,
  AMMO: ammo.AMMO, WEAPON_AMMO: ammo.WEAPON_AMMO,
  HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
});
core.setSimContext({
  aimState: 'ads', stanceState: 'stand', ...recoilDecay,
  compensationFn: () => 0, platformRecoilMultFn: () => 1,
});

const byId = new Map(weapons.map(weapon => [weapon.id, weapon]));

// Curve readings come off published plots, so they carry pixel-level noise. The
// Basic tolerance is the looser of the two because a few of those plots are
// drawn at a coarser time step than this sim uses, which shows up as sawtooth
// on the shot-to-shot detail while the envelope still agrees.
const HEAVY_TOLERANCE_DEG = 0.03;
const BASIC_TOLERANCE_DEG = 0.12;

function maxDeviation(simulated, observed) {
  let worst = 0, worstShot = 0;
  observed.forEach((value, index) => {
    if (value == null) return;                 // point hidden behind the plot legend
    const deviation = Math.abs(simulated[index] - value);
    if (deviation > worst) { worst = deviation; worstShot = index + 1; }
  });
  return { worst, worstShot };
}

for (const [id, curves] of Object.entries(reference.weapons)) {
  const weapon = byId.get(id);
  const build = barrel => ({ barrel, ...(curves.attachments ?? {}) });

  test(`${id}: base spread curve matches the Sym reference`, () => {
    assert.ok(weapon, `${id} is missing from data/weapons.json`);
    const simulated = core.simulateSpread(applyAttachments(weapon, build('none')), reference.shots);
    const { worst, worstShot } = maxDeviation(simulated, curves.basic);
    assert.ok(worst <= BASIC_TOLERANCE_DEG,
      `${id} Basic deviates ${worst.toFixed(4)}° at shot ${worstShot} (limit ${BASIC_TOLERANCE_DEG}°)`);
  });

  test(`${id}: heavy barrel spread curve matches the Sym reference`, () => {
    const simulated = core.simulateSpread(applyAttachments(weapon, build('heavy')), reference.shots);
    const { worst, worstShot } = maxDeviation(simulated, curves.heavy);
    assert.ok(worst <= HEAVY_TOLERANCE_DEG,
      `${id} Heavy deviates ${worst.toFixed(4)}° at shot ${worstShot} (limit ${HEAVY_TOLERANCE_DEG}°)`);
  });
}

test('reference weapon IDs agree with the Sym source mapping', () => {
  const sym = readJson('generated-data/sym/1.3.3.0/normalized.json');
  const siteIdByCodename = new Map(sym.weapons.map(row => [row.codename, row.siteId]));
  for (const [id, curves] of Object.entries(reference.weapons)) {
    assert.equal(siteIdByCodename.get(curves.symCodename), id,
      `graph "${curves.symCodename}" maps to ${siteIdByCodename.get(curves.symCodename)}, not ${id}`);
  }
});

const HEAVY_TYPES = ['heavy', 'heavy_ext', 'cryo'];
const AIM_STANCES = [
  ['ads', 'stand'], ['ads', 'move'],
  ['hip', 'stand'], ['hip', 'move'],
];

/** Run `body` in one aim/stance, then restore the ADS standing default. */
function inState(aimState, stanceState, body) {
  try {
    core.setSimContext({ aimState, stanceState });
    return body();
  } finally {
    core.setSimContext({ aimState: 'ads', stanceState: 'stand' });
  }
}

test('heavy-type barrels never pin a weapon at its minimum spread', () => {
  const pinned = [];
  for (const [aimState, stanceState] of AIM_STANCES) {
    inState(aimState, stanceState, () => {
      for (const weapon of weapons) {
        if (!weapon.spreadDyn?.ads || weapon.recoilIncAds == null) continue;
        const base = applyAttachments(weapon, { barrel: 'none' });
        const [minimum] = core.spreadBounds(base);
        // Only weapons that bloom without a barrel can regress into being pinned.
        if (core.simulateSpread(base, 20).at(-1) <= minimum + 1e-9) continue;
        for (const barrel of HEAVY_TYPES) {
          const simulated = core.simulateSpread(applyAttachments(weapon, { barrel }), 20);
          if (simulated.at(-1) <= minimum + 1e-9) {
            pinned.push(`${weapon.id}/${barrel}/${aimState}-${stanceState}`);
          }
        }
      }
    });
  }
  assert.deepEqual(pinned, [],
    `these builds sit at minimum spread for 20 shots: ${pinned.join(', ')}`);
});

test('heavy-type barrels scale spread identically in every aim state and stance', () => {
  // Hipfire reads its spread-per-shot from spreadDyn.hip.inc and ADS from
  // recoilIncAds, so the two paths have to be checked separately or a hipfire
  // regression hides behind a passing ADS curve.
  const barrel = attachments.BARRELS.find(entry => entry.id === 'heavy');
  const weapon = byId.get('ak205');
  const heavy = applyAttachments(weapon, { barrel: 'heavy' });

  assert.equal(heavy.recoilIncAds, +(weapon.recoilIncAds * barrel.spreadIncMult).toFixed(3));
  assert.equal(heavy.spreadDyn.hip.inc, +(weapon.spreadDyn.hip.inc * barrel.spreadIncMult).toFixed(3));

  for (const [aimState, stanceState] of AIM_STANCES) {
    inState(aimState, stanceState, () => {
      const label = `${aimState}/${stanceState}`;
      const stock = core.spreadRecoveries(applyAttachments(weapon, { barrel: 'none' })).firing;
      const withHeavy = core.spreadRecoveries(heavy).firing;
      assert.ok(Math.abs(withHeavy.coef / stock.coef - barrel.spreadFiringDecCoefMult) < 1e-9,
        `${label}: firing coefficient scaled by ${withHeavy.coef / stock.coef}`);
      assert.ok(Math.abs(withHeavy.offset / stock.offset - barrel.spreadFiringDecOffsetMult) < 1e-9,
        `${label}: firing offset scaled by ${withHeavy.offset / stock.offset}`);
      assert.equal(withHeavy.exp, stock.exp, `${label}: exponent must not move`);
      assert.equal(
        core.selectedSpreadIncFor(heavy) / core.selectedSpreadIncFor(applyAttachments(weapon, { barrel: 'none' })) > 0.66,
        true, `${label}: spread-per-shot must be scaled, not zeroed`);
    });
  }
});

test('the three heavy-type barrels share one spread model', () => {
  const barrels = new Map(attachments.BARRELS.map(barrel => [barrel.id, barrel]));
  const fields = ['spreadIncMult', 'spreadFiringDecCoefMult', 'spreadFiringDecOffsetMult'];
  const [heavy, ...rest] = ['heavy', 'heavy_ext', 'cryo'].map(id => barrels.get(id));
  for (const barrel of rest) {
    for (const field of fields) {
      assert.equal(barrel[field], heavy[field],
        `${barrel.id}.${field} (${barrel[field]}) has drifted from heavy.${field} (${heavy[field]})`);
    }
  }
});
