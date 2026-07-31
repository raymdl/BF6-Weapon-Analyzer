import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const baselinePath = join(root, 'scripts/sprint-rec-phase2b-ii-baseline.json');

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const gripById = new Map(attachments.GRIPS.map(grip => [grip.id, grip]));
const ergoById = new Map(attachments.ERGOS.map(ergo => [ergo.id, ergo]));
const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
const barrelById = new Map(attachments.BARRELS.map(barrel => [barrel.id, barrel]));
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

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

function selectableGripIds(weaponId) {
  const weaponAtts = attachments.WEAPON_ATTS[weaponId] ?? {};
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

function sprintTableFor(weaponMag) {
  if (weaponMag.sprintRecoveryTierTable === 'sidearm') {
    return balance.SIDEARM_SPRINT_REC_TIERS.length
      ? balance.SIDEARM_SPRINT_REC_TIERS
      : balance.SPRINT_REC_TIERS;
  }
  return balance.PRIMARY_SPRINT_REC_TIERS.length
    ? balance.PRIMARY_SPRINT_REC_TIERS
    : balance.SPRINT_REC_TIERS;
}

function sprintTableNameFor(weaponMag) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm' ? 'sidearm' : 'primary';
}

function deployBaseIndex(weapon) {
  const baseDeployMs = weapon.deployT * 1000;
  let baseIndex = 0;
  for (let i = 1; i < balance.DEPLOY_TIME_TIERS.length; i++) {
    if (Math.abs(balance.DEPLOY_TIME_TIERS[i] - baseDeployMs)
      < Math.abs(balance.DEPLOY_TIME_TIERS[baseIndex] - baseDeployMs)) {
      baseIndex = i;
    }
  }
  return baseIndex;
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

function buildEnumeration() {
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
    const weaponMag = attachments.WEAPON_MAG[weapon.id];
    assert.ok(weaponMag, `missing magazine catalog for ${weapon.id}`);
    assert.notEqual(weapon.deployT, null, `${weapon.id} has no deploy time`);
    assert.notEqual(weaponMag.defAds, null, `${weapon.id} has no defAds`);
    assert.notEqual(weaponMag.defSpr, null, `${weapon.id} has no defSpr`);
    assert.notEqual(weaponMag.defAms, null, `${weapon.id} has no defAms`);

    const weaponAtts = attachments.WEAPON_ATTS[weapon.id] ?? {};
    const barrelId = weaponAtts.barrelDef ?? 'none';
    const barrel = barrelById.get(barrelId);
    assert.ok(barrel, `${weapon.id} has unknown default barrel ${barrelId}`);

    const magazineIds = Object.keys(weaponMag.mags ?? {}).sort();
    const gripIds = selectableGripIds(weapon.id);
    const ergoIds = selectableErgoIds(weapon.id);
    const ammoIds = selectableAmmoIds(weapon.id);
    assert.ok(magazineIds.length, `${weapon.id} has no selectable magazines`);
    assert.ok(ammoIds.length, `${weapon.id} has no selectable ammo`);
    magazineEntryCount += magazineIds.length;
    dimensionTotals.gripChoices += gripIds.length;
    dimensionTotals.ergoChoices += ergoIds.length;
    dimensionTotals.ammoChoices += ammoIds.length;
    defSprDistribution[weaponMag.defSpr] = (defSprDistribution[weaponMag.defSpr] ?? 0) + 1;

    const sprintTable = sprintTableFor(weaponMag);
    const sprintTableName = sprintTableNameFor(weaponMag);
    tableCaseCounts[sprintTableName] += magazineIds.length * gripIds.length * ergoIds.length * ammoIds.length;
    const baseDeployIdx = deployBaseIndex(weapon);

    for (const magazineId of magazineIds) {
      const magazine = weaponMag.mags[magazineId];
      for (const gripId of gripIds) {
        const grip = gripById.get(gripId);
        for (const ergoId of ergoIds) {
          const ergo = ergoById.get(ergoId);
          for (const ammoId of ammoIds) {
            const ammoType = ammoById.get(ammoId);
            const caseKey = `${weapon.id}/${magazineId}/${gripId}/${ergoId}/${ammoId}`;
            const rawAdsTime = (weaponMag.defAds - 1)
              + (magazine.adsTimeTierShift ?? 0)
              - (grip.adsTimeTierMod ?? 0)
              - (barrel.adsTimeTierMod ?? 0);
            const rawSprintRecovery = (weaponMag.defSpr - 1)
              + (magazine.sprintRecoveryTierShift ?? 0)
              + (grip.sprintRecoveryTierShift ?? 0)
              + (ergo.sprintRecoveryTierShift ?? 0);
            const rawAdsMove = (weaponMag.defAms - 1)
              + (magazine.adsMoveSpeedTierShift ?? 0)
              + (grip.adsMoveSpeedTierShift ?? 0)
              + (ammoType.adsMoveSpeedTierShift ?? 0);
            const rawDeploy = baseDeployIdx
              + (magazine.sprintRecoveryTierShift ?? 0)
              + (grip.sprintRecoveryTierShift ?? 0);
            const indices = {
              adsTime: indexRecord(rawAdsTime, balance.ADS_SPD_TIERS),
              sprintRecovery: indexRecord(rawSprintRecovery, sprintTable),
              adsMove: indexRecord(rawAdsMove, balance.ADS_MOVE_TIERS),
              deploy: indexRecord(rawDeploy, balance.DEPLOY_TIME_TIERS),
            };
            for (const [name, record] of Object.entries(indices)) {
              if (record.clamped) clampCounts[name]++;
            }

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
    kind: 'sprint-recovery-phase2b-ii-pre-migration',
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

function rawIndexHistograms(cases) {
  const result = {
    sprintRecovery: { primary: {}, sidearm: {} },
    adsMove: { primary: {}, sidearm: {} },
    adsTime: { primary: {}, sidearm: {} },
    deploy: { primary: {}, sidearm: {} },
  };
  for (const row of cases) {
    const table = row.sprintTable;
    for (const [name, index] of [
      ['sprintRecovery', row.sprintRecovery.rawIndex],
      ['adsMove', row.adsMove.rawIndex],
      ['adsTime', row.adsTime.rawIndex],
      ['deploy', row.deploy.rawIndex],
    ]) {
      const histogram = result[name][table];
      histogram[index] = (histogram[index] ?? 0) + 1;
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

function buildFixture() {
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

test('Phase 2b-ii reconstructs the complete current sprint/ADS index enumeration', () => {
  const actual = current();
  assert.equal(baseline.kind, 'sprint-recovery-phase2b-ii-pre-migration');
  assert.deepEqual(baseline.digest, {
    algorithm: 'SHA-256',
    format: 'canonical-row-v1',
    value: baseline.digest.value,
  });
  assert.deepEqual(actual.scope, baseline.scope);
  assert.deepEqual(actual.counts, baseline.counts);
  assert.deepEqual(actual.defSprDistribution, baseline.defSprDistribution);
  assert.deepEqual(actual.clampCounts, baseline.clampCounts);
  const canonical = canonicalSerialization(actual.cases);
  assert.equal(sha256(canonical), baseline.digest.value);
  assert.deepEqual(
    Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
      weaponId,
      sha256(canonicalSerialization(actual.cases.filter(row => row.weaponId === weaponId))),
    ])),
    baseline.perWeaponDigest,
  );
  assert.deepEqual(rawIndexHistograms(actual.cases), baseline.rawIndexHistograms);
  assert.deepEqual(detailCases(actual.cases), baseline.detailCases);
});

test('Phase 2b-ii pins current clamp counts, including pre-existing clamps', () => {
  const actual = current();
  assert.deepEqual(actual.clampCounts, {
    sprintRecovery: 40,
    adsMove: 0,
    adsTime: 0,
    deploy: 522,
  });
  assert.equal(actual.cases.length, 70634);
  assert.equal(actual.cases.filter(row => row.sprintRecovery.clamped).length, 40);
  assert.equal(actual.cases.filter(row => row.adsMove.clamped).length, 0);
  assert.equal(actual.cases.filter(row => row.adsTime.clamped).length, 0);
  assert.equal(actual.cases.filter(row => row.deploy.clamped).length, 522);
  for (const name of ['sprintRecovery', 'adsMove', 'adsTime', 'deploy']) {
    assert.deepEqual(
      actual.cases.filter(row => row[name].clamped).map(row => row.caseKey).sort(),
      baseline.clampCaseKeys[name],
      `${name} clamp case keys`,
    );
  }
});

test('Phase 2b-ii records the primary/sidearm table asymmetry before migration', () => {
  const actual = current();
  assert.deepEqual(balance.PRIMARY_SPRINT_REC_TIERS, [83, 100, 133, 167, 200, 233, 267, 300, 333, 350]);
  assert.deepEqual(balance.SIDEARM_SPRINT_REC_TIERS, [67, 83, 100, 117, 133, 167, 200, 233]);
  assert.deepEqual(actual.defSprDistribution, { 2: 1, 3: 15, 4: 12, 5: 17, 6: 7, 7: 1, 8: 6 });

  const primary = [...weaponById.values()]
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].sprintRecoveryTierTable !== 'sidearm');
  const sidearms = [...weaponById.values()]
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].sprintRecoveryTierTable === 'sidearm');
  assert.equal(primary.length, 52);
  assert.equal(sidearms.length, 7);
  assert.deepEqual(primary.filter(weapon => attachments.WEAPON_MAG[weapon.id].defSpr >= 9), [],
    'no primary base defSpr currently lies above the phantom 333 rung');
  assert.deepEqual(sidearms
    .filter(weapon => attachments.WEAPON_MAG[weapon.id].defSpr >= 4)
    .map(weapon => weapon.id)
    .sort(), ['m44', 'vz61']);
  assert.equal(baseline.phantomOccupancy.primary.caseKeys.length, 135);
  assert.equal(baseline.phantomOccupancy.sidearm.caseKeys.length, 16);
  assert.deepEqual(baseline.phantomOccupancy.primary.caseKeys,
    actual.cases.filter(row => row.sprintTable === 'primary' && row.sprintRecovery.rawIndex === 8)
      .map(row => row.caseKey).sort());
  assert.deepEqual(baseline.phantomOccupancy.sidearm.caseKeys,
    actual.cases.filter(row => row.sprintTable === 'sidearm' && row.sprintRecovery.rawIndex === 3)
      .map(row => row.caseKey).sort());
});
