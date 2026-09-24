"""Audit named recoil fields against every site weapon with exact raw offsets."""
import argparse
from collections import Counter, defaultdict
import hashlib, json, runpy, sqlite3, struct
from pathlib import Path

HASH_NAMES = {
'Field_74b1aad2':'IdleSpringConstant','Field_abf3655a':'IdleSpringConstantSwitchTime','Field_eff75a4b':'IdleSpringConstantZoomed','Field_43b22d90':'IdleSpringConstantZoomedSwitchTime',
'Field_c7ccd1a7':'IdleSpringDamping','Field_2b61552e':'IdleSpringDampingSwitchTime','Field_bbd799e1':'IdleSpringDampingZoomed','Field_131218dc':'IdleSpringDampingZoomedSwitchTime',
'Field_f260924b':'IdleSpringExponent','Field_c2d55f05':'IdleSpringExponentSwitchTime','Field_99f2d08c':'IdleSpringExponentZoomed','Field_def6553a':'IdleSpringExponentZoomedSwitchTime',
'Field_01e71818':'SpringConstant','Field_cea8c368':'SpringConstantZoomed','Field_bfc65eb8':'SpringDamping','Field_3d7a9f12':'SpringDampingZoomed','Field_67cfff28':'SpringExponent','Field_469a2fb5':'SpringExponentZoomed','Field_560bbb82':'SpringMinThresholdAngle','Field_57f8e02b':'UseTimeSinceLastShot',
'Field_2859e2fd':'FirstShotMultiplierVerticalRecoil','Field_834a710f':'HorizontalRecoilDecreaseMultiplier','Field_1e41c505':'RecoilFadeOutEnd','Field_27f30454':'RecoilFadeOutFactor','Field_89e9f16e':'RecoilFadeOutStart','Field_ddac0349':'RecoilPatternMultiplierPitch','Field_b468bc2c':'RecoilPatternMultiplierYaw','Field_0fc53def':'RecoilPatternSeed','Field_9b46e71d':'ShootingRecoilDecreaseScale','Field_54ba3947':'VerticalRecoilDecreaseMultiplier',
'Field_9045ba17':'RecoilDecreaseExponent','Field_28df1cde':'RecoilDecreaseFactor','Field_39740463':'RecoilDecreaseNorm','Field_04490b34':'RecoilDecreaseOffset','Field_1d04f0f6':'RecoilDecreaseTimeExponent','Field_edbd0711':'HorizontalRecoilLeft','Field_65700a5d':'HorizontalRecoilRight','Field_205e8a1c':'MaxVerticalRecoil','Field_9546447c':'VerticalRecoilIncrease','Field_a63f14a6':'VerticalRecoilMax','Field_ce4b3347':'VerticalRecoilMin',
'Field_22810b21':'RecoilAmount','Field_50b8fd5b':'RecoilAmountMultiplier','Field_22ce7cf3':'RecoilAmountMultiplierExponent','Field_f888cb38':'RecoilDirection','Field_865174fa':'RecoilDirectionVariation','Field_7404fa33':'RecoilDirectionVariationMultiplier','Field_02433593':'RecoilDirectionVariationMultiplierExponent','Field_5a02dd65':'RecoilDuration'}

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def locate(ebx, cls, start, parts, reader):
    candidates=[]
    for f in cls['fields']:
        kind=reader['debug_type'](f['flags'])
        if kind==reader['INHERITED']:
            try: candidates.append(locate(ebx,ebx.class_by_index(f['classRef']),start,parts,reader))
            except KeyError: pass
        elif 'Field_'+f['hash']==parts[0]:
            off=start+f['offset']
            if len(parts)==1: candidates.append((off,kind))
            else:
                assert kind==reader['STRUCT'] and reader['debug_category'](f['flags'])!=reader['CATEGORY_ARRAY']
                candidates.append(locate(ebx,ebx.class_by_index(f['classRef']),off,parts[1:],reader))
    if not candidates: raise KeyError(parts)
    assert len(candidates)==1,candidates
    return candidates[0]
def recoil_remaining(r, factor, exponent, time_exp, offset, seconds):
    dt=.001; elapsed=0.0
    while elapsed < seconds-1e-12 and r:
        step=min(dt,seconds-elapsed)
        weight=factor*((elapsed+step)**(time_exp+1)-elapsed**(time_exp+1))/(time_exp+1)
        mag=abs(r)
        nxt=(mag+offset)*__import__('math').exp(-weight)-offset if exponent==1 else mag-(mag**exponent+offset)*weight
        r=(1 if r>0 else -1)*max(0,nxt); elapsed+=step
    return r
def mulberry32(seed):
    s=seed & 0xffffffff
    while True:
        s=(s+0x6D2B79F5)&0xffffffff; t=s
        t=((t^(t>>15))*(1|t))&0xffffffff
        t=((t+(((t^(t>>7))*(61|t))&0xffffffff))^t)&0xffffffff
        yield ((t^(t>>14))&0xffffffff)/4294967296
def whash(s):
    h=0
    for c in s: h=(31*h+ord(c))&0xffffffff
    return h
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report-dir',type=Path,required=True); ap.add_argument('--out',type=Path,required=True); ap.add_argument('--details',type=Path,required=True)
    a=ap.parse_args()
    if a.out.exists() or a.details.exists(): ap.error('Use new output paths.')
    repo=Path(__file__).resolve().parents[1]
    reader=runpy.run_path(str(repo/'scripts/frosty-ebx-decode.py'))
    roster=json.loads((repo/'reference-data/provenance/frosty-audit-roster-2026-09-23.json').read_text())['roots']
    site={w['id']:w for w in json.loads((repo/'data/weapons.json').read_text())}
    inventory=a.report_dir/'weapon-fields.jsonl'; fieldrows=defaultdict(list)
    roster_by_capture={}
    for r in roster: roster_by_capture[r['roots']['GS']['rawCapture']['path']]=r
    db=sqlite3.connect(f'{(a.report_dir / "coverage-decoder-v5.sqlite").resolve().as_uri()}?mode=ro',uri=True); db.row_factory=sqlite3.Row
    capture_ids={}
    for route,root in roster_by_capture.items():
        sr=root['roots']['GS']['rawCapture']; c=db.execute('select id from captures where route=? collate nocase and raw_sha256=?',(route,sr['rawSha256'])).fetchone()
        if not c: raise KeyError(route)
        capture_ids[c['id']]=root
    selected=set(HASH_NAMES)
    for line in inventory.open(encoding='utf-8'):
        x=json.loads(line)
        if x.get('captureId') in capture_ids and x.get('rootKind')=='GS' and x.get('pointer','').split('/')[-1] in selected:
            fieldrows[x['captureId']].append(x)
    descriptor_cache={}; assets=[]; details=[]
    for cid,root in capture_ids.items():
        sr=root['roots']['GS']['rawCapture']; cap=db.execute('select * from captures where id=?',(cid,)).fetchone(); cap=dict(cap)
        desc=cap['descriptor_path']
        if desc not in descriptor_cache: descriptor_cache[desc]=reader['type_descriptors'](desc)
        assert descriptor_cache[desc]['sha256']==cap['descriptor_sha256']
        ebx=reader['Ebx'](cap['raw_path'],descriptor_cache[desc]); assert ebx.sha256==cap['raw_sha256']
        decoded=ebx.decode(); assets.append({'siteWeapon':root.get('siteIdentity'),'sourceWeapon':root['internalId'],'captureId':cid,'route':cap['route'],'head':cap['head'],'rawSha256':cap['raw_sha256'],'descriptorSha256':cap['descriptor_sha256'],'decodeStatus':cap['decode_status']})
        found=set()
        for x in fieldrows.get(cid,[]):
            h=x['pointer'].split('/')[-1]; name=HASH_NAMES[h]; found.add((x['pointer'],x['objectIndex']))
            parts=x['pointer'].strip('/').split('/'); ob=x['objectIndex']; body=decoded['objects'][ob]; v=body
            for part in parts: v=v[part]
            assert not isinstance(v,dict) and abs(float(v)-float(x['value']))<1e-5,(root['internalId'],x['pointer'],v,x['value'])
            cls=ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']]); offset,kind=locate(ebx,cls,ebx.data_start+ebx.data_offsets[ob],parts,reader)
            fmt=reader['SIMPLE'].get(kind); rawhex=None; rawvalue=None
            if fmt:
                f,size=fmt; rawvalue=struct.unpack_from(f,ebx.data,offset)[0]; rawhex=ebx.data[offset:offset+size].hex()
                assert abs(float(rawvalue)-float(v))<1e-5,(root['internalId'],name,rawvalue,v)
            aim='ads' if '/Field_6b84de87/' in x['pointer'] else 'hip' if '/Field_7b609515/' in x['pointer'] else 'shared'
            row={'siteWeapon':root.get('siteIdentity'),'sourceWeapon':root['internalId'],'aim':aim,'fieldName':name,'fieldHash':h,'sourceValue':v,'pointer':x['pointer'],'objectIndex':ob,'objectGuid':body.get('$guid'),'objectClass':x['class'],'byteOffset':offset,'rawKind':kind,'rawFloatOrInt':rawvalue,'rawBytesHex':rawhex,'captureId':cid,'head':cap['head'],'rawSha256':cap['raw_sha256'],'descriptorSha256':cap['descriptor_sha256'],'layoutProvisional':bool(body.get('$layoutAmbiguous'))}
            wid=root.get('siteIdentity')
            if wid in site and aim in ('ads','hip'):
                state=site[wid]['recoil'][aim]
                if name=='RecoilDecreaseFactor': row.update(siteField=f'recoil.{aim}.decFactor',siteValue=state['decFactor'])
                elif name=='RecoilDecreaseExponent': row.update(siteField=f'recoil.{aim}.decExp',siteValue=state['decExp'])
                elif name=='RecoilDecreaseTimeExponent': row.update(siteField=f'recoil.{aim}.decTimeExp',siteValue=state['decTimeExp'])
                elif name=='RecoilDecreaseOffset': row.update(siteField=f'recoil.{aim}.decOffset',siteValue=state['decOffset'])
                elif name=='RecoilDecreaseNorm': row.update(siteField=f'recoil.{aim}.decNorm',siteValue=state['decNorm'])
                elif name=='ShootingRecoilDecreaseScale': row.update(siteField=f'recoil.{aim}.shootingDecScale',siteValue=state.get('shootingDecScale'))
                elif name=='RecoilPatternSeed': row.update(siteField='synthetic pattern seed',siteValue='whash(weapon id)')
            if 'siteField' in row:
                row['siteStatus']='unmapped-comparison' if not isinstance(row['siteValue'],(int,float)) else ('match' if abs(float(row['siteValue'])-float(row['sourceValue']))<1e-5 else 'different')
            details.append(row)
    db.close()
    groups=defaultdict(list)
    for r in details: groups[(r['fieldName'],r['aim'])].append(r)
    distributions=[]
    for (name,aim),rs in sorted(groups.items()):
        for scope,selected_rows in [('site',[r for r in rs if r['siteWeapon']]),('reference',[r for r in rs if not r['siteWeapon']])]:
            if not selected_rows: continue
            freq=Counter(str(r['sourceValue']) for r in selected_rows); mode=freq.most_common(1)[0][0]
            distributions.append({'scope':scope,'fieldName':name,'aim':aim,'coverage':len(selected_rows),'distinctValues':len(freq),'distribution':dict(freq),'outliers':[{'weapon':r['siteWeapon'] or r['sourceWeapon'],'value':r['sourceValue'],'pointer':r['pointer']} for r in selected_rows if len(freq)>1 and str(r['sourceValue'])!=mode]})
    # Exact site recovery predictions for a normalized 1 degree displacement after shot stop.
    predictions=[]
    for wid in ('m433','ak4d','sv98','vssm','interdictor'):
        if wid not in site: continue
        for aim in ('ads','hip'):
            r=site[wid]['recoil'][aim]; predictions.append({'weapon':wid,'aim':aim,'inputAssumedDisplacementDegrees':1.0,'decFactor':r['decFactor'],'decExp':r['decExp'],'decTimeExp':r['decTimeExp'],'decOffset':r['decOffset'],'remainingDegreesAtMs':{str(ms):round(recoil_remaining(1.0,r['decFactor'],r['decExp'],r['decTimeExp'],r['decOffset'],ms/1000),6) for ms in (25,50,100,150,200,300,400)}})
    # Conditional source-seed interpretation versus the Analyzer's weapon-hash seed.
    seed_predictions=[]
    for wid in ('m433','ak4d','vssm','interdictor'):
        if wid not in site: continue
        w=site[wid]; widhash=whash(wid)
        for aim in ('ads','hip'):
            g=w['recoil'][aim]; var=g['dirVar']*(g['dirVarMult']**g['dirVarExp'])
            aseq=mulberry32(widhash); bseq=mulberry32(0)
            deviations={'siteWhashSeed': [round((next(aseq)*2-1)*var,6) for _ in range(5)],'candidateSourceSeedZero':[round((next(bseq)*2-1)*var,6) for _ in range(5)]}
            seed_predictions.append({'weapon':wid,'aim':aim,'effectiveVariationDegrees':round(var,6),'sourceRecoilPatternSeed':0,'deviationSamplesDegrees':deviations,'interpretation':'Conditional comparison only: field name suggests a seed, but its native generator/use is unresolved.'})
    # Conditional second-order interpretation of the named spring operands.
    # Units/consumer are unresolved; this only creates a numeric capture discriminator.
    import math
    spring_predictions=[]
    for weapon,k,c in [('m433',1500.0,.5),('m87a1',200.0,.42)]:
        wd=math.sqrt(max(0.0,k-c*c/4)); ratio=c/(2*wd) if wd else 0
        values={}
        for ms in (10,25,50,100):
            t=ms/1000
            values[str(ms)]=round(math.exp(-c*t/2)*(math.cos(wd*t)+ratio*math.sin(wd*t)),6) if wd else 1.0
        spring_predictions.append({'weapon':weapon,'sourceZoomedSpringConstant':k,'sourceZoomedSpringDamping':c,'assumedEquation':'x" + c*x\' + k*x = 0','initialDisplacementDegrees':1.0,'predictedNormalizedResidualAtMs':values,'assumption':'Conditional units/equation only. Source names do not establish the output channel or runtime consumer.'})
    numeric={'currentSiteRecovery':predictions,'candidateSeedInterpretation':seed_predictions,'conditionalDampedSpring':spring_predictions}
    detail={'assets':assets,'rawFields':details,'distributions':distributions,'numericPredictions':numeric}
    a.details.write_text(json.dumps(detail,indent=2)+'\n')
    recovery=Counter(r.get('siteStatus') for r in details if r.get('siteField') and r.get('fieldName')!='RecoilPatternSeed')
    report={'schemaVersion':2,'date':'2026-09-23','build':{'id':'1.4.3.0','archiveHead':4892017,'descriptorSha256':'91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2','decoderSha256':'190f7d51cd7b20daf3fb5dc7f2c69688b28f0322e0f2eb0a45b16bc3c4a3098f'},'scope':{'siteWeapons':len(site),'sourceRoots':len(assets),'referenceOnly':[x['sourceWeapon'] for x in assets if x['siteWeapon'] is None]},'fieldRecords':len(details),'fieldAimDistributions':distributions,'siteRecoveryComparison':dict(recovery),'numericPredictions':numeric,'details':{'path':str(a.details.resolve()),'sha256':sha(a.details)},'inputs':[{'path':str(p.resolve()),'sha256':sha(p)} for p in [repo/'data/weapons.json',repo/'reference-data/provenance/frosty-audit-roster-2026-09-23.json',repo/'reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json',inventory,repo/'scripts/frosty-ebx-decode.py']],'limits':['Every candidate value is tied to its actual field object index/GUID and descriptor-derived raw byte offset; root-object metadata is not substituted for field metadata.','Decoded layout validity and GRX hash-name evidence do not establish runtime consumption or formula.','The selected capture is 1.4.3.0 release head; KSG is source-only reference.','Recovery outputs are from the site equation for a normalized one-degree residual. Seed and spring alternatives are explicit numerical hypotheses; source labels do not prove engine use.'],'scriptSha256':sha(Path(__file__))}
    a.out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'siteWeapons':len(site),'roots':len(assets),'fieldRecords':len(details),'distributions':len(distributions),'siteRecoveryComparison':dict(recovery),'referenceOnly':report['scope']['referenceOnly']}))
if __name__=='__main__': main()
