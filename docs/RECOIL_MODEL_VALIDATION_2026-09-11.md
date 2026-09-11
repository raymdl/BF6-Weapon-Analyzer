# Recoil model update and validation — 11 September 2026

## Decision

Duration-audit follow-up: the initial 50 ms/1.2 catalog-wide Smooth treatment below
now has 17 source-mapped weapon–muzzle exceptions at 66.667 ms/1.728. All 63 base
weapons were checked directly in Frosty and retain 25 ms in both aim states.
See the current [attachment table](RECOIL_SPREAD_MODEL.md#duration-and-smooth-attachment-selection)
and [source audit](../reference-data/provenance/frosty-recoil-duration-audit-2026-09-11.json).
The M4A1/TR7/AK4D comparison results below are unchanged by these Bolt exceptions.

Use Frosty recoil duration and continuous recovery to improve the existing
approximation. The operator authorized this change and confirmed that the old
Smooth factor of 1.1 came from early, unscientific spray-pattern inspection.
It is not a measured constant or a prior that the model must preserve. On
11 September 2026, the operator explicitly approved the duration and 1.2 recovery
factor, timed delivery with simultaneous recovery, and publication. This approval
accepts the approximation below; it does not establish native engine arithmetic.

The implemented model uses:

- The existing polar amount, direction, variation, attachment tiers, and random
  seed behavior. It returns pre-shot projectile offsets, not camera motion.
- Uniform impulse delivery over the selected source duration, normally 25 ms.
  Recovery acts during delivery. Unfinished impulses survive later shots.
- A recovery clock that resets on each shot, including after burst pauses.
  Each axis uses `(abs(axis)^decExp + decOffset) * decFactor * t^decTimeExp`.
  The time integral and linear-exponent recovery solution are exact. Delivery
  and nonlinear recovery use steps no larger than 1 ms.
- Smooth operands interpreted as a 50 ms duration override and a factor of 1.2
  on recovery for ordinary Smooth assets, with 66.667 ms/1.728 for the mapped Bolt
  exceptions. These replace the old 1.1. Both aim states use the selected source
  operands. Only ADS has recording evidence; the Bolt exceptions have none.
- Duration override before the existing ergonomic duration addition, followed
  by a zero clamp. For example, Smooth plus the M16A4 Auto receiver gives 49.4 ms.

The equation, uniform envelope, component-wise recovery, modifier operations,
and composition order are model assumptions. Frosty supplies inputs, not proof
of those operations. This is a supported approximation, not recovered engine code.

## Observations and model choice

The local recording analysis (`outputs/recoil-analysis-2026-09-11/REPORT.md`) retains
20 M4A1 videos, eight impact images, source hashes, detection outputs, exclusions,
and fitting results. Standard Suppressor is the recoil/spread control, as confirmed
by the operator. The build is 1.4.2.5; captures use standing ADS, Mini Flex, 103 FOV,
and no compensation or mouse input. The operator subsequently confirmed the
standing conditions for all these recording sets: **1.4.2.5, 103 FOV, Mini Flex,
20 m wall distance**, unless an exception is reported. These conditions also apply
to the planned Heavy-type barrel and VSSM recordings and need not be requested
again. The existing results remain pixel-based; this confirmation does not
retroactively establish the ADS/HUD pixel-to-degree calibration. See the
[recording handoff](BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md) for the shared conditions.

Lightened's isolated camera peak is almost unchanged (4.29 versus 4.26 px), but
its mean peak rise rate is 19.7% lower and its median peak occurs about 29 ms later.
This supports slower delivery. Those camera times do not measure native duration.

Earlier exploratory fits used fixed source inputs, ten isolated calibration
shots, then ten remaining isolated shots, 40 bursts, and ten semi-auto sequences
for evaluation. With 25/50 ms delivery, a 1.2 factor, and a common camera spring,
reset-on-shot mean burst RMS error was 1.94 px, versus 5.74 for independent impulse
recovery and 7.86 for a persistent clock. This supports reset among those tested
equations. It does not rule out other equations or state models.

An instantaneous diagnostic fit scored slightly better overall under the assumed
camera filter. The 25/50 ms model's pointwise envelope covered only about 43% of
burst evaluation coordinates. Thus camera fitting cannot select an exact duration
or distinguish 1.1 from 1.2 reliably. The new factor uses the source operand and
the direction of the observed sustained effect; it is not a fitted engine constant.

## Production-code comparison

`outputs/recoil-duration-model-2026-09-11/compare-production.mjs` runs the actual
attachment resolver and simulator for 2,000 paired seeds per condition. Default
loadouts differ only in muzzle. Compensation is zero. The metric is the mean
vertical range of pre-shot recoil offsets; spread is excluded. The old-code
baseline was saved before this model change, including unrelated existing edits.

| M4A1 rounds | Old model, 1.1: reduction | Timed model, 1.1: reduction | Timed model, 1.2: reduction | Observed camera-peak reduction |
|---|---:|---:|---:|---:|
| 3 | 2.2% | -0.04% | 1.5% | 5.8% |
| 5 | 3.4% | 0.9% | 3.3% | 5.1% |
| 10 | 5.8% | 3.0% | 7.2% | 11.2% |
| 15 | 7.3% | 4.5% | 10.0% | 14.8% |

The 15-round impact-image height reduction is also about 15% (14.8–15.2% over
the reviewed detection thresholds). The updated model reduces that discrepancy
from about 7.7 to 5 percentage points. It does not close it. Shorter impact groups
are sensitive to detection threshold, so they do not establish corresponding
projectile-height reductions. Camera peak and pre-shot recoil range are different
observables; the camera column is context, not an angular accuracy score.

Continuous integration also increases the predicted absolute Standard 15-round
height from 4.326 to 5.180 degrees. That change removes numerical over-recovery in
the assumed equation; the recordings do not establish absolute angular accuracy.
The update is not better on every short-burst relative metric.

The same production check gives 15-round Lightened reductions of 9.7% for TR7 and
16.0% for AK4D, versus 6.5% and 9.9% in the old model. These are transfer predictions,
not new validation against those weapons' recordings. Earlier cross-weapon camera
fits did not establish a consistent native Smooth operation. A subsequent replay
of the current production integrator against yesterday's saved camera tracks finds
mixed agreement: reserved long-burst errors are 3.36 px M4A1, 3.31 px TR7, and
3.67 px AK4D, versus 2.35/3.47/3.83 for the earlier best research fits. Short,
medium, and rapid sequences are mostly similar. See the
local follow-up report (`outputs/recoil-duration-model-2026-09-11/YESTERDAY_COMPARISON.md`)
for calibration rules, all-long-burst errors, unequal counts, and the sampling
check. The earlier research fits are not the old 60 Hz production code.

No arbitrary coefficient was added to force a 15% match. Doing so would mix camera
response, spread, impact detection, and unknown native recovery into one parameter.

## Frosty inputs not consumed by the old calculation

The retained source inventory is
`outputs/recoil-analysis-1.4.2.5/simulation-source-inputs.json`. It records named
fields, raw boxed XML, source paths, GUIDs, and the GRX export SHA-256
`2619b9b75cc93bb55882da680a275ab816b641cdc986a31abfa60bd623e44b51`.
The values below are the reviewed ADS states for M4A1, TR7, and AK4D; they must not
be generalized to every weapon or aim state.

| Field or field group | Reviewed values | Treatment and remaining uncertainty |
|---|---|---|
| `RecoilDuration` | 0.025 s, all three | Now consumed. Uniform delivery is assumed; exact native shape remains unknown. |
| `RecoilDecreaseNorm` | 1, all three; also 1 in all stored ADS/hip groups | Retained, not applied. A scalar normalization by 1 is neutral, but 1 could select a norm or another operation. Do not equate it with proof of independent-axis recovery. |
| `ShootingRecoilDecreaseScale` | 1, all three; also 1 in all stored ADS/hip groups | A direct scale is neutral. Native firing-state gating is unresolved; no new firing/released branch is inferred. |
| `HorizontalRecoilDecreaseMultiplier`, `VerticalRecoilDecreaseMultiplier` | 1, all three | Neutral under direct multiplication. Their activation in the polar path is unresolved; no extra scaling is added. |
| `RecoilFadeOutStart`, `RecoilFadeOutEnd`, `RecoilFadeOutFactor` | -1, -1, 1, all three | No non-neutral taper is established. -1 is a candidate disabled sentinel, not a decoded rule. Uniform delivery remains the minimal envelope. |
| `RecoilPatternSeed`, `RecoilPatternMultiplierPitch`, `RecoilPatternMultiplierYaw` | 0, 0, 0, all three | No scaled authored pattern is established. Keep the analyzer RNG; a zero seed alone does not prove the native random process. |
| `FirstShotMultiplierVerticalRecoil` | 1, all three | Neutral under multiplication. No extra first-shot kick. |
| `MaxVerticalRecoil` | 20, all three | Possible cap or legacy-path value. Reviewed 15-round predicted ranges remain below 20 degrees. Do not impose a global polar clamp without its consumer. |
| `VerticalRecoilMin`, `VerticalRecoilMax` | M4A1: 0.42/0.42; TR7 and AK4D: 0.578/0.578 | Candidate Cartesian inputs. Do not add them to the selected polar magnitude. |
| `VerticalRecoilIncrease` | 0, all three | Neutral under addition; Cartesian activation remains unresolved. |
| `HorizontalRecoilLeft`, `HorizontalRecoilRight` | M4A1: 0.2/-0.3; TR7 and AK4D: 0.3/-0.6 | Candidate Cartesian bounds. Preserve signs; do not convert them into extra polar variation. |
| `UsePolarRecoil` | true, all three | Supports the existing polar path for these states. A false state would need a separate supported implementation; no such branch is added here. |
| `VerticalRecoilMultiplierByOrder`, `HorizontalRecoilMultiplierByOrder` | No decoded numeric array in retained boxed records | Unresolved, not assumed empty. No invented per-shot multipliers. |
| Camera recoil, spring, idle, and switch inputs | Separate retained camera inventory | Research fitting considered camera response. It is not added to projectile offsets. M4A1 spring values 1500/200 and switch times about 0.0833/0.0333 s do not establish a 400 ms sway onset. |
| Smooth raw duration/factor targets | 0.05 and 1.2 in both reviewed aim branches | Now used as estimated override/multiplier; equipped activation across all eight catalog entries and stacking order remain source-based assumptions. |

The [Smooth provenance](../reference-data/provenance/frosty-smooth-recoil-review.json)
retains raw target IDs, operation fields, selector evidence, and source hashes,
with the approved model decision recorded separately from that raw evidence.
Existing amount/variation
tiers, VSSM factor/time-exponent overrides, and ergonomic duration additions remain
active. Spread, reticle sway, and camera filtering are not interchangeable with
projectile recoil and were not used as free correction terms.

## Verification and reproducibility

- `node scripts/test.mjs`: 69 tests pass, including analytic recovery, timed
  delivery, impulse overlap, clock reset, burst pauses, compensation, hip factors,
  deterministic seeds, and attachment composition without base mutation.
- `node scripts/validate-data.mjs`: passes for all 63 supported weapons.
- `node scripts/validate-ship-surface.mjs` and `git diff --check`: pass.
- Production comparison output: `outputs/recoil-duration-model-2026-09-11/production-comparison.json`.
- Baseline code and tracked-file hashes: `outputs/recoil-duration-model-2026-09-11/baseline/`.

The ignored outputs are local reproducibility material and are not shipped site
assets. Source recordings and earlier research outputs remain unchanged by the
implementation. No new recording request is needed to use this approximation.
