import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

// Exercise the shipped handlers without adding a browser dependency to CI.
// Only the DOM and rendering boundary are mocked; gesture and aim math run
// directly from ui/app.js, which is not an importable Node entrypoint.
const source = readFileSync(new URL('../ui/app.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing runtime section: ${start}`);
  return source.slice(first, last);
}
function runtimeFunction(name) {
  return section(`function ${name}(`, '\nfunction ');
}
function harness(view = 'angle') {
  const listeners = new Map();
  const classes = new Set();
  const canvas = {
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 400 }),
    addEventListener: (type, fn) => listeners.set(type, fn),
    setPointerCapture() {},
    classList: {
      add: value => classes.add(value), remove: value => classes.delete(value),
      toggle: (value, on) => on ? classes.add(value) : classes.delete(value),
    },
  };
  const context = createContext({
    state: { recoil: {
      view, refSeed: 0, targetAim: 'custom', customAim: { x: 73, y: -29 },
      crosshair: true, layers: {}, savedLayers: {},
    } },
    PLOT_PAD: { l: 28, r: 8, t: 8, b: 18 },
    viewport: { xSpan: 40, ySpan: 40, xCenter: 10, yCenter: 30 },
    recoilViewport: () => context.viewport,
    plotBox: () => ({ PW: 364, PH: 374 }),
    document: { getElementById: id => id === 'rcMain' ? canvas : null, addEventListener() {} },
    window: { addEventListener() {} },
    renders: 0, renderRecoil: () => { context.renders++; },
    applyViewLayers() {}, requestTargetImage() {}, panRecoilByPixels() {},
    Math: Object.assign(Object.create(Math), { random: () => 0.25 }),
  });
  runInContext([
    ...['setRecoilView', 'fireAtAimPoint', 'redrawRecoilSample', 'canvasToWorld', 'plotCanvasSize'].map(runtimeFunction),
    section("  const recoilCanvas = document.getElementById('rcMain');", '  // Inputs'),
  ].join('\n'), context);
  const emit = (type, changes = {}) => listeners.get(type)({
    type, button: 0, pointerType: 'mouse', pointerId: 1,
    clientX: 310, clientY: 245, ctrlKey: false, metaKey: false, shiftKey: false,
    preventDefault() {}, ...changes,
  });
  const click = (changes = {}) => { emit('pointerdown', changes); emit('pointerup', changes); };
  return { context, canvas, emit, click };
}

test('Angle Plot Ctrl/Meta-click redraws with a different seed without changing target aim', () => {
  const { context, click } = harness();
  const aim = JSON.stringify(context.state.recoil.customAim);
  click({ ctrlKey: true, clientX: 470, clientY: 85 });
  const first = context.state.recoil.refSeed;
  assert.equal(first, 0x40000000);
  assert.equal(context.renders, 1);
  assert.equal(context.state.recoil.targetAim, 'custom');
  assert.equal(JSON.stringify(context.state.recoil.customAim), aim);
  // A repeated random value must still produce a new sample.
  click({ metaKey: true });
  assert.notEqual(context.state.recoil.refSeed, first);
  assert.equal(context.renders, 2);
  assert.equal(JSON.stringify(context.state.recoil.customAim), aim);
});

test('plain clicks, Shift-pan, drags, cancellation, touch and non-primary buttons do not redraw', () => {
  for (const view of ['angle', 'target']) {
    const { context, click, emit } = harness(view);
    const before = JSON.stringify(context.state.recoil);
    click();
    click({ ctrlKey: true, shiftKey: true });
    emit('pointerdown', { ctrlKey: true });
    emit('pointermove', { ctrlKey: true, clientX: 320 });
    emit('pointerup', { ctrlKey: true, clientX: 320 });
    emit('pointerdown', { ctrlKey: true });
    emit('pointercancel', { ctrlKey: true });
    click({ ctrlKey: true, pointerType: 'touch' });
    click({ ctrlKey: true, button: 2 });
    assert.equal(JSON.stringify(context.state.recoil), before, view);
    assert.equal(context.renders, 0, view);
  }
});

test('Soldier Target Ctrl-click still aims at the mapped pointer and redraws', () => {
  const { context, click } = harness('target');
  click({ ctrlKey: true });
  assert.equal(context.state.recoil.customAim.x, 10);
  assert.equal(context.state.recoil.customAim.y, 30);
  assert.equal(context.state.recoil.targetAim, 'custom');
  assert.equal(context.state.recoil.refSeed, 0x40000000);
  assert.equal(context.renders, 1);
});

test('Angle Plot draws its crosshair at (0, 0) after switching from a custom Soldier aim', () => {
  const { context, canvas, click } = harness('target');
  click({ ctrlKey: true });
  runInContext("setRecoilView('angle')", context);
  click({ ctrlKey: true, clientX: 475, clientY: 75 });
  const moves = [];
  const ctx = new Proxy({
    moveTo: (x, y) => { if (ctx.strokeStyle === 'rgba(255,255,255,0.4)') moves.push([x, y]); },
  }, { get: (object, key) => object[key] ?? (() => {}) });
  Object.assign(context, {
    syncPlotCanvasSize: () => ({ width: 400, height: 400 }),
    selectedRecoilShotCount: () => 20,
    getSpreadBulletIdxs: () => [],
    currentAimOffset: () => { throw new Error('Angle Plot must not read Soldier aim'); },
    fmtAxisDeg: value => String(value),
  });
  context.viewport = { xSpan: 20, ySpan: 20, xCenter: 0, yCenter: 0 };
  canvas.getContext = () => ctx;
  runInContext(runtimeFunction('drawRecoilFixed'), context);
  runInContext("drawRecoilFixed(document.getElementById('rcMain'), null, null, {})", context);
  assert.deepEqual(moves, [[204, 195], [210, 189]]);
  assert.equal(context.state.recoil.customAim.x, 10);
  assert.equal(context.state.recoil.customAim.y, 30);
  runInContext("setRecoilView('target')", context);
  assert.equal(context.state.recoil.customAim.x, 10);
  assert.equal(context.state.recoil.customAim.y, 30);
});
