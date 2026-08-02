import fs from 'node:fs/promises';
const root='C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit';
const doc=JSON.parse(await fs.readFile(`${root}/attachment-screenshot-review.json`,'utf8'));
const rows=doc.records.filter(r=>r.stats&&Number.isFinite(r.stats.recoilAmountDegrees));
const groups=Map.groupBy(rows,r=>`${r.weaponName}|${r.attachmentType}`);
const result=[];
for(const [key,group] of groups){
 const arrowed=group.filter(r=>r.statComparisons?.recoilAmountDegrees);
 if(!arrowed.length)continue;
 const values=[...new Set(group.map(r=>r.stats.recoilAmountDegrees))];
 if(values.length!==1)continue;
 result.push({key,value:values[0],records:group.length,arrowed:arrowed.length,rows:arrowed.map(r=>({order:r.source.captureOrder,name:r.attachmentName,path:r.source.currentPath,ocr:r.source.rawFullScreenOcr?.match(/(?:^|\s)([0-9]+\.[0-9]+)(?:\s*[Â°â€¢]|\s|$)/g)?.slice(-4)??[]}))});
}
await fs.writeFile(`${root}/stuck-recoil-groups.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({groups:result.length,records:result.reduce((n,g)=>n+g.records,0),arrowed:result.reduce((n,g)=>n+g.arrowed,0),summary:result.map(({key,value,records,arrowed})=>({key,value,records,arrowed}))},null,2));
