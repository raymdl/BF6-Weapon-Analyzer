// Reconcile stale override paths to the current screenshot paths for the
// unambiguous, unoccupied safe subset. Deferred entries remain untouched.
// Idempotent: a successful rerun makes no changes.

import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'outputs/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const overridesPath = path.join(auditRoot, 'manual-review-overrides.json');
const reportPath = path.join(auditRoot, 'ledger-path-drift-20260801.json');
const readText = file => fs.readFileSync(file, 'utf8');
const read = file => JSON.parse(readText(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const baseName = value => path.basename(value);
const sourceKey = value => path.resolve(value).toLowerCase();
const identityKey = (weaponName, attachmentType, attachmentName) => [weaponName, attachmentType, attachmentName].join('\u0000');
const stable = value => JSON.stringify(value);

const reviewTextBefore = readText(reviewPath);
const review = JSON.parse(reviewTextBefore);
const manual = read(overridesPath);
const entryCountBefore = manual.overrides.length;
const entriesBefore = manual.overrides.map(entry => stable(entry));
const updatesBefore = manual.overrides.map(entry => stable(entry.updates));

if (!Array.isArray(review.records) || !Array.isArray(manual.overrides)) throw new Error('Unexpected audit JSON shape');

const assertUniqueSourcePaths = () => {
  const seen = new Map();
  for (const entry of manual.overrides) {
    if (!entry.sourcePath) throw new Error('Override entry is missing sourcePath');
    const key = sourceKey(entry.sourcePath);
    if (seen.has(key)) throw new Error('Duplicate override sourcePath: ' + entry.sourcePath);
    seen.set(key, entry);
  }
};

assertUniqueSourcePaths();

const recordsByIdentity = new Map();
for (const row of review.records) {
  const key = identityKey(row.weaponName, row.attachmentType, row.attachmentName);
  if (!recordsByIdentity.has(key)) recordsByIdentity.set(key, []);
  recordsByIdentity.get(key).push(row);
}

const occupiedByPath = new Map(manual.overrides.map(entry => [entry.sourcePath, entry]));
const candidateRepairs = [];
const deferred = [];
let missingSourcePathCount = 0;
for (let index = 0; index < manual.overrides.length; index++) {
  const entry = manual.overrides[index];
  if (fs.existsSync(entry.sourcePath)) continue;
  missingSourcePathCount++;

  const matches = recordsByIdentity.get(identityKey(entry.weaponName, entry.attachmentType, entry.attachmentName)) ?? [];
  if (matches.length === 0) {
    deferred.push({ index, entry, reason: 'ambiguous-no-record' });
    continue;
  }
  if (matches.length > 1) {
    deferred.push({ index, entry, reason: 'ambiguous-multiple-records' });
    continue;
  }

  const row = matches[0];
  const targetPath = row.source.currentPath;
  const competing = occupiedByPath.get(targetPath);
  if (competing) {
    deferred.push({ index, entry, reason: 'target-path-occupied', competing });
    continue;
  }
  if (!fs.existsSync(targetPath)) throw new Error('Resolved target path does not exist: ' + targetPath);
  candidateRepairs.push({ index, entry, row, oldPath: entry.sourcePath, targetPath });
}

const repairsByTarget = new Map();
for (const repair of candidateRepairs) {
  if (!repairsByTarget.has(repair.targetPath)) repairsByTarget.set(repair.targetPath, []);
  repairsByTarget.get(repair.targetPath).push(repair);
}
const repairs = [];
for (const group of repairsByTarget.values()) {
  if (group.length === 1) {
    repairs.push(group[0]);
    continue;
  }
  for (const repair of group) {
    deferred.push({
      index: repair.index,
      entry: repair.entry,
      reason: 'target-contested-by-multiple-orphans',
      targetPath: repair.targetPath,
      competitors: group.filter(other => other.index !== repair.index),
    });
  }
}

const reportAlreadyExists = fs.existsSync(reportPath);
if (!reportAlreadyExists && repairs.length !== 1094) {
  throw new Error('Safe subset count changed: expected 1094, found ' + repairs.length);
}
if (reportAlreadyExists && repairs.length !== 0) {
  throw new Error('Existing deferred report found while safe entries remain: ' + repairs.length);
}

const reasonCounts = {
  'ambiguous-multiple-records': 0,
  'ambiguous-no-record': 0,
  'target-path-occupied': 0,
  'target-contested-by-multiple-orphans': 0,
};
for (const item of deferred) reasonCounts[item.reason]++;
if (repairs.length + deferred.length !== missingSourcePathCount) {
  throw new Error('Missing-path accounting mismatch: ' + repairs.length + ' repaired + ' + deferred.length + ' deferred != ' + missingSourcePathCount + ' missing');
}

const deferredReport = {
  summary: {
    ledgerEntryCount: entryCountBefore,
    deferredEntryCount: deferred.length,
    byReason: reasonCounts,
  },
  deferred: deferred.map(deferredItem => {
    const { entry, reason, competing } = deferredItem;
    return {
      sourceFilename: entry.sourceFilename ?? baseName(entry.sourcePath),
      weaponName: entry.weaponName,
      attachmentType: entry.attachmentType,
      attachmentName: entry.attachmentName,
      reason,
      ...(reason === 'target-path-occupied' ? { competingSourceFilename: competing.sourceFilename ?? baseName(competing.sourcePath) } : {}),
      ...(reason === 'target-contested-by-multiple-orphans' ? {
        sharedTargetPath: deferredItem.targetPath,
        contestingSourceFilenames: deferredItem.competitors.map(item => item.entry.sourceFilename ?? baseName(item.entry.sourcePath)),
      } : {}),
    };
  }),
};

for (const repair of repairs) {
  const entry = repair.entry;
  const oldPath = repair.oldPath;
  const targetPath = repair.targetPath;
  entry.sourcePath = targetPath;
  entry.sourceFilename = baseName(targetPath);
  for (const evidence of entry.evidence ?? []) {
    if (evidence.source === oldPath) evidence.source = targetPath;
  }
}

if (manual.overrides.length !== entryCountBefore) throw new Error('Override entry count changed');
for (let index = 0; index < manual.overrides.length; index++) {
  if (stable(manual.overrides[index].updates) !== updatesBefore[index]) throw new Error('Updates content changed at ledger index ' + index);
  if (!repairs.some(repair => repair.index === index) && stable(manual.overrides[index]) !== entriesBefore[index]) {
    throw new Error('Out-of-scope ledger entry changed at index ' + index);
  }
}
for (const repair of repairs) {
  const entry = manual.overrides[repair.index];
  if (entry.sourcePath !== repair.targetPath || entry.sourceFilename !== baseName(repair.targetPath)) {
    throw new Error('Repair did not refresh source fields at ledger index ' + repair.index);
  }
  if (!fs.existsSync(entry.sourcePath)) throw new Error('Repaired source path does not exist: ' + entry.sourcePath);
  const beforeEntry = JSON.parse(entriesBefore[repair.index]);
  const afterEntry = entry;
  const beforeEvidence = beforeEntry.evidence ?? [];
  const afterEvidence = afterEntry.evidence ?? [];
  if (beforeEvidence.length !== afterEvidence.length) throw new Error('Evidence length changed at ledger index ' + repair.index);
  for (let evidenceIndex = 0; evidenceIndex < beforeEvidence.length; evidenceIndex++) {
    const expectedEvidence = { ...beforeEvidence[evidenceIndex] };
    if (expectedEvidence.source === repair.oldPath) expectedEvidence.source = repair.targetPath;
    if (stable(afterEvidence[evidenceIndex]) !== stable(expectedEvidence)) {
      throw new Error('Unexpected evidence change at ledger index ' + repair.index);
    }
  }
}

assertUniqueSourcePaths();
if (manual.overrides.length !== entryCountBefore) throw new Error('Override entry count changed after duplicate check');
if (readText(reviewPath) !== reviewTextBefore) throw new Error('Review JSON changed during reconciliation');

const reportText = JSON.stringify(deferredReport, null, 2) + '\n';
if (reportAlreadyExists) {
  if (readText(reportPath) !== reportText) throw new Error('Existing deferred report differs from current deferred set');
} else {
  write(reportPath, deferredReport);
}

if (repairs.length > 0) write(overridesPath, manual);

console.log(JSON.stringify({
  repaired: repairs.length,
  deferred: deferred.length,
  deferredByReason: reasonCounts,
  entryCount: manual.overrides.length,
  noOp: repairs.length === 0 && reportAlreadyExists,
}, null, 2));
