"""Compare pinned raw captures, or screen declared asset routes in paired catalogs."""
import argparse, hashlib, json, re
from pathlib import Path

def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def validate_builds(m):
    for side in ('release','hotfix'):
        b=m['builds'][side]
        catalog=b['catalog']
        if sha(catalog['path']).lower()!=catalog['sha256'].lower():raise SystemExit(f'{side}: catalog SHA mismatch')
        with Path(catalog['path']).open(encoding='utf-8-sig') as f:header=f.read(4096)
        found=re.search(r'"gameHead"\s*:\s*(\d+)',header)
        if not found or int(found[1])!=b['head']:raise SystemExit(f'{side}: catalog Head mismatch')
        descriptor=b.get('descriptorPath')
        if descriptor:
            actual=sha(descriptor)
            if actual.lower()!=b['descriptorSha256'].lower(): raise SystemExit(f"{side}: descriptor SHA mismatch: {actual}")
            b['descriptorVerifiedSha256']=actual
        runtime=b.get('runtimeDescriptorPath')
        if runtime:
            actual=sha(runtime)
            if actual.lower()!=b['descriptorSha256'].lower(): raise SystemExit(f"{side}: runtime descriptor SHA mismatch: {actual}")
            b['runtimeDescriptorVerifiedSha256']=actual

def catalog_routes(build, wanted):
    """Return selected catalog records only; caller pins catalog hash and build Head."""
    with Path(build['catalog']['path']).open(encoding='utf-8-sig') as f:
        catalog=json.load(f)
    if int(catalog.get('gameHead',-1))!=int(build['head']):
        raise SystemExit(f"{build['label']}: parsed catalog Head mismatch")
    result={}
    for asset in catalog.get('assets',[]):
        route=asset.get('path')
        if not isinstance(route,str) or route.casefold() not in wanted: continue
        key=route.casefold()
        if key in result: raise SystemExit(f"{build['label']}: duplicate catalog route {route}")
        guid, size, digest=asset.get('guid'),asset.get('originalBytes'),asset.get('sha1')
        if not isinstance(guid,str) or not guid or not isinstance(size,int) or size<0 or not isinstance(digest,str) or not re.fullmatch(r'[0-9a-fA-F]{40}',digest) or digest=='0'*40:
            raise SystemExit(f"{build['label']}: invalid catalog identity/hash for {route}")
        result[key]={'path':route,'guid':guid,'originalBytes':size,'sha1':digest.lower()}
    return result, catalog.get('hashMeaning')

def compare_catalogs(m,a,mhash):
    screen=m['catalogScreen']
    for x in screen.get('inputs',[]):
        p=Path(x['path'])
        if sha(p).lower()!=x['sha256'].lower():raise SystemExit(f"catalog-screen input SHA mismatch: {p}")
    route_groups={}
    for group in screen['groups']:
        seen=set()
        for route in group['routes']:
            if not isinstance(route,str) or not route: raise SystemExit('catalog screen has invalid route')
            key=route.casefold()
            if key in seen:raise SystemExit(f"duplicate route in group {group['id']}: {route}")
            seen.add(key)
            spec=route_groups.setdefault(key,{'route':route,'groups':[]})
            if group['id'] not in spec['groups']:spec['groups'].append(group['id'])
    if not route_groups: raise SystemExit('No catalog screen routes specified')
    selected={}
    meanings={}
    for side in ('release','hotfix'):
        selected[side],meanings[side]=catalog_routes(m['builds'][side],set(route_groups))
    rows=[]
    for key,spec in sorted(route_groups.items(),key=lambda kv:kv[1]['route'].casefold()):
        left,right=selected['release'].get(key),selected['hotfix'].get(key)
        same=left is not None and right is not None and (left['sha1'],left['originalBytes'],left['guid'])==(right['sha1'],right['originalBytes'],right['guid'])
        rows.append({'route':spec['route'],'groups':spec['groups'],'release':left,'hotfix':right,'presentBoth':left is not None and right is not None,'sameCatalogRecord':same})
    group_rows=[]
    for group in screen['groups']:
        members=[x for x in rows if group['id'] in x['groups']]
        group_rows.append({'id':group['id'],'description':group.get('description'),'routeCount':len(members),'presentBoth':sum(x['presentBoth'] for x in members),'changedOrMissing':sum(not x['sameCatalogRecord'] for x in members),'routes':[x['route'] for x in members]})
    result={'method':'verify pinned catalog files and build Heads, then compare declared routes by Frosty asset-record SHA1, originalBytes and GUID','manifest':str(a.manifest),'manifestSha256':mhash,'scriptSha256':sha(__file__),'builds':m['builds'],'scope':screen.get('scope','declared routes only; no whole-build inference'),'hashMeaning':meanings,'groupSummaries':group_rows,'uniqueRouteCount':len(rows),'changedOrMissingRouteCount':sum(not x['sameCatalogRecord'] for x in rows),'routes':rows,'limits':screen.get('limits',[])}
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open('x',encoding='utf-8') as output: output.write(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'out':str(a.out),'groups':len(group_rows),'routes':len(rows),'changedOrMissing':result['changedOrMissingRouteCount']}))

def main():
    ap=argparse.ArgumentParser(description='Verify and compare pinned raw EBX files across builds.')
    ap.add_argument('--manifest', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--mode',choices=('raw','catalog-screen'),default='raw')
    a=ap.parse_args()
    if a.out.exists(): raise SystemExit(f'refusing existing output: {a.out}')
    m=json.loads(a.manifest.read_text(encoding='utf-8'))
    validate_builds(m)
    if a.mode=='catalog-screen':
        if 'catalogScreen' not in m: raise SystemExit('catalog-screen mode requires catalogScreen in manifest')
        compare_catalogs(m,a,sha(a.manifest))
        return
    if not m['assets']:raise SystemExit('No assets specified')
    rows=[]
    for item in m['assets']:
        sides={}
        for side in ('release','hotfix'):
            x=item[side]; p=Path(x['rawPath']); actual=sha(p)
            if actual.lower()!=x['rawSha256'].lower(): raise SystemExit(f"{item['route']} {side}: raw SHA mismatch: {actual}")
            sides[side]={'path':str(p),'bytes':p.stat().st_size,'sha256':actual}
        rp,hp=Path(sides['release']['path']),Path(sides['hotfix']['path'])
        equal=True
        with rp.open('rb') as rf,hp.open('rb') as hf:
            while True:
                rb,hb=rf.read(1024*1024),hf.read(1024*1024)
                if rb!=hb:equal=False;break
                if not rb:break
        rows.append({'route':item['route'],'siteUse':item.get('siteUse'),'release':sides['release'],'hotfix':sides['hotfix'],'exactBytesEqual':equal})
    result={'method':'stream-rehash both pinned raw files, then exact-byte comparison','manifest':str(a.manifest),'manifestSha256':sha(a.manifest),'scriptSha256':sha(__file__),'builds':m['builds'],'scope':'listed captured assets only; no whole-build inference','assets':rows,'allListedAssetsExactBytesEqual':all(x['exactBytesEqual'] for x in rows)}
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open('x',encoding='utf-8') as output:output.write(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'out':str(a.out),'assets':len(rows),'allListedAssetsExactBytesEqual':result['allListedAssetsExactBytesEqual']}))
if __name__=='__main__': main()
