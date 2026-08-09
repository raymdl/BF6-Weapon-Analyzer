import json, os
from PIL import Image, ImageDraw, ImageFont

root = r'C:\Users\royal\Documents\BF6 Weapon Analyzer'
doc = json.load(open(os.path.join(root, 'migration', '1.3.3.0', 'attachment-audit', 'attachment-screenshot-review.json'), encoding='utf-8'))
man = json.load(open(os.path.join(root, 'migration', '1.3.3.0', 'attachment-audit', 'rename-manifest.json'), encoding='utf-8'))
records = {r['source']['originalPath']: r for r in doc['records']}
items = [e for e in man['entries'] if not e.get('renameAllowed', True) and e['weaponName'] not in ('M433','PP-19')]
font = ImageFont.load_default()
for weapon in sorted({e['weaponName'] for e in items}):
    rows = [e for e in items if e['weaponName'] == weapon]
    thumbs=[]
    for e in rows:
        r=records[e['sourcePath']]; p=r['source']['currentPath'] if os.path.exists(r['source']['currentPath']) else e['sourcePath']
        try:
            im=Image.open(p).convert('RGB'); im.thumbnail((320,180))
            card=Image.new('RGB',(340,220),'white'); card.paste(im,((340-im.width)//2,4))
            d=ImageDraw.Draw(card); label=f"{r['attachmentType']} | {r['attachmentName']} | {r['attachmentSubtype']}"
            d.text((4,188),label[:58],fill='black',font=font); d.text((4,201),e['sourceFilename'][-38:],fill='black',font=font)
            thumbs.append(card)
        except Exception as exc:
            print('skip',p,exc)
    cols=2; out=Image.new('RGB',(cols*340,((len(thumbs)+cols-1)//cols)*220),'#dddddd')
    for i,im in enumerate(thumbs): out.paste(im,((i%cols)*340,(i//cols)*220))
    out.save(os.path.join(root,'migration','1.3.3.0','attachment-audit',f'blocked-{weapon.replace(" ","_")}.jpg'),quality=85)
