import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const auditDir = path.dirname(fileURLToPath(import.meta.url));
const defaultLedger = path.join(auditDir, 'spot-range-evidence-sidearm-baselines-20260809.json');
const defaultTarget = path.join(auditDir, 'attachment-screenshot-review.json');
const expectedDigest = '043aa90bbff08924c1887122f862ea2361854847a7bd785195f6ed8f142a6fa6';
const expectedCorrected = new Set([
  'M45A1|Muzzle|Standard Suppressor|05_M45A1_Muzzle_Standard_Suppressor.png',
  'M45A1|Muzzle|CQB Suppressor|06_M45A1_Muzzle_CQB_Suppressor.png',
  'VZ. 61|Muzzle|Standard Suppressor|04_VZ. 61_Muzzle_Standard_Suppressor.png',
  'VZ. 61|Muzzle|CQB Suppressor|05_VZ. 61_Muzzle_CQB_Suppressor.png'
]);

function parseArgs(argv) {
  const args = { apply: false, ledger: defaultLedger, target: defaultTarget };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--ledger') args.ledger = path.resolve(argv[++i]);
    else if (argv[i] === '--target') args.target = path.resolve(argv[++i]);
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizedPath(value) {
  return String(value || '').replace(/\//g, '\\').toLowerCase();
}

function basename(value) {
  return normalizedPath(value).split('\\').pop();
}

function comparisonShape(value) {
  if (!value) return null;
  return {
    direction: value.direction ?? null,
    effect: value.effect ?? null,
    color: value.color ?? null
  };
}

function isGreenDown(value) {
  return sameJson(comparisonShape(value), {
    direction: 'down',
    effect: 'buff',
    color: 'green'
  });
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function pairKey(record, field = 'currentCorpus') {
  const source = record[field];
  return source.spotOnFire3dM.value + '/' + source.spotOnFire2dM.value;
}

function currentToObservedKey(record) {
  return pairKey(record, 'currentCorpus') + ' -> ' + record.observed.spotOnFire3dM.value + '/' + record.observed.spotOnFire2dM.value;
}

function changedPaths(before, after, prefix = '') {
  if (sameJson(before, after)) return [];
  if (before === null || after === null || typeof before !== 'object' || typeof after !== 'object') {
    return [prefix || '/'];
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const paths = [];
  for (const key of keys) {
    const next = prefix + '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1');
    paths.push(...changedPaths(before[key], after[key], next));
  }
  return paths;
}

function fail(errors, message) {
  errors.push(message);
}

function validateLedger(ledger) {
  const errors = [];
  if (!ledger || ledger.auditType !== 'evidence-only-spot-range-sidearm-baselines') {
    fail(errors, 'ledger auditType is not the sidearm baseline evidence ledger');
  }
  if (!Array.isArray(ledger?.records) || ledger.records.length !== 24) {
    fail(errors, 'ledger must contain exactly 24 records');
  }
  const records = Array.isArray(ledger?.records) ? ledger.records : [];
  const identities = new Set();
  const paths = new Set();
  const dispositions = { confirmed: 0, corrected: 0, unresolved: 0 };
  const pairs = {};
  const transitions = {};
  const correctionGroups = {};
  const correctedKeys = new Set();

  for (const record of records) {
    if (!record.weapon || !record.selectedAttachment?.slot || !record.selectedAttachment?.name || !record.capture?.filename) {
      fail(errors, 'record is missing stable identity fields');
      continue;
    }
    if (identities.has(record.stableIdentity)) fail(errors, 'duplicate stable identity: ' + record.stableIdentity);
    identities.add(record.stableIdentity);
    const sourcePath = record.capture.fullScreenshotPath;
    if (paths.has(sourcePath)) fail(errors, 'duplicate currentPath: ' + sourcePath);
    paths.add(sourcePath);
    if (!fs.existsSync(sourcePath)) fail(errors, 'missing full screenshot: ' + sourcePath);
    if (!fs.existsSync(record.cropPath)) fail(errors, 'missing crop: ' + record.cropPath);
    if (record.labelConfirmed !== true) fail(errors, 'labelConfirmed is not true: ' + record.stableIdentity);
    if (!record.parity || typeof record.parity.overall !== 'boolean') fail(errors, 'missing parity object: ' + record.stableIdentity);
    if (!record.currentCorpus?.spotOnFire3dM || !record.currentCorpus?.spotOnFire2dM) {
      fail(errors, 'missing current corpus spot values: ' + record.stableIdentity);
      continue;
    }
    if (!record.observed?.spotOnFire3dM || !record.observed?.spotOnFire2dM) {
      fail(errors, 'missing observed spot values: ' + record.stableIdentity);
      continue;
    }
    increment(pairs, pairKey(record, 'currentCorpus'));
    increment(transitions, currentToObservedKey(record));
    if (!Object.hasOwn(dispositions, record.disposition)) fail(errors, 'invalid disposition: ' + record.stableIdentity);
    else dispositions[record.disposition] += 1;
    const correctionKey = record.weapon + '|' + record.selectedAttachment.slot + '|' + record.selectedAttachment.name + '|' + record.capture.filename;
    if (record.disposition === 'corrected') {
      correctedKeys.add(correctionKey);
      increment(correctionGroups, currentToObservedKey(record));
      if (record.currentCorpus.spotOnFire3dM.value !== 0 || record.currentCorpus.spotOnFire2dM.value !== 64 ||
          record.observed.spotOnFire3dM.value !== 0 || record.observed.spotOnFire2dM.value !== 9 ||
          !isGreenDown(record.currentCorpus.spotOnFire3dM.comparison) ||
          !isGreenDown(record.currentCorpus.spotOnFire2dM.comparison) ||
          record.observed.spotOnFire3dM.arrow !== 'down/buff/green' ||
          record.observed.spotOnFire2dM.arrow !== 'down/buff/green') {
        fail(errors, 'corrected record is not the exact 0/64 to 0/9 green-down state: ' + record.stableIdentity);
      }
    }
  }

  if (!sameJson(dispositions, { confirmed: 20, corrected: 4, unresolved: 0 })) {
    fail(errors, 'disposition counts are not 20 confirmed, 4 corrected, 0 unresolved');
  }
  if (!sameJson(transitions, {
    '27/64 -> 27/64': 19,
    '0/64 -> 0/64': 1,
    '0/64 -> 0/9': 4
  })) fail(errors, 'current-to-observed groups are not exact');
  if (!sameJson(correctionGroups, { '0/64 -> 0/9': 4 })) fail(errors, 'correction group is not exact');
  if (!sameJson([...correctedKeys].sort(), [...expectedCorrected].sort())) fail(errors, 'corrected target set is not exact');

  const parity = ledger.scopedWitnessBaselineParity;
  if (parity?.recordsCompared !== 24 || parity?.recordsUnchanged !== 24 || parity?.unchanged !== true ||
      parity?.baselineProjectionSha256 !== expectedDigest || parity?.currentProjectionSha256 !== expectedDigest) {
    fail(errors, '24-record scoped parity digest is not stable');
  }
  const hashes = ledger.hashVerification;
  if (hashes?.baseline?.canonicalJson?.sha256 !== '62faab46ddd59ab3e092b74fb1b360e99e194f64debd6e77e5f4f437555bba1b' ||
      hashes?.postAudit?.canonicalJson?.sha256 !== '3526113a81a114667278e84c5dcef29d5bb534863a3a3d61d1c56192bc123724' ||
      hashes?.unchanged !== false ||
      !String(hashes?.externalParallelChange || '').includes('separate authorized general spot-range correction')) {
    fail(errors, 'external whole-file hash drift is not explicitly accounted for');
  }
  for (const workbook of ['migrationWorkbook', 'rootWorkbook']) {
    if (hashes?.baseline?.[workbook]?.sha256 !== hashes?.postAudit?.[workbook]?.sha256) {
      fail(errors, workbook + ' hash changed');
    }
  }
  return { errors, records, correctedKeys };
}

function findTargetRecord(target, evidence) {
  return target.records.filter((record) => {
    const sameIdentity =
      record.weaponName === evidence.weapon &&
      record.attachmentType === evidence.selectedAttachment.slot &&
      record.attachmentName === evidence.selectedAttachment.name;
    const sameCapture = normalizedPath(record.source?.currentPath).endsWith('\\' + normalizedPath(evidence.capture.filename));
    return sameIdentity && sameCapture;
  });
}

function validateTarget(target, ledgerRecords, errors, summary) {
  if (!Array.isArray(target?.records)) {
    fail(errors, 'target records array is missing');
    return [];
  }
  const matched = [];
  const seen = new Set();
  for (const evidence of ledgerRecords) {
    const matches = findTargetRecord(target, evidence);
    if (matches.length !== 1) {
      fail(errors, 'expected one target match for ' + evidence.stableIdentity + ', found ' + matches.length);
      continue;
    }
    const record = matches[0];
    const targetKey = evidence.weapon + '|' + evidence.selectedAttachment.slot + '|' + evidence.selectedAttachment.name + '|' + evidence.capture.filename;
    if (seen.has(targetKey)) fail(errors, 'duplicate target identity: ' + targetKey);
    seen.add(targetKey);
    const currentState = record.stats?.spotOnFire3dM + '/' + record.stats?.spotOnFire2dM;
    const beforeState = evidence.currentCorpus.spotOnFire3dM.value + '/' + evidence.currentCorpus.spotOnFire2dM.value;
    const afterState = evidence.observed.spotOnFire3dM.value + '/' + evidence.observed.spotOnFire2dM.value;
    if (currentState !== beforeState && !(evidence.disposition === 'corrected' && currentState === afterState)) {
      fail(errors, 'target current values differ from ledger: ' + evidence.stableIdentity);
    }
    for (const field of ['spotOnFire3dM', 'spotOnFire2dM']) {
      if (!sameJson(comparisonShape(record.statComparisons?.[field]), comparisonShape(evidence.currentCorpus[field].comparison))) {
        fail(errors, 'target comparison shape differs from ledger: ' + evidence.stableIdentity + ' ' + field);
      }
    }
    matched.push({ evidence, record, targetKey });
  }
  summary.matchedEntries = matched.length;
  return matched;
}

function validateAndApplyEntry(entry, errors, summary) {
  const { evidence, record } = entry;
  const before = clone(record);
  const beforeComparisons = {
    threeD: clone(record.statComparisons?.spotOnFire3dM ?? null),
    twoD: clone(record.statComparisons?.spotOnFire2dM ?? null)
  };
  const beforeAccepted =
    record.stats?.spotOnFire3dM === 0 &&
    record.stats?.spotOnFire2dM === 64 &&
    isGreenDown(record.statComparisons?.spotOnFire3dM) &&
    isGreenDown(record.statComparisons?.spotOnFire2dM);
  const afterAccepted =
    record.stats?.spotOnFire3dM === 0 &&
    record.stats?.spotOnFire2dM === 9 &&
    isGreenDown(record.statComparisons?.spotOnFire3dM) &&
    isGreenDown(record.statComparisons?.spotOnFire2dM);
  if (!beforeAccepted && !afterAccepted) {
    fail(errors, 'target is neither accepted before nor accepted after state: ' + evidence.stableIdentity);
    return;
  }
  if (afterAccepted) {
    summary.alreadyCorrect += 1;
    return;
  }
  record.stats.spotOnFire2dM = 9;
  const entryChanges = changedPaths(before, record);
  if (!sameJson(entryChanges, ['/stats/spotOnFire2dM'])) {
    fail(errors, 'entry changed outside spotOnFire2dM: ' + evidence.stableIdentity);
    return;
  }
  if (record.stats.spotOnFire3dM !== 0 ||
      !sameJson(record.statComparisons?.spotOnFire3dM, beforeComparisons.threeD) ||
      !sameJson(record.statComparisons?.spotOnFire2dM, beforeComparisons.twoD) ||
      record.stats.spotOnFire2dM !== 9 ||
      !isGreenDown(record.statComparisons?.spotOnFire3dM) ||
      !isGreenDown(record.statComparisons?.spotOnFire2dM)) {
    fail(errors, 'comparison objects or 3D value changed unexpectedly: ' + evidence.stableIdentity);
    return;
  }
  summary.appliedEntries += 1;
  summary.valueChanges += 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ledger = readJson(args.ledger);
  const target = readJson(args.target);
  const ledgerValidation = validateLedger(ledger);
  const errors = [...ledgerValidation.errors];
  const beforeTarget = clone(target);
  const summary = {
    matchedEntries: 0,
    appliedEntries: 0,
    valueChanges: 0,
    comparisonChanges: 0,
    alreadyCorrect: 0,
    errors
  };
  const correctedRecords = ledgerValidation.records.filter((record) => record.disposition === 'corrected');
  if (correctedRecords.length !== 4) fail(errors, 'corrected ledger scope is not exactly four records');
  const matched = validateTarget(target, ledgerValidation.records, errors, summary);
  const correctedMatched = matched.filter((entry) => entry.evidence.disposition === 'corrected');
  if (correctedMatched.length !== 4) fail(errors, 'exactly four corrected target records were not matched');
  for (const entry of correctedMatched) validateAndApplyEntry(entry, errors, summary);

  const fullChanges = changedPaths(beforeTarget, target);
  const expectedValuePaths = correctedMatched.map((entry) => '/records/' + target.records.indexOf(entry.record) + '/stats/spotOnFire2dM').sort();
  const expectedChanges = summary.appliedEntries > 0 ? expectedValuePaths : [];
  if (!sameJson(fullChanges.sort(), expectedChanges)) {
    fail(errors, 'semantic diff is not exactly the four scoped 2D values');
  }
  if (summary.valueChanges !== summary.appliedEntries || summary.comparisonChanges !== 0) {
    fail(errors, 'summary reports an invalid value/comparison change count');
  }
  if (errors.length === 0 && args.apply && summary.appliedEntries > 0) {
    fs.writeFileSync(args.target, JSON.stringify(target, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({
    matchedEntries: summary.matchedEntries,
    appliedEntries: args.apply ? summary.appliedEntries : 0,
    valueChanges: args.apply ? summary.valueChanges : 0,
    comparisonChanges: summary.comparisonChanges,
    alreadyCorrect: summary.alreadyCorrect,
    errors
  }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

main();
