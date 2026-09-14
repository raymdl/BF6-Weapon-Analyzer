# Attachment source generation review

## Latest belt-box decision

The September 13 ADS screenshots supersede the retained-penalty conclusions below.
L110/M123K 200 Rnd now have zero magazine spread shift. The descriptions remain
possible game/description bugs to recheck after updates. Current generation has
5,493 fields and zero deferred fields. See the
[capture evidence](../../reference-data/provenance/belt-box-moving-ads-2026-09-13.json).
Earlier counts and unresolved notes below record the investigation before these captures.

## Barrel ADS: implemented

The runtime now reads per-weapon barrel ADS steps generated from Frosty XML.
The manual shared `adsTimeTierMod` fields were removed from the barrel catalog.
`scripts/frosty-barrel-ads.py` uses the earlier report only to map site IDs to
source attachment paths. It rebuilds the ability/selector/WB graph and decodes
`Field_9540bd8e` on the animation and FOV ADS effects as a signed integer.
The two parallel effects count once when they agree. Conflicting values stop
generation. The separate GS route does not contribute to this calculation.

All current values are unchanged. There are 233 unique weapon/barrel selections
from 234 source attachment records. KTS100 Short has two agreeing records. The
earlier report's description of 234 unique selections was incorrect.
M4A1 Basic is 200 ms. Both VSSM barrels are 250 ms with other default attachments.
Source operands support these inputs; this does not establish native timing.

Regenerate with:

```powershell
python scripts/frosty-barrel-ads.py --root 'C:/Users/royal/Documents/BF6 Datamining/Frosty Exports/1.4.2.5'
```

Use `--check` for a read-only comparison. The browser loads the generated fields
from the existing attachment catalog; it does not need access to local XML.

## Grip, laser and magazine generation: implemented

`scripts/frosty-attachment-handling.py` rebuilds the current source graph and
generates 5,491 fields and three base indices, with no changes to effective handling
results. The older audit and the follow-up identity manifest
supply attachment identities only. WB animation/FOV ADS effects are checked
independently of GS ADS. Equal parallel ADS effects count once. Other handling
effects require one unambiguous operand per axis. Source speed and hip-minimum
indices are converted to the site's existing sign convention. Branch conflicts
remain explicit exceptions.

| Area | Mapped selections | Generated fields | Fields retained for review |
|---|---:|---:|---:|
| Grip ADS time, ADS movement, sprint and draw | 828 | 3,312 | 0 |
| Laser hip-minimum and moving-ADS spread | 373 | 746 | 0 |
| Magazine ADS time, ADS movement, sprint, draw and moving-ADS spread | 287 | 1,433 | 2 |

Grips and lasers store per-weapon `frostyModifiers`. Their shared manual field is
removed when all supported uses of that field are generated. The resolver merges
the generated fields for the selected weapon, including grips in combined rail
slots. Magazines already have per-weapon records, so their generated values use
the existing fields. Reload timing and capacity are outside this conversion.

The five previously reported VZ.61 laser gaps were slot-classification errors:
Canted Stubby, Compact Handstop, Folding Stubby, Ribbed Stubby and Stippled Stubby
are grips selected through a shared rail. Their handling is now generated, and
their availability is stored in the grip category.

```powershell
python scripts/frosty-attachment-handling.py --root 'C:/Users/royal/Documents/BF6 Datamining/Frosty Exports/1.4.2.5'
```

Use `--check` to compare without writing, or `--review` to write evidence only.
The generator retains XML hashes, source effect GUIDs, field paths, branch IDs,
and exceptions. Legacy/TestData references excluded from the current-weapon
export are listed separately. If an already generated field loses its source
mapping, generation stops. A concurrent catalog edit also stops the write.

## Remaining details and corrections

### CQB Suppressor

The earlier CQB recoil/hip finding was incorrect. I reused the original audit's
reversed labels despite a later correction already being present in the repo:
`ImprvdSuppressor01_W30` is CQB; `ImprvdSuppressor02_W30` is Lightened. The apparent
CQB hip penalty and Smooth effects belong to Lightened. Those findings are
withdrawn; no CQB recoil/hip change is required.

The corrected labels are documented in
[the earlier correction](../archive/FROSTY_ATTACHMENT_REVIEW_DETAILS_2026-09-06.md).
The remaining spotting candidates are separate: the old audit multiplies two
linked values into 0.014 while the site uses 0.14 for M39 EMR/M417 A2 CQB and
DRS-IAR/M2010 ESR Lightened. This is an unresolved composition result, not proof
that the range should change from 21 m to 2.1 m.

### Sniper recoil

The requested brake conversion is now implemented. `GRM_Recoil_MZL_Bolt_P10.xml`
contains `0x00000006` at both the ADS and hip amount-tier additions.
`scripts/frosty-sniper-brakes.py` generates those steps into per-weapon muzzle
overrides for 16 weapon/brake pairs across Interdictor, L115, M2010 ESR,
Mini Scout, PSR and SV-98. It verifies the retained graph hashes and reads the
numeric operands from current XML. Use `--root <Frosty-export-root>` to regenerate
or add `--check` to compare without writing.

For M2010 ESR, with the current 1.5-degree base and 0.94 tier multiplier:

| Example | Previous value | Current value or remaining candidate |
|---|---:|---:|
| Brake (implemented) | `1.5 * 0.94^1 = 1.410` degrees | `1.5 * 0.94^6 = 1.034805` degrees, rounded to 1.035 |
| Tungsten | `1.5 * 0.94^-1 = 1.595745` degrees | `1.5 * 0.94^-6 = 2.174323` degrees |

These are model calculations, not measured game kick. M2010 ESR, PSR and SV-98
retain a pending -6 Tungsten candidate. Mini Scout now applies its combined
-1/-6 links as -7 steps in both aims, following the approved follow-up. Smooth Bolt duration and recovery overrides remain
in place, and other weapons retain their existing brake steps.

### M60/PW7A2 coordinates: resolved

Eight of the former 26 retained fields were coordinate offsets, not conflicting
relative effects. Frosty names the matching base indices in `GRX_Weapons.xml`:

| Base | Previous site index | Source index now used |
|---|---:|---:|
| M60 ADS animation/FOV | 2 | 1 |
| M60 ADS movement | 6 | 4 |
| PW7A2 ADS movement | 10 | 8 |

The generator now changes the bases and magazine modifiers together. For M60's
100-round ADS index, the old calculation was `2 - 1`; the source calculation is
`1 - 0`. For its 50-round magazine, `2 - 0` becomes `1 - (-1)`. Both preserve
the selected indices. The same relationship holds for movement.

Changing only the modifiers would have produced the following results. The
implemented base-plus-modifier conversion preserves the left-hand values exactly.

| Default other attachments | Retained result | Modifier-only substitution, not used |
|---|---|---|
| M60 50 Rnd, Heavy barrel | ADS 366.667 ms; movement 0.600 | ADS 300 ms; movement 0.745 |
| M60 100 Rnd, Heavy barrel | ADS 433.334 ms; movement 0.475 | ADS 366.667 ms; movement 0.600 |
| PW7A2 20 Rnd, Basic barrel | Movement 0.910 | Movement 1.000 |
| PW7A2 30 Rnd / 30 Fast, Basic barrel | Movement 0.745 | Movement 0.910 |
| PW7A2 40 Rnd, Basic barrel | Movement 0.670 | Movement 0.825 |

[The coordinate proof](../../reference-data/provenance/frosty-handling-coordinate-proof.json)
records all six magazine configurations before migration, the modifier-only
candidate, and the implemented source bases plus modifiers. These are current
model comparisons, not new game measurements.

### Green-laser mapping: resolved

The old audit grouped the normal 5 mW Green attachment with its `_IR_SP`
infrared single-player variant on M39 EMR and M417 A2. The normal LA-23 attachment
has the source hip step; the IRSP variant does not. The current site selection
now maps only to the normal attachment, so both hip fields are generated. Their
existing -2 site steps are unchanged. The excluded source records are explicit
in the follow-up identity manifest.

### Fourteen source-generation gaps resolved; two fields retained

DRS-IAR Alloy Vertical's four handling fields and both RPK-74M 30-round magazines'
ten fields now generate from their matched sibling modifiers. The three extra
selectors have no GUID occurrence in their own weapon WB/GS exports. They are
retained as reviewed unbound references, not assigned inferred numeric effects.
The generator stops if their binding inventory changes. All 14 generated values
match the previous site values.

[Unbound-selector evidence](../../reference-data/provenance/frosty-handling-unbound-selector-review.json)
retains selectors, weapon files and hashes. This resolves the exported input
mapping; it does not prove native activation or unavailable multiplayer branches.

L110 and M123K 200-round moving-ADS spread remain unresolved. Both captures state
that moving ADS accuracy is reduced, but show no numerical spread value. Their
linked source package contains ADS time, ADS movement speed, sprint and deploy
penalties, with no moving-spread operand. The existing -1 step remains explicitly
estimated in `assumedFields`. A source binding or controlled moving-spread
comparison is needed to establish its magnitude. ADS movement speed is a separate
stat and is not evidence for the spread step.

### 13 identities generated; one unavailable choice removed

| Site choice | Source identity | Result |
|---|---|---|
| Underslung Mount on AK-205, B36A4, L85A3, M16A4, M277, M417 A2, M433, M4A1 and SOR-556 MK2 | Eight explicit `UGL_Mount`/`UGLMount` attachment records; AK-205 uses its root-listed UGLMount ability progression | Four zero handling fields per selection; existing behavior preserved. |
| SVK-8.6 Adjustable Angled | Root-listed `U_PRG_SVCh_BTM_HFGA` branch, selector `U_WPM_BTM_Fast01_W25`, matched against SVCh's own WB | Removed from selectable options after the user confirmed it is unavailable in-game. Source presence does not establish availability. |
| M1014 4 Rnd / 4 Fast | `Attachment_M1014_MAG_Compact1` / `Compact2` | Both identities generated. |
| M87A1 5 Rnd / 5 Fast | `Attachment_590A1_MAG_Compact1` / `Compact3` | Both identities generated. |

The shotgun identities had already been resolved in the later September 7 review;
the original inventory used by this generator predated that correction. Capture
names/costs and source variant values distinguish the tube and speedloader. The
ordinary-tube variant value is 99; speedloader values are 4 for M1014 and 5 for
M87A1. These identify the variants; they are not reload-speed multipliers.

AK-205 lacks the standalone attachment XML, but its root-listed
ability progression and action references exist. The graph reader now accepts
explicitly requested ability progressions and follows the same source links.
It does not create a fake attachment XML or invent a point cost. The source
key points to a real ability branch GUID. SVK-8.6 Adjustable Angled is excluded
from the identity manifest and generated modifiers because it is unavailable in-game.

All 1,488 selections in this handling conversion now have source identities.
The broader review still has six unrelated identity gaps: five sidearm
Single-Port Brake entries and QBZ-192 Buffer. Generic sight categories also need
unique source optic identities before numeric conversion.

### Lights

Separate light edits arrived in the shared checkout during this pass. The current
runtime now applies source hip growth/offset factors of 0.666667 and firing
coefficient factor 1.837117 to the supported light selections. Their existing
tests pass and these edits were preserved. Thus the earlier statement that the
site still used only a 15% hip-recovery estimate is no longer current. Native
light activation/composition and the idle-recovery state remain separate limits;
the light tests explicitly retain the unimplemented idle behavior.

## Corrected broader comparison

All 6,596 retained source file hashes still match the current export. The updated
comparison covers 2,775 mapped current non-barrel selections and excludes 166
conditional selections from numeric comparison. It reports 6,810 field checks:
6,795 matches and 15 differences grouped into eight candidates after the sniper
brake and coordinate conversions. The former 251
difference count is superseded. These counts still use the earlier audit's
arithmetic; they are not confirmed runtime defect counts.

## Evidence and verification

### 14 September: general slot and dependency generation

`scripts/frosty-attachment-compatibility.py` now generates shared mount slots
from ability branches and attachment dependencies from equipment records. The
1,392 offered mount choices have complete source slot mapping; KORD and KTS100
now share laser/light slots. Twenty-two dependency rules cover PP-19 grips and
magazine-related ergonomics on AK-205, RPK-74M and RPKM. Of 285 source dependency
entries, 263 secondary-sight entries remain unoffered or unmapped. This replaces
manual shared-slot assignments and adds general prerequisite enforcement.

See the [compatibility evidence](../../reference-data/provenance/frosty-attachment-compatibility.json),
[Frosty findings](../../reference-data/frosty/README.md#shared-slots-and-attachment-dependencies),
and [maintenance command](../../MAINTENANCE.md#regenerate-attachment-modifiers).
The focused 45-test attachment/share suite, regeneration and data checks passed;
browser checks covered PP-19 grip removal/restoration and KORD device replacement.

### Earlier modifier verification

- [Generated barrel operands and source hashes](../../reference-data/provenance/frosty-barrel-ads-generated.json)
- [Generated handling operands, branches and exceptions](../../reference-data/provenance/frosty-attachment-handling-generated.json)
- [Recovered identity mappings](../../reference-data/provenance/frosty-handling-mapping-followup.json)
- [M60/PW7A2 before/after coordinate proof](../../reference-data/provenance/frosty-handling-coordinate-proof.json)
- [Generated sniper brake steps](../../reference-data/provenance/frosty-sniper-brakes-generated.json)
- [Current other-attachment comparisons and mapping gaps](../../reference-data/provenance/frosty-other-attachment-review-2026-09-13.json)
- [Retained source joins and comparison definitions](../../reference-data/provenance/frosty-attachment-full-pass-2026-09-06.json)
- [Light target identification](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json)

Verification passed: the source generator checks, 30 attachment-effect tests,
five draw-time tests, five existing weapon-data tests, and data validation for all
63 weapons. The added test checks generated fields and changes source inputs to
verify that combined-slot grip ADS and laser spread reach the calculation.
The recovery test covers all 13 retained identities and all six M60/PW7A2 magazine results.
No publication or deployment was requested.

## Linear Comp and burst assumption review

The current source graph resolves all 45 Linear Comp selections and eight burst
selections across the three ergonomic records. `scripts/frosty-assumption-review.py`
reads the signed ADS and hip recoil operands; the older audit supplies only
attachment identities. The four whole-record assumption flags are removed.

| Attachment | ADS amount / variation steps | Hip amount / variation steps |
|---|---|---|
| Linear Comp | -1 / +3, unchanged | -1 / +3, unchanged |
| Burst Training; SL9 Burst Mode | 0 / +3, unchanged | 0 / +3; variation is newly applied |
| GRT-BC Burst Training | +1 / +3, unchanged | +1 / +3; both are newly applied |

Burst attachments select a fire-mode modifier and a nested behavior node. That
node's mode mask 8 matches the selected enum value 3 and carries the selector
used by the weapon's GS recoil bindings. The source +1/-1 amount operands cancel
for the ordinary burst attachments; GRT-BC instead has +2/-1, leaving +1.

The report stores field operations, source status and simulation support
separately, with source paths/GUIDs/field paths, raw values and hashes. It retains
the ten additional `GRM_AutoIdentifier_P00` operations across five weapons
and applies them as -0.0006-second duration additions in ADS and hip. Burst cadence and recoil recovery
remain separate model questions. Tests cover the applied hip tiers and preserve
raw weapon groups; source regeneration verifies all 53 selections.

## Shared rails and belt-box follow-up

Shared mounts now use explicit slot definitions and typed rail state. One resolver
validates availability and supplies effects, points, labels and assumption markers.
Existing indexed and legacy share links remain compatible. The UI hides consumed
category controls and uses one shared menu.

A full-export reference search for the L110/M123K 200-round selector found no
additional spread binding. Both GS records select moving-spread index 3 (0.32);
0.43 exists at index 2 but has no linked magazine selection. The shared
`GDM_Array_ADSMoveDispersion_MAG_M10` operand is zero and neither GS links it.
The retained -1 adjustments remain estimated.

M240L 75 Rnd has selector `dd7850e3-43f7-40b4-9e0e-0fc0b3d779f6` linked in
`GS_M240L.xml` to `GDM_Array_ADSMoveDispersion_MAG_P10` (operand +1). This
selects index 4, 0.22 degrees, from base index 3, 0.32 degrees. The existing
Analyzer modifier already matches. The reviewed M60 options are 50/100 Rnd.


## Approved follow-up: recovery, duration, Tungsten and Slim Angled

The local implementation now applies Smooth Bolt's -0.5 time-exponent addition
for the existing 17 mapped muzzles. The burst generator applies AutoIdentifier's
-0.0006-second duration addition for its five traced weapons through per-weapon
ergonomic overrides. It runs after any muzzle duration override.
Mini Scout Tungsten now uses -7 amount steps in both aims, accepting the combined
-1/-6 links. The other sniper Tungsten candidates remain pending.
PSR/SV-98 Slim Angled and KS18K Slim Angled now use moving-ADS index addition -1.
The comparison counts above and historical comparison JSON describe the
pre-change snapshot. They must not be used as current unresolved-field counts.
