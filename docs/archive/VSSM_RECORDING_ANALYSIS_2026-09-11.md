# VSSM recording analysis — 11 September 2026

> Archived record. Current work is tracked in the [active handoff](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md); implemented behavior is documented in the [live guides](../README.md). Statements in this record describe their original analysis stage.

## Findings

The no-ergonomics and Folding Stock recordings have the same settled hipfire
indicator widths: **81 px standing and about 96 px strafing**. Folding Stock
enables visible ADS firing-spread growth. The hipfire-to-ADS recordings also
provide a repeatable no-firing decay trace, as the operator proposed.

The measured transition decline is approximately **170 px/s in both loadouts**.
It is not explained by changing background projection during the measured
interval. This constrains transition recovery, but does not establish which
Frosty recovery branch or native equation drives it.

No production calculation or data value was changed by this analysis.

## Conditions and source checks

Source directory: `reference-data/Recordings/09112026/VSSM/`.
The operator used the built-in firing range because the previous range does not
yet offer VSSM. **Wall distance is unspecified and is not exactly 20 m.**
The standing version/FOV settings remain 1.4.2.5 and 103.

Confirmed loadout: Mini Flex, 20-point **200MM ASM** barrel, 20-round magazine,
and 10-point **Tungsten Match / Range Penetration** ammo. The equipped-barrel and
equipped-ammo screenshots confirm those names. The model comparison uses
`vssm_suppressed_asm`, `range_pen`, `20_rnd`, and the standard-optic category,
with either `none` or `full_auto_vssm` ergonomics.

The ASM barrel's existing source trace contains suppression/spotting effects;
it is not treated as a Heavy barrel or given a spread modifier. Range Pen ammo
adds a recoil tier penalty in both aim states in the current model. With this
loadout, modeled ADS recoil amount is about 0.845 in both configurations.

Seven MP4 files and four PNG files were inventoried and hashed. All 11 source
hashes matched at completion. Source images and videos were not changed.

| Capture | Observed firing |
|---|---|
| No ergonomics, ADS single shots | five isolated shots |
| Folding Stock, ADS single shots | five isolated shots |
| Folding Stock, ADS 10-round bursts | four bursts of ten |
| Two hipfire-strafing videos | no shots |
| Two hipfire-to-ADS videos | no shots; four ADS transitions each |

The ammo pass recovered **50 individual decrements**, with no skipped
multi-round decrements. All shot brackets are at most 17.6 ms wide. The burst
clip has 43 unread sampled frames during a reload/counter flash around
8.48–9.18 s. They remain recorded as unread; no firing event crosses that gap.
Counts are checked from the HUD, not independently confirmed by audio.

The built-in range places its ammo display differently from the previous range.
The extraction crop was changed accordingly. Measurements use presentation
timestamps and source-frame pixels at 2560 × 1440, sampled at approximately
60 Hz. Camera tracking separately uses all decoded frames at 640 × 360.

## Hipfire floors and ADS firing growth

### Follow-up: matched standing screenshots

The operator subsequently supplied paired loadout/standing screenshots for
M4A1, AK4D, M39 EMR, and VSSM in the built-in range. Original PNGs are
2560 x 1440. Horizontal magenta-arm centroid separation measures:

| Weapon | Stored standing minimum | Measured separation |
|---|---:|---:|
| M4A1 | 1.804 degrees | 81 px |
| AK4D | 2.432 degrees | 103 px |
| M39 EMR | 3.352 degrees | 136 px |
| VSSM | 3.352 override; 1.804 raw selector | 81 px |

The VSSM and M4A1 horizontal arms have identical bounding boxes and centroids.
The three controls increase monotonically with their stored angular minima.
This strongly supports VSSM's raw index 4 (1.804 degrees standing), rather than
the index-2 override, for the supplied configuration. It supersedes the earlier
lack of a matched cross-weapon comparison below. It is comparative HUD evidence,
not an independent projectile-angle measurement. Moving index-4 minimum 2.255
remains a source-table inference, not a new matched moving screenshot result.

Measurement: threshold the central 280 x 200 px ROI for R and B above 110,
each exceeding G by 65; select horizontal connected components near screen
center and subtract their x centroids. Source gameplay clipboard PNG suffixes:
M4A1 `e99eec47-3d5d-4b4e-b4c5-c76acdeb30d4`, AK4D
`38d07995-200e-4588-ad5f-a8dcb07f2a80`, M39 EMR
`c57d91c0-7155-425e-a220-8385828dfc10`, VSSM
`8152e596-40e1-40a9-9cd6-dac56b3828a7`. Originals were read without modification.
No production data or calculation was changed by this follow-up.

### Earlier recording-only findings

Both original standing screenshots measure 81 px between the horizontal
magenta arms. Both strafe-only videos alternate between the same approximately
81 px stationary and 96 px moving plateaus. Folding Stock therefore produces
no observed floor change in these captures.

This does **not** resolve the absolute hipfire table index. The named VSSM
registry values are 3.352 standing / 4.19 moving, matching the site's index-2
override. The previously traced selector points to index 4, whose row is
1.804 / 2.255. Equal widths between fire modes reject a mode-dependent floor
change in this set; they do not choose between two absolute angular scales.
No independent HUD-to-angle calibration is available. Do not use the older
range's crosshair widths as an established common conversion or infer angle
from the now-unknown wall distance.

The no-stock single shots have no detected red ADS spread marks in the measured
sequence. Folding Stock has brief marks after isolated shots and clear growth
through all four ten-shot bursts. This is consistent with the current source
configuration: base ADS increase 0 versus Folding Stock increase 0.409.
Missing marks are censored observations, not proof of zero spread.

## Hipfire-to-ADS recovery — operator's proposed decay test

Each loadout has four transitions with no ammo decrement. The visible red
parentheses start around 50–54 px apart and decline to about 11–17 px before
becoming unavailable. The sampled visible interval is about 0.22–0.25 s.
It is not the full transition time or the proven time to minimum spread.

| Configuration | Median fitted decline | Range over four transitions |
|---|---:|---:|
| No ergonomics | 170.4 px/s | 167.0–175.8 px/s |
| Folding Stock | 169.5 px/s | 166.7–174.5 px/s |

Straight-line residual RMSE is 0.44–0.86 px per transition. The median rate ratio
is about 0.995. This is a repeatable, approximately linear screen-space decay
over the visible range, not a claim of a globally linear native formula.

To check the zoom confound, background features above the weapon were tracked
through all eight transitions. A robust similarity transform estimates scale
relative to the later settled ADS frame. During the red-mark intervals, the
estimated scale stays within about 0.05% of settled ADS; each sampled estimate
has at least 29 inliers. The source contact sheet also shows the weapon raising
while background scale stays effectively fixed. Camera projection change does
not account for the observed tens-of-pixels decline. This does not exclude
separate HUD interpolation or scaling logic.

Relevant Frosty branches were read from the live registry and attachment export:

| ADS recovery input | Base | Folding Stock |
|---|---:|---:|
| Ordinary decrease coefficient / exponent / offset | 1.8 / 0.25 / 0.4 | unchanged |
| Not-firing coefficient / offset | 0 / 6.6 | 0 / 7.2 |
| Idle coefficient / exponent / offset | 0 / 1 / 6.85715 | 0 / 0.25 / 7.5 |

Directly using the flat not-firing offsets under a shared linear HUD mapping
would predict about 9.1% faster Folding Stock decay. Direct use of the flat idle
offsets would predict about 9.4% faster decay. Neither difference is observed.
These clips therefore argue against blindly treating a no-shot aim transition
as the same recovery calculation used after firing.

A **shared recovery path for the changing minimum spread** is a useful next
hypothesis. The unchanged ordinary-decrease fields are relevant candidates.
Their names and this equality do not establish their equation or activation.
Keep passive minimum transitions separate from accumulated firing spread until
their composition is known. The site's current static aim/stance selection and
per-shot simulation do not simulate this time-dependent transition.

## Recoil comparison

The camera tracks retain at least 42 features in the evaluated firing/recovery
windows. The single-shot response has an early pulse and a later, slower tail.
Folding Stock shows a wider range of horizontal directions, consistent with its
source variation-tier change. Five samples per loadout do not identify the
underlying recoil distribution.

The current loadouts were replayed through research instrumentation of the
production timed-delivery integrator, using 256 seeds and actual burst shot
times. The isolated-shot integration was checked against production output.
The stock uses source recovery factor 76 and time exponent 1.24; the diagnostic
alternative retains the base 13.7 / 0.5555 while preserving the other stock
effects. Both use the modeled 25 ms delivery duration and Range Pen ammo.

One shared camera gain and lag were fitted to the 0.15–0.55 s tails from the
first two singles of each loadout. The remaining six singles and all four bursts
were held out. Pixel units below refer to the 640 × 360 camera tracks.

| Diagnostic | Current stock recovery | Base recovery retained |
|---|---:|---:|
| Held-out single-shot tails RMSE | 0.34 px | 0.44 px |
| Held-out full single-shot response RMSE | 1.33 px | 0.97 px |
| All four burst traces RMSE | 1.91 px | 1.71 px |

The stock recovery inputs improve the later isolated tail, but not every camera
metric. The initial camera pulse is not reproduced by a simple scaled physical
recoil trace. These mixed results do not justify replacing source values with
another fitted factor, or claiming that the current model reproduces the native
camera/aim response. There is no no-stock burst recording for a matched burst
comparison.

## Retained evidence and next decision

The useful findings are unchanged hipfire floors across stock modes, ADS growth
with Folding Stock, and a common no-shot transition decline near 170 px/s.
Absolute hipfire index, transition branch/equation, and camera-versus-projectile
recoil remain unresolved. No repeat of these VSSM captures is needed to retain
those findings. The next analysis should test the shared minimum-transition
hypothesis before assigning a new decay constant.

Ignored local output: `outputs/vssm-analysis-2026-09-11/`.

- `source-inventory.json`, `verification.json`: all source hashes, exceptions,
  dependency versions, unread-frame note, and shot-bracket checks.
- `current-loadouts.json`, `registry-fields.json`: exact modeled loadouts and
  249 retained registry entries with names, GUIDs, XML, and source hash.
- `measured/*`: per-frame indicator/ammo detections, missing values, shot events,
  group counts, and visual count checks.
- `spread-summary.json`, `transition-metrics.json`, `transition-fov.csv`,
  `transition-fov-summary.json`, `transition-qa.jpg`: floor and decay evidence.
- `feature-tracking/*`, `camera-metrics.json`, `camera-traces.csv`,
  `replay-jobs.json`, `replay-traces.json`, `recoil-comparison.json`: recoil data.
- `findings.png`: measured spread and camera overview.

Scripts in the same directory reproduce each stage from the repository root:
`inventory.py`, `extract.py`, `measure.py`, `spread.py`, `transitions.py`,
`transition_fov.py`, `source_fields.py`, `loadouts.mjs`, `track.py`, `camera.py`,
`replay.mjs`, `compare_recoil.py`, `plot.py`, and `verify.py`. Use the bundled
Python (PyAV, OpenCV, NumPy) and Node runtimes. Inventory and tracking reuse the
previous recording helpers; ammo recognition reuses the prior digit templates.
Use `measure.py --force` only when remeasuring cached frames. Verify against the
original inventory rather than replacing its initial source hashes.

## Accepted implementation follow-up

The operator approved removal of the VSSM hipfire override after the matched
standing comparison. The original table migration preserved the earlier
class-based VSSM baseline with index 2; it did not establish a separate active
configuration. The resolver now falls through to raw index 4, and stored
standing/moving minima are 1.804 / 2.255. Spread maxima and recovery inputs are
unchanged. The moving value follows the selected source row, with the evidence
limits stated above. Earlier no-change statements describe the analysis stage.
