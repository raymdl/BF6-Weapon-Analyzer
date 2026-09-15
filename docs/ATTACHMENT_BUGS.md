# Attachment bugs and mismatches

This list records attachments whose in-game stats and in-game description conflict.
Each entry is one of these types:

- **Game error**: the description is correct, but the game does not apply a stat that
  the description states, or applies a stat that the description does not state.
- **Description error**: the game stats are correct, but the description states a
  wrong stat.

Descriptions that leave out an effect that the game applies consistently are not
errors. They are in [Accepted text](#accepted-text).

A future game fix is not assumed. Recheck every entry after a game update. Source
references are to the 1.4.2.5 Frosty XML export unless stated.

## Status overview

Site status uses one of these values, followed by the value that the site applies:

- **Matches game**: in-game panels or captures confirm the site value.
- **Matches source data**: the site value is from Frosty data. Not checked in game.
- **Does not match game**: in-game evidence conflicts with the site value.

| # | Attachment | Weapons | Type | Error | Site status |
|---|---|---|---|---|---|
| 1a | Slim Angled | PSR, SV-98, L115, Mini Scout, Interdictor | Game error | The game applies −1 ADS accuracy while moving. The description does not state this penalty. The Slim Angled action selects the Full Angled package in error. | Matches game: −1 ADS accuracy while moving |
| 1b | Slim Angled | 18.5KS-K | Game error | The game applies −1 ADS accuracy while moving. The description does not state this penalty. The weapon's GS binds the penalty to the Slim Angled package. | Matches source data: −1 ADS accuracy while moving |
| 2 | Hollow Point, Frangible, Tungsten Core | M121 A2, M45A1 | Game error | The game adds the FMJ +1 penetration step to these three ammo types. Collateral damage multiplier is too high: Hollow Point and Frangible keep the Standard value; M45A1 Tungsten Core is one step higher (M121 A2 Tungsten Core is at the maximum, so no change). The descriptions do not state a penetration change. | Matches game: extra collateral step |
| 3 | Slim Angled | SGX, PW5A3, PW7A2, UMG-40, KV9, SCW-10, CZ3A1, PP-19 | Game error | The description states increased weapon draw speed. The game does not apply it. | Matches source data: no weapon draw speed change |
| 4 | 20 Rnd fast | PP-19 | Game error | The description states faster reloads. The game does not apply the reload speed bonus (×1.13). | Matches game: no reload speed change |
| 5 | Subsonic, Sub HP | P18, GGH-22, ES 5.7 | Game error | The description states lower recoil. The game does not apply it. | Matches source data: no recoil change |
| 6 | Flash Comp | PP-19 | Game error | The description states less recoil buildup and better recoil recovery (recoil smoothing). The game does not apply it (operator report; no source trace yet). | Does not match game: recoil smoothing applied |
| 7 | 200 Rnd belt box | L110, M123K | Game error | The description states reduced ADS accuracy while moving. The game does not apply it. | Matches game: no ADS accuracy while moving change |
| 8 | 30 Rnd fast | PW7A2 | Description error | The description states improved weapon draw speed (Regular magazine text). The game applies faster reload speed (×1.13) and no weapon draw speed change. | Matches game: reload speed ×1.13 |
| 9 | Extended barrel | SGX | Description error | The description states a fast transition to ADS. The game applies no ADS time change (old text from before the ADS buff was removed). | Matches game: no ADS time change |
| 10 | 50 Rnd / 50 Rnd belt / 75 Rnd belt box | KTS100 MK8 / M/60 / M240L | Description error | KTS100 MK8: "improved handling", but only reload speed and sway improve. M/60 and M240L: "improves weapon draw speed", but the game applies no weapon draw speed change. | Matches source data: source values |

Accepted as less detailed but consistent text: Slugs recoil, PP-19 53 Rnd ADS
movement, SL9 60 Rnd weapon draw, RPK-74M 95 Rnd ADS time, and Linear Comp overall
recoil. See
[Accepted text](#accepted-text). Source candidates that are not confirmed bugs are in
[Multi-package scan candidates](#multi-package-scan-candidates).

## Game errors

### 1. Slim Angled applies an unstated moving-ADS penalty

Both cases give Slim Angled −1 ADS accuracy while moving, which its description does
not state. The causes in the game data are different, so each case needs its own fix.

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
  ([composite findings](working/COMPOSITE_STATS_FINDINGS.md#mobility)). No clamp
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

#### 1b. 18.5KS-K: penalty bound to the Slim Angled package

- **In-game text.** "Marginally reduces recoil, increases weapon draw speed, and
  enables a slightly faster transition to aim down sights (ADS)."
- **Error.** The game applies −1 ADS accuracy while moving. The description does not
  state this penalty.
- **Source trace.** The Slim Angled action (`Attachment_185KSK_BTM_Magpul_AFG`,
  branch `17aaf490-…`) selects `U_WPM_BTM_Fast02_W25` (`16a53347-…`). Full Angled
  (`Magpul_AFG2`) selects a different package, `U_WPM_BTM_Fast03_W30`. `GS_185KSK`
  binds `Fast02_W25` to `GDM_Array_ADSMoveDispersion_BTM_M10`. Unlike entry 1a, the
  correct package is selected; the penalty comes from the GS binding.
- **Other weapons.** Rifle and LMG GS files (for example `GS_SCARL`, `GS_RPK74M`) bind
  `Fast02_W25` to `GID_ADSTime_BTM_P10` and `GRM_Recoil_BTM_P10` only. `GS_Vector`
  and `GS_UMP40` also bind it to the moving-ADS penalty, but their Slim Angled selects
  `U_WPM_BTM_FastPDW_W20` (entry 3), so no other weapon gets the penalty in game.
- **Frosty.** `movingAdsSpreadTierMod: -1` on `ks18k` only. Cost 25, the same as on
  other weapons.
- **Site.** Applies the −1 penalty. Not checked in game.

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
- **Possible conflict.** Operator report: the PP-19 Flash Comp does not have the Recoil
  Smoothing attribute. This repository does not yet hold a source trace for it; the
  [recoil handoff](working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md#open-source-and-attachment-review-work)
  lists "PP-19 Flash Comp modifier mapping" as open work.
- **Site.** The `flash_comp` record has no PP-19 override. The site applies the
  ordinary smoothing: `recoilDurationOverride: 0.05`, `adsRecoilDecayMult: 1.2` and
  `hipRecoilDecayMult: 1.2`.
- **Status.** Game error: the game does not apply the recoil smoothing that the
  description states. The site does not match the operator report.
- **Action.** Confirm with a Frosty trace, then add a PP-19 override.

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

### 10. Magazines that overstate handling or draw speed

Found by the 14 September magazine recheck with every value relative to the
weapon's default magazine. All values are source-generated. Not checked in game.

| Weapon | Magazine | In-game text | Relative to default | Incorrect part |
|---|---|---|---|---|
| KTS100 MK8 | 50 Rnd (default 60 Rnd) | "Wide magazine for improved handling at the cost of capacity." | Reload +1, sway ×0.667; ADS, draw and ADS movement unchanged | "improved handling" (only reload and sway improve) |
| M/60 | 50 Rnd (default 100 Rnd) | "Ammunition belt that improves weapon draw speed and weapon sway as well as transition to aim down sights (ADS) and movement speed while ADS." | ADS −1, ADS move −2, sway ×0.667; draw unchanged | "improves weapon draw speed" |
| M240L | 75 Rnd (default 50 Rnd) | "Belt box that improves weapon draw speed and aim down sights (ADS) accuracy while moving, but reduces weapon reload speed." | Moving-ADS accuracy +1; draw unchanged | "improves weapon draw speed" |

Both default and alternative magazines on these weapons have draw −1, so the
"improves" claims hold only against a magazine without the Regular draw bonus.

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
