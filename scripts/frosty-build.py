"""Manage per-build Frosty data snapshots in the BF6 Datamining folder.

Layout: <datamining>/builds/<build>/{xml,capture,reports}/, with BUILD.json (identity
and state) and MANIFEST.tsv (path, size, SHA-256 of every data file) per build, and
<datamining>/builds.json as the index.

States:
  open    The installed data build. New files may be added; existing files must not
          change (files under reports/ may change).
  sealed  No longer installed. All files are read-only and must match the manifest.

Commands (all take --datamining):
  status                     List builds and their states.
  record <build>             Add new files to the manifest; stop if an existing file changed.
  verify <build>             Compare the build with its manifest.
  seal <build>               Verify, set every file read-only, mark the build sealed.
  guard <build> --game DIR   Exit 1 unless <build> is open and the installed bf6.exe is
                             one of its recorded client versions. Run before every export.
  client-check <build> --game DIR --runtime DIR
                             Compare the installed client with the build's recorded
                             descriptors. Equivalent layouts: print the entry to add as a
                             hotfix client version. Different layouts: a new build is needed.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import stat
import sys
from pathlib import Path

MUTABLE_PREFIX = "reports/"
SKIP = {"BUILD.json", "MANIFEST.tsv"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def build_dir(root, build):
    path = root / "builds" / build
    if not (path / "BUILD.json").is_file():
        raise SystemExit(f"Unknown build (no BUILD.json): {path}")
    return path


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    mode = path.stat().st_mode if path.exists() else None
    if mode is not None and not mode & stat.S_IWRITE:
        os.chmod(path, mode | stat.S_IWRITE)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_manifest(path):
    entries = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            rel, size, digest = line.split("\t")
            entries[rel] = (int(size), digest)
    return entries


def write_manifest(path, entries):
    if path.exists():
        os.chmod(path, path.stat().st_mode | stat.S_IWRITE)
    lines = [f"{rel}\t{size}\t{digest}" for rel, (size, digest) in sorted(entries.items())]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def data_files(bdir):
    for dirpath, _, files in os.walk(bdir):
        for name in files:
            full = Path(dirpath) / name
            rel = full.relative_to(bdir).as_posix()
            if rel not in SKIP:
                yield rel, full


def compare(bdir, manifest, quick=False):
    """Return (new, changed, missing, current) where current maps rel -> (size, sha)."""
    new, changed, current = [], [], {}
    seen = set()
    for rel, full in data_files(bdir):
        seen.add(rel)
        size = full.stat().st_size
        old = manifest.get(rel)
        if quick and old and old[0] == size:
            current[rel] = old
            continue
        digest = sha256(full)
        current[rel] = (size, digest)
        if old is None:
            new.append(rel)
        elif old != (size, digest):
            changed.append(rel)
    missing = sorted(set(manifest) - seen)
    return sorted(new), sorted(changed), missing, current


def update_index(root, build, info):
    index_path = root / "builds.json"
    index = load_json(index_path) if index_path.exists() else {"builds": {}}
    index["builds"][build] = {k: info[k] for k in ("state", "label", "fileCount", "totalBytes", "updatedUtc")}
    write_json(index_path, index)


def summarize(info, entries):
    info["fileCount"] = len(entries)
    info["totalBytes"] = sum(size for size, _ in entries.values())
    info["updatedUtc"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def cmd_record(root, build):
    bdir = build_dir(root, build)
    info = load_json(bdir / "BUILD.json")
    if info["state"] != "open":
        raise SystemExit(f"{build} is {info['state']}; only an open build can record new files.")
    manifest = read_manifest(bdir / "MANIFEST.tsv")
    new, changed, missing, current = compare(bdir, manifest)
    protected = [r for r in changed + missing if not r.startswith(MUTABLE_PREFIX)]
    if protected:
        print("Existing data changed or missing; nothing recorded:")
        for rel in protected[:50]:
            print("  " + rel)
        raise SystemExit(1)
    for rel in missing:
        current.pop(rel, None)
    write_manifest(bdir / "MANIFEST.tsv", current)
    summarize(info, current)
    write_json(bdir / "BUILD.json", info)
    update_index(root, build, info)
    print(f"{build}: {len(new)} new, {len(changed)} changed report files, {len(current)} files recorded")


def cmd_verify(root, build, quiet=False):
    bdir = build_dir(root, build)
    manifest = read_manifest(bdir / "MANIFEST.tsv")
    if not manifest:
        raise SystemExit(f"{build} has no manifest; run record first.")
    info = load_json(bdir / "BUILD.json")
    new, changed, missing, _ = compare(bdir, manifest)
    if info["state"] == "open":
        changed = [r for r in changed if not r.startswith(MUTABLE_PREFIX)]
        missing = [r for r in missing if not r.startswith(MUTABLE_PREFIX)]
    ok = not (changed or missing or (new and info["state"] == "sealed"))
    if not quiet or not ok:
        print(f"{build} ({info['state']}): {len(manifest)} in manifest, {len(new)} new, "
              f"{len(changed)} changed, {len(missing)} missing")
        for label, rows in (("changed", changed), ("missing", missing), ("new", new)):
            for rel in rows[:20]:
                print(f"  {label}: {rel}")
    if not ok:
        raise SystemExit(1)
    return info


def cmd_seal(root, build):
    info = cmd_verify(root, build)
    bdir = build_dir(root, build)
    if info["state"] == "open":
        new = compare(bdir, read_manifest(bdir / "MANIFEST.tsv"), quick=True)[0]
        if new:
            raise SystemExit(f"{build} has {len(new)} unrecorded files; run record first.")
    for _, full in data_files(bdir):
        mode = full.stat().st_mode
        if mode & stat.S_IWRITE:
            os.chmod(full, mode & ~stat.S_IWRITE & ~stat.S_IWGRP & ~stat.S_IWOTH)
    info["state"] = "sealed"
    info["sealedUtc"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    summarize(info, read_manifest(bdir / "MANIFEST.tsv"))
    write_json(bdir / "BUILD.json", info)
    os.chmod(bdir / "BUILD.json", stat.S_IREAD)
    os.chmod(bdir / "MANIFEST.tsv", stat.S_IREAD)
    update_index(root, build, info)
    print(f"{build}: sealed ({info['fileCount']} files read-only)")


def client_identity(game, runtime):
    exe = sha256(Path(game) / "bf6.exe")
    descriptors = sha256(Path(runtime) / "SharedTypeDescriptors.ebx") if runtime else None
    return exe, descriptors


def cmd_guard(root, build, game):
    info = load_json(build_dir(root, build) / "BUILD.json")
    exe, _ = client_identity(game, None)
    known = {c["exeSha256"] for c in info.get("clients", [])}
    if info["state"] != "open":
        raise SystemExit(f"STOP: {build} is {info['state']}. Export into the open build instead.")
    if exe not in known:
        raise SystemExit(f"STOP: installed bf6.exe {exe[:16]}... is not a recorded client of {build}. "
                         "Run client-check before any export.")
    print(f"OK: installed client belongs to open build {build}.")


def load_decoder():
    here = Path(__file__).resolve().parent / "frosty-ebx-decode.py"
    spec = importlib.util.spec_from_file_location("frosty_ebx_decode", here)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def resolved_layouts(decoder, path):
    types = decoder.type_descriptors(path)
    guids = list(types["byGuid"])
    return {guid: (cls["hash"], cls["type"], cls["size"], cls["alignment"],
                   tuple((f["hash"], f["offset"], f["flags"],
                          guids[f["classRef"]] if f["classRef"] < len(guids) else f["classRef"])
                         for f in cls["fields"]))
            for guid, cls in types["byGuid"].items()}


def cmd_client_check(root, build, game, runtime):
    bdir = build_dir(root, build)
    info = load_json(bdir / "BUILD.json")
    exe, descriptors = client_identity(game, runtime)
    if any(c["exeSha256"] == exe for c in info.get("clients", [])):
        print(f"Installed client is already recorded for {build}.")
        return
    reference = bdir / info["clients"][0]["descriptorsFile"]
    decoder = load_decoder()
    same = resolved_layouts(decoder, reference) == resolved_layouts(decoder, Path(runtime) / "SharedTypeDescriptors.ebx")
    entry = {"label": "<hotfix label>", "exeSha256": exe, "descriptorsSha256": descriptors,
             "layoutEquivalentTo": info["clients"][0]["descriptorsSha256"] if same else None,
             "checkedUtc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    if same:
        print("Type layouts are identical. If the asset catalog is also unchanged, this is a client")
        print("update of the same data build (see docs/GAME_UPDATE_GUIDE.md, Stage 1).")
        print("Copy the runtime SharedTypeDescriptors.ebx into capture/toolchain/ under a new name and")
        print(f"add this entry to {bdir / 'BUILD.json'} clients:")
    else:
        print("Type layouts differ: seal this build and create a new build before any export.")
    print(json.dumps(entry, indent=2))
    sys.exit(0 if same else 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--datamining", type=Path, required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    for name in ("record", "verify", "seal"):
        sub.add_parser(name).add_argument("build")
    g = sub.add_parser("guard")
    g.add_argument("build")
    g.add_argument("--game", required=True)
    c = sub.add_parser("client-check")
    c.add_argument("build")
    c.add_argument("--game", required=True)
    c.add_argument("--runtime", required=True)
    args = parser.parse_args()
    root = args.datamining
    if args.command == "status":
        index = load_json(root / "builds.json")
        for build, row in index["builds"].items():
            print(f"{build:12} {row['state']:8} {row['fileCount']:>8} files {row['totalBytes'] / 2**30:6.2f} GiB  {row['label']}")
    elif args.command == "record":
        cmd_record(root, args.build)
    elif args.command == "verify":
        cmd_verify(root, args.build)
    elif args.command == "seal":
        cmd_seal(root, args.build)
    elif args.command == "guard":
        cmd_guard(root, args.build, args.game)
    else:
        cmd_client_check(root, args.build, args.game, args.runtime)


if __name__ == "__main__":
    main()
