import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';
import { shotIntervalAfter, setSimContext, simulateSpread, genRecoilPts } from '../sim/core.js';
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
const build = (id, changes = {}) => applyAttachments(weapon(id), { ...defaults(weapon(id)), ...changes });
const roundSpray = spray => spray.map(({ spread, recoil }) => ({
  spread: spread.map(value => Number(value.toFixed(12))),
  recoil: recoil.map(({ x, y }) => ({ x: Number(x.toFixed(12)), y: Number(y.toFixed(12)) }))
}));

test('all 63 implicit defaults and ten mode attachments preserve pre-selector TTK cadence and spray output', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/fire-mode-defaults.json', import.meta.url)));
  assert.equal(fixture.cases.length, 73);
  for (const entry of fixture.cases) {
    const w = build(entry.weapon, { ergo: entry.ergo });
    const result = { fireMode: w.fireMode, intervals: Array.from({ length: 9 }, (_, i) => shotIntervalAfter(w, i + 1)), spray: [] };
    for (const aimState of ['ads', 'hip']) for (const stanceState of ['stand', 'move']) {
      setSimContext({ aimState, stanceState });
      result.spray.push({ spread: simulateSpread(w, 10), recoil: genRecoilPts(w, 0, 10) });
    }
    const snapshot = { ...result, spray: roundSpray(result.spray) };
    assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), entry.sha256, `${entry.weapon}/${entry.ergo}`);
  }
});

import { fireModeConfiguration, selectedFireMode } from '../sim/fire-modes.js';
import { normalizeAttachments } from '../sim/loadout.js';
import { createShareCodec } from '../sim/share-state.js';

test('all eleven operator-confirmed fire-mode predictions match', () => {
  const predictions = [
    ['m4a1', 'none', ['auto', 'single']],
    ['m16a4', 'none', ['burst', 'single']],
    ['m16a4', 'full_auto', ['auto', 'single']],
    ['kord6p67', 'burst_training', ['burst', 'auto', 'single']],
    ['grtbc', 'grtbc_burst_mode', ['burst', 'single']],
    ['sl9', 'burst_mode', ['burst', 'single']],
    ['vssm', 'none', ['single']],
    ['vssm', 'full_auto_vssm', ['auto', 'single']],
    ['grtcps', 'none', ['single']],
    ['vz61', 'none', ['auto', 'single']],
    ['m2010esr', 'none', ['single']],
  ];
  for (const [id, ergo, expected] of predictions) {
    assert.deepEqual(fireModeConfiguration(weapon(id), { ergo }).modes, expected, `${id}/${ergo}`);
  }
  assert.equal(build('m2010esr', { fireMode: 'single' }).fireMode, 'bolt');
});

test('mode counts across base and site attachment choices are 26 / 28 / 9', () => {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const w of weapons) {
    const union = new Set(w.availableFireModes);
    for (const config of Object.values(w.fireModeAttachments ?? {})) for (const mode of config.modes) union.add(mode);
    assert.deepEqual([...union].sort(), Object.keys(w.fireModes).sort(), w.id);
    counts[union.size]++;
  }
  assert.deepEqual(counts, { 1: 26, 2: 28, 3: 9 });
  assert.equal(weapon('grtcps').fireModes.burst, undefined);
});

test('attachments gate modes, preserve valid selections, and reset unavailable selections to the loadout default', () => {
  for (const w of weapons) for (const [ergo, config] of Object.entries(w.fireModeAttachments ?? {})) {
    for (const mode of config.modes) {
      const atts = normalizeAttachments({ ...defaults(w), ergo, fireMode: mode }, w, data);
      assert.equal(atts.fireMode, mode, `${w.id}/${ergo}/${mode}`);
      const removed = normalizeAttachments({ ...atts, ergo: 'none' }, w, data);
      assert.equal(selectedFireMode(w, removed), w.availableFireModes.includes(mode) ? mode
        : ['semi', 'bolt', 'pump'].includes(w.fireMode) ? 'single' : w.fireMode);
    }
  }
  for (const id of ['kord6p67', 'sg553r', 'cz3a1', 'kv9', 'pw5a3', 'umg40']) {
    assert.ok(!fireModeConfiguration(weapon(id)).modes.includes('burst'), id);
    assert.equal(normalizeAttachments({ ...defaults(weapon(id)), fireMode: 'burst' }, weapon(id), data).fireMode, undefined);
  }
  assert.equal(build('m16a4', { ergo: 'full_auto', fireMode: 'burst' }).fireMode, 'auto');
  assert.equal(build('grtbc', { ergo: 'grtbc_burst_mode', fireMode: 'auto' }).fireMode, 'burst');
  const atts = { ...defaults(weapon('m4a1')), fireMode: 'single' };
  resetAttsForWeapon(atts, weapon('m433'), data);
  assert.equal(atts.fireMode, undefined);
});

test('selected-mode rates keep source precision and drive shot spacing, TTK and spray', () => {
  const single = build('m4a1', { fireMode: 'single' });
  const auto = build('m4a1', { fireMode: 'auto' });
  assert.equal(single.rpm, 399.9989929199219);
  assert.equal(auto.rpm, 899.9990234375);
  assert.equal(shotIntervalAfter(single, 1), 60 / 399.9989929199219);
  const ttk = (w, hits) => Array.from({ length: hits - 1 }, (_, i) => shotIntervalAfter(w, i + 1) * 1000).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(ttk(single, 4)), 450);
  assert.equal(Math.round(ttk(auto, 4)), 200);
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  assert.notDeepEqual(genRecoilPts(single, 0, 10), genRecoilPts(auto, 0, 10));
  for (const [id, ergo, rpm, bpm, rounds] of [
    ['m16a4', 'none', 771.427978515625, 224.99899291992188, 3],
    ['grtbc', 'grtbc_burst_mode', 830.7689819335938, 239.99899291992188, 3],
    ['sl9', 'burst_mode', 771.427978515625, 327.2720031738281, 2],
  ]) {
    const w = build(id, { ergo, fireMode: 'burst' });
    assert.equal(w.rpm, rpm);
    assert.equal(w.burstBurstsPerMinute, bpm);
    assert.equal(w.burstRounds, rounds);
    assert.equal(shotIntervalAfter(w, 1), 60 / rpm);
    assert.ok(Math.abs(ttk(w, rounds + 1) / 1000 - 60 / bpm) < 1e-12);
  }
  const kord = build('kord6p67', { ergo: 'burst_training', fireMode: 'burst' });
  assert.equal(kord.burstBurstsPerMinute, 0);
  assert.equal(shotIntervalAfter(kord, 2), 60 / 899.9990234375);
  assert.equal(build('vssm', { ergo: 'full_auto_vssm', fireMode: 'single' }).rpm, 399.9989929199219);
  assert.equal(build('vssm', { ergo: 'full_auto_vssm', fireMode: 'auto' }).rpm, 799.9990234375);
  for (const id of ['m2010esr', 'db12']) {
    const original = build(id), selected = build(id, { fireMode: 'single' });
    assert.equal(selected.rpm, original.rpm);
    assert.deepEqual(Array.from({ length: 6 }, (_, i) => shotIntervalAfter(selected, i + 1)),
      Array.from({ length: 6 }, (_, i) => shotIntervalAfter(original, i + 1)));
  }
});

test('manual single disables hip bloom only on the 35 L63-bound single rows; default VSSM and Match Trigger remain unchanged', () => {
  const bound = weapons.filter(w => w.fireModes.single?.hipNoBloomOnSwitch);
  assert.equal(bound.length, 35);
  for (const w of bound) {
    const single = build(w.id, { fireMode: 'single' });
    for (const stanceState of ['stand', 'move']) {
      setSimContext({ aimState: 'hip', stanceState });
      const spread = simulateSpread(single, 10);
      assert.ok(spread.every(v => v === spread[0]), w.id);
    }
    assert.equal(single.recoilIncAds, build(w.id).recoilIncAds);
  }
  for (const id of ['ef88', 'brod3', 'grtcps']) {
    assert.equal(weapon(id).fireModes.single.hipNoBloomOnSwitch, false);
    assert.equal(build(id, { fireMode: 'single' })._manualSingleNoBloom, false);
  }
  setSimContext({ aimState: 'hip', stanceState: 'stand' });
  assert.ok(simulateSpread(build('vssm'), 10).some((v, i, a) => v > a[0]));
  const match = build('m4a1', { ergo: 'match_trigger' });
  const manualMatch = build('m4a1', { ergo: 'match_trigger', fireMode: 'single' });
  assert.deepEqual(manualMatch.recoil, match.recoil);
  assert.equal(manualMatch.recoilIncAds, match.recoilIncAds);
  assert.deepEqual(manualMatch._resolved.ergo, match._resolved.ergo);
});

test('share links reproduce both explicit modes, preserve old defaults, and reject unavailable modes', () => {
  const codec = createShareCodec({ ...data, defaultAttsForWeapon: defaults });
  const state = () => ({ slots: [{ weapon: weapon('vssm'), atts: defaults(weapon('vssm')) },
    { weapon: weapon('sl9'), atts: defaults(weapon('sl9')) }], comparing: true,
    chart: { mode: 'ttk', btkHS: 0 }, recoil: { aim: 'ads', stance: 'stand', platform: 'pc' }, collapsed: {} });
  const original = state();
  original.slots[0].atts.fireMode = 'single';
  original.slots[1].atts = { ...original.slots[1].atts, ergo: 'burst_mode', fireMode: 'burst' };
  const hash = codec.encodeState(original);
  assert.equal(new URLSearchParams(hash).get('fm'), 'single');
  assert.equal(new URLSearchParams(hash).get('fm2'), 'burst');
  const restored = state();
  codec.restoreFromHash(restored, hash, weapons);
  assert.deepEqual(restored.slots.map(s => s.atts), original.slots.map(s => s.atts));
  assert.equal(applyAttachments(restored.slots[0].weapon, restored.slots[0].atts)._manualSingleNoBloom, true);
  assert.ok(!codec.encodeState(state()).includes('fm'));
  codec.restoreFromHash(restored, '#w=vssm', weapons);
  assert.equal(restored.slots[0].atts.fireMode, undefined);
  assert.equal(applyAttachments(restored.slots[0].weapon, restored.slots[0].atts)._manualSingleNoBloom, undefined);
  for (const hash of ['#w=grtcps&fm=burst', '#w=m4a1&fm=invalid', '#w=m16a4&fm=auto']) {
    codec.restoreFromHash(restored, hash, weapons);
    assert.equal(restored.slots[0].atts.fireMode, undefined);
  }
});
