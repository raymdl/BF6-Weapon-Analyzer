// Derive a bolt-action sniper's sweet spot from its damage curve.
//
// The sweet spot used to be stored per weapon as an EA-sourced window and asserted against
// hardcoded distances. That made an old patch-notes post authoritative over the damage curve:
// if a later update moved a window, the imported Sym curve would disagree with a pinned number
// from a point-in-time blog post, and the stale post would look like the correct value. EA have
// said sweet spots may move again, so the window is now read from the curve instead of recorded
// beside it — there is no stored value left that a future import could contradict.
//
// The sweet spot is the mechanic, not the curve's shape: the span of ranges over which one
// upper-chest hit (zone multiplier 1) kills a full-health soldier, so where the curve holds at
// least ONE_SHOT_DAMAGE. For the launch bolt-actions that span is also the 100-damage plateau.
// For a bullet that peaks above 100 (the ELR-40 Single Shot's 90 → 120 → 80 curve) the two
// differ, and the one-shot span is the one the game's "sweet spot" wording describes.
// A curve that never reaches the threshold has no sweet spot (the Mini Scout).

export const ONE_SHOT_DAMAGE = 100;

/**
 * Ranges over which the curve holds at least `threshold` damage, as [start, end] pairs
 * in metres. Ramps are interpolated to the exact crossing; a repeated range is a step.
 */
export function oneShotSpans(weapon, threshold = ONE_SHOT_DAMAGE) {
  const curve = weapon?.dmg ?? [];
  if (curve.length === 0) return [];
  const spans = [];
  let start = null;
  const above = point => point.d >= threshold;
  if (above(curve[0])) start = curve[0].r;
  for (let i = 1; i < curve.length; i++) {
    const previous = curve[i - 1];
    const point = curve[i];
    if (above(previous) === above(point)) continue;
    const ramp = point.r > previous.r;
    const crossing = ramp
      ? previous.r + (threshold - previous.d) * (point.r - previous.r) / (point.d - previous.d)
      : point.r;
    if (above(point)) start = crossing;
    else { spans.push([start, crossing]); start = null; }
  }
  if (start !== null) spans.push([start, Infinity]);
  return spans;
}

/**
 * Returns { rangeM: [start, end], damage } for the single continuous span where one chest
 * hit kills (`damage` is the curve's peak inside it), or { rangeM: null } when the curve never
 * reaches the threshold, holds it to infinity, or has more than one such span.
 */
export function deriveSweetSpot(weapon) {
  const spans = oneShotSpans(weapon);
  if (spans.length !== 1) return { rangeM: null };
  const [start, end] = spans[0];
  if (!(end > start) || !Number.isFinite(end)) return { rangeM: null };
  const damage = Math.max(...(weapon.dmg ?? [])
    .filter(point => point.r >= start && point.r <= end)
    .map(point => point.d));
  return { rangeM: [start, end], damage };
}

/** True when the weapon's curve carries a one-shot chest window. */
export function hasSweetSpot(weapon) {
  return deriveSweetSpot(weapon).rangeM !== null;
}
