import { SOLDIER_CLASSES, soldierClass, normalizeSoldier } from '../sim/soldier-classes.js';

/**
 * ui/soldier-class.js — The sidebar's Class row and its details popup.
 *
 * One icon button per soldier class; at most one is on, and none by default.
 * Hovering, focusing or tapping an icon opens a popup with the class's
 * signature set and its two training paths, which are chosen there. The popup
 * is fixed to the page so it never moves or clips the sidebar's contents.
 */

// Class marks drawn for the site after the shapes of the in-game ones, on a
// 16 x 16 grid shown at 16px: arrowhead with an arrow cut into its base;
// wrench head in two pieces (a chevron on the left, the base and rising right
// jaw on the right); medic cross with a diagonal strip removed and chamfered
// inner corners; four-corner reticle with clipped outer corners.
const ICONS = {
  assault: 'M8 1.5l6.4 10.3v2.7H1.6v-2.7zM8 7.4l2.4 3.7H8.5v3.4h-1v-3.4H5.6z',
  engineer: 'M4.5 2H8L4.6 8l1.1 2.2-2 3.2L1 8zM13.5 5L15 8l-3.3 6H5l1.8-3h3.1z',
  support: 'M6.5 1.5h3V4L12 6.5h2.5v3h-4l-4-4zM9.5 14.5h-3V12L4 9.5H1.5v-3h4l4 4z',
  recon: 'M3.5 1.5H7V5H5v2H1.5V3.5zM9 1.5h3.5l2 2V7H11V5H9zM1.5 9H5v2h2v3.5H3.5l-2-2zM11 9h3.5v3.5l-2 2H9V11h2z',
};
// A popup opens after a short hover. Once one is open, another icon takes it
// over only when the pointer rests there, so crossing the row on the way to
// the popup does not switch class.
const OPEN_DELAY_MS = 120, SWITCH_REST_MS = 250, CLOSE_DELAY_MS = 220;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const touchOnly = () => matchMedia('(hover: none)').matches;

// The latest render of each slot's row: the sidebar rebuilds rows on every
// change, so an open popup follows its slot, not a row element.
const rows = new Map();
let pop = null;
let open = null; // { slotIdx, clsId }
let openTimer = null, closeTimer = null;
let pendingFocus = null; // class id whose icon takes focus back after a rebuild

function item(entry, { modelled = false, level = null } = {}) {
  return `<div class="sp-item${modelled ? ' sp-on' : ''}">`
    + (level != null ? `<span class="sp-lv">${level}.</span>` : '')
    + `<span><b>${esc(entry.name)}</b><span class="sp-text">${esc(entry.text)}</span></span></div>`;
}

function popHtml(cls, soldier) {
  const picked = soldier?.cls === cls.id ? soldier.path : null;
  const paths = cls.paths.map(path => `<button class="sp-path${picked === path.id ? ' on' : ''}" type="button"`
    + ` data-path="${path.id}" aria-pressed="${picked === path.id}">`
    + `<span class="sp-path-name">${esc(path.name)}${path.id === cls.defaultPath ? '<span class="sp-default">Default</span>' : ''}</span>`
    + path.perks.map((perk, level) => item(perk, { modelled: !!perk.effect, level })).join('')
    + '</button>').join('');
  return `<div class="sp-head">${esc(cls.name)}</div>`
    + '<div class="sp-k">Signature gadget, weapon and trait</div>'
    + item(cls.gadget) + item(cls.weapon, { modelled: true }) + item(cls.trait)
    + `<div class="sp-k">Training path: choose one</div><div class="sp-paths">${paths}</div>`
    + '<div class="sp-k">Active ability</div>' + item(cls.ability, { level: 3 })
    + '<div class="sp-foot">Bright entries change the numbers on this site; the rest are for reference. '
    + 'Numbers are the perk level. Perks unlock by level during a round and are treated here as unlocked.</div>';
}

function place(row) {
  const r = row.getBoundingClientRect();
  const side = row.closest('.sidebar')?.getBoundingClientRect() ?? r;
  pop.style.left = '0px'; pop.style.top = '0px';
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  let left, top;
  if (side.right + 4 + pw <= vw - 8) {
    // Beside the sidebar, level with the row, so it covers none of the loadout.
    left = side.right + 4;
    top = Math.max(8, Math.min(r.top - 8, vh - ph - 8));
  } else {
    left = Math.max(8, Math.min(r.left, vw - pw - 8));
    top = r.bottom + 4;
    if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 4);
  }
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function refresh() {
  const entry = open && rows.get(open.slotIdx);
  const cls = open && soldierClass(open.clsId);
  if (!entry || !cls || !entry.row.isConnected || !entry.row.offsetParent) { close(); return; }
  pop.innerHTML = popHtml(cls, entry.slot.soldier);
  pop.setAttribute('aria-label', `${cls.name} class details`);
  pop.style.setProperty('--slot-c', entry.color);
  pop.classList.add('show');
  place(entry.row);
}

function close() {
  clearTimeout(openTimer); clearTimeout(closeTimer);
  open = null;
  pop?.classList.remove('show');
}

function show(slotIdx, clsId, delay = 0) {
  clearTimeout(openTimer); clearTimeout(closeTimer);
  openTimer = setTimeout(() => { open = { slotIdx, clsId }; refresh(); }, delay);
}

function closeSoon() {
  clearTimeout(openTimer); clearTimeout(closeTimer);
  closeTimer = setTimeout(close, CLOSE_DELAY_MS);
}

function ensurePop() {
  if (pop) return;
  pop = document.createElement('div');
  pop.className = 'soldier-pop';
  pop.setAttribute('role', 'dialog');
  document.body.appendChild(pop);
  pop.addEventListener('mouseenter', () => clearTimeout(closeTimer));
  pop.addEventListener('mouseleave', closeSoon);
  pop.addEventListener('click', e => {
    const btn = e.target.closest('[data-path]');
    const entry = open && rows.get(open.slotIdx);
    if (!btn || !entry) return;
    const next = normalizeSoldier({ cls: open.clsId, path: btn.dataset.path });
    const cur = entry.slot.soldier;
    if (cur?.cls === next.cls && cur.path === next.path) return;
    entry.slot.soldier = next;
    entry.onChange();
    pop.querySelector(`[data-path="${next.path}"]`)?.focus({ preventScroll: true });
    clearTimeout(closeTimer);
  });
  pop.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open) return;
    const { slotIdx, clsId } = open;
    close();
    rows.get(slotIdx)?.row.querySelector(`[data-soldier="${clsId}"]`)?.focus();
  });
  pop.addEventListener('focusout', e => {
    if (!pop.contains(e.relatedTarget) && !e.relatedTarget?.closest?.('.soldier-row')) closeSoon();
  });
  document.addEventListener('pointerdown', e => {
    if (open && !pop.contains(e.target) && !e.target.closest?.('.soldier-row')) close();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(); });
  document.addEventListener('scroll', e => { if (open && !pop.contains(e.target)) close(); }, true);
  window.addEventListener('resize', close);
}

/**
 * Build one slot's Class row into `row` and its selection text into `status`.
 * `slot.soldier` is read and written here; `onChange` re-renders the page.
 */
export function renderSoldierClass({ row, status, slot, slotIdx, color, onChange }) {
  ensurePop();
  const soldier = normalizeSoldier(slot.soldier);
  const cls = soldier && soldierClass(soldier.cls);
  status.textContent = cls ? `${cls.name} · ${cls.paths.find(p => p.id === soldier.path).name}` : 'None';
  row.innerHTML = '';
  for (const c of SOLDIER_CLASSES) {
    const on = soldier?.cls === c.id;
    const b = document.createElement('button');
    b.className = 'cbtn sbtn' + (on ? ' on' : '');
    b.type = 'button';
    b.dataset.soldier = c.id;
    b.setAttribute('aria-label', `${c.name} class`);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="${ICONS[c.id]}"/></svg>`;
    b.addEventListener('click', () => {
      slot.soldier = on ? null : { cls: c.id, path: c.defaultPath };
      // A tap has no hover to show the details, so selecting opens them.
      // The rebuild below refreshes whichever popup `open` names.
      // A click is deliberate, so it also switches an open popup at once.
      if (touchOnly() && on) close(); else { clearTimeout(openTimer); clearTimeout(closeTimer); open = { slotIdx, clsId: c.id }; }
      pendingFocus = c.id;
      onChange();
    });
    const showing = () => open?.slotIdx === slotIdx && open.clsId === c.id;
    b.addEventListener('mouseenter', () => {
      if (touchOnly()) return;
      if (showing()) { clearTimeout(openTimer); clearTimeout(closeTimer); } else show(slotIdx, c.id, open ? SWITCH_REST_MS : OPEN_DELAY_MS);
    });
    // Each movement restarts the wait, so only a resting pointer switches.
    b.addEventListener('mousemove', () => { if (open && !showing() && !touchOnly()) show(slotIdx, c.id, SWITCH_REST_MS); });
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) show(slotIdx, c.id); });
    b.addEventListener('blur', e => {
      // Not the blur a rebuild causes by removing the focused icon.
      if (b.isConnected && !pop.contains(e.relatedTarget) && !row.contains(e.relatedTarget)) closeSoon();
    });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' || open?.clsId !== c.id) return;
      e.preventDefault();
      (pop.querySelector('.sp-path.on') ?? pop.querySelector('.sp-path'))?.focus({ preventScroll: true });
    });
    row.appendChild(b);
  }
  if (!row.dataset.soldierBound) {
    row.dataset.soldierBound = '1';
    row.addEventListener('mouseleave', () => { if (!touchOnly()) closeSoon(); });
  }
  rows.set(slotIdx, { row, slot, color, onChange });
  // The rebuild drops the pressed icon; give it focus back and keep its popup.
  if (pendingFocus && rows.get(slotIdx)?.slot === slot) {
    row.querySelector(`[data-soldier="${pendingFocus}"]`)?.focus({ preventScroll: true });
    pendingFocus = null;
  }
  if (open?.slotIdx === slotIdx) { clearTimeout(closeTimer); refresh(); }
}
