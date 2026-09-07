"""Follow recoil/spread modifier references without assigning engine semantics."""
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

EXTERNAL = re.compile(r"\[Ebx\]\s+([^\[]+?)\s+\[([0-9a-fA-F-]{36})\]")
LOCAL = re.compile(r"\[([^\]]+)\]\s+([0-9a-fA-F-]{36})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--graph", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--all-effects", action="store_true",
        help="Include all graph-bound GS modifiers and WB effects, including unnamed effects")
    args = parser.parse_args()
    graph_bytes = args.graph.read_bytes()
    graph = json.loads(graph_bytes)
    seeds = {}
    for attachment in graph:
        for branch in attachment["branches"]:
            for action in branch["actions"]:
                for selector in action.get("selectors", []):
                    for binding in selector.get("gsBindings", []):
                        modifier = binding.get("modifier")
                        if not modifier or (not args.all_effects and "/ADSTime/" in modifier["asset"]):
                            continue
                        key = (modifier["asset"].lower(), modifier["guid"].lower())
                        seed = seeds.setdefault(key, {"asset": modifier["asset"],
                            "guid": modifier["guid"], "kind": "gs", "selectors": []})
                        seed["selectors"].append({"weapon": attachment["weapon"],
                            "attachmentXml": attachment["attachmentXml"],
                            "unlock": selector.get("unlock"), "binding": binding,
                            "activation": branch.get("activation")})
                    for wb_modifier in selector.get("wbModifiers", []):
                        for effect in wb_modifier.get("effects", []):
                            if not args.all_effects and not re.search("recoil|dispersion|spread", effect["sourceXml"], re.I):
                                continue
                            asset = effect["sourceXml"].removesuffix(".xml")
                            key = (asset.lower(), effect["guid"].lower())
                            seed = seeds.setdefault(key, {"asset": asset, "guid": effect["guid"],
                                "kind": "wb-effect" if args.all_effects else "named-wb-effect", "selectors": []})
                            seed["selectors"].append({"weapon": attachment["weapon"],
                                "attachmentXml": attachment["attachmentXml"],
                                "unlock": selector.get("unlock"), "wbModifier": wb_modifier,
                                "effect": effect, "activation": branch.get("activation")})

    queue = deque((s["asset"], s["guid"], None) for s in seeds.values())
    visited, files, objects, issues = set(), {}, [], []
    while queue:
        asset, guid, expected_type = queue.popleft()
        key = (asset.lower(), guid.lower())
        if key in visited:
            continue
        visited.add(key)
        if len(files) > 500:
            raise ValueError("Traversal exceeded 500 assets; inspect scope before expanding")
        if asset.lower() not in files:
            path = args.root / (asset + ".xml")
            if not path.is_file():
                issues.append({"asset": asset, "guid": guid, "reason": "missing XML"})
                continue
            data = path.read_bytes()
            root = ET.fromstring(data)
            files[asset.lower()] = {"asset": asset, "sha256": hashlib.sha256(data).hexdigest(),
                "root": root}
        root = files[asset.lower()]["root"]
        matches = [e for e in root if e.get("Guid", "").lower() == guid.lower()]
        if len(matches) != 1:
            issues.append({"asset": asset, "guid": guid, "reason": "target count",
                "count": len(matches)})
            continue
        target = matches[0]
        if expected_type and target.tag != expected_type:
            issues.append({"asset": asset, "guid": guid, "reason": "type mismatch",
                "expected": expected_type, "actual": target.tag})
        record = {"asset": asset, "guid": guid, "type": target.tag,
            "scalars": [], "references": []}

        def walk(element, path):
            for child in element:
                suffix = "[@Index='" + child.get("Index") + "']" if "Index" in child.attrib else ""
                child_path = path + "/" + child.tag + suffix
                if len(child):
                    walk(child, child_path)
                    continue
                value = (child.text or "").strip()
                if not value or value == "nullptr":
                    continue
                external, local = EXTERNAL.fullmatch(value), LOCAL.fullmatch(value)
                if external:
                    ref_asset, ref_guid = external.groups()
                    record["references"].append({"path": child_path,
                        "asset": ref_asset, "guid": ref_guid, "kind": "external"})
                    queue.append((ref_asset, ref_guid, None))
                elif local:
                    ref_type, ref_guid = local.groups()
                    record["references"].append({"path": child_path,
                        "asset": asset, "guid": ref_guid, "kind": "local", "type": ref_type})
                    queue.append((asset, ref_guid, ref_type))
                else:
                    record["scalars"].append({"path": child_path, "raw": value})

        walk(target, "/" + target.tag + "[@Guid='" + guid + "']")
        objects.append(record)
    summary = {"sourceGraphSha256": hashlib.sha256(graph_bytes).hexdigest(),
        "seedModifierObjects": len(seeds), "sourceAssets": len(files),
        "seedKinds": dict(Counter(s["kind"] for s in seeds.values())),
        "resolvedObjects": len(objects), "references": sum(len(o["references"]) for o in objects),
        "objectTypes": dict(Counter(o["type"] for o in objects)), "issues": issues,
        "scope": ("All graph-bound GS modifiers and WB effects, and transitive serialized references; source-graph gaps remain outside this closure"
            if args.all_effects else "GS-bound recoil/spread modifiers, explicitly recoil/dispersion/spread-named WB effects, and transitive serialized references; excludes ADS-time seeds and does not classify all unnamed WB effects"),
        "interpretation": "Raw reference closure only; does not decode native consumers, arithmetic, activation, or runtime formulas"}
    result = {"summary": summary, "seeds": list(seeds.values()),
        "sources": [{k: v for k, v in f.items() if k != "root"} for f in files.values()],
        "objects": objects}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
