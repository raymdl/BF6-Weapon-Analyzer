/**
 * The Spread Min → Eff. Max bar axis must contain the corpus.
 *
 * ui/app.js draws that bar as a fraction of one fixed ceiling, shared by every
 * aim state and stance so bar lengths stay comparable. Set it below the widest
 * spread the model can produce and the top weapons all clamp to a full-width
 * bar and read as equal — the 9.1° it replaced did exactly that to the four
 * widest hipfire builds. This test pins the ceiling to the corpus.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as core from '../sim/core.js';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import * as Loadout from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const weapons = readJson('data/weapons.json');
const balance = readJson('data/balance_tables.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');

setAttachmentContext({
  ...attachments, ...balance,
  AMMO: ammo.AMMO, WEAPON_AMMO: ammo.WEAPON_AMMO,
  HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
});
const LOADOUT_DATA = { ...attachments, AMMO: ammo.AMMO, WEAPON_AMMO: ammo.WEAPON_AMMO };
core.setSimContext({
  aimState: 'ads', stanceState: 'stand', ...recoilDecay,
  compensationFn: () => 0, platformRecoilMultFn: () => 1,
});

// Mirrors ui/app.js selectedEffectiveSpreadMax().
const SPREAD_EFFECTIVE_MAX_SHOTS = 50;
function effectiveSpreadMax(weapon) {
  const [baseline, sMax] = core.spreadBounds(weapon);
  const inc = core.selectedSpreadIncFor(weapon);
  if (inc === 0) return baseline;
  const { firing, notFiring } = core.spreadRecoveries(weapon);
  const clamp = v => Math.min(Math.max(v, baseline), sMax);
  let spread = baseline;
  for (let i = 0; i < SPREAD_EFFECTIVE_MAX_SHOTS; i++) {
    spread = clamp(spread + inc);
    const gap = core.shotIntervalAfter(weapon, i + 1);
    if (core.isBurstGapAfter(weapon, i + 1)) {
      const firingTime = Math.min(60 / (weapon.rpm ?? 600), gap);
      spread = core.applySpreadRecovery(spread, firingTime, firing, baseline, sMax, 1 / 60);
      spread = core.applySpreadRecovery(spread, Math.max(0, gap - firingTime), notFiring, baseline, sMax, 1 / 60);
    } else {
      spread = core.applySpreadRecovery(spread, gap, firing, baseline, sMax, 1 / 60);
    }
  }
  return clamp(spread);
}

/** Widest effective spread reachable in an aim state, over spread-moving attachments. */
function corpusMaxFor(aimState) {
  let worst = { value: -Infinity, weaponId: null, stance: null, aimState };
  for (const weapon of weapons) {
    const base = Loadout.blankAtts();
    Loadout.resetAttsForWeapon(base, weapon, LOADOUT_DATA);
    const variants = [{ ...base }];
    for (const m of attachments.MUZZLES) variants.push({ ...base, muzzle: m.id });
    for (const b of attachments.BARRELS) variants.push({ ...base, barrel: b.id });
    for (const g of attachments.GRIPS) variants.push({ ...base, grip: g.id });
    for (const l of attachments.LASERS) variants.push({ ...base, laser: l.id });
    for (const stanceState of ['stand', 'move']) {
      core.setSimContext({ aimState, stanceState });
      for (const atts of variants) {
        let build;
        try { build = applyAttachments(weapon, atts); } catch { continue; }
        const value = effectiveSpreadMax(build);
        if (Number.isFinite(value) && value > worst.value) worst = { value, weaponId: weapon.id, stance: stanceState, aimState };
      }
    }
  }
  return worst;
}

// Kept in step with SPREAD_BAR_SCALE in ui/app.js.
const SCALE = 9.4;

test('ui/app.js still declares the scale this test pins', () => {
  const source = readFileSync(join(root, 'ui/app.js'), 'utf8');
  const match = source.match(/const SPREAD_BAR_SCALE = ([\d.]+);/);
  assert.ok(match, 'SPREAD_BAR_SCALE must be declared as a single number');
  assert.equal(Number(match[1]), SCALE, 'the bar scale drifted from the one under test');
});

test('the bar scale contains every aim state and stance in the corpus', () => {
  const worst = ['ads', 'hip'].map(corpusMaxFor).reduce((a, b) => (b.value > a.value ? b : a));
  assert.ok(worst.value <= SCALE,
    `spread reaches ${worst.value.toFixed(3)}° (${worst.weaponId}, ${worst.aimState}/${worst.stance}) but the bar tops out at ${SCALE}°`);
});

test('the scale is not stranded far above what the model can reach', () => {
  // Headroom well past the maximum would push every bar into the left of the
  // track for no reason. The ceiling should sit just clear of the widest case.
  const worst = ['ads', 'hip'].map(corpusMaxFor).reduce((a, b) => (b.value > a.value ? b : a));
  assert.ok(worst.value / SCALE >= 0.95,
    `the widest bar fills only ${(worst.value / SCALE * 100).toFixed(0)}% of the track; lower the scale toward ${worst.value.toFixed(2)}°`);
});
