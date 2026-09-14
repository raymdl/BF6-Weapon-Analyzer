"""Inventory the record types in raw BF6 material-grid EBX streams.

Research evidence only; the site does not read this output. Type names come from
Frosty's FrostyPlugin/Sdk/ClassGuids.txt, matched by type GUID (field-name hashes in
BF6 do not match FNV-1/FNV-1a, CRC32, Murmur3, xxHash32, djb2 or one-at-a-time).
Never decode a material grid with Frosty's object reader; this uses the bounded raw
reader from frosty-hit-zones.py.

Usage:
  python scripts/frosty-material-grid-inventory.py --descriptors <SharedTypeDescriptors.ebx>
    --class-guids <ClassGuids.txt> --grid <raw grid> --grid <raw grid> --out <report.json>
"""
import argparse
import hashlib
import importlib.util
import json
import struct
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("hit_zones", ROOT / "scripts/frosty-hit-zones.py")
hz = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hz)

HIT_ZONES_REPORT = "reference-data/provenance/frosty-hit-zones-2026-09-13.json"
# Upper 12 bits of the packed materials in GlacierSoldierBoneCollision.xml.
SOLDIER_MATERIALS = {24: "head", 25: "abdomen", 26: "limb", 115: "bone material 115", 580: "secondary bone material 580"}
DAMAGE, PENETRATION = "d4177d69", "7d765f18"
PROTECTION_ARRAY, COLLATERAL_ARRAY = "c180226c", "6aa794ef"
# Names assigned by offset: the descriptor's Float32 and Boolean fields after the base fields
# match ClassGuids' six Float32 and two Boolean names in count, type and order.
DAMAGE_FIELDS = [("CollisionDamageMultiplier", 28, "f"), ("CollisionDamageThreshold", 32, "f"),
                 ("DamageProtectionMultiplier", 36, "f"), ("DamagePenetrationMultiplier", 40, "f"),
                 ("DamageProtectionThreshold", 44, "f"), ("ExplosionCoverDamageModifier", 48, "f"),
                 ("InflictsDemolitionDamage", 52, "b"), ("AllowClientDestruction", 53, "b")]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def class_names(path):
    classes, current = {}, None
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        parts = line.split(",")
        if len(parts) == 3 and parts[2].isdigit():
            current = classes[uuid.UUID(parts[0]).bytes_le[4:].hex()] = {"name": parts[1], "fields": []}
        elif len(parts) == 2 and current is not None:
            current["fields"].append(parts[1])
    return classes


def projectile_materials():
    report = json.loads((ROOT / HIT_ZONES_REPORT).read_text(encoding="utf-8"))
    materials = {}
    for weapon, row in report["weapons"].items():
        materials.setdefault(row["baseProjectile"]["material"], set()).add(weapon)
        for ammo, choice in row["ammo"].items():
            if choice.get("projectileSwap"):
                materials.setdefault(choice["projectileSwap"]["material"], set()).add(f"{weapon}:{ammo}")
    return {m: sorted(w) for m, w in sorted(materials.items())}


class Inventory:
    def __init__(self, path, types, names):
        self.grid = hz.MaterialGrid(Path(path), types)
        keys = {}
        for key, entry in types.items():
            if entry:
                keys.setdefault(entry["hash"], key)
        self.names = {h: (names.get(k[:24]) or {}).get("name") for h, k in keys.items()}

    def f32(self, offset):
        return round(struct.unpack_from("<f", self.grid.data, self.grid.data_start + offset)[0], 6)

    def record(self, offset, type_hash):
        g = self.grid
        if type_hash == DAMAGE:
            return {"type": "MaterialRelationDamageData", **{name: self.f32(offset + at) if kind == "f"
                    else bool(g.data[g.data_start + offset + at]) for name, at, kind in DAMAGE_FIELDS}}
        if type_hash == PENETRATION:
            return {"type": "MaterialRelationPenetrationData", "NeverPenetrate": bool(g.data[g.data_start + offset + 24])}
        if type_hash in (PROTECTION_ARRAY, COLLATERAL_ARRAY):
            values, count, _ = g.array(offset + 24)
            label = "protection array (c180226c)" if type_hash == PROTECTION_ARRAY else "collateral array (6aa794ef)"
            return {"type": label, "values": [self.f32(values + 4 * i) for i in range(count)]}
        return {"type": self.names.get(type_hash) or type_hash}

    def cell(self, source, target):
        g = self.grid
        if max(source, target) >= len(g.index_map) or g.index_map[source] >= g.row_count:
            return None
        row, columns, _ = g.array(g.rows_offset + 8 * g.index_map[source])
        if g.index_map[target] >= columns:
            return None
        records = []
        for side in (0, 8):
            groups, group_count, _ = g.array(row + 16 * g.index_map[target] + side)
            for i in range(group_count):
                items, item_count, _ = g.array(groups + 8 * i)
                for j in range(item_count):
                    try:
                        offset, entry = g.pointer(items + 16 * j)
                    except ValueError:
                        continue
                    if entry:
                        records.append({"list": side // 8, **self.record(offset, entry["hash"])})
        return sorted(records, key=lambda r: json.dumps(r, sort_keys=True))

    def type_table(self):
        g = self.grid
        objects = Counter(t["hash"] for t in g.objects.values() if t)
        cells = Counter()
        for row_index in range(g.row_count):
            row, columns, _ = g.array(g.rows_offset + 8 * row_index)
            for column in range(columns):
                seen = set()
                for side in (0, 8):
                    groups, group_count, _ = g.array(row + 16 * column + side)
                    for i in range(group_count):
                        items, item_count, _ = g.array(groups + 8 * i)
                        for j in range(item_count):
                            try:
                                seen.add(g.pointer(items + 16 * j)[1]["hash"])
                            except (ValueError, TypeError):
                                pass
                cells.update(seen)
        sample = {t["hash"]: t for t in g.objects.values() if t}
        return [{"hash": h, "class": self.names.get(h), "objects": n, "cells": cells.get(h, 0),
                 "fieldHashes": [f["hash"] for f in sample[h]["fields"]]} for h, n in objects.most_common()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--descriptors", type=Path, required=True)
    parser.add_argument("--class-guids", type=Path, required=True)
    parser.add_argument("--grid", type=Path, action="append", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    types, descriptors_sha = hz.type_descriptors(args.descriptors)
    names = class_names(args.class_guids)
    grids = [Inventory(path, types, names) for path in args.grid]
    materials = projectile_materials()

    soldier, disagreements = {}, []
    for material, weapons in materials.items():
        row = {"weapons": weapons}
        for target, label in SOLDIER_MATERIALS.items():
            per_grid = [inv.cell(material, target) for inv in grids]
            if any(cell != per_grid[0] for cell in per_grid[1:]):
                disagreements.append(f"{material}/{target}")
            row[label] = per_grid[0]
        soldier[str(material)] = row

    surfaces = {}
    for material in materials:
        inv, can, never, multiplier = grids[0], [], 0, Counter()
        for target in range(len(inv.grid.index_map)):
            for record in inv.cell(material, target) or []:
                if record["type"] == "MaterialRelationPenetrationData":
                    if record["NeverPenetrate"]:
                        never += 1
                    else:
                        can.append(target)
                if record["type"] == "MaterialRelationDamageData":
                    multiplier[record["DamagePenetrationMultiplier"]] += 1
        surfaces[str(material)] = {"canPenetrateTargets": can, "neverPenetrateCount": never,
                                   "damagePenetrationMultiplierCounts": {str(k): v for k, v in multiplier.most_common()}}

    report = {
        "scope": "Research inventory of material-grid record types and projectile-to-soldier/surface records. Not used by the site; semantics of legacy records are unverified.",
        "method": [
            "Read raw EBX with the bounded MaterialGrid reader from scripts/frosty-hit-zones.py.",
            "Name types by matching descriptor GUIDs with FrostyPlugin/Sdk/ClassGuids.txt (GUID bytes 4-15).",
            "Name MaterialRelationDamageData fields by offset: six Float32 and two Boolean descriptor fields match ClassGuids' names in count, type and order. Offsets 56 and 64 are BF6 fields without names.",
            "Projectile materials come from the hit-zones report (base projectiles and ammo swaps).",
            "Soldier materials are the upper 12 bits of GlacierSoldierBoneCollision packed materials.",
        ],
        "inputs": {"descriptorsSha256": descriptors_sha, "classGuidsSha256": sha(args.class_guids),
                   "hitZonesReportSha256": sha(ROOT / HIT_ZONES_REPORT),
                   "grids": [{"file": p.name, "sha256": inv.grid.sha256} for p, inv in zip(args.grid, grids)],
                   "gridRoutes": ["game/glaciermp/levels/mp_abbasid/mp_abbasid/materialgrid_win32",
                                  "game/glaciermp/levels/mp_badlands/mp_badlands/materialgrid_win32"]},
        "observations": [
            "65 record types; 31 have ClassGuids names. Earlier site work used only the protection array (c180226c) and collateral array (6aa794ef), both without ClassGuids names.",
            "MaterialRelationDamageData.DamageProtectionMultiplier for soldier materials differs from the protection arrays the site uses (for example Interdictor limb 0.8 vs 0.67; automatic limb 1.0 vs 0.84). The VSSM in-game limb observation supports the protection array. Treat the damage record as not proven live.",
            "Secondary bone material 580 has protection 0 for every weapon projectile material.",
            "Most bullet materials can penetrate 7 target materials; materials 290, 351 and 781 can penetrate 27. Target material names are not resolved.",
        ],
        "openQuestions": ["Which asset names grid material IDs?", "Which runtime path reads MaterialRelationDamageData versus the protection arrays?",
                          "What do DamagePenetrationMultiplier and CanPenetrate mean for damage after passing through a surface?"],
        "gridAgreement": {"soldierPairsCompared": len(materials) * len(SOLDIER_MATERIALS), "disagreements": disagreements},
        "types": grids[0].type_table(),
        "soldierPairs": soldier,
        "surfacePenetration": surfaces,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"types": len(report["types"]), "named": sum(bool(t["class"]) for t in report["types"]),
                      "disagreements": len(disagreements)}))


if __name__ == "__main__":
    main()
