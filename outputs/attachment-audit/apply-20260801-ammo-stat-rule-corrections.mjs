// Apply the by-class ammo stat corrections found by scripts/validate-ammo-stat-rules.py, plus
// two SVK-8.6 ammo costs the user confirmed in game.
//
// The three stats here — headshot multiplier, collateral multiplier and opponent health regen
// delay — are set by weapon class and equipped ammunition, so a record that disagrees with its
// class rule is transcribed wrong. Five signatures account for all of them: the EA-acknowledged
// EF88/BROD 3 stat-screen bug, a collateral multiplier of 0 (never valid), values that read
// exactly 1 from the arrow-glyph misparse, regen delay bleeding between adjacent captures, and
// individual records the user checked in game.
//
// Note for EF88 and BROD 3: the corrected headshot value deliberately disagrees with what the
// screenshot shows. EA has confirmed the stat screen understates it and the in-game value is the
// class value, so the capture is not authoritative for that one field on those two weapons.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const REVIEW = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'outputs', 'attachment-audit', 'manual-review-overrides.json');
const VIOLATIONS = path.join(ROOT, 'outputs', 'attachment-audit', 'ammo-rule-violations-20260801.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

// Confirmed in game; unrelated to the stat rules, but part of the same correction pass.
const COST_FIXES = [
  { weapon: 'SVK-8.6', attachmentName: 'Match Grade', from: 20, to: 10 },
  { weapon: 'SVK-8.6', attachmentName: 'Hollow Point', from: 15, to: 20 },
];

// Three snipers took both the subtype and the cost of their Match Grade round from the adjacent
// PENETRATION tile instead of the viewed LONG-RANGE one. All three screenshots show LONG-RANGE at
// 10 with PENETRATION at 5, and the panel reads "Long-range, standard-penetration ammunition".
// This aligns them with the five Match Grade records already filed under Long-range at cost 10.
const TILE_FIXES = [
  { weapon: 'L115', attachmentName: 'Match Grade', subtypeFrom: 'Range Pen', subtypeTo: 'Long-range', costFrom: 5, costTo: 10 },
  { weapon: 'M2010 ESR', attachmentName: 'Match Grade', subtypeFrom: 'Range Pen', subtypeTo: 'Long-range', costFrom: 5, costTo: 10 },
  { weapon: 'SV-98', attachmentName: 'Match Grade', subtypeFrom: 'Range Pen', subtypeTo: 'Long-range', costFrom: 5, costTo: 10 },
];

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
const violations = readJson(VIOLATIONS);

const recordByPath = new Map(review.records.map((row) => [row.source.currentPath, row]));
const entryByPath = new Map(ledger.overrides.map((entry) => [entry.sourcePath, entry]));
const ledgerCountBefore = ledger.overrides.length;
const recordCountBefore = review.records.length;

function mirror(record, field, value) {
  let entry = entryByPath.get(record.source.currentPath);
  if (!entry) {
    entry = {
      sourcePath: record.source.currentPath,
      sourceFilename: path.basename(record.source.currentPath),
      comparisons: {},
      replaceComparisons: false,
      evidence: [],
      weaponName: record.weaponName,
      attachmentType: record.attachmentType,
      attachmentName: record.attachmentName,
      updates: {},
    };
    // keep the file grouped by weapon rather than appending at the end
    const last = ledger.overrides.map((e) => e.weaponName).lastIndexOf(record.weaponName);
    ledger.overrides.splice(last >= 0 ? last + 1 : ledger.overrides.length, 0, entry);
    entryByPath.set(entry.sourcePath, entry);
  }
  entry.updates ??= {};
  entry.updates[field] = value;
  entry.evidence ??= [];
  const evidence = {
    kind: 'by-class-ammo-stat-rule-correction',
    source: record.source.currentPath,
    reviewDate: '2026-08-01',
  };
  if (!entry.evidence.some((item) => JSON.stringify(item) === JSON.stringify(evidence))) {
    entry.evidence.push(evidence);
  }
}

let applied = 0;
let alreadyCorrect = 0;

for (const item of violations) {
  const record = recordByPath.get(item.screenshot);
  if (!record) throw new Error(`no record for ${item.screenshot}`);
  const current = record.stats?.[item.field];
  if (current === item.ruleExpects) { alreadyCorrect += 1; mirror(record, item.field, item.ruleExpects); continue; }
  if (current !== item.recordHolds) {
    throw new Error(`${record.weaponName} ${item.field}: expected ${item.recordHolds}, found ${current}`);
  }
  record.stats[item.field] = item.ruleExpects;
  mirror(record, item.field, item.ruleExpects);
  applied += 1;
}

let costsApplied = 0;
for (const fix of COST_FIXES) {
  const matches = review.records.filter((row) => row.weaponName === fix.weapon
    && row.attachmentType === 'Ammo' && row.attachmentName === fix.attachmentName);
  if (matches.length !== 1) throw new Error(`${fix.weapon} ${fix.attachmentName}: ${matches.length} records`);
  const record = matches[0];
  if (record.attachmentCost === fix.to) { mirror(record, 'attachmentCost', fix.to); continue; }
  if (record.attachmentCost !== fix.from) {
    throw new Error(`${fix.weapon} ${fix.attachmentName}: expected ${fix.from}, found ${record.attachmentCost}`);
  }
  record.attachmentCost = fix.to;
  mirror(record, 'attachmentCost', fix.to);
  costsApplied += 1;
}

let tileFixesApplied = 0;
for (const fix of TILE_FIXES) {
  const matches = review.records.filter((row) => row.weaponName === fix.weapon
    && row.attachmentType === 'Ammo' && row.attachmentName === fix.attachmentName);
  if (matches.length !== 1) throw new Error(`${fix.weapon} ${fix.attachmentName}: ${matches.length} records`);
  const record = matches[0];
  const done = record.attachmentSubtype === fix.subtypeTo && record.attachmentCost === fix.costTo;
  if (!done) {
    if (record.attachmentSubtype !== fix.subtypeFrom || record.attachmentCost !== fix.costFrom) {
      throw new Error(`${fix.weapon} ${fix.attachmentName}: expected ${fix.subtypeFrom}/${fix.costFrom}, `
        + `found ${record.attachmentSubtype}/${record.attachmentCost}`);
    }
    record.attachmentSubtype = fix.subtypeTo;
    record.attachmentCost = fix.costTo;
    tileFixesApplied += 1;
  }
  mirror(record, 'attachmentSubtype', fix.subtypeTo);
  mirror(record, 'attachmentCost', fix.costTo);
}

if (review.records.length !== recordCountBefore) throw new Error('record count changed');
const paths = ledger.overrides.map((entry) => entry.sourcePath);
if (new Set(paths).size !== paths.length) throw new Error('duplicate sourcePath produced');
for (const entry of ledger.overrides) {
  if (entry.updates && Object.keys(entry.updates).length === 0) throw new Error(`empty updates: ${entry.sourceFilename}`);
}

writeJson(REVIEW, review);
writeJson(LEDGER, ledger);

console.log(JSON.stringify({
  statsApplied: applied,
  statsAlreadyCorrect: alreadyCorrect,
  costsApplied,
  tileFixesApplied,
  ledgerEntries: `${ledgerCountBefore} -> ${ledger.overrides.length}`,
  noOp: applied === 0 && costsApplied === 0 && tileFixesApplied === 0,
}, null, 2));
