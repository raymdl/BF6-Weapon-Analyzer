import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  assertPhase5Separability,
  buildPhase5Fixture,
} from './attachment-equivalence-phase5.mjs';

const root = join(import.meta.dirname, '..');
const fixture = JSON.parse(readFileSync(join(root, 'scripts/attachment-equivalence-phase5.json'), 'utf8'));
const attachments = JSON.parse(readFileSync(join(root, 'data/attachments.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'scripts/reload-phase4-migration-manifest.json'), 'utf8'));

let actual;
function generated() {
  actual ??= buildPhase5Fixture();
  return actual;
}

test('Phase 6 reduced attachment separability witness matches the tracked post-cutover fixture', () => {
  const result = generated();
  assert.deepEqual(result, fixture);
  assert.equal(result.counts.unexplainedDifferenceCases, 0);
  assert.deepEqual(result.fieldDifferenceCounts, { tacRld: 658 });
  assert.equal(result.transition.preCutover.differenceCases, 578);
  assert.equal(result.transition.postCutover.differenceCases, 658);
  assert.equal(result.transition.preCutover.differenceDigest, 'eb5d873efa907d5ee09c39bf924238d329f786c5fd3db48156ac057131d83d90');
  assert.deepEqual(result.differenceClassification.manifestMagCatchStackingKeys, [
    'm277/15_rnd/mag_catch',
    'pp19/20_fast/mag_catch',
    'pw5a3/20_rnd/mag_catch',
    'pw7a2/20_rnd/mag_catch',
    'svdm/5_rnd/mag_catch',
    'tr7/15_rnd/mag_catch',
  ]);
  assert.equal(result.differenceClassification.manifestComposedLoadoutKey, 'pp19/53_rnd/mag_catch');
  assert.ok(result.differenceClassification.expectedObservedDifferenceKeys.includes('pp19/53_rnd/mag_catch'));
});

test('Phase 4 executes the Phase 5 reload and barrel velocity separability premise', () => {
  const result = assertPhase5Separability();
  const expectedCases = generated().counts.reducedComparisonCaseCount;
  assert.equal(result.reloadMismatchCases, 0);
  assert.equal(result.barrelVelocityMismatchCases, 0);
  assert.equal(result.reloadComparedCases, expectedCases);
  assert.equal(result.barrelVelocityComparedCases, expectedCases);
});

test('Phase 6 named loadouts pin the migration edge cases', () => {
  const named = new Map(generated().namedCases.map(row => [row.name, row]));
  const expected = new Map([
    ['AK-205 Mag Catch', [2.337, []]],
    ['SL9 Mag Catch', [2.493, []]],
    ['KTS100 MK8 45Rnd Fast stacked tier', [2.545, []]],
    ['M60 50Rnd alternate', [4.534, []]],
    ['M60 100Rnd', [7.35, []]],
    ['M240L 50Rnd', [4.25, []]],
    ['M240L 75Rnd belt box', [7.1, []]],
    ['M240L 100Rnd belt box', [7.1, []]],
    ['PP-19 20Rnd suspected bug', [2.467, []]],
    ['PP-19 53Rnd override', [2.667, []]],
    ['PP-19 53Rnd override plus Mag Catch', [2.509, ['tacRld'], 2.321]],
    ['18.5KS-K 4Rnd', [2.75, []]],
    ['18.5KS-K 4Rnd Fast', [2.434, []]],
    ['DB-12 tube-fed', [null, ['tacRld'], 2.348]],
    ['M1014 tube-fed', [null, ['tacRld'], 1.784]],
    ['M87A1 tube-fed', [null, ['tacRld'], 1.334]],
  ]);

  for (const [name, [reload, paths, historicalReload = reload]] of expected) {
    const row = named.get(name);
    assert.ok(row, `missing named case ${name}`);
    assert.equal(row.currentTacRld, reload, name);
    assert.equal(row.legacyTacRld, historicalReload, name);
    assert.deepEqual(row.diffPaths, paths, name);
  }

  for (const name of ['DB-12 tube-fed', 'M1014 tube-fed', 'M87A1 tube-fed']) {
    const scalar = named.get(name).tubeFedScalarNull;
    assert.deepEqual(scalar, {
      currentWeaponTacRld: null,
      legacyWeaponTacRld: null,
      currentEmptyRld: null,
      legacyEmptyRld: null,
    }, name);
  }
});

test('Phase 6 covers combined selectors and explicit empty grip behavior', () => {
  const named = new Map(generated().namedCases.map(row => [row.name, row]));
  const combined = [
    ['VZ. 61 combined laser/grip/light', 'fold_stubby'],
    ['GRT-BC combined laser/light', '50mw_violet'],
    ['SL9 combined laser/light', '50mw_violet'],
    ['P18 combined laser/light', '5mw_red'],
    ['ES 5.7 combined laser/light', '5mw_red'],
    ['M45A1 combined laser/light', '5mw_red'],
    ['GGH-22 combined laser/light', '5mw_red'],
    ['M357 Trait combined laser/light', '5mw_red'],
  ];
  for (const [name, laserId] of combined) {
    const row = named.get(name);
    assert.equal(row.gripId, 'none', name);
    assert.equal(row.laserId, laserId, name);
    assert.equal(row.lightId, 'none', name);
    assert.deepEqual(row.diffPaths, [], name);
  }

  const usg90 = named.get('USG-90 explicit empty grip');
  assert.equal(usg90.gripId, 'none');
  assert.deepEqual(usg90.diffPaths, []);
});

test('Phase 6 retains the six corpus-backed Mag Catch backfills in the manifest', () => {
  const expected = {
    l115: { reg: 2587, fast: 2289 },
    p18: { reg: 1819, fast: null },
    es57: { reg: 1897, fast: null },
    m45a1: { reg: 1756, fast: null },
    ggh22: { reg: 1819, fast: null },
    vz61: { reg: 2008, fast: null },
  };
  assert.equal(Object.values(attachments.WEAPON_ERGO).some(ergo => Object.hasOwn(ergo, 'magCatchRld')), false);
  const corrections = new Map(manifest.legacyMagCatchCorrections.map(entry => [entry.weaponId, entry]));
  for (const [weaponId, magCatchRld] of Object.entries(expected)) assert.deepEqual(corrections.get(weaponId).after, magCatchRld, weaponId);
  assert.equal(manifest.counts.legacyMagCatchCorrections, 7);
  assert.equal(manifest.counts.magCatchEvidenceRows, 27);
  assert.equal(manifest.magCatchEvidence.corpusRows, 27);
  assert.equal(manifest.magCatchEvidence.matchedRows, 27);
  assert.equal(manifest.magCatchEvidence.model, 'base / 1.063');
});
