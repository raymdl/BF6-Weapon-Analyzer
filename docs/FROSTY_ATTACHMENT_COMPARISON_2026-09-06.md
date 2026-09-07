# Frosty attachment comparison — 6 September 2026

## Current status after operator review

The approved corrections are implemented. Eight point costs are fixed. Hip recoil now receives the existing grip, muzzle, and ammunition recoil tiers. VSSM Folding Stock hip spread and variation are fixed, and both suppressed barrels affect spotting. Subsonic recoil is corrected for the 12 source-mapped weapons; Slugs receive recoil and ADS spread effects. Compact-magazine moving-ADS and sway effects are added where the source selection is clear.

Follow-up review: the approved Heavy/Cryo aim-state correction is now implemented locally. Its existing spread/recovery multipliers apply only to ADS. New recovery constants, light recovery, smooth recoil, bolt-action tier magnitudes, and Folding Stock decay remain deferred. See the [detailed follow-up and complete exception lists](FROSTY_ATTACHMENT_REVIEW_DETAILS_2026-09-06.md). The audit's CQB/Lightened labels were reversed, and the six FMJ bindings are compound selectors, not source conflicts; the corrections below supersede those original claims.

Validation: all 43 Node product tests, the 63-weapon data validator, and the published-file validator pass. The browser shows L115 Iron Sights at 15 points and a 35-point default total. Publication is authorized for all reviewed site changes in this task, including the earlier Frosty corrections and the v1.3.3.0 archive.

Implementation evidence: [approved attachment updates](../reference-data/provenance/frosty-approved-attachment-updates-2026-09-06.json). The full-pass evidence below is the **before-fix snapshot**. Its comparison counts and old site values are retained for traceability.

## Original comparison scope

The initial comparison was report-only. It found eight clear point-cost differences and several attachment-effect gaps. The operator then approved the corrections recorded above. The findings below retain the original before/after context; status notes identify completed and deferred work.

The source is the local Frosty 1.4.2.5 export in `C:/Users/royal/Documents/BF6 Datamining`. The inventory covers 5,582 attachment records across 64 source weapon folders, including 2,256 optic records. All 1,769 directly referenced effect objects resolved in 475 XML files. The full graph records SHA-256 hashes for 6,596 files. Source folders include aliases and one weapon outside the current site roster; this is not a count of selectable site weapons.

The numerical comparison covers the existing 3,326 non-optic attachment records. The full graph adds optics and seven selector bindings on existing non-optic records. Those additional bindings are inventoried, but they are not claimed as numerically verified. Camera, animation, conditional state, and opaque native fields were inventoried where directly linked; their game behavior was not reverse-engineered in this pass.

Evidence: [attachment comparison JSON](../reference-data/provenance/frosty-attachment-full-pass-2026-09-06.json). It contains the full inventory, source hashes, effect identities and operations, candidate comparisons, graph issues, and samples from the actual site resolver. The local working directory `outputs/attachment-full-pass/` holds the full raw scalar extraction and comparison scripts. These working files are ignored by Git; their hashes are recorded in the evidence JSON.

## Clear point-cost differences

Costs below use the attachment's actual point field, not a number in an unlock filename. They establish differences from this export, not independent confirmation of the current live game's prices.

| Weapon | Attachment | Before fix | Corrected site / Frosty |
|---|---|---:|---:|
| RPK-74M | Synthetic ammunition | 25 | 20 |
| RPK-74M | Hollow Point | 20 | 15 |
| SCW-10 | Hollow Point | 15 | 20 |
| L115 | Iron sights | 5 | 15 |
| M2010 ESR | Iron sights | 5 | 15 |
| Mini Scout | Iron sights | 5 | 15 |
| PSR | Iron sights | 5 | 15 |
| SV-98 | Iron sights | 5 | 15 |

The last five use source identities L115A3, M2010ESR, MiniFix, MRAD, and SV98M. The site's global iron-sight cost cannot represent these weapon-specific values.

## Effect-model findings

### 1. Hip-fire recoil effects are often omitted

**Fixed in the current tier model.** Explicit hip recoil tiers are present in the muzzle, grip, and ammunition catalogs and are combined by the resolver. Linear Comp hip variation is included. Existing bolt-action tier magnitudes are retained for the deferred review. This change does not add deployed Bipod/Grippod effects.

Many grip, muzzle, and ammunition modifiers target both ADS and hip recoil in Frosty. The site generally applies their recoil tier change only to ADS. The earlier M16A3 conversion change is a specific exception.

A selectable M433 with Ribbed Vertical changes ADS recoil from 0.793 to approximately 0.669, but hip recoil stays at approximately 0.793332. The linked source modifiers apply the +3 recoil tier to both states. This is a shared resolver gap, so a correction must cover all affected attachment slots rather than one weapon.

### 2. Heavy, Heavy Extended, and Cryo barrels apply effects to the wrong aim state

**Aim-state scope fixed locally in the follow-up.** Existing multipliers now target ADS only. Numerical recovery constants remain deferred.

The linked source barrel modifier targets ADS: spread increment ×0.666667, firing recovery coefficient ×1.837117, and firing, non-firing, and idle recovery offsets ×0.666667. The site's common multipliers also change hip spread and recovery. Its recovery coefficient uses 1.71, and it does not apply all three offset changes.

There are 61 mapped weapon/attachment instances in these three families. On a selectable M16A4 Heavy Barrel loadout, site hip spread increment changes from 0.648 to 0.432 even though the source modifier has no hip target. ADS changes from 0.36 to 0.24. This is an aim-state scope error as well as a value difference.

### 3. VSSM Folding Stock still has missing hip and recoil-decay effects

**Hip effects fixed; recoil decay deferred.** Hip increment is 0.736, firing recovery coefficient is 0.5, firing recovery offset is 4.86, and hip variation receives the −20 tier change. Decay factor and decay-time exponent remain unchanged.

The earlier ADS spread correction is present. Hip spread increment remains 0.398 rather than the source's explicit 0.736; hip firing recovery coefficient remains 0.1875 rather than 0.5, and firing recovery offset remains 1.8225 rather than 4.86. The source hip variation tier change of −20 is also absent.

The source sets recoil decay factor to 76 and decay-time exponent to 1.24 for both aim states. These are configuration facts. Their native simulation interpretation remains a separate modeling question; this report does not claim a validated new decay formula.

### 4. VSSM suppressed barrels do not reach the spotting model

**Spotting fixed.** Both barrels now set world spotting to zero. Ordinary Suppressed uses 9 m minimap spotting; ASM uses 21 m. The resolver includes barrel suppression when combining spotting sources. The ordinary barrel ADS-time question remains open.

The source barrel effects set silenced status and world spotting distance to zero. The ordinary suppressed barrel has a minimap distance multiplier of 0.06; ASM uses 0.14. With the site's existing 150 m baseline, those imply 9 m and 21 m.

The current resolver reads spotting effects from muzzle and ammunition selections, so these barrel effects are absent. The sampled VSSM result remains 54 m world / 150 m minimap. The ordinary suppressed barrel also contains an ADS tier effect that needs factory-baseline normalization before correction.

### 5. Flashlights and combined lasers use an incomplete recovery model

**Deferred by the operator.** The existing estimated light recovery behavior remains unchanged.

The linked hip modifier uses spread increment ×0.666667, firing recovery coefficient ×1.837117, and all three recovery offsets ×0.666667. The site uses an assumed 15% hip recovery-offset change instead. Combined laser/light entries also store a recovery boost that the resolver does not consume from the laser slot.

The actual VZ61 Combo Red sample has a zero boost; a separate M433 flashlight has 0.15. The comparison contains 118 mapped light records and 19 combined-device records. These counts describe source contexts, not separate defects.

### 6. Smooth recoil attachments remain approximations

**Deferred by the operator.** Current estimated decay multipliers and estimate labels remain unchanged.

Normal smooth-recoil source assets multiply decay factor by 1.2 and set recoil duration to 0.05. Bolt variants use ×1.728, duration 0.066667, and decay-time exponent −0.5. The site uses a generic estimated ADS factor of 1.1, does not mirror the factor to hip recoil, and does not consume the duration in the core model.

Keep the existing estimate labels until the native behavior is established. Copying these constants alone would not validate the simulation.

### 7. Some bolt-action recoil tiers differ in magnitude

**Deferred by the operator.** Current ADS tier magnitudes are also used for the newly supported hip effects. The raw +6/−6 values were not promoted.

The compared bolt-brake assets use a recoil exponent change of +6 where site entries use +1. Sixteen weapon/muzzle pairs are affected across Interdictor, L115, M2010 ESR, Mini Scout, PSR, and SV-98. Both paths use the same 0.94 tier multiplier, so this is not explained by different tier units.

Some bolt-action Tungsten links also use −6 where the site uses −1. Mini Scout has compound −1 and −6 links; the composition must be resolved before choosing its final value.

### 8. Ammunition has omitted effects

**Supported effects fixed.** The 12 source-mapped weapons receive +1 ADS and hip recoil tiers for Subsonic and Sub HP through weapon-specific overrides. Sidearms do not inherit this effect. All four selectable shotgun Slug loads receive −1 ADS/hip recoil tiers and ADS spread increment 0.05. Existing Penetration-family recoil tiers now also affect hip fire. Default Buckshot and compound bolt-action Tungsten effects remain open.

Subsonic ammunition links a +1 recoil tier for both aim states on 12 non-sidearm weapons. The site omits it; the SCW-10 sample retains 0.712 ADS recoil with Subsonic selected. Velocity comparisons were adjusted for the site's floor and tier convention and must not be reported as generic velocity errors.

Shotgun Slugs explicitly set ADS spread increment to 0.05 and apply a −1 recoil tier to both aim states. The KS-18K sample retains 0.001 ADS increment and approximately 1.686 recoil. Default Buckshot hip effects require factory-baseline normalization and are not classified as confirmed missing modifiers here.

### 9. Compact magazines omit some secondary effects

**Supported, unambiguous compact selections fixed.** The update applies 79 source-backed field assignments across 50 unique smaller-than-default magazine selections. Moving-ADS effects use the existing tier model. Weapon sway uses the existing Increased/Decreased indicator; this does not implement a numerical camera/weapon sway simulation. Compound RPK-74M selector cases and ambiguous fast-magazine identities remain open.

Mapped compact-magazine source effects include moving ADS spread tier +1 and sway changes, including a ×0.666667 weapon-sway factor. The comparison has 44 moving-ADS and 38 sway candidate instances. M433 20-round ammunition capacity maps to a source moving-ADS tier of +1 while the site uses zero.

ADS, draw, and movement shifts were compared using the correct site sign conventions. Same-capacity fast-magazine variants remain ambiguous where reload behavior does not identify a unique selection. They are not counted as confirmed price errors.

## Source differences that need review before implementation

- **Withdrawn after mapping correction:** the audit reversed CQB and Lightened suppressor labels. The hip penalty and Smooth effects belong to Lightened, not CQB. Corrected mapping yields 52 Lightened and 57 CQB paths. Long and Lightened share these effects; Long has the sway penalty. No CQB runtime correction is required.
- Keep the operator-approved hybrid and Canted models unchanged. Their raw effect differences are recorded for review. Point costs must come from attachment records, not suffixes such as W25 or W40.
- Deployed Bipod and Grippod effects are conditional. Source links include ADS spread and recovery changes, recoil tiers, and variation changes. The site has no deployed-state control. A `noEffect` site entry does not establish that deployment has no game effect; applying deployed modifiers all the time would also be wrong.
- ADS reload, bolt rechamber, Match Trigger, Rangefinder, and other functional selectors need state or mechanic support. Labels alone do not reproduce their effects.
- Detailed optics are outside the operator's site scope. The 2,256 records remain audit inventory only.
- Seven additional non-optic bindings appear in the expanded graph: conditional short barrels on MiniFix and BREN3; conditional short/extended barrels on G22; an M18 extended-magazine selector; and conditional extended suppressor selectors on MPX Compact Streamer and SRD9. They need composition review.

## Identity, availability, and export limits

The original comparator produced 3,341 selector comparisons. After correcting the suppressor labels, these are 3,003 mapped, 242 without selectors, 57 not listed on the site, 13 with ambiguous identity, two unmapped templates, six compound standard-ammunition selectors, and 18 outside the site roster. There are 22 site selections without a unique mapping, down from 31. The follow-up lists all original 31 and identifies the nine recovered mappings. These categories do not establish live availability.

The six FMJ bindings occur on M121 A2 and M45A1 Frangible, Hollow Point, and Tungsten. The same Ability action also selects the correct specialty modifier. FMJ supplies an additional penetration-category selection; it does not replace specialty ammunition. The earlier conflict classification was incorrect. Subsonic Frangible remains distinct from ordinary Frangible.

Field results are 5,500 matches, 36 display-rounded matches, 2,602 candidate differences, and 1,086 unmodeled comparisons. These are repeated field comparisons across attachment contexts, not counts of bugs. Some need default-loadout normalization, conditional-state support, or compound-selector resolution.

The full graph has 25 issues: 11 attachments without a matching Ability branch, five selectors without a WB/GS match, and nine missing WB modifier references. Eight missing references are KingstonLegacy instances; one is an M27IAR Test LPVO Demo reference. Direct extracted effect references all resolved. The missing graph links prevent a claim that every exported attachment has a complete executable effect path.

## Initial comparison verification

The research extractor now accepts `--include-optics`; its default remains the existing non-optic graph. The default graph was compared by deep equality with the prior generated graph. Four existing scalar-conversion tests pass. The evidence integrity check verifies all 5,582 inventory records and all 1,769 direct effect references. Sixteen actual resolver samples were collected after checking that each requested selection was available.

The initial pass changed the research extractor and created the report and evidence. The subsequent approved implementation changes the site data, attachment resolver, point display, and relevant stat breakdowns. The v1.3.3.0 archive remains frozen at the previous live release.

## How to resolve the outstanding items

### Heavy/Cryo barrel spread and recovery

There are two separate questions: which aim state the modifier targets, and how each recovery parameter affects the time between shots. The source links target ADS. The follow-up implements the approved ADS-only scope. The recovery constant differences remain separate and deferred.

For the next review, use one selectable Heavy, one Heavy Extended, and one Cryo loadout. Compare Basic versus the selected barrel while standing and moving, in both ADS and hip fire. Trace the increment, firing recovery coefficient, and firing/non-firing/idle offsets separately. Then compare a controlled short burst and the pause after it. A correct implementation should change only the source-targeted state, preserve the first-shot bounds unless explicitly modified, and avoid applying the same multiplier twice. Keep this separate from a general recoil-decay formula change.

### Folding Stock recoil decay

The missing values are explicit sets: factor 76 and time exponent 1.24 in both recoil groups. They are not a percentage recoil reduction. The site has an estimated recovery model, so inserting these numbers can alter the whole recovery curve without proving that the game applies the same equation. The hip spread correction is independent of this question and is already complete.

The next review should trace these fields into the native recoil update, establish their units and the order of operations, and then compare semi-automatic and Folding Stock recovery after equal shot counts. Include the time during each recoil impulse and the time after firing stops. Promote the values only when the model explains both observations, or retain an explicit estimate if native behavior cannot be established.

### Flashlights and combined devices

The source changes four kinds of hip parameters together: spread increment, firing recovery coefficient, and three recovery offsets. The site currently models a 15% offset boost. A combined laser/light also stores that boost in a slot that the resolver does not read. Fixing only the slot lookup would make the old approximation active; it would not implement the source behavior.

Review a separate Flashlight and a combined device on weapons that support them. Establish whether the effects require the light to be switched on, then compare hip spread growth and recovery with the device off/on. Check how combined devices interact with laser accuracy tiers and ensure the light component is applied once. Add an activation control only if the source/game requires it.

### Smooth recoil and duration

Recoil amount controls the size of a shot's kick. Decay controls recovery. Duration controls how the kick is delivered over time. These are different properties. The source's duration sets and decay changes cannot be represented faithfully by one 1.1 multiplier. Bolt variants also change the time exponent, which may change the curve shape.

The next review should compare one normal and one bolt smooth-recoil attachment. Resolve whether the native engine integrates the kick over the specified duration and when recovery starts. Compare both a single shot and a burst at a known cadence. Keep the current estimate marker until duration and decay are supported together.

### Bolt-action tier magnitudes

The +6 brake and −6 ammunition values use the same type of exponent field as +1/−1. The issue is therefore the selected operation and its composition, not a different label for the same unit. A six-tier change is much larger than a one-tier change. The current implementation now carries the existing one-tier model into hip fire but does not adopt the larger values.

For each affected weapon, resolve the selected attachment branch and deduplicate references to the same effect object. Determine whether multiple links are simultaneous or alternative. Mini Scout's two Tungsten links must not be added merely because both appear in the inventory. Then compare the resolved Basic loadout with each selected brake/ammunition in ADS and hip fire. Use those results to introduce weapon-specific overrides if the source differences are confirmed.

### Ammunition baseline and magazine identity

The [7 September magazine identity review](FROSTY_MAGAZINE_IDENTITY_REVIEW_2026-09-07.md) uses 12 original screenshots to classify all 13 former ambiguous bindings. It resolves the four shotgun identities and the two RPK-74M parent identities, separates six source-only candidates from captured site selections, and retains three unmatched extra bindings. It does not implement new magazine effects or availability.

The subsequent [magazine model update](FROSTY_MAGAZINE_MODEL_UPDATE_2026-09-07.md) implements 11 supported field edits across nine RPK-74M, Mini Scout, and BROD 3 magazine entries. Its 287-selection sweep retains screenshot-supported baseline exceptions and records the missing evidence for state-dependent shotgun reloads. These changes are local, not published.

Default ammunition may already be included in the base weapon's exported values. Applying its linked modifier again can double-count the effect. Establish whether the base configuration is before or after the factory selector before adding Buckshot hip dispersion. Slug and source-mapped Subsonic corrections use explicit non-default effects and are already implemented. No new ammunition availability was inferred.

For magazines, capacity alone is insufficient when two variants have the same size but different reload behavior. Use the actual selector, capacity, reload operation, and factory default together. RPK-74M compound compact selectors remain excluded. The sway indicator can describe direction of change, but camera sway axes and numerical sway amplitude need their own supported model. Do not describe the current indicator as a complete sway simulation.

### Other source and availability gaps

Remaining ordinary VSSM barrel ADS-time effects and ambiguous grip identities need a comparison against the accepted factory loadout. Deployed attachments need a defined deployed state. Functional attachments need their relevant mechanic, such as reload or rechamber behavior. Detailed optics will not be added. Source-only selectors and incomplete graph links need a resolved usable path or an in-game availability check. The CQB penalty allegation is withdrawn. The follow-up provides the full inventories and numerical examples.
