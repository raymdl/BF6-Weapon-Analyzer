"""Name hashed Frosty fields from GameRemixer (GRX) registry value matches.

Each GS/WB/projectile block that links a GRX_Weapons node is compared with the
node's named leaves. A hash is named only when one field matches the leaf value
in every observation. Container fields take the last segment of their GRX anchor.
The result also lists named recoil targets changed by GRM/GCR modifier records.
Evidence is name identification only; it does not establish runtime formulas.
"""
import argparse, collections, glob, hashlib, json, os, re
import xml.etree.ElementTree as ET

REGISTRY = "Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons.xml"
EXTERNAL = re.compile(r"\[Ebx\] (\S+) \[([0-9a-fA-F-]{36})\]")
IDENTITY = {"Field_4692836a": 0.0, "Field_98a799ba": 1.0, "Field_bbbfe9cc": 0.0, "Field_5695ee1c": 1.0}


def literal(element):
    if element is None or len(element) or element.text is None:
        return None
    text = element.text.strip()
    return None if not text or text.startswith("[") or text == "nullptr" else text


def number(text):
    if text is None:
        return None
    if text in ("True", "False"):
        return float(text == "True")
    try:
        return float(int(text, 16)) if text.lower().startswith("0x") else float(text)
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=r"C:\Users\royal\Documents\BF6 Datamining\Frosty")
    parser.add_argument("--out", default="reference-data/provenance/frosty-grx-field-names-2026-09-13.json")
    args = parser.parse_args()
    registry_path = os.path.join(args.root, REGISTRY)
    with open(registry_path, "rb") as fh:
        registry_bytes = fh.read()
    by_guid = {e.get("Guid", "").lower(): e for e in ET.fromstring(registry_bytes)}

    blocks, observations = [], collections.defaultdict(list)
    containers = collections.defaultdict(collections.Counter)
    scanned = []
    for path in sorted(glob.glob(os.path.join(args.root, "Common", "**", "*.xml"), recursive=True)):
        if "GameRemixer" in path:
            continue
        with open(path, encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        if "GRX_Weapons [" not in text:
            continue
        root = ET.fromstring(text)
        scanned.append(os.path.relpath(path, args.root).replace("\\", "/"))
        parent = {child: node for node in root.iter() for child in node}
        for reference in root.iter("Field_6b28f68f"):
            match = EXTERNAL.fullmatch((reference.text or "").strip())
            if not match or not match[1].endswith("GRX_Weapons"):
                continue
            definition = by_guid.get(match[2].lower())
            wrapper = parent.get(reference)
            if definition is None or wrapper is None or wrapper.tag != "Struct_9bc51bd0":
                continue
            block = parent.get(parent.get(wrapper))
            if block is None:
                continue
            anchor = definition.findtext("Field_0c59fa06") or ""
            holder = parent.get(block)
            if "." in anchor and holder is not None and holder.tag.startswith("Field_"):
                containers[holder.tag][re.sub(r"\[\d+\].*$", "", anchor.split(".")[-1])] += 1
            scalars = {c.tag: number(literal(c)) for c in block if number(literal(c)) is not None}
            block_id = len(blocks)
            blocks.append(scalars)
            for member in definition.findall("Field_080f1aaa/member"):
                child = by_guid.get((member.text or "").split()[-1].lower()) if member.text else None
                if child is None:
                    continue
                name = child.findtext("Field_0c59fa06") or ""
                value = number(literal(child.find("Field_42c8b257")))
                leaf = name[len(anchor) + 1:] if name.startswith(anchor + ".") else ""
                if value is None or not leaf or "." in leaf or "[" in leaf:
                    continue
                observations[(block.tag, leaf)].append((block_id, value))

    names, weak, ambiguous = {}, {}, []
    for (block_type, leaf), rows in sorted(observations.items()):
        fields = None
        for block_id, value in rows:
            same = {k for k, v in blocks[block_id].items() if abs(v - value) <= max(1e-6, abs(value) * 1e-5)}
            fields = same if fields is None else fields & same
        distinct = len({round(v, 6) for _, v in rows})
        record = {"blockType": block_type, "observations": len(rows), "distinctValues": distinct}
        if fields and len(fields) == 1:
            target = names if distinct > 1 else weak
            target.setdefault(next(iter(fields)), {}).setdefault(leaf, []).append(record)
        else:
            ambiguous.append({"name": leaf, "candidateFields": sorted(fields or []), **record})
    conflicts = {h: sorted(v) for h, v in names.items() if len(v) > 1}
    if conflicts:
        raise ValueError(f"Conflicting hash names: {conflicts}")
    label = {h: next(iter(v)) for h, v in names.items()}
    container_names = {h: {"name": next(iter(c)), "observations": sum(c.values())}
                       for h, c in sorted(containers.items()) if len(c) == 1}
    label.update({h: v["name"] for h, v in container_names.items() if h not in label})

    targets = collections.defaultdict(list)
    for folder in ("Recoil", "SmoothRecoil", "CameraRecoil", "_Ergo"):
        for path in sorted(glob.glob(os.path.join(args.root, "Common", "Hardware", "Weapons", "_WeaponModifiers", folder, "**", "G[RC][MR]_*.xml"), recursive=True)):
            root = ET.parse(path).getroot()
            parent = {child: node for node in root.iter() for child in node}
            rel = os.path.relpath(path, args.root).replace("\\", "/")
            for op in root.iter("Struct_b1f8b400"):
                holder = parent[op]
                values = {c.tag: literal(c) for c in op}
                operands = {k: number(v) for k, v in values.items() if k in IDENTITY}
                enabled = values.get("Field_bbffe8bc") == "True"
                if not enabled and all(operands.get(k) == v for k, v in IDENTITY.items()):
                    continue
                aim = parent.get(parent.get(holder))
                targets[rel].append({"aimField": aim.tag if aim is not None and aim.tag.startswith("Field_") else None,
                    "aim": label.get(aim.tag) if aim is not None else None,
                    "targetField": holder.tag, "target": label.get(holder.tag),
                    "enabled": enabled, "rawOperands": {k: values.get(k) for k in IDENTITY}})

    result = {
        "method": "GRX_Weapons node leaves matched by value to scalar fields of the block that references the node; "
                  "names require one field matching every observation and more than one distinct value. "
                  "Container names use the last GRX anchor segment. Name evidence only, not runtime semantics.",
        "registry": REGISTRY,
        "registrySha256": hashlib.sha256(registry_bytes).hexdigest(),
        "scannedFileCount": len(scanned),
        "blockCount": len(blocks),
        "names": {h: {"name": label[h], "evidence": names[h][label[h]]} for h in sorted(names)},
        "containerNames": container_names,
        "singleValueNames": {h: v for h, v in sorted(weak.items())},
        "ambiguousLeaves": ambiguous,
        "modifierTargets": {
            "operandFields": "Struct_b1f8b400 records; Field_bbffe8bc is the observed enable flag. Operand meaning is not decoded here.",
            "files": dict(targets)},
    }
    with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(result, fh, indent=2)
        fh.write("\n")
    print(f"files={len(scanned)} blocks={len(blocks)} names={len(names)} containers={len(container_names)} "
          f"singleValue={len(weak)} ambiguous={len(ambiguous)} modifierFiles={len(targets)}")


if __name__ == "__main__":
    main()
