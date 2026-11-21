# Screenshot import reader

Reads an in-game loadout screenshot for `ui/screenshot-import.js`. It runs in a module worker that the page starts
only on first use, so visitors who never import download none of this (about 45 MB, mostly the libraries and models).

- `import-worker.mjs`: the worker. It loads the libraries, models and data below, plus the site's own `sim/*.js` and
  `data/*.json` for the stat-panel check and the dialog's lists.
- `recognize.js`: tile finding, icon matching, slot assignment and the stat-panel check.
- `ocr.js`: text reading (PP-OCRv4 detection and recognition), a port of RapidOCR without its angle classifier.
- `sim-bridge.mjs`: runs the site simulator for the stat-panel check.
- `import-data.json`: weapons, attachment choices with points, iron-sight costs and names. Built from the site's data
  by `node scripts/build-screenshot-import-data.mjs`.
- `icon-features.json`: the icon library. Built by `python scripts/build-screenshot-import-icons.py` (run the data
  script first). See "Screenshot import data for new weapons and attachments" in `docs/GAME_UPDATE_GUIDE.md`.

Third-party files, unchanged:

- `lib/opencv.js`: OpenCV.js 4.10 (Apache License 2.0).
- `lib/ort.wasm.min.mjs`, `lib/ort-wasm-simd-threaded.mjs`, `lib/ort-wasm-simd-threaded.wasm`: ONNX Runtime Web
  1.31.1 (MIT License).
- `models/ch_PP-OCRv4_det_infer.onnx`, `models/ch_PP-OCRv4_rec_infer.onnx`, `models/rec_keys.txt`: PaddleOCR PP-OCRv4
  detection and recognition models in ONNX form, as used by RapidOCR (Apache License 2.0).

The reader's test tooling and test screenshots are not in this repository; they stay with the research prototype.
