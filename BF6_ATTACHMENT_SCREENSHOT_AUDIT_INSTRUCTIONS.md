# BF6 Attachment Screenshot Audit — instructions, rules and history

Single reference for the Battlefield 6 attachment screenshot audit. Covers what the audit is
for, how to run a weapon class end to end, the naming and validation rules, the correction
history, and where the work currently stands.

Consolidates the former `ATTACHMENT_SCRAPE_MANUAL_FIXES.md`, `ATTACHMENT_NAME_NORMALIZATION.md`,
`ATTACHMENT_SCRAPE_REMAINING_ISSUES.md` and `ATTACHMENT_MISSING_IMPORT_REPAIRS.md`.

---

## Contents

- [1. Purpose and scope](#1-purpose-and-scope)
- [2. Current status](#2-current-status)
- [3. Open items](#3-open-items)
- [4. Core processing principles](#4-core-processing-principles)
- [5. Weapon-class runbook](#5-weapon-class-runbook)
- [6. Completion contract](#6-completion-contract)
- [7. Recurring failure prevention](#7-recurring-failure-prevention)
- [8. Capture requirements](#8-capture-requirements)
- [9. Attachment categories and aliases](#9-attachment-categories-and-aliases)
- [10. Filename rules](#10-filename-rules)
- [11. Attachment name casing rules](#11-attachment-name-casing-rules)
- [12. Record schema](#12-record-schema)
- [13. Extraction workflow](#13-extraction-workflow)
- [14. The reference workbook](#14-the-reference-workbook)
- [15. Regression gates](#15-regression-gates)
- [16. Comparison with live site data](#16-comparison-with-live-site-data)
- [17. Promotion rules and tests](#17-promotion-rules-and-tests)
- [18. Correction history](#18-correction-history)
- [19. Stop conditions](#19-stop-conditions)
- [20. Handoff report](#20-handoff-report)

---

## 1. Purpose and scope

The audit turns attachment screenshots into a reviewable dataset. In order:

1. inventory every supplied screenshot;
2. associate each screenshot with the correct weapon and highlighted attachment;
3. rename the images consistently;
4. transcribe every displayed attachment field into a provisional dataset;
5. record coverage gaps and ambiguous captures explicitly;
6. compare reviewed values with current site data; and
7. promote values into live data only after transcription and interpretation are checked.

**The review JSON is provisional evidence, not the authoritative site dataset.** No
screenshot-derived value has been promoted into live data, and none may be without passing
[§17](#17-promotion-rules-and-tests).

### Artifacts

| Artifact | Path |
|---|---|
| Review data (canonical) | `outputs/attachment-audit/attachment-screenshot-review.json` |
| Schema | `schemas/attachment-screenshot-review.schema.json` |
| Coverage report | `outputs/attachment-audit/coverage-report.json` |
| Rename map | `outputs/attachment-audit/rename-manifest.json` |
| Comparison indicators | `outputs/attachment-audit/stat-comparisons.json` |
| Raw / panel / field OCR | `outputs/attachment-audit/raw-ocr.json`, `panel-ocr.json`, `field-ocr.json` |
| Manual override ledger | `outputs/attachment-audit/manual-review-overrides.json` |
| Reference workbook | `BF6_Attachment_Stats_Review.xlsx` |
| Triage sweep | `scripts/audit-sweep.mjs` |
| Workbook builder | `scripts/build-attachment-workbook.py` |
| Review-data builder | `scripts/build-attachment-screenshot-review.mjs` |
| OCR extractors | `scripts/extract-attachment-*.ps1`, `scripts/extract-missing-attachment-fields.ps1` |
| Rename helper | `scripts/apply-attachment-screenshot-renames.ps1` |
| Release plan | `BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md`, Phase 4 |

`outputs/` is gitignored. Back up before any destructive rebuild — see
[§18.5](#185-2026-07-31--missing-attachment-import-and-its-repairs) for what happens when
a rebuild drops records.

---

## 2. Current status

As of **2026-07-31**, review JSON `generatedAt` 2026-07-31T05:44:11Z, schema v4.

| Measure | Value |
|---|---|
| Records | 3,177 |
| Attachment-detail records (excludes 62 per-weapon Overview captures) | 3,115 |
| Weapons | 62, all eight classes |
| Null stat cells | **0** |
| Records with no stats block | **0** |
| Non-Overview null costs | **0** |
| Null descriptions (excluding `None` attachments) | **0** |
| Visible comparison indicators stored | 5,681 |
| Duplicate identity groups whose stats disagree | **0** (the 29 former M1014 canonical duplicates are excluded; source PNGs are retained) |
| Timestamp-named files still referenced | **0** |
| Records pointing at a missing file | **0** |
| Screenshots on disk with no record | **0** |
| `reviewStatus: reviewed` | 201 of 3,115 |
| `mappingReviewStatus: visually-checked` | 2,078 of 3,115 |

**Transcription is complete; review is not.** Every displayed field across all eight weapon
classes has been transcribed and every null has been resolved. What remains is the human
review gate: only 201 detail records carry `reviewStatus: reviewed`, and `extractionStatus`
is still `provisional-review-required` on all 3,115. Transcription completion is not review
completion and is not promotion authorization.

Coverage note: **M44** is the only weapon with no Light, Laser, or Laser/Light records
(it has Barrel, Magazine, Ammo and Ergonomics only). Every other weapon has its accessory
selector covered. Sidearms, GRT-BC, KORD 6P67, KTS100 MK8 and SL9 use the shared `Laser/Light` type
rather than separate Laser and Light groups — see [§9](#9-attachment-categories-and-aliases).

---

## 3. Open items

1. **`reviewStatus` is `reviewed` on only 201 of 3,115 detail records.** This is the main
   remaining work. Review one full row at a time; record reviewer and date only after title,
   subtype, cost, description, every displayed stat, arrow direction and colour effect have
   been checked against that record's own screenshot.

2. **A uniformly wrong column on a single weapon is invisible to every within-weapon check.**
   The 2026-07-31 recoil-variation repair ([§18.6](#186-2026-07-31--open-item-fixes)) found
   M4A1 reading 40.7 on 53 records where the screenshots print 30.7 — the *majority* value was
   the wrong one, so the modal baseline treated the error as truth. Only the ladder model
   exposed it. Three weapons had the same shape. `recoilAmountDegrees` has a corpus-wide
   screenshot-read source (`recoil-visual-map.json`, 3,083 records from the 2026-07-28 glyph
   pass); **`recoilVariationDegrees` does not**, and its full-screen OCR is too corrupt to
   screen with. Either extend the glyph pass to the variation row or accept that only ladder
   membership guards that column.

3. **`scripts/audit-sweep.mjs` is clean:** 0 errors and 0 warnings. Its 30 informational rows
   are 27 direct Subsonic treatments, two direct ADS-move screenshot exceptions, and SL9 Burst
   Mode. Keep those registers path-specific; a changed or unregistered source must fail rather
   than be treated as another safe exception. Full triage is in `DERIVED_ATTACHMENT_MODEL.md` §8.

4. **The 1.3.3.0 site update plan Phase 4 ledger is not updated** for the 2026-07-31 import
   and repairs. See [§20](#20-handoff-report).

---

## 4. Core processing principles

1. **The screenshot filesystem is authoritative for capture existence.** OCR JSON, review
   JSON, rename manifests, workbooks and prior reports are derived artifacts and must never
   resurrect a file the user deleted.
2. **Separate four decisions for every screenshot:** the file exists, the screenshot is
   visually readable, the parser extracted it confidently, and a human reviewed it. Parser
   uncertainty is not an unreadable screenshot.
3. **OCR is an indexing aid, not evidence.** Use screenshot geometry, the highlighted card and
   direct visual inspection before accepting a category, title, subtype, cost, description or
   displayed stat.
4. **Never treat a non-empty OCR string as sufficient for renaming.** Plausible OCR corruption
   still produces a valid but wrong filename.
5. **Reruns must be idempotent.** The same retained screenshots and parser version must produce
   the same records, proposed names, duplicate assignments and coverage totals.
6. **Keep the gates separate:** inventory, OCR, parsing, visual review, rename application,
   transcription, promotion and testing. Passing one gate does not authorize the next.
7. **Record identity is not filename position.** Match records to screenshots by identity, never
   by numeric filename prefix. This is what broke on 2026-07-31
   ([§18.5](#185-2026-07-31--missing-attachment-import-and-its-repairs)).
8. **A detailed stats page is an admission gate.** Before any OCR or transcription, classify each
   detail screenshot as detailed or compact. A compact selector/collapsed panel is ineligible even
   when it exposes some values: do not OCR, crop, transcribe, infer, add null reasons, rename,
   create a review record, or use it in comparisons. Notify the user with its exact source path
   and request a replacement detailed-stats screenshot.

---

## 5. Weapon-class runbook

Use this sequence when new screenshots arrive for a weapon class or for missing attachments
within an existing class.

Unless the user explicitly asks for an inventory-only or OCR-only pass, this is an end-to-end
assignment. Do **not** stop after inventory, OCR, provisional JSON, parser adaptation or
workbook generation. Parser uncertainty opens the visual-review and transcription steps; it
does not authorize leaving a readable field null or postponing a reviewed rename. Direct
inspection of the screenshot is sufficient for the manual visual-review gates. Immediately
notify the user when a capture shows a compact panel instead of the detailed stats page;
otherwise ask only when the screenshot itself is unreadable, obscured, missing, or needs a
judgment that cannot be resolved from captured evidence.

1. **Stage.** One folder per weapon under `Weapon Attachments/<Class>/<Weapon>/`. Keep original
   files until inventory, hashes and before-counts are recorded. Require one overview/context
   screenshot anchoring weapon identity. New captures for an existing weapon may be staged under
   `Weapon Attachments/Missing/<Weapon>/`.
   - **Compact-panel stop gate.** Inspect each staged detail screenshot at original resolution
     before running OCR. If it is a compact selector or collapsed stat panel rather than the
     detailed stats page, report the exact source path, weapon and attachment to the user and ask
     for a new detailed capture. Do not process that file further or emit a provisional record;
     resume only after a replacement is staged.
2. **OCR.** Run `scripts/extract-attachment-screenshot-ocr.ps1` for broad OCR, then
   `scripts/extract-attachment-panel-ocr.ps1` for fixed panel regions. Keep the pre-rename OCR
   pass — it is the only record of which staged capture a record came from.
3. **Build provisional JSON** with `scripts/build-attachment-screenshot-review.mjs`. Confirm
   weapon, category, highlighted name, card subtype, cost, description, resolution and source
   path for every detail screenshot.
4. **Fill nulls.** Run `scripts/extract-missing-attachment-fields.ps1` for null fields only. It
   performs normal, thresholded and inverted OCR on the field-specific crop. Preserve all passes
   as evidence; accept only a unit- and range-valid result from the correct coordinate region.
5. **Extract comparison indicators** with `scripts/extract-attachment-stat-comparisons.ps1`
   across every weapon folder. It must inspect red/green pixels and the triangular arrow
   separately from numeric OCR. A rounded value matching the baseline still carries its visible
   comparison, such as red `↑0.7`.
   - For 1365×768 detailed captures, `RECOIL AMOUNT` sits at roughly `y=675..705` and `RECOIL
     VARIATION` at `y=700..732`. Scale from actual dimensions and run the compact-panel stop gate
     before attempting any field crop.
     The older `690..710` / `710..730` crops miss the coloured recoil amount and collapse the
     class-wide comparison count.
   - An implausibly low per-field or class-wide comparison count is an extractor failure.
     Re-open representative changed rows before accepting the scan.
6. **Contact sheets** for every remaining null or low-confidence field. Transcribe from the
   crop and record the evidence source. Exact crop matching is allowed only within the same
   weapon and field; never transfer a value across weapons because a name matches.
7. **Import reviewed workbook edits** with `outputs/attachment-audit/import-reviewed-workbook.mjs`.
   Treat yellow/orange cells as human edits, preserve typed values, and reconcile every
   arrow/colour cell against the source screenshot. Screenshot evidence wins when a reviewed
   cell is shifted or missed, and the conflict is recorded rather than discarded.
8. **Rebuild and inspect coverage.** Every populated field must have a source; every null must
   have a field-specific reason. Report overlay-obscured values separately from parser failures.
9. **Rename.** Generate and inspect `rename-manifest.json`. For Ammo and Barrel build the
   filename token from `attachmentSubtype`; for all other categories use `attachmentName`.
   Require in-folder targets, unique case-insensitive destinations, no overwrites, and unchanged
   PNG counts before and after `scripts/apply-attachment-screenshot-renames.ps1`.
   - Preserve UI order from capture timestamps or an explicit capture-order ledger. Never sort
     canonical filenames lexicographically (`1_`, `10_`, `11_`, `2_`); parse the numeric prefix
     when rebuilding an already-renamed weapon.
   - **Inserting records renumbers everything after them.** Re-derive each record's file from its
     identity, never from its old numeric position, and re-check `originalFilename` afterwards:
     two records sharing one original screenshot means the mapping shifted.
10. **Reconcile paths.** Run `scripts/reconcile-attachment-ocr-paths.mjs`, rebuild every
    artifact, require zero stale current paths, and never resurrect a deleted screenshot.
    A rebuild against stale OCR silently drops every record whose file has moved, so the
    reconcile is not optional after a rename.
11. **Restore canonical numbering.** Run
    `outputs/attachment-audit/apply-20260731-canonical-order-renumber.mjs`. The review builder
    numbers filenames by capture order, so this pass puts them back into canonical order and
    rewrites `capture-order.json` — see [§10.1](#101-what-the-numeric-prefix-means).
12. **Build the workbook once, at finalization only** — after all JSON and screenshot gates pass,
    run `python scripts/build-attachment-workbook.py` exactly once; see
    [§14](#14-the-reference-workbook). Never use `@oai/artifact-tool` or the superseded
    JavaScript builder during audit iteration.
13. **Run the regression gates** — [§15](#15-regression-gates). Record screenshot, detail-row,
    transcribed, reviewed, blocked, renamed, promoted and tested counts separately in the
    Phase 4 ledger.

---

## 6. Completion contract

A weapon-class run is not complete because provisional artifacts exist. Before reporting it
finished, all of the following must hold:

1. No compact-panel screenshot entered OCR, field extraction, transcription, renaming, review
   JSON, comparison extraction or workbook input. Each was reported to the user with its exact
   source path and awaits a detailed-stats replacement. Every admitted attachment-detail
   screenshot has been through the fixed-panel field parser, the missing-field OCR passes and the
   comparison-indicator extractor.
2. Every visible required field is populated from screenshot evidence. Each remaining `null`
   identifies the exact field, screenshot and evidence-based reason, using `needs recapture`
   only when the screenshot itself is unreadable or obscured. Ordinary parser failure is not an
   unreadable screenshot.
3. Every visible comparison indicator is stored with both direction (`up`/`down`) and effect
   (`buff`/`penalty`). A scan reporting zero indicators for an entire normal weapon class is a
   hard failure, not a successful result.
4. Every remaining `Unknown`, low-confidence category/name/subtype and proposed filename is
   resolved by direct visual inspection where the screenshot is readable.
5. The reviewed rename manifest is applied for every resolved record. Timestamp-named files may
   remain only for individually listed unresolved records. Recount every folder and require
   identical PNG counts before and after.
6. `source.renameApplied` is `true` only when the canonical target exists and the old source
   filename no longer does, except where source and target were already the same path.
   `renameAllowed` is permission to rename, not proof a rename happened.
7. After renaming: OCR paths reconciled, artifacts rebuilt, zero stale current paths, zero
   destination collisions, no false `renameApplied` claims, and no two records sharing one
   `originalFilename`.
8. The regression gates in [§15](#15-regression-gates) pass.
9. The final report gives per-field populated/null totals, total comparison indicators,
   timestamp filenames remaining, renames applied, blocked records with reasons, stale paths,
   destination collisions and false `renameApplied` claims.

If any condition fails, report the run as **incomplete** and keep working within the supplied
evidence. Do not use "completed" for an inventory-only, OCR-only, parser-only, provisional-build
or unapplied-rename result.

---

## 7. Recurring failure prevention

These rules come from defects that actually reached an artifact. They take precedence over any
convenience shortcut in an older helper script.

1. **No blanket defaults.** Never fill every missing value with a constant such as `60`, even
   when a contact sheet looks uniform. Create an explicit screenshot-path/field/value entry per
   reviewed field. A generic `direct-screenshot-review` label attached by a loop is not proof
   the file was inspected.
2. **No cross-weapon description substitution.** Do not group descriptions by type/name and copy
   the first clean sentence to other weapons. A same-name capture may help decipher a glyph, but
   each final description must be checked against its own screenshot.
3. **No mechanical text "cleanup" presented as review.** Global replacements (`tiring`→`firing`,
   `ot`→`of`, punctuation insertion, case repair) generate candidates only. Accept each after
   comparing the complete sentence to the screenshot. Preserve raw OCR unchanged.
4. **Do not overwrite a targeted fix with a later bulk pass.** Merge overrides by exact
   screenshot and field, with targeted visually reviewed entries winning. Add a regression check
   for every specifically corrected row.
5. **Compact panels are rejected captures.** A compact selector or collapsed stat panel is not
   partial evidence. Do not transcribe visible fields, infer the rest, create field-specific nulls
   or spend OCR/crop work on it. Report the exact source path to the user and wait for a detailed
   stats-page replacement.
6. **Computer vision is triage, not authority.** Contact sheets, glyph templates, bar matching
   and colour thresholds locate candidates. A value becomes reviewed only after the
   original-resolution screenshot is opened and the field, decimal, unit, arrow and colour are
   visually confirmed.
7. **Completion metrics come from the final rebuilt artifacts,** never from an earlier build or
   from commentary.
8. **Description gates are semantic as well as syntactic.** A capital letter and terminal period
   are insufficient. Scan for known OCR words (`ot`, `tiring`, `mlnimap`), truncated leading
   clauses, missing words, repeated titles, selector labels, unlock text and sentences that
   disagree with the screenshot.
9. **Representative spot checks do not replace exhaustive review of changed rows.** Visually
   inspect every row a bulk operation changed, plus at least one baseline, stat-changing
   attachment, muzzle description, barrel/ammo description, grip description and laser/light row
   per weapon.
10. **Run negative assertions before saying "finished."** Validation must fail when a known-bad
    description token remains, a reviewed full-panel field is null, a targeted regression value
    changes, a timestamp filename remains without an exception, or workbook and JSON disagree.
    Print failing row paths, not just a count.
11. **Search every visible attachment-card row for the selected highlight.** On 1365×768 the
    selected border/check can appear near `y=497` or on a wrapped row near `y=610`; scale both
    with resolution. A low-margin or occluded highlight needs direct inspection rather than
    picking the brightest card.
12. **Apply reviewed identity corrections before dependent mappings.** When OCR changes a
    type/name/subtype, synchronize that identity before computing costs, recoil maps, filenames
    or capture-order entries.
13. **Preserve leading-zero stat digits and audit the real baseline first.** `060`, `054`, `0.4°`
    transcribe as `60`, `54`, `0.4`. Before calling an arrow/value pair contradictory, verify the
    matching weapon/type `None` record; one bad baseline manufactures contradictions across the
    whole group.
14. **Limit the same-rounded-value exception to recoil amount.** `recoilAmountDegrees` displays
    to one decimal, so a visible arrow can legitimately accompany an unchanged displayed value.
    Do not extend this to mobility, control, precision, damage, magazine size or spotting ranges,
    where an arrow with an unchanged value is a discrepancy requiring review.
15. **Read the printed recoil number directly.** Normalize to reference UI coordinates and read
    the displayed glyphs. The arrow is comparison metadata and must never be used to calculate or
    force a different value. A compact panel triggers the recapture gate; it never produces a
    recoil null or a partial record.
16. **Enforce the Basic-barrel cardinality gate.** Zero or one `Basic` barrel per weapon, never
    more. On a conflict, stop before emitting artifacts and visually distinguish the outlined
    inspected tile from the green checked equipped tile. Do not resolve from velocity alone.
17. **Require visible costs for detail records.** Every non-Overview attachment needs a cost
    transcribed from its own weapon/category grid; costs differ by weapon. Overview records are
    the only expected null-cost records.
18. **Reconcile duplicate identities before comparing their stats.** Repeated fallback names can
    be different attachments. After reconciliation, true duplicates must agree; complementary
    nulls may be filled from a duplicate only when all non-null siblings agree.

---

## 8. Capture requirements

### 8.1 Folder hierarchy

```text
Weapon Attachments/
  Assault Rifle/   Carbine/   SMG/   LMG/
  DMR/   Sniper Rifle/   Shotgun/   Sidearm/
    <Weapon Name>/
  Missing/
    <Weapon Name>/          ← staging for new captures of an existing weapon
```

Use the class names already used by `data/weapons.json`. Do not invent a second class label.

### 8.2 Weapon identity screenshot

One attachment-overview screen per weapon showing `CUSTOMIZE <weapon name>` in the upper left.
It anchors identity for every detail screenshot in that folder, takes capture order `0`, and is
stored as `00_<Weapon>_attachment_overview.png`.

### 8.3 Detailed stats-page screenshots

One detail screen for every selectable option in every available slot: sight/optic, muzzle,
barrel, underbarrel, magazine, ammunition, ergonomics, left/right/top accessory positions, and
any weapon-specific slot. Each detail screen must show the **detailed stats page** with the full
right-side stat panel.

The white bracket and green checkmark identify the **equipped** item. They do **not** identify
the attachment whose stats are displayed. The thick border and changed card tint identify the
**highlighted** attachment, which controls the name, description, cost, subtype and right-side
stats to transcribe.

A compact selector, collapsed panel or other partial stat view is a rejected capture even if
individual stats are visible. Keep it only long enough to identify and report the source path,
weapon and attachment to the user; request a replacement detailed-stats screenshot. Do not run
OCR, field crops, comparison extraction, transcription, null-reasoning, renaming or workbook
generation for that compact file.

### 8.4 Baseline coverage

Capture at least one screen showing the weapon's baseline/default stats. A separate `None`
capture is not required if another screenshot shows identical baseline values, but the
equivalence must be stated in the review data. Never infer a missing baseline from another
weapon.

### 8.5 Image quality

- 1365×768 is readable and acceptable; preserve the original aspect ratio.
- Capture the full detailed stats page; a compact selector/collapsed panel is recapture-only and
  must not enter the audit pipeline.
- Do not crop the attachment cards, title/description, or the right-side stats panel.
- Avoid notifications, chat overlays, performance overlays and cursor placement over values.
- If an overlay obscures a value that may change, recapture.
- If it obscures only values proven unchanged by another capture, retain the screenshot and
  record the inference explicitly.

---

## 9. Attachment categories and aliases

| In-game label | Canonical type |
|---|---|
| Muzzle | Muzzle |
| Barrel | Barrel |
| Underbarrel | Grip |
| Magazine | Magazine |
| Ammunition | Ammo |
| Ergonomics | Ergonomics |
| Sight / Optic | Sight |
| Left/Right/Top Accessory containing a laser | Laser |
| Left/Right/Top Accessory containing a light | Light |
| Shared accessory slot containing both laser and light options | Laser/Light |
| Mini Scout accessory option named Range Finder | Range Finder |

Accessory position is capture context, not schema. Use the visible `Left Accessory`,
`Right Accessory` or `Top Accessory` heading to identify selector boundaries during capture and
parsing; do not store the physical position per record.

**Shared-slot allowlist** — use `Laser/Light` only for weapons known to present both in one
selector: **GRT-BC**, **KORD 6P67**, **KTS100 MK8**, **SL9**, and **every Sidearm**. For these,
every option in the shared selector uses `attachmentType: "Laser/Light"`, including `None`,
laser-only, light-only and combined items. The list lives in
`scripts/attachment-screenshot-taxonomy.mjs` and is asserted by its test.

A weapon joins the list only on direct evidence: one selector heading, a single `None`, and light
and laser tiles visible in the same grid. KORD 6P67 was added on 2026-07-31 — its
`SELECT RIGHT ACCESSORY` grid holds three LIGHT tiles, four coloured LASER tiles and a
LASER/LIGHT combo tile under one `None`, and captures 49–59 are one uninterrupted sequence under
that heading.

Do not infer `Laser/Light` because a name contains both words. Outside the allowlist, keep the
normal `Laser` or `Light` type unless the overview and detail sequence visibly prove a shared
selector and the weapon is added to the list.

**Sidearm rules.** Treat the Sidearm Underbarrel selector as the shared `Laser/Light` group.
The **VZ. 61** is the exception that also exposes grip options in that sequence — keep those as
type `Grip`, and retain both `AUTO` and `SINGLE` in its fire modes; other Sidearms are `SINGLE`.
Recognize `Speed Holster` and `Gunslinger` as Sidearm Ergonomics with subtype `Fast Deploy`, and
keep `Improved Mag Catch` as subtype `Mag Catch`.

**Mini Scout** is a separate exception. Its `Range Finder` keeps canonical type `Range Finder`
but appears in the same selector sequence as the weapon's Lights and is mutually exclusive with
them. Do not reclassify it, and do not add a per-record slot field.

**Additional displayed subtypes** to recognize exactly: Ammo `Subsonic`, `Sub HP`, `Sub Pen`,
`Range Pen`; PW7A2's `SUBSONIC TUNGSTEN` displays `SUB. PEN.` and uses subtype `Sub Pen`; VSSM
Barrel uses `Suppressed` for both options and `Range Pen` where displayed. The highlighted card
subtype is authoritative — preserve the abbreviated canonical forms rather than expanding them.

If an attachment cannot be mapped confidently, use `Unknown` and stop before renaming or
promoting that record.

---

## 10. Filename rules

```text
<CanonicalOrder>_<Weapon>_<AttachmentType>_<AttachmentName>.png
```

```text
01_M433_Muzzle_Double-Port_Brake.png
12_M433_Barrel_Extended.png
25_PP-19_Grip_Folding_Stubby.png
38_PP-19_Laser_50_MW_Violet.png
44_GRT-BC_Laser-Light_None.png
```

### 10.1 What the numeric prefix means

The prefix is **canonical order**, not capture order: attachment type in the
[§14](#14-the-reference-workbook) Overview sequence, then capture order within each type. The
overview capture is `00`; details run `01..N`. Folder sort, weapon-sheet order and Overview order
therefore agree for every weapon.

Two orderings exist and they must not be conflated:

| | Meaning | Stored in | Authority for |
|---|---|---|---|
| `source.captureOrder` | the sequence the screenshots were taken in | review JSON + `capture-order.json` | order **within** an attachment type; evidence that a block was captured as one uninterrupted sequence |
| `source.canonicalOrder` | the filename prefix | review JSON + `capture-order.json` | display and folder sort |

Before this changed on 2026-07-31 the prefix was capture order, which produced **21 different
type sequences across 62 weapons** and 7 weapons where a type was split across two runs — so no
two folders sorted alike. See [§18.8](#188-2026-07-31--canonical-order-renumber).

**When capturing a new weapon**, shoot each category's tiles in grid order. The category order you
visit does not matter — it is normalized to the canonical sequence. Capture order is derived from
the screenshot timestamps, so a batch shot in one session records itself correctly. Filling a
single gap later is the exception: its timestamp sorts it to the end of its type, so either
re-shoot the whole category or add an explicit `capture-order.json` entry.

**`scripts/build-attachment-screenshot-review.mjs` still builds the prefix from `captureOrder`**
(see `currentName`). A full rebuild therefore proposes capture-order names and would undo the
canonical numbering. Re-run
`outputs/attachment-audit/apply-20260731-canonical-order-renumber.mjs` after every rebuild — it is
idempotent, and it also rewrites the ledger. Keeping canonical numbering in one small pass is
deliberate rather than threading a second ordering concept through the builder.

### 10.2 Rules

1. Preserve official weapon-name punctuation, such as `PP-19`.
2. Title capitalization for attachment types and names.
3. **For Barrels and Ammo use the card subtype**, because weapon-specific display names differ
   from the stable card subtype. Store the full display name and exact subtype separately.
4. For every other category use the full displayed attachment name.
5. Use `Laser-Light` for canonical `Laser/Light`. Never put `/` in a filename.
6. Remove quotation marks and other filename-invalid punctuation.
7. Never overwrite a duplicate capture — append `_duplicate-2`, `_duplicate-3` and flag it.
8. Generate and inspect the complete rename manifest before applying any rename.

---

## 11. Attachment name casing rules

Applies to `attachmentName`. `attachmentSubtype`, `attachmentType` and `attachmentDescription`
are already clean and must not be re-cased.

**Order matters.** Fix truncated and OCR-damaged values *before* applying casing — casing a
truncated string locks the damage in (`AFTERMARKET B` becomes `Aftermarket B`).

### 11.1 General rules

1. Title-case each word: first letter upper, rest lower.
2. **Initialisms stay fully uppercase** — see the keep-list in [§11.3](#113-barrels).
3. **Length prefixes stay uppercase, including the unit:** `480MM Factory`, `14.5" Factory`,
   `16" US`. Never `480mm` or `480Mm`.
4. Hyphenated tokens: case each part independently — `Triple-Port`, `Boar-F`, `Custom-H`,
   `US-LB`, `SDM-R`, `CIV-S`.
5. Round counts use the `<n>Rnd` form: `30RND MAGAZINE` → `30Rnd Magazine`.
6. Trailing periods are dropped: `GOVT.` → `Govt`.
7. A correctly cased name is left byte-identical. Do not re-case `Folding Vertical`,
   `30Rnd Fast Mag`, `5 MW Red`.

### 11.2 Content fixes — apply before casing

These are wrong values, not casing problems. Each was verified against its screenshot.

| Weapon | Current | Correct | Evidence |
|---|---|---|---|
| SOR-556 MK2 | `FACTORY` | `14.5" FACTORY` | `17_SOR-556 MK2_Barrel_Short.png` — length prefix dropped |
| PP-19 | `367MM` | `367MM CIV` | `10_PP-19_Barrel_Basic_ambiguous-2.png` — suffix dropped |
| USG-90 | `407MM CIV-s` | `407MM CIV-S` | `15_USG-90_Barrel_Extended.png` |
| SOR-556 MK2 | `16" us` | `16" US` | `13_SOR-556 MK2_Barrel_Basic.png` |
| VCR-2 | `18" us` | `18" US` | same pattern; `us` is never correct |
| — | `AFTERMARKET B` | `AFTERMARKET BUFFER` | truncated |
| — | `75RND BELT BO` | `75RND BELT BOX` | truncated |
| — | `50 MW` (Laser) | `50 MW <colour>` | truncated — recover the colour from the screenshot |

OCR digit corruption in magazines — `I` read for `1`, `O` for `0`:
`I00RND BELT BOX`, `I0ORND BELT BOX` → `100RND BELT BOX`; `I00RND BELT POUCH` →
`100RND BELT POUCH`; `I00RND DRUM MAG` → `100RND DRUM MAG`. After casing these become
`100Rnd Belt Box`, `100Rnd Belt Pouch`, `100Rnd Drum Mag`. `I00RND BELT BOX` and
`I0ORND BELT BOX` normalize to the same name but belong to different weapons — do not merge.

### 11.3 Barrels

Format is `<LENGTH> <TOKEN...>`. Keep the length as-is; apply the tables to the rest.

**Keep uppercase (initialisms):** `US` · `LE` · `OH` · `E3` · `SB` · `LB` · `MG` · `SBR` ·
`CQB` · `LSW` · `EBR` · `SPR` · `ASM` · `COB` · `DMR` · `VMW` · `3LR` · `HBAR` · `MK22` ·
`MK3` · `MK8` · `MK9` · `US-LB` · `SDM-R` · `BOAR-F` · `CUSTOM-H` · `CIV` · `CIV-S` · `IAR`

**Title-case:** `MID` · `ALT` · `CUT` · `FULL` · `LIMA` · `LONG` · `BOAR` · `PARA` · `HEAVY` ·
`RIFLE` · `SHORT` · `BASIC` · `BRAVO` · `URBAN` · `TABUK` · `PENCIL` · `FLUTED` · `COMMON` ·
`CUSTOM` · `CARBON` · `FACTORY` · `CARBINE` · `COMPACT` · `CLASSIC` · `EXTENDED` · `COMMANDO` ·
`STANDARD` · `MARKSMAN` · `INFANTRY` · `CRYOGENIC` · `ASSAULTER` · `PROTOTYPE` · `DISSIPATOR` ·
`COVERT` · `GOVT.`→`Govt`

Examples: `480MM FACTORY` → `480MM Factory` · `18" GOVT.` → `18" Govt` ·
`20" CUSTOM COVERT` → `20" Custom Covert` · `419MM BOAR-F` → `419MM Boar-F` ·
`730MM 3LR` → unchanged.

### 11.4 Other categories

- **Magazines** — `RND`→`Rnd`, `MAG`→`Mag`, `MAGAZINE`→`Magazine`, `FAST`→`Fast`, `BELT`→`Belt`,
  `BOX`→`Box`, `POUCH`→`Pouch`, `DRUM`→`Drum`, `TUBE`/`TUBES`→`Tube`/`Tubes`, `SHELL`→`Shell`,
  `SPEEDLOADER`→`Speedloader`, `LOOSE`→`Loose`, `MOON`→`Moon`, `CLIP`→`Clip`, `DUAL`→`Dual`.
  Examples: `8RND MOON CLIP` → `8Rnd Moon Clip` · `7 SHELL DUAL TUBES` → `7 Shell Dual Tubes`.
- **Ammo** — `FMJ` and `HP` stay uppercase; everything else title-cases.
  `#00 BUCKSHOT`→`#00 Buckshot` · `SUBSONIC HP`→`Subsonic HP` · `SUBSONIC TUNGSTEN`→`Subsonic Tungsten`.
- **Ergonomics** — `A3` stays uppercase. `A3 RECEIVER`→`A3 Receiver` ·
  `AFTERMARKET B`→`Aftermarket Buffer` · `BURST TRAINING`→`Burst Training` ·
  `MAGWELL FLARE`→`Magwell Flare` · `RAIL COVER`→`Rail Cover`.
- **Muzzles** — `SLANT BRAKE`→`Slant Brake` · `TRIPLE-PORT BRAKE`→`Triple-Port Brake`.
- **Grips** — `FACTORY ANGLED`→`Factory Angled` · `UNDERSLUNG MOUNT`→`Underslung Mount`.
  Leave `6H64 Vertical`, `PTT Grip Pod`, `QD Grip Pod` alone.
- **Lasers and Laser/Light** — `MW` always stays uppercase; the colour title-cases.
  `LASER/LIGHT COMBO RED` → `Laser/Light Combo Red`; note both sides of the slash capitalize, so
  a naive `.title()` yields the wrong `Laser/light Combo Red`.

### 11.5 Casing validation

1. **No ALL-CAPS names remain**, except names that are purely an initialism (`FMJ`) or a length
   prefix plus keep-list initialism (`600MM DMR`, `24" HBAR`).
2. **No all-lowercase words remain** in any name — this is what catches `16" us`.
3. **Token casing is consistent corpus-wide.** Group every name token case-insensitively; each
   must resolve to exactly one casing. Before the 2026-07-28 pass, 27 tokens had two casings.
4. **Length prefixes intact** — every barrel name that began with `<digits>MM` or `<digits>"`
   still does, unit uppercase.
5. **Record count unchanged** and no name becomes empty or loses a word.

---

## 12. Record schema

Every attachment-detail record carries:

**Identity** — Weapon Name · Attachment Type · Attachment Subtype · Attachment Cost ·
Attachment Name · Attachment Description

**Displayed stats** — Damage · Rate of Fire · Magazine Size · Hipfire · Precision · Control ·
Mobility · Fire Modes · Reload Time · Muzzle Velocity · ADS Time · Headshot Multiplier ·
Long Range Damage · 3D Spot-on-fire Range · 2D Spot-on-fire Range · Opponent Health Regen Delay ·
Collateral Multiplier · Reload in ADS · ADS Move Speed Multiplier · Sprint Recovery ·
Recoil Amount · Recoil Variation

**Audit fields** — Original screenshot path and filename · Current screenshot path and final
filename · Capture timestamp · Screenshot resolution · Raw description OCR · Raw full-screen OCR ·
Extraction status · Per-record notes · Duplicate-capture flag · Review status · Reviewer and date

Numeric fields store typed JSON numbers. Do not embed display units in the value; unit meaning
belongs in the field name or schema. Fire modes are an **ordered string array**. `Reload in ADS`
is a boolean, rendered in Excel as `Yes`/`No`/blank.

Comparison indicators live in `statComparisons`, keyed by stat field, storing direction and
effect independently: `{ "direction": "up", "effect": "penalty" }`. Direction never determines
effect.

---

## 13. Extraction workflow

### Step 1 — Confirm repository state

Run `git status --short --branch`. Preserve unrelated modified and untracked files. Do not
stage, commit, reset or delete existing work unless asked.

### Step 2 — Inventory

Per weapon folder: count PNGs; confirm exactly one overview screenshot; record filenames in
timestamp order; group detail screens by `SELECT <CATEGORY>` heading; identify duplicate
highlighted attachments, missing categories/options, and overlays or unreadable fields. Record
dimensions and group apparent duplicates by weapon plus timestamp.

Before rebuilding, reconcile prior raw OCR against the current inventory. Classify each prior
entry as retained, renamed-but-present, or deleted. A record for a deleted screenshot must not
remain in any active artifact. Preserve a dated backup before pruning.

Do not equate "not captured" with "not available" — determine availability from the overview
screen and attachment-card inventory.

### Step 3 — Raw OCR

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\extract-attachment-screenshot-ocr.ps1" `
  -InputDirectories "<weapon-folder-1>|<weapon-folder-2>" `
  -OutputPath ".\outputs\attachment-audit\raw-ocr.json"
```

Extend the existing artifact or preserve a dated copy — do not silently discard evidence. The
extractor must retain word bounding boxes and source dimensions; normalize to the 1365×768
reference canvas before parsing regions.

Do not search unrestricted full-screen OCR for category keywords — `MUZZLE VELOCITY` in the stat
panel must never classify a screenshot as `Muzzle`. Parse in order: the upper-left
`SELECT <CATEGORY>` heading region; conservative fuzzy matching against known headings within
that region only; the large attachment-title region; name semantics and same-weapon neighbouring
context; then manual review. Track confidence and the reason for any fallback.

### Step 4 — Build the attachment inventory

Per weapon, map the screenshot sequence to canonical type, shared-selector classification,
display name, card subtype, card cost and duplicate index. The screenshot is the authority;
`data/attachments.json` may normalize spelling or IDs but must not override a visibly different
current-version value.

Preserve UI order: overview is order `0`, details are contiguous from `1`. Prefix canonical
filenames with that order and sort each worksheet by it. Store the numeric order and original
timestamp filename so later rebuilds stay stable after renames.

For shared-slot weapons, identify the selector boundary from the overview, the heading and the
uninterrupted capture sequence. Do not split a shared selector because option names differ, and
do not merge two physical selectors because both contain lasers or lights.

Before generating rename targets, run these parser-quality checks: heading versus parsed
category; category/name consistency (reject grips or ammunition classified as `Muzzle`);
shared-slot consistency; names that resemble descriptions, single characters, truncated words or
stat labels; repeated screenshots collapsed to an implausibly identical name; `Unknown`
categories or subtypes; case-insensitive target collisions; duplicate-pair metadata mismatches.
Record these as parser exceptions — they are not unreadable captures.

### Step 5 — Transcribe detailed-page stats

Apply this step only to detail captures that passed the compact-panel stop gate in
[§5](#5-weapon-class-runbook). A compact panel is not eligible for partial transcription.

1. Read the fixed right-side stat panel by field position.
2. Preserve displayed precision: `2.384 s`, `630 m/s`, `x1.40`, `0.8°`.
3. Convert to typed numeric/boolean fields.
4. Fire modes as an ordered string array; `Reload in ADS` as boolean.
5. Store the typed number separately from its comparison indicator.
6. Preserve a visible indicator even when rounding makes the number equal the baseline.
7. Review stylized digits manually — Windows OCR confuses `0`, `5`, `4`, degree symbols and
   multiplier prefixes.
8. Never calculate a hidden value from a stat-bar length.
9. If a field is obscured but demonstrably unchanged, copy it only from a cited same-weapon
   baseline capture and label it an inference.
10. If a changing field is obscured or unreadable, use `null` plus `needs recapture`.

For descriptions, extract only the smaller body-text lines beneath the large title. Do not
include a repeated title or subtype label. In-game descriptions are complete sentences beginning
with a capital. A lowercase start means a truncated OCR result: inspect the screenshot and
restore the omitted leading text from visible evidence only. Flag fragments, duplicated names and
descriptions beginning mid-clause.

Normalize corrupted ADS tokens only when the screenshot visibly says aim down sights: `[AOSI`,
`IAOS)_`, `AOS,`, `IADSI`, `[ADS)` become `(ADS)` with balanced parentheses. Remove UI-label
contamination such as a leading `IA oerault` — `Default`, subtype labels, titles, unlock text and
card text are not part of the description unless visibly in the body sentence.

Numeric parsing must be field-specific and position-aware. Validate each field parser against
representative screenshots at every retained resolution before populating it corpus-wide. If
validation has not been done, leave the field `null` even when OCR produced a plausible number.

### Step 6 — Rename manifest

The manifest carries old and new absolute paths. Before renaming: verify every source exists;
verify every destination stays inside the intended weapon folder; require unique
case-insensitive destinations; stop if a destination already exists for a different file; use a
temporary intermediate filename for case-only renames on Windows.

Apply only after those checks pass and every proposed rename has passed the manual pre-rename
review gate. A non-`Unknown` parser result is not authorization. Recount afterwards and require
the same PNG count.

On reruns after earlier renames, resolve each record against both its original and current path.
Do not create ghost records because an original timestamp path no longer exists. Do not apply a
second batch until the regenerated manifest has been independently inspected.

### Step 7 — Review the transcription

Review at least: every attachment title and subtype; every cost; every arrow-marked stat; every
low-confidence OCR value; every obscured field; every duplicate capture; one unchanged baseline
per weapon; and all magazine capacity/reload and barrel/ammo velocity combinations.

Record reviewer and date. A record becomes `reviewed` only when its title, subtype, cost,
description and full displayed stat panel have been checked against the screenshot.

Before declaring a batch complete, report and manually inspect all remaining blocked rename
entries, `Unknown` categories or subtypes, suspicious or truncated names, descriptions beginning
lowercase or with repeated titles, category/name consistency failures, duplicate metadata
mismatches, unresolvable source/current files, and typed values populated without a completed
field-parser validation.

---

## 14. The reference workbook

`BF6_Attachment_Stats_Review.xlsx` is a **human-readable view of the review JSON** so the
records can be browsed without reading raw JSON. It is a reference artifact — nothing in it
feeds the live site, and it is not an input to any validation.

Build it with:

```bash
python scripts/build-attachment-workbook.py
```

**Build-once finalization rule.** Do not generate a workbook while OCR, screenshot replacement,
JSON correction, or audit triage is still in progress. Complete and verify the canonical JSON
first, then run the documented Python command **once** at the end and spot-check only the sheets
whose data changed. Never use `@oai/artifact-tool` or
`outputs/attachment-audit/build-workbook.mjs`; both are prohibited for this audit.

Takes about six seconds for all 3,177 canonical records. Options: `--json PATH`, `--out PATH`.

### What it produces

- **Overview** sheet first: an attachment-option matrix. Rows are type / field / option value;
  columns are weapons grouped by class. Each available cell is an internal `HYPERLINK` to that
  weapon's row, and its display text is that weapon's **attachment cost** for the option (`?`
  when the cost is missing or non-numeric) — reading across a row makes an odd cost stand out,
  which is how the sniper-only grip variants were caught. Unavailable options show a muted em
  dash. Attachment types appear in the order
  `Muzzle`, `Barrel`, `Light`, `Laser`, `Laser/Light`, `Grip/Laser/Light`, `Grip`, `Magazine`,
  `Ammo`, `Ergonomics` — the three accessory types stay adjacent so the shared-selector weapons
  read against the separate-selector ones. For `Barrel` and `Ammo` the option key is the
  **subtype**; for every other type it is the **attachment name**. Panes are frozen at `D3`.
  Column A is tinted by
  attachment type, a medium `#9CA3AF` rule closes each attachment-type row block, and a matching
  vertical rule runs down the last column of each weapon class, carried up through the two
  header rows.
  Row 1 labels use **Center Across Selection**, not merged cells — the label spans its group
  visually while every cell stays individually selectable, so whole columns can still be
  highlighted. In OOXML that is `horizontal="centerContinuous"` applied to every cell of the
  span, with the text in the first cell only; the span ends at the next cell carrying a value.
- **One sheet per weapon**, grouped by class in the order `Assault Rifle`, `Carbine`, `SMG`,
  `LMG`, `DMR`, `Sniper Rifle`, `Shotgun`, `Sidearm`, alphabetical within a class. Row 1 title,
  row 2 subtitle, row 4 headers, data from row 5. Rows are ordered by **attachment type using the
  same sequence as the Overview**, then by capture order within each type, so both sheets read
  top-to-bottom the same way. Types outside that sequence sort last, alphabetically. Panes frozen
  at `D5`, gridlines off, 10-point body text, default zoom. Rows 1 and 2 stay unmerged so whole
  columns remain selectable. Alternate data rows carry a light `#E2E2E2` band; column A is tinted
  by attachment type, and one medium `#9CA3AF` bottom border closes each attachment-type block.
  Because rows follow type order rather than capture order, the numeric prefix in
  `Current Screenshot Filename` is no longer monotonic down the sheet — that prefix still records
  capture order and remains the authority for it.
- **Source Index** and **Read Me** as the final two sheets. In Source Index the
  **Current Screenshot Path** cell shows the filename and hyperlinks to the capture on disk, so a
  row can be checked against its screenshot without leaving the workbook.

**Attachment-type tints.** Column A uses one hue family per attachment type on both the Overview
and the weapon sheets, all at the same lightness so no block dominates. This is what makes the
type boundaries readable while scrolling, and it is why column A is excluded from the row
banding.

| Type | Fill | Text |
|---|---|---|
| Muzzle | `#DBEAFE` blue | `#1E3A8A` |
| Barrel | `#DCFCE7` green | `#14532D` |
| Grip | `#FEF3C7` amber | `#78350F` |
| Magazine | `#FCE7F3` pink | `#831843` |
| Ammo | `#F3E8FF` purple | `#581C87` |
| Ergonomics | `#E0E7FF` indigo | `#312E81` |
| Laser | `#CCFBF1` teal | `#134E4A` |
| Light | `#FEF9C3` yellow | `#713F12` |
| Laser/Light | `#D9F99D` lime | `#365314` |
| Grip/Laser/Light | `#FDE68A` deep amber | `#78350F` |
| Sight | `#FFE4E6` rose | `#881337` |
| Range Finder | `#CFFAFE` cyan | `#164E63` |

A type with no entry falls back to slate `#F1F5F9` / `#334155`; add new types to `TYPE_PALETTE`
in the builder rather than letting them share the fallback.

Comparison-marked stats render as the arrow plus the displayed value in bold green (buff) or
bold red (penalty), right/top aligned. The per-weapon `Overview` context capture is excluded
from weapon sheets and appears in Source Index only.

Overview row order is seeded from the existing workbook at `--out`, so options that still exist
keep their established position and genuinely new ones are appended to their type. Deleting the
workbook resets the order to first-seen.

### Deliberately not done

This is a reference view, so the builder does presentation only. The following gates that
earlier versions of this document required for every workbook build have been **removed** —
they cost far more time than they were worth for an artifact that feeds nothing:

- rendering and visually inspecting all 65 sheets on every build;
- the formula-error scan;
- building twice and diffing for idempotence;
- broad regression checks over data the workbook merely displays.

Data correctness is the review JSON's job. Run [§15](#15-regression-gates) against the JSON
instead — it is the artifact that matters, and it is where every defect in
[§18](#18-correction-history) actually lived. After the final JSON gate passes, build the workbook
once and spot-check only the sheets whose data changed.

The previous builder, `outputs/attachment-audit/build-workbook.mjs`, is superseded. It required
the Codex-only `@oai/artifact-tool` package, could not run outside that sandbox, and rewrote the
generated OOXML with regexes afterwards to apply borders and fills — which is how it emitted a
`<pane>` element outside `<sheetView>`, leaving the documented `D5` freeze and 85% zoom broken in
every workbook it produced. The Python builder fixes both.

---

## 15. Regression gates

Run these against the **review JSON** before handing off a rebuild. `scripts/audit-sweep.mjs`
covers the model and consistency families; the rest are listed here so a new pass can assert
them explicitly.

### 15.1 No silent regressions

Diff the candidate JSON against the immediately preceding artifact. Every changed field must be
in an explicit pass-specific allowlist, and every allowed change must have a path-specific
durable override. Across four consecutive passes in July 2026, each fixed its target field while
silently overwriting others.

### 15.2 Reload model

- Every fast magazine equals the weapon's unaffected modal reload divided by **1.13**.
- Every Improved Mag Catch equals base divided by **1.063**.
- `KTS100 MK8 / 45Rnd Fast Mag` is the documented stacked `1.13²` exception (2.545).
- **Cross-type reload consistency:** within one weapon, Muzzle, Grip, Laser, Light, Laser/Light,
  Grip/Laser/Light, Barrel and Ammo records must all carry the same reload. Only Magazine and
  Ergonomics may differ. This is what exposed the AK-205 laser error.
- DB-12, M1014 and M87A1 store a per-shell time in sym and display a full reload — expected, and
  must not be "fixed". 18.5KS-K is **not** shell-by-shell despite sym's policy flag.

See `DERIVED_ATTACHMENT_MODEL.md` for the full model and the live-data migration plan.

### 15.3 Barrel subtype ⇔ velocity

`short` ⇔ 0.80×, `ext` (Extended / Heavy Ext / Ext Light) ⇔ 1.25×, everything else 1.00× of the
weapon baseline. Fail the record rather than defaulting the subtype to `Basic` — `Basic` was the
silent fallback that produced eight mislabels in the 2026-07-28 corpus.

Velocity cannot distinguish `Extended` from `Heavy Ext` (both 1.25×); read the highlighted tile.

### 15.4 Magazine capacity ⇔ `magazineSize`

For non-shell weapons, `magazineSize` must equal the capacity in the attachment name. Preserve
the DB-12, M1014 and M87A1 chamber-inclusive exceptions, where the displayed capacity excludes
the chambered round (`6 Shell Tube` holding 7, `5RND Speedloader` holding 6,
`7 Shell Dual Tubes` holding 16).

A contradiction does not say *which* field is wrong. When every magazine on a weapon reports the
same capacity regardless of name, suspect the capture, not the cell.

### 15.5 Structural gates

| Gate | Requirement |
|---|---|
| Cost presence | Every non-`Overview` record has a cost |
| Null-after-OCR | A null stat whose numeric pattern is present in `rawFullScreenOcr` is a parse failure, not a missing value |
| Duplicate consistency | Identical weapon + type + name must yield identical stats |
| Within-group variance | A weapon/type group with change-arrows on a field but only one distinct value across every record is stuck |
| Basic-barrel cardinality | Zero or one `Basic` barrel per weapon |
| Provenance uniqueness | No two records share an `originalFilename` |
| Filesystem agreement | Zero stale paths, zero screenshots on disk without a record |
| Casing | [§11.5](#115-casing-validation) |
| Ladder membership | Recoil amount sits on `RECOIL_MULT[weapon]^n`, recoil variation on `dirVarMult[weapon]^n`, normal velocity on `0.8^n`; subsonic uses an exact reviewed treatment register |
| Schema types | `fireModes` is an array, never a string |

The ladder gate is the only one that catches a column that is uniformly wrong across a weapon —
every other check compares records against their siblings, so a shared error looks like the
baseline. It found all five recoil-variation defects in
[§18.6](#186-2026-07-31--open-item-fixes). Run `scripts/audit-sweep.mjs` and require zero
errors, zero warnings, and no unregistered/stale treatment or exception entries; reviewed
informational entries are expected. Its recoil-amount comparison must use the hidden-precision
weapon base, float32 display conversion and positive one-decimal round-half-up rule pinned in
`DERIVED_ATTACHMENT_MODEL.md` §5.6.

---

## 16. Comparison with live site data

After review, compare screenshot records with `data/attachments.json`, `data/ammo.json`,
`data/weapons.json`, `data/recoil_decay.json`, `data/balance_tables.json`, and the attachment
logic in `sim/applyAttachments.js`.

Classify every weapon/attachment field as `verified`, `changed`, `unchanged`, `not available`,
or `needs measurement`.

Keep three concepts separate: the value the game displays; the modifier inferred by comparing it
with the same weapon's baseline; and the internal site field or formula used to reproduce it.
The displayed value does not necessarily reveal the underlying game-file modifier, because the
UI rounds.

---

## 17. Promotion rules and tests

Do not write provisional OCR values into live data. A value may be promoted only when:

1. the weapon and highlighted attachment are unambiguous;
2. the value is visually reviewed;
3. units and rounding are understood;
4. the target site field is known;
5. compatibility restrictions are recorded, including shared-selector mutual exclusivity and the
   Mini Scout Range Finder/Light exception, without adding per-record slot fields;
6. provenance includes the screenshot filename and capture date; and
7. a focused test demonstrates the intended behavior.

When converting a displayed absolute into a modifier, preserve both the displayed value and the
calculation. Never reuse a percentage from another weapon without evidence.

After promotion:

```bash
node scripts/validate-data.mjs
node --test
git diff --check
```

Add focused attachment tests covering recoil amount and variation; ADS/hip spread and recovery;
movement spread; muzzle velocity for barrel/ammo combinations; ADS time and sprint recovery;
magazine capacity and reload time; reload-in-ADS behavior; spot-on-fire ranges; compatibility
restrictions; and shared-link/default-loadout serialization.

---

## 18. Correction history

### 18.1 2026-07-23 → 2026-07-26 — Assault Rifles

701 Assault Rifle screenshots across 11 weapon folders. All readable detail fields transcribed.
The 12 overlay-obscured NVO-228E muzzle screenshots were replaced with detailed-panel captures on
2026-07-26 and transcribed. EF88 retains 63 resized 1365×768 screenshots after full-resolution
copies were removed.

L85A3 received a complete user review with 176 screenshot-reconciled comparison indicators; its
reconciliation intentionally corrects four missed or shifted workbook entries from screenshot
evidence — Tungsten Core is red `↓31` Precision and red `↓41` Control, and the 646MM CUT/LSW
barrel rows keep plain Control `44` while their red `↓48`/`↓46` values belong to Mobility.
M16A4 and EF88 received targeted subtype/cost edits only.

Screenshot-confirmed AK4D barrel subtype corrections: `600MM CUT` → `Heavy`, `600MM DMR` →
`Heavy Ext`, `409MM US` → `Short`.

### 18.2 2026-07-28 — name normalization

245 records renamed: 243 ALL-CAPS values plus two lowercase `us`. The rules are now
[§11](#11-attachment-name-casing-rules). Before the pass, 27 name tokens carried two different
casings. Content fixes were applied before casing so truncations were not locked in.

Two non-casing defects found during the same review:

- **PP-19 `367MM CIV` cost was wrong** — recorded `10`, but the EXTENDED tile reads **5**; `10`
  is the BASIC tile's cost, so the wrong badge was read.
- **USG-90 `407MM CIV-S` subtype was wrong** — recorded `Extended`, must be **`Heavy Ext`**. The
  highlighted tile reads HEAVY EXT. and the description says "Long **heavy** barrel". Velocity
  cannot distinguish the two, so this class of error needs the tile, not the multiplier.

### 18.3 2026-07-28 — manual corrections

50 field changes across 46 records, verified against screenshots before applying.

| Check | Before | After |
|---|---|---|
| Reload model (fast mag / Mag Catch) | 89/119 | **118/119** |
| Barrel subtype ⇔ velocity | 2 disagreements | **0** |
| Magazine capacity ⇔ `magazineSize` | 22 contradictions | **10** (all legitimate shotgun tubes) |
| Duplicate groups with disagreeing stats | — | **0** |

- **Reload reductions restored — 36 records.** Fast-magazine and Mag Catch records had been
  overwritten with the weapon's base reload, losing the reduction. 25 read exactly the base.
  Weapons corrected: 18.5KS-K, ES 5.7, GGH-22, GRT-CPS, L115, LMR27, M2010 ESR, M39 EMR, M45A1,
  Mini Scout, P18, PSR, SV-98, SVDM, SVK-8.6, VSSM, VZ. 61. On **L115** the values were crossed —
  `7Rnd Fast Mag` held the base 2.75 while `Improved Mag Catch` held the fast value 2.434;
  corrected to 2.434 and 2.587.
- **AK-205 laser reload — 7 records.** All seven carried 2.337, that weapon's *Mag Catch* value.
  `53_AK-205_Laser_5_MW_Red.png` reads 2.484S; corrected to 2.484.
- **`magazineSize` inherited the weapon default — 11 records.** Later-captured magazines kept the
  first magazine's capacity: L115 7Rnd (5→7), Mini Scout 15/20Rnd (10→15/20), PSR 7Rnd (10→7),
  RPKM 30Rnd and 36Rnd (40→30/36), VSSM 10Rnd Fast (20→10).
- **Barrel velocities — 3 records.** LMR27 `24" Extended` 800→**1000** (`1,000M/S`, the only
  comma-formatted velocity in the corpus, which is why it failed to parse); M44 `8.37" Long`
  440→**550**; AK-205 `50Rnd Magazine` subtype `36 Rnd`→**`50 Rnd`**.
- **29 additional cross-type reload values** on Muzzle, Grip, Laser/Light, Barrel or Ammo records
  had inherited a fast-magazine or Mag Catch reload; reconciled to each weapon's modal unaffected
  reload as explicit same-weapon inferences.

Left alone deliberately: the 10 shotgun chamber-inclusive capacity contradictions, and the seven
AK-205 laser records whose **collapsed stat panel** shows only four bars and four icons.
This is historical evidence only. Under the current compact-panel stop gate, a newly encountered
or re-audited compact capture is reported for recapture rather than partially transcribed.
The collapsed panel is a **per-screenshot** condition, not a per-slot rule — 322 records share the
`SELECT RIGHT ACCESSORY` header and most show the full panel. Never encode
"RIGHT ACCESSORY ⇒ these fields are null".

Mirrored into `manual-review-overrides.json` by
`outputs/attachment-audit/reconcile-20260728-manual-fixes.mjs`; the executable gate is
`outputs/attachment-audit/verify-20260728-manual-fixes.mjs`.

### 18.4 2026-07-28 — corpus-wide repairs

- Printed one-decimal recoil amount read from screenshot glyphs for 3,083 detailed captures,
  overriding stuck parser values without inferring from arrows. Before this, 30 weapon/type
  groups carried a single stuck value across 115 arrowed records, and 482 values were null —
  seven belt-fed LMGs (DRS-IAR, L110, M121 A2, M123K, M240L, M250, M60) were 100% null because
  labels and values land in different parts of the OCR string and the parser paired them
  positionally, dropping the last two panel rows.
- All non-Overview costs populated from screenshot-visible grids (105 real nulls; the other 62
  were Overview records, which have no cost by definition).
- Duplicate-name groups reconciled to their actual identities; the M1014 SLUGS outlier resolved
  to `2.6` (it had read 42.6, ~16× its sibling and the highest in the corpus).
- Barrel subtypes re-read from the outlined inspected tiles, with the Basic cardinality rule.
- Eight barrel subtype mislabels corrected where `Basic` had been the silent fallback: GRT-CPS
  `20" FACTORY`, M60 `22" E3 LONG`, PP-19 `367MM`, RPK-74M and RPKM `590MM FACTORY`, SVK-8.6
  `560MM FACTORY` → `Extended`; M240L `24" BRAVO` → `Heavy Ext`.
- AK-205 grip mobility/recoil, RPKM grips (13→19), TR7 lasers (5→7), RPK-74M magazine names
  including `95Rnd Drum`, capacity-encoded magazine subtypes, and all non-recoil phantom arrows
  (97→0).

### 18.5 2026-07-31 — missing-attachment import and its repairs

Eight groups of previously missing attachments were captured and imported — 35 records:

| Group | Records |
|---|---|
| M417 A2 — Ammo | 7 |
| SOR-300SC — Barrel | 5 |
| SG 553R — Light | 4 |
| M277 — Barrel | 6 |
| KTS100 MK8 — Barrel | 3 |
| M121 A2 — Light | 4 |
| M45A1 — Magazine | 2 |
| RPK-74M — Light | 4 |

**The import itself was correct** — full stat blocks, correct subtypes, costs, descriptions,
renamed files present on disk, `mappingReviewStatus: visually-checked`.

**The rebuild around it was not.** Inserting records renumbered every screenshot after the
insertion point, and the rebuild reattached records to screenshots by numeric filename prefix
instead of by identity. Repaired by
`outputs/attachment-audit/apply-20260731-missing-import-repairs.mjs`, verified by
`verify-20260731-missing-import-repairs.mjs` (21 checks):

1. **M277 laser block scrambled.** `53_M277_Laser_None.png` and `54_M277_Laser_5_MW_Red.png` were
   verified visually as NONE and 5 MW RED; the rebuild labelled them `120 MW Blue` and `None`,
   losing `5 MW Red` and duplicating `120 MW Blue`. Both records rebuilt.
2. **`Laser | None` re-typed to `Light`** on AK4D, EF88, NVO-228E and M417 A2, because the
   renumbered Light block reused its old numeric prefix. Reverted.
3. **Eight records dropped silently** — RPKM grips 27–32 and TR7 lasers 50 and 52. Their
   screenshots survived on disk, referenced by nothing, and were absent from
   `coverage-report.json` too. Restored.
4. **Two names lost to OCR** — M240L `TUNGSTENGORe-vov.-4` → `Tungsten Core`, M277 `None` →
   `Frangible`.
5. **39 hand-corrected stat values overwritten** by a noisier OCR pass, across 37 records.
   M433 alone lost 20: every magazine collapsed to `magazineSize: 30`, both barrels to
   `muzzleVelocityMps: 630`, and 14 grip/muzzle/laser recoil values churned. Also KTS100 MK8
   `50Rnd Magazine` (three fields nulled), VCR-2, AK-205 and SOR-300SC magazine capacities,
   M121 A2 `Tungsten Core` collateral 1→0, M45A1 `Flashlight` hipfire, three EF88 laser
   mobilities. Spot-checked against screenshots before restoring: M433 40Rnd reads MAG **40**,
   SOR-300SC 36Rnd reads MAG **36**, M433 Folding Vertical reads **0.7°** — the curated values
   were right in every case.
6. **Seven `Underslung Mount` costs** dropped to null; **one description** replaced by the OCR
   fragment `"1=-.-"`; **13 mapping statuses** downgraded from `visually-checked`.
7. **Manual-review provenance notes wiped file-wide** — 20 distinct note types from
   2026-07-26…30, including the 2026-07-30 visual-review marker. 2,456 notes merged back.
8. **Provenance** restored for 88 records, and the newly imported M417 A2 / SOR-300SC / M277
   records repointed at the `Missing/` captures they were actually built from, recovered by
   matching raw OCR text against `raw-ocr-missing-20260731.json` (the pre-rename pass — the
   `-final-` pass re-OCRs the same screenshots after they were moved).

Record count: 3,171 before the import → 3,206 after import and repair.

**The lesson is [§4.7](#4-core-processing-principles) and runbook step 9:** never reattach
records to screenshots by numeric position, and always re-check `originalFilename` uniqueness
after a renumber.

### 18.6 2026-07-31 — open-item fixes

Applied by `outputs/attachment-audit/apply-20260731-open-item-fixes.mjs` (idempotent).

- **Eleven barrel names re-cased** to satisfy [§11.3](#113-barrels). The 2026-07-28
  normalization pass predated these records, so they arrived ALL-CAPS: SOR-300SC `9" FACTORY`,
  `10.5" CUSTOM`, `7.5" COMPACT`, `9" FLUTED`, `9" CRYOGENIC`; M277 `13" FACTORY`,
  `13" PROTOTYPE`, `16" RIFLE`, `16" CUSTOM`, `13" FLUTED`, `13" CRYOGENIC`. The remaining 31
  ALL-CAPS barrel names are length prefix plus a keep-list initialism and are correct.
- **Seven AK-205 laser records** had `fireModes` as the string `"AUTO/SINGLE"` instead of an
  array; converted. These are the compact-panel captures from
  [§18.3](#183-2026-07-28--manual-corrections).
- **171 `recoilVariationDegrees` values corrected across five weapons.** The audit-sweep ladder
  check reported 22 off-ladder readings; every one was a transcription error, and all 22
  warnings clear after the fix. Each value was read from the magnified RECOIL VARIATION row of
  the named screenshot:

  | Weapon | Was | Now | Records | Evidence |
  |---|---|---|---|---|
  | M4A1 | 40.7 | **30.7** | 53 | `17_M4A1_Grip_None.png`, `13_M4A1_Barrel_Basic.png` |
  | M277 | 34 | **34.4** | 56 | `01_M277_Muzzle_None.png`, `19_M277_Grip_None.png` |
  | VCR-2 | 50.4 | **50.3** | 60 | `01_VCR-2_Muzzle_None.png`, `17_VCR-2_Grip_None.png` |
  | GRT-BC Linear Comp | 20.6 | **20.2** | 1 | `08_GRT-BC_Muzzle_Linear_Comp.png` |
  | LMR27 `24" Extended` | 8 | **11** | 1 | `14_LMR27_Barrel_Extended.png` |

  On M4A1, M277 and VCR-2 the error covered every record *except* the block that disagreed, so
  the modal baseline was the wrong value — see [§3](#3-open-items) item 2. The correction also
  resolved a live question in the derived-model work: Linear Comp looked like it needed a flat
  0.789 variation multiplier, but with correct baselines it is a plain −3 tier step on all four
  weapons.

### 18.7 2026-07-31 — KORD 6P67 shared accessory selector

`outputs/attachment-audit/apply-20260731-kord-shared-selector.mjs` retyped 11 KORD 6P67 records
from separate `Laser` and `Light` to the shared `Laser/Light` type and renamed their screenshots
to the canonical `Laser-Light` filename token. Capture order was unchanged, so nothing renumbered;
the folder's PNG count was asserted identical before and after.

The evidence is `SELECT RIGHT ACCESSORY` on `49_KORD 6P67_Laser-Light_None.png`: one grid holding
three LIGHT tiles, RED / VIOLET / GREEN / BLUE LASER tiles and a LASER/LIGHT combo tile, under a
single `None`, with captures 49–59 forming one uninterrupted sequence. KORD 6P67 was added to the
allowlist in `scripts/attachment-screenshot-taxonomy.mjs` and to its test.

### 18.8 2026-07-31 — canonical-order renumber

`outputs/attachment-audit/apply-20260731-canonical-order-renumber.mjs` changed the meaning of the
filename prefix from capture order to canonical order. **2,106 of 3,206 files renamed**, across
56 weapons.

The prefix used to record the order the screenshots were taken in. Because capture sessions
visited the categories in whatever order suited them, that produced **21 distinct type sequences
across 62 weapons** — the two most common being `Muzzle > Barrel > Light > Grip > …` (18 weapons)
and `Muzzle > Barrel > Grip > … > Laser > Light` (16) — plus 7 weapons where one type was split
across two runs (M1014's duplicate-capture pair was the worst, at
`Grip > Magazine > Ammo > Laser > Grip > Magazine > Ammo > Laser`). No two folders sorted alike,
and the fragmented weapons did not even group a type together.

Renames ran in two phases through temporary names, because canonical order permutes positions
within a weapon and a direct rename would clobber a file that had not moved yet. Per-folder PNG
counts were asserted unchanged and the temporary names asserted gone.

**The capture sequence was preserved, not discarded.** `source.captureOrder` is untouched,
`source.canonicalOrder` was added, and `capture-order.json` was rewritten as a complete ledger —
**3,206 entries, up from 1,563** — so a rebuild reads the capture sequence from the ledger instead
of re-deriving it from a prefix that no longer encodes it. The precedence in
`scripts/build-attachment-screenshot-review.mjs` was changed to prefer the ledger over a retained
filename prefix.

Verified by rebuilding into a throwaway audit root via `BF6_ATTACHMENT_AUDIT_ROOT`:
**captureOrder survived on 3,170 of 3,172 comparable records.** Two differed
(`EF88 / Light / None` 59→52 and `M2010 ESR / Laser / 50 MW Green` 39→41); both sit in
duplicate-identity groups and the test ran against deliberately stale OCR, so they need
re-checking on a properly reconciled rebuild rather than being treated as clean.

That same test surfaced the caveat now recorded in [§10.1](#101-what-the-numeric-prefix-means):
the builder still derives the prefix from `captureOrder`, so a rebuild proposes capture-order
names on 2,075 files and would undo this pass. The renumber script is therefore a required
post-rebuild step. It also confirmed that rebuilding against stale OCR drops every record whose
file has moved — 34 identities vanished, including all 11 KORD 6P67 records — which is the same
failure documented in [§18.5](#185-2026-07-31--missing-attachment-import-and-its-repairs) and the
reason runbook step 10 reconciles paths first.

---

### 18.9 2026-08-01 — magazine costs and ledger path reconciliation

**Magazine cost corrections: 17 records.** Tier 1 applied 11 base-31 price-ladder corrections
without re-reading screenshots: each value contradicted its own weapon's internal ordering.
B36A4, M16A4 and SOR-556 MK2 `20Rnd Magazine` changed **50 -> 5**; M433 `20Rnd Magazine`
**10 -> 5**, `30Rnd Magazine` **20 -> 5**, `36Rnd Magazine` **0 -> 15**, and `40Rnd Fast Mag`
**10 -> 30**; M16A4, SOR-556 MK2 and VCR-2 `20Rnd Fast Mag` changed **15 -> 5**; and KORD
6P67 `40Rnd Magazine` changed **5 -> 25**.

The reusable stock-31 ladder is: for every stock-31 weapon across Assault Rifle, Carbine, SMG
and LMG, Standard `20/30 Rnd = 5`, `36 = 15`, `40 = 25`, `45 = 35`, `50 = 45`, `60 = 55`;
Fast Mag `20 = 5`, `30 = 10`, `40 = 30`, `45 = 40`.

Tier 2 re-read nine candidates from the original screenshots after cross-weapon comparison
flagging. Six were corrected: EF88 `42Rnd Magazine` **5 -> 25**, LMR27 `15Rnd Fast Mag`
**5 -> 25**, TR7 `20Rnd Magazine` **15 -> 5**, M277 `30Rnd Magazine` **20 -> 40**, GRT-CPS
`30Rnd Magazine` **5 -> 40**, and PP-19 `30Rnd Fast Mag` **5 -> 10**. Three were confirmed
unchanged: M417 A2 `25Rnd Magazine` **15**, M121 A2 `50Rnd Belt Pouch` **10**, and M240L
`100Rnd Belt Box` **25**.

**Tile-selection gate.** In the magazine grid, the EQUIPPED tile has a white border and green
checkmark and is usually the first tile. The VIEWED tile, which the panel title describes and
whose cost belongs in the record, has the lighter highlight box and no checkmark. Match the
title to the tile by both capacity and variant word: `RND` and `FAST` are separate tiles at
different prices. Two initial misreads demonstrate the gate: EF88 `42Rnd Magazine` was first
read from the adjacent `36 RND` tile instead of `42 RND`; M121 A2 `50Rnd Belt Pouch` was first
read from the equipped `50 RND` tile instead of the viewed `50 FAST` tile. The latter also
contradicted the panel description, "50 round belt pouch with faster reloads".

`source.rawFullScreenOcr` is not admissible cost evidence. It is garbled; TR7 `20Rnd Magazine`
contains `ø25` in that field while the screenshot cost is **5**. Costs must be read from the
image grid.

**Ledger path reconciliation.** The canonical-order renumbering left **1,765 of 2,982** override
entries keyed to screenshot filenames that no longer exist, so their corrections could never
apply on re-import. Two rounds re-keyed **1,479** of them in place to the matched record's
`source.currentPath`, leaving **286 outstanding**.

Round 1 resolved 1,094 entries on `(weaponName, attachmentType, attachmentName)`. Round 2
resolved a further 385 on the **prefix-stripped screenshot filename**, which survives the
renumbering intact: the entries round 1 deferred as `ambiguous-no-record` mostly have null or
pre-normalization metadata, not unidentifiable captures. The two keys were checked against each
other on the 1,188 orphans where both resolve uniquely and agree on 1,187; the exception is EF88
`Light`/`None`, where the capture was reclassified `Light` -> `Laser` so the filename word itself
changed and only the metadata key is correct. Prefer the metadata key, and treat the filename key
as the fallback it is.

**Re-keying a dead entry makes its updates live again, so round 2 re-keyed only entries whose
updates already equal the record.** That gate matters: 13 otherwise-eligible orphans were left
dead because they would have regressed the record — an OCR-garbage `attachmentName`
(`TUNGSTENGORe-vov.-4` over `Tungsten Core`), magazine sizes larger than the magazine (48 on a
20-round), a stuck `mobility` of 50 repeated across unrelated weapons, and a cross-type reload
time. All were superseded by the 2026-07-28 corpus-wide repairs in section 18.4. A revived stale
override is worse than a dead one.

The 286 still outstanding, itemised in
`outputs/attachment-audit/ledger-path-drift-20260801-round2.json`, all need a judgment call
rather than a key repair: 190 resolve onto a record that already has a live entry and whose values
they merely restate, so they carry no information; 58 resolve onto an occupied record but disagree
with it, needing per-field adjudication — the 12 SL9 `Laser/Light` entries are the hard case, where
the live entry is right on `spotOnFire2dM` (150) but appears wrong on `collateralMultiplier` (0);
13 are the superseded set above; 11 are KORD 6P67 captures from before its separate `Light` and
`Laser` selectors were consolidated into one `Laser/Light` selector, whose `updates.attachmentType`
would regress that consolidation; and 14 are `_duplicate-2` M1014 remnants whose captures no longer
exist at all. Do not merge or heuristically resolve these without screenshot evidence.

The idempotent passes are `outputs/attachment-audit/apply-20260801-magazine-cost-corrections.mjs`,
`outputs/attachment-audit/apply-20260801-tier2-magazine-costs.mjs`, and
`outputs/attachment-audit/apply-20260801-ledger-path-reconciliation.mjs`, followed by
`outputs/attachment-audit/apply-20260801-ledger-path-reconciliation-round2.mjs`. Evidence artifacts
are `outputs/attachment-audit/tier2-20260801-magazine-cost-validation.json`,
`outputs/attachment-audit/ledger-path-drift-20260801.json` and
`outputs/attachment-audit/ledger-path-drift-20260801-round2.json`. Host-side finalization regenerated
the workbook at **62 weapons / 65 sheets / 3,177 records**, with all 17 corrected magazine costs
visible in Overview.

### 18.10 2026-08-01 — by-class ammo stat rules and 283 corrections

Three stats are set by weapon class and equipped ammunition rather than by the attachment being
inspected, so they are checkable corpus-wide without re-reading screenshots. Encoding them caught
283 bad values. The rules and their exceptions are in section 21; the gate is
`scripts/validate-ammo-stat-rules.py`, which must report zero violations.

The raw check produced 494 violations, of which **213 were the rules being wrong, not the data** —
every one traced to a per-weapon exception now encoded in section 21. Do not mass-correct against
a class rule before confirming the deviating weapons individually; the false-positive rate here
was 43%.

The 283 real corrections, by signature:

- **EF88 and BROD 3 headshot — 123 records.** Both stat screens understate the multiplier; EA has
  acknowledged this and confirmed the in-game value is the class value. **These records
  deliberately disagree with their screenshots**, the only place in the corpus where that is true.
  Do not "fix" them back to the captured value.
- **`collateralMultiplier` of 0 — 92 records** on L85A3, VSSM and SL9. Zero is never valid.
  Screenshots confirmed L85A3 0.75, SL9 0.57, VSSM 1.00.
- **Regen delay bleed — 28 records.** Frangible rows had lost their 9s while adjacent captures had
  wrongly inherited them, and the same for Flechette's 7s on shotguns. One M433 record read 10,
  which is not a legal value.
- **Values reading exactly `1` — 25 records.** Synthetic Tip headshot and SMG/Sidearm Tungsten Core
  collateral, both the arrow-glyph misparse of section 18.4.
- **13 records the user confirmed in game**, having no automatic signature.

Two SVK-8.6 ammo costs were corrected in the same pass: `Match Grade` 20 -> **10** and
`Hollow Point` 15 -> **20**. A follow-up run added VSSM `Tungsten Match` collateral 0 -> **1.00**
once ammo keying moved from subtype to attachment name (section 21.5), bringing the pass to 284.

Applied by `outputs/attachment-audit/apply-20260801-ammo-stat-rule-corrections.mjs`, mirrored into
the override ledger, which grew 2,982 -> 3,041 entries with no duplicate paths.

**Evidence-block paths.** Evidence records the screenshot behind a correction, under either a
`source` or a `sourcePath` key depending on which pass wrote it. Anything walking these must check
both. The renumbering left 744 of them naming files that no longer exist — the same drift as the
ledger keys, one layer down, and inert because nothing matches on them. 231 that resolved to
exactly one record were re-pointed by
`outputs/attachment-audit/apply-20260801-evidence-path-reconciliation.mjs`. **513 remain dead on
purpose**: 2 are ambiguous and 511 name captures that are genuinely gone — raw
`Battlefield 6 Screenshot ...` originals and removed `_duplicate-2` files. A path to a capture that
no longer exists is history, not drift, and rewriting it would fabricate provenance.

**Untranscribed captures on disk.** 33 PNGs under `Weapon Attachments/` are referenced by no
record: 3 in an `M433/Examples/` folder, 1 oddly-named L110 grip capture, and 29 M1014
`_duplicate-2` files. The M1014 set is **not** a transcription gap — it is a second capture of
attachments already covered, matching M1014's existing 15 Grip / 7 Laser / 4 Ammo / 3 Magazine
records exactly. Left in place; do not transcribe them as new records.

---

## 19. Stop conditions

Stop and report rather than guessing if:

- weapon identity is not anchored by an overview screenshot;
- the highlighted attachment cannot be distinguished from the equipped attachment;
- attachment name, subtype or cost is unreadable;
- a changed stat is obscured;
- two screenshots would produce the same filename but are not known duplicates;
- a screenshot count differs before and after renaming;
- a derived artifact contains a screenshot that no longer exists;
- a target path escapes the intended capture root;
- an attachment cannot be mapped to a canonical category;
- an underlying modifier cannot be derived from the rounded displayed value;
- live-data changes would require inventing availability, compatibility or a zero value;
- a proposed filename rests only on non-empty OCR without visual confirmation;
- a repeated capture pair produces different metadata; or
- a numeric parser has not been validated for that field and resolution.

---

## 20. Handoff report

Return a concise report containing:

1. weapons processed;
2. screenshot counts before and after renaming;
3. attachment-detail records created;
4. duplicates and missing captures;
5. unreadable or obscured fields;
6. parser-blocked and visually unreadable counts, reported separately;
7. `Unknown`, suspicious-name, category-consistency, stale-record and collision counts;
8. review and promotion counts;
9. live files changed;
10. tests run and results;
11. remaining Phase 4 blockers;
12. direct paths to the JSON, workbook, coverage report and updated plan;
13. the exact command used to recompute the reported counts from the final artifacts; and
14. every screenshot-specific override added in the run, separated into visually confirmed
    values, same-weapon inferences, and unresolved/null fields.

Update `BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md` after each batch — Task 4.6 weapons
inventoried/reviewed, 4.7 barrel/ammunition velocity coverage, 4.8 fields reviewed and promoted,
4.9 coverage-matrix status, 4.10 modifier-to-absolute-value fixtures. Do not mark a task complete
because screenshots exist; distinguish captured, transcribed, reviewed, promoted and tested.

---

## 21. Ammo stat rules by weapon class

`headshotMultiplier`, `collateralMultiplier` and `opponentHealthRegenDelaySeconds` are determined
by weapon class and the ammunition in the ammo slot. They do not vary by the attachment being
inspected, so any record disagreeing with its class rule is transcribed wrong — subject to the
exceptions below, which are real and numerous.

**Non-ammo records carry the default-ammo values.** The stat panel shows the loadout as configured
while that attachment was captured, and the ammo slot sits at its default. Only the ammo slot
drives regen delay, so **every non-ammo record must read 5s**.

### 21.1 Headshot multiplier

| Class | Ammo | Value |
|---|---|---|
| Sniper Rifle | all | 1.75 |
| DMR — GRT-CPS, LMR27 | Standard, Penetration, Lightweight, Frangible, Long-Range | 1.34 |
| DMR — GRT-CPS, LMR27 | Hollow Point | 1.50 |
| DMR — GRT-CPS, LMR27 | Synthetic | 1.75 |
| DMR — M39 EMR, SVDM, SVK-8.6 | Standard, Penetration, Lightweight, Frangible, Long-Range | 1.50 |
| DMR — M39 EMR, SVDM, SVK-8.6 | Hollow Point | 1.75 |
| DMR — VSSM | all | 1.80 |
| Shotgun | #01 Buckshot, #00 Buckshot, Flechette | 1.00 |
| Shotgun | Slugs | 1.34 |
| Full auto / burst, incl. VZ. 61 | Standard, Penetration, Lightweight, Frangible | 1.40 |
| Full auto / burst, incl. VZ. 61 | Hollow Point, Subsonic HP | 1.57 |
| Full auto / burst, incl. VZ. 61 | Synthetic | 1.80 |

Semi-automatic sidearms other than the VZ. 61 have no stated rule and are not checked.

### 21.2 Collateral multiplier

| Class | Ammo | Value |
|---|---|---|
| AR, Carbine, LMG, DMR, Sniper | Hollow Point, Frangible, Synthetic | 0.67 |
| AR, Carbine, LMG, DMR, Sniper | Standard, Lightweight | 0.75 |
| AR, Carbine, LMG, DMR, Sniper | Penetration | 1.00 |
| SMG, Sidearm | Frangible, Hollow Point, Subsonic, Subsonic HP | 0.50 |
| SMG, Sidearm | Standard | 0.57 |
| SMG, Sidearm | Penetration | 0.75 |
| Shotgun | #01 Buckshot, #00 Buckshot, Slugs | 0.33 |
| Shotgun | Flechette | 0.57 |

### 21.3 Opponent health regen delay

Flechette **7s**, Frangible **9s**, everything else — including every non-ammo record — **5s**.

### 21.4 Per-weapon exceptions

These are confirmed, not suspected. They accounted for 213 of the 494 raw violations on the first
pass, so treat the class tables as a first approximation and this list as authoritative.

**Weapons that do not default to Standard ammo.** Their non-ammo captures show a different row:

| Weapon | Default ammo | Consequence |
|---|---|---|
| GRT-CPS | Hollow Point | non-ammo records read 1.50 headshot / 0.67 collateral |
| VSSM | Penetration | non-ammo records read 1.00 collateral; it has no Standard ammo at all, its set being Tungsten Match, Tungsten Core, Match Grade and Frangible |

**Raised collateral scale.** The PW7A2, USG-90 and ES 5.7 sit one tier above the SMG/Sidearm
table: **0.67** where the class says 0.57, **0.83** where it says 0.75, **0.57** where it says
0.50. Confirmed for the PW7A2 and USG-90 on every row; the ES 5.7 is confirmed on Standard only.

**Weapons holding their Standard value on the frangible / hollow-point rows**, rather than
dropping a tier: M45A1 at **0.57** and M121 A2 at **0.75**. Their classmates do drop — P18, M44
and VZ. 61 are 0.50 on both rows.

**EF88 and BROD 3 headshot.** The stat screen is bugged and understates it; the in-game value is
the class value. Their records intentionally diverge from their captures. See section 18.10.

### 21.5 Ammo naming — key on the name, not the subtype

`attachmentSubtype` does not partition the ammunition cleanly, so keying rules on it produces
wrong answers. `Match Grade` files under **both** `Long-range` and `Range Pen`, and `Range Pen`
also holds `Tungsten Match`, which is a penetration round. Reading `Range Pen` as a penetration
subtype therefore prices five Match Grade records at 1.00 when they are 0.75.

Worse, `Range Pen` was not always a real category. On the L115, M2010 ESR and SV-98 the Match
Grade round had been transcribed from the adjacent **PENETRATION** tile rather than the viewed
**LONG-RANGE** one, taking that tile's subtype *and* its cost of 5. All three screenshots show
`LONG-RANGE` at 10, and the panel description — "Long-range, standard-penetration ammunition" — is
almost certainly what pulled the transcription toward the penetration slot. Corrected on
2026-08-01 to `Long-range` at cost 10, which matches the five Match Grade records that were
already right, and the captures were renamed from `_Ammo_Range_Pen.png` to `_Ammo_Long-range.png`
with the ledger re-keyed in the same operation by
`outputs/attachment-audit/apply-20260801-match-grade-subtype-rename.mjs`.

Only the VSSM's `Tungsten Match` is a genuine `Range Pen` round.

The attachment **name** does partition cleanly, so it takes precedence wherever it is one of:

| Attachment name | Rule category |
|---|---|
| Tungsten Core | Penetration |
| Tungsten Match | Penetration |
| Match Grade | Long-Range |
| Subsonic Tungsten | Subsonic Tungsten — its own row, see below |

`Long-Range` sits with Standard and Lightweight at **0.75** collateral for the heavy classes,
confirmed across all eight Match Grade records.

`Subsonic Tungsten` is a penetration round by name but does **not** take the penetration value:
on the PW7A2 it reads 0.67, the same as that weapon's Standard row, not its 0.83 penetration row.
It appears once in the corpus, so it is carried as its own category rather than generalised.

Shotgun shells file every round under the `Standard` subtype, so they key on attachment name too.
