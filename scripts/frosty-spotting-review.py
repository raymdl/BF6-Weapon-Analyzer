"""Record bounded spotting source operands and current expression references."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def imports(value, path=""):
    if isinstance(value, dict):
        if "$import" in value:
            yield {"fieldPath": path, **value["$import"]}
        for key, child in value.items():
            yield from imports(child, path + "/" + key)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from imports(child, path + "/" + str(index))


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
    decoder = repo / "scripts/frosty-ebx-decode.py"
    reader = runpy.run_path(str(decoder))
    descriptors = {
        4892017: build / "capture/toolchain/SharedTypeDescriptors.ebx",
        4892087: build / "capture/toolchain/SharedTypeDescriptors-hotfix-2026-09-16.ebx",
    }
    types = {head: reader["type_descriptors"](path) for head, path in descriptors.items()}
    assets = []

    def read(path, head=4892017, indices=None):
        ebx = reader["Ebx"](path, types[head])
        decoded = ebx.decode()
        row = {"rawPath": str(path.resolve()), "rawSha256": decoded["sha256"],
               "fileGuid": decoded["fileGuid"], "archiveHead": head,
               "descriptorSha256": sha(descriptors[head]),
               "unresolvedTypes": decoded["unresolvedTypes"],
               "objects": [{"index": i, "absoluteByteOffset": ebx.data_start + ebx.data_offsets[i],
                            "decoded": obj} for i, obj in enumerate(decoded["objects"])
                           if indices is None or i in indices]}
        assets.append(row)
        return decoded, row

    modifiers = raw / "Common/Hardware/Weapons/_WeaponModifiers"
    effects = {}
    for name in ["2D3D_P25", "2D3D_P25_SP", "2D3D_VSSM_P35", "2D_P10", "3D_P05", "3D_P10"]:
        decoded, row = read(modifiers / ("Spotting/WME_SpotRange_" + name + ".ebx"))
        effects[name] = decoded["fileGuid"]
    subsonic = []
    for path in sorted((modifiers / "_Ammo/Subsonic").glob("WPM_*.ebx")):
        decoded, row = read(path)
        links = list(imports(decoded["objects"]))
        spot = [v for v in links if v["fileGuid"] in effects.values()]
        assert {v["fileGuid"] for v in spot} == {effects["2D_P10"], effects["3D_P05"]}
        subsonic.append({"route": path.relative_to(raw).as_posix()[:-4], "fileGuid": row["fileGuid"],
                         "spottingImports": spot})
    shared = {}
    for suffix in ["01", "02"]:
        path = modifiers / ("_Muzzle/Suppressor/SP_WPM_MZL_ImprvdSuppressor" + suffix + "_W30.ebx")
        decoded, row = read(path)
        shared[decoded["fileGuid"]] = path.relative_to(raw).as_posix()[:-4]
        assert any(v["fileGuid"] == effects["2D3D_P25_SP"] for v in imports(decoded["objects"]))
    callers = []
    for name in ["M2010ESR", "M39EMR", "HK417A2"]:
        path = next((raw / "Common/Hardware/Weapons").rglob(name + "_WB.ebx"))
        decoded, row = read(path, indices=[])
        links = [v for v in imports(decoded["objects"]) if v["fileGuid"] in shared]
        assert links
        callers.append({"route": path.relative_to(raw).as_posix()[:-4], "fileGuid": row["fileGuid"],
                        "sharedPackageImports": links})
    for path in sorted((build / "capture/spotting-2026-09-23").glob("*.ebx")):
        read(path, 4892087)
    read(raw / "Common/Gameplay/Soldier/GRX_Glacier_Soldier.ebx", indices=[24])
    read(raw / "Common/GameSetup/Tweakables/Mutators/MUT_UI.ebx", indices=[11])
    report = {
        "date": "2026-09-23", "decoderSha256": sha(decoder), "scriptSha256": sha(Path(__file__)),
        "assets": assets, "subsonicPackages": subsonic, "sharedBlueprintCallers": callers,
        "reproduce": "python scripts/frosty-spotting-review.py --datamining \"../BF6 Datamining\" --out <new-report.json>",
        "conclusions": [
            "All 13 captured subsonic packages import separate minimap and world range effects: 0.428571/1 and 1/0.5. Decoder float output is rounded to six decimals.",
            "The current SimEx links to the exact named SpotOnFireDuration (0.4) and SpottingAllowed (true) source objects.",
            "The current SimEx resource ID is 2715dacdf212b88f, also present in the older compiled trace. An equal resource ID does not prove equal compiled bytes.",
            "Three shared weapon blueprints import SP-prefixed suppressor packages. Their names alone do not establish SP-only activation."
        ],
        "limits": [
            "Release operands and fresh hotfix expression assets have separate per-asset build identities; reference continuity does not prove every target is unchanged in the installed hotfix.",
            "Source defaults and links do not prove mode activation, native duration units, range bases, modifier composition, priorities or effective runtime results.",
            "54 m world and 150 m minimap bases remain screenshot-derived model inputs; multiplying 0.14 by 0.1 is not engine-confirmed.",
            "PF graph hashes and unnamed float values are preserved without assigning mechanics. Existing compiled-byte guessing is not repeated.",
            "The two subsonic effects do not alone establish the native composition rule. Existing site world factor 0.5 is unchanged."
        ]
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"assets": len(assets), "subsonicPackages": len(subsonic), "sharedCallers": len(callers)}))


if __name__ == "__main__":
    main()
