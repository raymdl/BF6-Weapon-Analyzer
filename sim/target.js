// BF6-proportioned target used by the distance spray view. The visual is a
// generated project asset based on the supplied in-game figure reference; hit
// zones remain an approximation rather than authoritative collision geometry.
import { damagePerShotAtRange, zoneMultiplierForWeapon } from './damage.js';

export const TARGET_HEIGHT_CM = 180;
export const TARGET_VIEW_HEIGHT = 206.3;
export const TARGET_AIM_Y = Object.freeze({ chest: 66.5, head: 18 });
export const TARGET_ASPECT_RATIO = 529 / 1254;

const TORSO_SIDE_BOUNDARY = Object.freeze([
  [18, 33], [29, 40], [29, 50], [27.5, 57], [27, 63], [26, 73],
  [24.5, 84], [24, 92], [25, 101], [27, 110], [27, 114],
]);

export const TARGET_ZONE_COLORS = Object.freeze({
  head: '#f23f3f', chest: '#ff7b1c', stomach: '#ffe14d', arms: '#ffe14d', legs: '#ffe14d',
});

export const TARGET_ZONE_ORDER = Object.freeze([
  ['head', 'Head'],
  ['chest', 'Upper Torso'],
  ['stomach', 'Lower Torso'],
  ['arms', 'Arms'],
  ['legs', 'Legs'],
]);

let targetImage = null;
let targetAlpha = null;
let resolveTargetReady;
const targetReady = new Promise(resolve => { resolveTargetReady = resolve; });

if (typeof Image !== 'undefined') {
  targetImage = new Image();
  targetImage.addEventListener('load', () => {
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = targetImage.naturalWidth;
    alphaCanvas.height = targetImage.naturalHeight;
    const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
    alphaCtx.drawImage(targetImage, 0, 0);
    targetAlpha = alphaCtx.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height).data;
    resolveTargetReady(true);
  }, { once: true });
  targetImage.addEventListener('error', () => resolveTargetReady(false), { once: true });
  targetImage.src = new URL('../assets/soldier-target.png', import.meta.url).href;
} else {
  resolveTargetReady(false);
}

export function whenTargetImageReady() {
  return targetReady;
}

function torsoHalfWidthAt(y) {
  if (y <= TORSO_SIDE_BOUNDARY[0][1]) return TORSO_SIDE_BOUNDARY[0][0];
  for (let i = 1; i < TORSO_SIDE_BOUNDARY.length; i++) {
    if (y <= TORSO_SIDE_BOUNDARY[i][1]) {
      const [x0, y0] = TORSO_SIDE_BOUNDARY[i - 1];
      const [x1, y1] = TORSO_SIDE_BOUNDARY[i];
      const t = (y - y0) / (y1 - y0);
      return x0 + (x1 - x0) * t;
    }
  }
  return TORSO_SIDE_BOUNDARY[TORSO_SIDE_BOUNDARY.length - 1][0];
}

export function targetZoneAt(x, y) {
  if (y < 33) return 'head';
  if (y < 113 && Math.abs(x) > torsoHalfWidthAt(y)) return 'arms';
  if (y < 84) return 'chest';
  if (y < 113) return 'stomach';
  return 'legs';
}

/**
 * The figure is pinned to fixed world centimetres so that changing the aim
 * point slides the spray across a stationary soldier rather than dragging the
 * soldier around under a stationary spray. World y is screen-up, with zero at
 * the center-chest aim point.
 */
export function targetFrame() {
  const topY = (TARGET_AIM_Y.chest / TARGET_VIEW_HEIGHT) * TARGET_HEIGHT_CM;
  const bottomY = topY - TARGET_HEIGHT_CM;
  return { topY, bottomY, centerY: (topY + bottomY) / 2, heightCm: TARGET_HEIGHT_CM };
}

/** Where the shooter is aiming, in the same world centimetres as the figure. */
export function targetAimOffset(aimPoint = 'chest', custom = null) {
  if (aimPoint === 'custom') {
    return { x: Number(custom?.x) || 0, y: Number(custom?.y) || 0 };
  }
  const aimY = TARGET_AIM_Y[aimPoint] ?? TARGET_AIM_Y.chest;
  return { x: 0, y: ((TARGET_AIM_Y.chest - aimY) / TARGET_VIEW_HEIGHT) * TARGET_HEIGHT_CM };
}

/**
 * Impact dots are a fixed physical size on the target, so a wide view shows
 * small marks that cannot swamp the figure while a tight view shows big ones.
 * The floor only stops them vanishing entirely.
 */
export function targetMarkerRadius(pxPerCm, radiusCm = 1.4) {
  const radius = Math.max(0, Number(pxPerCm) || 0) * Math.max(0, Number(radiusCm) || 0);
  return Math.min(5, Math.max(0.9, radius));
}

export function summarizeTargetImpacts(weapon, range, shotZones, health = 100) {
  const shots = Array.isArray(shotZones) ? shotZones : [];
  const baseDamage = damagePerShotAtRange(weapon, range);
  const zones = Object.fromEntries(TARGET_ZONE_ORDER.map(([zone, label]) => {
    const multiplier = zoneMultiplierForWeapon(weapon, zone);
    return [zone, {
      zone, label, multiplier, hits: 0,
      damagePerHit: baseDamage == null ? null : baseDamage * multiplier,
      damage: 0,
    }];
  }));
  let hits = 0;
  let totalDamage = 0;
  let lethalShot = null;
  let lethalHit = null;

  shots.forEach((zone, index) => {
    if (!zone || !zones[zone]) return;
    hits++;
    const damage = zones[zone].damagePerHit ?? 0;
    zones[zone].hits++;
    zones[zone].damage += damage;
    totalDamage += damage;
    if (lethalShot == null && totalDamage >= health) {
      lethalShot = index + 1;
      lethalHit = hits;
    }
  });

  return {
    totalShots: shots.length,
    hits,
    misses: shots.length - hits,
    accuracy: shots.length ? hits / shots.length : 0,
    totalDamage,
    lethalShot,
    lethalHit,
    zones: TARGET_ZONE_ORDER.map(([zone]) => zones[zone]),
  };
}

export function drawTarget(ctx, toX, toY) {
  const pxPerCm = Math.abs(toX(1) - toX(0));
  const targetX = toX(0);

  if (targetImage?.complete && targetImage.naturalWidth > 0) {
    const drawHeight = TARGET_HEIGHT_CM * pxPerCm;
    const drawWidth = drawHeight * targetImage.naturalWidth / targetImage.naturalHeight;
    const drawLeft = targetX - drawWidth / 2;
    const drawTop = toY(targetFrame().topY);
    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.drawImage(targetImage, drawLeft, drawTop, drawWidth, drawHeight);
    ctx.restore();

    return point => {
      if (!targetAlpha) return null;
      const imageX = Math.floor((toX(point.xCm) - drawLeft) / drawWidth * targetImage.naturalWidth);
      const imageY = Math.floor((toY(point.yCm) - drawTop) / drawHeight * targetImage.naturalHeight);
      if (imageX < 0 || imageY < 0 || imageX >= targetImage.naturalWidth || imageY >= targetImage.naturalHeight) return null;
      const alpha = targetAlpha[(imageY * targetImage.naturalWidth + imageX) * 4 + 3];
      if (alpha < 32) return null;
      const viewX = (imageX / targetImage.naturalWidth - 0.5) * TARGET_VIEW_HEIGHT * (targetImage.naturalWidth / targetImage.naturalHeight);
      const viewY = imageY / targetImage.naturalHeight * TARGET_VIEW_HEIGHT;
      return targetZoneAt(viewX, viewY);
    };
  }

  return () => null;
}
