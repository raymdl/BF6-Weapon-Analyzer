import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_BASELINE_SPEC,
  DEFAULT_ROOT,
  SPECIAL_RELOAD_POLICY,
  buildEaReconciliation,
  buildImportResult,
  buildNormalizedSnapshot,
  buildLiveData,
  loadPinnedInputs,
  normalizedReloadFields,
  readBaselineWeapons,
  reconcilePatchDeltas,
} from './sym-import.mjs';
import { SYM_WEAPON_MAP } from './sym-weapon-map.mjs';

// The pinned Sym dump lives under the gitignored outputs/ tree, so a clean clone
// does not have it. Skip the tests that need it rather than failing the suite;
// they still run in full wherever the pinned inputs are present.
let inputs = null;
let pinnedInputsError = null;
try {
  inputs = loadPinnedInputs({ root: DEFAULT_ROOT });
} catch (error) {
  pinnedInputsError = error.message;
}
const needsPinnedInputs = { skip: pinnedInputsError ? `pinned Sym inputs unavailable: ${pinnedInputsError}` : false };

const currentWeapons = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'weapons.json'), 'utf8'));
const baselineWeapons = readBaselineWeapons(DEFAULT_ROOT, DEFAULT_BASELINE_SPEC).weapons;

test('loads and verifies the pinned 1.3.3.0 Sym inputs', needsPinnedInputs, () => {
  assert.equal(inputs.source.info.version, '1.3.3.0');
  assert.equal(inputs.sourceIntegrity.sha256, '129C2A552D508E864FF09A1593A4A705C11F0B5F4B19C925BC83F9A96F4B6A4B');
  assert.equal(Object.keys(inputs.source).filter(key => key !== 'info').length, 59);
  assert.equal(inputs.patchDeltas.length, 58);
  assert.equal(inputs.patchDeltas.reduce((count, entry) => count + entry.changes.length, 0), 1038);
});

test('normalization and reconciliation are stable when source object order changes', needsPinnedInputs, () => {
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

test('fails loudly for a missing or unknown mapping', needsPinnedInputs, () => {
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

test('fails loudly for duplicate site IDs in the explicit map', needsPinnedInputs, () => {
  const duplicate = [...SYM_WEAPON_MAP, { codename: 'duplicate-source', siteId: 'm433', displayName: 'Duplicate' }];
  assert.throws(
    () => buildNormalizedSnapshot(inputs.source, currentWeapons, duplicate),
    /duplicate site weapon ID mapping: m433/,
  );
});

test('uses the exact effective recoil formula and keeps raw components', needsPinnedInputs, () => {
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

test('keeps damage and gravity/drag outside the live write candidate', needsPinnedInputs, () => {
  const result = buildImportResult({ source: inputs.source, patchDeltas: inputs.patchDeltas, currentWeapons });
  assert.equal(result.diff.summary.damageCurveWrites, 0);
  assert.equal(result.diff.summary.gravityDragWrites, 0);
  // Damage still never leaves this importer; scripts/apply-sym-damage.mjs owns it.
  for (const field of ['damage.dmgs', 'damage.dists']) {
    assert.equal(result.excluded.fields.find(entry => entry.field === field).decision, 'owned-by-damage-refresh');
  }
  assert.equal(result.excluded.fields.find(field => field.field === 'drag').decision, 'normalized-only');
  assert.equal(result.excluded.fields.some(field => field.field === 'reload.ReloadSpeed'), false);
  assert.ok(result.normalized.weapons.find(weapon => weapon.siteId === 'pp19').sourceExcluded.drag);
});

test('uses an immutable resolved baseline provenance', () => {
  const baseline = readBaselineWeapons(DEFAULT_ROOT, DEFAULT_BASELINE_SPEC);
  assert.equal(baseline.provenance.type, 'git');
  assert.equal(baseline.provenance.path, 'data/weapons.json');
  assert.match(baseline.provenance.commit, /^[0-9a-f]{40}$/);
  assert.equal(baseline.provenance.commit.startsWith('2df4811'), true);
});

test('keeps reload timing fields numeric-or-null and applies special reload policy', needsPinnedInputs, () => {
  const normalized = buildNormalizedSnapshot(inputs.source, currentWeapons);
  const byId = new Map(normalized.weapons.map(weapon => [weapon.siteId, weapon]));
  assert.equal(normalized.weapons.length, 59);
  for (const weapon of normalized.weapons) {
    assert.equal(Number.isFinite(weapon.siteFields.reloadSpeed), true);
    assert.equal(weapon.siteFields.reloadSpeed > 0, true);
    assert.ok(weapon.siteFields.tacRld === null || Number.isFinite(weapon.siteFields.tacRld));
    assert.ok(weapon.siteFields.emptyRld === null || Number.isFinite(weapon.siteFields.emptyRld));
  }
  for (const id of ['m87a1', 'm1014', 'db12']) {
    assert.equal(byId.get(id).reloadPolicy, 'shell-by-shell-null');
    assert.equal(byId.get(id).siteFields.tacRld, null);
    assert.equal(byId.get(id).siteFields.emptyRld, null);
  }
  assert.deepEqual(
    normalized.weapons
      .filter(weapon => weapon.siteFields.tacRld === null && weapon.siteFields.emptyRld === null)
      .map(weapon => weapon.siteId)
      .sort(),
    ['db12', 'm1014', 'm87a1'],
  );
  assert.equal(byId.get('ks18k').reloadPolicy, 'scalar-numeric-or-null');
  assert.equal(byId.get('ks18k').siteFields.tacRld, 2.75);
  assert.equal(byId.get('ks18k').siteFields.emptyRld, 3.7);
  const currentKs18k = currentWeapons.find(weapon => weapon.id === 'ks18k');
  assert.equal(currentKs18k.tacRld, 2.75);
  assert.equal(currentKs18k.emptyRld, 3.7);
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
  for (const id of ['m87a1', 'm1014', 'db12']) {
    const weapon = live.weapons.find(candidate => candidate.id === id);
    assert.equal(weapon.tacRld, null);
    assert.equal(weapon.emptyRld, null);
  }
  const ks18k = live.weapons.find(candidate => candidate.id === 'ks18k');
  assert.equal(ks18k.tacRld, 2.75);
  assert.equal(ks18k.emptyRld, 3.7);
});

test('derives scalar reloads from ReloadSpeed and changes exactly the known 15 non-1.0 weapons', needsPinnedInputs, () => {
  const normalized = buildNormalizedSnapshot(inputs.source, currentWeapons);
  const byCodename = new Map(Object.values(inputs.source).filter(row => row?.codename).map(row => [row.codename, row]));
  const bySiteId = new Map(normalized.weapons.map(weapon => [weapon.siteId, weapon]));
  const mapByCodename = new Map(SYM_WEAPON_MAP.map(entry => [entry.codename, entry]));
  const affected = [...byCodename.values()]
    .filter(row => row.reload?.ReloadSpeed !== 1)
    .map(row => mapByCodename.get(row.codename).siteId)
    .sort();
  assert.deepEqual(affected, [
    'ak205', 'l85a3', 'm240l', 'm277', 'm4a1', 'm60', 'nvo228e', 'pp19',
    'pw7a2', 'scw10', 'sg553r', 'sl9', 'tr7', 'usg90', 'vcr2',
  ]);

  for (const row of byCodename.values()) {
    const siteId = mapByCodename.get(row.codename).siteId;
    const normalizedRow = bySiteId.get(siteId);
    const speed = row.reload.ReloadSpeed;
    assert.equal(normalizedRow.siteFields.reloadSpeed, speed);
    if (SPECIAL_RELOAD_POLICY.shellByShell.includes(row.codename)) continue;
    assert.equal(normalizedRow.siteFields.tacRld, Number((row.reload.ReloadLeft / speed).toFixed(3)));
    const expectedEmpty = row.reload.ReloadEmpty === 'N/A'
      ? null
      : Number((row.reload.ReloadEmpty / speed).toFixed(3));
    assert.equal(normalizedRow.siteFields.emptyRld, expectedEmpty);
  }

  const ak205 = bySiteId.get('ak205');
  assert.equal(ak205.siteFields.tacRld, 2.484);
  assert.equal(ak205.siteFields.emptyRld, 2.917);

  const currentRecoilDecay = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'recoil_decay.json'), 'utf8'));
  const currentBalance = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'balance_tables.json'), 'utf8'));
  const live = buildLiveData(currentWeapons, currentRecoilDecay, currentBalance, normalized);
  assert.equal(live.weapons.length, 59);
  assert.equal(live.weapons.filter(weapon => Number.isFinite(weapon.reloadSpeed)).length, 59);
  const pp19 = live.weapons.find(weapon => weapon.id === 'pp19');
  assert.equal(pp19.reloadSpeed, 0.979732);
  assert.equal(pp19.tacRld, 2.467);
  assert.equal(pp19.emptyRld, 3.028);
  assert.equal(pp19.recoilV, currentWeapons.find(weapon => weapon.id === 'pp19').recoilV);
});

test('ReloadSpeed defaults only when absent and rejects invalid present values', () => {
  assert.equal(normalizedReloadFields({ codename: 'missing-speed', reload: { ReloadLeft: 2, ReloadEmpty: 3 } }).reloadSpeed, 1.0);
  for (const value of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 'N/A', '']) {
    assert.throws(
      () => normalizedReloadFields({ codename: 'invalid-speed', reload: { ReloadSpeed: value } }),
      /invalid-speed: reload\.ReloadSpeed must be a finite positive number/,
    );
  }
});

test('maps reload.ReloadSpeed to the live reloadSpeed target', needsPinnedInputs, () => {
  const ak205 = Object.values(inputs.source).find(row => row?.codename === 'ak205');
  const result = reconcilePatchDeltas(inputs.source, baselineWeapons, [{
    weapon: ak205.displayname,
    changes: [{ prop: 'reload.ReloadSpeed', old: 1, new: ak205.reload.ReloadSpeed }],
  }]);
  assert.equal(result.rows[0].siteTarget, 'reloadSpeed');
  assert.equal(result.rows[0].sourcePath, 'reload.ReloadSpeed');
  assert.equal(result.rows[0].sourceStatus, 'matched');
  assert.equal(result.rows[0].baselineStatus, 'not-represented');
});

test('preserves the separate M60 and M240L alternate-magazine timing contract', () => {
  const attachments = JSON.parse(readFileSync(join(DEFAULT_ROOT, 'data', 'attachments.json'), 'utf8'));
  assert.equal(attachments.WEAPON_MAG.m60.mags['50_rnd'].tacRld, 4534);
  assert.equal(attachments.WEAPON_MAG.m60.mags['100_rnd'].tacRld, 7350);
  assert.equal(attachments.WEAPON_MAG.m240l.mags['50_rnd'].tacRld, 4250);
  assert.equal(attachments.WEAPON_MAG.m240l.mags['75_rnd'].tacRld, 7100);
  assert.equal(attachments.WEAPON_MAG.m240l.mags['100_rnd'].tacRld, 7100);
});

test('reconciles every EA velocity and recoil-variation line to pinned Sym values', needsPinnedInputs, () => {
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
