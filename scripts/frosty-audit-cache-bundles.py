"""Read Frosty cache-v4 EBX bundle membership and check the current SDK catalog.

This follows AssetManager.ReadFromCache, including duplicate-GUID precedence.
It reads archive metadata only; membership is not gameplay activation proof.
"""
import argparse
from collections import Counter
import hashlib
import json
import mmap
from pathlib import Path
import struct
import uuid


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


class Reader:
    def __init__(self, data):
        self.data, self.pos = data, 0

    def value(self, fmt):
        value = struct.unpack_from(fmt, self.data, self.pos)[0]
        self.pos += struct.calcsize(fmt)
        return value

    def take(self, size):
        assert 0 <= size <= len(self.data) - self.pos
        data = self.data[self.pos:self.pos + size]
        self.pos += size
        return data

    def string(self):
        end = self.data.find(b'\0', self.pos, min(len(self.data), self.pos + 1048576))
        assert end >= self.pos, 'Unterminated or excessive cache string'
        value = self.data[self.pos:end].decode('utf-8')
        self.pos = end + 1
        return value

    def count(self, maximum):
        value = self.value('<i')
        assert 0 <= value <= maximum, ('Invalid count', value, self.pos)
        return value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache', required=True, type=Path)
    ap.add_argument('--catalog', required=True, type=Path)
    ap.add_argument('--sdk-check', required=True, type=Path)
    ap.add_argument('--out-jsonl', required=True, type=Path)
    ap.add_argument('--out-summary', required=True, type=Path)
    args = ap.parse_args()
    assert not args.out_jsonl.exists() and not args.out_summary.exists()
    before = args.cache.stat()
    catalog = json.loads(args.catalog.read_text(encoding='utf-8-sig'))
    expected = {a['path'].casefold(): a for a in catalog['assets']}
    assert len(expected) == len(catalog['assets'])
    records, seen, duplicates = {}, {}, []
    replaced = 0
    with args.cache.open('rb') as stream, mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ) as data:
        r = Reader(data)
        assert r.value('<Q') == 0x02005954534f5246
        assert r.value('<I') == 4
        profile_hash, head = r.value('<I'), r.value('<I')
        assert head == catalog['gameHead'], 'Cache and SDK catalog Head differ'
        supers = [r.string() for _ in range(r.count(1000000))]
        bundles = []
        for i in range(r.count(1000000)):
            name, super_id = r.string(), r.value('<i')
            assert 0 <= super_id < len(supers)
            bundles.append({'id': i, 'name': name, 'superBundleId': super_id,
                            'superBundleName': supers[super_id]})
        ebx_count = r.count(10000000)
        for _ in range(ebx_count):
            start = r.pos
            route, record_sha = r.string(), r.take(20).hex()
            stored, original = r.value('<q'), r.value('<q')
            location, inline = r.value('<i'), r.value('<?')
            asset_type, guid_bytes = r.string(), r.take(16)
            guid = str(uuid.UUID(bytes_le=guid_bytes))
            if r.value('<?'):
                r.take(53)  # two SHA1s, data offset, superbundle index, patch flag
                r.string()  # CAS path
            count = r.count(len(bundles))
            ids = list(struct.unpack('<' + str(count) + 'i', r.take(count * 4))) if count else []
            assert all(0 <= i < len(bundles) for i in ids)
            dep_count = r.count(ebx_count)
            r.take(dep_count * 16)
            row = {'route': route, 'fileGuid': guid, 'recordSha1': record_sha,
                   'storedBytes': stored, 'originalBytes': original, 'type': asset_type or None,
                   'bundleIds': ids, 'cacheOffset': start, 'cacheRecordBytes': r.pos - start}
            if guid_bytes != bytes(16):
                if guid_bytes in seen:
                    duplicates.append({'skipped': row, 'firstRoute': seen[guid_bytes]})
                    continue
                seen[guid_bytes] = route
            key = route.casefold()
            replaced += key in records
            records[key] = row
        ebx_end = r.pos
    assert records.keys() == expected.keys(), 'Effective cache/catalog route sets differ'
    for key, row in records.items():
        e = expected[key]
        assert row['fileGuid'] == e['guid'], row['route']
        assert row['recordSha1'] == (e['sha1'] or '0' * 40), row['route']
        assert row['originalBytes'] == e['originalBytes'], row['route']
    sdk_rows = [json.loads(line) for line in args.sdk_check.read_text(encoding='utf-8-sig').splitlines()]
    for item in sdk_rows:
        assert item['status'] == 'success' and item['gameHead'] == head
        row = records[item['path'].casefold()]
        assert row['fileGuid'] == item['guid'] and row['recordSha1'] == item['recordSha1']
        assert row['bundleIds'] == [x['id'] for x in item['bundles']]
        for value in item['bundles']:
            assert all(value[k] == v for k, v in bundles[value['id']].items())
    cache_sha = sha(args.cache)
    after = args.cache.stat()
    assert (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns)
    args.out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with args.out_jsonl.open('w', encoding='utf-8', newline='\n') as out:
        for key in sorted(records):
            out.write(json.dumps(records[key], separators=(',', ':')) + '\n')
    summary = {'schemaVersion': 1, 'date': '2026-09-23', 'head': head,
               'cache': {'path': str(args.cache.resolve()), 'sha256': cache_sha,
                         'bytes': before.st_size, 'profileHash': f'{profile_hash:08x}', 'ebxSectionEnd': ebx_end},
               'catalog': {'path': str(args.catalog.resolve()), 'sha256': sha(args.catalog)},
               'sdkCheck': {'path': str(args.sdk_check.resolve()), 'sha256': sha(args.sdk_check), 'assetsMatched': len(sdk_rows)},
               'readerSha256': sha(__file__), 'cacheEbxRows': ebx_count, 'effectiveCatalogRows': len(records),
               'duplicateGuidRowsSkipped': len(duplicates), 'caseInsensitiveRouteReplacements': replaced,
               'bundleCount': len(bundles), 'superBundleCount': len(supers), 'bundles': bundles,
               'bundleCountDistribution': dict(Counter(len(x['bundleIds']) for x in records.values())),
               'details': {'path': str(args.out_jsonl.resolve()), 'sha256': sha(args.out_jsonl)},
               'duplicateGuidEntries': duplicates,
               'method': 'SDK cache-v4 schema, all effective catalog route/file-GUID/SHA1/original-byte values matched against current SDK export; selected bundle arrays and names independently match live SDK objects. Duplicate GUID rows follow the SDK first-GUID rule.',
               'limits': 'Archive/cache membership, not live availability, mode activation or transitive runtime loading. Review skipped duplicates and source consumers before scope exclusions. Bundle names alone do not establish game rules.'}
    args.out_summary.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: summary[k] for k in ('head', 'cacheEbxRows', 'effectiveCatalogRows', 'duplicateGuidRowsSkipped', 'caseInsensitiveRouteReplacements', 'bundleCount', 'superBundleCount')}))


if __name__ == '__main__':
    main()
