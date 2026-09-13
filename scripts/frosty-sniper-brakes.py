"""Generate sniper brake amount steps from the retained source joins and XML.

The trace supplies identities and field paths, never the numeric steps. Verify
its graph inputs before using it; operand files may change and are read afresh.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BRAKES = {'sp_brake', 'dp_brake', 'comp_brake', 'tp_brake', 'thread_prot'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'data/attachments.json'
    original = json.loads(path.read_text(encoding='utf-8'))
    catalog = json.loads(path.read_text(encoding='utf-8'))
    weapons = json.loads((ROOT / 'data/weapons.json').read_text())
    snipers = {w['id'] for w in weapons if w['cls'] == 'Sniper Rifle'}
    trace_path = ROOT / 'reference-data/provenance/frosty-attachment-full-pass-2026-09-06.json'
    raw_trace = trace_path.read_bytes()
    trace = json.loads(raw_trace)
    expected = {(wid, aid) for wid in snipers for aid in catalog['WEAPON_ATTS'][wid]['muzzle'] if aid in BRAKES}
    rows = [r for r in trace['candidateComparisons']
            if (r.get('siteWeaponId'), r.get('siteId')) in expected and r.get('slot') == 'muzzle']
    if {(r['siteWeaponId'], r['siteId']) for r in rows} != expected:
        raise ValueError('Sniper brake identities do not cover current selections')
    effects = trace['effectIndex']
    operand_files = {effects[s['effect']]['sourceXml'] for r in rows for c in r['comparisons']
                     if c['field'] in ('recoil.ads.amountTier.add', 'recoil.hip.amountTier.add') for s in c['sources']}
    # A changed graph requires a refreshed trace; changed numeric operands do not.
    for source, digest in trace['sourceHashes'].items():
        if source.lower() in {p.lower() for p in operand_files}:
            continue
        if hashlib.sha256((args.root / source).read_bytes()).hexdigest() != digest:
            raise ValueError(f'Stale source graph: {source}')
    muzzles = {m['id']: m for m in catalog['MUZZLES']}
    evidence, hashes = [], {}
    for row in rows:
        wid, aid = row['siteWeaponId'], row['siteId']
        fields, refs = {}, []
        for aim in ('ads', 'hip'):
            comparison, = [c for c in row['comparisons'] if c['field'] == f'recoil.{aim}.amountTier.add']
            source, = comparison['sources']
            effect = effects[source['effect']]
            raw = (args.root / effect['sourceXml']).read_bytes()
            hashes[effect['sourceXml']] = hashlib.sha256(raw).hexdigest()
            obj, = [n for n in ET.fromstring(raw) if n.get('Guid', '').lower() == effect['guid'].lower()]
            field_path = source['path'].split('/', 1)[1] + '/Field_4692836a'
            literal = obj.findtext(field_path)
            value = int(literal, 16) if literal.startswith('0x') else int(literal)
            if literal.startswith('0x') and value >= 0x80000000:
                value -= 0x100000000
            if not -0x80000000 <= value <= 0x7fffffff:
                raise ValueError(f'Invalid Int32: {literal}')
            fields[f'{aim}RecoilTierMod'] = value
            refs.append({'aim': aim, 'sourceXml': effect['sourceXml'], 'guid': effect['guid'],
                         'field': field_path, 'raw': literal, 'value': value})
        muzzles[aid].setdefault('weaponOverrides', {}).setdefault(wid, {}).update(fields)
        evidence.append({'weapon': wid, 'muzzle': aid, 'attachmentXml': row['attachmentXml'],
                         'fields': fields, 'operands': refs})
    if args.check:
        if original != catalog:
            raise ValueError('Sniper brake catalog differs from Frosty operands')
    else:
        if json.loads(path.read_text(encoding='utf-8')) != original:
            raise ValueError('Catalog changed during extraction; rerun')
        path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        report = {'generatedBy': 'scripts/frosty-sniper-brakes.py', 'trace': trace_path.name,
                  'traceSha256': hashlib.sha256(raw_trace).hexdigest(), 'operandHashes': hashes,
                  'rows': evidence}
        (ROOT / 'reference-data/provenance/frosty-sniper-brakes-generated.json').write_text(
            json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'{len(evidence)} sniper brake selections, {len(evidence) * 2} source amount steps')


if __name__ == '__main__':
    main()
