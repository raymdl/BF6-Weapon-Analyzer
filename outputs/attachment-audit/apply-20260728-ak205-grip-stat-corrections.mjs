import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('outputs/attachment-audit');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(root,n),`${JSON.stringify(v,null,2)}\n`);
const recoilOrders=new Set([20,21,22,23,24,25,26,27,28,29,32]);
const review=read('attachment-screenshot-review.json');const changed=[];
for(const row of review.records.filter(r=>r.weaponName==='AK-205'&&r.attachmentType==='Grip')){
 const updates={};
 if(row.source.captureOrder===19&&row.stats.mobility!==60){updates.mobility={before:row.stats.mobility,after:60};row.stats.mobility=60;}
 if(recoilOrders.has(row.source.captureOrder)&&row.stats.recoilAmountDegrees!==0.4){updates.recoilAmountDegrees={before:row.stats.recoilAmountDegrees,after:0.4};row.stats.recoilAmountDegrees=0.4;}
 if(Object.keys(updates).length){row.mappingReviewStatus='visually-checked';row.notes=[...new Set([...(row.notes??[]),'AK-205 Grip mobility/recoil value visually verified from the detailed screenshot panel on 2026-07-28; leading-zero segmentation had caused the prior scrape error.'])];changed.push({order:row.source.captureOrder,name:row.attachmentName,path:row.source.currentPath,updates});}
}
if(changed.length!==12)throw new Error(`Expected 12 corrected AK-205 grip rows, got ${changed.length}`);
review.generatedAt=new Date().toISOString();write('attachment-screenshot-review.json',review);
const manual=read('manual-review-overrides.json');
for(const item of changed){const row=review.records.find(r=>r.weaponName==='AK-205'&&r.source.captureOrder===item.order);let o=manual.overrides.find(x=>x.sourcePath&&path.resolve(x.sourcePath).toLowerCase()===path.resolve(row.source.currentPath).toLowerCase());if(!o){o={weaponName:'AK-205',attachmentType:'Grip',attachmentName:row.attachmentName,sourcePath:row.source.currentPath,sourceFilename:path.basename(row.source.currentPath),updates:{},evidence:[]};manual.overrides.push(o);}o.updates={...(o.updates??{})};if(item.updates.mobility)o.updates.mobility=60;if(item.updates.recoilAmountDegrees)o.updates.recoilAmountDegrees=0.4;o.mappingReviewStatus='visually-checked';o.evidence=[...new Map([...(o.evidence??[]),{kind:'direct-ak205-grip-stat-panel-review',reviewDate:'2026-07-28'}].map(x=>[JSON.stringify(x),x])).values()];}
manual.generatedAt=new Date().toISOString();write('manual-review-overrides.json',manual);
console.log(JSON.stringify({corrected:changed.length,changed},null,2));
