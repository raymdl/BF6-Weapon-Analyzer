"""Lead-side helpers for Codex worker runs (see docs/frosty/TOOLS.md "Worker run helpers").

crosswalk  --run-root R                 write R/weapon-crosswalk.json from the pinned roster and site data
check-site --pointer P [--pointer P..]  resolve site values before naming them as a control
assemble   --lead-dir D --sections a,b [--control-site P ..] [--out-name brief.txt]
                                        preamble + chosen convention sections + D/lead.txt -> D/brief.txt
prior-work --terms a b (or a,b)          search repo docs and receipts for earlier work on these names
review     --lead-dir D [--reread N]    check a worker result against the result schema, re-read raw bytes

Site pointers look like data/attachments.json:/SIGHTS/[id=iron]/weaponSwayMultByWeapon/m39emr
(`[key=value]` selects the list element whose key equals value).
"""
import argparse, hashlib, json, random, re, runpy, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREAMBLE = ROOT / 'docs/working/frosty-worker-brief.txt'
CONVENTIONS = ROOT / 'docs/working/frosty-worker-conventions.txt'
ROSTER = ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'

def sha(data): return hashlib.sha256(data).hexdigest()
def load_json(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write_new(p, text):
    if p.exists(): raise SystemExit(f'refusing existing output: {p}')
    p.write_text(text, encoding='utf-8'); return sha(text.encode('utf-8'))

def resolve_pointer(pointer):
    file, _, path = pointer.partition(':')
    node = load_json(ROOT / file)
    for part in [p for p in path.split('/') if p]:
        m = re.fullmatch(r'\[(\w+)=(.+)\]', part)
        if m:
            node = next((x for x in node if isinstance(x, dict) and str(x.get(m[1])) == m[2]), None)
        elif isinstance(node, list):
            node = node[int(part)] if part.isdigit() and int(part) < len(node) else None
        elif isinstance(node, dict):
            node = node.get(part)
        else:
            node = None
        if node is None:
            raise KeyError(f'{pointer}: no value at "{part}"')
    return node

def sections():
    out, name = {}, None
    for line in CONVENTIONS.read_text(encoding='utf-8').splitlines():
        m = re.fullmatch(r'## \[([\w-]+)\]', line)
        if m: name = m[1]; out[name] = []
        elif name: out[name].append(line)
    return {k: '\n'.join(v).strip() for k, v in out.items()}

def cmd_crosswalk(a):
    roster = load_json(ROSTER)
    weapons = {w['id']: w for w in load_json(ROOT / 'data/weapons.json')}
    rows = []
    for r in roster['roots']:
        site = r.get('siteIdentity')
        if not site: continue
        roots = {k: {'path': v['rawCapture']['path'], 'rawSha256': v['rawCapture']['rawSha256']}
                 for k, v in r['roots'].items() if v.get('rawCapture')}
        rows.append({'siteId': site, 'siteName': weapons[site]['name'], 'siteClass': weapons[site]['cls'],
                     'internalId': r['internalId'], 'catalogCategory': r.get('catalogCategory'), 'roots': roots})
    assert {x['siteId'] for x in rows} == set(weapons), 'roster does not cover the site weapons'
    out = {'build': roster.get('build'), 'roster': str(ROSTER), 'rosterSha256': sha(ROSTER.read_bytes()),
           'siteWeaponsSha256': sha((ROOT / 'data/weapons.json').read_bytes()), 'count': len(rows),
           'rawRoot': r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\capture\collection\raw (append .ebx)',
           'weapons': sorted(rows, key=lambda x: (x['siteClass'], x['siteId']))}
    print(write_new(Path(a.run_root) / 'weapon-crosswalk.json', json.dumps(out, indent=1) + '\n'))

def cmd_check_site(a):
    ok = True
    for p in a.pointer:
        try: print(json.dumps({'pointer': p, 'value': resolve_pointer(p)}))
        except (KeyError, IndexError, ValueError) as e: ok = False; print(json.dumps({'pointer': p, 'error': str(e)}))
    sys.exit(0 if ok else 1)

def cmd_assemble(a):
    lead_dir = Path(a.lead_dir)
    for p in a.control_site or []:
        resolve_pointer(p)  # raises before anything is written
    conv, chosen = sections(), [s for s in a.sections.split(',') if s]
    unknown = [s for s in chosen if s not in conv]
    if unknown: raise SystemExit(f'unknown sections {unknown}; have {sorted(conv)}')
    if chosen and 'site-common' not in chosen: chosen.insert(0, 'site-common')
    crosswalk = lead_dir.parent / 'weapon-crosswalk.json'
    brief = lead_dir / a.out_name
    header = [f'Brief file: {brief}'] + ([f'Weapon crosswalk: {crosswalk}'] if crosswalk.exists() else [])
    text = '\n\n'.join([PREAMBLE.read_text(encoding='utf-8').rstrip()] + [conv[s] for s in chosen]
                       + ['\n'.join(header), (lead_dir / 'lead.txt').read_text(encoding='utf-8').strip()]) + '\n'
    digest = write_new(brief, text)
    print(json.dumps({'brief': str(brief), 'sha256': digest, 'sections': chosen,
                      'preambleSha256': sha(PREAMBLE.read_bytes()), 'conventionsSha256': sha(CONVENTIONS.read_bytes())}))

def cmd_prior_work(a):
    terms = [t.lower() for arg in a.terms for t in arg.split(',') if t]
    files = [*ROOT.glob('docs/**/*.md'), *ROOT.glob('docs/working/*.txt'),
             *ROOT.glob('reference-data/provenance/*.json'), ROOT / 'reference-data/frosty/asset-findings.json']
    for f in sorted(set(files)):
        text = f.read_text(encoding='utf-8-sig', errors='replace')
        low = text.lower()
        hits = {t: low.count(t) for t in terms if t in low or t in f.name.lower()}
        if not hits: continue
        lines = [l.strip()[:160] for l in text.splitlines() if any(t in l.lower() for t in terms)][:a.lines]
        print(f'{f.relative_to(ROOT)}  {hits}')
        for l in lines: print(f'    {l}')

RESULT_KEYS = ['lead', 'status', 'control', 'scope', 'rows', 'siteImpact', 'unresolved', 'outOfScopeNotes']
RAW_KEYS = ['path', 'rawSha256', 'offset', 'type', 'bytesHex', 'value']
RECEIPT_KEYS = ['lead', 'status', 'build', 'question', 'sourceFacts', 'inference', 'unresolved', 'siteImpact', 'evidence']

def raw_checks(node):
    if isinstance(node, dict):
        if 'bytesHex' in node and 'offset' in node: yield node
        for v in node.values(): yield from raw_checks(v)
    elif isinstance(node, list):
        for v in node: yield from raw_checks(v)

def cmd_review(a):
    lead_dir = Path(a.lead_dir)
    results = sorted(lead_dir.glob('*-result*.json'), key=lambda p: p.stat().st_mtime)
    if not results: raise SystemExit(f'no *-result*.json in {lead_dir}')
    path = Path(a.result) if a.result else results[-1]
    res, issues = load_json(path), []
    issues += [f'result missing key {k}' for k in RESULT_KEYS if k not in res]
    control = res.get('control') or {}
    if control.get('passed') is not True: issues.append(f'control not passed (status {res.get("status")})')
    scope = res.get('scope') or {}
    if scope.get('expected') != scope.get('examined'):
        issues.append(f'scope examined {scope.get("examined")} != expected {scope.get("expected")}')
    checks = list(raw_checks(res))
    bad = [c for c in checks if any(k not in c for k in RAW_KEYS)]
    if bad: issues.append(f'{len(bad)} raw checks missing keys {RAW_KEYS}')
    rows_without = sum(1 for r in res.get('rows', []) if isinstance(r, dict) and not list(raw_checks(r)))
    receipt = lead_dir / 'draft-receipt.json'
    if not receipt.exists(): issues.append('draft-receipt.json missing')
    else: issues += [f'receipt missing key {k}' for k in RECEIPT_KEYS if k not in load_json(receipt)]
    if not (lead_dir / 'summary.md').exists(): issues.append('summary.md missing')
    reader = runpy.run_path(str(ROOT / 'scripts/frosty-raw-check.py'))['read']
    good = [c for c in checks if c not in bad]
    picks = (list(raw_checks(control))[:1] + random.Random(a.seed).sample(good, min(a.reread, len(good))))
    rereads = []
    for c in picks:
        try:
            r = reader(c['path'], c['offset'], c['type'])
            same = r['bytesHex'] == str(c['bytesHex']).replace(' ', '').lower() and r['rawSha256'] == c['rawSha256']
        except Exception as e:
            r, same = {'error': str(e)}, False
        rereads.append({'claimed': c, 'reread': r, 'bytesAndHashMatch': same})
        if not same: issues.append(f'raw re-read mismatch at {c.get("path")}@{c.get("offset")}')
    print(json.dumps({'result': str(path), 'resultSha256': sha(path.read_bytes()), 'status': res.get('status'),
                      'scope': scope, 'rows': len(res.get('rows', [])), 'rowsWithoutRawChecks': rows_without,
                      'rawChecks': len(checks), 'rereads': rereads, 'issues': issues}, indent=1, default=str))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('crosswalk'); s.add_argument('--run-root', required=True); s.set_defaults(f=cmd_crosswalk)
    s = sub.add_parser('check-site'); s.add_argument('--pointer', action='append', required=True); s.set_defaults(f=cmd_check_site)
    s = sub.add_parser('assemble'); s.add_argument('--lead-dir', required=True); s.add_argument('--sections', default='')
    s.add_argument('--control-site', action='append'); s.add_argument('--out-name', default='brief.txt'); s.set_defaults(f=cmd_assemble)
    s = sub.add_parser('prior-work'); s.add_argument('--terms', nargs='+', required=True); s.add_argument('--lines', type=int, default=2)
    s.set_defaults(f=cmd_prior_work)
    s = sub.add_parser('review'); s.add_argument('--lead-dir', required=True); s.add_argument('--result')
    s.add_argument('--reread', type=int, default=2); s.add_argument('--seed', type=int, default=0); s.set_defaults(f=cmd_review)
    a = ap.parse_args(); a.f(a)

if __name__ == '__main__':
    main()
