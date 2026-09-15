# Frosty 1.4.3.0 collection and comparison plan

Created: 14 September 2026.

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

- [ ] Finish the baseline tasks, then install 1.4.3.0 and confirm the launcher has completed the update.
- [ ] Record actual game-build evidence and the installed game path. Do not assume the example EA installation path applies without checking it.
- [ ] Open the existing Frosty installation against the updated game files. Let normal revision detection rebuild the asset cache first.
- [ ] If the cache remains stale, close Frosty, move the stale BF6 cache out of the active cache directory, and reopen it. Inspect the type-info cache too if stale metadata is suspected. Do not delete old evidence during troubleshooting.
- [ ] Complete SDK regeneration if requested. If generation fails, record the error and resolve compatibility before treating decoded output as valid.
- [ ] Open/export representative assets: one weapon blueprint, one GS configuration, one shared modifier, the weapon registry and a known projectile. Check that important fields and references decode.
- [ ] Record the new Frosty/SDK/descriptor identities and any decoder change from the baseline.

Completion condition: the updated archive is readable and representative decoding works. An editor window opening is not enough evidence by itself.

## 4. Generate the new catalog and collection plan

- [x] Add or use a read-only catalog exporter that emits `asset-catalog.json` directly from Frosty asset records. Implemented in `scripts/frosty-collect-raw.ps1` and exercised against the old build; the new catalog still needs to be generated after the update.
- [ ] Include the build identity, extraction time, tool identity and asset paths. Include GUID, type, original size and content hash where available; identify hash algorithms and leave unavailable values explicit.
- [ ] Keep one catalog per build. Do not overwrite the path-only old catalog or pretend its absent metadata is known.
- [ ] Compare complete catalogs for additions, removals and changed hashes. Treat a stable GUID with a changed path as a rename candidate, not conclusive proof of identical contents.
- [ ] Apply the watchlist and review discovery candidates. Use full-catalog differences to catch relevant additions outside the discovery prefixes.
- [ ] Inspect the existing exporter and merge-helper capabilities before writing a collector. Add only the missing coordination needed for explicit output paths, dependency traversal and collection results.
- [ ] Resolve dependencies recursively with a visited set. Record cycles, missing targets, GUID-only references and undecoded dependencies. A structural reference does not prove an active gameplay branch.
- [ ] Review any dependency expansion into art, audio or unrelated systems. Record deliberate exclusions and why they do not block the stated comparison.

Completion condition: the collection has explicit inputs and destinations, and unresolved coverage is visible. Discovery and review rules are not currently an automated end-to-end pipeline.

## 5. Collect 1.4.3.0 into new destinations

- [ ] Create the new export/research directories and verify every command's destination before running it.
- [ ] Export watched normal EBX assets as raw EBX and XML where practical, plus required dependencies.
- [ ] Export material grids through `scripts/frosty-raw-assets.ps1`; use the bounded readers for inspection. Do not use normal `export-ebx` XML decoding for these grids.
- [ ] Export English strings and any required RES/chunk payloads separately.
- [ ] Retain matching descriptors alongside the raw collection and record the tool identities used.
- [ ] Generate `collection-manifest.json` using the existing schema: requested routes/formats, output paths, byte counts, hashes, failures and skipped work with reasons.
- [ ] Check manifest paths exist, recorded sizes/hashes match the files, and required inputs were collected. Resolve or document failures before marking the collection complete.
- [ ] Verify that commands did not overwrite the old XML, raw assets or derived reports. Retain baseline file hashes for this check.

## 6. Extract and explain the changes

- [ ] Inspect each generator's current CLI and default destinations. Several scripts write into Analyzer data or provenance by default. Use explicit output options where supported; otherwise run in an isolated checkout/output setup before accepting changes.
- [ ] Regenerate semantic field mappings, selectors and source traces from the new build. Do not reuse an old trace when its source hashes no longer match.
- [ ] Compare weapon inputs: damage curves, projectiles, velocity/drag, cadence, magazine sizes, reloads, recoil and spread.
- [ ] Compare attachment inputs: handling, barrel ADS, sniper brakes, ammo, lights, optics, point costs, selector branches and compatibility rules.
- [ ] Compare shared arrays, global operands, Precision panel tables, hit-zone/material records and relevant soldier inputs.
- [ ] Compare display names and tooltips separately from mechanics. UI text and kill-switch defaults do not establish runtime formulas or availability.
- [ ] Review the patch notes and map each relevant item to its asset evidence. Use `docs/working/INTERDICTOR_1.4.3.0_CHECK.md` for the existing focused checklist, but use this plan's current paths and cache sequence if its examples differ.
- [ ] Review unlisted changes as well. Use the saved findings before repeating searches that previously failed to answer the same question.
- [ ] Produce a change report with asset/field, old value, new value, source evidence and practical effect. Separate byte changes, decoder changes, numeric changes, additions/removals and unresolved interpretations.
- [ ] If a decoder change could explain an XML difference, compare with consistent decoding where possible. A different raw hash alone does not establish a changed weapon stat.
- [ ] Add new findings or superseding evidence without erasing old scoped conclusions. Mark affected findings for review when assets or dependencies change.
- [ ] Recheck the [attachment bug list](../ATTACHMENT_BUGS.md). Rerun `scripts/frosty-multi-package-scan.py`; retrace the sniper and SMG Slim Angled, fast/regular magazine and M121 A2/M45A1 FMJ selector packages; confirm the three `linked-text-differs-from-panel` tooltips still match the live panels; check that the AK-205 UGL Mount branch is still unoffered; and compare magazine shifts relative to each default magazine. All assets these checks use were captured before the update.

Relevant existing consumers include `frosty-configuration.py`, `frosty-grx-field-names.py`, `frosty-attachment-handling.py`, `frosty-barrel-ads.py`, `frosty-sniper-brakes.py`, `frosty-hit-zones.py`, `frosty-ballistics.py`, `frosty-global-operands.py`, `frosty-precision-tables.py`, `frosty-attachment-tooltips.py`, `frosty-attachment-compatibility.py` and `frosty-material-grid-inventory.py`, under `scripts/`. This list identifies work areas, not a verified command sequence. Read current arguments and dependencies before execution.

## 7. Update and verify the Analyzer

- [ ] Review the comparison report and determine which source changes require site changes.
- [ ] Apply only the required data/model/UI changes. Preserve observed, fitted and native-confirmed evidence boundaries.
- [ ] Run the narrow existing checks relevant to changed behavior. Check required repository guidance before release; do not run broad tests for documentation-only work.
- [ ] Verify representative affected loadouts, including compatibility and shared-stat effects where changed.
- [ ] Update source/build labels, provenance and limitations so retained 1.4.2.5 data is not presented as newly verified 1.4.3.0 data.
- [ ] Record the implementation revision and check results. Publication and deployment are separate tasks; this plan does not authorize them.

## Final completion checklist

- [ ] Old reference evidence remains accessible without duplicate XML or recording copies.
- [ ] New outputs identify the actual build and tool versions.
- [ ] Required export/dependency failures are resolved or explicitly listed as limitations.
- [ ] The comparison covers relevant patch-note items and relevant catalog changes.
- [ ] Every accepted numeric change has source evidence.
- [ ] Shared watchlist/findings are updated from the completed investigation.
- [ ] Analyzer changes and relevant checks are recorded, or explicitly deferred.
- [ ] The unfinished broad backup is not described as a verified snapshot. Any later cleanup is a separate, scoped action.

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
