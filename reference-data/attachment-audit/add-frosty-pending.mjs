import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const auditFile = resolve('reference-data/attachment-audit/attachment-screenshot-review.json');
const readJson = path => JSON.parse(readFileSync(resolve(path), 'utf8'));
const audit = readJson('reference-data/attachment-audit/attachment-screenshot-review.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const additions = readJson('reference-data/provenance/new-attachments-2026-09-06.json');
const interdictor = readJson('reference-data/provenance/frosty-interdictor-integration.json');

const slotType = {
  muzzle: 'Muzzle', barrel: 'Barrel', grip: 'Grip', mag: 'Magazine', ammo: 'Ammo',
  ergo: 'Ergonomics', laser: 'Laser', light: 'Light',
};
const weapons = new Map();
for (const record of audit.records) {
  if (!weapons.has(record.weaponName)) {
    const match = record.source.currentPath.replaceAll('\\', '/').match(/Weapon Attachments\/([^/]+)\/([^/]+)\//i);
    if (match) weapons.set(record.weaponName, { weaponClass: match[1], folder: match[2] });
  }
}
weapons.set('Interdictor', { weaponClass: 'Sniper Rifle', folder: 'Interdictor' });

const byId = new Map();
for (const [slot, records] of Object.entries({
  muzzle: attachments.MUZZLES, barrel: attachments.BARRELS, grip: attachments.GRIPS,
  laser: attachments.LASERS, light: attachments.LIGHTS, ergo: attachments.ERGOS, ammo: ammo.AMMO,
})) {
  for (const record of records) byId.set(`${slot}:${record.id}`, record);
}
for (const [weaponId, data] of Object.entries(attachments.WEAPON_MAG)) {
  for (const [id, record] of Object.entries(data.mags)) byId.set(`mag:${weaponId}:${id}`, record);
}

// Keep existing rows and their later review/source work when rerunning additions.
const nextOrder = new Map();
for (const record of audit.records) {
  nextOrder.set(record.weaponName, Math.max(nextOrder.get(record.weaponName) ?? -1, record.source.captureOrder));
}
const known = new Set(audit.records.filter(record => record.frosty)
  .map(record => `${record.weaponName}|${record.frosty.slot}|${record.frosty.siteId}`));
const added = [];

const m433Corrections = new Map([
  ['48_M433_Magazine_20Rnd_Fast_Mag.png', { mobility: 64 }],
  ['49_M433_Magazine_20Rnd_Magazine.png', { mobility: 66 }],
  ['50_M433_Magazine_30Rnd_Fast_Mag.png', { mobility: 50 }],
  ['51_M433_Magazine_36Rnd_Magazine.png', { mobility: 48 }],
  ['52_M433_Magazine_40Rnd_Magazine.png', { mobility: 48 }],
  ['53_M433_Magazine_40Rnd_Fast_Mag.png', { mobility: 46, reloadInAds: false }],
]);
for (const record of audit.records) {
  const correction = record.weaponName === 'M433' ? m433Corrections.get(record.source.proposedFilename) : null;
  if (!correction) continue;
  Object.assign(record.stats, correction);
  const note = 'Values manually rechecked against the saved screenshot on 2026-09-07 after OCR-capture review.';
  if (!record.notes.includes(note)) record.notes.push(note);
}

function labelFor(weaponId, slot, siteId) {
  return byId.get(slot === 'mag' ? `mag:${weaponId}:${siteId}` : `${slot}:${siteId}`)?.name ?? siteId;
}

function append({ weaponName, weaponId, slot, siteId, points, attachmentXml, evidenceFile }) {
  const key = `${weaponName}|${slot}|${siteId}`;
  if (known.has(key)) return;
  const location = weapons.get(weaponName);
  if (!location || !slotType[slot]) throw new Error(`No audit location for ${weaponName}/${slot}/${siteId}`);
  const order = (nextOrder.get(weaponName) ?? -1) + 1;
  nextOrder.set(weaponName, order);
  const filename = `${String(order).padStart(2, '0')}_${location.folder}_${slotType[slot]}_${siteId}_Frosty_pending.png`;
  audit.records.push({
    weaponName,
    attachmentType: slotType[slot],
    attachmentSubtype: null,
    attachmentCost: points,
    attachmentName: labelFor(weaponId, slot, siteId),
    attachmentDescription: null,
    stats: null,
    statComparisons: null,
    source: {
      originalPath: `Frosty 1.4.2.5 export: ${attachmentXml}`,
      originalFilename: '',
      proposedFilename: filename,
      currentPath: `reference-data/attachment-audit/Weapon Attachments/${location.weaponClass}/${location.folder}/pending/${filename}`,
      renameApplied: false,
      captureOrder: order,
      captureTimestamp: null,
      resolution: '',
      rawAttachmentDescriptionOcr: null,
      rawFullScreenOcr: '',
    },
    extractionStatus: 'context-only',
    reviewStatus: 'provisional-review-required',
    mappingReviewStatus: 'ocr-pending',
    reviewer: null,
    reviewDate: null,
    reviewConflicts: [],
    statFieldReasons: null,
    notes: [
      'Frosty-backed availability and point cost only; screenshot capture is still required.',
      'Do not treat this record as a screenshot transcription or promote it to live data.',
    ],
    frosty: {
      sourceVersion: '1.4.2.5', evidenceFile, attachmentXml, slot, siteId,
      status: 'pending-screenshot-capture',
    },
  });
  known.add(key);
  added.push({ weaponName, slot, siteId, attachmentXml });
}

for (const selection of additions.selections) {
  const aliases = { sor556: 'SOR-556 MK2', kts100: 'KTS100 MK8' };
  const weaponName = aliases[selection.weaponId]
    ?? [...weapons.keys()].find(name => name.toLowerCase().replaceAll(/[^a-z0-9]/g, '') === selection.weaponId);
  if (!weaponName) throw new Error(`No screenshot-audit weapon maps to ${selection.weaponId}`);
  append({ ...selection, siteId: selection.attachmentId, weaponName, weaponId: selection.weaponId,
    evidenceFile: 'reference-data/provenance/new-attachments-2026-09-06.json' });
}
for (const selection of interdictor.runtimeIntegration.mappedAttachments) {
  append({ ...selection, weaponName: 'Interdictor', weaponId: 'interdictor',
    evidenceFile: 'reference-data/provenance/frosty-interdictor-integration.json' });
}

// The integration label and the exported selector disagree for this source asset.
// Retain the exported attachment, but do not present the site label as verified.
for (const record of audit.records) {
  if (!record.frosty?.attachmentXml.endsWith('Attachment_DesertTechHTI_MZL_M50BigBoreSuppressor.xml')) continue;
  record.attachmentName = 'M50 Big Bore Suppressor (Frosty asset)';
  record.frosty.identityStatus = 'display-label-unverified';
  record.frosty.selectorSiteId = 'cqb_supp';
  const note = 'The integration source calls this light_supp, but the exported selector uses the CQB suppressor template. The in-game display name needs a screenshot.';
  if (!record.notes.includes(note)) record.notes.push(note);
}

audit.recordCount = audit.records.length;
audit.attachmentDetailCount = audit.records.filter(record => record.stats != null).length;
audit.mappingReviewedCount = audit.records.filter(record => record.mappingReviewStatus === 'visually-checked').length;
audit.weaponsProcessed = [...new Set(audit.records.map(record => record.weaponName))];
audit.generatedAt = new Date().toISOString();
if (!audit.knownGaps.includes('Frosty-backed pending records establish exported availability and point cost only; they require screenshot capture before UI fields, labels, descriptions, and arrows are considered reviewed.')) {
  audit.knownGaps.push('Frosty-backed pending records establish exported availability and point cost only; they require screenshot capture before UI fields, labels, descriptions, and arrows are considered reviewed.');
}
writeFileSync(auditFile, `${JSON.stringify(audit, null, 2)}\n`);
console.log(`Added ${added.length} Frosty-pending records across ${new Set(added.map(row => row.weaponName)).size} weapons.`);
