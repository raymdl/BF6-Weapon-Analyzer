"""Feature-based camera-recoil tracker for BF6 firing-range recordings (bolt-actions).
Companion to scripts/recoil-recording-track.py, whose single-patch template matching fails on
the PSR clips of 23 Oct 2026 (reference-data/Recordings/10232026/PSR Bipod); results in
reference-data/provenance/deployed-recoil-measurement-2026-10-23-psr.md.
    python scripts/recoil-recording-track-orb.py <clip folder> <out folder> [peak window frames] [name filter]
Needs opencv-python and numpy (plain python, not python -I).  Written by an Opus subagent.
Why: PSR shots produce camera translation + roll + a brief FOV punch, so single-patch
translation matching loses lock (scores ~0, hits search edge).  Changes:
 - Shots: muzzle-flash orange pixel count (r>150, r-g>50, r-b>60 in x700-1900,y400-1100),
   threshold 1000 px, 60-frame minimum gap.  (Ammo-digit XOR fires on bolt/reload animation.)
 - Camera: per shot, ORB features on the reference frame (flash-6) with the weapon, flash
   area and HUD masked out; matched in every frame flash-6..flash+40; RANSAC similarity
   transform (estimateAffinePartial2D).  The screen-centre point of the reference frame is
   mapped through it: dy = y shift (positive = scene moved down = camera pitched UP),
   dx = x shift (positive = scene moved right), plus roll (deg) and scale.
 - kick = max(dy[f..f+W]) - dy[f-1].
"""
import sys, json, pathlib, hashlib, math
import cv2, numpy as np
C = np.array([1280.0, 720.0, 1.0])
def mask_for(shape):
    m = np.full(shape, 255, np.uint8)
    m[380:, 750:1900] = 0          # weapon, sight, muzzle flash
    m[1150:, :] = 0                # bottom HUD / counter edge near weapon
    m[:260, 2300:] = 0             # perf overlay
    m[1100:, 2250:] = 0            # ammo HUD
    return m
def analyse(path, W):
    cap = cv2.VideoCapture(str(path)); fps = cap.get(cv2.CAP_PROP_FPS)
    gray = []; orange = []; ok, f = cap.read()
    while ok:
        roi = f[400:1100, 700:1900].astype(np.int16); b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
        orange.append(int(((r > 150) & (r-g > 50) & (r-b > 60)).sum()))
        gray.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)); ok, f = cap.read()
    n = len(gray); orange = np.array(orange)
    dup = sum(1 for i in range(1, n) if np.array_equal(gray[i][::8, ::8], gray[i-1][::8, ::8]))
    flashes = []
    for i in range(n):
        if orange[i] > 1000 and (not flashes or i-flashes[-1] > 60): flashes.append(i)
    orb = cv2.ORB_create(4000, fastThreshold=10); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    M = mask_for(gray[0].shape)
    shots = []
    for k, fl in enumerate(flashes):
        ref = fl-6; lo, hi = ref, min(n-1, fl+40)
        kr, dr = orb.detectAndCompute(gray[ref], M)
        rows = []
        for i in range(lo, hi+1):
            ki, di = orb.detectAndCompute(gray[i], None)
            mt = bf.match(dr, di)
            if len(mt) < 12: rows.append(None); continue
            p0 = np.float32([kr[m.queryIdx].pt for m in mt]); p1 = np.float32([ki[m.trainIdx].pt for m in mt])
            A, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=5000, refineIters=50)
            if A is None: rows.append(None); continue
            inl = inl.ravel().astype(bool); c = A @ C
            res = np.linalg.norm((p0[inl] @ A[:, :2].T + A[:, 2]) - p1[inl], axis=1)
            rows.append({'dx': float(c[0]-1280), 'dy': float(c[1]-720), 'roll': math.degrees(math.atan2(A[1, 0], A[0, 0])),
                         'scale': float(math.hypot(A[0, 0], A[1, 0])), 'inliers': int(inl.sum()), 'matches': len(mt),
                         'rmsPx': float(np.sqrt((res**2).mean()))})
        dy = np.array([r['dy'] if r else np.nan for r in rows]); dx = np.array([r['dx'] if r else np.nan for r in rows])
        o = fl-lo; win = dy[o:o+W+1]; pk = int(np.nanargmax(win)); dp = int(np.nanargmin(win))
        roll = np.array([r['roll'] if r else np.nan for r in rows]); sc = np.array([r['scale'] if r else np.nan for r in rows])
        inl = [r['inliers'] if r else 0 for r in rows][o-1:o+W+1]; rms = [r['rmsPx'] if r else 99 for r in rows][o-1:o+W+1]
        shots.append({'shot': k+1, 'flash': fl, 'refFrame': ref, 'preDy': float(dy[o-1]), 'peakDy': float(win[pk]),
                      'peakOffset': pk, 'kick': float(win[pk]-dy[o-1]), 'dip': float(win[dp]-dy[o-1]), 'dipOffset': dp,
                      'preDx': float(dx[o-1]), 'dxAtFlash': float(dx[o]), 'dxAtPeak': float(dx[o+pk]),
                      'settledDy': float(np.nanmean(dy[o+30:o+41])-dy[o-1]), 'settledDx': float(np.nanmean(dx[o+30:o+41])-dx[o-1]),
                      'dxJump': float(dx[o+pk]-dx[o-1]), 'dxMaxAbs': float(np.nanmax(np.abs(dx[o:o+W+1]-dx[o-1]))),
                      'rollMaxAbsDeg': float(np.nanmax(np.abs(roll[o:o+W+1]-roll[o-1]))),
                      'scaleRange': [float(np.nanmin(sc[o:o+W+1])), float(np.nanmax(sc[o:o+W+1]))],
                      'minInliers': int(min(inl)), 'maxRmsPx': float(max(rms)),
                      'traceStart': lo, 'trace': rows})
    return {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'fps': fps, 'frames': n,
            'duplicateFrames': dup, 'flashes': flashes, 'orangeP99': float(np.percentile(orange, 99)),
            'orangePeaks': [int(orange[f:f+4].max()) for f in flashes], 'shots': shots}
if __name__ == '__main__':
    folder = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 15
    files = sorted(folder.glob('*.mp4'))
    if len(sys.argv) > 4: files = [p for p in files if sys.argv[4] in p.name]
    for p in files:
        r = analyse(p, W); (out/(p.stem+'.json')).write_text(json.dumps(r), encoding='utf-8')
        print(p.name, r['frames'], 'dup', r['duplicateFrames'], 'flashes', r['flashes'], flush=True)
        for s in r['shots']:
            print('  %d fl%5d kick%7.2f off%2d dip%7.2f dxJ%7.2f dxMax%6.2f roll%5.2f scale%s inl%4d rms%.2f' % (s['shot'], s['flash'], s['kick'], s['peakOffset'], s['dip'], s['dxJump'], s['dxMaxAbs'], s['rollMaxAbsDeg'], [round(x, 4) for x in s['scaleRange']], s['minInliers'], s['maxRmsPx']), flush=True)
