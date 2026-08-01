import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';
import {
  correctionRecordFor,
  restoreApprovedGripCorrections,
  selectedCorrectionRecord,
} from './grip-pod-correction-deltas.mjs';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const baselinePath = join(root, 'scripts/sprint-rec-phase2b-ii-baseline.json');

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const review = readJson('outputs/attachment-audit/attachment-screenshot-review.json');
const drawTimeBaseline = readJson('scripts/draw-time-phase3-baseline.json');
const gripById = new Map(attachments.GRIPS.map(grip => [grip.id, grip]));
const ergoById = new Map(attachments.ERGOS.map(ergo => [ergo.id, ergo]));
const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
const barrelById = new Map(attachments.BARRELS.map(barrel => [barrel.id, barrel]));
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

const PRE_MIGRATION_TABLES = {
  primary: [83, 100, 133, 167, 200, 233, 267, 300, 333, 350],
  sidearm: [67, 83, 100, 117, 133, 167, 200, 233],
};

const SPRINT_SHIFT_DERIVATIONS = [
  {
    weaponId: 'l110', magazineId: '200_rnd', oldShift: 2, newShift: 1, sourceReading: 350,
    sourceSuffixes: ['Weapon Attachments/LMG/L110/46_L110_Magazine_200RND_BELT_BOX.png'],
  },
  {
    weaponId: 'm121a2', magazineId: '100_rnd', oldShift: 2, newShift: 1, sourceReading: 350,
    sourceSuffixes: ['Weapon Attachments/LMG/M121 A2/46_M121 A2_Magazine_I00RND_BELT_BOX.png'],
  },
  {
    weaponId: 'm123k', magazineId: '200_rnd', oldShift: 2, newShift: 1, sourceReading: 350,
    sourceSuffixes: ['Weapon Attachments/LMG/M123K/44_M123K_Magazine_200RND_BELT_BOX.png'],
  },
  {
    weaponId: 'm250', magazineId: '100_rnd', oldShift: 2, newShift: 1, sourceReading: 350,
    sourceSuffixes: ['Weapon Attachments/LMG/M250/46_M250_Magazine_I00RND_BELT_POUCH.png'],
  },
  {
    weaponId: 'ggh22', magazineId: '20_rnd', oldShift: 2, newShift: 1, sourceReading: 133,
    sourceSuffixes: ['Weapon Attachments/Sidearm/GGH-22/18_GGH-22_Magazine_20Rnd_Magazine.png'],
  },
  {
    weaponId: 'ggh22', magazineId: '22_rnd', oldShift: 2, newShift: 1, sourceReading: 133,
    sourceSuffixes: ['Weapon Attachments/Sidearm/GGH-22/19_GGH-22_Magazine_22Rnd_Magazine.png'],
  },
  {
    weaponId: 'm45a1', magazineId: '11_rnd', oldShift: 2, newShift: 1, sourceReading: 133,
    sourceSuffixes: ['Weapon Attachments/Sidearm/M45A1/18_M45A1_Magazine_11Rnd_Magazine.png'],
  },
  {
    weaponId: 'p18', magazineId: '21_rnd', oldShift: 2, newShift: 1, sourceReading: 133,
    sourceSuffixes: ['Weapon Attachments/Sidearm/P18/18_P18_Magazine_21RND_MAGAZINE.png'],
  },
  {
    weaponId: 'vz61', magazineId: '20_rnd', oldShift: 2, newShift: 1, sourceReading: 167,
    sourceSuffixes: ['Weapon Attachments/Sidearm/VZ. 61/21_VZ. 61_Magazine_20Rnd_Magazine.png'],
  },
];

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
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
};

setAttachmentContext(baseContext);

function clampIndex(rawIndex, table) {
  return Math.max(0, Math.min(table.length - 1, rawIndex));
}

function indexRecord(rawIndex, table) {
  const index = clampIndex(rawIndex, table);
  return {
    rawIndex,
    index,
    clamped: index !== rawIndex,
    value: table[index],
  };
}

function selectableGripIds(weaponId, modelAttachments = attachments) {
  const weaponAtts = modelAttachments.WEAPON_ATTS[weaponId] ?? {};
  const ids = weaponAtts.laserGripLightCombined
    ? (weaponAtts.laser ?? []).filter(id => gripById.has(id))
    : (weaponAtts.grip ?? []);
  for (const id of ids) assert.ok(gripById.has(id), `${weaponId} references unknown grip ${id}`);
  return ['none', ...ids].sort();
}

function selectableErgoIds(weaponId) {
  const ids = attachments.WEAPON_ERGO[weaponId]?.avail ?? [];
  for (const id of ids) assert.ok(ergoById.has(id), `${weaponId} references unknown ergo ${id}`);
  return ['none', ...ids].sort();
}

function selectableAmmoIds(weaponId) {
  const ids = Object.keys(ammo.WEAPON_AMMO[weaponId]?.ammo ?? {});
  for (const id of ids) assert.ok(ammoById.has(id), `${weaponId} references unknown ammo ${id}`);
  return ids.sort();
}

function sprintTableFor(weaponMag, modelBalance) {
  if (weaponMag.sprintRecoveryTierTable === 'sidearm') {
    return modelBalance.SIDEARM_SPRINT_REC_TIERS.length
      ? modelBalance.SIDEARM_SPRINT_REC_TIERS
      : modelBalance.SPRINT_REC_TIERS;
  }
  return modelBalance.PRIMARY_SPRINT_REC_TIERS.length
    ? modelBalance.PRIMARY_SPRINT_REC_TIERS
    : modelBalance.SPRINT_REC_TIERS;
}

function sprintTableNameFor(weaponMag) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm' ? 'sidearm' : 'primary';
}

function deployBaseIndex(weapon, modelBalance) {
  // Historical characterization only: the live resolver must never derive a
  // deploy index by nearest-value search. The frozen draw-time fixture retains
  // the old 59 deployT readings after the live field is removed.
  const baseDeployMs = (weapon.deployT ?? drawTimeBaseline.legacyDeployT[weapon.id].deployT) * 1000;
  let baseIndex = 0;
  for (let i = 1; i < modelBalance.DEPLOY_TIME_TIERS.length; i++) {
    if (Math.abs(modelBalance.DEPLOY_TIME_TIERS[i] - baseDeployMs)
      < Math.abs(modelBalance.DEPLOY_TIME_TIERS[baseIndex] - baseDeployMs)) {
      baseIndex = i;
    }
  }
  return baseIndex;
}

function derivedDeployBaseIndex(weapon, modelAttachments, modelBalance) {
  const weaponMag = modelAttachments.WEAPON_MAG[weapon.id];
  const axis = modelBalance.DRAW_TIME_AXIS;
  assert.ok(weaponMag?.drawTimeGroup, `${weapon.id} missing derived draw-time group`);
  const deployCoordinate = weaponMag.drawTimeTier + weaponMag.drawTimeOffset;
  const rawIndex = deployCoordinate - axis.deploy.coordinateOrigin;
  return Math.max(0, Math.min(modelBalance.DEPLOY_TIME_TIERS.length - 1, rawIndex));
}

function loadoutFor({ weaponId, barrelId, magazineId, gripId, ergoId, ammoId }) {
  const atts = blankAtts();
  atts.barrel = barrelId;
  atts.mag = magazineId;
  atts.ammo = ammoId;
  atts.ergo = ergoId;
  if (attachments.WEAPON_ATTS[weaponId]?.laserGripLightCombined) {
    atts.laser = gripId;
  } else {
    atts.grip = gripId;
  }
  return atts;
}

function buildEnumeration({
  modelAttachments = attachments,
  modelBalance = balance,
  verifyResolver = true,
  indexBase = 0,
  kind = 'sprint-recovery-phase2b-ii-post-migration',
} = {}) {
  const modelGripById = new Map(modelAttachments.GRIPS.map(grip => [grip.id, grip]));
  const modelErgoById = new Map(modelAttachments.ERGOS.map(ergo => [ergo.id, ergo]));
  const modelAmmoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
  const modelBarrelById = new Map(modelAttachments.BARRELS.map(barrel => [barrel.id, barrel]));
  const rows = [];
  const defSprDistribution = {};
  const tableCaseCounts = { primary: 0, sidearm: 0 };
  const clampCounts = {
    sprintRecovery: 0,
    adsMove: 0,
    adsTime: 0,
    deploy: 0,
  };
  const dimensionTotals = {
    gripChoices: 0,
    ergoChoices: 0,
    ammoChoices: 0,
  };
  let magazineEntryCount = 0;

  const sortedWeapons = [...weapons].sort((a, b) => a.id.localeCompare(b.id));
  for (const weapon of sortedWeapons) {
    const weaponMag = modelAttachments.WEAPON_MAG[weapon.id];
    assert.ok(weaponMag, `missing magazine catalog for ${weapon.id}`);
    assert.notEqual(weaponMag.defAds, null, `${weapon.id} has no defAds`);
    assert.notEqual(weaponMag.defSpr, null, `${weapon.id} has no defSpr`);
    assert.notEqual(weaponMag.defAms, null, `${weapon.id} has no defAms`);

    const weaponAtts = modelAttachments.WEAPON_ATTS[weapon.id] ?? {};
    const barrelId = weaponAtts.barrelDef ?? 'none';
    const barrel = modelBarrelById.get(barrelId);
    assert.ok(barrel, `${weapon.id} has unknown default barrel ${barrelId}`);

    const magazineIds = Object.keys(weaponMag.mags ?? {}).sort();
    const gripIds = selectableGripIds(weapon.id, modelAttachments);
    const ergoIds = selectableErgoIds(weapon.id);
    const ammoIds = selectableAmmoIds(weapon.id);
    assert.ok(magazineIds.length, `${weapon.id} has no selectable magazines`);
    assert.ok(ammoIds.length, `${weapon.id} has no selectable ammo`);
    magazineEntryCount += magazineIds.length;
    dimensionTotals.gripChoices += gripIds.length;
    dimensionTotals.ergoChoices += ergoIds.length;
    dimensionTotals.ammoChoices += ammoIds.length;
    defSprDistribution[weaponMag.defSpr] = (defSprDistribution[weaponMag.defSpr] ?? 0) + 1;

    const sprintTable = sprintTableFor(weaponMag, modelBalance);
    const sprintTableName = sprintTableNameFor(weaponMag);
    tableCaseCounts[sprintTableName] += magazineIds.length * gripIds.length * ergoIds.length * ammoIds.length;
    const baseDeployIdx = indexBase === 0
      ? derivedDeployBaseIndex(weapon, modelAttachments, modelBalance)
      : deployBaseIndex(weapon, modelBalance);

    for (const magazineId of magazineIds) {
      const magazine = weaponMag.mags[magazineId];
      for (const gripId of gripIds) {
        const grip = modelGripById.get(gripId);
        for (const ergoId of ergoIds) {
          const ergo = modelErgoById.get(ergoId);
          for (const ammoId of ammoIds) {
            const ammoType = modelAmmoById.get(ammoId);
            const caseKey = `${weapon.id}/${magazineId}/${gripId}/${ergoId}/${ammoId}`;
            const rawAdsTime = (weaponMag.defAds - indexBase)
              + (magazine.adsTimeTierShift ?? 0)
              - (grip.adsTimeTierMod ?? 0)
              - (barrel.adsTimeTierMod ?? 0);
            const sprintCoordinateOrigin = indexBase === 0
              ? (sprintTableName === 'sidearm'
                ? modelBalance.DRAW_TIME_AXIS.sprintToFire.sidearm.coordinateOrigin
                : modelBalance.DRAW_TIME_AXIS.sprintToFire.primary.coordinateOrigin)
              : indexBase;
            const rawSprintRecovery = (indexBase === 0 ? weaponMag.drawTimeTier : weaponMag.defSpr)
              - sprintCoordinateOrigin
              + (magazine.sprintRecoveryTierShift ?? 0)
              + (grip.sprintRecoveryTierShift ?? 0)
              + (ergo.sprintRecoveryTierShift ?? 0);
            const rawAdsMove = (weaponMag.defAms - indexBase)
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
            for (const [name, record] of Object.entries(indices)) {
              if (record.clamped) clampCounts[name]++;
            }

            if (verifyResolver) {
              const output = applyAttachments(weapon, loadoutFor({
                weaponId: weapon.id,
                barrelId,
                magazineId,
                gripId,
                ergoId,
                ammoId,
              }));
              // These assertions make the test-side arithmetic a self-checking mirror of the
              // resolver. If the resolver arithmetic changes, this gate fails before a fixture
              // comparison can make the change look intentional.
              assert.equal(output._adsTimeMs, indices.adsTime.value, `${caseKey} ADS time`);
              assert.equal(output._sprintRecoveryMs, indices.sprintRecovery.value, `${caseKey} sprint recovery`);
              assert.equal(output._adsMoveSpeedMult, indices.adsMove.value, `${caseKey} ADS move`);
              assert.equal(output._deployTimeMs, indices.deploy.value, `${caseKey} deploy time`);
              assert.equal(output.deployT, +(indices.deploy.value / 1000).toFixed(3), `${caseKey} deploy display`);
            }

            rows.push({
              caseKey,
              weaponId: weapon.id,
              magazineId,
              gripId,
              ergoId,
              ammoId,
              sprintTable: sprintTableName,
              adsTime: indices.adsTime,
              sprintRecovery: indices.sprintRecovery,
              adsMove: indices.adsMove,
              deploy: indices.deploy,
            });
          }
        }
      }
    }
  }

  return {
    kind,
    scope: {
      weaponCount: sortedWeapons.length,
      magazineEntryCount,
      caseDimensions: 'weapon × magazine × selectable grip × selectable ergonomic × available ammo',
      gripSelection: 'none plus WEAPON_ATTS.grip, or grip IDs in the combined VZ.61 laser slot',
      ergoSelection: 'none plus WEAPON_ERGO[weapon].avail',
      ammoSelection: 'all IDs in WEAPON_AMMO[weapon].ammo, including standard-only weapons',
      barrelSelection: 'weapon barrelDef only; barrels do not affect sprint recovery or ADS move',
      caseKey: 'weaponId/magazineId/gripId/ergoId/ammoId',
    },
    counts: {
      weapons: sortedWeapons.length,
      magazineEntries: magazineEntryCount,
      gripChoices: dimensionTotals.gripChoices,
      ergoChoices: dimensionTotals.ergoChoices,
      ammoChoices: dimensionTotals.ammoChoices,
      cases: rows.length,
      primaryCases: tableCaseCounts.primary,
      sidearmCases: tableCaseCounts.sidearm,
    },
    defSprDistribution,
    clampCounts,
    cases: rows,
  };
}

const CANONICAL_FIELDS = [
  ['caseKey', row => row.caseKey],
  ['weaponId', row => row.weaponId],
  ['magazineId', row => row.magazineId],
  ['gripId', row => row.gripId],
  ['ergoId', row => row.ergoId],
  ['ammoId', row => row.ammoId],
  ['sprintTable', row => row.sprintTable],
  ['adsTime.rawIndex', row => row.adsTime.rawIndex],
  ['adsTime.index', row => row.adsTime.index],
  ['adsTime.clamped', row => row.adsTime.clamped],
  ['adsTime.value', row => row.adsTime.value],
  ['sprintRecovery.rawIndex', row => row.sprintRecovery.rawIndex],
  ['sprintRecovery.index', row => row.sprintRecovery.index],
  ['sprintRecovery.clamped', row => row.sprintRecovery.clamped],
  ['sprintRecovery.value', row => row.sprintRecovery.value],
  ['adsMove.rawIndex', row => row.adsMove.rawIndex],
  ['adsMove.index', row => row.adsMove.index],
  ['adsMove.clamped', row => row.adsMove.clamped],
  ['adsMove.value', row => row.adsMove.value],
  ['deploy.rawIndex', row => row.deploy.rawIndex],
  ['deploy.index', row => row.deploy.index],
  ['deploy.clamped', row => row.deploy.clamped],
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

function rowCorrectionRecord(row, modelAttachments = attachments) {
  const atts = loadoutFor({
    weaponId: row.weaponId,
    barrelId: modelAttachments.WEAPON_ATTS[row.weaponId]?.barrelDef ?? 'none',
    magazineId: row.magazineId,
    gripId: row.gripId,
    ergoId: row.ergoId,
    ammoId: row.ammoId,
  });
  return selectedCorrectionRecord(row.weaponId, atts, modelAttachments);
}

const projectedCanonicalFields = {
  adsTime: new Set(['adsTime.rawIndex', 'adsTime.index', 'adsTime.clamped', 'adsTime.value']),
  adsMove: new Set(['adsMove.rawIndex', 'adsMove.index', 'adsMove.clamped', 'adsMove.value']),
};

function canonicalProjectionToken(record, key) {
  if (!record) return null;
  for (const [group, keys] of Object.entries(projectedCanonicalFields)) {
    if (keys.has(key) && record.changedCatalogFields.some(change => (
      (group === 'adsTime' && change.field === 'adsTimeTierMod')
      || (group === 'adsMove' && change.field === 'movingAdsSpreadTierMod')
    ))) return `approved-grip-pod:${record.id}:${group}`;
  }
  return null;
}

function canonicalRow(row, { projectApproved = false } = {}) {
  const record = projectApproved ? rowCorrectionRecord(row) : null;
  return `{${CANONICAL_FIELDS.map(([key, get]) => {
    const token = canonicalProjectionToken(record, key);
    return `${JSON.stringify(key)}:${canonicalValue(token ?? get(row))}`;
  }).join(',')}}`;
}

function sortedCases(cases) {
  return [...cases].sort((a, b) => a.caseKey.localeCompare(b.caseKey));
}

function canonicalSerialization(cases, options = {}) {
  return sortedCases(cases).map(row => canonicalRow(row, options)).join('\n');
}

function sha256(serialization) {
  return createHash('sha256').update(serialization, 'utf8').digest('hex');
}

function rawIndexHistograms(cases, { projectApproved = false } = {}) {
  const result = {
    sprintRecovery: { primary: {}, sidearm: {} },
    adsMove: { primary: {}, sidearm: {} },
    adsTime: { primary: {}, sidearm: {} },
    deploy: { primary: {}, sidearm: {} },
  };
  for (const row of cases) {
    const table = row.sprintTable;
    const record = projectApproved ? rowCorrectionRecord(row) : null;
    for (const [name, index] of [
      ['sprintRecovery', row.sprintRecovery.rawIndex],
      ['adsMove', row.adsMove.rawIndex],
      ['adsTime', row.adsTime.rawIndex],
      ['deploy', row.deploy.rawIndex],
    ]) {
      const histogram = result[name][table];
      const projection = canonicalProjectionToken(record, `${name}.rawIndex`);
      const bucket = projection ?? index;
      histogram[bucket] = (histogram[bucket] ?? 0) + 1;
    }
  }
  return result;
}

function detailCases(cases) {
  const sorted = sortedCases(cases);
  const sampleKeys = new Set();
  const sampleCounts = {};
  for (const row of sorted) {
    if ((sampleCounts[row.weaponId] ?? 0) < 3) {
      sampleKeys.add(row.caseKey);
      sampleCounts[row.weaponId] = (sampleCounts[row.weaponId] ?? 0) + 1;
    }
  }
  return sorted.filter(row => {
    const phantomThreshold = row.sprintTable === 'primary' ? 7 : 2;
    return sampleKeys.has(row.caseKey)
      || row.adsTime.clamped
      || row.sprintRecovery.clamped
      || row.adsMove.clamped
      || row.deploy.clamped
      || row.sprintRecovery.rawIndex >= phantomThreshold;
  });
}

function caseKeysWhere(cases, predicate) {
  return sortedCases(cases).filter(predicate).map(row => row.caseKey);
}

function legacyBuildFixture() {
  const actual = buildEnumeration();
  const cases = sortedCases(actual.cases);
  const perWeaponDigest = {};
  for (const weaponId of [...weaponById.keys()].sort()) {
    perWeaponDigest[weaponId] = sha256(canonicalSerialization(cases.filter(row => row.weaponId === weaponId)));
  }
  const phantomOccupancy = {
    primary: {
      phantomIndex: 8,
      phantomValue: balance.PRIMARY_SPRINT_REC_TIERS[8],
      caseKeys: caseKeysWhere(cases, row => row.sprintTable === 'primary' && row.sprintRecovery.rawIndex === 8),
    },
    sidearm: {
      phantomIndex: 3,
      phantomValue: balance.SIDEARM_SPRINT_REC_TIERS[3],
      caseKeys: caseKeysWhere(cases, row => row.sprintTable === 'sidearm' && row.sprintRecovery.rawIndex === 3),
    },
  };
  const clampCaseKeys = {};
  for (const name of ['sprintRecovery', 'adsMove', 'adsTime', 'deploy']) {
    clampCaseKeys[name] = caseKeysWhere(cases, row => row[name].clamped);
  }
  const details = detailCases(cases);

  return {
    kind: actual.kind,
    scope: actual.scope,
    counts: actual.counts,
    defSprDistribution: actual.defSprDistribution,
    clampCounts: actual.clampCounts,
    digest: {
      algorithm: 'SHA-256',
      format: 'canonical-row-v1',
      value: sha256(canonicalSerialization(cases)),
    },
    perWeaponDigest,
    rawIndexHistograms: rawIndexHistograms(cases),
    phantomOccupancy,
    clampCaseKeys,
    detailSelection: {
      primaryRawIndexAtLeast: 7,
      sidearmRawIndexAtLeast: 2,
      sampleCasesPerWeapon: 3,
      detailCaseCount: details.length,
    },
    detailCases: details,
  };
}

function perWeaponDigests(cases, options = {}) {
  return Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
    weaponId,
    sha256(canonicalSerialization(cases.filter(row => row.weaponId === weaponId), options)),
  ]));
}

function projectedDetailCases(cases) {
  return cases.map(row => {
    const copy = structuredClone(row);
    const record = rowCorrectionRecord(copy);
    for (const [name, keys] of Object.entries(projectedCanonicalFields)) {
      const token = canonicalProjectionToken(record, `${name}.rawIndex`);
      if (!token) continue;
      copy[name] = Object.fromEntries([...keys].map(key => [key.split('.')[1], token]));
    }
    return copy;
  });
}

function clampCaseKeysFor(cases) {
  return Object.fromEntries(['sprintRecovery', 'adsMove', 'adsTime', 'deploy'].map(name => [
    name,
    caseKeysWhere(cases, row => row[name].clamped),
  ]));
}

function preMigrationAttachments() {
  const model = legacyIndexAttachments();
  for (const derivation of SPRINT_SHIFT_DERIVATIONS) {
    model.WEAPON_MAG[derivation.weaponId].mags[derivation.magazineId].sprintRecoveryTierShift = derivation.oldShift;
  }
  return model;
}

function legacyIndexAttachments() {
  const model = structuredClone(attachments);
  for (const weaponMag of Object.values(model.WEAPON_MAG)) {
    for (const field of ['defAds', 'defSpr', 'defAms']) weaponMag[field] += 1;
  }
  return model;
}

function historicalPreMigrationAttachments() {
  const model = preMigrationAttachments();
  for (const gripId of ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby']) {
    delete model.GRIPS.find(grip => grip.id === gripId).adsMoveSpeedTierShift;
  }
  const variantBases = {
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
  };
  for (const [weaponId, mappings] of Object.entries(variantBases)) {
    model.WEAPON_ATTS[weaponId].grip = model.WEAPON_ATTS[weaponId].grip
      .map(gripId => mappings[gripId] ?? gripId);
  }
  return model;
}

function preMigrationBalance() {
  return {
    ...balance,
    PRIMARY_SPRINT_REC_TIERS: PRE_MIGRATION_TABLES.primary,
    SIDEARM_SPRINT_REC_TIERS: PRE_MIGRATION_TABLES.sidearm,
  };
}

function sourceFidelity() {
  const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const weaponIdByName = new Map(weapons.map(weapon => [normalize(weapon.name), weapon.id]));
  const histogram = {};
  const offTable = [];
  const unmappedWeapons = new Set();
  let recordCount = 0;
  for (const record of review.records) {
    const value = record.stats?.sprintRecoveryMs;
    if (value == null) continue;
    recordCount++;
    histogram[value] = (histogram[value] ?? 0) + 1;
    const weaponId = weaponIdByName.get(normalize(record.weaponName));
    if (!weaponId) unmappedWeapons.add(record.weaponName);
    const table = weaponId
      ? (attachments.WEAPON_MAG[weaponId].sprintRecoveryTierTable === 'sidearm'
        ? balance.SIDEARM_SPRINT_REC_TIERS
        : balance.PRIMARY_SPRINT_REC_TIERS)
      : [...new Set([...balance.PRIMARY_SPRINT_REC_TIERS, ...balance.SIDEARM_SPRINT_REC_TIERS])];
    if (value !== 0 && !table.includes(value)) {
      offTable.push({
        weapon: record.weaponName,
        attachment: `${record.attachmentType}/${record.attachmentName}`,
        value,
        path: record.source.currentPath,
      });
    }
  }
  return {
    recordCount,
    sprintRecoveryHistogram: histogram,
    unmappedWeapons: [...unmappedWeapons].sort(),
    offTableCount: offTable.length,
    offTable,
  };
}

function sourceDerivationEvidence() {
  return SPRINT_SHIFT_DERIVATIONS.map(derivation => ({
    ...derivation,
    sourceRecords: derivation.sourceSuffixes.map(sourceSuffix => {
      const record = review.records.find(candidate => String(candidate.source?.currentPath ?? '')
        .replace(/\\/g, '/').toLowerCase().endsWith(sourceSuffix.toLowerCase()));
      assert.ok(record, `missing source record ${sourceSuffix}`);
      assert.equal(record.stats.sprintRecoveryMs, derivation.sourceReading, sourceSuffix);
      return { sourceSuffix, reading: record.stats.sprintRecoveryMs };
    }),
  }));
}

function migrationDiffs(beforeCases, afterCases) {
  const beforeByKey = new Map(beforeCases.map(row => [row.caseKey, row]));
  const derivationByKey = new Map(SPRINT_SHIFT_DERIVATIONS.map(derivation => [
    `${derivation.weaponId}/${derivation.magazineId}`,
    derivation,
  ]));
  return sortedCases(afterCases).flatMap(after => {
    const before = beforeByKey.get(after.caseKey);
    assert.ok(before, `missing pre-migration case ${after.caseKey}`);
    const changes = {};
    if (before.sprintRecovery.value !== after.sprintRecovery.value) {
      changes.sprintRecovery = {
        oldRawIndex: before.sprintRecovery.rawIndex,
        newRawIndex: after.sprintRecovery.rawIndex,
        oldIndex: before.sprintRecovery.index,
        newIndex: after.sprintRecovery.index,
        oldClamped: before.sprintRecovery.clamped,
        newClamped: after.sprintRecovery.clamped,
        oldValue: before.sprintRecovery.value,
        newValue: after.sprintRecovery.value,
      };
    }
    if (before.deploy.value !== after.deploy.value) {
      changes.deploy = {
        oldRawIndex: before.deploy.rawIndex,
        newRawIndex: after.deploy.rawIndex,
        oldIndex: before.deploy.index,
        newIndex: after.deploy.index,
        oldClamped: before.deploy.clamped,
        newClamped: after.deploy.clamped,
        oldValue: before.deploy.value,
        newValue: after.deploy.value,
      };
    }
    if (!Object.keys(changes).length) return [];
    const derivation = derivationByKey.get(`${after.weaponId}/${after.magazineId}`);
    const causes = derivation
      ? [`${after.weaponId}/${after.magazineId} sprintRecoveryTierShift ${derivation.oldShift} -> ${derivation.newShift}`]
      : [];
    if (before.sprintRecovery.rawIndex === 8 && before.sprintTable === 'primary') {
      causes.push('primary phantom rung 333 removed');
    }
    if (before.sprintRecovery.rawIndex === 3 && before.sprintTable === 'sidearm') {
      causes.push('sidearm phantom rung 117 removed');
    }
    return [{
      caseKey: after.caseKey,
      weaponId: after.weaponId,
      magazineId: after.magazineId,
      gripId: after.gripId,
      ergoId: after.ergoId,
      ammoId: after.ammoId,
      causes,
      changes,
    }];
  });
}

function phantomOccupancyFor(cases) {
  return {
    primary: {
      phantomIndex: 8,
      phantomValue: PRE_MIGRATION_TABLES.primary[8],
      newValue: balance.PRIMARY_SPRINT_REC_TIERS[7],
      caseKeys: caseKeysWhere(cases, row => row.sprintTable === 'primary' && row.sprintRecovery.rawIndex === 8),
    },
    sidearm: {
      phantomIndex: 3,
      phantomValue: PRE_MIGRATION_TABLES.sidearm[3],
      newValue: balance.SIDEARM_SPRINT_REC_TIERS[2],
      caseKeys: caseKeysWhere(cases, row => row.sprintTable === 'sidearm' && row.sprintRecovery.rawIndex === 3),
    },
  };
}

function buildFixture() {
  const actual = buildEnumeration();
  const previous = buildEnumeration({
    modelAttachments: historicalPreMigrationAttachments(),
    modelBalance: preMigrationBalance(),
    verifyResolver: false,
    indexBase: 1,
    kind: 'sprint-recovery-phase2b-ii-pre-migration',
  });
  const transitionPrevious = buildEnumeration({
    modelAttachments: preMigrationAttachments(),
    modelBalance: preMigrationBalance(),
    verifyResolver: false,
    indexBase: 1,
    kind: 'sprint-recovery-phase2b-ii-pre-migration-with-phase2b-iii',
  });
  const cases = sortedCases(actual.cases);
  const previousCases = sortedCases(previous.cases);
  const transitionPreviousCases = sortedCases(transitionPrevious.cases);
  const diffs = migrationDiffs(transitionPreviousCases, cases);
  const source = sourceFidelity();
  const sourceDerivations = sourceDerivationEvidence();
  const phantom = phantomOccupancyFor(previousCases);
  const preClampKeys = clampCaseKeysFor(transitionPreviousCases);
  const historicalPreClampKeys = clampCaseKeysFor(previousCases);
  const postClampKeys = clampCaseKeysFor(cases);
  const detailKeys = new Set([
    ...detailCases(previousCases).map(row => row.caseKey),
    ...detailCases(transitionPreviousCases).map(row => row.caseKey),
    ...detailCases(cases).map(row => row.caseKey),
    ...diffs.map(diff => diff.caseKey),
  ]);
  const details = cases.filter(row => detailKeys.has(row.caseKey));
  const preDigest = sha256(canonicalSerialization(previousCases));
  const postDigest = sha256(canonicalSerialization(cases));
  const sprintDiffs = diffs.filter(diff => diff.changes.sprintRecovery);
  const deployDiffs = diffs.filter(diff => diff.changes.deploy);

  return {
    kind: actual.kind,
    scope: actual.scope,
    counts: actual.counts,
    defSprDistribution: actual.defSprDistribution,
    clampCounts: actual.clampCounts,
    digest: { algorithm: 'SHA-256', format: 'canonical-row-v1', value: postDigest },
    perWeaponDigest: perWeaponDigests(cases),
    rawIndexHistograms: rawIndexHistograms(cases),
    phantomOccupancy: phantom,
    clampCaseKeys: postClampKeys,
    sourceFidelity: source,
    migration: {
      removedRungs: {
        primary: { index: 8, value: PRE_MIGRATION_TABLES.primary[8] },
        sidearm: { index: 3, value: PRE_MIGRATION_TABLES.sidearm[3] },
      },
      defSprChanges: [],
      sprintShiftChanges: sourceDerivations,
      phantomOccupancy: phantom,
      diffSummary: {
        composedCaseDiffCount: diffs.length,
        sprintRecoveryValueDiffCount: sprintDiffs.length,
        deployValueDiffCount: deployDiffs.length,
        deployClampCountBefore: transitionPrevious.clampCounts.deploy,
        deployClampCountAfter: actual.clampCounts.deploy,
        deployClampCaseKeysAdded: postClampKeys.deploy.filter(key => !preClampKeys.deploy.includes(key)),
        deployClampCaseKeysRemoved: preClampKeys.deploy.filter(key => !postClampKeys.deploy.includes(key)),
      },
      sourceFidelity: source,
      migrationDiffs: diffs,
    },
    preMigration: {
      kind: previous.kind,
      scope: previous.scope,
      counts: previous.counts,
      defSprDistribution: previous.defSprDistribution,
      clampCounts: previous.clampCounts,
      digest: { algorithm: 'SHA-256', format: 'canonical-row-v1', value: preDigest },
      perWeaponDigest: perWeaponDigests(previousCases),
      rawIndexHistograms: rawIndexHistograms(previousCases),
      phantomOccupancy: phantom,
      clampCaseKeys: historicalPreClampKeys,
    },
    detailSelection: {
      primaryRawIndexAtLeast: 7,
      sidearmRawIndexAtLeast: 2,
      sampleCasesPerWeapon: 3,
      detailCaseCount: details.length,
      includesPreMigrationRelevantCases: true,
      includesAllMigrationDiffs: true,
    },
    detailCases: details,
  };
}

const generatedBaseline = process.argv.includes('--write-baseline') ? buildFixture() : null;
if (generatedBaseline) {
  writeFileSync(baselinePath, `${JSON.stringify(generatedBaseline, null, 2)}\n`);
}
const baseline = generatedBaseline ?? readJson('scripts/sprint-rec-phase2b-ii-baseline.json');
let currentEnumeration;
function current() {
  currentEnumeration ??= buildEnumeration();
  return currentEnumeration;
}

let preMigrationEnumeration;
function preMigration() {
  preMigrationEnumeration ??= buildEnumeration({
    modelAttachments: historicalPreMigrationAttachments(),
    modelBalance: preMigrationBalance(),
    verifyResolver: false,
    indexBase: 1,
    kind: 'sprint-recovery-phase2b-ii-pre-migration',
  });
  return preMigrationEnumeration;
}

let phase2BeforeEnumeration;
function phase2Before() {
  phase2BeforeEnumeration ??= buildEnumeration({
    modelAttachments: preMigrationAttachments(),
    modelBalance: preMigrationBalance(),
    verifyResolver: false,
    indexBase: 1,
    kind: 'sprint-recovery-phase2b-ii-pre-migration-with-phase2b-iii',
  });
  return phase2BeforeEnumeration;
}

test('Phase 2b-ii reconstructs the complete post-migration enumeration', () => {
  const actual = current();
  const restoredPost = buildEnumeration({
    modelAttachments: restoreApprovedGripCorrections(attachments),
    modelBalance: balance,
    verifyResolver: false,
    indexBase: 0,
    kind: 'sprint-recovery-phase2b-ii-post-migration-restored-grip-pods',
  });
  assert.equal(baseline.kind, 'sprint-recovery-phase2b-ii-post-migration');
  assert.deepEqual(baseline.digest, {
    algorithm: 'SHA-256',
    format: 'canonical-row-v1',
    value: baseline.digest.value,
  });
  assert.deepEqual(actual.scope, baseline.scope);
  assert.deepEqual(actual.counts, baseline.counts);
  assert.deepEqual(actual.defSprDistribution, baseline.defSprDistribution);
  assert.deepEqual(actual.clampCounts, baseline.clampCounts);
  assert.equal(baseline.digest.value, '08d8da9b78ad0429f292e60ee8808874c9f54b41a4612227d91b09e6b290ad29');
  const projection = { projectApproved: true };
  const canonical = canonicalSerialization(actual.cases, projection);
  assert.equal(sha256(canonical), sha256(canonicalSerialization(restoredPost.cases, projection)));
  assert.equal(sha256(canonicalSerialization(restoredPost.cases)), baseline.digest.value);
  assert.deepEqual(
    Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
      weaponId,
      sha256(canonicalSerialization(actual.cases.filter(row => row.weaponId === weaponId), projection)),
    ])),
    perWeaponDigests(restoredPost.cases, projection),
  );
  assert.deepEqual(perWeaponDigests(restoredPost.cases), baseline.perWeaponDigest);
  assert.deepEqual(rawIndexHistograms(restoredPost.cases), baseline.rawIndexHistograms);
  assert.deepEqual(rawIndexHistograms(actual.cases, projection), rawIndexHistograms(restoredPost.cases, projection));
  assert.deepEqual(
    projectedDetailCases(sortedCases(actual.cases).filter(row => new Set(baseline.detailCases.map(detail => detail.caseKey)).has(row.caseKey))),
    projectedDetailCases(sortedCases(restoredPost.cases).filter(row => new Set(baseline.detailCases.map(detail => detail.caseKey)).has(row.caseKey))),
  );
  const registeredCaseCount = actual.cases.filter(row => correctionRecordFor(row.gripId)).length;
  assert.ok(registeredCaseCount > 0, 'post-migration witness must surface registered Grip Pod selections');
  console.log(`Sprint approved Grip Pod projected cases: ${registeredCaseCount}`);
});

test('Phase 2b-ii anchors the complete pre-migration digest and histograms', () => {
  const actual = preMigration();
  const pinned = baseline.preMigration;
  const restoredHistorical = buildEnumeration({
    modelAttachments: restoreApprovedGripCorrections(historicalPreMigrationAttachments()),
    modelBalance: preMigrationBalance(),
    verifyResolver: false,
    indexBase: 1,
    kind: 'sprint-recovery-phase2b-ii-pre-migration-restored-grip-pods',
  });
  assert.equal(pinned.kind, 'sprint-recovery-phase2b-ii-pre-migration');
  assert.deepEqual(actual.scope, pinned.scope);
  assert.deepEqual(actual.counts, pinned.counts);
  assert.deepEqual(actual.defSprDistribution, pinned.defSprDistribution);
  assert.deepEqual(actual.clampCounts, pinned.clampCounts);
  assert.equal(pinned.digest.value, '298b89de410b7d84c6de7ae219f72b9ce6ec1d60f36bb6c98b37f5aa9b0837bd');
  const projection = { projectApproved: true };
  assert.equal(sha256(canonicalSerialization(restoredHistorical.cases)), pinned.digest.value);
  assert.deepEqual(perWeaponDigests(restoredHistorical.cases), pinned.perWeaponDigest);
  assert.deepEqual(rawIndexHistograms(restoredHistorical.cases), pinned.rawIndexHistograms);
  assert.equal(sha256(canonicalSerialization(actual.cases, projection)), sha256(canonicalSerialization(restoredHistorical.cases, projection)));
  assert.deepEqual(perWeaponDigests(actual.cases, projection), perWeaponDigests(restoredHistorical.cases, projection));
  assert.deepEqual(rawIndexHistograms(actual.cases, projection), rawIndexHistograms(restoredHistorical.cases, projection));
  assert.deepEqual(clampCaseKeysFor(actual.cases), pinned.clampCaseKeys);
});

test('Phase 2b-ii enforces source fidelity and the derived shift register', () => {
  assert.deepEqual(sourceFidelity(), baseline.migration.sourceFidelity);
  assert.equal(baseline.migration.sourceFidelity.recordCount, 3115);
  assert.equal(baseline.migration.sourceFidelity.offTableCount, 0);
  assert.deepEqual(sourceDerivationEvidence(), baseline.migration.sprintShiftChanges);
  assert.deepEqual(baseline.migration.defSprChanges, []);
  for (const derivation of SPRINT_SHIFT_DERIVATIONS) {
    assert.equal(
      attachments.WEAPON_MAG[derivation.weaponId].mags[derivation.magazineId].sprintRecoveryTierShift,
      derivation.newShift,
      `${derivation.weaponId}/${derivation.magazineId} sprint shift`,
    );
  }
});

test('Phase 2b-ii proves the enumerated transition and phantom disposition', () => {
  const before = phase2Before();
  const after = current();
  const diffs = migrationDiffs(before.cases, after.cases);
  assert.deepEqual(diffs, baseline.migration.migrationDiffs);
  assert.equal(diffs.length, baseline.migration.diffSummary.composedCaseDiffCount);
  assert.equal(diffs.filter(diff => diff.changes.sprintRecovery).length,
    baseline.migration.diffSummary.sprintRecoveryValueDiffCount);
  assert.equal(diffs.filter(diff => diff.changes.deploy).length,
    baseline.migration.diffSummary.deployValueDiffCount);

  const phantom = baseline.migration.phantomOccupancy;
  assert.equal(phantom.primary.caseKeys.length, 135);
  assert.equal(phantom.sidearm.caseKeys.length, 16);
  for (const row of phantom.primary.caseKeys.map(caseKey => after.cases.find(candidate => candidate.caseKey === caseKey))) {
    assert.equal(row.sprintRecovery.value, 300, row.caseKey);
  }
  for (const row of phantom.sidearm.caseKeys.map(caseKey => after.cases.find(candidate => candidate.caseKey === caseKey))) {
    assert.equal(row.sprintRecovery.value, 100, row.caseKey);
  }
});

test('Phase 2b-ii preserves sprint clamp identity and does not grow deploy clamps', () => {
  const actual = current();
  const before = phase2Before();
  assert.deepEqual(actual.clampCounts, {
    sprintRecovery: 40,
    adsMove: 0,
    adsTime: 0,
    deploy: baseline.clampCounts.deploy,
  });
  assert.equal(actual.cases.length, 70634);
  assert.equal(actual.clampCounts.deploy <= before.clampCounts.deploy, true);
  assert.deepEqual(
    actual.cases.filter(row => row.sprintRecovery.clamped).map(row => row.caseKey).sort(),
    before.cases.filter(row => row.sprintRecovery.clamped).map(row => row.caseKey).sort(),
    'the 40 pre-existing sprint clamp caseKeys must remain identical',
  );
  assert.deepEqual(clampCaseKeysFor(actual.cases), baseline.clampCaseKeys);
  assert.deepEqual(
    baseline.migration.diffSummary.deployClampCaseKeysAdded,
    [],
    'no new deploy clamp caseKeys',
  );
});

test('Phase 2b-ii keeps the corrected sprint ladders under the 0-based base representation', () => {
  const actual = current();
  assert.deepEqual(balance.PRIMARY_SPRINT_REC_TIERS, [83, 100, 133, 167, 200, 233, 267, 300, 350]);
  assert.deepEqual(balance.SIDEARM_SPRINT_REC_TIERS, [67, 83, 100, 133, 167, 200, 233]);
  assert.deepEqual(actual.defSprDistribution, { 1: 1, 2: 15, 3: 12, 4: 17, 5: 7, 6: 1, 7: 6 });

  const primary = [...weaponById.values()]
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].sprintRecoveryTierTable !== 'sidearm');
  const sidearms = [...weaponById.values()]
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].sprintRecoveryTierTable === 'sidearm');
  assert.equal(primary.length, 52);
  assert.equal(sidearms.length, 7);
  assert.deepEqual(primary.filter(weapon => attachments.WEAPON_MAG[weapon.id].defSpr >= 8), [],
    'no primary base defSpr currently lies above the corrected ladder');
  assert.deepEqual(sidearms
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].defSpr >= 3)
    .map(weapon => weapon.id)
    .sort(), ['m44', 'vz61']);
  assert.equal(actual.cases.some(row => row.sprintRecovery.value === 333 || row.sprintRecovery.value === 117), false);
  for (const caseKey of baseline.phantomOccupancy.primary.caseKeys) {
    assert.notEqual(actual.cases.find(row => row.caseKey === caseKey).sprintRecovery.rawIndex, 8, caseKey);
  }
  for (const caseKey of baseline.phantomOccupancy.sidearm.caseKeys) {
    assert.notEqual(actual.cases.find(row => row.caseKey === caseKey).sprintRecovery.rawIndex, 3, caseKey);
  }
});
