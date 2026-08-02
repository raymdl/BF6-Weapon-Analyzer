// Keeps top-level review metadata consistent with the canonical record array
// after the intentional M1014 JSON-only dedupe and SL9 recapture updates.

import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const receiptPath = path.join(AUDIT_DIR, 'audit-metadata-reconciliation-20260731.json');
const fail = message => { throw new Error('audit metadata reconciliation: ' + message); };
if (fs.existsSync(receiptPath)) fail('receipt already exists: ' + receiptPath);
const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const recordCount = review.records.length;
const attachmentDetailCount = review.records.filter(row => row.attachmentType !== 'Overview').length;
const mappingReviewedCount = review.records.filter(row => row.mappingReviewStatus === 'visually-checked').length;
const weapons = new Set(review.records.map(row => row.weaponName));
if (recordCount !== 3177 || attachmentDetailCount !== 3115 || weapons.size !== 62) {
  fail('unexpected canonical inventory: records=' + recordCount + ', details=' + attachmentDetailCount + ', weapons=' + weapons.size);
}
const before = {
  recordCount: review.recordCount,
  attachmentDetailCount: review.attachmentDetailCount,
  mappingReviewedCount: review.mappingReviewedCount,
};
const after = { recordCount, attachmentDetailCount, mappingReviewedCount };
const backupDir = path.join(AUDIT_DIR, 'backups', 'pre-audit-metadata-reconciliation-20260731');
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(REVIEW_PATH, path.join(backupDir, path.basename(REVIEW_PATH)));
review.recordCount = recordCount;
review.attachmentDetailCount = attachmentDetailCount;
review.mappingReviewedCount = mappingReviewedCount;
review.generatedAt = new Date().toISOString();
fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n');
fs.writeFileSync(receiptPath, JSON.stringify({
  kind: 'canonical-audit-metadata-reconciliation',
  reviewedAt: '2026-07-31',
  reason: 'M1014 duplicate canonical JSON records were intentionally excluded; record-count metadata must track the current canonical array rather than the pre-dedupe inventory.',
  before,
  after,
  backupDirectory: backupDir,
}, null, 2) + '\n');
console.log('Audit metadata reconciled: records=' + recordCount + ', detail=' + attachmentDetailCount + ', visually reviewed=' + mappingReviewedCount + '.');
