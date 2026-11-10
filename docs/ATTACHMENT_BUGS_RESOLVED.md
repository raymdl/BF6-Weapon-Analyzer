# Resolved game bugs

These entries from the [game bug list](ATTACHMENT_BUGS.md) are fixed in the game.
Entry numbers are the same as in that list.
A partly resolved entry keeps its row and section in the active list for the part that is still in the game.
Only the resolved part is here.

| # | Attachment | Weapons | Type | Error | Site status | Resolved in |
|---|---|---|---|---|---|---|
| 1 | Slim Angled | PSR, SV-98, L115, Mini Scout, Interdictor, ELR-40 | Game error | The game applies −1 ADS accuracy while moving. The description does not state this penalty. The Slim Angled action selects the Full Angled package in error. | Resolved in 2.1.2.0: Slim Angled now selects the M2010 ESR package (no moving-ADS penalty); confirm in game | 2.1.2.0 |
| 2 | Hollow Point, Frangible, Tungsten Core | M121 A2 | Game error | The game added the FMJ +1 penetration step to these three ammo types, so Hollow Point and Frangible kept the Standard collateral value. | Resolved in 2.1.2.0: the three ammo selectors lost the FMJ step. The M45A1 part is still active ([entry 2](ATTACHMENT_BUGS.md#2-m121-a2-and-m45a1-special-ammo-keep-the-fmj-package)) | 2.1.2.0 |
| 7 | 200 Rnd belt box | L110, M123K | Game error | The description states reduced ADS accuracy while moving. The game does not apply it. | Resolved in 2.1.2.0: the description no longer claims the penalty | 2.1.2.0 |
| 9 | Extended barrel | SGX | Description error | The description states a fast transition to ADS. The game applies no ADS time change (old text from before the ADS buff was removed). | Resolved in 2.1.2.0: the description no longer claims a faster ADS | 2.1.2.0 |
| 12 | Standard Suppressor | L115 | Game error | Description states a hipfire penalty, but the L115 GS has no hip-dispersion binding for the selected suppressor package. Panel stays at 34. | Resolved in 2.1.2.0: hip-spread +1 applied | 2.1.2.0 |
| 13 | Tungsten Core | L115, Interdictor | Game error | Both used one recoil penalty step; M2010 ESR, PSR and SV-98 use six. | Resolved in 2.1.2.0: both now use six steps (−6). The Mini Scout part is still active ([entry 13](ATTACHMENT_BUGS.md#13-sniper-tungsten-core-recoil-penalties-are-inconsistent)) | 2.1.2.0 |
| 19 | Single-Port Brake | RSPR | Game error | Reduces recoil by seven steps: the weapon file binds the bolt-action sniper recoil modifier (six steps) on top of the normal one. A 5-point brake gives more Control than the 35-point Classic Vertical grip.  With any vertical or stubby grip added, the recoil amount sum passes the end of the Precision table and the panel shows Precision 0. | Resolved in 2.1.2.0: one ADS and one hip step | 2.1.2.0 |
| 20 | Tungsten Core | M121 A2 | Game error | The stat panel showed Collateral Multiplier x0.00: Tungsten Core put the summed penetration row at 10, past the end of the table. Firing-range tests showed full x1.00 damage to the second target. | Resolved in 2.1.2.0 (Tungsten Core one row lower). The ELR-40 part is still active ([entry 20](ATTACHMENT_BUGS.md#20-collateral-multiplier-panel-shows-x000-past-the-top-of-the-table)) | 2.1.2.0 |

## Game errors and suspected errors

### 1. Slim Angled applies an unstated moving-ADS penalty

- **In-game text (Slim Angled, 15 pts).** "Slightly increases weapon draw speed, and
  enables a slightly faster transition to aim down sights (ADS)."
- **In-game text (Full Angled, 5 pts).** "Slightly increases weapon draw speed and
  enables a slightly faster transition to aim down sights (ADS), at the cost of ADS
  accuracy while moving."
- **Bug.** On PSR, SV-98, L115, Mini Scout and Interdictor, the Slim Angled action
  selects the Full Angled package, so Slim Angled gets the moving-ADS penalty and
  the same stats as Full Angled for 10 more points. The Slim Angled description
  (no penalty) is correct; the game applies the penalty in error.
  M2010 ESR Slim Angled has no penalty and its text is correct.
- **Source trace.** Both grips select shared bottom-rail packages in
  `_WeaponModifiers/_BottomRail/Foregrip/Fast/`:
  - `U_WPM_BTM_FastBOLT01_W05` (`8ad0e9cd-…`): WB ADS time +1 (FOV and animation),
    draw deploy/sprint, `WME_DynamicPivot_M10`. Each weapon's GS binds it to
    `GID_ADSTime_BTM_P10` and `GDM_Array_ADSMoveDispersion_BTM_M10` (index
    operand `0xffffffff` = −1). This is the moving-ADS penalty.
  - `U_WPM_BTM_FastBOLT02_W15` (`8cf80d8c-…`): the same ADS time and draw effects
    (same effect GUIDs), no dynamic pivot. GS binds it to `GID_ADSTime_BTM_P10`
    only. It has no dispersion binding.

  | Weapon | Full Angled action | Slim Angled action | Slim penalty |
  |---|---|---|---|
  | M2010 ESR | W05 | W15 only; `M2010ESR_WB` lists the W15 modifier | No |
  | PSR (`MRAD`) | W05 | W05 only | Yes |
  | SV-98 (`SV98M`) | W05 | W05 only | Yes |
  | Interdictor (`DesertTechHTI`) | W05 | W05 + W15; WB has no W15 modifier | Yes |
  | L115 (`L115A3`) | W05 | W05 + W15; WB has no W15 modifier | Yes |
  | Mini Scout (`MiniFix`) | W05 | W05 + W15; WB has no W15 modifier | Yes |

  Inference, not confirmed: M2010 ESR shows the intended setup and the other five
  are incomplete selector assignments. Killswitch defaults are `False` for both
  branches on all six. Open: whether the second `GID_ADSTime_BTM_P10` binding from
  W15 stacks; panels show one ADS tier.
- **Cost.** Slim Angled 15, Full Angled 5 on all six. Cost is `Field_6ee865a5` in
  each weapon's `Attachment_*` file. Package files hold no cost, and `_W##` package
  suffixes are not a reliable cost signal (334 of 3,016 suffixed actions differ).
- **Handling.** Generated Slim Angled and Full Angled handling is identical on all
  six rifles: ADS time +1, sprint recovery −1, deploy −1, ADS move speed 0.
- **In-game.** Mini Scout, Interdictor and L115 stat panels are identical for Slim
  and Full Angled. The Mobility candidate weights the moving-ADS index ×4
  ([composite findings](archive/COMPOSITE_STATS_FINDINGS.md#mobility)). No clamp
  applies: all six rifles start at tier 3 (0.32°). Control: M2010 ESR Mobility is
  52 with Slim Angled and 48 with Full Angled (one index step).
- **Captures (14 September).** ADS strafing HUD bracket outer width in pixels:
  Interdictor None 35, Slim Angled 47, Full Angled 48; Mini Scout None 48, Slim
  Angled 63, Full Angled 63. The grip/None ratio (1.31-1.37) agrees with one ladder
  step, 0.32° to 0.43° (1.34). L115 Slim Angled is not captured.
  [Capture evidence](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/sniper-slim-angled-moving-ads-2026-09-14.json).
- **ELR-40 (2.1.1.0).** The ELR-40, new in this build, has the same fault. Its in-game
  panels for Slim Angled and Full Angled are identical (operator screenshots, 14 October
  2026): Mobility 44, ADS 300 ms, sprint recovery 167 ms. The site applies −1 moving-ADS
  spread on both, from the source data.
- **Site.** −1 moving-ADS spread on Full Angled for all six, and on Slim Angled for
  PSR, SV-98, L115, Mini Scout and Interdictor. L115, Mini Scout and Interdictor
  were added on 14 September; the handling generator preserves these per-weapon
  fields.

### 2. M121 A2 special ammo (resolved part)

Resolved in 2.1.2.0 for the M121 A2: its three ammo selectors lost the FMJ step. The M45A1 part is still in the game; see [entry 2](ATTACHMENT_BUGS.md#2-m121-a2-and-m45a1-special-ammo-keep-the-fmj-package), which keeps the shared description, panels and evidence.

- **2.1.1.0 panels (operator screenshots, 14 October 2026).** M121 A2: Polymer Links
  0.75, Hollow Point 0.75 and Frangible 0.75, still the Standard value. Tungsten Core
  now shows x0.00: the panel no longer clamps row 10, while damage stays x1.00
  (entry 20). P18 control: Frangible 0.50, below Standard 0.57.

### 7. L110 and M123K 200 Rnd belt box

- **In-game text.** L110: "High-capacity belt box that reduces weapon draw speed,
  slows transition to aim down sights (ADS), slows movement speed while ADS, and
  reduces ADS accuracy while moving." M123K uses "belt pouch" with the same claims.
- **Conflict.** "reduces ADS accuracy while moving". The 200-round selector binds only
  an ADS-time modifier in `GS_Minimi` and `GS_MG4K`; no magazine spread modifier is
  linked.
- **In-game.** Matched 100/200-round mid-strafe screenshots show the same HUD bracket
  width. Ribbed Vertical is the positive control.
- **Site.** `movingAdsSpreadTierMod: 0`. The `descriptionMismatch` field on both
  magazine entries in `data/attachments.json` records the conflict.
- **Evidence.** [Attachment model](ATTACHMENT_MODEL.md#belt-box-moving-ads-spread),
  [capture review](../reference-data/provenance/belt-box-moving-ads-2026-09-13.json).

### 12. L115 Standard Suppressor omits the hipfire penalty

- **In-game text.** The Standard Suppressor description states reduced hipfire accuracy.
- **Observed panel.** None and Standard Suppressor both show Hipfire 34. The suppressor
  preview has no Hipfire decrease arrow. This is not a screenshot transcription error.
- **Source trace (1.4.2.5 and 1.4.3.0).**
  `Attachment_L115A3_MZL_BushwackerSuppressor` links through its progression and ability
  branch to `U_WPM_MZL_Suppressor01_W20`, selector
  `276be3b0-2455-46b7-a85e-52c37aa5b3b8`. The WB includes the shared suppressor modifier.
  The hipfire penalty is a separate GS binding to `GDM_Array_HipDispersion_MZL_M10`.
  `GS_L115A3` omits that selector; `GS_EF88` and `GS_M2010ESR` include it. Other L115
  suppressor selectors retain their hipfire bindings.
- **Site.** Since 23 September, a `weaponOverrides.l115` entry sets `hipSpreadTierMod: 0`,
  matching the game panel. The choice is marked as bugged.
- **Status.** Missing source binding and unchanged game panel confirmed. Whether the
  omission is intentional is unknown. Actual firing spread has not been tested here.
- **Evidence.** [Versioned source paths, hashes and selector bindings](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/l115-standard-suppressor-hipfire-2026-09-21.json).

### 13. L115 and Interdictor Tungsten Core (resolved part)

Resolved in 2.1.2.0 for the L115 and Interdictor: both now bind `GRM_Recoil_AMO_Bolt_M10` (six steps). The Mini Scout still stacks seven steps; see [entry 13](ATTACHMENT_BUGS.md#13-sniper-tungsten-core-recoil-penalties-are-inconsistent), which keeps the source trace and panels for all the sniper rifles.

### 19. RSPR Single-Port Brake reduces recoil by seven steps

- **Status.** Game error.

- **In-game text.** Single-Port Brake: "Simple brake that reduces recoil but increases weapon
  sway. Soldiers firing will be spotted, marking their position in-world and on the minimap."
  Cost 5. Unlock at RSPR Mastery 7.
- **Frosty data (2.1.1.0; the RSPR is new in this build).** `GS_RSAR999` binds the brake's
  selector `U_WPM_MZL_Brake1_W05` to two recoil modifiers: `GRM_Recoil_MZL_P10` (one step) and
  `GRM_Recoil_MZL_Bolt_P10` (six steps). Both apply, for seven steps in ADS and hipfire.
- **Comparison.** On the Mk 24 the same brake and selector bind only `GRM_Recoil_MZL_P10`
  (one step), as on other automatic weapons. `GRM_Recoil_MZL_Bolt_P10` is otherwise the
  bolt-action sniper binding (L115, M2010 ESR, Mini Scout, PSR). On the RSPR the strongest
  grips, Classic Vertical (35 points) and Low-Profile Stubby (45 points), give five steps;
  every other RSPR muzzle gives one step or less.
- **In-game evidence.** Operator screenshot of the RSPR muzzle screen, 13 October 2026: with
  the Single-Port Brake focused, Recoil Amount reads 0.5 degrees (0.8 without) and Control
  reads 59 (39 without). A second screenshot of the underbarrel screen with Classic Vertical
  focused reads Recoil Amount 0.6 degrees and Control 53. Seven steps at the RSPR's 0.94
  factor give 0.782 to 0.507 degrees and five steps give 0.574, which match both panels;
  one step would give 0.735.
- **Game error.** A 5-point brake outperforms the 35-point grip, and the extra
  binding is one that belongs to bolt-action rifles.
- **Site.** The site applies seven steps, as the game does.
- **Precision panel reads 0 with a vertical or stubby grip (operator, 17 October 2026).**
  The RSPR's Precision table is keyed on the recoil amount sum and has rows from −5 to 5
  (base −3), plus one fallback row of 0, as on every non-bolt weapon (entry 22). The brake's
  seven steps plus a vertical or stubby grip's two to five give sums of 6 to 9, past the last
  row, so the panel takes the fallback row, as the Collateral panel shows x0.00 past its table
  (entry 20). Slim Angled (one step, sum 5) and the hand stop (none) stay inside the table
  and read 30. The operator reports that wrong Precision panel values do not change weapon
  behaviour (entry 22). The site shows 30, the score of the table's last row, and does not
  copy the panel's 0 (`clamped-past-table` in `sim/weapon-attributes.js`); the true score
  past the table is not known. A scan of every weapon's muzzle, grip and barrel combinations
  finds no other build past its Precision table.

### 20. M121 A2 Tungsten Core collateral panel (resolved part)

Resolved in 2.1.2.0 for the M121 A2: its Tungsten Core row went from 10 to 9, inside the table. The ELR-40 Single Shot part is still in the game; see [entry 20](ATTACHMENT_BUGS.md#20-collateral-multiplier-panel-shows-x000-past-the-top-of-the-table). The firing-range tests on both weapons stay there, because they show how damage behaves past the table.

## Description errors

### 9. SGX Extended barrel

- **In-game text.** "Long barrel that increases projectile velocity and enables a fast
  transition to aim down sights (ADS)."
- **Incorrect part.** "enables a fast transition to aim down sights (ADS)".
- **Frosty.** Extended has no ADS operand; Basic and Fluted have +1
  (`frosty-barrel-ads-generated.json`).
- **In-game.** Operator review: stale text from before the Extended barrel ADS buff
  was removed. Behavior matches the data.
