// Loadout screenshot -> weapon + attachment per tile. Browser/Node port of recognize.py, tiles.py and panelcheck.py
// (prototype 2026-11-20); behaviour, thresholds and tie-breaking follow the Python so the two can be compared.
// createRecognizer({ cv, ocr, features, data, simulate }) -> async recognize({ data: RGBA, width, height })
//   ocr(image) -> [[box(4 points), text, score], ...]   (image: { data: RGBA, width, height })
//   simulate(builds) -> [{ reload, velocity, adsMs, mag, hipfire, precision, control, mobility } | { error }]
//   features: icon-features.json; data: import-data.json

const N = 64;
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const SPOTS = [[[-5.8, -2.3], ['muzzle']], [[-4.2, -1.9], ['barrel']], [[-3.1, -1.6], ['light', 'laser']],
  [[-2.7, -5.2], ['laser', 'light']], [[-1.1, -1.3], ['grip', 'laser', 'light']], [[-0.3, -5.5], ['laser', 'light']],
  [[0.0, 0.0], ['mag']], [[1.5, -0.5], ['ammo']], [[2.2, -5.5], ['sight']], [[5.1, -3.7], ['ergo']],
  // the optic accessory, right of the sight (its empty "OPTIC ACCESSORY +" marker sits at about (+3.9, -5.0) in 17 test shots)
  [[3.9, -5.5], ['accessory']]];
const SPOT_TOL = 0.45;
const BARS = ['hipfire', 'precision', 'control', 'mobility'];
const MISMATCH = 1.0;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const cmpTuple = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmp(a[i], b[i]); if (c) return c; } return a.length - b.length; };
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const magn = i => { const m = /^\d+/.exec(i); return m ? parseInt(m[0]) : null; };
const bbox = b => [Math.min(...b.map(p => p[0])), Math.min(...b.map(p => p[1])), Math.max(...b.map(p => p[0])), Math.max(...b.map(p => p[1]))];

export function createRecognizer({ cv, ocr, features, data, simulate, fastCosts = true }) {
  // icon templates: shape (uint8 0..255), aspect, line maps (0/1), unpacked once
  const sprites = features.sprites.map(s => {
    const unpack = str => { const by = b64(str), out = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) out[i] = (by[i >> 3] >> (7 - (i & 7))) & 1; return out; };
    const shape = b64(s.shape), l1 = unpack(s.lines), l2 = unpack(s.linesMirror);
    let shapeSum = 0, l1Sum = 0, l2Sum = 0;
    for (let i = 0; i < N * N; i++) { shapeSum += shape[i]; l1Sum += l1[i]; l2Sum += l2[i]; }
    return { shape, asp: s.asp, l1, l2, shapeSum, l1Sum, l2Sum };
  });
  const LIB = features.entries.map(([weapon, slot, id, pts, sp]) => ({ weapon, slot, id, pts, sprite: sp }));
  const WEAPONS = data.weapons, CHOICES = data.choices;

  // ---- OpenCV helpers ---------------------------------------------------------------------------------------------
  const roi = (mat, x0, y0, x1, y1) => mat.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0));
  const toImage = bgr => { const rgba = new cv.Mat(); cv.cvtColor(bgr, rgba, cv.COLOR_BGR2RGBA); const o = { data: new Uint8ClampedArray(rgba.data), width: rgba.cols, height: rgba.rows }; rgba.delete(); return o; };
  const ones3 = () => cv.Mat.ones(3, 3, cv.CV_8U);

  // tiles.py candidates: thin-bordered near-square boxes; size = [min, max] side in px (default from image height)
  function candidates(img, size) {
    const h = img.rows, [lo, hi] = size || [0.065 * h, 0.16 * h];
    const g = new cv.Mat(), e0 = new cv.Mat(), e = new cv.Mat(), k3 = ones3();
    cv.cvtColor(img, g, cv.COLOR_BGR2GRAY); cv.Canny(g, e0, 30, 90); cv.dilate(e0, e, k3);
    const k = Math.max(9, Math.trunc(0.03 * h));
    const all = [];
    const collect = src => {
      const cs = new cv.MatVector(), hier = new cv.Mat(), tmp = src.clone();
      cv.findContours(tmp, cs, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < cs.size(); i++) all.push(cs.get(i));
      tmp.delete(); hier.delete(); return cs;
    };
    const keepVecs = [collect(e)];
    // second pass on horizontal + vertical edges only: a diagonal leader line touching a tile merges its outline
    const kh = cv.Mat.ones(1, k, cv.CV_8U), kv = cv.Mat.ones(k, 1, cv.CV_8U), oh = new cv.Mat(), ov = new cv.Mat(), hv = new cv.Mat(), hvd = new cv.Mat();
    cv.morphologyEx(e, oh, cv.MORPH_OPEN, kh); cv.morphologyEx(e, ov, cv.MORPH_OPEN, kv); cv.bitwise_or(oh, ov, hv); cv.dilate(hv, hvd, k3);
    keepVecs.push(collect(hvd));
    let out = [];
    for (const c of all) {
      const r = cv.boundingRect(c), bw = r.width, bh = r.height;
      if (!(lo < bw && bw < hi && lo < bh && bh < hi && 0.75 < bw / bh && bw / bh < 1.35)) continue;
      const ap = new cv.Mat(); cv.approxPolyDP(c, ap, 0.04 * cv.arcLength(c, true), true);
      if (ap.rows >= 4 && ap.rows <= 8) out.push([r.x, r.y, bw, bh]);
      ap.delete();
    }
    for (const m of [g, e0, e, k3, kh, kv, oh, ov, hv, hvd]) m.delete();
    for (const c of all) c.delete();  // MatVector.get() hands out a Mat per contour; freeing the vector does not free them
    for (const cs of keepVecs) cs.delete();
    // squarer boxes win overlaps
    out = out.map((r, i) => [r, i]).sort((a, b) => cmpTuple([Math.abs(a[0][2] / a[0][3] - 1) > 0.15 ? 1 : 0, -a[0][2] * a[0][3], a[1]], [Math.abs(b[0][2] / b[0][3] - 1) > 0.15 ? 1 : 0, -b[0][2] * b[0][3], b[1]])).map(r => r[0]);
    const keep = [];
    for (const r of out) if (keep.every(q => iou(r, q) < 0.3)) keep.push(r);
    return keep;
  }
  function iou(a, b) {
    const ix = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    const i = ix * iy; return i / (a[2] * a[3] + b[2] * b[3] - i);
  }
  async function readCost(img, r) {
    const [x, y, bw, bh] = r;
    const c = roi(img, x + 2, y + 2, x + Math.trunc(0.45 * bw), y + Math.trunc(0.28 * bh)), big = new cv.Mat(), pad = new cv.Mat();
    cv.resize(c, big, new cv.Size(0, 0), 4, 4, cv.INTER_CUBIC);
    cv.copyMakeBorder(big, pad, 20, 20, 20, 20, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));
    const res = await ocr(toImage(pad)); c.delete(); big.delete(); pad.delete();
    for (const [, t, conf] of res || []) {
      const m = /^\s*(\d{1,2})/.exec(t.replace(/O/g, '0'));
      if (m) return [parseInt(m[1]), conf];
    }
    return [null, 0];
  }
  // Fast cost read (browser default): the cost sits in a known corner, so skip text detection and run the recogniser
  // alone, all tiles in one batch, on the corner cut just before the points glyph (a solid near-square blob that
  // otherwise reads as a trailing 0: "5" + glyph -> "50"). On the 196 tile candidates of the 20 test shots it agrees
  // with readCost on all but the top-right currency widget, which the edge filter drops; ~10x faster.
  function costCrop(img, [x, y, bw, bh]) {
    const c = roi(img, x + 2, y + 2, x + Math.trunc(0.45 * bw), y + Math.trunc(0.28 * bh));
    const g = new cv.Mat(), b = new cv.Mat(), lab = new cv.Mat(), st = new cv.Mat(), cen = new cv.Mat();
    cv.cvtColor(c, g, cv.COLOR_BGR2GRAY); cv.threshold(g, b, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    const n = cv.connectedComponentsWithStats(b, lab, st, cen); let cut = c.cols;
    for (let i = 1; i < n; i++) {
      const [x0, , w, h, a] = st.data32S.slice(i * 5, i * 5 + 5);
      if (x0 > 4 && h >= 0.25 * c.rows && h <= 0.7 * c.rows && w / h > 0.75 && w / h < 1.35 && a / (w * h) >= 0.5 && x0 < cut) cut = x0;
    }
    const d = roi(c, 0, 0, Math.max(4, cut - 1), c.rows), o = toImage(d);
    for (const m of [g, b, lab, st, cen, d, c]) m.delete();
    return o;
  }
  async function readCosts(img, boxes) {
    if (!ocr.readLines || !fastCosts) { const out = []; for (const r of boxes) out.push(await readCost(img, r)); return out; }
    if (!boxes.length) return [];
    return (await ocr.readLines(boxes.map(r => costCrop(img, r)))).map(([t, sc]) => {
      const m = sc >= 0.5 && /^\s*(\d{1,2})/.exec(t.replace(/O/g, '0'));
      // a lone 0: the game's slashed zero reads with low confidence when no other digit sits beside it (VSSM, 0.31)
      if (!m && sc >= 0.2 && /^\s*[0OoØθ]\s*$/.test(t)) return [0, sc];
      return m ? [parseInt(m[1]), sc] : [null, 0];
    });
  }
  async function findTiles(img) {
    const cs = candidates(img), costs = await readCosts(img, cs), out = [];
    cs.forEach((r, i) => { const [cost, conf] = costs[i]; if (cost !== null && cost % 5 === 0 && cost <= 60) out.push({ box: r, cost, conf }); });
    return out;
  }

  // ---- icon shape -------------------------------------------------------------------------------------------------
  // mask (Uint8Array 0/1, W x H) -> { sq: Uint8Array N*N (0..255), asp } (recognize.py to_square)
  function toSquare(mask, W, H) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { sq: new Uint8Array(N * N), asp: 1.0, empty: true };
    const w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.max(w, h), oy = Math.trunc((s - h) / 2), ox = Math.trunc((s - w) / 2);
    const pad = cv.Mat.zeros(s, s, cv.CV_8U);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pad.data[(y + oy) * s + x + ox] = mask[(y + y0) * W + x + x0] * 255;
    const r = new cv.Mat(); cv.resize(pad, r, new cv.Size(N, N), 0, 0, cv.INTER_AREA);
    const sq = new Uint8Array(r.data); pad.delete(); r.delete();
    return { sq, asp: w / h };
  }
  function linesToSquare(mask, W, H) {
    const { sq, asp, empty } = toSquare(mask, W, H);
    if (empty) return { sq: new Uint8Array(N * N), asp };
    const b = cv.matFromArray(N, N, cv.CV_8U, Array.from(sq, v => (v > 40 ? 1 : 0))), d = new cv.Mat(), k = ones3();
    cv.dilate(b, d, k); const out = new Uint8Array(d.data); b.delete(); d.delete(); k.delete();
    return { sq: out, asp };
  }
  function fill(mask, W, H) {
    const m = cv.matFromArray(H, W, cv.CV_8U, Array.from(mask)), c = new cv.Mat(), k = ones3();
    cv.morphologyEx(m, c, cv.MORPH_CLOSE, k);
    const ff = c.clone(), z = cv.Mat.zeros(H + 2, W + 2, cv.CV_8U);
    cv.floodFill(ff, z, new cv.Point(0, 0), new cv.Scalar(1));
    const out = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = c.data[i] | (1 - ff.data[i]);
    for (const x of [m, c, k, ff, z]) x.delete();
    return out;
  }
  function percentile99(arr) {
    const a = Float64Array.from(arr).sort(), pos = 0.99 * (a.length - 1), lo = Math.floor(pos), hi = Math.min(lo + 1, a.length - 1);
    return a[lo] + (a[hi] - a[lo]) * (pos - lo);
  }
  function components(m, W, H) {
    const src = cv.matFromArray(H, W, cv.CV_8U, Array.from(m)), lab = new cv.Mat(), st = new cv.Mat(), cen = new cv.Mat();
    const n = cv.connectedComponentsWithStats(src, lab, st, cen);
    const stats = []; for (let i = 0; i < n; i++) stats.push(Array.from(st.data32S.slice(i * 5, i * 5 + 5)));
    const labels = new Int32Array(lab.data32S); for (const x of [src, lab, st, cen]) x.delete();
    return { n, stats, labels };
  }
  // recognize.py tile_icon
  function tileIcon(gray, box, hovered, top = 0.24) {
    const [x, y, bw, bh] = box;
    const ix0 = x + Math.trunc(0.08 * bw), ix1 = x + Math.trunc(0.92 * bw), iy0 = y + Math.trunc(top * bh), iy1 = y + Math.trunc(0.92 * bh);
    const W = ix1 - ix0, H = iy1 - iy0, g = new Uint8Array(W * H);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) g[yy * W + xx] = gray.data[(yy + iy0) * gray.cols + xx + ix0];
    for (const [tx0, ty0, tx1, ty1] of hovered) {  // blank tile-name text
      for (let yy = Math.max(0, ty0 - iy0); yy < Math.min(H, Math.max(0, ty1 - iy0)); yy++)
        for (let xx = Math.max(0, tx0 - ix0); xx < Math.min(W, Math.max(0, tx1 - ix0)); xx++) g[yy * W + xx] = 0;
    }
    const t = Math.max(60, Math.trunc(percentile99(g) * 0.45));
    let m = g.map(v => (v > t ? 1 : 0));
    let { n, stats: st, labels: lab } = components(m, W, H);
    const bandY = y + Math.trunc(0.24 * bh);
    const band = st.slice(1).filter(s => s[1] + s[3] + iy0 < bandY);
    if (band.length) {  // cost digits found: blank their row through the points glyph after them (it can touch a sight's hood)
      const yb = Math.max(...band.map(b => b[1] + b[3])), xr = Math.max(...band.map(b => b[0] + b[2]));
      for (let yy = 0; yy < Math.min(H, yb + 1); yy++) for (let xx = 0; xx < Math.min(W, xr + Math.trunc(2 * yb) + 2); xx++) m[yy * W + xx] = 0;
      ({ n, stats: st, labels: lab } = components(m, W, H));
    }
    const keep = top < 0.2 ? new Uint8Array(W * H) : Uint8Array.from(m);  // sight crop only: multi-part icons (ammo) need every part
    for (let i = 1; i < n; i++) {  // tile-border specks at the crop edge stretch the icon box
      const [x0, y0, w0, h0, a0] = st[i];
      const speck = a0 < 6 && (x0 === 0 || y0 === 0 || x0 + w0 === W || y0 + h0 === H);
      // something bright behind the tile showing through its edge (the light streak across the top row): icons end
      // well above the crop's bottom edge and never run down its right edge
      const streak = top >= 0.2 && (y0 + h0 === H || (x0 + w0 === W && h0 > 0.8 * H));
      if (speck || streak) for (let p = 0; p < W * H; p++) if (lab[p] === i) keep[p] = 0;
    }
    if (n > 1 && top < 0.2) {  // keep strokes near the largest one: drops leader-line fragments crossing the tile
      let big = 1, bv = -Infinity;
      for (let i = 1; i < n; i++) { const v = st[i][4] * (st[i][1] + st[i][3] + iy0 >= bandY ? 1 : 0); if (v > bv) { bv = v; big = i; } }
      const [bx, by, bw2, bh2] = st[big], mx = Math.trunc(0.35 * bw2) + 4, my = Math.trunc(0.35 * bh2) + 4;
      for (let i = 1; i < n; i++) {
        const [x0, y0, w0, h0, a0] = st[i];
        if (y0 + h0 + iy0 < bandY) continue;  // wholly in the cost band
        if (a0 >= 6 && x0 >= bx - mx && y0 >= by - my && x0 + w0 <= bx + bw2 + mx && y0 + h0 <= by + bh2 + my) for (let p = 0; p < W * H; p++) if (lab[p] === i) keep[p] = 1;
      }
    }
    const filled = toSquare(fill(keep, W, H), W, H), lines = linesToSquare(keep, W, H);
    return { sq: filled.sq, asp: filled.asp, lsq: lines.sq };
  }
  function shapeScore(icon, sp) {
    let mn = 0, mx = 0, li1 = 0, li2 = 0, ls = 0;
    for (let i = 0; i < N * N; i++) {
      const a = icon.sq[i], b = sp.shape[i]; if (a < b) { mn += a; mx += b; } else { mn += b; mx += a; }
      const l = icon.lsq[i]; ls += l; if (l) { li1 += sp.l1[i]; li2 += sp.l2[i]; }
    }
    const iouS = (mn / 255) / (mx / 255 + 1e-6);
    const line = Math.max(2 * li1 / (ls + sp.l1Sum + 1e-6), 2 * li2 / (ls + sp.l2Sum + 1e-6));
    return 0.4 * iouS + 0.6 * line - 0.35 * Math.abs(Math.log(Math.max(icon.asp, 1e-3) / Math.max(sp.asp, 1e-3)));
  }

  // ---- text-based reads ---------------------------------------------------------------------------------------------
  const names = new Map(); for (const w of WEAPONS) names.set(norm(w.name), w);
  function identifyWeapon(texts) {
    for (const t of texts) { const n = norm(t); if (n.startsWith('customize') && names.has(n.slice(9))) return [names.get(n.slice(9)).id, 'header']; }
    for (const t of texts) {  // header cut at its end ("CUSTOMIZE SVK-8." for SVK-8.6)
      const n = norm(t), rest = n.slice(9);
      const hits = [...names].filter(([k]) => n.startsWith('customize') && rest.length >= 3 && k.length - rest.length >= 1 && k.length - rest.length <= 2 && k.startsWith(rest));
      if (hits.length === 1) return [hits[0][1].id, 'cut header'];
    }
    for (const t of texts) { const n = norm(t); for (const [k, w] of names) if (k.length >= 3 && n.endsWith(k) && n.length - k.length <= 10) return [w.id, 'partial header']; }
    for (const t of texts) {  // header cut at the screen edge: first letter(s) missing; digits alone (the "250" counter) never match
      const n = norm(t);
      const hits = [...names].filter(([k]) => n.length >= 3 && /[a-z]/.test(n) && [1, 2].includes(k.length - n.length) && k.endsWith(n));
      if (hits.length === 1) return [hits[0][1].id, 'cut header'];
    }
    return [null, 'not found'];
  }
  function panelValue(res, label) {
    const lab = res.filter(([, t]) => norm(t) === label);
    if (!lab.length) return null;
    const [lx, ly] = bbox(lab[0][0]); let best = null;
    for (const [bb, t] of res) {
      const [x, y] = bbox(bb);
      if (Math.abs(x - lx) < 40 && y - ly >= 5 && y - ly < 100 && /^\d+$/.test(t.trim())) if (best === null || y < best[0]) best = [y, parseInt(t)];
    }
    return best && best[1];
  }
  // panelcheck.py read_panel
  function readPanel(res) {
    const toks = res.map(([b, t]) => [bbox(b), t.trim()]); const out = {};
    for (const [[x0, y0, x1], t] of toks) {
      const k = t.toLowerCase().replace(/[^a-z]/g, '');
      if (BARS.includes(k) || k === 'mag') {
        let c;
        if (k === 'mag') c = toks.filter(([[bx0, by0], v]) => Math.abs(bx0 - x0) < 40 && by0 - y0 >= 5 && by0 - y0 < 100 && /^\d+$/.test(v)).map(([[, by0], v]) => [by0, v]);
        else c = toks.filter(([[bx0, by0], v]) => bx0 > x1 + 100 && Math.abs(by0 - y0) < 15 && /^\d+$/.test(v)).map(([[bx0], v]) => [-bx0, v]);
        if (c.length) {
          let v = parseInt(c.reduce((a, b) => (cmpTuple(b, a) < 0 ? b : a))[1]);
          if (BARS.includes(k) && v > 100) v %= 100;  // a leading-zero glyph misread as 1 ("077" -> "177")
          out[k] = v;
        }
      }
    }
    const rl = toks.filter(([, t]) => /^\d\.\d{3}S?$/.test(t));
    if (rl.length) {
      const [[, y0, x1], t] = rl[0]; out.reload = parseFloat(t.replace(/S+$/, ''));
      const row = toks.filter(([[bx0, by0], v]) => bx0 > x1 && Math.abs(by0 - y0) < 12 && /^[\d,]+$/.test(v)).map(([[bx0], v]) => [bx0, parseInt(v.replace(/,/g, ''))]).sort(cmpTuple);
      if (row.length >= 1) out.velocity = row[0][1];
      if (row.length >= 2) out.adsMs = row[1][1];
    }
    const used = toks.map(([, t]) => /^(\d{1,3})\/(\d{2,3})/.exec(t)).filter(m => m && parseInt(m[2]) >= 50 && parseInt(m[1]) <= parseInt(m[2]));
    if (used.length) out._pointsUsed = parseInt(used[0][1]);
    return out;
  }
  function mismatches(panel, sim) {
    if ('error' in sim) return null;
    const bad = [];
    for (const [k, v] of Object.entries(panel)) {
      const s = sim[k]; if (s === undefined || s === null || k.startsWith('_')) continue;
      const tol = k === 'reload' ? 0.0015 : 0.5;
      if (Math.abs(s - v) > tol) bad.push(`${k} ${v} vs ${Math.round(s * 1000) / 1000}`);
    }
    return bad;
  }
  // panelcheck.py check
  function check(wid, tiles, cands, panel, cap = 3000) {
    const idx = [...tiles.keys(), -1].filter(ti => cands.has(ti) && cands.get(ti).length);
    const combos = [], lists = idx.map(ti => cands.get(ti)), pos = lists.map(() => 0);
    if (lists.length) {
      outer: for (;;) {
        const pick = lists.map((l, i) => l[pos[i]]), slots = pick.map(p => p[1]);
        if (new Set(slots).size === slots.length) combos.push(pick);
        if (combos.length >= cap) break;
        for (let i = lists.length - 1; ; i--) { if (i < 0) break outer; if (++pos[i] < lists[i].length) break; pos[i] = 0; }
      }
    }
    if (!combos.length || !Object.keys(panel).length) return null;
    const sims = simulate(combos.map(c => ({ weapon: wid, atts: Object.fromEntries(c.filter(p => !p[1].startsWith('_')).map(p => [p[1], p[2]])) })));
    const ranked = [];
    combos.forEach((c, i) => {
      const m = mismatches(panel, sims[i]);
      // each panel mismatch costs more than any single icon call, but strong icons can outweigh one model disagreement
      if (m !== null) ranked.push([MISMATCH * m.length - c.reduce((a, p) => a + p[0], 0), m.length, c, m]);
    });
    if (!ranked.length) return null;
    ranked.sort((a, b) => a[0] - b[0]);
    const [r0, , c, m] = ranked[0];
    const same = (a, b) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1] && p[2] === b[i][2]);
    const ties = ranked.filter(r => Math.abs(r[0] - r0) < 0.05 && !same(r[2], c));
    const hi = idx.indexOf(-1);
    const exact = hi < 0 ? [] : [...new Map(ranked.filter(r => r[1] === 0).map(r => [r[2][hi][1] + '|' + r[2][hi][2], [r[2][hi][1], r[2][hi][2]]])).values()].sort(cmpTuple);
    return { pick: new Map(idx.map((ti, i) => [ti, c[i]])), mismatches: m, combos: combos.length, equalAlternatives: ties.length, hiddenExact: exact };
  }

  // ---- layout ---------------------------------------------------------------------------------------------------------
  function tileSpots(tiles) {
    let best = [0, null, null];
    for (const m of tiles) {
      const [mx, my, , mh] = m.box;
      const hits = tiles.map(t => {
        const dx = (t.box[0] - mx) / mh, dy = (t.box[1] - my) / mh;
        const s = SPOTS.find(([[sx, sy]]) => Math.abs(dx - sx) < SPOT_TOL && Math.abs(dy - sy) < SPOT_TOL);
        return s ? s[1] : null;
      });
      const n = hits.filter(h => h !== null).length;
      if (n > best[0]) best = [n, hits, m.box];
    }
    return best[0] >= 4 ? [best[1], best[2]] : [tiles.map(() => null), null];
  }
  async function secondLook(img, tiles) {
    const [hits, anchor] = tileSpots(tiles);
    if (!anchor) return [];
    const [mx, my, , mh] = anchor, H = img.rows, W = img.cols, found = [];
    for (const [[sx, sy], sl] of SPOTS) {
      if (hits.some(h => h === sl)) continue;  // a found tile sits on this spot
      const x0 = Math.trunc(mx + (sx - 0.5) * mh), y0 = Math.trunc(my + (sy - 0.5) * mh), x1 = Math.trunc(mx + (sx + 1.6) * mh), y1 = Math.trunc(my + (sy + 1.5) * mh);
      if (x0 < 0 || y0 < 0 || x1 > W || y1 > H) continue;
      const sub = roi(img, x0, y0, x1, y1), cs = candidates(sub, [0.8 * mh, 1.35 * mh]); sub.delete();
      for (const [cx, cy, cw, ch] of cs) {
        const box = [x0 + cx, y0 + cy, cw, ch];
        if (Math.abs((box[0] - mx) / mh - sx) > SPOT_TOL || Math.abs((box[1] - my) / mh - sy) > SPOT_TOL) continue;
        const [[cost, conf]] = await readCosts(img, [box]);
        if (cost !== null && cost % 5 === 0 && cost > 0 && cost <= 60) { found.push({ box, cost, conf, secondLook: true }); break; }
      }
    }
    return found;
  }

  // ---- main -------------------------------------------------------------------------------------------------------------
  async function run(image, force, forcedHow = 'forced') {
    const rgba = cv.matFromImageData(image), img = new cv.Mat(); cv.cvtColor(rgba, img, cv.COLOR_RGBA2BGR); rgba.delete();
    try { return await runMat(image, img, force, forcedHow); } finally { img.delete(); }
  }
  // the full-screen text read only needs the header and points (top left), the stat panel (right of the magazine)
  // and the labels inside tiles; with the layout anchored, other detected text is not recognised (the slow part)
  function textFilter(tiles) {
    const anchor = tileSpots(tiles)[1];
    if (!anchor) return undefined;
    const [mx, my, , mh] = anchor;
    return b => {
      const [x0, y0, x1, y1] = bbox(b), rx0 = (x0 - mx) / mh, ry0 = (y0 - my) / mh, rx1 = (x1 - mx) / mh, ry1 = (y1 - my) / mh;
      if (ry1 < -3.6 && rx1 < 1.2) return true;  // header, "90/100"
      if (rx0 > 2.8 && ry0 > -0.3) return true;  // stat panel
      return insideTiles(tiles, b);
    };
  }
  // a text box in the label area of one of `tiles`
  const insideTiles = (tiles, b) => { const [x0, y0, x1, y1] = bbox(b);
    return tiles.some(({ box: [x, y, bw, bh] }) => x0 >= x - 2 && x1 <= x + bw + 2 && y0 >= y + 0.3 * bh - 2 && y1 <= y + bh + 8); };
  async function runMat(image, img, force, forcedHow) {
    const H = img.rows, W = img.cols;
    // tiles touching the screen edge are HUD widgets (top-right currency icon), not attachments
    let tiles = (await findTiles(img)).filter(t => t.box[0] > 2 && t.box[1] > 2 && t.box[0] + t.box[2] < W - 2 && t.box[1] + t.box[3] < H - 2);
    let keep = textFilter(tiles);
    let res = await ocr(image, { keep }), texts = res.map(r => r[1]);
    let [wid, how] = identifyWeapon(texts);
    // safety net: a wrong layout anchor can filter out the header; read everything once before falling back
    if (wid === null && keep && !force) {
      keep = undefined; res = await ocr(image); texts = res.map(r => r[1]);
      [wid, how] = identifyWeapon(texts);
    }
    if (force) [wid, how] = [force, forcedHow];
    if (wid === null) {
      const rof = panelValue(res, 'rof'), mag = panelValue(res, 'mag');
      const pool = WEAPONS.filter(w => rof && Math.abs(w.rpm - rof) < 1.5 && (!mag || mag === w.mag || mag === w.mag - 1)).map(w => w.id);
      how = `stat panel ROF ${rof} MAG ${mag}: ${JSON.stringify(pool)}`;
      if (pool.length === 1) wid = pool[0];
      else if (pool.length) return { weapon: pool, weaponHow: how, tiles: [] };
    }
    const textboxes = res.map(([b, t]) => { const [a, c, d, e] = bbox(b); return [Math.trunc(a), Math.trunc(c), Math.trunc(d), Math.trunc(e), t]; });
    const cands = LIB.filter(e => e.weapon === wid);
    const scored = [], pmag = panelValue(res, 'mag');
    // operator rule: the ergo part sits far right, unless the rightmost tile is the top-row optic
    let ri = tiles.length ? tiles.reduce((bi, t, i) => (t.box[0] > tiles[bi].box[0] ? i : bi), 0) : -1;
    if (ri >= 0 && tiles[ri].box[1] < 0.15 * H) ri = -1;
    if (tiles.reduce((a, t) => a + t.cost, 0) < (readPanel(res)._pointsUsed ?? 100)) {
      const extra = await secondLook(img, tiles);
      // the filtered text read skipped labels inside tiles the second look has just found: read those now
      if (keep && extra.length) {
        for (const r of await ocr(image, { keep: b => !keep(b) && insideTiles(extra, b) })) {
          const [a, c, d, e] = bbox(r[0]); res.push(r); textboxes.push([Math.trunc(a), Math.trunc(c), Math.trunc(d), Math.trunc(e), r[1]]);
        }
      }
      tiles = tiles.concat(extra);
    }
    const spots = tileSpots(tiles)[0];
    const isAcc = ti => !!spots[ti]?.includes('accessory');  // on the optic accessory spot (top row, right of the sight)
    const gray = new cv.Mat(); cv.cvtColor(img, gray, cv.COLOR_BGR2GRAY);
    const tall = new Map();  // sight shape scores from the taller crop that keeps the hood
    const has3 = s => /[A-Za-z]{3}/.test(s);
    tiles.forEach((t, ti) => {
      const [x, y, bw, bh] = t.box;
      const inside = textboxes.filter(([a, b, c, d, s]) => a >= x && c <= x + bw && b >= y + 0.3 * bh && d <= y + bh && has3(s));
      const icon = tileIcon(gray, t.box, inside), sght = tileIcon(gray, t.box, inside, 0.10);
      t.asp = icon.asp;
      t.label = textboxes.filter(([a, b, c, d, s]) => a >= x && c <= x + bw && b >= y + 0.3 * bh && d <= y + bh + 5 && has3(s)).map(r => r[4]).join(' ');
      const mm = /(\d+\.\d+)\s*X/.exec(t.label.toUpperCase());
      for (const e of cands) {
        const sp = sprites[e.sprite];
        let s = shapeScore(icon, sp);
        const tl = e.slot === 'sight' ? [shapeScore(sght, sp), s] : null;
        if (e.pts !== null && e.pts !== t.cost && t.cost !== 0) s -= 1.0;  // a 0-point tile is placed by its icon alone (below)
        if (ri >= 0 && (ti === ri) !== (e.slot === 'ergo')) s -= 1.0;
        if (pmag && e.slot === 'mag' && magn(e.id) !== pmag) s -= 1.0;
        if (e.slot === 'sight' && y > 0.2 * H) s -= 1.0;
        if (spots[ti] !== null && !spots[ti].includes(e.slot)) s -= 1.0;  // the tile's spot never holds this slot
        if (mm && e.slot === 'sight') s += e.id.endsWith(mm[1].replace('.', '_') + 'x') ? 0.5 : -0.5;
        if (tl) tall.set(ti + '|' + e.id, [...tl, s]);
        scored.push([s, ti, e]);
      }
    });
    gray.delete();
    scored.sort((a, b) => b[0] - a[0]);
    const usedS = new Set(), pick = new Map();
    // joint assignment: tiles x slots, each slot once, maximise total score; exact DP over used columns
    const slots = [...new Set(scored.map(r => r[2].slot))].sort(), best = new Map();
    for (const [sc, ti, e] of scored) { const k = ti + '|' + e.slot; if (!best.has(k) || sc > best.get(k)[0]) best.set(k, [sc, e]); }
    const nT = tiles.length, nC = slots.length + nT, M = Array.from({ length: nT }, () => new Array(nC).fill(0.45));
    for (const [k, [sc]] of best) { const [ti, sl] = k.split('|'); M[+ti][slots.indexOf(sl)] = sc; }
    const memo = new Map();
    const f = (i, mask) => {
      if (i === nT) return [0.0, []];
      const key = i * 2 ** nC + mask; if (memo.has(key)) return memo.get(key);
      let bestF = null;
      for (let j = 0; j < nC; j++) {
        if (Math.floor(mask / 2 ** j) % 2) continue;
        const [c0, rest] = f(i + 1, mask + 2 ** j), c = c0 + -M[i][j];
        if (bestF === null || c < bestF[0]) bestF = [c, [j, ...rest]];
      }
      memo.set(key, bestF); return bestF;
    };
    const cols = f(0, 0)[1];
    cols.forEach((c, ti) => {
      const k = ti + '|' + slots[c];
      if (c < slots.length && best.has(k) && best.get(k)[0] >= 0.45) { pick.set(ti, best.get(k)); usedS.add(slots[c]); }
    });
    // A 0-point tile is the slot's None or default, never a costed choice (2.1.2.0: the VSSM's default stock has its own
    // 0-point Ergo tile, labelled and drawn as Full Auto). Its slot comes from its spot, else from its icon.
    tiles.forEach((t, ti) => {
      if (t.cost !== 0) return;
      const sl = spots[ti]?.length === 1 ? spots[ti][0] : pick.get(ti)?.[1].slot;
      if (sl) { pick.set(ti, [1, { slot: sl, id: 'none' }]); usedS.add(sl); t.zero = true; } else pick.delete(ti);
    });
    const choices = CHOICES[wid] || [];
    tiles.forEach((t, ti) => {
      if (pick.has(ti)) return;
      // a tile on the optic accessory spot is an accessory; one elsewhere is not (before the label hint: "optic" is in secondary_optic)
      let opts = [...new Map(choices.filter(([sl, , p]) => p === t.cost && !usedS.has(sl) && (sl === 'accessory') === isAcc(ti)).map(([sl, i]) => [sl + '|' + i, [sl, i]])).values()].sort(cmpTuple);
      const words = new Set((t.label.match(/[A-Za-z]{4,}/g) || []).map(w => w.toLowerCase()));
      const hinted = opts.filter(o => [...words].some(w => o[1].includes(w) || w.startsWith(o[0])));
      if (hinted.length) opts = hinted;
      const orAll = (f2, o) => { const r = o.filter(f2); return r.length ? r : o; };
      if (pmag) opts = orAll(o => o[0] !== 'mag' || magn(o[1]) === pmag, opts);
      if (ti === ri) opts = orAll(o => o[0] === 'ergo', opts);
      else if (ri >= 0) opts = orAll(o => o[0] !== 'ergo', opts);
      // barrel icons are long thin rods (aspect >= 5); suppressors top out near 4.4
      if (t.asp >= 5 && opts.some(o => o[0] === 'barrel')) opts = opts.filter(o => o[0] === 'barrel');
      else if (t.asp < 5 && !usedS.has('barrel')) { /* keep */ }
      else opts = orAll(o => o[0] !== 'barrel', opts);
      if (opts.length === 1) { pick.set(ti, [null, { slot: opts[0][0], id: opts[0][1] }]); usedS.add(opts[0][0]); }
      else t.options = opts;
    });
    // stat-panel check over close non-sight candidates
    const panel = readPanel(res), pc = new Map();
    tiles.forEach((t, ti) => {
      const [sc, e] = pick.get(ti) || [null, null];
      if ((e && e.slot === 'sight') || t.cost === 0) return;
      const mine = scored.filter(([, tj, ee]) => tj === ti && ee.slot !== 'sight' && ee.pts === t.cost && (ee.slot === 'accessory') === isAcc(ti)).map(([ss, , ee]) => [ss, ee.slot, ee.id]).sort((a, b) => cmpTuple(b, a));
      const top = mine.length ? mine[0][0] : 0, c = [], seen = new Set();
      if (e) { c.push([sc !== null ? sc : top, e.slot, e.id]); seen.add(e.slot + '|' + e.id); }
      for (const [ss, sl, i] of mine) if (ss >= top - 0.2 && !seen.has(sl + '|' + i) && c.length < 4) { c.push([ss, sl, i]); seen.add(sl + '|' + i); }
      for (const [sl, i] of t.options || []) if (!seen.has(sl + '|' + i)) { c.push([top - 0.3, sl, i]); seen.add(sl + '|' + i); }
      if (c.length) pc.set(ti, [...c, [top - 1.2, `_free${ti}`, 'none']]);
    });
    let seen = tiles.reduce((a, t) => a + t.cost, 0);
    let total = panel._pointsUsed ?? 100;  // the header's "90/100" when readable
    if (total < seen) total = 100;
    if (seen < total) {  // a tile hidden by an overlay: try each choice at the remaining cost, or nothing
      const used = new Set([...pick.values()].filter(([, e]) => e).map(([, e]) => e.slot));
      pc.set(-1, [[0, '_none', 'none'], ...choices.filter(([sl, , pp]) => pp === total - seen && !used.has(sl) && sl !== 'sight').map(([sl, i]) => [-0.5, sl, i])]);
    }
    const chk = check(wid, tiles, pc, panel);
    let hidden = chk ? chk.pick.get(-1) ?? null : null;
    if (chk) chk.pick.delete(-1);
    for (const [ti, [, sl]] of [...(chk ? chk.pick : [])]) {
      if (!sl.startsWith('_free')) continue;
      chk.pick.delete(ti); const t = tiles[ti];
      if (t.box[1] < 0.2 * H && !isAcc(ti)) {
        const sights = scored.filter(([, tj, e2]) => tj === ti && e2.slot === 'sight' && e2.pts === t.cost).map(([s2, , e2]) => [s2, e2]);  // already sorted by score
        if (sights.length && sights[0][0] > 0.45) pick.set(ti, sights[0]);
        else if (choices.some(([sl2, i2, pp]) => sl2 === 'sight' && i2 === 'iron' && pp === t.cost) || t.cost === 5) pick.set(ti, [null, { slot: 'sight', id: 'iron' }]);
        t.panelChanged = true;
      } else { pick.delete(ti); t.options = [['?', 'not identified']]; }
    }
    if (chk) for (const [ti, [ss, sl, i]] of chk.pick) {
      const old = (pick.get(ti) || [null, null])[1];
      if (!old || old.slot !== sl || old.id !== i) { pick.set(ti, [ss, { slot: sl, id: i }]); tiles[ti].panelChanged = true; delete tiles[ti].options; }
    }
    // no sight read: the top-row tile at the weapon's iron-sight cost is the irons (irons have no icon template)
    if (![...pick.values()].some(([, e]) => e && e.slot === 'sight')) {
      const iron = data.iron[wid];
      const topT = [...tiles.keys()].filter(ti => tiles[ti].box[1] < 0.2 * H && !isAcc(ti) && iron !== undefined && tiles[ti].cost === iron);
      if (topT.length) {
        const ti = topT.reduce((a, b) => (tiles[b].box[1] < tiles[a].box[1] ? b : a));
        pick.set(ti, [null, { slot: 'sight', id: 'iron' }]); tiles[ti].panelChanged = true; delete tiles[ti].options;
      }
    }
    // which sight: the taller crop's shape score (keeps the hood: Mini Flex sloped, ROX square) plus the usual score
    for (const [ti, [, e]] of [...pick]) {
      if (!e || e.slot !== 'sight' || e.id === 'iron') continue;
      const alts = scored.filter(([, tj, e2]) => tj === ti && e2.slot === 'sight' && e2.pts === tiles[ti].cost).map(([, , e2]) => { const [tl, , full] = tall.get(ti + '|' + e2.id); return [full + tl, e2]; });
      if (alts.length) {
        const best2 = alts.reduce((a, b) => (b[0] > a[0] ? b : a));
        if (best2[1].id !== e.id) pick.set(ti, [tall.get(ti + '|' + best2[1].id)[2], best2[1]]);
      }
    }
    // unclear tiles stay empty with a warning rather than a guess
    const warns = [], ok = !!chk && !chk.mismatches.length;
    tiles.forEach((t, ti) => {
      const [sc, e] = pick.get(ti) || [null, null];
      const weak = !e || (t.panelChanged && !ok) || (sc !== null && sc < 0.45 && !(t.panelChanged && ok));
      if (weak) { pick.delete(ti); t.unclear = true; delete t.panelChanged; }
    });
    const nu = tiles.filter(t => t.unclear).length;
    if (nu) warns.push(`${nu} attachment${nu > 1 ? 's' : ''} couldn't be read clearly and ${nu > 1 ? 'were' : 'was'} left at default.`);
    seen = tiles.reduce((a, t) => a + t.cost, 0);
    // a hidden tile is filled only when it is the one choice that makes the panel match exactly and every visible
    // tile read cleanly; it is marked as worked out, not read. Otherwise it stays empty.
    let guessed = !!hidden && hidden[1] !== '_none';
    if (guessed && !(ok && !nu && chk.hiddenExact.length === 1 && chk.hiddenExact[0][0] === hidden[1] && chk.hiddenExact[0][1] === hidden[2])) {
      hidden = null; guessed = false;
      warns.push('An attachment seems to be hidden (an overlay covers it) and was left empty.');
    } else if (guessed) {
      const nm = data.names[`${wid}|${hidden[1]}|${hidden[2]}`] ?? hidden[2];
      warns.push(`A ${total - seen}-point attachment is hidden; the stat panel shows it must be ${nm}: check it.`);
    }
    if (seen > 100) warns.push('Tile costs add up to more than 100: a cost was misread, so check the result.');
    else if ('_pointsUsed' in panel && seen < total && !guessed && !warns.some(w => w.includes('seems to be hidden')))
      warns.push(`A ${total - seen}-point attachment is hidden (an overlay covers it) and was left empty.`);
    if (chk && chk.mismatches.length) warns.push("The stat panel doesn't match the attachments read, so one may be hidden or misread.");
    if (how === 'forced') warns.push('The weapon name could not be read; the weapon was chosen by the stat panel and icons: check it.');
    // low resolution: tiles under ~80 px tall misread costs and icons; 85 px read fully
    const th = tiles.map(t => t.box[3]).sort((a, b) => a - b);
    if (th.length && th[Math.floor(th.length / 2)] < 80) warns.unshift('Low-resolution screenshot: results may be less accurate. A full-screen capture at 1440p or higher works best.');
    return {
      weapon: wid, weaponHow: how, panel, warnings: warns,
      panelCheck: chk && { mismatches: chk.mismatches, combos: chk.combos, equalAlternatives: chk.equalAlternatives, hiddenExact: chk.hiddenExact },
      hiddenTile: guessed ? { cost: total - seen, slot: hidden[1], id: hidden[2], inferred: true } : null,
      pointsSeen: seen,
      tiles: tiles.map((t, ti) => { const [s, e] = pick.get(ti) || [null, null]; return { box: t.box, cost: t.cost, label: t.label, slot: e ? e.slot : null, id: e ? e.id : null, score: s, unclear: !!t.unclear, spot: spots[ti], panelChanged: !!t.panelChanged, secondLook: !!t.secondLook, zero: !!t.zero }; }),
    };
  }
  // weapon (optional): the visitor's choice when the weapon was misread or not found; the shot is read as that weapon
  const recognize = async function recognize(image, { weapon } = {}) {
    if (weapon) return run(image, weapon, 'chosen');
    const out = await run(image, null);
    if (Array.isArray(out.weapon)) {
      let best = null;
      for (const w of out.weapon) {
        const o = await run(image, w), sc = o.tiles.reduce((a, t) => a + (t.score || 0), 0);
        if (best === null || sc > best[0]) best = [sc, o];
      }
      best[1].weaponHow = out.weaponHow + ' -> best tile match';
      return best[1];
    }
    return out;
  };
  recognize.internals = { candidates, readCost, toImage, roi };  // for tests
  return recognize;
}
