"""Inventory exact site data leaves and simulation code for source research.

Does not change production files. Pending rows are not precise research blockers.
Large, lossless inventories stay in the supplied external output directory.
"""
import argparse
from collections import Counter, defaultdict
import datetime
import hashlib
import json
from pathlib import Path
import re


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def leaves(value, path=(), shape=()):
    if isinstance(value, (dict, list)) and value:
        items = value.items() if isinstance(value, dict) else enumerate(value)
        for key, child in items:
            yield from leaves(child, path + (str(key),), shape + (str(key) if isinstance(value, dict) else '*',))
    else:
        yield path, shape, value


def pointer(parts):
    return '/' + '/'.join(p.replace('~', '~0').replace('/', '~1') for p in parts)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out-dir', type=Path, required=True)
    ap.add_argument('--summary', type=Path, required=True)
    ap.add_argument('--date', default=datetime.date.today().isoformat(), help='date recorded in the summary (default: today)')
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    data_path = args.out_dir / 'site-input-leaves.jsonl'
    code_path = args.out_dir / 'site-simulation-lines.jsonl'
    if any(p.exists() for p in (data_path, code_path, args.summary)):
        ap.error('Use new output paths; preserve earlier evidence.')
    weapons = json.loads((repo / 'data/weapons.json').read_text(encoding='utf-8-sig'))
    ids = {w['id'] for w in weapons}
    roster_path = repo / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
    roster = json.loads(roster_path.read_text(encoding='utf-8-sig'))
    mapped = {r['siteIdentity']: r['internalId'] for r in roster['roots'] if r.get('siteIdentity')}
    assert ids == set(mapped), (ids - set(mapped), set(mapped) - ids)
    files, groups, counts = [], {}, Counter()
    with data_path.open('w', encoding='utf-8') as out:
        for file in sorted((repo / 'data').glob('*.json')):
            data = json.loads(file.read_text(encoding='utf-8-sig'))
            count = 0
            for path, shape, value in leaves(data):
                weapon = next((p for p in path if p in ids), None)
                if file.name == 'weapons.json':
                    weapon = weapons[int(path[0])]['id']
                shape = tuple('{weapon}' if p in ids else p for p in shape)
                # ID-bearing arrays keep their exact numeric pointer; record stable ID separately.
                selection = None
                current = data
                for part in path:
                    if isinstance(current, dict) and 'id' in current:
                        selection = current['id']
                    current = current[int(part)] if isinstance(current, list) else current[part]
                category = 'data-value'
                if file.name in ('recoil_decay.json', 'reload-exceptions.json', 'weapon-role-tags.json'):
                    category = 'retained-reference'
                elif any(p in ('source', 'provenance', 'damageSource', 'damageStatus', 'sourceVersion', 'coverage', 'schemaVersion', '$schema') for p in path):
                    category = 'provenance-or-schema'
                row = {'siteFile': file.relative_to(repo).as_posix(), 'pointer': pointer(path),
                       'shape': pointer(shape), 'siteWeapon': weapon,
                       'sourceWeapon': mapped.get(weapon), 'selectionId': selection,
                       'siteValue': value, 'category': category,
                       'reviewStatus': 'pending-review', 'sourceFieldPath': None,
                       'sourceSiteAgreement': None, 'remainingUncertainty': 'Exact source join and current-build comparison not yet attached.'}
                out.write(json.dumps(row, ensure_ascii=True) + '\n')
                key = (row['siteFile'], row['shape'])
                group = groups.setdefault(key, {'count': 0, 'weapons': set(), 'values': Counter(), 'category': category})
                group['count'] += 1
                if weapon:
                    group['weapons'].add(weapon)
                group['values'][json.dumps(value, sort_keys=True)] += 1
                count += 1
                counts[category] += 1
            files.append({'path': file.relative_to(repo).as_posix(), 'sha256': sha(file), 'inventoryRows': count})
    # Keep every nonblank code line, so equations without numeric literals are not lost.
    # This is an intentionally overinclusive lexical index, not a JavaScript parser.
    numeric = re.compile(r'(?<![\w$])(?:0[xX][0-9a-fA-F]+|\d*\.\d+|\d+)(?:[eE][+-]?\d+)?')
    with code_path.open('w', encoding='utf-8') as out:
        for file in sorted((repo / 'sim').glob('*.js')):
            block_comment = False
            count = 0
            for line_no, original in enumerate(file.read_text(encoding='utf-8-sig').splitlines(), 1):
                line = original.strip()
                if block_comment:
                    if '*/' in line:
                        block_comment = False
                        line = line.split('*/', 1)[1].strip()
                    else:
                        continue
                if line.startswith('/*'):
                    if '*/' in line:
                        line = line.split('*/', 1)[1].strip()
                    else:
                        block_comment = True
                        continue
                if not line or line.startswith('//'):
                    continue
                out.write(json.dumps({'siteFile': file.relative_to(repo).as_posix(), 'line': line_no,
                                      'code': original, 'numericCandidates': numeric.findall(line),
                                      'reviewStatus': 'pending-review'}) + '\n')
                count += 1
            files.append({'path': file.relative_to(repo).as_posix(), 'sha256': sha(file), 'inventoryRows': count})
    group_path = args.out_dir / 'site-input-groups.json'
    summaries = []
    for (file, shape), group in sorted(groups.items()):
        summaries.append({'siteFile': file, 'shape': shape, 'count': group['count'],
                          'weaponCount': len(group['weapons']), 'distinctValues': len(group['values']),
                          'examples': [{'value': json.loads(v), 'count': n} for v, n in group['values'].most_common(3)],
                          'category': group['category'], 'reviewStatus': 'pending-review'})
    group_path.write_text(json.dumps(summaries, indent=2) + '\n')
    result = {'schemaVersion': 1, 'date': args.date, 'scope': 'All top-level data/*.json and sim/*.js in the current working tree',
              'siteWeaponCount': len(ids), 'sourceReferenceCount': len(roster['roots']),
              'identityMap': mapped, 'identityReceipt': {'path': str(roster_path), 'sha256': sha(roster_path)},
              'files': files, 'dataRowsByCategory': dict(counts), 'dataGroups': len(summaries),
              'artifacts': [{'path': str(p.resolve()), 'sha256': sha(p)} for p in (data_path, code_path, group_path)],
              'complete': False, 'limits': ['Enumeration is complete for this file snapshot; source research is not complete.',
                  'Pending review is not a precise blocker and does not satisfy the goal completion condition.',
                  'Retained references and metadata are included; they must not be counted as active gameplay inputs.',
                  'Simulation code is indexed by exact line, not parsed; numeric candidates can include strings or trailing comments.',
                  'KSG is a source reference only; its proven campaign-only roots do not extend the multiplayer site roster.'],
              'scriptSha256': sha(Path(__file__))}
    args.summary.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'dataRows': sum(counts.values()), 'groups': len(groups), 'weapons': len(ids),
                      'codeLines': sum(x['inventoryRows'] for x in files if x['path'].startswith('sim/')), 'complete': False}))


if __name__ == '__main__':
    main()
