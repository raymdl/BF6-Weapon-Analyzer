"""Extract the bounded M4A1 deployed-state trace without inferring activation."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import xml.etree.ElementTree as ET


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--datamining", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error("Use a new evidence output path.")
    repo = Path(__file__).resolve().parent.parent
    build = args.datamining / "builds/1.4.3.0"
    reader = runpy.run_path(str(repo / "scripts/frosty-ebx-decode.py"))
    descriptor = build / "capture/toolchain/SharedTypeDescriptors.ebx"
    types = reader["type_descriptors"](descriptor)
    prefix = "Common/Hardware/Weapons/_WeaponModifiers/"
    routes = [prefix + suffix for suffix in (
        "DispersionIncrease/GBM_NoIncrease_ERG_P00",
        "Recoil/GRM_MountedVertical", "Recoil/GRM_MountedHorizontal",
        "Bipod/GRM_BipodDeployed_BTM_P50",
        "ADSReload/WM_MountedHorizontal_ADSReload",
        "ADSReload/WM_MountedVertical_ADSReload", "ADSReload/WME_ADSReload_P10")]
    routes += ["Common/Hardware/Weapons/Carbine/M4A1/" + n for n in ("GS_M4A1", "M4A1_WB")]
    assets = []
    wanted = ("GBM_NoIncrease_ERG", "GRM_Mounted", "GRM_BipodDeployed", "WM_Mounted")
    for route in routes:
        raw = build / "capture/collection/raw" / (route + ".ebx")
        xml = build / "xml/xml-overlay" / (route + ".xml")
        ebx = reader["Ebx"](raw, types)
        decoded = ebx.decode()
        tree = ET.parse(xml).getroot()
        assert decoded["fileGuid"] == tree.get("Guid"), route
        selected, bindings = [], []
        if route.endswith("M4A1_WB"):
            indices = {0x1c, 0x1d, 0x1e, 0x20, 0x23, 0x38}
            # Keep the exact WB package entries and their containing object identity.
            for index, obj in enumerate(decoded["objects"]):
                values = obj.get("Field_0cd9f20f")
                if isinstance(values, list) and len(values) > 110:
                    bindings.append({"objectIndex": index, "objectClass": obj["$class"],
                                     "fieldPath": "Field_0cd9f20f", "members": {109: values[109], 110: values[110]}})
        elif route.endswith("GS_M4A1"):
            indices = set()
            for obj in tree:
                for field in obj:
                    for member in field.findall("member"):
                        if any(any(word in (leaf.text or "") for word in wanted) for leaf in member.iter()):
                            bindings.append({"objectGuid": obj.get("Guid"), "objectClass": obj.tag,
                                             "fieldPath": field.tag + "/member[" + member.get("Index") + "]",
                                             "xml": ET.tostring(member, encoding="unicode")})
        else:
            indices = set(range(len(decoded["objects"])))
        for index in sorted(indices):
            selected.append({"objectIndex": index, "absoluteByteOffset": ebx.data_start + ebx.data_offsets[index],
                             "data": decoded["objects"][index]})
        assets.append({"path": route, "fileGuid": decoded["fileGuid"], "rawFile": str(raw.resolve()),
                       "rawSha256": decoded["sha256"], "xmlFile": str(xml.resolve()), "xmlSha256": digest(xml),
                       "unresolvedTypes": decoded["unresolvedTypes"], "selectedObjects": selected, "bindings": bindings})
    result = {
        "date": "2026-09-23", "build": "1.4.3.0 release capture", "archiveHead": 4892017,
        "descriptorSha256": digest(descriptor), "decoderSha256": digest(repo / "scripts/frosty-ebx-decode.py"),
        "scriptSha256": digest(Path(__file__)), "assets": assets,
        "reproduce": "python scripts/frosty-deployed-review.py --datamining \"../BF6 Datamining\" --out <new-report.json>",
        "review": {
            "status": "source references and operands; native state composition unresolved",
            "supersedes": ["reference-data/provenance/frosty-weapon-states-2026-09-23.json",
                           "reference-data/provenance/frosty-weapon-states-detail-2026-09-23.json"],
            "corrections": [
                "WB mounted ADS reload packages are in Field_0cd9f20f, not Field_954bae40.",
                "ADSReload Field_3f680d24 values11,12,13 are preserved as raw values, not identified operation codes; the maintained general field map calls this Priority.",
                "IncreasePerShot is Field_0084b1d1; Field_5695ee1c is its multiplier operand, not the target name.",
                "15cff9ff is on Class_9dfbb158 with mask1, within a group that also holds bipod/mounted conditions. The older deployed-only activation interpretation is not proved.",
                "The initial idle-index interpretation is withdrawn; the detail report correctly records Field_42c8b257=1 for both GRX children. No target table identified."],
            "configuration": [
                "GBM_NoIncrease_ERG_P00 holds IncreasePerShot multiplier0 for both aim and movement states.",
                "GRM_BipodDeployed_BTM_P50 holds amount exponent tier+10 and direction-variation exponent tier-4 for both aim states; configured eligibility and native stacking still require validation.",
                "The inspected mounted recoil assets have identity scalar operands and zero tier deltas; different top-level condition flags do not prove a numerical recoil reduction.",
                "Mounted ADSReload packages have state selector GUIDs and boolean fields, not a source duration or speed multiplier."],
            "limits": ["Non-exported objects have null raw GUIDs; use object index and byte offset, not synthetic XML GUIDs as global identity.",
                       "Keep all decoder layout warnings. Standard MP weapon-source relevance does not establish every mode/state is enabled.",
                       "This is one complete representative source chain, not a per-weapon eligibility audit or engine execution trace."]
        }
    }
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"assets": len(assets), "unresolvedTypeCount": sum(len(a["unresolvedTypes"]) for a in assets)}))


if __name__ == "__main__":
    main()
