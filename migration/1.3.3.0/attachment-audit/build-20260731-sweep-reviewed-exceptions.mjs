// Directly reviewed tail exceptions. These are exact source-path exceptions,
// not widened tolerances or general exemptions for a weapon/slot.

import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const OUTPUT_PATH = path.join(AUDIT_DIR, 'sweep-reviewed-exceptions-20260731.json');
const ROOT = path.resolve();
const fail = message => { throw new Error(`sweep exception register: ${message}`); };
const key = value => path.resolve(value || '').toLowerCase();
const p = (...parts) => path.join(ROOT, ...parts);

const SPECS = [
  { check: 'recoil-ladder', field: 'recoilAmountDegrees', weaponName: 'DB-12', attachmentType: 'Grip', attachmentName: 'Ribbed Vertical', expectedValue: 2.3, sourcePath: p('Weapon Attachments', 'Shotgun', 'DB-12', '22_DB-12_Grip_Ribbed_Vertical.png'), rationale: 'Direct source glyph reads 2.3 degrees; this remains off the generic 0.94 ladder.' },
  { check: 'recoil-ladder', field: 'recoilAmountDegrees', weaponName: 'DB-12', attachmentType: 'Grip', attachmentName: 'Canted Stubby', expectedValue: 2.3, sourcePath: p('Weapon Attachments', 'Shotgun', 'DB-12', '27_DB-12_Grip_Canted_Stubby.png'), rationale: 'Direct source glyph reads 2.3 degrees; this remains off the generic 0.94 ladder.' },
  { check: 'recoil-ladder', field: 'recoilAmountDegrees', weaponName: 'M87A1', attachmentType: 'Grip', attachmentName: 'Classic Vertical', expectedValue: 2.7, sourcePath: p('Weapon Attachments', 'Shotgun', 'M87A1', '30_M87A1_Grip_Classic_Vertical.png'), rationale: 'Direct source glyph reads 2.7 degrees; this remains off the generic 0.94 ladder.' },
  { check: 'recoil-ladder', field: 'recoilAmountDegrees', weaponName: 'M87A1', attachmentType: 'Grip', attachmentName: 'Low-Profile Stubby', expectedValue: 2.7, sourcePath: p('Weapon Attachments', 'Shotgun', 'M87A1', '31_M87A1_Grip_Low-Profile_Stubby.png'), rationale: 'Direct source glyph reads 2.7 degrees; this remains off the generic 0.94 ladder.' },
  { check: 'off-tier-table', field: 'adsMoveSpeedMultiplier', weaponName: 'CZ3A1', attachmentType: 'Magazine', attachmentName: '20Rnd Fast Mag', expectedValue: 1, sourcePath: p('Weapon Attachments', 'SMG', 'CZ3A1', '40_CZ3A1_Magazine_20Rnd_Fast_Mag.png'), rationale: 'Direct source panel reads x1.00, a reviewed exception to the shared ADS-move tier table.' },
  { check: 'off-tier-table', field: 'adsMoveSpeedMultiplier', weaponName: 'PP-19', attachmentType: 'Magazine', attachmentName: '20Rnd Fast Mag', expectedValue: 1, sourcePath: p('Weapon Attachments', 'SMG', 'PP-19', '39_PP-19_Magazine_20Rnd_Fast_Mag.png'), rationale: 'Direct source panel reads x1.00, a reviewed exception to the shared ADS-move tier table.' },
];

if (fs.existsSync(OUTPUT_PATH)) fail(`refusing to overwrite existing register ${OUTPUT_PATH}`);
const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
for (const item of SPECS) {
  if (!fs.existsSync(item.sourcePath)) fail(`source screenshot is missing: ${item.sourcePath}`);
  const rows = review.records.filter(row => key(row.source?.currentPath) === key(item.sourcePath));
  if (rows.length !== 1) fail(`expected one review row for ${item.sourcePath}, found ${rows.length}`);
  const row = rows[0];
  if (row.weaponName !== item.weaponName || row.attachmentType !== item.attachmentType || row.attachmentName !== item.attachmentName || row.stats?.[item.field] !== item.expectedValue) fail(`saved row does not match direct exception specification for ${item.sourcePath}`);
}
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
  kind: 'sweep-reviewed-exception-register',
  reviewedAt: '2026-07-31',
  policy: 'Each exception is keyed by direct screenshot source path, field, and exact value. Any mismatch or unregistered counterpart remains an error.',
  exceptions: SPECS,
  counts: { exceptions: SPECS.length, recoilLadder: 4, adsMoveTier: 2 },
}, null, 2)}\n`);
console.log('Sweep reviewed-exception register saved: 6 direct screenshot rows.');
