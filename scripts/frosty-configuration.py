"""Compare local Frosty configuration with the analyzer; never write runtime data.

Registry names identify configuration, not effective factory builds or formulas.
Raw field candidates require agreement in every directly linked block. Ambiguous
and constant-value matches remain research evidence, not a decoded SDK schema.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

REGISTRY = "Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons.xml"
EXTERNAL = re.compile(r"\[Ebx\]\s+([^\[]+?)\s+\[([0-9a-fA-F-]{36})\]")
EXCLUDED_ATTACHMENT = re.compile(r"_SCP_|_SCA_|_SPO_|IronSights|Magnifier", re.I)


def literal(element):
    if element is None:
        return None
    if len(element) or "Count" in element.attrib:
        return None  # Arrays and structs must not be treated as scalar defaults.
    return (element.text or "").strip()


def number(raw):
    if raw is None or raw.startswith("0x") or raw in ("True", "False", ""):
        return None  # Do not guess signedness, units, or enum meanings.
    try:
        return float(raw)
    except ValueError:
        return None


def typed_scalar(raw, clr_type):
    """Decode only a scalar whose CLR primitive type is evidenced by the SDK."""
    if raw is None:
        return None
    if clr_type == "System.Int32":
        value = int(raw, 16) if raw.startswith("0x") else int(raw)
        if raw.startswith("0x"):
            if not 0 <= value <= 0xffffffff:
                raise ValueError(f"Int32 bit pattern out of range: {raw}")
            if value >= 0x80000000:
                value -= 0x100000000
        if not -0x80000000 <= value <= 0x7fffffff:
            raise ValueError(f"Int32 value out of range: {raw}")
        return value
    if clr_type == "System.Single":
        # The exporter uses Single.ToString() without an explicit round-trip
        # format. Preserve its decimal value; do not invent lost binary precision.
        value = float(raw)
        if not math.isfinite(value):
            raise ValueError(f"Non-finite scalar: {raw}")
        return value
    if clr_type == "System.Boolean":
        if raw not in ("True", "False"):
            raise ValueError(f"Invalid Boolean: {raw}")
        return raw == "True"
    return None


def paths(root):
    result = {}

    def visit(element, prefix):
        part = element.tag
        for key in ("Guid", "Index"):
            if key in element.attrib:
                part += f"[@{key}='{element.attrib[key]}']"
        result[element] = prefix + "/" + part
        for child in element:
            visit(child, result[element])

    visit(root, "")
    return result


def compare_fields():
    fields = {
        "rpm": ("WB", "WeaponEntityData.WeaponFiring.PrimaryFire.FireLogic.RateOfFire"),
        "bulletVel": ("WB", "WeaponEntityData.WeaponFiring.PrimaryFire.Shot.InitialSpeed.z"),
        "recoilDir": ("GS", "Recoil.Zoomed.RecoilDirection"),
        "recoilVar": ("GS", "Recoil.Zoomed.RecoilDirectionVariation"),
        "recoilIncAds": ("GS", "DispersionBehavior.Zoomed.Stationary.IncreasePerShot"),
    }
    recoil = {"dir": "RecoilDirection", "amount": "RecoilAmount",
              "amountMult": "RecoilAmountMultiplier", "amountExp": "RecoilAmountMultiplierExponent",
              "dirVar": "RecoilDirectionVariation", "dirVarMult": "RecoilDirectionVariationMultiplier",
              "dirVarExp": "RecoilDirectionVariationMultiplierExponent", "decNorm": "RecoilDecreaseNorm",
              "decExp": "RecoilDecreaseExponent", "decTimeExp": "RecoilDecreaseTimeExponent",
              "decOffset": "RecoilDecreaseOffset", "duration": "RecoilDuration",
              "decFactor": "RecoilDecreaseFactor", "shootingDecScale": "ShootingRecoilDecreaseScale"}
    spread = {"inc": "IncreasePerShot", "idleTime": "IdleTime",
              "idleCoef": "IdleDecreaseCoefficient", "idleExp": "IdleDecreaseExponent",
              "idleOffset": "IdleDecreaseOffset", "firingCoef": "FiringDecreaseCoefficient",
              "firingExp": "FiringDecreaseExponent", "firingOffset": "FiringDecreaseOffset",
              "notFiringCoef": "NotFiringDecreaseCoefficient", "notFiringExp": "NotFiringDecreaseExponent",
              "notFiringOffset": "NotFiringDecreaseOffset", "firstShotMul": "FirstShotIncreaseMultiplier",
              "distExp": "DistributionExponent"}
    for site, source in (("ads", "Zoomed"), ("hip", "Unzoomed")):
        for key, name in recoil.items():
            fields[f"recoil.{site}.{key}"] = ("GS", f"Recoil.{source}.{name}")
        for key, name in spread.items():
            fields[f"spreadDyn.{site}.{key}"] = ("GS", f"DispersionBehavior.{source}.Stationary.{name}")
    return fields


def attachment_graph(base, weapons, read_xml, include_optics=False):
    """Trace explicit references and selector GUID joins, without numeric inference."""
    rows, issues = [], []

    def external(raw):
        match = EXTERNAL.fullmatch((raw or "").strip())
        return {"asset": match[1], "guid": match[2].lower()} if match else None

    def resolve(raw, source):
        ref = external(raw)
        if ref:
            relative, guid = ref["asset"] + ".xml", ref["guid"]
        else:
            match = re.fullmatch(r"\[(Class_[0-9a-f]+)\]\s+([0-9a-f-]{36})", (raw or "").strip())
            if not match:
                raise ValueError(f"Unsupported object reference: {source}: {raw}")
            relative, guid = source, match[2]
        root = read_xml(relative)
        matches = [e for e in root if e.get("Guid", "").lower() == guid]
        if len(matches) != 1:
            raise ValueError(f"Unresolved object GUID: {relative}: {guid}")
        return relative, matches[0]

    for weapon in weapons:
        wid, wb_source, gs_source = weapon["internalId"], weapon["wbXml"], weapon["gsXml"]
        folder = Path(gs_source).parent
        ability_source = (folder / f"{wid}_Ability.xml").as_posix()
        if not (base / ability_source).exists():
            issues.append({"weapon": wid, "reason": "missing ability asset", "sourceXml": ability_source})
            continue
        ability = read_xml(ability_source)
        by_progression = defaultdict(list)
        # Only members selected by the ability's root list count as attachment
        # branches. Do not treat every embedded object as an active option.
        for member in ability[0].findall("Field_d7605aab/member"):
            _, branch = resolve(member.text, ability_source)
            progression = external(branch.findtext("Field_f86e0433"))
            if progression:
                by_progression[(progression["asset"].lower(), progression["guid"])].append(branch)

        wb = read_xml(wb_source)
        modifier_by_selector = defaultdict(list)
        for raw in wb.iter("Field_0cd9f20f"):
            for member in raw:
                ref = external(member.text)
                if not include_optics and ref and any(s in ref["asset"].lower() for s in ("/ironsights", "_ironsights_", "/optics/", "/zoom/")):
                    continue
                try:
                    relative, modifier = resolve(member.text, wb_source)
                except FileNotFoundError:
                    issues.append({"weapon": wid, "sourceXml": wb_source,
                                   "reason": "missing WB modifier asset", "reference": ref})
                    continue
                for selector in modifier.findall("Field_819acc98/member"):
                    modifier_by_selector[(selector.text or "").lower()].append((relative, modifier))
        gs = read_xml(gs_source)
        gs_paths = paths(gs)
        binding_by_selector = defaultdict(list)
        for binding in gs.iter():
            if tuple(c.tag for c in binding) != ("Field_2f0e5b83", "Field_6d011165", "Field_3f680d24"):
                continue
            selector = binding.findtext("Field_6d011165") or ""
            modifier_ref = external(binding.findtext("Field_2f0e5b83"))
            binding_by_selector[selector.lower()].append({"sourceXml": gs_source,
                "path": gs_paths[binding], "type": binding.tag, "modifier": modifier_ref,
                "modifierRaw": binding.findtext("Field_2f0e5b83"),
                "rawBranch": binding.findtext("Field_3f680d24")})

        for attachment in sorted((base / folder).glob("Attachment_*.xml")):
            if not include_optics and EXCLUDED_ATTACHMENT.search(attachment.name):
                continue
            relative = attachment.relative_to(base).as_posix()
            asset = read_xml(relative)[0]
            category = external(asset.findtext("Field_fe77e9a9"))
            if not include_optics and category and any(s in category["asset"].lower() for s in ("sight", "scope", "optic")):
                continue
            progression = external(asset.findtext("Field_157a7d74"))
            record = {"weapon": wid, "attachmentXml": relative, "attachmentGuid": asset.get("Guid"),
                "category": category, "progression": progression,
                "rawPointCost": asset.findtext("Field_6ee865a5"), "branches": []}
            branches = by_progression.get((progression["asset"].lower(), progression["guid"]), []) if progression else []
            for branch in branches:
                branch_record = {"abilityXml": ability_source, "guid": branch.get("Guid"),
                    "slot": external(branch.findtext("Field_64ef48eb")), "actions": [],
                    "activation": "unresolved; branch presence is not proof of runtime availability"}
                switch = branch.find("Field_def7f8dd/Struct_181e89a5")
                if switch is not None:
                    switch_ref = switch.findtext("Field_e0b43a29/Struct_9bc51bd0/Field_6b28f68f")
                    branch_record["killswitch"] = {"localFallbackRaw": switch.findtext("Field_043d7a08")}
                    if switch_ref and switch_ref != "nullptr":
                        switch_source, switch_object = resolve(switch_ref, ability_source)
                        branch_record["killswitch"]["registry"] = {
                            "sourceXml": switch_source, "guid": switch_object.get("Guid"),
                            "name": switch_object.findtext("Field_0c59fa06"),
                            "defaultRaw": switch_object.findtext("Field_42c8b257"),
                            "scope": "exported default only; live overrides and activation logic are not evaluated"}
                for member in branch.findall("Field_ffba60f0/member"):
                    action_source, action = resolve(member.text, ability_source)
                    action_record = {"sourceXml": action_source, "guid": action.get("Guid"),
                                     "type": action.tag, "selectors": []}
                    if action.tag != "Class_4ed159fb":
                        issues.append({"weapon": wid, "attachmentXml": relative,
                                       "reason": "unresolved action type", "type": action.tag})
                    for unlock in action.findall("Field_7e54e22c/member"):
                        selected = external(unlock.text)
                        if not selected or ("/_weaponmodifiers/" not in selected["asset"].lower()
                                and not (include_optics and (selected["guid"] in modifier_by_selector
                                    or selected["guid"] in binding_by_selector))):
                            continue  # Art/cosmetic unlocks are outside this graph.
                        resolve(unlock.text, action_source)  # Validate the selector asset GUID.
                        selector_record = {"unlock": selected, "wbModifiers": [],
                            "gsBindings": binding_by_selector.get(selected["guid"], [])}
                        for binding in selector_record["gsBindings"]:
                            resolve(binding["modifierRaw"], gs_source)
                        for modifier_source, modifier in modifier_by_selector.get(selected["guid"], []):
                            effects = []
                            for effect in modifier.findall("Field_9690d604/member"):
                                reference = external(effect.text)
                                if reference and "/muzzlevfx/" in reference["asset"].lower():
                                    continue
                                effect_source, effect_object = resolve(effect.text, modifier_source)
                                effects.append({"sourceXml": effect_source, "guid": effect_object.get("Guid"),
                                                "type": effect_object.tag})
                            selector_record["wbModifiers"].append({"sourceXml": modifier_source,
                                "guid": modifier.get("Guid"), "effects": effects})
                        action_record["selectors"].append(selector_record)
                    resolved_count = sum(bool(s["wbModifiers"] or s["gsBindings"])
                                         for s in action_record["selectors"])
                    for selector_record in action_record["selectors"]:
                        if not selector_record["wbModifiers"] and not selector_record["gsBindings"]:
                            issues.append({"weapon": wid, "attachmentXml": relative,
                                "reason": "selector has no WB/GS modifier match",
                                "selector": selector_record["unlock"],
                                "actionGuid": action.get("Guid"),
                                "resolvedSiblingSelectorCount": resolved_count})
                    branch_record["actions"].append(action_record)
                record["branches"].append(branch_record)
            if not branches:
                issues.append({"weapon": wid, "attachmentXml": relative, "reason": "no matching ability branch"})
            rows.append(record)
    return rows, issues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--site", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--include-optics", action="store_true",
                        help="Include optic attachments and their explicitly matched WB/GS selectors in the research graph")
    parser.add_argument("--sdk-metadata", type=Path,
                        default=Path(__file__).resolve().parents[1] / "reference-data/provenance/frosty-sdk-field-types.json")
    parser.add_argument("--identities", type=Path,
                        default=Path(__file__).resolve().parents[1] / "reference-data/provenance/frosty-weapon-identities.json")
    args = parser.parse_args()
    hashes, parsed = {}, {}
    sdk_bytes = args.sdk_metadata.read_bytes()
    sdk_types = json.loads(sdk_bytes)["types"]

    def read_xml(relative):
        if relative in parsed:
            return parsed[relative]
        data = (args.root / relative).read_bytes()
        hashes[relative] = hashlib.sha256(data).hexdigest()
        parsed[relative] = ET.fromstring(data)
        return parsed[relative]

    registry = read_xml(REGISTRY)
    by_guid = {e.get("Guid", "").lower(): e for e in registry}
    if len(by_guid) != len(registry):
        raise ValueError("Duplicate registry GUID")
    named = defaultdict(list)
    for guid, element in by_guid.items():
        name = element.findtext("Field_0c59fa06") or ""
        if "." in name:
            raw = literal(element.find("Field_42c8b257"))
            clr_type = sdk_types.get(element.tag, {}).get("Field_42c8b257", {}).get("clrType")
            # Caliber decimals belong to the projectile asset name.
            asset_name = (name.split(".BulletEntityData", 1)[0]
                          if ".BulletEntityData" in name else name.split(".", 1)[0])
            named[asset_name].append({"name": name, "registryGuid": guid,
                "registryType": element.tag, "raw": raw, "scalarType": clr_type,
                "value": typed_scalar(raw, clr_type)})

    blocks, observations, weapons = [], defaultdict(list), []
    for gs in sorted((args.root / "Common/Hardware/Weapons").rglob("GS_*.xml")):
        wid = gs.stem[3:]
        wbs = sorted(gs.parent.glob("*_WB.xml"))
        if len(wbs) != 1:
            raise ValueError(f"{wid}: expected one WB, found {len(wbs)}")
        records = []
        for file in (gs, wbs[0]):
            relative = file.relative_to(args.root).as_posix()
            root = read_xml(relative)
            xpath = paths(root)
            parent = {c: p for p in root.iter() for c in p}
            records.extend(named[file.stem])
            for leaf in root.iter("Field_6b28f68f"):
                match = EXTERNAL.fullmatch((leaf.text or "").strip())
                if not match or match[1].lower() != REGISTRY[:-4].lower():
                    continue
                definition = by_guid[match[2].lower()]
                anchor_name = definition.findtext("Field_0c59fa06") or ""
                # The reference wrapper identifies its enclosing block, not its
                # ordinal children. Never zip XML fields to registry members.
                wrapper = parent[leaf]
                if wrapper.tag != "Struct_9bc51bd0":
                    raise ValueError(f"Unexpected registry wrapper: {relative}")
                block = parent[parent[wrapper]]
                scalar_fields = {c.tag: literal(c) for c in block if literal(c) is not None}
                if len(scalar_fields) != sum(literal(c) is not None for c in block):
                    raise ValueError(f"Duplicate scalar field: {relative} {xpath[block]}")
                block_id = len(blocks)
                blocks.append({"weapon": wid, "sourceXml": relative, "path": xpath[block],
                    "type": block.tag, "registryGuid": match[2].lower(), "name": anchor_name,
                    "rawScalars": scalar_fields})
                for member in definition.findall("Field_080f1aaa/member"):
                    if (member.text or "").strip() == "nullptr":
                        continue  # Sparse registry member slots have no definition.
                    child = by_guid[member.text.split()[-1].lower()]
                    raw = literal(child.find("Field_42c8b257"))
                    name = child.findtext("Field_0c59fa06") or ""
                    if raw is None or not name.startswith(anchor_name + "."):
                        continue
                    suffix = name[len(anchor_name) + 1:]
                    if "." not in suffix and "[" not in suffix:
                        observations[(block.tag, suffix)].append((block_id, raw))
        weapons.append({"internalId": wid, "gsXml": gs.relative_to(args.root).as_posix(),
                        "wbXml": wbs[0].relative_to(args.root).as_posix(), "registry": records})

    candidates = []
    for (type_name, name), rows in sorted(observations.items()):
        fields = set(blocks[rows[0][0]]["rawScalars"])
        for block_id, raw in rows:
            fields &= {key for key, value in blocks[block_id]["rawScalars"].items() if value == raw}
        candidates.append({"type": type_name, "name": name, "candidateFields": sorted(fields),
            "distinctValues": len({raw for _, raw in rows}),
            "weaponCount": len({blocks[i]["weapon"] for i, _ in rows}),
            "observations": [{"block": i, "registryRaw": raw} for i, raw in rows],
            "status": "unique-value-match" if len(fields) == 1 else "ambiguous" if fields else "no-match",
            "interpretation": "cross-weapon value evidence only; not a type declaration or runtime formula"})

    site_path = args.site / "data/weapons.json"
    site_bytes = site_path.read_bytes()
    site = json.loads(site_bytes)
    by_id = {w["id"].lower(): w for w in site}
    identity_bytes = args.identities.read_bytes()
    identities = json.loads(identity_bytes)["weapons"]
    identity_map = {r["internalId"].lower(): r for r in identities}
    if len(identity_map) != len(identities) or len({r["siteId"] for r in identities}) != len(identities):
        raise ValueError("Duplicate weapon identity")
    internal_ids = {w["internalId"].lower() for w in weapons}
    for key, row in identity_map.items():
        target = by_id.get(row["siteId"])
        if key not in internal_ids or target is None or target["name"] != row["siteName"]:
            raise ValueError(f"Stale weapon identity: {row}")
    comparisons, roster = [], []
    for weapon in weapons:
        key = weapon["internalId"].lower()
        identity = identity_map.get(key)
        target = by_id.get(identity["siteId"] if identity else key)
        roster.append({"internalId": weapon["internalId"], "siteId": target["id"] if target else None,
            "identityEvidence": "recorded source ID/display-name pair" if identity else (
                "exact internal/site ID" if target else "identity mapping required"),
            "registryScalarCount": sum(r["raw"] is not None for r in weapon["registry"])})
        if not target:
            continue
        lookup = defaultdict(list)
        for rec in weapon["registry"]:
            lookup[rec["name"]].append(rec)
        for field, (kind, suffix) in compare_fields().items():
            if field == "rpm" and target.get("fireMode") == "semi":
                suffix = "WeaponEntityData.WeaponFiring.PrimaryFire.FireLogic.RateOfFireForSingleFire"
            prefix = Path(weapon["gsXml"] if kind == "GS" else weapon["wbXml"]).stem
            matches = lookup[prefix + "." + suffix]
            value = target
            for part in field.split("."):
                value = value.get(part) if isinstance(value, dict) else None
            raw = matches[0]["raw"] if len(matches) == 1 else None
            decoded = matches[0]["value"] if len(matches) == 1 else None
            numeric = decoded if type(decoded) in (int, float) else number(raw)
            status = "unresolved" if numeric is None or not isinstance(value, (int, float)) else (
                "match" if abs(numeric - value) <= max(1e-6, abs(numeric) * 1e-6) else "different")
            comparisons.append({"internalId": weapon["internalId"], "siteId": target["id"],
                "siteField": field, "siteValue": value, "registryName": prefix + "." + suffix,
                "registryRaw": raw, "registryGuid": matches[0]["registryGuid"] if len(matches) == 1 else None,
                "registryValue": numeric,
                "status": status})

    projectiles = []
    for weapon in weapons:
        root = read_xml(weapon["wbXml"])
        # This is the primary firing object's shot reference, not every bullet
        # mentioned by a WB or an attachment modifier.
        field = root.find("Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c")
        if field is None:
            raise ValueError(f"Missing primary shot projectile: {weapon['wbXml']}")
        raw = literal(field)
        external = EXTERNAL.fullmatch(raw or "")
        if external:
            source = external[1] + ".xml"
            guid = external[2].lower()
        else:
            local = re.fullmatch(r"\[Class_23637dce\] ([0-9a-fA-F-]{36})", raw or "")
            if not local:
                raise ValueError(f"Unresolved primary projectile: {weapon['wbXml']} {raw}")
            source, guid = weapon["wbXml"], local[1].lower()
        projectile_root = read_xml(source)
        matches = [e for e in projectile_root if e.get("Guid", "").lower() == guid]
        if len(matches) != 1 or matches[0].tag != "Class_23637dce":
            raise ValueError(f"Missing or unexpected bullet object: {source} {guid}")
        projectile = matches[0]
        registry_prefixes = {Path(source).stem} if external else set()
        registry_links = []
        for reference in projectile.iter("Field_6b28f68f"):
            link = EXTERNAL.fullmatch(literal(reference) or "")
            if not link or link[1] + ".xml" != REGISTRY:
                continue
            definition = by_guid.get(link[2].lower())
            if definition is None:
                raise ValueError(f"Missing projectile registry definition: {source} {link[2]}")
            definition_name = definition.findtext("Field_0c59fa06", "")
            registry_links.append({"registryGuid": link[2].lower(), "name": definition_name,
                                   "path": paths(projectile_root)[reference]})
            if definition_name.endswith(".BulletEntityData"):
                registry_prefixes.add(definition_name.removesuffix(".BulletEntityData"))
        curves = []
        for curve_field in ("Field_6008eb31", "Field_2ad7e688", "Field_0bdc38c4", "Field_7e05a1ae"):
            curve_ref = projectile.findtext(curve_field, "nullptr").strip()
            if curve_ref == "nullptr":
                continue
            local = re.fullmatch(r"\[(Class_afbfd124|Class_6a0d9448)\] ([0-9a-fA-F-]{36})", curve_ref)
            if not local:
                raise ValueError(f"Unsupported projectile curve reference: {source} {curve_field} {curve_ref}")
            targets = [e for e in projectile_root if e.get("Guid", "").lower() == local[2].lower()]
            if len(targets) != 1 or targets[0].tag != local[1]:
                raise ValueError(f"Missing or wrong projectile curve object: {source} {curve_ref}")
            curve = targets[0]
            if curve.tag == "Class_afbfd124":
                points = [[literal(e.find("Field_3901db14")), literal(e.find("Field_42fc0f5e"))]
                          for e in curve.findall("Field_edfc6df6/member/Struct_c45202f2")]
            else:
                values = [literal(e) for e in curve.findall("Field_5279388d/member")]
                if len(values) % 2:
                    raise ValueError(f"Odd XY curve value count: {source} {curve_ref}")
                points = [values[i:i + 2] for i in range(0, len(values), 2)]
            curves.append({"referenceField": curve_field, "rawReference": curve_ref,
                           "path": paths(projectile_root)[curve], "rawPoints": points})
        projectiles.append({"internalId": weapon["internalId"], "wbXml": weapon["wbXml"],
            "shotReferencePath": paths(root)[field], "rawReference": raw,
            "projectileXml": source, "projectileGuid": guid, "type": projectile.tag,
            "rawScalars": {c.tag: literal(c) for c in projectile if literal(c) is not None},
            "linkedCurves": curves,
            "registryLinks": registry_links,
            "registry": [record for prefix in sorted(registry_prefixes) for record in named[prefix]],
            "scope": "Primary shot base projectile only; attachment replacements, damage modifiers, and engine formulas are not resolved"})

    graph, graph_issues = attachment_graph(args.root, weapons, read_xml, include_optics=args.include_optics)
    summary = {"sourceBuild": "1.4.2.5 (user supplied label)", "runtimeReady": False,
        "scope": "GS/WB registry-linked scalar configuration and "
            + ("all exported" if args.include_optics else "non-optic")
            + " attachment selector graph; no factory-build selection or runtime formulas",
        "weaponCandidates": len(weapons), "directlyLinkedBlocks": len(blocks),
        "fieldCandidates": dict(Counter(c["status"] for c in candidates)),
        "mappedWeaponComparisons": sum(r["siteId"] is not None for r in roster),
        "comparisonCounts": dict(Counter(c["status"] for c in comparisons)),
        "attachmentRecords": len(graph), "attachmentGraphIssues": len(graph_issues),
        "baseProjectileReferences": len(projectiles),
        "sdkMetadataSha256": hashlib.sha256(sdk_bytes).hexdigest(),
        "identityMapSha256": hashlib.sha256(identity_bytes).hexdigest(),
        "siteWeaponsSha256": hashlib.sha256(site_bytes).hexdigest()}
    args.out.mkdir(parents=True, exist_ok=True)
    for name, output in {"configuration-summary": summary, "configuration-roster": roster,
                         "registry-configuration": weapons, "registry-linked-blocks": blocks,
                         "raw-field-candidates": candidates, "configuration-comparison": comparisons,
                         "attachment-selection-graph": graph, "attachment-graph-issues": graph_issues,
                         "base-projectile-configuration": projectiles,
                         "configuration-source-sha256": hashes}.items():
        (args.out / f"{name}.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
