# Attachment bugs and mismatches

This list records attachments whose in-game stats and in-game description conflict.
Each entry is one of these types:

- **Game error**: the description is correct, but the game does not apply a stat that
  the description states, or applies a stat that the description does not state.
- **Description error**: the game stats are correct, but the description states a
  wrong stat.
- **Visual error**: the attachment looks wrong on one weapon compared with other
  weapons. Stats and description are not affected.
- **Suspected game error**: source or panel behavior is inconsistent across weapons,
  but the intended behavior is not confirmed.
- **Source data inconsistency**: the source stores conflicting values for a weapon
  property; in-game timing shows which value the game uses.

Descriptions that leave out an effect that the game applies consistently are not
errors. They are in [Accepted text](#accepted-text).

A future game fix is not assumed. Recheck every entry after a game update. Source
references are to the 1.4.2.5 Frosty XML export unless stated.

## Status overview

Site status uses one of these values, followed by the value that the site applies:

- **Matches game**: in-game panels or captures confirm the site value.
- **Matches source data**: the site value is from Frosty data. Not checked in game.
- **Does not match game**: in-game evidence conflicts with the site value.
- **Not modelled**: the site does not show this property.

The site models what the game does. Game errors where the in-game effect differs from
the description are listed in `GAME_BUGS` in `data/attachments.json`. The attachment
menu marks those choices with †, and the Attachment Effects panel marks the affected
stat and adds a footnote with the intended effect.

| # | Attachment | Weapons | Type | Error | Site status |
|---|---|---|---|---|---|
| 1a | Slim Angled | PSR, SV-98, L115, Mini Scout, Interdictor | Game error | The game applies −1 ADS accuracy while moving. The description does not state this penalty. The Slim Angled action selects the Full Angled package in error. | Matches game: −1 ADS accuracy while moving |
| 1b | Slim Angled | 18.5KS-K | Site interpretation corrected | The modifier is outside the moving-ADS collection. Controlled ADS indicator captures show no moving penalty. The alternate field remains unidentified. | Corrected: no moving-ADS penalty |
| 2 | Hollow Point, Frangible, Tungsten Core | M121 A2, M45A1 | Game error | The game adds the FMJ +1 penetration step to these three ammo types. Collateral damage multiplier is too high: Hollow Point and Frangible keep the Standard value; M45A1 Tungsten Core is one step higher (M121 A2 Tungsten Core is at the maximum, so no change). The descriptions do not state a penetration change. | Matches game: extra collateral step |
| 3 | Slim Angled | SGX, PW5A3, PW7A2, UMG-40, KV9, SCW-10, CZ3A1, PP-19 | Game error | The description states increased weapon draw speed. The game does not apply it. | Matches source data: no weapon draw speed change |
| 4 | 20 Rnd fast | PP-19 | Game error | The description states faster reloads. The game does not apply the reload speed bonus (×1.13). | Matches game: no reload speed change |
| 5 | Subsonic, Sub HP | P18, GGH-22, ES 5.7 | Game error | The description states lower recoil. The game does not apply it. | Matches source data: no recoil change |
| 6 | Flash Comp | PP-19 | Game error | The description states less recoil buildup and better recoil recovery (recoil smoothing). The game does not apply it: `GS_PP19` has no smoothing binding for the Flash Comp package (source trace and operator report). | Matches game: no recoil smoothing (corrected 23 September) |
| 7 | 200 Rnd belt box | L110, M123K | Game error | The description states reduced ADS accuracy while moving. The game does not apply it. | Matches game: no ADS accuracy while moving change |
| 8 | 30 Rnd fast | PW7A2 | Description error | The description states improved weapon draw speed (Regular magazine text). The game applies faster reload speed (×1.13) and no weapon draw speed change. | Matches game: reload speed ×1.13 |
| 9 | Extended barrel | SGX | Description error | The description states a fast transition to ADS. The game applies no ADS time change (old text from before the ADS buff was removed). | Matches game: no ADS time change |
| 10 | 50 Rnd | KTS100 MK8 | Description error | The description states improved handling. Compared with the default 60 Rnd magazine, only reload speed and sway improve; ADS time, weapon draw speed and ADS movement speed do not change. | Matches source data: source values |
| 11 | R-MR 1.00x, ROX 1.50x, Mini Flex 1.00x, A-P2 1.75x, RO-S 1.25x, CQ RDS 1.25x | RPK-74M (confirmed), L115 (source only) | Visual error | The optic looks smaller and further away, and the arm looks stretched. The weapon uses the base optic parts, which keep the default render FOV 55; other long guns use riser parts at 40 (CQ RDS 44). | Not modelled |
| 12 | Standard Suppressor | L115 | Game error (source binding omission) | Description states a hipfire penalty, but the L115 GS has no hip-dispersion binding for the selected suppressor package. Panel stays at 34. | Matches game: no hipfire change (corrected 23 September) |
| 13 | Tungsten Core | L115, with sniper comparisons | Suspected game error | L115 uses one recoil penalty step; M2010 ESR, PSR and SV-98 use six. Six steps as the intended sniper rule is a hypothesis. Interdictor also uses one; Mini Scout stacks one and six. | Source-specific penalties: L115/Interdictor −1, three launch snipers −6, Mini Scout −7 |
| 14 | Burst Mode, Burst Training | GRT-BC, SL9, KORD 6P67, SG 553R, PW5A3, KV9, CZ3A1, UMG-40 | Suspected game error | The menu does not show the burst recoil modifiers on any of the eight weapons. Whether the modifiers apply during firing is an open question; GRT-BC firing tests are inconclusive. | Weapon Attributes match menu behavior; firing simulation retains source modifiers |
| 15 | None (base weapon, default magazine) | SOR-300SC, GRT-CPS | Source data inconsistency | The empty-reload entry stores `ReloadTime` 3.284 s, but `ReloadTimeBulletsLeft` and the reload phase list end at 3.2 s and 3.034 s. Timed captures show the game uses 3.2 s and 3.034 s. Sym's data also lists 3.284. | Matches game: empty reload 3.2 s / 3.034 s (corrected 23 September) |
| 16 | Iron Sights | BROD 3 | Game error | The description states reduced weapon sway. The BROD 3 iron sights do not import the iron-sight sway package (weapon and camera sway ×0.667) that 56 other weapons use. | Matches source data: no iron-sight sway on BROD 3 (marked †) |

Accepted as less detailed but consistent text: Slugs recoil, PP-19 53 Rnd ADS
movement, SL9 60 Rnd weapon draw, RPK-74M 95 Rnd ADS time, and Linear Comp overall
recoil. See
[Accepted text](#accepted-text). Source candidates that are not confirmed bugs are in
[Multi-package scan candidates](#multi-package-scan-candidates).

## Game errors

### 1. Slim Angled applies an unstated moving-ADS penalty

The sniper cases apply an unstated moving-ADS penalty. The earlier 18.5KS-K
classification was a site interpretation error; see 1b.

#### 1a. Sniper rifles: Full Angled package selected

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
  [Capture evidence](../reference-data/provenance/sniper-slim-angled-moving-ads-2026-09-14.json).
- **Site.** −1 moving-ADS spread on Full Angled for all six, and on Slim Angled for
  PSR, SV-98, L115, Mini Scout and Interdictor. L115, Mini Scout and Interdictor
  were added on 14 September; the handling generator preserves these per-weapon
  fields.

#### 1b. 18.5KS-K: Slim Angled moving-ADS interpretation corrected

- **In-game text.** "Marginally reduces recoil, increases weapon draw speed, and
  enables a slightly faster transition to aim down sights (ADS)."
- **Status (21 September).** The earlier claim of an unstated moving-ADS penalty
  is not established. It relied on the modifier filename rather than its binding
  collection. Do not treat this as a confirmed gameplay bug.
- **Source trace.** The Slim Angled action (`Attachment_185KSK_BTM_Magpul_AFG`,
  branch `17aaf490-…`) selects `U_WPM_BTM_Fast02_W25` (`16a53347-…`). `GS_185KSK`
  binds this selector to `GDM_Array_ADSMoveDispersion_BTM_M10` in
  `Field_b30a73ed` (`Struct_a92e7ee4`), not the moving-ADS collection
  `Field_2ffeb6ac` (`Struct_28529b7f`). The other collection's runtime effect
  still needs verification.
- **In-game panel.** Slim Angled reads Mobility 66. The research calculation
  matches 66 when it excludes the presumed moving-ADS penalty; including that
  penalty gives 62. This confirms the panel comparison, not the gameplay effect
  of the other collection.
- **ADS indicator check (21 September).** Twelve firing-range captures compare no
  grip, Slim Angled and Folding Stubby, stationary and moving, with and without
  Violet. Moving indicator spans are 32/32/35 pixels without Violet and 30/29/32
  pixels with Violet, respectively. Stationary spans are 23–24 pixels throughout.
  Slim Angled matches no grip within one pixel. Folding Stubby is a positive
  control: its moving indicator is wider. Three red thresholds give the same bounds.
  States come from operator filenames; these frames do not measure pellet distribution.
- **Site.** Corrected `ks18k` Slim Angled to `movingAdsSpreadTierMod: 0`.
  Source collection, panel and indicator evidence agree. Attachment cost remains 25.
  The runtime meaning of `Field_b30a73ed` remains unresolved.
- **Capture evidence.** [ADS indicator measurements and source hashes](../reference-data/provenance/ks18k-ads-indicator-2026-09-21.json).
- **Evidence.** [Mobility source trace](../reference-data/provenance/composite-mobility-source-trace-2026-09-21.json)
  and [current panel results](../reference-data/provenance/composite-remaining-results-2026-09-21.json).

### 2. M121 A2 and M45A1 special ammo keep the FMJ package

- **In-game text.** Hollow Point: "Ammunition with slightly improved headshot
  damage." Frangible: "Ammunition that delays health regeneration on impact with the
  target." Tungsten Core: "Ammunition that trades recoil for improved penetration,
  resulting in greater damage to soldiers behind the initial target."
- **Bug.** On `MG5` (M121 A2) and `M45A1`, Frangible, Hollow Point and Tungsten each
  select their own ammo package plus `U_WPM_AMO_FMJ_W05` (`_Ammo/Ball/`,
  `WME_Penetration_P05`, +1 penetration step). The control weapons L110 and GGH-22,
  and every other LMG and sidearm, select only the ammo's own package. Hollow Point
  and Frangible therefore keep Standard collateral instead of the lower value.
- **Site and game panels.** `scripts/frosty-collateral.py` includes the extra step.
  The attachment audit screenshots agree:

  | Ammo | M121 A2 panel / site | L110 panel / site | M45A1 panel / site | GGH-22 panel / site |
  |---|---|---|---|---|
  | Standard | 0.75 / 0.750001 | 0.75 / 0.750001 | 0.57 / 0.571429 | 0.57 / 0.571429 |
  | Hollow Point | **0.75** / 0.750001 | 0.67 / 0.666667 | **0.57** / 0.571429 | 0.50 / 0.500001 |
  | Frangible | **0.75** / 0.750001 | 0.67 / 0.666667 | **0.57** / 0.571429 | 0.50 / 0.500001 |
  | Penetration (Tungsten) | 1.00 / 1 | 1.00 / 1 | **0.83** / 0.833334 | 0.75 / 0.750001 |

  M121 A2 Tungsten reaches index 10, which clamps to 9 (1.00). M45A1 Tungsten shows
  0.83 (site 0.833334), against 0.75 on GGH-22. The M45A1 Tungsten value is read
  from the screenshot.
- **Evidence.** Audit screenshots `LMG/M121 A2/47-50_*_Ammo_*.png`,
  `Sidearm/M45A1/19-22_*_Ammo_*.png`, `LMG/L110/47-50_*`, `Sidearm/GGH-22/20-25_*`.
- **Status.** Confirmed by panels. Likely a leftover selector on two weapons; the
  descriptions do not mention penetration.

### 3. Slim Angled on SMGs has no draw effect

- **In-game text.** "Marginally reduces recoil, increases weapon draw speed, and
  enables a slightly faster transition to aim down sights (ADS)."
- **Conflict.** All eight SMGs select `U_WPM_BTM_FastPDW_W20`. Its WB modifier has
  only `WME_ADSTime_FOV_P10` and `WME_ADSTime_Anim_P10`, with no draw effect. The
  rifle Slim Angled package does include draw effects.
- **Not a floor clamp.** SMG base sprint index 7 (133 ms) has faster rows (100 ms,
  83 ms).
- **Status.** Game error: the SMG package does not have the draw effects that the
  description states. Not checked in game.

### 4. PP-19 20 Rnd fast magazine has no reload bonus

- **In-game text.** "Compact magazine with mag pull for faster reloads. Improves
  handling at the cost of capacity."
- **Bug.** The panel shows the base reload with no reload arrow (observed 2.467 s;
  2.183 s expected with the 1.13 multiplier).
- **Status.** Known in-game bug
  ([bug report](https://forums.ea.com/idea/battlefield-6-bug-reports-en/incorrect-stats-for-pp-19s-20-round-fast-magazine/13472218)).
  Recorded as `suspectedGameBug` in `data/attachments.json` and as a screenshot
  exception in `data/reload-exceptions.json`.

### 5. Subsonic and Sub HP on sidearms have no recoil modifier

- **In-game text (Subsonic).** "Low-velocity ammunition that partially hides in-world
  spotting and slightly reduces the range where a soldier is spotted on the minimap
  while firing. Marginally lowers recoil."
- **In-game text (Sub HP).** The same text plus "and slightly improves headshot damage."
- **Conflict.** "Marginally lowers recoil" on P18, GGH-22 and ES 5.7. The +1 recoil
  link exists on 12 non-sidearms only (6 September comparison).
- **Cost.** Sidearm Subsonic 10 and Sub HP 30 equal the carbine costs (SMGs: Subsonic
  10-15, Sub HP 25-35). A missing sidearm recoil modifier is more likely than a
  separate ammo class with different text.
- **Status.** Game error: the sidearm packages do not have the recoil modifier that
  the description states. Not checked in game.

### 6. PP-19 Flash Comp

- **In-game text.** "Limits the intensity of muzzle flashes and fully hides in-world
  spotting while firing. Reduces recoil buildup and improves recoil recovery."
- **Error.** The game does not apply the recoil smoothing (recoil buildup and recoil
  recovery) that the description states. Operator report: the PP-19 Flash Comp does
  not have the Recoil Smoothing attribute.
- **Source trace.** `Attachment_PP19_MZL_VityazFlashComp` (cost 20) selects the shared
  package `U_WPM_MZL_FlashCompensator_W15` (`f7996b55-…`). Its WB modifier
  `WPM_MZL_FlashCompensator_W15` has only `WME_SpotRange_3D_P10` and
  `WME_MuzzleVFX_03_P00`; the smoothing comes from a GS binding to
  `GRM_SmoothRecoil_P10`. 41 ability files select this package and 41 GS files bind
  it, but `GS_PP19` has no binding for `f7996b55`. PP-19 is the only weapon that
  selects the package without the binding. `GS_PP19` does bind smoothing to
  `U_WPM_MZL_Brake3_W20` (Compensated Brake). (`GS_ScorpionEvo3` binds the package,
  but `ScorpionEvo3_Ability` does not select it.)
- **In-game panels.** They cannot show smoothing: on PW5A3, PW7A2 and SCW-10, Flash
  Comp and Flash Hider show the same Control and recoil. PP-19 shows Control 54 with
  None, Flash Hider and Flash Comp.
- **Site.** Since 23 September, a PP-19 `weaponOverrides` entry on `flash_comp` removes
  the smoothing: recovery multipliers 1 and `recoilDurationOverride: null`, which the
  simulator treats as no override. The choice is marked as bugged.
- **Status.** Game error, confirmed by source trace (a byte search of `GS_PP19` with a
  `GS_UMP40` control repeats it) and operator report. The site matches the game.

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
- **Evidence.** [Versioned source paths, hashes and selector bindings](../reference-data/provenance/l115-standard-suppressor-hipfire-2026-09-21.json).

### 13. Sniper Tungsten Core recoil penalties are inconsistent

- **In-game text.** "Ammunition that trades recoil for improved penetration,
  resulting in greater damage to soldiers behind the initial target."
- **Confirmed configuration.** M2010 ESR, PSR and SV-98 bind the Tungsten Core
  selector to `GRM_Recoil_AMO_Bolt_M10`: −6 ADS and hip recoil amount steps,
  with no variation shift. L115 and Interdictor bind `GRM_Recoil_AMO_M10`:
  −1 step. Mini Scout binds both and sums to −7. These are penalties, since
  the recoil multiplier is less than one.
- **Suspected error.** The operator considers the six-step setting on the three
  launch snipers the intended sniper penalty, and the later L115 setting a
  missed configuration. This is a plausible consistency hypothesis, not confirmed
  developer intent. Caliber alone does not establish the intended game value.
  Interdictor's one-step setting and Mini Scout's duplicate binding also warrant
  review; do not replace their observed/source values with a uniform rule.
- **Evidence.** Both saved Frosty builds (1.4.2.5 and 1.4.3.0) contain the traced
  bindings. The three new Tungsten panels read Control 11, 9 and 14, respectively,
  matching the six-step calculation. Mini Scout's saved panel reads recoil 1.5°
  and Control 17, matching seven steps; six steps would give Control 18.
- **Site.** Applies the actual per-weapon values. The three six-step overrides
  were added on 21 September. L115 and Interdictor remain at one step; Mini Scout
  retains its existing seven-step override. For multiplier 0.94, the increases
  are approximately 6.38%, 44.95% and 54.21% for one, six and seven steps.
- **Source.** [Tungsten Core trace](../reference-data/provenance/sniper-tungsten-recoil-2026-09-21.json).

### 14. Burst attachments: menu omits burst recoil modifiers; firing effect unresolved

The entry has two parts. 14a is a confirmed menu observation on all eight
burst-capable weapons. 14b is an open question about firing. The menu observation
is not evidence about GRT-BC firing, because every burst weapon shows it.

#### 14a. Menu does not show burst recoil modifiers (all burst weapons)

- **Source.** The sourced burst selectors give +3 variation steps on all eight
  weapons. The amount is unchanged, except +1 step on GRT-BC
  (`scripts/attachment-effects.test.mjs` checks these tiers). On GRT-BC, the
  trace shows the burst conversion (−1 amount, +3 variation) and a recoil
  package (+2 amount) behind a nested fire-mode selector (mask 8). The other
  seven weapons' selector structure was not traced individually.
- **Observed panels.** Every burst panel keeps the recoil-based Precision and
  Control of the same weapon with no burst attachment:
  - GRT-BC Burst Mode, equipped: 26/37, recoil 0.8°, variation 26.1°.
  - SL9 Burst Mode, equipped: Control 55, recoil 0.5°, variation 13.0° are
    unchanged. Precision changes 61 to 78 only through the burst RPM (675 to 771).
  - KORD 6P67 Burst Training, equipped: 33/55.
  - SG 553R and PW5A3 Burst Training, hover only: 23/37 and 35/53.
  - CZ3A1, KV9 and UMG-40 Burst Training, historical audit panels (July/August
    2026 captures): 21/48, 23/60 and 53/49, identical to their None panels.
- **Contrast.** M16 A3 is a full-auto conversion, not a burst attachment. Its
  preview changes the amount (Precision 27 to 24, Control 41 to 39) but keeps
  variation 29.2°. It is a separate rule.
- **Interpretation.** The most direct explanation is that the menu preview does
  not evaluate the burst fire-mode selector. The GRT-BC trace found no broken
  reference, and the behavior is the same on all eight weapons. Thus it is a menu
  behavior, not a GRT-BC data defect. Whether the menu or the source values show
  the firing behavior is 14b.

#### 14b. Do burst recoil modifiers apply during firing? (open, GRT-BC tests)

- **Status.** Open question, recorded 21 September 2026. The GRT-BC firing tests
  are inconclusive. The earlier best guess that the variation modifier was inactive
  was too strong: the measurements did not isolate variation from the weapon's
  mean recoil direction. No other burst weapon has firing tests.
- **Source expectation.** Burst Mode gives +3 variation steps and +1 amount
  step on GRT-BC. Linear Comp gives +3 variation steps and −1 amount step. If both
  packages apply and stack, the model predicts these ADS values:

  | GRT-BC setup | Recoil amount | Recoil variation |
  | --- | ---: | ---: |
  | No muzzle, no Burst Mode | 0.807° | 26.100° |
  | Linear Comp, no Burst Mode | 0.859° | 20.237° |
  | No muzzle, Burst Mode | 0.759° | 20.237° |
  | Linear Comp, Burst Mode | 0.807° | 15.691° |

- **Menu behavior.** See 14a. Linear Comp changes the displayed GRT-BC
  variation to 20.2°; Burst Mode leaves it at 26.1°.
- **Trace limit.** The burst recoil packages use a nested fire-mode selector;
  Linear Comp uses a direct muzzle selector. The traced burst references and
  selector mask agree. No broken reference was found. This does not establish
  whether the menu or firing runtime evaluates the nested selector correctly.
- **Firing evidence.** Tests at 20 m compare all four setups, including isolated
  three-round groups and five 30-round strings per setup. The operator confirmed
  the same stance, no compensation, and full recovery between strings. The later
  full-auto control used 180 ms mouse-down and 70 ms mouse-up. The results do not
  show a consistent additional variation reduction from Burst Mode. Some short
  group widths are compatible with the predicted benefit, but the sustained
  comparisons do not consistently support it. Overlapping impacts, spread,
  recoil recovery, and unverified actual shot timing limit the inference.
  The predictions included the GRT-BC's 16° mean recoil direction, but measured
  horizontal widths were not corrected for that lean. Pattern width is not a
  direct measurement of recoil variation in degrees. The corrected fixed-direction
  analysis remains inconclusive; see the [full pattern review](working/GRTBC_RECOIL_PATTERN_REVIEW.md).
- **Matched-cadence result.** Native burst (10 ms rapid clicks) is 19–31% wider
  across the recoil direction than the 180/70 ms full-auto macro. Active modifiers
  predict about 13–15% narrower; inactive modifiers predict no change. An
  uncontrolled factor is larger than the effect under test. Probable causes: the
  rapid-click input can hold the weapon in its firing state between bursts (spread
  and recovery have separate firing and not-firing values), and the burst images
  come from an earlier session than the macro images.
- **Site.** The Weapon Attributes calculation reproduces the observed menu
  behavior (14a) by excluding burst recoil changes from the score inputs on all
  eight weapons.
  The firing simulation retains the source modifiers pending stronger evidence.
  Do not treat this open question as a confirmed correction to those
  modifiers or extend it to other weapons from these tests alone.
- **Evidence files.** Source and panel inputs:
  [burst panel trace](../reference-data/provenance/burst-panel-inputs-2026-09-21.json).
  Local measurement artifacts are under `outputs/burst-factorial-analysis/`
  and `outputs/burst-cadence-comparison/`; these ignored outputs are not shipped.

### 16. BROD 3 iron sights omit the sway reduction

- **In-game text.** "Basic sights with reduced weapon sway."
- **Source trace (1.4.3.0).** Iron sights on 56 weapons import
  `WPM_Sway_IronSights_P05`, which imports `WME_WSway_P05` and `WME_CSway_P05`
  (weapon and camera sway ×0.666667). The BROD 3 iron sights use the same text but
  do not import the package.
- **Not a bug on bolt-action rifles.** M2010 ESR, SV-98, PSR, Mini Scout, L115 and
  Interdictor also lack the package. The operator considers this intended for
  their weapon design. In game (operator check, 25 September), all six show "Basic
  sights without any scope glint." with no sway claim. The site's M2010 ESR, SV-98,
  PSR and Mini Scout tooltips link the generic sway text (`0BB6AC0B`) through their
  source `AD_*` descriptors; that is a site text-link error, not a game error.
- **Site.** Since 25 September, iron sights reduce weapon sway ×0.667 on the 56
  source-bound weapons (marked *). BROD 3 follows the source with no reduction, and its
  iron sights are marked † with this note.
- **Capture check (25 September 2026).** Four stationary ADS recordings at the
  same range compare iron sights with the ROX sight (same 1.50x magnification),
  each with the 20 Rnd and 30 Rnd magazines. A fixed white range target left of
  the sight was tracked in each 1920×1080 video, from 1.5 seconds after the start
  to 0.5 seconds before the end. Vertical target displacement relative to the
  screen-centred sight is a proxy for apparent ADS sway; it does not separate
  weapon sway from camera sway. Horizontal motion is omitted: the sway moves left
  and right in turn, so over recordings of different lengths its spread depends on
  where each recording stops.

  | Setup | Frames | Vertical SD (px) | Vertical 5th–95th span (px) |
  | --- | ---: | ---: | ---: |
  | Iron sights, 20 Rnd | 370 | 1.04 | 3 |
  | ROX, 20 Rnd | 372 | 0.88 | 2 |
  | Iron sights, 30 Rnd | 344 | 2.17 | 6 |
  | ROX, 30 Rnd | 451 | 2.17 | 6 |

  Vertical sway with iron sights is no smaller than with ROX for either magazine,
  so no iron-sight reduction is visible. The 20 Rnd magazine (sway ×0.444) reduces
  the motion with both sights. One short recording per setup does not give an exact
  in-game multiplier. The recordings are local (`reference-data/Recordings/09252026/BROD 3 Iron Sight Sway/`)
  and ignored by git; they are not shipped.
- **Status.** Source trace and in-game capture agree. The menu shows no sway value.
- **Evidence.** [L62 reverse coverage](../reference-data/provenance/frosty-2026-09-25-L62-reverse-coverage-handling.json),
  [Frosty sway notes](frosty/ATTACHMENTS.md#reverse-coverage-of-handling-velocity-and-sway-l62-25-september-2026).

## Description errors

### 8. PW7A2 30 Rnd fast magazine

- **In-game text.** "Standard magazine that improves weapon draw speed."
- **Incorrect part.** The whole text belongs to the Regular magazine.
- **Frosty.** `Attachment_MP7A2_MAG_Fast` selects `U_WPM_MAG_Fast_W10`, which has only
  `WME_ReloadSpeedRegular_P10` (reload ×1.13). The draw effect is in the Regular
  package `U_WPM_MAG_Std_W05`.
- **In-game.** Operator confirmed the text error on 14 September.

### 9. SGX Extended barrel

- **In-game text.** "Long barrel that increases projectile velocity and enables a fast
  transition to aim down sights (ADS)."
- **Incorrect part.** "enables a fast transition to aim down sights (ADS)".
- **Frosty.** Extended has no ADS operand; Basic and Fluted have +1
  (`frosty-barrel-ads-generated.json`).
- **In-game.** Operator review: stale text from before the Extended barrel ADS buff
  was removed. Behavior matches the data.

### 10. KTS100 MK8 50 Rnd magazine

Found by the 14 September magazine recheck with every value relative to the
weapon's default magazine. All values are source-generated. Not checked in game.

| Weapon | Magazine | In-game text | Relative to default | Incorrect part |
|---|---|---|---|---|
| KTS100 MK8 | 50 Rnd (default 60 Rnd) | "Wide magazine for improved handling at the cost of capacity." | Reload +1, sway ×0.667; ADS, draw and ADS movement unchanged | "improved handling" (only reload and sway improve) |

## Visual errors

Found on 16 September 2026 in the 1.4.3.0 data. Full values, method and asset
hashes are in the
[optic render FOV report](../reference-data/provenance/frosty-optic-render-fov-2026-09-16.json)
and the [Frosty attachment notes](frosty/ATTACHMENTS.md#optic-render-fov-and-zoom).
Render FOV is visual only. It does not change projectile mechanics or the stats on
this site.

### 11. RPK-74M and L115 optics use the default render FOV

- **In-game.** On the RPK-74M, the R-MR 1.00x, ROX 1.50x and Mini Flex 1.00x look
  smaller and further away than on the RPKM and M433. The left arm looks thin and
  stretched, which is the result of a wider render FOV. The Osa-7 1.00x looks the same
  on all three weapons (operator screenshots, 16 September).
- **Frosty.** `RPK74M_WB` links the base parts of six optics. Other long guns link the
  weapon versions:

  | Optic | RPK-74M and L115 part | Render FOV | Other long guns | Render FOV |
  |---|---|---|---|---|
  | R-MR 1.00x | `WPM_SCP_RMR` | 55 | `WPM_SCP_RMR_Riser` or `_LowRiser` | 40 |
  | ROX 1.50x | `WPM_SCP_RomeoX` | 55 | `_Riser` or `_LowRiser` | 40 |
  | Mini Flex 1.00x | `WPM_SCP_EotechEFLX` | 55 | `_Riser` or `_LowRiser` | 40 |
  | A-P2 1.75x | `WPM_SCP_AcroP2` | 55 | `_Riser` or `_LowRiser` | 40 |
  | RO-S 1.25x | `WPM_SCP_TrijiconSRO` | 55 | `_Riser` or `_LowRiser` | 40 |
  | CQ RDS 1.25x | `WPM_SCP_ShieldCQS` | 55 | `_Riser` or `_LowRiser` | 44 |

  The render FOV is `Field_7768ebf2`; 55 is the default value. The base and riser parts
  use the same model, aim controller and zoom level, so the render FOV is the only
  relevant difference. The RPK-74M UI records already link the riser or mounted
  descriptors (for example `AD_RMR_Mounted`).
- **Other weapons.** L115A3_WB links the same six base parts. This is a source finding
  only; it is not checked in game. The four semi-automatic pistols (P18, ES 5.7,
  GGH-22, M45A1) also use the base parts. The M44, vz. 61 and M357 Trait use the
  low-riser parts (40), so 55 on the four pistols may also be unintended; not checked in
  game. The other 57 optics have the same render FOV on every weapon.
- **Not affected.** RO-M 1.75x (Trijicon MRO): the RPK-74M uses `WPM_SCP_MRO` and
  other weapons use `WPM_SCP_MRO_Tall`, but both have 34. The other RPK-74M optics use
  the same part as the RPKM.
- **Probable fix.** Link the `_Riser` versions of the six optics in `RPK74M_WB` and
  `L115A3_WB`, as `RPKM_WB` does.
- **Site.** Not modelled.

### SL9 iron sights use the default render FOV (no visible effect found)

- **Frosty.** The SL9 (`APDW_WB`) inline iron-sight part keeps render FOV 55. The iron
  sights on all other non-pistol weapons have their own value, from 18 (KTS100 MK8) to
  50 (PW7A2, USG-90). The P18, ES 5.7, GGH-22 and M357 Trait iron sights also keep 55.
  The M45A1 (45), M44 (48) and vz. 61 (50) have their own values.
- **In-game.** Checked on 16 September with SL9, KTS100 MK8 and PW7A2 iron-sight
  screenshots from the same position. The range and targets are identical in all
  three, so the 1.50× zoom is the same. Only the weapon size changes: the KTS100 MK8
  (18) is drawn much larger and closer. The SL9 looks normal, with no small or
  stretched look as on the RPK-74M optics.
- **Status.** Not listed as an active bug, because no visible effect was found. The
  value may still be unset by mistake, as on the RPK-74M optics; a small difference
  from the intended value would be hard to see.
- **Recheck** if a game update changes the SL9 iron sights or its render FOV.

**Related, not confirmed.** M2010 ESR has two inline model parts with their own render
FOV next to the shared optic parts: SDO 3.50x (`U_ATT_TrijiconSDO` 55, shared
`WPM_SCP_TrijiconSDO` 34) and LERT 8.00x (inline 59, shared `WPM_SCP_Mark4M5A2` 20). The
shared parts have the correct aim. It is not known which value the game uses. Compare the
scope size with another sniper rifle in game before you add an entry.

**Iron-sight zoom.** All iron sights zoom 1.50× (`Aim_1x50`), more than 1.00× optics.
The operator confirmed this in game. It is consistent on all weapons, so it is not
listed as an error. The site labels it "Iron Sights" without a magnification, like the other optics.

## Source data inconsistencies

### 15. SOR-300SC and GRT-CPS empty reload: stale 3.284 s `ReloadTime`

This is a weapon property, not an attachment effect. It is listed here because it
is a verified conflict between stored values and in-game behavior.

- **Frosty (1.4.3.1).** In `SCARSC_WB` and `MSBSGROTCPS_WB`,
  `ReloadInfoArray[1]` stores `ReloadTime` (`Field_85ff24a0`) 3.284 on both
  weapons. `ReloadTimeBulletsLeft` (`Field_fc66e75e`) is 3.2 and 3.034, and the
  last entry of the reload phase list (`Field_dc244b57`) matches it. On 56 of 57
  other weapons with a phase list, all three values agree. The identical 3.284 on
  two unrelated weapons looks like a copied value.
- **In-game.** Captured 23 September 2026 at 60 fps: auto-reload after firing the
  magazine dry, hipfire, default loadouts, four reloads per weapon. Timed from the
  last shot to the first shot of the new magazine:

  | Weapon | `ReloadTimeBulletsLeft` + one fire interval | Measured | With `ReloadTime` |
  |---|---:|---:|---:|
  | M4A1 (control) | 2.634 + 0.067 = 2.701 | 2.700 | 2.701 |
  | LMR27 (control) | 3.067 + 0.133 = 3.200 | 3.207 | 3.200 |
  | SOR-300SC | 3.2 + 0.100 = 3.300 | 3.300 | 3.384 |
  | GRT-CPS | 3.034 + 0.167 = 3.201 | 3.200 | 3.451 |

  The game uses `ReloadTimeBulletsLeft`. The extra fire interval appears on all
  four weapons and most likely reflects the auto-reload waiting for the next
  permitted shot.
- **Site.** `emptyRld` corrected from 3.284 to 3.2 (SOR-300SC) and 3.034 (GRT-CPS)
  on 23 September. Both `ReloadSpeed` values are 1. The site's reload values
  follow `ReloadTimeBulletsLeft / ReloadSpeed` for each entry; see
  [reload values](frosty/WEAPONS.md#reload-values-and-empty-reload-capture-23-september-2026).
- **Other sources.** Sym's `bf6.json` (1.4.2.0) also lists 3.284 for both weapons;
  the finding was shared with the Sym team.
- **Evidence.** [Capture report](../reference-data/provenance/frosty-empty-reload-capture-2026-09-23.json);
  local-only recordings in `reference-data/Recordings/09232026/Empty Reload/`
  (ignored, not shipped; the report records their SHA-256 hashes).
- **Recheck** after a game update that changes either weapon's reload data.

## Accepted text

These are not errors. The description leaves out an effect, but the game applies the
effect consistently with the game design.

| Attachment | Weapons | In-game text | Unstated effect | Reason accepted |
|---|---|---|---|---|
| Slugs | M87A1, M1014, 18.5KS-K, DB-12 | "Shotgun ammunition containing a single large projectile for greatly improved effective range." | −1 ADS/hip recoil (applied by the site) | Applied consistently |
| 53 Rnd | PP-19 | "Helical drum magazine with increased capacity. Prevents the use of underbarrel attachments." | Slower ADS movement | Expected for a larger magazine |
| 60 Rnd | SL9 | "Extended magazine with increased capacity at the cost of movement speed while aiming down sights (ADS)." | Slower weapon draw | Expected for a larger magazine |
| 95 Rnd drum | RPK-74M | "95 round drum magazine with greatly increased capacity at the cost of weapon draw speed and reload speed." | Slower ADS time (`WPM_MAG_095Ext3_RPK74M_W50`: `WME_ADSTime_Anim_M10`, `WME_ADSTime_FOV_M10`; applied by the site) | Expected for a larger magazine |
| Linear Comp | 45 weapons | "Reduces horizontal recoil in favor of more stable vertical recoil. …" | −1 recoil amount | Implied: vertical recoil is amount, horizontal is variation |

## Multi-package scan candidates

`python scripts/frosty-multi-package-scan.py --root <Frosty-export-root>` lists
attachment actions that select more than one modifier package. The 1.4.2.5 export
has 15 hits: three sniper Slim Angled actions (entry 1a), six M121 A2/M45A1 ammo
actions (entry 2), and the items below. PSR and SV-98 select only W05, so the scan
does not list them. Each hit is a candidate for a trace and an in-game check.

### BROD 3 Alloy Vertical (Zenitco RK-2) selects two recoil packages

- **Source.** Site Alloy Vertical links two source attachments on BROD 3 and
  DRS-IAR: `ZenitcoRK1` (`U_WPM_BTM_Vertical01_W20` only) and `ZenitcoRK2`
  (`Vertical01_W20` + `Vertical03_W20`). `GS_BREN3` binds both selectors to the
  same `GRM_Recoil_BTM_P20` (entries 7 and 11). `GS_M27IAR` has no binding for
  `Vertical03_W20`.
- **In-game.** 13 September BROD 3 preview: Alloy Vertical Control 40 (tier 2
  predicts 40.45); QD Grip Pod over Alloy Vertical 43 (tier 3 predicts 43.1)
  ([QD Grip Pod review](../reference-data/provenance/qd-grip-pod-screenshot-review-2026-09-13.json)).
- **Status.** Resolved: no stacking. Site +2 is correct.

### Traced without a gameplay effect (14 September)

| Source action | Extra package | Trace | Offered | Status |
|---|---|---|---|---|
| RPK-74M `MAG_Compact1` (30 Rnd) and `MAG_Compact2` (30 Fast) | `U_WPM_MAG_030Cpt1_RPKM_W05`, `U_WPM_MAG_030Cpt2_RPKM_W10` | No WB modifier in `RPK74M_WB` and no GS binding in `GS_RPK74M`. The RPK-74M packages supply all effects, and site values match them. | Yes | Leftover selector with no source effect |
| PP-19 `MAG_Compact1` (25 Rnd) | `U_WPM_MAG_025Cpt1_UMP40_W05` | No WB modifier and no GS binding on PP-19. The PP-19 package is otherwise the same as the UMP-40 25 Rnd package. | No: audit panels 36-40 show only 30, 30 Fast, 35, 20 Fast and 53 Rnd; not on the site | Source-only branch |
| GRT-CPS `ERG_BurstFireEnable` ("Burst Training") | `U_WPM_ERG_BurstFireActive` + `BurstFireReplace_W10` | `BurstFireActive` has no WB modifier; `GS_MSBSGROTCPS` binds it to `GRM_RecoilConversion_ERG_P10` and `GRM_Recoil_ERG_P20`, the recoil modifiers used by GRT-BC Burst Mode. | No: audit panels 57-58 show only None and Aftermarket Buffer; the site offers only the Buffer | Source-only branch |

None of these changes game or site behavior. Recheck them if a later build offers
the PP-19 25 Rnd magazine or GRT-CPS burst fire, or binds the extra packages.

## Review method and rejected findings

**First scan (14 September).** Compared moving-ADS spread penalties and recoil
smoothing with fixed wording. It found entries 1a and 1b.

**Wide review (14 September).** 333 groups of identical description plus resolved
site modifiers, covering every muzzle, barrel, grip, laser, light, magazine, ammo
and ergonomic choice. Seven Codex CLI batches (`gpt-5.6-luna`, medium effort,
read-only) returned 107 findings. Each kept item was checked against site data,
Frosty and operator in-game review.

Rubric limit: the review assumed default magazines have all shifts at 0. Default
Regular magazines usually have draw −1, so magazine findings were rechecked relative
to the default magazine. That recheck found entry 10 and showed that 128
non-default magazines lose the Regular draw bonus; this is a consistent design
pattern, not a text error.

**Collateral check (14 September).** Entry 2 values were compared with the
attachment audit ammo screenshots for M121 A2, M45A1, L110 and GGH-22.

Withdrawn or rejected:

- QBZ-192 40 Rnd and RPK-74M 95 Rnd draw penalties: present relative to the default
  (QBZ-192 133 → 167 ms; RPK-74M 200 → 233 ms, confirmed in game).
- 40 Rnd on 15 other weapons: their text names only ADS movement, which is present.
- M/60 50 Rnd and M240L 75 Rnd "improves weapon draw speed": the default magazines
  (M/60 100 Rnd, M240L 50 Rnd) state the same improvement and have the same draw
  bonus, so draw speed does not change between them. Screenshots show the same
  sprint recovery. Only the M240L 100 Rnd loses the bonus, and its text does not
  claim improved draw speed.
- 35/40 Rnd fast magazines (AK-205, CZ3A1, KORD 6P67): "at the cost of movement and
  weapon draw speed" covers the ADS movement penalty.
- Magazine sway, moving-ADS accuracy and reload benefits under "handling" (see below).
- Lower collateral on non-penetration ammo; shotgun pellet hip spread.
- Bipod (deployed state not modeled); Match Trigger and speedloader tubes (M1014 4
  Rnd fast, M87A1 5 Rnd fast: "rapid reloading on low ammo") are mechanics the site
  does not model.
- Codex readings that treated `movingAdsSpreadTierMod: +1` as worse.
- AK4D 20 Rnd fast and SV-98 Lightened Suppressor text claims: the site links were
  wrong, not the game text.

### "Handling" wording

All 58 current uses are magazines. Across weapons, "improved handling" covers any
combination of faster sprint recovery (51 pairs), faster deploy (51), faster ADS
(47), faster ADS movement (47), less sway (47), better moving-ADS accuracy (44)
and faster reload (29). Magnitudes differ by weapon. RPKM 75 Rnd says "at the
cost of weapon handling" but only has ADS move +1. These counts use absolute
magazine shifts, not values relative to the default magazine.

## Adding an entry

Record the exact in-game text, the conflict, the Frosty binding, in-game evidence,
the value the site applies, and the type and status. Read magazine shifts relative
to the weapon's default magazine. When captures confirm a mismatch on a magazine,
add a `descriptionMismatch` object with a link to the evidence file. When the site
links wrong text, add a reviewed panel row instead of editing
`data/attachment-tooltips.json`.

## 1.4.3.0 recheck, 15 September 2026

**Source side: no entry changed.** Every asset behind entries 1 to 10 is byte-identical
to the 1.4.2.5 capture. Only three `GS_` assets changed in the whole build (`GS_VSSM`,
`GS_RagingHunter`, `GS_TRR8`) and none of them belongs to a listed bug. No Slim Angled,
magazine, ammo, barrel, Flash Comp or belt-box modifier changed. The one changed
`Attachment_` asset is the Interdictor iron sights, whose point cost moved from 5 to 15
as the patch notes state; that is a stated change, not a bug.

**Description side: also unchanged.** Frosty could not read the attachment metadata for
this build, because `SharedTypeDescriptors.ebx` changed while `BF6SDK.dll` did not and
`Class_535682be` no longer resolves. The raw EBX was decoded instead with
`scripts/frosty-ebx-decode.py`, which takes its layout from the build's own descriptors
and does not use the SDK. Result: **234 of the 248 changed `AD_*` assets have a
byte-identical set of string references**. The 14 that changed only removed references and
added none, and every removed string is a fixed magnification chip ("4.50", "3.00", "2.00",
"1.00", "1.00-6.00", "1.25") or a fire-mode or sight label ("Single Fire", "Burst",
"Full Auto", "Bolt Action", "Pump Action", "Iron Sights") — all among the 73 strings
deleted from `fs_us_loc` in this build.

On 16 September, the recorded attachment label and description IDs were also resolved
against both builds' English strings tables: none changed text or disappeared. This
supports retaining entries 8, 9 and 10. The string-reference comparison alone was not
sufficient, and no new live-panel captures were made for the three reviewed tooltips.

Neither conclusion depends on the stale SDK: the source side rests on unchanged asset
hashes, and the description side on an SDK-independent decode. Evidence:
`reference-data/provenance/frosty-1.4.3.0-source-comparison-2026-09-15.json` and
`reference-data/provenance/frosty-1.4.3.0-sdk-independent-decode-2026-09-15.json`.
