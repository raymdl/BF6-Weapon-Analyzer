import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readRequiredJson(root, relativePath, label) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) throw new Error(`Missing ${label}: ${relativePath}`);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error.message}`, { cause: error });
  }
}

export function loadReloadExceptionRegister(root = DEFAULT_ROOT) {
  const register = readRequiredJson(root, 'data/reload-exceptions.json', 'reload exception register');
  const attachments = readRequiredJson(root, 'data/attachments.json', 'attachment catalog');
  const weapons = readRequiredJson(root, 'data/weapons.json', 'weapon catalog');
  if (register.schemaVersion !== 1 || register.$schema !== '../schemas/reload-exceptions.schema.json') {
    throw new Error('Invalid reload exception register schema declaration');
  }

  const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
  const animationRecords = new Set();
  let animationEntries = 0;
  let screenshotExceptionEntries = 0;
  let composedLoadoutEvidenceEntries = 0;

  for (const [weaponId, magazines] of Object.entries(register.animationOverrides ?? {})) {
    if (!weaponById.has(weaponId)) throw new Error(`Reload animation register references unknown weapon ${weaponId}`);
    for (const [magazineId, entry] of Object.entries(magazines ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[magazineId]) {
        throw new Error(`Reload animation register references unknown magazine ${weaponId}/${magazineId}`);
      }
      if (!Number.isInteger(entry.tacRldOverrideMs) || entry.tacRldOverrideMs <= 0) {
        throw new Error(`Reload animation register ${weaponId}/${magazineId} requires a positive tacRldOverrideMs`);
      }
      if (typeof entry.displayName !== 'string' || !entry.displayName
          || typeof entry.recordKey !== 'string' || !entry.recordKey) {
        throw new Error(`Reload animation register ${weaponId}/${magazineId} requires displayName and recordKey`);
      }
      animationRecords.add(entry.recordKey);
      animationEntries++;
    }
  }

  for (const [weaponId, magazines] of Object.entries(register.screenshotExceptions ?? {})) {
    if (!weaponById.has(weaponId)) throw new Error(`Reload observation register references unknown weapon ${weaponId}`);
    for (const [magazineId, entry] of Object.entries(magazines ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[magazineId]) {
        throw new Error(`Reload observation register references unknown magazine ${weaponId}/${magazineId}`);
      }
      if (!Number.isInteger(entry.observedReloadMs) || entry.observedReloadMs <= 0
          || typeof entry.displayName !== 'string' || !entry.displayName
          || typeof entry.observedOn !== 'string' || !entry.observedOn
          || typeof entry.reason !== 'string' || !entry.reason) {
        throw new Error(`Reload observation register ${weaponId}/${magazineId} is incomplete`);
      }
      screenshotExceptionEntries++;
    }
  }

  for (const [weaponId, loadouts] of Object.entries(register.composedLoadoutEvidence ?? {})) {
    if (!weaponById.has(weaponId)) throw new Error(`Composed-loadout evidence references unknown weapon ${weaponId}`);
    for (const [loadoutId, entry] of Object.entries(loadouts ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[entry.magazineId]) {
        throw new Error(`Composed-loadout evidence references unknown magazine ${weaponId}/${entry.magazineId}`);
      }
      if (!attachments.WEAPON_ERGO?.[weaponId]?.avail?.includes(entry.ergonomicId)) {
        throw new Error(`Composed-loadout evidence references unavailable ergonomic ${weaponId}/${entry.ergonomicId}`);
      }
      if (!Number.isInteger(entry.observedReloadMs) || entry.observedReloadMs <= 0
          || entry.evidenceKind !== 'composed-loadout' || entry.singleAttachmentPanel !== false) {
        throw new Error(`Composed-loadout evidence ${weaponId}/${loadoutId} has an invalid observation`);
      }
      for (const field of ['observedOn', 'evidenceReference', 'note']) {
        if (typeof entry[field] !== 'string' || !entry[field]) {
          throw new Error(`Composed-loadout evidence ${weaponId}/${loadoutId} requires ${field}`);
        }
      }
      composedLoadoutEvidenceEntries++;
    }
  }

  const actualCounts = {
    animationOverrideRecords: animationRecords.size,
    animationOverrideEntries: animationEntries,
    screenshotExceptionEntries,
    composedLoadoutEvidenceEntries,
  };
  if (JSON.stringify(register.counts) !== JSON.stringify(actualCounts)) {
    throw new Error(`Reload exception counts do not match their entries: ${JSON.stringify(actualCounts)}`);
  }
  return { register };
}
