from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\royal\Documents\BF6 Weapon Analyzer")
INPUT = Path(__import__('os').environ.get('BF6_ATTACHMENT_COMPARISON_INPUT', str(ROOT / "Weapon Attachments" / "Assault Rifle")))
OUTPUT = Path(__import__('os').environ.get('BF6_ATTACHMENT_COMPARISON_OUTPUT', str(ROOT / "migration" / "1.3.3.0" / "attachment-audit" / "stat-comparisons.json")))
FIELDS = [
    ("damage", 930, 1035, 150, 210), ("rateOfFireRpm", 930, 1035, 220, 270),
    ("magazineSize", 930, 1035, 285, 335), ("hipfire", 1210, 1305, 145, 190),
    ("precision", 1210, 1305, 190, 230), ("control", 1210, 1305, 230, 270),
    ("mobility", 1210, 1305, 270, 315), ("reloadTimeSeconds", 1160, 1305, 375, 405),
    ("muzzleVelocityMps", 1160, 1305, 405, 435), ("adsTimeMs", 1160, 1305, 435, 465),
    ("headshotMultiplier", 1160, 1305, 465, 500), ("longRangeDamage", 1160, 1305, 505, 530),
    ("spotOnFire3dM", 1160, 1305, 530, 550), ("spotOnFire2dM", 1160, 1305, 550, 570),
    ("opponentHealthRegenDelaySeconds", 1160, 1305, 570, 590),
    ("collateralMultiplier", 1160, 1305, 590, 610),
    ("adsMoveSpeedMultiplier", 1160, 1305, 630, 650), ("sprintRecoveryMs", 1160, 1305, 650, 675),
    ("recoilAmountDegrees", 1160, 1305, 675, 705), ("recoilVariationDegrees", 1160, 1305, 700, 732),
]


def comparison(array: np.ndarray, bounds: tuple[int, int, int, int], width: int, height: int):
    x1, x2, y1, y2 = bounds
    xs = np.minimum((np.arange(x1, x2 + 1) * (width / 1365.0)).astype(int), width - 1)
    ys = np.minimum((np.arange(y1, y2 + 1) * (height / 768.0)).astype(int), height - 1)
    pixels = array[np.ix_(ys, xs)]
    red = (pixels[:, :, 0] >= 120) & (pixels[:, :, 0] > pixels[:, :, 1] * 1.28) & (pixels[:, :, 0] > pixels[:, :, 2] * 1.28)
    green = (pixels[:, :, 1] >= 100) & (pixels[:, :, 1] > pixels[:, :, 0] * 1.12) & (pixels[:, :, 1] > pixels[:, :, 2] * 1.12)
    red_count, green_count = int(red.sum()), int(green.sum())
    dominant, mask, count, other = ("red", red, red_count, green_count) if red_count > green_count else ("green", green, green_count, red_count)
    if red_count == green_count or count < 6 or count < min(red_count, green_count) * 2:
        return None
    points_y, points_x = np.nonzero(mask)
    ref_x = points_x + x1
    ref_y = points_y + y1
    columns = np.unique(ref_x)
    if not len(columns):
        return None
    end_index = 0
    for i in range(1, len(columns)):
        if columns[i] - columns[i - 1] > 2:
            break
        end_index = i
    group_start, group_end = int(columns[0]), int(columns[end_index])
    arrow = (ref_x >= group_start) & (ref_x <= group_end)
    arrow_y = ref_y[arrow]
    if arrow_y.size < 5:
        return None
    min_y, max_y = int(arrow_y.min()), int(arrow_y.max())
    if max_y - min_y < 2:
        return None
    mid = (min_y + max_y) / 2.0
    top, bottom = int((arrow_y <= mid).sum()), int((arrow_y > mid).sum())
    direction = "up" if bottom >= top * 1.2 else "down" if top >= bottom * 1.2 else None
    if direction is None:
        first, last = int((arrow_y == min_y).sum()), int((arrow_y == max_y).sum())
        direction = "up" if last >= first * 1.5 else "down" if first >= last * 1.5 else None
    if direction is None:
        return None
    return {
        "direction": direction, "effect": "buff" if dominant == "green" else "penalty", "color": dominant,
        "confidence": round((max(top, bottom) / max(1, top + bottom) + count / max(1, red_count + green_count)) / 2, 3),
        "coloredPixelCount": count, "arrowBounds": {"x1": group_start, "x2": group_end, "y1": min_y, "y2": max_y},
    }


records = []
for directory in sorted(path for path in INPUT.iterdir() if path.is_dir()):
    for image_path in sorted(directory.glob("*.png")):
        if "_attachment_overview" in image_path.name:
            continue
        with Image.open(image_path).convert("RGB") as image:
            array = np.asarray(image)
            comparisons = {}
            for field, x1, x2, y1, y2 in FIELDS:
                item = comparison(array, (x1, x2, y1, y2), image.width, image.height)
                if item:
                    comparisons[field] = item
            records.append({"weapon": directory.name, "sourcePath": str(image_path), "sourceName": image_path.name, "resolution": f"{image.width}x{image.height}", "comparisons": comparisons})

OUTPUT.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
print(f"Stat comparisons extracted for {len(records)} screenshots: {OUTPUT}")
