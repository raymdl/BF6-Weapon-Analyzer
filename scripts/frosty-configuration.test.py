"""Guard typed XML conversion against unsigned-hash corruption and invalid values."""
from pathlib import Path
import runpy
import unittest

decode = runpy.run_path(str(Path(__file__).with_name("frosty-configuration.py")))["typed_scalar"]


class TypedScalarTests(unittest.TestCase):
    def test_signed_exponents_and_boundaries(self):
        self.assertEqual(decode("0xfffffffd", "System.Int32"), -3)
        self.assertEqual(decode("0x80000000", "System.Int32"), -2147483648)
        self.assertEqual(decode("0x7fffffff", "System.Int32"), 2147483647)
        self.assertEqual(decode("-3", "System.Int32"), -3)

    def test_unknown_or_unsigned_hex_is_not_reinterpreted_as_signed(self):
        self.assertIsNone(decode("0xffffffff", None))
        self.assertIsNone(decode("0xffffffff", "System.UInt32"))

    def test_exported_decimal_precision_and_boolean_types(self):
        self.assertEqual(decode("0.1", "System.Single"), 0.1)
        self.assertIs(decode("True", "System.Boolean"), True)
        self.assertIs(decode("False", "System.Boolean"), False)

    def test_invalid_values_fail(self):
        for raw, kind in (("0x100000000", "System.Int32"), ("2147483648", "System.Int32"),
                          ("-2147483649", "System.Int32"), ("NaN", "System.Single"),
                          ("Infinity", "System.Single"), ("1", "System.Boolean")):
            with self.subTest(raw=raw, kind=kind), self.assertRaises(ValueError):
                decode(raw, kind)


if __name__ == "__main__":
    unittest.main()
