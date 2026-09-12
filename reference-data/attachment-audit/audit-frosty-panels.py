"""Field-by-field reference audit. Does not modify captured values or live data."""
import json
import struct
import re
import importlib.util
import hashlib
import argparse
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))
def norm(value):
    return re.sub(r'[^a-z0-9]', '', str(value).lower())

def map_records(audit):
    """Catalog labels join identities only; numeric site stats are never compared."""
    data = read('data/attachments.json')
    ammo = read('data/ammo.json')
    weapons = read('data/weapons.json')
    names = {norm(w['name']): w['id'] for w in weapons}
    names.update({'m60': 'm60'})
    catalogs = {s: data[k] for s, k in {'muzzle':'MUZZLES', 'barrel':'BARRELS',
        'grip':'GRIPS', 'laser':'LASERS', 'light':'LIGHTS', 'ergo':'ERGOS'}.items()}
    catalogs['ammo'] = ammo['AMMO']
    aliases = {'fmj':'standard', 'tungstencore':'penetration', 'polymercase':'lightweight',
        'ballistictip':'synthetic', 'matchgrade':'long_range', 'tungstenmatch':'range_pen',
        'subsonictungsten':'subsonic_pen', 'subsonichollowpoint':'subsonic_hp',
        '01buckshot':'buckshot', '00buckshot':'buckshot_00', 'slug':'slugs',
        'synthetictip':'synthetic', 'subsonichp':'subsonic_hp',
        'laserlightcombored':'combo_red', 'laserlightcombogreen':'combo_green'}
    types = {'Muzzle':['muzzle'], 'Barrel':['barrel'], 'Grip':['grip'], 'Magazine':['mag'],
        'Ammo':['ammo'], 'Ergonomics':['ergo'], 'Laser':['laser'], 'Light':['light'],
        'Laser/Light':['laser','light'], 'Grip/Laser/Light':['grip','laser','light']}
    result = []
    for i, r in enumerate(audit['records']):
        wid = names.get(norm(r['weaponName']))
        candidates = []
        if r.get('frosty'):
            candidates = [(r['frosty']['slot'], r['frosty']['siteId'])]
        elif r['attachmentType'] != 'Overview' and wid:
            name = norm(r['attachmentName'])
            for slot in types.get(r['attachmentType'], []):
                if name == 'none':
                    candidates.append((slot, 'none'))
                    continue
                if slot == 'mag':
                    mags = data['WEAPON_MAG'].get(wid, {}).get('mags', {})
                    def magname(s):
                        return norm(re.sub(r'magazine|mag|drum|rnd|rounds?', '', s, flags=re.I))
                    candidates += [(slot, id) for id,m in mags.items()
                        if magname(r['attachmentName']) == magname(m['name'])]
                    if not candidates:
                        subtype = re.sub('shell', 'rnd', str(r.get('attachmentSubtype')), flags=re.I)
                        candidates += [(slot, id) for id,m in mags.items()
                            if magname(subtype) == magname(m['name'])]
                    continue
                wa = data['WEAPON_ATTS'].get(wid, {})
                allowed = (list(ammo['WEAPON_AMMO'].get(wid, {}).get('ammo', {})) if slot=='ammo'
                    else data['WEAPON_ERGO'].get(wid, {}).get('avail', []) if slot=='ergo'
                    else wa.get(slot, []))
                if slot=='grip' and wa.get('laserGripLightCombined'):
                    allowed = allowed + wa.get('laser', [])
                for c in catalogs[slot]:
                    if c['id'] not in allowed:
                        continue
                    labels = [norm(c['name'])]
                    match = name in labels
                    if slot == 'barrel':
                        subtype = norm(r.get('attachmentSubtype'))
                        subtype = {'heavyext':'heavyextended','extlight':'extendedlight',
                            'cryo':'cryogenic'}.get(subtype, subtype)
                        match = subtype in labels
                        if wid=='vssm':
                            match = c['id'] == ('vssm_suppressed_asm' if 'asm' in name else 'vssm_suppressed')
                    if name in aliases:
                        match = c['id'] == aliases[name]
                    if match:
                        candidates.append((slot, c['id']))
        candidates = sorted(set(candidates))
        # Shared accessory None is one empty physical slot, with no effects.
        if candidates and all(id == 'none' for _,id in candidates):
            candidates = [candidates[0]]
        result.append({'recordIndex': i, 'weapon': wid, 'weaponName': r['weaponName'],
            'path': r['source']['currentPath'], 'attachmentName': r['attachmentName'],
            'identityCandidates': candidates,
            'identityStatus': 'mapped' if len(candidates)==1 else 'overview' if r['attachmentType']=='Overview'
                else 'unresolved' if not candidates else 'ambiguous'})
    return result

def sweep(update_pending=False):
    audit = read('reference-data/attachment-audit/attachment-screenshot-review.json')
    rows = map_records(audit)
    spec = importlib.util.spec_from_file_location('frosty_panel_values', HERE/'frosty-panel-values.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    source = module.FrostyPanelSource()
    attachment_data = read('data/attachments.json')
    ammo_data = read('data/ammo.json')
    ladders = read('data/balance_tables.json')
    baselines = defaultdict(dict)
    for weapon in {r['weapon'] for r in rows if r['weapon']}:
        none_rows = [r for r in rows if r['weapon']==weapon and r['identityCandidates']
                     and r['identityCandidates'][0][1]=='none' and audit['records'][r['recordIndex']].get('stats')]
        for field in module.DISPLAY_FIELDS:
            values = defaultdict(list)
            for r in none_rows:
                value = audit['records'][r['recordIndex']]['stats'].get(field)
                if isinstance(value,(int,float)):
                    values[value].append(r['path'])
            # A consensus is a triage anchor only, never independent proof of capture accuracy.
            ranked = sorted(values.items(),key=lambda x:-len(x[1]))
            if len(ranked)==1:
                value, paths = ranked[0]
                baselines[weapon][field]={'value':value,'paths':paths}
    def params(weapon, slot, id):
        report=source.derive(weapon,{'slot':slot,'id':id})
        return report.get('fields',{}) if report.get('status')=='mapped' or id=='none' else None
    def supplemental(row):
        weapon=row['weapon']; slot,id=row['identityCandidates'][0]
        chosen=params(weapon,slot,id)
        if chosen is None:return {}
        default = attachment_data['WEAPON_MAG'].get(weapon,{}).get('def','none') if slot=='mag' else attachment_data['WEAPON_ATTS'].get(weapon,{}).get('barrelDef','none') if slot=='barrel' else ammo_data['WEAPON_AMMO'].get(weapon,{}).get('def','standard') if slot=='ammo' else 'none'
        reference=params(weapon,slot,default)
        if reference is None:return {}
        out={}
        rules={'adsTimeMs':('adsTimeTier.add','ADS_SPD_TIERS',1),
            'adsMoveSpeedMultiplier':('adsMoveSpeedTier','ADS_MOVE_TIERS',-1),
            'sprintRecoveryMs':('sprintRecoveryTier','DRAW_TIME_TABLES.sprint',-1),
            'spotOnFire3dM':('worldSpotMult',None,1),'spotOnFire2dM':('minimapSpotMult',None,1),
            'opponentHealthRegenDelaySeconds':('healthRegenDelayAdd',None,1)}
        for field,(operand,table,sign) in rules.items():
            anchor=baselines.get(weapon,{}).get(field)
            if not anchor:continue
            neutral=1 if operand.endswith('Mult') else 0
            selected=chosen.get(operand,{}).get('value',neutral)
            original=reference.get(operand,{}).get('value',neutral)
            if not isinstance(selected,(int,float)) or not isinstance(original,(int,float)):continue
            if table:
                steps=ladders['DRAW_TIME_TABLES']['sprint'] if table=='DRAW_TIME_TABLES.sprint' else ladders[table]
                # Anchor against rounded panel values; runtime tables retain source precision.
                panel_steps=[float(f"{struct.unpack('f',struct.pack('f',v))[0]:.2f}") if table=='ADS_MOVE_TIERS' else round(v) for v in steps]
                if anchor['value'] not in panel_steps:continue
                index=panel_steps.index(anchor['value'])+sign*(selected-original)
                if index!=int(index):continue
                value=panel_steps[max(0,min(len(steps)-1,int(index)))]
            elif operand.endswith('Mult'):
                if original==0:continue
                value=anchor['value']*selected/original
            else:value=anchor['value']+selected-original
            actual=(audit['records'][row['recordIndex']].get('stats') or {}).get(field)
            out[field]={'audit':actual,'candidate':value,
                'status':'pending-capture' if actual is None else 'screenshot-anchored-match' if abs(actual-value)<(.501 if field.startswith('spotOnFire') else .00001) else 'screenshot-anchored-difference',
                'baselineValue':anchor['value'],'sourceOperand':operand,'selectedOperand':selected,'defaultOperand':original,
                'ladder':table,'sources':chosen.get(operand,{}).get('sources',[])}
        return out
    totals = Counter()
    field_totals = defaultdict(Counter)
    expectations = {}
    for row in rows:
        record = audit['records'][row['recordIndex']]
        if row['identityStatus'] != 'mapped':
            continue
        slot, id = row['identityCandidates'][0]
        key = f"{row['weapon']}|{slot}|{id}"
        if key not in expectations:
            expectations[key] = module.derive_display_candidates(row['weapon'], slot, id, source=source)
        expected = expectations[key]
        if record.get('frosty') and update_pending:
            record['frosty']['panelFields']={field:{k:v for k,v in entry.items() if k!='sources'}
                for field,entry in expected.items()}
            raw_rows=[r for r in source.raw_rows if r['attachmentXml']==record['frosty']['attachmentXml']]
            effect_keys=sorted({e for r in raw_rows for s in r['selectors'] for e in s['effects']})
            record['frosty']['effectParameters']=[{'sourceXml':source.effects[e]['sourceXml'],
                'guid':source.effects[e]['guid'],'type':source.effects[e]['type'],
                'operations':source.effects[e].get('operations',[]),
                'scalars':source.effects[e].get('scalars',[])} for e in effect_keys if e in source.effects]
            record['frosty']['panelStatus']='configuration-candidates-not-screenshot-values'
            record['frosty']['panelEvidenceFile']='reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json'
            record['notes']=[n for n in record['notes'] if n!='Frosty-backed availability and point cost only; screenshot capture is still required.']
            note='Frosty configuration candidates and raw attachment effect parameters are retained under frosty. Unsupported display fields remain null. These are not captured UI values; magazine capacity may include the chamber and rate/reload may require native timing composition.'
            if note not in record['notes']:record['notes'].append(note)
        row['fields'] = {}
        for field in module.DISPLAY_FIELDS:
            actual = (record.get('stats') or {}).get(field)
            value = expected[field]['value']
            status = 'unsupported' if value is None else 'pending-capture' if record.get('frosty') else 'missing-audit-value' if actual is None else 'difference'
            if value is not None and actual is not None:
                tolerance = .051 if field in ('recoilAmountDegrees','recoilVariationDegrees') else .0011 if field=='reloadTimeSeconds' else .001 if field in ('rateOfFireRpm','muzzleVelocityMps') else 0
                if isinstance(actual,(int,float)) and abs(actual-value)<=tolerance:
                    status='source-candidate-match'
                elif field in ('rateOfFireRpm','muzzleVelocityMps') and abs(actual-value)<1.001:
                    status='display-integer-compatible'
                elif field=='magazineSize' and actual==value-1:
                    status='chamber-convention-candidate'
            entry={'audit':actual,'sourceCandidate':value,'status':status}
            if any('Wrong selected attachment' in c for c in record.get('reviewConflicts', [])):
                status = entry['status'] = 'capture-identity-conflict'
            row['fields'][field]=entry
            if record.get('stats'):
                totals[status]+=1
                field_totals[field][status]+=1
        row['expectationKey']=key
        row['screenshotAnchoredChecks']=supplemental(row)
        if any('Wrong selected attachment' in c for c in record.get('reviewConflicts', [])):
            row['captureIdentityWarning'] = record['reviewConflicts']
            for entry in row['screenshotAnchoredChecks'].values():
                entry['status'] = 'capture-identity-conflict'
    if update_pending:
        audit['knownGaps']=[g for g in audit['knownGaps'] if not g.startswith('Frosty-backed pending records establish')]
        gap='Frosty pending rows include source configuration candidates and raw effect parameters, not screenshot measurements. Unknown UI formulas and labels require later evidence.'
        if gap not in audit['knownGaps']:audit['knownGaps'].append(gap)
        (HERE/'attachment-screenshot-review.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    report={'date':'2026-09-07','sourceVersion':'1.4.2.5',
        'scope':'Every detailed panel field is enumerated. Source-candidate agreement is not screenshot review or proof of native composition. Unsupported fields are not passes.',
        'inputSha256':hashlib.sha256((HERE/'attachment-screenshot-review.json').read_bytes()).hexdigest(),
        'summary':{'records':len(rows),'detailedPanels':sum(bool(r.get('stats')) for r in audit['records']),
            'fieldStatuses':dict(totals),'byField':dict(field_totals)},
        'screenshotBaselines':dict(baselines),'expectations':expectations,'records':rows}
    report['summary']['screenshotAnchoredStatuses']=dict(Counter(v['status'] for r in rows for v in r.get('screenshotAnchoredChecks',{}).values() if v['audit'] is not None))
    report['screenshotAnchorLimit']='Supplemental checks combine observed None-panel baselines with source selector operands and existing screenshot-derived ladders. They can find inconsistent captures but cannot detect an error shared by every baseline. These are not independent Frosty confirmations.'
    # Link to projectile evidence instead of copying the entire raw projectile four times per panel.
    for panel in expectations.values():
        for entry in panel.values():
            entry['sources']=[{k:s[k] for k in ('projectileXml','projectileGuid') if k in s}
                if isinstance(s,dict) and 'projectileXml' in s else s for s in entry.get('sources',[])]
    (HERE/'frosty-panel-audit-2026-09-07.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    candidates=[{'recordIndex':r['recordIndex'],'weapon':r['weapon'],'path':r['path'],
        'attachmentName':r['attachmentName'],'fields':{k:v for k,v in r.get('fields',{}).items() if v['status']=='difference'}}
        for r in rows if any(v['status']=='difference' for v in r.get('fields',{}).values())]
    (ROOT/'outputs/attachment-audit-stat-candidates.json').write_text(json.dumps(candidates,indent=2)+'\n',encoding='utf-8')
    supplemental_candidates=[{'recordIndex':r['recordIndex'],'weapon':r['weapon'],'path':r['path'],'attachmentName':r['attachmentName'],
        'fields':{k:v for k,v in r.get('screenshotAnchoredChecks',{}).items() if v['status']=='screenshot-anchored-difference'}}
        for r in rows if any(v['status']=='screenshot-anchored-difference' for v in r.get('screenshotAnchoredChecks',{}).values())]
    (ROOT/'outputs/attachment-audit-handling-candidates.json').write_text(json.dumps(supplemental_candidates,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['summary'],indent=2))
    print('Candidate panels:',len(candidates))
    return report

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-pending',action='store_true',help='Add source fields to pending rows; never overwrite captured stats.')
    sweep(parser.parse_args().update_pending)
