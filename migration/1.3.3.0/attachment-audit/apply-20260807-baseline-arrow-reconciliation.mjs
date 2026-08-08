/**
 * Reconcile every stat comparison arrow against the weapon's own baseline.
 *
 * In the customise screen a stat is drawn with an up/down arrow exactly when it differs from
 * the currently equipped configuration. Every capture in this corpus was taken from a bare
 * weapon, so within one weapon a stat has one baseline value — the one carried by the "None"
 * card of each slot — and any other value must carry an arrow whose direction is the sign of
 * the difference.
 *
 * The corpus violates that invariant in both directions:
 *
 *   - Missed arrows. The comparison scanner never fired on some rows; e.g. M277 Classic
 *     Vertical drops recoil amount from 1.0 to 0.7 and the screenshot plainly shows a green
 *     down arrow, but the record has no recoilAmountDegrees comparison at all.
 *   - False arrows. Out-of-focus background behind the translucent panel reads as coloured
 *     pixels; e.g. every M39 EMR grip capture carries an "up/red" damage arrow, including the
 *     None card, while the screenshot shows a plain white DMG 41.
 *
 * A value differing from the baseline is unambiguous evidence, so this adds the missing arrow
 * and corrects any arrow pointing the wrong way. The converse does not hold: the panel rounds
 * for display, so a real change can tie the baseline on screen — B36A4 Slim Angled shows a
 * green down arrow on a recoil amount of 0.7° against a baseline that also reads 0.7°. An arrow
 * on a tie is therefore only deleted when the same weapon shows that arrow on its own "None"
 * card too, which no real comparison can do and which is the signature of the background
 * false positive.
 *
 * Values are left untouched — where a value is itself misread the arrow would follow the bad
 * value, so a weapon/stat is only repaired when its baseline is beyond doubt: every "None" card
 * agrees on it, and no arrow already in the corpus contradicts it. AK-205 mobility fails that
 * test — its None cards split between 50 and 60, and its magazine captures carry red down
 * arrows on values above 50 — so it is left alone rather than "corrected" into up arrows that
 * the screenshots disprove.
 *
 * Skipped by design:
 *   - BROD 3 and EF88 precision. Their in-game stat screens report a bugged precision value.
 *   - Any weapon/stat with no "None" card, a disputed one, or one its own arrows contradict.
 *
 * Everything skipped here is listed by report-20260807-stat-value-outliers.mjs for a
 * screenshot re-read.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

/** Direction that reads as a buff, taken from the arrow colours the scanner already agrees on. */
const BUFF_DIRECTION = {
  damage: 'up',
  rateOfFireRpm: 'up',
  magazineSize: 'up',
  hipfire: 'up',
  precision: 'up',
  control: 'up',
  mobility: 'up',
  muzzleVelocityMps: 'up',
  headshotMultiplier: 'up',
  longRangeDamage: 'up',
  collateralMultiplier: 'up',
  adsMoveSpeedMultiplier: 'up',
  reloadTimeSeconds: 'down',
  adsTimeMs: 'down',
  sprintRecoveryMs: 'down',
  recoilAmountDegrees: 'down',
  recoilVariationDegrees: 'down',
  spotOnFire3dM: 'down',
  spotOnFire2dM: 'down',
  opponentHealthRegenDelaySeconds: 'down',
};
const STATS = Object.keys(BUFF_DIRECTION);
const BUGGED_PRECISION = new Set(['BROD 3', 'EF88']);

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const detail = document.records.filter(record => record.stats);

const byWeapon = new Map();
for (const record of detail) {
  if (!byWeapon.has(record.weaponName)) byWeapon.set(record.weaponName, []);
  byWeapon.get(record.weaponName).push(record);
}

const mode = (values) => {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0];
};

/**
 * Baseline per weapon+stat: the value the slot "None" cards agree on, kept only when they are
 * unanimous and no arrow already recorded for that weapon contradicts it. A down arrow on a
 * value above the baseline (or an up arrow below it) means either the baseline or the values
 * are misread, and nothing available here can say which.
 */
const baselines = new Map();
const disputed = [];
for (const [weapon, records] of byWeapon) {
  for (const stat of STATS) {
    const values = records
      .filter(record => record.attachmentName === 'None')
      .map(record => record.stats[stat])
      .filter(value => typeof value === 'number');
    if (!values.length) continue;
    const [value, support] = mode(values);
    if (support !== values.length) {
      disputed.push({ weapon, stat, reason: 'none-cards-disagree', values: [...new Set(values)] });
      continue;
    }
    const contradiction = records.find(record => {
      const observed = record.stats[stat];
      const arrow = (record.statComparisons ?? {})[stat];
      if (typeof observed !== 'number' || !arrow) return false;
      return arrow.direction === 'up' ? observed < value : observed > value;
    });
    if (contradiction) {
      disputed.push({
        weapon, stat, reason: 'arrow-contradicts-baseline', baseline: value,
        attachment: contradiction.attachmentName, observed: contradiction.stats[stat],
        arrow: contradiction.statComparisons[stat].direction,
      });
      continue;
    }
    baselines.set(`${weapon} ${stat}`, { value, support, total: values.length });
  }
}

/**
 * Rows whose value is the suspect half of the disagreement rather than the arrow. A value is
 * suspect when the same attachment moves the same stat the other way on most other weapons.
 */
const signOf = delta => (delta === 0 ? 0 : delta > 0 ? 1 : -1);
const directions = new Map();
for (const [weapon, records] of byWeapon) {
  for (const record of records) {
    if (!record.attachmentName || record.attachmentName === 'None') continue;
    for (const stat of STATS) {
      const value = record.stats[stat];
      const baseline = baselines.get(`${weapon} ${stat}`);
      if (typeof value !== 'number' || !baseline) continue;
      const key = `${record.attachmentType} ${record.attachmentName} ${stat}`;
      if (!directions.has(key)) directions.set(key, new Map());
      directions.get(key).set(weapon, signOf(value - baseline.value));
    }
  }
}
const suspect = new Set();
for (const [key, perWeapon] of directions) {
  if (perWeapon.size < 4) continue;
  const [majority, count] = mode([...perWeapon.values()]);
  if (count / perWeapon.size < 0.7) continue;
  for (const [weapon, sign] of perWeapon) {
    if (sign !== majority) suspect.add(`${weapon} ${key}`);
  }
}

/**
 * Weapon+stat pairs where the scanner drew an arrow on a "None" card. Nothing is equipped on
 * those captures, so every arrow it reports for that stat on that weapon is background noise.
 */
const falsePositive = new Set();
for (const record of detail) {
  if (record.attachmentName !== 'None') continue;
  for (const stat of Object.keys(record.statComparisons ?? {})) {
    falsePositive.add(`${record.weaponName} ${stat}`);
  }
}

const summary = { added: 0, removed: 0, redirected: 0, unchanged: 0, skippedSuspect: 0, keptTie: 0 };
const changes = [];

for (const record of detail) {
  const weapon = record.weaponName;
  const comparisons = record.statComparisons ?? {};
  let touched = false;

  for (const stat of STATS) {
    if (stat === 'precision' && BUGGED_PRECISION.has(weapon)) continue;
    const value = record.stats[stat];
    const baseline = baselines.get(`${weapon} ${stat}`);
    if (typeof value !== 'number' || !baseline) continue;

    const suspectKey = `${weapon} ${record.attachmentType} ${record.attachmentName} ${stat}`;
    if (suspect.has(suspectKey)) { summary.skippedSuspect += 1; continue; }

    const delta = value - baseline.value;
    const existing = comparisons[stat];

    if (delta === 0) {
      if (!existing) { summary.unchanged += 1; continue; }
      if (!falsePositive.has(`${weapon} ${stat}`)) { summary.keptTie += 1; continue; }
      delete comparisons[stat];
      summary.removed += 1;
      touched = true;
      changes.push({ weapon, attachment: record.attachmentName, stat, action: 'removed', value, baseline: baseline.value, was: existing.direction });
      continue;
    }

    const direction = delta > 0 ? 'up' : 'down';
    const effect = direction === BUFF_DIRECTION[stat] ? 'buff' : 'penalty';
    const colour = effect === 'buff' ? 'green' : 'red';

    if (!existing) {
      comparisons[stat] = { direction, effect, color: colour, source: 'baseline-delta' };
      summary.added += 1;
      touched = true;
      changes.push({ weapon, attachment: record.attachmentName, stat, action: 'added', value, baseline: baseline.value, direction });
      continue;
    }

    if (existing.direction !== direction || existing.effect !== effect || existing.color !== colour) {
      changes.push({ weapon, attachment: record.attachmentName, stat, action: 'redirected', value, baseline: baseline.value, was: existing.direction, direction });
      existing.direction = direction;
      existing.effect = effect;
      existing.color = colour;
      existing.source = 'baseline-delta';
      summary.redirected += 1;
      touched = true;
    } else {
      summary.unchanged += 1;
    }
  }

  if (touched) record.statComparisons = comparisons;
}

document.generatedAt = new Date().toISOString();
fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);
fs.writeFileSync(path.join(auditRoot, 'baseline-arrow-reconciliation-20260807.json'),
  `${JSON.stringify({ summary, disputed, changes }, null, 2)}\n`);
summary.disputedBaselines = disputed.length;

console.log(summary);
