import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSweep } from '../../../scripts/audit-sweep.mjs';
import {
  DEFAULT_ROOT,
  classFromSourcePath,
  normalizeWeaponName,
  sourceRelativePath,
} from '../../../scripts/audit-phase0-lib.mjs';

const ROOT = DEFAULT_ROOT;
const AUDIT_RELATIVE = 'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json';
const OUTPUT_RELATIVE = 'migration/1.3.3.0/attachment-audit/magazine-tier-adjudication-worksheet.json';
const TIER_TOLERANCE = {
  adsTimeMs: 1,
  sprintRecoveryMs: 1,
  adsMoveSpeedMultiplier: 0.005,
};
const COHERENCE_FIELDS = ['adsTimeMs', 'sprintRecoveryMs', 'adsMoveSpeedMultiplier'];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function parseFindingDetail(detail) {
  const match = /^(\w+) predicted (-?\d+(?:\.\d+)?), observed (-?\d+(?:\.\d+)?)$/.exec(detail);
  if (!match) throw new Error(`Cannot parse model-tier-mismatch detail: ${detail}`);
  return { field: match[1], modelValue: Number(match[2]), corpusValue: Number(match[3]) };
}

function magazineMatch(row, weaponMag) {
  const match = String(row.attachmentName ?? '').match(/\b(\d+)\s*(?:RND|ROUND|SHELL)/i);
  if (!match) return [];
  const capacity = Number(match[1]);
  const fast = /fast/i.test(row.attachmentName ?? '');
  return Object.entries(weaponMag?.mags ?? {})
    .filter(([, magazine]) => magazine.mag === capacity && /fast/i.test(magazine.name ?? '') === fast);
}

function findTierIndex(table, value, field) {
  if (!Array.isArray(table) || value == null) return null;
  const tolerance = TIER_TOLERANCE[field];
  const index = table.findIndex(candidate => Math.abs(candidate - value) <= tolerance);
  return index < 0 ? null : index;
}

function clampIndex(table, index) {
  if (!Array.isArray(table) || !table.length || !Number.isInteger(index)) return null;
  return Math.max(0, Math.min(table.length - 1, index));
}

function fieldConfiguration(field, weaponMag, balance) {
  if (field === 'adsTimeMs') {
    return {
      tableName: 'ADS_SPD_TIERS',
      table: balance.ADS_SPD_TIERS,
      baseKey: 'defAds',
      shiftKey: 'adsTimeTierShift',
      barrelAdjustment: true,
    };
  }
  if (field === 'adsMoveSpeedMultiplier') {
    return {
      tableName: 'ADS_MOVE_TIERS',
      table: balance.ADS_MOVE_TIERS,
      baseKey: 'defAms',
      shiftKey: 'adsMoveSpeedTierShift',
      barrelAdjustment: false,
    };
  }
  if (field === 'sprintRecoveryMs') {
    const sidearm = weaponMag.sprintRecoveryTierTable === 'sidearm';
    const tableName = sidearm ? 'SIDEARM_SPRINT_REC_TIERS' : 'PRIMARY_SPRINT_REC_TIERS';
    return {
      tableName,
      table: balance[tableName]?.length ? balance[tableName] : balance.SPRINT_REC_TIERS,
      baseKey: 'defSpr',
      shiftKey: 'sprintRecoveryTierShift',
      barrelAdjustment: false,
    };
  }
  throw new Error(`Unsupported mismatch field: ${field}`);
}

function modelPrediction({ field, weaponMag, magazine, defaultBarrel, balance }) {
  const config = fieldConfiguration(field, weaponMag, balance);
  const baseTier = weaponMag[config.baseKey];
  const currentShift = magazine[config.shiftKey] ?? 0;
  const barrelTierMod = config.barrelAdjustment ? (defaultBarrel?.adsTimeTierMod ?? 0) : 0;
  const rawIndex = baseTier + currentShift - barrelTierMod;
  const modelTierIndex = clampIndex(config.table, rawIndex);
  return {
    config,
    baseTier,
    currentShift,
    barrelTierMod,
    rawIndex,
    modelTierIndex,
    value: modelTierIndex == null ? null : config.table[modelTierIndex],
  };
}

function relativeSource(row) {
  return sourceRelativePath(row?.source?.currentPath).replaceAll('\\', '/');
}

function modalValue(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = row.stats?.[field];
    if (value == null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
  if (!ordered.length || (ordered[1] && ordered[1][1] === ordered[0][1])) return null;
  return ordered[0][0];
}

function sameStats(a, b) {
  return COHERENCE_FIELDS.every(field => a?.stats?.[field] === b?.stats?.[field]);
}

function fastPairEvidence(entry, weaponEntries) {
  const fast = /fast/i.test(entry.magazine.name ?? '');
  const counterpart = weaponEntries.find(candidate => candidate.magazine.mag === entry.magazine.mag
    && /fast/i.test(candidate.magazine.name ?? '') !== fast);
  if (!counterpart) return { available: false, counterpartMagazineId: null, violations: [] };

  const standard = fast ? counterpart : entry;
  const fastEntry = fast ? entry : counterpart;
  if (!standard.row?.stats || !fastEntry.row?.stats) {
    return {
      available: false,
      counterpartMagazineId: counterpart.magazineId,
      violations: [],
    };
  }
  const standardStats = standard.row.stats;
  const fastStats = fastEntry.row.stats;
  const violations = [];
  const compare = (field, condition, detail) => {
    if (standardStats[field] == null || fastStats[field] == null) return;
    if (condition(standardStats[field], fastStats[field])) violations.push({ field, detail });
  };
  // Fast Mag is expected to improve reload time, while its other named
  // trade-offs are expected to be equal or worse than the standard magazine.
  compare('reloadTimeSeconds', (standardValue, fastValue) => standardValue < fastValue,
    'standard reload time is faster than Fast');
  compare('adsTimeMs', (standardValue, fastValue) => fastValue < standardValue,
    'Fast ADS time is faster than standard despite the draw-time trade-off');
  compare('sprintRecoveryMs', (standardValue, fastValue) => fastValue < standardValue,
    'Fast sprint recovery is faster than standard despite the mobility trade-off');
  compare('adsMoveSpeedMultiplier', (standardValue, fastValue) => fastValue > standardValue,
    'Fast ADS move speed is better than standard despite the mobility trade-off');
  return {
    available: true,
    counterpartMagazineId: counterpart.magazineId,
    counterpartScreenshotPath: relativeSource(counterpart.row),
    violations,
  };
}

function makeSuspicion({ row, entry, weaponEntries, defaultEntries, baselineStats, modelRows, corpusValue, field, corpusValueOffTierTable }) {
  const flags = [];
  const addFlag = (code, weight, detail) => flags.push({ code, weight, detail });
  const equalsDefaultMagazineStats = defaultEntries.some(defaultEntry => sameStats(row, defaultEntry.row));
  const matchesNonMagazineModalStats = baselineStats
    && COHERENCE_FIELDS.every(stat => row.stats?.[stat] === baselineStats[stat]);
  const fastEvidence = fastPairEvidence(entry, weaponEntries);
  const dominatedByFastVariant = fastEvidence.violations.length > 0;
  const matchingOtherMagazineFields = [];
  const matchingOtherMagazineStats = [];
  for (const candidate of modelRows) {
    if (candidate.magazineId === entry.magazineId) continue;
    for (const stat of COHERENCE_FIELDS) {
      if (row.stats?.[stat] === candidate.prediction[stat]?.value && !matchingOtherMagazineFields.includes(stat)) {
        matchingOtherMagazineFields.push(stat);
      }
    }
    if (COHERENCE_FIELDS.every(stat => row.stats?.[stat] === candidate.prediction[stat]?.value)) {
      matchingOtherMagazineStats.push(candidate.magazineId);
    }
  }
  const duplicateModelRows = weaponEntries.filter(candidate => candidate.magazineId === entry.magazineId);
  const duplicateModelIdConflict = duplicateModelRows.length > 1
    && new Set(duplicateModelRows.map(candidate => JSON.stringify(COHERENCE_FIELDS.map(fieldName => candidate.row.stats?.[fieldName] ?? null)))).size > 1;

  if (equalsDefaultMagazineStats) addFlag('equalsDefaultMagazineStats', 4,
    'all three tiered corpus stats equal a corpus row mapped to the weapon default magazine');
  if (matchesNonMagazineModalStats) addFlag('matchesNonMagazineModalStats', 3,
    'all three tiered corpus stats equal the modal non-Magazine baseline for this weapon');
  if (corpusValueOffTierTable) addFlag('corpusValueOffTierTable', 4,
    'corpus value is not a member of the relevant tier table');
  if (dominatedByFastVariant) addFlag('dominatedByFastVariant', 3,
    fastEvidence.violations.map(violation => violation.detail).join('; '));
  if (matchingOtherMagazineStats.length) addFlag('matchesOtherMagazineModelStats', 2,
    `the complete three-field corpus tuple matches model output for ${matchingOtherMagazineStats.join(', ')}`);
  if (matchingOtherMagazineFields.length) addFlag('matchesOtherMagazineModelField', 1,
    `corpus fields also occur in another magazine model output: ${matchingOtherMagazineFields.join(', ')}`);
  if (duplicateModelIdConflict) addFlag('duplicateModelIdCorpusConflict', 1,
    'multiple corpus rows map to one live magazine id but have different tiered stats');

  flags.sort((a, b) => b.weight - a.weight || a.code.localeCompare(b.code));
  return {
    equalsDefaultMagazineStats,
    defaultMagazineRecordAvailable: defaultEntries.length > 0,
    dominatedByFastVariant,
    fastVariantEvidence: fastEvidence,
    corpusValueOffTierTable,
    matchesNonMagazineModalStats: Boolean(matchesNonMagazineModalStats),
    matchingOtherMagazineFields,
    matchingOtherMagazineStats,
    duplicateModelIdConflict,
    score: flags.reduce((sum, flag) => sum + flag.weight, 0),
    rankedFlags: flags,
  };
}

function unique(values) {
  return [...new Set(values)];
}

function groupRecords(records, keyFor) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function changeAssessment(group, grouping, clusterKey) {
  const first = group[0];
  const sameField = unique(group.map(record => record.field)).length === 1;
  const sameTable = unique(group.map(record => record.tierTableName)).length === 1;
  const sameModelValue = unique(group.map(record => record.modelValue)).length === 1;
  const sameCorpusValue = unique(group.map(record => record.corpusValue)).length === 1;
  const sameModelIndex = unique(group.map(record => record.modelTierIndex)).length === 1;
  const sameCorpusIndex = unique(group.map(record => record.corpusTierIndex)).length === 1;
  const sameWeapon = unique(group.map(record => record.weaponId)).length === 1;
  const sameEffectiveDelta = unique(group.map(record => record.effectiveShiftDelta)).length === 1;
  const corpusChange = {
    resolvesWholeCluster: true,
    viableInCurrentSchema: true,
    type: 'corpus-retranscription',
    exactChange: sameModelValue && sameCorpusValue
      ? `transcribe ${first.field} as ${first.modelValue} instead of ${first.corpusValue} for every record in this cluster`
      : 'transcribe each corpus value to its corresponding model value after screenshot review',
    status: 'mechanical candidate only; PNG review is required before changing the corpus',
  };
  const modelCandidates = [];

  if (sameWeapon && sameField && sameEffectiveDelta && first.effectiveShiftDelta !== 0) {
    modelCandidates.push({
      resolvesWholeCluster: true,
      viableInCurrentSchema: true,
      type: 'uniform-magazine-shift-offset',
      exactChange: `add ${first.effectiveShiftDelta} to ${first.field} tier shifts for the affected ${unique(group.map(record => record.magazineId)).join(', ')} entries on ${first.weaponId}`,
      caveat: 'This changes shipped data and remains a hypothesis until the screenshots settle the dispute.',
    });
  }

  if (sameField && sameEffectiveDelta && first.effectiveShiftDelta !== 0) {
    const targetBase = first.baseTier + first.effectiveShiftDelta;
    modelCandidates.push({
      resolvesWholeCluster: true,
      viableInCurrentSchema: sameWeapon,
      type: 'base-tier-offset',
      exactChange: `change ${first.field} base tier ${first.baseTier} to ${targetBase} for ${unique(group.map(record => record.weaponId)).join(', ')}`,
      caveat: sameWeapon
        ? 'The change would also move the weapon default and therefore conflicts with the calibrated-default constraint unless the corpus default is also wrong.'
        : 'WEAPON_MAG stores this base tier per weapon; applying it to several weapons is a coordinated set of edits, not one shared class property. It would also move each default magazine.',
    });
  }

  if (sameTable && sameModelIndex && sameCorpusIndex && first.modelTierIndex !== first.corpusTierIndex) {
    modelCandidates.push({
      resolvesWholeCluster: true,
      viableInCurrentSchema: false,
      type: 'shared-tier-table-cell',
      exactChange: `change ${first.tierTableName}[${first.modelTierIndex}] from ${first.modelValue} to ${first.corpusValue}`,
      caveat: 'The table is shared rather than class-specific; this would alter every model output at that index and can break calibrated defaults.',
    });
  }

  if (!modelCandidates.length) {
    modelCandidates.push({
      resolvesWholeCluster: false,
      viableInCurrentSchema: false,
      type: 'no-single-model-edit-found',
      exactChange: 'No one-field, one-table-cell, or one-weapon uniform shift explains this heterogeneous cluster.',
      caveat: 'Review the PNGs record by record; the corpus correction remains the only universal mechanical candidate.',
    });
  }

  const modelSideSingleChange = modelCandidates.some(candidate => candidate.resolvesWholeCluster
    && candidate.viableInCurrentSchema);
  return {
    grouping,
    clusterKey,
    count: group.length,
    recordKeys: group.map(record => record.recordKey),
    weapons: unique(group.map(record => record.weaponName)),
    fields: unique(group.map(record => record.field)),
    modelValues: unique(group.map(record => record.modelValue)),
    corpusValues: unique(group.map(record => record.corpusValue)),
    tierTables: unique(group.map(record => record.tierTableName)),
    baseTiers: unique(group.map(record => record.baseTier)),
    currentShifts: unique(group.map(record => record.currentShift)),
    shiftDeltas: unique(group.map(record => record.shiftDelta)),
    effectiveShiftDeltas: unique(group.map(record => record.effectiveShiftDelta)),
    singleChangeAssessment: {
      singleChangeResolvesWholeCluster: corpusChange.resolvesWholeCluster || modelSideSingleChange,
      corpusSide: corpusChange,
      modelSide: {
        singleChangeResolvesWholeCluster: modelSideSingleChange,
        candidates: modelCandidates,
      },
    },
  };
}

function buildWorksheet() {
  const audit = readJson(AUDIT_RELATIVE);
  const attachments = readJson('data/attachments.json');
  const balance = readJson('data/balance_tables.json');
  const weapons = readJson('data/weapons.json');
  const rows = audit.records;
  const weaponByName = new Map(weapons.map(weapon => [normalizeWeaponName(weapon.name), weapon]));
  const sweep = runSweep({ root: ROOT });
  const findings = sweep.findings.filter(finding => finding.severity === 'warn' && finding.check === 'model-tier-mismatch');
  if (findings.length !== 68) throw new Error(`Expected 68 model-tier-mismatch warnings, found ${findings.length}`);

  const catalogRowsByWeapon = new Map();
  for (const row of rows.filter(candidate => candidate.attachmentType === 'Magazine' && candidate.stats)) {
    const weapon = weaponByName.get(normalizeWeaponName(row.weaponName));
    const weaponMag = attachments.WEAPON_MAG?.[weapon?.id];
    const matches = magazineMatch(row, weaponMag);
    if (matches.length !== 1) continue;
    const [magazineId, magazine] = matches[0];
    const defaultBarrel = attachments.BARRELS?.find(barrel => barrel.id === attachments.WEAPON_ATTS?.[weapon.id]?.barrelDef);
    const prediction = Object.fromEntries(COHERENCE_FIELDS.map(field => [field,
      modelPrediction({ field, weaponMag, magazine, defaultBarrel, balance })]));
    const entry = { row, weapon, weaponMag, magazineId, magazine, prediction };
    const entries = catalogRowsByWeapon.get(weapon.id) ?? [];
    entries.push(entry);
    catalogRowsByWeapon.set(weapon.id, entries);
  }

  const records = findings.map((finding, findingIndex) => {
    const { field, modelValue, corpusValue } = parseFindingDetail(finding.detail);
    const weapon = weaponByName.get(normalizeWeaponName(finding.weapon));
    if (!weapon) throw new Error(`Finding references unknown weapon: ${finding.weapon}`);
    const weaponMag = attachments.WEAPON_MAG?.[weapon.id];
    const rowCandidates = rows.filter(row => row.weaponName === finding.weapon
      && `${row.attachmentType}/${row.attachmentName}` === finding.attachment
      && row.stats);
    const row = rowCandidates.find(candidate => candidate.stats[field] === corpusValue) ?? rowCandidates[0];
    if (!row) throw new Error(`Could not locate corpus row for ${finding.weapon}/${finding.attachment}`);
    const matches = magazineMatch(row, weaponMag);
    if (matches.length !== 1) throw new Error(`Expected one magazine match for ${finding.weapon}/${finding.attachment}, found ${matches.length}`);
    const [magazineId, magazine] = matches[0];
    const defaultBarrel = attachments.BARRELS?.find(barrel => barrel.id === attachments.WEAPON_ATTS?.[weapon.id]?.barrelDef);
    if (!defaultBarrel) throw new Error(`Missing default barrel for ${weapon.id}`);
    const prediction = modelPrediction({ field, weaponMag, magazine, defaultBarrel, balance });
    if (prediction.value !== modelValue) throw new Error(`Sweep/model disagreement for ${finding.weapon}/${finding.attachment}/${field}`);
    const { config, baseTier, currentShift, modelTierIndex, rawIndex, barrelTierMod } = prediction;
    const corpusTierIndex = findTierIndex(config.table, corpusValue, field);
    const requiredShift = corpusTierIndex == null ? null : corpusTierIndex - baseTier;
    const shiftDelta = requiredShift == null ? null : requiredShift - currentShift;
    const effectiveRequiredShift = corpusTierIndex == null ? null : corpusTierIndex - baseTier + barrelTierMod;
    const effectiveShiftDelta = effectiveRequiredShift == null ? null : effectiveRequiredShift - currentShift;
    const weaponEntries = catalogRowsByWeapon.get(weapon.id) ?? [];
    const entry = weaponEntries.find(candidate => candidate.row === row && candidate.magazineId === magazineId)
      ?? weaponEntries.find(candidate => candidate.magazineId === magazineId);
    if (!entry) throw new Error(`Missing catalog row for ${weapon.id}/${magazineId}`);
    const defaultEntries = weaponEntries.filter(candidate => candidate.magazineId === weaponMag.def);
    const baselineRows = rows.filter(candidate => candidate.weaponName === finding.weapon
      && candidate.attachmentType !== 'Magazine' && candidate.stats);
    const baselineStats = Object.fromEntries(COHERENCE_FIELDS.map(stat => [stat, modalValue(baselineRows, stat)]));
    const corpusValueOffTierTable = corpusTierIndex == null;
    const screenshotPath = relativeSource(row);
    const recordKey = `${weapon.id}|${magazineId}|${field}|${screenshotPath}`;
    return {
      recordKey,
      weaponName: weapon.name,
      weaponId: weapon.id,
      weaponClass: classFromSourcePath(row.source.currentPath),
      magazineId,
      magazineName: magazine.name,
      corpusAttachmentName: row.attachmentName,
      field,
      modelValue,
      corpusValue,
      tierTableName: config.tableName,
      tierTable: config.table,
      baseTier,
      currentShift,
      modelTierIndex,
      corpusTierIndex,
      requiredShift,
      shiftDelta,
      effectiveRequiredShift,
      effectiveShiftDelta,
      modelTierFormula: {
        rawIndex,
        barrelTierMod,
        effectiveRequiredShift,
        effectiveShiftDelta,
        note: barrelTierMod
          ? 'The requested requiredShift/shiftDelta fields use corpusTierIndex - baseTier exactly; the additional effective fields include the default-barrel adjustment used by the sweep.'
          : 'No default-barrel adjustment applies to this field.',
      },
      screenshotPath,
      screenshotExists: fs.existsSync(path.join(ROOT, screenshotPath)),
      corpusCoherence: {
        defaultMagazineId: weaponMag.def,
        defaultMagazineRecords: defaultEntries.map(defaultEntry => ({
          magazineId: defaultEntry.magazineId,
          attachmentName: defaultEntry.row.attachmentName,
          stats: Object.fromEntries(COHERENCE_FIELDS.map(stat => [stat, defaultEntry.row.stats[stat] ?? null])),
          screenshotPath: relativeSource(defaultEntry.row),
        })),
        nonMagazineModalStats: baselineStats,
        ...makeSuspicion({
          row,
          entry,
          weaponEntries,
          defaultEntries,
          baselineStats,
          modelRows: weaponEntries,
          corpusValue,
          field,
          corpusValueOffTierTable,
        }),
      },
    };
  });

  const byClassFieldValue = groupRecords(records,
    record => `${record.weaponClass}|${record.field}|${record.modelValue}->${record.corpusValue}`)
    .map(([key, group]) => changeAssessment(group, 'weaponClass|field|modelValue->corpusValue', key));
  const byShiftDelta = groupRecords(records, record => String(record.shiftDelta))
    .map(([key, group]) => changeAssessment(group, 'shiftDelta', key));
  const suspicionScores = records.map(record => record.corpusCoherence.score);
  return {
    kind: 'magazine-tier-adjudication-worksheet',
    schemaVersion: 1,
    generatedBy: 'migration/1.3.3.0/attachment-audit/build-20260803-magazine-tier-adjudication-worksheet.mjs',
    generatedAt: new Date().toISOString(),
    policy: 'Phase 1 analysis only. PNG screenshots settle model-versus-corpus disagreements; no verdicts or shipped-data changes are recorded here.',
    sources: {
      sweep: 'scripts/audit-sweep.mjs',
      corpus: AUDIT_RELATIVE,
      weaponCatalog: 'data/weapons.json',
      attachmentCatalog: 'data/attachments.json',
      tierTables: 'data/balance_tables.json',
      warningCountAtGeneration: findings.length,
    },
    counts: {
      mismatchRecords: records.length,
      screenshotMissing: records.filter(record => !record.screenshotExists).length,
      corpusOffTierTable: records.filter(record => record.corpusCoherence.corpusValueOffTierTable).length,
      defaultStatsMatches: records.filter(record => record.corpusCoherence.equalsDefaultMagazineStats).length,
      fastVariantContradictions: records.filter(record => record.corpusCoherence.dominatedByFastVariant).length,
      suspicionScoreRange: [Math.min(...suspicionScores), Math.max(...suspicionScores)],
    },
    directImageReview: {
      attemptedPath: 'Weapon Attachments/Assault Rifle/B36A4/54_B36A4_Magazine_36Rnd_Magazine.png',
      canReadPngDirectly: true,
      rightHandPanelValues: {
        adsTimeIn: '250MS',
        sprintRecovery: '▼200MS',
        adsMoveSpeedMultiplier: '▼X0.54',
      },
      note: 'This is a direct visual read of the PNG, not an OCR or corpus inference.',
    },
    analysisNotes: [
      'The current sweep contains 11 sidearm adsMoveSpeedMultiplier rows at 0.67 -> 0.82, not 13. Two additional sidearm rows are 0.67 -> 0.75 (M44 and VZ. 61).',
      'ADS-time modelTierIndex includes the default barrel adsTimeTierMod, while requiredShift and shiftDelta follow the requested corpusTierIndex - baseTier definition. The effective model correction is recorded separately.',
      'The worksheet reports mechanical correction candidates only; it does not adjudicate any screenshot or change data/corpus files.',
    ],
    records,
    analyses: {
      clusterAnalysis: {
        byWeaponClassFieldValue: byClassFieldValue,
        byShiftDelta,
      },
      corpusCoherence: {
        rankedBySuspicion: records
          .map(record => ({ recordKey: record.recordKey, weaponName: record.weaponName, magazineName: record.magazineName, field: record.field, score: record.corpusCoherence.score, flags: record.corpusCoherence.rankedFlags.map(flag => flag.code) }))
          .sort((a, b) => b.score - a.score || a.recordKey.localeCompare(b.recordKey)),
      },
    },
  };
}

export function main() {
  const worksheet = buildWorksheet();
  if (worksheet.records.length !== 68) throw new Error(`Worksheet has ${worksheet.records.length} records; expected 68`);
  fs.writeFileSync(path.join(ROOT, OUTPUT_RELATIVE), `${JSON.stringify(worksheet, null, 2)}\n`);
  console.log(`wrote ${OUTPUT_RELATIVE} (${worksheet.records.length} mismatch records)`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) main();
