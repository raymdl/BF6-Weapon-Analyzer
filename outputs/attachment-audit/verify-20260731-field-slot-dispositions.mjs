import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'manual-review-overrides.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'field-slot-dispositions-20260731.json'), 'utf8'));
const discovery = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'field-slot-discovery-findings.json'), 'utf8'));
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`field-slot disposition verification: ${message}`); };
if (summary.corrections.length !== 79) fail(`expected 79 corrections, found ${summary.corrections.length}`);
if (summary.legitimateEffects.length !== 22) fail(`expected 22 legitimate effects, found ${summary.legitimateEffects.length}`);
if (summary.counts.screenshotCorrections !== 55 || summary.counts.compactPanelNulls !== 24) fail('unexpected correction/null count split');
for (const item of summary.corrections) {
  const row = review.records.find(record => key(record.source?.currentPath) === key(item.sourcePath));
  const expected = item.superseded ? item.superseded.currentValue : item.after;
  if (!row || row.stats?.[item.field] !== expected) fail(`saved value mismatch for ${item.sourcePath} ${item.field}`);
  const override = manual.overrides.find(entry => key(entry.sourcePath) === key(item.sourcePath));
  if (!override || !Object.prototype.hasOwnProperty.call(override.updates || {}, item.field) || override.updates[item.field] !== expected) {
    fail(`missing durable override for ${item.sourcePath} ${item.field}`);
  }
  if (item.superseded) {
    if (item.after !== null || row.statFieldReasons?.[item.field]) fail(`superseded compact null was not cleanly replaced for ${item.sourcePath} ${item.field}`);
  } else if (item.after === null && !row.statFieldReasons?.[item.field]) {
    fail(`missing field-specific null reason for ${item.sourcePath} ${item.field}`);
  }
}
for (const item of summary.legitimateEffects) {
  const row = review.records.find(record => key(record.source?.currentPath) === key(item.sourcePath));
  if (!row || row.stats?.[item.field] !== item.observed) fail(`legitimate effect was altered: ${item.sourcePath} ${item.field}`);
}
if (discovery.unresolvedCount !== 0) fail(`field-slot discovery still has ${discovery.unresolvedCount} unresolved finding(s)`);
const contexts = discovery.findings.filter(item => item.status === 'screenshot-confirmed-slot-context-value');
if (contexts.length !== 24 || contexts.filter(item => item.field === 'collateralMultiplier').length !== 12 || contexts.filter(item => item.field === 'sprintRecoveryMs').length !== 12) {
  fail('expected 24 path-scoped SL9 detailed-capture context dispositions');
}
console.log('Field-slot disposition verification passed (55 active corrections, 24 superseded compact nulls, 22 legitimate effects, 24 reviewed SL9 context values).');
