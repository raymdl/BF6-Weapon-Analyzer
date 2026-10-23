# ELR-40 CQB Suppressor recoil recordings, 23 October 2026 (client 2.1.1.0)

Operator recordings `reference-data/Recordings/10232026/ELR CQB Suppressor/ELR_CQBSuppressor.mp4`
(SHA-256 d1349aca2c7b4b1b..., 1,860 frames at 116.3 fps) and `ELR_FlashHider.mp4`
(2a92a86de2e6a5f9..., 2,533 frames at 120.0 fps), firing range, ADS, five single shots
each. The question is bug entry 27: the ELR-40's CQB Suppressor binds the bolt-action
recoil package (duration 0.066667 s instead of 0.025 s, recovery x1.728, recovery time
exponent -0.5) that its text does not state; the Flash Hider carries no recoil package.

Camera displacement was tracked with `scripts/recoil-recording-track.py` (`track`; the
yellow range-sign templates, dy > 0 is camera climb, pixels of the 2560x1440 frame; the
script is part of the deployed-recoil measurement of the same date). Per shot, the trace
is taken relative to the median of the three frames before the muzzle flash. Template
scores stayed at or above 0.65 (CQB) and 0.70 (Flash Hider) through the shots. The two
clips were captured at different frame rates, so frame offsets are given in milliseconds
as well.

## Per shot

Trough = lowest point before the peak (the bolt-action camera dip); peak = highest point
within 30 frames; settled = mean over frames +30 to +40 after the flash.

| Clip | Shot | Trough (px) | Peak (px) | Peak at | Settled (px) |
|---|---:|---:|---:|---:|---:|
| CQB Suppressor | 1 | -31.1 | 48.6 | +18 f (155 ms) | 36.4 |
| CQB Suppressor | 2 | -30.5 | 42.2 | +20 f (172 ms) | 25.9 |
| CQB Suppressor | 3 | -39.4 | 40.6 | +20 f (172 ms) | 28.7 |
| CQB Suppressor | 4 | -29.3 | 43.3 | +20 f (172 ms) | 26.8 |
| CQB Suppressor | 5 | -32.6 | 48.3 | +18 f (155 ms) | 36.6 |
| Flash Hider | 1 | -28.5 | 50.2 | +9 f (75 ms) | 28.3 |
| Flash Hider | 2 | -29.6 | 50.0 | +9 f (75 ms) | 29.6 |
| Flash Hider | 3 | -38.7 | 37.6 | +9 f (75 ms) | 28.9 |
| Flash Hider | 4 | -39.7 | 36.9 | +20 f (167 ms) | 28.9 |
| Flash Hider | 5 | -44.7 | 34.4 | +21 f (175 ms) | 28.7 |

Both clips show the bolt-action shape seen on the PSR: a dip, a first hump near +9
frames, a second hump near +20 frames, then a settle by +30. The difference is where the
weight sits. With the Flash Hider the first hump is the peak in shots 1 to 3 (50 px at
75 ms) and the second hump is lower (34 to 40 px). With the CQB Suppressor the first hump
is lower (28 to 39 px) and the second hump is the peak in every shot (41 to 49 px at 155
to 172 ms).

Mean of the five shots, dy against frames after the flash:

| Clip | +0 | +4 | +8 | +12 | +16 | +20 | +24 | +30 | +40 | +50 | +60 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CQB Suppressor | -17.0 | -11.6 | 32.5 | 18.6 | 25.7 | 43.4 | 27.6 | 32.6 | 28.5 | 22.3 | 12.6 |
| Flash Hider | -13.7 | -18.5 | 38.3 | 19.9 | 15.8 | 38.0 | 24.5 | 29.1 | 27.5 | 25.1 | 20.2 |

Mean peak: CQB 43.4 px at +20 frames; Flash Hider 40.8 px at +9 frames. Mean settled
level (+30 to +40): 30.9 against 28.9 px.

## Reading

A kick delivered over 67 ms instead of 25 ms would build more slowly and peak later,
which is the direction of the difference: the CQB Suppressor's kick reaches its peak about
90 ms later than the Flash Hider's, with the early hump suppressed. The net climb is
about the same, as it should be when the amount is unchanged (panel recoil 1.7 deg for
both). This is consistent with the recoil package being active on the CQB Suppressor. It
is not conclusive: five shots per clip, the camera animation's own oscillation, two
capture frame rates, and the player's mouse not separated from the camera.

The decisive comparison is the Long Suppressor, which carries the same package in the
data: if its trace matches the CQB Suppressor's and both differ from the Flash Hider's in
the same way, the package is active. A Lightened Suppressor clip on the L115 or M2010 ESR,
where the package is documented in the text, would give the reference shape.
