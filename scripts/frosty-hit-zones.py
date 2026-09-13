"""Extract per-weapon, per-ammo headshot and limb multipliers from Frosty data.

Inputs are a Frosty XML export, raw material-grid EBX streams, and Frosty's
SharedTypeDescriptors.ebx. Dump the grids with scripts/frosty-raw-assets.ps1.
Never open a material grid with Frosty's EBX object decoder: it runs out of
memory. This script reads the grid's raw arrays and relative pointers directly.

Chain per weapon and ammo:
  weapon WB -> primary projectile -> MaterialDecl (upper 12 bits = material ID)
  ammo attachment -> selector modifiers -> protection steps and projectile swaps
  material grid (projectile material x soldier bone material) -> protection array
  headshot = head array[DamageProtectionMultiplierIndex + protection steps]
  limb     = limb array (one value; abdomen must match)

Field names are stripped in BF6 exports. The type and field hashes below were
identified by complete matches: the head array reproduces every panel headshot
multiplier, and limb values reproduce the existing class values and the VSSM
in-game observation. The native lookup code was not disassembled.
"""
import argparse
from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = "Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons.xml"
BONES = "Common/Gameplay/Soldier/GlacierSoldierBoneCollision.xml"
EXTERNAL = re.compile(r"\[Ebx\]\s+([^\[]+?)\s+\[([0-9a-fA-F-]{36})\]")
PRIMARY_PROJECTILE = "Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c"
MATERIAL_DECL = "Field_c7584f55/Struct_1e8e7eef/Field_48288193"
PROTECTION_INDEX_SUFFIX = "_WB.WeaponEntityData.WeaponFiring.PrimaryFire.Shot.DamageProtectionMultiplierIndex"
PROTECTION_MODIFIER_TYPE = "Class_e85fff64"   # WME_Protection_P10 / P20
PROTECTION_MODIFIER_STEP = "Field_fbfacac9"   # 1 for P10, 2 for P20
PROJECTILE_FIELD = "Field_808dd66c"
GRID_ROOT_TYPE = "dcb812fa"
GRID_INDEX_MAP_FIELD = "8e6ca5fc"
GRID_ROWS_FIELD = "24535855"
PROTECTION_RECORD_TYPE = "c180226c"
PROTECTION_VALUES_OFFSET = 24
FLOAT32_ARRAY_FLAGS = 616
HEAD_BONE, ABDOMEN_BONE = "Head", "Spine"
LIMB_BONES = ("LeftArm", "RightArm", "LeftForeArm", "RightForeArm", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg")
# Frosty ammo attachment suffix (after "_AMO_") -> site ammo ID.
AMMO_BY_SUFFIX = {
    "FMJ": "standard", "Tungsten": "penetration", "Frangible": "frangible", "HollowPoint": "hollow_pt",
    "BallisticTip": "synthetic", "PolymerCase": "lightweight", "Polymer_Case": "lightweight",
    "Match": "long_range", "MatchTungsten": "range_pen", "Subsonic": "subsonic",
    "SubsonicHollowPoint": "subsonic_hp", "SubsonicTungsten": "subsonic_pen",
    "Buckshot": "buckshot", "No00Buckshot": "buckshot_00", "Flechette": "flechette", "Slugs": "slugs",
}


class Cursor:
    def __init__(self, data, position):
        self.data, self.position = data, position

    def u32(self):
        value = struct.unpack_from("<I", self.data, self.position)[0]
        self.position += 4
        return value

    def u16(self):
        value = struct.unpack_from("<H", self.data, self.position)[0]
        self.position += 2
        return value

    def take(self, size):
        if self.position + size > len(self.data):
            raise ValueError("Read past end of file")
        value = self.data[self.position:self.position + size]
        self.position += size
        return value

    def array(self, read):
        count = self.u32()
        if count > len(self.data) // 4:
            raise ValueError("Invalid array count")
        return [read() for _ in range(count)]


def type_descriptors(path):
    data = path.read_bytes()
    cursor = Cursor(data, 20)
    guids = cursor.array(lambda: cursor.take(20)[4:].hex())
    classes = cursor.array(lambda: {"hash": f"{cursor.u32():08x}", "fieldIndex": cursor.u32(),
                                    "fieldCount": cursor.u16(), "type": cursor.u16() >> 1,
                                    "size": cursor.u16(), "alignment": cursor.u16()})
    fields = cursor.array(lambda: {"hash": f"{cursor.u32():08x}", "offset": cursor.u32(),
                                   "flags": cursor.u16() >> 1, "classRef": cursor.u16()})
    for cls in classes:
        cls["fields"] = fields[cls["fieldIndex"]:cls["fieldIndex"] + cls["fieldCount"]]
    return dict(zip(guids, classes)), hashlib.sha256(data).hexdigest()


class MaterialGrid:
    """Bounded raw reader for one material-grid EBX stream."""

    def __init__(self, path, types_by_guid):
        data = path.read_bytes()
        self.path, self.data = path, data
        self.sha256 = hashlib.sha256(data).hexdigest()
        chunks, position = {}, 12
        while position + 8 <= len(data):
            name = data[position:position + 4].decode("ascii")
            size = struct.unpack_from("<I", data, position + 4)[0]
            if position + 8 + size > len(data):
                raise ValueError(f"{path.name}: invalid RIFF chunk")
            chunks[name] = (position + 8, size)
            position += 8 + size
            position += position % 2
        fixup = Cursor(data, chunks["EFIX"][0])
        fixup.take(16)
        raw_guids = fixup.array(lambda: fixup.take(16))
        signatures = fixup.array(lambda: fixup.take(4))
        types = [types_by_guid.get((guid[4:] + signature).hex()) for guid, signature in zip(raw_guids, signatures)]
        fixup.u32()
        object_offsets = fixup.array(fixup.u32)
        fixup.array(fixup.u32)                       # pointer offsets
        fixup.array(fixup.u32)                       # resource offsets
        fixup.array(lambda: fixup.take(32))          # imports
        fixup.array(fixup.u32)                       # import offsets
        fixup.array(fixup.u32)                       # type offsets
        self.arrays_offset = fixup.u32()
        directory = Cursor(data, chunks["EBXX"][0])
        array_count = directory.u32()
        directory.u32()
        if array_count * 16 + 8 > chunks["EBXX"][1]:
            raise ValueError(f"{path.name}: invalid array directory")
        self.arrays = {}
        for _ in range(array_count):
            offset, count = directory.u32(), directory.u32()
            directory.u32()
            flags = directory.u16()
            directory.u16()
            self.arrays[offset] = (count, flags)
        self.data_start = -(-chunks["EBXD"][0] // 16) * 16
        self.objects = {offset: types[struct.unpack_from("<H", data, self.data_start + offset)[0]]
                        for offset in object_offsets}
        root_offset = object_offsets[0]
        root_type = self.objects[root_offset]
        if root_type is None or root_type["hash"] != GRID_ROOT_TYPE:
            raise ValueError(f"{path.name}: unexpected material-grid root type")
        field = {f["hash"]: f["offset"] for f in root_type["fields"]}
        map_offset, map_count, _ = self.array(root_offset + field[GRID_INDEX_MAP_FIELD])
        self.rows_offset, self.row_count, _ = self.array(root_offset + field[GRID_ROWS_FIELD])
        self.index_map = [self.u32(map_offset + 4 * i) for i in range(map_count)]

    def u32(self, offset):
        return struct.unpack_from("<I", self.data, self.data_start + offset)[0]

    def array(self, field_offset):
        delta = struct.unpack_from("<i", self.data, self.data_start + field_offset)[0]
        target = field_offset + delta
        if delta == 0 or target == self.arrays_offset + 16:
            return target, 0, None
        if target not in self.arrays:
            raise ValueError(f"{self.path.name}: unresolved array at {field_offset}")
        count, flags = self.arrays[target]
        return target, count, flags

    def pointer(self, field_offset):
        delta = struct.unpack_from("<i", self.data, self.data_start + field_offset)[0]
        if delta == 0 or delta & 1:
            raise ValueError(f"{self.path.name}: expected a local object pointer at {field_offset}")
        target = field_offset + delta
        if target not in self.objects:
            raise ValueError(f"{self.path.name}: unresolved object pointer at {field_offset}")
        return target, self.objects[target]

    def protection(self, source_material, target_material):
        if max(source_material, target_material) >= len(self.index_map):
            raise ValueError(f"{self.path.name}: material outside index map")
        row_index, column_index = self.index_map[source_material], self.index_map[target_material]
        if row_index >= self.row_count:
            raise ValueError(f"{self.path.name}: grid row outside table")
        row_offset, row_count, _ = self.array(self.rows_offset + 8 * row_index)
        if column_index >= row_count:
            raise ValueError(f"{self.path.name}: grid column outside row")
        cell = row_offset + 16 * column_index
        records = []
        for side in (0, 8):
            groups_offset, group_count, _ = self.array(cell + side)
            for group in range(group_count):
                items_offset, item_count, _ = self.array(groups_offset + 8 * group)
                for item in range(item_count):
                    object_offset, object_type = self.pointer(items_offset + 16 * item)
                    if object_type is None or object_type["hash"] != PROTECTION_RECORD_TYPE:
                        continue
                    values_offset, value_count, flags = self.array(object_offset + PROTECTION_VALUES_OFFSET)
                    if flags != FLOAT32_ARRAY_FLAGS or not 0 < value_count <= 32:
                        raise ValueError(f"{self.path.name}: unexpected protection array")
                    records.append([round(struct.unpack_from("<f", self.data, self.data_start + values_offset + 4 * k)[0], 6)
                                    for k in range(value_count)])
        if len(records) != 1:
            raise ValueError(f"{self.path.name}: expected one protection record for material {source_material}"
                             f" -> {target_material}, found {len(records)}")
        return records[0]


def load_attachment_graph():
    spec = importlib.util.spec_from_file_location("frosty_configuration", ROOT / "scripts/frosty-configuration.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.attachment_graph


def signed(raw):
    value = int(raw, 16)
    return value - (1 << 32) if value >= 1 << 31 else value


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", required=True, type=Path, help="Frosty XML export root")
    parser.add_argument("--grid", required=True, type=Path, action="append",
                        help="Raw material-grid EBX stream; repeat for cross-checks between levels")
    parser.add_argument("--descriptors", required=True, type=Path, help="Frosty SharedTypeDescriptors.ebx")
    parser.add_argument("--site", type=Path, default=ROOT)
    parser.add_argument("--identities", type=Path, default=ROOT / "reference-data/provenance/frosty-weapon-identities.json")
    parser.add_argument("--build-label", default="1.4.2.5", help="Game build label recorded with the output")
    parser.add_argument("--out", type=Path, default=ROOT / "data/hit_zones.json")
    parser.add_argument("--evidence", type=Path,
                        default=ROOT / f"reference-data/provenance/frosty-hit-zones-{date.today().isoformat()}.json")
    args = parser.parse_args()
    args.site, args.out, args.evidence = args.site.resolve(), args.out.resolve(), args.evidence.resolve()

    hashes, parsed = {}, {}

    def read_xml(relative):
        if relative not in parsed:
            data = (args.root / relative).read_bytes()
            hashes[relative] = hashlib.sha256(data).hexdigest()
            parsed[relative] = ET.fromstring(data)
        return parsed[relative]

    def object_by_guid(relative, guid):
        matches = [e for e in read_xml(relative) if e.get("Guid", "").lower() == guid.lower()]
        if len(matches) != 1:
            raise ValueError(f"Unresolved object {relative}#{guid}")
        return matches[0]

    def projectile(reference):
        match = EXTERNAL.fullmatch((reference or "").strip())
        if not match or "/_Bullets/" not in match[1]:
            raise ValueError(f"Not a projectile reference: {reference}")
        packed = int(object_by_guid(match[1] + ".xml", match[2]).findtext(MATERIAL_DECL), 16)
        return {"asset": match[1], "guid": match[2].lower(), "packedMaterial": f"0x{packed:08x}", "material": packed >> 20}

    types_by_guid, descriptors_sha = type_descriptors(args.descriptors)
    grids = [MaterialGrid(path, types_by_guid) for path in args.grid]

    def lookup(source, target):
        values = [grid.protection(source, target) for grid in grids]
        if any(v != values[0] for v in values[1:]):
            raise ValueError(f"Material grids disagree for {source} -> {target}: {values}")
        return values[0]

    bone_materials = {}
    for bone in read_xml(BONES).iter("Struct_72cbea90"):
        bone_materials[bone.findtext("Field_c6156e75")] = int(bone.findtext(MATERIAL_DECL), 16) >> 20
    limb_materials = {bone_materials[name] for name in LIMB_BONES}
    if len(limb_materials) != 1:
        raise ValueError(f"Limb bones use different materials: {limb_materials}")
    head_material, abdomen_material, limb_material = bone_materials[HEAD_BONE], bone_materials[ABDOMEN_BONE], limb_materials.pop()

    protection_index = {}
    for element in read_xml(REGISTRY):
        name = element.findtext("Field_0c59fa06") or ""
        if name.endswith(PROTECTION_INDEX_SUFFIX):
            protection_index[name[:-len(PROTECTION_INDEX_SUFFIX)]] = signed(element.findtext("Field_42c8b257").strip())

    site_weapons = {w["id"]: w for w in json.loads((args.site / "data/weapons.json").read_text(encoding="utf-8"))}
    site_ammo = json.loads((args.site / "data/ammo.json").read_text(encoding="utf-8"))["WEAPON_AMMO"]
    identities = {row["siteId"]: row["internalId"]
                  for row in json.loads(args.identities.read_text(encoding="utf-8"))["weapons"]}
    weapons_root = args.root / "Common/Hardware/Weapons"
    attachment_graph = load_attachment_graph()

    runtime, evidence_weapons, issues = {}, {}, []
    for site_id in sorted(site_weapons):
        internal = identities.get(site_id)
        if internal is None:
            raise ValueError(f"{site_id}: no Frosty identity")
        gs_files = list(weapons_root.rglob(f"GS_{internal}.xml"))
        if len(gs_files) != 1:
            raise ValueError(f"{site_id}: expected one GS_{internal}.xml, found {len(gs_files)}")
        wb_files = list(gs_files[0].parent.glob("*_WB.xml"))
        if len(wb_files) != 1:
            raise ValueError(f"{site_id}: expected one WB file")
        wb_xml = wb_files[0].relative_to(args.root).as_posix()
        gs_xml = gs_files[0].relative_to(args.root).as_posix()
        base_index = protection_index.get(internal)
        if base_index is None:
            raise ValueError(f"{site_id}: no DamageProtectionMultiplierIndex")
        base_projectile = projectile(read_xml(wb_xml).findtext(PRIMARY_PROJECTILE))

        rows, graph_issues = attachment_graph(args.root, [{"internalId": internal, "wbXml": wb_xml, "gsXml": gs_xml}], read_xml)
        ammo_attachments = {}
        for row in rows:
            name = Path(row["attachmentXml"]).stem
            if "_AMO_" not in name:
                continue
            suffix = name.split("_AMO_", 1)[1]
            ammo_id = AMMO_BY_SUFFIX.get(suffix)
            if ammo_id is None:
                issues.append({"weapon": site_id, "attachmentXml": row["attachmentXml"], "reason": "unmapped ammo suffix"})
                continue
            ammo_attachments.setdefault(ammo_id, []).append(row)

        def evaluate(row):
            steps, swaps, effect_sources = 0, [], []
            effects = {(e["sourceXml"], e["guid"].lower())
                       for branch in row["branches"] for action in branch["actions"]
                       for selector in action["selectors"] for modifier in selector["wbModifiers"]
                       for e in modifier["effects"]}
            for source, guid in sorted(effects):
                element = object_by_guid(source, guid)
                if element.tag == PROTECTION_MODIFIER_TYPE:
                    steps += signed(element.findtext(PROTECTION_MODIFIER_STEP).strip())
                    effect_sources.append(source)
                reference = element.findtext(PROJECTILE_FIELD)
                if reference and "/_Bullets/" in reference:
                    swaps.append(projectile(reference))
                    effect_sources.append(source)
            for branch in row["branches"]:
                for action in branch["actions"]:
                    for selector in action["selectors"]:
                        for binding in selector["gsBindings"]:
                            asset = (binding.get("modifier") or {}).get("asset", "")
                            if "HeadShotDamage" in asset or "/_Bullets/" in asset:
                                raise ValueError(f"{site_id}: hit-zone effect through a GS binding is not handled: {asset}")
            if len({s["material"] for s in swaps}) > 1:
                raise ValueError(f"{site_id}: conflicting projectile swaps in {row['attachmentXml']}")
            return steps, (swaps[0] if swaps else None), sorted(set(effect_sources))

        def resolve(material, index):
            head = lookup(material, head_material)
            limb = lookup(material, limb_material)
            abdomen = lookup(material, abdomen_material)
            if len(limb) != 1 or abdomen != limb:
                raise ValueError(f"{site_id}: limb/abdomen records differ or are not single values for material {material}")
            if not 0 <= index < len(head):
                raise ValueError(f"{site_id}: protection index {index} outside head table of {len(head)}")
            return head[index], limb[0], head, limb

        base_head, base_limb, base_head_table, _ = resolve(base_projectile["material"], base_index)
        weapon_ammo, weapon_evidence = {}, {}
        for ammo_id in site_ammo.get(site_id, {}).get("ammo", {}):
            candidates = ammo_attachments.get(ammo_id, [])
            if not candidates:
                issues.append({"weapon": site_id, "ammo": ammo_id,
                               "reason": "no Frosty ammo attachment; base projectile and protection index used"})
                weapon_ammo[ammo_id] = {"headshot": base_head, "limb": base_limb}
                weapon_evidence[ammo_id] = {"attachmentXml": None, "fallback": "base"}
                continue
            results = []
            for row in candidates:
                steps, swap, sources = evaluate(row)
                material = swap["material"] if swap else base_projectile["material"]
                head, limb, _, _ = resolve(material, base_index + steps)
                results.append((head, limb, steps, swap, sources, row["attachmentXml"]))
            if len({(r[0], r[1]) for r in results}) != 1:
                raise ValueError(f"{site_id}/{ammo_id}: attachments disagree: {[(r[5], r[0], r[1]) for r in results]}")
            head, limb, steps, swap, sources, attachment = results[0]
            weapon_ammo[ammo_id] = {"headshot": head, "limb": limb}
            weapon_evidence[ammo_id] = {"attachmentXml": [r[5] for r in results], "protectionSteps": steps,
                                        "projectileSwap": swap, "effectSources": sources}
        runtime[site_id] = {"protectionIndex": base_index, "projectileMaterial": base_projectile["material"],
                            "headshot": base_head, "limb": base_limb, "ammo": weapon_ammo}
        evidence_weapons[site_id] = {"internalId": internal, "wbXml": wb_xml, "gsXml": gs_xml,
                                     "baseProjectile": base_projectile, "protectionIndex": base_index,
                                     "headTable": base_head_table, "ammo": weapon_evidence,
                                     "graphIssues": graph_issues}

    source = {"build": args.build_label, "generatedBy": "scripts/frosty-hit-zones.py",
              "evidence": args.evidence.relative_to(args.site).as_posix() if args.evidence.is_relative_to(args.site) else str(args.evidence)}
    args.out.write_text(json.dumps({"schemaVersion": 1, "source": source, "weapons": runtime}, indent=2) + "\n", encoding="utf-8")
    evidence = {
        "schemaVersion": 1, "generated": date.today().isoformat(), **source,
        "method": __doc__.strip().splitlines(),
        "soldierMaterials": {"head": head_material, "abdomen": abdomen_material, "limb": limb_material, "limbBones": list(LIMB_BONES)},
        "grids": [{"file": grid.path.name, "sha256": grid.sha256, "bytes": len(grid.data),
                   "indexMap": len(grid.index_map), "rows": grid.row_count} for grid in grids],
        "descriptorsSha256": descriptors_sha,
        "sourceSha256": dict(sorted(hashes.items())),
        "issues": issues,
        "weapons": evidence_weapons,
    }
    args.evidence.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"weapons": len(runtime), "ammoEntries": sum(len(w["ammo"]) for w in runtime.values()),
                      "grids": len(grids), "issues": issues}, indent=2))


if __name__ == "__main__":
    main()
