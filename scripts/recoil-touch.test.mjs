import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { bindRecoilTouchControls } from '../ui/recoil-touch.js';

// Mock the DOM boundary, not the shipped controller. No browser dependency in CI.
class Element {
  constructor() {
    this.events = new Map(); this.classes = new Set(); this.attributes = {};
    this.hidden = false; this.open = false; this.captured = new Set();
    this.classList = {
      add: v => this.classes.add(v), remove: v => this.classes.delete(v),
      toggle: (v, on) => on ? this.classes.add(v) : this.classes.delete(v),
    };
  }
  addEventListener(type, fn) {
    if (!this.events.has(type)) this.events.set(type, []);
    this.events.get(type).push(fn);
  }
  emit(type, values = {}) {
    const event = { type, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100,
      prevented: false, preventDefault() { this.prevented = true; }, ...values };
    for (const fn of this.events.get(type) ?? []) fn(event);
    return event;
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  focus() { this.doc.activeElement = this; }
  closest() { return this.viewport; }
  before(marker) { marker.parent = this.parent; }
  append(child) { child.parent = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 }; }
}
function harness({ touch = 1, narrow = true, coarse = false, view = 'target' } = {}) {
  const ids = ['rcMain', 'rcTouchControls', 'rcSetAim', 'rcExpandPlot', 'rcTouchResetView',
    'rcExpandedPlot', 'rcCloseExpandedPlot', 'rcExpandedPlotSlot', 'rcRedraw', 'rcHint'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  const doc = { body: new Element(), getElementById: id => nodes[id],
    createComment: () => ({ parent: null, replaceWith(child) { child.parent = this.parent; } }) };
  for (const node of Object.values(nodes)) node.doc = doc;
  const viewport = new Element(), home = new Element();
  viewport.parent = home; nodes.rcMain.viewport = viewport;
  const layout = new Element(), pointer = new Element(), win = new Element();
  layout.matches = narrow; pointer.matches = coarse;
  win.navigator = { maxTouchPoints: touch };
  win.matchMedia = query => query.includes('max-width') ? layout : pointer;
  const calls = { aim: [], redraw: 0, transforms: [], reset: 0, repaint: 0 };
  const controller = bindRecoilTouchControls({ doc, win, canvas: nodes.rcMain,
    readView: () => view, readZoom: () => 5, worldAt: (x, y) => ({ x: x / 10, y: y / 10 }),
    aim: (...args) => calls.aim.push(args), redraw: () => calls.redraw++,
    transformView: (...args) => calls.transforms.push(args), resetView: () => calls.reset++,
    repaint: () => calls.repaint++ });
  const emit = (type, values) => nodes.rcMain.emit(type, values);
  const tap = values => { const down = emit('pointerdown', values); const up = emit('pointerup', values); return [down, up]; };
  return { nodes, doc, win, layout, pointer, calls, controller, viewport, home, emit, tap,
    setView: value => { controller.cancel(); view = value; controller.sync(); } };
}

test('touch controls require both touch capability and responsive layout; hybrid mouse stays untouched', () => {
  const desktop = harness({ touch: 0 });
  assert.equal(desktop.nodes.rcTouchControls.hidden, true);
  assert.equal(desktop.tap({ pointerType: 'mouse' })[0].prevented, false);
  assert.equal(desktop.nodes.rcTouchControls.hidden, true);
  desktop.tap(); // A real touch also detects capability on a hybrid device.
  assert.equal(desktop.nodes.rcTouchControls.hidden, false);
  assert.equal(harness({ narrow: false }).nodes.rcTouchControls.hidden, true);
  assert.equal(harness({ touch: 0, coarse: true }).nodes.rcTouchControls.hidden, false);
});

test('Set aim arms one tap, redraw disarms it, and keyboard can aim at the view center', () => {
  const h = harness();
  h.tap(); assert.equal(h.calls.aim.length, 0);
  h.nodes.rcSetAim.emit('click');
  assert.equal(h.nodes.rcSetAim.attributes['aria-pressed'], 'true');
  assert.equal(h.doc.activeElement, h.nodes.rcMain);
  assert.ok(h.tap().every(e => !e.prevented)); // Inline scroll remains browser-owned.
  assert.deepEqual(h.calls.aim, [[10, 10]]);
  assert.equal(h.nodes.rcSetAim.attributes['aria-pressed'], 'false');
  h.tap(); assert.equal(h.calls.aim.length, 1);
  h.nodes.rcSetAim.emit('click'); h.nodes.rcRedraw.emit('click');
  assert.equal(h.calls.redraw, 1); assert.equal(h.nodes.rcSetAim.attributes['aria-pressed'], 'false');
  h.nodes.rcSetAim.emit('click'); h.emit('keydown', { key: 'Enter' });
  assert.deepEqual(h.calls.aim.at(-1), [20, 20]);
  h.nodes.rcSetAim.emit('click');
  assert.equal(h.emit('pointerdown', { pointerType: 'mouse' }).prevented, false);
  assert.equal(h.nodes.rcSetAim.attributes['aria-pressed'], 'false');
  h.setView('angle'); assert.equal(h.nodes.rcSetAim.hidden, true);
});

test('scrolls, cancelled pointers, outside releases and multi-touch never place an aim', () => {
  const h = harness();
  for (const ending of ['pointercancel', 'lostpointercapture']) {
    h.nodes.rcSetAim.emit('click'); h.emit('pointerdown'); h.emit(ending); h.emit('pointerup');
    assert.equal(h.nodes.rcSetAim.attributes['aria-pressed'], 'false');
  }
  h.nodes.rcSetAim.emit('click'); h.emit('pointerdown');
  h.emit('pointermove', { clientY: 150 }); h.emit('pointerup', { clientY: 150 });
  h.controller.cancel(); h.nodes.rcSetAim.emit('click');
  h.emit('pointerdown'); h.emit('pointerup', { clientX: 450 });
  h.controller.cancel(); h.nodes.rcSetAim.emit('click');
  h.emit('pointerdown'); h.emit('pointerdown', { pointerId: 2, clientX: 200 });
  h.emit('pointerup'); h.emit('pointerup', { pointerId: 2 });
  assert.equal(h.calls.aim.length, 0);
});

test('pinch and two-finger pan are expanded-only and rebaseline for repeated gestures', () => {
  const h = harness();
  h.emit('pointerdown', { clientX: 100 }); h.emit('pointerdown', { pointerId: 2, clientX: 200 });
  assert.equal(h.emit('pointermove', { pointerId: 2, clientX: 300 }).prevented, false);
  assert.equal(h.calls.transforms.length, 0);
  h.controller.cancel(); h.nodes.rcExpandPlot.emit('click');
  assert.equal(h.viewport.parent, h.nodes.rcExpandedPlotSlot);
  assert.equal(h.doc.activeElement, h.nodes.rcCloseExpandedPlot);
  assert.equal(h.emit('pointerdown', { clientX: 100 }).prevented, true);
  h.emit('pointerdown', { pointerId: 2, clientX: 200 });
  h.emit('pointermove', { pointerId: 2, clientX: 300 });
  assert.deepEqual(h.calls.transforms.at(-1), [5, 2, { x: 15, y: 10 }, 200, 100]);
  h.emit('pointerup', { pointerId: 2, clientX: 300 });
  const count = h.calls.transforms.length;
  h.emit('pointermove', { clientX: 120 }); assert.equal(h.calls.transforms.length, count);
  h.emit('pointerdown', { pointerId: 2, clientX: 220 });
  h.emit('pointermove', { pointerId: 2, clientX: 240 });
  assert.deepEqual(h.calls.transforms.at(-1), [5, 1.2, { x: 17, y: 10 }, 180, 100]);
  h.emit('pointercancel'); h.emit('pointermove', { pointerId: 2, clientX: 260 });
  assert.equal(h.calls.transforms.length, count + 1);
  assert.equal(h.calls.aim.length, 0); assert.equal(h.calls.redraw, 0);
});

test('close, resize, blur and mode changes clear touch state; modal restores its plot and focus', () => {
  const h = harness();
  for (const end of ['resize', 'blur']) {
    h.nodes.rcExpandPlot.emit('click'); h.nodes.rcSetAim.emit('click'); h.emit('pointerdown');
    h.win.emit(end); h.emit('pointerup'); assert.equal(h.calls.aim.length, 0);
    h.nodes.rcCloseExpandedPlot.emit('click');
    assert.equal(h.viewport.parent, h.home); assert.equal(h.controller.isExpanded(), false);
    assert.equal(h.doc.activeElement, h.nodes.rcExpandPlot);
    assert.equal(h.nodes.rcMain.captured.size, 0);
  }
  h.nodes.rcExpandPlot.emit('click'); h.nodes.rcSetAim.emit('click'); h.setView('angle');
  h.tap(); assert.equal(h.calls.aim.length, 0);
  h.nodes.rcTouchResetView.emit('click'); assert.equal(h.calls.reset, 1);
  h.layout.matches = false; h.layout.emit('change');
  assert.equal(h.controller.isExpanded(), false); assert.equal(h.nodes.rcTouchControls.hidden, true);
  assert.equal(h.viewport.parent, h.home);
  assert.equal(h.nodes.rcHint.textContent, 'Ctrl + click to redraw · Shift + drag to pan · Shift + scroll to zoom');
});

const source = readFileSync(new URL('../ui/app.js', import.meta.url), 'utf8');
function runtimeFunction(name) {
  const first = source.indexOf(`function ${name}(`);
  return source.slice(first, source.indexOf('\nfunction ', first + 1));
}
function mathHarness(view) {
  const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 400 }) };
  const c = createContext({ state: { recoil: { view, scaleH: 5, panX: 2, panY: 3,
    magnification: 2, distancePanX: 20, distancePanY: 30, distance: 120, refSeed: 123,
    targetAim: 'custom', customAim: { x: 44, y: 55 }, zeroDistance: 200 } },
    PLOT_PAD: { l: 28, r: 8, t: 8, b: 18 }, SCOPE_MAGNIFICATIONS: [1, 2, 4, 8],
    recoilTouchControls: null,
    RECOIL_SCALE_MIN: 1, RECOIL_SCALE_MAX: 20, TARGET_DEFAULT_MAGNIFICATION: 1,
    currentMagnification: () => c.state.recoil.magnification,
    targetDisplaySettings: () => ({ height: 1000 }),
    targetCenterY: span => 80 + span / 10, spanCmAtMagnification: m => 2000 / m,
    plotBox: () => ({ PW: 364, PH: 374 }), scheduleRecoilPlot() {}, renderRecoil() {},
  });
  runInContext(['canvasToWorld', 'plotCanvasSize', 'recoilViewport', 'setMagnificationIndex',
    'transformRecoilTouchView', 'resetRecoilFraming'].map(runtimeFunction).join('\n'), c);
  c.canvas = canvas;
  return c;
}

test('short landscape expanded plots keep their real aspect ratio without changing desktop minimums', () => {
  const c = mathHarness('angle');
  c.canvas.getBoundingClientRect = () => ({ width: 800, height: 160 });
  assert.equal(runInContext('plotCanvasSize(canvas).height', c), 240);
  c.canvas.closest = () => ({});
  assert.equal(runInContext('plotCanvasSize(canvas).height', c), 160);
});

test('pinch clamps and centroid pan preserve the anchored world point, aim and seed in both views', () => {
  for (const view of ['angle', 'target']) {
    const c = mathHarness(view), r = c.state.recoil;
    const unchanged = JSON.stringify([r.refSeed, r.customAim, r.targetAim, r.distance, r.zeroDistance]);
    c.anchor = runInContext('canvasToWorld(155, 190, canvas)', c);
    c.baseZoom = view === 'angle' ? r.scaleH : r.magnification;
    for (const ratio of [2, 1, 0.001, 10000]) {
      c.ratio = ratio;
      runInContext('transformRecoilTouchView(baseZoom, ratio, anchor, 205, 230, canvas)', c);
      const point = runInContext('canvasToWorld(205, 230, canvas)', c);
      assert.ok(Math.abs(point.x - c.anchor.x) < 1e-8, view);
      assert.ok(Math.abs(point.y - c.anchor.y) < 1e-8, view);
      assert.equal(JSON.stringify([r.refSeed, r.customAim, r.targetAim, r.distance, r.zeroDistance]), unchanged);
    }
    assert.ok(view === 'angle' ? r.scaleH >= 1 && r.scaleH <= 20 : [1, 2, 4, 8].includes(r.magnification));
    runInContext('resetRecoilFraming()', c);
    assert.equal(JSON.stringify([r.refSeed, r.customAim, r.targetAim, r.distance, r.zeroDistance]), unchanged);
    assert.equal(view === 'angle' ? r.panX : r.distancePanX, 0);
    assert.equal(view === 'angle' ? r.panY : r.distancePanY, 0);
  }
});
