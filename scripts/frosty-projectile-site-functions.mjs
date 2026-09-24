import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const argv = process.argv.slice(2);
if (argv[0] === '--zeroing') {
 const opts={};
 for(let i=1;i<argv.length;i+=2){if(!['--root','--weapons','--out'].includes(argv[i])||!argv[i+1])throw Error('Invalid zeroing option');opts[argv[i]]=argv[i+1];}
 for(const key of ['--root','--weapons','--out'])if(!opts[key])throw Error('Missing '+key);
 const root=path.resolve(opts['--root']),out=path.resolve(opts['--out']);
 if(fs.existsSync(out))throw Error('Refusing to overwrite '+out);
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const {applyAttachments,setAttachmentContext}=await import(pathToFileURL(path.join(root,'sim/applyAttachments.js')));
 const {resetAttsForWeapon}=await import(pathToFileURL(path.join(root,'sim/loadout.js')));
 const {trajectoryAtDistance,zeroRelativeVerticalOffset}=await import(pathToFileURL(path.join(root,'sim/ballistics.js')));
 const weapons=read('data/weapons.json'),attachments=read('data/attachments.json'),ammo=read('data/ammo.json'),balls=read('data/ballistics.json');
 setAttachmentContext({...attachments,...ammo,...read('data/balance_tables.json'),HIT_ZONES:read('data/hit_zones.json')});
 const ui=fs.readFileSync(path.join(root,'ui/app.js'),'utf8');
 if(!ui.includes('const resolved = Number.isFinite(value) ? value : 0;')||!ui.includes('const zeroes = [100, 200, 300, 400, 500];'))throw Error('UI fallback or zero options changed; review probe');
 const rows=[];
 for(const id of opts['--weapons'].split(',')){
  const raw=weapons.find(w=>w.id===id);if(!raw||!['DMR','Sniper Rifle'].includes(raw.cls))throw Error('Not a zeroable site ID: '+id);
  const defaults={};resetAttsForWeapon(defaults,raw,{...attachments,...ammo});
  for(const ammoId of Object.keys(ammo.WEAPON_AMMO[id].ammo)){
   const atts={...defaults,ammo:ammoId},w=applyAttachments(raw,atts);
   const route=balls.weapons[id].ammo[ammoId];
   if(!route)throw Error(`Selected UI projectile route missing: ${id}/${ammoId}`);
   const model={...balls.projectiles[route],velocityMps:w._projectileVelocityMps};
   for(const zero of [100,200,300,400,500]){
    const current=zeroRelativeVerticalOffset(model,100,zero);
    let low=0,high=.2;
    const highPoint=trajectoryAtDistance(model,zero,high);
    if(!highPoint||highPoint.yMeters<0)throw Error('Comparison bracket insufficient');
    for(let i=0;i<44;i++){const mid=(low+high)/2,p=trajectoryAtDistance(model,zero,mid);if(!p)throw Error('Trajectory unavailable');if(p.yMeters<0)low=mid;else high=mid;}
    const angle=(low+high)/2;
    rows.push({id,ammoId,siteResetAmmo:defaults.ammo,atts,route,model,zeroMeters:zero,
     siteBracketHighAtZero:trajectoryAtDistance(model,zero,.1),currentOffsetAt100:current,
     currentUiOffsetAt100:Number.isFinite(current)?current:0,comparisonAngleRadians:angle,
     comparisonAtZero:trajectoryAtDistance(model,zero,angle),
     offsets:[5,100,200,300].map(distance=>({distance,current:zeroRelativeVerticalOffset(model,distance,zero),comparison:trajectoryAtDistance(model,distance,angle)}))});
   }
  }
 }
 const files=['sim/ballistics.js','sim/applyAttachments.js','sim/loadout.js','ui/app.js','data/weapons.json','data/attachments.json','data/ammo.json','data/balance_tables.json','data/hit_zones.json','data/ballistics.json','scripts/frosty-projectile-lifetime.py','scripts/frosty-projectile-site-functions.mjs'];
 const report={mode:'zeroing',arguments:argv,rows,failedCases:rows.filter(r=>r.currentOffsetAt100===null).map(r=>({id:r.id,ammoId:r.ammoId,zeroMeters:r.zeroMeters,angle:r.comparisonAngleRadians,comparisonOffsetAt100:r.offsets[1].comparison.yMeters})),inputs:files.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')})),limits:['Software model and UI fallback check, not native zeroing behavior.','Comparison uses the same trajectory solver with a wider bracket; it does not validate the native gravity/drag equation.','Site reset loadouts are application defaults. Each listed ammo is selected with those other defaults; other attachment combinations are not covered.']};
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({out,cases:rows.length,failedCases:report.failedCases}));
} else if (argv[0] === '--consistency') {
 const opts={};
 for(let i=1;i<argv.length;i++){
  const key=argv[i];
  if(!['--root','--range-report','--prior-site-check','--out'].includes(key)||!argv[i+1])throw new Error(`unexpected or incomplete option ${key}`);
  const name={'--root':'root','--range-report':'rangeReport','--prior-site-check':'priorSiteCheck','--out':'out'}[key];
  if(opts[name])throw new Error(`duplicate option ${key}`);
  opts[name]=argv[++i];
 }
 for(const key of ['root','rangeReport','priorSiteCheck','out'])if(!opts[key])throw new Error(`consistency mode requires --${key==='root'?'root':key==='rangeReport'?'range-report':key==='priorSiteCheck'?'prior-site-check':'out'}`);
 const root=path.resolve(opts.root), rangePath=path.resolve(opts.rangeReport), priorPath=path.resolve(opts.priorSiteCheck), outPath=path.resolve(opts.out);
 if(fs.existsSync(outPath))throw new Error(`refusing to overwrite ${outPath}`);
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const helperPath=fileURLToPath(import.meta.url);
 const report=read(rangePath), prior=read(priorPath);
 const {resolveAmmoVelocity}=await import(pathToFileURL(path.resolve(root,'sim/applyAttachments.js')));
 const {flightTimeAtDistance,trajectoryAtDistance}=await import(pathToFileURL(path.resolve(root,'sim/ballistics.js')));
 const weapons=read(path.resolve(root,'data/weapons.json'));
 const ammo=read(path.resolve(root,'data/ammo.json')).WEAPON_AMMO;
 const balls=read(path.resolve(root,'data/ballistics.json'));
 const ui=fs.readFileSync(path.resolve(root,'ui/app.js'),'utf8');
 if(report.cases?.length!==328||prior.selectionChecks!==328||prior.candidates?.length!==32)throw new Error('expected the recorded 328 selection checks and 32 conditional L25 candidates');
 if(!ui.includes('const TARGET_DISTANCE_MIN = 5;')||!ui.includes('const TARGET_DISTANCE_MAX = 300;')||!ui.includes("return cls.includes('Sniper Rifle') ? 200 : 90;"))throw new Error('supported UI range constants changed');
 const candidates=new Map(prior.candidates.map(c=>[`${c.siteId}/${c.ammoId}`,c]));
 let chartPoints=0,targetPoints=0,chartGuard=0,targetGuard=0,roundedFlightDifferences=0,chartMax=null,targetMax=null;
 let feasibleTarget=0,feasibleTtkChart=0,ttlMax=null;
 const perCase=[];
 for(const c of report.cases){
  const w=weapons.find(x=>x.id===c.siteId),selected=balls.weapons[c.siteId];
  if(!w||!selected||(selected.ammo[c.ammoId]??selected.base)!==c.projectileRoute)throw new Error(`projectile route mismatch ${c.siteId}/${c.ammoId}`);
  const v=resolveAmmoVelocity({baseVelocityMps:w.bulletVel,treatment:ammo[c.siteId]?.velocityTreatments?.[c.ammoId],velocityLadder:0.8}).velocity;
  if(Math.abs(v-c.siteVelocityMps)>1e-9)throw new Error(`recorded site velocity mismatch ${c.siteId}/${c.ammoId}`);
  const projectile=balls.projectiles[c.projectileRoute],model={...projectile,velocityMps:v};
  const level300=flightTimeAtDistance(model,300);
  if(Math.abs(level300-c.levelShotFlightTimeTo300s)>1e-9)throw new Error(`recorded level-time mismatch ${c.siteId}/${c.ammoId}`);
  const chartMaxM=w.cls==='Sniper Rifle'?200:90;
  let caseChart=null,caseTarget=null,guardedChart=0,guardedTarget=0;
  for(let distance=0;distance<=300;distance++){
   const level=flightTimeAtDistance(model,distance),vector=trajectoryAtDistance(model,distance,0);
   if(level==null)throw new Error(`level-time null ${c.siteId}/${distance}`);
   if(!vector){if(distance<=chartMaxM)guardedChart++;if(distance>=5)guardedTarget++;continue;}
   const delta=Math.abs(vector.timeSeconds-level)*1000;
   const sample={distanceM:distance,levelSeconds:level,vectorSeconds:vector.timeSeconds,deltaMilliseconds:delta,roundedLevelFlightMs:Math.round(level*1000),roundedVectorFlightMs:Math.round(vector.timeSeconds*1000)};
   if(distance<=chartMaxM){chartPoints++;if(sample.roundedLevelFlightMs!==sample.roundedVectorFlightMs)roundedFlightDifferences++;if(!caseChart||delta>caseChart.deltaMilliseconds)caseChart=sample;if(!chartMax||delta>chartMax.deltaMilliseconds)chartMax={siteId:c.siteId,ammoId:c.ammoId,route:c.projectileRoute,weaponClass:w.cls,chartMaxM,...sample};}
   if(distance>=5){targetPoints++;if(!caseTarget||delta>caseTarget.deltaMilliseconds)caseTarget=sample;if(!targetMax||delta>targetMax.deltaMilliseconds)targetMax={siteId:c.siteId,ammoId:c.ammoId,route:c.projectileRoute,weaponClass:w.cls,targetViewRangeM:[5,300],...sample};}
  }
  chartGuard+=guardedChart;targetGuard+=guardedTarget;
  const ttl=c.ttlSecondsConfigured,priorCandidate=candidates.get(`${c.siteId}/${c.ammoId}`);
  let ttlSensitivity=null;
  if(c.conditionalLifetimeBoundaryAtOrBefore300m){
   if(!priorCandidate||Math.abs(priorCandidate.sourceLifetime-ttl)>1e-9)throw new Error(`conditional candidate missing from prior site-function check ${c.siteId}/${c.ammoId}`);
   const vectorAtTargetMax=trajectoryAtDistance(model,300,0),vectorAtChartMax=trajectoryAtDistance(model,chartMaxM,0);
   const targetReachable=!!vectorAtTargetMax&&vectorAtTargetMax.timeSeconds>=ttl;
   const chartReachable=!!vectorAtChartMax&&vectorAtChartMax.timeSeconds>=ttl;
   if(targetReachable)feasibleTarget++;if(chartReachable)feasibleTtkChart++;
   const boundaryDelta=Math.abs(priorCandidate.vectorBoundary-priorCandidate.levelBoundary);
   if(!ttlMax||boundaryDelta>ttlMax.deltaMeters)ttlMax={siteId:c.siteId,ammoId:c.ammoId,sourceLifetimeSeconds:ttl,levelBoundaryMeters:priorCandidate.levelBoundary,vectorBoundaryMeters:priorCandidate.vectorBoundary,deltaMeters:boundaryDelta};
   ttlSensitivity={sourceLifetimeSeconds:ttl,conditionalVectorBoundaryMeters:priorCandidate.vectorBoundary,conditionalLevelBoundaryMeters:priorCandidate.levelBoundary,conditionalBoundaryDifferenceMeters:boundaryDelta,withinTargetView5To300m:priorCandidate.vectorBoundary>=5&&priorCandidate.vectorBoundary<=300,withinTtkChartRange:priorCandidate.vectorBoundary<=chartMaxM,vectorTimeAtTargetMaxSeconds:vectorAtTargetMax?.timeSeconds??null,vectorTimeAtTtkChartMaxSeconds:vectorAtChartMax?.timeSeconds??null};
  }
  perCase.push({siteId:c.siteId,ammoId:c.ammoId,route:c.projectileRoute,projectileGuid:c.projectileGuid,sourceCaptureId:c.sourceCaptureId,sourceRawSha256:c.sourceRawSha256,velocityMps:v,dragPerMeter:projectile.dragPerMeter,gravityMps2:projectile.gravityMps2,weaponClass:w.cls,ttkChartMaxM:chartMaxM,maxChartPointDifference:caseChart,maxTargetViewPointDifference:caseTarget,guardedChartPoints:guardedChart,guardedTargetPoints:guardedTarget,conditionalTtl:ttlSensitivity});
 }
 const inputs=[rangePath,priorPath,...['sim/ballistics.js','sim/applyAttachments.js','sim/damage.js','ui/app.js','data/weapons.json','data/ammo.json','data/ballistics.json'].map(p=>path.resolve(root,p)),helperPath];
 const result={schemaVersion:1,mode:'consistency',readOnly:true,arguments:process.argv.slice(2),build:{head:4892017,descriptorSha256:'91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2'},selectionChecks:report.cases.length,comparison:{method:'For every recorded L25 selected site weapon/ammo case, compare current flightTimeAtDistance(model,d) against trajectoryAtDistance(model,d,0). Verify exact selected route, current resolved velocity, and recorded level time first. Scan integer points 0..current TTK chart cap (90m; 200m for Sniper Rifle) and target-view points 5..300m.',ttkChart:{pointCount:chartPoints,guardedBy30SecondLimit:chartGuard,roundedStandaloneFlightMsDifferentPointCount:roundedFlightDifferences,maxAbsoluteDifference:chartMax,ttkDisplay:'TTK combines level-flight seconds with firing/ADS terms and rounds the total to integer milliseconds. Report the helper delta and standalone rounded-flight point count; do not infer combined TTK display differences without reproducing those other terms.'},targetView:{pointCount:targetPoints,guardedBy30SecondLimit:targetGuard,maxAbsoluteDifference:targetMax,display:'Target view uses vector trajectory/drop and does not display travel time.'}},conditionalLifetimeSensitivity:{recordedL25CandidateCount:prior.candidates.length,conditionallyReachableAtTargetViewMax300m:feasibleTarget,conditionallyReachableWithinTtkChartRange:feasibleTtkChart,maxRecordedLevelVectorBoundaryDifference:ttlMax,filter:'Configured source lifetime seconds compared only with modeled site-function reachability. Boundary is in the supported range only if 5m <= recorded vector boundary <= 300m; TTK-chart filter also requires the boundary <= that weapon class chart maximum. This does not assert runtime expiry.'},cases:perCase,sha256:Object.fromEntries(inputs.map(p=>[p,digest(p)])),limitations:['The scalar helper models exact level-horizontal drag timing; the vector helper includes gravity and total-speed drag. Different outputs reflect distinct model assumptions.','No runtime loadout, engine travel time, native activation, or expiry operation is established. L25 source TimeToLive remains conditional seconds.','Null vector solver values at its 30-second guard are excluded from time differences and counted separately.']};
 fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({out:outPath,selectionChecks:result.selectionChecks,ttkPoints:chartPoints,ttkGuarded:chartGuard,targetPoints,targetGuard,roundedFlightDifferences,chartMax,targetMax,conditionalLifetimeSensitivity:result.conditionalLifetimeSensitivity}));
} else {
const [root, reportPath, outPath] = argv;
if (!root || !reportPath || !outPath) throw new Error('usage: node frosty-projectile-site-functions.mjs ANALYZER_ROOT RANGE_REPORT OUT_JSON');
if (fs.existsSync(outPath)) throw new Error(`refusing to overwrite ${outPath}`);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const {resolveAmmoVelocity}=await import(pathToFileURL(root+'/sim/applyAttachments.js'));
const {flightTimeAtDistance,trajectoryAtDistance}=await import(pathToFileURL(root+'/sim/ballistics.js'));
const {damagePerShotAtRange}=await import(pathToFileURL(root+'/sim/damage.js'));
const report=read(reportPath), weapons=read(root+'/data/weapons.json'), ammo=read(root+'/data/ammo.json').WEAPON_AMMO, balls=read(root+'/data/ballistics.json');
const checks=[];
for(const c of report.cases){
 const w=weapons.find(w=>w.id===c.siteId), mapped=balls.weapons[c.siteId];
 if((mapped.ammo[c.ammoId]??mapped.base)!==c.projectileRoute)throw Error('route mismatch '+c.siteId+'/'+c.ammoId);
 const v=resolveAmmoVelocity({baseVelocityMps:w.bulletVel,treatment:ammo[c.siteId]?.velocityTreatments?.[c.ammoId],velocityLadder:0.8}).velocity;
 if(Math.abs(v-c.siteVelocityMps)>1e-9)throw Error('velocity mismatch');
 const model={...balls.projectiles[c.projectileRoute],velocityMps:v};
 const t=flightTimeAtDistance(model,300);if(Math.abs(t-c.levelShotFlightTimeTo300s)>1e-9)throw Error('time mismatch');
 if(c.conditionalLifetimeBoundaryAtOrBefore300m){let lo=0,hi=300;for(let i=0;i<40;i++){let mid=(lo+hi)/2;if(trajectoryAtDistance(model,mid).timeSeconds<c.ttlSecondsConfigured)lo=mid;else hi=mid;}checks.push({siteId:c.siteId,ammoId:c.ammoId,velocity:v,sourceLifetime:c.ttlSecondsConfigured,levelBoundary:c.levelShotDistanceAtConfiguredTtlM,vectorBoundary:(lo+hi)/2,vectorTime300:trajectoryAtDistance(model,300).timeSeconds});}
}
const weapon=weapons.find(w=>w.id==='ks18k');
const l22=[];
for(const id of ['buckshot','slugs']){
 const sourceCase=report.cases.find(c=>c.siteId==='ks18k' && c.ammoId===id);
 if(!sourceCase)throw Error('missing source lifetime '+id);
 const ttl=sourceCase.ttlSecondsConfigured;
 const route=balls.weapons.ks18k.ammo[id], proj=balls.projectiles[route], m={velocityMps:weapon.bulletVel,...proj};
 const eff={...weapon,...(ammo.ks18k.projectileOverrides[id]??{})};
 const samples=[100,150,160,200,300].map(range=>({range,levelTime:flightTimeAtDistance(m,range),vectorTrajectory:trajectoryAtDistance(m,range),allPelletsDamage:damagePerShotAtRange(eff,range)}));
 let low=0,high=1000;for(let i=0;i<40;i++){const mid=(low+high)/2;if((trajectoryAtDistance(m,mid)?.timeSeconds??Infinity)>ttl)high=mid;else low=mid;}
 l22.push({id,projectile:route,model:m,sourceTtlCandidate:ttl,levelCutoffMeters:Math.log1p(m.dragPerMeter*m.velocityMps*ttl)/m.dragPerMeter,vectorCutoffMeters:(low+high)/2,samples});
}
const paths=['sim/ballistics.js','sim/damage.js','sim/applyAttachments.js','data/weapons.json','data/ammo.json','data/ballistics.json'];
const result={selectionChecks:report.cases.length,method:'Exact current site projectile mapping, resolveAmmoVelocity and flightTimeAtDistance verified for every selection; vector boundaries calculated only for conditional candidates. No barrel modifiers.',candidates:checks,l22ShotgunSamples:l22,sources:paths.map(p=>({path:p,sha256:digest(root+'/'+p)}))};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({verified:report.cases.length,candidates:checks.length,l22:l22.length},null,2));

}
