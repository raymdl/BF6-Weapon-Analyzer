// Derive a bolt-action sniper's sweet spot from its damage curve.
//
// The sweet spot used to be stored per weapon as an EA-sourced window and asserted against
// hardcoded distances. That made an old patch-notes post authoritative over the damage curve:
// if a later update moved a window, the imported Sym curve would disagree with a pinned number
// from a point-in-time blog post, and the stale post would look like the correct value. EA have
// said sweet spots may move again, so the window is now read from the curve instead of recorded
// beside it — there is no stored value left that a future import could contradict.
//
// The window is the span over which the curve holds its maximum damage. A weapon whose curve
// never reaches that plateau across two distinct breakpoints has no sweet spot (the Mini Scout).

/** The plateau damage a bolt-action sweet spot holds. */
export const SWEET_SPOT_DAMAGE = 100;

/**
 * Returns { rangeM: [start, end] } for a curve that holds SWEET_SPOT_DAMAGE across two or more
 * breakpoints, or { rangeM: null } when it never does.
 */
export function deriveSweetSpot(weapon) {
  const points = (weapon?.dmg ?? []).filter(point => point?.d === SWEET_SPOT_DAMAGE);
  if (points.length < 2) return { rangeM: null };
  const ranges = points.map(point => point.r);
  return { rangeM: [Math.min(...ranges), Math.max(...ranges)] };
}

/** True when the weapon's curve carries a sweet-spot plateau. */
export function hasSweetSpot(weapon) {
  return deriveSweetSpot(weapon).rangeM !== null;
}
