import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createShareCodec, TARGET_DEFAULT_DISTANCE } from '../sim/share-state.js';
import { blankAtts, resetAttsForWeapon, availableMountAttachments, normalizeMountAtts,
  resolveMountAttachments, computeAttPts, hasSelectedAssumedAtt } from '../sim/loadout.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const weapons = read('weapons');
const data = { ...read('attachments'), ...read('ammo') };
const weapon = id => weapons.find(w => w.id === id);
const defaults = w => {
  const atts = blankAtts();
  resetAttsForWeapon(atts, w, data);
  return atts;
};
const codec = createShareCodec({ ...data, defaultAttsForWeapon: defaults });
const state = () => ({
  slots: [{ weapon: weapon('m433'), atts: defaults(weapon('m433')) }, { weapon: null, atts: blankAtts() }],
  comparing: false, collapsed: {},
  chart: { mode: 'dmg', btkHS: 0, showAds: false, showVel: false },
  recoil: { aim: 'ads', stance: 'stand', platform: 'pc', view: 'angle',
    distance: TARGET_DEFAULT_DISTANCE, zeroDistance: 100, targetAim: 'chest', compensationLevel: 0 },
});

test('new target links retain distance; old omitted distances mean 30 metres', () => {
  for (const distance of [20, 30, 100]) {
    const original = state();
    original.recoil.view = 'target';
    original.recoil.distance = distance;
    const restored = state();
    codec.restoreFromHash(restored, codec.encodeState(original), weapons);
    assert.equal(restored.recoil.distance, distance);
  }
  const old = state();
  codec.restoreFromHash(old, '#w=m433&rv=target', weapons);
  assert.equal(old.recoil.distance, 30);

});

test('indexed and legacy links reject attachments unavailable to the weapon', () => {
  const w = weapon('m433');
  assert.deepEqual(codec.decodeAtts(w, 'A10G47E999K999'), defaults(w));
  assert.deepEqual(codec.decodeAtts(w, 'iron-none-basic-none-none-none-slugs-none-'), defaults(w));
});

test('combined slots accept their supported items without enabling a second occupied slot', () => {
  for (const [id, laser] of [['vz61', 'canted_stubby'], ['grtbc', 'flashlight']]) {
    const w = weapon(id);
    const atts = { ...defaults(w), rail: { type: id === 'vz61' ? 'grip' : 'light', id: laser } };
    assert.deepEqual(codec.decodeAtts(w, codec.encodeAtts(w, atts)), atts);
    const lightIndex = data.LIGHTS.findIndex(a => a.id === 'flashlight');
    assert.equal(codec.decodeAtts(w, `T${lightIndex}`).rail, null);
  }
});

test('every shared option preserves historical tokens and positional links', () => {
  const tokens = { grip: ['R', data.GRIPS], laser: ['L', data.LASERS], light: ['H', data.LIGHTS] };
  for (const w of weapons.filter(w => data.WEAPON_ATTS[w.id]?.slots.rail)) {
    for (const option of availableMountAttachments(w, 'rail', data)) {
      const expected = { ...defaults(w), rail: { type: option.type, id: option.id } };
      const [prefix, catalog] = tokens[option.type];
      const token = prefix + catalog.findIndex(a => a.id === option.id);
      assert.equal(codec.encodeAtts(w, expected), token);
      assert.deepEqual(codec.decodeAtts(w, token), expected);
      assert.deepEqual(codec.decodeAtts(w, `iron-none-basic-none-${option.id}-none-standard-none-`), expected);
      const legacy = { ...defaults(w), laser: option.id };
      delete legacy.rail;
      assert.deepEqual(normalizeMountAtts(legacy, w, data), expected);
    }
  }
});

test('one shared selection supplies effects, labels and points; invalid selections are inert', () => {
  const w = weapon('vz61');
  const atts = { ...defaults(w), rail: { type: 'grip', id: 'canted_stubby' },
    grip: 'fold_stubby', laser: 'combo_green', light: 'flashlight' };
  const resolved = resolveMountAttachments(atts, w, data);
  assert.equal(resolved.grip.id, 'canted_stubby');
  assert.equal(resolved.laser.id, 'none');
  assert.equal(resolved.light.id, 'none');
  assert.equal(computeAttPts(atts, w, data) - computeAttPts(defaults(w), w, data), resolved.grip.pts);
  assert.deepEqual(normalizeMountAtts(atts, w, data), { ...defaults(w), rail: atts.rail });
  const marked = { ...data, GRIPS: data.GRIPS.map(a => a.id === 'canted_stubby' ? { ...a, assumed: true } : a) };
  assert.equal(hasSelectedAssumedAtt(atts, marked, w), true);
  for (const rail of [null, { type: 'light', id: 'canted_stubby' }, { type: 'grip', id: 'adj_angled' }]) {
    assert.equal(computeAttPts({ ...atts, rail }, w, data), computeAttPts(defaults(w), w, data));
  }
  const combo = { ...defaults(w), rail: { type: 'laser', id: 'combo_green' } };
  assert.equal(computeAttPts(combo, w, data) - computeAttPts(defaults(w), w, data),
    data.LASERS.find(a => a.id === 'combo_green').pts);
  resetAttsForWeapon(atts, weapon('m433'), data);
  assert.equal(Object.hasOwn(atts, 'rail'), false);
  assert.equal(atts.grip, 'none');
  assert.equal(atts.laser, 'none');
  assert.equal(atts.light, 'none');
});
