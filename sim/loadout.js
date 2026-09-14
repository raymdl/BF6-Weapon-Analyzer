import { ATTACHMENT_SLOT_KEYS } from './attachments.js';

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
  return result;
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
  delete atts.rail;
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  // A new weapon may have a reviewed base record before its in-game barrel
  // coverage exists. Keep that state fail-closed instead of silently applying
  // the site's generic Basic barrel assumption.
  atts.barrel = wa ? (wa.barrelDef ?? 'none') : 'basic';
  atts.ammo = data.WEAPON_AMMO[weapon?.id]?.def ?? 'standard';
  atts.mag = data.WEAPON_MAG[weapon?.id]?.def ?? null;
  atts.ergo = 'none';
  const normalized = normalizeAttachments(atts, weapon, data);
  for (const key of ['grip', 'laser', 'light']) if (!Object.hasOwn(normalized, key)) delete atts[key];
  Object.assign(atts, normalized);
}

/** Selectable items for one weapon slot. Shared by the editor and URL decoder. */
export function availableAttachments(weapon, key, data, atts = null) {
  const options = attachmentOptions(weapon, key, data);
  return atts ? options.filter(a => a.id === 'none'
    || attachmentCompatible(weapon, a.type ?? key, a.id, atts, data)) : options;
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
  const slot = ATTACHMENT_SLOT_KEYS.find(slot => slot.key === key);
  if (!slot) return [];
  let source = data[slot.dataKey] ?? [];
  let allowed = wa?.[key];
  // Sights are shared unless the weapon explicitly restricts them.
  if (key === 'sight' && allowed == null) return source;
  return source.filter(a => slot.isBarrel
    ? a.id !== 'none' && allowed?.includes(a.id)
    : a.id === 'none' || allowed?.includes(a.id));
}

export function getAttPts(a, weapon) {
  if (!a) return 0;
  return a.weaponOverrides?.[weapon?.id]?.pts ?? a.pts ?? 0;
}

export function isAssumedAtt(a) {
  return !!(a?.assumed || (a?.assumedFields && Object.keys(a.assumedFields).length));
}

export function computeAttPts(atts, weapon, data) {
  const wid = weapon?.id;
  if (!wid) return 0;
  atts = normalizeAttachments(atts, weapon, data);
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG[wid] ?? null;
  const magPts = wm?.mags?.[atts.mag ?? wm?.def]?.pts ?? 0;
  const ergoPts = lookups.ERGOS[atts.ergo ?? 'none']?.pts ?? 0;
  const mounts = resolveMountAttachments(atts, weapon, data);
  return (data.WEAPON_ATTS[wid]?.sightPoints?.[atts.sight ?? 'iron'] ?? getAttPts(lookups.SIGHTS[atts.sight ?? 'iron']))
    + getAttPts(lookups.MUZZLES[atts.muzzle], weapon)
    + getAttPts(lookups.BARRELS[atts.barrel])
    + Object.values(mounts).reduce((sum, item) => sum + getAttPts(item), 0)
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
  return selected.some(isAssumedAtt);
}
