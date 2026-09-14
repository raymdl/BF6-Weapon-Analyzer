# Interdictor 1.4.3.0 check

Baseline: Frosty XML export 1.4.2.5 at `C:\Users\royal\Documents\BF6 Datamining\Frosty`.
Keep that tree unchanged. Export 1.4.3.0 assets to
`C:\Users\royal\Documents\BF6 Datamining\Frosty-1.4.3.0` with the same routes.

## Patch notes (1.4.3.0, non-REDSEC)

- Minimum damage 62 -> 80.
- Limb damage matches chest damage.
- Sweet spot damage 150 -> 100.
- Sweet spot range 120-160 m.
- Iron Sight attachment costs 15 points.

## 1.4.2.5 baseline and sources

| Item | Asset | Location | 1.4.2.5 value | Site file |
|---|---|---|---|---|
| Damage curve (site source) | `Common/Hardware/Weapons/_Bullets/PD_.416Barrett` | linked curve `Field_2ad7e688` (GUID `ba0c9abc…`); named registry `PD_.416Barrett.BulletEntityData.TweakableDamageCurve.XYValues` in `GRX_Weapons` | 100:80, 120:150, 150:150, 175:62, 200:62 | `data/weapons.json` `interdictor.dmg` |
| Second health curve | same asset | `Field_6008eb31` (GUID `d90eb3b5…`) | same, but falloff end is 170 m | none |
| Armor curves | same asset | `Field_0bdc38c4`, `Field_7e05a1ae`; registry `TweakableArmorDamageCurve` | peak 102.5 | none (REDSEC armor) |
| Match Grade curves | `Common/Hardware/Weapons/_Bullets/PD_.416Barrett_Match` | same field layout | same values as standard | none |
| Limb multiplier | raw material grids, projectile material 781 | limb array (soldier material 26) | 0.67 | `data/hit_zones.json` `interdictor.limb` |
| Headshot multiplier | same grids | head array index 3 | 1.75 | `data/hit_zones.json` `interdictor.headshot` |
| Iron Sights cost | `Common/Hardware/Weapons/BoltAction/DesertTechHTI/Attachment_DesertTechHTI_SCP_IronSights` | `Field_6ee865a5` | `0x00000005` | `data/attachments.json`: no `interdictor.sightPoints`, so the default `iron.pts` 5 applies |

`Field_6ee865a5` is the point cost: the L115, SV-98 and Mini Scout Iron Sights store
`0x0000000f`, and the site gives those weapons `sightPoints.iron: 15`.

Curve GUIDs also appear in `Common/GameSetup/Tweakables/TweakablesConfig`.

## Assets to export after the update

Use `FrostyCmd export-ebx` for these, one at a time:

1. `Common/Hardware/Weapons/_Bullets/PD_.416Barrett`
2. `Common/Hardware/Weapons/_Bullets/PD_.416Barrett_Match`
3. `Common/Hardware/Weapons/BoltAction/DesertTechHTI/Attachment_DesertTechHTI_SCP_IronSights`
4. `Common/Hardware/Weapons/BoltAction/DesertTechHTI/DesertTechHTI_WB`
5. `Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons`
6. `Common/GameSetup/Tweakables/TweakablesConfig`
7. `Common/GameSetup/Tweakables/Killswitches/KST_CH1_S4_Weapons`, and any new `KST_*_Weapons` asset in the new manifest

Do not use `export-ebx` for material grids. It can use more than 50 GB of memory.
Dump them raw:

```powershell
powershell -NoProfile -File scripts/frosty-raw-assets.ps1 `
  -FrostyDirectory 'C:\Downloads\FrostyToolsuite-battlefield6\FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final' `
  -GamePath 'C:\Program Files\EA Games\Battlefield 6' `
  -OutputDirectory 'C:\Users\royal\Documents\BF6 Datamining\frosty-raw-1.4.3.0' `
  -Routes 'game/glaciermp/levels/mp_abbasid/mp_abbasid/materialgrid_win32',
          'game/glaciermp/levels/mp_badlands/mp_badlands/materialgrid_win32'
```

Then run `scripts/frosty-hit-zones.py` on the new export and grids. Compare its output with
`reference-data/provenance/frosty-hit-zones-2026-09-13.json`.

## Checks after export

- [ ] `git diff --no-index` each old/new XML pair.
- [ ] Damage curve: record the new points. Expected: minimum 80, plateau 100, plateau 120-160 m.
- [ ] Both health curves: do they still differ (170 m and 175 m)?
- [ ] Limb: expected 1.0 in the grid, or a new override in a tweakable or killswitch.
- [ ] Iron Sights `Field_6ee865a5`: expected `0x0000000f`.
- [ ] Look for other changed Interdictor values that the patch notes do not list.

## Site changes if confirmed

- `data/weapons.json`: `interdictor.dmg`, `damageSource`, `provenance.frosty.sourceBuild`;
  the description text "peaks between 120m and 150m" if the game text changes.
- `data/hit_zones.json`: `interdictor.limb`.
- `data/attachments.json`: add `interdictor.sightPoints.iron: 15`.
- `scripts/damage.test.mjs`: the Interdictor tests use 1.4.2.5 values (plateau 150,
  the chest and limb kill windows, minimum damage 62 for all sweet-spot snipers).
