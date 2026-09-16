"""Merge research evidence into reference-data/frosty/asset-watchlist.json.

Each evidence ID names a report or file. Asset paths come from its hash-key sections
when present, otherwise from catalog-matched path mentions (the seed's selection rule).
New assets get direct [Ebx] references from the XML export when the XML exists.
Existing entries keep their dependencies; only their evidence lists grow. An entry
still marked pending-export is scanned once its XML appears in the export.

Usage: python scripts/frosty-watchlist-merge.py --datamining "C:/Users/royal/Documents/BF6 Datamining" [--write]
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WATCHLIST = REPO / "reference-data/frosty/asset-watchlist.json"
P = "reference-data/provenance/"
HASH_SELECTION = "source hash keys when available; otherwise catalog-matched path mentions; inclusion is not proof of runtime use"
MENTION_SELECTION = "catalog-matched path mentions; inclusion is not proof of runtime use"

# id: (path, purpose, consumer)
EVIDENCE = {
    "attachment-compatibility": (P + "frosty-attachment-compatibility.json",
        "Root-listed physical mount slots and equipment attachment dependencies, including unsupported source choices", "scripts/frosty-attachment-compatibility.py"),
    "site-attachment-mapping": (P + "frosty-site-attachment-mapping-2026-09-13.json",
        "Site attachment choices linked to Frosty attachments, abilities, selectors and UI text", "scripts/frosty-attachment-tooltips.py"),
    "optic-categories": (P + "frosty-optic-category-mapping-2026-09-13.json",
        "Per-weapon Frosty optics, labels and point costs behind the site's optic categories", "scripts/optic-costs.test.mjs"),
    "tooltip-generator": ("scripts/frosty-attachment-tooltips.py",
        "Assets read directly by the tooltip and optic generator", "scripts/frosty-attachment-tooltips.py"),
    "source-arrays": (P + "frosty-array-review-2026-09-09.json",
        "Shared ADS, hipfire, moving and zoom arrays", "scripts/source-arrays.test.mjs"),
    "damage-curves": (P + "frosty-damage-curve-review-2026-09-13.json",
        "Projectile damage curves used for every site weapon", None),
    "recoil-duration": (P + "frosty-recoil-duration-audit-2026-09-11.json",
        "Base recoil durations and Smooth modifier operands", None),
    "draw-time": (P + "frosty-draw-time-2026-09-09.json",
        "Deploy and sprint timing arrays", "scripts/draw-time.test.mjs"),
    "distribution-exponents": (P + "frosty-distribution-exponents-2026-09-13.json",
        "Spread distribution exponents", None),
    "cadence-reloads": (P + "frosty-1.4.2.5-cadence-reloads-spread-selectors-2026-09-12.json",
        "Bolt/pump cadence, reload timing and spread selectors", None),
    "ammo-costs": (P + "frosty-1.4.2.5-ammo-costs.json", "Ammunition point costs", None),
    "magazine-costs": (P + "frosty-1.4.2.5-magazine-costs.json", "Magazine point costs", None),
    "ammo-drag": (P + "frosty-1.4.2.5-ammo-drag.json", "Ammunition drag and penetration projectiles", None),
    "shotgun-ammo": (P + "frosty-shotgun-ammo.json", "Shotgun pellet and slug projectiles", None),
    "shotgun-fire-timing": (P + "frosty-shotgun-fire-timing.json", "Shotgun fire timing", None),
    "grx-field-names": (P + "frosty-grx-field-names-2026-09-13.json",
        "Semantic names for hashed fields from the GameRemixer registry", None),
    "weapon-display-names": (P + "frosty-weapon-display-names-2026-09-13.json", "Weapon display names", None),
    "weapon-ui-metadata": ("docs/working/FROSTY_DISPLAY_NAMES.md",
        "Weapon UI metadata and localization assets that link weapons to display names", None),
    "attachment-identity": (P + "frosty-attachment-identity-followup-2026-09-13.json",
        "Reviewed attachment identities and UI links", "scripts/frosty-attachment-tooltips.py"),
    "magazine-identity": (P + "frosty-magazine-identity-review-2026-09-07.json", "Magazine identities and effects", None),
    "soldier-aiming": (P + "frosty-soldier-aiming-review.json",
        "Exploratory soldier aiming graph; no equation established", None),
    "material-grid-inventory": (P + "frosty-material-grid-inventory-2026-09-14.json",
        "Material-grid record types, soldier damage records and surface penetration", None),
    "interdictor-1.4.3.0": ("docs/archive/INTERDICTOR_1.4.3.0_CHECK.md",
        "Assets to compare for the 1.4.3.0 Interdictor changes", None),
}

REF = re.compile(r"\[Ebx\]\s+([^\[]+?)\s+\[[0-9a-fA-F-]{36}\]")
MENTION = re.compile(r"(?i)\b((?:common|game|_af|animations)/[A-Za-z0-9_./\-]+)")
HASH_KEY = re.compile(r"(?i)sha|hash")


def norm(text):
    return re.sub(r"\.(xml|ebx)$", "", text.strip().rstrip("./"), flags=re.I).lower()


def hash_key_paths(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if (HASH_KEY.search(key) or key == "sourceFiles") and isinstance(value, dict):
                yield from value.keys()
            yield from hash_key_paths(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from hash_key_paths(value)


def select(path, catalog, basenames):
    text = (REPO / path).read_text(encoding="utf-8", errors="replace")
    if path.endswith(".json"):
        text = text.replace("\\\\", "/")  # Windows source paths are JSON-escaped backslashes
        keys = [norm(k) for k in hash_key_paths(json.loads(text))]
        keyed = {catalog[n] for n in keys if n in catalog}
        # Some reports key hashes by file name only; accept a name that is unique in the catalog.
        keyed |= {basenames[n][0] for n in keys if "/" not in n and len(basenames.get(n, [])) == 1}
        if keyed:
            return keyed, HASH_SELECTION
    return {catalog[n] for n in map(norm, MENTION.findall(text)) if n in catalog}, MENTION_SELECTION


def xml_dependencies(xml, asset_path):
    return sorted({m for m in REF.findall(xml.read_text(encoding="utf-8", errors="replace"))
                   if m.lower() != asset_path.lower()}, key=str.lower)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--datamining", type=Path, required=True)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    watchlist = json.loads(WATCHLIST.read_text(encoding="utf-8"))
    catalog_file = args.datamining / Path(watchlist["catalog"]["location"]).relative_to("datamining")
    if hashlib.sha256(catalog_file.read_bytes()).hexdigest() != watchlist["catalog"]["sha256AtSeed"]:
        raise SystemExit(f"Catalog hash changed: {catalog_file}")
    catalog = {}
    for line in catalog_file.with_suffix(".txt").read_text(encoding="utf-8", errors="replace").splitlines():
        if "/" in line:
            catalog.setdefault(line.strip().lower(), line.strip())
    basenames = {}
    for key, value in catalog.items():
        basenames.setdefault(key.rsplit("/", 1)[-1], []).append(value)
    xml_root = args.datamining / Path(watchlist["locations"]["xmlRoot"]).relative_to("datamining")
    assets = {a["path"].lower(): a for a in watchlist["assets"]}
    before = len(assets)
    for evidence_id, (path, purpose, consumer) in EVIDENCE.items():
        selected, selection = select(path, catalog, basenames)
        entry = {"path": path, "sha256AtSeed": hashlib.sha256((REPO / path).read_bytes()).hexdigest(),
                 "selection": selection, "purpose": purpose}
        if consumer:
            entry["consumer"] = consumer
        watchlist["evidence"][evidence_id] = entry
        added = 0
        for asset_path in selected:
            asset = assets.get(asset_path.lower())
            if not asset:
                asset = assets[asset_path.lower()] = {
                    "path": asset_path, "evidence": [],
                    "formats": ["raw-ebx"] if "materialgrid" in asset_path.lower() else ["raw-ebx", "xml"],
                    "dependencyScan": "pending-export", "dependencies": []}
                added += 1
            if evidence_id not in asset["evidence"]:
                asset["evidence"] = sorted(asset["evidence"] + [evidence_id])
        print(f"{evidence_id}: {len(selected)} assets ({added} new) via {selection.split(';')[0]}")
    scanned = 0
    for asset in assets.values():
        xml = xml_root / (asset["path"] + ".xml")
        if asset["dependencyScan"] == "pending-export" and "xml" in asset["formats"] and xml.is_file():
            asset["dependencies"] = xml_dependencies(xml, asset["path"])
            asset["dependencyScan"] = "existing-xml-direct-references"
            scanned += 1
    watchlist["assets"] = sorted(assets.values(), key=lambda a: a["path"].lower())
    print(f"assets: {before} -> {len(watchlist['assets'])}; newly scanned from XML: {scanned}; pending export: "
          f"{sum(a['dependencyScan'] == 'pending-export' for a in watchlist['assets'])}")
    if args.write:
        newline = "\r\n" if b"\r\n" in WATCHLIST.read_bytes()[:200] else "\n"
        with WATCHLIST.open("w", encoding="utf-8", newline=newline) as handle:
            handle.write(json.dumps(watchlist, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
