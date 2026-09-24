"""Compare displayed spread summaries with actual per-shot site calculations.

Research only: imports current modules unchanged and writes a new external report.
This checks a software summary, not the native game's spread equation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


NODE_PROBE = r"""
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const [root, idsText] = process.argv.slice(2);
const read = p => JSON.parse(fs.readFileSync(root + '/' + p, 'utf8'));
const core = await import(pathToFileURL(root + '/sim/core.js'));
const {applyAttachments, setAttachmentContext} = await import(pathToFileURL(root + '/sim/applyAttachments.js'));
const {resetAttsForWeapon} = await import(pathToFileURL(root + '/sim/loadout.js'));
const weapons = read('data/weapons.json'), attachments = read('data/attachments.json');
const ammo = read('data/ammo.json'), balance = read('data/balance_tables.json');
setAttachmentContext({...attachments, ...ammo, ...balance, HIT_ZONES:read('data/hit_zones.json')});
const rows = [];
for (const id of idsText.split(',')) {
  const raw = weapons.find(w => w.id === id);
  if (!raw) throw Error('Unknown site weapon: ' + id);
  const atts = {};
  resetAttsForWeapon(atts, raw, {...attachments, ...ammo});
  const selected = applyAttachments(raw, atts);
  for (const [kind, weapon] of [['bare-data', raw], ['site-reset-loadout', selected]]) {
    for (const aimState of ['ads', 'hip']) for (const stanceState of ['stand', 'move']) {
      core.setSimContext({aimState, stanceState});
      const samples = core.simulateSpread(weapon, core.SPREAD_EFFECTIVE_MAX_SHOTS + 1);
      const displayed = core.effectiveSpreadMax(weapon);
      if (![displayed, ...samples].every(Number.isFinite)) throw Error('Nonfinite output: ' + id);
      const tooltipPeak = Math.max(...samples.slice(0, 15));
      const samplePeak = Math.max(...samples);
      rows.push({id, kind, aimState, stanceState,
        selections:kind === 'site-reset-loadout' ? atts : null,
        input:{rpm:weapon.rpm, burstRpm:weapon.burstRpm ?? null,
          burstRounds:weapon.burstRounds ?? null, burstBurstsPerMinute:weapon.burstBurstsPerMinute ?? null,
          fireMode:weapon.fireMode, magazine:weapon.mag,
          spreadBounds:core.spreadBounds(weapon), spreadIncrement:core.selectedSpreadIncFor(weapon),
          recoveries:core.spreadRecoveries(weapon)},
        currentSummary:displayed, tooltipPeak, samplePeak,
        shownSummary:displayed.toFixed(2), shownTooltipPeak:tooltipPeak.toFixed(2),
        contradictsTooltipAtDisplayPrecision:Number(displayed.toFixed(2)) < Number(tooltipPeak.toFixed(2)),
        firstPeakShot:samples.indexOf(samplePeak) + 1,
        samples,
        summaryBySampleCount:[48,49,50,51].map(n => ({n, value:core.effectiveSpreadMax(weapon,n)}))});
    }
  }
}
process.stdout.write(JSON.stringify({summaryShots:core.SPREAD_EFFECTIVE_MAX_SHOTS,
  rows, affected:rows.filter(r => r.contradictsTooltipAtDisplayPrecision).map(({id,kind,aimState,stanceState,shownSummary,shownTooltipPeak}) => ({id,kind,aimState,stanceState,shownSummary,shownTooltipPeak}))}));
"""


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--weapons', required=True, help='Comma-separated exact site IDs')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Output exists; use a new external --out.')
    repo = args.repo.resolve()
    probe = subprocess.run(['node', '--input-type=module', '-', str(repo), args.weapons],
                           input=NODE_PROBE, text=True, encoding='utf-8',
                           capture_output=True, check=True)
    report = json.loads(probe.stdout)
    paths = ['sim/core.js', 'sim/applyAttachments.js', 'sim/loadout.js', 'ui/app.js',
             'data/weapons.json', 'data/attachments.json', 'data/ammo.json',
             'data/balance_tables.json', 'data/hit_zones.json']
    report.update(scriptSha256=digest(__file__), inputs=[{'path': p, 'sha256': digest(repo / p)} for p in paths],
                  limits=['Software consistency only; the native equation and state transitions remain unverified.',
                          'Site-reset selections are application defaults, not game-default loadout evidence.',
                          'No magazine depletion or reload is simulated; the earliest contradictory shot is recorded.'])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('x', encoding='utf-8') as output:
        json.dump(report, output, indent=2)
        output.write('\n')
    print(json.dumps({'rows': len(report['rows']), 'affected': report['affected'], 'out': str(args.out)}))


if __name__ == '__main__':
    main()
