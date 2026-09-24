import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const repo = path.resolve(process.argv[2]);
const {
  applyRecoilDecay, genRecoilPts, mulberry32, recoilGroup,
  selectedRecoilAmountFor, selectedRecoilVariationFor, setSimContext,
  shotIntervalAfter, uniformDev, whash,
} = await import(pathToFileURL(path.join(repo, 'sim', 'core.js')));
const cases = JSON.parse(input);
if (cases.some(c => c.fullPath)) {
  const loadJson = name => JSON.parse(fs.readFileSync(path.join(repo, 'data', name), 'utf8'));
  const attachments = loadJson('attachments.json');
  const ammo = loadJson('ammo.json');
  const balance = loadJson('balance_tables.json');
  const hitZones = loadJson('hit_zones.json');
  const { applyAttachments, setAttachmentContext } = await import(
    pathToFileURL(path.join(repo, 'sim', 'applyAttachments.js')));
  const { blankAtts, resetAttsForWeapon } = await import(
    pathToFileURL(path.join(repo, 'sim', 'loadout.js')));
  const loadoutData = { ...attachments, ...ammo };
  setAttachmentContext({
    MUZZLES: attachments.MUZZLES, BARRELS: attachments.BARRELS,
    GRIPS: attachments.GRIPS, LASERS: attachments.LASERS, LIGHTS: attachments.LIGHTS,
    ERGOS: attachments.ERGOS, WEAPON_MAG: attachments.WEAPON_MAG,
    WEAPON_ERGO: attachments.WEAPON_ERGO, WEAPON_ATTS: attachments.WEAPON_ATTS,
    AMMO: ammo.AMMO, WEAPON_AMMO: ammo.WEAPON_AMMO,
    RECOIL_MULT: balance.RECOIL_MULT, HIP_SPREAD_TABLE: balance.HIP_SPREAD_TABLE,
    HIP_SPREAD_BASE_INDEX: balance.HIP_SPREAD_BASE_INDEX,
    HIP_SPREAD_BASE_INDEX_OVERRIDES: balance.HIP_SPREAD_BASE_INDEX_OVERRIDES,
    COLLATERAL_MULT_OVERRIDE: balance.COLLATERAL_MULT_OVERRIDE, HIT_ZONES: hitZones,
    MOVING_ACC_TIERS: balance.MOVING_ACC_TIERS, ADS_SPD_TIERS: balance.ADS_SPD_TIERS,
    ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS, DRAW_TIME_TABLES: balance.DRAW_TIME_TABLES,
    RELOAD_SPEED_MULTIPLIERS: balance.RELOAD_SPEED_MULTIPLIERS,
    VELOCITY_LADDER: balance.VELOCITY_LADDER,
    HEALTH_REGEN_DELAY_S: balance.HEALTH_REGEN_DELAY_S,
  });
  const out = cases.map(({ weapon, aim, seed = 0, shots: requestedShots, compensationPercent = 0 }) => {
    setSimContext({
      aimState: aim,
      compensationFn: () => compensationPercent,
      platformRecoilMultFn: () => 1,
    });
    const siteResetAttachments = blankAtts();
    resetAttsForWeapon(siteResetAttachments, weapon, loadoutData);
    const selectedWeapon = applyAttachments(weapon, siteResetAttachments);
    const shots = Math.min(requestedShots, weapon.mag ?? requestedShots,
      selectedWeapon.mag ?? requestedShots);
    const group = recoilGroup(selectedWeapon);
    const amount = selectedRecoilAmountFor(selectedWeapon);
    const variation = selectedRecoilVariationFor(selectedWeapon);
    const compensation = compensationPercent / 100;
    const duration = Math.max(0, group.duration == null ? 0 : group.duration) || 0.025;
    const dir = -group.dir * Math.PI / 180;
    const rng = mulberry32((whash(weapon.id) ^ seed) >>> 0);
    const sampledDeviationDegrees = [];
    const kickDeltas = [];
    for (let i = 1; i < shots; i++) {
      const deviation = uniformDev(rng, variation);
      const angle = dir + deviation * Math.PI / 180;
      sampledDeviationDegrees.push(deviation);
      kickDeltas.push({
        x: Math.sin(angle) * amount - Math.sin(dir) * amount * compensation,
        y: Math.cos(angle) * amount - Math.cos(dir) * amount * compensation,
      });
    }
    return {
      id: weapon.id,
      aim,
      seed,
      shots,
      rawMagazine: weapon.mag,
      selectedMagazine: selectedWeapon.mag,
      siteResetAttachments,
      compensationPercent,
      amount,
      variation,
      dirDegrees: group.dir,
      decFactor: group.decFactor * (aim === 'ads'
        ? (selectedWeapon._adsRecoilDecayMult ?? 1) : (selectedWeapon._hipRecoilDecayMult ?? 1)),
      decExp: group.decExp,
      timeExp: group.decTimeExp,
      decOffset: group.decOffset,
      duration,
      points: genRecoilPts(selectedWeapon, seed, shots),
      shotIntervals: Array.from({ length: Math.max(0, shots - 1) }, (_, index) =>
        shotIntervalAfter(selectedWeapon, index + 1)),
      sampledDeviationDegrees,
      kickDeltas,
    };
  });
  process.stdout.write(JSON.stringify(out));
} else {
const out = cases.map(({ weapon, aim, amplitude, decFactor, decExp, timeExp, decOffset, sequenceShots }) => {
  const interval = shotIntervalAfter(weapon, 1);
  let state = 0;
  const repoSequence = [];
  for (let shot = 0; shot < sequenceShots; shot++) {
    state += amplitude;
    state = applyRecoilDecay(state, decFactor, decExp, timeExp, interval, decOffset, 0);
    repoSequence.push(state);
  }
  return { id: weapon.id, aim, shotIntervalSeconds: interval,
    repoResidual: applyRecoilDecay(amplitude, decFactor, decExp, timeExp, interval, decOffset, 0),
    repoSequence };
});
process.stdout.write(JSON.stringify(out));
}
