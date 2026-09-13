"""Generate barrel ADS steps from the Frosty WB animation/FOV route.

The prior comparison supplies attachment identities only, never numeric values.
Rebuild the ability/selector graph from XML on each run. GS ADS is a separate
route and is not added to animation/FOV. This does not prove native timing.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    catalog_path = ROOT / 'data/attachments.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    mapping_path = ROOT / 'reference-data/provenance/frosty-barrel-ads-2026-09-13.json'
    mapping = json.loads(mapping_path.read_text(encoding='utf-8'))['rows']
    identities = json.loads((ROOT / 'reference-data/provenance/frosty-weapon-identities.json').read_text())['weapons']
    folders = {r['weapon']: Path(r['attachment']).parent for r in mapping}
    weapons = []
    for w in identities:
        if w['siteId'] in folders:
            folder = folders[w['siteId']]
            wb, = (args.root / folder).glob('*_WB.xml')
            weapons.append({**w, 'gsXml': (folder / f"GS_{w['internalId']}.xml").as_posix(),
                            'wbXml': wb.relative_to(args.root).as_posix()})
    cache, hashes = {}, {}

    def read(path):
        if path not in cache:
            raw = (args.root / path).read_bytes()
            cache[path] = ET.fromstring(raw)
            hashes[path] = hashlib.sha256(raw).hexdigest()
        return cache[path]

    graph, issues = cfg.attachment_graph(args.root, weapons, read)
    graph = {r['attachmentXml']: r for r in graph}
    expected = {(wid, bid) for wid, a in catalog['WEAPON_ATTS'].items()
                for bid in a.get('barrel', []) if bid != 'none'}
    actual = {(r['weapon'], r['barrel']) for r in mapping}
    if actual != expected:
        raise ValueError('Barrel identity mapping does not cover current selections exactly')
    generated, evidence = {}, []
    for row in mapping:
        attachment = row['attachment']
        entry = graph[attachment]
        if not entry['branches']:
            raise ValueError(f'No ability branch: {attachment}')
        relevant = [i for i in issues if i.get('attachmentXml') == attachment]
        if relevant:
            raise ValueError(f'Incomplete barrel graph: {relevant}')
        effects = {}
        for branch in entry['branches']:
            for action in branch['actions']:
                for selector in action['selectors']:
                    for modifier in selector['wbModifiers']:
                        for effect in modifier['effects']:
                            if effect['type'] in ('Class_016623ac', 'Class_104c2294'):
                                key = effect['sourceXml'] + '#' + effect['guid']
                                obj, = [n for n in read(effect['sourceXml'])
                                        if n.get('Guid', '').lower() == effect['guid'].lower()]
                                value = cfg.typed_scalar(obj.findtext('Field_9540bd8e'), 'System.Int32')
                                if value is None:
                                    raise ValueError(f'Missing ADS index: {key}')
                                effects[key] = value
        values = set(effects.values())
        if len(values) > 1:
            raise ValueError(f'Conflicting animation/FOV steps: {attachment}: {effects}')
        step = next(iter(values), 0)
        per_weapon = generated.setdefault(row['barrel'], {})
        if row['weapon'] in per_weapon and per_weapon[row['weapon']] != step:
            raise ValueError(f'Conflicting source attachments for {row["weapon"]}/{row["barrel"]}')
        per_weapon[row['weapon']] = step
        evidence.append({'weapon': row['weapon'], 'barrel': row['barrel'],
                         'attachment': attachment, 'step': step, 'effects': effects})
    for barrel in catalog['BARRELS']:
        barrel.pop('adsTimeTierMod', None)
        if barrel['id'] != 'none':
            barrel['adsTimeTierModByWeapon'] = dict(sorted(generated[barrel['id']].items()))
    output = json.dumps(catalog, indent=2, ensure_ascii=False) + '\n'
    report = {'generatedBy': 'scripts/frosty-barrel-ads.py',
              'route': 'WB animation/FOV; equal parallel effects counted once; no effect contributes zero',
              'rows': evidence, 'sourceHashes': hashes}
    report_path = ROOT / 'reference-data/provenance/frosty-barrel-ads-generated.json'
    if args.check:
        if json.loads(catalog_path.read_text(encoding='utf-8')) != catalog:
            raise ValueError('Barrel ADS catalog differs from current Frosty XML')
    else:
        catalog_path.write_text(output, encoding='utf-8')
        report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'{len(evidence)} source attachments, {len(actual)} unique barrel selections generated from current Frosty XML')


if __name__ == '__main__':
    main()
