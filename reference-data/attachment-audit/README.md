# Attachment audit reference

This directory contains the completed screenshot-backed attachment reference. It is intentionally separate from the live site and normal validation.

## Contents

- `attachment-screenshot-review.json` — canonical machine-readable reference.
- `BF6_Attachment_Stats_Review.xlsx` — human-readable review workbook.
- `validate-reference.mjs` — explicit structural and consistency check.
- `build-workbook.py` — regenerates the workbook from the canonical JSON.

`Weapon Attachments/` is the local sorted screenshot library used by the JSON paths and workbook
links. It is deliberately ignored by Git because of its size. The completed OCR/correction workflow
and other intermediate material remain under `/.local-archive/2026-08-12-live-baseline/`. Neither is
required by a clean clone, CI, deployment, or the live application.

## Run the ad-hoc check

```powershell
node reference-data/attachment-audit/validate-reference.mjs
```

This command derives counts from the current reference. It does not pin the old roster or record totals, so future weapons and attachments can be added without updating unrelated assertions.

## Use for a future game update

1. Capture the new weapon or attachment panels locally.
2. Add visually reviewed records to `attachment-screenshot-review.json` using stable `Weapon Attachments/...` source suffixes.
3. Run `validate-reference.mjs`.
4. Regenerate and visually review the workbook.
5. Promote only approved values into `data/`.
6. Run the normal product validator and tests.

OCR output is evidence for review, not an authoritative value. Do not restore the archived dated correction scripts as a normal pipeline.
