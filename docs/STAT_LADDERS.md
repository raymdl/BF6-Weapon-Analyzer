# Stat ladders and source-array indexing

[Documentation index](README.md) · [Data reference](DATA_REFERENCE.md) · [Attachment model](ATTACHMENT_MODEL.md)

All values below come from [balance_tables.json](../data/balance_tables.json).
Finite arrays are **zero-based and source-ordered**. Preserve repeated values and
row order: an attachment changes a coordinate, not a percentage of the selected
row's value. Sum all contributions on an axis, then clamp once to `[0, length−1]`.
Clamping each attachment separately can produce a different composed result.

```mermaid
flowchart LR
    Base["Weapon's reviewed base coordinate"] --> Sum["Combine signed modifiers for this axis"]
    Sum --> Clamp["Clamp final coordinate once"]
    Clamp --> Lookup["Select source row; preserve precision"]
    Lookup --> Output["Use exact value; round display only"]
```

Primary evidence: [array review](../reference-data/provenance/frosty-array-review-2026-09-09.json)
and [draw-time review](../reference-data/provenance/frosty-draw-time-2026-09-09.json).
The former includes pre-integration comparisons; those old values are not the
current tables printed here. Source values establish configuration. Factory-build
normalization, modifier activation and native composition can require additional evidence.

## Index equations and sign conventions

`C(x,T)` denotes one final clamp into table `T`. `wm` is `WEAPON_MAG[weaponId]`.
The following equations describe [applyAttachments](../sim/applyAttachments.js):

| Axis | Final index | Participating modifiers |
|---|---|---|
| ADS-in | `C(wm.defAds − mag.adsTimeTierShift + grip.adsTimeTierMod + barrel.adsTimeTierMod, ADS_SPD_TIERS)` | Magazine, grip, barrel. |
| ADS movement | `C(wm.defAms − mag.adsMoveSpeedTierShift − grip.adsMoveSpeedTierShift − ammo.adsMoveSpeedTierShift, ADS_MOVE_TIERS)` | Magazine, grip, ammo. |
| Moving ADS spread | `C(MOVING_ACC_TIERS.indexOf(spread.adsMove[0]) + Σ movingAdsSpreadTierMod, MOVING_ACC_TIERS)` | Grip, laser, barrel, magazine; base comes from each weapon. |
| Hip spread | `C((override ?? base) − Σ hipSpreadTierMod, HIP_SPREAD_TABLE)` | Muzzle, barrel, laser, grip, ammo. |
| Sprint recovery | `C(wm.sprintRecoveryBaseIndex − Σ sprintRecoveryTierShift, sprint)` | Magazine, grip, ergo, barrel, muzzle, laser, light, ammo. |
| Deploy / undeploy | `C(wm.deployBaseIndex − Σ deployTimeTierShift, chosen table)` | Same eight sources, summed separately from sprint. |

Missing modifier fields contribute zero. Catalog `TierShift` and `TierMod` fields
have different historical sign conventions; never apply a single universal sign
rule. Higher source indices generally give faster handling/lower spread, but hip
rows contain a separate range and must not be globally sorted.

## ADS-in, ADS movement, and moving ADS spread

Values in `ADS_SPD_TIERS` are milliseconds; `ADS_MOVE_TIERS` are dimensionless
movement fractions; `MOVING_ACC_TIERS` are angular minima in degrees. A dash in
this comparison table means that array has no entry at that index.

| Index | ADS_SPD_TIERS (ms) | ADS_MOVE_TIERS | MOVING_ACC_TIERS (°) |
|---|---|---|---|
| 0 | 500.0 | 0.325 | 0.68 |
| 1 | 433.334 | 0.325 | 0.55 |
| 2 | 366.667 | 0.37 | 0.43 |
| 3 | 300.0 | 0.42 | 0.32 |
| 4 | 250.0 | 0.475 | 0.22 |
| 5 | 200.0 | 0.535 | 0.13 |
| 6 | 166.667 | 0.6 | 0.05 |
| 7 | 133.334 | 0.67 | — |
| 8 | — | 0.745 | — |
| 9 | — | 0.825 | — |
| 10 | — | 0.91 | — |
| 11 | — | 1.0 | — |

`MSA_ADS_Weapons` supplies the twelve movement rows, including two `0.325` entries.
`ZDA_Moving_Weapons` supplies the seven moving-spread rows. Its first three raw
columns agree; its distinct fourth column remains in evidence rather than becoming
extra tiers. Each weapon stores its base minimum in `spread.adsMove[0]`. Attachment
shifts select another row and update that bound; there is no global base override.

The FZT source collection contains 80 rows across transition families. These eight
ADS-in positions are separate from ADS-out and AZT main/alternate animation timings.
ADS-out's rounded values are 400/333/267/233/200/167/133/100 ms; they are retained
research evidence and are not a second runtime ADS-in ladder.

`defAds` and `defAms` are reviewed/normalized base coordinates, not a guarantee that
all raw source defaults were imported without composition adjustments. VSSM's
factory suppressed-barrel ADS question remains open. Displayed ADS movement uses
two decimals after float32 conversion; calculations retain these source decimals.

## Hip spread: all eighteen rows and seven columns

`hipStand` maps to source `Field_1867639b`; `hipMove` maps to `Field_c5401fc2`.
Only those two columns currently set runtime minima. H1–H5 below retain the other
source fields without assigning unverified stance meanings:

| Column | Retained field |
|---|---|
| H1 | `Field_160ef028` |
| H2 | `Field_b3ab862b` |
| H3 | `Field_1ef3a223` |
| H4 | `Field_553bcee0` |
| H5 | `Field_39b31415` |

| Index | hipStand ° | hipMove ° | H1 | H2 | H3 | H4 | H5 |
|---|---|---|---|---|---|---|---|
| 0 | 7.4 | 9.25 | 18.5 | 5.55 | 7.4 | 3.7 | 5.55 |
| 1 | 4.848 | 6.06 | 12.12 | 3.636 | 4.848 | 2.424 | 3.636 |
| 2 | 3.352 | 4.19 | 8.38 | 2.514 | 3.352 | 1.676 | 2.514 |
| 3 | 2.432 | 3.04 | 6.08 | 1.824 | 2.432 | 1.216 | 1.824 |
| 4 | 1.804 | 2.255 | 4.51 | 1.353 | 1.804 | 0.902 | 1.353 |
| 5 | 1.352 | 1.69 | 3.38 | 1.014 | 1.352 | 0.676 | 1.014 |
| 6 | 1.024 | 1.28 | 2.56 | 0.768 | 1.024 | 0.512 | 0.768 |
| 7 | 0.784 | 0.98 | 1.96 | 0.588 | 0.784 | 0.392 | 0.588 |
| 8 | 0.608 | 0.76 | 1.52 | 0.456 | 0.608 | 0.304 | 0.456 |
| 9 | 0.476 | 0.595 | 1.19 | 0.357 | 0.476 | 0.238 | 0.357 |
| 10 | 0.38 | 0.475 | 0.95 | 0.285 | 0.38 | 0.19 | 0.285 |
| 11 | 2.16 | 2.7 | 5.4 | 1.62 | 2.16 | 1.08 | 1.62 |
| 12 | 1.444 | 1.805 | 3.61 | 1.083 | 1.444 | 0.722 | 1.083 |
| 13 | 0.972 | 1.215 | 2.43 | 0.729 | 0.972 | 0.486 | 0.729 |
| 14 | 0.656 | 0.82 | 1.64 | 0.492 | 0.656 | 0.328 | 0.492 |
| 15 | 0.444 | 0.555 | 1.11 | 0.333 | 0.444 | 0.222 | 0.333 |
| 16 | 0.304 | 0.38 | 0.76 | 0.228 | 0.304 | 0.152 | 0.228 |
| 17 | 0.208 | 0.26 | 0.52 | 0.156 | 0.208 | 0.104 | 0.156 |

The selected row replaces minimum spread; existing maximum bounds are preserved.
The ordinary run is rows 0–10 and the additional shotgun range is rows 11–17.
Buckshot, 00 Buckshot, and Flechette on the four shotgun records use ammo modifier
`−9`, which adds nine to the source coordinate through the subtraction equation.
Slugs do not apply that shift. Do not flatten these rows into a sorted ladder or
interpret the seven columns as seven attachment tiers.

M433 has base index 3: 2.432° standing / 3.04° moving. A catalog hip shift of `−1`
selects row 4: 1.804° / 2.255°; `−2` selects row 5: 1.352° / 1.69°.
This is a lookup, not repeated percentage reduction.

VSSM uses raw base index 4: 1.804° standing / 2.255° moving. The former index-2
override preserved the older class-based baseline pending configuration evidence.
Matched standing screenshots show VSSM and M4A1 at 81 px, versus M39 EMR at
136 px, supporting its removal. The moving value follows source row 4; it is
not independently calibrated by those screenshots. See the
[VSSM recording analysis](VSSM_RECORDING_ANALYSIS_2026-09-11.md).

## Sprint recovery, deploy, and undeploy

Values below retain the exported fractional milliseconds. `resolveDrawTime()`
requires a valid base index, integer shifts, finite nonnegative nonempty arrays,
and matching deploy/undeploy lengths. Invalid inputs return `valid:false`, a reason,
and null timing results rather than inventing a class default.

| Index | Sprint ms | Primary deploy ms | Primary undeploy ms | Sidearm deploy ms | Sidearm undeploy ms |
|---|---|---|---|---|---|
| 0 | 400.001 | 1333.334 | 400.001 | 466.667 | 233.334 |
| 1 | 350.001 | 1116.667 | 366.667 | 466.667 | 233.334 |
| 2 | 300.001 | 1000.004 | 333.334 | 466.667 | 233.334 |
| 3 | 266.667 | 866.667 | 300.001 | 466.667 | 233.334 |
| 4 | 233.334 | 733.334 | 266.667 | 466.667 | 233.334 |
| 5 | 200.001 | 633.334 | 233.334 | 466.667 | 233.334 |
| 6 | 166.667 | 533.334 | 200.001 | 466.667 | 233.334 |
| 7 | 133.334 | 466.667 | 166.667 | 466.667 | 233.334 |
| 8 | 100.001 | 400.001 | 133.334 | 400.001 | 200.001 |
| 9 | 83.3334 | 350.001 | 116.667 | 350.001 | 166.667 |
| 10 | 66.667 | 300.001 | 100.001 | 300.001 | 133.334 |
| 11 | 50.001 | 266.667 | 83.334 | 266.667 | 116.667 |
| 12 | — | — | — | 233.334 | 100.001 |
| 13 | — | — | — | 200.001 | 83.334 |
| 14 | — | — | — | 166.667 | 66.667 |

`deployTimeTable` chooses `primary` or `sidearm` per weapon; do not infer it from
the displayed class. VZ61 uses `primary` despite its Sidearm class. Sprint and
deploy have independent base coordinates (important for Interdictor); deploy and
undeploy share their resolved coordinate. DB12 has no extra hard-coded class offset.
Repeated sidearm rows 0–7 must survive even though their values coincide.

Example: M433 sprint/deploy bases are both 5. A summed shift of `−1` on each axis
selects index 6: sprint 166.667 ms, primary deploy 533.334 ms, undeploy 200.001 ms.
A raw coordinate beyond the final row uses the last row; it does not extrapolate.
The helper exposes raw/resolved coordinates and clamping for diagnostics. Selected
builds expose millisecond results and legacy deploy/undeploy seconds.

Source seconds are multiplied by 1000, not replaced with rounded display timings.
Historical sprint comparisons used screenshot identity mappings; the audit does
not contain independent deploy/undeploy measurements. Matching a sprint panel
therefore does not validate every transition animation.

## Recoil, velocity, and reload factors

These are separate algebraic families, not additional finite handling arrays.

| Family | Rule | Evidence / boundary |
|---|---|---|
| `RECOIL_MULT[id]` | ADS effective amount = `round3(base recoilV × factor^sumAdsTiers)`. M433 factor is 0.945. | All 63 factors matched reviewed raw ADS/hip factors. Base `recoilV` already includes its base exponent. |
| Per-aim variation | `dirVar × dirVarMult^(dirVarExp + summed variation tiers)` | Per-weapon/group geometric factors; never a universal linear percent. Hip amount uses its raw group factor/exponent similarly. |
| `VELOCITY_LADDER = 0.8` | Barrel multiplier = `0.8^(−velTierMod)`; subsonic tier treatment = `baseVelocity × 0.8^tier` before barrel. | Source factors 0.8, 0.64, 0.512 and 1.25 agree with these powers. Absolute ammo treatments remain separate. |
| `RELOAD_SPEED_MULTIPLIERS` | Index 0 → 1; 1 → 1.13; 2 → 1.277. Reload seconds divide by the selected factor and ergo multiplier. | Exact named factors, not `1.13^tier`. The double factor is 1.277, not 1.2769. |

A one-tier barrel velocity increase turns 630 m/s into 787.5 m/s before display
flooring; physics keeps 787.5 and the card shows 787. The epsilon correction only
repairs values infinitesimally below an integer, not genuine fractional values.
A 3 s reload at factor 1.277 becomes about 2.349256 s before ergonomic effects.
The separate 1.063 Mag Catch factor is an ergonomic scalar, not an extra selectable
magazine-ladder row. Animation overrides use their direct milliseconds before
applying that ergonomic scalar.

`HP_HS_HIGH` is a membership list, and recoil-decay, headshot, limb, collateral and
base-index maps are keyed lookups. Their entries are not source coordinates.
See [damage policy](DAMAGE_BALLISTICS.md) and [recoil recovery](RECOIL_SPREAD_MODEL.md)
for those equations; see [data reference](DATA_REFERENCE.md) for the complete array inventory.
