/**
 * SUPERSEDED — do not run.
 *
 * This applied the 2026-07-19 community firing-range tier values onto the
 * 9.5 / 20.5 / 35.5 m breakpoints. The 2026-07-25 Sym refresh replaced both the
 * values and the breakpoints; running this again would revert live damage to
 * the community estimates. Use scripts/apply-sym-damage.mjs instead. Kept for
 * the historical record of how the pre-refresh curves were derived.
 */
import { readFileSync, writeFileSync } from 'node:fs';

throw new Error('apply-provisional-damage.mjs is superseded by scripts/apply-sym-damage.mjs; see data/provenance/damage-1.3.3.0.json');

const weaponsUrl = new URL('../data/weapons.json', import.meta.url);
const weapons = JSON.parse(readFileSync(weaponsUrl, 'utf8'));

const AUTOMATIC_CLASSES = new Set(['Assault Rifle', 'Carbine', 'SMG', 'LMG']);
const AUTOMATIC_TIERS = new Map([
  [33.34, 35.19],
  [27.25, 27.45],
  [25, 26],
  [21.4, 21.6],
  [20, 20.65],
  [17.83, 17.8],
  [16.67, 17.2],
  [15, 15],
  [14.29, 14.65],
  [12.5, 12.8],
]);
const DMR_TIERS = new Map([
  [66.67, 66.7],
  [60, 57.2],
  [50, 52.4],
  [40, 41.5],
  [37.67, 37.6],
  [33.34, 34.35],
  [28.5, 29.39],
  [27.25, 27.45],
  [25, 26.15],
]);

for (const newValue of [...AUTOMATIC_TIERS.values()]) AUTOMATIC_TIERS.set(newValue, newValue);
for (const newValue of [...DMR_TIERS.values()]) DMR_TIERS.set(newValue, newValue);

function applyTierMap(weapon, tierMap, damageSource) {
  if (!Array.isArray(weapon.dmg) || weapon.dmg.length === 0) return;
  weapon.dmg = weapon.dmg.map(point => {
    if (!tierMap.has(point.d)) {
      throw new Error(`${weapon.id}: no provisional post-1.3.3.0 tier mapping for ${point.d}`);
    }
    return { ...point, d: tierMap.get(point.d), source: 'in-game' };
  });
  weapon.damageStatus = 'provisional';
  weapon.damageSource = damageSource;
}

const automaticSource = 'Community-tested post-1.3.3.0 upper-torso tier values mapped to the existing weapon family/ranges; provisional pending game-file confirmation';
const dmrSource = 'Community-tested post-1.3.3.0 DMR upper-torso tier values mapped to the existing weapon family/ranges; provisional pending game-file confirmation';

for (const weapon of weapons) {
  if (AUTOMATIC_CLASSES.has(weapon.cls) && weapon.id !== 'pp19') {
    applyTierMap(weapon, AUTOMATIC_TIERS, automaticSource);
  } else if (weapon.cls === 'DMR') {
    applyTierMap(weapon, DMR_TIERS, dmrSource);
  } else if (weapon.id === 'vz61') {
    weapon.dmg = weapon.dmg.map(point => ({ ...point, source: 'in-game' }));
    weapon.damageStatus = 'provisional';
    weapon.damageSource = 'Community-tested post-1.3.3.0 VZ.61 values (reported unchanged); provisional pending game-file confirmation';
  }
}

const pw5a3 = weapons.find(weapon => weapon.id === 'pw5a3');
const pp19 = weapons.find(weapon => weapon.id === 'pp19');
if (!pw5a3 || !pp19) throw new Error('PW5A3 and PP-19 records are required');
pp19.dmg = pw5a3.dmg.map(point => ({ ...point }));
pp19.damageStatus = 'provisional';
pp19.damageSource = 'PW5A3 damage model confirmed by user; community-tested post-1.3.3.0 automatic tiers; provisional pending game-file confirmation';

writeFileSync(weaponsUrl, `${JSON.stringify(weapons, null, 2)}\n`);
