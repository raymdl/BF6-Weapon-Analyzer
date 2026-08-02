import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const receipt = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'audit-metadata-reconciliation-20260731.json'), 'utf8'));
const expected = {
  recordCount: review.records.length,
  attachmentDetailCount: review.records.filter(row => row.attachmentType !== 'Overview').length,
  mappingReviewedCount: review.records.filter(row => row.mappingReviewStatus === 'visually-checked').length,
};
if (Object.entries(expected).some(([field, value]) => review[field] !== value || receipt.after?.[field] !== value)) {
  throw new Error('audit metadata verification: top-level metadata does not match canonical records');
}
console.log('Audit metadata verification passed (' + expected.recordCount + ' records, ' + expected.attachmentDetailCount + ' detail rows).');
