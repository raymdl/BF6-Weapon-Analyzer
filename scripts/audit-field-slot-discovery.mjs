// Reports stat changes that occur outside the slots currently modeled as able
// to affect that field. A finding is discovery evidence, not proof of a bad
// transcription: every finding needs a screenshot-backed disposition.
//
// The default invocation is read-only. Use --write-report when the generated
// JSON report should be written to the ignored audit-output directory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ROOT,
  CAPTURE_CORPUS_FIXTURES,
  loadCaptureCorpus,
  rowsWithStats,
  sourceIdentity,
  sourceRelativePath,
} from './capture-corpus-lib.mjs';

const FIELD_RULES = {
  longRangeDamage: { expectedSlotTypes: ['Ammo'] },
  headshotMultiplier: { expectedSlotTypes: ['Ammo'] },
  collateralMultiplier: { expectedSlotTypes: ['Ammo'] },
  spotOnFire2dM: { expectedSlotTypes: ['Ammo', 'Muzzle', 'Barrel'] },
  recoilVariationDegrees: { expectedSlotTypes: ['Muzzle', 'Grip', 'Ergonomics'] },
  sprintRecoveryMs: { expectedSlotTypes: ['Magazine', 'Grip', 'Ergonomics', 'Barrel'] },
  adsMoveSpeedMultiplier: { expectedSlotTypes: ['Magazine', 'Grip', 'Grip/Laser/Light', 'Ammo'] },
};

function modal(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = row.stats?.[field];
    if (value == null) continue;
    const entry = counts.get(value) || { value, count: 0 };
    entry.count += 1;
    counts.set(value, entry);
  }
  const values = [...counts.values()].sort((a, b) => b.count - a.count || Number(a.value) - Number(b.value));
  if (!values.length) return null;
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return { ...values[0], total, share: values[0].count / total, distinct: values.length };
}

function reviewedSlotContexts(receipt) {
  const contexts = new Map();
  for (const item of receipt.records) {
    for (const [field, value] of [['collateralMultiplier', 0], ['sprintRecoveryMs', 167]]) {
      if (item.savedStats?.[field] !== value) {
        throw new Error(`SL9 detailed-recapture receipt has an unexpected ${field} value for ${item.canonicalPath}`);
      }
      contexts.set(`${field}|${sourceIdentity(item.canonicalPath)}`, {
        status: 'screenshot-confirmed-slot-context-value',
        disposition: 'Detailed SL9 Laser/Light capture, including None, displays this value. Retain it path-by-path; do not infer a Laser/Light modifier.',
        receipt: CAPTURE_CORPUS_FIXTURES.sl9Recapture,
      });
    }
  }
  return contexts;
}

export function runFieldSlotDiscovery({ root = DEFAULT_ROOT } = {}) {
  const inputs = loadCaptureCorpus(root);
  const audit = inputs.audit;
  const contexts = reviewedSlotContexts(inputs.sl9Recapture);
  const byWeapon = new Map();
  for (const row of rowsWithStats(audit)) {
    const rows = byWeapon.get(row.weaponName) || [];
    rows.push(row);
    byWeapon.set(row.weaponName, rows);
  }

  const findings = [];
  for (const [weaponName, rows] of [...byWeapon.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const [field, rule] of Object.entries(FIELD_RULES)) {
      const baseline = modal(rows, field);
      // A zero modal baseline is itself a capture failure family, not a useful
      // anchor for slot discovery. Comparing healthy rows with it would flood
      // this report with false relationships.
      if (!baseline || baseline.value === 0) continue;
      for (const row of rows) {
        const observed = row.stats?.[field];
        if (observed == null || observed === baseline.value || rule.expectedSlotTypes.includes(row.attachmentType)) continue;
        const context = contexts.get(`${field}|${sourceIdentity(row.source.currentPath)}`);
        findings.push({
          field,
          weaponName,
          attachmentType: row.attachmentType,
          attachmentName: row.attachmentName,
          attachmentSubtype: row.attachmentSubtype,
          sourcePath: sourceRelativePath(row.source.currentPath),
          observed,
          modalBaseline: baseline.value,
          baselineSupport: {
            count: baseline.count,
            total: baseline.total,
            share: +baseline.share.toFixed(4),
            distinctValues: baseline.distinct,
          },
          expectedSlotTypes: rule.expectedSlotTypes,
          status: context?.status ?? 'needs-screenshot-disposition',
          ...(context ? { disposition: context.disposition, dispositionReceipt: context.receipt } : {}),
        });
      }
    }
  }

  const summary = Object.fromEntries(Object.keys(FIELD_RULES).map(field => [
    field,
    findings.filter(item => item.field === field).length,
  ]));
  const statuses = [...new Set(findings.map(item => item.status))].sort();
  const statusSummary = Object.fromEntries(statuses.map(status => [
    status,
    findings.filter(item => item.status === status).length,
  ]));
  const unresolvedCount = findings.filter(item => item.status === 'needs-screenshot-disposition').length;
  return {
    kind: 'field-by-slot-discovery',
    generatedAt: new Date().toISOString(),
    source: CAPTURE_CORPUS_FIXTURES.audit,
    rules: FIELD_RULES,
    summary,
    statusSummary,
    unresolvedCount,
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

export function main(args = process.argv.slice(2)) {
  const { writeReport, reportPath } = parseArgs(args);
  const report = runFieldSlotDiscovery();
  console.log('field-slot findings:', report.findings.length);
  console.log('status summary:', report.statusSummary);
  console.log('unresolved:', report.unresolvedCount);
  if (writeReport) {
    const output = reportPath
      ? (path.isAbsolute(reportPath) ? reportPath : path.resolve(DEFAULT_ROOT, reportPath))
      : path.join(DEFAULT_ROOT, 'migration/1.3.3.0/attachment-audit/field-slot-discovery-findings.json');
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log('wrote', output);
  }
  if (report.unresolvedCount !== 0) process.exitCode = 1;
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  try {
    main();
  } catch (error) {
    console.error(`field-slot discovery failed: ${error.message}`);
    process.exitCode = 1;
  }
}
