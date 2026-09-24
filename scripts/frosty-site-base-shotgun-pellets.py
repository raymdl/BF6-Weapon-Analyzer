"""Verify four base shotgun pellet-count site inputs against exact WB raw fields."""
import hashlib, json, runpy, sqlite3, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP = DM / 'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB = REP / 'coverage-decoder-v5.sqlite'
FIELDS = REP / 'weapon-fields.jsonl'
ROSTER = ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
WEAPONS = ROOT / 'data/weapons.json'
DETAIL = REP / 'frosty-site-base-shotgun-pellets-2026-09-23-leaves.jsonl'
OUT = ROOT / 'reference-data/provenance/frosty-site-base-shotgun-pellets-2026-09-23.json'
DEC = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def direct(layout, h, types):
    for f in layout['fields']:
        if f['hash'] == h:
            return f
    for f in layout['fields']:
        if DEC['debug_type'](f['flags']) == 0:
            got = direct(types['classes'][f['classRef']], h, types)
            if got:
                return got
    return None

def descriptor_path(layout, hashes, types):
    def find(cls, h, base, path):
        for f in cls['fields']:
            if f['hash'] == h:
                return cls, f, base + f['offset'], path + [{'classHash': cls['hash'], 'fieldHash': h, 'objectRelativeOffset': f['offset']}]
        for f in cls['fields']:
            if DEC['debug_type'](f['flags']) == 0:
                got = find(types['classes'][f['classRef']], h, base + f['offset'], path + [{'classHash': cls['hash'], 'inheritedClassHash': types['classes'][f['classRef']]['hash'], 'objectRelativeOffset': f['offset']}])
                if got:
                    return got
        return None
    current, base, path = layout, 0, []
    for i, h in enumerate(hashes):
        found = find(current, h, base, path)
        if found is None:
            raise ValueError(f'Field_{h} absent from descriptor {current["hash"]}')
        _, f, at, path = found
        if i == len(hashes) - 1:
            return at, path
        if DEC['debug_type'](f['flags']) != 2:
            raise ValueError(f'Field_{h} is not an inline structure')
        current = types['classes'][f['classRef']]
        base = (at + current['alignment'] - 1) // current['alignment'] * current['alignment']
    raise ValueError('empty descriptor path')

def main():
    roster = json.loads(ROSTER.read_text(encoding='utf-8'))
    roots = {x.get('siteIdentity'): x for x in roster['roots'] if x.get('siteIdentity')}
    site = json.loads(WEAPONS.read_text(encoding='utf-8'))
    site_by_id = {x['id']: x for x in site}
    site_index = {x['id']: i for i, x in enumerate(site)}
    fields = [json.loads(x) for x in FIELDS.read_text(encoding='utf-8').splitlines() if x.strip()]
    db = sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    details = []
    pairs = {'m87a1': '590A1', 'm1014': 'M1014', 'ks18k': '185KSK', 'db12': 'DP12'}
    assert {roots[sid]['internalId'] for sid in pairs} == set(pairs.values())
    for site_id, internal in pairs.items():
        w = site_by_id[site_id]
        if w.get('pellets') != 16:
            raise ValueError(f'{site_id}: expected site base pellets=16, found {w.get("pellets")}')
        if site[site_index[site_id]]['pellets'] != w['pellets']:
            raise ValueError(f'{site_id}: generated site pointer does not resolve to current value')
        roster_root = roots[site_id]['roots']['WB']['rawCapture']
        candidates = [r for r in fields if r['rootKind'] == 'WB' and r['weapon'] == internal and r['pointer'] == '/Field_58d70acb/Field_db0fcea2']
        if len(candidates) != 1 or candidates[0]['value'] != 16 or candidates[0]['type'] != 'int':
            raise ValueError(f'{internal}: expected one exact WB field candidate = 16; got {len(candidates)}')
        f = candidates[0]
        c = dict(db.execute('select * from captures where id=?', (f['captureId'],)).fetchone())
        if c['route'].casefold() != roster_root['path'].casefold() or c['raw_sha256'] != roster_root['rawSha256']:
            raise ValueError(f'{site_id}: weapon-fields capture disagrees with exact roster WB root')
        if sha(c['raw_path']) != c['raw_sha256'] or sha(c['descriptor_path']) != c['descriptor_sha256']:
            raise ValueError(f'{site_id}: current WB raw or descriptor hash mismatch')
        types = DEC['type_descriptors'](c['descriptor_path'])
        ebx = DEC['Ebx'](c['raw_path'], types)
        if ebx.sha256 != c['raw_sha256']:
            raise ValueError(f'{site_id}: decoder/raw hash mismatch')
        objects = ebx.decode()['objects']
        oi = f['objectIndex']
        owner = objects[oi]
        owner_primary_fire = owner.get('Field_58d70acb', {})
        if owner.get('$class') != 'Class_35259f6b' or owner_primary_fire.get('Field_db0fcea2') != 16:
            raise ValueError(f'{site_id}: exact inline Ammo owner/value mismatch')
        owner_class = types['byGuid'][ebx.class_keys[ebx.instances[oi]['classRef']]]
        rel, desc_path = descriptor_path(owner_class, ['58d70acb', 'db0fcea2'], types)
        pos = ebx.data_start + ebx.data_offsets[oi] + rel
        raw = struct.unpack_from('<i', ebx.data, pos)[0]
        if raw != 16 or ebx.data[pos:pos+4].hex() != '10000000':
            raise ValueError(f'{site_id}: descriptor-derived raw integer does not equal 16')
        root = objects[0]
        if root.get('$class') != 'Class_a6e2adec' or root.get('$guid') != roots[site_id]['roots']['WB']['xmlOverlay']['rootObjectGuid']:
            raise ValueError(f'{site_id}: exact WB root object identity mismatch')
        details.append({'siteFile': 'data/weapons.json', 'sitePointer': f'/{site_index[site_id]}/pellets',
                        'siteWeapon': site_id, 'siteValue': w['pellets'], 'sourceWeapon': internal,
                        'sourceBuild': {'archiveHead': c['head'], 'decodeStatus': c['decode_status'],
                                        'rawSha256': c['raw_sha256'], 'descriptorSha256': c['descriptor_sha256'],
                                        'decoderSha256RecordedByCapture': c['decoder_sha256']},
                        'sourceAsset': c['route'], 'rootObjectGuid': root['$guid'],
                        'sourceObjectIndex': oi, 'sourceOwnerClass': owner['$class'], 'sourceOwnerGuid': owner.get('$guid'),
                        'sourceFieldPath': '/Field_58d70acb/Field_db0fcea2',
                        'sourceValue': owner_primary_fire['Field_db0fcea2'], 'byteOffset': pos, 'bytesHex': ebx.data[pos:pos+4].hex(),
                        'descriptorFieldPath': desc_path, 'agreement': 'site-source-match',
                        'sourceBasis': 'Exact roster crosswalk to WB; descriptor-decoded inline Ammo field; root and inline owner identities retained. Existing source review identifies this as the base shot pellet count.',
                        'remainingUncertainty': 'Captured Frosty configuration supports the base count and site agreement. It does not prove native pellet emission count. Ammunition replacement projectile counts remain separate from this base value.'})
    assert len(details) == 4
    with DETAIL.open('w', encoding='utf-8', newline='\n') as f:
        for row in details:
            f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')
    out = {'date': '2026-09-23', 'scope': 'Four data/weapons.json base pellet-count leaves, separate from ammunition projectile replacement counts.',
           'rows': len(details), 'siteSourceMatches': sum(r['agreement'] == 'site-source-match' for r in details),
           'siteIdentityCrosswalk': {k: roots[k]['internalId'] for k in pairs},
           'sourceFieldPath': '/Field_58d70acb/Field_db0fcea2 (WB inline primary-fire Ammo)',
           'sourceValues': {r['siteWeapon']: r['sourceValue'] for r in details},
           'dataHashes': {'siteWeapons': sha(WEAPONS), 'exactRoster': sha(ROSTER), 'weaponFields': sha(FIELDS), 'script': sha(__file__)},
           'detail': {'path': str(DETAIL), 'sha256': sha(DETAIL), 'rows': len(details)},
           'limits': ['The exact WB source fields agree with site base pellets=16; they do not prove native projectile emission.', 'Ammo replacement projectile counts remain independent of these base values.']}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'receipt': str(OUT), 'receiptSha256': sha(OUT), 'detail': str(DETAIL), 'detailSha256': sha(DETAIL), 'rows': len(details)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
