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
 *     BASE_HS_MULT, HP_HS_HIGH,
 *     MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
 *     ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS,
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
  MOVING_ACC_TIERS: [], DEFAULT_MOV_TIER: 3,
  ADS_SPD_TIERS: [], SPRINT_REC_TIERS: [], ADS_MOVE_TIERS: [],
};

function byId(items) {
  return Object.fromEntries((items ?? []).map(item => [item.id, item]));
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
    BASE_HS_MULT, HP_HS_HIGH,
    MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
    ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS,
  } = _ctx;

  const muz = MUZZLES_BY_ID[atts.muzzle] ?? MUZZLES[0];
  const bar = BARRELS_BY_ID[atts.barrel] ?? BARRELS[0];
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

  // ADS-only multiplier on ADSRecoilDirectionVariation-derived recoilVar
  const adsRecoilVariation = +(w.recoilVar
    * (muz.adsRecoilVariationMult ?? 1)
    * (grp.adsRecoilVariationMult ?? 1)).toFixed(3);

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

  // ── Headshot multiplier ───────────────────────────────────────────────────────
  const baseHsMult = BASE_HS_MULT[w.id] ?? 1.34;
  const hsMult = ammoType.hsMult === null || ammoType.hsMult === undefined
    ? baseHsMult
    : ammoType.hsMult === 'hp'
      ? (HP_HS_HIGH.has(w.id) ? 1.75 : 1.5)
      : ammoType.hsMult;

  // ── Ammo display ──────────────────────────────────────────────────────────────
  const ammoName = ammoType.id !== 'standard' ? ammoType.name : null;

  // ── Magazine stats ────────────────────────────────────────────────────────────
  const wm       = WEAPON_MAG[w.id] ?? null;
  const magId    = atts.mag ?? wm?.def ?? null;
  const magData  = wm?.mags?.[magId] ?? null;
  const magAdsTimeTierShift       = magData?.adsTimeTierShift       ?? 0;
  const magSprintRecoveryTierShift = magData?.sprintRecoveryTierShift ?? 0;
  const magAdsMoveSpeedTierShift  = magData?.adsMoveSpeedTierShift  ?? 0;
  const magMag    = magData?.mag   ?? null;
  const magTacRld = magData?.tacRld ?? null;

  // Mag Catch tacRld override: use per-weapon reload time based on fast/regular mag
  const we = WEAPON_ERGO[w.id] ?? null;
  let magCatchTacRld = null;
  if (ergoData.id === 'mag_catch' && we?.magCatchRld) {
    const isFastMag = !!(magData?.name?.toLowerCase().includes('fast'));
    const rld = isFastMag ? (we.magCatchRld.fast ?? we.magCatchRld.reg) : we.magCatchRld.reg;
    if (rld != null) magCatchTacRld = rld;
  }

  // ── Tier index resolution ─────────────────────────────────────────────────────
  // Clamp all tier indices to [0, 7] (8 tiers total, 0-based).
  let _adsTimeMs = null, _sprintRecoveryMs = null, _adsMoveSpeedMult = null;
  if (wm) {
    const adsIdx = Math.max(0, Math.min(7,
      (wm.defAds - 1) + magAdsTimeTierShift - combinedAdsTimeTierMod));
    const sprIdx = Math.max(0, Math.min(7,
      (wm.defSpr - 1) + magSprintRecoveryTierShift + ergoSprintRecoveryTierShift));
    const amsIdx = Math.max(0, Math.min(7,
      (wm.defAms - 1) + magAdsMoveSpeedTierShift
      + (grp.adsMoveSpeedTierShift ?? 0)
      + (ammoType.adsMoveSpeedTierShift ?? 0)));
    _adsTimeMs       = ADS_SPD_TIERS[adsIdx];
    _sprintRecoveryMs = SPRINT_REC_TIERS[sprIdx];
    _adsMoveSpeedMult = ADS_MOVE_TIERS[amsIdx];
  }

  // ── Label ─────────────────────────────────────────────────────────────────────
  const magTags  = magData?.name && magData.name !== wm?.mags?.[wm?.def]?.name ? [magData.name] : [];
  const ergoTags = ergoData.id !== 'none' ? [ergoData.name] : [];
  const allTags  = [...tags, ...(ammoName ? [ammoName] : []), ...magTags, ...ergoTags];

  return {
    ...w,
    _label:                  allTags.length ? `${w.name} (${allTags.join(' · ')})` : w.name,
    _adsRecoilReductionPct:  adsRecoilReductionPct,
    _adsSpreadDecayBoost:    muz.adsSpreadDecayBoost ?? 0,
    _hipSpreadDecayBoost:    lit?.hipSpreadDecayBoost ?? 0,
    _worldSpot:              muz.worldSpot   ?? 54,
    _minimapSpot:            muz.minimapSpot ?? 150,
    _weaponSway:             weaponSway,
    _visualRecoil:           ergoData.visualRecoil ?? 0,
    _movingAdsSpreadTierMod: movingAdsSpreadTierMod,
    _movingAdsMinSpreadDeg:  movingAdsMinSpreadDeg,
    _adsTimeTierMod:         combinedAdsTimeTierMod,
    _adsTimeMs, _sprintRecoveryMs, _adsMoveSpeedMult,
    _hsMult:                 hsMult,
    _hipSpreadTierMod:       hipSpreadTierMod,
    fireMode:    ergoData.setsFireModeAuto ? 'auto' : w.fireMode,
    burstRounds: ergoData.setsFireModeAuto ? undefined : w.burstRounds,
    spread:      spreadOverride ?? w.spread,
    recoilV:     adsRecoilPerShot,
    recoilVar:   adsRecoilVariation,
    recoilIncAds: w.recoilIncAds != null
      ? +(w.recoilIncAds * (bar.adsSpreadIncMult ?? 1)).toFixed(3)
      : null,
    bulletVel: w.bulletVel != null ? Math.round(w.bulletVel * bar.vMult) : null,
    mag:    magMag ?? w.mag,
    tacRld: magCatchTacRld != null ? +(magCatchTacRld / 1000).toFixed(3)
          : magTacRld      != null ? +(magTacRld      / 1000).toFixed(3)
          : w.tacRld,
  };
}


// ── UTILITY ───────────────────────────────────────────────────────────────────

/** Returns the weapon's display label (includes attachment names if applied). */
export function wLabel(w) {
  return (w && w._label) ? w._label : (w ? w.name : '');
}
