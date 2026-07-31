import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve('outputs/attachment-audit');
const review=JSON.parse(await fs.readFile(path.join(root,'attachment-screenshot-review.json'),'utf8'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path.resolve('BF6_Attachment_Stats_Review.xlsx')));
const out=path.join(root,'previews-capacity-corrections');await fs.mkdir(out,{recursive:true});
for(const weapon of ['GRT-CPS','LMR27','M1014','M240L','M39 EMR','M417 A2','M433','M60','M87A1','SGX','SVDM','VSSM']){
 const rows=review.records.filter(r=>r.weaponName===weapon&&r.stats).sort((a,b)=>a.source.captureOrder-b.source.captureOrder);
 const targets=rows.map((row,index)=>({row,excel:index+5})).filter(x=>x.row.attachmentType==='Magazine');
 const first=Math.min(...targets.map(x=>x.excel)),last=Math.max(...targets.map(x=>x.excel));
 const image=await wb.render({sheetName:weapon,range:`A${Math.max(4,first-1)}:N${last+1}`,scale:1.2,format:'png'});
 await fs.writeFile(path.join(out,`${weapon.replace(/[^A-Za-z0-9-]/g,'_')}.png`),new Uint8Array(await image.arrayBuffer()));
 console.log(`${weapon}: ${first}-${last}`);
}
