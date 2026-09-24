"""Inventory captured 1.4.3.0 weapon roots and compare site identities.

This is a source census, not an MP availability classifier. It records raw
hashes and catalog GUIDs where present, and XML file/object GUIDs as fallback
identity evidence. KSG is retained if present in the XML overlay even when its
current raw capture is missing.
"""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path
import xml.etree.ElementTree as ET


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--datamining", type=Path, required=True)
    ap.add_argument("--identities", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--ledger", type=Path)
    args = ap.parse_args()
    build = args.datamining / "builds/1.4.3.0"
    raw_roots = [
        (build / "capture/collection/raw", "collection"),
        (build / "capture/weapon-audit-2026-09-23/raw", "weapon-audit-2026-09-23"),
    ]
    xml_root = build / "xml/xml-overlay/Common/Hardware/Weapons"
    identity = {w["internalId"]: w for w in json.loads(args.identities.read_text(encoding="utf-8"))["weapons"]}
    ledger = {}
    if args.ledger:
        db = sqlite3.connect(f"file:{args.ledger.resolve().as_posix()}?mode=ro", uri=True, timeout=1)
        try:
            ledger = {r[0].lower(): {"fileGuid": r[1], "rawSha256": r[2], "decodeStatus": r[3]}
                      for r in db.execute("select a.route,a.file_guid,c.raw_sha256,c.decode_status from assets a left join captures c on c.route=a.route")}
        finally:
            db.close()

    raw = {}
    status_by_route = {}
    status_path = build / "capture/weapon-audit-2026-09-23/raw-status.jsonl"
    if status_path.exists():
        for line in status_path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            status_by_route[row["path"].lower()] = row
    for raw_root, label in raw_roots:
        if not raw_root.exists():
            continue
        for p in raw_root.rglob("*.ebx"):
            n = p.name
            if n.startswith("GS_") and n.endswith(".ebx"):
                kind, weapon = "GS", n[3:-4]
            elif n.endswith("_WB.ebx"):
                kind, weapon = "WB", n[:-7]
            elif n.endswith("_Ability.ebx") and "_UBL_" not in n and "_Bipod_" not in n:
                kind, weapon = "Ability", n[:-12]
            else:
                continue
            route = p.relative_to(raw_root).as_posix()[:-4]
            status = status_by_route.get(route.lower(), {})
            # The new capture uses case-preserving route names. Prefer its
            # verified status hash; independently hash every file regardless.
            entry = {"path": route, "capture": label, "sha256": sha256(p), **ledger.get(route.lower(), {})}
            if status:
                entry["captureStatus"] = status.get("status")
                entry["statusSha256"] = status.get("sha256")
                entry["statusBytes"] = status.get("bytes")
            raw.setdefault(weapon, {})[kind] = entry

    xml = {}
    for p in xml_root.rglob("*.xml"):
        n = p.name
        if n.startswith("GS_") and n.endswith(".xml"):
            kind, weapon = "GS", n[3:-4]
        elif n.endswith("_WB.xml"):
            kind, weapon = "WB", n[:-7]
        elif n.endswith("_Ability.xml") and "_UBL_" not in n and "_Bipod_" not in n:
            kind, weapon = "Ability", n[:-12]
        else:
            continue
        root = ET.parse(p).getroot()
        route = p.relative_to(build / "xml/xml-overlay").as_posix()[:-4]
        item = {"path": route, "sha256": sha256(p), "fileGuid": root.get("Guid")}
        for obj in list(root):
            if obj.get("Guid"):
                item["rootObjectGuid"] = obj.get("Guid")
                item["rootClass"] = obj.tag
                break
        xml.setdefault(weapon, {})[kind] = item

    roots = []
    candidates = set(xml) | {w for w, kinds in raw.items() if set(kinds) == {"GS", "WB", "Ability"}}
    for weapon in sorted(candidates):
        raw_entry, xml_entry = raw.get(weapon, {}), xml.get(weapon, {})
        by_kind = {}
        for kind in ("GS", "WB", "Ability"):
            by_kind[kind] = {"rawCapture": raw_entry.get(kind), "xmlOverlay": xml_entry.get(kind)}
        present = [k for k, v in raw_entry.items()]
        roots.append({
            "internalId": weapon,
            "siteIdentity": identity.get(weapon, {}).get("siteId"),
            "siteDisplayName": identity.get(weapon, {}).get("siteName"),
            "catalogCategory": identity.get(weapon, {}).get("sourceCategory"),
            "captureStatus": "complete-three-roots" if set(present) == {"GS", "WB", "Ability"} else "partial-or-uncaptured",
            "roots": by_kind,
            "mpStatus": "candidate-unclassified",
            "mpEvidence": "No MP inclusion is inferred from weapon name, folder/category, site identity, or asset presence. See the accompanying roster review."
        })
    args.out.parent.mkdir(parents=True, exist_ok=True)
    status_hash = sha256(status_path) if status_path.exists() else None
    registry_route = "Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons"
    registry = ledger.get(registry_route.lower(), {})
    sample = next(r for r in roots if r["internalId"] == "6P67")
    presentation_routes = []
    for route in (
        "Common/Hardware/Weapons/MG/M240L/PresEx_M240L",
        "Common/Hardware/Weapons/Secondary/FiveSeven/PresEx_FiveSeven",
        "Common/Hardware/Weapons/Secondary/M45A1/PresEx_M45A1",
        "Common/Hardware/Weapons/Secondary/G22/PresEx_G22",
    ):
        presentation_routes.append({"path": route, **ledger.get(route.lower(), {})})
    args.out.write_text(json.dumps({
        "schemaVersion": 1,
        "build": "1.4.3.0",
        "method": "Pair exact primary GS_<id>, <id>_WB, and <id>_Ability filenames under Common/Hardware/Weapons; include XML overlay candidates even if the raw capture is absent. Identity mapping is annotation only.",
        "rawCaptureSources": ["capture/collection/raw", "capture/weapon-audit-2026-09-23/raw"],
        "rawStatusPath": "capture/weapon-audit-2026-09-23/raw-status.jsonl",
        "rawStatusSha256": status_hash,
        "identityMapPath": args.identities.as_posix(),
        "identityMapSha256": sha256(args.identities),
        "mpReferenceReview": {
            "status": "unresolved",
            "registry": {"path": registry_route, **registry, "objectCount": 28807},
            "sampleWeaponReference": {
                "sourcePath": sample["roots"]["WB"]["rawCapture"]["path"],
                "sourceFileGuid": sample["roots"]["WB"]["rawCapture"].get("fileGuid"),
                "sourceRawSha256": sample["roots"]["WB"]["rawCapture"]["sha256"],
                "pointer": "Struct_9bc51bd0/Field_6b28f68f",
                "targetPath": registry_route,
                "sampleTargetObjectGuid": "7a974050-75e5-4d05-80d4-ebfca16d8213",
                "meaning": "Registry leaf reference; not proof of mode or MP availability."
            },
            "relatedPresentationExtensions": presentation_routes,
            "meaning": "Registry leaves and presentation-extension records require traced MP loadout/mode consumers before they can classify a weapon."
        },
        "roots": roots
    }, indent=2)+"\n", encoding="utf-8")
    print(f"Wrote {len(roots)} weapon-root candidates; current raw complete={sum(r['captureStatus']=='complete-three-roots' for r in roots)}")


if __name__ == "__main__":
    main()
