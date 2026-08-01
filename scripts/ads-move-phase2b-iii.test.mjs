import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const baselinePath = join(root, 'scripts/ads-move-phase2b-iii-baseline.json');

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const review = readJson('outputs/attachment-audit/attachment-screenshot-review.json');
const gripById = new Map(attachments.GRIPS.map(grip => [grip.id, grip]));
const ergoById = new Map(attachments.ERGOS.map(ergo => [ergo.id, ergo]));
const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
const barrelById = new Map(attachments.BARRELS.map(barrel => [barrel.id, barrel]));
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

const STANDARD_SHIFTED_GRIPS = ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby'];
const SOURCE_GRIP_NAMES = ['None', '6H64 Vertical', 'Classic Vertical', 'Stippled Stubby', 'Low-Profile Stubby'];
const EXEMPT_SOURCE_WEAPONS = new Set(['SVK-8.6', 'VSSM', '18.5KS-K', 'DB-12']);
const PRE_PHASE3_DIGEST = 'c5a6c3d2c021a44dd04fd3e5bed4366a40674aca1c6e15e6578620be7049b5fe';
const PRE_PHASE4_DIGEST = '08d8da9b78ad0429f292e60ee8808874c9f54b41a4612227d91b09e6b290ad29';
const VARIANT_BASES = {
  svk86: {
    '6h64_vert_svk86': '6h64_vert',
    'classic_vert_svk86': 'classic_vert',
    'stipp_stubby_svk86': 'stipp_stubby',
    'lp_stubby_svk86': 'lp_stubby',
  },
  ks18k: {
    '6h64_vert_ks18k': '6h64_vert',
    'classic_vert_ks18k': 'classic_vert',
    'stipp_stubby_ks18k': 'stipp_stubby',
    'lp_stubby_ks18k': 'lp_stubby',
  },
  db12: {
    '6h64_vert_db12': '6h64_vert',
    'classic_vert_db12': 'classic_vert',
    'stipp_stubby_db12': 'stipp_stubby',
    'lp_stubby_db12': 'lp_stubby',
  },
  vssm: {
    '6h64_vert_vssm': '6h64_vert',
    'classic_vert_vssm': 'classic_vert',
    'stipp_stubby_vssm': 'stipp_stubby',
    'lp_stubby_vssm': 'lp_stubby',
  },
};

const baseContext = {
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
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
};

setAttachmentContext(baseContext);

function clampIndex(rawIndex, table) {
  return Math.max(0, Math.min(table.length - 1, rawIndex));
}

function indexRecord(rawIndex, table) {
  const index = clampIndex(rawIndex, table);
  return { rawIndex, index, clamped: index !== rawIndex, value: table[index] };
}

function selectableGripIds(modelAttachments, weaponId) {
  const weaponAtts = modelAttachments.WEAPON_ATTS[weaponId] ?? {};
  const ids = weaponAtts.laserGripLightCombined
    ? (weaponAtts.laser ?? []).filter(id => gripById.has(id))
    : (weaponAtts.grip ?? []);
  for (const id of ids) assert.ok(gripById.has(id), `${weaponId} references unknown grip ${id}`);
  return ['none', ...ids].sort();
}

function selectableErgoIds(modelAttachments, weaponId) {
  const ids = modelAttachments.WEAPON_ERGO[weaponId]?.avail ?? [];
  for (const id of ids) assert.ok(ergoById.has(id), `${weaponId} references unknown ergo ${id}`);
  return ['none', ...ids].sort();
}

function selectableAmmoIds(weaponId) {
  const ids = Object.keys(ammo.WEAPON_AMMO[weaponId]?.ammo ?? {});
  for (const id of ids) assert.ok(ammoById.has(id), `${weaponId} references unknown ammo ${id}`);
  return ids.sort();
}

function sprintTableFor(weaponMag, modelBalance) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm'
    ? modelBalance.SIDEARM_SPRINT_REC_TIERS
    : modelBalance.PRIMARY_SPRINT_REC_TIERS;
}

function sprintTableNameFor(weaponMag) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm' ? 'sidearm' : 'primary';
}

function deployBaseIndex(weapon, modelBalance) {
  const baseDeployMs = weapon.deployT * 1000;
  let baseIndex = 0;
  for (let i = 1; i < modelBalance.DEPLOY_TIME_TIERS.length; i++) {
    if (Math.abs(modelBalance.DEPLOY_TIME_TIERS[i] - baseDeployMs)
      < Math.abs(modelBalance.DEPLOY_TIME_TIERS[baseIndex] - baseDeployMs)) baseIndex = i;
  }
  return baseIndex;
}

function loadoutFor({ weaponId, barrelId, magazineId, gripId, ergoId, ammoId }) {
  const atts = blankAtts();
  atts.barrel = barrelId;
  atts.mag = magazineId;
  atts.ammo = ammoId;
  atts.ergo = ergoId;
  if (attachments.WEAPON_ATTS[weaponId]?.laserGripLightCombined) atts.laser = gripId;
  else atts.grip = gripId;
  return atts;
}

function buildEnumeration({
  modelAttachments = attachments,
  modelBalance = balance,
  verifyResolver = true,
  kind = 'ads-move-phase2b-iii-post-migration',
} = {}) {
  const modelGripById = new Map(modelAttachments.GRIPS.map(grip => [grip.id, grip]));
  const modelErgoById = new Map(modelAttachments.ERGOS.map(ergo => [ergo.id, ergo]));
  const modelBarrelById = new Map(modelAttachments.BARRELS.map(barrel => [barrel.id, barrel]));
  const rows = [];
  const defSprDistribution = {};
  const tableCaseCounts = { primary: 0, sidearm: 0 };
  const clampCounts = { sprintRecovery: 0, adsMove: 0, adsTime: 0, deploy: 0 };
  const dimensionTotals = { gripChoices: 0, ergoChoices: 0, ammoChoices: 0 };
  let magazineEntryCount = 0;

  for (const weapon of [...weapons].sort((a, b) => a.id.localeCompare(b.id))) {
    const weaponMag = modelAttachments.WEAPON_MAG[weapon.id];
    assert.ok(weaponMag, `missing magazine catalog for ${weapon.id}`);
    const weaponAtts = modelAttachments.WEAPON_ATTS[weapon.id] ?? {};
    const barrelId = weaponAtts.barrelDef ?? 'none';
    assert.ok(modelBarrelById.get(barrelId), `${weapon.id} has unknown default barrel ${barrelId}`);
    const magazineIds = Object.keys(weaponMag.mags ?? {}).sort();
    const gripIds = selectableGripIds(modelAttachments, weapon.id);
    const ergoIds = selectableErgoIds(modelAttachments, weapon.id);
    const ammoIds = selectableAmmoIds(weapon.id);
    const sprintTable = sprintTableFor(weaponMag, modelBalance);
    const sprintTableName = sprintTableNameFor(weaponMag);
    const baseDeployIdx = deployBaseIndex(weapon, modelBalance);
    magazineEntryCount += magazineIds.length;
    dimensionTotals.gripChoices += gripIds.length;
    dimensionTotals.ergoChoices += ergoIds.length;
    dimensionTotals.ammoChoices += ammoIds.length;
    tableCaseCounts[sprintTableName] += magazineIds.length * gripIds.length * ergoIds.length * ammoIds.length;
    defSprDistribution[weaponMag.defSpr] = (defSprDistribution[weaponMag.defSpr] ?? 0) + 1;

    for (const magazineId of magazineIds) for (const gripId of gripIds) for (const ergoId of ergoIds) for (const ammoId of ammoIds) {
      const magazine = weaponMag.mags[magazineId];
      const grip = modelGripById.get(gripId) ?? { id: 'none' };
      const ergo = modelErgoById.get(ergoId) ?? { id: 'none' };
      const ammoType = ammoById.get(ammoId);
      const caseKey = `${weapon.id}/${magazineId}/${gripId}/${ergoId}/${ammoId}`;
      const rawAdsTime = weaponMag.defAds
        + (magazine.adsTimeTierShift ?? 0)
        - (grip.adsTimeTierMod ?? 0)
        - (modelBarrelById.get(barrelId).adsTimeTierMod ?? 0);
      const rawSprintRecovery = weaponMag.defSpr
        + (magazine.sprintRecoveryTierShift ?? 0)
        + (grip.sprintRecoveryTierShift ?? 0)
        + (ergo.sprintRecoveryTierShift ?? 0);
      const rawAdsMove = weaponMag.defAms
        + (magazine.adsMoveSpeedTierShift ?? 0)
        + (grip.adsMoveSpeedTierShift ?? 0)
        + (ammoType.adsMoveSpeedTierShift ?? 0);
      const rawDeploy = baseDeployIdx
        + (magazine.sprintRecoveryTierShift ?? 0)
        + (grip.sprintRecoveryTierShift ?? 0);
      const indices = {
        adsTime: indexRecord(rawAdsTime, modelBalance.ADS_SPD_TIERS),
        sprintRecovery: indexRecord(rawSprintRecovery, sprintTable),
        adsMove: indexRecord(rawAdsMove, modelBalance.ADS_MOVE_TIERS),
        deploy: indexRecord(rawDeploy, modelBalance.DEPLOY_TIME_TIERS),
      };
      for (const [name, record] of Object.entries(indices)) if (record.clamped) clampCounts[name]++;

      if (verifyResolver) {
        const output = applyAttachments(weapon, loadoutFor({
          weaponId: weapon.id, barrelId, magazineId, gripId, ergoId, ammoId,
        }));
        assert.equal(output._adsTimeMs, indices.adsTime.value, `${caseKey} ADS time`);
        assert.equal(output._sprintRecoveryMs, indices.sprintRecovery.value, `${caseKey} sprint recovery`);
        assert.equal(output._adsMoveSpeedMult, indices.adsMove.value, `${caseKey} ADS move`);
        assert.equal(output._deployTimeMs, indices.deploy.value, `${caseKey} deploy time`);
        assert.equal(output.deployT, +(indices.deploy.value / 1000).toFixed(3), `${caseKey} deploy display`);
      }

      rows.push({
        caseKey, weaponId: weapon.id, magazineId, gripId, ergoId, ammoId,
        sprintTable: sprintTableName, adsTime: indices.adsTime,
        sprintRecovery: indices.sprintRecovery, adsMove: indices.adsMove, deploy: indices.deploy,
      });
    }
  }

  return {
    kind,
    scope: {
      weaponCount: weapons.length,
      magazineEntryCount,
      caseDimensions: 'weapon × magazine × selectable grip × selectable ergonomic × available ammo',
      gripSelection: 'none plus WEAPON_ATTS.grip, or grip IDs in the combined VZ.61 laser slot',
      ergoSelection: 'none plus WEAPON_ERGO[weapon].avail',
      ammoSelection: 'all IDs in WEAPON_AMMO[weapon].ammo, including standard-only weapons',
      barrelSelection: 'weapon barrelDef only; barrels do not affect sprint recovery or ADS move',
      caseKey: 'weaponId/magazineId/gripId/ergoId/ammoId',
    },
    counts: {
      weapons: weapons.length, magazineEntries: magazineEntryCount,
      gripChoices: dimensionTotals.gripChoices, ergoChoices: dimensionTotals.ergoChoices,
      ammoChoices: dimensionTotals.ammoChoices, cases: rows.length,
      primaryCases: tableCaseCounts.primary, sidearmCases: tableCaseCounts.sidearm,
    },
    defSprDistribution, clampCounts, cases: rows,
  };
}

const CANONICAL_FIELDS = [
  ['caseKey', row => row.caseKey], ['weaponId', row => row.weaponId], ['magazineId', row => row.magazineId],
  ['gripId', row => row.gripId], ['ergoId', row => row.ergoId], ['ammoId', row => row.ammoId],
  ['sprintTable', row => row.sprintTable], ['adsTime.rawIndex', row => row.adsTime.rawIndex],
  ['adsTime.index', row => row.adsTime.index], ['adsTime.clamped', row => row.adsTime.clamped],
  ['adsTime.value', row => row.adsTime.value], ['sprintRecovery.rawIndex', row => row.sprintRecovery.rawIndex],
  ['sprintRecovery.index', row => row.sprintRecovery.index], ['sprintRecovery.clamped', row => row.sprintRecovery.clamped],
  ['sprintRecovery.value', row => row.sprintRecovery.value], ['adsMove.rawIndex', row => row.adsMove.rawIndex],
  ['adsMove.index', row => row.adsMove.index], ['adsMove.clamped', row => row.adsMove.clamped],
  ['adsMove.value', row => row.adsMove.value], ['deploy.rawIndex', row => row.deploy.rawIndex],
  ['deploy.index', row => row.deploy.index], ['deploy.clamped', row => row.deploy.clamped],
  ['deploy.value', row => row.deploy.value],
];

function canonicalNumber(value) {
  assert.ok(Number.isFinite(value), `non-finite canonical number: ${value}`);
  return Number(Object.is(value, -0) ? 0 : value).toFixed(12);
}

function canonicalValue(value) {
  if (typeof value === 'number') return canonicalNumber(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function canonicalRow(row) {
  return `{${CANONICAL_FIELDS.map(([key, get]) => `${JSON.stringify(key)}:${canonicalValue(get(row))}`).join(',')}}`;
}

function sortedCases(cases) {
  return [...cases].sort((a, b) => a.caseKey.localeCompare(b.caseKey));
}

function canonicalSerialization(cases) {
  return sortedCases(cases).map(canonicalRow).join('\n');
}

function sha256(serialization) {
  return createHash('sha256').update(serialization, 'utf8').digest('hex');
}

function perWeaponDigests(cases) {
  return Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
    weaponId, sha256(canonicalSerialization(cases.filter(row => row.weaponId === weaponId))),
  ]));
}

function rawIndexHistograms(cases) {
  const result = {
    sprintRecovery: { primary: {}, sidearm: {} }, adsMove: { primary: {}, sidearm: {} },
    adsTime: { primary: {}, sidearm: {} }, deploy: { primary: {}, sidearm: {} },
  };
  for (const row of cases) {
    for (const [name, index] of [['sprintRecovery', row.sprintRecovery.rawIndex], ['adsMove', row.adsMove.rawIndex], ['adsTime', row.adsTime.rawIndex], ['deploy', row.deploy.rawIndex]]) {
      const histogram = result[name][row.sprintTable];
      histogram[index] = (histogram[index] ?? 0) + 1;
    }
  }
  return result;
}

function clampCaseKeysFor(cases) {
  return Object.fromEntries(['sprintRecovery', 'adsMove', 'adsTime', 'deploy'].map(name => [
    name, sortedCases(cases).filter(row => row[name].clamped).map(row => row.caseKey),
  ]));
}

function detailCases(cases) {
  const sampleKeys = new Set();
  const sampleCounts = {};
  for (const row of sortedCases(cases)) {
    if ((sampleCounts[row.weaponId] ?? 0) < 3) {
      sampleKeys.add(row.caseKey);
      sampleCounts[row.weaponId] = (sampleCounts[row.weaponId] ?? 0) + 1;
    }
  }
  return sortedCases(cases).filter(row => sampleKeys.has(row.caseKey)
    || row.adsMove.rawIndex >= 9 || row.sprintRecovery.clamped || row.deploy.clamped);
}

function sourceGripEvidence() {
  const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const byWeapon = new Map();
  for (const record of review.records) {
    if (record.attachmentType !== 'Grip' || !SOURCE_GRIP_NAMES.includes(record.attachmentName)) continue;
    if (!byWeapon.has(record.weaponName)) byWeapon.set(record.weaponName, {});
    byWeapon.get(record.weaponName)[record.attachmentName] = {
      value: record.stats?.adsMoveSpeedMultiplier,
      file: record.source?.proposedFilename,
    };
  }
  const completeNames = [...byWeapon.keys()].filter(name => SOURCE_GRIP_NAMES.every(grip => byWeapon.get(name)[grip])).sort();
  assert.equal(completeNames.length, 49, 'source-complete standard-grip weapons');
  const shiftedNames = completeNames.filter(name => !EXEMPT_SOURCE_WEAPONS.has(name));
  assert.equal(shiftedNames.length, 45, 'source-backed shifted weapons');
  const weaponIdByName = new Map(weapons.map(weapon => [normalize(weapon.name), weapon.id]));
  const liveShiftedWeaponIds = shiftedNames.map(name => weaponIdByName.get(normalize(name))).filter(Boolean).sort();
  const sourceOnlyShiftedWeaponNames = shiftedNames.filter(name => !weaponIdByName.has(normalize(name)));
  const vz61Base = review.records.find(record => record.weaponName === 'VZ. 61'
    && record.attachmentType === 'Grip/Laser/Light' && record.attachmentName === 'None');
  const vz61Shifted = review.records.find(record => record.weaponName === 'VZ. 61'
    && record.attachmentType === 'Grip/Laser/Light' && record.attachmentName === 'Stippled Stubby');
  assert.ok(vz61Base && vz61Shifted, 'VZ. 61 composite grip source records');
  assert.equal(vz61Base.stats.adsMoveSpeedMultiplier, 0.75);
  assert.equal(vz61Shifted.stats.adsMoveSpeedMultiplier, 0.67);
  assert.equal(balance.ADS_MOVE_TIERS[balance.ADS_MOVE_TIERS.indexOf(vz61Base.stats.adsMoveSpeedMultiplier) + 1],
    vz61Shifted.stats.adsMoveSpeedMultiplier);
  liveShiftedWeaponIds.push(weaponIdByName.get(normalize('VZ. 61')));
  liveShiftedWeaponIds.sort();
  assert.equal(liveShiftedWeaponIds.length, 44, 'live shifted weapons');
  assert.deepEqual(sourceOnlyShiftedWeaponNames, ['BROD 3', 'EF88']);

  const panelReadings = {};
  for (const weaponName of completeNames) {
    const readings = byWeapon.get(weaponName);
    const base = readings.None.value;
    assert.ok(Number.isFinite(base), `${weaponName} source base ADS move`);
    const expected = EXEMPT_SOURCE_WEAPONS.has(weaponName)
      ? base
      : balance.ADS_MOVE_TIERS[balance.ADS_MOVE_TIERS.indexOf(base) + 1];
    assert.notEqual(expected, undefined, `${weaponName} source shifted tier`);
    for (const gripName of SOURCE_GRIP_NAMES.slice(1)) {
      assert.equal(readings[gripName].value, expected, `${weaponName}/${gripName} source ADS move`);
    }
    panelReadings[weaponName] = readings;
  }
  return {
    sourceCompleteWeaponCount: completeNames.length,
    sourceShiftedWeaponCount: shiftedNames.length,
    sourceExceptionWeaponNames: [...EXEMPT_SOURCE_WEAPONS].sort(),
    sourceShiftedWeaponNames: shiftedNames,
    liveShiftedWeaponIds,
    sourceOnlyShiftedWeaponNames,
    additionalCompositeShift: {
      weaponName: 'VZ. 61',
      attachmentType: 'Grip/Laser/Light',
      attachmentName: 'Stippled Stubby',
      baseValue: vz61Base.stats.adsMoveSpeedMultiplier,
      shiftedValue: vz61Shifted.stats.adsMoveSpeedMultiplier,
      file: vz61Shifted.source?.proposedFilename,
    },
    panelReadings,
  };
}

function transitionBeforeAttachments() {
  const model = structuredClone(attachments);
  for (const gripId of STANDARD_SHIFTED_GRIPS) delete model.GRIPS.find(grip => grip.id === gripId).adsMoveSpeedTierShift;
  return model;
}

function prePhase3Attachments() {
  const model = transitionBeforeAttachments();
  for (const [weaponId, mappings] of Object.entries(VARIANT_BASES)) {
    if (!model.WEAPON_ATTS[weaponId]) continue;
    model.WEAPON_ATTS[weaponId].grip = model.WEAPON_ATTS[weaponId].grip.map(gripId => mappings[gripId] ?? gripId);
  }
  return model;
}

function transitionDiffs(beforeCases, afterCases) {
  const beforeByKey = new Map(beforeCases.map(row => [row.caseKey, row]));
  return sortedCases(afterCases).flatMap(after => {
    const before = beforeByKey.get(after.caseKey);
    assert.ok(before, `missing pre-Phase-3 case ${after.caseKey}`);
    if (before.adsMove.value === after.adsMove.value) return [];
    return [{
      caseKey: after.caseKey,
      weaponId: after.weaponId,
      gripId: after.gripId,
      oldRawIndex: before.adsMove.rawIndex,
      newRawIndex: after.adsMove.rawIndex,
      oldIndex: before.adsMove.index,
      newIndex: after.adsMove.index,
      oldClamped: before.adsMove.clamped,
      newClamped: after.adsMove.clamped,
      oldValue: before.adsMove.value,
      newValue: after.adsMove.value,
    }];
  });
}

function changedCaseKeysDigest(diffs) {
  return sha256(diffs.map(diff => diff.caseKey).sort().join('\n'));
}

function buildFixture() {
  const actual = buildEnumeration();
  const before = buildEnumeration({ modelAttachments: transitionBeforeAttachments(), verifyResolver: false, kind: 'ads-move-phase2b-iii-pre-migration-with-variants' });
  const historical = buildEnumeration({ modelAttachments: prePhase3Attachments(), verifyResolver: false, kind: 'ads-move-phase2b-iii-pre-migration' });
  const cases = sortedCases(actual.cases);
  const beforeCases = sortedCases(before.cases);
  const historicalCases = sortedCases(historical.cases);
  const source = sourceGripEvidence();
  const diffs = transitionDiffs(beforeCases, cases);
  const changedByWeapon = {};
  for (const diff of diffs) changedByWeapon[diff.weaponId] = (changedByWeapon[diff.weaponId] ?? 0) + 1;
  const details = detailCases(cases);
  const valueChanges = {};
  for (const diff of diffs) {
    const key = `${diff.oldValue}->${diff.newValue}`;
    valueChanges[key] = (valueChanges[key] ?? 0) + 1;
  }
  return {
    kind: actual.kind,
    scope: actual.scope,
    counts: actual.counts,
    defSprDistribution: actual.defSprDistribution,
    clampCounts: actual.clampCounts,
    digest: { algorithm: 'SHA-256', format: 'canonical-row-v1', value: sha256(canonicalSerialization(cases)) },
    perWeaponDigest: perWeaponDigests(cases),
    rawIndexHistograms: rawIndexHistograms(cases),
    clampCaseKeys: clampCaseKeysFor(cases),
    migration: {
      sharedGripIds: STANDARD_SHIFTED_GRIPS,
      sourceEvidence: source,
      changedCaseCount: diffs.length,
      changedWeaponCount: Object.keys(changedByWeapon).length,
      changedWeaponIds: Object.keys(changedByWeapon).sort(),
      changedCaseKeysDigest: changedCaseKeysDigest(diffs),
      changedByWeapon,
      valueChanges,
      prePhase3ClampCaseKeys: clampCaseKeysFor(beforeCases),
      postPhase3ClampCaseKeys: clampCaseKeysFor(cases),
    },
    preMigration: {
      kind: historical.kind,
      scope: historical.scope,
      counts: historical.counts,
      defSprDistribution: historical.defSprDistribution,
      clampCounts: historical.clampCounts,
      digest: { algorithm: 'SHA-256', format: 'canonical-row-v1', value: sha256(canonicalSerialization(historicalCases)) },
      perWeaponDigest: perWeaponDigests(historicalCases),
      rawIndexHistograms: rawIndexHistograms(historicalCases),
      clampCaseKeys: clampCaseKeysFor(historicalCases),
    },
    detailSelection: { topRawIndexAtLeast: 9, sampleCasesPerWeapon: 3, detailCaseCount: details.length },
    detailCases: details,
  };
}

const generatedBaseline = process.argv.includes('--write-baseline') ? buildFixture() : null;
if (generatedBaseline) writeFileSync(baselinePath, `${JSON.stringify(generatedBaseline, null, 2)}\n`);
const baseline = generatedBaseline ?? readJson('scripts/ads-move-phase2b-iii-baseline.json');

let currentEnumeration;
function current() {
  currentEnumeration ??= buildEnumeration();
  return currentEnumeration;
}

let historicalEnumeration;
function historical() {
  historicalEnumeration ??= buildEnumeration({ modelAttachments: prePhase3Attachments(), verifyResolver: false, kind: 'ads-move-phase2b-iii-pre-migration' });
  return historicalEnumeration;
}

let beforeEnumeration;
function before() {
  beforeEnumeration ??= buildEnumeration({ modelAttachments: transitionBeforeAttachments(), verifyResolver: false, kind: 'ads-move-phase2b-iii-pre-migration-with-variants' });
  return beforeEnumeration;
}

test('Phase 2b-iii reconstructs the complete post-migration enumeration', () => {
  const actual = current();
  assert.equal(baseline.kind, 'ads-move-phase2b-iii-post-migration');
  assert.deepEqual(actual.scope, baseline.scope);
  assert.deepEqual(actual.counts, baseline.counts);
  assert.deepEqual(actual.defSprDistribution, baseline.defSprDistribution);
  assert.deepEqual(actual.clampCounts, baseline.clampCounts);
  assert.equal(sha256(canonicalSerialization(actual.cases)), baseline.digest.value);
  assert.deepEqual(perWeaponDigests(actual.cases), baseline.perWeaponDigest);
  assert.deepEqual(rawIndexHistograms(actual.cases), baseline.rawIndexHistograms);
  assert.deepEqual(detailCases(actual.cases), baseline.detailCases);
});

test('Phase 2b-iii anchors the complete pre-migration digest', () => {
  const actual = historical();
  assert.deepEqual(actual.scope, baseline.preMigration.scope);
  assert.deepEqual(actual.counts, baseline.preMigration.counts);
  assert.deepEqual(actual.clampCounts, baseline.preMigration.clampCounts);
  assert.equal(sha256(canonicalSerialization(actual.cases)), baseline.preMigration.digest.value);
  assert.equal(baseline.preMigration.digest.value, PRE_PHASE3_DIGEST);
  assert.deepEqual(perWeaponDigests(actual.cases), baseline.preMigration.perWeaponDigest);
});

test('Phase 2b-iii records source fidelity and the 44-weapon live population', () => {
  const source = sourceGripEvidence();
  assert.deepEqual(balance.ADS_MOVE_TIERS, [1, 0.91, 0.82, 0.75, 0.67, 0.6, 0.54, 0.47, 0.42, 0.37]);
  assert.equal(balance.ADS_MOVE_TIERS.includes(0.325), false);
  assert.deepEqual(source, baseline.migration.sourceEvidence);
  assert.equal(source.sourceCompleteWeaponCount, 49);
  assert.equal(source.sourceShiftedWeaponCount, 45);
  assert.equal(source.liveShiftedWeaponIds.length, 44);
  assert.deepEqual(source.sourceExceptionWeaponNames, ['18.5KS-K', 'DB-12', 'SVK-8.6', 'VSSM']);
  assert.deepEqual(source.sourceOnlyShiftedWeaponNames, ['BROD 3', 'EF88']);
  for (const gripId of STANDARD_SHIFTED_GRIPS) assert.equal(gripById.get(gripId).adsMoveSpeedTierShift, 1, gripId);
  for (const mappings of Object.values(VARIANT_BASES)) {
    for (const variantId of Object.keys(mappings)) assert.equal(gripById.get(variantId).adsMoveSpeedTierShift, undefined, variantId);
  }
  assert.equal(attachments.WEAPON_ATTS.vssm, undefined);
});

test('Phase 2b-iii enumerates exactly the intended ADS-move transition', () => {
  const actual = current();
  const previous = before();
  const diffs = transitionDiffs(previous.cases, actual.cases);
  const expectedWeapons = new Set(baseline.migration.changedWeaponIds);
  const expectedGripIds = new Set(STANDARD_SHIFTED_GRIPS);
  assert.deepEqual(baseline.migration.changedWeaponIds, sourceGripEvidence().liveShiftedWeaponIds);
  assert.equal(diffs.length, baseline.migration.changedCaseCount);
  assert.equal(new Set(diffs.map(diff => diff.weaponId)).size, 44);
  assert.deepEqual([...new Set(diffs.map(diff => diff.weaponId))].sort(), baseline.migration.changedWeaponIds);
  assert.equal(changedCaseKeysDigest(diffs), baseline.migration.changedCaseKeysDigest);
  assert.deepEqual(Object.fromEntries([...new Set(diffs.map(diff => diff.weaponId))].sort().map(weaponId => [
    weaponId, diffs.filter(diff => diff.weaponId === weaponId).length,
  ])), baseline.migration.changedByWeapon);
  for (const diff of diffs) {
    assert.equal(expectedWeapons.has(diff.weaponId), true, diff.caseKey);
    assert.equal(expectedGripIds.has(diff.gripId), true, diff.caseKey);
    assert.equal(diff.newRawIndex, diff.oldRawIndex + 1, diff.caseKey);
    assert.equal(diff.newClamped, false, diff.caseKey);
  }
  assert.equal(diffs.some(diff => ['svk86', 'ks18k', 'db12', 'vssm'].includes(diff.weaponId)), false);
  for (const row of actual.cases) {
    const prior = previous.cases.find(candidate => candidate.caseKey === row.caseKey);
    assert.ok(prior, row.caseKey);
    if (!expectedWeapons.has(row.weaponId) || !expectedGripIds.has(row.gripId)) {
      assert.deepEqual(row.adsMove, prior.adsMove, row.caseKey);
    }
    assert.deepEqual(row.sprintRecovery, prior.sprintRecovery, `${row.caseKey} sprint`);
    assert.deepEqual(row.adsTime, prior.adsTime, `${row.caseKey} ADS time`);
    assert.deepEqual(row.deploy, prior.deploy, `${row.caseKey} deploy`);
  }
});

test('Phase 2b-iii adds no clamps and preserves existing sprint/deploy clamp identities', () => {
  const actual = current();
  const previous = before();
  assert.deepEqual(actual.clampCounts, { sprintRecovery: 40, adsMove: 0, adsTime: 0, deploy: 435 });
  assert.deepEqual(actual.cases.filter(row => row.adsMove.clamped), []);
  assert.deepEqual(actual.cases.filter(row => row.sprintRecovery.clamped).map(row => row.caseKey),
    previous.cases.filter(row => row.sprintRecovery.clamped).map(row => row.caseKey));
  assert.deepEqual(actual.cases.filter(row => row.deploy.clamped).map(row => row.caseKey),
    previous.cases.filter(row => row.deploy.clamped).map(row => row.caseKey));
  assert.deepEqual(clampCaseKeysFor(actual.cases), baseline.clampCaseKeys);
  assert.deepEqual(baseline.migration.prePhase3ClampCaseKeys, clampCaseKeysFor(previous.cases));
  assert.deepEqual(baseline.migration.postPhase3ClampCaseKeys, baseline.clampCaseKeys);
});

test('Phase 2b-iv converts base indices with strict full-enumeration zero-diff', () => {
  const actual = current();
  const digest = sha256(canonicalSerialization(actual.cases));
  assert.equal(baseline.digest.value, PRE_PHASE4_DIGEST, 'the committed Phase 3 digest is the Phase 4 anchor');
  assert.equal(digest, PRE_PHASE4_DIGEST, '0-based representation must preserve every composed case');
  assert.equal(digest, baseline.digest.value);
  assert.deepEqual(perWeaponDigests(actual.cases), baseline.perWeaponDigest);
  assert.deepEqual(rawIndexHistograms(actual.cases), baseline.rawIndexHistograms);
  assert.deepEqual(clampCaseKeysFor(actual.cases), baseline.clampCaseKeys);
  assert.deepEqual(actual.clampCounts, { sprintRecovery: 40, adsMove: 0, adsTime: 0, deploy: 435 });
  assert.deepEqual(actual.cases.filter(row => row.adsMove.clamped), []);
});

test('L110 200-round 6H64 Vertical reproduces the complete first-party composed panel', () => {
  const weapon = weaponById.get('l110');
  const atts = blankAtts();
  atts.barrel = 'none';
  atts.mag = '200_rnd';
  atts.grip = '6h64_vert';
  atts.ergo = 'none';
  atts.ammo = 'standard';
  const output = applyAttachments(weapon, atts);
  assert.deepEqual({
    adsMove: output._adsMoveSpeedMult,
    sprintRecovery: output._sprintRecoveryMs,
    adsTime: output._adsTimeMs,
    reload: output.tacRld,
  }, { adsMove: 0.37, sprintRecovery: 350, adsTime: 500, reload: 6.5 });
});
