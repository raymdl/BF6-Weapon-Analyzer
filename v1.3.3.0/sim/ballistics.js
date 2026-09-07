/**
 * Projectile timing and trajectory helpers.
 *
 * `dragPerMeter` follows the measured Battlefield form dv/dt = -k v^2 for a
 * level shot. The vector solver extends that model with gravity for target
 * projection: dp/dt = v; dv/dt = (0, gravity) - k |v| v.
 */

const MAX_STEP_SECONDS = 1 / 500;
const MAX_FLIGHT_SECONDS = 30;

export function isProjectileModel(model) {
  return Number.isFinite(model?.velocityMps) && model.velocityMps > 0
    && Number.isFinite(model?.dragPerMeter) && model.dragPerMeter >= 0
    && Number.isFinite(model?.gravityMps2);
}

/** Time to a level horizontal distance. This is the exact measured drag form. */
export function flightTimeAtDistance(model, distanceM) {
  if (!isProjectileModel(model) || !Number.isFinite(distanceM) || distanceM < 0) return null;
  if (distanceM === 0) return 0;
  const { velocityMps: velocity, dragPerMeter: drag } = model;
  return drag === 0 ? distanceM / velocity : Math.expm1(drag * distanceM) / (drag * velocity);
}

function derivative(state, model) {
  const speed = Math.hypot(state.vx, state.vy);
  const drag = model.dragPerMeter * speed;
  return {
    x: state.vx,
    y: state.vy,
    vx: -drag * state.vx,
    vy: model.gravityMps2 - drag * state.vy,
  };
}

function rk4Step(state, model, dt) {
  const add = (base, slope, scale) => ({
    x: base.x + slope.x * scale,
    y: base.y + slope.y * scale,
    vx: base.vx + slope.vx * scale,
    vy: base.vy + slope.vy * scale,
  });
  const k1 = derivative(state, model);
  const k2 = derivative(add(state, k1, dt / 2), model);
  const k3 = derivative(add(state, k2, dt / 2), model);
  const k4 = derivative(add(state, k3, dt), model);
  return {
    x: state.x + dt * (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6,
    y: state.y + dt * (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6,
    vx: state.vx + dt * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx) / 6,
    vy: state.vy + dt * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) / 6,
  };
}

/**
 * Numerically follows the vector projectile to a horizontal target plane.
 * `y` is positive upward and is bore-axis relative (before zero adjustment).
 */
export function trajectoryAtDistance(model, distanceM, launchAngleRadians = 0) {
  if (!isProjectileModel(model) || !Number.isFinite(distanceM) || distanceM < 0) return null;
  if (!Number.isFinite(launchAngleRadians)) return null;
  if (distanceM === 0) return { timeSeconds: 0, xMeters: 0, yMeters: 0 };
  let state = {
    x: 0,
    y: 0,
    vx: model.velocityMps * Math.cos(launchAngleRadians),
    vy: model.velocityMps * Math.sin(launchAngleRadians),
  };
  let elapsed = 0;
  while (state.x < distanceM && elapsed < MAX_FLIGHT_SECONDS) {
    const previous = state;
    const next = rk4Step(state, model, MAX_STEP_SECONDS);
    elapsed += MAX_STEP_SECONDS;
    if (next.x >= distanceM) {
      const fraction = (distanceM - previous.x) / (next.x - previous.x);
      return {
        timeSeconds: elapsed - MAX_STEP_SECONDS + MAX_STEP_SECONDS * fraction,
        xMeters: distanceM,
        yMeters: previous.y + (next.y - previous.y) * fraction,
      };
    }
    state = next;
  }
  return null;
}

/**
 * Reticle-relative vertical position for a selected zero. The solver chooses
 * the bore elevation that intersects the selected zero plane, then evaluates
 * that same trajectory at `distanceM`. This intentionally omits sight height.
 */
export function zeroRelativeVerticalOffset(model, distanceM, zeroDistanceM = null) {
  if (zeroDistanceM == null) return trajectoryAtDistance(model, distanceM)?.yMeters ?? null;
  if (!Number.isFinite(zeroDistanceM) || zeroDistanceM < 0) return null;
  if (zeroDistanceM === 0) return trajectoryAtDistance(model, distanceM)?.yMeters ?? null;
  let low = -0.1;
  let high = 0.1;
  const lowY = trajectoryAtDistance(model, zeroDistanceM, low)?.yMeters;
  const highY = trajectoryAtDistance(model, zeroDistanceM, high)?.yMeters;
  if (!Number.isFinite(lowY) || !Number.isFinite(highY) || lowY > 0 || highY < 0) return null;
  for (let i = 0; i < 36; i++) {
    const mid = (low + high) / 2;
    const y = trajectoryAtDistance(model, zeroDistanceM, mid)?.yMeters;
    if (!Number.isFinite(y)) return null;
    if (y < 0) low = mid;
    else high = mid;
  }
  return trajectoryAtDistance(model, distanceM, (low + high) / 2)?.yMeters ?? null;
}
