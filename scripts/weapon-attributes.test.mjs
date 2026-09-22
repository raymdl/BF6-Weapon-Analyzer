import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setAttachmentContext} from '../sim/applyAttachments.js';
import {resetAttsForWeapon, normalizeAttachments} from '../sim/loadout.js';
import {createWeaponAttributeModel} from '../sim/weapon-attributes.js';
const read = p => JSON.parse(readFileSync(new URL('../'+p, import.meta.url),'utf8'));
const balance=read('data/balance_tables.json');
const catalogs={...read('data/attachments.json'),...read('data/ammo.json')};
const weapons=read('data/weapons.json');
setAttachmentContext({...catalogs,...balance,HIT_ZONES:read('data/hit_zones.json')});
const calculate=createWeaponAttributeModel({balance,catalogs,attributes:read('data/weapon_attributes.json')});
for(const file of ['composite-current-panels','composite-remaining-panels','composite-combination-panels']) {
 test(file+' matches all four captured attributes',()=>{
  const failures=[];
  for(const record of read('reference-data/attachment-audit/'+file+'-2026-09-21.json').records){
   const weapon=weapons.find(w=>w.id===record.weapon);
   const atts={}; resetAttsForWeapon(atts,weapon,catalogs);
   Object.assign(atts,record.loadout??{});
   const [slot,id]=record.identityCandidates?.[0]??[];
   if(slot) {atts[slot]=id; if(catalogs.WEAPON_ATTS[weapon.id]?.slots?.rail?.accepts.includes(slot)){delete atts[slot];atts.rail=id==='none'?null:{type:slot,id};}}
   const result=calculate(weapon,normalizeAttachments(atts,weapon,catalogs));
   for(const key of ['hipfire','precision','control','mobility']) if(result[key]!==record.fields[key].audit) failures.push(`${record.weapon} ${record.label??slot+':'+id} ${key}: ${result[key]} expected ${record.fields[key].audit}`);
  }
  assert.deepEqual(failures,[]);
 });
}
test('missing Precision table does not invent a score',()=>{
 const model=createWeaponAttributeModel({balance,catalogs,attributes:{...read('data/weapon_attributes.json'),tables:{}}});
 const weapon=weapons.find(w=>w.id==='ef88');const atts={};resetAttsForWeapon(atts,weapon,catalogs);
 assert.equal(model(weapon,atts).precision,null);
});

test('equipped burst panels retain recoil inputs and include muzzle and RPM changes',()=>{
 for (const [id,ergo,plain,brake] of [
  ['grtbc','grtbc_burst_mode',[47,26,37,60],[47,27,40,60]],
  ['sl9','burst_mode',[47,78,55,68],[47,80,59,68]],
 ]) {
  const weapon=weapons.find(w=>w.id===id);const atts={};resetAttsForWeapon(atts,weapon,catalogs);
  atts.ergo=ergo;
  for (const [muzzle,expected] of [['none',plain],['comp_brake',brake]]) {
   atts.muzzle=muzzle;const result=calculate(weapon,atts);
   assert.deepEqual(['hipfire','precision','control','mobility'].map(k=>result[k]),expected,`${id} ${muzzle}`);
  }
 }
});

test('reviewed burst training and M16 A3 panels retain distinct input rules',()=>{
 for(const [id,ergo,expected] of [
  ['kord6p67','none',[40,33,55,52]],['kord6p67','burst_training',[40,33,55,52]],
  ['sg553r','none',[47,23,37,60]],['sg553r','burst_training',[47,23,37,60]],
  ['pw5a3','none',[47,35,53,68]],['pw5a3','burst_training',[47,35,53,68]],
  ['m16a4','none',[40,27,41,52]],['m16a4','full_auto',[40,24,39,52]],
 ]) {
  const weapon=weapons.find(w=>w.id===id);const atts={};resetAttsForWeapon(atts,weapon,catalogs);atts.ergo=ergo;
  const result=calculate(weapon,atts);
  assert.deepEqual(['hipfire','precision','control','mobility'].map(k=>result[k]),expected,`${id} ${ergo}`);
 }
});
