"""Create exact source records for site projectile, damage and velocity leaves."""
import hashlib, json, runpy, sqlite3, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DM=Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP=DM/'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB=REP/'coverage-decoder-v5.sqlite'
OUT=REP/'projectile-site-input-leaves.jsonl'
RECEIPT=ROOT/'reference-data/provenance/frosty-site-input-leaves-2026-09-23.json'
BALL=ROOT/'data/ballistics.json'; WEAP=ROOT/'data/weapons.json'; AMMO=ROOT/'data/ammo.json'
ROSTER=ROOT/'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
TRACE=ROOT/'reference-data/provenance/frosty-hit-zones-2026-09-15.json'
SHOTGUN=ROOT/'reference-data/provenance/frosty-shotgun-ammo.json'
reader=runpy.run_path(str(ROOT/'scripts/frosty-ebx-decode.py'))
ball=json.loads(BALL.read_text(encoding='utf-8')); weapons=json.loads(WEAP.read_text(encoding='utf-8'))
ammo=json.loads(AMMO.read_text(encoding='utf-8'))['WEAPON_AMMO']; roster=json.loads(ROSTER.read_text(encoding='utf-8'))
trace=json.loads(TRACE.read_text(encoding='utf-8')); shotgun=json.loads(SHOTGUN.read_text(encoding='utf-8'))
cross={r['siteIdentity']:r for r in roster['roots'] if r.get('siteIdentity')}

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def f32(data,offset): return struct.unpack_from('<f',data,offset)[0]
def align(n,a): return (n+a-1)//a*a if a else n
def ptrseg(s): return str(s).replace('~','~0').replace('/','~1')
def direct(layout,h,types):
    for f in layout['fields']:
        if f['hash']==h:return f
    for f in layout['fields']:
        if reader['debug_type'](f['flags'])==0:
            q=direct(types['classes'][f['classRef']],h,types)
            if q:return q
    return None

db=sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro',uri=True); db.row_factory=sqlite3.Row
cache={}; types_cache={}
def capture(route,rawsha=None):
    sql='select * from captures where route=? collate nocase'; args=[route]
    if rawsha:sql+=' and raw_sha256=?';args.append(rawsha)
    rows=db.execute(sql,args).fetchall()
    if len(rows)!=1:return None
    r=dict(rows[0])
    if sha(r['raw_path'])!=r['raw_sha256']:raise ValueError(f"{route}: raw hash mismatch")
    return r
def decoded(route):
    if route not in cache:
        c=capture(route)
        if not c:raise ValueError(f'{route}: capture unavailable')
        if c['descriptor_path'] not in types_cache:
            types_cache[c['descriptor_path']]=reader['type_descriptors'](c['descriptor_path'])
        t=types_cache[c['descriptor_path']]
        if t['sha256']!=c['descriptor_sha256']:raise ValueError(f'{route}: descriptor hash mismatch')
        e=reader['Ebx'](c['raw_path'],t)
        cache[route]=(c,e,t,e.decode()['objects'])
    return cache[route]
def obj_layout(e,t,i):return t['byGuid'][e.class_keys[e.instances[i]['classRef']]]
def raw_leaf(e,t,i,path):
    layout=obj_layout(e,t,i); at=e.data_start+e.data_offsets[i]; desc=[]
    for n,h in enumerate(path):
        f=direct(layout,h,t)
        if not f:raise ValueError(f'missing descriptor leaf {h}')
        at+=f['offset'];desc.append({'field':'Field_'+h,'objectRelativeOffset':f['offset']})
        if n+1<len(path):
            if reader['debug_type'](f['flags'])!=2:raise ValueError(f'{h} is not an inline struct')
            layout=t['classes'][f['classRef']];at=align(at,layout['alignment'])
    return {'byteOffset':at,'bytesHex':e.data[at:at+4].hex(),'rawValue':f32(e.data,at),'descriptorFields':desc}
def array_words(e,t,i,field_hash,element_field=None):
    layout=obj_layout(e,t,i); f=direct(layout,field_hash,t); at=e.data_start+e.data_offsets[i]+f['offset']
    rel=struct.unpack_from('<i',e.data,at)[0]; resolved=(at-e.data_start+rel)&0xffffffff
    ent=next((a for a in e.arrays if a['offset']==resolved),None)
    if not ent and field_hash=='edfc6df6': return [], {'arrayPointerByteOffset':at,'arrayDataByteOffset':None,'arrayCount':0,'arrayHash':None}
    if not ent: raise ValueError(f'array {field_hash}: no exact EBXX row')
    start=e.data_start+ent['offset']; words=[]
    if element_field is None:
        for x in range(ent['count']):
            pos=start+4*x;words.append({'arrayIndex':x,'byteOffset':pos,'bytesHex':e.data[pos:pos+4].hex(),'rawValue':f32(e.data,pos),
                'sourceFieldPath':f'objects[{i}].Field_{field_hash}[{x}]'})
    else:
        cls=t['classes'][f['classRef']]; ef=direct(cls,element_field,t); row_size=align(cls['size'],cls['alignment']);start=align(start,cls['alignment'])
        for x in range(ent['count']):
            pos=start+x*row_size+ef['offset'];words.append({'arrayIndex':x,'byteOffset':pos,'bytesHex':e.data[pos:pos+4].hex(),'rawValue':f32(e.data,pos),
                'sourceFieldPath':f'objects[{i}].Field_{field_hash}[{x}].Field_{element_field}'})
    return words,{'arrayPointerByteOffset':at,'arrayDataByteOffset':start,'arrayCount':ent['count'],'arrayHash':ent['hash']}

def pd_source(route):
    if route in cache.setdefault('_pd',{}):return cache['_pd'][route]
    c,e,t,objects=decoded(route); model=ball['projectiles'][route]
    bodies=[(i,o) for i,o in enumerate(objects) if str(o.get('$guid','')).lower()==model['guid'].lower()]
    if len(bodies)!=1:raise ValueError(f'{route}: exact projectile GUID not unique')
    bi,body=bodies[0]; pi=body['Field_6008eb31']['$ref']; fi=body['Field_2ad7e688']['$ref']
    px=objects[pi]; fx=objects[fi]
    health_xr,health_xmeta=array_words(e,t,pi,'edfc6df6','3901db14'); health_yr,health_ymeta=array_words(e,t,pi,'edfc6df6','42fc0f5e')
    xr,xmeta=array_words(e,t,fi,'edfc6df6','3901db14'); yr,ymeta=array_words(e,t,fi,'edfc6df6','42fc0f5e')
    flat,fmeta=array_words(e,t,fi,'5279388d')
    x=raw_leaf(e,t,bi,['30c37c24']); g=raw_leaf(e,t,bi,['d9d33d20'])
    result={'route':route,'capture':c,'ebx':e,'types':t,'objects':objects,'bodyIndex':bi,'body':body,
        'pointIndex':pi,'pointObject':px,'flatIndex':fi,'flatObject':fx,'rangeWords':xr,'damageWords':yr,'flatWords':flat,
        'rangeMeta':xmeta,'damageMeta':ymeta,'flatMeta':fmeta,'healthRangeWords':health_xr,'healthDamageWords':health_yr,'healthRangeMeta':health_xmeta,'healthDamageMeta':health_ymeta,'drag':x,'gravity':g}
    cache['_pd'][route]=result
    return result

records=[]
counts={'bulletVelLeaves':0,'baseDamageLeaves':0,'ammoDamageLeaves':0,'dragLeaves':0,'gravityLeaves':0,'pelletLeaves':0,
        'ammoSelectorRows':0,'exactWbBaseGuidRefs':0,'uniqueAmmoAttachments':0,'currentAmmoAttachmentCaptures':0}
velocity_mismatches=[]; base_ref_misses=[]
def source(raw,field_path,value,expected,uncertainty,extra=None):
    c=raw['capture']; row={'sourceAsset':c['route'],'sourceRawSha256':c['raw_sha256'],'sourceHead':c['head'],
        'sourceFieldPath':field_path,'sourceValue':value,'rawWords':raw.get('rawWords',[]),
        'expectedSiteValue':expected,'sourceSiteAgreement':raw.get('agreement',False),'remainingUncertainty':uncertainty}
    if raw.get('sourceObjectGuid'):row['sourceObjectGuid']=raw['sourceObjectGuid']
    if extra:row.update(extra)
    return row
def emit(site_file,pointer,wid,value,kind,sources,**metadata):
    records.append({'siteFile':site_file,'sitePointer':pointer,'siteWeapon':wid,'siteValue':value,'valueKind':kind,'sourceRecords':sources,**metadata})

# Exact base Shot.InitialSpeed.z at the field path already bound to the GRX registry name.
registry={}
for line in (REP/'registry-bindings.jsonl').read_text(encoding='utf-8').splitlines():
    r=json.loads(line)
    if (r.get('name') or '').endswith('InitialSpeed.z'):registry[r['route'].lower()]=r

for wi,w in enumerate(weapons):
    wid=w['id']; root=cross[wid]; wb_meta=root['roots']['WB']['rawCapture']; c=capture(wb_meta['path'],wb_meta['rawSha256'])
    if not c:raise ValueError(f'{wid}: WB raw hash not matched to exact roster entry')
    wc,ebx,types,objects=decoded(c['route']); reg=registry.get(c['route'].lower())
    if not reg:raise ValueError(f'{wid}: no registry binding for InitialSpeed.z')
    v=raw_leaf(ebx,types,reg['objectIndex'],['58d70acb','0bf4f62b','32a99b9c'])
    site=w['bulletVel']; agreement=abs(float(site)-v['rawValue'])<=.001
    if not agreement:velocity_mismatches.append(wid)
    emit('data/weapons.json',f'/{wi}/bulletVel',wid,site,'m/s',[
        source({'capture':c,'rawWords':[{'byteOffset':v['byteOffset'],'bytesHex':v['bytesHex'],'rawValue':v['rawValue']},],
                'agreement':agreement,'sourceObjectGuid':objects[reg['objectIndex']].get('$guid')},
            f"objects[{reg['objectIndex']}].Field_58d70acb.Field_0bf4f62b.Field_32a99b9c",v['rawValue'],site,
            'Base WeaponFiring.PrimaryFire.Shot.InitialSpeed.z. Barrel or other progression velocity modifiers and effective runtime selection are not inferred from this base value.',
            {'registryName':reg['name'],'registryStatus':reg['status'],'descriptorFields':v['descriptorFields']})],
        siteDamageSource=w.get('damageSource'),siteDamageStatus=w.get('damageStatus'),
        metadataLimit='Damage provenance/status strings are software-authored labels, not Frosty fields.')
    counts['bulletVelLeaves']+=1

    trw=trace['weapons'][wid]; route=ball['weapons'][wid]['base']; trace_guid=trw['baseProjectile']['guid'].lower()
    if trace_guid!=ball['projectiles'][route]['guid'].lower():raise ValueError(f'{wid}: trace and ballistics base projectile GUID mismatch')
    refs=[dict(r) for r in db.execute('select object_index,pointer,kind,target,target_object_guid from refs where capture_id=? and lower(target_object_guid)=?',(c['id'],trace_guid))]
    if len(refs)!=1:
        base_ref_misses.append({'siteWeapon':wid,'refCount':len(refs),'expectedGuid':trace_guid})
    else:
        counts['exactWbBaseGuidRefs']+=1; ref=refs[0]
        emit('data/ballistics.json',f'/weapons/{wid}/base',wid,route,'PD asset key',[
            {'sourceAsset':c['route'],'sourceRawSha256':c['raw_sha256'],'sourceHead':c['head'],
             'sourceObjectGuid':objects[ref['object_index']].get('$guid'),'sourceFieldPath':f"objects[{ref['object_index']}]{ref['pointer']}",
             'sourceValue':ref['target_object_guid'],'rawWords':[], 'expectedSiteValue':route,'sourceSiteAgreement':True,
             'sourceFileGuid':ref['target'],'referenceKind':ref['kind'],'tracePath':f'{TRACE}#/weapons/{wid}/baseProjectile',
             'remainingUncertainty':'Raw WB import GUID equals hit-zone trace and current site PD GUID. This does not prove the native runtime selects it.'}],
             sourceTraceSha256=sha(TRACE),selectedProjectileGuid=trace_guid)

    pd=pd_source(route)
    curve=[[p.get('r'),p.get('d')] for p in w.get('dmg',[])]
    site_label={'damageSource':w.get('damageSource'),'damageStatus':w.get('damageStatus')}
    usedx=set(); usedflat=set()
    for ci,pair in enumerate(curve):
        sr,sd=pair
        # Keep range and damage associated with the same ordered raw point.
        candidates=[j for j,(x,y) in enumerate(zip(pd['rangeWords'],pd['damageWords'])) if abs(float(x['rawValue'])-float(sr))<=.0001]
        exact=[j for j in candidates if abs(float(pd['damageWords'][j]['rawValue'])-float(sd))<=.0001 and j not in usedx]
        idx=exact[0] if exact else next((j for j in candidates if j not in usedx),None)
        if idx is not None:usedx.add(idx)
        flatpairs=[[pd['flatWords'][j]['rawValue'],pd['flatWords'][j+1]['rawValue']] for j in range(0,len(pd['flatWords'])-1,2)]
        fexact=[j for j,q in enumerate(flatpairs) if abs(q[0]-float(sr))<=.0001 and abs(q[1]-float(sd))<=.0001 and j not in usedflat]
        fi=fexact[0] if fexact else None
        clamped_prefix=(ci==0 and float(sr)==0 and bool(flatpairs) and float(flatpairs[0][0])>0 and abs(float(flatpairs[0][1])-float(sd))<=.0001)
        if fi is None and clamped_prefix:fi=0
        elif fi is not None:usedflat.add(fi)
        for axis,expected in [('r',sr),('d',sd)]:
            src=[]
            if idx is not None:
                word=(pd['rangeWords'] if axis=='r' else pd['damageWords'])[idx]
                src.append(source({'capture':pd['capture'],'rawWords':[{'byteOffset':word['byteOffset'],'bytesHex':word['bytesHex'],'rawValue':word['rawValue']}],
                    'agreement':abs(float(word['rawValue'])-float(expected))<=.0001,'sourceObjectGuid':pd['flatObject'].get('$guid')},word['sourceFieldPath'],word['rawValue'],expected,
                    'Point-array source presence does not prove native consumer choice.',{'sourceRepresentation':'point array','pairIndex':idx}))
            else:
                src.append({'sourceAsset':pd['route'],'sourceRawSha256':pd['capture']['raw_sha256'],'sourceHead':pd['capture']['head'],
                    'sourceFieldPath':f"objects[{pd['flatIndex']}].Field_edfc6df6",
                    'sourceValue':[],'rawWords':[],'expectedSiteValue':expected,'sourceSiteAgreement':None,
                    'remainingUncertainty':'TweakableDamageCurve same-object Field_edfc6df6 point array is empty; this representation is non-comparable, not a damage mismatch.'})
            if fi is not None:
                word=pd['flatWords'][fi*2+(axis=='d')]
                src.append(source({'capture':pd['capture'],'rawWords':[{'byteOffset':word['byteOffset'],'bytesHex':word['bytesHex'],'rawValue':word['rawValue']}],
                    'agreement':abs(float(word['rawValue'])-float(expected))<=.0001,'sourceObjectGuid':pd['flatObject'].get('$guid')},word['sourceFieldPath'],word['rawValue'],expected,
                    ('Site range 0 is a software-authored prefix at the source first range; sim/damage.js clamps pre-first-breakpoint damage to the first curve value.' if clamped_prefix and axis=='r' else 'Flat-array source presence does not prove native consumer choice.'),{'sourceRepresentation':'flat array','pairIndex':fi}))
            else:
                src.append({'sourceAsset':pd['route'],'sourceRawSha256':pd['capture']['raw_sha256'],'sourceHead':pd['capture']['head'],
                    'sourceFieldPath':f"objects[{pd['flatIndex']}].Field_5279388d[{fi if fi is not None else 'missing'}]",
                    'sourceValue':None,'rawWords':[],'expectedSiteValue':expected,'sourceSiteAgreement':False,
                    'remainingUncertainty':'No exact TweakableDamageCurve flat pair matches this site point. If this is a zero-range prefix, the Analyzer clamps values before the first source breakpoint to the first source value; otherwise preserve as a transformed/unresolved point.'})
            transform='source-first-point-clamp' if clamped_prefix else ('direct-raw-value' if any(s.get('sourceSiteAgreement') is True for s in src) else 'no-matching-raw-value')
            if wid=='m45a1' and sr==75 and sd==14.3:
                transform='known-observed-step-transform'
                src.append({'sourceReceipt':'frosty-damage-curve-review-2026-09-13.json','sourceFieldPath':'75m step retained from dated gameplay test',
                    'sourceValue':'Damage marker 14 and 7 shots below 75m; marker 12 and 8 shots beyond','rawWords':[],
                    'expectedSiteValue':expected,'sourceSiteAgreement':'intentional site transformation',
                    'remainingUncertainty':'Prior tested build; revalidate the same step on Head4892017.'})
            emit('data/weapons.json',f'/{wi}/dmg/{ci}/{axis}',wid,expected,'damage curve leaf',src,
                selectedBasePDRoute=route,comparisonTransform=transform,**site_label,
                authoredMetadataLimit='damageSource/damageStatus are software-authored provenance labels, not Frosty scalar fields.')
            counts['baseDamageLeaves']+=1



# PD projectile scalar leaves, and exact data-to-trace selector inventory.
for wid, selector in ball['weapons'].items():
    wi=next(i for i,w in enumerate(weapons) if w['id']==wid)
    pd_routes={'base':selector['base'], **{f'ammo/{a}':r for a,r in selector['ammo'].items()}}
    for route_role, route in pd_routes.items():
        pd=pd_source(route); obj=pd['body']; bi=pd['bodyIndex']; c=pd['capture']
        for field,site_key,site_value in [('30c37c24','dragPerMeter',ball['projectiles'][route]['dragPerMeter']),('d9d33d20','gravityMps2',ball['projectiles'][route]['gravityMps2'])]:
            raw=pd['drag'] if field=='30c37c24' else pd['gravity']
            emit('data/ballistics.json',f'/projectiles/{ptrseg(route)}/{site_key}',wid,site_value,'projectile scalar',[
                source({'capture':c,'rawWords':[{'byteOffset':raw['byteOffset'],'bytesHex':raw['bytesHex'],'rawValue':raw['rawValue']}],
                    'agreement':abs(float(site_value)-raw['rawValue'])<=1e-6,'sourceObjectGuid':obj.get('$guid')},
                    f'objects[{bi}].Field_{field}',raw['rawValue'],site_value,
                    'Exact projectile GUID and PD scalar match. Does not establish runtime consumer selection or modifier effects.',
                    {'descriptorFields':raw['descriptorFields'],'siteDataPointer':f'/projectiles/{ptrseg(route)}/{site_key}'})],
                projectileRoute=route,routeRole=route_role)
            counts['dragLeaves' if field=='30c37c24' else 'gravityLeaves']+=1
        if route_role.startswith('ammo/'):
            aid=route_role.split('/',1)[1]
            tw=trace['weapons'][wid]['ammo'][aid]
            expected_guid=ball['projectiles'][route]['guid'].lower()
            if ((tw.get('projectileSwap') or {}).get('guid') or trace['weapons'][wid]['baseProjectile']['guid']).lower()!=expected_guid:
                raise ValueError(f'{wid}/{aid}: trace-selected projectile GUID disagrees with site route')
            # Search the exact v5 attachment XML capture and preserve its captured raw references.
            xmls=tw.get('attachmentXml') or []
            xmlcaps=[capture(x[:-4] if x.lower().endswith('.xml') else x) for x in xmls]
            xmlcap=next((x for x in xmlcaps if x),None)
            selector_source={'sourceAsset':xmlcap['route'] if xmlcap else xmls,'sourceRawSha256':xmlcap['raw_sha256'] if xmlcap else None,
                'sourceHead':xmlcap['head'] if xmlcap else None,'sourceFieldPath':','.join(xmls),
                'sourceValue':expected_guid,'rawWords':[],'expectedSiteValue':route,'sourceSiteAgreement':True,
                'remainingUncertainty':'This is the dated site-side attachment trace plus exact selected PD GUID; attachment capture does not prove native activation.','traceEntry':tw,'allAttachmentRoutes':xmls,'capturedAttachmentRoutes':[x['route'] for x in xmlcaps if x]}
            emit('data/ballistics.json',f'/weapons/{wid}/ammo/{aid}',wid,route,'ammo projectile selector',[selector_source],
                 selectedProjectileGuid=expected_guid,sourceTrace=TRACE.name,sourceTraceSha256=sha(TRACE),attachmentCaptureAvailable=bool(xmlcap))
            counts['ammoSelectorRows']+=1; counts['currentAmmoAttachmentCaptures']+=sum(x is not None for x in xmlcaps)


# Exact projectiles object GUID leaves and source metadata/hash leaves.
xml_root=DM/'builds/1.4.3.0/xml'
for route,model in ball['projectiles'].items():
    pd=pd_source(route); bi=pd['bodyIndex']; ebx=pd['ebx']; body=pd['body']; c=pd['capture']
    target=str(model['guid']).lower()
    if str(body.get('$guid','')).lower()!=target: raise ValueError(f'{route}: PD header GUID != ballistics guid')
    abs_at=ebx.data_start+ebx.data_offsets[bi]-16
    header=ebx.data[abs_at:abs_at+16]
    actual_guid=reader['_guid'](header).lower()
    if actual_guid!=target: raise ValueError(f'{route}: object-header GUID bytes mismatch')
    emit('data/ballistics.json',f'/projectiles/{ptrseg(route)}/guid','shared',model['guid'],'projectile GUID',[{
        'sourceAsset':c['route'],'sourceRawSha256':c['raw_sha256'],'sourceHead':c['head'],'sourceDescriptorSha256':c['descriptor_sha256'],
        'sourceObjectGuid':actual_guid,'sourceFieldPath':f'objects[{bi}].$guid (export instance header)','sourceValue':actual_guid,
        'rawWords':[{'byteOffset':abs_at,'bytesHex':header.hex(),'rawValue':actual_guid}],
        'expectedSiteValue':model['guid'],'sourceSiteAgreement':actual_guid==target,
        'remainingUncertainty':'Unique PD object GUID is directly read from its exported EBX instance header and matches the site route. Reference presence does not establish runtime use.',
        'objectIndex':bi,'objectClass':body.get('$class')}],projectileRoute=route,sourceCaptureId=c['id'])

    xml_route=route if route.lower().endswith('.xml') else route+'.xml'
    rel=Path(xml_route)
    candidates=[xml_root/rel,*(xml_root/sub/rel for sub in ('xml-added','xml-changed','xml-overlay','xml-rawdiff-extra'))]
    xml_path=next((q for q in candidates if q.is_file()),None)
    expected_hash=ball['source']['projectileSha256'].get(xml_route)
    if not xml_path or not expected_hash: raise ValueError(f'{route}: source XML/hash path unavailable')
    actual_hash=sha(xml_path)
    if actual_hash!=expected_hash: raise ValueError(f'{route}: current XML hash mismatch expected {expected_hash}, got {actual_hash}')
    emit('data/ballistics.json',f'/source/projectileSha256/{ptrseg(xml_route)}','metadata',expected_hash,'source XML hash',[{
        'sourceAsset':str(xml_path),'sourceRawSha256':actual_hash,'sourceHead':4892017,'sourceFieldPath':'XML file bytes SHA-256',
        'sourceValue':actual_hash,'rawWords':[],'expectedSiteValue':expected_hash,'sourceSiteAgreement':True,
        'remainingUncertainty':'Software-authored hash leaf verified against the current extracted 1.4.3.0 XML file; not a Frosty gameplay field.'}],
        xmlRoute=xml_route)

trace_sha=sha(TRACE)
if ball['source']['attachmentTraceSha256']!=trace_sha: raise ValueError('attachmentTraceSha256 does not match current trace file')
metadata=[
 ('/schemaVersion',ball['schemaVersion'],'site schema metadata','JSON format version; no Frosty field expected.'),
 ('/source/build',ball['source']['build'],'source build label','Matches the checked 1.4.3.0 source archive/Head selection; software-authored metadata.'),
 ('/source/generatedBy',ball['source']['generatedBy'],'generator label','Names local generator script; software-authored metadata.'),
 ('/source/attachmentTrace',ball['source']['attachmentTrace'],'trace file label','Names the reviewed site-side weapon attachment trace.'),
 ('/source/attachmentTraceSha256',ball['source']['attachmentTraceSha256'],'trace hash','Verified SHA-256 of the exact local attachment trace.')]
for pointer,value,label,limit in metadata:
    src={'sourceAsset':str(TRACE) if 'attachmentTrace' in pointer else str(ROOT/'scripts/frosty-ballistics.py') if 'generatedBy' in pointer else 'site-authored JSON metadata',
        'sourceRawSha256':trace_sha if 'attachmentTrace' in pointer else sha(ROOT/'scripts/frosty-ballistics.py') if 'generatedBy' in pointer and (ROOT/'scripts/frosty-ballistics.py').exists() else None,
        'sourceHead':4892017 if pointer.endswith('/build') else None,'sourceFieldPath':pointer,'sourceValue':value,'rawWords':[],
        'expectedSiteValue':value,'sourceSiteAgreement':True,'remainingUncertainty':limit}
    emit('data/ballistics.json',pointer,'metadata',value,'software metadata',[src])

# Ammo overrides (currently four site shotguns) use the exact trace-selected PD route.
shotgun_by_site={r['siteId']:r for r in shotgun['rows']}
for wi,w in enumerate(weapons):
    wid=w['id']; overrides=ammo.get(wid,{}).get('projectileOverrides',{})
    for aid,over in overrides.items():
        route=ball['weapons'][wid]['ammo'][aid]; pd=pd_source(route)
        for ci,pair in enumerate(over.get('dmg',[])):
            for axis,site_value in [('r',pair['r']),('d',pair['d'])]:
                j=ci*2+(axis=='d'); word=pd['flatWords'][j] if j<len(pd['flatWords']) else None
                src=[]
                if word:
                    src.append(source({'capture':pd['capture'],'rawWords':[{'byteOffset':word['byteOffset'],'bytesHex':word['bytesHex'],'rawValue':word['rawValue']}],
                        'agreement':abs(float(word['rawValue'])-float(site_value))<=.0001,'sourceObjectGuid':pd['flatObject'].get('$guid')},word['sourceFieldPath'],word['rawValue'],site_value,
                        'Exact route-selected TweakableDamageCurve flat array; native attachment activation is unverified.',{'pairIndex':ci,'sourceRepresentation':'TweakableDamageCurve flat'}))
                else:
                    src.append({'sourceAsset':route,'sourceRawSha256':pd['capture']['raw_sha256'],'sourceHead':pd['capture']['head'],'sourceFieldPath':f"objects[{pd['flatIndex']}].Field_5279388d[{j}]",'sourceValue':None,'rawWords':[],'expectedSiteValue':site_value,'sourceSiteAgreement':False,'remainingUncertainty':'No corresponding flat array word at this index.'})
                emit('data/ammo.json',f'/WEAPON_AMMO/{wid}/projectileOverrides/{aid}/dmg/{ci}/{axis}',wid,site_value,'ammo damage curve leaf',src,selectedAmmoProjectileRoute=route)
                counts['ammoDamageLeaves']+=1
        pellet=over.get('pellets')
        if pellet is not None:
            old=next((r for r in shotgun['rows'] if r['siteId']==wid and ((aid=='buckshot_00' and 'No00Buckshot' in r['attachmentXml']) or (aid=='slugs' and 'Slugs' in r['attachmentXml']))), shotgun_by_site.get(wid,{}))
            candidates=[e for e in old.get('effects',[]) if e.get('type')=='Class_ef0525cd' and e.get('rawScalars',{}).get('Field_db0fcea2')]
            if len(candidates)!=1: raise ValueError(f'{wid}/{aid}: expected unique pellet WPM modifier, found {len(candidates)}')
            effect=candidates[0]; mod_route=effect['sourceXml'][:-4] if effect['sourceXml'].lower().endswith('.xml') else effect['sourceXml']
            mc,me,mt,mobjects=decoded(mod_route)
            matches=[(i,o) for i,o in enumerate(mobjects) if str(o.get('$guid','')).lower()==effect['guid'].lower()]
            if len(matches)!=1: raise ValueError(f'{wid}/{aid}: WPM GUID not unique in exact captured modifier asset')
            mi,mobj=matches[0]; pellet_raw=raw_leaf(me,mt,mi,['db0fcea2']); raw_int=struct.unpack_from('<I',me.data,pellet_raw['byteOffset'])[0]
            if raw_int!=pellet: raise ValueError(f'{wid}/{aid}: WPM Field_db0fcea2 raw {raw_int} != site pellet {pellet}')
            emit('data/ammo.json',f'/WEAPON_AMMO/{wid}/projectileOverrides/{aid}/pellets',wid,pellet,'pellet count',[{
                'sourceAsset':mc['route'],'sourceRawSha256':mc['raw_sha256'],'sourceHead':mc['head'],'sourceObjectGuid':mobj.get('$guid'),
                'sourceFieldPath':f'objects[{mi}].Field_db0fcea2','sourceValue':raw_int,
                'rawWords':[{'byteOffset':pellet_raw['byteOffset'],'bytesHex':pellet_raw['bytesHex'],'rawValue':raw_int}],
                'expectedSiteValue':pellet,'sourceSiteAgreement':raw_int==pellet,
                'remainingUncertainty':'Exact cached WPM modifier scalar and raw bytes verified. Attachment-to-WPM trace is source graph evidence, not native activation proof.',
                'modifierType':effect['type'],'modifierGuid':effect['guid'],'descriptorFields':pellet_raw['descriptorFields'],'attachmentRoute':old.get('attachmentXml')}],
                selectedAmmoProjectileRoute=route,exactRawLeafBlocked=False)
            counts['pelletLeaves']+=1

# One inventory row per actual projectile scalar pointer; retain all weapon/ammo usages.
projectile_scalars={}; other_records=[]
for row in records:
    if row['siteFile']=='data/ballistics.json' and row['valueKind']=='projectile scalar':
        key=(row['siteFile'],row['sitePointer'])
        if key not in projectile_scalars:
            base=dict(row);base['siteWeapon']='shared';base['siteWeapons']=[];base['sourceUsageContributions']=[];projectile_scalars[key]=base
        base=projectile_scalars[key]
        if row['siteWeapon'] not in base['siteWeapons']:base['siteWeapons'].append(row['siteWeapon'])
        base['sourceUsageContributions'].append({'siteWeapon':row['siteWeapon'],'routeRole':row['routeRole'],'projectileRoute':row['projectileRoute']})
    else:other_records.append(row)
for row in projectile_scalars.values():
    row['usageContributionCount']=len(row['sourceUsageContributions'])
    row['siteWeapons'].sort()
records=other_records+list(projectile_scalars.values())
counts['dragLeaves']=sum(1 for r in projectile_scalars.values() if r['sitePointer'].endswith('/dragPerMeter'))
counts['gravityLeaves']=sum(1 for r in projectile_scalars.values() if r['sitePointer'].endswith('/gravityMps2'))
counts['dragUsageContributions']=sum(1 for r in records if r.get('valueKind')=='projectile scalar' and r['sitePointer'].endswith('/dragPerMeter') for _ in r['sourceUsageContributions'])
counts['gravityUsageContributions']=sum(1 for r in records if r.get('valueKind')=='projectile scalar' and r['sitePointer'].endswith('/gravityMps2') for _ in r['sourceUsageContributions'])
counts['projectileGuidLeaves']=sum(1 for r in records if r.get('valueKind')=='projectile GUID')
counts['projectileXmlHashLeaves']=sum(1 for r in records if r.get('valueKind')=='source XML hash')
counts['ballisticsMetadataLeaves']=sum(1 for r in records if r.get('valueKind')=='software metadata')+counts['projectileXmlHashLeaves']
ball_rows=[r for r in records if r['siteFile']=='data/ballistics.json']
counts['ballisticsActualInputPointers']=len({r['sitePointer'] for r in ball_rows})
counts['ballisticsActualLeafBreakdown']={'weaponProjectileSelectors':sum(1 for r in ball_rows if r['valueKind']=='PD asset key'),'ammoProjectileSelectors':sum(1 for r in ball_rows if r['valueKind']=='ammo projectile selector'),'projectileScalars':sum(1 for r in ball_rows if r['valueKind']=='projectile scalar'),'projectileGuids':counts['projectileGuidLeaves'],'projectileXmlHashes':counts['projectileXmlHashLeaves'],'topLevelMetadata':sum(1 for r in ball_rows if r['valueKind']=='software metadata')}
assert counts['ballisticsActualInputPointers']==652, counts['ballisticsActualLeafBreakdown']
# Persist full detail outside repo; compact receipt pins generated data and source materials.
records.sort(key=lambda x:(x['siteFile'],x['sitePointer'],x['siteWeapon']))
with OUT.open('w',encoding='utf-8') as fp:
    for row in records: fp.write(json.dumps(row,ensure_ascii=True,separators=(',',':'))+'\n')
site_hashes={str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in (BALL,WEAP,AMMO,TRACE,ROSTER)}
counts['uniqueAmmoAttachments']=len({r['sourceRecords'][0].get('sourceAsset') for r in records if r['valueKind']=='ammo projectile selector' and r['sourceRecords'][0].get('sourceAsset')})
receipt={'schemaVersion':1,'build':{'head':4892017,'decoderScriptSha256':sha(ROOT/'scripts/frosty-ebx-decode.py'),'fieldWalkerSha256':sha(ROOT/'scripts/frosty-audit-fields.py')},
 'siteFiles':site_hashes,'recordCount':len(records),'counts':counts,'exactWbBaseProjectileGuidRefs':counts['exactWbBaseGuidRefs'],'baseProjectileGuidRefMisses':base_ref_misses,
 'bulletVelocityMismatches':velocity_mismatches,'all328AmmoAttachmentXmlCaptures':counts['currentAmmoAttachmentCaptures'],
 'detail':{'path':str(OUT),'sha256':sha(OUT)},
 'limits':['Site routes and captured references are source evidence, not proof of runtime consumption.','Projectile drag and gravity leaves are exact PD body fields.','Damage curves distinguish health-curve asset from selected TweakableDamageCurve; selected object point and flat arrays are separate fields and runtime use is unresolved.','Ammo selector trace identifies exact PD GUID. Attachment capture hashes are included where available; native activation remains unverified.','damageSource and damageStatus are software-authored labels, not Frosty fields.']}
RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'records':len(records),'counts':counts,'velocityMismatches':velocity_mismatches,'baseRefMisses':base_ref_misses,'detailSha256':sha(OUT),'receipt':str(RECEIPT)}))
db.close()




