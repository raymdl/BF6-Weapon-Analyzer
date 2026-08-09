import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditDir = path.dirname(fileURLToPath(import.meta.url));
const defaultReviewPath = path.join(auditDir, 'attachment-screenshot-review.json');
const ledgerPaths = [
  path.join(auditDir, 'additional-evidence-rpk74m-tungsten-20260809.json'),
  path.join(auditDir, 'additional-evidence-m417a2-ammo-20260809.json')
];
const expectedIdentities = new Set([
  'rpk-74m|ammo|tungsten core|107|lmg\\rpk-74m\\55_rpk-74m_ammo_penetration.png',
  'm417 a2|ammo|hollow point|44|carbine\\m417 a2\\55_m417 a2_ammo_hollow_point.png',
  'm417 a2|ammo|subsonic hp|46|carbine\\m417 a2\\57_m417 a2_ammo_sub_hp.png'
]);
const expectedComparisonByField = {
  recoilAmountDegrees: { direction: 'up', effect: 'penalty', color: 'red' },
  headshotMultiplier: { direction: 'up', effect: 'buff', color: 'green' }
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

function identityKey(entry) {
  return [
    entry.weapon,
    entry.attachmentType,
    entry.attachmentName,
    entry.captureOrder,
    weaponAttachmentsSuffix(entry.currentPath)
  ].join('|').toLowerCase();
}

function changedPaths(before, after, prefix = '') {
  if (sameJson(before, after)) return [];
  if (/\/statComparisons\/[^/]+$/.test(prefix)) return [prefix];
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

function normalizeEntry(raw, ledgerName, fieldName, field, common) {
  const visible = field.visible || {};
  return {
    ledgerName,
    weapon: common.weapon,
    attachmentType: common.attachmentType,
    attachmentSubtype: common.attachmentSubtype,
    attachmentName: common.attachmentName,
    captureOrder: common.captureOrder,
    currentPath: common.currentPath,
    fieldName,
    currentJson: field.currentJson || {},
    observedValue: field.observedValue ?? visible.value,
    observedArrow: field.observedArrow || visible.arrow || null,
    labelConfirmed: field.labelConfirmed !== false && raw.labelConfirmed !== false,
    mappingValid: raw.mappingValid !== false && raw.mappingValidity !== 'invalid' && raw.ambiguity !== 'ambiguous',
    raw
  };
}

function normalizeCommon(raw) {
  const attachmentName = typeof raw.attachment === 'string'
    ? raw.attachment
    : raw.attachmentName || raw.attachment?.name;
  const attachmentSubtype = raw.attachmentSubtype || raw.attachment?.subtype;
  const capture = raw.capture || raw.source || {};
  return {
    weapon: raw.weapon || raw.weaponName,
    attachmentType: raw.attachmentType,
    attachmentSubtype,
    attachmentName,
    captureOrder: raw.captureOrder ?? capture.captureOrder,
    currentPath: capture.currentPath || raw.currentPath
  };
}

function loadLedger(filePath, errors) {
  const ledgerName = path.basename(filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(errors, 'ledger parse failed: ' + ledgerName + ': ' + error.message);
    return [];
  }
  if (ledgerName.includes('rpk74m')) {
    if (data.summary?.ambiguous !== 0 || data.summary?.mappingValid !== 1) {
      fail(errors, 'RPK-74M ledger is not fully resolved');
    }
    return (data.entries || []).map((raw) => normalizeEntry(
      raw,
      ledgerName,
      raw.stat,
      raw,
      normalizeCommon(raw)
    ));
  }
  if (data.summary?.ambiguousFieldCount !== 0 || data.summary?.unresolvedRecordCount !== 0) {
    fail(errors, 'M417 A2 ledger is not fully resolved');
  }
  const entries = [];
  for (const raw of data.records || []) {
    const common = normalizeCommon(raw);
    for (const [fieldName, field] of Object.entries(raw.fields || {})) {
      entries.push(normalizeEntry(raw, ledgerName, fieldName, field, common));
    }
  }
  return entries;
}

function validateEvidence(entries, errors) {
  if (entries.length !== 3) fail(errors, 'evidence coverage must contain exactly 3 entries');
  const identities = new Set();
  for (const entry of entries) {
    const identity = identityKey(entry);
    if (identities.has(identity)) fail(errors, 'duplicate evidence identity: ' + identity);
    identities.add(identity);
    if (!expectedIdentities.has(identity)) fail(errors, 'unexpected evidence identity: ' + identity);
    if (entry.attachmentType !== 'Ammo') fail(errors, 'evidence attachment type is not Ammo: ' + identity);
    if (!entry.currentPath || !fs.existsSync(entry.currentPath)) fail(errors, 'missing evidence source path: ' + entry.currentPath);
    if (!entry.mappingValid || !entry.labelConfirmed) fail(errors, 'evidence mapping/label is not confirmed: ' + identity);
    if (!Number.isFinite(entry.currentJson.value) || !Number.isFinite(entry.observedValue)) {
      fail(errors, 'evidence value is missing: ' + identity);
    }
    if (entry.currentJson.value !== entry.observedValue) fail(errors, 'numeric value mismatch is not zero: ' + identity);
    const expectedArrow = expectedComparisonByField[entry.fieldName];
    if (!expectedArrow || !sameJson(comparisonShape(entry.observedArrow), expectedArrow)) {
      fail(errors, 'visible evidence arrow is not the required final comparison: ' + identity);
    }
    if (!sameJson(comparisonShape(entry.currentJson.comparison), entry.fieldName === 'recoilAmountDegrees' ? null : { direction: 'down', effect: 'buff', color: 'green' })) {
      fail(errors, 'current ledger comparison does not match the expected pre-state: ' + identity);
    }
  }
  if (!sameJson([...identities].sort(), [...expectedIdentities].sort())) {
    fail(errors, 'evidence identity coverage is not the exact three-row set');
  }
  return identities;
}

function targetMatches(target, entry) {
  return target.records.filter((record) => {
    return record.weaponName === entry.weapon &&
      record.attachmentType === entry.attachmentType &&
      record.attachmentSubtype === entry.attachmentSubtype &&
      record.attachmentName === entry.attachmentName &&
      record.source?.captureOrder === entry.captureOrder &&
      weaponAttachmentsSuffix(record.source?.currentPath) === weaponAttachmentsSuffix(entry.currentPath);
  });
}

function stateMatches(record, entry, mode) {
  const expectedValue = entry.currentJson.value;
  const expectedComparison = mode === 'before'
    ? comparisonShape(entry.currentJson.comparison)
    : expectedComparisonByField[entry.fieldName];
  return record.stats?.[entry.fieldName] === expectedValue &&
    sameJson(comparisonShape(record.statComparisons?.[entry.fieldName]), expectedComparison) &&
    (mode === 'after' ? sameJson(record.statComparisons?.[entry.fieldName], expectedComparison) : true);
}

function applyEntry(entry, record, targetIndex, errors, summary) {
  const before = clone(record);
  const beforeState = stateMatches(record, entry, 'before');
  const afterState = stateMatches(record, entry, 'after');
  if (!beforeState && !afterState) {
    fail(errors, 'target fails both exact ledger pre-state and accepted post-state: ' + identityKey(entry));
    return;
  }
  if (afterState) {
    summary.alreadyCorrect += 1;
    return;
  }
  if (!record.statComparisons || typeof record.statComparisons !== 'object') {
    fail(errors, 'target comparison container is missing: ' + identityKey(entry));
    return;
  }
  record.statComparisons[entry.fieldName] = clone(expectedComparisonByField[entry.fieldName]);
  const actualChanges = changedPaths(before, record).sort();
  const expectedChanges = ['/statComparisons/' + entry.fieldName];
  if (!sameJson(actualChanges, expectedChanges)) {
    fail(errors, 'entry changed outside its exact comparison object: ' + identityKey(entry));
    return;
  }
  if (!stateMatches(record, entry, 'after')) {
    fail(errors, 'entry does not satisfy exact accepted post-state: ' + identityKey(entry));
    return;
  }
  summary.appliedEntries += 1;
  summary.comparisonChanges += 1;
  summary.changePaths.push('/records/' + targetIndex + '/statComparisons/' + entry.fieldName);
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
  const targetPath = args.target || path.resolve(process.env.BF6_ATTACHMENT_REVIEW_PATH || defaultReviewPath);
  const errors = [];
  const entries = [];
  for (const ledgerPath of ledgerPaths) entries.push(...loadLedger(ledgerPath, errors));
  validateEvidence(entries, errors);

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
    for (const entry of entries) {
      const matches = targetMatches(target, entry);
      if (matches.length !== 1) {
        fail(errors, 'expected exactly one target match for ' + identityKey(entry) + ', found ' + matches.length);
        continue;
      }
      const record = matches[0];
      const identity = identityKey(entry);
      if (matchedIdentities.has(identity)) fail(errors, 'duplicate matched identity: ' + identity);
      matchedIdentities.add(identity);
      summary.matchedEntries += 1;
      applyEntry(entry, record, target.records.indexOf(record), errors, summary);
    }
  }
  const fullChanges = changedPaths(beforeTarget, target).sort();
  const expectedFullChanges = summary.changePaths.sort();
  if (!sameJson(fullChanges, expectedFullChanges)) {
    fail(errors, 'full semantic diff contains changes outside the exact three comparison objects');
  }
  if (summary.valueChanges !== 0) fail(errors, 'numeric value changes are not permitted');
  if (errors.length === 0 && args.apply && summary.appliedEntries > 0) atomicWrite(targetPath, targetRaw, target);
  console.log(JSON.stringify({
    matchedEntries: summary.matchedEntries,
    appliedEntries: args.apply ? summary.appliedEntries : 0,
    valueChanges: 0,
    comparisonChanges: args.apply ? summary.comparisonChanges : 0,
    alreadyCorrect: summary.alreadyCorrect,
    errors
  }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

main();
