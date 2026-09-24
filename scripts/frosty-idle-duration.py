"""Trace captured GS idle-duration indices to their table and named GRX anchor."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import xml.etree.ElementTree as ET


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
    decoder_path = repo / "scripts/frosty-ebx-decode.py"
    reader = runpy.run_path(str(decoder_path))
    desc = build / "capture/toolchain/SharedTypeDescriptors.ebx"
    types = reader["type_descriptors"](desc)
    grx_path = build / "xml/xml-overlay/Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons.xml"
    grx = ET.parse(grx_path).getroot()
    by_guid = {obj.get("Guid"): obj for obj in grx}
    table_path = raw / "Common/Hardware/Common/Arrays/ZoomTransitions/IDA_Weapons.ebx"
    table = reader["Ebx"](table_path, types).decode()
    table_obj = table["objects"][0]
    expected = {"fileGuid": table["fileGuid"], "classGuid": table_obj["$guid"]}
    entries = table_obj["Field_1d1fad13"]
    rows, errors = [], []
    for path in sorted((raw / "Common/Hardware/Weapons").rglob("GS_*.ebx")):
        ebx = reader["Ebx"](path, types)
        decoded = ebx.decode()
        for index, obj in enumerate(decoded["objects"]):
            if "Field_5b6caeda" not in obj:
                continue
            block = obj["Field_5b6caeda"]
            pointer = block["Field_62694562"]["Field_6b28f68f"]
            anchor_ref = pointer.get("$import") if isinstance(pointer, dict) else None
            if anchor_ref is not None:
                assert anchor_ref["fileGuid"] == grx.get("Guid")
            anchor = by_guid.get(anchor_ref["classGuid"]) if anchor_ref else None
            children = []
            if anchor is not None:
                for member in anchor.findall("Field_080f1aaa/member"):
                    child_guid = member.text.split()[-1].strip("[]")
                    child = by_guid[child_guid]
                    children.append({"objectGuid": child_guid, "name": child.findtext("Field_0c59fa06"),
                                     "valueField": "Field_42c8b257", "rawValue": child.findtext("Field_42c8b257")})
            indices = [block["Field_6138f58f"], block["Field_54a69c98"]]
            pointers = [block["Field_fdc3ebd3"]["$import"], block["Field_d9d776d4"]["$import"]]
            if pointers != [expected, expected]:
                errors.append({"asset": str(path), "reason": "Different table pointer", "pointers": pointers})
            if anchor is None or not anchor.findtext("Field_0c59fa06", "").endswith(".IdleDecreaseTargetDuration"):
                errors.append({"asset": str(path), "reason": "Missing/different named GRX anchor", "anchor": anchor_ref})
            rows.append({"path": path.relative_to(raw).as_posix()[:-4], "rawSha256": decoded["sha256"],
                         "fileGuid": decoded["fileGuid"], "objectIndex": index, "objectGuid": obj["$guid"],
                         "absoluteByteOffset": ebx.data_start + ebx.data_offsets[index],
                         "layoutAmbiguous": bool(obj.get("$layoutAmbiguous")),
                         "fieldPath": "Field_5b6caeda", "rawBlock": block,
                         "registryAnchorName": anchor.findtext("Field_0c59fa06") if anchor is not None else None,
                         "registryChildren": children, "indices": indices,
                         "candidateValuesIfZeroBased": [entries[n] if 0 <= n < len(entries) else None for n in indices]})
    result = {
        "date": "2026-09-23", "sourceBuild": "1.4.3.0 release capture", "archiveHead": 4892017,
        "descriptorSha256": sha(desc), "decoderSha256": sha(decoder_path), "scriptSha256": sha(Path(__file__)),
        "registry": {"path": str(grx_path.resolve()), "xmlSha256": sha(grx_path), "fileGuid": grx.get("Guid")},
        "table": table, "weapons": rows, "exceptions": errors,
        "reproduce": "python scripts/frosty-idle-duration.py --datamining \"../BF6 Datamining\" --out <new-report.json>",
        "conclusion": "GS Field_5b6caeda contains paired indices and references to IDA_Weapons, plus a reference to the named GRX idle-duration registry block. This resolves the source table association, not engine lookup arithmetic or recovery activation.",
        "supersedes": ["The earlier 23 September worker reports and weapon-state review said no idle-table link was found; this direct GS-to-GRX/table trace supersedes that negative result."],
        "limits": ["Raw table and GS containing layouts retain conservative duplicate-name warnings.",
                   "All inspected index pairs are equal, so value matching cannot assign the two hashed fields uniquely to moving versus stationary.",
                   "Candidate values use direct zero-based lookup only; native indexing, units, duration application, overrides and recovery-state switching remain unverified.",
                   "Registry names come from non-stale XML and do not establish runtime equations. Exceptions are retained, not filled from neighboring weapons."]
    }
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"weapons": len(rows), "exceptions": errors,
                      "indexValues": sorted(set(n for row in rows for n in row["indices"]))}))


if __name__ == "__main__":
    main()
