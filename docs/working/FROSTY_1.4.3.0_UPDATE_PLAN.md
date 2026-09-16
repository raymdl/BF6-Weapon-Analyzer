# Frosty 1.4.3.0 collection and comparison plan

Created: 14 September 2026.

Review status, 16 September: site changes verified against source data and in a local
browser. The scoped recursive pass has no pending known routes; four unresolved import
GUIDs and the exclusions remain recorded, so the collection stays partial. No new
live-panel checks were made. Earlier completion-log rows describe intermediate results;
the latest review rows below supersede them.

**This is a one-time record of the 1.4.3.0 update.** The reusable procedure, including
the decoding problem and its solution, is in
[docs/GAME_UPDATE_GUIDE.md](../GAME_UPDATE_GUIDE.md). Use that for the next update and
read this one for what was specifically done, found and decided here.

## Objective and agreed scope

Preserve enough 1.4.2.5 reference evidence to identify and explain changes in 1.4.3.0, then update the Analyzer from reviewed results.

This is reference data. A separate disaster-recovery backup is not a requirement. Keep evidence separated by game version and avoid overwriting the old results. Do not duplicate the XML tree or recordings. Do not resume the earlier broad backup.

This document is a plan, not an export log. Checking a box means the work was completed and its evidence recorded. Unchecked items are not claims that files are missing. A task that does not apply should be marked `N/A` with a reason in the completion log.

## Locations

| Purpose | Location |
|---|---|
| Datamining workspace | `C:\Users\royal\Documents\BF6 Datamining` |
| Existing XML and associated exports | `C:\Users\royal\Documents\BF6 Datamining\Frosty Exports\1.4.2.5` |
| Planned new XML and associated exports | `C:\Users\royal\Documents\BF6 Datamining\Frosty Exports\1.4.3.0` |
| Existing research | `C:\Users\royal\Documents\BF6 Datamining\research-1.4.2.5` |
| Planned new research | `C:\Users\royal\Documents\BF6 Datamining\research-1.4.3.0` |
| Frosty source | `C:\Users\royal\Documents\BF6 Datamining\FrostyToolsuite-battlefield6` |
| Frosty runtime | `C:\Users\royal\Documents\BF6 Datamining\FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final` |
| Analyzer checkout | `C:\Users\royal\Documents\BF6 Weapon Analyzer` |
| Shared collection rules and findings | `reference-data/frosty/` in the Analyzer checkout |

There is no second nested `FrostyToolsuite-battlefield6` directory. Internal Frosty asset routes do not change when local folders move. Paths below that are relative to the Analyzer checkout refer to that checkout, not to the XML root.

Proposed per-build layout: keep the existing asset-shaped XML tree unchanged; put supporting raw assets, descriptor/tool records, catalogs, collection results and derived reports beneath `research-<version>`. Existing evidence can remain at its current path if its version and location are recorded. Do not reorganize files merely to match this proposed layout.

## 0. Work already established

- [x] Move Frosty into the datamining workspace and remove the duplicate folder level.
- [x] Separate the existing XML exports into `Frosty Exports\1.4.2.5`.
- [x] Update maintained documentation and the watchlist XML-root reference.
- [x] Create `reference-data/frosty/asset-watchlist.json` with evidence, dependency references and discovery rules.
- [x] Create `reference-data/frosty/asset-findings.json` for useful results, investigation limits and revisit conditions.
- [x] Create `reference-data/frosty/collection-manifest.schema.json` for per-build collection results.
- [x] Add a watchlist merge helper, `scripts/frosty-watchlist-merge.py` (present; do not assume this is a full collector).

Current file inspection: 8,062 watched assets; 140 findings across 133 asset paths at the pre-update capture. The 14 September attachment review later added 26 findings (166 across the same 133 paths); the versioned pre-update copy keeps the 140-finding state. These counts are a checkpoint, not permanent acceptance targets. The current README records the merge of research sources from 6–14 September and additional XML/string exports. The final research merge and evidence hashes were checked during the pre-update capture below.

Three watchlist entries still say `pending-export`: `Common/Localization/Languages/fs_us_loc` and the MP_Abbasid and MP_Badlands material grids. The README records a strings export, and raw grid evidence already exists. Reconcile these statuses by format; do not attempt XML export of the grids just to clear the label.

## 1. Finish the old baseline before the game updates

- [x] Coordinate the end of current data collection. Confirm that no exporter or generator is still writing baseline files while they are inventoried.
- [x] Review changes since the last watchlist merge, including attachment compatibility and material-grid findings. Add missing source evidence without importing every historical search result.
- [x] Record the baseline game-build label and available supporting evidence. If the exact installed build cannot be established, retain that limitation; do not mark the label as independently verified.
- [x] Inventory baseline XML, strings, raw EBX, descriptors, derived JSON, reports and scripts. Record existing locations rather than making duplicate copies.
- [x] Preserve the current full catalog (`ebx_manifest.csv`, `.txt`, and `ebx_directories.txt`) under a versioned location or an explicit versioned record before writing a new catalog.
- [x] Check watched assets against collected files by requested format. Record missing data separately from a failed or unsupported decoding method.
- [x] Check dependency coverage, including targets not yet present as top-level watchlist entries. `AttachmentCategory_Sight` is one documented example.
- [x] Review discovery coverage outside the previously checked weapon/array/tweakable/configuration folders. The existing folder-based XML audit does not establish complete `Game/` or gadget coverage.
- [x] Collect missing old assets that are necessary for the planned comparisons while the old game archives are still installed. Prioritize required stat inputs and dependencies; a complete export of all 464,499 catalog entries is not required.
- [x] If time or decoding prevents collection, record the exact missing route, format, affected question and comparison limit. Do not replace missing old values with zero or estimates.
- [x] Record where the existing raw grids, projectile EBX and matching `SharedTypeDescriptors.ebx` are retained. Keep raw hashes and XML hashes identified by format.
- [x] Verify the English strings export and relevant localized-string/RES/chunk dependencies. XML alone does not preserve the text payload.
- [x] Preserve the baseline extraction-script and Analyzer-data revision. Review the current dirty checkout before selecting files for a scoped commit; do not include unrelated work or assume HEAD contains all recent changes.
- [x] Write a baseline collection record with hashes, sizes, actual successes, failures and build limits. Validate it against the collection schema before calling the baseline complete.

Completion condition: required old values can be traced to retained evidence, or each missing comparison is explicitly listed. Once the game archives update, the old cache cannot recover unexported old asset contents.

## 2. Retain the decoder information that can change

- [x] Record the Frosty source revision and any local patches, runtime identity, SDK identity and descriptor hash.
- [x] Retain the matching old descriptors and `Profiles\BF6SDK.dll` before regeneration replaces them.
- [x] Retain the patched runtime components needed to decode the old files if they will be replaced. A small versioned tool set is sufficient; another copy of the complete source/build tree is not required.
- [x] Decide whether to retain `Caches\bf6.cache` for the old asset-record comparison. It is optional if a sufficient old catalog has already been saved. Record the choice.
- [x] Confirm the working tool installation still has its required local configuration/key. Keep any retained key local; do not include it in Git or public reports.

Purpose: keep the old decoding context available while the working installation changes. This is not a general backup requirement. Existing Git history can retain committed source changes; generated SDKs and uncommitted patches need explicit handling.

## 3. Open the updated game data in Frosty

- [x] Finish the baseline tasks, then install 1.4.3.0 and confirm the launcher has completed the update.
- [x] Record actual game-build evidence and the installed game path. Do not assume the example EA installation path applies without checking it.
- [x] Open the existing Frosty installation against the updated game files. Let normal revision detection rebuild the asset cache first.
- [N/A] If the cache remains stale, close Frosty, move the stale BF6 cache out of the active cache directory, and reopen it. Inspect the type-info cache too if stale metadata is suspected. Do not delete old evidence during troubleshooting. **Not needed: the operator rebuilt the cache before this work started and every export and capture succeeded.**
- [N/A] Complete SDK regeneration if requested. If generation fails, record the error and resolve compatibility before treating decoded output as valid. **Not possible: SDK generation reads the running game process and EA anticheat blocks it. This is a standing constraint. The decoding gap it causes is closed instead by `scripts/frosty-ebx-decode.py`, which reads layouts from the build's own `SharedTypeDescriptors.ebx`.**
- [x] Open/export representative assets: one weapon blueprint, one GS configuration, one shared modifier, the weapon registry and a known projectile. Check that important fields and references decode.
- [x] Record the new Frosty/SDK/descriptor identities and any decoder change from the baseline.

Completion condition: the updated archive is readable and representative decoding works. An editor window opening is not enough evidence by itself.

## 4. Generate the new catalog and collection plan

- [x] Add or use a read-only catalog exporter that emits `asset-catalog.json` directly from Frosty asset records. Implemented in `scripts/frosty-collect-raw.ps1` and exercised against the old build; the new catalog still needs to be generated after the update.
- [x] Include the build identity, extraction time, tool identity and asset paths. Include GUID, type, original size and content hash where available; identify hash algorithms and leave unavailable values explicit.
- [x] Keep one catalog per build. Do not overwrite the path-only old catalog or pretend its absent metadata is known.
- [x] Compare complete catalogs for additions, removals and changed hashes. Treat a stable GUID with a changed path as a rename candidate, not conclusive proof of identical contents.
- [x] Apply the watchlist and review discovery candidates. Use full-catalog differences to catch relevant additions outside the discovery prefixes.
- [x] Inspect the existing exporter and merge-helper capabilities before writing a collector. Add only the missing coordination needed for explicit output paths, dependency traversal and collection results.
- [x] Resolve dependencies recursively with a visited set within the recorded Analyzer review scope. Record cycles, missing targets, GUID-only references and undecoded dependencies. The 16 September pass has no pending known routes; four unresolved GUIDs remain explicit. A structural reference does not prove an active gameplay branch.
- [x] Review any dependency expansion into art, audio or unrelated systems. Record deliberate exclusions and why they do not block the stated comparison.

Completion condition: the collection has explicit inputs and destinations, and unresolved coverage is visible. Discovery and review rules are not currently an automated end-to-end pipeline.

## 5. Collect 1.4.3.0 into new destinations

- [x] Create the new export/research directories and verify every command's destination before running it.
- [x] Export watched normal EBX assets as raw EBX and XML where practical, plus required dependencies.
- [x] Export material grids through `scripts/frosty-raw-assets.ps1`; use the bounded readers for inspection. Do not use normal `export-ebx` XML decoding for these grids.
- [x] Export English strings and any required RES/chunk payloads separately.
- [x] Retain matching descriptors alongside the raw collection and record the tool identities used.
- [x] Generate `collection-manifest.json` using the existing schema: requested routes/formats, output paths, byte counts, hashes, failures and skipped work with reasons.
- [x] Check manifest paths exist, recorded sizes/hashes match the files, and required inputs were collected. Resolve or document failures before marking the collection complete.
- [x] Verify that commands did not overwrite the old XML, raw assets or derived reports. Retain baseline file hashes for this check.

## 6. Extract and explain the changes

- [x] Inspect each generator's current CLI and default destinations. Several scripts write into Analyzer data or provenance by default. Use explicit output options where supported; otherwise run in an isolated checkout/output setup before accepting changes.
- [x] Regenerate semantic field mappings, selectors and source traces from the new build. Do not reuse an old trace when its source hashes no longer match.
- [x] Compare weapon inputs: damage curves, projectiles, velocity/drag, cadence, magazine sizes, reloads, recoil and spread.
- [x] Compare attachment inputs: handling, barrel ADS, sniper brakes, ammo, lights, optics, point costs, selector branches and compatibility rules.
- [x] Compare shared arrays, global operands, Precision panel tables, hit-zone/material records and relevant soldier inputs.
- [x] Compare display names and tooltips separately from mechanics. UI text and kill-switch defaults do not establish runtime formulas or availability.
- [x] Review the patch notes and map each relevant item to its asset evidence. Use `docs/working/INTERDICTOR_1.4.3.0_CHECK.md` for the existing focused checklist, but use this plan's current paths and cache sequence if its examples differ.
- [x] Review unlisted changes as well. Use the saved findings before repeating searches that previously failed to answer the same question.
- [x] Produce a change report with asset/field, old value, new value, source evidence and practical effect. Separate byte changes, decoder changes, numeric changes, additions/removals and unresolved interpretations.
- [x] If a decoder change could explain an XML difference, compare with consistent decoding where possible. A different raw hash alone does not establish a changed weapon stat.
- [x] Add new findings or superseding evidence without erasing old scoped conclusions. Mark affected findings for review when assets or dependencies change.
- [ ] Recheck the [attachment bug list](../ATTACHMENT_BUGS.md). Rerun `scripts/frosty-multi-package-scan.py`; retrace the sniper and SMG Slim Angled, fast/regular magazine and M121 A2/M45A1 FMJ selector packages; confirm the three `linked-text-differs-from-panel` tooltips still match the live panels; check that the AK-205 UGL Mount branch is still unoffered; and compare magazine shifts relative to each default magazine. All assets these checks use were captured before the update.

Relevant existing consumers include `frosty-configuration.py`, `frosty-grx-field-names.py`, `frosty-attachment-handling.py`, `frosty-barrel-ads.py`, `frosty-sniper-brakes.py`, `frosty-hit-zones.py`, `frosty-ballistics.py`, `frosty-global-operands.py`, `frosty-precision-tables.py`, `frosty-attachment-tooltips.py`, `frosty-attachment-compatibility.py` and `frosty-material-grid-inventory.py`, under `scripts/`. This list identifies work areas, not a verified command sequence. Read current arguments and dependencies before execution.

## 7. Update and verify the Analyzer

- [x] Review the comparison report and determine which source changes require site changes.
- [x] Apply only the required data/model/UI changes. Preserve observed, fitted and native-confirmed evidence boundaries.
- [x] Run the narrow existing checks relevant to changed behavior. Check required repository guidance before release; do not run broad tests for documentation-only work.
- [x] Verify representative affected loadouts, including compatibility and shared-stat effects where changed.
- [x] Update source/build labels, provenance and limitations so retained 1.4.2.5 data is not presented as newly verified 1.4.3.0 data.
- [x] Record the implementation revision and check results. Publication and deployment are separate tasks; this plan does not authorize them.

## Final completion checklist

- [x] Old reference evidence remains accessible without duplicate XML or recording copies.
- [x] New outputs identify the actual build and tool versions.
- [x] Required export/dependency failures are resolved or explicitly listed as limitations.
- [x] The comparison covers relevant patch-note items and relevant catalog changes.
- [x] Every accepted numeric change has source evidence.
- [x] Shared watchlist/findings are updated from the completed investigation.
- [x] Analyzer changes and relevant checks are recorded, or explicitly deferred.
- [x] The unfinished broad backup is not described as a verified snapshot. Any later cleanup is a separate, scoped action.

## Completion log

Add one row when a stage is completed or blocked. Include paths or commits that another person can inspect. Record the next action for every unresolved item.

| Date | Stage/task | Result and evidence | Remaining issue / next action |
|---|---|---|---|
| 2026-09-14 | Initial plan checkpoint | Current watchlist: 7,993 assets. Findings: 22 across 15 paths. Versioned XML root already exists. | Historical initial state; pre-update completion is recorded below. |

## Pre-update completion — 14 September 2026

Sections 1 and 2 are complete for the agreed reference-data scope, with the limits below. The collection is deliberately labelled `partial`; this is not a claim of exhaustive dependency decoding or exact marketing-build verification.

Evidence directory: `C:\Users\royal\Documents\BF6 Datamining\research-1.4.2.5\pre-update`.

- `summary.json`: counts, baseline revision, verification and limits.
- `collection/collection-manifest.json`: schema-validated capture results with existing XML locations.
- `collection/asset-catalog.json`: 464,499 asset records; GUIDs, sizes and Frosty SHA1 values. Type names are unavailable in raw-index mode and recorded as null.
- `collection/raw/`: 23,557 successful raw captures, 164,043,770 bytes (156.44 MiB), covering all 8,062 watched assets and all explicit EBX dependencies reached through available XML.
- `existing-files.json`: hashes and locations for 37,670 XML files plus research/source records; XML files were not copied.
- `dependency-audit.json`: 23,557 reached paths and 1,500 without XML. All 1,500 now have raw captures; they include two raw-only grids and localization with verified strings. Further references inside undecoded assets remain uninspected.
- `discovery-review.json`: 1,401 path-name candidates among uncaptured Game/gadget routes. These remain exploratory; the catalog does not supply decoded type names. Known source dependencies were prioritized over blanket collection.
- `catalog/`: retained original CSV/TXT catalogs.
- `toolchain/` and `retained-files.json`: old SDK, descriptors, runtime components, caches and source ZIP with verified hashes. The source distribution has no Git metadata. The key remains in the working installation only.
- Versioned watchlist, findings and schema files identify the collection rules used.

The Analyzer and existing extraction baseline is committed at `d9daf96bcf25ee87b250ca3d4856ad826f6ed961`; the checkout was clean before this preparation. Analyzer data changed after this capture (14 September attachment review: Slim Angled moving-ADS penalties on L115, Mini Scout and Interdictor, AK-205 Underslung Mount removal, three reviewed tooltip panel texts, recoil-smoothing marker and health-regen display changes). Compare 1.4.3.0 results against the merged revision that contains these changes, not against `d9daf96`. The newly added collector is also retained under `toolchain/` by hash, so it does not depend on a future commit to preserve this capture method.

The game executable SHA256 matches the earlier baseline inspection. File version is `1, 0, 439, 36273`; archive Head is `4420709`, while the SDK reports `4414275`. Keep the user-supplied 1.4.2.5 label and this revision mismatch explicit. The two captured grids and descriptor hashes match earlier evidence. No SDK regeneration was performed.

The only other Python process inspected was a local HTTP server. No other Frosty exporter was running. XML/source hash verification checked for changes during preparation. No recordings were copied, no duplicate XML backup was created, and the old interrupted backup was left alone.

Next action: after the update is installed, start section 3. Use a new output directory and the updated game's descriptors; do not overwrite this baseline.

| Date | Stage/task | Result and evidence | Remaining issue / next action |
|---|---|---|---|
| 2026-09-14 | Sections 1–2 | Versioned pre-update capture; all 23,557 selected raw assets succeeded; manifest validated. | Wait for 1.4.3.0, then start section 3. Keep documented decoding/discovery limits. |
| 2026-09-14 | Post-capture Analyzer attachment review | `docs/ATTACHMENT_BUGS.md`; 26 new entries in `reference-data/frosty/asset-findings.json`; data, tooltip and compatibility regeneration from the 1.4.2.5 export. | Use the merged revision as the Analyzer comparison baseline; run the section 6 attachment bug recheck after 1.4.3.0 collection. |
| 2026-09-15 | Section 3 | Update installed and cache rebuilt. `bf6.exe` SHA256 `9b92519e…caa6a`, file version `1, 0, 437, 12728` (lower than the baseline string; do not order builds by it). Archive Head 4420709 to 4892017. SDK and `BF6SDK.dll` unchanged, so decoder is constant across the comparison. Evidence: `research-1.4.3.0/post-update/CHANGE_REPORT.md`. | SDK regeneration not performed. New type members, if any, would be invisible. Decide whether to regenerate. |
| 2026-09-15 | Section 4 | New catalog: 467,208 records at `research-1.4.3.0/post-update/collection/asset-catalog.json`. Diff vs baseline: +29,689 / -26,980 / 6,964 changed hashes / 15,169 GUID-stable rename candidates. Cross-checked against the FrostyEditor patch summary; net counts agree and every catalog hash change appears in the summary. Watchlist intersection: 647 changed, 0 added, 3 removed. | Recursive dependency traversal with a visited set was not re-run for this build; the baseline route list was reused instead. |
| 2026-09-15 | Section 5 (partial) | Raw capture of the same 23,557 routes: 23,554 succeeded, 165,451,802 bytes; the 3 failures are exactly the 3 removed assets. XML exported for 693 changed and 142 raw-differing assets with zero export errors. English strings exported (109,195). | `collection-manifest.json` for 1.4.3.0 not yet generated or schema-validated. Descriptors not yet retained alongside the new collection. Material grids deliberately not XML-exported. |
| 2026-09-15 | Section 6 (partial) | 629 assets differ in decoded XML; 125 are fully explained by string-id renumbering, expression re-bake hashes, FX references or cosmetic list growth. Confirmed value changes and new content are listed in `CHANGE_REPORT.md`. Note 142 assets had an unchanged record SHA1 but a changed raw stream, so record SHA1 alone is not sufficient content evidence. | Not yet done: UI/Static/Metadata tooltip and display-name comparison against the new strings; reduction of `TweakablesConfig`, `GlacierGameConfiguration/settings` and the 24 `*_valueregistry` aggregates; patch-note mapping; the attachment bug recheck; regeneration of the downstream `frosty-*.py` outputs. 148 changed assets have no baseline XML, so no old decoded value exists for them. |
| 2026-09-15 | Section 6, Interdictor and traces | Interdictor patch notes fully mapped: damage/falloff in `PD_.416Barrett` and `_Match`, limb/zone change in the material grids (read with the bounded reader), iron-sight cost in `Attachment_DesertTechHTI_SCP_IronSights`. `WPM_UBL_M320TB` traced and the first-pass velocity reading retracted. `GCR_LPVO_4x00_1x00_P00` identified as the SU-230 LPVO (ElcanDR) and its change re-read as a 4x outlier being brought into line with its pair. Recorded in `reference-data/provenance/frosty-1.4.3.0-source-comparison-2026-09-15.json` and merged into `asset-findings.json`. | Unnamed fields remain: `Field_6eb133f8`, `Field_440ed7fa`, `Field_7768ebf2`, `Field_0ef83ce9`. The "incorrect impact visual effects" note has no matching impact-effect asset change in the captured set. |
| 2026-09-15 | Decoding limit found | `SharedTypeDescriptors.ebx` changed (`640de7ae…` to `91c9ea7c…`) while `BF6SDK.dll` did not. 341 of 835 exported assets now contain objects the decoder cannot load, including all 248 attachment `AD_*` (Class_535682be) and all 27 `Aim_*_PiP`. Only 288 of the 629 differing assets are fully decoded. | The operator cannot regenerate the SDK (EA anticheat). Attachment tooltips, display names and the picture-in-picture rework stay unmeasurable until a third-party SDK is published. Re-run the comparison then. |
| 2026-09-15 | Section 6, attachment bug recheck | No source asset behind `docs/ATTACHMENT_BUGS.md` entries 1-10 changed; only `GS_VSSM`, `GS_RagingHunter` and `GS_TRR8` changed in the whole build. Recorded in the document. | Description side blocked by the decoding limit; entries 8-10 and the three reviewed tooltip panels stay unverified for 1.4.3.0. |
| 2026-09-15 | Section 5, material grids | Both grids read with `scripts/frosty-material-grid-inventory.py` against the new descriptors: 67 record types, 32 named, 0 disagreement between grids. Output copied to `reference-data/provenance/frosty-material-grid-inventory-1.4.3.0-2026-09-15.json`. | Two new record types (`6cc5bd31`, `bfd6e4fa`) are unnamed; some per-entry type labels may be reader artefacts. |
| 2026-09-15 | Decoding limit resolved | Root cause: `EbxReaderRiff` resolves instances by class GUID, and in BF6 that GUID embeds a layout signature; 108 type keys moved, so the stale SDK could not resolve them. Patching Frosty to fall back to the type name was rejected because the 69 genuinely-changed layouts would then read with stale offsets and produce wrong values silently. Built `scripts/frosty-ebx-decode.py`, which decodes RIFF EBX from the build's own `SharedTypeDescriptors.ebx` with no SDK. Validated on 400 1.4.2.5 assets against Frosty XML: 234 identical, 151 supersets, 14 disagreements, 0 failures. All 341 previously unreadable assets decoded in both builds. | 14 of 400 disagree because the type name has several layout entries; the reader follows the asset's declared layout, Frosty follows the SDK's. Such objects are tagged `$layoutAmbiguous` and stay provisional. |
| 2026-09-15 | Recovered results | PiP: the saved decode reports all 27 `Aim_*_PiP` gained `Field_0d48404d` pointing at `OptionEnablePiPZoom`, with no changed numeric fields in that decode. All 27 are layout-ambiguous, so the result is provisional and does not prove unchanged zoom or ADS behavior. Attachment metadata: 234 of 248 have identical string sets; the 14 changes only remove magnification and fire-mode label chips. Interdictor damage values recovered in full for the site. Camera-recoil ladder mapped across all 34 `GCR_` assets; the SU-230 was the only defect and it is fixed. | Field semantics remain undecoded. `Field_c39698a3` moved from `0xffffffff` to a small integer in 241 attachment metadata assets and is unexplained. |
| 2026-09-15 | Section 6, added assets gap closed | The changed-asset scan filtered by watchlist membership, which structurally cannot match a newly added asset, so 12 gameplay-shaped additions were missed on the first pass. Exported them to `Frosty Exports/1.4.3.0/xml-added` (all ok) and folded them into the overlay: the M45A1 Blacklight package and the M145MGO/QMK171A optics for the RagingHunter and TRR8. No gameplay-shaped asset was removed. | The general guide now tells the next run to scan additions by path shape, not by watchlist. |
| 2026-09-15 | Section 6, generator re-runs | Built `Frosty Exports/1.4.3.0/xml-overlay`: the 1.4.2.5 tree with the 494 fully decoded 1.4.3.0 assets and the 12 added assets layered on top. The 341 assets Frosty cannot decode were deliberately left at their 1.4.2.5 content and are listed in `overlay-stale.txt`. Re-ran `frosty-configuration.py` (12 differences, 5 of them real VSSM changes, the other 7 pre-existing bolt-action rpm mismatches), `frosty-hit-zones.py` (one weapon changed) and `frosty-attachment-tooltips.py` (output byte-identical to `data/attachment-tooltips.json`). | The overlay is stale for the 341 assets; any generator that reads them needs `scripts/frosty-ebx-decode.py` instead. The identical tooltip output does not verify new-build wording: the generator still reads the 13 September description file. The 16 September review compared the localization text separately. |
| 2026-09-15 | Section 7, site changes applied | `data/weapons.json`: Interdictor damage curve to 100/80, 120/100, 160/100, 180/80, 200/80; VSSM bulletVel 303 to 321, recoil amount 0.6787 to 0.6834 on both aim states, direction variation 45 to 45.4, and recoilV scaled by the amount ratio. `data/attachments.json`: Interdictor `sightPoints.iron` 15, joining the five bolt-actions that already carry it. `data/hit_zones.json`: regenerated at build 1.4.3.0; the Interdictor's projectile material moved 781 to 784 and its limb multiplier 0.67 to 1.0, with headshot unchanged at 1.75. New provenance: `frosty-hit-zones-2026-09-15.json`, `frosty-optic-category-mapping-2026-09-15.json`. | Four tests in `scripts/damage.test.mjs` encoded 1.4.2.5 Interdictor behaviour and were updated to the new build, including the kill-window test whose premise the patch reversed. |
| 2026-09-15 | Section 7, evidence-backed skips | Not regenerated, with reason: precision tables, attachment handling, barrel ADS, sniper brakes, arrays, spread and draw time. Zero `Common/Hardware/Common` shared arrays changed and no handling, barrel, magazine or ammo modifier changed, so these generators would reproduce identical output. Attachment tooltips were regenerated anyway and came back byte-identical. | Recorded so a later run does not repeat them. |
| 2026-09-15 | Section 6, Field_440ed7fa traced | A duration quantised to whole 1/60 s frames: all 15 distinct values across 64 blueprints are exact frame counts. Not the rate of fire; it disagrees with the registry's RateOfFire on at least nine weapons and is not a named registry leaf. 1.4.3.0 put the ScorpionEvo3 and Skorpion on four frames from unset. | No semantic name, so it is not applied to the site, and the site does not model such a window. |
| 2026-09-15 | Section 4, dependency traversal | Ran a visited-set traversal over the 847 changed and added assets, taking references from exported XML and, for the 341 Frosty cannot decode, from the descriptor-driven decode. 23,911 distinct outgoing references; 4,503 outside the raw capture; 0 referenced routes absent from the catalog; 59 import GUIDs unresolved. Captured the 152 gameplay-shaped ones into `collection-dependencies/` (all succeeded, 1,479,070 bytes). | Deliberate exclusions: about 2,724 `Animations/` routes, generated `_af/` tag-collection and motion-machine state assets, weapon decal textures and `.physics`. They carry no weapon, attachment or soldier values. |
| 2026-09-15 | Section 5, manifest and verification | `collection/collection-manifest.json`: 23,709 asset rows, 13 support files, status `partial`. Validated against `collection-manifest.schema.json` with Draft 2020-12 and format checking: **0 errors**. Integrity re-check: **24,565 files verified, 0 missing, 0 wrong size, 0 wrong hash**. The 341 undecodable XML exports are recorded as `failed` with the reason and the decoder to use instead. | `jsonschema` 4.26.0 was installed locally to run the validation. |
| 2026-09-15 | Section 5, no-overwrite check | Re-hashed all 37,818 rows of the baseline `existing-files.json`: **37,803 unchanged, 0 missing, 15 modified**. All 15 are Analyzer working files inside the repo (site data, findings, and generated provenance touched on 14 September and by this session). **No Frosty export, raw capture or research evidence file changed.** | |
| 2026-09-15 | Section 7, labels and verification | `data/ballistics.json` regenerated against the 1.4.3.0 overlay: only the build label and source hashes moved, no ballistic value changed. `data/hit_zones.json` now reads build 1.4.3.0. Per-weapon `sourceBuild` moved to 1.4.3.0 for the Interdictor and VSSM only; the other 61 keep 1.4.2.5 because their values were confirmed unchanged rather than re-sourced. Added `scripts/verify-1430-loadouts.mjs`; it shows the Interdictor one-shot window at 120-160 m with chest and limb now identical, iron sights at 35 points against 30 for a standard optic, and the VSSM at 321 m/s with the new recoil base flowing through composed grips. | Publication and deployment remain out of scope for this plan. |
| 2026-09-15 | Implementation revision | Applied on top of `5bcc4bebde276d7bc82111b877276f01c5cbbbd0` with the working tree carrying the 1.4.3.0 changes. Checks run: `node scripts/validate-data.mjs` (63 weapons, passed), `node --test` over damage, ballistics, optic-costs, attachment-effects, attachment-compatibility, source-arrays, draw-time and spread-distribution (**60 pass, 0 fail**), schema validation of the manifest (0 errors) and the manifest/baseline hash verification above. | Not committed and not pushed. |
| 2026-09-16 | Review corrections | Fresh hit-zone generation matches all 63 weapons and 328 ammo entries. Configuration comparison leaves only the seven documented cadence differences. All 24,211 manifest export files and 13 original support files passed size/hash checks. Direct localization comparison found no changed or removed recorded attachment label/description IDs. The refreshed hit-zone trace resolves the added M45A1 Blacklight package; ballistic values are unchanged. | Decoder ambiguity now propagates from nested and inherited layouts; PiP conclusions remain provisional. |
| 2026-09-16 | Dependency and panel coverage correction | 147 of the 152 newly captured dependency routes have `dependencyScan: not-run`. Their raw import tables contain 81 references to uncaptured gameplay routes, including controller aiming curves. The first-hop review does not complete recursive closure. | Recursive review remains unchecked. Review or explicitly exclude these downstream routes. Source text was checked, but no new live-panel capture or complete rerun of every listed attachment recheck was established; that combined item remains unchecked. |
| 2026-09-16 | Fix verification | Four decoder regression tests pass; 12 retained raw assets have identical decoded values before/after the warning fix. Damage and ballistics tests: 14 pass, 0 fail. `post-update/review-2026-09-16.json` records the raw samples and 81 unresolved references to 73 distinct gameplay routes. Evidence hashes and the partial collection manifest were refreshed. | No publication or new live-panel verification performed. |
| 2026-09-16 | Scoped dependency continuation | Captured 269 additional raw assets (700,224 bytes) in `collection-review-2026-09-16`; all sizes/hashes verified. Traversed 16,426 assets from 1,061 seeds with 0 pending known routes and 0 read failures. Recorded 11,306 excluded routes and the three-node soldier-camera cycle. Import-table cross-check against the EBX reader passed for 19 assets. | Four unique import GUIDs in 16 assets resolve in neither catalogue; the overall manifest remains partial. Full route evidence: `post-update/dependency-review-state-2026-09-16.json`. |
| 2026-09-16 | Site source and browser verification | Four Interdictor curve representations, iron-sight cost, five VSSM fields, derived recoil and all regenerated hit zones agree with the site. Browser shows Interdictor iron 15 / total 35 versus standard optic total 30, 100 damage and 1 BTK at 150 m; VSSM 321 m/s and recoil 0.85 degrees default / 0.76 with Folding Vertical. Comparison chart and table agree. Fixed stale header/footer/page description and baseline provenance. Attachment, optic and compatibility tests: 41 pass. | No browser errors. Ship-surface validation passed. Source and browser evidence: `reference-data/provenance/frosty-1.4.3.0-review-2026-09-16.json`. No publication or deployment. |

| 2026-09-16 | Unresolved GUID trace and publication authorization | Decoded all 16 callers. All four file GUIDs and their 20 target object GUIDs already appear as BadRef in 1.4.2.5. Indexed each caller in `reference-data/frosty/asset-findings.json` and recorded reuse/revisit rules in the Frosty README. | User authorized commit, push and merge of the reviewed 1.4.3.0 work. Exact target identities remain unresolved; deployment is separate. |
