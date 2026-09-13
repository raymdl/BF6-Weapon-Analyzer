import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { computeAttPts, resetAttsForWeapon } from '../sim/loadout.js';
import { createShareCodec } from '../sim/share-state.js';
import { setSimContext, simulateSpread, shotIntervalAfter, selectedRecoilAmountFor, spreadRecoveries, applySpreadRecovery } from '../sim/core.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const weapons = read('../data/weapons.json');
const attachments = read('../data/attachments.json');
const ammo = read('../data/ammo.json');
const balance = read('../data/balance_tables.json');
const data = { ...attachments, ...ammo };
setAttachmentContext({ ...data, ...balance });
const weapon = id => weapons.find(w => w.id === id);
const defaults = w => {
  const atts = {};
  resetAttsForWeapon(atts, w, data);
  return atts;
};
const loadout = (w, changes = {}) => ({ ...defaults(w), ...changes });
const build = (w, changes = {}) => applyAttachments(w, loadout(w, changes));

test('barrel ADS uses generated weapon-specific steps for every supported selection', () => {
  const source = read('../reference-data/provenance/frosty-barrel-ads-generated.json');
  for (const row of source.rows) {
    const barrel = attachments.BARRELS.find(b => b.id === row.barrel);
    assert.equal(barrel.adsTimeTierModByWeapon[row.weapon], row.step);
    assert.equal(build(weapon(row.weapon), { barrel: row.barrel, grip: 'none', laser: 'none' })._adsTimeTierMod, row.step);
  }
  for (const [wid, atts] of Object.entries(attachments.WEAPON_ATTS)) {
    for (const id of atts.barrel ?? []) {
      if (id === 'none') continue;
      const barrel = attachments.BARRELS.find(b => b.id === id);
      assert.ok(Number.isInteger(barrel.adsTimeTierModByWeapon?.[wid]), `${wid}/${id}`);
      assert.equal(Object.hasOwn(barrel, 'adsTimeTierMod'), false);
    }
  }
  assert.equal(build(weapon('m4a1'), { barrel: 'basic' })._adsTimeMs, 200);
  for (const barrel of ['vssm_suppressed', 'vssm_suppressed_asm']) {
    assert.equal(build(weapon('vssm'), { barrel })._adsTimeMs, 250);
  }
  // A source update must change the calculation, without editing a barrel rule.
  const barrels = structuredClone(attachments.BARRELS);
  barrels.find(b => b.id === 'basic').adsTimeTierModByWeapon.m4a1 = 0;
  try {
    setAttachmentContext({ BARRELS: barrels });
    assert.equal(build(weapon('m4a1'), { barrel: 'basic' })._adsTimeMs, 250);
  } finally {
    setAttachmentContext({ BARRELS: attachments.BARRELS });
  }
});

test('generated grip, laser and magazine fields reach the runtime, including shared rail slots', () => {
  const source = read('../reference-data/provenance/frosty-attachment-handling-generated.json');
  for (const row of source.rows) {
    const record = row.slot === 'mag'
      ? attachments.WEAPON_MAG[row.weapon].mags[row.attachment]
      : attachments[row.slot === 'grip' ? 'GRIPS' : 'LASERS']
        .find(a => a.id === row.attachment).frostyModifiers?.[row.weapon];
    for (const [field, value] of Object.entries(row.fields)) {
      assert.equal(record[field], value, `${row.weapon}/${row.attachment}/${field}`);
    }
  }
  const grips = structuredClone(attachments.GRIPS);
  const lasers = structuredClone(attachments.LASERS);
  grips.find(g => g.id === 'canted_stubby').frostyModifiers.vz61.adsTimeTierMod = 0;
  lasers.find(l => l.id === '50mw_blue').frostyModifiers.m4a1.hipSpreadTierMod = 0;
  const vz = weapon('vz61');
  const m4 = weapon('m4a1');
  const originalVzAdsTier = build(vz, { rail: { type: 'grip', id: 'canted_stubby' } })._adsTimeTierMod;
  assert.equal(build(m4, { laser: '50mw_blue' })._hipSpreadTierMod, -2);
  try {
    setAttachmentContext({ GRIPS: grips, LASERS: lasers });
    assert.equal(build(vz, { rail: { type: 'grip', id: 'canted_stubby' } })._adsTimeTierMod, originalVzAdsTier - 1);
    assert.equal(build(m4, { laser: '50mw_blue' })._hipSpreadTierMod, 0);
  } finally {
    setAttachmentContext({ GRIPS: attachments.GRIPS, LASERS: attachments.LASERS });
  }
  assert.equal(attachments.WEAPON_MAG.m4a1.mags['20_rnd'].adsTimeTierShift, -1);
  assert.equal(build(m4, { mag: '20_rnd' })._adsTimeMs, balance.ADS_SPD_TIERS[6]);
  assert.equal(attachments.WEAPON_MAG.m60.mags['100_rnd'].adsTimeTierShift, 0);
  assert.equal(attachments.WEAPON_MAG.m60.defAds, 1);
});

test('recovered handling identities and source base coordinates preserve current results', () => {
  const source = read('../reference-data/provenance/frosty-attachment-handling-generated.json');
  const identities = read('../reference-data/provenance/frosty-handling-mapping-followup.json');
  for (const identity of identities.rows) {
    const row = source.rows.find(r => r.weapon === identity.weapon && r.slot === identity.slot && r.attachment === identity.attachment);
    assert.ok(row && Object.keys(row.fields).length > 0, `${identity.weapon}/${identity.attachment}`);
    assert.deepEqual(row.deferred, {});
  }
  for (const row of read('../reference-data/provenance/frosty-handling-coordinate-proof.json').rows) {
    const result = build(weapon(row.weapon), { mag: row.mag });
    assert.equal(result._adsTimeMs, row.before.adsMs);
    assert.equal(result._adsMoveSpeedMult, row.before.adsMove);
  }
  assert.equal(attachments.WEAPON_MAG.m60.defAms, 4);
  assert.equal(attachments.WEAPON_MAG.pw7a2.defAms, 8);
  for (const wid of ['m39emr', 'm417a2']) {
    const row = source.rows.find(r => r.weapon === wid && r.slot === 'laser' && r.attachment === '5mw_green');
    assert.equal(row.fields.hipSpreadTierMod, -2);
    assert.ok(row.sourceAttachments.every(path => !path.includes('IRSP')));
  }
});

test('sniper brakes use per-weapon Frosty amount steps in ADS and hip', () => {
  const source = read('../reference-data/provenance/frosty-sniper-brakes-generated.json');
  for (const row of source.rows) {
    const w = weapon(row.weapon);
    const result = build(w, { muzzle: row.muzzle, grip: 'none', ergo: 'none', ammo: 'standard', laser: 'none' });
    assert.equal(result.recoilV, +(w.recoilV * (balance.RECOIL_MULT[w.id] ?? 0.94) ** row.fields.adsRecoilTierMod).toFixed(3));
    assert.equal(result.recoil.hip.amountExp, w.recoil.hip.amountExp + row.fields.hipRecoilTierMod);
  }
  assert.equal(build(weapon('m2010esr'), { muzzle: 'sp_brake', ammo: 'standard' }).recoilV, 1.035);
  const m4 = weapon('m4a1');
  assert.equal(build(m4, { muzzle: 'sp_brake', ammo: 'standard' }).recoilV,
    +(m4.recoilV * (balance.RECOIL_MULT.m4a1 ?? 0.94)).toFixed(3));
  const smooth = build(weapon('m2010esr'), { muzzle: 'comp_brake', ammo: 'standard' });
  assert.equal(smooth.recoil.ads.duration, 0.066667);
  assert.equal(smooth.recoil.hip.duration, 0.066667);
  assert.equal(smooth._adsRecoilDecayMult, 1.728);
});

test('Frosty lights scale hip growth and recovery without changing ADS or base records', () => {
  const w = weapon('m4a1');
  const before = structuredClone(w);
  const base = build(w);
  for (const light of ['flashlight', 'hip_taclight']) {
    const lit = build(w, { light });
    assert.equal(lit.spreadDyn.hip.inc, base.spreadDyn.hip.inc * 0.666667);
    assert.deepEqual(lit.spread, base.spread, 'a light does not change the spread bounds');
    assert.deepEqual(lit.spreadDyn.ads, base.spreadDyn.ads);
    for (const stanceState of ['stand', 'move']) {
      setSimContext({ aimState: 'hip', stanceState });
      const normal = spreadRecoveries(base);
      const active = spreadRecoveries(lit);
      assert.equal(active.firing.coef, normal.firing.coef * 1.837117);
      assert.equal(active.firing.offset, normal.firing.offset * 0.666667);
      assert.equal(active.notFiring.offset, normal.notFiring.offset * 0.666667);
      assert.equal(active.firing.exp, normal.firing.exp);
      assert.equal(active.notFiring.coef, normal.notFiring.coef);
      assert.ok(simulateSpread(lit, 20).at(-1) < simulateSpread(base, 20).at(-1));
      setSimContext({ aimState: 'ads', stanceState });
      assert.deepEqual(spreadRecoveries(lit), spreadRecoveries(base));
      assert.deepEqual(simulateSpread(lit, 20), simulateSpread(base, 20));
    }
    assert.equal(lit.spreadDyn.hip.idleOffset, base.spreadDyn.hip.idleOffset, 'idle state remains unimplemented');
  }
  assert.deepEqual(w, before);
  assert.deepEqual(build(w, { light: 'ads_taclight' }).spreadDyn, base.spreadDyn);
});

test('combined-slot lights and combo lasers use hip factors and preserve laser tiers', () => {
  const w = weapon('p18');
  const base = build(w);
  for (const laser of ['flashlight', 'combo_red', 'combo_green']) {
    const lit = build(w, { rail: { type: laser === 'flashlight' ? 'light' : 'laser', id: laser } });
    assert.equal(lit.spreadDyn.hip.inc, base.spreadDyn.hip.inc * 0.666667);
    assert.equal(lit._hipSpreadFiringDecCoefMult, 1.837117);
    assert.equal(lit._hipSpreadNotFiringDecOffsetMult, 0.666667);
    const plainLaser = laser === 'combo_red' ? '5mw_red' : laser === 'combo_green' ? '5mw_green' : 'none';
    assert.deepEqual(lit.spread.hipStand, build(w, { rail: plainLaser === 'none' ? null : { type: 'laser', id: plainLaser } }).spread.hipStand);
  }
  const both = build(weapon('kord6p67'), { light: 'flashlight', laser: 'combo_green' });
  const plain = build(weapon('kord6p67'));
  assert.equal(both.spreadDyn.hip.inc, plain.spreadDyn.hip.inc * (0.666667 ** 2));
  assert.equal(both._hipSpreadFiringDecCoefMult, 1.837117 ** 2);
});

test('Frosty collateral table matches ES 5.7 panels and clamps M121 A2 Tungsten', () => {
  const es = weapon('es57');
  for (const [ammo, exact, displayed] of [
    ['standard', 0.666667, '0.67'], ['penetration', 0.833334, '0.83'],
    ...['frangible', 'hollow_pt', 'subsonic', 'subsonic_hp'].map(id => [id, 0.571429, '0.57']),
  ]) {
    const result = build(es, { ammo })._collateralMult;
    assert.equal(result, exact);
    assert.equal(result.toFixed(2), displayed);
  }
  assert.equal(build(weapon('m121a2'), { ammo: 'penetration' })._collateralMult, 1);
  for (const w of weapons) {
    for (const ammo of Object.keys(data.WEAPON_AMMO[w.id].ammo)) {
      const result = build(w, { ammo })._collateralMult;
      assert.ok(result >= 0 && result <= 1, `${w.id}/${ammo}`);
    }
  }
});

test('source sway factors retain compact-magazine strength and combine with muzzle effects', () => {
  const w = weapon('m4a1');
  assert.equal(build(w)._weaponSwayMult, 1);
  assert.equal(build(w, { muzzle: 'long_supp' })._weaponSwayMult, 1.5);
  assert.equal(build(w, { mag: '20_fast' })._weaponSwayMult, 0.6666667);
  assert.equal(build(w, { mag: '20_rnd' })._weaponSwayMult, 0.4444444);
  assert.ok(Math.abs(build(w, { mag: '20_fast', muzzle: 'long_supp' })._weaponSwayMult - 1) < 0.000001);
});

test('source spotting factors combine suppressor and subsonic without a special-case range', () => {
  const w = weapon('pw5a3');
  assert.equal(build(w)._minimapSpot, 150);
  assert.equal(build(w, { ammo: 'subsonic' })._minimapSpot, 64.28571);
  assert.equal(build(w, { ammo: 'subsonic' })._worldSpot, 27);
  const combined = build(w, { ammo: 'subsonic', muzzle: 'std_supp' });
  assert.ok(Math.abs(combined._minimapSpot - 9) < 0.00001);
  assert.equal(combined._worldSpot, 0);
  for (const w of weapons.filter(w => ammo.WEAPON_AMMO[w.id]?.ammo.frangible != null)) {
    assert.equal(build(w, { ammo: 'frangible' })._healthRegenDelayS, 9, w.id);
  }
});

test('EF88 standing ADS spread starts at the confirmed 0.05 degree floor', () => {
  const w = weapon('ef88');
  const result = build(w);
  assert.deepEqual(w.spread.adsStand, [0.05, 7]);
  assert.deepEqual(result.spread.adsStand, [0.05, 7]);
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  assert.equal(simulateSpread(result, 1)[0], 0.05);
});

test('Frosty-reviewed grip movement and Flechette delays match captured panels', () => {
  for (const [id, expected] of [['svk86', 0.42], ['ks18k', 0.6], ['db12', 0.6]]) {
    const w = weapon(id);
    for (const prefix of ['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby']) {
      assert.equal(build(w, { grip: `${prefix}_${id}` })._adsMoveSpeedMult, expected);
    }
  }
  for (const id of ['ks18k', 'db12', 'm1014', 'm87a1']) {
    const w = weapon(id);
    assert.equal(build(w, { ammo: 'flechette' })._healthRegenDelayS, 7);
    assert.equal(build(w, { ammo: 'buckshot' })._healthRegenDelayS, 5);
  }
});

test('Factory and Full Angled use the source sprint and deploy tier', () => {
  for (const [id, grip, expected] of [
    ['lmr27', 'factory_angled_lmr27', 133], ['db12', 'factory_angled_db12', 100],
    ['l115', 'full_angled_sr', 133], ['m2010esr', 'full_angled_sr', 133],
    ['miniscout', 'full_angled_sr', 100], ['psr', 'full_angled_sr', 167],
    ['sv98', 'full_angled_sr', 133],
  ]) {
    const w = weapon(id);
    const result = build(w, { grip });
    assert.equal(Math.round(result._sprintRecoveryMs), expected, id);
    assert.ok(result._deployTimeMs < build(w, { grip: 'none' })._deployTimeMs, id);
  }
});

test('M16A4 A3 Receiver removes burst gaps and applies source recoil effects in both aim states', () => {
  const w = weapon('m16a4');
  const original = structuredClone(w);
  const base = build(w);
  const auto = build(w, { ergo: 'full_auto' });
  assert.equal(base.fireMode, 'burst');
  assert.equal(base.burstRounds, 3);
  assert.equal(base.burstBurstsPerMinute, 224.999);
  assert.equal(auto.fireMode, 'auto');
  assert.equal(auto.rpm, 771.428);
  assert.equal(auto.burstRounds, undefined);
  assert.ok(shotIntervalAfter(base, 3) > shotIntervalAfter(base, 2));
  assert.equal(shotIntervalAfter(auto, 3), 60 / 771.428);
  assert.deepEqual(auto.spreadDyn, base.spreadDyn);
  assert.equal(auto.recoilIncAds, 0.36);
  for (const aimState of ['ads', 'hip']) {
    setSimContext({ aimState });
    assert.ok(selectedRecoilAmountFor(auto) > selectedRecoilAmountFor(base));
    assert.equal(auto.recoil[aimState].duration, 0.0244);
    assert.equal(base.recoil[aimState].duration, 0.025);
  }
  assert.equal(auto.recoil.hip.amountExp, -3);
  setSimContext({ aimState: 'ads' });
  assert.deepEqual(w, original);
});

test('VSSM Folding Stock enables ADS spread growth only for the selected loadout', () => {
  const w = weapon('vssm');
  const original = structuredClone(w);
  const base = build(w);
  const auto = build(w, { ergo: 'full_auto_vssm' });
  assert.equal(base.recoilIncAds, 0);
  assert.equal(auto.recoilIncAds, 0.409);
  assert.equal(auto.spreadDyn.ads.inc, 0.409);
  assert.equal(auto.spreadDyn.ads.firingCoef, 1.2);
  assert.equal(auto.spreadDyn.ads.firingExp, 2.5);
  assert.equal(auto.spreadDyn.ads.firingOffset, 2.7);
  for (const stanceState of ['stand', 'move']) {
    setSimContext({ aimState: 'ads', stanceState });
    const semiShots = simulateSpread(base, 10);
    const autoShots = simulateSpread(auto, 10);
    assert.ok(semiShots.every(value => value === semiShots[0]));
    assert.ok(autoShots[9] > autoShots[0]);
  }
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  assert.equal(build(w).recoilIncAds, 0);
  assert.deepEqual(w, original);
});

test('10-point Compensator retains Flash Comp effects without hiding world spotting', () => {
  const w = weapon('m433');
  const comp = build(w, { muzzle: 'compensator' });
  const flash = build(w, { muzzle: 'flash_comp' });
  const base = build(w);
  assert.equal(comp._worldSpot, base._worldSpot);
  assert.equal(comp._worldSpot, 54);
  assert.equal(flash._worldSpot, 0);
  for (const key of ['recoilV', 'recoilVar', '_adsRecoilDecayMult', '_minimapSpot', '_sprintRecoveryMs']) {
    assert.equal(comp[key], flash[key], key);
  }
  assert.equal(computeAttPts(loadout(w, { muzzle: 'compensator' }), w, data)
    - computeAttPts(loadout(w), w, data), 10);
  assert.notEqual(comp.recoilVar, build(w, { muzzle: 'linear_comp' }).recoilVar);
});

test('Hybrid suppressors apply recoil, spotting, hip-fire and draw effects through the resolver', () => {
  const w = weapon('m433');
  const base = build(w);
  const long = build(w, { muzzle: 'long_supp' });
  const light = build(w, { muzzle: 'light_supp' });
  for (const [muzzle, points, hip] of [
    ['hybrid_supp_l', 30, 1], ['hybrid_supp_s', 40, 1], ['hybrid_supp_k', 50, 0],
  ]) {
    const result = build(w, { muzzle });
    assert.equal(result._worldSpot, 0);
    assert.equal(result._minimapSpot, 21);
    assert.equal(result._adsRecoilDecayMult, light._adsRecoilDecayMult);
    assert.equal(result.recoilV, +(w.recoilV * balance.RECOIL_MULT[w.id]).toFixed(3));
    assert.equal(result.recoilVar, base.recoilVar);
    assert.equal(result._hipSpreadTierMod, hip);
    assert.deepEqual(result.spread, hip ? light.spread : base.spread);
    assert.equal(result._adsTimeMs, base._adsTimeMs);
    assert.equal(result._projectileVelocityMps, base._projectileVelocityMps);
    assert.equal(computeAttPts(loadout(w, { muzzle }), w, data)
      - computeAttPts(loadout(w), w, data), points);
    if (muzzle === 'hybrid_supp_l') {
      assert.equal(Math.round(result._sprintRecoveryMs), 200);
      assert.ok(result._deployTimeMs > base._deployTimeMs);
      assert.equal(result._weaponSwayMult, long._weaponSwayMult);
    } else {
      assert.equal(result._sprintRecoveryMs, base._sprintRecoveryMs);
      assert.equal(result._deployTimeMs, base._deployTimeMs);
      assert.equal(result._weaponSwayMult, light._weaponSwayMult);
    }
  }
});

test('Canted Vertical improves L110 hip-fire and changes 200-round sprint recovery from 350 to 267 ms', () => {
  const w = weapon('l110');
  const base = build(w, { mag: '200_rnd' });
  const canted = build(w, { mag: '200_rnd', grip: 'canted_vertical' });
  assert.equal(Math.round(base._sprintRecoveryMs), 350);
  assert.equal(Math.round(canted._sprintRecoveryMs), 267);
  assert.ok(canted._deployTimeMs < base._deployTimeMs);
  assert.equal(canted._hipSpreadTierMod, -2);
  assert.ok(canted.spread.hipStand[0] < base.spread.hipStand[0]);
  assert.equal(canted._adsTimeMs, base._adsTimeMs);
  assert.equal(canted.recoilV, base.recoilV);
  assert.equal(computeAttPts(loadout(w, { grip: 'canted_vertical' }), w, data)
    - computeAttPts(loadout(w), w, data), 30);
  const stacked = build(w, { mag: '200_rnd', grip: 'canted_vertical', muzzle: 'hybrid_supp_l' });
  assert.equal(stacked._hipSpreadTierMod, -1);
  assert.equal(Math.round(stacked._sprintRecoveryMs), 300);
});

test('new attachments preserve old share tokens and round-trip with traced weapon availability', () => {
  const codec = createShareCodec({ ...data, defaultAttsForWeapon: defaults });
  const w = weapon('m433');
  assert.equal(codec.decodeAtts(w, 'M11').muzzle, 'long_supp');
  assert.equal(codec.decodeAtts(w, 'M14').muzzle, 'compensator');
  assert.equal(codec.decodeAtts(weapon('interdictor'), 'G47').grip, 'slim_angled_interdictor');
  for (const muzzle of ['hybrid_supp_l', 'hybrid_supp_s', 'hybrid_supp_k']) {
    const atts = loadout(w, { muzzle });
    assert.deepEqual(codec.decodeAtts(w, codec.encodeAtts(w, atts)), atts);
    assert.ok(!attachments.WEAPON_ATTS.m87a1.muzzle.includes(muzzle));
  }
  const l110 = weapon('l110');
  const atts = loadout(l110, { grip: 'canted_vertical' });
  assert.deepEqual(codec.decodeAtts(l110, codec.encodeAtts(l110, atts)), atts);
  assert.ok(!attachments.WEAPON_ATTS.m433.grip.includes('canted_vertical'));
});

test('weapon-specific iron and ammunition prices reach loadout totals', () => {
  for (const id of ['l115', 'm2010esr', 'miniscout', 'psr', 'sv98']) {
    const w = weapon(id);
    assert.equal(computeAttPts(loadout(w, { sight: 'iron' }), w, data)
      - computeAttPts(loadout(w, { sight: 'std_optic' }), w, data), 15 - attachments.SIGHTS.find(a => a.id === 'std_optic').pts);
  }
  assert.equal(ammo.WEAPON_AMMO.rpk74m.ammo.synthetic, 20);
  assert.equal(ammo.WEAPON_AMMO.rpk74m.ammo.hollow_pt, 15);
  assert.equal(ammo.WEAPON_AMMO.scw10.ammo.hollow_pt, 20);
  assert.equal(attachments.SIGHTS[0].pts, 5);
});

test('hip recoil stacks grip, muzzle and ammunition tiers without mutating the base weapon', () => {
  const w = weapon('m433');
  const original = structuredClone(w);
  const base = build(w);
  const result = build(w, { grip: 'ribbed_vert', muzzle: 'dp_brake', ammo: 'penetration' });
  setSimContext({ aimState: 'hip' });
  assert.ok(Math.abs(selectedRecoilAmountFor(result) / selectedRecoilAmountFor(base) - w.recoil.hip.amountMult ** 3) < 1e-10);
  const combined = build(weapon('vz61'), { rail: { type: 'grip', id: 'canted_stubby' } });
  assert.equal(combined.recoil.hip.amountExp, weapon('vz61').recoil.hip.amountExp + 3);
  assert.deepEqual(w, original);
  setSimContext({ aimState: 'ads' });
});

test('Frosty burst-mode selectors apply the sourced ADS and hip recoil tiers', () => {
  for (const [id, ergo] of [
    ...['kord6p67', 'sg553r', 'pw5a3', 'kv9', 'cz3a1', 'umg40'].map(id => [id, 'burst_training']),
    ['sl9', 'burst_mode'], ['grtbc', 'grtbc_burst_mode'],
  ]) {
    const w = weapon(id);
    const rawHip = structuredClone(w.recoil.hip);
    const result = build(w, { ergo });
    assert.equal(result.fireMode, 'burst', id);
    assert.equal(result.recoil.hip.dirVarExp, w.recoil.hip.dirVarExp + 3, id);
    assert.equal(result.recoil.hip.amountExp, w.recoil.hip.amountExp + (id === 'grtbc' ? 1 : 0), id);
    assert.deepEqual(w.recoil.hip, rawHip);
    assert.equal(build(w).fireMode, 'auto', id);
    assert.equal(attachments.ERGOS.find(a => a.id === ergo).assumed, undefined);
  }
  const linear = attachments.MUZZLES.find(a => a.id === 'linear_comp');
  assert.equal(linear.assumed, undefined);
  assert.equal(linear.adsRecoilTierMod, -1);
  assert.equal(linear.hipRecoilTierMod, -1);
  assert.equal(linear.adsRecoilVariationTierMod, 3);
  assert.equal(linear.hipRecoilVariationTierMod, 3);
});

test('Folding Stock applies hip effects and source decay overrides without changing the base', () => {
  const base = build(weapon('vssm'));
  const result = build(weapon('vssm'), { ergo: 'full_auto_vssm' });
  assert.equal(result.spreadDyn.hip.inc, 0.736);
  assert.equal(result.spreadDyn.hip.firingCoef, 0.5);
  assert.equal(result.spreadDyn.hip.firingOffset, 4.86);
  assert.equal(result.recoil.hip.dirVarExp, base.recoil.hip.dirVarExp - 20);
  for (const state of ['ads', 'hip']) {
    assert.equal(result.recoil[state].decFactor, 76);
    assert.equal(base.recoil[state].decFactor, 13.7);
    assert.equal(result.recoil[state].decTimeExp, 1.24);
    assert.equal(base.recoil[state].decTimeExp, 0.5555);
    assert.equal(weapon('vssm').recoil[state].decFactor, 13.7);
    assert.equal(weapon('vssm').recoil[state].decTimeExp, 0.5555);
  }
});

test('Smooth recoil resolves Frosty duration and recovery in both aim states without changing the base', () => {
  const w = weapon('m433');
  for (const muzzle of ['comp_brake', 'flash_comp', 'long_supp', 'light_supp',
    'compensator', 'hybrid_supp_l', 'hybrid_supp_s', 'hybrid_supp_k']) {
    const result = build(w, { muzzle });
    assert.equal(result._adsRecoilDecayMult, 1.2);
    assert.equal(result._hipRecoilDecayMult, 1.2);
    for (const aim of ['ads', 'hip']) {
      assert.equal(result.recoil[aim].duration, 0.05);
      assert.equal(w.recoil[aim].duration, 0.025);
    }
  }
  const standard = build(w, { muzzle: 'std_supp' });
  assert.equal(standard.recoil.ads.duration, 0.025);
  assert.equal(standard._adsRecoilDecayMult, 1);
  assert.equal(standard._hipRecoilDecayMult, 1);
  const combined = build(weapon('m16a4'), { muzzle: 'light_supp', ergo: 'full_auto' });
  assert.equal(combined.recoil.ads.duration, 0.0494);
  assert.equal(combined.recoil.hip.duration, 0.0494);
});

test('Smooth Bolt values follow the weapon and muzzle, not the weapon class', () => {
  const audit = read('../reference-data/provenance/frosty-recoil-duration-audit-2026-09-11.json');
  const before = JSON.stringify(attachments.MUZZLES);
  for (const row of audit.boltPairs) {
    const w = weapon(row.weapon);
    const result = build(w, { muzzle: row.muzzle });
    for (const aim of ['ads', 'hip']) {
      assert.equal(result.recoil[aim].duration, row.duration);
      assert.equal(w.recoil[aim].duration, 0.025);
    }
    assert.equal(result._adsRecoilDecayMult, row.recoveryFactor);
    assert.equal(result._hipRecoilDecayMult, row.recoveryFactor);
  }
  // A different muzzle on the same rifle still selects the ordinary Smooth asset.
  const hybrid = build(weapon('miniscout'), { muzzle: 'hybrid_supp_l' });
  assert.equal(hybrid.recoil.ads.duration, 0.05);
  assert.equal(hybrid._adsRecoilDecayMult, 1.2);
  const standard = build(weapon('miniscout'), { muzzle: 'std_supp' });
  assert.equal(standard.recoil.ads.duration, 0.025);
  assert.equal(standard._adsRecoilDecayMult, 1);
  assert.equal(JSON.stringify(attachments.MUZZLES), before);
});

test('VSSM barrel spotting applies to both selectable suppressed barrels', () => {
  const w = weapon('vssm');
  for (const [barrel, minimap] of [['vssm_suppressed', 9], ['vssm_suppressed_asm', 21]]) {
    assert.equal(build(w, { barrel })._worldSpot, 0);
    assert.equal(build(w, { barrel })._minimapSpot, minimap);
  }
});

test('source-mapped subsonic and slug effects use current recoil and spread models', () => {
  const w = weapon('scw10');
  const base = build(w);
  const sub = build(w, { ammo: 'subsonic' });
  assert.equal(sub.recoilV, +(w.recoilV * balance.RECOIL_MULT.scw10).toFixed(3));
  assert.equal(sub.recoil.hip.amountExp, base.recoil.hip.amountExp + 1);
  assert.equal(build(weapon('ggh22'), { ammo: 'subsonic' }).recoilV, build(weapon('ggh22')).recoilV);
  for (const id of ['ks18k', 'm87a1', 'db12', 'm1014']) {
    const raw = weapon(id);
    const slug = build(raw, { ammo: 'slugs' });
    assert.equal(slug.recoilIncAds, 0.05);
    assert.equal(slug.spreadDyn.ads.inc, 0.05);
    assert.equal(slug.recoil.hip.amountExp, raw.recoil.hip.amountExp - 1);
    assert.equal(slug.pellets, 1);
  }
});

test('compact magazine secondary effects reach the existing moving spread and sway outputs', () => {
  const w = weapon('m433');
  const base = build(w);
  const compact = build(w, { mag: '20_rnd' });
  const fast = build(w, { mag: '20_fast' });
  assert.equal(compact._movingAdsSpreadTierMod, base._movingAdsSpreadTierMod + 1);
  assert.notEqual(compact.spread.adsMove[0], base.spread.adsMove[0]);
  assert.equal(fast._weaponSwayMult, base._weaponSwayMult * 0.6666667);
  assert.equal(compact._weaponSwayMult, base._weaponSwayMult * 0.4444444);
  const rpk = weapon('rpk74m');
  const rpkBase = build(rpk);
  for (const mag of ['30_rnd', '30_fast']) {
    const selected = build(rpk, { mag });
    assert.equal(selected.spread.adsMove[0], 0.22);
    assert.equal(rpkBase.spread.adsMove[0], 0.32);
    assert.equal(selected._weaponSwayMult, rpkBase._weaponSwayMult * 0.6666667);
    assert.deepEqual(selected.spreadDyn, rpkBase.spreadDyn);
    assert.equal(selected.mag, 30);
    assert.equal(+selected.tacRld.toFixed(3), mag === '30_fast' ? 2.464 : 2.784);
  }
});

test('reviewed Mini Scout and BROD 3 magazines match captured handling values', () => {
  const scout = weapon('miniscout');
  assert.equal(build(scout)._adsMoveSpeedMult, 0.67);
  for (const mag of ['15_rnd', '15_fast', '20_rnd', '20_fast']) {
    const selected = build(scout, { mag });
    assert.equal(selected._adsMoveSpeedMult, 0.6);
    assert.equal(selected._adsTimeMs, 250);
    assert.equal(+selected.tacRld.toFixed(3), mag.endsWith('fast') ? 2.065 : 2.334);
  }
  for (const mag of ['36_rnd', '40_rnd', '40_fast']) {
    const brod = build(weapon('brod3'), { mag });
    const fast = mag === '40_fast';
    assert.equal(Math.round(brod._sprintRecoveryMs), fast ? 200 : 167);
    assert.equal(+brod.deployT.toFixed(3), fast ? 0.633 : 0.533);
    assert.equal(+brod.tacRld.toFixed(3), fast ? 1.962 : 2.217);
  }
});

test('AK4D Heavy preserves about two thirds of Basic excess spread through firing and recovery', () => {
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  const base = build(weapon('ak4d'));
  const heavy = build(weapon('ak4d'), { barrel: 'heavy' });
  const floor = base.spread.adsStand[0];
  const basicShots = simulateSpread(base, 15);
  const heavyShots = simulateSpread(heavy, 15);
  for (let i = 0; i < basicShots.length; i++) {
    assert.ok(Math.abs((heavyShots[i] - floor) - (basicShots[i] - floor) * 0.666667) < 0.00001);
  }
  const tail = (w, shots, seconds) => applySpreadRecovery(
    shots.at(-1) + w.spreadDyn.ads.inc, seconds, spreadRecoveries(w).notFiring, floor, 7);
  for (const seconds of [0.02, 0.05, 0.1, 0.2]) {
    assert.ok(Math.abs((tail(heavy, heavyShots, seconds) - floor)
      - (tail(base, basicShots, seconds) - floor) * 0.666667) < 0.00001);
  }
});

test('Heavy, Heavy Extended and Cryo change ADS spread without changing hip spread or recovery', () => {
  const w = weapon('b36a4');
  const base = build(w);
  for (const barrel of ['heavy', 'heavy_ext', 'cryo']) {
    assert.ok(attachments.WEAPON_ATTS[w.id].barrel.includes(barrel));
    const result = build(w, { barrel });
    assert.equal(result.recoilIncAds, base.recoilIncAds * 0.666667);
    assert.deepEqual(result.spread, base.spread);
    assert.deepEqual(result.spreadDyn.hip, base.spreadDyn.hip);
    for (const stanceState of ['stand', 'move']) {
      setSimContext({ aimState: 'hip', stanceState });
      assert.deepEqual(spreadRecoveries(result), spreadRecoveries(base));
      assert.deepEqual(simulateSpread(result, 15), simulateSpread(base, 15));
      setSimContext({ aimState: 'ads', stanceState });
      assert.equal(spreadRecoveries(result).firing.coef, spreadRecoveries(base).firing.coef * 1.837117);
      assert.equal(spreadRecoveries(result).firing.offset, spreadRecoveries(base).firing.offset * 0.666667);
      assert.equal(spreadRecoveries(result).notFiring.offset, spreadRecoveries(base).notFiring.offset * 0.666667);
    }
  }
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
});

test('manual-cycle cadence and shell reloads follow Frosty 1.4.2.5 and the in-game panels', () => {
  // rounds * 60 / (BoltActionTime / BoltActionSpeed + BoltActionDelay + rounds * 60 / RateOfFire)
  const cycleRpm = (time, speed, delay, rate, rounds = 1) => rounds * 60 / (time / speed + delay + rounds * 60 / rate);
  for (const [id, time, speed, panel] of [
    ['m2010esr', 1.2, 1.028571, 43], ['sv98', 1.233334, 0.9, 38], ['psr', 1.216667, 0.9, 38],
    ['miniscout', 1, 0.9310338, 47], ['l115', 1.133334, 1.03, 46], ['interdictor', 1.68, 1, null],
  ]) {
    const rpm = cycleRpm(time, speed, 0, 299.999);
    assert.ok(Math.abs(weapon(id).rpm - rpm) < 1e-9, id);
    if (panel != null) assert.equal(Math.floor(rpm), panel, `${id} panel RPM`);
  }
  const m87a1 = weapon('m87a1');
  assert.ok(Math.abs(m87a1.rpm - cycleRpm(0.500001, 1, 0.100001, 1799.999)) < 1e-9);
  assert.equal(Math.floor(m87a1.rpm), 94);

  const db12 = weapon('db12');
  assert.equal(db12.fireMode, 'pump');
  assert.equal(db12.burstRounds, 2);
  assert.ok(Math.abs(db12.burstRounds * db12.burstBurstsPerMinute - 150) < 0.01, 'DB-12 panel shows 150 RPM');
  assert.ok(Math.abs(shotIntervalAfter(db12, 1) - 60 / 359.999) < 1e-9);
  assert.ok(Math.abs(shotIntervalAfter(db12, 2) - (0.433334 + 0.033334 + 60 / 359.999)) < 1e-6);

  // ReloadDelay + ReloadTimeBulletsLeft + PostReloadDelay equals the panel reload for shell-fed shotguns.
  for (const [id, tacRld] of [['m87a1', 1.334], ['m1014', 1.784], ['db12', 2.348]]) {
    assert.equal(weapon(id).tacRld, tacRld, id);
    assert.equal(weapon(id).emptyRld, null, id);
  }
  // Revolvers have one reload entry for every ammo count.
  for (const id of ['m44', 'm357trait']) assert.equal(weapon(id).emptyRld, weapon(id).tacRld, id);
});
