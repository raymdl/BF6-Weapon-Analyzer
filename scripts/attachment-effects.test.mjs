import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';
import { computeAttPts, resetAttsForWeapon } from '../sim/loadout.js';
import { createShareCodec } from '../sim/share-state.js';
import { setSimContext, simulateSpread, shotIntervalAfter, selectedRecoilAmountFor, spreadRecoveries } from '../sim/core.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const weapons = read('../data/weapons.json');
const attachments = read('../data/attachments.json');
const ammo = read('../data/ammo.json');
const balance = read('../data/balance_tables.json');
const data = { ...attachments, ...ammo };
setAttachmentContext({ ...data, ...balance, HP_HS_HIGH: new Set(balance.HP_HS_HIGH) });
const weapon = id => weapons.find(w => w.id === id);
const defaults = w => {
  const atts = {};
  resetAttsForWeapon(atts, w, data);
  return atts;
};
const loadout = (w, changes = {}) => ({ ...defaults(w), ...changes });
const build = (w, changes = {}) => applyAttachments(w, loadout(w, changes));

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
      assert.equal(result._sprintRecoveryMs, 200);
      assert.ok(result._deployTimeMs > base._deployTimeMs);
      assert.equal(result._weaponSway, long._weaponSway);
    } else {
      assert.equal(result._sprintRecoveryMs, base._sprintRecoveryMs);
      assert.equal(result._deployTimeMs, base._deployTimeMs);
      assert.equal(result._weaponSway, light._weaponSway);
    }
  }
});

test('Canted Vertical improves L110 hip-fire and changes 200-round sprint recovery from 350 to 267 ms', () => {
  const w = weapon('l110');
  const base = build(w, { mag: '200_rnd' });
  const canted = build(w, { mag: '200_rnd', grip: 'canted_vertical' });
  assert.equal(base._sprintRecoveryMs, 350);
  assert.equal(canted._sprintRecoveryMs, 267);
  assert.ok(canted._deployTimeMs < base._deployTimeMs);
  assert.equal(canted._hipSpreadTierMod, -2);
  assert.ok(canted.spread.hipStand[0] < base.spread.hipStand[0]);
  assert.equal(canted._adsTimeMs, base._adsTimeMs);
  assert.equal(canted.recoilV, base.recoilV);
  assert.equal(computeAttPts(loadout(w, { grip: 'canted_vertical' }), w, data)
    - computeAttPts(loadout(w), w, data), 30);
  const stacked = build(w, { mag: '200_rnd', grip: 'canted_vertical', muzzle: 'hybrid_supp_l' });
  assert.equal(stacked._hipSpreadTierMod, -1);
  assert.equal(stacked._sprintRecoveryMs, 300);
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
    assert.equal(Object.values(attachments.WEAPON_ATTS).filter(a => a.muzzle?.includes(muzzle)).length, 39);
    assert.ok(!attachments.WEAPON_ATTS.m87a1.muzzle.includes(muzzle));
  }
  const l110 = weapon('l110');
  const atts = loadout(l110, { grip: 'canted_vertical' });
  assert.deepEqual(codec.decodeAtts(l110, codec.encodeAtts(l110, atts)), atts);
  assert.equal(Object.values(attachments.WEAPON_ATTS).filter(a => a.grip?.includes('canted_vertical')).length, 9);
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
  const combined = build(weapon('vz61'), { laser: 'canted_stubby' });
  assert.equal(combined.recoil.hip.amountExp, weapon('vz61').recoil.hip.amountExp + 3);
  assert.deepEqual(w, original);
  setSimContext({ aimState: 'ads' });
});

test('Folding Stock applies hip spread and variation while retaining deferred recoil decay', () => {
  const base = build(weapon('vssm'));
  const result = build(weapon('vssm'), { ergo: 'full_auto_vssm' });
  assert.equal(result.spreadDyn.hip.inc, 0.736);
  assert.equal(result.spreadDyn.hip.firingCoef, 0.5);
  assert.equal(result.spreadDyn.hip.firingOffset, 4.86);
  assert.equal(result.recoil.hip.dirVarExp, base.recoil.hip.dirVarExp - 20);
  for (const state of ['ads', 'hip']) {
    assert.equal(result.recoil[state].decFactor, base.recoil[state].decFactor);
    assert.equal(result.recoil[state].decTimeExp, base.recoil[state].decTimeExp);
  }
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
  assert.notEqual(compact._movingAdsMinSpreadDeg, base._movingAdsMinSpreadDeg);
  assert.equal(fast._weaponSway, base._weaponSway - 1);
  assert.equal(compact._weaponSway, base._weaponSway);
  const rpk = weapon('rpk74m');
  const rpkBase = build(rpk);
  for (const mag of ['30_rnd', '30_fast']) {
    const selected = build(rpk, { mag });
    assert.equal(selected._movingAdsMinSpreadDeg, 0.22);
    assert.equal(rpkBase._movingAdsMinSpreadDeg, 0.32);
    assert.equal(selected._weaponSway, rpkBase._weaponSway - 1);
    assert.deepEqual(selected.spreadDyn, rpkBase.spreadDyn);
    assert.equal(selected.mag, 30);
    assert.equal(selected.tacRld, mag === '30_fast' ? 2.464 : 2.784);
  }
});

test('reviewed Mini Scout and BROD 3 magazines match captured handling values', () => {
  const scout = weapon('miniscout');
  assert.equal(build(scout)._adsMoveSpeedMult, 0.67);
  for (const mag of ['15_rnd', '15_fast', '20_rnd', '20_fast']) {
    const selected = build(scout, { mag });
    assert.equal(selected._adsMoveSpeedMult, 0.6);
    assert.equal(selected._adsTimeMs, 250);
    assert.equal(selected.tacRld, mag.endsWith('fast') ? 2.065 : 2.334);
  }
  for (const mag of ['36_rnd', '40_rnd', '40_fast']) {
    const brod = build(weapon('brod3'), { mag });
    const fast = mag === '40_fast';
    assert.equal(brod._sprintRecoveryMs, fast ? 200 : 167);
    assert.equal(brod.deployT, fast ? 0.633 : 0.533);
    assert.equal(brod.tacRld, fast ? 1.962 : 2.217);
  }
});

test('Heavy, Heavy Extended and Cryo change ADS spread without changing hip spread or recovery', () => {
  const w = weapon('b36a4');
  const base = build(w);
  for (const barrel of ['heavy', 'heavy_ext', 'cryo']) {
    assert.ok(attachments.WEAPON_ATTS[w.id].barrel.includes(barrel));
    const result = build(w, { barrel });
    assert.equal(result.recoilIncAds, +(base.recoilIncAds * 0.667).toFixed(3));
    assert.deepEqual(result.spreadDyn.hip, base.spreadDyn.hip);
    for (const stanceState of ['stand', 'move']) {
      setSimContext({ aimState: 'hip', stanceState });
      assert.deepEqual(spreadRecoveries(result), spreadRecoveries(base));
      assert.deepEqual(simulateSpread(result, 15), simulateSpread(base, 15));
      setSimContext({ aimState: 'ads', stanceState });
      assert.equal(spreadRecoveries(result).firing.coef, spreadRecoveries(base).firing.coef * 1.71);
      assert.equal(spreadRecoveries(result).firing.offset, spreadRecoveries(base).firing.offset * 0.667);
    }
  }
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
});
