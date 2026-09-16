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
| Named | A named registry leaf (`GRX_Weapons`) matches the value in every observation. |
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
| `Class_897c99a7` | WB part, `WPM_*` root | Weapon part (modifier package) | Structure |
| `Field_0cd9f20f` | WB | Part list: external `WPM_*` files and inline `Class_897c99a7` objects | Structure |
| `Field_819acc98` | `Class_897c99a7` | Selector GUIDs that enable the part (bare GUID strings) | Structure |
| `Field_9690d604` | `Class_897c99a7` | `WME_*` effect assets | Structure |
| `Struct_3e61171a` | GS binding | `Field_6d011165` selector GUID; `Field_2f0e5b83` bound modifier (`GRM_*`, `GID_*`, `GDM_*`); `Field_3f680d24` entry index | Structure |
| `Field_e70ce6be/Struct_4f9523cc` | Equipment | Prerequisite rule: `Field_399fae20` dependent attachment, `Field_f4142987` allowed attachment IDs | Structure, Tested (PP-19) |
| `Class_e7d2410a.Field_7f22bfb4` | Magazine package | Capacity including the chambered round (40 Rnd = `0x29`) | Value |

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
| `Field_98a799ba` | Multiply (neutral 1); seen only on `FiringDecreaseCoefficient` | ×k^−1.5 |
| `Field_9540bd8e` | Signed step on `WME_ADSTime_FOV_*`, `WME_ADSTime_Anim_*` (must agree), `WME_Draw_*` | Barrel ADS, draw (`P05` = 1) |

| Effect class | Field | Meaning | Confidence |
|---|---|---|---|
| `Class_743a3ce0` (`GDM_Array_*Dispersion_*`) | `Field_94752c29` → `Field_84e57075`; `Field_9540bd8e/Struct_d204f959/Field_4692836a` | Target array; signed index step (`0xffffffff` = −1) | Value |
| `Class_104c2294` / `Class_016623ac` | `Field_9540bd8e` | ADS time step (FOV / animation) | Value |
| `Class_4aac041b` / `Class_03db7a68` | `Field_9540bd8e` | Draw step (deploy / sprint) | Value |
| `Class_303a33cc` (`WME_ADSMoveSpeed_*`) | `Field_c427eabf` | ADS movement step (`M05` = −1, `P10` = 2) | Value |
| `Class_9705264b` (`WME_ReloadSpeedRegular_P10`) | `Field_348b8cd1` | Reload multiplier 1.13 | Value |
| `Class_2fea847d` / `Class_28d25398` | `Field_90fd0310` and following floats | Weapon / camera sway multipliers | Value |
| `Class_d11a23a2` / `Class_e85fff64` | `Field_fbfacac9` | Penetration / protection steps (`P05` = 1, `P15` = 3) | Value |
| `Class_5830cb87` | `Field_8359723e` | Health regeneration delay added, seconds | Value |
| `Class_0045e7fa` | `Field_d98b0371` / `Field_6f8d5f40` | Minimap / in-world spot range factors | Value |
| `Class_c6c66955` | `Field_ffba8126` | Silenced flag | Value |
| `WME_DynamicPivot` | `Field_f235e44f`, `Field_a4f104cc` | X/Y/Z multipliers (M10 1.333333, P10 0.75, P20 0.5625) | Probable |
| `WME_*` muzzle velocity | `Field_6a5c4efd` | Velocity tier factor 0.8^n | Value |
| `WME_Firerate*` | `Field_14c4a054`, `Field_be31b12d` | Rate of fire values (P90 Heavy Recoil Spring 800 / 400) | Probable |

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
| `Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c` | WB | Primary projectile selection | Structure |
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
| `Field_85ff24a0` | ReloadTime | `Struct_b50f190f` |
| `Field_fc66e75e` | ReloadTimeBulletsLeft | `Struct_b50f190f` |
| `Field_3ef01f58` | ShockwaveDamage | `Class_9966532d` |
| `Field_524836d3` | ShockwaveRadius | `Class_9966532d` |
| `Field_94869d67` | StartDamage | `Class_23637dce` |
| `Field_5ef7b9a1` | TimeToLive | `Class_23637dce` |
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
| `Field_5a02dd65` | RecoilDuration |
| `Field_72a2b562` | HeatPerBullet |
| `Field_aea8977a` | DecreaseOffset |
| `Field_bf650805` | FirstShotIncreaseMultiplier |
| `Field_cee5ebfe` | StationaryZoomedMinAnglesArrayIndex |
| `Field_d14921ea` | DecreaseCoefficient |
| `Field_d9d33d20` | Gravity |
| `Field_e6120d22` | HeatDropPerSecond |
| `Field_f7a76bcf` | DecreaseExponent |

31 further leaves hold constant values shared by several fields and are not named; see `ambiguousLeaves` in the evidence file.
