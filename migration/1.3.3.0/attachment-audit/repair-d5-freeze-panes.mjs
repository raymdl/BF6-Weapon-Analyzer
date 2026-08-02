import fs from 'node:fs/promises';
import JSZip from 'jszip';

const review = JSON.parse(await fs.readFile('migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json', 'utf8'));
const classByWeapon = new Map(review.records.map(row => [row.weaponName, row.source.currentPath.match(/[\\/]Weapon Attachments[\\/]([^\\/]+)[\\/]/i)?.[1]]));
const colors = {'Assault Rifle':'FF1D4ED8',Carbine:'FF0F766E',DMR:'FFCA8A04',LMG:'FFEA580C',Shotgun:'FFDC2626',Sidearm:'FF0891B2','Sniper Rifle':'FF0284C7',SMG:'FF7C3AED'};

for (const workbookPath of process.argv.slice(2)) {
  const zip = await JSZip.loadAsync(await fs.readFile(workbookPath));
  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  const targets = new Map([...relsXml.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].map(match => {
    const item = attrs(match[0]);
    return [item.Id, item.Target];
  }));
  let repaired = 0;
  for (const match of workbookXml.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    const item = attrs(match[0]);
    if (item.name === 'Source Index' || item.name === 'Read Me') continue;
    const target = targets.get(item['r:id']);
    const sheetPath = target.startsWith('/') ? target.slice(1) : target.startsWith('xl/') ? target : `xl/${target}`;
    const file = zip.file(sheetPath);
    if (!file) throw new Error(`Missing worksheet XML for ${item.name}`);
    let xml = await file.async('string');
    const prefix = xml.match(/<(\w+:)?worksheet\b/)?.[1] ?? '';
    const rgb = colors[classByWeapon.get(item.name)];
    if (!rgb) throw new Error(`Missing class tab color for ${item.name}`);
    const sheetPr = new RegExp(`<${prefix}sheetPr\\b([^>]*)>`);
    const selfClosingSheetPr = new RegExp(`<${prefix}sheetPr\\b([^>]*)/>`);
    const tabColor = new RegExp(`<${prefix}tabColor\\b[^>]*/>`);
    if (selfClosingSheetPr.test(xml)) xml = xml.replace(selfClosingSheetPr, `<${prefix}sheetPr$1><${prefix}tabColor rgb="${rgb}"/></${prefix}sheetPr>`);
    else if (sheetPr.test(xml)) xml = tabColor.test(xml) ? xml.replace(tabColor, `<${prefix}tabColor rgb="${rgb}"/>`) : xml.replace(sheetPr, `<${prefix}sheetPr$1><${prefix}tabColor rgb="${rgb}"/>`);
    else xml = xml.replace(new RegExp(`<${prefix}worksheet\\b([^>]*)>`), `<${prefix}worksheet$1><${prefix}sheetPr><${prefix}tabColor rgb="${rgb}"/></${prefix}sheetPr>`);
    xml = xml.replace(new RegExp(`<${prefix}pane\\b[^>]*/>`, 'g'), '');
    const view = new RegExp(`<${prefix}sheetView\\b([^>]*)>`);
    if (!view.test(xml)) throw new Error(`Missing sheetView for ${item.name}`);
    xml = xml.replace(view, `<${prefix}sheetView$1><${prefix}pane xSplit="3" ySplit="4" topLeftCell="D5" activePane="bottomRight" state="frozen"/>`);
    zip.file(sheetPath, xml);
    repaired++;
  }
  await fs.writeFile(workbookPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log(`${workbookPath}: repaired ${repaired} weapon-sheet D5 freeze panes`);
}
