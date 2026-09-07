# EBX manifest second pass — 6 September 2026

The pass found useful assets that the earlier UI screen investigation missed. It reviewed the names and paths in all 464,499 rows of `BF6 Datamining/ebx_manifest.csv`, then inspected selected candidates. This is not a semantic review of every EBX asset.

## Highest-priority findings

| Asset or group | Inspected finding | Use and limit |
| --- | --- | --- |
| `Common/UI/Weapons/UIViewModel/WeaponUpgradeStats` | A 14,416-byte serialized expression resource, ID `9B23B13553C4C947`. Ports include current and proposed attachment arrays, upgrade point delta, and positive/negative stat collections. | A concrete source for tracing attachment stat changes. Its arithmetic and active UI binding still need decoding. |
| `Common/UI/Weapons/UIViewModel/MenuWeapon_Attachment_AbilityStats` and `MenuWeapon_Package_AbilityStats` | Both expose `AbilityStatsBinding` with package/attachment identity inputs. Their exported graph resource IDs are zero. | Useful binding context. Neither currently supplies a standalone formula resource. |
| `Common/UI/Static/Metadata/S2–S4/UIWeaponAttachmentMetadata_*` | Five seasonal files supplement the base metadata. Together they contain 65 references to 64 unique AAM tables; L115A3 appears in both S3 files. | Required for metadata coverage. The base 51-table file is incomplete by itself. Metadata presence does not prove multiplayer availability. |
| `Common/UI/Static/Metadata/S4/UIWeaponAttachmentMetadata_S4B1` | References BREN3, VSSM, EF88 and DesertTechHTI. | Connects the newer weapons to their UI attachment metadata. |
| `Common/UI/Static/Metadata/UIWeaponCustomizationSlotMetaData` | Contains named slot groups, including barrels, magazines, underbarrel, sights and rail groups. | Useful for checking UI category mapping; no stat equation established. |
| `Common/UI/WeaponCustomization/Logic/MenuWeapon_GetMetadata` | Exposes package identity and barrel, magazine, magwell and rail offsets. | Relevant to presentation and attachment placement; no performance equation established. |

KSG is present in the combined metadata but has no mapped site ID in the current configuration roster. This is a research item, not authorization or evidence to add another selectable weapon.

## Additional candidates retained for targeted inspection

- `Common/UI/Weapons/Assets/WeaponAttachmentCollectionDataProviderLogic`: may help trace selection and attachment collection data.
- `Common/UI/Weapons/Assets/WeaponMenuPresentableDataProviderLogic`: may connect package identity to the displayed weapon.
- `Common/UI/Static/Metadata/S2–S4/UIWeaponAbilityMetaData_*` and `UIWeaponPackageMetadata_*`: companion seasonal metadata for ability and package coverage.
- `Common/UI/Static/Config/BFUICategorizationTagClassificationManagerWeaponsConfigAsset`: a possible source for weapon classification rules.
- `Common/Gameplay/Soldier/FL_Soldier/TacticalWeaponMovement/SimEx_TacticalWeaponMovement` and `PresEx_TacticalWeaponMovement`: possible sources for gameplay/presentation movement behavior. Their relation to ballistic aim is not established.

These candidates are not verified fixes. Do not promote values from names alone.

## Previously examined groups

The manifest still contains the seven known `Common/Hardware/AttributeDelegates/WeaponAttributesConfig_*` assets. The named Precision search did not reveal another delegate. This does not exclude an embedded or native implementation.

The common deploy, sprint, movement and dispersion arrays remain relevant source material, but are already part of the earlier configuration work. Loadout screen layouts, icons, sound styles and attachment transforms do not currently resolve the missing formulas.

## Evidence and next action

Start the next stat investigation with `WeaponUpgradeStats` and its current/proposed attachment inputs. Keep its output collections distinct from the four category scores until their relationship is established.

The source manifest hash, exact seasonal references, resource details and verified hashes for 11 new exports are in `reference-data/provenance/ebx-manifest-second-pass-2026-09-06.json`. Raw exports remain under ignored `outputs/frosty/composite-stats/`.

`WeaponUpgradeStats.xml` contains unescaped generic type names in `TypeRef` text. The inspection escaped only those text values in memory before XML parsing. Original export bytes remain unchanged.

No runtime data, commit or deployment was made during this manifest pass.

## WeaponUpgradeStats follow-up

The graph references `Game/GlacierGranite/Common/UI/NumericalStatsUpgradeKitDBD`. Its fields include Value, DisplayValue, Delta, ChevronCount and attachment-effect flags. Sixteen referenced categorization tags resolve to named upgrade features, including Slug, ADSRechamber, SprintFire and MatchTrigger. This establishes upgrade-summary context, not the four category formulas. The code-entry marker used for the small attribute delegates is absent from this resource, so that decoding shortcut cannot be reused unchanged.

A partial binary inspection identifies a candidate code region at byte 2608. A forward traversal reaches a backward edge from relative offset 5252 to 336. The earlier candidate branch at 372 contains offset 5288, immediately after that edge. This supports a loop/exit hypothesis; it does not prove opcode semantics or a stat equation. A repeated offset must not be treated as a failed layout by itself. Exact words and limits are recorded in the provenance JSON.

The candidate physical layout now covers all 10,120 code bytes with 298 instructions. All 196 function-reference offsets and all encoded next offsets land on candidate instruction boundaries. Three variable-length opcode 0x28 records are consistent with switch tables of 9, 8 and 1 cases. This is internal layout evidence only; opcode and function semantics still require verification before any formula is used.

SDK reflection identifies the graph's embedded Struct_bce2b39d as one enum field and two Single fields. Its enum has 41 entries, all with hashed names. Package and attachment ID records each contain one UInt32. The metadata does not resolve the compared property names or connect them to the four category scores. Record types, enum entries and SDK hashes are preserved in the provenance JSON.

Both retained weapon data-provider assets have now been exported and inspected. Neither contains a serialized expression resource or a readable category formula. The attachment provider references SelectAttachmentSlotIndexLogic; the presentable provider has no external EBX reference. Native provider behavior remains unresolved. Both XML files are also stored in their original Common/UI/Weapons/Assets paths under BF6 Datamining, with matching hashes.
