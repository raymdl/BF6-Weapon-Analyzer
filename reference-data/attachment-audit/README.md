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

`Weapon Attachments/` is the local sorted screenshot library used by the JSON paths and workbook
links. Git ignores it because of its size. The completed OCR/correction workflow
and other intermediate material remain under `/.local-archive/2026-08-12-live-baseline/`. Neither is
required by a clean clone, CI, deployment, or the live application.

## Run the ad-hoc check

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
