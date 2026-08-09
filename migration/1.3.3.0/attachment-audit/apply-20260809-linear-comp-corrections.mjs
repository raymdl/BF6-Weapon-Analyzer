import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditDir = path.dirname(fileURLToPath(import.meta.url));
const reviewPath = path.resolve(process.env.BF6_ATTACHMENT_REVIEW_PATH || path.join(auditDir, 'attachment-screenshot-review.json'));
const ledgerPaths = [
  path.join(auditDir, 'linear-comp-evidence-smg-20260809.json'),
  path.join(auditDir, 'linear-comp-evidence-lmg-20260809.json'),
  path.join(auditDir, 'linear-comp-evidence-grt-cps-20260809.json')
];
const expectedWeapons = new Set([
  'CZ3A1', 'KV9', 'PW5A3', 'PW7A2', 'SCW-10', 'SGX', 'UMG-40', 'USG-90', 'SL9', 'PP-19',
  'L110', 'M123K', 'RPKM', 'GRT-CPS'
]);
const auditedFields = ['precision', 'control', 'recoilAmountDegrees', 'recoilVariationDegrees'];
const recoilAmountComparison = {
  direction: 'up',
  effect: 'penalty',
  color: 'red'
};

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--target') args.target = path.resolve(argv[++i]);
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  return args;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function comparisonShape(value) {
  if (!value) return null;
  return {
    direction: value.direction ?? null,
    effect: value.effect ?? null,
    color: value.color ?? null
  };
}

function normalizedPath(value) {
  return String(value || '').replace(/\//g, '\\').toLowerCase();
}

function weaponAttachmentsSuffix(value) {
  const normalized = normalizedPath(value);
  const marker = '\\weapon attachments\\';
  const index = normalized.indexOf(marker);
  return index >= 0 ? normalized.slice(index + marker.length) : normalized;
}

function stableIdentity(entry) {
  return JSON.stringify({
    suffix: weaponAttachmentsSuffix(entry.currentPath),
    weapon: entry.weapon,
    attachmentType: entry.attachmentType,
    attachmentName: entry.attachmentName,
    captureOrder: entry.captureOrder
  });
}

function arrowShape(value) {
  if (!value || value.exists === false) return null;
  return {
    direction: value.direction ?? null,
    effect: value.effect ?? null,
    color: value.color ?? null
  };
}

function fieldObserved(field) {
  const visible = field.visible || {};
  return {
    value: field.observedValue ?? visible.value,
    arrow: field.observedArrow || visible.arrow || null,
    labelConfirmed: field.labelConfirmed !== false
  };
}

function fieldCurrent(field) {
  return {
    value: field.currentJson?.value,
    comparison: field.currentJson?.comparison ?? null
  };
}

function changedPaths(before, after, prefix = '') {
  if (sameJson(before, after)) return [];
  if (before === null || after === null || typeof before !== 'object' || typeof after !== 'object') {
    return [prefix || '/'];
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const paths = [];
  for (const key of keys) {
    const next = prefix + '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1');
    paths.push(...changedPaths(before[key], after[key], next));
  }
  return paths;
}

function fail(errors, message) {
  errors.push(message);
}

function normalizeLedgerRecord(raw, ledgerName) {
  const isSmg = ledgerName.includes('-smg-');
  const isLmg = ledgerName.includes('-lmg-');
  const isGrt = ledgerName.includes('-grt-cps-');
  const weapon = raw.weapon || raw.weaponName;
  const attachmentType = raw.attachmentType || raw.attachment?.type;
  const attachmentName = typeof raw.attachment === 'string'
    ? raw.attachment
    : raw.attachmentName || raw.attachment?.name;
  const attachmentSubtype = raw.attachmentSubtype || raw.attachment?.subtype;
  const capture = raw.capture || raw.source || {};
  const currentPath = capture.currentPath || raw.currentPath;
  const captureOrder = raw.captureOrder ?? capture.captureOrder;
  const fields = raw.fields || {};
  return {
    ledgerName,
    sourceKind: isSmg ? 'smg' : isLmg ? 'lmg' : isGrt ? 'grt-cps' : 'unknown',
    weapon,
    attachmentType,
    attachmentName,
    attachmentSubtype,
    currentPath,
    captureOrder,
    fields,
    raw
  };
}

function validateLedgerFile(filePath, errors) {
  const ledgerName = path.basename(filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(errors, 'ledger parse failed: ' + ledgerName + ': ' + error.message);
    return [];
  }
  const isSmg = ledgerName.includes('-smg-');
  const isLmg = ledgerName.includes('-lmg-');
  const isGrt = ledgerName.includes('-grt-cps-');
  if (isSmg && data.summary?.unresolved !== 0) fail(errors, 'SMG ledger unresolved count is not zero');
  if (isLmg && (data.summary?.valueDispositionCounts?.unresolved !== 0 || data.summary?.mappingVerificationCounts?.unresolved !== 0)) {
    fail(errors, 'LMG ledger unresolved count is not zero');
  }
  if (isGrt && (data.summary?.unresolvedRecordCount !== 0 || data.summary?.ambiguousFieldCount !== 0)) {
    fail(errors, 'GRT-CPS ledger unresolved count is not zero');
  }
  const rawEntries = Array.isArray(data.entries)
    ? data.entries
    : Array.isArray(data.records)
      ? data.records
      : [];
  if (rawEntries.length === 0) fail(errors, 'ledger has no evidence entries: ' + ledgerName);
  const entries = rawEntries
    .filter((raw) => {
      const name = typeof raw.attachment === 'string'
        ? raw.attachment
        : raw.attachmentName || raw.attachment?.name;
      if (!isGrt) return name === 'Linear Comp';
      return name === 'Linear Comp' && (raw.role === 'assigned-linear-comp' || raw.attachmentName === 'Linear Comp');
    })
    .map((raw) => normalizeLedgerRecord(raw, ledgerName));
  return entries;
}

function validateEvidence(entries, errors) {
  if (entries.length !== 14) fail(errors, 'evidence coverage must contain exactly 14 Linear Comp entries');
  const identities = new Set();
  const weapons = new Set();
  const counts = { smg: 0, lmg: 0, 'grt-cps': 0 };
  const expectedArrowByField = {
    precision: { direction: 'up', effect: 'buff', color: 'green' },
    control: { direction: 'down', effect: 'penalty', color: 'red' },
    recoilAmountDegrees: { direction: 'up', effect: 'penalty', color: 'red' },
    recoilVariationDegrees: { direction: 'down', effect: 'buff', color: 'green' }
  };
  for (const entry of entries) {
    const identity = stableIdentity(entry);
    if (identities.has(identity)) fail(errors, 'duplicate evidence identity');
    identities.add(identity);
    weapons.add(entry.weapon);
    counts[entry.sourceKind] = (counts[entry.sourceKind] || 0) + 1;
    if (!expectedWeapons.has(entry.weapon)) fail(errors, 'unexpected assigned weapon: ' + entry.weapon);
    if (entry.attachmentType !== 'Muzzle' || entry.attachmentName !== 'Linear Comp') {
      fail(errors, 'evidence is not a Muzzle / Linear Comp record: ' + entry.weapon);
    }
    if (entry.attachmentSubtype !== 'Convertor') fail(errors, 'unexpected attachment subtype: ' + entry.weapon);
    if (!entry.currentPath || !fs.existsSync(entry.currentPath)) fail(errors, 'missing evidence source path: ' + entry.currentPath);
    for (const fieldName of auditedFields) {
      const field = entry.fields[fieldName];
      if (!field || field.labelConfirmed === false) {
        fail(errors, 'missing or unconfirmed evidence field: ' + entry.weapon + ' ' + fieldName);
        continue;
      }
      const observed = fieldObserved(field);
      const current = fieldCurrent(field);
      if (!Number.isFinite(observed.value)) fail(errors, 'missing observed value: ' + entry.weapon + ' ' + fieldName);
      if (!Number.isFinite(current.value)) fail(errors, 'missing current candidate value: ' + entry.weapon + ' ' + fieldName);
      if (fieldName === 'recoilAmountDegrees' && current.comparison !== null) {
        fail(errors, 'recoil amount current comparison is not the expected missing state: ' + entry.weapon);
      }
      if (!sameJson(arrowShape(observed.arrow), expectedArrowByField[fieldName])) {
        fail(errors, 'visible arrow does not match expected pattern: ' + entry.weapon + ' ' + fieldName);
      }
    }
  }
  if (counts.smg !== 10 || counts.lmg !== 3 || counts['grt-cps'] !== 1) {
    fail(errors, 'evidence source counts must be 10 SMG, 3 LMG, and 1 GRT-CPS');
  }
  if (weapons.size !== 14 || [...expectedWeapons].some((weapon) => !weapons.has(weapon))) {
    fail(errors, 'assigned weapon coverage is not exact');
  }
  return { identities, expectedArrowByField };
}

function targetMatches(target, entry) {
  return target.records.filter((record) => {
    return record.weaponName === entry.weapon &&
      record.attachmentType === entry.attachmentType &&
      record.attachmentName === entry.attachmentName &&
      record.attachmentSubtype === entry.attachmentSubtype &&
      record.source?.captureOrder === entry.captureOrder &&
      weaponAttachmentsSuffix(record.source?.currentPath) === weaponAttachmentsSuffix(entry.currentPath);
  });
}

function recordStateMatches(record, entry, mode) {
  for (const fieldName of auditedFields) {
    const evidenceField = entry.fields[fieldName];
    const current = fieldCurrent(evidenceField);
    const observed = fieldObserved(evidenceField);
    const expectedValue = mode === 'before' ? current.value : observed.value;
    const expectedComparison = mode === 'before'
      ? comparisonShape(current.comparison)
      : fieldName === 'recoilAmountDegrees'
        ? recoilAmountComparison
        : comparisonShape(current.comparison);
    if (record.stats?.[fieldName] !== expectedValue) return false;
    if (!sameJson(comparisonShape(record.statComparisons?.[fieldName]), expectedComparison)) return false;
  }
  if (mode === 'after' && !sameJson(record.statComparisons?.recoilAmountDegrees, recoilAmountComparison)) return false;
  return true;
}

function applyEntry(entry, record, errors, summary, targetIndex) {
  const before = clone(record);
  const beforeState = recordStateMatches(record, entry, 'before');
  const afterState = recordStateMatches(record, entry, 'after');
  if (!beforeState && !afterState) {
    fail(errors, 'target fails both ledger pre-state and accepted post-state: ' + entry.weapon);
    return;
  }
  if (afterState) {
    summary.alreadyCorrect += 1;
    return;
  }
  if (!record.stats || !record.statComparisons || typeof record.statComparisons !== 'object') {
    fail(errors, 'target stat containers are missing: ' + entry.weapon);
    return;
  }
  const expectedChanges = ['/statComparisons/recoilAmountDegrees'];
  if (entry.fields.recoilAmountDegrees.currentJson.value !== fieldObserved(entry.fields.recoilAmountDegrees).value) {
    record.stats.recoilAmountDegrees = fieldObserved(entry.fields.recoilAmountDegrees).value;
    expectedChanges.push('/stats/recoilAmountDegrees');
  }
  if (entry.fields.recoilVariationDegrees.currentJson.value !== fieldObserved(entry.fields.recoilVariationDegrees).value) {
    record.stats.recoilVariationDegrees = fieldObserved(entry.fields.recoilVariationDegrees).value;
    expectedChanges.push('/stats/recoilVariationDegrees');
  }
  record.statComparisons.recoilAmountDegrees = clone(recoilAmountComparison);
  const entryChanges = changedPaths(before, record).sort();
  if (!sameJson(entryChanges, expectedChanges.sort())) {
    fail(errors, 'entry changed outside the evidence-bound fields: ' + entry.weapon);
    return;
  }
  if (!recordStateMatches(record, entry, 'after')) {
    fail(errors, 'entry does not satisfy accepted post-state: ' + entry.weapon);
    return;
  }
  summary.appliedEntries += 1;
  summary.valueChanges += entry.fields.recoilAmountDegrees.currentJson.value !== fieldObserved(entry.fields.recoilAmountDegrees).value ? 1 : 0;
  summary.valueChanges += entry.fields.recoilVariationDegrees.currentJson.value !== fieldObserved(entry.fields.recoilVariationDegrees).value ? 1 : 0;
  summary.comparisonChanges += 1;
  summary.changePaths.push(...expectedChanges.map((change) => '/records/' + targetIndex + change));
}

function formatLikeExistingJson(raw, value) {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const hasTrailingNewline = raw.endsWith('\n');
  let output = JSON.stringify(value, null, 2);
  if (newline === '\r\n') output = output.replace(/\n/g, '\r\n');
  if (hasTrailingNewline) output += newline;
  return output;
}

function atomicWrite(filePath, raw, value) {
  const tempPath = filePath + '.tmp-' + process.pid;
  const content = formatLikeExistingJson(raw, value);
  let fd;
  try {
    fd = fs.openSync(tempPath, 'w');
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw error;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetPath = args.target || reviewPath;
  const errors = [];
  const evidence = [];
  for (const ledgerPath of ledgerPaths) evidence.push(...validateLedgerFile(ledgerPath, errors));
  validateEvidence(evidence, errors);
  let targetRaw;
  let target;
  try {
    targetRaw = fs.readFileSync(targetPath, 'utf8');
    target = JSON.parse(targetRaw);
  } catch (error) {
    fail(errors, 'target corpus parse failed: ' + error.message);
    console.log(JSON.stringify({ matchedEntries: 0, appliedEntries: 0, valueChanges: 0, comparisonChanges: 0, alreadyCorrect: 0, errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(target.records)) fail(errors, 'target corpus records array is missing');
  const beforeTarget = clone(target);
  const summary = {
    matchedEntries: 0,
    appliedEntries: 0,
    valueChanges: 0,
    comparisonChanges: 0,
    alreadyCorrect: 0,
    changePaths: [],
    errors
  };
  const matchedIdentities = new Set();
  if (Array.isArray(target.records)) {
    for (const entry of evidence) {
      const matches = targetMatches(target, entry);
      if (matches.length !== 1) {
        fail(errors, 'expected exactly one target match for ' + entry.weapon + ', found ' + matches.length);
        continue;
      }
      const record = matches[0];
      const identity = stableIdentity(entry);
      if (matchedIdentities.has(identity)) fail(errors, 'duplicate matched target identity: ' + entry.weapon);
      matchedIdentities.add(identity);
      const targetIndex = target.records.indexOf(record);
      summary.matchedEntries += 1;
      if (!recordStateMatches(record, entry, 'before') && !recordStateMatches(record, entry, 'after')) {
        fail(errors, 'target values/comparisons differ from both ledger pre-state and accepted post-state: ' + entry.weapon);
      }
      applyEntry(entry, record, errors, summary, targetIndex);
    }
  }
  const fullChanges = changedPaths(beforeTarget, target).sort();
  const expectedFullChanges = summary.changePaths.sort();
  if (!sameJson(fullChanges, expectedFullChanges)) {
    fail(errors, 'full semantic diff contains changes outside the 14 evidence-bound rows');
  }
  const computedValueChanges = evidence.reduce((count, entry) => {
    return count +
      (entry.fields.recoilAmountDegrees.currentJson.value !== fieldObserved(entry.fields.recoilAmountDegrees).value ? 1 : 0) +
      (entry.fields.recoilVariationDegrees.currentJson.value !== fieldObserved(entry.fields.recoilVariationDegrees).value ? 1 : 0);
  }, 0);
  const computedComparisonChanges = evidence.filter((entry) => !sameJson(comparisonShape(entry.fields.recoilAmountDegrees.currentJson.comparison), recoilAmountComparison)).length;
  if (computedValueChanges !== 7) fail(errors, 'ledger-derived value mismatch count is not 7: ' + computedValueChanges);
  if (computedComparisonChanges !== 14) fail(errors, 'ledger-derived comparison change count is not 14: ' + computedComparisonChanges);
  if (errors.length === 0 && args.apply && summary.appliedEntries > 0) atomicWrite(targetPath, targetRaw, target);
  console.log(JSON.stringify({
    matchedEntries: summary.matchedEntries,
    appliedEntries: args.apply ? summary.appliedEntries : 0,
    valueChanges: args.apply ? summary.valueChanges : 0,
    comparisonChanges: args.apply ? summary.comparisonChanges : 0,
    alreadyCorrect: summary.alreadyCorrect,
    errors
  }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

main();
