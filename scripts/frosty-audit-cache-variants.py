"""Decode captured cache variants into a separate, offset-keyed research database.

This tool compares captured cache-record bodies. It makes no runtime or activation
claims and never writes to the shared coverage ledger. Existing outputs are refused.
"""
import argparse
import collections
import hashlib
import json
import pathlib
import runpy
import sqlite3


def sha(path):
    h = hashlib.sha256()
    with pathlib.Path(path).open("rb") as src:
        for block in iter(lambda: src.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def dump(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def walk(value, pointer=""):
    if isinstance(value, dict):
        yield pointer, value
        for key, child in value.items():
            yield from walk(child, pointer + "/" + str(key).replace("~", "~0").replace("/", "~1"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, pointer + "/" + str(index))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ledger", required=True, type=pathlib.Path)
    ap.add_argument("--decoder", required=True, type=pathlib.Path)
    ap.add_argument("--request", required=True, action="append", type=pathlib.Path)
    ap.add_argument("--capture-dir", required=True, action="append", type=pathlib.Path)
    ap.add_argument("--output-db", required=True, type=pathlib.Path)
    ap.add_argument("--summary", required=True, type=pathlib.Path)
    ap.add_argument("--max-decode-bytes", type=int, default=8 * 1024 * 1024)
    ap.add_argument("--max-objects", type=int, default=100000)
    args = ap.parse_args()
    if args.output_db.exists() or args.summary.exists():
        ap.error("Refusing to overwrite output database or summary")
    if len(args.request) != len(args.capture_dir):
        ap.error("Supply one --capture-dir for each --request, in matching order")

    ledger = sqlite3.connect(args.ledger.resolve().as_uri() + "?mode=ro", uri=True)
    ledger.row_factory = sqlite3.Row
    meta = {r["key"]: json.loads(r["value"]) for r in ledger.execute("SELECT key,value FROM metadata")}
    if meta.get("catalogHead") != 4892017:
        raise ValueError("Unexpected main-ledger build identity")
    decoder_hash = sha(args.decoder)
    expected_decoder_hash = "190f7d51cd7b20daf3fb5dc7f2c69688b28f0322e0f2eb0a45b16bc3c4a3098f"
    if decoder_hash != expected_decoder_hash:
        raise ValueError("Decoder does not match pinned reader hash")

    # Resolve and verify the hotfix descriptor from current-head captures in the ledger.
    descriptor_rows = ledger.execute("""SELECT descriptor_path,descriptor_sha256
        FROM captures WHERE head=4892087 AND descriptor_path IS NOT NULL
        GROUP BY descriptor_path,descriptor_sha256""").fetchall()
    if len(descriptor_rows) != 1:
        raise ValueError(f"Expected one descriptor identity for head 4892087, found {len(descriptor_rows)}")
    descriptor_path = pathlib.Path(descriptor_rows[0]["descriptor_path"])
    descriptor_hash = descriptor_rows[0]["descriptor_sha256"]
    if sha(descriptor_path) != descriptor_hash:
        raise ValueError("Ledger descriptor hash mismatch")

    dec = runpy.run_path(str(args.decoder))
    types = dec["type_descriptors"](descriptor_path)
    if types["sha256"] != descriptor_hash:
        raise ValueError("Decoder descriptor hash mismatch")

    out = sqlite3.connect(args.output_db)
    out.row_factory = sqlite3.Row
    out.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE pairs(pair_id INTEGER PRIMARY KEY,file_guid TEXT NOT NULL,selected_offset INTEGER,
      alternate_offset INTEGER,root_class_equal INTEGER,layout_key_equal INTEGER,raw_equal INTEGER,
      selected_control_match INTEGER,comparison_status TEXT NOT NULL);
    CREATE TABLE variants(id INTEGER PRIMARY KEY,cache_offset INTEGER UNIQUE, pair_id INTEGER,
      side TEXT,route TEXT,file_guid TEXT,record_sha1 TEXT,cache_record_bytes INTEGER,
      original_bytes INTEGER,raw_path TEXT,raw_sha256 TEXT,raw_bytes INTEGER,selected_control_match INTEGER,
      validation_status TEXT NOT NULL,warnings_json TEXT,
      error TEXT,root_class TEXT,layout_key TEXT,object_count INTEGER,decoder_sha256 TEXT,
      FOREIGN KEY(pair_id) REFERENCES pairs(pair_id));
    CREATE TABLE objects(variant_id INTEGER,object_index INTEGER,object_guid TEXT,class_name TEXT,
      absolute_offset INTEGER,body_json TEXT,PRIMARY KEY(variant_id,object_index));
    CREATE TABLE imports(variant_id INTEGER,ordinal INTEGER,target_file_guid TEXT,target_object_guid TEXT,
      PRIMARY KEY(variant_id,ordinal));
    CREATE TABLE refs(variant_id INTEGER,object_index INTEGER,pointer TEXT,kind TEXT,target TEXT,
      target_object_guid TEXT);
    CREATE INDEX variants_guid ON variants(file_guid);
    CREATE INDEX objects_guid ON objects(object_guid);
    CREATE INDEX objects_class ON objects(class_name);
    CREATE INDEX imports_target ON imports(target_file_guid);
    CREATE INDEX refs_target ON refs(target);
    """)

    source_rows = []
    source_meta = []
    checked_caches = {}
    seen_offsets = set()
    for request_path, capture_dir in zip(args.request, args.capture_dir):
        req_hash = sha(request_path)
        req = json.loads(request_path.read_text(encoding="utf-8-sig"))
        if req.get("gameHead") != 4892087:
            raise ValueError(f"Unexpected request gameHead: {request_path}")
        cache = req["cache"]
        cat_path = capture_dir / "asset-catalog.json"
        status_path = capture_dir / "variant-status.jsonl"
        cat_hash, status_hash = sha(cat_path), sha(status_path)
        catalog = json.loads(cat_path.read_text(encoding="utf-8-sig"))
        if catalog.get("gameHead") != req["gameHead"] or catalog.get("sdkVersion") != 4414275:
            raise ValueError(f"Capture catalog identity mismatch: {capture_dir}")
        cache_key = str(pathlib.Path(cache["path"]).resolve())
        cache_fingerprint = (cache["sha256"], cache["bytes"], cache["ebxSectionEnd"])
        if cache_key in checked_caches and checked_caches[cache_key] != cache_fingerprint:
            raise ValueError(f"Conflicting cache identity for {cache_key}")
        if cache_key not in checked_caches:
            if sha(cache["path"]) != cache["sha256"]:
                raise ValueError(f"Cache hash mismatch: {cache['path']}")
            cache_size = pathlib.Path(cache["path"]).stat().st_size
            if cache_size != cache["bytes"]:
                raise ValueError(f"Cache size mismatch: {cache['path']}")
            checked_caches[cache_key] = cache_fingerprint
        status_by_offset = {}
        with status_path.open(encoding="utf-8-sig") as src:
            for line in src:
                row = json.loads(line)
                if row["cacheOffset"] in status_by_offset:
                    raise ValueError(f"Duplicate status cacheOffset {row['cacheOffset']} in {status_path}")
                status_by_offset[row["cacheOffset"]] = row
        request_offsets = {rec["cacheOffset"] for rec in req["records"]}
        extras = set(status_by_offset) - request_offsets
        if extras:
            raise ValueError(f"Unrequested status offsets in {status_path}: {len(extras)}")
        catalog_by_key = {(a["guid"].lower(), a["sha1"].lower(), a["path"]): a for a in catalog["assets"]}
        for rec in req["records"]:
            if rec["cacheOffset"] in seen_offsets:
                raise ValueError(f"Duplicate request cacheOffset {rec['cacheOffset']}")
            seen_offsets.add(rec["cacheOffset"])
            if rec.get("side") == "skipped":
                rec["side"] = "alternate"
            source_rows.append((rec, req, capture_dir, status_by_offset.get(rec["cacheOffset"]), catalog_by_key,
                                cache["ebxSectionEnd"], req_hash, cat_hash, status_hash))
        source_meta.append({"requestPath": str(request_path.resolve()), "requestSha256": req_hash,
                            "captureDir": str(capture_dir.resolve()), "catalogSha256": cat_hash,
                            "statusPath": str(status_path.resolve()), "statusSha256": status_hash,
                            "gameHead": req["gameHead"], "sdkVersion": catalog["sdkVersion"],
                            "cachePath": cache["path"], "cacheSha256": cache["sha256"],
                            "cacheBytes": cache["bytes"], "ebxSectionEnd": cache["ebxSectionEnd"]})

    grouped = collections.defaultdict(list)
    for entry in source_rows:
        grouped[entry[0]["fileGuid"].lower()].append(entry)
    pair_id_for_guid = {}
    pair_side_entries = {}
    for pair_id, (guid, entries) in enumerate(sorted(grouped.items()), 1):
        by_side = collections.defaultdict(list)
        for entry in entries:
            by_side[entry[0].get("side", "unknown")].append(entry)
        sel = by_side.get("selected", [])
        alt = by_side.get("alternate", [])
        selected = sel[0][0]["cacheOffset"] if len(sel) == 1 else None
        alternate = alt[0][0]["cacheOffset"] if len(alt) == 1 else None
        out.execute("INSERT INTO pairs(pair_id,file_guid,selected_offset,alternate_offset,comparison_status) VALUES(?,?,?,?,?)",
                    (pair_id, guid, selected, alternate, "pending" if selected is not None and alternate is not None else "pair-cardinality-error"))
        pair_id_for_guid[guid] = pair_id
        pair_side_entries[guid] = {"selected": sel, "alternate": alt}

    variant_id_for_offset = {}
    for rec, req, capdir, status, catby, section_end, *_hashes in source_rows:
        guid, offset = rec["fileGuid"].lower(), rec["cacheOffset"]
        pair_id = pair_id_for_guid[guid]
        errors = []
        raw_path = None
        raw_hash = None
        raw_bytes = None
        control_match = None
        if status is None:
            errors.append("missing-status-row")
        else:
            checks = [(status.get("gameHead") == req["gameHead"], "status-head-mismatch"),
                      (status.get("sdkVersion") == 4414275, "status-sdk-mismatch"),
                      (status.get("path") == rec["route"], "status-path-mismatch"),
                      (status.get("fileGuid", "").lower() == guid, "status-guid-mismatch"),
                      (status.get("recordSha1", "").lower() == rec["recordSha1"].lower(), "status-record-sha1-mismatch"),
                      (status.get("cacheOffset") == offset, "status-offset-mismatch"),
                      (status.get("cacheRecordBytes") == rec["cacheRecordBytes"], "status-record-size-mismatch")]
            errors += [message for ok, message in checks if not ok]
            if status.get("status") != "success":
                errors.append("capture-status-" + str(status.get("status")))
            status_file = status.get("file")
            if not isinstance(status_file, str) or not status_file:
                errors.append("status-file-missing")
                status_file = None
            raw_path = (capdir / status_file).resolve() if status_file else None
            try:
                if raw_path is not None:
                    raw_path.relative_to(capdir.resolve())
            except ValueError:
                errors.append("capture-path-escapes-folder")
            if raw_path is not None and raw_path.is_file():
                raw_bytes = raw_path.stat().st_size
                raw_hash = sha(raw_path)
                if raw_bytes != status.get("bytes") or raw_bytes != rec["originalBytes"]:
                    errors.append("raw-size-mismatch")
                if raw_hash != status.get("sha256"):
                    errors.append("raw-sha256-mismatch")
                if status.get("fileGuid", "").lower() not in {"", guid}:
                    errors.append("raw-guid-mismatch")
            else:
                errors.append("raw-file-missing")
        if offset < 0 or offset + rec["cacheRecordBytes"] > section_end:
            errors.append("cache-record-out-of-bounds")
        if rec.get("side") == "selected":
            cat = catby.get((guid, rec["recordSha1"].lower(), rec["route"]))
            if cat is None:
                errors.append("catalog-record-mismatch")
            elif cat.get("originalBytes") != rec["originalBytes"]:
                errors.append("catalog-original-size-mismatch")
        ledger_rows = ledger.execute("SELECT a.route,c.raw_sha256 FROM captures c JOIN assets a ON a.route=c.route WHERE a.file_guid=?", (guid,)).fetchall()
        selected_control = None
        if rec.get("side") == "selected" and raw_hash:
            selected_control = int(any(row["raw_sha256"] == raw_hash for row in ledger_rows))
            control_match = selected_control
        vid = offset
        if offset in variant_id_for_offset:
            errors.append("duplicate-cache-offset")
            vid = -offset - len(variant_id_for_offset) - 1
        variant_id_for_offset[offset] = vid
        out.execute("""INSERT INTO variants(id,cache_offset,pair_id,side,route,file_guid,record_sha1,
            cache_record_bytes,original_bytes,raw_path,raw_sha256,raw_bytes,selected_control_match,validation_status,error)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (vid, offset, pair_id, rec.get("side"), rec.get("route"), guid, rec.get("recordSha1"),
             rec.get("cacheRecordBytes"), rec.get("originalBytes"), str(raw_path) if raw_path else None,
             raw_hash, raw_bytes, control_match, "pending" if not errors else "error", ";".join(errors) if errors else None))
        if errors or raw_path is None or not raw_path.is_file():
            continue
        out.execute("SAVEPOINT variant_decode")
        try:
            if raw_bytes > args.max_decode_bytes:
                raise ValueError(f"decode-byte-limit:{args.max_decode_bytes}")
            ebx = dec["Ebx"](raw_path, types)
            if ebx.sha256 != raw_hash:
                raise ValueError("decoder-raw-sha256-mismatch")
            if dec["_guid"](ebx.file_guid).lower() != guid:
                raise ValueError("decoded-file-guid-mismatch")
            if len(ebx.instances) > args.max_objects:
                raise ValueError(f"decode-object-limit:{args.max_objects}")
            if ebx.data_end > len(ebx.data):
                raise ValueError("ebx-data-bounds-invalid")
            root = None
            root_key = None
            if ebx.instances:
                inst = ebx.instances[0]
                root = ebx.class_by_key(ebx.class_keys[inst["classRef"]])
                root_key = ebx.class_keys[inst["classRef"]]
            result = ebx.decode()
            warnings = collections.Counter()
            for ordinal, (file_guid, object_guid) in enumerate(ebx.imports):
                out.execute("INSERT INTO imports VALUES(?,?,?,?)",
                            (vid, ordinal, dec["_guid"](bytes.fromhex(file_guid)), dec["_guid"](object_guid)))
            for i, obj in enumerate(result["objects"]):
                out.execute("INSERT INTO objects VALUES(?,?,?,?,?,?)", (vid, i, obj.get("$guid"), obj.get("$class"), ebx.data_start + ebx.data_offsets[i], dump(obj)))
                for pointer, block in walk(obj):
                    for key in block:
                        if key in {"$unknownType", "$undecoded", "$unresolvedRef", "$unresolvedArray", "$unresolvedTypeRef", "$badArrayCount", "$badString", "$boxedValueRef", "$layoutAmbiguous"}:
                            warnings[key] += 1
                    if "$import" in block:
                        ref = block["$import"]
                        out.execute("INSERT INTO refs VALUES(?,?,?,?,?,?)", (vid, i, pointer, "import", ref["fileGuid"], ref["classGuid"]))
                    for key in ("$resourceRef", "$fileRef", "$typeRef", "$delegateTypeRef"):
                        if key in block:
                            out.execute("INSERT INTO refs VALUES(?,?,?,?,?,?)", (vid, i, pointer, key, dump(block[key]), None))
            out.execute("UPDATE variants SET validation_status=?,root_class=?,layout_key=?,object_count=?,decoder_sha256=?,warnings_json=? WHERE id=?",
                        ("decoded-provisional" if warnings else "decoded", "Class_" + root["hash"] if root else None, root_key,
                         len(result["objects"]), decoder_hash, dump(warnings), vid))
            out.execute("RELEASE SAVEPOINT variant_decode")
        except Exception as exc:
            out.execute("ROLLBACK TO SAVEPOINT variant_decode")
            out.execute("RELEASE SAVEPOINT variant_decode")
            out.execute("UPDATE variants SET validation_status='error',error=? WHERE id=?", (str(exc), vid))

    for guid, sides in pair_side_entries.items():
        pid = pair_id_for_guid[guid]
        if len(sides["selected"]) != 1 or len(sides["alternate"]) != 1:
            continue
        a, b = sides["selected"][0][0], sides["alternate"][0][0]
        va = out.execute("SELECT * FROM variants WHERE cache_offset=?", (a["cacheOffset"],)).fetchone()
        vb = out.execute("SELECT * FROM variants WHERE cache_offset=?", (b["cacheOffset"],)).fetchone()
        if va is None or vb is None:
            continue
        ready = va["validation_status"].startswith("decoded") and vb["validation_status"].startswith("decoded")
        raw_equal = int(va["raw_sha256"] == vb["raw_sha256"]) if va["raw_sha256"] and vb["raw_sha256"] else None
        control = va["selected_control_match"]
        out.execute("UPDATE pairs SET root_class_equal=?,layout_key_equal=?,raw_equal=?,selected_control_match=?,comparison_status=? WHERE pair_id=?",
                    (int(va["root_class"] == vb["root_class"]) if ready else None,
                     int(va["layout_key"] == vb["layout_key"]) if ready else None,
                     raw_equal, control, "compared" if ready else "decode-incomplete", pid))
    out.commit()

    pair_summary = []
    for row in out.execute("SELECT * FROM pairs ORDER BY pair_id"):
        variants = [dict(v) for v in out.execute("SELECT cache_offset,side,route,record_sha1,raw_sha256,raw_bytes,selected_control_match,validation_status,error,warnings_json,root_class,layout_key,object_count FROM variants WHERE pair_id=? ORDER BY side,cache_offset", (row["pair_id"],))]
        pair_summary.append({**dict(row), "variants": variants})
    metadata = {"schemaVersion": 1, "toolSha256": sha(pathlib.Path(__file__)), "decoderSha256": decoder_hash,
                "descriptorPath": str(descriptor_path.resolve()), "descriptorSha256": descriptor_hash,
                "ledgerPath": str(args.ledger.resolve()), "ledgerCatalogHead": meta["catalogHead"],
                "sources": source_meta, "maxDecodeBytes": args.max_decode_bytes, "maxObjects": args.max_objects}
    out.executemany("INSERT INTO metadata VALUES(?,?)", [(key, dump(value)) for key, value in metadata.items()])
    out.commit()
    summary = {"schemaVersion": 1, "toolSha256": sha(pathlib.Path(__file__)), "decoderSha256": decoder_hash,
               "descriptorPath": str(descriptor_path.resolve()), "descriptorSha256": descriptor_hash,
               "ledgerPath": str(args.ledger.resolve()), "ledgerCatalogHead": meta["catalogHead"],
               "limits": {"maxDecodeBytes": args.max_decode_bytes, "maxObjects": args.max_objects},
               "sources": source_meta, "recordCount": len(source_rows), "pairCount": len(pair_summary),
               "variantStatuses": dict(out.execute("SELECT validation_status,count(*) FROM variants GROUP BY validation_status")),
               "pairStatuses": dict(out.execute("SELECT comparison_status,count(*) FROM pairs GROUP BY comparison_status")),
               "pairs": pair_summary}
    args.summary.write_text(json.dumps(summary, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    out.close()
    ledger.close()
    print(dump({"records": len(source_rows), "pairs": len(pair_summary), "database": str(args.output_db.resolve()),
                "summary": str(args.summary.resolve()), "variantStatuses": summary["variantStatuses"],
                "pairStatuses": summary["pairStatuses"]}))


if __name__ == "__main__":
    main()
