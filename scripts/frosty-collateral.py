"""Generate per-weapon ammo collateral values from the retained Frosty table trace.

The operator confirmed that combined indices clamp to the table bounds.
Source composition is retained in the trace; screenshot values are rounded views.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def collateral_at(table, index):
    return table[max(0, min(len(table) - 1, index))]

def main():
    trace = json.loads((ROOT / 'reference-data/provenance/frosty-global-compiled-trace-2026-09-13.json').read_text())
    table = trace['collateralTable']['values']
    indices = {weapon: {ammo: row['baseIndex'] + row['shift'] for ammo, row in rows.items()}
               for weapon, rows in trace['derivedAmmo'].items()}
    for row in trace['unresolvedSelections']:
        assert row['weapon'] == 'm121a2' and row['ammo'] == 'penetration'
        indices[row['weapon']][row['ammo']] = row['baseIndex'] + sum(row['modifierSteps'])
    roster = json.loads((ROOT / 'data/ammo.json').read_text())['WEAPON_AMMO']
    assert set(indices) == set(roster)
    for weapon, rows in indices.items():
        assert set(rows) == set(roster[weapon]['ammo']), weapon
    values = {weapon: {ammo: collateral_at(table, index) for ammo, index in rows.items()}
              for weapon, rows in indices.items()}
    path = ROOT / 'data/balance_tables.json'
    text = path.read_text(encoding='utf-8')
    start = text.index('  "COLLATERAL_MULT_OVERRIDE": ')
    end = text.index('  "MOVING_ACC_TIERS": ', start)
    replacement = '  "COLLATERAL_MULT_OVERRIDE": ' + json.dumps(values, indent=2).replace('\n', '\n  ') + ',\n'
    path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
    print(f'Generated {sum(map(len, values.values()))} ammo collateral values; indices clamp to 0..{len(table)-1}.')

if __name__ == '__main__':
    main()
