import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targetImpactStatsHtml } from '../ui/target-stats.js';

const render = weapon => targetImpactStatsHtml([{ weapon, zones: ['head', 'chest'] }], {
  distance: 20, labelFor: w => w.name,
});

test('target output retains damage above 100 and explains the simulated result', () => {
  const html = render({ name: 'Test rifle', dmg: [{ r: 0, d: 80 }], _hsMult: 1.75, _limbMult: 0.67 });
  assert.match(html, /140\.0/);
  assert.match(html, /220\.0/);
  assert.match(html, /simulated spray/);
});

test('pellet loads publish figures only where their pellets were sampled', () => {
  const weapon = { name: 'Test shotgun', dmg: [{ r: 0, d: 10 }], pellets: 16, _hsMult: 1.34, _limbMult: 1 };
  const html = render(weapon);
  assert.match(html, /pellets were not sampled for this spray/);
  assert.doesNotMatch(html, /<table|<span>Accuracy|<span>Lethal/);
  assert.match(render({ ...weapon, pellets: 1 }), /<table/);
  // Two shells of four pellets: 3 hits then 2 hits, scored per pellet at 10 each.
  const scored = targetImpactStatsHtml([{ weapon, zones: [['chest', 'chest', 'head', null], ['chest', null, null, 'legs']] }], {
    distance: 20, labelFor: w => w.name,
  });
  assert.match(scored, /<table/);
  assert.match(scored, /5 \/ 8/, 'hits count pellets');
  assert.match(scored, /63%/);
  assert.match(scored, /<th scope="row">Missed<\/th>\s*<td>3<\/td>/);
  assert.match(scored, /13\.4/, 'per-pellet head damage');
});

test('a missing target image does not publish zero accuracy', () => {
  const html = targetImpactStatsHtml([], { distance: 20 });
  assert.match(html, /Hit results are not available/);
  assert.doesNotMatch(html, /0%/);
});

test('an empty board shows a pellet load the normal empty table', () => {
  const weapon = { name: 'Test shotgun', dmg: [{ r: 0, d: 10 }], pellets: 16, _hsMult: 1.34, _limbMult: 1 };
  const html = targetImpactStatsHtml([{ weapon, zones: [] }], { distance: 20, labelFor: w => w.name });
  assert.match(html, /<table/);
  assert.match(html, /0 \/ 0/);
});
