import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root='C:/Users/royal/Documents/BF6 Project';
const review=JSON.parse(await fs.readFile(`${root}/migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json`,'utf8'));
const keys=new Set(['DRS-IAR|15','DRS-IAR|16','DRS-IAR|17','L110|14','L115|11','L115|12','L85A3|15','M121 A2|13','M121 A2|14','M123K|13','M123K|14','M2010 ESR|12','M250|14','M39 EMR|14','M433|13','M433|14','Mini Scout|13','Mini Scout|14','PSR|11','RPK-74M|15','RPKM|15','RPKM|16','SL9|15','SV-98|8','SVDM|12','UMG-40|15']);
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(`${root}/BF6_Attachment_Stats_Review.xlsx`));
const out=`${root}/migration/1.3.3.0/attachment-audit/previews-barrel-corrections`;await fs.mkdir(out,{recursive:true});
const weapons=[...new Set([...keys].map(k=>k.split('|')[0]))];
for(const weapon of weapons){
 const rows=review.records.filter(r=>r.stats&&r.weaponName===weapon).sort((a,b)=>(a.source.captureOrder??999)-(b.source.captureOrder??999));
 const indexes=rows.map((r,i)=>keys.has(`${weapon}|${r.source.captureOrder}`)?i+5:null).filter(Boolean);
 const start=Math.max(5,Math.min(...indexes)-1),end=Math.max(...indexes)+1;
 const preview=await workbook.render({sheetName:weapon,range:`A${start}:P${end}`,scale:1.25,format:'png'});
 await fs.writeFile(path.join(out,`${weapon.replaceAll(/[^A-Za-z0-9_-]/g,'_')}.png`),new Uint8Array(await preview.arrayBuffer()));
}
console.log(JSON.stringify({weapons:weapons.length,output:out}));
