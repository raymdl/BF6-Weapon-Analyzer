# Weapon and attachment UI text from Frosty

[Documentation index](../README.md) · [Data sources](../DATA_SOURCES.md) · [Maintenance](../../MAINTENANCE.md)

This guide explains how to resolve English weapon display names and attachment
labels and descriptions from game data. The 13 September 2026 results are in
[frosty-weapon-display-names-2026-09-13.json](../../reference-data/provenance/frosty-weapon-display-names-2026-09-13.json)
and [frosty-attachment-descriptions-2026-09-13.json](../../reference-data/provenance/frosty-attachment-descriptions-2026-09-13.json).

## Weapon display-name result

- All 63 site weapons link from their Frosty internal name (for example `HK433`) to
  the English display name the game shows (M433).
- Three hand-transcribed site names were wrong and now use the game spelling:
  TR7 → **TR-7**, SOR-556 MK2 → **SOR-556 Mk2**, VZ. 61 → **vz. 61**.
- The other 60 site names already matched.
- Internal name `KSG`, which is not on the site, is the **KSG-12**.

## Why the XML export is not enough

1. **The text is not in EBX.** The English language asset
   `Common/Localization/Languages/fs_us_loc` is a small EBX record with two chunk GUIDs.
   The strings are in those binary chunks, which an XML export does not include.
2. **The name links are not in the XML tree.** The string ids for weapon names are
   stored in `UIWeaponAbilityMetaData` assets, which the 36,658-file XML export does
   not contain. A search of the XML tree for the ids, as hex, decimal, or hashed text,
   finds nothing.
3. **BF6 field names are hashed.** Tools that look up fields by name (`StringId`,
   `StringHash`, `LocalizedStringReference`, as in `LocalizedStringPlugin`) find
   nothing in BF6. Read fields by type and structure instead.

## Tools

FrostyCmd lives in the local FrostyToolsuite fork, not in this repository:
`C:\Downloads\FrostyToolsuite-battlefield6\FrostyToolsuite-battlefield6\FrostyEditor\bin\Release\Final\FrostyCmd.exe`.

[frostycmd-string-tools-2026-09-13.patch](../../reference-data/provenance/frostycmd-string-tools-2026-09-13.patch)
adds two commands to `FrostyCmd/Program.cs`. `export-ebx` does not change.
The unpatched file is kept beside it as `Program.cs.bak-2026-09-13`.

Build only FrostyCmd, so the existing FrostySdk and FrostyHash builds stay as they are.
`SolutionDir` must point to `FrostyEditor\`, because FrostyHash writes its output there:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" `
  "<toolsuite>\FrostyCmd\FrostyCmd.csproj" /p:Configuration="Release - Final" /p:Platform=x64 `
  /p:BuildProjectReferences=false /p:SolutionDir="<toolsuite>\FrostyEditor\\" /t:Build
```

| Command | Purpose |
|---|---|
| `FrostyCmd export-ebx <profile> <game-path> <asset> <output-xml>` | Export one EBX asset as XML (existing command). |
| `FrostyCmd export-strings <profile> <game-path> <language-asset> <output-tsv>` | Decode a localization language asset to `id<TAB>text` lines. |
| `FrostyCmd scan-string-usage <profile> <game-path> <ids-file> <output-tsv> [prefix ...]` | Find where string ids are used in EBX assets under the path prefixes. |

**Safety rules**

- Run only one FrostyCmd at a time. After each run, check `Get-Process FrostyCmd` and
  stop any leftover process.
- `scan-string-usage` always skips assets whose path contains `levels/` or
  `materialgrid`, because reading level material grids has exhausted memory before.
  It logs progress every 500 assets and stops with partial results above 12 GB.
- Always give the scan path prefixes. Do not scan the whole game.

## Procedure

Run all commands from the FrostyCmd `Final` folder, with profile `bf6` and game path
`C:\Program Files\EA Games\Battlefield 6`. Write outputs outside the repository.

### 1. Export the English strings

```powershell
.\FrostyCmd.exe export-strings bf6 "C:\Program Files\EA Games\Battlefield 6" `
  "Common/Localization/Languages/fs_us_loc" "<out>\fs_us_strings.tsv"
```

Expected: about 108,548 lines of `XXXXXXXX<TAB>text`. Tabs, carriage returns,
line feeds and backslashes in text are written as `\t`, `\r`, `\n` and `\\`.

How `export-strings` decodes the asset (same logic as `FsLocalizationPlugin.AddResource`):

1. Read the language asset's root object and load every `Guid` property as a chunk.
   The two field names are hashed, so they are found by type.
2. The chunk that starts with magic `0x00039000` is the string chunk. The other chunk
   is the histogram.
3. Histogram chunk: skip a `uint`, read `size` (`uint`), skip a `uint`, then read
   `size / 2` values of type `ushort`.
4. String chunk: read magic, size, one skipped `uint`, `dataOffset` and
   `stringsOffset`. From position `dataOffset + 8` to `stringsOffset + 8`, read pairs
   of `uint` id and `uint` offset.
5. For each pair, read a null-terminated byte string at `stringsOffset + offset + 8`.
   A byte below `0x80` is the character itself. For a byte `b` of `0x80` or above,
   read `tmp = histogram[b]`. If `tmp` is `0x80` or above, it is the character.
   Otherwise read the next byte `b2`; the character is `histogram[(b2 − 0x80) + (tmp << 7)]`.

### 2. Find which assets use the name ids (only needed after a large update)

Make an ids file with one 8-digit hex id per line: the ids of the strings whose text
equals each site weapon name. Add one control id that must be found, for example the
hash of `ID_OPTIONS_HITSOUND_LABEL`, which is used in
`Common/GameSetup/Options/Audio/OptionHitIndicatorSound`.

```powershell
.\FrostyCmd.exe scan-string-usage bf6 "C:\Program Files\EA Games\Battlefield 6" `
  "<out>\scan-ids.txt" "<out>\scan-hits.tsv" Common/UI Common/GameSetup Common/Hardware/Weapons
```

For each object, the scan walks public properties, lists and `FrostySdk.Ebx` structs
up to depth 8, without following pointers. It records a hit when a `CString` hashes to
a target id (`cstring-hash`), or when a `uint` or `int` field equals a target id.

On 13 September 2026: 70,678 assets, 536 unreadable, memory steady at about 3.5 GB,
about 7 minutes. The control id was found. 63 of the 64 name ids were found, all in
the `UIWeaponAbilityMetaData` assets.

### 3. Export the weapon UI metadata assets

```text
Common/UI/MetaData/UIWeaponAbilityMetaData
Common/UI/Static/Metadata/S1/UIWeaponAbilityMetaData_S1B1
Common/UI/Static/Metadata/S1/UIWeaponAbilityMetaData_S1B2
Common/UI/Static/Metadata/S2/UIWeaponAbilityMetaData_S2B1
Common/UI/Static/Metadata/S2/UIWeaponAbilityMetaData_S2B2
Common/UI/Static/Metadata/S3/UIWeaponAbilityMetaData_S3B1
Common/UI/Static/Metadata/S4/UIWeaponAbilityMetaData_S4B1
```

Export each one with `export-ebx`, one at a time. Newer seasons can add assets, so
check the manifest for more `UIWeaponAbilityMetaData_*` names.

### 4. Parse the links

In each exported XML file:

1. Every `Class_593f6146` object is one weapon record.
   - `Field_55aded8d`: a text label. It is **not always** the internal name
     (`SCAR-L`, `Tavor 7`, `ACE 32`, `DP-12`, `Mini Fix`, `GrotC`).
   - `Field_ebe3976f` and `Field_53078b86`: package image links such as
     `T_UI_SVCh_PKG_Factory`. The part between `T_UI_` and `_PKG` is the internal name.
   - `Field_fd698f51`: a pointer `[Class_fbe1d3bc] <guid>`.
2. Find the `Class_fbe1d3bc` object with that GUID. Its `Field_3d34898a` holds the name
   string id as hex (for example `0xa77ee5e5`).
3. Look up the id (uppercase, 8 digits) in `fs_us_strings.tsv`. That text is the display name.
4. Link the record to a site weapon. Match the image internal name to `internalId` in
   [frosty-weapon-identities.json](../../reference-data/provenance/frosty-weapon-identities.json),
   ignoring case. If a record has no image link, match its label with punctuation and
   spaces removed (`DP-12` → `DP12`, `Mini Fix` → `MiniFix`).
5. Check that each site weapon has exactly one game name.

These `Class_` and `Field_` names are hashes from the current BF6 SDK. After an SDK
change, find the same structure again: a record with a text label, package image
links and a pointer to an object that holds one 32-bit id.

### 5. Apply and check

1. Update `name` in `data/weapons.json` and `siteName` in the identity map together.
   `scripts/frosty-configuration.py` requires them to be equal.
2. Do not rename screenshot folders. The audit scripts compare names with case and
   punctuation removed.
3. Run `node scripts/validate-data.mjs` and the test suite.
4. Write a dated provenance record with the string ids, game names, source assets
   and export hashes.

## String id hash

String ids are hashes of text keys: a djb2-style hash with seed `0xFFFFFFFF`,
computed on 32-bit unsigned values as `result = char + 33 × result` for each character.

```js
const hash = key => {
  let r = 0xFFFFFFFF;
  for (const ch of key) r = (ch.charCodeAt(0) + Math.imul(33, r)) >>> 0;
  return r.toString(16).toUpperCase().padStart(8, '0');
};
```

Of the 1,231 `ID_…` keys in the XML export, 1,157 hash to ids in the string table.
Weapon name keys found this way:

| Key pattern | Weapons |
|---|---|
| `ID_ABILITY_<internal name>` | 53 weapons, for example `ID_ABILITY_HK433` → M433 |
| `ID_ABILITY_MP5` | MP5MLI (PW5A3) |
| `ID_ABILITY_MSBSGROT` | MSBSGROTB (GRT-BC) |
| `ID_WEAPON_<internal name>` | EF88, VSSM, BREN3 (BROD 3) |
| `ID_WEAPON_HTI` | DesertTechHTI (Interdictor) |

Key guessing did not find L115A3, MSBSGROTCPS, RagingHunter or RPK74M. Use the
metadata link (step 4) for all weapons; key patterns are supporting evidence only.

## Exceptions

| Case | Handling |
|---|---|
| GRT-CPS (`MSBSGROTCPS`) | Record label `GrotC`, no image link. Its string id `A7711B37` resolves to GRT-CPS. |
| AK4D | Two strings have the text AK4D (`8F929007`, `B77F06A7`). The metadata uses `B77F06A7`. |
| `KSG` | Not on the site. Display name KSG-12. |
| `SCAR-SC .300 BLK`, `MP7A2 SP SUPPRESSED` | Variant records of SOR-300SC and PW7A2. Not separate site weapons. |
| Sym and Companion names | They use the old spellings. The recorded Sym `displayname` values stay unchanged as records of what Sym published. |

## Weapon display-name limits

- This covers English only. Other languages use other `fs_*_loc` assets.
- The scan skipped 536 unreadable assets. None of the missing links needed them.
- Hashed class and field names can change with a new SDK; see step 4.

## Attachment labels and descriptions

The same English localization table resolves UI text in the 1,003 `AD_*` assets
listed under `Common/UI/Static/Metadata/Attachments/` in the local EBX manifest.
All 1,003 exported without error. The result contains 990 resolved labels and 997
resolved descriptions; 984 assets have both. There are 131 distinct resolved labels
and 211 distinct resolved descriptions. The JSON retains each source asset path,
XML SHA-256, localization ID, text, and any error. These are UI descriptions, not
proof that the stated effects match current weapon mechanics. The manifest can
include unused assets, so an asset's presence does not show that it is selectable.

An attachment `AD_*` EBX record has two pointers to `Class_fbe1d3bc` objects.
`Field_33a358a7` points to its label and `Field_490f0dd0` points to its
description. Each target object's `Field_3d34898a` is the localization ID to look
up in `fs_us_strings.tsv`.

| Asset under `Common/UI/Static/Metadata/Attachments/` | Label | Description |
|---|---|---|
| `Shared/AD_AK126H64` | `619FA0CA` — Vertical | `12DEAFDF` — Significantly reduces recoil at the cost of movement speed and accuracy while aiming down sights (ADS). |
| `Shared/AD_Tango_Vertical` | `619FA0CA` — Vertical | `015B7D0A` — Moderately reduces recoil at the cost of aim down sights (ADS) accuracy while moving. |
| `HK433/AD_HK433_BRL_ExtendedBarrel` | `F041C4F7` — Extended | `1A84E26B` — Long barrel that increases projectile velocity. |

Two assets can have the same short label and different descriptions. Keep the
asset path and string IDs when matching one to a site attachment. The first
example was in the prior XML export. The latter two were freshly exported from
the installed game; their SHA-256 hashes are
`740C194711F725488223884B145D984D0A270D7F985B94CA32620CEFF0D7C3B9` and
`7F7E3DD5B13C05AB5B4E8104D788C1ED8E89F94BB3AABE205BBFF626F32E2C7C`.
The English string table SHA-256 is
`a90186f7ce5f6dea3b554b9ec984034231166b75e49798d6cd3ccfdd6b5db6d9`.
The batch XML and status log are local scratch files under
`outputs/frosty-description-probe/batch/`.

The local FrostyCmd `Program.cs` has an `export-ebx-list` command. It reads one
asset path per line and writes XML plus `export-status.tsv` under an output
directory, loading the game only once. [frosty-descriptions.py](../../scripts/frosty-descriptions.py)
resolves both pointers against `fs_us_strings.tsv`. To repeat after an update,
refresh the manifest and English strings, select
`Common/UI/Static/Metadata/Attachments/**/AD_*`, batch export them, run the
resolver, and inspect its error count. Run FrostyCmd offline, one process at a
time. Compare each asset against the site's attachment identity before using its
text in the site.

Thirteen assets have a null label pointer. Six have a description ID absent
from the English table, across five distinct IDs: `1C029CC8`, `BC1F219E`,
`A70D89F6`, `2897A9DF`, and `FC443C65`. All 1,003 description pointers are
present. No text was invented for the unresolved fields.

## Current site mapping

All 3,012 non-optic site choices have reviewed Frosty source identities. The runtime tooltip file contains descriptions for 2,967 choices: 2,952 use resolved Frosty English text and 15 use user-approved game-panel text. The other 45 choices remain deferred and carry `description-review-required` in the full mapping report. The six original Frosty records still have missing English strings; applying a panel tooltip does not recover those strings or replace their pointers.

All 350 generic optic choices map to 1,927 individual Frosty sight records for the 63 site weapons. Fixed scopes remain Standard Optic. Variable Low and Variable High group the 20- and 25-point variable optics; these names do not define a magnification threshold. All member costs match their site category. Iron Sights now has a source-backed tooltip on all 63 weapons, bringing the total to 3,030 tooltips. Other generic optic categories keep their individual member descriptions in the report only.

Iron-sight defaults are user-selected for M16A4 (Classic) and UMG-40 (basic aperture); their Modern and CQC alternatives remain in the report but do not supply the tooltip. L115 and Interdictor use their no-scope-glint description. Four missing iron UI links use the same weapon's `AD_<weapon>_Sight` descriptor. M121 A2's descriptor lives under `Common/Hardware/Weapons/MG/MG5/AD_MG5_IronSights`, outside the UI batch; its original description pointer resolves to `0BB6AC0B`, and its XML hash is retained in both reports. Unresolved UI labels still use exact IronSights names and bound selectors for category classification. Tooltip text is displayed directly, without an “In-game description:” prefix.

These links establish source identity and UI text. They do not prove live availability or engine behavior.

Fifteen user-named panels supply approved per-choice tooltips. The evidence is in `panelLinkageInvestigation` in the identity follow-up report, with saved captures, hashes, AAM record GUIDs, original descriptor pointers, and missing string IDs. Matching English text in other descriptors is comparison evidence only. The original five description IDs remain absent from the English export. RPKM's separate AAM title resolves to “30rnd Fast Mag,” matching its panel. DRS-IAR and DB-12 have TOP hardware and panels but RGT names in their ANPEQ16B AAM records. DB-12 also has a separate RGT hardware record, so the AAM name must not simply be treated as a typo for TOP.

| Captured selection | Weapons receiving panel text |
|---|---|
| Taclight - Hipfire | M433, B36A4, M277, M417 A2 |
| Taclight - Aimed | VCR-2, GRT-BC, BROD 3, EF88, ES 5.7, M45A1 |
| 50 MW Violet | GRT-BC, L110, DRS-IAR, DB-12 |
| 30 Fast magazine | RPKM |

### Files

- `data/attachment-tooltips.json`: compact runtime descriptions and per-weapon selection links.
- `reference-data/provenance/frosty-site-attachment-mapping-2026-09-13.json`: every current site choice, reviewed hardware paths, progression and attachment GUIDs, root-listed ability branches, selectors, UI links, review flags, and input hashes.
- `reference-data/provenance/frosty-optic-category-mapping-2026-09-13.json`: category members, source labels, available descriptions, classification evidence, and hashes.
- `reference-data/provenance/frosty-attachment-identity-followup-2026-09-13.json`: additional identities and direct screenshot reviews, including exact image hashes and text differences.

### Resolution rules

The mapper starts with the reviewed site-to-hardware identities and checks them against the current source graph. It then tries the full AAM name, an unambiguous name without the slot code, rail-side variants, and exact weapon descriptor names. Matching is case-insensitive. Scoped descriptor prefixes such as `MZL_FlashComp` can be removed while retaining the exact hardware model. Reviewed grips that omit `BTM` retain their complete model suffix, including variants such as `BOLT`.

Shared UI records require the exact hardware model and unanimous English text across their rail variants. A peer description requires both the same model and the same complete bound selector set. This also applies to ammunition, so recoil and non-recoil subsonic variants remain separate. An ambiguous or incomplete direct link cannot be hidden by a convenient peer.

Explicit screenshot reviews can resolve missing links or conflicting UI candidates. Regeneration checks the screenshot hash, original candidate set, and expected source text. If source text differs from the saved panel, both texts and the reason remain in the review. All mapped source alternatives must resolve; a partial source set cannot supply a tooltip.

The separately approved panel-text pass requires an unresolved description, one matching hardware source, the unchanged original UI link, and the saved image hash. It writes `screenshot:<weapon>:<slot>:<attachment>` runtime keys and marks the choice `screenshot-verified`. These keys are not Frosty localization IDs. Original source records retain their missing-description status. No panel text is propagated to peer weapons. Captures remain in the ignored local screenshot library; the published evidence retains their paths, hashes, and transcription.

### Corrections established by this audit

- The old audit reversed CQB and Lightened suppressor identities. `ImprvdSuppressor01` is CQB; `ImprvdSuppressor02` is Lightened. The SV-98 and Interdictor Lightened identities are included.
- P18, ES 5.7, M45A1, GGH-22, and VZ.61 panels show Single-Port Brake at 10 points. Their sole Frosty brake selects `Brake2_W10`. The site retains the displayed name, uses 10 points, and removes the generic sway penalty. The old screenshot audit contains an incorrect 5-point cost and generic Simple-brake description.
- QBZ-192's saved ergonomics panel and source ability contain None, Match Trigger, and Rail Cover. The unsupported site Aftermarket Buffer was removed; shared links discard that unavailable selection.
- GRT-BC's panel shows Burst Mode with 3-round replacement bursts. Its old audit filename and description incorrectly indicate Burst Training and 2-round bursts. The site label is corrected without changing its ID or source effects. SL9 uses the separately verified 2-round replacement description.
- SGX Classic Vertical uses the screenshot's “Greatly reduces recoil” description, which selects `AD_KABroomstick` from the conflicting AAM candidates.
- The M4A1 hipfire taclight uses the automatic hip-fire description from `AD_SF300_LeftRail`.
- Current VSSM ASM text says “Alternate barrel”; its saved panel says “Standard barrel.” Current M1014 compensator text adds a spotting sentence absent from its saved panel. Both differences are retained in the source review; runtime descriptions use the current Frosty text.

### Regeneration and verification

```powershell
python scripts/frosty-attachment-tooltips.py outputs/frosty-description-probe/aam data/attachment-tooltips.json --frosty-root 'C:/Users/royal/Documents/BF6 Datamining/Frosty' --mapping-json reference-data/provenance/frosty-site-attachment-mapping-2026-09-13.json --optic-mapping-json reference-data/provenance/frosty-optic-category-mapping-2026-09-13.json
python scripts/frosty-attachment-tooltips.test.py
node --test scripts/attachment-effects.test.mjs
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
```

The coverage check compares the report to the actual menu availability functions, verifies every runtime description reference and deferred choice, checks current site/review/descriptor hashes, and confirms all optic category members. Current totals are 2,967 described non-optic choices, 63 iron-sight tooltips, 45 deferred non-optic choices, and 350 linked optic categories. Mapper tests cover panel-source and image changes, empty text, original-pointer preservation, prevention of cross-weapon propagation, and default iron-sight selection.

### Weapon description tooltips

All 63 weapon records in `data/weapons.json` include `description`. Weapon selection buttons and comparison heading names expose this text through `title` and `aria-description`. The text does not affect simulation values.

The [weapon description evidence](../../reference-data/provenance/weapon-descriptions-2026-09-13.json) retains metadata pointers, source hashes, and screenshot evidence. There are 61 resolved Frosty descriptions and two screenshot transcriptions (M2010 ESR and SV-98). Their original English IDs, `2DB86D4C` and `E8EA1B59`, remain absent from the export. Preserve the source distinction when refreshing weapon data.
