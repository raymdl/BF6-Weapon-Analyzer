import json

with open('data/attachments.json', 'r', encoding='utf-8') as f:
    atts = json.load(f)
with open('data/ammo.json', 'r', encoding='utf-8') as f:
    ammo = json.load(f)

PISTOL_LASER_IDS = ['p18', 'es57', 'm45a1', 'ggh22', 'm357trait', 'vz61']

# 1. Add fast_deploy ergo
if not any(e['id'] == 'fast_deploy' for e in atts['ERGOS']):
    atts['ERGOS'].append({'id': 'fast_deploy', 'name': 'Fast Deploy', 'pts': 5, 'noEffect': True})
    print('Added fast_deploy ergo')

# 2. WeaponPts overrides for sidearms
for laser in atts['LASERS']:
    if laser['id'] == '5mw_red':
        if 'weaponPts' not in laser:
            laser['weaponPts'] = {}
        for wid in PISTOL_LASER_IDS:
            laser['weaponPts'][wid] = 5
        print('Updated 5mw_red weaponPts')
    elif laser['id'] in ('combo_red', 'combo_green'):
        if 'weaponPts' not in laser:
            laser['weaponPts'] = {}
        for wid in PISTOL_LASER_IDS:
            laser['weaponPts'][wid] = 20
        print('Updated ' + laser['id'] + ' weaponPts')

for light in atts['LIGHTS']:
    if light['id'] == 'ads_taclight':
        if 'weaponPts' not in light:
            light['weaponPts'] = {}
        for wid in PISTOL_LASER_IDS:
            light['weaponPts'][wid] = 5
        print('Updated ads_taclight weaponPts')
    elif light['id'] == 'flashlight':
        if 'weaponPts' not in light:
            light['weaponPts'] = {}
        for wid in PISTOL_LASER_IDS:
            light['weaponPts'][wid] = 10
        print('Updated flashlight weaponPts')

for grip in atts['GRIPS']:
    if grip['id'] == 'lp_stubby':
        if 'weaponPts' not in grip:
            grip['weaponPts'] = {}
        grip['weaponPts']['vz61'] = 35
        print('Updated lp_stubby weaponPts for vz61')

# 3. WEAPON_ATTS
LASER_OPT = ['5mw_red', '5mw_green', 'combo_red', 'combo_green', '50mw_green']
LIGHT_OPT = ['ads_taclight', 'flashlight']
VZ61_GRIPS = ['fold_stubby', 'ribbed_stubby', 'canted_stubby', 'lp_stubby', 'cmpct_handstop']
STD_MUZZLES = ['flash_hider', 'sp_brake', 'std_supp', 'cqb_supp']
STD_BARRELS = ['basic', 'light']
SIGHTS = ['iron', 'std_optic']

wa = atts['WEAPON_ATTS']
for wid in ['p18', 'es57', 'm45a1', 'ggh22']:
    wa[wid] = {
        'laserLightCombined': True,
        'muzzle': STD_MUZZLES,
        'barrel': STD_BARRELS,
        'barrelDef': 'basic',
        'laser': LASER_OPT,
        'light': LIGHT_OPT,
        'grip': [],
        'sight': SIGHTS,
    }
wa['m44'] = {
    'muzzle': [],
    'barrel': ['basic', 'extended', 'short'],
    'barrelDef': 'basic',
    'laser': [],
    'light': [],
    'grip': [],
    'sight': SIGHTS,
}
wa['m357trait'] = {
    'laserLightCombined': True,
    'muzzle': [],
    'barrel': ['basic'],
    'barrelDef': 'basic',
    'laser': LASER_OPT,
    'light': LIGHT_OPT,
    'grip': [],
    'sight': SIGHTS,
}
wa['vz61'] = {
    'laserLightCombined': True,
    'laserGripLightCombined': True,
    'muzzle': ['sp_brake', 'std_supp', 'cqb_supp'],
    'barrel': ['basic'],
    'barrelDef': 'basic',
    'laser': VZ61_GRIPS + LASER_OPT,
    'light': LIGHT_OPT,
    'grip': [],
    'sight': SIGHTS,
}
print('Added WEAPON_ATTS for all 7 sidearms')

# 4. WEAPON_MAG
def mag(name, pts, mag_count):
    return {'name': name, 'pts': pts, 'mag': mag_count,
            'adsTimeTierShift': 0, 'sprintRecoveryTierShift': 0, 'adsMoveSpeedTierShift': 0}

wm = atts['WEAPON_MAG']
wm['p18']       = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '17_rnd',
                   'mags': {'17_rnd': mag('17 Rnd', 5, 17), '21_rnd': mag('21 Rnd', 15, 21)}}
wm['es57']      = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '20_rnd',
                   'mags': {'20_rnd': mag('20 Rnd', 5, 20), '30_rnd': mag('30 Rnd', 40, 30)}}
wm['m45a1']     = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '7_rnd',
                   'mags': {'7_rnd': mag('7 Rnd', 5, 7), '11_rnd': mag('11 Rnd', 25, 11)}}
wm['m44']       = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '6_rnd',
                   'mags': {'6_rnd': mag('6 Rnd', 5, 6)}}
wm['ggh22']     = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '15_rnd',
                   'mags': {'15_rnd': mag('15 Rnd', 5, 15), '20_rnd': mag('20 Rnd', 20, 20), '22_rnd': mag('22 Rnd', 30, 22)}}
wm['m357trait'] = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '8_rnd',
                   'mags': {'8_rnd': mag('8 Rnd', 5, 8), '8_fast': mag('8 Rnd Fast', 10, 8)}}
wm['vz61']      = {'defAds': 4, 'defSpr': 4, 'defAms': 4, 'def': '10_rnd',
                   'mags': {'10_rnd': mag('10 Rnd', 5, 10), '20_rnd': mag('20 Rnd', 40, 20)}}
print('Added WEAPON_MAG for all 7 sidearms')

# 5. WEAPON_ERGO
we = atts['WEAPON_ERGO']
we['p18']       = {'avail': ['mag_catch', 'fast_deploy']}
we['es57']      = {'avail': ['mag_catch']}
we['m45a1']     = {'avail': ['mag_catch', 'fast_deploy']}
we['m44']       = {'avail': ['mag_catch', 'fast_deploy']}
we['ggh22']     = {'avail': ['mag_catch', 'fast_deploy']}
we['m357trait'] = {'avail': ['fast_deploy']}
we['vz61']      = {'avail': ['mag_catch']}
print('Added WEAPON_ERGO for all 7 sidearms')

with open('data/attachments.json', 'w', encoding='utf-8') as f:
    json.dump(atts, f, indent=2)
    f.write('\n')
print('Saved attachments.json')

# 6. WEAPON_AMMO
wa_ammo = ammo['WEAPON_AMMO']
COMMON = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15}}
wa_ammo['p18']       = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15}}
wa_ammo['es57']      = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15}}
wa_ammo['m45a1']     = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15}}
wa_ammo['m44']       = {'def': 'standard', 'ammo': {'standard': 0, 'hollow_pt': 20}}
wa_ammo['ggh22']     = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15}}
wa_ammo['m357trait'] = {'def': 'standard', 'ammo': {'standard': 0, 'hollow_pt': 20}}
wa_ammo['vz61']      = {'def': 'standard', 'ammo': {'standard': 5, 'penetration': 5, 'frangible': 20, 'hollow_pt': 15, 'synthetic': 25}}

with open('data/ammo.json', 'w', encoding='utf-8') as f:
    json.dump(ammo, f, indent=2)
    f.write('\n')
print('Saved ammo.json')
print('All done!')
