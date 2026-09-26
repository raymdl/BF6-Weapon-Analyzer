# Frosty field map

[Frosty docs](README.md) · [Tools](TOOLS.md) · [Game update guide](../GAME_UPDATE_GUIDE.md)

BF6 EBX field and class names are hashes (`Field_xxxxxxxx`, `Class_xxxxxxxx`,
`Struct_xxxxxxxx`). This page is the single list of hashes with a known or probable
meaning. Check it before you investigate a hash, and add every new result here.

**The hash algorithm is not known.** FNV-1 and FNV-1a (32 and 64 bit), djb2 (both
forms, and the variant Frosty uses for string ids), SDBM, one-at-a-time, CRC32 and
Murmur3 do not reproduce known names (checked 13 and 16 September 2026). Do not try to
hash candidate names. Names come from value matching, structure and in-game tests.

**Confidence**

| Value | Meaning |
|---|---|
| Named | A named registry leaf (`GRX_Weapons`) matches all stated observations; current raw child/hash associations provide additional direct name evidence where linked. |
| Structure | Proven by links between objects (pointers, GUID joins, selector lists). |
| Value | Inferred from values that match site data, a formula or a UI string. |
| Tested | Confirmed by in-game screenshots or panels. |
| Probable | Best reading; not proven. |

A generic hash means nothing alone. Read the enclosing class or struct first
(see [Generic structures](#generic-structures)).

## Asset identity and references

| Hash | Where | Meaning | Confidence | Evidence |
|---|---|---|---|---|
| `Field_0c59fa06` | Asset root objects | Asset name (internal path), `CString` | Structure | [SDK field types](../../reference-data/provenance/frosty-sdk-field-types.json) |
| `Field_50f33881` | Asset wrapper (`Class_b2468102` and others) | Pointer to the primary object of the asset | Structure | Any WPM/zoom asset |
| `Struct_9bc51bd0.Field_6b28f68f` | Many | Wrapped external reference (for example a kill-switch registry) | Structure | [Attachment graph](DATA_GRAPH.md) |
| `Field_3f680d24` | Modifier objects | `Priority` (single-value GRX name). In GS bindings: entry index | Named (weak) | [GRX names](../../reference-data/provenance/frosty-grx-field-names-2026-09-13.json) |
| `Field_de6f63b3` | `Attachment_*`, `U_PRG_*` | Attachment ID hash, used by equipment prerequisites | Structure | [Compatibility](../../reference-data/provenance/frosty-attachment-compatibility.json) |

## Attachments, abilities and selectors

| Hash | Where | Meaning | Confidence |
|---|---|---|---|
| `Class_a9b2eb87` | `Attachment_*` | Attachment record | Structure |
| `Field_157a7d74` | `Attachment_*` | Progression (`U_PRG_*`) reference | Structure |
| `Field_fe77e9a9` | `Attachment_*` | Attachment category | Structure |
| `Field_6ee865a5` | `Attachment_*` | Point cost; the only cost field (`_W##` package suffixes are not costs) | Value, Tested |
| `Field_d7605aab` | Ability root | List of branches that the weapon offers | Structure |
| `Class_74f6b9e4` | Ability branch | One attachment branch | Structure |
| `Field_f86e0433` | Ability branch, Equipment | Progression (`U_PRG_*`) of the branch | Structure |
| `Field_64ef48eb` | Ability branch | Slot category; types in one slot share one choice | Structure |
| `Field_ffba60f0` | Ability branch | Action list (`Class_4ed159fb`) | Structure |
| `Field_def7f8dd/Struct_181e89a5` | Ability branch | Kill switch: registry `Field_e0b43a29/Struct_9bc51bd0/Field_6b28f68f`, local fallback `Field_043d7a08` | Structure |
| `Field_7e54e22c` | Action `Class_4ed159fb` | Unlocks: `U_WPM_*` package selectors and art unlocks; one action can list several | Structure |
| `Field_f1f008ba` | Action `Class_4ed159fb` | Additional unlock-import list; the primary census has 190 underbarrel WPM imports and one legacy bipod import. Application order is unresolved. | Structure |
| `Field_2717f5c2` | Action `Class_4ed159fb` | Exact `SRU_*` reference in 135 underbarrel actions; runtime function remains open. | Structure |
| `Field_072fe4eb` | Action `Class_4ed159fb` | Linked Ability: 135 underbarrel roots and four bipod roots. | Structure |
| `Field_b9875db0` | Action `Class_4ed159fb` | Matches the linked Ability's `Field_de6f63b3` ID in all 139 non-null cases; zero in all 5,976 null cases. | Structure |
| `Class_897c99a7` | WB part, `WPM_*` root | Weapon part (modifier package) | Structure |
| `Field_0cd9f20f` | WB | Part list: external `WPM_*` files and inline `Class_897c99a7` objects | Structure |
| `Field_819acc98` | `Class_897c99a7` | Selector GUIDs that enable the part (bare GUID strings) | Structure |
| `Field_9690d604` | `Class_897c99a7` | `WME_*` effect assets | Structure |
| `Struct_3e61171a` | GS binding | `Field_6d011165` selector GUID; `Field_2f0e5b83` bound modifier (`GRM_*`, `GID_*`, `GDM_*`); `Field_3f680d24` entry index | Structure |
| `Field_e70ce6be/Struct_4f9523cc` | Equipment | Prerequisite rule: `Field_399fae20` dependent attachment, `Field_f4142987` allowed attachment IDs | Structure, Tested (PP-19) |
| `Class_e7d2410a.Field_7f22bfb4` | Magazine package | Capacity including the chambered round (40 Rnd = `0x29`) | Value |

The [full raw action census](../../reference-data/provenance/frosty-audit-action-fields-2026-09-23.json)
and [Ability ID check](../../reference-data/provenance/frosty-audit-action-ability-ids-2026-09-23.json)
support the additional action fields above. These are class-specific structural
meanings, not canonical SDK names or native activation rules.

## Modifier operands and effects

`Struct_b1f8b400` is the operand record of a modifier. Across all `Common` records:
multiply `Field_5695ee1c` 209, override 164 (+9 flag only), multiply `Field_98a799ba` 56,
add 6. No record combines two operations. The order between modifiers on one field is
not known.

| Hash | Operation | Evidence |
|---|---|---|
| `Field_bbffe8bc` = True with `Field_bbbfe9cc` | Override with value; `Field_bbffe8bc` is the enable flag | Smooth `RecoilDuration` 0.05 / 0.066667; GCR camera values |
| `Field_4692836a` | Add (neutral 0) | `GRM_AutoIdentifier_P00` duration −0.0006 |
| `Field_5695ee1c` | Multiply (neutral 1) | Smooth recovery ×1.2 / ×1.728 |
| `Field_98a799ba` | Multiply operand (neutral 1); target and native order must be kept separate | FiringDecreaseCoefficient examples; [L17](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json) also raw-verifies 1.728 under RecoilDecreaseFactor |
| `Field_9540bd8e` | Signed step on `WME_ADSTime_FOV_*`, `WME_ADSTime_Anim_*` (must agree), `WME_Draw_*` | Barrel ADS, draw (`P05` = 1) |

| Effect class | Field | Meaning | Confidence |
|---|---|---|---|
| `Class_743a3ce0` (`GDM_Array_*Dispersion_*`) | `Field_94752c29` → `Field_84e57075`; `Field_9540bd8e/Struct_d204f959/Field_4692836a` | Target array; signed index step (`0xffffffff` = −1) | Value |
| `Class_743a3ce0` | `Field_b574fa40` | Boolean; true on bipod/grip pod `HipDispersion_BTM_P20`, false on `_NoBipod`. Probably limits the step to a bipod/deployed state ([L61](../../reference-data/provenance/frosty-2026-09-24-L61-bipod-hip-dispersion.json)) | Inferred |
| `Class_104c2294` / `Class_016623ac` | `Field_9540bd8e` | ADS time step on named `WME_ADSTime_FOV_*` / `WME_ADSTime_Anim_*` packages; inline optic settings remain unresolved ([L94](../../reference-data/provenance/frosty-2026-09-26-L94-optic-accessory-and-local-sight-sway.json)) | Value; optic interpretation unresolved |
| `Class_4aac041b` / `Class_03db7a68` | `Field_9540bd8e` | Draw step (deploy / sprint) | Value |
| `Class_303a33cc` (`WME_ADSMoveSpeed_*`) | `Field_c427eabf` | ADS movement step (`M05` = −1, `P10` = 2) | Value |
| `Class_9705264b` (`WME_ReloadSpeedRegular_P10`) | `Field_348b8cd1` | Reload multiplier 1.13 | Value |
| `Class_2fea847d` / `Class_28d25398` | `Field_90fd0310` and following floats | Weapon / camera sway multipliers | Value |
| `Class_d11a23a2` / `Class_e85fff64` | `Field_fbfacac9` | Penetration / protection steps (`P05` = 1, `P15` = 3) | Value |
| `Class_5830cb87` | `Field_8359723e` | Health regeneration delay added, seconds | Value |
| `Class_0045e7fa` | `Field_d98b0371` / `Field_6f8d5f40` | Minimap / in-world spot range factors | Value |
| WB `Class_542ac52c` | `Field_5ebda408/Field_31022dc5` / `Field_5ebda408/Field_9918e670` | Minimap / in-world spot-on-fire base candidates, m (150/54 on 61 weapons) | Raw values checked; role inferred, native consumer unresolved ([report](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json)) |
| `Class_c6c66955` | `Field_ffba8126` | Silenced flag | Value |
| `WME_DynamicPivot` | `Field_f235e44f`, `Field_a4f104cc` | X/Y/Z multipliers (M10 1.333333, P10 0.75, P20 0.5625) | Probable |
| `WME_*` muzzle velocity | `Field_6a5c4efd` | Velocity tier factor 0.8^n | Value |
| `WME_Firerate*` | `Field_14c4a054`, `Field_be31b12d` | Rate of fire values (P90 Heavy Recoil Spring 800 / 400) | Probable |
| `Class_20a02ed5` (`WME_ADSBoltRechamber_P25`) | Bolt-block boolean hashes | DLC Bolt override: sets `Field_68c40b57` true and the six leave-ADS flags false (Mini Scout's pattern) | Structure, Value |
| `Class_582cbe36` | `Field_14c4a054`, `Field_a1abbce8`, `Field_1c57216a`, fractions | Firing/bolt override; `-1` on every float it does not override (nine instances) | Value |
| `Class_032c7d25` (`WPM_ERG_BurstFire*`, `FullAutoReplace*`) | `Field_7313f5d3` / `Field_2a5a28ee` | Primary / alternate fire mode (`FireLogicType`) | Value |

## Weapon stats (GS and WB)

| Hash | Where | Meaning | Confidence |
|---|---|---|---|
| `Field_22810b21` | GS | Recoil amount | Value, Tested |
| `Field_865174fa` | GS | Recoil direction variation | Value |
| `Field_7b609515` / `Field_6b84de87` | GS dispersion | Unzoomed / Zoomed aim branch | Named |
| `Field_0a160c57` / `Field_447d6d51` | GS dispersion | Stationary / MovingJumpingSprinting branch | Named |
| `Field_1867639b` / `Field_c5401fc2` | ZDA hip rows | `hipStand` / `hipMove` minima | Value |
| `Field_160ef028`, `Field_b3ab862b`, `Field_1ef3a223`, `Field_553bcee0`, `Field_39b31415` | ZDA hip rows | H1–H5: jumping/sprinting, crouch stationary, crouch moving, prone stationary, prone moving | Probable |
| `Field_6c73f45b`, `Field_624b1a88` | `ZDA_Moving_Weapons` | Moving ADS minimum (standing or crouching) | Probable |
| `Field_bd300f62` | `ZDA_Moving_Weapons` | Jumping/sprinting ADS minimum | Probable |
| `Field_440ed7fa` | WB | Frame-quantized duration (whole 1/60 s). Tracks cadence but is clamped; **not** the rate of fire | Value |
| `Field_52a8ad43` | WB | Constant 0.067 (four frames) on every weapon | Value |
| `Field_5b6caeda/Struct_038e6367` | GS | Idle-duration block: `Field_6138f58f` = `StationaryIndex`, `Field_54a69c98` = `MovingIndex`; pointers `Field_fdc3ebd3` and `Field_d9d776d4` target `IDA_Weapons` | Names resolved by current raw GRX child/hash arrays in 62 anchors; native indexing and runtime use unresolved ([review](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json)) |
| `Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c` | WB | Primary projectile selection | Structure |
| `Class_35259f6b/Field_58d70acb/Field_ca2ec42a` | WB shot block | Rounds per burst (`NumberOfBulletsPerBurst` in SDK `ShotConfigData`); matches site `burstRounds` on all nine burst weapons | Value, Probable name |
| `Field_f8822efa/Field_16e6fa59` | WB fire logic | Primary fire mode, SDK `FireLogicType` order: 0 single, 1 single with bolt action (bolt and pump), 2 automatic, 3 burst | Value |
| `Field_f8822efa/Field_9b956c3d` | WB fire logic | Alternate fire modes, same enum (`[3,0]` = burst, single) | Value |
| `Field_f8822efa/Field_eebe0fd8` booleans `Field_68c40b57` … `Field_7e9e4ae5` | WB bolt action | Ten bolt-behavior flags. Six (`Field_168e57d5`, `Field_65310f94`, `Field_c2b88435`, `Field_85df0c4a`, `Field_a60870ff`, `Field_3ff462cc`) are true on the five leave-ADS snipers and false on Mini Scout and pumps; SDK candidates include `UnZoomOnBoltAction` and `ReturnToZoomAfterBoltAction` | Value; individual names unassigned |
| `Struct_739f3ac5.Field_32a99b9c` | WB | Muzzle velocity (`Shot.InitialSpeed.z`) | Value |
| `Field_d9d33d20` / `Field_30c37c24` | Projectile | Gravity (−9.81) / drag (0.0035) | Named, Value |
| `Class_6aa794ef.Field_c52d90b8` | Material grid relation | Collateral multiplier array (raw offset 24) | Value |

GS names from `GRX_Weapons` (recoil, dispersion, reload, projectile and camera recoil
fields) are in the [GRX appendix](#grx-registry-names).

## Damage curves (`PD_*`)

| Hash | Meaning | Confidence |
|---|---|---|
| `Field_edfc6df6` of `Struct_c45202f2` | Curve as a point list | Structure |
| `Field_5279388d` | Same curve as a flat interleaved array. **It can disagree with the point list** (1.4.2.5 Interdictor: 170 against 175) | Value |
| `Field_3901db14` / `Field_42fc0f5e` | Distance / damage inside a curve point | Value |
| `Field_2ad7e688` | Health damage curve (site source) | Named (registry `TweakableDamageCurve`) |
| `Field_6008eb31` | Second health damage curve | Value |
| `Field_0bdc38c4`, `Field_7e05a1ae` | Armor damage curves | Named (`TweakableArmorDamageCurve`) |

Hit-zone multipliers are in the level material grids, not in weapon assets. See
[Weapons](WEAPONS.md).

## Camera recoil (`GCR_*`)

| Hash | Meaning | Confidence |
|---|---|---|
| `Field_bbbfe9cc` (with `Field_bbffe8bc` = True) | One value per magnification, strictly monotonic (−0.5 at 1.00× to 0.762266 at 10.00×). Higher probably means less camera shake | Value, Tested (SU-230 fix) |
| `Field_7f1bb9d4` / `Field_9532eb28` | Paired fields (`IdleCameraRecoilWhenZoomedAmount` / `CameraRecoilWhenZoomedAmount`); both hold the same value in one member | Named |

The full ladder is in [Weapons](WEAPONS.md#camera-recoil-ladder).

## Optics, aim and zoom

| Hash | Where | Meaning | Confidence |
|---|---|---|---|
| `Field_7768ebf2` | Optic part `Class_3a930efc`; WB `Class_76a3b0eb` | Weapon render FOV in degrees; 55 is the default | Value, Tested |
| `Class_76a3b0eb` | WB | Render object; the one that links `DefaultHipFireRenderFovScale` holds hip fire (59) | Structure |
| `Field_6eb133f8` | `Class_76a3b0eb` | Per-zoom view block: 222 occurrences in weapon XML, 90 `(0,0,0)` and 64 `(0,0,-99.8)`, so −99.8 is a common standard value | Unknown |
| `Class_542ac52c.Field_4f917af5` | WB | Weapon default aim; all weapons `Aim_1x50` | Structure |
| `Class_fe7cd16a.Field_4f917af5` | Part | Aim override (optics); iron sights have none | Structure |
| `Class_8cdc5b63` | WB | Inline part sub-object that holds a render object (iron sights; built-in optics on the G36) | Structure |
| `Class_86ce0d70.Field_65ad1346` | Zoom level | Camera FOV: 2·atan(tan 27.5° × factor / zoom) | Value |
| `Class_86ce0d70.Field_3edbd391` | Zoom level | 1/zoom | Value |
| `Class_86ce0d70.Field_28ae4fd6` | Zoom level | PiP main-camera factor (1.0 at 1×, 1.5 at 10×) | Value |
| `Class_86ce0d70.Field_c9eb5f30` | Zoom level | FOV zoom curve reference | Structure |
| `Class_86ce0d70.Field_58cc4905` | Zoom level | Zoom sensitivity option reference | Structure |
| `Field_149939ab`, `Field_e9129d03` | Some `_Riser` optic parts | Multiplier pair (1.25 or 1.3); not the render FOV | Unknown |
| `Field_0d48404d` | `Aim_*_PiP` (1.4.3.0) | Reference to `OptionEnablePiPZoom` | Structure |

## UI text

| Hash | Where | Meaning | Confidence |
|---|---|---|---|
| `Class_fbe1d3bc.Field_3d34898a` | UI metadata | Localization string id (hex) | Structure |
| `Class_593f6146` | `UIWeaponAbilityMetaData*` | Weapon record | Structure |
| `Class_593f6146.Field_55aded8d` | Weapon record | Text label (not always the internal name) | Structure |
| `Field_ebe3976f`, `Field_53078b86` | Weapon record | Package image links (`T_UI_<internal>_PKG`) | Structure |
| `Field_fd698f51` | Weapon record, AAM record | Pointer to the name id object | Structure |
| `Field_490f0dd0` | Weapon record, `AD_*` | Pointer to the description id object | Structure |
| `Field_f8c63ce7` / `Field_8c7f991f` | Weapon record | Category pointer / three role tags | Structure |
| `Class_ccf7da47` | `AAM_*` | Attachment UI record; `Field_55aded8d` label, `Field_85b318a1` AD asset | Structure |
| `Field_33a358a7` | `AD_*` | Pointer to the label id object | Structure |
| `Field_c39698a3` | `AD_*` | Moved from `0xffffffff` to a small integer in 241 of 248 assets in 1.4.3.0 | Unknown |

## Composite stat tables (`GlacierGameConfiguration/settings`)

| Hash | Meaning | Confidence |
|---|---|---|
| `Class_fe5894b1.Field_d0874615` | List of 63 per-weapon Precision tables (`Class_0fd27406`) | Structure |
| `Field_22ce7cf3` / `Field_303e9335` | Recoil amount tier sum / recoil variation tier sum (table keys) | Value |
| `Field_59491962` | Table rows (`Struct_81d94d9f`) | Structure |

Row fields are in the [Precision report](../../reference-data/provenance/frosty-precision-tables-2026-09-14.json) `fieldMap`.

## Soldier and expression assets

| Hash | Meaning | Confidence |
|---|---|---|
| `Class_25c12137/Field_a2734e52/member/Field_8cf424e7` | External pointer list; four file GUIDs stay unresolved | Structure |

## Generic structures

| Hash | Rule |
|---|---|
| `Struct_cb53a662` | Three members `Field_3901db14`, `Field_42fc0f5e`, `Field_32a99b9c`, reused everywhere. The meaning comes from the enclosing field. `Field_32a99b9c` is muzzle velocity only inside `Struct_739f3ac5` |
| `Struct_b1f8b400` | Modifier operand record; see [Modifier operands](#modifier-operands-and-effects) |
| `Struct_9bc51bd0` | Reference wrapper (`Field_6b28f68f`) |

## Fields that change without a gameplay meaning

These fields change between builds for reasons other than stats. Ignore them in diffs
(from the [game update guide](../GAME_UPDATE_GUIDE.md#stage-5--diff-correctly)).

| Cause | Fields |
|---|---|
| String-id renumbering | `Field_8cf424e7`, `Field_fefe9de1` |
| Compiled-expression re-bake | `Field_0c18a620`, `Field_aa4fa860`, `Field_c7ffe639` |
| FX reference swap | `Field_0679f638` |

## Still unnamed

`Field_0ef83ce9` (changed in 1.4.3.0), `Field_6eb133f8`, `Field_c39698a3`,
`Field_149939ab` / `Field_e9129d03`. Add a row above when one is named.

## GRX registry names

Generated from [frosty-grx-field-names-2026-09-13.json](../../reference-data/provenance/frosty-grx-field-names-2026-09-13.json).
A GS/WB/projectile block that links a `GRX_Weapons` node is compared with the node's
named leaves; a hash is named only when one field matches in every observation. This
is name evidence only. Operand meaning and runtime use need their own checks.

### Value-matched names (72)

| Hash | Name | Block types |
|---|---|---|
| `Field_46afa73c` | AutoReplenishDelay | `Struct_598cc52c` |
| `Field_19861d8c` | BlastDamage | `Class_9966532d` |
| `Field_33f3a8ab` | BlastRadius | `Class_9966532d` |
| `Field_2320e742` | BurstsPerMinute | `Struct_30331789` |
| `Field_36c2f877` | CameraRecoilAmount | `Class_539cff9b` |
| `Field_f53f8877` | CameraRecoilUseTimeSinceLastShot | `Class_539cff9b` |
| `Field_9532eb28` | CameraRecoilWhenZoomedAmount | `Class_539cff9b` |
| `Field_68be3481` | DamageFalloffEndDistance | `Class_23637dce` |
| `Field_e5b11905` | DamageFalloffStartDistance | `Class_23637dce` |
| `Field_7e2be65f` | DamagePenetrationMultiplierIndex | `Struct_29ea5d2b` |
| `Field_9ba8b76b` | DamageProtectionMultiplierIndex | `Struct_29ea5d2b` |
| `Field_94efea57` | DistributionExponent | `Struct_3ee1d169` |
| `Field_30c37c24` | Drag | `Class_23637dce` |
| `Field_bc7acc94` | EndDamage | `Class_23637dce` |
| `Field_2ca8533e` | FiringDecreaseCoefficient | `Struct_3ee1d169` |
| `Field_f37351e6` | FiringDecreaseExponent | `Struct_3ee1d169` |
| `Field_1b9eef5d` | FiringDecreaseOffset | `Struct_3ee1d169` |
| `Field_edbd0711` | HorizontalRecoilLeft | `Struct_bcfafb0d` |
| `Field_65700a5d` | HorizontalRecoilRight | `Struct_bcfafb0d` |
| `Field_7f1bb9d4` | IdleCameraRecoilWhenZoomedAmount | `Class_539cff9b` |
| `Field_38a38f94` | IdleCameraRecoilWhenZoomedAmountSwitchTime | `Class_539cff9b` |
| `Field_66d08b86` | IdleDecreaseCoefficient | `Struct_3ee1d169` |
| `Field_0b26c028` | IdleDecreaseExponent | `Struct_3ee1d169` |
| `Field_aa558d2b` | IdleDecreaseOffset | `Struct_3ee1d169` |
| `Field_af333987` | IdleTime | `Struct_3ee1d169` |
| `Field_0084b1d1` | IncreasePerShot | `Struct_3ee1d169` |
| `Field_2b6f2936` | Index | `Struct_a152fb6e` |
| `Field_0bf4f62b` | InitialSpeed | `Class_23637dce` |
| `Field_95e340fe` | InnerBlastRadius | `Class_9966532d` |
| `Field_7f22bfb4` | MagazineCapacity | `Struct_598cc52c` |
| `Field_c59cc6a8` | MaxAmmoCountInWeapon | `Struct_b50f190f` |
| `Field_60e4e484` | MaxAngle | `Struct_0efdda3f` |
| `Field_205e8a1c` | MaxVerticalRecoil | `Struct_bcfafb0d` |
| `Field_82265a82` | MinAmmoCountInWeapon | `Struct_b50f190f` |
| `Field_7baf4297` | MinAngle | `Struct_0efdda3f` |
| `Field_d94fe6ad` | MovingZoomedMinAnglesArrayIndex | `Class_539cff9b` |
| `Field_b5ee0f41` | NotFiringDecreaseCoefficient | `Struct_3ee1d169` |
| `Field_0f79aaed` | NotFiringDecreaseExponent | `Struct_3ee1d169` |
| `Field_4d3f0635` | NotFiringDecreaseOffset | `Struct_3ee1d169` |
| `Field_4614adfe` | NumberOfMagazines | `Struct_598cc52c` |
| `Field_b480c17a` | PostReloadDelay | `Struct_b50f190f` |
| `Field_3f680d24` | Priority | `Class_2fea847d`, `Class_45930daa`, `Class_8cdc5b63`, `Class_bfd4f199` |
| `Field_14c4a054` | RateOfFire | `Struct_30331789` |
| `Field_5bd8006c` | RateOfFireForBurst | `Struct_30331789` |
| `Field_be31b12d` | RateOfFireForSingleFire | `Struct_30331789` |
| `Field_22810b21` | RecoilAmount | `Struct_bcfafb0d` |
| `Field_50b8fd5b` | RecoilAmountMultiplier | `Struct_bcfafb0d` |
| `Field_22ce7cf3` | RecoilAmountMultiplierExponent | `Struct_bcfafb0d` |
| `Field_9045ba17` | RecoilDecreaseExponent | `Struct_bcfafb0d` |
| `Field_28df1cde` | RecoilDecreaseFactor | `Struct_bcfafb0d` |
| `Field_39740463` | RecoilDecreaseNorm | `Struct_bcfafb0d` |
| `Field_04490b34` | RecoilDecreaseOffset | `Struct_bcfafb0d` |
| `Field_1d04f0f6` | RecoilDecreaseTimeExponent | `Struct_bcfafb0d` |
| `Field_f888cb38` | RecoilDirection | `Struct_bcfafb0d` |
| `Field_865174fa` | RecoilDirectionVariation | `Struct_bcfafb0d` |
| `Field_7404fa33` | RecoilDirectionVariationMultiplier | `Struct_bcfafb0d` |
| `Field_02433593` | RecoilDirectionVariationMultiplierExponent | `Struct_bcfafb0d` |
| `Field_c0c7c72f` | ReloadDelay | `Struct_b50f190f` |
| `Field_1c533b56` | ReloadSpeed | `Struct_b50f190f` |
| `Field_9c1e1476` | ReloadThreshold | `Struct_b50f190f` |
| `Field_85ff24a0` | ReloadTime (not used when it differs from `Field_fc66e75e` in the empty entry; [capture](../../reference-data/provenance/frosty-empty-reload-capture-2026-09-23.json)) | `Struct_b50f190f` |
| `Field_fc66e75e` | ReloadTimeBulletsLeft (effective reload time in both `ReloadInfoArray` entries) | `Struct_b50f190f` |
| `Field_dc244b57` | Reload phase-time list (unnamed); last entry equals `Field_fc66e75e` on 56 of 57 weapons (Value) | `Struct_b50f190f` |
| `Field_3ef01f58` | ShockwaveDamage | `Class_9966532d` |
| `Field_524836d3` | ShockwaveRadius | `Class_9966532d` |
| `Field_94869d67` | StartDamage | `Class_23637dce` |
| `Field_5ef7b9a1` | TimeToLive; exact current GRX child/hash pairing verified in [L22](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json) | `Class_23637dce` |
| `Field_fe708077` | UnzoomedMinAnglesArrayIndex | `Class_539cff9b` |
| `Field_8bd6dcdd` | UsePolarRecoil | `Struct_bcfafb0d` |
| `Field_9546447c` | VerticalRecoilIncrease | `Struct_bcfafb0d` |
| `Field_a63f14a6` | VerticalRecoilMax | `Struct_bcfafb0d` |
| `Field_ce4b3347` | VerticalRecoilMin | `Struct_bcfafb0d` |
| `Field_32a99b9c` | z | `Struct_739f3ac5` |

### Container names (24)

| Hash | Name | Observations |
|---|---|---|
| `Field_e7f4ce7c` | AltAnimationZoomSettingsIndex | 65 |
| `Field_4cc9e2ed` | Ammo | 65 |
| `Field_ae4adc54` | AnimationZoomSettingsIndex | 65 |
| `Field_956304be` | Crouching | 128 |
| `Field_0a5922e0` | DispersionBehavior | 64 |
| `Field_f8822efa` | FireLogic | 65 |
| `Field_5b6caeda` | IdleDecreaseTargetDuration | 64 |
| `Field_0bf4f62b` | InitialSpeed | 65 |
| `Field_a059dd20` | JumpingSprinting | 128 |
| `Field_3ed1c995` | MinMaxDispersion | 64 |
| `Field_e2ae7c09` | Moving | 384 |
| `Field_447d6d51` | MovingJumpingSprinting | 128 |
| `Field_43a8d9ab` | OverHeat | 1 |
| `Field_97ff0ca4` | Prone | 128 |
| `Field_c5d1c8fe` | Recoil | 64 |
| `Field_58d70acb` | Shot | 65 |
| `Field_5198399a` | SprintSettingsIndex | 65 |
| `Field_8c7ee85a` | Standing | 128 |
| `Field_0a160c57` | Stationary | 512 |
| `Field_7b609515` | Unzoomed | 192 |
| `Field_8c46f71b` | WeaponHipMoveSpeedMultiplierIndex | 65 |
| `Field_dcb8bf9e` | WeaponZoomedMoveSpeedMultiplierIndex | 65 |
| `Field_db03e8a9` | WeaponZoomTransitionIndex | 65 |
| `Field_6b84de87` | Zoomed | 192 |

### Weak names: one distinct value (11)

| Hash | Candidate name(s) |
|---|---|
| `Field_27b15985` | BridgeDelay |
| `Field_3f680d24` | Priority |
| `Field_5a02dd65` | RecoilDuration; historical weak label strengthened in the current MP5 GS context by [L13](../../reference-data/provenance/frosty-2026-09-24-L13-burst-duration-bindings.json) |
| `Field_72a2b562` | HeatPerBullet; historical weak label strengthened by the current raw M27IAR registry pair in [L35](../../reference-data/provenance/frosty-2026-09-24-L35-lmg-heat-source-scope.json) |
| `Field_aea8977a` | DecreaseOffset |
| `Field_bf650805` | FirstShotIncreaseMultiplier |
| `Field_cee5ebfe` | StationaryZoomedMinAnglesArrayIndex |
| `Field_d14921ea` | DecreaseCoefficient |
| `Field_d9d33d20` | Gravity |
| `Field_e6120d22` | HeatDropPerSecond; current raw M27IAR registry pair verified in L35 |
| `Field_f7a76bcf` | DecreaseExponent |

31 further leaves hold constant values shared by several fields and are not named; see `ambiguousLeaves` in the evidence file.

## GS dispersion collections: distinct targets

SDK reflection reviewed on 21 September 2026 identifies two separate arrays on
`Class_539cff9b`:

| Field | Element type | SDK index / offset | Meaning and confidence |
|---|---|---|---|
| `Field_b30a73ed` | `Struct_a92e7ee4` | 18 / 1528 | Runtime target unknown; do not label moving ADS from modifier filenames |
| `Field_2ffeb6ac` | `Struct_28529b7f` | 19 / 1536 | Moving-ADS dispersion binding collection, source/value tracing |

18.5KS-K Slim Angled places the named ADS-move modifier in the first array.
Its indicator and Mobility panel do not show the presumed moving penalty.
SDK layout establishes distinct types, not the unknown array's semantic name.
The [L29 direct registry check](../../reference-data/provenance/frosty-2026-09-24-L29-dispersion-registry-scope.json)
found neither collection hash in the exact GS_185KSK root pairs or its linked
MinMaxDispersion/DispersionBehavior registry groups. A named camera scalar passed
the same raw association check. This route does not resolve the unknown target;
it does not show that the collection is unused.
See the [Mobility trace](../../reference-data/provenance/composite-mobility-source-trace-2026-09-21.json)
and [attachment follow-up](ATTACHMENTS.md#weapon-attributes-attachment-tracing-21-september-2026).

Precision table extraction for current panels must use the
[1.4.3.0 report](../../reference-data/provenance/frosty-precision-tables-1.4.3.0-2026-09-21.json).
The changed settings export takes precedence over a stale overlay; the older
report above remains historical evidence.

## Weapon zeroing block

The [zeroing extraction](../../reference-data/provenance/frosty-zeroing-parameters-2026-09-23.json)
finds the block at `Field_58d70acb/Field_7d5dc312` in the captured WB firing object.
Twelve direct GRX anchors name the block `Shot.Zeroing`; 51 anchors are null.
Nested layout warnings remain. The following scalar matches apply to the 12
named blocks, not a native consumer or a proof of units.

| Field in the block | Source association | Confidence |
|---|---|---|
| `Field_fdf17e6a/Field_6b28f68f` | Reference to the named GRX zeroing block, or null | Structure |
| `Field_0910a3f6` | MinimumCustomZeroingDistance = 100 | Named; 12 matching records |
| `Field_7a592b4e` | MaximumCustomZeroingDistance = 1000 | Named; 12 matching records |
| `Field_812f7451` | CustomZeroingDelay = 0.4 | Named; 12 matching records; units unverified |
| `Field_4e34fabb` | RangeFindingInAdsOnly = true in the named group | Value; only true boolean in that block |
| `Field_4b636fc6`, `Field_4449ee55` | Both false; RangeFinder and CustomZeroing are also false | Individual assignment unresolved |
| `Field_410f6aa8` | Integer list in the zeroing block: single 60/75/100 or 100–500 | Structure; list role and active selection unresolved |

## Additional current raw registry names (1.4.3.0)

The [current raw association report](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json) pairs named child references with stored field hashes. It checks 16,889 equal scalar pairs across 5,381 GS/WB anchors, covering 126 hashes. There are no conflicts with the 60 overlapping names in the earlier value-match report. Twelve older names lie outside this root pass; their absence here does not invalidate them.

The table adds hashes not listed elsewhere on this page. Confidence is **Named by raw registry association**, within the stated source context. It does not establish units, equations or active multiplayer values. The same hash in another context still needs review. Earlier weak labels in this page are strengthened only where this report records the exact linked context.

| Hash | Named field | Source context |
|---|---|---|
| `Field_74b1aad2` | `IdleSpringConstant` | CameraRecoil |
| `Field_abf3655a` | `IdleSpringConstantSwitchTime` | CameraRecoil |
| `Field_eff75a4b` | `IdleSpringConstantZoomed` | CameraRecoil |
| `Field_43b22d90` | `IdleSpringConstantZoomedSwitchTime` | CameraRecoil |
| `Field_c7ccd1a7` | `IdleSpringDamping` | CameraRecoil |
| `Field_2b61552e` | `IdleSpringDampingSwitchTime` | CameraRecoil |
| `Field_bbd799e1` | `IdleSpringDampingZoomed` | CameraRecoil |
| `Field_131218dc` | `IdleSpringDampingZoomedSwitchTime` | CameraRecoil |
| `Field_f260924b` | `IdleSpringExponent` | CameraRecoil |
| `Field_c2d55f05` | `IdleSpringExponentSwitchTime` | CameraRecoil |
| `Field_99f2d08c` | `IdleSpringExponentZoomed` | CameraRecoil |
| `Field_def6553a` | `IdleSpringExponentZoomedSwitchTime` | CameraRecoil |
| `Field_01e71818` | `SpringConstant` | CameraRecoil |
| `Field_cea8c368` | `SpringConstantZoomed` | CameraRecoil |
| `Field_bfc65eb8` | `SpringDamping` | CameraRecoil |
| `Field_3d7a9f12` | `SpringDampingZoomed` | CameraRecoil |
| `Field_67cfff28` | `SpringExponent` | CameraRecoil |
| `Field_469a2fb5` | `SpringExponentZoomed` | CameraRecoil |
| `Field_560bbb82` | `SpringMinThresholdAngle` | CameraRecoil |
| `Field_57f8e02b` | `UseTimeSinceLastShot` | CameraRecoil |
| `Field_2859e2fd` | `FirstShotMultiplierVerticalRecoil` | Recoil |
| `Field_834a710f` | `HorizontalRecoilDecreaseMultiplier` | Recoil |
| `Field_1e41c505` | `RecoilFadeOutEnd` | Recoil |
| `Field_27f30454` | `RecoilFadeOutFactor` | Recoil |
| `Field_89e9f16e` | `RecoilFadeOutStart` | Recoil |
| `Field_ddac0349` | `RecoilPatternMultiplierPitch` | Recoil |
| `Field_b468bc2c` | `RecoilPatternMultiplierYaw` | Recoil |
| `Field_0fc53def` | `RecoilPatternSeed` | Recoil |
| `Field_9b46e71d` | `ShootingRecoilDecreaseScale` | Recoil |
| `Field_54ba3947` | `VerticalRecoilDecreaseMultiplier` | Recoil |
| `Field_8dcef541` | `SpawnDelay` | WB.Shot |
| `Field_caf2ace0` | `BoltActionDelay` | WB.FireLogic.BoltAction |
| `Field_1c57216a` | `BoltActionSpeed` | WB.FireLogic.BoltAction |
| `Field_a1abbce8` | `BoltActionTime` | WB.FireLogic.BoltAction |
| `Field_2084d4bf` | `BoltActionTimeCompletedFraction` | WB.FireLogic.BoltAction |
| `Field_21f2d4ee` | `BoltActionTimeCompletedFractionZoom` | WB.FireLogic.BoltAction |
| `Field_19b2eed9` | `SuppressionBoltActionDelay` | WB.FireLogic.BoltAction |
| `Field_6e081af4` | `ReloadType` | WB.FireLogic.ReloadInfoArray[0], WB.FireLogic.ReloadInfoArray[1] |
| `Field_7909bca5` | `AutoReplenishMagazine` | WB.Ammo |
| `Field_db4fa3c2` | `AutoReplenishRounds` | WB.Ammo |
| `Field_80a58418` | `InitialAmmo` | WB.Ammo |
| `Field_661b879d` | `InitialSpeedVariation` | WB.Shot |
| `Field_ed10e827` | `Duration` | StanceChangePenalties.CrouchToProne, StanceChangePenalties.CrouchToStand, StanceChangePenalties.ProneToCrouch, StanceChangePenalties.ProneToStand, StanceChangePenalties.StandToCrouch, StanceChangePenalties.StandToProne |
| `Field_7ce404e6` | `MinAngleOffset` | StanceChangePenalties.CrouchToProne, StanceChangePenalties.CrouchToStand, StanceChangePenalties.ProneToCrouch, StanceChangePenalties.ProneToStand, StanceChangePenalties.StandToCrouch, StanceChangePenalties.StandToProne |
| `Field_3b078489` | `OverHeatDropDelay` | WB.OverHeat |
| `Field_3ad34fcc` | `OverHeatPenaltyTime` | WB.OverHeat |
| `Field_37a30bd2` | `OverHeatThreshold` | WB.OverHeat |
