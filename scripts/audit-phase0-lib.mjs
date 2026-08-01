import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PHASE0_FIXTURES = Object.freeze({
  audit: 'outputs/attachment-audit/attachment-screenshot-review.json',
  balance: 'data/balance_tables.json',
  weapons: 'data/weapons.json',
  subsonic: 'outputs/attachment-audit/subsonic-velocity-treatments-20260731.json',
  reviewedExceptions: 'outputs/attachment-audit/sweep-reviewed-exceptions-20260731.json',
  bulkRecapture: 'outputs/attachment-audit/bulk-suspect-recapture-summary-20260731.json',
  dedupeExclusions: 'outputs/attachment-audit/deduped-source-record-exclusions-20260731.json',
  sl9Recapture: 'outputs/attachment-audit/sl9-detailed-recapture-20260731.json',
  reloadExceptions: 'data/reload-exceptions.json',
  reloadMigrationManifest: 'scripts/reload-phase4-migration-manifest.json',
});

export const TUBE_FED_SHOTGUNS = new Set(['DB-12', 'M1014', 'M87A1']);
export const DEFAULT_RELOAD_SPEED_LADDER = 1.13;

const REQUIRED_REGISTER_KINDS = Object.freeze({
  subsonic: ['subsonic-velocity-treatment-register', 'treatments'],
  reviewedExceptions: ['sweep-reviewed-exception-register', 'exceptions'],
});

function fixturePath(root, relativePath) {
  return path.resolve(root, relativePath);
}

export function readRequiredJson(root, relativePath, label = relativePath) {
  const absolutePath = fixturePath(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required Phase 0 fixture: ${label} (${relativePath})`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid required Phase 0 fixture: ${label} (${relativePath}): ${error.message}`, { cause: error });
  }
}

export function loadReloadExceptionRegister(root = DEFAULT_ROOT) {
  const register = readRequiredJson(root, PHASE0_FIXTURES.reloadExceptions, 'reload exception register');
  if (register.schemaVersion !== 1 || register.$schema !== '../schemas/reload-exceptions.schema.json') {
    throw new Error('Invalid reload exception register schema declaration');
  }
  const attachments = readRequiredJson(root, 'data/attachments.json', 'attachment catalog for reload exception register');
  const weapons = readRequiredJson(root, 'data/weapons.json', 'weapon catalog for reload exception register');
  const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
  const animationOverrides = new Map();
  const screenshotExceptions = new Map();
  const animationRecords = new Set();
  let animationEntries = 0;
  for (const [weaponId, magazines] of Object.entries(register.animationOverrides ?? {})) {
    const weapon = weaponById.get(weaponId);
    if (!weapon) throw new Error(`reload animation register references unknown weapon ${weaponId}`);
    for (const [magazineId, entry] of Object.entries(magazines ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[magazineId]) {
        throw new Error(`reload animation register references unknown magazine ${weaponId}/${magazineId}`);
      }
      if (!Number.isInteger(entry.tacRldOverrideMs) || entry.tacRldOverrideMs <= 0) {
        throw new Error(`reload animation register ${weaponId}/${magazineId} requires a positive integer tacRldOverrideMs`);
      }
      if (typeof entry.displayName !== 'string' || !entry.displayName) {
        throw new Error(`reload animation register ${weaponId}/${magazineId} requires a displayName`);
      }
      if (typeof entry.recordKey !== 'string' || !entry.recordKey) {
        throw new Error(`reload animation register ${weaponId}/${magazineId} requires a recordKey`);
      }
      animationRecords.add(entry.recordKey);
      animationEntries++;
      const auditWeaponName = weapon.name.replaceAll('/', '');
      animationOverrides.set(`${auditWeaponName}/${entry.displayName}`, entry.tacRldOverrideMs / 1000);
    }
  }
  for (const [weaponId, magazines] of Object.entries(register.screenshotExceptions ?? {})) {
    const weapon = weaponById.get(weaponId);
    if (!weapon) throw new Error(`reload screenshot register references unknown weapon ${weaponId}`);
    for (const [magazineId, entry] of Object.entries(magazines ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[magazineId]) {
        throw new Error(`reload screenshot register references unknown magazine ${weaponId}/${magazineId}`);
      }
      if (!Number.isInteger(entry.observedReloadMs) || entry.observedReloadMs <= 0) {
        throw new Error(`reload screenshot register ${weaponId}/${magazineId} requires a positive integer observedReloadMs`);
      }
      if (typeof entry.displayName !== 'string' || !entry.displayName) {
        throw new Error(`reload screenshot register ${weaponId}/${magazineId} requires a displayName`);
      }
      const auditWeaponName = weapon.name.replaceAll('/', '');
      screenshotExceptions.set(`${auditWeaponName}/${entry.displayName}`, {
        observed: entry.observedReloadMs / 1000,
        reason: entry.reason,
      });
    }
  }
  let composedLoadoutEvidenceEntries = 0;
  for (const [weaponId, loadouts] of Object.entries(register.composedLoadoutEvidence ?? {})) {
    const weapon = weaponById.get(weaponId);
    if (!weapon) throw new Error(`reload composed-loadout register references unknown weapon ${weaponId}`);
    for (const [loadoutId, entry] of Object.entries(loadouts ?? {})) {
      if (!attachments.WEAPON_MAG?.[weaponId]?.mags?.[entry.magazineId]) {
        throw new Error(`reload composed-loadout register references unknown magazine ${weaponId}/${entry.magazineId}`);
      }
      if (!attachments.WEAPON_ERGO?.[weaponId]?.avail?.includes(entry.ergonomicId)) {
        throw new Error(`reload composed-loadout register references unavailable ergonomic ${weaponId}/${entry.ergonomicId}`);
      }
      if (!Number.isInteger(entry.observedReloadMs) || entry.observedReloadMs <= 0) {
        throw new Error(`reload composed-loadout register ${weaponId}/${loadoutId} requires a positive integer observedReloadMs`);
      }
      if (entry.evidenceKind !== 'composed-loadout' || entry.singleAttachmentPanel !== false) {
        throw new Error(`reload composed-loadout register ${weaponId}/${loadoutId} must identify composed-loadout evidence`);
      }
      for (const field of ['observedOn', 'receipt', 'note']) {
        if (typeof entry[field] !== 'string' || !entry[field]) {
          throw new Error(`reload composed-loadout register ${weaponId}/${loadoutId} requires ${field}`);
        }
      }
      composedLoadoutEvidenceEntries++;
    }
  }
  if (register.counts?.animationOverrideRecords !== animationRecords.size
      || register.counts?.animationOverrideEntries !== animationEntries
      || register.counts?.screenshotExceptionEntries !== screenshotExceptions.size
      || register.counts?.composedLoadoutEvidenceEntries !== composedLoadoutEvidenceEntries) {
    throw new Error('reload exception register counts do not match its ID-keyed entries');
  }
  return { register, animationOverrides, screenshotExceptions };
}

let defaultReloadRegisters;
const defaultAnimationOverrides = new Map();
const defaultScreenshotExceptions = new Map();

function ensureDefaultReloadRegisters() {
  if (!defaultReloadRegisters) {
    defaultReloadRegisters = loadReloadExceptionRegister(DEFAULT_ROOT);
    for (const [key, value] of defaultReloadRegisters.animationOverrides) defaultAnimationOverrides.set(key, value);
    for (const [key, value] of defaultReloadRegisters.screenshotExceptions) defaultScreenshotExceptions.set(key, value);
  }
  return defaultReloadRegisters;
}

function lazyMap(map) {
  return new Proxy(map, {
    get(target, property) {
      ensureDefaultReloadRegisters();
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

// These retain the historical exported names while deferring register parsing
// until a consumer actually reads a default map. Validator callers can then
// catch malformed-register errors from their explicit load call.
export const RELOAD_ANIMATION_OVERRIDES = lazyMap(defaultAnimationOverrides);
export const RELOAD_SCREENSHOT_EXCEPTIONS = lazyMap(defaultScreenshotExceptions);

function sourceMatch(value) {
  const normalized = String(value ?? '').replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)(Weapon Attachments\/.+)$/i);
  if (!match) {
    throw new Error(`Source path is not rooted under Weapon Attachments: ${value}`);
  }
  return match[1].replace(/\/+/g, '/');
}

/**
 * Return the stable audit identity. The historical absolute prefix is never
 * part of a comparison, so the same register works on any checkout.
 */
export function sourceIdentity(value) {
  return sourceMatch(value).toLowerCase();
}

export function sourceRelativePath(value) {
  return sourceMatch(value);
}

export function normalizeWeaponName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function classFromSourcePath(value) {
  const parts = sourceIdentity(value).split('/');
  if (parts.length < 4) throw new Error(`Source path has no class/weapon suffix: ${value}`);
  return parts[1];
}

export function rowsWithStats(audit) {
  return audit.records.filter(record => record && record.stats);
}

export function modalValue(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = row.stats?.[field];
    if (value == null) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  const values = [...counts.entries()].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
  return values.length ? Number(values[0][0]) : null;
}

export function hiddenRecoilAmountBase(weapon) {
  if (!Number.isFinite(weapon?.recoilV)) {
    throw new Error(`Weapon ${weapon?.name ?? '<unknown>'} has no hidden-precision recoilV base`);
  }
  return weapon.recoilV;
}

export function hiddenRecoilVariationBase(weapon) {
  const raw = Number.isFinite(weapon?.recoilVar) ? weapon.recoilVar : weapon?.recoil?.ads?.dirVar;
  const multiplier = weapon?.recoil?.ads?.dirVarMult ?? 1;
  const exponent = weapon?.recoil?.ads?.dirVarExp ?? 0;
  if (!Number.isFinite(raw) || !Number.isFinite(multiplier) || !Number.isFinite(exponent)) {
    throw new Error(`Weapon ${weapon?.name ?? '<unknown>'} has no complete hidden recoil-variation base`);
  }
  return raw * (multiplier ** exponent);
}

/**
 * Battlefield's one-decimal panel is modeled in the game's float32 display
 * domain, then rounded half-up. The float32 step is material at exact ties:
 * DB-12's +3 result is 2.2500000000000004 in JS double precision but still
 * displays 2.3 under the pinned game-facing rule.
 */
export function roundDisplayOneDecimal(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(Math.fround(value) * 10) / 10;
}

export function matchesDisplayOneDecimal(value, displayed) {
  return roundDisplayOneDecimal(value) === displayed;
}

export function reloadCandidates(baseValue, reloadSpeedLadder = DEFAULT_RELOAD_SPEED_LADDER) {
  const fast = reloadSpeedLadder;
  const magCatch = 1.063;
  return [
    baseValue,
    baseValue / fast,
    baseValue / (fast * fast),
    baseValue / magCatch,
    baseValue / (fast * magCatch),
    baseValue / (fast * fast * magCatch),
  ];
}

export function reloadOverrideFor(weaponName, attachmentName, animationOverrides = RELOAD_ANIMATION_OVERRIDES) {
  return animationOverrides.get(`${weaponName}/${attachmentName}`);
}

export function reloadRowMatches(row, baseValue, {
  reloadSpeedLadder = DEFAULT_RELOAD_SPEED_LADDER,
  animationOverrides = RELOAD_ANIMATION_OVERRIDES,
} = {}) {
  const observed = row.stats?.reloadTimeSeconds;
  if (observed == null || observed === 0) return true;
  const override = reloadOverrideFor(row.weaponName, row.attachmentName, animationOverrides);
  if (override != null) return Math.abs(observed - override) <= 0.0005;
  return reloadCandidates(baseValue, reloadSpeedLadder)
    .some(candidate => Math.abs(Number(candidate.toFixed(3)) - observed) <= 0.005);
}

export function classSummary(audit) {
  const byClass = new Map();
  for (const row of rowsWithStats(audit)) {
    const weaponClass = classFromSourcePath(row.source?.currentPath);
    const entry = byClass.get(weaponClass) || { statRows: 0, weapons: new Set() };
    entry.statRows += 1;
    entry.weapons.add(row.weaponName);
    byClass.set(weaponClass, entry);
  }
  return Object.fromEntries([...byClass.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weaponClass, entry]) => [
    weaponClass,
    { statRows: entry.statRows, weapons: entry.weapons.size, weaponNames: [...entry.weapons].sort() },
  ]));
}

function validateRegister(register, registerName, [kind, property]) {
  if (register.kind !== kind || !Array.isArray(register[property])) {
    throw new Error(`Invalid required Phase 0 register: ${registerName}`);
  }
  for (const item of register[property]) sourceIdentity(item.sourcePath);
  return register[property];
}

function validateAuditFixture(audit) {
  if (!Array.isArray(audit.records) || audit.records.length === 0) {
    throw new Error('Required attachment audit fixture has no records');
  }
  if (audit.recordCount !== audit.records.length) {
    throw new Error(`Attachment audit full-roster count mismatch: metadata=${audit.recordCount}, records=${audit.records.length}`);
  }
  const stats = rowsWithStats(audit);
  if (audit.attachmentDetailCount !== stats.length) {
    throw new Error(`Attachment audit stat-row count mismatch: metadata=${audit.attachmentDetailCount}, rows=${stats.length}`);
  }
  const names = new Set();
  for (const record of audit.records) {
    if (!record.weaponName || !record.source?.currentPath) {
      throw new Error('Attachment audit contains a record without weaponName/currentPath');
    }
    sourceIdentity(record.source.currentPath);
    names.add(record.weaponName);
  }
  if (!Array.isArray(audit.weaponsProcessed) || new Set(audit.weaponsProcessed).size !== names.size
      || audit.weaponsProcessed.length !== names.size || audit.weaponsProcessed.some(name => !names.has(name))) {
    throw new Error('Attachment audit full-roster weapon list does not match its records');
  }
  return { stats, weaponNames: [...names].sort() };
}

export function loadPhase0Inputs(root = DEFAULT_ROOT) {
  const audit = readRequiredJson(root, PHASE0_FIXTURES.audit, 'attachment screenshot review');
  const balance = readRequiredJson(root, PHASE0_FIXTURES.balance, 'balance tables');
  const weapons = readRequiredJson(root, PHASE0_FIXTURES.weapons, 'weapon hidden-precision bases');
  const subsonic = readRequiredJson(root, PHASE0_FIXTURES.subsonic, 'subsonic velocity register');
  const reviewedExceptions = readRequiredJson(root, PHASE0_FIXTURES.reviewedExceptions, 'reviewed sweep exception register');
  const bulkRecapture = readRequiredJson(root, PHASE0_FIXTURES.bulkRecapture, 'bulk recapture receipt');
  const dedupeExclusions = readRequiredJson(root, PHASE0_FIXTURES.dedupeExclusions, 'dedupe exclusion receipt');
  const sl9Recapture = readRequiredJson(root, PHASE0_FIXTURES.sl9Recapture, 'SL9 detailed recapture receipt');
  const reloadMigrationManifest = readRequiredJson(root, PHASE0_FIXTURES.reloadMigrationManifest, 'reload migration manifest');
  const reloadExceptions = loadReloadExceptionRegister(root);

  const auditSummary = validateAuditFixture(audit);
  const subsonicTreatments = validateRegister(subsonic, 'subsonic velocity register', REQUIRED_REGISTER_KINDS.subsonic);
  const exceptions = validateRegister(reviewedExceptions, 'reviewed sweep exception register', REQUIRED_REGISTER_KINDS.reviewedExceptions);
  if (subsonicTreatments.length !== 27 || subsonic.counts?.treatments !== 27) {
    throw new Error(`Subsonic treatment fixture must contain 27 rows; found ${subsonicTreatments.length}`);
  }
  if (exceptions.length !== 0 || reviewedExceptions.counts?.exceptions !== 0) {
    throw new Error(`Reviewed sweep exception fixture must be empty after the ADS-move 1.0 migration; found ${exceptions.length}`);
  }
  if (bulkRecapture.kind !== 'bulk-suspect-screenshot-recapture'
      || bulkRecapture.counts?.correctedFields !== 323
      || bulkRecapture.counts?.duplicateRecordsRemoved !== 29) {
    throw new Error('Bulk recapture receipt is missing its verified 323-field/29-duplicate characterization');
  }
  if (dedupeExclusions.kind !== 'canonical-record-dedupe-exclusions'
      || !Array.isArray(dedupeExclusions.exclusions) || dedupeExclusions.exclusions.length !== 29) {
    throw new Error('Dedupe exclusion receipt is missing its 29 source-path exclusions');
  }
  if (sl9Recapture.kind !== 'direct-detailed-stats-screenshot-replacement'
      || !Array.isArray(sl9Recapture.records) || sl9Recapture.records.length !== 12) {
    throw new Error('SL9 detailed recapture receipt must contain 12 replacement records');
  }
  for (const item of sl9Recapture.records) sourceIdentity(item.canonicalPath);
  if (reloadMigrationManifest.kind !== 'reload-phase4-migration-manifest'
      || !Array.isArray(reloadMigrationManifest.magazines)
      || reloadMigrationManifest.magazines.length !== reloadMigrationManifest.counts?.magazineEntries) {
    throw new Error('Reload migration manifest is missing its complete magazine mapping');
  }
  const manifestKeys = new Set();
  for (const item of reloadMigrationManifest.magazines) {
    if (typeof item.key !== 'string' || typeof item.weaponId !== 'string'
        || typeof item.magazineId !== 'string' || typeof item.evidence?.source !== 'string') {
      throw new Error('Reload migration manifest contains an incomplete magazine mapping');
    }
    if (manifestKeys.has(item.key)) throw new Error(`Reload migration manifest repeats ${item.key}`);
    manifestKeys.add(item.key);
    sourceIdentity(`Weapon Attachments/${item.evidence.source}`);
  }

  return {
    root,
    audit,
    balance,
    weapons,
    subsonic,
    subsonicTreatments,
    reviewedExceptions,
    exceptions,
    bulkRecapture,
    dedupeExclusions,
    sl9Recapture,
    reloadMigrationManifest,
    reloadExceptions,
    auditSummary,
  };
}

export function auditModelCoverage(audit, weapons) {
  const auditWeapons = [...new Set(rowsWithStats(audit).map(row => row.weaponName))].sort();
  const byName = new Map(weapons.map(weapon => [normalizeWeaponName(weapon.name), weapon]));
  const mappedWeapons = auditWeapons.filter(name => byName.has(normalizeWeaponName(name)));
  return {
    auditWeapons,
    mappedWeapons,
    unmappedWeapons: auditWeapons.filter(name => !mappedWeapons.includes(name)),
  };
}
