"""One-off: extract EMBEDDED_WEAPONS from the three HTMLs, normalize, compare."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FILES_AND_VARS = [
    ('index.html', 'W'),
    ('preview_bloom.html', 'EMBEDDED_WEAPONS'),
    ('preview_distance.html', 'EMBEDDED_WEAPONS'),
]
FILES = [f for f, _ in FILES_AND_VARS]
VAR_OF = dict(FILES_AND_VARS)


def extract_array_text(html: str, var: str) -> str:
    m = re.search(rf'const {var}\s*=\s*\[', html)
    if not m:
        raise RuntimeError('marker not found')
    start = m.end() - 1  # position of opening `[`
    depth = 0
    in_str = False
    str_ch = ''
    i = start
    while i < len(html):
        c = html[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == str_ch:
                in_str = False
        else:
            if c in ("'", '"'):
                in_str = True
                str_ch = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    return html[start:i + 1]
        i += 1
    raise RuntimeError('unbalanced brackets')


def strip_line_comments(src: str) -> str:
    """Remove `// ...` line comments that aren't inside string literals."""
    out = []
    i = 0
    n = len(src)
    in_str = False
    str_ch = ''
    while i < n:
        c = src[i]
        if in_str:
            if c == '\\' and i + 1 < n:
                out.append(src[i:i + 2])
                i += 2
                continue
            if c == str_ch:
                in_str = False
            out.append(c)
            i += 1
            continue
        if c in ("'", '"'):
            in_str = True
            str_ch = c
            out.append(c)
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            # Skip until end of line (don't keep the newline either, but a space is fine)
            while i < n and src[i] != '\n':
                i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def js_to_json(src: str) -> str:
    src = strip_line_comments(src)
    """Best-effort: convert a JS object/array literal with unquoted keys and
    single-quoted strings into JSON. Handles the patterns actually used in
    these files."""
    out = []
    i = 0
    n = len(src)
    in_str = False
    str_ch = ''
    while i < n:
        c = src[i]
        if in_str:
            if c == '\\':
                out.append(c)
                if i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
            if c == str_ch:
                # Convert closing single quote to double
                out.append('"' if str_ch == "'" else c)
                in_str = False
            elif str_ch == "'" and c == '"':
                # Single-quoted string containing a double quote: escape it
                out.append('\\"')
            else:
                out.append(c)
            i += 1
            continue
        if c == "'":
            out.append('"')
            in_str = True
            str_ch = "'"
            i += 1
            continue
        if c == '"':
            out.append(c)
            in_str = True
            str_ch = '"'
            i += 1
            continue
        # Unquoted key: an identifier immediately followed by `:` (after optional ws)
        m = re.match(r'([A-Za-z_$][A-Za-z0-9_$]*)\s*:', src[i:])
        if m and (not out or out[-1] not in '"'):
            ident = m.group(1)
            # Skip identifiers that are JS keywords/literals — none here, but be safe
            out.append('"' + ident + '"' + ':')
            i += m.end()
            continue
        out.append(c)
        i += 1
    text = ''.join(out)
    # Strip trailing commas before } or ]
    text = re.sub(r',(\s*[\]}])', r'\1', text)
    return text


def load_weapons(fname: str) -> list:
    html = (ROOT / fname).read_text(encoding='utf-8')
    raw = extract_array_text(html, VAR_OF[fname])
    if fname == 'preview_bloom.html':
        # Already JSON
        return json.loads(raw)
    return json.loads(js_to_json(raw))


def main():
    arrs = {}
    for f in FILES:
        try:
            arrs[f] = load_weapons(f)
            print(f'{f}: {len(arrs[f])} weapons')
        except Exception as e:
            print(f'{f}: FAILED — {e}')
            return
    # Compare by id list
    ids = {f: [w['id'] for w in arrs[f]] for f in FILES}
    print()
    print('--- ID lists match? ---')
    base = ids[FILES[0]]
    for f in FILES[1:]:
        if ids[f] == base:
            print(f'{f}: same ids in same order as {FILES[0]}')
        else:
            extra = set(ids[f]) - set(base)
            missing = set(base) - set(ids[f])
            order = ids[f] != base
            print(f'{f}: DIFF — extra={extra} missing={missing} order_diff={order}')

    # Compare per-weapon JSON for matching ids
    print()
    print('--- Per-weapon content drift ---')
    base_arr = arrs[FILES[0]]
    base_by_id = {w['id']: w for w in base_arr}
    for f in FILES[1:]:
        diffs = []
        other_by_id = {w['id']: w for w in arrs[f]}
        for wid in base_by_id:
            if wid in other_by_id:
                a = json.dumps(base_by_id[wid], sort_keys=True)
                b = json.dumps(other_by_id[wid], sort_keys=True)
                if a != b:
                    diffs.append(wid)
        if diffs:
            print(f'{f}: {len(diffs)} weapons with content drift vs {FILES[0]}: {diffs[:10]}{"..." if len(diffs) > 10 else ""}')
        else:
            print(f'{f}: all shared weapons have identical content vs {FILES[0]}')

    # Find which fields drift, summarized across all drifted weapons
    print()
    print(f'--- Field-level drift {FILES[1]} vs {FILES[0]} ---')

    def find_diffs(a, b, path=''):
        out = []
        if isinstance(a, dict) and isinstance(b, dict):
            for k in set(a) | set(b):
                if k in a and k in b:
                    out.extend(find_diffs(a[k], b[k], f'{path}.{k}' if path else k))
                else:
                    out.append((path + '.' + k, 'present_only_in_one'))
        elif isinstance(a, list) and isinstance(b, list):
            if a != b:
                out.append((path, f'{a!r} vs {b!r}'))
        else:
            if a != b:
                out.append((path, f'{a!r} vs {b!r}'))
        return out

    field_counts = {}
    examples = {}
    for f in FILES[1:]:
        other_by_id = {w['id']: w for w in arrs[f]}
        for wid, base_w in base_by_id.items():
            other_w = other_by_id.get(wid)
            if other_w and json.dumps(base_w, sort_keys=True) != json.dumps(other_w, sort_keys=True):
                for path, detail in find_diffs(base_w, other_w):
                    field_counts[path] = field_counts.get(path, 0) + 1
                    if path not in examples:
                        examples[path] = (wid, detail)
        print(f'\n{f}:')
        for path, count in sorted(field_counts.items(), key=lambda x: -x[1]):
            ex_id, ex_detail = examples[path]
            print(f'  {path}: {count} weapons drifted (e.g. {ex_id}: {ex_detail})')

    # Dump base to a pretty file we could use for the canonical JSON
    out = ROOT / '.claude' / 'weapons_extracted_index.json'
    out.write_text(json.dumps(base_arr, indent=2), encoding='utf-8')
    print(f'\nWrote canonical extract of {FILES[0]} to {out.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
