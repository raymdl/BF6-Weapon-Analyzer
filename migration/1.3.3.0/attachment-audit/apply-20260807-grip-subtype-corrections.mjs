/**
 * Correct four grip subtypes that disagree with the card they were read from.
 *
 * Subtype is whatever the attachment card says, so a name that carries one subtype on 30-odd
 * weapons and a different one on a single weapon is a misread. Each correction below was
 * checked against the card row in its own capture:
 *
 *   L85A3    QD Grip Pod         Angled    -> Grip Pod   (49_L85A3_Grip_QD_Grip_Pod.png)
 *   L85A3    Low-Profile Stubby  Vertical  -> Stubby     (42_L85A3_Grip_Low-Profile_Stubby.png)
 *   L115     Classic Grip Pod    Range Pen -> Grip Pod   (31_L115_Grip_Classic_Grip_Pod.png)
 *   M2010    Classic Grip Pod    Range Pen -> Grip Pod   (32_M2010 ESR_Grip_Classic_Grip_Pod.png)
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const corrections = [
  { weapon: 'L85A3', attachment: 'QD Grip Pod', from: 'Angled', to: 'Grip Pod' },
  { weapon: 'L85A3', attachment: 'Low-Profile Stubby', from: 'Vertical', to: 'Stubby' },
  { weapon: 'L115', attachment: 'Classic Grip Pod', from: 'Range Pen', to: 'Grip Pod' },
  { weapon: 'M2010 ESR', attachment: 'Classic Grip Pod', from: 'Range Pen', to: 'Grip Pod' },
];

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
let applied = 0;

for (const correction of corrections) {
  const records = document.records.filter(record =>
    record.weaponName === correction.weapon
    && record.attachmentType === 'Grip'
    && record.attachmentName === correction.attachment);
  if (records.length !== 1) throw new Error(`expected one ${correction.weapon} ${correction.attachment}, found ${records.length}`);
  const [record] = records;
  if (record.attachmentSubtype !== correction.from) {
    console.log(`skipped ${correction.weapon} ${correction.attachment}: already "${record.attachmentSubtype}"`);
    continue;
  }
  record.attachmentSubtype = correction.to;
  record.notes = [...(record.notes ?? []),
    `Attachment subtype corrected from "${correction.from}" to "${correction.to}" against the card in ${record.source?.proposedFilename}.`];
  applied += 1;
}

document.generatedAt = new Date().toISOString();
fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);
console.log({ applied });
