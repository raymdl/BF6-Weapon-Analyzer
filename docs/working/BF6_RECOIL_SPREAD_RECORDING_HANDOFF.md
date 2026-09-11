# Active Frosty recoil and spread investigations

Updated 11 September 2026. This is the active research handoff. Completed
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

Purpose: test the analyzer's current uniform-radius impact sampling against
uniform-area sampling, Frosty's `DistributionExponent`, or another distribution.

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
