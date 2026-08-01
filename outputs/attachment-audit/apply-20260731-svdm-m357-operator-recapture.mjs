// Records the operator's first-party in-game recapture of the two reload panels
// whose earlier corpus values were OCR base-reads. The operator capture is the
// evidence for the tier-1 classifications; the model is not used to rewrite it.

import fs from 'node:fs';
import path from 'node:path';

const auditDir = path.resolve('outputs/attachment-audit');
const reviewPath = path.join(auditDir, 'attachment-screenshot-review.json');
const reviewDate = '2026-07-31';
const targets = [
  {
    weaponName: 'SVDM',
    attachmentName: '5Rnd Magazine',
    priorCorpusReloadSeconds: 2.5,
    capturedReloadSeconds: 2.212,
    source: 'DMR/SVDM/47_SVDM_Magazine_5Rnd_Magazine.png',
  },
  {
    weaponName: 'M357 Trait',
    attachmentName: '8Rnd Moon Clip',
    priorCorpusReloadSeconds: 3.067,
    capturedReloadSeconds: 2.714,
    source: 'Sidearm/M357 Trait/11_M357 Trait_Magazine_8RND_MOON_CLIP.png',
  },
];

const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const changes = [];

for (const target of targets) {
  const rows = review.records.filter(row => row.weaponName === target.weaponName
    && row.attachmentType === 'Magazine'
    && row.attachmentName === target.attachmentName);
  if (rows.length !== 1) throw new Error(`Expected one row for ${target.weaponName}/${target.attachmentName}`);
  const row = rows[0];
  const before = row.stats.reloadTimeSeconds;
  if (![target.priorCorpusReloadSeconds, target.capturedReloadSeconds].includes(before)) {
    throw new Error(`${target.weaponName}/${target.attachmentName}: unexpected current reload value ${before}`);
  }

  row.stats.reloadTimeSeconds = target.capturedReloadSeconds;
  const note = `Operator in-game recapture on ${reviewDate} replaces the prior OCR base-read of `
    + `${target.priorCorpusReloadSeconds.toFixed(3)} s; the selected panel reads `
    + `${target.capturedReloadSeconds.toFixed(3)} s with a green downward reload-change arrow.`;
  row.notes = [...(row.notes ?? []).filter(existing => existing !== note), note];
  changes.push({
    weaponName: target.weaponName,
    attachmentName: target.attachmentName,
    source: target.source,
    priorCorpusReloadSeconds: target.priorCorpusReloadSeconds,
    capturedReloadSeconds: target.capturedReloadSeconds,
    reviewDate,
    reloadChangeArrow: 'green downward',
  });
}

fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(JSON.stringify({ kind: 'operator-in-game-recapture', changes }, null, 2));
