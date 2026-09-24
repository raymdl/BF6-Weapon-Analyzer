#!/usr/bin/env python3
"""Reusable, read-only L1 boolean-vector and L12 EBX import-array reproducers."""
import argparse, hashlib, importlib.util, json, pathlib, sqlite3, struct
from collections import defaultdict

DEFAULT_FLAGS = ["168e57d5","65310f94","c2b88435","85df0c4a","a60870ff","3ff462cc"]
DEFAULT_HEAD = 4892017
DEFAULT_DESC_SHA = "91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2"
DEFAULT_IDS = [17585, 7948]

def no_overwrite(path):
    path = pathlib.Path(path)
    if path.exists(): raise SystemExit(f"Refusing to overwrite: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def db_open(path):
    uri = pathlib.Path(path).resolve().as_uri() + "?mode=ro"
    c = sqlite3.connect(uri, uri=True); c.row_factory = sqlite3.Row
    c.execute("PRAGMA query_only=ON")
    return c

def sha(path): return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()

def write(obj, out):
    p = no_overwrite(out)
    p.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(p)

def walk_bool(x, flags, path="$"):
    if isinstance(x, dict):
        if all("Field_"+h in x and isinstance(x["Field_"+h], bool) for h in flags):
            yield path, x
        for k,v in x.items(): yield from walk_bool(v, flags, path+"/"+k)
    elif isinstance(x, list):
        for i,v in enumerate(x): yield from walk_bool(v, flags, path+f"/{i}")

def vectors(db, out, head, descriptor_sha, flags):
    c=db_open(db)
    sql = """select a.route,a.scope,cap.head,cap.descriptor_sha256,o.class_name,o.body_json,
       cap.raw_sha256,cap.decode_status,cap.warnings_json
       from objects o join captures cap on cap.id=o.capture_id
       join assets a on a.route=cap.route
       where cap.head=? and cap.descriptor_sha256=? and o.body_json like ?
       order by a.route,o.object_index"""
    rows=c.execute(sql,(head,descriptor_sha,"%Field_"+flags[0]+"%")).fetchall()
    blocks=[]
    for r in rows:
        try: obj=json.loads(r["body_json"])
        except Exception: continue
        for ptr,d in walk_bool(obj,flags):
            blocks.append({"route":r["route"],"scope":r["scope"],"className":r["class_name"],
              "head":r["head"],"descriptorSha256":r["descriptor_sha256"],"decodeStatus":r["decode_status"],
              "warnings":r["warnings_json"],"pointer":ptr,
              "vector":" ".join("T" if d["Field_"+h] else "F" for h in flags),
              "surroundingFields":{k:v for k,v in d.items() if k not in {"Field_"+h for h in flags}},
              "rawSha256":r["raw_sha256"]})
    groups=defaultdict(list)
    for b in blocks: groups[b["vector"]].append(b)
    vectors=list(groups); pairs=[]
    for i,a in enumerate(vectors):
        for b in vectors[i+1:]:
            ix=[j for j,(x,y) in enumerate(zip(a.split(),b.split())) if x!=y]
            if len(ix)==1:
                pairs.append({"a":a,"b":b,"changedFlag":"Field_"+flags[ix[0]],
                   "routesA":[x["route"] for x in groups[a]],"routesB":[x["route"] for x in groups[b]]})
    route_rows={(r["route"],r["scope"]) for r in c.execute(
      "select a.route,a.scope from objects o join captures cap on cap.id=o.capture_id join assets a on a.route=cap.route where cap.head=? and cap.descriptor_sha256=? and o.body_json like ?",
      (head,descriptor_sha,"%Field_"+flags[0]+"%"))}
    vehicles=sorted({r for r,s in route_rows if "/vehicle" in r.lower()})
    result={"ledger":str(pathlib.Path(db).resolve()),"ledgerMode":"ro","build":{"head":head,"descriptorSha256":descriptor_sha},"flags":["Field_"+h for h in flags],
      "sql":sql,"matchedObjectRows":len(rows),"uniqueMatchedRoutes":len({r["route"] for r in rows}),
      "sixBooleanBlockCount":len(blocks),"blocks":blocks,
      "vectorCounts":{v:len(items) for v,items in groups.items()},
      "distanceOnePairs":pairs,"vehicleTextMatchedRoutes":vehicles}
    ns=defaultdict(list)
    for b in blocks: ns["/".join(b["route"].split("/")[:3])].append(b["route"])
    result["groupsByNamespace"]={k:v for k,v in ns.items()}
    write(result,out)

def import_decoder(path):
    spec=importlib.util.spec_from_file_location("frosty_ebx_decoder",path)
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def effective_fields(dec,e,cl):
    for f in cl["fields"]:
        if dec.debug_type(f["flags"])==dec.INHERITED:
            yield from effective_fields(dec,e,e.class_by_index(f["classRef"]))
        else: yield f

def locate(dec,e,ix,path):
    cl=e.class_by_key(e.class_keys[e.instances[ix]["classRef"]])
    if cl is None: raise ValueError("Instance class has no matching descriptor")
    start=e.data_start+e.data_offsets[ix]
    for n,h in enumerate(path):
        f=next(f for f in effective_fields(dec,e,cl) if f["hash"]==h)
        start+=f["offset"]
        if n<len(path)-1: cl=e.class_by_index(f["classRef"])
    return start,f

def capture(c,dec,cid,head,descriptor_sha):
    row=c.execute("select * from captures where id=?",(cid,)).fetchone()
    if row is None: raise ValueError(f"Missing capture id {cid}")
    d=dict(row); d["verifiedRawSha256"]=sha(d["raw_path"])
    if d["verifiedRawSha256"]!=d["raw_sha256"]: raise ValueError(f"raw hash mismatch for {cid}")
    if d["descriptor_sha256"]!=descriptor_sha: raise ValueError(f"descriptor mismatch for {cid}")
    if d["head"]!=head: raise ValueError(f"build mismatch for {cid}")
    types=dec.type_descriptors(d["descriptor_path"])
    if types["sha256"]!=d["descriptor_sha256"]: raise ValueError(f"descriptor bytes hash mismatch for {cid}")
    return d, dec.Ebx(d["raw_path"],types)

def targets(c,g):
    return [dict(x) for x in c.execute("select c.id,c.route,c.head,o.object_index,o.object_guid,o.class_name,o.absolute_offset,o.body_json from objects o join captures c on c.id=o.capture_id where o.object_guid=? order by c.id,o.object_index",(g,))]

def trace_one(c,dec,cid,head,descriptor_sha,field_hash,object_index):
    cap,e=capture(c,dec,cid,head,descriptor_sha)
    cls=e.class_by_key(e.class_keys[e.instances[object_index]["classRef"]])
    fields=list(effective_fields(dec,e,cls))
    f=next(x for x in fields if x["hash"]==field_hash)
    pos=e.data_start+e.data_offsets[object_index]+f["offset"]
    rel=struct.unpack_from("<i",e.data,pos)[0]
    arr_off=(pos-e.data_start+rel)&0xffffffff
    arr=next(x for x in e.arrays if x["offset"]==arr_off)
    items=[]
    for i in range(arr["count"]):
        off=e.data_start+arr_off+i*8
        raw=struct.unpack_from("<i",e.data,off)[0]
        if raw < 0 or raw & 1 != 1: raise ValueError(f"pointer at {off} is not tagged as an import: {raw}")
        try: fg,og=e.imports[raw>>1]
        except IndexError: raise ValueError(f"import index out of range at {off}")
        guid=dec._guid(og)
        file_guid=dec._guid(bytes.fromhex(fg))
        original_targets=targets(c,guid)
        pair_rows=[dict(x) for x in c.execute("select capture_id,ordinal,target_file_guid,target_object_guid from imports where lower(target_file_guid)=lower(?) and lower(target_object_guid)=lower(?) order by capture_id,ordinal",(file_guid,guid))]
        items.append({"index":i,"rawOffset":off,"rawPointer":raw,"importTag":raw&1,"importIndex":raw>>1,
          "targetFileGuid":file_guid,"objectGuid":guid,"exactImportPairs":pair_rows,"originalTargetListByObjectGuid":original_targets})
    bodyrow=c.execute("select body_json from objects where capture_id=? and object_index=?",(cid,object_index)).fetchone()
    body=json.loads(bodyrow[0])
    decoded=body["Field_"+field_hash]
    if [x["$import"]["classGuid"] for x in decoded] != [x["objectGuid"] for x in items]: raise ValueError("raw import list differs from decoded body")
    if [x["$import"]["fileGuid"] for x in decoded] != [x["targetFileGuid"] for x in items]: raise ValueError("raw import file GUIDs differ from decoded body")
    reverse=[dict(x) for x in c.execute("select c.id,c.route,r.object_index,r.pointer from refs r join captures c on c.id=r.capture_id where r.target_object_guid=? order by c.id,r.object_index,r.pointer",(body["$guid"],))]
    return {"capture":cap,"objectIndex":object_index,"fileGuid":dec._guid(e.file_guid),"fieldHash":field_hash,"fieldDescriptor":f,"fieldOffset":pos,
      "relativePointer":rel,"array":arr,"items":items,"reverseEquipment":reverse,
      "limits":["Field meaning is not established by bytes; the selected array may be a preset rather than reset-to-base defaults.","Equipment layout is provisional; selected entries are checked against descriptor and raw import pointers."]}

def trace(db,decoder,ids,out,head,descriptor_sha,field_hash,object_index):
    c=db_open(db); dec=import_decoder(decoder)
    write({"build":{"head":head,"descriptorSha256":descriptor_sha},
      "decoderPath":str(pathlib.Path(decoder).resolve()),"captures":[trace_one(c,dec,int(i),head,descriptor_sha,field_hash,object_index) for i in ids]},out)

def controls(db,decoder,out,head,descriptor_sha,flags):
    c=db_open(db); dec=import_decoder(decoder); results=[]
    for internal in ["MiniFix","RagingHunter","M2010ESR"]:
        rows=c.execute("select c.id,o.object_index,o.object_guid,o.class_name,o.body_json from captures c join objects o on o.capture_id=c.id where c.route like ? and c.head=? and c.descriptor_sha256=? and o.class_name='Class_35259f6b'",("%/"+internal+"_WB",head,descriptor_sha)).fetchall()
        if len(rows)!=1: raise ValueError(f"expected one {internal} control, got {len(rows)}")
        cid,ix,guid,class_name,body_json=rows[0]; cap,e=capture(c,dec,cid,head,descriptor_sha)
        decoded=e.decode()["objects"][ix]; body=json.loads(body_json)
        if decoded["$class"]!=class_name or decoded.get("$guid")!=guid or body.get("$class")!=class_name or body.get("$guid")!=guid:
            raise ValueError(f"decoded class/GUID differs from ledger at capture {cid}, object {ix}")
        checks=[]
        for h in flags:
            off,f=locate(dec,e,ix,["f8822efa","eebe0fd8",h])
            if dec.debug_type(f["flags"])!=dec.BOOLEAN: raise ValueError(f"{h} descriptor is not BOOL")
            byte=e.data[off]
            if byte not in (0,1): raise ValueError(f"non-boolean byte at {off}")
            decoded_value=decoded["Field_f8822efa"]["Field_eebe0fd8"]["Field_"+h]
            if decoded_value is not bool(byte): raise ValueError(f"raw/decoded mismatch for {h} at {off}")
            checks.append({"field":"Field_"+h,"rawOffset":off,"rawByte":byte,"value":bool(byte)})
        results.append({"capture":cap,"objectIndex":ix,"objectGuid":guid,"fieldPath":"Field_f8822efa/Field_eebe0fd8","checks":checks})
    write({"build":{"head":head,"descriptorSha256":descriptor_sha},"flags":["Field_"+h for h in flags],"controls":results},out)

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="command",required=True)
    def add_build(q):
        q.add_argument("--head",type=int,default=DEFAULT_HEAD)
        q.add_argument("--descriptor-sha",default=DEFAULT_DESC_SHA)
    a=sub.add_parser("vectors"); a.add_argument("--db",required=True); a.add_argument("--flags",nargs="+",default=DEFAULT_FLAGS); a.add_argument("--out",required=True); add_build(a)
    b=sub.add_parser("controls"); b.add_argument("--db",required=True); b.add_argument("--decoder",required=True); b.add_argument("--flags",nargs="+",default=DEFAULT_FLAGS); b.add_argument("--out",required=True); add_build(b)
    t=sub.add_parser("trace-array"); t.add_argument("--db",required=True); t.add_argument("--decoder",required=True); t.add_argument("--ids",type=int,nargs="+",default=DEFAULT_IDS); t.add_argument("--field-hash",default="3538f6ad"); t.add_argument("--object-index",type=int,default=0); t.add_argument("--out",required=True); add_build(t)
    x=p.parse_args()
    if x.command=="vectors": vectors(x.db,x.out,x.head,x.descriptor_sha,x.flags)
    elif x.command=="controls": controls(x.db,x.decoder,x.out,x.head,x.descriptor_sha,x.flags)
    else: trace(x.db,x.decoder,x.ids,x.out,x.head,x.descriptor_sha,x.field_hash,x.object_index)
if __name__=="__main__": main()
