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

## Remaining

- Operator decision: which of the resolved leads to model (class trait toggle,
  semi fire mode, deployed/bipod state).
- Scan GS/WB scalar fields the site does not read (sway, zoom, reload details).
