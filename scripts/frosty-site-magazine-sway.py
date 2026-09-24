"""Verify magazine weapon-sway site inputs against exact captured WME bindings."""
import collections, hashlib, json, math, runpy, sqlite3, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP = DM / 'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB = REP / 'coverage-decoder-v5.sqlite'
MAG_LEAVES = REP / 'frosty-site-magazines-2026-09-23-leaves.jsonl'
OUT = ROOT / 'reference-data/provenance/frosty-site-magazine-sway-2026-09-23.json'
DETAIL = REP / 'frosty-site-magazine-sway-2026-09-23-leaves.jsonl'
ATTACH = ROOT / 'data/attachments.json'
SITE = json.loads(ATTACH.read_text(encoding='utf-8'))
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

def field_offset(layout, h, types, base=0):
    f = direct(layout, h, types)
    if not f:
        raise ValueError(f'field {h} absent from descriptor {layout["hash"]}')
    # The direct field may be inherited. Resolve its owning class path and cumulative offset.
    def find(cls, off, path):
        for item in cls['fields']:
            if item['hash'] == h:
                return off + item['offset'], path + [{'classHash': cls['hash'], 'fieldHash': h, 'objectRelativeOffset': item['offset']}]
        for item in cls['fields']:
            if DEC['debug_type'](item['flags']) == 0:
                sub = types['classes'][item['classRef']]
                got = find(sub, off + item['offset'], path + [{'classHash': cls['hash'], 'inlineFieldHash': item['hash'], 'objectRelativeOffset': item['offset']}])
                if got:
                    return got
        return None
    result = find(layout, base, [])
    if not result:
        raise ValueError(f'field {h} offset path absent')
    return result

def ptr(token):
    return str(token).replace('~', '~0').replace('/', '~1')

def unptr(token):
    return token.replace('~1', '/').replace('~0', '~')

def resolve_pointer(doc, pointer):
    value = doc
    for token in pointer.lstrip('/').split('/'):
        value = value[unptr(token)]
    return value

def main():
    source_rows = [json.loads(x) for x in MAG_LEAVES.read_text(encoding='utf-8').splitlines() if x.strip()]
    mag_map = {(r['siteWeapon'], r['selectionId']): r for r in source_rows if r['sitePointer'].endswith('/mag')}
    wants = []
    for weapon, obj in SITE['WEAPON_MAG'].items():
        for sid, leaf in obj.get('mags', {}).items():
            if 'weaponSwayMult' in leaf:
                wants.append({'weapon': weapon, 'selection': sid,
                              'sitePointer': f'/WEAPON_MAG/{ptr(weapon)}/mags/{ptr(sid)}/weaponSwayMult',
                              'siteValue': leaf['weaponSwayMult']})
    assert len(wants) == 49
    for w in wants:
        assert resolve_pointer(SITE, w['sitePointer']) == w['siteValue']

    db = sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    capture_cache = {}
    def capture(route):
        route = route.removesuffix('.xml')
        if route not in capture_cache:
            matches = db.execute('select * from captures where route=? collate nocase', (route,)).fetchall()
            if len(matches) != 1:
                raise ValueError(f'{route}: expected exactly one capture, got {len(matches)}')
            c = dict(matches[0])
            if sha(c['raw_path']) != c['raw_sha256'] or sha(c['descriptor_path']) != c['descriptor_sha256']:
                raise ValueError(f'{route}: raw/descriptor hash mismatch')
            types = DEC['type_descriptors'](c['descriptor_path'])
            ebx = DEC['Ebx'](c['raw_path'], types)
            if ebx.sha256 != c['raw_sha256']:
                raise ValueError(f'{route}: decoder raw hash mismatch')
            capture_cache[route] = (c, types, ebx, ebx.decode()['objects'])
        return capture_cache[route]

    detail = []
    for want in wants:
        key = (want['weapon'], want['selection'])
        mr = mag_map.get(key)
        if not mr:
            raise ValueError(f'{key}: no exact captured magazine selector binding')
        bnds = mr['bindingEvidence']['bindings']
        selected = []
        for binding in bnds:
            weapon_effects = [x for x in binding['effects'] if x.get('type') == 'Class_2fea847d']
            camera_effects = [x for x in binding['effects'] if x.get('type') == 'Class_28d25398']
            if weapon_effects:
                selected.append((binding, weapon_effects, camera_effects))
        if len(selected) != 1 or len(selected[0][1]) != 1 or len(selected[0][2]) != 1:
            raise ValueError(f'{key}: expected one weapon and one distinct camera sway effect, got {len(selected)}')
        binding, we, ce = selected[0]
        records = []
        for role, effect, field_hash in [('weaponSway', we[0], '90fd0310'), ('cameraSway', ce[0], '90fd0310')]:
            c, types, ebx, objects = capture(effect['sourceXml'])
            matches = [i for i, o in enumerate(objects) if o.get('$guid', '').lower() == effect['guid'].lower()]
            if len(matches) != 1:
                raise ValueError(f'{key} {role}: GUID exact match count {len(matches)}')
            oi = matches[0]
            cls = types['byGuid'][ebx.class_keys[ebx.instances[oi]['classRef']]]
            o = objects[oi]
            scalar_fields = []
            # Enumerate all inherited descriptor leaves for context; record numeric fields only.
            def flatten(layout, offset=0):
                out = []
                for f in layout['fields']:
                    typ = DEC['debug_type'](f['flags'])
                    if typ == 0:
                        out.extend(flatten(types['classes'][f['classRef']], offset + f['offset']))
                    elif typ in (15, 19) and ('Field_' + f['hash']) in o:
                        out.append((f['hash'], offset + f['offset'], o['Field_' + f['hash']]))
                return out
            for h, rel, value in flatten(cls):
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    pos = ebx.data_start + ebx.data_offsets[oi] + rel
                    scalar_fields.append({'fieldPath': '/Field_' + h, 'value': value,
                                          'byteOffset': pos, 'bytesHex': ebx.data[pos:pos+4].hex()})
            rec = {'role': role, 'sourceAsset': effect['sourceXml'].removesuffix('.xml'),
                   'sourceXml': effect['sourceXml'], 'sourceObjectGuid': effect['guid'],
                   'sourceClass': effect['type'], 'sourceObjectIndex': oi, 'sourceFieldPath': None,
                   'sourceValue': None, 'byteOffset': None, 'bytesHex': None,
                   'rawSha256': c['raw_sha256'], 'descriptorSha256': c['descriptor_sha256'],
                   'captureHead': c['head'], 'captureId': c['id'], 'scalarFields': scalar_fields}
            if field_hash:
                path, descpath = field_offset(cls, field_hash, types)
                pos = ebx.data_start + ebx.data_offsets[oi] + path
                value = o.get('Field_' + field_hash)
                raw_value = struct.unpack_from('<f', ebx.data, pos)[0]
                if not isinstance(value, (int, float)) or abs(raw_value - value) > 1e-6:
                    raise ValueError(f'{key}: descriptor raw float mismatch {raw_value} != {value}')
                rec.update({'sourceFieldPath': '/Field_' + field_hash, 'sourceValue': raw_value,
                            'byteOffset': pos, 'bytesHex': ebx.data[pos:pos+4].hex(),
                            'descriptorFieldPath': descpath})
            records.append(rec)
        wr = records[0]
        delta = float(wr['sourceValue']) - float(want['siteValue'])
        detail.append({'siteFile': 'data/attachments.json', 'sitePointer': want['sitePointer'],
                       'siteWeapon': want['weapon'], 'selectionId': want['selection'],
                       'siteValue': want['siteValue'],
                       'bindingEvidence': {'attachment': binding['attachment'], 'ability': binding['ability'],
                                           'selectorAsset': binding['selector']['asset'], 'selectorGuid': binding['selector']['guid'],
                                           'modifierXml': binding['modifier']['sourceXml'], 'modifierGuid': binding['modifier']['guid']},
                       'sourceRecords': records,
                       'comparison': {'weaponSwaySourceMinusSite': delta,
                                      'agreementWithin1e-6': abs(delta) <= 1e-6,
                                      'meaning': 'Site weaponSwayMult agrees with captured Class_2fea847d Field_90fd0310 within float/site decimal rounding.'},
                       'remainingUncertainty': 'Captured XML selector/effect graph and value agreement establish sourced configuration, not native effect activation, priority, or runtime composition. Class_28d25398 is the distinct camera-sway effect and is not the site weaponSwayMult input.'})

    assert len(detail) == 49 and len({r['sitePointer'] for r in detail}) == 49
    assert all(r['comparison']['agreementWithin1e-6'] for r in detail)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with DETAIL.open('w', encoding='utf-8', newline='\n') as f:
        for r in detail: f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
    dist = collections.Counter(str(r['siteValue']) for r in detail)
    raw_assets = {}
    for r in detail:
        for s in r['sourceRecords']:
            raw_assets[(s['sourceAsset'], s['sourceClass'])] = s
    receipt = {'date': '2026-09-23', 'scope': 'All 49 data/attachments.json WEAPON_MAG weaponSwayMult leaves, exact selected magazine binding to separate weapon/camera sway effects.',
               'siteInputCount': len(detail), 'sourceSiteAgreementCount': sum(r['comparison']['agreementWithin1e-6'] for r in detail),
               'siteValueDistribution': dict(dist),
               'weaponSwayEffectDistribution': dict(collections.Counter(r['sourceRecords'][0]['sourceAsset'] for r in detail)),
               'sourceAssets': [{'asset': a, 'class': cls, 'objectGuid': s['sourceObjectGuid'], 'fieldPath': s['sourceFieldPath'], 'value': s['sourceValue'], 'byteOffset': s['byteOffset'], 'bytesHex': s['bytesHex'], 'rawSha256': s['rawSha256'], 'descriptorSha256': s['descriptorSha256'], 'head': s['captureHead']} for (a, cls), s in sorted(raw_assets.items())],
               'siteSha256': sha(ATTACH), 'scriptSha256': sha(__file__), 'selectorEvidence': {'path': str(MAG_LEAVES), 'sha256': sha(MAG_LEAVES), 'bindingSelector': 'exact selector GUID + selected attachment / ability action + modifier GUID + effect GUID and class in captured magazine leaf evidence'},
               'detail': {'path': str(DETAIL), 'sha256': sha(DETAIL), 'rows': len(detail)},
               'limits': ['Value matches establish captured source configuration only; native activation, priority, and runtime composition are not proved.', 'Camera-sway class Class_28d25398 is retained separately and does not supply the site weapon sway field.']}
    OUT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'receipt': str(OUT), 'receiptSha256': sha(OUT), 'detail': str(DETAIL), 'detailSha256': sha(DETAIL), 'rows': len(detail), 'distribution': dict(dist), 'effectAssets': receipt['weaponSwayEffectDistribution']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
