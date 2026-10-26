"""Per-frame sway tracking for one 2560x1440 ADS clip (numpy only).
Usage: python scripts/stance-sway-track.py <clip.mp4> <out.json>. Frames are read from the
constant-rate raw stream ffmpeg emits; the first 2 s are skipped. Background (camera) and
weapon-body shifts come from FFT phase correlation against the first kept frame; the red
dot is the centroid of red pixels inside the sight window. Measured 26 Oct 2026
(reference-data/provenance/stance-sway-measurement-2026-10-26.md)."""
import subprocess, sys, json
import numpy as np

W, H = 2560, 1440
SKIP = 120                      # first 2 s at 60 fps (possible artifacting)
BG = (160, 600, 300, 2200)      # y0,y1,x0,x1 scene above the sight (HUD excluded)
GUN = (880, 1200, 1100, 1460)   # weapon body below the sight
DOT = (630, 780, 1160, 1400)    # sight window, colour


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)


def win(shape):
    return np.outer(np.hanning(shape[0]), np.hanning(shape[1]))


def phase(ref_f, img, w):
    F = np.fft.fft2((img - img.mean()) * w)
    R = ref_f * np.conj(F)
    R /= np.abs(R) + 1e-9
    r = np.fft.ifft2(R).real
    iy, ix = np.unravel_index(np.argmax(r), r.shape)
    def sub(a, i, n):
        l, c, h = a[(i - 1) % n], a[i], a[(i + 1) % n]
        d = l - 2 * c + h
        return i + (0.5 * (l - h) / d if d != 0 else 0)
    sy = sub(r[:, ix], iy, r.shape[0]); sx = sub(r[iy, :], ix, r.shape[1])
    if sy > r.shape[0] / 2: sy -= r.shape[0]
    if sx > r.shape[1] / 2: sx -= r.shape[1]
    # shift of img relative to ref (positive = content moved right/down)
    return -sx, -sy, r.max()


def main(path, out):
    rows = []
    ref = {}
    for i, fr in enumerate(frames(path)):
        if i < SKIP:
            continue
        g =fr.astype(np.float32).mean(axis=2)
        res = {'f': i}
        for name, (y0, y1, x0, x1) in (('bg', BG), ('gun', GUN)):
            c = g[y0:y1, x0:x1]
            if name not in ref:
                w = win(c.shape)
                ref[name] = (np.fft.fft2((c - c.mean()) * w), w)
            rf, w = ref[name]
            dx, dy, pk = phase(rf, c, w)
            res[name + '_x'], res[name + '_y'], res[name + '_pk'] = dx, dy, pk
        y0, y1, x0, x1 = DOT
        c = fr[y0:y1, x0:x1].astype(np.int16)
        m = (c[..., 0] > 170) & (c[..., 1] < 110) & (c[..., 2] < 110) & (c[..., 0] - c[..., 1] > 90)
        ys, xs = np.nonzero(m)
        if len(xs) >= 3:
            res['dot_x'], res['dot_y'], res['dot_n'] = x0 + xs.mean(), y0 + ys.mean(), len(xs)
        else:
            res['dot_x'] = res['dot_y'] = float('nan'); res['dot_n'] = 0
        rows.append(res)
    json.dump(rows, open(out, 'w'))
    print(path, len(rows), 'frames')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
