# GRT-BC recoil pattern review — corrected 21 September 2026

Publication was authorized after this correction. Burst gameplay activation remains
an open research question. This report supersedes the earlier
claim that the firing patterns favor an inactive Burst Mode variation modifier.

## Finding

The observed firing patterns do not reliably distinguish active burst recoil
modifiers from inactive modifiers. Linear Comp gives the clearest repeated trend:
less dispersion across the mean recoil direction and more travel along it. Burst
Mode results vary by experiment. The menu's unchanged recoil values are confirmed
observations, but they do not establish a firing-runtime failure.

## What was corrected

Earlier measurements used horizontal width and vertical height. They did not
isolate dispersion across the GRT-BC's inherent recoil direction. The current
simulation converts source direction +16 degrees to a leftward angle of -16 degrees
from upward vertical. The measured short-group mean endpoint angles range from
-12.9 to -17.7 degrees, consistent with that convention. There is no evidence here
for a direction-sign bug in the simulator.

The saved impact coordinates are transformed into board coordinates, then projected
onto fixed cross-direction and along-direction axes at -16 degrees. In upward-Y
coordinates, cross = x*cos(theta) - y*sin(theta), and along = x*sin(theta) +
y*cos(theta). Each group's position cancels in its range. The axis is fixed for all
setups; fitting and removing each individual group's lean could erase real variation.

For three-shot groups, the measure is the range of the three detected impact centers.
For 30-round strings, overlapping holes prevent reliable individual-shot recovery;
the measure is the 1st-to-99th percentile span of the detected decal pixels. The latter
weights visible pixels, not bullets. It cannot be interpreted as a shot variance.

Board coordinates use the earlier 1000-by-500 reference homography. This is not an
independent physical calibration. Results are relative widths, not measured recoil
angles. Testing axes from -12 to -20 degrees checks sensitivity to angle and modest
coordinate-scale uncertainty, but does not establish a calibrated world-space angle.

The model comparison now uses the same fixed direction axes, 5,000 deterministic
simulations per case, and modeled spread and recoil recovery. It compares three
hypotheses: all source burst recoil modifiers active; only burst variation inactive;
and all burst recoil modifiers inactive. The last case still uses burst cadence.
No model parameters were fitted to the screenshots.

## Source expectations

| Setup | Recoil amount | Variation |
|---|---:|---:|
| No muzzle, no Burst Mode | 0.807 degrees | 26.100 degrees |
| Linear Comp only | 0.859 degrees | 20.237 degrees |
| Burst Mode only | 0.759 degrees | 20.237 degrees |
| Linear Comp plus Burst Mode | 0.807 degrees | 15.691 degrees |

These are configured model values, not values measured from impact marks. Linear
Comp increases amount by one step and reduces variation by three steps. GRT-BC
Burst Mode reduces amount by one net step and variation by three steps. The combined
amount steps cancel. Mean direction stays unchanged.

For short groups, adding Burst Mode predicts cross-direction width reductions of
18.7% without Linear Comp and 16.5% with it. Predicted along-direction reductions
are 4.7% and 5.4%. If only burst variation is inactive, predicted cross-width
reductions are just 4.5% and 4.1%, from the remaining amount/duration changes.
If all burst recoil modifiers are inactive, matched-cadence predictions are unchanged.
Thus impact width reduction is not numerically equal to variation reduction.

## Isolated three-shot groups

Each setup has 30 groups. Percent changes compare means. Intervals are exploratory
95% bootstrap intervals over groups, not over the 90 individual bullets.

| Comparison | Cross-direction change, 95% interval | Along-direction change |
|---|---|---:|
| Initial set: add Burst Mode, no muzzle | -14.3% [-32.5%, +8.8%] | 0.0% |
| Initial set: add Linear Comp to Burst Mode | -18.8% [-36.6%, +4.9%] | +3.8% |
| Later four-way set: add Burst Mode, no muzzle | +5.5% [-18.8%, +38.2%] | +2.8% |
| Later four-way set: add Burst Mode with Linear Comp | -8.9% [-29.4%, +15.8%] | -0.2% |
| Later four-way set: add Linear Comp to Burst Mode | -23.1% [-41.5%, +0.1%] | +6.9% |
| Later four-way set: add Linear Comp without Burst Mode | -10.9% [-29.9%, +14.9%] | +10.2% |

The initial burst effect is compatible with the active-modifier prediction, but also
with no effect. The later short-group intervals likewise fail to distinguish those
cases. They do not prove equivalence or inactivity. Linear Comp's -10.9% cross-width
and +10.2% along-travel changes without Burst Mode are close to modeled -11.9% and
+8.0%. Its along-travel change is the strongest result after multiple-comparison
adjustment. This is support for the general conversion behavior, not exact parameter
validation.

The second camera view of the initial no-burst board contains the same groups. It is
not an independent sample and is excluded from sample counts and significance tests.

## Thirty-round strings

Five strings per setup, 30 rounds each, at 20 m with the same stance, no compensation,
and full recovery between strings, as confirmed by the operator.

| Comparison | Cross-direction change, 95% interval | Along-direction change |
|---|---|---:|
| Rapid-click Burst Mode vs continuous auto, no muzzle | -30.5% [-41.7%, -15.8%] | -26.5% |
| Rapid-click Burst Mode vs continuous auto, Linear Comp | -32.5% [-45.2%, -18.6%] | -22.7% |
| Add Linear Comp during continuous auto | -4.5% [-20.0%, +15.3%] | +4.5% |
| Add Linear Comp during rapid-click Burst Mode | -7.2% [-24.4%, +11.8%] | +9.9% |
| Rapid-click Burst Mode vs 180/70 ms macro, no muzzle | +19.0% [-1.4%, +45.3%] | +13.8% |
| Rapid-click Burst Mode vs 180/70 ms macro, Linear Comp | +31.2% [+10.6%, +52.9%] | +14.8% |
| Add Linear Comp during 180/70 ms macro | -15.9% [-28.2%, -1.3%] | +8.9% |

Burst fire is substantially smaller than continuous-auto strings, but firing cadence
and recovery differ. Those comparisons cannot attribute the improvement to the burst
attachment's recoil modifier.

The 180 ms down / 70 ms up macro uses a 250 ms requested cycle. It does not prove the
game accepted exactly the same shot timestamps or firing/recovery states as native
burst fire. Native burst strings are larger than these macro controls in both axes.
Under equal modeled cadence, active modifiers predict roughly 13–15% less cross-width
and 4–5% less along-travel; all-inactive predicts no change. Neither predicts the
observed increase in along-travel. This exposes a timing/recovery/model mismatch and
prevents treating these strings as a clean active-versus-inactive test.

The same native-burst strings are reused in the continuous-auto and matched-macro
comparisons. They are not ten new strings. The two long-string analyses therefore
share samples and must not be counted as independent replications.

## Statistical and measurement limits

- All isolated burst cross-width comparisons include zero in their intervals.
- Tests use groups or strings as units, not individual bullets or decal pixels.
  These remain single-session observations with possible sequence effects.
- Exact permutation tests for five-versus-five strings are coarse. Bootstrap
  intervals are unstable at that sample size; an interval excluding zero is not
  sufficient by itself to claim a confirmed effect.
- Holm adjustment across 26 distinct cross/along comparisons leaves no burst
  cross-width comparison below 0.05. This is an exploratory family chosen after
  the original analysis, not a preregistered test.
- Long-string cross-width effects are stable at decal thresholds 5, 8 and 12:
  matched-macro burst comparisons stay about +19–20% and +31–32%.
- The later short-group burst result without a muzzle changes from -3.5% to +11.7%
  across axes -12 to -20 degrees; with Linear Comp it changes from -11.2% to +0.8%.
  These small effects are not robust enough to establish a modifier state.
- Modeled impact-center ranges and observed long-string decal spans are different
  observables. Their numerical comparison is diagnostic, not a calibrated model
  likelihood or a measured engine recoil value.

## Menu observations across weapons

GRT-BC retains Precision 26, Control 37, recoil amount 0.8 and variation 26.1 when
Burst Mode is equipped. SL9 changes Precision 61 to 78 and RPM 675 to 771, while
Control 55, amount 0.5 and variation 13.0 stay unchanged. This shows that a menu can
respond to the fire-mode selection without showing the configured recoil changes.
KORD equipped Burst Training and SG 553R/PW5A3 hovered Burst Training also show
unchanged recoil variation. SG/PW equipped parity is not established by those views.
The historical CZ3A1, KV9 and UMG-40 Burst Training panels equal their None panels.
All eight burst-capable weapons therefore show the same menu behavior. The menu
observation is not specific to GRT-BC and is not evidence about GRT-BC firing.
M16 A3 preview changes amount and Precision/Control but retains variation 29.2.
It is a distinct conversion, not evidence for a universal burst rule.

Compensated Brake with Burst Mode shows GRT-BC Precision/Control 27/40 and
SL9 80/59. These muzzle responses do not demonstrate that burst recoil is active.

Linear Comp changes GRT-BC menu variation from 26.1 to 20.2. Frosty places Linear
Comp behind direct muzzle selection and burst recoil behind a nested fire-mode
selector. The traced references and selector mask agree; no broken link was found.
A different menu evaluation path remains plausible. These images do not establish
whether the nested selector fails during firing.

## Frosty attachment trace

The [saved Frosty assumption trace](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frosty-assumption-review.json)
records exported 1.4.2.5 modifier inputs and source hashes. Its GRT-BC Burst Mode
row starts at `Attachment_MSBSGROTB_ERG_BurstFireEnable.xml`. The weapon blueprint
`MSBSGROTB_WB.xml` has a nested fire-mode selector with ID
`588728fd-2ae7-4424-aa22-45d9b3c82ba0` and mode mask `8`. That selector binds
`GRM_RecoilConversion_ERG_P10.xml`, `GRM_Recoil_ERG_P20.xml`, and
`GRM_AutoIdentifier_P00.xml`. The recorded references and mask agree; the trace
found no broken asset link.

For both ADS and hipfire, the burst conversion contributes -1 recoil-amount tier
and +3 variation tiers. The GRT-BC-specific recoil package contributes +2 amount
tiers and no variation tier. The net source input is therefore +1 amount tier and
+3 variation tiers. The separate Linear Comp row starts at
`Attachment_MSBSGROTB_MZL_KVPMachLinearComp.xml`; its directly selected
`GRM_RecoilConversion_MZL_P10.xml` contributes -1 amount tier and +3 variation
tiers, with no nested fire-mode selector in that row. These tier operands are the
source basis for the modeled values above, not measurements from the screenshots.

The trace covers exported bindings and operands. It does not show which bindings
the game menu evaluates, whether the firing runtime activates the nested selector,
or the actual timing and recovery between bursts. The unchanged Burst Mode menu
values and the firing patterns therefore remain separate observations.

## Current decision

Keep the source burst modifiers in the firing simulation. Keep the observed menu
input rules for Weapon Attributes. Record Burst Mode gameplay activation as unresolved,
not a confirmed bug and not a measured failure. Do not claim the firing model has
been validated by these patterns. A discriminating follow-up would need actual shot
timestamps and a larger repeated short-group sample with fixed camera geometry,
matched firing conditions, and shot-order information.

## Reproduction

Local corrected analysis: `outputs/burst-direction-review/analyze.py` and `model.mjs`.
The source detections, masks and hashes remain in the four original `outputs/burst-*`
folders. These local images and scripts are ignored, not clean-clone dependencies.
The numerical results and modeled cases are retained in
[the provenance record](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/grtbc-direction-review-2026-09-21.json).
Current model: [Weapon Attributes](../WEAPON_ATTRIBUTES_MODEL.md).

## Screenshot archive (local only)

The screenshots are not in the repository. Git ignores both folders because of
their size. The paths below are relative to the repository root and work only on
the machine that holds the local captures. The provenance records keep the
SHA-256 hash of each image, so a local copy can be checked.

Firing tests. Each report shows its original screenshots (`original-0.png` to
`original-3.png`) under "Original screenshots":

- Three-shot group comparison: `outputs/burst-group-analysis/REPORT.md`
- Four-condition three-shot test: `outputs/burst-factorial-analysis/REPORT.md`
- Long-string test: `outputs/burst-long-string-analysis/REPORT.md`
- Cadence-matched macro comparison: `outputs/burst-cadence-comparison/REPORT.md`
  (two of its four images are reused from the long-string test)

Menu panels, in
`reference-data/attachment-audit/Weapon Attachments/Loadout A-B Testing/Burst Panel Inputs/`.
Hashes: [panel provenance record](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/burst-panel-inputs-2026-09-21.json).

| Weapon | Files |
|---|---|
| GRT-BC | `grtbc_none-equipped.png`, `grtbc_burst-hover.png`, `grtbc_burst-equipped.png`, `grtbc_burst-equipped-compensated-brake-hover.png` |
| SL9 | `sl9_none-equipped.png`, `sl9_burst-hover.png`, `sl9_burst-equipped.png`, `sl9_burst-equipped-compensated-brake-hover.png` |
| KORD 6P67 | `kord6p67_none-equipped.png`, `kord6p67_burst-equipped.png` |
| SG 553R | `sg553r_none-equipped.png`, `sg553r_burst-hover.png` |
| PW5A3 | `pw5a3_none-equipped.png`, `pw5a3_burst-hover.png` |
| M16A4 | `m16a4_none-equipped.png`, `m16a4_a3-hover.png` |
