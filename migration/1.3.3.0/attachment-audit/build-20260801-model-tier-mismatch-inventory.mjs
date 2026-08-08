import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ROOT } from '../../../scripts/capture-corpus-lib.mjs';
import { runSweep } from '../../../scripts/audit-sweep.mjs';

const ROOT = DEFAULT_ROOT;
const AUDIT_PATH = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'attachment-screenshot-review.json');
const OUTPUT_PATH = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'model-tier-mismatch-inventory-20260801.json');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const review = readJson(AUDIT_PATH);
const sweep = runSweep({ root: ROOT });
const findings = sweep.findings.filter(finding => finding.check === 'model-tier-mismatch');

const ADJUDICATIONS = new Map([
  ['PSR|Magazine/7Rnd Magazine|adsTimeMs', {
    adjudication: 'site-bug',
    gamePanel: 300,
    siteRendered: 367,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/PSR/32_PSR_Magazine_7Rnd_Magazine.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=300, site renders=367, corpus row=300.',
  }],
  ['PSR|Magazine/10Rnd Magazine|adsMoveSpeedMultiplier', {
    adjudication: 'site-bug',
    gamePanel: 0.47,
    siteRendered: 0.54,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/PSR/31_PSR_Magazine_10Rnd_Magazine.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=0.47, site renders=0.54, corpus row=0.47.',
  }],
  ['M2010 ESR|Magazine/8Rnd Magazine|adsMoveSpeedMultiplier', {
    adjudication: 'site-bug',
    gamePanel: 0.47,
    siteRendered: 0.54,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/M2010 ESR/35_M2010 ESR_Magazine_8RND_MAGAZINE.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=0.47, site renders=0.54, corpus row=0.47.',
  }],
  ['SV-98|Magazine/10Rnd Magazine|adsMoveSpeedMultiplier', {
    adjudication: 'site-bug',
    gamePanel: 0.54,
    siteRendered: 0.67,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/SV-98/30_SV-98_Magazine_10Rnd_Magazine.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=0.54, site renders=0.67, corpus row=0.54.',
  }],
  ['M2010 ESR|Magazine/8Rnd Magazine|adsTimeMs', {
    adjudication: 'corpus-error',
    gamePanel: 300,
    siteRendered: 300,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/M2010 ESR/35_M2010 ESR_Magazine_8RND_MAGAZINE.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=300, site renders=300, corpus row=250.',
  }],
  ['M2010 ESR|Magazine/5Rnd Fast Mag|adsTimeMs', {
    adjudication: 'corpus-error',
    gamePanel: 300,
    siteRendered: 300,
    screenshotSuffix: 'Weapon Attachments/Sniper Rifle/M2010 ESR/34_M2010 ESR_Magazine_5RND_FAST_MAG.png',
    note: 'Claude read the panel directly on 2026-08-01; game panel=300, site renders=300, corpus row=250.',
  }],
]);

function sourcePathFor(row) {
  return typeof row.source === 'string' ? row.source : row.source?.currentPath;
}

function findingKey(finding, field) {
  return `${finding.weapon}|${finding.attachment}|${field}`;
}

function parseFinding(finding) {
  const match = /^(?<field>\w+) predicted (?<predicted>-?\d+(?:\.\d+)?), observed (?<observed>-?\d+(?:\.\d+)?)$/.exec(finding.detail);
  assert.ok(match, `unexpected model-tier-mismatch detail: ${finding.detail}`);
  return {
    field: match.groups.field,
    predicted: Number(match.groups.predicted),
    observed: Number(match.groups.observed),
  };
}

const rowsByKey = new Map();
for (const row of review.records.filter(record => record.stats)) {
  const key = `${row.weaponName}|${row.attachmentType}/${row.attachmentName}`;
  const rows = rowsByKey.get(key) ?? [];
  rows.push(row);
  rowsByKey.set(key, rows);
}

const records = findings.map(finding => {
  const parsed = parseFinding(finding);
  const key = findingKey(finding, parsed.field);
  const rows = rowsByKey.get(`${finding.weapon}|${finding.attachment}`) ?? [];
  assert.equal(rows.length, 1, `expected one screenshot row for ${finding.weapon}|${finding.attachment}; found ${rows.length}`);
  const row = rows[0];
  const screenshotPath = sourcePathFor(row);
  assert.ok(screenshotPath, `missing screenshot path for ${key}`);
  const adjudication = ADJUDICATIONS.get(key);

  if (adjudication) {
    assert.equal(row.extractionStatus, 'provisional-review-required', `${key}: extractionStatus changed`);
    assert.equal(row.reviewStatus, 'reviewed', `${key}: reviewStatus changed`);
    assert.equal(row.stats[parsed.field], parsed.observed, `${key}: corpus observed value changed`);
    assert.ok(screenshotPath.replaceAll('\\', '/').endsWith(adjudication.screenshotSuffix), `${key}: screenshot path changed`);
    assert.equal(adjudication.siteRendered, parsed.predicted, `${key}: site-rendered value changed`);
    assert.equal(adjudication.gamePanel, adjudication.adjudication === 'site-bug' ? parsed.observed : parsed.predicted, `${key}: adjudicated panel value inconsistent`);
  }

  return {
    weapon: finding.weapon,
    attachment: finding.attachment,
    field: parsed.field,
    predicted: parsed.predicted,
    observed: parsed.observed,
    extractionStatus: row.extractionStatus,
    reviewStatus: row.reviewStatus,
    screenshotPath,
    adjudication: adjudication?.adjudication ?? 'unadjudicated',
    gamePanel: adjudication?.gamePanel ?? null,
    siteRendered: adjudication?.siteRendered ?? null,
    adjudicationNote: adjudication?.note ?? null,
  };
});

assert.equal(records.length, 8, `expected 8 mismatch findings, found ${records.length}`);
assert.equal(records.filter(record => record.adjudication !== 'unadjudicated').length, 0);
assert.equal(records.filter(record => record.adjudication === 'site-bug').length, 0);
assert.equal(records.filter(record => record.adjudication === 'corpus-error').length, 0);
assert.equal(records.filter(record => record.adjudication === 'unadjudicated').length, 8);

const inventory = {
  kind: 'model-tier-mismatch-inventory',
  schemaVersion: 1,
  source: 'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json',
  generatedBy: 'migration/1.3.3.0/attachment-audit/build-20260801-model-tier-mismatch-inventory.mjs',
  policy: '§7 screenshot wins; disagreements are reported and never resolved by rewriting the corpus or data.',
  counts: { total: 8, siteBug: 0, corpusError: 0, unadjudicated: 8 },
  records,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`wrote ${OUTPUT_PATH}`);
console.log(`inventory counts: ${JSON.stringify(inventory.counts)}`);
