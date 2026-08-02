# Battlefield 6 Composite Weapon Stats: Formula Investigation

**Status:** Evidence-bound research findings; partial reconstruction  
**Date:** 2026-08-02  
**Patch/data scope:** Battlefield 6 data and attachment audit artifacts under `migration/1.3.3.0`

## Executive conclusion

The four in-game summary stats do not appear to be simple renamings or direct rescalings of one detailed weapon stat. They behave as UI composites built from multiple underlying weapon properties, tiered attachment effects, weapon-specific baselines, and integer display rules.

The available evidence supports the following conclusions:

| Composite | Current conclusion | Confidence |
|---|---|---:|
| **Hipfire** | The base value and most attachment changes can be reconstructed as a lookup on an effective hipfire tier. Light and laser recovery bonuses require an additional contribution beyond the current minimum-spread tier. | High for ordinary attachment transitions; medium for the complete composite |
| **Mobility** | Ordinary attachment deltas can usually be calculated from a weighted sum of ADS speed, ADS movement speed, moving ADS accuracy, draw/sprint recovery, and fire-while-sprinting effects. Base Mobility still needs a per-weapon observed value or additional hidden archetype/deploy inputs. | High for ordinary attachment deltas; medium-low for universal base values |
| **Control** | Recoil amount is a major input, but no single normalization of displayed recoil reproduces the UI value. Hidden precision and recoil recovery/decay probably contribute. | Low for an exact formula |
| **Precision** | This is the broadest and least identifiable composite. Evidence indicates contributions from ADS spread, spread recovery, recoil amount, recoil variation/decay, and possibly sway and moving accuracy. | Low for an exact formula |

The safe implementation boundary is therefore:

1. implement an evidence-backed Hipfire display lookup with explicitly modeled recovery contributions;
2. implement attachment-driven Mobility deltas while retaining an observed per-weapon base Mobility;
3. keep Precision and Control as observed values until controlled captures or the game's UI scoring data reveal their normalization functions.

It would be unsafe to publish fitted Precision or Control equations as exact formulas. The current data can produce plausible approximations, but it cannot uniquely identify the original game logic.

## Research question

The in-game weapon screen exposes four high-level statistics:

- **Hipfire:** general accuracy without aiming down sights;
- **Precision:** general accuracy while aiming down sights;
- **Control:** general recoil behavior;
- **Mobility:** a combination of handling and movement properties.

EA's loadout guide describes these categories at that same high level. It does not publish their equations, weights, normalization ranges, or rounding behavior. The purpose of this investigation is to determine how much of those equations can be recovered from the local Sym-derived weapon data and the detailed attachment audit.

## Sources examined

### Local data

- `data/balance_tables.json`
  - tier tables for hip spread, moving accuracy, ADS speed, ADS movement speed, sprint recovery, deploy-related values, and other weapon mechanics;
- `data/attachments.json`
  - normalized attachment behavior and tier changes;
- `data/weapons.json`
  - weapon records and current observed summary values;
- `generated-data/sym/1.3.3.0/normalized.json`
  - normalized Sym weapon mechanics with greater precision than the in-game detailed screen;
- `migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json`
  - screenshot-derived attachment detail values and summary-stat comparisons;
- `migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md`
  - existing tier-model findings and known anomaly notes;
- `sim/core.js`
  - current simulation rules and derived-stat application behavior.

### External descriptions

- [EA: How to build loadouts in Battlefield 6](https://help.ea.com/en/articles/battlefield/battlefield-6/how-to-build-loadouts/)
- [Sym: Battlefield 6 weapon mechanics](https://sym.gg/games/bf6/weapon-mechanics)

The external pages provide category definitions and underlying mechanics, but not the UI composite formulas. The actual reconstruction therefore depends on comparison arrows and detailed-stat changes in the local audit corpus.

## Corpus condition and evidence rules

At the time of this analysis, the attachment screenshot review contains:

| Property | Value |
|---|---:|
| Top-level audit status | `provisional-review-required` |
| Total records | 3,177 |
| Attachment detail records | 3,115 |
| Detail-stat rows used by attachments | 3,115 |
| Weapons represented | 62 |
| Review states present | `reviewed` and `provisional-review-required` |

This is a large and useful corpus, but it is not a uniformly reviewed ground-truth set. The analysis therefore uses the following evidence hierarchy:

1. explicit before-and-after arrows in a reviewed screenshot record;
2. repeated attachment behavior across many weapons and classes;
3. Sym hidden-precision values and known tier relationships;
4. isolated naked OCR values only as leads, not as proof.

An isolated composite number without a trustworthy baseline is not enough to infer an attachment delta. This matters because stale baselines and OCR errors can turn an ordinary change into an apparent outlier.

## Terminology

### Physical tier

A physical tier is an index into a mechanic table such as the hip spread or ADS-speed tiers in `data/balance_tables.json`. A tier expresses an actual gameplay property.

### Display tier

A display tier is an inferred step in the UI summary-stat ladder. It may combine more than one physical property. A display tier should not be assumed to be identical to a single physical tier unless the comparison evidence supports that equivalence.

### Observed base

An observed base is the summary value shown for the unmodified weapon or the comparison screen's trusted baseline. It is preferable to a computed base whenever the complete engine formula is unknown.

### Exact reconstruction

An equation counts as exact only if it reproduces the displayed integer across weapon classes, single-effect attachments, and stacked effects, with a known rounding and clamping order. A good statistical fit is not sufficient.

## Hipfire

### Base weapon mapping

The strongest result is a stable mapping from the weapon's base hip-spread class to the displayed Hipfire value:

| Base hip-spread class | Displayed Hipfire |
|---|---:|
| E | 29 |
| D | 34 |
| C | 40 |
| B | 47 |
| A | 54 |

The existing derived-model work verifies this mapping across 59 Sym-backed weapons. It also aligns with the known physical tier assignments:

- `54` corresponds to physical class A;
- `47` corresponds to physical class B;
- `40` corresponds to physical class C;
- `34` corresponds to physical class D;
- `29` corresponds to physical class E.

### Extended display ladder

Attachment transitions reveal steps beyond the ordinary base-weapon range. The inferred display ladder is:

```text
..., 22, 29, 34, 40, 47, 54, 62, 71, 81, ...
```

This is a lookup sequence, not a constant increment. The numerical gaps grow as the rating rises, which rules out treating each physical tier as a fixed number of UI points.

The working model is:

```text
Hipfire = HIP_RATING[baseHipClassIndex + effectiveHipfireShift]
```

where `effectiveHipfireShift` is the net display-relevant change contributed by attachments and any recovery-related effect.

### Generic attachment transitions

The ordinary attachment evidence supports these effective shifts:

| Attachment behavior | Effective Hipfire shift |
|---|---:|
| Standard Suppressor | -1 tier |
| Long Suppressor | -1 tier |
| Lightened Suppressor | -1 tier |
| Short barrel | +1 tier |
| 5 MW Red laser | +1 tier |
| 5 MW Green laser | +2 effective tiers |
| 50 MW Blue laser | +2 effective tiers |
| 50 MW Green laser | +3 effective tiers |
| 120 MW Blue laser | +3 effective tiers |

Representative transitions are:

| Starting class/value | +1 | +2 | +3 |
|---|---:|---:|---:|
| C / 40 | 47 | 54 | 62 |
| B / 47 | 54 | 62 | 71 |
| D / 34 | 40 | 47 | 54 |
| E / 29 | 34 | 40 | 47 |

Suppressor examples follow the same ladder in reverse:

```text
40 -> 34
47 -> 40
34 -> 29
```

### Validation result

Across six selected generic attachment-transition families with explicit Hipfire arrows, the inferred ladder reproduced **220 of 224** comparisons exactly.

The four mismatches were all the same suspicious transition, `47 -> 11`, for Standard Suppressor records on:

- PW5A3;
- VZ.61;
- SL9;
- SG553R.

The identical extreme result across otherwise ordinary records is inconsistent with the ladder and the surrounding weapon behavior. These should be treated as transcription/OCR or stale-comparison failures until recaptured, not as evidence for a real `11` tier.

### Why green and blue lasers require more than `hipSpreadTierMod`

The current attachment model's minimum-spread tier change does not, by itself, explain the full visible Hipfire increase for stronger green and blue lasers. The most likely explanation is that the composite rewards both:

1. minimum hip-spread improvement; and
2. hip-spread recovery improvement.

In other words, an attachment with one physical minimum-spread tier plus a recovery improvement can behave like two effective display tiers. A stronger laser can behave like three.

This interpretation also fits Flashlight and Taclight-Hipfire records, which generally add approximately `+4` displayed Hipfire points, with approximately `+2` at a low class-E base. Their primary relevant contribution appears to be recovery rather than another full minimum-spread tier.

The evidence does **not** show that the current source data is necessarily wrong. It shows that `hipSpreadTierMod` is insufficient as the only input to the composite.

### Recommended Hipfire contract

The safe implementation is an explicit display model rather than a false continuous equation:

```text
effectiveIndex = baseHipClassIndex
               + minimumSpreadTierContribution
               + recoveryDisplayContribution

hipfire = lookupAndClamp(HIP_RATING, effectiveIndex)
```

The recovery contribution should remain attachment-rule driven until controlled captures identify its exact physical-to-display mapping. Active-state equipment such as lights and lasers must also specify whether the effect is active in the captured comparison.

### Hipfire confidence boundary

Confirmed to high confidence:

- base E/D/C/B/A mapping;
- nonlinear rating ladder through at least `71`;
- ordinary suppressor, short-barrel, and laser transitions;
- the conclusion that recovery contributes separately from minimum spread.

Not yet confirmed:

- the full lower and upper ends of the ladder;
- exact clamping behavior;
- exact stacking order for multiple hipfire attachments;
- whether recovery is converted into fractional, integer, or attachment-specific effective tiers;
- whether active/inactive tactical devices share the same formula.

## Mobility

### Attachment-delta model

For ordinary attachment comparisons, Mobility behaves like a weighted combination of tier changes and one discrete capability:

```text
Delta Mobility =
    +4 * ADS-speed tiers faster
    +2 * ADS-move-speed tiers faster
    +2 * draw/sprint-recovery tiers faster
    +4 * moving-ADS-accuracy benefit tiers
    +4 * fire-while-sprinting enablement
```

Slower or worse tiers contribute the same weights with negative signs.

The phrase `draw/sprint-recovery` is intentionally cautious. Several descriptions and observed changes group these handling effects, while the current data does not always distinguish which hidden timing the UI scorer consumes.

### Grip examples

The inferred weights explain the common grip families cleanly:

| Grip | Relevant effects | Predicted Mobility delta |
|---|---|---:|
| Ribbed Stubby | faster ADS | +4 |
| Folding Vertical | moving ADS accuracy penalty | -4 |
| Folding Stubby | faster ADS, moving ADS accuracy penalty | 0 |
| Slim Angled | faster ADS, faster draw/recovery | +6 |
| 6H64 Vertical | moving ADS accuracy penalty, slower ADS move speed | -6 |
| Stippled Stubby | faster ADS, moving accuracy penalty, slower ADS move speed | -2 |
| Full Angled | faster ADS, moving accuracy penalty, faster draw/recovery | +2 |
| Compact Handstop | fire while sprinting | +4 |

These examples are especially valuable because they provide multiple independent combinations of the same weights. The zero and mixed-sign cases constrain the model more strongly than attachments with only one benefit.

### Validation result

On the ordinary, non-sniper generic-grip arrow corpus:

- the tier-weight model reproduced **402 of 428** explicit Mobility transitions before modeling Compact Handstop's discrete behavior;
- adding `+4` for fire-while-sprinting increased the result to **412 of 428** exact transitions;
- the remaining mismatches cluster around already suspicious records, especially M433, M39 EMR, and related baselines.

This is strong evidence for the attachment-delta weights. It is not proof that the same equation calculates every weapon's base Mobility.

### Base Mobility is not one universal three-table equation

For much of the standard primary-weapon group, the following relationship is useful:

```text
candidateBaseMobility = 80
                      - 4 * baseADSIndex
                      - 2 * baseADSMoveIndex
                      - 2 * baseSprintIndex
```

The indices refer to the relevant tier tables, not raw milliseconds or speeds. This relationship often reconstructs the observed primary-weapon baseline and is consistent with the attachment weights.

It fails as a universal equation, however. The audit contains class- and archetype-dependent offsets, including:

- carbines whose observed base is often `50` where the simple vector predicts `60`;
- shotgun and sidearm behavior that does not share one primary-weapon anchor;
- sidearm offsets of approximately `+5` or `+3` under the simple model;
- L115/sniper and deploy-related special cases;
- records where the same visible detail vector is associated with different summary baselines.

These mismatches imply one or more missing inputs, such as:

- weapon-family or archetype normalization;
- deploy/equip time;
- sprint-to-fire versus general sprint recovery;
- a sidearm-specific table or anchor;
- movement-accuracy properties omitted or rounded on the detail screen;
- an explicit weapon-specific starting rating.

### Recommended Mobility contract

Until the missing base inputs are identified, the defensible calculator is:

```text
Mobility(loadout) = observedBaseMobility(weapon)
                  + sum(attachmentMobilityContributions)
```

with final rounding and clamping applied only after stacking behavior is verified.

This allows faithful ordinary attachment comparisons without pretending that the base score is fully derived. The observed base should be versioned with the weapon data, not silently synthesized from an incomplete formula.

### Known Mobility anomalies

Examples that should be recaptured before being used as formula evidence include:

- M433 records where the same visible detail vector appears with Mobility values such as `52`, `56`, and `48` under different category baselines;
- M39 EMR comparison inconsistencies;
- carbine laser or rail-cover changes that appear as `+14` or `+12` only because the comparison baseline is likely stale or belongs to a different configuration;
- the previously documented sniper Slim Angled Mobility issue.

These are reasons to quarantine individual records, not reasons to discard the otherwise well-supported grip weighting.

### Mobility confidence boundary

Confirmed to high confidence:

- `4` points per ADS-speed tier for ordinary attachments;
- `2` points per ADS-movement-speed tier;
- approximately `4` points per moving-ADS-accuracy tier/effect;
- approximately `2` points per draw/sprint-recovery tier;
- `+4` for Compact Handstop's fire-while-sprinting capability;
- additive cancellation for ordinary mixed-effect grips.

Not yet confirmed:

- a universal base Mobility formula;
- exact deploy-time contribution;
- whether all weapon families use the same anchor and weights;
- multi-attachment stacking, intermediate rounding, and clamp order;
- unusual sniper, shotgun, and sidearm paths.

## Control

### What is established

Control is strongly related to effective recoil amount. Sym describes final recoil amount as:

```text
Final Recoil = RecoilAmount * RecoilAmountMultiplier^Exponent
```

Attachments that reduce recoil generally raise Control, and attachments that increase recoil generally lower it. A single recoil-reduction tier commonly changes the displayed score by roughly `2` to `4` points depending on the weapon and starting value.

### Why a simple recoil conversion fails

No single reciprocal or linear conversion of the displayed recoil amount reproduces the audited base scores. The best simple reciprocal fit tested reproduced only **18 of 38** automatic-weapon base ratings exactly.

Therefore the formula is not adequately described by either of these forms:

```text
Control = round(K / displayedRecoilAmount)
```

or

```text
Control = round(A - B * displayedRecoilAmount)
```

The detailed in-game number is rounded, while the scoring function may consume hidden-precision values. More importantly, attachments that affect recoil decrease or recovery suggest that Control is not purely recoil magnitude.

### Likely Control inputs

The current evidence is consistent with a composite containing some subset of:

- hidden-precision effective recoil amount;
- recoil decrease or recoil recovery rate;
- first-shot or sustained-recoil behavior;
- vertical/horizontal recoil balance;
- possibly recoil variation, though variation appears especially important to Precision;
- weapon/archetype normalization.

Visual recoil should not be assumed to count unless a Buffer or other visual-recoil-only controlled comparison changes the UI score.

### Safe conclusion for Control

Control cannot currently be calculated exactly from the displayed detail screen or from one Sym recoil field. A fitted estimate could be useful for exploratory analysis, but it must not replace the observed in-game value in a faithful Weapon Analyzer.

## Precision

### What is established

Precision reacts to several effects that all influence aimed consistency but are mechanically different:

- ADS spread or spread-per-shot increase;
- ADS spread recovery/decay;
- recoil amount;
- directional recoil variation;
- possibly sway;
- possibly moving ADS accuracy;
- weapon-family normalization and high-end clamping.

Bolt-action sniper rifles commonly reach or clamp at `100`, which reduces the information available at the high end: multiple underlying inputs can map to the same displayed result.

### Attachment evidence

Heavy and Cryo barrel behavior indicates that Precision can rise through hidden ADS spread-per-shot properties such as `recoilIncAds`, even when the visible recoil amount does not change enough to explain the summary increase.

Linear Compensator behavior is also important: it can improve Precision through directional consistency or recoil-decay behavior even when recoil amount becomes worse. That directly rules out treating Precision as merely an inverted recoil-magnitude score.

Conversely, known Sym spread and recoil outputs do not collapse into one stable linear equation across weapon classes. Different weapons with similar rounded detail-screen values can have different Precision values, and the UI's hidden inputs or class normalization remain unknown.

### Safe conclusion for Precision

Precision is the least identifiable composite in the current corpus. It should remain an observed field. Any interim model should be labeled an estimate and evaluated separately by weapon class rather than presented as the game's formula.

## Why the remaining formulas are not identifiable from the current audit alone

### Rounded detail values discard information

The detailed stat screen is not a raw engine dump. Values are rounded for display. If the composite scorer consumes hidden-precision inputs, two attachments that display the same detail value can legitimately produce different summary scores.

### Composite values do not reveal unique weights

One before-and-after comparison gives a total score change, not the contribution of each changed mechanic. If an attachment changes recoil amount, decay, and variation together, infinitely many weight combinations can explain the same summary delta.

### Single-slot captures do not establish stacking order

The audit mostly establishes isolated attachment behavior. It does not fully determine whether the game:

1. combines physical modifiers first and then scores the final weapon;
2. adds precomputed UI contributions per attachment;
3. rounds after each modifier or only at the end;
4. clamps intermediate or final values;
5. uses special family-specific paths.

### Some records are not formula-quality evidence

Examples include:

- four `47 -> 11` suppressor Hipfire transitions;
- inconsistent M433 and M39 EMR baselines;
- apparent carbine `+12` or `+14` Mobility changes caused by likely stale comparison states;
- known sniper grip anomalies;
- naked OCR values without an explicit before-and-after arrow.

The audit's top-level `provisional-review-required` status correctly reflects this limitation.

## Proposed calculator contract

### Safe to implement now

#### Hipfire

- store or derive the base physical hip-spread class;
- map it through the established nonlinear display ladder;
- apply ordinary minimum-spread tier changes;
- model recovery-driven laser/light contributions explicitly;
- retain an exception/quarantine path for unreviewed anomalous records;
- do not silently substitute a plausible score when the active state is unknown.

#### Mobility

- store the observed per-weapon base Mobility;
- derive ordinary attachment deltas using the validated weights;
- make fire-while-sprinting a discrete `+4` contribution;
- keep family-specific or anomalous attachments as explicit overrides until recaptured;
- keep raw observed values available for comparison and regression tests.

### Not safe to claim as exact

#### Control

- do not derive from rounded recoil amount alone;
- do not promote a best-fit reciprocal equation;
- preserve observed values until controlled decay and hidden-precision tests succeed.

#### Precision

- do not collapse spread, recoil, variation, and sway into an unevidenced weighted sum;
- preserve observed values;
- treat any experimental predictor as analysis-only and class-specific.

## Controlled capture matrix needed to finish the work

Every test should hold the weapon, ammunition, optic, stance, active-device state, and all other attachment slots constant. Each sequence should capture:

1. base weapon;
2. one isolated effect;
3. a second isolated effect;
4. both effects stacked;
5. the reverse comparison where the UI permits it.

### Hipfire captures

Use at least one base weapon from classes E, D, C, B, and A.

| Test family | Required variants | Question answered |
|---|---|---|
| Suppressor | none, Standard, Long, Lightened | verifies downward ladder and lower clamp |
| Barrel | standard, Short | verifies one-tier upward transition |
| Red laser | inactive, active where applicable | isolates minimum-spread benefit |
| Green laser | inactive, active | separates spread and recovery effects |
| Blue laser | inactive, active | tests stronger recovery/display shifts |
| Flashlight | off, on | isolates recovery-only contribution |
| Taclight-Hipfire | off, on | checks active-state scoring |
| Stacks | suppressor + each laser; short barrel + each laser | determines operation order and clamp behavior |

### Mobility captures

Run the matrix on at least one assault rifle, carbine, LMG, sniper rifle, shotgun, semi-automatic sidearm, revolver, and automatic sidearm.

| Isolated mechanic | Suggested evidence |
|---|---|
| ADS speed | one clean faster tier and one clean slower tier |
| ADS movement speed | one clean faster tier and one clean slower tier |
| Moving ADS accuracy | benefit-only and penalty-only attachments |
| Draw speed | attachment with no ADS-speed change if available |
| Sprint recovery | attachment with no draw-speed change if available |
| Fire while sprinting | Compact Handstop versus unchanged baseline |
| Deploy/equip time | controlled weapon-family or attachment comparison |
| Stacking | two ADS tiers; ADS plus movement; ADS plus recovery; mixed positive/negative |

### Control captures

| Test | Purpose |
|---|---|
| One recoil-amount tier | establishes local slope at several base values |
| Multiple recoil-amount tiers | tests nonlinear lookup versus continuous normalization |
| Recoil-decay-only attachment | measures recovery contribution |
| Flash Compensator / Compensated Brake | separates amount from decay |
| Variation-only attachment | checks whether directional variation contributes |
| Buffer or visual-recoil-only attachment | determines whether visual recoil counts |
| Two-effect stacks | identifies scoring and rounding order |

All analysis should use the hidden-precision Sym values, not the rounded detail-screen recoil number.

### Precision captures

| Test | Purpose |
|---|---|
| ADS spread-per-shot only | measures spread growth contribution |
| ADS spread recovery only | measures recovery contribution |
| Recoil amount only | separates accuracy from recoil magnitude |
| Directional variation only | measures consistency contribution |
| Recoil decay only | checks sustained-fire recovery contribution |
| Sway only | establishes whether sway participates |
| Moving ADS accuracy only | establishes overlap with Mobility |
| Cross-effect stacks | detects interaction terms and operation order |

Tests should include weapons well below `100` Precision so upper clamping does not hide changes.

## Capture and review requirements

Each formula-quality record should retain:

- raw screenshot;
- exact stable `Weapon Attachments/...` source path;
- game patch/build identifier;
- weapon, attachment, slot, and ammunition identity;
- all other equipped attachments;
- active/inactive state for lights, lasers, bipods, and other conditional devices;
- explicit summary-stat before-and-after arrow;
- detailed-stat before-and-after values;
- direct human review status;
- a note when a reviewed gameplay correction differs from the raw UI transcription.

Captured, transcribed, reviewed, promoted, and regression-tested should remain separate states. Ambiguous values should fail closed rather than receive plausible replacements.

## Acceptance gates for an exact formula

A composite formula should not be described as exact until it satisfies all of the following:

1. reproduces every reviewed base value in the supported weapon families;
2. reproduces every reviewed single-effect comparison exactly;
3. reproduces reviewed two-effect and multi-slot stacks exactly;
4. states the input precision used by the game;
5. states rounding behavior and whether rounding occurs at intermediate steps;
6. states lower and upper clamping behavior;
7. handles active-state attachments explicitly;
8. explains family-specific offsets without unexplained per-record tuning;
9. rejects or quarantines anomalous captures instead of fitting to them;
10. has regression fixtures tied to the authoritative screenshots.

## Implementation recommendation

The next implementation should use a hybrid model:

```text
Hipfire  = derived lookup, with explicit recovery contributions and evidence bounds
Mobility = observed weapon base + derived ordinary attachment deltas
Control  = observed value
Precision = observed value
```

This is not merely a temporary convenience. It accurately represents what the evidence can and cannot support. It also provides a clean migration path: once controlled captures identify a missing component, that component can replace the corresponding observed value behind a dual-read comparison without changing the public contract prematurely.

Recommended engineering safeguards:

- retain raw observed composite values alongside derived candidates;
- calculate mismatches in a diagnostic dual-read mode;
- report results by weapon family and attachment-effect family;
- require exact equality for promotion, not an aggregate error score;
- maintain an explicit anomaly register;
- avoid generic fallback formulas for unsupported weapons or conditional states;
- version formulas and audit fixtures by patch.

## Final assessment

The current evidence is sufficient to explain most visible Hipfire behavior and most ordinary attachment-driven Mobility changes. Those findings are strong enough to guide an evidence-bounded implementation.

The same is not yet true for Control and Precision. Both appear to consume hidden-precision mechanics that are either rounded away on the detailed screen or changed together by the available attachments. More controlled comparisons—or the relevant game UI scoring asset—are required to recover their exact equations.

Until then, the technically correct result is a partial reconstruction with explicit observed-value boundaries, not four speculative formulas.
