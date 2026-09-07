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

/**
 * Returns { rangeM: [start, end], damage } for a continuous maximum-damage plateau
 * of at least 100 damage, or { rangeM: null } when it never occurs.
 */
export function deriveSweetSpot(weapon) {
  const curve = weapon?.dmg ?? [];
  const damage = Math.max(...curve.map(point => point.d));
  if (damage < 100) return { rangeM: null };
  const points = curve.filter(point => point.d === damage);
  if (points.length < 2 || curve.slice(curve.indexOf(points[0]), curve.indexOf(points.at(-1)) + 1)
    .some(point => point.d !== damage)) return { rangeM: null };
  const ranges = points.map(point => point.r);
  const rangeM = [Math.min(...ranges), Math.max(...ranges)];
  return rangeM[1] > rangeM[0] ? { rangeM, damage } : { rangeM: null };
}

/** True when the weapon's curve carries a sweet-spot plateau. */
export function hasSweetSpot(weapon) {
  return deriveSweetSpot(weapon).rangeM !== null;
}
