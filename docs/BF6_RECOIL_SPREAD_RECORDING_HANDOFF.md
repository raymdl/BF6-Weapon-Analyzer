# BF6 recoil and spread recording handoff

Status recorded 11 September 2026. This document tracks the current in-game
capture program for unresolved recoil and spread mechanics. Update the status,
findings, and follow-up requirements here as analysis proceeds.

## Implementation update: 11 September 2026

The operator approved publication of timed delivery with simultaneous recovery,
the 0.05-second Smooth duration, and the 1.2 recovery factor on 11 September 2026.
The operator authorized a best-supported approximation using Frosty inputs, and
clarified that the old 1.1 Smooth factor was only an early visual estimate.
The simulator now delivers recoil over the source duration with concurrent
continuous recovery and resets the recovery clock on each shot. Smooth uses an
estimated 0.05-second duration override and 1.2 recovery-factor multiplier in
both aim states. This supersedes the older current-model descriptions and
recommendations to retain 1.1 below; the recording results remain historical
evidence. No additional captures are required for this implementation.

See [implementation validation and field review](RECOIL_MODEL_VALIDATION_2026-09-11.md)
for the full unused-input assessment, comparison with observations, exact model
assumptions, and remaining error. The new model is closer on the M4A1 15-round
muzzle difference, but does not reproduce the native engine or camera response.

## Objective and conversation context

The operator wants the analyzer's recoil and spread calculations to reproduce
current in-game behavior, rather than only display values copied from Frosty or
another statistics site. The immediate questions are:

- how the analyzer currently calculates recoil and spread versus how BF6 applies
  them over time;
- which Frosty fields the analyzer has not accounted for;
- which source fields are configuration inputs versus active multiplayer
  mechanics;
- what in-game evidence is required to replace estimates with defensible
  formulas.

The analyzer currently has strong coverage of named Frosty weapon coefficients,
spread bounds, attachment tiers, and source-ordered spread tables. That does not
establish the native update equations, modifier activation and composition,
camera-versus-projectile behavior, or time-domain state transitions.

### Current recoil model and unresolved questions

The analyzer calculates effective recoil amount and directional variation as:

```text
amount = RecoilAmount x RecoilAmountMultiplier ^ RecoilAmountMultiplierExponent
variation = DirectionVariation x DirectionVariationMultiplier ^ exponent
```

For each shot, `sim/core.js` delivers the sampled polar recoil vector uniformly
over the selected duration, while recovering horizontal and vertical position
toward zero. Recovery continues after delivery. Its assumed recovery rate is:

```text
recovery =
  (abs(axis)^RecoilDecreaseExponent + RecoilDecreaseOffset)
  x RecoilDecreaseFactor
  x elapsedTime^RecoilDecreaseTimeExponent
```

The position persists across shots, but `elapsedTime` restarts for each
inter-shot interval. Sym's public BF6 mechanics explanation states that recoil
decrease is constantly active, including while an automatic weapon is firing.
That supports continuous recovery of the aim state, but it does not say whether
Frostbite resets an internal time-exponent clock per shot, maintains one clock
through the burst, or tracks the age of each recoil impulse.

Frosty also stores `RecoilDuration`, decrease norm, shooting decrease scale,
fade fields, recoil-pattern fields, axis decrease multipliers, first-shot recoil
fields, and polar/Cartesian configuration. The analyzer stores some of these but
does not use them in the generated path. `RecoilDuration` is now consumed, with
overlapping impulses retained and delivery steps no longer than 1 ms. Linear
recovery uses the exact continuous solution; the former 60 Hz bias is removed.

### Frosty recoil inputs reviewed for the current calculation

The following fields can affect a complete recoil implementation. They are not
all proven active in the current multiplayer configuration. The approved model
uses duration and Smooth operands as explicit approximations. Further native
claims require the applicable selection rule and arithmetic. Preserve
separate ADS (`Zoomed`) and hipfire (`Unzoomed`) values.

#### High-priority time and recovery fields

| Frosty field | Current analyzer state | Possible role and required incorporation |
|---|---|---|
| `RecoilDuration` | Consumed by `genRecoilPts()` | Uniform delivery with simultaneous recovery; overlapping impulses retain their full input. Native envelope remains unresolved. |
| `RecoilDecreaseNorm` | Stored as `decNorm`; ignored | May normalize displacement before the exponent or scale the recovery term. Do not fold it into `RecoilDecreaseFactor` until videos or engine evidence distinguish `abs(axis / norm)^exp`, `(abs(axis) / norm)^exp`, or another operation. |
| `ShootingRecoilDecreaseScale` | Stored as `shootingDecScale`; ignored | May scale recovery while the weapon is in its firing state. This could be the missing distinction between recovery during firing and recovery after trigger release. The firing, burst-pause, and post-release curves must be compared before use. |
| `HorizontalRecoilDecreaseMultiplier` | Not used | May scale centering on the horizontal/yaw axis. Apply only if the polar recoil output is converted to axes before recovery and evidence shows that this field remains active with `UsePolarRecoil = true`. |
| `VerticalRecoilDecreaseMultiplier` | Not used | May scale centering on the vertical/pitch axis. It could create different horizontal and vertical return rates. Fit the two tracked axes separately before using it. |

The analyzer already consumes `RecoilDecreaseFactor`,
`RecoilDecreaseExponent`, `RecoilDecreaseOffset`, and
`RecoilDecreaseTimeExponent`, but their native equation and state lifetime are
not confirmed. Adding the fields above to the current assumed equation would
not by itself make that equation native.

#### Recoil-delivery envelope and termination fields

| Frosty field | Current analyzer state | Possible role and required incorporation |
|---|---|---|
| `RecoilFadeOutStart` | Not used | May identify when a recoil impulse begins to taper or when a recoil state begins releasing. Values of `-1` may disable this feature, but confirm that sentinel before branching. |
| `RecoilFadeOutEnd` | Not used | May identify the end of the taper or release window. Interpret with duration and fade-start rather than as a separate recoil amount. |
| `RecoilFadeOutFactor` | Not used | May shape or scale the fade portion of the delivery envelope. Candidate envelope models must be compared with frame-level rise curves. |
| `RecoilPatternSeed` | Not used; analyzer uses its own deterministic weapon/loadout seed | May seed a native recoil pattern or deterministic component. Do not replace the analyzer RNG until nonzero seed behavior and its consumer are demonstrated. |
| `RecoilPatternMultiplierPitch` | Not used | May add a authored pitch-pattern component to the sampled polar recoil. Zero values have no effect; retain the branch for weapons or states with nonzero values after mapping. |
| `RecoilPatternMultiplierYaw` | Not used | May add a authored yaw-pattern component. Treat it separately from random direction variation. |

#### First-shot, limits, and non-polar fields

| Frosty field | Current analyzer state | Possible role and required incorporation |
|---|---|---|
| `FirstShotMultiplierVerticalRecoil` | Not used | A legacy or fallback first-shot vertical multiplier. Sym states that BF6 does not use traditional first-shot recoil multipliers, and reviewed values such as EF88 are `1`. Keep inactive unless a current selected state has a non-unit value and in-game evidence shows an effect. Do not confuse it with spread's `FirstShotIncreaseMultiplier`. |
| `MaxVerticalRecoil` | Not used | May cap accumulated pitch recoil, an authored pattern, or a legacy Cartesian path. Test sustained displacement before treating it as a hard clamp. |
| `VerticalRecoilMin` | Not used | Candidate Cartesian vertical-kick lower bound. It may be inactive when polar recoil is enabled. |
| `VerticalRecoilMax` | Not used | Candidate Cartesian vertical-kick upper bound. It may be inactive when polar recoil is enabled. |
| `VerticalRecoilIncrease` | Not used | May change a Cartesian vertical range over successive shots. Do not add it to the polar magnitude without consumer evidence. |
| `HorizontalRecoilLeft` | Not used | Candidate Cartesian horizontal range bound. It may be a fallback when polar recoil is disabled. |
| `HorizontalRecoilRight` | Not used | Candidate Cartesian horizontal range bound. Preserve its sign and source units; do not reinterpret it as polar direction variation. |
| `UsePolarRecoil` | The analyzer always uses a polar path; it does not branch on the field | Use this as the explicit selector. Continue with amount/direction/variation when true. A false state requires a separately validated Cartesian implementation using the horizontal and vertical fields above. |

#### Smooth-recoil attachment modifier inputs

The retained Frosty `1.4.2.5` evidence for
`GRM_SmoothRecoil_P10` and `GRM_SmoothRecoil_Compensator_P10` identifies two
candidate modifier targets for both reviewed branches:

```text
Field_5a02dd65 -> RecoilDuration
candidate scalar: 0.05

Field_28df1cde -> RecoilDecreaseFactor
candidate scalar: 1.2
```

The raw modifier records also contain operation and enable fields. Their current
decode suggests that the duration record and factor record use different
operation forms, but target identity does not establish whether `0.05` is an
override, addition, or other operation, nor whether `1.2` is a multiplier. The
selector graph connects the shared Smooth recoil modifier to Lightened
Suppressor, compensator, flash-compensator, and some hybrid suppressor branches,
but branch presence does not prove the equipped runtime selection for every
weapon.

The completed recording analysis tested source-supported candidates. These
native-mechanic questions remain open after approval of the approximation:

- Does Lightened change a base `0.025 s` duration to `0.050 s`?
- Does the recoil return fit `RecoilDecreaseFactor x 1.2`, another operation, or
  a different target?
- Are the same effects present in ADS and hipfire?
- Do both changes activate together on each selected muzzle?
- Do multiple recovery modifiers stack by addition, multiplication, override,
  or priority?

The approved model replaces the former 1.1 estimate with 1.2 in ADS and hip,
plus a 0.05-second duration override. Comparisons remain unable to identify the
exact engine operations. Additional captures are not a release requirement.

#### Other attachment-driven recoil values to preserve

Attachment modifiers can also change the inputs already used by the analyzer:

- recoil amount multiplier exponent;
- recoil direction-variation multiplier exponent;
- recoil duration;
- recoil decrease factor and time exponent through a direct override;
- ADS and hipfire branches independently.

For example, the VSSM Folding Stock has source-backed overrides of
`RecoilDecreaseFactor = 76` and `RecoilDecreaseTimeExponent = 1.24`. Those values
are currently inserted into the analyzer's assumed recovery equation. Their
presence is established, but their time-domain result is not native-formula
proof. Receiver evidence also contains recoil-duration additions such as
`-0.0006 s`; these now affect delivery duration after the muzzle override. That
composition order is an explicit model assumption.

Before promoting any attachment calculation, trace the equipped attachment to
its weapon selector and modifier target, decode its operation, compare it with
the default/factory composition, and establish stacking order. Identical raw
operands or descriptive filenames are insufficient.

The Lightened Suppressor is central to this investigation. Earlier recordings
from an older game version suggested that a Standard Suppressor delivered recoil
over approximately 25 ms, while a Lightened Suppressor delivered it over
approximately 50 ms and returned more quickly toward a lower pre-next-shot
residual. The older full-auto TR7 result suggested smoother temporal motion but
no clear reduction in the absolute sustained maximum. Those numbers are not
current evidence because weapon recoil and spread values changed. The new
`1.4.2.5` M4A1/TR7/AK4D recordings must be processed independently.

The approved catalog applies both Smooth operands using the documented model
operations. Timed delivery and recovery share one timeline, and bullet positions
are sampled before their own recoil. The uniform delivery envelope and the exact
1.2 operation are not established by camera measurements alone. See
[current validation](RECOIL_MODEL_VALIDATION_2026-09-11.md) for the measured
improvement on today's M4A1 15-round comparison and mixed agreement with the
earlier M4A1/TR7/AK4D recordings.

### Current spread model and unresolved questions

The analyzer selects an ADS/hip and stationary/moving spread floor, samples the
shot at the current spread, adds `IncreasePerShot`, applies firing or not-firing
recovery over the next interval, and clamps the state to the selected minimum and
maximum. Its approximate recovery step is:

```text
spread -= dt x
  (DecreaseCoefficient x excessSpread^DecreaseExponent + DecreaseOffset)
```

It currently samples impact radius uniformly from zero to the spread radius.
This is center-weighted over area and does not use Frosty's stored
`DistributionExponent`.

Important unused or unresolved spread behavior includes:

- `FirstShotIncreaseMultiplier` and its reset condition;
- `IdleTime` and idle recovery;
- the relationship among ordinary, firing, not-firing, and idle decrease fields;
- distinct moving, jumping, sprinting, crouching, and prone dynamics;
- native projectile distribution inside the spread envelope;
- physical projectile dispersion versus reticle, camera, and weapon animation.

EA stated in its 25 June 2026 gunplay discussion that bullet deviation after the
first shot was increased to reward controlled bursts and tap fire. The current
analyzer already samples shot 1 at the floor and applies `IncreasePerShot`
afterward, so shot 2 receives the first increase. However, all 248 named
`FirstShotIncreaseMultiplier` entries in the retained Frosty `1.4.2.5` registry
extraction are `1.0`. The in-game tests must determine whether the change is in
`IncreasePerShot`, another modifier, or a firing/idle state rule. They must also
determine when the first-shot condition resets.

Moving ADS floors were recently changed locally to begin from each weapon's
stored source-supported minimum instead of a global tier. Attachment shifts
still operate through the source-ordered table. The change is complete locally
but is not part of this recording analysis and must not be modified here.

The VSSM retains a separate hipfire conflict. Its analyzer override selects hip
spread table index 2, producing `3.352 / 4.19` degrees for stationary/moving
hipfire. The recorded Frosty base selector is index 4, producing
`1.804 / 2.255` degrees. The table values themselves are known; the unresolved
question is which base row the equipped in-game configuration selects and
whether a factory attachment or fire mode explains the difference.

Heavy, Heavy Extended, and Cryogenic barrel spread recovery remains fitted
rather than decoded as a confirmed native operation. The current ADS-only model
uses `0.667` per-shot growth, `1.71` firing-coefficient, and `0.667` firing-offset
multipliers. A sustained spread circle alone cannot identify all three values.
The requested single-shot, short-burst, sustained-fire, and post-release
sequences are designed to separate growth from the different recovery states.

### Decision standard

Do not promote a formula because it looks plausible or because one aggregate
value matches. A supported conclusion must identify the loadout and state,
measure individual events, show tracking diagnostics, account for real frame and
shot timing, compare competing models, and explain what the recording cannot
distinguish. Retain uncertain engine semantics as unresolved.

## Evidence boundary

- Recordings are from BF6 game version `1.4.2.5` unless a later entry says
  otherwise.
- Current capture settings are 2560x1440, 103 in-game FOV, and a nominal 240 FPS
  recording rate. Gameplay renders at approximately 200 FPS, so analysis must
  identify repeated or held capture frames and use actual presentation and shot
  timing where possible.
- The TR7 wall distance is confirmed as 20 m. Do not assume the M4A1 or AK4D
  wall distance without separate evidence.
- The red `(` and `)` marks immediately to the left and right of the aiming
  reticle are the in-game spread indicator. They are not decorative reticle
  elements. Track their left/right position or separation independently from
  the reticle-center/camera path. Do not mistake the lower-left minimap or the
  white interaction prompt for spread evidence.
- Burst lengths are controlled by hand. Derive actual shot counts and timestamps
  from the recordings instead of rejecting a take for an inexact count.
- The videos are local research evidence under `reference-data/Recordings/`.
  That directory is Git-ignored because the source files are large. Do not add,
  move, rename, transcode, delete, or stage them as part of analysis.
- Separate observed in-game behavior, fitted models, Frosty configuration
  values, and hypotheses. A configuration field or fitted curve is not by itself
  proof of native Frostbite arithmetic.

## Standard capture requirements

Use these requirements for each future recording set:

1. Record at 120 FPS minimum; use 240 FPS when practical.
2. Keep resolution, aspect ratio, FOV, ADS-FOV setting, platform, and input
   device unchanged within a comparison.
3. Enable the in-game spread visual indicator for spread tests.
4. Retain the HUD, reticle, muzzle flash, audio, and performance overlay.
5. Use an undisturbed range and a flat wall or target with stable visual
   references.
6. Do not intentionally compensate for recoil. Keep the mouse or stick still
   except for the input required to fire or enter the requested movement state.
7. At the start of each take, show or retain the overlay for the weapon,
   ammunition, fire mode, and every attachment.
8. Hold the starting state for at least two seconds before firing. Leave at least
   two seconds after the sequence when complete recovery is required.
9. Repeat each firing sequence three times where practical. Exact burst length
   is not required.
10. Preserve the original video even when a tracking CSV or derivative clip is
    created.

When the red spread parentheses are visible, preserve enough contrast around
both marks to measure:

- left and right distance from the reticle center;
- total parenthesis separation;
- the value immediately before each shot;
- the maximum after each shot or burst;
- firing, not-firing, and idle recovery back toward the floor.

Track both sides because camera/recoil movement can translate the center while
spread changes the relative separation. A screen-space separation is direct
observed evidence. Conversion from pixels to degrees additionally requires the
correct interpretation of the game's FOV setting and projection.

Recommended filename:

```text
GameBuild_Weapon_Attachment_FireMode_State_FPS_Sequence.mp4
```

## Completed: recoil duration and continuous recovery

The initial current-version comparison set is complete under:

- `reference-data/Recordings/09102026/M4A1/`
- `reference-data/Recordings/09102026/TR7/`
- `reference-data/Recordings/09102026/AK4D/`

Each weapon has paired Standard Suppressor and Lightened Suppressor recordings
for isolated single shots, rapid single fire, short bursts, medium bursts, and
long bursts. The AK4D long bursts are intentionally approximately 15 rounds to
avoid its 20-round magazine entering a reload animation.

This set is intended to measure:

- current Standard and Lightened recoil-rise duration;
- recoil-delivery envelope shape;
- recovery during the recoil rise;
- post-peak return time;
- local peak-to-trough amplitude;
- displacement remaining before the next shot;
- absolute sustained displacement from the pre-burst origin;
- impulse overlap and return-to-zero behavior across the fast M4A1, medium TR7,
  and slow AK4D firing intervals;
- whether the former 1.1 estimate or source-operand 1.2 model better describes
  the measured Lightened effect;
- whether evidence favors per-interval recovery-time reset, one persistent
  recovery clock, or per-impulse ages with shared continuous centering.

The analysis task must write a concise findings update below when this set is
complete. Historical TR7 results from an earlier game version are methodology
only and must not supply current numeric conclusions.

### Historical recoil-analysis findings before implementation approval

The active analysis uses the new M4A1, TR7, and AK4D videos in the recordings
folder. The operator clarified that these TR7 videos are current and in scope.
Only the TR7 analysis in the older ChatGPT task is historical background. This
clarification supersedes the temporary exclusion of all TR7 recordings.

A review corrected the earlier use of displacement per frame as velocity.
The current comparison uses background displacement over fixed 12, 20, and
32 ms windows, with source presentation timestamps. Units are pixels per second
at the 640 x 360 tracking resolution, not angular recoil or projectile movement.
Ammo-counter crops before and after all 30 isolated events confirm one round
used per event. These checks bracket each audio event by 120 ms; they do not
establish exact engine shot onset. Shifting the peak-search window by plus or
minus 20 ms leaves all 20 ms peak-rate measurements unchanged.

With all five shots per loadout included, Lightened has lower mean peak rates:

| Weapon | 12 ms window | 20 ms window | 32 ms window |
| --- | ---: | ---: | ---: |
| AK4D | 9.5 percent | 8.8 percent | 4.1 percent |
| M4A1 | 10.9 percent | 8.1 percent | 8.2 percent |
| TR7 | 10.9 percent | 5.0 percent | 7.8 percent |

The earlier duration-based quality flag excludes M4A1 Lightened shot 1.
Keeping that exclusion changes the M4A1 reductions to 12.6, 8.9, and 8.5 percent.
The direction survives both choices, but this is a descriptive comparison from
one isolated-shot recording per loadout. Shots within a recording are not
independent recording-level replicates. The earlier TR7 permutation-test claim
is withdrawn. Random recoil, capture conditions, and unmeasured camera effects
can affect these differences.

The earlier pulse widths depend on a per-frame threshold. They are not engine
`RecoilDuration` measurements and cannot reject a duration override or an
instantaneous engine impulse filtered through the camera response. The earlier
M4A1 numerical fit to `1.2` is also withdrawn: it used uncalibrated starting
values and a coarse simulation step. Camera return crossings, especially those
with rebound, cannot identify the internal recovery state. The later ammo review
confirms all 54 short/medium/long burst counts and recovers three bursts missed
by audio grouping. Each M4A1/TR7 long burst has one extra audio candidate; AK4D
long counts match. Exact shot timing and tail placement remain provisional.

Thus the raw Smooth duration operand `0.05` and decrease-factor operand `1.2`
remain unresolved configuration candidates. These recordings do not identify
override versus addition, distinguish `1.1` from `1.2`, or select a per-shot,
persistent, or per-impulse recovery clock. The recommendation at this stage was
to leave production unchanged; the later approved approximation supersedes it.

HUD separation is measured independently from background movement. Source-frame
review of 51 ADS samples shows red, mainly vertical parentheses; two hipfire
samples show magenta horizontal arms and the lower arm of the plus. Colour
checks support these identities independently of separation. This sample review
does not validate every frame in the earlier separation-only classifier.
The observed long-burst maxima remain close: median maxima are 47.1/46.7 px
Lightened/Standard for AK4D, 41.2/41.1 for M4A1, and 58.5/58.4 for TR7.
These are full-resolution HUD pixels. They do not prove spread equivalence,
a degree conversion, or projectile distribution. Missing marks must not be
treated as zero spread or measured recovery.

The corrected report and evidence are in ignored
`outputs/recoil-analysis-1.4.2.5/`: `README.md`,
`time-normalization-review.json`, six `*-ammo-review.png` sheets,
`visual-evidence-review.json`, and `colour-shape-review.png`.
Earlier `validated-*` and candidate-comparison outputs remain historical
diagnostics; their filenames do not establish validation.

The completed offline experiment covers the full recoil/spread evidence boundary,
not only duration and recovery. The source audit retains 558 named GS fields,
including 75 camera fields, plus raw recoil blocks and Smooth modifier records.
Zoomed/unzoomed recoil bindings are resolved for all three weapons. Raw fields
without named mappings remain unresolved; the audit does not prove equipped
modifier activation or operation semantics.

The final two-axis simulation tests random polar directions, instant/linear/
eased/front-loaded delivery, duration-only/factor-only/combined Lightened changes,
three recovery clocks, and separate camera response. Isolated shots 1-3 calibrate
shared scale/lag; long bursts 1-2 select candidates. Long burst 3 and separate
short/medium/rapid recordings evaluate fixed models. Rapid ammo timelines confirm
five rounds per take, with approximately 40 ms event brackets.

Reset-on-shot recovery is the leading clock within the tested equation. No one
duration/recovery operation is supported consistently across all three weapons.
The best long-burst candidates have held-out two-axis errors of 2.35, 3.47, and
3.83 tracking pixels for M4A1, TR7, and AK4D. Important shape and amplitude errors
remain. Only 43%, 48%, and 4% of evaluation coordinates fall within their simulated
pointwise 5-95% ranges. These are not calibrated confidence intervals.

A new red-hue/vertical-shape HUD pass replaces separation-only classification
for the burst simulation. Shared source spread inputs reproduce much of the
Standard/Lightened HUD growth, but only one of 18 long bursts has accepted marks
after the inferred last-shot-plus-one-interval boundary. Idle recovery,
projectile distribution, and controlled movement/stance transitions remain
unidentified. HUD pixels must not be promoted to angular spread values.

Halving the selected research timestep from 1 ms to 0.5 ms changes traces by less
than 0.4% relative RMS. A separate direct check finds that the current 60 Hz
`applyRecoilDecay` over-recovers relative to the exact solution of its own assumed
continuous equation. Improving this integration is a supported numerical
recommendation, not proof of native game mechanics. No production change was made.

The complete report, overlays, errors, source routes, reproduction steps, and
remaining-mechanic table are in ignored
`outputs/recoil-analysis-1.4.2.5/FINAL_REPORT.md`. It supersedes the earlier
interim simulation and burst-count conclusions. Its instruction to retain the old
Smooth estimate is superseded by the approved model described above.

### 11 September 2026 follow-up recordings — findings before implementation approval

New source folder: `reference-data/Recordings/09112026/M4A1/`.
The prior 30-video set is now under `reference-data/Recordings/09102026/`.
Old machine-readable inventories retain historical paths; replace the old
`Recordings/<weapon>/` prefix with `Recordings/09102026/<weapon>/` when locating
those unchanged sources. Do not rerun the old recursive pipeline across both dates.

The new set contains 20 videos and eight burst-pattern screenshots, with Standard
and Lightened Suppressors. Each loadout has ten isolated shots, five repetitions
of each 3-, 5-, 10-, and 15-round burst, and one five-shot sequence at each named
100, 150, 250, 500, and 1000 ms interval. The operator confirms that Standard Suppressor and No Muzzle are equivalent
for recoil/spread. Standard is the control; separate No Muzzle recordings are
not needed.
The repeated bursts within one file are not independent recording-level repeats.
Use measured shot intervals, not filename values: initial ammo review shows that
semi-auto intervals are approximately 100-120 ms longer than the labels.

Operator-confirmed conditions: same game build (typed `1.4.25`, referring to the
prior `1.4.2.5` build), 103 FOV, Mini Flex optic, standing, no other optional
non-muzzle attachments, no recoil compensation, and no mouse motion during
firing. The overlay retains FMJ, 15-inch Commando, and 30-round magazine defaults.
The ADS-FOV setting was not separately supplied. The operator reports sway and
suggests it resumes about 400 ms after firing; this is a hypothesis, not an
established engine delay. Compare post-shot motion with the pre-shot baseline.

The operator suggests the red parentheses only appear above a minimum spread.
Absent marks must remain missing/censored observations, not zero spread.
The eight screenshots show final burst impact patterns. Keep their measurements
separate from camera traces and HUD separation. Overlap, perspective, and missing
shot order prevent direct recovery of individual projectile dispersion.

The later discussion in `codex://threads/01a09090-5a8a-7130-89f0-68a795b6506a`
supports 25 ms Standard / 50 ms Lightened delivery with concurrent recovery as
the leading interpretation. The supplied discussion is qualitative evidence;
it does not decode the exact `1.2` operation or recovery clock. A separate peak
hold and 75 ms delivery should not be promoted from old camera fits.

Analysis complete. The local report and chart are
`outputs/recoil-analysis-2026-09-11/REPORT.md` and `findings-overview.png` in the
same folder. These are ignored research artifacts, not published documentation
assets. The [validation report](RECOIL_MODEL_VALIDATION_2026-09-11.md) contains
the maintained results and model decision.

- All 400 HUD decrements are accounted for: 20 isolated shots, 330 burst rounds,
  and 50 semi-auto rounds. The 40 bursts have the requested exact counts.
- Isolated median camera peaks are nearly equal (4.29/4.26 tracking pixels,
  Standard/Lightened). Lightened's mean peak rise rate is 19.7% lower with a
  20 ms window; its median camera peak occurs about 29 ms later. This supports
  slower delivery but does not measure native impulse duration directly.
- Median 15-round camera peaks are 30.73/26.19 tracking pixels, a 14.8% reduction.
  Independently, screenshot impact-group height normalized to board height is
  about 15% lower with Lightened. That screenshot result survives brightness
  threshold changes. Smaller-burst screenshot differences remain unresolved.
- Reset remains the leading tested clock. At 25/50 ms and candidate factor 1.2,
  reset/per-impulse/persistent burst errors are 1.94/5.74/7.86 tracking pixels.
  Semi-auto reset/per-impulse errors are close (1.01/1.06); actual shortest
  semi-auto intervals are 214-219 ms, not 100 ms.
- The combined camera/recovery model remains inadequate. Its nominal simulated
  5-95% envelope covers only about 43% of burst evaluation coordinates for the
  25/50 ms, factor-1.2 reset candidate. A diagnostic instantaneous model scores
  slightly better, which does not prove instantaneous native recoil or negate
  the measured slower rise. Keep exact `1.2` arithmetic unresolved.
- Reticle motion largely settles around 400 ms; an exact sway activation switch
  is not established. Sparse red-HUD review supports a visibility limitation,
  not a measured minimum threshold or zero spread when marks are absent.
- All 30 moved videos match their original hashes; all 28 new source files are
  unchanged. Production formulas and data were not edited.

Optional recoil-specific evidence, only if existing analysis cannot resolve a
specific question: independent repeated Standard/Lightened takes;
actual 100-150 ms shot intervals verified from footage; target-distance/aim-point
calibration for impact measurements; and a longer no-fire ADS baseline for sway.
The full report retains methods, errors, sensitivity checks, exclusions, source
hashes, and reproduction steps. The prior 60 Hz integration observation is about
an assumed equation and does not establish native integration semantics.

### Recoil follow-up requested by analysis

The operator states that these recordings are highly labor intensive. Use the
existing videos, screenshots, and source data first. The options below are not
a new capture request or a mandatory repeat of the full set. Before requesting
more footage, identify the unresolved question and the smallest useful capture.

Use the current recording set. Do not substitute the older TR7 task's evidence.

1. If independent replication is needed, use Standard and Lightened only.
   Standard is equivalent to No Muzzle for recoil/spread, as confirmed by the
   operator. Limit the number of takes and shots to the specific question. Alternate loadout
   order. Keep the mouse still and let ADS and camera movement settle for two
   seconds before each shot. Retain at least two seconds after each shot.
2. Capture exact 3-, 5-, 10-, and 15-round bursts with the same loadouts.
   Keep the ammo counter visible and include two seconds before and after firing.
   State whether any recoil compensation was applied.
3. Use a fixed view and known FOV. Keep physical aim, camera movement, and HUD
   spread as separate measurements. A camera response alone may remain unable
   to resolve engine duration or recovery operations.
4. For spread, stay in ADS against a neutral scene for the complete take.
   Include a no-fire baseline, isolated shots, fixed-count bursts, and at least
   two seconds after release. Keep both red parentheses visible.
5. Record the magenta hipfire indicator in separate isolated-shot and 5-round
   takes to test the hipfire branch. Do not use ADS transitions as hipfire tests.

For the full-mechanic follow-up, add fixed-aim impact samples to test projectile
distribution and distinguish physical recoil from camera motion. Test movement
and stance in separate controlled takes. Confirm equipped selector routes and
operation decoding, then compare another Smooth muzzle before assigning
override/add/multiply or stacking rules to its raw operands.

## Pending scenario 1: VSSM hipfire base index and fire mode

Purpose: distinguish the analyzer's VSSM hipfire override at table index 2 from
the recorded Frosty selector at index 4, and test whether semi-auto and full-auto
select different floors or dynamics.

Candidate table rows:

```text
index 2: 3.352 degrees stationary / 4.19 degrees moving
index 4: 1.804 degrees stationary / 2.255 degrees moving
```

Use the factory/default VSSM configuration and record one continuous take with
the spread indicator enabled:

1. Stationary standing hipfire in full auto without firing.
2. Walking hipfire at constant normal speed in full auto without firing.
3. Stationary standing hipfire in semi-auto without firing.
4. Walking hipfire at constant normal speed in semi-auto without firing.
5. One isolated shot in each state, followed by complete recovery.
6. A short sequence in each state, followed by complete recovery.
7. A sustained sequence in each state, followed by complete recovery.

If the game permits removal of factory attachments, make a second take that
shows each configuration change and repeats the four resting-floor states.

Record the wall distance. A fire-mode difference visible before firing indicates
a floor or selector difference. A difference that appears only after firing
belongs to growth, recovery, or scheduling.

## Pending scenario 2: Heavy-barrel spread mechanics

Purpose: test the analyzer's fitted ADS-only Heavy, Heavy Extended, and Cryogenic
spread behavior. The current fitted Heavy factors are:

```text
IncreasePerShot                   x 0.667
FiringDecreaseCoefficient         x 1.71
FiringDecreaseOffset              x 0.667
```

Choose two automatic weapons with different rates of fire that offer a neutral
or Basic barrel and the plain Heavy barrel. Keep every other attachment and the
ammunition identical. For each weapon, record one neutral-barrel take and one
Heavy-barrel take.

In each take, with the spread indicator enabled:

1. Hold fully settled stationary ADS.
2. Fire five isolated single shots with complete recovery.
3. Fire three short two- or three-round sequences.
4. Fire three medium sequences of approximately five rounds.
5. Fire three sustained sequences of 20 rounds or the largest safe count before
   reload.
6. After each sustained sequence, release the trigger and retain the complete
   recovery.
7. Repeat one sustained sequence while walking ADS.
8. Repeat one sustained sequence in stationary hipfire as a negative control.

Do not use Heavy Extended for the first comparison because its additional
velocity and handling effects add unnecessary variables. Later, one Heavy
Extended or Cryogenic confirmation take can test whether the same spread
modifier is shared.

This set must distinguish per-shot growth, firing recovery, post-release
recovery, sustained balance, movement behavior, and the claimed ADS-only scope.

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
has no spread-altering attachment. At a recorded fixed wall distance:

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

Use one weapon with paired Standard and Lightened Suppressors. At a known wall
distance, record isolated shots without compensation so that both reticle motion
and each bullet impact remain visible. Retain full recovery. A stable center
reference must be visible.

Compare the time-domain reticle motion with impact displacement. Do not assume
the spread indicator, camera rotation, weapon animation, and projectile direction
represent the same quantity.

## Recommended order for the later session

1. VSSM hipfire base index and fire-mode test.
2. Two-weapon neutral-versus-Heavy spread test.
3. Combined first-shot and firing/not-firing/idle pause test.
4. Movement and stance branch test.
5. Physical-versus-visual recoil test.
6. Projectile-distribution sample, after the higher-priority state mechanics are
   understood.

The current recoil analysis may remove, refine, or add recoil-specific captures.
Record those changes in the findings and follow-up sections instead of relying
only on conversation history.
