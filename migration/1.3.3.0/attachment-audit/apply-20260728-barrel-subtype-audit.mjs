import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('migration/1.3.3.0/attachment-audit');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(root,n),`${JSON.stringify(v,null,2)}\n`);
const fixes=new Map([
 ['DRS-IAR|15',{subtype:'Extended',name:'20" LE'}],['DRS-IAR|16',{subtype:'Heavy Ext'}],['DRS-IAR|17',{subtype:'Short'}],
 ['L110|14',{subtype:'Heavy Ext'}],['L115|11',{subtype:'Extended'}],['L115|12',{subtype:'Short'}],
 ['L85A3|15',{subtype:'Extended'}],['M121 A2|13',{subtype:'Short'}],['M121 A2|14',{subtype:'Heavy Ext'}],
 ['M123K|13',{subtype:'Heavy Ext'}],['M123K|14',{subtype:'Short'}],['M2010 ESR|12',{subtype:'Extended'}],
 ['M250|14',{subtype:'Heavy Ext'}],['M39 EMR|14',{subtype:'Extended'}],
 ['Mini Scout|13',{subtype:'Extended'}],['Mini Scout|14',{subtype:'Short'}],['PSR|11',{subtype:'Extended'}],
 ['RPK-74M|15',{subtype:'Short'}],['RPKM|15',{subtype:'Extended'}],['RPKM|16',{subtype:'Short'}],
 ['SL9|15',{subtype:'Heavy Ext'}],['SV-98|8',{subtype:'Extended'}],['SVDM|12',{subtype:'Short'}],
 ['UMG-40|15',{subtype:'Heavy Ext'}],
 ['M433|13',{velocity:787}],['M433|14',{velocity:504,name:'14.5" STANDARD'}],
]);
const verifiedExceptions=new Set(['GRT-CPS|13','M240L|11','M60|14','PP-19|10','RPK-74M|14','RPKM|14','SVK-8.6|12']);
const review=read('attachment-screenshot-review.json');
const pathMoves=new Map(); const changed=[];
const safeSubtype=s=>s.replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
for(const row of review.records.filter(r=>r.attachmentType==='Barrel'&&r.stats)){
 const key=`${row.weaponName}|${row.source.captureOrder}`; const fix=fixes.get(key);
 if(fix){
  const before={name:row.attachmentName,subtype:row.attachmentSubtype,velocity:row.stats.muzzleVelocityMps,path:row.source.currentPath};
  if(fix.name!==undefined)row.attachmentName=fix.name;
  if(fix.subtype!==undefined){row.attachmentSubtype=fix.subtype;const filename=`${row.source.captureOrder}_${row.weaponName}_Barrel_${safeSubtype(fix.subtype)}.png`;const next=path.join(path.dirname(row.source.currentPath),filename);pathMoves.set(path.resolve(row.source.currentPath).toLowerCase(),next);row.source.currentPath=next;row.source.proposedFilename=filename;}
  if(fix.velocity!==undefined)row.stats.muzzleVelocityMps=fix.velocity;
  row.mappingReviewStatus='visually-checked';row.notes=[...new Set([...(row.notes??[]),'Barrel subtype and displayed velocity were visually reconciled against the selected in-game barrel tile and detailed stat panel on 2026-07-28.'])];
  changed.push({key,before,after:{name:row.attachmentName,subtype:row.attachmentSubtype,velocity:row.stats.muzzleVelocityMps,path:row.source.currentPath}});
 } else if(verifiedExceptions.has(key)) row.notes=[...new Set([...(row.notes??[]),'Verified exception: the selected in-game barrel tile confirms the recorded subtype even though its velocity ratio differs from the generic barrel multiplier classification.'])];
}
if(changed.length!==26)throw new Error(`Expected 26 corrected rows, got ${changed.length}`);
for(const [oldLower,next] of pathMoves){const current=[...changed].find(c=>path.resolve(c.before.path).toLowerCase()===oldLower)?.before.path;if(!current)continue;if(path.resolve(current).toLowerCase()===path.resolve(next).toLowerCase())continue;if(fs.existsSync(next))throw new Error(`Rename target exists: ${next}`);if(!fs.existsSync(current))throw new Error(`Rename source missing: ${current}`);fs.renameSync(current,next);}
review.generatedAt=new Date().toISOString();write('attachment-screenshot-review.json',review);

const mapPath=v=>pathMoves.get(path.resolve(v).toLowerCase())??path.resolve(v);
const manual=read('manual-review-overrides.json');
for(const row of review.records.filter(r=>r.attachmentType==='Barrel'&&(fixes.has(`${r.weaponName}|${r.source.captureOrder}`)||verifiedExceptions.has(`${r.weaponName}|${r.source.captureOrder}`)))){
 const key=`${row.weaponName}|${row.source.captureOrder}`;const fix=fixes.get(key);
 let override=manual.overrides.find(o=>o.sourcePath&&mapPath(o.sourcePath).toLowerCase()===path.resolve(row.source.currentPath).toLowerCase());
 if(!override){override={weaponName:row.weaponName,attachmentType:'Barrel',attachmentName:row.attachmentName,sourcePath:row.source.currentPath,sourceFilename:path.basename(row.source.currentPath),updates:{},evidence:[]};manual.overrides.push(override);}
 override.sourcePath=row.source.currentPath;override.sourceFilename=path.basename(row.source.currentPath);override.attachmentName=row.attachmentName;override.updates={...(override.updates??{})};
 if(fix){if(fix.name!==undefined)override.updates.attachmentName=row.attachmentName;if(fix.subtype!==undefined)override.updates.attachmentSubtype=row.attachmentSubtype;if(fix.velocity!==undefined)override.updates.muzzleVelocityMps=row.stats.muzzleVelocityMps;}
 override.mappingReviewStatus='visually-checked';override.evidence=[...new Map([...(override.evidence??[]),{kind:'direct-barrel-subtype-screenshot-review',reviewDate:'2026-07-28'}].map(x=>[JSON.stringify(x),x])).values()];
}
manual.generatedAt=new Date().toISOString();write('manual-review-overrides.json',manual);
for(const name of ['raw-ocr.json','panel-ocr.json','value-ocr.json','cost-ocr.json','recoil-ocr.json','recoil-value-ocr.json','stat-comparisons.json','field-ocr.json','highlight-cards.json']){const f=path.join(root,name);if(!fs.existsSync(f))continue;const rows=read(name);for(const r of rows)if(r.sourcePath){const next=mapPath(r.sourcePath);if(next!==path.resolve(r.sourcePath)){r.sourcePath=next;if('sourceName'in r)r.sourceName=path.basename(next);}}write(name,rows);}
for(const name of ['rename-manifest.json','rename-provenance.json']){const doc=read(name);const rows=Array.isArray(doc)?doc:doc.entries??[];for(const r of rows){for(const k of ['sourcePath','targetPath','currentPath'])if(r[k])r[k]=mapPath(r[k]);if(r.sourceFilename&&r.sourcePath)r.sourceFilename=path.basename(mapPath(path.join(path.dirname(r.sourcePath),r.sourceFilename)));if(r.targetFilename&&r.targetPath)r.targetFilename=path.basename(mapPath(path.join(path.dirname(r.targetPath),r.targetFilename)));}write(name,doc);}
console.log(JSON.stringify({corrected:changed.length,subtypeCorrections:[...fixes.values()].filter(x=>x.subtype).length,verifiedExceptions:[...verifiedExceptions],changed},null,2));
