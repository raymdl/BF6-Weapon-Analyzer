# Frosty tools and exports

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Game update guide](../GAME_UPDATE_GUIDE.md)

How to export and decode BF6 game data safely. The step order for a game update is in
the [game update guide](../GAME_UPDATE_GUIDE.md); this page is the tool reference.

## Locations

### Site input audit tools

`scripts/frosty-site-input-inventory.py` writes every top-level data JSON leaf or
empty container and each nonblank simulation code line to external research
files. It pins current site hashes and exact weapon identities. Its pending rows
are review work, not proof of source coverage.

`scripts/frosty-site-spread-audit.py` compares all stationary and moving spread
dynamics against captured GS fields. `scripts/frosty-site-precision-audit.py`
compares the current Precision table base keys and rows with exact captured
settings objects. Both resolve raw field offsets and preserve the source/site
boundary. They read `coverage-decoder-v5.sqlite` without changing it.

`scripts/frosty-site-draw-audit.py` checks the current DTA table fields at raw
offsets. `scripts/frosty-site-magazine-audit.py` traces the selected magazine
effect graphs, checks capacity and reload scalars, and retains nominal-capacity
and animation-replacement differences. Both use `--report-dir` and `--out`.
`scripts/frosty-site-input-review.py` joins topic evidence by exact site file and
JSON pointer; pending work must remain visible until reviewed.

Pass the external audit directory with `--report-dir` and a new compact receipt
path with `--out` for those two checks. For the inventory, use `--out-dir` for
large outputs and `--summary` for its compact receipt. Existing outputs are not
overwritten. These tools do not write production data or access the game process.

`scripts/frosty-sym-regression.py` compares a local dated Sym snapshot with the
existing field JSONL and exact roster. Pass `--sym`, `--fields`, `--field-receipt`
and a new external `--out` path. It includes numeric array leaves and preserves
duplicate object candidates. The
[122-field reproduction receipt](../../reference-data/provenance/frosty-site-sym-reproduction-2026-09-23.json)
separately pins the supplied matcher, its looser tolerance and fresh-cache rerun.
Neither result assigns a semantic name from a matching number alone.

| Item | Path |
|---|---|
| Datamining root | `C:\Users\royal\Documents\BF6 Datamining` |
| Frosty tools root | `FrostyToolsuite-battlefield6` (no second nested folder) |
| Runtime (FrostyCmd, cache, profiles) | `FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final` |
| Build snapshots | `builds\<build>\` with `xml\`, `capture\`, `reports\`, `BUILD.json`, `MANIFEST.tsv`; index `builds.json` ([below](#build-snapshots)) |
| XML export root | `builds\<build>\xml` (1.4.3.0: `builds\1.4.3.0\xml\xml-overlay`; routes Frosty could not decode are in `xml-overlay-stale.txt`) |
| English strings | `builds\<build>\xml\Common\Localization\Languages\fs_us_loc.strings.tsv` |
| Raw captures, toolchain | `builds\<build>\capture\collection\`, `builds\<build>\capture\toolchain\` |
| Catalogs | `builds\<build>\capture\catalog\` (`ebx_manifest.txt`, `ebx_manifest.csv`, `ebx_directories.txt`); the watchlist pins the 1.4.2.5 `ebx_manifest.csv` |
| Layout and archive | `BF6 Datamining\README.md` (with the old-to-new path map); historical files in `BF6 Datamining\_archive\` |

From the Analyzer repository, pass `--root "../BF6 Datamining/builds/<build>/xml"` to
tools that read the XML tree. Older reports keep old absolute paths; the
[path map](../DATA_SOURCES.md#local-frosty-export-location) gives the current location.

## Build snapshots

`scripts/frosty-build.py --datamining "<datamining root>" <command>`:

| Command | Use |
|---|---|
| `status` | List builds, states, file counts and sizes. |
| `guard <build> --game "<game>"` | **Run before every export.** Stops unless `<build>` is open and the installed `bf6.exe` is one of its recorded clients. |
| `record <build>` | **Run after every export.** Adds new files to `MANIFEST.tsv`; stops if an existing data file changed or disappeared (`reports\` may change). |
| `verify <build>` | Compares the build with its manifest. |
| `client-check <build> --game "<game>" --runtime "<runtime>"` | After a client update: compares the runtime `SharedTypeDescriptors.ebx` with the build's recorded descriptors (layouts with resolved type references). Identical: prints the client entry to add (hotfix). Different: a new build is needed. |
| `seal <build>` | Verifies, sets every file read-only, and marks the build sealed. Run when the game moves to a new data build, before its first export. |

- **Open build:** the installed data build. Later investigations can add new Frosty paths
  to it (export into its `xml\` or `capture\` folder, then `record`).
- **Sealed build:** read-only reference for comparisons. Derived comparison results go into
  the newer build's `reports\` folder.
- **Recorded state (16 September 2026):** 1.4.2.5 sealed (61,366 files, 2.7 GiB); 1.4.3.0
  open (63,326 files, 3.7 GiB) with two clients: the 1.4.3.0 release and the 16 September
  hotfix. The hotfix has identical type layouts, and only 2 non-gameplay assets changed
  (`builds\1.4.3.0\reports\hotfix-2026-09-16-catalog\`).
- **Client label update (23 September 2026):** Head 4892087, executable
  `95c61904…`, descriptors `99b49cfd…` is labeled **1.4.3.1** in `BUILD.json`,
  from the user-supplied EA 18 September roundup reference. Head 4892017 remains
  **1.4.3.0**. The `builds/1.4.3.0` folder and all existing paths stay unchanged.
- There is no second copy of the data by design; it is research data, not site production
  data. Sealing and the manifest protect it against accidental changes.

## FrostyCmd

Run from the runtime folder with profile `bf6` and game path
`C:\Program Files\EA Games\Battlefield 6`. Trust the local usage lines, not the online
Frosty command documentation.

| Command | Use |
|---|---|
| `FrostyCmd.exe export-ebx-list bf6 "<game>" "<list file>" "<output folder>"` | Batch XML export. Loads the cache once, writes `<route>.xml` per line and `export-status.tsv`. 693 assets took a few minutes. **No size limit:** never list a material grid. |
| `FrostyCmd.exe export-ebx bf6 "<game>" "<asset>" "<output .xml>"` | One asset. About 14 s, mostly cache load. |
| `FrostyCmd.exe export-strings bf6 "<game>" Common/Localization/Languages/fs_us_loc "<output .tsv>"` | English strings as `id<TAB>text` (about 109,000 lines). See [UI text](UI_TEXT.md). |
| `FrostyCmd.exe scan-string-usage bf6 "<game>" "<ids file>" "<output .tsv>" <prefix ...>` | Find assets that use string ids. Always give path prefixes. |

`export-strings` and `scan-string-usage` come from
[frostycmd-string-tools-2026-09-13.patch](../../reference-data/provenance/frostycmd-string-tools-2026-09-13.patch).
Build only FrostyCmd, so the existing FrostySdk and FrostyHash builds stay unchanged:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" `
  "<toolsuite>\FrostyCmd\FrostyCmd.csproj" /p:Configuration="Release - Final" /p:Platform=x64 `
  /p:BuildProjectReferences=false /p:SolutionDir="<toolsuite>\FrostyEditor\\" /t:Build
```

## Procedure

1. **Build check.** Run `frosty-build.py guard <open build> --game "<game>"`. If it
   stops after a game update, follow the [game update guide](../GAME_UPDATE_GUIDE.md#stage-1--identify-the-new-build)
   (`client-check`, then either add the hotfix client or seal and create a new build).
2. **Cache.** After an update, rename `Caches\bf6.cache` (for example
   `bf6-1.4.2.5.cache`) before the first export. Frosty only patches a cache whose head
   number differs, and that path is not tested for BF6. The first export then builds a
   full cache (880 MB for 1.4.2.5).
3. **Export** with `export-ebx-list` into the open build (`builds\<build>\xml\...` or
   `capture\...`), then run `record`. A previous build cannot be exported again after the
   game files update.
4. **Check for decoding gaps.** Count `<!-- Object could not be loaded (unknown type) -->`
   in the new XML before you trust a diff. Decode those routes with
   `scripts/frosty-ebx-decode.py` (see [SDK and decoding](#sdk-and-decoding)).
5. **Strings.** Export `fs_us_loc` with `export-strings`.
6. **Raw EBX.** Capture material grids and other raw assets with the scripts below.

## Safety rules

- **Material grids.** Never decode a level `materialgrid_win32` with `export-ebx`,
  `export-ebx-list` or the Frosty Editor. It reached 49–52 GB and crashed the machine
  once. A failed or timed-out export keeps reading in the background.
- **One FrostyCmd at a time.** Do not run exports in parallel.
- **After a failed or slow export,** check `Get-Process FrostyCmd` and stop it with
  `Stop-Process -Name FrostyCmd -Force`. Git Bash `timeout` does not stop the Windows
  process.
- **Never write to a sealed build.** Its files are read-only; `guard` stops exports into it.
- **Generators write by default.** Several `scripts/frosty-*.py` write into Analyzer data
  or provenance. Pass explicit output paths and check `git status` after each run.
  `frosty-attachment-tooltips.py` writes back into its `--mapping-json` input: copy the
  dated file to a new date first.

## Raw EBX scripts

| Script | Use |
|---|---|
| `scripts/frosty-collect-raw.ps1` | Full catalog and an optional routes-file raw set, without object decoding. Use a new output directory per capture. |
| `scripts/frosty-raw-assets.ps1` | Raw dump of specific routes (routes in its header; has a size limit). |
| `scripts/frosty-material-grid-inventory.py --descriptors <SharedTypeDescriptors.ebx> --class-guids FrostyPlugin/Sdk/ClassGuids.txt --grid <raw .ebx> --out <json>` | Bounded, safe reader for material grids. Ran on both 1.4.3.0 grids. |
| `scripts/frosty-hit-zones.py` | Reads raw grids with `SharedTypeDescriptors.ebx`. |
| `scripts/frosty-ebx-decode.py` | SDK-independent RIFF EBX decoder (below). |
| `scripts/frosty-catalog-files.py <asset-catalog.json> <folder>` | Writes `ebx_manifest.txt`, `ebx_manifest.csv` and `ebx_directories.txt` for a build (`--check` compares). |

## SDK and decoding

### Separate cache-variant index

`scripts/frosty-audit-cache-variants.py` reads the effective-catalog ledger in read-only
mode and indexes selected/alternate capture requests into a separate SQLite database.
It checks raw identities and selected controls, preserves provisional decode warnings,
and records objects, complete EBX import tables and references. It refuses existing
output files. The [335-pair receipt](../../reference-data/provenance/frosty-audit-cache-variants-index-2026-09-23.json)
pins the helper, decoder, database and summary hashes. Native cache-record selection
and alternate dependency semantics remain unresolved. Use this index for a specific
Analyzer question; capture coverage alone is not a reason to expand the graph.

### Exhaustive audit coverage ledger

`scripts/frosty-audit-coverage.py` maintains the external 1.4.3.0 audit ledger under
`reports/exhaustive-audit-2026-09-23/coverage.sqlite`. It records every catalog row,
captured source variant, raw/descriptor hash, header import, decoded object body and
reference location. Source capture, structural decoding, semantic review and active
gameplay behavior are separate states. No automatic cosmetic or mode exclusions
are applied. Prior findings count only as field-specific evidence.

Run `init` with a new database, then `scan`, `decode` and `summary`, with `--build`
and `--db`. Explicit `--hotfix-dir` arguments register the earlier raw-assets batches;
`--collection-dir` reads a collector's catalog Head and raw-status manifest. Namespace
seeds widen through captured import edges. Uncatalogued GUIDs remain in the import
table and are reported separately; reachability is not resolved dependency closure.
Dependency membership is rebuilt from namespace seeds. A reviewed `excluded-*`
disposition stops traversal through that asset; an independent candidate can still
reach a shared target. Excluded records do not count as pending candidate decodes.
Large bodies stay pending a bounded read unless an explicit route and justified
limits are supplied. Keep the shared decoder pinned per ledger version.

The active continuation is `coverage-decoder-v5.sqlite`; the original, working, v2,
v3 and v4 databases preserve earlier states. V3 adds two validated empty boxed arrays;
v4 adds 34 more from the next capture layer. V5 refreshes one capture with two
validated count-one boxed structures. The ledger records `decoder_sha256` per
capture because unchanged bodies retain their original reader while 919 affected
captures use the reviewed delegate/boxed reader. The helper records each mutating
run's code hash and arguments; a changed helper requires `--tool-change-note`.
Do not reuse the initialization hash as proof of a later helper run.

The `scope` action accepts `--scope-validation` with a parent validation receipt.
It checks report/detail hashes, source identities and disposition counts before
writing cosmetic exclusions and row-specific evidence links. Unresolved-role rows
stay candidates. `frosty-audit-cosmetic-review.py` independently decodes the raw
three-family census, its assignment source and four slot definitions. Its first
receipt checks 3,765 assets and 923 assignment roots; source layout warnings remain.

`frosty-audit-skin-review.py` checks the separate skin census against fresh raw
bodies, including exact DefinitionMesh wrapper and visual collection imports.
The [accepted skin receipt](../../reference-data/provenance/frosty-audit-skin-validation-2026-09-23.json)
checks 19,334 catalog assets and four unknown GUID targets. It supports 16,103
cosmetic exclusions; 3,231 known unresolved roles remain candidates. The 34 draft
functional-retain labels were corrected through the named `Camo_SPO` slot. Nested
layout warnings remain. The scope writer streams rows to bound memory.

The raw collector's `-BundleRoutesFile` accepts exact EBX routes and writes
`bundle-status.jsonl`. It records bundle IDs, SDK types, blueprint routes and super
bundles without exporting object bodies. Run it with Windows PowerShell
(`powershell.exe`), as required by Frosty's .NET Framework assemblies.
`frosty-audit-cache-bundles.py` reads the cache EBX section with SDK duplicate-GUID
precedence, verifies every effective entry against the SDK catalog and cross-checks
selected SDK bundle exports. It does not decode RES/chunk sections or prove runtime
availability. The [weapon package receipt](../../reference-data/provenance/frosty-audit-weapon-bundle-context-2026-09-23.json)
pins the cache, reader and nine SDK comparison rows.

`-CacheVariantRequestsFile` uses `frosty-capture-cache-variants.ps1` to reconstruct
temporary SDK entries at exact cache offsets. It checks the cache hash before and
after extraction, matches each requested record identity, and writes distinct
GUID/SHA1/offset paths with raw SHA-256 values. It does not register these entries
or change the SDK's selected GUID records. Keep variant evidence outside the
effective-catalog ledger. The [three-pair pilot](../../reference-data/provenance/frosty-audit-cache-variant-pilot-2026-09-23.json)
matches all selected controls to prior raw captures and verifies different raw
bytes in all three skipped records. Native record selection remains unresolved.
The [next seven modifier pairs](../../reference-data/provenance/frosty-audit-cache-variant-modifiers-2026-09-23.json)
also match their selected controls. Four pairs have different object layout-key
sequences despite matching class-hash sequences. Preserve layout keys and raw
identities when comparing variants.

`-ResourceMetadataOnly` with `-ResourceIdsFile` writes `resource-metadata.jsonl`
without reading resource bodies. Its `metadata-only` status must not count as a
raw capture. The [current candidate census](../../reference-data/provenance/frosty-audit-candidate-resource-metadata-2026-09-23.json)
resolves all 12,086 nonzero resource IDs. All 1,297 expression resources now have
raw bodies: the original 22 plus [1,275 additional captures](../../reference-data/provenance/frosty-audit-candidate-expression-resources-2026-09-23.json).
The original [22-body identity census](../../reference-data/provenance/frosty-audit-expression-resources-census-2026-09-23.json)
finds 14 distinct byte payloads. These counts do not decode the expression grammar
or establish runtime use. The [full corpus check](../../reference-data/provenance/frosty-audit-expression-structure-validation-2026-09-23.json)
finds 1,111 distinct payloads across all 1,297 IDs. Fixed preamble values are
verified, but the proposed section boundary at word offset 32 remains unproven.
Two functional SimEx caller references match fresh EBX decoding; their release
captures and the hotfix resource captures are not same-Head pairs.
Texture, mesh, physics and animation resource types alone
do not establish a cosmetic exclusion.
The [animation-reference review](../../reference-data/provenance/frosty-audit-animation-resource-scope-validation-2026-09-23.json)
checks all 40 animation resource IDs against fresh caller-body decodes and 257
incoming EBX import rows. All remain scope-ambiguous; no animation bodies were
exported for that review. Mode-like directory names do not prove exclusive use.

The [structural snapshot](../../reference-data/provenance/frosty-audit-coverage-2026-09-23.json)
and [capture receipt](../../reference-data/provenance/frosty-audit-capture-2026-09-23.json)
record the first exhaustive-audit checkpoint. Later checkpoint counts are in the
`b3040e7` version of the research queue; current work is in the
[queue](../working/FROSTY_RESEARCH_QUEUE.md).

### SDK strings file

`FrostyToolsuite-battlefield6/FrostyPlugin/Sdk/Bf6-Strings.txt` lists engine type
names with their member lists (a type hash line, a member count, then the members)
and enum values in declaration order. Use it for candidate member names and enum
order, for example `FireLogicType` and `BoltActionData`. Its hashes are not the
`Field_` hashes in decoded EBX, so it does not map a hash to a name; confirm a name
with values or structure. The engine lists can be older than BF6: `BoltActionData`
has ten members there and sixteen fields in BF6.

### Descriptor reader

The exhaustive pass added eight-byte delegate type references to the shared reader.
The [review](../../reference-data/provenance/frosty-audit-delegate-review-2026-09-23.json)
checks 8,601 fields in 102 captured variants against raw bytes and confirms unchanged
surrounding object data. The full type GUID table must be retained: delegate references
can address entries beyond the layout-signature table. These are type identities,
not executable delegate bodies. Original layout warnings remain.

The [boxed-value validation](../../reference-data/provenance/frosty-audit-boxed-validation-2026-09-23.json)
checks 903 captures against the prior reader. It recovers 25,283 values and 789 null
references without changing other fields. Boxed headers consume 16 bytes. Their
struct indices address the asset-local type table; nested descriptor fields retain
the ordinary global-index context. The reader preserves type/offset metadata and
restores the cursor after each value. Unknown types/categories, invalid bounds,
missing rows and excessive nesting remain unresolved. Missing rows are deliberately
not collapsed to null, although the SDK returns its default null value.
The [empty-array follow-up](../../reference-data/provenance/frosty-audit-empty-boxed-arrays-2026-09-23.json)
checks all 1,299 captured bodies with boxed values. Exactly two values change to
empty arrays; no other fields change. Both point to the ordinary empty-array
sentinel and have a zero element count. The reader accepts only these validated
integer/struct forms. The [layer 4 follow-up](../../reference-data/provenance/frosty-audit-empty-boxed-arrays-layer4-2026-09-23.json)
compares all 1,818 boxed-bearing captures and validates 34 more empty defaults in nine
files: 33 float arrays and one unsigned-integer array. No other values change.
Those checks covered empty arrays only.

The [populated-array validation](../../reference-data/provenance/frosty-audit-populated-boxed-array-validation-2026-09-23.json)
compares 2,818 boxed-bearing captured bodies. Two values in
`WorldIconTrackingQueryGraph` now decode as complete count-one local structures;
the containing object also gains a propagated layout warning. The other 2,817
bodies are unchanged. Raw import/pointer fixups and ordinary EBXX rows confirm the
64-byte layout. A first-field-only read would miss the field offset and the other
structure members. The reader requires matching offset, count, hash, type and local
class reference, valid alignment and bounds. It retains layout warnings and rejects
unvalidated counts and element types. Twenty focused tests pass. This is serialized
layout evidence; native field meaning and multi-element stride remain unverified. The shared
ordinary-array reader still lacks a complete EBXD span check for nested members;
this current-corpus validation is not a malformed-input bounds guarantee.

`frosty-audit-underbarrels.py` follows all 135 underbarrel actions through secondary
selectors into parent WB parts and their exact external targets. A single-selector
match does not establish full part activation. `frosty-audit-mode-membership.py`
counts all current candidate package assignments, checks captured incoming references
for SP-only-named weapon candidates and exposes skipped duplicate GUID records.
Its package labels do not change scope dispositions.

`frosty-audit-capture-review.py` verifies a dependency collection before ingestion:
exact requested route coverage, every raw size/hash, expected archive/SDK identity
and unchanged catalog entries against the preceding collection. It writes a new
receipt and refuses to replace an existing receipt.

`frosty-audit-fields.py` inventories every GS/WB field for the 64 candidate root
pairs. `frosty-audit-registry-bindings.py` then checks exact current raw registry
anchors, named children, field hashes and values. The [binding report](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json)
records 16,889 equal scalar pairs and all other outcomes. This names serialized
fields without assuming runtime formulas. The field inventory is review input;
its pending entries do not count as completed semantic review.

The raw collector also accepts `-ResourceIdsFile <list>` for exact 16-digit
resource IDs. It uses the existing read-only SDK path, enforces the byte limit,
rejects modified entries and existing outputs, and records resource type, metadata,
record SHA1 and raw SHA-256 in `resource-status.jsonl`. The [first core-weapon
resource receipt](../../reference-data/provenance/frosty-audit-core-resources-2026-09-23.json)
captures 22 `SerializedExpressionNodeGraph` resources (367,552 bytes). The
[four-sample format review and parent validation](../../reference-data/provenance/frosty-audit-expression-resources-validation-2026-09-23.json)
confirm generic SDK resource handling and repeatable byte prefixes, but establish
no body grammar or operation meanings. The local SDK source has no located reader
for this format. A reader/specification or independently validated structural
evidence is needed. Embedded asset-like strings are not automatically active
runtime imports or evidence that named source files survive in the current catalog.

**Type identity.** A RIFF EBX file names each top-level object by a class GUID: the type
GUID's last 12 bytes plus a 4-byte layout signature. `EbxReaderRiff` looks that GUID up
in the local `BF6SDK.dll`. A layout change moves the signature and the GUID, so a stale
SDK cannot resolve the object, and the exporter writes
`<!-- Object could not be loaded (unknown type) -->`. The class name hash (for example
`Class_535682be`) does not change.

**`SharedTypeDescriptors.ebx` is the authority.** It ships with the game, is rewritten in
the runtime folder when the cache rebuilds, and holds every class size, alignment, field
offset, field type and field-name hash. Keep a copy per build; the old one cannot be
recovered after an update.

**1.4.2.5 → 1.4.3.0.** 9,470 → 9,513 type keys, 108 new: 13 signature-only moves, 69 real
layout changes, 26 new type names. 341 of 835 exported assets lost at least one object in
Frosty, including every attachment `AD_*` (`Class_535682be`) and every `Aim_*_PiP`.

**Do not patch Frosty to fall back to the type name.** For the changed layouts, the stale
SDK offsets then give plausible wrong values with no error.

**The SDK cannot be regenerated.** Generation reads the running game process, and EA
anticheat blocks it. Treat `BF6SDK.dll` as frozen.

**Use `scripts/frosty-ebx-decode.py`.** It decodes RIFF EBX with the build's own
descriptors and writes a JSON tree with the same `Class_`/`Field_` names as the XML.

- **Field encoding** (for changes to the reader): the descriptor stores `flags` as the raw
  u16 shifted right by one (`FrostySdk.EbxField.Type`). `DebugType = (flags >> 4) & 0x1F`,
  `DebugCategory = flags & 0xF`; category 4 is an array whose element type is the field's
  own `DebugType`. Read fields at `objectStart + field.offset`, not in sequence. An array
  field holds a relative offset: `resolved = fieldPos - dataStart + value`, matched against
  the EBXX table; the array is empty when the value is 0 or resolves to
  `arraysOffset + 0x10`.
- **Validation.** On 400 random 1.4.2.5 assets against Frosty XML: 234 identical, 151
  supersets (fields the SDK class drops), 14 disagreements, 0 failures. All 14 are type
  names with more than one layout; the reader follows the layout the asset declares.
  Such objects, and objects that contain them, are tagged `$layoutAmbiguous` and are
  provisional. All 27 saved PiP comparisons are provisional.
- **Hashes.** The catalog's Frosty record `sha1` is not proof of content: 142 assets in
  1.4.3.0 kept their record SHA1 but had a different raw stream. Compare a recomputed raw
  SHA-256. Compare hashes only within one format (raw EBX or XML).

The [23 September layout review](../../reference-data/provenance/frosty-layout-review-2026-09-23.json)
clarifies the warning: the release descriptor set has 9,513 unique type keys and
803 repeated name hashes. The decoder selects by the asset type key and explicit
nested `classRef`, not by name. The M4A1 chain selects indices 515 and 539 exactly.
The duplicate-name warning is conservative. Keep it: the earlier 14 XML mismatch
cases have no itemized paths/field differences in the saved summary, so their cause
was not audited individually. This review does not clear PiP or weapon layout limits.

A [bounded PiP comparison](../../reference-data/provenance/frosty-pip-review-2026-09-23.json)
re-decoded `Aim_03x50_PiP` with each build's own descriptors. Object 1 starts at
byte 104 in both captures. Its selected layout grows from 168 to 176 bytes and
adds `Field_0d48404d` at relative offset 32; the prior array field moves from
offset 32 to 40. All shared decoded values match. Exact type keys and nested
class references make this comparison reproducible. The root and three nested
`Class_f55e66db` blocks still have conservative layout warnings; their semantics
remain provisional. This is one asset pair, not proof that every PiP asset or
its gameplay behavior is unchanged.

## Export coverage (1.4.2.5)

For the later 1.4.3.0 [research inventory](../../reference-data/provenance/frosty-research-inventory-2026-09-23.json),
`scripts/frosty-research-inventory.py` checks a bounded set of gameplay-style weapon
names against raw captures and the XML overlay. All 6,659 candidates have at least
one captured representation. The pass excludes 3,040 art/charm routes by path. It
does not establish valid decoding, active multiplayer use, or recursive closure;
other asset names and categories remain outside that test. Its 23,975 unique raw
routes combine three capture directories and are not a replacement collection
manifest. The script also extracts selected timing fields from 63 weapon blueprints
without writing production data. Give it a new output filename on each run.

The bounded follow-up readers `frosty-idle-duration.py`, `frosty-zeroing-review.py`
and `frosty-spotting-review.py` are in `scripts/`. They record source hashes and
exact object/field references, and require a new output path. The spotting reader
checks all 13 captured Subsonic packages for both spotting imports and keeps fresh
hotfix expressions separate from release operands. These reports establish source
configuration; they do not supply native equations or active mode settings.

- The catalog lists 48,940 routes under `Common/Hardware/Weapons`,
  `Common/Hardware/Common/Arrays`, `Common/GameSetup/Tweakables` and
  `Common/GameSetup/GameConfigurations`; 26,086 are exported. Of the 22,854 missing,
  22,761 are art, texture, skin, VFX, audio or UI. No `_WB`, `GS_`, `Attachment_`,
  `U_PRG_`, `U_ATT_`, `WPM_`, `PD_`, array or tweakable route is missing. `Game/` and
  gadgets were not checked.
- The blanket export has 36,658 XML files; 6,978 are watchlist assets.
- Research exports added on 14 September: 1,002 attachment UI descriptors, 7 weapon UI
  metadata assets, `UIPlayerAbilityDescriptionMetadata` and the strings TSV. Export
  status files are in `_support/export-status`.
- **Not in the XML tree:** level material grids (raw EBX), localized strings (binary
  chunks), `SoldierMotionMachine` (export timed out) and native runtime equations.

## Per-build collection rules

- Use a separate directory for each verified build. Store raw EBX, XML, the matching
  `SharedTypeDescriptors.ebx`, tool and SDK identity and export results there.
- Write a `collection-manifest.json` per build that follows
  [collection-manifest.schema.json](../../reference-data/frosty/collection-manifest.schema.json).
  It separates successful, failed, skipped and missing exports. Do not present a partial
  result as a complete snapshot.
- Record the build evidence (executable hash, Frosty archive head) and tool hashes. A patch
  label alone does not verify a build.
- Follow relevant external references with a visited set. For Analyzer research,
  require a link to a modeled or proposed stat before expanding a dependency. Record missing targets,
  GUID-only references and assets that could not be decoded.
- A changed raw hash alone does not prove a stat change. Compare decoded fields with
  matching decoder versions.

| Build | Collection | Status |
|---|---|---|
| 1.4.2.5 | `builds/1.4.2.5/capture/collection/collection-manifest.json` | Partial; 23,557 raw captures, 464,499-path catalog. Archive head `4420709` differs from SDK `4414275`. |
| 1.4.3.0 | `builds/1.4.3.0/capture/collection/collection-manifest.json` | Partial; 23,709 asset rows, schema-valid, 24,565 files re-verified by hash. Archive head `4892017`. |

The 1.4.3.0 capture reuses the 1.4.2.5 route list, adds the 12 assets the update
introduced and 152 dependency routes. Animation routes, `_af/` tag collections, decal
textures and `.physics` assets are excluded on purpose. The full record is the
[1.4.3.0 update plan](../archive/FROSTY_1.4.3.0_UPDATE_PLAN.md).

## Generators and checks after an update

Run the consumer for each evidence source on the new export and compare with the dated
baseline.

| Area | Command or check | Baseline |
|---|---|---|
| Precision tables | `python scripts/frosty-precision-tables.py --root "<xml root>" --out reference-data/provenance/frosty-precision-tables-<date>.json`, then `node scripts/frosty-precision-check.mjs` | `frosty-precision-tables-2026-09-14.json` |
| Hit zones | `scripts/frosty-raw-assets.ps1`, then `scripts/frosty-hit-zones.py` | `frosty-hit-zones-2026-09-15.json` |
| Tooltips and optics | `scripts/frosty-attachment-tooltips.py` with a new dated `--optic-mapping-json` (see [UI text](UI_TEXT.md)), then `node --test scripts/optic-costs.test.mjs` | `frosty-optic-category-mapping-2026-09-15.json` |
| Optic render FOV and iron-sight zoom | Method in [Attachments](ATTACHMENTS.md#optic-render-fov-and-zoom) | `frosty-optic-render-fov-2026-09-16.json` |
| Weapon display names | [UI text](UI_TEXT.md) | `frosty-weapon-display-names-2026-09-13.json` |
| Handling, barrel ADS, sniper brakes | `scripts/frosty-attachment-handling.py`, `scripts/frosty-barrel-ads.py`, `scripts/frosty-sniper-brakes.py` | The matching `*-generated.json` reports |
| Slots and prerequisites | `scripts/frosty-attachment-compatibility.py` ([maintenance command](../../MAINTENANCE.md#regenerate-attachment-modifiers)) | `frosty-attachment-compatibility.json` |
| Arrays, damage, draw time, spread | `node --test scripts/source-arrays.test.mjs scripts/damage.test.mjs scripts/draw-time.test.mjs scripts/spread-distribution.test.mjs` | `frosty-array-review-2026-09-09.json`, `frosty-damage-curve-review-2026-09-13.json`, `frosty-draw-time-2026-09-09.json` |
| Site ammo effect audit | `python scripts/frosty-site-ammo-tier-audit.py --report-dir "<external audit directory>" --out "<new receipt path>"` | `frosty-site-ammo-effects-2026-09-23.json`; research outputs only |
| Watchlist | `python scripts/frosty-watchlist-merge.py --datamining "<datamining root>"` (dry run; add `--write`) | `reference-data/frosty/asset-watchlist.json` |

### Recorded primary scalar scan

`python scripts/frosty-primary-field-scan.py --help` describes a read-only scan
of recorded route/object pairs with explicit build identity and scalar paths.
It verifies descriptor/raw hashes, float32 types, offsets and decoded values.
`--plan` also accepts per-record build identities, Boolean fields, expected values
and recorded offsets/bytes; keep each build in a separate external output.
`--heat-site-mapping` adds conditional RPM/magazine arithmetic; labels require
independent naming evidence. Use a new external `--out`; existing files are refused.
[L36](../../reference-data/provenance/frosty-2026-09-24-L36-primary-heat-scope.json)
records the exact arguments and comparison with the earlier scan.

### Research reproduction methods

- `frosty-audit-registry-bindings.py --manifest`: extends the registry audit with
  declared owner anchors, raw scalar offsets and bounded linked-group checks;
  `frosty-registry-association.py` contains that mode. Each receipt pins its manifest.
- `frosty-selected-chain-check.py`: checks declared object paths, selected imports
  and raw bytes against exact build/hash identities; `localized_text` links a decoded
  StringId to a hash-pinned TSV entry. The external plan records
  expected source facts; unresolved runtime and specialized checks remain explicit.
- `frosty-reference.py`: `vectors` compares declared Boolean fields in the
  read-only ledger; `controls` raw-checks the recorded bolt controls;
  `trace-array` verifies imported file/object GUIDs at raw array offsets.
  L1 and L12 receipts give exact build arguments and external comparison reports.
- `frosty-projectile-lifetime.py`: verifies exact projectile GUIDs, typed raw
  lifetimes and conditional site reachability; its Node helper calls the current
  site functions unchanged. L22/L25 inputs and comparisons remain external.

- `frosty-build-compare.py --manifest --out`: rehashes pinned raw files, catalogs
  and descriptors for two recorded builds, then compares the listed bytes.
  It checks catalog Heads and makes no whole-build or runtime claim.

Use `python scripts/<name> --help` and the receipt arguments. Outputs require a
new external `--out` or `--report-dir`; existing output paths are refused.
These checks reproduce configured source facts, not native runtime behavior.
