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


class BoxedValueTests(unittest.TestCase):
    def fixture(self, kind, class_ref=65535, category=0):
        ebx = Ebx.__new__(Ebx)
        ebx.data = bytearray(128)
        ebx.pos, ebx.data_start, ebx.data_end = 0, 0, 128
        ebx.arrays_offset = 80
        ebx.arrays = []
        struct.pack_into("<IIq", ebx.data, 0, 0x80000000 | (kind << 5), 0, 56)
        ebx.boxed_values = {64: {"offset": 64, "count": 1, "hash": "fixture",
                                "type": (kind << 5) | (category << 1), "classRef": class_ref}}
        local = layout("local", [field("value", reader["UINT32"])])
        wrong = layout("wrong", [field("wrong", reader["UINT32"])])
        ebx.types = {"classes": [wrong], "byGuid": {"local": local}, "ambiguousNames": set()}
        ebx.class_keys = ["local"]
        return ebx

    def test_zero_float_is_a_non_null_value(self):
        ebx = self.fixture(reader["FLOAT32"])
        result = ebx._read_field(None, reader["BOXEDVALUEREF"], 0)
        self.assertEqual(result["value"], 0.0)
        self.assertIsNotNone(result["value"])
        self.assertEqual(ebx.pos, 16)

    def test_struct_uses_asset_local_class_and_restores_cursor(self):
        ebx = self.fixture(reader["STRUCT"], 0)
        struct.pack_into("<I", ebx.data, 0, 2)  # Unmasked local type word.
        struct.pack_into("<I", ebx.data, 64, 123)
        result = ebx._read_field(None, reader["BOXEDVALUEREF"], 0)
        self.assertEqual(result["value"], {"Field_value": 123})
        self.assertEqual(result["$boxedValue"]["class"], "Class_local")
        self.assertEqual(ebx.pos, 16)
        # The adjacent null header must begin at 16, not at the relative-offset word.
        self.assertIsNone(ebx._read_field(None, reader["BOXEDVALUEREF"], 0)["value"])
        self.assertEqual(ebx.pos, 32)

    def test_missing_row_is_distinct_from_null(self):
        ebx = self.fixture(reader["FLOAT32"])
        ebx.boxed_values = {}
        result = ebx._boxed_value()
        self.assertEqual(result["$unresolvedBoxedValue"], "no matching EBXX boxed row")
        self.assertNotIn("value", result)
        self.assertEqual(ebx.pos, 16)

    def test_array_is_explicitly_unresolved(self):
        ebx = self.fixture(reader["STRUCT"], 0, reader["CATEGORY_ARRAY"])
        self.assertIn("$unresolvedBoxedValue", ebx._boxed_value())
        self.assertEqual(ebx.pos, 16)

    def test_empty_boxed_array_uses_sentinel_and_not_box_count(self):
        for kind, class_ref in [(reader['INT32'], 65535), (reader['UINT32'], 65535),
                                (reader['FLOAT32'], 65535), (reader['STRUCT'], 0)]:
            ebx = self.fixture(kind, class_ref, reader['CATEGORY_ARRAY'])
            ebx.arrays_offset = 16
            struct.pack_into('<i', ebx.data, 64, -32)
            result = ebx._boxed_value()
            self.assertEqual(result['value'], [])
            self.assertEqual(result['$boxedValue']['entry']['count'], 1)
            self.assertEqual(result['$boxedValue']['array']['count'], 0)
            self.assertEqual(ebx.pos, 16)

    def test_populated_boxed_array_is_not_silently_empty(self):
        ebx = self.fixture(reader['INT32'], category=reader['CATEGORY_ARRAY'])
        struct.pack_into('<i', ebx.data, 64, 32)
        struct.pack_into('<I', ebx.data, 92, 2)
        result = ebx._boxed_value()
        self.assertIn('$unresolvedBoxedValue', result)
        self.assertNotIn('value', result)
        self.assertEqual(ebx.pos, 16)

    def test_boxed_array_count_must_be_within_ebxd(self):
        ebx = self.fixture(reader['INT32'], category=reader['CATEGORY_ARRAY'])
        struct.pack_into('<i', ebx.data, 64, -64)
        self.assertEqual(ebx._boxed_value()['$unresolvedBoxedValue'],
                         'boxed array count outside EBXD')
        self.assertEqual(ebx.pos, 16)

    def populated_struct_array(self):
        ebx = self.fixture(reader['STRUCT'], 0, reader['CATEGORY_ARRAY'])
        nested = layout('nested', [field('value', reader['UINT32'])])
        ebx.types['classes'] = [nested]
        ebx.types['ambiguousNames'] = {'nested'}
        ebx.types['byGuid']['local'].update(size=32, alignment=16, fields=[
            field('first', reader['STRUCT'], 16, class_ref=0),
            field('tail', reader['UINT32'], 24), field('base', reader['FLOAT32'], 0)])
        ebx.arrays = [dict(ebx.boxed_values[64], offset=96, count=1)]
        struct.pack_into('<i', ebx.data, 64, 32)
        struct.pack_into('<I', ebx.data, 92, 1)
        struct.pack_into('<f', ebx.data, 96, 0.05)
        struct.pack_into('<I', ebx.data, 112, 456)
        struct.pack_into('<I', ebx.data, 120, 789)
        return ebx

    def test_count_one_boxed_array_reads_complete_local_class(self):
        ebx = self.populated_struct_array()
        result = ebx._boxed_value()
        value, = result['value']
        self.assertEqual(value['Field_first']['Field_value'], 456)
        self.assertTrue(value['Field_first']['$layoutAmbiguous'])
        self.assertEqual(value['Field_tail'], 789)
        self.assertAlmostEqual(value['Field_base'], 0.05)
        self.assertEqual(result['$boxedValue']['elementClass'], 'Class_local')
        self.assertEqual(ebx.pos, 16)

    def test_populated_boxed_array_requires_matching_ordinary_row(self):
        for key, bad in [('hash', 'other'), ('type', 0), ('classRef', 1),
                         ('count', 2), ('offset', 100)]:
            with self.subTest(key=key):
                ebx = self.populated_struct_array()
                ebx.arrays[0][key] = bad
                result = ebx._boxed_value()
                self.assertEqual(result['$unresolvedBoxedValue'],
                                 'no matching EBXX boxed array element row')
                self.assertNotIn('value', result)
                self.assertEqual(ebx.pos, 16)

    def test_populated_boxed_array_rejects_unvalidated_count_and_span(self):
        for condition in ['count', 'span', 'alignment']:
            with self.subTest(condition=condition):
                ebx = self.populated_struct_array()
                if condition == 'count':
                    struct.pack_into('<I', ebx.data, 92, 2)
                    ebx.arrays[0]['count'] = 2
                elif condition == 'span':
                    ebx.data_end = 127
                else:
                    ebx.types['byGuid']['local']['alignment'] = 64
                result = ebx._boxed_value()
                self.assertIn('$unresolvedBoxedValue', result)
                self.assertNotIn('value', result)
                self.assertEqual(ebx.pos, 16)

    def test_invalid_payload_is_explicitly_unresolved(self):
        ebx = self.fixture(reader["STRUCT"], 0)
        ebx.data_end = 66
        self.assertEqual(ebx._boxed_value()["$unresolvedBoxedValue"], "boxed struct outside EBXD")
        self.assertEqual(ebx.pos, 16)

    def test_unknown_type_or_category_is_not_resolved(self):
        for kind, category in [(reader['FUNCTION'], 0), (reader['FLOAT32'], 1)]:
            ebx = self.fixture(kind, category=category)
            self.assertIn('$unresolvedBoxedValue', ebx._boxed_value())
            self.assertEqual(ebx.pos, 16)

    def test_boxed_string_must_end_within_ebxd(self):
        ebx = self.fixture(reader['CSTRING'])
        struct.pack_into('<i', ebx.data, 64, 16)
        ebx.data[80:84] = b'txt\x00'
        ebx.data_end = 80
        self.assertEqual(ebx._boxed_value()['$unresolvedBoxedValue'], 'boxed string outside EBXD')
        ebx.pos, ebx.data_end = 0, 83
        self.assertEqual(ebx._boxed_value()['$unresolvedBoxedValue'], 'boxed string outside EBXD')
        ebx.pos, ebx.data_end = 0, 84
        self.assertEqual(ebx._boxed_value()['value'], 'txt')

    def test_recursive_boxed_struct_stops_and_restores_cursor(self):
        ebx = self.fixture(reader['STRUCT'], 0)
        cls = ebx.types['byGuid']['local']
        cls.update(size=16, fields=[field('loop', reader['BOXEDVALUEREF'])])
        struct.pack_into('<IIq', ebx.data, 64, 2, 0, -8)
        result = ebx._boxed_value()
        for _ in range(32):
            result = result['value']['Field_loop']
        self.assertEqual(result['$unresolvedBoxedValue'], 'boxed nesting limit')
        self.assertEqual(ebx.pos, 16)


class DelegateReferenceTests(unittest.TestCase):
    def fixture(self, words):
        ebx = Ebx.__new__(Ebx)
        # Nonzero second words make an incorrect four-byte array stride visible.
        ebx.data = b"".join(struct.pack("<II", word, 0xDEADBEEF) for word in words)
        ebx.pos = 0
        ebx.reference_type_guids = [bytes(16), bytes.fromhex("443322116655887799aabbccddeeff00")]
        return ebx

    def test_adjacent_delegate_elements_use_eight_byte_stride(self):
        ebx = self.fixture([0, 6, 0x80000000 | (reader["FLOAT32"] << 5)])
        values = [ebx._read_field(None, reader["DELEGATE"], 0) for _ in range(3)]
        self.assertEqual(values, [
            {"$delegateTypeRef": 0},
            {"$delegateTypeRef": 6, "typeGuid": "11223344-5566-7788-99aa-bbccddeeff00"},
            {"$delegateTypeRef": 0x80000000 | (reader["FLOAT32"] << 5), "primitiveType": reader["FLOAT32"]},
        ])
        self.assertEqual(ebx.pos, 24)

    def test_out_of_range_type_reference_remains_explicit(self):
        ebx = self.fixture([42])
        self.assertEqual(ebx._read_field(None, reader["DELEGATE"], 0),
                         {"$delegateTypeRef": 42, "$unresolvedTypeRef": 10})


if __name__ == "__main__":
    unittest.main()
