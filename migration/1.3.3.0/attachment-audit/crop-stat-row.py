#!/usr/bin/env python3
"""Make readable, label-anchored crops of Battlefield 6 stat rows.

This tool deliberately uses OCR only to locate a known LABEL.  It never uses
OCR text to read the stat value or the comparison arrow.  If pytesseract is
not installed, or the requested label is not found, the standard panel layout
is used as a proportional fallback.  The fallback coordinates are expressed
in the 1365x768 reference coordinate system and scaled from the actual image
dimensions, so it works for both corpus resolutions.

Single capture:
  python crop-stat-row.py --capture capture.png --stat hipfire precision

Batch requests (repeat --request as needed):
  python crop-stat-row.py --output-dir crops \
      --request capture-a.png hipfire control \
      --request capture-b.png recoilAmountDegrees

Each request is emitted as an upscaled PNG and recorded in manifest.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from PIL import Image


REFERENCE_WIDTH = 1365.0
REFERENCE_HEIGHT = 768.0

# Bounds are (x, y, width, height) in the 1365x768 reference layout.  They
# include the label, displayed value, and the comparison-arrow slot.
ROW_BOUNDS: dict[str, tuple[int, int, int, int]] = {
    "damage": (942, 143, 94, 70),
    "rateOfFireRpm": (942, 213, 94, 62),
    "magazineSize": (942, 276, 94, 62),
    "hipfire": (1018, 150, 267, 41),
    "precision": (1018, 197, 267, 36),
    "control": (1018, 239, 267, 35),
    "mobility": (1018, 281, 267, 33),
    "reloadTimeSeconds": (942, 373, 343, 31),
    "muzzleVelocityMps": (942, 403, 343, 31),
    "adsTimeMs": (942, 433, 343, 31),
    "headshotMultiplier": (942, 463, 343, 34),
    "longRangeDamage": (942, 500, 343, 27),
    "spotOnFire3dM": (942, 523, 343, 22),
    "spotOnFire2dM": (942, 545, 343, 22),
    "opponentHealthRegenDelaySeconds": (942, 567, 343, 22),
    "collateralMultiplier": (942, 589, 343, 22),
    "reloadInAds": (942, 610, 343, 22),
    "adsMoveSpeedMultiplier": (942, 630, 343, 22),
    "sprintRecoveryMs": (942, 651, 343, 23),
    "recoilAmountDegrees": (942, 670, 343, 25),
    "recoilVariationDegrees": (942, 695, 343, 30),
}

# The requested canonical set is kept explicit so typos fail before any file
# is written.  reloadInAds is accepted as it is present in the corpus schema
# and is required by the Phase 1 probe, even though it was omitted from the
# original user-supplied key list.
STAT_LABELS: dict[str, tuple[str, ...]] = {
    "hipfire": ("HIPFIRE",),
    "precision": ("PRECISION",),
    "control": ("CONTROL",),
    "mobility": ("MOBILITY",),
    "recoilAmountDegrees": ("RECOIL", "AMOUNT"),
    "adsMoveSpeedMultiplier": ("ADS", "MOVE", "SPEED", "MULTIPLIER"),
    "sprintRecoveryMs": ("SPRINT", "RECOVERY"),
    "adsTimeMs": ("ADS", "TIME", "IN"),
    "spotOnFire3dM": ("3D", "SPOT", "ON", "FIRE", "RANGE"),
    "spotOnFire2dM": ("2D", "SPOT", "ON", "FIRE", "RANGE"),
    "magazineSize": ("MAG",),
    "damage": ("DMG",),
    "rateOfFireRpm": ("ROF",),
    "reloadTimeSeconds": ("RELOAD", "TIME"),
    "muzzleVelocityMps": ("MUZZLE", "VELOCITY"),
    "headshotMultiplier": ("HEADSHOT", "MULTIPLIER"),
    "longRangeDamage": ("LONG", "RANGE", "DAMAGE"),
    "collateralMultiplier": ("COLLATERAL", "MULTIPLIER"),
    "opponentHealthRegenDelaySeconds": ("OPPONENT", "HEALTH", "REGEN", "DELAY"),
    "recoilVariationDegrees": ("RECOIL", "VARIATION"),
    "reloadInAds": ("RELOAD", "IN", "ADS"),
}

# OCR commonly drops punctuation or turns 3D/2D into a single token.  These
# aliases are used only for matching a label line, never for value extraction.
LABEL_ALIASES: dict[str, tuple[tuple[str, ...], ...]] = {
    "spotOnFire3dM": (("3D", "SPOT", "ON", "FIRE", "RANGE"), ("3D", "SPOTONFIRERANGE"), ("3DSPOTONFIRERANGE",)),
    "spotOnFire2dM": (("2D", "SPOT", "ON", "FIRE", "RANGE"), ("2D", "SPOTONFIRERANGE"), ("2DSPOTONFIRERANGE",)),
}


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("._") or "capture"


def normalize_token(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def label_matches(tokens: list[str], stat: str) -> bool:
    candidates = LABEL_ALIASES.get(stat, (STAT_LABELS[stat],))
    normalized = [normalize_token(token) for token in tokens]
    normalized = [token for token in normalized if token]
    for wanted in candidates:
        wanted_norm = [normalize_token(token) for token in wanted]
        if len(wanted_norm) == 1 and wanted_norm[0] in normalized:
            return True
        for start in range(0, len(normalized) - len(wanted_norm) + 1):
            if normalized[start : start + len(wanted_norm)] == wanted_norm:
                return True
    return False


def locate_label_with_pytesseract(image: Image.Image, stat: str) -> tuple[float, str] | None:
    """Return the label-line y centre, using OCR word boxes only.

    This optional path is intentionally conservative.  OCR is run on a panel
    crop and its word boxes are grouped into lines; no OCR digit is consumed.
    """
    try:
        import pytesseract  # type: ignore
        from pytesseract import Output  # type: ignore
    except ImportError:
        return None

    panel = image.crop((int(image.width * 0.66), int(image.height * 0.13), image.width, image.height))
    upscale = 2
    scan = panel.resize((panel.width * upscale, panel.height * upscale), Image.Resampling.LANCZOS)
    try:
        data = pytesseract.image_to_data(scan, config="--psm 11", output_type=Output.DICT)
    except Exception:
        return None

    words: list[tuple[str, float, float, float, float]] = []
    for i, raw in enumerate(data.get("text", [])):
        token = normalize_token(raw)
        if not token:
            continue
        try:
            x = float(data["left"][i]) / upscale
            y = float(data["top"][i]) / upscale
            w = float(data["width"][i]) / upscale
            h = float(data["height"][i]) / upscale
        except (KeyError, TypeError, ValueError, IndexError):
            continue
        words.append((token, x, y, w, h))

    # Labels are single visual lines.  Group OCR words by their y centre with
    # a tolerance based on the observed word height.
    lines: list[list[tuple[str, float, float, float, float]]] = []
    for word in sorted(words, key=lambda item: (item[2], item[1])):
        centre = word[2] + word[4] / 2
        placed = False
        for line in lines:
            line_centre = sum(item[2] + item[4] / 2 for item in line) / len(line)
            if abs(centre - line_centre) <= max(4.0, word[4] * 0.7):
                line.append(word)
                placed = True
                break
        if not placed:
            lines.append([word])

    for line in lines:
        line.sort(key=lambda item: item[1])
        if label_matches([item[0] for item in line], stat):
            centre = sum(item[2] + item[4] / 2 for item in line) / len(line)
            return panel.top + centre, "label-anchored:pytesseract-word-boxes"
    return None


def scaled_bounds(image: Image.Image, stat: str) -> tuple[int, int, int, int]:
    x, y, width, height = ROW_BOUNDS[stat]
    sx = image.width / REFERENCE_WIDTH
    sy = image.height / REFERENCE_HEIGHT
    left = max(0, int(round(x * sx)))
    top = max(0, int(round(y * sy)))
    right = min(image.width, int(round((x + width) * sx)))
    bottom = min(image.height, int(round((y + height) * sy)))
    return left, top, right, bottom


def anchored_bounds(image: Image.Image, stat: str, label_y: float) -> tuple[int, int, int, int]:
    x, y, width, height = ROW_BOUNDS[stat]
    sx = image.width / REFERENCE_WIDTH
    sy = image.height / REFERENCE_HEIGHT
    expected_label_centre = y + height / 2
    top = label_y - (expected_label_centre - y) * sy
    left = x * sx
    right = (x + width) * sx
    bottom = top + height * sy
    return max(0, int(round(left))), max(0, int(round(top))), min(image.width, int(round(right))), min(image.height, int(round(bottom)))


def infer_weapon(path: Path) -> str:
    return path.parent.name or "unknown-weapon"


def requests_from_args(args: argparse.Namespace) -> list[tuple[Path, str]]:
    requests: list[tuple[Path, str]] = []
    if args.capture:
        if not args.stat:
            raise SystemExit("--capture requires one or more --stat names")
        for stats in args.stat:
            requests.extend((Path(args.capture), stat) for stat in stats)
    for request in args.request or []:
        if len(request) < 2:
            raise SystemExit("each --request needs a capture path followed by one or more stat names")
        requests.extend((Path(request[0]), stat) for stat in request[1:])
    if not requests:
        raise SystemExit("provide --capture/--stat or at least one --request")
    unknown = sorted({stat for _, stat in requests if stat not in ROW_BOUNDS})
    if unknown:
        raise SystemExit("unknown stat key(s): " + ", ".join(unknown))
    return requests


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--capture", help="one capture path; pair with one or more --stat names")
    parser.add_argument("--stat", action="append", nargs="+", metavar="STAT", help="one or more canonical stat keys for --capture; repeatable")
    parser.add_argument("--request", action="append", nargs="+", metavar=("CAPTURE", "STAT"), help="repeatable batch request: path followed by one or more stat keys")
    parser.add_argument("--output-dir", default="row-crops", help="directory for PNGs and manifest.json")
    parser.add_argument("--manifest", default="manifest.json", help="manifest filename inside --output-dir")
    parser.add_argument("--scale", type=float, default=4.0, help="output enlargement factor (default: 4)")
    args = parser.parse_args()
    if args.scale <= 0:
        parser.error("--scale must be positive")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, Any]] = []
    for capture, stat in requests_from_args(args):
        if not capture.is_file():
            raise SystemExit(f"capture not found: {capture}")
        with Image.open(capture) as source:
            image = source.convert("RGB")
        located = locate_label_with_pytesseract(image, stat)
        if located is None:
            bounds = scaled_bounds(image, stat)
            anchor_method = "proportional-fallback:1365x768-reference-layout"
        else:
            label_y, anchor_method = located
            bounds = anchored_bounds(image, stat, label_y)
        crop = image.crop(bounds)
        output_size = (max(1, round(crop.width * args.scale)), max(1, round(crop.height * args.scale)))
        crop = crop.resize(output_size, Image.Resampling.LANCZOS)
        digest = hashlib.sha1(str(capture.resolve()).encode("utf-8")).hexdigest()[:8]
        name = f"{safe_name(infer_weapon(capture))}__{safe_name(capture.stem)}__{stat}__{digest}.png"
        destination = output_dir / name
        crop.save(destination, format="PNG")
        manifest.append({
            "weapon": infer_weapon(capture),
            "capture": capture.name,
            "sourcePath": str(capture.resolve()),
            "stat": stat,
            "cropPath": str(destination.resolve()),
            "anchorMethod": anchor_method,
            "sourceResolution": {"width": image.width, "height": image.height},
            "sourceBounds": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
            "scale": args.scale,
        })

    manifest_path = output_dir / args.manifest
    manifest_path.write_text(json.dumps({"crops": manifest}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"cropCount": len(manifest), "outputDirectory": str(output_dir.resolve()), "manifest": str(manifest_path.resolve())}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
