"""Read-only source inventory and bounded weapon timing extraction for research.

No game access, exports, or production writes. The output is a new evidence report.
Catalog coverage is a name-based discovery pass, not a claim of dependency closure.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def walk(value, path=""):
    if isinstance(value, dict):
        yield path, value
        for key, child in value.items():
            yield from walk(child, path + "/" + key)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, path + "/" + str(index))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--datamining", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error("Use a new output path; dated evidence must not be overwritten.")
    repo = Path(__file__).resolve().parent.parent
    build = args.datamining / "builds/1.4.3.0"
    catalog_path = build / "capture/collection/asset-catalog.json"
    catalog = json.loads(catalog_path.read_text())
    desc = build / "capture/toolchain/SharedTypeDescriptors.ebx"
    spec = importlib.util.spec_from_file_location("decoder", repo / "scripts/frosty-ebx-decode.py")
    decoder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(decoder)
    types = decoder.type_descriptors(desc)
    raw = {}
    for folder in ("collection", "collection-dependencies", "collection-review-2026-09-16"):
        root = build / "capture" / folder / "raw"
        for path in root.rglob("*.ebx"):
            route = path.relative_to(root).as_posix()[:-4]
            raw.setdefault(route.lower(), path)
    xml = build / "xml/xml-overlay"
    prefixes = ("gs_", "wpm_", "grm_", "gbm_", "gdm_", "gim_", "gid_", "attachment_", "pd_", "u_att_", "wme_", "wm_", "cmu_")
    candidates, missing, excluded = [], [], []
    for asset in catalog["assets"]:
        route = asset["path"]
        lower = route.lower()
        name = lower.rsplit("/", 1)[-1]
        if not lower.startswith("common/hardware/weapons/"):
            continue
        if not (name.endswith("_wb") or name.startswith(prefixes)):
            continue
        if any(token in lower for token in ("/art/", "/_charms/")):
            excluded.append(route)
            continue
        candidates.append(route)
        if lower not in raw and not (xml / (route + ".xml")).exists():
            missing.append(route)
    findings_path = repo / "reference-data/frosty/asset-findings.json"
    findings = json.loads(findings_path.read_text())
    statuses = collections.Counter(f["result"] for a in findings["assets"].values() for f in a["findings"])
    timing = []
    fields = {"Field_9c1e1476": "ReloadThreshold", "Field_c0c7c72f": "ReloadDelay",
              "Field_b480c17a": "PostReloadDelay", "Field_85ff24a0": "ReloadTime",
              "Field_fc66e75e": "ReloadTimeBulletsLeft", "Field_440ed7fa": "UnnamedFrameDuration"}
    errors = []
    for route, path in sorted(raw.items()):
        if not route.startswith("common/hardware/weapons/") or not route.endswith("_wb"):
            continue
        try:
            result = decoder.Ebx(path, types).decode()
            records = []
            for obj in result["objects"]:
                for pointer, block in walk(obj):
                    values = {k: block[k] for k in fields if k in block}
                    if values:
                        records.append({"objectGuid": obj.get("$guid"), "objectClass": obj.get("$class"),
                                        "layoutAmbiguous": bool(obj.get("$layoutAmbiguous")),
                                        "fieldPath": pointer, "values": values})
            timing.append({"path": route, "rawFile": str(path.resolve()), "sha256": result["sha256"],
                           "fileGuid": result["fileGuid"], "unresolvedTypes": result["unresolvedTypes"], "records": records})
        except Exception as exc:
            errors.append({"path": route, "error": str(exc)})
    result = {
        "schemaVersion": 1, "date": "2026-09-23", "evidenceStatus": "source-configuration-only",
        "method": "Catalog mechanic-name candidates minus art/charms; captured raw or XML presence. Decode captured weapon WB raw bodies with release descriptors. Field names reuse GRX value-matching evidence; no runtime timing arithmetic inferred.",
        "reproduce": "python scripts/frosty-research-inventory.py --datamining \"../BF6 Datamining\" --out <new-report.json>",
        "source": {"buildRecord": json.loads((build / "BUILD.json").read_text()),
                   "catalogFile": str(catalog_path.resolve()), "catalogSha256": sha(catalog_path),
                   "archiveHead": catalog["gameHead"], "sdkVersion": catalog["sdkVersion"],
                   "descriptorSha256": sha(desc), "decoderSha256": sha(repo / "scripts/frosty-ebx-decode.py"),
                   "scriptSha256": sha(Path(__file__)), "findingsSha256": sha(findings_path)},
        "inventory": {"catalogCount": len(catalog["assets"]), "capturedRawRouteCount": len(raw),
                      "findingStatusesAtStart": dict(statuses), "mechanicCandidateCount": len(candidates),
                      "missingMechanicCandidates": missing, "excludedArtOrCharmCount": len(excluded),
                      "limits": "Naming pass only. Presence is not decoding validity or MP activation. Shared assets were not excluded for mode association. Other names, animations, gadgets, maps, recursive closure and native consumers are outside this pass."},
        "timingFields": fields, "timing": timing, "errors": errors,
        "conclusion": "Timing operands do not establish reload commit/reset semantics or composition. Controlled reload measurements or the native consumer are still required. Unnamed frame duration must not replace RateOfFire.",
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"inventory": result["inventory"], "weaponTimingAssets": len(timing), "errors": errors}))


if __name__ == "__main__":
    main()
