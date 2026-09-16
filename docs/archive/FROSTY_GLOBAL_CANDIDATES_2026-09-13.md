# Frosty audit of global assumptions

## Current status — 13 September 2026

The earlier combined changes were merged to `main` through PR #31 (`b0c4a97`).
The light implementation and guide updates described here are subsequent local
changes. The dated checkpoints below retain the investigation history; their
deferred, unimplemented and pre-publication statements are superseded by this status.

| Area | Current implementation | Remaining boundary |
|---|---|---|
| Availability, hit zones and projectiles | Removed the two unsupported Lightweight choices; explicit maps cover 63 weapons and 328 ammo choices. | Exported configuration does not establish live server overrides or native projectile integration. |
| Collateral | Generate all ammo values from base plus signed steps, with a final clamp to rows 0–9 confirmed by the operator. | The table matches the compiled delegate; native lookup code is not decoded. |
| Regeneration | Base 5 s; Frangible 9 s; Flechette 7 s. | These are model totals from source operands, not measured native timing. |
| Sway and spotting | Display source weapon-sway amount changes; multiply spotting factors against the existing bases. | Generic optics do not identify source optics; spotting bases and native composition remain inferred. |
| Distribution and controller | Use per-state source exponents and controller amount factor 0.8836. | Limited M39 capture evidence supports area sampling; native consumers/activation remain unverified. |
| Lights | Replace the +15% estimate with decoded hip growth/recovery factors for 137 supported selections. | Selected means active; current generated slots prevent selecting a separate light with a combo laser. Idle recovery and native activation/order are not simulated. |
| ADS and recoil timing | See the current attachment and recoil guides for source mappings and model rules. | This light/documentation update does not change barrel data or resolve native recoil delivery/reset behavior. |

Light evidence: [field names](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json),
[source coverage](../../reference-data/provenance/frosty-light-implementation-2026-09-13.json),
and [implemented equations](../RECOIL_SPREAD_MODEL.md#light-hipfire-source-factors).

## Historical investigation checkpoints


Updated: 12 September 2026 local / 13 September UTC.

The audit now includes implementation and further source tracing. Site values are
prior estimates to test, not acceptance criteria for extraction. Claude's hit-zone
implementation was merged locally at `314b8f7` on `docs/limb-multiplier-handoff`.
This work has not been pushed or deployed.

## Latest operator follow-up

This section supersedes the earlier deferred status for regeneration, sway display
and spotting composition. [Follow-up evidence](../../reference-data/provenance/frosty-global-followup-2026-09-13.json)
records the source joins and model choices.

- Regeneration now adds the source ammo delay to the source baseline: 5 + 4 = 9 s
  for Frangible and 5 + 2 = 7 s for Flechette. All 58 Frangible and four Flechette
  source choices agree on those additions.
- Sway now shows source muzzle/magazine amount changes as a percentage against
  the default loadout. The 49 non-neutral magazine mappings include -33.3% and
  -55.6% strengths. Typical adverse muzzle factor 1.5 gives +50%; SGX-specific
  source factors are retained. Optic/camera effects are excluded because the six
  generic site sight categories do not specify a unique source optic.
- Spotting now multiplies source factors, using the existing 54/150 m bases.
  The site values support the inference: 150 * 0.14 = 21, 150 * 0.4285714 rounds
  to 64, and their product rounds to 9. World subsonic range 54 * 0.5 = 27.
  This replaces minimum selection and the separate suppressed-subsonic override.
  These bases and composition are inferred, not independently decoded native fields.
- ADS was checked without changing it. M4A1 raw/site base index 4 plus Basic +1
  gives 200 ms. VSSM raw/site base index 4 plus zero for either site barrel gives
  250 ms. The regular VSSM source barrel has a +1 binding; ASM does not. The
  operator reports neither has the in-game ADS buff. Preserve both 250 ms values
  and record this as a source-versus-availability discrepancy. The earlier blanket
  200 ms suggestion was premature.

### Complete list of the light modifier entries found

All twelve `GBM_Increase_Hip_{S1,S2,S3,S4,S5,A30,A35,A40,A45,A50,A55,A60}_RGT_P10`
variants contain the following five non-neutral entries in **each** of two hip
branches, for ten entries per asset. The two branches are `Field_447d6d51` and
`Field_0a160c57` beneath `Field_7b609515/Struct_cbb04a56`.

| Target beneath `Struct_ad3f9081` | Changed scalar in `Struct_b1f8b400` | Value |
|---|---|---:|
| `Field_0084b1d1` | `Field_5695ee1c` | 0.666667 |
| `Field_2ca8533e` | `Field_98a799ba` | 1.837117 |
| `Field_1b9eef5d` | `Field_5695ee1c` | 0.666667 |
| `Field_4d3f0635` | `Field_5695ee1c` | 0.666667 |
| `Field_aa558d2b` | `Field_5695ee1c` | 0.666667 |

Four entries contain two-thirds and one contains 1.837117. These numbers must not
be labelled as five proven gameplay percentages: the scalar operation slots
are different and the target names remain stripped. No light runtime changes
were requested or made in this follow-up. Exact paths and all attachment links
are retained in the initial and current global-operand evidence.

Verification: 24 focused attachment/runtime tests passed; data validation passed
for all 63 weapons. Direct loadout evaluation confirmed M4A1 Basic 200 ms and both
VSSM barrels 250 ms.

## Initial implementation checkpoint

Three runtime changes are complete:

- Remove Lightweight ammo from M60 and M121 A2. Neither has a matching Frosty ammo
  attachment; the operator also confirmed that neither has this option in-game.
  Regenerated hit-zone data now covers 328 ammo selections without the two
  missing-attachment base fallbacks.
- Generate gravity and drag from explicit projectile selections. All 63 weapons
  and 328 ammo choices now link to 64 source projectile records. The runtime no
  longer supplies a global or class-based coefficient fallback.
- Use Frosty's 0.8836 controller value in the existing platform amount multiplier,
  as requested by the operator. Native activation and application remain separate
  questions; this changes the value without claiming those questions are solved.

Further extraction covers every audit candidate. Native composition and activation
remain unresolved for the other runtime replacements. The following table states
what was completed and the specific remaining boundary.

| Candidate | Work completed | Remaining boundary |
|---|---|---|
| Attachment availability | Checked root ability branches and kill-switch defaults; removed the two unsupported ammo options. | Exported defaults do not include live server overrides. A branch is not proof of live availability. |
| Gravity and drag | Added `scripts/frosty-ballistics.py`; replaced the global runtime selection with per-weapon/ammo projectile links. | Non-ammo SP branches remain excluded. Source coefficients do not prove the native flight equation. |
| Collateral | Extracted named base indices, attachment shifts, and the ten-value material table. The named collateral delegate independently contains the exact same float sequence. | M121 A2 Tungsten exposes an out-of-range sum. Modifier composition and bounds handling must be resolved before replacement. |
| Spotting | Generated six scalar modifier objects and their attachment links; followed the soldier weapon-fire feature into its previously unexported expression asset and resource. | The 54/150 m bases and minimum-versus-product composition were not resolved from the serialized expression graph. |
| Lights | Generated all twelve linked hip modifier variants and attachment/branch links. | Target fields and light-state activation are not fully decoded. The existing +15% remains an unsupported estimate. |
| Sway | Generated 206 weapon-sway and three camera-sway objects, including optic-local objects, plus their links and named registry fields. | Default optic selection, affected channels, and native composition prevent a supported numerical total. |
| Controller recoil | Found `GRM_Recoil_Controller_03` and its explicit 0.8836 operands, with 57 weapon bindings. The runtime now uses 0.8836 at the operator's request. | The six sniper rifles have no matching binding. Raw branch numbers and overwrite/scaling semantics remain unresolved. |
| ADS normalization | Generated named base indices and linked ADS shifts. Traced VSSM's basic barrel into the ability's five-member initial selection list. | The export strengthens the factory-selection trace but does not establish effective animation timing or native index composition. |
| Regeneration | Found named `RegenerationDelay = 5` and the soldier reference to it. Generated attachment operands 4 and 2. | Addition and hit/regen timing still need validation before promoting 9/7-second totals as native behavior. |
| Distribution | Retained named per-state exponents in the generated evidence; reused the existing all-weapon field scan and BROD3 trace. | An exponent of 0.5, or Interdictor moving-ADS 0.67, does not identify the native random sampler. |
| Smooth/Heavy recovery | Reused the existing source operand and per-weapon duration evidence. | Extraction cannot decide delivery timing, reset behavior, or native operation order. No new fit was promoted. |

## Evidence and reproduction

- [Initial candidate evidence](../../reference-data/provenance/frosty-global-candidates-2026-09-13.json)
  retains the initial projectile and modifier checks.
- [Current global operands](../../reference-data/provenance/frosty-global-operands-2026-09-13.json)
  are generated by `scripts/frosty-global-operands.py`: 238 objects, 4,235 attachment
  links, 750 named registry entries, controller bindings, availability records,
  source hashes, and material checks on both maps.
- [Compiled-resource trace](../../reference-data/provenance/frosty-global-compiled-trace-2026-09-13.json)
  retains named asset arguments, resource identities/hashes, the collateral table
  byte match, 327 candidate ammo results, and the unresolved M121 A2 selection.
- [Current hit-zone trace](../../reference-data/provenance/frosty-hit-zones-2026-09-13.json)
  records the corrected 328-entry roster used by the ballistics generator.
- [Runtime ballistics](../../data/ballistics.json) records the exact trace hash,
  projectile XML hashes, and generated weapon/ammo selection maps.

XML source root: `C:/Users/royal/Documents/BF6 Datamining/Frosty Exports/1.4.2.5`, labelled 1.4.2.5.
That label is not independent full-build verification. The two small expression
assets and resources were read from the installed game into the ignored audit
output folder. Their hashes are retained separately from the existing XML export.
No source files or recordings were edited.

Generate the hit-zone trace with `scripts/frosty-hit-zones.py` first, using the
XML root, raw material grids, and `SharedTypeDescriptors.ebx`. Then run:

```powershell
python scripts/frosty-ballistics.py --root 'C:/Users/royal/Documents/BF6 Datamining/Frosty Exports/1.4.2.5' --trace reference-data/provenance/frosty-hit-zones-2026-09-13.json
python scripts/frosty-global-operands.py --root 'C:/Users/royal/Documents/BF6 Datamining/Frosty Exports/1.4.2.5' --out reference-data/provenance/frosty-global-operands-2026-09-13.json --grid outputs/frosty-limb-2026-09-13/materialgrid_win32.ebx --grid outputs/frosty-limb-2026-09-13/materialgrid_mp_badlands.ebx --descriptors 'C:/Users/royal/Documents/BF6 Datamining/FrostyToolsuite-battlefield6/FrostyEditor/bin/Release/Final/SharedTypeDescriptors.ebx'
```

The ballistics generator rejects stale XML hashes, missing ammo attachments,
roster mismatches, and SP projectile selections. The material reader uses bounded
raw arrays. Do not export a level material grid through Frosty's object/XML decoder.

## Attachment availability

The current graph contains 5,542 attachment records. Eleven lack a matching branch
in the ability root list. Among the 5,531 linked branches, 5,388 exported kill-switch
defaults are False and 143 are True. These are source-state counts, not a live
multiplayer roster. A kill-switch being set is useful exclusion evidence; an
unset switch is not proof that all other activation conditions are satisfied.

The relevant checks are:

1. The attachment asset must exist and link to a progression unlock.
2. The weapon ability's `Field_d7605aab` root list must include the matching branch.
3. The branch's `Field_def7f8dd` switch contains a local fallback and a referenced
   kill-switch registry default.
4. Equipment lists, mode conditions, and live overrides remain separate checks.

M60E6 and MG5 each have only FMJ, Tungsten, HollowPoint and Frangible ammo attachment
assets in this graph. There is no PolymerCase/Lightweight attachment for either.
Their four linked ammo branches have False exported kill-switch defaults.

All 15 unmapped SubsonicFrangible assets left in the hit-zone generator's issue
list have True kill-switch defaults. This is a concrete reason not to add them
merely because an asset exists. They are not among the site's 328 ammo choices.

## Ballistics

WB `Class_35259f6b/Field_58d70acb/Struct_29ea5d2b/Field_808dd66c` selects the primary
projectile. `Field_d9d33d20` is gravity and `Field_30c37c24` is drag, corroborated
by named registry entries on 61 weapons and corresponding raw fields on RPK74M
and VSSM. All 63 base projectiles contain -9.81 and 0.0035.

The original graph has 25 projectile-swap branch records: 14 with drag 0.0035,
10 with 0.002, and one with 0.0025. The last is SV98 Perst4 selecting
`PD_SP_Enemy_762x54mmR_Bolt`; it is outside the ammo-only runtime map. Branch counts
are not unique ammo counts. Match and MatchTungsten use their explicit replacement
projectile links. The corrected data includes all 63 weapons, including BROD3,
EF88 and VSSM, without a separate Sym coverage list.

## Collateral lookup

Named WB `DamagePenetrationMultiplierIndex` entries provide base indices. Linked
`Class_d11a23a2/Field_fbfacac9` operands provide source steps: P05/P10/P15 hold
1/2/3. The material relation `Class_6aa794ef/Field_c52d90b8`, at raw offset 24,
contains this array for every checked base projectile against head, torso and limb
materials on both MP_Abbasid and MP_Badlands:

```text
[0, 0.166667, 0.25, 0.333334, 0.500001, 0.571429,
 0.666667, 0.750001, 0.833334, 1]
```

`WeaponAttributesConfig_CollateralMultiplierAttributeDelegate` has a named Int32
input `DamagePenetrationMultiplierIndex` and a Float32 return value. Its linked
resource `FB59FAF31E5E634B` contains the identical ten Float32 values at byte offset
140. This independently corroborates the table's collateral role. It does not
by itself decode the lookup or native modifier execution.

A simple base-plus-step calculation produces 327 in-range candidate ammo results.
M121 A2 Tungsten selects both Tungsten (+3) and FMJ (+1) from base index 6, giving
10 for a ten-entry array. Clamping, replacement, or another composition rule
cannot be selected from that arithmetic alone. The candidate results therefore
remain evidence, not runtime values. Potential displayed differences include
ES 5.7 Penetration 0.833334 versus 0.75, and several ES 5.7 ammo choices 0.571429
versus 0.50. These are validation targets, not confirmed gameplay corrections.

Readiness clarification: ES 5.7 has base index 5 and one unambiguous shift per
ammo choice, with all results inside the table. It can be adopted as source-derived
data without waiting for the M121 A2 bounds question. M121 A2's current 1.00 is
not a demonstrated numerical error: using only the stronger +3 shift, or capping
the combined result at index 9, would both give 1.00. Those are possible rules,
not decoded native behavior. Likewise, adopting VSSM's source ADS +1 in the
existing index model would give 200 ms; lack of an independent animation
measurement is a qualification, not an absolute bar to that model choice.

## Controller input

`GRM_Recoil_Controller_03` is a source asset, not a guessed platform label. Both
its aim-state branches contain an index-0 tuple with `Field_bbbfe9cc = 0.8836` and
`Field_bbffe8bc = True`; the other scalar slots in that tuple are neutral.

Its GS bindings cover 57 weapons. L115, M2010 ESR, Mini Scout, PSR, SV98 and
Interdictor have no matching controller modifier binding. Of the 57 raw branch
values, 53 are 100, two are 1001, one is 1000 and one is 28. The BF6 SDK identifies
that branch field as Int32, not a named input enum. These values do not establish
a `controller = 100` rule. At the operator's request, the runtime now uses 0.8836
as its existing final amount multiplier; this is a model choice based on the
source operand, not a claim that native activation or composition was decoded.

## Other source boundaries

**Spotting.** Suppressor operands 0.14/0, VSSM 0.06/0, subsonic 0.4285714/1 and
other 3D factors remain per-attachment source values. Priorities and the SP
0.1/0 variant are preserved. The soldier's weapon-fire feature links to
`Common/Gameplay/Spotting/SimEx_WeaponFireSpotting`, which was absent from the XML
export. Its newly read serialized expression graph does not expose named 54/150 m
base fields or a decoded modifier composition rule. Finding a numeric 150 in an
unrelated soldier curve is not range evidence.

**Lights.** All twelve `GBM_Increase_Hip_*_RGT_P10` assets contain the same ten
non-default tuples: two branches, each with four 0.666667 operands and one
1.837117 operand. Links cover 62 weapons, with separate branch values for SF300,
TL_MissionLight and X5LG3, for example. The +15% light placeholder does not follow
from these tuples. The runtime's light-slot boost and unused combo-laser boost
remain documented estimates pending target and on/off activation resolution.

**Sway.** The generated evidence includes local WB, canted, offset, magnifier and
scope objects as well as shared sway assets. Shared P05/M05/P10 factors are
0.6666667/1.5/0.4444444. A sum of -1/0/+1 tags cannot represent the separate aim,
camera and pivot channels. No unsupported numerical total was added.

**ADS.** VSSM's named raw transition index is 4. Its ability's
`Field_c4cea7e8` five-member list contains the regular magazine, basic VSSM barrel,
1P86 optic, FMJ and no ergonomics. The basic barrel links to
`GID_ADSTime_BRL_P10`, with two integer +1 operands. The runtime currently uses
250 ms; the extra-tier interpretation would give the previously discussed 200 ms
candidate, not the reverse. Factory selection is better evidenced, but source
indices still do not independently measure the effective animation transition.

**Regeneration.** `GRX_Glacier_Soldier` GUID
`37efb14f-d146-4998-aa9f-9b6e09108d85` is named `RegenerationDelay` and contains 5.
`Glacier_Soldier.xml` directly references it from `Class_041026f6` GUID ending
`0037`. Frangible P20 stores 4; Flechette-linked P10 stores 2. The baseline is now
source-backed. Native addition, resetting and observed healing start remain
separate validation questions.

**Distribution and recovery.** The per-state exponents and Smooth/Heavy operands
were already retained. Reuse `frosty-smooth-recoil-review.json`,
`frosty-recoil-duration-audit-2026-09-11.json`, and the existing recording handoff.
No repeat fit can turn the current recovery equation or radial sampler into a
native-code finding.

## Remaining validation

These questions need decoded native consumers or new controlled in-game evidence:

- Controller: compare mouse and controller on the same PC/build, in ADS and hip,
  with identical M4A1 builds. Include a sniper control. Separate amount, variation,
  growth and recovery instead of fitting one final scalar.
- Collateral: test M121 A2 Tungsten and the ES 5.7 candidate differences. Record
  primary and subsequent target damage, ammo, body material, distance and armor.
  Resolve the out-of-range case before using a general clamp.
- Spotting: test standard, suppressor, subsonic, and both together. Measure minimap
  and world visibility separately with an enemy observer and bracket the range.
- Lights: compare the same 6P67 build without a light, with a light off, and on.
  Capture stationary/moving hip growth and recovery; use ADS as a control.
- Sway and ADS: retain the exact factory optic/magazine/barrel. Separate camera
  motion from aim motion; measure VSSM transition timing instead of treating a
  source tier or an old site baseline as the measured answer.
- Regeneration: compare standard, Frangible and Flechette from the final hit to
  the first health increase. Test whether another hit resets or combines delay.
- Distribution/recovery: follow the existing recording handoff. Use sufficient
  separated impacts to test radial distributions and independent timing controls
  for delivery, recovery and camera response. Mark fits as fits.

No automatic numerical replacement was made where these material questions remain.
Shared source tables can stay shared; per-weapon source selection is the requirement.

## Verification

- Hit-zone regeneration: 63 weapons, 328 ammo entries, agreement across two raw
  material grids; no missing-attachment base fallbacks.
- Ballistics generation: 63 weapons, 328 explicit ammo selections, 64 projectile
  records; source hash and roster checks passed.
- Global operand generation: fresh graph, 238 objects, 4,235 attachment links,
  750 registry fields, 57 controller bindings; all 189 base projectile/body-material
  combinations agreed across the two grids.
- Exact collateral table byte comparison passed against the named delegate's
  separately extracted resource.
- 18 focused ballistics, damage, shared-link and runtime syntax tests passed.
- Shotgun verifier passed for 16 ammo selections and 36 source hashes.
- Data validation passed for all 63 weapons; ship-surface validation passed.

## Distribution implementation update

Both plotted shot layers now use the direct Frosty exponent interpretation,
`r = spread * U ** exponent`. All 252 source states were checked: 0.5 except
Interdictor moving ADS at 0.67. This supersedes the earlier deferred sampler
status. The linked M39 settled-hipfire analysis supports uniform area; other
states and native consumption remain unverified. See RECOIL_SPREAD_MODEL.md.

## Light names, spotting baselines and collateral follow-up

This section supersedes earlier unresolved light-name and collateral status.

The light target hashes also occur as scalar fields in GS dispersion records.
All five values agree with the corresponding named GRX fields in 248 source
states across 62 weapons (tolerance 0.000002). These identify the target names:

| Target | Name | Changed operand |
|---|---|---|
| `Field_0084b1d1` | `IncreasePerShot` | `Field_5695ee1c = 0.666667` |
| `Field_2ca8533e` | `FiringDecreaseCoefficient` | `Field_98a799ba = 1.837117` |
| `Field_1b9eef5d` | `FiringDecreaseOffset` | `Field_5695ee1c = 0.666667` |
| `Field_4d3f0635` | `NotFiringDecreaseOffset` | `Field_5695ee1c = 0.666667` |
| `Field_aa558d2b` | `IdleDecreaseOffset` | `Field_5695ee1c = 0.666667` |

The two branches belong to hipfire. Their five values are equal in stationary
and moving states, so these comparisons alone do not distinguish the two branch
names. The operation subfields and light activation conditions remain separate
questions; no light behavior was changed in this follow-up. Evidence is retained
in `reference-data/provenance/frosty-light-field-names-2026-09-13.json`.

Spotting: expanded the trace through `PF_SpotSelfOnFire`, the weapon-fire compiled
graph, the named GRX registries and exported game settings. No confirmed field
for the 54 m world or 150 m minimap starting range was found. The screenshot
baselines remain in use. A matching 150 literal in unrelated settings is not
evidence of a spotting baseline. Further work needs a named field mapping or
decoding the graph's inputs/consumer; a byte match alone would not suffice.

Collateral: the operator confirmed that table indices cannot exceed either end.
`scripts/frosty-collateral.py` now generates all 328 supported ammo values from
the retained source trace, using base plus modifier steps clamped to 0..9.
M121 A2 Tungsten: `6 + 3 + 1 = 10`, clamped to 9, multiplier **1.00**.
ES 5.7: FMJ **0.67**, Tungsten **0.83**, Frangible/Hollow Point/Subsonic/Subsonic HP
**0.57** at display precision. All six agree with the attachment audit. Subsonic
and Tungsten screenshots were also visually checked in this follow-up. Source
precision is retained, including 0.666667, 0.833334 and 0.571429.

Verification: 24 attachment-effect tests, all-weapon data validation, and direct
lower/upper-bound checks passed. Source recordings and screenshots were untouched.

## Barrel ADS route verification

All 234 supported weapon/barrel selections match the linked WB animation and
FOV ADS modifier steps already stored by the site. No runtime values changed.
Basic, Short, Light, Cryogenic, Extended Light and Short Light contribute +1;
Extended, Heavy, Heavy Extended and both VSSM barrels contribute zero.
Animation and FOV modifiers are parallel effects, not two additive ADS steps.

This resolves the earlier comparison omission: the regular VSSM barrel has a
GS +1 index binding but no WB animation/FOV ADS modifier. Other GS/WB mismatches
also exist (24 selections in total), including Cryogenic barrels and EF88.
The site matches the WB route; the GS route must not be substituted or added
without explaining the difference. The earlier VSSM 200 ms proposal used only
the GS route. Both VSSM barrels remain at 250 ms with default other attachments.
Source evidence: reference-data/provenance/frosty-barrel-ads-2026-09-13.json.

## GRX field-name map

`scripts/frosty-grx-field-names.py` extends the light-name method to every block
that references a `GRX_Weapons` node (216 files, 5669 blocks). A hash is named
only when one scalar field matches the GRX leaf value in every observation and the
leaf has more than one distinct value. Container fields take the last GRX anchor
segment. No hash received two names. This is name evidence only; operand meaning
and runtime use still need their own checks. Evidence:
`reference-data/provenance/frosty-grx-field-names-2026-09-13.json`.

Result: 72 value-matched names, 24 container names, 11 single-value names (weak)
and 31 ambiguous leaves (constant values shared by several fields).

Names not previously recorded with their hash, grouped by likely use:

| Area | Fields |
|---|---|
| Dispersion containers | `Field_3ed1c995` MinMaxDispersion; `Field_8c7ee85a` Standing; `Field_956304be` Crouching; `Field_97ff0ca4` Prone; `Field_e2ae7c09` Moving; `Field_a059dd20` JumpingSprinting; `Field_7baf4297` MinAngle; `Field_60e4e484` MaxAngle |
| Table indices (GS) | `Field_d94fe6ad` MovingZoomedMinAnglesArrayIndex; `Field_fe708077` UnzoomedMinAnglesArrayIndex; `Field_cee5ebfe` StationaryZoomedMinAnglesArrayIndex (weak); `Field_8c46f71b` WeaponHipMoveSpeedMultiplierIndex; `Field_dcb8bf9e` WeaponZoomedMoveSpeedMultiplierIndex; `Field_db03e8a9` WeaponZoomTransitionIndex; `Field_e7f4ce7c` AltAnimationZoomSettingsIndex; `Field_5198399a` SprintSettingsIndex |
| Recoil (GS `Recoil` struct) | `Field_f888cb38` RecoilDirection; `Field_ce4b3347` VerticalRecoilMin; `Field_a63f14a6` VerticalRecoilMax; `Field_9546447c` VerticalRecoilIncrease; `Field_205e8a1c` MaxVerticalRecoil; `Field_edbd0711` HorizontalRecoilLeft; `Field_65700a5d` HorizontalRecoilRight; `Field_8bd6dcdd` UsePolarRecoil; `Field_39740463` RecoilDecreaseNorm; `Field_9045ba17` RecoilDecreaseExponent; `Field_04490b34` RecoilDecreaseOffset; `Field_5a02dd65` RecoilDuration (weak) |
| Camera recoil | `Field_36c2f877` CameraRecoilAmount; `Field_9532eb28` CameraRecoilWhenZoomedAmount; `Field_7f1bb9d4` IdleCameraRecoilWhenZoomedAmount; `Field_38a38f94` IdleCameraRecoilWhenZoomedAmountSwitchTime; `Field_f53f8877` CameraRecoilUseTimeSinceLastShot |
| Spread decay | `Field_66d08b86` IdleDecreaseCoefficient; `Field_0b26c028` IdleDecreaseExponent; `Field_b5ee0f41` NotFiringDecreaseCoefficient; `Field_0f79aaed` NotFiringDecreaseExponent |
| Reload (`Struct_b50f190f`) | `Field_9c1e1476` ReloadThreshold; `Field_fc66e75e` ReloadTimeBulletsLeft; `Field_c0c7c72f` ReloadDelay; `Field_b480c17a` PostReloadDelay; `Field_c59cc6a8` MaxAmmoCountInWeapon; `Field_82265a82` MinAmmoCountInWeapon |
| Projectile | `Field_94869d67` StartDamage; `Field_bc7acc94` EndDamage; `Field_e5b11905` DamageFalloffStartDistance; `Field_68be3481` DamageFalloffEndDistance; `Field_5ef7b9a1` TimeToLive; `Field_7e2be65f` DamagePenetrationMultiplierIndex; `Field_9ba8b76b` DamageProtectionMultiplierIndex; blast/shockwave radius and damage fields |
| Other | `Field_2320e742` BurstsPerMinute; `Field_43a8d9ab` OverHeat; `Field_72a2b562` HeatPerBullet and `Field_e6120d22` HeatDropPerSecond (weak) |

Potentially useful leads:

- Optic camera recoil is unmodeled. All 34 `GCR_*` optic modifiers enable operands
  on `CameraRecoilWhenZoomedAmount` and `IdleCameraRecoilWhenZoomedAmount` (for
  example `GCR_03x00_P00`, `Field_bbbfe9cc = 0.377135`). The analyzer has no camera
  recoil model; the visible effect and operand equation are unverified.
- `RecoilDuration` (`Field_5a02dd65`) is only weakly named by GRX, but it agrees
  with the modeled `GRM_AutoIdentifier_P00` recoil-duration addition.
- The empty-reload evidence already stores `Struct_b50f190f` values unnamed; the
  reload names above now label those fields.
- Unresolved hashes with known context: ZDA columns `Field_6c73f45b`,
  `Field_624b1a88`, `Field_bd300f62` (probable states in STAT_LADDERS.md), and
  `WME_DynamicPivot` multipliers `Field_f235e44f`/`Field_a4f104cc` (see
  ATTACHMENT_MODEL.md belt-box section). Common 32-bit hashes (FNV-1/1a, CRC32,
  Murmur3, djb2) did not reproduce known names, so hashing candidate names is not
  available.
