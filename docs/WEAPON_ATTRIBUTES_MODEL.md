# Weapon Attributes model

Reviewed against the research checkers and capture results on 21 September 2026.

## Names and scope

The game's data calls this system **Weapon Attributes**. The four bar attributes
are **Hipfire, Precision, Control and Mobility**. Use those names in documentation
and future UI work. “Composite stats” is our older research term, not the game's
name. Existing `composite-*` files retain their names to preserve references.

The game uses the Weapon Attributes name for more than these four bars:

- Calculation assets are under `Common/Hardware/AttributeDelegates/` and use
  names such as `WeaponAttributesConfig_HipfireAttributeDelegate`,
  `WeaponAttributesConfig_ControlAttributeDelegate1` and
  `WeaponAttributesConfig_MobilityAttributeDelegate`.
- UI assets include `WeaponAttributes`, `WeaponAttributesCell`,
  `WeaponAttributeProgressBar`, `WeaponAttributesDelta` and
  `WeaponAttributes_ExtendedList` under `Common/UI/WeaponCustomization/Widgets/`.
- Rate of Fire, Headshot Multiplier and Collateral Multiplier also have delegates.
  They are outside this guide's four-bar scope.

Do not use the older Firepower/Accuracy/Range/Handling archetype keys as substitutes.
“Gunsmith Panel” is a third-party label, not the verified game-data name.

## Current implementation status

The calculations run in research checkers. **Production display/integration of
the four bar attributes is on hold at the operator's request.** Some underlying
attachment corrections have been promoted to production, including sniper
Tungsten Core recoil and L115 QD Grip Pod's missing moving-ADS penalty binding.
That does not mean all research exceptions are in the production resolver.

| Attribute | Current method | Main input |
|---|---|---|
| Hipfire | Nonlinear formula and delegate-specific table | Resolved hip-dispersion index, plus shotgun dispersion and a conditional factor |
| Precision | Per-weapon game lookup table | Recoil tier sums, firing rate and recovery/spread inputs |
| Control | Nonlinear formula | Unrounded ADS recoil amount and direction variation |
| Mobility | Weighted sum of indices | Deploy, ADS animation, sprint recovery, ADS movement and moving-ADS accuracy |

These are menu scores. They are not percentages of hit probability, physical
accuracy, recoil reduction or movement speed. A ten-point difference does not
have the same gameplay meaning across weapons or attributes.

## Calculation pipeline

1. Select the weapon and exact attachment identities, including per-weapon variants.
2. Start with explicit defaults, then apply the recorded loadout and any previewed
   attachment. Resolve shared mounts through the loadout model.
3. Compose actual attachment operands: add tier shifts, apply multipliers where
   specified, and use weapon-specific overrides and bindings.
4. Resolve the physical values and source indices. Preserve unrounded inputs
   where the attribute calculation needs them.
5. Apply the appropriate formula or select a Precision table row.
6. Compare `Math.round(score)` with the integer shown in the screenshot.

Do not add displayed attribute deltas together to predict a combined build.
Hipfire and Control are nonlinear; Precision is a lookup; Mobility depends on
resolved indices and their bounds. Compose the inputs first.

The research inputs come from `data/weapons.json`, `data/attachments.json`,
`data/ammo.json`, `data/balance_tables.json`, versioned Frosty evidence and dated
panel audits. Screenshot correction ledgers change the observed reference values,
not the formulas. Full-loadout audit records use an explicit `loadout` object.

## Control

The current candidate follows the `ControlAttributeDelegate1` calculation:

```text
v = V × π / 180
Control = 96 / (1.1 × R × sin(v) / v + 0.75)^2.25 + 4
```

`R` is effective ADS recoil amount in degrees. `V` is effective ADS recoil
direction variation in degrees; convert it to radians for the sine term.
The calculation uses recoil amount and variation, not the rounded extended-panel
recoil label. The current checker does not include an additional fire-rate term.

Recoil amount uses the source tier model:

```text
R = baseRecoilAmount × amountMultiplier^(sum of amount tier shifts)
```

For a multiplier of 0.94, a positive shift reduces recoil and a negative shift
increases it. Recoil variation has its own base, multiplier and exponent. It must
not be changed merely because recoil amount changes.

The production resolver rounds some recoil values to three decimals. The checker
recovers the integer tier shift from the resolved/base ratio and reconstructs the
unrounded value before calculating Control. Otherwise readings near an integer
rounding boundary can differ by one point.

### Tungsten Core example

M2010 ESR, PSR and SV-98 use −6 ADS and hip amount steps. L115 and Interdictor
use −1. Mini Scout binds both modifiers and uses −7. With multiplier 0.94:

| Penalty steps | Recoil factor | Recoil increase |
|---|---:|---:|
| 1 | `0.94^-1 ≈ 1.06383` | 6.38% |
| 6 | `0.94^-6 ≈ 1.44955` | 44.95% |
| 7 | `0.94^-7 ≈ 1.54207` | 54.21% |

The M2010 paired build with Double-Port Brake changes Control from 27 to 17 when
FMJ is replaced by Tungsten Core. We calculate the combined recoil tier first;
we do not subtract the bare weapon's displayed Tungsten delta.

The intended balance across sniper rifles is unknown. Model actual bindings,
not the hypothesized intended six-step rule. See [attachment bug 13](ATTACHMENT_BUGS.md#13-sniper-tungsten-core-recoil-penalties-are-inconsistent).

### Limits

The sine operation's native hash meaning is inferred from the decoded calculation
and matches; complete native execution is not independently established. At
`V = 0`, the mathematical limit of `sin(v)/v` is 1, but the current checker does
not implement a zero-variation guard. That case needs a deliberate implementation
and check before broader production use. Do not silently clamp Control to 100
on the assumption that every bar shares Hipfire's clamp.

## Hipfire

The checker uses the delegate's own dispersion ladder, in source index order:

```text
[8.032, 4.848, 3.352, 2.432, 1.804, 1.352, 1.024, 0.784,
 0.608, 0.476, 0.38, 2.16, 1.444, 0.972, 0.656, 0.444, 0.304, 0.208]
```

Do not sort this list or substitute the simulator's spread table. In particular,
the delegate has 8.032 at row zero where the site's spread table has 7.4.

The effective index is the weapon's base index minus the applicable hip-spread
tier shift, bounded to the table. The checker currently excludes the ammunition
hip shift for non-shotguns; that retained branch has not been independently
generalized. Shotguns use their resolved ammo shift and add the separate firing
dispersion angle from the weapon blueprint to the table angle.

For effective angle `H`, in degrees:

```text
B = min(100, 10 × sqrt(
      0.425 / tan((1.25 × H) × π / 180)
      × 83.33333587646484 / 40.92409896850586))
Hipfire = min(100, B × F)
```

The present candidate for `F` is 1 when resolved hip spread increase per shot
equals its base value, and `sqrt(1.2)` otherwise. This reproduces the reviewed
lights and VSSM Folding Stock cases. It is an **inferred condition**, not a fully
decoded native comparison. The exact game input behind `IncreasePerShotFraction`
and the direction/meaning of its comparison still need confirmation.

For L115 Standard Suppressor, the research checker excludes the generic hipfire
penalty because L115's GS has no corresponding selector binding. It retains the
other suppressor effects. This exception is not proof that the generic production
muzzle modifier is correct for L115; see [bug 12](ATTACHMENT_BUGS.md#12-l115-standard-suppressor-omits-the-hipfire-penalty).

The EF88 A/B pair with Standard Suppressor changes Hipfire from 40 to 47 when
5 MW Red is replaced by 50 MW Blue. This tests penalty/bonus composition rather
than an isolated laser bonus. Native sourcing of the shotgun angle remains a
source-backed candidate supported by panel matches.

## Precision

Precision currently uses game-authored **per-weapon lookup tables**, not a fitted
universal equation. No separate Precision delegate was identified in the reviewed
exports. The tables are in:

```text
Common/GameSetup/GameConfigurations/GlacierGameConfiguration/settings
Class_fe5894b1.Field_d0874615
```

Current captures use the 1.4.3.0 table extraction. The old checker default still
points to the dated 1.4.2.5 extraction, so pass the current table file explicitly.
The changed 1.4.3.0 settings export must take priority over a stale overlay copy.

The checker constructs six keys:

| Key | How it is obtained |
|---|---|
| `amountSum` | Table base amount sum plus resolved ADS recoil amount tier changes |
| `variationSum` | Table base variation sum plus resolved variation tier changes |
| `rpm` | Resolved firing rate |
| `minAngle` | The checker's `recoilIncAds` input; do not substitute an arbitrary ADS spread field based on the key name |
| `duration` | Resolved ADS recoil duration |
| `decrease` | ADS decrease factor multiplied by the separately stored recoil-decay multiplier |

Selection proceeds in this order:

1. Match both tier sums exactly and the other keys within relative tolerance
   `1e-4`. A row value of −1 in those other keys is treated as a wildcard.
2. If several rows match, accept only if all their scores round to the same
   integer. Otherwise report ambiguity.
3. If the weapon has only one keyed row, use it as the current single-row rule.
   Bolt-action tables can store a cycle value in the RPM column.
4. Try relative tolerance `2e-3` for known source/resolver precision differences;
   again require agreement after rounding.
5. If there are no keyed rows and exactly one fallback row, use it. L115's
   fallback score is 100.
6. Otherwise report no matching row. Do not invent a value or interpolate silently.

Tolerance uses `tolerance × max(1, abs(input))`. These selection conventions are
the research checker's reconstruction, not a claim to have decoded every native
provider rule. Preserve the method (`exact`, `near`, `single-row`, `fallback`,
etc.) with the result so a match's evidential strength remains visible.

VSSM's current table matches the reviewed current grips and Folding Stock pair.
Historical VSSM images remain different. Do not alter the current table to fit
an older game's readings.

## Mobility

The current candidate is a weighted sum of source-order indices:

```text
Mobility = D + 4A + S + 2M + 4Z + 4C
```

| Symbol | Game input / meaning | Weight |
|---|---|---:|
| D | `WeaponDeployTimeIndex` | 1 |
| A | `AnimationZoomSettingsIndex` | 4 |
| S | `SprintSettingsIndex` | 1 |
| M | `WeaponZoomedMoveSpeedMultiplierIndex` | 2 |
| Z | `MovingZoomedMinAnglesIndex` | 4 |
| C | `CanFireWhileSprinting`, represented as 0 or 1 | 4 |

Use **indices**, not milliseconds, movement multipliers or spread angles in this
sum. Higher indices in these resolved ladders represent faster or steadier values.
The checker finds indices by locating the resolved values in the relevant balance
tables. Deploy uses the weapon's primary/secondary deploy table. An unmatched
index makes the result unavailable; it must not silently become zero.

Important source distinctions:

- L115's ADS animation base index is 2, while its zoom-transition base is 1.
  The resolver's ADS-time value follows the transition input. Mobility needs the
  animation input; substituting transition loses four points.
- L115 QD Grip Pod has no moving-ADS penalty binding. The production override is
  zero. Light + Violet gives Mobility 54; adding QD Grip Pod gives 58.
- KS Slim Angled's dispersion modifier is in a different GS collection from
  moving-ADS modifiers. The research checker excludes the presumed moving-ADS
  penalty. With 4 Rnd Fast + Violet, Mobility is 74 then 80 when Slim Angled is
  previewed. The other field's actual gameplay effect is still unresolved, and
  production now excludes the moving-ADS penalty, supported by the indicator
  follow-up below.
- Compact Handstop sets the source sprint-fire boolean. The checker recognizes
  its attachment identity and adds four. This is not a generic detection of every
  possible future attachment that might set that boolean.

These are corrections to inputs, not arbitrary per-weapon score offsets. Bounds
come from resolving the relevant ladders. A universal final clamp is not currently
implemented for Mobility and has not been established by these captures.

## Preview state and gameplay state

A locked attachment can still produce a useful menu preview. Record the equipped
build and the hovered attachment separately. Do not describe a hover screenshot
as an equipped gameplay test.

Eight reviewed burst-selector previews retain non-burst recoil inputs for
Precision, with corresponding Control preview behavior. The checker applies this
exception when the audited selection is the burst ergonomic attachment. It is
not a general rule for arbitrary full loadouts with burst enabled; those need
their own validation. VSSM Folding Stock is a separate conversion and is not in
that burst exception set.

PP-19 Flash Comp has no source smoothing binding. The Precision checker keeps
the unsmoothed duration/decrease keys for that selection. Preview-specific
handling must not silently remove valid modifiers from the firing simulator.

Both VSSM barrels have integrated suppression: **200 mm Factory, 30 points**, and
**200 mm ASM, 20 points**. The paired captures use ASM. A separate muzzle
suppressor is not part of those builds.

## Evidence and confidence

| Current capture set | Panels | Result per attribute |
|---|---:|---|
| EF88, BROD 3 and KTS100 replacements | 131 | 131 matches |
| Remaining targeted attachment panels | 17 | 17 matches |
| Six paired loadouts | 12 | 12 matches |
| Total | **160** | **160 matches each; 640 displayed values** |

These counts describe the checked current panels, not an exhaustive enumeration
of every legal build. Some are previews. Historical measurements, obsolete 0/1
Precision UI readings and current captures must remain separate populations.

Confidence is strong for the tested menu combinations. Still open: more extreme
index bounds, other combined builds, conditional activation, the Hipfire fraction
comparison, some native input/provider semantics, zero-variation Control, and the
alternate KS dispersion field. No matching bar establishes shot-pattern behavior.

## Files and reproduction

- [Control/Hipfire/Mobility checker](../scripts/frosty-composite-check.mjs)
- [Precision checker](../scripts/frosty-precision-check.mjs)
- [Current Precision tables](../reference-data/provenance/frosty-precision-tables-1.4.3.0-2026-09-21.json)
- [131-panel evidence](../reference-data/provenance/composite-current-results-2026-09-21.json)
- [17-panel evidence](../reference-data/provenance/composite-remaining-results-2026-09-21.json)
- [Paired-loadout evidence](../reference-data/provenance/composite-combination-results-2026-09-21.json)
- [Research rules and their confidence](../reference-data/provenance/composite-panel-rules-2026-09-21.json)
- [Mobility source trace](../reference-data/provenance/composite-mobility-source-trace-2026-09-21.json)
- [Dated investigation history](working/COMPOSITE_STATS_FINDINGS.md)

Run from the repository root:

```powershell
node scripts/frosty-composite-check.mjs --audit reference-data/attachment-audit/composite-combination-panels-2026-09-21.json
node scripts/frosty-precision-check.mjs reference-data/provenance/frosty-precision-tables-1.4.3.0-2026-09-21.json --audit reference-data/attachment-audit/composite-combination-panels-2026-09-21.json
```

Use `composite-current-panels-2026-09-21.json` or
`composite-remaining-panels-2026-09-21.json` to reproduce the other current sets.
Without `--audit`, both scripts use the historical audit. Do not interpret that
default run as the current capture pass rate. Stored result hashes describe the
inputs at the time of each run; later source changes require a fresh comparison.

### 18.5KS-K ADS indicator follow-up (21 September)

Twelve controlled captures support no Slim Angled moving-ADS penalty. No grip and
Slim Angled match within one pixel, while Folding Stubby widens the moving indicator.
Production now uses `movingAdsSpreadTierMod: 0` for `ks18k` Slim Angled, superseding
earlier statements that this production correction was pending. The alternate Frosty
field remains unidentified; this is indicator evidence, not a pellet-distribution test.
Evidence: `reference-data/provenance/ks18k-ads-indicator-2026-09-21.json`.

## Site stat cards and proposed grouping

Checked against `renderStats()` and `renderAttachmentStats()` in `ui/app.js` on
21 September 2026. This is a design comparison; no UI integration is enabled.
A card can be related to an attribute without being an input to its score.

| Attribute | Existing overview cards that represent score inputs | Related cards that are not established score inputs |
|---|---|---|
| Hipfire | Hipfire Spread: standing value corresponds to the resolved hip tier, with a delegate-specific ladder | Moving Hipfire Spread is useful context, not a separate term |
| Precision | Recoil Amount, Recoil Variation, Fire Rate, Spread Inc/Shot | Standing ADS Spread is useful accuracy context but is not the lookup's `minAngle` input; moving ADS Spread feeds Mobility |
| Control | Recoil Amount, Recoil Variation | Recoil Direction does not enter the current score formula |
| Mobility | Deploy Speed, Sprint Recovery, Strafe Speed, moving half of ADS Spread; ADS Time is related to the animation input but not always equivalent | Tactical reload is not a Mobility input |

### Inputs not fully shown by the current cards

- **Hipfire:** Hip Spread/Shot is available in Attachment Effects, but not an
  overview card. Its resolved-to-base ratio drives the checker's inferred gate.
  The separate shotgun blueprint firing-dispersion angle is not exposed as a
  card. The attribute's own dispersion ladder also differs from the simulator
  table, so the visible Hipfire Spread value alone cannot reproduce every score.
- **Precision:** recoil duration is not exposed. The full ADS recoil decrease
  input (source decrease factor times the separate decay multiplier) is not
  exposed. Attachment Effects shows only the multiplier as Recoil Recovery.
  The game table's amount/variation tier sums and fallback selection are internal
  inputs, not additional physical stats to present as cards.
- **Control:** both physical inputs already have overview cards. The score needs
  their unrounded values; card rounding can hide small differences.
- **Mobility:** CanFireWhileSprinting is not exposed as a stat. The ADS animation
  index is separate from the transition time shown by ADS Time; L115 demonstrates
  the distinction. The other contributing physical stats are visible, but their
  source ladder indices and weights are not displayed. Those are calculation
  details, not missing user-facing measurements.

### Cards outside these four scores

Base Damage, HS/Limb Mult, Bullet Velocity, Magazine Size, Tac Reload,
Collateral Mult and 3D/2D Spotting do not enter the current four-score model.
Keep Combat, Ammo and Concealment groups available. Bullet Drag and ADS/Hip
Spread Recovery in Attachment Effects also have no established independent term
in these scores. Recoil Direction and standing ADS Spread remain useful even
though they are not current score inputs.

### Display recommendation

Keep the existing physical-stat groups and add a compact Weapon Attributes row
above them. Selecting an attribute can highlight its contributing cards and open
an explanation with any missing inputs. This avoids duplicating recoil cards
between Precision and Control or hiding damage/ammo/concealment information.
Label related context separately from score inputs. If cards must be placed under
the four bars, put recoil amount/variation primarily under Control and link them
from Precision; put moving ADS Spread under Mobility and stationary ADS Spread
under Precision as context. Split the existing paired ADS Spread card first.

Use a short note: these are game menu scores, not percentages. Add Recoil Duration,
full Recoil Recovery and Can Fire While Sprinting to attribute details before
considering more overview cards. Keep the source tier indices in an advanced
explanation. No UI layout or implementation is authorized by this comparison.
