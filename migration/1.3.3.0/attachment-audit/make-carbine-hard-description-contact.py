import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(r'C:\Users\royal\Documents\BF6 Weapon Analyzer')
j=json.loads((root/'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json').read_text(encoding='utf-8'))
specs=[('AK-205',3),('AK-205',4),('BROD 3',4),('BROD 3',7),('BROD 3',50),('GRT-BC',3),('GRT-BC',5),('GRT-BC',9),('M277',3),('M277',5),('M417 A2',3),('M417 A2',4),('M417 A2',22),('M4A1',3),('M4A1',5),('SG 553R',3),('SG 553R',5),('SOR-300SC',3),('SOR-300SC',5),('SOR-300SC',11)]
rows=[]
for w,n in specs:
 for r in j['records']:
  if r['weaponName']==w and '\\Weapon Attachments\\Carbine\\' in r['source']['currentPath'] and Path(r['source']['currentPath']).name.startswith(f'{n}_'):
   rows.append(r);break
out=root/'migration/1.3.3.0/attachment-audit/hard-description-contact-sheets';out.mkdir(exist_ok=True);font=ImageFont.load_default()
for b in range(0,len(rows),5):
 sheet=Image.new('RGB',(1400,5*190),'white');d=ImageDraw.Draw(sheet)
 for i,r in enumerate(rows[b:b+5]):
  im=Image.open(r['source']['currentPath']).convert('RGB');crop=im.crop((35,220,760,385)).resize((700,160));y=i*190;sheet.paste(crop,(0,y));d.text((710,y+8),Path(r['source']['currentPath']).name,fill='black',font=font);d.text((710,y+28),r['weaponName']+' | '+r['attachmentName'],fill='black',font=font)
 sheet.save(out/f'hard-description-contact-{b//5+1}.png')
print(len(rows))
