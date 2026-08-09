import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const ledgerPath = path.join(auditRoot, 'spot-range-evidence-general-20260809.json');
const canonicalPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const reviewPath = process.argv[2] ? path.resolve(process.argv[2]) : canonicalPath;
const projectRoot = path.resolve(auditRoot, '..', '..', '..');

const stats = ['spotOnFire3dM', 'spotOnFire2dM'];
const expectedCategoryCounts = {
  'muzzle-suppressor': 24,
  normal: 2,
  'muzzle-flash': 5,
  'ammo-subsonic': 2
};
const expectedGroupCounts = {
  '54/21 -> 0/21': 13,
  '21/21 -> 0/21': 7,
  '54/150 -> 0/150': 5,
  '0/21 -> 0/21': 4,
  '54/64 -> 27/64': 2,
  '0/150 -> 54/150': 2
};
const greenDownBuff = { direction: 'down', effect: 'buff', color: 'green' };

const summary = {
  matchedEntries: 0,
  appliedEntries: 0,
  valueChanges: 0,
  comparisonChanges: 0,
  alreadyCorrect: 0,
  errors: []
};

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hasOwn = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameMap = (left, right) => {
  const leftKeys = Object.keys(left ?? {});
  const rightKeys = Object.keys(right ?? {});
  return leftKeys.length === rightKeys.length
    && leftKeys.every(key => left[key] === right[key]);
};
const normalizePath = value => String(value).replaceAll('/', '\\');
const sourceSuffix = value =>
  normalizePath(path.win32.relative(normalizePath(projectRoot), normalizePath(value)));
const sourceBasename = value => path.win32.basename(normalizePath(value));

const readShape = comparison => comparison == null ? null : {
  direction: comparison.direction ?? null,
  effect: comparison.effect ?? null,
  color: comparison.color ?? null
};

const stateForComparison = (record, stat) =>
  readShape(record.statComparisons?.[stat]);

const parseComparisonSummary = (summaryText, stat) => {
  if (summaryText === 'none') return null;
  if (summaryText === 'both green down/buff') return { ...greenDownBuff };
  if (summaryText === '3D green down/buff only') {
    return stat === 'spotOnFire3dM' ? { ...greenDownBuff } : null;
  }
  if (summaryText === '3D green down/buff; 2D none') {
    return stat === 'spotOnFire3dM' ? { ...greenDownBuff } : null;
  }
  if (summaryText === '3D green down/buff; 2D down/buff, canonical color absent') {
    return stat === 'spotOnFire3dM'
      ? { ...greenDownBuff }
      : { direction: 'down', effect: 'buff', color: null };
  }
  throw new Error('Unrecognized ledger comparison summary: ' + summaryText);
};

const expectedForCategory = category => {
  if (category === 'muzzle-flash') {
    return { spotOnFire3dM: 0, spotOnFire2dM: 150,
      comparisons: { spotOnFire3dM: { ...greenDownBuff }, spotOnFire2dM: null } };
  }
  if (category === 'muzzle-suppressor') {
    return { spotOnFire3dM: 0, spotOnFire2dM: 21,
      comparisons: { spotOnFire3dM: { ...greenDownBuff }, spotOnFire2dM: { ...greenDownBuff } } };
  }
  if (category === 'ammo-subsonic') {
    return { spotOnFire3dM: 27, spotOnFire2dM: 64,
      comparisons: { spotOnFire3dM: { ...greenDownBuff }, spotOnFire2dM: { ...greenDownBuff } } };
  }
  return { spotOnFire3dM: 54, spotOnFire2dM: 150,
    comparisons: { spotOnFire3dM: null, spotOnFire2dM: null } };
};

const categoryFor = entry => {
  const type = String(entry.attachmentType ?? '');
  const name = String(entry.attachmentName ?? '');
  if (type === 'Muzzle' && /^Flash (Hider|Comp)$/i.test(name)) return 'muzzle-flash';
  if (type === 'Muzzle' && /Suppressor/i.test(name)) return 'muzzle-suppressor';
  if (type === 'Ammo' && /Subsonic/i.test(name)) return 'ammo-subsonic';
  return 'normal';
};

const pairStateFromLedger = (entry, field) => ({
  spotOnFire3dM: entry[field].spotOnFire3dM,
  spotOnFire2dM: entry[field].spotOnFire2dM,
  comparisons: Object.fromEntries(stats.map(stat => [
    stat, parseComparisonSummary(entry[field].comparisons, stat)
  ]))
});

const pairStateFromRecord = record => ({
  spotOnFire3dM: record.stats?.spotOnFire3dM,
  spotOnFire2dM: record.stats?.spotOnFire2dM,
  comparisons: Object.fromEntries(stats.map(stat => [
    stat, stateForComparison(record, stat)
  ]))
});

const samePairState = (left, right) => sameJson(left, right);

const validateLedger = ledger => {
  if (ledger.status !== 'evidence-only') {
    throw new Error('Ledger status must be evidence-only');
  }
  if (!Array.isArray(ledger.records) || ledger.records.length !== 33) {
    throw new Error('Ledger must contain exactly 33 records');
  }
  if (ledger.selection?.candidateCount !== 33
    || ledger.validation?.candidateIdentityCount !== 33
    || ledger.validation?.ledgerIdentityCount !== 33) {
    throw new Error('Ledger candidate/identity counts are not exactly 33');
  }
  if (!sameMap(ledger.selection.byCategory, expectedCategoryCounts)) {
    throw new Error('Ledger category counts do not match the authoritative plan');
  }
  const validation = ledger.validation;
  const requiredPasses = [
    validation?.uniqueIdentityCoverage === 'pass',
    validation?.allFullSourcePathsExist === true,
    validation?.allStableIdentitiesUseCanonicalSourceSuffix === true,
    validation?.allLedgerSourcePathsMatchCanonical === true,
    validation?.jsonParse === 'pass',
    validation?.gitDiffCheck === 'pass',
    Array.isArray(validation?.omittedCandidates) && validation.omittedCandidates.length === 0,
    Array.isArray(validation?.unexpectedLedgerIdentities)
      && validation.unexpectedLedgerIdentities.length === 0,
    Array.isArray(validation?.duplicateLedgerIdentities)
      && validation.duplicateLedgerIdentities.length === 0,
    typeof validation?.canonicalJsonSha256Before === 'string'
      && validation.canonicalJsonSha256Before === validation.canonicalJsonSha256After,
    typeof validation?.workbookSha256Before === 'string'
      && validation.workbookSha256Before === validation.workbookSha256After
  ];
  if (requiredPasses.some(pass => !pass) || JSON.stringify(ledger).includes('pending')) {
    throw new Error('Ledger finalized validation fields are not all passing');
  }

  const identities = new Set();
  const categoryCounts = {};
  const groupCounts = {};
  let valueChanges = 0;
  let numeric3dChanges = 0;
  let numeric2dChanges = 0;
  let comparisonShapeChanges = 0;
  const targets = [];

  for (const entry of ledger.records) {
    if (entry.disposition !== 'corrected' || entry.labelConfirmed !== true) {
      throw new Error('Every ledger entry must be corrected and labelConfirmed');
    }
    if (!entry.source?.currentPath || !fs.existsSync(entry.source.currentPath)) {
      throw new Error('Ledger source path does not exist: ' + entry.stableIdentity);
    }
    const identity = entry.stableIdentity;
    if (identities.has(identity)) throw new Error('Duplicate ledger identity: ' + identity);
    identities.add(identity);
    if (sourceSuffix(entry.source.currentPath) !== identity
      || sourceBasename(entry.source.currentPath) !== sourceBasename(identity)) {
      throw new Error('Ledger stable identity/path suffix mismatch: ' + identity);
    }

    const category = categoryFor(entry);
    if (entry.category !== category) {
      throw new Error('Ledger category mismatch: ' + identity);
    }
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

    const expected = expectedForCategory(category);
    const before = pairStateFromLedger(entry, 'current');
    const after = pairStateFromLedger(entry, 'visible');
    if (!samePairState(after, expected)) {
      throw new Error('Ledger visible state disagrees with category matrix: ' + identity);
    }
    if (before.spotOnFire2dM !== after.spotOnFire2dM) {
      throw new Error('spotOnFire2dM numeric change is not allowed: ' + identity);
    }

    const group = before.spotOnFire3dM + '/' + before.spotOnFire2dM
      + ' -> ' + after.spotOnFire3dM + '/' + after.spotOnFire2dM;
    groupCounts[group] = (groupCounts[group] ?? 0) + 1;

    for (const stat of stats) {
      if (before[stat] !== after[stat]) {
        valueChanges++;
        if (stat === 'spotOnFire3dM') numeric3dChanges++;
        if (stat === 'spotOnFire2dM') numeric2dChanges++;
      }
      if (!sameJson(before.comparisons[stat], after.comparisons[stat])) {
        comparisonShapeChanges++;
      }
    }

    targets.push({ entry, before, after });
  }

  if (!sameMap(categoryCounts, expectedCategoryCounts)) {
    throw new Error('Derived category counts do not match the authoritative plan');
  }
  if (!sameMap(groupCounts, expectedGroupCounts)) {
    throw new Error('Current-to-observed pair groups do not match: ' + JSON.stringify(groupCounts));
  }
  if (valueChanges !== 29 || numeric3dChanges !== 29 || numeric2dChanges !== 0) {
    throw new Error('Expected 29 numeric 3D changes and zero numeric 2D changes');
  }
  if (comparisonShapeChanges !== 4) {
    throw new Error('Expected exactly 4 comparison-shape changes; found ' + comparisonShapeChanges);
  }
  const comparisonPlan = targets.flatMap(target => stats
    .filter(stat => !sameJson(target.before.comparisons[stat], target.after.comparisons[stat]))
    .map(stat => ({ ...target, stat })));
  if (comparisonPlan.some(change =>
    change.stat !== 'spotOnFire2dM'
    || change.before.comparisons[change.stat]?.direction !== 'down'
    || change.before.comparisons[change.stat]?.effect !== 'buff'
    || change.before.comparisons[change.stat]?.color !== null
    || !sameJson(change.after.comparisons[change.stat], greenDownBuff)
    || !String(change.entry.current.comparisons).includes('canonical color absent')
  )) {
    throw new Error('Comparison changes are not limited to the four incomplete 2D green shapes');
  }

  return targets;
};

try {
  const ledger = readJson(ledgerPath);
  const review = readJson(reviewPath);
  const targets = validateLedger(ledger);
  if (!Array.isArray(review.records)) throw new Error('Canonical target has no records array');

  for (const target of targets) {
    const { entry, before, after } = target;
    const matches = review.records.filter(record =>
      record.weaponName === entry.weaponName
      && record.attachmentType === entry.attachmentType
      && record.attachmentName === entry.attachmentName
      && sourceSuffix(record.source?.currentPath ?? '') === entry.stableIdentity
      && sourceBasename(record.source?.currentPath ?? '') === sourceBasename(entry.stableIdentity)
      && sourceBasename(record.source?.proposedFilename ?? '') === sourceBasename(entry.stableIdentity)
    );
    if (matches.length !== 1) {
      throw new Error('Expected exactly one canonical target for ' + entry.stableIdentity
        + '; found ' + matches.length);
    }
    const record = matches[0];
    if (record.source.currentPath !== entry.source.currentPath) {
      throw new Error('Canonical source.currentPath differs from ledger path: ' + entry.stableIdentity);
    }
    if (!record.stats || !hasOwn(record.stats, 'spotOnFire3dM')
      || !hasOwn(record.stats, 'spotOnFire2dM')) {
      throw new Error('Canonical target lacks required spot-range stats: ' + entry.stableIdentity);
    }

    const current = pairStateFromRecord(record);
    const alreadyCorrect = samePairState(current, after);
    if (!alreadyCorrect && !samePairState(current, before)) {
      throw new Error('Canonical target is neither the ledger before nor after state: '
        + entry.stableIdentity);
    }
    target.record = record;
    target.alreadyCorrect = alreadyCorrect;
  }

  summary.matchedEntries = targets.length;
  summary.alreadyCorrect = targets.filter(target => target.alreadyCorrect).length;

  for (const target of targets) {
    if (target.alreadyCorrect) continue;
    const { entry, record, before, after } = target;
    for (const stat of stats) {
      if (record.stats[stat] !== after[stat]) {
        record.stats[stat] = after[stat];
        summary.valueChanges++;
      }
      const beforeShape = stateForComparison(record, stat);
      const afterShape = after.comparisons[stat];
      if (sameJson(beforeShape, afterShape)) continue;

      if (stat === 'spotOnFire2dM' && beforeShape?.color === null
        && sameJson(afterShape, greenDownBuff)) {
        record.statComparisons ??= {};
        record.statComparisons[stat] = { ...greenDownBuff };
        summary.comparisonChanges++;
      } else {
        throw new Error('Unexpected comparison mutation target: ' + entry.stableIdentity
          + '/' + stat);
      }
    }
    summary.appliedEntries++;
  }

  if (summary.appliedEntries > 0) {
    fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify(summary));
} catch (error) {
  summary.errors.push(error instanceof Error ? error.message : String(error));
  console.error(JSON.stringify(summary));
  process.exitCode = 1;
}
