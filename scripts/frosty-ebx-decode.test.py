"""Keep provisional nested layouts visible to consumers of decoded EBX."""
from pathlib import Path
import runpy
import struct
import unittest

reader = runpy.run_path(str(Path(__file__).with_name("frosty-ebx-decode.py")))
Ebx = reader["Ebx"]


def field(name, kind, offset=0, class_ref=0, category=0):
    return {"hash": name, "flags": (kind << 4) | category,
            "offset": offset, "classRef": class_ref}


def layout(name, fields):
    return {"hash": name, "fields": fields, "size": 4, "alignment": 4}


class LayoutWarningTests(unittest.TestCase):
    def decode(self, kind, category=0, ambiguous=True):
        nested = layout("nested", [field("value", reader["UINT32"])])
        parent = layout("parent", [field("child", kind, class_ref=0, category=category)])
        clean = layout("clean", [field("value", reader["UINT32"])])
        ebx = Ebx.__new__(Ebx)
        ebx.types = {"classes": [nested, parent, clean],
                     "byGuid": {"parent": parent, "clean": clean},
                     "ambiguousNames": {"nested"} if ambiguous else set()}
        ebx.data = bytearray(80)
        struct.pack_into("<I", ebx.data, 0, 64 if category else 17)
        struct.pack_into("<I", ebx.data, 32, 23)
        struct.pack_into("<I", ebx.data, 64, 17)
        ebx.data_start = 0
        ebx.arrays_offset = 128
        ebx.arrays = [{"offset": 64, "count": 1}]
        ebx.data_offsets = [0, 32]
        ebx.instances = [{"classRef": i, "exported": False} for i in range(2)]
        ebx.class_keys = ["parent", "clean"]
        ebx.path, ebx.sha256, ebx.file_guid = "fixture", "fixture", bytes(16)
        return ebx.decode()["objects"]

    def test_nested_struct_and_next_object(self):
        parent, clean = self.decode(reader["STRUCT"])
        self.assertTrue(parent["$layoutAmbiguous"])
        self.assertTrue(parent["Field_child"]["$layoutAmbiguous"])
        self.assertEqual(parent["Field_child"]["Field_value"], 17)
        self.assertNotIn("$layoutAmbiguous", clean)
        self.assertEqual(clean["Field_value"], 23)

    def test_inherited_layout(self):
        parent, _ = self.decode(reader["INHERITED"])
        self.assertTrue(parent["$layoutAmbiguous"])
        self.assertEqual(parent["Field_value"], 17)

    def test_struct_array(self):
        parent, _ = self.decode(reader["STRUCT"], reader["CATEGORY_ARRAY"])
        self.assertTrue(parent["$layoutAmbiguous"])
        self.assertTrue(parent["Field_child"][0]["$layoutAmbiguous"])
        self.assertEqual(parent["Field_child"][0]["Field_value"], 17)

    def test_unambiguous_layout_stays_unmarked(self):
        parent, _ = self.decode(reader["STRUCT"], ambiguous=False)
        self.assertNotIn("$layoutAmbiguous", parent)
        self.assertNotIn("$layoutAmbiguous", parent["Field_child"])


if __name__ == "__main__":
    unittest.main()
