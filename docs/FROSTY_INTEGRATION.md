# Frosty data integration

Current release status: the operator approved publication of the reviewed site changes after the attachment corrections. See [attachment correction status and remaining work](FROSTY_ATTACHMENT_COMPARISON_2026-09-06.md). Earlier local-only statements below describe the review stage before that authorization.

## Objective and boundary

Use the supplied Update 1.4.2.5 XML exports to replace stale or incomplete weapon
and attachment data where the evidence supports the change. The build number is
a user-supplied label, not an independently verified property of the XML.
Multiplayer is the target. Cosmetics and optics are excluded.

The source files are in the adjacent `BF6 Datamining` workspace. Its
`research-1.4.2.5/FINDINGS.md` records the dependency audit and attachment traces.
The current analyzer baseline is `fb7a214` on `codex/frosty-data-analysis`.
EF88 base velocity is now 724 m/s, replacing the older 670 m/s screenshot value.
The raw WB vector and named registry agree. The source record is
`reference-data/provenance/frosty-1.4.2.5-ef88-velocity.json`; it retains ten
input hashes and the BasicBarrel selection graph. Historical measurements remain
in provenance with an explicit supersession note. Simulation formulas are unchanged.

## Ammo projectile drag corrections

All 11 site DMR/sniper weapons with ordinary Tungsten (Penetration) ammo select
only the penetration modifier and retain their base projectile drag of 0.0035.
The former class-wide 0.002 Penetration override was removed. VSSM MatchTungsten
(Range Pen) selects a projectile with drag 0.002; its missing override was added.
Long-Range remains 0.002. `reference-data/provenance/frosty-1.4.2.5-ammo-drag.json`
retains the selector/effect/projectile evidence and source hashes. Six focused
barrel/ballistics checks passed; direct execution of the UI ammo-drag function
also passed for all three treatments. Collision penetration and recoil behavior
are unchanged.

## Confirmed EF88 magazine handling and velocity precision

The user confirmed Basic-barrel sprint recovery: 30 Fast 200 ms, 36 Rnd 200 ms,
42 Rnd 200 ms and 42 Fast 233 ms. The regular 30 Rnd is 167 ms in the saved
screenshot. The 36/42/42 Fast magazine sprint shifts now use 0/0/1 instead of
1/1/2. These agree with the traced Draw modifier selections. The record is
`reference-data/provenance/frosty-ef88-magazine-review.json`.

`applyAttachments` now retains `_projectileVelocityMps` before display flooring.
The UI uses it for the projectile model, while `bulletVel` retains the existing
integer display. EF88 Short therefore displays 579 m/s and uses 579.2 m/s for
flight time and trajectory. Six focused barrel/ballistics tests passed, an
actual UI-function check confirms that precision and fallback behavior, and
the five magazine panel values plus the 62-weapon validator passed.

## BROD 3 spread correction

Eight stale spread fields now use the raw BREN3 GS values corroborated by the
Sym 1.4.2.0 record. ADS spread increase is 0.304, firing recovery coefficient
1.2, firing recovery offset 2.7 and distribution exponent 0.5. Hip spread
increase is 0.547, firing coefficient 0.5 and firing offset 4.86. ADS increase
also updates the duplicate `recoilIncAds` field. The retained evidence is
`reference-data/provenance/frosty-1.4.2.5-brod3-spread.json`.
Seven focused tests and the 62-weapon data validator passed.

Do not bulk-replace damage from the current Sym snapshot. For EF88 and BREN3,
its 25-point initial value follows the plain curve; the tweakable table has
26.05. The user's EF88 screenshot displays 26. This is evidence for the EF88
panel's use of the tweakable value, not a proof of every projectile's runtime
curve selection. On 2026-09-05, the user also confirmed BROD 3 displays 26:
"26, all 25dmg guns were updated to 26 in the recent update where they added limb multipliers".
This corroborates the existing BROD 3 base damage of 26.05. Its damage remains
unchanged. The user report does not establish every distance or curve value.

## Attachment cost comparison

Four magazine costs now match their weapon-specific attachment XML: M417 A2
25 Rnd uses 15 points (previously 20), RPK-74M 95 Rnd uses 50 (previously 25),
RPKM 36 Rnd uses 5 (previously 15), and PP-19 30 Fast uses 10 (previously 5).
The attachment cost field is authoritative for this comparison; a selector's
name suffix can differ, as with M417 A2's `_W20` selector and 15-point attachment.
`reference-data/provenance/frosty-1.4.2.5-magazine-costs.json` retains the source
paths, hashes and selectors. Direct loadout checks verified all four cost deltas.
Magazine capacities and handling behavior are unchanged. Compact-magazine
names do not reliably distinguish fast variants; other name-based candidates
require further mapping before promotion.

Further magazine tracing found that PP-19's `036Ext1` modifier stores 36 rounds
including the chamber, consistent with the site's 35 Rnd label. M1014's `005Cpt`
modifiers store 5, consistent with 4 Rnd. M87A1's `006Cpt3` stores 6 and uses a
5-round loading value; its 20-point cost agrees with the archived 5Rnd Speedloader
record and the site's 5 Fast option. These asset-name differences do not justify
capacity or cost changes.

Five exported options were found absent from the site: SOR-300SC 45 Rnd and
45 Fast, PSR 10 Fast, SV-98 10 Fast, and ES 5.7 20 Fast. On 2026-09-05, the user
confirmed neither SOR-300SC option is available; both remain correctly excluded.
Their ability branches, source hashes and availability evidence are retained in
`frosty-attachment-source-gaps.json` under `magazinesAbsentFromSite`.
The user then confirmed PSR 10 Fast, SV-98 10 Fast, and ES 5.7 20 Fast are also
unavailable. All five remain correctly excluded. These confirmed exclusions
demonstrate that an exported ability branch does not establish availability.

M44 and M357 TRAIT standard FMJ costs now use 5 points instead of 0. Both
weapon-specific `Attachment_*_AMO_FMJ.xml` files contain
`Field_6ee865a5=0x00000005`. Source paths and hashes are retained in
`reference-data/provenance/frosty-1.4.2.5-ammo-costs.json`.

PSR and SV-98 angled grip mappings remain unresolved. The exported
`Attachment_*_BTM_Magpul_AFG_BOLT.xml` selects FastBOLT01_W05 but costs 15.
The archived reviewed screenshot records distinguish Full Angled at 5 and
Slim Angled at 15 for both weapons. A shared selector alone does not establish
the displayed attachment identity. These grip costs and rosters remain unchanged.

## Empty reload and projectile audit corrections

The registry index now preserves caliber decimals in projectile asset names.
It resolves named registry data for 62 of 64 base projectiles. RPK74M uses
explicit GUID links to shared PD_545x39mm definitions; VSSM and KSG still have
no matching registry data. The earlier 50-record count included
11 records missed by the index. The audit also preserves all four linked
projectile curve/table references without deciding their runtime precedence.

Sixteen base empty-reload values were corrected using the zero-ammo reload
entry's own animation speed. All changed entries have zero reload/post-reload
delay. Raw WB values agree with the named registry. The evidence record
`reference-data/provenance/frosty-1.4.2.5-empty-reloads.json` contains old/new
values, the separate partial/empty speeds, raw block paths and input hashes.
These are calculated source values, not measured animation durations. Partial
reloads and attachment behavior are unchanged. Data validation passed for all
62 weapons. The empty-reload field is not currently rendered by the UI.

## EF88 screenshot confirmation

The user supplied `reference-data/provenance/ef88-basic-30-round.png` for Basic
barrel, regular 30-round magazine and Standard ammo. The model matches ADS
250 ms, sprint recovery 167 ms, ADS movement 0.60x, headshot multiplier 1.40,
recoil variation 26.1 degrees and displayed barrel velocities 724/905/579 m/s
for Basic/Extended/Short. Partial reload was stale at 2.416 s; it is now 2.400 s,
agreeing with the screenshot, raw WB, named registry and Sym. Empty reload was
stale at 2.8415 s; it is now 3.534 s from raw WB, named registry and Sym.
The image does not measure empty reload. Both replacements retain old values in
`reference-data/provenance/frosty-1.4.2.5-ef88-reload.json`.
Data validation passed for all 62 weapons, the five existing estimated-weapon
checks passed, and the reference-loadout calculation matches the panel.

## Open attachment source gaps

The ergonomics review found eight exported options absent from the site:
AK4D/SOR-300SC/M60 Improved Mag Catch, L110/M1014 Aftermarket Buffer,
ES 5.7 Speed Holster, M44 Match Trigger, and GRT-CPS's burst attachment.
The user confirmed all eight are unavailable on 2026-09-05. M60, L110 and M1014
have no ergonomics slot. The site's old M60 and L110 options were removed;
M1014 already had none. Both share formats now reject unavailable ergonomics
using the site's availability catalog, including weapons with no ergonomics record.
Seven candidates have selected ability
branches; M60 Improved Mag Catch has none. The evidence is retained under
`ergonomicsAbsentFromSite` in `frosty-attachment-source-gaps.json`.
Neither condition alone establishes current multiplayer availability.

### Next recoil/spread evidence

The current Sym BF6 mechanics page was read in the browser on 2026-09-06,
including its equation image (the text-only web reader returned no content).
Source: https://sym.gg/games/bf6/weapon-mechanics (published 2026-05-03).
This narrows the earlier blanket formula-evidence gap:

- It gives spread recovery as
  `s_next = s - (coef * (s - minSpread)^exp + offset) / simrate`.
  The interior update in `sim/core.js:applySpreadRecovery` agrees with this
  equation. The page does not establish BF6's simulation rate, clamp/update
  order, or exact transitions among Firing, Not Firing and Idle.
- It describes polar recoil with fixed magnitude and variable direction,
  no first-shot/initial recoil multipliers, and recoil recovery active during
  automatic fire. It does not give the recoil recovery equation, per-axis
  versus radial recovery, or the direction sampling distribution.
- Its attachment equation is `RecoilAmount * RecoilAmountMultiplier ^
  RecoilAmountMultiplierExponent`, corroborating weapon-specific recoil tiers.

The linked BF3, BF4, BF1, BFV and BF2042 mechanics pages were also read.
BFV is the closer spread-recovery precedent identified by the BF6 page.
Do not transfer BFV spread-to-recoil conversion, older Cartesian recoil, or
BF2042 initial recoil multipliers into BF6. The BF4 page also links original
algorithm and server-tick research, but those forum articles were not retrieved.
The BF4 page reports 0.9-1.0 vertical-recoil variance while the BF1 page says
BF4 lacks that variance; these statements conflict and do not resolve BF6 behavior.
No runtime behavior was changed from this page review.

Older-game research provides a more targeted architectural lead:

- VU's BF3 API documents `WeaponFiringData.weaponSway` and `GunSwayData`,
  with stance/zoom dispersion, recoil, recovery and separate camera-recoil data.
  Sources: https://docs.veniceunleashed.net/vext/ref/fb/weaponfiringdata/ and
  https://docs.veniceunleashed.net/vext/ref/fb/gunswaydata/ .
- The current BF6 `DesertTechHTI_WB.xml` directly references
  `GS_DesertTechHTI` through `Field_775480e0`. This corroborates following the
  weapon-firing/sway path rather than expanding camera/animation exports.
- Sym's BF1 research describes radial sampling as `r = spread * U^a`, with
  uniform angle. It reports `a=0.5` for ordinary shot dispersion and `a=1`
  for pellet dispersion. Source:
  https://sym.gg/legacy/index.html?game=bf1&page=general-info .
  This is a candidate interpretation of BF6's distribution exponent, not a
  confirmed mapping. For this candidate, the probability of landing within
  half the radius is `0.5^(1/a)`: 25% at a=0.5, about 35.5% at a=0.67,
  and 50% at a=1. These distinguishable predictions can guide measurements.
- Sym documents nonlinear spread recovery for BFV and BF2042, with different
  stated simulation rates (60 and 45 Hz). It also documents state-dependent
  distributions and BFV spread-to-recoil conversion. Sources:
  https://sym.gg/games/bfv/weapon-mechanics and
  https://sym.gg/legacy/pages/bf2042/bf2042_dataWeapon.html .
  Do not transfer a title's tick rate, sampler or state rules into BF6 by analogy.

Working inference: the missing update/sampling logic belongs to compiled
weapon-sway/firing behavior consuming the exported parameters. The reviewed
sources do not identify the exact BF6 function or prove its implementation.
No runtime formula was changed on the basis of older-game research.

The first manifest search identified two candidates:

- `Common/Gameplay/Soldier/Logic/PF_Glacier_Soldier_AimingLogic`: inspect aim-state
  transitions and references that could select recoil/spread behavior.
- `Common/Gameplay/Soldier/Glacier_Soldier_Gameplay`: inspect soldier gameplay
  component references for relevant weapon/aim settings.

The user then exported all six `Common/Gameplay/Soldier/Logic` files. All parse,
with no duplicate object GUIDs, missing local class references, or array-count
mismatches. `PF_Glacier_Soldier_AimingLogic` contains 146 objects and 16 distinct
external references. Two direct references are the next useful exports:

- `Common/Gameplay/AimingControllers/WeaponsGadgets/Aim_Default_NoZoom`
- `Common/Gameplay/Soldier/GRX_Glacier_Soldier`

Both were subsequently exported and inspected. The aiming graph
also links camera constraints, animation yaw, insertion/free-look and other
state data; no exact recoil/spread formula has been established from it.
Thirteen non-null boxed-value fields show type labels without their payloads.
Do not infer constants from these strings or call this proof of XML truncation.
The six hashes, structural checks and reference evidence are retained in
`reference-data/provenance/frosty-soldier-aiming-review.json`.

The subsequent batch contains 302 Soldier XMLs and all 49 WeaponsGadgets aiming
controllers. Of these, 348 parse directly, with no duplicate object GUIDs,
array-count mismatches or missing local class references. Three Soldier files
have text-escaping errors: `Glacier_Soldier_Spotting.xml`,
`ExpressionFunctions/PresEx_Soldier_OverlayPicker.xml`, and
`Features/DiceFeature_Soldier_Controller_FetchThrottleAndBrake.xml`.
Each parses after escaping the identified text in memory; raw files are unchanged.
Exact errors, literals and hashes are retained in the review JSON.

The GRX reference resolves to `TWM.MountEnterAimConstraint`. The aiming controllers
reference sensitivity, zoom/FOV and aim-assist settings; the Soldier asset binds
named recoil signals to animation states. Neither branch has established the
recoil/spread update equations. `SoldierMotionMachine` timed out and is absent;
do not retry it solely for this investigation without evidence of relevance.
The other 12 unexported Soldier manifest entries are KillCam art/mesh/physics
assets outside this mechanics review.

The weapon GS/WB data, shared ADS/hip dispersion arrays, and
relevant recoil/dispersion modifiers are already available. Another export of
those unchanged files will not by itself establish runtime equations.

If the new graphs expose only state and data references, use controlled in-game
measurements to distinguish formulas: fixed loadout/FOV/distance, no manual
compensation, high-frame-rate single-shot and burst recovery recordings, plus
fully recovered single-shot impact samples for radial distribution. Keep
stationary ADS, moving ADS and hipfire samples separate. Measure reticle/camera
motion separately from impacts. A good fit is evidence within the tested
conditions, not proof of the exact engine algorithm.

`reference-data/provenance/frosty-attachment-source-gaps.json` records 11
attachments whose progression objects exist but whose GUIDs are absent from
their weapon Ability XML. It retains the exact paths, GUIDs and hashes of all
three source files. These include G3A4 Light Barrel, SCARL Flash Hider, M2010ESR
standard muzzle, M60E6 Improved Mag Catch and seven DP12 bottom-rail attachments.
The graph also has five selectors without WB/GS matches and eight missing
legacy modifier references. None of these gaps proves an inactive or effect-free
attachment. Existing runtime records remain unchanged pending activation evidence.

## Current Interdictor integration work

Interdictor is now in local runtime data. Its configuration,
attachment graph, source hashes and screenshot evidence are in
`reference-data/provenance/frosty-interdictor-integration.json`. The user supplied
a Basic-barrel preview with a regular 5-round
magazine: ADS 433 ms, sprint recovery 233 ms and ADS movement 0.42x.
The current runtime reproduces these with base ADS tier 7, draw-time tier 6,
ADS movement tier 8, Basic barrel ADS shift -1 and regular magazine draw shift -1.

The local roster now has 63 weapons. Interdictor has 32 mapped non-optic
attachment options, with every point cost checked against its Attachment XML.
Slim Angled handling now matches two user-supplied locked previews with regular
5 Rnd magazines: Light barrel shows ADS 367 ms, sprint recovery 200 ms and
732 m/s; Extended shows ADS 433 ms, sprint recovery 200 ms and 915 m/s.
Both show ADS movement 0.42x. The new grip record is appended to preserve share
indices. Its moving ADS spread effect remains unmodeled and visibly marked
unverified; these previews do not measure shot accuracy. Shared estimate warnings remain.
The standing/moving hip minima select Class E exactly. The 31 RPM panel display
comes from the saved screenshot; simulation keeps 31.914882299649403 RPM.
The identity map now includes DesertTechHTI/Interdictor from the retained Sym pair.

Validation: the 63-weapon validator passed. The 20 focused damage, barrel and
ballistics checks passed after adding Frosty to the explicit damage-source policy.
The browser shows Basic/5 Rnd at 31 RPM, 732 m/s, ADS 433 ms, sprint 233 ms and
moving ADS spread 0.32 degrees. Extended/3 Rnd/Long-Range shows 915 m/s, ADS
433 ms, strafe 0.47x and moving ADS spread 0.22 degrees. The damage chart stays
capped at 100, with distinct chest and limb kill windows. All changes are local.

All four magazine candidates pass a direct check through `applyAttachments`.
Only the regular-magazine handling values have panel confirmation. The current
runtime already supports `magData.movingAdsSpreadTierMod`; no new calculation
is needed for the compact magazine. A previous progress message incorrectly
said this calculation was missing.

Of 32 non-optic attachments, 28 have an exact selector/effect signature match
on another weapon. Match ammo, QD Grip Pod and the two capacity-changing
magazines do not. Equal signatures do not prove activation or operation order.
Slim Angled selects two modifier GUIDs in one Ability action. The supplied
previews confirm one handling tier step; they do not establish the full modifier
combination rule. A separate grip record retains that distinction.
The Match projectile trace confirms drag 0.002 against standard 0.0035,
already represented by `data/ballistics.json`. Corresponding standard/Match
damage curves agree. Health damage peaks at 150; armor damage peaks at 102.5.
The explicit health curve ends its ramp at 170 m, while the named tweakable
XY table uses 175 m. CoolGuy's supplied video (`8NrJ3myXWyI`, 2:33 and 3:40)
reports upper-chest kills from 106 to 164 m. The named table predicts those
whole-metre boundaries (continuous limits 105.714-164.205 m); the plain curve
ends chest kills at 161.364 m. The named table is now the corroborated candidate
for Interdictor integration. This is a creator report checked through automated
captions, not an independent hit test or proof of global curve precedence.
The source and calculations are saved in the integration JSON.

Sweet-spot validation now uses the actual peak (at least 100 damage), including
Interdictor's 150 plateau. It rejects separated peaks as one continuous plateau.
The graph retains its user-confirmed 100-damage cap after body-part multipliers.
The 12 damage tests and 62-weapon validator passed.

The QD Grip Pod
has an extra moving-dispersion GS binding compared with L115A3, so identity
alone is insufficient to transfer all per-weapon effects.

The named registry gives Interdictor moving-ADS minimum-angle index 3. All 62
candidates with named coverage use that index. The existing site tier 3 gives
0.32 degrees, which agrees with Sym; retain the raw 0.3 base value separately.
A direct `applyAttachments` check with Basic/5 Rnd returns moving floor 0.32,
ADS 433 ms and sprint recovery 233 ms. No weapon-specific spread exception is
needed. This does not establish the engine's tier-array formula or modifier
activation order. The record is `movingAdsTierReview` in the integration JSON.

Moving ADS distribution exponent 0.67 (stationary 0.5) remains source evidence;
the simulator does not currently use distribution exponents.
The existing chart note now states that patterns are estimates and that recoil
recovery and shot distribution are not fully verified against the game. This
discloses the current limitation; it does not resolve the missing mechanics.

## Completed configuration comparison

Run from the analyzer repository:

```powershell
python scripts/frosty-configuration.py --root '../BF6 Datamining' --out outputs/frosty/1.4.2.5
```

The script reads 64 GS/WB weapon candidates and their named registry definitions.
It preserves source XML paths, object GUIDs, array indices, literal scalar values,
and SHA-256 hashes. It does not write files used by the running site.

The first comparison uses only the 16 exact internal/site ID matches. For those
weapons, 55 site field occurrences per weapon are compared with named registry
configuration: 880 comparisons, 858 matches and 22 differences after the velocity
correction and selection of the single-fire rate for semi-automatic weapons. Some fields occur
both at the top level and in nested recoil/spread objects; these are not 880
independent parameters. The numeric comparison tolerance is the larger of
`1e-6` absolute and `1e-6` relative to the registry value.

- EF88 accounts for 21 remaining differences, including duplicated field occurrences and
  the small 675 versus 674.999 RPM difference. Material differences include
  recoil magnitude parameters, direction variation, spread increase,
  recovery coefficients and offsets, idle time, and ADS distribution exponent.
- M2010ESR has 44.0816018658339 site RPM versus 299.999 registry RPM. Bolt-cycle
  timing must be resolved before changing the effective firing rate.
- VSSM's 449.999 site RPM matches the explicit registry single-fire rate. Its
  Folding Stock `autoRpm` is 799.999, matching the registry base automatic rate.
  The initial generic-rate comparison was misleading; no rate change is needed.

These are configuration comparisons, not confirmed corrections to effective
factory-build behavior. The other 48 internal IDs require a reviewed identity
map or remain outside the site roster. No alias is inferred from similar names.

## Raw-field mapping evidence

The script records 5,054 directly registry-linked blocks. Within each raw type,
it compares a named scalar with every immediate raw scalar field across all its
linked observations. This produces 76 unique value matches, 27 ambiguous matches,
and one no-match result (`ReloadType`, whose raw enum representation differs).
All are research candidates, not decoded type declarations.

Do not pair raw fields and registry member lists by ordinal position. Recoil
contains an extra raw field before the recovery fields and does not contain all
named registry fields. A positional assignment can silently relabel values.
Likewise, constant values cannot distinguish several recoil multipliers or the
two zero-valued spread recovery coefficients. Preserve those ambiguities.

The field-candidate output retains all observation references. Empty arrays are
excluded from scalar matching, and hexadecimal values stay literal. Neither
signedness nor modifier operation semantics is inferred by this tool.

Verification checked all 880 comparison values against the original registry
GUIDs, all 5,054 block paths and retained raw scalars against GS/WB XML, and all
129 original configuration input hashes. It also checked that ambiguous constant fields remain
unresolved and empty arrays do not enter scalar inference.

The named stationary and `MovingJumpingSprinting` dispersion scalars agree across
the 62 registry-covered weapons except DesertTechHTI's ADS distribution exponent
(0.5 stationary versus 0.67 moving). DesertTechHTI has no confirmed site mapping.
This check does not justify adding new movement-dynamics data or code for the
currently matched site weapons. BREN3 and KSG remain outside this named-field check.

## Attachment graph

The same command now traces 3,326 non-optic attachment records through explicit
progression references, the ability root's selected branch list, action objects,
modifier unlock GUIDs, WB modifier selectors, and GS bindings. It never matches
attachments to modifiers by filename. Art unlocks and muzzle visual effects are
excluded. The graph does not require the missing KSG mesh/customization asset.

The EF88 Heavy Extended chain is now connected:

1. `Attachment_EF88_BRL_HeavyExtendedBarrel` points to progression instance
   `150fc0be-4ddc-4199-bd68-07502a3c971a`.
2. `EF88_Ability` branch `41e1bbb5-f073-4a86-9eae-afded49a6288` uses that progression
   and action `1eceb656-c94b-4705-a657-e73f9ba799bb`.
3. The action references `U_WPM_BRL_HeavyExtended_W10`, selector
   `1280c64a-6377-403b-8c0e-382c07651088`.
4. That selector joins to WB modifier `f58d8008-d1d5-4768-a4ac-14822a896676`
   and the GS `GBM_Increase_ADS_40_BRL_P10` binding.

Verification checked all 3,326 attachment/progression/ability records and 3,439 WB
selector joins. The GS graph now covers all eight observed binding structures,
using their explicit target/selector/raw-index fields. The earlier extractor
handled only `Struct_17c17f47`; this omitted recoil, movement spread, hip spread,
ADS-time and other links that were already present in valid XML. No re-export
was needed to recover those links.

An independent comparison against every GS object with target and selector
fields verified all 3,099 selector occurrences and 4,154 retained GS bindings
across 64 weapons. This includes BREN3's Zenitco RK2 recoil binding and KSG's
grip/laser bindings. The source hash index now records 4,232 inputs.

There are 24 remaining graph issues: eight references to missing legacy
WB modifiers, 11 attachment files without a matching selected ability branch,
and five modifier selectors without a WB/GS match. These are recorded in
`attachment-graph-issues.json`; none is interpreted as a zero-effect attachment.
The eight missing references name five unique legacy assets. Their relevance to
current multiplayer selection must be checked before requesting exports.

The five remaining unmatched selectors are M27IAR's Zenitco RK2, RPK74M's two
compact magazines, RagingHunter's Match Trigger and PP19's Compact1 magazine.
Their files need further reference/activation analysis before a re-export request.
The corrected graph also adds EF88 BasicBarrel's GS ADS-time binding to its
provenance record. The velocity evidence was rechecked and remains 724 m/s.

VSSM's Full Auto selector connects to both `GBM_FullAuto_VSSM` and
`GRM_FullAutoRecoil_VSSM`. The latter has non-identity records at the candidate
recoil decrease factor and time-exponent fields: tuples `(0, 1, 76, 1, True)`
and `(0, 1, 1.24, 1, True)`, each repeated for two recoil groups. The operation
and group meanings must be established before adding a decay override. The
site's existing note about an unmodeled ADS factor of 76 is incomplete evidence
for this broader modifier and must not be used to infer the final implementation.

Branches with no shared modifier selector are retained in the output. Their
absence of a selector is not proof that they have no effects. Modifier numeric
operations, combination rules, availability gates, and factory selections remain
separate questions. The graph records asset references, not proven runtime activation.

The velocity change passed data validation for all 62 site weapons and the
existing barrel-velocity, ballistics, and estimated-weapon/provenance checks
(10 Node test results, all passed).

## Export integrity

The user reports that early exports may predate extraction safety checks. Report
suspect XML files with exact paths and evidence; do not infer a game-data omission
until an extraction failure has been considered.

A structural check of the combined audit/graph inputs covered 8,454 distinct
case-insensitive file paths, 285,449 arrays, and 169,835 local object references.
All files parsed; array counts and indices matched; local GUIDs and reference
types resolved; no duplicate top-level GUID or empty root was found. Results are
in `outputs/frosty/1.4.2.5/xml-integrity-check.json`. This does not detect fields
omitted before serialization. There is no new re-export request from this check.

## Next work

### Current checkpoint after application update

The user resumed work after the application update. The full integration goal
is unfinished. Changes remain local; no commit, push, or deployment was requested.

Latest identity/projectile pass: the user confirmed BREN3 is BROD 3 and supplied
the current Sym JSON endpoint. A direct retrieval verified its explicit codename
and display name and corroborated all 61 earlier identity pairs. The identity map
now covers all 62 site weapons. The source declares version 1.4.2.0, dated
18 AUG 2026; retrieval was 6 SEP 2026 UTC, and its SHA-256 is recorded in the map.
Do not treat the retrieval date as the source version.

BROD 3 velocity is now 563 m/s instead of 580. Raw WB InitialSpeed.z, its named
registry, and Sym agree. The site's Basic Barrel selector links only ADS effects.
Evidence is `reference-data/provenance/frosty-1.4.2.5-brod3-velocity.json`.
The comparison now has 3,596 matches, five bolt-rate differences, and 57 unresolved
BROD 3 recoil/spread occurrences because GS_BREN3 lacks named registry definitions.
Identity is settled; missing registry names are a separate problem.

Sym independently retains Mini Scout at 51 RPM. Keep that rate; the speculative
bolt calculation is not sufficient evidence to replace it.

Interdictor (DesertTechHTI) is a confirmed missing site weapon. Sym supplies its
identity and statistics. EA's 1.4.2.0 update notes explicitly list its Battle Pass
unlock and August 18 release. The retained source record and availability evidence
are in `reference-data/provenance/sym-1.4.2.0-interdictor.json`. Integration is pending;
validate weapon configuration and non-optic attachment coverage before adding it.
KSG remains outside the confirmed roster. Its MD export is now repaired; see the 6 September live review for the ID correction and validation.

The extractor now traces the primary shot projectile reference for all 64 candidates
and resolves its target GUID, including KSG's local WB object. Results are in
`outputs/frosty/1.4.2.5/base-projectile-configuration.json`. Raw gravity/drag values
are -9.81/0.0035 for 63 candidates; KSG alone has raw drag zero. Named registry
gravity/drag pairs corroborate 50 candidates. The remaining 14 lack a complete
named pair; no raw-only observation is promoted as a decoded type declaration.
These are base references, not attachment-selected projectiles or damage formulas.
Ten targeted velocity/ballistics/handling tests and 62-weapon validation passed.

The following paragraphs record earlier configuration passes.

Latest: EF88's 21 differing configuration occurrences now use the named registry
values. Every changed value also matches a unique cross-weapon raw-field candidate
in the registry-linked XML block. This corroborates the named configuration;
it does not turn candidate fields into decoded SDK declarations. The evidence is
`reference-data/provenance/frosty-1.4.2.5-ef88-configuration.json`.
The dependent recoil magnitude is 0.7239300740740741 under the existing site formula,
and `RECOIL_MULT.ef88` is 0.9375, matching `recoil.ads.amountMult`. Historical
Companion and screenshot values remain in provenance with explicit supersession.
Simulation formulas and modifier operation semantics were not changed.

Current comparison: 3,594 matching occurrences and five differing bolt-action
RPM comparisons. Data validation checks that each weapon's cached recoil magnitude
and attachment tier multiplier agree with its ADS recoil group. It passes for all
62 weapons. The existing handling/provenance and spread-scale tests pass; the EF88
RPM assertion now uses the registry's 674.999 instead of the old panel-derived 675.

The research calculation `60 * BoltActionSpeed / (BoltActionTime + 60 / RateOfFire)`
reproduces the current L115, M2010 ESR, PSR and SV-98 rates within export precision.
Mini Scout remains different: candidate 46.55166413787816 versus site 51 RPM.
Raw named timing records and calculation results are saved in
`outputs/frosty/1.4.2.5/bolt-timing-candidates.json`. This does not establish the
engine formula, completion-fraction behavior, or a Mini Scout correction.

The following paragraphs record the preceding identity/velocity pass.

The recorded identity map in `reference-data/provenance/frosty-weapon-identities.json`
links 61 internal IDs to site IDs through explicit ID/display-name pairs in the
locally retained Companion bundle. It records the bundle hash and exact excerpts.
This third-party source is used only for research identities, not balance values
or proof of multiplayer availability. BREN3, KSG and DesertTechHTI remain unmapped;
BROD 3 is the only unmatched site weapon. Do not infer the BREN3 alias from its name.

The expanded comparison has 3,599 field occurrences: 3,573 matches and 26 differences.
These are 59 occurrences for each of 61 mapped weapons, including duplicated fields.
The remaining differences are 21 EF88 occurrences and five bolt-action firing rates
(L115A3, M2010ESR, MiniFix, MRAD, SV98M). Resolve bolt-cycle timing before replacing
effective rates with the registry's common 299.999 RPM firing-cycle configuration.

L115 base velocity was corrected from 664 to 742 m/s. Its raw WB InitialSpeed.z
and named registry agree; the site's Basic Barrel selector links only ADS effects.
The ten source hashes and previous value are retained in
`reference-data/provenance/frosty-1.4.2.5-l115-velocity.json`. The factory package
unlock XML has a null data reference and does not itself establish activation.
This correction does not claim to validate factory package activation or all mechanics.
Ten targeted barrel-velocity, ballistics and estimated-weapons tests passed;
`node scripts/validate-data.mjs` passed for all 62 weapons.

The counts below record earlier passes and are superseded by the expanded comparison.

The latest completed work adds `scripts/frosty-sdk-metadata.ps1` and the captured
`reference-data/provenance/frosty-sdk-field-types.json`. Reflection of the current
BF6SDK.dll confirms that both raw recoil exponent fields and the registry's
`Class_850e9af6.Field_42c8b257` use `System.Int32`. The configuration extractor
now uses that evidence to decode signed hexadecimal integers while preserving
raw literals. Unknown/unsigned values are not reinterpreted as signed integers.
Four focused Python conversion tests passed. Run them with:

```powershell
python scripts/frosty-configuration.test.py
```

The comparison now includes both recoil exponent fields for both aim states:
944 comparisons, 922 matches, 22 differences. All 64 added exponent comparisons
match the existing site. Earlier comparison counts in this document describe
the preceding scalar-only pass. Runtime data remains changed only for EF88 velocity.

The five remaining unmatched attachment selectors were checked in their weapon
folders: only their ability files contain the selector GUIDs. This does not prove
zero effects or an extraction failure; their setup still needs investigation.

The local SDK type cache maps the recoil structure GUID to `GunSwayRecoilData`
in Frosty's older `ClassGuids.txt`, but its older field layout differs. Do not
copy that layout by position. Modifier operation meanings remain unresolved.

An exporter precision limitation was also found in
`FrostySdk/IO/EbxXmlWriter.cs`: float and double output uses plain `ToString()`,
and the project targets .NET Framework 4.8. The typed extractor preserves the
exported decimal value; it does not claim to reconstruct original float bits.
Investigate round-trip/invariant numeric formatting before requesting exports
for bit-exact mechanics validation. No Frosty source or installed binary was changed.

After resumption, prioritize source-backed weapon identities and the remaining
attachment/operation questions. Recheck the working tree before continuing.

1. Establish a source-backed internal/site identity map. Distinguish absent site
   weapons from aliases; a GS file alone does not prove multiplayer availability.
2. Resolve raw type names and field mappings, with special attention to BREN3
   and KSG. Candidate value matches must not become authoritative names without
   additional evidence. KSG's `MD_KSG` export is now repaired and validated,
   including a separate exported-ID correction. See `FROSTY_LIVE_REVIEW_2026-09-06.md`
   and `reference-data/provenance/frosty-md-ksg-review.json`.
3. Resolve the recorded attachment graph issues and factory selection. The
   progression-to-WPM/GS graph is now available; shared numeric operations and
   array semantics still need interpretation.
4. Resolve operation order, state activation, fire-mode limits, reload timing,
   and projectile selection. Separate configuration from derived behavior.
5. Integrate supported fields with source provenance and targeted checks.
   Recoil/spread update formulas need evidence beyond XML coefficients. Keep
   unverified simulation behavior identified as an estimate.

Generated evidence is under `outputs/frosty/1.4.2.5/` and is ignored by Git.
The script, this checkpoint, and promoted field evidence are maintained repository
files. The EF88 velocity change is local. No commit, push, or deployment has been performed.

Current live comparison and follow-up mechanics findings: [6 September review](FROSTY_LIVE_REVIEW_2026-09-06.md).
