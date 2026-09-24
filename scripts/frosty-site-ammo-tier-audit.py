"""Review remaining ammunition tier operands and inactive collateral fallbacks."""
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


    ammo = read(repo / 'data/ammo.json')
    mappings = read(repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json')['choices']
    identity = {(r['weapon'],r['attachment']):r for r in mappings if r['slot']=='ammo'}
    draft = [json.loads(l) for l in (args.report_dir / 'site-ammo-numeric-current-leaf-joins-2026-09-23.jsonl').read_text(encoding='utf-8').splitlines()]
    base = {r['id']:r for r in ammo['AMMO']}
    tier_fields = {'adsRecoilTierMod','hipRecoilTierMod','adsMoveSpeedTierShift','hipSpreadTierMod','worldSpotMult','minimapSpotMult','healthRegenDelayAddS'}
    targets = [r for r in draft if r['sitePointer'].split('/')[-1] in tier_fields or r['leafKind']=='global-collateral-fallback']
    selections={}; rows=[]
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
            operands=defaultdict(list)
            for e in effects.values():
                obj,=[o for o in xml(e['sourceXml']) if o.get('Guid','').lower()==e['guid'].lower()]
                if obj.tag=='Class_bb838ff6':
                    for fld,aim in [('adsRecoilTierMod','Field_6b84de87'),('hipRecoilTierMod','Field_7b609515')]:
                        # Struct tags are XML-only wrappers; decoded objects use field hashes.
                        ptr=f'{aim}/Field_22ce7cf3/Field_4692836a'
                        v=source(e,ptr); operands[fld].append(v)
                elif obj.tag=='Class_303a33cc':
                    v=source(e,'Field_c427eabf');v['siteSign']=-1;operands['adsMoveSpeedTierShift'].append(v)
                elif obj.tag=='Class_5830cb87':
                    operands['healthRegenDelayAddS'].append(source(e,'Field_8359723e'))
                elif obj.tag=='Class_0045e7fa':
                    operands['worldSpotMult'].append(source(e,'Field_6f8d5f40'))
                    operands['minimapSpotMult'].append(source(e,'Field_d98b0371'))
                elif obj.tag=='Class_743a3ce0' and '/hipdispersion/' in e['sourceXml'].lower():
                    v=source(e,'Field_9540bd8e/Field_4692836a');v['siteSign']=-1
                    v['xmlTarget']=obj.findtext('Field_94752c29');assert v['xmlTarget']=='Field_84e57075'
                    operands['hipSpreadTierMod'].append(v)
            selections[(wid,aid)]=dict(bindings=bindings,operands=dict(operands))
    for r in targets:
        row={k:r[k] for k in ['siteFile','sitePointer','siteValue','siteWeapon','siteAmmo']};row['reviewStatus']='pending-review'
        if r['leafKind']=='global-collateral-fallback':
            all_present=all(aid in read(repo/'data/balance_tables.json')['COLLATERAL_MULT_OVERRIDE'].get(wid,{}) for wid,v in ammo['WEAPON_AMMO'].items() for aid in v['ammo'])
            assert all_present
            row.update(reviewStatus='software-contract',sourceSiteAgreement='inactive fallback: all 328 current selectable weapon/ammo pairs have non-null per-weapon override',consumer='sim/applyAttachments.js collateralMult nullish fallback',remainingUncertainty='Retained fallback origin is not established as a native mechanic. No current selectable output uses it.')
        else:
            field=r['sitePointer'].split('/')[-1]
            keys=[(r['siteWeapon'],r['siteAmmo'])] if r['siteWeapon'] else [(w,r['siteAmmo']) for w,v in ammo['WEAPON_AMMO'].items() if r['siteAmmo'] in v['ammo'] and field not in v.get('effectOverrides',{}).get(r['siteAmmo'],{})]
            evidence=[]
            for key in keys:
                v=selections[key];ops=v['operands'].get(field,[]);value=(math.prod(o['rawValue'] for o in ops) if field in ('worldSpotMult','minimapSpotMult') else sum(o['rawValue']*o.get('siteSign',1) for o in ops))
                evidence.append(dict(siteWeapon=key[0],selectionId=key[1],sourceRecords=ops,bindings=v['bindings'],sourceDerivedValue=value,agrees=abs(value-r['siteValue'])<1e-6))
            row.update(comparisons=evidence,sourceSiteAgreement=all(e['agrees'] for e in evidence),remainingUncertainty='Selected source operands and additive index model do not prove native activation or composition order.')
            if evidence and row['sourceSiteAgreement']:row['reviewStatus']='sourced-configuration'
        rows.append(row)
    detail.write_text(''.join(json.dumps(r)+'\n' for r in rows),encoding='utf-8')
    result=dict(date='2026-09-23',build=dict(label='1.4.3.0',head=4892017),scope='83 ammunition effect fields and 77 current inactive collateral fallback values',siteSha256=digest(repo/'data/ammo.json'),leaves=len(rows),statuses=dict(Counter(r['reviewStatus'] for r in rows)),details=dict(path=str(detail),sha256=digest(detail)),scriptSha256=digest(Path(__file__)))
    hashes_path=args.report_dir/(args.out.stem+'-xml-hashes.json')
    hashes_path.write_text(json.dumps(xml_hashes,indent=2)+'\n',encoding='utf-8')
    result['xmlSourceHashes']=dict(path=str(hashes_path),sha256=digest(hashes_path),count=len(xml_hashes))
    result['sourceOperation']='Recoil index operands sum; hip spread and movement speed indices reverse sign to match site ladders; spotting factors multiply; regeneration delay additions sum. Native composition is not proven.'
    result['perWeaponComparisons']=sum(len(r.get('comparisons',[])) for r in rows)
    args.out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,indent=2))
    print('Unmatched:',[(r['sitePointer'],[(e['siteWeapon'],e['sourceDerivedValue']) for e in r.get('comparisons',[]) if not e['agrees']]) for r in rows if r['reviewStatus']=='pending-review'])

if __name__=='__main__':main()
