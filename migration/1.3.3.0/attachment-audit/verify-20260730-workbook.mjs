import fs from 'node:fs/promises';
import JSZip from 'jszip';

const workbookPath = process.argv[2];
const zip = await JSZip.loadAsync(await fs.readFile(workbookPath));
const xml = await zip.file('xl/workbook.xml').async('string');
const names = [...xml.matchAll(/<(?:\w+:)?sheet\b[^>]*name="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (names.length < 3) throw new Error(`Workbook has too few sheets: ${names.length}`);
if (names.at(-2) !== 'Source Index' || names.at(-1) !== 'Read Me') throw new Error(`Unexpected final tabs: ${names.slice(-2).join(', ')}`);
const ppIndex = names.indexOf('PP-19');
if (ppIndex < 0 || ppIndex >= names.length - 2) throw new Error('PP-19 tab missing or misplaced.');
const shared = (await Promise.all(Object.keys(zip.files).filter((p) => /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(p)).map((p) => zip.file(p).async('string')))).join('\n');
for (const name of ['01_PP-19_Muzzle_None.png','07_PP-19_Muzzle_CQB_Suppressor.png','10_PP-19_Barrel_Extended.png','34_PP-19_Ammo_FMJ.png','35_PP-19_Ammo_Tungsten_Core.png','36_PP-19_Ammo_Frangible.png','37_PP-19_Ammo_Hollow_Point.png','38_PP-19_Ammo_Synthetic_Tip.png','39_PP-19_Ammo_Subsonic.png','40_PP-19_Ammo_Subsonic_HP.png','41_PP-19_Ergonomics_None.png','50_PP-19_Laser_120_MW_Blue.png','54_AK4D_Laser_None.png','59_EF88_Light_None.png','18_NVO-228E_Laser_None.png','55_NVO-228E_Light_None.png','40_M2010 ESR_Laser_50_MW_Blue.png','29_M87A1_Magazine_6_SHELL_TUBE.png']) {
  if (!shared.includes(name)) throw new Error(`Workbook string missing: ${name}`);
}
if (shared.includes('PP-19_Muzzle_CQB_Suppressor_duplicate-2')) throw new Error('Workbook still contains duplicate-2 reference.');
console.log(JSON.stringify({ sheets: names.length, pp19TabIndex: ppIndex, finalTabs: names.slice(-2), checkedCurrentPaths: 18 }));
