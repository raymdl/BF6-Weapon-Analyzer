import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const details = review.records.filter((row) => row.stats);
const fields = Object.keys(details[0].stats);
const fail = (message) => { throw new Error(message); };

if (review.records.length !== 3164 || details.length !== 3102) fail(`Corpus size changed: ${review.records.length}/${details.length}`);
const stale = review.records.filter((row) => !fs.existsSync(row.source.currentPath));
if (stale.length) fail(`Stale paths: ${stale.length}`);

const statNulls = details.flatMap((row) => fields.filter((field) => row.stats[field] === null || row.stats[field] === undefined).map((field) => ({ row, field })));
if (statNulls.length) fail(`Stat nulls remain: ${statNulls.length}`);
const nullReasons = details.reduce((sum, row) => sum + Object.keys(row.statFieldReasons ?? {}).length, 0);
if (nullReasons) fail(`Obsolete stat null reasons remain: ${nullReasons}`);

for (const key of ['weaponName', 'attachmentType', 'attachmentSubtype', 'attachmentName']) if (details.some((row) => typeof row[key] !== 'string' || !row[key].trim())) fail(`Blank ${key} remains`);
if (details.some((row) => row.attachmentCost === null || row.attachmentCost === undefined)) fail('Blank attachment cost remains');
const invalidDescriptions = details.filter((row) => row.attachmentName !== 'None' && (typeof row.attachmentDescription !== 'string' || !row.attachmentDescription.trim()));
if (invalidDescriptions.length) fail(`Invalid non-None descriptions: ${invalidDescriptions.length}`);

const exactModes = new Map([['KORD 6P67', ['AUTO','BURST','SINGLE']], ['SG 553R', ['AUTO','BURST','SINGLE']], ['M433', ['AUTO','SINGLE']]]);
for (const [weapon, expected] of exactModes) {
  const rows = details.filter((row) => row.weaponName === weapon);
  if (!rows.length || rows.some((row) => JSON.stringify(row.stats.fireModes) !== JSON.stringify(expected))) fail(`${weapon} fire-mode gate failed`);
}

const direct = new Map([
  ['KTS100 MK8|Linear Comp|recoilVariationDegrees', 7],
  ['L85A3|Ribbed Stubby|control', 50],
  ['L85A3|Canted Stubby|precision', 34],
  ['L85A3|Canted Stubby|control', 54],
  ['L85A3|Hollow Point|headshotMultiplier', 1.57],
  ['L85A3|Synthetic Tip|headshotMultiplier', 1.8],
  ['M250|Tungsten Core|control', 40],
  ['M240L|Rail Cover|mobility', 32],
]);
for (const [key, expected] of direct) {
  const [weapon, name, field] = key.split('|');
  const row = details.find((item) => item.weaponName === weapon && item.attachmentName.toLowerCase() === name.toLowerCase());
  if (!row || row.stats[field] !== expected) fail(`Direct value gate failed: ${key}=${row?.stats?.[field]}`);
}
const rail = details.find((row) => row.weaponName === 'M240L' && row.attachmentName.toLowerCase() === 'rail cover');
if (rail?.attachmentDescription !== 'Improves weapon draw speed.') fail('Rail Cover description gate failed');

for (const row of details) {
  for (const field of ['hipfire','precision','control','mobility']) if (!(row.stats[field] >= 0 && row.stats[field] <= 100)) fail(`Implausible ${field}: ${row.source.currentPath}|${row.stats[field]}`);
  if (!(row.stats.magazineSize > 0 && row.stats.magazineSize <= 250)) fail(`Implausible magazine: ${row.source.currentPath}|${row.stats.magazineSize}`);
  if (!(row.stats.reloadTimeSeconds > 0 && row.stats.reloadTimeSeconds < 20)) fail(`Implausible reload: ${row.source.currentPath}|${row.stats.reloadTimeSeconds}`);
  if (!(row.stats.headshotMultiplier > 0 && row.stats.headshotMultiplier <= 3)) fail(`Implausible headshot: ${row.source.currentPath}|${row.stats.headshotMultiplier}`);
  if (!(row.stats.opponentHealthRegenDelaySeconds >= 0 && row.stats.opponentHealthRegenDelaySeconds <= 20)) fail(`Implausible regen delay: ${row.source.currentPath}|${row.stats.opponentHealthRegenDelaySeconds}`);
}

const zeroIndicators = [];
for (const row of details) for (const [field, comparison] of Object.entries(row.statComparisons ?? {})) if (row.stats[field] === 0) zeroIndicators.push({ row, field, comparison });
const invalidZeroIndicators = zeroIndicators.filter(({ row, field, comparison }) => !(field === 'spotOnFire3dM' && comparison.direction === 'down' && row.attachmentType === 'Muzzle' && /(Flash Hider|Flash Comp|Suppressor)/i.test(row.attachmentName)));
if (invalidZeroIndicators.length) fail(`Invalid zero indicators: ${invalidZeroIndicators.length}`);

const manualByPath = new Map(manual.overrides.filter((row) => row.sourcePath).map((row) => [path.resolve(row.sourcePath).toLowerCase(), row]));
for (const row of details) {
  const override = manualByPath.get(path.resolve(row.source.currentPath).toLowerCase());
  for (const field of fields) if (override?.updates?.[field] !== undefined && JSON.stringify(override.updates[field]) !== JSON.stringify(row.stats[field])) fail(`Manual override drift: ${row.source.currentPath}|${field}`);
}
for (const [weapon, expected] of exactModes) for (const row of details.filter((item) => item.weaponName === weapon)) if (JSON.stringify(manualByPath.get(path.resolve(row.source.currentPath).toLowerCase())?.updates?.fireModes) !== JSON.stringify(expected)) fail(`Missing fire-mode override: ${row.source.currentPath}`);

console.log(JSON.stringify({ records: review.records.length, details: details.length, stalePaths: stale.length, statNulls: statNulls.length, nullReasons, invalidDescriptions: invalidDescriptions.length, noneDescriptionBlanks: details.filter((row) => row.attachmentName === 'None' && !row.attachmentDescription).length, zeroIndicators: zeroIndicators.length, invalidZeroIndicators: invalidZeroIndicators.length, fireModeRows: Object.fromEntries([...exactModes].map(([weapon]) => [weapon, details.filter((row) => row.weaponName === weapon).length])) }, null, 2));
