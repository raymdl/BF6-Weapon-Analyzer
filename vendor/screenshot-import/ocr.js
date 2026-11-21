// Port of rapidocr_onnxruntime's RapidOCR()(img) with default config, det + rec only (no cls stage).
// Libraries and model bytes are injected so the module runs unchanged in the browser and in Node:
//   const ocr = await createOcr({ ort, cv, detModel, recModel, keys });
//   const res = await ocr({ data: rgbaUint8ClampedArray, width, height });  // [[box4, text, score], ...]
// ort: onnxruntime-web module; cv: initialised opencv.js; detModel/recModel: Uint8Array/ArrayBuffer (or URL);
// keys: rec_keys.txt text (one character per line) or an array. The input is RGBA; RapidOCR is fed BGR (cv2.imread).

const CFG = {
  textScore: 0.5, minHeight: 30, whRatio: 8, maxSide: 2000, minSide: 30,
  limitSide: 736, thresh: 0.3, boxThresh: 0.5, maxCandidates: 1000, unclipRatio: 1.6, minSize: 3,
  recH: 48, recW: 320, recBatch: 6,
};
const f32 = Math.fround;
// Python round()/np.round: half to even
const pyRound = x => { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };

export async function createOcr({ ort, cv, detModel, recModel, keys }) {
  const det = await ort.InferenceSession.create(detModel);
  const rec = await ort.InferenceSession.create(recModel);
  if (typeof keys === 'string') keys = keys.replace(/\r?\n$/, '').split(/\r?\n/);
  const chars = ['blank', ...keys, ' '];

  // cv2.resize(img, (w, h)) after rounding both sides to multiples of 32 (reduce_max_side / increase_min_side)
  function resize32(img, ratio) {
    const h = img.rows, w = img.cols;
    const rh = pyRound(Math.trunc(h * ratio) / 32) * 32, rw = pyRound(Math.trunc(w * ratio) / 32) * 32;
    if (rh <= 0 || rw <= 0) throw new Error('resize_w or resize_h is less than or equal to 0');
    const out = new cv.Mat(); cv.resize(img, out, new cv.Size(rw, rh)); img.delete();
    return [out, h / rh, w / rw];
  }

  // cv2.RotatedRect.points in float32, then get_mini_boxes ordering
  function miniBox(r) {
    const ang = r.angle * Math.PI / 180, b = f32(f32(Math.cos(ang)) * 0.5), a = f32(f32(Math.sin(ang)) * 0.5);
    const { x: cx, y: cy } = r.center, { width: sw, height: sh } = r.size;
    const p0 = [f32(f32(cx - f32(a * sh)) - f32(b * sw)), f32(f32(cy + f32(b * sh)) - f32(a * sw))];
    const p1 = [f32(f32(cx + f32(a * sh)) - f32(b * sw)), f32(f32(cy - f32(b * sh)) - f32(a * sw))];
    const p2 = [f32(f32(2 * cx) - p0[0]), f32(f32(2 * cy) - p0[1])], p3 = [f32(f32(2 * cx) - p1[0]), f32(f32(2 * cy) - p1[1])];
    const p = [p0, p1, p2, p3].sort((u, v) => u[0] - v[0]);
    const [i1, i4] = p[1][1] > p[0][1] ? [0, 1] : [1, 0], [i2, i3] = p[3][1] > p[2][1] ? [2, 3] : [3, 2];
    return [[p[i1], p[i2], p[i3], p[i4]], Math.min(sw, sh)];
  }
  const minRect = (pts, type) => {
    const m = cv.matFromArray(pts.length, 1, type, pts.flat()); const r = cv.minAreaRect(m); m.delete(); return r;
  };

  function boxScoreFast(predMat, box) {
    const H = predMat.rows, W = predMat.cols, xs = box.map(p => p[0]), ys = box.map(p => p[1]);
    const cl = (v, hi) => Math.min(Math.max(v, 0), hi);
    const xmin = cl(Math.floor(Math.min(...xs)), W - 1), xmax = cl(Math.ceil(Math.max(...xs)), W - 1);
    const ymin = cl(Math.floor(Math.min(...ys)), H - 1), ymax = cl(Math.ceil(Math.max(...ys)), H - 1);
    const mask = cv.Mat.zeros(ymax - ymin + 1, xmax - xmin + 1, cv.CV_8UC1);
    const poly = cv.matFromArray(4, 1, cv.CV_32SC2, box.flatMap(([x, y]) => [Math.trunc(x - xmin), Math.trunc(y - ymin)]));
    const pv = new cv.MatVector(); pv.push_back(poly);
    cv.fillPoly(mask, pv, new cv.Scalar(1));
    const roi = predMat.roi(new cv.Rect(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1));
    const s = cv.mean(roi, mask)[0];
    roi.delete(); pv.delete(); poly.delete(); mask.delete();
    return s;
  }

  // shapely area/length + pyclipper PyclipperOffset(JT_ROUND, ET_CLOSEDPOLYGON).Execute(d). Clipper 6.4.2 DoOffset is
  // ported for a single closed path; its final union is skipped because only the convex hull (minAreaRect) is used.
  function unclip(box) {
    let area = 0, len = 0;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = box[i], [x2, y2] = box[(i + 1) % 4];
      area += x1 * y2 - x2 * y1; len += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    const delta = Math.abs(area) / 2 * CFG.unclipRatio / len;
    // AddPath: pyclipper truncates float coords to int; drop duplicate points
    let src = box.map(([x, y]) => [Math.trunc(x), Math.trunc(y)]);
    while (src.length > 1 && src[0][0] === src[src.length - 1][0] && src[0][1] === src[src.length - 1][1]) src.pop();
    src = src.filter((p, i) => i === 0 || p[0] !== src[i - 1][0] || p[1] !== src[i - 1][1]);
    if (src.length < 3) return [];
    let a2 = 0; for (let i = 0; i < src.length; i++) { const [x1, y1] = src[i], [x2, y2] = src[(i + 1) % src.length]; a2 += x1 * y2 - x2 * y1; }
    if (a2 < 0) src.reverse(); // FixOrientations
    const n = src.length, cRound = v => v < 0 ? Math.trunc(v - 0.5) : Math.trunc(v + 0.5);
    const y = Math.min(0.25, delta * 0.25);
    let steps = Math.PI / Math.acos(1 - y / delta); if (steps > delta * Math.PI) steps = delta * Math.PI;
    const sin = Math.sin(2 * Math.PI / steps), cos = Math.cos(2 * Math.PI / steps), stepsPerRad = steps / (2 * Math.PI);
    const norm = src.map((p, j) => {
      const q = src[(j + 1) % n]; if (p[0] === q[0] && p[1] === q[1]) return [0, 0];
      let dx = q[0] - p[0], dy = q[1] - p[1]; const f = 1 / Math.sqrt(dx * dx + dy * dy); dx *= f; dy *= f; return [dy, -dx];
    });
    const out = [], at = (j, nm) => out.push([cRound(src[j][0] + nm[0] * delta), cRound(src[j][1] + nm[1] * delta)]);
    for (let j = 0, k = n - 1; j < n; j++) {
      let sinA = norm[k][0] * norm[j][1] - norm[j][0] * norm[k][1];
      const cosA = norm[k][0] * norm[j][0] + norm[j][1] * norm[k][1];
      if (Math.abs(sinA * delta) < 1) { if (cosA > 0) { at(j, norm[k]); continue; } } // note: k not advanced (as in Clipper)
      else sinA = Math.max(-1, Math.min(1, sinA));
      if (sinA * delta < 0) { at(j, norm[k]); out.push(src[j].slice()); at(j, norm[j]); }
      else {
        const ang = Math.atan2(sinA, norm[k][0] * norm[j][0] + norm[k][1] * norm[j][1]);
        const st = Math.max(cRound(stepsPerRad * Math.abs(ang)), 1);
        let X = norm[k][0], Y = norm[k][1];
        for (let i = 0; i < st; i++) { at(j, [X, Y]); const X2 = X; X = X * cos - sin * Y; Y = X2 * sin + Y * cos; }
        at(j, norm[j]);
      }
      k = j;
    }
    return out;
  }

  async function detect(img) {
    const h = img.rows, w = img.cols;
    const ratio = Math.min(h, w) < CFG.limitSide ? CFG.limitSide / (h < w ? h : w) : 1;
    const rh = pyRound(Math.trunc(h * ratio) / 32) * 32, rw = pyRound(Math.trunc(w * ratio) / 32) * 32;
    if (rh <= 0 || rw <= 0) return [];
    const rs = new cv.Mat(); cv.resize(img, rs, new cv.Size(rw, rh));
    const px = rs.data, plane = rh * rw, input = new Float32Array(3 * plane), sc = f32(1 / 255);
    for (let i = 0; i < plane; i++) for (let c = 0; c < 3; c++) input[c * plane + i] = (f32(px[i * 3 + c] * sc) - 0.5) / 0.5;
    rs.delete();
    const out = await det.run({ [det.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, rh, rw]) });
    const t = out[det.outputNames[0]], [H, W] = t.dims.slice(2), pred = t.data;

    const seg = new cv.Mat(H, W, cv.CV_8UC1);
    for (let i = 0; i < H * W; i++) seg.data[i] = pred[i] > CFG.thresh ? 255 : 0;
    const kernel = cv.Mat.ones(2, 2, cv.CV_8U), bitmap = new cv.Mat();
    cv.dilate(seg, bitmap, kernel); seg.delete(); kernel.delete();
    const contours = new cv.MatVector(), hier = new cv.Mat();
    cv.findContours(bitmap, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE); bitmap.delete(); hier.delete();
    const predMat = new cv.Mat(H, W, cv.CV_32FC1); predMat.data32F.set(pred);

    const boxes = [];
    for (let i = 0, nc = Math.min(contours.size(), CFG.maxCandidates); i < nc; i++) {
      const c = contours.get(i), r = cv.minAreaRect(c); c.delete();
      const [pts, sside] = miniBox(r);
      if (sside < CFG.minSize) continue;
      if (CFG.boxThresh > boxScoreFast(predMat, pts)) continue;
      const ex = unclip(pts); if (ex.length < 3) continue;
      const [box, s2] = miniBox(minRect(ex, cv.CV_32SC2));
      if (s2 < CFG.minSize + 2) continue;
      // np.clip(np.round(box / width * dest_width), 0, dest_width) in float32
      boxes.push(box.map(([x, y]) => [Math.min(Math.max(pyRound(f32(f32(x / W) * w)), 0), w),
                                       Math.min(Math.max(pyRound(f32(f32(y / H) * h)), 0), h)]));
    }
    contours.delete(); predMat.delete();

    // filter_tag_det_res: order_points_clockwise, clip, drop thin boxes
    const res = [];
    for (const b of boxes) {
      const xs = b.map((p, i) => i).sort((i, j) => b[i][0] - b[j][0]);
      const [tl, bl] = xs.slice(0, 2).sort((i, j) => b[i][1] - b[j][1]), [tr, br] = xs.slice(2).sort((i, j) => b[i][1] - b[j][1]);
      const q = [tl, tr, br, bl].map(i => [Math.trunc(Math.min(Math.max(b[i][0], 0), w - 1)), Math.trunc(Math.min(Math.max(b[i][1], 0), h - 1))]);
      if (Math.trunc(dist(q[0], q[1])) <= 3 || Math.trunc(dist(q[0], q[3])) <= 3) continue;
      res.push(q);
    }
    // sorted_boxes: top-to-bottom, then left-to-right within 10 px rows
    res.sort((u, v) => u[0][1] - v[0][1] || u[0][0] - v[0][0]);
    for (let i = 0; i < res.length - 1; i++)
      for (let j = i; j >= 0; j--) {
        if (Math.abs(res[j + 1][0][1] - res[j][0][1]) < 10 && res[j + 1][0][0] < res[j][0][0]) [res[j], res[j + 1]] = [res[j + 1], res[j]];
        else break;
      }
    return res;
  }
  const dist = (p, q) => f32(Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2)); // np.linalg.norm on float32

  function cropBox(img, pts) {
    const cw = Math.trunc(Math.max(dist(pts[0], pts[1]), dist(pts[2], pts[3])));
    const ch = Math.trunc(Math.max(dist(pts[0], pts[3]), dist(pts[1], pts[2])));
    const s = cv.matFromArray(4, 1, cv.CV_32FC2, pts.flat()), d = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, cw, 0, cw, ch, 0, ch]);
    const M = cv.getPerspectiveTransform(s, d), m = Array.from(M.data64F);
    s.delete(); d.delete(); M.delete();
    const dst = warpCubic(img, invert3(m), cw, ch);
    if (dst.rows / dst.cols >= 1.5) { const r = new cv.Mat(); cv.rotate(dst, r, cv.ROTATE_90_COUNTERCLOCKWISE); dst.delete(); return r; }
    return dst;
  }

  // cv2.warpPerspective(INTER_CUBIC, BORDER_REPLICATE) as the Python cv2 5.x build computes it: exact source coordinates
  // rounded to float32, no 1/32 interpolation table. opencv.js 4.10 uses the old table and differs by 1-2 levels.
  function invert3(a) { // cv::invert 3x3 closed form
    const d = 1 / (a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]));
    return [(a[4] * a[8] - a[5] * a[7]) * d, (a[2] * a[7] - a[1] * a[8]) * d, (a[1] * a[5] - a[2] * a[4]) * d,
            (a[5] * a[6] - a[3] * a[8]) * d, (a[0] * a[8] - a[2] * a[6]) * d, (a[2] * a[3] - a[0] * a[5]) * d,
            (a[3] * a[7] - a[4] * a[6]) * d, (a[1] * a[6] - a[0] * a[7]) * d, (a[0] * a[4] - a[1] * a[3]) * d];
  }
  function warpCubic(img, m, W, H) {
    const sw = img.cols, sh = img.rows, src = img.data, dst = new cv.Mat(H, W, cv.CV_8UC3), out = dst.data;
    const cub = (x, w) => { const A = -0.75;
      w[0] = ((A * (x + 1) - 5 * A) * (x + 1) + 8 * A) * (x + 1) - 4 * A;
      w[1] = ((A + 2) * x - (A + 3)) * x * x + 1;
      w[2] = ((A + 2) * (1 - x) - (A + 3)) * (1 - x) * (1 - x) + 1;
      w[3] = 1 - w[0] - w[1] - w[2]; };
    const wx = [0, 0, 0, 0], wy = [0, 0, 0, 0], xi = [0, 0, 0, 0], acc = [0, 0, 0];
    for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o += 3) {
      const w = m[6] * x + m[7] * y + m[8];
      const X = f32((m[0] * x + m[1] * y + m[2]) / w), Y = f32((m[3] * x + m[4] * y + m[5]) / w);
      const ix = Math.floor(X), iy = Math.floor(Y);
      cub(X - ix, wx); cub(Y - iy, wy);
      for (let j = 0; j < 4; j++) xi[j] = Math.min(Math.max(ix - 1 + j, 0), sw - 1) * 3;
      acc[0] = acc[1] = acc[2] = 0;
      for (let i = 0; i < 4; i++) {
        const row = Math.min(Math.max(iy - 1 + i, 0), sh - 1) * sw * 3;
        for (let j = 0; j < 4; j++) { const k = wy[i] * wx[j], p = row + xi[j]; acc[0] += k * src[p]; acc[1] += k * src[p + 1]; acc[2] += k * src[p + 2]; }
      }
      for (let c = 0; c < 3; c++) out[o + c] = Math.min(Math.max(pyRound(acc[c]), 0), 255);
    }
    return dst;
  }

  async function recognize(crops) {
    const ratios = crops.map(m => m.cols / m.rows), idx = ratios.map((_, i) => i).sort((i, j) => ratios[i] - ratios[j]);
    const res = new Array(crops.length);
    for (let b0 = 0; b0 < crops.length; b0 += CFG.recBatch) {
      const ids = idx.slice(b0, b0 + CFG.recBatch);
      const maxR = Math.max(CFG.recW / CFG.recH, ...ids.map(i => ratios[i]));
      const H = CFG.recH, W = Math.trunc(H * maxR), plane = H * W, input = new Float32Array(ids.length * 3 * plane);
      ids.forEach((id, n) => {
        const m = crops[id], rw = Math.min(Math.ceil(H * (m.cols / m.rows)), W), rs = new cv.Mat();
        cv.resize(m, rs, new cv.Size(rw, H));
        const px = rs.data, base = n * 3 * plane;
        for (let y = 0; y < H; y++) for (let x = 0; x < rw; x++) for (let c = 0; c < 3; c++)
          input[base + c * plane + y * W + x] = (f32(px[(y * rw + x) * 3 + c] / 255) - 0.5) / 0.5;
        rs.delete();
      });
      const out = await rec.run({ [rec.inputNames[0]]: new ort.Tensor('float32', input, [ids.length, 3, H, W]) });
      const t = out[rec.outputNames[0]], [, T, C] = t.dims, p = t.data;
      ids.forEach((id, n) => { // CTC greedy decode: argmax, merge repeats, drop blank (0); score = mean prob of kept steps
        let text = '', sum = 0, cnt = 0, prev = -1;
        for (let s = 0; s < T; s++) {
          let best = 0, bp = p[(n * T + s) * C];
          for (let c = 1; c < C; c++) { const v = p[(n * T + s) * C + c]; if (v > bp) { bp = v; best = c; } }
          if (best !== 0 && best !== prev) { text += chars[best]; sum += bp; cnt++; }
          prev = best;
        }
        res[id] = [text, cnt ? sum / cnt : 0];
      });
    }
    return res;
  }

  // Recognition only, no text detection: each image is one line of text (the tile cost crops, whose place is known).
  // All images go through the recogniser in batches; returns [[text, score], ...].
  async function readLines(images) {
    const mats = images.map(im => { const rgba = new cv.Mat(im.height, im.width, cv.CV_8UC4); rgba.data.set(im.data); const m = new cv.Mat(); cv.cvtColor(rgba, m, cv.COLOR_RGBA2BGR); rgba.delete(); return m; });
    try { return await recognize(mats); } finally { mats.forEach(m => m.delete()); }
  }
  ocrFn.readLines = readLines;
  return ocrFn;
  // keep(box) (optional): recognise only the detected boxes it accepts (box in image pixels, 4 points)
  async function ocrFn(image, { keep } = {}) {
    const { width: rawW, height: rawH } = image;
    const rgba = new cv.Mat(rawH, rawW, cv.CV_8UC4); rgba.data.set(image.data);
    let img = new cv.Mat(); cv.cvtColor(rgba, img, cv.COLOR_RGBA2BGR); rgba.delete();
    let ratioH = 1, ratioW = 1, top = 0;
    // main.py preprocess: a later min-side resize overwrites (not compounds) the ratios, as in RapidOCR
    if (Math.max(img.rows, img.cols) > CFG.maxSide) {
      const r = CFG.maxSide / (img.rows > img.cols ? img.rows : img.cols); [img, ratioH, ratioW] = resize32(img, r);
    }
    if (Math.min(img.rows, img.cols) < CFG.minSide) {
      const r = CFG.minSide / (img.rows < img.cols ? img.rows : img.cols); [img, ratioH, ratioW] = resize32(img, r);
    }
    if (img.rows <= CFG.minHeight || img.cols / img.rows > CFG.whRatio) { // maybe_add_letterbox
      top = Math.trunc(Math.abs(Math.max(Math.trunc(img.cols / CFG.whRatio), CFG.minHeight) * 2 - img.rows) / 2);
      const p = new cv.Mat(); cv.copyMakeBorder(img, p, top, top, 0, 0, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));
      img.delete(); img = p;
    }
    try {
      const toRaw = b => b.map(([x, y]) => [Math.min(Math.max(f32(x * f32(ratioW)), 0), rawW), Math.min(Math.max(f32((y - top) * f32(ratioH)), 0), rawH)]);
      let boxes = await detect(img);
      if (keep) boxes = boxes.filter(b => keep(toRaw(b)));
      if (!boxes.length) return [];
      const crops = boxes.map(b => cropBox(img, b));
      const recRes = await recognize(crops);
      crops.forEach(m => m.delete());
      const out = [];
      boxes.forEach((b, i) => {
        if (!(recRes[i][1] >= CFG.textScore)) return;
        out.push([toRaw(b), recRes[i][0], recRes[i][1]]);
      });
      return out;
    } finally { img.delete(); }
  }
}
