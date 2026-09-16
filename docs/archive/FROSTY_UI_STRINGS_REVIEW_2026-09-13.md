# Frosty UI strings review

Snapshot: 13 September 2026, 1.4.2.5 local export. Internal reference.

Strings come from `Common/Localization/Languages/fs_us_loc`, decoded with FrostyCmd
`export-strings`. This is the only English localization asset in the EBX manifest.
[Weapon display names](../frosty/UI_TEXT.md#weapon-names) gives the decode and hash method.

## Weapon UI records

`UIWeaponAbilityMetaData` and its `S1B1`, `S1B2`, `S2B1`, `S2B2`, `S3B1` and `S4B1`
parts contain the loadout records (`Class_593f6146`). A raw record count is higher
than the site roster:

- `KSG-12` (`KSG`) is a real weapon record that is not on the site.
- `SOR-300SC` has two records with the same description id `EA6CB2D1`.
- `PW7A2` has a second record, `MP7A2 SP SUPPRESSED`, with description id `B30D3E99`.
- `Mini Scout`, `DB-12`, `GGH-22` and `M357 Trait` also have two records.

Each record has a description pointer (`Field_490f0dd0`), a category pointer
(`Field_f8c63ce7`), three role tags (`Field_8c7f991f`) and a numerical stat block.

### Descriptions

All 63 site weapons have a description pointer. 61 resolve to English text.
Two ids are not in the English strings:

| Weapon | Record pointer | Candidate text id | Candidate text range | Site sweet spot |
|---|---|---|---|---|
| M2010 ESR | `2DB86D4C` | `5E0EAEEC` | 75m-100m, "relatively low base magazine capacity" | 75-100 m |
| SV-98 | `E8EA1B59` | `97529B79` | 54m-75m, "legacy 7.62x54mmR" | 54-75 m |

No metadata record uses either candidate id. The match came from the text: the
caliber, the magazine note and the range equal the Frosty damage curve peak.
In-game loadout panels (13 SEP 2026) confirm both texts. The game shows the text,
but this build's metadata pointer does not resolve to it. The panel tags also match:
M2010 ESR Hard-Hitting | Extreme Range | Bolt-Action; SV-98 Versatile | Long Range | Bolt-Action.

The other sniper descriptions agree with `deriveSweetSpot`:
PSR 90m-120m (`84FCD536`), L115 100m-133m (`7A9C24A9`),
Interdictor 120m-150m (`A89AE617`).

### Role tags

[data/weapon-role-tags.json](../../data/weapon-role-tags.json) keeps the three tags
per weapon: style, range and firing. It is reference data only.

- A record with a package image is primary.
- PW7A2: the base record says Mid Range. The SP Suppressed record says Close Range.
  The in-game panel shows Mid Range.
- Mini Scout: `UIWeaponAbilityMetaData` says Mid Range and `UIWeaponAbilityMetaData_S1B1`
  says Long Range. Neither record has a package image. The in-game panel shows
  Long Range, so the file uses `5852C245` and records the panel as `panelEvidence`.
  The later season record is the one the game shows in this case.
- GRT-CPS is in `S2B1`. Its name pointer is `A7711B37`.

### Numerical stat block — do not use

`BFUINumericalWeaponStatManagerWeaponConfigAsset` lists four keys: Firepower,
Accuracy, Range and Handling. The record values are archetype templates, not
per-weapon data. Every SMG has 24/38/38/66. KSG-12 has SMG values. M123K and
M121 A2 have shotgun values, fire mode "Pump Action" and magazine 8. SV-98 shows
fire rate 25. Nine records have no block. The block also holds a fire-mode list,
a magazine count and a fire rate with the same template problem.

## Composite stats

The attribute delegates were found on 6 September. See
[Hipfire](../../reference-data/provenance/composite-hipfire-decode-2026-09-06.json),
[Mobility](../../reference-data/provenance/composite-mobility-inputs-2026-09-06.json),
[Control](../../reference-data/provenance/composite-control-candidate-2026-09-06.json) and
[UI binding](../../reference-data/provenance/composite-ui-binding-review-2026-09-06.json).
There is no Precision delegate.

This review exported the weapon-customization UI assets that the XML tree did not have:

| Asset | Content |
|---|---|
| `NumericalStatsDBD` | `Name`, `Value`, `Delta` |
| `IconizedAttributesDBD` | `Label`, `Value`, `Delta`, `LocalizedValue`, `LocalizedDelta`, `LocalizedSuffixValue`, `Icon`, `IsDeltaPositve`, visibility flags |
| `AttachmentAttributeDBD` | `Text` |
| `WeaponAttributeProgressBar`, `CL_StatsBar_WeaponStats` | Bar layout and color palette |
| `WeaponAttributesDelta`, `WeaponAttributesDeltaValue` | Delta layout, fonts, `{0:s}` format |
| `WeaponAttributesIconizedCell`, `WeaponAttributesIconizedValue`, `WeaponExtendedAttributesCell` | Cell layout; `IconizedAttributesColorLogic` |
| `MetaCustomization_AbilityStatsDBD`, `MetaCustomization_AbilityStatsView` | Visibility flags; uses `WeaponAttributes` |
| `PlayerAbilityStateDBD`, `MP_QuickCustomization_ViewStateGraph` | Ability state and availability; no stat fields |

The bindings receive a finished name, value and delta. They contain no weights or
inputs. The labels `PRECISION` (`2581C0EB`), `HIPFIRE` (`4B1DA1C6`), `MOBILITY`
(`F9880148`) and `CONTROL` (`D81D0800`) are not referenced in the XML export.
The composite values are probably supplied by native code.

## Setting labels and hashes

[frosty-weapon-setting-labels-2026-09-13.json](../../reference-data/provenance/frosty-weapon-setting-labels-2026-09-13.json)
lists 104 English labels for weapon, aim, recoil, spread and handling settings.
Examples: `RECOIL SMOOTHNESS`, `SWAY FREQUENCY`, `ADS MOVE SPEED MULTIPLIER`,
`HIPFIRE DISPERSION INCREASE`. They give names only, not values.

- Delegate argument hashes use djb2-xor, seed 5381, on the case-sensitive name.
  All 14 named delegate arguments agree.
- XML `Field_`/`Class_` names use a different hash. `Name` does not give
  `Field_0c59fa06` with djb2 or FNV-1/1a.
- No label, as a PascalCase, lowercase or camelCase name, matches a hash in
  `GRX_Weapons.xml` or a `Field_` hash cited in the repository.
- Three labels match a known argument name as text: `RECOIL AMOUNT` →
  `RecoilAmount` (`030aea17`), `RECOIL VARIATION` → `RecoilVariation` (`890dbeaa`),
  `DEPLOY TIME` → `WeaponDeployTimeIndex` (`f407a9c7`).

## String usage scan

FrostyCmd `scan-string-usage` searched `Game/GlacierPortal`, `Common/UI`,
`Common/GameSetup`, `Game/GlacierMP/GameSetup` and `Game/GlacierGranite` for 107 ids:
the 104 setting labels, `5E0EAEEC`, `2DB86D4C` and `E8EA1B59`. It found 161 hits
for 35 ids. The scan reads EBX values; it does not search native code.

- `HIPFIRE`, `MOBILITY`, `CONTROL`, `RECOIL SMOOTHNESS`, `SWAY FREQUENCY` and the
  other Portal tuning labels have no hit. Their bindings are not in these paths.
- `PRECISION` has one hit: a string object in `UIGadgetAbilityMetadata`. It is a
  gadget label, not the weapon composite stat.
- `ACCURACY`, `FIREPOWER` and `HANDLING` hit only their `NumericalStatKey` assets.
- Other hits are generic words in loot, options, hints, accolades and gadget text.
- `2DB86D4C` and `E8EA1B59` hit only the M2010 ESR and SV-98 records in
  `UIWeaponAbilityMetaData`. `5E0EAEEC` has no hit.
- `97529B79` was not in this scan.

## Companion Battlefield composite models

Third-party evidence, read 13 SEP 2026 from the bundled `statModels` in
`companionbattlefield.com/assets/app-DZxSgVe7.js`. Their site previously had data
errors; use this only as a research lead.

- Labels: panel labels (`ADS Time In`, `Sprint Recovery`, `Recoil Amount`,
  `2D Spot-On-Fire Range`) are the game's English UI labels. Modifier names
  (`recoilAmountTier`, `hipDispersionTier`, `adsZoomTier`, `precisionMinAngleMult`)
  and raw fields (`HIPRecoilAmount`, `ADSStandBaseMin`) are their own names. No
  Frosty `Field_`/`Class_` hash or delegate argument name appears in the bundle.
- Base panels (`panelBases`) store Hipfire, Precision, Control and Mobility for
  each weapon. Attachments carry explicit `ratings` deltas.
- Hipfire (`hipfire`): one shared 18-value table indexed by hip dispersion row,
  capped at 100, with a per-weapon base index. Rows 1-15 equal the site's
  candidate `10*sqrt(0.425/tan(1.25*H)*83.333/40.924)` on `HIP_SPREAD_TABLE.hipStand`.
  Row 0 differs (22.109 against 23.052). The light gate multiplies every value by
  1.0954 (sqrt 1.2).
- Control (`recoilControl.control`): 2,276 table cells by recoil amount and
  variation tier sums. All agree with the site's Control formula within 0.0001.
- Precision (`recoilControl.precision`): 4,833 precomputed fractional rows for
  41 automatic weapons, keyed by recoil amount sum, variation sum, recoil duration,
  recoil decrease factor, ADS `minAngle` and RPM. G36 examples: `minAngle` 0.36 to
  0.24 raises 26.951 to 31.025; decrease 72 to 103.68 raises 26.951 to 27.468.
  The 22 weapons with `minAngle` 0 or 0.001 have no rows. Their bases vary
  (snipers 100 except Interdictor 1, DMRs 55-80, sidearms 24-57, shotguns 6-14).
- ADS time (`adsTime`): per-weapon milliseconds by tier sum. ADS move speed uses
  the ladder 0.325, 0.325, 0.37, 0.42, 0.475, 0.535, 0.6, 0.67, 0.745, 0.825, 0.91, 1.

## Open questions

- Which native provider supplies Precision?
