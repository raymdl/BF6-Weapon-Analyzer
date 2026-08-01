import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts, computeAttPts } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const fixturePath = join(root, 'scripts/attachment-equivalence-phase5.json');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const writeJson = (file, value) => writeFileSync(join(root, file), `${JSON.stringify(value, null, 2)}\n`);

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const weapons = readJson('data/weapons.json');
const manifest = readJson('scripts/reload-phase4-migration-manifest.json');
const barrelVelocityManifest = readJson('scripts/barrel-velocity-phase7-manifest.json');
const preMigrationState = readJson('scripts/reload-phase4-pre-migration-state.json');
const phase5ChangedValues = new Map(manifest.changedValues.map(entry => [entry.key, entry.afterMs]));
const phase5MagCatchCorrections = new Map(manifest.legacyMagCatchCorrections.map(entry => [entry.weaponId, entry.after]));

const sharedContext = {
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  AMMO: ammo.AMMO,
  RECOIL_MULT: readJson('data/balance_tables.json').RECOIL_MULT,
  HIP_SPREAD_TIERS: readJson('data/balance_tables.json').HIP_SPREAD_TIERS,
  HIP_SPREAD_BASE_IDX: readJson('data/balance_tables.json').HIP_SPREAD_BASE_IDX,
  HIP_CLS: readJson('data/balance_tables.json').HIP_CLS,
  BASE_HS_MULT: readJson('data/balance_tables.json').BASE_HS_MULT,
  HP_HS_HIGH: new Set(readJson('data/balance_tables.json').HP_HS_HIGH),
  LIMB_CLASS: readJson('data/balance_tables.json').LIMB_CLASS,
  LIMB_CLASS_MULT: readJson('data/balance_tables.json').LIMB_CLASS_MULT,
  AUTO_HS_MULT: readJson('data/balance_tables.json').AUTO_HS_MULT,
  MOVING_ACC_TIERS: readJson('data/balance_tables.json').MOVING_ACC_TIERS,
  DEFAULT_MOV_TIER: readJson('data/balance_tables.json').DEFAULT_MOV_TIER,
  ADS_SPD_TIERS: readJson('data/balance_tables.json').ADS_SPD_TIERS,
  SPRINT_REC_TIERS: readJson('data/balance_tables.json').SPRINT_REC_TIERS,
  PRIMARY_SPRINT_REC_TIERS: readJson('data/balance_tables.json').PRIMARY_SPRINT_REC_TIERS,
  SIDEARM_SPRINT_REC_TIERS: readJson('data/balance_tables.json').SIDEARM_SPRINT_REC_TIERS,
  DEPLOY_TIME_TIERS: readJson('data/balance_tables.json').DEPLOY_TIME_TIERS,
  ADS_MOVE_TIERS: readJson('data/balance_tables.json').ADS_MOVE_TIERS,
  RELOAD_SPEED_LADDER: readJson('data/balance_tables.json').RELOAD_SPEED_LADDER,
  VELOCITY_LADDER: readJson('data/balance_tables.json').VELOCITY_LADDER,
};

const currentModel = {
  ...attachments,
  ERGOS: attachments.ERGOS,
  WEAPON_MAG: attachments.WEAPON_MAG,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
};

function legacyModel() {
  const model = structuredClone(attachments);
  for (const [weaponId, weaponMag] of Object.entries(model.WEAPON_MAG)) {
    for (const [magazineId, magazine] of Object.entries(weaponMag.mags ?? {})) {
      delete magazine.reloadSpeedTier;
      delete magazine.tacRldOverrideMs;
      delete magazine.suspectedGameBug;
      const key = `${weaponId}/${magazineId}`;
      magazine.tacRld = phase5ChangedValues.get(key)
        ?? preMigrationState.magazines[weaponId]?.[magazineId]?.tacRld
        ?? null;
    }
  }
  for (const ergo of model.ERGOS) delete ergo.reloadSpeedMult;
  for (const [weaponId, weaponErgo] of Object.entries(model.WEAPON_ERGO)) {
    const legacy = preMigrationState.weaponErgo[weaponId];
    if (phase5MagCatchCorrections.has(weaponId)) weaponErgo.magCatchRld = { ...phase5MagCatchCorrections.get(weaponId) };
    else if (legacy) weaponErgo.magCatchRld = { ...legacy };
  }
  return model;
}

const legacy = legacyModel();
const currentContext = { ...sharedContext, ERGOS: currentModel.ERGOS, WEAPON_MAG: currentModel.WEAPON_MAG, WEAPON_ERGO: currentModel.WEAPON_ERGO };
const legacyContext = { ...sharedContext, ERGOS: legacy.ERGOS, WEAPON_MAG: legacy.WEAPON_MAG, WEAPON_ERGO: legacy.WEAPON_ERGO };
setAttachmentContext(currentContext);

function legacyReloadSeconds(weaponId, magazineId, ergoId) {
  const weapon = weapons.find(candidate => candidate.id === weaponId);
  const magazine = legacy.WEAPON_MAG[weaponId].mags[magazineId];
  const weaponErgo = legacy.WEAPON_ERGO[weaponId];
  if (ergoId === 'mag_catch' && weaponErgo?.magCatchRld) {
    const milliseconds = magazine.name.toLowerCase().includes('fast')
      ? (weaponErgo.magCatchRld.fast ?? weaponErgo.magCatchRld.reg)
      : weaponErgo.magCatchRld.reg;
    if (milliseconds != null) return +(milliseconds / 1000).toFixed(3);
  }
  return magazine.tacRld != null ? +(magazine.tacRld / 1000).toFixed(3) : weapon.tacRld;
}

function stable(value) {
  if (value === undefined) return { $undefined: true };
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function serialize(value) {
  return JSON.stringify(stable(value));
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function withoutId(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = { ...value };
  delete copy.id;
  return copy;
}

function sourceById(items) {
  return new Map((items ?? []).map(item => [item.id, item]));
}

function phase5HistoricalDisplayProjection(output, weapon, atts) {
  // The tracked Phase 5 fixture is a reload-migration regression artifact. Its
  // pinned complete-output digests predate the normal-velocity display ruling,
  // so retain the old rounded display in this fixture-only projection. The
  // actual floor display is compared separately by the Phase 7 gate below.
  const barrel = sourceById(currentModel.BARRELS).get(atts.barrel) ?? currentModel.BARRELS[0];
  if (output.bulletVel == null || weapon.bulletVel == null || barrel?.velMult == null) return output;
  return { ...output, bulletVel: Math.round(weapon.bulletVel * barrel.velMult) };
}

function historicalRoundedBulletVelocity(weapon, atts) {
  const barrel = sourceById(currentModel.BARRELS).get(atts.barrel) ?? currentModel.BARRELS[0];
  return weapon.bulletVel != null && barrel?.velMult != null
    ? Math.round(weapon.bulletVel * barrel.velMult)
    : null;
}

function uniqueIds(ids) {
  return [...new Set(ids)];
}

function selectableIds(items, allowedIds, { barrel = false } = {}) {
  const hasNone = items.some(item => item.id === 'none');
  const ids = allowedIds == null ? items.map(item => item.id) : [...(hasNone ? ['none'] : []), ...allowedIds];
  return uniqueIds(ids).filter(id => !barrel || id !== 'none');
}

function optionSignature({ current, legacyValue, semantic = null, points }) {
  return serialize({ current: withoutId(current), legacy: withoutId(legacyValue), semantic, points });
}

function groupedOptions(options) {
  const groups = new Map();
  for (const option of options) {
    const key = optionSignature(option);
    if (!groups.has(key)) groups.set(key, { ...option, multiplicity: 0 });
    groups.get(key).multiplicity += 1;
  }
  return [...groups.values()];
}

function regularOptions(currentItems, legacyItems, ids, { barrel = false, semanticFor = () => null } = {}) {
  const currentById = sourceById(currentItems);
  const legacyById = sourceById(legacyItems);
  return groupedOptions(selectableIds(currentItems, ids, { barrel }).map(id => {
    const current = currentById.get(id);
    const legacyValue = legacyById.get(id);
    assert.ok(current, `unknown current attachment ${id}`);
    assert.ok(legacyValue, `unknown legacy attachment ${id}`);
    return { id, current, legacyValue, semantic: semanticFor(id, current), points: current.pts ?? 0 };
  }));
}

function combinedOptions(modelCurrent, modelLegacy, weaponAtts) {
  const currentLasers = sourceById(modelCurrent.LASERS);
  const legacyLasers = sourceById(modelLegacy.LASERS);
  const currentGrips = sourceById(modelCurrent.GRIPS);
  const legacyGrips = sourceById(modelLegacy.GRIPS);
  const currentLights = sourceById(modelCurrent.LIGHTS);
  const legacyLights = sourceById(modelLegacy.LIGHTS);
  const ids = uniqueIds(['none', ...(weaponAtts.laser ?? []), ...(weaponAtts.light ?? [])]);
  const options = ids.map(id => {
    // applyAttachments resolves a combined ID in this exact order: laser, grip,
    // then light. Preserve that role in the quotient key because it changes
    // which fields are consumed by the resolver.
    const role = currentLasers.has(id) ? 'laser' : currentGrips.has(id) ? 'grip' : 'light';
    const current = role === 'laser' ? currentLasers.get(id) : role === 'grip' ? currentGrips.get(id) : currentLights.get(id);
    const legacyValue = role === 'laser' ? legacyLasers.get(id) : role === 'grip' ? legacyGrips.get(id) : legacyLights.get(id);
    assert.ok(current, `unknown combined current attachment ${id}`);
    assert.ok(legacyValue, `unknown combined legacy attachment ${id}`);
    return { id, current, legacyValue, semantic: role, points: current.pts ?? 0 };
  });
  return groupedOptions(options);
}

function magazineOptions(weaponId) {
  const currentMags = currentModel.WEAPON_MAG[weaponId]?.mags ?? {};
  const legacyMags = legacy.WEAPON_MAG[weaponId]?.mags ?? {};
  return groupedOptions(Object.keys(currentMags).sort().map(id => ({
    id,
    current: currentMags[id],
    legacyValue: legacyMags[id],
    points: currentMags[id].pts ?? 0,
  })));
}

function ergoOptions(weaponId) {
  const currentById = sourceById(currentModel.ERGOS);
  const legacyById = sourceById(legacy.ERGOS);
  const ids = ['none', ...(currentModel.WEAPON_ERGO[weaponId]?.avail ?? [])];
  return groupedOptions(uniqueIds(ids).map(id => ({
    id,
    current: currentById.get(id),
    legacyValue: legacyById.get(id),
    semantic: id,
    points: currentById.get(id)?.pts ?? 0,
  })));
}

function ammoOptions(weaponId) {
  const ids = Object.keys(ammo.WEAPON_AMMO[weaponId]?.ammo ?? {}).sort();
  const currentById = sourceById(ammo.AMMO);
  return groupedOptions(ids.map(id => ({
    id,
    current: currentById.get(id),
    legacyValue: currentById.get(id),
    semantic: id,
    points: ammo.WEAPON_AMMO[weaponId].ammo[id] ?? 0,
  })));
}

function dimensionsFor(weaponId) {
  const wa = currentModel.WEAPON_ATTS[weaponId] ?? {};
  const dims = {
    sight: regularOptions(currentModel.SIGHTS, currentModel.SIGHTS, wa.sight, {
      semanticFor: id => id === 'iron' ? 'iron' : 'optic',
    }),
    muzzle: regularOptions(currentModel.MUZZLES, currentModel.MUZZLES, wa.muzzle),
    barrel: regularOptions(currentModel.BARRELS, currentModel.BARRELS, wa.barrel, { barrel: true }),
    grip: regularOptions(currentModel.GRIPS, currentModel.GRIPS, wa.laserGripLightCombined ? [] : wa.grip),
    laser: wa.laserGripLightCombined || wa.laserLightCombined
      ? combinedOptions(currentModel, legacy, wa)
      : regularOptions(currentModel.LASERS, currentModel.LASERS, wa.laser),
    light: wa.laserLightCombined ? [{ id: 'none', current: currentModel.LIGHTS[0], legacyValue: legacy.LIGHTS[0], points: 0, multiplicity: 1 }] :
      wa.laserGripLightCombined ? [{ id: 'none', current: currentModel.LIGHTS[0], legacyValue: legacy.LIGHTS[0], points: 0, multiplicity: 1 }] :
        regularOptions(currentModel.LIGHTS, currentModel.LIGHTS, wa.light),
    ammo: ammoOptions(weaponId),
    magazine: magazineOptions(weaponId),
    ergo: ergoOptions(weaponId),
  };
  // Combined VZ.61 owns the grip selection inside the laser selector.
  if (wa.laserGripLightCombined) dims.grip = [{ id: 'none', current: currentModel.GRIPS[0], legacyValue: legacy.GRIPS[0], points: 0, multiplicity: 1 }];
  return dims;
}

function dimensionsArray(dims) {
  return ['sight', 'muzzle', 'barrel', 'grip', 'laser', 'light', 'ammo', 'magazine', 'ergo'].map(key => [key, dims[key]]);
}

const reloadSensitiveDimensions = new Set(['magazine', 'ergo']);

function quotientOptions(options, keyFor) {
  const groups = new Map();
  for (const option of options) {
    const key = keyFor(option);
    if (!groups.has(key)) groups.set(key, { ...option, multiplicity: 0 });
    groups.get(key).multiplicity += option.multiplicity ?? 1;
  }
  return [...groups.values()];
}

function representativeOptions(name, options) {
  if (reloadSensitiveDimensions.has(name)) return options;
  if (name === 'sight' || name === 'laser') {
    return quotientOptions(options, option => serialize({ semantic: option.semantic ?? 'regular' }));
  }
  return options.length ? [options[0]] : options;
}

function comparisonSuites(dims) {
  const all = dimensionsArray(dims);
  const representatives = all.map(([name, options]) => [name, representativeOptions(name, options)]);
  const suites = [{ name: 'baseline', dimensions: representatives }];
  for (const [name, options] of all) {
    if (reloadSensitiveDimensions.has(name)) continue;
    suites.push({
      name: `all-${name}`,
      dimensions: all.map(([candidate, candidateOptions]) => [
        candidate,
        candidate === name ? candidateOptions : representativeOptions(candidate, candidateOptions),
      ]),
    });
  }
  return suites;
}

function buildPointDistribution(optionsByDimension) {
  let distribution = new Map([[0, 1]]);
  for (const options of optionsByDimension) {
    const next = new Map();
    for (const [total, count] of distribution) for (const option of options) {
      next.set(total + option.points, (next.get(total + option.points) ?? 0) + count);
    }
    distribution = next;
  }
  return distribution;
}

function cartesianDimensions(dimensions, callback) {
  const selected = {};
  function visit(index) {
    if (index === dimensions.length) {
      callback(selected);
      return;
    }
    const [name, options] = dimensions[index];
    for (const option of options) {
      selected[name] = option;
      visit(index + 1);
    }
  }
  visit(0);
}

function caseFromSelection(weapon, selection) {
  const atts = blankAtts();
  atts.sight = selection.sight.id;
  atts.muzzle = selection.muzzle.id;
  atts.barrel = selection.barrel.id;
  atts.grip = selection.grip.id;
  atts.laser = selection.laser.id;
  atts.light = selection.light.id;
  atts.ammo = selection.ammo.id;
  atts.mag = selection.magazine.id;
  atts.ergo = selection.ergo.id;
  return {
    caseKey: [weapon.id, atts.sight, atts.muzzle, atts.barrel, atts.grip, atts.laser, atts.light, atts.mag, atts.ergo, atts.ammo].join('/'),
    weaponId: weapon.id,
    atts,
    pointTotal: selection.sight.points + selection.muzzle.points + selection.barrel.points
      + selection.grip.points + selection.laser.points + selection.light.points
      + selection.ammo.points + selection.magazine.points + selection.ergo.points,
  };
}

export function buildEquivalenceEnumeration() {
  const weaponEntries = [];
  const perWeapon = {};
  let rawSelectableCaseCount = 0;
  let reducedComparisonCaseCount = 0;
  let rawOverBudgetCaseCount = 0;
  const pointDistribution = {};
  const sortedWeapons = [...weapons].sort((a, b) => a.id.localeCompare(b.id));

  for (const [index, weapon] of sortedWeapons.entries()) {
    const dimensions = dimensionsArray(dimensionsFor(weapon.id));
    const suites = comparisonSuites(Object.fromEntries(dimensions));
    const rawCount = dimensions.reduce((total, [, options]) => total * options.reduce((sum, option) => sum + option.multiplicity, 0), 1);
    const reducedCount = suites.reduce((suiteTotal, suite) => suiteTotal + suite.dimensions.reduce((total, [, options]) => total * options.length, 1), 0);
    const distribution = buildPointDistribution(dimensions.map(([, options]) => options.flatMap(option => Array(option.multiplicity).fill(option))));
    const overBudget = [...distribution.entries()].filter(([points]) => points > 100).reduce((sum, [, count]) => sum + count, 0);
    rawSelectableCaseCount += rawCount;
    reducedComparisonCaseCount += reducedCount;
    rawOverBudgetCaseCount += overBudget;
    for (const [points, count] of distribution) pointDistribution[points] = (pointDistribution[points] ?? 0) + count;
    perWeapon[weapon.id] = { rawSelectableCases: rawCount, reducedComparisonCases: reducedCount, overBudgetCases: overBudget };
    weaponEntries.push({ weapon, suites });
    if ((index + 1) % 5 === 0 || index === sortedWeapons.length - 1) {
      console.log(`Phase 5 enumeration: ${index + 1}/${sortedWeapons.length} weapons; ${reducedComparisonCaseCount} reduced cases built`);
    }
  }
  return {
    weaponEntries,
    counts: {
      weapons: weapons.length,
      rawSelectableCaseCount,
      reducedComparisonCaseCount,
      rawOverBudgetCaseCount,
      rawWithinBudgetCaseCount: rawSelectableCaseCount - rawOverBudgetCaseCount,
    },
    pointDistribution,
    perWeapon,
  };
}

function applyWith(modelContext, model, weapon, atts) {
  setAttachmentContext({ ERGOS: model.ERGOS, WEAPON_MAG: model.WEAPON_MAG, WEAPON_ERGO: model.WEAPON_ERGO });
  return applyAttachments(weapon, atts);
}

/**
 * Compare the full Phase 5 witness suite's barrel velocity against a model
 * with velTierMod removed. The latter must select the retained velMult path;
 * this stays an assertion-only extension so the reload fixture and digests do
 * not change when the barrel field is added.
 */
export function compareBarrelVelocityLegacyAndDerived(enumeration) {
  const legacyBarrels = structuredClone(currentModel.BARRELS);
  for (const barrel of legacyBarrels) delete barrel.velTierMod;
  const corpusEvidenceByPair = new Map(barrelVelocityManifest.explainedDifferences
    .filter(entry => entry.barrelId != null)
    .map(entry => [`${entry.weaponId}/${entry.barrelId}`, entry]));
  const invalidCorpusEvidence = barrelVelocityManifest.explainedDifferences.filter(entry => (
    entry.disposition !== 'explained-floor-display-difference'
      || entry.observedVelocityMps !== entry.floorVelocityMps
      || entry.observedVelocityMps === entry.legacyRoundedVelocityMps
  ));
  assert.deepEqual(invalidCorpusEvidence, [], 'invalid Phase 7 barrel velocity evidence classification');
  let comparedCases = 0;
  let mismatchCases = 0;
  const mismatches = [];
  const historicalDisplayDifferencePairs = new Set();
  const unexplainedHistoricalDisplayDifferencePairs = new Set();
  const unexplainedHistoricalDisplayDifferences = [];
  for (const { weapon, suites } of enumeration.weaponEntries) {
    for (const suite of suites) cartesianDimensions(suite.dimensions, selection => {
      const row = caseFromSelection(weapon, selection);
      setAttachmentContext({
        BARRELS: currentModel.BARRELS,
        ERGOS: currentModel.ERGOS,
        WEAPON_MAG: currentModel.WEAPON_MAG,
        WEAPON_ERGO: currentModel.WEAPON_ERGO,
      });
      const derivedOutput = applyAttachments(weapon, row.atts);
      setAttachmentContext({
        BARRELS: legacyBarrels,
        ERGOS: currentModel.ERGOS,
        WEAPON_MAG: currentModel.WEAPON_MAG,
        WEAPON_ERGO: currentModel.WEAPON_ERGO,
      });
      const legacyOutput = applyAttachments(weapon, row.atts);
      if (!Object.is(derivedOutput.bulletVel, legacyOutput.bulletVel)) {
        mismatchCases += 1;
        if (mismatches.length < 25) {
          mismatches.push({
            caseKey: row.caseKey,
            derived: derivedOutput.bulletVel,
            legacy: legacyOutput.bulletVel,
          });
        }
      }
      const historicalLegacyBulletVel = historicalRoundedBulletVelocity(weapon, row.atts);
      if (!Object.is(derivedOutput.bulletVel, historicalLegacyBulletVel)) {
        const pairKey = `${row.weaponId}/${row.atts.barrel}`;
        historicalDisplayDifferencePairs.add(pairKey);
        const evidence = corpusEvidenceByPair.get(pairKey);
        if (!evidence
          || evidence.baseVelocityMps !== weapon.bulletVel
          || evidence.floorVelocityMps !== derivedOutput.bulletVel
          || evidence.legacyRoundedVelocityMps !== historicalLegacyBulletVel) {
          unexplainedHistoricalDisplayDifferencePairs.add(pairKey);
          if (!unexplainedHistoricalDisplayDifferences.some(entry => entry.pairKey === pairKey)) {
            unexplainedHistoricalDisplayDifferences.push({
              pairKey,
              caseKey: row.caseKey,
              derived: derivedOutput.bulletVel,
              historicalLegacy: historicalLegacyBulletVel,
              evidence: evidence ?? null,
            });
          }
        }
      }
      comparedCases += 1;
      if (comparedCases % 25000 === 0) {
        console.log(`Phase 7 barrel velocity equivalence: ${comparedCases}/${enumeration.counts.reducedComparisonCaseCount}; ${mismatchCases} mismatches`);
      }
    });
  }
  return {
    comparedCases,
    mismatchCases,
    mismatches,
    historicalDisplayDifferencePairs: historicalDisplayDifferencePairs.size,
    historicalDisplayDifferenceKeys: [...historicalDisplayDifferencePairs].sort(),
    unexplainedHistoricalDisplayDifferencePairs: unexplainedHistoricalDisplayDifferencePairs.size,
    unexplainedHistoricalDisplayDifferences,
    corpusEvidence: {
      changedRecords: barrelVelocityManifest.counts.changedRecords,
      indiscriminatingRecords: barrelVelocityManifest.counts.indiscriminatingRecords,
      discriminatingRecords: barrelVelocityManifest.counts.discriminatingRecords,
      explainedRecords: barrelVelocityManifest.explainedDifferences.length,
      unexplainedRecords: invalidCorpusEvidence.length,
      liveSelectablePairs: historicalDisplayDifferencePairs.size,
      sourceOnlyRecords: barrelVelocityManifest.counts.sourceOnlyRecords,
    },
  };
}

function diffPaths(left, right, prefix = '') {
  if (Object.is(left, right)) return [];
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return [prefix || '$'];
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.flatMap(key => diffPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key));
}

const allowedModelDeltaPatterns = [
  /^WEAPON_MAG\.[^.]+\.mags\.[^.]+\.(?:reloadSpeedTier|tacRldOverrideMs|suspectedGameBug|tacRld)$/,
  /^ERGOS\.[^.]+\.reloadSpeedMult$/,
  /^WEAPON_ERGO\.[^.]+\.magCatchRld(?:\.(?:reg|fast))?$/,
];

const modelDeltaPaths = diffPaths(currentModel, legacy);
for (const path of modelDeltaPaths) {
  assert.ok(allowedModelDeltaPatterns.some(pattern => pattern.test(path)), `unexpected current/legacy model delta: ${path}`);
}

const changedMagazineKeys = new Set(manifest.changedValues.map(entry => entry.key));
const changedMagCatchWeapons = new Set(manifest.legacyMagCatchCorrections.map(entry => entry.weaponId));
const stackingDifferenceKeys = new Set((manifest.legacyMagCatchStackingDifferences ?? []).map(entry => entry.key));
const composedLoadoutDifferenceKey = 'pp19/53_rnd/mag_catch';
const PRE_CUTOVER_DIFFERENCE_DIGEST = 'eb5d873efa907d5ee09c39bf924238d329f786c5fd3db48156ac057131d83d90';

function expectedReasons(row) {
  const reasons = [];
  if (changedMagazineKeys.has(`${row.weaponId}/${row.atts.mag}`)) reasons.push('manifest.changedValues');
  if (row.atts.ergo === 'mag_catch' && changedMagCatchWeapons.has(row.weaponId)) reasons.push('manifest.legacyMagCatchCorrections');
  if (stackingDifferenceKeys.has(`${row.weaponId}/${row.atts.mag}/${row.atts.ergo}`)) reasons.push('manifest.legacyMagCatchStackingDifferences');
  if (`${row.weaponId}/${row.atts.mag}/${row.atts.ergo}` === composedLoadoutDifferenceKey) reasons.push('manifest.composedLoadoutEvidence');
  return reasons;
}

function compareEnumeration(enumeration) {
  const fieldCounts = {};
  const coverage = new Map();
  const perWeapon = {};
  let currentOutputFields = null;
  const differenceDigest = createHash('sha256');
  const preCutoverDifferenceDigest = createHash('sha256');
  const derivedOutputDigest = createHash('sha256');
  const preCutoverDerivedOutputDigest = createHash('sha256');
  const unexplainedCases = [];
  const unexplainedSummary = new Map();
  let comparedCases = 0;
  let differenceCaseCount = 0;
  let preCutoverDifferenceCaseCount = 0;
  let unexplainedDifferenceCaseCount = 0;

  for (const { weapon, suites } of enumeration.weaponEntries) {
    for (const suite of suites) cartesianDimensions(suite.dimensions, selection => {
      const row = caseFromSelection(weapon, selection);
      const currentOutput = phase5HistoricalDisplayProjection(
        applyWith(currentContext, currentModel, weapon, row.atts),
        weapon,
        row.atts,
      );
      const historicalLegacyOutput = phase5HistoricalDisplayProjection(
        applyWith(legacyContext, legacy, weapon, row.atts),
        weapon,
        row.atts,
      );
      historicalLegacyOutput.tacRld = legacyReloadSeconds(row.weaponId, row.atts.mag, row.atts.ergo);
      const legacyOutput = { ...historicalLegacyOutput };
      // The pre-cutover fixture contains the old aggregate values for the
      // tube-fed category, but the post-cutover scalar contract is fail-closed.
      // Normalize that out-of-contract comparison side to the new null output;
      // the historical values remain pinned in the transition digest below.
      if (['db12', 'm1014', 'm87a1'].includes(row.weaponId)) legacyOutput.tacRld = currentOutput.tacRld;
      const paths = diffPaths(currentOutput, legacyOutput);
      const preCutoverOutput = ['db12', 'm1014', 'm87a1'].includes(row.weaponId)
        || `${row.weaponId}/${row.atts.mag}/${row.atts.ergo}` === composedLoadoutDifferenceKey
        ? historicalLegacyOutput
        : currentOutput;
      const preCutoverPaths = diffPaths(preCutoverOutput, historicalLegacyOutput);
      currentOutputFields ??= Object.keys(currentOutput).sort();
      for (const path of paths) fieldCounts[path] = (fieldCounts[path] ?? 0) + 1;
      const reasons = paths.length ? expectedReasons(row) : [];
      const unexplained = paths.some(path => path !== 'tacRld') || (paths.length > 0 && reasons.length === 0);
      if (paths.length) {
        differenceCaseCount += 1;
        for (const reason of reasons) {
          const coverageKey = ['manifest.legacyMagCatchStackingDifferences', 'manifest.composedLoadoutEvidence'].includes(reason)
            ? `${reason}:${row.weaponId}/${row.atts.mag}/${row.atts.ergo}`
            : `${reason}:${row.weaponId}/${row.atts.mag}`;
          coverage.set(coverageKey, (coverage.get(coverageKey) ?? 0) + 1);
        }
        if (unexplained) {
          unexplainedDifferenceCaseCount += 1;
          const summaryKey = `${row.weaponId}/${row.atts.mag}/${row.atts.ergo}`;
          unexplainedSummary.set(summaryKey, (unexplainedSummary.get(summaryKey) ?? 0) + 1);
          if (unexplainedCases.length < 25 && !unexplainedCases.some(entry => entry.summaryKey === summaryKey)) unexplainedCases.push({ summaryKey, suite: suite.name, caseKey: row.caseKey, weaponId: row.weaponId, magazineId: row.atts.mag, ergoId: row.atts.ergo, paths, reasons });
        }
      }
      if (preCutoverPaths.length) preCutoverDifferenceCaseCount += 1;
      differenceDigest.update(`${serialize({ suite: suite.name, caseKey: row.caseKey, current: sha256(serialize(currentOutput)), legacy: sha256(serialize(legacyOutput)), paths, reasons })}\n`, 'utf8');
      preCutoverDifferenceDigest.update(`${serialize({ suite: suite.name, caseKey: row.caseKey, current: sha256(serialize(preCutoverOutput)), legacy: sha256(serialize(historicalLegacyOutput)), paths: preCutoverPaths, reasons: preCutoverPaths.length ? expectedReasons({ ...row, atts: row.atts }) : [] })}\n`, 'utf8');
      derivedOutputDigest.update(`${serialize({ suite: suite.name, caseKey: row.caseKey, output: sha256(serialize(currentOutput)) })}\n`, 'utf8');
      preCutoverDerivedOutputDigest.update(`${serialize({ suite: suite.name, caseKey: row.caseKey, output: sha256(serialize(preCutoverOutput)) })}\n`, 'utf8');
      const stats = perWeapon[row.weaponId] ?? { reducedCases: 0, differenceCases: 0, unexplainedCases: 0 };
      stats.reducedCases += 1;
      if (paths.length) stats.differenceCases += 1;
      if (unexplained) stats.unexplainedCases += 1;
      perWeapon[row.weaponId] = stats;
      comparedCases += 1;
      if (comparedCases % 100000 === 0) console.log(`Phase 5 comparison: ${comparedCases}/${enumeration.counts.reducedComparisonCaseCount} reduced cases; ${differenceCaseCount} differences`);
    });
  }

  for (const key of stackingDifferenceKeys) assert.ok([...coverage.keys()].some(value => value.endsWith(`:${key}`)), `legacy stacking difference not exercised: ${key}`);
  assert.ok([...coverage.keys()].some(value => value.endsWith(`:${composedLoadoutDifferenceKey}`)), 'PP-19 composed override-stack correction not exercised');
  assert.equal(preCutoverDifferenceDigest.digest('hex'), PRE_CUTOVER_DIFFERENCE_DIGEST, 'pre-cutover Phase 5 difference digest changed');
  return {
    comparedOutputFields: currentOutputFields,
    counts: {
      reducedCases: comparedCases,
      differenceCases: differenceCaseCount,
      unexplainedDifferenceCases: unexplainedDifferenceCaseCount,
      preCutoverDifferenceCases: preCutoverDifferenceCaseCount,
    },
    fieldDifferenceCounts: fieldCounts,
    differenceDigest: differenceDigest.digest('hex'),
    derivedOutputDigest: derivedOutputDigest.digest('hex'),
    preCutoverDifferenceDigest: PRE_CUTOVER_DIFFERENCE_DIGEST,
    preCutoverDerivedOutputDigest: preCutoverDerivedOutputDigest.digest('hex'),
    differenceClassification: {
      manifestChangedValueKeys: [...changedMagazineKeys].sort(),
      manifestMagCatchWeapons: [...changedMagCatchWeapons].sort(),
      manifestMagCatchStackingKeys: [...stackingDifferenceKeys].sort(),
      manifestComposedLoadoutKey: composedLoadoutDifferenceKey,
      expectedObservedDifferenceKeys: [...stackingDifferenceKeys, composedLoadoutDifferenceKey].sort(),
      observedDifferenceSources: Object.fromEntries([...coverage.entries()].sort()),
    },
    perWeapon,
    unexplainedCases,
    unexplainedSummary: Object.fromEntries([...unexplainedSummary.entries()].sort()),
  };
}

const namedCaseDefinitions = [
  { name: 'AK-205 Mag Catch', weaponId: 'ak205', magazineId: '30_rnd', ergoId: 'mag_catch' },
  { name: 'SL9 Mag Catch', weaponId: 'sl9', magazineId: '30_rnd', ergoId: 'mag_catch' },
  { name: 'KTS100 MK8 45Rnd Fast stacked tier', weaponId: 'kts100', magazineId: '45_fast', ergoId: 'none' },
  { name: 'M60 50Rnd alternate', weaponId: 'm60', magazineId: '50_rnd', ergoId: 'none' },
  { name: 'M60 100Rnd', weaponId: 'm60', magazineId: '100_rnd', ergoId: 'none' },
  { name: 'M240L 50Rnd', weaponId: 'm240l', magazineId: '50_rnd', ergoId: 'none' },
  { name: 'M240L 75Rnd belt box', weaponId: 'm240l', magazineId: '75_rnd', ergoId: 'none' },
  { name: 'M240L 100Rnd belt box', weaponId: 'm240l', magazineId: '100_rnd', ergoId: 'none' },
  { name: 'PP-19 20Rnd suspected bug', weaponId: 'pp19', magazineId: '20_fast', ergoId: 'none' },
  { name: 'PP-19 53Rnd override', weaponId: 'pp19', magazineId: '53_rnd', ergoId: 'none' },
  { name: 'PP-19 53Rnd override plus Mag Catch', weaponId: 'pp19', magazineId: '53_rnd', ergoId: 'mag_catch' },
  { name: '18.5KS-K 4Rnd', weaponId: 'ks18k', magazineId: '4_rnd', ergoId: 'none' },
  { name: '18.5KS-K 4Rnd Fast', weaponId: 'ks18k', magazineId: '4_fast', ergoId: 'none' },
  { name: 'DB-12 tube-fed', weaponId: 'db12', magazineId: '7_rnd', ergoId: 'none' },
  { name: 'M1014 tube-fed', weaponId: 'm1014', magazineId: '4_rnd', ergoId: 'none' },
  { name: 'M87A1 tube-fed', weaponId: 'm87a1', magazineId: '5_rnd', ergoId: 'none' },
  { name: 'VZ. 61 combined laser/grip/light', weaponId: 'vz61', magazineId: '10_rnd', ergoId: 'none', combinedId: 'fold_stubby' },
  { name: 'GRT-BC combined laser/light', weaponId: 'grtbc', magazineId: '30_rnd', ergoId: 'none', combinedId: '50mw_violet' },
  { name: 'SL9 combined laser/light', weaponId: 'sl9', magazineId: '30_rnd', ergoId: 'none', combinedId: '50mw_violet' },
  { name: 'P18 combined laser/light', weaponId: 'p18', magazineId: '17_rnd', ergoId: 'none', combinedId: '5mw_red' },
  { name: 'ES 5.7 combined laser/light', weaponId: 'es57', magazineId: '20_rnd', ergoId: 'none', combinedId: '5mw_red' },
  { name: 'M45A1 combined laser/light', weaponId: 'm45a1', magazineId: '7_rnd', ergoId: 'none', combinedId: '5mw_red' },
  { name: 'GGH-22 combined laser/light', weaponId: 'ggh22', magazineId: '15_rnd', ergoId: 'none', combinedId: '5mw_red' },
  { name: 'M357 Trait combined laser/light', weaponId: 'm357trait', magazineId: '8_rnd', ergoId: 'none', combinedId: '5mw_red' },
  { name: 'USG-90 explicit empty grip', weaponId: 'usg90', magazineId: '50_rnd', ergoId: 'none' },
];

function namedCaseLoadout(definition) {
  const weapon = weapons.find(candidate => candidate.id === definition.weaponId);
  const atts = blankAtts();
  atts.barrel = currentModel.WEAPON_ATTS[weapon.id].barrelDef;
  atts.mag = definition.magazineId;
  atts.ergo = definition.ergoId;
  atts.ammo = ammo.WEAPON_AMMO[weapon.id]?.def ?? 'standard';
  if (definition.combinedId) atts.laser = definition.combinedId;
  return { ...definition, weapon, atts };
}

function compareNamedCases() {
  const currentNamed = [];
  for (const definition of namedCaseDefinitions) {
    const row = namedCaseLoadout(definition);
    const currentOutput = applyWith(currentContext, currentModel, row.weapon, row.atts);
    const legacyOutput = applyWith(legacyContext, legacy, row.weapon, row.atts);
    legacyOutput.tacRld = legacyReloadSeconds(row.weaponId, row.atts.mag, row.atts.ergo);
    currentNamed.push({
      name: definition.name,
      weaponId: definition.weaponId,
      magazineId: definition.magazineId,
      ergoId: definition.ergoId,
      gripId: row.atts.grip,
      laserId: row.atts.laser,
      lightId: row.atts.light,
      caseKey: [definition.weaponId, row.atts.sight, row.atts.muzzle, row.atts.barrel, row.atts.grip, row.atts.laser, row.atts.light, definition.magazineId, definition.ergoId, row.atts.ammo].join('/'),
      currentTacRld: currentOutput.tacRld,
      legacyTacRld: legacyOutput.tacRld,
      diffPaths: diffPaths(currentOutput, legacyOutput),
      tubeFedScalarNull: ['db12', 'm1014', 'm87a1'].includes(definition.weaponId)
        ? { currentWeaponTacRld: row.weapon.tacRld, legacyWeaponTacRld: row.weapon.tacRld, currentEmptyRld: row.weapon.emptyRld, legacyEmptyRld: row.weapon.emptyRld }
        : null,
    });
  }
  return currentNamed;
}

export function buildPhase5Fixture() {
  const enumeration = buildEquivalenceEnumeration();
  const comparison = compareEnumeration(enumeration);
  const barrelVelocityComparison = compareBarrelVelocityLegacyAndDerived(enumeration);
  assert.equal(barrelVelocityComparison.mismatchCases, 0, JSON.stringify(barrelVelocityComparison));
  const namedCases = compareNamedCases();
  assert.equal(comparison.counts.unexplainedDifferenceCases, 0, JSON.stringify({
    fieldDifferenceCounts: comparison.fieldDifferenceCounts,
    unexplainedCases: comparison.unexplainedCases,
  }));
  const perWeapon = Object.fromEntries(Object.entries(enumeration.perWeapon).map(([weaponId, rawStats]) => [
    weaponId,
    {
      ...rawStats,
      ...comparison.perWeapon[weaponId],
      comparisonSuites: enumeration.weaponEntries.find(entry => entry.weapon.id === weaponId).suites.map(suite => ({
        name: suite.name,
        cases: suite.dimensions.reduce((total, [, options]) => total * options.length, 1),
      })),
    },
  ]));
  return {
    kind: 'attachment-equivalence-phase5',
    schemaVersion: 1,
    scope: {
      description: 'All currently selectable attachment dimensions are included: sight, muzzle, barrel, grip, laser, light, ammo, magazine, and ergonomic. The site displays a 100-point total and marks totals over 100, but does not disable or reject those selections, so both within-budget and over-budget selections are included.',
      rawSelectableDimensions: 'weapon × sight × muzzle × selectable barrel × selectable grip × selectable laser/light choice(s) × available ammo × magazine × available ergonomic',
      excludedSlots: [],
      pointBudget: { displayedLimit: 100, enforcedBySite: false },
      reduction: 'The full Cartesian product is retained as a raw selectable count and point distribution, but is too large for a standing resolver test. The comparison is a separability witness suite: a baseline crosses every magazine and ergonomic choice, then one suite at a time crosses every choice in each other slot while holding the other non-reload slots at representatives. Thus every slot choice, every combined-slot role, every ammo choice, every magazine, and every ergonomic choice is run through the complete resolver output. The excluded combinations are only cross-products of two or more non-reload slots.',
      reductionProof: 'The current-versus-preserved-pre-cutover audit is restricted to reloadSpeedTier, tacRldOverrideMs, suspectedGameBug, and reloadSpeedMult. The preserved comparison projection is reconstructed from the Phase 4 migration manifest and pre-migration fixture; it is never used by production resolution. applyAttachments consumes the derived deltas only in resolveReloadTiming, which depends on weapon, magazine, and ergonomic selection and not on sight, muzzle, barrel, grip, laser, light, or ammo. Complete output objects are nevertheless compared for every witness representative.',
      comparisonSuites: 'baseline plus all-sight, all-muzzle, all-barrel, all-grip, all-laser, all-light, and all-ammo suites when those dimensions have choices; magazine and ergonomic dimensions remain full in every suite.',
      coverageClasses: {
        reloadSensitive: 'For each weapon, every magazine × ergonomic combination is present in the baseline suite and remains full in every witness suite. These are the only selections that can change the current-versus-legacy reload branch.',
        sight: 'Every selectable sight is present in all-sight; baseline additionally preserves the iron-versus-optic output classes.',
        muzzle: 'Every selectable muzzle is present in all-muzzle; muzzle effects are compared in the complete returned object.',
        barrel: 'Every selectable barrel is present in all-barrel; barrel effects are compared in the complete returned object.',
        grip: 'Every selectable grip is present in all-grip, including VZ.61 combined-slot grip choices.',
        laser: 'Every selectable laser or combined laser/grip/light choice is present in all-laser, with combined role resolution preserved.',
        light: 'Every selectable light is present in all-light; laserLightCombined weapons correctly keep light fixed to none because those choices live in laser.',
        ammo: 'Every available ammo ID is present in all-ammo.',
        omittedProducts: 'Only products that vary two or more non-reload slots simultaneously are omitted. They cannot introduce a new difference because the model-delta audit proves every changed field is consumed exclusively by resolveReloadTiming, independently of those slots.',
      },
      comparison: 'Every witness representative is run through applyAttachments with the post-cutover derived projection and compared recursively, field by field, against the preserved Phase 4 legacy projection. The three tube-fed shotguns are explicitly normalized to the post-cutover scalar-null contract; their historical aggregate values remain in the pre-cutover transition digest. The six Phase 5 intentional key differences and the PP-19 composed override-stack key are required.',
    },
    counts: { ...enumeration.counts, ...comparison.counts },
    pointDistribution: enumeration.pointDistribution,
    modelDeltaPaths,
    perWeapon,
    comparedOutputFields: comparison.comparedOutputFields,
    fieldDifferenceCounts: comparison.fieldDifferenceCounts,
    differenceDigest: comparison.differenceDigest,
    differenceClassification: comparison.differenceClassification,
    transition: {
      preCutover: {
        differenceCases: comparison.counts.preCutoverDifferenceCases,
        differenceDigest: comparison.preCutoverDifferenceDigest,
        derivedOutputDigest: comparison.preCutoverDerivedOutputDigest,
      },
      postCutover: {
        differenceCases: comparison.counts.differenceCases,
        differenceDigest: comparison.differenceDigest,
        derivedOutputDigest: comparison.derivedOutputDigest,
      },
    },
    namedCases,
  };
}

if (process.argv.includes('--write-fixture')) {
  writeJson('scripts/attachment-equivalence-phase5.json', buildPhase5Fixture());
  console.log('Phase 5 equivalence fixture written.');
}
