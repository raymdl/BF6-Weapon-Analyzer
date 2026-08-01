import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');

test('Phase 6 validator rejects malformed or reintroduced legacy reload shapes in an isolated data copy', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'bf6-reload-phase4-'));
  const temporaryData = join(temporaryRoot, 'data');
  const attachmentsPath = join(temporaryData, 'attachments.json');
  try {
    cpSync(join(root, 'data'), temporaryData, { recursive: true });
    const originalAttachments = readFileSync(attachmentsPath, 'utf8');
    const registerPath = join(temporaryData, 'reload-exceptions.json');
    const validate = () => spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
      cwd: root,
      env: { ...process.env, DATA_ROOT: temporaryRoot },
      encoding: 'utf8',
    });
    const assertRejects = (mutate, message) => {
      const attachments = JSON.parse(originalAttachments);
      mutate(attachments);
      writeFileSync(attachmentsPath, `${JSON.stringify(attachments, null, 2)}\n`);
      const result = validate();
      assert.notEqual(result.status, 0, message);
      assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    };

    assertRejects(data => { data.WEAPON_MAG.ak4d.mags['15_rnd'].reloadSpeedTier = -1; }, 'reloadSpeedTier must be a non-negative integer');
    assertRejects(data => { data.WEAPON_MAG.ak4d.mags['15_rnd'].reloadSpeedTier = '1'; }, 'reloadSpeedTier must be a non-negative integer');
    assertRejects(data => { data.WEAPON_MAG.m240l.mags['75_rnd'].tacRldOverrideMs = 0; }, 'tacRldOverrideMs must be a positive integer');
    assertRejects(data => { data.ERGOS.find(ergo => ergo.id === 'mag_catch').reloadSpeedMult = 0; }, 'reloadSpeedMult must be a positive finite number');
    assertRejects(data => { delete data.WEAPON_MAG.ak4d.mags['15_rnd'].reloadSpeedTier; }, 'exactly one of reloadSpeedTier or tacRldOverrideMs is required');
    assertRejects(data => { data.WEAPON_MAG.pp19.mags['20_fast'].tacRld = 2467; }, 'legacy tacRld must be absent after the reload cutover');
    assertRejects(data => { data.WEAPON_ERGO.pp19.magCatchRld = { reg: 2321, fast: 2054 }; }, 'legacy magCatchRld must be absent after the reload cutover');
    assertRejects(data => { data.WEAPON_MAG.pp19.mags['20_fast'].reloadSpeedTier = 1; }, 'suspectedGameBug is stale');

    writeFileSync(registerPath, '{');
    const malformedRegisterResult = validate();
    assert.notEqual(malformedRegisterResult.status, 0);
    assert.match(malformedRegisterResult.stderr, /Invalid required Phase 0 fixture: reload exception register/);
    assert.doesNotMatch(malformedRegisterResult.stderr, /audit-phase0-lib\.mjs/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
