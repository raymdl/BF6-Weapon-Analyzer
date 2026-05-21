/**
 * sim/core.js — Shared simulation math for BF6 Weapon Analyzer
 *
 * Contains all pure-math functions that were previously copy-pasted across
 * index.html, preview_bloom.html, and preview_distance.html.
 *
 * Usage in each page's <script type="module">:
 *
 *   import {
 *     setSimContext, mulberry32, whash, uniformDev, applyRecoilDecay,
 *     recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
 *     selectedRecoilAmountFor, selectedRecoilVariationFor,
 *     spreadBounds, spreadDynamics, selectedSpreadIncFor,
 *     simulateBloom, shotIntervalAfter, isBurstGapAfter, genRecoilPts,
 *   } from './sim/core.js';
 *
 *   // Call once on load (after JSON data is fetched):
 *   setSimContext({ aimState, stanceState, RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
 *                  compensationFn: selectedCompensationLevel });
 *
 *   // Call again whenever aimState or stanceState changes:
 *   setSimContext({ aimState });
 */

// ── SIMULATION CONTEXT ────────────────────────────────────────────────────────
// State that varies per-page and per-user-interaction. Pages push updates here
// via setSimContext() rather than passing state through every function call.

let _ctx = {
  aimState:      'ads',
  stanceState:   'stand',
  RECOIL_DEC:    {},
  RECOIL_DEC_EXP:{},
  RECOIL_DEC_TEXP:{},
  compensationFn: () => 0,  // page provides; bloom stub returns 0
};

export function setSimContext(updates) {
  Object.assign(_ctx, updates);
}


// ── RNG ───────────────────────────────────────────────────────────────────────

/** Mulberry32 PRNG — returns a closure that emits floats in [0, 1). */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 0x100000000;
  };
}

/** Stable 32-bit hash of a string. Used to seed per-weapon RNG. */
export function whash(str) {
  let h = 0;
  for (const c of str) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return h >>> 0;
}

/** Sample uniformly across the full recoil variation range [-val, +val]. */
export function uniformDev(rng, val) {
  return (rng() * 2 - 1) * val;
}


// ── RECOIL DECAY ──────────────────────────────────────────────────────────────

/**
 * Simulate recoil recovery over one inter-shot interval (sym.gg model).
 * Formula per frame: Δr = (|r|^decExp + decOffset) × decFactor × dt × t^timeExp
 * Applied independently to vertical and horizontal components.
 */
export function applyRecoilDecay(r, decFactor, decExp, timeExp, interShotTime, decOffset = 0.06) {
  const dt = 1 / 60;
  let t = 0;
  while (t < interShotTime) {
    const step = Math.min(dt, interShotTime - t);
    t += step;
    const dec = (Math.pow(Math.abs(r), decExp) + decOffset) * decFactor * step * Math.pow(t, timeExp);
    if (r > 0) r = Math.max(0, r - dec);
    else if (r < 0) r = Math.min(0, r + dec);
  }
  return r;
}


// ── RECOIL HELPERS ────────────────────────────────────────────────────────────

/**
 * Get the recoil parameter group for a weapon in the current aim state.
 * Falls back to legacy flat fields when the weapon has no per-aim recoil object.
 */
export function recoilGroup(w) {
  const { aimState, RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP } = _ctx;
  return w.recoil?.[aimState] ?? {
    dir:         w.recoilDir,
    amount:      w.recoilV,
    amountMult:  1, amountExp: 0,
    dirVar:      w.recoilVar,
    dirVarMult:  1, dirVarExp: 0,
    decExp:      RECOIL_DEC_EXP[w.id]  ?? 1,
    decTimeExp:  RECOIL_DEC_TEXP[w.id] ?? 1.2,
    decOffset:   0.06,
    decFactor:   RECOIL_DEC[w.id]      ?? 72,
  };
}

/** ADS recoil group — used as the attachment-scaling baseline. */
export function baseRecoilGroup(w) {
  return w.recoil?.ads ?? recoilGroup(w);
}

/** Effective recoil magnitude from a group object. */
export function recoilAmount(group) {
  return (group.amount ?? 0) * Math.pow(group.amountMult ?? 1, group.amountExp ?? 0);
}

/** Effective directional variation from a group object. */
export function recoilVariation(group) {
  return (group.dirVar ?? 0) * Math.pow(group.dirVarMult ?? 1, group.dirVarExp ?? 0);
}

/**
 * Recoil amount for the current weapon + aim state, with attachment scaling.
 * In ADS the raw group amount is scaled so that attachment tier changes are
 * reflected through the ADSRecoilAmountMultiplier ladder.
 */
export function selectedRecoilAmountFor(w) {
  const g = recoilGroup(w);
  if (_ctx.aimState !== 'ads') return recoilAmount(g);
  const adsBase = recoilAmount(baseRecoilGroup(w));
  const attachmentMult = adsBase > 0 ? (w.recoilV ?? adsBase) / adsBase : 1;
  return recoilAmount(g) * attachmentMult;
}

/** Recoil directional variation for the current weapon + aim state. */
export function selectedRecoilVariationFor(w) {
  const g = recoilGroup(w);
  if (_ctx.aimState !== 'ads') return recoilVariation(g);
  const adsBase = recoilVariation(baseRecoilGroup(w));
  const attachmentMult = adsBase > 0 ? (w.recoilVar ?? adsBase) / adsBase : 1;
  return recoilVariation(g) * attachmentMult;
}


// ── SPREAD HELPERS ────────────────────────────────────────────────────────────

/**
 * [min, max] spread in degrees for the current aim+stance state.
 * Applies the _movingAdsMinSpreadDeg floor when moving ADS.
 */
export function spreadBounds(w) {
  const { aimState, stanceState } = _ctx;
  const key = `${aimState}${stanceState === 'move' ? 'Move' : 'Stand'}`;
  const bounds = w.spread?.[key]
    ?? (aimState === 'ads' ? [0.05, w.spreadMax ?? 99] : [0, w.spreadMax ?? 99]);
  if (aimState === 'ads' && stanceState === 'move' && w._movingAdsMinSpreadDeg != null)
    return [w._movingAdsMinSpreadDeg, bounds[1]];
  return bounds;
}

/**
 * Bloom spread dynamics for the current aim state.
 * For ADS, overrides `inc` with the weapon's recoilIncAds field so attachment
 * scaling of spread-per-shot is preserved.
 */
export function spreadDynamics(w) {
  const { aimState } = _ctx;
  const dyn = w.spreadDyn?.[aimState] ?? {
    inc:          aimState === 'ads' ? (w.recoilIncAds ?? 0) : 0,
    firingCoef:   aimState === 'ads' ? 1.22 : 0.51,
    firingExp:    2.5,
    firingOffset: aimState === 'ads' ? 1.84 : 3.31,
  };
  if (aimState === 'ads') return { ...dyn, inc: w.recoilIncAds ?? dyn.inc };
  return dyn;
}

/** Per-shot spread increase for the current weapon + aim state. */
export function selectedSpreadIncFor(w) {
  const { aimState } = _ctx;
  const dyn = spreadDynamics(w);
  if (aimState === 'ads') return w.recoilIncAds ?? dyn.inc ?? 0;
  return dyn.inc ?? 0;
}

/** Seconds between this shot and the next shot for the current fire mode. */
export function shotIntervalAfter(w, shotIndex) {
  const shotRpm = w.fireMode === 'burst' && w.burstRpm ? w.burstRpm : (w.rpm ?? 600);
  const normalInterval = 60 / shotRpm;
  const burstRounds = w.fireMode === 'burst' ? (w.burstRounds ?? 0) : 0;
  const burstsPerMinute = w.burstBurstsPerMinute ?? 0;
  if (burstRounds <= 1 || burstsPerMinute <= 0) return normalInterval;

  const shotInBurst = (shotIndex - 1) % burstRounds;
  if (shotInBurst < burstRounds - 1) return normalInterval;

  const burstCycle = 60 / burstsPerMinute;
  const elapsedWithinBurst = (burstRounds - 1) * normalInterval;
  return Math.max(normalInterval, burstCycle - elapsedWithinBurst);
}

/** True when the next interval is the pause after the final shot in a burst. */
export function isBurstGapAfter(w, shotIndex) {
  const burstRounds = w.fireMode === 'burst' ? (w.burstRounds ?? 0) : 0;
  const burstsPerMinute = w.burstBurstsPerMinute ?? 0;
  return burstRounds > 1
    && burstsPerMinute > 0
    && (shotIndex - 1) % burstRounds === burstRounds - 1;
}

function applySpreadRecovery(spread, seconds, recovery, baseline, sMax, dt) {
  const clamp = v => Math.min(Math.max(v, baseline), sMax);
  let rem = seconds;
  while (rem > 1e-12) {
    const step = Math.min(dt, rem);
    const delta = Math.max(spread - baseline, 0);
    spread = clamp(spread - step * (recovery.coef * Math.pow(delta, recovery.exp) + recovery.offset));
    rem -= step;
  }
  return spread;
}


// ── SIMULATION ────────────────────────────────────────────────────────────────

/**
 * Simulate bloom spread for `shotCount` shots.
 * Returns an array of per-shot pre-fire spread values in degrees.
 */
export function simulateBloom(w, shotCount) {
  const { aimState } = _ctx;
  const dyn = spreadDynamics(w);
  const [baseline, sMax] = spreadBounds(w);
  const sInc = selectedSpreadIncFor(w);
  if (sInc === 0) return Array(shotCount).fill(baseline);
  const firingRecovery = {
    coef: dyn.firingCoef ?? 0,
    exp: dyn.firingExp ?? 1,
    offset: (dyn.firingOffset ?? 0) *
      (1 + (aimState === 'ads' ? (w._adsSpreadDecayBoost ?? 0) : (w._hipSpreadDecayBoost ?? 0))),
  };
  const notFiringRecovery = {
    coef: dyn.notFiringCoef ?? firingRecovery.coef,
    exp: dyn.notFiringExp ?? firingRecovery.exp,
    offset: dyn.notFiringOffset ?? firingRecovery.offset,
  };
  const dt = 1 / 60;
  const clamp = v => Math.min(Math.max(v, baseline), sMax);
  let spread = baseline;
  const spreads = [];
  for (let shot = 0; shot < shotCount; shot++) {
    spread = clamp(spread);
    spreads.push(spread);
    spread = clamp(spread + sInc);
    if (shot < shotCount - 1) {
      const secBetweenShots = shotIntervalAfter(w, shot + 1);
      if (isBurstGapAfter(w, shot + 1)) {
        const firingTime = Math.min(60 / (w.rpm ?? 600), secBetweenShots);
        const notFiringTime = Math.max(0, secBetweenShots - firingTime);
        spread = applySpreadRecovery(spread, firingTime, firingRecovery, baseline, sMax, dt);
        spread = applySpreadRecovery(spread, notFiringTime, notFiringRecovery, baseline, sMax, dt);
      } else {
        spread = applySpreadRecovery(spread, secBetweenShots, firingRecovery, baseline, sMax, dt);
      }
    }
  }
  return spreads;
}

/**
 * Generate recoil path points for `shots` shots with the given RNG seed.
 * Returns pre-shot {x, y} angular offsets in degrees for each bullet.
 * Compensation is read from ctx.compensationFn() — pages provide their own.
 */
export function genRecoilPts(w, seed = 0, shots = 20) {
  const { RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP, compensationFn } = _ctx;
  const rng = mulberry32((whash(w.id) ^ seed) >>> 0);
  const pts  = [{ x: 0, y: 0 }];
  const group = recoilGroup(w);
  const decF    = group.decFactor  ?? RECOIL_DEC[w.id]     ?? 72;
  const decExp  = group.decExp     ?? RECOIL_DEC_EXP[w.id]  ?? 1;
  const timeExp = group.decTimeExp ?? RECOIL_DEC_TEXP[w.id] ?? 1.2;
  const decOffset = group.decOffset ?? 0.06;
  const amount      = selectedRecoilAmountFor(w);
  const variation   = selectedRecoilVariationFor(w);
  const compensation = compensationFn() / 100;
  let cx = 0, cy = 0;
  for (let i = 1; i < shots; i++) {
    const dir    = -(group.dir ?? w.recoilDir ?? 0) * Math.PI / 180;
    const spread = uniformDev(rng, variation) * Math.PI / 180;
    const angle  = dir + spread;
    cx += Math.sin(angle) * amount - Math.sin(dir) * amount * compensation;
    cy += Math.cos(angle) * amount - Math.cos(dir) * amount * compensation;
    const interShotTime = shotIntervalAfter(w, i);
    cx = applyRecoilDecay(cx, decF, decExp, timeExp, interShotTime, decOffset);
    cy = applyRecoilDecay(cy, decF, decExp, timeExp, interShotTime, decOffset);
    pts.push({ x: cx, y: cy });
  }
  return pts;
}
