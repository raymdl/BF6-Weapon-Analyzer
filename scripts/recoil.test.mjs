import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRecoilDecay, genRecoilPts, setSimContext } from '../sim/core.js';

function weapon(changes = {}) {
  setSimContext({ aimState: 'ads', compensationFn: () => 0, platformRecoilMultFn: () => 1 });
  return { id: 'recoil-test', rpm: 600, recoil: { ads: {
    dir: 0, amount: 1, amountMult: 1, amountExp: 0,
    dirVar: 0, dirVarMult: 1, dirVarExp: 0,
    decFactor: 4, decExp: 1, decTimeExp: 0, decOffset: 0,
    duration: 0.05, ...changes,
  } } };
}
const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('linear recovery matches its continuous solution, preserves sign, and composes by clock age', () => {
  const expected = Math.max(0, (2 + .06) * Math.exp(-57 * .2 ** 2.045 / 2.045) - .06);
  close(applyRecoilDecay(2, 57, 1, 1.045, .2), expected);
  close(applyRecoilDecay(-2, 57, 1, 1.045, .2), -expected);
  const first = applyRecoilDecay(2, 57, 1, 1.045, .07);
  close(applyRecoilDecay(first, 57, 1, 1.045, .13, .06, .07), expected);
  assert.equal(applyRecoilDecay(1, 57, 1, 1.045, 2), 0);
});

test('duration delivers the whole impulse while recovery acts during delivery', () => {
  const w = weapon();
  const expected = (1 - Math.exp(-4 * .05)) / (4 * .05) * Math.exp(-4 * .05);
  const p = genRecoilPts(w, 0, 2);
  assert.deepEqual(p[0], { x: 0, y: 0 });
  close(p[1].y, expected, 2e-6);
  close(genRecoilPts(weapon({ decFactor: 0 }), 0, 2)[1].y, 1);
  close(genRecoilPts(weapon({ duration: 0 }), 0, 2)[1].y, Math.exp(-.4));
});

test('unfinished impulses survive later shots without losing or duplicating delivery', () => {
  const p = genRecoilPts(weapon({ duration: .25, decFactor: 0 }), 0, 4);
  close(p[1].y, .4);
  close(p[2].y, 1.2);
  close(p[3].y, 2.2);
});

test('recovery age resets per shot, including irregular post-burst pauses', () => {
  const w = weapon({ duration: 0, decTimeExp: 1 });
  const decay = Math.exp(-4 * .1 ** 2 / 2);
  close(genRecoilPts(w, 0, 3)[2].y, (decay + 1) * decay);
  Object.assign(w, { fireMode: 'burst', burstRounds: 3, burstRpm: 600, burstBurstsPerMinute: 120 });
  close(genRecoilPts(w, 0, 4)[3].y, ((decay + 1) * decay + 1) * Math.exp(-4 * .3 ** 2 / 2));
});

test('nonlinear recovery stays near its analytic zero-offset solution and does not cross zero', () => {
  const expected = (2 ** .4 - .4 * 2 * .1 ** 1.5 / 1.5) ** (1 / .4);
  close(applyRecoilDecay(2, 2, .6, .5, .1, 0), expected, .0001);
  assert.equal(applyRecoilDecay(.001, 57, .6, 1, 2), 0);
});

test('compensation, aim-state recovery multipliers, and deterministic seeds remain effective', () => {
  const w = weapon({ duration: 0 });
  setSimContext({ compensationFn: () => 1 * 100 });
  assert.deepEqual(genRecoilPts(w, 0, 3), [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  setSimContext({ compensationFn: () => 0, aimState: 'hip' });
  w.recoil.hip = { ...w.recoil.ads };
  w._hipRecoilDecayMult = 1.2;
  close(genRecoilPts(w, 0, 2)[1].y, Math.exp(-.48));
  w.recoil.hip.dirVar = 30;
  assert.deepEqual(genRecoilPts(w, 7, 10), genRecoilPts(w, 7, 10));
  assert.notDeepEqual(genRecoilPts(w, 7, 10), genRecoilPts(w, 8, 10));
});
