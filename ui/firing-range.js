/**
 * ui/firing-range.js — Firing Range view: live fire driven by the player's mouse.
 *
 * The plot captures the pointer (Pointer Lock), the left button is the trigger,
 * and raw mouse counts are turned into degrees of view rotation through the
 * sensitivity settings. The sim itself lives in sim/live-fire.js; this module
 * owns the capture, the animation loop and the overlay drawn on the shared plot.
 */
import { createLiveFire, triggerModeFor } from '../sim/live-fire.js';
import { summarizeTargetImpacts } from '../sim/target.js';

const STATS_REFRESH_MS = 150;
const MAX_FRAME_S = 0.1;
const KILL_COLOR = '#ff5c5c';
const KILL_PULSE_S = 0.6;

/**
 * Impact dot colour per hit zone: red head, the weapon's gold for a full-damage
 * upper torso hit, cool off-white for the reduced lower torso and limbs. Misses
 * are faded grey.
 */
export const RANGE_ZONE_COLORS = {
  head: '#ff4d4d',
  chest: '#c9a227',
  stomach: '#d8e2e2',
  arms: '#d8e2e2',
  legs: '#d8e2e2',
};
export const RANGE_MISS_COLOR = '#8fa0a0';
export const RANGE_ZONE_LEGEND = [
  ['head', 'Head'], ['chest', 'Upper torso'], ['stomach', 'Lower torso, arms, legs'],
];

/** Hit zones per shot for the stats: one zone per shot, or one per pellet for a pellet load. */
export function rangeImpactZones(impacts) {
  return impacts.map(p => p.pellets ? p.pellets.map(q => q.zone ?? null) : (p.zone ?? null));
}

export function createFiringRange({
  canvas, doc = document, win = window,
  readBuild,            // () => the first slot's applied weapon, or null
  readSimKey,           // () => string naming the build + aim/stance/platform context
  readDegreesPerCount,  // () => degrees of view rotation per mouse count
  drawFrame,            // (canvas, { crosshair }) => plot frame with mapping helpers
  requestStats,         // () => void, refresh the stats panel for the live sample
  requestHint,          // () => void, refresh the hint line and buttons
  readDistance,         // () => target distance in metres, for the damage that decides a kill
  onCycleFireMode,      // () => void, step to the next fire mode the loadout offers
  readInvertY = () => false, // () => true when vertical mouse movement is inverted
}) {
  let live = null;
  let liveKey = '';
  let locked = false;
  let flashedKill = null;
  let hovered = null;
  let frameId = null;
  let lastTick = 0;
  let mouse = { x: 0, y: 0 };
  let statsDirty = false;
  let statsTimer = null;
  let active = false;
  let lastFrame = null;
  // While the plot holds the mouse the view may travel up over the control
  // bar above it, where a virtual cursor works the sliders and buttons.
  let cursorEl = null;
  let dragSlider = null;
  // Up on the bar the cursor lives in canvas pixels and moves one pixel per
  // count like an ordinary pointer, independent of the plot's zoom.
  let bar = null;
  let movedUp = false;
  // The click that takes the mouse does not fire; the lock arrives
  // asynchronously, so where the click landed waits for it.
  let pressPending = null;

  const supportsLock = typeof canvas.requestPointerLock === 'function' && 'pointerLockElement' in doc;

  function ensureLive() {
    const w = readBuild();
    if (!w) { live = null; liveKey = ''; return null; }
    const key = readSimKey();
    if (!live || liveKey !== key) {
      // A loadout change made under capture (the fire mode, say) keeps the
      // crosshair where it is instead of snapping it back to the centre.
      const keep = live && locked ? { ...live.state.aim } : null;
      live = createLiveFire(w, { seed: (Math.random() * 0x100000000) >>> 0 });
      if (keep) Object.assign(live.state.aim, keep);
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
    movedUp = mouse.y < 0;
    if (bar) {
      moveBarCursor(sim);
      sim.advance(dt);
    } else {
      // Screen-down mouse movement is a downward view rotation.
      sim.advance(dt, { x: mouse.x * deg, y: -mouse.y * deg });
    }
    mouse = { x: 0, y: 0 };
    if (sim.state.shots !== before) markStats();
    render();
    if (dragSlider) setSliderFromCursor(sim);
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
    // No focus ring while the browser decides: a refusal would flash one.
    canvas.classList?.add('lock-pending');
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
    // The outline means "the plot has the mouse", nothing else: it follows
    // the lock, and the focus the lock request gave the canvas is let go on
    // release so the keyboard focus ring does not linger as a false signal.
    canvas.classList?.toggle('captured', locked);
    canvas.classList?.remove('lock-pending');
    // One frame around the control bar and the canvas: the area the captured cursor reaches.
    const captureEl = canvas.closest?.('.rc-capture');
    captureEl?.classList.toggle('captured', locked);
    // A spent kill flash would replay when the frame reappears.
    captureEl?.classList.remove('kill-flash');
    if (!locked) canvas.blur?.();
    if (!locked) {
      live?.setTrigger(false);
      pressPending = null;
      dragSlider = null;
      bar = null;
      syncAimedControl(live);
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
    if (!locked || e.shiftKey) return;
    mouse.x += e.movementX || 0;
    // Inverted at the input, so the view and the bar cursor flip together.
    mouse.y += (readInvertY() ? -1 : 1) * (e.movementY || 0);
    schedule();
  }

  /**
   * While the plot holds the mouse every click lands on the canvas, so the
   * crosshair stands in for the cursor over the buttons drawn on top of it.
   */
  const plotColumn = () => canvas.closest?.('.rc-plot') ?? canvas.parentElement;
  const controlBar = () => plotColumn()?.querySelector?.('.rc-viewbar') ?? null;

  /** How far above the plot the view may travel, in canvas pixels: the control bar while locked. */
  function barReach(frame) {
    const el = controlBar();
    if (!locked || !el) return 0;
    const rect = canvas.getBoundingClientRect();
    if (!rect.height) return 0;
    return Math.max(0, rect.top - el.getBoundingClientRect().top) * frame.CH / rect.height;
  }

  /** Move the bar cursor by the frame's mouse counts; drop back into the plot past its top edge. */
  function moveBarCursor(sim) {
    const frame = lastFrame;
    if (!frame || !bar) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width ? frame.CW / rect.width : 1;
    // The cursor runs the bar's full width, which may be wider than a canvas
    // capped to the viewport; the whole canvas below it is crosshair territory.
    const barRect = controlBar()?.getBoundingClientRect();
    const minX = barRect && rect.width ? (barRect.left - rect.left) * scale : 0;
    const maxX = barRect && rect.width ? (barRect.right - rect.left) * scale : frame.CW;
    bar.x = Math.min(Math.max(bar.x + mouse.x * scale, minX), maxX);
    bar.y += mouse.y * scale;
    const top = -barReach(frame);
    if (bar.y < top) bar.y = top;
    if (bar.y >= 0) {
      // Back onto the canvas: the crosshair takes over just below the edge, so
      // the clamp does not lift it straight back onto the bar.
      const w = sim.state.weapon;
      const sx = frame.toX(1) - frame.toX(0), sy = frame.toY(w, 1) - frame.toY(w, 0);
      if (sx && sy) {
        sim.state.aim.x = (Math.min(Math.max(bar.x, 0), frame.CW) - frame.toX(0)) / sx - sim.state.recoil.x;
        sim.state.aim.y = (1 - frame.toY(w, 0)) / sy - sim.state.recoil.y;
      }
      bar = null;
    }
  }

  /** The view direction as a client-space point, and whether it is up over the control bar. */
  function cursorClient(frame, sim) {
    if (!frame || !sim) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const view = sim.view();
    const px = bar ? bar.x : frame.toX(view.x), py = bar ? bar.y : frame.toY(sim.state.weapon, view.y);
    return { x: rect.left + px * rect.width / frame.CW, y: rect.top + py * rect.height / frame.CH, overBar: !!bar };
  }

  function aimedControl(sim) {
    const pos = cursorClient(lastFrame, sim);
    if (!pos) return null;
    const column = plotColumn();
    // The arms of the crosshair count too, so a control need not sit under its centre.
    for (const [dx, dy] of [[0, 0], [0, -8], [8, 0], [-8, 0], [0, 8]]) {
      const el = doc.elementFromPoint?.(pos.x + dx, pos.y + dy)?.closest?.('button, input[type=range]');
      if (el && el !== canvas && column?.contains(el)) return el;
    }
    return null;
  }

  function syncAimedControl(sim) {
    const target = locked ? aimedControl(sim) : null;
    plotColumn()?.querySelectorAll('.rc-aimed').forEach(el => { if (el !== target) el.classList.remove('rc-aimed'); });
    target?.classList.add('rc-aimed');
    // The real pointer is hidden under capture, so tell the page's tooltips
    // when the virtual cursor moves onto or off a control.
    if (target !== hovered) {
      const Ev = win.MouseEvent ?? win.Event;
      hovered?.dispatchEvent(new Ev('mouseout', { bubbles: true, relatedTarget: target }));
      target?.dispatchEvent(new Ev('mouseover', { bubbles: true, relatedTarget: hovered }));
      hovered = target;
    }
    return target;
  }

  /**
   * Show the virtual cursor over the control bar when the view is up there, and
   * over a control in the plot's corners: those sit above the canvas, so the
   * crosshair drawn on it would vanish behind the button it is aimed at.
   */
  function syncCursor(frame, sim, aimed = null) {
    const pos = locked ? cursorClient(frame, sim) : null;
    const host = !pos ? null : pos.overBar ? controlBar() : aimed ? canvas.parentElement : null;
    if (!host) {
      cursorEl?.remove();
      cursorEl = null;
      return;
    }
    if (!cursorEl) {
      cursorEl = doc.createElement('div');
      cursorEl.className = 'rc-range-cursor';
    }
    if (cursorEl.parentElement !== host) host.appendChild(cursorEl);
    const hostRect = host.getBoundingClientRect();
    cursorEl.style.left = `${pos.x - hostRect.left}px`;
    cursorEl.style.top = `${pos.y - hostRect.top}px`;
  }

  function setSliderFromCursor(sim) {
    const slider = dragSlider;
    const pos = cursorClient(lastFrame, sim);
    if (!slider || !pos) return;
    const rect = slider.getBoundingClientRect();
    if (!rect.width) return;
    const min = +slider.min || 0, max = +slider.max || 100, step = +slider.step || 1;
    const frac = Math.min(1, Math.max(0, (pos.x - rect.left) / rect.width));
    const value = min + Math.round(frac * (max - min) / step) * step;
    if (String(value) === slider.value) return;
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function onMouseDown(e) {
    if (!locked || e.button !== 0) return;
    // Shift + drag pans the plot; the canvas handles it.
    if (e.shiftKey) return;
    e.preventDefault();
    const sim = ensureLive();
    const control = aimedControl(sim);
    if (control) {
      if (control.matches?.('input[type=range]')) {
        dragSlider = control;
        setSliderFromCursor(sim);
      } else {
        control.click();
      }
      return;
    }
    // Up over the bar but on nothing: not a shot.
    if (cursorClient(lastFrame, sim)?.overBar) return;
    sim?.setTrigger(true);
    schedule();
  }

  function onMouseUp(e) {
    if (e.button !== 0) return;
    dragSlider = null;
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
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      onCycleFireMode?.();
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
    const { CW, CH, toX, toY } = frame;
    const w = sim.state.weapon;
    const view = sim.view();
    const vx = toX(view.x), vy = toY(w, view.y);
    // The whole canvas, edge to edge, is the crosshair's run.
    const cx = Math.min(Math.max(vx, 0), CW);
    const cy = Math.min(Math.max(vy, 0), CH);
    const sx = toX(1) - toX(0), sy = toY(w, 1) - toY(w, 0);
    if (cx !== vx && sx) sim.state.aim.x += (cx - vx) / sx;
    if (cy !== vy && sy) sim.state.aim.y += (cy - vy) / sy;
    // Pushed up past the top edge by the mouse itself (not recoil): the cursor
    // climbs onto the control bar.
    if (!bar && movedUp && vy < cy && barReach(frame) > 0 && !sim.state.trigger) bar = { x: cx, y: -1 };
  }

  /** The shot that took the running damage to a kill, if the board has one. */
  function lethalImpact(sim) {
    const w = sim.state.weapon;
    if (!Number.isFinite(w._hsMult) || !Number.isFinite(w._limbMult)) return null;
    const impacts = sim.state.impacts;
    if (!impacts.length) return null;
    const summary = summarizeTargetImpacts(w, readDistance(), rangeImpactZones(impacts));
    if (summary.lethalShot == null) return null;
    const impact = impacts[summary.lethalShot - 1];
    // Time to kill runs from the first shot on the board.
    return { impact, hits: summary.lethalHit, shot: summary.lethalShot, ms: (impact.t - impacts[0].t) * 1000 };
  }

  function drawOverlay(frame, sim) {
    const { ctx, PL, PT, PW, PH, toX, toY, targetImpactYcm, targetHitTest, aimOffset, cmAt, sprayDotRadius } = frame;
    const w = sim.state.weapon;
    const col = '#c9a227';
    const impacts = sim.state.impacts;

    // Hit zones are resolved once per shot; the zone is a world-space result
    // so later zoom or pan changes never move a hit onto a miss.
    const zoneAt = p => targetHitTest({ xCm: aimOffset.x + cmAt(p.x), yCm: targetImpactYcm(w, p.y) });
    impacts.forEach(p => {
      if (p.zone !== undefined || !targetHitTest) return;
      p.zone = zoneAt(p);
      p.pellets?.forEach(q => { q.zone = zoneAt(q); });
    });

    if (impacts.length > 1) {
      // One line per string of shots; a pause between bursts or presses breaks it.
      ctx.beginPath();
      impacts.forEach((p, i) => { const x = toX(p.view.x), y = toY(w, p.view.y); i === 0 || !p.continues ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = 'rgba(201,162,39,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    }

    // A pellet load draws its pellets, smaller, in place of the shell's own dot.
    const drawDot = (p, scale) => {
      const x = toX(p.x), y = toY(w, p.y);
      const hit = !!p.zone;
      const r = (hit ? sprayDotRadius * 1.3 : sprayDotRadius) * scale;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hit ? (RANGE_ZONE_COLORS[p.zone] ?? col) : RANGE_MISS_COLOR + '80'; ctx.fill();
      if (hit && r > 1.6) {
        ctx.strokeStyle = 'rgba(8,13,13,0.85)';
        ctx.lineWidth = Math.min(1.4, r * 0.32);
        ctx.stroke();
      }
    };
    impacts.forEach(p => { p.pellets ? p.pellets.forEach(q => drawDot(q, 0.7)) : drawDot(p, 1); });

    // The killing shot gets a ring that pulses out as it lands and fades.
    const kill = lethalImpact(sim);
    if (kill) {
      const age = sim.state.t - kill.impact.t;
      // The capture frame flashes red once per new kill.
      if (kill.impact !== flashedKill && age < KILL_PULSE_S) {
        flashedKill = kill.impact;
        const frameEl = canvas.closest?.('.rc-capture');
        if (frameEl) {
          frameEl.classList.remove('kill-flash');
          void frameEl.offsetWidth;
          frameEl.classList.add('kill-flash');
        }
      }
      if (age < KILL_PULSE_S) {
        const x = toX(kill.impact.x), y = toY(w, kill.impact.y);
        const k = age / KILL_PULSE_S;
        ctx.strokeStyle = KILL_COLOR; ctx.lineWidth = 2;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(x, y, sprayDotRadius * 1.3 + 4 + k * 28, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // The live crosshair sits on the view direction; its ring is the spread the
    // next shot would be sampled from. Both are drawn outside the plot clip so
    // they stay visible over the axis margins.
    ctx.restore();
    const view = sim.view();
    const vx = toX(view.x), vy = toY(w, view.y);
    const spreadPx = Math.abs(toX(view.x + sim.currentSpread()) - vx);
    // Shown only while the plot holds the mouse; the next click places it anew.
    const showReticle = locked && !bar;
    if (showReticle && spreadPx > 0.5) {
      ctx.beginPath(); ctx.arc(vx, vy, spreadPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    }
    // A pellet load adds a dashed ring: the farthest a pellet can land, spread plus dispersion.
    const patternPx = Math.abs(toX(view.x + sim.currentSpread() + sim.pelletDispersion()) - vx);
    if (showReticle && sim.pelletDispersion() > 0 && patternPx > spreadPx + 0.5) {
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(vx, vy, patternPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
    }
    if (showReticle) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.2;
      const arm = 9, gapPx = 3;
      ctx.beginPath();
      ctx.moveTo(vx - arm, vy); ctx.lineTo(vx - gapPx, vy);
      ctx.moveTo(vx + gapPx, vy); ctx.lineTo(vx + arm, vy);
      ctx.moveTo(vx, vy - arm); ctx.lineTo(vx, vy - gapPx);
      ctx.moveTo(vx, vy + gapPx); ctx.lineTo(vx, vy + arm);
      ctx.stroke();
    }

    // HUD: ammunition and the trigger mode, drawn outside the clip so it never
    // slides off with the view.
    const mode = { auto: 'Hold to fire', burst: 'Click to burst', single: 'Click to fire' }[sim.state.triggerMode];
    const ammo = Number.isFinite(sim.state.magazine) ? `Mag: ${sim.state.ammo} / ${sim.state.magazine}` : 'Mag: ∞';
    // Top-right belongs to the range controls, so the read-outs stack at top-left.
    ctx.font = '600 11px sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const ammoText = sim.state.ammo === 0 ? `${ammo} · R to reload` : ammo;
    ctx.fillStyle = sim.state.ammo === 0 ? '#ff7b1c' : 'rgba(225,232,232,0.9)';
    ctx.fillText(ammoText, PL + 6, PT + 6);
    ctx.fillStyle = 'rgba(160,175,175,0.85)';
    ctx.fillText(` · ${sim.state.shots} shot${sim.state.shots === 1 ? '' : 's'} fired`, PL + 6 + ctx.measureText(ammoText).width, PT + 6);
    if (kill) {
      ctx.fillStyle = KILL_COLOR;
      ctx.font = '700 12px sans-serif';
      ctx.fillText(`KILL on shot ${kill.shot} (${kill.hits} hit${kill.hits === 1 ? '' : 's'}) · ${Math.round(kill.ms)}ms TTK`, PL + 6, PT + 22);
    }

    // The banner says how to get in, and once in, how to get out.
    {
      const label = !supportsLock ? 'Pointer capture is not available in this browser'
        : locked ? 'Press Esc to release control' : 'Click the plot to take control';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 12px sans-serif';
      const width = ctx.measureText(label).width + 22;
      const cx = PL + PW / 2, cy = PT + PH - 22;
      ctx.fillStyle = 'rgba(8,13,13,0.78)';
      ctx.fillRect(cx - width / 2, cy - 11, width, 22);
      ctx.fillStyle = supportsLock ? '#e1e8e8' : '#ff7b1c';
      ctx.fillText(label, cx, cy);
      // Once the plot has the mouse, the trigger hint sits just above the banner.
      if (locked) {
        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = 'rgba(160,175,175,0.85)';
        ctx.fillText(mode, cx, cy - 20);
      }
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
    syncCursor(frame, sim, syncAimedControl(sim));
    const zones = rangeImpactZones(sim.state.impacts);
    return {
      ...frame,
      targetHits: [{ weapon: sim.state.weapon, zones, hits: zones.flat().filter(Boolean).length, total: zones.flat().length }],
    };
  }

  function bind() {
    doc.addEventListener('pointerlockchange', onLockChange);
    // A refused request (browsers refuse one for about a second after Esc)
    // leaves the press with nothing to do; say so in the console for diagnosis.
    // The focus the request gave the canvas is let go, so no outline suggests a capture.
    doc.addEventListener('pointerlockerror', () => { pressPending = null; if (!locked) canvas.blur?.(); canvas.classList?.remove('lock-pending'); win.console?.warn?.('Firing Range: the browser refused pointer capture; click the plot again.'); });
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
      // Under capture the pointer stays put; only the sample and the view reset.
      const keep = locked && live ? { ...live.state.aim } : null;
      live = null;
      liveKey = '';
      const sim = ensureLive();
      if (sim && keep) Object.assign(sim.state.aim, keep);
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
