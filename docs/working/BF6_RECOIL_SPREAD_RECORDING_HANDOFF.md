# Active Frosty recoil and spread investigations

## Current implementation update — 13 September

The model now uses source distribution exponents (usually 0.5; moving ADS on
Interdictor 0.67) and decoded light hipfire growth/recovery factors. The M39 EMR
analysis found 22 of 88 first-25-shot impacts inside half radius (25%), with mean
normalized radius 66.1%. This supports area sampling for those captures; it does
not establish every weapon/state or the native consumer. The selected light is
modeled as active, and idle recovery remains unused.

The dated capture measurements and fitted hypotheses below remain research
evidence. Earlier model-dependent comparisons describe the implementation at
capture time. Use the [model guide](../RECOIL_SPREAD_MODEL.md) and
[current audit](FROSTY_GLOBAL_CANDIDATES_2026-09-13.md) for current behavior.


Updated 12 September 2026. This is the active research handoff. Completed
analysis and implementation records are in [the archive](../archive/README.md).
The [full recording history](../archive/BF6_RECOIL_SPREAD_RECORDING_HISTORY_2026-09-11.md)
preserves the previous detailed handoff, field inventory, measurements, capture
paths, and superseded proposals. Current equations belong in the
[recoil/spread guide](../RECOIL_SPREAD_MODEL.md); other boundaries are in
[model limitations](../MODEL_LIMITATIONS.md).

## Current status after the 11 September cross-task review

This summary supersedes historical proposals and capture plans below. Checked
against the recording reports, recoil review tasks, duration audit, and merged
PR #25 (`50fd5eb`). Publication verification is handled by the release task.

| Topic | Completed | Still open |
|---|---|---|
| Recoil delivery/recovery | Timed delivery, simultaneous recovery, and reset-on-shot clock implemented | Native envelope, recovery equation, timer semantics, and camera versus physical aim |
| Smooth attachments | Ordinary 50 ms / 1.2; 17 mapped Bolt exceptions at 66.667 ms / 1.728; 63 base weapons checked at 25 ms | Exact modifier operations/composition; Bolt recording validation; PP-19 Flash Comp source mapping |
| Heavy-type spread | Frosty factors applied to Heavy, Heavy Extended, and Cryogenic; AK4D comparison complete | Second-weapon transfer check, firing while moving, and idle-state activation |
| VSSM hipfire | Matched standing screenshots support index 4; override removed; stored minima 1.804 / 2.255 | Independent angular/projectile calibration and hipfire-firing coverage; moving value follows the source row |
| VSSM aim transition | Eight no-shot transitions measured; approximately equal 170 px/s contraction with and without Folding Stock | Transition equation, active recovery branch, and HUD mapping |
| Spread state/distribution | Existing AK4D/VSSM no-fire movement controls available | First-shot/reset rules, firing/not-firing/idle transitions, other stances, and projectile distribution |

The recoil review tasks support the general continuous-recovery interpretation.
They do not independently confirm 25/50 ms timing, the exact multiplier operation,
or a peak-hold phase. Camera-fit timing offsets and coupled parameter choices
remain limits. Later implementation approval did not remove these limits.

Current references: [recoil validation](../archive/RECOIL_MODEL_VALIDATION_2026-09-11.md),
[duration exceptions and assumptions](../RECOIL_SPREAD_MODEL.md),
[AK4D analysis](../archive/AK4D_HEAVY_BARREL_RECORDING_ANALYSIS_2026-09-11.md), and
[VSSM analysis](../archive/VSSM_RECORDING_ANALYSIS_2026-09-11.md).

## Research without new recordings — 12 September 2026

These checks use existing recordings, screenshots, and the Frosty registry. Their
scripts and results are in ignored local `outputs/` directories named below.

**Impact screenshots** (`outputs/impact-comparison-2026-09-12/`). With sampled
spread, the model expects an 8.8% Lightened 15-round height reduction; recoil alone
gives 10.0%. The recording metric is a median of five groups. Its simulated 90%
range is 0.9–15.9%, and the observed 14.8% is at the 92nd percentile. The observed
10-round value, 1.0%, is at the 16th percentile. These screenshots do not show a
significant relative error. Group height cannot separate radius sampling rules.

**Absolute scale.** Standing hipfire arm separations for M4A1, AK4D, and M39 EMR
fit 35.55 px/degree + 16.7 px, with residuals of 0.21 px or less. If the stored
minimum is a half-angle, the focal length is 1019 px. A 103-degree horizontal FOV
at 2560 px gives 1018 px. With that scale, observed median impact heights are
4–10% above model means for 3–10 rounds, and 22% (Standard) and 14% (Lightened)
above at 15 rounds. The operator reported sway after about 400 ms; 15 rounds last
about 1 s. The cause is not established. Limits: hole centroids, merged holes,
screenshot camera position, and model means compared with five-group medians.
AK4D ADS indicator widths divided by model peaks give about 29.5–32.4 px/degree.
That is below the hipfire scale; ADS indicator geometry and sampled peaks are unverified.

The HUD fit is a conditional consistency check, not an independent projectile-
angle calibration. The derived absolute impact excess inherits that limitation.
The [Claude handoff review](CLAUDE_SESSION_HANDOFF_2026-09-12.md#9-codex-review-and-operator-damage-check)
also records the operator's current VSSM Range Pen check above 75 m: rounded
17 chest, 31 head, and 14 arm. Chest/head support the 17.13 Frosty tier; arm
damage conflicts with the current 0.91 limb multiplier. The
[raw material-grid follow-up](CLAUDE_SESSION_HANDOFF_2026-09-12.md#12-codex-raw-material-grid-trace-limb-values-found)
now resolves VSSM's source limb value to 0.84, with matching traces in two maps.
The subsequent merged hit-zone implementation now uses that 0.84 limb value.

**Frosty registry scan** (`outputs/frosty-recoil-field-scan-2026-09-12/`). It
covers 62 weapons named in `GRX_Weapons.xml`. BROD 3 (`BREN3`) has no named
registry entries there, so `decode_bren3.py` reads `GS_BREN3.xml` by learning leaf
positions from the named weapons. Leave-one-out checks on seven weapons recover
150–152 of 152 fields, with no wrong value accepted; all 152 BREN3 fields decode.
Site base recoil fields match the source in both aim states for all 63 weapons,
including BROD 3. BROD 3 dispersion values match the site and have no non-neutral
flags. All 248 named `MultiplierByOrder` arrays are empty. `FirstShotIncreaseMultiplier` is 1.0
everywhere. Non-neutral values: `VerticalRecoilIncrease` 0.6 on 16 non-automatic
weapons, all with `UsePolarRecoil` true; `MaxVerticalRecoil` 90 on three pistols.
`DistributionExponent` is 0.5 on almost every branch (0.67 for `DesertTechHTI`
zoomed moving). The site now samples `r = spread * u ** distExp`. The native
consumer is not established; the earlier uniform-radius model used exponent 1. Hip `IdleTime` is 1.8 s
on six bolt rifles and 1.2 s on `590A1` and `DP12`; ADS `IdleTime` is 0.4 s everywhere.

**Spread integration.** Spread recovery now uses 1 ms steps. The 60 Hz step
differed from a 0.1 ms reference by up to 3.3%; 1 ms stays within 0.2%.

**Smooth operand variants** (`outputs/smooth-variants-2026-09-12/`). Replaying
the 10 September camera tracks, Lightened-only RMS errors (px) are:

| Variant | M4A1 | TR7 | AK4D |
|---|---:|---:|---:|
| Current: 50 ms and recovery × 1.2 | 1.93 | 2.96 | 2.47 |
| Factor × 1.2 only, 25 ms | 1.77 | 2.89 | 2.47 |
| 50 ms only | 1.59 | 2.86 | 2.57 |
| 50 ms and offset × 1.2 | 1.59 | 2.86 | 2.57 |
| 50 ms and time scale 1.2 | 2.47 | 3.82 | 2.54 |
| 50 ms and recovery × 1.1 | 1.72 | 2.85 | 2.50 |

No variant is best for all three weapons. Time scaling is clearly worse for M4A1
and TR7. Offset scaling is not visible in these tracks. Keep the current
source-based treatment. These recordings informed earlier model work, so they are
not independent validation.

## Standing recording conditions — operator confirmed 11 September 2026

Use these conditions for all recoil and spread recording sets covered by this
handoff, including Heavy-type barrels and VSSM, unless the operator explicitly
reports a change:

- Game version: **1.4.2.5**.
- In-game FOV: **103**.
- Optic: **Mini Flex**.
- Wall distance: **20 m**.

Carry these values into each analysis without requesting them again. The operator
only needs to report exceptions. This confirmation supersedes earlier notes that
only TR7 had a confirmed wall distance or that M4A1/AK4D distance was unknown.
It does not retroactively calibrate the existing pixel-based measurements or
establish the HUD-to-angle conversion.

Exception confirmed for `reference-data/Recordings/09112026/VSSM/`: these clips
use the game's built-in firing range because the previous range does not yet
offer VSSM. The wall distance is **not exactly 20 m and is unspecified**. The
operator confirms Mini Flex, the 20-point **200MM ASM** barrel, a 20-round
magazine, and 10-point **Tungsten Match / Range Penetration** ammo. Version
1.4.2.5 and FOV 103 retain the standing defaults. Do not apply a 20 m impact
calibration to this VSSM set or treat it as a factory-barrel comparison.

## Remaining follow-up from completed recording sets

The [12 September reuse analysis](RECORDING_REUSE_ANALYSIS_2026-09-12.md)
uses the existing M4A1, AK4D, TR7, and VSSM recordings before requesting more.
It supports retaining the current simulator parameters. Key capture-plan
updates:

- Existing isolated/semi-auto/rapid footage has no usable red pairs in the
  reviewed shot windows. Test indicator visibility before repeating a pause
  series; missing marks are not zero spread.
- M4A1 burst peaks are nearly equal between suppressors. Its burst traces
  support a post-fire recovery change, but not an exact switch timer or a
  different first-shot multiplier.
- AK4D hipfire returns to its standing HUD width near 0.21 s, before its 0.6 s
  hipfire idle time. ADS idle time is 0.4 s. An idle test needs measurable
  excess beyond the applicable boundary; more identical bursts will not help.
- The VSSM no-shot transitions favor a common nearly constant visible rate.
  No-fire movement paths are also measured, including fast VSSM stop exceptions.
  Keep those results separate from a native spread equation.
- For physical aim, retain the isolated camera tracks and first test whether
  individual impacts in a paired-shot pilot can be assigned to their shots.
  Fully reset isolated shots alone do not sample aim for a following projectile.

Use the report's minimal capture order below the completed-set recommendations.
The scenarios that follow describe the open questions; they do not require
repeating existing controls or recording a full series before a visibility check.

- **VSSM:** Do not repeat the accepted standing index comparison or no-fire
  controls. Investigate hipfire firing, the no-shot hipfire-to-ADS recovery path,
  and independent angular/projectile calibration. Both stock settings contracted
  near 170 px/s with stable background scale; directly applying their different
  not-firing/idle offsets does not explain the equal rates. Stock recovery fits
  the late camera tail better, but not the full camera response.
- **Heavy:** AK4D is complete. If transfer validation is needed, select a second
  automatic weapon with a different rate of fire. Compare Basic and Heavy with
  identical other attachments: settled ADS, isolated shots, short and sustained
  bursts, full post-fire recovery, moving ADS fire, and hipfire control. A later
  Heavy Extended/Cryogenic capture can test variant transfer. Do not repeat the
  existing AK4D set. Missing red indicators are unavailable observations, not zero.
- **Recoil:** No additional footage is required for the accepted implementation.
  For a specific unresolved question, reuse the current M4A1 Standard/Lightened
  sets before requesting more. Any new comparison must separate physical aim,
  camera, and HUD motion, preserve shot-onset uncertainty, and vary timing and
  recovery parameters independently. An apparent peak plateau is not evidence
  for an explicit hold phase.

## Open source and attachment review work

These items extend beyond the recording program. Track current behavior in
[model limitations](../MODEL_LIMITATIONS.md) and the
[attachment audit](../../reference-data/attachment-audit/README.md).
The [dated site review](../archive/FROSTY_SITE_REVIEW_2026-09-07.md) is evidence,
not a current defect list: several proposed changes have since shipped.

Remaining areas include PP-19 Flash Comp modifier mapping; light/combined-device
activation and recovery composition; deferred bolt-action muzzle recoil tiers;
VSSM suppressed-barrel ADS baseline composition; general reload/animation timing;
and pending attachment captures or conflicting capture identities. Recheck dated
candidate rows against current source/configuration before promoting a change.
Preserve the separate uncommitted attachment-audit work and its evidence.

## Pending scenario 3: first-shot spread and reset rules

Purpose: identify how the current game applies deviation after the first shot
and when the first-shot state resets. Frosty `1.4.2.5` contains named
`FirstShotIncreaseMultiplier` values of `1.0`, while EA stated that bullet
deviation after the first shot was increased. The change may therefore be in
`IncreasePerShot`, state behavior, or another modifier.

Use one automatic rifle with a clear spread indicator. A second SMG or LMG is
desirable after the first test.

While stationary ADS, record:

1. Five isolated shots separated by at least two seconds.
2. Shot pairs separated by approximately 50, 100, 200, 400, 800, and 1500 ms.
3. Short three-round sequences followed by the same pause series.
4. A sustained sequence, a short pause near 100 ms, and another sequence.
5. The equivalent rapid semi-auto sequence if the weapon supports it.

Keep audio and muzzle flash so the analysis can recover actual timings. The
requested delay does not need to be exact.

This set must test whether shot 1 uses the minimum, whether a special increase is
applied after it, and whether the state resets on trigger release, after
`IdleTime`, after complete spread recovery, or on a fire-mode transition.

## Pending scenario 4: firing, not-firing, and idle spread recovery

Purpose: identify transitions among Frosty's firing recovery, not-firing
recovery, ordinary decrease, `IdleTime`, and idle recovery fields. This scenario
can be combined with the first-shot recording.

Using the same weapon and loadout, expand the spread indicator with a repeatable
burst. Release the trigger for approximately:

- 100 ms;
- 250 ms;
- 400 ms;
- 600 ms;
- 1000 ms;
- complete recovery.

Fire again after each pause. Repeat the pause series while moving ADS, then make
one stationary hipfire series. Retain the full indicator path through each pause.

## Pending scenario 5: movement and stance spread branches

The AK4D Basic/Heavy strafe-only ADS and hipfire controls are now available in
the scenario 2 analysis. Both barrels reach the same visible movement plateaus
(about 12 px ADS and 165 px hipfire). Reuse those recordings. Crouch, prone,
sprint, jumping, landing, and movement combined with firing remain untested by
this new set.

Purpose: determine whether the analyzer incorrectly reduces distinct Frosty
movement, jumping, sprinting, crouching, and prone branches to stationary versus
moving bounds and shared ADS/hip dynamics.

Use one automatic rifle without spread-altering attachments. With the spread
indicator enabled and without firing, hold each state long enough to settle:

1. Standing still.
2. Crouching still.
3. Prone still.
4. Normal walking.
5. Crouch walking.
6. Sprinting.
7. Jumping.
8. Landing and recovering.
9. Sprint-to-ADS transition.
10. Moving-to-stopped transition.

Repeat in ADS and hipfire where permitted. Then record a medium firing sequence
in standing ADS, moving ADS, standing hipfire, and moving hipfire.

## Pending scenario 6: projectile distribution inside the spread circle

Purpose: test the source-exponent sampler across further weapons and ADS states.
Compare measured radial distributions with the current `DistributionExponent` model.

Use a semi-automatic weapon that produces visible individual bullet holes and
has no spread-altering attachment. At the standing 20 m wall distance:

1. Allow recoil and spread to reset completely.
2. Place the reticle on the same marked center.
3. Fire one shot.
4. Repeat at least 100 times; 200 shots are preferable.
5. Keep the spread indicator and reticle visible at every firing instant.

The reticle center at the exact shot frame must remain measurable. If manual
recentering dominates the result, the recording cannot distinguish projectile
distribution from aim error.

## Pending scenario 7: physical aim versus visual recoil

Purpose: determine whether `RecoilDuration` changes physical aim used by later
projectiles, camera/reticle animation, or both.

Use one weapon with paired Standard and Lightened Suppressors. At the standing
20 m wall distance, record isolated shots without compensation so that both reticle motion
and each bullet impact remain visible. Retain full recovery. A stable center
reference must be visible.

Compare the time-domain reticle motion with impact displacement. Do not assume
the spread indicator, camera rotation, weapon animation, and projectile direction
represent the same quantity.

## Next-session order and evidence rules

1. Define the specific unresolved question; use existing recordings first.
2. Combine first-shot/reset and firing/not-firing/idle tests where possible.
3. Test moving fire and unmeasured stance branches.
4. Use a second weapon for Heavy transfer, or VSSM hipfire/aim-transition tests,
   according to the selected question.
5. Separate physical aim from camera recoil, then sample projectile distribution.

Keep source recordings unchanged. Retain hashes, actual shot timings, failed or
missing detections, exclusions, loadouts, and reproducible local outputs. Camera
and HUD pixels are not projectile angles. Raw Frosty operands do not establish
activation, native equations, or modifier composition. Require a clear question
and the smallest useful capture before asking for more footage.
