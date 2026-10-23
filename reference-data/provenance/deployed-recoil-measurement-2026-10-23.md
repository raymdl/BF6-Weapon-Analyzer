# Deployed-state recoil measurement, 23 October 2026 (client 2.1.1.0)

Operator recordings `reference-data/Recordings/10232026/<weapon> Bipod/<weapon>_<grip>_<state>.mp4`,
firing range, ADS, 2560x1440 at 120 fps. Standing = fired from the lane; Mounted = weapon
rested on the range counter (mount prompt taken). Grips: NoBipod (no bottom-rail
attachment), Bipod, PTT Grip Pod, QD Grip Pod, Classic Grip Pod. The sniper has no PTT.
Numbers only; the interpretation is in the Frosty research notes
(`BF6 Frosty Research/docs/frosty/WEAPONS.md`, "Mounted and deployed recoil").

Script: `scripts/recoil-recording-track.py` (`track` then `summary`). Camera displacement is
measured by template-matching the yellow "10" (left wall) and "15" (right wall) range signs
against a reference frame taken just before the first shot; dy > 0 is camera climb (the
scene moves down). Shots are the XOR of the thresholded magazine digits; the muzzle flash
is the brightness jump in the centre crop. Single-frame template slips (> 40 px) are
removed before the summary. Units are pixels of the 2560x1440 frame; the ADS camera scale
is not calibrated, so only ratios between clips are used.

## Source predictions tested

The site computes per-shot recoil as `amount × amountMult ^ (sum of exponent tiers)`
(`sim/applyAttachments.js`). The deployed-bipod condition (`Field_b574fa40`, the
`BenefittingFromBipod` header flag) binds these recoil tiers in the 2.1.1.0 raw capture:

| Asset (`Common/Hardware/Weapons/_WeaponModifiers/…`) | Amount exponent | Variation exponent | Bound for |
|---|---:|---:|---|
| `Bipod/GRM_BipodDeployed_BTM_P50` | +10 | −4 | Bipod on automatic weapons and DMRs |
| `Grippod/GRM_GrippodDeployed_BTM_P30` | +8 | −4 | PTT, QD and Classic grip pods |
| `Bipod/GRM_BipodDeployed_Bolt_BTM_P50` | +30 | −5 | Bipod on bolt-actions; QD/Classic grip pods on PSR, M2010 ESR, SV-98, Mini Scout |

The `_P30` and `_P50` files differ only in the two amount operands (`Field_4692836a`
0x08 against 0x0a); the Bolt file has 0x1e and variation 0xfffffffb. The plain mounted
modifiers `Recoil/GRM_MountedHorizontal` and `GRM_MountedVertical` carry identity
operands and zero tier deltas (no change when mounting without a bipod).
`DispersionIncrease/GBM_Increase_ADS_{30,35,40,45,50}_BTM_Bipod` are byte-identical apart
from name and GUID: increase and offsets × 0.333333, firing coefficient × 5.196152.

Grip pods also bind `Recoil/GRM_Recoil_BTM_P20` (+2 amount tiers) unconditionally; on the
M277 all three grip pods are +2 (site `adsRecoilTierMod` 2). The M277 ADS `amountMult`
is 0.9433 and `dirVarMult` 0.921523 (`data/weapons.json`).

| M277 clip | Tier sum | Predicted amount factor vs NoBipod standing |
|---|---:|---:|
| NoBipod / Bipod standing | 0 | 1.000 |
| Grip pod standing | +2 | 0.890 |
| NoBipod mounted | 0 | 1.000 |
| Bipod mounted | +10 | 0.558 |
| Grip pod mounted | +2 +8 = +10 | 0.558 |

Predicted direction-variation factor deployed: 0.921523^−4 = 1.387 (bipod and grip pods).

## M277 (720 RPM, 21-round magazine; first 20 shots used)

| clip | shots | spikes removed | first kick | median kick 2+ | mean kick 2+ | climb before shot 5 | 10 | 15 | 20 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Bipod_Mounted | 20 | 1 | 7.1 | 3.3 | 3.7 | 25.3 | 41.5 | 56.7 | 67.3 |
| Bipod_Standing | 20 | 12 | 19.0 | 7.5 | 7.9 | 56.2 | 87.8 | 102.4 | 126.0 |
| ClassicGripPod_Mounted | 20 | 0 | 9.7 | 4.3 | 3.8 | 29.1 | 53.5 | 61.2 | 68.0 |
| ClassicGripPod_Standing | 20 | 7 | 17.8 | 7.7 | 7.8 | 45.9 | 74.4 | 91.6 | 97.2 |
| NoBipod_Mounted | 20 | 7 | 15.3 | 5.2 | 6.4 | 55.4 | 86.5 | 101.3 | 116.0 |
| NoBipod_Standing | 20 | 2 | 12.2 | 7.0 | 9.7 | 53.5 | 94.2 | 103.8 | 126.2 |
| PTTGripPod_Mounted | 20 | 0 | 5.5 | 3.8 | 3.9 | 25.6 | 46.7 | 54.7 | 61.0 |
| PTTGripPod_Standing | 20 | 0 | 9.3 | 9.6 | 9.7 | 40.6 | 80.5 | 96.5 | 106.0 |
| QDGripPod_Mounted | 20 | 1 | 9.0 | 3.7 | 3.6 | 29.3 | 47.5 | 56.7 | 65.9 |
| QDGripPod_Standing | 20 | 0 | 15.1 | 8.2 | 7.9 | 43.3 | 76.6 | 88.7 | 99.4 |

"Kick" = peak dy in the shot interval minus the pre-flash level; "climb before shot k" =
pre-flash dy of shot k relative to shot 1. All flash intervals are 10 frames (83 ms)
except single 9/11 and 7/13 pairs. Peak offsets are 7 to 9 frames after the flash.
Template scores stayed above 0.61 through every burst.

Ratios of the climb before shot 20 (climb before shot 10 in brackets), against the mean
of the two no-grip standing clips, 126.1 (91.0):

| State | Clips | Mean climb @20 (@10) | Measured ratio | Predicted |
|---|---|---:|---:|---:|
| Standing, no grip pod (NoBipod, Bipod) | 126.2, 126.0 | 126.1 (91.0) | 1.00 (1.00) | 1.000 |
| Standing, grip pods (PTT, QD, Classic) | 106.0, 99.4, 97.2 | 100.9 (77.2) | 0.80 (0.85) | 0.890 |
| Mounted without bipod | 116.0 | 116.0 (86.5) | 0.92 (0.95) | 1.000 |
| Deployed bipod | 67.3 | 67.3 (41.5) | 0.53 (0.46) | 0.558 |
| Deployed grip pods (PTT, QD, Classic) | 61.0, 65.9, 68.0 | 65.0 (49.2) | 0.52 (0.54) | 0.558 |

Median per-shot kick (shots 2 to 20): no-grip standing 7.0 / 7.5; grip pods standing
9.6 / 8.2 / 7.7; mounted without bipod 5.2; deployed 3.3 / 3.8 / 3.7 / 4.3 (ratio about
0.5 against standing).

Horizontal: the wall texture repeats at about 90 px, and the right-sign patch slips by
that period during bursts, so the per-shot dx jumps (many at ±90) are not usable. No
horizontal-variation ratio is reported.

## PSR (bolt-action; four shots per clip; no PTT Grip Pod)

Full tables in [deployed-recoil-measurement-2026-10-23-psr.md](deployed-recoil-measurement-2026-10-23-psr.md).
The template tracker fails on these clips (each PSR shot adds about 2° of camera roll and a
brief zoom-out, and the bolt animation crosses the ammo digits), so the PSR numbers come from
`scripts/recoil-recording-track-orb.py`: muzzle-flash shot detection (4 per clip, matching
the counter 11 → 07) and an ORB-feature RANSAC similarity fit of the whole scene (RMS ≤ 1.4 px).
PSR ADS `amountMult` 0.94, `dirVarMult` 0.920371; predicted deployed factor 0.94^30 = 0.156,
variation 0.920371^−5 = 1.514. Sniper grip pods carry no undeployed recoil tier.

Each shot's camera trace dips, peaks at +9 to +11 frames, oscillates and settles by +30
frames; "settled" is the mean dy over frames +30 to +40, the net pitch change.

| Clip | Mean 15-frame peak kick (px) | Settled (px) | Peak ratio | Settled ratio | Predicted |
|---|---:|---:|---:|---:|---:|
| NoBipod_Standing | 41.3 | 31.6 | 1.000 | 1.000 | 1.000 |
| Bipod_Standing | 41.2 | 31.1 | 0.996 | 0.983 | 1.000 |
| QDGripPod_Standing | 41.7 | 32.0 | 1.008 | 1.012 | 1.000 |
| ClassicGripPod_Standing | 44.4 | 31.2 | 1.073 | 0.987 | 1.000 |
| NoBipod_Mounted | 43.7 | 34.1 | 1.057 | 1.078 | 1.000 |
| Bipod_Mounted | 13.0 | 5.1 | 0.315 | 0.162 | 0.156 |
| QDGripPod_Mounted | 12.7 | 5.2 | 0.308 | 0.166 | 0.156 |
| ClassicGripPod_Mounted | 12.8 | 5.1 | 0.311 | 0.160 | 0.156 |

Pooled deployed/standing: settled 0.163 (predicted 0.156); 15-frame peak 0.305. The
post-shot oscillation shrinks much less than the net pitch when deployed.

Horizontal (n = 4 per clip, weak): within-clip SD of the horizontal jump 3.50 px standing
against 1.81 px deployed (ratio 0.52); settled-dx SD ratio 0.44. The predicted 1.51×
increase in direction variation is not seen; deployed clips are at or below standing.

## Reliability

- Mounted and standing states were judged from the frame (camera height, counter in
  view) and the file names; the game shows no deployed indicator in these clips.
- The player's mouse input is not separated from the camera track. The no-grip standing
  clips agree to 0.2 px at shot 20, which argues against compensation in those clips;
  the 116 px mounted-no-bipod climb is 8% below them with no other control.
- The per-shot kick is noisy (±3 px) because recovery between shots is included; the
  cumulative climb is the primary measure.
- The camera recoil layer is not the bullet recoil (open item in the recoil handoff), so
  absolute degrees are not derived; the ratio between states is what the exponent tiers
  predict and what is compared.
- Clip hashes (SHA-256, first 16 hex): Bipod_Mounted 33122dd4ccf87eca, Bipod_Standing
  8a4b60d5607f8901, ClassicGripPod_Mounted 53fe1b70858b7de9, ClassicGripPod_Standing
  359419086ae10339, NoBipod_Mounted f1516004e45cb757, NoBipod_Standing f3275a4067d3c7af,
  PTTGripPod_Mounted 78c3762ed00ee9bb, PTTGripPod_Standing a36efd53b9207860,
  QDGripPod_Mounted 80f36afeacbce58d, QDGripPod_Standing a9cc48e120c1e33e.
