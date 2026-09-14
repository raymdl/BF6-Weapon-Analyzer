import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { availableAttachments, blankAtts, resetAttsForWeapon, normalizeAttachments,
  resolveMountAttachments, computeAttPts } from '../sim/loadout.js';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { createShareCodec } from '../sim/share-state.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const weapons = read('../data/weapons.json');
const data = { ...read('../data/attachments.json'), ...read('../data/ammo.json') };
setAttachmentContext({ ...data, ...read('../data/balance_tables.json'), HIT_ZONES: read('../data/hit_zones.json') });
const weapon = id => weapons.find(w => w.id === id);
const defaults = w => {
  const atts = blankAtts();
  resetAttsForWeapon(atts, w, data);
  return atts;
};
const codec = createShareCodec({ ...data, defaultAttsForWeapon: defaults });

test('PP-19 helical magazine removes every grip from choices, points, effects and shared state', () => {
  const w = weapon('pp19');
  const clean = { ...defaults(w), mag: '53_rnd' };
  assert.deepEqual(availableAttachments(w, 'grip', data, clean).map(a => a.id), ['none']);
  for (const grip of data.WEAPON_ATTS.pp19.grip) {
    const invalid = { ...clean, grip };
    assert.equal(normalizeAttachments(invalid, w, data).grip, 'none');
    assert.equal(invalid.grip, grip, 'normalization must not mutate its input');
    assert.equal(computeAttPts(invalid, w, data), computeAttPts(clean, w, data));
    assert.deepEqual(applyAttachments(w, invalid), applyAttachments(w, clean));
    const g = data.GRIPS.findIndex(a => a.id === grip);
    const k = Object.keys(data.WEAPON_MAG.pp19.mags).indexOf('53_rnd');
    for (const tokens of [`G${g}K${k}`, `K${k}G${g}`, codec.encodeAtts(w, invalid)]) {
      assert.deepEqual(codec.decodeAtts(w, tokens), clean);
    }
  }
  for (const mag of Object.keys(data.WEAPON_MAG.pp19.mags).filter(id => id !== '53_rnd')) {
    assert.equal(availableAttachments(w, 'grip', data, { ...clean, mag }).length,
      data.WEAPON_ATTS.pp19.grip.length + 1);
  }
  for (const slot of ['laser', 'light']) {
    assert.deepEqual(availableAttachments(w, slot, data, clean), availableAttachments(w, slot, data));
  }
});

test('equipment dependencies also constrain magazine ergonomics on other weapons', () => {
  for (const [id, blocked, allowed] of [
    ['ak205', '50_rnd', '45_rnd'], ['rpk74m', '95_rnd', '60_rnd'], ['rpkm', '75_rnd', '40_rnd'],
  ]) {
    const w = weapon(id);
    const invalid = { ...defaults(w), mag: blocked, ergo: 'mag_flare' };
    const clean = { ...invalid, ergo: 'none' };
    assert.ok(!availableAttachments(w, 'ergo', data, invalid).some(a => a.id === 'mag_flare'));
    assert.ok(availableAttachments(w, 'ergo', data, { ...invalid, mag: allowed }).some(a => a.id === 'mag_flare'));
    assert.equal(normalizeAttachments(invalid, w, data).ergo, 'none');
    assert.equal(computeAttPts(invalid, w, data), computeAttPts(clean, w, data));
    assert.deepEqual(applyAttachments(w, invalid), applyAttachments(w, clean));
    assert.deepEqual(codec.decodeAtts(w, codec.encodeAtts(w, invalid)), clean);
    assert.equal(normalizeAttachments({ ...invalid, ergo: 'match_trigger' }, w, data).ergo, 'match_trigger');
  }
});

test('dependency evaluation supports other slots, alternatives and chained removals', () => {
  const w = weapon('m433');
  const custom = { ...data, WEAPON_ATTS: { ...data.WEAPON_ATTS, m433: {
    ...data.WEAPON_ATTS.m433,
    dependencies: [
      { slot: 'laser', attachment: '5mw_red', requiresAny: [{ slot: 'grip', attachment: 'fold_vert' }] },
      { slot: 'grip', attachment: 'fold_vert', requiresAny: [
        { slot: 'barrel', attachment: 'heavy' }, { slot: 'barrel', attachment: 'light' },
      ] },
    ],
  } } };
  const selected = { ...defaults(w), laser: '5mw_red', grip: 'fold_vert', barrel: 'basic' };
  const normalized = normalizeAttachments(selected, w, custom);
  assert.equal(normalized.grip, 'none');
  assert.equal(normalized.laser, 'none');
  assert.deepEqual(normalizeAttachments(normalized, w, custom), normalized);
  for (const barrel of ['heavy', 'light']) {
    assert.equal(normalizeAttachments({ ...selected, barrel }, w, custom).laser, '5mw_red');
  }
});

test('Frosty shared rails migrate old separate-slot links and apply exactly one device', () => {
  for (const id of ['kord6p67', 'kts100']) {
    const w = weapon(id);
    assert.deepEqual(data.WEAPON_ATTS[id].slots.rail.accepts, ['laser', 'light']);
    const l = data.LASERS.findIndex(a => a.id === '5mw_red');
    const t = data.LIGHTS.findIndex(a => a.id === 'flashlight');
    const lightOnly = codec.decodeAtts(w, `T${t}`);
    assert.deepEqual(lightOnly.rail, { type: 'light', id: 'flashlight' });
    const both = codec.decodeAtts(w, `L${l}T${t}`);
    assert.deepEqual(both.rail, { type: 'laser', id: '5mw_red' });
    assert.equal(Object.hasOwn(both, 'light'), false);
    const mounts = resolveMountAttachments(both, w, data);
    assert.equal(mounts.light.id, 'none');
    assert.equal(computeAttPts(both, w, data) - computeAttPts(defaults(w), w, data), mounts.laser.pts);
    assert.deepEqual(codec.decodeAtts(w, codec.encodeAtts(w, both)), both);
  }
});

test('every mapped source mount uses the generated physical-slot grouping', () => {
  const report = read('../reference-data/provenance/frosty-attachment-compatibility.json');
  assert.deepEqual(report.unresolvedSlots, []);
  const physicalByRuntime = new Map();
  for (const row of report.physicalSlots) {
    const wa = data.WEAPON_ATTS[row.weapon];
    const [slot] = Object.entries(wa.slots).find(([, d]) => d.accepts.includes(row.slot));
    const key = `${row.weapon}/${slot}`;
    if (physicalByRuntime.has(key)) assert.equal(physicalByRuntime.get(key), row.physicalSlot, key);
    physicalByRuntime.set(key, row.physicalSlot);
  }
  for (const w of weapons) {
    const occupied = [...physicalByRuntime].filter(([key]) => key.startsWith(`${w.id}/`)).map(([, v]) => v);
    assert.equal(new Set(occupied).size, occupied.length, `${w.id}: source slot split into two runtime slots`);
  }
});
