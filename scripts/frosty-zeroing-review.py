"""Extract captured weapon zeroing blocks and their named GRX source records."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import xml.etree.ElementTree as ET


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def blocks(value, path=""):
    if isinstance(value, dict):
        if "Field_fdf17e6a" in value and "Field_410f6aa8" in value:
            yield path, value
        for key, child in value.items():
            yield from blocks(child, path + "/" + key)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from blocks(child, path + "/" + str(index))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--datamining", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error("Use a new output path.")
    repo = Path(__file__).resolve().parent.parent
    build = args.datamining / "builds/1.4.3.0"
    raw = build / "capture/collection/raw"
    descriptor = build / "capture/toolchain/SharedTypeDescriptors.ebx"
    decoder = repo / "scripts/frosty-ebx-decode.py"
    reader = runpy.run_path(str(decoder))
    types = reader["type_descriptors"](descriptor)
    grx_path = build / "xml/xml-overlay/Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons.xml"
    grx = ET.parse(grx_path).getroot()
    by_guid = {obj.get("Guid"): obj for obj in grx}
    rows, exceptions = [], []
    paths = sorted((raw / "Common/Hardware/Weapons").rglob("*_WB.ebx"))
    for path in paths:
        ebx = reader["Ebx"](path, types)
        decoded = ebx.decode()
        found = False
        for index, obj in enumerate(decoded["objects"]):
            for field_path, block in blocks(obj):
                found = True
                pointer = block["Field_fdf17e6a"]["Field_6b28f68f"]
                anchor_ref = pointer.get("$import") if isinstance(pointer, dict) else None
                anchor = by_guid.get(anchor_ref["classGuid"]) if anchor_ref else None
                name = anchor.findtext("Field_0c59fa06") if anchor is not None else None
                if anchor_ref:
                    assert anchor_ref["fileGuid"] == grx.get("Guid")
                if not name or not name.endswith(".Shot.Zeroing"):
                    exceptions.append({"route": path.relative_to(raw).as_posix(),
                                       "reason": "Missing/different named zeroing anchor", "anchor": anchor_ref})
                children = []
                if anchor is not None:
                    for member in anchor.findall("Field_080f1aaa/member"):
                        guid = member.text.split()[-1].strip("[]")
                        child = by_guid[guid]
                        children.append({"objectGuid": guid, "name": child.findtext("Field_0c59fa06"),
                                         "valueField": "Field_42c8b257", "rawValue": child.findtext("Field_42c8b257")})
                rows.append({"route": path.relative_to(raw).as_posix()[:-4], "rawSha256": decoded["sha256"],
                             "fileGuid": decoded["fileGuid"], "objectIndex": index, "objectGuid": obj["$guid"],
                             "objectAbsoluteByteOffset": ebx.data_start + ebx.data_offsets[index],
                             "fieldPath": field_path.lstrip("/"), "rawBlock": block,
                             "containingLayoutAmbiguous": bool(obj.get("$layoutAmbiguous")),
                             "registryAnchorName": name, "registryChildren": children})
        if not found:
            exceptions.append({"route": path.relative_to(raw).as_posix(), "reason": "No matching raw zeroing block"})
    report = {
        "date": "2026-09-23", "sourceBuild": "1.4.3.0 release capture", "archiveHead": 4892017,
        "descriptorSha256": sha(descriptor), "decoderSha256": sha(decoder), "scriptSha256": sha(Path(__file__)),
        "registry": {"path": str(grx_path.resolve()), "xmlSha256": sha(grx_path), "fileGuid": grx.get("Guid")},
        "rawBlueprintsChecked": len(paths), "weapons": rows, "exceptions": exceptions,
        "reproduce": "python scripts/frosty-zeroing-review.py --datamining \"../BF6 Datamining\" --out <new-report.json>",
        "conclusion": "Raw weapon zeroing blocks point directly to named GRX Zeroing records. Named scalar values and the separate raw integer list are captured without assigning native application.",
        "limits": [
            "Containing/nested layout warnings remain. GRX names and equal values do not alone prove a native consumer equation.",
            "The two false raw booleans cannot be assigned uniquely to RangeFinder versus CustomZeroing by value matching alone.",
            "Units, list indexing, initial selected distance, effective attachment state, delay timing and ballistic correction are unverified.",
            "Captured weapon source coverage is not all standard-MP activation or a complete dependency closure."
        ]
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"blueprints": len(paths), "zeroingBlocks": len(rows), "exceptions": exceptions,
                      "integerLists": sorted(set(tuple(row["rawBlock"]["Field_410f6aa8"]) for row in rows))}))


if __name__ == "__main__":
    main()
