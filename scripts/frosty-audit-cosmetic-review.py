"""Validate the bounded cosmetic census against freshly decoded source bodies."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import runpy


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def at(value, pointer):
    for key in pointer.strip('/').split('/'):
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    args = ap.parse_args()
    assert not args.out.exists(), 'Do not overwrite a prior validation receipt'
    report = json.loads(args.report.read_text(encoding='utf-8'))
    source = report['source']
    details = Path(source['jsonlPath'])
    assert sha(details) == source['jsonlSha256']
    assert sha(source['classGuidMappingSource']) == source['classGuidMappingSha256']
    rows = [json.loads(line) for line in details.read_text(encoding='utf-8').splitlines()]
    by_route = {r['route'].casefold(): r for r in rows}
    assert len(rows) == len(by_route) == report['rowCount']
    decoder_path = Path(__file__).with_name('frosty-ebx-decode.py')
    decoder = runpy.run_path(str(decoder_path))
    context = Path(source['slotDefinitionContextLedger']).parents[2]
    descriptors = {}
    for path in (context / 'capture/toolchain').glob('SharedTypeDescriptors*.ebx'):
        descriptors[sha(path)] = decoder['type_descriptors'](path)
    decoded, identities = {}, {}

    def read(path, expected_sha, descriptor_sha):
        path = str(Path(path).resolve())
        if path not in decoded:
            ebx = decoder['Ebx'](path, descriptors[descriptor_sha])
            assert ebx.sha256 == expected_sha, path
            decoded[path] = ebx.decode()['objects']
            identities[path] = decoder['_guid'](ebx.file_guid)
        assert sha(path) == expected_sha, path
        return decoded[path]

    slots = {}
    for value in report['slotDefinitions'].values():
        root = read(value['rawPath'], value['rawSha256'], value['descriptorSha256'])[0]
        assert root['$class'] == 'Class_107f673b'
        assert root['$guid'] == value['objectGuid']
        assert root['Field_0c59fa06'].casefold() == value['route'].casefold()
        assert root['Field_de6f63b3'] == value['slotId']
        slots[value['route']] = value

    root_checks = 0
    for row in rows:
        ev = row['evidence']
        objects = read(ev['rawPath'], ev['rawSha256'], ev['descriptorSha256'])
        root = objects[0]
        assert identities[str(Path(ev['rawPath']).resolve())] == row['fileGuid']
        assert root['$class'] == ev['rootClassHash']
        assert root.get('$guid') == ev['rootObjectGuid']
        assert root['Field_0c59fa06'].casefold() == row['route'].casefold()
        if row['disposition'] != 'excluded-cosmetic':
            assert row['disposition'] == 'unresolved-role'
            continue
        anchor = ev['cosmeticBranchAnchor']
        anchor_row = by_route[anchor['route'].casefold()]
        assert anchor_row['disposition'] == 'excluded-cosmetic'
        assert anchor_row['ruleId'].endswith('_ROOT')
        assert anchor['rawSha256'] == anchor_row['evidence']['rawSha256']
        assert row['familyKey'] == anchor_row['familyKey']
        if row['ruleId'].endswith('_ROOT'):
            assert root['$class'] == 'Class_bc0062dc'
            assignment = ev['slotAssignmentEvidence']
            imp = assignment['assignmentImport']
            # The assignment is in the same build/descriptor as the root census.
            source_body = read(imp['sourceRawPath'], imp['sourceRawSha256'],
                               ev['descriptorSha256'])[imp['sourceObjectIndex']]
            target = at(source_body, imp['sourcePointer'])['$import']
            assert target == {'fileGuid': row['fileGuid'], 'classGuid': root['$guid']}
            slot = slots[assignment['slotDefinition']['route']]
            assert at(source_body, assignment['assignmentTagPointer']) == slot['slotId']
            assert assignment['assignmentTag'] == slot['slotId']
            assert slot['route'].rsplit('/', 1)[-1] in {
                'charm': {'Charm'}, 'camo': {'Camo_SPO'},
                'decal': {'StickerPrimary_SPO', 'StickerSecondary_SPO'}}[row['family']]
            root_checks += 1
        elif row['family'] == 'charm':
            assert root['$class'] in {'Class_b580666e', 'Class_310db741', 'Class_7950a6b3'}
            assert 'WEPCHRM' in row['route'].upper()
            assert row['route'].split('/')[4].casefold() == row['familyKey']
        elif root['$class'] == 'Class_b580666e':
            assert root['Field_aa4fa860']['$resourceRef'] != '0000000000000000'
        else:
            assert root['$class'] == 'Class_87706e6e'
            children = [objects[x['$ref']] for x in root['Field_aea9bf7d']]
            assert children and all(x['$class'] == 'Class_5acf852a' for x in children)
            paths = [x['Field_f114959b'] for x in children]
            assert any(any(token in p for token in ('Camouflage', 'SP_CamoTexture'))
                       if row['family'] == 'camo' else 'WeaponSticker' in p for p in paths)
    totals = dict(Counter(r['disposition'] for r in rows))
    assert totals == report['dispositionTotals']
    out = {'schemaVersion': 1, 'date': '2026-09-23',
           'reviewedReport': {'path': args.report.as_posix(), 'sha256': sha(args.report)},
           'details': {'path': str(details), 'sha256': sha(details)},
           'validatorSha256': sha(__file__), 'decoderSha256': sha(decoder_path),
           'assetsChecked': len(rows), 'freshRawBodiesDecoded': len(decoded),
           'assignmentRootsChecked': root_checks, 'dispositions': totals,
           'method': 'Fresh raw hashes, file/root GUIDs, serialized routes and classes checked for all rows. All excluded roots checked through exact Equipment imports and named slot tags. Descendants require an excluded same-key root and the bounded typed/content rules.',
           'limits': 'Scope exclusion only. No runtime claims; layout warnings remain. Shared functional targets reached independently stay candidates. Unresolved rows remain in scope.'}
    args.out.write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(out))


if __name__ == '__main__':
    main()
