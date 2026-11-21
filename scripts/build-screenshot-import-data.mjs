// Builds vendor/screenshot-import/import-data.json, the screenshot reader's lookup data, from the site's own data:
// weapons (id, name, rpm, mag), each weapon's attachment choices (slot, id, points) as the loadout sidebar offers them,
// iron-sight costs, and the sidebar's display names. Iron sights stay out of the choices: they have no icon, and the
// reader finds them by cost and position (the review dialog offers a weapon's other irons as corrections).
// Usage: node scripts/build-screenshot-import-data.mjs   (run before scripts/build-screenshot-import-icons.py)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../sim/loadout.js';

const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const W = read('data/weapons.json'), A = read('data/attachments.json'), AM = read('data/ammo.json');
const site = { ...A, ...AM };
const SLOTS = ['muzzle', 'barrel', 'grip', 'laser', 'light', 'ammo', 'mag', 'ergo', 'sight', 'accessory'];  // accessory: the Optic Accessory
const isIron = a => a.id === 'iron' || a.category === 'iron';

// points as the sidebar shows them (ui/loadout.js renderAttachmentSection)
function points(w, slot, a) {
  if (slot === 'sight') return A.WEAPON_ATTS[w.id]?.sightPoints?.[a.id] ?? L.getAttPts(a, w);
  if (slot === 'ammo') return AM.WEAPON_AMMO?.[w.id]?.ammo?.[a.id] ?? 0;
  return L.getAttPts(a, w);
}

const out = { weapons: [], choices: {}, iron: {}, names: {} };
for (const w of W) {
  out.weapons.push({ id: w.id, name: w.name, rpm: w.rpm, mag: w.mag });
  const rail = A.WEAPON_ATTS[w.id]?.slots?.rail?.accepts ?? [];
  const choices = [];
  for (const slot of SLOTS) {
    const list = rail.includes(slot)
      ? L.availableAttachments(w, 'rail', site).filter(a => a.type === slot)
      : L.availableAttachments(w, slot, site);
    for (const a of list) {
      if (a.id === 'none') continue;
      const pts = points(w, slot, a);
      out.names[`${w.id}|${slot}|${a.id}`] = L.attDisplayName(a, w.id);
      if (slot === 'sight' && a.id === 'iron') out.iron[w.id] = pts;
      if (slot === 'sight' && isIron(a)) continue;
      choices.push([slot, a.id, pts]);
    }
  }
  out.choices[w.id] = choices;
}

const file = fileURLToPath(new URL('vendor/screenshot-import/import-data.json', root));
writeFileSync(file, JSON.stringify(out));
console.log(`${out.weapons.length} weapons, ${Object.values(out.choices).reduce((n, c) => n + c.length, 0)} choices -> ${file}`);
