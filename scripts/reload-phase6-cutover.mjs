import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const attachmentsPath = join(root, 'data/attachments.json');
const attachments = JSON.parse(readFileSync(attachmentsPath, 'utf8'));

let magazineCount = 0;
let removedMagazineFields = 0;
for (const weaponMag of Object.values(attachments.WEAPON_MAG ?? {})) {
  for (const magazine of Object.values(weaponMag.mags ?? {})) {
    magazineCount++;
    if (Object.hasOwn(magazine, 'tacRld')) {
      delete magazine.tacRld;
      removedMagazineFields++;
    }
  }
}

let ergoCount = 0;
for (const weaponErgo of Object.values(attachments.WEAPON_ERGO ?? {})) {
  if (Object.hasOwn(weaponErgo, 'magCatchRld')) {
    delete weaponErgo.magCatchRld;
    ergoCount++;
  }
}

if (magazineCount !== 265 || removedMagazineFields !== 265) {
  throw new Error(`Expected 265 magazine tacRld fields; found ${removedMagazineFields}/${magazineCount}`);
}
if (ergoCount !== 24) throw new Error(`Expected 24 magCatchRld blocks; removed ${ergoCount}`);

writeFileSync(attachmentsPath, `${JSON.stringify(attachments, null, 2)}\n`);
console.log(JSON.stringify({
  kind: 'reload-phase6-data-cutover',
  removedMagazineTacRld: removedMagazineFields,
  removedMagCatchRldBlocks: ergoCount,
}, null, 2));
