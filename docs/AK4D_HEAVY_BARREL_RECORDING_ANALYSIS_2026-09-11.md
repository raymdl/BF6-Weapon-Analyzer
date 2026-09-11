# AK4D Heavy-barrel recording analysis — 11 September 2026

## Result

The AK4D recordings support an ADS firing-spread reduction of approximately one
third for **600mm Cut (Heavy)** versus **450mm Factory (Basic)**. The hipfire
control and strafe-only controls show no material barrel difference in their
measured indicator widths. These are HUD measurements, not measured projectile
angles or impact-distribution widths.

The source-derived recovery factors give a slightly closer held-out Heavy trace
match than the current fitted factors. They are the better next implementation
candidate, but the small difference does not identify the native recovery
equation. This analysis does not change production calculations or publish a
release.

## Capture conditions and inventory

The operator's standing conditions apply: **BF6 1.4.2.5, FOV 103, Mini Flex,
20 m wall distance**. The loadout overlays were checked in all 12 videos. They
show FMJ, the 20-round magazine, Standard Suppressor, and no other optional
attachments. The loaded counter starts at 21. The barrel names match the
intended comparison.

Source directory: `reference-data/Recordings/09112026/AK4D/`.

Each barrel has these six MP4 files, with prefix `AK4D_Basic_Barrel_` or
`AK4D_Heavy_Barrel_`:

- `10_Single_Shot_ADS`
- `5rnd_Bursts_ADS`
- `15rnd_Bursts_ADS`
- `15rnd_Bursts_Hipfire`
- `Strafing_ADS`
- `Strafing_Hipfire`

Each barrel also has PNG impact screenshots for the 5- and 15-round ADS series.
All 16 source files were hashed before analysis and checked again afterward;
all hashes matched. No source file was modified.

The ammo-counter pass recovered **371 individual decrements**, with no unread
sampled counts and no multi-round skipped decrements:

| Recording class | Basic | Heavy |
|---|---|---|
| Isolated ADS shots | 10 singles | 10 singles |
| Short ADS bursts | five × 5 | five × 5 |
| Long ADS bursts | five × 15 | five × 15 |
| Hipfire bursts | five × 15 | 15, 15, **16**, 15, 15 |
| Strafe-only videos | zero shots | zero shots |

Heavy hipfire burst 3 is retained in the raw evidence but excluded from the
matched 15-shot metrics and plot. Its counter changes from 21 to 05; the other
Heavy hipfire bursts end at 06. No other firing group was excluded by count.

## Measurements

The videos are 2560 × 1440. Decoding uses source presentation timestamps.
The extraction samples approximately 60 frames per second. Shot times are the
midpoints of the brackets around ammo decrements; they are not audio-confirmed
physical firing times. The median of the measured burst interval medians is
116.6 ms, consistent with the stored 514.285 RPM within the sampling resolution.

ADS red parentheses and magenta hipfire horizontal arms are measured separately
by color, component shape, and paired position. The detector permits modest
center motion during recoil. Source crops were inspected to check the markers
and count exception. Missing detections are retained as unavailable, never zero.
The two indicator types are not assumed to share a pixel-to-angle conversion.

For firing groups, the metric is the median across bursts of the largest valid
pair separation from 30 ms before the first ammo event through 80 ms after the
last. This includes the visible response near the last shot, not just a single
sample at an assumed trigger-release time.

| Condition | Basic width | Heavy width | Interpretation |
|---|---:|---:|---|
| 5-shot ADS peak, five groups each | 35.6 px | 24.0 px | 32.6% smaller |
| 15-shot ADS peak, five groups each | 46.8 px | 31.8 px | 32.1% smaller |
| 15-shot hipfire peak, five/four groups | 218.4 px | 218.2 px | No material difference |
| Strafe-only ADS, settled visible plateau | about 12 px | about 12 px | No visible barrel effect |
| Strafe-only hipfire, stationary plateau | about 136 px | about 136 px | No visible barrel effect |
| Strafe-only hipfire, moving plateau | about 165 px | about 165 px | No visible barrel effect |

Changing both saturation/value thresholds from 105 to 85 or 125 leaves the ADS
reduction at approximately **32.0–32.8%**. This is detector sensitivity, not a
statistical confidence interval. The source frames contain repeated and
correlated observations, not thousands of independent experimental trials.

The single-shot ADS red marks are visible too briefly and too sparsely for a
reliable per-shot-growth or reset fit. The strafe clips establish matched
no-firing movement plateaus, but do not test firing while moving. Indicator
absence during settled ADS cannot establish zero spread.

The four impact screenshots were inspected and retained in an overview. They
contain small, overlapping impact groups with recoil and spread combined. They
were not used to estimate a spread angle, distribution exponent, or independent
recoil reduction.

## Frosty inputs versus the current factor set

The existing AK4D attachment trace maps Heavy to
`_WeaponModifiers/DispersionIncrease/GBM_Increase_ADS_30_BRL_P10.xml`.
The live export was read and hashed:

- Frosty file GUID: `eebb990a-5474-4549-9d08-c55d06ca7f3f`.
- Modifier GUID: `67655f68-7592-4c21-9e5a-7e7f449f262f`.
- SHA-256: `e488b778b7c38b503a3f8fdfa7696bbb2cc419c0ad3178b3cbca0116c243ec24`.
- Site revision examined: `3b07a260e76743e5bb0ee2d1fc1156b4af31c86c`.

Field meanings use the existing attachment provenance mapping. The raw modifier
has the following scalar operands; native activation and composition still
require interpretation.

| ADS field | Raw field | Source factor | Current site factor |
|---|---|---:|---:|
| Increase per shot | `Field_0084b1d1` | 0.666667 | 0.667 |
| Firing recovery coefficient | `Field_2ca8533e` | 1.837117 | 1.71 |
| Firing recovery offset | `Field_1b9eef5d` | 0.666667 | 0.667 |
| Not-firing recovery offset | `Field_4d3f0635` | 0.666667 | 1 |
| Idle recovery offset | `Field_aa558d2b` | 0.666667 | 1; idle state unused |

The named AK4D ADS inputs are increase 0.523; firing coefficient 1.2, exponent
2.5, offset 2.7; not-firing coefficient 0 and offset 7.2; idle time 0.4 s and
idle offset 7.5. Minimum spread is 0.05 standing and 0.32 moving. The first-shot
multiplier is 1. The distribution exponent does not determine the HUD width.

There is a useful mathematical consistency check. If excess spread above the
unchanged floor is scaled by `a = 2/3`, preserving the shape of
`dS/dt = -(C*S^2.5 + O)` requires scaling the increment and flat recovery offset
by `a`, and the coefficient by `a^(1-2.5) = 1.837117...`. This explains why the
source factors form a coherent set under that assumed equation. It is not proof
that the game uses this equation.

The raw nested branches repeat the same operands. That is not a reason to apply
them to hipfire: the observed hipfire control does not show the ADS reduction.
The strafe-only data also provide no evidence for changing movement minima.

## Held-out trace comparison

The research comparison uses actual recovered shot times and 1 ms integration
to compare factor sets without changing numerical resolution between them. It
is not a bit-for-bit replay of the site's 60 Hz spread stepping. It assumes
instant spread addition followed by recovery and a simple fitted HUD response.

Only the first two Basic bursts at each ADS length calibrate the model. The
remaining six Basic bursts and **all ten Heavy bursts** are held out. A small
grid compares excess-versus-absolute recovery, three last-shot firing windows,
four HUD smoothing times, and time offsets. Each candidate fits a shared affine
HUD scale from Basic alone. No Heavy-specific gain or time shift is fitted.

Best Basic calibration: excess-above-floor recovery; 58.3 ms last-shot firing
window; 16.7 ms HUD smoothing; +10 ms timing offset; 1.30 px intercept and
31.33 px per candidate degree. These are nuisance fit parameters, not native
engine constants or an independent angular calibration. Basic training RMSE is
2.12 px; Basic held-out RMSE is 2.08 px.

| Heavy candidate | Heavy held-out RMSE |
|---|---:|
| Current factor set: 0.667 / 1.71 / 0.667; unchanged post-fire offset | 1.98 px |
| Source firing factors; unchanged post-fire offset | 1.91 px |
| Source firing and post-fire factors | 1.85 px |
| Reduced increase only; unchanged recovery | 9.25 px |

The full source candidate also contains the idle operand, but the scored
recovery window does not establish the 0.4-second idle transition or idle offset.
Do not credit the improvement to a measured idle effect.

Across the three calibrations within 10% of the best Basic training error, the
full source candidate remains best. Its improvement over the current factor set
ranges from 0.03 to 0.73 px. Thus the data support reducing recovery together
with shot growth much more strongly than they distinguish 1.71 from 1.837117.
The separate measured post-release slopes are sparse and depend on the selected
time/width band; they do not justify an exact native recovery multiplier alone.

## Decision and remaining limits

Use this set as evidence for ADS-only Heavy firing-spread reduction and unchanged
settled movement/hipfire behavior. The source firing coefficient and post-fire
offset are the preferred next simulation candidate. Keep the idle-state timing,
HUD transform, exact native arithmetic, and application to other weapons or
Heavy Extended/Cryogenic separate from this AK4D result.

No repeat AK4D captures are needed to establish these findings. A different
weapon's existing or future paired set can test transfer. This set does not
resolve moving-fire recovery, VSSM behavior, or projectile distribution.

## Local artifacts and reproduction

Ignored local output directory: `outputs/ak4d-heavy-analysis-2026-09-11/`.

- `source-inventory.json`, `verification.json`: metadata, source hashes, versions,
  conditions, and integrity checks.
- `cache/*.npz`: timestamped HUD/ammo crops and scene-motion diagnostic samples.
- `measured/*/frames.csv`, `ammo-events.csv`, `summary.json`, `counts.jpg`: raw
  detections, missing values, shot brackets, and count review.
- `group-metrics.json`, `metrics-summary.json`, `raw-traces.png`: matched results.
- `model-comparison.json`, `model-traces.csv`, `sensitivity.json`: all model
  candidates, held-out errors, and Basic-calibration sensitivity.
- `color-threshold-sensitivity.json`, `tail-band-slopes.json`: sensitivity and
  limited post-release slope diagnostics.
- `loadout-overlays.jpg`, `hud-qa.jpg`, `impact-overview.jpg`: visual checks.

Run the Python scripts from the repository root with the bundled Python runtime
(PyAV, OpenCV, and NumPy): `inventory.py`, `extract.py`, `measure.py`,
`metrics.py`, `compare_models.py`, `sensitivity.py`, `check_thresholds.py`,
`tails.py`, `qa.py`, `overviews.py`, and `verify.py` in that output directory.
The inventory reuses the prior `inspect_recordings.py` helper. Ammo recognition
reuses the earlier digit templates. To remeasure existing cached frames after a
detector change, use `measure.py --force`. The inventory establishes the initial
hashes; use `verify.py` to check against them without replacing that inventory.

## Implementation follow-up — 11 September 2026

The local simulation now uses source factors for Heavy, Heavy Extended, and
Cryogenic: ADS increment 0.666667, firing coefficient 1.837117, firing offset
0.666667, and not-firing offset 0.666667. The attachment resolver retains the
increment precision instead of rounding it to three decimal places before
simulation. The old fitted-factor metadata was removed.

The existing `frosty-attachment-full-pass-2026-09-06.json` audit contains 61 mapped
selections for these three barrel types. All report the same five ADS factors,
including the idle offset. Their seven source assets are
`GBM_Increase_ADS_{30,35,40,45,50,55,60}_BRL_P10.xml` under
`Common/Hardware/Weapons/_WeaponModifiers/DispersionIncrease/`. The current
exports' ADS branch, `Field_0a160c57/Struct_ad3f9081`, was checked directly for
all five operands. All agree with the factor table above. Different nested
branches can contain neutral operands; this change uses the mapped ADS branch.

This is a source-based transfer to other weapons and barrel variants, not
recording validation of those variants. The AK4D Heavy recordings supply the
in-game evidence. Hipfire, spread minima, recoil, distribution sampling, and
the existing 60 Hz recovery equation are unchanged. No idle transition was
added: its timing and effect remain unverified. The new not-firing factor feeds
the existing recovery consumer; an uninterrupted automatic spray uses firing
recovery between shots, while modeled burst gaps can use not-firing recovery.

The 1.98-to-1.85 px result above remains the research comparison at 1 ms with a
Basic-only fitted HUD transform. It is not a measured error for the shipped
simulation, nor proof of the native projectile spread formula. The improvement
supports choosing the source factors over the visual approximation; it does
not justify fitting the engine equation to the HUD alone.

Validation: 20 attachment-effect and spread-scale tests passed, including AK4D
15-shot excess-spread scaling and post-fire recovery, all three barrel types,
unchanged hipfire, and unchanged spread bounds. Data validation and ship-surface
validation passed. These checks describe the implementation before publication.
