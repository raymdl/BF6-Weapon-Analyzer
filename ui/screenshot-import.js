/**
 * ui/screenshot-import.js — read an in-game loadout screenshot into a weapon slot.
 *
 * The reader (text reading, tile finding, icon matching, stat-panel check) runs in a module worker that is only
 * started on first use, so the page pays nothing until someone imports. The review dialog shows what was read
 * before anything changes; Apply hands the weapon and attachments to the page.
 */

import { attachStyledMenu } from './loadout.js';

const ENGINE_URL = new URL('../vendor/screenshot-import/import-worker.mjs', import.meta.url);
const SITE_URL = new URL('../', import.meta.url).href;
const SLOT_LABELS = { sight: 'Sight', muzzle: 'Muzzle', barrel: 'Barrel', grip: 'Grip', laser: 'Laser', light: 'Light', mag: 'Magazine', ammo: 'Ammo', ergo: 'Ergo', accessory: 'Opt Acc' };

let worker = null, workerReady = null, readId = 0;
let importSeq = 0;  // each importScreenshot call; a call that is no longer the latest stops at its next await
const pending = new Map();
let onStage = () => {};
function startWorker() {
  if (workerReady) return workerReady;
  worker = new Worker(ENGINE_URL, { type: 'module' });
  workerReady = new Promise((resolve, reject) => {
    worker.onmessage = ({ data: m }) => {
      if (m.type === 'stage') onStage(m.text);
      else if (m.type === 'ready') resolve();
      else if (m.type === 'result') { pending.get(m.id)?.resolve(m.result); pending.delete(m.id); }
      else if (m.type === 'error') {
        if (m.id === undefined) { workerReady = null; worker.terminate(); reject(new Error(m.message)); }
        else { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
      }
    };
    worker.onerror = e => { workerReady = null; reject(new Error(e.message || 'The screenshot reader failed to load')); };
  });
  worker.postMessage({ type: 'init', site: SITE_URL });
  return workerReady;
}
function readImage(image, weapon = null) {
  const id = ++readId;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ type: 'read', id, image, weapon }); });
}

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
export const imageFromClipboard = e => [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'))?.getAsFile() ?? null;

/**
 * The drop box shown inside the slot menu once a target slot is picked: paste, drop, or choose a file.
 */
export function renderDropBox(menu, onImage) {
  // touch devices (the hover test attachStyledMenu uses) have no Ctrl+V or drag and drop, but can photograph the screen
  const touch = !(typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches);
  const box = el('div', 'import-drop');
  const text = el('div', 'import-drop-text', touch ? 'Photograph your loadout screen or choose a screenshot' : 'Paste a screenshot (Ctrl+V) or drop one here');
  const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
  const choose = el('button', 'share-menu-item import-choose', 'Choose file…'); choose.type = 'button';
  choose.addEventListener('click', e => { e.stopPropagation(); input.click(); });
  input.addEventListener('change', () => input.files[0] && onImage(input.files[0]));
  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('over'); });
  box.addEventListener('dragleave', () => box.classList.remove('over'));
  box.addEventListener('drop', e => {
    e.preventDefault(); box.classList.remove('over');
    const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
    if (f) onImage(f);
  });
  box.append(text, input);
  menu.append(box);
  if (touch) {  // straight from the rear camera
    const cam = el('input'); cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.hidden = true;
    const shoot = el('button', 'share-menu-item import-choose', 'Take a photo…'); shoot.type = 'button';
    shoot.addEventListener('click', e => { e.stopPropagation(); cam.click(); });
    cam.addEventListener('change', () => cam.files[0] && onImage(cam.files[0]));
    menu.append(cam, shoot);
  }
  menu.append(choose);
}

let dialog = null;
function buildDialog() {
  dialog = el('dialog', 'import-dialog');
  dialog.setAttribute('aria-labelledby', 'importTitle');
  dialog.innerHTML = `
    <div class="import-head"><div class="import-title" id="importTitle"></div><button class="import-close" type="button" aria-label="Close" title="Close">×</button></div>
    <div class="import-body">
      <div class="import-shot"><canvas></canvas></div>
      <div class="import-side">
        <div class="import-status" aria-live="polite"></div>
        <div class="import-weapon"></div>
        <div class="import-warns"></div>
        <div class="import-list"></div>
      </div>
    </div>
    <div class="import-foot"><button class="import-cancel" type="button">Cancel</button><button class="loadout-done import-apply" type="button" disabled>Apply</button></div>`;
  dialog.querySelector('.import-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.import-cancel').addEventListener('click', () => dialog.close());
  // An attachment list open inside the overlay takes the first Escape or outside click; the overlay the next one.
  let listWasOpen = false;
  const listOpen = () => !!dialog.querySelector('.att-menu');
  // on window, ahead of the list's own close-on-outside-press listener on document
  window.addEventListener('mousedown', () => { if (dialog.open) listWasOpen = listOpen(); }, true);
  dialog.addEventListener('click', e => { if (e.target === dialog && !listWasOpen) dialog.close(); });  // the backdrop
  dialog.addEventListener('cancel', e => { if (listOpen()) e.preventDefault(); });
  document.body.appendChild(dialog);
}

/**
 * Read `blob` and show the review dialog. The title's target is a picker: targets = [{to, label, cls, gun}] (label
 * e.g. "Weapon 2", cls its colour class, gun its current weapon, "Empty" or "New"), starting at `target`.
 * onTarget(to) is called when the visitor changes it (the read does not depend on the slot, so nothing is read
 * again). apply(weaponId, picks) is called on Apply; picks = [{slot, id}] (unclear tiles left out).
 */
export async function importScreenshot(blob, { targets, target, onTarget, apply }) {
  if (!dialog) buildDialog();
  const run = ++importSeq;
  const $ = s => dialog.querySelector(s);
  const pick = targets.find(t => t.to === target) ?? targets[0];
  const ctx = { status: $('.import-status'), weaponEl: $('.import-weapon'), list: $('.import-list'), warns: $('.import-warns'),
    applyBtn: $('.import-apply'), g: $('canvas').getContext('2d'), apply, cls: pick.cls, label: pick.label };
  const title = $('.import-title'); title.textContent = 'Import screenshot to ';
  const tsel = el('select', `import-sel import-target-sel ${pick.cls}`);
  tsel.setAttribute('aria-label', 'Import to');
  // touch devices keep the native list (attachStyledMenu's hover test), so there the options carry the gun names too
  const native = !(typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches);
  for (const t of targets) { const o = el('option', null, native ? `${t.label}: ${t.gun}` : t.label); o.value = String(t.to); o.selected = t === pick; tsel.appendChild(o); }
  // the list names each slot's current weapon, so a misclicked slot can be put right before Apply
  attachStyledMenu(tsel, targets.map(t => ({ id: String(t.to), text: `${t.label}: ${t.gun}` })));
  tsel.addEventListener('change', () => {
    const t = targets.find(x => String(x.to) === tsel.value);
    tsel.classList.replace(ctx.cls, t.cls);
    dialog.querySelector('.import-total')?.classList.replace(ctx.cls, t.cls);
    ctx.cls = t.cls; ctx.label = t.label;
    ctx.applyBtn.textContent = `Apply to ${t.label}`;
    onTarget(t.to);
  });
  title.appendChild(tsel);
  clearResult(ctx);
  ctx.status.textContent = 'Opening the screenshot…';
  if (!dialog.open) dialog.showModal();  // first, so a file that can't be opened is reported here
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch {
    if (run === importSeq) ctx.status.textContent = "This file couldn't be opened as an image. Try a PNG or JPEG screenshot.";
    return;
  }
  if (run !== importSeq) { bmp.close(); return; }
  const { g } = ctx;
  g.canvas.width = bmp.width; g.canvas.height = bmp.height; g.drawImage(bmp, 0, 0); bmp.close();
  ctx.image = g.getImageData(0, 0, g.canvas.width, g.canvas.height);
  await readInto(ctx, null, run);
}
export const importDialogOpen = () => !!dialog?.open;

function clearResult({ status, weaponEl, list, warns, applyBtn, label }) {
  weaponEl.textContent = ''; list.textContent = ''; warns.textContent = '';
  applyBtn.disabled = true; applyBtn.textContent = `Apply to ${label}`; applyBtn.onclick = null;
  status.hidden = false;
}
/** Read the screenshot in ctx (as `weapon` when the visitor chose one) and show the result. */
async function readInto(ctx, weapon, run = ++importSeq) {
  const stale = () => run !== importSeq, say = s => { if (!stale()) ctx.status.textContent = s; };
  // a re-read starts from the clean screenshot and keeps the weapon picker, so a failed read can be retried
  const picker = weapon ? ctx.weaponEl.querySelector('.import-weapon-sel') : null;
  if (weapon) {
    clearResult(ctx); ctx.g.putImageData(ctx.image, 0, 0);
    if (picker) ctx.weaponEl.append(picker);
  }
  let result;
  try {
    if (!workerReady) say('Loading the screenshot reader…');
    onStage = s => say(`${s}…`);
    await startWorker();
    if (stale()) return;
    say(weapon ? 'Reading the screenshot as the chosen weapon…' : 'Reading the screenshot…');
    result = await readImage(ctx.image, weapon);
  } catch (e) {
    say(`The screenshot couldn't be read: ${e.message}`);
    if (picker && !stale()) {
      // the picker shows no weapon, so choosing the same one again reads again
      if (!picker.querySelector('option[value=""]')) { const o = el('option', null, 'Choose a weapon'); o.value = ''; o.disabled = true; picker.prepend(o); }
      picker.value = '';
    }
    return;
  }
  if (stale() || !dialog.open) return;  // another screenshot or weapon came in meanwhile, or the dialog was closed
  showResult(result, { ...ctx, onWeapon: wid => readInto(ctx, wid) });
}

function showResult(r, { g, status, weaponEl, list, warns, applyBtn, apply, cls, onWeapon }) {
  const ok = typeof r.weapon === 'string';
  status.hidden = true;
  const slotName = sl => SLOT_LABELS[sl] ?? sl;
  // slots sharing one rail (laser or light on some weapons) are one row, "Laser / Light", as in the sidebar
  const rail = new Set(r.railSlots ?? []), key = sl => (rail.has(sl) ? 'rail' : sl);
  const rowName = s => s.label ?? slotName(s.slot);
  const withPts = o => (o.pts > 0 ? `${o.name} [${o.pts}]` : o.name);  // the sidebar's form, "Basic [10]", "None"

  // Rows in list order: every slot of the weapon in the sidebar's order (its read tile, or the weapon's default when
  // no tile was read; a hidden tile takes its slot's place), then unclear tiles. Tile rows are numbered in that order, and the boxes on
  // the screenshot carry the same numbers.
  const slots = r.slots ?? [];
  const read = r.tiles.filter(t => !t.unclear && t.slot);
  const order = [];
  for (const s of slots) {
    const tiles = read.filter(t => key(t.slot) === s.slot);
    if (tiles.length) tiles.forEach(t => order.push({ kind: 'tile', t, s }));
    else if (r.hiddenTile && key(r.hiddenTile.slot) === s.slot) order.push({ kind: 'hidden', t: r.hiddenTile, s });  // in its slot's place
    else order.push({ kind: 'empty', s });
  }
  for (const t of read.filter(t => !slots.some(s => s.slot === key(t.slot)))) order.push({ kind: 'tile', t, s: null });
  for (const t of r.tiles.filter(t => t.unclear)) order.push({ kind: 'unclear', t });
  if (r.hiddenTile && !order.some(o => o.kind === 'hidden')) order.push({ kind: 'hidden', t: r.hiddenTile });
  let n = 0;
  for (const o of order) if (o.kind === 'tile' || o.kind === 'unclear') o.num = String(++n);
  const hiddenRow = order.find(o => o.kind === 'hidden');
  if (hiddenRow) hiddenRow.num = '?';

  // boxes on the screenshot, numbered like their rows
  const lw = Math.max(3, Math.round(g.canvas.height / 300)), fs = Math.max(18, Math.round(g.canvas.height / 40));
  const css = getComputedStyle(document.documentElement), gold = css.getPropertyValue('--accent').trim(), red = css.getPropertyValue('--red').trim(), orange = css.getPropertyValue('--orange').trim();
  g.lineWidth = lw; g.font = `700 ${fs}px 'Segoe UI', system-ui, sans-serif`; g.textBaseline = 'top';
  for (const o of order) {
    if (!o.num || o.num === '?') continue;
    const [x, y, w, h] = o.t.box, unclear = o.kind === 'unclear' || !!o.t.zero;  // a 0-point tile is flagged like an unread one
    g.strokeStyle = g.fillStyle = unclear ? red : o.t.panelChanged ? orange : gold;  // orange: picked by the stat panel
    g.setLineDash(unclear ? [lw * 3, lw * 2] : []);
    g.strokeRect(x, y, w, h);
    g.fillText(o.num, x + lw, y + h + lw * 2);
  }
  g.setLineDash([]);

  // the weapon is a picker too: choosing another reads the screenshot again as that weapon
  const totalEl = el('span', `att-total import-total ${cls}`);  // in the target weapon's colour, as in the sidebar
  const wmenu = [...(ok ? [] : [{ id: '', text: 'No weapon found: choose it' }]), ...(r.weapons ?? []).map(w => ({ id: w.id, text: w.name }))];
  const wsel = el('select', 'att-sel import-sel import-weapon-sel');
  wsel.setAttribute('aria-label', 'Weapon');
  for (const m of wmenu) { const o = el('option', null, m.text); o.value = m.id; o.selected = m.id === (ok ? r.weapon : ''); o.disabled = m.id === ''; wsel.appendChild(o); }
  attachStyledMenu(wsel, wmenu.filter(m => m.id));
  wsel.addEventListener('change', () => { if (wsel.value) onWeapon(wsel.value); });
  weaponEl.textContent = '';
  weaponEl.append(wsel, ...(ok ? [totalEl] : []));

  // warnings sit above the list so they stay in view; the unclear-count one keeps its place when it reaches zero
  const UNCLEAR = /^\d+ attachments? couldn't be read clearly/;
  let unclearWarn = null;
  for (const w of r.warnings ?? []) { const d = el('div', 'import-warn', w); if (UNCLEAR.test(w)) unclearWarn = d; warns.appendChild(d); }
  // tiles whose icon was close to another's and the stat panel decided between them
  const byPanel = order.filter(o => o.kind === 'tile' && o.t.panelChanged).map(o => o.num);
  if (byPanel.length) warns.appendChild(el('div', 'import-warn', byPanel.length === 1
    ? `Tile ${byPanel[0]} was picked by the stat panel: its icon looks like another.`
    : `Tiles ${byPanel.slice(0, -1).join(', ')} and ${byPanel.at(-1)} were picked by the stat panel: their icons look like others.`));
  // a 0-point tile is the slot's None or default, not a costed attachment, so it is pointed out
  for (const o of order.filter(o => o.kind === 'tile' && o.t.zero)) {
    const sl = o.s ? rowName(o.s) : slotName(o.t.slot), vssm = r.weapon === 'vssm' && o.t.slot === 'ergo';
    warns.appendChild(el('div', 'import-warn', vssm ? `Tile ${o.num} is the default stock (0 points, shown as Full Auto), so Ergo is None.`
      : `Tile ${o.num} shows 0 points, so ${sl} is ${o.t.name}.`));
  }

  const entries = [], refreshers = [];
  // slots other rows fill (an untouched default-slot row does not count)
  const takenBy = self => new Set(entries.filter(e => e !== self && (e.kind !== 'empty' || e.changed())).map(e => e.value()).filter(v => v && v.id !== 'none').map(v => key(v.slot)));
  const select = (label, menu, start, onChange, allowed) => {
    const sel = el('select', 'att-sel import-sel');
    sel.setAttribute('aria-label', label);
    const offered = m => !m.pick || m.pick.id === 'none' || m.id === sel.value || allowed(m.pick);
    const opts = menu.map(m => { const o = el('option', null, m.text); o.value = m.id; o.selected = m.id === start; sel.appendChild(o); return o; });
    // slots other rows hold are disabled on the select itself too: touch devices use the native list, and arrow keys
    // change a focused select without opening the styled one
    refreshers.push(() => menu.forEach((m, i) => { opts[i].disabled = !offered(m); }));
    attachStyledMenu(sel, () => menu.filter(offered));
    // the full text on hover, for a name too long for the column
    const title = () => { sel.title = sel.selectedOptions[0]?.text ?? ''; };
    title();
    sel.addEventListener('change', () => { title(); onChange(); sync(); });
    return sel;
  };
  for (const o of order) {
    const item = el('div', 'import-row' + (o.kind === 'empty' ? ' is-empty' : o.kind === 'unclear' ? ' is-unclear' : o.kind === 'hidden' ? ' is-check' : '') + (o.t?.zero ? ' is-zero' : o.kind === 'tile' && o.t.panelChanged ? ' is-panel' : ''));
    // a hidden tile placed in its slot's row offers that slot's list like a read tile; one with no slot row offers
    // every attachment at its cost, tagged with the slot each would fill
    const t = o.t, inSlot = o.kind === 'hidden' && !!o.s, loose = o.kind === 'unclear' || (o.kind === 'hidden' && !inSlot);
    const slotEl = el('span', 'import-slot', o.s ? rowName(o.s) : t?.slot && o.kind !== 'unclear' ? slotName(t.slot) : 'Unread');
    item.append(el('span', 'import-num', o.num ?? ''), slotEl);
    const opts = o.kind === 'empty' || inSlot ? o.s.options : t.options ?? [];
    const multiSlot = !o.s && new Set(opts.map(p => p.slot)).size > 1;  // a slot row's own label says it (Laser / Light)
    const empty = o.kind === 'unclear' ? 'Left at default' : loose ? 'None' : null;
    const menu = [...(empty ? [{ id: '', text: empty }] : []),
      ...opts.map(p => ({ id: `${p.slot}|${p.id}`, text: multiSlot ? `${withPts(p)} (${slotName(p.slot)})` : withPts(p), pick: p }))];
    const start = o.kind === 'empty' ? `${o.s.defaultSlot ?? o.s.slot}|${o.s.defaultId}` : o.kind === 'unclear' ? '' : `${t.slot}|${t.id}`;
    const picks = new Map(menu.filter(m => m.pick).map(m => [m.id, m.pick]));
    const noteEl = el('span', 'import-note');
    noteEl.hidden = true;
    const entry = { kind: o.kind === 'empty' ? 'empty' : loose ? 'loose' : 'tile', slot: o.s?.slot, unclear: o.kind === 'unclear', covered: null };
    let sel = null;
    if (menu.length > 1) {
      sel = select(o.num ? `Attachment ${o.num}` : `${rowName(o.s)} (no tile)`, menu, start, () => {
        const p = picks.get(sel.value);
        if (loose) slotEl.textContent = p ? slotName(p.slot) : o.kind === 'hidden' ? slotName(t.slot) : 'Unread';
        item.classList.toggle('is-changed', sel.value !== start);
        noteEl.textContent = sel.value === start || o.kind === 'empty' ? '' : loose ? 'Chosen by you' : inSlot ? `Changed by you (stat panel showed ${t.name})` : `Changed by you (read as ${t.name})`;
        noteEl.hidden = !noteEl.textContent;
      }, p => !takenBy(entry).has(key(p.slot)));
      item.appendChild(sel);
    } else {
      const name = el('span', 'import-name', menu[0]?.pick ? withPts(menu[0].pick) : empty ?? '');
      name.title = name.textContent;
      item.appendChild(name);
    }
    entry.changed = () => !!sel && sel.value !== start;
    entry.value = () => { if (entry.covered) return null; const id = sel ? sel.value : start; return picks.get(id) ?? null; };
    if (o.kind === 'empty') {
      // an unclear or hidden tile filled into this slot takes it over
      const from = el('span', 'import-name import-from');
      from.hidden = true;
      item.appendChild(from);
      entry.cover = by => { entry.covered = by; if (sel) sel.hidden = !!by; from.hidden = !by; from.textContent = !by ? '' : by === '?' ? 'From the hidden tile' : `From tile ${by}`; };
    }
    entry.num = o.num;
    item.appendChild(noteEl);
    entries.push(entry);
    list.appendChild(item);
  }
  function sync() {
    const loose = entries.filter(e => e.kind === 'loose');
    for (const e of entries.filter(e => e.kind === 'empty')) {
      const by = loose.find(l => l.value() && key(l.value().slot) === e.slot);
      e.cover(by ? by.num : null);
    }
    refreshers.forEach(f => f());
    const total = entries.reduce((a, e) => a + (e.value()?.pts ?? 0), 0);
    totalEl.textContent = `Total: ${total} pts`;
    totalEl.classList.toggle('over', total > 100);
    if (unclearWarn) {
      const left = entries.filter(e => e.unclear && !e.value()).length;
      unclearWarn.style.visibility = left ? '' : 'hidden';  // keeps its line, so nothing below moves
      if (left) unclearWarn.textContent = `${left} attachment${left > 1 ? 's' : ''} couldn't be read clearly and ${left > 1 ? 'were' : 'was'} left at default.`;
    }
  }
  sync();
  if (!ok) return;
  applyBtn.disabled = false;
  applyBtn.onclick = () => { dialog.close(); apply(r.weapon, entries.map(e => e.value()).filter(Boolean).map(({ slot, id }) => ({ slot, id }))); };
}
