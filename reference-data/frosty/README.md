# Frosty asset collection

`asset-watchlist.json` is the shared collection plan. It is an initial seed, not a completed export or proof that all listed references affect gameplay.

After a game update, follow [docs/GAME_UPDATE_GUIDE.md](../../docs/GAME_UPDATE_GUIDE.md) and record what you learn back here.

## Current seed

- 8,062 asset paths matched against the saved 464,499-entry EBX catalog. Codex seeded 7,639; the earlier merge added 354 from 21 more research sources. The 14 September compatibility merge adds 69 paths and cites 5,480 source assets for physical slots and equipment dependencies.
- Evidence comes from the sources listed under `evidence`. Source-hash sections were used where available (including hash keys that are unique file names); otherwise catalog-matched path mentions were used. This includes broad inputs read by the attachment generators, not only operands approved for the site.
- Direct external EBX references were read from existing XML files. Three assets are still `pending-export`.
- The two known material grids use raw EBX only. `fs_us_loc` also needs a `strings` export: its text is in binary chunks that XML does not contain. Other entries request raw EBX and XML.
- Dependencies are structural references, not proof that a branch is active. Targets outside the asset list still need collection and recursive inspection. No recursive dependency closure has been claimed. For example, `AttachmentCategory_Sight` is only a dependency, but the optic generator classifies sights through it.
- Claude research reports from 6-14 September 2026 are merged. Superseded early passes (`frosty-attachment-followup-2026-09-06`, `frosty-attachment-full-pass-2026-09-06`, `ebx-manifest-second-pass-2026-09-06`) and the animation-state review are not evidence sources. The label `1.4.2.5` does not independently verify the build of every existing file.

The full catalog stays in the external BF6 Datamining directory. The watchlist records its hash so a replacement catalog cannot silently change the baseline. Do not copy the full catalog into the watchlist.

As of 14 September 2026, `datamining` resolves to `C:\Users\royal\Documents\BF6 Datamining`. The 1.4.2.5 XML root is `Frosty Exports\1.4.2.5` beneath that directory. The tools root is `FrostyToolsuite-battlefield6`, with no repeated nested folder; its runtime is `FrostyEditor\bin\Release\Final`, which also holds `SharedTypeDescriptors.ebx`.

## Maintaining the list

Use the internal asset path, without `.xml`, as the identifier. Match case-insensitively and retain catalog spelling. Sort assets and dependencies by path. Each asset must cite at least one evidence ID; the evidence entry explains its purpose and identifies the report or consumer.

Add new findings after their collection finishes. To add a research report, add an entry to `EVIDENCE` in `scripts/frosty-watchlist-merge.py` and run it (dry run without `--write`). The script stops if the catalog hash changed, adds new paths, keeps existing dependencies, and scans a `pending-export` entry once its XML is in the export root. Retain missing paths as explicit review items rather than inventing replacements. Re-scan references from new exports: the current dependencies are a baseline, not a permanent override.

Discovery rules are instructions for a future collector, not executable automation. Review new candidates before expanding required collection. Compare the complete old and new catalogs as well, so discoveries outside these prefixes are still visible.

## Research findings

`asset-findings.json` stores curated findings keyed by internal Frosty path. It contains 217 findings across 171 assets, including 62 ability and 56 equipment findings from the compatibility investigation, 26 selector-package findings from the 14 September description review and 19 optic render FOV findings from 16 September. The material-grid record inventory (`scripts/frosty-material-grid-inventory.py`) names grid types by GUID from Frosty's `FrostyPlugin/Sdk/ClassGuids.txt`; BF6 field-name hashes do not match standard hash algorithms, so hashing names from other sources does not work. It records contents, the question investigated, the result, evidence pointers, inspected asset hashes where available, build limits and revisit conditions.

Check this file before repeating an investigation. Results apply to the stated question and method. `inconclusive` does not mean the asset is unrelated; `blocked-by-decoding` does not mean it lacks useful data. A `useful` result does not establish native runtime behavior beyond the cited evidence. There is no permanent exclusion flag.

Add new findings as separate entries. Preserve earlier results and explicitly link later evidence that supersedes them. Do not assign an inspection date or verified build without supporting evidence. Evidence pointers are JSON Pointers into the cited reports; a null pointer refers to the cited script or document as a whole.

Compare hashes only within the recorded format: raw EBX and XML hashes are different evidence. Asset or dependency changes, improved decoding and new consumer evidence are reasons to review a finding. These review triggers are documented rules, not active automation.

## Research results

Research results are in the topic pages under [`docs/frosty/`](../../docs/frosty/README.md):

- [Field map](../../docs/frosty/FIELD_MAP.md): all known hash meanings, including the
  attachment modifier fields and generic structures.
- [Data graph](../../docs/frosty/DATA_GRAPH.md): how attachments, abilities, selectors,
  parts and bindings link, including shared slots and equipment prerequisites.
- [Weapons](../../docs/frosty/WEAPONS.md): damage curves, hit zones, spread and recoil
  laws, the camera-recoil ladder and timing fields.
- [Attachments](../../docs/frosty/ATTACHMENTS.md): composition rules, generated values,
  optic categories, render FOV and zoom.
- [UI text](../../docs/frosty/UI_TEXT.md): names, labels and descriptions.
- [Tools](../../docs/frosty/TOOLS.md): export, decoding and generators.

Anomaly scans are described in the
[game update guide](../../docs/GAME_UPDATE_GUIDE.md#stage-6--consistency-scans).

## Scope

These shared JSON files define the collection plan and findings. The separate collector has captured the pre-update raw set; no complete dependency inventory is claimed. Preparation did not resume the broad backup or change Analyzer data.

## Known unresolved soldier GUIDs (16 September 2026)

Four unresolved soldier file GUIDs are listed in
[Open questions](../../docs/frosty/OPEN_QUESTIONS.md#unresolved-soldier-file-guids).
The [GUID trace](../provenance/frosty-1.4.3.0-unresolved-guid-trace-2026-09-16.json)
records all object GUIDs, callers, pointer counts and local evidence hashes. The 16
caller assets are indexed in `asset-findings.json`.
