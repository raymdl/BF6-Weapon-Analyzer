"""Check headshot, collateral and regen-delay stats against the by-class ammo rules.

These three stats are determined by weapon class and equipped ammunition, not by the attachment
being inspected, so they are checkable corpus-wide without re-reading screenshots. A record that
disagrees with its class rule is either a bad transcription or a genuine exception, and this
narrows a 3,177-record corpus down to the handful worth reading by eye.

Non-ammo records are evaluated against the Standard-ammo row: the stat panel shows the loadout as
configured while inspecting that attachment, and the ammo slot sits at its default there.

    python scripts/validate-ammo-stat-rules.py [--out PATH] [--csv]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEW = ROOT / "migration" / "1.3.3.0" / "attachment-audit" / "attachment-screenshot-review.json"

# Ammo subtypes and shotgun ammo names map onto the rule vocabulary. Shotguns file every shell
# under the Standard subtype, so they key on the attachment name instead.
AMMO_KEY = {
    "Standard": "Standard", "Penetration": "Penetration", "Lightweight": "Lightweight",
    "Frangible": "Frangible", "Hollow Point": "Hollow Point", "Synthetic": "Synthetic",
    "Subsonic": "Subsonic", "Sub HP": "Subsonic HP", "Long-range": "Long-Range",
    "Sub Pen": "Subsonic Tungsten", "Range Pen": "Penetration",
}

# The subtype field does not separate the match-grade rounds from the penetration rounds: Match
# Grade files under both `Long-range` and `Range Pen`, and `Range Pen` also holds Tungsten Match.
# The attachment name does separate them, so it wins wherever it is one of these.
AMMO_NAME_KEY = {
    "Tungsten Core": "Penetration",
    "Tungsten Match": "Penetration",
    "Match Grade": "Long-Range",
    "Subsonic Tungsten": "Subsonic Tungsten",
}

# Two weapons do not sit on Standard in the ammo slot, so their non-ammo captures show a
# different row. The GRT-CPS ships with Hollow Point. The VSSM has no Standard ammo at all — its
# set is Tungsten Match, Tungsten Core, Match Grade and Frangible — and its non-ammo captures read
# collateral 1.00, which is its Tungsten Core value, so it defaults to Penetration.
DEFAULT_AMMO = {"GRT-CPS": "Hollow Point", "VSSM": "Penetration"}

# Per-weapon departures from the class tables, confirmed against screenshots. The GRT-CPS needs
# no headshot entry: its Hollow Point value is the class value now that the dmr_low table is right.
WEAPON_HEADSHOT = {}
# The PW7A2 and USG-90 sit one tier above the SMG/Sidearm table on every ammo row: 0.67 where the
# class says 0.57, 0.83 where it says 0.75, 0.57 where it says 0.50. Both confirmed by the user.
SPECIAL_SMG_COLLATERAL = {
    "Standard": 0.67, "Subsonic Tungsten": 0.67, "Penetration": 0.83,
    "Frangible": 0.57, "Hollow Point": 0.57, "Synthetic": 0.57,
    "Subsonic": 0.57, "Subsonic HP": 0.57,
}
WEAPON_COLLATERAL = {
    "GRT-CPS": {"Hollow Point": 0.67, "Standard": 0.75},
    "PW7A2": SPECIAL_SMG_COLLATERAL,
    "USG-90": SPECIAL_SMG_COLLATERAL,
    "ES 5.7": {"Standard": 0.67},
    # These two hold their Standard value on the frangible/hollow-point rows rather than dropping
    # a tier, unlike their classmates. Both user-confirmed.
    "M45A1": {"Frangible": 0.57, "Hollow Point": 0.57},
    "M121 A2": {"Frangible": 0.75, "Hollow Point": 0.75},
}

# EA has acknowledged that these weapons' stat screens understate the headshot multiplier; the
# in-game value is the class value, so the screenshot is not authoritative here.
BUGGED_HEADSHOT_SCREEN = {"EF88", "BROD 3"}
SHOTGUN_KEY = {
    "#00 Buckshot": "Buckshot", "#01 Buckshot": "Buckshot", "Buckshot": "Buckshot",
    "Slugs": "Slugs", "Flechette": "Flechette",
}

DMR_LOW = {"GRT-CPS", "LMR27"}
DMR_MID = {"M39 EMR", "SVDM", "SVK-8.6"}
DMR_VSSM = {"VSSM"}
FULL_AUTO_CLASSES = {"Assault Rifle", "Carbine", "SMG", "LMG"}
FULL_AUTO_SIDEARMS = {"VZ. 61"}

HEADSHOT = {
    "sniper":   {None: 1.75},
    "dmr_low":  {"Standard": 1.34, "Penetration": 1.34, "Lightweight": 1.34, "Frangible": 1.34,
                 "Long-Range": 1.34, "Hollow Point": 1.50, "Synthetic": 1.75},
    "dmr_mid":  {"Standard": 1.50, "Penetration": 1.50, "Lightweight": 1.50, "Frangible": 1.50,
                 "Long-Range": 1.50, "Hollow Point": 1.75},
    "dmr_vssm": {None: 1.80},
    "shotgun":  {"Buckshot": 1.00, "Flechette": 1.00, "Slugs": 1.34},
    "fullauto": {"Standard": 1.40, "Penetration": 1.40, "Lightweight": 1.40, "Frangible": 1.40,
                 "Hollow Point": 1.57, "Subsonic HP": 1.57, "Synthetic": 1.80},
}

COLLATERAL = {
    # Long-Range sits with Standard and Lightweight at 0.75, confirmed across all 8 Match Grade
    # records and stated for the VSSM.
    "heavy":   {"Hollow Point": 0.67, "Frangible": 0.67, "Synthetic": 0.67,
                "Standard": 0.75, "Lightweight": 0.75, "Long-Range": 0.75, "Penetration": 1.00},
    "light":   {"Frangible": 0.50, "Hollow Point": 0.50, "Subsonic": 0.50, "Subsonic HP": 0.50,
                "Standard": 0.57, "Penetration": 0.75},
    "shotgun": {"Buckshot": 0.33, "Slugs": 0.33, "Flechette": 0.57},
}

REGEN = {"Flechette": 7, "Frangible": 9}
REGEN_DEFAULT = 5


def headshot_group(weapon, cls):
    if cls == "Sniper Rifle":
        return "sniper"
    if cls == "DMR":
        if weapon in DMR_VSSM:
            return "dmr_vssm"
        if weapon in DMR_LOW:
            return "dmr_low"
        if weapon in DMR_MID:
            return "dmr_mid"
        return None
    if cls == "Shotgun":
        return "shotgun"
    if cls in FULL_AUTO_CLASSES or weapon in FULL_AUTO_SIDEARMS:
        return "fullauto"
    return None  # semi-auto sidearms have no stated rule


def collateral_group(cls):
    if cls == "Shotgun":
        return "shotgun"
    if cls in ("SMG", "Sidearm"):
        return "light"
    if cls in ("Assault Rifle", "Carbine", "LMG", "DMR", "Sniper Rifle"):
        return "heavy"
    return None


def ammo_of(record, cls):
    """The ammo the stat panel reflects: the record's own for Ammo rows, else the default."""
    if record.get("attachmentType") != "Ammo":
        return DEFAULT_AMMO.get(record["weaponName"], "Standard")
    if cls == "Shotgun":
        return SHOTGUN_KEY.get(record.get("attachmentName"))
    name = record.get("attachmentName")
    if name in AMMO_NAME_KEY:
        return AMMO_NAME_KEY[name]
    return AMMO_KEY.get(record.get("attachmentSubtype"))


def load():
    review = json.loads(REVIEW.read_text(encoding="utf-8"))
    rows = []
    for record in review["records"]:
        if record.get("attachmentType") in (None, "Overview"):
            continue
        match = re.search(r"Weapon Attachments[\\/]([^\\/]+)[\\/]", record["source"]["currentPath"])
        rows.append((record, match.group(1) if match else None))
    return rows


def check(rows):
    findings, unmapped = [], Counter()
    for record, cls in rows:
        stats = record.get("stats") or {}
        ammo = ammo_of(record, cls)
        if ammo is None:
            unmapped[f"{cls} / {record.get('attachmentSubtype')} / {record.get('attachmentName')}"] += 1
            continue

        weapon = record["weaponName"]
        group = headshot_group(weapon, cls)
        table = HEADSHOT.get(group) or {}
        expected = WEAPON_HEADSHOT.get(weapon, {}).get(ammo, table.get(None, table.get(ammo)))
        actual = stats.get("headshotMultiplier")
        if expected is not None and actual is not None and abs(actual - expected) > 1e-9:
            findings.append((record, cls, ammo, "headshotMultiplier", actual, expected))

        table = COLLATERAL.get(collateral_group(cls)) or {}
        expected = WEAPON_COLLATERAL.get(weapon, {}).get(ammo, table.get(ammo))
        actual = stats.get("collateralMultiplier")
        if expected is not None and actual is not None and abs(actual - expected) > 1e-9:
            findings.append((record, cls, ammo, "collateralMultiplier", actual, expected))

        # Only the ammo slot drives regen delay, and the ammo slot sat at its default while the
        # other attachment types were captured, so every non-ammo record should read 5s.
        expected = REGEN.get(ammo, REGEN_DEFAULT) if record.get("attachmentType") == "Ammo" else REGEN_DEFAULT
        actual = stats.get("opponentHealthRegenDelaySeconds")
        if actual is not None and abs(actual - expected) > 1e-9:
            findings.append((record, cls, ammo, "opponentHealthRegenDelaySeconds", actual, expected))
    return findings, unmapped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out")
    args = parser.parse_args()

    rows = load()
    findings, unmapped = check(rows)
    print(f"checked {len(rows)} non-overview records")
    print(f"rule violations: {len(findings)}\n")

    by_field = Counter(item[3] for item in findings)
    for field, count in by_field.most_common():
        print(f"  {field}: {count}")
    print()

    grouped = defaultdict(list)
    for record, cls, ammo, field, actual, expected in findings:
        grouped[(cls, record["weaponName"], field, actual, expected)].append(record)
    print(f"{'class':<14}{'weapon':<13}{'field':<32}{'is':>8}{'should be':>11}   records")
    for (cls, weapon, field, actual, expected), items in sorted(
            grouped.items(), key=lambda kv: (-len(kv[1]), kv[0][1])):
        print(f"  {cls:<12}{weapon:<13}{field:<32}{actual:>8}{expected:>11}   {len(items)}")

    if unmapped:
        print("\nammo combinations with no stated rule (skipped):")
        for key, count in unmapped.most_common():
            print(f"  {key}  x{count}")

    if args.out:
        payload = [{
            "weapon": r["weaponName"], "class": cls, "attachmentType": r.get("attachmentType"),
            "attachmentName": r.get("attachmentName"), "ammoRuleKey": ammo, "field": field,
            "recordHolds": actual, "ruleExpects": expected,
            "screenshot": r["source"]["currentPath"],
        } for r, cls, ammo, field, actual, expected in findings]
        Path(args.out).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"\nwrote {args.out}")


if __name__ == "__main__":
    main()
