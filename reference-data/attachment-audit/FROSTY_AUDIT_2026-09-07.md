# Attachment audit against Frosty - 7 September 2026

## Result

The audit contains **157 confirmed field corrections across 143 existing records**, including the seven prior M433 corrections. The saved screenshots support these changes. The prior task correctly added 158 inventory rows, but it had not completed a detailed stat comparison.

The reference now has **3,347 records across 63 weapons**: 3,127 captured detailed panels, 62 overview images, and 158 Frosty rows awaiting capture. The workbook was rebuilt with 68 sheets. No live site data was changed, committed, pushed, or deployed.

## Confirmed corrections

| Field | Corrections |
| --- | ---: |
| recoilAmountDegrees | 34 |
| attachmentCost | 32 |
| adsMoveSpeedMultiplier | 22 |
| sprintRecoveryMs | 20 |
| adsTimeMs | 18 |
| mobility | 10 |
| attachmentSubtype | 7 |
| recoilVariationDegrees | 5 |
| control | 4 |
| precision | 2 |
| reloadTimeSeconds | 2 |
| reloadInAds | 1 |

Examples include 33 SGX recoil amounts changing from 0.7 to 0.6, VSSM Folding Stock recoil variation changing from 9.1 to 45.0, and two 18.5KS-K reload times changing from 2.434 to 2.750 seconds. Handling corrections include DMR/sniper ADS times, grip sprint recovery and SL9 accessory sprint recovery. Seven None subtype labels were corrected without renaming their valid screenshots.

Every correction has its old value, new value, screenshot path and SHA-256 in [the correction ledger](frosty-audit-screenshot-corrections-2026-09-07.json). Individual reviews, retained values and source integrity checks are in [the review evidence](frosty-audit-review-evidence-2026-09-07.json). A first handling review incorrectly copied five candidate readings. Full-size rechecks rejected those five before any canonical change was applied.

## Comparison coverage and limits

The pass enumerated all **68,794 fields** on the 3,127 captured detailed panels. It also accounted for every field on the 158 new reference rows. All 6,596 source files checked against the existing Frosty provenance hashes matched. All 3,189 referenced historical screenshot files exist.

This is a full inventory and field-accounting pass, **not a complete independent validation of all displayed stats**. The source model currently provides candidates for six fields: rate of fire, magazine size, reload time, muzzle velocity, recoil amount and recoil variation. Six further checks use consistent None-panel screenshot baselines with Frosty attachment operands: ADS time, ADS movement, sprint recovery, 3D spotting, 2D spotting and health regeneration delay. Those checks cannot detect a wrong value shared by every baseline.

After correction, the independent candidate statuses are:

| Status | Field instances |
| --- | ---: |
| Source candidate agrees within the stated tolerance | 12,776 |
| Compatible with integer display rounding/truncation | 1,533 |
| Possible magazine/chamber convention | 2,603 |
| Remaining source-candidate differences | 1,516 |
| Unsupported independent display calculation | 50,344 |
| Wrong capture identity | 22 |

The supplemental checks retain 32 differences. Each has a saved screenshot review that supports the retained audit value. These are model/version differences, not confirmed transcription errors.

The 1,516 remaining independent candidate differences comprise 1,005 reload, 312 rate, 122 velocity, 15 recoil amount and 62 recoil variation values. Grouped source analysis and selected screenshot checks explain timing/fire-mode differences and historical velocity changes. They do not establish individual screenshot validation for every remaining row. Do not treat these differences as automatic corrections or as a passed verification gate.

In particular, VSSM automatic source RPM does not replace its displayed single-fire rate. Bolt and pump weapon engine timing does not directly establish effective panel RPM. EF88 and BROD 3 retained captures precede newer velocity evidence. Their historical screenshot values stay in the audit. Damage, summary scores, fire modes, headshot and collateral multipliers, long-range damage and reload-in-ADS do not yet have an independently verified display calculation in this pass. Comparison arrows were preserved; there was no new exhaustive arrow review.

The complete per-field candidates, unsupported states, raw source references and input JSON hash are in [the field report](frosty-panel-audit-2026-09-07.json). The scripts use the local offline Frosty exports under outputs; regenerating the report requires those exports.

## New reference rows

- 117 Hybrid Suppressor L/S/K rows across 39 weapons.
- Nine Canted Vertical grip rows for mapped LMGs.
- 32 Interdictor non-optic attachment rows.

Each row retains source XML, identity, point cost, raw effect parameters and supported configuration candidates under `frosty`. Captured `stats` and comparison arrows remain null. Unknown display fields remain null with reasons. Workbook rows explicitly state that these are configuration candidates awaiting screenshots. Magazine values can include the chamber, and rate/reload values can need further timing calculations.

Interdictor's M50 Big Bore Suppressor has conflicting Lightened/CQB integration labels. Its asset name and both identities are retained, with the display label unverified. No label or numeric panel was invented to resolve that conflict. Unmapped availability candidates were not added as confirmed selections.

## Capture requests

One existing capture must be replaced: **KTS100 MK8 > Underbarrel > Ribbed Vertical**. The file `Weapon Attachments/LMG/KTS100 MK8/31_KTS100 MK8_Grip_Ribbed_Vertical.png` actually shows **CLASSIC GRIP POD**. Its 22 fields are marked as a capture identity conflict in the field report. The canonical record and workbook carry a warning; its existing values must not be used as verified Ribbed Vertical stats.

The [capture checklist](frosty-audit-capture-requests-2026-09-07.json) lists this replacement and all 158 new captures. Capture the selected title, cost and full detailed panel. No other missing file was found; this does not certify every existing screenshot identity.

## Validation

The reference validator checks counts, weapon coverage, pending-row boundaries and screenshot existence. Correction values and image hashes were checked. The workbook was regenerated from the final JSON; its corrected SGX recoil region and new Interdictor region were rendered and inspected. Original screenshot paths and raw OCR content were preserved. All edits remain local reference/review work.
