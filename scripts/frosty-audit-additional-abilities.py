"""Raw-first census of non-primary Class_e515b7b8 weapon ability roots.

This reads the current decoded raw ledger and independently hashes captured
root EBX files. It records source references only; it does not infer weapon
parentage or multiplayer/runtime inclusion from asset names.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sqlite3


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def imports(value, path=""):
    found = []
    if isinstance(value, dict):
        if isinstance(value.get("$import"), dict):
            found.append({"fieldPath": path, **value["$import"]})
        else:
            for key, child in value.items():
                if not key.startswith("$"):
                    found.extend(imports(child, f"{path}/{key}" if path else key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(imports(child, f"{path}/member{index}"))
    return found


def find_import_calls(value, target_pair, path=""):
    found = []
    if isinstance(value, dict):
        imp = value.get("$import")
        if isinstance(imp, dict) and (imp.get("fileGuid", "").lower(), imp.get("classGuid", "").lower()) == target_pair:
            found.append({"fieldPath": path, "rawImport": imp})
        else:
            for key, child in value.items():
                if not key.startswith("$"):
                    found.extend(find_import_calls(child, target_pair,
                        f"{path}/{key}" if path else key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_import_calls(child, target_pair, f"{path}/member{index}"))
    return found


def ref_target(value, by_index):
    if isinstance(value, dict) and "$ref" in value:
        return by_index.get(value["$ref"])
    return None


def find_raw_files(build, route):
    roots = [
        (build / "capture/collection/raw", "collection"),
        (build / "capture/collection-dependencies/raw", "collection-dependencies"),
        (build / "capture/collection-review-2026-09-16/raw", "collection-review-2026-09-16"),
        (build / "capture/weapon-audit-2026-09-23/raw", "weapon-audit-2026-09-23"),
        (build / "capture/weapon-related-audit-2026-09-23/raw", "weapon-related-audit-2026-09-23"),
    ]
    results = []
    for root, label in roots:
        path = root / (route + ".ebx")
        if path.is_file():
            results.append({"capture": label, "path": path.as_posix(), "bytes": path.stat().st_size,
                            "sha256": sha256(path)})
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--datamining", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--primary-roster", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    build = args.datamining / "builds/1.4.3.0"
    primary = json.loads(args.primary_roster.read_text(encoding="utf-8"))
    primary_by_file = {}
    for weapon in primary["roots"]:
        for kind in ("Ability", "GS", "WB"):
            root = weapon["roots"][kind]["rawCapture"]
            primary_by_file[root["fileGuid"].lower()] = {"weapon": weapon["internalId"], "kind": kind,
                "path": root["path"], "fileGuid": root["fileGuid"], "rawSha256": root["sha256"]}

    conn = sqlite3.connect(f"file:{args.ledger.resolve().as_posix()}?mode=ro", uri=True, timeout=0.5)
    try:
        root_rows = conn.execute(
            "select distinct c.id,a.route,a.file_guid,c.decode_status,c.raw_sha256,c.object_count,c.warnings_json "
            "from objects o join captures c on c.id=o.capture_id join assets a on a.route=c.route "
            "where o.class_name='Class_e515b7b8' order by a.route,c.id").fetchall()
        roots = []
        capture_ids = [r[0] for r in root_rows]
        if capture_ids:
            marks = ",".join("?" for _ in capture_ids)
            object_rows = conn.execute(
                f"select capture_id,object_index,object_guid,class_name,body_json from objects where capture_id in ({marks})",
                capture_ids).fetchall()
        else:
            object_rows = []
        bodies_by_capture = {}
        for cid, oi, og, cls, body in object_rows:
            parsed = json.loads(body) if body else {}
            state = bodies_by_capture.setdefault(cid, {"byIndex": {}, "byGuid": {}, "classes": []})
            state["byIndex"][oi] = parsed
            if og:
                state["byGuid"][og.lower()] = parsed
            state["classes"].append({"objectIndex": oi, "objectGuid": og, "class": cls})
        primary_wbgs_capture_ids = {}
        for weapon in primary["roots"]:
            for kind in ("GS", "WB"):
                raw = weapon["roots"][kind]["rawCapture"]
                row = conn.execute("select id from captures where route=? and raw_sha256=?",
                                   (raw["path"], raw["sha256"])).fetchone()
                if row:
                    primary_wbgs_capture_ids[row[0]] = {"weapon": weapon["internalId"], "kind": kind,
                        "path": raw["path"], "fileGuid": raw["fileGuid"], "rawSha256": raw["sha256"]}
        primary_wbgs_imports = []
        if primary_wbgs_capture_ids:
            pids = sorted(primary_wbgs_capture_ids)
            pm = ",".join("?" for _ in pids)
            for primary_capture, target_file, target_object in conn.execute(
                    f"select capture_id,target_file_guid,target_object_guid from imports where capture_id in ({pm})",
                    pids).fetchall():
                primary_wbgs_imports.append({**primary_wbgs_capture_ids[primary_capture],
                    "targetFileGuid": target_file.lower(), "targetObjectGuid": target_object.lower()})
        catalog_by_guid = {fg.lower(): route for fg, route in conn.execute("select file_guid,route from assets").fetchall()}
    finally:
        conn.close()

    for cid, route, file_guid, decode_status, raw_sha, object_count, warnings_json in root_rows:
        if file_guid.lower() in primary_by_file:
            continue
        state = bodies_by_capture.get(cid, {"byIndex": {}, "byGuid": {}, "classes": []})
        roots_found = [body for body in state["byGuid"].values() if body.get("$class") == "Class_e515b7b8"]
        ability_root = roots_found[0] if roots_found else None
        branch_refs = (ability_root or {}).get("Field_d7605aab", []) or []
        branch_rows = []
        for index, ref in enumerate(branch_refs):
            body = ref_target(ref, state["byIndex"])
            if body is None:
                branch_rows.append({"index": index, "status": "unresolved-internal-reference", "rawRef": ref})
                continue
            action_refs = body.get("Field_ffba60f0", []) or []
            actions = []
            for action_index, action_ref in enumerate(action_refs):
                action_body = ref_target(action_ref, state["byIndex"])
                actions.append({"index": action_index, "ref": action_ref,
                    "class": action_body.get("$class") if action_body else None,
                    "objectGuid": action_body.get("$guid") if action_body else None,
                    "selectorImports": imports(action_body.get("Field_7e54e22c"), "Field_7e54e22c") if action_body else []})
            branch_rows.append({"index": index, "objectGuid": body.get("$guid"), "class": body.get("$class"),
                                "fields": sorted(k for k in body if not k.startswith("$")),
                                "actionRefs": len(action_refs), "actions": actions,
                                "imports": imports(body)})
        root_imports = imports(ability_root) if ability_root else []
        source_imports = []
        for ref in root_imports:
            target_path = catalog_by_guid.get(ref["fileGuid"].lower())
            target = {**ref, "catalogPath": target_path}
            primary_target = primary_by_file.get(ref["fileGuid"].lower())
            if primary_target:
                target["primaryRootLink"] = primary_target
            source_imports.append(target)
        direct_primary_links = [x["primaryRootLink"] for x in source_imports if x.get("primaryRootLink")]
        incoming_primary_wbgs_refs = [x for x in primary_wbgs_imports
            if x["targetFileGuid"] == file_guid.lower() and
            x["targetObjectGuid"] == (ability_root.get("$guid", "").lower() if ability_root else "")]
        raw_files = find_raw_files(build, route)
        roots.append({"route": route, "fileGuid": file_guid, "rootObjectGuid": ability_root.get("$guid") if ability_root else None,
            "rawLedger": {"captureId": cid, "decodeStatus": decode_status, "rawSha256": raw_sha,
                          "objectCount": object_count, "warnings": json.loads(warnings_json) if warnings_json else None},
            "rawFiles": raw_files, "rawFileHashMatchesLedger": any(x["sha256"] == raw_sha for x in raw_files),
            "isPrimaryRosterRoot": False, "rootField_d7605aabReferenceCount": len(branch_refs),
            "referencedBranches": branch_rows, "captureObjectClasses": state["classes"],
            "rootExternalImports": source_imports, "directPrimaryRootLinks": direct_primary_links,
            "incomingPrimaryWBGSReferences": incoming_primary_wbgs_refs,
            "rootBodyFields": sorted(k for k in ability_root if not k.startswith("$")) if ability_root else [],
            "layoutAmbiguous": bool(ability_root and ability_root.get("$layoutAmbiguous")),
            "sourceLimits": ["Asset route/name is not parent-weapon or multiplayer proof.",
                             "Empty branch-reference arrays do not establish runtime availability."]})

    # Query the indexed reference table for every exact additional-root identity,
    # regardless of the caller's class. Materialize this small candidate set and
    # only then fetch decoded bodies for those caller captures.
    target_pairs = {(r["fileGuid"].lower(), (r["rootObjectGuid"] or "").lower()): r for r in roots
                    if r["rootObjectGuid"]}
    target_files = sorted({file_guid for file_guid, _ in target_pairs})
    incoming_rows = []
    caller_bodies = []
    caller_meta = {}
    if target_files:
        conn = sqlite3.connect(f"file:{args.ledger.resolve().as_posix()}?mode=ro", uri=True, timeout=0.5)
        try:
            marks = ",".join("?" for _ in target_files)
            incoming_rows = conn.execute(
                f"select capture_id,ordinal,target_file_guid,target_object_guid from imports where lower(target_file_guid) in ({marks})",
                target_files).fetchall()
            candidate_ids = sorted({row[0] for row in incoming_rows})
            if candidate_ids:
                cm = ",".join("?" for _ in candidate_ids)
                caller_meta = {row[0]: {"route": row[1], "rawSha256": row[2], "decodeStatus": row[3]}
                    for row in conn.execute(
                        f"select id,route,raw_sha256,decode_status from captures where id in ({cm})",
                        candidate_ids).fetchall()}
                caller_bodies = conn.execute(
                    f"select capture_id,object_index,object_guid,class_name,body_json from objects where capture_id in ({cm})",
                    candidate_ids).fetchall()
        finally:
            conn.close()
    incoming_index = Counter((cid, fg.lower(), og.lower()) for cid, _ord, fg, og in incoming_rows)
    body_callers = []
    for cid, oi, og, cls, body_json in caller_bodies:
        body = json.loads(body_json) if body_json else {}
        for pair, root in target_pairs.items():
            for call in find_import_calls(body, pair):
                body_callers.append({"callerRoute": caller_meta.get(cid, {}).get("route"),
                    "callerCaptureId": cid, "callerCaptureSha256": caller_meta.get(cid, {}).get("rawSha256"),
                    "callerDecodeStatus": caller_meta.get(cid, {}).get("decodeStatus"),
                    "callerObjectIndex": oi, "callerObjectGuid": og, "callerObjectClass": cls,
                    "fieldPath": call["fieldPath"], "targetFileGuid": pair[0],
                    "targetObjectGuid": pair[1], "targetRoute": root["route"],
                    "indexHasExactPair": bool(incoming_index[(cid, pair[0], pair[1])]),
                    "indexPairOccurrences": incoming_index[(cid, pair[0], pair[1])],
                    "rawImport": call["rawImport"]})
    body_pair_keys = {(x["callerCaptureId"], x["targetFileGuid"], x["targetObjectGuid"]) for x in body_callers}
    indexed_pair_keys = {(cid, fg.lower(), og.lower()) for cid, _ord, fg, og in incoming_rows}
    index_only_pairs = sorted(indexed_pair_keys - body_pair_keys)
    body_only_pairs = sorted(body_pair_keys - indexed_pair_keys)
    incoming_by_root = {}
    for root in roots:
        pair = (root["fileGuid"].lower(), (root["rootObjectGuid"] or "").lower())
        rows = [x for x in body_callers if (x["targetFileGuid"], x["targetObjectGuid"]) == pair]
        checked = []
        for row in rows:
            raw_files = find_raw_files(build, row["callerRoute"])
            row["callerRawFiles"] = raw_files
            row["callerRawHashMatchesLedger"] = any(x["sha256"] == row["callerCaptureSha256"] for x in raw_files)
            checked.append(row)
        root["incomingCapturedReferencesAnySource"] = checked
        incoming_by_root[pair] = checked

    counts = Counter()
    class_frequency = Counter()
    for root in roots:
        counts["roots"] += 1
        counts["rootsWithRawFileHashMatch"] += int(root["rawFileHashMatchesLedger"])
        counts["rootsWithLayoutAmbiguous"] += int(root["layoutAmbiguous"])
        counts["rootsWithDirectPrimaryRootLinks"] += int(bool(root["directPrimaryRootLinks"]))
        counts["rootsWithIncomingPrimaryWBGSReferences"] += int(bool(root["incomingPrimaryWBGSReferences"]))
        counts["rootsWithIncomingCapturedReferencesAnySource"] = counts.get("rootsWithIncomingCapturedReferencesAnySource", 0) + int(bool(root["incomingCapturedReferencesAnySource"]))
        counts["incomingCapturedReferenceOccurrencesAnySource"] = counts.get("incomingCapturedReferenceOccurrencesAnySource", 0) + len(root["incomingCapturedReferencesAnySource"])
        counts["rootBranchReferences"] += root["rootField_d7605aabReferenceCount"]
        counts["rootsWithNonemptyBranchReferences"] += int(root["rootField_d7605aabReferenceCount"] > 0)
        counts["rootsWithEmptyBranchReferenceField"] += int(root["rootField_d7605aabReferenceCount"] == 0)
        counts["branchObjects"] += len(root["referencedBranches"])
        counts["actionReferences"] += sum(b.get("actionRefs", 0) for b in root["referencedBranches"])
        class_frequency.update(x["class"] for x in root["captureObjectClasses"])
    counts["capturedClass_74f6b9e4BranchObjects"] = class_frequency["Class_74f6b9e4"]
    counts["capturedClass_4ed159fbActionObjects"] = class_frequency["Class_4ed159fb"]
    payload = {"schemaVersion": 1, "status": "draft", "build": "1.4.3.0",
        "primaryRosterPath": args.primary_roster.as_posix(),
        "primaryRosterSha256": sha256(args.primary_roster),
        "ledgerPath": args.ledger.as_posix(),
        "censusScriptSha256": sha256(Path(__file__).resolve()),
        "additionalAbilityRoots": roots,
        "counts": dict(counts),
        "capturedObjectClassFrequency": dict(sorted(class_frequency.items())),
        "incomingReferenceIndexAudit": {"candidateIndexOccurrencesByTargetFileGuid": len(incoming_rows),
            "exactDecodedBodyReferenceOccurrences": len(body_callers),
            "indexOnlyCapturePairCount": len(index_only_pairs), "bodyOnlyCapturePairCount": len(body_only_pairs),
            "indexOnlyCapturePairs": [{"captureId": cid, "targetFileGuid": fg, "targetObjectGuid": og}
                for cid, fg, og in index_only_pairs],
            "bodyOnlyCapturePairs": [{"captureId": cid, "targetFileGuid": fg, "targetObjectGuid": og}
                for cid, fg, og in body_only_pairs]},
        "method": "Current raw-ledger Class_e515b7b8 capture rows were enumerated, excluding only file GUIDs in the primary 64-root roster. Field_d7605aab references were resolved through the same capture's decoded object index; referenced branch action fields and root imports were retained. Direct primary weapon-root associations are emitted only on exact file-GUID references to a primary Ability/GS/WB root.",
        "limits": ["The current v1 ledger decodes many roots as provisional and may carry layout warnings.",
                   "No parent weapon, multiplayer, active mode, or runtime claim is inferred from names.",
                   "Incoming refs are exact decoded imports to the root file/object identity from captured objects only; no captured incoming ref does not mean unused globally.",
                   "No parent weapon, multiplayer, or runtime claim is inferred from an incoming reference alone."]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"additional_roots={len(roots)} branch_refs={counts['rootBranchReferences']} nonempty={counts['rootsWithNonemptyBranchReferences']} actions={counts['actionReferences']} rawhash={counts['rootsWithRawFileHashMatch']}")


if __name__ == "__main__":
    main()
