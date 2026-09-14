"""Extract BF6 Precision lookup tables from the Frosty GlacierGameConfiguration settings export."""

import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

SETTINGS = "Common/GameSetup/GameConfigurations/GlacierGameConfiguration/settings.xml"

# Class_0fd27406 scalar fields used to identify a weapon and select its base row.
OBJECT_FIELDS = {
    "rpm": "Field_5bd8006c",
    "adsRecoilAmount": "Field_22810b21",
    "adsRecoilAmountMult": "Field_50b8fd5b",
    "adsRecoilDecrease": "Field_28df1cde",
    "adsMinAngle": "Field_ac3cfd53",
    "recoilDuration": "Field_5a02dd65",
    "bulletVelocity": "Field_e5bb1946",
    "tacticalReload": "Field_85ff24a0",
    "damage": "Field_91bb7b5f",
}
MAGAZINE_FIELD = "Field_7f22bfb4"
# Struct_81d94d9f row fields.
ROW_FIELDS = {
    "amountSum": "Field_b521b248",
    "variationSum": "Field_303e9335",
    "rpm": "Field_14c4a054",
    "minAngle": "Field_ac3cfd53",
    "duration": "Field_5a02dd65",
    "decrease": "Field_28df1cde",
    "panel": "Field_aee62a28",
}
ROW_FLAGS = ("Field_5d2f3411", "Field_b2922d79", "Field_dfde0349", "Field_1c1c4149", "Field_d55c6d70", "Field_9aefcaf4")


def int32(text):
    value = int(text, 16) if text.startswith("0x") else int(text)
    return value - (1 << 32) if value >= 1 << 31 else value


def number(text):
    value = float(text)
    return int(value) if value.is_integer() else value


def site_fields(weapon):
    ads = (weapon.get("recoil") or {}).get("ads") or {}
    return {
        "rpm": weapon.get("rpm"),
        "adsRecoilAmount": ads.get("amount"),
        "adsRecoilAmountMult": ads.get("amountMult"),
        "adsRecoilDecrease": ads.get("decFactor"),
        "adsMinAngle": weapon.get("recoilIncAds"),
        "recoilDuration": ads.get("duration"),
        "bulletVelocity": weapon.get("bulletVel"),
        "tacticalReload": weapon.get("tacRld"),
        "damage": (weapon.get("dmg") or [{}])[0].get("d"),
        "magazine": weapon.get("mag"),
    }


def matches(source, site):
    return [key for key, value in source.items()
            if site.get(key) is not None and abs(value - site[key]) <= max(1e-3, abs(value) * 2e-3)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="Frosty XML export root")
    parser.add_argument("--weapons", type=Path, default=Path("data/weapons.json"))
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    settings = args.root / SETTINGS
    root = ET.parse(settings).getroot()
    weapons = json.loads(args.weapons.read_text(encoding="utf-8"))
    parents = root.findall("Class_fe5894b1")
    if len(parents) != 1:
        raise SystemExit(f"expected one table container, found {len(parents)}")
    order = [member.text.split(" ", 1)[1] for member in parents[0].findall("Field_d0874615/member")]
    objects = {item.get("Guid"): item for item in root.findall("Class_0fd27406")}

    tables = {}
    problems = []
    for index, guid in enumerate(order):
        item = objects[guid]
        source = {key: float(item.findtext(field)) for key, field in OBJECT_FIELDS.items()}
        source["magazine"] = int32(item.findtext(MAGAZINE_FIELD))
        ranked = sorted(((len(matches(source, site_fields(weapon))), weapon["id"]) for weapon in weapons), reverse=True)
        (score, weapon_id), (runner_up, _) = ranked[0], ranked[1]
        if score - runner_up < 2 or weapon_id in tables:
            problems.append(f"object {index} {guid}: ambiguous or duplicate match {ranked[:2]}")
            continue
        rows = []
        for row in item.findall("Field_4da34085/Struct_4da34085/Field_f028b424/Struct_7c8d7f6f/Field_59491962/member/Struct_81d94d9f"):
            values = {key: number(row.findtext(field)) for key, field in ROW_FIELDS.items()}
            values["amountSum"] = int32(row.findtext(ROW_FIELDS["amountSum"]))
            values["variationSum"] = int32(row.findtext(ROW_FIELDS["variationSum"]))
            values["valid"] = any(row.findtext(flag) == "True" for flag in ROW_FLAGS)
            rows.append(values)
        tables[weapon_id] = {
            "objectIndex": index,
            "guid": guid,
            "matchedFields": matches(source, site_fields(next(w for w in weapons if w["id"] == weapon_id))),
            "base": {
                "amountSum": int32(item.findtext("Field_22ce7cf3")),
                "variationSum": int32(item.findtext("Field_303e9335")),
                "rpm": number(item.findtext(OBJECT_FIELDS["rpm"])),
                "minAngle": number(item.findtext(OBJECT_FIELDS["adsMinAngle"])),
                "duration": number(item.findtext(OBJECT_FIELDS["recoilDuration"])),
                "decrease": number(item.findtext(OBJECT_FIELDS["adsRecoilDecrease"])),
            },
            "rows": rows,
        }

    missing = [weapon["id"] for weapon in weapons if weapon["id"] not in tables]
    result = {
        "schemaVersion": 1,
        "scope": "Precision (Weapon Attributes) lookup tables for the loadout panel. One table per weapon; rows give the panel value for a recoil amount tier sum, recoil variation tier sum, RPM, ADS minimum angle, recoil duration and recoil decrease factor.",
        "source": {
            "asset": SETTINGS.removesuffix(".xml"),
            "container": "Class_fe5894b1.Field_d0874615",
            "tableClass": "Class_0fd27406",
            "rowStruct": "Struct_81d94d9f",
            "settingsSha256": hashlib.sha256(settings.read_bytes()).hexdigest(),
            "weaponsSha256": hashlib.sha256(args.weapons.read_bytes()).hexdigest(),
        },
        "fieldMap": {"object": {**OBJECT_FIELDS, "magazine": MAGAZINE_FIELD}, "base": {"amountSum": "Field_22ce7cf3", "variationSum": "Field_303e9335"},
                     "row": ROW_FIELDS, "rowValidFlags": list(ROW_FLAGS)},
        "interpretation": "A row value of -1 in rpm, minAngle, duration or decrease matches any value; the row's matching flag is then false (for example minAngle on DMRs and sidearms, rpm on shotguns). A row with all six flags false (valid=false) is a fallback row. Weapon identity is matched from the listed object fields against data/weapons.json, because the object name hash is not decoded.",
        "tables": tables,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")
    print(f"{len(tables)} tables, {sum(len(t['rows']) for t in tables.values())} rows, missing {missing}")
    for problem in problems:
        print(problem)
    if problems or missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
