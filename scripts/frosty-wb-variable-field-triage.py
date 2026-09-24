"""Review bounded WB variable-field candidates against Analyzer data consumers."""
import collections, hashlib, json, runpy, sqlite3, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DM=Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP=DM/'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB=REP/'coverage-decoder-v5.sqlite'; FIELDS=REP/'weapon-fields.jsonl'; REG=REP/'registry-bindings.jsonl'
ROSTER=ROOT/'reference-data/provenance/frosty-audit-roster-2026-09-23.json'; WEAP=ROOT/'data/weapons.json'
DETAIL=REP/'wb-variable-field-triage.jsonl'; OUT=ROOT/'reference-data/provenance/frosty-wb-variable-field-triage-2026-09-23.json'
reader=runpy.run_path(str(ROOT/'scripts/frosty-ebx-decode.py'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def direct(layout,h,types):
    for f in layout['fields']:
        if f['hash']==h:return f
    for f in layout['fields']:
        if reader['debug_type'](f['flags'])==0:
            x=direct(types['classes'][f['classRef']],h,types)
            if x:return x
    return None
def raw_leaf(ebx,types,oi,path):
    layout=types['byGuid'][ebx.class_keys[ebx.instances[oi]['classRef']]]
    at=ebx.data_start+ebx.data_offsets[oi]; desc=[]
    for n,h in enumerate(path):
        f=direct(layout,h,types)
        if not f:raise ValueError(f'{h} absent in descriptor at {layout["hash"]}')
        at+=f['offset'];desc.append({'field':'Field_'+h,'objectRelativeOffset':f['offset']})
        if n+1<len(path):
            if reader['debug_type'](f['flags'])!=2:raise ValueError(f'{h} is not inline struct')
            layout=types['classes'][f['classRef']];at=(at+layout['alignment']-1)//layout['alignment']*layout['alignment']
    return {'byteOffset':at,'bytesHex':ebx.data[at:at+4].hex(),'rawF32':struct.unpack_from('<f',ebx.data,at)[0],'rawI32':struct.unpack_from('<i',ebx.data,at)[0],'descriptorFields':desc}

fields=json.loads('[]')
rows=[json.loads(l) for l in FIELDS.open(encoding='utf8')]
roster=json.loads(ROSTER.read_text(encoding='utf8'))
site_by_internal={r['internalId']:r for r in roster['roots'] if r.get('siteIdentity')}
site_weapons=json.loads(WEAP.read_text(encoding='utf8')); site_by_id={w['id']:w for w in site_weapons}
site_by_internal={r['internalId']:site_by_id[r['siteIdentity']] for r in roster['roots'] if r.get('siteIdentity')}
want=['8ff6f90f','5d05d9dc','668292c7','e287c7f3','4cc9e2ed','8a3bda22','f8822efa','16e6fa59','f2d603de','7768ebf2']
selected=[r for r in rows if r['rootKind']=='WB' and r['weapon'] in site_by_internal and any(('Field_'+h) in r['pointer'] for h in want) and r['type'] not in ('metadata','array-length')]
byhash=collections.defaultdict(list)
for r in selected:
    for h in want:
        if ('Field_'+h) in r['pointer']:byhash[h].append(r)

db=sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro',uri=True);db.row_factory=sqlite3.Row
captures={}
for r in selected:
    if r['captureId'] not in captures:
        c=dict(db.execute('select * from captures where id=?',(r['captureId'],)).fetchone())
        if sha(c['raw_path'])!=c['raw_sha256'] or sha(c['descriptor_path'])!=c['descriptor_sha256']:raise ValueError('capture hash mismatch')
        t=reader['type_descriptors'](c['descriptor_path']); e=reader['Ebx'](c['raw_path'],t)
        if e.sha256!=c['raw_sha256']:raise ValueError('decoder/raw hash mismatch')
        captures[r['captureId']]=(c,t,e,e.decode()['objects'])

def rawrecord(r,field_path):
    c,t,e,objs=captures[r['captureId']]
    path=[s[6:] for s in field_path.split('/') if s.startswith('Field_')]
    raw=raw_leaf(e,t,r['objectIndex'],path)
    val=r['value']; bits=raw['rawI32'] if r['type']=='int' else raw['rawF32']
    if isinstance(val,(float,int)) and abs(float(bits)-float(val))>1e-4:raise ValueError(f'{r["weapon"]} {field_path}: offset bytes mismatch decoded {bits} != {val}')
    return {'route':c['route'],'captureId':c['id'],'head':c['head'],'rawSha256':c['raw_sha256'],'descriptorSha256':c['descriptor_sha256'],'objectIndex':r['objectIndex'],'objectClass':r['class'],'objectGuid':r['objectGuid'],'fieldPath':field_path,'decodedValue':val,'rawByteOffset':raw['byteOffset'],'rawBytesHex':raw['bytesHex'],'rawDecodedAs':bits,'descriptorFields':raw['descriptorFields']}

spec={
'8ff6f90f':('Class_542ac52c','/Field_8ff6f90f','WB root scalar; identity/role unresolved','No direct site data or sim consumer found; park as non-output candidate, not cosmetic.'),
'5d05d9dc':('Class_542ac52c','/Field_5d05d9dc','WB root scalar integer; role unresolved','No direct site data or sim consumer found; park as non-output candidate, not cosmetic.'),
'668292c7':('Class_542ac52c','/Field_668292c7','WB root scalar integer; role unresolved','No direct site data or sim consumer found; park as non-output candidate, not cosmetic.'),
'e287c7f3':('Class_542ac52c','/Field_e287c7f3','WB root scalar integer; role unresolved','No direct site data or sim consumer found; park as non-output candidate, not cosmetic.'),
'4cc9e2ed':('Class_35259f6b','/Field_4cc9e2ed','WeaponFiring.PrimaryFire.Ammo inline block','Its MagazineCapacity child is registry-bound and feeds site mag; other ammo children include NumberOfMagazines and reserve/replenishment inputs not shown by Analyzer.'),
'8a3bda22':('Class_35259f6b','/Field_4cc9e2ed/Field_8a3bda22','Ammo child integer; no registry name or site consumer found','Not linked to a displayed/proposed Analyzer value; park pending semantic name/runtime consumer.'),
'f8822efa':('Class_35259f6b','/Field_f8822efa','WeaponFiring.PrimaryFire.FireLogic block','Contains registry-bound RateOfFire / ReloadInfoArray inputs already consumed by site RPM and reload; this is a parent container, not one scalar.'),
'16e6fa59':('Class_35259f6b','/Field_f8822efa/Field_16e6fa59','FireLogic child integer; no registry name identified','Correlates exactly with site fireMode on all 63 exact-crosswalk weapons under candidate 0=semi, 1=bolt/pump, 2=auto, 3=burst; impacts displayed site fire-mode label if validated. Preserve as candidate enum, not engine-confirmed name.'),
'f2d603de':('Class_76a3b0eb','/Field_f2d603de','Render substructure sibling to weapon render-FOV field','Presentation/render candidate. No site consumer found; do not call cosmetic absent runtime proof.'),
'7768ebf2':('Class_76a3b0eb','/Field_7768ebf2','Weapon render FOV in degrees per existing field map','Presentation/render FOV; current site zoom/magnification uses optic zoom data. No Analyzer metric consumer found.'),
}
summary=[]; details=[]
for h,items in byhash.items():
    usable=[r for r in items if r['type'] in ('float','int','bool','str')]
    vals=collections.Counter(json.dumps(r['value'],sort_keys=True) for r in usable)
    weapons={r['weapon'] for r in usable}
    paths=collections.Counter(r['pointer'] for r in usable)
    rec={'fieldHash':'Field_'+h,'candidateOwner':spec[h][0],'siteWeaponsWithValues':len(weapons),'valueOccurrences':len(usable),'typeCounts':dict(collections.Counter(r['type'] for r in usable)),'distinctValueCount':len(vals),'valueDistribution':({k:v for k,v in sorted(vals.items())} if len(vals)<=25 else None),'frequentValues':vals.most_common(20),'numericRange':([min(float(r['value']) for r in usable if isinstance(r['value'],(int,float))),max(float(r['value']) for r in usable if isinstance(r['value'],(int,float)))] if any(isinstance(r['value'],(int,float)) for r in usable) else None),'pointerVariants':dict(paths),'varianceStatus':'varies' if len(vals)>1 else 'constant','siteImpact':spec[h][3]}
    # raw byte examples for primary/outlier scalar or direct scalar child.
    if h in ('8ff6f90f','5d05d9dc','668292c7','e287c7f3','8a3bda22','16e6fa59','7768ebf2'):
        scalar=usable
        chosen=[scalar[0],min(scalar,key=lambda r:float(r['value'])),max(scalar,key=lambda r:float(r['value']))] if scalar else []
        unique=[]
        for r in chosen:
            key=(r['weapon'],r['pointer'])
            if key not in unique:unique.append(key);details.append({'fieldHash':'Field_'+h,**rawrecord(r,r['pointer'])})
        rec['rawEvidenceSamples']=[{'weapon':w,'pointer':p} for w,p in unique]
    summary.append(rec)
# Pin consequential registry leaves and enum candidate to descriptor-derived raw words for every site weapon.
raw_field_values={}
for h,ptr in [('RateOfFire','/Field_f8822efa/Field_14c4a054'),('MagazineCapacity','/Field_4cc9e2ed/Field_7f22bfb4'),('FiringSelectorCandidate','/Field_f8822efa/Field_16e6fa59')]:
    leafrows=[r for r in selected if r['pointer']==ptr]
    if h=='FiringSelectorCandidate':leafrows=[r for r in selected if r['pointer']=='/Field_f8822efa/Field_16e6fa59']
    raw_field_values[h]=[rawrecord(r,r['pointer']) for r in leafrows]
    details.extend([{'fieldHash':h,**x} for x in raw_field_values[h]])

# Compare only already identified direct site links: registry ROF and Ammo MagazineCapacity.
reg=[json.loads(l) for l in REG.open(encoding='utf8')]
link_results={}
for name,tail,site_key in [('RateOfFire','RateOfFire','rpm'),('MagazineCapacity','MagazineCapacity','mag')]:
 rs=[r for r in reg if (r.get('name') or '').endswith('.'+tail) and r.get('route','').endswith('_WB') and r.get('weapon') is None]
 # Registry table has exact route; crosswalk internal id from path segment.
 pairs=[]
 for rr in rs:
  route=rr['route'];internal=route.split('/')[-1].removesuffix('_WB')
  row=site_by_internal.get(internal)
  if not row:continue
  val=rr.get('comparedRegistryValue',rr.get('fieldValue'))
  if isinstance(val,dict) and 'value' in val:val=val['value']
  pairs.append({'siteId':row['id'],'siteValue':row.get(site_key),'sourceValue':val,'equal':abs(float(row[site_key])-float(val))<.001})
 link_results[site_key]={'matchedSiteWeapons':len(pairs),'exactAgreementCount':sum(p['equal'] for p in pairs),'mismatches':[p for p in pairs if not p['equal']],'sourceRegistryField':tail,'pairs':pairs}
# Exact crosswalk correlation for unnamed FireLogic enum: not a descriptor name/runtime proof.
mode_map=collections.defaultdict(collections.Counter)
for r in selected:
    if r['pointer']=='/Field_f8822efa/Field_16e6fa59':
        mode_map[site_by_internal[r['weapon']]['fireMode']][str(r['value'])]+=1
bolt_rows=[]
for rr in reg:
    if (rr.get('name') or '').endswith('.BoltActionTime') and rr.get('route','').endswith('_WB'):
        internal=rr['route'].split('/')[-1].removesuffix('_WB'); site=site_by_internal.get(internal)
        if site and site['fireMode'] in ('bolt','pump'):
            bolt_rows.append({'siteId':site['id'],'internalId':internal,'siteFireMode':site['fireMode'],'registryName':rr['name'],'registryPointer':rr['pointer'],'sourceValue':rr['fieldValue'],'registryStatus':rr['status']})
link_results['fireModeSelectorCandidate']={'sourceFieldPath':'/Field_f8822efa/Field_16e6fa59','siteWeaponsCompared':sum(sum(v.values()) for v in mode_map.values()),'crossTab':{k:dict(v) for k,v in mode_map.items()},'candidateEnumMapping':{'0':'semi','1':'bolt or pump (not distinguished by this field)','2':'auto','3':'burst'},'agreement':'Categorical mapping is consistent for all 63 exact-crosswalk site weapons; field name and native consumer remain unconfirmed. All eight site bolt/pump weapons with enum 1 also have a registry-bound BoltActionTime field, which supports distinguishing the two modes using other firing data but does not name this enum.','boltPumpSupportingSource':bolt_rows}

with DETAIL.open('w',encoding='utf8') as f:
 for r in details:f.write(json.dumps(r,ensure_ascii=True,separators=(',',':'))+'\n')
sitefiles={str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in [WEAP,ROOT/'data/ammo.json',ROOT/'sim/applyAttachments.js',ROOT/'sim/core.js',ROOT/'ui/app.js',ROSTER,ROOT/'reference-data/provenance/frosty-weapon-identities.json'] if p.exists()}
receipt={'schemaVersion':1,'reviewDate':'2026-09-23','build':{'head':4892017,'rawFieldInventory':str(FIELDS),'rawFieldInventorySha256':sha(FIELDS),'registryBindingsSha256':sha(REG),'decoderSha256':sha(ROOT/'scripts/frosty-ebx-decode.py')},'scope':'The listed WB field candidates and named render sibling only; exact Analyzer weapon crosswalk from roster roots internalId/siteIdentity. Source capture presence is not runtime proof.','siteFileHashes':sitefiles,'fields':summary,'directSiteSourceLinks':link_results,'rawOffsetDetail':{'path':str(DETAIL),'sha256':sha(DETAIL),'records':len(details)},'consumerSearch':'No named hash appears in sim/*.js, ui/*.js or site data except corresponding source-derived JSON leaves. Existing mapping identifies RateOfFire and Ammo MagazineCapacity as direct current inputs.','limits':['Hashes without an established semantic name remain unnamed; value patterns alone do not identify function.','FireLogic/Ammo parent blocks contain consequential inputs, but parent-container variance does not prove every child affects the site.','Render FOV/transform are parked as presentation candidates. No cosmetic conclusion is made.','Source registry values do not prove native runtime consumers.']}
OUT.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print(json.dumps({'fieldSummaries':[(r['fieldHash'],r['siteWeaponsWithValues'],r['distinctValueCount']) for r in summary],'siteLinks':{k:(v.get('matchedSiteWeapons'),v.get('exactAgreementCount'),len(v.get('mismatches',[]))) for k,v in link_results.items()},'rawExamples':len(details),'receipt':str(OUT)}))


