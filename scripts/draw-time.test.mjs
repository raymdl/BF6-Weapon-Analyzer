import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAttachments, resolveDrawTime, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const attachments = read('../data/attachments.json');
const ammo = read('../data/ammo.json');
const balance = read('../data/balance_tables.json');
const weapons = read('../data/weapons.json');
const evidence = read('../reference-data/provenance/frosty-draw-time-2026-09-09.json');
const tables = balance.DRAW_TIME_TABLES;
setAttachmentContext({ ...attachments, ...ammo, ...balance, HP_HS_HIGH: new Set(balance.HP_HS_HIGH) });
const build = (id, changes = {}) => {
  const weapon = weapons.find(w => w.id === id);
  const atts = {};
  resetAttsForWeapon(atts, weapon, { ...attachments, ...ammo });
  return applyAttachments(weapon, { ...atts, ...changes });
};

test('timing arrays and all 63 base selectors match the retained Frosty exports', () => {
  assert.deepEqual(tables.sprint, evidence.sprint.map(row => +(Number(row.recoverySecondsRaw) * 1000).toFixed(6)));
  for (const [table, source] of [['primary', 'DTA_Weapons'], ['sidearm', 'DTA_Sidearms']]) {
    for (const field of ['deploy', 'undeploy']) {
      assert.deepEqual(tables[table][field], evidence.deployArrays[source]
        .map(row => +(Number(row[`${field}SecondsRaw`]) * 1000).toFixed(6)));
    }
  }
  assert.equal(evidence.weaponIndices.length, weapons.length);
  for (const row of evidence.weaponIndices) {
    const data = attachments.WEAPON_MAG[row.siteId];
    assert.equal(data.sprintRecoveryBaseIndex, row.sprintIndex, row.siteId);
    assert.equal(data.deployBaseIndex, row.deployIndex, row.siteId);
    assert.equal(data.deployTimeTable, row.deployArray.includes('DTA_Sidearms') ? 'sidearm' : 'primary', row.siteId);
  }
});

test('source bases plus equipped magazines preserve sprint and correct deploy timing', () => {
  for (const [id, sprint, deploy, undeploy] of [
    ['m433', 167, 533, 200], ['db12', 133, 467, 167],
    ['es57', 67, 200, 83], ['interdictor', 233, 633, 233],
  ]) {
    const result = build(id);
    assert.equal(Math.round(result._sprintRecoveryMs), sprint, id);
    assert.equal(Math.round(result._deployTimeMs), deploy, id);
    assert.equal(Math.round(result._undeployTimeMs), undeploy, id);
    assert.equal(result.undeployT, result._undeployTimeMs / 1000, id);
  }
  for (const [mag, sprint] of [['10_rnd', 100], ['10_fast', 133], ['20_rnd', 133], ['20_fast', 167], ['30_rnd', 167]]) {
    assert.equal(Math.round(build('vssm', { mag })._sprintRecoveryMs), sprint, mag);
  }
});

test('Speed Holster and Gunslinger change sprint, deploy and undeploy', () => {
  const base = build('ggh22');
  const fast = build('ggh22', { ergo: 'fast_deploy' });
  assert.deepEqual([base._sprintRecoveryMs, base._deployTimeMs, base._undeployTimeMs].map(Math.round), [83, 233, 100]);
  assert.deepEqual([fast._sprintRecoveryMs, fast._deployTimeMs, fast._undeployTimeMs].map(Math.round), [67, 200, 83]);
  const revolver = build('m44', { ergo: 'fast_deploy_10' });
  assert.deepEqual([revolver._sprintRecoveryMs, revolver._deployTimeMs, revolver._undeployTimeMs].map(Math.round), [67, 267, 117]);
});

test('full arrays clamp both ends and retain the sidearm plateau', () => {
  for (const [weapon, minimum, maximum] of [
    ['m433', [50, 267, 83], [400, 1333, 400]],
    ['m44', [50, 167, 67], [400, 467, 233]],
  ]) {
    for (const [shift, expected] of [[-100, minimum], [100, maximum]]) {
      const result = resolveDrawTime({ weaponMag: attachments.WEAPON_MAG[weapon],
        sprintRecoveryTierShift: shift, deployTimeTierShift: shift });
      assert.deepEqual([result.sprint.index.value, result.deploy.index.value, result.undeploy.index.value].map(Math.round), expected);
      assert.ok(result.sprint.index.clamped && result.deploy.index.clamped);
    }
  }
  const sidearm = attachments.WEAPON_MAG.m44;
  for (const shift of [1, 2, 8, 100]) {
    assert.equal(resolveDrawTime({ weaponMag: sidearm, deployTimeTierShift: shift }).deploy.index.value, 466.667);
  }
  // VZ. 61 selects DTA_Weapons: it must not inherit the sidearm plateau.
  assert.equal(resolveDrawTime({ weaponMag: attachments.WEAPON_MAG.vz61, deployTimeTierShift: 2 }).deploy.index.value, 533.334);
});

test('axes resolve independently and malformed selectors fail closed', () => {
  const weaponMag = attachments.WEAPON_MAG.m433;
  const result = resolveDrawTime({ weaponMag, sprintRecoveryTierShift: -1 });
  assert.equal(result.sprint.index.value, 166.667);
  assert.equal(result.deploy.index.value, 633.334);
  for (const deployTimeTable of [undefined, 'unknown']) {
    assert.equal(resolveDrawTime({ weaponMag: { ...weaponMag, deployTimeTable } }).valid, false);
  }
  for (const sprintRecoveryBaseIndex of [-1, 12, 1.5, undefined]) {
    assert.equal(resolveDrawTime({ weaponMag: { ...weaponMag, sprintRecoveryBaseIndex } }).valid, false);
  }
  assert.equal(resolveDrawTime({ weaponMag, deployTimeTierShift: 0.5 }).valid, false);
  assert.equal(resolveDrawTime({ weaponMag, tables: {} }).valid, false);
});
