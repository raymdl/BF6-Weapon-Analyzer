import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const review = readJson('outputs/attachment-audit/attachment-screenshot-review.json');
const exceptions = readJson('outputs/attachment-audit/sweep-reviewed-exceptions-20260731.json');
const baseline = readJson('scripts/ads-move-phase2b-i-baseline.json');
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
const weaponByName = new Map(weapons.map(weapon => [weapon.name, weapon]));

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

function withContext(overrides, callback) {
  setAttachmentContext({ ...baseContext, ...overrides });
  try {
    return callback();
  } finally {
    setAttachmentContext(baseContext);
  }
}

function targetShiftCatalog(catalog, shift) {
  const result = structuredClone(catalog);
  result.cz3a1.mags['20_fast'].adsMoveSpeedTierShift = shift;
  result.pp19.mags['20_fast'].adsMoveSpeedTierShift = shift;
  return result;
}

function buildLegacyMagazineCatalog() {
  const result = structuredClone(attachments.WEAPON_MAG);
  for (const [weaponId, expectedDefAms] of Object.entries(baseline.legacyDefAms)) {
    assert.ok(result[weaponId], `missing legacy catalog fixture weapon ${weaponId}`);
    // The historical fixture stores the pre-2b-i 1-based value; the live
    // resolver now consumes the equivalent 0-based representation.
    result[weaponId].defAms = expectedDefAms - 1;
  }
  return targetShiftCatalog(result, 0);
}

function loadoutFor(weapon, magazineId) {
  const atts = blankAtts();
  atts.barrel = attachments.WEAPON_ATTS[weapon.id]?.barrelDef ?? 'none';
  atts.mag = magazineId;
  return atts;
}

function currentMagazineRows() {
  return Object.entries(attachments.WEAPON_MAG).flatMap(([weaponId, weaponMag]) =>
    Object.keys(weaponMag.mags ?? {}).map(magazineId => ({
      key: `${weaponId}/${magazineId}`,
      weaponId,
      magazineId,
    })));
}

function capture(rows, context) {
  return withContext(context, () => rows.map(row => {
    const weapon = weaponById.get(row.weaponId);
    assert.ok(weapon, `missing weapon ${row.weaponId}`);
    return {
      key: row.key,
      output: structuredClone(applyAttachments(weapon, loadoutFor(weapon, row.magazineId))),
    };
  }));
}

function outputDiffs(before, after) {
  const afterByKey = new Map(after.map(row => [row.key, row.output]));
  return before.flatMap(row => {
    const next = afterByKey.get(row.key);
    assert.ok(next, `missing comparison row ${row.key}`);
    const fields = [...new Set([...Object.keys(row.output), ...Object.keys(next)])]
      .filter(field => !isDeepStrictEqual(row.output[field], next[field]))
      .sort();
    return fields.length ? [{ key: row.key, fields, before: row.output, after: next }] : [];
  });
}

test('Phase 2b-i reindexes ADS move without legacy drift and isolates the two 1.0 results', () => {
  assert.equal(baseline.kind, 'ads-move-phase2b-i-pre-migration');
  assert.deepEqual(balance.ADS_MOVE_TIERS, [1.0, ...baseline.legacyAdsMoveTiers, 0.37]);
  assert.equal(balance.ADS_MOVE_TIERS.includes(0.37), true);
  assert.equal(balance.ADS_MOVE_TIERS.includes(0.325), false);

  const catalogIds = Object.keys(attachments.WEAPON_MAG).sort();
  assert.equal(catalogIds.length, 59);
  assert.deepEqual(catalogIds, Object.keys(baseline.legacyDefAms).sort());
  for (const [weaponId, legacyDefAms] of Object.entries(baseline.legacyDefAms)) {
    assert.equal(attachments.WEAPON_MAG[weaponId].defAms, legacyDefAms, `${weaponId} defAms`);
  }

  const rows = currentMagazineRows();
  const prePp19Rows = rows.filter(row => row.weaponId !== 'pp19');
  assert.equal(prePp19Rows.length, baseline.prePp19MagazineLoadouts);
  assert.equal(rows.length, baseline.prePp19MagazineLoadouts + 5);

  const legacyMag = buildLegacyMagazineCatalog();
  const reindexedMag = targetShiftCatalog(attachments.WEAPON_MAG, 0);
  const legacyOutputs = capture(rows, {
    WEAPON_MAG: legacyMag,
    ADS_MOVE_TIERS: baseline.legacyAdsMoveTiers,
  });
  const reindexedOutputs = capture(rows, {
    WEAPON_MAG: reindexedMag,
    ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
  });
  const reindexDiffs = outputDiffs(legacyOutputs, reindexedOutputs);
  assert.deepEqual(reindexDiffs, [], 'table/index remap must be output-identical');
  assert.equal(outputDiffs(
    capture(prePp19Rows, { WEAPON_MAG: legacyMag, ADS_MOVE_TIERS: baseline.legacyAdsMoveTiers }),
    capture(prePp19Rows, { WEAPON_MAG: reindexedMag, ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS }),
  ).length, 0, 'the documented 260-loadout gate must remain zero-diff');

  const finalOutputs = capture(rows, {
    WEAPON_MAG: attachments.WEAPON_MAG,
    ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
  });
  const finalDiffs = outputDiffs(legacyOutputs, finalOutputs);
  assert.deepEqual(finalDiffs.map(diff => diff.key).sort(), ['cz3a1/20_fast', 'pp19/20_fast']);
  for (const diff of finalDiffs) {
    assert.deepEqual(diff.fields, ['_adsMoveSpeedMult']);
    assert.equal(diff.before._adsMoveSpeedMult, 0.75, `${diff.key} pre-migration ADS move`);
    assert.equal(diff.after._adsMoveSpeedMult, 1.0, `${diff.key} migrated ADS move`);
  }
});

test('Phase 2b-i retains source-backed 1.0 evidence and removes only resolved exceptions', () => {
  assert.equal(attachments.WEAPON_MAG.cz3a1.mags['20_fast'].adsMoveSpeedTierShift, -3);
  assert.equal(attachments.WEAPON_MAG.pp19.mags['20_fast'].adsMoveSpeedTierShift, -3);
  for (const gripId of ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby']) {
    assert.equal(Object.hasOwn(attachments.GRIPS.find(grip => grip.id === gripId), 'adsMoveSpeedTierShift'), true, gripId);
  }

  for (const source of baseline.sourceBackedOnePointZero) {
    const weapon = weaponByName.get(source.weaponName);
    assert.ok(weapon, `missing source weapon ${source.weaponName}`);
    const record = review.records.find(candidate => String(candidate.source?.currentPath ?? '')
      .replace(/\\/g, '/')
      .toLowerCase()
      .endsWith(source.sourceSuffix.toLowerCase()));
    assert.ok(record, `missing source record ${source.sourceSuffix}`);
    assert.equal(record.stats.adsMoveSpeedMultiplier, source.expectedValue, source.sourceSuffix);
    assert.equal(attachments.WEAPON_MAG[weapon.id].mags[source.magazineId].adsMoveSpeedTierShift, -3);
  }

  assert.deepEqual(exceptions.exceptions, []);
  assert.deepEqual(exceptions.counts, { exceptions: 0, recoilLadder: 0, adsMoveTier: 0 });
});
