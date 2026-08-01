import assert from 'node:assert/strict';
import { applyAttachments } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';

function clampIndex(rawIndex, table) {
  return Math.max(0, Math.min(table.length - 1, rawIndex));
}

function indexRecord(rawIndex, table) {
  const index = clampIndex(rawIndex, table);
  return { rawIndex, index, clamped: index !== rawIndex, value: table[index] };
}

function selectableGripIds(modelAttachments, weaponId) {
  const weaponAtts = modelAttachments.WEAPON_ATTS[weaponId] ?? {};
  const gripById = new Map(modelAttachments.GRIPS.map(grip => [grip.id, grip]));
  const gripIds = weaponAtts.laserGripLightCombined
    ? (weaponAtts.laser ?? []).filter(id => gripById.has(id))
    : (weaponAtts.grip ?? []);
  for (const id of gripIds) assert.ok(gripById.has(id), `${weaponId} references unknown grip ${id}`);
  return ['none', ...gripIds].sort();
}

function selectableErgoIds(modelAttachments, weaponId) {
  const ids = modelAttachments.WEAPON_ERGO[weaponId]?.avail ?? [];
  const ergoById = new Map(modelAttachments.ERGOS.map(ergo => [ergo.id, ergo]));
  for (const id of ids) assert.ok(ergoById.has(id), `${weaponId} references unknown ergo ${id}`);
  return ['none', ...ids].sort();
}

function selectableAmmoIds({ ammo, weaponId }) {
  const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
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

function deployBaseIndex(weaponMag, modelBalance) {
  const rawIndex = weaponMag.drawTimeTier + weaponMag.drawTimeOffset
    - modelBalance.DRAW_TIME_AXIS.deploy.coordinateOrigin;
  return Math.max(0, Math.min(modelBalance.DEPLOY_TIME_TIERS.length - 1, rawIndex));
}

function loadoutFor({ modelAttachments, weaponId, barrelId, magazineId, gripId, ergoId, ammoId }) {
  const atts = blankAtts();
  atts.barrel = barrelId;
  atts.mag = magazineId;
  atts.ammo = ammoId;
  atts.ergo = ergoId;
  if (modelAttachments.WEAPON_ATTS[weaponId]?.laserGripLightCombined) atts.laser = gripId;
  else atts.grip = gripId;
  return atts;
}

/**
 * Reconstruct the exact Phase 2b post-migration enumeration. The case key and
 * selectable dimensions are shared by the ADS-move, sprint-recovery, and
 * reload characterization fixtures.
 */
export function buildEnumeration({
  attachments,
  ammo,
  balance,
  weapons,
  modelAttachments = attachments,
  modelBalance = balance,
  verifyResolver = true,
  kind = 'ads-move-phase2b-iii-post-migration',
} = {}) {
  assert.ok(attachments && ammo && balance && weapons, 'enumeration inputs are required');
  const modelGripById = new Map(modelAttachments.GRIPS.map(grip => [grip.id, grip]));
  const modelErgoById = new Map(modelAttachments.ERGOS.map(ergo => [ergo.id, ergo]));
  const modelBarrelById = new Map(modelAttachments.BARRELS.map(barrel => [barrel.id, barrel]));
  const ammoById = new Map(ammo.AMMO.map(ammoType => [ammoType.id, ammoType]));
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
    const ammoIds = selectableAmmoIds({ ammo, weaponId: weapon.id });
    const sprintTable = sprintTableFor(weaponMag, modelBalance);
    const sprintTableName = sprintTableNameFor(weaponMag);
    const baseDeployIdx = deployBaseIndex(weaponMag, modelBalance);
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
          modelAttachments, weaponId: weapon.id, barrelId, magazineId, gripId, ergoId, ammoId,
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
