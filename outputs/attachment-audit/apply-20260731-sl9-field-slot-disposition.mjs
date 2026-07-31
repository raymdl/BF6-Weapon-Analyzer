// Adds the post-recapture §8.3 disposition for the 24 SL9 detailed-page
// findings. The values are retained because the detailed screenshots show them
// even for the `None` accessory, so they are screenshot context rather than an
// inferred Laser/Light modifier.

import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const RECEIPT_PATH = path.join(AUDIT_DIR, 'sl9-detailed-recapture-20260731.json');
const DISCOVERY_PATH = path.join(AUDIT_DIR, 'field-slot-discovery-findings.json');
const SUMMARY_PATH = path.join(AUDIT_DIR, 'field-slot-dispositions-20260731.json');
const OUTPUT_PATH = path.join(AUDIT_DIR, 'field-slot-sl9-detailed-disposition-20260731.json');
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`SL9 field-slot disposition: ${message}`); };
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

if (fs.existsSync(OUTPUT_PATH)) fail(`receipt already exists at ${OUTPUT_PATH}`);
const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
const discovery = JSON.parse(fs.readFileSync(DISCOVERY_PATH, 'utf8'));
const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
const directPaths = new Set(receipt.records.map(item => key(item.canonicalPath)));
const findings = discovery.findings.filter(item => directPaths.has(key(item.sourcePath))
  && ['collateralMultiplier', 'sprintRecoveryMs'].includes(item.field));
if (findings.length !== 24) fail(`expected 24 detailed SL9 findings, found ${findings.length}`);
const groups = [
  { field: 'collateralMultiplier', observed: 0, modalBaseline: 0.57, expectedCount: 12 },
  { field: 'sprintRecoveryMs', observed: 167, modalBaseline: 100, expectedCount: 12 },
].map(group => {
  const rows = findings.filter(item => item.field === group.field && item.observed === group.observed && item.modalBaseline === group.modalBaseline);
  if (rows.length !== group.expectedCount || rows.some(item => item.attachmentType !== 'Laser/Light' || item.status !== 'screenshot-confirmed-slot-context-value')) {
    fail(`unexpected detailed SL9 ${group.field} group`);
  }
  return {
    ...group,
    sourcePaths: rows.map(item => item.sourcePath).sort(),
    disposition: 'screenshot-confirmed-slot-context-value',
    rationale: 'Every detailed SL9 Laser/Light capture, including None, displays this value. Preserve the direct record values and do not infer a universal Laser/Light attachment modifier.',
  };
});
if (receipt.fieldSlotDisposition || summary.currentState?.directDetailedSlotContextFindings) fail('detailed SL9 disposition was already applied');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, 'backups', `pre-sl9-detailed-field-slot-disposition-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const file of [RECEIPT_PATH, SUMMARY_PATH]) fs.copyFileSync(file, path.join(backupDir, path.basename(file)));

const result = {
  kind: 'field-by-slot-detailed-recapture-disposition',
  reviewedAt: '2026-07-31',
  sourceReceipt: 'outputs/attachment-audit/sl9-detailed-recapture-20260731.json',
  groups,
  counts: { findings: findings.length, unresolved: 0, contextualValues: findings.length },
};
receipt.fieldSlotDisposition = {
  receipt: 'outputs/attachment-audit/field-slot-sl9-detailed-disposition-20260731.json',
  groups: groups.map(group => ({ field: group.field, value: group.observed, records: group.sourcePaths.length })),
};
summary.currentState = {
  ...summary.currentState,
  directDetailedSlotContextFindings: findings.length,
  unresolvedFieldSlotFindings: 0,
  note: 'The historic compact-panel null disposition remains for provenance; the detailed SL9 recapture also supplies 24 path-scoped context values. Neither fact infers a universal Laser/Light modifier.',
};
write(OUTPUT_PATH, result);
write(RECEIPT_PATH, receipt);
write(SUMMARY_PATH, summary);
console.log('SL9 detailed field-slot disposition saved (24 screenshot-confirmed context values; 0 unresolved findings).');
