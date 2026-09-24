"""Review subsonic velocity inputs and slug ADS spread increment."""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
import math
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
        assert abs(raw - node[leaf]) < 0.000001 or (kind != reader['FLOAT32'] and raw == node[leaf] - 4294967296)
        return dict(sourceAsset=route, sourceObjectGuid=obj.get('$guid'), sourceClass=obj['$class'],
                    sourceObjectIndex=objs.index(obj), xmlObjectGuid=effect['guid'], objectJoin=join,
                    sourceFieldPath='/' + field, sourceValue=node[leaf], rawValue=raw,
                    byteOffset=off, bytesHex=ebx.data[off:off+4].hex(),
                    rawPath=c['raw_path'], rawSha256=c['raw_sha256'], head=c['head'],
                    descriptorSha256=c['descriptor_sha256'])



    ammo=read(repo/'data/ammo.json');weapons={w['id']:w for w in read(repo/'data/weapons.json')}
    base_detail=args.report_dir/'projectile-site-input-leaves.jsonl'
    base_sources={r['siteWeapon']:r for r in map(json.loads,base_detail.read_text(encoding='utf-8').splitlines()) if r.get('siteFile')=='data/weapons.json' and r.get('sitePointer','').endswith('/bulletVel')}
    mappings=read(repo/'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json')['choices'];identity={(r['weapon'],r['attachment']):r for r in mappings if r['slot']=='ammo'}
    selections={};rows=[]
    for wid, cfg_ammo in ammo['WEAPON_AMMO'].items():
        for aid in cfg_ammo['ammo']:
            entry=identity[(wid,aid)]
            bindings=[]; effects={}
            for src in entry['sources']:
                branch=graph[src['source']]
                for b in branch['branches']:
                    for action in b['actions']:
                        for selector in action['selectors']:
                            bindings.append(dict(attachment=src['source'],ability=b['abilityXml'],action=action['guid'],selector=selector['unlock'],gsBindings=selector['gsBindings'],wbModifiers=selector['wbModifiers']))
                            for m in selector['wbModifiers']:
                                for e in m['effects']: effects[(e['sourceXml'],e['guid'])]=e
                            for g in selector['gsBindings']:
                                ref=g['modifier']
                                if ref:
                                    ep=ref['asset']+'.xml';eo,=[o for o in xml(ep) if o.get('Guid','').lower()==ref['guid'].lower()]
                                    effects[(ep,ref['guid'])]=dict(sourceXml=ep,guid=ref['guid'],type=eo.tag)

            factors=[source(e,'Field_6a5c4efd') for e in effects.values() if e['type']=='Class_3e93759b']
            slug=[]
            for e in effects.values():
                if e['type']=='Class_5e5631ff':
                    for state in ['Field_447d6d51','Field_0a160c57']:
                        obj,=[o for o in xml(e['sourceXml']) if o.get('Guid','').lower()==e['guid'].lower()]
                        if obj.findtext(f'Field_6b84de87/Struct_cbb04a56/{state}/Struct_ad3f9081/Field_0084b1d1/Struct_b1f8b400/Field_bbffe8bc')=='True':
                            slug.append(source(e,f'Field_6b84de87/{state}/Field_0084b1d1/Field_bbbfe9cc'))
            selections[(wid,aid)]=dict(bindings=bindings,sourceRecords=factors,slugSourceRecords=slug)
    for wid,wa in ammo['WEAPON_AMMO'].items():
        for aid,t in wa.get('velocityTreatments',{}).items():
            for field in ['subsonicVelocityTier','subsonicVelocityMps']:
                if field not in t:continue
                sel=selections[(wid,aid)];factors=sel['sourceRecords'];assert factors,(wid,aid)
                factor=math.prod(f['rawValue'] for f in factors);velocity=weapons[wid]['bulletVel']*factor;proposal=None
                if field=='subsonicVelocityTier':
                    expected=.8**t[field];status='sourced-configuration' if abs(factor-expected)<1e-6 else 'pending-review';agreement=abs(factor-expected)<1e-6
                else:
                    agreement=abs(velocity-t[field])<1e-6;status='sourced-configuration' if agreement else 'mismatch-with-proposal'
                    proposal='Replace screenshot-transcribed absolute velocity with base source muzzle velocity multiplied by the exact selected subsonic coefficient, after checking how barrel and ammo operations compose. This proposal applies the source-derived model; it is not runtime proof.'
                rows.append(dict(siteFile='data/ammo.json',sitePointer=f'/WEAPON_AMMO/{wid}/velocityTreatments/{aid}/{field}',siteWeapon=wid,selectionId=aid,siteValue=t[field],reviewStatus=status,sourceSiteAgreement=agreement,sourceRecords=factors,bindings=sel['bindings'],baseVelocityMps=weapons[wid]['bulletVel'],baseVelocitySource=base_sources[wid],sourceMultiplier=factor,sourceDerivedVelocityMps=velocity,sourceTierCandidate=math.log(factor)/math.log(.8),proposal=proposal,remainingUncertainty='Field multiplier configuration and arithmetic are established. Native ammo/barrel order and active velocity need a consumer trace or controlled time-of-flight recording.'))
    idx=next(i for i,a in enumerate(ammo['AMMO']) if a['id']=='slugs');v=ammo['AMMO'][idx]['adsSpreadDynOverride']['inc'];cases=[]
    for (wid,aid),sel in selections.items():
        if aid=='slugs':
            assert len(sel['slugSourceRecords'])==2 and all(abs(r['rawValue']-v)<1e-6 for r in sel['slugSourceRecords'])
            cases.append(dict(siteWeapon=wid,sourceRecords=sel['slugSourceRecords'],bindings=sel['bindings']))
    rows.append(dict(siteFile='data/ammo.json',sitePointer=f'/AMMO/{idx}/adsSpreadDynOverride/inc',siteValue=v,reviewStatus='sourced-configuration',sourceSiteAgreement=True,comparisons=cases,remainingUncertainty='Stationary and moving source override values match for all four shotguns; native activation not proven.'))
    assert len(rows)==32;detail.write_text(''.join(json.dumps(r)+'\n' for r in rows),encoding='utf-8')
    hp=args.report_dir/(args.out.stem+'-xml-hashes.json');hp.write_text(json.dumps(xml_hashes,indent=2)+'\n',encoding='utf-8')
    result=dict(date='2026-09-23',build=dict(label='1.4.3.0',head=4892017),leaves=len(rows),statuses=dict(Counter(r['reviewStatus'] for r in rows)),details=dict(path=str(detail),sha256=digest(detail)),scriptSha256=digest(Path(__file__)),siteSha256=digest(repo/'data/ammo.json'),xmlSourceHashes=dict(path=str(hp),sha256=digest(hp)),findings=[{k:r[k] for k in ['sitePointer','siteValue','baseVelocityMps','sourceMultiplier','sourceDerivedVelocityMps','proposal']} for r in rows if r['reviewStatus']=='mismatch-with-proposal'])
    result['baseVelocitySourceReceipt']=dict(path=str(base_detail),sha256=digest(base_detail))
    args.out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))

if __name__=='__main__':main()
