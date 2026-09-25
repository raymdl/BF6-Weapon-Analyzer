# Attachment and optic data in Frosty

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Data graph](DATA_GRAPH.md) · [Attachment bugs](../ATTACHMENT_BUGS.md) · [Open questions](OPEN_QUESTIONS.md)

What the game data says about attachments and optics, and which site values are
generated from it. The site model is in the [attachment model](../ATTACHMENT_MODEL.md);
game data errors are in [attachment bugs](../ATTACHMENT_BUGS.md). The link path from a
site choice to its modifiers is in the [data graph](DATA_GRAPH.md).

## Exhaustive source census (1.4.3.0)

The [reviewed primary-root census summary](../../reference-data/provenance/frosty-audit-branches-summary-2026-09-23.json)
(full report in the external audit reports directory, pinned by hash)
covers all 64 candidate base weapon triples: 6,112 referenced branches, 6,111 referenced
action objects and 14,015 selector references. All branch/action references resolve within
this set. Its 358 WPM selector lists support 6,007 selector-to-WB joins. The GS pass
covers 8,367 binding structures across eight structure types, supporting 5,089
selector-to-GS joins. The [parent fresh-decode check](../../reference-data/provenance/frosty-audit-branches-validation-2026-09-23.json)
independently matches every root branch/action reference, selector identity and GS
binding tuple. Earlier one-structure-type results were incomplete and are superseded.
Eight references whose target XML was absent were resolved through the catalog and
hash-checked raw target objects. Layout warnings remain.

The [complete action-field check](../../reference-data/provenance/frosty-audit-action-fields-2026-09-23.json)
freshly enumerates all 6,115 action objects in those raw bodies. Four are outside
the branch census: one in M27IAR and three in MP7A2. They have no internal caller
in their decoded source files; global/native use remains unresolved. All eight
action fields are retained. In addition to the main selector list, 191 imports
occur in `Field_f1f008ba`, 135 in `Field_2717f5c2` and 139 in `Field_072fe4eb`.
These fields include underbarrel and bipod references and require separate joins.
The earlier selector-to-GS/WB totals cover `Field_7e54e22c` only.
The [linked Ability ID check](../../reference-data/provenance/frosty-audit-action-ability-ids-2026-09-23.json)
matches all 139 action IDs to the exact linked Ability's ID. This confirms the
serialized association for 135 underbarrel and four bipod actions; it does not
establish when the game executes them.

The [underbarrel secondary-selector trace](../../reference-data/provenance/frosty-audit-underbarrel-parts-2026-09-23.json)
joins all 135 underbarrel actions across 27 weapons to their parent WB parts.
Its 190 secondary-selector references yield 393 single-selector matches across
14 shared parts and three inline parts. These are structural matches, not fully
evaluated activations. The four M320 families each have base, Plus and Reload
parts; M26DB has base and Reload parts. Plus parts list the Grenadier trait as a
second selector. Reload parts list Assault Gadget Reload and contain the same
`1.1` reload operand. Native selector evaluation and timing remain unresolved.

The shared M320 parts reference `PrimaryFire_M320` and `GS_M320HE`; smoke, AT and
thermobaric parts also carry distinct projectile references. M26DB contains a
buckshot firing reference and a separate Dragon's Breath projectile effect with
priority `9000`. That composition needs native application proof. HK417A2, M4A1
and XM7 also have inline Generic parts with a draw-step operand of `1`.
All 40 unmatched secondary references are `U_WPM_UBL_Any` in the checked parent
WB part lists; they are not evidence of global non-use. The earlier draft's zero
WPM counts checked only the main action list and cannot describe these paths.

The [SRU membership check](../../reference-data/provenance/frosty-audit-sru-validation-2026-09-23.json)
freshly validates all five SRU roots and their 186 distinct member targets. The four
M320 lists share 186 unique entries; M26DB has 183. The three M320-only entries are
the 1P86, QMK171A and M145MGO optic selectors. Every list repeats ANPAS35_Base at
indices 68 and 69. None of the SRU member targets overlaps the same action's
secondary selectors in the 135 checked actions. This confirms membership, not
whether the game adds, removes or resets these selectors. The repeated entry is
not a proven gameplay defect.

This is structural coverage, not native activation or multiplayer availability.
The progression-to-metadata join leaves 537 branches without a matching metadata
record and one with two matches. A [600-body raw check](../../reference-data/provenance/frosty-audit-branch-metadata-gaps-validation-2026-09-23.json)
confirms all 537 progression links and targets. None has a reference from the
scanned `Class_a9b2eb87` metadata class in the captured index. This is a metadata
join gap, not a missing raw target or proof that the attachment is unavailable.
A [follow-up grouping](../../reference-data/provenance/frosty-audit-phase1-checkpoint-2026-09-23.json)
reconciles the 537 branches into 135 known underbarrel choices, 51 default-like
selector paths, 350 further attachment action candidates and one VSSM branch.
The 51 paths include 46 `_Empty`-named records and five named optics: one Steiner
CQT and four ZT410 records. Their exact structural joins are checked; neither
names nor paths prove default selection or no-op behavior. VSSM branch 93 links to
`U_ATT_VSSM_Stock`, but has no exact identity join to the separate Folding Stock
ADS spread receipt. Availability and native activation remain unresolved.
The [Ultimax follow-up](../../reference-data/provenance/frosty-audit-ultimax-metadata-2026-09-23.json)
finds that `Short` and `ShortBarrel` share a progression entry, while the captured
Equipment lists select `ShortBarrel` by exact GUID. This resolves that source
association without proving that the other record is globally unused.

The [additional Ability census](../../reference-data/provenance/frosty-audit-additional-abilities-validation-2026-09-23.json)
checks another 142 roots: 135 UBL-labelled and seven melee-labelled records, not
bipod variants. Their branch arrays are empty, but each has an exact captured caller:
135 attachment action objects and seven equipment objects. Fresh raw decoding checks
all 142 roots and all 34 caller files, including both file and object GUIDs. These
records remain in scope. Empty branch arrays do not mean unused abilities. Their
other fields and the caller selectors still need review; source links alone do not
prove runtime activation.

## Composition rules

- A package's `WME_*` effects apply to a weapon only when that weapon's WB lists the
  package's part. M2010 ESR lists `WPM_BTM_FastBOLT02_W15`; L115, Mini Scout and
  Interdictor select that package but do not list its part.
- GS bindings are per weapon. `Vertical03_W20` has a recoil binding in `GS_BREN3` and
  none in `GS_M27IAR`.
- One action can select several packages; `scripts/frosty-multi-package-scan.py` lists
  them. Two such cases are game errors (Slim Angled, M121 A2/M45A1 ammo).
- `_W##` suffixes on `U_WPM_*` names are not costs; `Field_6ee865a5` is the only cost.
- WB animation and FOV ADS effects are parallel. When they agree they count once; a
  conflict stops generation. The GS ADS route is separate and not added.
- Magazine shifts on the site are relative to the default magazine. Regular packages
  (`U_WPM_MAG_Std_W05`) add draw +1 (site −1), so other magazines draw slower than the
  default even without a draw operand.

## Availability

- 5,542 attachment records; 11 have no branch in the ability root list. Of 5,531 linked
  branches, 5,388 have kill-switch default False and 143 True. These are exported
  defaults, not a live roster.
- A True default is good exclusion evidence (all 15 unmapped SubsonicFrangible assets
  are True). An unset switch does not prove availability.
- Source presence is not availability: SVK-8.6 Adjustable Angled and AK-205 Underslung
  Mount exist in the data but are not offered in game, and were removed.

## Unmatched branch follow-up (1.4.3.0, 23 September 2026)

The [reviewed branch evidence](../../reference-data/provenance/frosty-attachment-branches-reviewed-2026-09-23.json)
keeps source identities separate from live availability:

- M4A1 `ERG_Magwell` has a zero-cost MagazineWell category entry in the Ergonomic
  slot and selects `U_DPF_MagWell_Empty`. It is distinct from `ERG_FlaredMagwell`,
  which selects magwell-flare art and its shared modifier selector. Do not create
  a second player-facing Magwell Flare from the plain record; its purpose remains
  unresolved. Both inspected registry defaults are false.
- `AD_M4A1_ERG_Flare` directly resolves to **Mag Flare** (`ECC4BCCE`) and
  **Enables reloading while aiming down sights.** (`ECC670D6`) in the current US
  strings export. This corrects a transcription error in the worker draft that
  made the strings appear absent. UI wording is not native effect activation proof.
  The [exact package trace](../../reference-data/provenance/frosty-mag-flare-capability-2026-09-23.json)
  links the selected FlaredMagwell package to `WME_ADSReload_P10`, which contains
  boolean settings and no established reload-speed multiplier. A future utility
  indicator could distinguish this from a numerical stat change; active behavior
  and weapon eligibility still need validation.
- BROD 3 is source `BREN3`, as established by the weapon identity mapping.
  Its treated-barrel metadata directly names **Cryo**. The associated registry
  default is true; the current live offer is unverified.
- All 15 Subsonic Frangible attachment/progression/ability branches have individual
  registry references with true defaults. File hashes and all 15 registry values
  were checked, with three branch samples independently decoded. Current menu
  offers and server overrides remain unverified; true defaults are not proof of
  active exclusion or gameplay behavior.

The current-build strings file is under `builds/1.4.3.0/xml/Common/Localization/`;
the XML overlay holds a different strings snapshot. The reviewed report records
the exact current file hash. Stale metadata XML was replaced by raw decoding for
this review; conservative descriptor-layout warnings remain.

## Generated site values

| Area | Generator | Result |
|---|---|---|
| Barrel ADS | `scripts/frosty-barrel-ads.py` | 233 unique weapon/barrel selections (234 records). Basic, Short, Light, Cryogenic, Extended Light, Short Light +1; Extended, Heavy, Heavy Extended and both VSSM barrels 0. M4A1 Basic 200 ms; both VSSM barrels 250 ms. |
| Grip, laser, magazine handling | `scripts/frosty-attachment-handling.py` | 1,487 selections, 5,489 fields. Grips and lasers store per-weapon `frostyModifiers`; magazines use their existing per-weapon fields. |
| Sniper brakes | `scripts/frosty-sniper-brakes.py` | 16 weapon/brake pairs, +6 amount tiers (`GRM_Recoil_MZL_Bolt_P10`). |
| Linear Comp and burst | `scripts/frosty-assumption-review.py` | 45 Linear Comp and 8 burst selections (below). |
| Slots and prerequisites | `scripts/frosty-attachment-compatibility.py` | See [data graph](DATA_GRAPH.md#slots-and-prerequisites). |
| Collateral, ballistics | `scripts/frosty-collateral.py`, `scripts/frosty-ballistics.py` | See [Weapons](WEAPONS.md). |
| Tooltips, optic categories | `scripts/frosty-attachment-tooltips.py` | See [UI text](UI_TEXT.md#current-site-mapping). |

All generators accept `--root <Frosty export root>`; most accept `--check` for a
read-only comparison. They stop when a generated field loses its source mapping or the
input hashes change. Commands: [maintenance](../../MAINTENANCE.md#regenerate-attachment-modifiers).

### Handling details

- **Coordinates, not effects.** M60 and PW7A2 base indices come from `GRX_Weapons`
  (M60 ADS 2 → 1, M60 ADS movement 6 → 4, PW7A2 ADS movement 10 → 8). Bases and magazine
  modifiers changed together, so results are unchanged
  ([proof](../../reference-data/provenance/frosty-handling-coordinate-proof.json)).
- **Unbound selectors.** DRS-IAR Alloy Vertical and both RPK-74M 30-round magazines
  generate from matched sibling modifiers; three extra selectors have no binding and are
  recorded, not assigned values
  ([evidence](../../reference-data/provenance/frosty-handling-unbound-selector-review.json)).
- **Green laser.** The earlier handling trace finds the hip step on normal LA-23,
  but not on the `_IR_SP` variant. The current DRS-IAR mapping retains normal
  LA23PEQ and LA-23 IR SP alternatives. Their runtime selection and the latter's
  mode exclusivity are not established; the suffix alone does not exclude it.
  The [visibility review](../../reference-data/provenance/frosty-site-laser-visible-2026-09-23.json)
  preserves both source records.
- **Shotgun tube variants.** M1014 4 Rnd / 4 Fast are `MAG_Compact1` / `Compact2`; M87A1
  5 Rnd / 5 Fast are `590A1 MAG_Compact1` / `Compact3`. Variant values (99 tube; 4 and 5
  speedloader) identify the variants; they are not reload multipliers.
- **VZ.61 "lasers".** Canted, Folding, Ribbed and Stippled Stubby and Compact Handstop
  are grips on a shared rail.
- **Belt boxes.** M240L 75 Rnd binds `GDM_Array_ADSMoveDispersion_MAG_P10` (+1: 0.32 →
  0.22°). The L110/M123K 200-round selector has no spread binding; the site uses 0
  (bug entry 7).
- **Suppressor identities.** `ImprvdSuppressor01` is CQB, `ImprvdSuppressor02` is
  Lightened.

### Magazine capacities and reload operands (23 September 2026)

The [current magazine review](../../reference-data/provenance/frosty-site-magazines-2026-09-23.json)
traces all 287 selections through their exact ability actions, selectors and WB
effect lists. It checks 569 site leaves against descriptor-derived raw values.
The site reports nominal magazine rounds: 263 selected capacities are one below
the raw configured count, DB-12 is two below, and 23 match directly. This is a
representation and loaded-state question, not an automatic correction. The
current `Mag Size` tooltip says rounds in the selected magazine; `sim/core.js`
does not use that number for cadence. A future loaded-capacity value should state
whether chambers are included and distinguish spawn, empty and tactical reloads.

Of 282 reload-tier leaves, 101 select the raw 1.13 multiplier, one selects 1.277,
and 179 are neutral with no reload-speed effect in their selected graph. M121 A2
50 Fast is the exception: its selected package replaces `ReloadInfoArray`, with
`5.6 / 1.009009 ≈ 5.550` seconds. The site's generic tier gives
`6.267 / 1.13 ≈ 5.546018` seconds. A selection-specific animation override is a
source-backed proposal; native activation is still unverified. Ordinary 60 fps
shot timing cannot reliably distinguish this roughly four-millisecond difference.

The five existing magazine animation overrides are also source-backed after
time/speed division and millisecond rounding: M240L 75/100 Rnd 7100 ms, M60
50 Rnd 4534 ms, PP19 53 Rnd 2667 ms and RPK-74M 95 Rnd 2950 ms.
The [exception review](../../reference-data/provenance/frosty-reload-exceptions-leaves-2026-09-23.json)
retains the separate PP19 bug and composed-observation evidence.

### Ammunition effect operands (23 September 2026)

The [current ammo review](../../reference-data/provenance/frosty-site-ammo-effects-2026-09-23.json)
checks 83 effect leaves against exact attachment selectors and descriptor-offset
raw fields. All 337 applicable weapon/ammo comparisons agree. These include
subsonic recoil shifts of +1, penetration shifts of -6 on M2010/SV-98/PSR and -7
on Mini Scout, and the -9 hip-spread tier shifts on the four site shotguns.
The seven shared recoil/movement tier values agree for every applicable current
selection after per-weapon overrides are accounted for.

The same review checks the six shared spotting factors and the frangible/flechette
regeneration additions. Selected source operands support the site's index sums,
reversed spread/movement ladder signs, spot factors and delay additions. Native
activation and composition order remain separate questions.

All 77 class-based collateral fallback values are inactive for current choices:
all 328 selectable weapon/ammo pairs have a per-weapon collateral override. Their
retained values are software fallback data, not verified effective mechanics.

The [subsonic velocity review](../../reference-data/provenance/frosty-site-ammo-velocity-2026-09-23.json)
sources all 26 tier inputs from selected velocity factors and checks the slug ADS
spread increment (0.05 in both source movement branches for four shotguns).
Five prior screenshot-based absolute velocity inputs discarded source precision:

| Weapon / ammo | Prior site input | Base source velocity × selected factor |
|---|---:|---:|
| M417 A2 Subsonic / Subsonic HP | 273 m/s | 560 × 0.488570005 = 273.599203 m/s |
| PW7A2 Subsonic Tungsten | 341 m/s | 576 × 0.592999995 = 341.567997 m/s |
| USG-90 Subsonic / Subsonic HP | 265 m/s | 543 × 0.488570005 = 265.293513 m/s |

Every integer equals the floor of the source-derived candidate. This can explain
the original menu transcription; it is not evidence that the menu is wrong.
The site now retains these source-derived values. Ammo/barrel composition remains
an explicit native-consumer limit.

### Recoil operands

| Attachment | ADS amount / variation steps | Hip amount / variation steps |
|---|---|---|
| Linear Comp | −1 / +3 | −1 / +3 |
| Burst Training; SL9 Burst Mode | 0 / +3 | 0 / +3 |
| GRT-BC Burst Training | +1 / +3 | +1 / +3 |

Burst attachments select a fire-mode modifier and a behavior node (mode mask 8 = enum
value 3) whose selector the GS recoil bindings use. The +1/−1 amount operands cancel on
ordinary burst attachments; GRT-BC has +2/−1.

Applied follow-ups:

- Smooth Bolt: −0.5 time-exponent addition on 17 muzzles.
- `GRM_AutoIdentifier_P00`: −0.0006 s duration addition on five weapons, after any muzzle
  duration override.
- Mini Scout Tungsten: −7 amount steps (combined −1/−6 links).
- Slim Angled: moving-ADS index −1 on PSR, SV-98, L115, Mini Scout and
  Interdictor (bug entry 1a). KS18K is excluded; see the trace below.

The [current muzzle operand audit](../../reference-data/provenance/frosty-site-muzzle-operands-2026-09-23.json)
checks 172 recoil/spread/handling leaves: 151 match selected source operands and
17 are neutral or inactive software fallbacks. The audit recorded four source questions.
PP-19 Flash Comp has no GS selector binding in the captured body, and its WB package
contains a spotting effect without a recoil modifier. The site now uses neutral
ADS/hip recovery factors and no duration override for that choice. L115 Standard
Suppressor also lacks the GS hip-spread index binding; the site now uses zero tier
shift. These changes follow the recorded bug observations; the bounded graphs alone
do not prove native absence. See the attachment-bug records for those observations.

A raw byte search confirms the PP-19 result: `GS_PP19` does not contain the
`U_WPM_MZL_FlashCompensator_W15` selector GUID, while the `GS_UMP40` control does.
It is bound on 39 of the 40 Flash Comp weapons. This is the same kind of binding
omission as the L115 suppressor; see [attachment bugs](../ATTACHMENT_BUGS.md) #6, which also has the operator report.

### Current grip and barrel field review (1.4.3.0, 23 September 2026)

The [grip/sight leaf review](../../reference-data/provenance/frosty-site-grips-sights-effect-review-2026-09-23.json)
covers 167 site entries. Its current selected GDM trace contains 535 moving-ADS
bindings in `Field_2ffeb6ac`, nine distinct-target KS18K bindings in `Field_b30a73ed`,
and 151 hip bindings in `Field_b53510be`. Compare effective per-weapon overrides,
not just shared catalog values. The QD Grip Pod and sniper Slim Angled outliers
match their mapped source operands. A missing direct selector operand is retained
as a bounded source gap, not proof of zero effect. The nine `noEffect` flags are
Analyzer UI flags; they are not native boolean findings.

The [heavy-family barrel review](../../reference-data/provenance/frosty-site-barrel-ads-spread-2026-09-23.json)
checks 61 selected weapon/barrel choices. Heavy, Heavy Extended and Cryogenic
match the site's four ADS spread factors: increment `0.666667`, firing decrease
coefficient `1.837117`, firing offset `0.666667`, and not-firing offset `0.666667`.
All 488 operand checks agree across both source branches, decoded values and raw
bytes. The [barrel velocity review](../../reference-data/provenance/frosty-site-barrel-velocity-2026-09-23.json)
sources `0.8/1.25` factors; the site's `-1/+1` tiers encode those values through
`0.8^(-tier)`. This does not claim that the native source stores those tier integers.
Native activation, priority and composition remain unresolved.

### Ergonomic attachment field review

The [ERGOS receipt](../../reference-data/provenance/frosty-site-ergos-2026-09-23.json)
records 51 effect leaves with exact selected attachment routes and raw bytes.
Draw timing uses the selected WME's `Field_9540bd8e=+1`; the site's `-1` shift is
its inverse representation because the resolver subtracts the shift. Mag Catch's
`1.063` maps to `Class_9705264b/Field_348b8cd1` in `WME_ReloadSpeedSmall_P05`.
VSSM automatic RPM maps to the WB's `799.999` RateOfFire, distinct from its single
shot rate and the Folding Stock's separate single-fire modifier.

Buffer's `visualRecoil=-1` only selects the site's "Decreased" badge. Do not read
it as a measured magnitude or a native `-1` operand. The selected package contains
an opaque `Field_c4814c93` with `-1/0` variants and a separate three-component
`0.75` vector at `Field_3b707594`; their consumers and relation to this badge remain
unresolved. A recording can test visible motion but cannot identify that anonymous
field by itself. Other unmapped recoil tier and duration leaves retain their exact
source routes as semantic blockers; equal numbers are not accepted as mappings.

### ADS Bolt and sniper cadence

The [ADS Bolt source receipt](../../reference-data/provenance/frosty-site-ads-bolt-cadence-2026-09-23.json)
checks the site ID `ads_bolt` (DLC Bolt), available for M2010ESR, SV98M, MRAD and
L115A3. Its exact selector binds `WPM_ERG_DLCBolt_W25`, which imports
`WME_ADSBoltRechamber_P25`. The latter stores `Field_68c40b57=true` (one byte
`01` at offset 144). The package supplies a capability flag, not a demonstrated
25% speed bonus. Mini Scout and Interdictor are not in this attachment's current
four-weapon choice set; their base behavior needs separate comparison.

The Analyzer stores `noEffect=true` and does not apply an ADS Bolt cadence branch.
The proposed output must distinguish the next accepted shot from the next shot
with ADS fully restored. Without the attachment, ADS exit, rechambering and ADS
entry may affect the latter. Their overlap and the meaning of the zoom completion
fraction are unresolved, so adding three full durations is not yet justified.
Keep Recon's separate bolt-speed modifier fixed during the attachment comparison.
See [weapon timing](WEAPONS.md#timing-fields) and
[capture rank 6](../working/BF6_CAPTURE_PRIORITIES.md#6-reload-timing).

## Lights

All twelve `GBM_Increase_Hip_{S1..S5,A30..A60}_RGT_P10` assets hold the same ten entries:
two hip branches (`Field_447d6d51`, `Field_0a160c57`), each with

| Target | Name | Operand |
|---|---|---|
| `Field_0084b1d1` | `IncreasePerShot` | ×0.666667 |
| `Field_2ca8533e` | `FiringDecreaseCoefficient` | ×1.837117 (= 0.666667^−1.5) |
| `Field_1b9eef5d` | `FiringDecreaseOffset` | ×0.666667 |
| `Field_4d3f0635` | `NotFiringDecreaseOffset` | ×0.666667 |
| `Field_aa558d2b` | `IdleDecreaseOffset` | ×0.666667 |

Links cover 62 weapons. The site applies these factors to 137 supported light
selections, treats a selected light as on, and does not model idle recovery. Native
activation is not decoded.

### Laser visibility remains a semantic blocker

The [visibility review](../../reference-data/provenance/frosty-site-laser-visible-2026-09-23.json)
traces the site's `laserVisible` flag to its enemy-visibility tooltip. The inspected
candidate `Class_bc0062dc/Field_32cf19f5` is true for every laser type, including
5 mW Red, 50 mW Violet and the Red combination device, whose site flags are false.
This rules out a direct use of that flag as the site's classification; it does
not prove that those site values are wrong. The candidate's meaning and native
visibility consumer are unknown. Keep source alternatives and their scope limits
in the receipt. The rank-11 paired beam/dot test checks the displayed claim without
expanding FX or material graphs.

## Sway

206 weapon-sway and 3 camera-sway objects. Shared P05/M05/P10 factors are
0.6666667/1.5/0.4444444. The site shows muzzle and magazine amount changes as a
percentage against the default loadout (magazine strengths include −33.3% and −55.6%;
adverse muzzle factor 1.5 gives +50%). Optic and camera sway are not shown, because the
site's six sight categories do not identify one source optic. `WME_DynamicPivot` uses
`Field_f235e44f`/`Field_a4f104cc` multipliers; canted iron sights set only
`Field_f235e44f` (2.5 or 3).

The [23 September optic discovery](../../reference-data/provenance/frosty-optic-discovery-2026-09-23.json)
captured `Affector_HoldBreath` and `PresEx_HoldBreath` from the registered hotfix
(Head 4892087). The expression's external pointer resolves to the existing
`SoldierOnlyPublicChannels.IsSniperHoldingBreath` object; the collection also
contains `InputBreathControl`. The expression references compiled resource
`08a1a89d496bbf73`. These records do not establish hold duration, sway reduction,
or standard multiplayer activation. A bounded search of 230 older soldier raw
captures found no caller of the expression. Keep breath-control modeling blocked
on an activation/consumer trace or controlled measurements.

The later [multiplayer ability review](../../reference-data/provenance/frosty-multiplayer-ability-candidates-reviewed-2026-09-23.json)
found a direct `Ability_StanceFlak/Field_a21a7b29[0]` import of that same
`Affector_HoldBreath`. Its separate StanceFlak expression imports `CurrentStance`,
`IsBenefittingFromBipod` and the left/right/up mounted channels. This supplies an
authored ability caller for the affector. It does not decode the condition, identify
an active standard MP class, or establish a breath-control/protection bonus.

## VSSM barrel ADS follow-up (1.4.3.0, 23 September 2026)

The [reviewed source trace](../../reference-data/provenance/frosty-vssm-ads-reviewed-2026-09-23.json)
confirms two separate paths. `GS_VSSM/Field_4d248d91[11]` binds
`GID_ADSTime_BRL_P10` to the regular-barrel selector
`2d77eab2-17a5-48bb-b917-3a35913e0dd4`. Both integer modifier operands are 1.
The WB package list is `Class_542ac52c/Field_0cd9f20f[72:74]`: its regular and
no-port packages contain four silenced/audio/spotting effects each, with no ADS
animation or FOV timing effect in either package.

Six raw assets passed independent hash and file-GUID checks. The GS/WB containing
layouts retain decoder warnings. The raw enum value 0 is labeled `Field_84e57075`
in XML; that label alone does not identify a native calculation.

Keep the separate GS tier visible in research. It is not evidence to add another
delay to the current 250 ms WB-derived value. A controlled regular/ASM barrel
comparison with the factory optic and a fixed magazine, or the native GS consumer,
is still needed to determine its effect on completed ADS.

The [63-weapon ADS comparison](../../reference-data/provenance/frosty-site-ads-2026-09-23.json)
also identifies an Interdictor exception. Full Angled selector `8ad0e9cd…` maps to
GS binding 1; Slim Angled has that selector and `8cf80d8c…`, mapping to bindings
1 and 2. Both bind the +1/+1 ADS operand package. The site gives one tier to each
grip. Whether the native bindings add, deduplicate or use priority is unresolved.
The ranked capture plan gives 300 versus 366.667 ms predictions for Slim Angled
with Basic barrel, Standard ammo and 5 Rnd held fixed.

## Spotting candidates

The [exact-choice audit](../../reference-data/provenance/frosty-site-spotting-2026-09-23.json)
checks 653 muzzle, 233 barrel and 328 ammo choices. Four selections bind an
SP-prefixed suppressor package carrying 0.1 at priority 9001: M39 EMR/M417 A2
CQB and DRS-IAR/M2010 ESR Lightened. The site uses 0.14 (21 m); a controlling
0.1 package would give 15 m. Do not multiply the linked packages into 0.014
without native composition evidence. A prefix alone does not exclude these
multiplayer-bound packages.

[L47](../../reference-data/provenance/frosty-2026-09-24-L47-selected-spotting-chain.json)
checks the exact M39 EMR WB import through the selector-matching SP wrapper to
its recorded WME target. Three raw-backed assertions pass. This strengthens one
existing association; Attachment/AAM identity comes from the prior mapping.
Native activation and composition remain open, so the existing rank-1 capture
and site factor stay unchanged.

[L49](../../reference-data/provenance/frosty-2026-09-24-L49-spotting-package-context.json)
also verifies the ordinary wrapper at WB index 81 with the same selector. Both
are listed; this does not prove eligibility or a winner. SP metadata priority
9001 and two opaque false flags supply no verified mode rule. Keep the existing
spotting test; neither package naming nor priority establishes composition.

VSSM's actual default selects `vssm_suppressed`, whose package imports P35
(world 0, minimap 0.06); the site gives 0/9 m. PP-19 Flash Hider and Flash Comp
both bind `WME_SpotRange_3D_P10` (world 0, minimap 1), matching site factors.
These checks resolve exact associations; activation and priority remain open.

## Optic categories and costs

- The site keeps six sight categories: Iron Sights (5), Standard Optic (10), Variable
  Low (20), Variable High (25), Thermal (25), Thermal Hybrid (35).
  `WEAPON_ATTS[id].sight` restricts categories; `sightPoints` overrides cost (iron 15 on
  six bolt-actions, including the Interdictor since 1.4.3.0).
- `optic_category` in `scripts/frosty-attachment-tooltips.py` classifies each Frosty
  optic by its UI label only ("Basic Sight" = iron; variable ranges listed explicitly).
  It stops on an unknown label or two costs for one category on one weapon.
- `scripts/optic-costs.test.mjs` compares the newest
  `frosty-optic-category-mapping-*.json` with `data/attachments.json` (category set,
  `sightPoints`, default costs).
- 350 site optic choices map to 1,927 Frosty sight records. Optic names:
  [UI text](UI_TEXT.md#attachment-and-optic-names-aam-records).

## Optic render FOV and zoom

Evidence: [frosty-optic-render-fov-2026-09-16.json](../../reference-data/provenance/frosty-optic-render-fov-2026-09-16.json).
Field meanings come from values and in-game screenshots.

### Finding the part an attachment uses

Take the attachment's selector GUIDs (the `selectors` in
`frosty-optic-category-mapping-*.json`). In the WB, the part in `Field_0cd9f20f` whose
`Field_819acc98` lists the GUID is the part (an external `WPM_*` file or an inline
`Class_897c99a7`). Follow its local pointers to `Field_7768ebf2` (render FOV) and to any
`Class_fe7cd16a` (aim override). Ignore inline `U_ATT_*` model parts that list the same
selector without an aim; they caused about 35 false aim mismatches.

### Render FOV

`Field_7768ebf2` is the weapon render FOV in degrees; 55 is the default. It changes how
large the weapon, optic and arms are drawn, not the world zoom.

- **RPK-74M and L115 (bug entry 11).** They link the base
  `WPM_SCP_{RMR,RomeoX,EotechEFLX,AcroP2,TrijiconSRO,ShieldCQS}` parts (55). Other long
  guns use `_Riser` or `_LowRiser` parts at 40 (CQ RDS 44). Confirmed in game on the
  RPK-74M: the optic looks small and the arm stretched.
- **Consistency.** 57 of 63 optics have one value on every weapon. Riser, low-riser and
  mounted versions give the same value everywhere; only the six base parts differ.
- **Pistols.** ES 5.7, GGH-22, P18 and M45A1 use the base parts; M44, vz. 61 and M357
  Trait use `_LowRiser` (40). 55 on the four may be unintended; not checked in game.
- **Mounted parts.** `RMR_Mounted` (38), `AcroP2_Mounted` (42), `TrijiconSRO_Mounted`
  (42) and `EotechELFX_Mounted` (55) are not linked by any WB. `ShieldCQS_Short_Mounted`
  (44) is linked by one weapon.
- **M2010 ESR.** Inline model parts hold SDO 55 (shared part 34) and LERT 59 (shared 20).
  Which value applies is not known.
- **No formula.** Render FOV does not follow magnification (correlation about −0.6 with
  log magnification). 6× to 10× scopes use 16–28; red dots and low-power optics mostly
  28–44; at 3.50× the SDO has 34 and the MGO 48. Read the value per part.
- **Rejected causes.** Riser model height (same model and aim), the
  `Field_149939ab`/`Field_e9129d03` pair (1.25–1.3 on some riser parts; the reviewed
  MRO blocks have the pair at 1.0, without that non-unit value) and the zoom levels.

The [23 September raw review](../../reference-data/provenance/frosty-optic-parts-2026-09-23.json)
confirms the distinct M2010 paths: WB part entry 15 selects local object 34, which
leads through object 41 to model/render object 6 (55); LERT's local object 30 leads
through 42 to object 5 (59). Shared parts at entries 11 and 48 hold 34 and 20.
The local render objects retain layout warnings. Named GRX anchors identify the
modifier structure, but do not establish native precedence. Do not treat array
order as priority or these render records as aiming-controller overrides.
The same review reads the Riser field pair as 1.3 on RMR and 1.2 on Acro P2;
sampled RMR base and MRO values are 1.0. The pair's physical meaning remains unknown.

### Iron sights

- No iron-sight part overrides the aim, so every weapon uses `Aim_1x50` → `1_5xZoom`:
  **1.50×**. 1.00× optics (`Aim_01x00_PiP`) zoom less. The operator confirmed this in
  game; the site shows "Iron Sights (1.50x)".
- Iron render FOV is weapon specific: 18 (KTS100 MK8) to 50, except SL9 and four
  pistols at 55. The SL9 was checked in game with no visible effect found; the value may
  still be unset by mistake. Screenshots with very different values (SL9 55, KTS100 MK8
  18, PW7A2 50) show the same world zoom; only the weapon size differs.

### Zoom levels

| Asset | Camera FOV (°) | Zoom | PiP factor |
|---|---|---|---|
| `DefaultBase`, `1_0xZoom`, `Zoom_01x00_PiP` | 55 | 1.00 | 1 |
| `1_25xZoom` | 45.21893 | 1.25 | 1 |
| `1_5xZoom` | 38.27812 | 1.50 | 1 |
| `Zoom_01x50_PiP` | 39.2611 | 1.50 | 1.027778 |
| `Zoom_04x00_PiP` | 18.47956 | 4.00 | 1.25 |
| `Zoom_10x00_PiP` | 8.929769 | 10.00 | 1.5 |

Camera FOV = 2·atan(tan 27.5° × factor / zoom). All 36 levels are in the report
(`zoomLevels`). `Aim_Default_IronSight` (`1_25xZoom_IronSights`) exists, but no weapon
blueprint links it. The G36 built-in sights use `Aim_Fast_1x25` and
`Aim_300_6_1x00_8x00`.

### Recheck after an update

**PiP setting (1.4.3.0).** EA documents a new switch: disabled uses full-screen
FOV zoom; enabled combines that with extra zoom inside the optic. EA states that
total magnification stays unchanged. [Official update notes](https://forums.ea.com/blog/battlefield-game-info-hub-en/battlefield-6-update-1-4-3-0/13707600).
The raw `Aim_03x50_PiP` comparison adds an exact reference to
`Common/GameSetup/Options/Graphics/OptionEnablePiPZoom`; all shared decoded values
match the older capture. The option record contains `EnablePiPZoom` and `true`,
which does not establish the player's effective setting. Record PiP on/off with
camera FOV and ADS FOV settings in future optic comparisons. The documented
behavior does not clear nested decoder warnings or prove a native formula.
[Source review](../../reference-data/provenance/frosty-pip-review-2026-09-23.json)
and [setting context](../../reference-data/provenance/frosty-pip-setting-context-2026-09-23.json).

Compare `opticRenderFovByPart`, `riserFamilyLinksByWeapon` and `ironSights` in a new
dated report with this one. All 1,810 optic parts with their own aim zoom to the
magnification in their UI label.

### Visibility and zeroing research

The [bounded glint trace](../../reference-data/provenance/frosty-optic-glint-reviewed-2026-09-23.json)
resolves the M2010 ESR iron-sight attachment through its ability action to
`U_WPM_IronSights`, which matches the selector of `WPM_NoScopeGlint` in the
weapon part list. Its modifier references
`WeaponLensFlareData_NoFlare`; the target's `Field_3062d390` array is empty.
The decoy anti-glint affector selects a separate unlock/package that references
the same target. The checked 6P67 part list lacks `WPM_NoScopeGlint`; this does
not establish whether the 6P67 can produce glint through another path. Active
multiplayer selection and a gameplay distance threshold are not established.

The narrow discovery pass found no zeroing name under gameplay/hardware/setup
folders. A wider catalog check found standard-MP zeroing HUD routes and a
RangeFinder weapon package. This is why a name-search miss is not proof that a
mechanic is absent. The [reviewed UI/package trace](../../reference-data/provenance/frosty-zeroing-reviewed-2026-09-23.json)
links the multiplayer widget to `ZeroingDistance`, and separately links the
rangefinder package to `Has Rangefinder`. The package has two true booleans;
their individual names and native application are not established. The
[weapon zeroing blocks](WEAPONS.md#zeroing-source-configuration-1430-23-september-2026)
provide named scalar limits and raw integer lists, with separate runtime limits.

### SGX suppressor sway identity (1.4.3.0, 23 September 2026)

The [current SGX lineage review](../../reference-data/provenance/frosty-site-sgx-sway-lineage-2026-09-23.json)
traces exact attachment actions and selectors to MPX WB local object 20,
`Class_2fea847d/Field_90fd0310`. Its raw value is `0.9752820134` (offset 5156,
`15ac793f`). The wrapper lists the ConditionalExtended selector used by Long
Suppressor (SRD9) and CQB Suppressor (Compact Streamer). Light Suppressor
(SAI Cobra) selects a different package and does not share that selector.

The site's SGX Light Suppressor override `0.975282` therefore has a likely stale
attachment identity. The proposal is to move it to CQB Suppressor: Light's displayed
sway delta would change from -2.5% to neutral, and CQB from neutral to -2.5%.
Long's `1.462923` equals the local factor times its selected `WME_WSway_M05`
factor `1.5`; keep it as a source-compatible composition candidate. Current raw
hashes and exact attachment XML identities were checked separately from the older
13 September provenance. Native selector activation and multiplication remain
unproved. The local wrapper also lists a second selector; a shared selector alone
does not establish whether either or both are required. The override was moved
from Light to CQB Suppressor on 23 September; Long is unchanged. The paired capture
is listed under [optic framing](../working/BF6_CAPTURE_PRIORITIES.md#8-optic-framing-and-pip).

**Same pattern on barrels.** Local WB sway overrides bound to the shared
`U_WPM_ANY_ConditionalShort`/`ConditionalExtended` selectors exist on three more
weapons, all on barrels:

| Weapon | Barrel choices | Local sway factor |
|---|---|---|
| GGH22 | Short and Extended | 0.850746 |
| Mini Scout | Short | 1.033862 |
| BROD3 | Short | Two parts: 1.016938 and 1.024638 |

No shared barrel package imports a sway effect, and the site models
barrel sway only through these per-weapon values (`weaponSwayMultByWeapon` on the barrel).
The site applies Mini Scout Short ×1.033862 since 23 September. GGH22's Short and
Extended barrels are not offered in game. BROD3 is deferred: how its two parts combine
is not known.
[Receipt](../../reference-data/provenance/frosty-source-leads-2026-09-23.json).

## Evidence

- [frosty-attachment-handling-generated.json](../../reference-data/provenance/frosty-attachment-handling-generated.json),
  [frosty-barrel-ads-generated.json](../../reference-data/provenance/frosty-barrel-ads-generated.json),
  [frosty-sniper-brakes-generated.json](../../reference-data/provenance/frosty-sniper-brakes-generated.json),
  [frosty-assumption-review.json](../../reference-data/provenance/frosty-assumption-review.json)
- [frosty-barrel-ads-2026-09-13.json](../../reference-data/provenance/frosty-barrel-ads-2026-09-13.json):
  WB and GS ADS routes (24 selections differ; the site follows WB)
- [frosty-handling-mapping-followup.json](../../reference-data/provenance/frosty-handling-mapping-followup.json),
  [frosty-other-attachment-review-2026-09-13.json](../../reference-data/provenance/frosty-other-attachment-review-2026-09-13.json)
- [belt-box-moving-ads-2026-09-13.json](../../reference-data/provenance/belt-box-moving-ads-2026-09-13.json)
- [frosty-light-field-names-2026-09-13.json](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json)
- History: [attachment generation review](../archive/FROSTY_ATTACHMENT_GENERATION_2026-09-13.md),
  [optic source plan](../archive/OPTIC_FROSTY_SOURCE_PLAN.md)

## Weapon Attributes attachment tracing (21 September 2026)

The source review covers saved builds 1.4.2.5 and 1.4.3.0. See the
[Weapon Attributes model](../WEAPON_ATTRIBUTES_MODEL.md) for calculations and limits.

- **Tungsten Core:** M2010 ESR, PSR and SV-98 select
  `GRM_Recoil_AMO_Bolt_M10` (−6 ADS/hip recoil amount steps). L115 and Interdictor
  select normal `GRM_Recoil_AMO_M10` (−1). Mini Scout binds both (−7).
  Variation does not change. Production follows these bindings; six steps as the
  intended rule for all snipers remains a hypothesis.
- **L115 Standard Suppressor:** the normal suppressor selector is active, but its
  GS has no corresponding hip-dispersion penalty binding. EF88 and M2010 ESR have
  that binding. The research Hipfire checker excludes the penalty; the generic
  production muzzle penalty remains a separate open correction (bug 12).
- **L115 QD Grip Pod:** no moving-ADS penalty binding. Production uses zero.
  Light + Violet reads Mobility 54; adding the pod reads 58.
- **18.5KS-K Slim Angled:** selects normal `U_WPM_BTM_Fast02_W25`, unlike the
  affected sniper grips that select Full Angled. Its extra
  `GDM_Array_ADSMoveDispersion_BTM_M10` binding is under `Field_b30a73ed`, not
  moving-ADS collection `Field_2ffeb6ac`. A modifier filename alone does not identify
  the runtime target. Twelve ADS indicator captures show Slim Angled matching no
  grip within one pixel, with and without Violet; Folding Stubby widens the moving
  indicator. Production now uses zero moving-ADS penalty. The other field's exact
  effect remains unknown; indicator widths do not establish pellet distribution.
- **VSSM:** both 200 mm Factory (30 points) and 200 mm ASM (20 points) have integrated
  suppression. The paired Folding Stock captures use ASM, with no separate suppressor.

Evidence: [Tungsten trace](../../reference-data/provenance/sniper-tungsten-recoil-2026-09-21.json),
[Mobility trace](../../reference-data/provenance/composite-mobility-source-trace-2026-09-21.json),
[ADS indicator measurements](../../reference-data/provenance/ks18k-ads-indicator-2026-09-21.json),
[paired panels](../../reference-data/provenance/composite-combination-results-2026-09-21.json).
Dated trace files preserve the status at collection time; the indicator follow-up
supersedes the earlier pending KS18K production status.

## Burst recoil duration overrides (L13, 24 September 2026)

The current file has five `ERGOS.weaponOverrides` recoil leaves, not the earlier
19-row starting count. All five store `recoilDurationAdd: -0.0006`: Burst Training
on SG553R, PW5A3 and CZ3A1; Burst Mode on SL9 and GRT-BC. Their GS records bind
`GRM_AutoIdentifier_P00` to `U_WPM_ERG_BurstFireActive`
(`588728fd-2ae7-4424-aa22-45d9b3c82ba0`). The shared modifier adds -0.0006 to
registry-named `RecoilDuration` for both aim states; all five bases are 0.025.

This supports the existing operands. The source model predicts 0.0244 when the
condition applies, before other modifiers. MP5 raw checks locate base floats at
1024/1176 and modifier additive floats at 1100/572. The GS selector and effect
pointer were also checked against raw bytes; the other four GS bindings were
independently decoded. [Receipt and reproduction](../../reference-data/provenance/frosty-2026-09-24-L13-burst-duration-bindings.json).

The Ability action selects `BurstFireEnabled`; the GS condition is the separate
`BurstFireActive` token. Native production of that token, firing activation and
composition remain unresolved. Keep the existing rank-9 capture requirement;
the 0.0006 duration delta alone is too small to identify reliably in normal video.
No numeric site change is proposed.

## Local non-sway parts (L6, 24 September 2026)

The `Class_45930daa` local-part family uses optic/iron-sight selectors. Its
three small floats must not be treated as recoil or spread multipliers. A direct
RPK74M trace resolves the registry author path `Tango Weapon Offset` /
`Weapon Offset for Optics`; this supports a weapon/optic placement role.
For Tango6T, the raw values at bytes 5216/5220/5224 are 0, -0.0175 and 0.02.
Individual component names, units and runtime behavior remain unknown.

EF88's instance has null registry references, but that did not exhaust the
family: RPK74M's non-null references supply this independent purpose clue.
No combat-stat change is proposed. [Reviewed trace](../../reference-data/provenance/frosty-2026-09-24-L6-local-optic-offset-scope.json).

The broader local-part inventory remains a source of bounded leads. Bipod flags
alone do not establish a recoil effect. M18's local MagazineCapacity 22 versus
the site's nominal 21-round magazine repeats the known chamber/nominal question.
The separate M250 numeric bipod part is recorded below as L16.

### M250 local bipod scalars (L16, 24 September 2026)

The [reviewed local part](../../reference-data/provenance/frosty-2026-09-24-L16-local-bipod-unmapped.json)
selects `Class_8b80c794` under `U_M250_Bipod`. Fields `e11a863e` and
`f9477ebd` are 1.0375; `6a647926` is 1.0. Their targets and operations remain
unknown. Two hotfix vehicle instances have the same checked class/inherited
descriptor layout and neutral operands. Their Stinger owner context does not
identify the effect. Keep release and hotfix records separate. No recoil, sway
or other numeric site change is supported; reopen with a typed consumer or
independently named target. Decoder layout ambiguity and runtime limits remain.

### Buffer animation-context limit (L18, 24 September 2026)

The [same-class registry trace](../../reference-data/provenance/frosty-2026-09-24-L18-buffer-animation-context.json)
finds author paths for secondary-optic proc-firing animation settings. The HTI
canted-optic example stores a 1.1 vector where Buffer stores 0.75. However, the
exact registry member arrays name only Priority. They do not name this vector
or its operation. Buffer has null anchors in both relevant objects. This is a
purpose clue, not proof of a 25% recoil reduction. Retain the qualitative site
badge; no numeric change is supported without a typed field or consumer.

### Match Trigger indirect effects (L17, 24 September 2026)

The [raw HK433 trace](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json)
follows the attachment selector through a local WB target to embedded identifier
`15cff9ff-aab0-4230-9a53-5a2bb1606587`. The same identifier selects two GS effects:
`GBM_NoIncrease_ERG_P00` multiplies IncreasePerShot by zero in all four aim/stance
branches; `GRM_MatchTrigger_ERG_P15` adds 3 to RecoilAmountMultiplierExponent and
stores a 1.728 second-multiply operand on RecoilDecreaseFactor in both aim states.
Exact GRX child/hash pairs name all three targets.

This provides a source path beyond the site noEffect marker. It does not prove
native activation or composition. The description specifies semi-auto, but that
text is not a consumer. The three sibling WB identifiers relate to bipod/mounted
contexts and do not prove a fire-mode condition. Capture M433 with and without
Match Trigger in manually selected semi-auto and automatic control. A candidate
model gives recoil ratio 0.945^3 = 0.843908625, recovery factor 72*1.728 = 124.416
and no added per-shot bloom; minimum spread remains. These are conditional model
predictions, not runtime measurements. No cadence change or game bug is established.

The [L24 family check](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json)
confirms the same exact GBM and GRM targets for all 24 current Match Trigger
selections. The parent fresh-decoded each WB and GS and checked the selector
array, local references, embedded identifier and both GS imports. Source priority
values differ between weapons. Shared targets extend source coverage; they do
not establish universal activation, stacking or a single final multiplier.
Keep the L17 capture requirement and each weapon's base values.

### Compact Handstop utility candidate (L27, 24 September 2026)

The [current CZ3A1 trace](../../reference-data/provenance/frosty-2026-09-24-L27-handstop-boolean-scope.json)
follows the exact progression, Ability action and selector into the shared
Handstop WPM imported by the WB. Its `Class_a00773e3/Field_18774676` is true at
raw offset 216; the same field is false in the base WB at offset 4676. No typed
name or native consumer is established. A different local Burst Mode selector
in the same WB must not be attributed to Handstop.

The mapped description says the attachment permits firing while sprinting.
That is a capture hypothesis, not proof of this field's name. Keep numeric tiers
unchanged. If a controlled capture confirms the utility, consider a utility
indication instead of interpreting the site's noEffect flag as no gameplay effect.

The [L30 owner-registry follow-up](../../reference-data/provenance/frosty-2026-09-24-L30-handstop-registry-scope.json)
checked both non-null registry anchors on that WB owner and their direct linked
groups. They provide no child/hash pair for `18774676`. The boolean remains
unnamed; this negative result does not show that it is unused.

### Indirect fire-mode condition candidate (L31, 24 September 2026)

The [bounded source check](../../reference-data/provenance/frosty-2026-09-24-L31-fire-mode-mask-candidate.json)
confirms Match Trigger value 1 and Burst value 8 in `Class_9dfbb158.Field_1c85cbb1`.
The class adds one uint32 above a GUID-only base. SDK member lists for
`FireModeSpecificModifierUnlock.FireLogicTypesMask` and
`ContextSpecificModifierUnlock.UnlockAssetGuid` fit that structure. Values 1 and 8
also fit bit masks for the SDK single-fire and burst enum positions. These are
independent structural clues, not an exact field-name mapping or native bit test.

The selected VSSM Full Auto WB and WPM contain no instance of this class. Its GS
instead binds the Full Auto selector directly. This control provides no value 4;
it rules out a universal record layout across these three selected paths, not the
candidate mask meaning. Keep the L17 semi/auto capture and existing Burst runtime
limits. No new numeric site change follows from this result.

### A3 Receiver and burst recoil tiers (L59, 24 September 2026)

All 34 site recoil tier values for A3 Receiver and the three burst choices now
have exact source operands ([receipt](../../reference-data/provenance/frosty-2026-09-24-L59-ergo-recoil-tiers.json)).
A site tier value equals an additive operand on `RecoilAmountMultiplierExponent`
or `RecoilDirectionVariationMultiplierExponent`, same sign.

- **A3 Receiver (M16A4):** `GRM_Recoil_ERG_M10` adds −1 to the amount exponent in
  both aim states, matching the site's −1.
- **Burst Training, Burst Mode and GRT-BC Burst Mode:** the effects are bound in
  each GS under the `BurstFireActive` condition token, not the attachment selector
  (as for L13's duration add). `GRM_RecoilConversion_ERG_P10` adds +3 to the
  variation exponent (site +3 on all eight weapons) and −1 to the amount exponent.
  A second effect adds +1 (`GRM_Recoil_ERG_P10`, seven weapons) or +2
  (`GRM_Recoil_ERG_P20`, GRT-BC) to the amount exponent. The sums, 0 and +1,
  equal the site amount tiers.

The site values match only if the game adds these operands; activation and
composition remain unresolved. No numeric change.

### Reverse coverage of recoil and spread effects (L60–L61, 24 September 2026)

L60 listed every recoil, bloom and dispersion effect that a site choice selects
in source and checked whether the site models it
([receipt](../../reference-data/provenance/frosty-2026-09-24-L60-reverse-coverage.json)).
In ERGOS, GRIPS, MUZZLES, LASERS and magazines, every effect is modeled or
already known (Match Trigger, the PP-19 and L115 bugs), except one. Site laser
and grip spread steps sit in per-weapon `frostyModifiers` with the source sign
negated.

The 25 September sweep of sights, barrels, lights and ammo found no new effect
([receipt](../../reference-data/provenance/frosty-2026-09-25-L60-reverse-coverage-remaining.json)).
Sights bind only `GCR_*` camera recoil. Barrel, light and ammo operands all match
the site, apart from ADS idle-recovery offsets (idle state is not modeled). The
Mini Scout penetration −7 is the sum of `GRM_Recoil_AMO_M10` −1 and
`GRM_Recoil_AMO_Bolt_M10` −6. `GS_MiniFix` binds each light selector to two
identical hip modifiers (`GBM_Increase_Hip_S1` and `_A40`). A screen of all GS
files finds same-family double bindings only there. The penetration pair stacks
in game ([bug 13](../ATTACHMENT_BUGS.md#13-sniper-tungsten-core-recoil-penalties-are-inconsistent)),
so the light pair probably does too, giving 0.444 rather than 0.667. No displayed
value changes: the bloom recovers in about 0.07 s against a 1.27 s shot interval,
and the panel Hipfire factor does not depend on the size of the change.

The exception is the +2 hip dispersion step bound by bipods and grip pods
(`GDM_Array_HipDispersion_BTM_P20`, 142 weapon/choice pairs), which the site
omits. L61 ([receipt](../../reference-data/provenance/frosty-2026-09-24-L61-bipod-hip-dispersion.json))
found it identical to the `_NoBipod` copy that Canted Vertical binds, except one
boolean, `Field_b574fa40` (true on P20). Current EF88 panels show lasers raising
Hipfire from 40 to 47/54/62, while bipod and all grip pods stay at 40. The flagged
step therefore does not apply when the attachment is fitted; it most likely
requires a bipod or deployed state. The site omission matches the panel. Deployed
behavior stays with parked question W1.

### Reverse coverage of handling, velocity and sway (L62, 25 September 2026)

L62 repeated L60 for WME imports and `GID_*` bindings: ADS time, draw/deploy,
sprint recovery, ADS move speed, reload, sway and muzzle velocity
([receipt](../../reference-data/provenance/frosty-2026-09-25-L62-reverse-coverage-handling.json)).
Grips, muzzles, barrels, ergos, magazines and ammo agree with the site throughout.
ADS time keeps the source sign on grips and barrels and is negated on magazines;
draw, sprint and ADS-move shifts are negated everywhere. The only barrel exceptions
are GS-only `GID_ADSTime_BRL` +1 bindings on EF88 Extended, BROD3 Extended and the
VSSM barrels, where the site follows the WB (0). EF88 panels read Mobility 52 for
Basic and 48 for Extended, matching the WB-only index, which supports W2.

Sights carry category-wide effects the site omits. Every var_high and thermal optic
on all 56 weapons imports `WME_ADSMoveSpeed_M05` (one ADS-move tier slower; AK205
0.67 → 0.60, Mobility −2). Every iron sight except BROD3 and the six bolt-action
rifles imports `WPM_Sway_IronSights_P05` (weapon and camera sway ×0.666667). Iron
is the site's default sight, so any optic would show +50% weapon sway. The site's
reason for leaving out optic effects, that a category cannot identify one optic,
does not apply to these uniform effects. Both are proposals; activation is unproved.


The [L41 raw check](../../reference-data/provenance/frosty-2026-09-24-L41-vssm-selected-operands.json)
resolves the Full Auto selector to its GBM/GRM objects and matches ten dispersion,
two recoil-variation and four recovery operands to the existing Folding Stock
values. Recovery factor 76 and exponent 1.24 are enabled in both aim states.
Native evaluation and timing remain unresolved, so the existing assumption note
stays valid; the GRM layout warning is retained. No new capture is proposed.
