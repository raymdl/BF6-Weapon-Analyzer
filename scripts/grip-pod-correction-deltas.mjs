import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const register = JSON.parse(readFileSync(join(root, 'scripts/grip-pod-correction-delta-register.json'), 'utf8'));

export const APPROVED_GRIP_IDS = Object.freeze(register.records.map(record => record.id));
export const STRICT_UNCHANGED_PLAYER_VISIBLE_FIELDS = Object.freeze([...register.strictUnchangedPlayerVisibleFields]);

const recordById = new Map(register.records.map(record => [record.id, record]));

export function getGripCorrectionRegister() {
  return register;
}

export function assertGripCorrectionRegister() {
  assert.equal(register.kind, 'approved-grip-pod-correction-delta-register');
  assert.deepEqual([...recordById.keys()], [
    'ptt_grip_pod',
    'qd_grip_pod',
    'classic_grip_pod',
    'qd_grip_pod_sr',
    'classic_grip_pod_sr',
  ]);
  assert.equal(new Set(APPROVED_GRIP_IDS).size, 5);
  assert.deepEqual(Object.keys(register.phase5FrozenPointBudgetValues).sort(), [...APPROVED_GRIP_IDS].sort());
  for (const record of register.records) {
    assert.match(record.id, /^(?:ptt_grip_pod|qd_grip_pod|classic_grip_pod|qd_grip_pod_sr|classic_grip_pod_sr)$/);
    assert.ok(record.displayName);
    assert.ok(record.variant === 'standard' || record.variant === 'sniper');
    assert.ok(record.directCardCorrection);
    for (const change of record.changedCatalogFields) {
      assert.ok(Object.hasOwn(change, 'before'), `${record.id}/${change.field} missing before value`);
      assert.ok(Object.hasOwn(change, 'after'), `${record.id}/${change.field} missing after value`);
      assert.ok(Array.isArray(change.playerVisibleFields));
    }
  }
  return true;
}

export function correctionRecordFor(id) {
  return recordById.get(id) ?? null;
}

export function changedOutputFieldsForGrip(id) {
  const record = correctionRecordFor(id);
  return record ? [...new Set(record.changedCatalogFields.flatMap(change => change.playerVisibleFields))].sort() : [];
}

export function selectedGripId(weaponId, atts, modelAttachments) {
  const weaponAtts = modelAttachments.WEAPON_ATTS?.[weaponId] ?? {};
  return weaponAtts.laserGripLightCombined ? (atts.laser ?? 'none') : (atts.grip ?? 'none');
}

export function selectedCorrectionRecord(weaponId, atts, modelAttachments) {
  return correctionRecordFor(selectedGripId(weaponId, atts, modelAttachments));
}

export function restoreApprovedGripCorrections(modelAttachments) {
  const restored = structuredClone(modelAttachments);
  for (const record of register.records) {
    const grip = restored.GRIPS.find(candidate => candidate.id === record.id);
    assert.ok(grip, `missing registered grip ${record.id}`);
    for (const change of record.changedCatalogFields) {
      if (change.afterPresent === false) {
        grip[change.field] = change.before;
      } else {
        grip[change.field] = change.before;
      }
    }
  }
  return restored;
}

export function restoreApprovedGripRecordValue(value, id) {
  const record = correctionRecordFor(id);
  if (!record || !value || typeof value !== 'object') return value;
  const restored = structuredClone(value);
  for (const change of record.changedCatalogFields) restored[change.field] = change.before;
  return restored;
}

export function neutralizeApprovedGripOption(option) {
  const record = correctionRecordFor(option?.id);
  if (!record) return option;
  const frozenPoints = register.phase5FrozenPointBudgetValues[record.id];
  return {
    ...option,
    current: restoreApprovedGripRecordValue(option.current, record.id),
    legacyValue: restoreApprovedGripRecordValue(option.legacyValue, record.id),
    points: frozenPoints ?? option.points,
  };
}

export function diffPaths(left, right, prefix = '') {
  if (Object.is(left, right)) return [];
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return [prefix || '$'];
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.flatMap(key => diffPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key));
}

export function outputDelta(before, after, record) {
  const changedFields = diffPaths(before, after);
  const allowed = new Set(changedOutputFieldsForGrip(record.id));
  const unexpectedFields = changedFields.filter(field => !allowed.has(field));
  return {
    gripId: record.id,
    changedFields,
    unexpectedFields,
    values: Object.fromEntries(changedFields.map(field => [field, { before: before[field], after: after[field] }])),
  };
}

export function projectApprovedGripFields(value, record) {
  const projected = structuredClone(value);
  for (const field of changedOutputFieldsForGrip(record.id)) delete projected[field];
  return projected;
}

export function projectCaseOutput(value, weaponId, atts, modelAttachments) {
  const record = selectedCorrectionRecord(weaponId, atts, modelAttachments);
  return record ? projectApprovedGripFields(value, record) : value;
}

export function assertOnlyApprovedOutputDelta(before, after, record) {
  const delta = outputDelta(before, after, record);
  assert.deepEqual(delta.unexpectedFields, [], `${record.id} has an unregistered output delta: ${JSON.stringify(delta)}`);
  return delta;
}

assertGripCorrectionRegister();
