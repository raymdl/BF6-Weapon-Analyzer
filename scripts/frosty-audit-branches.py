"""Census ability branches and selector joins for captured weapon roots.

The XML overlay supplies candidate structure only. Captured raw bytes are
rehashed and current-ledger decoded root, branch, action, package, and import
fields are compared where possible. Unknown or absent targets stay explicit.
"""
import argparse
from collections import Counter
import hashlib
import json
import re
import sqlite3
from pathlib import Path
import xml.etree.ElementTree as ET

REF = re.compile(r"\[([A-Za-z0-9_]+)\]\s*(.*?)(?:\s*\[([0-9a-f-]{36})\]|\s+([0-9a-f-]{36}))$", re.I)


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def text(node, field):
    n = node.find(field)
    return n.text.strip() if n is not None and n.text else None


def refs(node):
    out = []
    for x in node.iter():
        if x.text:
            m = REF.fullmatch(x.text.strip())
            if m:
                out.append({"path": m[2].replace("\\", "/"), "objectGuid": (m[3] or m[4]).lower(), "refType": m[1], "field": x.tag})
    return out


def members(node, field):
    n = node.find(field)
    return list(n) if n is not None else []


def guid_refs(node, field):
    return [r for m in members(node, field) for r in refs(m)]


def external(raw):
    if not raw:
        return None
    m = REF.fullmatch(raw.strip())
    return {"path": m[2].replace("\\", "/"), "objectGuid": (m[3] or m[4]).lower(), "refType": m[1]} if m else {"raw": raw.strip()}


def read_doc(base, route):
    p = base / (route + ".xml")
    if not p.exists():
        return None, None
    b = p.read_bytes()
    return ET.fromstring(b), hashlib.sha256(b).hexdigest()


def raw_info(datamining, build, ref):
    if not ref or "path" not in ref:
        return None
    route = ref["path"]
    roots = [
        (build / "capture/collection/raw", "collection"),
        (build / "capture/weapon-audit-2026-09-23/raw", "weapon-audit-2026-09-23"),
        (build / "capture/weapon-related-audit-2026-09-23/raw", "weapon-related-audit-2026-09-23"),
        (build / "capture/collection-dependencies/raw", "collection-dependencies"),
        (build / "capture/collection-review-2026-09-16/raw", "collection-review-2026-09-16"),
    ]
    for root, label in roots:
        p = root / (route + ".ebx")
        if p.exists():
            return {"capture": label, "path": route, "sha256": sha256(p), "bytes": p.stat().st_size}
    return {"path": route, "captured": False}


def object_by_guid(root):
    return {x.get("Guid", "").lower(): x for x in list(root) if x.get("Guid")}


def raw_ref_target(value, raw_objects):
    if not isinstance(value, dict) or "$ref" not in value:
        return None
    return raw_objects.get("byIndex", {}).get(value["$ref"])


def raw_import_values(value):
    out = []
    if isinstance(value, dict):
        if isinstance(value.get("$import"), dict):
            out.append(value["$import"])
        else:
            for child in value.values():
                out.extend(raw_import_values(child))
    elif isinstance(value, list):
        for child in value:
            out.extend(raw_import_values(child))
    return out


def import_matches_xml(raw_import, xml_ref, xml_base, guid_cache):
    if not raw_import or not xml_ref or "path" not in xml_ref or "objectGuid" not in xml_ref:
        return False, "missing-reference"
    path = xml_ref["path"]
    if path not in guid_cache:
        doc, _ = read_doc(xml_base, path)
        guid_cache[path] = doc.get("Guid", "").lower() if doc is not None else None
    file_guid = guid_cache[path]
    if file_guid is None:
        return False, "target-xml-missing"
    same = (raw_import.get("fileGuid", "").lower() == file_guid and
            raw_import.get("classGuid", "").lower() == xml_ref["objectGuid"].lower())
    return same, "matched" if same else "guid-mismatch"


def import_list_matches_xml(raw_values, xml_refs, xml_base, guid_cache):
    raw_values = raw_values or []
    xml_refs = xml_refs or []
    if len(raw_values) != len(xml_refs):
        return {"matched": False, "status": "count-mismatch", "rawCount": len(raw_values), "xmlCount": len(xml_refs)}
    checks = [import_matches_xml(r, x, xml_base, guid_cache) for r, x in zip(raw_values, xml_refs)]
    return {"matched": all(ok for ok, _ in checks), "status": "matched" if all(ok for ok, _ in checks) else "reference-mismatch",
            "count": len(checks), "targetStatuses": [s for _, s in checks]}


def import_list_matches_xml_or_catalog(raw_values, xml_refs, xml_base, xml_guid_cache,
                                       catalog_guid_by_path, decoder_meta, datamining=None, build=None):
    raw_values = raw_values or []
    xml_refs = xml_refs or []
    if len(raw_values) != len(xml_refs):
        return {"matched": False, "status": "count-mismatch", "rawCount": len(raw_values), "xmlCount": len(xml_refs)}
    statuses = []
    verified_targets = []
    catalog_fallback_checks = 0
    for raw_import, ref in zip(raw_values, xml_refs):
        check = import_matches_xml_or_catalog_target(raw_import, ref, xml_base, xml_guid_cache,
                                                     catalog_guid_by_path, decoder_meta, datamining, build)
        statuses.append(check["status"])
        verified_targets.append(check.get("verifiedTarget"))
        catalog_fallback_checks += int(check.get("fallbackUsed", False))
    matched = all(s in ("matched", "target-xml-missing-catalog-raw-object-verified") for s in statuses)
    return {"matched": matched, "status": "matched" if matched else "reference-mismatch-or-incomplete",
            "count": len(statuses), "targetStatuses": statuses, "verifiedTargets": verified_targets,
            "catalogRawFallbackTargetChecks": catalog_fallback_checks}


def import_matches_xml_or_catalog_target(raw_import, ref, xml_base, xml_guid_cache,
                                         catalog_guid_by_path, decoder_meta, datamining=None, build=None):
    ok, status = import_matches_xml(raw_import, ref, xml_base, xml_guid_cache)
    if ok:
        return {"matched": True, "status": status, "verifiedTarget": None, "fallbackUsed": False}
    if status != "target-xml-missing":
        return {"matched": False, "status": status, "verifiedTarget": None, "fallbackUsed": False}
    route, object_guid = ref.get("path"), ref.get("objectGuid", "").lower()
    file_guid = catalog_guid_by_path.get(route)
    meta = decoder_meta.get(file_guid, {}) if file_guid else {}
    target_body = meta.get("objects", {}).get("byGuid", {}).get(object_guid)
    catalog_match = (raw_import is not None and file_guid is not None and target_body is not None and
                     raw_import.get("fileGuid", "").lower() == file_guid and
                     raw_import.get("classGuid", "").lower() == object_guid and bool(meta.get("rawSha256")))
    capture = raw_info(datamining, build, ref) if datamining is not None and build is not None else None
    raw_hash_match = bool(capture and capture.get("sha256") == meta.get("rawSha256"))
    if catalog_match and raw_hash_match:
        return {"matched": True, "status": "target-xml-missing-catalog-raw-object-verified",
            "verifiedTarget": {"path": route, "fileGuid": file_guid,
                "objectGuid": object_guid, "objectClass": target_body.get("$class"),
                "rawSha256": meta.get("rawSha256"), "decoderStatus": meta.get("decodeStatus"),
                "rawCapture": capture, "rawCaptureHashMatchesLedger": True}, "fallbackUsed": True}
    return {"matched": False, "status": "target-xml-missing-catalog-raw-unverified",
            "verifiedTarget": {"path": route, "fileGuid": file_guid, "objectGuid": object_guid,
                               "catalogObjectFound": target_body is not None,
                               "rawCapture": capture, "rawCaptureHashMatchesLedger": raw_hash_match}, "fallbackUsed": True}


def hash32_equal(raw, xml):
    if raw is None or xml is None:
        return False
    try:
        return (int(raw) & 0xffffffff) == (int(xml, 0) & 0xffffffff)
    except (TypeError, ValueError):
        return False


def raw_gs_bindings(raw_objects):
    found = []
    def visit(value, owner_guid=None, owner_class=None, field_path=""):
        if isinstance(value, dict):
            if "Field_6d011165" in value and "Field_2f0e5b83" in value:
                found.append({"ownerGuid": owner_guid, "ownerClass": owner_class,
                              "fieldPath": field_path, "fields": value})
            for key, child in value.items():
                if not key.startswith("$"):
                    visit(child, owner_guid, owner_class, f"{field_path}/{key}" if field_path else key)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, owner_guid, owner_class, f"{field_path}/member{index}")
    for body in raw_objects.get("byIndex", {}).values():
        visit(body, body.get("$guid") if isinstance(body, dict) else None,
              body.get("$class") if isinstance(body, dict) else None)
    return found


def xml_gs_bindings(root):
    found = []
    def visit(node, field_path=""):
        selector = node.find("Field_6d011165")
        modifier = node.find("Field_2f0e5b83")
        if selector is not None and modifier is not None:
            found.append({"selectorGuid": selector.text.strip() if selector.text else None,
                          "modifier": external(modifier.text),
                          "entryIndex": text(node, "Field_3f680d24"),
                          "fieldNames": [c.tag for c in list(node)],
                          "fields": {c.tag: (c.text.strip() if c.text else None) for c in list(node)},
                          "structTag": node.tag, "parentFieldPath": field_path})
        for child in list(node):
            child_path = f"{field_path}/{child.tag}" if field_path else child.tag
            visit(child, child_path)
    visit(root)
    return found


def action_row(action, actions_by_guid):
    obj = actions_by_guid.get(action["objectGuid"])
    if obj is None:
        return {**action, "resolved": False, "actionClass": None, "selectors": []}
    cls = obj.tag
    selector_refs = guid_refs(obj, "Field_7e54e22c")
    # Inline unlocks are retained as raw text because some classes are not
    # external EBX references and their semantics are not established here.
    unlocks = []
    f = obj.find("Field_7e54e22c")
    if f is not None:
        unlocks = [{"index": m.get("Index"), "raw": m.text.strip() if m.text else None,
                    "reference": external(m.text) if m.text else None} for m in list(f)]
    return {**action, "resolved": True, "actionClass": cls,
            "recognizedActionClass": cls == "Class_4ed159fb",
            "selectors": selector_refs, "unlockEntries": unlocks,
            "fieldNames": [c.tag for c in list(obj)]}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--datamining", type=Path, required=True)
    ap.add_argument("--roster", type=Path, required=True)
    ap.add_argument("--ledger", type=Path, help="Optional read-only capture ledger for status checks.")
    ap.add_argument("--out-jsonl", type=Path, required=True)
    ap.add_argument("--out-summary", type=Path, required=True)
    args = ap.parse_args()
    build = args.datamining / "builds/1.4.3.0"
    xml_base = build / "xml/xml-overlay"
    roster = json.loads(args.roster.read_text(encoding="utf-8"))
    package_docs = {}
    wb_packages_by_weapon = {}
    target_file_guids = set()
    target_catalog_paths = set()
    for w in roster["roots"]:
        for kind in ("Ability", "GS", "WB"):
            target_file_guids.add(w["roots"][kind]["rawCapture"].get("fileGuid", "").lower())
        wb = ET.parse(xml_base / (w["roots"]["WB"]["xmlOverlay"]["path"] + ".xml")).getroot()
        ability_xml, _ = read_doc(xml_base, w["roots"]["Ability"]["xmlOverlay"]["path"])
        if ability_xml is not None:
            for group in ability_xml.iter("Field_7e54e22c"):
                for member in list(group):
                    ref = external(member.text)
                    if ref and ref.get("path"):
                        target_catalog_paths.add(ref["path"])
        gs_xml, _ = read_doc(xml_base, w["roots"]["GS"]["xmlOverlay"]["path"])
        if gs_xml is not None:
            for node in gs_xml.iter():
                ref = external(text(node, "Field_2f0e5b83"))
                if ref and ref.get("path"):
                    target_catalog_paths.add(ref["path"])
        packages = []
        for group in wb.iter("Field_0cd9f20f"):
            for member in list(group):
                ref = external(member.text)
                if ref and ref.get("path", "").rsplit("/", 1)[-1].startswith("WPM_"):
                    pdoc, phash = read_doc(xml_base, ref["path"])
                    package_docs[ref["path"]] = (pdoc, phash)
                    packages.append(ref)
                    if pdoc is not None and pdoc.get("Guid"):
                        target_file_guids.add(pdoc.get("Guid").lower())
        wb_packages_by_weapon[w["internalId"]] = packages
    decoder_meta = {}
    raw_objects_by_fileguid = {}
    imports_by_capture = {}
    catalog_guid_by_path = {}
    if args.ledger:
        # Materialize root and reached WPM-package rows plus their object bodies
        # and per-WB import indexes, then close the DB before source comparison.
        ledger = sqlite3.connect(f"file:{args.ledger.resolve().as_posix()}?mode=ro", uri=True, timeout=0.5)
        try:
            target_routes = sorted(target_catalog_paths)
            if target_routes:
                route_ph = ",".join("?" for _ in target_routes)
                for route, file_guid in ledger.execute(
                        f"select route,file_guid from assets where route in ({route_ph})", target_routes).fetchall():
                    catalog_guid_by_path[route] = file_guid.lower()
                    target_file_guids.add(file_guid.lower())
            file_ids = sorted(g for g in target_file_guids if g)
            placeholders = ",".join("?" for _ in file_ids)
            asset_rows = ledger.execute(
                "select a.file_guid,a.route,c.id,c.decode_status,c.raw_sha256,c.object_count,c.warnings_json "
                f"from assets a left join captures c on c.route=a.route where a.file_guid in ({placeholders})",
                file_ids).fetchall()
            for fg, route, cid, status, raw_sha, object_count, warnings in asset_rows:
                decoder_meta[fg.lower()] = {"route": route, "captureId": cid, "decodeStatus": status,
                                            "rawSha256": raw_sha, "objectCount": object_count,
                                            "warnings": json.loads(warnings) if warnings else None}
            capture_ids = sorted({m["captureId"] for m in decoder_meta.values() if m.get("captureId") is not None})
            if capture_ids:
                cap_ph = ",".join("?" for _ in capture_ids)
                object_rows = ledger.execute(
                    f"select capture_id,object_index,object_guid,class_name,body_json from objects where capture_id in ({cap_ph})",
                    capture_ids).fetchall()
                by_id = {}
                for cid, oi, og, cls, body in object_rows:
                    by_id.setdefault(cid, {"byIndex": {}, "byGuid": {}})
                    parsed = json.loads(body) if body else {}
                    by_id[cid]["byIndex"][oi] = parsed
                    if og:
                        by_id[cid]["byGuid"][og.lower()] = parsed
                for fg, meta in decoder_meta.items():
                    if meta.get("captureId") in by_id:
                        meta["objects"] = by_id[meta["captureId"]]
                wb_capture_ids = [decoder_meta.get(w["roots"]["WB"]["rawCapture"].get("fileGuid", "").lower(), {}).get("captureId")
                                  for w in roster["roots"]]
                wb_capture_ids = sorted({i for i in wb_capture_ids if i is not None})
                if wb_capture_ids:
                    wb_ph = ",".join("?" for _ in wb_capture_ids)
                    for cid, target_file_guid, target_object_guid in ledger.execute(
                            f"select capture_id,target_file_guid,target_object_guid from imports where capture_id in ({wb_ph})",
                            wb_capture_ids).fetchall():
                        imports_by_capture.setdefault(cid, set()).add((target_file_guid.lower(), target_object_guid.lower()))
        finally:
            ledger.close()
    rows, root_summaries = [], []
    branch_field_counts = Counter()
    gs_struct_tag_counts = Counter()
    attachment_records = {}
    xml_guid_cache = {}
    package_raw_cache = {}
    total_active, total_actions, total_selector_refs = 0, 0, 0
    counts = {"branchRefsMissing": 0, "orphanBranchObjects": 0, "actionRefsMissing": 0,
              "unrecognizedActionClasses": {}, "rawValidatedSelectorPartJoins": 0,
              "xmlSelectorPartCandidateJoins": 0, "rawValidatedSelectorGsJoins": 0,
              "xmlSelectorGsCandidateJoins": 0, "wbExternalPackages": 0, "wbPackageXmlMissing": 0,
              "rootXmlMissing": 0, "rawHashMismatches": 0,
              "rawFilesMissing": 0, "rawCaptureHashMismatches": 0,
              "decoderRawHashMismatches": 0, "decodedProvisionalRootAssets": 0,
              "progressionAttachmentRecordMissing": 0, "progressionAttachmentRecordAmbiguous": 0,
              "rawValidatedBranchRows": 0, "rawUnresolvedBranchRows": 0,
              "rawAbilityRootListMismatches": 0, "rawPackageImportMismatches": 0,
              "rawWpmSelectorMismatches": 0, "rawGsBindingMismatches": 0,
              "rawValidatedWpmSelectorLists": 0, "rawUnresolvedWpmSelectorLists": 0,
              "rawValidatedGsBindingRoots": 0, "rawUnresolvedGsBindingRoots": 0,
              "rawCatalogFallbackTargetChecks": 0}

    # Build an exact source map for attachment record -> ID hash/progression.
    # Parse only the records needed for branch joins; emit full evidence only
    # for matching branch targets.
    attachment_root = xml_base / "Common/Hardware/Weapons"
    for p in attachment_root.rglob("Attachment_*.xml"):
        raw_xml = p.read_bytes()
        root = ET.fromstring(raw_xml)
        obj = next((x for x in list(root) if x.tag == "Class_a9b2eb87"), None)
        if obj is None:
            continue
        prog = external(text(obj, "Field_157a7d74"))
        ahash = text(obj, "Field_de6f63b3")
        if not prog or "objectGuid" not in prog:
            continue
        route = p.relative_to(xml_base).as_posix()[:-4]
        key = prog["objectGuid"].lower()
        attachment_records.setdefault(key, []).append({
            "path": route, "fileGuid": root.get("Guid"), "objectGuid": obj.get("Guid"),
            "xmlSha256": hashlib.sha256(raw_xml).hexdigest(), "attachmentIdHash": ahash,
            "progression": prog, "category": external(text(obj, "Field_fe77e9a9")),
        })
    for weapon in roster["roots"]:
        wid = weapon["internalId"]
        entries = weapon["roots"]
        ability_info = entries["Ability"]["xmlOverlay"]
        gs_info = entries["GS"]["xmlOverlay"]
        wb_info = entries["WB"]["xmlOverlay"]
        if not all((ability_info, gs_info, wb_info)):
            counts["rootXmlMissing"] += 1
            root_summaries.append({"weapon": wid, "status": "missing-xml-root", "identities": entries})
            continue
        ability_root, ability_hash = read_doc(xml_base, ability_info["path"])
        gs_root, gs_hash = read_doc(xml_base, gs_info["path"])
        wb_root, wb_hash = read_doc(xml_base, wb_info["path"])
        if any(x is None for x in (ability_root, gs_root, wb_root)):
            counts["rootXmlMissing"] += 1
            root_summaries.append({"weapon": wid, "status": "missing-xml-root", "identities": entries})
            continue
        for kind, root, h, info in (("Ability", ability_root, ability_hash, ability_info),
                                    ("GS", gs_root, gs_hash, gs_info), ("WB", wb_root, wb_hash, wb_info)):
            if h != info["sha256"] or root.get("Guid", "").lower() != info["fileGuid"].lower():
                counts["rawHashMismatches"] += 1
            captured = raw_info(args.datamining, build, entries[kind]["rawCapture"])
            expected_raw_hash = entries[kind]["rawCapture"].get("sha256")
            if not captured or not captured.get("sha256"):
                counts["rawFilesMissing"] += 1
            elif captured["sha256"] != expected_raw_hash:
                counts["rawCaptureHashMismatches"] += 1
            decoder = decoder_meta.get(entries[kind]["rawCapture"].get("fileGuid", "").lower())
            if decoder:
                if decoder.get("rawSha256") and decoder["rawSha256"] != expected_raw_hash:
                    counts["decoderRawHashMismatches"] += 1
                if decoder.get("decodeStatus") == "decoded-provisional":
                    counts["decodedProvisionalRootAssets"] += 1
        ability_obj = next((n for n in list(ability_root) if n.tag == "Class_e515b7b8"), None)
        if ability_obj is None:
            root_summaries.append({"weapon": wid, "status": "missing-ability-root-class"})
            continue
        objects = object_by_guid(ability_root)
        action_objects = {k: v for k, v in objects.items() if v.tag == "Class_4ed159fb"}
        branch_objects = {k: v for k, v in objects.items() if v.tag == "Class_74f6b9e4"}
        active_refs = guid_refs(ability_obj, "Field_d7605aab")
        active_guids = [x["objectGuid"] for x in active_refs]
        active = set(active_guids)
        ability_decoder = decoder_meta.get(ability_info["fileGuid"].lower(), {})
        raw_ability_objects = ability_decoder.get("objects", {"byIndex": {}, "byGuid": {}})
        raw_ability_root = raw_ability_objects.get("byGuid", {}).get(ability_obj.get("Guid", "").lower())
        raw_active_guids = []
        if raw_ability_root:
            for item in raw_ability_root.get("Field_d7605aab", []) or []:
                target = raw_ref_target(item, raw_ability_objects)
                raw_active_guids.append(target.get("$guid", "").lower() if target else None)
        raw_ability_root_list_matches = raw_active_guids == active_guids
        if not raw_ability_root_list_matches:
            counts["rawAbilityRootListMismatches"] += 1
        orphan_guids = sorted(set(branch_objects) - active)
        counts["orphanBranchObjects"] += len(orphan_guids)
        branches_for_weapon = []

        # Enumerate every XML structure with the binding field pair, retaining
        # its exact struct tag and parent field path (not just one known tag).
        gs_bindings = xml_gs_bindings(gs_root)
        gs_struct_tag_counts.update(b["structTag"] for b in gs_bindings)
        wb_parts = []
        for member in wb_root.iter("Field_0cd9f20f"):
            for item in list(member):
                raw_text = item.text.strip() if item.text else None
                part_ref = external(raw_text)
                if part_ref and "path" in part_ref and part_ref["path"].rsplit("/", 1)[-1].startswith("WPM_"):
                    counts["wbExternalPackages"] += 1
                    pdoc, phash = package_docs.get(part_ref["path"], (None, None))
                    if pdoc is None:
                        counts["wbPackageXmlMissing"] += 1
                        wb_parts.append({"source": part_ref, "selectorGuids": [], "xmlAvailable": False,
                                         "raw": raw_info(args.datamining, build, part_ref)})
                        continue
                    selectors = [s.text.strip().lower() for x in pdoc.iter("Field_819acc98") for s in list(x) if s.text]
                    package_info = package_raw_cache.get(part_ref["path"])
                    if package_info is None:
                        captured = raw_info(args.datamining, build, part_ref)
                        raw_meta = decoder_meta.get(pdoc.get("Guid", "").lower(), {})
                        raw_object = raw_meta.get("objects", {}).get("byGuid", {}).get(part_ref["objectGuid"].lower())
                        raw_selectors = raw_object.get("Field_819acc98", []) if raw_object else []
                        raw_selectors = [str(x).lower() for x in raw_selectors] if isinstance(raw_selectors, list) else []
                        package_info = {"raw": captured, "decoder": {k: v for k, v in raw_meta.items() if k != "objects"},
                                        "rawSelectors": raw_selectors,
                                        "rawSelectorsMatched": bool(raw_object is not None and raw_meta.get("rawSha256") == (captured or {}).get("sha256") and raw_selectors == selectors)}
                        package_raw_cache[part_ref["path"]] = package_info
                        if package_info["rawSelectorsMatched"]:
                            counts["rawValidatedWpmSelectorLists"] += 1
                        else:
                            counts["rawUnresolvedWpmSelectorLists"] += 1
                            counts["rawWpmSelectorMismatches"] += 1
                    wb_parts.append({"source": part_ref, "sourceXmlSha256": phash, "selectorGuids": selectors,
                                     "rawValidatedSelectorGuids": package_info["rawSelectors"] if package_info["rawSelectorsMatched"] else [],
                                     "xmlOnlySelectorGuidCandidates": selectors if not package_info["rawSelectorsMatched"] else [],
                                     "rawDecodeValidated": package_info["rawSelectorsMatched"],
                                     "decoder": package_info["decoder"], "xmlAvailable": True, "raw": package_info["raw"]})
                elif part_ref and "objectGuid" in part_ref and part_ref["objectGuid"] in objects:
                    pobj = objects[part_ref["objectGuid"]]
                    if pobj.tag == "Class_897c99a7":
                        selectors = [s.text.strip().lower() for x in pobj.iter("Field_819acc98") for s in list(x) if s.text]
                        wb_parts.append({"source": part_ref, "sourceClass": pobj.tag, "selectorGuids": selectors,
                                         "rawDecodeValidated": False, "xmlAvailable": True})
                else:
                    wb_parts.append({"raw": raw_text, "selectorGuids": [], "xmlAvailable": False})

        selector_to_parts = {}
        xml_selector_to_parts = {}
        for part in wb_parts:
            for sg in part.get("selectorGuids", []):
                xml_selector_to_parts.setdefault(sg.lower(), []).append(part.get("source", part.get("raw")))
            if part.get("rawDecodeValidated"):
                for sg in part.get("rawValidatedSelectorGuids", []):
                    selector_to_parts.setdefault(sg.lower(), []).append(part.get("source", part.get("raw")))
        wb_decoder = decoder_meta.get(wb_info["fileGuid"].lower(), {})
        wb_capture_id = wb_decoder.get("captureId")
        wb_raw_imports = imports_by_capture.get(wb_capture_id, set())
        expected_wpm_imports = set()
        for part in wb_parts:
            source = part.get("source") or {}
            if source.get("path") and source.get("objectGuid"):
                target_file_guid = xml_guid_cache.get(source["path"])
                if target_file_guid is None:
                    doc, _ = read_doc(xml_base, source["path"])
                    target_file_guid = doc.get("Guid", "").lower() if doc is not None else None
                    xml_guid_cache[source["path"]] = target_file_guid
                if target_file_guid:
                    expected_wpm_imports.add((target_file_guid, source["objectGuid"].lower()))
        wb_imports_matched = bool(wb_capture_id is not None) and expected_wpm_imports.issubset(wb_raw_imports)
        if not wb_imports_matched:
            counts["rawPackageImportMismatches"] += 1
        gs_by_selector = {}
        raw_gs_by_selector = {}
        gs_decoder = decoder_meta.get(gs_info["fileGuid"].lower(), {})
        raw_gs_list = raw_gs_bindings(gs_decoder.get("objects", {"byIndex": {}}))
        for raw_entry in raw_gs_list:
            b = raw_entry["fields"]
            selector = b.get("Field_6d011165")
            modifier = b.get("Field_2f0e5b83")
            raw_import = modifier.get("$import") if isinstance(modifier, dict) else None
            if isinstance(selector, str):
                raw_gs_by_selector.setdefault(selector.lower(), []).append({"selectorGuid": selector.lower(),
                    "modifierImport": raw_import, "entryIndex": b.get("Field_3f680d24"),
                    "ownerObjectGuid": raw_entry.get("ownerGuid"), "ownerClass": raw_entry.get("ownerClass"),
                    "fieldPath": raw_entry.get("fieldPath")})
        for b in gs_bindings:
            if b["selectorGuid"]:
                gs_by_selector.setdefault(b["selectorGuid"].lower(), []).append(b)
        gs_verified_by_selector = {}
        gs_xml_rows = [b for group in gs_by_selector.values() for b in group]
        gs_raw_row_matches = 0
        used_raw_gs_entries = set()
        unmatched_gs_xml_rows = []
        gs_catalog_fallback_checks = 0
        for b in gs_xml_rows:
            selector = b["selectorGuid"].lower()
            try:
                xml_entry_index = int(b.get("entryIndex"), 0)
            except (TypeError, ValueError):
                xml_entry_index = b.get("entryIndex")
            candidates = [x for x in raw_gs_by_selector.get(selector, [])
                          if id(x) not in used_raw_gs_entries and x.get("entryIndex") == xml_entry_index]
            candidate_checks = [(x, import_matches_xml_or_catalog_target(x.get("modifierImport"), b.get("modifier"),
                xml_base, xml_guid_cache, catalog_guid_by_path, decoder_meta, args.datamining, build))
                for x in candidates]
            gs_catalog_fallback_checks += sum(int(check.get("fallbackUsed", False)) for _, check in candidate_checks)
            raw_matches = [(x, check) for x, check in candidate_checks if check["matched"]]
            if raw_matches:
                raw_entry, target_check = raw_matches[0]
                used_raw_gs_entries.add(id(raw_entry))
                gs_raw_row_matches += 1
                b["rawFieldMatch"] = True
                b["rawMatchOwnerClass"] = raw_entry.get("ownerClass")
                b["rawMatchOwnerObjectGuid"] = raw_entry.get("ownerObjectGuid")
                b["rawMatchFieldPath"] = raw_entry.get("fieldPath")
                b["rawMatchTargetVerification"] = target_check.get("verifiedTarget")
                gs_verified_by_selector.setdefault(selector, []).append(b)
            else:
                b["rawFieldMatch"] = False
                unmatched_gs_xml_rows.append({"structTag": b["structTag"], "parentFieldPath": b["parentFieldPath"],
                    "selectorGuid": selector, "entryIndex": b.get("entryIndex"),
                    "modifier": b.get("modifier"), "rawSameSelectorAndIndexCandidates": len(candidates),
                    "rawCandidateImportStatuses": [check["status"] for _, check in candidate_checks]})
        counts["rawCatalogFallbackTargetChecks"] += gs_catalog_fallback_checks
        raw_only_gs_rows = [x for group in raw_gs_by_selector.values() for x in group if id(x) not in used_raw_gs_entries]
        gs_raw_matched = bool(gs_xml_rows) and gs_raw_row_matches == len(gs_xml_rows) and not raw_only_gs_rows
        if gs_raw_matched:
            counts["rawValidatedGsBindingRoots"] += 1
        else:
            counts["rawUnresolvedGsBindingRoots"] += 1

        for root_branch_index, branch_ref in enumerate(active_refs):
            branch_guid = branch_ref["objectGuid"]
            branch = branch_objects.get(branch_guid)
            if branch is None:
                counts["branchRefsMissing"] += 1
                rows.append({"weapon": wid, "rootBranchIndex": root_branch_index,
                             "branchGuid": branch_guid, "referencedByAbilityRoot": True,
                             "status": "active-branch-reference-missing", "rootRawSha256": entries["Ability"]["rawCapture"]["sha256"]})
                continue
            actions = []
            for ar in guid_refs(branch, "Field_ffba60f0"):
                action = action_row(ar, action_objects)
                if not action["resolved"]:
                    counts["actionRefsMissing"] += 1
                if action.get("actionClass") and action["actionClass"] != "Class_4ed159fb":
                    counts["unrecognizedActionClasses"][action["actionClass"]] = counts["unrecognizedActionClasses"].get(action["actionClass"], 0) + 1
                for sel in action.get("selectors", []):
                    sg = sel["objectGuid"].lower()
                    sel["wbPartMatches"] = selector_to_parts.get(sg, [])
                    sel["gsBindings"] = gs_verified_by_selector.get(sg, [])
                    sel["gsBindingCandidatesXmlOnly"] = [b for b in gs_by_selector.get(sg, []) if b not in gs_verified_by_selector.get(sg, [])]
                    sel["wbPartCandidatesXmlOnly"] = xml_selector_to_parts.get(sg, []) if not selector_to_parts.get(sg) else []
                    if sel["wbPartMatches"]:
                        counts["rawValidatedSelectorPartJoins"] += 1
                    if sel["wbPartCandidatesXmlOnly"]:
                        counts["xmlSelectorPartCandidateJoins"] += 1
                    if sel["gsBindings"]:
                        counts["rawValidatedSelectorGsJoins"] += 1
                    if sel["gsBindingCandidatesXmlOnly"]:
                        counts["xmlSelectorGsCandidateJoins"] += 1
                    total_selector_refs += 1
                actions.append(action)
            total_actions += len(actions)
            branch_field_counts.update(f.tag for f in list(branch))
            progression = external(text(branch, "Field_f86e0433"))
            branch_field_de6 = text(branch, "Field_de6f63b3")
            attach_matches = attachment_records.get(progression.get("objectGuid", "").lower() if progression else "", [])
            if not attach_matches:
                counts["progressionAttachmentRecordMissing"] += 1
            elif len(attach_matches) > 1:
                counts["progressionAttachmentRecordAmbiguous"] += 1
            for match in attach_matches:
                match["raw"] = raw_info(args.datamining, build, {"path": match["path"]})
            kill_switch = branch.find("Field_def7f8dd")
            kill_refs = refs(kill_switch) if kill_switch is not None else []
            fallback_node = kill_switch.find(".//Field_043d7a08") if kill_switch is not None else None
            local_fallback = fallback_node.text.strip() if fallback_node is not None and fallback_node.text else None
            raw_branch = raw_ability_objects.get("byGuid", {}).get(branch_guid)
            raw_validation = {"status": "unresolved", "rootBranchListMatched": raw_ability_root_list_matches,
                              "branchObjectFound": raw_branch is not None, "fields": {}}
            if raw_branch is not None:
                raw_validation["fields"]["progression"] = import_list_matches_xml(
                    raw_import_values(raw_branch.get("Field_f86e0433")),
                    [external(text(branch, "Field_f86e0433"))], xml_base, xml_guid_cache)
                raw_validation["fields"]["slot"] = import_list_matches_xml(
                    raw_import_values(raw_branch.get("Field_64ef48eb")),
                    [external(text(branch, "Field_64ef48eb"))], xml_base, xml_guid_cache)
                raw_validation["fields"]["Field_de6f63b3"] = {"matched": hash32_equal(
                    raw_branch.get("Field_de6f63b3"), branch_field_de6),
                    "raw": raw_branch.get("Field_de6f63b3"), "xml": text(branch, "Field_de6f63b3")}
                raw_kill = raw_branch.get("Field_def7f8dd")
                raw_validation["fields"]["killSwitchImports"] = import_list_matches_xml(
                    raw_import_values(raw_kill), kill_refs, xml_base, xml_guid_cache)
                raw_fallback = raw_kill.get("Field_043d7a08") if isinstance(raw_kill, dict) else None
                raw_validation["fields"]["killSwitchFallback"] = {"matched": str(raw_fallback).lower() == str(local_fallback).lower(),
                    "raw": raw_fallback, "xml": local_fallback}
                raw_action_refs = []
                for action_ref in raw_branch.get("Field_ffba60f0", []) or []:
                    target = raw_ref_target(action_ref, raw_ability_objects)
                    raw_action_refs.append({"objectGuid": target.get("$guid", "").lower() if target else None,
                                            "class": target.get("$class") if target else None})
                xml_actions = guid_refs(branch, "Field_ffba60f0")
                raw_action_refs_expected = [{"objectGuid": a["objectGuid"].lower(), "class": "Class_4ed159fb"} for a in xml_actions]
                raw_validation["fields"]["actionReferences"] = {"matched": raw_action_refs == raw_action_refs_expected,
                    "raw": raw_action_refs, "xml": raw_action_refs_expected}
                raw_unlock_checks = []
                for action in actions:
                    raw_action = raw_ability_objects.get("byGuid", {}).get(action.get("objectGuid", ""))
                    raw_unlocks = raw_import_values(raw_action.get("Field_7e54e22c")) if raw_action else []
                    unlock_check = import_list_matches_xml_or_catalog(raw_unlocks, action.get("selectors", []), xml_base,
                        xml_guid_cache, catalog_guid_by_path, decoder_meta, args.datamining, build)
                    counts["rawCatalogFallbackTargetChecks"] += unlock_check.get("catalogRawFallbackTargetChecks", 0)
                    raw_unlock_checks.append({"actionGuid": action.get("objectGuid"), **unlock_check})
                raw_validation["fields"]["actionUnlockReferences"] = {
                    "matched": len(raw_unlock_checks) == len(actions) and all(x["matched"] for x in raw_unlock_checks),
                    "actions": raw_unlock_checks}
                all_fields_matched = (raw_ability_root_list_matches and all(v.get("matched") for v in raw_validation["fields"].values()))
                raw_validation["status"] = "raw-field-values-matched" if all_fields_matched else "raw-field-mismatch-or-incomplete"
                if all_fields_matched:
                    counts["rawValidatedBranchRows"] += 1
                else:
                    counts["rawUnresolvedBranchRows"] += 1
            else:
                counts["rawUnresolvedBranchRows"] += 1
            row = {
                "weapon": wid,
                "siteIdentity": weapon.get("siteIdentity"),
                "rootBranchIndex": root_branch_index,
                "referencedByAbilityRoot": True,
                "abilityRoot": {"path": ability_info["path"], "fileGuid": ability_info["fileGuid"],
                                "rootObjectGuid": ability_obj.get("Guid"), "rawSha256": entries["Ability"]["rawCapture"]["sha256"],
                                "xmlSha256": ability_hash},
                "branch": {"objectGuid": branch_guid, "class": branch.tag,
                           "fields": {f.tag: (f.text.strip() if f.text else None) for f in list(branch)},
                           "fieldNames": [f.tag for f in list(branch)],
                           "uninterpretedFields": [f.tag for f in list(branch) if f.tag not in {
                               "Field_f86e0433", "Field_64ef48eb", "Field_ffba60f0", "Field_def7f8dd", "Field_de6f63b3"}],
                           "progression": progression,
                           "slot": external(text(branch, "Field_64ef48eb")),
                           "branchField_de6f63b3": branch_field_de6,
                           "progressionLinkedAttachmentRecords": attach_matches,
                           "attachmentRecords": attach_matches,
                           "killSwitch": {"references": kill_refs, "localFallback": local_fallback},
                           "killSwitchBlock": ET.tostring(branch.find("Field_def7f8dd"), encoding="unicode") if branch.find("Field_def7f8dd") is not None else None},
                "actions": actions,
                "rawDecodeValidation": raw_validation,
                "sourceLimits": {"structuralSource": "Frosty XML paired to captured raw file GUID and SHA-256",
                                 "executionClaim": False}
            }
            rows.append(row)
            branches_for_weapon.append(row)
            total_active += 1
        root_summaries.append({"weapon": wid, "status": "censused", "abilityRootBranchReferences": len(active_refs),
                               "branchObjects": len(branch_objects), "orphanBranchGuids": orphan_guids,
                               "rootSources": {kind: {"rawPath": entries[kind]["rawCapture"].get("path"),
                                   "fileGuid": entries[kind]["rawCapture"].get("fileGuid"),
                                   "rootObjectGuid": entries[kind].get("xmlOverlay", {}).get("rootObjectGuid"),
                                   "rawSha256": entries[kind]["rawCapture"].get("sha256"),
                                   "xmlPath": entries[kind].get("xmlOverlay", {}).get("path"),
                                   "xmlSha256": entries[kind].get("xmlOverlay", {}).get("sha256")}
                                   for kind in ("Ability", "GS", "WB")},
                               "actions": sum(len(x["actions"]) for x in branches_for_weapon),
                               "wbPartReferences": [{"path": ref.get("path"),
                                   "fileGuid": (package_docs.get(ref.get("path"), (None, None))[0].get("Guid", "").lower()
                                       if package_docs.get(ref.get("path"), (None, None))[0] is not None else None),
                                   "objectGuid": ref.get("objectGuid"),
                                   "sourceXmlSha256": package_docs.get(ref.get("path"), (None, None))[1],
                                   "selectorCount": len(package_raw_cache.get(ref.get("path"), {}).get("rawSelectors", [])),
                                   "rawDecodeValidated": bool(package_raw_cache.get(ref.get("path"), {}).get("rawSelectorsMatched")),
                                   "rawSha256": (package_raw_cache.get(ref.get("path"), {}).get("raw") or {}).get("sha256")}
                                   for ref in wb_packages_by_weapon.get(wid, [])],
                               "wbRawPackageImportValidation": {"matched": wb_imports_matched,
                                   "expectedWpmImportCount": len(expected_wpm_imports),
                                   "matchedWpmImportCount": len(expected_wpm_imports & wb_raw_imports),
                                   "rawImportCount": len(wb_raw_imports),
                                   "missingWpmImports": sorted(expected_wpm_imports - wb_raw_imports)},
                               "gsRawBindingValidation": {"allFieldShapeEntriesMatched": gs_raw_matched,
                                   "xmlBindingCount": len(gs_xml_rows),
                                   "rawFieldShapeCandidateCount": len(raw_gs_list),
                                   "rawMatchedXmlEntryCount": gs_raw_row_matches,
                                   "unmatchedXmlBindingExamples": unmatched_gs_xml_rows[:5],
                                   "xmlStructTagCounts": dict(Counter(b["structTag"] for b in gs_xml_rows)),
                                   "gsBindingRows": gs_xml_rows,
                                   "rawOnlySelectorGuidCount": len({x["selectorGuid"] for x in raw_only_gs_rows}),
                                   "rawOnlyFieldShapeExamples": [{"path": entries["GS"]["rawCapture"].get("path"),
                                       "ownerClass": x.get("ownerClass"), "ownerObjectGuid": x.get("ownerObjectGuid"),
                                       "fieldPath": x.get("fieldPath"), "selectorGuid": x.get("selectorGuid")}
                                       for x in raw_only_gs_rows[:3]]},
                               "wbSelectorGuidCount": len(selector_to_parts),
                               "gsBindingCount": len(gs_bindings),
                               "gsSelectorGuidCount": len(gs_by_selector),
                               "selectorGuidsWithoutWbPart": sorted({s["objectGuid"].lower() for x in branches_for_weapon for a in x["actions"] for s in a.get("selectors", [])} - set(selector_to_parts)),
                               "selectorGuidsWithoutGsBinding": sorted({s["objectGuid"].lower() for x in branches_for_weapon for a in x["actions"] for s in a.get("selectors", [])} - set(gs_by_selector)),
                               "wbSelectorGuidsWithoutAbilityAction": sorted(set(selector_to_parts) - {s["objectGuid"].lower() for x in branches_for_weapon for a in x["actions"] for s in a.get("selectors", [])}),
                               "gsSelectorGuidsWithoutAbilityAction": sorted(set(gs_by_selector) - {s["objectGuid"].lower() for x in branches_for_weapon for a in x["actions"] for s in a.get("selectors", [])}),
                               "selectorReferenceCount": sum(len(a.get("selectors", [])) for x in branches_for_weapon for a in x["actions"]),
                               "abilityRawSha256": entries["Ability"]["rawCapture"]["sha256"],
                               "abilityXmlSha256": ability_hash,
                               "decoderStatus": {kind: {k: v for k, v in decoder_meta.get(entries[kind]["rawCapture"].get("fileGuid", "").lower(), {}).items() if k != "objects"}
                                                 for kind in ("Ability", "GS", "WB")},
                               "wbRawSha256": entries["WB"]["rawCapture"]["sha256"],
                               "gsRawSha256": entries["GS"]["rawCapture"]["sha256"]})

    args.out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with args.out_jsonl.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    stale_file = build / "xml/xml-overlay-stale.txt"
    stale_paths = {line.strip().removesuffix(".xml") for line in stale_file.read_text(encoding="utf-8").splitlines() if line.strip()}
    source_paths = set()
    def collect_paths(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "path" and isinstance(child, str):
                    source_paths.add(child.removesuffix(".xml"))
                else:
                    collect_paths(child)
        elif isinstance(value, list):
            for child in value:
                collect_paths(child)
    collect_paths(root_summaries)
    collect_paths(rows)
    summary = {"schemaVersion": 1, "build": "1.4.3.0", "roots": root_summaries,
               "counts": {**counts, "referencedBranches": total_active, "actionObjects": total_actions,
                          "selectorReferences": total_selector_refs, "uniqueWbPackageDocs": len(package_docs),
                          "branchFieldFrequency": dict(sorted(branch_field_counts.items())),
                          "gsStructTagFrequency": dict(sorted(gs_struct_tag_counts.items()))},
               "jsonlPath": args.out_jsonl.as_posix(),
               "xmlOverlayStaleEvidence": {"path": "xml/xml-overlay-stale.txt",
                   "sha256": sha256(stale_file), "listedPathCount": len(stale_paths),
                   "examinedDistinctPathCount": len(source_paths),
                   "intersectionCount": len(source_paths & stale_paths)},
               "method": "Ability root Field_d7605aab references were enumerated and joined to Class_74f6b9e4 nodes in each XML overlay. Action references use Field_ffba60f0 and selector objects use Field_7e54e22c; targets without XML are resolved only through matching catalog file GUID/object GUID plus a captured raw object whose hash matches the ledger. WB package selectors use Field_819acc98 in per-weapon Field_0cd9f20f parts. GS census includes every XML Struct_* node with both Field_6d011165 and Field_2f0e5b83, retaining struct tag and parent field path; raw field-shape entries are matched one-to-one by selector GUID, entry index, and modifier import. All raw roots are tied to roster-recorded capture paths/hashes; XML file GUIDs and XML hashes are emitted. The pass records structure only. Branch fields with known meanings are listed per row; every other field name and raw value is retained as uninterpreted.",
               "knownLimits": ["Any layout warnings or unsupported fields remain provisional; raw hash equality does not prove decoder semantics.",
                              "External package targets without XML remain captured or missing but cannot be selector-joined structurally.",
                              "Source branch presence and selector joins do not establish runtime activation or multiplayer availability."],
               "rosterJsonSha256": sha256(args.roster), "branchScriptSha256": sha256(Path(__file__).resolve()),
               "jsonlSha256": sha256(args.out_jsonl)}
    args.out_summary.parent.mkdir(parents=True, exist_ok=True)
    args.out_summary.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"roots={len(root_summaries)} branch_rows={len(rows)} referenced={total_active} actions={total_actions} selector_refs={total_selector_refs} raw/xml hash issues={counts['rawHashMismatches']}")


if __name__ == "__main__":
    main()
