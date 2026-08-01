import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyAttachments, resolveDrawTime, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';
import {
  assertOnlyApprovedOutputDelta,
  projectCaseOutput,
  restoreApprovedGripCorrections,
  selectedCorrectionRecord,
} from './grip-pod-correction-deltas.mjs';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const baselinePath = join(root, 'scripts/draw-time-phase3-baseline.json');

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const writeBaseline = process.argv.includes('--write-baseline');
const baseline = writeBaseline ? null : JSON.parse(readFileSync(baselinePath, 'utf8'));
const gripById = new Map(attachments.GRIPS.map(grip => [grip.id, grip]));
const ergoById = new Map(attachments.ERGOS.map(ergo => [ergo.id, ergo]));
const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
const barrelById = new Map(attachments.BARRELS.map(barrel => [barrel.id, barrel]));
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
const restoredAttachments = restoreApprovedGripCorrections(attachments);

const BASELINE_KIND = 'draw-time-phase3-pre-migration';
const UNRELATED_FIELDS = [
  '_adsTimeMs', '_adsMoveSpeedMult', '_adsRecoilReductionPct', '_adsSpreadDecayBoost',
  '_adsRecoilDecayMult', '_hipSpreadDecayBoost', '_worldSpot', '_minimapSpot',
  '_weaponSway', '_visualRecoil', '_laserVisible', '_movingAdsSpreadTierMod',
  '_movingAdsMinSpreadDeg', '_adsTimeTierMod', '_hsMult', '_limbMult', '_limbClass',
  '_collateralMult', 'rpm', 'fireMode', 'burstRounds', 'burstBurstsPerMinute', 'burstRpm',
  'spread', 'recoilV', 'recoilVar', 'recoilIncAds', 'bulletVel', 'mag', 'tacRld',
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
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
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

function sprintTableFor(weaponMag) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm'
    ? (balance.SIDEARM_SPRINT_REC_TIERS.length ? balance.SIDEARM_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS)
    : (balance.PRIMARY_SPRINT_REC_TIERS.length ? balance.PRIMARY_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS);
}

function sprintTableNameFor(weaponMag) {
  return weaponMag.sprintRecoveryTierTable === 'sidearm' ? 'sidearm' : 'primary';
}

// This function is deliberately confined to --write-baseline historical capture. It is
// never used by the resolver or by post-migration assertions.
function legacyNearestDeployIndex(weapon) {
  const baseDeployMs = weapon.deployT * 1000;
  let index = 0;
  for (let candidate = 1; candidate < balance.DEPLOY_TIME_TIERS.length; candidate++) {
    if (Math.abs(balance.DEPLOY_TIME_TIERS[candidate] - baseDeployMs)
      < Math.abs(balance.DEPLOY_TIME_TIERS[index] - baseDeployMs)) index = candidate;
  }
  return index;
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

function stableJson(value) {
  return JSON.stringify(value, (_key, entry) => entry === undefined ? null : entry);
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function unrelatedDigest(output) {
  return sha256(stableJson(Object.fromEntries(UNRELATED_FIELDS.map(field => [field, output[field]]))));
}

function canonicalRow(row) {
  return stableJson([
    row.caseKey,
    row.sprintTable,
    row.legacy.sprintRecovery,
    row.legacy.deploy,
    row.legacy.unrelatedDigest,
  ]);
}

function perWeaponDigest(cases) {
  return Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
    weaponId,
    sha256(cases.filter(row => row.caseKey.startsWith(`${weaponId}/`)).map(canonicalRow).sort().join('\n')),
  ]));
}

function compactIndexRecord(record) {
  return [record.rawIndex, record.index, record.clamped, record.value];
}

function expandIndexRecord(record) {
  const [rawIndex, index, clamped, value] = record;
  return { rawIndex, index, clamped, value };
}

function outputForCase(caseKey, modelAttachments = attachments) {
  const [weaponId, magazineId, gripId, ergoId, ammoId] = caseKey.split('/');
  const weapon = weaponById.get(weaponId);
  const barrelId = attachments.WEAPON_ATTS[weapon.id]?.barrelDef ?? 'none';
  setAttachmentContext({ ...baseContext, GRIPS: modelAttachments.GRIPS });
  const output = applyAttachments(weapon, loadoutFor({
    weaponId: weapon.id,
    barrelId,
    magazineId,
    gripId,
    ergoId,
    ammoId,
  }));
  setAttachmentContext(baseContext);
  return output;
}

function currentOutputForCase(caseKey) {
  return outputForCase(caseKey, attachments);
}

function restoredOutputForCase(caseKey) {
  return outputForCase(caseKey, restoredAttachments);
}

function assertApprovedCaseDelta(row, output) {
  const [weaponId, , gripId, , ] = row.caseKey.split('/');
  const atts = loadoutFor({
    weaponId,
    barrelId: attachments.WEAPON_ATTS[weaponId]?.barrelDef ?? 'none',
    magazineId: row.caseKey.split('/')[1],
    gripId,
    ergoId: row.caseKey.split('/')[3],
    ammoId: row.caseKey.split('/')[4],
  });
  const record = selectedCorrectionRecord(weaponId, atts, attachments);
  if (!record) return false;
  const restored = restoredOutputForCase(row.caseKey);
  const delta = assertOnlyApprovedOutputDelta(restored, output, record);
  for (const field of ['_sprintRecoveryMs', '_deployTimeMs', 'deployT']) {
    assert.equal(output[field], restored[field], `${row.caseKey} approved correction changed ${field}`);
  }
  assert.equal(unrelatedDigest(restored), row.legacy.unrelatedDigest, `${row.caseKey} restored unrelated output`);
  // The projection is intentionally exercised here so a future field added to
  // the register cannot silently bypass this witness.
  assert.deepEqual(projectCaseOutput(output, weaponId, atts, attachments), projectCaseOutput(restored, weaponId, atts, attachments), `${row.caseKey} approved projection`);
  return delta;
}

function currentResolutionForCase(caseKey) {
  const [weaponId, magazineId, gripId, ergoId] = caseKey.split('/');
  const weaponMag = attachments.WEAPON_MAG[weaponId];
  const magazine = weaponMag.mags[magazineId];
  const grip = attachments.GRIPS.find(item => item.id === gripId) ?? { sprintRecoveryTierShift: 0 };
  const ergo = attachments.ERGOS.find(item => item.id === ergoId) ?? { sprintRecoveryTierShift: 0 };
  return resolveDrawTime({
    weaponMag,
    magazineSprintRecoveryTierShift: magazine.sprintRecoveryTierShift ?? 0,
    gripSprintRecoveryTierShift: grip.sprintRecoveryTierShift ?? 0,
    ergonomicsSprintRecoveryTierShift: ergo.sprintRecoveryTierShift ?? 0,
    axis: balance.DRAW_TIME_AXIS,
    primarySprintTable: balance.PRIMARY_SPRINT_REC_TIERS,
    sidearmSprintTable: balance.SIDEARM_SPRINT_REC_TIERS,
    deployTable: balance.DEPLOY_TIME_TIERS,
  });
}

// This is a bounded timing-effective witness: it crosses every weapon,
// magazine, selectable grip, selectable ergonomic, and available ammo choice
// while fixing the barrel to each weapon's default barrelDef. Sight, muzzle,
// laser, and light cross-products belong to the reduced Phase 5 separability
// witness, not this fixture.
function buildLegacyFixture() {
  const rows = [];
  const clampCounts = { sprintRecovery: 0, deploy: 0 };
  const groupCounts = {};
  const weaponDeployT = {};

  for (const weapon of [...weapons].sort((a, b) => a.id.localeCompare(b.id))) {
    const weaponMag = attachments.WEAPON_MAG[weapon.id];
    assert.ok(weaponMag, `missing magazine catalog for ${weapon.id}`);
    assert.equal(typeof weapon.deployT, 'number', `${weapon.id} needs legacy deployT during baseline capture`);
    const barrelId = attachments.WEAPON_ATTS[weapon.id]?.barrelDef ?? 'none';
    assert.ok(barrelById.has(barrelId), `${weapon.id} has unknown default barrel ${barrelId}`);
    const magazineIds = Object.keys(weaponMag.mags ?? {}).sort();
    const gripIds = selectableGripIds(weapon.id);
    const ergoIds = selectableErgoIds(weapon.id);
    const ammoIds = selectableAmmoIds(weapon.id);
    const sprintTable = sprintTableFor(weaponMag);
    const sprintTableName = sprintTableNameFor(weaponMag);
    const baseDeployIndex = legacyNearestDeployIndex(weapon);
    weaponDeployT[weapon.id] = { deployT: weapon.deployT, deployMs: weapon.deployT * 1000 };
    groupCounts[sprintTableName] = (groupCounts[sprintTableName] ?? 0) + 1;

    for (const magazineId of magazineIds) {
      const magazine = weaponMag.mags[magazineId];
      for (const gripId of gripIds) {
        const grip = gripById.get(gripId);
        for (const ergoId of ergoIds) {
          const ergo = ergoById.get(ergoId);
          for (const ammoId of ammoIds) {
            const ammoType = ammoById.get(ammoId);
            const caseKey = `${weapon.id}/${magazineId}/${gripId}/${ergoId}/${ammoId}`;
            const rawSprintRecovery = weaponMag.defSpr
              + (magazine.sprintRecoveryTierShift ?? 0)
              + (grip.sprintRecoveryTierShift ?? 0)
              + (ergo.sprintRecoveryTierShift ?? 0);
            const rawDeploy = baseDeployIndex
              + (magazine.sprintRecoveryTierShift ?? 0)
              + (grip.sprintRecoveryTierShift ?? 0);
            const sprintRecovery = indexRecord(rawSprintRecovery, sprintTable);
            const deploy = indexRecord(rawDeploy, balance.DEPLOY_TIME_TIERS);
            if (sprintRecovery.clamped) clampCounts.sprintRecovery++;
            if (deploy.clamped) clampCounts.deploy++;
            const output = applyAttachments(weapon, loadoutFor({
              weaponId: weapon.id,
              barrelId,
              magazineId,
              gripId,
              ergoId,
              ammoId,
            }));
            assert.equal(output._sprintRecoveryMs, sprintRecovery.value, `${caseKey} legacy sprint`);
            assert.equal(output._deployTimeMs, deploy.value, `${caseKey} legacy deploy`);
            rows.push({
              caseKey,
              sprintTable: sprintTableName,
              legacy: {
                sprintRecovery: compactIndexRecord(sprintRecovery),
                deploy: compactIndexRecord(deploy),
                unrelatedDigest: unrelatedDigest(output),
              },
            });
          }
        }
      }
    }
  }

  const canonical = rows.map(canonicalRow).sort().join('\n');
  return {
    kind: BASELINE_KIND,
    scope: {
      weaponCount: weapons.length,
      magazineEntryCount: Object.values(attachments.WEAPON_MAG).reduce((sum, entry) => sum + Object.keys(entry.mags ?? {}).length, 0),
      caseDimensions: 'weapon × magazine × selectable grip × selectable ergonomic × available ammo; default barrel only',
      barrelSelection: 'WEAPON_ATTS[weaponId].barrelDef for every case',
      omittedDimensions: ['sight', 'muzzle', 'laser', 'light'],
      coverageNote: 'Timing-effective witness only; the reduced Phase 5 separability witness covers the other selectable slots.',
      caseKey: 'weaponId/magazineId/gripId/ergoId/ammoId',
    },
    counts: {
      weapons: weapons.length,
      cases: rows.length,
      primaryWeapons: groupCounts.primary ?? 0,
      sidearmWeapons: groupCounts.sidearm ?? 0,
    },
    clampCounts,
    legacyDeployT: weaponDeployT,
    digest: { algorithm: 'SHA-256', format: 'draw-time-legacy-row-v1', value: sha256(canonical) },
    perWeaponDigest: perWeaponDigest(rows),
    cases: rows,
  };
}

if (writeBaseline) {
  const fixture = buildLegacyFixture();
  writeFileSync(baselinePath, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(JSON.stringify({
    path: baselinePath,
    digest: fixture.digest,
    counts: fixture.counts,
    clampCounts: fixture.clampCounts,
  }, null, 2));
} else {
  test('pre-migration draw-time fixture covers the bounded timing-effective witness', () => {
    assert.equal(baseline.kind, BASELINE_KIND);
    assert.equal(baseline.counts.weapons, 59);
    assert.equal(baseline.counts.cases, 70634);
    assert.equal(baseline.cases.length, baseline.counts.cases);
    assert.equal(baseline.scope.caseDimensions,
      'weapon × magazine × selectable grip × selectable ergonomic × available ammo; default barrel only');
    assert.equal(baseline.scope.barrelSelection, 'WEAPON_ATTS[weaponId].barrelDef for every case');
    assert.deepEqual(baseline.scope.omittedDimensions, ['sight', 'muzzle', 'laser', 'light']);
    assert.equal(baseline.scope.coverageNote,
      'Timing-effective witness only; the reduced Phase 5 separability witness covers the other selectable slots.');
    assert.equal(baseline.digest.algorithm, 'SHA-256');
    assert.equal(baseline.digest.format, 'draw-time-legacy-row-v1');
    assert.deepEqual(baseline.clampCounts, { sprintRecovery: 40, deploy: 435 });
    assert.equal(Object.keys(baseline.legacyDeployT).length, 59);
    assert.equal(sha256(baseline.cases.map(canonicalRow).sort().join('\n')), baseline.digest.value);
    assert.deepEqual(perWeaponDigest(baseline.cases), baseline.perWeaponDigest);
  });

  test('the axis and 59 WEAPON_MAG assignments are exact, and the old resolver path is absent', () => {
    const expectedCounts = { primary: 51, db12: 1, semiAutoSidearm: 4, revolverOrAutoSidearm: 3 };
    assert.deepEqual(
      Object.fromEntries(Object.entries(balance.DRAW_TIME_AXIS.weaponGroups).map(([group, ids]) => [group, ids.length])),
      expectedCounts,
    );
    assert.equal(Object.keys(attachments.WEAPON_MAG).length, 59);
    for (const [group, ids] of Object.entries(balance.DRAW_TIME_AXIS.weaponGroups)) {
      for (const weaponId of ids) {
        const weaponMag = attachments.WEAPON_MAG[weaponId];
        assert.ok(weaponMag, `${weaponId} missing WEAPON_MAG`);
        assert.equal(weaponMag.drawTimeGroup, group, weaponId);
        assert.equal(weaponMag.drawTimeOffset, balance.DRAW_TIME_AXIS.offsets[group], weaponId);
        assert.equal(Number.isInteger(weaponMag.drawTimeTier), true, weaponId);
        assert.ok(weaponMag.drawTimeTier >= 0 && weaponMag.drawTimeTier <= 7, weaponId);
      }
    }
    const resolverSource = readFileSync(join(root, 'sim/applyAttachments.js'), 'utf8');
    assert.doesNotMatch(resolverSource, /Math\.abs\(DEPLOY_TIME_TIERS/);
    assert.doesNotMatch(resolverSource, /baseDeployIdx/);
  });

  test('resolveDrawTime fails closed for an invalid sprint recovery table', () => {
    const malformed = {
      ...attachments.WEAPON_MAG.m433,
      sprintRecoveryTierTable: 'malformed',
    };
    const missing = { ...attachments.WEAPON_MAG.m433 };
    delete missing.sprintRecoveryTierTable;
    for (const [label, weaponMag] of [['unknown', malformed], ['missing', missing]]) {
      const resolution = resolveDrawTime({
        weaponMag,
        magazineSprintRecoveryTierShift: 0,
        gripSprintRecoveryTierShift: 0,
        ergonomicsSprintRecoveryTierShift: 0,
        axis: balance.DRAW_TIME_AXIS,
        primarySprintTable: balance.PRIMARY_SPRINT_REC_TIERS,
        sidearmSprintTable: balance.SIDEARM_SPRINT_REC_TIERS,
        deployTable: balance.DEPLOY_TIME_TIERS,
      });
      assert.equal(resolution.valid, false, label);
      assert.equal(resolution.reason, 'invalid-sprint-recovery-tier-table', label);
    }
  });

  test('named boundary cases render both outputs from one coordinate', () => {
    const expected = {
      m433: { group: 'primary', table: 'primary', offset: 8, draw: 4, sprint: 200, deploy: 633 },
      es57: { group: 'semiAutoSidearm', table: 'sidearm', offset: 5, draw: 0, sprint: 83, deploy: 233 },
      ggh22: { group: 'semiAutoSidearm', table: 'sidearm', offset: 5, draw: 1, sprint: 100, deploy: 267 },
      p18: { group: 'semiAutoSidearm', table: 'sidearm', offset: 5, draw: 1, sprint: 100, deploy: 267 },
      m45a1: { group: 'semiAutoSidearm', table: 'sidearm', offset: 5, draw: 1, sprint: 100, deploy: 267 },
      m357trait: { group: 'revolverOrAutoSidearm', table: 'sidearm', offset: 7, draw: 1, sprint: 100, deploy: 350 },
      m44: { group: 'revolverOrAutoSidearm', table: 'sidearm', offset: 7, draw: 2, sprint: 133, deploy: 400 },
      vz61: { group: 'revolverOrAutoSidearm', table: 'sidearm', offset: 7, draw: 2, sprint: 133, deploy: 400 },
      db12: { group: 'db12', table: 'primary', offset: 9, draw: 2, sprint: 133, deploy: 533 },
    };
    for (const [weaponId, expectedCase] of Object.entries(expected)) {
      const resolution = resolveDrawTime({
        weaponMag: attachments.WEAPON_MAG[weaponId],
        magazineSprintRecoveryTierShift: 0,
        gripSprintRecoveryTierShift: 0,
        ergonomicsSprintRecoveryTierShift: 0,
        axis: balance.DRAW_TIME_AXIS,
        primarySprintTable: balance.PRIMARY_SPRINT_REC_TIERS,
        sidearmSprintTable: balance.SIDEARM_SPRINT_REC_TIERS,
        deployTable: balance.DEPLOY_TIME_TIERS,
      });
      assert.equal(resolution.baseDrawTimeTier, expectedCase.draw, weaponId);
      assert.equal(resolution.offsetGroup, expectedCase.group, weaponId);
      assert.equal(resolution.offset, expectedCase.offset, weaponId);
      assert.equal(resolution.sprint.table, expectedCase.table, `${weaponId} table`);
      assert.equal(resolution.sprint.index.value, expectedCase.sprint, `${weaponId} sprint`);
      assert.equal(resolution.deploy.index.value, expectedCase.deploy, `${weaponId} deploy`);
    }
  });

  test('magazine, grip, and ergonomics shifts are inventoried once with the named deploy exception', () => {
    for (const weaponId of ['m433', 'es57', 'm357trait', 'db12']) {
      const row = baseline.cases.find(candidate => {
        const [candidateWeapon, magazineId, gripId, ergoId] = candidate.caseKey.split('/');
        if (candidateWeapon !== weaponId) return false;
        const weaponMag = attachments.WEAPON_MAG[weaponId];
        const magazine = weaponMag.mags[magazineId];
        const grip = attachments.GRIPS.find(item => item.id === gripId);
        const ergo = attachments.ERGOS.find(item => item.id === ergoId);
        return (magazine.sprintRecoveryTierShift ?? 0) !== 0
          || (grip?.sprintRecoveryTierShift ?? 0) !== 0
          || (ergo?.sprintRecoveryTierShift ?? 0) !== 0;
      });
      assert.ok(row, `${weaponId}: missing legal attachment-shift case`);
      const [, magazineId, gripId, ergoId] = row.caseKey.split('/');
      const weaponMag = attachments.WEAPON_MAG[weaponId];
      const magazine = weaponMag.mags[magazineId];
      const grip = attachments.GRIPS.find(item => item.id === gripId) ?? { sprintRecoveryTierShift: 0 };
      const ergo = attachments.ERGOS.find(item => item.id === ergoId) ?? { sprintRecoveryTierShift: 0 };
      const magazineShift = magazine.sprintRecoveryTierShift ?? 0;
      const gripShift = grip.sprintRecoveryTierShift ?? 0;
      const ergoShift = ergo.sprintRecoveryTierShift ?? 0;
      const resolution = currentResolutionForCase(row.caseKey);
      assert.equal(resolution.effectiveDrawTimeTier,
        weaponMag.drawTimeTier + magazineShift + gripShift + ergoShift, row.caseKey);
      assert.equal(resolution.deploy.coordinate,
        resolution.effectiveDrawTimeTier + weaponMag.drawTimeOffset - ergoShift, row.caseKey);
      assert.equal(resolution.deployErgonomicsException.id, 'ergonomics-sprint-only', row.caseKey);
    }
  });

  test('post-migration resolver output matches the frozen player-visible witness', () => {
    assert.equal(typeof balance.DRAW_TIME_AXIS, 'object', 'shared draw-time axis is required');
    const clampCounts = { sprintRecovery: 0, deploy: 0 };
    const approvedDeltaCounts = new Map();
    for (const row of baseline.cases) {
      const output = currentOutputForCase(row.caseKey);
      const sprintRecovery = expandIndexRecord(row.legacy.sprintRecovery);
      const deploy = expandIndexRecord(row.legacy.deploy);
      const resolution = currentResolutionForCase(row.caseKey);
      if (resolution.sprint.index.clamped) clampCounts.sprintRecovery++;
      if (resolution.deploy.index.clamped) clampCounts.deploy++;
      assert.equal(output._sprintRecoveryMs, sprintRecovery.value, `${row.caseKey} sprint`);
      assert.equal(output._deployTimeMs, deploy.value, `${row.caseKey} deploy`);
      assert.equal(output.deployT, +(deploy.value / 1000).toFixed(3), `${row.caseKey} deploy display`);
      const delta = assertApprovedCaseDelta(row, output);
      if (delta) {
        approvedDeltaCounts.set(delta.gripId, (approvedDeltaCounts.get(delta.gripId) ?? 0) + 1);
      } else {
        assert.equal(unrelatedDigest(output), row.legacy.unrelatedDigest, `${row.caseKey} unrelated output`);
      }
    }
    assert.deepEqual(clampCounts, baseline.clampCounts);
    assert.ok(approvedDeltaCounts.size >= 1, 'the timing witness must exercise a registered Grip Pod correction');
    console.log(`Draw-Time approved Grip Pod cases: ${JSON.stringify(Object.fromEntries([...approvedDeltaCounts.entries()].sort()))}`);
  });
}

export { buildLegacyFixture, canonicalRow, unrelatedDigest };
