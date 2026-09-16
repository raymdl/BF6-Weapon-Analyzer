# UI text: names, descriptions and labels

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Tools](TOOLS.md) · [Data sources](../DATA_SOURCES.md)

How the site resolves English weapon names, attachment and optic names, labels and
descriptions from BF6 game data, and what the current site mapping contains.
Snapshot: 1.4.2.5 export (13–14 September 2026), strings rechecked on 1.4.3.0.

Results:

- [frosty-weapon-display-names-2026-09-13.json](../../reference-data/provenance/frosty-weapon-display-names-2026-09-13.json)
- [frosty-attachment-descriptions-2026-09-13.json](../../reference-data/provenance/frosty-attachment-descriptions-2026-09-13.json)
- [frosty-optic-render-fov-2026-09-16.json](../../reference-data/provenance/frosty-optic-render-fov-2026-09-16.json) `opticNames` (in-game names of 42 optics)
- [weapon-descriptions-2026-09-13.json](../../reference-data/provenance/weapon-descriptions-2026-09-13.json)

## Why the XML export is not enough

1. **The text is not in EBX.** `Common/Localization/Languages/fs_us_loc` is a small EBX
   record with two chunk GUIDs. The strings are in those binary chunks, which the XML
   export does not include. Export them with `FrostyCmd export-strings`
   ([Tools](TOOLS.md#frostycmd)).
2. **The weapon name links are not in the blanket XML tree.** They are in
   `UIWeaponAbilityMetaData` assets, which must be exported separately.
3. **Field names are hashed.** Tools that look up fields by name (`StringId`,
   `StringHash`, `LocalizedStringReference`) find nothing in BF6. Read fields by type
   and structure.

## The strings table

`export-strings` writes about 109,000 lines of `XXXXXXXX<TAB>text`. Tabs, carriage
returns, line feeds and backslashes in text are written as `\t`, `\r`, `\n` and `\\`.
This is English only; other languages use other `fs_*_loc` assets.

How the asset is decoded (same logic as `FsLocalizationPlugin.AddResource`):

1. Load every `Guid` property of the language asset's root object as a chunk. The two
   field names are hashed, so find them by type.
2. The chunk that starts with magic `0x00039000` is the string chunk. The other chunk is
   the histogram.
3. Histogram chunk: skip a `uint`, read `size` (`uint`), skip a `uint`, then read
   `size / 2` values of type `ushort`.
4. String chunk: read magic, size, one skipped `uint`, `dataOffset` and `stringsOffset`.
   From `dataOffset + 8` to `stringsOffset + 8`, read pairs of `uint` id and `uint` offset.
5. For each pair, read a null-terminated byte string at `stringsOffset + offset + 8`.
   A byte below `0x80` is the character. For a byte `b` of `0x80` or above, read
   `tmp = histogram[b]`. If `tmp` is `0x80` or above, it is the character. Otherwise read
   the next byte `b2`; the character is `histogram[(b2 − 0x80) + (tmp << 7)]`.

### String id hash

String ids are hashes of text keys: djb2 with seed `0xFFFFFFFF`, on 32-bit unsigned
values, `result = char + 33 × result` for each character.

```js
const hash = key => {
  let r = 0xFFFFFFFF;
  for (const ch of key) r = (ch.charCodeAt(0) + Math.imul(33, r)) >>> 0;
  return r.toString(16).toUpperCase().padStart(8, '0');
};
```

Of the 1,231 `ID_…` keys in the XML export, 1,157 hash to ids in the table. Weapon name
keys: `ID_ABILITY_<internal name>` (53 weapons), `ID_ABILITY_MP5` (PW5A3),
`ID_ABILITY_MSBSGROT` (GRT-BC), `ID_WEAPON_<internal name>` (EF88, VSSM, BROD 3) and
`ID_WEAPON_HTI` (Interdictor). Key guessing does not find L115A3, MSBSGROTCPS,
RagingHunter or RPK74M, so use the metadata links below; key patterns are supporting
evidence only.

Other hashes: delegate argument names use djb2-xor (seed 5381, case-sensitive; all 14
named arguments agree). `Field_`/`Class_` names use a different, unknown hash
([Field map](FIELD_MAP.md)).

## Weapon names

### Export the weapon UI metadata

```text
Common/UI/MetaData/UIWeaponAbilityMetaData
Common/UI/Static/Metadata/S1/UIWeaponAbilityMetaData_S1B1
Common/UI/Static/Metadata/S1/UIWeaponAbilityMetaData_S1B2
Common/UI/Static/Metadata/S2/UIWeaponAbilityMetaData_S2B1
Common/UI/Static/Metadata/S2/UIWeaponAbilityMetaData_S2B2
Common/UI/Static/Metadata/S3/UIWeaponAbilityMetaData_S3B1
Common/UI/Static/Metadata/S3/UIWeaponAbilityMetaData_S3B2
Common/UI/Static/Metadata/S3/UIWeaponAbilityMetaData_S3B3
Common/UI/Static/Metadata/S4/UIWeaponAbilityMetaData_S4B1
```

Newer seasons can add assets; check the manifest for more `UIWeaponAbilityMetaData_*`
names. `S3B2` is an empty container in 1.4.2.5.

To find the assets again after a large update, run `scan-string-usage` with the ids of
the strings whose text equals each site weapon name, plus a control id (for example the
hash of `ID_OPTIONS_HITSOUND_LABEL`, used in
`Common/GameSetup/Options/Audio/OptionHitIndicatorSound`). The scan walks public
properties, lists and structs to depth 8 without following pointers, and records a hit
when a `CString` hashes to a target id or an integer field equals it. On 13 September:
70,678 assets, 536 unreadable, about 3.5 GB and 7 minutes; 63 of 64 name ids were found,
all in `UIWeaponAbilityMetaData`.

### Parse the links

1. Every `Class_593f6146` object is one weapon record.
   - `Field_55aded8d`: a text label. It is **not always** the internal name (`SCAR-L`,
     `Tavor 7`, `ACE 32`, `DP-12`, `Mini Fix`, `GrotC`).
   - `Field_ebe3976f`, `Field_53078b86`: package image links such as
     `T_UI_SVCh_PKG_Factory`. The part between `T_UI_` and `_PKG` is the internal name.
   - `Field_fd698f51`: pointer to a `Class_fbe1d3bc` object.
2. That object's `Field_3d34898a` holds the name string id (for example `0xa77ee5e5`).
3. Look up the id (uppercase, 8 digits) in the strings table.
4. Link the record to a site weapon: match the image internal name to `internalId` in
   [frosty-weapon-identities.json](../../reference-data/provenance/frosty-weapon-identities.json),
   ignoring case. Without an image link, match the label with punctuation and spaces
   removed (`DP-12` → `DP12`).
5. Check that each site weapon has exactly one game name.

After an SDK change, find the same structure again: a record with a text label, package
image links and a pointer to an object that holds one 32-bit id.

### Apply and check

1. Update `name` in `data/weapons.json` and `siteName` in the identity map together;
   `scripts/frosty-configuration.py` requires them to be equal.
2. Do not rename screenshot folders. The audit scripts compare names without case and
   punctuation.
3. Run `node scripts/validate-data.mjs` and the tests.
4. Write a dated provenance record with the ids, names, source assets and hashes.

### Result

- All 63 site weapons link to their in-game name (for example `HK433` → M433).
- Three site names were corrected to the game spelling: **TR-7**, **SOR-556 Mk2**,
  **vz. 61**.
- `KSG` is the **KSG-12** and is not on the site.

| Case | Handling |
|---|---|
| GRT-CPS (`MSBSGROTCPS`) | Label `GrotC`, no image link, in `S2B1`. Id `A7711B37` resolves to GRT-CPS. |
| AK4D | Two strings read AK4D (`8F929007`, `B77F06A7`); the metadata uses `B77F06A7`. |
| `SCAR-SC .300 BLK`, `MP7A2 SP SUPPRESSED` | Variant records of SOR-300SC and PW7A2, not separate weapons. |
| Mini Scout, DB-12, GGH-22, M357 Trait | Two records each. |
| Sym and Companion names | They use old spellings. Recorded Sym `displayname` values stay unchanged. |

## Weapon descriptions and role tags

Each weapon record has a description pointer (`Field_490f0dd0`), a category pointer
(`Field_f8c63ce7`), three role tags (`Field_8c7f991f`) and a numerical stat block.

**Descriptions.** 61 of 63 resolve. Two ids are missing from the English table; the
game panels (13 September) show text that exists under other ids:

| Weapon | Record pointer | Text id | Text | Site sweet spot |
|---|---|---|---|---|
| M2010 ESR | `2DB86D4C` | `5E0EAEEC` | 75m-100m, "relatively low base magazine capacity" | 75-100 m |
| SV-98 | `E8EA1B59` | `97529B79` | 54m-75m, "legacy 7.62x54mmR" | 54-75 m |

No metadata record uses either text id; the match comes from the caliber, magazine note
and range. The other sniper descriptions agree with `deriveSweetSpot`: PSR 90m-120m
(`84FCD536`), L115 100m-133m (`7A9C24A9`), Interdictor 120m-150m (`A89AE617`).

All 63 records in `data/weapons.json` include `description`, shown in weapon button and
comparison heading tooltips. Keep the source distinction (61 Frosty, 2 screenshot
transcriptions) when refreshing.

**Role tags.** [data/weapon-role-tags.json](../../data/weapon-role-tags.json) keeps
style, range and firing tags; reference data only. A record with a package image is
primary. PW7A2's base record says Mid Range (the panel agrees); its SP Suppressed record
says Close Range. Mini Scout: `UIWeaponAbilityMetaData` says Mid Range and `S1B1` says
Long Range; the panel shows Long Range, so the file uses `5852C245` with
`panelEvidence`.

### Numerical stat block — do not use

`BFUINumericalWeaponStatManagerWeaponConfigAsset` lists Firepower, Accuracy, Range and
Handling. The values are archetype templates, not per-weapon data: every SMG has
24/38/38/66, KSG-12 has SMG values, M123K and M121 A2 have shotgun values with "Pump
Action" and magazine 8, and SV-98 shows fire rate 25. Nine records have no block.

## Attachment labels and descriptions

`AD_*` assets under `Common/UI/Static/Metadata/Attachments/` hold two pointers to
`Class_fbe1d3bc` objects: `Field_33a358a7` (label) and `Field_490f0dd0` (description).
[frosty-descriptions.py](../../scripts/frosty-descriptions.py) resolves both against
the strings table.

- 1,003 assets exported without error: 990 labels and 997 descriptions resolve (984
  both); 131 distinct labels, 211 distinct descriptions.
- 13 assets have a null label pointer. Six descriptions use five ids missing from the
  table: `1C029CC8`, `BC1F219E`, `A70D89F6`, `2897A9DF`, `FC443C65`.
- Two assets can share a label and differ in description. Keep the asset path and ids
  when matching one to a site attachment.
- These are UI texts, not proof of mechanics or availability.

Optic `AD_*` labels are generic ("Sight 1.25x"). The optic model name comes from the AAM
record (below).

To repeat after an update: refresh the manifest and strings, batch-export
`Common/UI/Static/Metadata/Attachments/**/AD_*`, run the resolver and inspect its error
count. In 1.4.3.0 Frosty could not read these assets; use `scripts/frosty-ebx-decode.py`
([Tools](TOOLS.md#sdk-and-decoding)).

## Attachment and optic names (AAM records)

Each weapon's `AAM_<weapon>` asset holds one `Class_ccf7da47` record per attachment:

- `Field_55aded8d`: internal label (`RPK74M - RMR`).
- `Field_fd698f51` → `Class_fbe1d3bc.Field_3d34898a`: in-game name id
  (`0xadd3ecaf` = "R-MR 1.00x").
- `Field_85b318a1`: the AD asset (label and description).

Optic names include the magnification. Frosty record name → in-game name:

| Frosty | In-game | Frosty | In-game |
|---|---|---|---|
| 1P86 | 1P86 LPVO | NF ATACR | R-VPS 10.00x |
| 1P885 | 1p88 Variable | NX8-1 | S-VPS 6.00x |
| ACRO P2 | A-P2 1.75x | NX8-4 | NFX 8.00x |
| ANPAS35 | PAS-35 3.00x | Offset Red Dot | Piggyback Reflex |
| Bravo3 | Baker 3.00x | OPK7 | Osa-7 1.00x |
| CantedReflex | Canted Reflex | PG350 | 1p87 1.50x |
| COD2M | BF-2M 2.50x | QMK171A | QMK 3.00x |
| CompM5b | CCO 2.00x | RMR (also "Deltapoint") | R-MR 1.00x |
| EFLX Mini | Mini Flex 1.00x | Romeo4T | R4T 2.00x |
| ELCAN DR | SU-230 LPVO | RomeoX | ROX 1.50x |
| ELCAN LDS | LDS 4.50x | SB PMII | SSDS 6.00x |
| HISSHD | TS-HD 6.00x | Shield CQS | CQ RDS 1.25x |
| Holosun DRS TH | TH-RDS 1.00x | Spitfire | SF-G2 5.00x |
| M145MGO | MGO 3.50x | Steiner T536 | ST Prism 5.00x |
| M157 | NGFC LPVO | Tango6T | DVO LPVO |
| M7Xi | SM Rifle Variable | Trijicon MRO | RO-M 1.75x |
| March FFP Shorty | Mars-F LPVO | Trijicon RCO | PVQ-31 4.00x |
| Mark4M5A2 / M2 | LERT 8.00x | Trijicon REAPIR | GRIM 1.50x |
| Mepro M22 | 2Pro 1.25x | Trijicon SDO | SDO 3.50x |
| VZOR3 | 3VZR 1.75x | Trijicon SCO / VCOG | MC-CO LPVO |
| XPS3 | SU-123 1.50x | Trijicon SRO | RO-S 1.25x |

The M27IAR "NX8-4" record resolves to "S-VPS 6.00x". Some AD assets also hold stat
labels ("Aiming Down Sight Speed", "Zoom Level") and ids missing from the table.

## Current site mapping

All 3,011 non-optic site choices have reviewed Frosty source identities. The runtime
tooltip file describes 2,966 of them: 2,948 with Frosty English text and 18 with
approved game-panel text. The other 45 are deferred and carry
`description-review-required` in the mapping report.

All 350 generic optic choices map to 1,927 Frosty sight records for the 63 weapons.
Fixed scopes are Standard Optic; Variable Low and Variable High group the 20- and
25-point variable optics (not a magnification threshold). Iron Sights has a tooltip on
all 63 weapons (3,030 tooltips in total). The site shows the iron-sight name as
"Iron Sights (1.50x)" ([Attachments](ATTACHMENTS.md#optic-render-fov-and-zoom)).

- **Iron-sight defaults.** M16A4 (Classic) and UMG-40 (basic aperture) are user-selected.
  L115 and Interdictor use their no-scope-glint description. Four missing iron UI links
  use the weapon's `AD_<weapon>_Sight`. M121 A2 uses
  `Common/Hardware/Weapons/MG/MG5/AD_MG5_IronSights` (description `0BB6AC0B`).
- **Panel text.** 18 approved panels supply tooltips. 15 replace missing strings; three
  (AK4D 20 Rnd fast, SV-98 Lightened Suppressor, SCW-10 Extended) replace linked text
  that differs from the live panel (`status: linked-text-differs-from-panel`). Evidence:
  `panelLinkageInvestigation` in the identity follow-up report.

| Captured selection | Weapons receiving panel text |
|---|---|
| Taclight - Hipfire | M433, B36A4, M277, M417 A2 |
| Taclight - Aimed | VCR-2, GRT-BC, BROD 3, EF88, ES 5.7, M45A1 |
| 50 MW Violet | GRT-BC, L110, DRS-IAR, DB-12 |
| 30 Fast magazine | RPKM |
| 20 Fast magazine (linked text differs) | AK4D |
| Lightened Suppressor (linked text differs) | SV-98 |
| Extended barrel, 200MM Custom (linked text is `[REDACTED]`) | SCW-10 |

RPKM's AAM title resolves to "30rnd Fast Mag", matching its panel. DRS-IAR and DB-12
have TOP hardware and panels but RGT names in their ANPEQ16B AAM records; DB-12 also has
a separate RGT record, so the AAM name is not simply a typo.

### Files

- `data/attachment-tooltips.json`: runtime descriptions and per-weapon links.
- `reference-data/provenance/frosty-site-attachment-mapping-2026-09-13.json`: every site
  choice with hardware paths, progression and attachment GUIDs, ability branches,
  selectors, UI links, review flags and input hashes.
- `reference-data/provenance/frosty-optic-category-mapping-2026-09-15.json`: optic
  category members, labels, descriptions and hashes (the 2026-09-13 file is the 1.4.2.5
  baseline).
- `reference-data/provenance/frosty-attachment-identity-followup-2026-09-13.json`:
  further identities and screenshot reviews with image hashes.

### Resolution rules

- The mapper starts with the reviewed site-to-hardware identities and checks them against
  the source graph. Then it tries the full AAM name, the name without the slot code,
  rail-side variants and exact weapon descriptor names (case-insensitive). Scoped
  prefixes such as `MZL_FlashComp` can be removed while the exact hardware model stays.
- Shared UI records need the exact hardware model and the same English text across rail
  variants. A peer description needs the same model and the same bound selector set, so
  recoil and non-recoil subsonic variants stay separate.
- Screenshot reviews can resolve missing or conflicting links. Regeneration checks the
  screenshot hash, the original candidates and the expected text.
- The panel-text pass needs an unresolved (or `linked-text-differs-from-panel`)
  description, one matching hardware source, the unchanged UI link and the saved image
  hash. It writes `screenshot:<weapon>:<slot>:<attachment>` keys (not localization ids)
  and marks the choice `screenshot-verified`. Panel text is never copied to other
  weapons.

### Corrections from this audit

- `ImprvdSuppressor01` is CQB and `ImprvdSuppressor02` is Lightened (the old audit
  reversed them).
- P18, ES 5.7, M45A1, GGH-22 and vz. 61 show Single-Port Brake at 10 points; the source
  brake is `Brake2_W10`. The site uses 10 points and no generic sway penalty.
- QBZ-192 ergonomics are None, Match Trigger and Rail Cover; the unsupported Aftermarket
  Buffer was removed.
- GRT-BC shows Burst Mode with 3-round bursts; SL9 uses the 2-round description.
- SGX Classic Vertical uses "Greatly reduces recoil" (`AD_KABroomstick`).
- The M4A1 hipfire taclight uses `AD_SF300_LeftRail`.
- VSSM ASM text ("Alternate barrel") and M1014 compensator text differ from saved panels;
  the site uses the current Frosty text and the review keeps both.

### Regeneration and verification

Copy the newest dated mapping files to a new date first, because the generator writes
back into them ([Tools](TOOLS.md#safety-rules)).

```powershell
python scripts/frosty-attachment-tooltips.py outputs/frosty-description-probe/aam data/attachment-tooltips.json --frosty-root '<Frosty export root>' --mapping-json reference-data/provenance/frosty-site-attachment-mapping-<date>.json --optic-mapping-json reference-data/provenance/frosty-optic-category-mapping-<date>.json
python scripts/frosty-attachment-tooltips.test.py
node --test scripts/attachment-effects.test.mjs scripts/optic-costs.test.mjs
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
```

The coverage check compares the report with the menu availability functions, every
runtime description reference and deferred choice, current hashes and all optic
members. Totals: 2,967 described non-optic choices, 63 iron-sight tooltips, 45 deferred
choices, 350 optic categories.

## Composite stats UI

The composite stats (Hipfire, Precision, Control, Mobility) are covered in
[composite stats findings](../working/COMPOSITE_STATS_FINDINGS.md). The UI side:

| Asset | Content |
|---|---|
| `NumericalStatsDBD` | `Name`, `Value`, `Delta` |
| `IconizedAttributesDBD` | `Label`, `Value`, `Delta`, localized value/delta/suffix, `Icon`, `IsDeltaPositve`, visibility flags |
| `AttachmentAttributeDBD` | `Text` |
| `WeaponAttributeProgressBar`, `CL_StatsBar_WeaponStats` | Bar layout and colors |
| `WeaponAttributesDelta`, `WeaponAttributesDeltaValue` | Delta layout, fonts, `{0:s}` format |
| `WeaponAttributesIconizedCell`, `WeaponAttributesIconizedValue`, `WeaponExtendedAttributesCell` | Cell layout; `IconizedAttributesColorLogic` |
| `MetaCustomization_AbilityStatsDBD`, `MetaCustomization_AbilityStatsView` | Visibility flags |
| `PlayerAbilityStateDBD`, `MP_QuickCustomization_ViewStateGraph` | Ability state; no stat fields |

The bindings receive a finished name, value and delta, with no weights or inputs. The
labels `PRECISION` (`2581C0EB`), `HIPFIRE` (`4B1DA1C6`), `MOBILITY` (`F9880148`) and
`CONTROL` (`D81D0800`) are not referenced in the XML export. The values probably come
from native code.

### Setting labels

[frosty-weapon-setting-labels-2026-09-13.json](../../reference-data/provenance/frosty-weapon-setting-labels-2026-09-13.json)
lists 104 English labels for weapon, aim, recoil, spread and handling settings (names
only). No label, in PascalCase, lowercase or camelCase, matches a `GRX_Weapons` hash or a
cited `Field_` hash. Three labels match delegate argument names as text:
`RECOIL AMOUNT` → `RecoilAmount` (`030aea17`), `RECOIL VARIATION` → `RecoilVariation`
(`890dbeaa`), `DEPLOY TIME` → `WeaponDeployTimeIndex` (`f407a9c7`).

### String usage scan

`scan-string-usage` searched `Game/GlacierPortal`, `Common/UI`, `Common/GameSetup`,
`Game/GlacierMP/GameSetup` and `Game/GlacierGranite` for 107 ids (the 104 labels,
`5E0EAEEC`, `2DB86D4C`, `E8EA1B59`): 161 hits for 35 ids. EBX values only, not native
code.

- `HIPFIRE`, `MOBILITY`, `CONTROL`, `RECOIL SMOOTHNESS`, `SWAY FREQUENCY` and the other
  Portal tuning labels have no hit.
- `PRECISION` has one hit, a gadget label in `UIGadgetAbilityMetadata`.
- `ACCURACY`, `FIREPOWER` and `HANDLING` hit only their `NumericalStatKey` assets.
- `2DB86D4C` and `E8EA1B59` hit only the M2010 ESR and SV-98 records. `5E0EAEEC` has no
  hit; `97529B79` was not in the scan.

### Companion Battlefield composite models

Third-party evidence, read 13 September 2026 from the `statModels` bundle in
`companionbattlefield.com/assets/app-DZxSgVe7.js`. Their site had data errors before;
use it only as a research lead.

- **Labels.** Panel labels (`ADS Time In`, `Sprint Recovery`, `Recoil Amount`,
  `2D Spot-On-Fire Range`) are the game's English UI labels. Modifier names
  (`recoilAmountTier`, `hipDispersionTier`, `adsZoomTier`, `precisionMinAngleMult`) and
  raw fields (`HIPRecoilAmount`, `ADSStandBaseMin`) are their own. No Frosty hash or
  delegate argument name appears.
- **Base panels** (`panelBases`) store the four stats per weapon; attachments carry
  `ratings` deltas.
- **Hipfire:** one 18-value table by hip dispersion row, capped at 100, with a per-weapon
  base index. Rows 1-15 equal the site candidate
  `10*sqrt(0.425/tan(1.25*H)*83.333/40.924)` on `HIP_SPREAD_TABLE.hipStand`; row 0
  differs (22.109 against 23.052). The light gate multiplies by 1.0954 (sqrt 1.2).
- **Control:** 2,276 cells by recoil amount and variation tier sums; all agree with the
  site formula within 0.0001.
- **Precision:** 4,833 rows for 41 automatic weapons, keyed by amount sum, variation sum,
  duration, decrease factor, ADS `minAngle` and RPM (G36: `minAngle` 0.36 → 0.24 raises
  26.951 to 31.025). The 22 weapons with `minAngle` 0 or 0.001 have no rows (snipers 100
  except Interdictor 1, DMRs 55-80, sidearms 24-57, shotguns 6-14).
- **ADS:** per-weapon milliseconds by tier sum. ADS move speed ladder: 0.325, 0.325, 0.37,
  0.42, 0.475, 0.535, 0.6, 0.67, 0.745, 0.825, 0.91, 1.

## Limits

- English only.
- The string scan skipped 536 unreadable assets; none of the missing links needed them.
- Name and description links establish UI text and source identity. They do not prove
  live availability or engine behavior.
- Open questions are in [Open questions](OPEN_QUESTIONS.md).
