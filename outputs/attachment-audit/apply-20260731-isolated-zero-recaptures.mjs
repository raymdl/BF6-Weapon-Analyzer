// Corrects the five isolated §8.1 sprint-recovery zero reads after direct
// review of their original screenshots. This is intentionally path-bound: it
// does not infer a value from the surrounding weapon rows.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const MANUAL_PATH = path.join(AUDIT_DIR, 'manual-review-overrides.json');
const SUMMARY_PATH = path.join(AUDIT_DIR, 'isolated-zero-recapture-summary-20260731.json');
const REVIEW_DATE = '2026-07-31';
const TARGETS = [
  ['M2010 ESR', 'Magazine', '5Rnd Fast Mag', 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Sniper Rifle\\M2010 ESR\\34_M2010 ESR_Magazine_5RND_FAST_MAG.png'],
  ['M2010 ESR', 'Magazine', '8Rnd Magazine', 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Sniper Rifle\\M2010 ESR\\35_M2010 ESR_Magazine_8RND_MAGAZINE.png'],
  ['Mini Scout', 'Grip', 'Full Angled', 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Sniper Rifle\\Mini Scout\\31_Mini Scout_Grip_Full_Angled.png'],
  ['Mini Scout', 'Magazine', '15Rnd Fast Mag', 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Sniper Rifle\\Mini Scout\\38_Mini Scout_Magazine_15Rnd_Fast_Mag.png'],
  ['Mini Scout', 'Magazine', '20Rnd Fast Mag', 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Sniper Rifle\\Mini Scout\\40_Mini Scout_Magazine_20Rnd_Fast_Mag.png'],
];

const key = value => path.resolve(value || '').toLowerCase();
const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
manual.overrides ||= [];
const changes = [];

function fail(message) { throw new Error(`isolated-zero-recaptures: ${message}`); }
function getOverride(row) {
  let item = manual.overrides.find(entry => key(entry.sourcePath) === key(row.source?.currentPath));
  if (!item) {
    item = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: row.source.currentPath,
      sourceFilename: path.basename(row.source.currentPath),
      updates: {}, comparisons: {}, replaceComparisons: false,
      evidence: [], reviewStatus: null, mappingReviewStatus: null,
    };
    manual.overrides.push(item);
  }
  item.updates ||= {};
  item.evidence ||= [];
  return item;
}

for (const [weaponName, attachmentType, attachmentName, sourcePath] of TARGETS) {
  const rows = review.records.filter(row => key(row.source?.currentPath) === key(sourcePath));
  if (rows.length !== 1) fail(`${sourcePath}: expected one record, found ${rows.length}`);
  const row = rows[0];
  if (row.weaponName !== weaponName || row.attachmentType !== attachmentType || row.attachmentName !== attachmentName) {
    fail(`${sourcePath}: canonical identity no longer matches the reviewed screenshot`);
  }
  const before = row.stats?.sprintRecoveryMs;
  if (![0, 200].includes(before)) fail(`${sourcePath}: expected sprintRecoveryMs 0 or 200, found ${before}`);
  row.stats.sprintRecoveryMs = 200;
  const override = getOverride(row);
  override.updates.sprintRecoveryMs = 200;
  if (!override.evidence.some(item => item.kind === 'direct-original-screenshot-field-recapture'
    && item.field === 'sprintRecoveryMs' && item.reviewDate === REVIEW_DATE)) {
    override.evidence.push({
      kind: 'direct-original-screenshot-field-recapture',
      source: sourcePath,
      field: 'sprintRecoveryMs',
      value: 200,
      reviewDate: REVIEW_DATE,
    });
  }
  changes.push({ weaponName, attachmentType, attachmentName, sourcePath, field: 'sprintRecoveryMs', before, after: 200 });
}

if (changes.length !== 5) fail(`expected five reviewed zero reads, found ${changes.length}`);
const hasWrite = changes.some(change => change.before !== change.after);
if (hasWrite) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const backupDir = path.join(AUDIT_DIR, `backups/pre-isolated-zero-recaptures-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(REVIEW_PATH, path.join(backupDir, path.basename(REVIEW_PATH)));
  fs.copyFileSync(MANUAL_PATH, path.join(backupDir, path.basename(MANUAL_PATH)));
  if (fs.existsSync(SUMMARY_PATH)) fs.copyFileSync(SUMMARY_PATH, path.join(backupDir, path.basename(SUMMARY_PATH)));
}
fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`);
fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify({
  kind: 'isolated-zero-screenshot-recapture',
  reviewedAt: REVIEW_DATE,
  sourcePolicy: 'Each value was read directly from its named original screenshot.',
  changes,
}, null, 2)}\n`);
console.log(`Isolated screenshot corrections saved: ${changes.filter(change => change.before !== change.after).length}; already correct: ${changes.filter(change => change.before === change.after).length}`);
