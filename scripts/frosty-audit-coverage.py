"""Catalog-wide research ledger. Decoding never marks an asset fully reviewed.

The SQLite ledger belongs in the external build reports directory. It keeps source
variants, exact object bodies and reference locations for reproducible queries.
No game access or production writes. init refuses to replace an existing ledger;
scan/decode resume only the unfinished rows of the same catalog/decoder identity.
"""
import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import runpy
import sqlite3


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def walk(value, path=""):
    if isinstance(value, dict):
        yield path, value
        for key, child in value.items():
            yield from walk(child, path + "/" + key.replace("~", "~0").replace("/", "~1"))
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from walk(child, path + "/" + str(i))


def expand_candidates(db):
    # Rebuild dependency membership from namespace seeds. Reviewed exclusions
    # stop traversal; a shared target can still be reached by another candidate.
    db.execute("UPDATE assets SET scope='unclassified' WHERE scope='weapon-dependency-candidate'")
    db.execute("""WITH RECURSIVE reachable(guid) AS (
        SELECT file_guid FROM assets
          WHERE scope IN ('weapon-namespace-candidate','additional-namespace-candidate')
        UNION SELECT target.file_guid FROM reachable r
          JOIN assets a ON a.file_guid=r.guid
          JOIN captures c ON c.route=a.route JOIN imports i ON i.capture_id=c.id
          JOIN assets target ON target.file_guid=i.target_file_guid
          WHERE target.scope NOT LIKE 'excluded-%')
        UPDATE assets SET scope='weapon-dependency-candidate'
        WHERE scope='unclassified' AND file_guid IN (SELECT guid FROM reachable)""")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("action", choices=["init", "scan", "decode", "scope", "summary"])
    ap.add_argument("--build", required=True, type=pathlib.Path)
    ap.add_argument("--db", required=True, type=pathlib.Path)
    ap.add_argument("--decoder", type=pathlib.Path, help="Pinned reader snapshot; defaults to the shared reader")
    ap.add_argument("--tool-change-note", help="Required to resume mutations after this research tool changes")
    ap.add_argument("--scope-validation", type=pathlib.Path,
                    help="Parent-validated cosmetic census receipt; scope action only")
    ap.add_argument("--hotfix-dir", action="append", default=[])
    ap.add_argument("--collection-dir", action="append", default=[],
                    help="Additional collector folder with asset-catalog.json and raw-status.jsonl")
    ap.add_argument("--seed-prefix", action="append", default=[])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--route", action="append", default=[], help="Limit decoding to exact catalog routes")
    ap.add_argument("--retry-bounded", action="store_true", help="Retry explicit size/object-limit rows with revised limits")
    ap.add_argument("--max-decode-bytes", type=int, default=2 * 1024 * 1024)
    ap.add_argument("--max-objects", type=int, default=10000)
    args = ap.parse_args()
    build = args.build.resolve()
    repo = pathlib.Path(__file__).resolve().parent.parent
    catalog_path = build / "capture/collection/asset-catalog.json"
    decoder_path = (args.decoder or repo / "scripts/frosty-ebx-decode.py").resolve()
    if args.action == "init":
        if args.db.exists():
            ap.error("Refusing to replace an existing ledger")
        args.db.parent.mkdir(parents=True, exist_ok=True)
    elif not args.db.exists():
        ap.error("Initialize the ledger first")
    db = sqlite3.connect(args.db, timeout=30)
    db.row_factory = sqlite3.Row
    if args.action == "init":
        db.executescript("""
        CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE assets(route TEXT PRIMARY KEY,route_key TEXT UNIQUE,file_guid TEXT UNIQUE,
          catalog_sha1 TEXT,catalog_type TEXT,original_bytes INTEGER,scope TEXT NOT NULL,
          review_status TEXT NOT NULL,prior_finding_count INTEGER NOT NULL);
        CREATE TABLE captures(id INTEGER PRIMARY KEY,route TEXT NOT NULL,raw_path TEXT UNIQUE,
          head INTEGER,descriptor_path TEXT,descriptor_sha256 TEXT,raw_sha256 TEXT,
          header_status TEXT NOT NULL,decode_status TEXT NOT NULL,error TEXT,
          object_count INTEGER,root_class TEXT,warnings_json TEXT,decoder_sha256 TEXT);
        CREATE TABLE imports(capture_id INTEGER,ordinal INTEGER,target_file_guid TEXT,
          target_object_guid TEXT,PRIMARY KEY(capture_id,ordinal));
        CREATE TABLE objects(capture_id INTEGER,object_index INTEGER,object_guid TEXT,
          class_name TEXT,absolute_offset INTEGER,body_json TEXT,
          PRIMARY KEY(capture_id,object_index));
        CREATE TABLE refs(capture_id INTEGER,object_index INTEGER,pointer TEXT,
          kind TEXT,target TEXT,target_object_guid TEXT);
        CREATE TABLE reviews(route TEXT,evidence_path TEXT,evidence_pointer TEXT,
          disposition TEXT,scope_of_review TEXT,blocker TEXT,revisit_when TEXT);
        CREATE INDEX imports_target ON imports(target_file_guid);
        CREATE INDEX captures_route ON captures(route);
        CREATE INDEX objects_guid ON objects(object_guid);
        CREATE INDEX objects_class ON objects(class_name);
        CREATE INDEX refs_target ON refs(target);
        CREATE INDEX refs_capture ON refs(capture_id);
        """)
        cat = json.loads(catalog_path.read_text(encoding="utf-8-sig"))
        findings_path = repo / "reference-data/frosty/asset-findings.json"
        findings = json.loads(findings_path.read_text(encoding="utf-8-sig"))
        old = {k.lower(): v for k, v in findings["assets"].items()}
        meta = {"schemaVersion": 1, "buildRoot": str(build), "catalogPath": str(catalog_path),
                "catalogSha256": sha(catalog_path), "catalogHead": cat["gameHead"],
                "decoderSha256": sha(decoder_path), "findingsAtInitSha256": sha(findings_path),
                "scriptAtInitSha256": sha(pathlib.Path(__file__)),
                "policy": "All catalog entries retained. Namespace seeds and dependency reachability are candidates, not MP activation proof. No automatic cosmetic/mode exclusions. Prior findings are narrow evidence, not whole-asset review. Decoded bodies retain hashes and warning markers; no native semantics inferred."}
        db.executemany("INSERT INTO metadata VALUES(?,?)", [(k, dump(v)) for k, v in meta.items()])
        db.executemany("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?)", [
            (a["path"], a["path"].lower(), a["guid"], a.get("sha1"), a.get("type"),
             a.get("originalBytes"), "weapon-namespace-candidate" if a["path"].lower().startswith("common/hardware/weapons/") else "unclassified",
             "pending", len(old.get(a["path"].lower(), {}).get("findings", []))) for a in cat["assets"]])
        for a in cat["assets"]:
            for f in old.get(a["path"].lower(), {}).get("findings", []):
                for e in f["evidence"]:
                    db.execute("INSERT INTO reviews VALUES(?,?,?,?,?,?,?)", (a["path"],
                        findings["evidence"][e["source"]]["path"], e.get("pointer"),
                        "prior-field-specific:" + f["result"], f["question"],
                        f.get("conclusion"), dump(f.get("revisitWhen", []))))
        db.commit()
    meta = {r["key"]: json.loads(r["value"]) for r in db.execute("SELECT * FROM metadata")}
    assert meta["catalogSha256"] == sha(catalog_path), "Catalog changed; use a new ledger"
    assert meta["decoderSha256"] == sha(decoder_path), "Decoder changed; use a new ledger"
    assert meta["buildRoot"] == str(build), "Wrong build root"
    if args.action != "summary" and "decoder_sha256" not in {r[1] for r in db.execute("PRAGMA table_info(captures)")}:
        db.execute("ALTER TABLE captures ADD COLUMN decoder_sha256 TEXT")
        db.execute("UPDATE captures SET decoder_sha256=? WHERE decode_status LIKE 'decoded%'", (meta["decoderSha256"],))
    tool_sha = sha(pathlib.Path(__file__))
    if args.action != "summary":
        previous_tool = meta.get("lastToolSha256", meta["scriptAtInitSha256"])
        if tool_sha != previous_tool and not args.tool_change_note:
            ap.error("Research tool changed; review the change and supply --tool-change-note before resuming")
        db.execute("CREATE INDEX IF NOT EXISTS refs_capture ON refs(capture_id)")
        db.execute("INSERT OR REPLACE INTO metadata VALUES('lastToolSha256',?)", (dump(tool_sha),))
        stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        run = {"action": args.action, "toolSha256": tool_sha, "decoderSha256": sha(decoder_path),
               "hotfixDirs": args.hotfix_dir, "collectionDirs": args.collection_dir,
               "seedPrefixes": args.seed_prefix, "routes": args.route, "limit": args.limit,
               "retryBounded": args.retry_bounded, "maxDecodeBytes": args.max_decode_bytes,
               "maxObjects": args.max_objects, "toolChangeNote": args.tool_change_note}
        db.execute("INSERT INTO metadata VALUES(?,?)", ("runStarted:" + stamp, dump(run)))
        db.commit()
    for prefix in args.seed_prefix:
        db.execute("UPDATE assets SET scope='additional-namespace-candidate' WHERE scope='unclassified' AND substr(route_key,1,?)=?", (len(prefix), prefix.lower()))
    if args.action == "scope":
        if not args.scope_validation:
            ap.error("scope requires --scope-validation")
        validation = json.loads(args.scope_validation.read_text(encoding="utf-8"))
        assert validation["decoderSha256"] == meta["decoderSha256"]
        report_path = repo / validation["reviewedReport"]["path"]
        assert sha(report_path) == validation["reviewedReport"]["sha256"]
        detail_path = pathlib.Path(validation["details"]["path"])
        assert sha(detail_path) == validation["details"]["sha256"]
        def scope_rows():
            with detail_path.open(encoding="utf-8") as stream:
                for line in stream:
                    yield json.loads(line)
        routes, dispositions = set(), collections.Counter()
        for row in scope_rows():
            route_key = row["route"].lower()
            assert route_key not in routes
            routes.add(route_key)
            dispositions[row["disposition"]] += 1
        assert len(routes) == validation["assetsChecked"]
        assert dict(dispositions) == validation["dispositions"]
        for n, row in enumerate(scope_rows(), 1):
            asset = db.execute("SELECT * FROM assets WHERE route_key=?", (row["route"].lower(),)).fetchone()
            assert asset is not None and asset["file_guid"] == row["fileGuid"]
            assert db.execute("SELECT 1 FROM captures WHERE route=? AND raw_sha256=?",
                              (asset["route"], row["evidence"]["rawSha256"])).fetchone()
            disposition = row["disposition"]
            assert disposition in ("excluded-cosmetic", "unresolved-role")
            if disposition == "excluded-cosmetic":
                assert asset["scope"] in ("weapon-namespace-candidate", "additional-namespace-candidate",
                                          "weapon-dependency-candidate", "excluded-cosmetic")
                db.execute("UPDATE assets SET scope=?,review_status=? WHERE route=?",
                           (disposition, disposition, asset["route"]))
            pointer = "line:" + str(n)
            if not db.execute("SELECT 1 FROM reviews WHERE route=? AND evidence_path=? AND evidence_pointer=?",
                              (asset["route"], str(detail_path), pointer)).fetchone():
                db.execute("INSERT INTO reviews VALUES(?,?,?,?,?,?,?)", (asset["route"], str(detail_path), pointer,
                           disposition, "Cosmetic role only: " + row["ruleId"], row["evidence"].get("blocker"),
                           "Changed raw/assignment evidence or an independently functional role"))
        db.execute("INSERT OR REPLACE INTO metadata VALUES(?,?)", ("scopeReview:" + sha(args.scope_validation),
                   dump({"validationPath": str(args.scope_validation.resolve()),
                         "validationSha256": sha(args.scope_validation), "detailsSha256": sha(detail_path),
                         "dispositions": validation["dispositions"], "toolSha256": tool_sha})))
        expand_candidates(db)
    if args.action == "scan":
        release = build / "capture/toolchain/SharedTypeDescriptors.ebx"
        hotfix = build / "capture/toolchain/SharedTypeDescriptors-hotfix-2026-09-16.ebx"
        release_sha, hotfix_sha = sha(release), sha(hotfix)
        for folder in ["collection", "collection-dependencies", "collection-review-2026-09-16"]:
            root = build / "capture" / folder / "raw"
            for p in root.rglob("*.ebx"):
                key = p.relative_to(root).as_posix()[:-4].lower()
                row = db.execute("SELECT route FROM assets WHERE route_key=?", (key,)).fetchone()
                if not row:
                    raise ValueError("Raw route absent from catalog: " + key)
                db.execute("INSERT OR IGNORE INTO captures(route,raw_path,head,descriptor_path,descriptor_sha256,header_status,decode_status) VALUES(?,?,?,?,?,'pending','pending')",
                           (row["route"], str(p.resolve()), 4892017, str(release), release_sha))
        for folder in args.hotfix_dir:
            root = (build / "capture" / folder).resolve()
            assert root.parent == (build / "capture").resolve(), "Expected direct capture folder"
            entries = json.loads((root / "raw-assets.json").read_text(encoding="utf-8-sig"))
            if isinstance(entries, dict):
                entries = [entries]
            for entry in entries:
                p = root / entry["file"]
                assert sha(p) == entry["sha256"], str(p)
                row = db.execute("SELECT route FROM assets WHERE route_key=?", (entry["route"].lower(),)).fetchone()
                assert row is not None, entry["route"]
                db.execute("INSERT OR IGNORE INTO captures(route,raw_path,head,descriptor_path,descriptor_sha256,header_status,decode_status) VALUES(?,?,?,?,?,'pending','pending')",
                           (row["route"], str(p), 4892087, str(hotfix), hotfix_sha))
        clients = json.loads((build / "BUILD.json").read_text(encoding="utf-8-sig"))["clients"]
        for folder in args.collection_dir:
            root = (build / "capture" / folder).resolve()
            assert root.parent == (build / "capture").resolve(), "Expected direct capture folder"
            cp, sp = root / "asset-catalog.json", root / "raw-status.jsonl"
            cat = json.loads(cp.read_text(encoding="utf-8-sig"))
            client = next(c for c in clients if c["frostyArchiveHead"] == cat["gameHead"])
            descriptor = build / client["descriptorsFile"]
            assert sha(descriptor) == client["descriptorsSha256"]
            current_guids = {a["path"].lower(): a["guid"] for a in cat["assets"]}
            with sp.open(encoding="utf-8-sig") as src:
                for line in src:
                    entry = json.loads(line)
                    if entry["status"] != "success":
                        continue
                    row = db.execute("SELECT route,file_guid FROM assets WHERE route_key=?", (entry["path"].lower(),)).fetchone()
                    assert row is not None and row["file_guid"] == current_guids[entry["path"].lower()]
                    p = (root / entry["file"]).resolve()
                    assert p.is_relative_to(root), "Capture path escapes source folder"
                    db.execute("INSERT OR IGNORE INTO captures(route,raw_path,head,descriptor_path,descriptor_sha256,raw_sha256,header_status,decode_status) VALUES(?,?,?,?,?,?,'pending','pending')",
                               (row["route"], str(p), cat["gameHead"], str(descriptor), client["descriptorsSha256"], entry["sha256"]))
            db.execute("INSERT OR REPLACE INTO metadata VALUES(?,?)", ("collection:" + folder,
                       dump({"head": cat["gameHead"], "catalogSha256": sha(cp), "statusSha256": sha(sp)})))
        db.commit()
    if args.action in ["scan", "decode"]:
        dec = runpy.run_path(str(decoder_path))
        types = {}
        if args.action == "scan":
            rows = list(db.execute("SELECT * FROM captures WHERE header_status='pending'"))
        else:
            statuses = ["pending", "needs-bounded-reader"] if args.retry_bounded else ["pending"]
            query = "SELECT c.* FROM captures c JOIN assets a ON c.route=a.route WHERE c.header_status='ok' AND a.scope LIKE '%-candidate' AND c.decode_status IN (" + ",".join("?" for _ in statuses) + ")"
            values = list(statuses)
            if args.route:
                query += " AND a.route_key IN (" + ",".join("?" for _ in args.route) + ")"
                values.extend(r.lower() for r in args.route)
            query += " ORDER BY CASE WHEN a.scope='weapon-namespace-candidate' THEN 0 ELSE 1 END,c.route,c.id"
            rows = list(db.execute(query, values))
        if args.limit:
            rows = rows[:args.limit]
        for n, row in enumerate(rows, 1):
            p = pathlib.Path(row["raw_path"])
            try:
                if p.stat().st_size > 64 * 1024 * 1024:
                    db.execute("UPDATE captures SET header_status='needs-bounded-reader',error='Header scan exceeds 64 MiB safety bound' WHERE id=?", (row["id"],))
                    continue
                if row["descriptor_path"] not in types:
                    td = dec["type_descriptors"](row["descriptor_path"])
                    assert td["sha256"] == row["descriptor_sha256"]
                    types[row["descriptor_path"]] = td
                ebx = dec["Ebx"](p, types[row["descriptor_path"]])
                expected = db.execute("SELECT file_guid FROM assets WHERE route=?", (row["route"],)).fetchone()[0]
                assert dec["_guid"](ebx.file_guid) == expected, "File GUID mismatch"
                if args.action == "scan":
                    if row["raw_sha256"] is not None:
                        assert ebx.sha256 == row["raw_sha256"], "Collector raw hash mismatch"
                    db.executemany("INSERT INTO imports VALUES(?,?,?,?)", [(row["id"], i, dec["_guid"](bytes.fromhex(f)), dec["_guid"](o)) for i, (f, o) in enumerate(ebx.imports)])
                    root = ebx.class_by_key(ebx.class_keys[ebx.instances[0]["classRef"]]) if ebx.instances else None
                    db.execute("UPDATE captures SET header_status='ok',raw_sha256=?,object_count=?,root_class=? WHERE id=?", (ebx.sha256, len(ebx.instances), "Class_" + root["hash"] if root else None, row["id"]))
                else:
                    assert ebx.sha256 == row["raw_sha256"], "Captured raw changed"
                    if p.stat().st_size > args.max_decode_bytes or len(ebx.instances) > args.max_objects:
                        db.execute("UPDATE captures SET decode_status='needs-bounded-reader',error=? WHERE id=?", (f"Full decode limit: {args.max_decode_bytes} bytes/{args.max_objects} objects", row["id"]))
                        continue
                    result = ebx.decode()
                    warnings = collections.Counter()
                    for i, obj in enumerate(result["objects"]):
                        db.execute("INSERT INTO objects VALUES(?,?,?,?,?,?)", (row["id"], i, obj.get("$guid"), obj.get("$class"), ebx.data_start + ebx.data_offsets[i], dump(obj)))
                        for pointer, block in walk(obj):
                            for k in block:
                                if k in ["$unknownType", "$undecoded", "$unresolvedRef", "$unresolvedArray", "$unresolvedTypeRef", "$badArrayCount", "$badString", "$boxedValueRef", "$layoutAmbiguous"]:
                                    warnings[k] += 1
                            if "$import" in block:
                                ref = block["$import"]
                                db.execute("INSERT INTO refs VALUES(?,?,?,?,?,?)", (row["id"], i, pointer, "import", ref["fileGuid"], ref["classGuid"]))
                            for k in ["$resourceRef", "$fileRef", "$typeRef", "$delegateTypeRef"]:
                                if k in block:
                                    db.execute("INSERT INTO refs VALUES(?,?,?,?,?,?)", (row["id"], i, pointer, k, dump(block[k]), None))
                    db.execute("UPDATE captures SET decode_status=?,warnings_json=?,decoder_sha256=?,error=NULL WHERE id=?", ("decoded-provisional" if warnings else "decoded", dump(warnings), meta["decoderSha256"], row["id"]))
                db.commit()
            except sqlite3.OperationalError:
                # A busy ledger is not evidence that the source cannot decode.
                db.rollback()
                raise
            except Exception as exc:
                db.rollback()
                field = "header_status" if args.action == "scan" else "decode_status"
                db.execute(f"UPDATE captures SET {field}='error',error=? WHERE id=?", (str(exc), row["id"]))
                db.commit()
            if n % 1000 == 0:
                print(dump({"action": args.action, "processed": n, "total": len(rows)}), flush=True)
        # Header imports are structural edges, not proof of runtime activation.
        expand_candidates(db)
    db.commit()
    summary = {"catalogAssets": db.execute("SELECT count(*) FROM assets").fetchone()[0],
               "scope": dict(db.execute("SELECT scope,count(*) FROM assets GROUP BY scope")),
               "captures": dict(db.execute("SELECT header_status,count(*) FROM captures GROUP BY header_status")),
               "decodes": dict(db.execute("SELECT decode_status,count(*) FROM captures GROUP BY decode_status")),
               "objectRecords": db.execute("SELECT count(*) FROM objects").fetchone()[0],
               "importRecords": db.execute("SELECT count(*) FROM imports").fetchone()[0],
               "importFileGuidsAbsentFromCatalog": db.execute("SELECT count(DISTINCT i.target_file_guid) FROM imports i LEFT JOIN assets a ON a.file_guid=i.target_file_guid WHERE a.route IS NULL").fetchone()[0],
               "candidateImportFileGuidsAbsentFromCatalog": db.execute("SELECT count(DISTINCT i.target_file_guid) FROM imports i JOIN captures c ON c.id=i.capture_id JOIN assets src ON src.route=c.route LEFT JOIN assets target ON target.file_guid=i.target_file_guid WHERE src.scope LIKE '%-candidate' AND target.route IS NULL").fetchone()[0],
               "semanticReview": dict(db.execute("SELECT review_status,count(*) FROM assets GROUP BY review_status")),
               "candidateMissingRaw": db.execute("SELECT count(*) FROM assets a WHERE scope LIKE '%-candidate' AND NOT EXISTS(SELECT 1 FROM captures c WHERE c.route=a.route)").fetchone()[0]}
    summary["closureEstablished"] = False
    summary["closureLimits"] = "Unknown import GUIDs remain in imports even when the catalog reachability join cannot traverse them. Missing raw targets, opaque resources, provisional decoding and semantic review remain separate open work."
    print(dump(summary), flush=True)
    db.close()


if __name__ == "__main__":
    main()
