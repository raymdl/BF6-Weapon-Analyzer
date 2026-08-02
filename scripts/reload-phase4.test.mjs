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
    const originalRegister = readFileSync(registerPath, 'utf8');
    const validate = () => spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
      cwd: root,
      env: { ...process.env, DATA_ROOT: temporaryRoot },
      encoding: 'utf8',
    });
    const writeRegister = register => {
      writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
    };
    const assertRejects = (mutate, message) => {
      writeFileSync(registerPath, originalRegister);
      const attachments = JSON.parse(originalAttachments);
      mutate(attachments);
      writeFileSync(attachmentsPath, `${JSON.stringify(attachments, null, 2)}\n`);
      const result = validate();
      assert.notEqual(result.status, 0, message);
      assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    };
    const assertRegisterRejects = (mutate, message) => {
      writeFileSync(attachmentsPath, originalAttachments);
      const register = JSON.parse(originalRegister);
      mutate(register);
      writeRegister(register);
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
    assertRegisterRejects(register => { register.animationOverrides.m240l['75_rnd'].tacRldOverrideMs = 7101; }, 'm240l/75_rnd: tacRldOverrideMs mismatch: data/attachments.json=7100, data/reload-exceptions.json=7101');
    assertRegisterRejects(register => {
      register.animationOverrides.ak4d = {
        '15_rnd': { tacRldOverrideMs: 1234, displayName: '15Rnd Magazine', recordKey: 'test-dangling' },
      };
      register.counts.animationOverrideRecords += 1;
      register.counts.animationOverrideEntries += 1;
    }, 'ak4d/15_rnd: dangling tacRldOverrideMs in data/reload-exceptions.json; no matching override exists in data/attachments.json');
    assertRegisterRejects(register => { register.screenshotExceptions.pp19['20_fast'].observedReloadMs = 2473; }, 'pp19/20_fast: suspectedGameBug observedReloadSeconds mismatch: data/attachments.json=2.467s, data/reload-exceptions.json=2473ms');
    assertRegisterRejects(register => {
      delete register.screenshotExceptions.pp19['20_fast'];
      register.counts.screenshotExceptionEntries -= 1;
    }, 'pp19/20_fast: suspectedGameBug observedReloadSeconds is not in the screenshot exception register');
    assertRejects(data => { data.WEAPON_MAG.ak4d.mags['15_rnd'].reloadSpeedTier = 3; }, 'reloadSpeedTier must be a non-negative integer in [0, 2] per migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md §6 (Phase 4)');
    assertRejects(data => { data.WEAPON_MAG.pp19.mags['20_fast'].suspectedGameBug.expectedWhenFixed = 3; }, 'suspectedGameBug.expectedWhenFixed must be a non-negative integer in [0, 2] per migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md §6 (Phase 4)');
    assertRejects(data => { data.WEAPON_MAG.pp19.mags['20_fast'].reloadSpeedTier = 2; }, 'suspectedGameBug reload drift is unexplained; derived reload 1.932s does not match observedReloadSeconds 2.467s');

    writeFileSync(registerPath, '{');
    const malformedRegisterResult = validate();
    assert.notEqual(malformedRegisterResult.status, 0);
    assert.match(malformedRegisterResult.stderr, /Invalid required Phase 0 fixture: reload exception register/);
    assert.doesNotMatch(malformedRegisterResult.stderr, /audit-phase0-lib\.mjs/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
