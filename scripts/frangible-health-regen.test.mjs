/**
 * Frangible's enemy health-regeneration delay.
 *
 * Frangible was carried as `noEffect` — greyed in the dropdown, modelled as
 * changing nothing — until the 5s → 9s regeneration delay it puts on a hit
 * enemy was confirmed. That delay is the round's only modelled effect, so
 * these tests pin the baseline, the override, and the fact that no other ammo
 * type drifts off the global default.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import * as Loadout from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const readText = file => readFileSync(join(root, file), 'utf8');

const attachments = readJson('data/attachments.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const ammo = readJson('data/ammo.json');

const { AMMO, WEAPON_AMMO } = ammo;
const ammoById = new Map(AMMO.map(record => [record.id, record]));

setAttachmentContext({
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  ERGOS: attachments.ERGOS,
  WEAPON_MAG: attachments.WEAPON_MAG,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
  AMMO,
  WEAPON_AMMO,
  RECOIL_MULT: balance.RECOIL_MULT,
  HIP_SPREAD_TIERS: balance.HIP_SPREAD_TIERS,
  HIP_SPREAD_BASE_IDX: balance.HIP_SPREAD_BASE_IDX,
  HIP_CLS: balance.HIP_CLS,
  BASE_HS_MULT: balance.BASE_HS_MULT,
  COLLATERAL_MULT_OVERRIDE: balance.COLLATERAL_MULT_OVERRIDE,
  HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
  LIMB_CLASS: balance.LIMB_CLASS,
  LIMB_CLASS_MULT: balance.LIMB_CLASS_MULT,
  AUTO_HS_MULT: balance.AUTO_HS_MULT,
  MOVING_ACC_TIERS: balance.MOVING_ACC_TIERS,
  DEFAULT_MOV_TIER: balance.DEFAULT_MOV_TIER,
  ADS_SPD_TIERS: balance.ADS_SPD_TIERS,
  SPRINT_REC_TIERS: balance.SPRINT_REC_TIERS,
  PRIMARY_SPRINT_REC_TIERS: balance.PRIMARY_SPRINT_REC_TIERS,
  SIDEARM_SPRINT_REC_TIERS: balance.SIDEARM_SPRINT_REC_TIERS,
  DEPLOY_TIME_TIERS: balance.DEPLOY_TIME_TIERS,
  ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
  VELOCITY_LADDER: balance.VELOCITY_LADDER,
  HEALTH_REGEN_DELAY_S: balance.HEALTH_REGEN_DELAY_S,
});

const LOADOUT_DATA = {
  SIGHTS: attachments.SIGHTS,
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  ERGOS: attachments.ERGOS,
  WEAPON_ATTS: attachments.WEAPON_ATTS,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
  WEAPON_MAG: attachments.WEAPON_MAG,
  AMMO,
  WEAPON_AMMO,
};

const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

function defaultAtts(weapon) {
  const atts = Loadout.blankAtts();
  Loadout.resetAttsForWeapon(atts, weapon, LOADOUT_DATA);
  return atts;
}

/** Weapons that can actually equip the given ammo id. */
function weaponsOffering(ammoId) {
  return Object.entries(WEAPON_AMMO)
    .filter(([, entry]) => ammoId in (entry?.ammo ?? {}))
    .map(([weaponId]) => weaponById.get(weaponId))
    .filter(Boolean);
}

test('the global baseline regeneration delay is 5s', () => {
  assert.equal(balance.HEALTH_REGEN_DELAY_S, 5);
});

test('frangible carries the 9s delay and is no longer flagged noEffect', () => {
  const frangible = ammoById.get('frangible');
  assert.equal(frangible.healthRegenDelayS, 9);
  assert.equal(Object.hasOwn(frangible, 'noEffect'), false,
    'frangible now changes a modeled stat, so it must not render greyed');
});

test('no other ammo type overrides the regeneration delay', () => {
  const overriding = AMMO.filter(record => Object.hasOwn(record, 'healthRegenDelayS')).map(record => record.id);
  assert.deepEqual(overriding, ['frangible']);
});

test('every weapon offering frangible resolves 5s standard and 9s frangible', () => {
  const offering = weaponsOffering('frangible');
  assert.ok(offering.length > 0, 'expected weapons offering frangible');
  for (const weapon of offering) {
    const atts = defaultAtts(weapon);
    const standard = applyAttachments(weapon, { ...atts, ammo: 'standard' });
    const frangible = applyAttachments(weapon, { ...atts, ammo: 'frangible' });
    assert.equal(standard._healthRegenDelayS, 5, `${weapon.id} standard`);
    assert.equal(frangible._healthRegenDelayS, 9, `${weapon.id} frangible`);
    // The panel renders -(cur - base) seconds, so this is the "-4s" chip.
    assert.equal(-(frangible._healthRegenDelayS - standard._healthRegenDelayS), -4, `${weapon.id} chip value`);
  }
});

test('non-frangible loads leave the delay at the baseline, emitting no chip', () => {
  for (const [weaponId, entry] of Object.entries(WEAPON_AMMO)) {
    const weapon = weaponById.get(weaponId);
    if (!weapon) continue;
    const atts = defaultAtts(weapon);
    const base = applyAttachments(weapon, atts);
    for (const ammoId of Object.keys(entry?.ammo ?? {})) {
      if (ammoId === 'frangible') continue;
      const build = applyAttachments(weapon, { ...atts, ammo: ammoId });
      assert.equal(build._healthRegenDelayS, 5, `${weaponId}/${ammoId}`);
      assert.equal(build._healthRegenDelayS - base._healthRegenDelayS, 0,
        `${weaponId}/${ammoId} must not emit an Enemy Health Regen chip`);
    }
  }
});

test('the live entrypoints hand HEALTH_REGEN_DELAY_S to the attachment resolver', () => {
  // Same failure mode as WEAPON_AMMO: an entrypoint that omits the baseline
  // falls back to the resolver default and the chip silently stops matching.
  for (const file of ['ui/app.js', 'preview_spread.html']) {
    const source = readText(file);
    const call = source.slice(source.indexOf('setAttachmentContext({'));
    const args = call.slice(0, call.indexOf('});') + 1);
    assert.match(args, /\bHEALTH_REGEN_DELAY_S\b/, `${file} must pass HEALTH_REGEN_DELAY_S`);
  }
});

test('the Attachment Effects panel renders the chip as a red -4s', () => {
  const source = readText('ui/app.js');
  assert.match(source, /Enemy Health Regen/, 'panel must label the chip "Enemy Health Regen"');
  const chip = source.slice(source.indexOf('const regenDelayDelta'));
  const block = chip.slice(0, chip.indexOf('if (cur._laserVisible'));
  assert.match(block, /signed\(-regenDelayDelta, 's', 0\)/, 'chip must show the negated delta in seconds');
  assert.match(block, /color:var\(--red\)/, 'chip must render red');
});
