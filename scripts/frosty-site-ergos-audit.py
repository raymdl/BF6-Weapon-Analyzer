"""Join pending Analyzer ERGOS leaves to exact current-build attachment/selector/WME sources."""
import hashlib, importlib.util, json, runpy, sqlite3, struct, xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP = DM / 'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB = REP / 'coverage-decoder-v5.sqlite'
SITE = ROOT / 'data/attachments.json'
MAP = ROOT / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json'
ROSTER = ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
PENDING = REP / 'site-input-review-v4-spotting-corrected/site-input-pending.jsonl'
XMLROOT = REP.parents[1] / 'xml/xml-overlay'
DETAIL = REP / 'frosty-site-ergos-2026-09-23-leaves.jsonl'
OUT = ROOT / 'reference-data/provenance/frosty-site-ergos-2026-09-23.json'

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    config_spec = importlib.util.spec_from_file_location('cfg', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(config_spec); config_spec.loader.exec_module(cfg)
    roster = json.loads(ROSTER.read_text(encoding='utf-8'))
    weapons = [{'internalId':r['internalId'],'siteId':r['siteIdentity'],
                'gsXml':r['roots']['GS']['xmlOverlay']['path']+'.xml',
                'wbXml':r['roots']['WB']['xmlOverlay']['path']+'.xml'}
               for r in roster['roots'] if r.get('siteIdentity')]
    xml_cache = {}
    def read_xml(rel):
        if rel not in xml_cache: xml_cache[rel] = ET.fromstring((XMLROOT / rel).read_bytes())
        return xml_cache[rel]
    graph, issues = cfg.attachment_graph(XMLROOT, weapons, read_xml)
    graph_by_key = {(x['weapon'],x['attachmentXml'].casefold()):x for x in graph}
    site = json.loads(SITE.read_text(encoding='utf-8'))
    mapping = json.loads(MAP.read_text(encoding='utf-8'))['choices']
    identities = {(x['weapon'],x['slot'],x['attachment']):x for x in mapping}
    pending = [json.loads(x) for x in PENDING.read_text(encoding='utf-8').splitlines() if x.strip()]
    leaves = [x for x in pending if x['siteFile']=='data/attachments.json' and x['pointer'].startswith('/ERGOS/')]
    leaves = [x for x in leaves if x['pointer']!='/ERGOS/0/pts']
    assert len(leaves)==51, len(leaves)
    db=sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro',uri=True); db.row_factory=sqlite3.Row
    reader=runpy.run_path(str(ROOT/'scripts/frosty-ebx-decode.py'))
    td_cache={}; decoded={}
    class Located(reader['Ebx']):
        def _read_class(self, cls, offset):
            body=super()._read_class(cls,offset)
            loc=body.get('$researchLocations',{})
            for f in cls['fields']:
                if reader['debug_type'](f['flags'])!=reader['INHERITED']:
                    loc['Field_'+f['hash']]=(offset+f['offset'],reader['debug_type'](f['flags']))
            body['$researchLocations']=loc
            return body
    def capture(route):
        key=route.casefold()
        if key not in decoded:
            r=db.execute('select * from captures where route=? collate nocase and head=4892017',(route,)).fetchone()
            if not r: raise ValueError('no cached current-build capture '+route)
            r=dict(r)
            if sha(r['raw_path'])!=r['raw_sha256'] or sha(r['descriptor_path'])!=r['descriptor_sha256']:
                raise ValueError('raw or descriptor SHA mismatch '+route)
            td=td_cache.setdefault(r['descriptor_path'],reader['type_descriptors'](r['descriptor_path']))
            if td['sha256']!=r['descriptor_sha256']: raise ValueError('descriptor SHA mismatch '+route)
            ebx=Located(r['raw_path'],td)
            if ebx.sha256!=r['raw_sha256']: raise ValueError('decoder raw SHA mismatch '+route)
            decoded[key]=(r,ebx,ebx.decode()['objects'])
        return decoded[key]
    def flatten(node, path, ebx, out):
        if isinstance(node,dict):
            locs=node.get('$researchLocations',{})
            for k,v in node.items():
                if k.startswith('$'): continue
                p=(path+'/'+k) if path else '/'+k
                if isinstance(v,(bool,int,float)):
                    loc=locs.get(k)
                    row={'fieldPath':p,'value':v}
                    if loc:
                        off,kind=loc
                        if kind==reader['FLOAT32']: raw=struct.unpack_from('<f',ebx.data,off)[0]
                        elif kind==reader['INT32']: raw=struct.unpack_from('<i',ebx.data,off)[0]
                        elif kind==reader['UINT32']: raw=struct.unpack_from('<I',ebx.data,off)[0]
                        elif kind==reader['BOOLEAN']: raw=bool(ebx.data[off])
                        else: raw=None
                        width=1 if kind==reader['BOOLEAN'] else 4
                        row.update(byteOffset=off,bytesHex=ebx.data[off:off+width].hex(),rawValue=raw)
                    out.append(row)
                elif isinstance(v,(dict,list)): flatten(v,p,ebx,out)
        elif isinstance(node,list):
            for i,v in enumerate(node): flatten(v,path+'/'+str(i),ebx,out)
    def local_ref_objects(obj, objs, ebx):
        targets=set()
        def scan(x):
            if isinstance(x,dict):
                if isinstance(x.get('$ref'),int): targets.add(x['$ref'])
                for v in x.values(): scan(v)
            elif isinstance(x,list):
                for v in x: scan(v)
        scan(obj); out=[]; seen=set()
        while targets:
            i=targets.pop()
            if i in seen or i<0 or i>=len(objs): continue
            seen.add(i); o=objs[i]; vals=[]; flatten(o,'',ebx,vals); out.append({'objectIndex':i,'class':o.get('$class'),'values':vals})
            more=set()
            def refs(x):
                if isinstance(x,dict):
                    if isinstance(x.get('$ref'),int): more.add(x['$ref'])
                    for v in x.values(): refs(v)
                elif isinstance(x,list):
                    for v in x: refs(v)
            refs(o); targets.update(more-seen)
        return out
    def exact_object(route, guid):
        c,ebx,objs=capture(route)
        direct=next((i for i,o in enumerate(objs) if (o.get('$guid') or '').lower()==guid.lower()),None)
        nodes=[n for n in ET.parse(XMLROOT/(route+'.xml')).getroot() if n.tag.startswith('Class_')]
        if len(nodes)!=len(objs) or any(nodes[i].tag!=objs[i].get('$class') for i in range(len(objs))):
            raise ValueError(f'XML object table and decoded object table disagree for {route}')
        xi=[i for i,n in enumerate(nodes) if (n.get('Guid') or '').lower()==guid.lower()]
        if direct is not None: oi=direct; join='exact-decoded-object-guid'
        elif len(xi)==1: oi=xi[0]; join='exact-XML-GUID-to-decoded-object-table-index; class-order-verified'
        else: return c,ebx,objs,None,'GUID not unique in XML/decoded capture'
        if len(xi)==1 and (nodes[xi[0]].tag!=objs[oi].get('$class')): raise ValueError('XML GUID class and decoded object differ')
        return c,ebx,objs,oi,join
    # Count graph issues separately from selected ERGO routes. A whole-catalog
    # issue count must not be presented as an ERGO blocker.
    ergo_ids={x['id'] for x in site['ERGOS'][1:]}
    ergo_routes={s['source'].casefold() for m in mapping if m['slot']=='ergo' and m['attachment'] in ergo_ids for s in m['sources']}
    ergo_issues=[i for i in issues if (i.get('attachmentXml') or '').casefold() in ergo_routes]
    assert len(ergo_issues)==0, ergo_issues
    details=[]
    for leaf in leaves:
        parts=leaf['pointer'].split('/')
        idx=int(parts[2]); attachment=site['ERGOS'][idx]; sid=attachment['id']
        linked=[]
        for m in mapping:
            if m['slot']!='ergo' or m['attachment']!=sid: continue
            site_id=m['weapon']; root=next(x for x in roster['roots'] if x.get('siteIdentity')==site_id)
            source_weapon=root['internalId']
            for src in m['sources']:
                route=src['source'].removesuffix('.xml')
                gr=graph_by_key.get((source_weapon,src['source'].casefold()))
                if gr is None: raise ValueError(f'graph missing exact selection {source_weapon} {src["source"]}')
                wpm_rows=[]
                for branch in gr['branches']:
                    for action in branch['actions']:
                        for selector in action['selectors']:
                            if selector['unlock']['guid'].lower() not in {x.get('guid','').lower() for x in src.get('selectors',[])}: continue
                            gs_sources=[]
                            for gb in selector['gsBindings']:
                                ref=gb.get('modifier')
                                if not ref: continue
                                gr=ref['asset']; gc,gebx,gobjs,goi,gj=exact_object(gr,ref['guid'])
                                gv=[]
                                if goi is not None: flatten(gobjs[goi],'',gebx,gv)
                                gs_sources.append({'gsSourceAsset':gb['sourceXml'].removesuffix('.xml'),'gsBindingPath':gb['path'],
                                  'modifierAsset':gr,'modifierGuid':ref['guid'],'rawBranch':gb.get('rawBranch'),
                                  'modifierObjectJoin':gj,'modifierRawSha256':gc['raw_sha256'],
                                  'modifierDescriptorSha256':gc['descriptor_sha256'],'modifierObjectIndex':goi,
                                  'modifierClass':gobjs[goi].get('$class') if goi is not None else None,
                                  'modifierValues':gv,'modifierLocalRefObjects':local_ref_objects(gobjs[goi],gobjs,gebx) if goi is not None else []})
                            for wpm in selector['wbModifiers']:
                                wr=wpm['sourceXml'].removesuffix('.xml'); c,ebx,objs=capture(wr)
                                wo=next((o for o in objs if (o.get('$guid') or '').lower()==(wpm.get('guid') or '').lower()),None)
                                effects=[]
                                for eff in wpm['effects']:
                                    er=eff['sourceXml'].removesuffix('.xml'); ec,eebx,eobjs=capture(er)
                                    eo=next((o for o in eobjs if (o.get('$guid') or '').lower()==(eff.get('guid') or '').lower()),None)
                                    effect_join='exact-decoded-object-guid'
                                    xml_nodes=[n for n in ET.parse(XMLROOT/(er+'.xml')).getroot() if n.tag.startswith('Class_')]
                                    if len(xml_nodes)!=len(eobjs) or any(xml_nodes[i].tag!=eobjs[i].get('$class') for i in range(len(eobjs))):
                                        raise ValueError(f'XML object table and decoded object table disagree for {er}')
                                    xml_matches=[i for i,n in enumerate(xml_nodes) if (n.get('Guid') or '').lower()==(eff.get('guid') or '').lower()]
                                    if len(xml_matches)==1:
                                        xi=xml_matches[0]
                                        if xml_nodes[xi].tag!=eff['type']: raise ValueError(f'XML GUID class differs from graph effect type: {er} {eff["guid"]}')
                                        if eo is None:
                                            eo=eobjs[xi]
                                            effect_join='exact-XML-GUID-to-decoded-object-table-index; class-order-verified'
                                    if eo is None:
                                        candidates=[(i,o) for i,o in enumerate(eobjs) if o.get('$class')==eff['type']]
                                        cv=[]
                                        for oi,o in candidates:
                                            vals=[];flatten(o,'',eebx,vals)
                                            cv.append({'objectIndex':oi,'objectGuid':o.get('$guid'),'class':o.get('$class'),
                                              'objectAbsoluteOffset':eebx.data_offsets[oi],'values':vals,
                                              'localRefObjects':local_ref_objects(o,eobjs,eebx)})
                                        effects.append({'asset':er,'objectGuid':eff['guid'],'class':eff['type'],
                                          'rawSha256':ec['raw_sha256'],'descriptorSha256':ec['descriptor_sha256'],
                                          'head':ec['head'],'objectJoin':'XML GUID not uniquely aligned to decoded object table',
                                          'sameClassCandidates':cv})
                                        continue
                                    vals=[];flatten(eo,'',eebx,vals)
                                    effects.append({'asset':er,'objectGuid':eff['guid'],'class':eff['type'],'objectJoin':effect_join,
                                      'rawSha256':ec['raw_sha256'],'descriptorSha256':ec['descriptor_sha256'],
                                      'head':ec['head'],'objectIndex':eobjs.index(eo),'objectAbsoluteOffset':eebx.data_offsets[eobjs.index(eo)],
                                      'values':vals,'localRefObjects':local_ref_objects(eo,eobjs,eebx)})
                                wpm_rows.append({'selectorGuid':selector['unlock']['guid'],'wpmAsset':wr,'wpmGuid':wpm['guid'],
                                  'wpmRawSha256':c['raw_sha256'],'wpmDescriptorSha256':c['descriptor_sha256'],
                                  'wpmByteHashConfirmed':True,'effects':effects,
                                  'gsBindings':selector['gsBindings'],'gsModifierSources':gs_sources})
                ac= db.execute('select raw_sha256,descriptor_sha256 from captures where route=? collate nocase and head=4892017',(route,)).fetchone()
                linked.append({'siteWeapon':site_id,'sourceWeapon':source_weapon,'attachmentAsset':route,
                  'attachmentGuid':src.get('attachmentGuid'),'attachmentRawSha256':ac['raw_sha256'] if ac else None,
                  'attachmentDescriptorSha256':ac['descriptor_sha256'] if ac else None,'selectorGuids':[x.get('guid') for x in src.get('selectors',[])],
                  'selectorWpm':wpm_rows})
        base_rate=None
        if leaf['pointer']=='/ERGOS/13/autoRpm':
            root=next(x for x in roster['roots'] if x.get('siteIdentity')=='vssm')
            wbroute=root['roots']['WB']['rawCapture']['path']; bc,bebx,bobjs=capture(wbroute)
            owner=bobjs[1]
            assert owner.get('$class')=='Class_35259f6b'
            rate_fields=[]
            for field in ('Field_14c4a054','Field_be31b12d'):
                node=owner['Field_f8822efa']; off,kind=node['$researchLocations'][field]
                raw=struct.unpack_from('<f',bebx.data,off)[0]
                rate_fields.append({'sourceFieldPath':'/Field_f8822efa/'+field,'field':field,
                  'sourceValue':node[field],'rawValue':raw,'byteOffset':off,'bytesHex':bebx.data[off:off+4].hex()})
            base_rate={'siteWeapon':'vssm','sourceWeapon':'VSSM','sourceRootKind':'WB','sourceAsset':wbroute,
              'sourceObjectIndex':1,'sourceObjectClass':owner['$class'],'sourceRawSha256':bc['raw_sha256'],
              'sourceDescriptorSha256':bc['descriptor_sha256'],'fields':rate_fields,
              'comparedToSite':{'baseRpm':next(z['rpm'] for z in json.loads((ROOT/'data/weapons.json').read_text(encoding='utf-8')) if z['id']=='vssm'),
                 'autoRpm':leaf['siteValue']}}
        details.append({'siteFile':leaf['siteFile'],'sitePointer':leaf['pointer'],'siteWeapon':None,'sourceWeapon':None,
          'siteSelection':sid,'siteValue':leaf['siteValue'],'siteConsumer':'sim/applyAttachments.js',
          'leafName':parts[-1],'sourceSelections':linked,
          **({'baseWeaponRateEvidence':base_rate} if base_rate else {}),
          'agreement':'source-effect operands joined; evaluate per leaf in receipt',
          'remainingUncertainty':'Captured GS/WB/WPM links and bytes establish serialized source values only; native activation and exact game formula remain separate questions.'})
    # Persist the actual operand-to-site comparison, not only the graph joins.
    def source_field_rows(node, asset=None, owner_class=None):
        found=[]
        if isinstance(node,dict):
            owner_class=node.get('class',owner_class)
            if isinstance(node.get('fieldPath'),str) and 'value' in node and 'byteOffset' in node:
                found.append({'sourceAsset':asset,'sourceFieldPath':node['fieldPath'],'sourceValue':node['value'],
                              'sourceClass':owner_class,'byteOffset':node['byteOffset'],'bytesHex':node['bytesHex']})
            next_asset=node.get('asset') or node.get('modifierAsset') or node.get('gsSourceAsset') or node.get('wpmAsset') or asset
            for k,v in node.items():
                if isinstance(v,(dict,list)): found.extend(source_field_rows(v,next_asset,owner_class))
        elif isinstance(node,list):
            for v in node: found.extend(source_field_rows(v,asset,owner_class))
        return found
    for row in details:
        site_value=row['siteValue']; compare=[]
        for selection in row['sourceSelections']:
            candidates=source_field_rows(selection)
            # Do not infer semantics from a coincidentally equal number. Only
            # accept field paths whose consumer/meaning has been independently
            # mapped for this site leaf.
            selected=[]; transform=None
            if row['sitePointer'].endswith(('sprintRecoveryTierShift','deployTimeTierShift')):
                selected=[v for v in candidates if v['sourceFieldPath']=='/Field_9540bd8e'
                          and v['sourceValue']==abs(site_value)]
                transform='site shift is the negated source timing operand; sim resolves index as baseIndex - shift'
            elif row['sitePointer'].endswith('/reloadSpeedMult'):
                selected=[v for v in candidates if v['sourceAsset'].endswith('/WME_ReloadSpeedSmall_P05')
                          and v['sourceFieldPath']=='/Field_348b8cd1' and v['sourceValue']==site_value]
                transform='direct WME reload-speed multiplier; independent class/field meaning is recorded in docs/frosty/FIELD_MAP.md for Class_9705264b Field_348b8cd1'
            elif row['sitePointer'].endswith('/visualRecoil'):
                selected=[]
                transform='semantic blocker: Field_c4814c93 has no independently validated visual-recoil meaning'
            elif row['sitePointer']=='/ERGOS/5/noEffect':
                selected=[v for v in candidates if v['sourceAsset'].endswith('/WME_ADSBoltRechamber_P25')
                          and v['sourceFieldPath']=='/Field_68c40b57' and v['sourceValue'] is True]
                transform='site noEffect marker omits exact selected ADS-bolt boolean; possible cadence model gap'
            elif row['leafName'] in ('setsFireModeAuto','setsFireModeBurst'):
                enum=2 if row['leafName']=='setsFireModeAuto' else 3
                selected=[v for v in candidates if v['sourceFieldPath']=='/Field_7313f5d3' and v['sourceValue']==enum]
                transform=f'site true flag is derived from selected fire-mode enum {enum}'
            elif row['sitePointer'].endswith('/recoilDurationAdd') and row['sitePointer']=='/ERGOS/7/recoilDurationAdd':
                selected=[v for v in candidates if v['sourceFieldPath'].endswith('/Field_4692836a') and v['sourceValue']==site_value]
                transform='exact selected GS recoil-duration operand'
            elif row['sitePointer'].startswith('/ERGOS/13/adsSpreadDynOverride/') or row['sitePointer'].startswith('/ERGOS/13/hipSpreadDynOverride/'):
                subpath=row['sitePointer'].split('/ERGOS/13/')[1]
                hip=subpath.startswith('hip'); leaf=subpath.split('/')[-1]
                spread_ids={'inc':'Field_0084b1d1','firingCoef':'Field_2ca8533e','firingExp':'Field_f37351e6',
                            'firingOffset':'Field_1b9eef5d','notFiringOffset':'Field_4d3f0635','idleExp':'Field_0b26c028','idleOffset':'Field_aa558d2b'}
                context='Field_447d6d51' if hip else 'Field_0a160c57'
                selected=[v for v in candidates if f'/{context}/{spread_ids[leaf]}/Field_bbbfe9cc' in v['sourceFieldPath']
                          and v['sourceValue']==site_value]
                transform='exact selected VSSM GS spread-curve field'
            elif row['sitePointer'] in ('/ERGOS/13/recoilDecreaseFactorOverride','/ERGOS/13/recoilDecreaseTimeExponentOverride'):
                field='Field_28df1cde' if row['sitePointer'].endswith('FactorOverride') else 'Field_1d04f0f6'
                selected=[v for v in candidates if v['sourceFieldPath'].endswith('/'+field+'/Field_bbbfe9cc') and v['sourceValue']==site_value]
                transform='exact selected VSSM GS recoil-recovery field'
            elif row['sitePointer'] in ('/ERGOS/13/adsRecoilVariationTierMod','/ERGOS/13/hipRecoilVariationTierMod'):
                selected=[v for v in candidates if v['sourceFieldPath'].endswith('/Field_02433593/Field_4692836a') and v['sourceValue']==site_value]
                transform='exact selected VSSM GS recoil-variation tier field'
            if row['sitePointer']=='/ERGOS/13/autoRpm':
                wb_fields=row['baseWeaponRateEvidence']['fields']
                selected=[{'sourceAsset':row['baseWeaponRateEvidence']['sourceAsset'],'sourceFieldPath':v['sourceFieldPath'],
                           'sourceValue':v['sourceValue'],'byteOffset':v['byteOffset'],'bytesHex':v['bytesHex'],
                           'sourceRawSha256':row['baseWeaponRateEvidence']['sourceRawSha256'],
                           'sourceDescriptorSha256':row['baseWeaponRateEvidence']['sourceDescriptorSha256']}
                          for v in wb_fields if v['sourceFieldPath']=='/Field_f8822efa/Field_14c4a054']
                transform='direct VSSM WB automatic RateOfFire field'
            compare.append({'sourceWeapon':selection['sourceWeapon'],'siteWeapon':selection['siteWeapon'],
                            'result':('match' if selected else 'semantic field mapping unresolved'),
                            'blockingReason':(None if selected else 'selected attachment/selector/source graph and raw objects are identified, but no independently validated owner/class/consumer field path is attached to this site leaf'),
                            'transformation':transform,'sourceFields':selected,
                            **({'candidateEvidence':[v for v in candidates if v['sourceClass']=='Class_bfd4f199'
                                and v['sourceFieldPath'].startswith('/Field_3b707594/') and v['sourceValue']==0.75]}
                               if row['sitePointer'].endswith('/visualRecoil') else {})})
        row['perLeafComparisons']=compare
        row['agreement']=('explicit mapped field comparison recorded per weapon' if all(c['result']=='match' for c in compare)
                          else 'selected graph is captured; source-field semantics or site transform remain unresolved as shown per weapon')
    DETAIL.write_text(''.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n' for x in details),encoding='utf-8')
    by={}
    for x in details:
        sels=x['sourceSelections']; effects=[e for s in sels for w in s['selectorWpm'] for e in w['effects']]
        vals=[v for e in effects for v in e.get('values',[])]+[v for e in effects for o in e.get('sameClassCandidates',[]) for v in o['values']]
        scalar=[v for v in vals if isinstance(v.get('value'),(int,float)) and not isinstance(v.get('value'),bool)]
        matches=[v for v in scalar if v['value']==x['siteValue']]
        by.setdefault(x['siteSelection'],[]).append({'pointer':x['sitePointer'],'sourceChoiceCount':len(sels),'effectCount':len(effects),'exactNumericValueOccurrences':len(matches)})
    compact=[]
    for x in details:
        effects=[e for s in x['sourceSelections'] for w in s['selectorWpm'] for e in w['effects']]
        gs=[g for s in x['sourceSelections'] for w in s['selectorWpm'] for g in w['gsModifierSources']]
        routes=sorted({e['asset'] for e in effects}|{g['modifierAsset'] for g in gs})
        if x['leafName']=='noEffect':
            status=('software-authored omission marker; ADS Bolt has exact selected boolean evidence' if x['sitePointer']=='/ERGOS/5/noEffect' else
                    'software-authored omission marker; selected source effects are captured, but this is not evidence of game no-effect')
            impact=('Marks an unmodeled behavior. ADS Bolt is relevant to sustained sniper cadence because it may add unscope → chamber → ADS return; '
                    'the current Analyzer cadence model omits this sequence. Other noEffect rows have no numeric sim consumer.')
            uncertainty='Exact selected WME/local-object fields are in detail; native activation and the resulting cadence delta are not established here.'
        elif x['sitePointer']=='/ERGOS/13/autoRpm':
            status='source value matches VSSM WB RateOfFire; selected WPM separately writes RateOfFireForSingleFire'
            impact='Changes VSSM auto RPM displayed and used after receiver selection.'
            uncertainty='Site 799.999 matches current WB /Field_f8822efa/Field_14c4a054; selected WPM Class_582cbe36/Field_be31b12d=399.999 matches the base single-fire field hash, not automatic rate. Native WPM application to semiauto/full-auto firing mode remains unproven.'
        elif x['leafName'] in ('setsFireModeAuto','setsFireModeBurst'):
            status=('site mode flag agrees with exact selected-source mode enum/selector path'
                    if all(c['result']=='match' for c in x['perLeafComparisons']) else
                    'site mode boolean is a derived interpretation; selected branch exists but the mapped enum leaf is unresolved')
            impact='Changes displayed fire mode and corresponding RPM or burst presentation.'
            uncertainty='Serialized enum and selected branch agree; runtime activation and selector precedence are not proven.'
        elif x['leafName'] in ('sprintRecoveryTierShift','deployTimeTierShift'):
            status=('site tier shift is the inverse-sign representation of the exact selected Draw timing operand'
                    if all(c['result']=='match' for c in x['perLeafComparisons']) else
                    'selected Draw effect is captured, but no mapped timing operand equals the expected tier value')
            impact='Changes modeled sprint recovery or deployment timing.'
            uncertainty='Site sign conversion matches the paired source operands; native timing formula is not proven.'
        elif x['leafName']=='reloadSpeedMult':
            status=('site multiplier exactly matches selected WME_ReloadSpeedSmall_P05 operand'
                    if all(c['result']=='match' for c in x['perLeafComparisons']) else
                    'selected reload effect is captured, but the mapped source operand does not match the site')
            impact='Changes modeled reload duration through the attachment reload-speed consumer.'
            uncertainty='Serialized operand and site value match; native reload composition is not proven.'
        elif x['leafName'] in ('adsRecoilTierMod','hipRecoilTierMod','adsRecoilVariationTierMod','hipRecoilVariationTierMod','recoilDurationAdd'):
            status=('site recoil operand matches exact selected source field path(s) recorded in detail'
                    if all(c['result']=='match' for c in x['perLeafComparisons']) else
                    'selected recoil source route is verified, but no mapped source operand equals the site leaf; see perLeafComparisons')
            impact='Changes modeled recoil tier, pattern variation, or recoil recovery duration.'
            uncertainty='Per-weapon source fields and bytes are verified; native recoil combination/order remains unproven.'
        elif x['leafName']=='visualRecoil':
            status='site visualRecoil=-1 is an Analyzer-authored tier; selected Buffer WPM contains Field_c4814c93=-1 and a separate 0.75 recoil-vector candidate, but field meaning is unresolved'
            impact='Changes the Analyzer visual-recoil badge; possible source relationship to recoil-vector scaling is proposed, not established.'
            uncertainty='Class_bfd4f199 Field_c4814c93 and the .75 vector are both raw-confirmed, but no independent field registry or native consumer mapping proves their relationship.'
        elif x['sitePointer'].startswith(('/ERGOS/13/adsSpreadDynOverride/','/ERGOS/13/hipSpreadDynOverride/')):
            status=('site spread override scalars match exact selected VSSM GS field paths'
                    if all(c['result']=='match' for c in x['perLeafComparisons']) else
                    'site spread scalar lacks a matching selected VSSM GS field at its mapped curve path')
            impact='Changes modeled ADS or hip spread progression under VSSM full-auto selection.'
            uncertainty='Serialized fields and bytes match; native replacement and spread-composition behavior remain unproven.'
        elif x['leafName'] in ('recoilDecreaseFactorOverride','recoilDecreaseTimeExponentOverride'):
            status='site recoil-recovery override matches exact selected VSSM GRM field path'
            impact='Changes modeled VSSM recoil recovery.'
            uncertainty='Serialized fields and bytes match; native recovery implementation is not proven.'
        else:
            status='source binding and raw operand comparison recorded'
            impact='Feeds sim/applyAttachments.js attachment calculation; field-specific consumer/equation is pinned in detail.'
            uncertainty='Serialized source and bytes are confirmed; native formula/activation are not proven.'
        comparisons=x['perLeafComparisons']
        comparison_summary=[{'sourceWeapon':c['sourceWeapon'],'siteWeapon':c['siteWeapon'],'result':c['result'],
          'transformation':c['transformation'],'sourceFieldPaths':sorted({v['sourceFieldPath'] for v in c['sourceFields']}),
          'sourceFieldCount':len(c['sourceFields'])} for c in comparisons]
        compact.append({'siteFile':x['siteFile'],'sitePointer':x['sitePointer'],'siteSelection':x['siteSelection'],
          'siteValue':x['siteValue'],'sourceChoiceCount':len(x['sourceSelections']),'sourceEffectOrModifierAssets':routes,
          'sourceSiteAgreement':status,'perLeafComparisons':comparison_summary,'siteImpact':impact,'remainingUncertainty':uncertainty})
    output={'sourceBuild':'1.4.3.0, archive Head 4892017','scope':'Current 51 ERGOS leaves in integrated pending inventory; synthetic /ERGOS/0/pts excluded for spotting receipt.',
      'inventorySource':str(PENDING),'inventorySha256':sha(PENDING),'mappingSha256':sha(MAP),'rosterSha256':sha(ROSTER),
      'siteFileSha256':sha(SITE),'simFileSha256':sha(ROOT/'sim/applyAttachments.js'),'scriptSha256':sha(Path(__file__)),
      'decoderSha256':sha(ROOT/'scripts/frosty-ebx-decode.py'),'graphMethod':'frosty-configuration.attachment_graph over cached 1.4.3.0 XML overlay; exact attachment GUID → Ability branch/action selector → WB modifier object/effects and GS binding refs.',
      'ergosGraphIssueCount':len(ergo_issues),'unrelatedGlobalGraphIssueCount':len(issues)-len(ergo_issues),'leafCount':len(details),'detailPath':str(DETAIL),'detailSha256':sha(DETAIL),
      'perLeafSourcePathAndRawBytes':True,'activationLimit':'Graph and byte matches establish current-build serialized source and exact per-weapon binding paths; they do not establish runtime activation or the native consumer formula.',
      'detailSchema':'Each detail row is a site leaf; sourceSelections contains every exact matching current site weapon, source weapon, attachment asset/GUID, selector GUID, WB WPM effects, GS binding paths, effect scalar field paths, object indexes, raw byte offsets/hex, raw SHA and descriptor SHA. Local zero-GUID references are aligned through exact XML GUID and verified class-table order.',
      'rows':compact}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'leafCount':len(details),'detail':str(DETAIL),'detailSha256':sha(DETAIL),'receipt':str(OUT),'rowsBySelection':by},ensure_ascii=False))

if __name__=='__main__': main()
