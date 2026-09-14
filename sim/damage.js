import { invalidData } from './required-data.js';

/**
 * Shared damage and hit-zone helpers.
 *
 * Keep multiplier selection and mixed-hit BTK math here so the main analyzer
 * and preview tools cannot implement subtly different Update 1.3.3.0 rules.
 */

const REDUCED_BODY_ZONES = new Set(['stomach', 'abdomen', 'arm', 'arms', 'leg', 'legs', 'limb', 'limbs']);
const DAMAGE_EPSILON = 1e-9;

/**
 * Headshot and limb (arm/leg/abdomen) multipliers per weapon and ammo come from
 * Frosty through data/hit_zones.json. Regenerate that file with
 * scripts/frosty-hit-zones.py after a game update; do not add class-level tables
 * or default multipliers. A null ammo type selects the weapon's base entry.
 */
export function resolveHitMultipliers(weaponId, ammoType, { HIT_ZONES } = {}) {
  const weapon = HIT_ZONES?.weapons?.[weaponId];
  if (!weapon) invalidData(`No hit-zone data for weapon "${weaponId}"; regenerate data/hit_zones.json`);
  const resolved = ammoType == null ? weapon : weapon?.ammo?.[ammoType.id];
  if (weapon && !resolved) invalidData(`No hit-zone data for weapon "${weaponId}" ammo "${ammoType?.id}"; regenerate data/hit_zones.json`);
  return {
    headshotMultiplier: requireMultiplier(resolved?.headshot, `${weaponId} headshot`),
    limbMultiplier: requireMultiplier(resolved?.limb, `${weaponId} limb`),
  };
}

function requireMultiplier(value, label) {
  if (!Number.isFinite(value)) return invalidData(`Missing ${label} multiplier`);
  return value;
}

/**
 * Evaluate a Sym-shaped damage curve.
 *
 * `dmg` mirrors the Sym `dists`/`dmgs` pair list: an ordered polyline where a
 * repeated range is an instant tier drop and distinct ranges are a linear ramp
 * (sniper sweet spots, shotgun pellet falloff). At a repeated range the tier
 * that ends there still applies, so the NVO-228E reads 35.22 at 9 m and 27.48
 * at 10 m. Ranges outside the curve clamp to the first/last value.
 */
export function damageAtRange(weapon, range) {
  const points = weapon?.dmg;
  if (!Array.isArray(points) || points.length === 0) return null;
  if (range <= points[0].r) return points[0].d;
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const point = points[i];
    if (range > point.r) continue;
    // A repeated range keeps the outgoing tier; a ramp interpolates into it.
    if (point.r === previous.r) return previous.d;
    return previous.d + (point.d - previous.d) * ((range - previous.r) / (point.r - previous.r));
  }
  return points.at(-1).d;
}

export function damagePerShotAtRange(weapon, range) {
  const pelletCount = weapon?.pellets ?? 1;
  const damage = damageAtRange(weapon, range);
  return damage == null ? null : damage * pelletCount;
}

/** Zone multiplier for a weapon returned by applyAttachments (it sets _hsMult and _limbMult). */
export function zoneMultiplierForWeapon(weapon, zone) {
  if (zone === 'head') return requireMultiplier(weapon?._hsMult, 'headshot');
  if (REDUCED_BODY_ZONES.has(zone)) return requireMultiplier(weapon?._limbMult, 'limb');
  return 1;
}

export function bulletsToKillWithHits(damagePerShot, {
  health = 100,
  headshots = 0,
  headshotMultiplier = 1,
  bodyMultiplier = 1,
} = {}) {
  if (damagePerShot == null || !Number.isFinite(damagePerShot)
    || !Number.isFinite(headshotMultiplier) || !Number.isFinite(bodyMultiplier)) return null;
  if (!(damagePerShot > 0) || !(health > 0)) return Infinity;
  const headDamage = damagePerShot * headshotMultiplier;
  const bodyDamage = damagePerShot * bodyMultiplier;
  if (!(headDamage > 0) || !(bodyDamage > 0)) return Infinity;

  const requestedHeadshots = Math.max(0, Math.floor(headshots));
  const lethalHeadshots = Math.ceil((health - DAMAGE_EPSILON) / headDamage);
  if (requestedHeadshots >= lethalHeadshots) return lethalHeadshots;

  const remainingHealth = health - requestedHeadshots * headDamage;
  const bodyShots = Math.ceil((remainingHealth - DAMAGE_EPSILON) / bodyDamage);
  return requestedHeadshots + Math.max(0, bodyShots);
}

export function bulletsToKillAtRange(weapon, range, {
  health = 100,
  headshots = 0,
  bodyMultiplier = 1,
} = {}) {
  return bulletsToKillWithHits(damagePerShotAtRange(weapon, range), {
    health,
    headshots,
    headshotMultiplier: zoneMultiplierForWeapon(weapon, 'head'),
    bodyMultiplier,
  });
}
