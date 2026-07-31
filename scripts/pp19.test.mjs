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
  resolveReloadTiming,
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

const baseAttachmentContext = {
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
};

setAttachmentContext(baseAttachmentContext);

function withAttachmentContext(overrides, callback) {
  setAttachmentContext({ ...baseAttachmentContext, ...overrides });
  try {
    return callback();
  } finally {
    setAttachmentContext(baseAttachmentContext);
  }
}

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
  assert.equal(pp19.reloadSpeed, 0.979732);
  assert.equal(pp19.tacRld, 2.467);
  assert.equal(pp19.emptyRld, 3.028);
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

test('PP-19 attachment catalogs contain the reviewed seven-slot backfill', () => {
  assert.deepEqual(attachments.WEAPON_ATTS.pp19, {
    muzzle: ['flash_hider', 'flash_comp', 'dp_brake', 'comp_brake', 'linear_comp', 'cqb_supp'],
    barrel: ['basic', 'light', 'extended', 'heavy'],
    barrelDef: 'basic',
    grip: [
      'fold_vert', 'alloy_vert', 'ribbed_vert', '6h64_vert', 'classic_vert',
      'fold_stubby', 'ribbed_stubby', 'canted_stubby', 'stipp_stubby', 'lp_stubby',
      'cmpct_handstop', 'slim_angled_smg',
    ],
    laser: ['5mw_red', '50mw_violet', '5mw_green', '50mw_green', '50mw_blue', '120mw_blue'],
    light: ['ads_taclight', 'flashlight', 'hip_taclight'],
  });
  assert.deepEqual(attachments.WEAPON_ERGO.pp19, {
    avail: ['mag_catch', 'buffer'],
    magCatchRld: { reg: 2321, fast: 2054 },
  });
  assert.deepEqual(attachments.WEAPON_MAG.pp19, {
    defAds: 3,
    defSpr: 3,
    defAms: 3,
    def: '30_rnd',
    mags: {
      '30_rnd': {
        name: '30 Rnd', pts: 5, mag: 30, tacRld: 2467,
        adsTimeTierShift: 0, sprintRecoveryTierShift: -1, adsMoveSpeedTierShift: 0,
      },
      '30_fast': {
        name: '30 Fast', pts: 5, mag: 30, tacRld: 2183,
        adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 0,
      },
      '35_rnd': {
        name: '35 Rnd', pts: 15, mag: 35, tacRld: 2467,
        adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 1,
      },
      '20_fast': {
        name: '20 Fast', pts: 5, mag: 20, tacRld: 2467,
        adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 0,
      },
      '53_rnd': {
        name: '53 Rnd', pts: 45, mag: 53, tacRld: 2667,
        adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 1,
      },
    },
    baseSprintRecoveryTier: 4,
    weaponSprintRecoveryTierShift: -1,
    sprintRecoveryTierTable: 'primary',
  });
  for (const id of ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby']) {
    assert.equal(Object.hasOwn(attachments.GRIPS.find(grip => grip.id === id), 'adsMoveSpeedTierShift'), false, `${id} must remain unshifted in this backfill`);
  }
  assert.deepEqual(ammo.WEAPON_AMMO.pp19, { def: 'standard', ammo: { standard: 0 } });
  assert.equal(recoilDecay.RECOIL_DEC.pp19, 55);
  assert.equal(recoilDecay.RECOIL_DEC_TEXP.pp19, 1.023);
  assert.equal(balance.RECOIL_MULT.pp19, 0.9333);
  assert.equal(balance.HIP_CLS.pp19, 'Class B');
  assert.equal(balance.LIMB_CLASS.pp19, 'auto');
  assert.equal(provenance.capture.status, 'not-recorded');
  assert.equal(provenance.attachmentCoverage.status, 'needs measurement');
});

test('PP-19 magazine and ergonomic values resolve to the reviewed legacy outputs', () => {
  const apply = ({ mag, grip = 'none', ergo = 'none' }) => {
    const atts = blankAtts();
    atts.barrel = 'basic';
    atts.mag = mag;
    atts.grip = grip;
    atts.ergo = ergo;
    return applyAttachments(pp19, atts);
  };
  const expected = {
    '30_rnd': { tacRld: 2.467, mag: 30, ads: 167, sprint: 100, move: 0.75 },
    '30_fast': { tacRld: 2.183, mag: 30, ads: 167, sprint: 133, move: 0.75 },
    '35_rnd': { tacRld: 2.467, mag: 35, ads: 167, sprint: 133, move: 0.67 },
    // x1.00 is a reviewed source value, but the current table has no 1.0 rung;
    // Phase 2b-i owns that separate table/index migration.
    '20_fast': { tacRld: 2.467, mag: 20, ads: 167, sprint: 133, move: 0.75 },
    '53_rnd': { tacRld: 2.667, mag: 53, ads: 167, sprint: 133, move: 0.67 },
  };
  for (const [mag, values] of Object.entries(expected)) {
    const applied = apply({ mag });
    assert.equal(applied.tacRld, values.tacRld, `${mag} tactical reload`);
    assert.equal(applied.mag, values.mag, `${mag} capacity`);
    assert.equal(applied._adsTimeMs, values.ads, `${mag} ADS time`);
    assert.equal(applied._sprintRecoveryMs, values.sprint, `${mag} sprint recovery`);
    assert.equal(applied._adsMoveSpeedMult, values.move, `${mag} ADS move`);
  }
  assert.equal(apply({ mag: '30_rnd', ergo: 'mag_catch' }).tacRld, 2.321);
  assert.equal(apply({ mag: '30_rnd', ergo: 'buffer' }).tacRld, 2.467);
  // The legacy name-based branch is intentionally wrong for this one combination;
  // the receipt preserves the true 2.321 s value for Phase 2's derived branch.
  assert.equal(apply({ mag: '20_fast', ergo: 'mag_catch' }).tacRld, 2.054);
});

test('Phase 2 dual-read preserves legacy precedence and branch selection', () => {
  const none = attachments.ERGOS.find(ergo => ergo.id === 'none');
  const magCatch = attachments.ERGOS.find(ergo => ergo.id === 'mag_catch');
  const weaponErgo = attachments.WEAPON_ERGO.pp19;
  const resolve = (mag, ergo = none) => resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    magData: attachments.WEAPON_MAG.pp19.mags[mag],
    ergoData: ergo,
    weaponErgo,
  });

  assert.deepEqual(resolve('30_rnd'), {
    tacRld: 2.467,
    branch: 'legacy',
    reason: 'no-derived-fields',
  });
  assert.deepEqual(resolve('30_rnd', magCatch), {
    tacRld: 2.321,
    branch: 'legacy',
    reason: 'no-derived-fields',
  });
  assert.deepEqual(resolve('20_fast', magCatch), {
    tacRld: 2.054,
    branch: 'legacy',
    reason: 'no-derived-fields',
  });
});

test('Phase 2 derived reload uses explicit numeric tiers and ergonomic multipliers', () => {
  const tierResults = [0, 1, 2].map(reloadSpeedTier => resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    // Deliberately conflicting names and tacRld values prove the derived path
    // reads the numeric tier rather than inferring from display text.
    magData: {
      name: reloadSpeedTier === 1 ? 'Regular Magazine' : 'Fast Magazine',
      tacRld: 1111,
      reloadSpeedTier,
    },
    ergoData: { id: 'none' },
  }));
  assert.deepEqual(tierResults.map(result => result.tacRld), [2.467, 2.183, 1.932]);
  assert.deepEqual(tierResults.map(result => result.branch), ['derived', 'derived', 'derived']);
  assert.deepEqual(tierResults.map(result => result.mode), ['normal', 'normal', 'normal']);

  const ergonomic = resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    magData: { name: 'Regular Magazine', tacRld: 1111 },
    ergoData: { id: 'synthetic_ergo', reloadSpeedMult: 1.063 },
  });
  assert.deepEqual(ergonomic, {
    tacRld: 2.321,
    branch: 'derived',
    mode: 'normal',
    reason: 'derived-normal',
  });
});

test('Phase 2 override and invalid-input guards fail closed', () => {
  const override = resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    magData: { name: '53 Rnd', tacRld: 1111, tacRldOverrideMs: 2667 },
    ergoData: { id: 'none' },
  });
  assert.deepEqual(override, {
    tacRld: 2.667,
    branch: 'derived',
    mode: 'override',
    reason: 'derived-override',
  });

  const unresolvedStack = resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    magData: { name: '20 Fast', tacRld: 2467, tacRldOverrideMs: 2667 },
    ergoData: { id: 'mag_catch' },
    weaponErgo: attachments.WEAPON_ERGO.pp19,
  });
  assert.deepEqual(unresolvedStack, {
    tacRld: 2.054,
    branch: 'legacy',
    reason: 'unresolved-override-stack',
  });

  for (const [label, input] of [
    ['negative tier', { magData: { tacRld: 2467, reloadSpeedTier: -1 }, ergoData: { id: 'none' } }],
    ['string tier', { magData: { tacRld: 2467, reloadSpeedTier: '1' }, ergoData: { id: 'none' } }],
    ['zero override', { magData: { tacRld: 2467, tacRldOverrideMs: 0 }, ergoData: { id: 'none' } }],
    ['non-finite multiplier', { magData: { tacRld: 2467 }, ergoData: { id: 'synthetic_ergo', reloadSpeedMult: NaN } }],
  ]) {
    const result = resolveReloadTiming({ weaponTacRld: pp19.tacRld, ...input });
    assert.equal(result.branch, 'legacy', label);
    assert.equal(result.reason, 'invalid-derived-input', label);
    assert.equal(result.tacRld, 2.467, label);
  }
});

test('PP-19 derived fixture resolves through applyAttachments without production promotion', () => {
  assert.equal(
    Object.values(attachments.WEAPON_MAG).some(weaponMag => Object.values(weaponMag.mags ?? {})
      .some(mag => Object.hasOwn(mag, 'reloadSpeedTier') || Object.hasOwn(mag, 'tacRldOverrideMs'))),
    false,
  );
  assert.equal(attachments.ERGOS.some(ergo => Object.hasOwn(ergo, 'reloadSpeedMult')), false);

  const derivedMagId = 'synthetic_20_fast';
  const syntheticMag = {
    ...attachments.WEAPON_MAG.pp19,
    mags: {
      ...attachments.WEAPON_MAG.pp19.mags,
      [derivedMagId]: {
        ...attachments.WEAPON_MAG.pp19.mags['20_fast'],
        reloadSpeedTier: 0,
      },
    },
  };
  const syntheticErgos = attachments.ERGOS.map(ergo => ergo.id === 'mag_catch'
    ? { ...ergo, reloadSpeedMult: 1.063 }
    : ergo);
  const atts = blankAtts();
  atts.barrel = 'basic';
  atts.mag = derivedMagId;
  atts.ergo = 'mag_catch';

  const branch = resolveReloadTiming({
    weaponTacRld: pp19.tacRld,
    magData: syntheticMag.mags[derivedMagId],
    ergoData: syntheticErgos.find(ergo => ergo.id === 'mag_catch'),
    weaponErgo: attachments.WEAPON_ERGO.pp19,
  });
  assert.equal(branch.branch, 'derived');
  assert.equal(branch.tacRld, 2.321);

  const applied = withAttachmentContext({
    ERGOS: syntheticErgos,
    WEAPON_MAG: { ...attachments.WEAPON_MAG, pp19: syntheticMag },
  }, () => applyAttachments(pp19, atts));
  assert.equal(applied.tacRld, 2.321);

  const productionLegacy = applyAttachments(pp19, {
    ...atts,
    mag: '20_fast',
  });
  assert.equal(productionLegacy.tacRld, 2.054);
});

test('PP-19 default audited loadout and comparison input remain serializable', () => {
  const atts = blankAtts();
  resetAttsForWeapon(atts, pp19, {
    WEAPON_ATTS: attachments.WEAPON_ATTS,
    WEAPON_AMMO: ammo.WEAPON_AMMO,
    WEAPON_MAG: attachments.WEAPON_MAG,
  });
  assert.deepEqual(atts, {
    sight: 'iron',
    muzzle: 'none',
    barrel: 'basic',
    grip: 'none',
    laser: 'none',
    light: 'none',
    ammo: 'standard',
    mag: '30_rnd',
    ergo: 'none',
  });

  const applied = applyAttachments(pp19, atts);
  assert.equal(applied.bulletVel, 444);
  assert.equal(applied.mag, 30);
  assert.equal(applied.tacRld, 2.467);
  assert.equal(applied.deployT, 0.4);
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
  assert.equal(restored.slots[0].atts.mag, '30_rnd');
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
