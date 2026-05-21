import {
  setSimContext, mulberry32, whash,
  recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
  selectedRecoilAmountFor, selectedRecoilVariationFor,
  spreadBounds, spreadDynamics, selectedSpreadIncFor,
  simulateBloom, shotIntervalAfter, isBurstGapAfter, genRecoilPts,
} from '../sim/core.js';
import { setAttachmentContext, applyAttachments, wLabel } from '../sim/applyAttachments.js';
import * as Loadout from '../sim/loadout.js';

// ── DATA FETCH ────────────────────────────────────────────────────────────────

const _v = Date.now();
let _dataLastModified = null;
const [W, _recoilDecay, _balance, _atts, _ammo] = await Promise.all([
  fetch(`./data/weapons.json?v=${_v}`).then(r => { _dataLastModified = r.headers.get('Last-Modified'); return r.json(); }),
  fetch(`./data/recoil_decay.json?v=${_v}`).then(r => r.json()),
  fetch(`./data/balance_tables.json?v=${_v}`).then(r => r.json()),
  fetch(`./data/attachments.json?v=${_v}`).then(r => r.json()),
  fetch(`./data/ammo.json?v=${_v}`).then(r => r.json()),
]);

// Update header date from the data file's Last-Modified header (set by GitHub Pages
// from the file's last commit date — updates automatically on every data push).
{
  const tag = document.querySelector('.hdr-tag');
  if (tag && _dataLastModified) {
    const d = new Date(_dataLastModified);
    const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const day = d.getUTCDate();
    const yr  = d.getUTCFullYear();
    const prefix = tag.textContent.replace(/\(Updated.*\)/, '').trim();
    tag.textContent = `${prefix} (Updated ${day} ${mon} ${yr})`;
  }
}

const { RECOIL_DEC, RECOIL_DEC_TEXP, RECOIL_DEC_EXP } = _recoilDecay;
const { RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
        BASE_HS_MULT, HP_HS_HIGH: _HP_HS_HIGH, MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
        ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS } = _balance;
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

const DEFAULT_COMPENSATION = 85;
const RECOIL_SCALE_MIN = 2;
const RECOIL_SCALE_MAX = 10;
const RECOIL_SCALE_STEP = 0.5;
const RECOIL_PAN_STEP = 0.5;
const CLOUD_RUNS = 10;
const BLOOM_FALLBACK_SHOTS = [1, 2, 3, 5, 8, 13, 20];
const SPREAD_EFFECTIVE_MAX_SHOTS = 50;
const SPREAD_BAR_SCALE = 9.1;
const RECOIL_BAR_SCALE = 3;

// ── APP STATE ─────────────────────────────────────────────────────────────────

const state = {
  slots: [
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts() },
    { cls: 'Assault Rifle', weapon: null, atts: Loadout.blankAtts() },
  ],
  comparing: false,
  chart: { mode: 'dmg', btkHS: 0, showAds: false },
  recoil: {
    aim: 'ads', stance: 'stand',
    layers: { scatter: true, spray: true, path: false, bloom: false, cone: false },
    control: false,
    compensationLevel: DEFAULT_COMPENSATION,
    refSeed: 0,
    scaleH: 5, panX: 0, panY: 0,
  },
};

let dmgChart = null;

// ── SIM CONTEXT INIT ──────────────────────────────────────────────────────────

setSimContext({
  aimState: 'ads', stanceState: 'stand',
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: selectedCompensationLevel,
});
setAttachmentContext({
  MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, WEAPON_MAG, WEAPON_ERGO,
  AMMO,
  RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
  BASE_HS_MULT, HP_HS_HIGH,
  MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
  ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS,
});

// ── DAMAGE HELPERS ────────────────────────────────────────────────────────────

function getDmg(weapon, range) {
  const pts = weapon.dmg;
  let d = pts[0].d;
  for (let i = 0; i < pts.length; i++) {
    if (range >= pts[i].r) d = pts[i].d;
  }
  return d;
}
function getBTK(weapon, range) {
  const d = weapon.pellets ? getDmg(weapon, range) * weapon.pellets : getDmg(weapon, range);
  return Math.ceil(100 / d);
}
function getBTKWithHS(weapon, range, headshots) {
  const d = weapon.pellets ? getDmg(weapon, range) * weapon.pellets : getDmg(weapon, range);
  if (!headshots) return Math.ceil(100 / d);
  const hsMult = weapon._hsMult ?? 1.34;
  const minPureHS = Math.ceil(100 / (d * hsMult));
  if (minPureHS <= headshots) return minPureHS;
  const remaining = 100 - headshots * d * hsMult;
  return headshots + Math.ceil(remaining / d);
}
function getTTK(weapon, btk) {
  if (!weapon.rpm) return null;
  let ms = 0;
  for (let i = 1; i < btk; i++) ms += shotIntervalAfter(weapon, i) * 1000;
  return Math.round(ms);
}
function fmtTTK(ms) {
  return ms === null ? '—' : ms === 0 ? '0ms' : ms + 'ms';
}
function maxRange(weapons) {
  const cls = weapons.filter(Boolean).map(w => w.cls);
  if (cls.includes('Sniper Rifle')) return 275;
  if (cls.includes('DMR')) return 130;
  if (cls.includes('Shotgun')) return 55;
  return 90;
}
function btkRanges(w1, w2) {
  const cls = [w1, w2].filter(Boolean).map(w => w.cls);
  if (cls.includes('Sniper Rifle')) return [0, 25, 50, 100, 150, 200, 250];
  if (cls.includes('DMR'))          return [0, 15, 30, 50, 75, 100];
  if (cls.every(c => c === 'Shotgun')) return [0, 5, 10, 15, 20, 25, 30];
  if (cls.includes('Shotgun'))      return [0, 5, 10, 15, 20, 25, 30, 50, 75];
  return [0, 10, 20, 30, 40, 50, 75];
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
  return state.recoil.control ? state.recoil.compensationLevel : 0;
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
    const vs = document.createElement('span'); vs.style.cssText = 'color:var(--muted);margin:0 3px'; vs.textContent = 'vs'; hdr.appendChild(vs);
    const s = document.createElement('span'); s.className = 'wname2'; s.textContent = wLabel(w2); hdr.appendChild(s);
    const b = document.createElement('span'); b.className = 'wbadge'; b.textContent = w2.cls; hdr.appendChild(b);
    appendFireModeBadge(w2, hdr);
  }

  const grid = document.getElementById('sGrid');
  grid.innerHTML = '';
  const primary = w1 || w2;
  const fields = [
    { lbl: 'Base Dmg',    compute: w => getDmg(w, 0),                    unit: '',    fmt: v => v.toFixed(1),                       higherBetter: true,
      tooltip: 'Damage dealt by one body shot at 0m before range falloff.' },
    { lbl: 'HS Mult',     k: '_hsMult',                                  unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true,
      tooltip: 'Headshot damage multiplier after ammo effects are applied.' },
    { lbl: 'Fire Rate',   k: 'rpm',                                      unit: 'RPM', fmt: v => v ?? '—',                            higherBetter: true,
      tooltip: 'Weapon fire rate in rounds per minute.' },
    { lbl: 'Bullet Vel',  k: 'bulletVel',                                unit: 'm/s', fmt: v => v ?? '—',                            higherBetter: true,
      tooltip: 'Projectile velocity after barrel effects are applied. Higher values reduce travel time and lead.' },
    { lbl: 'ADS Time',    compute: w => w._adsTimeMs ?? w.adsTime,       unit: 'ms',  fmt: v => v != null ? v : '—',                 lowerBetter: true, group: 'mobility',
      tooltip: 'Time to aim down sights. Can be affected by magazine, barrel, and grip selections.',
      estFn: w => !w._adsTimeMs && w.adsTime != null },
    { lbl: 'ADS Mov Spd', k: '_adsMoveSpeedMult',                        unit: '×',   fmt: v => v != null ? v.toFixed(2) : '—',      higherBetter: true, group: 'mobility',
      tooltip: 'Movement speed multiplier while aiming down sights. Can be affected by magazine, grip, and ammo selections.' },
    { lbl: 'Draw Spd',    k: '_sprintRecoveryMs',                        unit: 'ms',  fmt: v => v != null ? v : '—',                 lowerBetter: true, group: 'mobility',
      tooltip: 'Sprint-to-fire recovery time after magazine and ergonomics effects. Lower is faster.' },
    { lbl: 'Mag Size',    k: 'mag',                                      unit: 'rds', fmt: v => v,                                   higherBetter: true,
      tooltip: 'Rounds available in the selected magazine.' },
    { lbl: 'Tac Reload',  k: 'tacRld',                                   unit: 's',   fmt: v => v != null ? (+v).toFixed(3) : '—',   lowerBetter: true,
      tooltip: 'Tactical reload time in seconds, using the selected magazine and Mag Catch when applicable.' },
    { lbl: 'Draw Spd', k: 'deployT',                                  unit: 's',   fmt: v => v != null ? v.toFixed(2) : '—',     lowerBetter: true,
      tooltip: 'Sprint to fire time. Lower is faster.' },
    { lbl: 'Recoil/Shot', k: 'recoilV',                                  unit: '°',   fmt: v => v.toFixed(2),                        lowerBetter: true, group: 'recoil',
      tooltip: 'ADS vertical recoil added per shot after ADS recoil-tier attachment effects.' },
    { lbl: 'Recoil Dir',  k: 'recoilDir',                                unit: '°',   fmt: v => ((-v) >= 0 ? '+' : '') + (-v),       absDiff: true, group: 'recoil',
      tooltip: 'Average recoil direction from vertical. Positive values pull right; negative values pull left.' },
    { lbl: 'Mov ADS Sprd', k: '_movingAdsMinSpreadDeg',                  unit: '°',   fmt: v => v != null ? v.toFixed(2) : '0.32',   lowerBetter: true, group: 'recoil',
      tooltip: 'ADS spread while moving. Lower is more accurate. Can be affected by laser and barrel selections.' },
    { lbl: '3D/Map Spot', compute: w => ({ spot: w._worldSpot, minimap: w._minimapSpot }), unit: '',
      fmt: obj => { const s = obj && obj.spot > 0 ? `${obj.spot}<span class="sunit">m</span>` : '–'; const m = obj && obj.minimap > 0 ? `${obj.minimap}<span class="sunit">m</span>` : '–'; return `${s}<span class="sunit"> / </span>${m}`; },
      noDiff: true,
      tooltip: 'Distance at which you are spotted in the 3D world and on the minimap while firing. "–" means you are never 3D spotted.' },
  ];
  if (primary.pellets) fields.splice(4, 0, { lbl: 'Pellets', k: 'pellets', unit: '', fmt: v => v,
    tooltip: 'Number of pellets fired per shot. Shotgun damage is pellet damage multiplied by this count.' });

  fields.forEach(f => {
    const card = document.createElement('div');
    card.className = 'scard' + (f.group ? ' stat-group' : '');
    if (f.tooltip) card.title = f.tooltip;
    card.innerHTML = `<div class="slbl">${f.lbl}</div>`;
    const getVal = w => f.compute ? f.compute(w) : w?.[f.k];
    const isEst = w => f.estFn ? f.estFn(w) : f.est;
    if (!w2 || !state.comparing) {
      const wx = w1 || w2;
      const v = getVal(wx);
      card.innerHTML += `<div class="sval c1">${f.fmt(v)}<span class="sunit">${f.unit}</span>${isEst(wx) ? '<span class="sest">est</span>' : ''}</div>`;
    } else {
      const v1 = w1 ? getVal(w1) : null, v2 = w2 ? getVal(w2) : null;
      let diff = '';
      if (!f.noDiff && v1 != null && v2 != null && v1 !== v2) {
        if (f.absDiff) {
          const delta = Math.round(v2 - v1);
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
      card.innerHTML += `<div class="scmp"><div class="scmp-row"><span class="sval c1">${v1 != null ? f.fmt(v1) : '—'}<span class="sunit">${f.unit}</span>${est1 ? '<span class="sest">est</span>' : ''}</span></div><div class="scmp-row"><span class="sval c2">${v2 != null ? f.fmt(v2) : '—'}<span class="sunit">${f.unit}</span>${est2 ? '<span class="sest">est</span>' : ''}</span>${diff}</div></div>`;
    }
    grid.appendChild(card);
  });
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

function registerTooltipPositioners() {
  if (!Chart.Tooltip.positioners.smartFloat) {
    Chart.Tooltip.positioners.smartFloat = function(elements, eventPos) {
      const ca = this.chart.chartArea;
      if (!ca) return false;
      const ys = elements.map(e => e.element.y);
      const minY = ys.length ? Math.min(...ys) : (ca.top + ca.bottom) / 2;
      const maxY = ys.length ? Math.max(...ys) : (ca.top + ca.bottom) / 2;
      const half = 48, gap = 8;
      let y = minY - gap - half;
      if (y < ca.top + half) y = maxY + gap + half;
      y = Math.min(Math.max(y, ca.top + half), ca.bottom - half);
      return { x: Math.min(Math.max(eventPos.x, ca.left), ca.right), y };
    };
  }
  if (!Chart.Tooltip.positioners.smartFloatFiltered) {
    Chart.Tooltip.positioners.smartFloatFiltered = function(elements, eventPos) {
      const ca = this.chart.chartArea;
      if (!ca) return false;
      const weaponEls = elements.filter(el => !this.chart.data.datasets[el.datasetIndex]?.borderDash);
      const src = weaponEls.length ? weaponEls : elements;
      const ys = src.map(e => e.element.y);
      const minY = ys.length ? Math.min(...ys) : (ca.top + ca.bottom) / 2;
      const maxY = ys.length ? Math.max(...ys) : (ca.top + ca.bottom) / 2;
      const half = 48, gap = 8;
      let y = minY - gap - half;
      if (y < ca.top + half) y = maxY + gap + half;
      y = Math.min(Math.max(y, ca.top + half), ca.bottom - half);
      return { x: Math.min(Math.max(eventPos.x, ca.left), ca.right), y };
    };
  }
}

function renderChart() {
  registerTooltipPositioners();

  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;
  const { mode, btkHS, showAds } = state.chart;
  const mr = maxRange([w1, w2]);
  const labels = []; for (let r = 0; r <= mr; r++) labels.push(r);
  const ctx = document.getElementById('dmgChart');

  if (mode === 'btk') {
    const btkDs = (w, color, label, slot, headshots = btkHS, baseline = false) => ({
      label, data: labels.map(r => getBTKWithHS(w, r, headshots)),
      borderColor: color, backgroundColor: 'transparent',
      borderWidth: baseline ? 1.5 : 2, borderDash: baseline ? [6, 5] : undefined,
      pointRadius: 0, tension: 0, stepped: 'before',
      isBaseline: baseline, _weaponSlot: slot, _weapon: w,
    });
    const datasets = [];
    if (btkHS > 0 && w1) datasets.push(btkDs(w1, 'rgba(201,162,39,0.28)', `${wLabel(w1)} (0 HS)`, 1, 0, true));
    if (btkHS > 0 && w2) datasets.push(btkDs(w2, 'rgba(77,148,208,0.28)', `${wLabel(w2)} (0 HS)`, 2, 0, true));
    if (w1) datasets.push(btkDs(w1, '#c9a227', wLabel(w1), 1));
    if (w2) datasets.push(btkDs(w2, '#4d94d0', wLabel(w2), 2));
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { bottom: 0 } },
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, position: 'smartFloat', yAlign: 'center', caretSize: 0, filter: i => !i.dataset.isBaseline, callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          label: i => { const w = i.dataset._weapon; const btk = i.raw; return `${w.name}: ${btk} BTK (${fmtTTK(getTTK(w, btk))})`; },
        } } },
        scales: {
          x: { title: { display: true, text: 'Range (m)', color: '#7a8a8a', font: { size: 11 }, padding: { top: 4, bottom: 0 } }, ticks: { color: '#7a8a8a', maxTicksLimit: 10 }, grid: { color: 'rgba(40,48,48,0.6)' } },
          y: { min: 1, max: 9, title: { display: true, text: 'Bullets to Kill', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a', stepSize: 1, precision: 0 }, grid: { color: 'rgba(40,48,48,0.6)' } },
        },
      },
    });
    return;
  }

  if (mode === 'ttk') {
    const ttkDs = (w, color, label) => ({
      label, data: labels.map(r => {
        const btk = getBTKWithHS(w, r, btkHS);
        return (getTTK(w, btk) ?? 0) + (showAds ? (w._adsTimeMs ?? 0) : 0);
      }),
      borderColor: color, backgroundColor: 'transparent',
      borderWidth: 2, pointRadius: 0, tension: 0, stepped: 'before', _weapon: w,
    });
    const datasets = [];
    if (w1) datasets.push(ttkDs(w1, '#c9a227', wLabel(w1)));
    if (w2) datasets.push(ttkDs(w2, '#4d94d0', wLabel(w2)));
    const allVals = datasets.flatMap(d => d.data).filter(v => v > 0);
    const yMax = allVals.length ? Math.ceil(Math.max(...allVals) / 100) * 100 + 100 : 1000;
    updateDmgChart(ctx, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { bottom: 0 } },
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, position: 'smartFloat', yAlign: 'center', caretSize: 0, callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          label: i => {
            const w = i.dataset._weapon;
            const btk = getBTKWithHS(w, i.dataIndex, btkHS);
            const ttk = getTTK(w, btk);
            if (showAds && w._adsTimeMs) return `${w.name}: ${fmtTTK(i.raw)} (${fmtTTK(ttk)} TTK + ${w._adsTimeMs}ms ADS)`;
            return `${w.name}: ${fmtTTK(i.raw)} (${btk} BTK)`;
          },
        } } },
        scales: {
          x: { title: { display: true, text: 'Range (m)', color: '#7a8a8a', font: { size: 11 }, padding: { top: 4, bottom: 0 } }, ticks: { color: '#7a8a8a', maxTicksLimit: 10 }, grid: { color: 'rgba(40,48,48,0.6)' } },
          y: { min: 0, max: yMax, title: { display: true, text: showAds ? 'ADS + Time to Kill (ms)' : 'Time to Kill (ms)', color: '#7a8a8a', font: { size: 11 } }, ticks: { color: '#7a8a8a', stepSize: 100 }, grid: { color: 'rgba(40,48,48,0.6)' } },
        },
      },
    });
    return;
  }

  // Damage chart
  const buildDs = (w, color, label) => ({
    label, data: labels.map(r => +(Math.min(100, w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r)).toFixed(2))),
    borderColor: color, backgroundColor: 'transparent',
    borderWidth: 2, pointRadius: 0, tension: 0, stepped: 'before', _weapon: w,
  });
  const primaryW = w1 || w2;
  const thresholds = []; const seen = new Set();
  for (let r = 0; r <= mr; r++) { const btk = getBTK(primaryW, r); if (!seen.has(btk)) { seen.add(btk); thresholds.push({ btk, dmg: 100 / btk }); } }
  const threshDs = thresholds.slice(0, 6).map(t => ({
    label: `${t.btk}BTK`, data: labels.map(() => +(100 / t.btk).toFixed(2)),
    borderColor: 'rgba(150,150,150,0.18)', backgroundColor: 'transparent',
    borderWidth: 1, borderDash: [4, 4], pointRadius: 0, tension: 0,
  }));
  const datasets = [...threshDs];
  if (w1) datasets.push(buildDs(w1, '#c9a227', wLabel(w1)));
  if (w2) datasets.push(buildDs(w2, '#4d94d0', wLabel(w2)));
  const maxDmg = Math.max(0, ...[w1, w2].filter(Boolean).flatMap(w => labels.map(r => w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r))));
  const dmgYMax = maxDmg >= 50 ? 100 : 50;
  updateDmgChart(ctx, {
    type: 'line', data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      layout: { padding: { bottom: 0 } },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, position: 'smartFloatFiltered', yAlign: 'center', caretSize: 0,
        filter: i => !i.dataset.borderDash,
        callbacks: {
          title: items => 'Range: ' + (items[0]?.label ?? '') + 'm',
          label: i => { if (i.dataset.borderDash) return null; const r = i.dataIndex; const w = i.dataset._weapon; const d = w.pellets ? getDmg(w, r) * w.pellets : getDmg(w, r); return `${w.name}: ${d.toFixed(1)} dmg (${Math.ceil(100 / d)} BTK)`; },
        },
      } },
      scales: {
        x: { title: { display: true, text: 'Range (m)', color: '#7a8a8a', font: { size: 11 }, padding: { top: 4, bottom: 0 } }, ticks: { color: '#7a8a8a', maxTicksLimit: 10 }, grid: { color: 'rgba(40,48,48,0.6)' } },
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
  let prev1 = null, prev2 = null;
  ranges.forEach(r => {
    html += `<tr><td class="rng">${r}m</td>`;
    if (w1) { const b = getBTKWithHS(w1, r, btkHS), t = getTTK(w1, b), chg = prev1 !== null && b !== prev1; html += `<td class="bv${chg ? ' bchg' : ''}">${b}</td><td class="tv">${fmtT(w1, t)}</td>`; prev1 = b; }
    if (w2) { const b = getBTKWithHS(w2, r, btkHS), t = getTTK(w2, b), chg = prev2 !== null && b !== prev2; html += `<td class="bv${chg ? ' bchg2' : ''}">${b}</td><td class="tv">${fmtT(w2, t)}</td>`; prev2 = b; }
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('btkArea').innerHTML = html;
}

// ── RECOIL / BLOOM ────────────────────────────────────────────────────────────

function parseBloomBulletSpec(spec, shotCount) {
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
function getBloomBulletIdxs(N) {
  const input = document.getElementById('rcBloomShotsInput');
  const values = parseBloomBulletSpec(input?.value ?? '', N);
  const bullets = values.length ? values : BLOOM_FALLBACK_SHOTS.filter(v => v <= N);
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
  const titleCount = document.getElementById('rcShotTitleCount');
  if (titleCount) titleCount.textContent = count;
  renderRecoil();
}

function setRecoilControl(value) {
  state.recoil.control = !!value;
  syncCompensationControls();
  renderRecoil();
}
function syncCompensationControls() {
  const { control, compensationLevel } = state.recoil;
  const visibleValue = control ? compensationLevel : 0;
  document.getElementById('rcControlOff')?.classList.toggle('on', !control);
  document.getElementById('rcControlOn')?.classList.toggle('on', control);
  const row = document.getElementById('rcCompRow');
  const range = document.getElementById('rcCompRange');
  const input = document.getElementById('rcCompInput');
  row?.classList.toggle('disabled', !control);
  if (range) { range.disabled = !control; range.value = visibleValue; }
  if (input) { input.disabled = !control; input.value = visibleValue; }
}
function syncCompensationLevel(source = 'input') {
  const el = document.getElementById(source === 'range' ? 'rcCompRange' : 'rcCompInput');
  const raw = +(el?.value ?? DEFAULT_COMPENSATION);
  state.recoil.compensationLevel = Math.max(0, Math.min(125, Math.round(Number.isFinite(raw) ? raw : DEFAULT_COMPENSATION)));
  syncCompensationControls();
  renderRecoil();
}
function toggleRecoilLayer(layer) {
  if (!(layer in state.recoil.layers)) return;
  state.recoil.layers[layer] = !state.recoil.layers[layer];
  const l = state.recoil.layers;
  if (!l.scatter && !l.spray && !l.path && !l.bloom && !l.cone) l[layer] = true;
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
function randomizeRecoilReference() {
  state.recoil.refSeed = (Math.random() * 0x100000000) >>> 0;
  renderRecoil();
}
function resetRecoilReference() {
  state.recoil.refSeed = 0;
  renderRecoil();
}
function adjustRecoilScale(dir) {
  state.recoil.scaleH += dir === 'in' ? -RECOIL_SCALE_STEP : RECOIL_SCALE_STEP;
  state.recoil.scaleH = Math.max(RECOIL_SCALE_MIN, Math.min(RECOIL_SCALE_MAX, state.recoil.scaleH));
  renderRecoil();
}
function resetRecoilView() {
  state.recoil.scaleH = 5; state.recoil.panX = 0; state.recoil.panY = 0;
  renderRecoil();
}
function panRecoilView(dir) {
  if (dir === 'left')  state.recoil.panX -= RECOIL_PAN_STEP;
  if (dir === 'right') state.recoil.panX += RECOIL_PAN_STEP;
  if (dir === 'up')    state.recoil.panY += RECOIL_PAN_STEP;
  if (dir === 'down')  state.recoil.panY -= RECOIL_PAN_STEP;
  renderRecoil();
}

function recoilXMin() { return -state.recoil.scaleH + state.recoil.panX; }
function recoilXMax() { return  state.recoil.scaleH + state.recoil.panX; }
function recoilYMin() { return -1 + state.recoil.panY; }
function recoilYMax() { return (state.recoil.scaleH * 2 - 1) + state.recoil.panY; }
function fmtAxisDeg(v) { return v.toFixed(1).replace('.0', ''); }
function normalizeDegrees(deg) { return ((deg % 360) + 360) % 360; }
function signedOppositeDegrees(deg) {
  const n = normalizeDegrees(deg + 180);
  return n > 180 ? n - 360 : n;
}

function selectedEffectiveSpreadMax(w) {
  const dyn = spreadDynamics(w);
  const [baseline, sMax] = spreadBounds(w);
  const sInc = selectedSpreadIncFor(w);
  if (sInc === 0) return baseline;
  const firingCoef = dyn.firingCoef ?? 0, firingExp = dyn.firingExp ?? 1;
  const firingOffset = (dyn.firingOffset ?? 0) * (1 + (state.recoil.aim === 'ads' ? (w._adsSpreadDecayBoost ?? 0) : (w._hipSpreadDecayBoost ?? 0)));
  const notFiringCoef = dyn.notFiringCoef ?? firingCoef;
  const notFiringExp = dyn.notFiringExp ?? firingExp;
  const notFiringOffset = dyn.notFiringOffset ?? firingOffset;
  const dt = 1 / 60;
  const clamp = v => Math.min(Math.max(v, baseline), sMax);
  const applyRecovery = (s, seconds, coef, exp_, offset) => {
    let rem = seconds;
    while (rem > 1e-12) { const step = Math.min(dt, rem); s = clamp(s - step * (coef * Math.pow(Math.max(s - baseline, 0), exp_) + offset)); rem -= step; }
    return s;
  };
  let s = baseline;
  for (let i = 0; i < SPREAD_EFFECTIVE_MAX_SHOTS; i++) {
    s = clamp(s + sInc);
    const shotIdx = i + 1;
    const T = shotIntervalAfter(w, shotIdx);
    if (isBurstGapAfter(w, shotIdx)) {
      const firingTime = Math.min(60 / (w.rpm ?? 600), T);
      const notFiringTime = Math.max(0, T - firingTime);
      s = applyRecovery(s, firingTime, firingCoef, firingExp, firingOffset);
      s = applyRecovery(s, notFiringTime, notFiringCoef, notFiringExp, notFiringOffset);
    } else {
      s = applyRecovery(s, T, firingCoef, firingExp, firingOffset);
    }
  }
  return +s.toFixed(3);
}
function selectedRecoilDirectionFor(w) { return recoilGroup(w).dir ?? w.recoilDir ?? 0; }

function drawRecoilFixed(canvas, weapon1, weapon2, layers, refSeed = 0) {
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const PL = 28, PR = 8, PT = 8, PB = 18;
  const PW = CW - PL - PR, PH = CH - PT - PB;
  const N = selectedRecoilShotCount();
  const xMin = recoilXMin(), xMax = recoilXMax();
  const yMin = recoilYMin(), yMax = recoilYMax();
  const toX = xDeg => PL + ((xDeg - xMin) / (xMax - xMin)) * PW;
  const toY = yDeg => PT + PH - ((yDeg - yMin) / (yMax - yMin)) * PH;

  ctx.fillStyle = '#080d0d'; ctx.fillRect(0, 0, CW, CH);

  const vMin1 = Math.ceil(yMin), vMax1 = Math.floor(yMax);
  const hMin1 = Math.ceil(xMin), hMax1 = Math.floor(xMax);
  ctx.strokeStyle = 'rgba(40,52,52,0.6)'; ctx.lineWidth = 0.4;
  for (let v = vMin1; v <= vMax1; v++) { const y = toY(v); ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + PW, y); ctx.stroke(); }
  for (let h = hMin1; h <= hMax1; h++) { const x = toX(h); ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + PH); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(150,165,165,0.6)'; ctx.lineWidth = 1.5;
  if (xMin <= 0 && xMax >= 0) { ctx.beginPath(); ctx.moveTo(toX(0), PT); ctx.lineTo(toX(0), PT + PH); ctx.stroke(); }
  if (yMin <= 0 && yMax >= 0) { ctx.beginPath(); ctx.moveTo(PL, toY(0)); ctx.lineTo(PL + PW, toY(0)); ctx.stroke(); }

  const ox = toX(0), oy = toY(0);
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(100,120,120,0.75)'; ctx.font = '9px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = vMin1; v <= vMax1; v++) ctx.fillText(v + '°', PL - 3, toY(v));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let h = hMin1; h <= hMax1; h++) ctx.fillText(h + '°', toX(h), PT + PH + 3);

  ctx.save();
  ctx.beginPath(); ctx.rect(PL, PT, PW, PH); ctx.clip();

  const cols = ['#c9a227', '#4d94d0'];
  const drawOrder = [weapon1, weapon2].filter(Boolean);
  const spreadBubbleIdxs = getBloomBulletIdxs(N);
  window._spreadBubbleIdxs = spreadBubbleIdxs;
  window._cloudRuns = CLOUD_RUNS;

  // Pass 0 — Scatter cloud
  if (layers.scatter) drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    const blooms = simulateBloom(w, N);
    for (let s = 1; s <= CLOUD_RUNS; s++) {
      const recoilPts = genRecoilPts(w, s * 0x9e3779b9, N);
      const rngB = mulberry32((whash(w.id) ^ (s * 0x6c62272e)) >>> 0);
      recoilPts.forEach((p, i) => {
        const bloom = blooms[i] ?? spreadBounds(w)[0];
        const bAng = rngB() * Math.PI * 2, bR = bloom * rngB();
        ctx.beginPath();
        ctx.arc(toX(p.x + bR * Math.cos(bAng)), toY(p.y + bR * Math.sin(bAng)), 2, 0, Math.PI * 2);
        ctx.fillStyle = col + '38'; ctx.fill();
      });
    }
  });

  // Pass 1 — Reference run with bloom jitter + overlays
  drawOrder.forEach(w => {
    const col = cols[w === weapon1 ? 0 : 1];
    const weaponRefSeed = refSeed >>> 0;
    const pts = genRecoilPts(w, weaponRefSeed, N);
    const blooms = simulateBloom(w, N);

    const sprayPts = (() => {
      const rngRef = mulberry32((whash(w.id) ^ weaponRefSeed ^ 0xdeadbeef) >>> 0);
      return pts.map((p, i) => {
        const bloom = blooms[i] ?? spreadBounds(w)[0];
        const bAng = rngRef() * Math.PI * 2, bR = bloom * rngRef();
        return { x: p.x + bR * Math.cos(bAng), y: p.y + bR * Math.sin(bAng) };
      });
    })();

    if (layers.bloom) {
      spreadBubbleIdxs.forEach(idx => {
        const p = pts[idx]; if (!p) return;
        const bloom = blooms[idx] ?? spreadBounds(w)[0];
        const x = toX(p.x), y = toY(p.y), r = Math.abs(toX(p.x + bloom) - x);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = col + '1a'; ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1.2;
        ctx.fill(); ctx.stroke();
      });
    }

    if (layers.cone) {
      const coneCircles = pts.map((p, idx) => {
        const bloom = blooms[idx] ?? spreadBounds(w)[0];
        const x = toX(p.x), y = toY(p.y), r = Math.abs(toX(p.x + bloom) - x);
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

    if (layers.spray) sprayPts.forEach(p => {
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    });
  });

  ctx.restore();
  return { xMin, xMax, yMin, yMax };
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
  const metrics = [
    { lbl: 'ADS Time',            val: w => w._adsTimeMs ?? w.adsTime,      unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Time to aim down sights after magazine, barrel, and grip effects. Lower is faster.' },
    { lbl: 'ADS Move',            val: w => w._adsMoveSpeedMult,             unit: '×',   dec: 2, higherBetter: true, tooltip: 'Movement speed multiplier while aiming down sights after magazine, grip, and ammo effects. Higher is faster.' },
    { lbl: 'Draw Speed',          val: w => w._sprintRecoveryMs,             unit: 'ms',  dec: 0, lowerBetter:  true, tooltip: 'Weapon Draw Speed and Sprint-to-Fire recovery time. Can be affected by magazine and ergo attachments.' },
    { lbl: 'Bullet Vel',          val: w => w.bulletVel,                     unit: 'm/s', dec: 0, higherBetter: true, tooltip: 'Projectile velocity after barrel effects. Higher reduces travel time and lead.' },
    { lbl: 'Mag Size',            val: w => w.mag,                           unit: '',    dec: 0, higherBetter: true, tooltip: 'Rounds in the selected magazine.' },
    { lbl: 'Tac Reload',          val: w => w.tacRld,                        unit: 's',   dec: 3, lowerBetter:  true, tooltip: 'Tactical reload time with selected magazine and Mag Catch when applicable. Lower is faster.' },
    { lbl: 'ADS Recoil/Shot',     val: w => w.recoilV,                       unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'ADS vertical recoil per shot after ADS recoil-tier attachment effects. Lower is easier to control.' },
    { lbl: 'ADS Variation',       val: w => w.recoilVar,                     unit: '°',   dec: 1, lowerBetter:  true, tooltip: 'ADS recoil direction variation after ADS-only variation modifiers. Lower is more consistent.' },
    { lbl: 'ADS Spread/Shot',     val: w => w.recoilIncAds,                  unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'ADS bloom/spread increase per shot after ADS-only spread modifiers. Lower builds bloom more slowly.' },
    { lbl: 'ADS Spread Recovery', val: adsSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'Flat ADS bloom/spread recovery per second while firing after muzzle effects. Higher clears bloom faster.' },
    { lbl: 'Hip Spread Recovery', val: hipSpreadRecovery,                    unit: '°/s', dec: 2, higherBetter: true, tooltip: 'Flat hipfire bloom/spread recovery per second while firing after light effects. Higher clears bloom faster.' },
    { lbl: 'Move ADS',            val: w => w._movingAdsMinSpreadDeg,        unit: '°',   dec: 2, lowerBetter:  true, tooltip: 'Minimum ADS spread while moving after moving-ADS accuracy modifiers. Lower is more accurate.' },
    { lbl: 'Hip Min',             val: w => w.spread?.hipStand?.[0],         unit: '°',   dec: 3, lowerBetter:  true, tooltip: 'Standing hipfire minimum spread after hipfire spread-tier modifiers. Lower is more accurate.' },
    { lbl: '3D Spot',             val: w => w._worldSpot,                    unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Distance at which firing exposes your 3D world position. None or shorter is better.' },
    { lbl: 'Minimap Spot',        val: w => w._minimapSpot,                  unit: 'm',   dec: 0, lowerBetter:  true, tooltip: 'Distance at which firing exposes you on the minimap. None or shorter is better.' },
    { lbl: 'HS Mult',             val: w => w._hsMult,                       unit: '×',   dec: 2, higherBetter: true, tooltip: 'Headshot damage multiplier after ammo effects. Higher increases headshot damage.' },
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
      chips.push(`<div class="att-chip" title="${tip}" aria-label="${tip}"><div class="att-chip-lbl">Visual Recoil</div><div class="att-chip-val" style="color:${reduced ? 'var(--green)' : 'var(--red)'}">${reduced ? 'Reduced' : 'Increased'}</div></div>`);
    }
    if (!chips.length) return;
    rendered = true;
    html += `<div class="att-block"><div class="att-name ${colClass}">${weapon.name}</div><div class="att-grid">${chips.join('')}</div></div>`;
  });
  if (!rendered) html += '<div class="att-empty">No attachment stat changes</div>';
  el.innerHTML = html;
}

function renderRecoil() {
  const w1 = state.slots[0].weapon ? applyAttachments(state.slots[0].weapon, state.slots[0].atts) : null;
  const w2 = state.comparing && state.slots[1].weapon ? applyAttachments(state.slots[1].weapon, state.slots[1].atts) : null;
  const shotCount = selectedRecoilShotCount();
  const titleCount = document.getElementById('rcShotTitleCount');
  if (titleCount) titleCount.textContent = shotCount;

  renderAttachmentStats([
    { weapon: state.slots[0].weapon, atts: state.slots[0].atts, colClass: 'c1' },
    { weapon: state.comparing ? state.slots[1].weapon : null, atts: state.slots[1].atts, colClass: 'c2' },
  ]);

  const { aim, stance, layers, control, refSeed } = state.recoil;
  document.getElementById('rcModeScatter')?.classList.toggle('on', layers.scatter);
  document.getElementById('rcModeBloom')?.classList.toggle('on', layers.spray);
  document.getElementById('rcModePath')?.classList.toggle('on', layers.path);
  document.getElementById('rcBloomToggleBtn')?.classList.toggle('on', layers.bloom);
  document.getElementById('rcConeToggleBtn')?.classList.toggle('on', layers.cone);
  document.getElementById('rcAimAds')?.classList.toggle('on', aim === 'ads');
  document.getElementById('rcAimHip')?.classList.toggle('on', aim === 'hip');
  document.getElementById('rcStanceStand')?.classList.toggle('on', stance === 'stand');
  document.getElementById('rcStanceMove')?.classList.toggle('on', stance === 'move');
  syncCompensationControls();

  const shotsInput = document.getElementById('rcBloomShotsInput');
  if (shotsInput) shotsInput.disabled = !layers.bloom;
  document.getElementById('rcShotsLabel')?.classList.toggle('rc-shots-label--disabled', !layers.bloom);

  const axis = drawRecoilFixed(document.getElementById('rcMain'), w1, w2, layers, refSeed);
  const noteEl = document.querySelector('.rc-note');
  const stateLabel = `${aim.toUpperCase()} / ${stance === 'move' ? 'MOV' : 'STD'}`;
  if (noteEl && axis) {
    const activeLayers = [
      layers.scatter ? 'scatter' : null,
      layers.spray   ? 'spray pattern' : null,
      layers.path    ? 'recoil path' : null,
      layers.bloom   ? 'bloom' : null,
      layers.cone    ? 'cone' : null,
    ].filter(Boolean).join(' + ');
    const pathNote  = layers.path  ? ' Recoil Path = recoil-only reference line.' : '';
    const bloomNote = layers.bloom ? ` Bubbles = potential spread on bullets ${(window._spreadBubbleIdxs ?? []).map(i => i + 1).join(', ')}.` : '';
    const coneNote  = layers.cone  ? ' Cone = bloom envelope across all shots.' : '';
    noteEl.textContent = `Showing ${activeLayers} (${stateLabel}). Scatter = ${CLOUD_RUNS} faded simulated sprays. Spray Pattern = solid reference dots.${pathNote}${bloomNote}${coneNote} View: ${fmtAxisDeg(axis.xMin)}°–${fmtAxisDeg(axis.xMax)}° H / ${fmtAxisDeg(axis.yMin)}°–${fmtAxisDeg(axis.yMax)}° V.`;
  }

  const leg = document.getElementById('rcLegend');
  leg.innerHTML = '';
  [[w1, '#c9a227'], [w2, '#4d94d0']].filter(([w]) => w).forEach(([w, col]) => {
    leg.innerHTML += `<div class="rc-legend-item"><div class="rc-legend-dot" style="background:${col}"></div><span>${wLabel(w)}</span></div>`;
  });

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
          const baseVar = selW.recoilVar ?? 0;
          varLines.push(`<div class="rc-tt-row"><span>Base Weapon Variation</span><span>${baseVar.toFixed(2)}°</span></div>`);
          let prev = baseVar;
          if ((muz.adsRecoilVariationMult ?? 1) !== 1) {
            const after = +(prev * muz.adsRecoilVariationMult).toFixed(2), d = +(after - prev).toFixed(2);
            if (Math.abs(d) >= 0.005) varLines.push(`<div class="rc-tt-row"><span>${muz.name}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`);
            prev = after;
          }
          if ((grp.adsRecoilVariationMult ?? 1) !== 1) {
            const after = +(prev * grp.adsRecoilVariationMult).toFixed(2), d = +(after - prev).toFixed(2);
            if (Math.abs(d) >= 0.005) varLines.push(`<div class="rc-tt-row"><span>${grp.name}</span><span class="${d > 0 ? 'rc-tt-pos' : 'rc-tt-neg'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}°</span></div>`);
          }
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
        val1: w1 ? (((-selectedRecoilDirectionFor(w1)) >= 0 ? '+' : '') + (-selectedRecoilDirectionFor(w1))) + '° ±' + selectedRecoilVariationFor(w1).toFixed(1) + '°' : null,
        val2: w2 ? (((-selectedRecoilDirectionFor(w2)) >= 0 ? '+' : '') + (-selectedRecoilDirectionFor(w2))) + '° ±' + selectedRecoilVariationFor(w2).toFixed(1) + '°' : null,
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
        const ra = w => selectedRecoilAmountFor(w);
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
        const withAtts = prev, comp = +(withAtts * compPct).toFixed(2), effVal = +(withAtts - comp).toFixed(2);
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
      const sim1 = w1 ? simulateBloom(w1, 15) : null;
      const sim2 = w2 && state.comparing ? simulateBloom(w2, 15) : null;
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

  let html = '<div class="ptitle" style="margin-bottom:9px">Recoil / Spread Stats</div>';
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
  document.getElementById('rcStats').innerHTML = html;
}

// ── LOADOUT OVERLAY ───────────────────────────────────────────────────────────

function setLoadoutOverlay(open) {
  document.body.classList.toggle('loadout-open', !!open);
  document.getElementById('loadoutOpenBtn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
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
  document.getElementById('rcControlOff').addEventListener('click', () => setRecoilControl(false));
  document.getElementById('rcControlOn').addEventListener('click', () => setRecoilControl(true));

  // Recoil overlays
  document.getElementById('rcModeScatter').addEventListener('click', () => toggleRecoilLayer('scatter'));
  document.getElementById('rcModeBloom').addEventListener('click', () => toggleRecoilLayer('spray'));
  document.getElementById('rcModePath').addEventListener('click', () => toggleRecoilLayer('path'));
  document.getElementById('rcConeToggleBtn').addEventListener('click', () => toggleRecoilLayer('cone'));
  document.getElementById('rcBloomToggleBtn').addEventListener('click', () => toggleRecoilLayer('bloom'));

  // Recoil canvas controls
  document.getElementById('rcResetRef').addEventListener('click', resetRecoilReference);
  document.getElementById('rcRedrawRef').addEventListener('click', randomizeRecoilReference);
  document.getElementById('rcZoomIn').addEventListener('click', () => adjustRecoilScale('in'));
  document.getElementById('rcZoomOut').addEventListener('click', () => adjustRecoilScale('out'));
  document.getElementById('rcResetView').addEventListener('click', resetRecoilView);
  document.querySelector('.rc-pan-controls').addEventListener('click', e => {
    const btn = e.target.closest('[data-pan]');
    if (btn) panRecoilView(btn.dataset.pan);
  });

  // Inputs
  document.getElementById('rcBloomShotsInput')?.addEventListener('input', renderRecoil);
  document.getElementById('rcShotCountInput')?.addEventListener('change', syncRecoilShotCount);
  document.getElementById('rcShotCountInput')?.addEventListener('input', syncRecoilShotCount);
  document.getElementById('rcCompInput')?.addEventListener('change', () => syncCompensationLevel('input'));
  document.getElementById('rcCompRange')?.addEventListener('input', () => syncCompensationLevel('range'));
}

// ── INIT ──────────────────────────────────────────────────────────────────────

bindEvents();
renderSidebar();
renderStats();
