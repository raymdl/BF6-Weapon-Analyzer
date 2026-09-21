// Compare Frosty Precision table rows with reviewed attachment-audit panel readings.
// Research check only: it is not part of CI and does not change live data.
//   node scripts/frosty-precision-check.mjs [tables.json] [--audit audit.json] [--out summary.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args.splice(outIndex, 2)[1] : null;
const auditIndex = args.indexOf('--audit');
const auditFile = auditIndex >= 0 ? args.splice(auditIndex, 2)[1] : 'reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json';
const tablesFile = args[0] ?? 'reference-data/provenance/frosty-precision-tables-2026-09-14.json';
const { tables } = read(tablesFile);
const weapons = read('data/weapons.json');
const balance = read('data/balance_tables.json');
const catalogs = { ...read('data/attachments.json'), ...read('data/ammo.json') };
setAttachmentContext({ ...catalogs, ...balance, HIT_ZONES: read('data/hit_zones.json') });
const audit = read(auditFile);
const identityCorrections = new Map(read('reference-data/attachment-audit/composite-identity-corrections-2026-09-21.json')
  .corrections.map(item => [item.sourcePath, item.after]));
// Screenshot-verified Precision corrections. The historical audit file keeps the transcribed values.
const ledgers = [
  'reference-data/attachment-audit/screenshot-stat-corrections-2026-09-17.json',
  'reference-data/attachment-audit/precision-screenshot-corrections-2026-09-17.json',
  'reference-data/attachment-audit/composite-screenshot-corrections-2026-09-21.json',
];
const corrections = new Map();
for (const file of ledgers) for (const c of read(file).corrections) if (c.field === 'precision') corrections.set(c.sourcePath, c.after);

// Burst-selector recoil operands (+3 variation, +1/-1 amount, -0.0006 s duration) do not appear in the
// loadout panel preview: all eight burst readings equal the non-burst row (17 SEP 2026 findings).
const BURST_ERGOS = new Set(['burst_training', 'burst_mode', 'grtbc_burst_mode']);
const same = (row, value, tol) => row === -1 || Math.abs(row - value) <= tol * Math.max(1, Math.abs(value));
const tier = (value, base, mult) => (mult && mult !== 1 && base ? Math.round(Math.log(value / base) / Math.log(mult)) : 0);

// Table keys for a resolved build: base sums plus the build's ADS recoil tier changes.
function keys(weapon, build, table, recoilBuild) {
  const ads = weapon.recoil?.ads ?? {};
  const resolvedAds = recoilBuild.recoil?.ads ?? ads;
  const amountMult = balance.RECOIL_MULT[weapon.id] ?? 0.94;
  return {
    amountSum: table.base.amountSum + tier(recoilBuild.recoilV, weapon.recoilV, amountMult),
    variationSum: table.base.variationSum + tier(recoilBuild.recoilVar, weapon.recoil?.ads?.dirVar
      * Math.pow(ads.dirVarMult ?? 1, ads.dirVarExp ?? 0), ads.dirVarMult),
    rpm: build.rpm,
    minAngle: recoilBuild.recoilIncAds,
    duration: resolvedAds.duration,
    // The resolver keeps Smooth/Bolt recovery as a separate multiplier; the table bakes it in.
    decrease: resolvedAds.decFactor * (recoilBuild._adsRecoilDecayMult ?? 1),
  };
}

function lookup(table, k) {
  const keyed = table.rows.filter(row => row.valid);
  const fallback = table.rows.filter(row => !row.valid);
  const matching = tol => keyed.filter(row => row.amountSum === k.amountSum && row.variationSum === k.variationSum
    && same(row.rpm, k.rpm, tol) && same(row.minAngle, k.minAngle, tol) && same(row.duration, k.duration, tol) && same(row.decrease, k.decrease, tol));
  const sameRounded = rows => new Set(rows.map(row => Math.round(row.panel))).size === 1;
  const exact = matching(1e-4);
  if (exact.length === 1) return { panel: exact[0].panel, method: 'exact' };
  // Burst-capable tables repeat keys in a second block whose outputs differ by at most 0.012.
  if (exact.length > 1) return sameRounded(exact) ? { panel: exact[0].panel, method: 'duplicate-same' } : { panel: null, method: 'ambiguous' };
  // Bolt-action tables store a cycle value in the rpm column; a single keyed row is used as-is.
  if (keyed.length === 1) return { panel: keyed[0].panel, method: 'single-row' };
  // AK-205/USG-90 heavy rows store 0.159133 against a resolved 0.239 x 0.666667; catalog burst RPMs are rounded.
  const near = matching(2e-3);
  if (near.length && sameRounded(near)) return { panel: near[0].panel, method: 'near' };
  // A row with all six key flags false matches any loadout (L115: one fallback row of 100).
  if (keyed.length === 0 && fallback.length === 1) return { panel: fallback[0].panel, method: 'fallback' };
  return { panel: null, method: 'no-row' };
}

const rows = [];
for (const record of audit.records) {
  const original = record.fields?.precision?.audit;
  if (record.identityStatus !== 'mapped' || !Number.isFinite(original)) continue;
  const weapon = weapons.find(item => item.id === record.weapon);
  const table = tables[record.weapon];
  if (!weapon || !table) { rows.push({ weapon: record.weapon, outcome: 'no-table' }); continue; }
  const atts = {};
  resetAttsForWeapon(atts, weapon, catalogs);
  const [slot, id] = identityCorrections.get(record.path) ?? record.identityCandidates?.[0] ?? [];
  if (slot) atts[slot] = id;
  // Rail-slot weapons (VZ. 61 grips; lasers and lights on ten weapons) select through atts.rail.
  if (slot && catalogs.WEAPON_ATTS[weapon.id]?.slots?.rail?.accepts.includes(slot)) {
    delete atts[slot];
    atts.rail = id === 'none' ? null : { type: slot, id };
  }
  const build = applyAttachments(weapon, atts);
  const burstPanel = slot === 'ergo' && BURST_ERGOS.has(id);
  const k = keys(weapon, build, table, burstPanel ? applyAttachments(weapon, { ...atts, ergo: 'none' }) : build);
  // GS_PP19 has no Flash Comp smoothing binding (ATTACHMENT_BUGS.md, entry 6).
  // Its generic catalog smoothing must not change the two Precision lookup keys.
  if (weapon.id === 'pp19' && atts.muzzle === 'flash_comp') {
    const unsmoothed = applyAttachments(weapon, { ...atts, muzzle: 'none' });
    k.duration = unsmoothed.recoil.ads.duration;
    k.decrease = unsmoothed.recoil.ads.decFactor * (unsmoothed._adsRecoilDecayMult ?? 1);
  }
  const { panel, method } = lookup(table, k);
  const reading = corrections.get(record.path) ?? original;
  const outcomeFor = value => (value <= 1 && weapon.cls !== 'Sniper Rifle' ? 'new-weapon-ui-bug'
    : panel === null ? method : Math.round(panel) === value ? 'match' : 'differ');
  rows.push({ index: record.recordIndex, weapon: record.weapon, cls: weapon.cls, slot, id, reading, original,
    corrected: reading !== original, panel, method: burstPanel ? `${method}+burst-panel` : method,
    outcome: outcomeFor(reading), originalOutcome: outcomeFor(original), keys: k });
}

const tally = (items, field) => items.reduce((acc, item) => ({ ...acc, [item[field]]: (acc[item[field]] ?? 0) + 1 }), {});
const summary = {
  date: new Date().toISOString().slice(0, 10),
  tables: tablesFile,
  corrections: rows.filter(row => row.corrected).length,
  originalReadings: tally(rows, 'originalOutcome'),
  correctedReadings: tally(rows, 'outcome'),
  methods: tally(rows.filter(row => row.outcome !== 'new-weapon-ui-bug'), 'method'),
  remaining: rows.filter(row => !['match', 'new-weapon-ui-bug'].includes(row.outcome))
    .map(({ weapon, slot, id, reading, original, panel, method, outcome, keys: k }) => ({ weapon, slot, id, reading, original, panel, method, outcome, keys: k })),
};
console.log(JSON.stringify({ originalReadings: summary.originalReadings, correctedReadings: summary.correctedReadings, methods: summary.methods }));
const groups = {};
for (const item of summary.remaining) (groups[`${item.outcome} ${item.slot}:${item.id}`] ??= []).push(item);
for (const [group, items] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  const sample = items[0];
  console.log(`${group} x${items.length} [${[...new Set(items.map(item => item.weapon))].join(',')}] e.g. reading=${sample.reading} panel=${sample.panel} keys=${JSON.stringify(sample.keys)}`);
}
if (outFile) writeFileSync(resolve(root, outFile), JSON.stringify(summary, null, 1) + '\n');
