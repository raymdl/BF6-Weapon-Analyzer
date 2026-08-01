import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { blankAtts } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

setAttachmentContext({
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  ERGOS: attachments.ERGOS,
  WEAPON_MAG: attachments.WEAPON_MAG,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
  AMMO: ammo.AMMO,
  RECOIL_MULT: balance.RECOIL_MULT,
  HIP_SPREAD_TIERS: balance.HIP_SPREAD_TIERS,
  HIP_SPREAD_BASE_IDX: balance.HIP_SPREAD_BASE_IDX,
  HIP_CLS: balance.HIP_CLS,
  BASE_HS_MULT: balance.BASE_HS_MULT,
  HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
  LIMB_CLASS: balance.LIMB_CLASS,
  LIMB_CLASS_MULT: balance.LIMB_CLASS_MULT,
  AUTO_HS_MULT: balance.AUTO_HS_MULT,
  MOVING_ACC_TIERS: balance.MOVING_ACC_TIERS,
  DEFAULT_MOV_TIER: balance.DEFAULT_MOV_TIER,
  ADS_SPD_TIERS: balance.ADS_SPD_TIERS,
  SPRINT_REC_TIERS: balance.SPRINT_REC_TIERS,
  PRIMARY_SPRINT_REC_TIERS: balance.PRIMARY_SPRINT_REC_TIERS,
  SIDEARM_SPRINT_REC_TIERS: balance.SIDEARM_SPRINT_REC_TIERS,
  DEPLOY_TIME_TIERS: balance.DEPLOY_TIME_TIERS,
  ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
});

const cases = [
  ['ak205', '30_rnd', 'mag_catch', 2.337],
  ['l115', '5_rnd', 'mag_catch', 2.587], ['l115', '7_fast', 'mag_catch', 2.289],
  ['p18', '17_rnd', 'mag_catch', 1.819], ['es57', '20_rnd', 'mag_catch', 1.897],
  ['m45a1', '7_rnd', 'mag_catch', 1.756], ['ggh22', '15_rnd', 'mag_catch', 1.819],
  ['vz61', '10_rnd', 'mag_catch', 2.008],
  ['pp19', '30_rnd', 'none', 2.467], ['pp19', '30_fast', 'none', 2.183],
  ['pp19', '53_rnd', 'none', 2.667], ['pp19', '53_rnd', 'mag_catch', 2.509],
  ['lmr27', '10_rnd', 'none', 3.034], ['lmr27', '10_fast', 'none', 2.685],
  ['lmr27', '10_fast', 'mag_catch', 2.526],
  ['sv98', '10_rnd', 'none', 2.984], ['sv98', '10_rnd', 'mag_catch', 2.807],
  ['m4a1', '20_rnd', 'none', 2.2], ['m4a1', '20_fast', 'none', 1.947],
  ['m4a1', '20_fast', 'mag_catch', 1.832],
  ['m277', '15_rnd', 'none', 2.11], ['m277', '15_rnd', 'mag_catch', 1.985],
  ['m277', '20_rnd', 'none', 2.384],
  ['m240l', '50_rnd', 'none', 4.25], ['m240l', '75_rnd', 'none', 7.1], ['m240l', '100_rnd', 'none', 7.1],
  ['rpk74m', '30_rnd', 'none', 2.784], ['rpk74m', '30_fast', 'none', 2.464], ['rpk74m', '95_rnd', 'none', 2.95],
  ['db12', '7_rnd', 'none', null], ['m1014', '4_rnd', 'none', null], ['m87a1', '5_rnd', 'none', null],
  // The four analytical cases §7 has specified since before this migration: a
  // ReloadSpeed = 1.0 control, the only ReloadSpeed > 1.0 weapon, the sole
  // 1.13-squared magazine, and the box-mag shotgun that is scalar despite its
  // tube-fed siblings. They are not weapons whose values changed, which is
  // exactly why they belong here — they pin what must have stayed still.
  ['grtbc', '30_rnd', 'none', 2.5], ['grtbc', '30_fast', 'none', 2.212],
  ['sl9', '30_rnd', 'none', 2.65], ['sl9', '30_rnd', 'mag_catch', 2.493],
  ['kts100', '45_fast', 'none', 2.545],
  ['ks18k', '4_rnd', 'none', 2.75], ['ks18k', '4_fast', 'none', 2.434],
];

const ui = readFileSync(join(root, 'ui/app.js'), 'utf8');
assert.match(ui, /toFixed\(3\) :/);
const report = [];
for (const [weaponId, magazineId, ergoId, expected] of cases) {
  const weapon = weaponById.get(weaponId);
  const atts = blankAtts();
  atts.barrel = attachments.WEAPON_ATTS[weaponId].barrelDef;
  atts.mag = magazineId;
  atts.ergo = ergoId;
  atts.ammo = ammo.WEAPON_AMMO[weaponId].def;
  const value = applyAttachments(weapon, atts).tacRld;
  assert.equal(value, expected, `${weaponId}/${magazineId}/${ergoId}`);
  const rendered = value == null ? '—' : (+value).toFixed(3);
  assert.doesNotMatch(rendered, /null|NaN|undefined/i);
  if (value == null) assert.equal(rendered, '—');
  else assert.match(rendered, /^\d+\.\d{3}$/);
  report.push({ key: `${weaponId}/${magazineId}/${ergoId}`, tacRldSeconds: value, rendered });
}

console.log(JSON.stringify({ kind: 'reload-phase6-stat-card-qa', cases: report.length, status: 'passed', report }, null, 2));
