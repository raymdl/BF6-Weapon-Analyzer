import { ATTACHMENT_SLOT_KEYS } from './attachments.js';
import { normalizeFireMode } from './fire-modes.js';

const MOUNT_CATALOGS = { grip: 'GRIPS', laser: 'LASERS', light: 'LIGHTS' };

export function attachmentSlots(weapon, data) {
  return data.WEAPON_ATTS?.[weapon?.id]?.slots ?? {};
}

/** Options retain their attachment type independently of their physical slot. */
export function availableMountAttachments(weapon, slot, data) {
  const wa = data.WEAPON_ATTS?.[weapon?.id];
  return (attachmentSlots(weapon, data)[slot]?.accepts ?? []).flatMap(type =>
    (data[MOUNT_CATALOGS[type]] ?? []).filter(a => a.id !== 'none' && wa[type]?.includes(a.id))
      .map(a => ({ ...a, type })));
}

/** Convert old shared-slot state once; an explicit rail selection takes priority. */
export function normalizeMountAtts(atts, weapon, data) {
  const result = { ...atts };
  const slots = attachmentSlots(weapon, data);
  if (slots.rail) {
    const options = availableMountAttachments(weapon, 'rail', data);
    const selected = Object.hasOwn(atts, 'rail')
      ? options.find(a => a.id === atts.rail?.id && a.type === atts.rail?.type)
      : options.find(a => a.id === atts.laser)
        ?? options.find(a => a.type === 'light' && a.id === atts.light)
        ?? options.find(a => a.type === 'grip' && a.id === atts.grip);
    result.rail = selected ? { type: selected.type, id: selected.id } : null;
    for (const type of slots.rail.accepts) delete result[type];
  } else {
    delete result.rail;
  }
  return result;
}

function defaultSelection(weapon, slot, data) {
  if (slot === 'mag') return data.WEAPON_MAG?.[weapon?.id]?.def ?? null;
  if (slot === 'barrel') return data.WEAPON_ATTS?.[weapon?.id]?.barrelDef ?? 'basic';
  if (slot === 'ammo') return data.WEAPON_AMMO?.[weapon?.id]?.def ?? 'standard';
  return slot === 'sight' ? 'iron' : 'none';
}

function selectedAttachment(weapon, slot, atts, data) {
  if (attachmentSlots(weapon, data).rail?.accepts.includes(slot)) {
    return atts.rail?.type === slot ? atts.rail.id : 'none';
  }
  return atts[slot] ?? defaultSelection(weapon, slot, data);
}

/** Frosty equipment dependencies list alternative permitted prerequisites. */
export function attachmentCompatible(weapon, slot, id, atts, data) {
  return (data.WEAPON_ATTS?.[weapon?.id]?.dependencies ?? [])
    .filter(rule => rule.slot === slot && rule.attachment === id)
    .every(rule => rule.requiresAny.some(required =>
      selectedAttachment(weapon, required.slot, atts, data) === required.attachment));
}

/** Remove dependent selections when their prerequisites no longer apply. */
export function normalizeAttachments(atts, weapon, data) {
  const result = normalizeMountAtts(atts, weapon, data);
  const rules = data.WEAPON_ATTS?.[weapon?.id]?.dependencies ?? [];
  // A removal can invalidate another dependent choice. Bound the fixed-point pass.
  for (let pass = 0; pass <= rules.length; pass++) {
    let changed = false;
    for (const rule of rules) {
      if (selectedAttachment(weapon, rule.slot, result, data) !== rule.attachment
          || attachmentCompatible(weapon, rule.slot, rule.attachment, result, data)) continue;
      if (attachmentSlots(weapon, data).rail?.accepts.includes(rule.slot)) {
        result.rail = null;
      } else {
        const fallback = defaultSelection(weapon, rule.slot, data);
        result[rule.slot] = fallback === rule.attachment ? 'none' : fallback;
      }
      changed = true;
    }
    if (!changed) break;
  }
  return normalizeFireMode(result, weapon);
}

/** The single source of selected grip/laser/light records for all consumers. */
export function resolveMountAttachments(atts, weapon, data) {
  const normalized = normalizeAttachments(atts, weapon, data);
  const resolved = Object.fromEntries(Object.entries(MOUNT_CATALOGS).map(([type, catalog]) =>
    [type, (data[catalog] ?? []).find(a => a.id === 'none') ?? { id: 'none', pts: 0 }]));
  for (const [slot, definition] of Object.entries(attachmentSlots(weapon, data))) {
    const selection = slot === 'rail' ? normalized.rail : { type: definition.accepts[0], id: normalized[slot] };
    const item = availableMountAttachments(weapon, slot, data)
      .find(a => a.id === selection?.id && a.type === selection?.type);
    if (item) resolved[item.type] = { ...item, ...item.frostyModifiers?.[weapon.id] };
  }
  return resolved;
}

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
      ACCESSORIES: byId(data.ACCESSORIES),
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
    accessory: 'none',
  };
}

export function resetAttsForWeapon(atts, weapon, data) {
  atts.sight = 'iron';
  atts.muzzle = 'none';
  atts.grip = 'none';
  atts.laser = 'none';
  atts.light = 'none';
  delete atts.rail;
  delete atts.fireMode;
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  // A new weapon may have a reviewed base record before its in-game barrel
  // coverage exists. Keep that state fail-closed instead of silently applying
  // the site's generic Basic barrel assumption.
  atts.barrel = wa ? (wa.barrelDef ?? 'none') : 'basic';
  atts.ammo = data.WEAPON_AMMO[weapon?.id]?.def ?? 'standard';
  atts.mag = data.WEAPON_MAG[weapon?.id]?.def ?? null;
  atts.ergo = 'none';
  atts.accessory = 'none';
  const normalized = normalizeAttachments(atts, weapon, data);
  for (const key of ['grip', 'laser', 'light']) if (!Object.hasOwn(normalized, key)) delete atts[key];
  Object.assign(atts, normalized);
}

const CATALOG_OF = { ...MOUNT_CATALOGS, ergo: 'ERGOS', accessory: 'ACCESSORIES',
  ...Object.fromEntries(ATTACHMENT_SLOT_KEYS.map(slot => [slot.key, slot.dataKey])) };

/** The catalog record behind one slot choice (sight, muzzle, barrel, grip, laser, light, ergo, accessory). */
export function catalogRecord(data, key, id) {
  return (data[CATALOG_OF[key]] ?? []).find(a => a.id === id) ?? null;
}

// The one attachment under different names by weapon family: the 5-point brake
// is the Single-Port Brake, the Slant Brake or the Thread Protector, and the
// 10-point brake the Double-Port or Triple-Port Brake (sniper-specific effects
// are weapon overrides on these records). Matching cost and effects alone do
// not make two records one attachment (Rail Cover and Speed Holster, two optics
// of one zoom), so the list is explicit.
const SAME_ATTACHMENT = [
  ['sp_brake', 'slant_brake', 'thread_prot'],
  ['dp_brake', 'tp_brake'],
];

/**
 * The one attachment split into records by weapon family, with its own cost
 * or effects on each (Slim Angled is four records): the same catalog name. A
 * per-weapon display name does not count, since the game can mislabel one
 * attachment as another (the ELR-40 shows its Lightened Suppressor as the
 * CQB Suppressor).
 */
export function sameAttachmentName(a, b) {
  return !!a && !!b && a.id !== b.id && b.name === a.name;
}

/**
 * Whether two records are one attachment: the same name with weapon-specific
 * cost or effects, or one of the names SAME_ATTACHMENT lists together. Legacy
 * sight categories stand for no single optic and never match.
 */
export function equivalentAttachments(a, b) {
  if (!a || !b || a.legacy || b.legacy || a.id === b.id) return false;
  return sameAttachmentName(a, b) || SAME_ATTACHMENT.some(group => group.includes(a.id) && group.includes(b.id));
}

/** Selectable items for one weapon slot. Shared by the editor and URL decoder. */
/** Move a loadout's attachments onto another weapon: every choice the new
 *  weapon can take is kept, or the same attachment under another name where
 *  the weapon has that instead; the rest go back to that weapon's defaults.
 *  `from` is the loadout to carry (the slot's own by default) and `keys`
 *  limits which slots are carried; a combined rail uses the UI's laser lock key. */
export function carryAttsToWeapon(atts, weapon, data, from = atts, keys = null) {
  const prev = { ...from };
  const wanted = key => !keys || keys.includes(key);
  resetAttsForWeapon(atts, weapon, data);
  const mounts = attachmentSlots(weapon, data);
  const onRail = key => !!mounts.rail?.accepts.includes(key);
  // The choice itself if the weapon offers it, else the record of the same
  // name on this weapon, else one with the same cost and effects, else null.
  const carried = (key, id) => {
    const offered = availableAttachments(weapon, onRail(key) ? 'rail' : key, data)
      .filter(a => a.id !== 'none' && (!onRail(key) || a.type === key));
    if (offered.some(a => a.id === id)) return id;
    const want = catalogRecord(data, key, id);
    return (offered.find(a => sameAttachmentName(want, a))
      ?? offered.find(a => equivalentAttachments(want, a)))?.id ?? null;
  };
  const fit = (key, id) => { if (onRail(key)) atts.rail = { type: key, id }; else atts[key] = id; };
  for (const key of ['sight', 'muzzle', 'barrel', 'grip', 'laser', 'light', 'ammo', 'ergo', 'accessory']) {
    if (!wanted(key) || !prev[key] || prev[key] === 'none') continue;
    const id = carried(key, prev[key]);
    if (id) fit(key, id);
  }
  if (prev.rail && wanted('laser')) {
    // The device moves between a shared rail and the new weapon's own slot as needed.
    const id = carried(prev.rail.type, prev.rail.id);
    if (id) fit(prev.rail.type, id);
  }
  if (wanted('mag') && prev.mag && Object.hasOwn(data.WEAPON_MAG[weapon?.id]?.mags ?? {}, prev.mag)) atts.mag = prev.mag;
  const normalized = normalizeAttachments(atts, weapon, data);
  for (const key of ['grip', 'laser', 'light', 'rail', 'fireMode']) if (!Object.hasOwn(normalized, key)) delete atts[key];
  Object.assign(atts, normalized);
}
export function availableAttachments(weapon, key, data, atts = null) {
  const options = attachmentOptions(weapon, key, data);
  return atts ? options.filter(a => a.id === 'none'
    || attachmentCompatible(weapon, a.type ?? key, a.id, atts, data)) : options;
}

/**
 * Old share links name a sight category (Standard Optic, Thermal...). It now
 * stands for the weapon's lowest-magnification optic of that category.
 */
export function resolveLegacySight(weapon, id, data) {
  if (!data.SIGHTS?.find(sight => sight.id === id)?.legacy) return id;
  const low = sight => sight.magnificationRange?.[0] ?? sight.magnification;
  return attachmentOptions(weapon, 'sight', data).filter(sight => sight.category === id)
    .reduce((best, sight) => (best && low(best) <= low(sight) ? best : sight), null)?.id ?? id;
}

function attachmentOptions(weapon, key, data) {
  if (!weapon) return [];
  const wa = data.WEAPON_ATTS?.[weapon.id];
  if (key === 'rail' || Object.hasOwn(MOUNT_CATALOGS, key)) {
    return [{ id: 'none', name: 'None', pts: 0 }, ...availableMountAttachments(weapon, key, data)];
  }
  if (key === 'mag') return Object.entries(data.WEAPON_MAG?.[weapon.id]?.mags ?? {})
    .map(([id, item]) => ({ ...item, id }));
  if (key === 'ammo') return (data.AMMO ?? []).filter(a =>
    Object.hasOwn(data.WEAPON_AMMO?.[weapon.id]?.ammo ?? {}, a.id));
  if (key === 'ergo') return (data.ERGOS ?? []).filter(a =>
    a.id === 'none' || data.WEAPON_ERGO?.[weapon.id]?.avail?.includes(a.id));
  if (key === 'accessory') return (data.ACCESSORIES ?? []).filter(a =>
    a.id === 'none' || data.WEAPON_ACCESSORY?.[weapon.id]?.avail?.includes(a.id));
  const slot = ATTACHMENT_SLOT_KEYS.find(slot => slot.key === key);
  if (!slot) return [];
  let source = data[slot.dataKey] ?? [];
  let allowed = wa?.[key];
  // Sights are shared unless the weapon explicitly restricts them.
  if (key === 'sight' && allowed == null) return source.filter(a => !a.legacy);
  return source.filter(a => slot.isBarrel
    ? a.id !== 'none' && allowed?.includes(a.id)
    : a.id === 'none' || allowed?.includes(a.id));
}

export function getAttPts(a, weapon) {
  if (!a) return 0;
  return a.weaponOverrides?.[weapon?.id]?.pts ?? a.pts ?? 0;
}

/**
 * Whether one assumed field applies to this weapon. A field stored as a
 * per-weapon map (`<field>ByWeapon`) is assumed only on weapons the map covers.
 */
export function isAssumedField(a, field, weaponId = null) {
  if (!Object.hasOwn(a?.assumedFields ?? {}, field)) return false;
  const byWeapon = a[`${field}ByWeapon`];
  return weaponId == null || !byWeapon || Object.hasOwn(byWeapon, weaponId);
}

export function isAssumedAtt(a, weaponId = null) {
  return !!(a?.assumed || Object.keys(a?.assumedFields ?? {}).some(field => isAssumedField(a, field, weaponId)));
}

export function computeAttPts(atts, weapon, data) {
  const wid = weapon?.id;
  if (!wid) return 0;
  atts = normalizeAttachments(atts, weapon, data);
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG[wid] ?? null;
  const magPts = wm?.mags?.[atts.mag ?? wm?.def]?.pts ?? 0;
  const ergoPts = lookups.ERGOS[atts.ergo ?? 'none']?.pts ?? 0;
  const accessoryPts = lookups.ACCESSORIES[atts.accessory ?? 'none']?.pts ?? 0;
  const mounts = resolveMountAttachments(atts, weapon, data);
  return (data.WEAPON_ATTS[wid]?.sightPoints?.[atts.sight ?? 'iron'] ?? getAttPts(lookups.SIGHTS[atts.sight ?? 'iron']))
    + getAttPts(lookups.MUZZLES[atts.muzzle], weapon)
    + getAttPts(lookups.BARRELS[atts.barrel])
    + Object.values(mounts).reduce((sum, item) => sum + getAttPts(item), 0)
    + (data.WEAPON_AMMO[wid]?.ammo?.[atts.ammo ?? 'standard'] ?? 0)
    + magPts
    + ergoPts
    + accessoryPts;
}

// Display-only casing fix: the corpus stores buckshot as "#01 BUCK"/"#00 BUCK",
// which shouts next to every other title-cased option. The data keeps its name.
// A weapon override may carry the name the game shows for that weapon's version.
const displayName = (a, weaponId = null) =>
  (a.weaponOverrides?.[weaponId]?.name ?? a.name).replace(/\bBUCK\b/g, 'Buck');

export function attDisplayName(a, weaponId = null) {
  return isAssumedAtt(a, weaponId) ? `${displayName(a, weaponId)}*` : displayName(a, weaponId);
}

// Marks a choice whose in-game effect differs from its description. The site
// models the in-game behavior; the note records what the description promises.
export const GAME_BUG_MARK = '†';

/** Confirmed in-game bugs (data/attachments.json GAME_BUGS) for one weapon choice. */
export function gameBugsFor(data, weaponId, slot, attId) {
  return (data.GAME_BUGS ?? []).filter(bug => bug.slot === slot
    && bug.weapons.includes(weaponId) && bug.attachments.includes(attId));
}

/** Bugs for the selected loadout, each with the display name of its attachment. */
export function selectedGameBugs(atts, data, weapon) {
  if (!atts || !weapon || !data.GAME_BUGS?.length) return [];
  atts = normalizeAttachments(atts, weapon, data);
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG?.[weapon.id];
  const magId = atts.mag ?? wm?.def;
  const ammoId = atts.ammo ?? data.WEAPON_AMMO?.[weapon.id]?.def;
  const picks = [
    ['sight', lookups.SIGHTS[atts.sight ?? 'iron']],
    ['muzzle', lookups.MUZZLES[atts.muzzle]],
    ['barrel', lookups.BARRELS[atts.barrel]],
    ...Object.entries(resolveMountAttachments(atts, weapon, data)),
    ['ammo', lookups.AMMO[ammoId]],
    ['mag', magId && wm?.mags?.[magId] ? { ...wm.mags[magId], id: magId } : null],
    ['ergo', lookups.ERGOS[atts.ergo]],
  ];
  return picks.flatMap(([slot, att]) => att?.id
    ? gameBugsFor(data, weapon.id, slot, att.id).map(bug => ({ ...bug, attachmentName: displayName(att, weapon.id) }))
    : []);
}

export function hasSelectedAssumedAtt(atts, data, weapon = null) {
  if (!atts) return false;
  atts = normalizeAttachments(atts, weapon, data);
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG?.[weapon?.id];
  const selected = [
    lookups.SIGHTS[atts.sight ?? 'iron'],
    lookups.MUZZLES[atts.muzzle],
    lookups.BARRELS[atts.barrel],
    ...Object.values(resolveMountAttachments(atts, weapon, data)),
    lookups.AMMO[atts.ammo],
    lookups.ERGOS[atts.ergo],
    wm?.mags?.[atts.mag ?? wm.def],
  ];
  return selected.some(a => isAssumedAtt(a, weapon?.id));
}
