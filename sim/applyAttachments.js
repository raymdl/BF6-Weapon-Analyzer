import { resolveHitMultipliers } from './damage.js';

/**
 * sim/applyAttachments.js — Applies attachment effects to a raw weapon object.
 *
 * Call setAttachmentContext() once after JSON data is fetched, passing all
 * the attachment and balance table data. Then call applyAttachments(w, atts)
 * freely — it reads from the stored context rather than needing data threaded
 * through every call.
 *
 * Usage:
 *   import { setAttachmentContext, applyAttachments, wLabel } from './sim/applyAttachments.js';
 *
 *   // After fetching data/attachments.json, data/ammo.json, data/balance_tables.json:
 *   setAttachmentContext({
 *     MUZZLES, BARRELS, GRIPS, LASERS, ERGOS, WEAPON_MAG, WEAPON_ERGO,
 *     AMMO,
 *     RECOIL_MULT, HIP_SPREAD_TABLE, HIP_SPREAD_BASE_INDEX, HIP_SPREAD_BASE_INDEX_OVERRIDES,
 *     BASE_HS_MULT, COLLATERAL_MULT_OVERRIDE, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
 *     MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
 *     ADS_SPD_TIERS, ADS_MOVE_TIERS,
 *     DRAW_TIME_TABLES,
 *     VELOCITY_LADDER, HEALTH_REGEN_DELAY_S,
 *   });
 *
 *   // Then call freely:
 *   const modifiedWeapon = applyAttachments(rawWeapon, selectedAtts);
 */

// ── ATTACHMENT CONTEXT ────────────────────────────────────────────────────────

let _ctx = {
  MUZZLES: [], BARRELS: [], GRIPS: [], LASERS: [], LIGHTS: [],
  AMMO: [], ERGOS: [], WEAPON_MAG: {}, WEAPON_ERGO: {}, WEAPON_AMMO: {},
  MUZZLES_BY_ID: {}, BARRELS_BY_ID: {}, GRIPS_BY_ID: {}, LASERS_BY_ID: {}, LIGHTS_BY_ID: {},
  AMMO_BY_ID: {}, ERGOS_BY_ID: {},
  RECOIL_MULT: {}, HIP_SPREAD_TABLE: [], HIP_SPREAD_BASE_INDEX: {}, HIP_SPREAD_BASE_INDEX_OVERRIDES: {},
  BASE_HS_MULT: {}, COLLATERAL_MULT_OVERRIDE: {}, HP_HS_HIGH: new Set(),
  LIMB_CLASS: {}, LIMB_CLASS_MULT: {}, AUTO_HS_MULT: {},
  MOVING_ACC_TIERS: [], DEFAULT_MOV_TIER: 3,
  ADS_SPD_TIERS: [], ADS_MOVE_TIERS: [],
  DRAW_TIME_TABLES: null,
  RELOAD_SPEED_MULTIPLIERS: [1, 1.13, 1.277],
  VELOCITY_LADDER: 0.8,
  HEALTH_REGEN_DELAY_S: 5,
};

// JavaScript cannot represent 0.8 exactly. Correct only a product that is
// infinitesimally below an integer because of that representation error; real
// fractional display values such as 837.5 must still floor normally.
export const VELOCITY_DISPLAY_EPSILON = 1e-9;

export function floorVelocityDisplay(value) {
  const nearest = Math.round(value);
  if (nearest > value && nearest - value < VELOCITY_DISPLAY_EPSILON) return nearest;
  return Math.floor(value);
}

function byId(items) {
  return Object.fromEntries((items ?? []).map(item => [item.id, item]));
}

function hasOwn(record, field) {
  return record != null && Object.hasOwn(record, field);
}

function millisecondsToSeconds(milliseconds) {
  return milliseconds == null ? null : milliseconds / 1000;
}

function invalidDrawTime(reason) {
  return {
    valid: false,
    reason,
    sprint: null,
    deploy: null,
    undeploy: null,
  };
}

function integerField(record, field) {
  return Number.isInteger(record?.[field]);
}

function clampTierCoordinate(rawIndex, table) {
  if (!Array.isArray(table) || table.length === 0) return null;
  const index = Math.max(0, Math.min(table.length - 1, rawIndex));
  return {
    rawIndex,
    index,
    clamped: index !== rawIndex,
    value: table[index],
  };
}

/**
 * Resolve the Frosty base indices against the full source arrays (slow to fast).
 * Attachment shifts retain the catalog convention: negative means faster.
 * Sum each axis independently, then clamp once. Deploy and undeploy share an index.
 */
export function resolveDrawTime({
  weaponMag = null,
  sprintRecoveryTierShift = 0,
  deployTimeTierShift = 0,
  tables = _ctx.DRAW_TIME_TABLES,
} = {}) {
  const tableKey = weaponMag?.deployTimeTable;
  if (tableKey !== 'primary' && tableKey !== 'sidearm') {
    return invalidDrawTime('invalid-deploy-time-table');
  }
  const sprintTable = tables?.sprint;
  const deployTable = tables?.[tableKey]?.deploy;
  const undeployTable = tables?.[tableKey]?.undeploy;
  if ([sprintTable, deployTable, undeployTable].some(table =>
    !Array.isArray(table) || table.length === 0
    || table.some(value => !Number.isFinite(value) || value < 0))
    || deployTable.length !== undeployTable.length) {
    return invalidDrawTime('invalid-draw-time-tables');
  }
  for (const [field, table] of [
    ['sprintRecoveryBaseIndex', sprintTable], ['deployBaseIndex', deployTable],
  ]) {
    if (!integerField(weaponMag, field) || weaponMag[field] < 0
        || weaponMag[field] >= table.length) {
      return invalidDrawTime('invalid-base-time-index');
    }
  }
  if (!Number.isInteger(sprintRecoveryTierShift) || !Number.isInteger(deployTimeTierShift)) {
    return invalidDrawTime('non-integer-attachment-shift');
  }
  const sprintIndex = weaponMag.sprintRecoveryBaseIndex - sprintRecoveryTierShift;
  const deployIndex = weaponMag.deployBaseIndex - deployTimeTierShift;
  return {
    valid: true,
    reason: 'frosty-time-arrays',
    sprint: { baseIndex: weaponMag.sprintRecoveryBaseIndex,
      index: clampTierCoordinate(sprintIndex, sprintTable) },
    deploy: { table: tableKey, baseIndex: weaponMag.deployBaseIndex,
      index: clampTierCoordinate(deployIndex, deployTable) },
    undeploy: { table: tableKey, baseIndex: weaponMag.deployBaseIndex,
      index: clampTierCoordinate(deployIndex, undeployTable) },
  };
}

/**
 * Resolve the pre-barrel muzzle velocity for an ammunition type.
 *
 * Subsonic loads sit outside the normal-ammo velocity ladder, so their drop is
 * carried per weapon/ammo pair in `WEAPON_AMMO[weaponId].velocityTreatments`
 * rather than inferred. A `subsonic-tier` treatment steps the weapon's base
 * velocity down the shared 0.8 ladder; the absolute kinds pin a directly
 * transcribed value. The barrel multiplier is applied by the caller, so an
 * absolute treatment is the velocity at the capture barrel.
 */
export function resolveAmmoVelocity({
  baseVelocityMps = null,
  treatment = null,
  velocityLadder = _ctx.VELOCITY_LADDER,
} = {}) {
  if (baseVelocityMps == null) return { velocity: null, reason: 'missing-base-velocity' };
  if (!treatment) return { velocity: baseVelocityMps, reason: 'no-treatment' };

  if (treatment.kind === 'subsonic-tier') {
    const tier = treatment.subsonicVelocityTier;
    if (!Number.isInteger(tier) || tier < 0) {
      return { velocity: baseVelocityMps, reason: 'invalid-subsonic-tier' };
    }
    return { velocity: baseVelocityMps * velocityLadder ** tier, reason: 'subsonic-tier' };
  }

  const absolute = treatment.subsonicVelocityMps;
  if (Number.isFinite(absolute) && absolute > 0) {
    return { velocity: absolute, reason: treatment.kind ?? 'subsonic-absolute' };
  }
  return { velocity: baseVelocityMps, reason: 'unrecognized-treatment' };
}

/**
 * Resolve a barrel's normal-velocity multiplier while the legacy and derived
 * fields coexist. Positive velTierMod is the velocity buff direction: the
 * signed field therefore applies the inverse power of the 0.8 ladder.
 */
export function resolveBarrelVelocity({ barData = null, velocityLadder = _ctx.VELOCITY_LADDER } = {}) {
  const hasVelTierMod = hasOwn(barData, 'velTierMod');
  const hasVelMult = hasOwn(barData, 'velMult');

  if (hasVelTierMod) {
    const validTier = typeof barData.velTierMod === 'number'
      && Number.isFinite(barData.velTierMod)
      && Number.isInteger(barData.velTierMod);
    const validLadder = typeof velocityLadder === 'number'
      && Number.isFinite(velocityLadder)
      && velocityLadder > 0;
    if (!validTier || !validLadder) {
      return { multiplier: null, branch: 'derived', mode: 'tier', reason: 'invalid-derived-input' };
    }
    const multiplier = velocityLadder ** (-barData.velTierMod);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return { multiplier: null, branch: 'derived', mode: 'tier', reason: 'invalid-derived-result' };
    }
    return {
      multiplier,
      branch: 'derived',
      mode: 'tier',
      velTierMod: barData.velTierMod,
      reason: 'derived-tier',
    };
  }

  if (typeof barData?.velMult === 'number' && Number.isFinite(barData.velMult) && barData.velMult > 0) {
    return { multiplier: barData.velMult, branch: 'legacy', mode: 'velMult', reason: 'legacy-velMult' };
  }
  return { multiplier: null, branch: 'legacy', mode: 'velMult', reason: 'missing-legacy-velMult' };
}

/**
 * Resolve tactical reload timing from the derived attachment model.
 *
 * `branch`, `mode`, and `reason` are deliberately returned by this narrow helper
 * for focused tests; applyAttachments only exposes the resolved tactical reload.
 * Invalid or unsupported scalar reload inputs fail closed with a null timing.
 */
export function resolveReloadTiming({
  weaponTacRld,
  magData = null,
  ergoData = null,
} = {}) {
  const hasReloadSpeedTier = hasOwn(magData, 'reloadSpeedTier');
  const hasTacRldOverride = hasOwn(magData, 'tacRldOverrideMs');
  const hasReloadSpeedMult = hasOwn(ergoData, 'reloadSpeedMult');

  const validReloadSpeedTier = !hasReloadSpeedTier
    || (typeof magData.reloadSpeedTier === 'number'
      && Number.isFinite(magData.reloadSpeedTier)
      && Number.isInteger(magData.reloadSpeedTier)
      && magData.reloadSpeedTier >= 0);
  const validTacRldOverride = !hasTacRldOverride
    || (typeof magData.tacRldOverrideMs === 'number'
      && Number.isFinite(magData.tacRldOverrideMs)
      && Number.isInteger(magData.tacRldOverrideMs)
      && magData.tacRldOverrideMs > 0);
  const validReloadSpeedMult = !hasReloadSpeedMult
    || (typeof ergoData.reloadSpeedMult === 'number'
      && Number.isFinite(ergoData.reloadSpeedMult)
      && ergoData.reloadSpeedMult > 0);
  if (!validReloadSpeedTier || !validTacRldOverride || !validReloadSpeedMult) {
    return { tacRld: null, branch: 'derived', reason: 'invalid-derived-input' };
  }

  if (hasTacRldOverride) {
    const ergoMult = hasReloadSpeedMult ? ergoData.reloadSpeedMult : 1;
    const derivedTacRld = millisecondsToSeconds(magData.tacRldOverrideMs / ergoMult);
    if (!Number.isFinite(derivedTacRld) || derivedTacRld <= 0) {
      return { tacRld: null, branch: 'derived', reason: 'invalid-derived-result' };
    }
    return {
      tacRld: derivedTacRld,
      branch: 'derived',
      mode: 'override',
      reason: 'derived-override',
    };
  }

  if (typeof weaponTacRld !== 'number' || !Number.isFinite(weaponTacRld) || weaponTacRld <= 0) {
    return { tacRld: null, branch: 'derived', reason: 'invalid-derived-base' };
  }
  const magMult = _ctx.RELOAD_SPEED_MULTIPLIERS[hasReloadSpeedTier ? magData.reloadSpeedTier : 0];
  const ergoMult = hasReloadSpeedMult ? ergoData.reloadSpeedMult : 1;
  const derivedTacRld = weaponTacRld / (magMult * ergoMult);
  if (!Number.isFinite(derivedTacRld) || derivedTacRld <= 0) {
    return { tacRld: null, branch: 'derived', reason: 'invalid-derived-result' };
  }
  return {
    tacRld: derivedTacRld,
    branch: 'derived',
    mode: 'normal',
    reason: 'derived-normal',
  };
}

export function setAttachmentContext(updates) {
  Object.assign(_ctx, updates);
  if (updates.MUZZLES) _ctx.MUZZLES_BY_ID = byId(_ctx.MUZZLES);
  if (updates.BARRELS) _ctx.BARRELS_BY_ID = byId(_ctx.BARRELS);
  if (updates.GRIPS) _ctx.GRIPS_BY_ID = byId(_ctx.GRIPS);
  if (updates.LASERS) _ctx.LASERS_BY_ID = byId(_ctx.LASERS);
  if (updates.LIGHTS) _ctx.LIGHTS_BY_ID = byId(_ctx.LIGHTS);
  if (updates.AMMO) _ctx.AMMO_BY_ID = byId(_ctx.AMMO);
  if (updates.ERGOS) _ctx.ERGOS_BY_ID = byId(_ctx.ERGOS);
}


// ── CORE FUNCTION ─────────────────────────────────────────────────────────────

/**
 * Return a new weapon object with all attachment effects applied.
 * `w` is a raw weapon from weapons.json; `atts` is the selected attachment set.
 * Does NOT mutate `w`.
 */
export function applyAttachments(w, atts) {
  if (!w || !atts) return w;

  const {
    MUZZLES, BARRELS, GRIPS, LASERS, AMMO, ERGOS, WEAPON_MAG, WEAPON_ERGO,
    MUZZLES_BY_ID, BARRELS_BY_ID, GRIPS_BY_ID, LASERS_BY_ID, AMMO_BY_ID, ERGOS_BY_ID,
    RECOIL_MULT, HIP_SPREAD_TABLE, HIP_SPREAD_BASE_INDEX, HIP_SPREAD_BASE_INDEX_OVERRIDES,
    BASE_HS_MULT, COLLATERAL_MULT_OVERRIDE, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
    MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
    ADS_SPD_TIERS, ADS_MOVE_TIERS,
    DRAW_TIME_TABLES,
  } = _ctx;

  const muz = MUZZLES_BY_ID[atts.muzzle] ?? MUZZLES[0];
  const bar = BARRELS_BY_ID[atts.barrel] ?? BARRELS[0];
  const velocityResolution = resolveBarrelVelocity({ barData: bar });
  // Combined slot: atts.laser may hold a grip or light ID for weapons like VZ.61/GRT-BC/SL9
  const laserIsGrip  = !LASERS_BY_ID[atts.laser] && !!GRIPS_BY_ID[atts.laser];
  const laserIsLight = !LASERS_BY_ID[atts.laser] && !laserIsGrip && !!_ctx.LIGHTS_BY_ID[atts.laser];
  const grp = laserIsGrip ? GRIPS_BY_ID[atts.laser]  : (GRIPS_BY_ID[atts.grip]  ?? GRIPS[0]);
  const las = laserIsGrip ? LASERS[0]                  : (LASERS_BY_ID[atts.laser] ?? LASERS[0]);
  const lit = laserIsLight
    ? _ctx.LIGHTS_BY_ID[atts.laser]
    : (_ctx.LIGHTS_BY_ID[atts.light] ?? _ctx.LIGHTS[0]);
  const ammoBase = AMMO_BY_ID[atts.ammo ?? 'standard'] ?? AMMO[0];
  const ammoType = { ...ammoBase, ..._ctx.WEAPON_AMMO?.[w.id]?.effectOverrides?.[ammoBase.id] };
  const projectile = _ctx.WEAPON_AMMO?.[w.id]?.projectileOverrides?.[ammoType.id];

  // ── Ergonomics (declared early — used in ADS recoil calc below) ──────────────
  const ergoData = ERGOS_BY_ID[atts.ergo ?? 'none'] ?? ERGOS[0];
  const ergoAdsRecoilTierMod = ergoData.adsRecoilTierMod ?? 0;

  // ── ADS Recoil ──────────────────────────────────────────────────────────────
  // Tier formula: effectiveRecoilV = recoilV × ADSRecoilAmountMultiplier ^ (sum of tier mods)
  const totalAdsRecoilTierMod = (grp.adsRecoilTierMod ?? 0)
    + (muz.adsRecoilTierMod ?? 0)
    + (ammoType.adsRecoilTierMod ?? 0)
    + ergoAdsRecoilTierMod;
  const totalHipRecoilTierMod = (grp.hipRecoilTierMod ?? 0)
    + (muz.hipRecoilTierMod ?? 0)
    + (ammoType.hipRecoilTierMod ?? 0)
    + (ergoData.hipRecoilTierMod ?? 0);
  const totalHipVarTierMod = (grp.hipRecoilVariationTierMod ?? 0)
    + (muz.hipRecoilVariationTierMod ?? 0)
    + (ergoData.hipRecoilVariationTierMod ?? 0);
  const mult = RECOIL_MULT[w.id] ?? 0.94;
  const adsRecoilPerShot       = +(w.recoilV * Math.pow(mult, totalAdsRecoilTierMod)).toFixed(3);
  const adsRecoilReductionPct  = +(100 * (1 - Math.pow(mult, totalAdsRecoilTierMod))).toFixed(1);

  // ADS recoil variation tier ladder (same scheme as recoil amount):
  // effective = ADSRecoilDirectionVariation × ADSRecoilDirectionVariationMultiplier
  //             ^ (ADSRecoilDirectionVariationMultiplierExponent + sum of tier mods)
  // The multiplier and baked-in exponent are per-weapon (recoil.ads group).
  const totalAdsVarTierMod = (muz.adsRecoilVariationTierMod ?? 0)
    + (grp.adsRecoilVariationTierMod ?? 0)
    + (ergoData.adsRecoilVariationTierMod ?? 0);
  const adsVarGroup = w.recoil?.ads;
  const adsRecoilVariation = +((adsVarGroup?.dirVar ?? w.recoilVar ?? 0)
    * Math.pow(adsVarGroup?.dirVarMult ?? 1, (adsVarGroup?.dirVarExp ?? 0) + totalAdsVarTierMod)).toFixed(3);

  // ── Display tags ─────────────────────────────────────────────────────────────
  // Sight is deliberately absent: it never changes the numbers the label sits above.
  const tags = [muz, bar, grp, las, lit].filter(a => a && a.id !== 'none').map(a => a.name);

  // ── ADS time ─────────────────────────────────────────────────────────────────
  const combinedAdsTimeTierMod = (grp.adsTimeTierMod ?? 0) + (bar.adsTimeTierMod ?? 0);

  // ── Weapon sway ───────────────────────────────────────────────────────────────
  const sightSway  = atts.sight === 'iron' ? -1 : 0;
  const selectedMag = WEAPON_MAG[w.id]?.mags?.[atts.mag ?? WEAPON_MAG[w.id]?.def];
  const weaponSway = (muz.sway ?? 0) + sightSway + (selectedMag?.sway ?? 0);

  // ── Hip spread tier shift ─────────────────────────────────────────────────────
  // Catalog shifts have the opposite sign to Frosty's source index modifiers.
  // Keep source row order: shotgun ammunition crosses into a separate range.
  const hipSpreadTierMod = (muz.hipSpreadTierMod ?? 0)
    + (bar.hipSpreadTierMod ?? 0)
    + (las.hipSpreadTierMod ?? 0)
    + (grp.hipSpreadTierMod ?? 0)
    + (ammoType.hipSpreadTierMod ?? 0);
  const hipBaseIndex = HIP_SPREAD_BASE_INDEX_OVERRIDES[w.id] ?? HIP_SPREAD_BASE_INDEX[w.id];
  const hipRow = Number.isInteger(hipBaseIndex)
    ? HIP_SPREAD_TABLE[Math.max(0, Math.min(HIP_SPREAD_TABLE.length - 1, hipBaseIndex - hipSpreadTierMod))]
    : null;
  let spreadOverride = null;
  if (hipRow && w.spread) {
    spreadOverride = { ...w.spread };
    for (const key of ['hipStand', 'hipMove']) {
      if (w.spread[key]) spreadOverride[key] = [hipRow[key], w.spread[key][1]];
    }
  }

  // ── Spread per shot ───────────────────────────────────────────────────────────
  // Heavy-type barrel modifiers target ADS. Hip spread keeps its own parameters.
  const spreadIncMult = bar.adsSpreadIncMult ?? 1;
  const spreadDynBase = w.spreadDyn
    ? { ...w.spreadDyn,
      ads: { ...w.spreadDyn.ads, ...ammoType.adsSpreadDynOverride, ...ergoData.adsSpreadDynOverride },
      hip: { ...w.spreadDyn.hip, ...ergoData.hipSpreadDynOverride },
    }
    : w.spreadDyn;
  const adsSpreadInc = ergoData.adsSpreadDynOverride?.inc ?? ammoType.adsSpreadDynOverride?.inc ?? w.recoilIncAds;
  const spreadDynOverride = spreadIncMult === 1 || !spreadDynBase
    ? spreadDynBase
    : Object.fromEntries(Object.entries(spreadDynBase).map(([state, dyn]) => [
      state,
      state === 'ads' && dyn?.inc != null ? { ...dyn, inc: +(dyn.inc * spreadIncMult).toFixed(3) } : dyn,
    ]));

  // ── Headshot & limb multipliers ───────────────────────────────────────────────
  // Update 1.3.3.0: limb (arm/leg/abdomen) damage multiplier by limb class, and
  // raised headshot multipliers for automatic weapons (per ammo type).
  const {
    headshotMultiplier: hsMult,
    limbMultiplier: limbMult,
    limbClass,
  } = resolveHitMultipliers(w.id, ammoType, {
    BASE_HS_MULT, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
  });

  // ── Ammo velocity ─────────────────────────────────────────────────────────────
  const ammoVelocity = resolveAmmoVelocity({
    baseVelocityMps: w.bulletVel,
    treatment: _ctx.WEAPON_AMMO?.[w.id]?.velocityTreatments?.[ammoType.id] ?? null,
  });
  const projectileVelocityMps = ammoVelocity.velocity != null && velocityResolution.multiplier != null
    ? ammoVelocity.velocity * velocityResolution.multiplier
    : null;

  // ── Spot-on-fire ranges ───────────────────────────────────────────────────────
  // Muzzle, barrel and ammo suppress the signature; the tighter range wins.
  // A subsonic load fired through a suppressor drops 2D spotting further than
  // either does alone, carried as the ammo's suppressed minimap range.
  const suppressedMinimapSpot = muz.suppressor === true || bar.suppressor === true
    ? ammoType.suppressedMinimapSpot
    : null;
  const worldSpot = Math.min(muz.worldSpot ?? 54, bar.worldSpot ?? Infinity, ammoType.worldSpot ?? Infinity);
  const minimapSpot = Math.min(
    muz.minimapSpot ?? 150,
    bar.minimapSpot ?? Infinity,
    suppressedMinimapSpot ?? ammoType.minimapSpot ?? Infinity,
  );

  // ── Enemy health regeneration delay ───────────────────────────────────────────
  // Time before a hit enemy starts regenerating. The global baseline is the
  // 5s carried in balance_tables; frangible rounds hold the victim at 9s.
  const healthRegenDelayS = ammoType.healthRegenDelayS ?? _ctx.HEALTH_REGEN_DELAY_S;

  // ── Ammo display ──────────────────────────────────────────────────────────────
  // Ammo always shows, default included — a shared image should never leave the
  // reader guessing whether Standard was a choice or just the slot being empty.
  // Display-only casing, mirroring attDisplayName in loadout.js — the overview
  // label would otherwise read "#01 BUCK" while the sidebar reads "#01 Buck".
  const ammoName = ammoType.id !== 'none' ? ammoType.name.replace(/\bBUCK\b/g, 'Buck') : null;
  const collateralMult = COLLATERAL_MULT_OVERRIDE[w.id]?.[ammoType.id]
    ?? ammoType.collateralMult?.[w.cls] ?? null;

  // ── Magazine stats ────────────────────────────────────────────────────────────
  const wm       = WEAPON_MAG[w.id] ?? null;
  const magId    = atts.mag ?? wm?.def ?? null;
  const magData  = wm?.mags?.[magId] ?? null;
  const magAdsTimeTierShift       = magData?.adsTimeTierShift       ?? 0;
  const magAdsMoveSpeedTierShift  = magData?.adsMoveSpeedTierShift  ?? 0;

  // ── Moving ADS spread ─────────────────────────────────────────────────────────
  // High-capacity belt boxes name this axis in their descriptions, so magazines
  // contribute alongside the grip, laser and barrel.
  const movingAdsSpreadTierMod = (grp.movingAdsSpreadTierMod ?? 0)
    + (las.movingAdsSpreadTierMod ?? 0)
    + (bar.movingAdsSpreadTierMod ?? 0)
    + (magData?.movingAdsSpreadTierMod ?? 0);
  const movingAdsSpreadTier    = Math.min(
    Math.max(DEFAULT_MOV_TIER + movingAdsSpreadTierMod, 0),
    MOVING_ACC_TIERS.length - 1,
  );
  const movingAdsMinSpreadDeg  = MOVING_ACC_TIERS[movingAdsSpreadTier];

  const magMag    = magData?.mag   ?? null;
  const reloadResolution = resolveReloadTiming({
    weaponTacRld: w.tacRld,
    magData,
    ergoData,
  });

  // ── Tier index resolution ─────────────────────────────────────────────────────
  // Tables and weapon bases use Frosty's source order: higher means faster.
  // Catalog magazine/movement shifts have the opposite sign; ADS tier mods do not.
  // Sum all contributions before clamping to the table's 0-based bounds.
  let _adsTimeMs = null, _sprintRecoveryMs = null, _adsMoveSpeedMult = null, _deployTimeMs = null, _undeployTimeMs = null;
  let _drawTimeResolution = null;
  if (wm?.defAds != null && wm?.defAms != null) {
    const adsIdx = Math.max(0, Math.min(ADS_SPD_TIERS.length - 1,
      wm.defAds - magAdsTimeTierShift + combinedAdsTimeTierMod));
    const amsIdx = Math.max(0, Math.min(ADS_MOVE_TIERS.length - 1,
      wm.defAms - magAdsMoveSpeedTierShift
      - (grp.adsMoveSpeedTierShift ?? 0)
      - (ammoType.adsMoveSpeedTierShift ?? 0)));
    _adsTimeMs       = ADS_SPD_TIERS[adsIdx];
    _adsMoveSpeedMult = ADS_MOVE_TIERS[amsIdx];
    const timingAttachments = [magData, grp, ergoData, bar, muz, las, lit, ammoType];
    _drawTimeResolution = resolveDrawTime({
      weaponMag: wm,
      sprintRecoveryTierShift: timingAttachments.reduce(
        (sum, attachment) => sum + (attachment?.sprintRecoveryTierShift ?? 0), 0),
      deployTimeTierShift: timingAttachments.reduce(
        (sum, attachment) => sum + (attachment?.deployTimeTierShift ?? 0), 0),
      tables: DRAW_TIME_TABLES,
    });
    if (_drawTimeResolution.valid) {
      _sprintRecoveryMs = _drawTimeResolution.sprint.index.value;
      _deployTimeMs = _drawTimeResolution.deploy.index.value;
      _undeployTimeMs = _drawTimeResolution.undeploy.index.value;
    }
  }

  // ── Label ─────────────────────────────────────────────────────────────────────
  // Magazine likewise always shows; magData already resolves to the weapon's
  // default mag when no mag is selected, so this covers the stock case too.
  const magTags  = magData?.name ? [magData.name] : [];
  const ergoTags = ergoData.id !== 'none' ? [ergoData.name] : [];
  const allTags  = [...tags, ...(ammoName ? [ammoName] : []), ...magTags, ...ergoTags];
  const fireMode = ergoData.setsFireModeAuto ? 'auto'
    : ergoData.setsFireModeBurst ? 'burst'
      : w.fireMode;
  const burstRounds = ergoData.setsFireModeAuto ? undefined
    : ergoData.burstRounds ?? w.burstRounds;
  const burstBurstsPerMinute = ergoData.setsFireModeAuto ? undefined
    : ergoData.burstBurstsPerMinute ?? w.burstBurstsPerMinute;
  const burstRpm = ergoData.setsFireModeAuto ? undefined
    : ergoData.burstRpm ?? w.burstRpm;
  // A receiver that converts the weapon to full auto can also cycle it faster
  // than its stock rate: the VSSM fires 450 semi and 800 with the Folding Stock.
  const autoRpm = ergoData.setsFireModeAuto
    ? ergoData.autoRpm ?? w.autoRpm ?? null
    : null;
  const recoilOverride = w.recoil && (totalHipRecoilTierMod || totalHipVarTierMod || ergoData.recoilDurationAdd)
    ? Object.fromEntries(Object.entries(w.recoil).map(([state, group]) => [state, {
      ...group,
      ...(state === 'hip' && totalHipRecoilTierMod
        ? { amountExp: (group.amountExp ?? 0) + totalHipRecoilTierMod } : {}),
      ...(state === 'hip' && totalHipVarTierMod
        ? { dirVarExp: (group.dirVarExp ?? 0) + totalHipVarTierMod } : {}),
      ...(group.duration != null && ergoData.recoilDurationAdd
        ? { duration: +(group.duration + ergoData.recoilDurationAdd).toFixed(6) } : {}),
    }]))
    : w.recoil;

  return {
    ...w,
    ...(projectile ? { pellets: projectile.pellets, dmg: projectile.dmg } : {}),
    _label:                  allTags.length ? `${w.name} (${allTags.join(' · ')})` : w.name,
    _adsRecoilReductionPct:  adsRecoilReductionPct,
    _adsSpreadDecayBoost:    muz.adsSpreadDecayBoost ?? 0,
    _adsSpreadFiringDecCoefMult:   bar.adsSpreadFiringDecCoefMult ?? 1,
    _adsSpreadFiringDecOffsetMult: bar.adsSpreadFiringDecOffsetMult ?? 1,
    _adsRecoilDecayMult:     muz.adsRecoilDecayMult ?? 1,
    _hipSpreadDecayBoost:    lit?.hipSpreadDecayBoost ?? 0,
    _worldSpot:              worldSpot,
    _minimapSpot:            minimapSpot,
    _weaponSway:             weaponSway,
    _visualRecoil:           ergoData.visualRecoil ?? 0,
    _laserVisible:           las.laserVisible ?? null,
    _movingAdsSpreadTierMod: movingAdsSpreadTierMod,
    _movingAdsMinSpreadDeg:  movingAdsMinSpreadDeg,
    _adsTimeTierMod:         combinedAdsTimeTierMod,
    _adsTimeMs, _sprintRecoveryMs, _adsMoveSpeedMult, _deployTimeMs, _undeployTimeMs,
    _hsMult:                 hsMult,
    _limbMult:               limbMult,
    _limbClass:              limbClass,
    _collateralMult:         collateralMult,
    _hipSpreadTierMod:       hipSpreadTierMod,
    _healthRegenDelayS:      healthRegenDelayS,
    rpm:         fireMode === 'auto' && autoRpm ? autoRpm
      : fireMode === 'burst' && burstRpm ? burstRpm : w.rpm,
    autoRpm,
    fireMode,
    burstRounds,
    burstBurstsPerMinute,
    burstRpm,
    spread:      spreadOverride ?? w.spread,
    spreadDyn:   spreadDynOverride,
    recoil:      recoilOverride,
    recoilV:     adsRecoilPerShot,
    recoilVar:   adsRecoilVariation,
    recoilIncAds: adsSpreadInc != null
      ? +(adsSpreadInc * spreadIncMult).toFixed(3)
      : null,
    _projectileVelocityMps: projectileVelocityMps,
    bulletVel: projectileVelocityMps != null
      ? floorVelocityDisplay(projectileVelocityMps)
      : null,
    deployT: millisecondsToSeconds(_deployTimeMs),
    undeployT: millisecondsToSeconds(_undeployTimeMs),
    mag:    magMag ?? w.mag,
    tacRld: reloadResolution.tacRld,
  };
}


// ── UTILITY ───────────────────────────────────────────────────────────────────

/** Returns the weapon's display label (includes attachment names if applied). */
export function wLabel(w) {
  return (w && w._label) ? w._label : (w ? w.name : '');
}
