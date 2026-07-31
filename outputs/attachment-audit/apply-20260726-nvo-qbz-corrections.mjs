import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'C:\\Users\\royal\\Documents\\BF6 Project';
const audit = path.join(root, 'outputs', 'attachment-audit');
const nvoDir = path.join(root, 'Weapon Attachments', 'Assault Rifle', 'NVO-228E');
const qbzDir = path.join(root, 'Weapon Attachments', 'Carbine', 'QBZ-192');
const reviewPath = path.join(audit, 'attachment-screenshot-review.json');
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = async (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const exists = async file => fs.access(file).then(() => true, () => false);

const replacements = [
  ['15.11.56.62', '1_NVO-228E_Muzzle_None.png', 'None', null, {}],
  ['15.11.58.55', '2_NVO-228E_Muzzle_Flash_Hider.png', 'Flash Hider', 'Reduces the intensity of muzzle flashes and fully hides in-world spotting while firing. Soldiers firing are still marked on the minimap.', { spotOnFire3dM: ['down', 'buff'] }],
  ['15.12.00.58', '3_NVO-228E_Muzzle_Flash_Comp.png', 'Flash Comp', 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.', { spotOnFire3dM: ['down', 'buff'] }],
  ['15.12.02.04', '4_NVO-228E_Muzzle_Single-Port_Brake.png', 'Single-Port Brake', 'Simple brake that reduces recoil but increases weapon sway. Soldiers firing will be spotted, marking their position in-world and on the minimap.', { control: ['up', 'buff'], recoilAmountDegrees: ['down', 'buff'] }],
  ['15.12.03.30', '5_NVO-228E_Muzzle_Double-Port_Brake.png', 'Double-Port Brake', 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.', { control: ['up', 'buff'], recoilAmountDegrees: ['down', 'buff'] }],
  ['15.12.04.57', '6_NVO-228E_Muzzle_Compensated_Brake.png', 'Compensated Brake', 'Enhanced brake that reduces recoil, minimizes recoil buildup, and improves recoil recovery. Soldiers firing will be spotted, marking their position in-world and on the minimap.', { control: ['up', 'buff'], recoilAmountDegrees: ['down', 'buff'] }],
  ['15.12.06.09', '7_NVO-228E_Muzzle_Compensator.png', 'Compensator', 'Reduces recoil buildup and improves recoil recovery.', {}],
  ['15.12.07.33', '8_NVO-228E_Muzzle_Linear_Comp.png', 'Linear Comp', 'Reduces horizontal recoil in favor of more stable vertical recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.', { precision: ['up', 'buff'], control: ['down', 'penalty'], recoilAmountDegrees: ['down', 'buff'] }],
  ['15.12.08.58', '9_NVO-228E_Muzzle_Standard_Suppressor.png', 'Standard Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces hip-fire accuracy.', { hipfire: ['down', 'penalty'], spotOnFire3dM: ['down', 'buff'], spotOnFire2dM: ['down', 'buff'] }],
  ['15.12.09.82', '10_NVO-228E_Muzzle_CQB_Suppressor.png', 'CQB Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing.', { spotOnFire3dM: ['down', 'buff'], spotOnFire2dM: ['down', 'buff'] }],
  ['15.12.11.01', '11_NVO-228E_Muzzle_Long_Suppressor.png', 'Long Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces recoil buildup and improves recoil recovery at the cost of hip-fire accuracy and weapon sway.', { hipfire: ['down', 'penalty'], spotOnFire3dM: ['down', 'buff'], spotOnFire2dM: ['down', 'buff'] }],
  ['15.12.12.24', '12_NVO-228E_Muzzle_Lightened_Suppressor.png', 'Lightened Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces recoil buildup and improves recoil recovery at the cost of hip-fire accuracy.', { hipfire: ['down', 'penalty'], spotOnFire3dM: ['down', 'buff'], spotOnFire2dM: ['down', 'buff'] }],
];

const newSourceName = stamp => `Battlefield 6 Screenshot 2026.07.26 - ${stamp} (Medium).png`;
for (const [stamp, canonical] of replacements) {
  const oldFile = path.join(nvoDir, canonical);
  const newFile = path.join(nvoDir, newSourceName(stamp));
  if (!(await exists(oldFile)) || !(await exists(newFile))) throw new Error(`Missing NVO replacement pair: ${oldFile} / ${newFile}`);
}
const qbzBad = path.join(qbzDir, '1_QBZ-192_Muzzle_Single-Port_Brake.png');
if (!(await exists(qbzBad))) throw new Error(`Missing QBZ screenshot to remove: ${qbzBad}`);
for (let order = 2; order <= 50; order++) {
  const match = (await fs.readdir(qbzDir)).find(name => name.startsWith(`${order}_QBZ-192_`));
  if (!match) throw new Error(`Missing QBZ capture order ${order}`);
}

// Destructive actions explicitly requested by the user: remove unusable/erroneous captures.
for (const [, canonical] of replacements) await fs.rm(path.join(nvoDir, canonical));
for (const [stamp, canonical] of replacements) await fs.rename(path.join(nvoDir, newSourceName(stamp)), path.join(nvoDir, canonical));
await fs.rm(qbzBad);
const qbzNames = await fs.readdir(qbzDir);
for (let order = 2; order <= 50; order++) {
  const name = qbzNames.find(item => item.startsWith(`${order}_QBZ-192_`));
  const temp = path.join(qbzDir, `__shift__${name}`);
  await fs.rename(path.join(qbzDir, name), temp);
}
for (let order = 2; order <= 50; order++) {
  const name = qbzNames.find(item => item.startsWith(`${order}_QBZ-192_`));
  await fs.rename(path.join(qbzDir, `__shift__${name}`), path.join(qbzDir, name.replace(/^\d+_/, `${order - 1}_`)));
}

const baseStats = {
  damage: 35, rateOfFireRpm: 654, magazineSize: 30, hipfire: 40, precision: 25,
  control: 41, mobility: 52, fireModes: ['AUTO', 'SINGLE'], reloadTimeSeconds: 2.5,
  muzzleVelocityMps: 626, adsTimeMs: 250, headshotMultiplier: 1.4, longRangeDamage: 17,
  spotOnFire3dM: 54, spotOnFire2dM: 150, opponentHealthRegenDelaySeconds: 5,
  collateralMultiplier: 0.75, reloadInAds: false, adsMoveSpeedMultiplier: 0.6,
  sprintRecoveryMs: 167, recoilAmountDegrees: 0.7, recoilVariationDegrees: 28.9,
};
const review = await readJson(reviewPath);
review.records = review.records.filter(record => !(record.weaponName === 'QBZ-192' && record.attachmentName === 'Single-Port Brake'));
for (const record of review.records) {
  if (record.weaponName === 'QBZ-192' && record.source?.captureOrder > 1) {
    record.source.captureOrder--;
    for (const key of ['currentPath', 'proposedFilename']) if (record.source[key]) record.source[key] = record.source[key].replace(/(QBZ-192[\\/])(\d+)_|^(\d+)_/, (all, prefix, a, b) => prefix ? `${prefix}${Number(a) - 1}_` : `${Number(b) - 1}_`);
  }
  if (record.weaponName !== 'NVO-228E' || record.attachmentType !== 'Muzzle') continue;
  const replacement = replacements.find(([, , name]) => name === record.attachmentName);
  if (!replacement) throw new Error(`Unexpected NVO muzzle row ${record.attachmentName}`);
  const [stamp, canonical, , description, comparisons] = replacement;
  record.attachmentDescription = description;
  record.stats = { ...baseStats };
  if (record.attachmentName === 'Single-Port Brake' || record.attachmentName === 'Double-Port Brake' || record.attachmentName === 'Compensated Brake') record.stats.control = 44;
  if (record.attachmentName === 'Linear Comp') Object.assign(record.stats, { precision: 26, control: 38, recoilAmountDegrees: 0.6, recoilVariationDegrees: 22.3 });
  if (['Standard Suppressor', 'Long Suppressor', 'Lightened Suppressor'].includes(record.attachmentName)) record.stats.hipfire = 34;
  if (['Standard Suppressor', 'CQB Suppressor', 'Long Suppressor', 'Lightened Suppressor'].includes(record.attachmentName)) Object.assign(record.stats, { spotOnFire3dM: 21, spotOnFire2dM: 0 });
  record.statComparisons = Object.fromEntries(Object.entries(comparisons).map(([field, [direction, effect]]) => [field, { direction, effect, source: 'visually-confirmed-2026-07-26-recapture' }]));
  record.statFieldReasons = {};
  record.extractionStatus = 'provisional-review-required';
  record.reviewStatus = 'provisional-review-required';
  record.mappingReviewStatus = 'visually-checked';
  record.source.originalFilename = newSourceName(stamp);
  record.source.originalPath = path.join(nvoDir, newSourceName(stamp));
  record.source.currentPath = path.join(nvoDir, canonical);
  record.source.proposedFilename = canonical;
  record.source.captureTimestamp = stamp;
  record.source.resolution = '1365x768';
  record.notes = [...new Set([...(record.notes ?? []).filter(note => !/obscur|recapture|required.*null/i.test(note)), 'Detailed muzzle replacement capture visually transcribed on 2026-07-26; values remain provisional-review-required and were not promoted to live site data.'])];
}
review.recordCount = review.records.length;
review.attachmentDetailCount = review.records.filter(record => record.stats).length;
review.generatedAt = new Date().toISOString();
await writeJson(reviewPath, review);

// Keep the capture-order map aligned with the authoritative filesystem.
const capturePath = path.join(audit, 'capture-order.json');
const capture = await readJson(capturePath);
capture.entries = capture.entries.filter(entry => !(entry.weaponName === 'QBZ-192' && entry.attachmentName === 'Single-Port Brake'));
for (const entry of capture.entries) {
  if (entry.weaponName === 'QBZ-192' && entry.captureOrder > 1) {
    entry.captureOrder--;
    for (const key of ['currentFilename', 'proposedFilename']) if (entry[key]) entry[key] = entry[key].replace(/^\d+_/, `${entry.captureOrder}_`);
  }
  if (entry.weaponName === 'NVO-228E' && entry.attachmentType === 'Muzzle') {
    const replacement = replacements.find(([, , name]) => name === entry.attachmentName);
    if (replacement) {
      const [stamp, canonical] = replacement;
      entry.currentFilename = canonical; entry.proposedFilename = canonical;
      entry.originalFilename = newSourceName(stamp); entry.originalPath = path.join(nvoDir, newSourceName(stamp)); entry.captureTimestamp = stamp;
    }
  }
}
capture.recordCount = capture.entries.length; capture.generatedAt = new Date().toISOString();
await writeJson(capturePath, capture);

// Durable reviewed overrides ensure a future builder rerun does not reintroduce the old simple-panel values.
const overridesPath = path.join(audit, 'manual-review-overrides.json');
const overrides = await readJson(overridesPath);
overrides.overrides = (overrides.overrides ?? []).filter(item => !(item.weaponName === 'QBZ-192' && item.attachmentName === 'Single-Port Brake') && !(item.weaponName === 'NVO-228E' && item.attachmentType === 'Muzzle'));
for (const [stamp, canonical, name, description, comparisons] of replacements) {
  const record = review.records.find(item => item.weaponName === 'NVO-228E' && item.attachmentName === name && item.attachmentType === 'Muzzle');
  overrides.overrides.push({ weaponName: 'NVO-228E', attachmentType: 'Muzzle', attachmentName: name, sourcePath: path.join(nvoDir, canonical), sourceFilename: canonical, updates: { attachmentDescription: description, stats: record.stats }, comparisons: record.statComparisons, replaceComparisons: true, evidence: [{ kind: 'visually-confirmed-recapture', sourceFilename: newSourceName(stamp), reviewDate: '2026-07-26' }], reviewStatus: null, mappingReviewStatus: 'visually-checked' });
}
overrides.generatedAt = new Date().toISOString();
await writeJson(overridesPath, overrides);

console.log(JSON.stringify({ nvoReplaced: replacements.length, qbzRemoved: 1, qbzRenumbered: 49, records: review.recordCount, detailRecords: review.attachmentDetailCount }, null, 2));
