import assert from 'node:assert/strict';
import { TARGET_AIM_Y, TARGET_ASPECT_RATIO, TARGET_HEIGHT_CM, summarizeTargetImpacts, targetAimOffset, targetFrame, targetMarkerRadius, targetZoneAt } from '../sim/target.js';

assert.ok(TARGET_ASPECT_RATIO >= 0.4, 'target should retain broad tactical proportions');
assert.ok(TARGET_ASPECT_RATIO <= 0.46, 'target should remain distinct from the supplied reference proportions');
assert.equal(TARGET_AIM_Y.head, 18);
assert.equal(TARGET_AIM_Y.chest, 66.5);
assert.equal(targetZoneAt(0, 15), 'head');
assert.equal(targetZoneAt(0, 60), 'chest');
assert.equal(targetZoneAt(0, 95), 'stomach');
assert.equal(targetZoneAt(40, 95), 'arms');
assert.equal(targetZoneAt(10, 150), 'legs');
// Markers are sized from on-screen scale, so a wide view shrinks them rather
// than letting them swamp the figure.
assert.equal(Number(targetMarkerRadius(1.6).toFixed(4)), 2.24);
assert.equal(targetMarkerRadius(1.6, 1.25), 2);
assert.ok(targetMarkerRadius(0.4) < targetMarkerRadius(1.6), 'zooming out shrinks the dots');
assert.equal(targetMarkerRadius(0.05), 0.9, 'tiny scales clamp to a still-visible dot');
assert.equal(targetMarkerRadius(50), 5, 'deep zoom clamps to a sane dot');

// The figure is pinned: only the aim point moves, so the frame never varies.
const frame = targetFrame();
assert.equal(frame.heightCm, TARGET_HEIGHT_CM);
assert.equal(Number((frame.topY - frame.bottomY).toFixed(6)), TARGET_HEIGHT_CM);
assert.ok(frame.topY > 0 && frame.bottomY < 0, 'the chest aim origin sits inside the figure');
assert.equal(frame.centerY, (frame.topY + frame.bottomY) / 2);
assert.deepEqual(targetFrame(), frame, 'the frame does not depend on the aim point');

assert.deepEqual(targetAimOffset('chest'), { x: 0, y: 0 });
const headOffset = targetAimOffset('head');
assert.equal(headOffset.x, 0);
assert.ok(headOffset.y > 0, 'head aim sits above the chest origin');
assert.ok(headOffset.y < frame.topY, 'head aim stays inside the figure');
assert.deepEqual(targetAimOffset('custom', { x: -12.5, y: 40 }), { x: -12.5, y: 40 });
assert.deepEqual(targetAimOffset('custom', null), { x: 0, y: 0 }, 'a missing custom point falls back to the origin');
assert.deepEqual(targetAimOffset('nonsense'), { x: 0, y: 0 }, 'unknown aim names fall back to chest');

const impact = summarizeTargetImpacts(
  { dmg: [{ r: 0, d: 25 }], _hsMult: 2, _limbMult: 0.8 },
  30,
  [null, 'head', 'chest', 'arms', null, 'stomach'],
);
assert.equal(impact.totalShots, 6);
assert.equal(impact.hits, 4);
assert.equal(impact.misses, 2);
assert.equal(impact.accuracy, 4 / 6);
assert.equal(impact.totalDamage, 115);
assert.equal(impact.lethalShot, 6);
assert.equal(impact.lethalHit, 4);
assert.deepEqual(impact.zones.map(({ hits }) => hits), [1, 1, 1, 1, 0]);
// Zone multipliers are surfaced so the stats table can label each body part.
assert.deepEqual(impact.zones.map(({ zone, multiplier }) => [zone, multiplier]), [
  ['head', 2], ['chest', 1], ['stomach', 0.8], ['arms', 0.8], ['legs', 0.8],
]);
assert.deepEqual(impact.zones.map(({ damagePerHit }) => damagePerHit), [50, 25, 20, 20, 20]);

console.log('target geometry tests passed');
