import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';
import { setSimContext, simulateSpread, genRecoilPts, spreadBounds } from '../sim/core.js';
import { createLiveFire, triggerModeFor } from '../sim/live-fire.js';
import { hipfireDegreesPerCount, cmPer360, adsSensitivityRatio, degreesPerCount } from '../sim/sensitivity.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const weapons = read('weapons');
const data = { ...read('attachments'), ...read('ammo') };
setAttachmentContext({ ...data, ...read('balance_tables'), HIT_ZONES: read('hit_zones') });
const weapon = id => weapons.find(w => w.id === id);
const defaults = w => {
  const atts = {};
  resetAttsForWeapon(atts, w, data);
  return atts;
};
const build = id => applyAttachments(weapon(id), defaults(weapon(id)));

/** Hold the trigger from t = 0 and advance in uneven frames until `shots` have fired. */
function heldRun(w, seed, shots, aimState) {
  setSimContext({ aimState, stanceState: 'stand' });
  const live = createLiveFire(w, { seed, magazine: Infinity });
  live.setTrigger(true);
  let frame = 0;
  while (live.state.shots < shots && frame < 5000) {
    live.advance(0.0137 + (frame % 3) * 0.0041);
    frame++;
  }
  return live;
}

for (const [id, aimState] of [['m4a1', 'ads'], ['m16a4', 'ads'], ['m4a1', 'hip'], ['m4a1', 'ads']]) {
  test(`${id} ${aimState}: held trigger reproduces the batch recoil path and spread sequence`, () => {
    const w = build(id);
    const shots = 12;
    const seed = 7;
    const live = heldRun(w, seed, shots, aimState);
    const batchPts = genRecoilPts(w, seed, shots);
    const batchSpread = simulateSpread(w, shots);
    assert.equal(live.state.impacts.length, shots);
    live.state.impacts.forEach((impact, i) => {
      assert.ok(Math.abs(impact.recoil.x - batchPts[i].x) < 1e-6, `shot ${i + 1} recoil x ${impact.recoil.x} vs ${batchPts[i].x}`);
      assert.ok(Math.abs(impact.recoil.y - batchPts[i].y) < 1e-6, `shot ${i + 1} recoil y ${impact.recoil.y} vs ${batchPts[i].y}`);
      assert.ok(Math.abs(impact.spread - batchSpread[i]) < 1e-4, `shot ${i + 1} spread ${impact.spread} vs ${batchSpread[i]}`);
    });
  });
}

test('mouse movement shifts the view and the trigger modes gate shots', () => {
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  const auto = createLiveFire(build('m4a1'), { seed: 1, magazine: 3 });
  auto.advance(0.05, { x: 1, y: -2 });
  assert.ok(Math.abs(auto.view().x - 1) < 1e-9 && Math.abs(auto.view().y + 2) < 1e-9);
  assert.equal(auto.state.shots, 0);
  auto.setTrigger(true);
  auto.advance(1);
  assert.equal(auto.state.shots, 3, 'auto fire stops at an empty magazine');
  assert.equal(auto.state.ammo, 0);
  auto.reload();
  assert.equal(auto.state.impacts.length, 0, 'a reload clears the board');
  assert.equal(auto.state.ammo, 3);
  auto.setTrigger(false);
  auto.advance(1);
  assert.equal(auto.state.shots, 0, 'a released trigger fires nothing after a reload');

  const single = createLiveFire(build('m39emr'), { seed: 1 });
  assert.equal(triggerModeFor(single.state.weapon), 'single');
  single.setTrigger(true);
  single.advance(1);
  assert.equal(single.state.shots, 1, 'single fire needs a fresh press per shot');
  single.setTrigger(false);
  single.setTrigger(true);
  single.setTrigger(false);
  single.advance(0.5);
  assert.equal(single.state.shots, 2, 'a click shorter than a frame still fires');

  const burst = createLiveFire(build('m16a4'), { seed: 1 });
  assert.equal(triggerModeFor(burst.state.weapon), 'burst');
  burst.setTrigger(true);
  burst.setTrigger(false);
  burst.advance(1);
  assert.equal(burst.state.shots, burst.state.weapon.burstRounds, 'a tap fires one full burst');
});

test('spread and recoil settle after the trigger is released', () => {
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  const w = build('m4a1');
  const live = createLiveFire(w, { seed: 3 });
  live.setTrigger(true);
  live.advance(0.5);
  assert.ok(live.currentSpread() > spreadBounds(w)[0]);
  live.setTrigger(false);
  live.advance(5);
  assert.ok(live.settled());
  assert.ok(Math.abs(live.currentSpread() - spreadBounds(w)[0]) < 1e-6);
});

test('sensitivity conversion follows the published hipfire yaw and the zoom ratio', () => {
  const hip = hipfireDegreesPerCount(20);
  assert.ok(Math.abs(hip - (20 * 0.0017362342283 + 0.002314981532)) < 1e-15);
  assert.ok(Math.abs(cmPer360(hip, 800) - 360 / (hip * 800) * 2.54) < 1e-9);
  assert.ok(Math.abs(adsSensitivityRatio(103, 1, 133) - 1) < 1e-12, '1x aim equals hipfire');
  assert.ok(adsSensitivityRatio(103, 4, 133) < adsSensitivityRatio(103, 2, 133), 'more zoom turns slower');
  assert.equal(degreesPerCount({ sens: 20, aim: 'hip', magnification: 4 }), hip);
  assert.ok(degreesPerCount({ sens: 20, aim: 'ads', hFovDeg: 103, magnification: 2.5 }) < hip);
});
