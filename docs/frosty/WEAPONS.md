# Weapon data in Frosty

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Data graph](DATA_GRAPH.md) · [Open questions](OPEN_QUESTIONS.md)

What the game data says about weapon-level values, and how the site uses it. The model
equations live in the model guides ([damage and ballistics](../DAMAGE_BALLISTICS.md),
[recoil and spread](../RECOIL_SPREAD_MODEL.md), [stat ladders](../STAT_LADDERS.md));
this page covers the source side. The native equations are in game code, which was not
examined; all findings use exported values and their structure.

## Multiplayer audit scope (1.4.3.0)

The [archive package census](../../reference-data/provenance/frosty-audit-weapon-bundle-context-2026-09-23.json)
checks all 192 GS/WB/Ability roots for 64 candidate weapons. The 189 roots for the
63 mapped weapons have GlacierMP package assignments. KSG's three core roots have
only the campaign assault sublevel assignment. KSG's folder also contains shared
content, so scope decisions must use individual records. These package assignments
establish archive context, not live inventory or native activation. The
[accepted scope review](../../reference-data/provenance/frosty-audit-ksg-scope-validation-2026-09-23.json)
excludes 19 exact KSG records: five in the campaign assault sublevel and 14 in the
campaign root package. The other 108 KSG-folder records retain their prior scope.

A separate [three-weapon consumer check](../../reference-data/provenance/frosty-audit-mp-consumers-validation-2026-09-23.json)
freshly verifies 13 exact source references for KSG, 590A1 and 6P67. They connect
weapon blueprints, settings, abilities, unlocks and equipment. The four checked
primary/secondary loadout and Conquest/Breakthrough roots have no direct import to
the 12 selected weapon records. This is a bounded direct-reference result, not a
complete mode traversal. KSG's `Art/U_KSG` is captured and decoded; the older
collection-only lookup missed it.

## Damage curves (`PD_*`)

- Each curve stores distance and damage together (`Field_3901db14` distance,
  `Field_42fc0f5e` damage), twice per object: as a point list (`Field_edfc6df6` of
  `Struct_c45202f2`) and as a flat interleaved array (`Field_5279388d`).
- **The two copies can disagree.** In 1.4.2.5 the Interdictor had 170 in the point list
  and 175 in the flat array on the fourth distance. Read both and reconcile.
- The Interdictor has a site curve (`Field_2ad7e688`, registry `TweakableDamageCurve`), a
  second health curve (`Field_6008eb31`) and armor curves (`Field_0bdc38c4`,
  `Field_7e05a1ae`, REDSEC). 1.4.3.0 moved the site curve to 100/80, 120/100, 160/100,
  180/80, 200/80 ([1.4.3.0 record](../archive/FROSTY_1.4.3.0_UPDATE_PLAN.md)).
- Review: [frosty-damage-curve-review-2026-09-13.json](../../reference-data/provenance/frosty-damage-curve-review-2026-09-13.json).

The [current projectile audit](../../reference-data/provenance/frosty-site-projectile-2026-09-23.json)
inventories 64 PD assets and compares 63 base curves plus 328 ammo selections.
All stored drag/gravity pairs agree with the captured fields. The two separately
referenced health curves differ in 41 assets; that count is not a comparison of
two copies within the same curve object. For example, PD_556x45mmNATO
`Field_6008eb31` points to a point-list curve with 25/20/16.7 damage, while
`Field_2ad7e688` points to the named tweakable curve with flat values
26.05/20.67/17.13 and an empty point list. The selected flat curves are function-equivalent to the site
for 62/63 bases and 324/328 ammo selections under `damageAtRange`; comparing
point counts alone would incorrectly flag three more weapons.

M45A1 is the remaining functional difference. Both referenced current curves describe a
54–75 m ramp from 14.3 to 12.5, while the site retains 14.3 through 75 m. This is
the documented transformation supported by the 13 September damage/BTK test,
not a newly established error. At 60 m the competing values are 14.3 and about
13.7857; at 74 m they are 14.3 and about 12.5857. Keep the observed step until a
current-build test contradicts it. Four M45A1 ammo selections share this curve.
The dated Sym disagreement count does not establish a build change by itself.

## Hit zones

- Multipliers are in the level material grids, not in weapon assets. Read the grids as
  raw EBX with the bounded reader ([Tools](TOOLS.md#raw-ebx-scripts)); never export them
  as XML.
- `scripts/frosty-hit-zones.py` maps each weapon/ammo projectile material to the head,
  torso and limb arrays. 63 weapons and 328 ammo choices; both maps (MP_Abbasid,
  MP_Badlands) agree.
- 1.4.3.0: the Interdictor projectile material moved 781 → 784 and its limb multiplier
  0.67 → 1.0; headshot stays 1.75.
- Evidence: [frosty-hit-zones-2026-09-15.json](../../reference-data/provenance/frosty-hit-zones-2026-09-15.json)
  and the material-grid inventory
  ([frosty-material-grid-inventory-2026-09-14.json](../../reference-data/provenance/frosty-material-grid-inventory-2026-09-14.json)).

## Projectiles and ballistics

- All 63 base projectiles have gravity −9.81 (`Field_d9d33d20`) and drag 0.0035
  (`Field_30c37c24`), named by the registry on 61 weapons and matched raw on RPK74M and
  VSSM.
- 25 projectile-swap branch records: 14 with drag 0.0035, 10 with 0.002, one with 0.0025
  (SV-98 Perst4 → `PD_SP_Enemy_762x54mmR_Bolt`, outside the ammo map).
- `scripts/frosty-ballistics.py` generates per-weapon/ammo projectile links
  (`data/ballistics.json`). It rejects stale XML hashes, missing ammo attachments, roster
  mismatches and SP projectiles. 1.4.3.0 changed only labels and hashes.
- Two unsupported Lightweight ammo choices (M60, M121 A2) were removed: no Frosty
  attachment, and the operator confirmed the game does not offer them.

### Zeroing source configuration (1.4.3.0, 23 September 2026)

All 63 captured weapon blueprints contain a zeroing block. Twelve (six bolt-actions
and six DMRs) link directly to named GRX `Shot.Zeroing` records. Their named values
are minimum custom distance 100, maximum 1000 and custom delay 0.4; rangefinder and
custom zeroing are false, and rangefinding in ADS only is true. All 12 named
minimum/maximum/delay values match the raw block. The other 51 blocks have null
GRX anchors; do not fill those anchors from another weapon.

The raw `Field_410f6aa8` lists follow weapon families:

| Source family | Weapons | Raw integer list |
|---|---:|---|
| Sidearm, shotgun, SMG | 21 | `[60]` |
| Carbine | 9 | `[75]` |
| Assault rifle, machine gun | 21 | `[100]` |
| Bolt-action, DMR | 12 | `[100, 200, 300, 400, 500]` |

The list is inside the zeroing block, but its name, units, indexing and active
selection are not established. The 51 unanchored blocks store raw scalar values
−1/−1/0.01 where the named group has 100/1000/0.4. Do not interpret −1 as an
unlimited distance or 0.01 as measured timing. Layout warnings remain.

This is a candidate input for later bullet-drop/aim-point research. It does not
justify adding a correction to the ballistic model yet. Check the effective zero,
attachment state and native correction with controlled impacts before implementation.
[Extraction and exact source identities](../../reference-data/provenance/frosty-zeroing-parameters-2026-09-23.json);
script: `scripts/frosty-zeroing-review.py`. Three representative XML lists match
the raw lists (M2010 ESR, M4A1, FiveSeven).

The [site comparison and predictions](../../reference-data/provenance/frosty-site-zeroing-2026-09-23.json)
now checks all 63 list pointers through their selected descriptor fields and typed
EBXX array entries. All 12 named blocks map to the site's DMR/sniper identities.
The site's configurable 100 m default is not an established game default. The
inspected WB flags, GRX children and HUD binding do not supply the selected spawn
distance. Record the untouched-spawn HUD state before changing zero settings.

The other 51 weapons expose a separate model gap: `ui/app.js` supplies no zero
distance, so `sim/ballistics.js` predicts a bore-relative trajectory despite the
stored singleton lists. If a singleton controls an active fixed zero, the target
prediction would change. At 100 m, the current M4A1 base model gives −18.045 cm;
using its stored 75 m candidate gives −5.357 cm. SGX gives −43.962 cm relative to
the bore or −20.151 cm with its 60 m candidate. These use the site's drag/gravity
solver, base velocity and standard projectile. They omit sight height and do not
establish native correction. Controlled impacts can distinguish the tested
behaviors; they cannot prove which serialized field the engine consumes.

## Collateral

- Base index: named WB `DamagePenetrationMultiplierIndex`. Steps: `Class_d11a23a2`
  `Field_fbfacac9` (P05/P10/P15 = 1/2/3).
- Table: `Class_6aa794ef.Field_c52d90b8` (raw offset 24) holds
  `[0, 0.166667, 0.25, 0.333334, 0.500001, 0.571429, 0.666667, 0.750001, 0.833334, 1]`
  for every checked projectile and body material on both maps. The
  `CollateralMultiplierAttributeDelegate` resource `FB59FAF31E5E634B` has the same ten
  values at byte 140.
- Rule: base plus steps, clamped to 0..9 (operator confirmed). M121 A2 Tungsten:
  6 + 3 + 1 = 10 → 9 → 1.00. `scripts/frosty-collateral.py` generates all 328 values.

## Controller recoil

`GRM_Recoil_Controller_03` holds 0.8836 (`Field_bbbfe9cc`, enabled) in both aim states,
bound on 57 weapons. L115, M2010 ESR, Mini Scout, PSR, SV-98 and Interdictor have no
binding. The raw branch values (53 × 100, 2 × 1001, 1000, 28) are `Int32`, not a named
input enum. The site uses 0.8836 as its controller amount multiplier at the operator's
request; native activation is not decoded.

## Weapon metadata

The [current label/source review](../../reference-data/provenance/frosty-site-base-fields-detail-2026-09-23.json)
also identifies a GGH22 caliber-label mismatch: `data/weapons.json` says
`9×19mm`, while its exact localized description says `.40 caliber` and its WB
selects `PD_.40SW`. The proposed label is `.40 S&W`. This affects descriptive
text; the existing projectile binding already supplies its ballistic values.
No production correction is made by this research pass.

## Regeneration and spotting

- **Regeneration.** `GRX_Glacier_Soldier` `RegenerationDelay` = 5. Frangible and
  Flechette source operands are 4 and 2 (the prior review covered 58 and 4 choices).
  The [23 September raw review](../../reference-data/provenance/frosty-regen-2026-09-23.json)
  rechecks the base and the Frangible/M1014 Flechette selector/import chains. The
  site adds these values and shows 9 s and 7 s. Native addition, activation and
  hit-reset behavior remain unverified.
- **Spotting.** In minimap/world order, suppressor operands are 0.14/0 and VSSM
  operands are 0.06/0. All 13 captured Subsonic packages import two separate effects:
  0.4285714/1 and 1/0.5. The old single-effect summary omitted the world reduction.
  The site already uses both factors. It hardcodes bases of 54 m (world) and 150 m
  (minimap) in `sim/applyAttachments.js`, then multiplies barrel, muzzle and ammo
  factors. EA's [1.2.1.0 patch notes](https://www.ea.com/games/battlefield/battlefield-6/news/battlefield-6-game-update-1-2-1-0)
  corroborate the historical 54 m world value for weapons with neither a suppressor
  nor a flash hider (previously 75 m), and the 21 m suppressed minimap value
  (previously 15 m). The per-weapon blueprint fields below now supply source
  evidence for the bases; native composition remains unresolved. For weapons
  with a 54/150 base, model predictions include 21 m suppressed,
  about 64 m Subsonic, and about 9 m
  with both on the minimap.

### Spot-on-fire base ranges (1.4.3.0, 23 September 2026)

Each inspected weapon blueprint stores a two-float block consistent with its
spot-on-fire bases. The main WB object (`Class_542ac52c`) holds `Field_5ebda408`:
`Field_9918e670` maps to the world (3D) range and `Field_31022dc5` to the minimap (2D)
range. These roles are inferred from the values and modifier family; the native
consumer remains undecoded. The block contains only these floats, with no named
GRX anchor found in the inspected structure
([source report](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json)).

| World / minimap | Weapons |
|---|---|
| 54 / 150 | 61 of 64 candidates |
| 27 / 64.285713 | M45A1, Skorpion (vz61) |
| 75 / 150 | KSG |

- M45A1 and Skorpion match 54 × 0.5 and 150 × 0.4285714 within float rounding.
  Their Analyzer descriptions identify subsonic cartridges. This supports a built-in
  range reduction; it does not establish the native calculation.
- The captured KSG blueprint has the older published world value of 75 m. This
  exact blueprint is among the reviewed single-player exclusions; that disposition
  does not apply to the whole KSG folder.
- The `WME_SpotRange_*` packages (`Class_0045e7fa`) carry only factors: minimap
  `Field_d98b0371`, world `Field_6f8d5f40`, priority `Field_3f680d24`. Their native
  application to the blueprint values and their composition still need validation.

**Site impact.** `sim/applyAttachments.js` hardcodes 54/150 for every weapon. Neither
`m45a1` nor `vz61` offers Subsonic ammo in `data/ammo.json`, so the site shows
54/150 where the source base is 27/64.29. Generating per-weapon bases from WB would
remove this source/model difference; the code is unchanged. Identity rests on
values, block structure and the modifier
class; the native consumer and multiplier composition remain open.

The [current spotting review](../../reference-data/provenance/frosty-spotting-reviewed-2026-09-23.json)
records release operands separately from fresh hotfix feature/expression captures.
`FL_Soldier_SingleFeature_8_WeaponFireSpotting` imports `SimEx_WeaponFireSpotting`.
The expression references the exact named `SpotOnFireDuration` value 0.4 and
`SpottingAllowed` default true. Its compiled resource ID is `2715dacdf212b88f`, also
seen in the older trace; equal IDs do not prove equal compiled bytes. No runtime
range formula follows from those references or from unrelated occurrences of 150.

M2010, M39 and HK417 shared blueprints import SP-prefixed suppressor packages with
the 0.1 minimap operand at priority 9001. The ordinary operand is 0.14 at priority 9000.
Neither the prefix nor the priorities establish mode exclusion or multiplication.
The [patch-note comparison](../../reference-data/provenance/frosty-spotting-patch-context-2026-09-23.json)
shows that a 150 m base gives 21 m with 0.14 and 15 m with 0.1. This is consistent
with the published before/after distances. It makes older tuning a useful
hypothesis for the 0.1 packages, but does not establish that they are obsolete or
inactive. The patch notes do not resolve Subsonic combinations or effect priority.
The old 0.014 candidate remains a composition question. The
[ranked capture plan](../working/BF6_CAPTURE_PRIORITIES.md) puts spotting and
regeneration first because they can test current displayed assumptions.

### Shared soldier settings (1.4.3.0, 23 September 2026)

The [reviewed soldier trace](../../reference-data/provenance/frosty-soldier-settings-reviewed-2026-09-23.json)
records exact registry imports in `Glacier_Soldier` object 55: regeneration delay 5,
rate 10 and amount 0. This establishes the source binding, not a healing equation.
The containing layout remains provisional; the wrapper fallback 0 must not replace
the referenced registry value.

The same object binds `HeadshotMultiplier_PerTeam` and `BodyshotMultiplier_PerTeam`.
Both source records have scalar default 1 and 33 array entries of 1. The shared mutator
registry also contains named per-team damage, maximum-health, regeneration-allowed
and regeneration-rate controls. Their defaults do not establish the active values
or team indexing in a match. These controls make mode/server settings relevant to
damage and regeneration capture interpretation.

`SimEx_SetSoldierMutators` and `SimEx_SetSoldierModeSettings` expose squad-revive,
death-flow and swimming settings in the inspected references. They do not provide
the missing direct application path for the health/damage/rate controls. The reviewed
report corrects that premature claim in the initial report. Native application and
standard MP mode overrides remain open.

The [ability candidate review](../../reference-data/provenance/frosty-multiplayer-ability-candidates-reviewed-2026-09-23.json)
adds 17 captured healing, protection and spotting-family assets with 44 exact import
joins. `Affector_FasterRegen` stores local rate/delay/amount fields 30/2.5/0, using
the same field hashes as the base soldier's named wrappers. Override versus addition,
duration and active class selection are not established. `Flak` and `StanceFlak`
store 0.67 and 0.75 in the same unnamed affector field; these are not yet proven
reductions for any particular damage category.

`SimEx_Ability_DamageSpot` imports the named `DamageSpot_Duration` value 8. Its
compiled evaluation remains unread. `Ability_SilentMovement` has no listed affector
and a null feature reference in this source; its name does not prove a footstep
effect. The ability families reference MP killswitch records, but a killswitch
default does not establish whether a class selects the ability. A GUID-byte scan
found no FasterHealing/Flak ability or unlock callers in 23,970 historical raw files
under 2 MB (five larger files skipped). That partial capture is not proof of non-use.

The [movement review](../../reference-data/provenance/frosty-movement-reviewed-2026-09-23.json)
retains named registry values for `Jump_HorizontalVelocityCap` 8,
`Swimming_DiveSpeed` 1.5 and `SuppressionResistance` 0.75. The bounded root/reference
pass did not establish their standard MP activation or native units/application.
Do not add them to the simulation as effective player settings.

The [LowProfile and suppression verification](../../reference-data/provenance/frosty-multiplayer-final-review-2026-09-23.json)
closes the selected LowProfile chain: Ability → FL → SimEx → both spot affectors.
Their raw operands 1.2 and 0.667 remain unnamed; no delay/duration multiplier is
assigned. The referenced release MP killswitch record is named `Ability_LowProfile`
and stores false. Its effective state and class selection remain unknown.

The Soldier suppression feature points to `PresEx_Suppression`, which has named
`Suppression Wedge` and `Suppression Vignette` VFX members. The separate
`SimEx_SpotOnSuppression` references a mortar `Affector_LockTypeSecretlyGuided` and
the named `KS_DisableSuppressionSecretlyGuidesMunitions` setting (release default
false). The [exact target review](../../reference-data/provenance/frosty-multiplayer-closure-2026-09-23.json)
does not establish whether suppression guides any munition in standard MP.
The presentation and simulation expressions are not treated as the same mechanic.
Their compiled evaluation and activation remain unresolved.

### Mode and map context

The [five-asset registry review](../../reference-data/provenance/frosty-mode-settings-2026-09-23.json)
confirms that `MutatorDatabase_Glacier` imports `MutatorDatabase_CH1`, which imports
`MUT_UI`. CH1 contains 1,046 setting references and 33 other imports; `MUT_UI`
contains 35 setting references. Supported-type entries and tags classify the
records. They do not identify an applied override, active mode or team-array mapping.

The [Conquest/Breakthrough review](../../reference-data/provenance/frosty-mode-roots-2026-09-23.json)
resolves the inspected mode-property imports to `CQ_fNoInteractivityTimeoutOverride`
and `BT_fNoInteractivityTimeoutOverride`. Each target stores 120, 0 and 600 in three
numeric fields; each root wrapper stores a 0 fallback. These individual timeout
properties do not establish a combat-rule override. The hotfix roots join by exact
file/object GUID to release mutator captures; their values are not independently
confirmed for the hotfix. Root layout warnings remain.

The release Breakthrough registry also contains `RetreatersSpotting_NoOcclusion`,
`RetreatersSpotting_InMinimap` and `RetreatersSpotting_InWorld`, each stored true.
These are retreater-specific setting defaults, not proof of general spotting or
live activation. Avoid retreat phases in baseline spotting tests. No named health,
regeneration or combat-damage override was found in the two inspected mode lists.
Compiled/inherited rules and live server selection remain unresolved.

The [bounded map review](../../reference-data/provenance/frosty-map-rules-2026-09-23.json)
captures current hotfix roots for MP_Abbasid and MP_Badlands plus three directly
referenced schematics. Both roots point to their own material grid. The 102 decoded
objects have no direct import of the three specifically tested soldier/UI/mutator
registries. Their default schematic references include round/mode-listener,
lighting and footprint systems. This does not prove equal effective rules on both
maps: inherited rules, compiled schematics and live mode/server selection remain
outside that bounded result. The prior two-map hit-zone/collateral evidence above
is retained; no large material grid was exported through the whole-object reader.

## Spread

### Current site input comparison (1.4.3.0, 23 September 2026)

The [source/site receipt](../../reference-data/provenance/frosty-site-spread-reviewed-2026-09-23.json)
checks all 63 site identities against their captured GS records. All 3,276
comparisons agree: 13 stored fields in ADS and hip, checked against both stationary
and moving/jumping/sprinting source blocks. The moving distribution exponent uses
the site's explicit override where present. Other moving fields agree with the
stationary values that the site inherits.

The check resolves descriptor field offsets and reads the float32 bytes at each
location. It checks 4,096 words in 64 GS bodies, including the unused generic
`DecreaseCoefficient`, `DecreaseExponent` and `DecreaseOffset` fields and the
separate KSG reference. KSG is not a multiplayer site weapon. The report preserves
raw hashes, archive Head, descriptor identity, named registry links, null-anchor
cases and float precision. This establishes configured values, not the native
recovery equation or state switch. The stored `idle*` and `firstShotMul` inputs
still require separate runtime evidence before use.

### Tables and indices

- `ZDA_Moving_Weapons` holds the moving ADS rows; GS `MovingZoomedMinAnglesArrayIndex`
  (`Field_d94fe6ad`) selects the row. Hip rows: `UnzoomedMinAnglesArrayIndex`
  (`Field_fe708077`). Column meanings are in the [field map](FIELD_MAP.md#weapon-stats-gs-and-wb)
  and [stat ladders](../STAT_LADDERS.md).
- Distribution exponent: 0.5 in all 252 source states except Interdictor moving ADS
  (0.67). The site samples `r = spread · U^exponent`.

The [site/shared-table audit](../../reference-data/provenance/frosty-site-constants-2026-09-23.json)
checks source row order through HDA `Field_d37c6521` and ZDA `Field_ed5a92bf`,
then applies all 63 GS selectors. All six named hip minima and three ADS moving
minima agree with the dated Sym 1.4.2.0 snapshot for every weapon. H2–H5 meanings
have this cross-weapon support; H1 has no corresponding named Sym minimum and
remains provisional. These checks establish table values and associations, not
the native movement-state consumer.

### Recovery law

Per branch (aim × stationary/moving), GS `DispersionBehavior` values follow one design:

- Firing: `FiringDecreaseOffset = FiringDecreaseCoefficient × c` with c = 9.72 in hip
  (62 of 64 weapons) and 2.25 in ADS (40 of 64); `FiringDecreaseExponent` 2.5. The other
  22 weapons (bolt-actions, DMRs, pistols, shotguns) have ADS coefficient 0, offset 6.6.
- Not firing: coefficient 0; offset = firing offset × 8/3 (ADS 7.2 for the 40), hip
  12.96. Idle: coefficient 0, offset 25 (hip) or mostly 7.5 (ADS); `IdleTime` 0.6 s hip
  (55 weapons), 0.4 s ADS (62).
- `FirstShotIncreaseMultiplier` 1 and the generic `Decrease*` (1.8/0.25/0.4) are
  uniform. Exceptions: Minigun and Railgun.

All 24 scaling modifiers (12 lights, 7 ADS barrels, 5 bipod) multiply `IncreasePerShot`
and the three offsets by k (0.666667; bipod 0.333333) and `FiringDecreaseCoefficient` by
exactly k^−1.5. With Δ = spread − minimum, `dΔ/dt = −(C·Δ^2.5 + O)` is unchanged when Δ,
the increase and O scale by k and C by k^−1.5. So the power applies to spread above the
minimum, as in the site's `applySpreadRecovery`.

- Sustained fire: `Δ* = max(0, (I/τ)/C − c)^0.4`. M240L hip (I 0.941, C 0.5, c 9.72,
  600 RPM): about 2.42° above the minimum.
- The engine has three recovery states (firing, not firing, idle); the site has two and
  no idle state. The switch rule is not in the data.
- **AK4D check.** From exported values only, the time from the last shot to the minimum
  is 0.199 s with the not-firing branch, 0.425 s firing, 0.103 s idle and 1.201 s with the
  generic branch. Recordings show about 0.21 s
  ([analysis](../archive/RECORDING_REUSE_ANALYSIS_2026-09-12.md)), which supports a
  switch to not-firing recovery soon after the burst and no idle before about 0.2 s.

### No per-shot increase: semi-auto and deployed

`GBM_NoIncrease_Semi_P00` and `GBM_NoIncrease_ERG_P00` configure `IncreasePerShot` ×0
for all states. Semi: selector `ba7bb6a2` (`_Ergo/CMU_SemiAuto`), bound in 40 GS files.
The earlier inventory found the ERG modifier in 25 GS files. Its name does not prove
an ergonomic attachment or an exclusively deployed state.

The [23 September raw review](../../reference-data/provenance/frosty-weapon-states-reviewed-2026-09-23.json)
corrects the earlier activation claim. M4A1 GS binds ERG to selector `15cff9ff`.
In its WB, that GUID belongs to `Class_9dfbb158` with mask `0x1`. Condition group
object 56 contains this fire-mode condition and the bipod/mounted conditions
`f6bad488`, `c9d17854`, and `d37fbd7e`; operation object 32 references the group.
This is a source condition graph, not proof that the group sets `15cff9ff` or that
all its branches combine in a particular way. Native evaluation remains unresolved.
The site has one fixed fire mode per weapon and no deployed state.

The same review establishes the following configuration in the M4A1 trace:

- `GBM_NoIncrease_ERG_P00`: four `Field_0084b1d1` blocks have multiplier
  `Field_5695ee1c = 0`, covering both aim and movement states.
- `GRM_BipodDeployed_BTM_P50`: amount exponent tier +10 and direction-variation
  exponent tier −4 in both aim states. Eligibility and native composition still need
  validation before a deployed comparison can use them.
- `GRM_MountedVertical` and `GRM_MountedHorizontal`: identity scalar operands and
  zero tier deltas. Different condition flags do not establish a recoil reduction.
- Mounted ADS reload packages are in WB `Field_0cd9f20f[109:111]`. They contain
  state selectors and boolean effects. Their `Field_3f680d24` values 11/12 are not
  established operation codes or reload speeds; the general field map calls that
  field Priority. No new timing multiplier follows from these records.

### Idle duration table (1.4.3.0, 23 September 2026)

The [direct GS/table/registry trace](../../reference-data/provenance/frosty-idle-duration-2026-09-23.json)
resolves the source table association. All 63 captured GS assets have
`Field_5b6caeda`, with paired indices (`Field_6138f58f`, `Field_54a69c98`) and two
references (`Field_fdc3ebd3`, `Field_d9d776d4`) to `IDA_Weapons`. In 62 assets, the
same block's `Field_62694562/Field_6b28f68f` points to a GRX record named
`GS_<weapon>.IdleDecreaseTargetDuration`. BREN3 has a null registry anchor; its
table references and indices are still present. This corrects the preliminary
negative result. The table's folder is `Arrays/ZoomTransitions/`, and the ADS
comparison below supports an ADS-timing relationship.

`IDA_Weapons/Field_1d1fad13` has 20 floats, from 0.483334 to a repeated 0.116667.
The inspected GS indices range from 1 to 6. Both members of each pair are equal.
The later [raw registry binding audit](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json)
resolves their names through paired field-hash and named-child arrays:
`Field_6138f58f` is `StationaryIndex`; `Field_54a69c98` is `MovingIndex`.
All 62 named GS anchors agree. This supersedes the earlier value-only ambiguity;
the array entries and child pointers were also checked directly in the 6P67 bytes.
Direct zero-based lookup gives candidate values 0.233334 for M4A1 (index 4) and
0.416667 for Interdictor (index 1). These are source lookup candidates, not measured
recovery times: native indexing, units, application and recovery-state switching
remain unverified. Raw containing layouts retain their conservative warnings.

**ADS comparison.** The [idle-table/ADS comparison](../../reference-data/provenance/frosty-idle-table-ads-comparison-2026-09-23.json)
finds that entries 0–7 of `IDA_Weapons`, multiplied by 1,000 for comparison,
match `ADS_SPD_TIERS` minus one 60 Hz frame within 0.001 ms:
483/417/350/283/233/183/150/117 against
500/433/367/300/250/200/167/133 ms. Across 64 raw GS/WB pairs, each weapon's idle
index equals its `AnimationZoomSettingsIndex` in 62 cases and its
`WeaponZoomTransitionIndex` in 61. L115 follows its animation index (2), not its
transition index (1). The two exceptions are VSSM (ADS 4, idle 2) and Interdictor
(ADS 0, idle 1). This supports an ADS/zoom-transition relationship. A
plausible reading is the time over which spread falls to its ADS target on entering
ADS. Do not feed this table into general idle spread recovery (`spreadDyn.*.idleTime`)
without consumer evidence. The relationship is pattern evidence; native units,
trigger state and application remain unverified. VSSM's idle index corresponds to
the ADS ladder's 367 ms step, while its IDA entry is 0.350001. The planned capture
can compare the animation transition with spread settling; they need not finish together.

The [site ADS audit](../../reference-data/provenance/frosty-site-ads-2026-09-23.json)
checks all 63 default site calculations. Interdictor's Basic barrel changes its
500 ms base to 433.334 ms before any grip is selected. Thus a 433 ms default does
not independently support the IDA interpretation. Full Angled and Slim Angled
both give 366.667 ms in the site; their source selector lists have one and two
ADS bindings respectively. Additive composition would predict 300 ms for Slim
Angled, but native deduplication, priority and activation remain unresolved.

Both AZT Main/Alt paths are present in all 63 WBs. Their eight ordered AZTT
children have identical pairs of time fields. The numeric candidate
`ADS_SPD_TIERS[i] = 1000 * AZTT_Ti.Field_a89997ad + 2 * 1000/60`
fits every tier within 0.000342 ms. These are byte-checked source fields, but the
opaque field's meaning and the two-frame adjustment are unproven. Do not turn
this relationship into a confirmed native ADS equation. The separate SSA sprint
array directly reproduces all 12 sprint timings after seconds-to-milliseconds
conversion, and its exact WB selectors agree for all 63 weapons.

Three representative XML/raw index checks passed, including BREN3's null anchor.
Do not use the parent GRX `[1,0]` array or `Field_8cf424e7` registry values as weapon
indices; the named GRX leaf values are in `Field_42c8b257`.

The exhaustive root inventory now includes 64 candidate GS/WB pairs. It retains
KSG as an additional source candidate without claiming multiplayer availability.
Across these roots, the current raw registry has 5,381 resolved anchor references
and 16,889 equal scalar child/hash pairs, covering 126 field hashes. The 372
non-scalar/no-leaf entries and 55 null child slots remain explicit. Field names
identify configuration; they do not establish native equations or active values.

## Recoil

The [23 September source/site audit](../../reference-data/provenance/frosty-site-recoil-2026-09-23.json)
checks six recovery inputs in both aim states for all 63 site weapons. All 756
comparisons agree. The wider check verifies 3,964 field locations and raw scalar
bytes across 64 GS roots, retaining KSG only as a reference. Site recovery offsets
are all 0.06; KSG's reference value is 0.001. A KSG value must not become a global
multiplayer default.

Named camera spring values have outliers. `SpringConstantZoomed` is 1500 on 57
site weapons, 200 on four, and 1000 on two. Other spring and damping distributions
are in the receipt. These names and configured values do not establish the output
channel or native spring equation. The site's current per-axis recovery law,
reset-on-shot clock and impulse delivery remain model assumptions.

All site weapons store pattern seed 0, pitch/yaw pattern multipliers 0, fade-out
start/end −1, fade factor 1 and first-shot vertical multiplier 1. These values
do not prove that the fields are disabled or unused. Vertical and horizontal
recoil bounds vary. The external evidence compares numerical predictions from
the current recovery law with explicitly conditional spring and seed models.
The next recording must separate aim displacement, camera motion and projectile
spread before selecting a different model.

- Recoil amount `Field_22810b21`, direction variation `Field_865174fa`.
- All 62 supported GS records, both aims: `RecoilDecreaseOffset` 0.06,
  `RecoilDecreaseNorm` 1, `ShootingRecoilDecreaseScale` 1, `RecoilDuration` 0.025; hip
  equals ADS for factor and offset. Factor and time exponent form 13 profiles (for
  example 72/1.2, 55/1.023, 104/1.459; 70/4.0 with exponent 0.6 for bolt-actions and two
  shotguns). Half-lives under the site law are 150–330 ms, with no fire-rate design
  target. Recoil modifiers change amount through tier exponents and do not scale
  recovery.
- Sniper brakes: `GRM_Recoil_MZL_Bolt_P10` adds 6 amount tiers (ADS and hip);
  `scripts/frosty-sniper-brakes.py` generates 16 weapon/brake pairs.

### Anonymous WB recoil candidates

The [WB pair review](../../reference-data/provenance/frosty-wb-recoil-pair-triage-2026-09-23.json)
checks `/Field_f8822efa/Field_c5d1c8fe/{Field_91121984,Field_0d926433}` against
named GS horizontal and vertical bounds for all 63 site weapons, including a
separate raw BREN3 comparison. The first field equals HorizontalRecoilLeft for
21 of 63 weapons; the second equals HorizontalRecoilRight for only two. Interdictor
stores `20/6` here versus GS horizontal `0.2/-0.2`. These are not interchangeable
fields. Raw source presence is confirmed, but no corresponding Analyzer input or
native consumer has been established. Do not propose a new recoil model from these
value coincidences. A recording can reveal motion but cannot identify which
anonymous field caused it without an independent control or consumer trace.

## Camera recoil ladder

`GCR_*` optic modifiers set `Field_bbbfe9cc` (enabled by `Field_bbffe8bc`), one value per
magnification, strictly monotonic. Higher probably means less camera shake (operator
report and ladder shape); the unit is not decoded. The site has no camera recoil model.

| Zoom | Value | Zoom | Value |
|---|---|---|---|
| 1.00x | -0.5 | 3.50x | 0.449399 |
| 1.25x | -0.254767 | 4.00x | 0.505185 |
| 1.50x | -0.084472 | 4.50x | 0.54968 |
| 1.75x | 0.041348 | 5.00x | 0.586081 |
| 2.00x | 0.138476 | 6.00x | 0.642258 |
| 2.50x | 0.279325 | 8.00x | 0.715803 |
| 3.00x | 0.377135 | 10.00x | 0.762266 |

`Field_7f1bb9d4` and `Field_9532eb28` must hold the same value in a member. All 34
assets were checked; the only defect was the SU-230 LPVO (`GCR_LPVO_4x00_1x00_P00`),
whose 1× state held 10, fixed in 1.4.3.0.

## Timing fields

- `Field_440ed7fa` (WB): 15 distinct values across 64 blueprints, all whole 1/60 s frames
  (4–24, and 0). It is **not** the rate of fire: `GRX_Weapons` names RateOfFire
  separately and they disagree on at least nine weapons (590A1 0.4 against 0.033; DP12
  0.4 against 0.167). Where they agree it equals 60/RateOfFire rounded to a frame. Most
  likely an animation or input window. 1.4.3.0 set ScorpionEvo3 and Skorpion to 4 frames.
  Not applied to the site.
- `Field_52a8ad43` (WB): 0.067 (four frames) on every weapon.

### Timing follow-up (1.4.3.0, 23 September 2026)

The [bounded raw inventory](../../reference-data/provenance/frosty-research-inventory-2026-09-23.json)
decoded 63 captured weapon blueprints with the release descriptor hash. It records
the reload threshold, reload delay, post-reload delay, both reload times and the
unnamed frame duration at their exact field paths. Four weapons have nonzero delay
fields: RPK-74M, M87A1, DB-12 and M1014. The DB-12, RPK-74M and M4A1 extracts match
the XML values and field counts within 0.00001.

All 63 containing weapon behavior objects carry the decoder's layout warning.
The raw values therefore remain provisional; agreement with XML does not remove
that warning. Internal objects have no serialized exported GUID, so the report
retains a null object GUID rather than inventing one.
The [M4A1 byte review](../../reference-data/provenance/frosty-timing-byte-review-2026-09-23.json)
adds its internal object index, absolute offsets and raw float bytes. Its selected
type key and nested descriptor indices are deterministic; the duplicate-name
warning remains pending a wider layout review.

No new serialized timing consumer was identified by the catalog-name pass. Native
reload commit/reset rules and delay composition remain unresolved. In particular,
do not add both delay fields to every displayed reload time or replace rate of fire
with `Field_440ed7fa`. Revisit with a decoded consumer or controlled reload timing
that distinguishes reload start, ammo commit, completion and next permitted shot.

The [current site comparison](../../reference-data/provenance/frosty-site-timing-2026-09-23.json)
retains all 63 identities, both timing blocks and the reload arrays. Primary
`60 / (BoltActionTime / BoltActionSpeed + BoltActionDelay + 60 / RateOfFire)`
reproduces all six bolt-rifle site RPM values within 0.00001 RPM. This numeric
agreement does not select the native block or establish the completion fraction's
role. Reload comparisons must divide stored time by `ReloadSpeed`: this resolves
the earlier direct-scalar differences. The three shell-fed shotguns also include
their documented reload and post-reload delays. The empty-reload capture below
settles the two differing stored-time choices for SOR-300SC and GRT-CPS under its
tested conditions. The DTA table and exact WB selector separately reproduce both Sym draw
times for all 63 weapons; sprint timing uses a separate selector.

The [direct draw-table review](../../reference-data/provenance/frosty-site-draw-2026-09-23.json)
verifies all 54 deploy/undeploy cells in the current DTA raw bodies at their
descriptor field offsets. Values convert from seconds to milliseconds. The
separate SSA review verifies the 12 sprint cells; the complete site draw tables
therefore contain 66 sourced cells. Sym is a dated comparison, not the source
authority for these current tables.

The second bolt block has a confirmed local owner chain:
`Class_542ac52c.Field_0cd9f20f/{index}` →
`Class_897c99a7.Field_9690d604/0` → `Class_582cbe36`.
Its parent selector includes `89c5e29e-fc24-495b-9435-d30f7403e993`, also the exact
selector in `WM_ReconTrait.Field_819acc98[0]`. The six exact per-weapon indices
are in the timing receipt. This corrects the earlier `Field_bbbfb375` ownership
lead and identifies the Recon-trait binding. Native activation, inheritance of
the unset time, and speed/completion-fraction composition still need proof.

### ADS Bolt and scoped shot cadence (23 September 2026)

The [six-rifle cadence receipt](../../reference-data/provenance/frosty-site-ads-bolt-cadence-2026-09-23.json)
records raw primary and Recon timing fields, exact attachment choices and competing
predictions. It uses release 1.4.3.0 Head 4892017. A new recording must identify its
own client build; these source values are not measured 1.4.3.1 cadence.

The current site interval is `B = T/S + D + 60/R`. DLC Bolt (`ads_bolt`) has no
cadence consumer in the site. Its selected source package imports a named
ADS-bolt-rechamber effect with a one-byte true flag, but no numeric speed operand.
Only M2010, SV-98, PSR and L115 expose this choice. Mini Scout and Interdictor are
base-behavior controls, not inferred attachment users.

| Weapon / source identity | Current RPM | Zoom fraction | RPM if fraction gates firing | RPM if Recon speed replaces base speed | Default modeled ADS-in (ms) |
|---|---:|---:|---:|---:|---:|
| Mini Scout / MiniFix | 47.093 | 0.875 | 52.640 | 51.429 | 250 |
| M2010 / M2010ESR | 43.902 | 0.859155 | 49.902 | 48.000 | 300 |
| SV-98 / SV98M | 38.208 | 0.875 | 42.885 | 41.860 | 300 |
| PSR / MRAD | 38.663 | 0.8 | 46.821 | 42.353 | 366.667 |
| L115 / L115A3 | 46.142 | 0.8 | 55.542 | 50.611 | 366.667 |
| Interdictor / DesertTechHTI | 31.915 | 0.8 | 38.860 | 35.928 | 433.334 |

The two alternative RPM columns are hypotheses, not replacements for site values.
The firing-gate candidate is `60 / (T*Fzoom/S + D + 60/R)`. The Recon candidate
inherits `T` into the selected block's `-1` time and substitutes its speed; native
inheritance and activation remain unresolved. The zoom fraction may instead mark
when ADS can resume, with firing still gated by the full bolt cycle.

Propose a separate sustained fully-ADS cadence calculation. If exit, bolt and
entry are serial, its interval would be `Aout + B + Ain`. If phases overlap, that
sum is too large; the full stored bolt duration might already include a transition.
Compare next accepted shot and next fully-ADS shot separately. `Ain` above is the
Analyzer's default attachment-adjusted result, not a raw or measured universal
transition. `Aout` is unknown. IDA's ADS-ladder-minus-one-frame relation does not
establish ADS-out timing. [Capture rank 6](../working/BF6_CAPTURE_PRIORITIES.md#6-reload-timing)
tests phase overlap, attachment behavior and Recon separately before a model change.

### Reload values and empty-reload capture (23 September 2026)

The raw comparisons use 1.4.3.0 Head 4892017. The recorded client is labeled
1.4.3.1, Head 4892087; the build folder and source paths are unchanged.

**Site rule.** The site's reload values are the stored time divided by the
per-weapon `ReloadSpeed` (`Field_1c533b56`) of the same `ReloadInfoArray` entry.
`tacRld = [0].ReloadTimeBulletsLeft / [0].ReloadSpeed` matches 60 of 63 weapons;
the three shell-fed shotguns use the delay composition above. `emptyRld =
[1].ReloadTimeBulletsLeft / [1].ReloadSpeed` now matches all 58 applicable weapons
after the two recorded corrections. M44 and TRR8 use their sole `[0]` entry,
giving 60 of 60 non-null empty values. For example, M4A1
gives 2.15 / 0.977272 = 2.200 and SL9 gives 3.284 / 1.031407 = 3.184. The direct
candidate comparison previously used undivided time; that comparison did not
establish a site mismatch.

**Which empty value applies.** Entry `[1]` stores `ReloadTime` (`Field_85ff24a0`),
`ReloadTimeBulletsLeft` (`Field_fc66e75e`) and a phase-time list (`Field_dc244b57`).
On 56 of 57 weapons with a phase list, its last entry equals `ReloadTimeBulletsLeft`.
SOR-300SC and GRT-CPS store `ReloadTime` 3.284 while their other two values end
at 3.2 and 3.034. The [23 September capture](../../reference-data/provenance/frosty-empty-reload-capture-2026-09-23.json)
timed the last shot to the first shot of the new magazine (auto-reload, hipfire,
60 fps, four cycles each):

| Weapon | `[1]` `ReloadTimeBulletsLeft` | One fire interval | Measured |
|---|---:|---:|---:|
| M4A1 (control) | 2.634 | 0.067 | 2.700 |
| LMR27 (control) | 3.067 | 0.133 | 3.207 |
| SOR-300SC | 3.2 | 0.100 | 3.300 |
| GRT-CPS | 3.034 | 0.167 | 3.200 |

Every weapon measures `ReloadTimeBulletsLeft` plus one fire interval. `ReloadTime`
3.284 would predict 3.384 and 3.451 s, so it does not govern these two weapons.
The site's `emptyRld` is now 3.2 (SOR-300SC) and 3.034 (GRT-CPS); both
`ReloadSpeed` values are 1. The extra interval most likely reflects the
auto-reload waiting for the next permitted shot; the video cannot place it before
or after the reload. Limits: one build, default loadouts, auto-reload only.

### Burst timing inputs (1.4.3.0 source, 23 September 2026)

The [final timing leaf review](../../reference-data/provenance/frosty-site-timing-leaves-final-2026-09-23.json)
separates stored burst inputs from their mode selector. DB-12's 74.999788 bursts/min
matches `60 / (2 * 60 / 359.9989929 + 0.433334 + 0.033334)` from its firing and
cycle fields. The two rounds per cycle must not be generalized to unrelated
weapons from the same field value alone.

KORD 6P67, SG 553R, PW5A3, UMG-40, KV9 and CZ3A1 use the shared
`WPM_ERG_BurstFireEnabled_W10` selector. Its captured enum scalar and array do not
establish each weapon's burst count or pause. The Analyzer stores two or three
rounds but no burst rate for these six; its timing function therefore adds no
inter-burst pause. This could change calculated TTK. Retain the current values as
unverified inputs until the [rank-9 cadence test](../working/BF6_CAPTURE_PRIORITIES.md#9-burst-mode-activation)
measures accepted shots and the pause. Source field names and selector presence
do not establish native cadence.

## Class weapon traits

Selectors are in `Common/Gameplay/InRoundProgression/WeaponTraits/<Class>/U_Ability_<Class>Trait`.
Weapon files do not reference them; the class activates them. Native activation rules
are not decoded, and the site does not model traits.

| Trait | Weapons | Effect | Route |
|---|---|---|---|
| Assault | 11 ARs (6P67, ACE32, EF88, G36, G3A4, HK433, L85A3, M16A3, SCARL, Tavor7, VHS2) | Deploy tier +1 and sprint-recovery tier +1 | WB `WM_AssaultTrait` |
| Support | 10 LMGs (M240L, M250, M27IAR, M60E6, MG4K, MG5, Minimi, RPK74M, RPKM, Ultimax) | ADS time +1 (animation and FOV) | GS `GID_ADSTime_Trait_P10` (priority 1000), WB `WPM_SupportTrait` |
| Engineer | 10 SMGs (APC10, APDW, MP5MLI, MP7A2, MPX, P90, PP19, ScorpionEvo3, UMP40, Vector) | Hip spread row +1 | GS `GDM_Array_HipDispersion_TRAIT` |
| Recon | 6 bolt-actions (DesertTechHTI, L115A3, M2010ESR, MRAD, MiniFix, SV98M) | Weapon and camera sway P10; `WPM_SwayPenalty` M10 | WB `WM_ReconTrait` |

`GDM_Array_ADSMoveDispersion_TRAIT` (operand 2) has no GS binding. Examples: M433
sprint/deploy base 5 → 6 gives 166.667/533.334 ms instead of 200.001/633.334 ms; L110
ADS 433.334 → 366.667 ms.

## Named GS/WB fields the site does not use

109 of 170 GRX leaf names under GS/WB paths are not used by the site (13 September).

| Field family | Spread | Assessment |
|---|---|---|
| `Recoil.Zoomed.VerticalRecoilMin` / `Max` / `Increase` | 6 / 5 / 2 distinct | Per weapon; not imported. Possible first-shot vertical kick. |
| `Recoil.Zoomed.HorizontalRecoilLeft` / `Right` | 6 distinct each (±0.2–0.6) | Per-weapon horizontal bounds; relation to direction variation not verified. |
| `Recoil.Zoomed.MaxVerticalRecoil`, `UsePolarRecoil` | 20 (61) / 90 (3); True except one | Near uniform; one non-polar weapon. |
| `IdleDecreaseTargetDuration.StationaryIndex` / `MovingIndex` | 6 distinct in the 63-weapon 1.4.3.0 raw pass | Linked to `IDA_Weapons`; values follow the ADS ladder minus about one frame, and indices match ADS animation indices in 62 of 64 weapons. Native use unresolved ([trace](#idle-duration-table-1430-23-september-2026)). |
| `ReloadInfoArray[].ReloadThreshold` | 36 distinct (0.72–0.8 common) | Probably the fraction at which ammo is committed. |
| `ReloadInfoArray[].ReloadDelay` / `PostReloadDelay` | Mostly 0; 6–7 non-zero | Check those reload timings. |
| `Ammo.NumberOfMagazines` | 12 distinct | Reserve ammo; not a TTK input. |
| `StanceChangePenalties.*` | 9 weapons, identical | Uniform stance-change penalty; low value. |
| `CameraRecoil.Spring*`, `UseTimeSinceLastShot` | Near uniform | Camera recoil is not modeled. |
| `RecoilFadeOut*`, `FirstShotMultiplierVerticalRecoil`, `AutoReplenish*`, `BridgeDelay` | One value | Uniform configured values; native use is unresolved. Neutral values do not prove absence or inactivity. |

Other leads not modeled: bipod and mounted recoil (`GRM_BipodDeployed_*`,
`GBM_Increase_ADS_*_BTM_Bipod` on M4A1 and QBZ-192, `GRM_Mounted*`). The operator decided
on 13 September to document these without model changes.

## Composite stats

The Precision tables are in `GlacierGameConfiguration/settings`
([field map](FIELD_MAP.md#composite-stat-tables-glaciergameconfigurationsettings),
[report](../../reference-data/provenance/frosty-precision-tables-2026-09-14.json)).
The investigation is in [composite stats findings](../archive/COMPOSITE_STATS_FINDINGS.md).

The [current raw comparison](../../reference-data/provenance/frosty-site-precision-2026-09-23.json)
checks the site's 63 Precision tables against exact settings object GUIDs. All
39,946 values agree, including 4,946 table rows and the six base keys per weapon.
Each scalar and each flag used to derive `valid` is checked at its descriptor
offset in raw body `95ac6ffced530d79722a69ab6a2e9d79419e02e32cb5d5fa2225119e74ad822d`
(archive Head 4892017). The retained weapon associations use multiple scalar
fields; this check does not turn those associations into decoded native weapon
names. Runtime row selection, wildcard rules and interpolation remain separate
model questions. Shotgun Hipfire and Mobility inputs are outside this receipt.

## Evidence

The [seven melee source chains](../../reference-data/provenance/frosty-audit-melee-cust-validation-2026-09-23.json)
were checked against 26 fresh raw decodes. Each Ability reaches a CUST parent,
then a WB weapon blueprint and a firing configuration. Combat Knife, Dino
Machete, Dive Knife, Geko Knife and Ice Climbing Axe share one firing target.
EOD Arm and Sledgehammer each use a separate target. The first six share
`DTA_Melee`; Sledgehammer points to its own temporary deploy-time array.
CUST also has a separate model branch, so CUST itself must not be excluded as
cosmetic. WB/firing layout warnings remain; these links do not prove equal attack
damage, timing or live activation.

- [frosty-global-operands-2026-09-13.json](../../reference-data/provenance/frosty-global-operands-2026-09-13.json)
  (`scripts/frosty-global-operands.py`): 238 objects, 4,235 attachment links, 750 named
  registry entries, controller bindings, material checks.
- [frosty-global-followup-2026-09-13.json](../../reference-data/provenance/frosty-global-followup-2026-09-13.json):
  regeneration, sway and spotting joins.
- [frosty-global-compiled-trace-2026-09-13.json](../../reference-data/provenance/frosty-global-compiled-trace-2026-09-13.json):
  compiled resources and the collateral byte match.
- [frosty-grx-field-names-2026-09-13.json](../../reference-data/provenance/frosty-grx-field-names-2026-09-13.json)
  and [frosty-light-field-names-2026-09-13.json](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json).
- History: [global-candidates audit](../archive/FROSTY_GLOBAL_CANDIDATES_2026-09-13.md) and
  [stat discovery](../archive/FROSTY_STAT_DISCOVERY_2026-09-13.md).

```powershell
python scripts/frosty-ballistics.py --root '<Frosty export root>' --trace reference-data/provenance/frosty-hit-zones-<date>.json
python scripts/frosty-global-operands.py --root '<Frosty export root>' --out reference-data/provenance/frosty-global-operands-<date>.json --grid <raw grid 1> --grid <raw grid 2> --descriptors '<runtime>/SharedTypeDescriptors.ebx'
```

### Current Weapon Attributes model

Use [Weapon Attributes model](../WEAPON_ATTRIBUTES_MODEL.md) for the four menu bars:
Hipfire uses its own dispersion ladder and an inferred increase-per-shot gate;
Control uses unrounded ADS recoil amount and variation; Precision uses per-weapon
1.4.3.0 lookup tables; Mobility weights deploy, ADS animation, sprint recovery,
ADS movement and moving-ADS dispersion indices, plus sprint-fire permission.
The 160 current panels match all four displayed values (640 values), including
12 combined-loadout panels. This is sampled menu validation, not proof of every
loadout or gameplay behavior. Historical captures remain separate. The site now calculates and displays these bars for both loadouts.
