"""Compare hash-pinned raw captures across recorded builds without decoding them."""
import argparse, hashlib, json, re
from pathlib import Path

def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser(description='Verify and compare pinned raw EBX files across builds.')
    ap.add_argument('--manifest', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    a=ap.parse_args()
    if a.out.exists(): raise SystemExit(f'refusing existing output: {a.out}')
    m=json.loads(a.manifest.read_text(encoding='utf-8'))
    for side in ('release','hotfix'):
        b=m['builds'][side]
        catalog=b['catalog']
        if sha(catalog['path'])!=catalog['sha256']:raise SystemExit(f'{side}: catalog SHA mismatch')
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
