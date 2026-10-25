import { summarizeTargetImpacts } from '../sim/target.js';

export function targetImpactStatsHtml(entries, { distance, showHeading = false, labelFor } ) {
  const colors = ['c1', 'c2'];
  const fmtDamage = value => value == null ? '—' : value.toFixed(1);
  const fmtMult = value => value == null ? '' : `<span class="target-zone-mult">${value.toFixed(2)}×</span>`;
  // 100 health is a kill. 75 is the critical-assist threshold — it says nothing
  // about a follow-up body shot, since that depends on the weapon's damage at
  // this range.
  const damageClass = value => value == null ? '' : value >= 100 ? ' class="dmg-kill"' : value >= 75 ? ' class="dmg-crit"' : '';
  // The tab strip names the block, so the heading is only needed where the
  // strip is absent. Range and aim point already live on the distance slider
  // and the aim read-out, so no context line is repeated here.
  let html = showHeading ? '<div class="rc-stats-head"><div class="ptitle">Target Impact Stats</div></div>' : '';

  if (!entries.length) return '<p class="target-impact-note">Target image is loading or unavailable. Hit results are not available.</p>';
  entries.forEach((entry, index) => {
    // A pellet load is scored only from sampled pellets, never from shell directions.
    if ((entry.weapon.pellets ?? 1) > 1 && entry.zones?.length && !entry.zones.some(Array.isArray)) {
      html += `<section class="target-impact-card"><div class="target-impact-weapon ${colors[index] ?? ''}">${labelFor(entry.weapon, index)}</div>
        <p class="target-impact-note">Shotgun pellets were not sampled for this spray, so hit rate, damage and lethality are unavailable.</p></section>`;
      return;
    }
    if (!Number.isFinite(entry.weapon._hsMult) || !Number.isFinite(entry.weapon._limbMult)) {
      html += '<p class="target-impact-note">Target damage and lethality are unavailable: missing hit-zone data.</p>';
      return;
    }
    const summary = summarizeTargetImpacts(entry.weapon, distance, entry.zones);
    const unit = summary.perPellet ? 'pellet' : 'shot';
    const kill = summary.lethalShot == null
      ? '<strong>None</strong>'
      : `<strong title="Took ${summary.lethalHit} ${unit} hits out of the first ${summary.lethalShot} ${summary.perPellet ? 'shells' : 'shots'} fired">${summary.lethalHit} / ${summary.lethalShot}</strong>`;
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
  html += '<div class="target-impact-note">Multipliers include the weapon\'s hit-zone class and ammo effects. Damage uses the selected weapon, ammo, attachments, and range. Results describe this simulated spray, not expected player accuracy. Target shape and hit zones are approximate. Total damage includes hits after the first lethal shot. Shotgun figures count pellets; the lethal figure is pellet hits over shells fired.</div>';
  return html;
}
