// Compare Frosty Precision table rows with reviewed attachment-audit panel readings.
// Research check only: it is not part of CI and does not change live data.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const tablesFile = process.argv[2] ?? 'reference-data/provenance/frosty-precision-tables-2026-09-14.json';
const { tables } = read(tablesFile);
const weapons = read('data/weapons.json');
const balance = read('data/balance_tables.json');
const catalogs = { ...read('data/attachments.json'), ...read('data/ammo.json') };
setAttachmentContext({ ...catalogs, ...balance, HIT_ZONES: read('data/hit_zones.json') });
const audit = read('reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json');

const same = (row, value) => row === -1 || Math.abs(row - value) <= 1e-4 * Math.max(1, Math.abs(value));
const tier = (value, base, mult) => (mult && mult !== 1 && base ? Math.round(Math.log(value / base) / Math.log(mult)) : 0);

// Table keys for a resolved build: base sums plus the build's ADS recoil tier changes.
function keys(weapon, build, table) {
  const ads = weapon.recoil?.ads ?? {};
  const resolvedAds = build.recoil?.ads ?? ads;
  const amountMult = balance.RECOIL_MULT[weapon.id] ?? 0.94;
  return {
    amountSum: table.base.amountSum + tier(build.recoilV, weapon.recoilV, amountMult),
    variationSum: table.base.variationSum + tier(build.recoilVar, weapon.recoil?.ads?.dirVar
      * Math.pow(ads.dirVarMult ?? 1, ads.dirVarExp ?? 0), ads.dirVarMult),
    rpm: build.rpm,
    minAngle: build.recoilIncAds,
    duration: resolvedAds.duration,
    // The resolver keeps Smooth/Bolt recovery as a separate multiplier; the table bakes it in.
    decrease: resolvedAds.decFactor * (build._adsRecoilDecayMult ?? 1),
  };
}

function lookup(table, k) {
  const valid = table.rows.filter(row => row.valid);
  const exact = valid.filter(row => row.amountSum === k.amountSum && row.variationSum === k.variationSum
    && same(row.rpm, k.rpm) && same(row.minAngle, k.minAngle) && same(row.duration, k.duration) && same(row.decrease, k.decrease));
  if (exact.length === 1) return { panel: exact[0].panel, method: 'exact' };
  if (exact.length > 1) return { panel: null, method: 'ambiguous' };
  // Bolt-action tables store a cycle value in the rpm column; a single valid row is used as-is.
  if (valid.length === 1) return { panel: valid[0].panel, method: 'single-row' };
  return { panel: null, method: 'no-row' };
}

const counts = {};
const differences = [];
for (const record of audit.records) {
  const reading = record.fields?.precision?.audit;
  if (record.identityStatus !== 'mapped' || !Number.isFinite(reading)) continue;
  const weapon = weapons.find(item => item.id === record.weapon);
  const table = tables[record.weapon];
  if (!weapon || !table) { counts.noTable = (counts.noTable ?? 0) + 1; continue; }
  const atts = {};
  resetAttsForWeapon(atts, weapon, catalogs);
  const [slot, id] = record.identityCandidates?.[0] ?? [];
  if (slot) atts[slot] = id;
  const k = keys(weapon, applyAttachments(weapon, atts), table);
  const { panel, method } = lookup(table, k);
  // New weapons show a bugged 0 or 1 Precision panel (BROD 3 and EF88 at capture time).
  const outcome = reading <= 1 && weapon.cls !== 'Sniper Rifle' ? 'new-weapon-ui-bug'
    : panel === null ? method : Math.round(panel) === reading ? 'match' : 'differ';
  counts[outcome] = (counts[outcome] ?? 0) + 1;
  if (!['match', 'new-weapon-ui-bug'].includes(outcome)) differences.push({ weapon: record.weapon, cls: weapon.cls, slot, id, reading, panel, method: outcome, keys: k });
}

console.log(JSON.stringify(counts));
const groups = {};
for (const item of differences) (groups[`${item.method} ${item.slot}:${item.id}`] ??= []).push(item);
for (const [group, items] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  const sample = items[0];
  console.log(`${group} x${items.length} [${[...new Set(items.map(item => item.weapon))].join(',')}] e.g. reading=${sample.reading} panel=${sample.panel} keys=${JSON.stringify(sample.keys)}`);
}
