import json, hashlib, importlib.util, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DM=Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\reports\exhaustive-audit-2026-09-23')
BUILD=DM.parents[1]
decoder_path=ROOT/'scripts/frosty-ebx-decode.py'
decoder_spec=importlib.util.spec_from_file_location('frosty_ebx_decode',decoder_path)
decoder=importlib.util.module_from_spec(decoder_spec)
decoder_spec.loader.exec_module(decoder)
descriptors=decoder.type_descriptors(BUILD/'capture/toolchain/SharedTypeDescriptors.ebx')
weapons={w['id']:w for w in json.loads((ROOT/'data/weapons.json').read_text())}
roster=json.loads((ROOT/'reference-data/provenance/frosty-audit-roster-2026-09-23.json').read_text())
identities={r['internalId']:r for r in roster['roots']}
timing=json.loads((ROOT/'reference-data/provenance/frosty-research-inventory-2026-09-23.json').read_text())['timing']
timing_by_id={x['path'].split('/')[-2].upper():x for x in timing}
# Extract flattened timing scalar entries. Values are joined by stable internal ID and exact pointer.
fields={}
second_blocks={}
capture_refs={}
for line in (DM/'weapon-fields.jsonl').open(encoding='utf-8'):
 r=json.loads(line)
 if r.get('rootKind')!='WB': continue
 if r.get('weapon') not in identities: continue
 if r.get('type')=='reference-or-marker' or (r.get('class')=='Class_897c99a7' and r.get('pointer','').startswith(('/Field_819acc98/','/Field_9690d604/'))):
  capture_refs.setdefault((r['weapon'],r.get('captureId')),[]).append({k:r.get(k) for k in ('pointer','type','value','objectIndex','class','captureId')})
 if r.get('class')=='Class_582cbe36' and r.get('pointer','').startswith('/'):
  second_blocks.setdefault(r['weapon'],[]).append({k:r.get(k) for k in ('pointer','type','value','objectIndex','objectAbsoluteOffset','class','captureId')})
 m=r.get('pointer','')
 if not m.startswith('/Field_f8822efa/Field_d15a0c1c/') and not m.startswith('/Field_f8822efa/Field_440ed7fa'): continue
 fields.setdefault(r['weapon'],[]).append({k:r.get(k) for k in ('pointer','type','value','objectIndex','objectAbsoluteOffset','captureId')})
rof={}
rates={}
mechanics={}
for line in (DM/'registry-bindings.jsonl').open(encoding='utf-8'):
 r=json.loads(line)
 nm=r.get('name') or ''
 wid=nm.split('.')[0].removesuffix('_WB')
 if wid not in identities: continue
 if '.WeaponFiring.PrimaryFire.FireLogic.RateOfFire' in nm:
  rates.setdefault(wid,{})[nm.split('.')[-1]]=r
  if 'For' not in nm.split('.')[-1]: rof[wid]=r
 if '.WeaponFiring.PrimaryFire.FireLogic.BoltAction.' in nm: mechanics.setdefault(wid,[]).append(r)

def raw_f32hex(raw, offset):
 return raw[offset:offset+4].hex() if offset is not None and offset >= 0 and offset+4 <= len(raw) else None
def byte_hits(raw,v):
 try: return raw.count(struct.pack('<f',float(v)))
 except (TypeError,ValueError,OverflowError): return None
def align(value, alignment): return (value+alignment-1)&~(alignment-1)
def descriptor_field(cls, field_hash):
 return next(f for f in cls['fields'] if f['hash']==field_hash)
def raw_timing_offsets(raw_path, object_index):
 ebx=decoder.Ebx(raw_path,descriptors)
 root_cls=ebx.class_by_key(ebx.class_keys[ebx.instances[object_index]['classRef']])
 root_base=ebx.data_start+ebx.data_offsets[object_index]
 fire_desc=descriptor_field(root_cls,'f8822efa')
 fire_cls=ebx.class_by_index(fire_desc['classRef'])
 fire_base=align(root_base+fire_desc['offset'],fire_cls['alignment'])
 offsets={}
 for field_hash in ('14c4a054','5bd8006c','be31b12d','440ed7fa'):
  try:
   d=descriptor_field(fire_cls,field_hash); offsets[field_hash]=fire_base+d['offset']
  except StopIteration: pass
 bolt_desc=descriptor_field(fire_cls,'eebe0fd8')
 bolt_cls=ebx.class_by_index(bolt_desc['classRef'])
 bolt_base=align(fire_base+bolt_desc['offset'],bolt_cls['alignment'])
 offsets['bolt']={}
 for h in ('caf2ace0','1c57216a','a1abbce8','2084d4bf','21f2d4ee','19b2eed9'):
  try: offsets['bolt'][h]=bolt_base+descriptor_field(bolt_cls,h)['offset']
  except StopIteration: pass
 array_desc=descriptor_field(fire_cls,'d15a0c1c')
 array_ptr=fire_base+array_desc['offset']
 rel=struct.unpack_from('<i',ebx.data,array_ptr)[0]
 resolved=(array_ptr-ebx.data_start+rel)&0xffffffff
 entry=next(a for a in ebx.arrays if a['offset']==resolved)
 element_cls=ebx.class_by_index(array_desc['classRef'])
 first=align(ebx.data_start+entry['offset'],element_cls['alignment'])
 offsets['reloadEntries']=[]
 for idx in range(entry['count']):
  base=first+idx*element_cls['size']
  offsets['reloadEntries'].append({h:base+descriptor_field(element_cls,h)['offset'] for h in ('9c1e1476','c0c7c72f','b480c17a','85ff24a0','fc66e75e')})
 return offsets
def raw_block_fields(raw_path, object_index, field_hashes):
 ebx=decoder.Ebx(raw_path,descriptors)
 cls=ebx.class_by_key(ebx.class_keys[ebx.instances[object_index]['classRef']])
 base=ebx.data_start+ebx.data_offsets[object_index]
 return {h:base+descriptor_field(cls,h)['offset'] for h in field_hashes if any(f['hash']==h for f in cls['fields'])}
rows=[]
for internal, rr in identities.items():
 sid=rr.get('siteIdentity')
 if not sid or sid not in weapons: continue
 w=weapons[sid]; t=timing_by_id.get(internal.upper())
 es=fields.get(internal,[])
 # group array fields by element index; preserve all paths
 entries={}
 for e in es:
  p=e['pointer'];
  if '/Field_d15a0c1c/' in p:
   tail=p.split('/Field_d15a0c1c/',1)[1].split('/')
   if tail[0].isdigit(): entries.setdefault(int(tail[0]),[]).append(e)
 duration=next((e for e in es if e['pointer'].endswith('/Field_440ed7fa')),None)
 raw=Path(t['rawFile']).read_bytes() if t and Path(t['rawFile']).exists() else b''
 object_index=next((e['objectIndex'] for e in es if e.get('objectIndex') is not None),None)
 offsets=raw_timing_offsets(t['rawFile'],object_index) if t and object_index is not None else {}
 parsed=[]
 for idx,vals in sorted(entries.items()):
  d={e['pointer'].rsplit('/',1)[-1]:e['value'] for e in vals}
  parsed.append({'index':idx,'fieldPath':f"/Field_f8822efa/Field_d15a0c1c/{idx}",'values':d,
   'rawFieldOffsets':offsets.get('reloadEntries',[])[idx] if idx<len(offsets.get('reloadEntries',[])) else {},
   'rawFloat32Hex':{k:raw_f32hex(raw,offsets['reloadEntries'][idx][k.removeprefix('Field_')]) for k,v in d.items() if isinstance(v,(int,float)) and idx<len(offsets.get('reloadEntries',[])) and k.removeprefix('Field_') in offsets['reloadEntries'][idx]},
   'rawOffsetValues':{k:struct.unpack_from('<f',raw,offsets['reloadEntries'][idx][k.removeprefix('Field_')])[0] for k in d if isinstance(d[k],(int,float)) and idx<len(offsets.get('reloadEntries',[])) and k.removeprefix('Field_') in offsets['reloadEntries'][idx]},
   'rawBodyByteOccurrences':{k:byte_hits(raw,v) for k,v in d.items() if isinstance(v,(int,float))}})
 rb=rof.get(internal)
 single= rates.get(internal,{}).get('RateOfFireForSingleFire')
 siteRpm=float(w['rpm']); sourceRpm=rb.get('fieldValue') if rb else None
 # Candidate tactical = positive ReloadTimeBulletsLeft; candidate empty = positive ReloadTime.
 tac_candidates=[float(e['values']['Field_fc66e75e']) for e in parsed if float(e['values'].get('Field_fc66e75e',0) or 0)>0]
 empty_candidates=[float(e['values']['Field_85ff24a0']) for e in parsed if float(e['values'].get('Field_85ff24a0',0) or 0)>0]
 def match(v, cands): return (min(cands,key=lambda x:abs(x-v)) if cands else None)
 tac_match=match(float(w['tacRld']),tac_candidates) if w.get('tacRld') is not None else None
 empty_match=match(float(w['emptyRld']),empty_candidates) if w.get('emptyRld') is not None else None
 tac_sums=[]; empty_sums=[]
 for e in parsed:
  d=e['values']; delay=float(d.get('Field_c0c7c72f',0) or 0); post=float(d.get('Field_b480c17a',0) or 0)
  if isinstance(d.get('Field_fc66e75e'),(int,float)): tac_sums.append((float(d['Field_fc66e75e'])+delay+post,e['index'],float(d['Field_fc66e75e']),delay,post))
  if isinstance(d.get('Field_85ff24a0'),(int,float)): empty_sums.append((float(d['Field_85ff24a0'])+delay+post,e['index'],float(d['Field_85ff24a0']),delay,post))
 best_tac_sum=match(float(w['tacRld']),[v[0] for v in tac_sums]) if w.get('tacRld') is not None else None
 best_tac_record=min((v for v in tac_sums if v[0]==best_tac_sum),key=lambda v:abs(float(w['tacRld'])-v[0])) if best_tac_sum is not None else None
 best_empty_sum=match(float(w['emptyRld']),[v[0] for v in empty_sums]) if w.get('emptyRld') is not None else None
 best_empty_record=min((v for v in empty_sums if v[0]==best_empty_sum),key=lambda v:abs(float(w['emptyRld'])-v[0])) if best_empty_sum is not None else None
 boltvals={b.get('name','').split('.')[-1]:b.get('fieldValue') for b in mechanics.get(internal,[])}
 if sid in {'interdictor','l115','m2010esr','psr','miniscout','sv98','m87a1'} and sourceRpm and boltvals.get('BoltActionTime',0)>0 and boltvals.get('BoltActionSpeed',0)>0:
  cycle=boltvals['BoltActionTime']/boltvals['BoltActionSpeed']+boltvals.get('BoltActionDelay',0)+60/sourceRpm
  cadence={'formula':'60 / (BoltActionTime / BoltActionSpeed + BoltActionDelay + 60 / RateOfFire)','cycleSeconds':cycle,'effectiveRpm':60/cycle,'siteDifference':siteRpm-60/cycle,'matchesWithin0.01':abs(siteRpm-60/cycle)<=.01}
 else: cadence=None
 if internal in {'DesertTechHTI','L115A3','M2010ESR','MRAD','MiniFix','SV98M'} and t:
  sb=second_blocks.get(internal,[]); sb_ix=next((z['objectIndex'] for z in sb if z.get('objectIndex') is not None),None)
  sb_offsets=raw_block_fields(t['rawFile'],sb_ix,['14c4a054','5bd8006c','be31b12d','caf2ace0','19b2eed9','a1abbce8','1c57216a','2084d4bf','21f2d4ee']) if sb_ix is not None else {}
  sec_fields=[z for z in sb if z.get('pointer','').lstrip('/').split('/')[0] in {'Field_14c4a054','Field_5bd8006c','Field_be31b12d','Field_caf2ace0','Field_19b2eed9','Field_a1abbce8','Field_1c57216a','Field_2084d4bf','Field_21f2d4ee'}]
  second={'class':'Class_582cbe36','objectIndex':sb_ix,'objectAbsoluteOffset':next((z['objectAbsoluteOffset'] for z in sb if z.get('objectAbsoluteOffset') is not None),None),'fields':[]}
  for z in sec_fields:
   h=z['pointer'].split('/')[-1].removeprefix('Field_'); off=sb_offsets.get(h); val=z.get('value')
   second['fields'].append({'fieldPath':z['pointer'],'decodedValue':val,'rawOffset':off,'rawHex':raw[off:off+4].hex() if off is not None else None,'rawOffsetValue':struct.unpack_from('<f',raw,off)[0] if off is not None and z.get('type')=='float' else None})
  sb_capture=next((z.get('captureId') for z in sb if z.get('captureId') is not None),None)
  refrows=capture_refs.get((internal,sb_capture),[])
  parent_ref=next((z for z in refrows if z.get('class')=='Class_897c99a7' and z.get('pointer','').startswith('/Field_9690d604/') and isinstance(z.get('value'),dict) and z['value'].get('$ref')==sb_ix),None)
  parent_ix=parent_ref.get('objectIndex') if parent_ref else None
  selector=next((z for z in refrows if z.get('class')=='Class_897c99a7' and z.get('objectIndex')==parent_ix and z.get('pointer','').startswith('/Field_819acc98/')),None)
  container_ref=next((z for z in refrows if z.get('pointer','').startswith('/Field_0cd9f20f/') and isinstance(z.get('value'),dict) and z['value'].get('$ref')==parent_ix),None)
  second['ownerPathTrace']={'class582ObjectIndex':sb_ix,'class582PathWithinClass897':parent_ref.get('pointer') if parent_ref else None,'class897ObjectIndex':parent_ix,'selectorFieldPathWithinClass897':selector.get('pointer') if selector else None,'selectorGuid':selector.get('value') if selector else None,'ownerClass':'Class_542ac52c' if container_ref else None,'ownerObjectIndex':container_ref.get('objectIndex') if container_ref else None,'ownerArrayPointer':container_ref.get('pointer') if container_ref else None,'referenceChainVerified':bool(parent_ref and selector and container_ref)}
 else: second=None
 rows.append({'siteId':sid,'siteName':w['name'],'internalId':internal,'sourcePath':t['path'] if t else None,'rawFile':t['rawFile'] if t else None,'sourceFileGuid':t['fileGuid'] if t else None,'rawSha256':t['sha256'] if t else None,
 'site':{'rpm':w.get('rpm'),'tacRld':w.get('tacRld'),'emptyRld':w.get('emptyRld')},
  'source':{'reloadInfoArrayFieldPath':'/Field_f8822efa/Field_d15a0c1c','entries':parsed,
   'frameFieldPath':'/Field_f8822efa/Field_440ed7fa','frameDuration':duration.get('value') if duration else None,'frameRawOffset':offsets.get('440ed7fa'),'frameRawValue':struct.unpack_from('<f',raw,offsets['440ed7fa'])[0] if '440ed7fa' in offsets else None,
   'rateOfFire':{'registryName':rb.get('name'),'fieldPath':(rb.get('pointer','')+'/'+rb.get('field','')),'field':rb.get('field'),'value':sourceRpm,'status':rb.get('status'),'rawOffset':offsets.get('14c4a054'),'rawOffsetValue':struct.unpack_from('<f',raw,offsets['14c4a054'])[0] if '14c4a054' in offsets else None,'rawFloat32Hex':raw_f32hex(raw,offsets.get('14c4a054')),'rawBodyByteOccurrences':byte_hits(raw,sourceRpm)} if rb else None,
   'rateOfFireForSingleFire':{'registryName':single.get('name'),'fieldPath':(single.get('pointer','')+'/'+single.get('field','')),'field':single.get('field'),'value':single.get('fieldValue'),'rawOffset':offsets.get('be31b12d'),'rawOffsetValue':struct.unpack_from('<f',raw,offsets['be31b12d'])[0] if 'be31b12d' in offsets else None,'rawFloat32Hex':raw_f32hex(raw,offsets.get('be31b12d')),'rawBodyByteOccurrences':byte_hits(raw,single.get('fieldValue'))} if single else None,
   'boltAction':[{
    'fieldName':b.get('name'),'fieldPath':(b.get('pointer','')+'/'+b.get('field','')),'field':b.get('field'),'value':b.get('fieldValue'),'registryValue':b.get('registryValue'),
    'rawOffset':offsets.get('bolt',{}).get((b.get('field') or '').removeprefix('Field_')),'rawOffsetValue':struct.unpack_from('<f',raw,offsets['bolt'][(b.get('field') or '').removeprefix('Field_')])[0] if (b.get('field') or '').removeprefix('Field_') in offsets.get('bolt',{}) else None,'rawFloat32Hex':raw_f32hex(raw,offsets.get('bolt',{}).get((b.get('field') or '').removeprefix('Field_'))) if isinstance(b.get('fieldValue'),(int,float)) else None,'rawBodyByteOccurrences':byte_hits(raw,b.get('fieldValue')) if isinstance(b.get('fieldValue'),(int,float)) else None,'registryStatus':b.get('status')} for b in mechanics.get(internal,[]) ]},
   'secondTimingBlock':second,'cadencePrediction':cadence,
   'comparison':{'rpmSourceValue':sourceRpm,'rpmDeltaSiteMinusSource':siteRpm-sourceRpm if sourceRpm is not None else None,'rpmMatchesWithin0.01':abs(siteRpm-sourceRpm)<=.01 if sourceRpm is not None else None,
   'siteTacReload':w.get('tacRld'),'closestSourceReloadTimeBulletsLeft':tac_match,'tacDifference':float(w['tacRld'])-tac_match if tac_match is not None else None,
   'siteEmptyReload':w.get('emptyRld'),'closestSourceReloadTime':empty_match,'emptyDifference':float(w['emptyRld'])-empty_match if empty_match is not None else None,
   'closestReloadTimeBulletsLeftPlusDelays':best_tac_record,'tacCompositionDifference':float(w['tacRld'])-best_tac_record[0] if best_tac_record else None,
   'closestReloadTimePlusDelays':best_empty_record,'emptyCompositionDifference':float(w['emptyRld'])-best_empty_record[0] if best_empty_record else None},
  'rawHashVerified':bool(t and hashlib.sha256(raw).hexdigest()==t['sha256']),
  'limits':['Decoder marks weapon behavior object layout warning; decoded semantic field path is provisional. Raw float bytes are searched in the hashed raw body, not independently offset-bound for this row. Source fields do not prove runtime reload composition or MP application.']})

ksg=next(x for x in roster['roots'] if x['internalId']=='KSG')
# KSG is retained as a source reference with no site data row.
ksg_path=Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\capture\weapon-audit-2026-09-23\raw\Common\Hardware\Weapons\shotgun\ksg\KSG_WB.ebx')
ksg_raw=ksg_path.read_bytes()
ksg_object_index=next((e['objectIndex'] for e in fields.get('KSG',[]) if e.get('objectIndex') is not None),0)
ksg_offsets=raw_timing_offsets(ksg_path,ksg_object_index)
ksg_entries={}
for e in fields.get('KSG',[]):
 p=e['pointer']
 if '/Field_d15a0c1c/' in p:
  tail=p.split('/Field_d15a0c1c/',1)[1].split('/')
  if tail[0].isdigit(): ksg_entries.setdefault(int(tail[0]),[]).append(e)
ksg_decoded=[]
for idx,vals in sorted(ksg_entries.items()):
 d={e['pointer'].rsplit('/',1)[-1]:e['value'] for e in vals}
 ksg_entry_offsets=ksg_offsets.get('reloadEntries',[])[idx] if idx<len(ksg_offsets.get('reloadEntries',[])) else {}
 ksg_decoded.append({'index':idx,'fieldPath':f'/Field_f8822efa/Field_d15a0c1c/{idx}','values':d,'rawFieldOffsets':ksg_entry_offsets,'rawFloat32Hex':{k:raw_f32hex(ksg_raw,ksg_entry_offsets[k.removeprefix('Field_')]) for k,v in d.items() if isinstance(v,(int,float)) and k.removeprefix('Field_') in ksg_entry_offsets},'rawBodyByteOccurrences':{k:byte_hits(ksg_raw,v) for k,v in d.items() if isinstance(v,(int,float))}})
kb=rof.get('KSG')
out={'schemaVersion':1,'date':'2026-09-23','status':'source-to-site comparison; reload semantics unresolved','build':{'id':'1.4.3.0','archiveHead':4892017,'descriptorSha256':'91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2'},
 'method':'Exact site/internal weapon crosswalk from frosty-audit-roster-2026-09-23.json; site inputs from data/weapons.json; decoded WB fields from weapon-fields.jsonl and timing inventory raw hashes; RateOfFire from equal-scalar registry-binding rows. Float32 byte occurrences are corroborating raw-body byte checks paired with decoded paths, not semantic proof or offsets.',
 'fields':{'rpm':'WB WeaponFiring.PrimaryFire.FireLogic.RateOfFire via GRX registry binding','reload':'WB /Field_f8822efa/Field_d15a0c1c[]: Field_fc66e75e=ReloadTimeBulletsLeft, Field_85ff24a0=ReloadTime, Field_9c1e1476=ReloadThreshold, Field_c0c7c72f=ReloadDelay, Field_b480c17a=PostReloadDelay','frame':'WB /Field_f8822efa/Field_440ed7fa; unnamed frame duration','boltAction':'WB /Field_f8822efa/Field_eebe0fd8; named members resolved by equal-scalar GRX registry bindings'},
 'summary':{'siteWeaponCount':len(rows),'rpmMissing':sum(x['comparison']['rpmMatchesWithin0.01'] is None for x in rows),'rpmMismatch':sum(x['comparison']['rpmMatchesWithin0.01'] is False for x in rows),'tacClosestExact':sum(x['comparison']['tacDifference']==0 for x in rows),'emptyClosestExact':sum(x['comparison']['emptyDifference']==0 for x in rows)},
 'rows':rows,
 'ksgReference':{'internalId':'KSG','siteIdentity':None,'sourcePath':ksg['roots']['WB']['rawCapture']['path'],'rawFile':str(ksg_path),'rawSha256':ksg['roots']['WB']['rawCapture']['rawSha256'],'rawHashVerified':hashlib.sha256(ksg_raw).hexdigest()==ksg['roots']['WB']['rawCapture']['rawSha256'],'reloadInfoArray':ksg_decoded,'rateOfFire':{'name':kb.get('name'),'fieldPath':kb.get('pointer','')+'/'+kb.get('field',''),'value':kb.get('fieldValue'),'rawOffset':ksg_offsets.get('14c4a054'),'rawFloat32Hex':raw_f32hex(ksg_raw,ksg_offsets.get('14c4a054')),'rawBodyByteOccurrences':byte_hits(ksg_raw,kb.get('fieldValue'))} if kb else None,'comparison':'Reference only; no site row or site timing values.'},
 'proposals':['Keep RateOfFire as the site RPM input where the source value agrees; do not infer RPM from Field_440ed7fa.','For rows where site reload differs only by display rounding, preserve the exact source value for review before proposing a data correction.','Do not add ReloadDelay or PostReloadDelay to the current tactical/empty display until the native consumer or controlled timing distinguishes animation start, ammo commit, reload completion, and next-shot gate.'],'runtimeBlocker':{'unresolved':'Serialized reload arrays and rate fields do not reveal the runtime selection/composition order or MP activation.','gameplayPrediction':'A controlled measurement should timestamp reload start, ammo commit, animation end, and next permitted shot, with tactical, empty, and shell-by-shell reloads. If array ReloadDelay/PostReloadDelay compose with base times, one or more measured phase intervals will shift by those per-weapon values; if fields are thresholds/alternate selector metadata, displayed total times can remain at the selected ReloadTime/ReloadTimeBulletsLeft. Repeat each condition and compare with a frame-level tolerance.'}}
(DM/'site-timing-detail-2026-09-23-owner-selector.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out['summary']))
for x in rows:
 c=x['comparison']
 if c['rpmMatchesWithin0.01'] is False or (c['tacDifference'] is not None and abs(c['tacDifference'])>.05) or (c['emptyDifference'] is not None and abs(c['emptyDifference'])>.05):
  print(x['siteId'],c)





