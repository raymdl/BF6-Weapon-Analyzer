"""Review current muzzle recoil and spread operands."""
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
import uuid
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
        fmt = '<?' if isinstance(node[leaf],bool) else '<f' if kind == reader['FLOAT32'] else '<i'
        raw = struct.unpack_from(fmt, ebx.data, off)[0]
        assert abs(raw - node[leaf]) < 0.000001 or (kind != reader['FLOAT32'] and raw == node[leaf] - 4294967296)
        return dict(sourceAsset=route, sourceObjectGuid=obj.get('$guid'), sourceClass=obj['$class'],
                    sourceObjectIndex=objs.index(obj), xmlObjectGuid=effect['guid'], objectJoin=join,
                    sourceFieldPath='/' + field, sourceValue=node[leaf], rawValue=raw,
                    byteOffset=off, bytesHex=ebx.data[off:off+struct.calcsize(fmt)].hex(),
                    rawPath=c['raw_path'], rawSha256=c['raw_sha256'], head=c['head'],
                    descriptorSha256=c['descriptor_sha256'])



    mappings=read(repo/'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json')['choices']
    target_fields={'adsRecoilTierMod','hipRecoilTierMod','adsRecoilVariationTierMod','hipRecoilVariationTierMod','adsRecoilDecayMult','hipRecoilDecayMult','recoilDurationOverride','recoilDecreaseTimeExponentAdd','hipSpreadTierMod','adsSpreadDecayBoost','deployTimeTierShift','sprintRecoveryTierShift'}
    byid={m['id']:m for m in catalog['MUZZLES']}; selections={}; rows=[]
    for entry in mappings:
        if entry['slot']!='muzzle':continue
        wid,aid=entry['weapon'],entry['attachment'];bindings=[];effects={}
        for src in entry['sources']:
            if src['source'] not in graph:raise ValueError(src['source'])
            for b in graph[src['source']]['branches']:
                for action in b['actions']:
                    for selector in action['selectors']:
                        bindings.append(dict(attachment=src['source'],ability=b['abilityXml'],action=action['guid'],selector=selector['unlock'],gsBindings=selector['gsBindings'],wbModifiers=selector['wbModifiers']))
                        for m in selector['wbModifiers']:
                            for e in m['effects']:effects[(e['sourceXml'],e['guid'])]=e
                        for g in selector['gsBindings']:
                            ref=g['modifier']
                            if ref:
                                ep=ref['asset']+'.xml';eo,=[o for o in xml(ep) if o.get('Guid','').lower()==ref['guid'].lower()];effects[(ep,ref['guid'])]=dict(sourceXml=ep,guid=ref['guid'],type=eo.tag)
        operands=defaultdict(list); flags=[]
        for e in effects.values():
            obj,=[o for o in xml(e['sourceXml']) if o.get('Guid','').lower()==e['guid'].lower()]
            if obj.tag=='Class_bb838ff6':
                for aim,key in [('Field_6b84de87','ads'),('Field_7b609515','hip')]:
                    for label,field,op in [('RecoilTierMod','Field_22ce7cf3','Field_4692836a'),('RecoilVariationTierMod','Field_02433593','Field_4692836a'),('RecoilDecayMult','Field_28df1cde','Field_5695ee1c')]:
                        operands[key+label].append(source(e,f'{aim}/{field}/{op}'))
                    flag=source(e,f'{aim}/Field_5a02dd65/Field_bbffe8bc');flags.append(flag)
                    if flag['rawValue']:
                        v=source(e,f'{aim}/Field_5a02dd65/Field_bbbfe9cc');v['enableFlag']=flag;operands['recoilDurationOverride_'+key].append(v)
                    operands['recoilDecreaseTimeExponentAdd_'+key].append(source(e,f'{aim}/Field_1d04f0f6/Field_4692836a'))
            elif obj.tag=='Class_743a3ce0' and '/hipdispersion/' in e['sourceXml'].lower():
                v=source(e,'Field_9540bd8e/Field_4692836a');v['siteSign']=-1;assert obj.findtext('Field_94752c29')=='Field_84e57075';operands['hipSpreadTierMod'].append(v)
            elif obj.tag in ['Class_03db7a68','Class_4aac041b']:
                v=source(e,'Field_9540bd8e');v['siteSign']=-1;operands['sprintRecoveryTierShift' if obj.tag=='Class_03db7a68' else 'deployTimeTierShift'].append(v)
        selections[(wid,aid)]=dict(bindings=bindings,operands=dict(operands),allEffectIdentities=list(effects.values()),durationFlags=flags)
    for idx,m in enumerate(catalog['MUZZLES']):
        fields=[(f,None,v) for f,v in m.items() if f in target_fields]
        fields += [(f,w,v) for w,ov in m.get('weaponOverrides',{}).items() for f,v in ov.items() if f in target_fields]
        for f,w,value in fields:
            pointer=f'/MUZZLES/{idx}/'+(f'weaponOverrides/{w}/' if w else '')+f
            keys=[(w,m['id'])] if w else [k for k in selections if k[1]==m['id'] and f not in m.get('weaponOverrides',{}).get(k[0],{})]
            comparisons=[]
            for key in keys:
                sel=selections[key];opkey=f+'_ads' if f in ['recoilDurationOverride','recoilDecreaseTimeExponentAdd'] else f;ops=sel['operands'].get(opkey,[])
                if f=='recoilDurationOverride':derived=ops[0]['rawValue'] if ops and len({round(x['rawValue'],6) for x in ops})==1 else None
                elif f.endswith('DecayMult'):derived=math.prod(o['rawValue'] for o in ops)
                else:derived=sum(o['rawValue']*o.get('siteSign',1) for o in ops)
                other=sel['operands'].get(f+'_hip',[])
                comparisons.append(dict(siteWeapon=key[0],selectionId=key[1],sourceRecords=ops,hipCompanionRecords=other,sourceDerivedValue=derived,agrees=derived is not None and abs(derived-value)<1e-6,bindings=sel['bindings'],allEffectIdentities=sel['allEffectIdentities']))
            status='sourced-configuration' if comparisons and all(c['agrees'] for c in comparisons) else 'pending-review'
            if not comparisons or (comparisons and all(c['agrees'] and not c['sourceRecords'] for c in comparisons)):
                status='software-contract'
            blocked=[]
            if status=='pending-review':
                assert (m['id']=='flash_comp' and f in ['adsRecoilDecayMult','hipRecoilDecayMult','recoilDurationOverride']) or (m['id']=='std_supp' and f=='hipSpreadTierMod')
                status='precisely-blocked-source'
                for c in comparisons:
                    if c['agrees']:continue
                    root_record=next(x for x in roster['roots'] if x['siteIdentity']==c['siteWeapon'])['roots']['GS']['rawCapture']
                    cap=dict(db.execute('select * from captures where route=? collate nocase and raw_sha256=?',(root_record['path'],root_record['rawSha256'])).fetchone())
                    raw=Path(cap['raw_path']).read_bytes();assert digest(Path(cap['raw_path']))==cap['raw_sha256']
                    selectors=[b['selector']['guid'] for b in c['bindings']]
                    checks=[dict(selectorGuid=g,rawGuidOccurrences=raw.count(uuid.UUID(g).bytes_le)) for g in selectors]
                    assert all(x['rawGuidOccurrences']==0 for x in checks)
                    blocked.append(dict(siteWeapon=c['siteWeapon'],gsRawPath=cap['raw_path'],gsRawSha256=cap['raw_sha256'],checks=checks,reason='Exact selected selector has no GS binding in this captured body; WB package has only the recorded non-recoil/non-spread effects. This does not exclude a native or additional consumer.'))
            rows.append(dict(siteFile='data/attachments.json',sitePointer=pointer,siteValue=value,siteWeapon=w,selectionId=m['id'],reviewStatus=status,sourceSiteAgreement=all(c['agrees'] for c in comparisons),comparisons=comparisons,sourceBlockers=blocked,proposal=('Compare PP19 Flash Comp versus Flash Hider: site predicts recoil recovery factor 1.2 and duration 0.05 s only for Flash Comp; capture accepted shots and post-shot recovery with fixed stance and attachments. Compare L115 Standard Suppressor versus bare muzzle: site shifts hip-minimum table index by -1, while inspected selector graph has no corresponding index operand. Capture large settled hip groups. Neither capture identifies native consumer code.' if blocked else None),remainingUncertainty='Captured selected WB/GS effect graph and operand arithmetic do not prove native activation or composition order. Neutral fallback is software behavior, not proof of native absence.'))
    detail.write_text(''.join(json.dumps(r)+'\n' for r in rows),encoding='utf-8')
    hp=args.report_dir/(args.out.stem+'-xml-hashes.json');hp.write_text(json.dumps(xml_hashes,indent=2)+'\n',encoding='utf-8')
    result=dict(date='2026-09-23',build=dict(label='1.4.3.0',head=4892017),leaves=len(rows),statuses=dict(Counter(r['reviewStatus'] for r in rows)),details=dict(path=str(detail),sha256=digest(detail)),scriptSha256=digest(Path(__file__)),siteSha256=digest(repo/'data/attachments.json'),xmlHashes=dict(path=str(hp),sha256=digest(hp)),limits=['Source configuration is not native execution proof.'])
    args.out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
    print('Unmatched',[(r['sitePointer'],[(c['siteWeapon'],c['sourceDerivedValue']) for c in r['comparisons'] if not c['agrees']]) for r in rows if r['reviewStatus']=='pending-review'])

if __name__=='__main__':main()
