/**
 * Subsonic ammunition must reach every velocity-bearing surface.
 *
 * `resolveAmmoVelocity` reads its per-weapon treatments from the resolver
 * context's WEAPON_AMMO table. A page that fetches ammo.json but forgets to
 * hand WEAPON_AMMO to setAttachmentContext still renders — every subsonic load
 * silently reports its supersonic velocity, and the drop/flight-time model
 * inherits the same wrong number. These tests pin both halves: the runtime
 * wiring, and the resolved velocity flowing through to the ballistics model.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyAttachments, floorVelocityDisplay, setAttachmentContext } from '../sim/applyAttachments.js';
import { flightTimeAtDistance, isProjectileModel, trajectoryAtDistance } from '../sim/ballistics.js';
import * as Loadout from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const readText = file => readFileSync(join(root, file), 'utf8');

const attachments = readJson('data/attachments.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const ammo = readJson('data/ammo.json');
const ballistics = readJson('data/ballistics.json');

const { AMMO, WEAPON_AMMO } = ammo;

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

/** Every (weapon, ammoId) pair that carries a velocity treatment. */
function treatedPairs() {
  const pairs = [];
  for (const [weaponId, entry] of Object.entries(WEAPON_AMMO)) {
    const weapon = weaponById.get(weaponId);
    if (!weapon || !entry?.velocityTreatments) continue;
    for (const [ammoId, treatment] of Object.entries(entry.velocityTreatments)) {
      pairs.push({ weapon, ammoId, treatment });
    }
  }
  return pairs;
}

// The runtime's projectileModelFor(), mirrored so the ballistics assertions
// below exercise the same inputs the TTK+VEL chart and soldier target use.
const BALLISTIC_WEAPON_IDS = new Set(ballistics.weaponIds ?? []);
function projectileModelFor(build, atts) {
  if (!BALLISTIC_WEAPON_IDS.has(build.id)) return null;
  const configured = ballistics.ammoDragPerMeter?.[atts?.ammo];
  const dragPerMeter = typeof configured === 'number' ? configured
    : (configured && typeof configured[build.cls] === 'number') ? configured[build.cls]
      : ballistics.baseDragPerMeter ?? 0.0035;
  const model = {
    velocityMps: build.bulletVel,
    dragPerMeter,
    gravityMps2: ballistics.gravityMps2,
  };
  return isProjectileModel(model) ? model : null;
}

test('the live entrypoints hand WEAPON_AMMO to the attachment resolver', () => {
  // Without this the velocity treatments are unreachable in the browser and
  // every subsonic load silently renders at its supersonic velocity.
  for (const file of ['ui/app.js', 'preview_distance.html', 'preview_spread.html']) {
    const source = readText(file);
    const call = source.slice(source.indexOf('setAttachmentContext({'));
    assert.ok(call.length > 0, `${file} should call setAttachmentContext`);
    const args = call.slice(0, call.indexOf('});') + 1);
    assert.match(args, /\bWEAPON_AMMO\b/, `${file} must pass WEAPON_AMMO to setAttachmentContext`);
  }
});

test('the corpus still carries subsonic velocity treatments to assert against', () => {
  const pairs = treatedPairs();
  assert.ok(pairs.length >= 20, `expected the treated pairs to survive, saw ${pairs.length}`);
});

test('every treated ammo type resolves below its standard-load velocity', () => {
  for (const { weapon, ammoId, treatment } of treatedPairs()) {
    const atts = defaultAtts(weapon);
    const standard = applyAttachments(weapon, { ...atts, ammo: 'standard' });
    const treated = applyAttachments(weapon, { ...atts, ammo: ammoId });
    const label = `${weapon.id}/${ammoId}`;

    assert.ok(Number.isFinite(treated.bulletVel), `${label} must resolve a velocity`);
    assert.ok(treated.bulletVel < standard.bulletVel,
      `${label} should sit below the standard load (${treated.bulletVel} vs ${standard.bulletVel})`);

    // The stat cards read bulletVel straight off the build, so pin the exact
    // number each treatment kind is meant to display at the default barrel.
    const expected = treatment.kind === 'subsonic-tier'
      ? weapon.bulletVel * balance.VELOCITY_LADDER ** treatment.subsonicVelocityTier
      : treatment.subsonicVelocityMps;
    assert.equal(treated.bulletVel, floorVelocityDisplay(expected), `${label} display velocity`);
  }
});

test('the reduced velocity reaches flight time and bullet drop', () => {
  const distance = 60;
  let covered = 0;
  for (const { weapon, ammoId } of treatedPairs()) {
    const atts = defaultAtts(weapon);
    const standardBuild = applyAttachments(weapon, { ...atts, ammo: 'standard' });
    const treatedBuild = applyAttachments(weapon, { ...atts, ammo: ammoId });
    const standardModel = projectileModelFor(standardBuild, { ...atts, ammo: 'standard' });
    const treatedModel = projectileModelFor(treatedBuild, { ...atts, ammo: ammoId });
    if (!standardModel || !treatedModel) continue;
    covered++;
    const label = `${weapon.id}/${ammoId}`;

    assert.equal(treatedModel.velocityMps, treatedBuild.bulletVel, `${label} model velocity`);
    assert.ok(flightTimeAtDistance(treatedModel, distance) > flightTimeAtDistance(standardModel, distance),
      `${label} should take longer to reach ${distance}m`);
    assert.ok(trajectoryAtDistance(treatedModel, distance).yMeters < trajectoryAtDistance(standardModel, distance).yMeters,
      `${label} should drop further by ${distance}m`);
  }
  assert.ok(covered > 0, 'expected at least one treated pair with a projectile model');
});
