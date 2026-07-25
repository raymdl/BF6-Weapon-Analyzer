import { readFileSync } from 'node:fs';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setAttachmentContext,
  applyAttachments,
} from '../sim/applyAttachments.js';
import {
  blankAtts,
  resetAttsForWeapon,
} from '../sim/loadout.js';
import { createShareCodec } from '../sim/share-state.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const weapons = readJson('data/weapons.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');
const balance = readJson('data/balance_tables.json');
const provenance = readJson('data/provenance/pp19-1.3.3.0.json');
const pp19 = weapons.find(weapon => weapon.id === 'pp19');
const pw5a3 = weapons.find(weapon => weapon.id === 'pw5a3');

setAttachmentContext({
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  ERGOS: attachments.ERGOS,
  WEAPON_MAG: attachments.WEAPON_MAG,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
  AMMO: ammo.AMMO,
  RECOIL_MULT: balance.RECOIL_MULT,
  HIP_SPREAD_TIERS: balance.HIP_SPREAD_TIERS,
  HIP_SPREAD_BASE_IDX: balance.HIP_SPREAD_BASE_IDX,
  HIP_CLS: balance.HIP_CLS,
  BASE_HS_MULT: balance.BASE_HS_MULT,
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
});

test('PP-19 is the 59th firearm in the SMG order', () => {
  assert.equal(weapons.length, 59);
  const czIndex = weapons.findIndex(weapon => weapon.id === 'cz3a1');
  assert.equal(weapons[czIndex + 1]?.id, 'pp19');
  assert.equal(pp19.name, 'PP-19');
  assert.equal(pp19.cls, 'SMG');
  assert.equal(pp19.cal, '9×19mm');
  assert.equal(pp19.fireMode, 'auto');
});

test('PP-19 base values match the pinned normalized Sym row and damage stays provisional', () => {
  assert.equal(pp19.rpm, 719.999);
  assert.equal(pp19.mag, 31);
  assert.equal(pp19.tacRld, 2.417);
  assert.equal(pp19.emptyRld, 2.967);
  assert.equal(pp19.deployT, 0.466667);
  assert.equal(pp19.bulletVel, 444);
  assert.equal(pp19.recoilDir, 6);
  assert.equal(pp19.recoilVar, 18);
  assert.equal(pp19.recoilIncAds, 0.28);
  assert.equal(pp19.recoil.ads.amount, 0.4418);
  assert.equal(pp19.recoil.ads.amountMult, 0.9333);
  assert.equal(pp19.recoil.ads.amountExp, -3);
  assert.equal(pp19.recoil.ads.decFactor, 55);
  assert.equal(pp19.recoil.ads.decTimeExp, 1.023);
  assert.deepEqual(pp19.spread.adsStand, [0.05, 6]);
  assert.deepEqual(pp19.spread.adsMove, [0.32, 6]);
  assert.deepEqual(pp19.spread.hipStand, [1.804, 6]);
  assert.deepEqual(pp19.spread.hipMove, [2.255, 6]);
  assert.equal(pp19.spreadDyn.ads.inc, 0.28);
  assert.equal(pp19.spreadDyn.hip.inc, 0.547);
  assert.equal(pp19.damageStatus, 'provisional');
  // PP-19 now carries its own Sym curve; that it still equals PW5A3's is the
  // source-side confirmation of the shared model the user reported.
  assert.match(pp19.damageSource, /Sym\.gg 1\.3\.3\.0 game-file curve/);
  assert.deepEqual(pp19.dmg, pw5a3.dmg);
  assert.deepEqual(pp19.dmg, [
    { r: 0, d: 26.05, source: 'Sym' },
    { r: 9, d: 26.05, source: 'Sym' },
    { r: 9, d: 20.67, source: 'Sym' },
    { r: 21, d: 20.67, source: 'Sym' },
    { r: 21, d: 17.13, source: 'Sym' },
    { r: 36, d: 17.13, source: 'Sym' },
    { r: 36, d: 14.62, source: 'Sym' },
    { r: 75, d: 14.62, source: 'Sym' },
    { r: 75, d: 12.76, source: 'Sym' },
  ]);
  assert.equal(provenance.damage.status, 'provisional-community-tested');
  assert.deepEqual(provenance.damage.breakpoints, pp19.dmg);
});

test('PP-19 cross-file entries are present and fail closed on unknown attachments', () => {
  assert.deepEqual(attachments.WEAPON_ATTS.pp19, {
    muzzle: [],
    barrel: [],
    grip: [],
    laser: [],
    light: [],
  });
  assert.deepEqual(attachments.WEAPON_ERGO.pp19, { avail: [] });
  assert.deepEqual(attachments.WEAPON_MAG.pp19, { def: null, mags: {} });
  assert.deepEqual(ammo.WEAPON_AMMO.pp19, { def: 'standard', ammo: { standard: 0 } });
  assert.equal(recoilDecay.RECOIL_DEC.pp19, 55);
  assert.equal(recoilDecay.RECOIL_DEC_TEXP.pp19, 1.023);
  assert.equal(balance.RECOIL_MULT.pp19, 0.9333);
  assert.equal(balance.HIP_CLS.pp19, 'Class B');
  assert.equal(balance.LIMB_CLASS.pp19, 'auto');
  assert.equal(provenance.capture.status, 'not-recorded');
  assert.equal(provenance.attachmentCoverage.status, 'needs measurement');
});

test('PP-19 default loadout and comparison input remain serializable without guessed attachments', () => {
  const atts = blankAtts();
  resetAttsForWeapon(atts, pp19, {
    WEAPON_ATTS: attachments.WEAPON_ATTS,
    WEAPON_AMMO: ammo.WEAPON_AMMO,
    WEAPON_MAG: attachments.WEAPON_MAG,
  });
  assert.deepEqual(atts, {
    sight: 'iron',
    muzzle: 'none',
    barrel: 'none',
    grip: 'none',
    laser: 'none',
    light: 'none',
    ammo: 'standard',
    mag: null,
    ergo: 'none',
  });

  const applied = applyAttachments(pp19, atts);
  assert.equal(applied.bulletVel, 444);
  assert.equal(applied.mag, 31);
  assert.equal(applied.tacRld, 2.417);
  assert.equal(applied.deployT, 0.466667);
  assert.ok(Number.isFinite(applied.recoilV));
  assert.equal(applied.fireMode, 'auto');

  const defaultAttsForWeapon = weapon => {
    const value = blankAtts();
    resetAttsForWeapon(value, weapon, {
      WEAPON_ATTS: attachments.WEAPON_ATTS,
      WEAPON_AMMO: ammo.WEAPON_AMMO,
      WEAPON_MAG: attachments.WEAPON_MAG,
    });
    return value;
  };
  const shareCodec = createShareCodec({
    SIGHTS: attachments.SIGHTS,
    MUZZLES: attachments.MUZZLES,
    BARRELS: attachments.BARRELS,
    GRIPS: attachments.GRIPS,
    LASERS: attachments.LASERS,
    LIGHTS: attachments.LIGHTS,
    AMMO: ammo.AMMO,
    ERGOS: attachments.ERGOS,
    WEAPON_MAG: attachments.WEAPON_MAG,
    defaultAttsForWeapon,
  });
  const sourceState = {
    slots: [
      { cls: pp19.cls, weapon: pp19, atts: defaultAttsForWeapon(pp19) },
      { cls: pp19.cls, weapon: pp19, atts: defaultAttsForWeapon(pp19) },
    ],
    comparing: true,
    chart: { mode: 'btk', btkHS: 2, showAds: false },
    recoil: {
      aim: 'hip', stance: 'move', platform: 'console', control: true,
      compensationLevel: 72,
    },
  };
  const share = shareCodec.encodeState(sourceState, () => 20);
  const restored = {
    slots: [
      { cls: 'Assault Rifle', weapon: null, atts: blankAtts() },
      { cls: 'Assault Rifle', weapon: null, atts: blankAtts() },
    ],
    comparing: false,
    chart: { mode: 'dmg', btkHS: 0, showAds: false },
    recoil: { aim: 'ads', stance: 'stand', platform: 'pc', control: false, compensationLevel: 85 },
  };
  const params = shareCodec.restoreFromHash(restored, `#${share}`, weapons);
  assert.ok(params instanceof URLSearchParams);
  assert.equal(restored.slots[0].weapon.id, 'pp19');
  assert.equal(restored.slots[1].weapon.id, 'pp19');
  assert.equal(restored.slots[0].atts.mag, null);
  assert.equal(restored.comparing, true);
  assert.deepEqual(restored.chart, { mode: 'btk', btkHS: 2, showAds: false });
  assert.equal(restored.recoil.aim, 'hip');
  assert.equal(restored.recoil.stance, 'move');
  assert.equal(restored.recoil.platform, 'console');
  assert.equal(restored.recoil.compensationLevel, 72);
});

test('release validator rejects a 58-weapon fixture with PP-19 removed', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'bf6-pp19-validator-'));
  try {
    cpSync(join(root, 'data'), join(fixtureRoot, 'data'), { recursive: true });
    const weaponsWithoutPp19 = weapons.filter(weapon => weapon.id !== 'pp19');
    writeFileSync(join(fixtureRoot, 'data', 'weapons.json'), JSON.stringify(weaponsWithoutPp19, null, 2));
    const result = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
      cwd: root,
      env: { ...process.env, DATA_ROOT: fixtureRoot },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /pp19: required release 1\.3\.3\.0 weapon record is missing/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
