// Re-point the dead capture paths inside override-ledger evidence blocks.
//
// Evidence blocks record which screenshot backed a correction, under either a `source` or a
// `sourcePath` key depending on which pass wrote them. The canonical-order renumbering left 744 of
// them naming files that no longer exist — the same drift that orphaned the ledger keys, one layer
// down. These are inert (nothing matches on them) but they are wrong, and a reviewer following one
// lands on nothing.
//
// Only references that resolve to exactly one record by prefix-stripped filename are repaired.
// The rest are left alone on purpose: 458 are ambiguous, and 55 name captures that genuinely no
// longer exist — raw `Battlefield 6 Screenshot ...` originals and `_duplicate-2` files that were
// removed. A historical path to a capture that is gone is history, not drift.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const REVIEW = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'outputs', 'attachment-audit', 'manual-review-overrides.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const suffixOf = (name) => (name ?? '').replace(/^\d+_/, '').toLowerCase();

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
const reviewBefore = fs.readFileSync(REVIEW, 'utf8');
const entryCountBefore = ledger.overrides.length;
const updatesBefore = JSON.stringify(ledger.overrides.map((e) => e.updates ?? {}));
const keysBefore = JSON.stringify(ledger.overrides.map((e) => e.sourcePath));

const bySuffix = new Map();
for (const record of review.records) {
  const key = suffixOf(path.basename(record.source.currentPath));
  if (!bySuffix.has(key)) bySuffix.set(key, []);
  bySuffix.get(key).push(record);
}

let repaired = 0;
const deferred = { ambiguous: 0, unresolvable: 0 };

for (const entry of ledger.overrides) {
  for (const evidence of entry.evidence ?? []) {
    for (const key of ['source', 'sourcePath']) {
      const value = evidence[key];
      if (typeof value !== 'string' || !value.endsWith('.png')) continue;
      if (fs.existsSync(value)) continue;
      const matches = bySuffix.get(suffixOf(path.basename(value))) ?? [];
      if (matches.length === 0) { deferred.unresolvable += 1; continue; }
      if (matches.length > 1) { deferred.ambiguous += 1; continue; }
      evidence[key] = matches[0].source.currentPath;
      repaired += 1;
    }
  }
}

if (ledger.overrides.length !== entryCountBefore) throw new Error('entry count changed');
if (JSON.stringify(ledger.overrides.map((e) => e.updates ?? {})) !== updatesBefore) {
  throw new Error('updates content changed');
}
if (JSON.stringify(ledger.overrides.map((e) => e.sourcePath)) !== keysBefore) {
  throw new Error('ledger keys changed');
}
if (fs.readFileSync(REVIEW, 'utf8') !== reviewBefore) throw new Error('review JSON was modified');

writeJson(LEDGER, ledger);

let dead = 0;
for (const entry of ledger.overrides) {
  for (const evidence of entry.evidence ?? []) {
    for (const key of ['source', 'sourcePath']) {
      const value = evidence[key];
      if (typeof value === 'string' && value.endsWith('.png') && !fs.existsSync(value)) dead += 1;
    }
  }
}

console.log(JSON.stringify({ repaired, deferred, deadReferencesRemaining: dead, noOp: repaired === 0 }, null, 2));
