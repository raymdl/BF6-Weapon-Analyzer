import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [root, reportPath, outPath] = process.argv.slice(2);
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
