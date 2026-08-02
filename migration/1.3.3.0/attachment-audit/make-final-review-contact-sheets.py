from pathlib import Path
from PIL import Image, ImageDraw

preview_dir = Path(r'C:\Users\royal\Documents\BF6 Project\outputs\019fab2b-c548-7ec1-9ada-fa5a3726bdf3\previews-final-review')
output_dir = Path(r'C:\Users\royal\Documents\BF6 Project\outputs\019fab2b-c548-7ec1-9ada-fa5a3726bdf3\visual-qa')
output_dir.mkdir(parents=True, exist_ok=True)
files = sorted(p for p in preview_dir.glob('*.png') if '-reload-in-ads' not in p.name and '-screenshot-order' not in p.name)
thumb_w, thumb_h, label_h, cols, rows = 640, 360, 28, 2, 4
for page, start in enumerate(range(0, len(files), cols * rows), 1):
    selected = files[start:start + cols * rows]
    canvas = Image.new('RGB', (cols * thumb_w, rows * (thumb_h + label_h)), 'white')
    draw = ImageDraw.Draw(canvas)
    for index, file in enumerate(selected):
        image = Image.open(file).convert('RGB')
        image.thumbnail((thumb_w, thumb_h))
        x = (index % cols) * thumb_w
        y = (index // cols) * (thumb_h + label_h)
        canvas.paste(image, (x, y + label_h))
        draw.text((x + 8, y + 6), file.stem, fill='black')
    canvas.save(output_dir / f'contact-{page:02d}.png')
print(f'{len(files)} sheet previews across {page} contact sheets')
