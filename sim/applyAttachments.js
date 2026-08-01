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
 *     RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
 *     BASE_HS_MULT, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
 *     MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
 *     ADS_SPD_TIERS, SPRINT_REC_TIERS, DEPLOY_TIME_TIERS, ADS_MOVE_TIERS,
 *     VELOCITY_LADDER,
 *   });
 *
 *   // Then call freely:
 *   const modifiedWeapon = applyAttachments(rawWeapon, selectedAtts);
 */

// ── ATTACHMENT CONTEXT ────────────────────────────────────────────────────────

let _ctx = {
  MUZZLES: [], BARRELS: [], GRIPS: [], LASERS: [], LIGHTS: [],
  AMMO: [], ERGOS: [], WEAPON_MAG: {}, WEAPON_ERGO: {},
  MUZZLES_BY_ID: {}, BARRELS_BY_ID: {}, GRIPS_BY_ID: {}, LASERS_BY_ID: {}, LIGHTS_BY_ID: {},
  AMMO_BY_ID: {}, ERGOS_BY_ID: {},
  RECOIL_MULT: {}, HIP_SPREAD_TIERS: {}, HIP_SPREAD_BASE_IDX: {}, HIP_CLS: {},
  BASE_HS_MULT: {}, HP_HS_HIGH: new Set(),
  LIMB_CLASS: {}, LIMB_CLASS_MULT: {}, AUTO_HS_MULT: {},
  MOVING_ACC_TIERS: [], DEFAULT_MOV_TIER: 3,
  ADS_SPD_TIERS: [], SPRINT_REC_TIERS: [], PRIMARY_SPRINT_REC_TIERS: [], SIDEARM_SPRINT_REC_TIERS: [], DEPLOY_TIME_TIERS: [], ADS_MOVE_TIERS: [],
  RELOAD_SPEED_LADDER: 1.13,
  VELOCITY_LADDER: 0.8,
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
  return milliseconds == null ? null : +(milliseconds / 1000).toFixed(3);
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
  const magMult = _ctx.RELOAD_SPEED_LADDER ** (hasReloadSpeedTier ? magData.reloadSpeedTier : 0);
  const ergoMult = hasReloadSpeedMult ? ergoData.reloadSpeedMult : 1;
  const derivedTacRld = +(weaponTacRld / (magMult * ergoMult)).toFixed(3);
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
    RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
    BASE_HS_MULT, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
    MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
    ADS_SPD_TIERS, SPRINT_REC_TIERS, PRIMARY_SPRINT_REC_TIERS, SIDEARM_SPRINT_REC_TIERS, DEPLOY_TIME_TIERS, ADS_MOVE_TIERS,
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
  const ammoType = AMMO_BY_ID[atts.ammo ?? 'standard'] ?? AMMO[0];

  // ── Ergonomics (declared early — used in ADS recoil calc below) ──────────────
  const ergoData = ERGOS_BY_ID[atts.ergo ?? 'none'] ?? ERGOS[0];
  const ergoSprintRecoveryTierShift = ergoData.sprintRecoveryTierShift ?? 0;
  const ergoAdsRecoilTierMod = ergoData.adsRecoilTierMod ?? 0;

  // ── ADS Recoil ──────────────────────────────────────────────────────────────
  // Tier formula: effectiveRecoilV = recoilV × ADSRecoilAmountMultiplier ^ (sum of tier mods)
  const totalAdsRecoilTierMod = (grp.adsRecoilTierMod ?? 0)
    + (muz.adsRecoilTierMod ?? 0)
    + (ammoType.adsRecoilTierMod ?? 0)
    + ergoAdsRecoilTierMod;
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
  const tags = [muz, bar, grp, las].filter(a => a.id !== 'none').map(a => a.name);

  // ── ADS time ─────────────────────────────────────────────────────────────────
  const combinedAdsTimeTierMod = (grp.adsTimeTierMod ?? 0) + (bar.adsTimeTierMod ?? 0);

  // ── Weapon sway ───────────────────────────────────────────────────────────────
  const sightSway  = atts.sight === 'iron' ? -1 : 0;
  const weaponSway = (muz.sway ?? 0) + sightSway;

  // ── Moving ADS spread ─────────────────────────────────────────────────────────
  const movingAdsSpreadTierMod = (grp.movingAdsSpreadTierMod ?? 0)
    + (las.movingAdsSpreadTierMod ?? 0)
    + (bar.movingAdsSpreadTierMod ?? 0);
  const movingAdsSpreadTier    = Math.min(
    Math.max(DEFAULT_MOV_TIER - movingAdsSpreadTierMod, 0),
    MOVING_ACC_TIERS.length - 1,
  );
  const movingAdsMinSpreadDeg  = MOVING_ACC_TIERS[movingAdsSpreadTier];

  // ── Hip spread tier shift ─────────────────────────────────────────────────────
  // Suppressors push up 1 tier (worse accuracy), short barrel drops 1 (better)
  const hipSpreadTierMod = (muz.hipSpreadTierMod ?? 0)
    + (bar.hipSpreadTierMod ?? 0)
    + (las.hipSpreadTierMod ?? 0);
  let spreadOverride = null;
  if (hipSpreadTierMod !== 0 && w.spread) {
    const tiers = HIP_SPREAD_TIERS[HIP_CLS[w.id]];
    if (tiers) {
      spreadOverride = { ...w.spread };
      for (const [key, baseIdx] of Object.entries(HIP_SPREAD_BASE_IDX)) {
        if (!spreadOverride[key]) continue;
        const curMin = spreadOverride[key][0];
        let nearestIdx = 0, nearestDiff = Math.abs(tiers[0] - curMin);
        for (let i = 1; i < tiers.length; i++) {
          const d = Math.abs(tiers[i] - curMin);
          if (d < nearestDiff) { nearestDiff = d; nearestIdx = i; }
        }
        const newIdx = Math.max(0, Math.min(tiers.length - 1, nearestIdx + hipSpreadTierMod));
        spreadOverride[key] = [tiers[newIdx], spreadOverride[key][1]];
      }
    }
  }

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

  // ── Ammo display ──────────────────────────────────────────────────────────────
  const ammoName = ammoType.id !== 'standard' ? ammoType.name : null;
  const collateralMult = ammoType.collateralMult?.[w.cls] ?? null;

  // ── Magazine stats ────────────────────────────────────────────────────────────
  const wm       = WEAPON_MAG[w.id] ?? null;
  const magId    = atts.mag ?? wm?.def ?? null;
  const magData  = wm?.mags?.[magId] ?? null;
  const magAdsTimeTierShift       = magData?.adsTimeTierShift       ?? 0;
  const magSprintRecoveryTierShift = magData?.sprintRecoveryTierShift ?? 0;
  const magAdsMoveSpeedTierShift  = magData?.adsMoveSpeedTierShift  ?? 0;
  const gripSprintRecoveryTierShift = grp.sprintRecoveryTierShift ?? 0;
  const magMag    = magData?.mag   ?? null;
  const reloadResolution = resolveReloadTiming({
    weaponTacRld: w.tacRld,
    magData,
    ergoData,
  });

  // ── Tier index resolution ─────────────────────────────────────────────────────
  // Clamp all tier indices to each stat table's 0-based bounds.
  let _adsTimeMs = null, _sprintRecoveryMs = null, _adsMoveSpeedMult = null, _deployTimeMs = null;
  if (wm?.defAds != null && wm?.defSpr != null && wm?.defAms != null) {
    const adsIdx = Math.max(0, Math.min(ADS_SPD_TIERS.length - 1,
      wm.defAds + magAdsTimeTierShift - combinedAdsTimeTierMod));
    const sprintRecTiers = wm.sprintRecoveryTierTable === 'sidearm'
      ? (SIDEARM_SPRINT_REC_TIERS.length ? SIDEARM_SPRINT_REC_TIERS : SPRINT_REC_TIERS)
      : (PRIMARY_SPRINT_REC_TIERS.length ? PRIMARY_SPRINT_REC_TIERS : SPRINT_REC_TIERS);
    const sprIdx = Math.max(0, Math.min(sprintRecTiers.length - 1,
      wm.defSpr + magSprintRecoveryTierShift + gripSprintRecoveryTierShift + ergoSprintRecoveryTierShift));
    const amsIdx = Math.max(0, Math.min(ADS_MOVE_TIERS.length - 1,
      wm.defAms + magAdsMoveSpeedTierShift
      + (grp.adsMoveSpeedTierShift ?? 0)
      + (ammoType.adsMoveSpeedTierShift ?? 0)));
    _adsTimeMs       = ADS_SPD_TIERS[adsIdx];
    _sprintRecoveryMs = sprintRecTiers[sprIdx];
    _adsMoveSpeedMult = ADS_MOVE_TIERS[amsIdx];
    if (w.deployT != null && DEPLOY_TIME_TIERS.length) {
      const baseDeployMs = w.deployT * 1000;
      let baseDeployIdx = 0;
      for (let i = 1; i < DEPLOY_TIME_TIERS.length; i++) {
        if (Math.abs(DEPLOY_TIME_TIERS[i] - baseDeployMs) < Math.abs(DEPLOY_TIME_TIERS[baseDeployIdx] - baseDeployMs)) {
          baseDeployIdx = i;
        }
      }
      const deployIdx = Math.max(0, Math.min(DEPLOY_TIME_TIERS.length - 1,
        baseDeployIdx + magSprintRecoveryTierShift + gripSprintRecoveryTierShift));
      _deployTimeMs = DEPLOY_TIME_TIERS[deployIdx];
    }
  }

  // ── Label ─────────────────────────────────────────────────────────────────────
  const magTags  = magData?.name && magData.name !== wm?.mags?.[wm?.def]?.name ? [magData.name] : [];
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

  return {
    ...w,
    _label:                  allTags.length ? `${w.name} (${allTags.join(' · ')})` : w.name,
    _adsRecoilReductionPct:  adsRecoilReductionPct,
    _adsSpreadDecayBoost:    muz.adsSpreadDecayBoost ?? 0,
    _adsRecoilDecayMult:     muz.adsRecoilDecayMult ?? 1,
    _hipSpreadDecayBoost:    lit?.hipSpreadDecayBoost ?? 0,
    _worldSpot:              muz.worldSpot   ?? 54,
    _minimapSpot:            muz.minimapSpot ?? 150,
    _weaponSway:             weaponSway,
    _visualRecoil:           ergoData.visualRecoil ?? 0,
    _laserVisible:           las.laserVisible ?? null,
    _movingAdsSpreadTierMod: movingAdsSpreadTierMod,
    _movingAdsMinSpreadDeg:  movingAdsMinSpreadDeg,
    _adsTimeTierMod:         combinedAdsTimeTierMod,
    _adsTimeMs, _sprintRecoveryMs, _adsMoveSpeedMult, _deployTimeMs,
    _hsMult:                 hsMult,
    _limbMult:               limbMult,
    _limbClass:              limbClass,
    _collateralMult:         collateralMult,
    _hipSpreadTierMod:       hipSpreadTierMod,
    rpm:         fireMode === 'burst' && burstRpm ? burstRpm : w.rpm,
    fireMode,
    burstRounds,
    burstBurstsPerMinute,
    burstRpm,
    spread:      spreadOverride ?? w.spread,
    recoilV:     adsRecoilPerShot,
    recoilVar:   adsRecoilVariation,
    recoilIncAds: w.recoilIncAds != null
      ? +(w.recoilIncAds * (bar.adsSpreadIncMult ?? 1)).toFixed(3)
      : null,
    bulletVel: w.bulletVel != null && velocityResolution.multiplier != null
      ? floorVelocityDisplay(w.bulletVel * velocityResolution.multiplier)
      : null,
    deployT: _deployTimeMs != null ? +(_deployTimeMs / 1000).toFixed(3) : w.deployT,
    mag:    magMag ?? w.mag,
    tacRld: reloadResolution.tacRld,
  };
}


// ── UTILITY ───────────────────────────────────────────────────────────────────

/** Returns the weapon's display label (includes attachment names if applied). */
export function wLabel(w) {
  return (w && w._label) ? w._label : (w ? w.name : '');
}
