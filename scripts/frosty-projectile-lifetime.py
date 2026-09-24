"""Reproduce exact-GUID projectile lifetime and unchanged-site reachability checks."""
import argparse
import hashlib
import importlib.machinery
import json
import math
import pathlib
import sqlite3
import struct
import subprocess
import sys

FIELD_HASH = '5ef7b9a1'
PROJECTILE_CLASS = 'Class_23637dce'
RANGE_M = 300.0
VELOCITY_LADDER = 0.8
LIMITATION = ('Conditional comparison against site level-horizontal flight-time behavior. '
              'Configured TimeToLive is source data; this does not establish engine expiry or runtime-selected loadout.')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))

def field_iter(decoder, ebx, cls):
    for field in cls['fields']:
        if decoder.debug_type(field['flags']) == decoder.INHERITED:
            yield from field_iter(decoder, ebx, ebx.class_by_index(field['classRef']))
        else:
            yield field

def descriptor_field(decoder, ebx, object_index):
    cls = ebx.class_by_key(ebx.class_keys[ebx.instances[object_index]['classRef']])
    matches = [f for f in field_iter(decoder, ebx, cls) if f['hash'].lower() == FIELD_HASH]
    if len(matches) != 1:
        raise ValueError(f'expected one inherited Field_{FIELD_HASH}, found {len(matches)}')
    return cls, matches[0]

def lifetime_inventory(root, ledger, head, descriptor_sha):
    ballistics_path = root / 'data/ballistics.json'
    decoder_path = root / 'scripts/frosty-ebx-decode.py'
    ballistics = read_json(ballistics_path)
    if ballistics['source']['build'] != '1.4.3.0':
        raise ValueError('ballistics source build is not recorded build 1.4.3.0')
    decoder = importlib.machinery.SourceFileLoader('frosty_decoder', str(decoder_path)).load_module()
    con = sqlite3.connect(ledger.resolve().as_uri() + '?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    descriptors = {}
    entries = []
    try:
        for route, site in sorted(ballistics['projectiles'].items()):
            guid = str(site.get('guid', '')).lower()
            if not guid:
                raise ValueError(f'{route}: missing exact projectile GUID')
            rows = con.execute('''select c.id capture_id,c.route,c.raw_path,c.raw_sha256,c.head,
                c.descriptor_path,c.descriptor_sha256,o.object_index,o.object_guid,o.class_name,
                o.absolute_offset,o.body_json from objects o join captures c on c.id=o.capture_id
                where lower(o.object_guid)=lower(?) and c.head=? and c.descriptor_sha256=? order by c.id''',
                (guid, head, descriptor_sha)).fetchall()
            if len(rows) != 1:
                raise ValueError(f'{route}: expected one exact-GUID capture for requested build/descriptor, found {len(rows)}')
            row = dict(rows[0])
            if row['class_name'] != PROJECTILE_CLASS or row['object_guid'].lower() != guid:
                raise ValueError(f"{route}: expected {PROJECTILE_CLASS} with exact GUID {guid}; got {row['class_name']} {row['object_guid']}")
            descriptor_path = pathlib.Path(row['descriptor_path'])
            if sha(descriptor_path) != descriptor_sha:
                raise ValueError(f'{route}: descriptor SHA-256 mismatch')
            if str(descriptor_path) not in descriptors:
                descriptors[str(descriptor_path)] = decoder.type_descriptors(descriptor_path)
            types = descriptors[str(descriptor_path)]
            if types['sha256'] != descriptor_sha:
                raise ValueError(f'{route}: decoded descriptor SHA-256 mismatch')
            raw_path = pathlib.Path(row['raw_path'])
            ebx = decoder.Ebx(raw_path, types)
            raw_sha = sha(raw_path)
            if ebx.sha256 != row['raw_sha256'] or raw_sha != row['raw_sha256']:
                raise ValueError(f'{route}: raw EBX SHA-256 mismatch')
            decoded = ebx.decode()['objects']
            ix = int(row['object_index'])
            if ix < 0 or ix >= len(decoded):
                raise ValueError(f'{route}: ledger object index outside decoded EBX')
            body = decoded[ix]
            if str(body.get('$guid', '')).lower() != guid or body.get('$class') != PROJECTILE_CLASS:
                raise ValueError(f'{route}: decoded object GUID/class differs from ledger and exact identity')
            cls, field = descriptor_field(decoder, ebx, ix)
            if decoder.debug_type(field['flags']) != decoder.FLOAT32:
                raise ValueError(f'{route}: TimeToLive descriptor type is not FLOAT32')
            offset = ebx.data_start + ebx.data_offsets[ix] + field['offset']
            raw_bytes = ebx.data[offset:offset + 4]
            if len(raw_bytes) != 4:
                raise ValueError(f'{route}: raw FLOAT32 extends past captured EBX')
            raw_value = struct.unpack('<f', raw_bytes)[0]
            decoded_value = body.get('Field_' + FIELD_HASH)
            if not isinstance(decoded_value, (int, float)) or not math.isfinite(float(decoded_value)) or float(decoded_value) != raw_value:
                raise ValueError(f'{route}: decoded Field_{FIELD_HASH} differs from unpacked raw FLOAT32')
            ledger_body = json.loads(row['body_json'])
            ledger_value = ledger_body.get('Field_' + FIELD_HASH)
            if not isinstance(ledger_value, (int, float)) or float(ledger_value) != raw_value:
                raise ValueError(f'{route}: ledger decoded value differs from raw FLOAT32')
            entries.append({'siteProjectile':route,'guid':guid,'siteValues':site,'releaseMatches':[{
                'captureId':row['capture_id'],'route':row['route'],'rawPath':str(raw_path),'rawSha256':raw_sha,
                'head':row['head'],'descriptorSha256':descriptor_sha,'objectIndex':ix,'objectGuid':body['$guid'],
                'className':body['$class'],'ledgerAbsoluteOffset':row['absolute_offset'],'rawObjectClass':body['$class'],
                'timeToLive':{'field':'Field_'+FIELD_HASH,'value':raw_value,'rawAbsoluteOffset':offset,
                    'fieldOffsetWithinObject':field['offset'],'rawBytesHex':raw_bytes.hex(),
                    'descriptorFlags':field['flags'],'descriptorType':'FLOAT32'}
            }]})
    finally:
        con.close()
    if len(entries) != 64:
        raise ValueError(f'expected 64 site projectile routes, found {len(entries)}')
    return {'build':{'head':head,'descriptorSha256':descriptor_sha},
            'inputs':{'ballisticsJson':str(ballistics_path),'ballisticsSha256':sha(ballistics_path),
                'ledger':str(ledger),'decoder':str(decoder_path),'decoderSha256':sha(decoder_path)},
            'method':'Inventory the 64 existing data/ballistics.json routes, join exact GUID to the requested release ledger, then validate raw EBX and descriptor SHA/build, decoded GUID/class, FLOAT32 type, raw bytes, and decoded values. No route-name inference or hotfix substitution.',
            'entries':entries}

def reachability(root, usage_path, lifetime, weapons_path, ammo_path, ballistics_path):
    weapons = {w['id']:w for w in read_json(weapons_path)}
    ammo = read_json(ammo_path)['WEAPON_AMMO']
    ballistics = read_json(ballistics_path)
    projectiles = ballistics['projectiles']
    by_route = {x['siteProjectile']:x for x in lifetime['entries']}
    cases = []
    for row in (json.loads(line) for line in usage_path.read_text(encoding='utf-8').splitlines() if line.strip()):
        wid = row['siteId']
        weapon = weapons.get(wid)
        if weapon is None:
            raise ValueError(f'{wid}: selected weapon missing from site data')
        for choice in row.get('ammoSelections', []):
            route = choice.get('selectedBySiteBallistics')
            if not route:
                continue
            life = by_route.get(route)
            if life is None or len(life['releaseMatches']) != 1:
                raise ValueError(f'{wid}/{choice.get("ammoId")}: unresolved exact-release lifetime row')
            ttlrow = life['releaseMatches'][0]
            if ttlrow.get('identityOnly') or 'timeToLive' not in ttlrow:
                raise ValueError(f'{wid}/{choice.get("ammoId")}: identity-only row cannot support reachability')
            ttl = ttlrow['timeToLive']['value']
            projectile = projectiles.get(route)
            if projectile is None or projectile.get('guid','').lower() != life['guid'].lower():
                raise ValueError(f'{wid}/{choice.get("ammoId")}: exact route/GUID absent in site data')
            treatment = ammo.get(wid, {}).get('velocityTreatments', {}).get(choice.get('ammoId'))
            velocity = weapon.get('bulletVel')
            reason = 'site bare-weapon bulletVel; no ammo treatment'
            if treatment:
                if treatment.get('kind') == 'subsonic-tier':
                    tier = treatment.get('subsonicVelocityTier')
                    if isinstance(tier, int) and tier >= 0:
                        velocity *= VELOCITY_LADDER ** tier
                        reason = 'base bulletVel * 0.8^subsonicVelocityTier per sim/applyAttachments.js'
                elif isinstance(treatment.get('subsonicVelocityMps'), (int,float)) and treatment['subsonicVelocityMps'] > 0:
                    velocity = treatment['subsonicVelocityMps']
                    reason = 'exact absolute ammo velocity treatment per sim/applyAttachments.js'
            drag = projectile['dragPerMeter']
            flight300 = RANGE_M / velocity if drag == 0 else math.expm1(drag * RANGE_M) / (drag * velocity)
            distance = velocity * ttl if drag == 0 else math.log1p(drag * velocity * ttl) / drag
            cases.append({'siteId':wid,'weaponName':weapon.get('name'),'ammoId':choice.get('ammoId'),
                'projectileRoute':route,'projectileGuid':life['guid'],'selectionTrace':choice.get('selectionTrace'),
                'routeIsBase':choice.get('routeIsBase'),'siteOverride':choice.get('siteOverride'),
                'ttlSecondsConfigured':ttl,'ttlFieldRaw':ttlrow['timeToLive'],'siteVelocityMps':velocity,
                'velocitySource':reason,'dragPerMeter':drag,'levelShotFlightTimeTo300s':flight300,
                'levelShotDistanceAtConfiguredTtlM':distance,
                'conditionalLifetimeBoundaryAtOrBefore300m':ttl <= flight300,
                'sourceCaptureId':ttlrow['captureId'],'sourceRawSha256':ttlrow['rawSha256'],'limitations':LIMITATION})
    unresolved = [x for x in cases if 'conditionalLifetimeBoundaryAtOrBefore300m' not in x]
    if len(cases) != 328 or unresolved:
        raise ValueError(f'expected 328 fully resolved selections; found {len(cases)} cases and {len(unresolved)} unresolved')
    return {'rangeM':RANGE_M,'selectionCount':len(cases),'method':'Join existing site ammo selections to exact projectile routes/GUIDs and raw-validated source lifetime. Use site bare weapon velocity plus exact site ammo velocity treatments. Compare configured TimeToLive conditionally against site level-horizontal flightTimeAtDistance at 300m; no attachment/barrel modifiers.',
        'cases':cases,'summary':{'resolvedCases':len(cases),'within300m':sum(x['conditionalLifetimeBoundaryAtOrBefore300m'] for x in cases),
            'after300m':sum(not x['conditionalLifetimeBoundaryAtOrBefore300m'] for x in cases),'unresolved':0,
            'within300mSelections':[{'siteId':x['siteId'],'ammoId':x['ammoId'],'route':x['projectileRoute'],'ttl':x['ttlSecondsConfigured'],'velocityMps':x['siteVelocityMps'],'distanceAtTtlM':x['levelShotDistanceAtConfiguredTtlM']} for x in cases if x['conditionalLifetimeBoundaryAtOrBefore300m']]}}

def compare_prior(report_dir, prior_dir):
    life=read_json(report_dir/'reproduced-lifetime.json'); reach=read_json(report_dir/'reproduced-reachability.json'); site=read_json(report_dir/'site-function-comparison.json')
    oldlife=read_json(prior_dir/'L25/L25-source-lifetime.json'); oldreach=read_json(prior_dir/'L25/L25-selection-range-check.json'); oldsite=read_json(prior_dir/'L25/parent-site-function-check.json'); oldl22=read_json(prior_dir/'L22/site-lifetime-comparison.json'); oldraw=read_json(prior_dir/'L22/parent-raw-lifetime-check.json')
    nlife={x['siteProjectile']:x for x in life['entries']}; olife={x['siteProjectile']:x for x in oldlife['entries']}
    life_same=len(nlife)==64 and all(nlife[k]['guid']==v['guid'] and len(nlife[k]['releaseMatches'])==len(v['releaseMatches'])==1 and nlife[k]['releaseMatches'][0]['captureId']==v['releaseMatches'][0]['captureId'] and nlife[k]['releaseMatches'][0]['rawSha256']==v['releaseMatches'][0]['rawSha256'] and nlife[k]['releaseMatches'][0]['objectIndex']==v['releaseMatches'][0]['objectIndex'] and nlife[k]['releaseMatches'][0]['objectGuid'].lower()==v['releaseMatches'][0]['objectGuid'].lower() and nlife[k]['releaseMatches'][0]['timeToLive']['value']==v['releaseMatches'][0]['timeToLive']['value'] and nlife[k]['releaseMatches'][0]['timeToLive']['rawAbsoluteOffset']==v['releaseMatches'][0]['timeToLive']['rawAbsoluteOffset'] and nlife[k]['releaseMatches'][0]['timeToLive']['rawBytesHex']==v['releaseMatches'][0]['timeToLive']['rawBytesHex'] for k,v in olife.items())
    nc={(x['siteId'],x['ammoId']):x for x in reach['cases']}; oc={(x['siteId'],x['ammoId']):x for x in oldreach['cases']}
    selection_same=len(nc)==328 and all(k in nc and all(nc[k][f]==v[f] for f in ('projectileRoute','ttlSecondsConfigured','conditionalLifetimeBoundaryAtOrBefore300m')) and abs(nc[k]['siteVelocityMps']-v['siteVelocityMps'])<1e-9 and abs(nc[k]['levelShotFlightTimeTo300s']-v['levelShotFlightTimeTo300s'])<1e-9 and abs(nc[k]['levelShotDistanceAtConfiguredTtlM']-v['levelShotDistanceAtConfiguredTtlM'])<1e-9 for k,v in oc.items())
    vectors=site['candidates']; oldvectors=oldsite['candidates']
    vector_same=len(vectors)==len(oldvectors)==32 and all(a['siteId']==b['siteId'] and a['ammoId']==b['ammoId'] and abs(a['vectorBoundary']-b['vectorBoundary'])<1e-9 and abs(a['vectorTime300']-b['vectorTime300'])<1e-9 for a,b in zip(vectors,oldvectors))
    def near(a,b): return abs(float(a)-float(b))<1e-8
    l22=site['l22ShotgunSamples']; oldcases=oldl22['cases']
    l22same=len(l22)==len(oldcases)==2 and all(l22[i]['sourceTtlCandidate']==oldcases[i]['sourceTtlCandidate'] and near(l22[i]['levelCutoffMeters'],oldcases[i]['levelCutoffMeters']) and near(l22[i]['vectorCutoffMeters'],oldcases[i]['vectorCutoffMeters']) and len(l22[i]['samples'])==len(oldcases[i]['samples']) and all(a['range']==b['range'] and near(a['levelTime'],b['levelTime']) and near(a['vectorTrajectory']['timeSeconds'],b['vectorTrajectory']['timeSeconds']) and near(a['vectorTrajectory']['yMeters'],b['vectorTrajectory']['yMeters']) and near(a['allPelletsDamage'],b['allPelletsDamage']) for a,b in zip(l22[i]['samples'],oldcases[i]['samples'])) for i in range(2))
    raw=[]
    for item in oldraw:
        route=item['capture']['route']; entry=next((x for x in life['entries'] if x['siteProjectile']==route),None)
        match=next((x for x in entry['releaseMatches'] if x['captureId']==item['capture']['id']),None) if entry else None
        if not match or match['rawSha256']!=item['capture']['raw_sha256'] or match['timeToLive']['rawAbsoluteOffset']!=item['rawOffset'] or match['timeToLive']['rawBytesHex']!=item['rawBytes'] or match['timeToLive']['value']!=item['rawFloat32'] or match['objectIndex']!=item['objectIndex']:
            raise ValueError('L22 raw anchor mismatch: '+route)
        raw.append({'route':route,'captureId':item['capture']['id'],'head':item['capture']['head'],'descriptorSha256':item['capture']['descriptor_sha256'],'rawSha256':item['capture']['raw_sha256'],'objectIndex':item['objectIndex'],'objectGuid':match['objectGuid'],'field':'Field_'+FIELD_HASH,'fieldOffsetWithinObject':match['timeToLive']['fieldOffsetWithinObject'],'rawAbsoluteOffset':match['timeToLive']['rawAbsoluteOffset'],'rawBytesHex':match['timeToLive']['rawBytesHex'],'value':match['timeToLive']['value']})
    checks={'lifetime64ExactGuidBuildHashAndRawFieldRecordsMatch':life_same,'selection328ValuesMatch':selection_same,'conditional32VectorFunctionResultsMatch':vector_same,'l22BuckshotAndSlugSamplesMatch':l22same}
    result={'comparison':'Recomputed values compared with the recorded overnight L22/L25 artifacts.','checks':checks,
        'counts':{'projectileRoutes':len(life['entries']),'selectionCases':len(reach['cases']),'conditionalCandidates':len(vectors),'l22SampleCases':len(l22)},
        'l22RawAnchors':raw,'limitations':'TimeToLive is interpreted conditionally as seconds-to-expiry for reachability math; no native runtime expiry or runtime selection claim.'}
    (report_dir/'comparison-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    if not all(checks.values()): raise ValueError('overnight comparison mismatch: '+json.dumps(checks))

def main():
    if '--consistency' in sys.argv[1:]:
        cp=argparse.ArgumentParser(description='Compare level-flight timing with vector trajectory helpers for recorded L25 inputs.')
        cp.add_argument('--consistency',action='store_true',required=True)
        cp.add_argument('--root',type=pathlib.Path,required=True)
        cp.add_argument('--range-report',type=pathlib.Path,required=True)
        cp.add_argument('--prior-site-check',type=pathlib.Path,required=True)
        cp.add_argument('--out',type=pathlib.Path,required=True)
        cp.add_argument('--node-helper',type=pathlib.Path,default=pathlib.Path(__file__).with_name('frosty-projectile-site-functions.mjs'))
        a=cp.parse_args(); root=a.root.resolve(); report=a.range_report.resolve(); prior_site=a.prior_site_check.resolve(); out=a.out.resolve(); helper=a.node_helper.resolve()
        if out.exists(): raise FileExistsError(f'refusing to overwrite output: {out}')
        command=['node',str(helper),'--consistency','--root',str(root),'--range-report',str(report),'--prior-site-check',str(prior_site),'--out',str(out)]
        node=subprocess.run(command,check=True,capture_output=True,text=True)
        print(json.dumps({'pythonEntrypoint':str(pathlib.Path(__file__).resolve()),'pythonEntrypointSha256':sha(pathlib.Path(__file__).resolve()),'pythonArguments':sys.argv[1:],'nodeHelper':str(helper),'nodeArguments':command[2:],'output':str(out),'nodeResult':node.stdout.strip()},indent=2))
        return
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--analyzer-root',type=pathlib.Path,required=True)
    ap.add_argument('--ledger',type=pathlib.Path,required=True)
    ap.add_argument('--usage',type=pathlib.Path,required=True)
    ap.add_argument('--prior-dir',type=pathlib.Path,required=True,help='overnight 1.4.3.0 directory containing L22 and L25 records')
    ap.add_argument('--report-dir',type=pathlib.Path,required=True,help='new directory; existing directories are refused')
    ap.add_argument('--head',type=int,default=4892017)
    ap.add_argument('--descriptor-sha256',default='91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2')
    ap.add_argument('--node-helper',type=pathlib.Path,default=pathlib.Path(__file__).with_name('frosty-projectile-site-functions.mjs'))
    a=ap.parse_args(); root=a.analyzer_root.resolve(); ledger=a.ledger.resolve(); usage=a.usage.resolve(); prior=a.prior_dir.resolve(); out=a.report_dir.resolve()
    if out.exists(): raise FileExistsError(f'refusing to overwrite report directory: {out}')
    out.mkdir(parents=True)
    life=lifetime_inventory(root,ledger,a.head,a.descriptor_sha256)
    (out/'reproduced-lifetime.json').write_text(json.dumps(life,indent=2)+'\n',encoding='utf-8')
    reach=reachability(root,usage,life,root/'data/weapons.json',root/'data/ammo.json',root/'data/ballistics.json')
    reach['inputs']={str(p):sha(p) for p in (usage,root/'data/weapons.json',root/'data/ammo.json',root/'data/ballistics.json',root/'sim/ballistics.js',root/'sim/applyAttachments.js')}
    (out/'reproduced-reachability.json').write_text(json.dumps(reach,indent=2)+'\n',encoding='utf-8')
    node=subprocess.run(['node',str(a.node_helper.resolve()),str(root),str(out/'reproduced-reachability.json'),str(out/'site-function-comparison.json')],check=True,capture_output=True,text=True)
    site=read_json(out/'site-function-comparison.json')
    if site['selectionChecks']!=328 or len(site['candidates'])!=32 or len(site['l22ShotgunSamples'])!=2:
        raise ValueError('unchanged site function helper returned unexpected counts')
    compare_prior(out,prior)
    files=[pathlib.Path(__file__).resolve(),a.node_helper.resolve(),ledger,usage,root/'data/ballistics.json',root/'data/weapons.json',root/'data/ammo.json',root/'sim/ballistics.js',root/'sim/damage.js',root/'sim/applyAttachments.js',root/'scripts/frosty-ebx-decode.py',prior/'L22/site-lifetime-comparison.json',prior/'L22/parent-raw-lifetime-check.json',prior/'L25/L25-source-lifetime.json',prior/'L25/L25-selection-range-check.json',prior/'L25/parent-site-function-check.json']
    manifest={'arguments':{'analyzerRoot':str(root),'ledger':str(ledger),'usage':str(usage),'priorDir':str(prior),'reportDir':str(out),'head':a.head,'descriptorSha256':a.descriptor_sha256,'nodeHelper':str(a.node_helper.resolve())},'sha256':{str(p):sha(p) for p in files}}
    (out/'run-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'reportDir':str(out),'counts':{'projectileRoutes':64,'selectionCases':328,'conditionalCandidates':32,'l22Cases':2},'comparison':read_json(out/'comparison-report.json')['checks'],'node':node.stdout.strip()},indent=2))

if __name__=='__main__': main()
