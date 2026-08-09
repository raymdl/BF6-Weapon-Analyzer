import fs from 'node:fs';

const root = 'C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit';
const weapons = new Set(['M433', 'PP-19']);
const read = name => JSON.parse(fs.readFileSync(`${root}/${name}`, 'utf8'));
const write = (name, value) => fs.writeFileSync(`${root}/${name}`, `${JSON.stringify(value, null, 2)}\n`);

function mergeArray(canonicalName, rerunName, getWeapon) {
  const canonical = read(canonicalName);
  const rerun = read(rerunName);
  const merged = [...canonical.filter(item => !weapons.has(getWeapon(item))), ...rerun];
  write(canonicalName, merged);
  return { canonical: canonical.length, rerun: rerun.length, merged: merged.length };
}

const raw = mergeArray('raw-ocr.json', 'raw-ocr.m433-pp19-rerun.json', item => item.weapon);
const panel = mergeArray('panel-ocr.json', 'panel-ocr.m433-pp19-rerun.json', item => item.weapon);
const values = mergeArray('value-ocr.json', 'value-ocr.m433-pp19-rerun.json', item => item.weapon);
const costs = mergeArray('cost-ocr.json', 'cost-ocr.m433-pp19-rerun.json', item => item.weapon);
const comparisons = mergeArray('stat-comparisons.json', 'stat-comparisons.m433-pp19-rerun.json', item => {
  const source = String(item.sourcePath ?? '');
  return /\\(?:M433|PP-19)\\/i.test(source) ? source.match(/\\(M433|PP-19)\\/i)[1] : '';
});
console.log(JSON.stringify({ raw, panel, values, costs, comparisons }));
