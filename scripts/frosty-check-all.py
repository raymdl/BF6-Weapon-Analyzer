#!/usr/bin/env python3
"""Run every raw-mode generator check against the committed site data, in order.

Usage:
  python scripts/frosty-check-all.py --build <builds/2.1.2.0> --research <BF6 Frosty Research>
      [--raw <extra capture raw folder> ...] [--out <folder for logs and reports>] [--stamp]

Exits 0 only when every check exits 0. A game update is "run this on the new build and
review what it reports" (docs/GAME_UPDATE_GUIDE.md, Stage 9).

--stamp writes data/provenance/data-status.json: one row per data file section. The sections each
check compares come from that check script's COVERS (and NOT_COVERED) lists; every other top-level
key, and every entry field no row names, gets a row no check covers. A covered row whose checks (and
the checks they take input from) exited 0 gets verifiedThrough = the build of --build/BUILD.json,
verifiedClient and verifiedOn. Rows no check covers, and rows whose check failed, keep what they had
(an uncovered row is never stamped). generatedFrom is never written here: the checks write no data.
A stamp that would move any label to an older build is refused before the checks run.
Without --stamp nothing is written.
"""
import argparse
import datetime
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATUS = ROOT / "data/provenance/data-status.json"
# Top-level keys that label or describe a file rather than hold its values.
LABEL_KEYS = {"$schema", "schemaVersion", "source", "_comment", "counts", "provenance", "generatedFrom", "generatedNote"}
# A check's result also depends on the checks whose output it reads.
INPUTS = {"individual-optics": ["tooltips", "availability", "compatibility"],
          "optic-tooltips": ["tooltips", "individual-optics"]}
UNCOVERED = "no check in frosty-check-all.py reads it"
RULE = ("generatedFrom: the build whose game files produced the values, recorded when a generator that writes "
        "wrote them; null = no single build recorded (values integrated by hand across updates; per-value "
        "provenance applies, or the file's own generatedFrom where generatedNote says so). verifiedThrough: the "
        "latest build on which the row's check passed with zero unexplained differences, written only by "
        "frosty-check-all.py --stamp. A row with no check cannot be stamped and keeps verifiedThrough null.")


def version(build):
    try:
        return tuple(int(part) for part in build.split("."))
    except (AttributeError, ValueError):
        sys.exit(f"cannot order build label {build!r}")


def coverage(steps):
    """(file, section, fields, checks, reason) rows declared by the check scripts."""
    rows = []
    for name, cmd in steps:
        spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / "scripts" / cmd[0])
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        rows += [(f, s, fields, (name,), None) for f, s, fields in module.COVERS]
        rows += [(f, s, fields, (), why) for f, s, fields, why in getattr(module, "NOT_COVERED", [])]
    return rows


def section_parts(section):
    name = section.split(" (")[0]
    return name.split("[")[0], name.count("[]")


def entries(value, depth):
    items = [value]
    for _ in range(depth):
        items = [v for item in items if isinstance(item, (dict, list))
                 for v in (item.values() if isinstance(item, dict) else item)]
    return [item for item in items if isinstance(item, dict)]


def build_rows(declared):
    """Merge declared rows and add the sections no check names, file by file."""
    merged = {}
    for f, s, fields, checks, why in declared:
        row = merged.setdefault((f, s, checks, why), {"file": f, "section": s, "fields": [] if fields else None,
                                                      "checks": list(checks), "reason": why})
        if fields:
            row["fields"] += [x for x in fields if x not in row["fields"]]
    rows = list(merged.values())
    for path in sorted((ROOT / "data").glob("*.json")):
        f = f"data/{path.name}"
        doc = json.loads(path.read_text(encoding="utf-8"))
        own = [r for r in rows if r["file"] == f]
        if any(r["section"] == "whole file" for r in own):
            continue
        keys = [""] if isinstance(doc, list) else [k for k in doc if k not in LABEL_KEYS]
        for key in keys:
            named = [r for r in own if section_parts(r["section"])[0] == key]
            if not named:
                rows.append({"file": f, "section": key, "fields": None, "checks": [], "reason": None})
                continue
            for section in dict.fromkeys(r["section"] for r in named if r["fields"]):
                if any(r["section"] == section.split("[")[0] and r["fields"] is None for r in named):
                    continue
                classified = {x.split(" (")[0] for r in named if r["section"] == section for x in r["fields"]}
                value = doc if key == "" else doc[key]
                rest = sorted({k for e in entries(value, section_parts(section)[1]) for k in e}
                              - classified - {"id"})
                if rest:
                    rows.append({"file": f, "section": section + " other fields", "fields": rest,
                                 "checks": [], "reason": None})
    return sorted(rows, key=lambda r: r["file"])


def row_key(row):
    """Identity of a row across stamps: a covered row by its checks, a declared uncovered row by its
    fields, a computed one (whole key, other fields) by its section alone."""
    if row["checks"]:
        return row["file"], row["section"], tuple(row["checks"])
    if row.get("fields") is None or row["section"].endswith(" other fields"):
        return row["file"], row["section"]
    return row["file"], row["section"], tuple(row["fields"])


def dump(status):
    rows = ",\n".join("    " + json.dumps(r, ensure_ascii=False) for r in status["sections"])
    head = {k: v for k, v in status.items() if k != "sections"}
    text = json.dumps(head, indent=2, ensure_ascii=False)
    return text[:-2] + ',\n  "sections": [\n' + rows + "\n  ]\n}\n"


def stamp(steps, codes, build_doc):
    build = build_doc["build"]
    client = (build_doc.get("clients") or [{}])[-1]
    today = datetime.date.today().isoformat()
    old = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    previous = {row_key(r): r for r in old.get("sections", [])}
    passed = {n for n, _ in steps if codes[n] == 0 and all(codes[i] == 0 for i in INPUTS.get(n, []))}
    rows = []
    for row in build_rows(coverage(steps)):
        before = previous.pop(row_key(row), {})
        row = {**row, "generatedFrom": before.get("generatedFrom"), "generatedNote": before.get("generatedNote"),
               "verifiedThrough": before.get("verifiedThrough"), "verifiedClient": before.get("verifiedClient"),
               "verifiedOn": before.get("verifiedOn")}
        if not row["checks"]:
            row["reason"] = row["reason"] or before.get("reason") or UNCOVERED
        else:
            del row["reason"]
            if all(c in passed for c in row["checks"]):
                row.update(verifiedThrough=build, verifiedClient=client.get("label", build), verifiedOn=today)
        if row["fields"] is None:
            del row["fields"]
        rows.append({k: v for k, v in row.items() if v is not None or k in ("generatedFrom", "verifiedThrough")})
    for key in previous:
        print(f"dropped row no check or data key now declares: {key[0]} {key[1]}")
    status = {"schemaVersion": 1, "generatedBy": "scripts/frosty-check-all.py --stamp", "rule": RULE,
              "lastStamp": {"build": build, "client": client.get("label", build),
                            "exeSha256": client.get("exeSha256"), "on": today,
                            "passed": [n for n, _ in steps if n in passed],
                            "failed": [n for n, _ in steps if n not in passed]},
              "allChecksPassed": old.get("allChecksPassed")}
    if len(passed) == len(steps):
        status["allChecksPassed"] = {"build": build, "client": client.get("label", build), "verifiedOn": today}
    status["sections"] = rows
    STATUS.write_text(dump(status), encoding="utf-8", newline="\n")
    print(f"stamped {sum(r.get('verifiedOn') == today and r['checks'] != [] for r in rows)} of {len(rows)} sections "
          f"through {build}: {STATUS.relative_to(ROOT)}")


def refuse_backwards(build):
    if not STATUS.exists():
        return
    old = json.loads(STATUS.read_text(encoding="utf-8"))
    labels = [r.get("verifiedThrough") for r in old.get("sections", [])]
    labels += [(old.get("allChecksPassed") or {}).get("build"), (old.get("lastStamp") or {}).get("build")]
    newer = sorted({b for b in labels if b and version(b) > version(build)}, key=version)
    if newer:
        sys.exit(f"refused: {STATUS.relative_to(ROOT)} already holds build {newer[-1]}, newer than {build}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True, type=Path)
    ap.add_argument("--research", required=True, type=Path)
    ap.add_argument("--raw", action="append", default=[], type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--stamp", action="store_true",
                    help="write verifiedThrough to data/provenance/data-status.json for the sections whose check passed")
    args = ap.parse_args()

    build_doc = None
    if args.stamp:
        build_doc = json.loads((args.build / "BUILD.json").read_text(encoding="utf-8"))
        version(build_doc["build"])
        refuse_backwards(build_doc["build"])
    cap = args.build / "capture"
    raws = [cap / "collection" / "raw", cap / "collection-fresh-cache" / "raw", *args.raw]
    for needed in [*raws, cap / "collection" / "asset-catalog.json"]:
        if not needed.exists():
            sys.exit(f"missing: {needed}")
    raw = []
    for folder in raws:
        raw += ["--raw", str(folder)]
    raw += ["--descriptors", str(cap / "toolchain" / "SharedTypeDescriptors.ebx"),
            "--catalog", str(cap / "collection" / "asset-catalog.json"),
            "--catalog", str(cap / "collection-fresh-cache" / "asset-catalog.json")]
    strings = ["--strings", str(cap / "fs_us_loc.strings.tsv")]
    out = args.out or Path(tempfile.mkdtemp(prefix="frosty-check-all-"))
    out.mkdir(parents=True, exist_ok=True)
    optics = "reference-data/provenance/frosty-individual-optics-2026-11-10.json"
    identities = args.research / "reference-data" / "provenance" / "frosty-weapon-identities.json"
    t, om, av, cp = (str(out / n) for n in ("tooltips.json", "optic-mapping.json", "availability.json", "compatibility.json"))

    # Order matters: tooltips write the optic mapping; individual optics read it with the
    # availability and compatibility reports; point costs run after individual optics.
    steps = [
        ("tooltips", ["frosty-attachment-tooltips.py", "Common/Hardware/Weapons", t, *raw, *strings, "--optic-mapping-json", om]),
        ("availability", ["frosty-availability.py", *raw, *strings, "--report-out", av]),
        ("compatibility", ["frosty-attachment-compatibility.py", *raw, "--report-out", cp]),
        ("individual-optics", ["frosty-individual-optics.py", "--optic-mapping", om, "--compatibility", cp, "--availability", av, "--report-out", optics]),
        ("optic-tooltips", ["optic-tooltips.py", "--tooltips", t, "--mapping", om, "--individual", optics]),
        ("point-costs", ["frosty-point-costs.py", *raw]),
        ("handling", ["frosty-attachment-handling.py", *raw]),
        ("barrel-ads", ["frosty-barrel-ads.py", *raw, "--identities", str(identities)]),
        ("weapons", ["frosty-weapons.py", *raw, *strings]),
        ("ammo", ["frosty-ammo.py", *raw]),
    ]
    codes = {}
    for name, cmd in steps:
        log = out / f"{name}.log"
        with open(log, "w", encoding="utf-8") as fh:
            code = subprocess.run([sys.executable, str(ROOT / "scripts" / cmd[0]), *cmd[1:], "--check"],
                                  cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT).returncode
        print(f"{'ok  ' if code == 0 else 'FAIL'} {name:18} exit {code}  {log}")
        codes[name] = code
    failed = [n for n, c in codes.items() if c]
    print("all checks pass" if not failed else "failed: " + ", ".join(failed))
    if args.stamp:
        stamp(steps, codes, build_doc)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
