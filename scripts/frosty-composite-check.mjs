// Compare the Control, Hipfire and Mobility candidates with reviewed attachment-audit panel readings.
// Research check only: it is not part of CI and does not change live data.
//   node scripts/frosty-composite-check.mjs [--out summary.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon, resolveMountAttachments } from '../sim/loadout.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args.splice(outIndex, 2)[1] : null;
const weapons = read('data/weapons.json');
const balance = read('data/balance_tables.json');
const catalogs = { ...read('data/attachments.json'), ...read('data/ammo.json') };
setAttachmentContext({ ...catalogs, ...balance, HIT_ZONES: read('data/hit_zones.json') });
const audit = read('reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json');
const STATS = ['control', 'hipfire', 'mobility'];
const corrections = new Map();
for (const file of ['screenshot-stat-corrections-2026-09-17.json', 'precision-screenshot-corrections-2026-09-17.json']) {
  const ledger = read(`reference-data/attachment-audit/${file}`);
  for (const c of [...ledger.corrections, ...(ledger.otherFieldCorrections ?? [])]) {
    if (STATS.includes(c.field)) corrections.set(`${c.sourcePath}|${c.field}`, c.after);
  }
}

const rad = degrees => degrees * Math.PI / 180;
// Candidates recorded in docs/working/COMPOSITE_STATS_FINDINGS.md (6 SEP 2026 evidence files).
const control = (R, V) => 96 / Math.pow(1.1 * R * Math.sin(rad(V)) / rad(V) + 0.75, 2.25) + 4;
const hipfire = H => Math.min(100, 10 * Math.sqrt(0.425 / Math.tan(rad(1.25 * H)) * 83.33333587646484 / 40.92409896850586));
// The delegate's own 18-value ladder (composite-hipfire-decode-2026-09-06.json). Row 0 is 8.032 where the
// site's spread table holds 7.4: suppressed LMGs read 22 (8.032), not 23 (7.4).
const HIPFIRE_LADDER = [8.032, 4.848, 3.352, 2.432, 1.804, 1.352, 1.024, 0.784, 0.608, 0.476, 0.38, 2.16, 1.444, 0.972, 0.656, 0.444, 0.304, 0.208];
// Flashlight, hip tac light and laser/light combos multiply by sqrt(1.2); the ADS tac light does not.
const HIPFIRE_LIGHT_GATE = Math.sqrt(1.2);
const hasHipLight = (laser, light) => ['flashlight', 'hip_taclight'].includes(light) || laser.startsWith('combo');
// Unrounded recoil inputs: the resolver rounds recoilV to three decimals, which moves 30 readings across .5.
function exactRecoil(weapon, build) {
  const mult = balance.RECOIL_MULT[weapon.id];
  const ads = weapon.recoil?.ads ?? {};
  const amountTier = mult && mult !== 1 ? Math.round(Math.log(build.recoilV / weapon.recoilV) / Math.log(mult)) : 0;
  const baseVar = ads.dirVar * Math.pow(ads.dirVarMult ?? 1, ads.dirVarExp ?? 0);
  const varTier = ads.dirVarMult && ads.dirVarMult !== 1 ? Math.round(Math.log(build.recoilVar / baseVar) / Math.log(ads.dirVarMult)) : 0;
  return { R: weapon.recoilV * Math.pow(mult ?? 1, amountTier), V: baseVar * Math.pow(ads.dirVarMult ?? 1, varTier) };
}
// Mobility indices in source order (higher is faster or steadier), read back from the resolved values.
function mobilityIndices(build, weapon) {
  const wm = catalogs.WEAPON_MAG[weapon.id];
  const draw = balance.DRAW_TIME_TABLES;
  return {
    deploy: draw[wm?.deployTimeTable]?.deploy.indexOf(build._deployTimeMs) ?? -1,
    adsTime: balance.ADS_SPD_TIERS.indexOf(build._adsTimeMs),
    sprint: draw.sprint.indexOf(build._sprintRecoveryMs),
    adsMove: balance.ADS_MOVE_TIERS.indexOf(build._adsMoveSpeedMult),
    movingAds: balance.MOVING_ACC_TIERS.indexOf(build.spread?.adsMove?.[0]),
  };
}
const mobilityScore = i => i.deploy + 4 * i.adsTime + i.sprint + 2 * i.adsMove + 4 * i.movingAds;

const defaults = (weapon, slot) => ({
  barrel: catalogs.WEAPON_ATTS[weapon.id]?.barrelDef ?? 'basic',
  mag: catalogs.WEAPON_MAG[weapon.id]?.def,
  ammo: catalogs.WEAPON_AMMO?.[weapon.id]?.def ?? 'standard',
})[slot] ?? 'none';

const rows = [];
for (const record of audit.records) {
  if (record.identityStatus !== 'mapped') continue;
  const weapon = weapons.find(item => item.id === record.weapon);
  if (!weapon) continue;
  const atts = {};
  resetAttsForWeapon(atts, weapon, catalogs);
  const [slot, id] = record.identityCandidates?.[0] ?? [];
  if (slot) atts[slot] = id;
  if (slot && catalogs.WEAPON_ATTS[weapon.id]?.slots?.rail?.accepts.includes(slot)) {
    delete atts[slot];
    atts.rail = id === 'none' ? null : { type: slot, id };
  }
  const build = applyAttachments(weapon, atts);
  const mounts = resolveMountAttachments(atts, weapon, catalogs);
  const readings = {};
  for (const stat of STATS) {
    const value = corrections.get(`${record.path}|${stat}`) ?? record.fields?.[stat]?.audit;
    if (Number.isFinite(value)) readings[stat] = value;
  }
  // Hip index in source order: the weapon's base row minus the resolved tier shift, clamped like the resolver.
  // The shotgun ammunition shift (-9) is the site's device for reaching the shotgun spread rows; the panel
  // reads the registry index (row 3 gives 40 on all four shotguns), so the ammunition shift is excluded here.
  const hipBase = balance.HIP_SPREAD_BASE_INDEX[weapon.id];
  const ammoId = atts.ammo ?? catalogs.WEAPON_AMMO?.[weapon.id]?.def ?? 'standard';
  const ammoShift = catalogs.WEAPON_AMMO?.[weapon.id]?.effectOverrides?.[ammoId]?.hipSpreadTierMod
    ?? catalogs.AMMO.find(item => item.id === ammoId)?.hipSpreadTierMod ?? 0;
  const hipIndex = Number.isInteger(hipBase) ? Math.max(0, Math.min(HIPFIRE_LADDER.length - 1, hipBase - (build._hipSpreadTierMod - ammoShift))) : null;
  const H = hipIndex != null ? HIPFIRE_LADDER[hipIndex] : null;
  const gate = hasHipLight(mounts.laser.id, mounts.light.id) ? HIPFIRE_LIGHT_GATE : 1;
  const { R, V } = exactRecoil(weapon, build);
  const indices = mobilityIndices(build, weapon);
  rows.push({
    index: record.recordIndex, weapon: weapon.id, cls: weapon.cls, slot, id, readings,
    baseline: slot ? id === defaults(weapon, slot) : false,
    candidates: {
      control: control(R, V),
      hipfire: H != null ? Math.min(100, hipfire(H) * gate) : null,
      mobility: Object.values(indices).some(i => i < 0) ? null : mobilityScore(indices),
    },
    inputs: { recoilV: R, recoilVar: V, hipIndex, hipAngle: H, lightGate: gate !== 1, indices, laser: mounts.laser.id, light: mounts.light.id },
  });
}

// Same-slot baseline capture for deltas: the slot's None or default record of the same weapon.
const baselines = new Map();
for (const row of rows) if (row.baseline) baselines.set(`${row.weapon}|${row.slot}`, row);
const summary = { date: new Date().toISOString().slice(0, 10), absolute: {}, delta: {}, groups: {} };
const count = (bucket, key, outcome) => { (bucket[key] ??= {})[outcome] = (bucket[key][outcome] ?? 0) + 1; };
const group = (name, item) => (summary.groups[name] ??= []).push(item);
for (const row of rows) {
  const base = baselines.get(`${row.weapon}|${row.slot}`);
  for (const stat of STATS) {
    const reading = row.readings[stat];
    if (reading == null) continue;
    const candidate = row.candidates[stat];
    {
      if (candidate == null) count(summary.absolute, stat, 'no-candidate');
      else {
        const outcome = Math.round(candidate) === reading ? 'match' : 'differ';
        count(summary.absolute, stat, outcome);
        if (outcome === 'differ') group(`${stat} absolute`, { weapon: row.weapon, cls: row.cls, slot: row.slot, id: row.id, reading, candidate: +candidate.toFixed(3) });
      }
    }
    if (!base || base === row || base.readings[stat] == null || candidate == null || base.candidates[stat] == null) { count(summary.delta, stat, 'no-baseline'); continue; }
    const observed = reading - base.readings[stat];
    const predicted = Math.round(candidate) - Math.round(base.candidates[stat]);
    const outcome = observed === predicted ? 'match' : 'differ';
    count(summary.delta, stat, outcome);
    if (outcome === 'differ') group(`${stat} delta`, { weapon: row.weapon, cls: row.cls, slot: row.slot, id: row.id, observed, predicted, reading, baseReading: base.readings[stat] });
  }
}
console.log(JSON.stringify({ absolute: summary.absolute, delta: summary.delta }));
for (const [name, items] of Object.entries(summary.groups)) {
  const byKey = {};
  for (const item of items) (byKey[`${item.slot}:${item.id}`] ??= []).push(item);
  console.log(`\n## ${name}: ${items.length}`);
  for (const [key, list] of Object.entries(byKey).sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    const s = list[0];
    console.log(`${key} x${list.length} [${[...new Set(list.map(i => i.weapon))].slice(0, 12).join(',')}] e.g. ${s.observed != null ? `observed=${s.observed} predicted=${s.predicted}` : `reading=${s.reading} candidate=${s.candidate}`}`);
  }
}
if (outFile) writeFileSync(resolve(root, outFile), JSON.stringify(summary, null, 1) + '\n');
