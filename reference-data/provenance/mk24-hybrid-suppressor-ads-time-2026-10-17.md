# MK24 ADS transition timing, Hybrid Suppressor clip (numbers only)

Folder: C:\Users\royal\AppData\Local\Temp\claude\C--Users-royal-Documents-BF6-Datamining\d7ba6e97-39eb-4dc9-9d63-37248eaa6487\scratchpad\ads-measure\ (scripts: mag.py, trans.py, summ.py; examples: ex_*.png). Optic is the Mini Flex 1x reflex (per correction), so zoom change is small; scene signal below is dominated by the weapon model moving to/from centre.

## Method
- Probe: 2560x1440 h264, 4050 packets/frames (ffprobe nb_frames 4050), r_frame_rate 120/1. Frame timestamps are jittery (median step 8.33 ms, 1-99 percentile 7.28-9.31 ms) plus one 496 ms gap at the file start. Extracted with -fps_mode passthrough (no duplication/dropping), so frame index = native frame. All durations = frame count/120*1000; PTS-based ms given alongside and differs by under 2 ms.
- Stored: 320x180 gray (whole frame) and 400x300 full-res RGB centre crop (x1080,y570) for all 4050 frames.
- Signal (a), scene/weapon motion: mean abs difference between consecutive 320x180 frames (dd[i] = frame i vs i-1). Start = first frame i with dd[i]>2.0 and dd[i+1]>2.0 (first changed frame). End (primary, "strict") = first frame e with median(dd[e+1..e+6])<0.5 and max<2.0, i.e. no further change for 6 frames. Loose end uses median<1.0. Duration = end - start (frames). A third variant, p05-p95, is first/last frame where the frame has moved 5%/95% of the way (mean abs distance) to the settled frame e+10. (A periodic 1.1-1.5 step in dd every 30 frames exists in the clip and was ignored by the max<2.0 rule.)
- Signal (b), spread indicator (magenta crosshair here, not green): magenta pixel mask in the crop; its vertical extent is the indicator size. In ADS it is absent (count 0). Hip: extent 117 px (None, first hip periods), ~151 px in L/S/K hip periods (also 115-117 in some). Hip->ADS: indicator vanishes in a single frame at full hip size (no contraction visible), 1-2 frames after scene start (10 for the first K entry, which follows a 9-frame fade of the indicator at 3447-3455). ADS->hip: indicator appears 3-5 frames after scene start at extent ~31 px and grows; reaches its full hip size 21-25 frames after scene start (column "ind full").
- Group boundaries come from menu screens (muzzle select screen, title text read at: frame 940-1000 NONE; 1060-1180 and 2000-2120 Hybrid Suppressor (L); 2180-3100 (S); 3160-3220 (K)). Game segments (frames, 0-based): None 246-885, L 1265-1978, S 2342-3037, K 3336-4049; menus/black between them (0-245, 886-1264, 1979-2341, 3038-3335). Each game segment opens with a bright fade-in (exposure), then three hip->ADS and three ADS->hip transitions (K: four hip->ADS, the last cut off by video end).

## Per transition (frames; ms = frames/120*1000)
Strict end (primary). start / end / frames / ms / pts-ms | loose frames | p05-p95 frames | indicator event frames after start (appear or vanish; full size)

None
- hip>ADS 297 / 357 / 60 / 500.0 / 500.0 | 59 | 56 | vanish +20  AMBIGUOUS: overlaps the post-menu exposure fade-in; excluded from stats
- ADS>hip 383 / 423 / 40 / 333.3 | 31 | 38 | appear +5, full +24  (start near end of fade-in, flagged slightly ambiguous, kept)
- hip>ADS 472 / 513 / 41 / 341.7 | 35 | 42 | vanish +1
- ADS>hip 563 / 601 / 38 / 316.7 | 30 | 37 | +4, +24
- hip>ADS 670 / 710 / 40 / 333.3 | 34 | 40 | +2
- ADS>hip 757 / 793 / 36 / 300.0 | 32 | 39 | +5, +25

L
- hip>ADS 1394 / 1434 / 40 / 333.3 | 37 | 44 | +2
- ADS>hip 1478 / 1513 / 35 / 291.7 | 30 | 36 | +4, +21
- hip>ADS 1566 / 1606 / 40 / 333.3 | 36 | 42 | +2
- ADS>hip 1658 / 1694 / 36 / 300.0 | 29 | 37 | +4, +22
- hip>ADS 1764 / 1804 / 40 / 333.3 | 35 | 41 | +1
- ADS>hip 1860 / 1895 / 35 / 291.7 | 31 | 38 | +4, +24

S
- hip>ADS 2488 / 2528 / 40 / 333.3 | 38 | 40 | +2
- ADS>hip 2566 / 2602 / 36 / 300.0 | 30 | 38 | +4, +24
- hip>ADS 2658 / 2697 / 39 / 325.0 | 35 | 40 | +2
- ADS>hip 2746 / 2781 / 35 / 291.7 | 29 | 38 | +4, +21
- hip>ADS 2834 / 2874 / 40 / 333.3 | 34 | 41 | +2
- ADS>hip 2942 / 2977 / 35 / 291.7 | 31 | 38 | +5, +21

K
- hip>ADS 3446 / 3486 / 40 / 333.3 | 40 | 38 | +10 (indicator fade 3447-3455)
- ADS>hip 3527 / 3564 / 37 / 308.3 | 31 | 38 | +5, +24
- hip>ADS 3616 / 3656 / 40 / 333.3 | 35 | 40 | +1
- ADS>hip 3710 / 3746 / 36 / 300.0 | 29 | 38 | +3, +24
- hip>ADS 3810 / 3850 / 40 / 333.3 | 36 | 40 | +2
- ADS>hip 3902 / 3937 / 35 / 291.7 | 31 | 38 | +3, +23
- hip>ADS 4014 / not settled: video ends 35 frames after start (4049); excluded

## Per muzzle summary (frames, ms)
Hip->ADS, primary (strict end):
| muzzle | n | median | min | max |
|---|---|---|---|---|
| None | 2 (3rd excluded, fade-in) | 40.5 f = 337.5 ms | 40 f = 333.3 | 41 f = 341.7 |
| L | 3 | 40 f = 333.3 ms | 40 f = 333.3 | 40 f = 333.3 |
| S | 3 | 40 f = 333.3 ms | 39 f = 325.0 | 40 f = 333.3 |
| K | 3 (4th cut off) | 40 f = 333.3 ms | 40 f = 333.3 | 40 f = 333.3 |

Hip->ADS, loose end (median<1.0): None 2 values 35/34 f (median 34.5 = 287.5 ms; min 34, max 35); L median 36 f = 300.0 (35-37); S median 35 f = 291.7 (34-38); K median 36 f = 300.0 (35-40).
Hip->ADS, p05-p95: None 42/40 f (median 41 = 341.7 ms); L median 42 f = 350.0 (41-44); S median 40 f = 333.3 (40-41); K median 40 f = 333.3 (38-40).

ADS->hip (reported separately), primary:
| muzzle | n | median | min | max |
|---|---|---|---|---|
| None | 3 | 38 f = 316.7 ms | 36 f = 300.0 | 40 f = 333.3 |
| L | 3 | 35 f = 291.7 ms | 35 f = 291.7 | 36 f = 300.0 |
| S | 3 | 35 f = 291.7 ms | 35 f = 291.7 | 36 f = 300.0 |
| K | 3 | 36 f = 300.0 ms | 35 f = 291.7 | 37 f = 308.3 |
ADS->hip loose: None 31 (30-32), L 30 (29-31), S 30 (29-31), K 31 (29-31) frames. p05-p95: None 38 (37-39), L 37 (36-38), S 38 (38-38), K 38 (37-38).

## Ambiguity and duplicates
- Ambiguous: group None first hip>ADS (fade-in overlap, 60 f); group None first ADS>hip start (383) sits just after fade-in ends. Start/end choice moves values: strict vs loose end differs by 4-9 frames; p05-p95 spans differ by up to 4 frames. Frame-step quantisation is 8.33 ms; the start frame is exact to +-1 frame (indicator event offsets up to +5).
- Duplicated frames: frames with dd<0.005 in game segments: 11 of 2764 (0.40%); dd<0.02: 72 (2.6%, mostly static ADS holds); inside the 24 measured transitions: 0 frames with dd<0.3 (0%). Packet count 4050 = ffprobe count; no dropped or repeated timestamps detected beyond the 496 ms gap at file start.
- Frame-range summary for muzzle assignment: None 246-885, L 1265-1978, S 2342-3037, K 3336-4049.
