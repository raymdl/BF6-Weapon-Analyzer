import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DATA_PATH = path.join(ROOT, 'data', 'attachments.json');
const REVIEW_PATH = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const RECEIPT_PATH = path.join(ROOT, 'outputs', 'attachment-audit', 'pp19-attachment-backfill-20260731.json');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const baseName = value => String(value ?? '').split(/[\\/]/).pop();

const expectedAtts = {
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
const expectedErgo = { avail: ['mag_catch', 'buffer'], magCatchRld: { reg: 2321, fast: 2054 } };
const expectedMag = {
  defAds: 3,
  defSpr: 3,
  defAms: 4,
  def: '30_rnd',
  mags: {
    '30_rnd': { name: '30 Rnd', pts: 5, mag: 30, tacRld: 2467, adsTimeTierShift: 0, sprintRecoveryTierShift: -1, adsMoveSpeedTierShift: 0 },
    '30_fast': { name: '30 Fast', pts: 5, mag: 30, tacRld: 2183, adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 0 },
    '35_rnd': { name: '35 Rnd', pts: 15, mag: 35, tacRld: 2467, adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 1 },
    '20_fast': { name: '20 Fast', pts: 5, mag: 20, tacRld: 2467, adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: -3 },
    '53_rnd': { name: '53 Rnd', pts: 45, mag: 53, tacRld: 2667, adsTimeTierShift: 0, sprintRecoveryTierShift: 0, adsMoveSpeedTierShift: 1 },
  },
  baseSprintRecoveryTier: 4,
  weaponSprintRecoveryTierShift: -1,
  sprintRecoveryTierTable: 'primary',
};
const receiptExpectedMag = JSON.parse(JSON.stringify(expectedMag));
receiptExpectedMag.defAms = 3;
receiptExpectedMag.mags['20_fast'].adsMoveSpeedTierShift = 0;

const attachments = readJson(DATA_PATH);
const review = readJson(REVIEW_PATH);
const receipt = readJson(RECEIPT_PATH);

if (receipt.kind !== 'pp19-attachment-backfill') throw new Error('PP-19 backfill receipt kind is invalid');
if (!same(attachments.WEAPON_ATTS.pp19, expectedAtts)) throw new Error('WEAPON_ATTS.pp19 does not match the verified backfill');
if (!same(attachments.WEAPON_ERGO.pp19, expectedErgo)) throw new Error('WEAPON_ERGO.pp19 does not match the verified backfill');
if (!same(attachments.WEAPON_MAG.pp19, expectedMag)) throw new Error('WEAPON_MAG.pp19 does not match the verified backfill');
if (!same(receipt.after?.pp19?.weaponMag, receiptExpectedMag)) {
  throw new Error('PP-19 receipt no longer preserves the pre-Phase-2b-i backfill catalog');
}

const globalCatalogs = {
  muzzle: new Set(attachments.MUZZLES.map(item => item.id)),
  barrel: new Set(attachments.BARRELS.map(item => item.id)),
  grip: new Set(attachments.GRIPS.map(item => item.id)),
  laser: new Set(attachments.LASERS.map(item => item.id)),
  light: new Set(attachments.LIGHTS.map(item => item.id)),
  ergo: new Set(attachments.ERGOS.map(item => item.id)),
};
for (const [slot, ids] of Object.entries({
  muzzle: expectedAtts.muzzle,
  barrel: expectedAtts.barrel,
  grip: expectedAtts.grip,
  laser: expectedAtts.laser,
  light: expectedAtts.light,
})) {
  for (const id of ids) if (!globalCatalogs[slot].has(id)) throw new Error(`${slot} ID missing from global catalog: ${id}`);
}
for (const id of expectedErgo.avail) if (!globalCatalogs.ergo.has(id)) throw new Error(`ergo ID missing from global catalog: ${id}`);
if (attachments.GRIPS.some(item => Object.hasOwn(item, 'adsMoveSpeedTierShift'))) {
  throw new Error('Global GRIPS contains an ADS-move shift; the PP-19 backfill must not add one');
}

const reviewHits = review.records.filter(record => record.weaponName === 'PP-19'
  && record.attachmentType === 'Magazine'
  && record.attachmentName === '20Rnd Fast Mag');
if (reviewHits.length !== 1) throw new Error(`Expected one PP-19 20Rnd Fast Mag review row, found ${reviewHits.length}`);
const reviewRow = reviewHits[0];
if (reviewRow.stats?.reloadTimeSeconds !== 2.467) throw new Error('PP-19 20Rnd Fast Mag review reload is not 2.467');
if (reviewRow.statComparisons?.reloadTimeSeconds) throw new Error('PP-19 20Rnd Fast Mag still has a fabricated reload comparison');
if (baseName(reviewRow.source?.currentPath) !== '39_PP-19_Magazine_20Rnd_Fast_Mag.png') {
  throw new Error('PP-19 20Rnd Fast Mag review source path changed unexpectedly');
}

if (!/^[0-9a-f]{64}$/.test(receipt.after?.attachmentsSha256 ?? '')) {
  throw new Error('PP-19 backfill receipt does not contain a valid historical data hash');
}
if (receipt.after?.reviewSha256 !== sha256(REVIEW_PATH)) throw new Error('PP-19 backfill review hash does not match its receipt');
if (receipt.before?.review20Fast?.reloadTimeSeconds !== 2.183) throw new Error('Receipt does not preserve the pre-correction 20Rnd value');
if (receipt.after?.review20Fast?.reloadTimeSeconds !== 2.467 || receipt.after.review20Fast.hasReloadComparison) {
  throw new Error('Receipt does not record the verified 20Rnd correction');
}
if (receipt.knownWrongLegacyCombination?.trueReloadMs !== 2321
    || receipt.knownWrongLegacyCombination?.legacyNameBranchReloadMs !== 2054) {
  throw new Error('Receipt is missing the known Mag Catch + 20Rnd Fast legacy mismatch');
}
if (receipt.gripAdsMoveFollowUp?.noGlobalShiftAdded !== true
    || JSON.stringify(receipt.gripAdsMoveFollowUp.unexplainedNoShiftWeapons)
      !== JSON.stringify(['SVK-8.6', 'VSSM', '18.5KS-K', 'DB-12'])) {
  throw new Error('Receipt is missing the four-weapon ADS-move follow-up record');
}

console.log('PP-19 attachment backfill verification passed.');
console.log('  6 muzzle, 4 barrel, 12 grip, 6 laser, 3 light IDs; 2 ergonomics; 5 magazines');
console.log('  receipt defAds/defSpr/defAms = 3/3/3; live migrated PP-19 defAms = 4; 20Rnd Fast Mag review = 2.467 with no reload comparison');
console.log('  no global grip adsMoveSpeedTierShift added; follow-up weapons = SVK-8.6, VSSM, 18.5KS-K, DB-12');
