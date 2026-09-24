"""Review magazine capacity and reload-tier inputs against selected source effects."""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report-dir', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    detail = args.report_dir / (args.out.stem + '-leaves.jsonl')
    if detail.exists() or args.out.exists():
        ap.error('Use new output paths.')
    root = args.report_dir.parents[1] / 'xml/xml-overlay'
    read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
    roster = read(repo / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json')
    catalog = read(repo / 'data/attachments.json')
    handling = read(repo / 'reference-data/provenance/frosty-attachment-handling-generated.json')
    followup = read(repo / 'reference-data/provenance/frosty-handling-mapping-followup.json')
    spec = importlib.util.spec_from_file_location('cfg', repo / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    xml_cache, xml_hashes = {}, {}

    def xml(path):
        if path not in xml_cache:
            p = root / path
            xml_cache[path] = ET.fromstring(p.read_bytes())
            xml_hashes[path] = digest(p)
        return xml_cache[path]

    weapons = [{'internalId': r['internalId'], 'siteId': r['siteIdentity'],
                'gsXml': r['roots']['GS']['xmlOverlay']['path'] + '.xml',
                'wbXml': r['roots']['WB']['xmlOverlay']['path'] + '.xml'}
               for r in roster['roots'] if r.get('siteIdentity')]
    extras = defaultdict(list)
    for row in followup['rows']:
        if row.get('abilityProgression'):
            extras[row['internalId']].append(row['abilityProgression'])
    graph, issues = cfg.attachment_graph(root, weapons, xml, ability_progressions=extras)
    graph = {r.get('sourceKey') or r['attachmentXml']: r for r in graph}
    identities = {(r['weapon'], r['attachment']): r for r in handling['rows'] if r['slot'] == 'mag'}
    reader = runpy.run_path(str(repo / 'scripts/frosty-ebx-decode.py'))
    db = sqlite3.connect((args.report_dir / 'coverage-decoder-v5.sqlite').resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    td_cache, ebx_cache = {}, {}

    class Located(reader['Ebx']):
        def _read_class(self, cls, offset):
            body = super()._read_class(cls, offset)
            locations = body.get('$researchLocations', {})
            for f in cls['fields']:
                kind = reader['debug_type'](f['flags'])
                if kind != reader['INHERITED']:
                    locations['Field_' + f['hash']] = (offset + f['offset'], kind)
            body['$researchLocations'] = locations
            return body

    def source(effect, field):
        route = effect['sourceXml'].removesuffix('.xml')
        if route.lower() not in ebx_cache:
            c = dict(db.execute('SELECT * FROM captures WHERE route=? COLLATE NOCASE AND head=4892017', (route,)).fetchone())
            if c['descriptor_path'] not in td_cache:
                td_cache[c['descriptor_path']] = reader['type_descriptors'](c['descriptor_path'])
            td = td_cache[c['descriptor_path']]
            assert td['sha256'] == c['descriptor_sha256']
            ebx = Located(c['raw_path'], td)
            assert ebx.sha256 == c['raw_sha256']
            objs = ebx.decode()['objects']
            ebx_cache[route.lower()] = (c, ebx, objs)
        c, ebx, objs = ebx_cache[route.lower()]
        matches = [o for o in objs if (o.get('$guid') or '').lower() == effect['guid'].lower()]
        join = 'exact-object-guid'
        if not matches and effect.get('allowUniqueWbOwner'):
            matches = [o for o in objs if o.get('$class') == effect['type'] and 'Field_4cc9e2ed' in o]
            join = 'unique-WB-owner-class-and-ammo-field; XML local GUID is not serialized as an exported object GUID'
        obj, = matches
        node = obj
        parts = field.strip('/').split('/')
        for part in parts[:-1]:
            node = node[int(part)] if isinstance(node, list) else node[part]
        leaf = parts[-1]
        off, kind = node['$researchLocations'][leaf]
        fmt = '<f' if kind == reader['FLOAT32'] else '<i'
        raw = struct.unpack_from(fmt, ebx.data, off)[0]
        assert abs(raw - node[leaf]) < 0.000001
        return dict(sourceAsset=route, sourceObjectGuid=obj.get('$guid'), sourceClass=obj['$class'],
                    sourceObjectIndex=objs.index(obj), xmlObjectGuid=effect['guid'], objectJoin=join,
                    sourceFieldPath='/' + field, sourceValue=node[leaf], rawValue=raw,
                    byteOffset=off, bytesHex=ebx.data[off:off+4].hex(),
                    rawPath=c['raw_path'], rawSha256=c['raw_sha256'], head=c['head'],
                    descriptorSha256=c['descriptor_sha256'])

    rows, comparisons = [], []
    wb_roots = {r['siteIdentity']: r['roots']['WB'] for r in roster['roots'] if r.get('siteIdentity')}
    for wid, wm in catalog['WEAPON_MAG'].items():
        for aid, mag in wm['mags'].items():
            identity = identities[(wid, aid)]
            branches = [graph[p] for p in identity['sourceAttachments']]
            effects, bindings = {}, []
            for branch in branches:
                for b in branch['branches']:
                    for action in b['actions']:
                        for sel in action['selectors']:
                            for mod in sel['wbModifiers']:
                                bindings.append(dict(attachment=branch.get('attachmentXml'), ability=b['abilityXml'],
                                                     branchGuid=b['guid'], action=action['guid'], selector=sel['unlock'],
                                                     modifier={k: v for k, v in mod.items() if k != 'effects'},
                                                     effects=mod['effects']))
                                for e in mod['effects']:
                                    effects[(e['sourceXml'], e['guid'])] = e
            caps = [source(e, 'Field_7f22bfb4') for e in effects.values() if e['type'] == 'Class_e7d2410a']
            capacity_origin = 'selected-package'
            if not caps:
                wb = wb_roots[wid]
                wb_xml = xml(wb['xmlOverlay']['path'] + '.xml')
                owner, = [o for o in wb_xml if o.find('Field_4cc9e2ed') is not None]
                caps = [source(dict(sourceXml=wb['xmlOverlay']['path'] + '.xml', guid=owner.get('Guid'),
                                    type=owner.tag, allowUniqueWbOwner=True),
                               'Field_4cc9e2ed/Field_7f22bfb4')]
                capacity_origin = 'base-WB-no-capacity-modifier-in-selected-graph'
            speeds = [source(e, 'Field_348b8cd1') for e in effects.values() if e['type'] == 'Class_9705264b']
            animation = []
            for e in effects.values():
                if e['type'] == 'Class_7d916d6b':
                    animation.extend(source(e, f'Field_d15a0c1c/0/{f}') for f in ('Field_fc66e75e', 'Field_1c533b56'))
            c = dict(siteWeapon=wid, selectionId=aid, siteCapacity=mag['mag'], capacitySources=caps,
                     capacityOrigin=capacity_origin, reloadAnimationOverride=animation,
                     reloadTier=mag.get('reloadSpeedTier'), speedSources=speeds,
                     bindings=bindings, exactSourceChoices=identity['sourceAttachments'])
            comparisons.append(c)
            for field, sources in [('mag', caps), ('reloadSpeedTier', speeds)]:
                if field not in mag:
                    continue
                status, agreement, limit, proposal = 'sourced-configuration', 'match', 'Source graph and scalar values only; native activation remains unproven.', None
                if field == 'mag':
                    deltas = [s['sourceValue'] - mag[field] for s in caps]
                    agreement = dict(sourceMinusSite=deltas)
                    if any(deltas):
                        status = 'precisely-blocked-runtime'
                        limit = 'Site Mag Size reports nominal magazine rounds; raw MagazineCapacity includes additional loaded rounds. A source field alone does not establish the initial/chamber/reload state. The exact difference is recorded, not normalized away.'
                        proposal = 'Keep nominal magazine display pending definition review; test loaded HUD count after factory spawn, empty reload and tactical reload. If an effective loaded-capacity output is added, expose the chamber state separately. No current sim/core cadence calculation consumes mag.'
                elif speeds:
                    factor = read(repo / 'data/balance_tables.json')['RELOAD_SPEED_MULTIPLIERS'][mag[field]]
                    assert all(abs(s['sourceValue'] - factor) < 0.00001 for s in speeds)
                    agreement = dict(siteTier=mag[field], tableMultiplier=factor, sourceMultipliers=[s['sourceValue'] for s in speeds])
                elif mag[field] == 0:
                    status = 'software-contract'
                    agreement = 'neutral-tier; no speed modifier in exact selected effect graph'
                else:
                    assert wid == 'm121a2' and aid == '50_fast' and len(animation) == 2
                    status = 'mismatch-with-proposal'
                    sources = animation
                    base = next(w for w in read(repo / 'data/weapons.json') if w['id'] == wid)
                    candidate = animation[0]['sourceValue'] / animation[1]['sourceValue']
                    site = base['tacRld'] / read(repo / 'data/balance_tables.json')['RELOAD_SPEED_MULTIPLIERS'][mag[field]]
                    agreement = dict(siteDerivedSeconds=site, sourceAnimationCandidateSeconds=candidate, differenceSeconds=candidate-site)
                    limit = 'This exact selection binds a ReloadInfoArray replacement, not a scalar 1.13 modifier. Its native activation and replacement semantics remain unproven.'
                    proposal = 'Use a selection-specific tactical animation time candidate of 5.55 seconds instead of the global tier model (5.546018 seconds), after consumer or matching menu evidence. A 60 fps shot-timing capture cannot reliably separate this roughly 4 ms difference.'
                rows.append(dict(siteFile='data/attachments.json', sitePointer=f'/WEAPON_MAG/{wid}/mags/{aid}/{field}',
                                 siteValue=mag[field], siteWeapon=wid, selectionId=aid,
                                 sourceRecords=sources, bindingEvidence=c,
                                 reviewStatus=status, sourceSiteAgreement=agreement, remainingUncertainty=limit, proposal=proposal))
    detail.write_text(''.join(json.dumps(r) + '\n' for r in rows), encoding='utf-8')
    result = dict(date='2026-09-23', scope='287 exact magazine selections; capacities and reload tiers only',
                  selections=len(comparisons), leaves=len(rows),
                  capacityCases=dict(Counter(str([s['sourceValue'] - r['siteCapacity'] for s in r['capacitySources']]) for r in comparisons)),
                  reloadCases=dict(Counter(str((r['reloadTier'], [s['sourceValue'] for s in r['speedSources']])) for r in comparisons)),
                  statuses=dict(Counter(r['reviewStatus'] for r in rows)),
                  details=dict(path=str(detail), sha256=digest(detail)),
                  scriptSha256=digest(Path(__file__)), siteSha256=digest(repo / 'data/attachments.json'),
                  limits=['Exact source graph presence does not prove native use.',
                          'Capacity differences retain site nominal-magazine versus raw loaded-capacity semantics; no production correction is made.'])
    hashes_path = args.report_dir / (args.out.stem + '-xml-hashes.json')
    hashes_path.write_text(json.dumps(xml_hashes, indent=2) + '\n', encoding='utf-8')
    result['xmlSourceHashes'] = dict(path=str(hashes_path), sha256=digest(hashes_path), count=len(xml_hashes))
    args.out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k not in ('xmlHashes',)}, indent=2))


if __name__ == '__main__':
    main()
