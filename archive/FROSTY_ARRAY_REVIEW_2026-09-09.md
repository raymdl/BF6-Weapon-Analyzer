# Other stat arrays compared with Frosty — 9 September 2026

This is a review of the remaining ordered stat ladders and the recoil, reload
and velocity tier factors. The findings below describe the pre-integration comparison. The local runtime
changes are recorded in the implementation section. Damage curves,
hit-zone lookup maps and per-weapon reload-animation exceptions are outside this
array review. The sprint/deploy work is covered in
[the draw-time model](FROSTY_DRAW_TIME_MODEL.md).

All 63 mapped weapons reference the same HDA hip array, ZDA moving-ADS array,
MSA ADS-movement array and FZT weapon-zoom transition collection. The
[evidence file](../reference-data/provenance/frosty-array-review-2026-09-09.json)
retains source rows, hashed field identifiers, each weapon's base indices,
registry comparisons, candidate calculations and 187 input hashes.

## Findings

| Analyzer model | Source result | Assessment |
|---|---|---|
| `ADS_SPD_TIERS` | All eight ADS-in durations agree after rounding to milliseconds | Keep the value set; do not merge it with ADS-out or animation timing |
| `ADS_MOVE_TIERS` | Source has 12 rows, with exact fractions and a repeated 0.325 minimum | Our ten rows are a rounded, incomplete subset |
| `MOVING_ACC_TIERS` | All seven main values agree; all 63 source base indices are 3 | The current ordered values and base are supported |
| `HIP_SPREAD_TIERS` / `HIP_CLS` | Source has 18 rows with seven stance/movement values per row | Our five six-value ladders do not reproduce source index steps |
| `RECOIL_MULT` | All 63 stored weapon factors equal the direct ADS and hip source multipliers | No factor-table correction found; attachment exponent semantics are a separate question |
| `VELOCITY_LADDER` | Source factors 0.8, 0.64, 0.512 and 1.25 match powers of 0.8 | Supported, allowing normal floating-point precision |
| `RELOAD_SPEED_LADDER` | Source has 1.063, 1.13 and 1.277; our double step is 1.2769 | Small literal precision difference, not a large reload-model error |

## ADS movement: display values became calculation values

`MSA_ADS_Weapons` contains these values in source index order:

`0.325, 0.325, 0.37, 0.42, 0.475, 0.535, 0.6, 0.67, 0.745, 0.825, 0.91, 1`

The current analyzer stores the reverse direction, omits the two 0.325 rows,
and uses displayed values for four fractions:

| Source value | Current stored value |
|---:|---:|
| 0.825 | 0.82 |
| 0.745 | 0.75 |
| 0.535 | 0.54 |
| 0.475 | 0.47 |

Those values agree with two-decimal display rounding after float32 conversion.
They are not evidence of screenshot transcription errors. The candidate source
calculation matches all 62 captured weapon baselines and all 3,093 comparable
attachment audit entries at panel precision.

An eventual migration should keep exact values for calculations and round only
for display. It should retain both repeated rows, since their indices differ.
The exported array reaches 0.325; this review does not establish which equipped
loadouts reach that row or independently confirm engine clamp behavior for ADS
movement. M60 and PW7A2 currently distribute source-relative adjustments between
base fields and magazine modifiers. Reindexing just the base would be incorrect.

## Hip spread: the main model mismatch

`HDA_Weapons` contains seven values per source row. The standing and moving
columns correspond to `Field_1867639b` and `Field_c5401fc2`; the retained JSON
also preserves the other five fields. Current baseline standing/moving values
agree with the raw selected source row for 62 of 63 weapons. VSSM is the exception.

That baseline agreement does not validate our attachment ladder. For M433:

| Improvement from raw base | Current standing hip spread | Source row candidate |
|---:|---:|---:|
| 0 tiers | 2.432° | 2.432° |
| 1 tier | 1.824° | 1.804° |
| 2 tiers | 1.216° | 1.352° |
| 3 tiers | 0.608° | 1.024° |

The source laser modifier `GDM_Array_HipDispersion_TOP_P10` adds one to the
array index. It does not select the next fractional stance value within the
weapon's current row. The analyzer's Class A–E sequences contain several of
those fractional stance values, but they are not the source tier sequences.

There is also an explicit +9 source index modifier for shotgun ammunition,
linked to the mapped Buckshot, Flechette and 00 Buckshot selections for all four
shotguns. It is absent from the current ammo hip-tier calculation. The HDA rows
are not globally monotonic: rows 11–17 form an additional value range after
rows 0–10. Treating all 18 rows as one sorted ladder would therefore repeat the
same kind of indexing mistake as the former draw-time model.

Before changing runtime hip spread, preserve source row order and resolve the
shotgun shift, effective attachment composition, and index limits. The audit
does not record numeric hip-spread angles, so it cannot independently confirm
these angle candidates.

VSSM needs a separate baseline check: its raw HDA index is 4, which gives
1.804° standing / 2.255° moving, while the analyzer stores 3.352° / 4.19°.
This is a configuration/version/composition question, not an automatic
instruction to replace the current values.

## ADS time: correct ladder, separate transition types

The source ADS-in steps are:

`500, 433, 367, 300, 250, 200, 167, 133 ms`

This is the complete current analyzer value set in reverse order. The source
ADS-out steps are instead:

`400, 333, 267, 233, 200, 167, 133, 100 ms`

The 80 FZT rows contain multiple transition families using the eight tier
positions. Separate AZT main/alternate animation arrays have their own timing
fields. Neither the additional FZT families nor AZT values should be appended
to the ADS-in ladder.

Raw base indices plus decoded default effects match 61 of 62 captured ADS-time
baselines. VSSM gives a 200 ms candidate versus the captured 250 ms because the
source suppressed-barrel selector contributes an additional tier.

Across comparable attachment rows the candidate comparison gives 3,025 matches
and 68 differences. Forty-two differences are VSSM; 26 occur elsewhere. These
retain the existing identity mapping and assume the decoded default/selected
effects apply. They require capture-state, mapping or version checks; they do
not show that the eight-step ladder is wrong. No audit values were changed.

## Moving ADS spread and tier factors

`ZDA_Moving_Weapons` has source-order values
`0.68, 0.55, 0.43, 0.32, 0.22, 0.13, 0.05` for its first three fields. These
are exactly `MOVING_ACC_TIERS` in reverse. All 63 GS base indices are 3, so
the shared 0.32° starting point is supported. A fourth field has a different
seven-value sequence; it is retained as a separate column, not extra tiers.

Four raw weapon `spread.adsMove` entries differ from 0.32°: EF88 0.25°,
Interdictor 0.30°, BROD 3 0.35° and VSSM 0.35°. The attachment resolver already
sets `_movingAdsMinSpreadDeg` from the shared ladder and `spreadBounds` uses
that result. The stored differences are therefore not equivalent to four
current default-runtime errors.

Reload uses an exact source multiplier of 1.277 for the double-speed effect.
Our `1.13 ** 2` gives 1.2769, a relative factor difference of about 0.0078%.
The separate 1.063 Mag Catch factor already exists. Velocity and recoil factor
values agree with the selected source data; this review does not reopen their
attachment activation or animation-timing semantics.

## Next changes to consider

1. Align ADS movement to the full exact array and raw base indices, while
   preserving display rounding and converting existing normalized modifiers.
2. Resolve and replace the inferred hip ladders with the source row structure,
   including the shotgun index range and the VSSM baseline question.
3. Keep the ADS-in and moving-ADS value sets. Resolve ADS candidate differences
   separately. Treat the reload literal precision adjustment as a small,
   independent change.

This pass changed only review artifacts. Existing uncommitted runtime work and
canonical screenshot data were preserved. No game process was accessed.

## Local implementation

The runtime now retains all eight ADS-in durations at exported precision,
all 12 ADS movement rows (slow to fast), and the full sprint/deploy/undeploy
precision. ADS and sprint display whole milliseconds. ADS movement displays two
decimals after float32 conversion, as in the captured panel; calculations retain
the source decimals. Weapon ADS bases use the source table coordinates; existing normalization remains.
Catalog modifier signs remain unchanged and are converted by the resolver.
ADS-out and animation timing are separate tables and are not used as ADS-in.
Moving ADS spread, recoil and velocity factor tables already retained source precision.
Reload uses the exact factors `[1, 1.13, 1.277]`, plus the existing `1.063` Mag Catch
factor. Derived reload seconds remain unrounded until display.

`HIP_SPREAD_TABLE` stores all 18 HDA rows in source order, with all seven fields.
Only the confirmed standing/moving minima have semantic field names. The other
five retain their source identifiers. `HIP_SPREAD_BASE_INDEX` stores all 63 raw
indices. The resolver subtracts the sum of catalog tier shifts, clamps once,
and selects both minima from that row. It preserves the existing maximum bounds.
The spread bar ceiling is 12 degrees so the wider source rows remain visible.

Buckshot, 00 Buckshot and Flechette on KS-18, M87A1, DB-12 and M1014 apply the
source `+9` hip index modifier (catalog `hipSpreadTierMod: -9`). Slugs do not.
The row sequence must not be sorted: rows 11 onward form a separate range.

VSSM retains an explicit hip base override of index 2 while its raw source
index 4 remains recorded. This preserves the existing baseline pending resolution.
Both barrel screenshots show 250 ms ADS-in. The raw zoom base also selects
250 ms, but the Factory selector references an additional one-tier improvement,
which would give 200 ms; the ASM selector has no such operand. Both retain
250 ms in the runtime. The exports do not resolve whether the Factory modifier
is active, normalized elsewhere, or from a different version than the captures.

The evidence JSON remains the original review snapshot. Its runtime-input hashes
refer to the pre-integration files; its source XML hashes and raw rows remain the
provenance for these changes. The canonical screenshot audit and workbook were
not regenerated for this integration.

### Source ordering

ADS time, ADS movement speed and moving ADS spread now use Frosty row order.
`defAds` is remapped as `7 - oldIndex`; `defAms` as `11 - oldIndex`.
The moving spread base stays at index 3, the middle of its seven-row table.
These remain normalized weapon bases, not a replacement with unresolved raw
configuration selectors.

The runtime sums the source-coordinate indices as follows, then clamps once:

- ADS time: `defAds - magazineShift + gripTierMod + barrelTierMod`.
- ADS movement: `defAms - magazineShift - gripShift - ammoShift`.
- Moving ADS spread: `DEFAULT_MOV_TIER + gripMod + laserMod + barrelMod + magazineMod`.

The screenshot audit helper uses the same source direction for its relative
operand calculations. Hip spread and sprint/deploy/undeploy already use source
order. Reload factors are named modifier levels, not a reversed source array.
A before/after comparison of 114,415 default, single-attachment and combined
loadouts found no change to ADS time, ADS movement speed or moving ADS spread.
