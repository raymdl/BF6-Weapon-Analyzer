# Claude session handoff — 12 September 2026

This handoff records one Claude Code session: its review of the September recoil/spread work, its research on existing evidence, and its data and code changes. It is for the next agent (Codex) and for the operator.

Read with the [active recording handoff](BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md). Current equations stay in the [recoil/spread guide](../RECOIL_SPREAD_MODEL.md).

## 1. Repository state

- Branch: `spread-1ms-recovery-step`, from `main` at `934dec1`. **Not pushed.** The operator must approve a push.
- Commits from this session, oldest first:

| Commit | Content |
|---|---|
| `f6eba48` | Spread recovery integrates in 1 ms steps (`SPREAD_TIME_STEP`) |
| `e1785f6` | 12 September research results added to the active handoff |
| `9e90c5b` | Decoded BROD 3 (`BREN3`) source fields recorded in the handoff |
| `ceead78` | BROD 3, EF88 and VSSM are sourced from Frosty; donor/estimated provenance removed |
| `ceeda6d` | Frosty bolt/pump cycles, shell-fed shotgun reloads, revolver empty reloads |

- **Uncommitted work that this session did not create or change.** Do not assume that these edits are approved.
  - `sim/core.js`, `scripts/recoil.test.mjs`, `docs/RECOIL_SPREAD_MODEL.md`: a missing or zero recoil duration falls back to 25 ms instead of an immediate impulse. **Codex review correction:** the operator explicitly requested this earlier in the same Codex task: "For a missing/zero duration, we should fall back to 0.025 instead of immediate impulse." It is authorized and remains uncommitted. It has no effect on current data: all 126 durations are 25 ms, and the smallest resolved value is 24.4 ms.
  - The attachment-audit package under `reference-data/attachment-audit/` (dated 7 September), `schemas/attachment-screenshot-review.schema.json`, and `reference-data/provenance/frosty-site-review-2026-09-07.json`.
  - `docs/working/RECORDING_REUSE_ANALYSIS_2026-09-12.md` (another session; see section 6).
  - `soldier-target-original.png` in the repository root (unrelated).
- The session committed only its own hunks. `sim/core.js` and `docs/RECOIL_SPREAD_MODEL.md` were staged from `HEAD` plus this session's edits, so the duration-fallback hunks stay unstaged.
- Checks on the exact committed snapshot at `ceeda6d`: 72 Node tests pass; `validate-data.mjs` and `validate-ship-surface.mjs` pass; `git diff --cached --check` passes. The working tree, with the uncommitted fallback test, has 73 passing tests.
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
2. `reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json` is 49 MB and is not git-ignored. Do not stage it with `git add -A`.
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

- `C:\Downloads\FrostyToolsuite-battlefield6\FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final\FrostyCmd.exe` works. This fork uses `FrostyCmd export-ebx <profile> <game-path> <asset-name> <output-file>`. The online docs describe a different command set.
- Verified: `./FrostyCmd.exe export-ebx bf6 "C:\Program Files\EA Games\Battlefield 6" "Common/Hardware/Weapons/Shotgun/DP12/DP12_WB" <output>` took 14 s. The output is byte-identical to the existing XML export, so the installed game matched the 1.4.2.5 export on 12 September.
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

1. **Open decisions/evidence:** push and PR for this branch; the new VSSM arm-damage mismatch. The 25 ms duration fallback is already authorized. The operator's current chest/head observations support the newer VSSM long-range tier.
2. **Long-burst absolute recoil gap (22% / 14% at 15 rounds).** Without new footage, compare the 11 September M4A1 camera tracks with the degree-converted impact heights and test whether sway after about 400 ms explains the excess. Do not add a fitted multiplier.
3. **`DistributionExponent` 0.5.** It decides where bullets land inside the spread circle. Recording scenario 6 (100–200 fully reset shots) is the only direct test.
4. **Attachments still marked assumed** in `data/attachments.json` (17 records): `hipSpreadDecayBoost` placeholders on Combo Red, Combo Green, Flashlight and Taclight - Hipfire ("created by us"); Burst Training, Burst Mode, GRT-BC Burst Training and Linear Comp; and nine Smooth muzzles whose model use is an interpretation. Check the placeholders against Frosty modifiers next; use FrostyCmd for any assets not exported.
5. **Shotgun empty reload** needs a panel or recording before any value is stored.
6. **Moving ADS 0.32°** could get direct confirmation from a moving-ADS HUD measurement with a known scale.
7. **Attachment-audit package:** resolve findings 2–4 in section 2 before committing it.

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
