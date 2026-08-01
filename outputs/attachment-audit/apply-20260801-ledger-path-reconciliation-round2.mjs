// Round 2 of the override-ledger path reconciliation started in
// apply-20260801-ledger-path-reconciliation.mjs.
//
// Round 1 re-keyed the orphans that resolved by (weaponName, attachmentType, attachmentName).
// The 671 it deferred mostly failed that lookup because the entry's own metadata is stale or
// null, not because the entry is unidentifiable: the screenshot filename survived the canonical
// renumbering intact apart from its leading order prefix. Matching on the prefix-stripped
// filename resolves them. That key was validated against round 1 — on the 1,188 orphans where
// both keys resolve uniquely they agree on 1,187. The single disagreement is EF88 Light/None,
// where the capture was reclassified Light -> Laser so the filename word itself changed; the
// metadata key is right there and this pass leaves it alone.
//
// Re-keying a dead entry makes its updates live again, so this pass re-keys only entries whose
// updates already equal the record. 13 otherwise-eligible orphans are deliberately left dead
// because their updates would regress the record: OCR garbage names, magazine sizes that exceed
// the magazine, a stuck mobility of 50 repeated across unrelated weapons, and a cross-type
// reload time. All were superseded by the 2026-07-28 corpus-wide repairs (section 18.4).

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const REVIEW = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'outputs', 'attachment-audit', 'manual-review-overrides.json');
const REPORT = path.join(ROOT, 'outputs', 'attachment-audit', 'ledger-path-drift-20260801-round2.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const suffixOf = (name) => (name ?? '').replace(/^\d+_/, '').toLowerCase();

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
const reviewBefore = fs.readFileSync(REVIEW, 'utf8');
const entryCountBefore = ledger.overrides.length;
const updatesBefore = ledger.overrides.map((entry) => JSON.stringify(entry.updates ?? {})).sort();

const recordsBySuffix = new Map();
for (const record of review.records) {
  const key = suffixOf(path.basename(record.source.currentPath));
  if (!recordsBySuffix.has(key)) recordsBySuffix.set(key, []);
  recordsBySuffix.get(key).push(record);
}

// A record field may live at the top level or inside stats; an updates value keyed `stats`
// carries a partial stats object and must be compared field by field, not as a whole.
function wouldChangeRecord(entry, record) {
  for (const [field, value] of Object.entries(entry.updates ?? {})) {
    if (field === 'stats' && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [statField, statValue] of Object.entries(value)) {
        if (JSON.stringify(record.stats?.[statField]) !== JSON.stringify(statValue)) return true;
      }
      continue;
    }
    const current = field in record ? record[field] : record.stats?.[field];
    if (JSON.stringify(current) !== JSON.stringify(value)) return true;
  }
  return false;
}

const occupied = new Set(ledger.overrides.map((entry) => entry.sourcePath));
const deferred = [];
const candidates = [];

for (const entry of ledger.overrides) {
  if (fs.existsSync(entry.sourcePath)) continue;
  const defer = (reason, extra = {}) => deferred.push({
    sourceFilename: entry.sourceFilename,
    weaponName: entry.weaponName ?? null,
    attachmentType: entry.attachmentType ?? null,
    attachmentName: entry.attachmentName ?? null,
    reason,
    ...extra,
  });

  const matches = recordsBySuffix.get(suffixOf(entry.sourceFilename)) ?? [];
  if (matches.length === 0) { defer('no-suffix-match'); continue; }
  if (matches.length > 1) { defer('suffix-ambiguous'); continue; }

  const record = matches[0];
  const target = record.source.currentPath;
  if (occupied.has(target)) {
    defer('target-path-occupied', { targetFilename: path.basename(target) });
    continue;
  }
  if (entry.weaponName != null && entry.weaponName !== record.weaponName) {
    defer('weapon-mismatch', { targetFilename: path.basename(target) });
    continue;
  }
  if (wouldChangeRecord(entry, record)) {
    defer('superseded-would-regress-record', { targetFilename: path.basename(target) });
    continue;
  }
  candidates.push({ entry, record, target });
}

// Two dead entries can resolve to the same live record; re-keying both would duplicate the key.
const byTarget = new Map();
for (const item of candidates) {
  if (!byTarget.has(item.target)) byTarget.set(item.target, []);
  byTarget.get(item.target).push(item);
}

let repaired = 0;
for (const [target, items] of byTarget) {
  if (items.length > 1) {
    for (const item of items) {
      deferred.push({
        sourceFilename: item.entry.sourceFilename,
        weaponName: item.entry.weaponName ?? null,
        attachmentType: item.entry.attachmentType ?? null,
        attachmentName: item.entry.attachmentName ?? null,
        reason: 'target-contested-by-multiple-orphans',
        targetFilename: path.basename(target),
        contestedWith: items.filter((other) => other !== item).map((other) => other.entry.sourceFilename),
      });
    }
    continue;
  }
  const { entry } = items[0];
  const previousPath = entry.sourcePath;
  entry.sourcePath = target;
  entry.sourceFilename = path.basename(target);
  for (const evidence of entry.evidence ?? []) {
    if (evidence.source === previousPath) evidence.source = target;
  }
  repaired += 1;
}

if (ledger.overrides.length !== entryCountBefore) throw new Error('entry count changed');
const paths = ledger.overrides.map((entry) => entry.sourcePath);
if (new Set(paths).size !== paths.length) throw new Error('duplicate sourcePath produced');
for (const item of candidates) {
  if (!fs.existsSync(item.entry.sourcePath)) throw new Error(`missing file: ${item.entry.sourcePath}`);
}
const updatesAfter = ledger.overrides.map((entry) => JSON.stringify(entry.updates ?? {})).sort();
if (JSON.stringify(updatesBefore) !== JSON.stringify(updatesAfter)) throw new Error('updates content changed');

writeJson(LEDGER, ledger);
writeJson(REPORT, {
  summary: {
    ledgerEntryCount: ledger.overrides.length,
    repairedThisRound: repaired,
    stillOrphaned: ledger.overrides.filter((entry) => !fs.existsSync(entry.sourcePath)).length,
    byReason: deferred.reduce((acc, item) => ({ ...acc, [item.reason]: (acc[item.reason] ?? 0) + 1 }), {}),
  },
  deferred,
});

if (fs.readFileSync(REVIEW, 'utf8') !== reviewBefore) throw new Error('review JSON was modified');

console.log(JSON.stringify({
  repaired,
  stillOrphaned: ledger.overrides.filter((entry) => !fs.existsSync(entry.sourcePath)).length,
  deferredByReason: deferred.reduce((acc, item) => ({ ...acc, [item.reason]: (acc[item.reason] ?? 0) + 1 }), {}),
  noOp: repaired === 0,
}, null, 2));
