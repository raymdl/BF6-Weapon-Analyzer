"""Apply declarative checks against selected objects decoded by the Analyzer EBX reader."""
import argparse,hashlib,json,pathlib,runpy,sqlite3,struct

def sha(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def at(obj,path):
 for part in path: obj=obj[part]
 return obj
def key(route,raw):return (route.lower(),raw.lower())
def main():
 p=argparse.ArgumentParser();p.add_argument('--manifest',required=True,type=pathlib.Path);p.add_argument('--db',required=True,type=pathlib.Path);p.add_argument('--out',required=True,type=pathlib.Path);a=p.parse_args()
 if a.out.exists():raise SystemExit(f'refusing to overwrite {a.out}')
 m=json.loads(a.manifest.read_text(encoding='utf-8'));root=pathlib.Path(m['repoRoot']);d=runpy.run_path(str(root/'scripts'/'frosty-ebx-decode.py'))
 c=sqlite3.connect(a.db.resolve().as_uri()+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
 expdesc=m['build']['descriptorSha256'];head=m['build']['head'];tc={};loaded={};caps={};fail=[];results=[]
 def load(route,raw):
  k=key(route,raw)
  if k in loaded:return loaded[k]
  row=c.execute('select * from captures where route=? collate nocase and head=? and raw_sha256=? collate nocase',(route,head,raw)).fetchone()
  if row is None:raise ValueError(f'no ledger capture {route} {raw}')
  cap=dict(row);rp=pathlib.Path(cap['raw_path']);dp=pathlib.Path(cap['descriptor_path'])
  if cap['descriptor_sha256'].lower()!=expdesc.lower():raise ValueError('ledger descriptor differs from manifest build')
  actualdesc=sha(dp)
  if actualdesc.lower()!=expdesc.lower():raise ValueError('descriptor file hash differs from manifest build')
  actualraw=sha(rp)
  if actualraw.lower()!=raw.lower() or actualraw.lower()!=cap['raw_sha256'].lower():raise ValueError('raw file hash mismatch')
  if str(dp) not in tc:tc[str(dp)]=d['type_descriptors'](dp)
  if tc[str(dp)]['sha256'].lower()!=expdesc.lower():raise ValueError('decoder descriptor hash differs from manifest build')
  ebx=d['Ebx'](rp,tc[str(dp)])
  if ebx.sha256.lower()!=actualraw.lower():raise ValueError('decoder raw digest mismatch')
  objs=ebx.decode()['objects'];loaded[k]=(cap,ebx,objs);caps[k]={'route':cap['route'],'head':cap['head'],'rawSha256':actualraw,'descriptorSha256':actualdesc,'objectCount':len(objs)}
  return loaded[k]
 for x in m['assertions']:
  r={'id':x['id'],'lead':x.get('lead'),'kind':x['op'],'verified':False}
  try:
   cap,e,objs=load(x['route'],x['rawSha256']);r.update({'route':cap['route'],'rawSha256':e.sha256,'descriptorSha256':tc[str(cap['descriptor_path'])]['sha256']})
   if x['op']=='path_equals':
    actual=at(objs[x['objectIndex']],x.get('path',[]));r.update({'objectIndex':x['objectIndex'],'path':x.get('path',[]),'expected':x['expected'],'actual':actual});r['verified']=actual==x['expected']
   elif x['op']=='path_subset':
    actual=at(objs[x['objectIndex']],x.get('path',[])); expected=x['expected']; diffs={k:{'expected':v,'actual':actual.get(k,'<missing>')} for k,v in expected.items() if actual.get(k,'<missing>')!=v};r.update({'objectIndex':x['objectIndex'],'expectedFields':expected,'mismatches':diffs});r['verified']=not diffs
   elif x['op']=='path_contains':
    actual=at(objs[x['objectIndex']],x['path']);r.update({'objectIndex':x['objectIndex'],'path':x['path'],'expectedItem':x['expected'],'actualCount':sum(v==x['expected'] for v in actual)});r['verified']=r['actualCount']==x.get('count',1)
   elif x['op']=='find_count':
    path=x['path']; matches=[]
    for i,o in enumerate(objs):
     try:
      if at(o,path)==x['expected']:matches.append(i)
     except (KeyError,IndexError,TypeError):pass
    r.update({'path':path,'expected':x['expected'],'matchIndices':matches,'countExpected':x['count']});r['verified']=len(matches)==x['count']
   elif x['op']=='deep_count':
    def vals(z):
     if isinstance(z,dict):
      for v in z.values():yield from vals(v)
     elif isinstance(z,list):
      for v in z:yield from vals(v)
     else:yield z
    actual=sum(v==x['expected'] for o in objs for v in vals(o));r.update({'expectedValue':x['expected'],'expectedCount':x['count'],'actualCount':actual});r['verified']=actual==x['count']
   elif x['op']=='import_resolves':
    ipath=[int(z) if isinstance(z,str) and z.isdigit() else z for z in x['path']]; imp=at(objs[x['objectIndex']],ipath)['$import'];target=x['target']; rows=c.execute('select a.route,a.file_guid,cap.raw_path,cap.raw_sha256,cap.descriptor_path,cap.descriptor_sha256 from assets a join captures cap on cap.route=a.route where lower(a.file_guid)=lower(?) and cap.head=? and cap.descriptor_sha256=?',(imp['fileGuid'],head,expdesc)).fetchall();matches=[]
    for rr in rows:
     if rr['route'].lower()!=target['route'].lower() or rr['raw_sha256'].lower()!=target['rawSha256'].lower() or rr['file_guid'].lower()!=imp['fileGuid'].lower():continue
     _,te,to=load(rr['route'],rr['raw_sha256']);matches.extend((rr['route'],rr['file_guid'],i,o) for i,o in enumerate(to) if o.get('$guid','').lower()==imp['classGuid'].lower())
    r.update({'import':imp,'expectedTarget':target,'resolved':bool(matches),'resolvedFileGuids':[z[1] for z in matches],'targetObjectIndices':[z[2] for z in matches]});r['verified']=len(matches)==1
   elif x['op']=='raw_bytes':
    n=len(bytes.fromhex(x['bytes']));actual=e.data[x['offset']:x['offset']+n].hex();r.update({'offset':x['offset'],'expectedBytes':x['bytes'],'actualBytes':actual});r['verified']=actual.lower()==x['bytes'].lower()
   else:raise ValueError('unknown assertion operation '+x['op'])
   if not r['verified']:r['error']='recorded assertion differs'
  except Exception as ex:r['error']=str(ex)
  results.append(r)
  if not r['verified']:fail.append(r)
 if a.out.exists():raise SystemExit(f'refusing to overwrite {a.out}')
 a.out.mkdir(parents=True)
 report={'schemaVersion':1,'readOnly':True,'manifest':str(a.manifest),'database':str(a.db),'decoder':str(root/'scripts'/'frosty-ebx-decode.py'),'artifactSha256':{'manifest':sha(a.manifest),'decoder':sha(root/'scripts'/'frosty-ebx-decode.py')},'build':m['build'],'captureCount':len(caps),'captures':list(caps.values()),'assertionCount':len(results),'failureCount':len(fail),'assertions':results,'failures':fail,'limits':m.get('limits',[])}
 (a.out/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'captures':len(caps),'assertions':len(results),'failures':len(fail),'out':str(a.out)}));return 1 if fail else 0
if __name__=='__main__':raise SystemExit(main())
