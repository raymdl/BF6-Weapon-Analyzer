import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targetImpactStatsHtml } from '../ui/target-stats.js';

const render = weapon => targetImpactStatsHtml([{ weapon, zones: ['head', 'chest'] }], {
  distance: 20, labelFor: w => w.name,
});

test('target output retains damage above 100 and explains the simulated result', () => {
  const html = render({ name: 'Test rifle', dmg: [{ r: 0, d: 80 }], _hsMult: 1.75 });
  assert.match(html, /140\.0/);
  assert.match(html, /220\.0/);
  assert.match(html, /simulated spray/);
});

test('pellet loads do not publish unsupported target hit and lethal figures', () => {
  const weapon = { name: 'Test shotgun', dmg: [{ r: 0, d: 10 }], pellets: 16 };
  const html = render(weapon);
  assert.match(html, /Pellet impacts are not simulated/);
  assert.doesNotMatch(html, /<table|Spray hit rate|<span>Lethal/);
  assert.match(render({ ...weapon, pellets: 1 }), /<table/);
});

test('a missing target image does not publish zero accuracy', () => {
  const html = targetImpactStatsHtml([], { distance: 20 });
  assert.match(html, /Hit results are not available/);
  assert.doesNotMatch(html, /0%/);
});
