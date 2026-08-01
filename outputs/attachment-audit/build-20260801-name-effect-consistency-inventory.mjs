import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ROOT } from '../../scripts/audit-phase0-lib.mjs';
import { runSweep } from '../../scripts/audit-sweep.mjs';

export const NAME_EFFECT_INVENTORY_PATH = 'outputs/attachment-audit/name-effect-consistency-inventory-20260801.json';
export const NAME_EFFECT_COVERAGE_INVENTORY_PATH = 'outputs/attachment-audit/name-effect-coverage-inventory-20260801.json';

function buildInventory(report, check, kind) {
  const records = report.findings
    .filter(finding => finding.check === check)
    .map(finding => ({
      weapon: finding.weapon,
      attachment: finding.attachment,
      direction: finding.direction,
      field: finding.field,
      modelMagazineId: finding.magazineId,
      modelMagazineName: finding.modelMagazineName,
      reloadSpeedTier: finding.reloadSpeedTier,
      nameImpliesReloadSpeed: finding.nameImpliesReloadSpeed,
      source: finding.source,
      screenshotException: finding.screenshotException,
      structuralContext: finding.structuralContext ?? null,
      coverageContext: finding.coverageContext ?? null,
    }))
    .sort((a, b) => a.weapon.localeCompare(b.weapon)
      || a.attachment.localeCompare(b.attachment)
      || a.direction.localeCompare(b.direction));

  const directionCounts = {};
  for (const record of records) directionCounts[record.direction] = (directionCounts[record.direction] || 0) + 1;
  return {
    kind,
    schemaVersion: 1,
    source: 'scripts/audit-sweep.mjs',
    field: 'reloadSpeedTier',
    nameImplicationPattern: '\\b(?:fast|speedloader)\\b',
    counts: {
      total: records.length,
      byDirection: directionCounts,
    },
    records,
  };
}

export function deriveNameEffectConsistencyInventory(root = DEFAULT_ROOT) {
  return buildInventory(runSweep({ root }), 'name-effect-consistency', 'name-effect-consistency-inventory');
}

export function deriveNameEffectCoverageInventory(root = DEFAULT_ROOT) {
  return buildInventory(runSweep({ root }), 'name-effect-coverage', 'name-effect-coverage-inventory');
}

export function writeNameEffectConsistencyInventory(root = DEFAULT_ROOT) {
  const report = runSweep({ root });
  const consistency = buildInventory(report, 'name-effect-consistency', 'name-effect-consistency-inventory');
  const coverage = buildInventory(report, 'name-effect-coverage', 'name-effect-coverage-inventory');
  fs.writeFileSync(path.join(root, NAME_EFFECT_INVENTORY_PATH), `${JSON.stringify(consistency, null, 2)}\n`);
  fs.writeFileSync(path.join(root, NAME_EFFECT_COVERAGE_INVENTORY_PATH), `${JSON.stringify(coverage, null, 2)}\n`);
  return { consistency, coverage };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  const inventories = writeNameEffectConsistencyInventory();
  console.log(`wrote ${NAME_EFFECT_INVENTORY_PATH} (${inventories.consistency.records.length} records)`);
  console.log(`wrote ${NAME_EFFECT_COVERAGE_INVENTORY_PATH} (${inventories.coverage.records.length} records)`);
}
