import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('outputs/attachment-audit');
const review=JSON.parse(fs.readFileSync(path.join(root,'attachment-screenshot-review.json'),'utf8'));
const p=path.join(root,'capture-order.json');const doc=JSON.parse(fs.readFileSync(p,'utf8'));
const weapons=new Set(['RPKM','TR7','KTS100 MK8','SOR-300SC','VCR-2','AK-205','DRS-IAR']);
const retained=doc.entries.filter(e=>!weapons.has(e.weaponName));
const synced=review.records.filter(r=>weapons.has(r.weaponName)).map(r=>({
  weaponName:r.weaponName,captureOrder:r.source.captureOrder,attachmentType:r.attachmentType,attachmentName:r.attachmentName,attachmentSubtype:r.attachmentSubtype,
  currentFilename:path.basename(r.source.currentPath),currentDirectory:path.dirname(r.source.currentPath),proposedFilename:path.basename(r.source.currentPath),
  originalFilename:r.source.originalFilename??null,originalPath:r.source.originalPath??null,captureTimestamp:r.source.captureTimestamp??null,
}));
doc.entries=[...retained,...synced].sort((a,b)=>a.weaponName.localeCompare(b.weaponName)||a.captureOrder-b.captureOrder);doc.recordCount=doc.entries.length;doc.generatedAt=new Date().toISOString();
fs.writeFileSync(p,`${JSON.stringify(doc,null,2)}\n`);
console.log(JSON.stringify({RPKM:synced.filter(x=>x.weaponName==='RPKM').length,TR7:synced.filter(x=>x.weaponName==='TR7').length,total:doc.recordCount},null,2));
