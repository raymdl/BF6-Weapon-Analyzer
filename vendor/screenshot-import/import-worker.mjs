// Loadout screenshot reader, run in a module worker so the page stays responsive and the stat-panel check gets its own
// copy of the site simulator (its context settings would otherwise overwrite the page's).
// Messages in:  {type: 'init', site}   site = the site root URL (for sim/*.js and data/*.json)
//               {type: 'read', id, image}   image = ImageData
// Messages out: {type: 'stage', text} while loading, {type: 'ready'}, {type: 'result', id, result}, {type: 'error', id, message}
import * as ort from './lib/ort.wasm.min.mjs';
import { createOcr } from './ocr.js';
import { createRecognizer } from './recognize.js';
import { makeSimulator } from './sim-bridge.mjs';

const here = p => new URL(p, import.meta.url).href;
const stage = text => postMessage({ type: 'stage', text });
const get = (u, kind = 'json') => fetch(u).then(r => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r[kind](); });

// opencv.js is a UMD script; in a module worker it is evaluated in global scope. Its module object is a thenable
// that resolves to itself, so it is handed back wrapped.
async function loadOpenCv() {
  (0, eval)(await get(here('./lib/opencv.js'), 'text'));
  const cv = self.cv;
  if (cv.Mat) return { cv };
  return new Promise(res => { cv.onRuntimeInitialized = () => res({ cv }); });
}

let ready = null, data = null, sights = null, defaultsFor = null, railOf = null, weaponList = null, sidebarOrder = null, sidebarRail = null, sitePts = null;
async function init(site) {
  ort.env.wasm.wasmPaths = here('./lib/');
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  stage('Downloading the screenshot reader');
  const files = Promise.all([get(here('./models/ch_PP-OCRv4_det_infer.onnx'), 'arrayBuffer'), get(here('./models/ch_PP-OCRv4_rec_infer.onnx'), 'arrayBuffer'),
    get(here('./icon-features.json')), get(here('./import-data.json')), get(here('./models/rec_keys.txt'), 'text')]);
  const sim = Promise.all([import(site + 'sim/core.js'), import(site + 'sim/applyAttachments.js'), import(site + 'sim/loadout.js'), import(site + 'sim/weapon-attributes.js'),
    ...['weapons', 'recoil_decay', 'balance_tables', 'attachments', 'ammo', 'hit_zones', 'weapon_attributes'].map(n => get(site + `data/${n}.json`))]);
  const [{ cv }, [det, rec, features, d, keys], [core, applyAtt, loadout, weaponAttributes, W, RD, B, A, AM, HZ, WA]] = await Promise.all([loadOpenCv(), files, sim]);
  data = d;
  sights = new Map(A.SIGHTS.map(x => [x.id, x]));
  // what Apply leaves in a slot with no tile: the site's own weapon defaults
  // slots sharing one rail (e.g. laser or light): one attachment between them
  railOf = wid => A.WEAPON_ATTS[wid]?.slots?.rail?.accepts ?? [];
  weaponList = W.map(w => ({ id: w.id, name: w.name }));
  // each slot's choices in the order the site's loadout sidebar lists them (ui/loadout.js renderSlot)
  sidebarRail = wid => { const weapon = W.find(x => x.id === wid); return weapon ? loadout.availableAttachments(weapon, 'rail', { ...A, ...AM }) : []; };
  sidebarOrder = (wid, slot) => {
    const weapon = W.find(x => x.id === wid), site = { ...A, ...AM };
    if (!weapon) return [];
    const rail = ['laser', 'light'].includes(slot) && railOf(wid).length;
    let list = rail ? loadout.availableAttachments(weapon, 'rail', site).filter(a => a.id === 'none' || a.type === slot)
      : loadout.availableAttachments(weapon, slot, site);
    if (slot === 'muzzle') {
      const c = list.findIndex(a => a.id === 'compensator'), l = list.findIndex(a => a.id === 'linear_comp');
      if (c > l && l >= 0) list.splice(l, 0, ...list.splice(c, 1));
    }
    if (slot === 'sight') {
      const group = a => a.id === 'iron' ? 0 : a.category === 'iron' ? 0.5 : ['thermal', 'therm_hyb'].includes(a.category) ? 3
        : ['var_low', 'var_high'].includes(a.category) ? 2 : 1;
      list = [...list].sort((a, b) => group(a) - group(b) || (a.magnification ?? 0) - (b.magnification ?? 0) || a.name.localeCompare(b.name));
    }
    return list.map(a => a.id);
  };
  // points the sidebar shows, for choices import-data.json lacks (the second iron sights)
  sitePts = (wid, slot, id) => slot === 'sight' && sights.has(id)
    ? A.WEAPON_ATTS[wid]?.sightPoints?.[id] ?? loadout.getAttPts(sights.get(id), W.find(x => x.id === wid)) : 0;
  defaultsFor = wid => { const a = {}; loadout.resetAttsForWeapon(a, W.find(x => x.id === wid), { ...A, ...AM }); return a; };  // sights matched from the icon library are named from the site catalog
  stage('Starting the screenshot reader');
  const ocr = await createOcr({ ort, cv, detModel: new Uint8Array(det), recModel: new Uint8Array(rec), keys });
  const simulate = makeSimulator({ core, applyAtt, loadout, weaponAttributes }, { W, RD, B, A, AM, HZ, WA });
  return createRecognizer({ cv, ocr, features, data, simulate });
}

const siteName = (w, slot, id) => data.names[`${w}|${slot}|${id}`]
  ?? (slot === 'sight' && sights.has(id) ? sights.get(id).weaponOverrides?.[w]?.name ?? sights.get(id).name : id);
const ptsOf = (w, slot, id) => id === 'none' ? 0 : slot === 'sight' && id === 'iron' ? data.iron[w] ?? 0
  : (data.choices[w] ?? []).find(([sl, i]) => sl === slot && i === id)?.[2] ?? sitePts(w, slot, id);
// a weapon's other iron sights (flip-up, carry handle, CQB): no icon, like the main irons, so offered as corrections only
const secondIrons = w => sidebarOrder(w, 'sight').filter(id => id !== 'iron' && sights.get(id)?.category === 'iron');
// every slot that can show as a tile on this weapon, in the sidebar's order, with its default and all its choices
const SLOT_ORDER = ['muzzle', 'barrel', 'laser', 'light', 'sight', 'accessory', 'grip', 'ammo', 'mag', 'ergo'];
const NONE_OK = new Set(['muzzle', 'laser', 'light', 'grip', 'ergo', 'accessory']);
function slotsFor(w) {
  const def = defaultsFor(w), choices = data.choices[w] ?? [];
  const out = SLOT_ORDER.filter(sl => sl === 'sight' || choices.some(([c]) => c === sl)).map(slot => {
    const order = sidebarOrder(w, slot), rank = id => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
    const ids = [...new Set([...(NONE_OK.has(slot) ? ['none'] : []), ...(slot === 'sight' ? ['iron', ...secondIrons(w)] : []), ...choices.filter(([c]) => c === slot).map(c => c[1])])].sort((a, b) => rank(a) - rank(b));
    const defaultId = typeof def[slot] === 'string' && ids.includes(def[slot]) ? def[slot] : ids[0];
    return { slot, defaultId, options: ids.map(id => ({ slot, id, name: id === 'none' ? 'None' : siteName(w, slot, id), pts: ptsOf(w, slot, id) })) };
  });
  // a shared laser/light rail is one row, as in the sidebar: "Laser / Light", None then the rail's choices in its order
  const accepts = railOf(w);
  if (!accepts.length) return out;
  const parts = out.filter(s => accepts.includes(s.slot));
  if (!parts.length) return out;
  const order = sidebarRail(w), rank = o => { const i = order.findIndex(a => a.type === o.slot && a.id === o.id); return i < 0 ? order.length : i; };
  const options = [{ slot: accepts[0], id: 'none', name: 'None', pts: 0 }, ...parts.flatMap(s => s.options.filter(o => o.id !== 'none')).sort((x, y) => rank(x) - rank(y))];
  const railDef = def.rail;
  const rail = { slot: 'rail', label: accepts.map(t => t[0].toUpperCase() + t.slice(1)).join(' / '), defaultSlot: railDef?.type ?? accepts[0], defaultId: railDef?.id ?? 'none', options };
  const at = out.indexOf(parts[0]);
  return [...out.slice(0, at), rail, ...out.slice(at).filter(s => !parts.includes(s))];
}
const named = (r, t) => t && { ...t, name: t.slot ? (t.id === 'none' ? 'None' : siteName(r.weapon, t.slot, t.id)) : null };
// what a tile could hold instead, for correcting a misread: the weapon's choices at the tile's cost, in the tile's
// slot when it was read, else in the slots its layout spot can hold (iron sights included at their cost)
function optionsFor(w, cost, slots) {
  const out = (data.choices[w] ?? []).filter(([sl, , p]) => (cost === null || p === cost) && (!slots || slots.includes(sl))).map(([slot, id]) => ({ slot, id }));
  if (!slots || slots.includes('sight')) {
    if (cost === null || data.iron[w] === cost) out.push({ slot: 'sight', id: 'iron' });
    for (const id of secondIrons(w)) if (cost === null || ptsOf(w, 'sight', id) === cost) out.push({ slot: 'sight', id });
  }
  const seen = new Set();
  const orders = new Map(), rank = o => { if (!orders.has(o.slot)) orders.set(o.slot, sidebarOrder(w, o.slot)); const i = orders.get(o.slot).indexOf(o.id); return i < 0 ? 1e3 : i; };
  out.sort((x, y) => SLOT_ORDER.indexOf(x.slot) - SLOT_ORDER.indexOf(y.slot) || rank(x) - rank(y));  // slots, then each as in the sidebar
  return out.filter(o => !seen.has(o.slot + '|' + o.id) && seen.add(o.slot + '|' + o.id)).map(o => ({ ...o, name: siteName(w, o.slot, o.id), pts: ptsOf(w, o.slot, o.id) }));
}
self.onmessage = async ({ data: msg }) => {
  if (msg.type === 'init') {
    ready ??= init(msg.site);
    try { await ready; postMessage({ type: 'ready' }); } catch (e) { ready = null; postMessage({ type: 'error', message: String(e.message ?? e) }); }
  } else if (msg.type === 'read') {
    try {
      const recognize = await ready, r = await recognize(msg.image, { weapon: msg.weapon ?? null });
      const ok = typeof r.weapon === 'string', slots = ok ? slotsFor(r.weapon) : [];
      const weapons = Array.isArray(r.weapon) ? r.weapon : [r.weapon];
      const result = { ...r, weaponName: weapons.map(w => data.weapons.find(x => x.id === w)?.name ?? w).join(' / '),
        tiles: r.tiles.map(t => {
          // a read tile can be changed to anything in its slot (its cost may be misread too), listed as in the sidebar
          const def = ok && t.slot && !t.unclear ? slots.find(s => s.slot === t.slot || (s.slot === 'rail' && railOf(r.weapon).includes(t.slot))) : null;
          // a 0-point tile reads as 'none': the slot's default where the slot has no None
          if (def && t.id === 'none' && !def.options.some(o => o.id === 'none')) t = { ...t, slot: def.defaultSlot ?? def.slot, id: def.defaultId };
          if (def) return { ...named(r, t), options: def.options };
          const spots = t.slot && !t.unclear ? [t.slot] : t.spot, options = optionsFor(r.weapon, t.cost, spots);
          // an unclear tile whose cost matches nothing may have its cost misread too: offer its spot at any cost
          return { ...named(r, t), options: options.length || !t.unclear ? options : optionsFor(r.weapon, null, spots) };
        }),
        slots, railSlots: ok ? railOf(r.weapon) : [], weapons: weaponList,
        hiddenTile: r.hiddenTile && { ...named(r, r.hiddenTile), options: optionsFor(r.weapon, r.hiddenTile.cost, null) } };
      postMessage({ type: 'result', id: msg.id, result });
    } catch (e) { postMessage({ type: 'error', id: msg.id, message: String(e.message ?? e) }); }
  }
};
