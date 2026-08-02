import fs from 'node:fs/promises';
const root='C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit';
const doc=JSON.parse(await fs.readFile(`${root}/attachment-screenshot-review.json`,'utf8'));
const fields=['damage','rateOfFireRpm','magazineSize','hipfire','precision','control','mobility','reloadTimeSeconds','muzzleVelocityMps','adsTimeMs','headshotMultiplier','longRangeDamage','spotOnFire3dM','spotOnFire2dM','opponentHealthRegenDelaySeconds','collateralMultiplier','adsMoveSpeedMultiplier','sprintRecoveryMs','recoilVariationDegrees'];
const groups=Map.groupBy(doc.records.filter(r=>r.stats),r=>`${r.weaponName}|${r.attachmentType}`);
const issues=[];
for(const [group,rows] of groups){
 const none=rows.find(r=>String(r.attachmentName).toLowerCase()==='none');if(!none)continue;
 for(const row of rows)for(const field of fields){const cmp=row.statComparisons?.[field];if(!cmp)continue;const value=row.stats[field],base=none.stats[field];if(!Number.isFinite(value)||!Number.isFinite(base))continue;const actual=value===base?'equal':value>base?'up':'down';if(actual!==cmp.direction)issues.push({kind:actual==='equal'?'equal-value-arrow':'direction-contradiction',group,weaponName:row.weaponName,attachmentType:row.attachmentType,field,order:row.source.captureOrder,name:row.attachmentName,value,base,arrow:cmp.direction,effect:cmp.effect,confidence:cmp.confidence,path:row.source.currentPath,noneOrder:none.source.captureOrder,nonePath:none.source.currentPath});}
}
await fs.writeFile(`${root}/nonrecoil-comparison-issues.json`,JSON.stringify(issues,null,2)+'\n');
const bucket=x=>`${x.kind}|${x.attachmentType}|${x.field}`;const summary=Object.entries(Object.groupBy(issues,bucket)).map(([key,v])=>({key,count:v.length,weapons:[...new Set(v.map(x=>x.weaponName))]})).sort((a,b)=>b.count-a.count);
console.log(JSON.stringify({count:issues.length,equal:issues.filter(x=>x.kind==='equal-value-arrow').length,contradictions:issues.filter(x=>x.kind==='direction-contradiction').length,summary},null,2));
