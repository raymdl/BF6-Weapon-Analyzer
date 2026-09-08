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

/** Widest effective spread reachable in an aim state, over spread-moving attachments. */
function corpusMaxFor(aimState) {
  let worst = { value: -Infinity, weaponId: null, stance: null, aimState };
  for (const weapon of weapons) {
    const base = Loadout.blankAtts();
    Loadout.resetAttsForWeapon(base, weapon, LOADOUT_DATA);
    const variants = [{ ...base }];
    for (const key of Object.keys(base)) {
      for (const item of Loadout.availableAttachments(weapon, key, LOADOUT_DATA)) {
        variants.push({ ...base, [key]: item.id });
      }
    }
    for (const stanceState of ['stand', 'move']) {
      core.setSimContext({ aimState, stanceState });
      for (const atts of variants) {
        const build = applyAttachments(weapon, atts);
        const value = core.effectiveSpreadMax(build);
        assert.ok(Number.isFinite(value), `${weapon.id}/${JSON.stringify(atts)}: invalid spread`);
        if (value > worst.value) worst = { value, weaponId: weapon.id, stance: stanceState, aimState };
      }
    }
  }
  return worst;
}

const SCALE = core.SPREAD_BAR_SCALE;
const worst = ['ads', 'hip'].map(corpusMaxFor).reduce((a, b) => (b.value > a.value ? b : a));

test('the bar scale contains default and single-attachment builds in both aim states and stances', () => {
  assert.ok(worst.value <= SCALE,
    `spread reaches ${worst.value.toFixed(3)}° (${worst.weaponId}, ${worst.aimState}/${worst.stance}) but the bar tops out at ${SCALE}°`);
});
