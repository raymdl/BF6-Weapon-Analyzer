import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, '../..');
const checkScreenshots = process.argv.includes('--screenshots');
const review = JSON.parse(readFileSync(resolve(here, 'attachment-screenshot-review.json'), 'utf8'));
const errors = [];
const fail = message => errors.push(message);

if (review.$schema !== '../../schemas/attachment-screenshot-review.schema.json') fail('Unexpected $schema path');
if (review.schemaVersion !== 4) fail(`Unsupported schemaVersion ${review.schemaVersion}`);
if (!Array.isArray(review.records)) fail('records must be an array');

const records = Array.isArray(review.records) ? review.records : [];
const statusSets = {
  extractionStatus: new Set(['context-only', 'provisional-review-required']),
  reviewStatus: new Set([null, 'provisional-review-required', 'reviewed']),
  mappingReviewStatus: new Set(['ocr-pending', 'visually-checked']),
};
const requiredRecordFields = [
  'weaponName', 'attachmentType', 'attachmentSubtype', 'attachmentCost',
  'attachmentName', 'attachmentDescription', 'stats', 'statComparisons',
  'source', 'extractionStatus', 'reviewStatus', 'mappingReviewStatus',
  'reviewer', 'reviewDate', 'reviewConflicts', 'statFieldReasons', 'notes',
];
const identities = new Set();
const weapons = new Set();

function sourceIdentity(value) {
  const normalized = String(value ?? '').replaceAll('\\', '/');
  const match = normalized.match(/(?:^|\/)(Weapon Attachments\/.+)$/i);
  return match?.[1].replace(/\/+/g, '/').toLowerCase() ?? null;
}

for (const [index, record] of records.entries()) {
  for (const field of requiredRecordFields) {
    if (!Object.hasOwn(record, field)) fail(`records[${index}] is missing ${field}`);
  }
  if (typeof record.weaponName !== 'string' || !record.weaponName) fail(`records[${index}] has no weaponName`);
  if (typeof record.attachmentName !== 'string' || !record.attachmentName) fail(`records[${index}] has no attachmentName`);
  for (const [field, allowed] of Object.entries(statusSets)) {
    if (!allowed.has(record[field])) fail(`records[${index}] has invalid ${field}: ${record[field]}`);
  }
  const identity = sourceIdentity(record.source?.currentPath);
  if (!identity) fail(`records[${index}] source is not rooted under Weapon Attachments`);
  else if (identities.has(identity)) fail(`Duplicate source identity: ${identity}`);
  else identities.add(identity);
  if (record.frosty) {
    const requiredFrostyFields = ['sourceVersion', 'evidenceFile', 'attachmentXml', 'slot', 'siteId', 'status'];
    for (const field of requiredFrostyFields) {
      if (!record.frosty[field]) fail(`records[${index}] Frosty record is missing ${field}`);
    }
    if (record.frosty.status !== 'pending-screenshot-capture') {
      fail(`records[${index}] has invalid Frosty status: ${record.frosty.status}`);
    }
    if (!existsSync(resolve(workspaceRoot, record.frosty.evidenceFile ?? ''))) {
      fail(`records[${index}] Frosty evidence file does not exist`);
    }
    if (record.stats !== null || record.statComparisons !== null) {
      fail(`records[${index}] pending Frosty row must not claim captured stats or arrows`);
    }
    if (record.frosty.panelFields) {
      const fields = Object.keys(records.find(row => row.stats)?.stats ?? {});
      if (Object.keys(record.frosty.panelFields).length !== fields.length
          || fields.some(field => !Object.hasOwn(record.frosty.panelFields, field))) {
        fail(`records[${index}] Frosty panel must account for every displayed field`);
      }
      for (const [field, entry] of Object.entries(record.frosty.panelFields)) {
        if (!entry.reason || (entry.status === 'unsupported' && entry.value !== null)) {
          fail(`records[${index}] invalid Frosty field reason/value: ${field}`);
        }
      }
    }
  } else if (checkScreenshots && !existsSync(resolve(workspaceRoot, record.source?.currentPath ?? ''))) {
    fail(`records[${index}] screenshot does not exist: ${record.source?.currentPath}`);
  }
  if (record.weaponName) weapons.add(record.weaponName);
}

const expectedCounts = {
  recordCount: records.length,
  attachmentDetailCount: records.filter(record => record.stats != null).length,
  mappingReviewedCount: records.filter(record => record.mappingReviewStatus === 'visually-checked').length,
};
for (const [field, expected] of Object.entries(expectedCounts)) {
  if (review[field] !== expected) fail(`${field} is ${review[field]}, derived ${expected}`);
}
if (!Array.isArray(review.weaponsProcessed)
    || new Set(review.weaponsProcessed).size !== review.weaponsProcessed.length
    || review.weaponsProcessed.length !== weapons.size
    || review.weaponsProcessed.some(weapon => !weapons.has(weapon))) {
  fail('weaponsProcessed does not exactly match record weapon names');
}

if (errors.length) {
  console.error(`Attachment reference validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Attachment reference validation passed');
console.log(`- ${records.length} records, ${expectedCounts.attachmentDetailCount} detail panels, ${weapons.size} weapons`);
