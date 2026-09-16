"""Write the text catalog files for a build from its collection asset-catalog.json.

Output (UTF-8, CRLF), in the format of the original 1.4.2.5 export:
  ebx_manifest.txt     one asset route per line
  ebx_manifest.csv     Directory,Filename,FullPath (standard CSV quoting)
  ebx_directories.txt  every parent directory; entries that differ only in letter case
                       keep the first spelling
Routes and directories are sorted by ordinal comparison of the upper-case text. Applied
to builds/1.4.2.5/capture/collection/asset-catalog.json, these rules reproduce the
original 1.4.2.5 files byte for byte.

Usage:
  python scripts/frosty-catalog-files.py <asset-catalog.json> <output folder>          write (refuses to overwrite)
  python scripts/frosty-catalog-files.py <asset-catalog.json> <folder> --check         compare with existing files
"""
import argparse
import csv
import hashlib
import io
import json
import posixpath
from pathlib import Path

NAMES = ("ebx_manifest.txt", "ebx_manifest.csv", "ebx_directories.txt")


def build(catalog_json):
    paths = [asset["path"] for asset in json.loads(Path(catalog_json).read_text(encoding="utf-8"))["assets"]]
    key = str.upper
    routes = sorted(paths, key=key)
    first_spelling = {}
    for path in paths:
        directory = posixpath.dirname(path)
        while directory:
            first_spelling.setdefault(directory.lower(), directory)
            directory = posixpath.dirname(directory)
    directories = sorted(first_spelling.values(), key=key)
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(["Directory", "Filename", "FullPath"])
    for route in routes:
        writer.writerow([posixpath.dirname(route), posixpath.basename(route), route])
    lines = lambda rows: ("\r\n".join(rows) + "\r\n").encode("utf-8")
    return {"ebx_manifest.txt": lines(routes), "ebx_manifest.csv": buffer.getvalue().encode("utf-8"),
            "ebx_directories.txt": lines(directories)}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("catalog")
    parser.add_argument("folder", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    files = build(args.catalog)
    failed = False
    for name in NAMES:
        target, data = args.folder / name, files[name]
        if args.check:
            same = target.is_file() and target.read_bytes() == data
            failed |= not same
            print(f"{name}: {'identical' if same else 'DIFFERENT'}")
        else:
            if target.exists():
                raise SystemExit(f"Refusing to overwrite {target}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            print(f"{name}: {len(data)} bytes, sha256 {hashlib.sha256(data).hexdigest()}")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
