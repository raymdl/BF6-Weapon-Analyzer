/**
 * sim/soldier-classes.js — Soldier classes, their signature sets and training paths.
 *
 * A slot's `soldier` is `{ cls, path }` (ids below) or null for no class. Only
 * entries with an `effect` change the site's numbers; the rest are listed for
 * reference in the class popup. Names and wording follow the in-game Class
 * Details and Select Training Path screens (2.1.1.0); values come from the
 * Frosty research receipts L4070 (weapon traits) and L108 (Steady Aim).
 *
 * Weapon-trait `effect` fields use the attachment catalog's names and signs:
 * sprint recovery, draw and hip spread shifts are negative for better, the ADS
 * time tier mod positive for faster.
 */

// Every sniper rifle carries a weapon sway penalty that only the Recon trait
// cancels (float32 operands 2.25 and 0.4444444; their product is 0.99999987).
export const SNIPER_SWAY_PENALTY = 2.25;

export const SOLDIER_CLASSES = [
  {
    id: 'assault', name: 'Assault', weaponClass: 'Assault Rifle', defaultPath: 'breacher',
    gadget: { name: 'Adrenaline Injector', text: 'Brief sprint boost and resistance to explosives, flash and stun.' },
    weapon: { name: 'Assault Rifle Proficiency', text: 'Assault rifles draw, holster and fire out of a sprint faster.',
      effect: { sprintRecoveryTierShift: -1, deployTimeTierShift: -1 } },
    trait: { name: 'Mission Focused', text: 'Nearby squadmates progress objectives faster.' },
    ability: { name: 'Rally Squad', text: 'You and nearby squadmates gain a temporary adrenaline effect.' },
    paths: [
      { id: 'breacher', name: 'Breacher', perks: [
        { name: 'Extra Grenades', text: 'Carry one more grenade.' },
        { name: 'Agile Shooter', text: 'Less movement speed lost when firing while moving.' },
        { name: 'Unrelenting Reload', text: '15% faster reload for the incendiary shotgun and the grenade and breaching launchers.' },
      ] },
      { id: 'frontliner', name: 'Frontliner', perks: [
        { name: 'Adrenaline Rush', text: 'Squadmates who deploy on you or your beacon get 2s of the Adrenaline Injector.' },
        { name: 'Soft Landing', text: 'Reduced impact from falls and jumps.' },
        { name: 'Quick Recovery', text: 'Health regeneration starts 50% sooner and healing is 50% better.' },
      ] },
    ],
  },
  {
    id: 'engineer', name: 'Engineer', weaponClass: 'SMG', defaultPath: 'anti-armor',
    gadget: { name: 'Repair Tool', text: 'Repairs friendly vehicles and equipment; damages enemy ones.' },
    weapon: { name: 'SMG Proficiency', text: 'SMGs have tighter hipfire spread.',
      effect: { hipSpreadTierMod: -1 } },
    trait: { name: 'Mechanized Infantry', text: 'Less explosive damage near friendly vehicles; empty ones cannot be taken by enemies.' },
    ability: { name: 'Thermal Overdrive', text: 'Repair Tool works 50% faster for 10s.' },
    paths: [
      { id: 'anti-armor', name: 'Anti-Armor', perks: [
        { name: 'Extra Rockets', text: 'Carry two more rockets.' },
        { name: 'Launcher Proficiency', text: '15% faster launcher reloads.' },
        { name: 'Devastating Impact', text: 'Vehicles you damage repair 25% less effectively for 10s.' },
      ] },
      { id: 'combat-engineer', name: 'Combat Engineer', perks: [
        { name: 'Gadget Fortification', text: 'Repairing a friendly gadget permanently raises its maximum health.' },
        { name: 'Overheat Control', text: 'Heat builds 50% slower on gadgets and 10% slower on vehicle weapons.' },
        { name: 'Mine Detection', text: 'Spot mines within 30 m, on foot or in a vehicle.' },
      ] },
    ],
  },
  {
    id: 'support', name: 'Support', weaponClass: 'LMG', defaultPath: 'combat-medic',
    gadget: { name: 'Supply Bag', text: 'Resupplies nearby infantry and speeds up their health regeneration.' },
    weapon: { name: 'LMG Proficiency', text: 'LMGs aim down sights faster and carry no sprint speed penalty.',
      effect: { adsTimeTierMod: 1 } },
    trait: { name: 'Field Sustainment', text: 'Teammates who interact with you receive a health pack.' },
    ability: { name: 'Restock Allies', text: 'Resupply and heal nearby allies for 10s; revives take 1.7s.' },
    paths: [
      { id: 'combat-medic', name: 'Combat Medic', perks: [
        { name: 'Urgent Aid', text: 'Drag downed soldiers 20% faster and revive them 2.5s quicker.' },
        { name: 'Revive Recovery', text: 'Reviving a teammate starts your health regeneration.' },
        { name: 'Defense-Focused', text: 'Defensive gadgets resupply 25% faster and last longer; Deployable Cover takes 10% less damage.' },
      ] },
      { id: 'fire-support', name: 'Fire Support', perks: [
        { name: 'Logistics Expert', text: 'Faster ammo resupply from the Supply Bag.' },
        { name: 'Explosives Resistant', text: '25% less explosive splash damage while prone or mounted.' },
        { name: 'Steady Aim', text: 'Less recoil when firing from a mounted position.',
          effect: { mountedRecoilTierMod: 3 } },
      ] },
    ],
  },
  {
    id: 'recon', name: 'Recon', weaponClass: 'Sniper Rifle', defaultPath: 'sniper',
    gadget: { name: 'Motion Sensor', text: 'Spots nearby moving enemies, vehicles and gadgets.' },
    weapon: { name: 'Sniper Rifle Proficiency', text: 'Sniper rifles sway less and rechamber faster. Hold breath to steady the scope.',
      effect: { weaponSwayMult: 0.4444443881511688 } },
    trait: { name: 'Aim-Spot', text: 'Enemies you look at while aiming down sights are spotted for your team.' },
    ability: { name: 'UAV Overwatch', text: 'A UAV follows you and spots enemies within 100 m for 60s.' },
    paths: [
      { id: 'sniper', name: 'Sniper', perks: [
        { name: 'Enhanced Perception', text: 'Auto-spotting reaches 33% further, is quicker and lasts 3s longer.' },
        { name: 'Target Acquired', text: 'Enemies you damage are spotted.' },
        { name: 'Confirmed Kill', text: 'Sniper rifle headshot kills cannot be revived.' },
      ] },
      { id: 'spec-ops', name: 'Spec Ops', perks: [
        { name: 'Stealth Tactics', text: 'Quieter while crouched, prone or performing a takedown.' },
        { name: 'Gadget Awareness', text: 'Spots nearby enemy gadgets while you are not sprinting.' },
        { name: 'Low Profile', text: 'Going prone leaves combat 1.5s sooner; you stay spotted 33% less time.' },
      ] },
    ],
  },
];

const BY_ID = Object.fromEntries(SOLDIER_CLASSES.map(c => [c.id, c]));

/** The class record for an id, or null. */
export function soldierClass(id) {
  return BY_ID[id] ?? null;
}

/** A valid `{ cls, path }` (an unknown path falls back to the class default), or null. */
export function normalizeSoldier(soldier) {
  const cls = BY_ID[soldier?.cls];
  if (!cls) return null;
  const path = cls.paths.some(p => p.id === soldier.path) ? soldier.path : cls.defaultPath;
  return { cls: cls.id, path };
}

/**
 * What a soldier changes for one weapon type: `weaponTrait` is the signature
 * weapon record when the weapon is that class's own type (else null), and
 * `mountedRecoilTierMod` the recoil exponent tiers the selected path adds
 * while mounted, on any weapon.
 */
export function soldierEffects(soldier, weaponCls) {
  const picked = normalizeSoldier(soldier);
  const cls = picked && BY_ID[picked.cls];
  const path = cls?.paths.find(p => p.id === picked.path);
  return {
    soldier: picked,
    weaponTrait: cls?.weaponClass === weaponCls ? { id: cls.id, name: cls.weapon.name, ...cls.weapon.effect } : null,
    mountedRecoilTierMod: (path?.perks ?? []).reduce((sum, perk) => sum + (perk.effect?.mountedRecoilTierMod ?? 0), 0),
  };
}
