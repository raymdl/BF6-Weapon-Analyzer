# Weapon data in Frosty

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Data graph](DATA_GRAPH.md) · [Open questions](OPEN_QUESTIONS.md)

What the game data says about weapon-level values, and how the site uses it. The model
equations live in the model guides ([damage and ballistics](../DAMAGE_BALLISTICS.md),
[recoil and spread](../RECOIL_SPREAD_MODEL.md), [stat ladders](../STAT_LADDERS.md));
this page covers the source side. The native equations are in game code, which was not
examined; all findings use exported values and their structure.

## Damage curves (`PD_*`)

- Each curve stores distance and damage together (`Field_3901db14` distance,
  `Field_42fc0f5e` damage), twice per object: as a point list (`Field_edfc6df6` of
  `Struct_c45202f2`) and as a flat interleaved array (`Field_5279388d`).
- **The two copies can disagree.** In 1.4.2.5 the Interdictor had 170 in the point list
  and 175 in the flat array on the fourth distance. Read both and reconcile.
- The Interdictor has a site curve (`Field_2ad7e688`, registry `TweakableDamageCurve`), a
  second health curve (`Field_6008eb31`) and armor curves (`Field_0bdc38c4`,
  `Field_7e05a1ae`, REDSEC). 1.4.3.0 moved the site curve to 100/80, 120/100, 160/100,
  180/80, 200/80 ([1.4.3.0 record](../archive/FROSTY_1.4.3.0_UPDATE_PLAN.md)).
- Review: [frosty-damage-curve-review-2026-09-13.json](../../reference-data/provenance/frosty-damage-curve-review-2026-09-13.json).

## Hit zones

- Multipliers are in the level material grids, not in weapon assets. Read the grids as
  raw EBX with the bounded reader ([Tools](TOOLS.md#raw-ebx-scripts)); never export them
  as XML.
- `scripts/frosty-hit-zones.py` maps each weapon/ammo projectile material to the head,
  torso and limb arrays. 63 weapons and 328 ammo choices; both maps (MP_Abbasid,
  MP_Badlands) agree.
- 1.4.3.0: the Interdictor projectile material moved 781 → 784 and its limb multiplier
  0.67 → 1.0; headshot stays 1.75.
- Evidence: [frosty-hit-zones-2026-09-15.json](../../reference-data/provenance/frosty-hit-zones-2026-09-15.json)
  and the material-grid inventory
  ([frosty-material-grid-inventory-2026-09-14.json](../../reference-data/provenance/frosty-material-grid-inventory-2026-09-14.json)).

## Projectiles and ballistics

- All 63 base projectiles have gravity −9.81 (`Field_d9d33d20`) and drag 0.0035
  (`Field_30c37c24`), named by the registry on 61 weapons and matched raw on RPK74M and
  VSSM.
- 25 projectile-swap branch records: 14 with drag 0.0035, 10 with 0.002, one with 0.0025
  (SV-98 Perst4 → `PD_SP_Enemy_762x54mmR_Bolt`, outside the ammo map).
- `scripts/frosty-ballistics.py` generates per-weapon/ammo projectile links
  (`data/ballistics.json`). It rejects stale XML hashes, missing ammo attachments, roster
  mismatches and SP projectiles. 1.4.3.0 changed only labels and hashes.
- Two unsupported Lightweight ammo choices (M60, M121 A2) were removed: no Frosty
  attachment, and the operator confirmed the game does not offer them.

## Collateral

- Base index: named WB `DamagePenetrationMultiplierIndex`. Steps: `Class_d11a23a2`
  `Field_fbfacac9` (P05/P10/P15 = 1/2/3).
- Table: `Class_6aa794ef.Field_c52d90b8` (raw offset 24) holds
  `[0, 0.166667, 0.25, 0.333334, 0.500001, 0.571429, 0.666667, 0.750001, 0.833334, 1]`
  for every checked projectile and body material on both maps. The
  `CollateralMultiplierAttributeDelegate` resource `FB59FAF31E5E634B` has the same ten
  values at byte 140.
- Rule: base plus steps, clamped to 0..9 (operator confirmed). M121 A2 Tungsten:
  6 + 3 + 1 = 10 → 9 → 1.00. `scripts/frosty-collateral.py` generates all 328 values.

## Controller recoil

`GRM_Recoil_Controller_03` holds 0.8836 (`Field_bbbfe9cc`, enabled) in both aim states,
bound on 57 weapons. L115, M2010 ESR, Mini Scout, PSR, SV-98 and Interdictor have no
binding. The raw branch values (53 × 100, 2 × 1001, 1000, 28) are `Int32`, not a named
input enum. The site uses 0.8836 as its controller amount multiplier at the operator's
request; native activation is not decoded.

## Regeneration and spotting

- **Regeneration.** `GRX_Glacier_Soldier` `RegenerationDelay` = 5 (referenced by
  `Glacier_Soldier`). Frangible adds 4, Flechette 2 (all 58 and 4 choices agree). The site
  shows 9 s and 7 s.
- **Spotting.** Suppressor factors 0.14/0, VSSM 0.06/0, subsonic 0.4285714/1. The site
  multiplies them against 54 m (world) and 150 m (minimap) bases from screenshots
  (150 × 0.14 = 21; 150 × 0.4285714 ≈ 64; product ≈ 9). No source field for the bases
  was found in `SimEx_WeaponFireSpotting`, `PF_SpotSelfOnFire` or the registries. A 150
  in an unrelated curve is not evidence.

## Spread

### Tables and indices

- `ZDA_Moving_Weapons` holds the moving ADS rows; GS `MovingZoomedMinAnglesArrayIndex`
  (`Field_d94fe6ad`) selects the row. Hip rows: `UnzoomedMinAnglesArrayIndex`
  (`Field_fe708077`). Column meanings are in the [field map](FIELD_MAP.md#weapon-stats-gs-and-wb)
  and [stat ladders](../STAT_LADDERS.md).
- Distribution exponent: 0.5 in all 252 source states except Interdictor moving ADS
  (0.67). The site samples `r = spread · U^exponent`.

### Recovery law

Per branch (aim × stationary/moving), GS `DispersionBehavior` values follow one design:

- Firing: `FiringDecreaseOffset = FiringDecreaseCoefficient × c` with c = 9.72 in hip
  (62 of 64 weapons) and 2.25 in ADS (40 of 64); `FiringDecreaseExponent` 2.5. The other
  22 weapons (bolt-actions, DMRs, pistols, shotguns) have ADS coefficient 0, offset 6.6.
- Not firing: coefficient 0; offset = firing offset × 8/3 (ADS 7.2 for the 40), hip
  12.96. Idle: coefficient 0, offset 25 (hip) or mostly 7.5 (ADS); `IdleTime` 0.6 s hip
  (55 weapons), 0.4 s ADS (62).
- `FirstShotIncreaseMultiplier` 1 and the generic `Decrease*` (1.8/0.25/0.4) are
  uniform. Exceptions: Minigun and Railgun.

All 24 scaling modifiers (12 lights, 7 ADS barrels, 5 bipod) multiply `IncreasePerShot`
and the three offsets by k (0.666667; bipod 0.333333) and `FiringDecreaseCoefficient` by
exactly k^−1.5. With Δ = spread − minimum, `dΔ/dt = −(C·Δ^2.5 + O)` is unchanged when Δ,
the increase and O scale by k and C by k^−1.5. So the power applies to spread above the
minimum, as in the site's `applySpreadRecovery`.

- Sustained fire: `Δ* = max(0, (I/τ)/C − c)^0.4`. M240L hip (I 0.941, C 0.5, c 9.72,
  600 RPM): about 2.42° above the minimum.
- The engine has three recovery states (firing, not firing, idle); the site has two and
  no idle state. The switch rule is not in the data.
- **AK4D check.** From exported values only, the time from the last shot to the minimum
  is 0.199 s with the not-firing branch, 0.425 s firing, 0.103 s idle and 1.201 s with the
  generic branch. Recordings show about 0.21 s
  ([analysis](../archive/RECORDING_REUSE_ANALYSIS_2026-09-12.md)), which supports a
  switch to not-firing recovery soon after the burst and no idle before about 0.2 s.

### No per-shot increase: semi-auto and deployed

`GBM_NoIncrease_Semi_P00` and `GBM_NoIncrease_ERG_P00` set `IncreasePerShot` ×0 for all
states. Semi: selector `ba7bb6a2` (`_Ergo/CMU_SemiAuto`), bound in 40 GS files. "ERG":
selector `15cff9ff`, set by a WB condition group on bipod-active (`f6bad488`) and mounted
(`d37fbd7e`, `c9d17854`) selectors; it is the deployed state, not an ergonomic
attachment (25 GS files). The site has one fixed fire mode per weapon and no deployed
state.

## Recoil

- Recoil amount `Field_22810b21`, direction variation `Field_865174fa`.
- All 62 supported GS records, both aims: `RecoilDecreaseOffset` 0.06,
  `RecoilDecreaseNorm` 1, `ShootingRecoilDecreaseScale` 1, `RecoilDuration` 0.025; hip
  equals ADS for factor and offset. Factor and time exponent form 13 profiles (for
  example 72/1.2, 55/1.023, 104/1.459; 70/4.0 with exponent 0.6 for bolt-actions and two
  shotguns). Half-lives under the site law are 150–330 ms, with no fire-rate design
  target. Recoil modifiers change amount through tier exponents and do not scale
  recovery.
- Sniper brakes: `GRM_Recoil_MZL_Bolt_P10` adds 6 amount tiers (ADS and hip);
  `scripts/frosty-sniper-brakes.py` generates 16 weapon/brake pairs.

## Camera recoil ladder

`GCR_*` optic modifiers set `Field_bbbfe9cc` (enabled by `Field_bbffe8bc`), one value per
magnification, strictly monotonic. Higher probably means less camera shake (operator
report and ladder shape); the unit is not decoded. The site has no camera recoil model.

| Zoom | Value | Zoom | Value |
|---|---|---|---|
| 1.00x | -0.5 | 3.50x | 0.449399 |
| 1.25x | -0.254767 | 4.00x | 0.505185 |
| 1.50x | -0.084472 | 4.50x | 0.54968 |
| 1.75x | 0.041348 | 5.00x | 0.586081 |
| 2.00x | 0.138476 | 6.00x | 0.642258 |
| 2.50x | 0.279325 | 8.00x | 0.715803 |
| 3.00x | 0.377135 | 10.00x | 0.762266 |

`Field_7f1bb9d4` and `Field_9532eb28` must hold the same value in a member. All 34
assets were checked; the only defect was the SU-230 LPVO (`GCR_LPVO_4x00_1x00_P00`),
whose 1× state held 10, fixed in 1.4.3.0.

## Timing fields

- `Field_440ed7fa` (WB): 15 distinct values across 64 blueprints, all whole 1/60 s frames
  (4–24, and 0). It is **not** the rate of fire: `GRX_Weapons` names RateOfFire
  separately and they disagree on at least nine weapons (590A1 0.4 against 0.033; DP12
  0.4 against 0.167). Where they agree it equals 60/RateOfFire rounded to a frame. Most
  likely an animation or input window. 1.4.3.0 set ScorpionEvo3 and Skorpion to 4 frames.
  Not applied to the site.
- `Field_52a8ad43` (WB): 0.067 (four frames) on every weapon.

## Class weapon traits

Selectors are in `Common/Gameplay/InRoundProgression/WeaponTraits/<Class>/U_Ability_<Class>Trait`.
Weapon files do not reference them; the class activates them. Native activation rules
are not decoded, and the site does not model traits.

| Trait | Weapons | Effect | Route |
|---|---|---|---|
| Assault | 11 ARs (6P67, ACE32, EF88, G36, G3A4, HK433, L85A3, M16A3, SCARL, Tavor7, VHS2) | Deploy tier +1 and sprint-recovery tier +1 | WB `WM_AssaultTrait` |
| Support | 10 LMGs (M240L, M250, M27IAR, M60E6, MG4K, MG5, Minimi, RPK74M, RPKM, Ultimax) | ADS time +1 (animation and FOV) | GS `GID_ADSTime_Trait_P10` (priority 1000), WB `WPM_SupportTrait` |
| Engineer | 10 SMGs (APC10, APDW, MP5MLI, MP7A2, MPX, P90, PP19, ScorpionEvo3, UMP40, Vector) | Hip spread row +1 | GS `GDM_Array_HipDispersion_TRAIT` |
| Recon | 6 bolt-actions (DesertTechHTI, L115A3, M2010ESR, MRAD, MiniFix, SV98M) | Weapon and camera sway P10; `WPM_SwayPenalty` M10 | WB `WM_ReconTrait` |

`GDM_Array_ADSMoveDispersion_TRAIT` (operand 2) has no GS binding. Examples: M433
sprint/deploy base 5 → 6 gives 166.667/533.334 ms instead of 200.001/633.334 ms; L110
ADS 433.334 → 366.667 ms.

## Named GS/WB fields the site does not use

109 of 170 GRX leaf names under GS/WB paths are not used by the site (13 September).

| Field family | Spread | Assessment |
|---|---|---|
| `Recoil.Zoomed.VerticalRecoilMin` / `Max` / `Increase` | 6 / 5 / 2 distinct | Per weapon; not imported. Possible first-shot vertical kick. |
| `Recoil.Zoomed.HorizontalRecoilLeft` / `Right` | 6 distinct each (±0.2–0.6) | Per-weapon horizontal bounds; relation to direction variation not verified. |
| `Recoil.Zoomed.MaxVerticalRecoil`, `UsePolarRecoil` | 20 (61) / 90 (3); True except one | Near uniform; one non-polar weapon. |
| `IdleDecreaseTargetDuration.StationaryIndex` / `MovingIndex` | 7 distinct | Per-weapon recovery timing index; target array not traced. |
| `ReloadInfoArray[].ReloadThreshold` | 36 distinct (0.72–0.8 common) | Probably the fraction at which ammo is committed. |
| `ReloadInfoArray[].ReloadDelay` / `PostReloadDelay` | Mostly 0; 6–7 non-zero | Check those reload timings. |
| `Ammo.NumberOfMagazines` | 12 distinct | Reserve ammo; not a TTK input. |
| `StanceChangePenalties.*` | 9 weapons, identical | Uniform stance-change penalty; low value. |
| `CameraRecoil.Spring*`, `UseTimeSinceLastShot` | Near uniform | Camera recoil is not modeled. |
| `RecoilFadeOut*`, `FirstShotMultiplierVerticalRecoil`, `AutoReplenish*`, `BridgeDelay` | One value | Placeholder or unused. |

Other leads not modeled: bipod and mounted recoil (`GRM_BipodDeployed_*`,
`GBM_Increase_ADS_*_BTM_Bipod` on M4A1 and QBZ-192, `GRM_Mounted*`). The operator decided
on 13 September to document these without model changes.

## Composite stats

The Precision tables are in `GlacierGameConfiguration/settings`
([field map](FIELD_MAP.md#composite-stat-tables-glaciergameconfigurationsettings),
[report](../../reference-data/provenance/frosty-precision-tables-2026-09-14.json)).
The investigation is in [composite stats findings](../working/COMPOSITE_STATS_FINDINGS.md).

## Evidence

- [frosty-global-operands-2026-09-13.json](../../reference-data/provenance/frosty-global-operands-2026-09-13.json)
  (`scripts/frosty-global-operands.py`): 238 objects, 4,235 attachment links, 750 named
  registry entries, controller bindings, material checks.
- [frosty-global-followup-2026-09-13.json](../../reference-data/provenance/frosty-global-followup-2026-09-13.json):
  regeneration, sway and spotting joins.
- [frosty-global-compiled-trace-2026-09-13.json](../../reference-data/provenance/frosty-global-compiled-trace-2026-09-13.json):
  compiled resources and the collateral byte match.
- [frosty-grx-field-names-2026-09-13.json](../../reference-data/provenance/frosty-grx-field-names-2026-09-13.json)
  and [frosty-light-field-names-2026-09-13.json](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json).
- History: [global-candidates audit](../archive/FROSTY_GLOBAL_CANDIDATES_2026-09-13.md) and
  [stat discovery](../archive/FROSTY_STAT_DISCOVERY_2026-09-13.md).

```powershell
python scripts/frosty-ballistics.py --root '<Frosty export root>' --trace reference-data/provenance/frosty-hit-zones-<date>.json
python scripts/frosty-global-operands.py --root '<Frosty export root>' --out reference-data/provenance/frosty-global-operands-<date>.json --grid <raw grid 1> --grid <raw grid 2> --descriptors '<runtime>/SharedTypeDescriptors.ebx'
```
