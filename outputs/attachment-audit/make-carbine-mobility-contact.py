import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(r'C:\Users\royal\Documents\BF6 Project')
j=json.loads((root/'outputs/attachment-audit/attachment-screenshot-review.json').read_text(encoding='utf-8'))
rows=[r for r in j['records'] if '\\Weapon Attachments\\Carbine\\' in r['source']['currentPath'] and r.get('stats') and r['stats'].get('mobility') is None]
out=root/'outputs/attachment-audit/mobility-contact-sheets';out.mkdir(exist_ok=True)
font=ImageFont.load_default()
for b in range(0,len(rows),6):
 sheet=Image.new('RGB',(1400,6*280),'white');d=ImageDraw.Draw(sheet)
 for i,r in enumerate(rows[b:b+6]):
  im=Image.open(r['source']['currentPath']).convert('RGB').resize((700,394)); crop=im.crop((470,65,700,230)).resize((460,330))
  y=i*280;sheet.paste(crop,(0,y));d.text((470,y+5),Path(r['source']['currentPath']).name,fill='black',font=font);d.text((470,y+22),r['weaponName']+' | '+r['attachmentName'],fill='black',font=font)
 sheet.save(out/f'mobility-contact-{b//6+1}.png')
print(len(rows))
