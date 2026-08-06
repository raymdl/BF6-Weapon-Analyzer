// Import the ES 5.7 and GGH-22 Ammo captures that were missing from the corpus.
// Both weapons had no Ammo screenshots at all, so their six ammo options were
// absent from the review and the workbook. Values below were transcribed
// directly from the 2026-08-06 captures under `Weapon Attachments/Missing`.
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('migration/1.3.3.0/attachment-audit');
const reviewPath=path.join(root,'attachment-screenshot-review.json');
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const manualPath=path.join(root,'manual-review-overrides.json');
const manual=JSON.parse(fs.readFileSync(manualPath,'utf8'));
const norm=p=>path.resolve(p).toLowerCase();
const pathMoves=new Map();
const slug=s=>s.replace(/[^A-Za-z0-9-]+/g,'_').replace(/^_+|_+$/g,'');
const canonical=(dir,order,weapon,type,label)=>path.join(dir,`${String(order).padStart(2,'0')}_${weapon}_${type}_${slug(label)}.png`);
function setMove(oldPath,newPath){if(norm(oldPath)!==norm(newPath))pathMoves.set(norm(oldPath),path.resolve(newPath));}
function find(weapon,type,order){const r=review.records.find(x=>x.weaponName===weapon&&x.attachmentType===type&&x.source?.captureOrder===order);if(!r)throw new Error(`Missing ${weapon}|${type}|${order}`);return r;}

const missingRoot=path.resolve('Weapon Attachments/Missing');
const DESC={
  Standard:'Standard-penetration ammunition.',
  Penetration:'Ammunition that trades recoil for improved penetration, resulting in greater damage to soldiers behind the initial target.',
  Frangible:'Ammunition that delays health regeneration on impact with the target.',
  Subsonic:'Low-velocity ammunition that partially hides in-world spotting and slightly reduces the range where a soldier is spotted on the minimap while firing.',
  'Sub HP':'Low-velocity ammunition that partially hides in-world spotting and slightly reduces the range where a soldier is spotted on the minimap while firing. Slightly improves headshot damage.',
  'Hollow Point':'Ammunition with slightly improved headshot damage.',
};
const NAME={Standard:'FMJ',Penetration:'Tungsten Core',Frangible:'Frangible',Subsonic:'Subsonic','Sub HP':'Subsonic HP','Hollow Point':'Hollow Point'};

// Ammo sits after Magazine and before Ergonomics, so the Ergonomics captures shift down.
const weapons=[
  {
    weapon:'ES 5.7',
    baseOrder:8, // Barrel 122MM Pencil: same panel layout, superseded field by field below.
    ergoFrom:19,
    firstAmmoOrder:19,
    // Panel values shared by every ES 5.7 ammo capture.
    common:{damage:20,rateOfFireRpm:450,magazineSize:20,hipfire:54,precision:57,control:28,mobility:81,fireModes:['SINGLE'],reloadTimeSeconds:2.017,muzzleVelocityMps:510,adsTimeMs:133,headshotMultiplier:1.34,longRangeDamage:12,spotOnFire3dM:54,spotOnFire2dM:150,opponentHealthRegenDelaySeconds:5,collateralMultiplier:0.67,reloadInAds:true,adsMoveSpeedMultiplier:0.82,sprintRecoveryMs:67,recoilAmountDegrees:1,recoilVariationDegrees:15},
    ammo:[
      {subtype:'Standard',cost:5,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.28.62 (Medium).png',updates:{}},
      {subtype:'Subsonic',cost:10,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.30.01 (Medium).png',updates:{muzzleVelocityMps:408,spotOnFire3dM:27,spotOnFire2dM:64,collateralMultiplier:0.57}},
      {subtype:'Sub HP',cost:30,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.31.66 (Medium).png',updates:{muzzleVelocityMps:408,headshotMultiplier:1.5,spotOnFire3dM:27,spotOnFire2dM:64,collateralMultiplier:0.57}},
      {subtype:'Penetration',cost:5,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.33.05 (Medium).png',updates:{precision:55,control:26,collateralMultiplier:0.83,recoilAmountDegrees:1.1}},
      {subtype:'Frangible',cost:20,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.34.40 (Medium).png',updates:{opponentHealthRegenDelaySeconds:9,collateralMultiplier:0.57}},
      {subtype:'Hollow Point',cost:15,file:'ES 5.7/Battlefield 6 Screenshot 2026.08.06 - 17.08.35.82 (Medium).png',updates:{headshotMultiplier:1.5,collateralMultiplier:0.57}},
    ],
  },
  {
    weapon:'GGH-22',
    baseOrder:8, // Barrel 114MM Pencil.
    ergoFrom:20,
    firstAmmoOrder:20,
    common:{damage:25,rateOfFireRpm:360,magazineSize:15,hipfire:54,precision:48,control:18,mobility:75,fireModes:['SINGLE'],reloadTimeSeconds:1.934,muzzleVelocityMps:400,adsTimeMs:167,headshotMultiplier:1.34,longRangeDamage:14,spotOnFire3dM:54,spotOnFire2dM:150,opponentHealthRegenDelaySeconds:5,collateralMultiplier:0.57,reloadInAds:true,adsMoveSpeedMultiplier:0.82,sprintRecoveryMs:83,recoilAmountDegrees:1.5,recoilVariationDegrees:12},
    ammo:[
      {subtype:'Standard',cost:5,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.08.52.95 (Medium).png',updates:{}},
      {subtype:'Subsonic',cost:10,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.08.54.28 (Medium).png',updates:{muzzleVelocityMps:320,spotOnFire3dM:27,spotOnFire2dM:64,collateralMultiplier:0.5}},
      {subtype:'Sub HP',cost:30,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.08.55.66 (Medium).png',updates:{muzzleVelocityMps:320,headshotMultiplier:1.5,spotOnFire3dM:27,spotOnFire2dM:64,collateralMultiplier:0.5}},
      {subtype:'Penetration',cost:5,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.08.57.24 (Medium).png',updates:{precision:46,control:16,collateralMultiplier:0.75,recoilAmountDegrees:1.6}},
      {subtype:'Frangible',cost:20,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.08.58.67 (Medium).png',updates:{opponentHealthRegenDelaySeconds:9,collateralMultiplier:0.5}},
      {subtype:'Hollow Point',cost:15,file:'GGH-22/Battlefield 6 Screenshot 2026.08.06 - 17.09.00.17 (Medium).png',updates:{headshotMultiplier:1.5,collateralMultiplier:0.5}},
    ],
  },
];

// A stat is a buff or a penalty by what the panel colours it, not by direction alone:
// a lower collateral multiplier is a penalty, a lower spot range is a buff.
const EFFECT={spotOnFire3dM:'lower-is-better',spotOnFire2dM:'lower-is-better',opponentHealthRegenDelaySeconds:'higher-is-worse',recoilAmountDegrees:'higher-is-worse'};
function compare(field,value,base){
  if(!Number.isFinite(value)||!Number.isFinite(base)||value===base)return null;
  const direction=value>base?'up':'down';
  const rule=EFFECT[field];
  let effect;
  if(rule==='lower-is-better')effect=direction==='down'?'buff':'penalty';
  else if(rule==='higher-is-worse')effect='penalty';
  else effect=direction==='up'?'buff':'penalty';
  return {direction,effect,color:effect==='buff'?'green':'red',confidence:1,source:'direct-screenshot-review'};
}

const added=[];
for(const w of weapons){
  const base=find(w.weapon,'Barrel',w.baseOrder);
  const dir=path.dirname(base.source.currentPath);
  // Make room for the six ammo captures ahead of Ergonomics.
  for(const r of review.records.filter(x=>x.weaponName===w.weapon&&x.source?.captureOrder>=w.ergoFrom))r.source.captureOrder+=w.ammo.length;
  const fresh=[];
  w.ammo.forEach((a,i)=>{
    const order=w.firstAmmoOrder+i;
    const name=NAME[a.subtype];
    const current=canonical(dir,order,w.weapon,'Ammo',a.subtype);
    const original=path.join(missingRoot,a.file);
    if(!fs.existsSync(original))throw new Error(`Capture not found: ${original}`);
    const stats={...w.common,...a.updates};
    const statComparisons={};
    for(const [field,value] of Object.entries(a.updates)){const c=compare(field,value,w.common[field]);if(c)statComparisons[field]=c;}
    fresh.push({...base,weaponName:w.weapon,attachmentType:'Ammo',attachmentName:name,attachmentSubtype:a.subtype,attachmentCost:a.cost,attachmentDescription:DESC[a.subtype],stats,statComparisons,statFieldReasons:{},reviewStatus:null,mappingReviewStatus:'visually-checked',reviewConflicts:[],
      notes:['Missing Ammo capture imported and directly transcribed on 2026-08-06.'],
      source:{...base.source,captureOrder:order,canonicalOrder:order,currentPath:current,proposedFilename:path.basename(current),originalPath:original,originalFilename:path.basename(original),captureTimestamp:path.basename(original).match(/2026\.08\.06 - ([\d.]+)/)?.[1]??null,rawAttachmentDescriptionOcr:null,rawFullScreenOcr:null}});
    setMove(original,current);
    manual.overrides.push({weaponName:w.weapon,attachmentType:'Ammo',attachmentName:name,sourcePath:current,sourceFilename:path.basename(current),updates:{attachmentName:name,attachmentSubtype:a.subtype,attachmentCost:a.cost,attachmentDescription:DESC[a.subtype],stats},comparisons:statComparisons,replaceComparisons:true,mappingReviewStatus:'visually-checked',evidence:[{kind:'direct-missing-attachment-screenshot-review',sourceFilename:path.basename(original),reviewDate:'2026-08-06'}]});
    added.push(`${w.weapon}|Ammo|${order}|${name}`);
  });
  // Splice the ammo block in ahead of Ergonomics. The file's record order is not a plain sort,
  // so inserting in place is the only way to leave every other weapon's block untouched.
  const at=review.records.findIndex(r=>r.weaponName===w.weapon&&r.attachmentType==='Ergonomics');
  if(at<0)throw new Error(`No Ergonomics anchor for ${w.weapon}`);
  review.records.splice(at,0,...fresh);
}

// Renumber the shifted Ergonomics captures. Only the numeric prefix changes: the rest of
// each filename is left exactly as it is on disk, which differs from the canonical form for
// types like Laser/Light and must not be rewritten here.
for(const w of weapons){
  for(const r of review.records){
    if(r.weaponName!==w.weapon||r.attachmentType!=='Ergonomics')continue;
    const previous=r.source.currentPath;
    const next=path.join(path.dirname(previous),path.basename(previous).replace(/^\d+_/,`${String(r.source.captureOrder).padStart(2,'0')}_`));
    if(norm(previous)===norm(next))continue;
    setMove(previous,next);
    r.source.currentPath=next;r.source.proposedFilename=path.basename(next);
    r.source.canonicalOrder=r.source.captureOrder;
    const o=manual.overrides.find(x=>x.sourcePath&&norm(x.sourcePath)===norm(previous));
    if(o){o.sourcePath=next;o.sourceFilename=path.basename(next);}
  }
}
review.recordCount=review.records.length;
review.attachmentDetailCount=review.records.filter(r=>r.attachmentType!=='Overview').length;
review.generatedAt=new Date().toISOString();manual.generatedAt=review.generatedAt;

// Move files through temporary names so the order shift cannot collide.
const existing=[...pathMoves.entries()].filter(([old])=>fs.existsSync(old));const temps=[];
for(const [old,newPath] of existing){fs.mkdirSync(path.dirname(newPath),{recursive:true});const tmp=`${old}.ammo-import-tmp`;fs.renameSync(old,tmp);temps.push([tmp,newPath]);}
for(const [tmp,newPath] of temps)fs.renameSync(tmp,newPath);

// Rewrite the path-bearing JSON artifacts without touching their other contents.
// Only absolute strings are remapped: some inventories store repo-relative paths, and resolving
// those against the cwd would match a move and rewrite them to absolute form.
const rewrite=v=>{if(Array.isArray(v))return v.map(rewrite);if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=rewrite(v[k]);return v;}if(typeof v==='string'&&path.isAbsolute(v)){return pathMoves.get(norm(v))??v;}return v;};
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.json')&&!n.includes('.before')&&!n.startsWith('attachment-screenshot-review.pre-')&&!n.startsWith('coverage-report.pre-')&&!n.startsWith('rename-manifest.pre-'))){
  const p=path.join(root,name);
  try{let d=name==='attachment-screenshot-review.json'?review:name==='manual-review-overrides.json'?manual:JSON.parse(fs.readFileSync(p,'utf8'));d=rewrite(d);fs.writeFileSync(p,`${JSON.stringify(d,null,2)}\n`);}catch{}
}

// Drop the now-empty per-weapon staging folders under Weapon Attachments/Missing.
const removed=[];
if(fs.existsSync(missingRoot)){
  for(const entry of fs.readdirSync(missingRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const p=path.join(missingRoot,entry.name);
    if(fs.readdirSync(p).length===0){fs.rmdirSync(p);removed.push(entry.name);}
  }
  if(fs.readdirSync(missingRoot).length===0){fs.rmdirSync(missingRoot);removed.push('Missing');}
}
console.log(JSON.stringify({added,filesMoved:temps.length,records:review.records.length,removedDirectories:removed},null,2));
