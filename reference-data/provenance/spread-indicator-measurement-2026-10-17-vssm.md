# VSSM (Folding Stock, full auto ~800 RPM) bipod mounted vs unmounted (numbers only)
Video 2560x1440, 120 tbr (avg 114.19 fps, 1162 frames, 10.18 s). Pipeline: shots2.py, final.py, report.py via run_vssm.py (adapted run_new.py); folder VSSM_Bipod_Mounted_vs_Unmounted, raw output out_vssm.txt. Units px; frames 0-based. Columns as in report-new.md.
Correction applied: clip is full auto, not semi-auto.

Segment choice: ammo-counter events (46): events 1-21 (frames 136-315) = counter 21 -> 00 (mounted, low camera, ledge, in 1 fps tiles); events 22-26 (621-696) = reload refill, counter 00 -> 20 (spurious, ignored); events 27-46 (835-1005) = counter 20 -> 00 (unmounted, higher camera, free weapon). So mounted 21 shots, unmounted 20 shots (counter starts at 20 after the reload). Verified on ammo crops and 1 fps tiles.

Shot interval (ammo-event spacing, frames): mounted 7,10,8,10,8,... alternating 8/10 (mean 8.9 = ~810 RPM); unmounted 8,12,6,10,8,10,... alternating 8/10 (mean 8.5 frames). Flash frames mounted 134-315, unmounted 834-1004. Ammo counter lags flash 0-6 frames.
Semi-auto recovery question: not applicable; shots are ~9 frames apart; peaks occur 0-10 frames after the flash, so the pulse is still rising/falling when the next shot fires (just-before values 12-52 px, not back to idle 10-14).

#### Coverage: frames=1162 withreading=726 paired=427 onesided=299 duplicated crop frames=8 (1%)
Mounted: 0 one-sided peaks, 1 shot without peak (shot 1), 3 shots without pre4 (2,5,10); unmounted: 0 one-sided peaks, 0 without peak, 1 without pre4 (shot 1).
Peaks at 5/10/20(last): mounted 38.0 / 52.1 / 52.4 (last shot 21: 52.0); unmounted 37.4 / 46.9 / 53.5 (last = shot 20).
Idle before first shot: mounted 14.4 (n=12, all one-sided), unmounted 13.5 (n=22, 14 one-sided). Idle after: mounted 12.4 (n=36, 27 one-sided), unmounted 10.0 (n=34, 8 one-sided).
Outliers: unmounted shot 14 pre4 41.6 (neighbours 51.5, 47.2); mounted shot 8 pre4 35.6 and shot 4 peak 24.0 at offset 0 (1 valid frame); mounted shots 4, 9, 13, 19, 21 peak offset 0-2 with few valid frames (1-4 for shots 4, 9, 17, 19 count 1,1,1,4). Several windows have only 1-3 valid frames (mounted 4, 7, 9, 17; unmounted 7, 8, 10, 11, 17).

#### VSSM_Bipod_Mounted_vs_Unmounted frames=1162 withreading=726 paired=427 onesided=299 dupcrop=8 (1%)
## VSSM mounted shots=21 flash frames 134-315 ammo frames 136-315
k ammo flash pre4 n pre10 peak off one nvalid
1 136 134 14.5 4 14.4 - None None 0
2 143 140 - 0 14.5 20.0 6 False 5
3 153 150 19.4 4 20.0 25.2 7 False 8
4 161 160 24.1 4 23.1 24.0 0 False 1
5 171 165 - 0 24.0 38.0 8 False 10
6 179 180 32.3 4 34.1 42.2 1 False 5
7 189 187 38.4 3 37.2 40.0 3 False 3
8 197 191 35.6 3 39.0 47.7 8 False 11
9 207 202 45.6 4 42.1 42.7 0 False 1
10 215 209 - 0 45.1 52.1 8 False 7
11 225 224 42.4 4 45.4 48.8 3 False 5
12 233 229 47.7 4 44.0 50.9 7 False 7
13 243 237 48.4 3 46.4 50.7 0 False 13
14 251 251 46.8 4 45.7 49.7 2 False 8
15 261 259 48.0 4 48.0 50.0 4 False 6
16 269 265 48.8 4 48.0 52.8 8 False 12
17 279 278 45.6 3 46.6 48.8 4 False 1
18 287 283 48.8 1 46.6 53.6 6 False 8
19 297 292 51.7 3 48.2 49.4 0 False 4
20 305 299 45.8 3 49.1 52.4 8 False 12
21 315 315 46.1 4 48.5 52.0 2 False 11
peak@5,10,20,last: ['38.0', '52.1', '52.4'] 52.0
shots without peak: 1  one-sided peaks: 0  no pre4: 3
idle before (14.405115089514084, 12, 12) idle after (12.426970205838572, 36, 27)
## VSSM unmounted shots=20 flash frames 834-1004 ammo frames 835-1005
k ammo flash pre4 n pre10 peak off one nvalid
1 835 834 - 0 - 12.8 5 False 4
2 843 840 12.0 4 12.0 22.0 5 False 6
3 855 850 18.3 3 18.3 22.0 10 False 4
4 861 862 20.7 3 19.1 33.7 1 False 5
5 871 867 30.5 4 28.5 37.4 7 False 10
6 879 879 33.1 4 33.8 42.7 2 False 6
7 889 887 39.8 3 39.8 42.9 5 False 3
8 897 893 42.1 3 41.0 43.5 9 False 3
9 907 904 42.9 2 42.4 44.7 7 False 9
10 915 916 41.3 3 41.0 46.9 5 False 3
11 925 922 46.8 3 44.5 49.3 5 False 3
12 933 928 47.9 2 46.7 51.8 7 False 7
13 943 937 51.5 2 45.6 50.6 0 False 5
14 951 945 41.6 2 47.9 50.1 8 False 6
15 961 955 47.2 2 46.0 51.9 8 False 7
16 969 964 45.5 4 46.3 53.5 7 False 11
17 979 975 50.6 4 48.6 52.0 8 False 1
18 987 984 52.0 1 51.1 53.7 5 False 7
19 997 991 50.9 4 50.7 51.1 0 False 11
20 1005 1004 47.4 4 45.6 53.5 3 False 11
peak@5,10,20,last: ['37.4', '46.9', '53.5'] 53.5
shots without peak: 0  one-sided peaks: 0  no pre4: 1
idle before (13.478677195321353, 22, 14) idle after (10.0, 34, 8)
