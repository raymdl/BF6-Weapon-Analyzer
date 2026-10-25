import { summarizeTargetImpacts } from '../sim/target.js';

export function targetImpactStatsHtml(entries, { distance, showHeading = false, labelFor } ) {
  const colors = ['c1', 'c2'];
  const fmtDamage = value => value == null ? '—' : value.toFixed(1);
  const fmtMult = value => value == null ? '' : `<span class="target-zone-mult">${value.toFixed(2)}×</span>`;
  // 100 health is a kill. 75 is the critical-assist threshold — it says nothing
  // about a follow-up body shot, since that depends on the weapon's damage at
  // this range.
  const damageClass = value => value == null ? '' : value >= 100 ? ' class="dmg-kill"' : value >= 75 ? ' class="dmg-crit"' : '';
  // A pellet load is scored only from sampled pellets, never from shell directions.
  const pelletsUnsampled = entry => (entry.weapon.pellets ?? 1) > 1 && entry.zones?.length && !entry.zones.some(Array.isArray);
  const missingZoneData = entry => !Number.isFinite(entry.weapon._hsMult) || !Number.isFinite(entry.weapon._limbMult);
  const unitOf = summary => summary.perPellet ? 'pellet' : 'shot';
  const killTitle = summary => `Took ${summary.lethalHit} ${unitOf(summary)} hits out of the first ${summary.lethalShot} ${summary.perPellet ? 'shells' : 'shots'} fired`;
  // The tab strip names the block, so the heading is only needed where the
  // strip is absent. Range and aim point already live on the distance slider
  // and the aim read-out, so no context line is repeated here.
  let html = showHeading ? '<div class="rc-stats-head"><div class="ptitle">Target Impact Stats</div></div>' : '';
  const note = '<div class="target-impact-note">Multipliers include the weapon\'s hit-zone class and ammo effects. Damage uses the selected weapon, ammo, attachments, and range. Results describe this simulated spray, not expected player accuracy. Target shape and hit zones are approximate. Total damage includes hits after the first lethal shot. Shotgun figures count pellets; the lethal figure is pellet hits over shells fired.</div>';

  if (!entries.length) return '<p class="target-impact-note">Target image is loading or unavailable. Hit results are not available.</p>';

  if (entries.length === 2 && !entries.some(entry => pelletsUnsampled(entry) || missingZoneData(entry))) {
    const combined = comparisonHtml(entries);
    if (combined) return html + combined + note;
  }

  entries.forEach((entry, index) => {
    if (pelletsUnsampled(entry)) {
      html += `<section class="target-impact-card"><div class="target-impact-weapon ${colors[index] ?? ''}">${labelFor(entry.weapon, index)}</div>
        <p class="target-impact-note">Shotgun pellets were not sampled for this spray, so hit rate, damage and lethality are unavailable.</p></section>`;
      return;
    }
    if (missingZoneData(entry)) {
      html += '<p class="target-impact-note">Target damage and lethality are unavailable: missing hit-zone data.</p>';
      return;
    }
    const summary = summarizeTargetImpacts(entry.weapon, distance, entry.zones);
    const unit = unitOf(summary);
    const kill = summary.lethalShot == null
      ? '<strong>None</strong>'
      : `<strong title="${killTitle(summary)}">${summary.lethalHit} / ${summary.lethalShot}</strong>`;
    // Only the running total decides a kill, so per-zone damage stays neutral.
    const rows = summary.zones.map(zone => `
      <tr${zone.hits ? '' : ' class="no-hits"'}>
        <th scope="row">${zone.label} ${fmtMult(zone.multiplier)}</th>
        <td>${zone.hits}</td>
        <td>${fmtDamage(zone.damagePerHit)}</td>
        <td>${fmtDamage(zone.damage)}</td>
      </tr>`).join('');
    const missed = summary.misses;
    const missRow = `
      <tr class="${missed ? 'target-zone-miss' : 'no-hits'}">
        <th scope="row">Missed</th>
        <td>${missed}</td>
        <td>—</td>
        <td>—</td>
      </tr>`;
    html += `
      <section class="target-impact-card">
        <div class="target-impact-weapon ${colors[index] ?? ''}">${labelFor(entry.weapon, index)}</div>
        <div class="target-impact-summary">
          <div><span>Accuracy</span><strong title="${summary.hits} of ${summary.projectiles} ${unit}s hit">${(summary.accuracy * 100).toFixed(0)}%</strong></div>
          <div><span>Hits</span><strong title="${unit} hits / ${unit}s fired">${summary.hits} / ${summary.projectiles}</strong></div>
          <div><span>Total dmg</span><strong${damageClass(summary.totalDamage)} title="100+ is lethal; 75+ counts as a critical assist">${fmtDamage(summary.totalDamage)}</strong></div>
          <div><span>Lethal</span>${kill}</div>
        </div>
        <table class="target-zone-table">
          <thead><tr><th>Body Part</th><th>Hits</th><th>Dmg / Hit</th><th>Damage</th></tr></thead>

          <tbody>${rows}${missRow}</tbody>
        </table>
      </section>`;
  });
  return html + note;

  // Both weapons on one table, weapon 2 minus weapon 1 in the middle column.
  // Returns null when the zone lists differ so the caller falls back to cards.
  function comparisonHtml(pair) {
    const [s1, s2] = pair.map(entry => summarizeTargetImpacts(entry.weapon, distance, entry.zones));
    if (s1.zones.length !== s2.zones.length || s1.zones.some((zone, i) => zone.zone !== s2.zones[i].zone)) return null;
    const [w1, w2] = pair.map(entry => entry.weapon);
    // Deltas are taken from the rounded figures shown, so the column always
    // agrees with the numbers either side of it.
    const signed = (value, digits = 0) => {
      const rounded = Number(value.toFixed(digits));
      if (rounded === 0) return (0).toFixed(digits);
      return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(digits)}`;
    };
    const roundedDiff = (a, b, digits) => Number(b.toFixed(digits)) - Number(a.toFixed(digits));
    const delta = text => `<td class="impact-cmp-delta">${text}</td>`;
    const pct = summary => Math.round(summary.accuracy * 100);
    const sumCell = (summary, which) => {
      const unit = unitOf(summary);
      if (which === 'accuracy') return `<td colspan="3" title="${summary.hits} of ${summary.projectiles} ${unit}s hit">${pct(summary)}%</td>`;
      if (which === 'hits') return `<td colspan="3" title="${unit} hits / ${unit}s fired">${summary.hits} / ${summary.projectiles}</td>`;
      if (which === 'damage') return `<td colspan="3"${damageClass(summary.totalDamage)} title="100+ is lethal; 75+ counts as a critical assist">${fmtDamage(summary.totalDamage)}</td>`;
      return summary.lethalShot == null
        ? '<td colspan="3">None</td>'
        : `<td colspan="3" title="${killTitle(summary)}">${summary.lethalHit} / ${summary.lethalShot}</td>`;
    };
    const sumRows = [
      ['accuracy', 'Accuracy', `${signed(pct(s2) - pct(s1))} pp`],
      ['hits', 'Hits', signed(s2.hits - s1.hits)],
      ['damage', 'Total dmg', signed(roundedDiff(s1.totalDamage, s2.totalDamage, 1), 1)],
      ['lethal', 'Lethal', '—'],
    ].map(([which, label, diff], i, all) => `
        <tr class="impact-cmp-sum${i === all.length - 1 ? ' last' : ''}">
          <th scope="row">${label}</th>${sumCell(s1, which)}${delta(diff)}${sumCell(s2, which)}
        </tr>`).join('');
    const multHtml = (a, b) => {
      const fa = a == null ? '—' : `${a.toFixed(2)}×`;
      const fb = b == null ? '—' : `${b.toFixed(2)}×`;
      return fa === fb ? fmtMult(a) : `<span class="target-zone-mult">${fa} / ${fb}</span>`;
    };
    const zoneCells = zone => `<td>${zone.hits}</td><td>${fmtDamage(zone.damagePerHit)}</td><td>${fmtDamage(zone.damage)}</td>`;
    // Only the running total decides a kill, so per-zone damage stays neutral.
    const zoneRows = s1.zones.map((z1, i) => {
      const z2 = s2.zones[i];
      return `
        <tr${z1.hits || z2.hits ? '' : ' class="no-hits"'}>
          <th scope="row">${z1.label} ${multHtml(z1.multiplier, z2.multiplier)}</th>${zoneCells(z1)}${delta(signed(roundedDiff(z1.damage, z2.damage, 1), 1))}${zoneCells(z2)}
        </tr>`;
    }).join('');
    const missRow = `
        <tr class="${s1.misses || s2.misses ? 'target-zone-miss' : 'no-hits'}">
          <th scope="row">Missed</th><td>${s1.misses}</td><td>—</td><td>—</td>${delta(signed(s2.misses - s1.misses))}<td>${s2.misses}</td><td>—</td><td>—</td>
        </tr>`;
    return `
      <section class="target-impact-card">
        <table class="impact-cmp">
          <thead>
            <tr class="impact-cmp-names"><th></th><th colspan="3" class="c1">${labelFor(w1, 0)}</th><th class="impact-cmp-delta">Δ 2−1</th><th colspan="3" class="c2">${labelFor(w2, 1)}</th></tr>
            <tr><th>Body Part</th><th>Hits</th><th>Dmg/Hit</th><th>Dmg</th><th class="impact-cmp-delta">Δ Dmg</th><th>Hits</th><th>Dmg/Hit</th><th>Dmg</th></tr>
          </thead>
          <tbody>${sumRows}${zoneRows}${missRow}</tbody>
        </table>
      </section>`;
  }
}
