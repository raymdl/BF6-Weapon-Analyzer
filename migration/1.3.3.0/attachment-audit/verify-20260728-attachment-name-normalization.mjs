import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(auditRoot, 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(auditRoot, 'manual-review-overrides.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(auditRoot, 'attachment-name-normalization-summary-20260728.json'), 'utf8'));
const details = review.records.filter((row) => row.stats);
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const byBase = (name) => details.find((row) => path.basename(row.source.currentPath) === name);

assert(review.records.length === 3164, `record count ${review.records.length}`);
assert(details.length === 3102, `detail count ${details.length}`);
assert(summary.names.length === 314, `name changes ${summary.names.length}`);
assert(summary.scopeClarification.uniqueCandidateNames === 245, 'unique candidate-name count changed');
assert(review.records.every((row) => fs.existsSync(row.source.currentPath)), 'stale current screenshot paths remain');
assert(details.every((row) => row.attachmentName && row.attachmentName.trim()), 'empty attachment name');
assert(details.every((row) => Object.values(row.stats).every((value) => value !== null && value !== undefined)), 'null stat remains');
assert(details.every((row) => row.attachmentName === 'None' || row.attachmentDescription), 'blank non-None description remains');

const invalidAllCaps = details.filter((row) => {
  const tokens = row.attachmentName.split(/\s+/);
  const letters = row.attachmentName.match(/[A-Za-z]/g) ?? [];
  if (!letters.length || !letters.every((letter) => letter === letter.toUpperCase())) return false;
  return !tokens.every((token) => /^\d+(?:\.\d+)?(?:MM|")?$/.test(token) || /^\d+Rnd$/.test(token) || /^[#\d]+$/.test(token) || ['US','LE','OH','E3','SB','LB','MG','SBR','CQB','LSW','EBR','SPR','ASM','COB','DMR','VMW','3LR','HBAR','MK22','US-LB','SDM-R','BOAR-F','CUSTOM-H','CIV','CIV-S','IAR','A3','FMJ','HP','MW'].includes(token));
});
assert(invalidAllCaps.length === 0, `invalid all-caps names: ${invalidAllCaps.map((row) => `${row.weaponName}:${row.attachmentName}`).join(', ')}`);
assert(!details.some((row) => /\bus\b/.test(row.attachmentName)), 'lowercase us remains');
assert(!details.some((row) => /CIV-s/.test(row.attachmentName)), 'CIV-s remains');
for (const bad of ['AFTERMARKET B', '75RND BELT BO', 'I00RND', 'I0ORND']) assert(!details.some((row) => row.attachmentName.includes(bad)), `damaged token remains: ${bad}`);

const lowercaseWords = details.flatMap((row) => row.attachmentName.split(/\s+/).filter((token) => /[a-z]/.test(token) && token === token.toLowerCase()).map((token) => `${row.weaponName}:${token}`));
assert(lowercaseWords.length === 0, `all-lowercase name words: ${lowercaseWords.join(', ')}`);
const tokenCasings = new Map();
for (const row of details) for (const token of row.attachmentName.split(/\s+/)) {
  const key = token.toLowerCase();
  if (!tokenCasings.has(key)) tokenCasings.set(key, new Set());
  tokenCasings.get(key).add(token);
}
const inconsistentTokens = [...tokenCasings].filter(([, values]) => values.size > 1);
assert(inconsistentTokens.length === 0, `inconsistent token casing: ${inconsistentTokens.map(([token, values]) => `${token}=${[...values].join('/')}`).join(', ')}`);

const contentFixes = new Set(['SOR-556 MK2|FACTORY', 'PP-19|367MM', 'USG-90|407MM CIV-s', 'SOR-556 MK2|16" us', 'VCR-2|18" us', 'GRT-BC|AFTERMARKET B', 'M240L|75RND BELT BO', 'KTS100 MK8|I00RND DRUM MAG', 'M121 A2|I00RND BELT BOX', 'M240L|I0ORND BELT BOX', 'M250|I00RND BELT POUCH', 'M277|50 MW']);
for (const change of summary.names) {
  const beforeWords = change.before.trim().split(/\s+/).length;
  const afterWords = change.after.trim().split(/\s+/).length;
  assert(beforeWords === afterWords || contentFixes.has(`${change.weaponName}|${change.before}`), `unexpected word-count change: ${change.weaponName}:${change.before} -> ${change.after}`);
  if (change.attachmentType === 'Barrel') {
    const prefix = change.before.match(/^\d+(?:\.\d+)?(?:MM|")/i)?.[0];
    if (prefix) assert(change.after.startsWith(prefix.toUpperCase()), `barrel length prefix changed: ${change.weaponName}:${change.before} -> ${change.after}`);
  }
}

const expectedNames = new Map([
  ['17_SOR-556 MK2_Barrel_Short.png', '14.5" Factory'],
  ['10_PP-19_Barrel_Basic_ambiguous-2.png', '367MM CIV'],
  ['15_USG-90_Barrel_Extended.png', '407MM CIV-S'],
  ['13_SOR-556 MK2_Barrel_Basic.png', '16" US'],
  ['14_VCR-2_Barrel_Basic.png', '18" US'],
  ['41_GRT-BC_Ergonomics_AFTERMARKET_B.png', 'Aftermarket Buffer'],
  ['36_M240L_Magazine_75RND_BELT_BO.png', '75Rnd Belt Box'],
  ['52_M277_Laser_50_MW.png', '50 MW Blue'],
  ['16_DRS-IAR_Barrel_20_SDM-R.png', '20" SDM-R'],
  ['13_UMG-40_Barrel_Heavy.png', '200MM CUSTOM-H'],
  ['15_UMG-40_Barrel_Heavy_Ext.png', '305MM CUSTOM-H'],
]);
for (const [basename, expected] of expectedNames) assert(byBase(basename)?.attachmentName === expected, `${basename} name mismatch`);

const expectedCosts = new Map(summary.costs.map((item) => [path.basename(item.sourcePath), item.after]));
for (const [basename, expected] of expectedCosts) assert(byBase(basename)?.attachmentCost === expected, `${basename} cost mismatch`);
assert(expectedCosts.size === 14, `cost correction count ${expectedCosts.size}`);
assert(byBase('15_USG-90_Barrel_Extended.png')?.attachmentSubtype === 'Heavy Ext', 'USG-90 subtype mismatch');
assert(byBase('34_PSR_Laser_5_MW_Red.png')?.stats.sprintRecoveryMs === 200, 'PSR sprint recovery mismatch');
assert(byBase('10_PP-19_Barrel_Basic_ambiguous-2.png')?.source.currentPath.endsWith('10_PP-19_Barrel_Basic_ambiguous-2.png'), 'PP-19 current path drift');

for (const item of [...summary.names, ...summary.costs, ...summary.subtype, ...summary.stats]) {
  const override = manual.overrides.find((entry) => entry.sourcePath && path.resolve(entry.sourcePath).toLowerCase() === path.resolve(item.sourcePath).toLowerCase());
  assert(Boolean(override), `missing durable override: ${item.sourcePath}`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, records: review.records.length, details: details.length, nameChanges: summary.names.length, costCorrections: expectedCosts.size, stalePaths: 0, nullStats: 0, blankDescriptions: 0, lowercaseNameWords: 0, inconsistentTokenCasings: 0 }, null, 2));
