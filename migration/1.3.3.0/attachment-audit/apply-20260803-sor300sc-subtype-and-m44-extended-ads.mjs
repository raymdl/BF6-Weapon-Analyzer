// Apply two screenshot-authoritative corpus corrections and mirror them into the durable
// manual-review override ledger. This executable receipt records the pinned before/after values
// and the reason each correction is safe. Idempotent: a successful rerun reports noOp and makes
// no file changes.
//
// Unlike the 2026-08-02 receipt, this one does not assert that the original capture exists on
// disk. Both corrections were adjudicated from artifacts already tracked in the repository — the
// record's own filename, title OCR and description for SOR-300SC, and the comparison-arrow map
// for M44 — so the receipt stays runnable without the gitignored ~1.7 GB screenshot corpus.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const REVIEW = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'manual-review-overrides.json');
const REVIEW_DATE = '2026-08-03';

const corrections = [
  {
    weaponName: 'SOR-300SC',
    attachmentType: 'Ammo',
    attachmentName: 'Tungsten Core',
    field: 'attachmentSubtype',
    scope: 'record',
    before: 'Sub HP',
    after: 'Penetration',
    reason: 'Every other field of this record is Penetration ammunition: the capture is '
      + '53_SOR-300SC_Ammo_Penetration.png, the title OCR reads TUNGSTEN CORE, the description is the '
      + 'penetration text, and the stats are the unmodified base panel (528 m/s, 54 m / 150 m spotting, '
      + '1.0 collateral, 1.4 headshot) rather than a subsonic one. The weapon has a separate, correct '
      + 'Sub HP record (Subsonic HP, cost 30, 270 m/s, 27 m / 64 m). Only the subtype label is wrong.',
  },
  {
    weaponName: 'M433',
    attachmentType: 'Barrel',
    attachmentName: '18.9" Prototype',
    field: 'adsTimeMs',
    scope: 'stats',
    before: 250,
    after: 300,
    reason: 'The capture OCR for 13_M433_Barrel_Extended.png reads 3ooMS, and the panel carries an '
      + 'adsTimeMs comparison arrow (red, penalty). No manual override ever set adsTimeMs on this '
      + 'record, so the stored 250 ms — identical to the basic barrel — was never read from the panel. '
      + 'Operator-adjudicated 2026-08-03: the correct value is 300 ms.',
  },
  {
    weaponName: 'M44',
    attachmentType: 'Barrel',
    attachmentName: '8.37" Long',
    field: 'adsTimeMs',
    scope: 'stats',
    before: 200,
    after: 250,
    reason: 'The panel carries an adsTimeMs comparison arrow (red, penalty, confidence 0.842, bounds '
      + 'y 449-452) identical in position and effect to M433 Extended, whose capture OCR independently '
      + 'reads 300 ms against a 250 ms basic barrel. The stored 200 ms equals this weapon\'s basic-barrel '
      + 'value and contradicts its own arrow; the ADS TIME token is absent from the capture OCR, so the '
      + 'value was carried from the basic panel rather than read. One tier slower than the 200 ms basic '
      + 'barrel is 250 ms.',
  },
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const baseName = value => value.split(/[\\/]/).pop();
const sourceKey = value => path.resolve(value).toLowerCase();

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
if (!Array.isArray(review.records)) throw new Error('Review JSON is missing records');
if (!Array.isArray(ledger.overrides)) throw new Error('Manual ledger is missing overrides');

const assertUniqueSourcePaths = () => {
  const seen = new Set();
  for (const entry of ledger.overrides) {
    if (!entry.sourcePath) throw new Error('Override entry is missing sourcePath');
    const key = sourceKey(entry.sourcePath);
    if (seen.has(key)) throw new Error(`Duplicate override sourcePath: ${entry.sourcePath}`);
    seen.add(key);
  }
};

const findRecord = correction => {
  const matches = review.records.filter(row => row.weaponName === correction.weaponName
    && row.attachmentType === correction.attachmentType
    && row.attachmentName === correction.attachmentName);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one review row for ${correction.weaponName}|${correction.attachmentType}|${correction.attachmentName}, found ${matches.length}`);
  }
  const record = matches[0];
  if (!record.source?.currentPath) {
    throw new Error(`${correction.weaponName}|${correction.attachmentName}: record has no source path`);
  }
  return record;
};

const readField = (record, correction) => (correction.scope === 'stats'
  ? record.stats?.[correction.field]
  : record[correction.field]);

const writeField = (record, correction, value) => {
  if (correction.scope === 'stats') record.stats[correction.field] = value;
  else record[correction.field] = value;
};

const newOverride = record => ({
  sourcePath: record.source.currentPath,
  sourceFilename: baseName(record.source.currentPath),
  comparisons: {},
  replaceComparisons: false,
  evidence: [],
  weaponName: record.weaponName,
  attachmentType: record.attachmentType,
  attachmentName: record.attachmentName,
  updates: {},
});

const getOverride = record => {
  const key = sourceKey(record.source.currentPath);
  const matches = ledger.overrides.filter(entry => sourceKey(entry.sourcePath) === key);
  if (matches.length > 1) throw new Error(`Expected at most one override for ${record.source.currentPath}, found ${matches.length}`);
  if (matches.length === 1) {
    const entry = matches[0];
    if (entry.weaponName !== record.weaponName
      || entry.attachmentType !== record.attachmentType
      || entry.attachmentName !== record.attachmentName) {
      throw new Error(`Override identity mismatch for ${record.source.currentPath}`);
    }
    return { entry, added: false };
  }

  const sameWeaponType = ledger.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === record.weaponName && entry.attachmentType === record.attachmentType);
  const sameWeapon = ledger.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === record.weaponName);
  const anchor = sameWeaponType.at(-1) ?? sameWeapon.at(-1);
  const entry = newOverride(record);
  if (anchor) ledger.overrides.splice(anchor.index + 1, 0, entry);
  else ledger.overrides.push(entry);
  return { entry, added: true };
};

assertUniqueSourcePaths();

const receipt = [];
let reviewChanges = 0;
let ledgerEntriesAdded = 0;
let ledgerUpdates = 0;
let evidenceAdded = 0;

for (const correction of corrections) {
  const record = findRecord(correction);
  const current = readField(record, correction);
  let reviewChanged = false;
  if (current === correction.after) {
    // Already corrected: preserve idempotence while still checking the pinned target.
  } else if (current === correction.before) {
    writeField(record, correction, correction.after);
    reviewChanged = true;
    reviewChanges += 1;
  } else {
    throw new Error(`${correction.weaponName}|${correction.attachmentName}|${correction.field}: expected ${correction.before} or ${correction.after}, found ${current}`);
  }

  const { entry, added } = getOverride(record);
  if (added) ledgerEntriesAdded += 1;
  entry.updates ??= {};
  const priorLedgerValue = entry.updates[correction.field];
  if (priorLedgerValue !== correction.after) {
    entry.updates[correction.field] = correction.after;
    ledgerUpdates += 1;
  }

  const expectedEvidence = {
    kind: 'direct-original-screenshot-corpus-transcription-correction',
    source: record.source.currentPath,
    field: correction.field,
    before: correction.before,
    value: correction.after,
    reviewDate: REVIEW_DATE,
    reason: correction.reason,
  };
  entry.evidence ??= [];
  const matchingEvidence = entry.evidence.filter(item => item.kind === expectedEvidence.kind
    && item.field === expectedEvidence.field && item.reviewDate === expectedEvidence.reviewDate);
  if (matchingEvidence.length > 1) throw new Error(`Duplicate receipt evidence for ${record.source.currentPath}`);
  if (matchingEvidence.length === 0) {
    entry.evidence.push(expectedEvidence);
    evidenceAdded += 1;
  } else if (JSON.stringify(matchingEvidence[0]) !== JSON.stringify(expectedEvidence)) {
    throw new Error(`Receipt evidence mismatch for ${record.source.currentPath}`);
  }

  receipt.push({
    weaponName: correction.weaponName,
    attachmentName: correction.attachmentName,
    field: correction.field,
    before: correction.before,
    after: correction.after,
    reviewChanged,
    ledgerEntryAdded: added,
  });
}

const noOp = reviewChanges === 0 && ledgerEntriesAdded === 0 && ledgerUpdates === 0 && evidenceAdded === 0;
if (!noOp) {
  writeJson(REVIEW, review);
  writeJson(LEDGER, ledger);
}

console.log(JSON.stringify({
  kind: 'sor300sc-subtype-and-m44-extended-ads-correction-receipt',
  reviewDate: REVIEW_DATE,
  noOp,
  reviewChanges,
  ledgerEntriesAdded,
  ledgerUpdates,
  evidenceAdded,
  corrections: receipt,
}, null, 2));
