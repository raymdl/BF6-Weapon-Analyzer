// Weapon Attribute model. See docs/WEAPON_ATTRIBUTES_MODEL.md for evidence and limits.
import { applyAttachments } from './applyAttachments.js';
import { resolveMountAttachments } from './loadout.js';
import { requireNumber } from './required-data.js';

export function createWeaponAttributeModel({ balance, catalogs, attributes }) {
  const SHOTGUN_DISPERSION = attributes.shotgunDispersion;
  const MOBILITY_SOURCE_INPUTS = attributes.mobilityInputs;
  const HIPFIRE_FRACTION_GATE = Math.sqrt(1.2);
  // Same observed menu-preview rule as the research checkers: burst-selector recoil is not previewed.
  const BURST_ERGOS = new Set(['burst_training', 'burst_mode', 'grtbc_burst_mode']);
  const rad = degrees => degrees * Math.PI / 180;
  // Candidates recorded in docs/archive/COMPOSITE_STATS_FINDINGS.md (6 SEP 2026 evidence files).
  const control = (R, V) => 96 / Math.pow(1.1 * R * (V === 0 ? 1 : Math.sin(rad(V)) / rad(V)) + 0.75, 2.25) + 4;
  const hipfire = H => Math.min(100, 10 * Math.sqrt(0.425 / Math.tan(rad(1.25 * H)) * 83.33333587646484 / 40.92409896850586));
  // The delegate's own 18-value ladder (composite-hipfire-decode-2026-09-06.json). Row 0 is 8.032 where the
  // site's spread table holds 7.4: suppressed LMGs read 22 (8.032), not 23 (7.4).
  const HIPFIRE_LADDER = [8.032, 4.848, 3.352, 2.432, 1.804, 1.352, 1.024, 0.784, 0.608, 0.476, 0.38, 2.16, 1.444, 0.972, 0.656, 0.444, 0.304, 0.208];
  function exactRecoil(weapon, build, mult) {
    // A missing multiplier must not fall back to a default: Math.pow(NaN, 0) would still return a score.
    if (!Number.isFinite(mult)) return { R: NaN, V: NaN };
    const ads = weapon.recoil?.ads ?? {};
    const amountTier = mult !== 1 ? Math.round(Math.log(build.recoilV / weapon.recoilV) / Math.log(mult)) : 0;
    const baseVar = ads.dirVar * Math.pow(ads.dirVarMult ?? 1, ads.dirVarExp ?? 0);
    const varTier = ads.dirVarMult && ads.dirVarMult !== 1 ? Math.round(Math.log(build.recoilVar / baseVar) / Math.log(ads.dirVarMult)) : 0;
    return { R: weapon.recoilV * Math.pow(mult, amountTier), V: baseVar * Math.pow(ads.dirVarMult ?? 1, varTier) };
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

  const same = (row, value, tol) => row === -1 || Math.abs(row - value) <= tol * Math.max(1, Math.abs(value));
  const tier = (value, base, mult) => (mult && mult !== 1 && base ? Math.round(Math.log(value / base) / Math.log(mult)) : 0);

  // Table keys for a resolved build: base sums plus the build's ADS recoil tier changes.
  function keys(weapon, build, table, recoilBuild, amountMult) {
    const ads = weapon.recoil?.ads ?? {};
    const resolvedAds = recoilBuild.recoil?.ads ?? ads;
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
    const matching = (tol, durationTol = tol) => keyed.filter(row => row.amountSum === k.amountSum && row.variationSum === k.variationSum
      && same(row.rpm, k.rpm, tol) && same(row.minAngle, k.minAngle, tol) && same(row.duration, k.duration, durationTol) && same(row.decrease, k.decrease, tol));
    const sameRounded = rows => new Set(rows.map(row => Math.round(row.panel))).size === 1;
    const exact = matching(1e-4);
    if (exact.length === 1) return { panel: exact[0].panel, method: 'exact' };
    // Burst-capable tables repeat keys in a second block whose outputs differ by at most 0.012.
    if (exact.length > 1) return sameRounded(exact) ? { panel: exact[0].panel, method: 'duplicate-same' } : { panel: null, method: 'ambiguous' };
    // Bolt-action tables store a cycle value in the rpm column; a single keyed row is used as-is.
    if (keyed.length === 1) return { panel: keyed[0].panel, method: 'single-row' };
    // AK-205/USG-90 heavy rows store 0.159133 against a resolved 0.239 x 0.666667; catalog burst RPMs are rounded.
    // Prefer the exact duration before the broader legacy numeric tolerance.
    // Rounded burst RPM must not merge GRT-BC's 0.0244 and 0.025 second rows.
    const durationExact = matching(2e-3, 1e-4);
    if (durationExact.length && sameRounded(durationExact)) return { panel: durationExact[0].panel, method: 'near-duration-exact' };
    const near = matching(2e-3);
    if (near.length && sameRounded(near)) return { panel: near[0].panel, method: 'near' };
    // A row with all six key flags false matches any loadout (L115: one fallback row of 100).
    if (keyed.length === 0 && fallback.length === 1) return { panel: fallback[0].panel, method: 'fallback' };
    return { panel: null, method: 'no-row' };
  }


  return function calculate(weapon, atts, build = applyAttachments(weapon, atts)) {
    const mounts = resolveMountAttachments(atts, weapon, catalogs);
    // Hip index in source order: the weapon's base row minus the resolved tier shift, clamped like the resolver.
    // Shotguns use the resolved ammunition row plus their separate firing-dispersion angle.
    // Keep the previous non-shotgun ammunition treatment until those branches are independently checked.
    const hipBase = balance.HIP_SPREAD_BASE_INDEX[weapon.id];
    const ammoId = atts.ammo ?? catalogs.WEAPON_AMMO?.[weapon.id]?.def ?? 'standard';
    const ammoShift = catalogs.WEAPON_AMMO?.[weapon.id]?.effectOverrides?.[ammoId]?.hipSpreadTierMod
      ?? catalogs.AMMO.find(item => item.id === ammoId)?.hipSpreadTierMod ?? 0;
    const firingDispersion = SHOTGUN_DISPERSION[weapon.id];
    // GS_L115A3 omits the Standard Suppressor selector from its hip-dispersion bindings.
    // See l115-standard-suppressor-hipfire-2026-09-21.json; retain other attachment effects.
    const unboundMuzzleShift = weapon.id === 'l115' && atts.muzzle === 'std_supp'
      ? catalogs.MUZZLES.find(item => item.id === 'std_supp').hipSpreadTierMod : 0;
    const hipIndex = Number.isInteger(hipBase) ? Math.max(0, Math.min(HIPFIRE_LADDER.length - 1,
      hipBase - (build._hipSpreadTierMod - unboundMuzzleShift - (firingDispersion == null ? ammoShift : 0)))) : null;
    const H = hipIndex != null ? HIPFIRE_LADDER[hipIndex] + (firingDispersion ?? 0) : null;
    const baseHipInc = weapon.spreadDyn?.hip?.inc;
    const resolvedHipInc = build.spreadDyn?.hip?.inc;
    const hipIncreasePerShotFraction = baseHipInc > 0 && Number.isFinite(resolvedHipInc)
      ? resolvedHipInc / baseHipInc : 1;
    const gate = hipIncreasePerShotFraction !== 1 ? HIPFIRE_FRACTION_GATE : 1;
    // Reviewed burst panels retain non-burst recoil inputs on all eight burst-capable weapons.
    // SG 553R/PW5A3 evidence is hover-only; equipped parity remains unverified.
    // Keep the selected fire rate (SL9 changes RPM) and all other attachments.
    // This affects menu attributes only, not the firing simulation.
    const panelBurst = BURST_ERGOS.has(atts.ergo);
    const recoilBuild = panelBurst ? applyAttachments(weapon, { ...atts, ergo: 'none' }) : build;
    // Reports the missing value (throws in scripts and tests); Precision and Control then show Unavailable.
    const recoilMult = requireNumber(balance.RECOIL_MULT?.[weapon.id], `${weapon.id} RECOIL_MULT`);
    const { R, V } = exactRecoil(weapon, recoilBuild, recoilMult);
    const indices = mobilityIndices(build, weapon);
    const mobilitySource = MOBILITY_SOURCE_INPUTS[weapon.id];
    if (mobilitySource?.animationZoomBaseIndex !== undefined) {
      indices.adsTime += mobilitySource.animationZoomBaseIndex - mobilitySource.zoomTransitionBaseIndex;
    }
    const movingAdsShift = mobilitySource?.movingAdsGripShifts?.[mounts.grip.id];
    if (movingAdsShift !== undefined) {
      indices.movingAds += movingAdsShift - (mounts.grip.movingAdsSpreadTierMod ?? 0);
    }
    // WPM_BTM_HandStopPDW_W10 sets Field_18774676=True; its panel description names sprint firing.
    const canFireWhileSprinting = mounts.grip.id === 'cmpct_handstop';

    const table = attributes.tables[weapon.id];
    let precision = { panel: null, method: 'no-table' };
    if (table && !Number.isFinite(recoilMult)) {
      precision = { panel: null, method: 'missing-input' };
    } else if (table) {
      const k = keys(weapon, build, table, recoilBuild, recoilMult);
      // PP19 Flash Comp has no smoothing binding in GS_PP19.
      if (weapon.id === 'pp19' && atts.muzzle === 'flash_comp') {
        const unsmoothed = applyAttachments(weapon, { ...atts, muzzle: 'none' });
        k.duration = unsmoothed.recoil.ads.duration;
        k.decrease = unsmoothed.recoil.ads.decFactor * (unsmoothed._adsRecoilDecayMult ?? 1);
      }
      precision = lookup(table, k);
    }
    const rounded = value => Number.isFinite(value) ? Math.round(value) : null;
    return {
      hipfire: H != null ? rounded(Math.min(100, hipfire(H) * gate)) : null,
      precision: rounded(precision.panel),
      control: rounded(control(R, V)),
      mobility: Object.values(indices).some(i => i < 0) ? null : rounded(mobilityScore(indices) + (canFireWhileSprinting ? 4 : 0)),
      precisionMethod: precision.method,
    };
  };
}
