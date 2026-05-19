import json

atts = json.load(open('data/attachments.json'))
ammo = json.load(open('data/ammo.json'))

SIDEARM_IDS = ['p18','es57','m45a1','m44','ggh22','m357trait','vz61']
ergo_ids = {e['id'] for e in atts['ERGOS']}
muzzle_ids = {m['id'] for m in atts['MUZZLES']}
barrel_ids = {b['id'] for b in atts['BARRELS']}
laser_ids = {l['id'] for l in atts['LASERS']}
light_ids = {l['id'] for l in atts['LIGHTS']}
grip_ids = {g['id'] for g in atts['GRIPS']}
ammo_ids = {a['id'] for a in ammo['AMMO']}
sight_ids = {s['id'] for s in atts['SIGHTS']}

errors = []
for wid in SIDEARM_IDS:
    wa = atts['WEAPON_ATTS'].get(wid)
    if not wa:
        errors.append(wid + ': missing WEAPON_ATTS')
        continue
    for mid in (wa.get('muzzle') or []):
        if mid not in muzzle_ids:
            errors.append(wid + ' muzzle ' + mid + ' not in MUZZLES')
    for bid in (wa.get('barrel') or []):
        if bid not in barrel_ids:
            errors.append(wid + ' barrel ' + bid + ' not in BARRELS')
    for lid in (wa.get('laser') or []):
        if lid not in laser_ids and lid not in grip_ids:
            errors.append(wid + ' laser/grip ' + lid + ' not in LASERS or GRIPS')
    for lid in (wa.get('light') or []):
        if lid not in light_ids:
            errors.append(wid + ' light ' + lid + ' not in LIGHTS')
    for sid in (wa.get('sight') or []):
        if sid not in sight_ids:
            errors.append(wid + ' sight ' + sid + ' not in SIGHTS')
    wm = atts['WEAPON_MAG'].get(wid)
    if not wm:
        errors.append(wid + ': missing WEAPON_MAG')
    we = atts['WEAPON_ERGO'].get(wid)
    if not we:
        errors.append(wid + ': missing WEAPON_ERGO')
    else:
        for eid in we.get('avail', []):
            if eid not in ergo_ids:
                errors.append(wid + ' ergo ' + eid + ' not in ERGOS')
    wa_ammo = ammo['WEAPON_AMMO'].get(wid)
    if not wa_ammo:
        errors.append(wid + ': missing WEAPON_AMMO')
    else:
        for aid in wa_ammo.get('ammo', {}):
            if aid not in ammo_ids:
                errors.append(wid + ' ammo ' + aid + ' not in AMMO')

if errors:
    for e in errors:
        print('ERROR: ' + e)
else:
    print('All sidearm data validates OK')
    for wid in SIDEARM_IDS:
        wa = atts['WEAPON_ATTS'][wid]
        wm = atts['WEAPON_MAG'][wid]
        we = atts['WEAPON_ERGO'][wid]
        wa_a = ammo['WEAPON_AMMO'][wid]
        nm = len(wa.get('muzzle') or [])
        nb = len(wa.get('barrel') or [])
        nl = len(wa.get('laser') or [])
        print(wid + ': muzzles=' + str(nm) + ' barrels=' + str(nb) + ' lasers=' + str(nl) + ' mags=' + str(len(wm['mags'])) + ' ergos=' + str(len(we['avail'])) + ' ammo=' + str(len(wa_a['ammo'])))

# Verify fast_deploy exists
if any(e['id'] == 'fast_deploy' for e in atts['ERGOS']):
    print('fast_deploy ergo: OK')
else:
    print('ERROR: fast_deploy ergo missing')

# Verify weaponPts
def check_wpts(items, item_id, wid, expected):
    for item in items:
        if item['id'] == item_id:
            actual = item.get('weaponPts', {}).get(wid)
            if actual == expected:
                return True
            else:
                print('ERROR: ' + item_id + ' weaponPts[' + wid + '] = ' + str(actual) + ', expected ' + str(expected))
                return False
    print('ERROR: ' + item_id + ' not found')
    return False

check_wpts(atts['LASERS'], '5mw_red', 'p18', 5)
check_wpts(atts['LASERS'], 'combo_red', 'vz61', 20)
check_wpts(atts['LIGHTS'], 'ads_taclight', 'es57', 5)
check_wpts(atts['LIGHTS'], 'flashlight', 'm45a1', 10)
check_wpts(atts['GRIPS'], 'lp_stubby', 'vz61', 35)
print('weaponPts checks done')
