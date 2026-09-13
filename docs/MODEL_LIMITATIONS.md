# Model limitations and unresolved evidence

[Documentation index](README.md) · [Data sources](DATA_SOURCES.md)

This is the current interpretation boundary at the documentation review baseline.
It is not a new implementation plan. Changes require supporting evidence and an
explicit model/data review; a source coefficient alone does not establish how to
execute it in the analyzer.

## Configuration versus behavior

The live dataset combines versions and evidence types. `damageStatus: verified`
means accepted by this project; individual source notes can still say pending
in-game confirmation. No weapon is estimated or uses donor values, but
attachment assumptions and field-level uncertainty remain. Historical notes
can describe earlier states, including fire-mode limitations
that the current resolver has since addressed.

## Current attachment source boundaries

Linear Comp and all eight supported burst selections now have source-backed
ADS/hip amount and variation steps. Their old whole-record assumption flags
are removed. This does not validate burst cadence or the native recovery equation.
The additional -0.0006-second duration operand is applied on five burst weapons
after the muzzle duration override. Activation and composition remain model
choices; see the
[field review](../reference-data/provenance/frosty-assumption-review.json).

L110/M123K 200-round boxes have no modeled moving-ADS spread penalty. Matched
HUD screenshots and the missing source modifier support removing the old estimate.
The conflicting descriptions remain possible game/description bugs to recheck
after updates; no future fix or penalty magnitude is assumed. M240L
75-round spread improvement is linked to a source +1 index. The
[attachment guide](ATTACHMENT_MODEL.md#belt-box-moving-ads-spread) gives values
and limits. SVK-8.6 Adjustable Angled is not selectable: its source ability
branch does not establish in-game availability.

## Retained source fields that are not fully simulated

| Area | Current boundary |
|---|---|
| Recoil `duration` | Integrated as uniform delivery with concurrent recovery; native delivery shape and modifier order remain unresolved. |
| Recoil `decNorm`, `shootingDecScale` | Retained; no independent native norm/scaling branch. Current recovery is component-wise stepped arithmetic. |
| Spread `idle*`, `firstShotMul` | Retained; no idle-state machine or first-shot multiplier application. |
| Hip table's five hashed columns | Preserved exactly; runtime uses only standing/moving columns. Additional stance meanings are not assigned. |
| FZT ADS-out and AZT animation arrays | Retained in research; not appended to the ADS-in ladder or equated with reload/draw timing. |
| Visual recoil, sway, laser visibility, spotting, collateral, regeneration delay | Scalars/tags where supported; no separate camera, visibility, penetration or healing simulation. |
| Empty reload / manual cycle | Empty reload remains raw. Shell-fed shotguns store a one-shell tactical reload and no empty reload. Bolt and pump cadence use the Frosty cycle; attachment effects on that cycle are not modeled. |

## Explicitly deferred or normalized behavior

**Recoil recovery and smooth-recoil attachments.** The source factors, exponent
fields, and native class layouts do not independently validate the current recovery
equation. The model uses a 0.05-second duration override and 1.2 recovery-factor
multiplier for ordinary Smooth modifiers, or 0.066667 seconds and 1.728 for 17
source-mapped Bolt weapon–muzzle combinations, in ADS and hip. The current base
duration check found 0.025 seconds in both aim states for all 63 weapons; the
simulator reads each weapon record rather than imposing that value globally.
The source provides these operands;
recordings support the qualitative effect, not the exact native arithmetic.
Recovery uses a continuous reset-on-shot clock with at most 1 ms delivery steps.
The old 1.1 was an early visual estimate and is no longer used.
The new M4A1 15-round recoil-only height reduction is 10.0%, compared with about
15% in the impact/camera observations. Camera pixels are not projectile angles.
See [validation and unused-field review](archive/RECOIL_MODEL_VALIDATION_2026-09-11.md).
The [per-attachment table](RECOIL_SPREAD_MODEL.md#duration-and-smooth-attachment-selection)
defines the Bolt exceptions. They have no separate recording validation. PP-19
Flash Comp retains the ordinary Smooth estimate because its captured description
supports the effect but the retained selector trace does not resolve its modifier.
VSSM Folding Stock now applies source decay factor `76` and time exponent `1.24`
in both ADS and hip fire, alongside its hip effects and 800 RPM automatic mode.
These values use the existing recovery equation; native timing remains unverified.
The base VSSM retains factor `13.7` and exponent `0.5555` without the stock.

**Heavy-type barrels and lights.** Heavy, Heavy Extended and Cryogenic use source
ADS increment 0.666667, firing recovery coefficient 1.837117, and firing/not-firing
offset factors 0.666667. AK4D Basic/Heavy recordings support the ADS-only reduction
and slightly favor the source factors over the old fitted set. The research HUD
error improvement from 1.98 to 1.85 px is not an angular calibration or a direct
site-simulator accuracy score. Other weapons/variants remain source-based transfer.
Hipfire and spread minima are unchanged; the idle operand remains unused. See the
[recording comparison](archive/AK4D_HEAVY_BARREL_RECORDING_ANALYSIS_2026-09-11.md).
Light/combo-light modifiers now apply source hipfire increase, firing coefficient,
and firing/not-firing offset factors in the existing recovery equation. Their
[target-name trace](../reference-data/provenance/frosty-light-field-names-2026-09-13.json)
matches 248 named source states. The [implementation trace](../reference-data/provenance/frosty-light-implementation-2026-09-13.json)
covers all 137 supported selections. Selecting a light treats it as active;
there is no on/off, aim-trigger or native modifier-order simulation. Separate
selected light and combo-laser factors multiply. The idle operand remains unused.

**VSSM baseline composition.** Hipfire now uses raw index 4, supported by matched
standing HUD screenshots. The moving minimum follows that source row; an
independent projectile-angle calibration remains unavailable. The ordinary
suppressed barrel's GS +1 binding differs from its WB animation/FOV route. Both
VSSM barrels have zero WB ADS adjustment, matching the site's 250 ms default.
The earlier 200 ms proposal read the GS route alone; the two routes are not added.
The reason for their disagreement and native timing remain open. These exceptions do not
invalidate the source arrays themselves. See [stat ladders](STAT_LADDERS.md).

**Attachment identity and activation.** A name match, selector candidate or nearby
modifier is insufficient for promotion. Historical investigations retain unresolved
mapping/activation questions, including angled-grip mappings and native composite
stat consumers. Treat those as dated evidence, not a count of current defects.
Magazine capacity alone cannot resolve attachment identity.

**Global estimates.** The [continued source audit](working/FROSTY_GLOBAL_CANDIDATES_2026-09-13.md)
found a controller modifier with 0.8836 operands on 57 weapons; the six sniper
rifles have no matching GS binding. Its native activation and operation remain
unresolved. The analyzer now uses the source value 0.8836 in its existing platform
model; its universal application remains a model choice. The soldier's
5-second regeneration baseline and +4/+2-second ammo additions are now used
directly in the display model. The collateral table is corroborated by its named
attribute delegate. Generated per-weapon ammo values now use summed source indices
clamped to 0..9, following the operator's confirmation of table bounds. M121 A2
Tungsten therefore uses index 9 and multiplier 1. This is a displayed collateral
stat, not a simulation of material traversal.
Spotting now multiplies source factors using the existing 54/150 m bases; the
bases and composition are inferred from site/source agreement. Sway percentages
cover source muzzle/magazine amount factors, excluding optic/camera effects.
Light operands are source-backed; their activation and operation are modeled as
described above.

**Timing validation.** Source draw-time arrays and base indices are retained exactly,
with one final clamp. Historical sprint comparisons used inherited screenshot
identity mappings. Deploy/undeploy lack equivalent panel measurements; matching
sprint recovery does not prove native animation composition. ADS bases retain
reviewed normalization rather than indiscriminately replacing every base with raw indices.

## Output interpretation

Sprays are deterministic samples given seed/settings, not expected player accuracy.
Uniform angle plus `r = spread * U ** distExp` uses the source state exponent.
The usual 0.5 gives uniform area. M39 settled hipfire supports this interpretation;
other states and native field consumption remain unverified. The
scatter layer contains ten fixed samples, not a statistical confidence band.
Recoil control subtracts only the expected vector; console scaling does not simulate
aim assist or controller input. Effective spread is a bounded 50-shot endpoint.

Target shape and zones are approximate. Individual pellets are not simulated;
shotgun target hit/damage/lethality statistics are therefore suppressed. Ordinary
shotgun damage/BTK assumes all pellets hit one zone. Target damage totals include
hits after the first lethal shot. No armor, missed-shot TTK, reload interruption,
healing, target motion or obstruction is modeled.

Ballistics use generated projectile coefficients and explicit weapon/ammo links
for all 63 weapons, plus available velocity. Missing selections have no global
coefficient fallback. Non-ammo SP projectile branches remain excluded. Zeroing omits
sight height; level flight time and vector trajectory are distinct calculations.
The UI's zero-displacement fallback for unavailable trajectories must not be
interpreted as confirmed flat flight.

Shared links omit seeds, layers, viewing transforms and some local preferences.
Use an image when preserving a specific rerolled visual result matters. PNG capture
standardizes layout while copying existing canvas bitmaps.

## What would justify an update

Record the exact source/capture version, weapon and complete default/composed
loadout, relevant fields and units, source hashes, and predicted versus observed
behavior. Separate identity, literal value, activation, and calculation claims.
Promote the supported part and retain contradictions. Update the responsible guide
and a focused behavioral test; do not erase historical evidence to make the current
model appear more certain.
