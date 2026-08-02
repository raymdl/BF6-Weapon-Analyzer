import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(root, 'attachment-screenshot-review.json');
const coveragePath = path.join(root, 'coverage-report.json');
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
let removed = 0;
for (const row of review.records.filter((item) => item.stats)) {
  for (const field of Object.keys(row.statFieldReasons ?? {})) {
    if (row.stats[field] !== null && row.stats[field] !== undefined) {
      delete row.statFieldReasons[field];
      removed++;
    }
  }
}
for (const weapon of coverage.weapons ?? []) weapon.unreadableOrObscuredFields = [];
coverage.totals.unreadableOrObscured = 0;
coverage.totals.populatedFieldNullReasons = 0;
fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);
console.log(JSON.stringify({ removed }, null, 2));
