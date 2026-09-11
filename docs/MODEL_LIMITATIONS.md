# Model limitations and unresolved evidence

[Documentation index](README.md) · [Data sources](DATA_SOURCES.md)

This is the current interpretation boundary at the documentation review baseline.
It is not a new implementation plan. Changes require supporting evidence and an
explicit model/data review; a source coefficient alone does not establish how to
execute it in the analyzer.

## Configuration versus behavior

The live dataset combines versions and evidence types. `damageStatus: verified`
means accepted by this project; individual source notes can still say pending
in-game confirmation. No current weapon is listed in `estimatedWeaponIds`, but
attachment assumptions and field-level uncertainty remain. Historical nested donor
and estimate notes can describe earlier states, including fire-mode limitations
that the current resolver has since addressed.

## Retained source fields that are not fully simulated

| Area | Current boundary |
|---|---|
| Recoil `duration` | Integrated as uniform delivery with concurrent recovery; native delivery shape and modifier order remain unresolved. |
| Recoil `decNorm`, `shootingDecScale` | Retained; no independent native norm/scaling branch. Current recovery is component-wise stepped arithmetic. |
| Spread `idle*`, `firstShotMul`, `distExp` | Retained; no idle-state machine or first-shot multiplier application. Renderer uses its fixed uniform-radius sampler. |
| Hip table's five hashed columns | Preserved exactly; runtime uses only standing/moving columns. Additional stance meanings are not assigned. |
| FZT ADS-out and AZT animation arrays | Retained in research; not appended to the ADS-in ladder or equated with reload/draw timing. |
| Visual recoil, sway, laser visibility, spotting, collateral, regeneration delay | Scalars/tags where supported; no separate camera, visibility, penetration or healing simulation. |
| Empty reload / pump cycle | Empty reload remains raw; no general attachment-composed empty/per-shell model. Multi-shot pump TTK is unavailable. |

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
Standalone light recovery remains an assumed offset boost.
Combined laser/light records retain a hip boost that the current resolver does not
read from the laser slot. Do not describe every stored effect as active. Evidence:
[attachment boundary](../reference-data/provenance/frosty-all-attachment-effect-boundary.json)
and [historical comparison](archive/FROSTY_ATTACHMENT_COMPARISON_2026-09-06.md).

**VSSM baseline composition.** Hipfire now uses raw index 4, supported by matched
standing HUD screenshots. The moving minimum follows that source row; an
independent projectile-angle calibration remains unavailable. The ordinary
suppressed barrel's additional ADS tier remains a
source/default/version question; the runtime retains the reviewed 250 ms baseline
rather than applying an unconfirmed 200 ms candidate. These exceptions do not
invalidate the source arrays themselves. See [stat ladders](STAT_LADDERS.md).

**Attachment identity and activation.** A name match, selector candidate or nearby
modifier is insufficient for promotion. Historical investigations retain unresolved
mapping/activation questions, including angled-grip mappings and native composite
stat consumers. Treat those as dated evidence, not a count of current defects.
Magazine capacity alone cannot resolve attachment identity.

**Timing validation.** Source draw-time arrays and base indices are retained exactly,
with one final clamp. Historical sprint comparisons used inherited screenshot
identity mappings. Deploy/undeploy lack equivalent panel measurements; matching
sprint recovery does not prove native animation composition. ADS bases retain
reviewed normalization rather than indiscriminately replacing every base with raw indices.

## Output interpretation

Sprays are deterministic samples given seed/settings, not expected player accuracy.
Uniform angle plus uniform radius is center-weighted within each spread disk; it
is not uniform over area and is not automatically the native distribution. The
scatter layer contains ten fixed samples, not a statistical confidence band.
Recoil control subtracts only the expected vector; console scaling does not simulate
aim assist or controller input. Effective spread is a bounded 50-shot endpoint.

Target shape and zones are approximate. Individual pellets are not simulated;
shotgun target hit/damage/lethality statistics are therefore suppressed. Ordinary
shotgun damage/BTK assumes all pellets hit one zone. Target damage totals include
hits after the first lethal shot. No armor, missed-shot TTK, reload interruption,
healing, target motion or obstruction is modeled.

Ballistics use global coefficients plus supported ammo adjustments and available
velocity. The source-ID registry is not a strict applicability gate. Zeroing omits
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
