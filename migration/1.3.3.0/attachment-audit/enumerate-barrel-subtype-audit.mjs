import fs from 'node:fs/promises';

const root = 'C:/Users/royal/Documents/BF6 Project';
const doc = JSON.parse(await fs.readFile(`${root}/migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json`, 'utf8'));
const rows = doc.records.filter(r => r.attachmentType === 'Barrel' && Number.isFinite(r.stats?.muzzleVelocityMps));
const multiplierForSubtype = subtype => {
  const s = String(subtype ?? '').toLowerCase();
  if (s.includes('short')) return 0.8;
  if (s.includes('extended') || s.includes('heavy ext') || s.includes('ext light')) return 1.25;
  return 1;
};
const byWeapon = Map.groupBy(rows, r => r.weaponName);
const result = [];
for (const [weapon, weaponRows] of byWeapon) {
  const candidates = [...new Set(weaponRows.flatMap(r => [0.8, 1, 1.25].map(m => r.stats.muzzleVelocityMps / m)))];
  const scored = candidates.map(base => ({
    base,
    matches: weaponRows.filter(r => [0.8, 1, 1.25].some(m => Math.round(base * m) === r.stats.muzzleVelocityMps)).length,
    subtypeMatches: weaponRows.filter(r => Math.round(base * multiplierForSubtype(r.attachmentSubtype)) === r.stats.muzzleVelocityMps).length,
  })).sort((a,b) => b.matches-a.matches || b.subtypeMatches-a.subtypeMatches || a.base-b.base);
  const base = scored[0].base;
  for (const row of weaponRows) {
    const inferred = [0.8,1,1.25].find(m => Math.round(base*m) === row.stats.muzzleVelocityMps);
    const recorded = multiplierForSubtype(row.attachmentSubtype);
    if (inferred && inferred !== recorded) result.push({
      weaponName: weapon,
      captureOrder: row.source.captureOrder,
      attachmentName: row.attachmentName,
      recordedSubtype: row.attachmentSubtype,
      velocity: row.stats.muzzleVelocityMps,
      baseVelocity: base,
      inferredMultiplier: inferred,
      currentPath: row.source.currentPath,
    });
  }
}
await fs.writeFile(`${root}/migration/1.3.3.0/attachment-audit/barrel-subtype-disagreements.json`, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({count:result.length,rows:result},null,2));
