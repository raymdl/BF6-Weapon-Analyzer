#!/usr/bin/env python3
"""Run every raw-mode generator check against the committed site data, in order.

Usage:
  python scripts/frosty-check-all.py --build <builds/2.1.2.0> --research <BF6 Frosty Research>
      [--raw <extra capture raw folder> ...] [--out <folder for logs and reports>]

Exits 0 only when every check exits 0. A game update is "run this on the new build and
review what it reports" (docs/GAME_UPDATE_GUIDE.md, Stage 9).
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True, type=Path)
    ap.add_argument("--research", required=True, type=Path)
    ap.add_argument("--raw", action="append", default=[], type=Path)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

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
    failed = []
    for name, cmd in steps:
        log = out / f"{name}.log"
        with open(log, "w", encoding="utf-8") as fh:
            code = subprocess.run([sys.executable, str(ROOT / "scripts" / cmd[0]), *cmd[1:], "--check"],
                                  cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT).returncode
        print(f"{'ok  ' if code == 0 else 'FAIL'} {name:18} exit {code}  {log}")
        if code:
            failed.append(name)
    print("all checks pass" if not failed else "failed: " + ", ".join(failed))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
