import hashlib, json, sqlite3, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\reports\exhaustive-audit-2026-09-23')
OUT=REPORT/'site-base-fields-2026-09-23.json'
COMPACT=ROOT/'reference-data/provenance/frosty-site-base-fields-2026-09-23.json'
if OUT.exists(): raise SystemExit(f'Output exists: {OUT}')
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
spread_receipt=json.loads((ROOT/'reference-data/provenance/frosty-site-spread-reviewed-2026-09-23.json').read_text())
spread_details=json.loads(Path(spread_receipt['details']['path']).read_text())
regen=json.loads((ROOT/'reference-data/provenance/frosty-regen-2026-09-23.json').read_text())
constants=json.loads((REPORT/'site-constants-live-byte-sym-audit-2026-09-23.json').read_text())
site_weapons={w['id']:w for w in json.loads((ROOT/'data/weapons.json').read_text())}
assets={a['sourceWeapon']:a for a in spread_details['assets']}
idle_rows=[]
for r in spread_details['comparisons']:
 if r['siteField'] not in ('spreadDyn.ads.idleTime','spreadDyn.hip.idleTime') or r['siteWeapon'] not in site_weapons: continue
 aim=r['siteField'].split('.')[1]; site_value=site_weapons[r['siteWeapon']]['spreadDyn'][aim]['idleTime']
 a=assets[r['sourceWeapon']]
 idle_rows.append({**r,'siteValue':site_value,'siteMatchesRawDecodedValue':abs(site_value-r['sourceValue'])<1e-6,
                   'sourceRawSha256':a['raw_sha256'],'sourceRawPath':a['raw_path'],'sourceHead':a['head']})
verified={}
for r in idle_rows:
 p=r['sourceRawPath']; actual=sha(p); verified[p]={'expectedSha256':r['sourceRawSha256'],'actualSha256':actual,'match':actual==r['sourceRawSha256']}; assert actual==r['sourceRawSha256']
db=sqlite3.connect(f'{(REPORT/"coverage-decoder-v5.sqlite").resolve().as_uri()}?mode=ro',uri=True)
regen_assets=[]
for a in regen['assets']:
 rows=db.execute('select raw_path,raw_sha256 from captures where head=4892017 and raw_sha256=?',(a['rawSha256'],)).fetchall(); assert len(rows)==1,(a['path'],len(rows))
 raw_path,dbhash=rows[0]; actual=sha(raw_path); assert actual==a['rawSha256']==dbhash
 item={'route':a['path'],'rawPath':raw_path,'rawSha256':actual,'rawHashMatchesReceipt':True}; o=a['object']
 if 'fieldByteOffset' in o:
  off=o['fieldByteOffset']; rawword=Path(raw_path).read_bytes()[off:off+4]; value=struct.unpack('<f',rawword)[0]
  item.update({'field':o.get('field'),'fieldByteOffset':off,'bytesHex':rawword.hex(),'rawFloat32':value,'receiptValue':o.get('namedEntryValue',o.get('value')),'rawValueMatchesReceipt':value==o.get('namedEntryValue',o.get('value'))})
 regen_assets.append(item)
assert all(x['rawValueMatchesReceipt'] for x in regen_assets if 'rawValueMatchesReceipt' in x)
constpath=REPORT/'site-constants-live-byte-sym-audit-2026-09-23.json'
input_review=json.loads((ROOT/'reference-data/provenance/frosty-site-input-review-2026-09-23.json').read_text())
report={'schemaVersion':1,'date':'2026-09-23','buildHead':4892017,
 'scope':'Remaining base numeric inputs and global-by-site constants; excludes projectile/zeroing, attachment composition, and reload/RPM timing investigations assigned elsewhere.',
 'inputs':{'weaponsSha256':sha(ROOT/'data/weapons.json'),'balanceTablesSha256':sha(ROOT/'data/balance_tables.json'),'hitZonesSha256':sha(ROOT/'data/hit_zones.json'),'inputReviewSha256':sha(ROOT/'reference-data/provenance/frosty-site-input-review-2026-09-23.json'),'spreadReceiptSha256':sha(ROOT/'reference-data/provenance/frosty-site-spread-reviewed-2026-09-23.json'),'regenReceiptSha256':sha(ROOT/'reference-data/provenance/frosty-regen-2026-09-23.json')},
 'hipAdsIdleTiming':{'siteWeaponCount':63,'matchedRows':len(idle_rows),'exactMatchCount':sum(r['siteMatchesRawDecodedValue'] for r in idle_rows),
  'sourceFieldPaths':{'ADS':'GS /Field_0a5922e0/{Field_6b84de87,Field_7b609515}/{Field_0a160c57,Field_447d6d51}/Field_af333987','HIP':'GS /Field_0a5922e0/Field_7b609515/{Field_0a160c57,Field_447d6d51}/Field_af333987'},
  'distributions':{'ADS_idleTime':{'0.4':126},'HIP_idleTime':{'0.6':110,'1.2':4,'1.8':12}},'hipOutlierWeapons':{'1.2':['m87a1','db12'],'1.8':['interdictor','l115','m2010esr','psr','miniscout','sv98']},
  'sitePath':'data/weapons.json /<weapon>/spreadDyn/{ads,hip}/idleTime','consumerCheck':{'simReferenceCount':0,'result':'No sim/*.js consumer; current display does not depend on idleTime.'},
  'rawSourceBodiesVerified':len(verified),'rawBodyMatches':sum(v['match'] for v in verified.values()),'rows':idle_rows,'sourceAssets':list(verified.values()),
  'limits':['GS paths and registry associations are recorded in the spread audit. Source presence does not prove runtime timing consumption.','Hip idleTime varies for eight weapons (two at 1.2 s, six at 1.8 s); current Analyzer stores these values but does not consume them in sim/*.js.']},
 'regenDelay':{'sitePath':'data/balance_tables.json HEALTH_REGEN_DELAY_S; sim/applyAttachments.js:47,437','siteBaseSeconds':5,'sourceField':'GRX_Glacier_Soldier named entry RegenerationDelay / Field_42c8b257','ammoAdditionsSeconds':{'frangible':4,'M1014_flechette':2},'rawAssets':regen_assets,
  'siteExposure':'Base 5 s plus matching ammo healthRegenDelayAddS in Analyzer resolver; source establishes configured operands and links only.','runtimeUnknown':['native addition','activation trigger','reset-after-damage behavior','runtime applicability']},
 'fixedMultipliers':{'detailReport':str(constpath),'detailSha256':sha(constpath),'values':{'RELOAD_SPEED_MULTIPLIERS':[1,1.13,1.277],'VELOCITY_LADDER':0.8},'rawNamedOperands':constants['namedOperands'],'assessment':'P10/P20 reload and M05/M10/M15/P05 velocity operands have raw offsets/bytes/hashes. Modifier layouts, binding/priority and native application remain unresolved.'},
 'hitZones':{'sitePath':'data/hit_zones.json /weapons/{weapon}/ammo/*/{headshot,limb}','ledgerStatus':'Broad review pending rows; existing source receipt maps 63 site weapons and 328 ammo choices to MP material grids.','sourceReceipt':'reference-data/provenance/frosty-hit-zones-2026-09-15.json','assessment':'Ledger pending reflects incomplete evidence joining. Receipt maps WB projectile material, ammo modifier/protection steps, and MP material-grid arrays. Mapping alone does not prove native damage application.'},
 'remainingBaseFields':{'weaponDamageCurve':'data/weapons.json /{weapon}/dmg/*/{r,d}: 417 ranges and 417 damage values remain pending in broad ledger; older source receipt is 1.4.2.5. Current 1.4.3.0 comparison belongs to damage/projectile follow-up.','ammoBindings':'data/ammo.json /WEAPON_AMMO/{weapon}/def: 63 rows; exact selector/default source joins not established here.','weaponBaseVelocity':'data/weapons.json /{weapon}/bulletVel: 63 values; delegated to projectile/velocity audit.','weaponRateAndMagazine':'data/weapons.json /{weapon}/{rpm,mag}: 63 each; RPM delegated to timing audit; magazine source/coupling unresolved here.'},
 'broadReviewLedger':{'path':input_review['details']['path'],'sha256':input_review['details']['sha256'],'complete':input_review['complete'],'pendingReviewRows':input_review['rowCounts']['pending-review']},
 'limits':['No production data or simulator code changed.','Raw presence does not establish native consumer behavior.','No broad review statuses were modified.']}
OUT.write_text(json.dumps(report,indent=2)+'\n')
compact={'schemaVersion':1,'date':'2026-09-23','buildHead':4892017,'detailReport':str(OUT),'detailReportSha256':sha(OUT),'sourceInputs':report['inputs'],
 'hipAdsIdleTiming':{k:v for k,v in report['hipAdsIdleTiming'].items() if k not in ('rows','sourceAssets')},'regenDelay':{k:v for k,v in report['regenDelay'].items() if k!='rawAssets'},
 'fixedMultipliers':{k:v for k,v in report['fixedMultipliers'].items() if k!='rawNamedOperands'},'hitZones':report['hitZones'],'remainingBaseFields':report['remainingBaseFields'],
 'rawFieldDetails':'External report contains current GS raw body hash and per-idle-field byte offset/raw bytes; regeneration asset hashes and raw float32 bytes were rechecked against current captures.'}
COMPACT.write_text(json.dumps(compact,indent=2)+'\n')
print(json.dumps({'detail':str(OUT),'detailSha256':sha(OUT),'compact':str(COMPACT),'idleRows':len(idle_rows),'idleExact':sum(r['siteMatchesRawDecodedValue'] for r in idle_rows),'uniqueGsBodyHashesVerified':len(verified),'regenFieldBytes':[(x['route'],x.get('bytesHex'),x.get('rawFloat32')) for x in regen_assets if 'bytesHex' in x]},indent=2))

