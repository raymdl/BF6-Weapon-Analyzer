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

## Remaining

- Operator decision (13 September 2026): document only; no model changes yet.
- If modeling resumes: verify vertical/horizontal recoil bounds against recordings,
  trace the `IdleDecreaseTargetDuration` target array, and check `ReloadThreshold`
  against reload captures.
