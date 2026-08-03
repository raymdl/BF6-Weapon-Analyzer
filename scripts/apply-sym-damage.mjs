/**
 * Apply the pinned Sym damage-curve refresh to data/weapons.json.
 *
 * Sym republished bf6.json on 2026-07-25 with game-file damage floats and
 * corrected bolt-action sweet-spot distances. Every non-damage field in that
 * payload is byte-identical to the 1.3.3.0 snapshot already pinned for
 * scripts/sym-import.mjs, so this script owns damage.dmgs / damage.dists only.
 *
 * The site curve mirrors the Sym polyline verbatim: a repeated range is an
 * instant tier drop, distinct ranges are a ramp. See damageAtRange in
 * sim/damage.js for the matching evaluation rules.
 *
 * Usage: node scripts/apply-sym-damage.mjs [--write]
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYM_WEAPON_MAP } from './sym-weapon-map.mjs';
import { hasSweetSpot } from './sweet-spot.mjs';

export const RELEASE = '1.3.3.0';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SNAPSHOT_ID = 'sym-bf6-json-damage-refresh';

const readJson = filePath => JSON.parse(readFileSync(filePath, 'utf8'));

export function loadPinnedSnapshot(root = ROOT) {
  const manifest = readJson(join(root, 'data', 'provenance', `${RELEASE}.json`));
  const entry = manifest.sources?.find(source => source.id === SNAPSHOT_ID);
  if (!entry) throw new Error(`Provenance manifest is missing the ${SNAPSHOT_ID} source entry`);
  const snapshotPath = join(root, entry.path);
  const bytes = readFileSync(snapshotPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
  if (bytes.length !== entry.bytes) throw new Error(`${entry.path}: ${bytes.length} bytes != manifest ${entry.bytes}`);
  if (sha256 !== String(entry.sha256).toUpperCase()) throw new Error(`${entry.path}: SHA-256 ${sha256} != manifest ${entry.sha256}`);
  const snapshot = JSON.parse(bytes.toString('utf8'));
  if (snapshot.info?.version !== RELEASE) throw new Error(`Snapshot declares ${snapshot.info?.version}, expected ${RELEASE}`);
  return { snapshot, entry, sha256, bytes: bytes.length };
}

/** Convert a Sym `damage` record into the site's `dmg` breakpoint array. */
export function symDamageCurve(damage) {
  const distances = damage?.dists;
  const damages = damage?.dmgs;
  if (!Array.isArray(distances) || !Array.isArray(damages)) throw new Error('Sym damage record is missing dists/dmgs');
  if (distances.length !== damages.length || distances.length === 0) {
    throw new Error(`Sym dists/dmgs length mismatch: ${distances.length}/${damages.length}`);
  }
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] < distances[i - 1]) throw new Error(`Sym dists are not ascending: ${distances.join(',')}`);
  }
  return distances.map((r, index) => ({ r, d: damages[index], source: 'Sym' }));
}

const SNAPSHOT_LABEL = 'Sym.gg 1.3.3.0 game-file curve (retrieved 2026-07-25)';

/**
 * Weapons whose confirmed behaviour needs saying out loud, because the Sym
 * curve alone reads as incomplete. See weaponExceptions in
 * data/provenance/damage-1.3.3.0.json.
 */
const WEAPON_EXCEPTION_LABELS = Object.freeze({
  m250: 'special damage profile: no falloff at any range (user-confirmed)',
});

/** UI-facing provenance label for a weapon's refreshed curve. */
export function damageSourceLabel(weapon) {
  const exception = WEAPON_EXCEPTION_LABELS[weapon.id];
  if (exception) return `${SNAPSHOT_LABEL}; ${exception}`;
  if (weapon.cls === 'Sniper Rifle') {
    // Read the window off the curve rather than a stored one, so a future Sym refresh that
    // moves a sweet spot is described by the label it produces instead of an older claim.
    return hasSweetSpot(weapon)
      ? `${SNAPSHOT_LABEL}; linear sweet-spot falloff`
      : `${SNAPSHOT_LABEL}; linear falloff, no sweet spot`;
  }
  if (weapon.cls === 'Shotgun') return `${SNAPSHOT_LABEL}; per-pellet damage with a 1 m blend at each tier boundary`;
  return `${SNAPSHOT_LABEL}; stepped tiers, provisional pending in-game confirmation`;
}

export function buildDamageUpdate(snapshot, weapons, mapEntries = SYM_WEAPON_MAP) {
  const siteIdByCodename = new Map(mapEntries.map(entry => [entry.codename, entry.siteId]));
  const curvesBySiteId = new Map();
  for (const [key, row] of Object.entries(snapshot)) {
    if (key === 'info') continue;
    const siteId = siteIdByCodename.get(row.codename);
    if (!siteId) throw new Error(`No site mapping for Sym codename ${row.codename}`);
    curvesBySiteId.set(siteId, symDamageCurve(row.damage));
  }

  const changes = [];
  const updated = weapons.map(weapon => {
    const curve = curvesBySiteId.get(weapon.id);
    if (!curve) throw new Error(`${weapon.id}: no Sym damage curve in the pinned snapshot`);
    if (JSON.stringify(weapon.dmg) !== JSON.stringify(curve)) {
      changes.push({ siteId: weapon.id, before: weapon.dmg, after: curve });
    }
    return { ...weapon, dmg: curve, damageSource: damageSourceLabel(weapon) };
  });
  return { weapons: updated, changes };
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const { snapshot, entry, sha256 } = loadPinnedSnapshot();
  const weaponsPath = join(ROOT, 'data', 'weapons.json');
  const { weapons, changes } = buildDamageUpdate(snapshot, readJson(weaponsPath));

  if (write) {
    writeFileSync(weaponsPath, `${JSON.stringify(weapons, null, 2)}\n`, 'utf8');
    // pp19 mirrors the PW5A3 model; keep its provenance breakpoints in lockstep.
    const pp19Path = join(ROOT, 'data', 'provenance', `pp19-${RELEASE}.json`);
    const pp19Provenance = readJson(pp19Path);
    pp19Provenance.damage.breakpoints = weapons.find(weapon => weapon.id === 'pp19').dmg;
    writeFileSync(pp19Path, `${JSON.stringify(pp19Provenance, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    release: RELEASE,
    snapshot: entry.path,
    sha256,
    weaponCount: weapons.length,
    changedWeaponCount: changes.length,
    wrote: write,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
