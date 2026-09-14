# Frosty asset collection

`asset-watchlist.json` is the shared collection plan. It is an initial seed, not a completed export or proof that all listed references affect gameplay.

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

`asset-findings.json` stores curated findings keyed by internal Frosty path. It contains 140 findings across 133 assets, including 62 ability and 56 equipment findings from the compatibility investigation. The material-grid record inventory (`scripts/frosty-material-grid-inventory.py`) names grid types by GUID from Frosty's `FrostyPlugin/Sdk/ClassGuids.txt`; BF6 field-name hashes do not match standard hash algorithms, so hashing names from other sources does not work. It records contents, the question investigated, the result, evidence pointers, inspected asset hashes where available, build limits and revisit conditions.

Check this file before repeating an investigation. Results apply to the stated question and method. `inconclusive` does not mean the asset is unrelated; `blocked-by-decoding` does not mean it lacks useful data. A `useful` result does not establish native runtime behavior beyond the cited evidence. There is no permanent exclusion flag.

Add new findings as separate entries. Preserve earlier results and explicitly link later evidence that supersedes them. Do not assign an inspection date or verified build without supporting evidence. Evidence pointers are JSON Pointers into the cited reports; a null pointer refers to the cited script or document as a whole.

Compare hashes only within the recorded format: raw EBX and XML hashes are different evidence. Asset or dependency changes, improved decoding and new consumer evidence are reasons to review a finding. These review triggers are documented rules, not active automation.

## Shared slots and attachment dependencies

The [compatibility report](../provenance/frosty-attachment-compatibility.json)
records 1,392 offered grip/laser/light choices and all 285 inspected equipment
dependency entries. Twenty-two rules map to offered attachments on PP-19,
AK-205, RPK-74M and RPKM. The other 263 entries concern secondary sights outside
the offered choices or reviewed mapping; they remain explicit source evidence.

- **Physical slots:** follow ability root `Field_d7605aab` to its listed branches.
  `Field_f86e0433` identifies the attachment progression; `Field_64ef48eb` identifies
  its slot category. Attachment types assigned to the same slot share one choice.
  This corrects KORD and KTS100 to one laser/light slot; PP-19 retains separate
  side slots. Do not restore the earlier hand-maintained combined-slot flags.
- **Prerequisites:** equipment `Field_e70ce6be` holds `Struct_4f9523cc` records.
  `Field_399fae20` names the dependent attachment and `Field_f4142987` lists allowed
  prerequisite IDs. Resolve those IDs against attachment `Field_de6f63b3` values.
  These integer links are not discovered by searching external EBX GUIDs alone.
- **PP-19 proof:** every one of its 12 underbarrels lists the other five magazine
  source IDs and excludes 53-round Extended4 (`0x81260446`). The supplied 30/53-round
  screenshots corroborate the restriction. See the [operand trace](../../docs/working/PP19_53_ROUND_COMPATIBILITY_2026-09-14.md).
- **Limits:** the other compatibility rules are source-backed, without equivalent
  new in-game tests. Findings identify existing XML hashes in the 1.4.2.5 export
  directory, not a newly verified game build or decoded native condition engine.

Regenerate with [frosty-attachment-compatibility.py](../../scripts/frosty-attachment-compatibility.py)
and the [maintenance command](../../MAINTENANCE.md#regenerate-attachment-modifiers).
After reviewing a new result, merge its collection evidence with
`scripts/frosty-watchlist-merge.py` and append affected asset findings. Review
changed slot categories, prerequisite IDs and site identity mappings after updates.
The watchlist includes the files read by the generator; it does not claim a full
recursive dependency closure or approval of every operand in those files.

## Per-build collection

Create a separate directory for each verified game build. Store raw EBX, XML, matching `SharedTypeDescriptors.ebx`, tool/SDK identity and export results there. Preserve original files once the collection is complete. Keep recordings outside this process.

Use `collection-manifest.schema.json` for each build's generated `collection-manifest.json`. No collection manifest is created here because no new collection has run. The schema distinguishes successful, failed, skipped and missing exports and records each output's size and SHA-256. Failed or partial results must not be presented as a complete snapshot.

Record the actual game build evidence and Frosty revision or binary hashes. An expected patch label alone is not build verification. Record extractor versions, source asset hashes and field paths in derived stat reports. Preserve observed values separately from calculations and interpretation.

For dependencies, follow external references recursively with a visited set. Record missing targets, unresolved GUID-only references and assets that could not be decoded. Referenced RES/chunk payloads and localized strings may need separate extraction; a raw EBX file does not contain all referenced data. Save these as support files and document their source routes.

Do not use a changed raw hash alone as proof of a numeric stat change. Compare decoded fields and generated stats, using matching decoder versions where practical. Preserve both versions when decoder changes affect output.

### 1.4.2.5 tree additions (14 September 2026)

Exports made during research in the ignored `outputs/` folder were copied into `Frosty Exports\1.4.2.5` with their asset routes: 1,002 attachment UI descriptors, 7 weapon UI metadata assets, `UIPlayerAbilityDescriptionMetadata`, and the English strings as `Common/Localization/Languages/fs_us_loc.strings.tsv` (SHA-256 `a90186f7…`, matching `frosty-attachment-descriptions-2026-09-13.json`). No existing file was replaced; the one overlapping descriptor was byte-identical. `UIWeaponAbilityMetaData_S3B2` was exported with FrostyCmd on the 1.4.2.5 install (`bf6.exe` dated 5 September 2026); it is an empty container. Export status files are in `_support/export-status`.

## Frosty tool procedure (verified 12-14 September 2026)

1. **Build check.** The 1.4.2.5 install has `bf6.exe` dated 5 September 2026. A later date means the game updated; exports then reflect the new build.
2. **Cache.** After an update, rename `Caches\bf6.cache` (for example `bf6-1.4.2.5.cache`) before the first export. Frosty only patches a cache whose head number differs, and that path is untested for BF6. The first export then builds a full cache (the 1.4.2.5 cache is 880 MB).
3. **XML export (batch).** Put routes in a text file, one per line, and run from the runtime folder: `FrostyCmd.exe export-ebx-list bf6 "C:\Program Files\EA Games\Battlefield 6" "<list file>" "<output folder>"`. It loads the cache once, writes each asset under its route, and records `ok` or the error per asset in `export-status.tsv`. Test on 14 September: 10 assets, including the 21 MB `GRX_Weapons` and 12 MB `settings`, in 26 s; all 9 comparable files byte-identical to the Frosty Editor export. The 1,003 attachment descriptors were also exported this way with no errors. `export-ebx-list` has no size limit: never put a material grid or other very large asset in the list.
4. **XML export (single).** `FrostyCmd.exe export-ebx bf6 "<game>" "<asset path>" "<output .xml>"` takes about 14 s per asset, mostly cache load. Trust the local usage lines, not the online Frosty command docs.
5. **Strings.** `FrostyCmd.exe export-strings bf6 "<game>" Common/Localization/Languages/fs_us_loc "<output .tsv>"`.
6. **Memory.** Run one FrostyCmd process at a time. Never decode a level `materialgrid_win32` with `export-ebx`, `export-ebx-list` or the Editor: it reached 49-52 GB and crashed the machine once, and a failed or timed-out export keeps reading in the background. After any failed or slow export, check `Get-Process FrostyCmd` and stop it with `Stop-Process -Name FrostyCmd -Force`.
7. **Raw EBX.** Dump material grids with `scripts/frosty-raw-assets.ps1` (routes in its header; it has a size limit). `scripts/frosty-hit-zones.py` reads them with `SharedTypeDescriptors.ebx`.
8. **Old snapshots.** Write each build to its own `Frosty Exports\<build>` folder. A 1.4.2.5 file cannot be exported again after the game files update.

## Coverage of the 1.4.2.5 XML export (14 September 2026)

The catalog lists 48,940 routes under `Common/Hardware/Weapons`, `Common/Hardware/Common/Arrays`, `Common/GameSetup/Tweakables` and `Common/GameSetup/GameConfigurations`. 26,086 are exported. Of the 22,854 missing, 22,761 are in art, texture, skin, VFX, audio or UI folders; the rest are ammo textures, cartridge art and two sledgehammer skins. No `_WB`, `GS_`, `Attachment_`, `U_PRG_`, `U_ATT_`, `WPM_`, `PD_`, array or tweakable route is missing. The classification is by name and folder only; `Game/` and gadgets were not checked.

The original blanket export has 36,658 XML files; 6,978 of them are watchlist assets. Mechanics folders without art folders hold 15,523 routes, 8,565 of them outside the watchlist.

Data outside the XML tree: level material grids (raw EBX), localized strings (binary chunks), `SoldierMotionMachine` (export timed out) and native runtime equations.

## Update comparison: generators and checks

After exporting a new build, re-run the consumer for each evidence source and compare with the dated report.

| Area | Command or check | Baseline |
|---|---|---|
| Precision tables | `python scripts/frosty-precision-tables.py --root "<xml root>" --out reference-data/provenance/frosty-precision-tables-<date>.json`, then `node scripts/frosty-precision-check.mjs` | `frosty-precision-tables-2026-09-14.json` |
| Hit zones | `scripts/frosty-raw-assets.ps1`, then `scripts/frosty-hit-zones.py` | `frosty-hit-zones-2026-09-13.json` |
| Tooltips and optics | `scripts/frosty-attachment-tooltips.py` with a new dated `--optic-mapping-json` (full command in `docs/working/FROSTY_DISPLAY_NAMES.md`), then `node --test scripts/optic-costs.test.mjs` | `frosty-optic-category-mapping-2026-09-13.json` |
| Weapon display names | Steps in `docs/working/FROSTY_DISPLAY_NAMES.md` (strings, string scan, `UIWeaponAbilityMetaData*`) | `frosty-weapon-display-names-2026-09-13.json` |
| Handling, barrel ADS, sniper brakes | `scripts/frosty-attachment-handling.py`, `scripts/frosty-barrel-ads.py`, `scripts/frosty-sniper-brakes.py` | the matching `*-generated.json` reports |
| Arrays, damage, draw time, spread | `node --test scripts/source-arrays.test.mjs scripts/damage.test.mjs scripts/draw-time.test.mjs scripts/spread-distribution.test.mjs` | `frosty-array-review-2026-09-09.json`, `frosty-damage-curve-review-2026-09-13.json`, `frosty-draw-time-2026-09-09.json` |
| Patch-note items | `docs/working/INTERDICTOR_1.4.3.0_CHECK.md` | 1.4.2.5 values in that file |

Field meanings found so far that help comparisons: optic point cost `Field_6ee865a5`; Precision table fields in the precision report `fieldMap`; semantic names from `GRX_Weapons` (`frosty-grx-field-names-2026-09-13.json`).

## Scope

These files define and seed the process. They do not export assets, rebuild Frosty, resume the backup, change Analyzer data or claim a complete dependency inventory.
