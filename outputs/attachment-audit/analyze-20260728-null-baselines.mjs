import fs from 'node:fs';

const review = JSON.parse(fs.readFileSync(new URL('./attachment-screenshot-review.json', import.meta.url), 'utf8'));
const rows = review.records.filter((row) => row.stats);
const fields = [
  'damage','rateOfFireRpm','magazineSize','hipfire','precision','control','mobility','fireModes',
  'reloadTimeSeconds','muzzleVelocityMps','adsTimeMs','headshotMultiplier','longRangeDamage','spotOnFire3dM',
  'spotOnFire2dM','opponentHealthRegenDelaySeconds','collateralMultiplier','reloadInAds',
  'adsMoveSpeedMultiplier','sprintRecoveryMs','recoilAmountDegrees','recoilVariationDegrees',
];

function mode(values) {
  const counts = new Map();
  for (const value of values) {
    const key = JSON.stringify(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ value: JSON.parse(key), count }));
}

const report = {};
for (const weapon of [...new Set(rows.filter((r) => fields.some((f) => r.stats[f] === null)).map((r) => r.weaponName))].sort()) {
  const weaponRows = rows.filter((r) => r.weaponName === weapon);
  report[weapon] = {};
  for (const field of fields) {
    const missing = weaponRows.filter((r) => r.stats[field] === null);
    if (!missing.length) continue;
    const unchanged = weaponRows.filter((r) => r.stats[field] !== null && !r.statComparisons?.[field]);
    report[weapon][field] = {
      missing: missing.map((r) => ({ order: r.captureOrder, name: r.attachmentName, comparison: r.statComparisons?.[field] ?? null, path: r.source.currentPath })),
      unchangedModes: mode(unchanged.map((r) => r.stats[field])).slice(0, 5),
    };
  }
}

const analogs = {
  frangibleDelay: mode(rows.filter((r) => r.attachmentName === 'Frangible' && r.stats.opponentHealthRegenDelaySeconds !== null).map((r) => r.stats.opponentHealthRegenDelaySeconds)),
  hollowHeadshot: mode(rows.filter((r) => r.attachmentName === 'Hollow Point' && r.stats.headshotMultiplier !== null).map((r) => r.stats.headshotMultiplier)),
  syntheticHeadshot: mode(rows.filter((r) => r.attachmentName === 'Synthetic Tip' && r.stats.headshotMultiplier !== null).map((r) => r.stats.headshotMultiplier)),
};

console.log(JSON.stringify({ report, analogs }, null, 2));
