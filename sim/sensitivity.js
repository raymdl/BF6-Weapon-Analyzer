/**
 * sim/sensitivity.js — Mouse input to view-angle conversion for the Firing Range.
 *
 * Hipfire yaw per mouse count is the Battlefield 6 entry of the KovaaK's sensitivity
 * converter (https://kovaaks.com/kovaaks/sens-converter, bundled game table, read
 * 21 Oct 2026). It is a community-derived constant, not a Frosty value.
 *
 * The aimed-sensitivity rule is the Frostbite monitor-distance match that the
 * community has documented since Battlefield 1 (the "Uniform Soldier Aiming"
 * coefficient). It has not been confirmed against BF6 source values, so the site
 * labels it as a community formula.
 */

/** Degrees of yaw per mouse count at in-game sensitivity 1, and the slider floor. */
export const BF6_YAW_PER_SENS = 0.0017362342283;
export const BF6_YAW_OFFSET = 0.002314981532;
/** Battlefield's default Uniform Soldier Aiming coefficient, in percent. */
export const DEFAULT_ZOOM_COEFFICIENT = 178;

export const SENS_DEFAULTS = Object.freeze({ dpi: 800, sens: 25, coefficient: DEFAULT_ZOOM_COEFFICIENT });

const clampPositive = (value, fallback) => (Number.isFinite(value) && value > 0 ? value : fallback);

/** Hipfire degrees of view rotation per mouse count for an in-game sensitivity value. */
export function hipfireDegreesPerCount(sens) {
  return clampPositive(sens, SENS_DEFAULTS.sens) * BF6_YAW_PER_SENS + BF6_YAW_OFFSET;
}

/** Centimetres of mouse travel for one full hipfire turn. */
export function cmPer360(degreesPerCount, dpi) {
  return 360 / (degreesPerCount * clampPositive(dpi, SENS_DEFAULTS.dpi)) * 2.54;
}

/** Horizontal field of view seen through an optic that magnifies `magnification` times. */
export function zoomedFovDeg(hFovDeg, magnification) {
  const half = Math.tan(clampPositive(hFovDeg, 103) * Math.PI / 360) / clampPositive(magnification, 1);
  return 2 * Math.atan(half) * 180 / Math.PI;
}

/**
 * Aimed-to-hipfire sensitivity ratio under monitor-distance matching. A
 * coefficient of 0 degenerates to the plain zoom ratio of the two fields.
 */
export function adsSensitivityRatio(hFovDeg, magnification, coefficientPct = DEFAULT_ZOOM_COEFFICIENT) {
  const hip = clampPositive(hFovDeg, 103) * Math.PI / 360;
  const zoomed = zoomedFovDeg(hFovDeg, magnification) * Math.PI / 360;
  const c = Number.isFinite(coefficientPct) && coefficientPct > 0 ? coefficientPct / 100 : 0;
  if (c === 0) return Math.tan(zoomed) / Math.tan(hip);
  return Math.atan(c * Math.tan(zoomed)) / Math.atan(c * Math.tan(hip));
}

/**
 * Degrees of view rotation per mouse count for the current aim state. Hipfire
 * uses the yaw constant directly; ADS scales it by the monitor-distance ratio for
 * the optic magnification being looked through.
 */
export function degreesPerCount({ sens, aim = 'ads', hFovDeg = 103, magnification = 1, coefficientPct = DEFAULT_ZOOM_COEFFICIENT }) {
  const hip = hipfireDegreesPerCount(sens);
  if (aim !== 'ads') return hip;
  return hip * adsSensitivityRatio(hFovDeg, magnification, coefficientPct);
}
