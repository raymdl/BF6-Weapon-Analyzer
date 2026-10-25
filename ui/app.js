import { createDataErrorNotice } from './data-errors.js';
import { requireNumber, setDataErrorReporter, invalidData } from '../sim/required-data.js';
import { formatMilliseconds, formatMovementMultiplier } from './format.js';
import { renderAttachmentSection } from './loadout.js';
import { targetImpactStatsHtml } from './target-stats.js';
import { bindRecoilTouchControls } from './recoil-touch.js';
import { createFiringRange, rangeImpactZones, RANGE_ZONE_COLORS, RANGE_ZONE_LEGEND, RANGE_MISS_COLOR } from './firing-range.js';
import { fireModeConfiguration, selectedFireMode } from '../sim/fire-modes.js';
import { degreesPerCount, hipfireDegreesPerCount, cmPer360, SENS_DEFAULTS } from '../sim/sensitivity.js';
import {
  setSimContext, mulberry32, whash,
  recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
  selectedRecoilAmountFor, selectedRecoilAmountBeforePlatformFor, selectedRecoilVariationFor,
  spreadBounds, spreadDynamics, weaponRpm, validateWeaponSimulation, sampleSpreadRadius, samplePellets, selectedSpreadIncFor, effectiveSpreadMax, SPREAD_BAR_SCALE,
  simulateSpread, shotIntervalAfter, genRecoilPts,
} from '../sim/core.js';
import { setAttachmentContext, applyAttachments, applyBareWeapon, attachmentContributions, floorStatDisplay, wLabel, applyDeployedState, hasDeployable } from '../sim/applyAttachments.js';
import { captureView, captureFilename } from './capture.js';
import { damageAtRange, damagePerShotAtRange, bulletsToKillAtRange, zoneMultiplierForWeapon, resolveHitMultipliers } from '../sim/damage.js';
import * as Loadout from '../sim/loadout.js';
import { createShareCodec, TARGET_DEFAULT_DISTANCE } from '../sim/share-state.js';
import { drawTarget, targetAimOffset, targetFrame, targetMarkerRadius, whenTargetImageReady } from '../sim/target.js';
import { flightTimeAtDistance, isProjectileModel, zeroRelativeVerticalOffset } from '../sim/ballistics.js';

import { createWeaponAttributeModel } from '../sim/weapon-attributes.js';
import { renderWeaponAttributes } from './weapon-attributes.js';

// ── DATA FETCH ────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
}

const reportDataError = createDataErrorNotice();
setDataErrorReporter(reportDataError);

let _weaponAttributes;
let W, _recoilDecay, _balance, _atts, _ammo, _ballistics, _hitZones, _attachmentTooltips;
try {
  [W, _recoilDecay, _balance, _atts, _ammo, _ballistics, _hitZones, _attachmentTooltips, _weaponAttributes] = await Promise.all([
    fetchJson('./data/weapons.json').then(r => r.json()),
    fetchJson('./data/recoil_decay.json').then(r => r.json()),
    fetchJson('./data/balance_tables.json').then(r => r.json()),
    fetchJson('./data/attachments.json').then(r => r.json()),
    fetchJson('./data/ammo.json').then(r => r.json()),
    fetchJson('./data/ballistics.json').then(r => r.json()),
    fetchJson('./data/hit_zones.json').then(r => r.json()),
    fetchJson('./data/attachment-tooltips.json').then(r => r.json()),
    fetchJson('./data/weapon_attributes.json').then(r => r.json()),
  ]);
  for (const weapon of W) {
    validateWeaponSimulation(weapon);
    requireNumber(_balance.RECOIL_MULT?.[weapon.id], `${weapon.id} RECOIL_MULT`);
    const ammo = _ammo.WEAPON_AMMO?.[weapon.id];
    if (!ammo?.ammo || !Object.hasOwn(ammo.ammo, ammo.def)) invalidData(`Missing or invalid ${weapon.id} ammo data`);
    resolveHitMultipliers(weapon.id, null, { HIT_ZONES: _hitZones });
    for (const id of Object.keys(ammo?.ammo ?? {})) resolveHitMultipliers(weapon.id, { id }, { HIT_ZONES: _hitZones });
    // The blueprint firing-dispersion angle: the pellet cone the sprays sample.
    const dispersion = _weaponAttributes.shotgunDispersion?.[weapon.id];
    if (dispersion != null) weapon.pelletDispersion = requireNumber(dispersion, `${weapon.id} shotgunDispersion`);
  }
} catch (err) {
  reportDataError(new Error(`Failed to load weapon data: ${err.message}`));
  throw err;
}

const { RECOIL_DEC, RECOIL_DEC_TEXP, RECOIL_DEC_EXP } = _recoilDecay;
const { RECOIL_MULT, HIP_SPREAD_TABLE, HIP_SPREAD_BASE_INDEX, HIP_SPREAD_BASE_INDEX_OVERRIDES,
        COLLATERAL_MULT_OVERRIDE,
        MOVING_ACC_TIERS,
        ADS_SPD_TIERS, ADS_MOVE_TIERS,
        DRAW_TIME_TABLES } = _balance;

const { SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, ACCESSORIES,
        WEAPON_ATTS, WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_MAG } = _atts;
const { AMMO, WEAPON_AMMO } = _ammo;

const LOADOUT_DATA = {
  SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, ACCESSORIES,
  WEAPON_ATTS, WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_MAG,
  AMMO, WEAPON_AMMO, WEAPON_ATTS,
  ATTACHMENT_TOOLTIPS: _attachmentTooltips,
  GAME_BUGS: _atts.GAME_BUGS ?? [],
};

const calculateWeaponAttributes = createWeaponAttributeModel({ balance: _balance, catalogs: LOADOUT_DATA, attributes: _weaponAttributes });

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
  ACCESSORIES: byId(ACCESSORIES),
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const CLASSES = ['Assault Rifle', 'Carbine', 'SMG', 'LMG', 'DMR', 'Sniper Rifle', 'Shotgun', 'Sidearm'];
const CLASS_SHORT = {
  'Assault Rifle': 'AR', 'Carbine': 'Carbine', 'SMG': 'SMG',
  'LMG': 'LMG', 'DMR': 'DMR', 'Sniper Rifle': 'Sniper', 'Shotgun': 'Shotgun', 'Sidearm': 'Pistol',
};

const RECOIL_SCALE_DEFAULT = 7;
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
// taken to show this much field, so every step on the ladder frames the
// soldier the way that scope would in game. Battlefield 6 states field of
// view horizontally, so this is a horizontal angle and the vertical field the
// plot actually needs is derived from the display's aspect ratio.
const ADS_1X_HFOV_DEG = 103;
// The in-game optic ladder, extended past both ends so the plot can pull back
// for a whole long-range pattern or push in past any real scope.
const SCOPE_MAGNIFICATIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 12, 16, 20, 30, 40];
const TARGET_DISTANCE_MIN = 5;
const TARGET_DISTANCE_MAX = 300;
const TARGET_DEFAULT_MAGNIFICATION = 2.5;
const TARGET_DEFAULT_Y_MIN_M = -1.5;
const TARGET_DEFAULT_Y_MAX_M = 2.5;
const TARGET_DEFAULT_CENTER_Y_CM = ((TARGET_DEFAULT_Y_MIN_M + TARGET_DEFAULT_Y_MAX_M) / 2) * 100;
const PLOT_PAD = { l: 28, r: 8, t: 8, b: 18 };
const CLOUD_RUNS = 10;
// Ceiling for the Spread Min → Eff. Max bar, in degrees. One axis for every
// aim state and stance, so the bar lengths stay comparable across the whole
// app. The full source hip table reaches 11.303° in the single-attachment
// corpus. scripts/spread-bar-scale.test.mjs checks that the axis contains it.
const RECOIL_BAR_SCALE = 3;
const CONSOLE_RECOIL_MULT = 0.95;

// Keep raw timing-derived RPM for calculations; display it as the stat screen does.
function formatInGameRpm(value) {
  if (value == null) return '—';
  const raw = Number(value);
  if (!Number.isFinite(raw)) return value;
  return floorStatDisplay(raw);
}

// ── APP STATE ─────────────────────────────────────────────────────────────────

const state = {
  // On the Firing Range the compare loadout is put aside: `comparing` turns
  // off and `comparingHeld` remembers to turn it back on when the view changes.
  comparingHeld: false,
  slots: [
    // `locked` maps an attachment slot to the choice it is locked at; those
    // choices come along to every weapon that can take them.
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts(), locked: {}, savedName: null },
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts(), locked: {}, savedName: null },
  ],
  comparing: false,
  // Panels fold away so the page can be sized for a screenshot without giving
  // up canvas space.
  collapsed: { overview: false, charts: false, recoil: false },
  chart: { mode: 'dmg', btkHS: 0, showAds: false, showVel: false },
  recoil: {
    aim: 'ads', stance: 'stand',
    view: 'angle', distance: TARGET_DEFAULT_DISTANCE, targetAim: 'chest', customAim: { x: 0, y: 0 }, zeroDistance: 100,
    // The target view has room for one stats block at a time, so it swaps
    // between the impact breakdown and the recoil/spread readout.
    targetStatsTab: 'impact',
    layers: { scatter: true, spray: true, path: false, spread: false, cone: false },
    // Scatter is far too noisy over a soldier, so each view keeps its own
    // overlay choices and its own sensible starting point.
    savedLayers: {
      angle: { scatter: true, spray: true, path: false, spread: false, cone: false },
      target: { scatter: false, spray: true, path: false, spread: false, cone: false },
      range: { scatter: false, spray: true, path: false, spread: false, cone: false },
    },
    platform: 'pc',
    spreadPreset: 'growth',
    // Transient: whether the custom shot-list popover is open.
    spreadEditing: false,
    // 0% means no compensation, so the slider is the whole control.
    compensationLevel: 0,
    refSeed: 0,
    scaleH: RECOIL_SCALE_DEFAULT, panX: 0, panY: 0,
    crosshair: true,
    // Target zoom follows the primary slot's sight. An explicit zoom holds only
    // while the sight it was set on (magnificationSight) stays equipped; without
    // a sight it starts at 2.5× and null is the automatic-fit sentinel.
    magnification: 2.5, magnificationSight: null, distancePanX: 0, distancePanY: 0,
  },
};

const ASSUMED_STATS_NOTE = '* Estimated stats until full datamined values are available';

function weaponDisplayLabel(w) {
  const label = wLabel(w);
  if (!w?.estimated) return label;
  const name = w.name ?? label;
  const suffix = label.startsWith(name) ? label.slice(name.length) : '';
  return `${name}*${suffix}`;
}

/** Heading HTML for a stats card: the weapon's name with its attachments beneath. */
function loadoutHeadingHtml(w) {
  const label = weaponDisplayLabel(w);
  const name = chartWeaponDisplayLabel(w);
  const atts = label.startsWith(name + ' (') && label.endsWith(')') ? label.slice(name.length + 2, -1) : '';
  return `${name}${atts ? `<span class="loadout-atts">${atts}</span>` : ''}`;
}
function chartWeaponDisplayLabel(w) {
  const name = w?.name ?? wLabel(w);
  return w?.estimated ? `${name}*` : name;
}
/** The slot's numbered badge, so a heading says which loadout it is when two are shown. */
function badgeHtml(i) {
  return `<span class="wb wb${i + 1}" aria-hidden="true">${i + 1}</span>`;
}
/** Badges appear only while two weapons are on the page; one needs no number. */
function showsBadges() {
  return state.comparing && !!state.slots[0].weapon && !!state.slots[1].weapon;
}

function weaponAriaLabel(w) {
  const label = weaponDisplayLabel(w);
  return w?.estimated ? `${label} Estimated weapon` : label;
}

let dmgChart = null;
// Held so the observer is not collected while it still has an observation.
let plotResizeObserver = null;
let recoilTouchControls = null;
let firingRange = null;

/** Soldier Target and Firing Range share the projected-target geometry. */
function isTargetGeometry() {
  return state.recoil.view === 'target' || state.recoil.view === 'range';
}

// ── SIM CONTEXT INIT ──────────────────────────────────────────────────────────

setSimContext({
  aimState: 'ads', stanceState: 'stand',
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: selectedCompensationLevel,
  platformRecoilMultFn: selectedPlatformRecoilMult,
});
setAttachmentContext({
  SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, WEAPON_MAG, WEAPON_ERGO,
  AMMO, WEAPON_AMMO, WEAPON_ATTS,
  RECOIL_MULT, HIP_SPREAD_TABLE, HIP_SPREAD_BASE_INDEX, HIP_SPREAD_BASE_INDEX_OVERRIDES,
  COLLATERAL_MULT_OVERRIDE, HIT_ZONES: _hitZones,
  MOVING_ACC_TIERS,
  ADS_SPD_TIERS, ADS_MOVE_TIERS,
  DRAW_TIME_TABLES,
  RELOAD_SPEED_MULTIPLIERS: _balance.RELOAD_SPEED_MULTIPLIERS,
  VELOCITY_LADDER: _balance.VELOCITY_LADDER,
  HEALTH_REGEN_DELAY_S: _balance.HEALTH_REGEN_DELAY_S,
});

// ── DAMAGE HELPERS ────────────────────────────────────────────────────────────

function getDmg(weapon, range) {
  return damageAtRange(weapon, range);
}
function limbMult(weapon) {
  return zoneMultiplierForWeapon(weapon, 'limb');
}
// Bullets to kill with `headshots` headshots and every remaining hit on a non-head
// zone with damage multiplier `zoneMult` (1 = chest, weapon's limb mult = arms/legs).
// Hit order is irrelevant — damage is additive.
function getBTKWithHits(weapon, range, headshots = 0, zoneMult = 1) {
  return bulletsToKillAtRange(weapon, range, { headshots, bodyMultiplier: zoneMult });
}
function getTTK(weapon, btk) {
  if (!Number.isFinite(weapon.rpm) || weapon.rpm <= 0 || btk == null || !Number.isFinite(btk)) return null;
  let ms = 0;
  for (let i = 1; i < btk; i++) ms += shotIntervalAfter(weapon, i) * 1000;
  return Math.round(ms);
}
function projectileModelFor(weapon, atts) {
  const selection = _ballistics.weapons?.[weapon?.id];
  const projectile = _ballistics.projectiles?.[weapon?._projectileRoute
    ?? (atts?.ammo ? selection?.ammo?.[atts.ammo] : selection?.base)];
  const model = {
    velocityMps: Number.isFinite(weapon?._projectileVelocityMps) ? weapon._projectileVelocityMps
      : weapon?.bulletVel,
    dragPerMeter: projectile?.dragPerMeter,
    gravityMps2: projectile?.gravityMps2,
  };
  return isProjectileModel(model) ? model : null;
}
const selectedBuildCache = new WeakMap();
function selectedWeaponBuild(slot) {
  if (!slot?.weapon) return null;
  const key = JSON.stringify(slot.atts);
  const cached = selectedBuildCache.get(slot);
  if (cached?.weapon === slot.weapon && cached.key === key) return cached.build;
  const build = applyAttachments(slot.weapon, slot.atts);
  const projectileModel = projectileModelFor(build, slot.atts);
  if (projectileModel) build._projectileModel = projectileModel;
  selectedBuildCache.set(slot, { weapon: slot.weapon, key, build });
  return build;
}
/**
 * The build the recoil and spread simulation uses: the selected build, with its
 * bipod or grip pod deployed in the Mounted stance. The stats and attribute
 * panels keep the undeployed build, as the game's stat screen does.
 */
function selectedSimBuild(slot) {
  const build = selectedWeaponBuild(slot);
  return build && state.recoil.stance === 'mount' ? applyDeployedState(build) : build;
}
function isZeroableWeapon(weapon) {
  return weapon?.cls === 'DMR' || weapon?.cls === 'Sniper Rifle';
}
function zeroDistanceFor(weapon) {
  return isZeroableWeapon(weapon) ? state.recoil.zeroDistance : null;
}
const targetDropCache = new Map();
function targetVerticalOffsetMeters(weapon) {
  const model = weapon?._projectileModel;
  if (!model) return 0;
  const zeroDistance = zeroDistanceFor(weapon);
  const key = [weapon.id, model.velocityMps, model.dragPerMeter, model.gravityMps2, state.recoil.distance, zeroDistance ?? 'bore'].join('|');
  if (targetDropCache.has(key)) return targetDropCache.get(key);
  const value = zeroRelativeVerticalOffset(model, state.recoil.distance, zeroDistance);
  const resolved = Number.isFinite(value) ? value : null;
  targetDropCache.set(key, resolved);
  return resolved;
}
function fmtTTK(ms) {
  return !Number.isFinite(ms) ? '—' : ms === 0 ? '0ms' : ms + 'ms';
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
  if (cls.some(c => c === 'Sniper Rifle' || c === 'Shotgun')) return 105;
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
  SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, AMMO, ERGOS, ACCESSORIES,
  WEAPON_MAG, WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_ATTS, WEAPON_AMMO,
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
const bareAppliedWeaponCache = new Map();
function bareAppliedWeapon(weapon) {
  if (!weapon) return null;
  let cached = bareAppliedWeaponCache.get(weapon.id);
  if (!cached) {
    cached = applyBareWeapon(weapon, defaultAttsForWeapon(weapon));
    bareAppliedWeaponCache.set(weapon.id, cached);
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

let _restoringUrl = false;
let _urlSyncTimer = null;

// Attachments are encoded as <key><catalogIndex> tokens (e.g. "M5B3K2"), and only
// slots that differ from the weapon's default are written — keeping share URLs short.
// Keys: S sight, M muzzle, B barrel, G grip, A ammo, E ergo, K mag, T light,
// L laser, O optic accessory; R/H = a grip/light occupying a combined laser slot (VZ.61, sidearms).
// NOTE: this relies on the catalog arrays being append-only (never reorder/remove
// existing entries) so previously shared links keep resolving to the same item.
function encodeState() {
  // A compare loadout held aside by the range still belongs in the link.
  return shareCodec.encodeState(state.comparingHeld ? { ...state, comparing: true } : state, selectedRecoilShotCount);
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
  if (!collapsed) {
    if (key === 'charts') { renderChart(); renderBTK(); }
    if (key === 'recoil') {
      renderRecoil();
      if (isTargetGeometry()) requestTargetImage();
    }
    if (key === 'overview') renderOverview();
  }
}

function applyChartStateToDom() {
  const { mode, btkHS, showAds, showVel } = state.chart;
  const press = (id, on) => {
    const el = document.getElementById(id);
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', String(on));
  };
  press('modeDmg', mode === 'dmg');
  press('modeBtk', mode === 'btk');
  press('modeTtk', mode === 'ttk');
  const isTtk = mode === 'ttk';
  const adsBtn = document.getElementById('adsToggleBtn');
  adsBtn.style.display = isTtk ? '' : 'none';
  adsBtn.classList.toggle('on', isTtk && showAds);
  adsBtn.setAttribute('aria-pressed', String(isTtk && showAds));
  const velBtn = document.getElementById('velToggleBtn');
  velBtn.style.display = isTtk ? '' : 'none';
  velBtn.classList.toggle('on', isTtk && showVel);
  velBtn.setAttribute('aria-pressed', String(isTtk && showVel));
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

  // Reflect the pieces of state that render functions don't set themselves.
  if (state.comparing) {
    document.getElementById('cmpBtn').classList.add('on');
    document.getElementById('cmpBtn').setAttribute('aria-pressed', 'true');
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
    b.type = 'button';
    b.textContent = CLASS_SHORT[c];
    b.title = c;
    b.setAttribute('aria-pressed', String(c === activeClass));
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
    b.type = 'button';
    b.textContent = weaponDisplayLabel(w);
    b.setAttribute('aria-label', weaponAriaLabel(w));
    b.title = w.description ?? '';
    // Beside the list, so the description covers none of the weapons below.
    b.dataset.tipSide = 'right';
    if (w.description) b.setAttribute('aria-description', w.description);
    b.setAttribute('aria-pressed', String(isActive));
    b.onclick = () => {
      slot.weapon = w;
      if (Object.keys(slot.locked).length) {
        Loadout.carryAttsToWeapon(slot.atts, w, LOADOUT_DATA, lockedAsAtts(slot.locked), Object.keys(slot.locked));
      } else resetAttsForWeapon(slot.atts, w);
      slot.savedName = null;
      renderSidebar();
      renderStats();
    };
    el.appendChild(b);
  });
}

function buildAttachmentSection(containerId, slotIdx) {
  const slot = state.slots[slotIdx];
  renderAttachmentSection({
    containerId,
    atts: slot.atts,
    weapon: slot.weapon,
    data: LOADOUT_DATA,
    onChange: ({ key }) => {
      slot.savedName = null;
      // A locked slot the user changes is locked at the new choice.
      const lockKey = key === 'rail' ? 'laser' : key;
      if (Object.hasOwn(slot.locked, lockKey)) {
        slot.locked[lockKey] = lockedValue(slot.atts, lockKey);
        saveLocks(slotIdx);
      }
      syncSavedLoadoutRow(slotIdx);
      updateAssumedFootnote();
      renderStats();
    },
    decorate: container => decorateAttachmentSection(container, containerId, slotIdx),
    locks: slot.locked,
    onLockToggle: key => toggleAttachmentLock(slotIdx, key),
    lockHeld: key => lockHeldStatus(slot, key),
  });
}
/** Whether a locked slot shows its locked choice, and that choice's name for when it does not. */
function lockHeldStatus(slot, key) {
  const want = slot.locked[key];
  const have = lockedValue(slot.atts, key);
  // A device on a combined rail and one in its own slot compare as type and id.
  const norm = v => v == null ? null : typeof v === 'object' ? { type: v.type, id: v.id } : { type: key, id: v };
  const w = norm(want), h = norm(have);
  // The same attachment under another weapon's name counts as the locked choice.
  const held = (!w && !h) || (!!w && !!h && w.type === h.type && (w.id === h.id
    || Loadout.equivalentAttachments(Loadout.catalogRecord(LOADOUT_DATA, w.type, w.id), Loadout.catalogRecord(LOADOUT_DATA, h.type, h.id))));
  if (held) return { held: true };
  const id = want && typeof want === 'object' ? want.id : want;
  const catalog = { sight: 'SIGHTS', muzzle: 'MUZZLES', barrel: 'BARRELS', grip: 'GRIPS', laser: 'LASERS',
    light: 'LIGHTS', accessory: 'ACCESSORIES', ammo: 'AMMO', ergo: 'ERGOS' };
  let name = id;
  if (key === 'mag') name = Object.values(WEAPON_MAG).map(m => m.mags[id]).find(Boolean)?.name ?? id;
  else if (want && typeof want === 'object') name = ATT_BY_ID[{ grip: 'GRIPS', laser: 'LASERS', light: 'LIGHTS' }[want.type]]?.[id]?.name ?? id;
  else name = ATT_BY_ID[catalog[key]]?.[id]?.name ?? id;
  return { held: false, name };
}

// ── SAVED LOADOUTS AND THE ATTACHMENT LOCK ───────────────────────────────────
// Saved loadouts live in local storage as the same compact tokens share links
// use, so they survive catalog growth the way links do. The lock keeps the
// attachments through a weapon change, dropping only what the new weapon lacks.
const SAVED_LOADOUTS_KEY = 'bf6.savedLoadouts';
const LOCK_ATTS_KEY = ['bf6.lockedAtts1', 'bf6.lockedAtts2'];
const LOCKABLE_KEYS = ['sight', 'muzzle', 'barrel', 'grip', 'laser', 'light', 'accessory', 'ammo', 'mag', 'ergo'];

function readSavedLoadouts() {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_LOADOUTS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter(e => e && typeof e.name === 'string' && typeof e.weapon === 'string') : [];
  } catch { return []; }
}
function writeSavedLoadouts(list) {
  try { localStorage.setItem(SAVED_LOADOUTS_KEY, JSON.stringify(list)); } catch { /* storage is optional. */ }
}
function loadLockPreferences() {
  state.slots.forEach((slot, i) => {
    try {
      const stored = JSON.parse(localStorage.getItem(LOCK_ATTS_KEY[i]) ?? '{}');
      slot.locked = stored && typeof stored === 'object' && !Array.isArray(stored)
        ? Object.fromEntries(Object.entries(stored).filter(([k]) => LOCKABLE_KEYS.includes(k))) : {};
    } catch { slot.locked = {}; }
  });
}
function saveLocks(slotIdx) {
  try { localStorage.setItem(LOCK_ATTS_KEY[slotIdx], JSON.stringify(state.slots[slotIdx].locked)); } catch { /* storage is optional. */ }
}
/** The choice a slot is locked at; a device on a combined rail is kept as its rail entry. */
function lockedValue(atts, key) {
  if (key === 'laser' && atts.rail) return { ...atts.rail };
  return atts[key] ?? null;
}
/** The locked choices as an attachment record for carrying onto a weapon. */
function lockedAsAtts(locked) {
  const atts = { ...locked };
  if (atts.laser && typeof atts.laser === 'object') { atts.rail = atts.laser; delete atts.laser; }
  return atts;
}
function toggleAttachmentLock(slotIdx, key) {
  const slot = state.slots[slotIdx];
  if (Object.hasOwn(slot.locked, key)) delete slot.locked[key];
  else { slot.locked[key] = lockedValue(slot.atts, key); noteFirstLock(); }
  saveLocks(slotIdx);
  renderSidebar();
}
// A one-time line under the Attachments header, the first time a lock goes on.
const LOCK_HINT_KEY = 'bf6.lockHintSeen';
let lockHintShowing = false;
function noteFirstLock() {
  try { if (localStorage.getItem(LOCK_HINT_KEY)) return; } catch { return; }
  lockHintShowing = true;
}
function dismissLockHint() {
  lockHintShowing = false;
  try { localStorage.setItem(LOCK_HINT_KEY, '1'); } catch { /* storage is optional. */ }
  renderSidebar();
}
function saveLoadout(slotIdx) {
  const slot = state.slots[slotIdx];
  if (!slot.weapon) return;
  // Names are per weapon: "Loadout N" counts from 1 for each weapon, and a
  // saved name is overwritten only by the same weapon's save.
  const wid = slot.weapon.id;
  const taken = new Set(readSavedLoadouts().filter(e => e.weapon === wid).map(e => e.name));
  let suggested = slot.savedName;
  for (let n = 1; !suggested || taken.has(suggested); n++) suggested = `Loadout ${n}`;
  savedNaming = { slotIdx, suggested };
  renderSavedLoadoutSection(`savedSec${slotIdx + 1}`, slotIdx);
}
/** The name field is open in one Saved Loadouts row: { slotIdx, suggested }. */
let savedNaming = null;
/** The last deleted loadout, kept for Undo: { entry, timer }. */
let savedUndo = null;
function commitSavedName(slotIdx, name) {
  const slot = state.slots[slotIdx];
  savedNaming = null;
  name = name?.trim();
  if (!name || !slot.weapon) { renderSavedLoadoutSection(`savedSec${slotIdx + 1}`, slotIdx); return; }
  const wid = slot.weapon.id;
  const list = readSavedLoadouts().filter(e => !(e.name === name && e.weapon === wid));
  list.push({ name, weapon: wid, atts: shareCodec.encodeAtts(slot.weapon, slot.atts) });
  writeSavedLoadouts(list);
  slot.savedName = name;
  renderSidebar();
}
function loadSavedLoadout(slotIdx, name, weaponId) {
  const entry = readSavedLoadouts().find(e => e.name === name && e.weapon === weaponId);
  const w = entry && W.find(x => x.id === entry.weapon);
  if (!w) return;
  const slot = state.slots[slotIdx];
  slot.cls = w.cls;
  slot.weapon = w;
  slot.atts = shareCodec.decodeAtts(w, entry.atts ?? '');
  // A saved loadout is the whole set, so any locks from before are let go.
  slot.locked = {};
  saveLocks(slotIdx);
  slot.savedName = name;
  renderSidebar();
  renderStats();
}
function deleteSavedLoadout(name, weaponId) {
  const entry = readSavedLoadouts().find(e => e.name === name && e.weapon === weaponId);
  if (!entry) return;
  writeSavedLoadouts(readSavedLoadouts().filter(e => !(e.name === name && e.weapon === weaponId)));
  // Which slots had it loaded, so Undo can show its name in the picker again.
  const loadedIn = state.slots.map(s => s.savedName === name && s.weapon?.id === weaponId);
  state.slots.forEach(s => { if (s.savedName === name && s.weapon?.id === weaponId) s.savedName = null; });
  // No confirm: the row offers Undo for a few seconds instead.
  clearTimeout(savedUndo?.timer);
  savedUndo = { entry, loadedIn, timer: setTimeout(() => { savedUndo = null; renderSidebar(); }, 8000) };
  // Both slots list the same loadouts; the open menu stays open for the next delete.
  const open = document.querySelector('.saved-menu:not([hidden])')?.closest('.sb-sec')?.id;
  renderSidebar();
  if (open) document.querySelector(`#${open} .saved-pick-btn`)?.click();
}
function undoSavedDelete() {
  if (!savedUndo) return;
  clearTimeout(savedUndo.timer);
  const { entry, loadedIn } = savedUndo;
  savedUndo = null;
  writeSavedLoadouts([...readSavedLoadouts().filter(e => !(e.name === entry.name && e.weapon === entry.weapon)), entry]);
  // A slot that still holds the deleted loadout unchanged shows its name again.
  state.slots.forEach((s, i) => {
    if (loadedIn[i] && s.weapon?.id === entry.weapon && !s.savedName
        && shareCodec.encodeAtts(s.weapon, s.atts) === (entry.atts ?? '')) s.savedName = entry.name;
  });
  renderSidebar();
}
function syncSavedLoadoutRow(slotIdx) {
  const slot = state.slots[slotIdx];
  const sec = document.getElementById(`savedSec${slotIdx + 1}`);
  if (!sec) return;
  const btn = sec.querySelector('.saved-pick-btn');
  if (btn) {
    btn.textContent = slot.savedName ? `${slot.savedName} · ${weaponDisplayLabel(slot.weapon)}` : btn.dataset.placeholder;
    btn.classList.toggle('placeholder', !slot.savedName);
  }
  sec.querySelectorAll('.saved-item').forEach(item => {
    const on = item.dataset.name === slot.savedName && item.dataset.weapon === slot.weapon?.id;
    item.classList.toggle('on', on);
    item.querySelector('.saved-item-load')?.setAttribute('aria-selected', String(on));
  });
}
function decorateAttachmentSection(container, containerId, slotIdx) {
  const slot = state.slots[slotIdx];
  const head = container.firstElementChild;
  if (!head) return;
  // The header padlock locks or unlocks every row at once; it shows closed
  // when all rows are locked and half-lit when only some are.
  const keys = [...container.querySelectorAll('.att-row[data-lock-key]')].map(row => row.dataset.lockKey);
  // Lock-all takes only the rows with something fitted; a "None" stays free.
  const fitted = keys.filter(key => { const v = lockedValue(slot.atts, key); return v != null && v !== 'none'; });
  const lockedCount = keys.filter(key => Object.hasOwn(slot.locked, key)).length;
  const all = fitted.length > 0 && fitted.every(key => Object.hasOwn(slot.locked, key));
  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = 'att-tool att-tool-lock' + (all ? ' on' : lockedCount ? ' partial' : '');
  lock.disabled = !keys.length;
  lock.title = (all ? 'All fitted attachments locked. ' : lockedCount ? `${lockedCount} of ${keys.length} attachments locked. ` : 'No attachments locked. ')
    + 'Locked attachments stay through a weapon change; one the new weapon cannot take goes back to its default until a weapon that can.';
  lock.setAttribute('aria-label', all ? 'Unlock all attachments' : 'Lock all attachments');
  lock.setAttribute('aria-pressed', String(all));
  lock.onclick = () => {
    if (all) slot.locked = {};
    else { for (const key of fitted) if (!Object.hasOwn(slot.locked, key)) slot.locked[key] = lockedValue(slot.atts, key); noteFirstLock(); }
    saveLocks(slotIdx);
    renderSidebar();
  };
  head.firstElementChild.insertAdjacentElement('afterend', lock);
  head.firstElementChild.style.marginRight = '6px';
  if (lockHintShowing && slotIdx === 0) {
    const hint = document.createElement('div');
    hint.className = 'att-note att-lock-hint';
    hint.textContent = 'Locked attachments stay when you choose another weapon. One the weapon cannot take shows a dashed edge and comes back on a weapon that can. ';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'saved-undo-btn';
    ok.textContent = 'Got it';
    ok.onclick = dismissLockHint;
    hint.appendChild(ok);
    head.insertAdjacentElement('afterend', hint);
  }
}
/** The Saved Loadouts section above the class filter: pick one to load it,
 *  Save names the current weapon and attachments, ✕ deletes the loaded one. */
/** The fitted attachments of a saved loadout, one per line, for its hover text. */
function savedLoadoutSummary(weapon, atts) {
  const catalog = { sight: 'SIGHTS', muzzle: 'MUZZLES', barrel: 'BARRELS', grip: 'GRIPS', laser: 'LASERS',
    light: 'LIGHTS', accessory: 'ACCESSORIES', ammo: 'AMMO', ergo: 'ERGOS' };
  const lines = [];
  for (const [key, list] of Object.entries(catalog)) {
    const id = key === 'laser' && atts.rail ? atts.rail.id : atts[key];
    const a = id && id !== 'none' && id !== 'standard'
      ? ATT_BY_ID[key === 'laser' && atts.rail ? { grip: 'GRIPS', laser: 'LASERS', light: 'LIGHTS' }[atts.rail.type] : list][id] : null;
    if (a && a.id !== 'iron') lines.push(Loadout.attDisplayName(a, weapon.id));
  }
  const mag = atts.mag && WEAPON_MAG[weapon.id]?.mags[atts.mag];
  if (mag && atts.mag !== WEAPON_MAG[weapon.id].def) lines.push(mag.name);
  return lines;
}
/** One site-styled tooltip for the saved-loadout menu, placed beside the hovered entry. */
let savedTipEl = null;
function showSavedTip(item, name, lines) {
  if (!savedTipEl) {
    savedTipEl = document.createElement('div');
    savedTipEl.className = 'rc-tt saved-tt';
    document.body.appendChild(savedTipEl);
  }
  const tip = savedTipEl;
  tip.innerHTML = '<div class="rc-tt-wname"></div>';
  tip.firstElementChild.textContent = name;
  if (lines.length) {
    for (const line of lines) {
      const row = document.createElement('div');
      row.className = 'saved-tt-line';
      row.textContent = line;
      tip.appendChild(row);
    }
  } else {
    tip.insertAdjacentHTML('beforeend', '<div class="saved-tt-line saved-tt-none">No attachments fitted</div>');
  }
  tip.style.display = 'block';
  const r = item.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = r.right + 6;
  if (left + tw > window.innerWidth - 8) left = Math.max(8, r.left - tw - 6);
  const top = Math.max(8, Math.min(r.top, window.innerHeight - th - 8));
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
function hideSavedTip() {
  if (savedTipEl) savedTipEl.style.display = 'none';
}
/** A menu rather than a select, so each saved loadout can carry its own ✕. */
function renderSavedLoadoutSection(containerId, slotIdx) {
  const slot = state.slots[slotIdx];
  const sec = document.getElementById(containerId);
  if (!sec) return;
  sec.innerHTML = '<div class="sb-lbl">Saved Loadouts</div>';
  const row = document.createElement('div');
  row.className = 'saved-row';
  sec.appendChild(row);

  // Naming: the picker gives way to a text field until Enter, Save or Escape.
  if (savedNaming?.slotIdx === slotIdx) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'att-sel saved-name-input';
    // A re-render while naming (the Undo timer, a weapon click) keeps what was typed.
    input.value = savedNaming.typed ?? savedNaming.suggested;
    input.maxLength = 40;
    input.setAttribute('aria-label', 'Name for the saved loadout');
    input.placeholder = 'Loadout name';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'att-tool on';
    ok.textContent = 'Save';
    ok.title = 'Save under this name (Enter)';
    ok.onmousedown = e => e.preventDefault();
    ok.onclick = () => commitSavedName(slotIdx, input.value);
    input.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); commitSavedName(slotIdx, input.value); }
      else if (e.key === 'Escape') { e.preventDefault(); commitSavedName(slotIdx, ''); }
    };
    input.oninput = () => { if (savedNaming?.slotIdx === slotIdx) savedNaming.typed = input.value; };
    // A field a re-render has replaced is not the user leaving it.
    input.onblur = () => { if (input.isConnected && savedNaming?.slotIdx === slotIdx) commitSavedName(slotIdx, ''); };
    row.append(input, ok);
    requestAnimationFrame(() => {
      input.focus();
      if (savedNaming?.typed == null) input.select();
      else input.setSelectionRange(input.value.length, input.value.length);
    });
    return;
  }

  const pick = document.createElement('div');
  pick.className = 'saved-pick';
  const saved = readSavedLoadouts();
  const labelOf = e => { const w = W.find(x => x.id === e.weapon); return w ? weaponDisplayLabel(w) : null; };
  // Grouped by weapon, weapons in sidebar order, names within.
  const order = new Map(W.map((w, i) => [w.id, i]));
  saved.sort((a, b) => (order.get(a.weapon) ?? 1e9) - (order.get(b.weapon) ?? 1e9) || a.name.localeCompare(b.name));
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'att-sel saved-pick-btn';
  btn.id = `${containerId}_btn`;
  btn.dataset.placeholder = saved.length ? 'Load a saved loadout…' : 'No saved loadouts yet';
  btn.disabled = !saved.length;
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Saved loadouts');
  const menu = document.createElement('div');
  menu.className = 'saved-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  const close = () => {
    // A re-rendered sidebar leaves this menu behind; its listener goes with it.
    if (!menu.isConnected) { document.removeEventListener('click', close); return; }
    menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
    hideSavedTip();
  };
  btn.onclick = e => {
    e.stopPropagation();
    if (!menu.hidden) { close(); return; }
    document.querySelectorAll('.saved-menu:not([hidden])').forEach(m => { m.hidden = true; });
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  };
  menu.onclick = e => e.stopPropagation();
  document.addEventListener('click', close);
  menu.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); btn.focus(); } });
  let lastWeapon = null;
  for (const entry of saved) {
    const w = W.find(x => x.id === entry.weapon);
    if (entry.weapon !== lastWeapon) {
      const head = document.createElement('div');
      head.className = 'saved-group';
      head.textContent = labelOf(entry) ?? 'Weapon no longer listed';
      menu.appendChild(head);
      lastWeapon = entry.weapon;
    }
    const item = document.createElement('div');
    item.className = 'saved-item';
    item.dataset.name = entry.name;
    item.dataset.weapon = entry.weapon;
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'saved-item-load';
    load.setAttribute('role', 'option');
    load.innerHTML = `<span class="saved-item-name"></span>`;
    load.querySelector('.saved-item-name').textContent = entry.name;
    load.disabled = !w;
    if (w) {
      const lines = savedLoadoutSummary(w, shareCodec.decodeAtts(w, entry.atts ?? ''));
      const show = () => showSavedTip(item, `${entry.name} · ${weaponDisplayLabel(w)}`, lines);
      load.addEventListener('mouseenter', show);
      load.addEventListener('focus', show);
      load.addEventListener('mouseleave', hideSavedTip);
      load.addEventListener('blur', hideSavedTip);
    }
    load.onclick = () => { close(); loadSavedLoadout(slotIdx, entry.name, entry.weapon); };
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'saved-item-del';
    del.textContent = '✕';
    del.title = `Delete "${entry.name}"`;
    del.setAttribute('aria-label', `Delete the saved loadout ${entry.name}`);
    del.onclick = () => deleteSavedLoadout(entry.name, entry.weapon);
    item.append(load, del);
    menu.appendChild(item);
  }
  pick.append(btn, menu);
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'att-tool';
  save.textContent = 'Save';
  save.title = 'Save this weapon and its attachments in this browser';
  save.disabled = !slot.weapon;
  save.onclick = () => saveLoadout(slotIdx);
  row.append(pick, save);
  if (savedUndo) {
    const note = document.createElement('div');
    note.className = 'saved-undo';
    note.textContent = `Deleted ${savedUndo.entry.name}${labelOf(savedUndo.entry) ? ` · ${labelOf(savedUndo.entry)}` : ''}. `;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'saved-undo-btn';
    undo.textContent = 'Undo';
    undo.onclick = undoSavedDelete;
    note.appendChild(undo);
    sec.appendChild(note);
  }
  syncSavedLoadoutRow(slotIdx);
}

function updateAssumedFootnote() {
  document.querySelectorAll('.att-note.assumed-note').forEach(el => el.remove());
  const selected = [state.slots[0], ...(state.comparing ? [state.slots[1]] : [])];
  selected.forEach((slot, index) => {
    const noteTarget = document.getElementById(`attSection${index + 1}`);
    if (!noteTarget) return;
    if (slot.weapon?.estimated || Loadout.hasSelectedAssumedAtt(slot.atts, LOADOUT_DATA, slot.weapon)) {
      const note = document.createElement('div');
      note.className = 'att-note assumed-note';
      note.textContent = ASSUMED_STATS_NOTE;
      noteTarget.appendChild(note);
    }
  });
}

function renderSidebar() {
  renderSavedLoadoutSection('savedSec1', 0);
  buildClassFilter('classFilter1', 0);
  buildWeaponList('wList1', 0);
  buildAttachmentSection('attSection1', 0);
  if (state.comparing) {
    const cloneBtn = document.getElementById('cloneLoadoutBtn');
    if (cloneBtn) cloneBtn.disabled = !state.slots[0].weapon;
    const swapBtn = document.getElementById('swapLoadoutBtn');
    if (swapBtn) swapBtn.disabled = !state.slots[0].weapon && !state.slots[1].weapon;
    renderSavedLoadoutSection('savedSec2', 1);
    buildClassFilter('classFilter2', 1);
    buildWeaponList('wList2', 1);
    buildAttachmentSection('attSection2', 1);
  }
  updateAssumedFootnote();
}

function swapCompareLoadouts() {
  if (!state.comparing) return;
  const [a, b] = state.slots;
  state.slots = [b, a];
  // The locks travel with their loadouts, in storage too.
  saveLocks(0); saveLocks(1);
  renderSidebar();
  renderStats();
}
function cloneCompareLoadout() {
  if (!state.slots[0].weapon) return;
  state.comparing = true;
  state.slots[1].cls = state.slots[0].weapon.cls;
  state.slots[1].weapon = state.slots[0].weapon;
  state.slots[1].atts = { ...state.slots[0].atts };
  state.slots[1].savedName = null;
  document.getElementById('cmpBtn').classList.add('on');
  document.getElementById('cmpBtn').setAttribute('aria-pressed', 'true');
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
  if (!document.body.classList.contains('is-popout')) renderOverview();
  renderChart();
  renderBTK();
  renderRecoil();
}

function renderOverview() {
  const w1 = selectedWeaponBuild(state.slots[0]);
  const w2 = state.comparing ? selectedWeaponBuild(state.slots[1]) : null;

  const hdr = document.getElementById('wHeader');
  hdr.innerHTML = '';
  const burstBadgeTooltip = burstDetail;
  // Every fire mode the loadout offers, as badges; the selected one is lit and
  // the others switch to it, the same state the Firing Range buttons and X use.
  const mechanismLabel = (mechanism, rounds) =>
    mechanism === 'burst' && rounds ? `${rounds}-Rd Burst` :
    mechanism === 'burst' ? 'Burst' :
    mechanism === 'auto' ? 'Full Auto' :
    mechanism === 'semi' ? 'Semi-Auto' :
    mechanism === 'bolt' ? 'Bolt Action' :
    mechanism === 'pump' ? 'Pump Action' :
    null;
  const appendFireModeBadge = (w, hdr, slotIdx) => {
    if (!w) return;
    const slot = state.slots[slotIdx];
    const modes = rangeFireModes(slot);
    if (modes.length < 2) {
      const label = mechanismLabel(w.fireMode, w.burstRounds);
      if (!label) return;
      const bb = document.createElement('span'); bb.className = 'wbadge-burst'; bb.textContent = label;
      const tooltip = burstBadgeTooltip(w);
      if (tooltip) {
        bb.title = tooltip;
        bb.dataset.tipHtml = statTooltip([{ w, tip: { text: '', rows: burstRows(w) } }]).html;
        bb.setAttribute('aria-label', `${label}. ${tooltip.replace(/\n/g, '. ')}`);
      }
      hdr.appendChild(bb);
      return;
    }
    const current = selectedFireMode(slot.weapon, slot.atts);
    const group = document.createElement('span');
    group.className = 'wbadge-modes';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Fire mode');
    for (const mode of modes) {
      const source = slot.weapon.fireModes?.[mode];
      const label = mechanismLabel(source?.mechanism ?? mode, source?.burstRounds) ?? FIRE_MODE_LABELS[mode];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `wbadge-mode${mode === current ? ' on' : ''}`;
      b.textContent = label;
      b.setAttribute('aria-pressed', String(mode === current));
      // The burst badge carries the burst figures whether or not it is the selected mode.
      const build = mode === current ? w : mode === 'burst' ? applyAttachments(slot.weapon, { ...slot.atts, fireMode: 'burst' }) : null;
      const tooltip = build ? burstBadgeTooltip(build) : '';
      if (tooltip) {
        b.title = tooltip;
        b.dataset.tipHtml = statTooltip([{ w: build, tip: { text: '', rows: burstRows(build) } }]).html;
        b.setAttribute('aria-label', `${label}. ${tooltip.replace(/\n/g, '. ')}`);
      } else if (mode !== current) {
        b.title = `Switch to ${label}`;
      }
      b.addEventListener('click', () => setFireMode(slotIdx, mode));
      group.appendChild(b);
    }
    hdr.appendChild(group);
  };
  const badges = !!(w1 && w2);
  const appendWeaponName = (w, className, hdr) => {
    const s = document.createElement('span');
    s.className = className;
    s.textContent = weaponDisplayLabel(w);
    // Inside the name, so a wrapping header never leaves the badge behind.
    if (badges) s.insertAdjacentHTML('afterbegin', badgeHtml(className === 'wname2' ? 1 : 0));
    s.setAttribute('aria-label', weaponAriaLabel(w));
    s.title = w.description ?? '';
    if (w.description) s.setAttribute('aria-description', w.description);
    hdr.appendChild(s);
  };
  const appendEstimatedBadge = (w, hdr) => {
    if (!w?.estimated) return;
    const badge = document.createElement('span');
    badge.className = 'wbadge-estimated';
    badge.textContent = 'Estimated';
    badge.title = 'Some of this weapon\'s statistics are estimated rather than taken from game data.';
    badge.setAttribute('aria-label', badge.title);
    hdr.appendChild(badge);
  };
  if (w1) {
    appendWeaponName(w1, 'wname', hdr);
    appendEstimatedBadge(w1, hdr);
    const b = document.createElement('span'); b.className = 'wbadge'; b.textContent = w1.cls; hdr.appendChild(b);
    appendFireModeBadge(w1, hdr, 0);
  }
  if (w2) {
    const vs = document.createElement('span'); vs.style.cssText = 'color:var(--muted);margin:0 3px;font-size:12px'; vs.textContent = 'vs'; hdr.appendChild(vs);
    appendWeaponName(w2, 'wname2', hdr);
    appendEstimatedBadge(w2, hdr);
    const b = document.createElement('span'); b.className = 'wbadge'; b.textContent = w2.cls; hdr.appendChild(b);
    appendFireModeBadge(w2, hdr, 1);
  }

  if (!document.getElementById('sGrid').getClientRects().length) return;
  const grid = document.getElementById('sGrid');
  grid.innerHTML = '';
  const fields = [
    // A pellet load shows the whole shell with every pellet hitting; the tooltip adds one pellet.
    { lbl: 'Base Dmg',    compute: w => damagePerShotAtRange(w, 0), unit: 'dmg', fmt: v => v.toFixed(1), higherBetter: true,
      tooltip: w => ((w.pellets ?? 1) > 1
        ? { text: 'Damage per shot at close range, before damage falloff. A shell counts every pellet hitting.', rows: [
          ['Per shell', `${damagePerShotAtRange(w, 0).toFixed(1)} dmg`],
          ['Per pellet', `${damageAtRange(w, 0).toFixed(1)} dmg`],
        ] }
        : 'Damage per shot at close range, before damage falloff.') },
    // Two multipliers in one card, each carrying its own grey ×. Paired stats
    // like this drop the comparison badge — there is no single number to diff.
    { lbl: 'HS Mult',     compute: w => ({ hs: w?._hsMult, limb: w?._limbMult }), unit: '',
      fmt: obj => {
        const cell = v => (v != null ? `${v.toFixed(2)}<span class="sunit">×</span>` : '—');
        return `${cell(obj?.hs)}<span class="sunit"> / </span>${cell(obj?.limb)}`;
      },
      noDiff: true,
      tooltip: 'Headshot and limb (arm, leg, abdomen) damage multipliers.' },
    { lbl: 'Fire Rate',   compute: w => w.fireMode === 'pump' && w.burstRounds > 1 && w.burstBurstsPerMinute ? w.burstRounds * w.burstBurstsPerMinute : w.rpm, unit: 'RPM', fmt: formatInGameRpm,                   higherBetter: true, group: 'combat',
      // One description for both builds in a comparison; only a burst build adds rows.
      tooltip: w => ({ text: 'Rounds per minute (RPM); for a burst weapon, the rate within the burst.', rows: burstRows(w) }) },
    { lbl: 'Bullet Vel',  k: 'bulletVel',                                unit: 'm/s', fmt: v => v ?? '—',                            higherBetter: true, group: 'combat',
      tooltip: 'Muzzle velocity. Faster bullets have less travel time and drop at range, so you lead less.' },
    { lbl: 'Mag Size',    compute: w => (w.pellets ?? 1) > 1 ? { mag: w.mag, pellets: w.pellets } : w.mag, unit: '',
      fmt: v => typeof v === 'number' ? `${v}<span class="sunit">Rds</span>` : `${v.mag}<span class="sunit">shells / </span>${v.pellets}<span class="sunit">pellets</span>`, higherBetter: true,
      tooltip: 'Rounds per magazine. Shotgun cards add the pellets per shell for the selected ammo.' },
    { lbl: 'Tac Reload',  k: 'tacRld',                                   unit: 's',   fmt: v => v != null ? (+v).toFixed(3) : '—',   lowerBetter: true,
      tooltip: w => ({ text: 'Reload time with rounds left in the magazine (tactical), and from empty.', rows: [
        ['Tactical', w.tacRld != null ? `${(+w.tacRld).toFixed(3)}s` : '—'],
        ['Empty', w.emptyRld != null ? `${(+w.emptyRld).toFixed(3)}s` : 'N/A'],
      ] }) },
    { lbl: 'Collateral Mult', k: '_collateralMult',                      unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true,
      tooltip: 'Damage multiplier for bullets that penetrate a target or a thin surface.' },
    { lbl: 'ADS Time',    compute: w => w._adsTimeMs,                    unit: 'ms',  fmt: formatMilliseconds,                 lowerBetter: true, group: 'mobility',
      tooltip: 'Time to aim down sights.' },
    { lbl: 'Strafe Spd',  k: '_adsMoveSpeedMult',                        unit: '×',   fmt: formatMovementMultiplier,      higherBetter: true, group: 'mobility',
      tooltip: 'Movement speed multiplier while ADS.' },
    { lbl: 'DRAW/HOLSTER SPEED', compute: w => ({ draw: w.deployT, holster: w.undeployT }), unit: '',
      fmt: obj => {
        const cell = v => v != null ? `${Math.round(v * 1000)}<span class="sunit">ms</span>` : '—';
        return `${cell(obj?.draw)}<span class="sunit"> / </span>${cell(obj?.holster)}`;
      },
      noDiff: true,
      tooltip: 'Draw / holster time in milliseconds. These are separate weapon settings, not total swap time.' },
    { lbl: 'Sprint Rec',  k: '_sprintRecoveryMs',                        unit: 'ms',  fmt: formatMilliseconds,                 lowerBetter: true,
      tooltip: 'Sprint-to-fire delay: how long after sprinting before you can shoot.' },
    { lbl: 'Recoil/Shot', k: 'recoilV',                                  unit: '°',   fmt: v => v.toFixed(2),                        lowerBetter: true, group: 'recoil',
      tooltip: 'Vertical recoil per shot while ADS. Lower is easier to control.' },
    { lbl: 'Recoil Dir',  k: 'recoilDir',                                unit: '°',   fmt: v => ((-v) >= 0 ? '+' : '') + (-v),       absDiff: true, group: 'recoil',
      tooltip: 'Average horizontal bias of the recoil. Positive pulls right, negative pulls left.' },
    { lbl: 'ADS Spread', compute: w => ({ stand: w.spread.adsStand[0], move: w.spread.adsMove[0] }), unit: '',
      fmt: obj => { const s = obj?.stand != null ? `${obj.stand.toFixed(2)}<span class="sunit">°</span>` : '—'; const m = obj?.move != null ? `${obj.move.toFixed(2)}<span class="sunit">°</span>` : '—'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true, group: 'spread',
      tooltip: 'Minimum ADS spread, standing / moving. Lower is more accurate.' },
    { lbl: 'Hipfire Spread', compute: w => ({ stand: w.spread?.hipStand?.[0], move: w.spread?.hipMove?.[0] }), unit: '',
      fmt: obj => { const s = obj?.stand != null ? `${obj.stand.toFixed(2)}<span class="sunit">°</span>` : '—'; const m = obj?.move != null ? `${obj.move.toFixed(2)}<span class="sunit">°</span>` : '—'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true, group: 'spread',
      tooltip: 'Minimum hipfire spread, standing / moving. Lower is more accurate.' },
    { lbl: '3D/Map Spot', compute: w => ({ spot: w._worldSpot, minimap: w._minimapSpot }), unit: '',
      fmt: obj => { const s = obj && obj.spot > 0 ? `${Math.round(obj.spot)}<span class="sunit">m</span>` : '–'; const m = obj && obj.minimap > 0 ? `${Math.round(obj.minimap)}<span class="sunit">m</span>` : '–'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true,
      tooltip: 'Spot-on-fire range: enemies within it see you in the world / on the minimap when you shoot. "–" means firing never spots you.' },
  ];
  const overviewLabels = {
    'Base Dmg': 'Base Damage',
    'HS Mult': 'HS/Limb Mult',
    'Bullet Vel': 'Bullet Velocity',
    'Mag Size': 'Magazine Size',
    'Strafe Spd': 'ADS Move Speed',
    'Sprint Rec': 'Sprint Recovery',
    'Recoil/Shot': 'Recoil Amount',
    'Recoil Dir': 'Recoil Direction',
    'ADS Spread': 'ADS Spread',
    '3D/Map Spot': '3D/2D Spotting',
  };
  fields.splice(fields.findIndex(f => f.lbl === 'Recoil Dir'), 0, {
    lbl: 'Recoil Variation',
    k: 'recoilVar',
    unit: '\u00b0',
    fmt: v => v.toFixed(1),
    lowerBetter: true,
    group: 'recoil',
    tooltip: 'Horizontal randomness of each shot\'s recoil while ADS. Lower is more predictable.',
  });
  fields.splice(fields.findIndex(f => f.lbl === 'ADS Spread'), 0, {
    lbl: 'Spread Inc/Shot',
    k: 'recoilIncAds',
    unit: '\u00b0',
    fmt: v => v.toFixed(2),
    lowerBetter: true,
    group: 'spread',
    tooltip: 'Bloom added per shot while ADS. Lower keeps sustained fire tighter.',
  });

  const cardValueHtml = f => {
    const getVal = w => {
      let value;
      try { value = f.compute ? f.compute(w) : w?.[f.k]; }
      catch (error) { reportDataError(new Error(`${w?.id} ${f.lbl}: ${error.message}`)); return null; }
      const valid = v => typeof v === 'number' ? Number.isFinite(v)
        : v && typeof v === 'object' ? Object.values(v).every(valid) : v != null;
      return valid(value) ? value : null;
    };
    const isEst = w => f.estFn ? f.estFn(w) : f.est;
    if (!w2 || !state.comparing) {
      const wx = w1 || w2;
      const v = getVal(wx);
      return `<div class="sval c1">${v == null ? '—' : f.fmt(v)}<span class="sunit">${f.unit}</span>${isEst(wx) ? '<span class="sest">est</span>' : ''}</div>`;
    }
    const v1 = w1 ? getVal(w1) : null, v2 = w2 ? getVal(w2) : null;
    let diff = '';
    if (!f.noDiff && typeof v1 === 'number' && typeof v2 === 'number' && v1 !== v2) {
      if (f.absDiff) {
        const delta = Math.round((-v2) - (-v1));
        diff = `<span class="diff" style="background:rgba(122,138,138,.12);color:var(--muted)">${delta > 0 ? '+' : ''}${delta}°</span>`;
      } else if (f.absoluteDelta) {
        const delta = Math.round(v2 - v1);
        const w2better = (f.higherBetter && delta > 0) || (f.lowerBetter && delta < 0);
        diff = `<span class="diff ${w2better ? 'd-up' : 'd-dn'}">${delta > 0 ? '+' : ''}${delta}m</span>`;
      } else if (v1 !== 0 && v2 !== 0 && Number.parseFloat(f.fmt(v1)) !== 0 && Number.parseFloat(f.fmt(v2)) !== 0) {
        const pct = Math.round(Math.abs(v2 - v1) / Math.abs(v1) * 100);
        const w2better = (f.higherBetter && v2 > v1) || (f.lowerBetter && v2 < v1);
        // Sign shows the direction the raw number moved; color shows whether
        // that move is an improvement. A faster ADS time is "-12%" in green.
        const sign = v2 > v1 ? '+' : '-';
        diff = `<span class="diff ${w2better ? 'd-up' : 'd-dn'}">${sign}${pct}%</span>`;
      }
    }
    const est1 = w1 ? isEst(w1) : false, est2 = w2 ? isEst(w2) : false;
    return `<div class="scmp"><div class="scmp-row"><span class="sval c1">${v1 != null ? f.fmt(v1) : '—'}<span class="sunit">${f.unit}</span>${est1 ? '<span class="sest">est</span>' : ''}</span></div><div class="scmp-row"><span class="sval c2">${v2 != null ? f.fmt(v2) : '—'}<span class="sunit">${f.unit}</span>${est2 ? '<span class="sest">est</span>' : ''}</span>${diff}</div></div>`;
  };

  // Group the stat cards into labeled, color-accented sections for scannability.
  const SEC_OF = {
    'Base Dmg': 'combat', 'HS Mult': 'combat', 'Fire Rate': 'combat', 'Bullet Vel': 'combat',
    'Mag Size': 'ammo', 'Tac Reload': 'ammo', 'Collateral Mult': 'ammo',
    'ADS Time': 'mobility', 'Strafe Spd': 'mobility', 'DRAW/HOLSTER SPEED': 'mobility', 'Sprint Rec': 'mobility',
    'Recoil/Shot': 'recoil', 'Recoil Variation': 'recoil', 'Recoil Dir': 'recoil',
    'Spread Inc/Shot': 'spread', 'ADS Spread': 'spread', 'Hipfire Spread': 'spread',
    '3D/Map Spot': 'conceal',
  };
  // Split the cards across two rows rather than
  // grouping by theme alone, which left the first row noticeably longer.
  const STAT_ROWS = [
    [
      { key: 'combat',   label: 'Combat',      color: '#c9a227' },
      { key: 'mobility', label: 'Mobility',    color: '#4f9c98' },
      { key: 'conceal',  label: 'Concealment', color: '#7f9a9a' },
    ],
    [
      { key: 'ammo',     label: 'Ammo',        color: '#78a840' },
      { key: 'recoil',   label: 'Recoil',      color: '#d8704a' },
      { key: 'spread',   label: 'Spread',      color: '#4d94d0' },
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
      // Drives the group's flex basis and grow factor; see .sgroup in the
      // stylesheet. Spare row width splits by card count, so cards stay a
      // uniform width instead of the smallest group getting the widest cards.
      block.style.setProperty('--n', String(secFields.length));
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
        // A tooltip can depend on the build; with two weapons each gets its rows under its name.
        if (typeof f.tooltip === 'function') {
          const { text, html } = statTooltip([w1, w2].filter(Boolean).map(w => ({ w, tip: f.tooltip(w) })));
          if (text) { card.title = text; card.dataset.tipHtml = html; }
        } else if (f.tooltip) card.title = f.tooltip;
        card.innerHTML = `<div class="slbl">${overviewLabels[f.lbl] ?? f.lbl}</div>` + cardValueHtml(f);
        sg.appendChild(card);
      });
      block.appendChild(sg);
      row.appendChild(block);
    });
    grid.appendChild(row);
  }

  renderWeaponAttributes(grid, state, calculateWeaponAttributes);

}

// ── CHART ─────────────────────────────────────────────────────────────────────

function setChartMode(m) {
  state.chart.mode = m;
  const isTtk = m === 'ttk';
  if (!isTtk) {
    state.chart.showAds = false;
    state.chart.showVel = false;
  }
  applyChartStateToDom();
  renderChart();
  renderBTK();
}
function toggleAdsToggle() {
  state.chart.showAds = !state.chart.showAds;
  applyChartStateToDom();
  renderChart();
  renderBTK();
}
function toggleVelToggle() {
  state.chart.showVel = !state.chart.showVel;
  applyChartStateToDom();
  renderChart();
  renderBTK();
}
function setBtkHS(n) { state.chart.btkHS = n; renderChart(); renderBTK(); }

const damageHeadroomMask = {
  id: 'damage-headroom-mask',
  beforeDatasetsDraw(chart) {
    if (chart.options.scales?.y?.max !== 105) return;
    const { chartArea, ctx, scales } = chart;
    const y100 = scales.y?.getPixelForValue(100);
    if (!chartArea || !Number.isFinite(y100) || y100 <= chartArea.top) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, Math.max(0, y100 - chartArea.top + 1));
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(40,48,48,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y100);
    ctx.lineTo(chartArea.right, y100);
    ctx.stroke();
    ctx.restore();
  },
};

// The Soldier Target's distance as a dashed line with each weapon's value
// there, so the chart reads at the range the plot is showing.
const distanceMarker = {
  id: 'distance-marker',
  afterDatasetsDraw(chart) {
    if (!isTargetGeometry()) return;
    const distance = state.recoil.distance;
    const labels = chart.data.labels ?? [];
    if (!Number.isFinite(distance) || distance > labels.length - 1) return;
    const { chartArea, ctx, scales } = chart;
    const px = scales.x?.getPixelForValue(distance);
    if (!chartArea || !Number.isFinite(px) || px < chartArea.left || px > chartArea.right) return;
    const { mode } = state.chart;
    const lines = [{ text: `${distance} m`, color: '#dde3e3' }];
    for (const ds of chart.data.datasets) {
      if (!ds._weapon || ds.isBand || ds.isBaseline) continue;
      const v = ds.data[distance];
      if (!Number.isFinite(v)) continue;
      const text = mode === 'btk' ? `${v} BTK` : mode === 'ttk' ? fmtTTK(Math.round(v)) : `${v.toFixed(1)} dmg`;
      lines.push({ text, color: ds.borderColor });
    }
    ctx.save();
    const x = Math.round(px) + 0.5;
    ctx.strokeStyle = 'rgba(221,227,227,.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const lineHeight = 13, pad = 5;
    const boxW = Math.ceil(Math.max(...lines.map(l => ctx.measureText(l.text).width))) + pad * 2;
    const boxH = lines.length * lineHeight + pad * 2;
    // Beside the line, flipping to its left where the right edge would clip it.
    const left = px + 6 + boxW > chartArea.right ? px - 6 - boxW : px + 6;
    const top = chartArea.top + 4;
    ctx.fillStyle = 'rgba(12,14,14,.85)';
    ctx.fillRect(left, top, boxW, boxH);
    ctx.strokeStyle = '#283030';
    ctx.strokeRect(Math.round(left) + 0.5, Math.round(top) + 0.5, boxW - 1, boxH - 1);
    lines.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, left + pad, top + pad + i * lineHeight);
    });
    ctx.restore();
  },
};

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
  if (!document.getElementById('dmgChart').clientWidth) return;
  scheduleUrlSync();

  const w1 = selectedWeaponBuild(state.slots[0]);
  const w2 = state.comparing ? selectedWeaponBuild(state.slots[1]) : null;
  const { mode, btkHS, showAds, showVel } = state.chart;
  const mr = maxRange([w1, w2]);
  const labels = []; for (let r = 0; r <= mr; r++) labels.push(r);
  const ctx = document.getElementById('dmgChart');

  const legEl = document.getElementById('chartLegend');
  if (legEl) {
    const badges = !!(w1 && w2);
    let legHtml = [[w1, '#c9a227', 0], [w2, '#4d94d0', 1]].filter(([w]) => w)
      .map(([w, col, i]) => `<div class="rc-legend-item"><div class="rc-legend-dot" style="background:${col}"></div><span>${badges ? badgeHtml(i) : ''}${chartWeaponDisplayLabel(w)}</span></div>`).join('');
    legEl.innerHTML = legHtml;
  }

  const missingDamage = [w1, w2].some(weapon => weapon && (!Array.isArray(weapon.dmg) || weapon.dmg.length === 0
    || (mode !== 'dmg' && (!Number.isFinite(weapon._hsMult) || !Number.isFinite(weapon._limbMult)))
    || (mode === 'ttk' && !Number.isFinite(weaponRpm(weapon)))));
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
      label: `${chartWeaponDisplayLabel(w)} (limbs)`,
      data: labels.map(r => getBTKWithHits(w, r, btkHS, limbMult(w))),
      borderColor: 'transparent', backgroundColor: fillColor,
      borderWidth: 0, pointRadius: 0, tension: 0, stepped: 'before',
      fill: '-1', isBand: true, _weaponSlot: slot, _weapon: w,
    });
    const datasets = [];
    if (btkHS > 0 && w1) datasets.push(btkDs(w1, 'rgba(201,162,39,0.28)', `${chartWeaponDisplayLabel(w1)} (0 HS)`, 1, 0, true));
    if (btkHS > 0 && w2) datasets.push(btkDs(w2, 'rgba(77,148,208,0.28)', `${chartWeaponDisplayLabel(w2)} (0 HS)`, 2, 0, true));
    if (w1) {
      datasets.push(btkDs(w1, '#c9a227', chartWeaponDisplayLabel(w1), 1));
      if (limbMult(w1) !== 1) datasets.push(bandDs(w1, 'rgba(201,162,39,0.16)', 1));
    }
    if (w2) {
      datasets.push(btkDs(w2, '#4d94d0', chartWeaponDisplayLabel(w2), 2));
      if (limbMult(w2) !== 1) datasets.push(bandDs(w2, 'rgba(77,148,208,0.16)', 2));
    }
    dashOverlap(datasets);
    const yMax = Math.max(9, ...datasets.flatMap(ds => ds.data));
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets }, plugins: [damageHeadroomMask, distanceMarker, chartTableHover],
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
            const displayName = chartWeaponDisplayLabel(w);
            if (limb === chest) return `${displayName}: ${chest} BTK`;
            return `${displayName}: ${chest}–${limb} BTK chest–limbs`;
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
      const firingTtk = getTTK(w, btk);
      if (firingTtk == null) return null;
      const flightTime = showVel ? flightTimeAtDistance(w._projectileModel, r) : 0;
      if (flightTime == null) return null;
      return firingTtk + (showAds ? (w._adsTimeMs ?? 0) : 0) + flightTime * 1000;
    };
    const fmtTtkAt = value => value == null ? fmtTTK(null) : fmtTTK(Math.round(value));
    const ttkDs = (w, color, label, zoneMult = 1, band = false) => ({
      label, data: labels.map(r => ttkAt(w, r, zoneMult)),
      borderColor: band ? 'transparent' : color, backgroundColor: band ? color : 'transparent',
      borderWidth: band ? 0 : 2, pointRadius: 0, tension: 0, stepped: 'before',
      fill: band ? '-1' : false, isBand: band, _weapon: w,
    });
    const datasets = [];
    if (w1) {
      datasets.push(ttkDs(w1, '#c9a227', chartWeaponDisplayLabel(w1)));
      if (limbMult(w1) !== 1) datasets.push(ttkDs(w1, 'rgba(201,162,39,0.16)', `${chartWeaponDisplayLabel(w1)} (limbs)`, limbMult(w1), true));
    }
    if (w2) {
      datasets.push(ttkDs(w2, '#4d94d0', chartWeaponDisplayLabel(w2)));
      if (limbMult(w2) !== 1) datasets.push(ttkDs(w2, 'rgba(77,148,208,0.16)', `${chartWeaponDisplayLabel(w2)} (limbs)`, limbMult(w2), true));
    }
    dashOverlap(datasets);
    const allVals = datasets.flatMap(d => d.data).filter(v => v > 0);
    const yMax = allVals.length ? Math.ceil(Math.max(...allVals) / 100) * 100 + 100 : 1000;
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets }, plugins: [damageHeadroomMask, distanceMarker, chartTableHover],
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
              const displayName = chartWeaponDisplayLabel(w);
              return `${displayName}: ${fmtTtkAt(i.raw)}–${fmtTtkAt(ttkAt(w, i.dataIndex, limbMult(w)))} chest–limbs`;
            }
            const displayName = chartWeaponDisplayLabel(w);
            const additions = [];
            if (showAds && w._adsTimeMs) additions.push(`${formatMilliseconds(w._adsTimeMs)}ms ADS`);
            if (showVel) additions.push(`${Math.round((flightTimeAtDistance(w._projectileModel, i.dataIndex) ?? 0) * 1000)}ms flight`);
            if (additions.length) return `${displayName}: ${fmtTtkAt(i.raw)} incl. ${additions.join(' + ')}`;
            return `${displayName}: ${fmtTtkAt(i.raw)}`;
          },
        } } },
        scales: {
          x: chartXAxis(mr),
          y: { min: 0, max: yMax, title: { display: true, text: `${['Time to Kill', showAds && 'ADS', showVel && 'Flight'].filter(Boolean).join(' + ')} (ms)`, color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a', stepSize: 100 }, grid: { color: 'rgba(40,48,48,0.6)' } },
        },
      },
    });
    return;
  }

  // Damage chart
  const dmgAt = (w, r, zoneMult = 1) => Math.min(100, damagePerShotAtRange(w, r) * zoneMult);
  // Distinct ranges with different damage encode gradual falloff. This includes
  // buckshot; slug and rifle curves use repeated ranges for instant tier drops.
  const steppedFor = w => w.dmg.some((point, index, curve) => index > 0
    && point.r > curve[index - 1].r && point.d !== curve[index - 1].d) ? false : 'before';
  const buildDs = (w, color, label) => ({
    label, data: labels.map(r => +dmgAt(w, r).toFixed(2)),
    borderColor: color, backgroundColor: 'transparent',
    borderWidth: 2, pointRadius: 0, tension: 0, stepped: steppedFor(w), _weapon: w,
  });
  // Limb band: soft fill between the chest damage curve and the limb damage curve.
  const limbDs = (w, fillColor) => ({
    label: `${chartWeaponDisplayLabel(w)} (limbs)`,
    data: labels.map(r => +dmgAt(w, r, limbMult(w)).toFixed(2)),
    borderColor: 'transparent', backgroundColor: fillColor,
    borderWidth: 0, pointRadius: 0, tension: 0, stepped: steppedFor(w),
    fill: '-1', isBand: true, _weapon: w,
  });
  const datasets = [];
  if (w1) {
    datasets.push(buildDs(w1, '#c9a227', chartWeaponDisplayLabel(w1)));
    if (limbMult(w1) !== 1) datasets.push(limbDs(w1, 'rgba(201,162,39,0.16)'));
  }
  if (w2) {
    datasets.push(buildDs(w2, '#4d94d0', chartWeaponDisplayLabel(w2)));
    if (limbMult(w2) !== 1) datasets.push(limbDs(w2, 'rgba(77,148,208,0.16)'));
  }
  dashOverlap(datasets);
  const dmgYMax = damageYMax([w1, w2]);
  updateDmgChart(ctx, {
    type: 'line', data: { labels, datasets }, plugins: [damageHeadroomMask, distanceMarker, chartTableHover],
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      layout: { padding: { bottom: 0 } },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false,
        filter: i => !i.dataset.isBand,
        callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          // Damage view: damage only. Bullet and time counts live in their own views.
          label: i => {
            const r = i.dataIndex; const w = i.dataset._weapon;
            const d = w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r);
            // Uncapped: damage above 100 matters for what is left after penetration.
            const line = `${chartWeaponDisplayLabel(w)}: ${d.toFixed(1)} dmg`;
            if (limbMult(w) === 1) return line;
            const dl = d * limbMult(w), dh = d * zoneMultiplierForWeapon(w, 'head');
            return [line, `  limbs ${dl.toFixed(1)} · head ${dh.toFixed(1)}`];
          },
        },
      } },
      scales: {
        x: chartXAxis(mr),
        y: { min: 0, max: dmgYMax, title: { display: true, text: 'Damage per shot', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a' }, grid: { color: 'rgba(40,48,48,0.6)' }, afterBuildTicks: scale => {
          scale.ticks = scale.ticks.filter(t => Number(t.value) <= 100);
          if (dmgYMax === 105 && !scale.ticks.some(t => Number(t.value) === 100)) scale.ticks.push({ value: 100 });
          scale.ticks.sort((a, b) => Number(a.value) - Number(b.value));
        } },
      },
    },
  });
}

function renderBTK() {
  if (!document.getElementById('btkArea').getClientRects().length) return;
  const w1 = selectedWeaponBuild(state.slots[0]);
  const w2 = state.comparing ? selectedWeaponBuild(state.slots[1]) : null;
  const { btkHS, showAds, showVel } = state.chart;
  const ranges = btkRanges(w1, w2);
  const ttkHdr = ['TTK', showAds && 'ADS', showVel && 'Flight'].filter(Boolean).join('+');
  const ttkAt = (w, range, btk) => {
    const firingTtk = getTTK(w, btk);
    if (firingTtk == null) return null;
    const flightTime = showVel ? flightTimeAtDistance(w._projectileModel, range) : 0;
    if (flightTime == null) return null;
    return firingTtk + (showAds ? (w._adsTimeMs ?? 0) : 0) + flightTime * 1000;
  };
  const fmtTtkAt = value => value == null ? fmtTTK(null) : fmtTTK(Math.round(value));
  let html = '<table class="btk-tbl"><thead>';
  // With two weapons a row names each over its three columns; btk-col-2 opens
  // weapon 2's group so the stylesheet can rule it off.
  if (w1 && w2) {
    const tintNote = ' title="Tinted cells mark the faster kill at that range"';
    html += '<tr class="btk-grp"><th></th>'
      + `<th colspan="3" class="btk-grp-1"${tintNote}>${badgeHtml(0)}${escapeHtml(chartWeaponDisplayLabel(w1))}</th>`
      + `<th colspan="3" class="btk-grp-2"${tintNote}>${badgeHtml(1)}${escapeHtml(chartWeaponDisplayLabel(w2))}</th></tr>`;
  }
  html += '<tr><th>RANGE</th>';
  if (w1) html += `<th style="color:var(--accent)">DMG</th><th style="color:var(--accent)">BTK</th><th style="color:var(--accent)">${ttkHdr}</th>`;
  const col2 = w1 && w2 ? ' btk-col-2' : '';
  if (w2) html += `<th${w1 ? ' class="btk-col-2"' : ''} style="color:var(--accent2)">DMG</th><th style="color:var(--accent2)">BTK</th><th style="color:var(--accent2)">${ttkHdr}</th>`;
  html += '</tr></thead><tbody>';
  // Per-shot body damage, matching the damage chart tooltip (pellet loads show the full shot).
  const dmgTxt = (w, r) => {
    const d = w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r);
    return Number.isFinite(d) ? d.toFixed(1) : '—';
  };
  // Each cell shows chest–limb ranges when the limb multiplier changes the outcome.
  const cells = (w, r) => {
    const b = getBTKWithHits(w, r, btkHS), bl = getBTKWithHits(w, r, btkHS, limbMult(w));
    if (!Number.isFinite(b) || !Number.isFinite(bl)) return { bTxt: '—', tTxt: '—', chestBtk: null, chestTtk: null };
    const bTxt = bl !== b ? `${b}–${bl}` : `${b}`;
    const chestTtk = ttkAt(w, r, b);
    const tTxt = bl !== b
      ? `${fmtTtkAt(chestTtk).replace(/ms$/, '')}–${fmtTtkAt(ttkAt(w, r, bl))}`
      : fmtTtkAt(chestTtk);
    return { bTxt, tTxt, chestBtk: b, chestTtk: chestTtk == null ? null : Math.round(chestTtk) };
  };
  // With two weapons, the faster chest-hit kill at each range tints that weapon's
  // TTK cell. Its BTK cell is tinted too when it also needs fewer bullets, so a
  // tint never points at the slower kill.
  const winners = (c1, c2) => {
    if (c1.chestTtk == null || c2.chestTtk == null || c1.chestTtk === c2.chestTtk) return { ttk: 0, btk: 0 };
    const ttk = c1.chestTtk < c2.chestTtk ? 1 : 2;
    const fewer = c1.chestBtk === c2.chestBtk ? 0 : c1.chestBtk < c2.chestBtk ? 1 : 2;
    return { ttk, btk: fewer === ttk ? ttk : 0 };
  };
  let prev1 = null, prev2 = null;
  ranges.forEach(r => {
    html += `<tr data-range="${r}"><td class="rng">${r}m</td>`;
    const c1 = w1 && cells(w1, r), c2 = w2 && cells(w2, r);
    const win = c1 && c2 ? winners(c1, c2) : { ttk: 0, btk: 0 };
    const tint = (n, which) => (win[which] === n ? ` win${n}` : '');
    if (w1) { const { bTxt, tTxt } = c1; const chg = prev1 !== null && bTxt !== prev1; html += `<td class="tv">${dmgTxt(w1, r)}</td><td class="bv${chg ? ' bchg' : ''}${tint(1, 'btk')}">${bTxt}</td><td class="tv${tint(1, 'ttk')}">${tTxt}</td>`; prev1 = bTxt; }
    if (w2) { const { bTxt, tTxt } = c2; const chg = prev2 !== null && bTxt !== prev2; html += `<td class="tv${col2}">${dmgTxt(w2, r)}</td><td class="bv${chg ? ' bchg2' : ''}${tint(2, 'btk')}">${bTxt}</td><td class="tv${tint(2, 'ttk')}">${tTxt}</td>`; prev2 = bTxt; }
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('btkArea').innerHTML = html;
  spaceBtkColumns();
  syncDistanceMarker();
}

/** Mark the Soldier Target's distance on the damage chart and the BTK table:
 *  the table row is the last range at or inside it. */
function syncDistanceMarker() {
  dmgChart?.update('none');
  const at = isTargetGeometry() ? btkRowAtRange(state.recoil.distance) : null;
  document.querySelectorAll('#btkArea tbody tr[data-range]').forEach(row => row.classList.toggle('at-distance', row === at));
}
/** The kill-table row that covers a range: the last one at or inside it. */
function btkRowAtRange(range) {
  let at = null;
  if (!Number.isFinite(range)) return at;
  for (const row of document.querySelectorAll('#btkArea tbody tr[data-range]')) {
    const r = Number(row.dataset.range);
    if (r <= range && (!at || r > Number(at.dataset.range))) at = row;
  }
  return at;
}

// ── CHART ↔ TABLE HOVER ───────────────────────────────────────────────────────
// The chart and the kill table are two views of the same ranges, so pointing
// at one shows the same range in the other. Classes and the chart's own active
// state only: hovering never re-renders either.
function setBtkHoverRow(row) {
  document.querySelectorAll('#btkArea tbody tr.is-hover').forEach(r => { if (r !== row) r.classList.remove('is-hover'); });
  row?.classList.add('is-hover');
}
/** The range under the chart pointer, in the tooltip's own mode. A plugin
 *  rather than onHover: Chart.js calls onHover only inside the plot area, so
 *  it could not clear the row when the pointer moves onto the axes, where the
 *  tooltip closes. */
const chartTableHover = {
  id: 'chart-table-hover',
  afterEvent(chart, { event, inChartArea }) {
    if (event.type === 'mouseout' || !inChartArea) { setBtkHoverRow(null); return; }
    if (event.type !== 'mousemove') return;
    const items = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, false);
    setBtkHoverRow(items.length ? btkRowAtRange(items[0].index) : null);
  },
};
/** Open the chart's tooltip at a range, as if the pointer were there; null clears it. */
function showChartAtRange(range) {
  if (!dmgChart) return;
  const last = (dmgChart.data.labels?.length ?? 0) - 1;
  const elements = range == null || range > last ? [] : dmgChart.data.datasets
    .map((ds, datasetIndex) => ({ ds, datasetIndex }))
    .filter(({ ds, datasetIndex }) => ds._weapon && !ds.isBand && !ds.isBaseline && dmgChart.isDatasetVisible(datasetIndex))
    .map(({ datasetIndex }) => ({ datasetIndex, index: range }));
  const point = elements.length ? dmgChart.getDatasetMeta(elements[0].datasetIndex).data[range] : null;
  dmgChart.setActiveElements(elements);
  dmgChart.tooltip.setActiveElements(elements, { x: point?.x ?? 0, y: point?.y ?? 0 });
  dmgChart.update('none');
}
function bindChartTableHover() {
  document.getElementById('dmgChart')?.addEventListener('mouseleave', () => setBtkHoverRow(null));
  const area = document.getElementById('btkArea');
  if (!area) return;
  // Bound once on the container, since the table is rebuilt on every render.
  let hovered = null;
  area.addEventListener('mouseover', e => {
    const row = e.target.closest?.('tbody tr[data-range]') ?? null;
    if (row === hovered) return;
    hovered = row;
    setBtkHoverRow(row);
    showChartAtRange(row ? Number(row.dataset.range) : null);
  });
  area.addEventListener('mouseleave', () => {
    if (!hovered) return;
    hovered = null;
    setBtkHoverRow(null);
    showChartAtRange(null);
  });
}

// Give every BTK column its longest value plus an equal share of the spare width,
// so the gap after each column's widest text is the same. CSS table layout shares
// spare width by content size instead, and calc() column widths collapse to equal widths.
let btkResizeObserver = null;
let btkSpacedWidth = null;
function spaceBtkColumns() {
  const area = document.getElementById('btkArea');
  const table = area.querySelector('table');
  if (!table) return;
  if (!btkResizeObserver && typeof ResizeObserver !== 'undefined') {
    btkResizeObserver = new ResizeObserver(() => {
      if (area.clientWidth !== btkSpacedWidth) spaceBtkColumns();
    });
    btkResizeObserver.observe(area);
  }
  table.querySelector('colgroup')?.remove();
  table.style.tableLayout = '';
  table.style.width = 'max-content';
  // The column row only: the weapon row's spanning cells are not columns.
  const headers = [...table.querySelectorAll('thead tr:last-child th')];
  const natural = headers.map(th => th.getBoundingClientRect().width);
  table.style.width = '';
  btkSpacedWidth = area.clientWidth;
  const spare = btkSpacedWidth - natural.reduce((sum, w) => sum + w, 0);
  if (!headers.length || spare <= 0) return; // Narrow panel: keep the automatic layout.
  const colgroup = document.createElement('colgroup');
  natural.forEach(w => {
    const col = document.createElement('col');
    col.style.width = `${w + spare / headers.length}px`;
    colgroup.appendChild(col);
  });
  table.prepend(colgroup);
  table.style.tableLayout = 'fixed';
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
      // Clip to the displayed shots before expanding so a huge endpoint cannot stall the page.
      for (let v = Math.max(1, Math.min(a, b)); v <= Math.min(shotCount, Math.max(a, b)); v++) out.push(v);
      return;
    }
    const v = Math.round(Number(part));
    if (Number.isFinite(v)) out.push(v);
  });
  return out.filter(v => v >= 1 && v <= shotCount);
}
/**
 * Named preset bubble samples include Shot 1 to show first-shot spread,
 * especially useful for movement and hipfire. Spread then climbs fast over the next few
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
    case 'all':    return Array.from({ length: Math.max(0, shotCount) }, (_, i) => i + 1);
    case 'early':  return [1, 2, 3, 4, 5, 6].filter(v => v <= shotCount);
    case 'custom': return parseSpreadBulletSpec(document.getElementById('rcSpreadShotsInput')?.value ?? '', shotCount);
    default: {
      const growth = spreadGrowthCurve(shotCount);
      return shotCount >= 1 ? [1, ...growth] : growth;
    }
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
  const readout = document.getElementById('rcCompReadout');
  const inRange = state.recoil.view === 'range';
  if (range) {
    range.value = level; paintRange(range);
    range.disabled = inRange;
    range.title = inRange
      ? 'In the Firing Range your mouse is the recoil control.'
      : 'How much of the expected recoil the shooter pulls back down. 0% is no compensation.';
  }
  if (readout) readout.textContent = inRange ? 'mouse' : `${level}%`;
}
function syncCompensationLevel() {
  const el = document.getElementById('rcCompRange');
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
function toggleRecoilCrosshair() {
  state.recoil.crosshair = !state.recoil.crosshair;
  renderRecoil();
}
function setRecoilAim(aim) {
  state.recoil.aim = aim === 'hip' ? 'hip' : 'ads';
  setSimContext({ aimState: state.recoil.aim });
  renderRecoil();
}
function setRecoilStance(stance) {
  state.recoil.stance = stance === 'move' || stance === 'mount' ? stance : 'stand';
  setSimContext({ stanceState: state.recoil.stance });
  renderRecoil();
}
function applyViewLayers(view) {
  const saved = state.recoil.savedLayers[view];
  if (saved) state.recoil.layers = { ...saved };
}
/**
 * The soldier PNG is only fetched once the target view is actually shown, so
 * every route into that view has to ask for it: the tab, and a link or popout
 * that lands there directly without ever passing through setRecoilView().
 */
function requestTargetImage() {
  if (!document.getElementById('rcMain').clientWidth) return;
  whenTargetImageReady().then(() => {
    if (isTargetGeometry()) renderRecoil();
  });
}
function setRecoilView(view) {
  const next = view === 'target' || view === 'range' ? view : 'angle';
  if (state.recoil.view === next) return;
  recoilTouchControls?.cancel();
  firingRange?.setActive(false);
  // Each view remembers its own overlays, so the target view can start without
  // the scatter cloud without discarding the angle plot's setup.
  state.recoil.savedLayers[state.recoil.view] = { ...state.recoil.layers };
  state.recoil.view = next;
  applyViewLayers(next);
  const compareChanged = syncRangeCompare();
  // Flag the swap so the plot and its stats fade in together, which reads as
  // one chart changing lens rather than two unrelated panels appearing.
  ['rcPlotColumn', 'rcStats'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('rc-view-swap');
    void el.offsetWidth;
    el.classList.add('rc-view-swap');
  });
  if (compareChanged) { renderSidebar(); renderStats(); } else renderRecoil();
  if (next !== 'angle') requestTargetImage();
}
/** Hold the compare loadout aside while the range view is up, and bring it
 *  back when the view leaves. Returns whether `comparing` changed. */
function syncRangeCompare() {
  const isRange = state.recoil.view === 'range';
  let changed = false;
  if (isRange && state.comparing) { state.comparing = false; state.comparingHeld = true; changed = true; }
  else if (!isRange && state.comparingHeld) { state.comparing = true; state.comparingHeld = false; changed = true; }
  const btn = document.getElementById('cmpBtn');
  if (btn) {
    btn.classList.toggle('on', state.comparing || state.comparingHeld);
    btn.setAttribute('aria-pressed', String(state.comparing || state.comparingHeld));
    btn.disabled = isRange;
    btn.title = isRange
      ? (state.comparingHeld ? 'Only Weapon 1 fires on the Firing Range. Your compare loadout returns when you leave it.' : 'Only Weapon 1 fires on the Firing Range.')
      : '';
  }
  const section = document.getElementById('cmpSection');
  if (section) section.style.display = state.comparing ? 'block' : 'none';
  return changed;
}
/**
 * Soldier Target Ctrl+click places the aim point and fires a fresh sample.
 * Angle Plot only redraws the sample, keeping its origin at (0, 0).
 */
function fireAtAimPoint(worldX, worldY) {
  state.recoil.customAim = { x: worldX, y: worldY };
  state.recoil.targetAim = 'custom';
  redrawRecoilSample();
}
function redrawRecoilSample() {
  if (state.recoil.view === 'range') { firingRange?.reset(); return; }
  const seed = (Math.random() * 0x100000000) >>> 0;
  state.recoil.refSeed = seed === state.recoil.refSeed ? (seed + 1) >>> 0 : seed;
  renderRecoil();
}
function currentAimOffset() {
  return targetAimOffset(state.recoil.targetAim, state.recoil.customAim);
}
function canvasToWorld(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const { PW, PH } = plotBox();
  const u = ((clientX - rect.left) * plotCanvasSize(canvas).width / rect.width - PLOT_PAD.l) / PW;
  const v = ((clientY - rect.top) * plotCanvasSize(canvas).height / rect.height - PLOT_PAD.t) / PH;
  const view = recoilViewport();
  return {
    x: view.xCenter + (u - 0.5) * view.xSpan,
    y: view.yCenter + (0.5 - v) * view.ySpan,
  };
}
function snapTargetDistance(distance) {
  const clamped = Math.max(TARGET_DISTANCE_MIN, Math.min(TARGET_DISTANCE_MAX,
    Number.isFinite(distance) ? distance : TARGET_DEFAULT_DISTANCE));
  const step = clamped <= 20 ? 1 : clamped <= 60 ? 2 : clamped <= 150 ? 5 : 10;
  return Math.max(TARGET_DISTANCE_MIN, Math.min(TARGET_DISTANCE_MAX, Math.round(clamped / step) * step));
}
/** Every distance the Soldier Target slider can select; the slider indexes this list so each key press moves one stop. */
const TARGET_DISTANCE_LADDER = Array.from({ length: TARGET_DISTANCE_MAX - TARGET_DISTANCE_MIN + 1 }, (_, i) => TARGET_DISTANCE_MIN + i)
  .filter(d => snapTargetDistance(d) === d);
function targetDistanceIndex(distance) {
  let best = 0;
  TARGET_DISTANCE_LADDER.forEach((d, i) => { if (Math.abs(d - distance) < Math.abs(TARGET_DISTANCE_LADDER[best] - distance)) best = i; });
  return best;
}
/** One step along the distance ladder, from the wheel. */
function stepTargetDistance(dir) {
  if (!isTargetGeometry()) return;
  const index = targetDistanceIndex(state.recoil.distance) + dir;
  const next = TARGET_DISTANCE_LADDER[Math.max(0, Math.min(TARGET_DISTANCE_LADDER.length - 1, index))];
  if (next === state.recoil.distance) return;
  if (state.recoil.view === 'range') firingRange?.clear();
  state.recoil.distance = next;
  renderRecoil();
}
function syncTargetDistance() {
  if (isTargetGeometry() && magnificationOverride() == null && !equippedSight()) {
    setMagnification(currentMagnification());
  }
  const el = document.getElementById('rcDistanceRange');
  const raw = +(el?.value ?? 0);
  const next = isTargetGeometry()
    ? TARGET_DISTANCE_LADDER[Math.max(0, Math.min(TARGET_DISTANCE_LADDER.length - 1, Math.round(raw)))]
    : Math.max(TARGET_DISTANCE_MIN, Math.min(TARGET_DISTANCE_MAX, Math.round(Number.isFinite(raw) ? raw : TARGET_DEFAULT_DISTANCE)));
  // Range hits were scored at the old distance, so the board starts over.
  if (state.recoil.view === 'range' && next !== state.recoil.distance) firingRange?.clear();
  state.recoil.distance = next;
  renderRecoil();
}
function syncZoomFromSlider() {
  const el = document.getElementById('rcZoomRange');
  const raw = +(el?.value ?? 50);
  if (isTargetGeometry()) {
    setMagnificationIndex(raw);
  } else {
    // scaleH is a half-span in degrees, so a wider span means less zoom.
    const pct = Math.max(0, Math.min(100, raw)) / 100;
    state.recoil.scaleH = RECOIL_SCALE_MAX - pct * (RECOIL_SCALE_MAX - RECOIL_SCALE_MIN);
  }
  scheduleRecoilPlot();
}
/** The zoom slider indexes the magnification ladder in target view, percent in angle view. */
function zoomSliderBounds() {
  return isTargetGeometry()
    ? { min: 0, max: SCOPE_MAGNIFICATIONS.length - 1, step: 1, value: magnificationIndex(currentMagnification()) }
    : { min: 0, max: 100, step: 1, value: (RECOIL_SCALE_MAX - state.recoil.scaleH) / (RECOIL_SCALE_MAX - RECOIL_SCALE_MIN) * 100 };
}
/** Paint the filled portion of a range input so every slider reads the same. */
function paintRange(el) {
  if (!el) return;
  const min = +el.min || 0;
  const max = +el.max || 100;
  const pct = max === min ? 0 : ((+el.value - min) / (max - min)) * 100;
  el.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
}
function setRecoilPlatform(platform) {
  state.recoil.platform = platform === 'console' ? 'console' : 'pc';
  renderRecoil();
}
function cycleTargetZero() {
  const zeroes = [100, 200, 300, 400, 500];
  const current = zeroes.indexOf(state.recoil.zeroDistance);
  if (state.recoil.view === 'range') firingRange?.clear();
  state.recoil.zeroDistance = zeroes[(current + 1) % zeroes.length];
  renderRecoil();
}
function cmAtDistance(angleDeg, distanceM = state.recoil.distance) {
  return Math.tan(angleDeg * Math.PI / 180) * distanceM * 100;
}
function plotBox() {
  const canvas = document.getElementById('rcMain');
  const { width: cw, height: ch } = plotCanvasSize(canvas);
  return { PW: cw - PLOT_PAD.l - PLOT_PAD.r, PH: ch - PLOT_PAD.t - PLOT_PAD.b };
}
// Base framing only recalculates for range/zeroing changes. Weapon selection
// must not yank the user's target-view zoom or pan out from under them.
let targetBaseFrame = null;
let targetBaseFrameKey = '';
let targetDisplaySettingsLoaded = false;

function computeTargetBaseFrame(weapons, shotCount) {
  const live = weapons.filter(Boolean);
  // Shot count, stance, input device, recoil control, and loadout changes do
  // not refit the view. A longer burst simply runs off frame until the user
  // asks for a refit.
  const key = [
    state.recoil.distance,
    state.recoil.zeroDistance,
  ].join('|');
  if (key === targetBaseFrameKey && targetBaseFrame) return;
  targetBaseFrameKey = key;

  const frame = targetFrame();
  let top = frame.topY;
  let bottom = frame.bottomY;
  live.forEach(weapon => {
    const { points, spreads } = patternFor(weapon, 0, shotCount);
    const ballisticOffsetCm = (targetVerticalOffsetMeters(weapon) ?? 0) * 100;
    points.forEach((point, i) => {
      const spread = spreads[i] ?? spreadBounds(weapon)[0];
      top = Math.max(top, ballisticOffsetCm + cmAtDistance(point.y + spread));
      bottom = Math.min(bottom, ballisticOffsetCm + cmAtDistance(point.y - spread));
    });
  });
  const minSpan = frame.heightCm / TARGET_FRAME_FILL;
  const maxSpan = frame.heightCm / TARGET_FRAME_MIN_FILL;
  targetBaseFrame = {
    fitSpan: Math.min(maxSpan, Math.max(minSpan, (top - bottom) * 1.1)),
    wantedCenterY: TARGET_DEFAULT_CENTER_Y_CM,
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

/** The display the target view projects for: game resolution and horizontal FOV. */
function targetDisplaySettings() {
  const readPositive = (id, fallback) => {
    const entered = +(document.getElementById(id)?.value ?? '');
    return Number.isFinite(entered) && entered > 0 ? Math.max(1, Math.round(entered)) : fallback;
  };
  const enteredFov = +(document.getElementById('rcTargetFov')?.value ?? ADS_1X_HFOV_DEG);
  return {
    width: readPositive('rcTargetWidth', Math.max(1, Math.round(window.screen?.width || 1920))),
    height: readPositive('rcTargetHeight', Math.max(1, Math.round(window.screen?.height || 1080))),
    hFovDeg: Math.max(1, Math.min(179, enteredFov || ADS_1X_HFOV_DEG)),
  };
}
// ── FIRING RANGE SENSITIVITY ─────────────────────────────────────────────────
// Mouse settings are a property of the player's PC, so like the display
// settings they live in local storage rather than in shared links.
const SENS_STORAGE = { dpi: 'bf6.sensDpi', sens: 'bf6.sensValue', coefficient: 'bf6.sensZoomCoefficient' };
const SENS_INPUT = { dpi: 'rcSensDpi', sens: 'rcSensValue', coefficient: 'rcSensCoef' };
// DPI and sensitivity must be positive; a zoom coefficient of 0 is a legitimate setting.
const sensValueValid = (key, value) => Number.isFinite(value) && (key === 'coefficient' ? value >= 0 : value > 0);
let sensSettingsLoaded = false;

function loadSensSettings() {
  if (sensSettingsLoaded) return;
  sensSettingsLoaded = true;
  for (const key of Object.keys(SENS_INPUT)) {
    const input = document.getElementById(SENS_INPUT[key]);
    if (!input) continue;
    let value = SENS_DEFAULTS[key];
    try {
      const stored = localStorage.getItem(SENS_STORAGE[key]);
      if (stored != null && sensValueValid(key, Number(stored))) value = Number(stored);
    } catch { /* localStorage may be unavailable in a restricted browser context. */ }
    input.value = String(value);
  }
}
function sensSettings() {
  const read = key => {
    const entered = +(document.getElementById(SENS_INPUT[key])?.value ?? '');
    return Number.isFinite(entered) && entered > 0 ? entered : SENS_DEFAULTS[key];
  };
  // A zoom coefficient of 0 is a legitimate setting (pure zoom ratio).
  const coefficientRaw = +(document.getElementById(SENS_INPUT.coefficient)?.value ?? '');
  return {
    dpi: read('dpi'), sens: read('sens'),
    coefficient: Number.isFinite(coefficientRaw) && coefficientRaw >= 0 ? coefficientRaw : SENS_DEFAULTS.coefficient,
  };
}
/** Degrees of view rotation per mouse count for the current aim state and optic. */
function rangeDegreesPerCount() {
  const { sens, coefficient } = sensSettings();
  return degreesPerCount({
    sens, aim: state.recoil.aim, hFovDeg: targetDisplaySettings().hFovDeg,
    magnification: currentMagnification(), coefficientPct: coefficient,
  });
}
function rangeSensSummary() {
  const { dpi, sens } = sensSettings();
  const hip = hipfireDegreesPerCount(sens);
  const current = rangeDegreesPerCount();
  const aimLabel = state.recoil.aim === 'ads' ? `ADS ${currentMagnification().toFixed(2)}×` : 'hipfire';
  return {
    cm360: cmPer360(hip, dpi),
    degPerCount: current,
    text: `${cmPer360(hip, dpi).toFixed(1)} cm/360 hipfire · ${aimLabel} ${current.toFixed(4)}°/count`,
  };
}
function syncSensReadout() {
  const readout = document.getElementById('rcSensReadout');
  if (readout) readout.textContent = rangeSensSummary().text;
}
/** Shots per burst, the pause after each burst and the sustained rate, for a burst build. */
function burstRows(w) {
  if (!w || w.fireMode !== 'burst' || !w.burstRounds) return [];
  const intraMs = 1000 * (60 / weaponRpm(w, w.burstRpm == null ? 'rpm' : 'burstRpm'));
  const postMs = 1000 * shotIntervalAfter(w, w.burstRounds);
  const extraMs = Math.max(0, postMs - intraMs);
  const cycleMs = (w.burstRounds - 1) * intraMs + postMs;
  const effectiveRpm = w.burstRounds * 60000 / cycleMs;
  return [
    ['Shots per burst', String(w.burstRounds)],
    ['Burst delay', extraMs >= 0.5 ? `${extraMs.toFixed(0)}ms after each burst` : 'none'],
    ['Effective fire rate', `${effectiveRpm.toFixed(0)} RPM sustained`],
  ];
}
const burstDetail = w => burstRows(w).map(([label, value]) => `${label}: ${value}`).join('\n');

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/**
 * A stat tooltip for one or two builds: the description once, then each
 * build's rows under its name when there are two. `parts` is [{ w, tip }]
 * where tip is a string or { text, rows: [[label, value], ...] }. Returns the
 * plain text for the title and the HTML the hover bubble renders.
 */
function statTooltip(parts) {
  const texts = [...new Set(parts.map(p => (typeof p.tip === 'string' ? p.tip : p.tip.text)).filter(Boolean))];
  const two = parts.length > 1;
  const lines = [...texts];
  let html = texts.map(t => `<div class="tt-desc">${escapeHtml(t)}</div>`).join('');
  parts.forEach(({ w, tip }, i) => {
    const rows = typeof tip === 'string' ? [] : tip.rows ?? [];
    if (!rows.length) return;
    if (two) {
      lines.push(wLabel(w));
      html += `<div class="tt-wname c${i + 1}">${escapeHtml(wLabel(w))}</div>`;
    }
    for (const [label, value] of rows) {
      lines.push(`${label}: ${value}`);
      html += `<div class="tt-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
    }
  });
  return { text: lines.join('\n'), html };
}
const FIRE_MODE_LABELS = { single: 'Semi', burst: 'Burst', auto: 'Auto' };
const FIRE_MODE_ORDER = ['single', 'burst', 'auto'];
/** The fire modes the slot's weapon and ergonomic offer, in selector order. */
function rangeFireModes(slot) {
  if (!slot?.weapon) return [];
  const { modes } = fireModeConfiguration(slot.weapon, slot.atts);
  return FIRE_MODE_ORDER.filter(mode => modes.includes(mode));
}
function setFireMode(slotIdx, mode) {
  const slot = state.slots[slotIdx];
  if (!rangeFireModes(slot).includes(mode) || selectedFireMode(slot.weapon, slot.atts) === mode) return;
  slot.atts.fireMode = mode;
  renderStats();
}
/** X on the range steps Auto, Burst, Semi and round again, over the modes the loadout offers. */
function cycleFireMode(slotIdx) {
  const slot = state.slots[slotIdx];
  const modes = rangeFireModes(slot);
  if (modes.length < 2) return;
  const current = selectedFireMode(slot.weapon, slot.atts);
  setFireMode(slotIdx, modes[(modes.indexOf(current) - 1 + modes.length) % modes.length]);
}
/**
 * Semi / Burst / Auto in the plot's top-right corner, with the X key noted in
 * the footer: only the modes the loadout offers, and nothing at all when there is one.
 */
function renderRangeFireModes(isRange) {
  const el = document.getElementById('rcRangeModes');
  const keyEl = document.getElementById('rcRangeModeKey');
  if (!el) return;
  const slot = state.slots[0];
  const modes = isRange ? rangeFireModes(slot) : [];
  el.replaceChildren();
  keyEl?.replaceChildren();
  el.hidden = modes.length < 2;
  if (el.hidden) return;
  const current = selectedFireMode(slot.weapon, slot.atts);
  if (keyEl) {
    const chip = document.createElement('span');
    chip.className = 'rc-key';
    chip.innerHTML = '<kbd>X</kbd>fire mode';
    chip.title = 'X while firing cycles the fire mode';
    keyEl.appendChild(chip);
  }
  const seg = document.createElement('span');
  seg.className = 'rc-fire-seg';
  for (const mode of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    if (mode === current) b.className = 'on';
    b.textContent = FIRE_MODE_LABELS[mode];
    b.setAttribute('aria-pressed', String(mode === current));
    b.title = `${FIRE_MODE_LABELS[mode]} fire`;
    b.addEventListener('click', () => setFireMode(0, mode));
    seg.appendChild(b);
  }
  el.appendChild(seg);
}
function rangeSimKey() {
  const w = selectedWeaponBuild(state.slots[0]);
  const { aim, stance, platform } = state.recoil;
  return [w ? w.id : '', w ? JSON.stringify(state.slots[0].atts) : '', aim, stance, platform].join('|');
}
function rangeStatsHtml(axis) {
  const live = firingRange?.live();
  // The same impact table as the Soldier Target's, in the same place; the
  // loadout is listed above it and the sensitivity read-out sits under the plot.
  const table = live
    ? targetImpactStatsHtml(axis.targetHits, { distance: state.recoil.distance,
      labelFor: (w, i) => (showsBadges() ? badgeHtml(i) : '') + loadoutHeadingHtml(w) })
    : '<p class="target-impact-note">Select a weapon to use the Firing Range.</p>';
  return `<div id="rcRangeStats">${table}</div>`;
}
/** Refresh only the live sample's stats while shots are landing. */
function refreshRangeStats() {
  if (state.recoil.view !== 'range') return;
  const slot = document.getElementById('rcRangeStats');
  const live = firingRange?.live();
  if (!slot || !live) return;
  const zones = rangeImpactZones(live.state.impacts);
  slot.outerHTML = rangeStatsHtml({ targetHits: [{ weapon: live.state.weapon, zones, hits: zones.flat().filter(Boolean).length, total: zones.flat().length }] });
}

/**
 * Vertical field, in target-plane centimetres, seen through an `m`x optic.
 * Magnification scales the tangent of the half-angle the way a real optic does;
 * dividing the angle itself over-zooms badly at the wide fields shooters use.
 */
function spanCmAtMagnification(m, display = targetDisplaySettings()) {
  const halfTanV = Math.tan(display.hFovDeg * Math.PI / 360) * (display.height / display.width) / m;
  return 2 * halfTanV * state.recoil.distance * 100;
}
/** Lowest magnification on the ladder that still fits the wanted span. */
function fitMagnification(spanCm, display = targetDisplaySettings()) {
  for (let i = SCOPE_MAGNIFICATIONS.length - 1; i >= 0; i--) {
    if (spanCmAtMagnification(SCOPE_MAGNIFICATIONS[i], display) >= spanCm) return SCOPE_MAGNIFICATIONS[i];
  }
  return SCOPE_MAGNIFICATIONS[0];
}
/** The primary slot's sight when it carries a magnification; it sets the default target zoom. */
// An optic only zooms when aiming down it; from the hip the view is 1.00×.
const HIPFIRE_SIGHT = { id: 'hip', name: 'Hipfire', magnification: 1 };
function equippedSight() {
  const { weapon, atts } = state.slots[0];
  if (!weapon) return null;
  if (state.recoil.aim === 'hip') return HIPFIRE_SIGHT;
  const sight = ATT_BY_ID.SIGHTS[atts?.sight ?? 'iron'];
  return Number.isFinite(sight?.magnification) ? sight : null;
}
function equippedSightKey() {
  const { weapon, atts } = state.slots[0];
  if (!weapon) return null;
  return `${weapon.id}:${state.recoil.aim === 'hip' ? 'hip' : atts?.sight ?? 'iron'}`;
}
/** The user's zoom, or null once the sight it was chosen on is no longer equipped. */
function magnificationOverride() {
  return state.recoil.magnificationSight === equippedSightKey() ? state.recoil.magnification : null;
}
function setMagnification(value) {
  const sight = equippedSight();
  state.recoil.magnification = sight && value === sight.magnification ? null : value;
  state.recoil.magnificationSight = equippedSightKey();
}
/** Back to the sight's own zoom, or the fixed start zoom without a sight. */
function resetMagnification() {
  state.recoil.magnification = equippedSight() ? null : TARGET_DEFAULT_MAGNIFICATION;
  state.recoil.magnificationSight = equippedSightKey();
}
/** A zoom the equipped sight cannot show: off its magnification and outside a variable optic's range. */
function magnificationIsNonStandard(magnification, sight = equippedSight()) {
  if (!sight) return false;
  const [low, high] = sight.magnificationRange ?? [sight.magnification, sight.magnification];
  return magnification < low || magnification > high;
}
function magnificationIndex(magnification) {
  let index = 0;
  SCOPE_MAGNIFICATIONS.forEach((value, i) => {
    if (Math.abs(Math.log(value / magnification)) < Math.abs(Math.log(SCOPE_MAGNIFICATIONS[index] / magnification))) index = i;
  });
  return index;
}
function currentMagnification() {
  const override = magnificationOverride();
  if (override != null) return override;
  const sight = equippedSight();
  if (sight) return sight.magnification;
  return fitMagnification(targetBaseFrame?.fitSpan ?? targetFrame().heightCm / TARGET_FRAME_FILL);
}
function recoilViewport() {
  if (isTargetGeometry()) {
    const { PW, PH } = plotBox();
    const display = targetDisplaySettings();
    // Fullscreen compensation: plot world span = optical span × (plot pixel height / selected display height).
    const ySpan = spanCmAtMagnification(currentMagnification(), display) * (PH / display.height);
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
  setMagnification(SCOPE_MAGNIFICATIONS[clamped]);
}
function adjustRecoilScale(dir) {
  if (isTargetGeometry()) {
    const index = magnificationIndex(currentMagnification());
    setMagnificationIndex(index + (dir === 'in' ? 1 : -1));
  } else {
    state.recoil.scaleH = Math.max(RECOIL_SCALE_MIN, Math.min(RECOIL_SCALE_MAX,
      state.recoil.scaleH + (dir === 'in' ? -RECOIL_SCALE_STEP : RECOIL_SCALE_STEP)));
  }
  scheduleRecoilPlot();
}
/** The one reset: return each view to its own framing defaults, aim back to
 *  center chest, and restore the original deterministic spray sample. */
function resetRecoilView() {
  recoilTouchControls?.cancel();
  state.recoil.refSeed = 0;
  if (state.recoil.view === 'range') firingRange?.reset();
  if (isTargetGeometry()) {
    state.recoil.distance = TARGET_DEFAULT_DISTANCE;
    resetMagnification();
    state.recoil.distancePanX = 0;
    state.recoil.distancePanY = 0;
    state.recoil.targetAim = 'chest';
    state.recoil.customAim = { x: 0, y: 0 };
    renderRecoil();
    return;
  }
  state.recoil.scaleH = RECOIL_SCALE_DEFAULT; state.recoil.panX = 0; state.recoil.panY = 0;
  renderRecoil();
}
/** Expanded touch reset changes zoom and pan only, preserving distance, aim and seed. */
function resetRecoilFraming() {
  recoilTouchControls?.cancel();
  if (isTargetGeometry()) {
    resetMagnification();
    state.recoil.distancePanX = 0; state.recoil.distancePanY = 0;
  } else {
    state.recoil.scaleH = RECOIL_SCALE_DEFAULT; state.recoil.panX = 0; state.recoil.panY = 0;
  }
  renderRecoil();
}
/** Keep the world point under the starting two-finger centroid under its new
 * centroid. Target zoom stays on the existing optic ladder, like its slider. */
function transformRecoilTouchView(baseZoom, ratio, anchor, clientX, clientY, canvas) {
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  if (isTargetGeometry()) {
    setMagnificationIndex(magnificationIndex(baseZoom * ratio));
  } else {
    state.recoil.scaleH = Math.max(RECOIL_SCALE_MIN, Math.min(RECOIL_SCALE_MAX, baseZoom / ratio));
  }
  const point = canvasToWorld(clientX, clientY, canvas);
  if (!point) return;
  if (isTargetGeometry()) {
    state.recoil.distancePanX += anchor.x - point.x;
    state.recoil.distancePanY += anchor.y - point.y;
  } else {
    state.recoil.panX += anchor.x - point.x;
    state.recoil.panY += anchor.y - point.y;
  }
  scheduleRecoilPlot();
}
function panRecoilView(dir) {
  if (isTargetGeometry()) {
    const step = recoilViewport().xSpan * 0.12;
    if (dir === 'left')  state.recoil.distancePanX -= step;
    if (dir === 'right') state.recoil.distancePanX += step;
    if (dir === 'up')    state.recoil.distancePanY += step;
    if (dir === 'down')  state.recoil.distancePanY -= step;
    scheduleRecoilPlot();
    return;
  }
  if (dir === 'left')  state.recoil.panX -= RECOIL_PAN_STEP;
  if (dir === 'right') state.recoil.panX += RECOIL_PAN_STEP;
  if (dir === 'up')    state.recoil.panY += RECOIL_PAN_STEP;
  if (dir === 'down')  state.recoil.panY -= RECOIL_PAN_STEP;
  scheduleRecoilPlot();
}

function panRecoilByPixels(dx, dy, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const { xSpan, ySpan } = recoilViewport();
  const { PW, PH } = plotBox();
  const dxWorld = dx * (plotCanvasSize(canvas).width / rect.width) / PW * xSpan;
  const dyWorld = dy * (plotCanvasSize(canvas).height / rect.height) / PH * ySpan;
  if (isTargetGeometry()) {
    state.recoil.distancePanX -= dxWorld;
    state.recoil.distancePanY += dyWorld;
  } else {
    state.recoil.panX -= dxWorld;
    state.recoil.panY += dyWorld;
  }
  scheduleRecoilPlot();
}

function zoomRecoilAtPointer(deltaY, clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const { PW, PH } = plotBox();
  const canvasX = (clientX - rect.left) * plotCanvasSize(canvas).width / rect.width;
  const canvasY = (clientY - rect.top) * plotCanvasSize(canvas).height / rect.height;
  const u = Math.max(0, Math.min(1, (canvasX - PLOT_PAD.l) / PW));
  const v = Math.max(0, Math.min(1, (canvasY - PLOT_PAD.t) / PH));
  const before = recoilViewport();
  const worldX = before.xCenter + (u - 0.5) * before.xSpan;
  const worldY = before.yCenter + (0.5 - v) * before.ySpan;

  if (isTargetGeometry()) {
    const index = magnificationIndex(currentMagnification());
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
  scheduleRecoilPlot();
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

function selectedRecoilDirectionFor(w) { return recoilGroup(w).dir; }

/**
 * Match the backing store to the rendered size so the plot stays crisp as its
 * column grows, rather than upscaling a fixed 430px bitmap.
 */
function plotCanvasSize(canvas) {
  const rect = canvas?.getBoundingClientRect();
  // A short landscape modal must use its actual aspect ratio. Retain the
  // existing minimum for inline/desktop plots, whose sizing is unchanged.
  const minimum = canvas?.closest?.('.rc-expanded-plot[open]') ? 40 : 240;
  return { width: Math.max(minimum, Math.round(rect?.width || 430)),
    height: Math.max(minimum, Math.round(rect?.height || 430)) };
}
function syncPlotCanvasSize(canvas) {
  const size = plotCanvasSize(canvas);
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(size.width * ratio), h = Math.round(size.height * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
  return size;
}

// One cache entry per selected build and simulation setup. Viewport changes do
// not change shot angles. Replacing the setup also discards old random seeds.
const patternCache = new WeakMap();
function patternFor(weapon, seed, shots) {
  const { aim, stance, platform, compensationLevel, refSeed } = state.recoil;
  const key = [aim, stance, platform, compensationLevel, refSeed, shots].join('|');
  let cached = patternCache.get(weapon);
  if (cached?.key !== key) {
    cached = { key, spreads: simulateSpread(weapon, shots), points: new Map() };
    patternCache.set(weapon, cached);
  }
  const seedKey = seed >>> 0;
  if (!cached.points.has(seedKey)) cached.points.set(seedKey, genRecoilPts(weapon, seed, shots));
  return { points: cached.points.get(seedKey), spreads: cached.spreads };
}

/**
 * Background, grid, axis labels, crosshair and (in target geometry) the soldier
 * figure, shared by the pattern plot and the Firing Range. Leaves the context
 * saved and clipped to the plot area; the caller restores it.
 */
function drawPlotFrame(canvas, { crosshair = state.recoil.crosshair } = {}) {
  const { width: CW, height: CH } = syncPlotCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  const PL = PLOT_PAD.l, PR = PLOT_PAD.r, PT = PLOT_PAD.t, PB = PLOT_PAD.b;
  const PW = CW - PL - PR, PH = CH - PT - PB;
  const isTargetView = isTargetGeometry();
  const view = recoilViewport();
  const xMin = view.xCenter - view.xSpan / 2, xMax = view.xCenter + view.xSpan / 2;
  const yMin = view.yCenter - view.ySpan / 2, yMax = view.yCenter + view.ySpan / 2;
  const mapX = value => PL + ((value - xMin) / (xMax - xMin)) * PW;
  const mapY = value => PT + PH - ((value - yMin) / (yMax - yMin)) * PH;
  // In target view the figure is pinned to world zero and the aim point is what
  // moves, so shot angles are projected relative to the aim offset.
  const aimOffset = isTargetView ? currentAimOffset() : { x: 0, y: 0 };
  const toX = angleDeg => mapX(isTargetView ? aimOffset.x + cmAtDistance(angleDeg) : angleDeg);
  const targetImpactYcm = (weapon, angleDeg) => aimOffset.y + cmAtDistance(angleDeg) + (targetVerticalOffsetMeters(weapon) ?? 0) * 100;
  const toY = (weapon, angleDeg) => mapY(isTargetView ? targetImpactYcm(weapon, angleDeg) : angleDeg);

  ctx.fillStyle = '#080d0d'; ctx.fillRect(0, 0, CW, CH);

  const gridStep = isTargetView ? niceDistanceGridStep(xMax - xMin) : 1;
  const vMin1 = Math.ceil(yMin / gridStep) * gridStep, vMax1 = Math.floor(yMax / gridStep) * gridStep;
  const hMin1 = Math.ceil(xMin / gridStep) * gridStep, hMax1 = Math.floor(xMax / gridStep) * gridStep;
  ctx.strokeStyle = 'rgba(40,52,52,0.6)'; ctx.lineWidth = 0.4;
  for (let v = vMin1; v <= vMax1; v += gridStep) { const y = mapY(v); ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + PW, y); ctx.stroke(); }
  for (let h = hMin1; h <= hMax1; h += gridStep) { const x = mapX(h); ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + PH); ctx.stroke(); }

  // The angle plot's origin is the aim point, so full-length axes read well
  // there. In target view the grid is anchored to the body.
  if (!isTargetView) {
    ctx.strokeStyle = 'rgba(150,165,165,0.6)'; ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) { ctx.beginPath(); ctx.moveTo(mapX(0), PT); ctx.lineTo(mapX(0), PT + PH); ctx.stroke(); }
    if (yMin <= 0 && yMax >= 0) { ctx.beginPath(); ctx.moveTo(PL, mapY(0)); ctx.lineTo(PL + PW, mapY(0)); ctx.stroke(); }
  }

  if (crosshair) {
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
  }

  ctx.fillStyle = 'rgba(100,120,120,0.75)'; ctx.font = '9px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = vMin1; v <= vMax1; v += gridStep) ctx.fillText(isTargetView ? fmtAxisMeters(v) : v + '°', PL - 3, mapY(v));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let h = hMin1; h <= hMax1; h += gridStep) ctx.fillText(isTargetView ? fmtAxisMeters(h) : h + '°', mapX(h), PT + PH + 3);

  ctx.save();
  ctx.beginPath(); ctx.rect(PL, PT, PW, PH); ctx.clip();

  const targetHitTest = isTargetView ? drawTarget(ctx, mapX, mapY) : null;
  const pxPerCm = isTargetView ? PW / (xMax - xMin) : 0;
  const sprayDotRadius = isTargetView ? targetMarkerRadius(pxPerCm) : 2.5;
  const scatterDotRadius = isTargetView ? targetMarkerRadius(pxPerCm, 1.25) : 2;
  return { ctx, CW, CH, PL, PT, PW, PH, isTargetView, xMin, xMax, yMin, yMax, mapX, mapY, toX, toY,
    targetImpactYcm, aimOffset, cmAt: cmAtDistance, targetHitTest, pxPerCm, sprayDotRadius, scatterDotRadius };
}

function drawRecoilFixed(canvas, weapon1, weapon2, layers, refSeed = 0) {
  const { ctx, isTargetView, xMin, xMax, yMin, yMax, toX, toY, targetImpactYcm, aimOffset,
    targetHitTest, sprayDotRadius, scatterDotRadius } = drawPlotFrame(canvas);
  const N = selectedRecoilShotCount();
  const cols = ['#c9a227', '#4d94d0'];
  const drawOrder = [weapon1, weapon2].filter(Boolean);
  const spreadBubbleIdxs = getSpreadBulletIdxs(N);
  const targetHits = [];

  // Pass 0 — Scatter cloud
  if (layers.scatter) drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    for (let s = 1; s <= CLOUD_RUNS; s++) {
      const { points: recoilPts, spreads } = patternFor(w, s * 0x9e3779b9, N);
      const rngB = mulberry32((whash(w.id) ^ (s * 0x6c62272e)) >>> 0);
      recoilPts.forEach((p, i) => {
        const spread = spreads[i] ?? spreadBounds(w)[0];
        const bAng = rngB() * Math.PI * 2, bR = sampleSpreadRadius(w, spread, rngB());
        const x = p.x + bR * Math.cos(bAng), y = p.y + bR * Math.sin(bAng);
        // A pellet load scatters as its pellets, drawn smaller.
        const pellets = samplePellets(w, x, y, rngB);
        ctx.fillStyle = col + '38';
        (pellets ?? [{ x, y }]).forEach(q => {
          ctx.beginPath();
          ctx.arc(toX(q.x), toY(w, q.y), scatterDotRadius * (pellets ? 0.7 : 1), 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  });

  // Pass 1 — Reference run with spread jitter + overlays
  drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    const weaponRefSeed = refSeed >>> 0;
    const { points: pts, spreads } = patternFor(w, weaponRefSeed, N);

    // A pellet load's shell carries its pellets, each scattered inside the
    // dispersion cone; the dots and the hit zones are then the pellets'.
    const sprayPts = (() => {
      const rngRef = mulberry32((whash(w.id) ^ weaponRefSeed ^ 0xdeadbeef) >>> 0);
      const rngPellet = mulberry32((whash(w.id) ^ weaponRefSeed ^ 0x9e3779b9) >>> 0);
      return pts.map((p, i) => {
        const spread = spreads[i] ?? spreadBounds(w)[0];
        const bAng = rngRef() * Math.PI * 2, bR = sampleSpreadRadius(w, spread, rngRef());
        const x = p.x + bR * Math.cos(bAng), y = p.y + bR * Math.sin(bAng);
        return { x, y, pellets: samplePellets(w, x, y, rngPellet) };
      });
    })();
    const zoneAt = p => targetHitTest({ xCm: aimOffset.x + cmAtDistance(p.x), yCm: targetImpactYcm(w, p.y) });
    let sprayZones = null;
    if (targetHitTest) {
      sprayZones = sprayPts.map(p => p.pellets ? p.pellets.map(zoneAt) : zoneAt(p));
      targetHits.push({ weapon: w, zones: sprayZones, hits: sprayZones.flat().filter(Boolean).length, total: sprayZones.flat().length });
    }

    // A pellet load's pellets land up to the spread plus the dispersion cone
    // from the aim line, so its bubbles and cone cover both.
    const pelletReach = (w.pellets ?? 1) > 1 ? w.pelletDispersion : 0;

    if (layers.spread) {
      spreadBubbleIdxs.forEach(idx => {
        const p = pts[idx]; if (!p) return;
        const spread = (spreads[idx] ?? spreadBounds(w)[0]) + pelletReach;
        const x = toX(p.x), y = toY(w, p.y), r = Math.abs(toX(p.x + spread) - x);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = col + '1a'; ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1.2;
        ctx.fill(); ctx.stroke();
      });
    }

    if (layers.cone) {
      const coneCircles = pts.map((p, idx) => {
        const spread = (spreads[idx] ?? spreadBounds(w)[0]) + pelletReach;
        const x = toX(p.x), y = toY(w, p.y), r = Math.abs(toX(p.x + spread) - x);
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
      pts.forEach((p, i) => { const x = toX(p.x), y = toY(w, p.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = col === '#c9a227' ? 'rgba(201,162,39,0.72)' : 'rgba(77,148,208,0.72)';
      ctx.lineWidth = 2.2; ctx.stroke();
    }

    // Colour stays purely weapon identity. Hits read as bigger solid dots
    // with a dark separator so they lift off the figure; misses fade back.
    // Pellets are drawn smaller, in place of their shell's dot.
    const drawSprayDot = (p, zone, scale) => {
      const x = toX(p.x), y = toY(w, p.y);
      if (!sprayZones) {
        ctx.beginPath(); ctx.arc(x, y, sprayDotRadius * scale, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        return;
      }
      if (!zone) {
        ctx.beginPath(); ctx.arc(x, y, sprayDotRadius * scale, 0, Math.PI * 2);
        ctx.fillStyle = col + '80'; ctx.fill();
        return;
      }
      const r = sprayDotRadius * 1.3 * scale;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      if (r > 1.6) {
        ctx.strokeStyle = 'rgba(8,13,13,0.85)';
        ctx.lineWidth = Math.min(1.4, r * 0.32);
        ctx.stroke();
      }
    };
    if (layers.spray) sprayPts.forEach((p, i) => {
      if (p.pellets) p.pellets.forEach((q, j) => drawSprayDot(q, sprayZones?.[i]?.[j], 0.7));
      else drawSprayDot(p, sprayZones?.[i], 1);
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
  // Barrels and lights that scale bloom scale its recovery with it, which is no loss of
  // recovery. The selected build's factor applies to every row so only real changes show.
  const bloomScale = { ads: 1, hip: 1 };
  const adsSpreadRecovery = w => {
    const dyn = spreadDynamics(w, 'ads');
    return dyn.firingOffset
      * bloomScale.ads
      * (1 + (w._adsSpreadDecayBoost ?? 0));
  };
  const hipSpreadRecovery = w => {
    const dyn = spreadDynamics(w, 'hip');
    return dyn.firingOffset
      * bloomScale.hip;
  };
  const adsRecoilDecay = w => w._adsRecoilDecayMult ?? 1;
  const metrics = [
    { lbl: 'ADS Time',            val: w => w._adsTimeMs,                   unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Time to aim down sights.' },
    { lbl: 'ADS Move Speed',      val: w => w._adsMoveSpeedMult == null ? null : Number(formatMovementMultiplier(w._adsMoveSpeedMult)),             unit: '×',   dec: 2, higherBetter: true, tooltip: 'Movement speed multiplier while ADS.' },
    { lbl: 'Sprint Recovery',     val: w => w._sprintRecoveryMs,            unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Sprint-to-fire delay: how long after sprinting before you can shoot.' },
    { lbl: 'Deploy Speed', displayLabel: 'Draw Speed', val: w => w.deployT != null ? w.deployT * 1000 : null, unit: 'ms', dec: 0, lowerBetter: true, tooltip: 'Draw time when switching to the weapon.' },
    { lbl: 'Holster Speed',       val: w => w.undeployT != null ? w.undeployT * 1000 : null, unit: 'ms', dec: 0, lowerBetter: true, tooltip: "Time to put the weapon away. This is the weapon's holster setting, not total swap time." },
    { lbl: 'Bullet Vel',          val: w => w.bulletVel,                     unit: 'm/s', dec: 0, higherBetter: true, tooltip: 'Muzzle velocity. Faster bullets have less travel time and drop at range.' },
    { lbl: 'Bullet Drag',         val: w => w._projectileModel?.dragPerMeter, unit: '/m', dec: 4, lowerBetter: true, tooltip: 'Projectile drag. Lower keeps the bullet faster at range, with less travel time and drop.' },
    { lbl: 'Mag Size',            val: w => w.mag,                           unit: '',    dec: 0, higherBetter: true, tooltip: 'Rounds per magazine.' },
    { lbl: 'Tac Reload',          val: w => w.tacRld,                        unit: 's',   dec: 3, lowerBetter:  true, tooltip: 'Reload time with rounds left in the magazine.' },
    { lbl: 'ADS Recoil/Shot',     val: w => w.recoilV,                       unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Vertical recoil per shot while ADS. Lower is easier to control.' },
    { lbl: 'ADS Recoil Variation', val: w => w.recoilVar,                    unit: '°',   dec: 1, lowerBetter:  true, tooltip: 'Horizontal randomness of each shot\'s recoil while ADS. Lower is more predictable.' },
    { lbl: 'Recoil Recovery',     val: adsRecoilDecay,                     unit: '×',   dec: 2, higherBetter: true, tooltip: 'Recoil recovery multiplier while ADS: how quickly your aim settles back after each kick.' },
    { lbl: 'Recoil Duration',     val: w => w.recoil?.ads?.duration != null ? w.recoil.ads.duration * 1000 : null, unit: 'ms', dec: 0, higherBetter: true, tooltip: 'How long each shot\'s kick takes to play out. A longer kick is smoother to track but not smaller.' },
    { lbl: 'Spread Inc/Shot',     val: w => w.recoilIncAds,                  unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Bloom added per shot while ADS. Lower keeps sustained fire tighter.' },
    { lbl: 'Hip Spread/Shot',     val: w => w.spreadDyn?.hip?.inc,            unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Bloom added per hipfire shot. Lower keeps sustained hipfire tighter.' },
    { lbl: 'ADS Spread Recovery', val: adsSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'How fast ADS bloom recovers while you keep firing.' },
    { lbl: 'Hip Spread Recovery', val: hipSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'How fast hipfire bloom recovers while you keep firing.' },
    { lbl: 'Mov Spread',          val: w => w.spread?.adsMove?.[0],        unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Minimum ADS spread while moving. Lower is more accurate.' },
    { lbl: 'Hipfire Spread',      val: w => w.spread?.hipStand?.[0],         unit: '°',   dec: 3, lowerBetter:  true, tooltip: 'Minimum standing hipfire spread. Lower is more accurate.' },
    { lbl: '3D Spot',             val: w => w._worldSpot,                    unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Spot-on-fire range for the in-world marker: enemies within it see you when you shoot. 0 m means firing never spots you.' },
    { lbl: 'Minimap Spot',        val: w => w._minimapSpot,                  unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Spot-on-fire range for the minimap: enemies within it see you on their minimap when you shoot. 0 m means firing never spots you.' },
    { lbl: 'HS Mult',             val: w => w._hsMult,                       unit: '×',   dec: 2, higherBetter: true, tooltip: 'Headshot damage multiplier.' },
    { lbl: 'Collateral Mult',    val: w => w._collateralMult,               unit: '×',   dec: 2, higherBetter: true, tooltip: 'Damage multiplier for bullets that penetrate a target or a thin surface.' },
  ];
  const estimatedFieldsForMetric = {
    'ADS Time': ['adsTimeTierMod', 'adsTimeTierShift'],
    'ADS Move Speed': ['adsMoveSpeedTierShift'],
    'Sprint Recovery': ['sprintRecoveryTierShift', 'adsTimeTierShift'],
    'Deploy Speed': ['deployTimeTierShift', 'deployBaseIndex', 'deployTimeTable'],
    'Holster Speed': ['deployTimeTierShift', 'deployBaseIndex', 'deployTimeTable'],
    'Bullet Vel': ['velMult', 'velTierMod'],
    'Bullet Drag': ['dragPerMeter'],
    'Mag Size': ['mag'],
    'Tac Reload': ['tacRld', 'tacRldOverrideMs', 'reloadSpeedTier', 'reloadSpeedMult'],
    'ADS Recoil/Shot': ['adsRecoilTierMod'],
    'ADS Recoil Variation': ['adsRecoilVariationTierMod'],
    'Recoil Recovery': ['adsRecoilDecayMult'],
    'Recoil Duration': ['recoilDurationOverride', 'recoilDurationAdd'],
    'Spread Inc/Shot': ['adsSpreadIncMult'],
    'ADS Spread Recovery': ['adsSpreadDecayBoost', 'adsSpreadFiringDecOffsetMult', 'adsSpreadFiringDecCoefMult'],
    'Hip Spread/Shot': ['hipSpreadIncMult'],
    'Hip Spread Recovery': ['hipSpreadFiringDecOffsetMult', 'hipSpreadFiringDecCoefMult'],
    'Mov Spread': ['movingAdsSpreadTierMod'],
    'Hipfire Spread': ['hipSpreadTierMod'],
    '3D Spot': ['worldSpotMult'],
    'Minimap Spot': ['minimapSpotMult'],
    'HS Mult': ['hsMult', 'headshotMult'],
    'Collateral Mult': ['collateralMult'],
  };
  const selectedAttachmentRecords = (weapon, atts) => {
    const wm = WEAPON_MAG[weapon.id];
    return [
      ATT_BY_ID.SIGHTS[atts.sight],
      ATT_BY_ID.MUZZLES[atts.muzzle],
      ATT_BY_ID.BARRELS[atts.barrel],
      ...Object.values(Loadout.resolveMountAttachments(atts, weapon, _atts)),
      ATT_BY_ID.AMMO[atts.ammo],
      ATT_BY_ID.ERGOS[atts.ergo],
      wm?.mags?.[atts.mag ?? wm.def],
    ].filter(Boolean);
  };
  const hasEstimatedEffect = (fields, records, weapon) => (fields ?? []).some(field => records.some(att =>
    Loadout.isAssumedField(att, field, weapon.id)));
  // Source steps shown beside each attachment's contribution in the breakdown.
  const stepFieldsForMetric = {
    'ADS Time': [['adsTimeTierMod', 'tier'], ['adsTimeTierShift', 'tier']],
    'ADS Move Speed': [['adsMoveSpeedTierShift', 'tier']],
    'Sprint Recovery': [['sprintRecoveryTierShift', 'tier']],
    'Deploy Speed': [['deployTimeTierShift', 'tier']],
    'Holster Speed': [['deployTimeTierShift', 'tier']],
    'Bullet Vel': [['velTierMod', 'tier']],
    'Tac Reload': [['reloadSpeedTier', 'reloadTier'], ['reloadSpeedMult', 'mult']],
    'ADS Recoil/Shot': [['adsRecoilTierMod', 'tier']],
    'ADS Recoil Variation': [['adsRecoilVariationTierMod', 'tier']],
    'Recoil Recovery': [['adsRecoilDecayMult', 'mult']],
    'Spread Inc/Shot': [['adsSpreadIncMult', 'mult']],
    'Hip Spread/Shot': [['hipSpreadIncMult', 'mult']],
    'ADS Spread Recovery': [['adsSpreadDecayBoost', 'pct']],
    'Mov Spread': [['movingAdsSpreadTierMod', 'tier']],
    'Hipfire Spread': [['hipSpreadTierMod', 'tier']],
    '3D Spot': [['worldSpotMult', 'mult']],
    'Minimap Spot': [['minimapSpotMult', 'mult']],
    'Weapon Sway': [['weaponSwayMult', 'mult']],
  };
  const utilityTooltips = {
    'Fire while Sprinting': 'Lets you shoot while sprinting.',
    'Gadget Draw Speed': 'Mounts an underbarrel launcher (HE, thermobaric or smoke) for a faster gadget draw.',
    'Flashlight': 'Flashlight that can blind enemies. Shows when it is on: toggled manually, only while ADS, or only in hipfire.',
    'Auto-Zeroing': 'Sets scope zeroing to the distance under the crosshair.',
    'Reload in ADS': 'Reload without leaving ADS.',
    'Rechamber in ADS': 'Cycle the bolt without leaving ADS.',
  };
  const plainName = rec => Loadout.attDisplayName({ ...rec, assumed: false, assumedFields: {} });
  // Source steps as numbers: tiers add, multipliers and reload speeds multiply,
  // percentage boosts add.
  const stepParts = (rec, lbl, weapon) => (stepFieldsForMetric[lbl] ?? []).map(([field, kind]) => {
    const v = rec?.[field] ?? rec?.[`${field}ByWeapon`]?.[weapon.id];
    if (!Number.isFinite(v)) return null;
    if (kind === 'tier') return v ? { kind, v: Math.abs(v) } : null;
    if (kind === 'reloadTier') return v ? { kind: 'speed', v: _balance.RELOAD_SPEED_MULTIPLIERS[v] } : null;
    if (kind === 'pct') return v ? { kind, v } : null;
    if (lbl === 'Tac Reload') return v !== 1 ? { kind: 'speed', v } : null;
    return v !== 1 ? { kind, v } : null;
  }).filter(Boolean);
  const stepString = parts => parts.map(({ kind, v }) => (kind === 'tier' ? `${v} tier${v === 1 ? '' : 's'}`
    : kind === 'pct' ? `${v >= 0 ? '+' : '−'}${+(Math.abs(v) * 100).toFixed(1)}%`
      : `×${+v.toFixed(3)}${kind === 'speed' ? ' speed' : ''}`)).join(', ');
  // The net row's step: signed tier total (a row's sign follows whether it helps),
  // product of factors, sum of boosts.
  const netStep = rows => {
    const byKind = {};
    for (const r of rows) for (const part of r.parts) {
      const acc = byKind[part.kind];
      if (part.kind === 'tier') byKind.tier = (acc ?? 0) + part.v * (r.better ? 1 : -1);
      else if (part.kind === 'pct') byKind.pct = (acc ?? 0) + part.v;
      else byKind[part.kind] = (acc ?? 1) * part.v;
    }
    // Cancelling steps still show (0 tiers, ×1) so the net explains itself.
    return stepString(Object.entries(byKind).map(([kind, v]) => ({ kind, v: kind === 'tier' ? Math.abs(v) : v })));
  };
  // Why the rows do not add up to the net. Multiplied factors need no note:
  // the steps show them. Uneven or clamped tier ladders and overrides do.
  const combineNote = lbl => {
    const kinds = new Set((stepFieldsForMetric[lbl] ?? []).map(([, kind]) => kind));
    if (kinds.has('mult')) return null;
    if (kinds.has('tier')) return 'Tier steps differ in size and the ladder has fixed ends, so the rows do not add up to the net.';
    return 'These attachments interact, so the rows do not add up to the net.';
  };
  const bloomScaleNote = {
    'Spread Inc/Shot': k => `Bloom recovery is scaled to match, so ADS bloom stays at ×${k} or less throughout a burst and clears no slower.`,
    'Hip Spread/Shot': k => `Bloom recovery is scaled to match, so hipfire bloom stays at ×${k} or less throughout a burst and clears no slower.`,
    'ADS Spread Recovery': (k, names) => `Not listed: ${names}. Recovery scaled in step with the smaller bloom does not slow recovery.`,
    'Hip Spread Recovery': (k, names) => `Not listed: ${names}. Recovery scaled in step with the smaller bloom does not slow recovery.`,
  };
  const colorFor = (m, d) => (Math.abs(d) < 0.0005 ? 'var(--muted)'
    : ((m.higherBetter && d > 0) || (m.lowerBetter && d < 0)) ? 'var(--green)' : 'var(--red)');
  const SLOT_LABELS = { sight: 'Sight', muzzle: 'Muzzle', barrel: 'Barrel', grip: 'Grip', laser: 'Laser',
    light: 'Light', ammo: 'Ammo', ergo: 'Ergo', mag: 'Mag' };
  // With two or more sources, a line under the value gives each one's share,
  // so a ±0 chip reads as two changes cancelling. One source needs no line.
  const sourceLine = rows => rows.length < 2 ? ''
    : `<div class="att-chip-src">${rows.map(r => `<b style="color:${r.color ?? 'inherit'}">${r.value}</b> ${SLOT_LABELS[r.slot] ?? r.name}`).join(' · ')}</div>`;
  // A chip whose hover/tap popover lists each attachment's own contribution.
  const chipHtml = ({ label, value, color, desc, rows = [], footer = [] }) => {
    // Columns: attachment | source step | value, so the value sits on the right.
    const cells = (r, cls = '') => `<span class="${cls}">${r.name}</span>`
      + `<span class="att-tt-step ${cls}">${r.step ? escAttr(r.step) : ''}</span>`
      + `<span class="att-tt-val ${cls}" style="color:${r.color ?? 'inherit'}">${r.value}</span>`;
    const body = rows.length ? `<div class="att-tt-grid">${rows.map(r => cells(r)).join('')}`
      + footer.map(f => (f.total ? '<div class="att-tt-rule"></div>' + cells(f, 'att-tt-total')
        : `<span class="att-tt-note">${escAttr(f.note)}</span>`)).join('')
      + '</div>' : '';
    const aria = escAttr(`${label.replace(/<[^>]+>/g, '')}: ${value}. ${desc}`);
    return `<div class="att-chip" tabindex="0" aria-label="${aria}"><div class="att-chip-lbl">${label}</div><div class="att-chip-val" style="color:${color}">${value}</div>${sourceLine(rows)}`
      + `<div class="rc-tt att-tt"><div class="att-tt-desc">${escAttr(desc)}</div>${body}</div></div>`;
  };
  let html = '<div class="ptitle" style="margin-bottom:9px">Attachment Effects</div>';
  let rendered = false;
  const badges = loadouts.filter(x => x.weapon).length === 2;
  loadouts.filter(x => x.weapon).forEach(({ weapon, atts, build, colClass }) => {
    // Baseline is the bare weapon, so default sights, barrels and magazines show their effects.
    const defaults = defaultAttsForWeapon(weapon);
    const baseWeapon = bareAppliedWeapon(weapon);
    const curWeapon = build ?? applyAttachments(weapon, atts);
    const withProjectile = (w, ammo) => ({ ...w, _projectileModel: projectileModelFor(w, { ammo }) });
    const base = withProjectile(baseWeapon, defaults.ammo);
    const cur = withProjectile(curWeapon, atts.ammo ?? defaults.ammo);
    bloomScale.ads = cur._adsSpreadFiringDecOffsetMult ?? 1;
    bloomScale.hip = cur._hipSpreadFiringDecOffsetMult ?? 1;
    const contributions = attachmentContributions(weapon, atts, defaults).map(c => ({
      ...c,
      name: plainName(c.record),
      // Pair each build with its own ammunition so projectile drag compares like with like.
      build: withProjectile(c.build, c.mode === 'solo' && c.slot !== 'ammo' ? defaults.ammo : atts.ammo ?? defaults.ammo),
      base: withProjectile(c.base, c.mode === 'solo' || c.slot === 'ammo' ? defaults.ammo : atts.ammo ?? defaults.ammo),
    }));
    const selectedAttachments = selectedAttachmentRecords(weapon, atts);
    const bugs = Loadout.selectedGameBugs(atts, LOADOUT_DATA, weapon);
    const bugMetrics = new Set(bugs.flatMap(bug => bug.metrics));
    const bugMark = lbl => bugMetrics.has(lbl) ? `${Loadout.GAME_BUG_MARK}` : '';
    const rowMarks = (c, lbl, fields) => `${(fields ?? []).some(f => Loadout.isAssumedField(c.record, f, weapon.id)) ? '*' : ''}`
      + `${bugs.some(b => b.slot === c.slot && b.attachments.includes(c.record?.id) && b.metrics.includes(lbl)) ? `${Loadout.GAME_BUG_MARK}` : ''}`;
    // Rows for one numeric stat: each attachment's own change, then the net.
    const breakdown = (m, valueOf, fmt, net) => {
      const rows = contributions.map(c => {
        const a = valueOf(c.base), b = valueOf(c.build);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        const d = b - a;
        if (Math.abs(d) < 0.0005) return null;
        return { d, slot: c.slot, name: escAttr(c.name) + rowMarks(c, m.lbl, estimatedFieldsForMetric[m.lbl]),
          value: fmt(d), color: colorFor(m, d), parts: stepParts(c.record, m.lbl, weapon),
          better: (m.higherBetter && d > 0) || (m.lowerBetter && d < 0) };
      }).filter(Boolean);
      rows.forEach(r => { r.step = stepString(r.parts); });
      const footer = [];
      const sum = rows.reduce((t, r) => t + r.d, 0);
      const note = rows.length > 1 && Math.abs(sum - net) > Math.max(0.5 * 10 ** -m.dec, 0.0005) && combineNote(m.lbl);
      if (note) footer.push({ note });
      if (rows.length > 1) footer.push({ name: `Net ${m.displayLabel ?? m.lbl}`, total: true, step: netStep(rows), value: Math.abs(net) < 0.0005 ? fmt(0).replace(/^[+-]?/, '±') : fmt(net), color: colorFor(m, net) });
      return { rows, footer };
    };
    const chips = [];
    metrics.forEach(m => {
      const baseVal = m.val(base), curVal = m.val(cur);
      if (!Number.isFinite(baseVal) || !Number.isFinite(curVal)) {
        chips.push(`<div class="att-chip"><div class="att-chip-lbl">${m.displayLabel ?? m.lbl}</div><div class="att-chip-val" title="Data unavailable">—</div></div>`);
        return;
      }
      const delta = +(curVal - baseVal).toFixed(Math.max(m.dec, 3));
      const fmt = d => signed(+d.toFixed(Math.max(m.dec, 3)), m.unit, m.dec);
      const { rows, footer } = breakdown(m, m.val, fmt, delta);
      const scaleNote = bloomScaleNote[m.lbl];
      const scale = /^Hip/.test(m.lbl) ? bloomScale.hip : bloomScale.ads;
      if (scaleNote && rows.length && Math.abs(scale - 1) > 0.0005) {
        const field = /^Hip/.test(m.lbl) ? 'hipSpreadFiringDecOffsetMult' : 'adsSpreadFiringDecOffsetMult';
        const names = contributions.filter(c => (c.record?.[field] ?? 1) !== 1).map(c => c.name).join(', ');
        footer.push({ note: scaleNote(+scale.toFixed(2), names) });
      }
      // Match Trigger's spread rows: semi-automatic fire already adds no spread
      // per shot on every weapon except EF88, BROD 3 and Mk 24 (ATTACHMENT_BUGS.md
      // entry 26), so on the others the rows change nothing in practice.
      if ((m.lbl === 'Spread Inc/Shot' || m.lbl === 'Hip Spread/Shot') && weapon.fireModes?.single?.hipNoBloomOnSwitch === true
        && selectedFireMode(weapon, atts) === 'single' && contributions.some(c => c.record?.semiAuto?.spreadIncMult === 0)) {
        footer.push({ note: 'Semi-automatic fire already adds no spread per shot on this weapon, so this changes nothing in practice.' });
      }
      // A net of zero still shows when attachments cancel each other out.
      if (Math.abs(delta) < 0.0005 && !rows.length) return;
      const label = `${m.displayLabel ?? m.lbl}${hasEstimatedEffect(estimatedFieldsForMetric[m.lbl], selectedAttachments, weapon) ? '*' : ''}${bugMark(m.lbl)}`;
      chips.push(chipHtml({ label, value: Math.abs(delta) < 0.0005 ? `±0${m.unit}` : signed(delta, m.unit, m.dec),
        color: colorFor(m, delta), desc: m.tooltip ?? m.lbl, rows, footer }));
    });
    const swayMetric = { lbl: 'Weapon Sway', lowerBetter: true, dec: 1 };
    const swayVal = ((cur._weaponSwayMult ?? 1) / (base._weaponSwayMult ?? 1) - 1) * 100;
    const sway = breakdown(swayMetric, w => (w._weaponSwayMult ?? 1) * 100, d => signed(d, '%', 1), swayVal);
    if (Math.abs(swayVal) >= 0.05 || sway.rows.length) {
      const label = `Weapon Sway${hasEstimatedEffect(['weaponSwayMult'], selectedAttachments, weapon) ? '*' : ''}${bugMark('Weapon Sway')}`;
      chips.push(chipHtml({ label, value: Math.abs(swayVal) < 0.05 ? '±0%' : signed(swayVal, '%', 1),
        color: colorFor(swayMetric, swayVal), rows: sway.rows, footer: sway.footer,
        desc: 'Weapon sway while ADS, compared with the bare weapon. Sway modifiers multiply. Camera sway is not included.' }));
    }
    const sourceRow = (c, value, color) => ({ name: escAttr(c.name), value, color });
    const vrVal = cur._visualRecoil ?? 0;
    if (vrVal !== 0) {
      const reduced = vrVal < 0;
      const label = `Visual Recoil${hasEstimatedEffect(['visualRecoil'], selectedAttachments, weapon) ? '*' : ''}`;
      const value = reduced ? 'Decreased' : 'Increased', color = reduced ? 'var(--green)' : 'var(--red)';
      chips.push(chipHtml({ label, value, color, desc: 'Visual recoil (camera shake) when firing. The size of the change is not modelled.',
        rows: contributions.filter(c => c.record?.visualRecoil).map(c => sourceRow(c, value, color)) }));
    }
    const regenDelayDelta = (cur._healthRegenDelayS ?? 0) - (base._healthRegenDelayS ?? 0);
    if (regenDelayDelta !== 0) {
      const label = `Enemy Health Regen${hasEstimatedEffect(['healthRegenDelayAddS'], selectedAttachments, weapon) ? '*' : ''}`;
      const value = signed(regenDelayDelta, 's', 0), color = regenDelayDelta > 0 ? 'var(--green)' : 'var(--red)';
      chips.push(chipHtml({ label, value, color,
        desc: `Delay before an enemy you hit starts regenerating health: ${cur._healthRegenDelayS}s, versus ${base._healthRegenDelayS}s with the default ammo. Longer is better.`,
        rows: contributions.filter(c => c.slot === 'ammo').map(c => sourceRow(c, value, color)) }));
    }
    if (cur._laserVisible != null) {
      const visible = cur._laserVisible;
      const label = `Laser Visibility${hasEstimatedEffect(['laserVisible'], selectedAttachments, weapon) ? '*' : ''}`;
      const value = visible ? 'Visible' : 'Not Visible', color = visible ? 'var(--red)' : 'var(--green)';
      chips.push(chipHtml({ label, value, color, desc: 'Whether enemies can see your laser.',
        rows: contributions.filter(c => c.record?.laserVisible != null).map(c => sourceRow(c, value, color)) }));
    }
    const accessory = ATT_BY_ID.ACCESSORIES[atts.accessory ?? 'none'];
    if (accessory?.scopeGlint === 'reduced') {
      // The source gives no defined glint quantity, so only the direction is shown.
      const value = 'Reduced', color = 'var(--green)';
      chips.push(chipHtml({ label: 'Scope Glint', value, color,
        desc: 'How visible your scope glint is to enemies. The coating reduces the visible cone of glint; the size of the change is not modelled.',
        rows: [{ name: escAttr(accessory.name), value, color }] }));
    }
    const grip = ATT_BY_ID.GRIPS[atts.grip ?? 'none'];
    if (grip?.stanceSway === 'reduced') {
      // The game files hold no value for this effect; the direction comes from the operator's jump recordings.
      const value = 'Reduced', color = 'var(--green)';
      chips.push(chipHtml({ label: 'Stance-Change Sway', value, color,
        desc: 'Weapon sway while changing stance (jumping, crouching, going prone) when aiming. The game files hold no value for this; in jump recordings the weapon dip fell to about 0.3x. The size of the change is not modelled.',
        rows: [{ name: escAttr(grip.name), value, color }] }));
    }
    Object.entries(cur._utilities ?? {}).forEach(([lbl, value]) => {
      chips.push(chipHtml({ label: escAttr(lbl), value: escAttr(value), color: 'var(--green)',
        desc: utilityTooltips[lbl] ?? `${lbl}: a capability added by the selected attachment.`,
        rows: contributions.filter(c => c.record?.utilities?.[lbl]).map(c => sourceRow(c, escAttr(c.record.utilities[lbl]), 'var(--green)')) }));
    });
    if (!chips.length && !bugs.length) return;
    rendered = true;
    const bugNotes = bugs.map(bug => `<div class="att-bug-note">${Loadout.GAME_BUG_MARK} <b>${escAttr(bug.attachmentName)}:</b> ${bug.suspected ? 'Likely bugged. ' : 'Bugged. '}${escAttr(bug.note)}</div>`).join('');
    html += `<div class="att-block"><div class="att-name ${colClass}">${badges ? badgeHtml(colClass === 'c2' ? 1 : 0) : ''}${weaponDisplayLabel(weapon)}</div>${chips.length ? `<div class="att-grid">${chips.join('')}</div>` : ''}${bugNotes}</div>`;
  });
  if (!rendered) html += '<div class="att-empty">No attachment stat changes</div>';
  el.innerHTML = html;
}

/**
 * Mirrors the plot's Angle Plot / Soldier Target tab strip so the stats column
 * swaps the same way the chart does. Impact stats only exist once the pattern
 * is projected onto a soldier, so that tab greys out in the angle view. The
 * pop-out stacks both blocks, so it has nothing to swap and gets no strip.
 */
function statsTabsHtml(active, impactEnabled) {
  const tab = (key, label, disabled, title) => {
    const on = active === key;
    return `<button class="rc-tab${on ? ' on' : ''}" type="button" role="tab" aria-selected="${on}"`
      + `${disabled ? ' disabled aria-disabled="true"' : ''} data-stats-tab="${key}" title="${title}">${label}</button>`;
  };
  return `<div class="rc-tabstrip rc-stats-tabstrip" role="tablist" aria-label="Stats view">`
    + tab('recoil', 'Recoil / Spread Stats', false, 'Show the recoil and spread stats for this loadout')
    + tab('impact', 'Target Impact Stats', !impactEnabled,
        impactEnabled ? 'Show the per-body-part damage breakdown' : 'Switch the plot to Soldier Target to see impact stats')
    + `</div>`;
}

let recoilPlotFrame = null;
function scheduleRecoilPlot() {
  if (recoilPlotFrame != null) return;
  recoilPlotFrame = requestAnimationFrame(() => {
    recoilPlotFrame = null;
    renderRecoil({ plotOnly: true });
  });
}

const recoilKey = (k, what) => `<span class="rc-key"><kbd>${k}</kbd>${what}</span>`;
// Mouse controls for the Angle Plot and Soldier Target, in the Firing Range's key-legend style.
function recoilPlotHint(view) {
  const isTarget = view === 'target';
  return [recoilKey('Ctrl+click', isTarget ? 'aim &amp; redraw' : 'redraw'),
    recoilKey('Shift+drag', 'pan'), recoilKey('Shift+scroll', 'zoom'),
    ...(isTarget ? [recoilKey('Ctrl+scroll', 'distance')] : [])].join('');
}

function renderRecoil({ plotOnly = false } = {}) {
  if (!document.getElementById('rcMain').clientWidth) return;
  if (recoilPlotFrame != null) cancelAnimationFrame(recoilPlotFrame);
  recoilPlotFrame = null;
  if (isTargetGeometry()) state.recoil.distance = snapTargetDistance(state.recoil.distance);
  scheduleUrlSync();
  const w1 = selectedSimBuild(state.slots[0]);
  let w2 = state.comparing ? selectedSimBuild(state.slots[1]) : null;
  if ([w1, w2].some(w => w && !validateWeaponSimulation(w))) {
    const canvas = document.getElementById('rcMain');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#aab7bb'; ctx.font = '14px sans-serif';
    ctx.fillText('Simulation unavailable: missing weapon data.', 20, 40);
    document.getElementById('rcStats').textContent = 'Simulation unavailable. Use View errors for details.';
    return;
  }
  const shotCount = selectedRecoilShotCount();
  // The base frame feeds the auto magnification, so it has to settle before
  // any of the control read-outs are written.
  if (isTargetGeometry()) computeTargetBaseFrame([w1, w2], shotCount);

  if (!plotOnly) renderAttachmentStats([
    { weapon: state.slots[0].weapon, atts: state.slots[0].atts, build: w1, colClass: 'c1' },
    { weapon: state.comparing ? state.slots[1].weapon : null, atts: state.slots[1].atts, build: w2, colClass: 'c2' },
  ]);

  const { aim, stance, layers, refSeed } = state.recoil;
  const pressed = (id, on) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', String(on));
  };
  pressed('rcModeScatter', layers.scatter);
  pressed('rcModeSpread', layers.spray);
  pressed('rcModePath', layers.path);
  pressed('rcSpreadToggleBtn', layers.spread);
  pressed('rcConeToggleBtn', layers.cone);
  pressed('rcAimAds', aim === 'ads');
  pressed('rcAimHip', aim === 'hip');
  pressed('rcStanceStand', stance === 'stand');
  pressed('rcStanceMove', stance === 'move');
  pressed('rcStanceMount', stance === 'mount');
  const crosshairToggle = document.getElementById('rcCrosshairToggle');
  if (crosshairToggle) {
    // The range draws its own live crosshair; its corner holds Reload and Clear instead.
    crosshairToggle.hidden = state.recoil.view === 'range';
    crosshairToggle.setAttribute('aria-pressed', String(state.recoil.crosshair));
    const label = `${state.recoil.crosshair ? 'Hide' : 'Show'} crosshair overlay`;
    crosshairToggle.title = label;
    crosshairToggle.setAttribute('aria-label', label);
  }
  const isTarget = isTargetGeometry();
  const targetControls = document.getElementById('rcTargetControls');
  if (targetControls) targetControls.hidden = !isTarget;
  const targetWidthInput = document.getElementById('rcTargetWidth');
  const targetHeightInput = document.getElementById('rcTargetHeight');
  const targetFovInput = document.getElementById('rcTargetFov');
  if (!targetDisplaySettingsLoaded) {
    targetDisplaySettingsLoaded = true;
    if (targetWidthInput) targetWidthInput.value = Math.max(1, Math.round(window.screen?.width || 1920));
    if (targetHeightInput) targetHeightInput.value = Math.max(1, Math.round(window.screen?.height || 1080));
    if (targetFovInput) targetFovInput.value = String(ADS_1X_HFOV_DEG);
    try {
      const storedWidth = Number(localStorage.getItem('bf6.targetResolutionWidth'));
      const storedHeight = Number(localStorage.getItem('bf6.targetResolutionHeight'));
      const storedFov = Number(localStorage.getItem('bf6.targetFov'));
      if (targetWidthInput && Number.isFinite(storedWidth) && storedWidth > 0) targetWidthInput.value = String(Math.round(storedWidth));
      if (targetHeightInput && Number.isFinite(storedHeight) && storedHeight > 0) targetHeightInput.value = String(Math.round(storedHeight));
      if (targetFovInput && Number.isFinite(storedFov) && storedFov >= 1 && storedFov <= 179) targetFovInput.value = String(Math.round(storedFov));
    } catch { /* localStorage may be unavailable in a restricted browser context. */ }
  }
  const isRange = state.recoil.view === 'range';
  Object.entries({ rcViewAngle: 'angle', rcViewTarget: 'target', rcViewRange: 'range' }).forEach(([id, view]) => {
    const tab = document.getElementById(id);
    if (!tab) return;
    const on = state.recoil.view === view;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', String(on));
  });
  const distanceField = document.getElementById('rcDistanceField');
  if (distanceField) distanceField.hidden = !isTarget;
  const zeroReadout = document.getElementById('rcZeroReadout');
  if (zeroReadout) zeroReadout.hidden = !isTarget || ![w1, w2].some(isZeroableWeapon);
  const zeroCycle = document.getElementById('rcZeroCycleBtn');
  if (zeroCycle) zeroCycle.textContent = `${state.recoil.zeroDistance} m`;
  if (!isTarget) document.getElementById('rcMain')?.classList.remove('aiming');
  const hint = document.getElementById('rcHint');
  recoilTouchControls?.sync();
  if (hint) {
    // The range lists its controls once, here, as a key legend; the canvas HUD
    // keeps only ammunition and the trigger mode.
    const key = recoilKey;
    // The same legend whether or not the plot holds the mouse; the banner on
    // the plot is what says to click in.
    const rangeHint = !firingRange?.supportsLock()
      ? 'Firing Range needs a browser with pointer capture and a mouse'
      : [key('Click', 'fire'), key('R', 'reload'), key('C', 'clear'), key('Esc', 'release'),
        key('Shift+drag', 'pan'), key('Shift+scroll', 'zoom'), key('Ctrl+scroll', 'distance')].join('');
    const touchHint = isRange ? null : recoilTouchControls?.hint();
    if (touchHint != null) { if (hint.textContent !== touchHint) hint.textContent = touchHint; }
    else {
      const nextHint = isRange ? rangeHint : recoilPlotHint(state.recoil.view);
      if (hint.innerHTML !== nextHint) hint.innerHTML = nextHint;
    }
  }
  // The hit-zone key sits in the footer strip, next to the dots it explains.
  const zoneLegend = document.getElementById('rcZoneLegend');
  if (zoneLegend) {
    if (!zoneLegend.innerHTML) {
      zoneLegend.innerHTML = RANGE_ZONE_LEGEND.map(([zone, label]) => `<span><i style="background:${RANGE_ZONE_COLORS[zone]}"></i>${label}</span>`).join('')
        + `<span><i class="miss" style="background:${RANGE_MISS_COLOR}"></i>Miss</span>`;
    }
    document.getElementById('rcZoneRow')?.toggleAttribute('hidden', !isRange);
  }
  const aimReadout = document.getElementById('rcAimReadout');
  // The range aims with the mouse, so the Soldier Target aim read-out is not shown there.
  if (aimReadout) aimReadout.hidden = state.recoil.view !== 'target';
  const aimText = document.getElementById('rcAimText');
  if (aimText) {
    const offset = currentAimOffset();
    aimText.textContent = state.recoil.targetAim === 'chest'
      ? 'Aim: center chest'
      : `Aim: ${(offset.x / 100).toFixed(2)} m, ${(offset.y / 100).toFixed(2)} m`;
    if (isTarget && w1) {
      const zero = zeroDistanceFor(w1);
      if (w1._projectileModel && zero != null) {
        const offset = targetVerticalOffsetMeters(w1);
        aimText.textContent += offset == null
          ? ` · drop unavailable at ${zero} m zero`
          : ` · ${Math.abs(offset).toFixed(2)} m from ${zero} m zero`;
      }
    }
  }
  const distanceRange = document.getElementById('rcDistanceRange');
  const distanceReadout = document.getElementById('rcDistanceReadout');
  if (distanceRange) {
    if (isTarget) {
      distanceRange.min = 0; distanceRange.max = TARGET_DISTANCE_LADDER.length - 1; distanceRange.step = 1;
      distanceRange.value = targetDistanceIndex(state.recoil.distance);
    } else {
      distanceRange.min = TARGET_DISTANCE_MIN; distanceRange.max = TARGET_DISTANCE_MAX; distanceRange.step = 5;
      distanceRange.value = Math.max(TARGET_DISTANCE_MIN, state.recoil.distance);
    }
    distanceRange.setAttribute('aria-valuetext', `${state.recoil.distance} m`);
    paintRange(distanceRange);
  }
  if (distanceReadout) distanceReadout.textContent = `${state.recoil.distance} m`;
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
    const sight = isTarget ? equippedSight() : null;
    const nonStandard = isTarget && magnificationIsNonStandard(magnification, sight);
    zoomReadout.textContent = isTarget ? `${magnification.toFixed(2)}×` : `±${fmtAxisDeg(state.recoil.scaleH)}°`;
    zoomReadout.classList.toggle('rc-zoom-override', nonStandard);
    zoomReadout.title = !isTarget ? 'Horizontal half-span of the plot, in degrees.'
      : nonStandard ? `Not the sight's zoom: the ${sight.name} shows ${sight.magnificationRange
        ? `${sight.magnificationRange[0].toFixed(2)}× to ${sight.magnificationRange[1].toFixed(2)}×`
        : `${sight.magnification.toFixed(2)}×`}. Reset the view to return to it.`
      : `Optic magnification${sight ? ` of the ${sight.name}` : ''}. The plot shows the same field a ${magnification.toFixed(2)}× sight would at this range.`;
  }
  // Off the sight's own zoom, a tick on the slider shows where it is. It is
  // placed after the read-out is written, since a wider read-out moves the slider.
  const zoomMark = document.getElementById('rcZoomMark');
  if (zoomMark && zoomRange) {
    const sight = isTarget ? equippedSight() : null;
    const show = !!sight && currentMagnification() !== sight.magnification;
    zoomMark.hidden = !show;
    if (show) {
      const min = +zoomRange.min, max = +zoomRange.max;
      const frac = max === min ? 0 : (magnificationIndex(sight.magnification) - min) / (max - min);
      const thumb = zoomRange.closest('.rc-touch-layout') ? 20 : 11;
      zoomMark.style.left = `${zoomRange.offsetLeft + thumb / 2 + frac * (zoomRange.offsetWidth - thumb)}px`;
      zoomMark.title = `${sight.name}: ${sight.magnification.toFixed(2)}×`;
    }
  }
  pressed('rcPlatformPc', state.recoil.platform === 'pc');
  pressed('rcPlatformConsole', state.recoil.platform === 'console');
  syncCompensationControls();

  const spreadPreset = document.getElementById('rcSpreadPreset');
  const shotsInput = document.getElementById('rcSpreadShotsInput');
  const bubblePresetGroup = document.querySelector('.rc-bubble-preset-group');
  if (bubblePresetGroup) bubblePresetGroup.hidden = !layers.spread;
  if (spreadPreset) {
    spreadPreset.value = state.recoil.spreadPreset;
    // Preserve the selected preset while the Bubbles overlay is toggled off.
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
  document.getElementById('rcOverlayGroup')?.toggleAttribute('hidden', isRange);
  document.getElementById('rcRangeActions')?.toggleAttribute('hidden', !isRange);
  document.getElementById('rcRangeTools')?.toggleAttribute('hidden', !isRange);
  renderRangeFireModes(isRange);
  // The range plot is capped to the viewport so the HUD, the soldier and the
  // controls above and below it stay on screen together while the cursor is gone.
  document.querySelector('.rc-layout')?.classList.toggle('rc-range-view', isRange);
  const sensGroup = document.getElementById('rcSensGroup');
  if (sensGroup) sensGroup.hidden = !isRange;
  const sensReadout = document.getElementById('rcSensReadout');
  if (sensReadout) sensReadout.hidden = !isRange;
  if (isRange) { loadSensSettings(); syncSensReadout(); }
  firingRange?.setActive(isRange);
  const axis = isRange
    ? firingRange.render()
    : drawRecoilFixed(document.getElementById('rcMain'), w1, w2, layers, refSeed);
  const noteEl = document.querySelector('.rc-note');
  const stateLabel = `${aim.toUpperCase()} / ${stance === 'move' ? 'MOV' : stance === 'mount' ? 'MNT' : 'STD'}`;
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
    const hasPellets = [w1, isRange ? null : w2].some(w => (w?.pellets ?? 1) > 1);
    const pelletNote = hasPellets && !isRange ? ' Each shell\'s pellets scatter inside the weapon\'s dispersion cone, as measured on the in-game wall; the scatter cloud shows pellets too, and the bubbles and cone cover the spread plus that cone.' : '';
    const rangePelletNote = hasPellets && isRange ? ' Each shell\'s pellets scatter inside the dashed ring, the spread plus the weapon\'s dispersion cone, as measured on the in-game wall.' : '';
    const layerNote = `Estimated pattern. Recoil recovery and shot distribution are not fully verified against the game. Showing ${activeLayers} (${stateLabel}). Scatter = ${CLOUD_RUNS} faded simulated sprays. Spray Pattern = solid reference dots.${pathNote}${spreadNote}${coneNote}`;
    if (isRange) {
      noteEl.textContent = `Live fire with your own mouse as the recoil control (${stateLabel}). The ring is the spread the next shot is sampled from.${rangePelletNote} Dots are coloured by hit zone; faded dots miss. Recoil recovery and shot distribution are not fully verified against the game. Hipfire cm/360 matches the in-game settings panel.`;
    } else if (axis.isTargetView) {
      const ringNote = layers.spray ? ' Solid dots hit the target; faded dots miss.' : '';
      noteEl.textContent = `${layerNote}${ringNote}${pelletNote}`;
    } else {
      noteEl.textContent = `${layerNote} View: ${fmtAxisDeg(axis.xMin)}°–${fmtAxisDeg(axis.xMax)}° H / ${fmtAxisDeg(axis.yMin)}°–${fmtAxisDeg(axis.yMax)}° V.${pelletNote}`;
    }
  }

  if (plotOnly) return;
  // Every distance change comes through a full render, so the markers follow it here.
  syncDistanceMarker();
  // The range fires only the first weapon, so its stats name and chart only that one.
  if (isRange) w2 = null;
  const compare = showsBadges() && !!w1 && !!w2;

  // The pop-out has room for both tables, so it stacks recoil/spread over the
  // impact breakdown instead of swapping one for the other.
  const stacksStats = document.body.classList.contains('is-popout');
  const isTargetView = !!axis?.isTargetView;
  // Impact stats need a projected target, so the angle view always falls back
  // to the recoil block no matter which tab was last picked.
  const activeStatsTab = isTargetView && state.recoil.targetStatsTab === 'impact' ? 'impact' : 'recoil';
  const tabsHtml = stacksStats ? '' : statsTabsHtml(activeStatsTab, isTargetView);
  const targetHtml = isRange
    ? rangeStatsHtml(axis)
    : isTargetView ? targetImpactStatsHtml(axis.targetHits, { distance: state.recoil.distance, showHeading: stacksStats,
      labelFor: (w, i) => (compare ? badgeHtml(i) : '') + loadoutHeadingHtml(w) }) : '';
  // The strip and the stats it labels share one bordered box, the same way the
  // plot's tabs and canvas do, so the selected tab sits on its own content.
  const statsEl = document.getElementById('rcStats');
  const boxed = body => tabsHtml ? `<div class="rc-stats-box">${tabsHtml}<div class="rc-stats-body">${body}</div></div>` : body;
  statsEl.classList.toggle('is-boxed', !!tabsHtml);
  if (targetHtml && !stacksStats && activeStatsTab === 'impact') {
    statsEl.innerHTML = boxed(targetHtml);
    return;
  }

  // Recoil / Spread stats panel
  // The Firing Range applies no compensation: the player's mouse is the control.
  const compPct = isRange ? 0 : selectedCompensationLevel() / 100;
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
        {
          const muz = ATT_BY_ID.MUZZLES[atts.muzzle] ?? MUZZLES[0];
          const grp = Loadout.resolveMountAttachments(atts, selW, _atts).grip;
          const ergo = ATT_BY_ID.ERGOS[atts.ergo ?? 'none'] ?? ERGOS[0];
          // Tier ladder: dirVar × dirVarMult ^ (dirVarExp + attachment tier mods)
          const adsG = selW.recoil?.[aim];
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
          varStep(muz.name, muz[aim + 'RecoilVariationTierMod'] ?? 0);
          varStep(grp.name, grp[aim + 'RecoilVariationTierMod'] ?? 0);
          varStep(ergo.name, ergo[aim + 'RecoilVariationTierMod'] ?? 0);
        }
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${weaponDisplayLabel(selW)}</div>` : '';
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
        const grp = Loadout.resolveMountAttachments(atts, selW, _atts).grip;
        const gripSelection = Loadout.attachmentSlots(selW, _atts).rail?.accepts.includes('grip')
          ? { rail: grp.id === 'none' ? null : { type: 'grip', id: grp.id } } : { grip: grp.id };
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
        if (grp.id !== 'none') try_(grp.name, { muzzle: muz.id, ...gripSelection });
        const defaultAmmo = WEAPON_AMMO[selW.id]?.def ?? 'standard';
        if ((atts.ammo ?? 'standard') !== defaultAmmo || (ammoObj.adsRecoilTierMod ?? 0) !== 0)
          try_(ammoObj.name, { muzzle: muz.id, ...gripSelection, ammo: ammoObj.id });
        if (ergoObj.id !== 'none' || (ergoObj.adsRecoilTierMod ?? 0) !== 0)
          try_(ergoObj.name, { muzzle: muz.id, ...gripSelection, ammo: ammoObj.id, ergo: ergoObj.id });
        if (state.recoil.platform === 'console') {
          const after = +(prev * CONSOLE_RECOIL_MULT).toFixed(2), d = +(after - prev).toFixed(2);
          lines.push(`<div class="rc-tt-row"><span>Console Recoil Reduction</span><span class="rc-tt-neg">−${Math.abs(d).toFixed(2)}°</span></div>`);
          prev = after;
        }
        const comp = +(prev * compPct).toFixed(2), effVal = +(prev - comp).toFixed(2);
        if (comp >= 0.005) lines.push(`<div class="rc-tt-row"><span>Recoil Compensation (${Math.round(compPct * 100)}%)</span><span class="rc-tt-neg">−${comp.toFixed(2)}°</span></div>`);
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${weaponDisplayLabel(selW)}</div>` : '';
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
      const base1 = w1 ? (aim === 'ads' ? (state.slots[0].weapon?.recoilIncAds ?? 0) : (state.slots[0].weapon?.spreadDyn?.hip?.inc ?? 0)) : null;
      const base2 = w2 ? (aim === 'ads' ? (state.slots[1].weapon?.recoilIncAds ?? 0) : (state.slots[1].weapon?.spreadDyn?.hip?.inc ?? 0)) : null;
      const ld = (eff, base) => eff != null && base != null ? { eff, wa: base, scale: 1 } : null;
      const ttHtml = (selW, w, atts, base, eff, colCls) => {
        if (!selW || !w) return '';
        const bar = ATT_BY_ID.BARRELS[atts.barrel] ?? BARRELS[0];
        const lines = [];
        const effectNames = [
          aim === 'ads' && bar.adsSpreadIncMult !== 1 && bar.adsSpreadIncMult != null ? bar.name : null,
          aim === 'ads' && ATT_BY_ID.AMMO[atts.ammo]?.adsSpreadDynOverride ? ATT_BY_ID.AMMO[atts.ammo].name : null,
          ATT_BY_ID.ERGOS[atts.ergo]?.[aim + 'SpreadDynOverride'] ? ATT_BY_ID.ERGOS[atts.ergo].name : null,
        ].filter(Boolean);
        if (eff !== base) {
          const d = +(eff - base).toFixed(3);
          if (Math.abs(d) >= 0.005) lines.push(`<div class="rc-tt-row"><span>${effectNames.join(' + ')}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`);
        }
        const wn = selW.name ? `<div class="rc-tt-wname ${colCls}">${weaponDisplayLabel(selW)}</div>` : '';
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
      const barScale = SPREAD_BAR_SCALE;
      const e1 = w1 ? effectiveSpreadMax(w1) : null;
      const e2 = w2 ? effectiveSpreadMax(w2) : null;
      const b1 = w1 ? spreadBounds(w1) : null, b2 = w2 ? spreadBounds(w2) : null;
      const mn1 = b1 ? b1[0] : null, mn2 = b2 ? b2[0] : null;
      const fmtR = (mn, mx) => mn != null && mx != null ? `${mn.toFixed(2)}° → ${mx.toFixed(2)}°` : null;
      const SAMPLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const sim1 = w1 ? simulateSpread(w1, 15) : null;
      const sim2 = w2 && state.comparing ? simulateSpread(w2, 15) : null;
      let tt = '';
      if (sim1 || sim2) {
        const aimLbl = aim === 'hip' ? 'Hipfire' : 'ADS';
        const stanceLbl = stance === 'move' ? 'Moving' : stance === 'mount' ? 'Mounted' : 'Standing';
        const spreadHdr = `Effective Spread (${aimLbl} | ${stanceLbl})`;
        const thW1 = state.slots[0].weapon ? `<th style="color:var(--accent)">${weaponDisplayLabel(state.slots[0].weapon)}</th>` : '';
        const thW2 = sim2 && state.slots[1].weapon ? `<th style="color:var(--accent2)">${weaponDisplayLabel(state.slots[1].weapon)}</th>` : '';
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
        barStart1: mn1 != null ? mn1 / barScale : null, bar1: e1 != null ? e1 / barScale : 0,
        barStart2: mn2 != null ? mn2 / barScale : null, bar2: e2 != null ? e2 / barScale : 0,
        tooltip: tt, col1: '#c9a227', col2: '#4d94d0',
      };
    })(),
  ];

  // With the strip present it already names the block, and the aim/stance it
  // describes is set by the controls right above it.
  // Mounted deploys the bipod or grip pod; without one the mount changes nothing.
  const mountNote = stance !== 'mount' ? ''
    : [w1, w2].filter(Boolean).some(hasDeployable) ? ' (bipod or grip pod deployed)' : ' (no bipod or grip pod: standing values)';
  const rcContext = `<div class="rc-stats-context">${aim === 'hip' ? 'Hipfire' : 'ADS'} · ${stance === 'move' ? 'Moving' : stance === 'mount' ? `Mounted${mountNote}` : 'Standing'}</div>`;
  // The loadouts the bars compare head the card, the way each impact table
  // names its own.
  let rowsHtml = '<div class="rc-stats-loadouts">' + [[w1, 'c1', 0], [w2, 'c2', 1]].filter(([w]) => w)
    .map(([w, cls, i]) => `<div class="target-impact-weapon ${cls}">${compare ? badgeHtml(i) : ''}${loadoutHeadingHtml(w)}</div>`).join('') + '</div>';
  stats.forEach(s => {
    if (s.val1 === null && s.val2 === null) return;
    rowsHtml += `<div class="rc-row"><div class="rc-lbl"><span>${s.lbl}</span><span>${[s.val1, s.val2].filter(Boolean).join(' / ')}</span></div>`;
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
    if (s.val1 != null) rowsHtml += renderBar(s.barStart1, s.bar1, s.col1, s.tick1 ?? null, s.layeredData1 ?? null);
    if (s.val2 != null) rowsHtml += renderBar(s.barStart2, s.bar2, s.col2, s.tick2 ?? null, s.layeredData2 ?? null);
    if (s.tooltip) rowsHtml += s.tooltip;
    rowsHtml += '</div>';
  });
  // Inside the box the rows get a card of their own, matching the sub-panel
  // each weapon's impact breakdown sits in.
  const html = tabsHtml
    ? `<section class="rc-stats-card">${rowsHtml}</section>`
    : `<div class="rc-stats-head" style="margin-bottom:9px"><div class="ptitle">Recoil / Spread Stats</div>${rcContext}</div>${rowsHtml}`;
  statsEl.innerHTML = stacksStats && targetHtml
    ? `${html}<div class="rc-stats-split"></div>${targetHtml}`
    : boxed(html);
}

// ── LOADOUT OVERLAY ───────────────────────────────────────────────────────────

let loadoutOverlayOpener = null;

function setLoadoutOverlay(open) {
  const shouldOpen = !!open;
  const panel = document.getElementById('loadoutPanel');
  const main = document.getElementById('main');
  const header = document.querySelector('header');
  if (shouldOpen) loadoutOverlayOpener = document.activeElement;
  document.body.classList.toggle('loadout-open', shouldOpen);
  document.getElementById('loadoutOpenBtn')?.setAttribute('aria-expanded', String(shouldOpen));
  if (panel) {
    if (shouldOpen) {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
    } else {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
    }
  }
  if (main) main.inert = shouldOpen;
  if (header) header.inert = shouldOpen;
  if (shouldOpen) {
    requestAnimationFrame(() => document.getElementById('loadoutCloseBtn')?.focus());
  } else if (loadoutOverlayOpener instanceof HTMLElement) {
    loadoutOverlayOpener.focus();
    loadoutOverlayOpener = null;
  }
}

// ── MOBILE TOOLTIPS ─────────────────────────────────────────────────────────────
// On touch devices (no hover), tapping an info card / chip shows its `title` text in
// a floating bubble, and tapping a recoil-stat row pins its rich breakdown popup.
// Desktop hover behavior is untouched (gated on `hover: none`).

// Attachment chip popovers open rightward; flip one leftward when it would pass
// the edge of the main column, which clips its overflow and, on a wide monitor,
// ends before the window does. The grid's column count varies with width, so
// this is measured.
function flipChipTooltip(chip) {
  const tt = chip?.querySelector('.att-tt');
  if (!tt) return;
  chip.classList.remove('tt-flip');
  const edge = chip.closest('.main')?.getBoundingClientRect().right ?? document.documentElement.clientWidth;
  if (tt.getBoundingClientRect().right > edge - 8) chip.classList.add('tt-flip');
}
['mouseover', 'focusin'].forEach(type => document.addEventListener(type, e => {
  const chip = e.target.closest?.('.att-chip');
  if (chip && !chip.contains(e.relatedTarget)) flipChipTooltip(chip);
}));

// ── HOVER TOOLTIPS ──────────────────────────────────────────────────────────────
// On hover devices every `title` shows in the site's own bubble instead of the
// browser's. The text moves to `data-tip` while the pointer is on the element,
// which is what keeps the browser's tooltip from appearing, and goes back to
// `title` on leave, so screen readers and the touch tap bubble still find it.
function initHoverTooltips() {
  if (matchMedia('(hover: none)').matches) return;
  const tip = document.createElement('div');
  tip.className = 'm-tip h-tip';
  document.body.appendChild(tip);
  let current = null;
  // The hovered element and every ancestor that also carries a title: the
  // browser would show the nearest one left in place (an attachment row
  // repeats its select's text), so all of them are held while the bubble is up.
  let held = [];
  let timer = null;

  const place = el => {
    const r = el.getBoundingClientRect();
    // Measured while shown at the origin: a hidden box has no size, and a
    // fixed box placed near the right edge shrinks to the room left there.
    tip.style.left = '0px'; tip.style.top = '0px';
    tip.classList.add('show');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    let left, top;
    if (el.dataset.tipSide === 'right') {
      // Beside a list item: past the list's own edge (and its scrollbar), top
      // aligned with the item, so the bubble covers none of the list.
      const box = (el.closest('.att-menu') ?? el).getBoundingClientRect();
      left = box.right + 2;
      if (left + tw > vw - 8) left = Math.max(8, box.left - tw - 2);
      top = Math.max(8, Math.min(r.top, vh - th - 8));
    } else {
      // Under the element from its left edge, as the attachment-effect popovers sit.
      left = Math.max(8, Math.min(r.left, vw - tw - 8));
      top = r.bottom + 6;
      if (top + th > vh - 8) top = Math.max(8, r.top - th - 6);
    }
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const hide = () => {
    clearTimeout(timer);
    timer = null;
    tip.classList.remove('show');
    for (const { el, text } of held) {
      if (!el.hasAttribute('title')) el.setAttribute('title', text);
      delete el.dataset.tip;
    }
    held = [];
    current = null;
  };
  const take = (el, delay) => {
    const text = el.getAttribute('title');
    if (!text) return;
    hide();
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const own = node.getAttribute('title');
      if (!own) continue;
      node.dataset.tip = own;
      node.removeAttribute('title');
      held.push({ el: node, text: own });
    }
    current = el;
    timer = setTimeout(() => {
      if (current !== el || !el.isConnected) return;
      if (el.dataset.tipHtml) tip.innerHTML = el.dataset.tipHtml;
      else tip.textContent = el.dataset.tip;
      place(el);
    }, delay);
  };

  document.addEventListener('mouseover', e => {
    // Inside a held element the title is already gone; stay on it.
    if (current && current.contains(e.target)) return;
    const el = e.target.closest?.('[title]');
    if (!el) return;
    take(el, 350);
  });
  document.addEventListener('mouseout', e => {
    if (current && !current.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', e => {
    if (current && current.contains(e.target)) return;
    const el = e.target.closest?.('[title]');
    // Not for the item the attachment list focuses as it opens: the pointer
    // has not reached the list yet.
    if (el && !el.closest('.att-menu')?.dataset.opening) take(el, 0);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('mousedown', hide, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  document.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}

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
    tip.classList.add('show');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left;
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - tw - 8));
    let top = r.bottom + 6;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 6);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };

  document.addEventListener('click', e => {
    if (!matchMedia('(hover: none)').matches) return;

    const row = e.target.closest('.rc-row, .att-chip');
    if (row && row.querySelector('.rc-tt')) {
      hideBubble();
      if (openRow === row) { closeRow(); }
      else { closeRow(); row.classList.add('tt-open'); openRow = row; flipChipTooltip(row); }
      return;
    }

    const info = e.target.closest('.scard[title], .wbadge[title], .wbadge-burst[title]');
    if (info) {
      closeRow();
      const text = info.getAttribute('title');
      if (text) {
        if (info.dataset.tipHtml) tip.innerHTML = info.dataset.tipHtml;
        else tip.textContent = text;
        positionBubble(info); tip.classList.add('show');
      }
      else hideBubble();
      return;
    }

    closeRow();
    hideBubble();
  });

  window.addEventListener('resize', () => { closeRow(); hideBubble(); });
}

// ── EVENT BINDING ─────────────────────────────────────────────────────────────

// ── SHARE MENU ────────────────────────────────────────────────────────────────

/** Flashes the outcome on the Share button, which owns the menu. */
function flashShare(text, ok) {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn._origText ??= btn.textContent;
  btn.textContent = text;
  btn.classList.toggle('copied', ok);
  clearTimeout(btn._resetTimer);
  btn._resetTimer = setTimeout(() => {
    btn.textContent = btn._origText;
    btn.classList.remove('copied');
  }, 1600);
}

async function copyShareLink() {
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
  flashShare(ok ? 'Link copied!' : 'Copy failed', ok);
}

/**
 * Whether the browser can put a PNG on the clipboard. Firefox has historically
 * shipped navigator.clipboard.write without image support, so the copy path
 * still falls back to a download if the write throws despite this check.
 */
const CAN_COPY_IMAGE = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

/** Downloads a rendered capture under the current loadout's name. */
function downloadCapture(blob) {
  const names = state.slots
    .slice(0, state.comparing ? 2 : 1)
    .map(s => s.weapon?.name);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = captureFilename(names);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/**
 * Renders the view and either copies or saves it.
 * @param {'copy'|'save'} mode Copy falls back to saving if the write fails.
 */
async function shareImage(item, mode) {
  const label = item.textContent;
  item.disabled = true;
  item.textContent = 'Rendering…';
  try {
    const blob = await captureView({ sidebar: !!document.getElementById('shareSidebarChk')?.checked });
    let copied = false;
    if (mode === 'copy' && CAN_COPY_IMAGE) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copied = true;
      } catch { /* fall through to download */ }
    }
    if (!copied) downloadCapture(blob);
    flashShare(copied ? 'Image copied!' : 'Image saved!', true);
  } catch {
    flashShare('Capture failed', false);
  } finally {
    item.disabled = false;
    item.textContent = label;
  }
}

function bindShareMenu() {
  const btn = document.getElementById('shareBtn');
  const menu = document.getElementById('shareMenu');
  if (!btn || !menu) return;

  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  };

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (menu.hidden) open(); else close();
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !menu.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); }
  });

  document.getElementById('shareLinkBtn')?.addEventListener('click', () => {
    close();
    copyShareLink();
  });
  const imgBtn = document.getElementById('shareImgBtn');
  // aria-disabled rather than disabled: the item stays focusable so its title
  // can explain why it is greyed out, so the handler has to guard the click.
  if (imgBtn && !CAN_COPY_IMAGE) {
    imgBtn.setAttribute('aria-disabled', 'true');
    imgBtn.title = 'This browser cannot copy images to the clipboard — use Save Image';
  }
  imgBtn?.addEventListener('click', e => {
    if (!CAN_COPY_IMAGE) return;
    close();
    shareImage(e.currentTarget, 'copy');
  });
  document.getElementById('shareSaveImgBtn')?.addEventListener('click', e => {
    close();
    shareImage(e.currentTarget, 'save');
  });
}

function bindEvents() {
  // Logo → home. Every loadout and view choice lives in the location hash, so
  // reloading the bare path is the one reset guaranteed to match a cold load
  // rather than a hand-rolled teardown that misses a slot or a cached build.
  const homeLink = document.getElementById('homeLink');
  if (homeLink) {
    const homeUrl = location.pathname;
    homeLink.href = homeUrl;
    homeLink.addEventListener('click', event => {
      // Leave new-tab, new-window and middle-click to the browser.
      if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // Already home: nothing selected and nothing in the URL to clear.
      if (!location.hash && !location.search) return;
      history.replaceState(null, '', homeUrl);
      location.reload();
    });
  }

  // Archive picker: choosing a version opens it. Reset to the placeholder when
  // the page comes back from the back/forward cache still showing that choice.
  const archiveSelect = document.getElementById('archiveSelect');
  if (archiveSelect) {
    archiveSelect.addEventListener('change', () => {
      if (archiveSelect.value) location.href = archiveSelect.value;
    });
    window.addEventListener('pageshow', () => { archiveSelect.selectedIndex = 0; });
  }

  // Compare toggle
  document.getElementById('cmpBtn').addEventListener('click', () => {
    state.comparing = !state.comparing;
    document.getElementById('cmpBtn').classList.toggle('on', state.comparing);
    document.getElementById('cmpBtn').setAttribute('aria-pressed', String(state.comparing));
    document.getElementById('cmpSection').style.display = state.comparing ? 'block' : 'none';
    if (!state.comparing) {
      state.slots[1].weapon = null;
      state.slots[1].atts = Loadout.blankAtts();
    }
    renderSidebar();
    renderStats();
  });
  // The empty page's example: a ready comparison, so a first visit sees what the page does.
  const exampleBtn = document.getElementById('emptyExampleBtn');
  const exampleWeapons = [W.find(w => w.id === 'm433'), W.find(w => w.id === 'ak4d')];
  if (exampleBtn && exampleWeapons.every(Boolean)) {
    exampleBtn.addEventListener('click', () => {
      exampleWeapons.forEach((weapon, i) => {
        const slot = state.slots[i];
        slot.cls = weapon.cls;
        slot.weapon = weapon;
        resetAttsForWeapon(slot.atts, weapon);
        slot.savedName = null;
      });
      state.comparing = true;
      document.getElementById('cmpBtn').classList.add('on');
      document.getElementById('cmpBtn').setAttribute('aria-pressed', 'true');
      document.getElementById('cmpSection').style.display = 'block';
      renderSidebar();
      renderStats();
    });
  } else if (exampleBtn) exampleBtn.hidden = true;
  document.getElementById('cloneLoadoutBtn').addEventListener('click', cloneCompareLoadout);
  bindChartTableHover();
  document.getElementById('swapLoadoutBtn')?.addEventListener('click', swapCompareLoadouts);

  // Share menu — copy the link, or a PNG of the whole view
  bindShareMenu();

  // Pop the pattern into its own window, carrying the current loadout and view
  // across in the hash so it opens on exactly what you were looking at.
  document.getElementById('rcPopoutBtn')?.addEventListener('click', () => {
    syncUrl();
    const url = `${location.pathname}?popout=1${location.hash}`;
    window.open(url, 'bf6-spray-popout', 'popup=yes,width=1100,height=980');
  });

  // In the popout the header is hidden, so the loadout panel gets its own
  // toggle beside the title. It docks rather than overlays, so unlike the
  // narrow-screen overlay it leaves the plot interactive while it is open.
  const popoutLoadoutBtn = document.getElementById('rcLoadoutBtn');
  popoutLoadoutBtn?.addEventListener('click', () => {
    const open = !document.body.classList.contains('popout-loadout');
    document.body.classList.toggle('popout-loadout', open);
    popoutLoadoutBtn.setAttribute('aria-expanded', String(open));
    // The label carries the affordance: this button sits where Pop Out does on
    // the dashboard, so it has to read as a panel toggle rather than a way back.
    const label = document.getElementById('rcLoadoutBtnText');
    if (label) label.textContent = open ? 'Hide Loadout' : 'Modify Loadout';
  });

  // Redraw when the plot column changes width, so a resize or a panel collapse
  // rescales the pattern instead of leaving a stretched bitmap.
  const plotCanvas = document.getElementById('rcMain');
  let lastPlotSize = '';
  const repaintIfResized = () => {
    if (!plotCanvas) return;
    const rect = plotCanvas.getBoundingClientRect();
    const size = `${Math.round(rect.width)}x${Math.round(rect.height)}@${window.devicePixelRatio}`;
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
  const desktopLoadout = matchMedia('(min-width: 981px)');
  desktopLoadout.addEventListener?.('change', () => {
    if (desktopLoadout.matches && document.body.classList.contains('loadout-open')) setLoadoutOverlay(false);
  });
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('loadout-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setLoadoutOverlay(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = document.getElementById('loadoutPanel');
    const focusable = [...panel.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')]
      .filter(el => el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Chart mode
  document.getElementById('modeDmg').addEventListener('click', () => setChartMode('dmg'));
  document.getElementById('modeBtk').addEventListener('click', () => setChartMode('btk'));
  document.getElementById('modeTtk').addEventListener('click', () => setChartMode('ttk'));
  document.getElementById('adsToggleBtn').addEventListener('click', toggleAdsToggle);
  document.getElementById('velToggleBtn').addEventListener('click', toggleVelToggle);
  document.getElementById('btkHsSelect').addEventListener('change', e => setBtkHS(+e.target.value));

  // Recoil aim / stance / control
  document.getElementById('rcAimAds').addEventListener('click', () => setRecoilAim('ads'));
  document.getElementById('rcAimHip').addEventListener('click', () => setRecoilAim('hip'));
  document.getElementById('rcStanceStand').addEventListener('click', () => setRecoilStance('stand'));
  document.getElementById('rcStanceMove').addEventListener('click', () => setRecoilStance('move'));
  document.getElementById('rcStanceMount').addEventListener('click', () => setRecoilStance('mount'));
  document.getElementById('rcViewAngle').addEventListener('click', () => setRecoilView('angle'));
  document.getElementById('rcViewTarget').addEventListener('click', () => setRecoilView('target'));
  document.getElementById('rcViewRange')?.addEventListener('click', () => setRecoilView('range'));
  Object.entries(SENS_INPUT).forEach(([key, id]) => {
    document.getElementById(id)?.addEventListener('input', e => {
      const value = Number(e.currentTarget.value);
      if (sensValueValid(key, value)) {
        try { localStorage.setItem(SENS_STORAGE[key], String(value)); } catch { /* storage is optional. */ }
      }
      syncSensReadout();
      refreshRangeStats();
    });
  });
  // The stats panel is rebuilt on every render, so the toggle is delegated.
  document.getElementById('rcStats').addEventListener('click', e => {
    const btn = e.target.closest('[data-stats-tab]');
    const tab = btn && !btn.disabled ? btn.dataset.statsTab : null;
    if (!tab || tab === state.recoil.targetStatsTab) return;
    state.recoil.targetStatsTab = tab;
    renderRecoil();
  });
  document.getElementById('rcPlatformPc').addEventListener('click', () => setRecoilPlatform('pc'));
  document.getElementById('rcPlatformConsole').addEventListener('click', () => setRecoilPlatform('console'));
  document.getElementById('rcZeroCycleBtn')?.addEventListener('click', cycleTargetZero);

  // Recoil overlays
  document.getElementById('rcModeScatter').addEventListener('click', () => toggleRecoilLayer('scatter'));
  document.getElementById('rcModeSpread').addEventListener('click', () => toggleRecoilLayer('spray'));
  document.getElementById('rcModePath').addEventListener('click', () => toggleRecoilLayer('path'));
  document.getElementById('rcConeToggleBtn').addEventListener('click', () => toggleRecoilLayer('cone'));
  document.getElementById('rcSpreadToggleBtn').addEventListener('click', () => toggleRecoilLayer('spread'));

  // Recoil canvas controls
  document.getElementById('rcResetView').addEventListener('click', resetRecoilView);
  document.getElementById('rcCrosshairToggle').addEventListener('click', toggleRecoilCrosshair);
  const recoilCanvas = document.getElementById('rcMain');
  recoilTouchControls = bindRecoilTouchControls({
    canvas: recoilCanvas, readView: () => state.recoil.view,
    readZoom: () => isTargetGeometry() ? currentMagnification() : state.recoil.scaleH,
    worldAt: (x, y) => canvasToWorld(x, y, recoilCanvas),
    transformView: (...args) => transformRecoilTouchView(...args, recoilCanvas),
    redraw: redrawRecoilSample, aim: fireAtAimPoint,
    resetView: resetRecoilFraming, repaint: renderRecoil,
    mouseHint: recoilPlotHint,
  });
  firingRange = createFiringRange({
    canvas: recoilCanvas,
    readBuild: () => selectedSimBuild(state.slots[0]),
    readSimKey: rangeSimKey,
    readDegreesPerCount: rangeDegreesPerCount,
    drawFrame: drawPlotFrame,
    requestStats: refreshRangeStats,
    requestHint: () => renderRecoil({ plotOnly: true }),
    readDistance: () => state.recoil.distance,
    onCycleFireMode: () => cycleFireMode(0),
  });
  document.getElementById('rcRangeReload')?.addEventListener('click', () => firingRange.reload());
  document.getElementById('rcRangeClear')?.addEventListener('click', () => firingRange.clear());
  // Dragging replaced the pan buttons, so the keyboard needs its own way in.
  recoilCanvas.addEventListener('keydown', e => {
    const pan = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
    if (pan) { e.preventDefault(); panRecoilView(pan); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); adjustRecoilScale('in'); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); adjustRecoilScale('out'); }
    else if (e.key === '0') {
      e.preventDefault();
      if (recoilTouchControls.isExpanded()) resetRecoilFraming();
      else resetRecoilView();
    }
  });
  // Mouse/pen modifier gestures stay unchanged. Touch is handled separately;
  // inline touches still belong to the browser's page scrolling.
  const CLICK_SLOP = 4;
  let recoilDrag = null;
  // Both plot gestures are modifier-gated, and the cursor names whichever one
  // is armed: Shift to pan or zoom, Ctrl to aim in Soldier Target.
  const setPanReady = on => recoilCanvas.classList.toggle('panready', on);
  const setAimReady = on => recoilCanvas.classList.toggle('aiming', on && state.recoil.view === 'target');
  const syncModifiers = e => { setPanReady(e.shiftKey); setAimReady(e.ctrlKey || e.metaKey); };
  document.addEventListener('keydown', syncModifiers);
  document.addEventListener('keyup', syncModifiers);
  window.addEventListener('blur', () => { setPanReady(false); setAimReady(false); });
  recoilCanvas.addEventListener('pointermove', syncModifiers);

  recoilCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    // The Firing Range owns plain clicks: they capture the pointer and fire.
    if (state.recoil.view === 'range' && !e.shiftKey) return;
    recoilDrag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, moved: false, pan: e.shiftKey };
    try { recoilCanvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (recoilDrag.pan) recoilCanvas.classList.add('dragging');
    e.preventDefault();
  });
  recoilCanvas.addEventListener('pointermove', e => {
    if (!recoilDrag || recoilDrag.pointerId !== e.pointerId) return;
    // Under pointer lock the client position freezes, so the drag follows the
    // raw movement instead.
    const locked = firingRange?.isLocked();
    const px = locked ? recoilDrag.x + (e.movementX || 0) : e.clientX;
    const py = locked ? recoilDrag.y + (e.movementY || 0) : e.clientY;
    const dx = px - recoilDrag.x;
    const dy = py - recoilDrag.y;
    recoilDrag.x = px;
    recoilDrag.y = py;
    if (Math.abs(px - recoilDrag.startX) > CLICK_SLOP || Math.abs(py - recoilDrag.startY) > CLICK_SLOP) {
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
    // Ctrl+click redraws in both views and also aims in Soldier Target.
    // Ordinary clicks do nothing; Shift stays reserved for panning.
    if (e.type !== 'pointerup' || !wasClick) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    if (state.recoil.view !== 'target') { redrawRecoilSample(); return; }
    const world = canvasToWorld(e.clientX, e.clientY, recoilCanvas);
    if (world) fireAtAimPoint(world.x, world.y);
  };
  recoilCanvas.addEventListener('pointerup', endRecoilDrag);
  recoilCanvas.addEventListener('pointercancel', endRecoilDrag);
  // Plain scrolling belongs to the page; zooming needs Shift so the chart
  // cannot swallow the wheel while someone is reading past it.
  recoilCanvas.addEventListener('wheel', e => {
    // Browsers remap a shifted wheel to the horizontal axis, so take whichever
    // delta actually carries the gesture.
    const delta = e.deltaY || e.deltaX;
    // Ctrl + wheel steps the target distance; preventDefault keeps the browser
    // from zooming the page while the pointer is over the plot.
    if (e.ctrlKey || e.metaKey) {
      if (!isTargetGeometry()) return;
      e.preventDefault();
      // Scroll up brings the target closer, matching zoom in on Shift + scroll.
      if (delta) stepTargetDistance(delta < 0 ? -1 : 1);
      return;
    }
    if (!e.shiftKey) return;
    e.preventDefault();
    if (firingRange?.isLocked()) { if (delta) adjustRecoilScale(delta < 0 ? 'in' : 'out'); return; }
    zoomRecoilAtPointer(delta, e.clientX, e.clientY, recoilCanvas);
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
  document.getElementById('rcCompRange')?.addEventListener('input', syncCompensationLevel);
  document.getElementById('rcDistanceRange')?.addEventListener('input', syncTargetDistance);
  document.getElementById('rcZoomRange')?.addEventListener('input', syncZoomFromSlider);
  document.getElementById('rcTargetWidth')?.addEventListener('input', e => {
    const value = Number(e.currentTarget.value);
    if (Number.isFinite(value) && value > 0) {
      try { localStorage.setItem('bf6.targetResolutionWidth', String(value)); } catch { /* storage is optional. */ }
    }
    renderRecoil();
  });
  document.getElementById('rcTargetHeight')?.addEventListener('input', e => {
    const value = Number(e.currentTarget.value);
    if (Number.isFinite(value) && value > 0) {
      try { localStorage.setItem('bf6.targetResolutionHeight', String(value)); } catch { /* storage is optional. */ }
    }
    renderRecoil();
  });
  document.getElementById('rcTargetFov')?.addEventListener('input', e => {
    const value = Number(e.currentTarget.value);
    if (Number.isFinite(value) && value >= 1 && value <= 179) {
      try { localStorage.setItem('bf6.targetFov', String(value)); } catch { /* storage is optional. */ }
    }
    renderRecoil();
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────

// Popout mode strips the dashboard down to the pattern and its controls.
if (new URLSearchParams(location.search).get('popout') === '1') {
  document.body.classList.add('is-popout');
}

_restoringUrl = true;
loadLockPreferences();
restoreFromUrl();
syncRangeCompare();
bindEvents();
renderSidebar();
renderStats();
_restoringUrl = false;
initMobileTooltips();
initHoverTooltips();
if (isTargetGeometry()) requestTargetImage();
