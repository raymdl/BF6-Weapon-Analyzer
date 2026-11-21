// Stat-panel prediction with the site's own simulator (port of panelsim.mjs as a function).
// makeSimulator(modules, data) -> simulate(builds); builds = [{ weapon, atts }] (atts: partial slot -> id over the
// site default loadout). On the site, pass the already-loaded modules and data.
export function makeSimulator({ core, applyAtt, loadout, weaponAttributes }, { W, RD, B, A, AM, HZ, WA }) {
  core.setSimContext({ aimState: 'ads', stanceState: 'stand', ...RD, compensationFn: () => 0, platformRecoilMultFn: () => 1 });
  applyAtt.setAttachmentContext({ ...A, ...AM, ...B, HIP_SPREAD_BASE_INDEX: B.HIP_SPREAD_BASE_INDEX, HIT_ZONES: HZ,
    RELOAD_SPEED_MULTIPLIERS: B.RELOAD_SPEED_MULTIPLIERS, VELOCITY_LADDER: B.VELOCITY_LADDER, HEALTH_REGEN_DELAY_S: B.HEALTH_REGEN_DELAY_S });
  const data = { ...A, ...AM, GAME_BUGS: A.GAME_BUGS ?? [] };
  const attrs = weaponAttributes.createWeaponAttributeModel({ balance: B, catalogs: data, attributes: WA });
  return builds => builds.map(({ weapon, atts }) => {
    try {
      const w = W.find(x => x.id === weapon), a = {};
      loadout.resetAttsForWeapon(a, w, data); Object.assign(a, atts);
      // weapons with a shared rail slot (e.g. M45A1 laser/light) take {rail: {type, id}}, not laser/light keys
      const rail = A.WEAPON_ATTS[weapon]?.slots?.rail;
      if (rail) {
        const on = rail.accepts.filter(type => atts[type] && atts[type] !== 'none');
        if (on.length > 1) throw new Error('one item per shared rail: ' + on.join('+'));
        for (const type of on) { a.rail = { type, id: atts[type] }; delete a[type]; }
      }
      const b = applyAtt.applyAttachments(w, a), s = attrs(w, a, b);
      return { reload: b.tacRld, velocity: b.bulletVel, adsMs: b._adsTimeMs, mag: b.mag, hipfire: s.hipfire, precision: s.precision, control: s.control, mobility: s.mobility };
    } catch (e) { return { error: String(e.message ?? e) }; }
  });
}
