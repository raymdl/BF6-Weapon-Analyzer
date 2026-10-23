# PSR recoil measurement: bipod / grip pods, standing vs mounted (23 Oct 2026 clips)

Companion to [deployed-recoil-measurement-2026-10-23.md](deployed-recoil-measurement-2026-10-23.md) (M277 and source predictions). Measured by an Opus subagent; numbers unchanged.

Clips: `reference-data/Recordings/10232026/PSR Bipod/` (2560x1440, 120 fps). Tracker used for all numbers: `scripts/recoil-recording-track-orb.py` (derived from `scripts/recoil-recording-track.py`; changes in section 0). Raw per-frame output was kept in the session scratchpad only. Peak window 15 frames after the flash.

Game-file inputs (data/weapons.json `psr` recoil.ads): amount 1.8, amountMult 0.94, amountExp 0, dirVar 12, dirVarMult 0.920371, dirVarExp 0. attachments.json: `bipod_sr` adsRecoilTierMod 0 (noEffect true), `qd_grip_pod_sr` 0, `classic_grip_pod_sr` 0.

Predictions: standing ratio 1.0 for all; mounted no-bipod 1.0; deployed vertical ratio 0.94^30 = **0.1563**; deployed horizontal variation factor 0.920371^-5 = **1.5142**.

Sign convention: dy > 0 = scene moved down = camera pitched UP; dx > 0 = scene moved right on screen. Units: screen pixels at 2560x1440, measured at the screen centre.

## 0. Why the supplied tracker was not used for the numbers

Ran `scripts/recoil-recording-track.py` unchanged with window 15. Two failures on these clips:

1. **Shot detection:** ammo-digit XOR found 16-21 events per clip; the ammo counter shows exactly 4 shots per clip (11->07 in seven clips, 07->03 in ClassicGripPod_Mounted; read on the frame 10 before the first flash and on the last frame). The extra events come from the tan weapon/bolt animation passing behind the digit crop (inspected frames).
   Old detector counts: NoBipod_Standing 20, Bipod_Standing 21, QDGripPod_Standing 21, ClassicGripPod_Standing 20, NoBipod_Mounted 16, Bipod_Mounted 17, QDGripPod_Mounted 16, ClassicGripPod_Mounted 16.
2. **Tracking:** the yellow-centroid patches landed on the beige counter cloth / floor line (left patch at x~690, y~777-809) rather than the distance signs, and on a PSR shot the camera combines pitch, ~2 deg roll and a brief zoom-out (image scale down to ~0.80-0.95). Translation-only template matching drops to scores 0.5-0.7 and returns wrong values (e.g. NoBipod_Mounted gave ~0.1 px on 12 of 16 events). A translation-only re-run with four large wall/ceiling patches lost lock completely (scores ~0, pinned at the +-80 px search edge).

Changes in `scripts/recoil-recording-track-orb.py`: (a) shots = muzzle-flash frames from a count of orange pixels (r>150, r-g>50, r-b>60) in x700-1900, y400-1100, threshold 1000, 60-frame minimum gap; it finds 4 flashes in every clip, matching the ammo counter. (b) Camera motion per shot = ORB features on the reference frame (flash-6) with weapon/flash/HUD areas masked, matched into every frame flash-6..flash+40, RANSAC similarity transform (estimateAffinePartial2D); the reference screen centre (1280,720) is mapped through it to give dx/dy, plus roll and scale. RANSAC inlier RMS 1.0-1.4 px in all frames. Note: OpenCV seeking (`CAP_PROP_POS_FRAMES`) returned wrong frames on these files; all frame checks here use sequential reads.

## 1. Per-clip detail

### PSR_NoBipod_Standing

Frames 1248, duplicate frames 2, shots detected 4 (flash frames [454, 640, 826, 1012]). Feature fit over the windows: min inliers 128, max RMS 1.24 px. (Old template tracker min/median score 0.680/0.954; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 454 | -0.08 | 42.40 | 42.48 | 11 | -15.21 (1) | 31.72 | 4.83 | -4.29 | 1.93 | 0.822 |
| 2 | 640 | 0.34 | 41.39 | 41.05 | 11 | -18.07 (2) | 31.38 | 4.85 | -8.07 | 1.83 | 0.844 |
| 3 | 826 | 0.30 | 41.46 | 41.17 | 11 | -18.07 (3) | 31.82 | 4.80 | -5.95 | 1.97 | 0.850 |
| 4 | 1012 | -0.11 | 40.56 | 40.67 | 9 | -19.20 (3) | 31.47 | 5.01 | 0.67 | 1.95 | 0.864 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_Bipod_Standing

Frames 1285, duplicate frames 1, shots detected 4 (flash frames [406, 592, 820, 1008]). Feature fit over the windows: min inliers 119, max RMS 1.32 px. (Old template tracker min/median score 0.502/0.931; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 406 | -0.41 | 43.13 | 43.54 | 11 | -20.04 (3) | 30.66 | 5.20 | -5.78 | 1.94 | 0.849 |
| 2 | 592 | 0.07 | 41.17 | 41.10 | 9 | -14.87 (2) | 31.26 | 5.87 | -8.88 | 2.04 | 0.869 |
| 3 | 820 | 0.32 | 41.04 | 40.72 | 9 | -22.10 (3) | 31.74 | 4.10 | -6.42 | 1.94 | 0.841 |
| 4 | 1008 | -0.09 | 39.18 | 39.27 | 9 | -16.46 (3) | 30.58 | 4.76 | -8.70 | 1.94 | 0.806 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_QDGripPod_Standing

Frames 1307, duplicate frames 2, shots detected 4 (flash frames [486, 672, 858, 1044]). Feature fit over the windows: min inliers 123, max RMS 1.25 px. (Old template tracker min/median score 0.605/0.948; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 486 | 0.01 | 41.22 | 41.21 | 11 | -18.16 (2) | 31.92 | 5.24 | -5.66 | 1.86 | 0.833 |
| 2 | 672 | 0.33 | 44.60 | 44.26 | 10 | -17.95 (2) | 33.02 | 5.38 | -8.59 | 1.94 | 0.847 |
| 3 | 858 | 0.13 | 40.92 | 40.80 | 12 | -17.62 (3) | 31.67 | 5.44 | -6.22 | 1.94 | 0.845 |
| 4 | 1044 | -0.33 | 40.10 | 40.43 | 11 | -19.70 (3) | 31.23 | 4.11 | -6.50 | 1.95 | 0.856 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_ClassicGripPod_Standing

Frames 1338, duplicate frames 1, shots detected 4 (flash frames [564, 750, 936, 1122]). Feature fit over the windows: min inliers 152, max RMS 1.24 px. (Old template tracker min/median score 0.501/0.930; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 564 | 0.53 | 48.38 | 47.84 | 10 | -21.17 (3) | 31.10 | 5.92 | -4.64 | 1.90 | 0.923 |
| 2 | 750 | 0.09 | 43.03 | 42.94 | 9 | -21.73 (2) | 30.99 | 5.58 | -9.39 | 1.78 | 0.937 |
| 3 | 936 | -0.45 | 42.79 | 43.24 | 9 | -22.43 (2) | 31.30 | 4.37 | -3.82 | 1.87 | 0.947 |
| 4 | 1122 | -0.29 | 43.17 | 43.46 | 9 | -21.15 (2) | 31.32 | 5.12 | 4.05 | 1.80 | 0.959 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_NoBipod_Mounted

Frames 1182, duplicate frames 1, shots detected 4 (flash frames [356, 542, 728, 914]). Feature fit over the windows: min inliers 25, max RMS 1.35 px. (Old template tracker min/median score 0.629/0.959; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 356 | 0.00 | 42.21 | 42.21 | 10 | -22.64 (2) | 34.25 | 3.60 | -14.50 | 2.20 | 0.894 |
| 2 | 542 | -0.02 | 41.42 | 41.44 | 11 | -24.97 (2) | 33.85 | 4.34 | 9.72 | 2.26 | 0.908 |
| 3 | 728 | -0.03 | 44.04 | 44.07 | 10 | -20.76 (3) | 33.83 | 3.91 | -9.07 | 2.06 | 0.925 |
| 4 | 914 | 0.00 | 47.13 | 47.13 | 11 | -28.29 (2) | 34.29 | 3.84 | -6.90 | 2.36 | 0.940 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_Bipod_Mounted

Frames 1066, duplicate frames 0, shots detected 4 (flash frames [263, 449, 635, 823]). Feature fit over the windows: min inliers 32, max RMS 1.41 px. (Old template tracker min/median score 0.608/0.961; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 263 | 0.00 | 13.33 | 13.33 | 11 | -15.13 (2) | 5.05 | 2.85 | -5.32 | 1.43 | 0.990 |
| 2 | 449 | 0.00 | 10.89 | 10.89 | 11 | -8.47 (2) | 4.83 | 2.80 | -4.45 | 1.13 | 0.790 |
| 3 | 635 | 0.00 | 15.77 | 15.77 | 9 | -8.71 (3) | 5.29 | 2.88 | -3.93 | 1.23 | 0.803 |
| 4 | 823 | 0.00 | 12.13 | 12.13 | 9 | -15.39 (2) | 5.29 | 2.61 | -4.06 | 1.44 | 0.980 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_QDGripPod_Mounted

Frames 1055, duplicate frames 2, shots detected 4 (flash frames [220, 406, 592, 778]). Feature fit over the windows: min inliers 32, max RMS 1.31 px. (Old template tracker min/median score 0.623/0.961; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 220 | 0.00 | 12.13 | 12.13 | 9 | -9.87 (3) | 5.03 | 3.01 | -4.44 | 1.15 | 0.944 |
| 2 | 406 | 0.00 | 13.92 | 13.92 | 11 | -9.43 (3) | 5.00 | 3.05 | -4.04 | 1.11 | 0.959 |
| 3 | 592 | 0.00 | 11.92 | 11.92 | 9 | -10.84 (2) | 5.49 | 3.20 | -4.26 | 1.17 | 0.972 |
| 4 | 778 | 0.01 | 12.96 | 12.95 | 9 | -14.59 (3) | 5.45 | 2.96 | -7.40 | 1.39 | 0.984 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

### PSR_ClassicGripPod_Mounted

Frames 1271, duplicate frames 2, shots detected 4 (flash frames [338, 542, 790, 976]). Feature fit over the windows: min inliers 31, max RMS 1.38 px. (Old template tracker min/median score 0.600/0.966; not used.)

| shot | flash | preDy | peakDy | kick px | peakOffset | dip px (offset) | settled dy f+30..40 | dx at flash | dx jump (pre->peak) | max roll deg | min scale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 338 | -0.00 | 16.95 | 16.95 | 10 | -12.58 (2) | 5.17 | 3.06 | -4.64 | 1.39 | 0.851 |
| 2 | 542 | 0.00 | 10.65 | 10.65 | 9 | -11.46 (2) | 4.79 | 2.46 | -1.85 | 1.37 | 0.820 |
| 3 | 790 | 0.00 | 11.32 | 11.32 | 10 | -10.84 (1) | 5.03 | 2.96 | -6.89 | 1.19 | 0.914 |
| 4 | 976 | 0.00 | 12.46 | 12.46 | 11 | -10.71 (2) | 5.22 | 2.69 | -7.73 | 1.22 | 0.930 |

preDy/peakDy are relative to the per-shot reference frame (flash-6); dx at flash is relative to the pre-flash frame.

## 2. Per-clip summary

| clip | median kick | mean kick | first-shot kick | SD kick | mean settled dy (f+30..40) | first-shot settled |
|---|---|---|---|---|---|---|
| NoBipod_Standing | 41.11 | 41.34 | 42.48 | 0.79 | 31.60 | 31.72 |
| Bipod_Standing | 40.91 | 41.16 | 43.54 | 1.78 | 31.06 | 30.66 |
| QDGripPod_Standing | 41.00 | 41.68 | 41.21 | 1.75 | 31.96 | 31.92 |
| ClassicGripPod_Standing | 43.35 | 44.37 | 47.84 | 2.33 | 31.18 | 31.10 |
| NoBipod_Mounted | 43.14 | 43.71 | 42.21 | 2.53 | 34.06 | 34.25 |
| Bipod_Mounted | 12.73 | 13.03 | 13.33 | 2.08 | 5.11 | 5.05 |
| QDGripPod_Mounted | 12.54 | 12.73 | 12.13 | 0.91 | 5.24 | 5.03 |
| ClassicGripPod_Mounted | 11.89 | 12.84 | 16.95 | 2.84 | 5.05 | 5.17 |

Mean dy (px) at fixed offsets after the flash, relative to the pre-flash frame (4 shots averaged):

| clip | +5 | +10 | +15 | +20 | +25 | +30 | +35 | +40 |
|---|---|---|---|---|---|---|---|---|
| NoBipod_Standing | 10.30 | 39.66 | 27.74 | 37.70 | 27.01 | 31.31 | 31.58 | 30.20 |
| Bipod_Standing | 10.27 | 39.20 | 30.18 | 37.89 | 26.55 | 31.02 | 30.83 | 30.22 |
| QDGripPod_Standing | 9.34 | 40.19 | 29.05 | 37.81 | 26.32 | 31.76 | 31.64 | 29.85 |
| ClassicGripPod_Standing | 3.71 | 43.61 | 30.29 | 38.11 | 26.75 | 31.24 | 31.05 | 29.98 |
| NoBipod_Mounted | 3.88 | 41.98 | 33.66 | 39.64 | 30.44 | 34.97 | 32.91 | 33.63 |
| Bipod_Mounted | -1.74 | 10.60 | 2.27 | 8.27 | 2.85 | 5.52 | 5.05 | 4.56 |
| QDGripPod_Mounted | -2.06 | 11.05 | 2.52 | 8.50 | 2.89 | 5.36 | 5.27 | 4.59 |
| ClassicGripPod_Mounted | -1.73 | 12.25 | 1.95 | 8.06 | 2.64 | 5.48 | 4.86 | 4.48 |

The trace is not a single kick: dy first dips (camera down, 11-24 px within +1..+5), rises to a peak at +9..+11, oscillates (+15 low, +20 high, +25 low) and settles by about +30 to a steady level. The 15-frame peak therefore includes the oscillation; the settled level is the net pitch change.

## 3. Vertical comparison

| clip | predicted | kick ratio (mean) | kick ratio (first shot) | settled ratio (mean) |
|---|---|---|---|---|
| NoBipod_Standing | 1.000 | 1.000 | 1.000 | 1.000 |
| Bipod_Standing | 1.000 | 0.996 | 1.025 | 0.983 |
| QDGripPod_Standing | 1.000 | 1.008 | 0.970 | 1.012 |
| ClassicGripPod_Standing | 1.000 | 1.073 | 1.126 | 0.987 |
| NoBipod_Mounted | 1.000 | 1.057 | 0.994 | 1.078 |
| Bipod_Mounted | 0.156 | 0.315 | 0.314 | 0.162 |
| QDGripPod_Mounted | 0.156 | 0.308 | 0.286 | 0.166 |
| ClassicGripPod_Mounted | 0.156 | 0.311 | 0.399 | 0.160 |

Pooled: standing (4 clips) mean kick 42.14 px, settled 31.45 px; deployed (3 clips) mean kick 12.87 px, settled 5.14 px. Deployed/standing: **peak kick 0.305**, **settled 0.163**; predicted 0.156.

- (a) Standing clips agree: **yes.** Mean kick 41.2-44.4 px (ratios 1.00-1.07 to NoBipod_Standing), settled 31.1-32.0 px (ratios 0.98-1.01). ClassicGripPod_Standing peaks ~7% higher (first shot 47.8 px) but its settled level matches.
- (b) Mounted without bipod equals standing: **yes, within noise.** Kick ratio 1.057, settled ratio 1.078 (NoBipod_Mounted has the weakest fit, 25-32 inliers, settled SD 2.1 px).
- (c) The three deployed clips agree: **yes.** Mean kick 12.7-13.0 px, settled 5.05-5.24 px; their per-offset traces match to <=1.2 px.
- (d) Deployed/standing vs 0.94^30 = 0.156: the **settled** pitch ratio 0.163 matches (within ~5%). The **15-frame peak** ratio 0.305 does not: in deployed clips the peak sits ~7.7 px above the settled level vs ~10-12 px standing, i.e. the post-shot oscillation shrinks far less than the net pitch.

## 4. Horizontal

dx jump = dx at the vertical-peak frame minus dx at the pre-flash frame; settled dx = mean dx over f+30..f+40 minus pre-flash dx.

| clip | dx jumps (px) | mean | SD | settled dx per shot | settled dx SD | mean max abs dx in window |
|---|---|---|---|---|---|---|
| NoBipod_Standing | -4.29, -8.07, -5.95, 0.67 | -4.41 | 3.73 | -6.74, -4.62, -2.07, 3.44 | 4.39 | 19.41 |
| Bipod_Standing | -5.78, -8.88, -6.42, -8.70 | -7.45 | 1.58 | -7.78, -5.55, -3.53, -7.39 | 1.95 | 21.12 |
| QDGripPod_Standing | -5.66, -8.59, -6.22, -6.50 | -6.74 | 1.28 | -7.86, -6.23, -7.13, -2.13 | 2.56 | 21.12 |
| ClassicGripPod_Standing | -4.64, -9.39, -3.82, 4.05 | -3.45 | 5.57 | -5.07, -7.08, -2.07, 5.62 | 5.57 | 18.86 |
| NoBipod_Mounted | -14.50, 9.72, -9.07, -6.90 | -5.18 | 10.44 | -12.37, -14.87, -3.90, -7.84 | 4.87 | 22.97 |
| Bipod_Mounted | -5.32, -4.45, -3.93, -4.06 | -4.44 | 0.63 | -0.57, 0.22, -3.77, -2.00 | 1.76 | 14.07 |
| QDGripPod_Mounted | -4.44, -4.04, -4.26, -7.40 | -5.03 | 1.59 | -0.20, -0.22, -2.96, -3.20 | 1.66 | 15.71 |
| ClassicGripPod_Mounted | -4.64, -1.85, -6.89, -7.73 | -5.28 | 2.63 | -1.56, 0.33, -0.23, -3.62 | 1.76 | 14.20 |

Pooled within-clip SD of dx jump: standing 3.50 px, deployed 1.81 px, ratio deployed/standing **0.52** (predicted 1.514).

Pooled within-clip SD of settled dx: standing 3.89 px, deployed 1.72 px, ratio deployed/standing **0.44** (predicted 1.514).

With 4 shots per clip these SDs are very uncertain (single clips range 0.6-5.6 px for dx jump; NoBipod_Mounted 10.4). The data do not show the predicted ~1.51x increase in horizontal variation when deployed; deployed clips are at or below standing. Horizontal motion inside the window is dominated by the post-shot oscillation (mean max |dx| 14-23 px), not by a single directional step.

## 5. Reliability notes

- Shots: 4 per clip; flash detection agrees with the ammo counter in all 8 clips. Orange-pixel peaks per clip: NoBipod_Standing [100076, 82701, 14741, 40501]; Bipod_Standing [64192, 47006, 44823, 73045]; QDGripPod_Standing [24762, 12427, 5672, 20806]; ClassicGripPod_Standing [77385, 43752, 59722, 16595]; NoBipod_Mounted [54120, 80236, 34907, 81120]; Bipod_Mounted [33649, 38404, 141999, 60838]; QDGripPod_Mounted [17311, 95652, 45356, 57735]; ClassicGripPod_Mounted [122483, 29365, 85387, 36226]. QDGripPod_Standing shot 3 (frame 858) has a weak, less saturated flash and was missed at stricter colour thresholds.
- Sample size: 4 shots per clip (16 standing, 12 deployed). Vertical numbers are tight (kick SD 0.8-2.8 px, settled SD 0.5-2.1 px); horizontal SDs are not reliable at n=4.
- Camera settling: per-shot reference is flash-6; mean dy drift over the 5 pre-flash frames is <=0.11 px in every clip.
- Post-shot motion is not pure translation: roll up to ~1.8-2.4 deg (standing and NoBipod_Mounted) and 1.1-1.4 deg (deployed), plus a brief image scale-down (min scale 0.79-0.96). The similarity fit absorbs this; dy/dx are the motion of the screen-centre point. Mounted clips have fewer inliers (25-47 vs 119-205 standing) because the counter fills the lower frame; RMS stays <=1.41 px.
- Bolt animation: the bolt/ammo-display events (old detector) start ~100 frames after each flash, outside both the 15-frame peak window and the +30..+40 settled window.
- Peak vs settled: the pixels alone do not say which of the two corresponds to the game's recoil amount; the settled ratio matches 0.94^30 and the peak ratio does not.
- Mounted vs standing confirmed visually on the frame 10 before the first shot: mounted clips show the range counter in the lower frame, standing clips the lane floor. Deployment of the bipod/grip pod was not confirmed from a HUD element; the three deployed clips differ from NoBipod_Mounted only in attachment and their motion differs sharply from it.
- No px->degree conversion (ADS FOV not measured); all comparisons are ratios.
- ClassicGripPod_Mounted starts at 07 rounds (others at 11).
