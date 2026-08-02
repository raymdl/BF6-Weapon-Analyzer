import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(r'C:\Users\royal\Documents\BF6 Project')
j=json.loads((root/'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json').read_text(encoding='utf-8'))
rows=[]
for r in j['records']:
    if r.get('weaponName') not in {'AK-205','BROD 3','GRT-BC','M277','M417 A2','M4A1','QBZ-192','SG 553R','SOR-300SC'} or r.get('attachmentType')=='Overview': continue
    notes=' '.join(r.get('notes',[]))
    d=r.get('attachmentDescription') or ''
    if ('Description quality flag' in notes or 'Description begins with a lowercase' in notes or any(ord(c)>127 for c in d) or (d and d[-1] not in '.!?')):
        rows.append(r)
font=ImageFont.load_default(); out=root/'migration/1.3.3.0/attachment-audit/description-contact-sheets'; out.mkdir(exist_ok=True)
for batch in range(0,len(rows),20):
    subset=rows[batch:batch+20]; sheet=Image.new('RGB',(1400,20*190),'white'); draw=ImageDraw.Draw(sheet)
    for i,r in enumerate(subset):
        p=Path(r['source']['currentPath'])
        try: im=Image.open(p).convert('RGB').resize((700,394))
        except Exception as e: draw.text((5,i*190+5),f'ERROR {p}: {e}',fill='red',font=font); continue
        # Description/title area from the supplied 1365x768 screenshot.
        crop=im.crop((20,120,700,205)).resize((680,85))
        y=i*190; sheet.paste(crop,(0,y));
        label=f"{r['weaponName']} | {Path(p).name} | {r.get('attachmentName')}"
        draw.rectangle((700,y,1400,y+190),fill='white'); draw.text((710,y+5),label,fill='black',font=font)
        draw.text((710,y+25),'CURRENT: '+(r.get('attachmentDescription') or '<null>')[:115],fill='black',font=font)
        draw.text((710,y+45),'NOTES: '+(' '.join(n for n in r.get('notes',[]) if 'Description' in n))[:115],fill='black',font=font)
    sheet.save(out/f'description-contact-{batch//20+1}.png')
print(f'flagged={len(rows)} sheets={(len(rows)+19)//20}')
