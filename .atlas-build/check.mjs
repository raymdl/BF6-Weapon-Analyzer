import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
const browser=await puppeteer.launch({args:['--no-sandbox']});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1440,height:1000});
  await page.goto(pathToFileURL(resolve('.atlas-build/output/index.html')).href);
  assert.equal(await page.$$eval('figure svg',els=>els.length),23);
  assert.equal(await page.$$eval('.chapter',els=>els.length),8);
  await page.screenshot({path:'.atlas-build/output/overview.png'});
  for(const id of ['readme','sources','loadouts','damage_ballistics','recoil_spread','target','ui_publishing','register']){
    await page.click('nav a[data-nav="'+id+'"]');
    await page.waitForFunction(id=>document.querySelector('.chapter.active')?.dataset.chapter===id,{},id);
  }
  await page.click('nav a[data-nav="readme"]');
  await page.click('.chapter.active .expand');
  assert.equal(await page.$eval('dialog',d=>d.open),true);
  const before=await page.$eval('.zoom-label',e=>e.textContent);
  await page.click('[data-action="in"]');
  assert.notEqual(await page.$eval('.zoom-label',e=>e.textContent),before);
  await page.click('[data-action="actual"]');
  assert.equal(await page.$eval('.zoom-label',e=>e.textContent),'100%');
  await page.click('[data-action="fit"]');
  await page.screenshot({path:'.atlas-build/output/diagram.png'});
  const duplicates=await page.$$eval('[id]',els=>els.map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i));
  assert.deepEqual(duplicates,[]);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('dialog',d=>d.open),false);
  await page.click('.chapter.active .expand');
  await page.click('[data-action="close"]');
  assert.equal(await page.$eval('dialog',d=>d.open),false);
  await page.setViewport({width:390,height:844});
  await page.screenshot({path:'.atlas-build/output/mobile.png'});
  assert.deepEqual(errors,[]);
  await writeFile('.atlas-build/output/checks.json',JSON.stringify({diagrams:23,sections:8,navigation:'passed',enlarge:'passed',zoom:'passed',escape:'passed',close:'passed',uniqueIds:'passed',pageErrors:errors},null,2));
} finally { await browser.close(); }
