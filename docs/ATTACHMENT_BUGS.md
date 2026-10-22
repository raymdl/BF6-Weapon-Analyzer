# Game bugs and mismatches

This list records game bugs and mismatches found while building the site. Most entries are
attachments whose in-game stats and in-game description conflict; weapon stats and stat-panel
errors are listed here too. The file keeps its name, `ATTACHMENT_BUGS.md`, so that existing
links to it stay valid.

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
- **Game display error**: the stat panel shows a value that the game does not apply, or a
  wrong value for a stat with no gameplay effect.

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
| 1 | Slim Angled | PSR, SV-98, L115, Mini Scout, Interdictor, ELR-40 | Game error | The game applies −1 ADS accuracy while moving. The description does not state this penalty. The Slim Angled action selects the Full Angled package in error. | Matches game: −1 ADS accuracy while moving |
| 2 | Hollow Point, Frangible, Tungsten Core | M121 A2, M45A1 | Game error | The game adds the FMJ +1 penetration step to these three ammo types. Collateral damage multiplier is too high: Hollow Point and Frangible keep the Standard value; M45A1 Tungsten Core is one step higher (M121 A2 Tungsten Core is at the maximum, so no change). The descriptions do not state a penetration change. | Matches game: extra collateral step |
| 3 | Slim Angled | SGX, PW5A3, PW7A2, UMG-40, KV9, SCW-10, CZ3A1, PP-19, RSPR | Game error | The description states increased weapon draw speed. The game does not apply it. | Matches game: no weapon draw speed change |
| 4 | 20 Rnd fast | PP-19 | Game error | The description states faster reloads. The game does not apply the reload speed bonus (×1.13). | Matches game: no reload speed change |
| 6 | Flash Comp | PP-19 | Game error | The description states less recoil buildup and better recoil recovery (recoil smoothing). The game does not apply it: `GS_PP19` has no smoothing binding for the Flash Comp package (source trace and operator report). | Matches game: no recoil smoothing (corrected 23 September) |
| 7 | 200 Rnd belt box | L110, M123K | Game error | The description states reduced ADS accuracy while moving. The game does not apply it. | Matches game: no ADS accuracy while moving change |
| 8 | 30 Rnd fast | PW7A2 | Description error | The description states improved weapon draw speed (Regular magazine text). The game applies faster reload speed (×1.13) and no weapon draw speed change. | Matches game: reload speed ×1.13 |
| 9 | Extended barrel | SGX | Description error | The description states a fast transition to ADS. The game applies no ADS time change (old text from before the ADS buff was removed). | Matches game: no ADS time change |
| 10 | 50 Rnd | KTS100 MK8 | Description error | The description states improved handling. Compared with the default 60 Rnd magazine, only reload speed and sway improve; ADS time, weapon draw speed and ADS movement speed do not change. | Matches game: reload 2.876 s, ADS and draw unchanged (sway from source data) |
| 11 | R-MR 1.00x, ROX 1.50x, Mini Flex 1.00x, A-P2 1.75x, RO-S 1.25x, CQ RDS 1.25x | RPK-74M (confirmed), L115 (source only) | Visual error | The optic looks smaller and further away, and the arm looks stretched. The weapon uses the base optic parts, which keep the default render FOV 55; other long guns use riser parts at 40 (CQ RDS 44). | Not modelled |
| 12 | Standard Suppressor | L115 | Game error | Description states a hipfire penalty, but the L115 GS has no hip-dispersion binding for the selected suppressor package. Panel stays at 34. | Matches game: no hipfire change (corrected 23 September) |
| 13 | Tungsten Core | L115, with sniper comparisons | Suspected game error | L115 uses one recoil penalty step; M2010 ESR, PSR and SV-98 use six. Six steps as the intended sniper rule is a hypothesis. Interdictor also uses one; Mini Scout stacks one and six. | Matches game: L115/Interdictor −1, three launch snipers −6, Mini Scout −7 |
| 14 | Burst Mode, Burst Training | GRT-BC, SL9, KORD 6P67, SG 553R, PW5A3, KV9, CZ3A1, UMG-40 | Suspected game error | The menu does not show the burst recoil modifiers on any of the eight weapons: they are bound to the `BurstFireActive` runtime token, not the attachment selector the menu evaluates. Whether the modifiers apply during firing is an open question; GRT-BC firing tests are inconclusive. | Matches game: Weapon Attributes follow the menu; firing simulation keeps source modifiers (firing not confirmed) |
| 15 | None (base weapon, default magazine) | SOR-300SC, GRT-CPS | Source data inconsistency | The empty-reload entry stores `ReloadTime` 3.284 s, but `ReloadTimeBulletsLeft` and the reload phase list end at 3.2 s and 3.034 s. Timed captures show the game uses 3.2 s and 3.034 s. Sym's data also lists 3.284. | Matches game: empty reload 3.2 s / 3.034 s (corrected 23 September) |
| 16 | Iron Sights | BROD 3 | Game error | The description states reduced weapon sway. The BROD 3 iron sights do not import the iron-sight sway package (weapon and camera sway ×0.667) that 56 other weapons use. | Matches game: no iron-sight sway on BROD 3 (marked †; 25 September capture) |
| 17 | None (base weapon) | M433, SGX, L110, P18 | Suspected game error | Since 2.1.1.0 the in-world (3D) spot-on-fire range is 75 m; the other weapons keep 54 m. Not in the patch notes; four unrelated weapons. 75 m was the launch default before Season 2 reduced it to 54 m, so this looks like an unintended reversion. | Matches game: 75 m in-world, 150 m minimap |
| 18 | Hollow Point | Mk 24 | Suspected game error | Costs 5 points, the same as Standard; every other weapon's Hollow Point costs 15 or 20. | Matches game: cost 5, headshot 1.80 with Hollow Point |
| 19 | Single-Port Brake | RSPR | Suspected game error | Reduces recoil by seven steps: the weapon file binds the bolt-action sniper recoil modifier (six steps) on top of the normal one. A 5-point brake gives more Control than the 35-point Classic Vertical grip.  With any vertical or stubby grip added, the recoil amount sum passes the end of the Precision table and the panel shows Precision 0. | Matches game: seven steps, 0.8 to 0.5 degrees. Precision with a vertical or stubby grip does not match game: 30 (last table row), not the panel's 0 |
| 20 | Tungsten Core; Single Shot magazine | M121 A2; ELR-40 | Game display error | The stat panel shows Collateral Multiplier x0.00 when the summed penetration row passes the end of the table (row 10). A firing-range test on the M121 A2 shows full x1.00 damage to the second target. | Matches game: x1.00 (firing-range damage); the panel shows x0.00 |
| 21 | Adjustable Angled, Full Angled, QD Grip Pod | Mk 24, Z84M (QD Grip Pod also EF88, M16A4) | Suspected game error | Adjustable Angled and Full Angled reduce recoil by one step more than on other weapons (2 and 3 steps against 1 and 2). The QD Grip Pod gives 3 steps on these four weapons and 2 on the B36A4 and the rest; it may not be an error. The descriptions and costs are unchanged. | Matches game: the stronger steps |
| 22 | Weapon Precision stat (no attachment) | Interdictor | Game display error | Precision reads 1; other bolt-action rifles read 100. The Interdictor's fallback table row is 0.5 where theirs is 100, and the panel appears to use the fallback row. The keyed row was corrected to 100 in 2.1.1.0 without effect. | Matches game: 1 |
| 23 | MGO 3.50x; QMK 3.00x | Interdictor; M16A4 | Suspected game error | Since 2.1.1.0, equipping the MGO 3.50x on the Interdictor or the QMK 3.00x on the M16A4 removes the whole Optic Accessory slot. The other scope of the same magnification on each weapon (SDO 3.50x, Baker 3.00x) keeps it. The update removed these scopes from the last accessory lists that named them, one patch after 1.4.3.5 had added them on most weapons. | Matches game: with these two scopes the site offers no Optic Accessory; the SDO 3.50x and Baker 3.00x keep it |
| 24 | Single Shot magazine | ELR-40 | Suspected game error | The description says "massive damage between 30m and 60m", but the magazine's bullet one-shots the chest from 30 to 80 m. The 50 m window matches the pre-1.3.3.0 sweet-spot widths; every other sniper window, including the ELR-40's own 150 to 180 m, is about 30 m and matches its text. The bullet curve may have been left out of the 1.3.3.0 reduction. | Matches source data: the 30 to 80 m curve; not tested in game |
| 25 | Bipod, deployed | Mk 24, EF88, VSSM (predicted also Z84M) | Suspected game error | With the bipod deployed, the Mk 24, EF88 and VSSM (Folding Stock) spread indicators grow per shot exactly as undeployed (to 43, 42 and 52 px over 20 auto shots), while the M277, VCR-2 and M121 A2 hold 14 to 18 px deployed against 38 to 51 px standing. Under the bipod selector, every other bipod-capable automatic weapon binds a hip-dispersion array and an ADS per-shot-increase package as well as the recoil package; the Mk 24, EF88, VSSM and Z84M bind the recoil package only. | Not modelled: the site has no deployed state |
| 26 | None (semi-auto fire mode) | EF88, BROD 3, Mk 24 | Suspected game error | In semi-auto these three rifles still bloom per shot. Every other weapon that offers auto and single binds `GBM_NoIncrease_Semi_P00`, which zeroes the per-shot increase in semi; a survey of all 69 weapons in 2.1.1.0 finds it missing on exactly these three. | Matches source data: `hipNoBloomOnSwitch` false for the three, true for the rest |

Entry 5 was removed on 14 October 2026 (see
[rejected findings](#review-method-and-rejected-findings)); numbers are not reused.

Accepted as less detailed but consistent text: Slugs recoil, PP-19 53 Rnd ADS
movement, SL9 60 Rnd weapon draw, RPK-74M 95 Rnd ADS time, and Linear Comp overall
recoil. See
[Accepted text](#accepted-text). Source candidates that are not confirmed bugs are in
[Multi-package scan candidates](#multi-package-scan-candidates).

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
  The attachment audit screenshots (26 July 2026, before 2.1.1.0) agree:

  | Ammo | M121 A2 panel / site | L110 panel / site | M45A1 panel / site | GGH-22 panel / site |
  |---|---|---|---|---|
  | Standard | 0.75 / 0.750001 | 0.75 / 0.750001 | 0.57 / 0.571429 | 0.57 / 0.571429 |
  | Hollow Point | **0.75** / 0.750001 | 0.67 / 0.666667 | **0.57** / 0.571429 | 0.50 / 0.500001 |
  | Frangible | **0.75** / 0.750001 | 0.67 / 0.666667 | **0.57** / 0.571429 | 0.50 / 0.500001 |
  | Penetration (Tungsten) | 1.00 / 1 | 1.00 / 1 | **0.83** / 0.833334 | 0.75 / 0.750001 |

  M121 A2 Tungsten reaches index 10, which clamps to 9 (1.00). M45A1 Tungsten shows
  0.83 (site 0.833334), against 0.75 on GGH-22. The M45A1 Tungsten value is read
  from the screenshot.
- **2.1.1.0 panels (operator screenshots, 14 October 2026).** M121 A2: Polymer Links
  0.75, Hollow Point 0.75 and Frangible 0.75, still the Standard value. Tungsten Core
  now shows x0.00: the panel no longer clamps row 10, while damage stays x1.00
  (entry 20). P18 control: Frangible 0.50, below Standard 0.57.
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
- **Not a floor clamp.** The SMG panels show sprint recovery 100 ms; faster rows exist
  (83 and 67 ms on sidearms).
- **In-game.** The attachment audit screenshots (23 and 24 July 2026) of all eight SMGs
  show ADS 167 to 133 ms and sprint recovery unchanged at 100 ms with Slim Angled. The
  RSPR, new in 2.1.1.0, has the same fault (operator screenshots, 14 October 2026): None
  to Slim Angled gives ADS 167 to 133 ms and Control 39 to 41, with sprint recovery
  unchanged at 100 ms.
- **Status.** Game error: the SMG package does not have the draw effects that the
  description states. Confirmed by panels.

### 4. PP-19 20 Rnd fast magazine has no reload bonus

- **In-game text.** "Compact magazine with mag pull for faster reloads. Improves
  handling at the cost of capacity."
- **Bug.** The panel shows the base reload with no reload arrow (observed 2.467 s;
  2.183 s expected with the 1.13 multiplier).
- **Status.** Known in-game bug
  ([bug report](https://forums.ea.com/idea/battlefield-6-bug-reports-en/incorrect-stats-for-pp-19s-20-round-fast-magazine/13472218)).
  Recorded as `suspectedGameBug` in `data/attachments.json` and as a screenshot
  exception in `data/reload-exceptions.json`.

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
- **Evidence.** [Versioned source paths, hashes and selector bindings](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/l115-standard-suppressor-hipfire-2026-09-21.json).

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
- **Source.** [Tungsten Core trace](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/sniper-tungsten-recoil-2026-09-21.json).

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
- **Binding explanation (17 October 2026).** The source binding decides what the
  menu shows. The three fire-mode conversions differ in the menu for one reason:
  - VSSM Folding Stock shows its whole effect (variation 9.2° to 45.4°, rate 450
    to 800). `GS_VSSM` binds `GRM_FullAutoRecoil_VSSM` directly to the
    attachment's unlock selector.
  - M16 A3 Receiver shows the amount step but no variation change. Its amount
    package `GRM_Recoil_ERG_M10` is bound to the attachment selector. The M16A4's
    burst variation step is not conditional: the base recoil block of
    `GS_M16A3` stores variation exponent 3 and amount exponent −2 outright, and
    the file has no burst condition binding. Variation therefore stays 29.2° in
    full auto, in the menu and in the site.
  - Burst Training and Burst Mode show only the rate change. Their recoil
    packages are bound under the `BurstFireActive` condition token, a runtime
    fire-mode state, not the attachment selector (L13 and L59 in the Frosty
    research `ATTACHMENTS.md`). The menu evaluates attachment selectors and not
    that token, so the +3 variation step and the amount steps never appear.
  Match Trigger follows the same pattern: its effects sit behind an embedded
  context identifier (L17), and the menu shows nothing for it. This explains the
  menu on all eight weapons without a data defect. It does not settle 14b; the
  token name implies the packages apply while burst fire is the active mode.

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
  [burst panel trace](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/burst-panel-inputs-2026-09-21.json).
  Local measurement artifacts are under `outputs/burst-factorial-analysis/`
  and `outputs/burst-cadence-comparison/`; these ignored outputs are not shipped.

### 16. BROD 3 iron sights omit the sway reduction

- **In-game text.** "Basic sights with reduced weapon sway."
- **Source trace (1.4.3.0).** Iron sights on 56 weapons import
  `WPM_Sway_IronSights_P05`, which imports `WME_WSway_P05` and `WME_CSway_P05`
  (weapon and camera sway ×0.666667). The BROD 3 iron sights use the same text but
  do not import the package.
- **Skin variants (1.4.3.0).** BREN3 has one primary iron-sight attachment; canted
  iron sights are a separate optic accessory. The WSE0231 skin includes regular and
  folded iron-sight art with a handguard variant, but no separate primary sight effect
  or handguard-specific sway selector was found. The site's BROD 3 effect is unchanged.
- **Not a bug on bolt-action rifles.** M2010 ESR, SV-98, PSR, Mini Scout, L115 and
  Interdictor also lack the package. The operator considers this intended for
  their weapon design. In game (operator check, 25 September), all six show "Basic
  sights without any scope glint." with no sway claim. The site's M2010 ESR, SV-98,
  PSR and Mini Scout tooltips link the generic sway text (`0BB6AC0B`) through their
  source `AD_*` descriptors; that is a site text-link error, not a game error.
- **Site.** Since 25 September, iron sights reduce weapon sway ×0.667 on the 56
  source-bound weapons. BROD 3 follows the source with no reduction, and its
  iron sights are marked † with this note.
- **Capture check (25 September 2026).** Stationary ADS recordings at the same range
  compare iron sights with the ROX sight (same 1.50x magnification) on BROD 3 and, as a
  control with the iron-sight package, M4A1, each with the 20 Rnd and 30 Rnd magazines.
  `scripts/sway-recording-track.py` tracks (sub-pixel) a fixed white range target left of the sight
  in each 1920×1080 video, from 1.5 seconds after the start to 0.5 seconds before the end.
  Vertical target displacement relative to the screen-centred sight is a proxy for
  apparent ADS sway; it does not separate weapon sway from camera sway. Horizontal
  motion is omitted: the sway moves left and right in turn, so over recordings of
  different lengths its spread depends on where each recording stops.

  | Setup | Frames | Vertical SD (px) | Vertical 5th–95th span (px) |
  | --- | ---: | ---: | ---: |
  | BROD 3 iron sights, 20 Rnd | 404 | 0.91 | 3 |
  | BROD 3 ROX, 20 Rnd | 405 | 0.93 | 3 |
  | BROD 3 iron sights, 30 Rnd | 375 | 2.13 | 6 |
  | BROD 3 ROX, 30 Rnd | 487 | 2.16 | 6 |
  | M4A1 iron sights, 20 Rnd | 315 | 0.58 | 2 |
  | M4A1 ROX, 20 Rnd | 514 | 0.91 | 3 |
  | M4A1 iron sights, 30 Rnd | 560 | 1.43 | 4 |
  | M4A1 ROX, 30 Rnd | 442 | 2.10 | 6 |

  On BROD 3, iron sights sway about as much as ROX with either magazine (ratio 0.99 with
  30 Rnd). On M4A1, iron sights reduce the motion; with the 30 Rnd magazine (no magazine
  sway factor) the ratio is 0.68, matching the source ×0.667. The 20 Rnd magazine gives
  0.43 on both weapons (source ×0.444), and M4A1 iron + 20 Rnd against ROX + 30 Rnd gives
  0.28, matching the multiplied factors (0.296). One short recording per setup does not give an
  exact in-game multiplier. The recordings are local
  (`reference-data/Recordings/09252026/Iron Sight Sway/`) and ignored by git; they are
  not shipped. [Capture receipt](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/sight-sway-ads-move-captures-2026-09-25.json).
- **Status.** Source trace and in-game capture agree. The menu shows no sway value.
- **Evidence.** [L62 reverse coverage](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frosty-2026-09-25-L62-reverse-coverage-handling.json),
  [Frosty sway notes](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/ATTACHMENTS.md#reverse-coverage-of-handling-velocity-and-sway-l62-25-september-2026).

### 17. M433, SGX, L110 and P18 have a longer in-world spot-on-fire range

- **What changed (2.1.1.0, 13 October 2026).** The in-world (3D) spot-on-fire base in the
  weapon file went from 54 to 75 on four weapons: `HK433_WB` (M433), `MPX_WB` (SGX),
  `Minimi_WB` (L110) and `M18_WB` (P18). Field: `Class_542ac52c`
  `Field_5ebda408/Field_9918e670`. The minimap (2D) base beside it,
  `Field_5ebda408/Field_31022dc5`, stays 150.
- **Other weapons.** The same field is 54 on 57 other weapons of 2.1.1.0 (value census of the
  held `_WB` files). The four weapons are of four different classes (assault rifle, SMG,
  LMG, sidearm), and the patch notes do not mention the change.
- **In-game evidence.** The operator confirmed 75 m on the in-game weapon panels of all
  four weapons on 13 October 2026. The P18 panel in an operator screenshot of
  14 October 2026 also shows 75 m.
- **Why it may be an error.** No class or calibre rule separates these four from the rest.
  Operator note (13 October 2026): 75 m was the default in-world range in the launch
  version of the game and was reduced to 54 m in Season 2, so these four weapons look
  like an unintended reversion to the launch value. The launch and Season 2 values are
  from the operator, not re-read from files here. The same update also changed
  `ProjSimEx_SniperDecoyGameplay` `Field_87611ff9` from 150 to 75.
- **Site.** The site uses 75 m as the in-world base for these four weapons and 54 m for
  the others; attachment and ammunition factors multiply it as before.

### 18. Mk 24 Hollow Point costs 5 points

- **In-game text.** Hollow Point: "Ammunition with slightly improved headshot damage."
  Unlock at Mk 24 Mastery 34.
- **What is unusual (2.1.1.0, 13 October 2026).** The Mk 24 is new in this build. Its Hollow
  Point costs 5 points, the same as its Standard ammunition. On the 52 other weapons that
  offer Hollow Point the cost is 15 (34 weapons) or 20 (18 weapons).
- **Frosty data.** `Attachment_MRGGA_AMO_HollowPoint` point cost `Field_6ee865a5` is 5. The
  Mk 24's other ammunition costs follow the usual pattern: Standard 5, Penetration 5,
  Lightweight 10, Frangible 20.
- **Headshot multiplier (not counted as a bug).** `MRGGA_WB` uses protection index 12, which
  no other weapon uses. It gives a base headshot multiplier of 1.57, and 1.80 with Hollow
  Point. The other rifle-calibre weapons use index 11: 1.40 base and 1.57 with Hollow Point.
  In the files Standard, Penetration, Lightweight and Frangible all read 1.57 on the Mk 24;
  only Hollow Point reads 1.80. The operator's reading (13 October 2026) is that the higher
  base value is a property of the weapon's 6.5x48mm ammunition, not an error. The files do
  not state a reason.
- **In-game evidence.** Two operator screenshots of the Mk 24 ammunition screen, 13 October
  2026. The Hollow Point tile shows cost 5. With Standard (FMJ, the default) focused the
  panel shows headshot x1.57 and collateral x0.75; with Hollow Point focused it shows
  headshot x1.80 and collateral x0.67.
- **Why it may be an error.** No other weapon prices Hollow Point at the Standard cost.
  This is a hypothesis.
- **Site.** The site uses cost 5 and the multipliers 1.57 and 1.80, as the game shows.

### 19. RSPR Single-Port Brake reduces recoil by seven steps

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
- **Why it is likely an error.** A 5-point brake outperforms the 35-point grip, and the extra
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

### 20. Collateral multiplier panel shows x0.00 past the top of the table

- **In-game panel.** M121 A2 with Tungsten Core, and ELR-40 with the Single Shot magazine and
  Standard ammunition, both show Collateral Multiplier x0.00 (operator screenshots, 13 October
  2026).
- **Frosty data (2.1.1.0).** The collateral table has ten rows, 0 to 9 (x0.00 to x1.00). The
  M121 A2 is base row 6, plus Tungsten Core 3, plus the extra Standard step 1 (entry 2): row 10.
  The ELR-40 is base row 6, plus Standard 1, plus the Single Shot magazine 3: row 10. These are
  the only two combinations in the files that pass row 9 (Single Shot with Penetration reaches
  row 12).
- **Firing-range test (operator, 13 October 2026).** M121 A2, one target at 10 m and one behind
  it at 50 m, headshot on the near target (49 damage both times). Damage to the far target:
  16 with Standard, 26 with Tungsten Core. Body damage at 50 m is 26.05, so 26 is the full
  x1.00. The 16 fits Standard's x0.75 on a limb or abdomen hit (26.05 x 0.84 x 0.75 = 16.4);
  the zone hit on the far target was not recorded.
- **Conclusion.** Damage holds at the last row (x1.00) when the row number passes the end of
  the table; only the panel shows zero. The ELR-40 case rests on the same row number and was
  not fired.
- **Site.** x1.00 for both, as the damage test shows; the site does not copy the panel's x0.00.

### 21. Mk 24 and Z84M: three grips reduce recoil by one extra step

- **Attachments.** Adjustable Angled (15 points), Full Angled (25 points) and QD Grip Pod
  (30 points) on the Mk 24 and the Z84M. Both weapons are new in 2.1.1.0. The QD Grip Pod
  part also applies to the EF88 and M16A4, and may not be an error.
- **Frosty data (2.1.1.0).** `GS_MRGGA` and `GS_PKM` bind Adjustable Angled to
  `GRM_Recoil_BTM_P20` (two steps; other weapons bind `GRM_Recoil_BTM_P10`, one step), and
  Full Angled and QD Grip Pod to `GRM_Recoil_BTM_P30` (three steps; other weapons bind
  `GRM_Recoil_BTM_P20`, two steps).
- **Comparison.** No other weapon has the stronger binding for the two angled grips. The QD
  Grip Pod has the same three-step binding on the EF88 and M16A4; on the B36A4 and the other
  weapons it gives two steps, the same as PTT Grip Pod.
- **In-game evidence (operator screenshots, 14 October 2026).** Control by grip:

  | Weapon | None | Slim Angled | Adjustable Angled | PTT Grip Pod | Full Angled | QD Grip Pod |
  |---|---:|---:|---:|---:|---:|---:|
  | Mk 24 | 38 | 40 | 43 | 43 | 46 | 46 |
  | Z84M | 35 | 37 | 39 | 39 | 42 | 42 |
  | B36A4 | – | – | – | 47 | – | 47 |
  | EF88 | – | – | – | 47 | – | 50 |
  | M16A4 | – | – | – | 47 | – | 49 |

  Adjustable Angled matches the two-step PTT Grip Pod, and Full Angled the QD Grip Pod.
- **Why it is likely an error.** The angled grips' descriptions and costs are the same as on
  other weapons, and only the two Season 5 weapons differ. The stronger QD Grip Pod on four
  weapons may be intended.
- **Site.** The site applies the stronger steps on these two weapons, as the game does.

### 22. Interdictor Precision shows 1

- **In-game panel.** The Interdictor's Precision reads 1 (operator, 14 September and
  13 October 2026). The other bolt-action rifles read 100.
- **Frosty data (2.1.1.0).** Each weapon has a Precision table with keyed rows, chosen by
  matching the loadout's values, and one fallback row. M2010 ESR, PSR, SV-98, Mini Scout and
  ELR-40 each have one keyed row of 100 and a fallback row of 100. The L115 has no keyed row
  and a fallback row of 100. The Interdictor has one keyed row and a fallback row of 0.5.
  Every non-bolt weapon's fallback row is 0.
- **Change in this build.** The Interdictor's keyed row read 1 up to 1.4.3.5 and reads 100 in
  2.1.1.0. The panel still shows 1.
- **Likely cause (inference).** Because correcting the keyed row changed nothing, the panel
  is not using it. If bolt-action rifles do not match their keyed row and take the fallback
  row, the others show 100 and the Interdictor shows its 0.5 as 1. The L115, which has only a
  fallback row, fits this. How 0.5 becomes 1 and how the game selects rows are not
  established.
- **Effect.** The operator reports that wrong Precision panel values of this kind do not
  change weapon behaviour.
- **Site.** Shows 1, as the game does.

### 23. Interdictor MGO 3.50x and M16A4 QMK 3.00x remove the Optic Accessory slot

- **In-game (operator, 13 October 2026, client 2.1.1.0).** With the MGO 3.50x equipped on the
  Interdictor, the Optic Accessory slot is not shown at all; with the SDO 3.50x it offers
  Canted Iron Sights, the canted reflex, the offset red dot and Anti-Glare, the four
  accessories the files list for it. On the
  M16A4 the QMK 3.00x removes the slot in the same way; with the Baker 3.00x the slot offers
  Canted Iron Sights (Basic Sight, 5 points), the canted reflex and the offset red dot (both
  Sight 1.00x, 10 points), the three accessories the files list for it. On
  the AK4D the 3.50x scope and Canted Iron Sights can be combined. Screenshots:
  `reference-data/attachment-audit/Weapon Attachments/Optic Accessory Slot 2026-10-13/`.
- **Frosty data.** Each weapon's `Equipment_<weapon>` file lists, per optic accessory, the
  sights it may be combined with (`Field_f4142987`). A scope that no accessory lists gets no
  Optic Accessory slot.
  - 1.4.3.5 added the MGO 3.50x (`SCP_M145MGO`) to the Canted Iron Sights list on 48 weapons
    and the QMK 3.00x (`SCP_QMK171A`) on 39, with similar numbers for the canted reflex.
    Nothing was removed.
  - 2.1.1.0 changed only two existing weapons, and both lost a scope. Interdictor: the MGO
    3.50x was removed from Canted Iron Sights (the SSDS 6.00x, `SCP_SBPMII`, was added) and
    from the canted reflex, where the R-VPS 10.00x (`SCP_NFATACR`) was removed too. The MGO
    was never on the offset red dot or anti-glare lists, so no accessory lists it now. M16A4:
    the QMK 3.00x was removed from Canted Iron Sights, the canted reflex and the offset red
    dot, its only three lists.
- **Accessory lists (2.1.1.0).** The scopes share the tile labels Scope 3.50x (MGO, SDO) and
  Scope 3.00x (QMK, Baker) and one description, "Moderately magnified optic with a clear sight
  picture."

  Interdictor:

  | Accessory (in-game tile, cost) | Sights listed, 1.4.3.5 → 2.1.1.0 | Change in 2.1.1.0 | 3x-class scopes listed now |
  |---|---|---|---|
  | Canted Iron Sights (Basic Sight, 5) | 29 → 29 | MGO 3.50x removed, SSDS 6.00x added | SDO 3.50x, QMK 3.00x, Baker 3.00x |
  | Canted reflex (Sight 1.00x, 10) | 22 → 20 | MGO 3.50x and R-VPS 10.00x removed | SDO 3.50x, QMK 3.00x, Baker 3.00x |
  | Offset red dot (Sight 1.00x, 10) | 6 → 6 | none | SDO 3.50x, QMK 3.00x, Baker 3.00x |
  | Anti-glare coating (Anti-Glare, 10) | 34 → 34 | none | SDO 3.50x, Baker 3.00x |
  | Magnifier | 8 → 8 | none | none (1.00x to 2.00x sights only) |
  | Variable zoom 2x, 3x, 4x | 5 → 5 each | none | none (6.00x to 10.00x scopes only) |

  M16A4 (no anti-glare or variable-zoom entries):

  | Accessory (in-game tile, cost) | Sights listed, 1.4.3.5 → 2.1.1.0 | Change in 2.1.1.0 | 3x-class scopes listed now |
  |---|---|---|---|
  | Canted Iron Sights (Basic Sight, 5) | 19 → 18 | QMK 3.00x removed | MGO 3.50x, SDO 3.50x, Baker 3.00x |
  | Canted reflex (Sight 1.00x, 10) | 19 → 18 | QMK 3.00x removed | MGO 3.50x, SDO 3.50x, Baker 3.00x |
  | Offset red dot (Sight 1.00x, 10) | 6 → 5 | QMK 3.00x removed | SDO 3.50x, Baker 3.00x |
  | Magnifier | 8 → 8 | none | none |

  Accessory descriptions: Canted Iron Sights, "Back-up iron sights mounted at a 45-degree
  angle."; canted reflex, "Secondary optic mounted at a 45-degree angle."; offset red dot,
  "Secondary sight mounted on a magnified scope for a clear, close-range aiming alternative.";
  anti-glare coating, "Reduces visible cone of scope glint with an anti-reflective coating.";
  magnifier, "Additional high-magnification zoom level with low-magnification sights." None
  states which scopes it can be combined with.
- **Why it looks like an error.** The change is not in the patch notes, undoes on two weapons
  what the previous patch added on most, and leaves a 10-point scope that silently removes a
  whole slot. The scopes' descriptions are the same as those of the scopes that keep the slot.
- **Site.** The site lists each optic by name, and the Optic Accessory prerequisites name
  the individual optics the files list
  ([individual optics](../reference-data/provenance/frosty-individual-optics-2026-10-21.json)).
  The MGO 3.50x on the Interdictor and the QMK 3.00x on the M16A4 therefore remove the slot,
  as in game.

### 24. ELR-40 Single Shot sweet spot is wider than its description

- **In-game text.** The Single Shot magazine: "Blocked magwell for individually loading
  custom 9.52×70mm rounds, dealing massive damage between 30m and 60m but at the detriment
  of long-range ballistics." The ELR-40 itself: "Most effective between between 150m-180m."
- **Frosty data (2.1.1.0).** The magazine fires its own bullet, `PD_.375EnABELR_API`, whose
  damage curve is (0 m, 90), (24 m, 90), (42 m, 120), (68 m, 120), (80 m, 100), (140 m, 80),
  with straight ramps between points. The curve is stored twice in the raw file and both
  copies agree. The base bullet holds 100 from 150 to 180 m.
- **Conflict.** A sweet spot is the span where one upper-chest hit kills, so where chest
  damage is at or above 100. For the Single Shot bullet that span is 30 to 80 m (50 m wide);
  the description gives 30 to 60 m (30 m wide). The near end matches exactly, the far end
  does not. The base ELR-40's 150 to 180 m matches its text, as do the launch rifles'
  windows after the 1.3.3.0 reduction (L115 120-175 to 100-133, M2010 ESR 75-120 to 75-100,
  PSR 100-150 to 90-120, SV-98 54-90 to 54-75: every window cut by about 40 percent, the
  PSR's from 50 m to 30 m).
- **Interpretation.** The 50 m window is the pre-1.3.3.0 width and the 30 m text is the
  post-1.3.3.0 width. The simplest reading is that the ELR-40 and the Single Shot were
  designed before that update, the descriptions and the base bullet curve were reduced with
  the other rifles, and the Single Shot bullet curve was not. The ELR-40 first appears in
  2.1.1.0, after the update, so no earlier curve exists to confirm this; the curve and the
  text were captured from the same build. The other reading, stale text over a deliberate
  curve, cannot be excluded.
- **Site.** The site applies the 30 to 80 m curve through the magazine's `projectileOverride`
  (`WEAPON_MAG.elr40.mags["1_rnd"]`). `scripts/sweet-spot.mjs` derives the one-shot span and
  gives 30 to 80 m for this bullet; the span is not displayed. Not tested in game.
- **What would settle it.** A later update that moves the curve's 68 and 80 m breakpoints
  toward 60 m confirms the forgotten curve; a description change to 30-80 m means the text
  was stale. A firing-range test at 70 m (one chest hit should kill) checks the current curve.

### 25. Mk 24, EF88 and VSSM deployed bipods do not stop per-shot spread growth

- **In-game (operator recordings, 17 October 2026, client 2.1.1.0).**
  `reference-data/Recordings/10172026/Spread Indicators/<weapon>_Bipod_Mounted_vs_Unmounted.mp4`
  for the Mk 24, M277, EF88, VCR-2, M121 A2 and VSSM (with the Folding Stock, so full
  auto): a magazine of full-auto shots with the bipod deployed on the firing-range ledge, a
  reload, then the same standing. The ADS spread indicator (the two ticks beside the red
  dot) was measured frame by frame at 120 fps
  ([Mk 24 and M277](../reference-data/provenance/spread-indicator-measurement-2026-10-17.md),
  [EF88, VCR-2 and M121 A2](../reference-data/provenance/spread-indicator-measurement-2026-10-17-ef88-vcr2-m121a2.md),
  [VSSM](../reference-data/provenance/spread-indicator-measurement-2026-10-17-vssm.md),
  [annotated example](../reference-data/provenance/spread-indicator-measurement-2026-10-17-example.png)):

  | Segment | Idle | Peak by shot 5 | Peak by shot 10 | Peak by shot 20 |
  |---|---:|---:|---:|---:|
  | M277 deployed | 13 px | 12 px | 16 px | 16 px |
  | M277 standing | 13 px | 34 px | 45 px | 48 px |
  | VCR-2 deployed | 14 px | 11 px | 17 px | 17 px |
  | VCR-2 standing | 13 px | 24 px | 36 px | 51 px |
  | M121 A2 deployed | 12 px | 12 px | 14 px | 14 px |
  | M121 A2 standing | 14 px | 28 px | 37 px | 38 px |
  | Mk 24 deployed | 12 px | 34 px | 40 px | 43 px |
  | Mk 24 standing | 15 px | 31 px | 41 px | 44 px |
  | EF88 deployed | 12 px | 26 px | 33 px | 42 px |
  | EF88 standing | 14 px | 23 px | 37 px | 41 px |
  | VSSM deployed | 14 px | 38 px | 52 px | 52 px |
  | VSSM standing | 14 px | 37 px | 47 px | 54 px |

  Deployed, the M277, VCR-2 and M121 A2 hold a near-constant indicator; the Mk 24, EF88
  and VSSM grow like their standing runs. Deployed and standing segments were identified
  from the camera height and the weapon resting on the ledge, not from data; the M121 A2
  split is the least certain visually but its two segments differ clearly in the numbers.
- **Frosty data (2.1.1.0 raw).** The deployed bipod is selector
  `a5578cf4-546c-44ef-9a79-b84021406c17`, the GUID of the shared part
  `U_WPM_BTM_Bipod01_W10` that every bipod-capable blueprint lists. Each gun-sway file
  binds modifiers under that selector
  ([five-weapon chain diff](../reference-data/provenance/bipod-chain-diff-2026-10-17.md),
  [all 69 weapons](../reference-data/provenance/bipod-selector-bindings-2026-10-17.md)):

  | Weapon | Bound under the bipod selector |
  |---|---|
  | M277 | `GRM_BipodDeployed_BTM_P50`, `GDM_Array_HipDispersion_BTM_P20`, `GBM_Increase_ADS_35_BTM_Bipod` |
  | VCR-2 | the same, with `GBM_Increase_ADS_40_BTM_Bipod` |
  | M121 A2 | the same, with `GBM_Increase_ADS_30_BTM_Bipod` |
  | Mk 24 | `GRM_BipodDeployed_BTM_P50` only |
  | EF88 | `GRM_BipodDeployed_BTM_P50` only |

  Across all 39 weapons that offer the bipod in the menu, 23 automatic weapons bind all
  three (the `GBM_Increase_ADS_xx_BTM_Bipod` variant runs from 30 to 50 by weapon), the
  seven bolt-actions and five DMRs bind the recoil package and the hip-dispersion array,
  and four bind the recoil package alone: `MRGGA` (Mk 24), `EF88`, `PKM` (Z84M) and
  `VSSM`. The bipod attachment and progression files, the blueprint part lists, the
  mounted parts and the condition objects do not separate the failing weapons from the
  working ones; the first candidate, the `WPM_BipodActive` part missing from the Mk 24
  blueprint, is also missing from the VCR-2 and M121 A2 blueprints, which work.
- **Interpretation.** `GBM_Increase_ADS_xx_BTM_Bipod` is the deployed-state replacement
  for the ADS per-shot increase (a reduced value, which fits the M277's slight residual
  growth from 12 to 16 px), and the hip-dispersion array is its hip counterpart. The
  Mk 24, EF88 and VSSM bind neither, so deploying changes only recoil; all three are
  confirmed by recording, and the VSSM's Folding Stock ADS increase (0.409°) grows
  deployed exactly as standing. The pattern is a missing binding, not a tuning choice:
  the two Season 5 weapons that offer a bipod (Mk 24, Z84M) are both affected, and the
  Z84M is the only belt LMG without the three bindings.
- **Site.** The site models no deployed state (bipod is `noEffect`), so nothing changes.
- **What would settle the remaining case.** The same deployed-versus-standing recording
  on the Z84M (predicted: no reduction; not yet unlocked), or a patch that adds the two
  bindings to the four gun-sway files.

### 26. EF88, BROD 3 and Mk 24 keep per-shot spread growth in semi-auto

- **In-game (operator observation, 17 October 2026, client 2.1.1.0).** In manually
  selected semi-auto the spread indicator still widens on each shot on the EF88, BROD 3
  and Mk 24, where the M277 and M433 show no growth. Recordings:
  `reference-data/Recordings/10172026/Spread Indicators/*_Rapid_Single_Fire.mp4` (semi
  rapid clicks at about 360 RPM). The frame measurement is coarse for these clips: the
  Mk 24 and EF88 indicators pulse 2 to 4 px per shot over an idle of 10 to 13 px, and the
  M277 and M433 clips yielded too few paired readings to quantify. At the 360 RPM semi cap
  the ADS firing recovery (2.7°/s offset) removes a 0.41° per-shot increase between shots,
  so no accumulation is expected even where the increase is active; the visible effect is
  a pulse per shot, not a climb.
- **Frosty data.** `GBM_NoIncrease_Semi_P00` multiplies `IncreasePerShot` by 0 in all
  states under the `CMU_SemiAuto` selector (Frosty research `WEAPONS.md`, "No per-shot
  increase: semi-auto and deployed"). In the 2.1.1.0 raw capture
  ([survey](../reference-data/provenance/spread-binding-survey-2026-10-17.md)) it is
  bound in 42 of the 69 gun-sway files. Of the 38 weapons that offer auto (or burst) and
  single, 35 bind it; the three that do not are `GS_EF88`, `GS_BREN3` (BROD 3) and
  `GS_MRGGA` (Mk 24). The other seven bindings are the VSSM and the six auto-only belt
  LMGs. The 1.4.2.5 export shows the same gap for the
  EF88 and BROD 3. The selector itself (`CMU_SemiAuto`) is referenced by key, not as an
  import, in every file, so the difference is only the missing effect binding. The M433 in
  manually selected semi was captured on 25 September with no widening across 10 hip
  shots, consistent with the binding being active after a mode switch.
- **Interpretation.** Three rifles out of 38 with a selectable semi mode lack the one
  binding that removes semi-auto bloom. The pattern is a missing binding rather than a
  tuning choice, but the files do not say which.
- **Site.** `data/weapons.json` stores `hipNoBloomOnSwitch` false for these three and true
  for the rest, so the site already matches the source. The ADS branch applies the same
  increase in every mode on the site; the single-mode semi state is not modelled.
- **What would settle it.** A patch that adds the binding to the three gun-sway files, or
  a hip-fire semi recording on the EF88 against the M433 at the semi cap (predicted:
  EF88 hip indicator climbs 0.65° per shot less recovery; M433 flat).

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
weapon's default magazine. The attachment audit screenshots (July 2026) confirm it in
game: against the default 60 Rnd Drum Mag, the 50 Rnd shows ADS 367 ms, sprint recovery
200 ms and ADS movement x0.54 unchanged, and reload 3.25 to 2.876 s. Sway is not shown on
the panel and comes from source data.

| Weapon | Magazine | In-game text | Relative to default | Incorrect part |
|---|---|---|---|---|
| KTS100 MK8 | 50 Rnd (default 60 Rnd) | "Wide magazine for improved handling at the cost of capacity." | Reload +1, sway ×0.667; ADS, draw and ADS movement unchanged | "improved handling" (only reload and sway improve) |

## Visual errors

Found on 16 September 2026 in the 1.4.3.0 data. Full values, method and asset
hashes are in the
[optic render FOV report](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frosty-optic-render-fov-2026-09-16.json)
and the [Frosty attachment notes](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/ATTACHMENTS.md#optic-render-fov-and-zoom).
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
listed as an error. The site labels it "Iron Sights" and gives it a 1.50× magnification, which
sets the Soldier Target zoom.

## Source data inconsistencies

### 15. SOR-300SC and GRT-CPS empty reload: stale 3.284 s `ReloadTime`

This is a weapon property, not an attachment effect. It is listed here because it
is a verified conflict between stored values and in-game behavior.

- **Frosty (1.4.3.1).** In `SCARSC_WB` and `MSBSGROTCPS_WB`,
  `ReloadInfoArray[1]` stores `ReloadTime` (`Field_85ff24a0`) 3.284 on both
  weapons. `ReloadTimeBulletsLeft` (`Field_fc66e75e`) is 3.2 and 3.034, and the
  last entry of the reload phase list (`Field_dc244b57`) matches it. On 54 of the 55
  other weapons with a phase list, all three values agree (58 of 59 on 2.1.1.0 with the
  Season 5 weapons; recounted from raw on 13 October 2026). The one exception is the CZ3A1,
  where the two times agree at 2.95 and only the last phase entry differs (2.5). The
  identical 3.284 on two unrelated weapons looks like a copied value.
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
  [reload values](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/WEAPONS.md#reload-values-and-empty-reload-capture-23-september-2026).
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
| Linear Comp | 48 weapons (2.1.1.0) | "Reduces horizontal recoil in favor of more stable vertical recoil. …" | −1 recoil amount | Implied: vertical recoil is amount, horizontal is variation |

## Multi-package scan candidates

`python scripts/frosty-multi-package-scan.py --root <Frosty-export-root>` lists
attachment actions that select more than one modifier package. The 1.4.2.5 export
has 15 hits: three sniper Slim Angled actions (entry 1), six M121 A2/M45A1 ammo
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

### Wiring survey candidates that are not errors (17 October 2026)

The [wiring survey](../reference-data/provenance/attachment-wiring-survey-2026-10-17.md)
(section 3) lists attachments whose bindings differ from the same-named attachment on 10 or
more other weapons. Triage against the site data and the stat-screen audit:

| Candidate (survey section) | Finding | Status |
|---|---|---|
| AK4D Light Barrel; SOR-556 Mk2 M4QD Flash Hider; M2010 ESR `MZL_Muzzle`; M/60 Improved Mag Catch (3a) | The progression has no ability branch. The audit panels list no such choice: the AK4D has six barrels without a Light barrel, and the SOR-556 Mk2 and M2010 ESR Flash Hider panels show their own effects. The M/60 has no Ergonomics choices in the audit. | Unused source attachments; not offered, not on the site |
| DB-12 `BTM_CMR201`, `HolosunRMLt`, `LMDPEIR1`, `Perst1`, `SFX300`, `SFX400`, `X5LG3` (3a); DB-12 QBZ Grip Pod, GPS2 and QD Grip Pod without hip dispersion or bipod package (3c) | Bottom-rail lights, lasers and grip pods that the DB-12 does not offer. Its lasers and lights come from the RGT/TOP attachments, which bind effects (panels: Taclight and Flashlight hip-fire 39 to 42; lasers). The DB-12 has no grip pod in the audit. | Not offered |
| DB-12 50 MW Violet (ANPEQ16B) binds `WPM_RGT_LightLaser` instead of the TOP violet package (3c, 3d) | The package differs but the panel shows the benefit: Mobility rises 60 to 66 (moving-ADS accuracy is in the Mobility score; 45 other weapons rise 4). The site applies +1 moving-ADS accuracy. | Panel shows the effect; no change |
| M433 and M44 Match Trigger (3b, 3c); DEVGRU Match Trigger extra (3c) | In 2.1.1.0 the selector `U_WPM_ERG_MatchTrigger_W15` is bound by nothing on the M433 and M44, while 26 weapons bind a WB-local effect and the DEVGRU binds the two GS effects directly. The Frosty research traced the HK433 through a WB-local target to an embedded identifier (L17, L24, 24 September, 1.4.x builds), so whether the 2.1.1.0 gap is real or the survey misses that route was not re-traced here. The site applies no Match Trigger effect on any weapon, and all 24 audited panels show none. | Known; not re-traced for 2.1.1.0; no site impact |
| DRS-IAR Zenitco RK2 (3b) | `GS_M27IAR` has no binding for `Vertical03_W20`. | Known; resolved above (BROD 3 Alloy Vertical) |
| RPK-74M 30 Rnd and 30 Fast; PP-19 25 Rnd (3b, 3c) | Leftover selectors from other weapons; the weapons' own packages supply all effects. | Known; see the traced table above |
| M121 A2 and M45A1 Hollow Point, Frangible (3c) | The extra FMJ penetration step. | Entry 2 |
| M121 A2 50 Fast (3c) | Lacks `WME_ReloadSpeedRegular` and carries its own `WPM_MAG_MG5_Fast`. Panel: reload 6.267 s to 5.55 s. | Applied; no change |
| Z84M 100 Agil (3c) | Binds moving-ADS accuracy only: no capacity, draw, sprint or ADS-time effect. The text names only moving-ADS accuracy, and the site (`WEAPON_MAG.z84m`) matches. Not in the audit. | Text matches source |
| M240L 75 Rnd and 100 Rnd; GGH-22 22 Rnd (3c) | Per-weapon magazine packages. The M240L 75 Rnd text names draw speed, moving-ADS accuracy and reload, and the GGH-22 22 Rnd text names draw speed; both match the package and the site. | Text matches source |
| Mini Scout Short Barrel (3c) | No `GID_ADSTime_BRL` binding. Panel ADS time 250 ms equals Basic (Extended 300 ms), so the benefit is applied and the site's tier (1) matches. | Panel shows the effect; no change |
| Mk 24 Hybrid Suppressor L, S, K (3c) | `GS_MRGGA` binds `GID_ADSTime_MZL_M10` for the three Magnus suppressor packages, which the same suppressors bind on none of 42 other weapons. Operator panels (17 October, `reference-data/attachment-audit/Weapon Attachments/Assault Rifle/Mk 24/Muzzle 2026-10-17/`): ADS time 250 ms with no muzzle and with each of the three; the other changes follow the texts (L: Hipfire 40 to 34, Mobility 52 to 50, sprint recovery 167 to 200 ms; S: Hipfire 34 only; K: none; all three Precision 24 to 25, Control 38 to 40, recoil 0.8° to 0.7°, spot ranges 0 and 21 m). A 120 fps recording of three hip-to-ADS transitions per muzzle with the Mini Flex ([measurement](../reference-data/provenance/mk24-hybrid-suppressor-ads-time-2026-10-17.md)) gives 40 frames (333 ms) to the settled frame for None, L, S and K alike, and 35 to 38 frames for ADS-to-hip; the offset from the panel's 250 ms is the settle criterion and is the same in all four. The site applies no muzzle ADS-time step. | Panel and recording show no effect; no change |
| 18.5KS-K Magpul AFG (3c) | Extra `GDM_Array_ADSMoveDispersion_BTM_M10`. The same finding as the Slim Angled candidate rejected on 21 September (see below). | Rejected earlier |
| M417 A2 and USG-90 Subsonic variants (3d) | `WPM_AMO_Subsonic` replaces `WME_MuzzleVelocity`. Panel velocity 560 to 273 m/s and 543 to 265 m/s. | Applied; no change |
| Bolt-action recoil and bipod substitutions (3d) | `*_Bolt` assets replace the generic ones by design. | Per-weapon rule |
| KORD 6P67 and M250 Classic Vertical; VCR-2 mission light; SV-98 5 MW laser; RPK-74M and RPKM Heavy Extended; PW7A2 Lightened Suppressor; M39 EMR and M417 A2 `SP_` suppressor assets; ELR-40 and other per-weapon magazine packages; PP-19 iron sights (3c) | Extra or relocated effects behind hash names with no visible stat. The panels equal the same attachments on other weapons, and the texts name no contradicted effect. The PW7A2 Lightened Suppressor extra hip-dispersion step is the hip-fire cost its text names. The PP-19 iron sights also list the `WM_PlaceHolder_IronSights` modifiers; their semantics are not read. | No evidence of an error |

The seven uncaptured WB modifier assets in the survey (section 1) are coverage gaps and were
not triaged.

## Review method and rejected findings

**First scan (14 September).** Compared moving-ADS spread penalties and recoil
smoothing with fixed wording. It found entry 1. It also flagged Slim Angled on the
18.5KS-K, rejected on 21 September: the modifier binds outside the moving-ADS collection,
and [ADS indicator captures](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/ks18k-ads-indicator-2026-09-21.json)
show no moving penalty.

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
- Former entry 5, Subsonic and Sub HP on the P18, GGH-22 and ES 5.7 (removed
  14 October 2026). The site text claims "Marginally lowers recoil", but the in-game
  text on these sidearms makes no recoil claim (attachment audit screenshots, July 2026,
  and P18 panels of 14 October 2026), and recoil is unchanged against FMJ (P18 1.2°,
  Control 23). The site linked the shared SMG text; the game is consistent. Since
  14 October the site shows the panel text on the three sidearms (reviewed panel rows).

### "Handling" wording

All 61 current uses (2.1.1.0) are magazines. Across weapons, "improved handling"
covers any combination of faster sprint recovery (51 pairs), faster deploy (51),
faster ADS (47), faster ADS movement (47), less sway (47), better moving-ADS
accuracy (44) and faster reload (29); these sub-counts are from 1.4.x. Magnitudes differ by weapon. RPKM 75 Rnd says "at the
cost of weapon handling" but only has ADS move +1. These counts use absolute
magazine shifts, not values relative to the default magazine.

## Adding an entry

Record the exact in-game text, the conflict, the Frosty binding, in-game evidence,
the value the site applies, and the type and status. Read magazine shifts relative
to the weapon's default magazine. When captures confirm a mismatch on a magazine,
add a `descriptionMismatch` object with a link to the evidence file. When the site
links wrong text, add a reviewed panel row instead of editing
`data/attachment-tooltips.json`.

## 2.1.1.0 recheck, 13 October 2026

Update 2.1.1.0 (Season 5) is a new build. Entries 1 to 16 were rechecked against the raw
before/after comparison with 1.4.3.5; the earlier in-game measurements were not repeated.
None is resolved. Entries 17 to 21 and 23 are new in this build (23 added later on 13 October); entry 22
is older and newly listed.

What was compared:

- **Modifier packages.** No package behind any entry changed. The only changed package files
  in the build are `WPM_SCP_ElcanDR` and `GRM_Recoil_Controller_03`; neither belongs to an
  entry.
- **Weapon files.** The `GS_`, `_WB` and `_Ability` files of the listed weapons changed only
  by additions for two new foregrips (`WPM_BTM_Actuated_W10`, `WPM_BTM_VerticalGrip02_W30`)
  and the `GRM_Recoil_BTM_P30` binding, on the weapons that received them. Not every weapon
  did: the Actuated Module has an attachment record on 36 of the 63 existing weapons. `GS_L115A3` is
  byte-identical.
- **Descriptions.** 1,004 AD assets were resolved; 55 changed raw bytes and 4 changed a label
  or description. None of the 4 belongs to an entry: the three low-zoom variable optic
  accessories ("Low-Zoom" is now "Low-Zoom 4x") and the VSSM 10 Rnd magazine, whose
  description now reads "Compact magazine for improved handling at the cost of capacity."
- **Patch notes.** No fix line names a listed entry.

| Entry | 2.1.1.0 result |
|---|---|
| 1 | No source/text change; sniper selector status retained. |
| 2 | No source/text change; extra FMJ selector status retained. |
| 3 | No source/text change; absent SMG draw effect retained. |
| 4 | No source/text change; PP-19 fast-magazine reload status retained. |
| 6 | No source/text change; PP-19 smoothing omission retained. |
| 7 | Belt-box packages unchanged; moving-ADS status retained. `Minimi_WB` lost its `CMU_MatchTrigger` entry and its in-world spot base changed (entry 17); neither touches the belt box. |
| 8 | No source/text change; PW7A2 text mismatch retained. |
| 9 | No source/text change; SGX text mismatch retained. |
| 10 | No source/text change; KTS100 relative-to-default status retained. |
| 11 | Re-read from raw: all 23 optic-FOV source assets keep their links and values. The RPK-74M and L115 still link the six base optic parts at render FOV 55 where other long guns link riser parts at 40 (CQ RDS 44). The Mk 24, ELR-40, Z84M and RSPR link riser parts. Visual status retained. |
| 12 | `GS_L115A3` byte-identical; suppressor binding omission retained. |
| 13 | No source/text change; source-specific tungsten penalties retained. |
| 14 | No source/text change; burst activation remains open and still needs an in-game recheck. |
| 15 | Re-read from raw: both empty-reload entries still store `ReloadTime` 3.284 s against 3.2 s (SOR-300SC) and 3.034 s (GRT-CPS) in `ReloadTimeBulletsLeft` and at the end of the phase list. No reload value changed on any weapon; the four new weapons agree on all three values. Retained. |
| 16 | No source/text change; BROD 3 iron-sight sway omission retained. |
| 17 | New. See the entry. |
| 18 | New. See the entry. |
| 19 | New. See the entry. |
| 20 | New. See the entry. |
| 21 | New. See the entry. |
| 22 | Present before this build; listed now. The keyed row changed from 1 to 100, the panel did not. |
| 23 | New. See the entry. |
| 24 | New (17 October). See the entry. |
| 25 | New (17 October). See the entry. |
| 26 | New (17 October). See the entry. |

The multi-package scan returns the same 15 candidates, none with a changed input.
Re-reading 629 magazine operands supports 287 selections relative to their defaults, with
no change. The retained selector graph is built from the 1.4.3.0 export, so it does not
cover attachments added in this build.

Site values changed for this build that are not bug corrections: SVDM recoil direction 4 to 20
and recoil decrease time exponent 0.75 to 1.1; M39 EMR exponent 0.75 to 1.0; controller
recoil multiplier 0.8836 to 0.95; VSSM 10 Rnd description; in-world spot base 75 m on the
four weapons of entry 17.

## 1.4.3.5 recheck, 30 September 2026

Source and description status is unchanged for each row below. This retains the
existing classifications; it does not repeat the earlier in-game measurements.
The [dated receipt](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frosty-update-1.4.3.5-2026-09-30.json)
pins `attachment-bug-recheck.json` and `raw-content-review.json` in the open build's
reports folder. They give the selected source routes and both raw hashes.

| Entry | 1.4.3.5 result |
|---|---|
| 1 | No source/text change; sniper selector status retained. |
| 2 | No source/text change; extra FMJ selector status retained. |
| 3 | No source/text change; absent SMG draw effect retained. |
| 4 | No source/text change; PP-19 fast-magazine reload status retained. |
| 6 | No source/text change; PP-19 smoothing omission retained. |
| 7 | No source/text change; belt-box moving-ADS status retained. |
| 8 | No source/text change; PW7A2 text mismatch retained. |
| 9 | No source/text change; SGX text mismatch retained. |
| 10 | No source/text change; KTS100 relative-to-default status retained. |
| 11 | No source change in the 23 retained optic-FOV source assets; visual status retained. The announced PS5 optic-edge change is separate. |
| 12 | No source/text change; L115 suppressor binding omission retained. |
| 13 | No source/text change; source-specific tungsten penalties retained. |
| 14 | No source/text change; burst activation remains open. |
| 15 | No source/text change; retained reload timing interpretation unchanged. |
| 16 | No source/text change; BROD 3 iron-sight sway omission retained. |

Current label/description roles were resolved for 1,004 AD assets. Their raw bytes
and the complete English localization file are unchanged. All AD metadata retains
layout ambiguity, so unchanged decoded fields alone do not prove correct decoding.
The multi-package scan returns 15 candidates, not new confirmed bugs. Re-reading
629 magazine operands supports 287 selections relative to their actual defaults;
KTS100 50 Rnd and default 60 Rnd match in all five checked handling fields. Reload
and sway were not newly measured. Three unrelated Blacklight inputs lack current
raw coverage in the retained selector graph. No site numeric value was changed.

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
