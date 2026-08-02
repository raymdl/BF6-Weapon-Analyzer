/**
 * Application-owned share-link codec.
 *
 * Keep URL encoding/decoding in a small dependency-injected module so the
 * browser path and focused tests exercise the same implementation. Catalogs
 * remain append-only: indexed attachment tokens preserve existing links.
 */

const ATT_ORDER = ['sight', 'muzzle', 'barrel', 'grip', 'laser', 'light', 'ammo', 'ergo', 'mag'];

const byId = items => Object.fromEntries((items ?? []).map(item => [item.id, item]));

export function createShareCodec({
  SIGHTS = [],
  MUZZLES = [],
  BARRELS = [],
  GRIPS = [],
  LASERS = [],
  LIGHTS = [],
  AMMO = [],
  ERGOS = [],
  WEAPON_MAG = {},
  defaultAttsForWeapon,
}) {
  if (typeof defaultAttsForWeapon !== 'function') {
    throw new TypeError('createShareCodec requires defaultAttsForWeapon');
  }

  const lookups = {
    SIGHTS: byId(SIGHTS),
    MUZZLES: byId(MUZZLES),
    BARRELS: byId(BARRELS),
    GRIPS: byId(GRIPS),
    LASERS: byId(LASERS),
    LIGHTS: byId(LIGHTS),
    AMMO: byId(AMMO),
    ERGOS: byId(ERGOS),
  };
  const catIdx = (arr, id) => arr.findIndex(item => item.id === id);
  const magKeysFor = weapon => Object.keys(WEAPON_MAG[weapon.id]?.mags ?? {});

  function encodeAtts(weapon, atts) {
    const defaults = defaultAttsForWeapon(weapon);
    const out = [];
    const emit = (key, arr, id) => {
      const index = catIdx(arr, id);
      if (index >= 0) out.push(key + index);
    };
    if (atts.sight !== defaults.sight) emit('S', SIGHTS, atts.sight);
    if (atts.muzzle !== defaults.muzzle) emit('M', MUZZLES, atts.muzzle);
    if (atts.barrel !== defaults.barrel) emit('B', BARRELS, atts.barrel);
    if (atts.grip !== defaults.grip) emit('G', GRIPS, atts.grip);
    if (atts.laser !== defaults.laser) {
      if (catIdx(LASERS, atts.laser) >= 0) emit('L', LASERS, atts.laser);
      else if (catIdx(GRIPS, atts.laser) >= 0) emit('R', GRIPS, atts.laser);
      else if (catIdx(LIGHTS, atts.laser) >= 0) emit('H', LIGHTS, atts.laser);
    }
    if (atts.light !== defaults.light) emit('T', LIGHTS, atts.light);
    if (atts.ammo !== defaults.ammo) emit('A', AMMO, atts.ammo);
    if (atts.ergo !== defaults.ergo) emit('E', ERGOS, atts.ergo);
    if ((atts.mag ?? '') !== (defaults.mag ?? '')) {
      const index = magKeysFor(weapon).indexOf(atts.mag);
      if (index >= 0) out.push('K' + index);
    }
    return out.join('');
  }

  function decodeAttsLegacy(weapon, value) {
    const atts = defaultAttsForWeapon(weapon);
    const valid = (key, id) => {
      switch (key) {
        case 'sight': return !!lookups.SIGHTS[id];
        case 'muzzle': return !!lookups.MUZZLES[id];
        case 'barrel': return !!lookups.BARRELS[id];
        case 'grip': return !!lookups.GRIPS[id];
        case 'laser': return !!(lookups.LASERS[id] || lookups.GRIPS[id] || lookups.LIGHTS[id]);
        case 'light': return !!lookups.LIGHTS[id];
        case 'ammo': return !!lookups.AMMO[id];
        case 'ergo': return !!lookups.ERGOS[id];
        case 'mag': return !!WEAPON_MAG[weapon.id]?.mags?.[id];
        default: return false;
      }
    };
    value.split('-').forEach((id, index) => {
      const key = ATT_ORDER[index];
      if (!key || id == null) return;
      if (id === '') {
        if (key === 'mag') atts.mag = null;
        return;
      }
      if (valid(key, id)) atts[key] = id;
    });
    return atts;
  }

  function decodeAtts(weapon, value) {
    if (!value) return defaultAttsForWeapon(weapon);
    if (value.includes('-')) return decodeAttsLegacy(weapon, value);
    const atts = defaultAttsForWeapon(weapon);
    const magKeys = magKeysFor(weapon);
    const set = (arr, index, slot) => {
      if (arr[index]) atts[slot] = arr[index].id;
    };
    let match;
    const re = /([A-Z])(\d+)/g;
    while ((match = re.exec(value))) {
      const key = match[1];
      const index = +match[2];
      if (key === 'S') set(SIGHTS, index, 'sight');
      else if (key === 'M') set(MUZZLES, index, 'muzzle');
      else if (key === 'B') set(BARRELS, index, 'barrel');
      else if (key === 'G') set(GRIPS, index, 'grip');
      else if (key === 'L') set(LASERS, index, 'laser');
      else if (key === 'R') set(GRIPS, index, 'laser');
      else if (key === 'H') set(LIGHTS, index, 'laser');
      else if (key === 'T') set(LIGHTS, index, 'light');
      else if (key === 'A') set(AMMO, index, 'ammo');
      else if (key === 'E') set(ERGOS, index, 'ergo');
      else if (key === 'K' && magKeys[index]) atts.mag = magKeys[index];
    }
    return atts;
  }

  function encodeState(state, selectedRecoilShotCount = () => 20) {
    const params = new URLSearchParams();
    const first = state.slots[0];
    if (first.weapon) {
      params.set('w', first.weapon.id);
      const atts = encodeAtts(first.weapon, first.atts);
      if (atts) params.set('a', atts);
    }
    if (state.comparing) {
      params.set('cmp', '1');
      const second = state.slots[1];
      if (second.weapon) {
        params.set('w2', second.weapon.id);
        const atts = encodeAtts(second.weapon, second.atts);
        if (atts) params.set('a2', atts);
      }
    }
    if (state.chart.mode !== 'dmg') params.set('cm', state.chart.mode);
    if (state.chart.btkHS) params.set('hs', state.chart.btkHS);
    if (state.chart.showAds) params.set('ads', '1');
    if (state.chart.showVel) params.set('vel', '1');
    if (state.recoil.aim !== 'ads') params.set('ra', state.recoil.aim);
    if (state.recoil.stance !== 'stand') params.set('rs', state.recoil.stance);
    if (state.recoil.platform !== 'pc') params.set('rp', state.recoil.platform);
    if (state.recoil.compensationLevel > 0) params.set('rcc', state.recoil.compensationLevel);
    if (state.recoil.view === 'target') {
      params.set('rv', 'target');
      if (state.recoil.distance !== 30) params.set('rd', state.recoil.distance);
      if (state.recoil.zeroDistance !== 100) params.set('rz', state.recoil.zeroDistance);
      if (state.recoil.targetAim !== 'chest') params.set('rta', state.recoil.targetAim);
      if (state.recoil.targetAim === 'custom') {
        params.set('rax', state.recoil.customAim.x.toFixed(1));
        params.set('ray', state.recoil.customAim.y.toFixed(1));
      }
    }
    const collapsed = Object.entries(state.collapsed ?? {}).filter(([, on]) => on).map(([key]) => key);
    if (collapsed.length) params.set('cl', collapsed.join('.'));
    const shots = selectedRecoilShotCount();
    if (shots !== 20) params.set('sh', shots);
    return params.toString();
  }

  function restoreFromHash(state, hash, weapons) {
    const value = String(hash ?? '').replace(/^#/, '');
    if (!value) return null;
    let params;
    try {
      params = new URLSearchParams(value);
    } catch {
      return null;
    }

    const first = params.get('w') && weapons.find(weapon => weapon.id === params.get('w'));
    if (first) {
      state.slots[0].cls = first.cls;
      state.slots[0].weapon = first;
      state.slots[0].atts = decodeAtts(first, params.get('a'));
    }
    if (params.get('cmp') === '1') {
      state.comparing = true;
      const second = params.get('w2') && weapons.find(weapon => weapon.id === params.get('w2'));
      if (second) {
        state.slots[1].cls = second.cls;
        state.slots[1].weapon = second;
        state.slots[1].atts = decodeAtts(second, params.get('a2'));
      }
    }
    const chartMode = params.get('cm');
    if (chartMode === 'btk' || chartMode === 'ttk') state.chart.mode = chartMode;
    const headshots = parseInt(params.get('hs'), 10);
    if (headshots >= 1 && headshots <= 3) state.chart.btkHS = headshots;
    if (params.get('ads') === '1' && state.chart.mode === 'ttk') state.chart.showAds = true;
    if (params.get('vel') === '1' && state.chart.mode === 'ttk') state.chart.showVel = true;
    if (params.get('ra') === 'hip') state.recoil.aim = 'hip';
    if (params.get('rs') === 'move') state.recoil.stance = 'move';
    if (params.get('rp') === 'console') state.recoil.platform = 'console';
    if (params.get('rv') === 'target') state.recoil.view = 'target';
    const distance = parseInt(params.get('rd'), 10);
    if (Number.isFinite(distance)) state.recoil.distance = Math.max(5, Math.min(300, distance));
    const zeroDistance = parseInt(params.get('rz'), 10);
    if ([100, 200, 300, 400, 500].includes(zeroDistance)) state.recoil.zeroDistance = zeroDistance;
    const targetAim = params.get('rta');
    if (targetAim === 'head' || targetAim === 'custom') state.recoil.targetAim = targetAim;
    if (state.recoil.targetAim === 'custom') {
      const x = Number(params.get('rax'));
      const y = Number(params.get('ray'));
      state.recoil.customAim = {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
      };
    }
    const collapsed = params.get('cl');
    if (collapsed && state.collapsed) {
      collapsed.split('.').forEach(key => {
        if (key in state.collapsed) state.collapsed[key] = true;
      });
    }
    const compensation = parseInt(params.get('rcc'), 10);
    if (Number.isFinite(compensation)) {
      state.recoil.compensationLevel = Math.max(0, Math.min(125, compensation));
    }
    return params;
  }

  return { encodeAtts, decodeAtts, encodeState, restoreFromHash };
}
