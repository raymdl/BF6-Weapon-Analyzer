/** Touch-only plot controls. Inline touches remain available to page scrolling;
 * the modal owns touches only while its expanded canvas is open. */
export function bindRecoilTouchControls({ canvas, readView, readZoom, worldAt,
  transformView, redraw, aim, resetView, repaint, doc = document, win = window }) {
  const viewport = canvas.closest('.rc-viewport');
  const controls = doc.getElementById('rcTouchControls');
  const aimButton = doc.getElementById('rcSetAim');
  const expandButton = doc.getElementById('rcExpandPlot');
  const resetButton = doc.getElementById('rcTouchResetView');
  const dialog = doc.getElementById('rcExpandedPlot');
  const closeButton = doc.getElementById('rcCloseExpandedPlot');
  const slot = doc.getElementById('rcExpandedPlotSlot');
  // Includes large landscape tablets; narrow mouse-only windows still keep
  // the existing desktop interface. Hybrid devices can use either input.
  const layout = win.matchMedia('(max-width: 1440px)');
  const coarse = win.matchMedia('(any-pointer: coarse)');
  const pointers = new Map();
  let touchSeen = false, enabled = false, armed = false, gesture = null, marker = null;

  function hint() {
    if (!enabled) return null;
    if (armed) return 'Tap the plot to aim & redraw once · Enter aims at the view center · Set aim again to cancel';
    return dialog.open
      ? 'Use two fingers to pinch or pan · Redraw makes a new sample · Reset view keeps aim & sample'
      : readView() === 'target'
        ? 'Redraw keeps your aim · Set aim, then tap the plot · Expand to pinch or pan'
        : 'Redraw makes a new sample · Expand to pinch or pan';
  }
  function sync() {
    controls.hidden = !enabled;
    aimButton.hidden = readView() !== 'target';
    aimButton.setAttribute('aria-pressed', String(armed));
    aimButton.textContent = armed ? 'Cancel aim' : 'Set aim';
    canvas.classList.toggle('touch-aiming', armed);
    viewport.classList.toggle('rc-touch-layout', enabled);
    expandButton.hidden = dialog.open;
    resetButton.hidden = !dialog.open;
    const text = doc.getElementById('rcHint');
    const nextHint = hint() ?? (readView() === 'target'
      ? 'Ctrl + click to aim & redraw · Shift + drag to pan · Shift + scroll to zoom'
      : 'Ctrl + click to redraw · Shift + drag to pan · Shift + scroll to zoom');
    if (text && text.textContent !== nextHint) text.textContent = nextHint;
  }
  function cancel() {
    gesture = null;
    armed = false;
    const ids = [...pointers.keys()];
    pointers.clear();
    for (const id of ids) {
      try { if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } catch { /* already gone */ }
    }
    sync();
  }
  function close() {
    if (dialog.open) dialog.close();
  }
  function refreshCapability() {
    enabled = layout.matches && ((win.navigator.maxTouchPoints || 0) > 0 || coarse.matches || touchSeen);
    if (!enabled) { cancel(); close(); }
    sync();
  }
  function pair() {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  function startGesture() {
    gesture = null;
    if (pointers.size !== 2 || !dialog.open) return;
    const p = pair(), anchor = worldAt(p.x, p.y);
    if (p.distance < 1 || !anchor) return;
    gesture = { ...p, anchor, zoom: readZoom() };
  }
  function inside(x, y) {
    const r = canvas.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  doc.getElementById('rcRedraw').addEventListener('click', () => { cancel(); redraw(); });
  aimButton.addEventListener('click', () => {
    const next = !armed;
    cancel();
    armed = next && readView() === 'target';
    sync();
    if (armed) canvas.focus({ preventScroll: true });
  });
  resetButton.addEventListener('click', () => { cancel(); resetView(); });
  expandButton.addEventListener('click', () => {
    if (!enabled || dialog.open) return;
    cancel();
    marker = doc.createComment('expanded plot position');
    viewport.before(marker);
    slot.append(viewport);
    dialog.showModal();
    doc.body.classList.add('rc-plot-expanded');
    sync();
    closeButton.focus();
    repaint();
  });
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', () => {
    cancel();
    marker?.replaceWith(viewport);
    marker = null;
    doc.body.classList.remove('rc-plot-expanded');
    sync();
    if (enabled) expandButton.focus({ preventScroll: true });
    else canvas.focus({ preventScroll: true });
    repaint();
  });
  dialog.addEventListener('cancel', () => { cancel(); });
  canvas.addEventListener('keydown', e => {
    if (!armed || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const p = worldAt(r.left + r.width / 2, r.top + r.height / 2);
    cancel();
    if (p && readView() === 'target') aim(p.x, p.y);
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') {
      // Switching input must not leave a pending tap armed after a mouse/pen
      // action. The separate desktop handler still receives this event.
      if (armed || pointers.size) cancel();
      return;
    }
    if (!touchSeen) { touchSeen = true; refreshCapability(); }
    if (!enabled) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY, tap: true });
    if (dialog.open) {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* already gone */ }
    }
    if (pointers.size > 1) {
      armed = false;
      for (const p of pointers.values()) p.tap = false;
      startGesture();
      sync();
    }
  });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (e.pointerType !== 'touch' || !p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.startX, p.y - p.startY) > 10) p.tap = false;
    if (!dialog.open) return;
    e.preventDefault();
    if (pointers.size === 2 && gesture) {
      const current = pair();
      transformView(gesture.zoom, current.distance / gesture.distance,
        gesture.anchor, current.x, current.y);
    }
  });
  function endPointer(e) {
    const p = pointers.get(e.pointerId);
    if (!p || e.pointerType !== 'touch') return;
    pointers.delete(e.pointerId);
    gesture = null;
    if (e.type !== 'pointerup') {
      cancel();
      return;
    }
    if (p.tap && armed && pointers.size === 0 && inside(e.clientX, e.clientY)
      && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) <= 10) {
      const point = worldAt(e.clientX, e.clientY);
      cancel();
      if (point && readView() === 'target') aim(point.x, point.y);
    }
    startGesture();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);
  win.addEventListener('blur', cancel);
  win.addEventListener('resize', cancel);
  layout.addEventListener('change', refreshCapability);
  coarse.addEventListener('change', refreshCapability);
  refreshCapability();
  return { sync, cancel, hint, isExpanded: () => dialog.open };
}
