import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Project');
const auditRoot = path.join(projectRoot, 'outputs', 'attachment-audit');
const backupRoot = path.join(auditRoot, 'pre-json-merge-recovery-20260728');
const reviewName = 'attachment-screenshot-review.json';
const manualName = 'manual-review-overrides.json';
const coverageName = 'coverage-report.json';
const baselineName = 'attachment-screenshot-review.reload-idempotence-before.json';
const read = name => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const recordKey = row => `${row.weaponName}|${row.source?.captureOrder}`;
const groupKey = row => `${row.weaponName}|${row.attachmentType}|${row.attachmentName}`;
const uniqueValues = values => [...new Set(values.filter(value => value !== null && value !== undefined).map(value => JSON.stringify(value)))];

fs.mkdirSync(backupRoot, { recursive: true });
for (const name of [reviewName, manualName, coverageName]) {
  const source = path.join(auditRoot, name);
  const backup = path.join(backupRoot, name);
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);
}

const review = read(reviewName);
const baseline = read(baselineName);
const manual = read(manualName);
const fields = Object.keys(review.records.find(row => row.stats)?.stats ?? {});
const fieldSet = new Set(fields);
const baselineByKey = new Map(baseline.records.filter(row => row.stats).map(row => [recordKey(row), row]));
const currentGroups = new Map();
const baselineGroups = new Map();
for (const row of review.records.filter(row => row.stats)) {
  if (!currentGroups.has(groupKey(row))) currentGroups.set(groupKey(row), []);
  currentGroups.get(groupKey(row)).push(row);
}
for (const row of baseline.records.filter(row => row.stats)) {
  if (!baselineGroups.has(groupKey(row))) baselineGroups.set(groupKey(row), []);
  baselineGroups.get(groupKey(row)).push(row);
}

const changes = { recoveredNulls: [], manualOverridesApplied: [], manualOverridesCreated: 0 };
for (const row of review.records.filter(row => row.stats)) {
  const source = baselineByKey.get(recordKey(row));
  if (!source) continue;
  const siblings = currentGroups.get(groupKey(row));
  const baselineSiblings = baselineGroups.get(groupKey(row)) ?? [];
  for (const field of fields) {
    if (row.stats[field] !== null || source.stats?.[field] === null || source.stats?.[field] === undefined) continue;
    let value = source.stats[field];
    if (siblings.length > 1) {
      const currentValues = uniqueValues(siblings.map(item => item.stats[field]));
      const baselineValues = uniqueValues(baselineSiblings.map(item => item.stats[field]));
      if (currentValues.length === 1) value = JSON.parse(currentValues[0]);
      else if (currentValues.length > 1 || baselineValues.length !== 1) continue;
      else value = JSON.parse(baselineValues[0]);
    }
    row.stats[field] = value;
    if (row.statFieldReasons) delete row.statFieldReasons[field];
    changes.recoveredNulls.push({ key: recordKey(row), field, value });
  }
}

const overrideByPath = new Map(manual.overrides.filter(item => item.sourcePath).map(item => [path.resolve(item.sourcePath).toLowerCase(), item]));
for (const row of review.records.filter(row => row.stats)) {
  const recovered = changes.recoveredNulls.filter(item => item.key === recordKey(row));
  if (!recovered.length) continue;
  const sourcePath = path.resolve(row.source.currentPath);
  let override = overrideByPath.get(sourcePath.toLowerCase());
  if (!override) {
    override = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath,
      sourceFilename: path.basename(sourcePath),
      updates: {},
      evidence: [],
    };
    manual.overrides.push(override);
    overrideByPath.set(sourcePath.toLowerCase(), override);
    changes.manualOverridesCreated += 1;
  }
  override.updates = { ...(override.updates ?? {}) };
  for (const { field, value } of recovered) if (override.updates[field] === null || override.updates[field] === undefined) override.updates[field] = value;
  override.evidence = [...new Map([...(override.evidence ?? []), {
    kind: 'pre-regression-non-null-json-recovery',
    source: baselineName,
    reviewDate: '2026-07-28',
  }].map(item => [JSON.stringify(item), item])).values()];
}

const recordsByPath = new Map(review.records.filter(row => row.source?.currentPath).map(row => [path.resolve(row.source.currentPath).toLowerCase(), row]));
const recordsByFilename = new Map(review.records.filter(row => row.source?.currentPath).map(row => [`${row.weaponName}|${path.basename(row.source.currentPath)}`.toLowerCase(), row]));
const recordsByIdentity = new Map();
for (const row of review.records) {
  const key = `${row.weaponName}|${row.attachmentType}|${row.attachmentName}`.toLowerCase();
  if (!recordsByIdentity.has(key)) recordsByIdentity.set(key, []);
  recordsByIdentity.get(key).push(row);
}
for (const override of manual.overrides) {
  let row = override.sourcePath ? recordsByPath.get(path.resolve(override.sourcePath).toLowerCase()) : null;
  if (!row && override.sourceFilename) row = recordsByFilename.get(`${override.weaponName}|${override.sourceFilename}`.toLowerCase());
  if (!row) {
    const identityMatches = recordsByIdentity.get(`${override.weaponName}|${override.attachmentType}|${override.attachmentName}`.toLowerCase()) ?? [];
    if (identityMatches.length === 1) row = identityMatches[0];
  }
  if (!row) continue;
  for (const [field, value] of Object.entries(override.updates ?? {})) {
    if (value === null || value === undefined) continue;
    if (fieldSet.has(field) && row.stats) {
      const siblings = currentGroups.get(groupKey(row)) ?? [row];
      if (siblings.length > 1) {
        const siblingValues = uniqueValues(siblings.map(item => item.stats[field]));
        if (siblingValues.length === 1 && siblingValues[0] !== JSON.stringify(value)) continue;
      }
      if (JSON.stringify(row.stats[field]) !== JSON.stringify(value)) {
        changes.manualOverridesApplied.push({ key: recordKey(row), field, before: row.stats[field], after: value });
        row.stats[field] = value;
      }
      if (row.statFieldReasons) delete row.statFieldReasons[field];
    } else if (['attachmentName', 'attachmentSubtype', 'attachmentDescription', 'attachmentCost'].includes(field) && JSON.stringify(row[field]) !== JSON.stringify(value)) {
      changes.manualOverridesApplied.push({ key: recordKey(row), field, before: row[field], after: value });
      row[field] = value;
    }
  }
}

const recoveryNote = 'Recovered non-null screenshot-linked values from the pre-regression consolidated JSON on 2026-07-28; newer populated values and explicit manual overrides were preserved.';
for (const row of review.records.filter(row => changes.recoveredNulls.some(item => item.key === recordKey(row)))) row.notes = [...new Set([...(row.notes ?? []), recoveryNote])];
review.generatedAt = new Date().toISOString();
review.recordCount = review.records.length;
review.attachmentDetailCount = review.records.filter(row => row.stats).length;
review.mappingReviewedCount = review.records.filter(row => row.mappingReviewStatus === 'visually-checked').length;
manual.generatedAt = review.generatedAt;
write(reviewName, review);
write(manualName, manual);

const coverage = read(coverageName);
const detailRows = review.records.filter(row => row.stats);
for (const weaponCoverage of coverage.weapons) {
  const records = review.records.filter(row => row.weaponName === weaponCoverage.weapon).sort((a, b) => (a.source.captureOrder ?? 9999) - (b.source.captureOrder ?? 9999));
  const details = records.filter(row => row.stats);
  weaponCoverage.records = records.map(row => ({ type: row.attachmentType, name: row.attachmentName, subtype: row.attachmentSubtype, sourcePath: row.source.currentPath, duplicate: false, status: row.stats ? row.reviewStatus : 'context-only' }));
  weaponCoverage.unreadableOrObscuredFields = details.filter(row => Object.keys(row.statFieldReasons ?? {}).length).map(row => ({ source: path.basename(row.source.currentPath), fields: Object.keys(row.statFieldReasons), note: 'field-specific reason retained in review JSON' }));
  weaponCoverage.statCoverage = Object.fromEntries(fields.map(field => [field, { populated: details.filter(row => row.stats[field] !== null && row.stats[field] !== undefined).length, total: details.length }]));
  coverage.statCoverageByWeapon[weaponCoverage.weapon] = weaponCoverage.statCoverage;
}
coverage.generatedAt = review.generatedAt;
coverage.totals.records = review.records.length;
coverage.totals.detailRecords = detailRows.length;
coverage.totals.fullyTranscribedNewClass = detailRows.filter(row => fields.every(field => row.stats[field] !== null && row.stats[field] !== undefined) && row.attachmentCost !== null).length;
coverage.totals.fullyReviewed = review.records.filter(row => row.reviewStatus === 'reviewed').length;
coverage.totals.comparisonIndicators = review.records.reduce((sum, row) => sum + Object.keys(row.statComparisons ?? {}).length, 0);
coverage.totals.reviewConflicts = review.records.reduce((sum, row) => sum + (row.reviewConflicts?.length ?? 0), 0);
coverage.totals.unreadableOrObscured = coverage.weapons.reduce((sum, weapon) => sum + (weapon.unreadableOrObscuredFields?.length ?? 0), 0);
coverage.totals.mappingReviewed = review.records.filter(row => row.mappingReviewStatus === 'visually-checked').length;
coverage.totals.populatedFieldNullReasons = review.records.reduce((sum, row) => sum + Object.keys(row.statFieldReasons ?? {}).length, 0);
coverage.totals.staleCurrentPaths = review.records.filter(row => !fs.existsSync(row.source.currentPath)).length;
coverage.totals.destinationCollisions = 0;
coverage.totals.promoted = 0;
write(coverageName, coverage);
write('json-merge-recovery-summary.json', changes);

const nullCounts = Object.fromEntries(fields.map(field => [field, detailRows.filter(row => row.stats[field] === null).length]));
console.log(JSON.stringify({
  records: review.records.length,
  detailRecords: detailRows.length,
  recoveredNulls: changes.recoveredNulls.length,
  manualOverridesApplied: changes.manualOverridesApplied.length,
  manualOverridesCreated: changes.manualOverridesCreated,
  totalNulls: Object.values(nullCounts).reduce((sum, count) => sum + count, 0),
  completeRecords: detailRows.filter(row => fields.every(field => row.stats[field] !== null)).length,
}, null, 2));
