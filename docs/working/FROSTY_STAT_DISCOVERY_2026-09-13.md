# Frosty stat discovery — working state

Objective: find weapon/attachment stats in the Frosty export that the site does not
model yet, and that would bring the model closer to the game engine. This file is
resumable state; conclusions move to the model guides when adopted.

## Completed

- GRX field-name map: `scripts/frosty-grx-field-names.py`, evidence
  `reference-data/provenance/frosty-grx-field-names-2026-09-13.json`, summary in
  `FROSTY_GLOBAL_CANDIDATES_2026-09-13.md#grx-field-name-map`.
- GRX WB modifier nodes expose only `Priority` leaves; no further names there.
- Effect inventory (all `WPM_*` packages and GS/WB bindings): almost every linked
  effect asset is already referenced by the repo. Covered, not gaps: muzzle
  velocity tiers (`Field_6a5c4efd` = 0.8^n), heavy-barrel ADS spread increase,
  headshot protection steps, penetration steps (collateral), health regen delay.

## Resolved leads (not modeled by the site)

### Class weapon traits

Selectors live in `Common/Gameplay/InRoundProgression/WeaponTraits/<Class>/U_Ability_<Class>Trait`.
The ability assets are not referenced by weapon files; activation is by class.

| Trait | Weapons | Effect (source index; higher = faster/tighter) | Route |
|---|---|---|---|
| Assault | 11 ARs: 6P67, ACE32, EF88, G36, G3A4, HK433, L85A3, M16A3, SCARL, Tavor7, VHS2 | `WM_AssaultTrait`: `Class_4aac041b` (deploy tier) +1 and `Class_03db7a68` (sprint-recovery tier) +1, the same classes and sign as `WME_Draw_*_P05` | WB `WM_AssaultTrait` |
| Support | 10 LMGs: M240L, M250, M27IAR, M60E6, MG4K, MG5, Minimi, RPK74M, RPKM, Ultimax | ADS time +1 on animation and FOV | GS `GID_ADSTime_Trait_P10` (priority 1000) and WB `WPM_SupportTrait` → `WME_ADSTime_Anim_P10`/`FOV_P10` |
| Engineer | 10 SMGs: APC10, APDW, MP5MLI, MP7A2, MPX, P90, PP19, ScorpionEvo3, UMP40, Vector | Hip spread row +1 (`GDM_Array_HipDispersion_TRAIT`, operand 1) | GS only |
| Recon | 6 bolt-actions: DesertTechHTI, L115A3, M2010ESR, MRAD, MiniFix, SV98M | `WM_ReconTrait` → `WME_WSway_P10`/`WME_CSway_P10`; `WPM_SwayPenalty` → `M10` | WB; sway is not modeled |

`GDM_Array_ADSMoveDispersion_TRAIT` (operand 2) exists but has no GS binding.
Example magnitudes from existing ladders: M433 sprint/deploy base 5 → 6 gives
166.667/533.334 ms instead of 200.001/633.334 ms. L110 ADS 433.334 ms → 366.667 ms
(one ADS row). Native class/trait activation rules are not decoded.

### No per-shot spread increase while semi-auto, bipod, or mounted

- `GBM_NoIncrease_Semi_P00` and `GBM_NoIncrease_ERG_P00` both set the
  `IncreasePerShot` operand `Field_5695ee1c = 0` for ADS and hip, stationary and
  moving (the light modifiers use the same field as ×0.666667).
- Semi: selector `ba7bb6a2` is owned by `_Ergo/CMU_SemiAuto`; bound in 40 GS files
  (automatic weapons with a semi mode). WB condition groups list `CMU_SemiAuto`
  with `CMU_BipodActive` and `CMU_Mounted*_Active`.
- "ERG": selector `15cff9ff` is set by a WB `Class_9dfbb158` record inside a
  `Class_1e5eeaaa` group whose `Class_e30e403c` conditions reference the bipod-active
  selector `f6bad488` and mounted selectors `d37fbd7e`/`c9d17854`. Despite the name,
  it is the supported (bipod/mounted) state, not an ergonomic attachment; 25 GS files.
- Site: each weapon has one fixed `fireMode`; no semi selection on automatic weapons
  and no deployed state.

### Other

| Lead | Source | Status |
|---|---|---|
| Optic camera recoil | 34 `GCR_*` modifiers enable zoomed camera recoil operands. | Unmodeled; equation unknown. |
| Bipod / mounted recoil | `GRM_BipodDeployed_*` (recoil index operands), `GBM_Increase_ADS_*_BTM_Bipod` (M4A1, QBZ192), `GRM_Mounted*` (flags). | Deployed state not modeled. |
| P90 Heavy Recoil Spring | `WPM_ERG_HeavyRecoilSpring900_W10` → `WME_Firerate900_M10` (RateOfFire `Field_14c4a054` 800; `Field_be31b12d` 400 vs WB 449.999). Listed only in `P90_WB` modifier assets; no ability branch. | Probably unavailable. |

### GRX-named GS/WB fields the repo never mentions

109 of 170 GRX leaf names under GS/WB paths are not mentioned in scripts, sim or
docs (weapon modifier asset paths excluded). Value spread across weapons:

| Field family | Spread | Assessment |
|---|---|---|
| `Recoil.Zoomed.VerticalRecoilMin` / `Max` / `Increase` | 6 / 5 / 2 distinct (for example 0.6, 0.578, 0.42; Increase 0 or 0.6) | Per-weapon; not in the site's recoil import (`frosty-configuration.py` reads direction, amount and decrease fields). Possible first-shots vertical kick model. |
| `Recoil.Zoomed.HorizontalRecoilLeft` / `Right` | 6 distinct each (0.2–0.6 / −0.2 to −0.6) | Per-weapon horizontal bounds; relation to `RecoilDirectionVariation` unverified. |
| `Recoil.Zoomed.MaxVerticalRecoil`, `UsePolarRecoil` | 20 (61) / 90 (3); True except 1 | Near-uniform; the one non-polar weapon is worth identifying. |
| `IdleDecreaseTargetDuration.StationaryIndex` / `MovingIndex` | 7 distinct indices | Per-weapon spread recovery timing index; target array not traced. |
| `ReloadInfoArray[].ReloadThreshold` | 36 distinct (0.72–0.8 common) | Per reload type; stored unnamed in empty-reload evidence. Likely the fraction at which ammo is committed; unverified. |
| `ReloadInfoArray[].ReloadDelay` / `PostReloadDelay` | Mostly 0; 6–7 non-zero | Few weapons; check those reload timings. |
| `Ammo.NumberOfMagazines` | 12 distinct | Reserve ammo; not a TTK input. |
| `StanceChangePenalties.*` | Only 9 weapons, identical: Duration 0.3/0.9 s, MinAngleOffset 1 (hip stand/crouch), 0.2 (ADS stand/crouch), 6 (prone) | Uniform stance-change spread penalty; low modeling value. |
| `CameraRecoil.Spring*`, `UseTimeSinceLastShot` | Near-uniform (1500/0.94/30; zoomed 1500/0.5/50) | Camera recoil is unmodeled. |
| `RecoilFadeOut*`, `FirstShotMultiplierVerticalRecoil`, `AutoReplenish*`, `BridgeDelay` | One value | Placeholder or unused. |

## Engine formula evidence (source data only)

The native equations are in game code, not in the export. The game executable was
not examined. The findings below use only exported values and their internal structure.

### Modifier operand record (`Struct_b1f8b400`)

| Field | Observed operation | Evidence |
|---|---|---|
| `Field_bbffe8bc` = True with `Field_bbbfe9cc` | Override with value | Smooth: `RecoilDuration` 0.05 / 0.066667; GCR camera values |
| `Field_4692836a` | Add | `GRM_AutoIdentifier_P00` duration −0.0006; Bolt Smooth time exponent −0.5 |
| `Field_5695ee1c` | Multiply | Smooth recovery ×1.2 / ×1.728; spread increase and offsets ×k |
| `Field_98a799ba` | Multiply (seen only on `FiringDecreaseCoefficient`) | ×k^−1.5 |

Across all records in `Common`: multiply-5695ee1c 209, override 164 (+9 flag only),
multiply-98a799ba 56, add 6. No record combines two operations, so the order inside
one record is not observable. Order between modifiers on the same field is unresolved.

### Spread recovery law: self-similar design

Per branch (aim × stationary/moving), the GS `DispersionBehavior` values satisfy:

- Firing: `FiringDecreaseOffset = FiringDecreaseCoefficient × c`, with c = 9.72 in hip
  (62 of 64 weapons) and 2.25 in ADS (40 of 64); `FiringDecreaseExponent` 2.5.
- ADS for 22 weapons (bolt-actions, DMRs, pistols, shotguns): coefficient 0, offset 6.6.
- Not-firing: coefficient 0 (linear); offset = firing offset × 8/3 (ADS 7.2 for the
  40), hip 12.96 constant; idle: coefficient 0, offset 25 (hip) or mostly 7.5 (ADS),
  `IdleTime` 0.6 s hip (55) and 0.4 s ADS (62).
- `FirstShotIncreaseMultiplier` 1 and generic `Decrease*` (1.8/0.25/0.4) are uniform.
- Exceptions: Minigun and Railgun only.

All 24 scaling modifiers (12 lights, 7 ADS barrels, 5 bipod) apply one factor k
(0.666667, or 0.333333 for bipod) to `IncreasePerShot` and the firing, not-firing and
idle offsets, and exactly k^−1.5 to `FiringDecreaseCoefficient`.

Consequence: with Δ = spread − minimum, the law
`dΔ/dt = −(C·Δ^2.5 + O)` is unchanged when Δ, the increase and O are scaled by k and
C by k^(1−2.5) = k^−1.5, while the minimum is not scaled. Therefore the modifiers
were built for this equation, with the power applied to spread above the minimum.
The site's `applySpreadRecovery` already uses this form. The equivalent firing form is
`dΔ/dt = −C·(Δ^2.5 + c)`.

Closed-form sustained fire (continuous balance, firing recovery only): the increase
rate I/τ equals recovery when `Δ* = max(0, (I/τ)/C − c)^0.4`. M240L hip (I 0.941,
C 0.5, c 9.72, 600 RPM): Δ* ≈ 2.42 degrees above the minimum. If (I/τ)/C ≤ c, sustained
fire stays at the minimum.

Differences from the site: the engine has three recovery states (firing, not-firing,
idle after `IdleTime`); the site uses two and has no idle state. The engine's rule for
switching between firing and not-firing is not in the data; the site uses firing
recovery for full-auto intervals and splits burst gaps. Recording scenario 4 in
`BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md` is the test.

### Recoil recovery values

For all 62 supported GS records, both aims: `RecoilDecreaseOffset` 0.06,
`RecoilDecreaseNorm` 1, `ShootingRecoilDecreaseScale` 1, `RecoilDuration` 0.025, and
hip equals ADS for factor and offset. Factor and time exponent form 13 fixed profiles
(for example 72/1.2, 55/1.023, 57/1.045, 104/1.459; 70/4.0 with exponent 0.6 for
bolt-actions and two shotguns). Under the site's recovery law, profile half-lives are
150–330 ms and the remaining fraction at the weapon's own shot interval ranges
0.34–0.92, so no fire-rate design target exists. Unlike spread, recoil modifiers
change amount through tier exponents without scaling recovery, so the data do not
constrain the recoil law further.

## Remaining

- Operator decision (13 September 2026): document only; no model changes yet.
- If modeling resumes: verify vertical/horizontal recoil bounds against recordings,
  trace the `IdleDecreaseTargetDuration` target array, and check `ReloadThreshold`
  against reload captures.
