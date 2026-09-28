"""Read typed values at raw EBX byte offsets and report path, file hash, bytes and value.

Single read:   --path <asset path or file> --offset <int|0xhex> --type <type> [--expect V]
Several reads: --manifest checks.json  (list of {path, offset, type, expect?})
Types: f32 f64 i8 u8 i16 u16 i32 u32 i64 u64 bool guid bytes:N (little-endian).
Asset paths are resolved under --raw-root with '.ebx' appended when missing.
Output is JSON (stdout, or --out which must not exist). Exit 1 when an --expect fails.
This reads serialized bytes only; it makes no claim about field meaning or runtime use.
"""
import argparse, hashlib, json, struct, sys, uuid
from pathlib import Path

RAW_ROOT = Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\capture\collection\raw')
FORMATS = {'f32': ('<f', 4), 'f64': ('<d', 8), 'i8': ('<b', 1), 'u8': ('<B', 1), 'i16': ('<h', 2),
           'u16': ('<H', 2), 'i32': ('<i', 4), 'u32': ('<I', 4), 'i64': ('<q', 8), 'u64': ('<Q', 8)}

def resolve(path, raw_root=RAW_ROOT):
    p = Path(path)
    if not p.is_absolute():
        p = raw_root / path
    if not p.exists() and p.suffix.lower() != '.ebx':
        p = p.with_name(p.name + '.ebx')
    if not p.exists():
        raise FileNotFoundError(f'raw file not found: {p}')
    return p

def read(path, offset, typ, raw_root=RAW_ROOT, _cache={}):
    p = resolve(path, raw_root)
    if p not in _cache:
        data = p.read_bytes(); _cache[p] = (data, hashlib.sha256(data).hexdigest())
    data, digest = _cache[p]
    offset = int(offset, 0) if isinstance(offset, str) else int(offset)
    if typ.startswith('bytes:'):
        size = int(typ.split(':', 1)[1]); raw = data[offset:offset + size]; value = raw.hex()
    elif typ == 'guid':
        size = 16; raw = data[offset:offset + 16]; value = str(uuid.UUID(bytes_le=raw))
    elif typ == 'bool':
        size = 1; raw = data[offset:offset + 1]; value = raw != b'\x00'
    elif typ in FORMATS:
        fmt, size = FORMATS[typ]; raw = data[offset:offset + size]; value = struct.unpack(fmt, raw)[0]
    else:
        raise ValueError(f'unknown type {typ}')
    if len(raw) != size:
        raise ValueError(f'offset {offset} + {size} beyond end of {p} ({len(data)} bytes)')
    return {'path': str(p), 'rawSha256': digest, 'offset': offset, 'type': typ,
            'bytesHex': raw.hex(), 'value': value}

def matches(value, expect, typ):
    if typ in ('f32', 'f64'):
        return abs(float(value) - float(expect)) <= 1e-6 * max(1.0, abs(float(expect)))
    if typ in FORMATS:
        return int(value) == int(expect, 0) if isinstance(expect, str) else int(value) == int(expect)
    return str(value).lower() == str(expect).lower()

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--raw-root', type=Path, default=RAW_ROOT)
    ap.add_argument('--path'); ap.add_argument('--offset'); ap.add_argument('--type')
    ap.add_argument('--expect'); ap.add_argument('--manifest', type=Path); ap.add_argument('--out', type=Path)
    a = ap.parse_args()
    if a.manifest:
        checks = json.loads(a.manifest.read_text(encoding='utf-8-sig'))
    elif a.path and a.offset is not None and a.type:
        checks = [{'path': a.path, 'offset': a.offset, 'type': a.type, **({'expect': a.expect} if a.expect is not None else {})}]
    else:
        ap.error('give --manifest, or --path, --offset and --type')
    results, ok = [], True
    for c in checks:
        r = read(c['path'], c['offset'], c['type'], a.raw_root)
        if 'expect' in c:
            r['expect'] = c['expect']; r['matches'] = matches(r['value'], c['expect'], c['type']); ok &= r['matches']
        results.append(r)
    text = json.dumps(results if a.manifest else results[0], indent=1)
    if a.out:
        if a.out.exists(): raise SystemExit(f'refusing existing output: {a.out}')
        a.out.write_text(text + '\n', encoding='utf-8')
    print(text)
    sys.exit(0 if ok else 1)

if __name__ == '__main__':
    main()
