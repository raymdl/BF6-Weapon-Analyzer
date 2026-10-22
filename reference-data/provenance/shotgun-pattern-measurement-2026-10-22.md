# Shotgun pellet pattern measurement, 22 October 2026

Operator recordings: `reference-data/Recordings/10222026/Shotguns/` (local only, not
tracked). Client 2.1.1.0 hotfix of 22 October 2026, Firing Range, flat target wall
20 m from the firing position, 2560x1440, 103° horizontal field of view in hip
view, Mini Flex 1.00x for every ADS set. Each set is one video at 120 fps plus two
screenshots: `_1` taken from the firing position in hip view after the shells, `_2`
a closer view used only to count pellets.

The default shotgun load, #01 Buck (16 pellets), is what the Firing Range's loadout
bar calls **Buckshot** (FMJ on the M87A1 bar). The KS-18K and DB-12 sets were
recorded as `00Buck` and renamed to `01Buck` afterwards: their bars read Buckshot
and the shells carry 13 to 17 decals. The M87A1 `01Buck` set is #01 Buck and its
`00Buck` set is the newer 8-pellet #00 Buck.

## Method

1. Screenshot `_1` matches the video's final hip-view frame to within a few pixels
   (mean absolute difference 12.8 of 255 against the M87A1 ADS #01 Buck video), so
   it was taken from the firing position. Pixels convert to degrees through the hip
   field of view: `deg = atan(px / F)`, `F = 1280 / tan(51.5°) = 1017.4 px`.
2. Decals: inside the dark wall panel (x 1065–1520, y 470–680 of the screenshot) a
   pixel is a decal when it is more than 14 levels brighter than an 8 px Gaussian
   background; connected components of 1 to 120 px are blobs. Blobs within 22 px of
   each other form one shell's pattern (single-link). Groups along the panel's top
   or bottom edge are frame noise and are dropped.
3. Per shell: centre = mean of its blobs; `maxR` = largest blob distance from the
   centre; `rms` = root-mean-square distance. A decal can split into two or three
   blobs and overlapping pellets merge, so blob counts are near, not equal to, the
   pellet count.
4. Aim direction per shell (hip sets and rapid strings): shot frames are the
   frames where the ammo counter crop (x 2200–2290, y 1270–1340) changes. Two
   120x120 templates cut from the screenshot at the panel's top-left and top-right
   corners are matched in the frame two frames before the shot (search window
   ±300 px); their common shift gives the aim point in screenshot coordinates. When
   the two corners disagree by more than 20 px the top-left match is used.
5. Rapid strings: each screenshot decal is assigned to the nearest aim point
   within 2.2 times the weapon's dispersion angle. Shells whose aim points sit
   closer than about a degree exchange pellets, which inflates their `maxR` and
   blob count; such shells are flagged.
6. ADS reticle brackets: in the ADS frame before a shot the green brackets flank
   the red dot 37.5 px apart (left 1260.7, right 1298.1, dot 1279.8). The ADS view
   is about 1.06 times the hip magnification (panel width 260 px against 245 px at
   half resolution), so the bracket half-gap is about 1.0°.
7. Hip reticle: the magenta ring in the hip screenshot has a median radius of
   41.4 px = 2.33° about the screen centre.

Scripts used: `pattern2.py`, `hip.py`, `hip2.py`, `rapid3.py` in the session
scratchpad (OpenCV, NumPy); not kept.

## ADS, slow fire, one shell per clean patch of wall

Pattern radius per shell in degrees (`maxR` / `rms`).

### M87A1 (Frosty firing-dispersion 1.0°)

| Load | Shells | maxR per shell | rms per shell | Pellet blobs in close-up |
|---|---|---|---|---|
| #01 Buck (16) | 7 | 1.01, 1.06, 1.10, 0.91, 0.85, 0.90, 1.00 | 0.63, 0.62, 0.62, 0.61, 0.56, 0.60, 0.65 | 17, 16, 15, 14, 14, 14, 13 |
| #00 Buck (8) | 7 | 0.88, 0.42, 0.87, 0.80, 0.63, 0.99, 1.01 | 0.58, 0.31, 0.58, 0.44, 0.34, 0.65, 0.64 | 8, 7, 7, 7, 7, 6, 5 |
| Flechette (16) | 7 | 1.05, 0.97, 0.89, 0.93, 0.98, 0.99, 1.03 | 0.61, 0.55, 0.49, 0.64, 0.67, 0.62, 0.62 | 17, 17, 16, 16, 14, 14 |
| Slugs (1) | 7 | one impact each (decal 0.2–0.4° across) | — | — |

The seven #01 Buck patterns differ in shape, so the pattern is random, not fixed.
For 16 points spread uniformly over a disc the rms/maxR ratio is about 0.73; the
measured ratio is about 0.61, which is what a uniform random radius with a random
angle gives (centre-weighted density). Merged decals near the centre bias this a
little, so it is likely rather than proven.

### KS-18K (0.8°) and DB-12 (1.2°), #01 Buck

| Weapon | Shells | maxR per shell | Median maxR |
|---|---|---|---|
| KS-18K | 9 | 0.82, 0.78, 0.80, 0.94, 0.78, 0.81, 0.66, 0.95, 0.75 | 0.80 |
| DB-12 | 16 | 1.17, 1.18, 1.17, 1.08, 1.23, 1.13, 1.14, 1.01, 1.20, 1.05, 1.03, 1.29, 1.01, 1.20, 1.15, 1.16 | 1.17 |

## Hipfire, standing, slow fire, M87A1

Per-shell pattern radius is unchanged from ADS; the hip spread moves the whole
shell instead. Centre offset = pattern centre minus the tracked aim direction two
frames before the shot, in degrees (x right, y down on screen).

| Load | maxR per shell | Centre offset per shell (x, y) | Radial offsets |
|---|---|---|---|
| #01 Buck | 1.07, 1.02, 0.98, 0.98, 0.83, 0.82, 0.82 | (−0.75, +0.15) (−1.25, −0.16) (−0.19, −0.01) (+1.11, −1.37) (+0.03, +0.12) (−1.28, +0.09) (+0.38, +0.04) | 0.76, 1.26, 0.19, 1.76, 0.12, 1.28, 0.38 |
| #00 Buck | 0.90, 1.01, 1.05, 0.94, 1.06, 1.08, 1.11 | (+1.18, +0.17) (+0.16, +0.78) (+1.23, −1.01) (−0.29, +0.02) (−0.02, −0.50) (+0.25, −1.11) (+0.27, −0.75) | 1.19, 0.80, 1.59, 0.29, 0.50, 1.14, 0.80 |
| Flechette | 0.96, 0.99, 0.84, 0.86, 0.85, 1.02, 0.99 | (+1.71, −1.16) (+0.01, +1.22) (−0.28, +1.52) (+0.10, +0.91) (−1.29, +0.31) (+1.23, −0.52) (+0.02, −1.56) (+0.89, −0.26) | 2.07, 1.22, 1.55, 0.92, 1.33, 1.34, 1.56, 0.93 |
| Slugs | single impacts | (−1.13, +0.31) (−1.71, −1.06) (+0.68, −0.82) (+0.13, +2.30); three bright impacts were not detected as blobs but sit 1–2° from their aim cross on the overlay | 1.17, 2.01, 1.07, 2.30 |

All 22 pellet shells and the four measured slugs landed within the 2.432° standing
hip spread, and the hip reticle ring measures 2.33°. The mean radial offset of about
1.0° is low for a uniform disc of 2.43° (expected 1.6°) and fits a centre-weighted
draw (expected 1.2°). The Flechette list has eight entries because one ammo-counter
event was a false detection; the extra row's offset is consistent with the rest.

## ADS rapid strings

Aim tracked per shot; decals assigned to the nearest aim point.

| Weapon | String | Shot gaps | Per-shell maxR about own centre | Pattern centre − aim (x, y) | Aim climb between shots |
|---|---|---|---|---|---|
| KS-18K | 1 | 200, 200 ms | 0.79, 0.70, 0.98* | (−0.02, +0.13) (−0.13, +0.11) (−0.12, −0.25) | −1.63°, −0.96° |
| KS-18K | 2 | 200, 417 ms | 1.00*, 0.81, 0.81 | (+0.33, +0.07) (+0.18, −0.02) (+0.30, +0.13) | −1.60°, −1.55° |
| DB-12 | 1 | 167, 633 ms (pump) | 1.12, 1.04, 1.54* | (+0.02, +0.20) (−0.28, +0.47) (+0.46, −0.11) | −5.61°, +3.09° |
| DB-12 | 2 | 167, 633, 167 ms | 1.24, 1.06, 0.93, 1.54* | (−0.15, −0.38) (−0.06, +0.39) (−0.31, −0.21) (−0.18, −0.61) | −2.90°, −0.20°, −1.77° |
| DB-12 | 3 | 167, 633, 167 ms | 1.21, 1.05, 1.21, 1.20 | (−0.43, −0.04) (+0.15, −0.18) (−0.50, +0.28) (−0.49, −0.15) | −2.53°, +0.23°, −2.64° |

`*` the shell's decal set includes a neighbour's pellets (19 to 30 blobs for a
16-pellet shell, aim points under about a degree apart). The clean shells stay at
the slow-fire radius: no widening between rapid shells, which matches the 0.001°
ADS per-shot spread increase in the source. The pattern centre follows the
recoil-moved aim to within 0.6°.

## Conclusions

- Each shell's pellets scatter inside a cone whose radius is the weapon's
  blueprint firing-dispersion angle (`shotgunDispersion` in
  `data/weapon_attributes.json`): 0.8° KS-18K, 1.0° M87A1, 1.2° DB-12. #01 Buck,
  #00 Buck and Flechette share it.
- The shell's own direction is the aim plus a draw inside the current spread cone
  (ADS 0.05°, hip standing 2.432° for the M87A1), the same cone the reticle draws.
  Spread does not widen the pellet pattern.
- Both draws look random with centre-weighted density (uniform radius, uniform
  angle), the sampler the site already uses for spread.
- Rapid ADS strings do not widen the pattern.
- Not measured: the M1014 (stored 1.0°, same as the M87A1), hip-fire patterns on
  the other three shotguns, moving spread.
