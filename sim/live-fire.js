/**
 * sim/live-fire.js — Real-time recoil and spread stepper for the Firing Range.
 *
 * The batch functions in core.js (genRecoilPts, simulateSpread) integrate a fixed
 * number of shots with a fixed compensation fraction. This module runs the same
 * impulse, recovery and spread-growth maths forward in wall-clock time, with the
 * trigger and the view rotation supplied from outside, so a player's own mouse
 * movement replaces the compensation slider. With the trigger held from t = 0 and
 * no mouse input it reproduces the batch functions shot for shot
 * (scripts/live-fire.test.mjs).
 *
 * All angles are degrees of view rotation: +x right, +y up. The view direction is
 * aim (mouse) + recoil (uncompensated kick, which decays toward zero); each shot
 * leaves at view + a spread sample.
 */
import {
  mulberry32, whash, uniformDev, recoilGroup, selectedRecoilAmountFor, selectedRecoilVariationFor,
  spreadBounds, selectedSpreadIncFor, spreadRecoveries, applySpreadRecovery, sampleSpreadRadius,
  shotIntervalAfter, isBurstGapAfter, weaponRpm, recoilRecoveryWeight, recoverRecoilAxis,
  RECOIL_TIME_STEP, RECOIL_RECOVERY_SCALE, simContext,
} from './core.js';
import { requireNumber } from './required-data.js';

const EPS = 1e-12;
const hasCycleCadence = w => w.fireMode === 'burst' || w.fireMode === 'pump';

/** Player trigger behaviour per source mechanism. */
export function triggerModeFor(w) {
  if (w.fireMode === 'auto') return 'auto';
  if (w.fireMode === 'burst') return 'burst';
  return 'single';
}

export function createLiveFire(w, { seed = 1, magazine = w.mag } = {}) {
  const { aimState } = simContext();
  const group = recoilGroup(w);
  const decF = group.decFactor * RECOIL_RECOVERY_SCALE
    * (aimState === 'ads' ? (w._adsRecoilDecayMult ?? 1) : (w._hipRecoilDecayMult ?? 1));
  const decExp = group.decExp, timeExp = group.decTimeExp, decOffset = group.decOffset;
  const amount = selectedRecoilAmountFor(w);
  const variation = selectedRecoilVariationFor(w);
  const duration = Math.max(0, group.duration == null ? 0 : requireNumber(group.duration, `${w.id} recoil duration`)) || 0.025;
  const dirRad = -group.dir * Math.PI / 180;
  const [baseline, sMax] = spreadBounds(w);
  const spreadInc = selectedSpreadIncFor(w);
  const recoveries = spreadRecoveries(w);
  const shotRpm = hasCycleCadence(w) && w.burstRpm != null ? weaponRpm(w, 'burstRpm') : weaponRpm(w);
  const burstRounds = w.fireMode === 'burst' ? Math.max(1, w.burstRounds ?? 1) : 1;
  const triggerMode = triggerModeFor(w);
  const magSize = Number.isFinite(magazine) && magazine > 0 ? Math.floor(magazine) : Infinity;
  const rngRecoil = mulberry32((whash(w.id) ^ seed) >>> 0);
  const rngSpread = mulberry32((whash(w.id) ^ seed ^ 0xdeadbeef) >>> 0);
  const clampSpread = v => Math.min(Math.max(v, baseline), sMax);

  const s = {
    weapon: w, triggerMode, magazine: magSize, baselineSpread: baseline, maxSpread: sMax,
    t: 0,
    aim: { x: 0, y: 0 },
    recoil: { x: 0, y: 0 },
    spread: baseline,
    ammo: magSize,
    shots: 0,
    impacts: [],
    trigger: false,
  };
  let pending = [];
  let sinceShot = 0;
  let nextShotAt = 0;
  let firingUntil = -Infinity;
  let posInCycle = 0;
  let burstLeft = 0;
  let clicks = 0;

  function canFire(t) {
    if (s.ammo <= 0 || t < nextShotAt - EPS) return false;
    if (triggerMode === 'auto') return s.trigger || clicks > 0;
    if (triggerMode === 'burst') return burstLeft > 0 || s.trigger || clicks > 0;
    return clicks > 0;
  }

  function fire(t) {
    if (triggerMode === 'burst' && burstLeft === 0) burstLeft = burstRounds;
    if (clicks > 0) clicks--;
    const preSpread = clampSpread(s.spread);
    const bAng = rngSpread() * Math.PI * 2;
    const bR = sampleSpreadRadius(w, preSpread, rngSpread());
    s.shots++;
    s.ammo--;
    s.impacts.push({
      index: s.shots, t,
      x: s.aim.x + s.recoil.x + bR * Math.cos(bAng),
      y: s.aim.y + s.recoil.y + bR * Math.sin(bAng),
      recoil: { x: s.recoil.x, y: s.recoil.y },
      view: { x: s.aim.x + s.recoil.x, y: s.aim.y + s.recoil.y },
      spread: preSpread,
      zone: undefined,
    });
    const angle = dirRad + uniformDev(rngRecoil, variation) * Math.PI / 180;
    pending.push({ end: t + duration, xRate: Math.sin(angle) * amount / duration, yRate: Math.cos(angle) * amount / duration });
    sinceShot = 0;
    s.spread = clampSpread(s.spread + spreadInc);
    const shotIndex = posInCycle + 1;
    const interval = shotIntervalAfter(w, shotIndex);
    const gap = isBurstGapAfter(w, shotIndex);
    nextShotAt = t + interval;
    firingUntil = t + (gap ? Math.min(60 / shotRpm, interval) : interval);
    posInCycle = gap ? 0 : posInCycle + 1;
    if (triggerMode === 'burst') burstLeft = Math.max(0, burstLeft - 1);
  }

  function integrate(step, mouseRate) {
    s.aim.x += mouseRate.x * step;
    s.aim.y += mouseRate.y * step;
    let xRate = 0, yRate = 0;
    for (const impulse of pending) { xRate += impulse.xRate; yRate += impulse.yRate; }
    if (xRate !== 0 || yRate !== 0 || s.recoil.x !== 0 || s.recoil.y !== 0) {
      const weight = recoilRecoveryWeight(decF, timeExp, sinceShot, step);
      // Split delivery around recovery; neither waits for the other to finish.
      s.recoil.x = recoverRecoilAxis(s.recoil.x + xRate * step / 2, decExp, decOffset, weight) + xRate * step / 2;
      s.recoil.y = recoverRecoilAxis(s.recoil.y + yRate * step / 2, decExp, decOffset, weight) + yRate * step / 2;
    }
    if (s.spread > baseline) {
      const law = s.t < firingUntil - EPS ? recoveries.firing : recoveries.notFiring;
      s.spread = applySpreadRecovery(s.spread, step, law, baseline, sMax, step);
    }
    sinceShot += step;
    s.t += step;
  }

  return {
    state: s,
    /** Press or release the trigger at the current sim time. */
    setTrigger(down) {
      down = !!down;
      if (down && !s.trigger) clicks = Math.min(1, clicks + 1);
      s.trigger = down;
    },
    /** Wipe the board: impacts and the shot count go, aim, recoil and spread stay. */
    clear() {
      s.impacts = [];
      s.shots = 0;
    },
    /** Refill the magazine and clear the board. Recoil and spread keep recovering as they were. */
    reload() {
      s.ammo = magSize;
      posInCycle = 0;
      burstLeft = 0;
      clicks = 0;
      s.impacts = [];
      s.shots = 0;
    },
    /**
     * Run the simulation forward by `seconds`. `mouse` is the view rotation in
     * degrees to apply over that span, spread evenly across it.
     */
    advance(seconds, mouse = { x: 0, y: 0 }) {
      if (!(seconds > 0)) return;
      const end = s.t + seconds;
      const rate = { x: (mouse.x || 0) / seconds, y: (mouse.y || 0) / seconds };
      while (s.t < end - EPS) {
        if (canFire(s.t)) fire(s.t);
        let step = Math.min(RECOIL_TIME_STEP, end - s.t);
        if (pending.length && pending[0].end > s.t + EPS) step = Math.min(step, pending[0].end - s.t);
        if (nextShotAt > s.t + EPS && s.ammo > 0) step = Math.min(step, nextShotAt - s.t);
        if (firingUntil > s.t + EPS) step = Math.min(step, firingUntil - s.t);
        integrate(Math.max(step, EPS), rate);
        while (pending.length && pending[0].end <= s.t + EPS) pending.shift();
      }
      if (canFire(s.t)) fire(s.t);
    },
    /** Current view direction: mouse aim plus the recoil still acting on it. */
    view() {
      return { x: s.aim.x + s.recoil.x, y: s.aim.y + s.recoil.y };
    },
    /** True once nothing is moving, so a renderer can stop animating. */
    settled() {
      return !s.trigger && clicks === 0 && burstLeft === 0 && pending.length === 0
        && Math.abs(s.recoil.x) < 1e-4 && Math.abs(s.recoil.y) < 1e-4
        && s.spread - baseline < 1e-4;
    },
    /** Pre-shot spread ready for the next shot, in degrees. */
    currentSpread() { return clampSpread(s.spread); },
  };
}
