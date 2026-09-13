# Weapon display names from Frosty

[Documentation index](README.md) · [Data sources](DATA_SOURCES.md) · [Maintenance](../MAINTENANCE.md)

This guide explains how the site gets each weapon's in-game display name from game
data, and how to repeat the work after a game update. The result for 13 September 2026
is in [frosty-weapon-display-names-2026-09-13.json](../reference-data/provenance/frosty-weapon-display-names-2026-09-13.json).

## Result

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

[frostycmd-string-tools-2026-09-13.patch](../reference-data/provenance/frostycmd-string-tools-2026-09-13.patch)
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
   [frosty-weapon-identities.json](../reference-data/provenance/frosty-weapon-identities.json),
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

## Limits

- This covers English only. Other languages use other `fs_*_loc` assets.
- The scan skipped 536 unreadable assets. None of the missing links needed them.
- Hashed class and field names can change with a new SDK; see step 4.
