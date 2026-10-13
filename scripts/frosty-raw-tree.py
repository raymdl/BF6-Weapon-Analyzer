"""Present raw EBX captures as the Frosty XML export tree the generator scripts walk.

A generator written against the XML export reads a pathlib root: it joins relative
".xml" paths, tests existence, globs, and parses each file with ElementTree. RawExport
offers the same surface over one or more raw capture folders, decoding each asset with
frosty-ebx-decode.py and building the element tree Frosty's EbxXmlWriter would have
written: same tags, Guid/Count/Index attributes, nesting and leaf text.

What cannot match the old export is kept visible instead of hidden:
  - fields the frozen SDK lacked are in the tree; absent_fields() lists them;
  - a class missing from the harvested order table falls back to descriptor offset
    order and is counted in RawExport.unlisted_classes;
  - values Frosty could not have printed from this data carry an explicit marker text.
Names are hashes, exactly as in the export: this reproduces layout, never semantics.
"""
import argparse
import atexit
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path, PureWindowsPath
import re
import sys
import xml.etree.ElementTree as ET

_spec = importlib.util.spec_from_file_location(
    "frosty_ebx_decode", Path(__file__).with_name("frosty-ebx-decode.py"))
decode = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(decode)

ORDER_TABLE = Path(__file__).resolve().parents[1] / "reference-data/frosty/xml-field-order.json"
# FrostySdk EbxFieldType member names, indexed by descriptor type value.
FIELD_TYPE_NAMES = ["Inherited", "DbObject", "Struct", "Pointer", "Array", "FixedArray", "String",
                    "CString", "Enum", "FileRef", "Boolean", "Int8", "UInt8", "Int16", "UInt16",
                    "Int32", "UInt32", "UInt64", "Int64", "Float32", "Float64", "Guid", "Sha1",
                    "ResourceRef", "Function", "TypeRef", "BoxedValueRef", "Interface", "Delegate"]
# Never opened: material grids are tens of GB when decoded.
FORBIDDEN_NAME = "materialgrid"


def float_text(value, digits):
    """.NET Framework Single/Double.ToString(): G7/G15, 'E' exponent, no negative zero."""
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "Infinity" if value > 0 else "-Infinity"
    if value == 0:
        return "0"
    # .NET rounds an exact tie away from zero; "%g" alone would round it to even.
    exact = Decimal(value)
    rounded = exact.quantize(Decimal(1).scaleb(exact.adjusted() - digits + 1), rounding=ROUND_HALF_UP)
    return ("%.*g" % (digits, float(rounded))).replace("e", "E")


def load_order_table(path=ORDER_TABLE):
    """Harvested export shape: class/struct tag -> field tags in the order Frosty wrote them."""
    table = json.loads(Path(path).read_text(encoding="utf-8"))["order"]
    return {tag: ["Field_" + name for name in fields.split()] for tag, fields in table.items()}


class TreeBuilder:
    """Build the export element tree of one decoded asset."""

    def __init__(self, types, path_by_guid, order_table, known_fields_only=False):
        self.types = types
        self.path_by_guid = path_by_guid
        self.order_table = order_table
        # Opt-in: leave out fields the harvested export shape of a class lacks, so the
        # tree holds what the frozen SDK showed. A class with no harvested shape is kept whole.
        self.known_fields_only = known_fields_only
        self.unlisted_classes = Counter()   # tag -> objects/structs built in descriptor order
        self.markers = Counter()            # marker kind -> values Frosty could not have printed
        self._plans = {}
        # A type reference can name a type by GUID alone, with no layout signature.
        # Every layout of one type shares the GUID tail, so the name is still determined.
        self.type_names = {}
        for key, class_type in types["byGuid"].items():
            name = self._type_name(class_type)
            self.type_names[key[:24]] = name if self.type_names.get(key[:24], name) == name else None

    def build(self, ebx, asset):
        self.ebx, self.objects = ebx, asset["objects"]
        root = ET.Element("File", {"Guid": asset["fileGuid"]})
        # A non-exported object has no GUID; the exporter prints its object index instead.
        self.identities = [(o.get("$class"), o.get("$guid") or "00000000-0000-0000-0000-%012x" % i)
                           for i, o in enumerate(self.objects)]
        for index, record in enumerate(self.objects):
            if "$unknownType" in record:
                self.markers["object of unknown type omitted"] += 1
                continue
            class_type = ebx.class_by_key(ebx.class_keys[ebx.instances[index]["classRef"]])
            tag, guid = self.identities[index]
            self._class(root, tag, class_type, record).set("Guid", guid)
        return root

    def _plan(self, tag, class_type):
        """Ordered (field tag, type, is array, class ref) rows for one class under one tag."""
        key = (tag, id(class_type))
        if key in self._plans:
            return self._plans[key]
        fields = {}

        def collect(cls):
            for field in cls["fields"]:
                kind = decode.debug_type(field["flags"])
                if kind == decode.INHERITED:
                    collect(self.ebx.class_by_index(field["classRef"]))
                else:
                    fields["Field_" + field["hash"]] = (field["offset"], kind,
                        decode.debug_category(field["flags"]) == decode.CATEGORY_ARRAY, field["classRef"])

        collect(class_type)
        names = sorted(fields, key=lambda name: fields[name][0])
        listed = self.order_table.get(tag)
        if listed is not None:
            # The exporter wrote SDK declaration order. It equals offset order except in
            # type names with more than one layout; fields the SDK lacked go last.
            rank = {name: position for position, name in enumerate(listed)}
            known = sorted((n for n in names if n in rank), key=rank.get)
            if self.known_fields_only:
                names = known
            elif known != [n for n in names if n in rank]:
                names = known + [n for n in names if n not in rank]
        plan = (listed is not None, [(name,) + fields[name][1:] for name in names])
        self._plans[key] = plan
        return plan

    def _class(self, parent, tag, class_type, values):
        element = ET.SubElement(parent, tag)
        listed, rows = self._plan(tag, class_type)
        if not listed:
            self.unlisted_classes[tag] += 1
        for name, kind, is_array, class_ref in rows:
            child = ET.SubElement(element, name)
            value = values.get(name)
            if not is_array:
                self._value(child, kind, class_ref, value)
            elif isinstance(value, list):
                child.set("Count", str(len(value)))
                for index, item in enumerate(value):
                    self._value(ET.SubElement(child, "member", {"Index": str(index)}), kind, class_ref, item)
            else:
                child.text = self._marker("unresolved array", value)
        return element

    def _marker(self, kind, value):
        self.markers[kind] += 1
        return f"[RawTree {kind}] {json.dumps(value, sort_keys=True)}"

    def _type_name(self, class_type):
        kind = decode.debug_type(class_type["type"])
        prefix = "Struct_" if kind == decode.STRUCT else "Enum_" if kind == decode.ENUM else "Class_"
        return prefix + class_type["hash"]

    def _type_ref(self, raw):
        if not raw:
            return "TypeRef '(null)'"
        if raw & 0x80000000:
            kind = (raw >> 5) & 0x1F
            return f"TypeRef '{FIELD_TYPE_NAMES[kind] if kind < len(FIELD_TYPE_NAMES) else kind}'"
        index, guids = raw >> 2, self.ebx.reference_type_guids
        if index >= len(guids):
            return self._marker("unresolved type reference", raw)
        tail = guids[index][:12] if index < len(self.ebx.class_keys) else guids[index][4:]
        name = self.type_names.get(tail.hex())
        if name is None:
            return self._marker("unresolved type reference", raw)
        return f"TypeRef '{name}'"

    def _boxed(self, value):
        meta = value.get("$boxedValue")
        if meta is None or value.get("value") is None and "kind" not in meta:
            if meta is None:
                self.markers["unresolved boxed value"] += 1
            return "BoxedValueRef '(null)'"
        kind = meta["kind"]
        if meta.get("category") == decode.CATEGORY_ARRAY:
            name = f"Array<{FIELD_TYPE_NAMES[kind]}>"
        elif kind == decode.ENUM:
            index = meta["entry"]["classRef"]
            class_type = self.ebx.class_by_key(self.ebx.class_keys[index]) if index < len(self.ebx.class_keys) else None
            name = "Enum_" + class_type["hash"] if class_type else str(index)
        elif kind == decode.STRUCT:
            name = "Struct_" + meta["class"].split("_", 1)[1]
        else:
            name = FIELD_TYPE_NAMES[kind]
        return f"BoxedValueRef '{name}'"

    def _value(self, element, kind, class_ref, value):
        if kind == decode.STRUCT:
            struct_type = self.ebx.class_by_index(class_ref)
            self._class(element, "Struct_" + struct_type["hash"], struct_type, value)
            return
        if isinstance(value, dict) and ("$boxedValue" in value or "$boxedValueRef" in value):
            text = self._boxed(value)
        elif kind == decode.BOOLEAN:
            text = "True" if value else "False"
        elif kind in (decode.INT32, decode.UINT32):
            text = "0x%08x" % (value & 0xFFFFFFFF)
        elif kind == decode.UINT8:
            text = "%02X" % value
        elif kind == decode.UINT16:
            text = "%04X" % value
        elif kind == decode.UINT64:
            text = "%016X" % value
        elif kind in (decode.INT8, decode.INT16, decode.INT64):
            text = str(value)
        elif kind == decode.FLOAT32:
            text = float_text(value, 7)
        elif kind == decode.FLOAT64:
            text = float_text(value, 15)
        elif kind == decode.ENUM:
            members = [f for f in self.ebx.class_by_index(class_ref)["fields"]
                       if f["offset"] == value & 0xFFFFFFFF]
            text = "Field_" + members[0]["hash"] if members else str(value)
        elif kind in (decode.GUID, decode.SHA1):
            text = value
        elif kind in (decode.CSTRING, decode.STRING):
            text = value if isinstance(value, str) else self._marker("bad string", value)
        elif kind == decode.POINTER:
            text = self._pointer(value)
        elif kind == decode.TYPEREF:
            text = self._type_ref(value["$typeRef"])
        elif kind == decode.DELEGATE:
            text = ""  # The exporter never held a delegate value: it wrote a "null value" comment.
        elif kind == decode.RESOURCEREF:
            text = value["$resourceRef"].upper()
        elif kind == decode.FILEREF:
            text = f"FileRef '{value['$fileRef']}'"
        else:
            text = self._marker("undecoded type", value)
        element.text = text

    def _pointer(self, value):
        if value is None:
            return "nullptr"
        if "$ref" in value:
            tag, guid = self.identities[value["$ref"]]
            if tag is None:
                return self._marker("reference to object of unknown type", value)
            return f"[{tag}] {guid}"
        if "$import" in value:
            file_guid, class_guid = value["$import"]["fileGuid"], value["$import"]["classGuid"]
            path = self.path_by_guid.get(file_guid.lower())
            if path is None:
                return f"[Ebx] BadRef {file_guid}/{class_guid}"
            return f"[Ebx] {path} [{class_guid}]"
        return self._marker("unresolved reference", value)


class RawPath(PureWindowsPath):
    """A path inside a RawExport: the part of pathlib.Path the generators use on the
    export root. Windows flavour, so comparison, sorting and matching ignore case the
    way the scripts' real paths do."""

    def __init__(self, *segments, export=None):
        super().__init__(*segments)
        self.export = export

    def with_segments(self, *segments):
        return type(self)(*segments, export=self.export)

    def _key(self):
        key = self.as_posix().lower()
        return "" if key == "." else key

    def is_file(self):
        return self._key() in self.export.files

    def is_dir(self):
        return self._key() in self.export.folders

    def exists(self):
        return self.is_file() or self.is_dir()

    def glob(self, pattern):
        return self.export.glob(self, pattern)

    def rglob(self, pattern):
        return self.export.glob(self, "**/" + pattern)


class RawExport:
    """Raw capture folders read as one XML export. Later folders override earlier ones."""

    def __init__(self, raw_folders, descriptors, catalog, order_table=ORDER_TABLE, known_fields_only=False):
        self.types = decode.type_descriptors(descriptors)
        assets = json.loads(Path(catalog).read_text(encoding="utf-8"))["assets"]
        path_by_guid = {a["guid"].lower(): a["path"] for a in assets}
        del assets
        self.order_table = load_order_table(order_table)
        self.builder = TreeBuilder(self.types, path_by_guid, self.order_table, known_fields_only)
        self.unlisted_classes, self.markers = self.builder.unlisted_classes, self.builder.markers
        self.files, self.folders = {}, {""}     # lower-case export path -> (export path, raw file)
        for folder in raw_folders:
            folder = Path(folder)
            if not folder.is_dir():
                raise FileNotFoundError(f"Raw folder not found: {folder}")
            for parent, _, names in os.walk(folder):
                for name in names:
                    if not name.lower().endswith(".ebx"):
                        continue
                    source = Path(parent, name)
                    # Letter case is the capture folder's. The export's own case came from the
                    # order it created folders in and is not reproducible; lookups ignore case.
                    relative = source.relative_to(folder).with_suffix(".xml").as_posix()
                    self.files[relative.lower()] = (relative, source)
                    parts = relative.lower().split("/")[:-1]
                    for depth in range(1, len(parts) + 1):
                        self.folders.add("/".join(parts[:depth]))
        self.root = RawPath(export=self)

    def read(self, relative):
        """Return (export element tree, SHA-256 of the raw bytes) for a relative .xml path."""
        key = Path(relative).as_posix().lower()
        if key not in self.files:
            raise FileNotFoundError(f"No raw capture for {relative}")
        source = self.files[key][1]
        if FORBIDDEN_NAME in source.name.lower():
            raise ValueError(f"Refusing to decode a material grid: {relative}")
        ebx = decode.Ebx(source, self.types, exact_floats=True)
        return self.builder.build(ebx, ebx.decode()), ebx.sha256

    def sha256(self, relative):
        """SHA-256 of the raw bytes behind a relative .xml path, without decoding them."""
        key = Path(relative).as_posix().lower()
        if key not in self.files:
            raise FileNotFoundError(f"No raw capture for {relative}")
        return hashlib.sha256(self.files[key][1].read_bytes()).hexdigest()

    def glob(self, folder, pattern):
        """Files below `folder` matching a pathlib-style pattern, case-insensitively."""
        expression = ""
        for segment in pattern.replace("\\", "/").split("/"):
            if segment == "**":
                expression += "(?:[^/]+/)*"
                continue
            for part in re.split(r"([*?])", segment):
                expression += "[^/]*" if part == "*" else "[^/]" if part == "?" else re.escape(part)
            expression += "/"
        matcher = re.compile(expression[:-1], re.I)
        prefix = folder._key() + "/" if folder._key() else ""
        return [self.root / self.files[key][0] for key in sorted(self.files)
                if key.startswith(prefix) and matcher.fullmatch(key[len(prefix):])]

    def absent_fields(self, element):
        """(path, class tag, field tag) for every field in the tree that the harvested
        export shape of its class does not have. A class with no harvested shape is
        reported once per occurrence with field tag None."""
        found = []

        def visit(node, path):
            path = f"{path}/{node.tag}"
            for key in ("Guid", "Index"):
                if key in node.attrib:
                    path += f"[@{key}='{node.attrib[key]}']"
            if node.tag.startswith(("Class_", "Struct_")):
                listed = self.order_table.get(node.tag)
                if listed is None:
                    found.append((path, node.tag, None))
                else:
                    found.extend((path, node.tag, c.tag) for c in node if c.tag not in listed)
            for child in node:
                visit(child, path)

        visit(element, "")
        return found


class Input:
    """The export a generator reads, in either input mode.

    root: the pathlib-style export root (a real folder, or RawExport.root).
    load(relative): (element tree, SHA-256 of the bytes read) for a relative .xml path.
    sha256(relative): that hash alone. mark(document): tag a provenance output written
    from raw input. export: the RawExport, or None in XML mode."""

    def __init__(self, xml_root=None, export=None):
        self.export = export
        self.root = export.root if export else xml_root

    def load(self, relative):
        if self.export:
            return self.export.read(relative)
        data = (self.root / relative).read_bytes()
        return ET.fromstring(data), hashlib.sha256(data).hexdigest()

    def sha256(self, relative):
        if self.export:
            return self.export.sha256(relative)
        return hashlib.sha256((self.root / relative).read_bytes()).hexdigest()

    def mark(self, document):
        """In raw mode, record in a provenance document that its hashes are of raw .ebx
        bytes. XML-mode documents are left as they always were."""
        if self.export:
            document["sourceForm"] = "raw"
        return document


def add_raw_arguments(parser, descriptors=True):
    """Add the raw input mode beside a generator's XML root argument."""
    parser.add_argument("--raw", type=Path, action="append",
                        help="Raw capture folder to read in place of the XML export; repeat to overlay, later folders win")
    if descriptors:
        parser.add_argument("--descriptors", type=Path, help="SharedTypeDescriptors.ebx of the raw build")
    parser.add_argument("--catalog", type=Path, help="asset-catalog.json of the raw build")
    parser.add_argument("--known-fields-only", action="store_true",
                        help="With --raw: leave out fields the Frosty XML export never showed for a class")


def open_input(parser, args, xml_root):
    """Return the Input for whichever mode the parsed arguments select."""
    if bool(xml_root) == bool(args.raw) or (args.raw and not (args.descriptors and args.catalog)):
        parser.error("give either the XML export root, or --raw with --descriptors and --catalog")
    if not args.raw:
        return Input(xml_root=xml_root)
    export = RawExport(args.raw, args.descriptors, args.catalog, known_fields_only=args.known_fields_only)
    atexit.register(report_fallbacks, export)
    return Input(export=export)


def report_fallbacks(export):
    """One stderr line when the raw tree had to fall back; nothing is printed otherwise."""
    if export.unlisted_classes or export.markers:
        print(f"frosty-raw-tree: {sum(export.unlisted_classes.values())} objects/structs of "
              f"{len(export.unlisted_classes)} classes without a harvested shape built in descriptor order "
              f"{dict(export.unlisted_classes)}; {sum(export.markers.values())} marker texts {dict(export.markers)}",
              file=sys.stderr)


def harvest(xml_root, out):
    """Record, per class/struct tag, the field order of an existing Frosty XML export."""
    order, conflicts, files, unparsed = {}, Counter(), 0, []
    for path in sorted(Path(xml_root).rglob("*.xml")):
        if FORBIDDEN_NAME in path.name.lower():
            continue
        try:
            root = ET.fromstring(path.read_bytes())
        except ET.ParseError:
            unparsed.append(path.relative_to(xml_root).as_posix())
            continue
        files += 1
        for element in root.iter():
            if not element.tag.startswith(("Class_", "Struct_")):
                continue
            fields = " ".join(c.tag[6:] for c in element)
            if order.setdefault(element.tag, fields) != fields:
                conflicts[element.tag] += 1
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = ",\n".join(f'  {json.dumps(tag)}: {json.dumps(fields)}' for tag, fields in sorted(order.items()))
    head = {"description": "Field order per class/struct tag as written by the Frosty XML export. "
                           "Field tags are listed without their Field_ prefix.",
            "sourceExport": "/".join(Path(xml_root).resolve().parts[-3:]), "filesRead": files, "unparsedFiles": unparsed,
            "tagsWithMoreThanOneOrder": dict(sorted(conflicts.items()))}
    out.write_text(json.dumps(head, indent=1)[:-2] + ',\n "order": {\n' + lines + "\n }\n}\n", encoding="utf-8")
    print(json.dumps({"files": files, "tags": len(order), "conflicts": len(conflicts), "unparsed": len(unparsed)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--harvest-xml", type=Path, required=True,
                        help="Frosty XML export root to harvest the field-order table from")
    parser.add_argument("--out", type=Path, default=ORDER_TABLE)
    args = parser.parse_args()
    harvest(args.harvest_xml, args.out)


if __name__ == "__main__":
    main()
