import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'manual-review-overrides.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'isolated-zero-recapture-summary-20260731.json'), 'utf8'));
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`isolated zero verification: ${message}`); };
if (summary.changes.length !== 5) fail(`expected five changes in the summary, found ${summary.changes.length}`);
for (const item of summary.changes) {
  const row = review.records.find(record => key(record.source?.currentPath) === key(item.sourcePath));
  if (!row || row.stats?.sprintRecoveryMs !== 200) fail(`missing saved 200ms value for ${item.sourcePath}`);
  const override = manual.overrides.find(entry => key(entry.sourcePath) === key(item.sourcePath));
  if (!override || override.updates?.sprintRecoveryMs !== 200) fail(`missing durable 200ms override for ${item.sourcePath}`);
}
console.log('Isolated zero-recapture verification passed (5 source screenshots, 5 saved 200ms values).');
