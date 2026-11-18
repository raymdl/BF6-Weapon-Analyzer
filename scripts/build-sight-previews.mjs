// Copies the sight preview drawings into assets/sights and writes the list the
// site reads (data/sight-previews.json). The drawings are made outside this
// repository, from the game's own models and reticle textures.
//
//   node scripts/build-sight-previews.mjs <optic svg folder> <iron-sight svg folder>
//
// Optic drawings are named by the sight id with its underscores removed
// (th_rds_1_00x -> thrds100x.svg). Iron-sight drawings are named by the weapon
// id, or <weapon id>__<sight id> for a weapon's second iron sight. A sight with
// no drawing is left out of the list and the site shows its tooltip without one.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [opticDir, ironDir] = process.argv.slice(2);
if (!opticDir || !ironDir) {
  console.error('usage: node scripts/build-sight-previews.mjs <optic svg folder> <iron-sight svg folder>');
  process.exit(1);
}

const atts = JSON.parse(readFileSync(join(root, 'data/attachments.json'), 'utf8'));
const sightById = new Map(atts.SIGHTS.map(sight => [sight.id, sight]));
const isIron = id => id === 'iron' || sightById.get(id)?.category === 'iron';
const sightIdsOf = weaponId => (atts.WEAPON_ATTS[weaponId].sight ?? []).map(entry => (typeof entry === 'string' ? entry : entry.id));

const outOptic = join(root, 'assets/sights/optic');
const outIron = join(root, 'assets/sights/iron');
for (const dir of [outOptic, outIron]) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

const optics = [];
const missingOptics = [];
const opticIds = new Set(Object.keys(atts.WEAPON_ATTS).flatMap(sightIdsOf).filter(id => !isIron(id)));
for (const id of [...opticIds].sort()) {
  const source = join(opticDir, `${id.replaceAll('_', '')}.svg`);
  if (!existsSync(source)) { missingOptics.push(id); continue; }
  copyFileSync(source, join(outOptic, `${id}.svg`));
  optics.push(id);
}

const irons = {};
const missingIrons = [];
for (const weaponId of Object.keys(atts.WEAPON_ATTS)) {
  for (const id of sightIdsOf(weaponId).filter(isIron)) {
    const name = id === 'iron' ? weaponId : `${weaponId}__${id}`;
    const source = join(ironDir, `${name}.svg`);
    if (!existsSync(source)) { missingIrons.push(`${weaponId}:${id}`); continue; }
    copyFileSync(source, join(outIron, `${name}.svg`));
    (irons[weaponId] ??= []).push(id);
  }
}

// Every drawing shares one viewBox; the site shows it 280 px wide.
const sample = readFileSync(join(outOptic, `${optics[0]}.svg`), 'utf8');
const [, , boxWidth, boxHeight] = sample.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const width = 280;
const height = Math.round(width * boxHeight / boxWidth);
writeFileSync(join(root, 'data/sight-previews.json'), `${JSON.stringify({ schemaVersion: 1, width, height, optics, irons }, null, 2)}\n`);
console.log(`optics ${optics.length}, iron sights ${Object.values(irons).flat().length}`);
if (missingOptics.length) console.log(`no drawing for optics: ${missingOptics.join(', ')}`);
if (missingIrons.length) console.log(`no drawing for iron sights: ${missingIrons.join(', ')}`);
