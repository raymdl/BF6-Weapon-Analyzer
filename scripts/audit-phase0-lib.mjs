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
});

export const TUBE_FED_SHOTGUNS = new Set(['DB-12', 'M1014', 'M87A1']);

export const RELOAD_ANIMATION_OVERRIDES = new Map([
  ['M240L/75Rnd Belt Box', 7.1],
  ['M240L/100Rnd Belt Box', 7.1],
  ['M60/50Rnd Loose Belt', 4.534],
  ['PP-19/53Rnd Magazine', 2.667],
  ['RPK-74M/95Rnd Drum', 2.95],
]);

// Direct screenshot exception: the PP-19 20Rnd Fast Mag is named fast but
// retains the base reload in game. Keep this separate from animation overrides
// so the sweep does not convert a reviewed source reading back to the model's
// 1.13 prediction.
export const RELOAD_SCREENSHOT_EXCEPTIONS = new Map([
  ['PP-19/20Rnd Fast Mag', { observed: 2.467, reason: 'direct screenshot reads base reload with no reload arrow' }],
]);

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

export function reloadCandidates(baseValue) {
  const fast = 1.13;
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

export function reloadOverrideFor(weaponName, attachmentName) {
  return RELOAD_ANIMATION_OVERRIDES.get(`${weaponName}/${attachmentName}`);
}

export function reloadRowMatches(row, baseValue) {
  const observed = row.stats?.reloadTimeSeconds;
  if (observed == null || observed === 0) return true;
  const override = reloadOverrideFor(row.weaponName, row.attachmentName);
  if (override != null) return Math.abs(observed - override) <= 0.0005;
  return reloadCandidates(baseValue).some(candidate => Math.abs(Number(candidate.toFixed(3)) - observed) <= 0.005);
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
