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
    assert.equal(createHash('sha256').update(JSON.stringify(result)).digest('hex'), entry.sha256, `${entry.weapon}/${entry.ergo}`);
  }
});
