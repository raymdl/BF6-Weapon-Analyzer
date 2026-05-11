import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');

const commitDate = execFileSync('git', ['log', '-1', '--format=%cs'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

const [year, month, day] = commitDate.split('-').map(Number);
const label = `Updated ${day} ${monthNames[month - 1]} ${year}`;
const html = readFileSync(indexPath, 'utf8');
const dateTagPattern = /<div class="hdr-tag">Updated [^<]+<\/div>/;

if (!dateTagPattern.test(html)) {
  throw new Error('Could not find header updated-date tag in index.html');
}

const updated = html.replace(dateTagPattern, `<div class="hdr-tag">${label}</div>`);
writeFileSync(indexPath, updated);
console.log(label);
