"""Census candidate package membership without treating package names as exclusions."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sqlite3


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def kinds(row, bundles):
    result = set()
    for index in row['bundleIds']:
        name = bundles[index]['superBundleName']
        result.add('campaign' if '/glaciersp/' in name else
                   'sp-content' if name.startswith('win32/sp/') else
                   'mp' if '/glaciermp/' in name else
                   'portal' if '/glacierportal/' in name else
                   'granite' if '/glaciergranite/' in name else
                   'menu' if '/flow_mainmenu/' in name else 'shared-content')
    return sorted(result)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for arg in ('database', 'membership', 'bundle-summary', 'out-details', 'out-summary'):
        ap.add_argument('--' + arg, required=True, type=Path)
    args = ap.parse_args()
    assert not args.out_details.exists() and not args.out_summary.exists()
    summary = json.loads(args.bundle_summary.read_text(encoding='utf-8'))
    assert sha(args.membership) == summary['details']['sha256']
    bundles = {b['id']: b for b in summary['bundles']}
    db = sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    candidates = {r['route'].casefold(): dict(r) for r in db.execute(
        "select route,file_guid,scope from assets where scope like '%-candidate'").fetchall()}
    capture_routes = {r[0].casefold() for r in db.execute('select distinct route from captures').fetchall()}
    memberships, categories = {}, {}
    for line in args.membership.open(encoding='utf-8'):
        row = json.loads(line)
        key = row['route'].casefold()
        if key in candidates or key in capture_routes:
            memberships[key] = row
            categories[key] = kinds(row, bundles)
    assert candidates.keys() <= memberships.keys()
    targets = {r['file_guid']: r for key, r in candidates.items()
               if r['scope'] == 'weapon-namespace-candidate' and categories[key]
               and set(categories[key]) <= {'campaign', 'sp-content'}}
    incoming = defaultdict(list)
    guids = list(targets)
    for start in range(0, len(guids), 500):
        batch = guids[start:start + 500]
        sql = ('select r.*,c.route,c.raw_sha256,a.scope from refs r '
               'join captures c on c.id=r.capture_id join assets a on a.route=c.route '
               'where r.target in (' + ','.join('?' for _ in batch) + ')')
        for r in db.execute(sql, batch).fetchall():
            row = dict(r)
            row['sourcePackageKinds'] = categories[row['route'].casefold()]
            incoming[row['target']].append(row)
    db.close()
    duplicates = defaultdict(list)
    for item in summary['duplicateGuidEntries']:
        row = item['skipped']
        if row['fileGuid'] in targets:
            duplicates[row['fileGuid']].append({'route': row['route'], 'bundleIds': row['bundleIds'],
                                               'packageKinds': kinds(row, bundles)})
    counts, sp_counts = Counter(), Counter()
    boxed = []
    with args.out_details.open('w', encoding='utf-8', newline='\n') as out:
        for key, candidate in sorted(candidates.items()):
            member = memberships[key]
            assert member['fileGuid'] == candidate['file_guid']
            row = {'asset': candidate, 'membership': member, 'packageKinds': categories[key]}
            counts[(candidate['scope'], tuple(categories[key]))] += 1
            if member['fileGuid'] in targets:
                refs = incoming[member['fileGuid']]
                row['capturedIncomingReferences'] = refs
                row['skippedDuplicateGuidRecords'] = duplicates[member['fileGuid']]
                mp = [r for r in refs if {'mp', 'portal'}.intersection(r['sourcePackageKinds'])]
                row['incomingFromMpOrPortalPackagedSource'] = len(mp)
                sp_counts['targets'] += 1
                sp_counts['targetsWithCapturedIncomingReferences'] += bool(refs)
                sp_counts['targetsWithIncomingFromMpOrPortalPackagedSource'] += bool(mp)
                sp_counts['targetsWithSkippedDuplicateGuidRecords'] += bool(row['skippedDuplicateGuidRecords'])
                sp_counts['capturedIncomingReferences'] += len(refs)
                sp_counts['incomingFromMpOrPortalPackagedSource'] += len(mp)
            if member['route'].endswith(('DiceEx_Granite_BR_Missions_GetCounterMissionTeamInts',
                                        'SimEx_CheckMissionObjectOOB')):
                boxed.append(row)
            out.write(json.dumps(row, separators=(',', ':')) + '\n')
    result = {'schemaVersion': 1, 'date': '2026-09-23', 'head': summary['head'],
              'readerSha256': sha(__file__), 'database': str(args.database.resolve()),
              'membership': {'path': str(args.membership.resolve()), 'sha256': sha(args.membership)},
              'bundleSummary': {'path': str(args.bundle_summary.resolve()), 'sha256': sha(args.bundle_summary)},
              'details': {'path': str(args.out_details.resolve()), 'sha256': sha(args.out_details)},
              'candidateCount': len(candidates),
              'counts': [{'scope': k[0], 'packageKinds': list(k[1]), 'assets': v}
                         for k, v in sorted(counts.items())],
              'weaponCandidatesWithOnlySpNamedPackages': dict(sp_counts), 'boxedTargets': boxed,
              'limits': 'Package-name census and captured decoded incoming references only. No asset is excluded by this report. Package membership is not activation or proof of exclusive runtime use. Missing decoded callers do not prove absence. Duplicate GUID records follow effective SDK catalog precedence but are exposed for scope review.'}
    args.out_summary.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'candidateCount': len(candidates), 'spOnlyNamedPackages': dict(sp_counts),
                      'boxedTargets': [{k: r[k] for k in ('asset', 'packageKinds')} for r in boxed]}))


if __name__ == '__main__':
    main()
