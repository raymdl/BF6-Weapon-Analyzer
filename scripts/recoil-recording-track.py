"""Camera-recoil tracker for BF6 firing-range recordings (2560x1440, 120 fps).

track:   for each mp4 in a folder, locate the yellow range signs (left "10", right "15")
         in a reference frame just before the first shot, then template-match each sign
         patch in every frame against that reference (sub-pixel parabolic peak).  Camera
         pitch-up moves the scene down, so dy > 0 is camera climb.  Shots come from the
         XOR of the thresholded magazine digits (x 2360-2485, y 1255-1345); the muzzle
         flash is the largest centre-crop brightness jump in [ammo-6, ammo+1].
summary: despike dy (single-frame template slips > 40 px), recompute the per-shot kick
         (peak within the shot interval minus the pre-flash level) and the cumulative
         climb before shots 5/10/15/20, print a markdown table.

    python scripts/recoil-recording-track.py track   <clip folder> <out folder> [peak window frames]
    python scripts/recoil-recording-track.py summary <out folder> <file prefix> [shots] [peak window frames]

First used for reference-data/Recordings/10232026 (M277 and PSR deployed-state clips);
results in reference-data/provenance/deployed-recoil-measurement-2026-10-23.md.
Needs opencv-python and numpy (plain python, not python -I).
"""
import sys, json, pathlib, hashlib
import cv2
import numpy as np

AMMO = (2360, 1255, 125, 90)    # x, y, w, h: the two magazine digits only
CENTRE = (1240, 680, 80, 80)
PATCH = 150                      # square patch side around each sign centroid


def yellow_centroid(bgr, x0, x1, y0, y1):
    roi = bgr[y0:y1, x0:x1].astype(int)
    b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
    m = (r > 140) & (g > 110) & (b < 90) & (r - b > 90)
    ys, xs = np.nonzero(m)
    if len(xs) < 50:
        return None
    return float(xs.mean() + x0), float(ys.mean() + y0), int(len(xs))


def subpix(res, x, y):
    dx = dy = 0.0
    if 0 < y < res.shape[0] - 1:
        a, b, c = res[y - 1, x], res[y, x], res[y + 1, x]
        d = a - 2 * b + c
        dy = 0.5 * (a - c) / d if d else 0.0
    if 0 < x < res.shape[1] - 1:
        a, b, c = res[y, x - 1], res[y, x], res[y, x + 1]
        d = a - 2 * b + c
        dx = 0.5 * (a - c) / d if d else 0.0
    return dx, dy


def read_all(path):
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    ok, f = cap.read()
    while ok:
        frames.append(f)
        ok, f = cap.read()
    return fps, frames


def ammo_mask(frame):
    x, y, w, h = AMMO
    g = cv2.cvtColor(frame[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY)
    return g > 150


def shots_from_ammo(frames, min_gap=5, min_xor=120):
    """Ammo digit change = XOR of the thresholded digit crop above min_xor pixels.
    A faint HUD pulse every 30 frames gives XOR counts below ~90; digit changes give
    several hundred.  min_gap frames between events (720 rpm = 10 frames at 120 fps)."""
    masks = [ammo_mask(f) for f in frames]
    events = []
    for i in range(1, len(masks)):
        d = int(np.count_nonzero(masks[i] ^ masks[i - 1]))
        if d > min_xor and (not events or i - events[-1] >= min_gap):
            events.append(i)
    return events


def centre_brightness(frames):
    x, y, w, h = CENTRE
    return np.array([cv2.cvtColor(f[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY).mean() for f in frames])


def analyse(path, peak_window=10**6):
    fps, frames = read_all(path)
    n = len(frames)
    gray = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in frames]
    ammo_events = shots_from_ammo(frames)
    bright = centre_brightness(frames)
    flashes = []
    for e in ammo_events:
        lo, hi = max(1, e - 6), min(n - 1, e + 1)
        jumps = bright[lo:hi + 1] - bright[lo - 1:hi]
        flashes.append(int(lo + np.argmax(jumps)))
    # duplicate-frame rate
    dup = sum(1 for i in range(1, n) if np.array_equal(gray[i][::8, ::8], gray[i - 1][::8, ::8]))

    ref_idx = max(0, flashes[0] - 6) if flashes else 10
    ref = frames[ref_idx]
    patches = {}
    left = yellow_centroid(ref, 350, 1000, 550, 950)
    right = yellow_centroid(ref, 1500, 2200, 550, 950)
    for name, c in (('left', left), ('right', right)):
        if c is None:
            continue
        cx, cy, _ = c
        x0, y0 = int(cx - PATCH / 2), int(cy - PATCH / 2)
        patches[name] = (x0, y0, gray[ref_idx][y0:y0 + PATCH, x0:x0 + PATCH])

    tracks = {}
    for name, (x0, y0, tpl) in patches.items():
        xs, ys, sc = [], [], []
        for g in gray:
            sx0, sx1 = max(0, x0 - 200), min(g.shape[1], x0 + PATCH + 200)
            sy0, sy1 = max(0, y0 - 250), min(g.shape[0], y0 + PATCH + 700)
            win = g[sy0:sy1, sx0:sx1]
            res = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
            _, s, _, (px, py) = cv2.minMaxLoc(res)
            ddx, ddy = subpix(res, px, py)
            xs.append(sx0 + px + ddx - x0)
            ys.append(sy0 + py + ddy - y0)
            sc.append(float(s))
        tracks[name] = {'dx': xs, 'dy': ys, 'score': sc, 'origin': (x0, y0)}

    # combine: mean of available patches where score >= 0.5, else the better one
    names = list(tracks)
    dy = np.zeros(n); dx = np.zeros(n); minscore = np.zeros(n)
    for i in range(n):
        good = [t for t in names if tracks[t]['score'][i] >= 0.5]
        use = good or [max(names, key=lambda t: tracks[t]['score'][i])]
        dy[i] = np.mean([tracks[t]['dy'][i] for t in use])
        dx[i] = np.mean([tracks[t]['dx'][i] for t in use])
        minscore[i] = min(tracks[t]['score'][i] for t in use)

    # per-shot metrics
    shots = []
    for k, f in enumerate(flashes):
        nxt = flashes[k + 1] if k + 1 < len(flashes) else min(n - 1, f + 12)
        nxt = min(nxt, f + peak_window)
        pre = dy[max(0, f - 1)]
        win = dy[f:nxt + 1] if nxt > f else dy[f:f + 1]
        peak = float(win.max()); peak_off = int(np.argmax(win))
        shots.append({'shot': k + 1, 'ammoFrame': ammo_events[k], 'flash': f, 'preDy': float(pre),
                      'peakDy': peak, 'peakOffset': peak_off, 'kick': float(peak - pre),
                      'dx': float(dx[f]), 'preDx': float(dx[max(0, f - 1)]),
                      'minScore': float(minscore[f:nxt + 1].min()) if nxt > f else float(minscore[f])})
    return {
        'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'fps': fps, 'frames': n, 'duplicateFrames': dup, 'refFrame': ref_idx,
        'signs': {'left': left, 'right': right},
        'shots': shots, 'dy': dy.round(2).tolist(), 'dx': dx.round(2).tolist(),
        'minScore': minscore.round(3).tolist(), 'flashes': flashes,
    }


def despike(dy, thr=40):
    dy = np.array(dy, float); out = dy.copy()
    for i in range(1, len(dy)):
        prev = out[max(0, i - 3):i]
        if not np.isfinite(prev).any():
            prev = out[:i][np.isfinite(out[:i])][-1:] if np.isfinite(out[:i]).any() else dy[i:i + 1]
        if abs(dy[i] - np.nanmedian(prev)) > thr: out[i] = np.nan
    return out


def cmd_track(folder, out, peak_window):
    folder, out = pathlib.Path(folder), pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    for p in sorted(folder.glob('*.mp4')):
        r = analyse(p, peak_window)
        (out / (p.stem + '.json')).write_text(json.dumps(r), encoding='utf-8')
        kicks = [s['kick'] for s in r['shots']]
        print(f"{p.name:34s} frames {r['frames']:4d} dup {r['duplicateFrames']:3d} shots {len(r['shots']):2d} "
              f"median kick {np.median(kicks) if kicks else float('nan'):6.1f}px", flush=True)


def cmd_summary(d, prefix, nshots, peakwin):
    d = pathlib.Path(d)
    rows = []
    for p in sorted(q for q in d.glob(prefix + '_*.json') if not q.stem.endswith('_summary')):
        r = json.load(open(p, encoding='utf-8')); dy = despike(r['dy']); fl = r['flashes'][:nshots]
        n_sp = int(np.isnan(dy).sum())
        kicks, pre = [], []
        for k, f in enumerate(fl):
            nxt = fl[k + 1] if k + 1 < len(fl) else min(len(dy) - 1, f + 12)
            nxt = min(nxt, f + peakwin)
            p0 = np.nanmedian(dy[max(0, f - 2):f + 1]); pre.append(p0)
            w = dy[f:nxt + 1]; kicks.append(np.nanmax(w) - p0 if np.isfinite(w).any() else np.nan)
        pre = np.array(pre) - pre[0]; kicks = np.array(kicks)
        g = lambda a, i: a[i] if len(a) > i else np.nan
        rows.append(dict(clip=p.stem.replace(prefix + '_', ''), shots=len(fl), spikes=n_sp,
                         first=kicks[0], kmed=np.nanmedian(kicks[1:]), kmean=np.nanmean(kicks[1:]),
                         r5=g(pre, 4), r10=g(pre, 9), r15=g(pre, 14), r20=g(pre, 19),
                         kicks=kicks.round(1).tolist(), pre=pre.round(1).tolist()))
    print("| clip | shots | spikes removed | first kick | median kick 2+ | mean kick 2+ | climb before shot 5 | 10 | 15 | 20 |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for x in rows:
        print(f"| {x['clip']} | {x['shots']} | {x['spikes']} | {x['first']:.1f} | {x['kmed']:.1f} | {x['kmean']:.1f} "
              f"| {x['r5']:.1f} | {x['r10']:.1f} | {x['r15']:.1f} | {x['r20']:.1f} |")
    (d / (prefix + '_summary.json')).write_text(json.dumps(rows, indent=1), encoding='utf-8')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'track':
        cmd_track(a[1], a[2], int(a[3]) if len(a) > 3 else 10**6)
    elif a and a[0] == 'summary':
        cmd_summary(a[1], a[2], int(a[3]) if len(a) > 3 else 20, int(a[4]) if len(a) > 4 else 10**6)
    else:
        print(__doc__)
