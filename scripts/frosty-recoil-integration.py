#!/usr/bin/env python3
"""Compare Analyzer decay stepping to RK4 for real source-checked site recoil groups."""
import argparse
import hashlib
import json
import math
import pathlib
import subprocess

SOURCE_FIELDS = {
    'decFactor': 'RecoilDecreaseFactor',
    'decExp': 'RecoilDecreaseExponent',
    'decTimeExp': 'RecoilDecreaseTimeExponent',
    'decOffset': 'RecoilDecreaseOffset',
}

FULL_PATH_SOURCE_FIELDS = {
    'dir': 'RecoilDirection',
    'amount': 'RecoilAmount',
    'amountMult': 'RecoilAmountMultiplier',
    'amountExp': 'RecoilAmountMultiplierExponent',
    'dirVar': 'RecoilDirectionVariation',
    'dirVarMult': 'RecoilDirectionVariationMultiplier',
    'dirVarExp': 'RecoilDirectionVariationMultiplierExponent',
    'decFactor': 'RecoilDecreaseFactor',
    'decExp': 'RecoilDecreaseExponent',
    'decTimeExp': 'RecoilDecreaseTimeExponent',
    'decOffset': 'RecoilDecreaseOffset',
    'duration': 'RecoilDuration',
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


def mulberry32_values(seed, count):
    mask = 0xffffffff
    state = seed & mask
    values = []
    for _ in range(count):
        state = (state + 0x6D2B79F5) & mask
        t = (((state ^ (state >> 15)) * (1 | state)) & mask)
        t = (((t + (((t ^ (t >> 7)) * (61 | t)) & mask)) & mask) ^ t) & mask
        values.append(((t ^ (t >> 14)) & mask) / 0x100000000)
    return values


def recoil_hash(value):
    h = 0
    for char in value:
        h = ((31 * h + ord(char)) & 0xffffffff)
    return h


def rk4_delivery_axis(value, rate, factor, exponent, time_exp, offset, age, duration, h):
    """Independent RK4 time integration for a constant delivery rate window."""
    elapsed = 0.0
    while elapsed < duration - 1e-15:
        step = min(h, duration - elapsed)

        def f(v, t):
            recovery = 0.0 if v == 0 else math.copysign(
                factor * (abs(v) ** exponent + offset) * max(0.0, t) ** time_exp, v)
            return rate - recovery

        k1 = f(value, age + elapsed)
        k2 = f(value + step * k1 / 2, age + elapsed + step / 2)
        k3 = f(value + step * k2 / 2, age + elapsed + step / 2)
        k4 = f(value + step * k3, age + elapsed + step)
        value += step * (k1 + 2 * k2 + 2 * k3 + k4) / 6
        elapsed += step
    return value


def rk4_free_axis(value, factor, exponent, time_exp, offset, age_start, age_end, max_u_step):
    """Independent scalar recovery in cumulative decay-weight coordinates."""
    if value == 0 or factor == 0 or age_end <= age_start:
        return value
    sign = math.copysign(1.0, value)
    magnitude = abs(value)
    power = time_exp + 1
    u_start = factor * age_start ** power / power
    u_end = factor * age_end ** power / power
    u = u_start
    while u < u_end - 1e-15 and magnitude > 0:
        step = min(max_u_step, u_end - u)

        def f(m):
            return -(max(0.0, m) ** exponent + offset)

        k1 = f(magnitude)
        k2 = f(magnitude + step * k1 / 2)
        k3 = f(magnitude + step * k2 / 2)
        k4 = f(magnitude + step * k3)
        magnitude = max(0.0, magnitude + step * (k1 + 2 * k2 + 2 * k3 + k4) / 6)
        u += step
    return sign * magnitude


def integrate_full_path(kicks, intervals, duration, factor, exponent, time_exp, offset,
                        time_step, decay_weight_step):
    """Integrate the same assumed vector ODE, split exactly at shot and delivery-end events."""
    x = y = now = 0.0
    pending = []
    points = [(x, y)]
    for index, kick in enumerate(kicks):
        pending.append(dict(end=now + duration, xRate=kick['x'] / duration,
                            yRate=kick['y'] / duration))
        interval = intervals[index]
        end = now + interval
        elapsed = 0.0
        while now < end - 1e-14:
            pending = [item for item in pending if item['end'] > now + 1e-14]
            if not pending:
                remaining = end - now
                age_end = elapsed + remaining
                x = rk4_free_axis(x, factor, exponent, time_exp, offset, elapsed, age_end,
                                  decay_weight_step)
                y = rk4_free_axis(y, factor, exponent, time_exp, offset, elapsed, age_end,
                                  decay_weight_step)
                elapsed = age_end
                now = end
                break

            event_end = min(end, min(item['end'] for item in pending))
            qx = sum(item['xRate'] for item in pending)
            qy = sum(item['yRate'] for item in pending)
            window = event_end - now
            x = rk4_delivery_axis(x, qx, factor, exponent, time_exp, offset,
                                 elapsed, window, time_step)
            y = rk4_delivery_axis(y, qy, factor, exponent, time_exp, offset,
                                 elapsed, window, time_step)
            elapsed += window
            now = event_end
        now = end
        points.append((x, y))
    return points


def compare_full_path(a, repo, weapons_path, core_path, helper, details, details_sha):
    weapons = json.loads(weapons_path.read_text(encoding='utf-8'))
    by_id = {w['id']: w for w in weapons}
    source_assets = {row['siteWeapon']: row for row in details['assets']}
    cases, source_checks = [], []
    for weapon_id in a.full_path_weapons:
        if weapon_id not in by_id:
            raise SystemExit(f'unknown full-path weapon id: {weapon_id}')
        weapon = by_id[weapon_id]
        group = weapon.get('recoil', {}).get(a.aim)
        if not group:
            raise SystemExit(f'missing recoil group: {weapon_id} {a.aim}')
        if group.get('decExp') == 1:
            raise SystemExit(f'full-path case must exercise decExp != 1: {weapon_id} {a.aim}')
        for local, source_name in FULL_PATH_SOURCE_FIELDS.items():
            found = [r for r in details['rawFields'] if r['siteWeapon'] == weapon_id
                     and r['aim'] == a.aim and r['fieldName'] == source_name]
            if len(found) != 1:
                raise SystemExit(f'expected one pinned raw field for {weapon_id} {a.aim} {source_name}; found {len(found)}')
            row = found[0]
            site_value = group[local]
            if abs(float(row['sourceValue']) - float(site_value)) > 1e-6:
                raise SystemExit(f'current site field differs from pinned raw source: {weapon_id} {a.aim} {local}')
            source_checks.append(dict(weaponId=weapon_id, aim=a.aim, siteField=local,
                sourceField=source_name, siteValue=site_value, sourceValue=row['sourceValue'],
                sourceWeapon=row['sourceWeapon'], sourceRoute=source_assets[weapon_id]['route'],
                pointer=row['pointer'], byteOffset=row['byteOffset'], objectIndex=row['objectIndex'],
                objectClass=row['objectClass'], rawKind=row['rawKind'],
                objectGuid=row['objectGuid'], captureId=row['captureId'], head=row['head'],
                descriptorSha256=row['descriptorSha256'], rawSha256=row['rawSha256'],
                rawBytesHex=row['rawBytesHex']))
        cases.append(dict(fullPath=True, weapon=weapon, aim=a.aim, seed=a.seed,
                          shots=a.sequence_shots,
                          compensationPercent=a.compensation_percent))

    node = subprocess.run(['node', str(helper), str(repo)], input=json.dumps(cases),
                          text=True, capture_output=True, check=True)
    site_cases = json.loads(node.stdout)
    rows = []
    convergence_steps = sorted(set(a.full_path_steps), reverse=True)
    if len(convergence_steps) < 2:
        raise SystemExit('full path requires at least two distinct positive integration steps')

    for case, site in zip(cases, site_cases):
        weapon = case['weapon']
        group = weapon['recoil'][a.aim]
        if site['shots'] != site['selectedMagazine']:
            raise SystemExit(f'full path is capped below reset magazine size for {weapon["id"]}: '
                             f'{site["shots"]} of {site["selectedMagazine"]}')
        if site['decExp'] == 1:
            raise SystemExit(f'reset-resolved full-path case no longer has decExp != 1: {weapon["id"]} {a.aim}')
        seed = case['seed']
        variation = site['variation']
        seed_word = (recoil_hash(weapon['id']) ^ seed) & 0xffffffff
        random_values = mulberry32_values(seed_word, site['shots'] - 1)
        deviations = [(u * 2 - 1) * variation for u in random_values]
        rng_differences = [deviations[i] - site['sampledDeviationDegrees'][i]
                           for i in range(len(deviations))]
        if max(map(abs, rng_differences), default=0.0) > 1e-12:
            raise SystemExit(f'Python RNG port differs from Analyzer RNG: {weapon["id"]} {a.aim}')

        amount, direction = site['amount'], -site['dirDegrees'] * math.pi / 180
        control = case['compensationPercent'] / 100
        kicks = []
        kick_differences = []
        for deviation, site_kick in zip(deviations, site['kickDeltas']):
            angle = direction + deviation * math.pi / 180
            kick = dict(x=math.sin(angle) * amount - math.sin(direction) * amount * control,
                        y=math.cos(angle) * amount - math.cos(direction) * amount * control)
            kicks.append(kick)
            kick_differences.extend([kick['x'] - site_kick['x'], kick['y'] - site_kick['y']])
        if max(map(abs, kick_differences), default=0.0) > 1e-12:
            raise SystemExit(f'Python kick reconstruction differs from Analyzer settings: {weapon["id"]} {a.aim}')

        refs = [integrate_full_path(kicks, site['shotIntervals'], site['duration'],
                site['decFactor'], site['decExp'], site['timeExp'], site['decOffset'],
                h, h) for h in convergence_steps]
        site_points = [(p['x'], p['y']) for p in site['points']]
        final_ref = refs[-1]
        errors = []
        for i, (actual, reference) in enumerate(zip(site_points, final_ref)):
            dx, dy = actual[0] - reference[0], actual[1] - reference[1]
            errors.append(dict(pointIndex=i, preShotBulletNumber=i + 1, xErrorDegrees=dx,
                yErrorDegrees=dy, euclideanErrorDegrees=math.hypot(dx, dy),
                sitePoint=dict(x=actual[0], y=actual[1]),
                referencePoint=dict(x=reference[0], y=reference[1])))
        maximum_error = max(errors, key=lambda e: e['euclideanErrorDegrees'])
        adjacent_convergence = []
        for index in range(1, len(refs)):
            pair = [math.hypot(refs[index - 1][i][0] - refs[index][i][0],
                               refs[index - 1][i][1] - refs[index][i][1])
                    for i in range(len(final_ref))]
            adjacent_convergence.append(dict(coarserStepSeconds=convergence_steps[index - 1],
                finerStepSeconds=convergence_steps[index],
                maxPointDifferenceDegrees=max(pair),
                pointIndex=max(range(len(pair)), key=pair.__getitem__)))
        intervals = site['shotIntervals']
        overlap_intervals = [index + 1 for index, interval in enumerate(intervals)
                             if site['duration'] > interval + 1e-12]
        rows.append(dict(weaponId=weapon['id'], weaponName=weapon['name'], aim=a.aim,
            loadout='Analyzer reset defaults resolved by resetAttsForWeapon + applyAttachments',
            siteResetAttachments=site['siteResetAttachments'], seed=seed,
            compensationPercent=case['compensationPercent'], platformAmountMultiplier=1,
            shotCount=site['shots'], rawMagazine=site['rawMagazine'],
            selectedResetMagazine=site['selectedMagazine'], fireMode=weapon.get('fireMode'),
            rpm=weapon.get('rpm'), burstRpm=weapon.get('burstRpm'),
            shotIntervalsSeconds=intervals, minimumShotIntervalSeconds=min(intervals),
            durationSeconds=site['duration'], deliveryToMinimumIntervalRatio=site['duration'] / min(intervals),
            overlappingDeliveryShotNumbers=overlap_intervals,
            selectedAmountDegrees=site['amount'], selectedVariationDegrees=site['variation'],
            dirDegrees=site['dirDegrees'], decayInputs=dict(decFactor=site['decFactor'],
                decExp=site['decExp'], timeExp=site['timeExp'], decOffset=site['decOffset']),
            sampledDeviationDegrees=deviations, kickDeltasDegrees=kicks,
            sitePoints=site_points, referencePointsByStep=dict(
                (format(h, '.9g'), points) for h, points in zip(convergence_steps, refs)),
            maxPathError=dict(pointIndex=maximum_error['pointIndex'],
                preShotBulletNumber=maximum_error['preShotBulletNumber'],
                xErrorDegrees=maximum_error['xErrorDegrees'], yErrorDegrees=maximum_error['yErrorDegrees'],
                euclideanErrorDegrees=maximum_error['euclideanErrorDegrees']),
            pointErrors=errors, rk4Convergence=adjacent_convergence))

    return dict(schemaVersion=1, lead='L56',
        method=('Analyzer sim/core.js genRecoilPts points, after the same resetAttsForWeapon/applyAttachments '
            'loadout resolution as the app, compared with an independent Python RK4 integration '
            'of the same assumed per-axis equation. RK4 integrates constant kick delivery in time, splits at '
            'shot/delivery-end events, then integrates free recovery in cumulative decay-weight coordinates. '
            'The Python RNG and kick deltas were independently reproduced and checked against the Analyzer stream.'),
        equation='d(axis)/dt = deliveryRate - sign(axis) * decFactor * (abs(axis)**decExp + decOffset) * recoveryAge**decTimeExp; recovery age resets at each shot; unfinished delivery remains active.',
        buildReference=dict(id='1.4.3.0', archiveHead=4892017,
            descriptorSha256='91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2'),
        sourceDetailsPath=str(a.source_details), sourceDetailsSha256=details_sha,
        integrationMaximumStepsSeconds=convergence_steps,
        integrationMaximumStepsCumulativeDecayWeight=convergence_steps,
        caseCount=len(rows), sourceFieldComparisonCount=len(source_checks),
        inputSha256={str(weapons_path):sha(weapons_path), str(core_path):sha(core_path),
            str(helper):sha(helper), str(a.source_details):details_sha,
            str(repo / 'sim' / 'applyAttachments.js'):sha(repo / 'sim' / 'applyAttachments.js'),
            str(repo / 'sim' / 'loadout.js'):sha(repo / 'sim' / 'loadout.js'),
            str(repo / 'sim' / 'attachments.js'):sha(repo / 'sim' / 'attachments.js'),
            **{str(repo / 'data' / name):sha(repo / 'data' / name) for name in
                ('attachments.json', 'ammo.json', 'balance_tables.json', 'hit_zones.json')}},
        sourceFieldComparisons=source_checks, rows=rows,
        limits=['The comparison measures finite-step software error under the documented Analyzer equation; it does not validate the native recoil equation or runtime consumption.',
            'Each case uses the Analyzer reset defaults (including the reset-resolved magazine and barrel) with platform multiplier 1 and the recorded compensation; the selected attachment IDs are recorded per case.',
            'Delivery duration and overlapping intervals are recorded per case; a case without overlap does not test overlapping impulses.'])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', required=True, type=pathlib.Path)
    p.add_argument('--source-details', required=True, type=pathlib.Path)
    p.add_argument('--source-details-sha256', required=True)
    p.add_argument('--out', required=True, type=pathlib.Path)
    p.add_argument('--full-path', action='store_true',
                   help='Compare selected full base-reset genRecoilPts paths with independent RK4 integration.')
    p.add_argument('--full-path-weapons', nargs='+', default=['m87a1', 'db12'])
    p.add_argument('--aim', choices=['ads', 'hip'], default='ads')
    p.add_argument('--seed', type=int, default=0)
    p.add_argument('--compensation-percent', type=float, default=0)
    p.add_argument('--full-path-steps', nargs='+', type=float,
                   default=[1e-3, 2.5e-4, 6.25e-5],
                   help='Maximum RK4 steps in seconds during delivery and decay-weight units during free recovery.')
    p.add_argument('--dec-exp', type=float)
    p.add_argument('--time-exp', type=float)
    p.add_argument('--integration-steps', nargs='+', type=float, default=[1e-3, 5e-4, 2.5e-4],
                   help='RK4 maximum steps in cumulative decay-weight units u')
    p.add_argument('--sequence-shots', type=int, default=20,
                   help='Upper bound; scalar mode uses base magazine, full-path mode also uses the reset-selected magazine')
    p.add_argument('--axis-step-degrees', type=float, default=0.1)
    a = p.parse_args()
    if len(a.integration_steps) < 2 or any(h <= 0 for h in a.integration_steps) or a.sequence_shots < 1 or a.axis_step_degrees <= 0:
        p.error("Require at least two positive integration steps and positive shots/axis step.")
    if a.full_path:
        if len(a.full_path_steps) < 2 or any(not math.isfinite(h) or h <= 0 for h in a.full_path_steps):
            p.error('Full path requires at least two positive integration steps.')
        if not math.isfinite(a.compensation_percent):
            p.error('Compensation percent must be finite.')
    elif a.dec_exp is None or a.time_exp is None or a.time_exp <= -1:
        p.error('Scalar decay mode requires --dec-exp and --time-exp > -1.')
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
    if a.full_path:
        report = compare_full_path(a, repo, weapons_path, core_path, helper, details, details_sha)
        a.out.parent.mkdir(parents=True, exist_ok=True)
        with a.out.open('x', encoding='utf-8') as f:
            json.dump(report, f, indent=2); f.write('\n')
        print(json.dumps(dict(out=str(a.out), cases=report['caseCount'],
            sourceFieldComparisons=report['sourceFieldComparisonCount'],
            maxPathErrors={r['weaponId']:r['maxPathError']['euclideanErrorDegrees'] for r in report['rows']},
            maxFineConvergence={r['weaponId']:r['rk4Convergence'][-1]['maxPointDifferenceDegrees'] for r in report['rows']})))
        return
    if a.dec_exp is None or a.time_exp is None:
        p.error('Scalar decay mode requires --dec-exp and --time-exp.')
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
