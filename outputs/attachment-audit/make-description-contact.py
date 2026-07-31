from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, re, math

root = Path(r'C:\Users\royal\Documents\BF6 Project')
artifact = root / 'outputs' / 'attachment-audit' / 'attachment-screenshot-review.json'
records = json.loads(artifact.read_text(encoding='utf-8'))['records']
flagged = [r for r in records if r.get('attachmentDescription') and re.match(r'[a-z]', r['attachmentDescription'])]
font = ImageFont.load_default()
out = root / 'outputs' / 'attachment-audit'
for page in range(math.ceil(len(flagged) / 6)):
    batch = flagged[page * 6:(page + 1) * 6]
    thumbs = []
    for r in batch:
        image_path = Path(r['source']['originalPath'])
        if not image_path.exists():
            image_path = Path(r['source']['currentPath'])
        im = Image.open(image_path).convert('RGB')
        # The description is the left-center card body; enlarge that region for visual transcription.
        im = im.crop((0, int(im.height * 0.24), int(im.width * 0.56), int(im.height * 0.57)))
        im.thumbnail((480, 270))
        canvas = Image.new('RGB', (500, 330), 'white')
        canvas.paste(im, ((500 - im.width)//2, 4))
        draw = ImageDraw.Draw(canvas)
        label = f"{r['weaponName']} | {r['attachmentType']} | {r['source']['captureTimestamp']}"
        draw.text((4, 280), label, fill='black', font=font)
        draw.text((4, 296), r['attachmentName'][:65], fill='black', font=font)
        thumbs.append(canvas)
    sheet = Image.new('RGB', (1500, 660), '#dddddd')
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % 3) * 500, (i // 3) * 330))
    sheet.save(out / f'description-flagged-{page+1}.jpg', quality=90)
print(f'Wrote {math.ceil(len(flagged)/6)} sheets for {len(flagged)} descriptions')
