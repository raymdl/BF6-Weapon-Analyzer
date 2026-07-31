import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project');
const audit = path.join(root, 'outputs', 'attachment-audit');
const current = JSON.parse(fs.readFileSync(path.join(audit, 'attachment-screenshot-review.json'), 'utf8'));
const before = JSON.parse(fs.readFileSync(path.join(audit, 'pre-ak205-laser-recapture-20260728', 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(audit, 'manual-review-overrides.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(audit, 'raw-ocr.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(audit, 'coverage-report.json'), 'utf8'));
const canonicalRoot = path.join(root, 'Weapon Attachments', 'Carbine', 'AK-205');
const missingRoot = path.join(root, 'Weapon Attachments', 'Missing', 'AK-205');
const expected = new Map([
  [52, ['None', '52_AK-205_Laser_None.png', 47, 60, '7D779647B8DC59095328F765FD021C20D1BD67791A6A8C6C6A8D75E54DA5DC7D']],
  [53, ['5 MW Red', '53_AK-205_Laser_5_MW_Red.png', 54, 60, '6E45E5EC10DF6D99105E68AD3231F50B3B9921F83D77F2DFD021AECC9417FDE5']],
  [54, ['50 MW Violet', '54_AK-205_Laser_50_MW_Violet.png', 47, 64, 'C4A9953C2DBB81AD9F02F1601914E40359D700F35AB1E782B90C8922FED13914']],
  [55, ['5 MW Green', '55_AK-205_Laser_5_MW_Green.png', 62, 60, 'DC9D032400F588F2ED732219AA4BC8C0FC011F874B23A0B473A64BBB9A12FC49']],
  [56, ['50 MW Green', '56_AK-205_Laser_50_MW_Green.png', 71, 60, 'E1438DA384EA02E3C7DEC10F41142CECB4911B1E4BC59226BF27459C768A9A2D']],
  [57, ['50 MW Blue', '57_AK-205_Laser_50_MW_Blue.png', 62, 64, '3C681DCC19C46E4D76CD8E1B1E2440C7509B86D168629B6E0E4B41BF7897C94A']],
  [58, ['120 MW Blue', '58_AK-205_Laser_120_MW_Blue.png', 71, 64, '7328BEE550F2B54BF52B39900C6F136F83B5E01B1F22F9538A8436A012DC09C0']],
]);
const shared = {
  damage: 20, rateOfFireRpm: 720, magazineSize: 30, precision: 88, control: 57,
  fireModes: 'AUTO/SINGLE', reloadTimeSeconds: 2.337, muzzleVelocityMps: 708,
  adsTimeMs: 200, headshotMultiplier: 1.4, longRangeDamage: 12, spotOnFire3dM: 54,
  spotOnFire2dM: 150, opponentHealthRegenDelaySeconds: 5, collateralMultiplier: 0.75,
  reloadInAds: false, adsMoveSpeedMultiplier: 0.67, sprintRecoveryMs: 133,
  recoilAmountDegrees: 0.5, recoilVariationDegrees: 7.4,
};
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const target = row => row.weaponName === 'AK-205' && row.attachmentType === 'Laser' && expected.has(row.source?.captureOrder);
const stable = value => JSON.stringify(value);

if (current.records.length !== before.records.length) throw new Error(`Record count changed ${before.records.length} -> ${current.records.length}`);
const beforeUnrelated = before.records.filter(row => !target(row));
const currentUnrelated = current.records.filter(row => !target(row));
if (stable(beforeUnrelated) !== stable(currentUnrelated)) throw new Error('An unrelated review record changed');
const rows = current.records.filter(target).sort((a, b) => a.source.captureOrder - b.source.captureOrder);
if (rows.length !== 7) throw new Error(`Expected 7 AK-205 Laser rows, got ${rows.length}`);
for (const row of rows) {
  const [name, filename, hipfire, mobility, hash] = expected.get(row.source.captureOrder);
  const expectedStats = { ...shared, hipfire, mobility };
  if (row.attachmentName !== name) throw new Error(`Identity mismatch at ${row.source.captureOrder}`);
  if (stable(row.stats) !== stable({
    damage: expectedStats.damage, rateOfFireRpm: expectedStats.rateOfFireRpm, magazineSize: expectedStats.magazineSize,
    hipfire, precision: expectedStats.precision, control: expectedStats.control, mobility,
    fireModes: expectedStats.fireModes, reloadTimeSeconds: expectedStats.reloadTimeSeconds,
    muzzleVelocityMps: expectedStats.muzzleVelocityMps, adsTimeMs: expectedStats.adsTimeMs,
    headshotMultiplier: expectedStats.headshotMultiplier, longRangeDamage: expectedStats.longRangeDamage,
    spotOnFire3dM: expectedStats.spotOnFire3dM, spotOnFire2dM: expectedStats.spotOnFire2dM,
    opponentHealthRegenDelaySeconds: expectedStats.opponentHealthRegenDelaySeconds,
    collateralMultiplier: expectedStats.collateralMultiplier, reloadInAds: expectedStats.reloadInAds,
    adsMoveSpeedMultiplier: expectedStats.adsMoveSpeedMultiplier, sprintRecoveryMs: expectedStats.sprintRecoveryMs,
    recoilAmountDegrees: expectedStats.recoilAmountDegrees, recoilVariationDegrees: expectedStats.recoilVariationDegrees,
  })) throw new Error(`Stat mismatch at ${row.source.captureOrder}`);
  if (Object.keys(row.statFieldReasons ?? {}).length) throw new Error(`Obsolete null reason remains at ${row.source.captureOrder}`);
  if ((row.notes ?? []).some(note => /compact accessory-selector layout|lower detail fields are not displayed|compact-panel lower fields/i.test(note))) throw new Error(`Obsolete compact-layout note remains at ${row.source.captureOrder}`);
  if (!row.source.originalFilename.includes('2026.07.28')) throw new Error(`Old original filename remains at ${row.source.captureOrder}`);
  const screenshot = path.join(canonicalRoot, filename);
  if (!fs.existsSync(screenshot) || digest(screenshot) !== hash) throw new Error(`Canonical screenshot mismatch: ${screenshot}`);
  const override = manual.overrides.find(item => item.weaponName === 'AK-205' && item.attachmentType === 'Laser' && item.attachmentName === name);
  if (!override || Object.values(override.updates).some(value => value === null)) throw new Error(`Manual override incomplete: ${name}`);
  if (!override.evidence?.some(item => item.kind === 'direct-detailed-stat-screenshot-review')) throw new Error(`Detailed recapture evidence missing: ${name}`);
}
if (fs.readdirSync(missingRoot).some(name => name.toLowerCase().endsWith('.png'))) throw new Error('Staged AK-205 PNGs remain');
const rawLaser = raw.filter(item => expected.has(Number(String(path.basename(item.sourcePath)).split('_')[0])) && item.sourcePath.includes('\\AK-205\\') && item.sourcePath.includes('_AK-205_Laser_'));
if (rawLaser.length !== 7 || rawLaser.some(item => !item.text.includes('2.337S') || !item.text.includes('133MS'))) throw new Error('Fresh canonical raw OCR is incomplete');
const ak205Coverage = coverage.statCoverageByWeapon?.['AK-205'];
for (const field of Object.keys(shared)) if (ak205Coverage?.[field]?.populated !== ak205Coverage?.[field]?.total) throw new Error(`AK-205 coverage incomplete for ${field}`);
if (coverage.totals.staleCurrentPaths !== 0) throw new Error(`Stale current paths: ${coverage.totals.staleCurrentPaths}`);
console.log(JSON.stringify({
  recordCount: current.records.length,
  unchangedUnrelatedRecords: currentUnrelated.length,
  ak205LaserRecords: rows.length,
  populatedFieldsPerLaser: Object.keys(rows[0].stats).length,
  laserNullStatCells: rows.reduce((sum, row) => sum + Object.values(row.stats).filter(value => value === null).length, 0),
  staleCurrentPaths: coverage.totals.staleCurrentPaths,
}, null, 2));
