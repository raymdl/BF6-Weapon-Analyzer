import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_BASELINE_SPEC,
  DEFAULT_ROOT,
  buildEaReconciliation,
  buildImportResult,
  buildNormalizedSnapshot,
  buildLiveData,
  loadPinnedInputs,
  readBaselineWeapons,
} from './sym-import.mjs';
import { SYM_WEAPON_MAP } from './sym-weapon-map.mjs';

const inputs = loadPinnedInputs({ root: DEFAULT_ROOT });
const currentWeapons = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'weapons.json'), 'utf8'));
const baselineWeapons = readBaselineWeapons(DEFAULT_ROOT, DEFAULT_BASELINE_SPEC).weapons;

test('loads and verifies the pinned 1.3.3.0 Sym inputs', () => {
  assert.equal(inputs.source.info.version, '1.3.3.0');
  assert.equal(inputs.sourceIntegrity.sha256, '129C2A552D508E864FF09A1593A4A705C11F0B5F4B19C925BC83F9A96F4B6A4B');
  assert.equal(Object.keys(inputs.source).filter(key => key !== 'info').length, 59);
  assert.equal(inputs.patchDeltas.length, 58);
  assert.equal(inputs.patchDeltas.reduce((count, entry) => count + entry.changes.length, 0), 1038);
});

test('normalization and reconciliation are stable when source object order changes', () => {
  const ordered = buildImportResult({ source: inputs.source, patchDeltas: inputs.patchDeltas, currentWeapons });
  const shuffled = Object.fromEntries(Object.entries(inputs.source).reverse());
  const shuffledResult = buildImportResult({ source: shuffled, patchDeltas: inputs.patchDeltas, currentWeapons });
  assert.deepEqual(shuffledResult.normalized, ordered.normalized);
  assert.deepEqual(shuffledResult.diff, ordered.diff);
  assert.deepEqual(shuffledResult.reconciliation, ordered.reconciliation);
  assert.equal(ordered.reconciliation.summary.patchRowCount, 1038);
  assert.equal(ordered.reconciliation.summary.sourceMatched, 1036);
  assert.equal(ordered.reconciliation.summary.sourceMismatches, 0);
  assert.equal(ordered.reconciliation.summary.sourceUnmapped, 0);
  assert.equal(ordered.reconciliation.summary.excludedRows, 2);
});

test('fails loudly for a missing or unknown mapping', () => {
  const missing = SYM_WEAPON_MAP.filter(entry => entry.codename !== 'pp19');
  assert.throws(
    () => buildNormalizedSnapshot(inputs.source, currentWeapons, missing),
    /missing mapping for Sym codename pp19/,
  );

  const unknown = SYM_WEAPON_MAP.map(entry => entry.codename === 'pp19'
    ? { ...entry, siteId: 'not-a-site-weapon' }
    : entry);
  assert.throws(
    () => buildNormalizedSnapshot(inputs.source, currentWeapons, unknown),
    /unknown site weapon ID not-a-site-weapon/,
  );
});

test('fails loudly for duplicate site IDs in the explicit map', () => {
  const duplicate = [...SYM_WEAPON_MAP, { codename: 'duplicate-source', siteId: 'm433', displayName: 'Duplicate' }];
  assert.throws(
    () => buildNormalizedSnapshot(inputs.source, currentWeapons, duplicate),
    /duplicate site weapon ID mapping: m433/,
  );
});

test('uses the exact effective recoil formula and keeps raw components', () => {
  const normalized = buildNormalizedSnapshot(inputs.source, currentWeapons);
  const m433 = normalized.weapons.find(weapon => weapon.siteId === 'm433');
  const pp19 = normalized.weapons.find(weapon => weapon.siteId === 'pp19');
  assert.ok(m433);
  assert.ok(pp19);
  assert.equal(m433.siteFields.recoilV, 0.6695 * (0.945 ** -3));
  assert.equal(pp19.siteFields.recoilV, 0.4418 * (0.9333 ** -3));
  assert.equal(pp19.siteFields.recoil.ads.amount, 0.4418);
  assert.equal(pp19.siteFields.recoil.ads.amountMult, 0.9333);
  assert.equal(pp19.siteFields.recoil.ads.amountExp, -3);
});

test('keeps damage and gravity/drag outside the live write candidate', () => {
  const result = buildImportResult({ source: inputs.source, patchDeltas: inputs.patchDeltas, currentWeapons });
  assert.equal(result.diff.summary.damageCurveWrites, 0);
  assert.equal(result.diff.summary.gravityDragWrites, 0);
  // Damage still never leaves this importer; scripts/apply-sym-damage.mjs owns it.
  for (const field of ['damage.dmgs', 'damage.dists']) {
    assert.equal(result.excluded.fields.find(entry => entry.field === field).decision, 'owned-by-damage-refresh');
  }
  assert.equal(result.excluded.fields.find(field => field.field === 'drag').decision, 'normalized-only');
  assert.ok(result.normalized.weapons.find(weapon => weapon.siteId === 'pp19').sourceExcluded.drag);
});

test('uses an immutable resolved baseline provenance', () => {
  const baseline = readBaselineWeapons(DEFAULT_ROOT, DEFAULT_BASELINE_SPEC);
  assert.equal(baseline.provenance.type, 'git');
  assert.equal(baseline.provenance.path, 'data/weapons.json');
  assert.match(baseline.provenance.commit, /^[0-9a-f]{40}$/);
  assert.equal(baseline.provenance.commit.startsWith('2df4811'), true);
});

test('keeps reload timing fields numeric-or-null and applies special reload policy', () => {
  const normalized = buildNormalizedSnapshot(inputs.source, currentWeapons);
  const byId = new Map(normalized.weapons.map(weapon => [weapon.siteId, weapon]));
  for (const weapon of normalized.weapons) {
    assert.ok(weapon.siteFields.tacRld === null || Number.isFinite(weapon.siteFields.tacRld));
    assert.ok(weapon.siteFields.emptyRld === null || Number.isFinite(weapon.siteFields.emptyRld));
  }
  for (const id of ['m87a1', 'm1014', 'ks18k', 'db12']) {
    assert.equal(byId.get(id).reloadPolicy, 'shell-by-shell-null');
    assert.equal(byId.get(id).siteFields.tacRld, null);
    assert.equal(byId.get(id).siteFields.emptyRld, null);
  }
  assert.equal(byId.get('m44').siteFields.tacRld, 3.4);
  assert.equal(byId.get('m44').siteFields.emptyRld, null);
  assert.equal(byId.get('m357trait').siteFields.emptyRld, null);

  const currentRecoilDecay = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'recoil_decay.json'), 'utf8'));
  const currentBalance = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'balance_tables.json'), 'utf8'));
  const live = buildLiveData(currentWeapons, currentRecoilDecay, currentBalance, normalized);
  for (const weapon of live.weapons) {
    assert.ok(weapon.tacRld === null || Number.isFinite(weapon.tacRld));
    assert.ok(weapon.emptyRld === null || Number.isFinite(weapon.emptyRld));
  }
  for (const id of ['m87a1', 'm1014', 'ks18k', 'db12']) {
    const weapon = live.weapons.find(candidate => candidate.id === id);
    assert.equal(weapon.tacRld, null);
    assert.equal(weapon.emptyRld, null);
  }
});

test('reconciles every EA velocity and recoil-variation line to pinned Sym values', () => {
  const result = buildEaReconciliation(inputs.source, baselineWeapons, inputs.patchDeltas);
  assert.equal(result.summary.listed, 89);
  assert.deepEqual(result.summary.muzzleVelocity, {
    listed: 50,
    sourceMatched: 50,
    patchMatched: 49,
    patchDeferred: 1,
    baselineMatched: 49,
    existingSiteCount: 49,
    deferredCount: 1,
  });
  assert.deepEqual(result.summary.recoilVariation, {
    listed: 39,
    sourceMatched: 39,
    patchMatched: 38,
    patchDeferred: 1,
    baselineMatched: 38,
    existingSiteCount: 38,
    deferredCount: 1,
  });
  assert.equal(result.summary.mismatchCount, 0);
  assert.equal(result.checks.filter(row => row.status === 'mismatch').length, 0);
  assert.equal(result.checks.filter(row => row.status === 'deferred-new-record').length, 2);

  const altered = structuredClone(inputs.source);
  const alteredRow = Object.values(altered).find(row => row?.codename === 'hk433');
  alteredRow.velocity += 1;
  assert.throws(
    () => buildEaReconciliation(altered, baselineWeapons, inputs.patchDeltas),
    /EA 1\.3\.3\.0 reconciliation failed/,
  );
});
