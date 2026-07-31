import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DATA_PATH = path.join(ROOT, 'data', 'attachments.json');
const REVIEW_PATH = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const RECEIPT_PATH = path.join(ROOT, 'outputs', 'attachment-audit', 'pp19-attachment-backfill-20260731.json');
const AUDIT_DIR = path.dirname(REVIEW_PATH);

const PP19_ATTS = {
  muzzle: ['flash_hider', 'flash_comp', 'dp_brake', 'comp_brake', 'linear_comp', 'cqb_supp'],
  barrel: ['basic', 'light', 'extended', 'heavy'],
  barrelDef: 'basic',
  grip: [
    'fold_vert', 'alloy_vert', 'ribbed_vert', '6h64_vert', 'classic_vert',
    'fold_stubby', 'ribbed_stubby', 'canted_stubby', 'stipp_stubby', 'lp_stubby',
    'cmpct_handstop', 'slim_angled_smg',
  ],
  laser: ['5mw_red', '50mw_violet', '5mw_green', '50mw_green', '50mw_blue', '120mw_blue'],
  light: ['ads_taclight', 'flashlight', 'hip_taclight'],
};

const PP19_ERGO = {
  avail: ['mag_catch', 'buffer'],
  magCatchRld: { reg: 2321, fast: 2054 },
};

const PP19_MAG = {
  defAds: 3,
  defSpr: 3,
  defAms: 3,
  def: '30_rnd',
  mags: {
    '30_rnd': {
      name: '30 Rnd',
      pts: 5,
      mag: 30,
      tacRld: 2467,
      adsTimeTierShift: 0,
      sprintRecoveryTierShift: -1,
      adsMoveSpeedTierShift: 0,
    },
    '30_fast': {
      name: '30 Fast',
      pts: 5,
      mag: 30,
      tacRld: 2183,
      adsTimeTierShift: 0,
      sprintRecoveryTierShift: 0,
      adsMoveSpeedTierShift: 0,
    },
    '35_rnd': {
      name: '35 Rnd',
      pts: 15,
      mag: 35,
      tacRld: 2467,
      adsTimeTierShift: 0,
      sprintRecoveryTierShift: 0,
      adsMoveSpeedTierShift: 1,
    },
    '20_fast': {
      name: '20 Fast',
      pts: 5,
      mag: 20,
      tacRld: 2467,
      adsTimeTierShift: 0,
      sprintRecoveryTierShift: 0,
      // The source reads x1.00, but the current ADS_MOVE_TIERS has no 1.0 rung.
      // Keep the current legacy resolver at its base value; the -3 migration is
      // explicitly reserved for Phase 2b-i with the table prepend.
      adsMoveSpeedTierShift: 0,
    },
    '53_rnd': {
      name: '53 Rnd',
      pts: 45,
      mag: 53,
      tacRld: 2667,
      adsTimeTierShift: 0,
      sprintRecoveryTierShift: 0,
      adsMoveSpeedTierShift: 1,
    },
  },
  baseSprintRecoveryTier: 4,
  weaponSprintRecoveryTierShift: -1,
  sprintRecoveryTierTable: 'primary',
};

const clone = value => JSON.parse(JSON.stringify(value));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const baseName = value => String(value ?? '').split(/[\\/]/).pop();

const attachments = readJson(DATA_PATH);
const review = readJson(REVIEW_PATH);
const reviewText = fs.readFileSync(REVIEW_PATH, 'utf8');
const beforeData = clone(attachments.WEAPON_ATTS.pp19);
const beforeErgo = clone(attachments.WEAPON_ERGO.pp19);
const beforeMag = clone(attachments.WEAPON_MAG.pp19);

const validIds = {
  muzzle: new Set(attachments.MUZZLES.map(item => item.id)),
  barrel: new Set(attachments.BARRELS.map(item => item.id)),
  grip: new Set(attachments.GRIPS.map(item => item.id)),
  laser: new Set(attachments.LASERS.map(item => item.id)),
  light: new Set(attachments.LIGHTS.map(item => item.id)),
  ergo: new Set(attachments.ERGOS.map(item => item.id)),
};
for (const [slot, ids] of Object.entries({
  muzzle: PP19_ATTS.muzzle,
  barrel: PP19_ATTS.barrel,
  grip: PP19_ATTS.grip,
  laser: PP19_ATTS.laser,
  light: PP19_ATTS.light,
})) {
  for (const id of ids) {
    if (!validIds[slot].has(id)) throw new Error(`PP-19 ${slot} ID is not in the global catalog: ${id}`);
  }
}
for (const id of PP19_ERGO.avail) {
  if (!validIds.ergo.has(id)) throw new Error(`PP-19 ergonomics ID is not in the global catalog: ${id}`);
}
if (attachments.GRIPS.some(item => Object.hasOwn(item, 'adsMoveSpeedTierShift'))) {
  throw new Error('Refusing to apply PP-19 backfill: a global GRIPS ADS-move shift already exists');
}

const reviewHits = review.records.filter(record => record.weaponName === 'PP-19'
  && record.attachmentType === 'Magazine'
  && record.attachmentName === '20Rnd Fast Mag');
if (reviewHits.length !== 1) throw new Error(`Expected one PP-19 20Rnd Fast Mag review row, found ${reviewHits.length}`);
const reviewRow = reviewHits[0];
const beforeReview = {
  reloadTimeSeconds: reviewRow.stats?.reloadTimeSeconds,
  reloadComparison: clone(reviewRow.statComparisons?.reloadTimeSeconds ?? null),
  source: baseName(reviewRow.source?.currentPath),
};
const alreadyCorrected = beforeReview.reloadTimeSeconds === 2.467
  && !reviewRow.statComparisons?.reloadTimeSeconds;
if (!alreadyCorrected) {
  if (beforeReview.reloadTimeSeconds !== 2.183) {
    throw new Error(`Unexpected PP-19 20Rnd Fast Mag reload value: ${beforeReview.reloadTimeSeconds}`);
  }
  if (beforeReview.reloadComparison?.direction !== 'down') {
    throw new Error('PP-19 20Rnd Fast Mag is missing the expected fabricated reload comparison before correction');
  }
}

const dataChanged = !same(attachments.WEAPON_ATTS.pp19, PP19_ATTS)
  || !same(attachments.WEAPON_ERGO.pp19, PP19_ERGO)
  || !same(attachments.WEAPON_MAG.pp19, PP19_MAG);
const reviewChanged = !alreadyCorrected;
if (!dataChanged && !reviewChanged) {
  console.log('PP-19 attachment backfill already applied; no files changed.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const backupDir = path.join(AUDIT_DIR, `backups/pre-pp19-attachment-backfill-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(DATA_PATH, path.join(backupDir, 'attachments.json'));
fs.copyFileSync(REVIEW_PATH, path.join(backupDir, 'attachment-screenshot-review.json'));

attachments.WEAPON_ATTS.pp19 = clone(PP19_ATTS);
attachments.WEAPON_ERGO.pp19 = clone(PP19_ERGO);
attachments.WEAPON_MAG.pp19 = clone(PP19_MAG);
if (reviewChanged) {
  reviewRow.stats.reloadTimeSeconds = 2.467;
  if (reviewRow.statComparisons) delete reviewRow.statComparisons.reloadTimeSeconds;
}

fs.writeFileSync(DATA_PATH, `${JSON.stringify(attachments, null, 2)}\n`);
let reviewOutput = reviewText;
if (reviewChanged) {
  const eol = reviewText.includes('\r\n') ? '\r\n' : '\n';
  const markerIndex = reviewText.lastIndexOf('39_PP-19_Magazine_20Rnd_Fast_Mag.png');
  const recordStart = reviewText.lastIndexOf(`${eol}    {${eol}`, markerIndex) + eol.length;
  const recordEnd = reviewText.indexOf(`${eol}    },`, markerIndex);
  if (markerIndex < 0 || recordStart < eol.length || recordEnd < 0 || recordEnd <= recordStart) {
    throw new Error('Could not locate the PP-19 20Rnd Fast Mag record for a minimal text patch');
  }
  let recordText = reviewText.slice(recordStart, recordEnd);
  const reloadLine = `        "reloadTimeSeconds": 2.183,`;
  if (recordText.split(reloadLine).length !== 2) {
    throw new Error('PP-19 20Rnd Fast Mag reload line was not unique in its record');
  }
  recordText = recordText.replace(reloadLine, `        "reloadTimeSeconds": 2.467,`);
  const comparisonBlock = [
    '        "sprintRecoveryMs": {',
    '          "direction": "up",',
    '          "effect": "penalty",',
    '          "color": "red",',
    '          "confidence": 0.85,',
    '          "coloredPixelCount": 158,',
    '          "arrowBounds": {',
    '            "x1": 1215,',
    '            "x2": 1222,',
    '            "y1": 663,',
    '            "y2": 666',
    '          }',
    '        },',
    '        "reloadTimeSeconds": {',
    '          "direction": "down",',
    '          "effect": "buff",',
    '          "color": "green",',
    '          "source": "user-verified-reload-review-2026-07-28"',
    '        }',
  ].join(eol);
  const comparisonCut = `${eol}        },${eol}        "reloadTimeSeconds": {`;
  const comparisonCutIndex = comparisonBlock.indexOf(comparisonCut);
  if (comparisonCutIndex < 0) throw new Error('PP-19 20Rnd Fast Mag comparison block shape is invalid');
  const comparisonReplacement = comparisonBlock.slice(0, comparisonCutIndex) + `${eol}        }`;
  if (recordText.split(comparisonBlock).length !== 2) {
    throw new Error('PP-19 20Rnd Fast Mag fabricated reload comparison was not found for removal');
  }
  recordText = recordText.replace(comparisonBlock, comparisonReplacement);
  reviewOutput = reviewText.slice(0, recordStart) + recordText + reviewText.slice(recordEnd);
}
fs.writeFileSync(REVIEW_PATH, reviewOutput);

const receipt = {
  kind: 'pp19-attachment-backfill',
  reviewedAt: '2026-07-31',
  appliedAt: new Date().toISOString(),
  source: {
    reviewFixture: 'outputs/attachment-audit/attachment-screenshot-review.json',
    sourceRoot: 'Weapon Attachments/SMG/PP-19/',
    recordCount: 51,
    supportedSlots: ['Muzzle', 'Barrel', 'Grip', 'Laser', 'Light', 'Ergonomics', 'Magazine'],
    ammoRecords: 7,
    ammoStatus: 'out-of-scope; no WEAPON_AMMO catalog change',
  },
  backupDir: path.relative(ROOT, backupDir).replaceAll('\\', '/'),
  before: {
    attachmentsSha256: sha256(DATA_PATH),
    reviewSha256: sha256(REVIEW_PATH),
    pp19: { weaponAtts: beforeData, weaponErgo: beforeErgo, weaponMag: beforeMag },
    review20Fast: beforeReview,
  },
  after: {
    pp19: { weaponAtts: PP19_ATTS, weaponErgo: PP19_ERGO, weaponMag: PP19_MAG },
    review20Fast: {
      reloadTimeSeconds: reviewRow.stats.reloadTimeSeconds,
      hasReloadComparison: !!reviewRow.statComparisons?.reloadTimeSeconds,
      source: baseName(reviewRow.source?.currentPath),
    },
  },
  mapping: {
    muzzle: {
      'Flash Hider': 'flash_hider',
      'Flash Comp': 'flash_comp',
      'Double-Port Brake': 'dp_brake',
      'Compensated Brake': 'comp_brake',
      'Linear Comp': 'linear_comp',
      'CQB Suppressor': 'cqb_supp',
    },
    barrel: {
      '238MM Factory': 'basic',
      '238MM Pencil': 'light',
      '367MM CIV': 'extended',
      '238MM Cryogenic': 'heavy',
    },
    grip: {
      'Folding Vertical': 'fold_vert',
      'Alloy Vertical': 'alloy_vert',
      'Ribbed Vertical': 'ribbed_vert',
      '6H64 Vertical': '6h64_vert',
      'Classic Vertical': 'classic_vert',
      'Folding Stubby': 'fold_stubby',
      'Ribbed Stubby': 'ribbed_stubby',
      'Canted Stubby': 'canted_stubby',
      'Stippled Stubby': 'stipp_stubby',
      'Low-Profile Stubby': 'lp_stubby',
      'Compact Handstop': 'cmpct_handstop',
      'Slim Angled': 'slim_angled_smg',
    },
    laser: {
      '5 MW Red': '5mw_red',
      '50 MW Violet': '50mw_violet',
      '5 MW Green': '5mw_green',
      '50 MW Green': '50mw_green',
      '50 MW Blue': '50mw_blue',
      '120 MW Blue': '120mw_blue',
    },
    light: {
      'Taclight - Aimed': 'ads_taclight',
      Flashlight: 'flashlight',
      'Taclight - Hipfire': 'hip_taclight',
    },
    ergonomics: {
      'Improved Mag Catch': 'mag_catch',
      'Aftermarket Buffer': 'buffer',
    },
  },
  tierBases: { defAds: 3, defSpr: 3, defAms: 3, baseSprintRecoveryTier: 4, weaponSprintRecoveryTierShift: -1 },
  knownWrongLegacyCombination: {
    loadout: 'PP-19 / Improved Mag Catch / 20Rnd Fast Mag',
    trueReloadMs: 2321,
    legacyNameBranchReloadMs: 2054,
    reason: 'legacy Mag Catch selects the fast branch by display name; 20Rnd Fast Mag has no reload multiplier',
  },
  gripAdsMoveFollowUp: {
    noGlobalShiftAdded: true,
    standardIds: ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby'],
    standardShiftObservedOnPp19: '+1 (0.75 -> 0.67)',
    unexplainedNoShiftWeapons: ['SVK-8.6', 'VSSM', '18.5KS-K', 'DB-12'],
    note: 'The separate ADS-move grip-shift/ADS_MOVE_TIERS 1.0 change must enumerate before/after output in its own commit.',
  },
};
receipt.before.attachmentsSha256 = sha256(path.join(backupDir, 'attachments.json'));
receipt.before.reviewSha256 = sha256(path.join(backupDir, 'attachment-screenshot-review.json'));
receipt.after.attachmentsSha256 = sha256(DATA_PATH);
receipt.after.reviewSha256 = sha256(REVIEW_PATH);
fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(`PP-19 attachment backfill applied.`);
console.log(`  backup: ${path.relative(ROOT, backupDir).replaceAll('\\', '/')}`);
console.log(`  data: ${dataChanged ? 'updated' : 'already correct'}`);
console.log(`  20Rnd Fast Mag review correction: ${reviewChanged ? '2.183 -> 2.467 and fabricated reload comparison cleared' : 'already correct'}`);
console.log(`  receipt: ${path.relative(ROOT, RECEIPT_PATH).replaceAll('\\', '/')}`);
