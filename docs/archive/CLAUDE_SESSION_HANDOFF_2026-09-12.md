# Claude session handoff — 12 September 2026

**Current status, 13 September:** The combined work was merged through PR #31
(`b0c4a97`). Decoded light hipfire factors and guide updates are subsequent local
changes. The release/test counts and local-merge statements below describe earlier
checkpoints. Use the [current audit](../frosty/WEAPONS.md)
and [current model guide](../RECOIL_SPREAD_MODEL.md) for the implementation now.


This handoff records one Claude Code session: its review of the September recoil/spread work, its research on existing evidence, and its data and code changes. It is for the next agent (Codex) and for the operator.

Updated later on 12 September 2026 with the per-weapon limb multiplier search (section 10) and a response to the Codex review (section 11).

**Release snapshot (13 September UTC):** The combined implementation includes
per-weapon/ammo hit zones, projectile ballistics and collateral; source spotting,
regeneration and sway factors; controller recoil 0.8836; and spread distribution
exponents. All 77 product tests and both data/ship-surface checks pass. Barrel ADS
values already match the 234 WB animation/FOV selections and were not changed.
The dated investigation and pre-merge statements below are historical. Current
findings and remaining limits are in the global-candidates audit.

**Merge update (13 September UTC):** Claude's `ce071e9` is now merged locally as
`314b8f7` on `docs/limb-multiplier-handoff`. It replaces the overlapping Codex
headshot implementation and supplies both headshot and limb runtime data.
The independent limb trace and research notes are retained. Superseded Codex
code and headshot JSON are backed up under ignored research output. All 72 tests,
63-weapon data validation, and ship-surface validation pass. The comparison and
pre-merge statements below describe the earlier state. This merge is not pushed.

**Audit continuation (13 September UTC):** M60 and M121 A2 Lightweight options
were removed after the operator's in-game correction and source-roster check.
The generated hit-zone trace now has 328 ammo entries without those fallbacks.
Ballistics now use generated per-weapon/ammo projectile links. The
[continued audit](../frosty/WEAPONS.md) records controller,
availability, collateral-table and regeneration findings, plus remaining native
composition questions. These later changes are local and uncommitted.

**Codex follow-up:** section 12 now resolves the base-projectile limb values by
reading bounded raw material-grid records. It supersedes section 10's missing-
table status and proposed protection-index-only limb mapping. Runtime values
have not been changed by this follow-up.

**Claude implementation (section 13):** branch `frosty-hit-zones` (`ce071e9`, not
pushed) generates headshot **and** limb multipliers per weapon and ammo from
Frosty into `data/hit_zones.json`, and removes every class-level hit-zone table.
It overlaps the uncommitted Codex `WEAPON_HS_MULT` work in the main tree; merge
only one of them (section 13.5).

Read with the [active recording handoff](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md). Current equations stay in the [recoil/spread guide](../RECOIL_SPREAD_MODEL.md).

## 1. Repository state

- **Merged.** PR #29 (`a4ec6be`) contains this session's five commits below, this handoff, the 25 ms duration fallback, and `RECORDING_REUSE_ANALYSIS_2026-09-12.md` with its plots in `docs/img/recording-reuse-2026-09-12/`. PR #30 (`962c5ad`) contains the attachment-audit package.
- Commits from this session, oldest first (squashed into #29):

| Commit | Content |
|---|---|
| `f6eba48` | Spread recovery integrates in 1 ms steps (`SPREAD_TIME_STEP`) |
| `e1785f6` | 12 September research results added to the active handoff |
| `9e90c5b` | Decoded BROD 3 (`BREN3`) source fields recorded in the handoff |
| `ceead78` | BROD 3, EF88 and VSSM are sourced from Frosty; donor/estimated provenance removed |
| `ceeda6d` | Frosty bolt/pump cycles, shell-fed shotgun reloads, revolver empty reloads |

- **Duration fallback.** A missing or zero recoil duration falls back to 25 ms. The operator requested it in the Codex task; it is on `main`. It has no effect on current data: all 126 durations are 25 ms, and the smallest resolved value is 24.4 ms.
- **PR #30 was rewritten before merge.** `reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json` (47.7 MB) is no longer tracked and is now git-ignored; the local copy remains. The earlier version of #30 (`825a494`) exists only as an unreferenced local commit.
- **Still tracked:** `soldier-target-original.png` (228 KB) in the repository root. Its purpose is not recorded; confirm that it is wanted.
- Checks on the exact snapshot at `ceeda6d`: 72 Node tests pass; `validate-data.mjs` and `validate-ship-surface.mjs` pass; `git diff --cached --check` passes.
- A browser check at `ceeda6d` rendered EF88, VSSM, BROD 3, DB-12, M87A1 and Mini Scout with correct values and no site console errors. The only console errors are Cloudflare Insights CORS failures on localhost.

## 2. Review of the September consolidated recording and source work

Result: the work is sound. Documented numbers reproduce with production code:

- M4A1 Lightened 2,000-seed vertical-range reductions: 1.5 / 3.3 / 7.2 / 10.0% at 3 / 5 / 10 / 15 rounds; Standard 15-round height 5.180°.
- TR7 and AK4D 15-round Lightened reductions: 9.7% and 16.0%.
- AK4D Heavy ADS peak spread reduction: model 31.9% (5 shots) and 32.2% (15 shots), versus 32.6% and 32.1% measured. Hipfire is unchanged in both.
- Heavy factors are exactly `a = 2/3` scaling of excess spread: increment `a`, offset `a`, coefficient `a^(1-2.5) = 1.837117`. Consequently the model predicts one-third excess reduction for every weapon and burst length (below the maximum). The AK4D match tests the scaling, not the recovery equation or transfer.
- VSSM hip index 4 (1.804 / 2.255°), 17 Bolt Smooth exceptions, and Folding Stock ADS increase 0.409 are present in live data.

Review findings still open:

1. The uncommitted duration fallback above was explicitly requested by the operator; no further implementation decision is needed. Publication remains separate.
2. Resolved in #30: `frosty-panel-audit-2026-09-07.json` (47.7 MB) is untracked and git-ignored.
3. `FROSTY_AUDIT_2026-09-07.md` says that the validator checks screenshot existence. The check runs only with `--screenshots`. With that flag it passes.
4. `build-workbook.py` writes the fixed text "Classic Grip Pod, not Ribbed Vertical" for any "Wrong selected attachment" conflict. It is correct for the single current conflict only.
5. Analysis scripts and results live in git-ignored `outputs/`; they are local-only evidence.

## 3. Research results (no new recordings)

Local scripts and outputs are under `outputs/` (git-ignored). Tracked conclusions are in the active handoff and the provenance files in section 5.

### 3.1 Impact screenshots — `outputs/impact-comparison-2026-09-12/`

- The model with spread predicts an 8.8% 15-round Lightened height reduction; recoil only gives 10.0%.
- The recording metric is a median of five groups. Its simulated 90% range is 0.8–16.0%. The observed 14.8% is at about the 91st percentile; the 10-round observation (1.0%) is at the 16th percentile.
- Result: the screenshots do **not** show a significant relative error. Group height cannot separate uniform-radius from uniform-area sampling.

### 3.2 Absolute pixel-to-degree scale

- Standing hipfire arm separations (M4A1 81 px at 1.804°, AK4D 103 px at 2.432°, M39 EMR 136 px at 3.352°; 2560 × 1440) fit **35.55 px/degree + 16.7 px**, with residuals ≤ 0.21 px.
- If the stored minimum is a half-angle, the focal length is 1019 px. FOV 103 as a **horizontal** FOV at 2560 px gives 1018 px; as a vertical FOV it gives 573 px. **Codex review qualification:** this is consistent with the horizontal-FOV/radius interpretation under the assumed HUD geometry. The fit uses stored minima and HUD widths; it does not independently prove projectile angles or the camera projection in the impact screenshots.
- With that scale, observed median impact heights exceed model means by 4–10% for 3–10 rounds and by **22% (Standard) / 14% (Lightened) at 15 rounds**. Fifteen rounds last about 1.05 s; the operator reports sway after about 400 ms. Cause not established.
- AK4D ADS indicator width ÷ model peak gives about 29.5–32.4 px/degree, below the hipfire scale. ADS indicator geometry and sampled peaks are unverified.

### 3.3 Frosty registry scan — `outputs/frosty-recoil-field-scan-2026-09-12/`

- Site base recoil fields match the registry for all 63 weapons, both aim states.
- BROD 3 (`BREN3`) has no named GS entries in `GRX_Weapons.xml`. `decode_bren3.py` learned GS leaf positions from 62 named weapons. Leave-one-out rebuilds of seven weapons recover 150–152 of 152 fields and accept no wrong value. All 152 BREN3 fields decode; all 24 BROD 3 recoil values and all spread-behaviour values match the site.
- All named `MultiplierByOrder` arrays are empty (`Count="0"`). `FirstShotIncreaseMultiplier` and `FirstShotMultiplierVerticalRecoil` are 1.0 everywhere.
- Non-neutral fields: `VerticalRecoilIncrease` 0.6 on 16 non-automatic weapons (all `UsePolarRecoil` true); `MaxVerticalRecoil` 90 on three pistols.
- **`DistributionExponent` is 0.5 on almost every branch** (0.67 for `DesertTechHTI` zoomed moving). The site samples `r = spread * u`, which is exponent 1 if the engine uses `u^exponent`. The native consumer is not established.
- Hip `IdleTime`: 1.8 s on six bolt rifles, 1.2 s on `590A1` and `DP12`, 0.6 s otherwise; ADS 0.4 s everywhere.

### 3.4 Spread integration step

- 1/60 s stepping under-recovered by up to 3.3% against a 0.1 ms reference across all weapons, aim states and stances. 1 ms stays within 0.18%. All weapons compute in about 10 ms. Changed in `f6eba48`.

### 3.5 Smooth operand variants — `outputs/smooth-variants-2026-09-12/`

Codex's 10 September camera-track replay harness, Lightened-only RMS (px):

| Variant | M4A1 | TR7 | AK4D |
|---|---:|---:|---:|
| Current: 50 ms and recovery × 1.2 | 1.93 | 2.96 | 2.47 |
| Factor × 1.2 only, 25 ms | 1.77 | 2.89 | 2.47 |
| 50 ms only | 1.59 | 2.86 | 2.57 |
| 50 ms and offset × 1.2 | 1.59 | 2.86 | 2.57 |
| 50 ms and time scale 1.2 | 2.47 | 3.82 | 2.54 |
| 50 ms and recovery × 1.1 | 1.72 | 2.85 | 2.50 |

No variant wins for all three weapons. Time scaling is clearly worse. Offset scaling is not visible. Keep the current source-based treatment.

### 3.6 Stored values that differ from named Frosty fields

| Area | Finding | Decision |
|---|---|---|
| Hipfire minimum, 17 weapons | The GS hip array selector differs from named `MinAngle` (10 SMGs and Vz. 61: 1.804 vs 1.352; SVK-86: 4.848 vs 3.352; 4 shotguns: 2.432 vs 0.784; VSSM: 1.804 vs 3.352). The panel **hipfire score** follows the array value for all 17: on agreeing weapons 1.804 → 47, 2.432 → 40, 3.352 → 34, 4.848 → 29. | **Keep array values.** The named literals are not what the game uses. |
| Moving ADS minimum | All 63 weapons select array index 3 (0.32°). Named `MinAngle` is 0.35° (0.30° on six bolt rifles). Attachments move through the same array. No direct measurement. | **Keep array values.** Indirect evidence only. |
| Reloads | For 15 tactical and 13 empty reloads the site stores reload time ÷ reload speed. Every panel matches, including SL9 (speed 1.03). | **Keep.** Confirmed. |
| Bolt-action rate | Frosty `RateOfFire` 299.999 is not the cycle. The site had older Sym rates; three of five contradicted panels. | **Changed** in `ceeda6d` (section 4.3). |

### 3.7 FrostyCmd

- `C:\Users\royal\Documents\BF6 Datamining\FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final\FrostyCmd.exe` works. This fork uses `FrostyCmd export-ebx <profile> <game-path> <asset-name> <output-file>`. The online docs describe a different command set.
- Verified: `./FrostyCmd.exe export-ebx bf6 "C:\Program Files\EA Games\Battlefield 6" "Common/Hardware/Weapons/Shotgun/DP12/DP12_WB" <output>` took 14 s. The output is byte-identical to the existing XML export, so the installed game matched the 1.4.2.5 export on 12 September.
- **Memory hazard.** Level material grids (`game/glaciermp/levels/<level>/<level>/materialgrid_win32`) cannot be exported. FrostyCmd threw in `EbxReader.ReadAsset` and kept running to 52 GB; this crashed the operator's machine once. The Frosty Editor GUI export "times out" but continues reading in the background (49 GB with 0.7 GB free before it was force-stopped). Do not export these assets. Git Bash `timeout` does not stop the Windows process: after any failed or slow export, run `Get-Process Frosty*` and stop leftovers with `Stop-Process -Force`. Run one export at a time.
- Use `ebx_manifest.txt` in `BF6 Datamining` for asset routes. If `bf6.exe` has a newer date, new exports reflect a newer build and are not comparable with the existing tree.

## 4. Data and code changes

### 4.1 Spread step (`f6eba48`)

`SPREAD_TIME_STEP = 0.001` in `sim/core.js`, used by `simulateSpread()` and `applySpreadRecovery()`. The guide text changed from 1/60 s to 1 ms.

### 4.2 No estimated or donor weapons (`ceead78`)

Sym does not publish BROD 3, EF88 or VSSM. Their values now come from Frosty 1.4.2.5.

| Weapon | Change |
|---|---|
| EF88 | `reloadSpeed` 0.987893 → 1 (`ReloadInfoArray[0].ReloadSpeed`). Damage points relabelled `Frosty`; they already equalled `PD_556x45mmNATO`. |
| VSSM | `emptyRld` null → 3.584. Damage adds the Frosty 17.13 tier past 75 m (`PD_9x39mm_Semi`; `PD_9x39mm_Match` is identical). |
| BROD 3 | Unused GRT-BC burst fields removed (`BurstsPerMinute` 0; no burst option). Damage points relabelled `Frosty`; they already equalled `PD_556x45mmNATO_Carbine`. |

- All three have `provenance.status: "sourced"` and one `frosty.fields` list. Donor, `estimatedFields`, Companion `sourced` and donor damage blocks are removed.
- `ui/app.js` no longer uses donor IDs for projectile velocity.
- Tests were rewritten: no weapon may have estimated status, donor provenance, or donor damage text, and the three Frosty curves are pinned.
- Docs no longer describe donor fallback.
- **Operator follow-up, 12 September:** above 75 m with Range Pen ammo, displayed rounded damage is 17 chest, 31 head, and 14 arm. Chest/head support the newer 17.13 Frosty tier and 1.8 head multiplier. The arm result exposes a separate mismatch: the site's 0.91 limb multiplier rounds to 16; 0.84 would round to 14. The exact arm multiplier remains open. See section 9.

### 4.3 Manual cycles and reloads (`ceeda6d`)

- Bolt and pump cadence: `rpm = n * 60 / (BoltActionTime / BoltActionSpeed + BoltActionDelay + n * 60 / RateOfFire)`, with rounds per cycle `n` from WB leaf `Field_99a33446` (DP12 = 2; every other weapon = 1). Panels show the floor of the result; DB-12's 149.9996 displays as 150.

| Weapon | Before | After | Panel |
|---|---:|---:|---:|
| M2010 ESR | 44.08 | 43.90 | 43 |
| SV-98 | 37.67 | 38.21 | 38 |
| PSR | 38.12 | 38.66 | 38 |
| Mini Scout | 51 | 47.09 | 47 |
| L115 | 46.35 | 46.14 | 46 |
| Interdictor | 31.91 | unchanged | none |
| M87A1 | 1800 | 94.74 | 94 |
| DB-12 | 360 | 359.999 with `burstRounds` 2, `burstRpm` 359.999, `burstBurstsPerMinute` 75.0 | 150 |

- `shotIntervalAfter()` and `isBurstGapAfter()` treat `pump` like `burst`, so DB-12 alternates 0.167 s and 0.633 s. Pump multi-shot TTK is displayed; the "Unverified" label and the "pump cycling not modeled" note are removed. `IN_GAME_RPM_BY_SYM` has entries for the new rates.
- Shell-fed shotgun `tacRld = ReloadInfoArray[0].ReloadDelay + ReloadTimeBulletsLeft + PostReloadDelay`: M87A1 1.334, M1014 1.784, DB-12 2.348 s. All three equal the panels. Magazine reload tiers are 0, so the resolver keeps these values.
- Revolvers M44 (`RagingHunter`) and M357 Trait (`TRR8`) have one reload entry for every ammo count, so `emptyRld = tacRld` (3.4 and 3.067 s).
- **Not applied:** shotgun empty reload. The candidate `ReloadInfoArray[1]` delay + time + post (M87A1 4.318, M1014 3.184, DB-12 2.482) has no panel check. RPK-74M has a 0.084 s post delay on its empty entry, but the site stores 3.1 without that delay. The composition is not established.
- The Interdictor provenance note now says that bolt RPM uses the Frosty cycle. The old runtime policy in `frosty-shotgun-fire-timing.json` is superseded; the new evidence file records this.

## 5. Tracked evidence files

- `reference-data/provenance/frosty-1.4.2.5-datamined-weapons-2026-09-12.json`: source hashes, method, BREN3 decode leave-one-out results, before/after changes, removed provenance and the VSSM damage conflict.
- `reference-data/provenance/frosty-1.4.2.5-cadence-reloads-spread-selectors-2026-09-12.json`: registry values and GUIDs, cycle and reload formulas, panel checks, the DB-12 rounds-per-cycle field, the shotgun empty-reload candidates, and the hipfire and moving-ADS selector evidence.

## 6. Review of `RECORDING_REUSE_ANALYSIS_2026-09-12.md`

- Written by another session at 18:09 and untracked. Its conclusions are cautious and consistent with this session's findings, including source idle times of 0.4 s ADS and 0.6 s hipfire. It recommends keeping the first-shot multiplier and adds no fitted constants.
- Claims checked: the output folder exists (47 files), and the cited commits `f6eba48` and `e1785f6` exist.
- The four embedded PNGs and outputs link originally pointed into git-ignored `outputs/recording-followup-2026-09-12/`. **Fixed in the Codex review:** the four plots are copied to `docs/img/recording-reuse-2026-09-12/`, and the report uses those relative image links. The local-only output directory is now plain text. The active handoff already links the report. The report and plots still need to be committed together; no Pages publication was performed.

## 7. Open items and recommendations

Order by value:

1. **Per-weapon hit zones: implemented, not merged (section 13).** Choose between branch `frosty-hit-zones` and the uncommitted Codex `WEAPON_HS_MULT` work. An in-game close-range VSSM arm check (30 predicted) remains a useful confirmation, not a blocker.
2. **Long-burst absolute recoil gap (22% / 14% at 15 rounds).** Without new footage, compare the 11 September M4A1 camera tracks with the degree-converted impact heights and test whether sway after about 400 ms explains the excess. The result depends on the projection assumption (section 3.2). Do not add a fitted multiplier.
3. **`DistributionExponent` 0.5.** It decides where bullets land inside the spread circle. Recording scenario 6 (100–200 fully reset shots) is the only direct test.
4. **Attachments still marked assumed** in `data/attachments.json` (17 records): `hipSpreadDecayBoost` placeholders on Combo Red, Combo Green, Flashlight and Taclight - Hipfire ("created by us"); Burst Training, Burst Mode, GRT-BC Burst Training and Linear Comp; and nine Smooth muzzles whose model use is an interpretation. Check the placeholders against Frosty modifiers; use FrostyCmd for assets that are not exported, but never level material grids.
5. **Shotgun empty reload** needs a panel or recording before any value is stored.
6. **Moving ADS 0.32°** could get direct confirmation from a moving-ADS HUD measurement with a known scale.
7. **Attachment-audit package:** findings 3 and 4 in section 2 remain. Confirm whether `soldier-target-original.png` should stay tracked.

## 8. Evidence rules followed

- Frosty and in-game panels are authoritative; no donor or placeholder values were added.
- A value changed only when Frosty and the panels agree, or when Frosty is the only available source and no current in-game evidence contradicts it (VSSM damage conflict flagged).
- Camera and HUD pixels were not treated as projectile angles without the calibration in section 3.2.
- No fitted constants were added to force a match.

## 9. Codex review and operator damage check

The review checked the report links, the earlier operator instruction, the
calibration script's assumptions, and the current VSSM damage/multiplier
resolver with Range Pen. It does not constitute a fresh audit of every Claude
commit or a rerun of all recording analyses.

| Above 75 m, Range Pen | Current calculation | Rounded | Operator observed |
|---|---:|---:|---:|
| Chest | 17.13 | 17 | 17 |
| Head | 17.13 × 1.8 = 30.834 | 31 | 31 |
| Arm | 17.13 × 0.91 = 15.5883 | 16 | 14 |
| Candidate arm multiplier | 17.13 × 0.84 = 14.3892 | 14 | 14 |

Range Pen has no headshot override in the current ammo record. The limb
multiplier comes from `LIMB_CLASS.vssm = "dmr"`, not the weapon's selected fire
mode. Keep the 17.13 source tier; do not replace it with the rounded display
value 17. The observed arm value conflicts with 0.91, but 0.84 is only a
candidate: for base damage 17.13, any multiplier from approximately 0.7881 up
to (but not including) 0.8465 rounds to 14 under nearest-integer rounding.

Source hit-zone evidence or a close-range Range Pen arm check can distinguish
the candidates. Below 9 m, the stored 35.22 tier predicts rounded arm damage
30 with 0.84, 28 with 0.80, and 32 with 0.91. This is a proposed discriminator,
not a report of a new in-game test. Legs and abdomen were not checked by the
operator. No runtime multiplier was changed in this review.

The HUD-derived absolute scale is a useful consistency check. The reported
22%/14% long-burst excess remains conditional on that projection assumption
and on comparing measured medians with model means. It is not an established
absolute recoil error and does not justify a fitted correction.

## 10. Per-weapon limb multiplier search

Question: EA's 1.4.2.0 notes say "VSSM limb damage multipliers have been adjusted." The site uses class-level limb multipliers (`LIMB_CLASS_MULT`: auto 0.84, dmr 0.91, sniper 0.67). Does Frosty hold per-weapon values?

### 10.1 Confirmed: a per-weapon hit-zone selector

**Headshot implementation update, 13 September UTC:** runtime now uses
`WEAPON_HS_MULT[weaponId]` with a source base and explicit ammo map. The global
headshot/ammo assumptions have been removed. See `docs/DAMAGE_BALLISTICS.md` and
`reference-data/provenance/frosty-headshot-multipliers-2026-09-13.json`: 327 of 330
combinations resolve from source; M121 A2 Lightweight/Hollow Point and M45A1
Hollow Point retain previous values with explicit unresolved-source records.
M44 and M357 Trait now use 1.5 Standard / 1.75 Hollow Point. VSSM remains 1.8 for
all five options. This headshot change does not change the limb resolver below.

Each weapon's `WB.WeaponEntityData.WeaponFiring.PrimaryFire.Shot.DamageProtectionMultiplierIndex` selects a hit-zone row. The panel headshot multiplier follows the index for every weapon:

| Index | Panel headshot | Site weapons | Site limb class |
|---:|---:|---|---|
| 0 | 1.00 | M87A1, M1014, KS-18K, DB-12 | none |
| 1 | 1.34 | LMR27, GRT-CPS; P18, ES 5.7, M45A1, GGH-22 | dmr (0.91) for LMR27 and GRT-CPS |
| 2 | 1.50 | M39 EMR, SVK-86, SVD; M44, M357 Trait | dmr (0.91) for the DMRs |
| 3 | 1.75 | all six bolt snipers | sniper (0.67) |
| **4** | **1.80** | **VSSM only** | dmr (0.91) |
| 11 | 1.40 | all 41 automatics | auto (0.84) |

- `Common/Hardware/AttributeDelegates/WeaponAttributesConfig_HeadshotMultiplierAttributeDelegate` reads `DamageProtectionMultiplierIndex`, so the panel headshot value comes from this selector.
- `_WeaponModifiers/HeadShotDamage/WME_Protection_P10` and `P20` add 1 and 2 to the index. Hollow point, ballistic tip and subsonic JHP ammo modifiers and shotgun slugs use them. GRT-CPS defaults to hollow point, so its panels show 1.5 (index 2); its one standard-ammo panel shows 1.34.
- Result: the site's `dmr` class merges index 1, index 2 and VSSM's own index 4. One limb value cannot be correct for all of them after 1.4.2.0.
- Operator check (section 9): VSSM Range Pen arm damage above 75 m is 14. The current 0.91 gives 16; any multiplier from 0.788 to 0.846 gives 14.
- Inference, not proven: the selector name and the headshot mapping suggest that each index row also holds the limb multipliers.

### 10.2 Not found: the head and limb value table

No searched source contains per-index head or limb values:

- `GRX_Weapons.xml` and `GRX_Characters.xml` (named registries).
- The seven `WeaponAttributesConfig_*AttributeDelegate` assets (panel display definitions).
- `Common/Gameplay/Soldier/GlacierSoldierBoneCollision` and `_TargetDummy` (11 bones; collision and hit-reaction values only).
- `Glacier_Soldier.xml`, `Glacier_Soldier_Gameplay.xml`, `GRX_Glacier_Soldier.xml` and the other top-level soldier assets (movement and gameplay settings).
- `Globals/Materials/MaterialGrid/CurveData/*` (15 explosion falloff curves).
- The exported MP_Badlands level assets: `description`, `staticmodelgroup.physics`, `MeshScatteringDatabaseAsset`, `MeshVariationDb_Win32` and `Enlighten/shaderdatabase_Win32`.

**Location still unknown.** A level material grid defines how pairs of physical materials interact (impacts, penetration, surface and destruction damage). Soldier hit-zone damage used material pairs in older Frostbite Battlefield titles, so the grid is one candidate, but that is precedent only and is not verified for BF6. The name `DamageProtectionMultiplierIndex` could equally point to a soldier health, armor or damage table outside the exported folders. The grid cannot be exported (section 3.7), so this search cannot confirm either candidate.

### 10.3 Recommended next step: in-game measurement

Use standard ammo, because hollow point, ballistic tip, subsonic JHP and slugs change the index. Measure rounded arm or leg damage below 9 m, and record chest damage at the same range:

| Weapon (index) | Close-range tier | Arm result and multiplier |
|---|---:|---|
| VSSM (4) | 35.22 | 30 → 0.84; 28 → 0.80; 32 → 0.91 (current) |
| LMR27 (1) | from its curve | arm ÷ chest |
| M39 EMR (2) | from its curve | arm ÷ chest |

Rounded values give a range, not an exact multiplier. Two ranges (for example VSSM at close range and above 75 m) narrow it.

**Superseded by sections 12 and 13.** Limb values come from the projectile material, not the protection index, and are now read from Frosty. The measurement is optional confirmation only.

## 11. Response to the Codex review (Claude)

- Duration fallback: accepted as operator-authorized; section 1 is updated.
- Calibration qualification (section 3.2): agreed. The 22% / 14% gap depends on the HUD projection assumption.
- Recording-reuse images: the fix is correct; the plots are tracked under `docs/img/recording-reuse-2026-09-12/`.
- VSSM damage check (section 9): arithmetic verified. Chest 17 and head 31 support the Frosty 17.13 tier and the index-4 headshot 1.8. Section 10 explains why a class-level limb value cannot follow the VSSM change.
- PR #30: the 47.7 MB file is resolved by the rewrite; `soldier-target-original.png` is still tracked.

## 12. Codex raw material-grid trace: limb values found

Completed 12 September local time / 13 September UTC. The result comes from
source records, not from fitting the operator's rounded damage observation.

| Base primary projectile group | Limb multiplier | Weapons |
|---|---:|---:|
| Automatic weapons plus VSSM | 0.84 | 42 |
| LMR27, M39 EMR, GRT-CPS, SVK-8.6, SVDM | 0.91 | 5 |
| Bolt-action snipers | 0.67 | 6 |
| Shotguns and non-automatic sidearms | 1.0 | 10 |

All 63 mappings agree in the MP_Abbasid and MP_Badlands material grids. VSSM
is the only mismatch against the current base-weapon limb resolver: it still
uses 0.91. The traced 0.84 predicts `17.13 * 0.84 = 14.3892`, displayed as 14,
for the operator's Range Pen arm shot above 75 m. The close-range prediction
is `35.22 * 0.84 = 29.5848`, displayed as 30. The latter is a prediction, not a
new in-game measurement.

### Evidence chain

1. Resolve each WB's primary firing object with the existing extractor path:
   `/File/Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c`.
2. Resolve that projectile's referenced GUID, then
   `Field_c7584f55/Struct_1e8e7eef/Field_48288193` (packed material).
3. VSSM Standard (`PD_9x39mm_Semi`) and Range Pen (`PD_9x39mm_Match`) both
   store `0x11402680`. Fresh raw reads of both projectiles confirm the same
   value as the XML corpus. The upper 12 bits identify material 276.
4. `GlacierSoldierBoneCollision.xml` assigns `0x01a01a81` to both arms,
   forearms, upper legs and legs: material 26. Head uses material 24.
5. Map material IDs through the grid's index map, then follow its interaction
   row, column, relation lists and local object pointers.
6. VSSM 276 -> limb 26 reaches `Class_c180226c/Field_7889231b`, a one-element
   Float32 array containing approximately 0.839999973 (source decimal 0.84).
   In MP_Abbasid the mapped row/column are 166/23; relation object offset is
   617072, relative to the EBXD data start. Exact array offsets and both-map
   paths are in the evidence JSON.
7. The same property type for head material 24 contains the full sequence
   `[1, 1.34, 1.5, 1.75, 1.8, 1, 1, 1, 1, 1, 1, 1.4, 1.57, 1.8, 1.8]`.
   This reproduces the headshot selector mapping, including VSSM index 4.

**Implementation implication:** headshot index and projectile material are
different inputs. The limb records found here are singleton arrays selected
through material interactions. Replacing all limb classes with a table keyed
only by `DamageProtectionMultiplierIndex` is not supported by this trace.
LMR27 and M39 EMR retain 0.91 despite their different headshot indices. Keep
VSSM's headshot behavior separate from its 0.84 limb value; simply changing
its class to `auto` also activates automatic-ammo headshot logic in the current
resolver and is not an isolated limb correction.

### Verification, scope and reproducibility

- [Machine-readable trace](../../reference-data/provenance/frosty-limb-material-trace-2026-09-13.json)
  records all 63 weapon/projectile links, XML hashes, both grid hashes, packed
  materials, object/array offsets, exact Float32 values and the raw VSSM checks.
- Local scripts and raw files: `outputs/frosty-limb-2026-09-13/`.
  `read-raw-assets.ps1` calls `GetEbxStream` for unmodified assets with a 32 MiB
  asset cap. It does **not** call `GetEbx`, `ReadAsset` or the XML writer on a
  material grid. `raw-riff.mjs` reads bounded RIFF directories and type
  descriptors; `trace-limb-materials.mjs` checks both maps and all 63 links.
- The raw grids are 16,241,212 and 15,925,878 bytes. The earlier full-object
  export remains unsafe. Do not retry it on the basis of this raw-reader result.
- Class/field names remain stripped. Identification of the protection array
  is supported by the complete headshot sequence, control weapon limb values,
  and the operator's VSSM observation. The native lookup function and its
  handling of one-element arrays were not disassembled.
- This covers base primary projectiles and additionally verifies VSSM Range
  Pen's material. It is not a full audit of every ammunition replacement,
  armor state, game mode or target-dummy override.
- Raw assets were read from the installed game on this date. The existing
  source XML set is labelled 1.4.2.5; an exact full-build identity is not
  independently established. Matching one asset is not a full-build check.
- No runtime data or gameplay code was changed. The source finding is ready
  for a separate, scoped VSSM limb correction.

## 13. Frosty-generated hit zones (Claude implementation)

Operator request: use Frosty data globally instead of class-level overrides, so a
future game update needs regeneration only, not new research.

- Branch `frosty-hit-zones`, commit `ce071e9`, worktree
  `BF6 Weapon Analyzer - hit zones`. **Not pushed, not merged.**

### 13.1 What changed

| Area | Change |
|---|---|
| `scripts/frosty-raw-assets.ps1` | Tracked version of the raw `GetEbxStream` dump (32 MiB cap, no EBX decoder). Comma-separated `-Routes`; writes `raw-assets.json` with hashes. |
| `scripts/frosty-hit-zones.py` | Extractor. Reads both raw grids, the XML export and the attachment graph from `frosty-configuration.py`; writes `data/hit_zones.json` and a dated evidence file. |
| `data/hit_zones.json` | 63 weapons, 330 ammo entries: `protectionIndex`, `projectileMaterial`, base `headshot`/`limb`, and per-ammo `headshot`/`limb`. |
| `reference-data/provenance/frosty-hit-zones-2026-09-12.json` | Input hashes, soldier materials, per-weapon WB/GS paths, base projectile and material, head table, and per-ammo attachment XML, protection steps, projectile swap and effect sources. |
| `sim/damage.js` | `resolveHitMultipliers(weaponId, ammoType, { HIT_ZONES })`: ammo entry, else weapon base, else 1.34 / 1. No class logic. |
| `sim/applyAttachments.js`, `ui/app.js` | Load and pass `HIT_ZONES`; remove the old tables and `_limbClass`. |
| `data/balance_tables.json`, `data/ammo.json` | Removed `BASE_HS_MULT`, `HP_HS_HIGH`, `LIMB_CLASS`, `LIMB_CLASS_MULT`, `AUTO_HS_MULT`, and every ammo `hsMult`. |
| `scripts/validate-data.mjs`, `ship-surface.json` | Validation requires an entry for every supported weapon and available ammo (headshot 1–5, limb above 0 and at most 1); the file ships. |
| Tests and docs | Tests use the generated file and pin panel-checked values. `DAMAGE_BALLISTICS.md`, `DATA_REFERENCE.md`, `DATA_SOURCES.md`, `STAT_LADDERS.md` and `MAINTENANCE.md` (regeneration steps) are updated. |

### 13.2 Derivation

- **Headshot** = grid head row (material 24) at `DamageProtectionMultiplierIndex` +
  ammo protection steps. `WME_Protection_P10`/`P20` are `Class_e85fff64`; the step
  is `Field_fbfacac9` (1 or 2), counted once per effect object (deduplicated by
  source and GUID).
- **Limb** = the single-value record for projectile material × limb material 26.
  The extractor asserts that abdomen (25) equals limb.
- **Ammo** attachments can swap the projectile (`Field_808dd66c` in `WPM_AMO_*`),
  which can change the material and the limb value.
- The extractor stops when the two grids disagree, a record is not single-valued,
  or attachments for the same ammo disagree.

### 13.3 Results

The generated values differ from the old site tables in exactly 10 weapon/ammo pairs:

| Weapon | Ammo | Old | New |
|---|---|---|---|
| VSSM | Penetration, Range Pen, Long Range, Frangible | limb 0.91 | limb 0.84 |
| M44 | Standard, Penetration, Frangible | head 1.34 | head 1.5 |
| M44 | Hollow Point | head 1.5 | head 1.75 |
| M357 Trait | Standard | head 1.34 | head 1.5 |
| M357 Trait | Hollow Point | head 1.5 | head 1.75 |

- **Panels:** headshot values match all 321 ammo-panel readings. Four review
  records were OCR misreads and were corrected by visual screenshot check: P18
  Hollow Point, P18 Subsonic Hollow Point, M45A1 Hollow Point, and M44 Tungsten
  all display 1.50. `attachment-screenshot-review.json` was not edited.
- **Fallbacks (base values):** M60 and M121A2 Lightweight have no Frosty ammo
  attachment (1.4 / 0.84).
- **Skipped:** 15 `SubsonicFrangible` attachments; that ammo is not on the site.
- **Reproducibility:** a fresh dump with the tracked PowerShell script gives the
  same grid hashes (`14983a46…`, `9b920062…`) and identical weapon data.

### 13.4 Verification

- 72/72 Node tests, `validate-data.mjs` (63 weapons), `validate-ship-surface.mjs`
  and `git diff --check` pass.
- Browser (worktree on port 5176): VSSM shows 1.80× / 0.84×; M44 Standard shows
  1.50× / 1.00×. Only the localhost Cloudflare Insights CORS errors appear. M44
  Hollow Point (1.75) is covered by a unit test; it was not selected in the browser.

### 13.5 Overlap with the uncommitted Codex headshot work

The main tree has uncommitted Codex changes (`WEAPON_HS_MULT` in
`balance_tables.json`, `frosty-headshot-multipliers-2026-09-13.json`). They edit
the same code, data, test and doc files as `ce071e9`. Merge only one of them.

| Topic | Codex (uncommitted) | Claude (`ce071e9`) |
|---|---|---|
| Headshot | Per weapon/ammo, stored in `balance_tables.json` | Per weapon/ammo, generated file |
| Limb | Still `LIMB_CLASS` (VSSM 0.91) | Frosty per projectile material (VSSM 0.84) |
| Regeneration | No generator script in the uncommitted diff | `frosty-raw-assets.ps1` + `frosty-hit-zones.py` |
| M45A1 Hollow Point | Legacy 1.5; activation marked unresolved | 1.5 from `Attachment_M45A1_AMO_HollowPoint.xml` → `WME_Protection_P10`; panel reads 1.50 |
| M121A2 Hollow Point | Legacy 1.57; activation marked unresolved | 1.57 from `Attachment_MG5_AMO_HollowPoint.xml` → `WME_Protection_P10` |
| M121A2 Lightweight | Legacy 1.4, unresolved | 1.4 base fallback, recorded as an extractor issue (M60 too) |

Codex's "attachment closure selects FMJ" note for M45A1 and M121A2 Hollow Point
disagrees with the extractor, which finds a dedicated Hollow Point attachment
for both. The M45A1 panel (1.50) supports the extractor. Recommendation: keep
`ce071e9`, discard the overlapping uncommitted code/data edits, and keep Codex's
handoff text and its limb trace JSON.
