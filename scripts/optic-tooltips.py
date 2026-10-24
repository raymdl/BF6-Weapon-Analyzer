#!/usr/bin/env python3
"""Fill the per-optic sight tooltips in data/attachment-tooltips.json.

The game describes optics by class (a "Sight 2.00x", a "Variable 1-4x"), not by
model, through the shared AD_* descriptor each optic's AAM record points to.
The tooltip generator collapses sights to the legacy site categories and writes
only the iron sights, so the individual optics the site lists since 2.1.1.0 had
no description. This step joins two provenance files that already hold the
link and needs no Frosty export:

  * the individual-optics report (site repo), weapons[w][] = {id, source}
  * the optic category mapping (research repo), categories[].members[] with
    the source path and its descriptor descriptions [{asset, id, text}]

Every (weapon, optic) must resolve to exactly one description id, and every
optic id must carry one id across all weapons; anything else stops the run.
Legacy category keys (std_optic, var_low, ...) the site no longer offers are
dropped from the sight slot.

Usage:
  python scripts/optic-tooltips.py --individual <report.json> --mapping <mapping.json>
      [--tooltips data/attachment-tooltips.json] [--attachments data/attachments.json] [--write]
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


def load(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def source_key(path):
    return path.lower().removesuffix(".xml")


def asset_key(asset):
    """A descriptor and its _nocaps variant carry the same string."""
    return asset.lower().removesuffix("_nocaps")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--individual", required=True, help="frosty-individual-optics-<date>.json")
    parser.add_argument("--mapping", required=True, help="frosty-optic-category-mapping-<date>.json")
    parser.add_argument("--tooltips", default="data/attachment-tooltips.json")
    parser.add_argument("--attachments", default="data/attachments.json")
    parser.add_argument("--write", action="store_true", help="write the tooltip file; otherwise report only")
    args = parser.parse_args()

    individual = load(args.individual)
    mapping = load(args.mapping)
    tooltips = load(args.tooltips)
    attachments = load(args.attachments)

    # Members by source path, the unresolved list included: a member there may
    # still name its descriptor asset, which the same asset resolves elsewhere.
    members = {}
    asset_ids = {}
    for member in [m for c in mapping["categories"] for m in c["members"]] + list(mapping.get("unresolvedSources") or []):
        members.setdefault(source_key(member["source"]), member)
        for description in member.get("descriptions") or []:
            if description.get("asset") and description.get("id") and description.get("text"):
                asset_ids.setdefault(asset_key(description["asset"]), (description["id"], description["text"]))

    legacy_ids = {s["id"] for s in attachments["SIGHTS"] if s.get("legacy")}
    offered = {w: set(a.get("sight", [])) for w, a in attachments["WEAPON_ATTS"].items()}

    by_weapon = tooltips["byWeapon"]
    descriptions = tooltips["descriptions"]
    per_optic = defaultdict(set)
    added = 0
    problems = []
    via_asset = []
    for weapon, optics in individual["weapons"].items():
        slot = by_weapon.setdefault(weapon, {}).setdefault("sight", {})
        for optic in optics:
            member = members.get(source_key(optic["source"]))
            if member is None:
                problems.append(f"{weapon}/{optic['id']}: no mapping member for {optic['source']}")
                continue
            ids = {}
            for description in member.get("descriptions") or []:
                if description.get("id") and description.get("text"):
                    ids[description["id"]] = description["text"]
                elif description.get("asset") and asset_key(description["asset"]) in asset_ids:
                    # The same descriptor asset, resolved on another weapon: the
                    # one string that asset carries, not a look-alike text.
                    desc_id, text = asset_ids[asset_key(description["asset"])]
                    ids[desc_id] = text
                    via_asset.append(f"{weapon}/{optic['id']} via {description['asset']}")
            if len(ids) != 1:
                problems.append(f"{weapon}/{optic['id']}: {len(ids)} description ids {sorted(ids)}")
                continue
            (desc_id, text), = ids.items()
            if desc_id in descriptions and descriptions[desc_id] != text:
                problems.append(f"{desc_id}: text differs from the dictionary")
                continue
            descriptions.setdefault(desc_id, text)
            if slot.get(optic["id"]) != desc_id:
                added += 1
            slot[optic["id"]] = desc_id
            per_optic[optic["id"]].add(desc_id)

    for optic_id, ids in sorted(per_optic.items()):
        if len(ids) != 1:
            problems.append(f"{optic_id}: {len(ids)} description ids across weapons {sorted(ids)}")

    removed = 0
    for weapon, slots in by_weapon.items():
        sight = slots.get("sight") or {}
        for key in [k for k in sight if k in legacy_ids]:
            del sight[key]
            removed += 1

    missing = []
    for weapon, ids in offered.items():
        slot = by_weapon.get(weapon, {}).get("sight", {})
        for optic_id in sorted(ids):
            if optic_id in legacy_ids or optic_id == "iron":
                continue
            if optic_id not in slot:
                missing.append(f"{weapon}/{optic_id}")

    covered = sum(1 for slots in by_weapon.values() for k in (slots.get("sight") or {}) if k != "iron")
    print(f"optic tooltips: {covered} weapon-optic entries, {len(per_optic)} optics, "
          f"{len({i for s in per_optic.values() for i in s})} description ids; "
          f"{added} set, {removed} legacy keys removed")
    if via_asset:
        print(f"resolved through the descriptor asset ({len(via_asset)}): " + ", ".join(via_asset))
    if missing:
        print(f"offered without a tooltip ({len(missing)}): " + ", ".join(missing))
    if problems:
        print("problems:\n  " + "\n  ".join(problems))
        return 1
    if args.write:
        # The file is CRLF throughout; keep it so the diff is the content.
        text = json.dumps(tooltips, indent=2, ensure_ascii=False) + "\n"
        with open(args.tooltips, "w", encoding="utf-8", newline="") as handle:
            handle.write(text.replace("\n", "\r\n"))
        print(f"wrote {args.tooltips}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
