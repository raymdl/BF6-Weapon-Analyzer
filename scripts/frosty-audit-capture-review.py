"""Verify one immutable dependency capture batch before ledger ingestion."""
import argparse
import hashlib
import json
from pathlib import Path


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ('capture', 'previous', 'routes', 'out'):
        ap.add_argument('--' + name, required=True, type=Path)
    ap.add_argument('--expected', required=True, type=int)
    ap.add_argument('--collector', type=Path,
                    default=Path(__file__).with_name('frosty-collect-raw.ps1'),
                    help='Executed collector snapshot; use this if the working script changed after capture.')
    args = ap.parse_args()
    assert not args.out.exists(), 'Preserve prior receipts'
    cap = args.capture.resolve()
    routes = args.routes.read_text(encoding='utf-8').splitlines()
    route_keys = {r.casefold() for r in routes}
    assert len(route_keys) == len(routes) == args.expected
    status = cap / 'raw-status.jsonl'
    rows = [json.loads(line) for line in status.read_text(encoding='utf-8-sig').splitlines()]
    assert len(rows) == args.expected and all(r['status'] == 'success' for r in rows)
    assert {r['path'].casefold() for r in rows} == route_keys
    for row in rows:
        path = (cap / row['file']).resolve()
        assert path.is_relative_to(cap), 'Capture path escapes its collection'
        assert path.stat().st_size == row['bytes'], row['path']
        assert sha(path) == row['sha256'], row['path']
    cat_path = cap / 'asset-catalog.json'
    catalog = json.loads(cat_path.read_text(encoding='utf-8-sig'))
    previous_path = args.previous / 'asset-catalog.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8-sig'))
    assert catalog['gameHead'] == previous['gameHead'] == 4892087
    assert catalog['sdkVersion'] == previous['sdkVersion'] == 4414275
    assert catalog['assets'] == previous['assets'], 'Catalog changed; review build identity'
    collector = args.collector
    receipt = {
        'schemaVersion': 1, 'date': '2026-09-23', 'captureDirectory': str(cap),
        'head': catalog['gameHead'], 'sdkVersion': catalog['sdkVersion'],
        'routeList': {'path': str(args.routes.resolve()), 'sha256': sha(args.routes)},
        'rawStatus': {'path': str(status), 'sha256': sha(status)},
        'catalogSha256': sha(cat_path),
        'previousCatalog': {'path': str(previous_path.resolve()), 'sha256': sha(previous_path)},
        'collectorPath': str(collector.resolve()),
        'collectorSha256': sha(collector), 'reviewerSha256': sha(__file__),
        'successCount': len(rows), 'failureCount': 0,
        'rawBytes': sum(r['bytes'] for r in rows), 'allSizesAndHashesMatch': True,
        'catalogMatchesPreviousLayer': True,
        'scope': 'Candidate dependency capture only; no new semantic or mode exclusions.',
        'runtime': 'Windows PowerShell .NET Framework; game archives read only.',
    }
    args.out.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: receipt[k] for k in ('successCount', 'failureCount', 'rawBytes')}))


if __name__ == '__main__':
    main()
