import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';
import {
  hiddenRecoilAmountBase,
  matchesDisplayOneDecimal,
  normalizeWeaponName,
} from './audit-phase0-lib.mjs';
import {
  assertGripCorrectionRegister,
  assertOnlyApprovedOutputDelta,
  getGripCorrectionRegister,
  restoreApprovedGripCorrections,
  selectedCorrectionRecord,
} from './grip-pod-correction-deltas.mjs';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const review = readJson('migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json');
const gripById = new Map(attachments.GRIPS.map(grip => [grip.id, grip]));
const weaponByName = new Map(weapons.map(weapon => [normalizeWeaponName(weapon.name), weapon]));
const gripRecords = review.records.filter(record => record.attachmentType === 'Grip');
const restoredAttachments = restoreApprovedGripCorrections(attachments);

const resolverContext = model => ({
  MUZZLES: model.MUZZLES,
  BARRELS: model.BARRELS,
  GRIPS: model.GRIPS,
  LASERS: model.LASERS,
  LIGHTS: model.LIGHTS,
  ERGOS: model.ERGOS,
  WEAPON_MAG: model.WEAPON_MAG,
  WEAPON_ERGO: model.WEAPON_ERGO,
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
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
});

const sniperNames = [
  'L115',
  'M2010 ESR',
  'Mini Scout',
  'PSR',
  'SV-98',
];
const sniperCostByName = new Map([
  ['None', 0],
  ['Low-Profile Stubby', 10],
  ['Slim Angled', 15],
  ['Full Angled', 5],
  ['Bipod', 10],
  ['QD Grip Pod', 10],
  ['Classic Grip Pod', 20],
]);
const modelMissingAuditNames = new Set([]);

const expectedApprovedCatalogDiffs = {
  ptt_grip_pod: [
    { field: 'adsRecoilTierMod', before: 0, after: 2, playerVisibleFields: ['_adsRecoilReductionPct', 'recoilV'] },
    { field: 'movingAdsSpreadTierMod', before: 1, after: -1, playerVisibleFields: ['_movingAdsSpreadTierMod', '_movingAdsMinSpreadDeg'] },
    { field: 'pts', before: 10, after: 20, playerVisibleFields: [] },
  ],
  qd_grip_pod: [
    { field: 'adsRecoilTierMod', before: 0, after: 2, playerVisibleFields: ['_adsRecoilReductionPct', 'recoilV'] },
    { field: 'movingAdsSpreadTierMod', before: 1, after: 0, playerVisibleFields: ['_movingAdsSpreadTierMod', '_movingAdsMinSpreadDeg'] },
    { field: 'adsTimeTierMod', before: 1, after: 0, playerVisibleFields: ['_adsTimeTierMod', '_adsTimeMs'] },
    { field: 'pts', before: 10, after: 30, playerVisibleFields: [] },
  ],
  classic_grip_pod: [
    { field: 'adsRecoilTierMod', before: 0, after: 2, playerVisibleFields: ['_adsRecoilReductionPct', 'recoilV'] },
    { field: 'movingAdsSpreadTierMod', before: 0, after: -1, playerVisibleFields: ['_movingAdsSpreadTierMod', '_movingAdsMinSpreadDeg'] },
    { field: 'adsTimeTierMod', before: 0, after: 1, playerVisibleFields: ['_adsTimeTierMod', '_adsTimeMs'] },
    { field: 'pts', before: 20, after: 30, playerVisibleFields: [] },
    { field: 'noEffect', before: true, after: null, afterPresent: false, playerVisibleFields: [] },
  ],
  qd_grip_pod_sr: [
    { field: 'movingAdsSpreadTierMod', before: 1, after: -1, playerVisibleFields: ['_movingAdsSpreadTierMod', '_movingAdsMinSpreadDeg'] },
    { field: 'pts', before: 30, after: 10, playerVisibleFields: [] },
  ],
  classic_grip_pod_sr: [
    { field: 'pts', before: 30, after: 20, playerVisibleFields: [] },
  ],
};

function normalizedPath(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function recordsFor(name, predicate = () => true) {
  return gripRecords.filter(record => record.attachmentName === name && predicate(record));
}

// Captures are taken on the weapon's factory build, so a default ammunition
// card that shifts recoil is part of every displayed value. Standard ammo is
// neutral, but the VSSM ships Range Pen, which costs one recoil tier.
function defaultAmmoRecoilTierMod(weaponId) {
  const defaultAmmoId = ammo.WEAPON_AMMO?.[weaponId]?.def ?? 'standard';
  return ammo.AMMO.find(entry => entry.id === defaultAmmoId)?.adsRecoilTierMod ?? 0;
}

function assertRecoilTier(record, expectedTier) {
  const weapon = weaponByName.get(normalizeWeaponName(record.weaponName));
  assert.ok(weapon, `${record.weaponName} is not in the modeled weapon catalog`);
  const multiplier = balance.RECOIL_MULT?.[weapon.id];
  assert.ok(multiplier, `${weapon.id} has no recoil multiplier`);
  expectedTier += defaultAmmoRecoilTierMod(weapon.id);
  const observed = record.stats?.recoilAmountDegrees;
  assert.notEqual(observed, null, `${record.weaponName}/${record.attachmentName} has no reviewed recoil amount`);
  const matchingTiers = [];
  for (let tier = -8; tier <= 8; tier += 1) {
    if (matchesDisplayOneDecimal(hiddenRecoilAmountBase(weapon) * (multiplier ** tier), observed)) {
      matchingTiers.push(tier);
    }
  }
  assert.ok(
    matchingTiers.includes(expectedTier),
    `${record.weaponName}/${record.attachmentName} displayed recoil ${observed} must include tier ${expectedTier}; matching display tiers: ${matchingTiers.join(', ')}`,
  );
}

function assertDirectPairedRecoil(record, expectedTier = null) {
  const baseline = gripRecords.find(candidate => (
    candidate.weaponName === record.weaponName && candidate.attachmentName === 'None'
  ));
  assert.ok(baseline, `${record.weaponName}/${record.attachmentName} has no direct None grip pairing`);
  assert.notEqual(record.stats?.recoilAmountDegrees, null, `${record.weaponName}/${record.attachmentName} lacks reviewed recoil`);
  assert.notEqual(baseline.stats?.recoilAmountDegrees, null, `${record.weaponName}/None lacks reviewed recoil`);
  assert.ok(
    record.stats.recoilAmountDegrees <= baseline.stats.recoilAmountDegrees,
    `${record.weaponName}/${record.attachmentName} must not increase the directly paired recoil card value`,
  );
  if (expectedTier !== null && weaponByName.has(normalizeWeaponName(record.weaponName))) {
    assertRecoilTier(record, expectedTier);
  }
}

test('sniper grip receipts retain captured costs, identities, and screenshot paths', () => {
  const rows = gripRecords.filter(record => normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
  assert.equal(rows.length, 35, 'five weapons times seven captured grip cards');

  for (const weaponName of sniperNames) {
    const weaponRows = rows.filter(record => record.weaponName === weaponName);
    assert.equal(weaponRows.length, 7, `${weaponName} sniper grip coverage`);
    for (const [attachmentName, expectedCost] of sniperCostByName) {
      const matches = weaponRows.filter(record => record.attachmentName === attachmentName);
      assert.equal(matches.length, 1, `${weaponName}/${attachmentName} identity`);
      const [record] = matches;
      assert.equal(record.attachmentCost, expectedCost, `${weaponName}/${attachmentName} captured cost`);
      assert.equal(record.attachmentType, 'Grip');
      const token = attachmentName.replaceAll(' ', '_');
      assert.match(normalizedPath(record.source?.currentPath), new RegExp(`/Sniper Rifle/${weaponName}/[^/]*_Grip_${token}\\.png$`));
      assert.match(normalizedPath(record.source?.originalPath), new RegExp(`/Sniper Rifle/${weaponName}/[^/]*_Grip_${token}\\.png$`));
    }
  }
});

test('Grip Pod correction register exactly covers the approved live catalog diffs', () => {
  const register = getGripCorrectionRegister();
  assert.deepEqual(
    Object.fromEntries(register.records.map(record => [record.id, record.changedCatalogFields])),
    expectedApprovedCatalogDiffs,
    'a missing or extra catalog correction must fail the focused register check',
  );

  for (const [id, changes] of Object.entries(expectedApprovedCatalogDiffs)) {
    const live = gripById.get(id);
    const restored = restoredAttachments.GRIPS.find(grip => grip.id === id);
    assert.ok(live, `missing live catalog record ${id}`);
    assert.ok(restored, `missing restored catalog record ${id}`);
    for (const change of changes) {
      assert.equal(restored[change.field], change.before, `${id}/${change.field} approved before value`);
      if (change.afterPresent === false) {
        assert.equal(Object.hasOwn(live, change.field), false, `${id}/${change.field} must be removed`);
      } else {
        assert.equal(live[change.field], change.after, `${id}/${change.field} live after value`);
      }
    }
  }
});

test('standard Grip Pods are direct-paired tier 2 cards and preserve the four audit-only pairs', () => {
  const expected = new Map([
    ['PTT Grip Pod', { count: 32, cost: 20 }],
    ['QD Grip Pod', { count: 32, cost: 30 }],
    ['Classic Grip Pod', { count: 32, cost: 30 }],
  ]);
  for (const [name, expectation] of expected) {
    const rows = recordsFor(name, record => !normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
    assert.equal(rows.length, expectation.count, `${name} direct-card coverage`);
    for (const record of rows) assertDirectPairedRecoil(record, 2);
    assert.deepEqual(
      [...new Set(rows.filter(record => !weaponByName.has(normalizeWeaponName(record.weaponName))).map(record => record.weaponName))].sort(),
      [...modelMissingAuditNames].sort(),
      `${name} audit-only weapon names are explicit rather than inferred`,
    );
    assert.ok(rows.every(record => record.attachmentCost === expectation.cost), `${name} direct-card cost`);
  }
});

test('sniper Grip Pods and bipods stay at static recoil tier 0', () => {
  for (const name of ['QD Grip Pod', 'Classic Grip Pod']) {
    const rows = recordsFor(name, record => normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
    assert.equal(rows.length, 5, `${name} sniper coverage`);
    for (const record of rows) assertRecoilTier(record, 0);
  }
  for (const name of ['Bipod']) {
    const standardRows = recordsFor(name, record => !normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
    const sniperRows = recordsFor(name, record => normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
    assert.equal(standardRows.length, 30, 'standard Bipod direct-card coverage');
    assert.equal(sniperRows.length, 5, 'sniper Bipod direct-card coverage');
    for (const record of standardRows) assertDirectPairedRecoil(record, 0);
    for (const record of sniperRows) assertRecoilTier(record, 0);
  }
  const bipodSrRows = recordsFor('Bipod', record => normalizedPath(record.source?.currentPath).includes('/Sniper Rifle/'));
  assert.equal(bipodSrRows.length, 5);
});

test('catalog Grip Pod fields use resolver signs and amended captured costs', () => {
  const expected = {
    ptt_grip_pod: { recoil: 2, moving: -1, adsTime: 0, pts: 20 },
    qd_grip_pod: { recoil: 2, moving: 0, adsTime: 0, pts: 30 },
    classic_grip_pod: { recoil: 2, moving: -1, adsTime: 1, pts: 30 },
    qd_grip_pod_sr: { recoil: 0, moving: -1, adsTime: 1, pts: 10 },
    classic_grip_pod_sr: { recoil: 0, moving: 0, adsTime: 1, pts: 20 },
    bipod: { recoil: 0, moving: 0, adsTime: 0, pts: 10 },
    bipod_sr: { recoil: 0, moving: 0, adsTime: 0, pts: 10 },
  };
  for (const [id, fields] of Object.entries(expected)) {
    const grip = gripById.get(id);
    assert.ok(grip, `missing catalog grip ${id}`);
    assert.equal(grip.adsRecoilTierMod, fields.recoil, `${id} recoil tier`);
    assert.equal(grip.movingAdsSpreadTierMod, fields.moving, `${id} moving-ADS sign`);
    assert.equal(grip.adsTimeTierMod, fields.adsTime, `${id} ADS-time tier`);
    assert.equal(grip.pts, fields.pts, `${id} captured cost`);
  }
  assert.equal(Object.hasOwn(gripById.get('classic_grip_pod'), 'noEffect'), false);
  assert.equal(gripById.get('bipod').noEffect, true);
  assert.equal(gripById.get('bipod_sr').noEffect, true);
});

test('SMG Slim Angled retains its no-draw contract', () => {
  const grip = gripById.get('slim_angled_smg');
  assert.ok(grip);
  assert.equal(grip.adsRecoilTierMod, 1);
  assert.equal(grip.adsTimeTierMod, 1);
  assert.equal(grip.movingAdsSpreadTierMod, 0);
  assert.equal(grip.sprintRecoveryTierShift, 0);
  assert.equal(grip.pts, 20);

  const rows = recordsFor('Slim Angled', record => normalizedPath(record.source?.currentPath).includes('/SMG/'));
  assert.equal(rows.length, 8, 'SMG Slim Angled direct-card coverage');
  for (const record of rows) {
    assert.equal(record.attachmentCost, 20, `${record.weaponName} SMG Slim Angled cost`);
    const baseline = gripRecords.find(candidate => candidate.weaponName === record.weaponName && candidate.attachmentName === 'None');
    assert.ok(baseline, `${record.weaponName} SMG None pairing`);
    assert.equal(record.stats.sprintRecoveryMs, baseline.stats.sprintRecoveryMs, `${record.weaponName} no sprint/draw shift`);
  }
});

test('registered Grip Pod corrections are the only legal resolver deltas', () => {
  assertGripCorrectionRegister();
  const register = getGripCorrectionRegister();
  const seen = new Map();
  const observedValues = new Map();
  setAttachmentContext(resolverContext(attachments));

  for (const weapon of [...weapons].sort((left, right) => left.id.localeCompare(right.id))) {
    const weaponAtts = attachments.WEAPON_ATTS[weapon.id] ?? {};
    const gripIds = (weaponAtts.laserGripLightCombined
      ? (weaponAtts.laser ?? []).filter(id => gripById.has(id))
      : (weaponAtts.grip ?? [])).filter(id => gripById.has(id));
    const magazineIds = Object.keys(attachments.WEAPON_MAG[weapon.id]?.mags ?? {}).sort();
    const ammoIds = Object.keys(ammo.WEAPON_AMMO[weapon.id]?.ammo ?? {}).sort();
    const ergoIds = ['none', ...(attachments.WEAPON_ERGO[weapon.id]?.avail ?? [])];
    assert.ok(magazineIds.length, `${weapon.id} has a legal magazine for Grip Pod witness`);
    assert.ok(ammoIds.length, `${weapon.id} has a legal ammo type for Grip Pod witness`);

    for (const gripId of ['none', ...gripIds]) {
      for (const ergoId of ergoIds) {
        const atts = blankAtts();
        atts.barrel = weaponAtts.barrelDef ?? 'none';
        atts.mag = magazineIds[0];
        atts.ammo = ammoIds[0];
        atts.ergo = ergoId;
        if (weaponAtts.laserGripLightCombined) atts.laser = gripId;
        else atts.grip = gripId;

        setAttachmentContext(resolverContext(attachments));
        const after = applyAttachments(weapon, atts);
        setAttachmentContext(resolverContext(restoredAttachments));
        const before = applyAttachments(weapon, atts);
        const record = selectedCorrectionRecord(weapon.id, atts, attachments);
        if (!record) {
          assert.deepEqual(after, before, `${weapon.id}/${gripId} unregistered Grip Pod delta`);
          continue;
        }

        const delta = assertOnlyApprovedOutputDelta(before, after, record);
        for (const field of ['_sprintRecoveryMs', '_deployTimeMs', 'deployT']) {
          assert.equal(after[field], before[field], `${weapon.id}/${gripId} changed ${field}`);
        }
        seen.set(record.id, (seen.get(record.id) ?? 0) + 1);
        const values = observedValues.get(record.id) ?? new Map();
        for (const field of delta.changedFields) {
          values.set(field, JSON.stringify({ before: before[field], after: after[field] }));
        }
        observedValues.set(record.id, values);
      }
    }
  }
  setAttachmentContext(resolverContext(attachments));

  assert.deepEqual([...seen.keys()].sort(), register.records.map(record => record.id).sort());
  for (const record of register.records) {
    assert.ok((seen.get(record.id) ?? 0) > 0, `${record.id} was not exercised by a legal selection`);
    for (const field of [...(new Set(record.changedCatalogFields.flatMap(change => change.playerVisibleFields)))]) {
      assert.ok(observedValues.get(record.id)?.has(field) || record.changedCatalogFields.every(change => !change.playerVisibleFields.includes(field)), `${record.id}/${field} was not observed`);
    }
  }
  console.log(`Grip Pod correction delta selections: ${JSON.stringify(Object.fromEntries([...seen.entries()].sort()))}`);
  console.log(`Grip Pod correction player-visible values: ${JSON.stringify(Object.fromEntries([...observedValues.entries()].sort().map(([id, values]) => [id, Object.fromEntries([...values.entries()].sort())])))}`);
});
