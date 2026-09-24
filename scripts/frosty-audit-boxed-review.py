"""Compare boxed decoding against a pinned reader for all captured boxed assets."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import struct


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--db', type=Path, required=True)
    ap.add_argument('--old-reader', type=Path, required=True)
    ap.add_argument('--details', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    new_path = Path(__file__).with_name('frosty-ebx-decode.py')
    old, new = runpy.run_path(str(args.old_reader)), runpy.run_path(str(new_path))
    db = sqlite3.connect(f'{args.db.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    captures = [dict(x) for x in db.execute('''SELECT * FROM captures WHERE id IN
      (SELECT DISTINCT capture_id FROM objects WHERE body_json LIKE '%$boxedValueRef%') ORDER BY id''')]
    db.close()
    types, counts, assets, differences = {}, Counter(), [], []
    args.details.parent.mkdir(parents=True, exist_ok=True)
    with args.details.open('w', encoding='utf-8') as details:
        for capture in captures:
            path, descriptor = capture['raw_path'], capture['descriptor_path']
            assert sha(path) == capture['raw_sha256'], path
            assert sha(descriptor) == capture['descriptor_sha256'], descriptor
            if descriptor not in types:
                types[descriptor] = new['type_descriptors'](descriptor)
            baseline = old['Ebx'](path, types[descriptor]).decode()['objects']
            ebx = new['Ebx'](path, types[descriptor])
            decoded = ebx.decode()['objects']
            local_counts = Counter()

            def compare(before, after, pointer):
                if isinstance(before, dict) and before == {'$boxedValueRef': True}:
                    metadata = after.get('$boxedValue', after.get('$boxedValueRef'))
                    assert isinstance(metadata, dict), pointer
                    offset = metadata['absoluteOffset']
                    raw_type, reserved, relative = struct.unpack_from('<IIq', ebx.data, offset)
                    assert (raw_type, reserved, relative) == (metadata['typeWord'], metadata['reserved'], metadata['relativeOffset'])
                    status = 'unresolved' if '$unresolvedBoxedValue' in after else ('null' if raw_type == 0 else 'resolved')
                    counts[status] += 1
                    local_counts[status] += 1
                    if status == 'resolved':
                        counts[f"kind-{metadata['kind']}"] += 1
                    details.write(json.dumps({'captureId': capture['id'], 'route': capture['route'], 'pointer': pointer,
                                              'decoded': after}, ensure_ascii=True) + '\n')
                    return
                if isinstance(before, dict) and isinstance(after, dict) and before.keys() == after.keys():
                    for key in before:
                        compare(before[key], after[key], f'{pointer}/{key}')
                elif isinstance(before, list) and isinstance(after, list) and len(before) == len(after):
                    for index, (a, b) in enumerate(zip(before, after)):
                        compare(a, b, f'{pointer}/{index}')
                elif before != after:
                    differences.append({'captureId': capture['id'], 'route': capture['route'], 'pointer': pointer,
                                        'before': before, 'after': after})

            compare(baseline, decoded, '/objects')
            assets.append({k: capture[k] for k in ('id', 'route', 'raw_sha256', 'head', 'descriptor_sha256')} | {'counts': dict(local_counts)})
    report = {'schemaVersion': 1, 'scope': 'All captures with boxed markers in the stated ledger; serialized values only.',
              'ledgerPath': str(args.db.resolve()), 'oldReaderSha256': sha(args.old_reader), 'readerSha256': sha(new_path),
              'reviewScriptSha256': sha(__file__), 'captureCount': len(captures), 'counts': dict(counts),
              'detailsPath': str(args.details.resolve()), 'detailsSha256': sha(args.details),
              'outsideBoxedDifferences': differences, 'assets': assets,
              'limits': ['Boxed arrays remain explicitly unresolved.', 'No runtime behavior or gameplay meaning is inferred.']}
    args.out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('captureCount', 'counts')} | {'outsideBoxedDifferences': len(differences)}))


if __name__ == '__main__':
    main()
