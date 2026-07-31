import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('outputs/attachment-audit');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(root,n),`${JSON.stringify(v,null,2)}\n`);
const fixes=new Map([
 ['GRT-CPS|42',{name:'15Rnd Magazine',size:15}],['GRT-CPS|43',{name:'30Rnd Magazine',size:30}],
 ['LMR27|42',{name:'15Rnd Magazine',size:15}],['LMR27|43',{name:'15Rnd Fast Mag',size:15}],['LMR27|44',{name:'20Rnd Magazine',size:20}],['LMR27|45',{name:'20Rnd Fast Mag',size:20}],
 ['M39 EMR|41',{name:'15Rnd Fast Mag',size:15}],['M39 EMR|43',{name:'15Rnd Magazine',size:15}],['M39 EMR|44',{name:'25Rnd Magazine',size:25}],
 ['M433|37',{name:'20Rnd Fast Mag',size:20}],['M433|38',{name:'20Rnd Magazine',size:20}],['M433|40',{name:'36Rnd Magazine',size:36}],['M433|41',{name:'40Rnd Magazine',size:40}],['M433|42',{name:'40Rnd Fast Mag',size:40}],
 ['SVDM|42',{name:'20Rnd Magazine',size:20}],['VSSM|26',{name:'10Rnd Magazine',size:10}],['VSSM|29',{name:'30Rnd Magazine',size:30}],
 ['M240L|35',{name:'50RND LOOSE BELT',size:50,filename:'35_M240L_Magazine_50RND_LOOSE_BELT.png'}],
 ['M60|39',{name:'100RND BELT POUCH',size:100,filename:'39_M60_Magazine_100RND_BELT_POUCH.png'}],
 ['M417 A2|37',{name:'10Rnd Magazine',size:10,filename:'37_M417 A2_Magazine_10Rnd_Magazine.png'}],
 ['SGX|32',{name:'41Rnd Magazine',subtype:'Magazine',size:41,reload:2.517,filename:'32_SGX_Magazine_41Rnd_Magazine.png'}],
]);
const legitimate=new Set(['M1014|27','M1014|56','M87A1|28']);
const review=read('attachment-screenshot-review.json');
const pathMoves=new Map(); const changed=[];
for(const row of review.records.filter(r=>r.attachmentType==='Magazine'&&r.stats)){
 const key=`${row.weaponName}|${row.source.captureOrder}`; const fix=fixes.get(key);
 if(fix){const before={name:row.attachmentName,size:row.stats.magazineSize,reload:row.stats.reloadTimeSeconds,path:row.source.currentPath};row.attachmentName=fix.name;if(fix.subtype!==undefined)row.attachmentSubtype=fix.subtype;row.stats.magazineSize=fix.size;if(fix.reload!==undefined)row.stats.reloadTimeSeconds=fix.reload;if(fix.filename){const next=path.join(path.dirname(row.source.currentPath),fix.filename);pathMoves.set(path.resolve(row.source.currentPath).toLowerCase(),next);row.source.currentPath=next;row.source.proposedFilename=fix.filename;}if(key==='SGX|32')delete row.statComparisons?.reloadTimeSeconds;row.mappingReviewStatus='visually-checked';row.notes=[...new Set([...(row.notes??[]),'Magazine identity and displayed capacity were visually reconciled against the source screenshot on 2026-07-28.'])];changed.push({key,before,after:{name:row.attachmentName,size:row.stats.magazineSize,reload:row.stats.reloadTimeSeconds,path:row.source.currentPath}});}
 else if(legitimate.has(key)){row.notes=[...new Set([...(row.notes??[]),'Verified exception: the speedloader attachment name describes rounds loaded, while magazineSize retains the separately displayed weapon capacity.'])];}
}
if(changed.length!==21)throw new Error(`Expected 21 corrected rows, got ${changed.length}`);
review.generatedAt=new Date().toISOString();write('attachment-screenshot-review.json',review);

const mapPath=v=>pathMoves.get(path.resolve(v).toLowerCase())??path.resolve(v);
const manual=read('manual-review-overrides.json');
for(const row of review.records.filter(r=>r.attachmentType==='Magazine'&&(fixes.has(`${r.weaponName}|${r.source.captureOrder}`)||legitimate.has(`${r.weaponName}|${r.source.captureOrder}`)))){
 const key=`${row.weaponName}|${row.source.captureOrder}`;const fix=fixes.get(key);
 let override=manual.overrides.find(o=>o.sourcePath&&mapPath(o.sourcePath).toLowerCase()===path.resolve(row.source.currentPath).toLowerCase());
 if(!override){override={weaponName:row.weaponName,attachmentType:'Magazine',attachmentName:row.attachmentName,sourcePath:row.source.currentPath,sourceFilename:path.basename(row.source.currentPath),updates:{},evidence:[]};manual.overrides.push(override);}
 override.sourcePath=row.source.currentPath;override.sourceFilename=path.basename(row.source.currentPath);override.attachmentName=row.attachmentName;override.updates={...(override.updates??{}),magazineSize:row.stats.magazineSize};
 if(fix){override.updates.attachmentName=row.attachmentName;if(fix.subtype!==undefined)override.updates.attachmentSubtype=fix.subtype;if(fix.reload!==undefined)override.updates.reloadTimeSeconds=fix.reload;if(key==='SGX|32'&&override.comparisons)delete override.comparisons.reloadTimeSeconds;}
 override.mappingReviewStatus='visually-checked';override.evidence=[...new Map([...(override.evidence??[]),{kind:'direct-magazine-capacity-screenshot-review',reviewDate:'2026-07-28'}].map(x=>[JSON.stringify(x),x])).values()];
}
manual.generatedAt=new Date().toISOString();write('manual-review-overrides.json',manual);

for(const name of ['raw-ocr.json','panel-ocr.json','value-ocr.json','cost-ocr.json','recoil-ocr.json','recoil-value-ocr.json','stat-comparisons.json','field-ocr.json','highlight-cards.json']){const f=path.join(root,name);if(!fs.existsSync(f))continue;const rows=read(name);for(const r of rows)if(r.sourcePath){const next=mapPath(r.sourcePath);if(next!==path.resolve(r.sourcePath)){r.sourcePath=next;if('sourceName'in r)r.sourceName=path.basename(next);}}write(name,rows);}
for(const name of ['rename-manifest.json','rename-provenance.json']){const doc=read(name);const rows=Array.isArray(doc)?doc:doc.entries??[];for(const r of rows){for(const k of ['sourcePath','targetPath','currentPath'])if(r[k])r[k]=mapPath(r[k]);if(r.sourceFilename)r.sourceFilename=path.basename(mapPath(path.join(path.dirname(r.sourcePath??r.currentPath),r.sourceFilename)));if(r.targetFilename)r.targetFilename=path.basename(mapPath(path.join(path.dirname(r.targetPath??r.currentPath),r.targetFilename)));}write(name,doc);}
console.log(JSON.stringify({corrected:changed.length,legitimate:[...legitimate],changed},null,2));
