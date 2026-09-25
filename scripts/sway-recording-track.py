"""Track the fixed white range target left of the sight in ADS sway recordings.

Integer-pixel template matching of the target patch from the first analysed
frame (1.5 s after start) through 0.5 s before the end, by timestamp.
"""
import sys, json, hashlib, pathlib
import cv2
import numpy as np

# Target patch in 1920x1080 frames (white silhouette left of the sight).
X0, Y0, W, H = 690, 480, 70, 190
SEARCH = 60


def track(path):
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames, times = [], []
    ok, frame = cap.read()
    while ok:
        times.append(cap.get(cv2.CAP_PROP_POS_MSEC) / 1000)
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        ok, frame = cap.read()
    # Trim by timestamp: the recordings have a variable frame rate.
    keep = [g for g, t in zip(frames, times) if 1.5 <= t <= times[-1] - 0.5]
    tpl = keep[0][Y0:Y0 + H, X0:X0 + W]
    xs, ys, scores = [], [], []
    for g in keep:
        sx, sy = X0 - SEARCH, Y0 - SEARCH
        win = g[sy:Y0 + H + SEARCH, sx:X0 + W + SEARCH]
        res = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
        _, score, _, loc = cv2.minMaxLoc(res)
        xs.append(sx + loc[0]); ys.append(sy + loc[1]); scores.append(score)
    xs, ys = np.array(xs, float), np.array(ys, float)
    span = lambda a: float(np.percentile(a, 95) - np.percentile(a, 5))
    return {
        'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'fps': fps, 'frames': len(ys), 'minScore': float(min(scores)),
        'sdX': float(xs.std()), 'sdY': float(ys.std()), 'spanX': span(xs), 'spanY': span(ys),
    }


if __name__ == '__main__':
    folder = pathlib.Path(sys.argv[1])
    rows = [track(p) for p in sorted(folder.glob('*.mp4'))]
    for r in rows:
        print(f"{r['file']:32s} frames {r['frames']:4d} score>={r['minScore']:.3f}  "
              f"sdY {r['sdY']:.2f} spanY {r['spanY']:.0f}   sdX {r['sdX']:.2f} spanX {r['spanX']:.0f}")
    if len(sys.argv) > 2:
        pathlib.Path(sys.argv[2]).write_text(json.dumps(rows, indent=1), encoding='utf-8')
