# Frosty tools and exports

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Game update guide](../GAME_UPDATE_GUIDE.md)

How to export and decode BF6 game data safely. The step order for a game update is in
the [game update guide](../GAME_UPDATE_GUIDE.md); this page is the tool reference.

## Locations

| Item | Path |
|---|---|
| Datamining root | `C:\Users\royal\Documents\BF6 Datamining` |
| Frosty tools root | `FrostyToolsuite-battlefield6` (no second nested folder) |
| Runtime (FrostyCmd, cache, profiles) | `FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final` |
| XML export per build | `Frosty Exports\<build>` (`1.4.2.5` is the retained baseline; never overwrite it) |
| 1.4.3.0 overlay root | `Frosty Exports\1.4.3.0\xml-overlay`; routes Frosty could not decode are listed in `xml-overlay-stale.txt` |
| English strings | `Frosty Exports\<build>\Common\Localization\Languages\fs_us_loc.strings.tsv` |
| Raw captures per build | `research-<build>\...\collection\collection-manifest.json` |
| Catalogs | `ebx_manifest.txt`, `ebx_manifest.csv`, `ebx_directories.txt` in the datamining root |

From the Analyzer repository, pass `--root "../BF6 Datamining/Frosty Exports/<build>"` to
tools that read the XML tree. Older reports keep old absolute paths; substitute the new
root without changing recorded hashes. More detail:
[Data sources](../DATA_SOURCES.md#local-frosty-export-location).

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

1. **Build check.** The 1.4.2.5 install has `bf6.exe` dated 5 September 2026. A later
   date means the game updated, and exports then show the new build.
2. **Cache.** After an update, rename `Caches\bf6.cache` (for example
   `bf6-1.4.2.5.cache`) before the first export. Frosty only patches a cache whose head
   number differs, and that path is not tested for BF6. The first export then builds a
   full cache (880 MB for 1.4.2.5).
3. **Export** with `export-ebx-list` into a new `Frosty Exports\<build>` folder. A
   previous build cannot be exported again after the game files update.
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
- **Never overwrite a previous build's export tree.**
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

## SDK and decoding

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

## Export coverage (1.4.2.5)

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
- Follow external references recursively with a visited set. Record missing targets,
  GUID-only references and assets that could not be decoded.
- A changed raw hash alone does not prove a stat change. Compare decoded fields with
  matching decoder versions.

| Build | Collection | Status |
|---|---|---|
| 1.4.2.5 | `research-1.4.2.5/pre-update/collection/collection-manifest.json` | Partial; 23,557 raw captures, 464,499-path catalog. Archive head `4420709` differs from SDK `4414275`. |
| 1.4.3.0 | `research-1.4.3.0/post-update/collection/collection-manifest.json` | Partial; 23,709 asset rows, schema-valid, 24,565 files re-verified by hash. Archive head `4892017`. |

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
| Watchlist | `python scripts/frosty-watchlist-merge.py --datamining "<datamining root>"` (dry run; add `--write`) | `reference-data/frosty/asset-watchlist.json` |
