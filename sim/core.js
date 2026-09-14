import { requireNumber, requireFields, invalidData, dataErrorCount } from './required-data.js';

/**
 * sim/core.js — Shared simulation math for BF6 Weapon Analyzer
 *
 * Contains all pure-math functions that were previously copy-pasted across
 * index.html and preview_spread.html.
 *
 * Usage in each page's <script type="module">:
 *
 *   import {
 *     setSimContext, mulberry32, whash, uniformDev, applyRecoilDecay,
 *     recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
 *     selectedRecoilAmountFor, selectedRecoilVariationFor,
 *     spreadBounds, spreadDynamics, selectedSpreadIncFor,
 *     simulateSpread, shotIntervalAfter, isBurstGapAfter, genRecoilPts,
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
  compensationFn: () => 0,  // page provides; spread stub returns 0
  platformRecoilMultFn: () => 1,
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
 * Simulate recoil recovery over one interval under the assumed rate equation.
 * Assumed recovery rate: (|r|^decExp + decOffset) × decFactor × t^timeExp.
 * Applied independently to vertical and horizontal components.
 * The time integral is exact; non-linear displacement uses bounded small steps.
 */
const RECOIL_TIME_STEP = 0.001;

function recoilRecoveryWeight(factor, exponent, time, step) {
  const power = exponent + 1;
  return factor * ((time + step) ** power - time ** power) / power;
}

function recoverRecoilAxis(r, exponent, offset, weight) {
  const magnitude = Math.abs(r);
  const remaining = exponent === 1
    ? (magnitude + offset) * Math.exp(-weight) - offset
    : magnitude - (magnitude ** exponent + offset) * weight;
  return Math.sign(r) * Math.max(0, remaining);
}

export function applyRecoilDecay(r, decFactor, decExp, timeExp, interShotTime, decOffset = 0.06, startTime = 0) {
  if (interShotTime <= 0 || r === 0 || decFactor === 0) return r;
  if (decExp === 1) {
    return recoverRecoilAxis(r, decExp, decOffset,
      recoilRecoveryWeight(decFactor, timeExp, startTime, interShotTime));
  }
  let elapsed = 0;
  while (elapsed < interShotTime - 1e-12 && r !== 0) {
    const step = Math.min(RECOIL_TIME_STEP, interShotTime - elapsed);
    r = recoverRecoilAxis(r, decExp, decOffset,
      recoilRecoveryWeight(decFactor, timeExp, startTime + elapsed, step));
    elapsed += step;
  }
  return r;
}


// ── RECOIL HELPERS ────────────────────────────────────────────────────────────

/** Required recoil parameters for one aim state. */
function requiredRecoilGroup(w, aimState) {
  return requireFields(w.recoil?.[aimState],
    ['dir', 'amount', 'amountMult', 'amountExp', 'dirVar', 'dirVarMult', 'dirVarExp',
      'decExp', 'decTimeExp', 'decOffset', 'decFactor'], `${w.id} recoil.${aimState}`);
}

export function recoilGroup(w) {
  return requiredRecoilGroup(w, _ctx.aimState);
}

/** ADS recoil group — used as the attachment-scaling baseline. */
export function baseRecoilGroup(w) {
  return requiredRecoilGroup(w, 'ads');
}

/** Required firing rate in rounds per minute. */
export function weaponRpm(w, field = 'rpm') {
  const rpm = requireNumber(w[field], `${w.id} ${field}`);
  if (rpm <= 0) return invalidData(`Invalid ${w.id} ${field}: must be positive`);
  return rpm;
}

/** Effective recoil magnitude from a group object. */
export function recoilAmount(group) {
  requireFields(group, ['amount', 'amountMult', 'amountExp'], 'recoil');
  return group.amount * Math.pow(group.amountMult, group.amountExp);
}

/** Effective directional variation from a group object. */
export function recoilVariation(group) {
  requireFields(group, ['dirVar', 'dirVarMult', 'dirVarExp'], 'recoil');
  return group.dirVar * Math.pow(group.dirVarMult, group.dirVarExp);
}

/**
 * Recoil amount for the current weapon + aim state, with attachment scaling.
 * In ADS the raw group amount is scaled so that attachment tier changes are
 * reflected through the ADSRecoilAmountMultiplier ladder.
 */
export function selectedRecoilAmountBeforePlatformFor(w) {
  const g = recoilGroup(w);
  if (_ctx.aimState !== 'ads') return recoilAmount(g);
  const adsBase = recoilAmount(baseRecoilGroup(w));
  const attachmentMult = adsBase > 0 ? (w.recoilV ?? adsBase) / adsBase : 1;
  return recoilAmount(g) * attachmentMult;
}

export function selectedRecoilAmountFor(w) {
  return selectedRecoilAmountBeforePlatformFor(w) * _ctx.platformRecoilMultFn();
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
 * Reads the bounds after attachment effects have been applied.
 */
export const SPREAD_EFFECTIVE_MAX_SHOTS = 50;
export const SPREAD_BAR_SCALE = 12;
// 1 ms keeps stepped recovery within 0.2% of a 0.1 ms reference; 1/60 s differed by up to 3.3%.
export const SPREAD_TIME_STEP = 0.001;

/** Direct Frosty exponent interpretation; M39 settled hipfire supports uniform area. */
export function sampleSpreadRadius(w, spread, u) {
  const dyn = spreadDynamics(w);
  const exponent = (_ctx.stanceState === 'move' ? dyn?.distExpMove : undefined)
    ?? dyn.distExp;
  return spread * Math.pow(u, exponent);
}

export function spreadBounds(w, aimState = _ctx.aimState, stanceState = _ctx.stanceState) {
  const key = `${aimState}${stanceState === 'move' ? 'Move' : 'Stand'}`;
  const bounds = w.spread?.[key];
  if (!Array.isArray(bounds) || bounds.length !== 2 || !bounds.every(Number.isFinite)
    || bounds[0] < 0 || bounds[1] < bounds[0]) return [invalidData(`Missing or invalid ${w.id} spread.${key}`), NaN];
  return bounds;
}

/**
 * Spread growth/recovery dynamics for the current aim state.
 * For ADS, overrides `inc` with the weapon's recoilIncAds field so attachment
 * scaling of spread-per-shot is preserved.
 */
export function spreadDynamics(w, aimState = _ctx.aimState) {
  const dyn = requireFields(w.spreadDyn?.[aimState],
    ['inc', 'firingCoef', 'firingExp', 'firingOffset', 'notFiringCoef', 'notFiringExp',
      'notFiringOffset', 'distExp'], `${w.id} spreadDyn.${aimState}`);
  if (dyn.distExpMove != null) requireNumber(dyn.distExpMove, `${w.id} spreadDyn.${aimState}.distExpMove`);
  if (aimState === 'ads') return { ...dyn, inc: w.recoilIncAds == null ? dyn.inc : requireNumber(w.recoilIncAds, `${w.id} recoilIncAds`) };
  return dyn;
}

/** Per-shot spread increase for the current weapon + aim state. */
export function selectedSpreadIncFor(w) {
  const { aimState } = _ctx;
  const dyn = spreadDynamics(w);
  if (aimState === 'ads') return w.recoilIncAds ?? dyn.inc;
  return dyn.inc;
}

// Burst fire and multi-round pump cycles share the rounds-then-pause cadence.
const hasCycleCadence = w => w.fireMode === 'burst' || w.fireMode === 'pump';

/** Seconds between this shot and the next shot for the current fire mode. */
export function shotIntervalAfter(w, shotIndex) {
  const shotRpm = hasCycleCadence(w) && w.burstRpm != null ? weaponRpm(w, 'burstRpm') : weaponRpm(w);
  const normalInterval = 60 / shotRpm;
  const burstRounds = hasCycleCadence(w) ? (w.burstRounds ?? 0) : 0;
  const burstsPerMinute = w.burstBurstsPerMinute ?? 0;
  if (burstRounds <= 1 || burstsPerMinute <= 0) return normalInterval;

  const shotInBurst = (shotIndex - 1) % burstRounds;
  if (shotInBurst < burstRounds - 1) return normalInterval;

  const burstCycle = 60 / burstsPerMinute;
  const elapsedWithinBurst = (burstRounds - 1) * normalInterval;
  return Math.max(normalInterval, burstCycle - elapsedWithinBurst);
}

/** True when the next interval is the pause after the final shot in a burst or pump cycle. */
export function isBurstGapAfter(w, shotIndex) {
  const burstRounds = hasCycleCadence(w) ? (w.burstRounds ?? 0) : 0;
  const burstsPerMinute = w.burstBurstsPerMinute ?? 0;
  return burstRounds > 1
    && burstsPerMinute > 0
    && (shotIndex - 1) % burstRounds === burstRounds - 1;
}

/**
 * Firing / not-firing spread recovery parameters for the current aim state,
 * with the muzzle/light decay boost applied to the firing offset.
 *
 * Heavy-type barrels use source factors for the ADS firing coefficient and
 * firing/not-firing offsets within our assumed recovery equation. Hip fire
 * retains its own recovery parameters in both stances.
 */
export function spreadRecoveries(w) {
  const { aimState } = _ctx;
  const dyn = spreadDynamics(w);
  const ads = aimState === 'ads';
  const firing = {
    coef: dyn.firingCoef * (ads ? (w._adsSpreadFiringDecCoefMult ?? 1) : (w._hipSpreadFiringDecCoefMult ?? 1)),
    exp: dyn.firingExp,
    offset: dyn.firingOffset *
      (ads ? (w._adsSpreadFiringDecOffsetMult ?? 1) : (w._hipSpreadFiringDecOffsetMult ?? 1)) *
      (1 + (ads ? (w._adsSpreadDecayBoost ?? 0) : 0)),
  };
  const notFiring = {
    coef: dyn.notFiringCoef,
    exp: dyn.notFiringExp,
    offset: dyn.notFiringOffset * (ads ? (w._adsSpreadNotFiringDecOffsetMult ?? 1) : (w._hipSpreadNotFiringDecOffsetMult ?? 1)),
  };
  return { firing, notFiring };
}

/** Step spread recovery over `seconds`, clamped to [baseline, sMax]. */
export function applySpreadRecovery(spread, seconds, recovery, baseline, sMax, dt = SPREAD_TIME_STEP) {
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

/** Effective spread reached across a representative sustained string. */
export function effectiveSpreadMax(w, shots = SPREAD_EFFECTIVE_MAX_SHOTS) {
  const [baseline, sMax] = spreadBounds(w);
  const spreadInc = selectedSpreadIncFor(w);
  if (spreadInc === 0) return baseline;
  const { firing, notFiring } = spreadRecoveries(w);
  const clamp = value => Math.min(Math.max(value, baseline), sMax);
  let spread = baseline;
  for (let index = 0; index < shots; index++) {
    spread = clamp(spread + spreadInc);
    const shotIndex = index + 1;
    const interval = shotIntervalAfter(w, shotIndex);
    if (isBurstGapAfter(w, shotIndex)) {
      const firingTime = Math.min(60 / weaponRpm(w), interval);
      spread = applySpreadRecovery(spread, firingTime, firing, baseline, sMax);
      spread = applySpreadRecovery(spread, Math.max(0, interval - firingTime), notFiring, baseline, sMax);
    } else {
      spread = applySpreadRecovery(spread, interval, firing, baseline, sMax);
    }
  }
  return +clamp(spread).toFixed(3);
}


// ── SIMULATION ────────────────────────────────────────────────────────────────

/**
 * Simulate spread growth across `shotCount` shots.
 * Returns an array of per-shot pre-fire spread values in degrees.
 */
export function simulateSpread(w, shotCount) {
  const [baseline, sMax] = spreadBounds(w);
  const sInc = selectedSpreadIncFor(w);
  if (sInc === 0) return Array(shotCount).fill(baseline);
  const { firing: firingRecovery, notFiring: notFiringRecovery } = spreadRecoveries(w);
  const dt = SPREAD_TIME_STEP;
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
        const firingTime = Math.min(60 / weaponRpm(w), secBetweenShots);
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
  const { compensationFn } = _ctx;
  const rng = mulberry32((whash(w.id) ^ seed) >>> 0);
  const pts  = [{ x: 0, y: 0 }];
  const group = recoilGroup(w);
  const baseDecF = group.decFactor;
  const decF    = baseDecF * (_ctx.aimState === 'ads'
    ? (w._adsRecoilDecayMult ?? 1) : (w._hipRecoilDecayMult ?? 1));
  const decExp  = group.decExp;
  const timeExp = group.decTimeExp;
  const decOffset = group.decOffset;
  const amount      = selectedRecoilAmountFor(w);
  const variation   = selectedRecoilVariationFor(w);
  const compensation = compensationFn() / 100;
  const duration = Math.max(0, group.duration == null ? 0 : requireNumber(group.duration, `${w.id} recoil duration`)) || 0.025;
  const pending = [];
  let cx = 0, cy = 0, now = 0;
  for (let i = 1; i < shots; i++) {
    const dir    = -group.dir * Math.PI / 180;
    const spread = uniformDev(rng, variation) * Math.PI / 180;
    const angle  = dir + spread;
    const dx = Math.sin(angle) * amount - Math.sin(dir) * amount * compensation;
    const dy = Math.cos(angle) * amount - Math.cos(dir) * amount * compensation;
    pending.push({ end: now + duration, xRate: dx / duration, yRate: dy / duration });
    const interShotTime = shotIntervalAfter(w, i);
    const end = now + interShotTime;
    // Reset recovery age on each shot, but retain unfinished earlier impulses.
    let elapsed = 0;
    while (now < end - 1e-12) {
      while (pending.length && pending[0].end <= now + 1e-12) pending.shift();
      if (!pending.length) {
        cx = applyRecoilDecay(cx, decF, decExp, timeExp, end - now, decOffset, elapsed);
        cy = applyRecoilDecay(cy, decF, decExp, timeExp, end - now, decOffset, elapsed);
        now = end;
        break;
      }
      const step = Math.min(RECOIL_TIME_STEP, end - now, pending[0].end - now);
      let xRate = 0, yRate = 0;
      for (const impulse of pending) {
        xRate += impulse.xRate;
        yRate += impulse.yRate;
      }
      const weight = recoilRecoveryWeight(decF, timeExp, elapsed, step);
      // Split delivery around recovery; neither waits for the other to finish.
      cx = recoverRecoilAxis(cx + xRate * step / 2, decExp, decOffset, weight) + xRate * step / 2;
      cy = recoverRecoilAxis(cy + yRate * step / 2, decExp, decOffset, weight) + yRate * step / 2;
      elapsed += step;
      now += step;
    }
    now = end;
    pts.push({ x: cx, y: cy });
  }
  return pts;
}

/** Validate all source simulation fields before the UI publishes any results. */
export function validateWeaponSimulation(w) {
  const before = dataErrorCount();
  weaponRpm(w);
  if (w.burstRpm != null) weaponRpm(w, 'burstRpm');
  if (hasCycleCadence(w) && (w.fireMode === 'burst' || w.burstRounds != null || w.burstBurstsPerMinute != null)) {
    const rounds = requireNumber(w.burstRounds, `${w.id} burstRounds`);
    if (!Number.isInteger(rounds) || rounds < 1) invalidData(`Invalid ${w.id} burstRounds`);
    weaponRpm(w, 'burstBurstsPerMinute');
  }
  requireFields(w, ['recoilV', 'recoilVar', 'recoilIncAds'], w.id);
  for (const aim of ['ads', 'hip']) {
    const group = requiredRecoilGroup(w, aim);
    if (group.duration != null) requireNumber(group.duration, `${w.id} recoil.${aim}.duration`);
    spreadDynamics(w, aim);
    for (const stance of ['stand', 'move']) spreadBounds(w, aim, stance);
  }
  return dataErrorCount() === before;
}
