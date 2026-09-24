"""Compare a supplied, dated Sym snapshot with captured WB/GS numeric fields.

This is value-first candidate evidence, never a semantic-name assignment. It uses
the saved exact weapon crosswalk, preserves build boundaries, and does not fetch
Sym or change production data. Near-constant fields remain ambiguous.
"""
import argparse
from collections import defaultdict, Counter
import hashlib
import json
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def numeric_leaves(value, path=''):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from numeric_leaves(child, path + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from numeric_leaves(child, path + '/' + str(i))
    elif type(value) in (int, float):
        yield path, value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--sym', type=Path, required=True, help='Full local Sym JSON snapshot, preserved without reformatting')
    ap.add_argument('--fields', type=Path, required=True, help='Existing weapon-fields.jsonl')
    ap.add_argument('--field-receipt', type=Path, required=True, help='Receipt pinning the field inventory and capture hashes')
    ap.add_argument('--roster', type=Path, default=Path(__file__).resolve().parents[1] / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json')
    ap.add_argument('--out', type=Path, required=True, help='New external report path')
    args = ap.parse_args()
    if args.out.exists():
        ap.error('Use a new report path.')
    sym = json.loads(args.sym.read_text(encoding='utf-8-sig'))
    roster = json.loads(args.roster.read_text())
    source_receipt = json.loads(args.field_receipt.read_text())
    if source_receipt.get('detailsSha256'):
        assert sha(args.fields) == source_receipt['detailsSha256'], 'Source field inventory hash changed.'
    crosswalk = {r['internalId'].casefold(): r for r in roster['roots'] if r.get('siteIdentity')}
    # Supported full snapshots are a dictionary of records or a weapons collection.
    collection = sym.get('weapons', sym) if isinstance(sym, dict) else sym
    candidates = collection.items() if isinstance(collection, dict) else enumerate(collection)
    records, unresolved = {}, []
    for key, record in candidates:
        if not isinstance(record, dict) or not isinstance(record.get('codename'), str):
            continue
        identity = crosswalk.get(record['codename'].casefold())
        if not identity:
            unresolved.append({'recordKey': key, 'codename': record['codename'], 'reason': 'No exact retained internalId join.'})
            continue
        wid = identity['internalId']
        if wid in records:
            raise ValueError(f'Duplicate Sym identity {wid}')
        records[wid] = record
    if not records:
        ap.error('No exact codename/internalId records found. Supply the full snapshot; do not infer aliases.')
    sym_fields = defaultdict(dict)
    for wid, record in records.items():
        for path, value in numeric_leaves(record):
            sym_fields[path][wid] = value
    source_fields = defaultdict(lambda: defaultdict(list))
    with args.fields.open() as stream:
        for line in stream:
            row = json.loads(line)
            if row['weapon'] not in records or row['type'] not in ('float', 'int'):
                continue
            key = row['rootKind'], row['class'], row['pointer']
            source_fields[key][row['weapon']].append({k: row[k] for k in
                ('value', 'captureId', 'objectIndex', 'objectGuid', 'objectAbsoluteOffset')})

    def equal(a, b):
        return abs(a - b) <= max(1e-5, max(abs(a), abs(b)) * 1e-5)

    matches = []
    for sym_path, values in sorted(sym_fields.items()):
        ranked = []
        for key, source_values in source_fields.items():
            shared = set(values) & set(source_values)
            if not shared:
                continue
            agreed = [wid for wid in shared if any(equal(values[wid], x['value']) for x in source_values[wid])]
            # Keep useful cross-weapon candidates only. This is not proof of absence.
            if len(agreed) < max(2, len(values) - 8):
                continue
            mismatches = [{'sourceWeapon': wid, 'symValue': values[wid], 'sourceFields': source_values[wid]}
                          for wid in sorted(shared) if wid not in agreed]
            ranked.append({'rootKind': key[0], 'class': key[1], 'pointer': key[2],
                           'matchedWeapons': len(agreed), 'comparedWeapons': len(shared),
                           'multipleObjectCandidates': sorted(w for w in shared if len(source_values[w]) > 1),
                           'mismatches': mismatches,
                           'matchingEvidence': [{'sourceWeapon': w, 'symValue': values[w], 'sourceFields': source_values[w]} for w in sorted(agreed)]})
        ranked.sort(key=lambda r: (-r['matchedWeapons'], -r['comparedWeapons'], r['rootKind'], r['pointer']))
        top = [r for r in ranked if r['matchedWeapons'] == ranked[0]['matchedWeapons']] if ranked else []
        distribution = Counter(str(v) for v in values.values())
        outliers = [w for w, v in values.items() if str(v) != distribution.most_common(1)[0][0]]
        classification = ('no-retained-candidate' if not top else
                          'near-constant-ambiguous' if len(outliers) <= 3 else
                          'unique-cross-weapon-candidate' if len(top) == 1 else 'ambiguous-cross-weapon-candidates')
        matches.append({'symField': sym_path, 'weapons': len(values), 'distinctValues': len(distribution),
                        'valueDistribution': dict(distribution), 'outlierWeapons': sorted(outliers),
                        'classification': classification, 'topCandidates': top})
    report = {'schemaVersion': 1, 'sym': {'path': str(args.sym.resolve()), 'sha256': sha(args.sym),
               'metadata': sym.get('info') if isinstance(sym, dict) else None},
              'sourceFields': {'path': str(args.fields.resolve()), 'sha256': sha(args.fields),
                'receipt': str(args.field_receipt.resolve()), 'receiptSha256': sha(args.field_receipt)},
              'roster': {'path': str(args.roster.resolve()), 'sha256': sha(args.roster)},
              'mappedSymWeapons': len(records), 'unresolvedSymIdentities': unresolved,
              'siteWeaponsWithoutSymRecord': [r['siteIdentity'] for k, r in crosswalk.items() if r['internalId'] not in records],
              'numericFieldCount': len(sym_fields), 'classifications': dict(Counter(x['classification'] for x in matches)),
              'fields': matches,
              'limits': ['Value agreement is candidate evidence; source meaning requires named or consumer evidence.',
                         'No candidate under the stated threshold is not proof that a field is absent.',
                         'Near-constant outliers are explicit; broad constant agreement cannot identify a field.',
                         'Raw bodies are not re-decoded here. This regression pins the existing field and capture receipts.',
                         'Effective fire cycles, indexed tables and projectile inputs need their separate source comparisons.',
                         'Sym and Frosty versions remain separate. Disagreement alone is not a site defect.'],
              'scriptSha256': sha(Path(__file__))}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('mappedSymWeapons', 'numericFieldCount', 'classifications')}))


if __name__ == '__main__':
    main()
