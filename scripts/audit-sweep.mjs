/**
 * Full triage sweep over the attachment screenshot audit.
 *
 * The default invocation is a pure read-only check. Use --write-report when a
 * JSON report is intentionally wanted. The sweep never opens or requires the
 * screenshot corpus; source paths are compared by their stable
 * `Weapon Attachments/...` suffix.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ROOT,
  TUBE_FED_SHOTGUNS,
  auditModelCoverage,
  classFromSourcePath,
  classSummary,
  hiddenRecoilAmountBase,
  hiddenRecoilVariationBase,
  loadPhase0Inputs,
  matchesDisplayOneDecimal,
  modalValue,
  normalizeWeaponName,
  reloadRowMatches,
  sourceIdentity,
  sourceRelativePath,
} from './audit-phase0-lib.mjs';

export const STATS = [
  'damage', 'longRangeDamage', 'muzzleVelocityMps', 'headshotMultiplier', 'collateralMultiplier',
  'spotOnFire3dM', 'spotOnFire2dM', 'recoilAmountDegrees', 'recoilVariationDegrees', 'adsTimeMs',
  'sprintRecoveryMs', 'adsMoveSpeedMultiplier', 'reloadTimeSeconds', 'rateOfFireRpm', 'magazineSize',
  'hipfire', 'precision', 'control', 'mobility',
];

const NEVER_ZERO = [
  'damage', 'longRangeDamage', 'muzzleVelocityMps', 'rateOfFireRpm', 'magazineSize',
  'reloadTimeSeconds', 'adsTimeMs', 'sprintRecoveryMs', 'adsMoveSpeedMultiplier',
];

const FIRE_MODE_ERGOS = /burst|full auto/i;
const ERGO_MULT = 1.063;
const RELOAD_SPEED_NAME = /\b(?:fast|speedloader)\b/i;

function addFinding(findings, severity, check, weapon, attachment, detail, metadata = {}) {
  findings.push({ severity, check, weapon, attachment, detail, ...metadata });
}

const MODEL_TIER_INVENTORY = 'migration/1.3.3.0/attachment-audit/model-tier-mismatch-inventory-20260801.json';
const NAME_EFFECT_INVENTORY = 'migration/1.3.3.0/attachment-audit/name-effect-consistency-inventory-20260801.json';
const NAME_EFFECT_COVERAGE_INVENTORY = 'migration/1.3.3.0/attachment-audit/name-effect-coverage-inventory-20260801.json';

function mismatchField(detail) {
  const match = /^(\w+) predicted -?\d+(?:\.\d+)?, observed -?\d+(?:\.\d+)?$/.exec(detail);
  if (!match) throw new Error(`Invalid model-tier-mismatch detail: ${detail}`);
  return match[1];
}

export function modelTierMismatchKey(finding) {
  if (finding?.check !== 'model-tier-mismatch') throw new Error('Expected a model-tier-mismatch finding');
  return `${finding.weapon}|${finding.attachment}|${mismatchField(finding.detail)}`;
}

function inventoryRecordKey(record) {
  if (!record || typeof record.weapon !== 'string' || typeof record.attachment !== 'string'
      || typeof record.field !== 'string') {
    throw new Error('Invalid model-tier mismatch inventory record');
  }
  return `${record.weapon}|${record.attachment}|${record.field}`;
}

export function loadModelTierMismatchInventory(root = DEFAULT_ROOT) {
  const inventoryPath = path.join(root, MODEL_TIER_INVENTORY);
  if (!fs.existsSync(inventoryPath)) throw new Error(`Missing model-tier mismatch inventory: ${MODEL_TIER_INVENTORY}`);
  let inventory;
  try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid model-tier mismatch inventory: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(inventory.records)) throw new Error('Model-tier mismatch inventory has no records array');
  const keys = inventory.records.map(inventoryRecordKey);
  if (new Set(keys).size !== keys.length) throw new Error('Model-tier mismatch inventory contains duplicate keys');
  return new Set(keys);
}

export function inventoryDrift(report, root = DEFAULT_ROOT) {
  const expected = loadModelTierMismatchInventory(root);
  const actualKeys = report.findings
    .filter(finding => finding.severity === 'warn' && finding.check === 'model-tier-mismatch')
    .map(modelTierMismatchKey);
  const actual = new Set(actualKeys);
  return {
    unexpected: [...actual].filter(key => !expected.has(key)).sort(),
    missing: [...expected].filter(key => !actual.has(key)).sort(),
    duplicates: actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index).sort(),
  };
}

export function isAllowedModelTierWarning(finding, inventoryKeys) {
  return finding?.severity === 'warn'
    && finding.check === 'model-tier-mismatch'
    && inventoryKeys.has(modelTierMismatchKey(finding));
}

export function nameEffectKey(finding) {
  if (finding?.check !== 'name-effect-consistency' || typeof finding.direction !== 'string') {
    throw new Error('Expected a name-effect-consistency finding');
  }
  return `${finding.weapon}|${finding.attachment}|${finding.direction}`;
}

function nameEffectInventoryRecordKey(record) {
  if (!record || typeof record.weapon !== 'string' || typeof record.attachment !== 'string'
      || typeof record.direction !== 'string') {
    throw new Error('Invalid name-effect consistency inventory record');
  }
  return `${record.weapon}|${record.attachment}|${record.direction}`;
}

export function loadNameEffectConsistencyInventory(root = DEFAULT_ROOT) {
  const inventoryPath = path.join(root, NAME_EFFECT_INVENTORY);
  if (!fs.existsSync(inventoryPath)) throw new Error(`Missing name-effect consistency inventory: ${NAME_EFFECT_INVENTORY}`);
  let inventory;
  try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid name-effect consistency inventory: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(inventory.records)) throw new Error('Name-effect consistency inventory has no records array');
  const keys = inventory.records.map(nameEffectInventoryRecordKey);
  if (new Set(keys).size !== keys.length) throw new Error('Name-effect consistency inventory contains duplicate keys');
  return new Set(keys);
}

export function nameEffectInventoryDrift(report, root = DEFAULT_ROOT) {
  const expected = loadNameEffectConsistencyInventory(root);
  const actualKeys = report.findings
    .filter(finding => finding.severity === 'warn' && finding.check === 'name-effect-consistency')
    .map(nameEffectKey);
  const actual = new Set(actualKeys);
  return {
    unexpected: [...actual].filter(key => !expected.has(key)).sort(),
    missing: [...expected].filter(key => !actual.has(key)).sort(),
    duplicates: actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index).sort(),
  };
}

export function isAllowedNameEffectWarning(finding, inventoryKeys) {
  return finding?.severity === 'warn'
    && finding.check === 'name-effect-consistency'
    && inventoryKeys.has(nameEffectKey(finding));
}

export function nameEffectCoverageKey(finding) {
  if (finding?.check !== 'name-effect-coverage' || typeof finding.direction !== 'string') {
    throw new Error('Expected a name-effect-coverage finding');
  }
  return `${finding.weapon}|${finding.attachment}|${finding.direction}`;
}

export function loadNameEffectCoverageInventory(root = DEFAULT_ROOT) {
  const inventoryPath = path.join(root, NAME_EFFECT_COVERAGE_INVENTORY);
  if (!fs.existsSync(inventoryPath)) throw new Error(`Missing name-effect coverage inventory: ${NAME_EFFECT_COVERAGE_INVENTORY}`);
  let inventory;
  try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid name-effect coverage inventory: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(inventory.records)) throw new Error('Name-effect coverage inventory has no records array');
  const keys = inventory.records.map(record => {
    if (!record || typeof record.weapon !== 'string' || typeof record.attachment !== 'string'
        || typeof record.direction !== 'string') {
      throw new Error('Invalid name-effect coverage inventory record');
    }
    return `${record.weapon}|${record.attachment}|${record.direction}`;
  });
  if (new Set(keys).size !== keys.length) throw new Error('Name-effect coverage inventory contains duplicate keys');
  return new Set(keys);
}

export function nameEffectCoverageInventoryDrift(report, root = DEFAULT_ROOT) {
  const expected = loadNameEffectCoverageInventory(root);
  const actualKeys = report.findings
    .filter(finding => finding.severity === 'warn' && finding.check === 'name-effect-coverage')
    .map(nameEffectCoverageKey);
  const actual = new Set(actualKeys);
  return {
    unexpected: [...actual].filter(key => !expected.has(key)).sort(),
    missing: [...expected].filter(key => !actual.has(key)).sort(),
    duplicates: actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index).sort(),
  };
}

export function isAllowedNameEffectCoverageWarning(finding, inventoryKeys) {
  return finding?.severity === 'warn'
    && finding.check === 'name-effect-coverage'
    && inventoryKeys.has(nameEffectCoverageKey(finding));
}

function sourceKey(value) {
  return sourceIdentity(value);
}

function exceptionKey(exception) {
  return `${sourceKey(exception.sourcePath)}|${exception.check}|${exception.field}`;
}

function treatmentDetail(treatment) {
  const velocityTreatment = treatment.velocityTreatment || {};
  if (velocityTreatment.kind === 'subsonic-tier') {
    return `subsonic tier ${velocityTreatment.subsonicVelocityTier}: floor(${treatment.baseVelocityMps} * 0.8^${velocityTreatment.subsonicVelocityTier}) = ${treatment.screenshotVelocityMps}`;
  }
  return `${velocityTreatment.kind}: direct absolute ${velocityTreatment.subsonicVelocityMps} m/s`;
}

function buildByWeapon(audit) {
  const byWeapon = new Map();
  for (const row of audit.records) {
    if (!row.stats) continue;
    const rows = byWeapon.get(row.weaponName) || [];
    rows.push(row);
    byWeapon.set(row.weaponName, rows);
  }
  return byWeapon;
}

// Capacity and the standard/Fast distinction come from attachmentSubtype, which
// is the label on the magazine's own card in the selection grid. The display
// name cannot be used: it varies per weapon and frequently omits Fast even when
// the card says FAST -- KTS100's 60Rnd Magazine, M121 A2's 50Rnd Belt Pouch and
// M357 Trait's 8Rnd Moon Clip are all Fast cards, and M357 Trait's Speedloader
// is a standard card despite a name that reads like a reload attachment.
// Shotguns are carded N Shell rather than N Rnd because they are shell-fed, but
// the two are the same capacity here; a shotgun speedloader is carded N FAST and
// is the reload-speed variant like any Fast Mag.
function magazineModelForRow(row, weaponMag) {
  const match = /^(\d+)\s+(Rnd|Shell|Fast)$/i.exec(String(row.attachmentSubtype ?? '').trim());
  if (!match) return null;
  const capacity = Number(match[1]);
  const fast = /^fast$/i.test(match[2]);
  const candidates = Object.entries(weaponMag?.mags ?? {})
    .filter(([, magazine]) => magazine.mag === capacity && /fast/i.test(magazine.name ?? '') === fast);
  return candidates.length === 1 ? candidates[0] : null;
}

function tierValue(table, rawIndex) {
  if (!Array.isArray(table) || !table.length || !Number.isInteger(rawIndex)) return null;
  const index = Math.max(0, Math.min(table.length - 1, rawIndex));
  return table[index];
}

function predictMagazineTiers({ row, weaponMag, weaponAtts, attachments, balance }) {
  const magazineEntry = magazineModelForRow(row, weaponMag);
  if (!magazineEntry) return null;
  const [, magazine] = magazineEntry;
  const defaultBarrel = attachments.BARRELS?.find(barrel => barrel.id === (weaponAtts?.barrelDef ?? 'none'));
  if (!defaultBarrel) return null;
  const sprintTable = weaponMag.sprintRecoveryTierTable === 'sidearm'
    ? (balance.SIDEARM_SPRINT_REC_TIERS?.length ? balance.SIDEARM_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS)
    : (balance.PRIMARY_SPRINT_REC_TIERS?.length ? balance.PRIMARY_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS);
  return {
    adsTimeMs: tierValue(balance.ADS_SPD_TIERS,
      weaponMag.defAds + (magazine.adsTimeTierShift ?? 0) - (defaultBarrel.adsTimeTierMod ?? 0)),
    sprintRecoveryMs: tierValue(sprintTable,
      weaponMag.defSpr + (magazine.sprintRecoveryTierShift ?? 0)),
    adsMoveSpeedMultiplier: tierValue(balance.ADS_MOVE_TIERS,
      weaponMag.defAms + (magazine.adsMoveSpeedTierShift ?? 0)),
  };
}

function runTierChecks({ findings, byWeapon, balance, attachments, byName, consumeReviewedException, estimatedWeaponNames }) {
  const tables = {
    adsTimeMs: { table: balance.ADS_SPD_TIERS, tolerance: 1 },
    adsMoveSpeedMultiplier: { table: balance.ADS_MOVE_TIERS, tolerance: 0.005 },
  };
  for (const [weaponName, rows] of byWeapon) {
    for (const [field, { table, tolerance }] of Object.entries(tables)) {
      if (!Array.isArray(table)) throw new Error(`Missing tier table for ${field}`);
      for (const row of rows) {
        const value = row.stats[field];
        if (value == null || value === 0) continue;
        if (!table.some(candidate => Math.abs(candidate - value) <= tolerance)) {
          if (consumeReviewedException(row, 'off-tier-table', field, value)) continue;
          addFinding(findings, 'error', 'off-tier-table', weaponName, `${row.attachmentType}/${row.attachmentName}`,
            `${field} = ${value} is not a member of [${table.join(', ')}]`);
        }
      }
    }

    const weapon = byName.get(normalizeWeaponName(weaponName));
    const weaponMag = attachments.WEAPON_MAG?.[weapon?.id];
    if (weaponMag) {
      for (const row of rows) {
        const predicted = row.attachmentType === 'Magazine'
          ? predictMagazineTiers({
            row,
            weaponMag,
            weaponAtts: attachments.WEAPON_ATTS?.[weapon.id],
            attachments,
            balance,
          })
          : null;
        if (!predicted) continue;
        for (const [field, tolerance] of Object.entries({
          adsTimeMs: 1,
          sprintRecoveryMs: 1,
          adsMoveSpeedMultiplier: 0.005,
        })) {
          const value = row.stats[field];
          if (value == null || value === 0 || predicted[field] == null) continue;
          if (Math.abs(predicted[field] - value) > tolerance
              && !estimatedWeaponNames.has(normalizeWeaponName(weaponName))) {
            // §7 says the screenshot settles a model-versus-reading disagreement.
            // Adjudication has found defects on both sides, so report this as a
            // warning rather than accusing either the model or the corpus.
            addFinding(findings, 'warn', 'model-tier-mismatch', weaponName,
              `${row.attachmentType}/${row.attachmentName}`,
              `${field} predicted ${predicted[field]}, observed ${value}`);
          }
        }
      }
    }
  }

  const sprintTiers = [...new Set([
    ...(balance.PRIMARY_SPRINT_REC_TIERS || []),
    ...(balance.SIDEARM_SPRINT_REC_TIERS || []),
  ])];
  if (!sprintTiers.length) throw new Error('Missing sprint-recovery tier tables');
  for (const [weaponName, rows] of byWeapon) {
    for (const row of rows) {
      const value = row.stats.sprintRecoveryMs;
      if (value == null || value === 0) continue;
      if (!sprintTiers.some(candidate => Math.abs(candidate - value) <= 1)) {
        addFinding(findings, 'error', 'off-tier-table', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `sprintRecoveryMs = ${value} is not a member of either sprint-recovery table`);
      }
    }
  }
}

function runNameEffectChecks({ findings, byWeapon, byName, attachments, reloadExceptions, reloadMigrationManifest, estimatedWeaponNames }) {
  // §7 Check 4 treats both Fast and Speedloader as names that imply reload
  // speed. A mismatch is a screenshot-read request, including when the
  // scalar reload tier is intentionally zero for a tube-fed option.
  const manifestBySource = new Map(reloadMigrationManifest.magazines.map(item => [
    sourceIdentity(`Weapon Attachments/${item.evidence.source}`), item,
  ]));

  for (const [weaponName, rows] of byWeapon) {
    if (!byName.has(normalizeWeaponName(weaponName))) continue;
    if (estimatedWeaponNames.has(normalizeWeaponName(weaponName))) continue;
    for (const row of rows) {
      if (row.attachmentType !== 'Magazine') continue;
      const manifest = manifestBySource.get(sourceIdentity(row.source.currentPath));
      if (!manifest) {
        addFinding(findings, 'warn', 'name-effect-coverage', weaponName,
          `${row.attachmentType}/${row.attachmentName}`,
          'corpus screenshot exists, but no corresponding live WEAPON_MAG or Phase 4 migration-manifest entry exists', {
            direction: 'unmapped-model-attachment',
            field: 'reloadSpeedTier',
            magazineId: null,
            modelMagazineName: null,
            reloadSpeedTier: null,
            nameImpliesReloadSpeed: RELOAD_SPEED_NAME.test(row.attachmentName ?? ''),
            source: sourceRelativePath(row.source.currentPath),
            screenshotException: null,
            coverageContext: {
              kind: 'screenshot-present-no-live-catalog-entry',
              reason: 'The PNG and provisional corpus row exist; the live catalog has no regular 45-round SOR-556 MK2 magazine to map.',
            },
          });
        continue;
      }
      const magazine = attachments.WEAPON_MAG?.[manifest.weaponId]?.mags?.[manifest.magazineId];
      if (!magazine) {
        addFinding(findings, 'warn', 'name-effect-coverage', weaponName,
          `${row.attachmentType}/${row.attachmentName}`,
          `migration manifest maps to missing live magazine ${manifest.weaponId}/${manifest.magazineId}`, {
            direction: 'unmapped-model-attachment',
            field: 'reloadSpeedTier',
            magazineId: manifest.magazineId,
            modelMagazineName: null,
            reloadSpeedTier: null,
            nameImpliesReloadSpeed: RELOAD_SPEED_NAME.test(row.attachmentName ?? ''),
            source: sourceRelativePath(row.source.currentPath),
            screenshotException: null,
            coverageContext: {
              kind: 'manifest-points-to-missing-live-catalog-entry',
              reason: `The Phase 4 manifest points to ${manifest.weaponId}/${manifest.magazineId}, but that live catalog entry is absent.`,
            },
          });
        continue;
      }
      const nameImpliesReloadSpeed = RELOAD_SPEED_NAME.test(row.attachmentName ?? '');
      const reloadSpeedTier = Number.isInteger(magazine.reloadSpeedTier) ? magazine.reloadSpeedTier : 0;
      const hasReloadSpeedEffect = reloadSpeedTier > 0;
      if (nameImpliesReloadSpeed === hasReloadSpeedEffect) continue;

      const direction = nameImpliesReloadSpeed
        ? 'named-without-reload-speed-tier'
        : 'reload-speed-tier-without-name';
      const registerEntry = reloadExceptions.register.screenshotExceptions?.[manifest.weaponId]?.[manifest.magazineId] ?? null;
      const detail = nameImpliesReloadSpeed
        ? `name implies reload speed but reloadSpeedTier=${reloadSpeedTier}`
        : `reloadSpeedTier=${reloadSpeedTier} implies reload speed but name does not`;
      const registerDetail = registerEntry
        ? `; screenshot exception register records ${registerEntry.observedReloadMs} ms: ${registerEntry.reason}`
        : '';
      const structuralContext = nameImpliesReloadSpeed && !hasReloadSpeedEffect
        ? (TUBE_FED_SHOTGUNS.has(weaponName)
          ? {
            kind: 'tube-fed-scalar-null',
            contract: 'migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md §6 Phase 6 — reload cutover and cleanup',
            reason: 'Tube-fed shotgun reload remains scalar-null; reloadSpeedTier=0 is a structural marker, not an applicable scalar ladder rung.',
          }
          : ['M44', 'M357 Trait'].includes(weaponName)
            ? {
              kind: 'scalar-revolver',
              contract: 'migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md §6 Phase 6 — reload cutover and cleanup',
              reason: 'Revolver reload is scalar and tier 0 is applicable; this is not the tube-fed scalar-null exemption.',
            }
            : null)
        : null;
      addFinding(findings, 'warn', 'name-effect-consistency', weaponName,
        `${row.attachmentType}/${row.attachmentName}`,
        `${detail}${registerDetail}`, {
          direction,
          field: 'reloadSpeedTier',
          magazineId: manifest.magazineId,
          modelMagazineName: magazine.name,
          reloadSpeedTier,
          nameImpliesReloadSpeed,
          source: sourceRelativePath(row.source.currentPath),
          screenshotException: registerEntry,
          structuralContext,
        });
    }
  }
}

export function runSweep({ root = DEFAULT_ROOT } = {}) {
  const inputs = loadPhase0Inputs(root);
  const {
    audit, balance, weapons, subsonicTreatments, exceptions: reviewedExceptions,
    reloadExceptions, reloadMigrationManifest,
  } = inputs;
  const attachments = JSON.parse(fs.readFileSync(path.join(root, 'data', 'attachments.json'), 'utf8'));
  const animationOverrides = reloadExceptions.animationOverrides;
  const screenshotExceptions = reloadExceptions.screenshotExceptions;
  const byWeapon = buildByWeapon(audit);
  const findings = [];
  const byName = new Map(weapons.map(weapon => [normalizeWeaponName(weapon.name), weapon]));
  const estimatedWeaponNames = new Set(weapons
    .filter(weapon => weapon?.estimated === true)
    .map(weapon => normalizeWeaponName(weapon.name)));
  const subsonicBySource = new Map(subsonicTreatments.map(treatment => [sourceKey(treatment.sourcePath), treatment]));
  const exceptionByKey = new Map(reviewedExceptions.map(exception => [exceptionKey(exception), exception]));
  const seenSubsonicTreatments = new Set();
  const seenReviewedExceptions = new Set();
  const consumeReviewedException = (row, check, field, value) => {
    const exception = exceptionByKey.get(`${sourceKey(row.source.currentPath)}|${check}|${field}`);
    if (!exception) return false;
    seenReviewedExceptions.add(exceptionKey(exception));
    const attachment = `${row.attachmentType}/${row.attachmentName}`;
    if (value === exception.expectedValue) {
      addFinding(findings, 'info', 'reviewed-exception', row.weaponName, attachment,
        `${check}/${field} = ${value} is retained as a direct screenshot exception: ${exception.rationale}`);
    } else {
      addFinding(findings, 'error', 'reviewed-exception-mismatch', row.weaponName, attachment,
        `${check}/${field} reads ${value}; the direct screenshot register requires ${exception.expectedValue}`);
    }
    return true;
  };

  // Check 0: explicit impossible-zero reads. Nulls are handled separately by
  // the audit schema; a populated sentinel zero is still an error.
  for (const [weaponName, rows] of byWeapon) {
    for (const row of rows) {
      for (const field of NEVER_ZERO) {
        if (row.stats[field] === 0) {
          addFinding(findings, 'error', 'zero-read', weaponName, `${row.attachmentType}/${row.attachmentName}`,
            `${field} reads 0, which is not a possible in-game value`);
        }
      }
    }
  }

  // Check 1: weapon-level invariants, with fire-mode ergonomics explicitly
  // retained as an informational characterization result.
  for (const [weaponName, rows] of byWeapon) {
    const rateOfFireBase = modalValue(rows, 'rateOfFireRpm');
    if (rateOfFireBase != null) {
      for (const row of rows) {
        const value = row.stats.rateOfFireRpm;
        if (value == null || value === rateOfFireBase || value === 0) continue;
        if (row.attachmentType === 'Ergonomics' && FIRE_MODE_ERGOS.test(row.attachmentName || '')) {
          addFinding(findings, 'info', 'fire-mode-ergo', weaponName, `${row.attachmentType}/${row.attachmentName}`,
            `rateOfFireRpm ${rateOfFireBase} -> ${value} (expected: this ergonomic changes fire mode)`);
          continue;
        }
        addFinding(findings, 'error', 'weapon-invariant', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `rateOfFireRpm reads ${value}, every other record reads ${rateOfFireBase}`);
      }
    }
    const isShotgun = rows.some(row => classFromSourcePath(row.source.currentPath) === 'shotgun');
    if (isShotgun) continue;
    const damageBase = modalValue(rows, 'damage');
    if (damageBase == null) continue;
    for (const row of rows) {
      const value = row.stats.damage;
      if (value != null && value !== 0 && value !== damageBase && row.attachmentType !== 'Ammo') {
        addFinding(findings, 'error', 'weapon-invariant', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `damage reads ${value}, weapon base is ${damageBase} (a ${row.attachmentType} cannot change damage)`);
      }
    }
  }

  // Check 2: normal velocity uses the global 0.8 ladder; every subsonic row
  // must instead have an exact, path-scoped treatment receipt.
  for (const [weaponName, rows] of byWeapon) {
    const velocityBase = modalValue(rows, 'muzzleVelocityMps');
    if (velocityBase == null) continue;
    for (const row of rows) {
      const value = row.stats.muzzleVelocityMps;
      if (value == null || value === 0) continue;
      const treatment = subsonicBySource.get(sourceKey(row.source.currentPath));
      if (treatment) {
        seenSubsonicTreatments.add(sourceKey(treatment.sourcePath));
        if (treatment.weaponName !== weaponName
            || treatment.attachmentName !== row.attachmentName
            || treatment.baseVelocityMps !== velocityBase
            || treatment.screenshotVelocityMps !== value) {
          addFinding(findings, 'error', 'subsonic-treatment-mismatch', weaponName,
            `${row.attachmentType}/${row.attachmentName}`,
            `current record ${velocityBase} -> ${value} no longer matches its direct screenshot treatment register`);
        } else {
          addFinding(findings, 'info', 'subsonic-treatment', weaponName,
            `${row.attachmentType}/${row.attachmentName}`,
            `${velocityBase} -> ${value}; ${treatmentDetail(treatment)}`);
        }
        continue;
      }
      if (/subsonic/i.test(row.attachmentName || '')) {
        addFinding(findings, 'error', 'unregistered-subsonic-treatment', weaponName,
          `${row.attachmentType}/${row.attachmentName}`,
          `${velocityBase} -> ${value} is a subsonic screenshot without a path-scoped treatment register entry`);
        continue;
      }
      let hit = null;
      for (let tier = -6; tier <= 6; tier += 1) {
        const predicted = velocityBase * (0.8 ** tier);
        if (Math.floor(predicted) === value) {
          hit = tier;
          break;
        }
      }
      if (hit == null) {
        const steps = Math.log(value / velocityBase) / Math.log(0.8);
        addFinding(findings, 'error', 'velocity-ladder', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `${velocityBase} -> ${value} is ${steps.toFixed(2)} steps of x0.8; nearest integer step predicts ${Math.round(velocityBase * (0.8 ** Math.round(steps)))}`);
      }
    }
  }

  // Check 3: recoil amount is calculated from each weapon's hidden-precision
  // top-level recoilV, then mapped to the pinned float32 one-decimal display.
  for (const [weaponName, rows] of byWeapon) {
    const weapon = byName.get(normalizeWeaponName(weaponName));
    const multiplier = weapon && balance.RECOIL_MULT?.[weapon.id];
    if (!weapon || !multiplier || estimatedWeaponNames.has(normalizeWeaponName(weaponName))) continue;
    const base = hiddenRecoilAmountBase(weapon);
    for (const row of rows) {
      const value = row.stats.recoilAmountDegrees;
      if (value == null || value === 0) continue;
      let hit = null;
      for (let tier = -8; tier <= 8; tier += 1) {
        if (matchesDisplayOneDecimal(base * (multiplier ** tier), value)) {
          hit = tier;
          break;
        }
      }
      if (hit == null) {
        if (consumeReviewedException(row, 'recoil-ladder', 'recoilAmountDegrees', value)) continue;
        addFinding(findings, 'error', 'recoil-ladder', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `${base} -> ${value} is not any integer tier of x${multiplier} after the pinned one-decimal display rounding (range checked +/-8)`);
      }
    }
  }

  // Check 4: recoil variation uses the effective hidden dirVar base, including
  // any baked source exponent, and the same display rounding contract.
  for (const [weaponName, rows] of byWeapon) {
    const weapon = byName.get(normalizeWeaponName(weaponName));
    const multiplier = weapon?.recoil?.ads?.dirVarMult;
    if (!weapon || !multiplier || estimatedWeaponNames.has(normalizeWeaponName(weaponName))) continue;
    const base = hiddenRecoilVariationBase(weapon);
    for (const row of rows) {
      const value = row.stats.recoilVariationDegrees;
      if (value == null || value === 0) continue;
      let hit = null;
      for (let tier = -8; tier <= 8; tier += 1) {
        if (matchesDisplayOneDecimal(base * (multiplier ** tier), value)) {
          hit = tier;
          break;
        }
      }
      if (hit == null) {
        addFinding(findings, 'warn', 'recoilvar-ladder', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `${base} -> ${value} is not any integer tier of x${multiplier} after the pinned one-decimal display rounding`);
      }
    }
  }

  runTierChecks({ findings, byWeapon, balance, attachments, byName, consumeReviewedException, estimatedWeaponNames });
  runNameEffectChecks({ findings, byWeapon, byName, attachments, reloadExceptions, reloadMigrationManifest, estimatedWeaponNames });

  // Check 6: scalar reloads include every weapon except the three tube-fed
  // shotguns.  18.5KS-K therefore remains in this loop.
  const animationOverrideKeys = new Set(animationOverrides.keys());
  for (const [weaponName, rows] of byWeapon) {
    if (TUBE_FED_SHOTGUNS.has(weaponName)) continue;
    const base = modalValue(rows, 'reloadTimeSeconds');
    if (base == null) continue;
    for (const row of rows) {
      const value = row.stats.reloadTimeSeconds;
      if (value == null || value === 0) continue;
      const tag = `${row.attachmentType}/${row.attachmentName}`;
      const overrideKey = `${weaponName}/${row.attachmentName}`;
      if (!reloadRowMatches(row, base, {
        reloadSpeedLadder: balance.RELOAD_SPEED_LADDER,
        animationOverrides,
      })) {
        addFinding(findings, 'error', 'reload-model', weaponName, tag,
          `${value} matches no scalar reload combination for base ${base}; expected base / ${balance.RELOAD_SPEED_LADDER}^k / ${ERGO_MULT} or a registered animation override`);
        continue;
      }
      if (animationOverrideKeys.has(overrideKey)) continue;
      const screenshotException = screenshotExceptions.get(overrideKey);
      if (screenshotException && Math.abs(value - screenshotException.observed) <= 0.002) continue;
      const isMagCatch = /mag catch/i.test(row.attachmentName || '');
      if (isMagCatch && Math.abs(value - base) <= 0.002) {
        addFinding(findings, 'error', 'reload-model', weaponName, tag,
          `Mag Catch reads exactly the weapon base ${base} — expected ${(base / ERGO_MULT).toFixed(3)}`);
      } else if (/fast/i.test(row.attachmentName || '') && Math.abs(value - base) <= 0.002) {
        addFinding(findings, 'error', 'reload-model', weaponName, tag,
          `Fast mag reads exactly the weapon base ${base} — expected ${(base / balance.RELOAD_SPEED_LADDER).toFixed(3)}`);
      }
    }
  }

  // Check 7: magazine name capacity versus the displayed magazine size.
  for (const [weaponName, rows] of byWeapon) {
    for (const row of rows) {
      if (row.attachmentType !== 'Magazine') continue;
      const match = /(\d+)\s*(?:rnd|shell)/i.exec(row.attachmentName || '');
      if (!match) continue;
      const named = Number(match[1]);
      const actual = row.stats.magazineSize;
      const name = row.attachmentName || '';
      // Tube and speedloader labels exclude chambered rounds. Dual tubes carry
      // two named tubes and two chambered rounds in the displayed total.
      const includesChamberedRound = /(?:speedloader|shell)/i.test(name) && actual === named + 1;
      const includesTwoChamberedRounds = /dual tubes/i.test(name) && actual === (named * 2) + 2;
      if (actual != null && named !== actual && !includesChamberedRound && !includesTwoChamberedRounds) {
        addFinding(findings, 'error', 'name-vs-capacity', weaponName, `Magazine/${row.attachmentName}`,
          `name says ${named}, magazineSize reads ${actual}`);
      }
    }
  }

  // Check 8: capacity is not allowed to leak into other slots.
  for (const [weaponName, rows] of byWeapon) {
    const base = modalValue(rows, 'magazineSize');
    if (base == null) continue;
    for (const row of rows) {
      if (row.attachmentType === 'Magazine') continue;
      const value = row.stats.magazineSize;
      if (value != null && value !== base) {
        addFinding(findings, 'error', 'cross-slot-leak', weaponName, `${row.attachmentType}/${row.attachmentName}`,
          `magazineSize reads ${value} but weapon base is ${base}; a ${row.attachmentType} cannot change capacity`);
      }
    }
  }

  // Check 9: duplicate identities must have identical stat blocks.
  for (const [weaponName, rows] of byWeapon) {
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.attachmentType}/${row.attachmentName}`;
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    }
    for (const [attachment, group] of groups) {
      if (group.length < 2) continue;
      const signatures = new Set(group.map(row => JSON.stringify(STATS.map(field => row.stats[field] ?? null))));
      if (signatures.size > 1) {
        addFinding(findings, 'error', 'duplicate-conflict', weaponName, attachment,
          `${group.length} records share this name with ${signatures.size} different stat blocks`);
      } else {
        addFinding(findings, 'info', 'duplicate-benign', weaponName, attachment,
          `${group.length} identical records (harmless dedupe candidate)`);
      }
    }
  }

  // Check 10: ambiguous modal baselines remain warnings, not silent guesses.
  for (const [weaponName, rows] of byWeapon) {
    const values = new Map();
    for (const field of ['reloadTimeSeconds', 'muzzleVelocityMps', 'recoilAmountDegrees', 'magazineSize']) {
      for (const row of rows) {
        const value = row.stats[field];
        if (value != null) values.set(`${field}|${value}`, (values.get(`${field}|${value}`) || 0) + 1);
      }
      const entries = [...values.entries()].filter(([key]) => key.startsWith(`${field}|`)).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      if (entries.length && total >= 8 && entries[0][1] / total < 0.4) {
        const value = Number(entries[0][0].split('|')[1]);
        addFinding(findings, 'warn', 'ambiguous-baseline', weaponName, '-',
          `${field}: modal value ${value} holds only ${Math.round(entries[0][1] / total * 100)}% of ${total} records across ${entries.length} distinct values — baseline cannot be inferred confidently`);
      }
    }
  }

  for (const treatment of subsonicTreatments) {
    if (!seenSubsonicTreatments.has(sourceKey(treatment.sourcePath))) {
      addFinding(findings, 'error', 'stale-subsonic-treatment', treatment.weaponName,
        `Ammo/${treatment.attachmentName}`,
        `registered source was not encountered by the velocity sweep: ${sourceKey(treatment.sourcePath)}`);
    }
  }
  for (const exception of reviewedExceptions) {
    if (!seenReviewedExceptions.has(exceptionKey(exception))) {
      addFinding(findings, 'error', 'stale-reviewed-exception', exception.weaponName,
        `${exception.attachmentType}/${exception.attachmentName}`,
        `registered ${exception.check}/${exception.field} exception was not encountered by its sweep check`);
    }
  }

  const severityOrder = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    || a.check.localeCompare(b.check) || a.weapon.localeCompare(b.weapon));
  const counts = {};
  const severityCounts = { error: 0, warn: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.check] = (counts[finding.check] || 0) + 1;
    severityCounts[finding.severity] = (severityCounts[finding.severity] || 0) + 1;
  }

  const classes = classSummary(audit);
  const coverage = auditModelCoverage(audit, weapons);
  return {
    kind: 'attachment-audit-sweep',
    generatedAt: new Date().toISOString(),
    auditGeneratedAt: audit.generatedAt,
    auditRecordCount: audit.recordCount,
    statRowCount: inputs.auditSummary.stats.length,
    weaponCount: inputs.auditSummary.weaponNames.length,
    counts,
    severityCounts,
    coverage: {
      auditWeaponCount: coverage.auditWeapons.length,
      modelMappedWeaponCount: coverage.mappedWeapons.length,
      modelUnmappedWeapons: coverage.unmappedWeapons,
    },
    classes,
    findings,
  };
}

function parseArgs(args) {
  let writeReport = false;
  let reportPath = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--write-report') {
      writeReport = true;
    } else if (argument === '--report') {
      reportPath = args[index + 1];
      if (!reportPath || reportPath.startsWith('--')) throw new Error('--report requires a path');
      index += 1;
      writeReport = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { writeReport, reportPath };
}

function printReport(report) {
  console.log('records with stats:', report.statRowCount, 'across', report.weaponCount, 'weapons');
  console.log('model metadata coverage:', `${report.coverage.modelMappedWeaponCount}/${report.coverage.auditWeaponCount}`,
    report.coverage.modelUnmappedWeapons.length ? `(unmapped: ${report.coverage.modelUnmappedWeapons.join(', ')})` : '(complete)');
  console.log('shotgun category:', report.classes.shotgun?.statRows ?? 0, 'stat rows across', report.classes.shotgun?.weapons ?? 0, 'weapons');
  console.log('');
  console.log('findings by check:');
  for (const [check, count] of Object.entries(report.counts).sort((a, b) => b[1] - a[1])) {
    console.log('  ', String(count).padStart(4), check);
  }
  console.log('severity:', report.severityCounts);
  for (const finding of report.findings) {
    if (finding.severity === 'info') continue;
    console.log(`[${finding.severity}] ${finding.check} | ${finding.weapon} | ${finding.attachment}\n        ${finding.detail}`);
  }
}

export function main(args = process.argv.slice(2)) {
  const { writeReport, reportPath } = parseArgs(args);
  const report = runSweep();
  printReport(report);
  if (writeReport) {
    const output = reportPath
      ? (path.isAbsolute(reportPath) ? reportPath : path.resolve(DEFAULT_ROOT, reportPath))
      : path.join(DEFAULT_ROOT, 'migration/1.3.3.0/attachment-audit/sweep-findings.json');
    fs.writeFileSync(output, `${JSON.stringify(report, null, 1)}\n`);
    console.log('\nwrote', output);
  }
  const inventoryKeys = loadModelTierMismatchInventory();
  const nameEffectInventoryKeys = loadNameEffectConsistencyInventory();
  const nameEffectCoverageInventoryKeys = loadNameEffectCoverageInventory();
  const drift = inventoryDrift(report);
  const nameEffectDrift = nameEffectInventoryDrift(report);
  const nameEffectCoverageDrift = nameEffectCoverageInventoryDrift(report);
  if (drift.unexpected.length || drift.missing.length || drift.duplicates.length) {
    console.error('model-tier-mismatch inventory drift:', JSON.stringify(drift));
  }
  if (nameEffectDrift.unexpected.length || nameEffectDrift.missing.length || nameEffectDrift.duplicates.length) {
    console.error('name-effect consistency inventory drift:', JSON.stringify(nameEffectDrift));
  }
  if (nameEffectCoverageDrift.unexpected.length || nameEffectCoverageDrift.missing.length || nameEffectCoverageDrift.duplicates.length) {
    console.error('name-effect coverage inventory drift:', JSON.stringify(nameEffectCoverageDrift));
  }
  const blocking = report.findings.filter(finding => finding.severity === 'error'
    || (finding.severity === 'warn'
      && !isAllowedModelTierWarning(finding, inventoryKeys)
      && !isAllowedNameEffectWarning(finding, nameEffectInventoryKeys)
      && !isAllowedNameEffectCoverageWarning(finding, nameEffectCoverageInventoryKeys)));
  if (blocking.length
      || drift.unexpected.length || drift.missing.length || drift.duplicates.length
      || nameEffectDrift.unexpected.length || nameEffectDrift.missing.length || nameEffectDrift.duplicates.length
      || nameEffectCoverageDrift.unexpected.length || nameEffectCoverageDrift.missing.length || nameEffectCoverageDrift.duplicates.length) process.exitCode = 1;
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  try {
    main();
  } catch (error) {
    console.error(`audit sweep failed: ${error.message}`);
    process.exitCode = 1;
  }
}
