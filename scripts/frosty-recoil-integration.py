#!/usr/bin/env python3
"""Compare Analyzer decay stepping to RK4 for real source-checked site recoil groups."""
import argparse
import hashlib
import json
import pathlib
import subprocess

SOURCE_FIELDS = {
    'decFactor': 'RecoilDecreaseFactor',
    'decExp': 'RecoilDecreaseExponent',
    'decTimeExp': 'RecoilDecreaseTimeExponent',
    'decOffset': 'RecoilDecreaseOffset',
}


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def rk4_residual(amplitude, factor, exponent, time_exp, offset, interval, h):
    # u = integral(factor * t**time_exp dt), so the same documented ODE is
    # dr/du = -(r**exponent + offset). This variable change is independent of
    # the repo's 1 ms update loop and avoids wasting steps while t**4 is tiny.
    x, u = amplitude, 0.0
    end = factor * interval ** (time_exp + 1) / (time_exp + 1)
    while u < end and x > 0:
        step = min(h, end - u)
        def f(xx):
            return -(max(0.0, xx) ** exponent + offset)
        k1 = f(x)
        k2 = f(x + step * k1 / 2)
        k3 = f(x + step * k2 / 2)
        k4 = f(x + step * k3)
        x = max(0.0, x + step * (k1 + 2*k2 + 2*k3 + k4) / 6)
        u += step
    return x


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', required=True, type=pathlib.Path)
    p.add_argument('--source-details', required=True, type=pathlib.Path)
    p.add_argument('--source-details-sha256', required=True)
    p.add_argument('--out', required=True, type=pathlib.Path)
    p.add_argument('--dec-exp', required=True, type=float)
    p.add_argument('--time-exp', required=True, type=float)
    p.add_argument('--integration-steps', nargs='+', type=float, default=[1e-3, 5e-4, 2.5e-4],
                   help='RK4 maximum steps in cumulative decay-weight units u')
    p.add_argument('--sequence-shots', type=int, default=20,
                   help='Upper bound; each test is capped at the stored base magazine')
    p.add_argument('--axis-step-degrees', type=float, default=0.1)
    a = p.parse_args()
    if len(a.integration_steps) < 2 or any(h <= 0 for h in a.integration_steps) or a.sequence_shots < 1 or a.axis_step_degrees <= 0 or a.time_exp <= -1:
        p.error("Require at least two positive integration steps, positive shots/axis step, and time exponent > -1.")
    if a.out.exists():
        p.error(f'refusing to overwrite {a.out}')
    repo = a.repo.resolve()
    helper = pathlib.Path(__file__).resolve().with_name('frosty-recoil-functions.mjs')
    weapons_path = repo / 'data' / 'weapons.json'
    core_path = repo / 'sim' / 'core.js'
    details_sha = sha(a.source_details)
    if details_sha.lower() != a.source_details_sha256.lower():
        p.error('pinned raw-detail report SHA256 does not match')
    details = json.loads(a.source_details.read_text(encoding='utf-8'))
    weapons = json.loads(weapons_path.read_text(encoding='utf-8'))
    cases, source_checks = [], []
    for w in weapons:
        for aim in ('ads', 'hip'):
            g = w.get('recoil', {}).get(aim, {})
            if g.get('decExp') != a.dec_exp or g.get('decTimeExp') != a.time_exp:
                continue
            for local, source_name in SOURCE_FIELDS.items():
                found = [r for r in details['rawFields'] if r['siteWeapon'] == w['id']
                         and r['aim'] == aim and r['fieldName'] == source_name]
                if len(found) != 1:
                    p.error(f'expected one pinned source row for {w["id"]} {aim} {source_name}; found {len(found)}')
                row = found[0]
                if abs(float(row['sourceValue']) - float(g[local])) > 1e-6:
                    p.error(f'current site value differs from pinned source row: {w["id"]} {aim} {local}')
                source_checks.append(dict(weaponId=w['id'], aim=aim, siteField=local,
                    sourceField=source_name, sourceValue=row['sourceValue'], siteValue=g[local],
                    rawSha256=row['rawSha256'], captureId=row['captureId'], rawBytesHex=row['rawBytesHex']))
            base = g['amount'] * g['amountMult'] ** g['amountExp']
            magnitude = base * (w.get('recoilV', base) / base if aim == 'ads' and base else 1)
            shots = min(a.sequence_shots, int(w.get('mag', a.sequence_shots)))
            cases.append(dict(weapon=w, aim=aim, amplitude=magnitude, decFactor=g['decFactor'],
                decExp=g['decExp'], timeExp=g['decTimeExp'], decOffset=g['decOffset'],
                sequenceShots=shots))
    if not cases:
        p.error('no site aim groups match the requested exponents')
    node = subprocess.run(['node', str(helper), str(repo)], input=json.dumps(cases),
        text=True, capture_output=True, check=True)
    core = {(x['id'], x['aim']): x for x in json.loads(node.stdout)}
    rows = []
    for c in cases:
        w, aim = c['weapon'], c['aim']
        sim = core[(w['id'], aim)]
        interval = sim['shotIntervalSeconds']
        refs = [rk4_residual(c['amplitude'], c['decFactor'], c['decExp'], c['timeExp'],
            c['decOffset'], interval, h) for h in a.integration_steps]
        error = sim['repoResidual'] - refs[-1]
        seq_refs = []
        for h in a.integration_steps[:2]:
            state, path = 0.0, []
            for _ in range(c['sequenceShots']):
                state = rk4_residual(state + c['amplitude'], c['decFactor'], c['decExp'],
                    c['timeExp'], c['decOffset'], interval, h)
                path.append(state)
            seq_refs.append(path)
        repo_sequence = sim['repoSequence']
        seq_errors = [repo_sequence[i] - seq_refs[-1][i] for i in range(c['sequenceShots'])]
        convergence = max(abs(seq_refs[0][i] - seq_refs[1][i]) for i in range(c['sequenceShots']))
        rows.append(dict(weaponId=w['id'], weaponName=w['name'], aim=aim, rpm=w['rpm'],
            baseMagazine=w.get('mag'), testedSequenceShots=c['sequenceShots'], shotIntervalSeconds=interval,
            selectedSiteMagnitudeDegrees=c['amplitude'], durationSeconds=w['recoil'][aim]['duration'],
            decayInputs={k:g for k,g in c.items() if k in ('decFactor','decExp','timeExp','decOffset')},
            repo1msResidual=sim['repoResidual'], rk4ResidualByStep=dict(
                (format(h,'.9g'),v) for h,v in zip(a.integration_steps,refs)),
            convergedRk4Residual=refs[-1], oneIntervalErrorDegrees=error,
            oneIntervalAbsErrorDegrees=abs(error), oneIntervalFractionOfAxisStep=abs(error)/a.axis_step_degrees,
            cappedInstantPulseDecaySequence=dict(repoResiduals=repo_sequence, rk4Residuals=seq_refs[-1],
                repoMinusRk4=seq_errors, maxAbsErrorDegrees=max(map(abs,seq_errors)),
                rk4StepHalvingMaxDifference=convergence)))
    max_one = max(r['oneIntervalAbsErrorDegrees'] for r in rows)
    max_seq = max(r['cappedInstantPulseDecaySequence']['maxAbsErrorDegrees'] for r in rows)
    report = dict(schemaVersion=1,
        method='Repo sim/core.js applyRecoilDecay compared with independent RK4 integration of the documented assumed ODE. RK4 uses the configured maximum step sizes in cumulative decay-weight units; the repeated scalar pulse check is capped at each weapon base magazine.',
        equation='d|r|/dt = -decFactor * (|r|**decExp + decOffset) * t**decTimeExp; recovery age starts at zero at each shot.',
        buildReference='BF6 1.4.3.0; source detail report pins archive head and descriptor identity.',
        requestedGroup=dict(decExp=a.dec_exp, timeExp=a.time_exp),
        rk4MaximumStepSizesInCumulativeDecayWeight=a.integration_steps,
        axisStepDegrees=a.axis_step_degrees, caseCount=len(rows), sourceFieldComparisonCount=len(source_checks),
        sourceDetailPath=str(a.source_details), sourceDetailSha256=details_sha,
        inputSha256={str(weapons_path):sha(weapons_path), str(core_path):sha(core_path),
                     str(helper):sha(helper), str(a.source_details):details_sha},
        maxOneIntervalErrorDegrees=max_one, maxCappedSequenceErrorDegrees=max_seq,
        allOneIntervalErrorsBelowHalfAxisStep=all(r['oneIntervalFractionOfAxisStep'] < 0.5 for r in rows),
        sourceFieldComparisons=source_checks, rows=rows,
        limits=['The equation is the Analyzer model under test, not proof of the native equation.',
                'The repeated sequence uses instantaneous scalar site magnitudes and is capped at stored base magazine capacity. It omits the Analyzer 25 ms uniform shot delivery, directional variation, and attachment modifiers.',
                'The whole weapons.json hash differs from the historical hash recorded in the prior provenance receipt; the current weapons.json is pinned in this report, and all tested non-neutral decay scalars are independently matched to the prior raw-detail rows.'])
    a.out.parent.mkdir(parents=True, exist_ok=True)
    with a.out.open('x', encoding='utf-8') as f:
        json.dump(report, f, indent=2); f.write('\n')
    print(json.dumps(dict(out=str(a.out), cases=len(rows), sourceFieldComparisons=len(source_checks),
        maxOneIntervalErrorDegrees=max_one, maxCappedSequenceErrorDegrees=max_seq,
        allErrorsBelowHalfAxisStep=report['allOneIntervalErrorsBelowHalfAxisStep'])))

if __name__ == '__main__':
    main()
