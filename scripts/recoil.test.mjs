import assert from 'node:assert/strict';
import test from 'node:test';
import { RECOIL_RECOVERY_SCALE, applyRecoilDecay, genRecoilPts, setSimContext } from '../sim/core.js';

function weapon(changes = {}) {
  setSimContext({ aimState: 'ads', compensationFn: () => 0, platformRecoilMultFn: () => 1 });
  return { id: 'recoil-test', rpm: 600, recoil: { ads: {
    dir: 0, amount: 1, amountMult: 1, amountExp: 0,
    dirVar: 0, dirVarMult: 1, dirVarExp: 0,
    decFactor: 4 / RECOIL_RECOVERY_SCALE, decExp: 1, decTimeExp: 0, decOffset: 0,
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
});

test('missing or zero duration falls back to 0.025 seconds in both aim states', () => {
  const expected = (1 - Math.exp(-4 * .025)) / (4 * .025) * Math.exp(-4 * .075);
  for (const aimState of ['ads', 'hip']) {
    for (const duration of [undefined, null, 0]) {
      const w = weapon({ duration });
      if (duration === undefined) delete w.recoil.ads.duration;
      w.recoil.hip = { ...w.recoil.ads };
      setSimContext({ aimState });
      close(genRecoilPts(w, 0, 2)[1].y, expected, 2e-6);
    }
  }
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
  const first = genRecoilPts(w, 0, 2)[1].y;
  close(genRecoilPts(w, 0, 3)[2].y, first * decay + first);
  Object.assign(w, { fireMode: 'burst', burstRounds: 3, burstRpm: 600, burstBurstsPerMinute: 120 });
  close(genRecoilPts(w, 0, 4)[3].y,
    ((first * decay + first) * decay + first) * Math.exp(-4 * (.3 ** 2 - .1 ** 2) / 2));
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
  close(genRecoilPts(w, 0, 2)[1].y,
    (1 - Math.exp(-4.8 * .025)) / (4.8 * .025) * Math.exp(-4.8 * .075), 2e-6);
  w.recoil.hip.dirVar = 30;
  assert.deepEqual(genRecoilPts(w, 7, 10), genRecoilPts(w, 7, 10));
  assert.notDeepEqual(genRecoilPts(w, 7, 10), genRecoilPts(w, 8, 10));
});

// Pins the fitted recovery constants (scale and offset) through a real weapon: the synthetic
// weapons above divide the scale out, so a silent change to either constant would pass them.
test('default-loadout climb before shot 15 stays at the fitted values', async () => {
  const fs = await import('node:fs');
  const R = p => JSON.parse(fs.readFileSync(new URL(`../data/${p}.json`, import.meta.url), 'utf8'));
  const { applyAttachments, setAttachmentContext } = await import('../sim/applyAttachments.js');
  const { resetAttsForWeapon } = await import('../sim/loadout.js');
  const B = R('balance_tables'), data = { ...R('attachments'), ...R('ammo') };
  setAttachmentContext({ HIT_ZONES: R('hit_zones'), ...data, ...B, HP_HS_HIGH: new Set(B.HP_HS_HIGH) });
  setSimContext({ aimState: 'ads', stanceState: 'stand', compensationFn: () => 0, platformRecoilMultFn: () => 1 });
  for (const [id, expected] of [['ak205', 2.237], ['m433', 5.230]]) {
    const base = R('weapons').find(w => w.id === id), atts = {};
    resetAttsForWeapon(atts, base, data);
    const w = applyAttachments(base, atts);
    let sum = 0;
    for (let seed = 0; seed < 500; seed++) sum += genRecoilPts(w, seed, 15)[14].y;
    close(sum / 500, expected, 0.002);
  }
});
