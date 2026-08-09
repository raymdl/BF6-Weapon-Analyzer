import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(r'C:/Users/royal/Documents/BF6 Weapon Analyzer')
audit = root / 'migration' / '1.3.3.0' / 'attachment-audit'
doc = json.loads((audit / 'attachment-screenshot-review.json').read_text(encoding='utf-8'))
rows = [r for r in doc['records'] if '\\Carbine\\' in r['source']['originalPath'] and r.get('stats') and r.get('attachmentCost') is None]
font = ImageFont.load_default()
tile_w, tile_h = 640, 180
for batch_start in range(0, len(rows), 20):
    batch = rows[batch_start:batch_start+20]
    cols, rows_n = 2, math.ceil(len(batch)/2)
    sheet = Image.new('RGB', (cols*tile_w, rows_n*tile_h), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, record in enumerate(batch):
        image = Image.open(record['source']['currentPath']).convert('RGB')
        crop = image.crop((25, 455, 600, 650)).resize((tile_w, 145))
        x, y = (i % cols)*tile_w, (i // cols)*tile_h
        sheet.paste(crop, (x, y+35))
        label = f"{batch_start+i+1}/80 {record['weaponName']} | {record['attachmentType']} | {record['attachmentName']} | {Path(record['source']['currentPath']).name}"
        draw.text((x+4, y+4), label, fill='black', font=font)
    out = audit / f'carbine-cost-contact-{batch_start//20+1}.png'
    sheet.save(out)
print(f'created {math.ceil(len(rows)/20)} cost contact sheets for {len(rows)} records')
