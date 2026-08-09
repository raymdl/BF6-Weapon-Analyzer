import crypto from 'node:crypto';
import fs from 'node:fs';

const root = 'C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit';
const normalize = value => {
  const copy = structuredClone(value);
  delete copy.generatedAt;
  return copy;
};
const files = ['attachment-screenshot-review.json', 'rename-manifest.json', 'coverage-report.json'];
const digest = crypto.createHash('sha256');
for (const file of files) digest.update(JSON.stringify(normalize(JSON.parse(fs.readFileSync(`${root}/${file}`, 'utf8')))));
console.log(digest.digest('hex'));
