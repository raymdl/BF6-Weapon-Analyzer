"""Reproduce selected WB/GS registry child/hash associations with raw identity checks.

Input manifest declares exact captures, object indices, wrapper paths and target field
hashes. Output records serialized associations; it does not infer engine behavior.
"""
import argparse, hashlib, json, runpy, sqlite3, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def fields(e, cl, decoder):
    for f in cl['fields']:
        if decoder['debug_type'](f['flags']) == decoder['INHERITED']:
            yield from fields(e, e.class_by_index(f['classRef']), decoder)
        else: yield f

def body(e, ix):
    cl=e.class_by_key(e.class_keys[e.instances[ix]['classRef']]); start=e.data_start+e.data_offsets[ix]
    return e._read_class(cl,start),cl,start

def field_offset(e, cl, start, path, decoder):
    steps=[]
    for n,h in enumerate(path):
        f=next((x for x in fields(e,cl,decoder) if x['hash'].lower()==h.lower()),None)
        if f is None: raise ValueError(f'field {h} absent from class {cl["hash"]}')
        start+=f['offset']; steps.append({'hash':h,'offset':start,'descriptorOffset':f['offset'],'flags':f['flags']})
        if n+1<len(path): cl=e.class_by_index(f['classRef'])
    return start,steps

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--db',type=Path,required=True); ap.add_argument('--manifest',type=Path,required=True); ap.add_argument('--out',type=Path,required=True)
    a=ap.parse_args()
    if a.out.exists(): raise SystemExit(f'refusing existing output: {a.out}')
    manifest=json.loads(a.manifest.read_text(encoding='utf-8'))
    decoder=runpy.run_path(str(ROOT/'scripts/frosty-ebx-decode.py'))
    con=sqlite3.connect(a.db.resolve().as_uri()+'?mode=ro',uri=True); con.row_factory=sqlite3.Row
    cache={}; decoded={}
    def load(cid, expected):
        if cid not in decoded:
            row=con.execute('select * from captures where id=?',(cid,)).fetchone()
            if row is None: raise ValueError(f'capture id not found: {cid}')
            cap=dict(row)
            if expected.get('head') is not None and cap['head']!=expected['head']: raise ValueError(f'head mismatch {cid}: {cap["head"]}')
            if expected.get('rawSha256') and cap['raw_sha256'].lower()!=expected['rawSha256'].lower(): raise ValueError(f'catalog raw hash mismatch {cid}')
            if expected.get('descriptorSha256') and cap['descriptor_sha256'].lower()!=expected['descriptorSha256'].lower(): raise ValueError(f'descriptor mismatch {cid}')
            desc=cap['descriptor_path']
            if desc not in cache:
                cache[desc]=decoder['type_descriptors'](desc)
                if sha(desc).lower()!=cap['descriptor_sha256'].lower(): raise ValueError(f'descriptor bytes mismatch {desc}')
            if sha(cap['raw_path']).lower()!=cap['raw_sha256'].lower(): raise ValueError(f'raw bytes mismatch {cap["raw_path"]}')
            e=decoder['Ebx'](cap['raw_path'],cache[desc])
            if e.sha256.lower()!=cap['raw_sha256'].lower(): raise ValueError(f'decoder raw hash mismatch {cid}')
            decoded[cid]=(cap,e)
        cap,e=decoded[cid]
        if expected.get('route') and cap['route'].lower()!=expected['route'].lower(): raise ValueError(f'route mismatch {cid}')
        if expected.get('head') is not None and cap['head']!=expected['head']: raise ValueError(f'head mismatch {cid}')
        return cap,e
    site_by_id={x['id']:x for x in json.loads((ROOT/'data/weapons.json').read_text(encoding='utf-8'))}
    results=[]
    for case in manifest['cases']:
        ownerCap,oe=load(case['captureId'],case)
        owner,ocl,ostart=body(oe,case['objectIndex'])
        regCap,re=load(case['registryCaptureId'],manifest.get('registry',{}))
        links=[]
        for spec in case['anchors']:
            path=[x.removeprefix('Field_') for x in spec['referencePath']]
            v=owner
            for h in path:
                v=v['Field_'+h]
            if not isinstance(v,dict) or '$import' not in v: raise ValueError(f'not import at {case["lead"]} {spec["label"]}')
            imp=v['$import']
            if imp['fileGuid'].lower()!=decoder['_guid'](re.file_guid).lower(): raise ValueError(f'foreign registry file GUID at {case["lead"]}/{spec["label"]}')
            anchorRow=con.execute('select object_index from objects where capture_id=? and lower(object_guid)=lower(?)',(regCap['id'],imp['classGuid'])).fetchone()
            if anchorRow is None: raise ValueError(f'anchor missing in registry: {imp["classGuid"]}')
            ai=anchorRow['object_index']; anchor,acl,astart=body(re,ai)
            hs=anchor.get('Field_4471d2f1'); ch=anchor.get('Field_080f1aaa')
            if not isinstance(hs,list) or not isinstance(ch,list) or len(hs)!=len(ch): raise ValueError(f'bad registry arrays {case["lead"]}/{spec["label"]}')
            hoff,hsteps=field_offset(re,acl,astart,['4471d2f1'],decoder); coff,csteps=field_offset(re,acl,astart,['080f1aaa'],decoder)
            pairs=[]
            for i,(h,ref) in enumerate(zip(hs,ch)):
                childix=ref.get('$ref') if isinstance(ref,dict) else None
                cb,ccl,cstart=body(re,childix) if isinstance(childix,int) else ({},None,None)
                hx=f'{h & 0xffffffff:08x}'
                if spec.get('targetHashes') and hx not in [x.lower().removeprefix('field_') for x in spec['targetHashes']]: continue
                name=cb.get('Field_0c59fa06'); val=cb.get('Field_42c8b257')
                vOff=None; vBytes=None; rawDecoded=None; valueType=None
                if ccl is not None and 'Field_42c8b257' in cb and not isinstance(val,(dict,list)):
                    vOff,vsteps=field_offset(re,ccl,cstart,['42c8b257'],decoder)
                    valueType=decoder['debug_type'](vsteps[-1]['flags']); width=8 if valueType in (decoder['INT64'],decoder['UINT64'],decoder['FLOAT64']) else 4
                    vBytes=re.data[vOff:vOff+width].hex()
                    if len(re.data[vOff:vOff+width])==width:
                        formats={decoder['ENUM']:'<i',decoder['INT8']:'<b',decoder['UINT8']:'<B',decoder['INT16']:'<h',decoder['UINT16']:'<H',decoder['INT32']:'<i',decoder['UINT32']:'<I',decoder['INT64']:'<q',decoder['UINT64']:'<Q',decoder['FLOAT32']:'<f',decoder['FLOAT64']:'<d'}
                        fmt=formats.get(valueType)
                        if fmt: rawDecoded=struct.unpack_from(fmt,re.data,vOff)[0]
                pairs.append({'arrayIndex':i,'fieldHash':hx,'field':'Field_'+hx,'childIndex':childix,'childGuid':cb.get('$guid'),'childName':name,'registryValue':val,'namedAssociation':name is not None,'valueOffset':vOff,'valueBytes':vBytes,'rawTypeCode':valueType,'rawDecodedValue':rawDecoded})
            linkedEvidence=[]
            queue=[]
            follow=[x.removeprefix('Field_') for x in spec.get('followFields',[])]
            if spec.get('followSeeds'):
                queue.extend((int(idx),'manifest-follow-seed',1) for idx in spec['followSeeds'])
            else:
                for fh in follow:
                    val0=anchor.get('Field_'+fh)
                    refs=val0 if isinstance(val0,list) else [val0]
                    for lr in refs:
                        if isinstance(lr,dict) and '$ref' in lr: queue.append((lr['$ref'],'Field_'+fh,1))
            seen=set()
            while queue:
                li,via,depth=queue.pop(0)
                if li in seen: continue
                seen.add(li)
                if len(seen)>int(spec.get('maxNodes',5000)): raise ValueError(f'link traversal bound exceeded for {case["lead"]}/{spec["label"]}')
                lb,lcl,lstart=body(re,li); lhs=lb.get('Field_4471d2f1'); lch=lb.get('Field_080f1aaa')
                lpairs=[]; laOffsets={}
                if isinstance(lhs,list) and isinstance(lch,list) and len(lhs)==len(lch):
                    laOffsets={'hashArray':field_offset(re,lcl,lstart,['4471d2f1'],decoder)[0],'childrenArray':field_offset(re,lcl,lstart,['080f1aaa'],decoder)[0]}
                    for lj,(lh,lr) in enumerate(zip(lhs,lch)):
                        lci=lr.get('$ref') if isinstance(lr,dict) else None
                        lcb,lcc,lcstart=body(re,lci) if isinstance(lci,int) else ({},None,None)
                        lhx=f'{lh & 0xffffffff:08x}'; lval=lcb.get('Field_42c8b257'); lvo=None; lbts=None; lraw=None; lkind=None
                        if lcc is not None and 'Field_42c8b257' in lcb and not isinstance(lval,(dict,list)):
                            lvo,lsteps=field_offset(re,lcc,lcstart,['42c8b257'],decoder); lkind=decoder['debug_type'](lsteps[-1]['flags']); lw=8 if lkind in (decoder['INT64'],decoder['UINT64'],decoder['FLOAT64']) else 4; lbytes=re.data[lvo:lvo+lw]; lbts=lbytes.hex()
                            lfmts={decoder['ENUM']:'<i',decoder['INT8']:'<b',decoder['UINT8']:'<B',decoder['INT16']:'<h',decoder['UINT16']:'<H',decoder['INT32']:'<i',decoder['UINT32']:'<I',decoder['INT64']:'<q',decoder['UINT64']:'<Q',decoder['FLOAT32']:'<f',decoder['FLOAT64']:'<d'}; lf=lfmts.get(lkind)
                            if lf and len(lbytes)==lw: lraw=struct.unpack_from(lf,lbytes)[0]
                        lpairs.append({'arrayIndex':lj,'field':'Field_'+lhx,'childIndex':lci,'childName':lcb.get('Field_0c59fa06'),'registryValue':lval,'valueOffset':lvo,'valueBytes':lbts,'rawTypeCode':lkind,'rawDecodedValue':lraw})
                    if depth < int(spec.get('maxDepth',8)):
                        for fh in follow:
                            lv=lb.get('Field_'+fh); lrefs=lv if isinstance(lv,list) else [lv]
                            for lr in lrefs:
                                if isinstance(lr,dict) and '$ref' in lr: queue.append((lr['$ref'],'Field_'+fh,depth+1))
                linkedEvidence.append({'via':via,'depth':depth,'objectIndex':li,'objectName':lb.get('Field_0c59fa06'),'pairCount':len(lhs) if isinstance(lhs,list) else None,'arrayOffsets':laOffsets,'pairs':lpairs})
            links.append({'label':spec['label'],'referencePath':spec['referencePath'],'reference':imp,'anchorIndex':ai,'anchorName':anchor.get('Field_0c59fa06'),'anchorRawSha256':regCap['raw_sha256'],'childrenArrayFieldOffset':coff,'hashArrayFieldOffset':hoff,'childrenArrayPathOffsets':csteps,'hashArrayPathOffsets':hsteps,'pairCount':len(hs),'pairs':pairs,'linkedEvidence':linkedEvidence})
        rawChecks=[]
        for spec in case.get('rawFieldChecks',[]):
            path=[x.removeprefix('Field_') for x in spec['path']]
            off,steps=field_offset(oe,ocl,ostart,path,decoder)
            kind=decoder['debug_type'](steps[-1]['flags'])
            width=8 if kind in (decoder['INT64'],decoder['UINT64'],decoder['FLOAT64']) else 4
            raw=oe.data[off:off+width]
            formats={decoder['ENUM']:'<i',decoder['INT8']:'<b',decoder['UINT8']:'<B',decoder['INT16']:'<h',decoder['UINT16']:'<H',decoder['INT32']:'<i',decoder['UINT32']:'<I',decoder['INT64']:'<q',decoder['UINT64']:'<Q',decoder['FLOAT32']:'<f',decoder['FLOAT64']:'<d'}
            fmt=formats.get(kind); value=struct.unpack_from(fmt,oe.data,off)[0] if fmt and len(raw)==width else None
            rawChecks.append({'label':spec['label'],'path':spec['path'],'offset':off,'bytes':raw.hex(),'typeCode':kind,'value':value})
        namedRefs=[]
        for spec in case.get('namedReferences',[]):
            v=owner
            for h in spec['referencePath']:
                v=v['Field_'+h.removeprefix('Field_')]
            imp=v.get('$import') if isinstance(v,dict) else None
            if not imp: raise ValueError(f'not import at {case["lead"]}/{spec["label"]}')
            if imp['fileGuid'].lower()!=decoder['_guid'](re.file_guid).lower(): raise ValueError(f'foreign named reference at {case["lead"]}/{spec["label"]}')
            row=con.execute('select object_index from objects where capture_id=? and lower(object_guid)=lower(?)',(regCap['id'],imp['classGuid'])).fetchone()
            if row is None: raise ValueError(f'named object missing at {case["lead"]}/{spec["label"]}')
            nix=row['object_index']; nb,ncl,nstart=body(re,nix)
            namedRefs.append({'label':spec['label'],'referencePath':spec['referencePath'],'reference':imp,'objectIndex':nix,'objectName':nb.get('Field_0c59fa06'),'rawSha256':regCap['raw_sha256']})
        results.append({'lead':case['lead'],'siteId':case.get('siteId'),'siteRpm':site_by_id.get(case.get('siteId'),{}).get('rpm'),'siteMag':site_by_id.get(case.get('siteId'),{}).get('mag'),'owner':{'captureId':ownerCap['id'],'route':ownerCap['route'],'head':ownerCap['head'],'rawSha256':ownerCap['raw_sha256'],'descriptorSha256':ownerCap['descriptor_sha256'],'objectIndex':case['objectIndex']},'registry':{'captureId':regCap['id'],'route':regCap['route'],'head':regCap['head'],'rawSha256':regCap['raw_sha256'],'descriptorSha256':regCap['descriptor_sha256']},'anchors':links,'namedReferences':namedRefs,'rawFieldChecks':rawChecks,'limits':['Registry array association and child naming are serialized source facts only.','Raw offsets are decoded descriptor offsets; provisional layout ambiguity remains visible in the linked capture ledger.']})
    report={'schemaVersion':1,'method':'selected registry anchor child/hash associations; raw captures and descriptors SHA-256 checked before decode','scriptSha256':sha(__file__),'decoderSha256':sha(ROOT/'scripts/frosty-ebx-decode.py'),'manifestSha256':sha(a.manifest),'siteWeaponsSha256':sha(ROOT/'data/weapons.json'),'cases':results}
    a.out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'out':str(a.out.resolve()),'cases':len(results),'anchors':sum(len(x['anchors']) for x in results),'targetPairs':sum(len(y['pairs']) for x in results for y in x['anchors'])}))
if __name__=='__main__': main()
