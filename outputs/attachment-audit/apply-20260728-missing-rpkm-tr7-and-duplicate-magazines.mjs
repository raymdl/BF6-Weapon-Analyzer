import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('outputs/attachment-audit');
const reviewPath=path.join(root,'attachment-screenshot-review.json');
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const manualPath=path.join(root,'manual-review-overrides.json');
const manual=JSON.parse(fs.readFileSync(manualPath,'utf8'));
const oldRecords=[...review.records];
const norm=p=>path.resolve(p).toLowerCase();
const pathMoves=new Map();
const slug=s=>s.replace(/[^A-Za-z0-9-]+/g,'_').replace(/^_+|_+$/g,'');
const canonical=(dir,order,weapon,type,name)=>path.join(dir,`${order}_${weapon}_${type}_${slug(name)}.png`);

function setMove(oldPath,newPath){if(norm(oldPath)!==norm(newPath))pathMoves.set(norm(oldPath),path.resolve(newPath));}
function find(weapon,type,order){const r=review.records.find(x=>x.weaponName===weapon&&x.attachmentType===type&&x.source?.captureOrder===order);if(!r)throw new Error(`Missing ${weapon}|${type}|${order}`);return r;}

// Correct the visually confirmed duplicate-name magazine fallbacks.
const magazineFixes=[
  ['AK-205',40,'50Rnd Magazine',50,45],
  ['DRS-IAR',45,'50Rnd Magazine',50,45],['DRS-IAR',46,'60Rnd Magazine',60,55],
  ['RPKM',39,'60Rnd Magazine',60,30],['RPKM',40,'75Rnd Magazine',75,50],
];
for(const [weapon,order,name,size,cost] of magazineFixes){
  const r=find(weapon,'Magazine',order);r.attachmentName=name;r.attachmentSubtype='Magazine';r.attachmentCost=cost;r.stats.magazineSize=size;
  r.mappingReviewStatus='visually-checked';r.notes=[...new Set([...(r.notes??[]),'Duplicate-name fallback corrected by direct screenshot/grid review on 2026-07-28.'])];
}

// Shift existing records to make room, retaining their relative UI order.
for(const r of review.records.filter(x=>x.weaponName==='RPKM'&&x.source?.captureOrder>=27))r.source.captureOrder+=6;
for(const r of review.records.filter(x=>x.weaponName==='TR7'&&x.source?.captureOrder>=50))r.source.captureOrder+=(r.source.captureOrder===50?1:2);

const rpkmBase=find('RPKM','Grip',21);
const tr7Base=find('TR7','Laser',47);
const missingRoot=path.resolve('Weapon Attachments/Missing');
const rpkmDir=path.dirname(rpkmBase.source.currentPath);const tr7Dir=path.dirname(tr7Base.source.currentPath);
const specs=[
  {weapon:'RPKM',type:'Grip',order:27,name:'Folding Stubby',subtype:'Stubby',cost:20,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.27.44.62 (Medium).png',updates:{precision:36,control:51,mobility:44,adsTimeMs:250,sprintRecoveryMs:200,recoilAmountDegrees:0.6},desc:'Slightly reduces recoil and enables a slightly faster transition to aim down sights (ADS) at the cost of ADS accuracy while moving.'},
  {weapon:'RPKM',type:'Grip',order:28,name:'Ribbed Stubby',subtype:'Stubby',cost:30,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.27.45.96 (Medium).png',updates:{precision:36,control:51,mobility:48,adsTimeMs:250,sprintRecoveryMs:200,recoilAmountDegrees:0.6},desc:'Slightly reduces recoil and enables a slightly faster transition to aim down sights (ADS).'},
  {weapon:'RPKM',type:'Grip',order:29,name:'Canted Stubby',subtype:'Stubby',cost:30,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.27.47.47 (Medium).png',updates:{precision:36,control:55,mobility:44,adsTimeMs:250,sprintRecoveryMs:200,recoilAmountDegrees:0.5},desc:'Moderately reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS accuracy while moving.'},
  {weapon:'RPKM',type:'Grip',order:30,name:'Stippled Stubby',subtype:'Stubby',cost:35,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.28.23.08 (Medium).png',updates:{precision:36,control:58,mobility:42,adsTimeMs:250,adsMoveSpeedMultiplier:0.47,sprintRecoveryMs:200,recoilAmountDegrees:0.5},desc:'Significantly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of movement speed and accuracy.'},
  {weapon:'RPKM',type:'Grip',order:31,name:'Low-Profile Stubby',subtype:'Stubby',cost:45,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.28.24.99 (Medium).png',updates:{precision:36,control:62,mobility:42,adsTimeMs:250,adsMoveSpeedMultiplier:0.47,sprintRecoveryMs:200,recoilAmountDegrees:0.5},desc:'Greatly reduces recoil and enables a slightly faster transition to aim down sights (ADS) at the cost of movement speed and accuracy.'},
  {weapon:'RPKM',type:'Grip',order:32,name:'Slim Handstop',subtype:'Handstop',cost:15,file:'RPKM/Battlefield 6 Screenshot 2026.07.28 - 17.28.27.10 (Medium).png',updates:{precision:35,control:45,mobility:50,adsTimeMs:250,adsMoveSpeedMultiplier:0.54,sprintRecoveryMs:167,recoilAmountDegrees:0.7},desc:'Slightly increases weapon draw speed, and enables a slightly faster transition to aim down sights (ADS).'},
  {weapon:'TR7',type:'Laser',order:50,name:'5 MW Green',subtype:'Green Laser',cost:10,file:'TR7/Battlefield 6 Screenshot 2026.07.28 - 17.30.07.74 (Medium).png',updates:{hipfire:54},desc:'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'},
  {weapon:'TR7',type:'Laser',order:52,name:'50 MW Blue',subtype:'Blue Laser',cost:20,file:'TR7/Battlefield 6 Screenshot 2026.07.28 - 17.30.09.89 (Medium).png',updates:{hipfire:54,mobility:56},desc:'Provides slight improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'},
];
const makeCmp=(direction,effect)=>({direction,effect,color:direction==='up'?'green':'red',confidence:1,source:'direct-screenshot-review'});
for(const s of specs){
  const base=s.weapon==='RPKM'?rpkmBase:tr7Base;const dir=s.weapon==='RPKM'?rpkmDir:tr7Dir;const current=canonical(dir,s.order,s.weapon,s.type,s.name);const original=path.join(missingRoot,s.file);
  const stats={...base.stats,...s.updates};const statComparisons={};
  for(const [field,value] of Object.entries(s.updates)){const b=base.stats[field];if(Number.isFinite(value)&&Number.isFinite(b)&&value!==b)statComparisons[field]=makeCmp(value>b?'up':'down',value>b?'buff':'penalty');}
  const record={...base,weaponName:s.weapon,attachmentType:s.type,attachmentName:s.name,attachmentSubtype:s.subtype,attachmentCost:s.cost,attachmentDescription:s.desc,stats,statComparisons,reviewStatus:null,mappingReviewStatus:'visually-checked',notes:['Missing attachment captured and directly transcribed on 2026-07-28.'],source:{...base.source,captureOrder:s.order,currentPath:current,proposedFilename:path.basename(current),originalPath:original,originalFilename:path.basename(original),captureTimestamp:path.basename(original).match(/2026\.07\.28 - ([\d.]+)/)?.[1]??null}};
  review.records.push(record);setMove(original,current);
  manual.overrides.push({weaponName:s.weapon,attachmentType:s.type,attachmentName:s.name,sourcePath:current,sourceFilename:path.basename(current),updates:{attachmentName:s.name,attachmentSubtype:s.subtype,attachmentCost:s.cost,attachmentDescription:s.desc,stats},comparisons:statComparisons,replaceComparisons:true,mappingReviewStatus:'visually-checked',evidence:[{kind:'direct-missing-attachment-screenshot-review',sourceFilename:path.basename(original),reviewDate:'2026-07-28'}]});
}

// Recompute canonical paths after order/name changes and persist matching overrides.
for(const r of review.records){
  if(!['RPKM','TR7','AK-205','DRS-IAR'].includes(r.weaponName)||r.attachmentType==='Overview')continue;
  const dir=path.dirname(r.source.currentPath);const next=canonical(dir,r.source.captureOrder,r.weaponName,r.attachmentType,r.attachmentName);setMove(r.source.currentPath,next);r.source.currentPath=next;r.source.proposedFilename=path.basename(next);
  let o=manual.overrides.find(x=>x.sourcePath&&norm(x.sourcePath)===norm([...pathMoves.entries()].find(([,v])=>norm(v)===norm(next))?.[0]??next));
  if(!o)o=manual.overrides.find(x=>x.weaponName===r.weaponName&&x.attachmentType===r.attachmentType&&x.attachmentName===r.attachmentName&&x.sourceFilename===path.basename(next));
  if(!o){o={weaponName:r.weaponName,attachmentType:r.attachmentType,attachmentName:r.attachmentName,sourcePath:next,sourceFilename:path.basename(next),updates:{},evidence:[]};manual.overrides.push(o);}o.sourcePath=next;o.sourceFilename=path.basename(next);
  if(magazineFixes.some(([w,,n])=>w===r.weaponName&&n===r.attachmentName)){o.updates={...(o.updates??{}),attachmentName:r.attachmentName,attachmentSubtype:'Magazine',attachmentCost:r.attachmentCost,magazineSize:r.stats.magazineSize};o.mappingReviewStatus='visually-checked';o.evidence=[...new Map([...(o.evidence??[]),{kind:'direct-duplicate-name-screenshot-review',reviewDate:'2026-07-28'}].map(x=>[JSON.stringify(x),x])).values()];}
}
review.records.sort((a,b)=>a.weaponName.localeCompare(b.weaponName)||a.source.captureOrder-b.source.captureOrder);review.recordCount=review.records.length;review.attachmentDetailCount=review.records.filter(r=>r.attachmentType!=='Overview').length;review.generatedAt=new Date().toISOString();manual.generatedAt=review.generatedAt;

// Move files through collision-proof temporary names.
const existing=[...pathMoves.entries()].filter(([old])=>fs.existsSync(old));const temps=[];
for(const [old,newPath] of existing){fs.mkdirSync(path.dirname(newPath),{recursive:true});const tmp=`${old}.codex-order-tmp`;fs.renameSync(old,tmp);temps.push([tmp,newPath]);}
for(const [tmp,newPath] of temps)fs.renameSync(tmp,newPath);

// Rewrite known path-bearing JSON artifacts without changing their other contents.
const rewrite=v=>{if(Array.isArray(v))return v.map(rewrite);if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=rewrite(v[k]);return v;}if(typeof v==='string'){const n=pathMoves.get(norm(v));return n??v;}return v;};
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.json')&&!n.includes('.before')&&!n.startsWith('attachment-screenshot-review.pre-')&&!n.startsWith('coverage-report.pre-')&&!n.startsWith('rename-manifest.pre-'))){const p=path.join(root,name);try{let d=name==='attachment-screenshot-review.json'?review:name==='manual-review-overrides.json'?manual:JSON.parse(fs.readFileSync(p,'utf8'));d=rewrite(d);fs.writeFileSync(p,`${JSON.stringify(d,null,2)}\n`);}catch{} }
console.log(JSON.stringify({added:specs.map(s=>`${s.weapon}|${s.type}|${s.order}|${s.name}`),magazinesCorrected:magazineFixes.map(x=>`${x[0]}|${x[2]}`),filesMoved:temps.length,records:review.records.length},null,2));
