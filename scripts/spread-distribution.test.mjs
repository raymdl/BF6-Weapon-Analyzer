import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { sampleSpreadRadius, setSimContext } from '../sim/core.js';

const weapons = JSON.parse(readFileSync(new URL('../data/weapons.json', import.meta.url)));

test('M39 hipfire samples uniform area with 25% inside half radius', () => {
  setSimContext({ aimState: 'hip', stanceState: 'stand' });
  const w = weapons.find(w => w.id === 'm39emr');
  const radii = Array.from({ length: 10000 }, (_, i) => sampleSpreadRadius(w, 2, (i + 0.5) / 10000));
  assert.equal(radii.filter(r => r < 1).length, 2500);
  assert.ok(Math.abs(radii.reduce((a, b) => a + b, 0) / radii.length - 4 / 3) < 0.00001);
  assert.equal(sampleSpreadRadius(w, 2, 0), 0);
  assert.equal(sampleSpreadRadius(w, 0, 0.7), 0);
});

test('Interdictor selects moving ADS override only for that state', () => {
  const w = weapons.find(w => w.id === 'interdictor');
  for (const aimState of ['ads', 'hip']) {
    for (const stanceState of ['stand', 'crouch', 'prone', 'move']) {
      setSimContext({ aimState, stanceState });
      const exponent = aimState === 'ads' && stanceState === 'move' ? 0.67 : 0.5;
      assert.equal(sampleSpreadRadius(w, 3, 0.25), 3 * 0.25 ** exponent);
    }
  }
});
