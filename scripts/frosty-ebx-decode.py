"""Decode a BF6 RIFF EBX stream using SharedTypeDescriptors only.

The Frosty SDK resolves a top-level instance type by its class GUID, and in BF6 that
GUID embeds the type's layout signature. When a game update changes a layout the GUID
moves, the stale SDK cannot resolve it, and Frosty writes
"<!-- Object could not be loaded (unknown type) -->" instead of the object. This reader
takes the layout from the build's own SharedTypeDescriptors.ebx, so it does not depend
on the SDK and cannot silently read a changed type with stale offsets.

Output is a JSON tree keyed by the same Class_/Struct_/Field_ hash names that the Frosty
XML exporter uses, so results are comparable with the existing XML evidence. Names are
hashes: this decodes layout, never semantics.

Scope: EBX version 6 (RIFF) only. Values this reader cannot resolve are recorded as an
explicit marker object rather than guessed.
"""
import argparse
import hashlib
import json
import struct
from pathlib import Path

INHERITED, DBOBJECT, STRUCT, POINTER, ARRAY, FIXEDARRAY = 0x00, 0x01, 0x02, 0x03, 0x04, 0x05
STRING, CSTRING, ENUM, FILEREF, BOOLEAN = 0x06, 0x07, 0x08, 0x09, 0x0A
INT8, UINT8, INT16, UINT16, INT32, UINT32 = 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
UINT64, INT64, FLOAT32, FLOAT64 = 0x11, 0x12, 0x13, 0x14
GUID, SHA1, RESOURCEREF, FUNCTION, TYPEREF, BOXEDVALUEREF = 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A

SIMPLE = {
    BOOLEAN: ("<?", 1), INT8: ("<b", 1), UINT8: ("<B", 1),
    INT16: ("<h", 2), UINT16: ("<H", 2), INT32: ("<i", 4), UINT32: ("<I", 4),
    INT64: ("<q", 8), UINT64: ("<Q", 8), FLOAT32: ("<f", 4), FLOAT64: ("<d", 8),
}
CATEGORY_ARRAY = 4
MAX_ARRAY_COUNT = 1 << 20


def debug_type(flags):
    """'flags' is the descriptor's u16 already shifted right by one, matching
    FrostySdk EbxField.Type. DebugType and DebugCategory derive from it directly."""
    return (flags >> 4) & 0x1F


def debug_category(flags):
    return flags & 0xF


class Cursor:
    def __init__(self, data, position=0):
        self.data, self.position = data, position

    def take(self, n):
        chunk = self.data[self.position:self.position + n]
        if len(chunk) != n:
            raise ValueError("EBX stream ended early")
        self.position += n
        return chunk

    def u16(self):
        return struct.unpack_from("<H", self.take(2))[0]

    def u32(self):
        return struct.unpack_from("<I", self.take(4))[0]

    def i32(self):
        return struct.unpack_from("<i", self.take(4))[0]

    def array(self, read):
        return [read() for _ in range(self.u32())]


def type_descriptors(path):
    """Parse SharedTypeDescriptors.ebx into index-ordered classes plus a GUID map."""
    data = Path(path).read_bytes()
    cursor = Cursor(data, 20)
    guids = cursor.array(lambda: cursor.take(20)[4:].hex())
    classes = cursor.array(lambda: {"hash": f"{cursor.u32():08x}", "fieldIndex": cursor.u32(),
                                    "fieldCount": cursor.u16(), "type": cursor.u16() >> 1,
                                    "size": cursor.u16(), "alignment": cursor.u16()})
    fields = cursor.array(lambda: {"hash": f"{cursor.u32():08x}", "offset": cursor.u32(),
                                   "flags": cursor.u16() >> 1, "classRef": cursor.u16()})
    for cls in classes:
        cls["fields"] = fields[cls["fieldIndex"]:cls["fieldIndex"] + cls["fieldCount"]]
    by_guid = {guid: cls for guid, cls in zip(guids, classes)}
    # A type name can have more than one layout entry. The per-asset type key selects
    # one; record the ambiguity so callers do not treat such objects as settled.
    counts = {}
    for cls in classes:
        counts[cls["hash"]] = counts.get(cls["hash"], 0) + 1
    ambiguous = {name for name, n in counts.items() if n > 1}
    return {"classes": classes, "byGuid": by_guid, "ambiguousNames": ambiguous,
            "sha256": hashlib.sha256(data).hexdigest()}


class Ebx:
    def __init__(self, path, types):
        self.data = Path(path).read_bytes()
        self.types = types
        self.path = str(path)
        self.sha256 = hashlib.sha256(self.data).hexdigest()
        self._parse_header()

    # -- header ----------------------------------------------------------------
    def _parse_header(self):
        d = self.data
        if struct.unpack_from("<I", d, 0)[0] != 0x46464952:      # "RIFF"
            raise ValueError("not a RIFF EBX")
        if d[8:12] not in (b"EBX\x00", b"EBXS"):
            raise ValueError("not an EBX/EBXS payload")
        if d[12:16] != b"EBXD":
            raise ValueError("missing EBXD chunk")
        ebxd_size = struct.unpack_from("<I", d, 16)[0]
        ebxd_offset = 20
        self.data_start = (ebxd_offset + 15) & ~15
        pos = ebxd_offset + ebxd_size
        pos += pos % 2
        if d[pos:pos + 4] != b"EFIX":
            raise ValueError("missing EFIX chunk")
        efix_size = struct.unpack_from("<I", d, pos + 4)[0]
        c = Cursor(d, pos + 8)
        efix_offset = c.position

        self.file_guid = c.take(16)
        raw_guids = c.array(lambda: c.take(16))
        signatures = c.array(lambda: c.take(4))
        # The lookup GUID is class GUID bytes 4..15 followed by the 4-byte signature.
        self.class_keys = [(g[4:] + s).hex() for g, s in zip(raw_guids, signatures)]

        self.exported_count = c.u32()
        self.data_offsets = []
        self.instances = []
        for i in range(c.u32()):
            offset = c.u32()
            self.data_offsets.append(offset)
            class_ref = struct.unpack_from("<H", d, self.data_start + offset)[0]
            self.instances.append({"classRef": class_ref, "exported": i < self.exported_count})
        c.array(c.u32)                                            # pointer offsets
        c.array(c.u32)                                            # resource-ref offsets
        self.imports = c.array(lambda: (c.take(16).hex(), c.take(16)))
        c.array(c.u32)                                            # import offsets
        c.array(c.u32)                                            # type-info offsets
        self.arrays_offset = c.u32()
        self.boxed_offset = c.u32()
        self.strings_offset = c.u32() + self.data_start

        pos = efix_offset + efix_size
        if d[pos:pos + 4] != b"EBXX":
            raise ValueError("missing EBXX chunk")
        c = Cursor(d, pos + 8)
        array_count, boxed_count = c.u32(), c.u32()
        self.arrays = []
        for _ in range(array_count):
            offset, count, _hash = c.u32(), c.u32(), c.u32()
            c.u16(), c.u16()
            self.arrays.append({"offset": offset, "count": count})

    # -- descriptor access -----------------------------------------------------
    def class_by_index(self, index):
        classes = self.types["classes"]
        if index >= len(classes):
            raise ValueError(f"class index {index} out of range")
        return classes[index]

    def class_by_key(self, key):
        return self.types["byGuid"].get(key)

    # -- primitives ------------------------------------------------------------
    def _pad(self, alignment):
        if alignment and self.pos % alignment:
            self.pos += alignment - (self.pos % alignment)

    def _cstring(self):
        offset = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        if offset in (-1, 0):
            return ""
        start = self.pos - 4 + offset
        end = self.data.find(b"\x00", start) if 0 <= start < len(self.data) else -1
        if end < 0:
            return {"$badString": {"relativeOffset": offset, "resolved": start}}
        return self.data[start:end].decode("utf-8", "replace")

    def _pointer(self):
        index = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        if index == 0:
            return None
        if index & 1:
            file_guid, class_guid = self.imports[index >> 1]
            return {"$import": {"fileGuid": _guid(bytes.fromhex(file_guid)),
                                "classGuid": _guid(class_guid)}}
        target = self.pos - 4 + index - self.data_start
        if target in self.data_offsets:
            return {"$ref": self.data_offsets.index(target)}
        return {"$unresolvedRef": target}

    # -- field / class reading -------------------------------------------------
    def _read_field(self, parent, kind, class_ref):
        if kind in SIMPLE:
            fmt, size = SIMPLE[kind]
            value = struct.unpack_from(fmt, self.data, self.pos)[0]
            self.pos += size
            if kind == FLOAT32:
                value = round(value, 6)
            return value
        if kind == ENUM:
            value = struct.unpack_from("<i", self.data, self.pos)[0]
            self.pos += 4
            return value
        if kind == GUID:
            return _guid(self._take(16))
        if kind == SHA1:
            return self._take(20).hex()
        if kind in (CSTRING, STRING):
            return self._cstring()
        if kind == POINTER:
            return self._pointer()
        if kind == STRUCT:
            struct_type = self.class_by_index(class_ref)
            self._pad(struct_type["alignment"])
            return self._read_class(struct_type, self.pos)
        if kind == TYPEREF:
            raw = struct.unpack_from("<I", self.data, self.pos)[0]
            self.pos += 8
            return {"$typeRef": raw}
        if kind == RESOURCEREF:
            value = struct.unpack_from("<Q", self.data, self.pos)[0]
            self.pos += 8
            return {"$resourceRef": f"{value:016x}"}
        if kind == FILEREF:
            return {"$fileRef": self._cstring()}
        if kind == BOXEDVALUEREF:
            self.pos += 8
            return {"$boxedValueRef": True}
        self.pos += 4
        return {"$undecoded": f"type 0x{kind:02x}"}

    def _take(self, n):
        chunk = self.data[self.pos:self.pos + n]
        self.pos += n
        return chunk

    def _read_class(self, class_type, start_offset):
        """Read one class body. Fields are placed at absolute offsets from the object
        start, exactly as EbxReaderRiff.ReadClass does; do not read them sequentially."""
        out = {}
        if class_type["hash"] in self.types["ambiguousNames"]:
            out["$layoutAmbiguous"] = True
            self._layout_ambiguous = True
        for field in class_type["fields"]:
            kind = debug_type(field["flags"])
            category = debug_category(field["flags"])
            name = f"Field_{field['hash']}"
            if kind == INHERITED:
                parent = self.class_by_index(field["classRef"])
                out.update(self._read_class(parent, start_offset))
                continue
            self.pos = start_offset + field["offset"]
            if category == CATEGORY_ARRAY:
                out[name] = self._read_array(kind, field["classRef"])
            else:
                out[name] = self._read_field(class_type, kind, field["classRef"])
        self.pos = start_offset + class_type["size"]
        self._pad(class_type["alignment"])
        return out

    def _read_array(self, kind, class_ref):
        array_pos = self.pos
        offset = struct.unpack_from("<i", self.data, self.pos)[0]
        resolved = (array_pos - self.data_start + offset) & 0xFFFFFFFF
        if offset == 0 or resolved == self.arrays_offset + 0x10:
            return []
        entry = next((a for a in self.arrays if a["offset"] == resolved), None)
        if entry is None:
            return {"$unresolvedArray": {"relativeOffset": offset, "resolved": resolved}}
        count = entry["count"]
        if count > MAX_ARRAY_COUNT:
            return {"$badArrayCount": count}
        self.pos = self.data_start + entry["offset"]
        items = []
        for _ in range(count):
            items.append(self._read_field(None, kind, class_ref))
            if kind in (POINTER, CSTRING):
                self._pad(8)
        self.pos = array_pos
        return items

    # -- public ----------------------------------------------------------------
    def decode(self):
        objects, unresolved = [], []
        for i, inst in enumerate(self.instances):
            key = self.class_keys[inst["classRef"]]
            class_type = self.class_by_key(key)
            offset = self.data_start + self.data_offsets[i]
            if class_type is None:
                unresolved.append({"index": i, "typeKey": key})
                objects.append({"$unknownType": key})
                continue
            self.pos = offset
            guid = None
            if inst["exported"]:
                guid = _guid(self.data[offset - 16:offset])
            self._layout_ambiguous = False
            body = self._read_class(class_type, offset)
            record = {"$class": f"Class_{class_type['hash']}", "$guid": guid}
            if self._layout_ambiguous:
                record["$layoutAmbiguous"] = True
            record.update(body)
            objects.append(record)
        return {"file": self.path, "sha256": self.sha256,
                "fileGuid": _guid(self.file_guid), "objects": objects,
                "unresolvedTypes": unresolved}


def _guid(raw):
    a, b, c = struct.unpack_from("<IHH", raw, 0)
    return f"{a:08x}-{b:04x}-{c:04x}-{raw[8:10].hex()}-{raw[10:16].hex()}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--descriptors", type=Path, required=True)
    parser.add_argument("--ebx", type=Path, action="append", default=[])
    parser.add_argument("--ebx-list", type=Path,
                        help="file of .ebx paths, one per line, for large batches")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--root", type=Path, help="strip this prefix from recorded paths")
    args = parser.parse_args()
    targets = list(args.ebx)
    if args.ebx_list:
        targets += [Path(line.strip()) for line in
                    args.ebx_list.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not targets:
        parser.error("give at least one --ebx or an --ebx-list")
    types = type_descriptors(args.descriptors)
    results, failures = {}, []
    for path in targets:
        key = str(path.relative_to(args.root)) if args.root else str(path)
        key = key.replace("\\", "/")
        if key.lower().endswith(".ebx"):
            key = key[:-4]
        try:
            results[key] = Ebx(path, types).decode()
        except Exception as error:
            failures.append({"file": key, "error": f"{type(error).__name__}: {error}"})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(
        {"descriptorsSha256": types["sha256"], "assets": results, "failures": failures},
        indent=1), encoding="utf-8")
    print(json.dumps({"decoded": len(results), "failed": len(failures)}))


if __name__ == "__main__":
    main()
