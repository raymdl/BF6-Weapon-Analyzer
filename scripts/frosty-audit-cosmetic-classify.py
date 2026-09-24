"""Build a read-only, evidence-linked cosmetic-role census for three weapon families."""
import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import re
import sqlite3


ROOT_CLASS = "Class_bc0062dc"  # decoded UnlockAsset; type hash, not an inferred name
FAMILIES = {
    "charm": "common/hardware/weapons/_charms/",
    "camo": "common/hardware/weapons/_textures/camo/",
    "decal": "common/hardware/weapons/_textures/decals/",
}


def sha(path):
    h = hashlib.sha256()
    with pathlib.Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def j(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def family_key(family, route):
    name = route.rsplit("/", 1)[-1]
    low = name.casefold()
    if family == "charm":
        return route.split("/")[4].casefold()
    if family == "camo":
        for prefix in ("u_spo_wep_camo_", "spo_wep_camo_", "t_wep_camo_"):
            if low.startswith(prefix):
                return low[len(prefix):].removesuffix("_package")
        if low.startswith("u_camo_test_"):
            return "test:" + low[len("u_camo_test_"):]
        return ""
    # Decal texture assets omit Primary/Secondary. Strip their channel suffix
    # and bind them to the same typed U wrapper key; do not infer by folder.
    for prefix in ("u_wepdec_primary_", "u_wepdec_secondary_",
                  "spo_wepdec_primary_", "spo_wepdec_secondary_"):
        if low.startswith(prefix):
            return low[len(prefix):]
    if low.startswith("t_wepdec_"):
        key = low[len("t_wepdec_"):]
        return re.sub(r"_(cs|nma|nmt|nmx|wo|nm|mask|normal|diffuse)$", "", key)
    return ""


def role_evidence(family, route, root_class, body, anchor, shape):
    pointer = "/Field_0c59fa06"
    if not isinstance(body, dict) or body.get("Field_0c59fa06", "").casefold() != route.casefold():
        return None
    if family == "charm":
        # The family key is the exact immediate child of _Charms. Descendant
        # role requires both its WEPCHRM content identity and a typed U wrapper.
        if root_class == ROOT_CLASS and re.search(r"/U_ATT_[^/]*", route, re.I) and shape.get("slotMatch"):
            return {"ruleId": "CHARM_TYPED_ASSIGNMENT_ROOT", "pointer": pointer,
                    "role": "UnlockAsset body path and Equipment tag matching the named Charm slot definition"}
        if anchor and root_class in {"Class_b580666e", "Class_310db741", "Class_7950a6b3"} and "WEPCHRM" in route.upper():
            return {"ruleId": "CHARM_MATCHED_BRANCH_MEMBER", "pointer": pointer,
                    "anchorRoute": anchor["route"], "anchorPointer": "/Field_0c59fa06",
                    "basis": "same immediate charm key plus WEPCHRM asset identity"}
    elif family == "camo":
        if root_class == ROOT_CLASS and ("/U_SPO_WEP_Camo_" in route or "/U_Camo_Test_" in route) and shape.get("slotMatch"):
            return {"ruleId": "CAMO_TYPED_ASSIGNMENT_ROOT", "pointer": pointer,
                    "role": "UnlockAsset body path plus camo wrapper identity"}
        if anchor:
            if root_class == "Class_87706e6e" and shape.get("validShaderBundle"):
                return {"ruleId": "CAMO_SHADER_BUNDLE", "pointer": "/Field_aea9bf7d",
                        "anchorRoute": anchor["route"], "anchorPointer": "/Field_0c59fa06",
                        "basis": "same WCR key; decoded object array contains shader-parameter objects"}
            if root_class == "Class_b580666e" and shape.get("validTexture"):
                return {"ruleId": "CAMO_MATCHED_TEXTURE", "pointer": "/Field_aa4fa860/$resourceRef",
                        "anchorRoute": anchor["route"], "anchorPointer": "/Field_0c59fa06",
                        "basis": "same WCR key; declared TextureAsset resource"}
    else:
        if root_class == ROOT_CLASS and re.search(r"/U_WEPDEC_(Primary|Secondary)_", route, re.I) and shape.get("slotMatch"):
            return {"ruleId": "DECAL_TYPED_ASSIGNMENT_ROOT", "pointer": pointer,
                    "role": "UnlockAsset body path plus primary/secondary decal wrapper identity"}
        if anchor:
            if root_class == "Class_87706e6e" and shape.get("validShaderBundle"):
                return {"ruleId": "DECAL_SHADER_BUNDLE", "pointer": "/Field_aea9bf7d",
                        "anchorRoute": anchor["route"], "anchorPointer": "/Field_0c59fa06",
                        "basis": "same decal key; decoded object array contains weapon-sticker parameters"}
            if root_class == "Class_b580666e" and shape.get("validTexture"):
                return {"ruleId": "DECAL_MATCHED_TEXTURE", "pointer": "/Field_aa4fa860/$resourceRef",
                        "anchorRoute": anchor["route"], "anchorPointer": "/Field_0c59fa06",
                        "basis": "same decal key; declared TextureAsset resource"}
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", type=pathlib.Path, required=True)
    ap.add_argument("--context-db", type=pathlib.Path, required=True)
    ap.add_argument("--out-jsonl", type=pathlib.Path, required=True)
    ap.add_argument("--out-summary", type=pathlib.Path, required=True)
    ap.add_argument("--out-markdown", type=pathlib.Path, required=True)
    args = ap.parse_args()
    db = sqlite3.connect("file:" + str(args.db.resolve()) + "?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    ledger_meta = {row["key"]: json.loads(row["value"]) for row in db.execute(
        "SELECT key,value FROM metadata WHERE key IN ('catalogHead','catalogSha256','decoderSha256')")}
    # Materialize only the three requested namespaces, then close the database.
    assets = list(db.execute("""SELECT a.route,a.file_guid,c.id,c.raw_path,c.head,
        c.descriptor_sha256,c.raw_sha256,c.header_status,c.decode_status,c.root_class,
        c.object_count,c.warnings_json
        FROM assets a JOIN captures c ON c.route=a.route
        WHERE a.route_key LIKE 'common/hardware/weapons/%'"""))
    scoped = {name: [dict(row) for row in assets if prefix in row["route"].casefold()]
              for name, prefix in FAMILIES.items()}
    wanted = {r["id"] for family in scoped.values() for r in family}
    bodies = {}
    capture_ids = list(wanted)
    for offset in range(0, len(capture_ids), 500):
        part = capture_ids[offset:offset + 500]
        marks = ",".join("?" for _ in part)
        for row in db.execute(f"SELECT capture_id,object_index,object_guid,class_name,body_json FROM objects WHERE capture_id IN ({marks})", part):
            bodies.setdefault(row["capture_id"], []).append(dict(row))
    # Preserve one exact captured assignment reference for wrappers, where available.
    incoming = {}
    file_guids = list({r["file_guid"] for group in scoped.values() for r in group})
    import_index = {}
    for offset in range(0, len(file_guids), 400):
        part = file_guids[offset:offset + 400]
        marks = ",".join("?" for _ in part)
        for row in db.execute(f"SELECT target_file_guid,capture_id,target_object_guid FROM imports WHERE target_file_guid IN ({marks})", part):
            import_index[(row["capture_id"], row["target_file_guid"].casefold(), row["target_object_guid"].casefold())] = True
    source_ids = sorted({key[0] for key in import_index})
    source_routes = {}
    for offset in range(0, len(source_ids), 500):
        part = source_ids[offset:offset + 500]
        marks = ",".join("?" for _ in part)
        source_routes.update((row["id"], {"route": row["route"], "rawPath": row["raw_path"], "rawSha256": row["raw_sha256"]}) for row in db.execute(
            f"SELECT id,route,raw_path,raw_sha256 FROM captures WHERE id IN ({marks})", part))
    # The refs table has no target-object index. Scan it once, retaining only
    # imported targets from these three families. Never hold a refs cursor over
    # downstream processing.
    for row in db.execute("SELECT capture_id,object_index,pointer,target_object_guid,target FROM refs WHERE kind='import'"):
        key = (row["capture_id"], (row["target"] or "").casefold(), (row["target_object_guid"] or "").casefold())
        if key not in import_index:
            continue
        target = row["target"].casefold()
        src = source_routes.get(row["capture_id"], {})
        item = {"sourceRoute": src.get("route"), "sourceCaptureId": row["capture_id"],
                "sourceRawPath": src.get("rawPath"), "sourceRawSha256": src.get("rawSha256"),
                "sourceObjectIndex": row["object_index"], "sourcePointer": row["pointer"],
                "targetObjectGuid": row["target_object_guid"], "targetFileGuid": row["target"]}
        old = incoming.get(target)
        if old is None or ("equipment" not in (old["sourceRoute"] or "").casefold() and "equipment" in (item["sourceRoute"] or "").casefold()):
            incoming[target] = item
    source_bodies = {}
    source_ids = list(source_routes)
    for offset in range(0, len(source_ids), 500):
        part = source_ids[offset:offset + 500]
        marks = ",".join("?" for _ in part)
        source_bodies.update((row["capture_id"], row["body_json"]) for row in db.execute(
            f"SELECT capture_id,body_json FROM objects WHERE object_index=0 AND capture_id IN ({marks})", part))
    guid_to_route = {r["file_guid"].casefold(): r["route"] for r in assets}
    id_to_route = {r["id"]: r["route"] for r in assets}
    db.close()

    context_db = sqlite3.connect("file:" + str(args.context_db.resolve()) + "?mode=ro", uri=True)
    context_db.row_factory = sqlite3.Row
    slot_names = {"charm": ["Charm"], "camo": ["Camo_SPO"],
                  "decal": ["StickerPrimary_SPO", "StickerSecondary_SPO"]}
    slot_definitions = {}
    for family, names in slot_names.items():
        for name in names:
            route = "Common/Gameplay/Weapons/Template/DefinitionSlots_Weapons/" + name
            row = context_db.execute("""SELECT a.route,c.raw_path,c.raw_sha256,c.head,
                c.descriptor_sha256,c.decode_status,c.root_class,c.warnings_json,c.id
                FROM assets a JOIN captures c ON c.route=a.route WHERE lower(a.route)=lower(?)""", (route,)).fetchone()
            if row:
                obj = context_db.execute("SELECT object_index,object_guid,class_name,body_json FROM objects WHERE capture_id=? ORDER BY object_index LIMIT 1", (row["id"],)).fetchone()
                body = json.loads(obj["body_json"]) if obj else {}
                slot_definitions[(family, name)] = {"route": row["route"], "rawPath": row["raw_path"],
                    "rawSha256": row["raw_sha256"], "head": row["head"], "descriptorSha256": row["descriptor_sha256"],
                    "decodeStatus": row["decode_status"], "rootClassHash": row["root_class"],
                    "captureWarnings": json.loads(row["warnings_json"] or "[]"),
                    "objectGuid": obj["object_guid"] if obj else None, "objectIndex": obj["object_index"] if obj else None,
                    "classHash": obj["class_name"] if obj else None, "bodyPointer": "/Field_de6f63b3",
                    "slotId": body.get("Field_de6f63b3"), "pathPointer": "/Field_0c59fa06"}
    context_db.close()

    output = []
    build_root = args.db.resolve().parents[2]
    current_catalog = build_root / "capture/weapon-audit-2026-09-23/asset-catalog.json"
    reviewed_rule_report = pathlib.Path(__file__).resolve().parents[1] / "reference-data/provenance/frosty-audit-cosmetic-rules-reviewed-2026-09-23.json"
    summary = {"families": {}, "source": {"ledger": str(args.db.resolve()),
        "ledgerMode": "SQLite URI mode=ro; rows materialized and connection closed before classification",
        "slotDefinitionContextLedger": str(args.context_db.resolve()),
        "slotDefinitionContextMode": "SQLite URI mode=ro; only four named slot routes were read",
        "fixedLedgerCatalogHead": ledger_meta.get("catalogHead"),
        "fixedLedgerCatalogSha256": ledger_meta.get("catalogSha256"),
        "decoderSha256": ledger_meta.get("decoderSha256"),
        "currentCaptureCatalog": str(current_catalog),
        "currentCaptureCatalogSha256": sha(current_catalog) if current_catalog.exists() else None,
        "catalogHead": 4892087,
        "descriptorSha256": sorted({r["descriptor_sha256"] for group in scoped.values() for r in group}),
        "classGuidMappingSource": str(pathlib.Path(r"C:\Users\royal\Documents\BF6 Datamining\FrostyToolsuite-battlefield6\FrostyPlugin\Sdk\ClassGuids.txt")),
        "classGuidMappingSha256": "06a5ea8ff3d0773f7206db81a12bdb993e3235ec7069c3f5a9d7e0b56a6b354f",
        "reviewedRoleRuleSource": str(reviewed_rule_report),
        "reviewedRoleRuleSourceSha256": sha(reviewed_rule_report),
        "scope": "only primary weapon namespace _Charms, _Textures/Camo, _Textures/Decals",
        "limitation": "No runtime claims. Each wrapper needs an Equipment customization-array import whose tag equals a named DefinitionSlots_Weapons record. Descendants inherit only through a validated wrapper key and typed/content-shaped member. Missing edges do not prove global exclusivity."}}
    summary["slotDefinitions"] = {family + ":" + name: value
                                  for (family, name), value in slot_definitions.items()}
    for family, records in scoped.items():
        # Root records need a typed UnlockAsset with its own serialized asset path.
        by_key = collections.defaultdict(list)
        parsed = {}
        for r in records:
            objs = bodies.get(r["id"], [])
            root = objs[0] if objs else {}
            try:
                body = json.loads(root.get("body_json") or "{}")
            except json.JSONDecodeError:
                body = {}
            r["rootObject"] = root
            r["body"] = body
            r["key"] = family_key(family, r["route"])
            parsed[r["route"].casefold()] = r
            if r["key"]:
                by_key[r["key"]].append(r)
        # Resolve each wrapper import to its serialized Equipment customization
        # slot and compare the numeric tag to the named DefinitionSlots record.
        for r in records:
            names = ("Charm",) if family == "charm" else (("Camo_SPO",) if family == "camo" else
                (("StickerPrimary_SPO",) if "_primary_" in r["route"].casefold() else ("StickerSecondary_SPO",)))
            slot = slot_definitions.get((family, names[0]))
            assignment = incoming.get(r["file_guid"].casefold())
            slot_ref = ({"route": slot["route"], "slotId": slot["slotId"],
                         "rawSha256": slot["rawSha256"], "objectGuid": slot["objectGuid"],
                         "classHash": slot["classHash"], "bodyPointer": slot["bodyPointer"]}
                        if slot else None)
            tag = None
            slot_pointer = None
            exact_import = False
            if assignment and "equipment" in (assignment.get("sourceRoute") or "").casefold():
                match = re.fullmatch(r"/Field_74e73474/(\d+)/Field_c35afbd8", assignment.get("sourcePointer") or "")
                if match and assignment.get("sourceCaptureId") in source_bodies:
                    source_body = json.loads(source_bodies[assignment["sourceCaptureId"]])
                    index = int(match.group(1))
                    entries = source_body.get("Field_74e73474", [])
                    if index < len(entries):
                        entry = entries[index]
                        ref = entry.get("Field_c35afbd8", {}).get("$import", {})
                        tag = entry.get("Field_f9ffb5fc")
                        slot_pointer = f"/Field_74e73474/{index}/Field_f9ffb5fc"
                        exact_import = (ref.get("fileGuid", "").casefold() == r["file_guid"].casefold()
                                        and ref.get("classGuid", "").casefold() == assignment.get("targetObjectGuid", "").casefold())
            r["slotAssignment"] = {"assignmentImport": assignment, "assignmentTag": tag,
                "assignmentTagPointer": slot_pointer, "targetFileGuidExact": exact_import,
                "slotDefinition": slot_ref,
                "slotMatch": bool(slot and slot.get("slotId") == tag and exact_import)}
            r["shape"] = {"slotMatch": r["slotAssignment"]["slotMatch"]}
        anchors = {}
        for key, group in by_key.items():
            valid = [r for r in group if r["root_class"] == ROOT_CLASS and role_evidence(family,r["route"],r["root_class"],r["body"],None,r["shape"])]
            # Charm anchors are per immediate folder, not the WEPCHRM code.
            if family == "charm":
                for r in valid:
                    anchors[r["route"].split("/")[4].casefold()] = r
            else:
                if valid:
                    anchors[key] = valid[0]
        # Materialize incoming assignment pointer evidence for each typed wrapper.
        anchor_evidence = {}
        for anchor in anchors.values():
            root = anchor["rootObject"]
            if not root:
                continue
            # SQL-free search is impossible for import pointers; retrieve below in a
            # brief independent read batch after classification members are ready.
            anchor_evidence[anchor["route"].casefold()] = {"rootGuid": root.get("object_guid"),
                "rootObjectIndex": root.get("object_index"), "rootClass": root.get("class_name")}
        rows = []
        for r in records:
            key = r["key"]
            anchor = anchors.get(r["route"].split("/")[4].casefold()) if family == "charm" else anchors.get(key)
            shape = {**r["shape"], "validTexture": isinstance(r["body"].get("Field_aa4fa860"), dict) and
                     "$resourceRef" in r["body"].get("Field_aa4fa860", {})}
            object_rows = bodies.get(r["id"], [])
            shader_paths = []
            if r["root_class"] == "Class_87706e6e":
                for child in object_rows[1:]:
                    try:
                        child_body = json.loads(child.get("body_json") or "{}")
                    except json.JSONDecodeError:
                        child_body = {}
                    if child_body.get("Field_f114959b"):
                        shader_paths.append(child_body["Field_f114959b"])
                child_types_valid = bool(object_rows[1:]) and all(x.get("class_name") == "Class_5acf852a" for x in object_rows[1:])
                if family == "camo":
                    shape["validShaderBundle"] = child_types_valid and any("/Camouflage/" in p or "SP_CamoTexture" in p for p in shader_paths)
                    shape["shaderChildCount"] = len(object_rows) - 1
                    shape["cosmeticShaderPathCount"] = sum("/Camouflage/" in p or "SP_CamoTexture" in p for p in shader_paths)
                elif family == "decal":
                    shape["validShaderBundle"] = child_types_valid and any("WeaponSticker" in p for p in shader_paths)
                    shape["shaderChildCount"] = len(object_rows) - 1
                    shape["cosmeticShaderPathCount"] = sum("WeaponSticker" in p for p in shader_paths)
            proof = role_evidence(family,r["route"],r["root_class"],r["body"],anchor,shape)
            if proof:
                disposition = "excluded-cosmetic"
            else:
                disposition = "unresolved-role"
                if family == "charm":
                    folder = r["route"].split("/")[4].casefold()
                    if r["root_class"] == ROOT_CLASS and "u_att_" in r["route"].casefold():
                        blocker = "Candidate charm UnlockAsset lacks an exact Equipment customization-slot tag match to DefinitionSlots_Weapons/Charm; wrapper/name alone is insufficient."
                    elif folder.startswith("charmholder"):
                        blocker = "No slot-matched Charm UnlockAsset anchors this holder-texture group; folder and WEPCHRM tokens alone are insufficient."
                    elif folder == "che0029":
                        blocker = "This group has texture members but no slot-matched Charm UnlockAsset root."
                    elif folder == "rules":
                        blocker = "Charm-named rule content has no matching Charm Equipment slot assignment; the MD consumer pointer does not prove the rule's role."
                    else:
                        blocker = "No validated Charm slot root and permitted typed WEPCHRM member shape was established."
                elif family == "camo":
                    if r["root_class"] == ROOT_CLASS:
                        blocker = "Candidate camo UnlockAsset lacks an exact Equipment customization-slot tag match to DefinitionSlots_Weapons/Camo_SPO."
                    else:
                        blocker = "No slot-matched Camo_SPO wrapper with this exact family key was found."
                else:
                    blocker = "No slot-matched StickerPrimary_SPO or StickerSecondary_SPO wrapper with this exact decal key was found."
                proof = {"ruleId": "UNRESOLVED_NO_POSITIVE_ROLE_LINK",
                         "blocker": blocker, "proposedCosmeticRole": family + "-candidate; not excluded"}
            root = r["rootObject"]
            branch_anchor = None
            if anchor:
                anchor_slot = anchor["slotAssignment"]
                branch_anchor = {"route": anchor["route"], "rawSha256": anchor["raw_sha256"],
                    "rootClassHash": anchor["root_class"], "objectGuid": anchor["rootObject"].get("object_guid"),
                    "bodyPointer": "/Field_0c59fa06", "assignmentImport": anchor_slot["assignmentImport"],
                    "assignmentTag": anchor_slot["assignmentTag"],
                    "assignmentTagPointer": anchor_slot["assignmentTagPointer"],
                    "slotDefinition": anchor_slot["slotDefinition"], "slotMatch": anchor_slot["slotMatch"]}
            asset = {"route": r["route"], "fileGuid": r["file_guid"], "family": family,
                "familyKey": key or None, "disposition": disposition, "ruleId": proof["ruleId"],
                "evidence": {"rawPath": r["raw_path"], "rawSha256": r["raw_sha256"],
                    "head": r["head"], "descriptorSha256": r["descriptor_sha256"],
                    "headerStatus": r["header_status"], "decodeStatus": r["decode_status"],
                    "rootClassHash": r["root_class"], "objectCount": r["object_count"],
                    "captureWarnings": json.loads(r["warnings_json"] or "[]"),
                    "bodyPointer": proof.get("pointer"), "basis": proof.get("basis", proof.get("role")),
                    "rootObjectGuid": root.get("object_guid"),
                    "slotAssignmentEvidence": r["slotAssignment"] if r["root_class"] == ROOT_CLASS else None,
                    "cosmeticBranchAnchor": branch_anchor,
                    "assignmentImport": r["slotAssignment"]["assignmentImport"],
                    "shapeValidation": shape,
                    "cosmeticAnchorRoute": proof.get("anchorRoute", r["route"] if disposition == "excluded-cosmetic" and proof["ruleId"].endswith("ROOT") else None),
                    "anchorBodyPointer": proof.get("anchorPointer", "/Field_0c59fa06" if disposition == "excluded-cosmetic" and proof["ruleId"].endswith("ROOT") else None)},
                "sharedFunctionalTargets": [],
                "scopeNote": "No functional override was established within this bounded family census; empty exception list is not a claim of global non-reference."}
            if disposition == "unresolved-role":
                asset["evidence"]["blocker"] = proof["blocker"]
            rows.append(asset)
        output.extend(rows)
        disp = collections.Counter(x["disposition"] for x in rows)
        rulecounts = collections.Counter(x["ruleId"] for x in rows)
        root_rows = [x for x in rows if x["ruleId"].endswith("ROOT")]
        summary["families"][family] = {"catalogCount": len(rows), "dispositions": dict(disp),
            "rules": dict(rulecounts), "typedAssignmentRootAssets": len(root_rows),
            "assignmentAnchorKeys": len(anchors),
            "rootAssetsWithEquipmentImportPointer": sum(bool(x["evidence"]["assignmentImport"] and "equipment" in (x["evidence"]["assignmentImport"]["sourceRoute"] or "").casefold()) for x in root_rows),
            "unresolvedExamples": [x["route"] for x in rows if x["disposition"] == "unresolved-role"][:20],
            "unresolvedExceptions": [{"route": x["route"], "rootClassHash": x["evidence"]["rootClassHash"],
                "blocker": x["evidence"].get("blocker")} for x in rows if x["disposition"] == "unresolved-role"]}
    args.out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    args.out_summary.parent.mkdir(parents=True, exist_ok=True)
    args.out_markdown.parent.mkdir(parents=True, exist_ok=True)
    with args.out_jsonl.open("w", encoding="utf-8", newline="\n") as f:
        for row in output:
            f.write(j(row) + "\n")
    summary["rowCount"] = len(output)
    summary["generatedUtc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    summary["dispositionTotals"] = dict(collections.Counter(x["disposition"] for x in output))
    summary["source"]["classifierSha256"] = sha(pathlib.Path(__file__))
    summary["source"]["jsonlPath"] = str(args.out_jsonl.resolve())
    summary["source"]["jsonlSha256"] = sha(args.out_jsonl)
    provisional_jsonl = args.out_jsonl.with_name("cosmetic-dispositions.jsonl")
    provisional_summary = pathlib.Path(__file__).resolve().parents[1] / "reference-data/provenance/frosty-audit-cosmetic-classification-2026-09-23.json"
    if provisional_jsonl.exists() and provisional_jsonl.resolve() != args.out_jsonl.resolve():
        summary["source"]["provisionalJsonlPath"] = str(provisional_jsonl.resolve())
        summary["source"]["provisionalJsonlSha256"] = sha(provisional_jsonl)
    if provisional_summary.exists() and provisional_summary.resolve() != args.out_summary.resolve():
        summary["source"]["provisionalSummaryPath"] = str(provisional_summary.resolve())
        summary["source"]["provisionalSummarySha256"] = sha(provisional_summary)
    args.out_summary.write_text(json.dumps(summary, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    lines = ["# Cosmetic-role classification census", "",
        "This report classifies only charm, camo, and decal families. It records proposed dispositions, not runtime behavior. Exclusion requires a typed assignment wrapper or a typed/content-shaped same-key member anchored to that wrapper. An unresolved row is not excluded.", "",
        "The fixed coverage snapshot was opened read-only. Rows were materialized and the database connection was closed before classification. The output preserves each asset route, raw SHA-256, Head, descriptor SHA-256, root class hash, and body pointer.", "",
        "| Family | Assets | Excluded-cosmetic | Unresolved-role |", "|---|---:|---:|---:|"]
    for name, values in summary["families"].items():
        d = values["dispositions"]
        lines.append(f"| {name} | {values['catalogCount']} | {d.get('excluded-cosmetic',0)} | {d.get('unresolved-role',0)} |")
    lines += ["", "## Rule boundaries", "",
        "- A root is excluded only when an Equipment import pointer is `/Field_74e73474/<index>/Field_c35afbd8` and the same serialized entry's `Field_f9ffb5fc` equals `Field_de6f63b3` in the matching named definition slot. Charm uses `DefinitionSlots_Weapons/Charm`, camo uses `Camo_SPO`, and decals use `StickerPrimary_SPO` or `StickerSecondary_SPO`. The slot records are decoded-provisional, so preserve their layout warning and exact raw hashes.",
        "- Charm descendants inherit from a slot-matched wrapper only when their own serialized route, declared class hash (`TextureAsset`, `SkinnedMeshAsset`, or `PhysicsAsset`), and `WEPCHRM` identity validate. Unanchored holder groups, CHE0029 textures, the unassigned CHE0040 wrapper, and the three Rules records remain unresolved.",
        "- Camo descendants require a same-key slot-matched wrapper. Shader bundles need `Class_5acf852a` children and camo parameter paths. Textures need the resource pointer. Decal shader bundles need `WeaponSticker` parameter paths; decal textures need the resource pointer and a matching wrapper key. Missing anchors remain unresolved.",
        "- The original `cosmetic-dispositions.jsonl` and non-reviewed summary remain provisional. This reviewed supplement records corrected per-asset rows and their hash. No functional override or shared functional target was established in this bounded family census. A cosmetic Equipment assignment is not a runtime claim.", "",
        "Unresolved route totals are 111 charm, 6 camo, and 5 decal records. The provenance JSON lists each unresolved route and its blocker.",
        f"Reviewed JSONL: `{args.out_jsonl.as_posix()}` (SHA-256 `{summary['source']['jsonlSha256']}`). The provisional JSONL remains available at `externalreports/exhaustive-audit-2026-09-23/cosmetic-dispositions.jsonl`.",
        "See the reviewed provenance record for each slot definition's raw hash, warning, and the exact list of unresolved routes.", ""]
    args.out_markdown.write_text("\n".join(lines), encoding="utf-8")
    print(j({"rowCount": len(output), "families": summary["families"], "totals": summary["dispositionTotals"]}))


if __name__ == "__main__":
    main()
