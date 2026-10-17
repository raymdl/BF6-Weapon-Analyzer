# Spread indicator measurement (numbers only)

Scratchpad: `spread-measure\`. Frames: all frames at native 120 fps (ffmpeg `-fps_mode passthrough`), PNG, crop 400x300 at (1080,600) for the reticle, 300x120 at (2160,1230) for the ammo counter. Per-frame results: `<video>inal.json` (gap per frame), `<video>\shots.json` (ammo events).

## What the indicator looks like
In ADS the red dot is flanked by two thin green vertical ticks / parentheses "( . )" at dot height. Size = horizontal distance between the left and right green bar centres, in pixels of the 2560x1440 frame. At rest they are faint and about 10-14 px apart; they widen to 40-50 px in the bipod videos. (Example crops: `example_annotated.png` (magenta lines = measured L/R bar positions), `example_zoom_idle_vs_shot_MK24rapid.png`, `example_bipod_brackets.png`.)

## Method
1. Shots: the ammo digits (thresholded bright-grey mask of the counter) are XOR-diffed frame to frame; a change above 120 pixels = ammo event (first frame of the change). Counts: BROD3 31, EF88 31, M277 rapid 21, M433 31, MK24 rapid 20 events; the two bipod videos have 47 events each = 20 + 20 shots plus 7 reload-refill events between the segments (ignored). Muzzle flash frame = largest brightness jump of the 80x80 centre crop in [ammo-6, ammo+1]; the ammo counter updates 1 to 6 frames after the flash (the table gives both). "Shot time" in seconds = frame/120.
2. Indicator: green-excess mask (G - max(R,B) >= 9, G >= 55), 4-pixel vertical runs grouped into bars; a left/right bar pair is accepted when both are within 5 px vertically, 6 to 90 px apart, their midpoint lies within 5 px (x) / 9 px (y) of a detected red dot. Size = R bar x - L bar x (sub-pixel centroid). If only one bar is found next to the dot, size = 2 x its distance from the dot ("one-sided", flagged). A reading must be supported by another reading within +-2 frames and within 3 px, otherwise dropped.
3. Per shot: "just before" = median of valid frames in the 4 frames before the flash; peak = maximum paired reading in the 16 frames from the flash up to the next shot's flash (peak offset given). Idle = median over [first flash-45, first flash-3) and [last flash+50, last flash+100).
4. Bipod segment identification: tiled 1 fps frames of both bipod videos. Segment 1 (first 20 shots, before the reload): low camera, weapon resting on the ledge behind the cover, bipod down = MOUNTED. After a reload (gun lowered, arms visible, ammo refills), segment 2 (last 20 shots): camera higher, weapon free of the ledge = UNMOUNTED. This order is the same for MK24 and M277. Mounted/unmounted is by visual judgement, not by a data field.

## Reliability summary
- Frame duplicates: the two Bipod videos contain many consecutive identical frames (76% (MK24) and 36% (M277) of frames in a sample were identical to the previous), so the true unique-frame rate is lower than 120 fps there; the Rapid videos are about 1-2% duplicated.
- Valid-measurement coverage (frames with a reading / total, paired readings): BROD3 309/858 (103), EF88 373/872 (145), M277 rapid 216/672 (35), M433 173/775 (11), MK24 rapid 312/638 (96), M277 bipod 495/1105 (294), MK24 bipod 748/1289 (474).
- Resolution of the measure is about +-1 px (tick width 1-3 px, video compression); idle and single-fire differences of 2-4 px are at that noise level.
- The Bipod videos are clearly measurable. The Rapid videos mostly are measurable only roughly. M433 rapid is effectively NOT reliably measurable (11 paired frames; 21 of 31 shots have no peak and 8 more have only a one-sided estimate). M277 rapid is largely one-sided (35 paired frames), 11 of 21 shots have no peak. BROD3 has no peak for 8 of 31 shots; its readings are mostly 2-6 frames per shot.
- In the Rapid videos the flash plus the target outline often covers the right tick: one-sided estimates are 2 x distance of the left tick from the dot and assume symmetry. Isolated outliers remain (e.g. M433 shot 31 peak 24.2, MK24 rapid shot 20 "before" 21.2, M277 rapid shot 6 "before" 28.2).
- Right bar can latch onto a green-tinged target edge (M277 unmounted frame 874 in the example image), so a few unmounted-segment peaks may be too high by a few px; individual drops (e.g. M277 unmounted shots 16-17 peak 40.9/36.0 after 47.6) may be detection artefacts rather than the indicator.
- Hip/lowered-weapon frames (reload, stand-up transition) are excluded automatically because no dot is found.

## Per-video tables
Units: pixels in the 2560x1440 frame. "-" = no valid reading.

### MK24_Rapid_Single_Fire all

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 105 | 103 | 12.6 | 4 | 12.6 | 14.0 | 4 | False | 10 |
| 2 | 124 | 122 | - | 0 | 9.4 | 14.3 | 5 | False | 10 |
| 3 | 144 | 142 | - | 0 | 9.6 | 11.8 | 8 | False | 6 |
| 4 | 164 | 163 | - | 0 | - | 13.9 | 9 | False | 12 |
| 5 | 184 | 183 | 10.0 | 4 | 10.6 | 12.7 | 4 | False | 10 |
| 6 | 207 | 203 | - | 0 | 10.0 | 12.7 | 7 | False | 7 |
| 7 | 224 | 223 | - | 0 | 10.0 | 14.0 | 3 | False | 10 |
| 8 | 245 | 243 | - | 0 | 9.5 | 12.5 | 7 | False | 8 |
| 9 | 264 | 263 | - | 0 | 9.0 | 12.0 | 7 | False | 10 |
| 10 | 285 | 283 | - | 0 | 9.4 | 13.1 | 8 | False | 6 |
| 11 | 304 | 302 | - | 0 | - | - | None | None | 0 |
| 12 | 325 | 323 | - | 0 | - | 15.9 | 8 | True | 3 |
| 13 | 344 | 343 | - | 0 | - | 10.9 | 1 | True | 2 |
| 14 | 364 | 363 | - | 0 | - | 23.0 | 9 | True | 10 |
| 15 | 384 | 382 | 12.3 | 4 | 13.8 | 11.6 | 7 | False | 3 |
| 16 | 404 | 403 | - | 0 | - | 10.7 | 9 | True | 3 |
| 17 | 424 | 423 | - | 0 | - | 12.9 | 8 | False | 10 |
| 18 | 444 | 442 | - | 0 | 9.6 | 14.9 | 5 | False | 9 |
| 19 | 464 | 463 | - | 0 | 14.0 | 12.0 | 7 | False | 7 |
| 20 | 485 | 483 | 21.2 | 1 | 22.0 | 13.3 | 3 | False | 10 |

idle before first shot [f-45,f-3)`: `(11.762731804095807, 12, 12) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(9.6215488215488, 5, 5) (value px, n valid frames, n of those one-sided)


### BROD3_Rapid_Single_Fire all

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 156 | 152 | - | 0 | 10.0 | 10.0 | 4 | False | 6 |
| 2 | 174 | 170 | - | 0 | 7.5 | 9.5 | 4 | False | 4 |
| 3 | 192 | 188 | - | 0 | 7.5 | 10.2 | 5 | True | 3 |
| 4 | 210 | 206 | - | 0 | 9.5 | 9.5 | 5 | False | 4 |
| 5 | 228 | 226 | - | 0 | - | - | None | None | 0 |
| 6 | 246 | 242 | - | 0 | - | 11.4 | 4 | False | 4 |
| 7 | 264 | 260 | - | 0 | - | 11.3 | 6 | True | 3 |
| 8 | 282 | 278 | - | 0 | - | - | None | None | 0 |
| 9 | 300 | 295 | - | 0 | - | 8.7 | 9 | False | 3 |
| 10 | 318 | 314 | - | 0 | 8.7 | 12.1 | 4 | False | 2 |
| 11 | 336 | 332 | - | 0 | - | 12.5 | 3 | False | 4 |
| 12 | 354 | 350 | - | 0 | - | 10.4 | 3 | False | 6 |
| 13 | 372 | 368 | 13.1 | 2 | 13.1 | 10.0 | 6 | False | 4 |
| 14 | 390 | 386 | - | 0 | 7.9 | 11.9 | 4 | True | 2 |
| 15 | 408 | 404 | - | 0 | - | 12.0 | 4 | False | 2 |
| 16 | 426 | 422 | - | 0 | - | 10.4 | 6 | False | 4 |
| 17 | 443 | 440 | - | 0 | 8.5 | 10.5 | 5 | False | 2 |
| 18 | 462 | 458 | - | 0 | - | 12.3 | 5 | False | 2 |
| 19 | 480 | 476 | - | 0 | - | - | None | None | 0 |
| 20 | 498 | 494 | - | 0 | - | - | None | None | 0 |
| 21 | 516 | 511 | - | 0 | - | 10.0 | 5 | False | 3 |
| 22 | 534 | 529 | - | 0 | - | 10.7 | 8 | False | 3 |
| 23 | 552 | 550 | - | 0 | - | 8.2 | 7 | False | 2 |
| 24 | 570 | 566 | - | 0 | 7.6 | 12.0 | 6 | False | 3 |
| 25 | 588 | 584 | - | 0 | - | - | None | None | 0 |
| 26 | 606 | 602 | - | 0 | - | 11.5 | 3 | False | 3 |
| 27 | 624 | 620 | - | 0 | - | - | None | None | 0 |
| 28 | 642 | 638 | - | 0 | - | 12.0 | 3 | False | 5 |
| 29 | 660 | 658 | - | 0 | - | 10.3 | 4 | False | 5 |
| 30 | 678 | 674 | - | 0 | 14.8 | - | None | None | 0 |
| 31 | 696 | 692 | - | 0 | - | - | None | None | 0 |

idle before first shot [f-45,f-3)`: `(9.777019340159256, 16, 16) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(10.0, 12, 1) (value px, n valid frames, n of those one-sided)


### EF88_Rapid_Single_Fire all

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 121 | 119 | - | 0 | - | 9.9 | 7 | False | 3 |
| 2 | 141 | 137 | - | 0 | 8.5 | 12.4 | 5 | False | 8 |
| 3 | 157 | 155 | - | 0 | 8.5 | 9.5 | 6 | False | 4 |
| 4 | 175 | 173 | - | 0 | 8.9 | 12.5 | 5 | False | 8 |
| 5 | 193 | 191 | - | 0 | 10.0 | 7.5 | 10 | False | 8 |
| 6 | 210 | 209 | - | 0 | 7.5 | 10.4 | 7 | False | 8 |
| 7 | 229 | 227 | 23.3 | 2 | 9.3 | 12.0 | 5 | False | 6 |
| 8 | 247 | 245 | - | 0 | 7.8 | 10.1 | 6 | True | 6 |
| 9 | 265 | 263 | - | 0 | 9.2 | 12.0 | 4 | False | 10 |
| 10 | 283 | 281 | 8.2 | 2 | 8.1 | 9.9 | 6 | False | 8 |
| 11 | 301 | 299 | - | 0 | 7.5 | 12.1 | 5 | False | 10 |
| 12 | 321 | 317 | - | 0 | 8.3 | 11.9 | 5 | False | 10 |
| 13 | 337 | 335 | - | 0 | 8.9 | 12.6 | 13 | True | 2 |
| 14 | 355 | 353 | 11.7 | 1 | 12.2 | 12.0 | 4 | False | 8 |
| 15 | 375 | 371 | - | 0 | 11.3 | 10.0 | 9 | False | 5 |
| 16 | 391 | 389 | - | 0 | 10.0 | 10.0 | 7 | False | 8 |
| 17 | 411 | 407 | - | 0 | 8.0 | 12.0 | 9 | False | 10 |
| 18 | 427 | 425 | - | 0 | 9.5 | 11.3 | 6 | False | 7 |
| 19 | 445 | 443 | - | 0 | 8.1 | 12.5 | 5 | False | 8 |
| 20 | 465 | 461 | - | 0 | 8.0 | 10.0 | 6 | False | 8 |
| 21 | 481 | 479 | - | 0 | 8.0 | 12.0 | 4 | False | 9 |
| 22 | 499 | 497 | - | 0 | 9.9 | 12.3 | 5 | False | 7 |
| 23 | 517 | 515 | - | 0 | 8.0 | 12.0 | 5 | False | 7 |
| 24 | 537 | 533 | - | 0 | 9.8 | 9.7 | 8 | False | 7 |
| 25 | 553 | 551 | - | 0 | 7.9 | 11.0 | 6 | False | 8 |
| 26 | 573 | 569 | - | 0 | 7.5 | 9.9 | 8 | False | 6 |
| 27 | 588 | 587 | - | 0 | 9.9 | 10.0 | 7 | False | 8 |
| 28 | 607 | 605 | 7.4 | 1 | 7.4 | 9.5 | 7 | False | 5 |
| 29 | 625 | 623 | - | 0 | 7.9 | 12.4 | 5 | False | 8 |
| 30 | 645 | 641 | - | 0 | 8.5 | 10.0 | 8 | False | 2 |
| 31 | 661 | 659 | - | 0 | 10.0 | 11.5 | 4 | False | 4 |

idle before first shot [f-45,f-3)`: `(13.113430127041738, 1, 1) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(12.42465256782424, 4, 4) (value px, n valid frames, n of those one-sided)


### M277_Rapid_Single_Fire all

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 115 | 110 | - | 0 | - | 12.3 | 11 | True | 4 |
| 2 | 135 | 131 | 16.3 | 2 | 11.8 | - | None | None | 0 |
| 3 | 155 | 151 | - | 0 | - | - | None | None | 0 |
| 4 | 175 | 170 | - | 0 | - | - | None | None | 0 |
| 5 | 195 | 191 | - | 0 | - | - | None | None | 0 |
| 6 | 215 | 211 | 28.2 | 2 | 28.2 | 14.5 | 13 | True | 4 |
| 7 | 235 | 231 | 12.9 | 4 | 13.0 | 21.3 | 13 | True | 2 |
| 8 | 255 | 251 | - | 0 | 21.3 | 14.9 | 12 | True | 4 |
| 9 | 275 | 272 | 14.5 | 2 | 14.8 | - | None | None | 0 |
| 10 | 295 | 291 | - | 0 | - | - | None | None | 0 |
| 11 | 315 | 311 | - | 0 | - | 11.7 | 11 | True | 11 |
| 12 | 335 | 331 | - | 0 | 11.4 | - | None | None | 0 |
| 13 | 355 | 351 | - | 0 | - | 12.6 | 15 | True | 1 |
| 14 | 375 | 371 | 10.9 | 2 | 11.4 | - | None | None | 0 |
| 15 | 395 | 391 | - | 0 | - | 15.0 | 8 | True | 4 |
| 16 | 415 | 411 | - | 0 | - | 10.9 | 15 | True | 1 |
| 17 | 435 | 431 | 10.7 | 1 | 10.8 | - | None | None | 0 |
| 18 | 455 | 451 | - | 0 | - | 16.6 | 15 | True | 3 |
| 19 | 475 | 471 | - | 0 | 14.1 | - | None | None | 0 |
| 20 | 495 | 491 | - | 0 | - | 13.9 | 12 | False | 2 |
| 21 | 515 | 511 | 12.1 | 1 | 12.1 | - | None | None | 0 |

idle before first shot [f-45,f-3)`: `(11.88597491448121, 24, 24) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(9.673913043478251, 12, 0) (value px, n valid frames, n of those one-sided)


### M433_Rapid_Single_Fire all

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 111 | 107 | - | 0 | - | - | None | None | 0 |
| 2 | 129 | 125 | - | 0 | - | - | None | None | 0 |
| 3 | 147 | 143 | - | 0 | - | 13.7 | 4 | True | 2 |
| 4 | 165 | 161 | - | 0 | - | - | None | None | 0 |
| 5 | 183 | 179 | - | 0 | - | - | None | None | 0 |
| 6 | 201 | 197 | - | 0 | - | - | None | None | 0 |
| 7 | 219 | 215 | - | 0 | - | 9.1 | 14 | True | 2 |
| 8 | 237 | 233 | 9.1 | 1 | 8.8 | 12.1 | 14 | True | 3 |
| 9 | 255 | 251 | 11.8 | 2 | 11.4 | 10.3 | 14 | True | 2 |
| 10 | 273 | 269 | 9.6 | 2 | 9.6 | - | None | None | 0 |
| 11 | 291 | 287 | - | 0 | - | - | None | None | 0 |
| 12 | 309 | 305 | - | 0 | - | - | None | None | 0 |
| 13 | 327 | 323 | - | 0 | - | - | None | None | 0 |
| 14 | 345 | 341 | - | 0 | - | - | None | None | 0 |
| 15 | 363 | 359 | - | 0 | - | - | None | None | 0 |
| 16 | 381 | 377 | - | 0 | - | - | None | None | 0 |
| 17 | 399 | 395 | - | 0 | - | 13.5 | 4 | True | 2 |
| 18 | 417 | 413 | - | 0 | - | - | None | None | 0 |
| 19 | 435 | 431 | - | 0 | - | - | None | None | 0 |
| 20 | 453 | 449 | - | 0 | - | 13.3 | 5 | False | 2 |
| 21 | 471 | 467 | - | 0 | - | - | None | None | 0 |
| 22 | 489 | 485 | - | 0 | - | - | None | None | 0 |
| 23 | 507 | 503 | - | 0 | - | 14.0 | 5 | False | 5 |
| 24 | 525 | 521 | 8.8 | 1 | 9.1 | - | None | None | 0 |
| 25 | 543 | 539 | - | 0 | - | - | None | None | 0 |
| 26 | 561 | 557 | - | 0 | - | - | None | None | 0 |
| 27 | 579 | 575 | - | 0 | - | - | None | None | 0 |
| 28 | 597 | 593 | - | 0 | - | 11.9 | 14 | True | 2 |
| 29 | 615 | 612 | - | 0 | 11.7 | - | None | None | 0 |
| 30 | 633 | 630 | - | 0 | - | 10.4 | 7 | True | 2 |
| 31 | 651 | 647 | - | 0 | 9.9 | 24.2 | 15 | True | 4 |

idle before first shot [f-45,f-3)`: `(None, 0, 0) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(9.551485551485541, 30, 23) (value px, n valid frames, n of those one-sided)


### MK24_Bipod_Mounted_vs_Unmounted mounted(seg1)

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 266 | 264 | - | 0 | - | - | None | None | 0 |
| 2 | 276 | 272 | - | 0 | - | 20.0 | 6 | False | 12 |
| 3 | 287 | 286 | 13.2 | 4 | 13.5 | 24.0 | 4 | False | 9 |
| 4 | 300 | 298 | 20.0 | 3 | 20.0 | 28.4 | 4 | False | 8 |
| 5 | 310 | 308 | 24.8 | 4 | 26.0 | 34.0 | 3 | False | 10 |
| 6 | 322 | 320 | 28.0 | 3 | 28.0 | 34.3 | 4 | False | 8 |
| 7 | 334 | 332 | 29.0 | 4 | 29.1 | 37.7 | 4 | False | 9 |
| 8 | 344 | 343 | 31.0 | 4 | 31.1 | 39.1 | 3 | False | 11 |
| 9 | 356 | 354 | 32.1 | 4 | 35.6 | 40.3 | 4 | False | 10 |
| 10 | 368 | 364 | 36.3 | 4 | 36.3 | 40.2 | 6 | False | 8 |
| 11 | 378 | 374 | 38.6 | 4 | 37.2 | 43.7 | 6 | False | 13 |
| 12 | 390 | 388 | 35.8 | 3 | 39.3 | 44.2 | 4 | False | 13 |
| 13 | 402 | 401 | 34.8 | 4 | 38.9 | 41.0 | 3 | False | 7 |
| 14 | 412 | 410 | 37.8 | 3 | 36.8 | 43.0 | 5 | False | 12 |
| 15 | 423 | 422 | 36.8 | 4 | 39.4 | 44.4 | 4 | False | 8 |
| 16 | 436 | 431 | 40.6 | 4 | 39.5 | 41.7 | 7 | False | 11 |
| 17 | 446 | 442 | 40.2 | 4 | 38.1 | 45.3 | 6 | False | 14 |
| 18 | 458 | 456 | 38.0 | 4 | 40.5 | 44.1 | 4 | False | 9 |
| 19 | 470 | 469 | 36.8 | 2 | 41.3 | 42.4 | 3 | False | 7 |
| 20 | 480 | 477 | 40.1 | 4 | 40.1 | 43.1 | 7 | False | 13 |

idle before first shot [f-45,f-3)`: `(12.14375700311922, 12, 12) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(8.6387300222803, 12, 12) (value px, n valid frames, n of those one-sided)


### MK24_Bipod_Mounted_vs_Unmounted unmounted(seg2)

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 898 | 897 | 14.7 | 3 | 14.7 | 11.0 | 7 | False | 6 |
| 2 | 908 | 907 | 10.7 | 2 | 10.7 | 17.0 | 5 | False | 7 |
| 3 | 920 | 918 | 15.2 | 4 | 15.4 | 22.1 | 6 | False | 5 |
| 4 | 932 | 929 | 20.1 | 4 | 20.6 | 26.5 | 6 | False | 5 |
| 5 | 942 | 941 | 25.5 | 2 | 26.0 | 30.7 | 5 | False | 5 |
| 6 | 953 | 952 | 27.8 | 3 | 30.4 | 34.8 | 4 | False | 9 |
| 7 | 966 | 964 | 27.1 | 3 | 31.5 | 38.1 | 4 | False | 5 |
| 8 | 976 | 971 | 36.5 | 4 | 31.1 | 33.6 | 13 | False | 6 |
| 9 | 990 | 986 | 27.8 | 4 | 23.6 | 40.7 | 4 | False | 7 |
| 10 | 1000 | 995 | 37.6 | 3 | 32.0 | 40.5 | 7 | False | 12 |
| 11 | 1009 | 1009 | 35.9 | 4 | 37.5 | 41.9 | 3 | False | 9 |
| 12 | 1022 | 1020 | 36.9 | 2 | 39.9 | 43.7 | 4 | False | 7 |
| 13 | 1033 | 1029 | 40.5 | 3 | 40.2 | 42.3 | 6 | False | 8 |
| 14 | 1044 | 1043 | 36.4 | 2 | 37.0 | 38.7 | 1 | False | 2 |
| 15 | 1056 | 1054 | - | 0 | 38.7 | 42.8 | 4 | False | 6 |
| 16 | 1068 | 1066 | 35.3 | 1 | 41.4 | 40.0 | 6 | False | 3 |
| 17 | 1080 | 1076 | 40.0 | 2 | 40.0 | 46.2 | 4 | False | 8 |
| 18 | 1090 | 1088 | 38.9 | 4 | 41.2 | 45.2 | 4 | False | 8 |
| 19 | 1102 | 1101 | 37.8 | 3 | 40.3 | 42.5 | 5 | False | 5 |
| 20 | 1112 | 1109 | 42.3 | 3 | 37.3 | 43.6 | 7 | False | 10 |

idle before first shot [f-45,f-3)`: `(14.654545454545428, 15, 7) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(10.180790960451986, 5, 4) (value px, n valid frames, n of those one-sided)


### M277_Bipod_Mounted_vs_Unmounted mounted(seg1)

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 181 | 175 | - | 0 | - | - | None | None | 0 |
| 2 | 191 | 186 | - | 0 | - | 10.3 | 4 | True | 3 |
| 3 | 200 | 197 | - | 0 | 10.0 | 9.9 | 1 | False | 6 |
| 4 | 210 | 207 | 8.0 | 3 | 9.0 | 12.1 | 3 | True | 3 |
| 5 | 220 | 216 | 11.9 | 1 | 12.0 | 11.6 | 10 | True | 5 |
| 6 | 230 | 227 | 10.8 | 3 | 10.3 | 14.6 | 3 | False | 8 |
| 7 | 240 | 237 | 13.1 | 4 | 13.8 | 14.8 | 7 | False | 8 |
| 8 | 250 | 246 | 14.5 | 4 | 14.0 | 14.6 | 8 | False | 7 |
| 9 | 260 | 256 | 14.6 | 3 | 14.6 | 15.6 | 6 | False | 9 |
| 10 | 270 | 267 | 13.2 | 4 | 14.0 | 16.0 | 4 | False | 7 |
| 11 | 280 | 276 | 14.1 | 4 | 14.6 | 16.5 | 7 | False | 10 |
| 12 | 290 | 286 | 15.4 | 4 | 14.7 | 16.0 | 9 | False | 8 |
| 13 | 300 | 296 | 14.5 | 4 | 14.4 | 17.7 | 4 | False | 7 |
| 14 | 310 | 307 | 12.7 | 3 | 14.4 | 18.1 | 3 | False | 7 |
| 15 | 320 | 316 | 14.9 | 4 | 16.1 | 16.2 | 2 | False | 10 |
| 16 | 330 | 326 | 16.1 | 4 | 16.1 | 16.0 | 4 | False | 8 |
| 17 | 340 | 336 | 14.0 | 3 | 14.1 | 17.0 | 4 | False | 7 |
| 18 | 350 | 346 | 15.7 | 4 | 15.7 | 17.8 | 4 | False | 10 |
| 19 | 358 | 356 | 16.0 | 4 | 16.0 | 16.0 | 4 | False | 9 |
| 20 | 370 | 367 | 13.8 | 4 | 13.9 | 16.3 | 3 | False | 14 |

idle before first shot [f-45,f-3)`: `(None, 0, 0) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(12.878048780487802, 7, 0) (value px, n valid frames, n of those one-sided)


### M277_Bipod_Mounted_vs_Unmounted unmounted(seg2)

| shot | ammo-change frame | flash frame | size just before (px, median of last 4 frames before flash) | n | size before (10-frame median) | peak size (px) | peak offset (frames after flash) | peak one-sided? | valid frames in window |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 754 | 748 | 15.1 | 4 | 15.0 | 13.9 | 11 | False | 8 |
| 2 | 764 | 760 | 13.7 | 4 | 12.4 | 19.3 | 5 | False | 2 |
| 3 | 774 | 771 | - | 0 | 18.0 | 24.4 | 3 | False | 7 |
| 4 | 784 | 780 | 22.9 | 4 | 22.2 | 31.4 | 4 | False | 8 |
| 5 | 794 | 790 | 27.7 | 4 | 27.7 | 34.4 | 4 | False | 6 |
| 6 | 805 | 800 | 32.7 | 3 | 31.8 | 40.0 | 4 | False | 4 |
| 7 | 814 | 811 | 35.9 | 1 | 37.0 | 36.2 | 8 | False | 4 |
| 8 | 824 | 820 | 30.5 | 4 | 30.5 | 42.4 | 4 | False | 7 |
| 9 | 834 | 831 | 38.1 | 4 | 39.0 | 43.1 | 5 | False | 6 |
| 10 | 844 | 841 | 38.9 | 4 | 38.9 | 44.6 | 3 | False | 9 |
| 11 | 854 | 851 | 43.0 | 3 | 43.1 | 42.0 | 7 | False | 2 |
| 12 | 865 | 861 | 41.1 | 2 | 41.1 | 43.2 | 3 | False | 5 |
| 13 | 874 | 871 | 42.2 | 1 | 42.7 | 46.6 | 3 | False | 3 |
| 14 | 884 | 880 | - | 0 | 44.4 | 46.0 | 8 | False | 4 |
| 15 | 894 | 890 | 43.9 | 3 | 44.8 | 49.0 | 4 | False | 4 |
| 16 | 904 | 900 | 47.6 | 2 | 47.6 | 40.9 | 3 | False | 2 |
| 17 | 914 | 911 | - | 0 | 40.0 | 36.0 | 4 | False | 3 |
| 18 | 924 | 921 | - | 0 | 34.6 | 47.1 | 3 | False | 7 |
| 19 | 935 | 931 | 41.8 | 3 | 41.8 | 50.5 | 3 | False | 6 |
| 20 | 945 | 940 | 44.4 | 3 | 45.6 | 47.6 | 5 | False | 4 |

idle before first shot [f-45,f-3)`: `(13.187907528156472, 25, 22) (value px, n valid frames, n of those one-sided)


idle after last shot [f+50,f+100)`: `(13.112719298245622, 5, 1) (value px, n valid frames, n of those one-sided)

