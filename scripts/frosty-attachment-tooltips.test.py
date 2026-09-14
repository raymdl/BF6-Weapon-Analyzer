"""Regression checks for source-name and description ambiguity boundaries."""
import importlib.util
from pathlib import Path
import unittest
from copy import deepcopy
import hashlib
from tempfile import TemporaryDirectory
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('mapper', Path(__file__).with_name('frosty-attachment-tooltips.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class DescriptionMappingTests(unittest.TestCase):
    def test_panel_tooltip_keeps_original_pointer_and_does_not_fill_peer_choice(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'panel.png').write_bytes(b'reviewed panel')
            original_link = {'method': 'aam-full-name', 'assets': ['original-missing-ad']}
            record = {'weapon': 'weapon', 'slot': 'light', 'attachment': 'hip',
                      'identityStatus': 'source-linked', 'descriptionStatus': 'english-description-missing-or-conflicting',
                      'reviewStatus': 'description-review-required',
                      'sources': [{'source': 'hardware.xml', 'uiLink': original_link}]}
            peer = {**deepcopy(record), 'weapon': 'peer'}
            review = {'weapon': 'weapon', 'slot': 'light', 'attachment': 'hip', 'source': 'hardware.xml',
                      'originalUiLink': deepcopy(original_link), 'screenshot': 'panel.png',
                      'screenshotSha256': hashlib.sha256(b'reviewed panel').hexdigest(),
                      'observedDescription': 'Observed text.', 'pointerEvidence': [{'descriptionStringId': 'MISSING'}]}
            runtime = {}
            with patch.object(m, 'REPO', root):
                descriptions = m.apply_screenshot_tooltips([record, peer], runtime, [review])
            self.assertEqual(descriptions, {'screenshot:weapon:light:hip': 'Observed text.'})
            self.assertEqual(runtime, {'weapon': {'light': {'hip': 'screenshot:weapon:light:hip'}}})
            self.assertEqual(record['sources'][0]['uiLink'], original_link)
            self.assertEqual(record['tooltipSource']['originalFrostyStringIds'], ['MISSING'])
            self.assertNotIn('reviewStatus', record)
            self.assertEqual(peer['descriptionStatus'], 'english-description-missing-or-conflicting')
            for field, value in [('source', 'different.xml'), ('screenshotSha256', 'changed'),
                                 ('originalUiLink', {'assets': ['different-ad']}), ('observedDescription', '')]:
                with self.subTest(field=field), patch.object(m, 'REPO', root), self.assertRaises(ValueError):
                    m.apply_screenshot_tooltips([{**deepcopy(peer), 'weapon': 'weapon'}], {}, [{**review, field: value}])

    def test_lowercase_source_names(self):
        self.assertEqual(m.source_name({'attachmentXml': 'attachment_m1014_brl_extendedbarrel.xml'}), 'm1014_brl_extendedbarrel')
        self.assertEqual(m.descriptor_name('attachment_m1014_brl_extendedbarrel'), m.descriptor_name('AD_M1014_BRL_Extended'))
        self.assertNotEqual(m.descriptor_name('Attachment_M1014_BRL_Extended'), m.descriptor_name('AD_DP12_BRL_Extended'))
        self.assertEqual(m.descriptor_name('Attachment_SV98M_MZL_SRVVFHMBSV98'), m.descriptor_name('AD_SV98M_MZL_FlashComp_SRVVFHMBSV98'))

    def test_missing_or_conflicting_peer_text_cannot_supply_description(self):
        d = {'a': {'description': {'id': '1', 'text': 'Text'}}, 'b': {'description': {'id': '2'}},
             'c': {'description': {'id': '3', 'text': 'Other'}}, 'd': {'description': {'id': '4', 'text': 'Text'}}}
        self.assertIsNone(m.description_consensus(['a', 'b'], d))
        self.assertIsNone(m.description_consensus(['a', 'c'], d))
        self.assertEqual(m.description_consensus(['a', 'd'], d), ['1', '4'])

    def test_shared_hardware_requires_same_bound_selector(self):
        a = {'selectors': [{'asset': 'selector1', 'guid': 'guid1', 'bound': True}]}
        b = {'selectors': [{'asset': 'selector2', 'guid': 'guid2', 'bound': True}]}
        self.assertEqual(m.shared_model_key('M18_MZL_Model', 'muzzle', a), m.shared_model_key('G22_MZL_Model', 'muzzle', a))
        self.assertNotEqual(m.shared_model_key('M18_MZL_Model', 'muzzle', a), m.shared_model_key('G22_MZL_Model', 'muzzle', b))
        self.assertEqual(m.shared_model_key('M18_AMO_Subsonic', 'ammo', a), m.shared_model_key('G22_AMO_Subsonic', 'ammo', a))
        self.assertNotEqual(m.shared_model_key('M18_AMO_Subsonic', 'ammo', a), m.shared_model_key('G22_AMO_Subsonic', 'ammo', b))
        b['selectors'][0]['bound'] = False
        self.assertIsNone(m.shared_model_key('G22_MZL_Model', 'muzzle', b))

    def test_ambiguous_exact_link_does_not_fall_back(self):
        from collections import defaultdict
        names = defaultdict(set, {m.normalized('M18 - MZL - Model'): {'a', 'b'}})
        indexes = (names, {}, {m.descriptor_name('M18_MZL_Model'): {'c'}}, defaultdict(list), {})
        result = m.weapon_ui('M18_MZL_Model', 'muzzle', indexes, {})
        self.assertEqual(result['method'], 'aam-full-name')
        self.assertEqual(result['assets'], ['a', 'b'])

    def test_grip_without_slot_retains_exact_hardware_model(self):
        indexes = ({}, {}, {'shared:magpulafg2bolt': {'bolt'}}, {}, {})
        self.assertEqual(m.weapon_ui('SV98M_Magpul_AFG2_BOLT', 'grip', indexes, {})['assets'], ['bolt'])
        self.assertIsNone(m.weapon_ui('SV98M_Magpul_AFG2', 'grip', indexes, {}))
        self.assertIsNone(m.weapon_ui('SV98M_Magpul_AFG2_BOLT', 'muzzle', indexes, {}))

    def test_optic_categories_keep_fixed_scopes_and_variable_price_groups_distinct(self):
        self.assertEqual(m.optic_category('Scope 10.00x', 10), 'std_optic')
        self.assertEqual(m.optic_category('Variable 1-4x', 20), 'var_low')
        self.assertEqual(m.optic_category('Variable 1-5x', 25), 'var_high')
        self.assertIsNone(m.optic_category('Variable 1-5x', 30))
        self.assertEqual(m.optic_category('Thermal Hybrid', 35), 'therm_hyb')
        self.assertEqual(m.optic_category('Thermal 1.50x ', 25), 'thermal')

if __name__ == '__main__':
    unittest.main()
