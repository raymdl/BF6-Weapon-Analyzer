import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('outputs/attachment-audit');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(root,n),`${JSON.stringify(v,null,2)}\n`);
const fixes=new Map([
  ['L85A3|Muzzle|2',{spotOnFire3dM:0}],['L85A3|Muzzle|3',{spotOnFire3dM:0}],['L85A3|Muzzle|8',{recoilVariationDegrees:17.4}],['L85A3|Muzzle|12',{spotOnFire3dM:0}],
  ['M433|Muzzle|2',{spotOnFire3dM:0}],['M433|Muzzle|3',{spotOnFire3dM:0}],['M433|Muzzle|4',{precision:21,control:42}],['M433|Muzzle|5',{precision:21,control:42}],['M433|Muzzle|7',{precision:21,control:36,recoilVariationDegrees:32.5}],
  ...[8,9,10].map(o=>[`M433|Muzzle|${o}`,{spotOnFire3dM:0,spotOnFire2dM:21}]),['M433|Muzzle|11',{hipfire:34,spotOnFire3dM:0,spotOnFire2dM:21}],
  ['M433|Grip|18',{precision:21,control:45}],['M433|Grip|19',{precision:22,control:47}],['M433|Grip|20',{precision:22,control:50,adsMoveSpeedMultiplier:0.54}],['M433|Grip|21',{adsMoveSpeedMultiplier:0.54}],
  ['M433|Grip|23',{adsTimeMs:200}],['M433|Grip|25',{adsTimeMs:200}],['M433|Grip|26',{adsMoveSpeedMultiplier:0.54}],['M433|Grip|27',{mobility:50,adsMoveSpeedMultiplier:0.54}],
  ['M433|Grip|29',{precision:21,control:42,mobility:54,adsTimeMs:200,sprintRecoveryMs:133}],['M433|Grip|31',{precision:21,control:45,mobility:54,adsTimeMs:200,sprintRecoveryMs:133}],
  ['M433|Grip|33',{mobility:48}],['M433|Grip|35',{adsTimeMs:200}],['M433|Light|53',{hipfire:44}],['M433|Light|54',{hipfire:44}],
  ['M433|Laser|56',{hipfire:47}],['M433|Laser|58',{hipfire:54}],['M433|Laser|59',{hipfire:62}],['M433|Laser|60',{hipfire:54}],['M433|Laser|61',{hipfire:62}],
  ...[9,10,11,12].map(o=>[`NVO-228E|Muzzle|${o}`,{spotOnFire2dM:21}]),
]);
const phantomPairs=new Set(['Grip|damage','Grip|magazineSize','Grip|rateOfFireRpm','Laser|rateOfFireRpm','Laser|damage','Ergonomics|magazineSize','Light|rateOfFireRpm','Light|damage','Light|magazineSize']);
const review=read('attachment-screenshot-review.json');
const changed=[];
for(const row of review.records.filter(r=>r.stats)){
  const key=`${row.weaponName}|${row.attachmentType}|${row.source.captureOrder}`;
  const updates={};
  for(const [field,value] of Object.entries(fixes.get(key)??{})) if(row.stats[field]!==value){updates[field]={before:row.stats[field],after:value};row.stats[field]=value;}
  const removed=[];
  for(const field of Object.keys(row.statComparisons??{})) if(phantomPairs.has(`${row.attachmentType}|${field}`)){removed.push(field);delete row.statComparisons[field];}
  if(Object.keys(updates).length||removed.length){
    row.mappingReviewStatus='visually-checked';
    row.notes=[...new Set([...(row.notes??[]),Object.keys(updates).length?'Equal-value non-recoil comparison visually reconciled against the detailed screenshot panel on 2026-07-28.':'Semantically impossible cross-field comparison removed as a phantom arrow on 2026-07-28.'])];
    changed.push({key,path:row.source.currentPath,updates,removed});
  }
}
review.generatedAt=new Date().toISOString();write('attachment-screenshot-review.json',review);
const manual=read('manual-review-overrides.json');
for(const item of changed){
  const row=review.records.find(r=>`${r.weaponName}|${r.attachmentType}|${r.source.captureOrder}`===item.key);
  let o=manual.overrides.find(x=>x.sourcePath&&path.resolve(x.sourcePath).toLowerCase()===path.resolve(row.source.currentPath).toLowerCase());
  if(!o){o={weaponName:row.weaponName,attachmentType:row.attachmentType,attachmentName:row.attachmentName,sourcePath:row.source.currentPath,sourceFilename:path.basename(row.source.currentPath),updates:{},evidence:[]};manual.overrides.push(o);}
  o.updates={...(o.updates??{})};for(const [field,change] of Object.entries(item.updates))o.updates[field]=change.after;
  o.comparisons={...(row.statComparisons??{})};o.replaceComparisons=true;o.mappingReviewStatus='visually-checked';
  o.evidence=[...new Map([...(o.evidence??[]),{kind:'direct-equal-arrow-review',reviewDate:'2026-07-28'}].map(x=>[JSON.stringify(x),x])).values()];
}
manual.generatedAt=new Date().toISOString();write('manual-review-overrides.json',manual);
console.log(JSON.stringify({changedRecords:changed.length,valueCorrections:[...fixes.values()].reduce((n,x)=>n+Object.keys(x).length,0),phantomComparisonsRemoved:changed.reduce((n,x)=>n+x.removed.length,0)},null,2));
