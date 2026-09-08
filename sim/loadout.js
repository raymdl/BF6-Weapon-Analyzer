import { ATTACHMENT_SLOT_KEYS } from './attachments.js';

const lookupCache = new WeakMap();

function byId(items) {
  return Object.fromEntries((items ?? []).map(item => [item.id, item]));
}

function getLookups(data) {
  let lookups = lookupCache.get(data);
  if (!lookups) {
    lookups = {
      SIGHTS: byId(data.SIGHTS),
      MUZZLES: byId(data.MUZZLES),
      BARRELS: byId(data.BARRELS),
      GRIPS: byId(data.GRIPS),
      LASERS: byId(data.LASERS),
      LIGHTS: byId(data.LIGHTS),
      AMMO: byId(data.AMMO),
      ERGOS: byId(data.ERGOS),
    };
    lookupCache.set(data, lookups);
  }
  return lookups;
}

export function blankAtts() {
  return {
    sight: 'iron',
    muzzle: 'none',
    barrel: 'none',
    grip: 'none',
    laser: 'none',
    light: 'none',
    ammo: 'standard',
    mag: null,
    ergo: 'none',
  };
}

export function resetAttsForWeapon(atts, weapon, data) {
  atts.sight = 'iron';
  atts.muzzle = 'none';
  atts.grip = 'none';
  atts.laser = 'none';
  atts.light = 'none';
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  // A new weapon may have a reviewed base record before its in-game barrel
  // coverage exists. Keep that state fail-closed instead of silently applying
  // the site's generic Basic barrel assumption.
  atts.barrel = wa ? (wa.barrelDef ?? 'none') : 'basic';
  atts.ammo = data.WEAPON_AMMO[weapon?.id]?.def ?? 'standard';
  atts.mag = data.WEAPON_MAG[weapon?.id]?.def ?? null;
  atts.ergo = 'none';
}

/** Selectable items for one weapon slot. Shared by the editor and URL decoder. */
export function availableAttachments(weapon, key, data) {
  if (!weapon) return [];
  const wa = data.WEAPON_ATTS?.[weapon.id];
  if (key === 'mag') return Object.entries(data.WEAPON_MAG?.[weapon.id]?.mags ?? {})
    .map(([id, item]) => ({ ...item, id }));
  if (key === 'ammo') return (data.AMMO ?? []).filter(a =>
    Object.hasOwn(data.WEAPON_AMMO?.[weapon.id]?.ammo ?? {}, a.id));
  if (key === 'ergo') return (data.ERGOS ?? []).filter(a =>
    a.id === 'none' || data.WEAPON_ERGO?.[weapon.id]?.avail?.includes(a.id));
  const slot = ATTACHMENT_SLOT_KEYS.find(slot => slot.key === key);
  if (!slot) return [];
  let source = data[slot.dataKey] ?? [];
  if ((key === 'light' && wa?.laserLightCombined)
      || (key === 'grip' && wa?.laserGripLightCombined)) {
    return source.filter(a => a.id === 'none');
  }
  let allowed = wa?.[key];
  if (key === 'laser' && wa?.laserLightCombined) {
    allowed = [...(allowed ?? []), ...(wa.light ?? [])];
    source = wa.laserGripLightCombined
      ? [...source.filter(a => a.id === 'none'), ...(data.GRIPS ?? []).filter(a => a.id !== 'none'),
        ...source.filter(a => a.id !== 'none'), ...(data.LIGHTS ?? []).filter(a => a.id !== 'none')]
      : [...source, ...(data.LIGHTS ?? []).filter(a => a.id !== 'none')];
  }
  // Sights are shared unless the weapon explicitly restricts them.
  if (key === 'sight' && allowed == null) return source;
  return source.filter(a => slot.isBarrel
    ? a.id !== 'none' && allowed?.includes(a.id)
    : a.id === 'none' || allowed?.includes(a.id));
}

export function getAttPts(a) {
  if (!a) return 0;
  return a.pts ?? 0;
}

export function isAssumedAtt(a) {
  return !!(a?.assumed || (a?.assumedFields && Object.keys(a.assumedFields).length));
}

export function computeAttPts(atts, weapon, data) {
  const wid = weapon?.id;
  if (!wid) return 0;
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG[wid] ?? null;
  const magPts = wm?.mags?.[atts.mag ?? wm?.def]?.pts ?? 0;
  const ergoPts = lookups.ERGOS[atts.ergo ?? 'none']?.pts ?? 0;
  // Combined slot: atts.laser may hold a grip or light ID
  const laserGrip  = !lookups.LASERS[atts.laser] && !!lookups.GRIPS?.[atts.laser]
    ? lookups.GRIPS[atts.laser]
    : null;
  const laserLight = !lookups.LASERS[atts.laser] && !laserGrip && !!lookups.LIGHTS?.[atts.laser]
    ? lookups.LIGHTS[atts.laser]
    : null;
  return (data.WEAPON_ATTS[wid]?.sightPoints?.[atts.sight ?? 'iron'] ?? getAttPts(lookups.SIGHTS[atts.sight ?? 'iron']))
    + getAttPts(lookups.MUZZLES[atts.muzzle])
    + getAttPts(lookups.BARRELS[atts.barrel])
    + getAttPts(laserGrip ?? lookups.GRIPS[atts.grip])
    + getAttPts(laserGrip ? null : lookups.LASERS[atts.laser])
    + getAttPts(laserLight ?? lookups.LIGHTS[atts.light])
    + (data.WEAPON_AMMO[wid]?.ammo?.[atts.ammo ?? 'standard'] ?? 0)
    + magPts
    + ergoPts;
}

// Display-only casing fix: the corpus stores buckshot as "#01 BUCK"/"#00 BUCK",
// which shouts next to every other title-cased option. The data keeps its name.
const displayName = a => a.name.replace(/\bBUCK\b/g, 'Buck');

export function attDisplayName(a) {
  return isAssumedAtt(a) ? `${displayName(a)}*` : displayName(a);
}

export function hasSelectedAssumedAtt(atts, data, weapon = null) {
  if (!atts) return false;
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG?.[weapon?.id];
  const selected = [
    lookups.SIGHTS[atts.sight ?? 'iron'],
    lookups.MUZZLES[atts.muzzle],
    lookups.BARRELS[atts.barrel],
    lookups.GRIPS[atts.grip],
    lookups.LASERS[atts.laser] ?? lookups.GRIPS[atts.laser] ?? lookups.LIGHTS[atts.laser],
    lookups.LIGHTS[atts.light],
    lookups.AMMO[atts.ammo],
    lookups.ERGOS[atts.ergo],
    wm?.mags?.[atts.mag ?? wm.def],
  ];
  return selected.some(isAssumedAtt);
}
