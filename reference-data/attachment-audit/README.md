# Attachment audit reference

This directory contains the completed screenshot-backed attachment reference.
The live site and normal validation do not load it.

Current runtime contracts and promotion rules: [data sources](../../docs/DATA_SOURCES.md).
Historical investigations: [archive index](../../docs/archive/README.md). Individual records may remain provisional after the package review is complete.
Check their statuses before promotion.

The current generated hit-zone values match the 321 reviewed ammo-panel readings.
Later light effects use decoded Frosty fields, not rounded panel percentages; see
the [current provenance index](../provenance/README.md) for that separate evidence.

## Contents

- `attachment-screenshot-review.json` — canonical machine-readable reference.
- `BF6_Attachment_Stats_Review.xlsx` — human-readable review workbook.
- `validate-reference.mjs` — explicit structural and consistency check.
- `build-workbook.py` — regenerates the workbook from the canonical JSON.
- `screenshot-stat-corrections-2026-09-17.json` — 439 screenshot-verified stat corrections applied to the canonical JSON, with screenshot paths and hashes.
- `precision-screenshot-corrections-2026-09-17.json` — 23 Precision and 7 Hipfire/Control/Mobility readings re-read from screenshots during the composite-stat investigation; applied by `scripts/frosty-precision-check.mjs` and `scripts/frosty-composite-check.mjs` at load time, not to the historical audit file.
- `composite-screenshot-corrections-2026-09-21.json` — blind Luna readings of 472 selected historical screenshots, with hashes and 385 further field corrections. Four Luna field errors were corrected by primary visual review.
- `hipfire-screenshot-corrections-2026-09-21.json` — the preceding 12 primary-reviewed Hipfire corrections.
- `composite-identity-corrections-2026-09-21.json` — two historical KTS100 image/attachment mapping corrections used by the research checkers.
- `composite-current-panels-2026-09-21.json` — current 131-panel input for both research checkers (65 EF88, 64 BROD 3, 2 KTS100); overview screens excluded.
- `current-capture-updates-2026-09-21.json` — replacement capture records, previous records, image hashes and rename paths. These changes are applied to the canonical JSON. Superseded local images remain in `Old` folders.
- `vssm-capture-updates-2026-09-22.json` — full VSSM re-capture (43 detail panels and the overview), in the same row format: previous records, source and archived image hashes, and rename paths. Applied to the canonical JSON. Values are from primary visual review; no OCR was run. Two grip-pod panels have a notification over the recoil lines; the operator confirmed those values, and `statFieldReasons` records this.
- `composite-vssm-panels-2026-09-22.json` — the 43 current VSSM panels as input for the research checkers and `scripts/weapon-attributes.test.mjs`.

Historical correction ledgers refer to the old image bytes, not newly captured replacements.
The research checker defaults to the historical panel audit; `--audit PATH` selects a separate
capture set. Do not apply historical corrections to new images merely because their basenames
match. The workbook is a separately generated reference, not the canonical data source.

`Weapon Attachments/` is the local sorted screenshot library used by the JSON paths and workbook
links. Git ignores it because of its size. The completed OCR/correction workflow
and other intermediate material remain under `/.local-archive/2026-08-12-live-baseline/`. Neither is
required by a clean clone, CI, deployment, or the live application.

## Run the ad-hoc check

The second 21 September capture batch is recorded in
[`remaining-capture-updates-2026-09-21.json`](remaining-capture-updates-2026-09-21.json):
23 replacements, with 17 detail panels and six context-only overviews. Old images
remain in `Old` folders. The research input is
[`composite-remaining-panels-2026-09-21.json`](composite-remaining-panels-2026-09-21.json).
Its Precision check uses the versioned 1.4.3.0 table; its Control check uses the
source-traced sniper Tungsten Core operands. Results and hashes are in
[`composite-remaining-results-2026-09-21.json`](../provenance/composite-remaining-results-2026-09-21.json).
The canonical JSON is updated; the workbook is not regenerated.

```powershell
node reference-data/attachment-audit/validate-reference.mjs
```

The validator derives roster and record counts from the current reference.
Adding records does not require updating fixed-count assertions.

## Use for a future game update

1. Capture the new weapon or attachment panels locally.
2. Add visually reviewed records to `attachment-screenshot-review.json` using stable `Weapon Attachments/...` source suffixes.
3. Run `validate-reference.mjs`.
4. Regenerate and visually review the workbook.
5. Promote only approved values into `data/`.
6. Run the normal product validator and tests.

Visually verify OCR output before accepting values. Keep dated correction scripts
in the archive rather than the routine update process.
