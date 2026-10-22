/**
 * ui/firing-range.js — Firing Range view: live fire driven by the player's mouse.
 *
 * The plot captures the pointer (Pointer Lock), the left button is the trigger,
 * and raw mouse counts are turned into degrees of view rotation through the
 * sensitivity settings. The sim itself lives in sim/live-fire.js; this module
 * owns the capture, the animation loop and the overlay drawn on the shared plot.
 */
import { createLiveFire, triggerModeFor } from '../sim/live-fire.js';

const STATS_REFRESH_MS = 150;
const MAX_FRAME_S = 0.1;

/** Impact dot colour per hit zone; misses are drawn faded in the weapon colour. */
export const RANGE_ZONE_COLORS = {
  head: '#ff5c5c',
  chest: '#c9a227',
  stomach: '#4d94d0',
  arms: '#4d94d0',
  legs: '#4d94d0',
};
export const RANGE_ZONE_LEGEND = [
  ['head', 'Head'], ['chest', 'Upper torso'], ['stomach', 'Lower torso, arms, legs'],
];

export function createFiringRange({
  canvas, doc = document, win = window,
  readBuild,            // () => the first slot's applied weapon, or null
  readSimKey,           // () => string naming the build + aim/stance/platform context
  readDegreesPerCount,  // () => degrees of view rotation per mouse count
  drawFrame,            // (canvas, { crosshair }) => plot frame with mapping helpers
  requestStats,         // () => void, refresh the stats panel for the live sample
  requestHint,          // () => void, refresh the hint line and buttons
  readReticle = () => true, // () => whether to draw the live crosshair and spread ring
}) {
  let live = null;
  let liveKey = '';
  let locked = false;
  let frameId = null;
  let lastTick = 0;
  let mouse = { x: 0, y: 0 };
  let statsDirty = false;
  let statsTimer = null;
  let active = false;
  let lastFrame = null;
  // The click that takes the mouse does not fire; the lock arrives
  // asynchronously, so where the click landed waits for it.
  let pressPending = null;

  const supportsLock = typeof canvas.requestPointerLock === 'function' && 'pointerLockElement' in doc;

  function ensureLive() {
    const w = readBuild();
    if (!w) { live = null; liveKey = ''; return null; }
    const key = readSimKey();
    if (!live || liveKey !== key) {
      live = createLiveFire(w, { seed: (Math.random() * 0x100000000) >>> 0 });
      liveKey = key;
      markStats();
    }
    return live;
  }

  function markStats() {
    statsDirty = true;
    if (statsTimer != null) return;
    statsTimer = win.setTimeout(() => {
      statsTimer = null;
      if (!statsDirty) return;
      statsDirty = false;
      requestStats();
    }, STATS_REFRESH_MS);
  }

  function tick(now) {
    frameId = null;
    if (!active) return;
    const sim = ensureLive();
    if (!sim) return;
    const dt = Math.min(MAX_FRAME_S, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    const deg = readDegreesPerCount();
    const before = sim.state.shots;
    // Screen-down mouse movement is a downward view rotation.
    sim.advance(dt, { x: mouse.x * deg, y: -mouse.y * deg });
    mouse = { x: 0, y: 0 };
    if (sim.state.shots !== before) markStats();
    render();
    if (locked || !sim.settled()) schedule();
  }

  function schedule() {
    if (frameId != null || !active) return;
    frameId = win.requestAnimationFrame(tick);
  }

  function start() {
    lastTick = win.performance.now();
    schedule();
  }

  function stop() {
    if (frameId != null) win.cancelAnimationFrame(frameId);
    frameId = null;
    mouse = { x: 0, y: 0 };
  }

  function requestLock() {
    if (!supportsLock || locked || !active) return;
    canvas.focus?.({ preventScroll: true });
    let result;
    try {
      result = canvas.requestPointerLock({ unadjustedMovement: true });
    } catch {
      result = null;
    }
    // Browsers without raw input reject the option; fall back to adjusted movement.
    if (result && typeof result.catch === 'function') {
      result.catch(() => { try { canvas.requestPointerLock(); } catch { /* unsupported */ } });
    }
  }

  function releaseLock() {
    if (locked && doc.exitPointerLock) doc.exitPointerLock();
  }

  function onLockChange() {
    const now = doc.pointerLockElement === canvas;
    if (now === locked) return;
    locked = now;
    if (!locked) {
      live?.setTrigger(false);
      pressPending = null;
      markStats();
    } else {
      lastTick = win.performance.now();
      if (pressPending) {
        const sim = ensureLive();
        if (sim) alignAimTo(sim, pressPending);
        pressPending = null;
      }
    }
    requestHint();
    if (locked) schedule(); else render();
  }

  function onMouseMove(e) {
    if (!locked) return;
    mouse.x += e.movementX || 0;
    mouse.y += e.movementY || 0;
    schedule();
  }

  function onMouseDown(e) {
    if (!locked || e.button !== 0) return;
    e.preventDefault();
    ensureLive()?.setTrigger(true);
    schedule();
  }

  function onMouseUp(e) {
    if (e.button !== 0) return;
    if (!locked) return;
    e.preventDefault();
    live?.setTrigger(false);
  }

  /**
   * Start the crosshair under the cursor that took the mouse, so the hand-off
   * from cursor to crosshair is seamless.
   */
  function alignAimTo(sim, { clientX, clientY }) {
    const frame = lastFrame;
    const rect = canvas.getBoundingClientRect();
    if (!frame || !rect.width || !rect.height) return;
    const { CW, CH, toX, toY } = frame;
    const w = sim.state.weapon;
    const px = (clientX - rect.left) * CW / rect.width;
    const py = (clientY - rect.top) * CH / rect.height;
    const sx = toX(1) - toX(0), sy = toY(w, 1) - toY(w, 0);
    if (!sx || !sy) return;
    sim.state.aim.x = (px - toX(0)) / sx - sim.state.recoil.x;
    sim.state.aim.y = (py - toY(w, 0)) / sy - sim.state.recoil.y;
  }

  function onKeyDown(e) {
    if (!locked) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      reload();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      clear();
    }
  }

  function reload() {
    const sim = ensureLive();
    if (!sim) return;
    sim.reload();
    markStats();
    schedule();
    render();
  }

  function clear() {
    const sim = ensureLive();
    if (!sim) return;
    sim.clear();
    markStats();
    schedule();
    render();
  }

  function onCanvasPress(e) {
    if (!active || locked || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    pressPending = { clientX: e.clientX, clientY: e.clientY };
    requestLock();
  }

  /**
   * Keep the view direction inside the plot. The plot is fixed to the target,
   * so without a limit the mouse can carry the crosshair off the edge, where
   * the clip hides it and nothing shows where the aim went.
   */
  function clampAim(frame, sim) {
    const { PL, PT, PW, PH, toX, toY } = frame;
    const w = sim.state.weapon;
    const margin = 12;
    const view = sim.view();
    const vx = toX(view.x), vy = toY(w, view.y);
    const cx = Math.min(Math.max(vx, PL + margin), PL + PW - margin);
    const cy = Math.min(Math.max(vy, PT + margin), PT + PH - margin);
    const sx = toX(1) - toX(0), sy = toY(w, 1) - toY(w, 0);
    if (cx !== vx && sx) sim.state.aim.x += (cx - vx) / sx;
    if (cy !== vy && sy) sim.state.aim.y += (cy - vy) / sy;
  }

  function drawOverlay(frame, sim) {
    const { ctx, PL, PT, PW, PH, toX, toY, targetImpactYcm, targetHitTest, aimOffset, cmAt, sprayDotRadius } = frame;
    const w = sim.state.weapon;
    const col = '#c9a227';
    const impacts = sim.state.impacts;

    // Hit zones are resolved once per shot; the zone is a world-space result
    // so later zoom or pan changes never move a hit onto a miss.
    impacts.forEach(p => {
      if (p.zone !== undefined || !targetHitTest) return;
      p.zone = targetHitTest({ xCm: aimOffset.x + cmAt(p.x), yCm: targetImpactYcm(w, p.y) });
    });

    if (impacts.length > 1) {
      ctx.beginPath();
      impacts.forEach((p, i) => { const x = toX(p.view.x), y = toY(w, p.view.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = 'rgba(201,162,39,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    }

    impacts.forEach(p => {
      const x = toX(p.x), y = toY(w, p.y);
      const hit = !!p.zone;
      const r = hit ? sprayDotRadius * 1.3 : sprayDotRadius;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hit ? (RANGE_ZONE_COLORS[p.zone] ?? col) : col + '80'; ctx.fill();
      if (hit && r > 1.6) {
        ctx.strokeStyle = 'rgba(8,13,13,0.85)';
        ctx.lineWidth = Math.min(1.4, r * 0.32);
        ctx.stroke();
      }
    });

    // The live crosshair sits on the view direction; its ring is the spread the
    // next shot would be sampled from.
    const view = sim.view();
    const vx = toX(view.x), vy = toY(w, view.y);
    const spreadPx = Math.abs(toX(view.x + sim.currentSpread()) - vx);
    const reticle = readReticle();
    if (reticle && spreadPx > 0.5) {
      ctx.beginPath(); ctx.arc(vx, vy, spreadPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    }
    if (reticle) {
      ctx.strokeStyle = locked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.2;
      const arm = 9, gapPx = 3;
      ctx.beginPath();
      ctx.moveTo(vx - arm, vy); ctx.lineTo(vx - gapPx, vy);
      ctx.moveTo(vx + gapPx, vy); ctx.lineTo(vx + arm, vy);
      ctx.moveTo(vx, vy - arm); ctx.lineTo(vx, vy - gapPx);
      ctx.moveTo(vx, vy + gapPx); ctx.lineTo(vx, vy + arm);
      ctx.stroke();
    }
    ctx.restore();

    // HUD: ammunition and the trigger mode, drawn outside the clip so it never
    // slides off with the view.
    const mode = { auto: 'Hold to fire', burst: 'Click per burst', single: 'Click per shot' }[sim.state.triggerMode];
    const ammo = Number.isFinite(sim.state.magazine) ? `${sim.state.ammo} / ${sim.state.magazine}` : `${sim.state.shots} fired`;
    // Top-right belongs to the crosshair toggle, so the read-outs stack at top-left.
    ctx.font = '600 11px sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = sim.state.ammo === 0 ? '#ff7b1c' : 'rgba(225,232,232,0.9)';
    ctx.fillText(sim.state.ammo === 0 ? `${ammo} · R to reload` : ammo, PL + 6, PT + 6);
    ctx.fillStyle = 'rgba(160,175,175,0.85)';
    ctx.fillText(`${sim.state.shots} shot${sim.state.shots === 1 ? '' : 's'} · ${mode}`, PL + 6, PT + 20);
    if (locked) {
      // The cursor is gone while the plot holds the mouse, so the keys are the
      // only controls; keep them in view.
      ctx.fillStyle = 'rgba(160,175,175,0.7)';
      ctx.fillText('R reload · C clear · Esc releases the mouse', PL + 6, PT + 34);
    }

    if (!locked) {
      const label = supportsLock ? 'Click the plot to take control' : 'Pointer capture is not available in this browser';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 12px sans-serif';
      const width = ctx.measureText(label).width + 22;
      const cx = PL + PW / 2, cy = PT + PH - 22;
      ctx.fillStyle = 'rgba(8,13,13,0.78)';
      ctx.fillRect(cx - width / 2, cy - 11, width, 22);
      ctx.fillStyle = supportsLock ? '#e1e8e8' : '#ff7b1c';
      ctx.fillText(label, cx, cy);
    }
  }

  /** Draw the frame and the live sample. Returns the axis summary renderRecoil expects. */
  function render() {
    const frame = drawFrame(canvas, { crosshair: false });
    lastFrame = frame;
    const sim = ensureLive();
    if (!sim) {
      frame.ctx.restore();
      return { ...frame, targetHits: [] };
    }
    clampAim(frame, sim);
    drawOverlay(frame, sim);
    const zones = sim.state.impacts.map(p => p.zone ?? null);
    return {
      ...frame,
      targetHits: [{ weapon: sim.state.weapon, zones, hits: zones.filter(Boolean).length, total: zones.length }],
    };
  }

  function bind() {
    doc.addEventListener('pointerlockchange', onLockChange);
    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mousedown', onMouseDown);
    doc.addEventListener('mouseup', onMouseUp);
    doc.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('mousedown', onCanvasPress);
    canvas.addEventListener('contextmenu', e => { if (locked) e.preventDefault(); });
  }
  bind();

  return {
    render,
    /** Called whenever the recoil panel re-renders: start or stop with the view. */
    setActive(on) {
      if (on === active) return;
      active = on;
      if (active) start();
      else { releaseLock(); live?.setTrigger(false); stop(); }
    },
    /** Clear the sample and return the aim to the starting point. */
    reset() {
      live = null;
      liveKey = '';
      ensureLive();
      markStats();
      render();
    },
    /** Wipe the board but keep the aim, magazine and view. */
    clear,
    /** Refill the magazine and wipe the board. */
    reload,
    releaseLock,
    isLocked: () => locked,
    supportsLock: () => supportsLock,
    live: () => ensureLive(),
    triggerModeFor,
  };
}
