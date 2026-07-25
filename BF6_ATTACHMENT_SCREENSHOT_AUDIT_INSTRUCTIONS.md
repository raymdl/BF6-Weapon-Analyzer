# BF6 Attachment Screenshot Audit — Luna Handoff Instructions

## Purpose

Use these instructions after the remaining Battlefield 6 attachment screenshots have been captured. The objective is to:

1. inventory every supplied screenshot;
2. associate each screenshot with the correct weapon and highlighted attachment;
3. rename the images consistently;
4. transcribe every displayed attachment field into a reviewable provisional dataset;
5. record coverage gaps and ambiguous captures explicitly;
6. compare reviewed values with the current site data; and
7. promote values into live data only after the transcription and interpretation have been checked.

The existing M433 and PP-19 work is the reference implementation. Do not assume that either weapon's modifiers apply to another weapon.

## Current reference artifacts

- Compiled review data: `outputs/attachment-audit/attachment-screenshot-review.json`
- Rename map: `outputs/attachment-audit/rename-manifest.json`
- Raw Windows OCR: `outputs/attachment-audit/raw-ocr.json`
- OCR extractor: `scripts/extract-attachment-screenshot-ocr.ps1`
- Review-data builder: `scripts/build-attachment-screenshot-review.mjs`
- Rename helper: `scripts/apply-attachment-screenshot-renames.ps1`
- Folder-organization example: `scripts/organize-attachment-screenshot-folders.ps1`
- Release plan: `BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md`, Phase 4

The review JSON is provisional evidence. It is not the authoritative site attachment dataset.

## Core processing principles

1. The current screenshot filesystem is authoritative for capture existence. OCR JSON, review JSON, rename manifests, workbooks, and prior reports are derived artifacts and must not resurrect files that the user deleted.
2. Separate four decisions for every screenshot: file exists, screenshot is visually readable, parser extracted it confidently, and a human reviewed it. Parser uncertainty is not the same as an unreadable screenshot.
3. OCR is an indexing aid, not final evidence. Use screenshot geometry, the highlighted card, and direct visual inspection before accepting a category, title, subtype, cost, description, or displayed stat.
4. Never treat a non-empty OCR string as sufficient for renaming. Plausible OCR corruption can still produce a valid but wrong filename.
5. Reruns must be idempotent: the same retained screenshots and parser version must produce the same records, proposed names, duplicate assignments, and coverage totals.
6. Keep inventory, OCR, parsing, visual review, rename application, transcription, promotion, and testing as separate gates. Passing one gate does not authorize the next.

## Authoritative workflow and Assault Rifle status — 2026-07-24

This section supersedes the older 2026-07-23 status snapshots retained later in this document for history.

- The retained corpus contains 701 Assault Rifle screenshots in 11 weapon folders. Each folder has one overview/context image; the remaining 690 images are attachment-detail captures. The consolidated corpus also retains the separate PP-19 reference rows.
- All readable Assault Rifle detail fields have been transcribed. The only remaining nulls are fields hidden by the skull/performance overlay in 12 NVO-228E muzzle screenshots. These require clean replacement captures; do not copy values from another weapon or silently substitute a baseline.
- L85A3 is the only Assault Rifle with a complete user review. M16A4 and EF88 contain targeted user corrections for selected subtype/cost cells only. NVO-228E and every other Assault Rifle remain provisional even where their displayed fields are fully transcribed.
- L85A3 comparison reconciliation intentionally corrects four missed/shifted workbook entries from screenshot evidence: Tungsten Core is red `↓31` Precision and red `↓41` Control, and the 646MM CUT/LSW barrel rows retain plain Control `44` while their red `↓48`/`↓46` values belong to Mobility.
- Screenshot filenames are canonical and collision-safe. Both Ammo and Barrel detail screenshots use the displayed attachment subtype in the filename; all other categories use the displayed attachment name. The review data always retains name and subtype separately.
- Displayed numbers stay typed in JSON. Arrow direction and effect are stored independently in `statComparisons`, for example `{ "direction": "up", "effect": "penalty" }`. The complete Assault Rifle scan contains 1,561 visible comparison indicators; the workbook renders each arrow before the displayed value and uses bold green text for buffs or bold red text for penalties.
- No screenshot-derived value has been promoted into live site data. Transcription completion is not review completion or promotion authorization.

### Repeatable weapon-class runbook

Use this exact sequence when the user supplies Carbine, DMR, LMG, Shotgun, Sidearm, SMG, or Sniper Rifle screenshots.

Unless the user explicitly requests an inventory-only or OCR-only pass, this is an end-to-end processing assignment. Do **not** stop after inventory, OCR, provisional JSON generation, parser adaptation, or workbook generation. Parser uncertainty opens the direct visual-review and transcription steps below; it does not by itself authorize leaving a readable field null or postponing a reviewed rename. Codex's own direct inspection of the supplied screenshot is sufficient for the manual visual-review gates. Ask the user only when the screenshot itself is genuinely unreadable, obscured, missing, or requires a user-only judgment that cannot be resolved from the captured evidence.

1. Create one folder per weapon under `Weapon Attachments/<Weapon Class>/<Weapon Name>/`. Keep the original files until inventory, hashes, and before-counts are recorded. Require one overview/context screenshot that anchors weapon identity.
2. Run `scripts/extract-attachment-screenshot-ocr.ps1` for broad OCR, then `scripts/extract-attachment-panel-ocr.ps1` for fixed panel regions. Do not parse a value from a label or another stat row merely because the text looks plausible.
3. Build the provisional review JSON with `scripts/build-attachment-screenshot-review.mjs`. Confirm the weapon, category, highlighted name, card subtype, cost, description, resolution, and source path for every detail screenshot.
4. Run `scripts/extract-missing-attachment-fields.ps1` only for null fields. It performs normal, thresholded, and inverted OCR passes on the field-specific crop. Preserve all passes as evidence; accept only a unit/range-valid result from the correct coordinate region.
5. Run `scripts/extract-attachment-stat-comparisons.ps1` across every weapon folder. It must inspect red/green pixels and the triangular arrow separately from numeric OCR. A rounded value that matches the baseline still carries its visible comparison, such as red `↑0.7`.
   - For 1365x768 captures, the full-panel recoil rows are `RECOIL AMOUNT` at approximately `y=675..705` and `RECOIL VARIATION` at approximately `y=700..732`. Scale these coordinates from the actual screenshot dimensions and keep compact-panel detection separate. The older `690..710` / `710..730` crops miss the colored recoil amount and collapse the class-wide comparison count.
   - Treat an implausibly low per-field or class-wide comparison count as an extractor failure. Re-open representative changed rows before accepting the scan.
6. Generate visual contact sheets for every remaining null or low-confidence field. Transcribe directly from the screenshot crop and record the crop/evidence source. Exact crop matching is allowed only within the same weapon and field; never transfer a value across weapons because an attachment name matches.
7. Import any user-reviewed workbook with `outputs/attachment-audit/import-reviewed-workbook.mjs`. Treat yellow/orange cells as human edits, preserve typed values, and reconcile every arrow/color cell against the source screenshot. Screenshot evidence wins when a reviewed cell is shifted or missed, and the conflict must be recorded rather than silently discarded.
8. Rebuild the review JSON and inspect the coverage report. Every populated field must have a source; every null must have a field-specific reason. Report overlay-obscured values separately from parser failures.
9. Generate and inspect `rename-manifest.json`. For Ammo and Barrel, build the filename token from `attachmentSubtype`; for all other categories, use `attachmentName`. Require in-folder targets, unique case-insensitive destinations, no overwrites, and unchanged PNG counts before/after `scripts/apply-attachment-screenshot-renames.ps1`.
   - Preserve UI order from original capture timestamps or an explicit capture-order ledger. Never sort canonical filenames lexicographically (`1_`, `10_`, `11_`, `2_`); parse the numeric prefix when rebuilding an already-renamed weapon.
10. After renaming, run `scripts/reconcile-attachment-ocr-paths.mjs`, rebuild every artifact, and require zero stale current paths. Never resurrect a deleted screenshot from old OCR or workbook rows.
11. Build the canonical workbook from the most recently reviewed workbook template. Every weapon sheet uses 10-point body text, the approved L85A3 column widths, 85% zoom, and the reviewed L85A3 freeze layout: four header rows and the first three identifying columns (`D5` as the first scrollable cell). Rows 1 and 2 must remain unmerged across all columns so reviewers can select and highlight whole columns; store the title/subtitle in column A, set both rows to `wrapText: false`, and keep fixed row heights. Group weapon sheets by canonical weapon class, color both the sheet tab and header bands consistently by class, place SMG sheets after the other current weapon classes, and keep `Source Index` followed by `Read Me` as the final two sheets. Render and visually inspect every weapon sheet plus Source Index and Read Me, then run the formula-error scan.
12. Run the builder twice against an unchanged filesystem and compare semantic JSON while ignoring generation timestamps. Record screenshot, detail-row, transcribed, reviewed, blocked, renamed, promoted, and tested counts separately in the Phase 4 ledger.

### Mandatory weapon-class completion contract

A weapon-class run is not complete merely because provisional artifacts exist. Before reporting the class as finished, all of the following must be true:

1. Every attachment-detail screenshot has been processed through the fixed-panel field parser, the missing-field OCR passes, and the comparison-indicator extractor.
2. Every visible required field is populated from screenshot evidence. Each remaining `null` must identify the exact field, screenshot, and evidence-based reason, using `needs recapture` only when the screenshot itself is unreadable or obscured. Do not classify ordinary OCR/parser failure as an unreadable screenshot.
3. Every visible comparison indicator is stored with both arrow direction (`up`/`down`) and color effect (`buff`/`penalty`). A comparison scan reporting zero indicators for an entire normal weapon class is a hard failure requiring investigation, not a successful result.
4. Every remaining `Unknown`, low-confidence category/name/subtype, and proposed filename is resolved by direct visual inspection where the screenshot is readable. Do not leave a record blocked merely because OCR was uncertain.
5. The reviewed rename manifest is applied for every resolved record. Timestamp-named files may remain only for individually listed, genuinely unresolved records. Recount every folder and require identical PNG counts before and after.
6. `source.renameApplied` may be `true` only when the canonical target file physically exists and the old source filename no longer exists, except when source and target were already the same canonical path. `renameAllowed` in the manifest is permission to perform a rename; it is not proof that the rename occurred.
7. After applying renames, reconcile OCR paths, rebuild JSON/manifest/coverage/workbook artifacts, and require zero stale current paths, zero destination collisions, and no false `renameApplied` claims.
8. The final workbook includes every required stat column and renders every recorded comparison using the visible arrow plus bold green/red text. Rows 1 and 2 are unmerged and non-wrapping, weapon tabs/header bands are color-coordinated by class, sheet order follows the canonical weapon-class grouping, SMGs appear at the class-grouped end of the weapon sheets, and `Source Index`/`Read Me` remain the final two sheets. Visually inspect every weapon sheet, Source Index, and Read Me after the final post-rename rebuild.
9. The final report includes per-field populated/null totals for the class, total comparison indicators, timestamp filenames remaining, renames applied, blocked records with reasons, stale paths, destination collisions, and false `renameApplied` claims.

If any condition above is not satisfied, report the run as **incomplete** and continue working within the supplied evidence. Do not use the word “completed” for an inventory-only, OCR-only, parser-only, provisional-build, or unapplied-rename result.

### Recurring failure prevention and first-pass acceptance gates

The following rules are mandatory for every remaining weapon class. They address errors found during the Carbine review and take precedence over any convenience shortcut in an older helper script.

1. **No blanket defaults.** Never fill every missing value with a constant such as `60`, even when a contact sheet appears uniform. Create an explicit screenshot-path/field/value entry for each reviewed field. The evidence note must identify what was read from that screenshot; a generic `direct-screenshot-review` label attached by a loop is not proof that the file was actually inspected.
2. **No cross-weapon description substitution.** Do not group descriptions by attachment type/name and copy the first clean sentence to other weapons. A same-name capture may help decipher a glyph, but each final description must be checked against its own screenshot. Store an override keyed by the exact screenshot path when OCR needs correction.
3. **No mechanical text “cleanup” presented as review.** Global replacements such as `tiring`→`firing`, `ot`→`of`, punctuation insertion, lower-case repair, or removal of OCR debris may generate review candidates only. Accept each candidate only after comparing the complete sentence to the screenshot. Preserve the raw OCR unchanged.
4. **Do not overwrite a targeted fix with a later bulk pass.** Merge overrides by exact screenshot and field, with targeted visually reviewed entries taking precedence. Add a regression check for every specifically corrected row so a subsequent loop cannot restore the earlier bad value.
5. **Compact panels are field-specific, not row-wide failures.** Transcribe every field visibly present in a compact selector screenshot. Leave only fields that are genuinely not displayed as `null`, with the exact compact screenshot and field-specific reason. Do not claim a full-panel field is absent merely because OCR missed it.
6. **Computer vision is triage, not authority.** Contact sheets, glyph templates, bar matching, color thresholds, and same-font classifiers may locate candidates. A value becomes reviewed only after the original-resolution screenshot is opened and the field, decimal, unit, arrow, and color are visually confirmed.
7. **Completion metrics must be computed from the final rebuilt JSON and workbook.** Do not reuse counts from an earlier build or commentary. The report's null totals, comparison count, costs, paths, and row counts must match the artifacts delivered in that same run.
8. **Description gates are semantic as well as syntactic.** A capital letter and terminal period are insufficient. Scan for known OCR words (`ot`, `tiring`, `mlnimap`), truncated leading clauses, missing words, repeated titles, selector labels, unlock text, and sentences that disagree with the screenshot. Every flagged row must be opened and corrected or individually documented as unreadable.
9. **Representative spot checks do not replace exhaustive review of changed rows.** Visually inspect every row changed by a bulk/parser operation. In addition, independently sample at least one baseline, stat-changing attachment, muzzle description, barrel/ammo description, grip/underbarrel description, and laser/light row per weapon.
10. **Run negative assertions before saying “finished.”** The validation must fail when any known-bad description token remains, a reviewed full-panel field is null, a targeted regression value changes, a timestamp filename remains without an exception, or workbook/JSON values disagree. Include the failing row paths in the output rather than reporting only a count.
11. **Search every visible attachment-card row for the selected highlight.** On 1365x768 captures the selected border/check can appear around the first card row near `y=497` or a lower wrapped row near `y=610`; scale both regions with resolution. A low-margin or partially occluded highlight candidate requires direct inspection of the original screenshot rather than selecting the brightest card automatically.
12. **Apply reviewed identity corrections before dependent mappings.** When OCR changes an attachment type/name/subtype, synchronize that corrected identity before calculating costs, recoil maps, filenames, or capture-order entries. Screenshot-reviewed stat overrides must retain the matching visible comparison metadata; remove detector comparisons only when the screenshot proves they came from a compact-layout coordinate collision.

The active generated artifacts are:

- `outputs/attachment-audit/attachment-screenshot-review.json`
- `outputs/attachment-audit/coverage-report.json`
- `outputs/attachment-audit/rename-manifest.json`
- `outputs/attachment-audit/stat-comparisons.json`
- `outputs/attachment-audit/field-ocr.json`
- `outputs/attachment-audit/visual-stat-map.json`
- `outputs/019f94db-3ac2-7831-bd8a-32275bf0343c/BF6_Attachment_Stats_Review.xlsx`

## Historical Assault Rifle next steps — 2026-07-23 (superseded)

The Assault Rifle audit is not complete. The current retained evidence set contains 745 records total: 701 Assault Rifle screenshots plus 44 retained PP-19 records. EF88 contains 63 resized screenshots and no full-resolution copies. Current generated artifacts report 629 new Assault Rifle detail records, 38 visually checked mappings, 0 fully reviewed new records, 0 promoted records, and 0 populated typed-stat records. The only active workbook is `outputs/019f8197-45e9-7b52-a9a9-e82ab06be8d3/BF6_Attachment_Stats_Review.xlsx`; prior workbook variants are archived under `outputs/attachment-audit/archive/workbooks-20260723/` and must not be treated as current outputs.

Complete the following tasks in order. Do not combine these gates or mark the batch complete early.

### AR Task 1 — Correct mappings, subtypes, and descriptions

1. Visually review every barrel title and card subtype. The barrel filename uses the card subtype, but the review record must retain both the full displayed barrel name and exact displayed subtype.
2. Apply these screenshot-confirmed AK4D corrections:
   - `600MM CUT` → subtype `Heavy`
   - `600MM DMR` → subtype `HEAVY EXT.`
   - `409MM US` → subtype `Short`
3. Review other weapons for the same parser failure. Do not assume a barrel subtype from words in the barrel name; read the highlighted card subtype.
4. Remove UI-label contamination from descriptions. For example, the AK4D `450MM FACTORY` description must not begin with OCR debris such as `IA oerault`; `Default`, subtype labels, attachment titles, unlock text, and card text are not part of the description unless visibly included in the body sentence.
5. Normalize corrupted ADS tokens only when the screenshot context visibly says aim down sights. Variants such as `[AOSI`, `IAOS)_`, `AOS,`, `IADSI`, `[ADS)`, and similar OCR artifacts must become `(ADS)` with balanced parentheses.
6. Re-scan every description after normalization for lowercase starts, sentence fragments, duplicated titles, trailing unlock text, isolated OCR characters, malformed punctuation, and incomplete endings.
7. Treat lasers as a dedicated manual-review batch. Visually verify all laser names, colors/power, subtype, and complete description. Current laser text contains substantial OCR corruption and must not be accepted through corpus substitution alone. A clearer same-name capture may be used as a comparison aid, but the reviewed value must still be supported by that record's screenshot.
8. Record every manual correction in an explicit override/evidence map keyed by weapon and source screenshot. Do not bury corrections in broad text-replacement rules that could alter unrelated text.

Validation gate for AR Task 1:

- zero known incorrect barrel subtypes;
- zero description strings containing known ADS OCR variants;
- zero descriptions contaminated by `Default`, repeated titles, or unlock text;
- every laser record either visually corrected and evidence-linked or explicitly blocked with a reason; and
- regenerated JSON and workbook agree exactly on names, subtypes, and descriptions.

### AR Task 2 — Transcribe attachment costs and displayed stats

The new Assault Rifle records currently contain no typed stats. Names, subtypes, and descriptions alone do not satisfy the audit.

1. Transcribe attachment cost and the complete right-side stat panel for every new Assault Rifle detail screenshot.
2. Implement field-specific, coordinate-based extraction for both the top summary values and lower stat rows. Do not use one generic number parser for the whole panel.
3. Validate each field independently against representative screenshots before bulk population. Include baseline, arrow-marked changes, magazines, barrels, ammunition, lasers/lights, and both boolean states.
4. Preserve displayed precision and units while storing typed numeric or boolean JSON values.
5. Validate plausible ranges and OCR-sensitive characters, especially `0/Ø/O`, `1/I`, `5/S`, decimal points, degree symbols, `x` multipliers, milliseconds, seconds, metres, and metres per second.
6. Keep a field `null` with a precise note if its value cannot be read confidently. Do not substitute a value from another weapon or infer it from a stat bar.
7. Display `Reload in ADS` in Excel as plain text: `Yes` for true, `No` for false, and blank for null.
8. Manually compare all populated fields against screenshots before changing `reviewStatus` to `reviewed`.

Validation gate for AR Task 2:

- report non-null coverage by field and weapon;
- visually spot-check every field parser and every arrow-marked value;
- require all 629 new detail records to be either fully transcribed or explicitly blocked field-by-field;
- no plausible-looking value may be accepted solely because OCR returned a number; and
- workbook and review JSON must contain matching typed values.

### AR Task 3 — Finish screenshot renaming

There are currently 220 timestamp-named PNGs across the Assault Rifle folders. The latest manifest reports 47 blocked rename entries, but many additional timestamp-named files have approved proposed names that have not yet been applied.

1. Rebuild the manifest only after AR Task 1 corrections are complete.
2. Separate entries into: approved unique rename, true duplicate, distinct same-name capture, barrel subtype collision, and unresolved mapping.
3. Resolve the 47 blocked entries through visual inspection and collision-safe filenames. Distinct weapon-specific barrels must not collide merely because their card subtype is shared; preserve the full displayed barrel name in audit metadata and use a deterministic collision-safe filename approved by the user.
4. Inspect every timestamp-named screenshot, not only entries currently marked blocked.
5. Require a manually reviewed category and attachment name before allowing a rename.
6. Back up the manifest, verify all sources and destinations, require case-insensitive uniqueness, and keep every target within its existing weapon folder.
7. Apply one reviewed rename batch with the helper script. Do not hand-rename files outside the manifest.
8. Recount every folder and require unchanged PNG totals before and after.
9. Rebuild OCR/review/workbook paths after renaming and verify there are no stale, missing, or ghost records.

Validation gate for AR Task 3:

- zero unintended timestamp-named screenshots;
- any intentionally retained timestamp name has an explicit blocking reason;
- zero path escapes, overwrites, case-insensitive collisions, stale records, or unresolved current paths;
- per-folder and total PNG counts remain unchanged; and
- a second unchanged builder run is semantically idempotent.

### AR Task 4 — Final review handoff

After Tasks 1–3 pass, regenerate the review JSON, raw OCR, rename manifest, coverage report, and the single canonical Excel workbook. Visually inspect all weapon sheets, Source Index, and Read Me. Report captured, mapped, renamed, transcribed, fully reviewed, blocked, promoted, and tested counts separately. Do not promote values into live data as part of this cleanup batch.

## Expected screenshot hierarchy

Store screenshots beneath the shared capture root using the site's canonical weapon class and exact display name:

```text
Weapon Attachments/
  Assault Rifles/
    M433/
  Carbines/
    <weapon name>/
  SMGs/
    PP-19/
  LMGs/
    <weapon name>/
  DMRs/
    <weapon name>/
  Sniper Rifles/
    <weapon name>/
  Shotguns/
    <weapon name>/
  Sidearms/
    <weapon name>/
```

Use the class names already used by `data/weapons.json`. Do not invent a second class label for the screenshot hierarchy.

## Capture requirements

### 1. Weapon identity screenshot

Capture one attachment-overview screen per weapon showing `CUSTOMIZE <weapon name>` in the upper-left corner. This is the identity anchor for every detailed screenshot in that weapon folder.

Rename it:

```text
<Weapon>_attachment_overview.png
```

### 2. Detailed attachment screenshots

Capture one detail screen for every selectable attachment option in every available slot:

- Sight/optic
- Muzzle
- Barrel
- Underbarrel
- Magazine
- Ammunition
- Ergonomics
- Left, right, or top accessory positions
- Any weapon-specific attachment slot

The white bracket and green checkmark identify the equipped item. They do **not** necessarily identify the attachment whose stats are displayed.

The thick border and changed card tint identify the **highlighted** attachment. The highlighted attachment controls the name, description, cost, subtype, and right-side stats that must be transcribed.

### 3. Baseline coverage

Capture at least one detailed screen that shows the weapon's baseline/default stats. A separate `None` capture is not required if another screenshot is known to display the identical baseline values, but the equivalence must be stated in the review data. Example: the PP-19 None muzzle uses the same displayed baseline stats as its Basic barrel screenshot.

Never infer a missing baseline from another weapon.

### 4. Image quality

- The existing 1365×768 screenshots are readable and acceptable.
- Preserve the original aspect ratio.
- Do not crop the attachment cards, attachment title/description, or the right-side stats panel.
- Avoid notifications, chat overlays, performance overlays, or cursor placement over required values.
- If an overlay obscures a value that may change, recapture the screen.
- If an overlay obscures only values proven unchanged by another capture, retain the screenshot but record the inference explicitly.

## Canonical attachment categories and aliases

Normalize the in-game screen labels as follows:

| In-game label | Canonical attachment type |
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
| Shared Left/Right/Top Accessory slot containing both laser and light options | Laser/Light |
| Mini Scout accessory option named Range Finder | Range Finder |

Accessory position describes where the item appears during capture, but it is not part of the review-record schema. Use the visible `Left Accessory`, `Right Accessory`, or `Top Accessory` heading to identify selector boundaries during capture and parsing; do not store that physical position for every record or assume the same position across weapons.

Use the canonical `Laser/Light` attachment type only for weapons known to present laser and light options in one shared selector:

- GRT-BC
- SL9
- every weapon in the Sidearm class

For these weapons, every option displayed within the shared selector uses `attachmentType: "Laser/Light"`, including `None`, laser-only items, light-only items, and combined laser/light items. For example, the GRT-BC screenshots show this selector under `Right Accessory`, but that position is capture context only and is not written to each JSON/workbook record.

Do not infer `Laser/Light` merely because an attachment name contains both words. On weapons outside the explicit shared-slot list, retain the normal `Laser` or `Light` type unless the weapon overview and detail sequence visibly prove a shared selector and the weapon is added to the reviewed shared-slot list.

The Mini Scout is a separate capture and compatibility exception. Its `Range Finder` remains canonical type `Range Finder`, but it appears in the same selector sequence as the weapon's Lights and is mutually exclusive with them. Do not reclassify the Range Finder as `Light` or `Laser/Light`, and do not add a per-record physical-slot field.

Recognize these additional displayed attachment subtypes exactly:

- Ammo: `Subsonic`, `Sub HP`, `Sub Pen`, and `Range Pen`
- PW7A2 Ammo: the `SUBSONIC TUNGSTEN` option displays `SUB. PEN.` and therefore uses canonical subtype `Sub Pen`
- VSSM Barrel: `Suppressed` for both of its barrel options
- VSSM Ammo: `Range Pen` where displayed

The highlighted card subtype is authoritative. Preserve `Sub HP`, `Sub Pen`, and `Range Pen` in abbreviated canonical form rather than expanding them, and use the subtype—not the weapon-specific attachment name—in Barrel and Ammo filenames.

If a new attachment cannot be mapped confidently, use `Unknown` in the provisional review data and stop before renaming or promoting that record.

## Filename rules

Use filesystem-safe names with underscores between words while retaining meaningful internal hyphens:

```text
<Order>_<Weapon>_<AttachmentType>_<AttachmentName>.png
```

Examples:

```text
1_M433_Muzzle_Double-Port_Brake.png
12_M433_Barrel_Extended.png
25_PP-19_Grip_Folding_Stubby.png
38_PP-19_Laser_50_MW_Violet.png
44_GRT-BC_Laser-Light_None.png
```

Rules:

1. Preserve the official weapon-name punctuation, such as `PP-19`.
2. Use title capitalization for attachment types and names.
3. For both Barrels and Ammo, use the attachment card subtype in the filename because weapon-specific display names differ from the stable card subtype. Store the full display name and exact displayed subtype separately in the review data.
4. For every other category, use the full displayed attachment name.
5. Use the filesystem-safe token `Laser-Light` for the canonical `Laser/Light` type. Never place `/` in a filename.
6. Remove quotation marks and other filename-invalid punctuation.
7. Never overwrite a duplicate capture. Add `_duplicate-2`, `_duplicate-3`, and so forth, and flag it as a duplicate in the review data.
8. Generate and inspect the complete rename manifest before applying any rename.

## Fields required for each attachment-detail record

Every record must contain:

- Weapon Name
- Attachment Type
- Attachment Subtype
- Attachment Cost
- Attachment Name
- Attachment Description
- Damage
- Rate of Fire (ROF)
- Magazine Size (MAG)
- Hipfire
- Precision
- Control
- Mobility
- Fire Modes
- Reload Time
- Muzzle Velocity
- ADS Time
- Headshot Multiplier
- Long Range Damage
- 3D Spot-on-fire Range
- 2D Spot-on-fire Range
- Opponent Health Regen Delay
- Collateral Multiplier
- Reload in ADS
- ADS Move Speed Multiplier
- Sprint Recovery
- Recoil Amount
- Recoil Variation

Also retain these audit fields:

- Original screenshot path
- Original filename
- Current screenshot path
- Final filename
- Capture timestamp
- Screenshot resolution
- Raw attachment-description OCR
- Raw full-screen OCR
- Extraction status
- Per-record notes
- Duplicate-capture flag
- Review status
- Reviewer/date once reviewed

Use numeric JSON values for numeric fields. Do not store numbers with display units embedded in the value. Unit meaning belongs in the field name or schema documentation.

## Extraction workflow

### Step 1 — Confirm repository and worktree state

1. Run `git status --short --branch` in the BF6 Project repository.
2. Preserve all unrelated modified and untracked files.
3. Do not stage, commit, reset, or delete existing work unless explicitly requested.
4. Confirm that every screenshot directory is outside or inside the intended capture root before changing filenames.

### Step 2 — Inventory the screenshots

For every weapon folder:

1. count PNG files;
2. confirm there is exactly one overview/identity screenshot;
3. record the filenames in timestamp order;
4. group the detail screens by the `SELECT <CATEGORY>` heading;
5. identify duplicate highlighted attachments;
6. identify missing categories/options; and
7. identify overlays or unreadable fields.

Also record screenshot dimensions and group apparent duplicates by weapon plus capture timestamp. If both resized and full-resolution copies exist, do not assume both should be retained. Confirm the intended retained resolution with the user or the batch-specific instructions. After a user deletes unwanted copies, remove their stale records from every derived artifact on the next rebuild.

Before rebuilding, reconcile the prior raw OCR artifact against the current inventory. Classify each prior OCR entry as retained, renamed-but-present, or deleted. A record for a deleted screenshot must not remain in the active OCR artifact, review JSON, manifest, workbook, or coverage totals. Preserve a dated backup before pruning or replacing evidence.

Do not equate “not captured” with “not available.” Determine availability from the overview screen and attachment-card inventory.

### Step 3 — Run raw OCR

Use `scripts/extract-attachment-screenshot-ocr.ps1` against the new weapon directories. Supply the directories as a pipe-delimited string because the script accepts multiple directories through one argument.

Example:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\extract-attachment-screenshot-ocr.ps1" `
  -InputDirectories "<weapon-folder-1>|<weapon-folder-2>" `
  -OutputPath ".\outputs\attachment-audit\raw-ocr.json"
```

Before replacing the existing raw OCR artifact, either extend it or preserve a dated/versioned copy. Do not silently discard the M433 and PP-19 evidence.

The extractor must retain word bounding boxes and source dimensions. Normalize coordinates to the 1365×768 reference canvas before parsing screen regions so resized and full-resolution captures use the same region rules.

Do not search unrestricted full-screen OCR for category keywords. Text such as `MUZZLE VELOCITY` in the right-side stat panel must never classify a screenshot as `Muzzle`. Parse in this order:

1. the upper-left `SELECT <CATEGORY>` heading region;
2. conservative fuzzy matching against known headings only within that region;
3. the large attachment-title region;
4. attachment-name semantics and same-weapon neighboring capture context; and
5. manual visual review if the preceding checks do not agree.

Track extraction confidence and the reason for any fallback. Report damaged heading OCR separately from screenshots that are actually unreadable.

### Step 4 — Build the attachment inventory

For each weapon, create an ordered mapping from its screenshot sequence to:

- canonical attachment type;
- shared-selector classification when the weapon is on the reviewed `Laser/Light` list;
- exact display name;
- card subtype;
- card cost; and
- duplicate index when applicable.

Use the screenshot itself as the authority. Existing `data/attachments.json` may help normalize spelling or IDs, but it must not override a visibly different current-version cost, availability, name, or displayed value.

Preserve original capture/UI order per weapon. Assign the overview screenshot order `0` and detail screenshots contiguous order values starting at `1`. Prefix canonical filenames with that order (`0_`, `1_`, `2_`, and so on), and sort each weapon worksheet by the same numeric order. Store the numeric order and original timestamp filename in the review JSON so later rebuilds remain stable after filesystem renames.

For shared-slot weapons, identify the selector boundary from the weapon overview, the upper-left `SELECT <CATEGORY>` heading, and the uninterrupted capture sequence. Do not split a shared selector into separate Laser and Light coverage merely because individual option names differ. Conversely, do not merge two physical accessory selectors solely because both contain laser or light items. The selector position is capture evidence only; `attachmentType: "Laser/Light"` carries the normalized distinction in JSON and Excel.

GRT-BC batch example: the 12 user-highlighted captures from `Battlefield 6 Screenshot 2026.07.24 - 15.52.47.03 (Medium).png` through `Battlefield 6 Screenshot 2026.07.24 - 15.53.03.55 (Medium).png` are one `Laser/Light` sequence shown under `Right Accessory`. Preserve their timestamp order and do not create separate Laser and Light coverage groups or per-record slot fields for that sequence.

Use the larger corpus to normalize repeated attachment names, but only after grouping by canonical category. Never let text from another card, an equipped item, a description sentence, or the stat panel become the highlighted attachment name. For repeated resized/full-resolution captures of the same timestamp, require identical metadata or stop and inspect the pair.

Before generating rename targets, run these parser-quality checks:

- exact readable heading versus parsed category;
- category/name consistency, such as rejecting grips, magazines, or ammunition classified as `Muzzle`;
- shared-slot consistency, including rejecting separate `Laser`/`Light` types inside a reviewed `Laser/Light` selector and rejecting a shared classification inferred only from another weapon's physical selector position;
- attachment names that resemble descriptions, single characters, truncated words, or stat labels;
- repeated screenshots collapsed to an implausibly identical name;
- `Unknown` categories or subtypes;
- case-insensitive target collisions; and
- duplicate-pair metadata mismatches.

Record these as parser exceptions. Do not count all parser exceptions as unreadable captures.

Extend or replace the hard-coded M433/PP-19 mapping in `scripts/build-attachment-screenshot-review.mjs` with a scalable weapon mapping. The builder must fail if screenshot counts and expected records do not match.

### Step 5 — Transcribe and normalize displayed stats

1. Read the fixed right-side stat panel by field position.
2. Preserve the displayed precision. Examples: `2.384 s`, `630 m/s`, `x1.40`, `0.8°`.
3. Convert the displayed values to typed numeric/boolean fields.
4. Record fire modes as an ordered string array.
5. Record `Reload in ADS` as a boolean.
6. Store the typed number separately from its comparison indicator. Capture arrow direction as `up` or `down`, and effect as `buff` for green or `penalty` for red. Direction never determines effect.
7. Preserve a visible indicator even when UI rounding makes the displayed number equal to the baseline. Red `↑0.7` remains an up-arrow penalty, not plain `0.7`.
8. Review stylized digits manually; Windows OCR commonly confuses `0`, `5`, `4`, degree symbols, and multiplier prefixes.
9. Do not calculate a hidden value from a stat-bar length.
10. If a field is obscured but demonstrably unchanged, copy it only from a cited same-weapon baseline capture and label it as an inference rather than a displayed transcription.
11. If a changing field is obscured or unreadable, use `null` plus `needs recapture`; never guess.

For attachment descriptions, extract only the smaller body-text lines beneath the large attachment title. Do not include a repeated title or subtype label in the description. The in-game descriptions are complete sentences and begin with a capital letter. If an extracted description begins with a lowercase letter, treat it as a truncated OCR result: inspect the screenshot and restore the omitted leading text only from visible evidence. Also flag sentence fragments, unexpected duplicated attachment names, and descriptions that begin midway through a clause.

Do not reuse a description from another weapon merely because the attachment type and name match. Do not accept a description because punctuation and capitalization checks pass. Compare the complete final sentence to the record's own original-resolution screenshot, and keep any correction in a screenshot-specific reviewed override. Known OCR tokens such as `ot`, `tiring`, and `mlnimap` are hard validation failures until that exact screenshot has been reopened; a global string replacement is not visual review.

Example: a `COMPENSATOR` title above `Reduces recoil buildup and improves recoil recovery.` must produce only the sentence as the attachment description. A suppressor description beginning `a soldier is spotted...` is incomplete if the preceding visible line says `Fully hides in-world spotting and reduces the range where`.

Numeric parsing must be field-specific and position-aware. Validate each field parser against representative screenshots at every retained resolution before populating it across the corpus. Require sensible units and ranges, including decimal placement. If validation has not been completed, leave the typed field `null` even when OCR produced a plausible number; retain the raw OCR for review.

### Step 6 — Generate and validate the rename manifest

The manifest must include old and new absolute paths. Before renaming:

1. verify every source exists;
2. verify every destination remains inside the intended weapon folder;
3. require unique case-insensitive destinations;
4. stop if a destination already exists for a different file; and
5. use a temporary intermediate filename for case-only renames on Windows.

Apply the rename only after those checks pass and every proposed rename has passed the manual pre-rename review gate for category and attachment name. A parser result being non-`Unknown` is not sufficient authorization. Recount the directory afterward and require the same number of PNGs before and after.

On reruns after earlier renames, resolve each record against both its original path and current/proposed path. Do not create ghost records merely because the original timestamp path no longer exists. Do not apply a second rename batch until the regenerated manifest has been independently inspected.

### Step 7 — Produce provisional review artifacts

Generate:

1. `outputs/attachment-audit/attachment-screenshot-review.json`
2. `outputs/attachment-audit/rename-manifest.json`
3. `outputs/attachment-audit/raw-ocr.json`
4. a refreshed Excel review workbook with attachment information as column headers and one attachment-detail record per row
5. a coverage report listing captured, duplicate, unreadable, missing, and confirmed-not-available items

Coverage rules for shared slots:

- For GRT-BC, SL9, and Sidearms, report one `Laser/Light` coverage group per physical shared selector. Do not require separate Laser and Light categories for that selector.
- If a weapon has more than one physical shared selector, keep their capture sequences distinct during review even when their option lists overlap; do not add a per-record slot field.
- Treat `None` as the baseline option for its physical selector. Do not create separate Laser-None and Light-None requirements inside one `Laser/Light` group.
- For Mini Scout, retain separate `Light` and `Range Finder` types in reporting and treat their shared capture selector as mutually exclusive. Do not count the absence of a simultaneously equipped Light and Range Finder as a coverage gap.

Every candidate attachment record must remain `provisional-review-required` until reviewed.

Each weapon worksheet must use 10-point body text, the approved L85A3 column widths, 85% zoom, and the reviewed L85A3 freeze layout: four header rows plus the first three identifying columns (`D5` as the first scrollable cell). Keep rows 1 and 2 unmerged with their text in column A, disable wrapping in those two rows, and use fixed row heights so whole-column selection remains unobstructed. Use wrapped wide columns for descriptions, notes, and screenshot paths. Render arrows before comparison-marked values, with bold green font for buffs and bold red font for penalties. Color each weapon sheet tab and its title/header bands by weapon class, order weapon sheets by class with SMGs at the end of the weapon groups, and keep `Source Index` then `Read Me` as the final two sheets. Scan for formula errors and visually inspect every rendered sheet before delivery.

### Step 8 — Review the transcription

Review at least:

- every attachment title and subtype;
- every attachment-point cost;
- every changed/arrow-marked stat;
- every low-confidence OCR value;
- every notification-obscured field;
- every duplicate capture;
- one unchanged baseline record per weapon; and
- all magazine capacity/reload and barrel/ammo velocity combinations.

Record reviewer and review date. A record may become `reviewed` only when its title, subtype, cost, description, and full displayed stat panel have been checked against the screenshot.

Before declaring a batch complete, report and manually inspect all remaining:

- blocked rename entries;
- `Unknown` categories or subtypes;
- suspicious or truncated attachment names;
- descriptions beginning with lowercase letters, repeated titles, or sentence fragments;
- category/name consistency failures;
- duplicate metadata mismatches;
- records whose source/current files cannot be resolved; and
- typed values populated without a completed field-parser validation.

Run the builder twice against an unchanged inventory and confirm stable semantic output, ignoring generation timestamps.

## Comparison against live site data

After review, compare the screenshot records with:

- `data/attachments.json`
- `data/ammo.json`
- `data/weapons.json`
- `data/recoil_decay.json`
- `data/balance_tables.json`
- attachment application logic in `sim/applyAttachments.js`

Classify every weapon/attachment field as:

- `verified`
- `changed`
- `unchanged`
- `not available`
- `needs measurement`

Keep three concepts separate:

1. the value displayed by the game;
2. the modifier inferred by comparing it with the same weapon's baseline; and
3. the internal site field/formula used to reproduce the value.

The displayed value does not necessarily reveal the exact underlying game-file modifier because the UI may round.

## Promotion rules

Do not write provisional OCR values directly into live data.

A value may be promoted only when:

1. the weapon and highlighted attachment are unambiguous;
2. the value is visually reviewed;
3. units and rounding are understood;
4. the target site field is known;
5. compatibility restrictions are recorded; for shared selectors this includes mutual exclusivity, including the Mini Scout Range Finder/Light exception, without adding per-record physical-slot fields;
6. provenance includes the screenshot filename and capture date; and
7. a focused test demonstrates the intended behavior.

When a displayed absolute value is converted into a modifier, preserve both the displayed value and the calculation used. Never reuse the percentage from another weapon without evidence.

## Required tests after promotion

Run:

```powershell
node scripts/validate-data.mjs
node --test scripts/damage.test.mjs scripts/sym-import.test.mjs scripts/pp19.test.mjs
git diff --check
```

Add focused attachment tests that cover:

- recoil amount and recoil variation;
- ADS/hip spread and recovery;
- movement spread;
- muzzle velocity for barrel/ammo combinations;
- ADS time and sprint recovery;
- magazine capacity and reload time;
- reload-in-ADS behavior;
- spot-on-fire ranges;
- compatibility restrictions; and
- shared-link/default-loadout serialization.

## Phase 4 plan updates

Update `BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md` after each completed batch:

- Task 4.6: number of weapons inventoried/reviewed
- Task 4.7: barrel/ammunition velocity coverage
- Task 4.8: fields reviewed and promoted
- Task 4.9: coverage-matrix status
- Task 4.10: modifier-to-absolute-value fixtures

Do not mark a task complete merely because screenshots exist. Distinguish captured, transcribed, reviewed, promoted, and tested states.

## Stop conditions

Stop and report rather than guessing if:

- the weapon identity is not anchored by an overview screenshot;
- the highlighted attachment cannot be distinguished from the equipped attachment;
- attachment name, subtype, or cost is unreadable;
- a changed stat is obscured;
- two screenshots would produce the same filename but are not known duplicates;
- a screenshot count differs before and after renaming;
- a derived artifact contains a screenshot that no longer exists in the authoritative inventory;
- a target path escapes the intended capture root;
- an attachment cannot be mapped to a canonical site category;
- an underlying modifier cannot be derived from the rounded displayed value; or
- live-data changes would require inventing availability, compatibility, or a zero value.
- a proposed filename is based only on non-empty OCR without category/title visual confirmation;
- a repeated capture pair produces different metadata; or
- a numeric parser has not been validated for that field and retained screenshot resolution.

## Final Luna handoff report

Return a concise completion report containing:

1. weapons processed;
2. screenshot counts before and after renaming;
3. attachment-detail records created;
4. duplicates and missing captures;
5. unreadable/obscured fields;
6. parser-blocked and visually unreadable counts reported separately;
7. `Unknown`, suspicious-name, category-consistency, stale-record, and collision counts;
8. review and promotion counts;
9. live files changed;
10. tests run and results;
11. remaining Phase 4 blockers; and
12. direct paths to the JSON, Excel workbook, coverage report, and updated plan;
13. the exact command or script used to recompute the reported counts from the final artifacts; and
14. a list of every screenshot-specific override added in the run, separated into visually confirmed values, same-weapon inferences, and unresolved/null fields.

## Current Assault Rifle handoff status (Codex, 2026-07-24)

- The 11 Assault Rifle folders contain 701 direct screenshots; EF88 contains 63 resized 1365x768 screenshots after the full-resolution copies were removed.
- All current filenames are canonical and the manifest is idempotent. Ammo and Barrel filenames use their attachment subtype; full displayed names remain in the JSON/workbook.
- All visible detail-panel values are transcribed. Non-NVO Assault Rifles have no remaining detail-field nulls. Only the 12 overlay-obscured NVO-228E muzzle screenshots retain nulls and field-specific recapture reasons.
- L85A3 has a complete user review and 176 screenshot-reconciled comparison indicators. M16A4 and EF88 have targeted subtype/cost edits only; every other record remains provisional.
- The workbook is row-oriented, uses 10-point body text, the approved widths, 85% zoom, and panes frozen at `A5`. `Reload in ADS` uses plain `Yes`/`No` text. Comparison cells show `↑`/`↓` plus the displayed value in bold green/red text.
- No screenshot-derived Assault Rifle value has been promoted into `data/attachments.json` or other live site data.

### Next review pass

1. Recapture the 12 NVO-228E muzzle screens without the skull/performance overlay, then rerun the field and comparison extractors.
2. Review NVO-228E and the other provisional weapon sheets one full row at a time; do not infer that transcription completion equals review completion.
3. Record reviewer/date only after title, subtype, cost, description, all displayed stats, arrows, and color effects have been checked against the screenshot.
4. Derive and test live attachment modifiers only after the screenshot-review gate passes.
5. Use the repeatable class runbook above when the remaining weapon-class screenshots arrive.
