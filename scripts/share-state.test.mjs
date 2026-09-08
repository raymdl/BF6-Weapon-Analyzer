import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createShareCodec, TARGET_DEFAULT_DISTANCE } from '../sim/share-state.js';
import { blankAtts, resetAttsForWeapon } from '../sim/loadout.js';

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
    const atts = { ...defaults(w), laser };
    assert.deepEqual(codec.decodeAtts(w, codec.encodeAtts(w, atts)), atts);
    const lightIndex = data.LIGHTS.findIndex(a => a.id === 'flashlight');
    assert.equal(codec.decodeAtts(w, `T${lightIndex}`).light, 'none');
  }
});
