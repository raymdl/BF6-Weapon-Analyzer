import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const register = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'sweep-reviewed-exceptions-20260731.json'), 'utf8'));
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`sweep reviewed-exception verification: ${message}`); };
if (register.kind !== 'sweep-reviewed-exception-register' || register.exceptions?.length !== 6) fail('register must contain exactly six reviewed exceptions');
for (const item of register.exceptions) {
  const rows = review.records.filter(row => key(row.source?.currentPath) === key(item.sourcePath));
  if (rows.length !== 1 || !fs.existsSync(item.sourcePath)) fail(`missing direct screenshot source ${item.sourcePath}`);
  const row = rows[0];
  if (row.weaponName !== item.weaponName || row.attachmentType !== item.attachmentType || row.attachmentName !== item.attachmentName || row.stats?.[item.field] !== item.expectedValue) fail(`saved exception mismatch for ${item.sourcePath}`);
}
const checks = register.exceptions.reduce((acc, item) => { acc[item.check] = (acc[item.check] || 0) + 1; return acc; }, {});
if (checks['recoil-ladder'] !== 4 || checks['off-tier-table'] !== 2) fail('unexpected reviewed-exception check distribution');
console.log('Sweep reviewed-exception verification passed (4 recoil-ladder and 2 ADS-move tier exceptions).');
