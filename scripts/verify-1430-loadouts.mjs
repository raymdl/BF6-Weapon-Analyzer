/**
 * Representative loadout check for the 1.4.3.0 data update.
 *
 * Covers the two weapons whose source values changed, on a default build and on one
 * affected composed build each, plus the shared point-cost change. Prints values rather
 * than asserting a golden file: this is the "verify representative affected loadouts"
 * step of the update plan, read alongside the focused test suites.
 */
import { readFileSync } from 'node:fs';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { computeAttPts, resetAttsForWeapon } from '../sim/loadout.js';
import { damageAtRange, bulletsToKillWithHits, resolveHitMultipliers } from '../sim/damage.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const weapons = read('../data/weapons.json');
const attachments = read('../data/attachments.json');
const ammo = read('../data/ammo.json');
const balance = read('../data/balance_tables.json');
const HIT_ZONES = read('../data/hit_zones.json');
const data = { ...attachments, ...ammo };
setAttachmentContext({ HIT_ZONES, ...data, ...balance });

const weapon = id => weapons.find(w => w.id === id);
const defaults = w => { const atts = {}; resetAttsForWeapon(atts, w, data); return atts; };
const round = n => (typeof n === 'number' ? Math.round(n * 1000) / 1000 : n);

console.log(`hit_zones build: ${HIT_ZONES.source.build}`);

for (const id of ['interdictor', 'vssm']) {
  const w = weapon(id);
  const atts = defaults(w);
  const built = applyAttachments(w, atts);
  const { headshotMultiplier, limbMultiplier } = resolveHitMultipliers(id, null, { HIT_ZONES });
  console.log(`\n== ${id} (default build) ==`);
  console.log(`  points          ${computeAttPts(atts, w, data)}`);
  console.log(`  muzzle velocity ${round(built.bulletVel)} m/s`);
  console.log(`  ADS recoil/shot ${round(built.recoilV)}   direction variation ${round(built.recoilVar)}`);
  console.log(`  headshot x${headshotMultiplier}   limb x${limbMultiplier}`);
  const ranges = id === 'interdictor' ? [50, 100, 119, 120, 140, 160, 161, 180, 220] : [10, 50, 75, 100];
  console.log('  range  damage  btk(chest)  btk(limb)');
  for (const r of ranges) {
    const d = damageAtRange(w, r);
    const chest = bulletsToKillWithHits(d, { bodyMultiplier: 1 });
    const limb = bulletsToKillWithHits(d, { bodyMultiplier: limbMultiplier });
    console.log(`  ${String(r).padStart(5)}  ${String(round(d)).padStart(6)}  ${String(chest).padStart(10)}  ${String(limb).padStart(9)}`);
  }
}

// Composed build: the Interdictor's iron sights now cost 15, so a build that keeps them
// must show the higher total.
{
  const w = weapon('interdictor');
  const base = defaults(w);
  console.log('\n== interdictor sight cost ==');
  for (const sight of ['iron', 'std_optic', 'var_high']) {
    const atts = { ...base, sight };
    console.log(`  sight=${sight.padEnd(10)} total points ${computeAttPts(atts, w, data)}`);
  }
}

// Composed build: VSSM with its extended magazine, to confirm the new recoil base
// flows through a tier shift rather than being overwritten.
{
  const w = weapon('vssm');
  const base = defaults(w);
  const built = applyAttachments(w, base);
  console.log('\n== vssm recoil through a composed build ==');
  console.log(`  default        recoilV ${round(built.recoilV)}  recoilVar ${round(built.recoilVar)}`);
  for (const grip of (attachments.WEAPON_ATTS.vssm?.grip ?? []).slice(0, 3)) {
    const composed = applyAttachments(w, { ...base, grip });
    console.log(`  grip=${String(grip).padEnd(14)} recoilV ${round(composed.recoilV)}  recoilVar ${round(composed.recoilVar)}`);
  }
}
