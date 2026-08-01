import {
  setSimContext, mulberry32, whash,
  recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
  selectedRecoilAmountFor, selectedRecoilAmountBeforePlatformFor, selectedRecoilVariationFor,
  spreadBounds, selectedSpreadIncFor,
  spreadRecoveries, applySpreadRecovery,
  simulateSpread, shotIntervalAfter, isBurstGapAfter, genRecoilPts,
} from '../sim/core.js';
import { setAttachmentContext, applyAttachments, wLabel } from '../sim/applyAttachments.js';
import { damageAtRange, damagePerShotAtRange, bulletsToKillAtRange } from '../sim/damage.js';
import * as Loadout from '../sim/loadout.js';
import { createShareCodec } from '../sim/share-state.js';
import { drawTarget, summarizeTargetImpacts, targetAimOffset, targetFrame, targetMarkerRadius, whenTargetImageReady } from '../sim/target.js';

// ── DATA FETCH ────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
}

let W, _recoilDecay, _balance, _atts, _ammo;
let _dataLastModified = null;
try {
  [W, _recoilDecay, _balance, _atts, _ammo] = await Promise.all([
    fetchJson('./data/weapons.json').then(r => { _dataLastModified = r.headers.get('Last-Modified'); return r.json(); }),
    fetchJson('./data/recoil_decay.json').then(r => r.json()),
    fetchJson('./data/balance_tables.json').then(r => r.json()),
    fetchJson('./data/attachments.json').then(r => r.json()),
    fetchJson('./data/ammo.json').then(r => r.json()),
  ]);
} catch (err) {
  document.body.insertAdjacentHTML('beforeend',
    '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0c0e0e;color:#e05555;font-family:sans-serif;font-size:1rem">Failed to load weapon data. Please reload the page.</div>');
  throw err;
}

// Update header date from the data file's Last-Modified header (set by GitHub Pages
// from the file's last commit date — updates automatically on every data push).
{
  const tag = document.querySelector('.hdr-tag');
  if (tag && _dataLastModified) {
    const d = new Date(_dataLastModified);
    const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const day = d.getUTCDate();
    const yr  = d.getUTCFullYear();
    const prefix = tag.textContent.replace(/- Updated.*$/, '').trim();
    tag.textContent = `${prefix} - Updated ${day} ${mon} ${yr}`;
  }
}

const { RECOIL_DEC, RECOIL_DEC_TEXP, RECOIL_DEC_EXP } = _recoilDecay;
const { RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
        BASE_HS_MULT, HP_HS_HIGH: _HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
        MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
        ADS_SPD_TIERS, SPRINT_REC_TIERS, PRIMARY_SPRINT_REC_TIERS, SIDEARM_SPRINT_REC_TIERS, DEPLOY_TIME_TIERS, ADS_MOVE_TIERS } = _balance;
const HP_HS_HIGH = new Set(_HP_HS_HIGH);

const { SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS,
        WEAPON_ATTS, WEAPON_ERGO, WEAPON_MAG } = _atts;
const { AMMO, WEAPON_AMMO } = _ammo;

const LOADOUT_DATA = {
  SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS,
  WEAPON_ATTS, WEAPON_ERGO, WEAPON_MAG,
  AMMO, WEAPON_AMMO,
};

const byId = items => Object.fromEntries(items.map(a => [a.id, a]));

// Build by-id maps once for attachment lookups in UI breakdowns
const ATT_BY_ID = {
  SIGHTS:  byId(SIGHTS),
  MUZZLES: byId(MUZZLES),
  BARRELS: byId(BARRELS),
  GRIPS:   byId(GRIPS),
  LASERS:  byId(LASERS),
  LIGHTS:  byId(LIGHTS),
  AMMO:    byId(AMMO),
  ERGOS:   byId(ERGOS),
};

// Grip ADS move speed overrides not present in source data
['6h64_vert', 'classic_vert', 'stipp_stubby', 'lp_stubby'].forEach(id => {
  const grip = ATT_BY_ID.GRIPS[id];
  if (grip) grip.adsMoveSpeedTierShift = 1;
});

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const CLASSES = ['Assault Rifle', 'Carbine', 'SMG', 'LMG', 'DMR', 'Sniper Rifle', 'Shotgun', 'Sidearm'];
const CLASS_SHORT = {
  'Assault Rifle': 'AR', 'Carbine': 'Carb', 'SMG': 'SMG',
  'LMG': 'LMG', 'DMR': 'DMR', 'Sniper Rifle': 'Sniper', 'Shotgun': 'SG', 'Sidearm': 'Pistol',
};

const RECOIL_SCALE_MIN = 2;
const RECOIL_SCALE_MAX = 10;
const RECOIL_SCALE_STEP = 0.5;
const RECOIL_PAN_STEP = 0.5;
// The target view frames the soldier and the projected pattern together. The
// figure fills most of the plot at close range and shrinks only as far as it
// must to keep a long-range pattern in shot, so the growing spread is legible
// against a body that stays recognizable.
const TARGET_FRAME_FILL = 0.72;
const TARGET_FRAME_MIN_FILL = 0.22;
// Target-view zoom is expressed as real optic magnification. A 1x sight is
// taken to show this much vertical field, so every step on the ladder frames
// the soldier the way that scope would in game.
const ADS_1X_VFOV_DEG = 40;
// The in-game optic ladder, extended past both ends so the plot can pull back
// for a whole long-range pattern or push in past any real scope.
const SCOPE_MAGNIFICATIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 12, 16, 20];
const PLOT_PAD = { l: 28, r: 8, t: 8, b: 18 };
const CLOUD_RUNS = 10;
const SPREAD_EFFECTIVE_MAX_SHOTS = 50;
const SPREAD_BAR_SCALE = 9.1;
const RECOIL_BAR_SCALE = 3;
const CONSOLE_RECOIL_MULT = 0.89;

// Sym.gg exports effective RPM as timing-derived decimals. Keep those raw
// values for calculations, but display the supplied in-game integer mapping.
const IN_GAME_RPM_BY_SYM = new Map(Object.entries({
  '37.67438356': 37,
  '38.11762015': 38,
  '44.08160187': 44,
  '46.34995365': 46,
  '51.00000000': 51,
  '149.99900000': 150,
  '163.63600000': 164,
  '224.99900000': 225,
  '257.14200000': 257,
  '299.99900000': 300,
  '327.27200000': 327,
  '359.99900000': 360,
  '399.99900000': 400,
  '449.99900000': 450,
  '514.28500000': 514,
  '553.84600000': 553,
  '568.42100000': 568,
  '599.99900000': 600,
  '635.29400000': 635,
  '654.54500000': 654,
  '674.99900000': 675,
  '685.71400000': 686,
  '719.99900000': 720,
  '771.42800000': 771,
  '799.99900000': 800,
  '818.18100000': 818,
  '830.76900000': 830,
  '899.99900000': 900,
  '947.36800000': 947,
  '981.81800000': 981,
  '1079.99900000': 1080,
}));

function formatInGameRpm(value) {
  if (value == null) return '—';
  const raw = Number(value);
  if (!Number.isFinite(raw)) return value;
  return IN_GAME_RPM_BY_SYM.get(raw.toFixed(8)) ?? value;
}

// ── APP STATE ─────────────────────────────────────────────────────────────────

const state = {
  slots: [
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts() },
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts() },
  ],
  comparing: false,
  // Panels fold away so the page can be sized for a screenshot without giving
  // up canvas space.
  collapsed: { overview: false, charts: false, recoil: false },
  chart: { mode: 'dmg', btkHS: 0, showAds: false },
  recoil: {
    aim: 'ads', stance: 'stand',
    view: 'angle', distance: 30, targetAim: 'chest', customAim: { x: 0, y: 0 },
    layers: { scatter: true, spray: true, path: false, spread: false, cone: false },
    // Scatter is far too noisy over a soldier, so each view keeps its own
    // overlay choices and its own sensible starting point.
    savedLayers: {
      angle: { scatter: true, spray: true, path: false, spread: false, cone: false },
      target: { scatter: false, spray: true, path: false, spread: false, cone: false },
    },
    platform: 'pc',
    spreadPreset: 'growth',
    // Transient: whether the custom shot-list popover is open.
    spreadEditing: false,
    // 0% means no compensation, so the slider is the whole control.
    compensationLevel: 0,
    refSeed: 0,
    scaleH: 5, panX: 0, panY: 0,
    // null magnification means "fit the burst", resolved per render.
    magnification: null, distancePanX: 0, distancePanY: 0,
  },
};

let dmgChart = null;
// Held so the observer is not collected while it still has an observation.
let plotResizeObserver = null;

// ── SIM CONTEXT INIT ──────────────────────────────────────────────────────────

setSimContext({
  aimState: 'ads', stanceState: 'stand',
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: selectedCompensationLevel,
  platformRecoilMultFn: selectedPlatformRecoilMult,
});
setAttachmentContext({
  MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, WEAPON_MAG, WEAPON_ERGO,
  AMMO,
  RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
  BASE_HS_MULT, HP_HS_HIGH, LIMB_CLASS, LIMB_CLASS_MULT, AUTO_HS_MULT,
  MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
  ADS_SPD_TIERS, SPRINT_REC_TIERS, PRIMARY_SPRINT_REC_TIERS, SIDEARM_SPRINT_REC_TIERS, DEPLOY_TIME_TIERS, ADS_MOVE_TIERS,
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
  VELOCITY_LADDER: balance.VELOCITY_LADDER,
});

// ── DAMAGE HELPERS ────────────────────────────────────────────────────────────

function getDmg(weapon, range) {
  return damageAtRange(weapon, range);
}
function limbMult(weapon) {
  return weapon._limbMult ?? 1;
}
// Bullets to kill with `headshots` headshots and every remaining hit on a non-head
// zone with damage multiplier `zoneMult` (1 = chest, weapon's limb mult = arms/legs).
// Hit order is irrelevant — damage is additive.
function getBTKWithHits(weapon, range, headshots = 0, zoneMult = 1) {
  return bulletsToKillAtRange(weapon, range, { headshots, bodyMultiplier: zoneMult });
}
function getTTK(weapon, btk) {
  if (!weapon.rpm || btk == null || !Number.isFinite(btk)) return null;
  let ms = 0;
  for (let i = 1; i < btk; i++) ms += shotIntervalAfter(weapon, i) * 1000;
  return Math.round(ms);
}
function fmtTTK(ms) {
  return ms === null ? '—' : ms === 0 ? '0ms' : ms + 'ms';
}
function maxRange(weapons) {
  const cls = weapons.filter(Boolean).map(w => w.cls);
  return cls.includes('Sniper Rifle') ? 200 : 90;
}
function chartXAxis(maxRangeMeters) {
  const step = maxRangeMeters === 200 ? 25 : 10;
  return {
    title: { display: true, text: 'Range (m)', color: '#7a8a8a', font: { size: 11 }, padding: { top: 4, bottom: 0 } },
    ticks: { color: '#7a8a8a' },
    grid: { color: 'rgba(40,48,48,0.6)' },
    afterBuildTicks: scale => {
      scale.ticks = scale.ticks.filter(t => {
        const label = Number(scale.getLabelForValue(t.value));
        return Number.isFinite(label) && label % step === 0;
      });
    },
  };
}
function damageYMax(weapons) {
  const cls = weapons.filter(Boolean).map(w => w.cls);
  if (cls.some(c => c === 'Sniper Rifle' || c === 'Shotgun')) return 100;
  if (cls.includes('DMR')) return 70;
  return 40;
}
function btkRanges(w1, w2) {
  const cls = [w1, w2].filter(Boolean).map(w => w.cls);
  if (cls.includes('Sniper Rifle')) return [0, 25, 50, 100, 150, 200, 250];
  if (cls.includes('DMR'))          return [0, 15, 30, 50, 75, 100];
  if (cls.every(c => c === 'Shotgun')) return [0, 5, 10, 15, 20, 25, 30];
  if (cls.includes('Shotgun'))      return [0, 5, 10, 15, 20, 25, 30, 50, 75];
  return [0, 10, 20, 30, 40, 50, 60, 70, 80];
}

// ── LOADOUT HELPERS ───────────────────────────────────────────────────────────

function resetAttsForWeapon(atts, weapon) {
  Loadout.resetAttsForWeapon(atts, weapon, LOADOUT_DATA);
}
function defaultAttsForWeapon(weapon) {
  const atts = Loadout.blankAtts();
  resetAttsForWeapon(atts, weapon);
  return atts;
}
const shareCodec = createShareCodec({
  SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, AMMO, ERGOS,
  WEAPON_MAG,
  defaultAttsForWeapon,
});
const defaultAppliedWeaponCache = new Map();
function defaultAppliedWeapon(weapon) {
  if (!weapon) return null;
  let cached = defaultAppliedWeaponCache.get(weapon.id);
  if (!cached) {
    cached = applyAttachments(weapon, defaultAttsForWeapon(weapon));
    defaultAppliedWeaponCache.set(weapon.id, cached);
  }
  return cached;
}

// ── COMPENSATION ──────────────────────────────────────────────────────────────

function selectedCompensationLevel() {
  return state.recoil.compensationLevel;
}
function selectedPlatformRecoilMult() {
  return state.recoil.platform === 'console' ? CONSOLE_RECOIL_MULT : 1;
}

// ── URL STATE (SHARE / PERSIST) ─────────────────────────────────────────────────
// The full loadout + analysis view is encoded into the location hash so it can be
// shared (Discord) and survives reloads. Only non-default values are written, so a
// single-weapon URL stays short. View-only state (zoom, pan, overlay layers, random
// reference seed) is intentionally excluded.

const ATT_ORDER = ['sight', 'muzzle', 'barrel', 'grip', 'laser', 'light', 'ammo', 'ergo', 'mag'];
let _restoringUrl = false;
let _urlSyncTimer = null;

// Attachments are encoded as <key><catalogIndex> tokens (e.g. "M5B3K2"), and only
// slots that differ from the weapon's default are written — keeping share URLs short.
// Keys: S sight, M muzzle, B barrel, G grip, A ammo, E ergo, K mag, T light,
// L laser; R/H = a grip/light occupying a combined laser slot (VZ.61, sidearms).
// NOTE: this relies on the catalog arrays being append-only (never reorder/remove
// existing entries) so previously shared links keep resolving to the same item.
const magKeysFor = weapon => Object.keys(WEAPON_MAG[weapon.id]?.mags ?? {});
const catIdx = (arr, id) => arr.findIndex(x => x.id === id);

function encodeAtts(weapon, a) {
  const def = defaultAttsForWeapon(weapon);
  const out = [];
  const emit = (key, arr, id) => { const i = catIdx(arr, id); if (i >= 0) out.push(key + i); };
  if (a.sight  !== def.sight)  emit('S', SIGHTS,  a.sight);
  if (a.muzzle !== def.muzzle) emit('M', MUZZLES, a.muzzle);
  if (a.barrel !== def.barrel) emit('B', BARRELS, a.barrel);
  if (a.grip   !== def.grip)   emit('G', GRIPS,   a.grip);
  if (a.laser  !== def.laser) {
    if (catIdx(LASERS, a.laser) >= 0)      emit('L', LASERS, a.laser);
    else if (catIdx(GRIPS, a.laser) >= 0)  emit('R', GRIPS,  a.laser);
    else if (catIdx(LIGHTS, a.laser) >= 0) emit('H', LIGHTS, a.laser);
  }
  if (a.light !== def.light) emit('T', LIGHTS, a.light);
  if (a.ammo  !== def.ammo)  emit('A', AMMO,   a.ammo);
  if (a.ergo  !== def.ergo)  emit('E', ERGOS,  a.ergo);
  if ((a.mag ?? '') !== (def.mag ?? '')) {
    const i = magKeysFor(weapon).indexOf(a.mag);
    if (i >= 0) out.push('K' + i);
  }
  return out.join('');
}

// Legacy positional decoder for the original dash-joined ID format.
function decodeAttsLegacy(weapon, str) {
  const atts = defaultAttsForWeapon(weapon);
  const valid = (key, v) => {
    switch (key) {
      case 'sight':  return !!ATT_BY_ID.SIGHTS[v];
      case 'muzzle': return !!ATT_BY_ID.MUZZLES[v];
      case 'barrel': return !!ATT_BY_ID.BARRELS[v];
      case 'grip':   return !!ATT_BY_ID.GRIPS[v];
      case 'laser':  return !!(ATT_BY_ID.LASERS[v] || ATT_BY_ID.GRIPS[v] || ATT_BY_ID.LIGHTS[v]);
      case 'light':  return !!ATT_BY_ID.LIGHTS[v];
      case 'ammo':   return !!ATT_BY_ID.AMMO[v];
      case 'ergo':   return !!ATT_BY_ID.ERGOS[v];
      case 'mag':    return !!WEAPON_MAG[weapon.id]?.mags?.[v];
      default:       return false;
    }
  };
  str.split('-').forEach((v, i) => {
    const k = ATT_ORDER[i];
    if (!k || v == null) return;
    if (v === '') { if (k === 'mag') atts.mag = null; return; }
    if (valid(k, v)) atts[k] = v;
  });
  return atts;
}

function decodeAtts(weapon, str) {
  if (!str) return defaultAttsForWeapon(weapon);
  if (str.includes('-')) return decodeAttsLegacy(weapon, str);
  const atts = defaultAttsForWeapon(weapon);
  const magKeys = magKeysFor(weapon);
  const set = (arr, i, slot) => { if (arr[i]) atts[slot] = arr[i].id; };
  let m;
  const re = /([A-Z])(\d+)/g;
  while ((m = re.exec(str))) {
    const k = m[1], i = +m[2];
    if      (k === 'S') set(SIGHTS,  i, 'sight');
    else if (k === 'M') set(MUZZLES, i, 'muzzle');
    else if (k === 'B') set(BARRELS, i, 'barrel');
    else if (k === 'G') set(GRIPS,   i, 'grip');
    else if (k === 'L') set(LASERS,  i, 'laser');
    else if (k === 'R') set(GRIPS,   i, 'laser');
    else if (k === 'H') set(LIGHTS,  i, 'laser');
    else if (k === 'T') set(LIGHTS,  i, 'light');
    else if (k === 'A') set(AMMO,    i, 'ammo');
    else if (k === 'E') set(ERGOS,   i, 'ergo');
    else if (k === 'K' && magKeys[i]) atts.mag = magKeys[i];
  }
  return atts;
}

function encodeState() {
  return shareCodec.encodeState(state, selectedRecoilShotCount);
}

function syncUrl() {
  if (_restoringUrl) return;
  const qs = encodeState();
  const newHash = qs ? '#' + qs : '';
  if ((location.hash || '') === newHash) return;
  history.replaceState(null, '', newHash || location.pathname + location.search);
}

function scheduleUrlSync() {
  if (_restoringUrl) return;
  clearTimeout(_urlSyncTimer);
  _urlSyncTimer = setTimeout(syncUrl, 200);
}

const COLLAPSE_PANELS = { overview: 'overviewPanel', charts: 'chartsPanel', recoil: 'recoilPanel' };

function applyCollapseToDom() {
  Object.entries(COLLAPSE_PANELS).forEach(([key, id]) => {
    const panel = document.getElementById(id);
    const on = !!state.collapsed[key];
    panel?.classList.toggle('is-collapsed', on);
    const toggle = document.querySelector(`.panel-toggle[data-collapse="${key}"]`);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!on));
      // The caret alone does not say what it does, so the label carries it.
      const what = toggle.dataset.collapseLabel ?? 'this section';
      const action = `${on ? 'Expand' : 'Collapse'} ${what}`;
      toggle.title = action;
      toggle.setAttribute('aria-label', action);
    }
  });
}
function setPanelCollapsed(key, collapsed) {
  if (!(key in state.collapsed)) return;
  state.collapsed[key] = collapsed;
  applyCollapseToDom();
  scheduleUrlSync();
  // Chart.js sizes to a hidden box as zero, so it needs a nudge on reveal.
  if (key === 'charts' && !collapsed) dmgChart?.resize();
}

function applyChartStateToDom() {
  const { mode, btkHS, showAds } = state.chart;
  document.getElementById('modeDmg').classList.toggle('on', mode === 'dmg');
  document.getElementById('modeBtk').classList.toggle('on', mode === 'btk');
  document.getElementById('modeTtk').classList.toggle('on', mode === 'ttk');
  const isTtk = mode === 'ttk';
  const adsBtn = document.getElementById('adsToggleBtn');
  adsBtn.style.display = isTtk ? '' : 'none';
  adsBtn.classList.toggle('on', isTtk && showAds);
  document.getElementById('chartTitle').textContent =
    mode === 'btk' ? 'BTK Chart' : mode === 'ttk' ? (showAds ? 'ADS+TTK Chart' : 'TTK Chart') : 'Damage Chart';
  const sel = document.getElementById('btkHsSelect');
  sel.style.display = (mode === 'btk' || mode === 'ttk') ? '' : 'none';
  sel.value = btkHS;
}

function restoreFromUrl() {
  const p = shareCodec.restoreFromHash(state, location.hash, W);
  if (!p) return;
  // A link that lands straight in the target view still gets that view's
  // overlay defaults rather than the angle plot's.
  applyViewLayers(state.recoil.view);

  const cm = p.get('cm'); if (cm === 'btk' || cm === 'ttk') state.chart.mode = cm;
  const hs = parseInt(p.get('hs'), 10); if (hs >= 1 && hs <= 3) state.chart.btkHS = hs;
  if (p.get('ads') === '1' && state.chart.mode === 'ttk') state.chart.showAds = true;
  if (p.get('ra') === 'hip') state.recoil.aim = 'hip';
  if (p.get('rs') === 'move') state.recoil.stance = 'move';
  if (p.get('rp') === 'console') state.recoil.platform = 'console';

  // Reflect the pieces of state that render functions don't set themselves.
  if (state.comparing) {
    document.getElementById('cmpBtn').classList.add('on');
    document.getElementById('cmpSection').style.display = 'block';
  }
  setSimContext({ aimState: state.recoil.aim, stanceState: state.recoil.stance });
  const sh = parseInt(p.get('sh'), 10);
  if (Number.isFinite(sh)) {
    const c = Math.max(1, Math.min(100, sh));
    const input = document.getElementById('rcShotCountInput');
    if (input) input.value = c;
  }
  applyChartStateToDom();
  applyCollapseToDom();
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────

function buildClassFilter(containerId, slotIdx) {
  const cf = document.getElementById(containerId);
  cf.innerHTML = '';
  const activeClass = state.slots[slotIdx].cls;
  CLASSES.forEach(c => {
    const b = document.createElement('button');
    b.className = 'cbtn' + (c === activeClass ? ' on' : '');
    b.textContent = CLASS_SHORT[c];
    b.title = c;
    b.onclick = () => {
      state.slots[slotIdx].cls = c;
      renderSidebar();
    };
    cf.appendChild(b);
  });
}

function buildWeaponList(containerId, slotIdx) {
  const slot = state.slots[slotIdx];
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  const weapons = W.filter(w => w.cls === slot.cls);
  if (!weapons.length) { el.innerHTML = '<div class="no-w">No weapons</div>'; return; }
  weapons.forEach(w => {
    const isActive = w === slot.weapon;
    const b = document.createElement('button');
    b.className = 'wbtn' + (isActive ? (slotIdx === 0 ? ' p1' : ' p2') : '');
    b.textContent = w.name;
    b.onclick = () => {
      slot.weapon = w;
      resetAttsForWeapon(slot.atts, w);
      renderSidebar();
      renderStats();
    };
    el.appendChild(b);
  });
}

function buildAttachmentSection(containerId, slotIdx) {
  const slot = state.slots[slotIdx];
  Loadout.renderAttachmentSection({
    containerId,
    atts: slot.atts,
    weapon: slot.weapon,
    data: LOADOUT_DATA,
    showAssumedFootnote: false,
    onChange: () => {
      updateAssumedFootnote();
      renderStats();
    },
  });
}

function updateAssumedFootnote() {
  document.querySelectorAll('.att-note.assumed-note').forEach(el => el.remove());
  const hasAssumed =
    Loadout.hasSelectedAssumedAtt(state.slots[0].atts, LOADOUT_DATA) ||
    (state.comparing && Loadout.hasSelectedAssumedAtt(state.slots[1].atts, LOADOUT_DATA));
  const noteTarget = document.getElementById(state.comparing ? 'attSection2' : 'attSection1');
  if (hasAssumed && noteTarget)
    noteTarget.insertAdjacentHTML('beforeend',
      '<div class="att-note assumed-note">* Assumed stats until datamined attachment values are available.</div>');
}

function renderSidebar() {
  buildClassFilter('classFilter1', 0);
  buildWeaponList('wList1', 0);
  buildAttachmentSection('attSection1', 0);
  if (state.comparing) {
    const cloneBtn = document.getElementById('cloneLoadoutBtn');
    if (cloneBtn) cloneBtn.disabled = !state.slots[0].weapon;
    buildClassFilter('classFilter2', 1);
    buildWeaponList('wList2', 1);
    buildAttachmentSection('attSection2', 1);
  }
  updateAssumedFootnote();
}

function cloneCompareLoadout() {
  if (!state.slots[0].weapon) return;
  state.comparing = true;
  state.slots[1].cls = state.slots[0].weapon.cls;
  state.slots[1].weapon = state.slots[0].weapon;
  state.slots[1].atts = { ...state.slots[0].atts };
  document.getElementById('cmpBtn').classList.add('on');
  document.getElementById('cmpSection').style.display = 'block';
  renderSidebar();
  renderStats();
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────

function renderStats() {
  scheduleUrlSync();
  const w1 = state.slots[0].weapon;
  const w2 = state.comparing ? state.slots[1].weapon : null;
  const hasAny = w1 || w2;
  document.getElementById('emptyState').style.display = hasAny ? 'none' : 'flex';
  document.getElementById('statsArea').style.display = hasAny ? 'flex' : 'none';
  if (hasAny) document.getElementById('statsArea').style.flexDirection = 'column';
  if (!hasAny) return;
  renderOverview();
  renderChart();
  renderBTK();
  renderRecoil();
}

function renderOverview() {
  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;

  const hdr = document.getElementById('wHeader');
  hdr.innerHTML = '';
  const burstBadgeTooltip = w => {
    if (w.fireMode !== 'burst' || !w.burstRounds) return '';
    const intraMs = 1000 * (60 / (w.burstRpm ?? w.rpm ?? 600));
    const postMs = 1000 * shotIntervalAfter(w, w.burstRounds);
    const extraMs = Math.max(0, postMs - intraMs);
    const effectiveRpm = w.burstBurstsPerMinute
      ? w.burstBurstsPerMinute * w.burstRounds
      : 60000 / postMs;
    const delayText = extraMs >= 0.5 ? `${extraMs.toFixed(0)}ms` : 'None';
    return `Burst Delay: ${delayText}\nEffective fire rate: ${effectiveRpm.toFixed(0)}RPM`;
  };
  const appendFireModeBadge = (w, hdr) => {
    if (!w) return;
    const label =
      w.fireMode === 'burst' && w.burstRounds ? `${w.burstRounds}-Rd Burst` :
      w.fireMode === 'burst' ? 'Burst' :
      w.fireMode === 'auto' ? 'Full Auto' :
      w.fireMode === 'semi' ? 'Semi-Auto' :
      w.fireMode === 'bolt' ? 'Bolt Action' :
      w.fireMode === 'pump' ? 'Pump Action' :
      null;
    if (!label) return;
    const bb = document.createElement('span'); bb.className = 'wbadge-burst'; bb.textContent = label;
    const tooltip = burstBadgeTooltip(w);
    if (tooltip) {
      bb.title = tooltip;
      bb.setAttribute('aria-label', `${label}. ${tooltip.replace(/\n/g, '. ')}`);
    }
    hdr.appendChild(bb);
  };
  if (w1) {
    const s = document.createElement('span'); s.className = 'wname'; s.textContent = wLabel(w1); hdr.appendChild(s);
    const b = document.createElement('span'); b.className = 'wbadge'; b.textContent = w1.cls; hdr.appendChild(b);
    appendFireModeBadge(w1, hdr);
  }
  if (w2) {
    const vs = document.createElement('span'); vs.style.cssText = 'color:var(--muted);margin:0 3px;font-size:12px'; vs.textContent = 'vs'; hdr.appendChild(vs);
    const s = document.createElement('span'); s.className = 'wname2'; s.textContent = wLabel(w2); hdr.appendChild(s);
    const b = document.createElement('span'); b.className = 'wbadge'; b.textContent = w2.cls; hdr.appendChild(b);
    appendFireModeBadge(w2, hdr);
  }

  const grid = document.getElementById('sGrid');
  grid.parentElement?.querySelectorAll('.damage-provenance-note, .sweet-spot-note').forEach(el => el.remove());
  const sweetSpots = [w1, w2].filter(weapon => weapon?.sweetSpot?.source === 'EA');
  if (sweetSpots.length) {
    const note = document.createElement('div');
    note.className = 'att-note sweet-spot-note';
    note.textContent = sweetSpots.map(weapon => {
      const range = weapon.sweetSpot.rangeM;
      return range ? `${weapon.name} EA sweet spot: ${range[0]}–${range[1]} m.` : `${weapon.name}: no EA sweet spot.`;
    }).join(' ');
    grid.parentElement?.insertBefore(note, grid);
  }
  grid.innerHTML = '';
  const fields = [
    { lbl: 'Base Dmg',    compute: w => getDmg(w, 0),                    unit: '',    fmt: v => v != null ? v.toFixed(1) : '—',       higherBetter: true,
      tooltip: 'Damage dealt by one unarmored chest shot at 0m before range falloff. REDSEC armor is not modeled.' },
    { lbl: 'HS Mult',     k: '_hsMult',                                  unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true,
      tooltip: 'Headshot damage multiplier after ammo effects are applied.' },
    { lbl: 'Fire Rate',   compute: w => w.cls === 'Shotgun' ? null : w.rpm, unit: 'RPM', fmt: formatInGameRpm,                   higherBetter: true, group: 'combat',
      tooltip: 'Weapon fire rate in rounds per minute.' },
    { lbl: 'Bullet Vel',  k: 'bulletVel',                                unit: 'm/s', fmt: v => v ?? '—',                            higherBetter: true, group: 'combat',
      tooltip: 'Projectile velocity after barrel effects are applied. Higher values reduce travel time and lead.' },
    { lbl: 'Mag Size',    k: 'mag',                                      unit: 'Rds', fmt: v => v,                                   higherBetter: true,
      tooltip: 'Rounds available in the selected magazine.' },
    { lbl: 'Tac Reload',  k: 'tacRld',                                   unit: 's',   fmt: v => v != null ? (+v).toFixed(3) : '—',   lowerBetter: true,
      tooltip: 'Tactical reload time in seconds, using the selected magazine and Mag Catch when applicable.' },
    { lbl: 'Collateral Mult', k: '_collateralMult',                      unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true,
      tooltip: 'Damage multiplier applied to bullets that pass through a target or surface. Varies by ammo type and weapon class.' },
    { lbl: 'ADS Time',    compute: w => w._adsTimeMs ?? w.adsTime,       unit: 'ms',  fmt: v => v != null ? v : '—',                 lowerBetter: true, group: 'mobility',
      tooltip: 'Time to aim down sights. Can be affected by magazine, barrel, and grip selections.',
      estFn: w => !w._adsTimeMs && w.adsTime != null },
    { lbl: 'Strafe Spd',  k: '_adsMoveSpeedMult',                        unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true, group: 'mobility',
      tooltip: 'Movement speed multiplier while aiming down sights. Can be affected by magazine, grip, and ammo selections.' },
    { lbl: 'Deploy Spd',  k: 'deployT',                                  unit: 'ms',  fmt: v => v != null ? Math.round(v * 1000) : '—', lowerBetter: true,
      tooltip: 'Time to equip/switch to the weapon in milliseconds. Lower is faster. Attachment effects are assumed placeholders until full attachment data is published.' },
    { lbl: 'Sprint Rec',  k: '_sprintRecoveryMs',                        unit: 'ms',  fmt: v => v != null ? v : '—',                 lowerBetter: true,
      tooltip: 'Sprint-to-fire recovery time after magazine and ergonomics effects. Lower is faster.' },
    { lbl: 'Recoil/Shot', k: 'recoilV',                                  unit: '°',   fmt: v => v.toFixed(2),                        lowerBetter: true, group: 'recoil',
      tooltip: 'ADS vertical recoil added per shot after ADS recoil-tier attachment effects.' },
    { lbl: 'Recoil Dir',  k: 'recoilDir',                                unit: '°',   fmt: v => ((-v) >= 0 ? '+' : '') + (-v),       absDiff: true, group: 'recoil',
      tooltip: 'Average recoil direction from vertical. Positive values pull right; negative values pull left.' },
    { lbl: 'STD/Mov Sprd', compute: w => ({ stand: w.spread?.adsStand?.[0] ?? 0.05, move: w._movingAdsMinSpreadDeg ?? w.spread?.adsMove?.[0] ?? 0.32 }), unit: '',
      fmt: obj => { const s = obj?.stand != null ? `${obj.stand.toFixed(2)}<span class="sunit">°</span>` : '—'; const m = obj?.move != null ? `${obj.move.toFixed(2)}<span class="sunit">°</span>` : '—'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true, group: 'recoil',
      tooltip: 'Standing ADS spread and moving ADS spread. Lower is more accurate. Moving ADS spread can be affected by laser and barrel selections.' },
    { lbl: '3D/Map Spot', compute: w => ({ spot: w._worldSpot, minimap: w._minimapSpot }), unit: '',
      fmt: obj => { const s = obj && obj.spot > 0 ? `${obj.spot}<span class="sunit">m</span>` : '–'; const m = obj && obj.minimap > 0 ? `${obj.minimap}<span class="sunit">m</span>` : '–'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true,
      tooltip: 'Distance at which you are spotted in the 3D world and on the minimap while firing. "–" means you are never 3D spotted.' },
  ];
  if (w1?.pellets || w2?.pellets) fields.splice(4, 0, { lbl: 'Pellets', k: 'pellets', unit: '', fmt: v => v ?? '—',
    tooltip: 'Number of pellets fired per shot. Shotgun damage is pellet damage multiplied by this count.' });

  const cardValueHtml = f => {
    const getVal = w => f.compute ? f.compute(w) : w?.[f.k];
    const isEst = w => f.estFn ? f.estFn(w) : f.est;
    if (!w2 || !state.comparing) {
      const wx = w1 || w2;
      const v = getVal(wx);
      return `<div class="sval c1">${f.fmt(v)}<span class="sunit">${f.unit}</span>${isEst(wx) ? '<span class="sest">est</span>' : ''}</div>`;
    }
    const v1 = w1 ? getVal(w1) : null, v2 = w2 ? getVal(w2) : null;
    let diff = '';
    if (!f.noDiff && v1 != null && v2 != null && v1 !== v2) {
      if (f.absDiff) {
        const delta = Math.round((-v2) - (-v1));
        diff = `<span class="diff" style="background:rgba(122,138,138,.12);color:var(--muted)">${delta > 0 ? '+' : ''}${delta}°</span>`;
      } else if (f.absoluteDelta) {
        const delta = Math.round(v2 - v1);
        const w2better = (f.higherBetter && delta > 0) || (f.lowerBetter && delta < 0);
        diff = `<span class="diff ${w2better ? 'd-up' : 'd-dn'}">${delta > 0 ? '+' : ''}${delta}m</span>`;
      } else {
        const pct = Math.round(Math.abs(v2 - v1) / Math.max(Math.abs(v1), 0.001) * 100);
        const w2better = (f.higherBetter && v2 > v1) || (f.lowerBetter && v2 < v1);
        diff = `<span class="diff ${w2better ? 'd-up' : 'd-dn'}">${w2better ? '+' : '-'}${pct}%</span>`;
      }
    }
    const est1 = w1 ? isEst(w1) : false, est2 = w2 ? isEst(w2) : false;
    return `<div class="scmp"><div class="scmp-row"><span class="sval c1">${v1 != null ? f.fmt(v1) : '—'}<span class="sunit">${f.unit}</span>${est1 ? '<span class="sest">est</span>' : ''}</span></div><div class="scmp-row"><span class="sval c2">${v2 != null ? f.fmt(v2) : '—'}<span class="sunit">${f.unit}</span>${est2 ? '<span class="sest">est</span>' : ''}</span>${diff}</div></div>`;
  };

  // Group the stat cards into labeled, color-accented sections for scannability.
  const SEC_OF = {
    'Base Dmg': 'combat', 'HS Mult': 'combat', 'Fire Rate': 'combat', 'Bullet Vel': 'combat',
    'Pellets': 'combat', 'Mag Size': 'ammo', 'Tac Reload': 'ammo', 'Collateral Mult': 'ammo',
    'ADS Time': 'mobility', 'Strafe Spd': 'mobility', 'Deploy Spd': 'mobility', 'Sprint Rec': 'mobility',
    'Recoil/Shot': 'recoil', 'Recoil Dir': 'recoil', 'STD/Mov Sprd': 'recoil',
    '3D/Map Spot': 'conceal',
  };
  const STAT_ROWS = [
    [
      { key: 'combat',   label: 'Combat',      color: '#c9a227' },
      { key: 'recoil',   label: 'Recoil',      color: '#d8704a' },
      { key: 'conceal',  label: 'Concealment', color: '#7f9a9a' },
    ],
    [
      { key: 'ammo',     label: 'Ammo',        color: '#78a840' },
      { key: 'mobility', label: 'Mobility',    color: '#4d94d0' },
    ],
  ];
  for (const rowSecs of STAT_ROWS) {
    const row = document.createElement('div');
    row.className = 'sgrow';
    rowSecs.forEach(sec => {
      if (!sec) return;
      const secFields = fields.filter(f => (SEC_OF[f.lbl] || 'combat') === sec.key);
      if (!secFields.length) return;
      const block = document.createElement('div');
      block.className = 'sgroup';
      block.style.borderLeftColor = sec.color;
      const hd = document.createElement('div');
      hd.className = 'sgroup-hd';
      hd.style.color = sec.color;
      hd.textContent = sec.label;
      block.appendChild(hd);
      const sg = document.createElement('div');
      sg.className = 'sgrid';
      secFields.forEach(f => {
        const card = document.createElement('div');
        card.className = 'scard';
        if (f.tooltip) card.title = f.tooltip;
        card.innerHTML = `<div class="slbl">${f.lbl}</div>` + cardValueHtml(f);
        sg.appendChild(card);
      });
      block.appendChild(sg);
      row.appendChild(block);
    });
    grid.appendChild(row);
  }
}

// ── CHART ─────────────────────────────────────────────────────────────────────

function setChartMode(m) {
  state.chart.mode = m;
  document.getElementById('modeDmg').classList.toggle('on', m === 'dmg');
  document.getElementById('modeBtk').classList.toggle('on', m === 'btk');
  document.getElementById('modeTtk').classList.toggle('on', m === 'ttk');
  const isTtk = m === 'ttk';
  if (!isTtk) { state.chart.showAds = false; document.getElementById('adsToggleBtn').classList.remove('on'); }
  document.getElementById('adsToggleBtn').style.display = isTtk ? '' : 'none';
  document.getElementById('chartTitle').textContent = m === 'btk' ? 'BTK Chart' : m === 'ttk' ? (state.chart.showAds ? 'ADS+TTK Chart' : 'TTK Chart') : 'Damage Chart';
  document.getElementById('btkHsSelect').style.display = (m === 'btk' || m === 'ttk') ? '' : 'none';
  renderChart();
}
function toggleAdsToggle() {
  state.chart.showAds = !state.chart.showAds;
  document.getElementById('adsToggleBtn').classList.toggle('on', state.chart.showAds);
  document.getElementById('chartTitle').textContent = state.chart.showAds ? 'ADS+TTK Chart' : 'TTK Chart';
  renderChart();
  renderBTK();
}
function setBtkHS(n) { state.chart.btkHS = n; renderChart(); renderBTK(); }

function updateDmgChart(ctx, config) {
  if (!dmgChart) {
    dmgChart = new Chart(ctx, config);
    return;
  }
  dmgChart.config.type = config.type;
  dmgChart.data = config.data;
  dmgChart.options = config.options;
  dmgChart.update('none');
}

// Where the two compared weapons' lines coincide, dash the weapon-1 line
// (drawn on top — Chart.js paints lower dataset indices last) so weapon 2's
// color shows through the gaps as an alternating two-color line.
function dashOverlap(datasets) {
  const solids = datasets.filter(ds => ds._weapon && !ds.isBand && !ds.isBaseline && !ds.borderDash);
  if (solids.length !== 2) return;
  const [top, under] = solids;
  top.segment = {
    borderDash: ctx =>
      top.data[ctx.p0DataIndex] === under.data[ctx.p0DataIndex] &&
      top.data[ctx.p1DataIndex] === under.data[ctx.p1DataIndex]
        ? [5, 5] : undefined,
  };
}

function renderChart() {
  scheduleUrlSync();

  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;
  const { mode, btkHS, showAds } = state.chart;
  const mr = maxRange([w1, w2]);
  const labels = []; for (let r = 0; r <= mr; r++) labels.push(r);
  const ctx = document.getElementById('dmgChart');

  const legEl = document.getElementById('chartLegend');
  if (legEl) {
    let legHtml = [[w1, '#c9a227'], [w2, '#4d94d0']].filter(([w]) => w)
      .map(([w, col]) => `<div class="rc-legend-item"><div class="rc-legend-dot" style="background:${col}"></div><span>${w.name}</span></div>`).join('');
    legEl.innerHTML = legHtml;
  }

  const missingDamage = [w1, w2].some(weapon => weapon && (!Array.isArray(weapon.dmg) || weapon.dmg.length === 0));
  if (missingDamage) {
    if (dmgChart) {
      dmgChart.destroy();
      dmgChart = null;
    }
    if (legEl) legEl.innerHTML += '<div class="rc-legend-item" style="color:var(--muted);margin-left:auto">Damage/BTK/TTK unavailable for a selected weapon.</div>';
    return;
  }

  if (mode === 'btk') {
    const btkDs = (w, color, label, slot, headshots = btkHS, baseline = false) => ({
      label, data: labels.map(r => getBTKWithHits(w, r, headshots)),
      borderColor: color, backgroundColor: 'transparent',
      borderWidth: baseline ? 1.5 : 2, borderDash: baseline ? [6, 5] : undefined,
      pointRadius: 0, tension: 0, stepped: 'before',
      isBaseline: baseline, _weaponSlot: slot, _weapon: w,
    });
    // Limb band: soft fill between the all-chest line and the all-limb worst case.
    const bandDs = (w, fillColor, slot) => ({
      label: `${wLabel(w)} (limbs)`,
      data: labels.map(r => getBTKWithHits(w, r, btkHS, limbMult(w))),
      borderColor: 'transparent', backgroundColor: fillColor,
      borderWidth: 0, pointRadius: 0, tension: 0, stepped: 'before',
      fill: '-1', isBand: true, _weaponSlot: slot, _weapon: w,
    });
    const datasets = [];
    if (btkHS > 0 && w1) datasets.push(btkDs(w1, 'rgba(201,162,39,0.28)', `${wLabel(w1)} (0 HS)`, 1, 0, true));
    if (btkHS > 0 && w2) datasets.push(btkDs(w2, 'rgba(77,148,208,0.28)', `${wLabel(w2)} (0 HS)`, 2, 0, true));
    if (w1) {
      datasets.push(btkDs(w1, '#c9a227', wLabel(w1), 1));
      if (limbMult(w1) !== 1) datasets.push(bandDs(w1, 'rgba(201,162,39,0.16)', 1));
    }
    if (w2) {
      datasets.push(btkDs(w2, '#4d94d0', wLabel(w2), 2));
      if (limbMult(w2) !== 1) datasets.push(bandDs(w2, 'rgba(77,148,208,0.16)', 2));
    }
    dashOverlap(datasets);
    const yMax = Math.max(9, ...datasets.flatMap(ds => ds.data));
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { bottom: 0 } },
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, filter: i => !i.dataset.isBaseline && !i.dataset.isBand, callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          // Bullet view: bullet counts only, no timings.
          label: i => {
            const w = i.dataset._weapon;
            const chest = i.raw;
            const limb = getBTKWithHits(w, i.dataIndex, btkHS, limbMult(w));
            if (limb === chest) return `${w.name}: ${chest} BTK`;
            return `${w.name}: ${chest}–${limb} BTK chest–limbs`;
          },
        } } },
        scales: {
          x: chartXAxis(mr),
          y: { min: 1, max: yMax, title: { display: true, text: 'Bullets to Kill', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a', stepSize: 1, precision: 0 }, grid: { color: 'rgba(40,48,48,0.6)' } },
        },
      },
    });
    return;
  }

  if (mode === 'ttk') {
    const ttkAt = (w, r, zoneMult = 1) => {
      const btk = getBTKWithHits(w, r, btkHS, zoneMult);
      return (getTTK(w, btk) ?? 0) + (showAds ? (w._adsTimeMs ?? 0) : 0);
    };
    const ttkDs = (w, color, label, zoneMult = 1, band = false) => ({
      label, data: labels.map(r => ttkAt(w, r, zoneMult)),
      borderColor: band ? 'transparent' : color, backgroundColor: band ? color : 'transparent',
      borderWidth: band ? 0 : 2, pointRadius: 0, tension: 0, stepped: 'before',
      fill: band ? '-1' : false, isBand: band, _weapon: w,
    });
    const datasets = [];
    if (w1) {
      datasets.push(ttkDs(w1, '#c9a227', wLabel(w1)));
      if (limbMult(w1) !== 1) datasets.push(ttkDs(w1, 'rgba(201,162,39,0.16)', `${wLabel(w1)} (limbs)`, limbMult(w1), true));
    }
    if (w2) {
      datasets.push(ttkDs(w2, '#4d94d0', wLabel(w2)));
      if (limbMult(w2) !== 1) datasets.push(ttkDs(w2, 'rgba(77,148,208,0.16)', `${wLabel(w2)} (limbs)`, limbMult(w2), true));
    }
    dashOverlap(datasets);
    const allVals = datasets.flatMap(d => d.data).filter(v => v > 0);
    const yMax = allVals.length ? Math.ceil(Math.max(...allVals) / 100) * 100 + 100 : 1000;
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { bottom: 0 } },
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, filter: i => !i.dataset.isBand, callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          // Time view: timings only, no bullet counts.
          label: i => {
            const w = i.dataset._weapon;
            const btk = getBTKWithHits(w, i.dataIndex, btkHS);
            const limbBtk = getBTKWithHits(w, i.dataIndex, btkHS, limbMult(w));
            if (limbBtk !== btk) {
              return `${w.name}: ${fmtTTK(i.raw)}–${fmtTTK(ttkAt(w, i.dataIndex, limbMult(w)))} chest–limbs`;
            }
            if (showAds && w._adsTimeMs) return `${w.name}: ${fmtTTK(i.raw)} incl. ${w._adsTimeMs}ms ADS`;
            return `${w.name}: ${fmtTTK(i.raw)}`;
          },
        } } },
        scales: {
          x: chartXAxis(mr),
          y: { min: 0, max: yMax, title: { display: true, text: showAds ? 'ADS + Time to Kill (ms)' : 'Time to Kill (ms)', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a', stepSize: 100 }, grid: { color: 'rgba(40,48,48,0.6)' } },
        },
      },
    });
    return;
  }

  // Damage chart
  const dmgAt = (w, r, zoneMult = 1) => Math.min(100, damagePerShotAtRange(w, r) * zoneMult);
  // Bolt-actions fall off linearly between tiers (confirmed by Sym); every other
  // class drops instantly, so only snipers get a straight line instead of a step.
  const steppedFor = w => (w.cls === 'Sniper Rifle' ? false : 'before');
  const buildDs = (w, color, label) => ({
    label, data: labels.map(r => +dmgAt(w, r).toFixed(2)),
    borderColor: color, backgroundColor: 'transparent',
    borderWidth: 2, pointRadius: 0, tension: 0, stepped: steppedFor(w), _weapon: w,
  });
  // Limb band: soft fill between the chest damage curve and the limb damage curve.
  const limbDs = (w, fillColor) => ({
    label: `${wLabel(w)} (limbs)`,
    data: labels.map(r => +dmgAt(w, r, limbMult(w)).toFixed(2)),
    borderColor: 'transparent', backgroundColor: fillColor,
    borderWidth: 0, pointRadius: 0, tension: 0, stepped: steppedFor(w),
    fill: '-1', isBand: true, _weapon: w,
  });
  // Preserve the existing chest-BTK reference lines underneath the new bands.
  const primaryW = w1 || w2;
  const thresholds = []; const seen = new Set();
  for (let r = 0; r <= mr; r++) {
    const btk = getBTKWithHits(primaryW, r);
    if (!seen.has(btk)) { seen.add(btk); thresholds.push({ btk, dmg: 100 / btk }); }
  }
  const thresholdDatasets = thresholds.slice(0, 6).map(t => ({
    label: `${t.btk}BTK`, data: labels.map(() => +t.dmg.toFixed(2)),
    borderColor: 'rgba(150,150,150,0.18)', backgroundColor: 'transparent',
    borderWidth: 1, borderDash: [4, 4], pointRadius: 0, tension: 0,
    isBaseline: true,
  }));
  const datasets = [...thresholdDatasets];
  if (w1) {
    datasets.push(buildDs(w1, '#c9a227', wLabel(w1)));
    if (limbMult(w1) !== 1) datasets.push(limbDs(w1, 'rgba(201,162,39,0.16)'));
  }
  if (w2) {
    datasets.push(buildDs(w2, '#4d94d0', wLabel(w2)));
    if (limbMult(w2) !== 1) datasets.push(limbDs(w2, 'rgba(77,148,208,0.16)'));
  }
  dashOverlap(datasets);
  const dmgYMax = damageYMax([w1, w2]);
  updateDmgChart(ctx, {
    type: 'line', data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      layout: { padding: { bottom: 0 } },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false,
        filter: i => !i.dataset.isBand && !i.dataset.isBaseline,
        callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          // Damage view: damage only. Bullet and time counts live in their own views.
          label: i => {
            const r = i.dataIndex; const w = i.dataset._weapon;
            const d = w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r);
            const line = `${w.name}: ${d.toFixed(1)} dmg`;
            if (limbMult(w) === 1) return line;
            const dl = d * limbMult(w), dh = d * (w._hsMult ?? 1.34);
            return [line, `  limbs ${dl.toFixed(1)} · head ${Math.min(100, dh).toFixed(1)}`];
          },
        },
      } },
      scales: {
        x: chartXAxis(mr),
        y: { min: 0, max: dmgYMax, title: { display: true, text: 'Damage per shot', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a' }, grid: { color: 'rgba(40,48,48,0.6)' } },
      },
    },
  });
}

function renderBTK() {
  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;
  const { btkHS, showAds } = state.chart;
  const ranges = btkRanges(w1, w2);
  const ttkHdr = showAds ? 'ADS+TTK' : 'TTK';
  const fmtT = (w, t) => { const base = t ?? 0; return fmtTTK(showAds && w._adsTimeMs ? base + w._adsTimeMs : t); };
  let html = '<table class="btk-tbl"><thead><tr><th>Range</th>';
  if (w1) html += `<th style="color:var(--accent)">BTK</th><th style="color:var(--accent)">${ttkHdr}</th>`;
  if (w2) html += `<th style="color:var(--accent2)">BTK</th><th style="color:var(--accent2)">${ttkHdr}</th>`;
  html += '</tr></thead><tbody>';
  // Each cell shows chest–limb ranges when the limb multiplier changes the outcome.
  const cells = (w, r) => {
    const b = getBTKWithHits(w, r, btkHS), bl = getBTKWithHits(w, r, btkHS, limbMult(w));
    if (b == null || bl == null) return { bTxt: '—', tTxt: '—' };
    const bTxt = bl !== b ? `${b}–${bl}` : `${b}`;
    const tTxt = bl !== b
      ? `${fmtT(w, getTTK(w, b)).replace(/ms$/, '')}–${fmtT(w, getTTK(w, bl))}`
      : fmtT(w, getTTK(w, b));
    return { bTxt, tTxt };
  };
  let prev1 = null, prev2 = null;
  ranges.forEach(r => {
    html += `<tr><td class="rng">${r}m</td>`;
    if (w1) { const { bTxt, tTxt } = cells(w1, r); const chg = prev1 !== null && bTxt !== prev1; html += `<td class="bv${chg ? ' bchg' : ''}">${bTxt}</td><td class="tv">${tTxt}</td>`; prev1 = bTxt; }
    if (w2) { const { bTxt, tTxt } = cells(w2, r); const chg = prev2 !== null && bTxt !== prev2; html += `<td class="bv${chg ? ' bchg2' : ''}">${bTxt}</td><td class="tv">${tTxt}</td>`; prev2 = bTxt; }
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('btkArea').innerHTML = html;
}

// ── RECOIL / SPREAD ────────────────────────────────────────────────────────────

function parseSpreadBulletSpec(spec, shotCount) {
  const text = spec.trim().toLowerCase();
  if (!text) return [];
  if (text === 'all') return Array.from({ length: shotCount }, (_, i) => i + 1);
  const everyMatch = text.match(/^every\s+(\d+)$/);
  if (everyMatch) {
    const step = Math.max(1, Math.round(Number(everyMatch[1])));
    const out = [];
    for (let s = 1; s <= shotCount; s += step) out.push(s);
    return out;
  }
  const out = [];
  text.split(/[,;\s]+/).forEach(part => {
    if (!part) return;
    const rng = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rng) {
      const a = Math.round(Number(rng[1])), b = Math.round(Number(rng[2]));
      for (let v = Math.min(a, b); v <= Math.max(a, b); v++) out.push(v);
      return;
    }
    const v = Math.round(Number(part));
    if (Number.isFinite(v)) out.push(v);
  });
  return out.filter(v => v >= 1 && v <= shotCount);
}
/**
 * Bubble sample points. Shot 1 is always skipped: it fires from the resting
 * spread, so its bubble is a dot. Spread then climbs fast over the next few
 * shots before flattening at the effective maximum, so the default samples
 * geometrically — dense early, sparse across the plateau — and adapts to
 * whatever burst length is set rather than assuming 20.
 */
function spreadGrowthCurve(shotCount) {
  if (shotCount < 2) return [];
  const out = [];
  for (let v = 2; v < shotCount; v = Math.max(v + 1, Math.round(v * 1.6))) out.push(v);
  out.push(shotCount);
  return out;
}
function spreadPresetShots(preset, shotCount) {
  switch (preset) {
    case 'all':    return Array.from({ length: shotCount - 1 }, (_, i) => i + 2);
    case 'early':  return [2, 3, 4, 5, 6].filter(v => v <= shotCount);
    case 'custom': return parseSpreadBulletSpec(document.getElementById('rcSpreadShotsInput')?.value ?? '', shotCount);
    default:       return spreadGrowthCurve(shotCount);
  }
}
function getSpreadBulletIdxs(N) {
  const values = spreadPresetShots(state.recoil.spreadPreset, N);
  const bullets = values.length ? values : spreadGrowthCurve(N);
  return [...new Set(bullets)].map(v => v - 1);
}
function selectedRecoilShotCount() {
  const input = document.getElementById('rcShotCountInput');
  return Math.max(1, Math.min(100, Math.round(+(input?.value ?? 20) || 20)));
}
function syncRecoilShotCount() {
  const count = selectedRecoilShotCount();
  const input = document.getElementById('rcShotCountInput');
  if (input) input.value = count;
  renderRecoil();
}

// The slider is the whole control: 0% is "no compensation", so there is no
// separate on/off toggle to keep in sync with it.
function syncCompensationControls() {
  const level = state.recoil.compensationLevel;
  const range = document.getElementById('rcCompRange');
  const input = document.getElementById('rcCompInput');
  document.getElementById('rcCompRow')?.classList.toggle('idle', level <= 0);
  if (range) { range.value = level; paintRange(range, { idle: level <= 0 }); }
  if (input && document.activeElement !== input) input.value = level;
}
function syncCompensationLevel(source = 'input') {
  const el = document.getElementById(source === 'range' ? 'rcCompRange' : 'rcCompInput');
  const raw = +(el?.value ?? 0);
  state.recoil.compensationLevel = Math.max(0, Math.min(125, Math.round(Number.isFinite(raw) ? raw : 0)));
  syncCompensationControls();
  renderRecoil();
}
function toggleRecoilLayer(layer) {
  if (!(layer in state.recoil.layers)) return;
  state.recoil.layers[layer] = !state.recoil.layers[layer];
  const l = state.recoil.layers;
  if (!l.scatter && !l.spray && !l.path && !l.spread && !l.cone) l[layer] = true;
  renderRecoil();
}
function setRecoilAim(aim) {
  state.recoil.aim = aim === 'hip' ? 'hip' : 'ads';
  setSimContext({ aimState: state.recoil.aim });
  renderRecoil();
}
function setRecoilStance(stance) {
  state.recoil.stance = stance === 'move' ? 'move' : 'stand';
  setSimContext({ stanceState: state.recoil.stance });
  renderRecoil();
}
function applyViewLayers(view) {
  const saved = state.recoil.savedLayers[view];
  if (saved) state.recoil.layers = { ...saved };
}
function setRecoilView(view) {
  const next = view === 'target' ? 'target' : 'angle';
  if (state.recoil.view === next) return;
  // Each view remembers its own overlays, so the target view can start without
  // the scatter cloud without discarding the angle plot's setup.
  state.recoil.savedLayers[state.recoil.view] = { ...state.recoil.layers };
  state.recoil.view = next;
  applyViewLayers(next);
  // Flag the swap so the plot and its stats fade in together, which reads as
  // one chart changing lens rather than two unrelated panels appearing.
  ['rcPlotColumn', 'rcStats'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('rc-view-swap');
    void el.offsetWidth;
    el.classList.add('rc-view-swap');
  });
  renderRecoil();
}
/**
 * Ctrl+click mirrors what the player actually does: point somewhere and fire a
 * fresh burst. So it both places the aim point and rolls a new spray sample.
 */
function fireAtAimPoint(worldX, worldY) {
  state.recoil.customAim = { x: worldX, y: worldY };
  state.recoil.targetAim = 'custom';
  state.recoil.refSeed = (Math.random() * 0x100000000) >>> 0;
  renderRecoil();
}
function currentAimOffset() {
  return targetAimOffset(state.recoil.targetAim, state.recoil.customAim);
}
function canvasToWorld(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const { PW, PH } = plotBox();
  const u = ((clientX - rect.left) * canvas.width / rect.width - PLOT_PAD.l) / PW;
  const v = ((clientY - rect.top) * canvas.height / rect.height - PLOT_PAD.t) / PH;
  const view = recoilViewport();
  return {
    x: view.xCenter + (u - 0.5) * view.xSpan,
    y: view.yCenter + (0.5 - v) * view.ySpan,
  };
}
function syncTargetDistance(source = 'input') {
  const el = document.getElementById(source === 'range' ? 'rcDistanceRange' : 'rcDistanceInput');
  const raw = +(el?.value ?? 30);
  state.recoil.distance = Math.max(1, Math.min(150, Math.round(Number.isFinite(raw) ? raw : 30)));
  renderRecoil();
}
function syncZoomFromSlider() {
  const el = document.getElementById('rcZoomRange');
  const raw = +(el?.value ?? 50);
  if (state.recoil.view === 'target') {
    setMagnificationIndex(raw);
  } else {
    // scaleH is a half-span in degrees, so a wider span means less zoom.
    const pct = Math.max(0, Math.min(100, raw)) / 100;
    state.recoil.scaleH = RECOIL_SCALE_MAX - pct * (RECOIL_SCALE_MAX - RECOIL_SCALE_MIN);
  }
  renderRecoil();
}
/** The zoom slider indexes the magnification ladder in target view, percent in angle view. */
function zoomSliderBounds() {
  return state.recoil.view === 'target'
    ? { min: 0, max: SCOPE_MAGNIFICATIONS.length - 1, step: 1, value: SCOPE_MAGNIFICATIONS.indexOf(currentMagnification()) }
    : { min: 0, max: 100, step: 1, value: (RECOIL_SCALE_MAX - state.recoil.scaleH) / (RECOIL_SCALE_MAX - RECOIL_SCALE_MIN) * 100 };
}
/** Paint the filled portion of a range input so every slider reads the same. */
function paintRange(el, { idle = false } = {}) {
  if (!el) return;
  const min = +el.min || 0;
  const max = +el.max || 100;
  const pct = max === min ? 0 : ((+el.value - min) / (max - min)) * 100;
  el.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
  el.classList.toggle('idle', idle);
}
function setRecoilPlatform(platform) {
  state.recoil.platform = platform === 'console' ? 'console' : 'pc';
  renderRecoil();
}
function cmAtDistance(angleDeg, distanceM = state.recoil.distance) {
  return Math.tan(angleDeg * Math.PI / 180) * distanceM * 100;
}
function plotBox() {
  const canvas = document.getElementById('rcMain');
  const cw = canvas?.width || 430;
  const ch = canvas?.height || 430;
  return { PW: cw - PLOT_PAD.l - PLOT_PAD.r, PH: ch - PLOT_PAD.t - PLOT_PAD.b };
}
// Base framing for the target view. It is deliberately keyed on the loadout,
// burst length and range only: rerolling the sample or moving the aim point
// must never yank the user's zoom and pan out from under them, so both are
// measured against the deterministic seed and the default chest aim.
let targetBaseFrame = null;
let targetBaseFrameKey = '';

function computeTargetBaseFrame(weapons, shotCount) {
  const live = weapons.filter(Boolean);
  // Only the loadout and range refit the view. Shot count, stance, input device
  // and the recoil-control slider deliberately do not: changing a control must
  // not make the chart lurch. A longer burst simply runs off frame until the
  // user asks for a refit.
  const key = [live.map(w => w.id).join('+'), state.recoil.distance].join('|');
  if (key === targetBaseFrameKey && targetBaseFrame) return;
  targetBaseFrameKey = key;

  const frame = targetFrame();
  let top = frame.topY;
  let bottom = frame.bottomY;
  live.forEach(weapon => {
    const points = genRecoilPts(weapon, 0, shotCount);
    const spreads = simulateSpread(weapon, shotCount);
    points.forEach((point, i) => {
      const spread = spreads[i] ?? spreadBounds(weapon)[0];
      top = Math.max(top, cmAtDistance(point.y + spread));
      bottom = Math.min(bottom, cmAtDistance(point.y - spread));
    });
  });
  const minSpan = frame.heightCm / TARGET_FRAME_FILL;
  const maxSpan = frame.heightCm / TARGET_FRAME_MIN_FILL;
  targetBaseFrame = {
    fitSpan: Math.min(maxSpan, Math.max(minSpan, (top - bottom) * 1.1)),
    wantedCenterY: (top + bottom) / 2,
  };
}

/**
 * Where to center the plot for a given field of view. A wide field drifts up
 * toward the pattern; a tight one pins to the figure so zooming in never
 * climbs off into empty sky above the soldier's head.
 */
function targetCenterY(ySpan) {
  const frame = targetFrame();
  const slack = Math.max(0, (ySpan - frame.heightCm) / 2);
  const wanted = targetBaseFrame?.wantedCenterY ?? frame.centerY;
  return Math.max(frame.centerY - slack, Math.min(frame.centerY + slack, wanted));
}

/** Vertical field, in target-plane centimetres, seen through an `m`x optic. */
function spanCmAtMagnification(m) {
  return 2 * cmAtDistance(ADS_1X_VFOV_DEG / m / 2);
}
/** Lowest magnification on the ladder that still fits the wanted span. */
function fitMagnification(spanCm) {
  for (let i = SCOPE_MAGNIFICATIONS.length - 1; i >= 0; i--) {
    if (spanCmAtMagnification(SCOPE_MAGNIFICATIONS[i]) >= spanCm) return SCOPE_MAGNIFICATIONS[i];
  }
  return SCOPE_MAGNIFICATIONS[0];
}
function currentMagnification() {
  if (state.recoil.magnification != null) return state.recoil.magnification;
  return fitMagnification(targetBaseFrame?.fitSpan ?? targetFrame().heightCm / TARGET_FRAME_FILL);
}
function recoilViewport() {
  if (state.recoil.view === 'target') {
    const { PW, PH } = plotBox();
    const ySpan = spanCmAtMagnification(currentMagnification());
    return {
      xSpan: ySpan * (PW / PH),
      ySpan,
      xCenter: state.recoil.distancePanX,
      yCenter: targetCenterY(ySpan) + state.recoil.distancePanY,
    };
  }
  // Recoil runs vertically, so the degree scale drives the vertical span and
  // the horizontal one follows the plot's shape. On a near-square plot this is
  // what it always was; in a wide popout it shows more sideways instead of
  // stretching the pattern.
  const { PW, PH } = plotBox();
  const ySpan = state.recoil.scaleH * 2;
  return {
    xSpan: ySpan * (PW / PH),
    ySpan,
    xCenter: state.recoil.panX,
    yCenter: state.recoil.scaleH - 1 + state.recoil.panY,
  };
}
function setMagnificationIndex(index) {
  const clamped = Math.max(0, Math.min(SCOPE_MAGNIFICATIONS.length - 1, Math.round(index)));
  state.recoil.magnification = SCOPE_MAGNIFICATIONS[clamped];
}
function adjustRecoilScale(dir) {
  if (state.recoil.view === 'target') {
    const index = SCOPE_MAGNIFICATIONS.indexOf(currentMagnification());
    setMagnificationIndex(index + (dir === 'in' ? 1 : -1));
  } else {
    state.recoil.scaleH = Math.max(RECOIL_SCALE_MIN, Math.min(RECOIL_SCALE_MAX,
      state.recoil.scaleH + (dir === 'in' ? -RECOIL_SCALE_STEP : RECOIL_SCALE_STEP)));
  }
  renderRecoil();
}
/** The one reset: framing back to the fit, aim back to center chest, and the
 *  original deterministic spray sample. */
function resetRecoilView() {
  state.recoil.refSeed = 0;
  if (state.recoil.view === 'target') {
    state.recoil.magnification = null;
    state.recoil.distancePanX = 0;
    state.recoil.distancePanY = 0;
    state.recoil.targetAim = 'chest';
    state.recoil.customAim = { x: 0, y: 0 };
    renderRecoil();
    return;
  }
  state.recoil.scaleH = 5; state.recoil.panX = 0; state.recoil.panY = 0;
  renderRecoil();
}
function panRecoilView(dir) {
  if (state.recoil.view === 'target') {
    const step = recoilViewport().xSpan * 0.12;
    if (dir === 'left')  state.recoil.distancePanX -= step;
    if (dir === 'right') state.recoil.distancePanX += step;
    if (dir === 'up')    state.recoil.distancePanY += step;
    if (dir === 'down')  state.recoil.distancePanY -= step;
    renderRecoil();
    return;
  }
  if (dir === 'left')  state.recoil.panX -= RECOIL_PAN_STEP;
  if (dir === 'right') state.recoil.panX += RECOIL_PAN_STEP;
  if (dir === 'up')    state.recoil.panY += RECOIL_PAN_STEP;
  if (dir === 'down')  state.recoil.panY -= RECOIL_PAN_STEP;
  renderRecoil();
}

function panRecoilByPixels(dx, dy, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const { xSpan, ySpan } = recoilViewport();
  const { PW, PH } = plotBox();
  const dxWorld = dx * (canvas.width / rect.width) / PW * xSpan;
  const dyWorld = dy * (canvas.height / rect.height) / PH * ySpan;
  if (state.recoil.view === 'target') {
    state.recoil.distancePanX -= dxWorld;
    state.recoil.distancePanY += dyWorld;
  } else {
    state.recoil.panX -= dxWorld;
    state.recoil.panY += dyWorld;
  }
  renderRecoil();
}

function zoomRecoilAtPointer(deltaY, clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const { PW, PH } = plotBox();
  const canvasX = (clientX - rect.left) * canvas.width / rect.width;
  const canvasY = (clientY - rect.top) * canvas.height / rect.height;
  const u = Math.max(0, Math.min(1, (canvasX - PLOT_PAD.l) / PW));
  const v = Math.max(0, Math.min(1, (canvasY - PLOT_PAD.t) / PH));
  const before = recoilViewport();
  const worldX = before.xCenter + (u - 0.5) * before.xSpan;
  const worldY = before.yCenter + (0.5 - v) * before.ySpan;

  if (state.recoil.view === 'target') {
    const index = SCOPE_MAGNIFICATIONS.indexOf(currentMagnification());
    setMagnificationIndex(index + (deltaY < 0 ? 1 : -1));
    const after = recoilViewport();
    state.recoil.distancePanX = worldX - (u - 0.5) * after.xSpan;
    state.recoil.distancePanY = worldY - (0.5 - v) * after.ySpan - (after.yCenter - state.recoil.distancePanY);
  } else {
    state.recoil.scaleH = Math.max(RECOIL_SCALE_MIN, Math.min(RECOIL_SCALE_MAX, state.recoil.scaleH * (deltaY < 0 ? 1 / 1.16 : 1.16)));
    const after = recoilViewport();
    state.recoil.panX = worldX - (u - 0.5) * after.xSpan;
    state.recoil.panY = worldY - (0.5 - v) * after.ySpan - (state.recoil.scaleH - 1);
  }
  renderRecoil();
}

function fmtAxisDeg(v) { return v.toFixed(1).replace('.0', ''); }
function fmtAxisMeters(cm) {
  const meters = cm / 100;
  const decimals = Math.abs(meters) < 1 ? 1 : 0;
  return `${meters.toFixed(decimals).replace(/\.0$/, '')}m`;
}
function niceDistanceGridStep(spanCm) {
  const raw = spanCm / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
function normalizeDegrees(deg) { return ((deg % 360) + 360) % 360; }
function signedOppositeDegrees(deg) {
  const n = normalizeDegrees(deg + 180);
  return n > 180 ? n - 360 : n;
}

function selectedEffectiveSpreadMax(w) {
  const [baseline, sMax] = spreadBounds(w);
  const sInc = selectedSpreadIncFor(w);
  if (sInc === 0) return baseline;
  const { firing, notFiring } = spreadRecoveries(w);
  const clamp = v => Math.min(Math.max(v, baseline), sMax);
  let s = baseline;
  for (let i = 0; i < SPREAD_EFFECTIVE_MAX_SHOTS; i++) {
    s = clamp(s + sInc);
    const shotIdx = i + 1;
    const T = shotIntervalAfter(w, shotIdx);
    if (isBurstGapAfter(w, shotIdx)) {
      const firingTime = Math.min(60 / (w.rpm ?? 600), T);
      const notFiringTime = Math.max(0, T - firingTime);
      s = applySpreadRecovery(s, firingTime, firing, baseline, sMax);
      s = applySpreadRecovery(s, notFiringTime, notFiring, baseline, sMax);
    } else {
      s = applySpreadRecovery(s, T, firing, baseline, sMax);
    }
  }
  return +s.toFixed(3);
}
function selectedRecoilDirectionFor(w) { return recoilGroup(w).dir ?? w.recoilDir ?? 0; }

/**
 * Match the backing store to the rendered size so the plot stays crisp as its
 * column grows, rather than upscaling a fixed 430px bitmap.
 */
function syncPlotCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const w = Math.max(240, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height || rect.width));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function drawRecoilFixed(canvas, weapon1, weapon2, layers, refSeed = 0) {
  syncPlotCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const PL = PLOT_PAD.l, PR = PLOT_PAD.r, PT = PLOT_PAD.t, PB = PLOT_PAD.b;
  const PW = CW - PL - PR, PH = CH - PT - PB;
  const N = selectedRecoilShotCount();
  const isTargetView = state.recoil.view === 'target';
  const view = recoilViewport();
  const xMin = view.xCenter - view.xSpan / 2, xMax = view.xCenter + view.xSpan / 2;
  const yMin = view.yCenter - view.ySpan / 2, yMax = view.yCenter + view.ySpan / 2;
  const mapX = value => PL + ((value - xMin) / (xMax - xMin)) * PW;
  const mapY = value => PT + PH - ((value - yMin) / (yMax - yMin)) * PH;
  // In target view the figure is pinned to world zero and the aim point is what
  // moves, so shot angles are projected relative to the aim offset.
  const aimOffset = isTargetView ? currentAimOffset() : { x: 0, y: 0 };
  const toX = angleDeg => mapX(isTargetView ? aimOffset.x + cmAtDistance(angleDeg) : angleDeg);
  const toY = angleDeg => mapY(isTargetView ? aimOffset.y + cmAtDistance(angleDeg) : angleDeg);

  ctx.fillStyle = '#080d0d'; ctx.fillRect(0, 0, CW, CH);

  const gridStep = isTargetView ? niceDistanceGridStep(xMax - xMin) : 1;
  const vMin1 = Math.ceil(yMin / gridStep) * gridStep, vMax1 = Math.floor(yMax / gridStep) * gridStep;
  const hMin1 = Math.ceil(xMin / gridStep) * gridStep, hMax1 = Math.floor(xMax / gridStep) * gridStep;
  ctx.strokeStyle = 'rgba(40,52,52,0.6)'; ctx.lineWidth = 0.4;
  for (let v = vMin1; v <= vMax1; v += gridStep) { const y = mapY(v); ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + PW, y); ctx.stroke(); }
  for (let h = hMin1; h <= hMax1; h += gridStep) { const x = mapX(h); ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + PH); ctx.stroke(); }

  // The angle plot's origin is the aim point, so full-length axes read well
  // there. In target view the grid is anchored to the body instead, and a
  // discrete crosshair marks where the shooter is aiming.
  if (!isTargetView) {
    ctx.strokeStyle = 'rgba(150,165,165,0.6)'; ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) { ctx.beginPath(); ctx.moveTo(mapX(0), PT); ctx.lineTo(mapX(0), PT + PH); ctx.stroke(); }
    if (yMin <= 0 && yMax >= 0) { ctx.beginPath(); ctx.moveTo(PL, mapY(0)); ctx.lineTo(PL + PW, mapY(0)); ctx.stroke(); }
  }

  const ox = mapX(aimOffset.x), oy = mapY(aimOffset.y);
  if (ox >= PL && ox <= PL + PW && oy >= PT && oy <= PT + PH) {
    ctx.strokeStyle = isTargetView ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isTargetView ? 1.1 : 0.8;
    const arm = isTargetView ? 8 : 6;
    ctx.beginPath(); ctx.moveTo(ox - arm, oy); ctx.lineTo(ox + arm, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - arm); ctx.lineTo(ox, oy + arm); ctx.stroke();
    if (isTargetView) {
      ctx.beginPath(); ctx.arc(ox, oy, 3.2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(100,120,120,0.75)'; ctx.font = '9px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = vMin1; v <= vMax1; v += gridStep) ctx.fillText(isTargetView ? fmtAxisMeters(v) : v + '°', PL - 3, mapY(v));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let h = hMin1; h <= hMax1; h += gridStep) ctx.fillText(isTargetView ? fmtAxisMeters(h) : h + '°', mapX(h), PT + PH + 3);

  ctx.save();
  ctx.beginPath(); ctx.rect(PL, PT, PW, PH); ctx.clip();

  const cols = ['#c9a227', '#4d94d0'];
  const drawOrder = [weapon1, weapon2].filter(Boolean);
  const spreadBubbleIdxs = getSpreadBulletIdxs(N);
  const targetHitTest = isTargetView ? drawTarget(ctx, mapX, mapY) : null;
  const pxPerCm = isTargetView ? PW / (xMax - xMin) : 0;
  const sprayDotRadius = isTargetView ? targetMarkerRadius(pxPerCm) : 2.5;
  const scatterDotRadius = isTargetView ? targetMarkerRadius(pxPerCm, 1.25) : 2;
  const targetHits = [];

  // Pass 0 — Scatter cloud
  if (layers.scatter) drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    const spreads = simulateSpread(w, N);
    for (let s = 1; s <= CLOUD_RUNS; s++) {
      const recoilPts = genRecoilPts(w, s * 0x9e3779b9, N);
      const rngB = mulberry32((whash(w.id) ^ (s * 0x6c62272e)) >>> 0);
      recoilPts.forEach((p, i) => {
        const spread = spreads[i] ?? spreadBounds(w)[0];
        const bAng = rngB() * Math.PI * 2, bR = spread * rngB();
        ctx.beginPath();
        ctx.arc(toX(p.x + bR * Math.cos(bAng)), toY(p.y + bR * Math.sin(bAng)), scatterDotRadius, 0, Math.PI * 2);
        ctx.fillStyle = col + '38'; ctx.fill();
      });
    }
  });

  // Pass 1 — Reference run with spread jitter + overlays
  drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    const weaponRefSeed = refSeed >>> 0;
    const pts = genRecoilPts(w, weaponRefSeed, N);
    const spreads = simulateSpread(w, N);

    const sprayPts = (() => {
      const rngRef = mulberry32((whash(w.id) ^ weaponRefSeed ^ 0xdeadbeef) >>> 0);
      return pts.map((p, i) => {
        const spread = spreads[i] ?? spreadBounds(w)[0];
        const bAng = rngRef() * Math.PI * 2, bR = spread * rngRef();
        return { x: p.x + bR * Math.cos(bAng), y: p.y + bR * Math.sin(bAng) };
      });
    })();
    let sprayZones = null;
    if (targetHitTest) {
      sprayZones = sprayPts.map(p => targetHitTest({
        xCm: aimOffset.x + cmAtDistance(p.x),
        yCm: aimOffset.y + cmAtDistance(p.y),
      }));
      targetHits.push({ weapon: w, zones: sprayZones, hits: sprayZones.filter(Boolean).length, total: sprayPts.length });
    }

    if (layers.spread) {
      spreadBubbleIdxs.forEach(idx => {
        const p = pts[idx]; if (!p) return;
        const spread = spreads[idx] ?? spreadBounds(w)[0];
        const x = toX(p.x), y = toY(p.y), r = Math.abs(toX(p.x + spread) - x);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = col + '1a'; ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1.2;
        ctx.fill(); ctx.stroke();
      });
    }

    if (layers.cone) {
      const coneCircles = pts.map((p, idx) => {
        const spread = spreads[idx] ?? spreadBounds(w)[0];
        const x = toX(p.x), y = toY(p.y), r = Math.abs(toX(p.x + spread) - x);
        return { x, y, r };
      }).filter(c => Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.r) && c.r > 0.5);
      if (coneCircles.length) {
        const TWO_PI = Math.PI * 2;
        const connected = [];
        coneCircles.forEach((circle, idx) => {
          if (idx > 0) {
            const prev = coneCircles[idx - 1];
            const dx = circle.x - prev.x, dy = circle.y - prev.y;
            const distance = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.ceil(distance / Math.max(2, Math.min(prev.r, circle.r) * 0.65)));
            for (let step = 1; step < steps; step++) {
              const t = step / steps, smoothT = t * t * (3 - 2 * t);
              connected.push({ x: prev.x + dx * t, y: prev.y + dy * t, r: prev.r + (circle.r - prev.r) * smoothT });
            }
          }
          connected.push(circle);
        });
        const normalizeAngle = a => ((a % TWO_PI) + TWO_PI) % TWO_PI;
        const addCoveredInterval = (intervals, start, end) => {
          start = normalizeAngle(start); end = normalizeAngle(end);
          if (end < start) intervals.push([start, TWO_PI], [0, end]);
          else intervals.push([start, end]);
        };
        const mergeIntervals = intervals => {
          if (!intervals.length) return [];
          intervals.sort((a, b) => a[0] - b[0]);
          const merged = [intervals[0].slice()];
          for (let i = 1; i < intervals.length; i++) {
            const cur = intervals[i], last = merged[merged.length - 1];
            if (cur[0] <= last[1] + 1e-4) last[1] = Math.max(last[1], cur[1]);
            else merged.push(cur.slice());
          }
          return merged;
        };
        const uncoveredIntervals = covered => {
          const merged = mergeIntervals(covered);
          if (!merged.length) return [[0, TWO_PI]];
          if (merged.length === 1 && merged[0][0] <= 0 && merged[0][1] >= TWO_PI) return [];
          const gaps = []; let cursor = 0;
          merged.forEach(interval => {
            if (interval[0] > cursor + 1e-4) gaps.push([cursor, interval[0]]);
            cursor = Math.max(cursor, interval[1]);
          });
          if (cursor < TWO_PI - 1e-4) gaps.push([cursor, TWO_PI]);
          return gaps;
        };
        ctx.save();
        ctx.beginPath();
        connected.forEach(c => { ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, TWO_PI); });
        ctx.fillStyle = col + '29'; ctx.fill();
        ctx.beginPath();
        connected.forEach((circle, ci) => {
          const covered = []; let fullyCovered = false;
          connected.forEach((other, oi) => {
            if (oi === ci) return;
            const dx = other.x - circle.x, dy = other.y - circle.y;
            const d = Math.hypot(dx, dy);
            if (d < 1e-6) { if (other.r >= circle.r) fullyCovered = true; return; }
            if (d >= circle.r + other.r) return;
            if (d <= other.r - circle.r) { fullyCovered = true; return; }
            if (d <= circle.r - other.r) return;
            const theta = Math.atan2(dy, dx);
            const alpha = Math.acos(Math.max(-1, Math.min(1, (d * d + circle.r * circle.r - other.r * other.r) / (2 * d * circle.r))));
            addCoveredInterval(covered, theta - alpha, theta + alpha);
          });
          if (fullyCovered) return;
          uncoveredIntervals(covered).forEach(([start, end]) => {
            ctx.moveTo(circle.x + Math.cos(start) * circle.r, circle.y + Math.sin(start) * circle.r);
            ctx.arc(circle.x, circle.y, circle.r, start, end);
          });
        });
        ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke(); ctx.restore();
      }
    }

    if (layers.path && pts.length > 1) {
      ctx.beginPath();
      pts.forEach((p, i) => { const x = toX(p.x), y = toY(p.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = col === '#c9a227' ? 'rgba(201,162,39,0.72)' : 'rgba(77,148,208,0.72)';
      ctx.lineWidth = 2.2; ctx.stroke();
    }

    if (layers.spray) sprayPts.forEach((p, i) => {
      const x = toX(p.x), y = toY(p.y);
      if (!sprayZones) {
        ctx.beginPath(); ctx.arc(x, y, sprayDotRadius, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        return;
      }
      // Colour stays purely weapon identity. Hits read as bigger solid dots
      // with a dark separator so they lift off the figure; misses fade back.
      if (!sprayZones[i]) {
        ctx.beginPath(); ctx.arc(x, y, sprayDotRadius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = col + '55'; ctx.fill();
        return;
      }
      const r = sprayDotRadius * 1.3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      if (r > 1.6) {
        ctx.strokeStyle = 'rgba(8,13,13,0.85)';
        ctx.lineWidth = Math.min(1.4, r * 0.32);
        ctx.stroke();
      }
    });
  });

  ctx.restore();
  return { xMin, xMax, yMin, yMax, spreadBubbleIdxs, isTargetView, targetHits };
}

function renderAttachmentStats(loadouts) {
  const el = document.getElementById('attStats');
  if (!el) return;
  const signed = (v, unit = '', dec = 0) => {
    const n = +v;
    return ((n > 0 ? '+' : '') + n.toFixed(dec)) + unit;
  };
  const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const adsSpreadRecovery = w => {
    const dyn = w.spreadDyn?.ads;
    return (dyn?.firingOffset ?? 1.84) * (1 + (w._adsSpreadDecayBoost ?? 0));
  };
  const hipSpreadRecovery = w => {
    const dyn = w.spreadDyn?.hip;
    return (dyn?.firingOffset ?? 3.31) * (1 + (w._hipSpreadDecayBoost ?? 0));
  };
  const adsRecoilDecay = w => w._adsRecoilDecayMult ?? 1;
  const metrics = [
    { lbl: 'ADS Time',            val: w => w._adsTimeMs ?? w.adsTime,      unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Time to aim down sights after magazine, barrel, and grip effects. Lower is faster.' },
    { lbl: 'ADS Move',            val: w => w._adsMoveSpeedMult,             unit: '×',   dec: 2, higherBetter: true, tooltip: 'Movement speed multiplier while aiming down sights after magazine, grip, and ammo effects. Higher is faster.' },
    { lbl: 'Sprint-to-Fire Speed', val: w => w._sprintRecoveryMs,            unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Sprint-to-fire recovery time after magazine and ergonomics effects. Lower is faster.' },
    { lbl: 'Weapon Draw Speed',   val: w => w.deployT != null ? w.deployT * 1000 : null, unit: 'ms', dec: 0, lowerBetter: true, tooltip: 'Time to equip/switch to the weapon in milliseconds. Lower is faster. Attachment effects are assumed placeholders until full attachment data is published.' },
    { lbl: 'Bullet Vel',          val: w => w.bulletVel,                     unit: 'm/s', dec: 0, higherBetter: true, tooltip: 'Projectile velocity after barrel effects. Higher reduces travel time and lead.' },
    { lbl: 'Mag Size',            val: w => w.mag,                           unit: '',    dec: 0, higherBetter: true, tooltip: 'Rounds in the selected magazine.' },
    { lbl: 'Tac Reload',          val: w => w.tacRld,                        unit: 's',   dec: 3, lowerBetter:  true, tooltip: 'Tactical reload time with selected magazine and Mag Catch when applicable. Lower is faster.' },
    { lbl: 'ADS Recoil/Shot',     val: w => w.recoilV,                       unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'ADS vertical recoil per shot after ADS recoil-tier attachment effects. Lower is easier to control.' },
    { lbl: 'ADS Recoil Variation', val: w => w.recoilVar,                    unit: '°',   dec: 1, lowerBetter:  true, tooltip: 'ADS recoil direction variation after ADS-only variation modifiers. Lower is more consistent.' },
    { lbl: 'ADS Recoil Recovery', val: adsRecoilDecay,                       unit: 'x',   dec: 2, higherBetter: true, tooltip: 'ADS recoil recovery/decay multiplier applied to the weapon recoil decay factor. Higher returns to center faster.' },
    { lbl: 'ADS Spread/Shot',     val: w => w.recoilIncAds,                  unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'ADS spread increase per shot after ADS-only spread modifiers. Lower builds spread more slowly.' },
    { lbl: 'ADS Spread Recovery', val: adsSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'Flat ADS spread recovery per second while firing after muzzle effects. Higher clears spread faster.' },
    { lbl: 'Hip Spread Recovery', val: hipSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'Flat hipfire spread recovery per second while firing after light effects. Higher clears spread faster.' },
    { lbl: 'Mov Spread',          val: w => w._movingAdsMinSpreadDeg,        unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Minimum ADS spread while moving after moving-ADS accuracy modifiers. Lower is more accurate.' },
    { lbl: 'Hipfire Spread',      val: w => w.spread?.hipStand?.[0],         unit: '°',   dec: 3, lowerBetter:  true, tooltip: 'Standing hipfire minimum spread after hipfire spread-tier modifiers. Lower is more accurate.' },
    { lbl: '3D Spot',             val: w => w._worldSpot,                    unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Distance at which firing exposes your 3D world position. None or shorter is better.' },
    { lbl: 'Minimap Spot',        val: w => w._minimapSpot,                  unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Distance at which firing exposes you on the minimap. None or shorter is better.' },
    { lbl: 'HS Mult',             val: w => w._hsMult,                       unit: '×',   dec: 2, higherBetter: true, tooltip: 'Headshot damage multiplier after ammo effects. Higher increases headshot damage.' },
    { lbl: 'Collateral Mult',    val: w => w._collateralMult,               unit: '×',   dec: 2, higherBetter: true, tooltip: 'Damage multiplier applied to bullets that pass through a target or surface. Varies by ammo type and weapon class.' },
  ];
  let html = '<div class="ptitle" style="margin-bottom:9px">Attachment Effects</div>';
  let rendered = false;
  loadouts.filter(x => x.weapon).forEach(({ weapon, atts, colClass }) => {
    const base = defaultAppliedWeapon(weapon);
    const cur = applyAttachments(weapon, atts);
    const chips = [];
    metrics.forEach(m => {
      const baseVal = m.val(base), curVal = m.val(cur);
      if (baseVal == null || curVal == null) return;
      const delta = +(curVal - baseVal).toFixed(Math.max(m.dec, 3));
      if (Math.abs(delta) < 0.0005) return;
      const better = (m.higherBetter && delta > 0) || (m.lowerBetter && delta < 0);
      const color = better ? 'var(--green)' : 'var(--red)';
      const tip = escAttr(m.tooltip ?? m.lbl);
      chips.push(`<div class="att-chip" title="${tip}" aria-label="${tip}"><div class="att-chip-lbl">${m.lbl}</div><div class="att-chip-val" style="color:${color}">${signed(delta, m.unit, m.dec)}</div></div>`);
    });
    const swayVal = cur._weaponSway ?? 0;
    if (swayVal !== 0) {
      const decreased = swayVal < 0;
      const tip = escAttr('Weapon sway from selected attachments. Decreased is better; increased is worse.');
      chips.push(`<div class="att-chip" title="${tip}" aria-label="${tip}"><div class="att-chip-lbl">Weapon Sway</div><div class="att-chip-val" style="color:${decreased ? 'var(--green)' : 'var(--red)'}">${decreased ? 'Decreased' : 'Increased'}</div></div>`);
    }
    const vrVal = cur._visualRecoil ?? 0;
    if (vrVal !== 0) {
      const reduced = vrVal < 0;
      const tip = escAttr('Visual recoil from selected attachments. Reduced is better; increased is worse.');
      chips.push(`<div class="att-chip" title="${tip}" aria-label="${tip}"><div class="att-chip-lbl">Visual Recoil</div><div class="att-chip-val" style="color:${reduced ? 'var(--green)' : 'var(--red)'}">${reduced ? 'Decreased' : 'Increased'}</div></div>`);
    }
    if (cur._laserVisible != null) {
      const visible = cur._laserVisible;
      const tip = escAttr('Whether the selected laser is visible to enemies.');
      chips.push(`<div class="att-chip" title="${tip}" aria-label="${tip}"><div class="att-chip-lbl">Laser Visibility</div><div class="att-chip-val" style="color:${visible ? 'var(--red)' : 'var(--green)'}">${visible ? 'Visible' : 'Not Visible'}</div></div>`);
    }
    if (!chips.length) return;
    rendered = true;
    html += `<div class="att-block"><div class="att-name ${colClass}">${weapon.name}</div><div class="att-grid">${chips.join('')}</div></div>`;
  });
  if (!rendered) html += '<div class="att-empty">No attachment stat changes</div>';
  el.innerHTML = html;
}

function targetImpactStatsHtml(entries) {
  const colors = ['c1', 'c2'];
  const fmtDamage = value => value == null ? '—' : value.toFixed(1);
  const fmtMult = value => value == null ? '' : `<span class="target-zone-mult">${value.toFixed(2)}×</span>`;
  // 100 health is a kill; 75 leaves the target one body shot from dying.
  const damageClass = value => value == null ? '' : value >= 100 ? ' class="dmg-kill"' : value >= 75 ? ' class="dmg-crit"' : '';
  const aimLabel = state.recoil.targetAim === 'custom' ? 'custom aim' : `${state.recoil.targetAim} aim`;
  let html = `<div class="rc-stats-head"><div class="ptitle">Target Impact Stats</div><div class="rc-stats-context">${state.recoil.distance} m · ${aimLabel}</div></div>`;

  entries.forEach((entry, index) => {
    const summary = summarizeTargetImpacts(entry.weapon, state.recoil.distance, entry.zones);
    const kill = summary.lethalShot == null
      ? '<strong>None</strong>'
      : `<strong title="Took ${summary.lethalHit} hits out of the first ${summary.lethalShot} shots fired">${summary.lethalHit} / ${summary.lethalShot}</strong>`;
    // Only the running total decides a kill, so per-zone damage stays neutral.
    const rows = summary.zones.map(zone => `
      <tr${zone.hits ? '' : ' class="no-hits"'}>
        <th scope="row">${zone.label} ${fmtMult(zone.multiplier)}</th>
        <td>${zone.hits}</td>
        <td>${fmtDamage(zone.damagePerHit)}</td>
        <td>${fmtDamage(zone.damage)}</td>
      </tr>`).join('');
    html += `
      <section class="target-impact-card">
        <div class="target-impact-weapon ${colors[index] ?? ''}">${wLabel(entry.weapon)}</div>
        <div class="target-impact-summary">
          <div><span>Acc</span><strong title="${summary.hits} of ${summary.totalShots} shots hit">${(summary.accuracy * 100).toFixed(0)}%</strong></div>
          <div><span>Miss</span><strong>${summary.misses}</strong></div>
          <div><span>Damage</span><strong${damageClass(summary.totalDamage)} title="100+ is lethal, 75+ leaves one body shot to kill">${fmtDamage(summary.totalDamage)}</strong></div>
          <div><span>Lethal</span>${kill}</div>
        </div>
        <table class="target-zone-table">
          <thead><tr><th>Body Part</th><th>Hits</th><th>Dmg / Hit</th><th>Damage</th></tr></thead>

          <tbody>${rows}</tbody>
        </table>
      </section>`;
  });
  html += '<div class="target-impact-note">Multipliers include the weapon\'s hit-zone class and ammo effects. Damage uses the selected weapon, ammo, attachments, and range. Lethal shot assumes 100 health and follows the plotted hit order; total damage is the uncapped sum of every plotted hit.</div>';
  return html;
}

function renderRecoil() {
  scheduleUrlSync();
  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;
  const shotCount = selectedRecoilShotCount();
  // The base frame feeds the auto magnification, so it has to settle before
  // any of the control read-outs are written.
  if (state.recoil.view === 'target') computeTargetBaseFrame([w1, w2], shotCount);

  renderAttachmentStats([
    { weapon: state.slots[0].weapon, atts: state.slots[0].atts, colClass: 'c1' },
    { weapon: state.comparing ? state.slots[1].weapon : null, atts: state.slots[1].atts, colClass: 'c2' },
  ]);

  const { aim, stance, layers, refSeed } = state.recoil;
  document.getElementById('rcModeScatter')?.classList.toggle('on', layers.scatter);
  document.getElementById('rcModeSpread')?.classList.toggle('on', layers.spray);
  document.getElementById('rcModePath')?.classList.toggle('on', layers.path);
  document.getElementById('rcSpreadToggleBtn')?.classList.toggle('on', layers.spread);
  document.getElementById('rcConeToggleBtn')?.classList.toggle('on', layers.cone);
  document.getElementById('rcAimAds')?.classList.toggle('on', aim === 'ads');
  document.getElementById('rcAimHip')?.classList.toggle('on', aim === 'hip');
  document.getElementById('rcStanceStand')?.classList.toggle('on', stance === 'stand');
  document.getElementById('rcStanceMove')?.classList.toggle('on', stance === 'move');
  const isTarget = state.recoil.view === 'target';
  ['rcViewAngle', 'rcViewTarget'].forEach(id => {
    const tab = document.getElementById(id);
    if (!tab) return;
    const on = (id === 'rcViewTarget') === isTarget;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', String(on));
  });
  const distanceField = document.getElementById('rcDistanceField');
  if (distanceField) distanceField.hidden = !isTarget;
  if (!isTarget) document.getElementById('rcMain')?.classList.remove('aiming');
  const hint = document.getElementById('rcHint');
  if (hint) {
    hint.textContent = isTarget
      ? 'Ctrl + click to aim and fire · Shift + drag to pan · Shift + scroll to zoom'
      : 'Shift + drag to pan · Shift + scroll to zoom';
  }
  const aimReadout = document.getElementById('rcAimReadout');
  if (aimReadout) aimReadout.hidden = !isTarget;
  const aimText = document.getElementById('rcAimText');
  if (aimText) {
    const offset = currentAimOffset();
    aimText.textContent = state.recoil.targetAim === 'chest'
      ? 'Aim: center chest'
      : `Aim: ${(offset.x / 100).toFixed(2)} m, ${(offset.y / 100).toFixed(2)} m`;
  }
  const distanceRange = document.getElementById('rcDistanceRange');
  const distanceInput = document.getElementById('rcDistanceInput');
  if (distanceRange) { distanceRange.value = Math.max(5, state.recoil.distance); paintRange(distanceRange); }
  if (distanceInput && document.activeElement !== distanceInput) distanceInput.value = state.recoil.distance;
  const zoomRange = document.getElementById('rcZoomRange');
  if (zoomRange) {
    const bounds = zoomSliderBounds();
    zoomRange.min = bounds.min; zoomRange.max = bounds.max; zoomRange.step = bounds.step;
    zoomRange.value = bounds.value;
    paintRange(zoomRange);
  }
  const zoomReadout = document.getElementById('rcZoomReadout');
  if (zoomReadout) {
    const magnification = isTarget ? currentMagnification() : null;
    zoomReadout.textContent = isTarget ? `${magnification.toFixed(2)}×` : `±${fmtAxisDeg(state.recoil.scaleH)}°`;
    zoomReadout.title = isTarget
      ? `Optic magnification. The plot shows the same field a ${magnification.toFixed(2)}× sight would at this range.`
      : 'Horizontal half-span of the plot, in degrees.';
  }
  document.getElementById('rcPlatformPc')?.classList.toggle('on', state.recoil.platform === 'pc');
  document.getElementById('rcPlatformConsole')?.classList.toggle('on', state.recoil.platform === 'console');
  syncCompensationControls();

  const spreadPreset = document.getElementById('rcSpreadPreset');
  const shotsInput = document.getElementById('rcSpreadShotsInput');
  if (spreadPreset) {
    spreadPreset.value = state.recoil.spreadPreset;
    // Stays live while Bubbles is off — picking a preset is the natural way to
    // turn them on — so it only dims rather than greying out of sight.
    spreadPreset.classList.toggle('idle', !layers.spread);
    // Show the chosen shots on the option itself, so the list stays readable
    // once the editor has closed.
    const customOpt = spreadPreset.querySelector('option[value="custom"]');
    if (customOpt) {
      const list = (shotsInput?.value ?? '').trim();
      customOpt.textContent = state.recoil.spreadPreset === 'custom' && list ? `Custom: ${list}` : 'Custom…';
    }
  }
  // The freeform list is a popover, open only while being edited, so revealing
  // it never moves the buttons beside it.
  if (shotsInput) {
    shotsInput.hidden = !(state.recoil.spreadPreset === 'custom' && state.recoil.spreadEditing);
    shotsInput.classList.toggle('idle', !layers.spread);
  }
  document.getElementById('rcShotsLabel')?.classList.toggle('rc-shots-label--disabled', !layers.spread);

  const axis = drawRecoilFixed(document.getElementById('rcMain'), w1, w2, layers, refSeed);
  const noteEl = document.querySelector('.rc-note');
  const stateLabel = `${aim.toUpperCase()} / ${stance === 'move' ? 'MOV' : 'STD'}`;
  if (noteEl && axis) {
    const activeLayers = [
      layers.scatter ? 'scatter' : null,
      layers.spray   ? 'spray pattern' : null,
      layers.path    ? 'recoil path' : null,
      layers.spread   ? 'spread bubbles' : null,
      layers.cone    ? 'cone' : null,
    ].filter(Boolean).join(' + ');
    const pathNote  = layers.path  ? ' Recoil Path = recoil-only reference line.' : '';
    const spreadNote = layers.spread ? ` Bubbles = potential spread on shots ${(axis.spreadBubbleIdxs ?? []).map(i => i + 1).join(', ')}.` : '';
    const coneNote  = layers.cone  ? ' Cone = spread envelope across all shots.' : '';
    const layerNote = `Showing ${activeLayers} (${stateLabel}). Scatter = ${CLOUD_RUNS} faded simulated sprays. Spray Pattern = solid reference dots.${pathNote}${spreadNote}${coneNote}`;
    if (axis.isTargetView) {
      const hitSummary = axis.targetHits.map(({ weapon, hits, total }) => `${wLabel(weapon)} ${hits}/${total}`).join(' · ');
      const ringNote = layers.spray ? ' Solid dots hit the target; faded dots miss. Colour is the weapon, and the per-zone breakdown is in the stats table.' : '';
      noteEl.textContent = `${layerNote}${ringNote} Same simulation, projected onto a 180 cm soldier at ${state.recoil.distance} m — the pattern covers more of the target the further out it lands.${hitSummary ? ` Reference hits: ${hitSummary}.` : ''} Zoom matches optic magnification against an assumed ${ADS_1X_VFOV_DEG}° vertical field at 1×; grid marks ${fmtAxisMeters(niceDistanceGridStep(axis.xMax - axis.xMin))}.`;
    } else {
      noteEl.textContent = `${layerNote} View: ${fmtAxisDeg(axis.xMin)}°–${fmtAxisDeg(axis.xMax)}° H / ${fmtAxisDeg(axis.yMin)}°–${fmtAxisDeg(axis.yMax)}° V.`;
    }
  }

  const leg = document.getElementById('rcLegend');
  leg.innerHTML = '';
  [[w1, '#c9a227'], [w2, '#4d94d0']].filter(([w]) => w).forEach(([w, col]) => {
    leg.innerHTML += `<div class="rc-legend-item"><div class="rc-legend-dot" style="background:${col}"></div><span>${wLabel(w)}</span></div>`;
  });

  // The pop-out has room for both tables, so it stacks recoil/spread over the
  // impact breakdown instead of swapping one for the other.
  const stacksStats = document.body.classList.contains('is-popout');
  const targetHtml = axis?.isTargetView ? targetImpactStatsHtml(axis.targetHits) : '';
  if (targetHtml && !stacksStats) {
    document.getElementById('rcStats').innerHTML = targetHtml;
    return;
  }

  // Recoil / Spread stats panel
  const compPct = selectedCompensationLevel() / 100;
  const stats = [
    (() => {
      const ttHtml = (selW, w, atts, colCls) => {
        if (!selW || !w) return '';
        const dir = -selectedRecoilDirectionFor(w);
        const dirStr = (dir >= 0 ? '+' : '') + dir.toFixed(1) + '°';
        const dirLines = [];
        if (compPct > 0) {
          const compDir = signedOppositeDegrees(-selectedRecoilDirectionFor(w));
          dirLines.push(`<div class="rc-tt-row"><span>Compensation Direction (${Math.round(compPct * 100)}%)</span><span>${(compDir >= 0 ? '+' : '') + compDir.toFixed(1)}°</span></div>`);
        }
        const varLines = [];
        if (aim === 'ads') {
          const muz = ATT_BY_ID.MUZZLES[atts.muzzle] ?? MUZZLES[0];
          const grp = ATT_BY_ID.GRIPS[atts.grip] ?? GRIPS[0];
          const ergo = ATT_BY_ID.ERGOS[atts.ergo ?? 'none'] ?? ERGOS[0];
          // Tier ladder: dirVar × dirVarMult ^ (dirVarExp + attachment tier mods)
          const adsG = selW.recoil?.ads;
          const varRaw  = adsG?.dirVar ?? selW.recoilVar ?? 0;
          const varMult = adsG?.dirVarMult ?? 1;
          let varTiers  = adsG?.dirVarExp ?? 0;
          const baseVar = +(varRaw * Math.pow(varMult, varTiers)).toFixed(2);
          varLines.push(`<div class="rc-tt-row"><span>Base Weapon Variation</span><span>${baseVar.toFixed(2)}°</span></div>`);
          let prev = baseVar;
          const varStep = (lbl, tierMod) => {
            if (!tierMod) return;
            varTiers += tierMod;
            const after = +(varRaw * Math.pow(varMult, varTiers)).toFixed(2), d = +(after - prev).toFixed(2);
            if (Math.abs(d) >= 0.005) varLines.push(`<div class="rc-tt-row"><span>${lbl}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`);
            prev = after;
          };
          varStep(muz.name, muz.adsRecoilVariationTierMod ?? 0);
          varStep(grp.name, grp.adsRecoilVariationTierMod ?? 0);
          varStep(ergo.name, ergo.adsRecoilVariationTierMod ?? 0);
        }
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${selW.name}</div>` : '';
        const effVar = selectedRecoilVariationFor(w);
        return wn
          + `<div class="rc-tt-row rc-tt-eff"><span>Recoil Direction</span><span>${dirStr}</span></div>` + dirLines.join('')
          + `<div class="rc-tt-row rc-tt-eff" style="margin-top:6px"><span>Recoil Variation (±)</span><span>${effVar.toFixed(2)}°</span></div>` + varLines.join('');
      };
      const tt1 = ttHtml(state.slots[0].weapon, w1, state.slots[0].atts, 'c1');
      const tt2 = state.comparing ? ttHtml(state.slots[1].weapon, w2, state.slots[1].atts, 'c2') : '';
      return {
        lbl: 'Recoil Direction ± Variation',
        val1: w1 ? (((-selectedRecoilDirectionFor(w1)) >= 0 ? '+' : '') + (-selectedRecoilDirectionFor(w1))) + '° ± ' + selectedRecoilVariationFor(w1).toFixed(1) + '°' : null,
        val2: w2 ? (((-selectedRecoilDirectionFor(w2)) >= 0 ? '+' : '') + (-selectedRecoilDirectionFor(w2))) + '° ± ' + selectedRecoilVariationFor(w2).toFixed(1) + '°' : null,
        centeredRange: true,
        barStart1: w1 ? (-selectedRecoilDirectionFor(w1) - selectedRecoilVariationFor(w1)) / 180 : 0,
        bar1:      w1 ? (-selectedRecoilDirectionFor(w1) + selectedRecoilVariationFor(w1)) / 180 : 0,
        barStart2: w2 ? (-selectedRecoilDirectionFor(w2) - selectedRecoilVariationFor(w2)) / 180 : 0,
        bar2:      w2 ? (-selectedRecoilDirectionFor(w2) + selectedRecoilVariationFor(w2)) / 180 : 0,
        tick1: w1 ? -selectedRecoilDirectionFor(w1) / 180 : null,
        tick2: w2 ? -selectedRecoilDirectionFor(w2) / 180 : null,
        tooltip: (tt1 || tt2) ? `<div class="rc-tt">${tt1}${tt2 && tt1 ? '<div style="border-top:1px solid var(--border);margin:8px 0 6px"></div>' : ''}${tt2}</div>` : '',
        col1: '#c9a227', col2: '#4d94d0',
      };
    })(),
    (() => {
      const baseW1 = state.slots[0].weapon ? defaultAppliedWeapon(state.slots[0].weapon) : null;
      const baseW2 = state.comparing && state.slots[1].weapon ? defaultAppliedWeapon(state.slots[1].weapon) : null;
      const eff = w => w ? +(selectedRecoilAmountFor(w) * (1 - compPct)).toFixed(3) : null;
      const ld = w => { if (!w) return null; const wa = selectedRecoilAmountFor(w); return { eff: wa * (1 - compPct), wa }; };
      const ttHtml = (selW, atts, colCls) => {
        if (!selW || !atts) return '';
        const mk = o => ({ ...defaultAttsForWeapon(selW), ...o });
        const ra = w => selectedRecoilAmountBeforePlatformFor(w);
        const muz = ATT_BY_ID.MUZZLES[atts.muzzle] ?? MUZZLES[0];
        const grp = ATT_BY_ID.GRIPS[atts.grip] ?? GRIPS[0];
        const ammoObj = ATT_BY_ID.AMMO[atts.ammo ?? 'standard'] ?? AMMO[0];
        const ergoObj = ATT_BY_ID.ERGOS[atts.ergo ?? 'none'] ?? ERGOS[0];
        const baseRecoil = ra(applyAttachments(selW, mk({})));
        let prev = baseRecoil, lines = [];
        const try_ = (lbl, newAtts) => {
          const r = ra(applyAttachments(selW, mk(newAtts)));
          const d = +(r - prev).toFixed(2);
          if (Math.abs(d) >= 0.005) { lines.push(`<div class="rc-tt-row"><span>${lbl}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`); prev = r; }
        };
        if (muz.id !== 'none') try_(muz.name, { muzzle: muz.id });
        if (grp.id !== 'none') try_(grp.name, { muzzle: muz.id, grip: grp.id });
        const defaultAmmo = WEAPON_AMMO[selW.id]?.def ?? 'standard';
        if ((atts.ammo ?? 'standard') !== defaultAmmo || (ammoObj.adsRecoilTierMod ?? 0) !== 0)
          try_(ammoObj.name, { muzzle: muz.id, grip: grp.id, ammo: ammoObj.id });
        if (ergoObj.id !== 'none' || (ergoObj.adsRecoilTierMod ?? 0) !== 0)
          try_(ergoObj.name, { muzzle: muz.id, grip: grp.id, ammo: ammoObj.id, ergo: ergoObj.id });
        if (state.recoil.platform === 'console') {
          const after = +(prev * CONSOLE_RECOIL_MULT).toFixed(2), d = +(after - prev).toFixed(2);
          lines.push(`<div class="rc-tt-row"><span>Console Recoil Reduction</span><span class="rc-tt-neg">−${Math.abs(d).toFixed(2)}°</span></div>`);
          prev = after;
        }
        const comp = +(prev * compPct).toFixed(2), effVal = +(prev - comp).toFixed(2);
        if (comp >= 0.005) lines.push(`<div class="rc-tt-row"><span>Recoil Compensation (${Math.round(compPct * 100)}%)</span><span class="rc-tt-neg">−${comp.toFixed(2)}°</span></div>`);
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${selW.name}</div>` : '';
        const effLbl = aim === 'hip' ? 'Effective Hipfire Recoil' : 'Effective ADS Recoil';
        return wn + `<div class="rc-tt-row rc-tt-eff"><span>${effLbl}</span><span>${effVal.toFixed(2)}°</span></div><div class="rc-tt-row"><span>Base Weapon Recoil</span><span>${baseRecoil.toFixed(2)}°</span></div>` + lines.join('');
      };
      const tt1 = ttHtml(state.slots[0].weapon, state.slots[0].atts, 'c1');
      const tt2 = state.comparing ? ttHtml(state.slots[1].weapon, state.slots[1].atts, 'c2') : '';
      const eff1 = eff(w1), eff2 = eff(w2);
      return {
        lbl: 'Recoil / Shot', layered: true,
        val1: eff1 != null ? eff1.toFixed(2) + '°' : null,
        val2: eff2 != null ? eff2.toFixed(2) + '°' : null,
        bar1: eff1 != null ? eff1 / RECOIL_BAR_SCALE : 0,
        bar2: eff2 != null ? eff2 / RECOIL_BAR_SCALE : 0,
        layeredData1: ld(w1), layeredData2: ld(w2),
        tooltip: (tt1 || tt2) ? `<div class="rc-tt">${tt1}${tt2 && tt1 ? '<div style="border-top:1px solid var(--border);margin:8px 0 6px"></div>' : ''}${tt2}</div>` : '',
        col1: '#c9a227', col2: '#4d94d0',
      };
    })(),
    (() => {
      const aimLbl = aim === 'hip' ? 'Hipfire' : 'ADS';
      const eff1 = w1 ? selectedSpreadIncFor(w1) : null, eff2 = w2 ? selectedSpreadIncFor(w2) : null;
      const base1 = w1 ? (aim === 'ads' ? (state.slots[0].weapon?.recoilIncAds ?? 0) : selectedSpreadIncFor(w1)) : null;
      const base2 = w2 ? (aim === 'ads' ? (state.slots[1].weapon?.recoilIncAds ?? 0) : selectedSpreadIncFor(w2)) : null;
      const ld = (eff, base) => eff != null && base != null ? { eff, wa: base, scale: 1 } : null;
      const ttHtml = (selW, w, atts, base, eff, colCls) => {
        if (!selW || !w) return '';
        const bar = ATT_BY_ID.BARRELS[atts.barrel] ?? BARRELS[0];
        const lines = [];
        if (aim === 'ads' && bar.id !== 'none') {
          const d = +(eff - base).toFixed(3);
          if (Math.abs(d) >= 0.005) lines.push(`<div class="rc-tt-row"><span>${bar.name}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`);
        }
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${selW.name}</div>` : '';
        return wn + `<div class="rc-tt-row rc-tt-eff"><span>Effective ${aimLbl} SIPS</span><span>${eff.toFixed(2)}°</span></div><div class="rc-tt-row"><span>Base ${aimLbl} SIPS</span><span>${base.toFixed(2)}°</span></div>` + lines.join('');
      };
      const tt1 = base1 != null ? ttHtml(state.slots[0].weapon, w1, state.slots[0].atts, base1, eff1, 'c1') : '';
      const tt2 = base2 != null && state.comparing ? ttHtml(state.slots[1].weapon, w2, state.slots[1].atts, base2, eff2, 'c2') : '';
      return {
        lbl: 'Spread Inc / Shot', layered: true,
        val1: eff1 != null ? eff1.toFixed(2) + '°' : null,
        val2: eff2 != null ? eff2.toFixed(2) + '°' : null,
        bar1: eff1 ?? 0, bar2: eff2 ?? 0,
        layeredData1: ld(eff1, base1), layeredData2: ld(eff2, base2),
        tooltip: (tt1 || tt2) ? `<div class="rc-tt">${tt1}${tt2 && tt1 ? '<div style="border-top:1px solid var(--border);margin:8px 0 6px"></div>' : ''}${tt2}</div>` : '',
        col1: '#c9a227', col2: '#4d94d0',
      };
    })(),
    (() => {
      const e1 = w1 ? selectedEffectiveSpreadMax(w1) : null;
      const e2 = w2 ? selectedEffectiveSpreadMax(w2) : null;
      const b1 = w1 ? spreadBounds(w1) : null, b2 = w2 ? spreadBounds(w2) : null;
      const mn1 = b1 ? b1[0] : null, mn2 = b2 ? b2[0] : null;
      const fmtR = (mn, mx) => mn != null && mx != null ? `${mn.toFixed(2)}° → ${mx.toFixed(2)}°` : null;
      const SAMPLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const sim1 = w1 ? simulateSpread(w1, 15) : null;
      const sim2 = w2 && state.comparing ? simulateSpread(w2, 15) : null;
      let tt = '';
      if (sim1 || sim2) {
        const aimLbl = aim === 'hip' ? 'Hipfire' : 'ADS';
        const stanceLbl = stance === 'move' ? 'Moving' : 'Standing';
        const spreadHdr = `Effective Spread (${aimLbl} | ${stanceLbl})`;
        const thW1 = state.slots[0].weapon ? `<th style="color:var(--accent)">${state.slots[0].weapon.name}</th>` : '';
        const thW2 = sim2 && state.slots[1].weapon ? `<th style="color:var(--accent2)">${state.slots[1].weapon.name}</th>` : '';
        const rows = SAMPLE.map(n => {
          const i = n - 1;
          const c1 = sim1 && i < sim1.length ? `<td>${sim1[i].toFixed(2)}°</td>` : '';
          const c2 = sim2 && i < sim2.length ? `<td>${sim2[i].toFixed(2)}°</td>` : '';
          return `<tr><td>${n}</td>${c1}${c2}</tr>`;
        }).join('');
        tt = `<div class="rc-tt" style="min-width:0"><div style="font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text);margin-bottom:5px">${spreadHdr}</div><table class="rc-tt-tbl"><thead><tr><th>Shot</th>${thW1}${thW2}</tr></thead><tbody>${rows}</tbody></table></div>`;
      }
      return {
        lbl: 'Spread Min → Eff. Max',
        val1: fmtR(mn1, e1), val2: fmtR(mn2, e2),
        barStart1: mn1 != null ? mn1 / SPREAD_BAR_SCALE : null, bar1: e1 != null ? e1 / SPREAD_BAR_SCALE : 0,
        barStart2: mn2 != null ? mn2 / SPREAD_BAR_SCALE : null, bar2: e2 != null ? e2 / SPREAD_BAR_SCALE : 0,
        tooltip: tt, col1: '#c9a227', col2: '#4d94d0',
      };
    })(),
  ];

  let html = `<div class="rc-stats-head" style="margin-bottom:9px"><div class="ptitle">Recoil / Spread Stats</div><div class="rc-stats-context">${aim === 'hip' ? 'Hipfire' : 'ADS'} · ${stance === 'move' ? 'Moving' : 'Standing'}</div></div>`;
  stats.forEach(s => {
    if (s.val1 === null && s.val2 === null) return;
    html += `<div class="rc-row"><div class="rc-lbl"><span>${s.lbl}</span><span>${[s.val1, s.val2].filter(Boolean).join(' / ')}</span></div>`;
    const renderBar = (start, end, col, tick = null, ghost = null) => {
      if (s.centeredRange) {
        const a = Math.max(-1, Math.min(1, start ?? 0)), b = Math.max(-1, Math.min(1, end ?? 0));
        const left = (Math.min(a, b) + 1) * 50, width = Math.abs(b - a) * 50;
        const bandFill = `<div style="position:absolute;top:0;bottom:0;left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${col};border-radius:3px"></div>`;
        const tickHtml = tick != null ? `<div style="position:absolute;top:0;bottom:0;left:${((tick + 1) * 50).toFixed(1)}%;width:2px;background:rgba(255,255,255,0.65);transform:translateX(-50%);z-index:1"></div>` : '';
        return `<div class="rc-bar centered">${bandFill}${tickHtml}</div>`;
      }
      if (s.centered) {
        const value = Math.max(-1, Math.min(1, end ?? 0));
        const left = value < 0 ? (50 + value * 50) : 50, width = Math.abs(value) * 50;
        return `<div class="rc-bar centered"><div class="rc-fill" style="margin-left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${col}"></div></div>`;
      }
      if (start != null) {
        const sl = (start * 100).toFixed(1), sw = (Math.max(end - start, 0) * 100).toFixed(1);
        return `<div class="rc-bar"><div class="rc-fill" style="margin-left:${sl}%;width:${sw}%;background:${col}"></div></div>`;
      }
      if (s.layered && ghost) {
        const { eff, wa } = ghost, sc = ghost.scale ?? RECOIL_BAR_SCALE;
        const gW = Math.min(wa / sc * 100, 100).toFixed(1), sW = Math.min(eff / sc * 100, 100).toFixed(1);
        return `<div class="rc-bar" style="position:relative"><div style="position:absolute;top:0;left:0;height:100%;width:${gW}%;background:${col};opacity:0.28;border-radius:3px"></div><div style="position:absolute;top:0;left:0;height:100%;width:${sW}%;background:${col};border-radius:3px"></div></div>`;
      }
      return `<div class="rc-bar"><div class="rc-fill" style="width:${Math.min(end * 100, 100).toFixed(1)}%;background:${col}"></div></div>`;
    };
    if (s.val1 != null) html += renderBar(s.barStart1, s.bar1, s.col1, s.tick1 ?? null, s.layeredData1 ?? null);
    if (s.val2 != null) html += renderBar(s.barStart2, s.bar2, s.col2, s.tick2 ?? null, s.layeredData2 ?? null);
    if (s.tooltip) html += s.tooltip;
    html += '</div>';
  });
  document.getElementById('rcStats').innerHTML = targetHtml
    ? `${html}<div class="rc-stats-split"></div>${targetHtml}`
    : html;
}

// ── LOADOUT OVERLAY ───────────────────────────────────────────────────────────

function setLoadoutOverlay(open) {
  document.body.classList.toggle('loadout-open', !!open);
  document.getElementById('loadoutOpenBtn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// ── MOBILE TOOLTIPS ─────────────────────────────────────────────────────────────
// On touch devices (no hover), tapping an info card / chip shows its `title` text in
// a floating bubble, and tapping a recoil-stat row pins its rich breakdown popup.
// Desktop hover behavior is untouched (gated on `hover: none`).

function initMobileTooltips() {
  const tip = document.createElement('div');
  tip.className = 'm-tip';
  document.body.appendChild(tip);
  let openRow = null;

  const hideBubble = () => tip.classList.remove('show');
  const closeRow = () => { if (openRow) { openRow.classList.remove('tt-open'); openRow = null; } };

  const positionBubble = el => {
    const r = el.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.bottom + 6;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 6);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };

  document.addEventListener('click', e => {
    if (!matchMedia('(hover: none)').matches) return;

    const row = e.target.closest('.rc-row');
    if (row && row.querySelector('.rc-tt')) {
      hideBubble();
      if (openRow === row) { closeRow(); }
      else { closeRow(); row.classList.add('tt-open'); openRow = row; }
      return;
    }

    const info = e.target.closest('.scard[title], .att-chip[title], .wbadge[title], .wbadge-burst[title]');
    if (info) {
      closeRow();
      const text = info.getAttribute('title');
      if (text) { tip.textContent = text; positionBubble(info); tip.classList.add('show'); }
      else hideBubble();
      return;
    }

    closeRow();
    hideBubble();
  });

  window.addEventListener('resize', () => { closeRow(); hideBubble(); });
}

// ── EVENT BINDING ─────────────────────────────────────────────────────────────

function bindEvents() {
  // Compare toggle
  document.getElementById('cmpBtn').addEventListener('click', () => {
    state.comparing = !state.comparing;
    document.getElementById('cmpBtn').classList.toggle('on', state.comparing);
    document.getElementById('cmpSection').style.display = state.comparing ? 'block' : 'none';
    if (!state.comparing) {
      state.slots[1].weapon = null;
      state.slots[1].atts = Loadout.blankAtts();
    }
    renderSidebar();
    renderStats();
  });
  document.getElementById('cloneLoadoutBtn').addEventListener('click', cloneCompareLoadout);

  // Share / copy link
  document.getElementById('shareBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('shareBtn');
    syncUrl();
    const url = location.href;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { /* fall through */ }
    if (!ok) {
      const t = document.createElement('input');
      t.value = url; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch { /* ignore */ }
      t.remove();
    }
    const orig = btn.textContent;
    btn.textContent = ok ? 'Link copied!' : 'Copy failed';
    btn.classList.toggle('copied', ok);
    clearTimeout(btn._resetTimer);
    btn._resetTimer = setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1600);
  });

  // Pop the pattern into its own window, carrying the current loadout and view
  // across in the hash so it opens on exactly what you were looking at.
  document.getElementById('rcPopoutBtn')?.addEventListener('click', () => {
    syncUrl();
    const url = `${location.pathname}?popout=1${location.hash}`;
    window.open(url, 'bf6-spray-popout', 'popup=yes,width=1100,height=900');
  });

  // Redraw when the plot column changes width, so a resize or a panel collapse
  // rescales the pattern instead of leaving a stretched bitmap.
  const plotCanvas = document.getElementById('rcMain');
  let lastPlotSize = '';
  const repaintIfResized = () => {
    if (!plotCanvas) return;
    const rect = plotCanvas.getBoundingClientRect();
    const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (!rect.width || size === lastPlotSize) return;
    lastPlotSize = size;
    renderRecoil();
  };
  if (plotCanvas && typeof ResizeObserver !== 'undefined') {
    plotResizeObserver = new ResizeObserver(repaintIfResized);
    plotResizeObserver.observe(plotCanvas);
  }
  // Belt and braces: a plain resize listener covers anything the observer
  // misses, and both are debounced through the size check above.
  window.addEventListener('resize', repaintIfResized);
  requestAnimationFrame(repaintIfResized);

  // Panel collapse
  document.querySelectorAll('.panel-toggle[data-collapse]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.collapse;
      setPanelCollapsed(key, !state.collapsed[key]);
    });
  });

  // Loadout overlay (responsive)
  document.getElementById('loadoutOpenBtn')?.addEventListener('click', () => setLoadoutOverlay(true));
  document.getElementById('loadoutCloseBtn')?.addEventListener('click', () => setLoadoutOverlay(false));
  document.getElementById('loadoutBackdrop')?.addEventListener('click', () => setLoadoutOverlay(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setLoadoutOverlay(false); });

  // Chart mode
  document.getElementById('modeDmg').addEventListener('click', () => setChartMode('dmg'));
  document.getElementById('modeBtk').addEventListener('click', () => setChartMode('btk'));
  document.getElementById('modeTtk').addEventListener('click', () => setChartMode('ttk'));
  document.getElementById('adsToggleBtn').addEventListener('click', toggleAdsToggle);
  document.getElementById('btkHsSelect').addEventListener('change', e => setBtkHS(+e.target.value));

  // Recoil aim / stance / control
  document.getElementById('rcAimAds').addEventListener('click', () => setRecoilAim('ads'));
  document.getElementById('rcAimHip').addEventListener('click', () => setRecoilAim('hip'));
  document.getElementById('rcStanceStand').addEventListener('click', () => setRecoilStance('stand'));
  document.getElementById('rcStanceMove').addEventListener('click', () => setRecoilStance('move'));
  document.getElementById('rcViewAngle').addEventListener('click', () => setRecoilView('angle'));
  document.getElementById('rcViewTarget').addEventListener('click', () => setRecoilView('target'));
  document.getElementById('rcPlatformPc').addEventListener('click', () => setRecoilPlatform('pc'));
  document.getElementById('rcPlatformConsole').addEventListener('click', () => setRecoilPlatform('console'));

  // Recoil overlays
  document.getElementById('rcModeScatter').addEventListener('click', () => toggleRecoilLayer('scatter'));
  document.getElementById('rcModeSpread').addEventListener('click', () => toggleRecoilLayer('spray'));
  document.getElementById('rcModePath').addEventListener('click', () => toggleRecoilLayer('path'));
  document.getElementById('rcConeToggleBtn').addEventListener('click', () => toggleRecoilLayer('cone'));
  document.getElementById('rcSpreadToggleBtn').addEventListener('click', () => toggleRecoilLayer('spread'));

  // Recoil canvas controls
  document.getElementById('rcZoomIn').addEventListener('click', () => adjustRecoilScale('in'));
  document.getElementById('rcZoomOut').addEventListener('click', () => adjustRecoilScale('out'));
  document.getElementById('rcResetView').addEventListener('click', resetRecoilView);
  const recoilCanvas = document.getElementById('rcMain');
  // Dragging replaced the pan buttons, so the keyboard needs its own way in.
  recoilCanvas.addEventListener('keydown', e => {
    const pan = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
    if (pan) { e.preventDefault(); panRecoilView(pan); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); adjustRecoilScale('in'); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); adjustRecoilScale('out'); }
    else if (e.key === '0') { e.preventDefault(); resetRecoilView(); }
  });
  // Touch is left to the browser so the page still scrolls under a finger;
  // pointer dragging is for mouse and pen.
  const CLICK_SLOP = 4;
  let recoilDrag = null;
  // Both plot gestures are modifier-gated, and the cursor names whichever one
  // is armed: Shift to pan or zoom, Ctrl to place the aim point.
  const setPanReady = on => recoilCanvas.classList.toggle('panready', on);
  const setAimReady = on => recoilCanvas.classList.toggle('aiming', on && state.recoil.view === 'target');
  const syncModifiers = e => { setPanReady(e.shiftKey); setAimReady(e.ctrlKey || e.metaKey); };
  document.addEventListener('keydown', syncModifiers);
  document.addEventListener('keyup', syncModifiers);
  window.addEventListener('blur', () => { setPanReady(false); setAimReady(false); });
  recoilCanvas.addEventListener('pointermove', syncModifiers);

  recoilCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    recoilDrag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, moved: false, pan: e.shiftKey };
    try { recoilCanvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (recoilDrag.pan) recoilCanvas.classList.add('dragging');
    e.preventDefault();
  });
  recoilCanvas.addEventListener('pointermove', e => {
    if (!recoilDrag || recoilDrag.pointerId !== e.pointerId) return;
    const dx = e.clientX - recoilDrag.x;
    const dy = e.clientY - recoilDrag.y;
    recoilDrag.x = e.clientX;
    recoilDrag.y = e.clientY;
    if (Math.abs(e.clientX - recoilDrag.startX) > CLICK_SLOP || Math.abs(e.clientY - recoilDrag.startY) > CLICK_SLOP) {
      recoilDrag.moved = true;
    }
    if (recoilDrag.pan && recoilDrag.moved) panRecoilByPixels(dx, dy, recoilCanvas);
    e.preventDefault();
  });
  const endRecoilDrag = e => {
    if (!recoilDrag || recoilDrag.pointerId !== e.pointerId) return;
    const wasClick = !recoilDrag.moved && !recoilDrag.pan;
    recoilDrag = null;
    recoilCanvas.classList.remove('dragging');
    // Ctrl+click places the aim point, so an ordinary click on the plot never
    // moves it by accident. Shift stays reserved for panning.
    if (e.type !== 'pointerup' || !wasClick || state.recoil.view !== 'target') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const world = canvasToWorld(e.clientX, e.clientY, recoilCanvas);
    if (world) fireAtAimPoint(world.x, world.y);
  };
  recoilCanvas.addEventListener('pointerup', endRecoilDrag);
  recoilCanvas.addEventListener('pointercancel', endRecoilDrag);
  // Plain scrolling belongs to the page; zooming needs Shift so the chart
  // cannot swallow the wheel while someone is reading past it.
  recoilCanvas.addEventListener('wheel', e => {
    if (!e.shiftKey) return;
    e.preventDefault();
    // Browsers remap a shifted wheel to the horizontal axis, so take whichever
    // delta actually carries the gesture.
    zoomRecoilAtPointer(e.deltaY || e.deltaX, e.clientX, e.clientY, recoilCanvas);
  }, { passive: false });

  // Inputs
  const spreadPresetSel = document.getElementById('rcSpreadPreset');
  const spreadShotsInput = document.getElementById('rcSpreadShotsInput');
  const closeSpreadEditor = () => {
    if (!state.recoil.spreadEditing) return;
    state.recoil.spreadEditing = false;
    renderRecoil();
  };
  spreadPresetSel?.addEventListener('change', e => {
    state.recoil.spreadPreset = e.target.value;
    state.recoil.spreadEditing = state.recoil.spreadPreset === 'custom';
    // Choosing which shots get bubbles implies wanting to see them.
    if (!state.recoil.layers.spread) toggleRecoilLayer('spread');
    renderRecoil();
    if (state.recoil.spreadEditing) spreadShotsInput?.focus();
  });
  // Re-open the editor by clicking the menu again once Custom is already set.
  spreadPresetSel?.addEventListener('click', () => {
    if (state.recoil.spreadPreset !== 'custom' || state.recoil.spreadEditing) return;
    state.recoil.spreadEditing = true;
    renderRecoil();
  });
  spreadShotsInput?.addEventListener('input', renderRecoil);
  spreadShotsInput?.addEventListener('blur', closeSpreadEditor);
  spreadShotsInput?.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.preventDefault();
    spreadShotsInput.blur();
  });
  document.getElementById('rcShotCountInput')?.addEventListener('change', syncRecoilShotCount);
  document.getElementById('rcCompInput')?.addEventListener('change', () => syncCompensationLevel('input'));
  document.getElementById('rcCompRange')?.addEventListener('input', () => syncCompensationLevel('range'));
  document.getElementById('rcDistanceInput')?.addEventListener('change', () => syncTargetDistance('input'));
  document.getElementById('rcDistanceRange')?.addEventListener('input', () => syncTargetDistance('range'));
  document.getElementById('rcZoomRange')?.addEventListener('input', syncZoomFromSlider);
}

// ── INIT ──────────────────────────────────────────────────────────────────────

// Popout mode strips the dashboard down to the pattern and its controls.
if (new URLSearchParams(location.search).get('popout') === '1') {
  document.body.classList.add('is-popout');
}

_restoringUrl = true;
restoreFromUrl();
bindEvents();
renderSidebar();
renderStats();
_restoringUrl = false;
initMobileTooltips();
whenTargetImageReady().then(() => {
  if (state.recoil.view === 'target') renderRecoil();
});
