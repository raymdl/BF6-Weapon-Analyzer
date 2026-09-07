# Live data review and mechanics research, 6 September 2026

Current release status: the operator approved publication of the reviewed site changes after the attachment corrections. See [attachment correction status and remaining work](FROSTY_ATTACHMENT_COMPARISON_2026-09-06.md). Earlier local-only statements below describe the review stage before that authorization.

Status: local corrections and research only. No commit, push or deployment.

## Local site review package

The operator requested the supported data update while deferring further in-game recoil/spread mechanics work, and selected local review rather than publication. The current runtime includes the corrections recorded below: 63 weapons including Interdictor; reviewed EF88/BROD 3/L115 values and reload corrections; attachment costs, availability and EF88 magazine handling; ammunition drag and shotgun projectile replacements. Source-backed recoil/spread parameter corrections remain in the data. No new recoil/spread update equation or speculative modifier operation was added for this handoff.

The root page now labels the reviewed Frosty data as v1.4.2.5, dated 6 September 2026. Its footer distinguishes that update from the retained Sym v1.3.3.0 baseline. The source version remains the operator-supplied export label, as recorded in the baseline provenance. Historical pages are unchanged.

Validation for this handoff: the 63-weapon data validator, ship-surface validator, all 31 Node tests, attachment reference validator (3,189 records across its 62-weapon reference scope), and all 16 shotgun ammunition source selections/36 hashes pass. The reference audit does not cover Interdictor; runtime checks do. Browser checks confirm EF88/BROD 3 velocities of 724/563 m/s and EF88 tactical reload of 2.400 s. M1014 #00 shows 115.2 total shot damage and 200 RPM; Interdictor shows 732 m/s and all six generic sight options. Existing uncertainty notes remain visible. Empty-reload corrections are present in the data but are not displayed by the existing tactical-reload card.

Local preview: `http://localhost:5174/`. Review examples: `#w=ef88&cmp=1&w2=brod3` and `#w=m1014&a=A8&cmp=1&w2=interdictor`. These are local checks, not production verification. No commit, push or deployment was performed.

## Earlier live snapshot

Live snapshot: https://raymdl.github.io/BF6-Weapon-Analyzer/ with a cache-busting query.
Hashes and retrieval times: `outputs/frosty/live-review-2026-09-06/manifest.json`.
Field-by-field comparison: `outputs/frosty/live-review-2026-09-06/differences.json`.
These snapshots compare the live site with the current local data; they are not independent measurements of game behavior.

## Live differences already corrected locally

| Area | Live data | Local correction |
| --- | --- | --- |
| Roster | 62 weapons | 63, with Interdictor added; its unverified moving effect remains an estimate |
| EF88 velocity | 670 m/s | 724 m/s |
| EF88 recoil direction variation | 20.3 degrees | 26.1 degrees |
| EF88 ADS spread increase | 0.30 | 0.36 |
| EF88 hip spread increase | 0.54 | 0.648 |
| EF88 empty reload | 2.8415 s | 3.534 s |
| BROD 3 velocity | 580 m/s | 563 m/s |
| BROD 3 ADS spread increase | 0.228 | 0.304 |
| BROD 3 hip spread increase | 0.41 | 0.547 |
| BROD 3 ADS distribution exponent | 0.67 | 0.5 |
| BROD 3 empty reload | 3.35 s | 3.05 s |
| L115 velocity | 664 m/s | 742 m/s |
| Empty reloads | Older values on 17 weapons | Updated source-backed values, including EF88 and BROD 3 above |
| M417 A2 25-round magazine | 20 points | 15 points |
| PP-19 30-round fast magazine | 5 points | 10 points |
| RPK-74M 95-round magazine | 25 points | 50 points |
| RPKM 36-round magazine | 15 points | 5 points |
| M44 and M357 FMJ | 0 points | 5 points |
| EF88 magazine sprint tiers, 36 / 42 / 42 fast | 1 / 1 / 2 | 0 / 0 / 1 |
| Ergonomics options | Missing confirmed options; unavailable M60/L110 options | Added eight confirmed options and removed the unavailable entries |
| DMR/sniper penetration ammo drag | 0.002 override on 11 weapons | Removed unsupported override; base drag is 0.0035 |
| VSSM Range + Penetration drag | Missing override | 0.002 |

EF88/BROD 3 recoil and spread recovery parameters also differ. See the field comparison and `FROSTY_INTEGRATION.md` for exact values and provenance. Local velocity calculations preserve fractional values internally: for example, EF88 short-barrel velocity is 579.2 m/s even when the display shows 579. The live and local `sim/core.js` in this snapshot differ only in line endings. The live data comparison does not establish parity of the entire application.

## KSG export: resolved extraction error

The supplied MD_KSG XML contained 1,091 objects and recovered all 207 nine-field structures, but exported object IDs collided. The reader took the ID from the class header instead of the preceding 16 bytes. An isolated FrostyCmd candidate corrects that read position. At the user's request, the verified reader and matching source correction are now installed in the main Frosty folder, with backups. Sol's BF6SDK.dll field repair is preserved.

The corrected canonical XML has zero duplicate IDs, zero missing or ambiguous local references, and zero array-count mismatches. All non-identity content is unchanged. A GS_KSG control export matches the original retained XML byte for byte. Exact hashes, backup location and equivalent source change are in `reference-data/provenance/frosty-md-ksg-review.json`. A fresh MD_KSG export from the main FrostyCmd installation matches the verified corrected XML byte for byte.

MD_KSG is customization/animation/rendering data. Its recovery does not establish KSG multiplayer availability or provide the missing recoil update equation.

## What the external evidence establishes

[Sym's BF6 mechanics page](https://sym.gg/games/bf6/weapon-mechanics) gives the spread recovery form:

`sNext = s - (coefficient * (s - minimum)^exponent + offset) / simulationRate`

The site uses this form. The page does not settle our remaining BF6 tick-rate, update-order, state-gating or sampling questions. Its recoil description supports a fixed kick magnitude with a random direction and recovery during firing. Values and timing rules from older Battlefield games must remain hypotheses until confirmed for BF6.

[Dr. SmileyHenry's recoil measurements](https://www.youtube.com/watch?v=zI8LWEU8XCE) use repeated wall bursts and compare first-to-last impact height. His [original discussion](https://www.reddit.com/r/LowSodiumBattlefield/comments/1s2gxgm/the_god_equation_for_recoil_updated_a/) supplies useful empirical comparisons, but endpoint height cannot isolate kick size, recovery or animation duration. EA has changed recoil and spread across updates. These older measurements do not prove current universal attachment percentages and are historical context only; current-build datamined configuration and its engine consumers are the primary evidence target. We must also separate camera movement from bullet impact movement.

## New muzzle trace

EF88's SFWarcomp attachment selects `U_WPM_MZL_FlashCompensator_W15`, which binds `GRM_SmoothRecoil_P10`. M4QDMAMS selects the compensator unlock and binds `GRM_SmoothRecoil_Compensator_P10`. Other confirmed paths combine the recoil-tier and smooth-recoil bindings. Evidence: `outputs/frosty/1.4.2.5/attachment-selection-graph.json` and the referenced raw XML under the datamining workspace.

Both smooth-recoil assets have the same non-default scalar tuples in both recoil groups:

| Candidate target | Raw field | Tuple in serialized order |
| --- | --- | --- |
| Recoil duration | `Field_5a02dd65` | `(0, 1, 0.05, 1, True)` |
| Recoil decrease factor | `Field_28df1cde` | `(0, 1, 0, 1.2, False)` |

The tuple fields are `4692836a`, `98a799ba`, `bbbfe9cc`, `5695ee1c`, `bbffe8bc`. Target-name mappings and arithmetic operations have different evidence levels. The observed 1.2 and 0.05 are raw facts; interpreting them as a factor multiplier and duration override is still a candidate operation. The site's assumed 1.1 recovery multiplier does not represent this full configuration. Do not replace it with an unqualified 1.2 without confirming scalar semantics and duration behavior. Existing estimate warnings remain necessary. They now state that raw values are available but modifier arithmetic and duration behavior are unverified. Exact source hashes, raw tuples and eight EF88 selector traces are retained in `reference-data/provenance/frosty-smooth-recoil-review.json`. A lookup of the older BF2042 SDK found no matching five-field scalar modifier definition and supplies no proof of the BF6 operation.

## Experiments that can distinguish the remaining models

`scripts/research-recoil-models.mjs` compares the current model with alternatives using identical seeds and kick samples. It checks current-model parity for 192 traces across M433, EF88 and TR-7. Results are predictions, not captured game data. Output: `outputs/frosty/mechanics-model-sensitivity.json`.

1. **Recovery clock:** In the tested continuous-burst-clock alternative, the mean shot-20 offset falls to zero on all three weapons. The current model gives approximately 4.81, 3.10 and 7.46 degrees. A controlled long burst can strongly separate these alternatives.
2. **Recovery direction:** Axis and radial recovery differ by only about 0.01-0.02 degrees in those endpoint means. Endpoint screenshots alone have weak power to separate them. Record the trajectory after firing stops, including substantial horizontal displacement.
3. **Spread integration:** On M433, changing only the integration step from 45 to 60 to 120 Hz produces shot-20 spread near 1.109, 1.122 and 1.141 degrees. This experiment keeps the site's shot timing and fractional steps; it is not a full engine tick model.
4. **Spread sampling:** Under the candidate radius rule `r = R * U^a`, the probability of landing inside half radius is 25%, 35.5% and 50% for exponents 0.5, 0.67 and 1.0. Repeated first shots after full recovery can distinguish these much more clearly than a single burst.

Capture baseline, one attachment at a time, and a pair of attachments. Keep range, FOV, zoom, stance, movement and compensation input fixed; record those settings. Use repeated randomized trials and separate camera trajectories from impact locations. Fit candidate parameters on one set and check them on a different weapon and attachment combination. Accept a formula only when it predicts those held-out results within measured uncertainty.

## Remaining work

Resolve the scalar modifier operator and recoil-duration update path using offline type/native-code evidence where available. Then test the resulting predictions against controlled game captures. Remaining uncertain behavior includes recoil clock/reset order, radial versus axis recovery, spread radius sampling, firing recovery state transitions, smoothing, and attachment stacking. XML values and community burst measurements alone cannot establish all of these. No further screenshot or export request is needed for the already resolved missing magazines or the repaired MD_KSG serialization error.


## Follow-up: attachment reference boundary and Sym discussion

The expanded read-only reference check resolved 69 objects from 66 assets: 62 GS recoil/spread modifier objects and seven explicitly named WB recoil/dispersion effects. These targets contain no further serialized object references. Their values are embedded in the modifier records. The full chain reaches configuration records, not an executable formula. Source hashes and exact scope are in `reference-data/provenance/frosty-attachment-reference-boundary.json`; reproduce the trace with `scripts/research-attachment-modifiers.py`.

This is not a claim of full attachment coverage: the input graph still has 24 unresolved issues, and unnamed WB effect classes have not all been classified. The game code that applies the modifier records remains to be identified. Frosty schema fields must not be mistaken for that code.

The KDM bot's read-only channel request returned HTTP 403. After the user signed in, the Sym BF6 channel was readable through the browser. No Discord messages, reactions, membership or permission changes were made. This is browser access, not a full API archive. Search results were used to locate discussions, followed by contiguous surrounding messages; the entire channel history has not been collected.

- **1 May 2026, local time:** [The posted recoil equation](https://discord.com/channels/200390629996363777/1336059081126969415/1499966258387357748) came from BF1. In the surrounding sequence, the author names BF1 as its source, and [NoctyrneSAGA says it is not the same](https://discord.com/channels/200390629996363777/1336059081126969415/1499968280428019764). The discussion does not supply a confirmed BF6 replacement. Do not port this equation as BF6 evidence.
- **28 July 2026:** [NoctyrneSAGA describes duration in terms of magnitude divided by time](https://discord.com/channels/200390629996363777/1336059081126969415/1531600095806492753). The surrounding discussion compares recoil displacement, velocity and animation across games. It is useful semantic context, not source code or proof of the current BF6 update order.
- **7 June 2026:** [A duration explanation](https://discord.com/channels/200390629996363777/1336059081126969415/1513358290682122450) describes spreading the impulse over time. This is consistent with investigating duration separately from recovery. Its date and evidence type remain explicit; it does not validate current numeric behavior.

The next source target is the code that consumes the three principal GS modifier classes (`Class_bb838ff6`, `Class_5e5631ff`, `Class_743a3ce0`), including scalar modifier operations, recoil-duration handling, and state-dependent spread recovery. Historical wall-spray results are not a substitute for that evidence.

## Shotgun ammunition projectile replacements

The four supported shotguns previously kept their stock 16 pellets and stock per-pellet damage curve for every ammunition type. `WEAPON_AMMO.projectileOverrides` now supplies eight pellets and the selected #00 buckshot curve, or one pellet and the selected slug curve. Stock buckshot and flechette retain their matching base curves. The shared attachment resolver passes these values to the damage chart, tooltip and damage calculations without changing the base weapon.

The 16 selection traces, exact projectile GUIDs, four raw curve fields, modifier values and source hashes are retained in `reference-data/provenance/frosty-shotgun-ammo.json`. `Class_b1afeb65.Field_808dd66c` selects the replacement projectile. Its `Field_2ad7e688` resolves to a named GameRemixer `TweakableDamageCurve`. All four stock curves agree with the existing weapon data. The regular and tweakable curves differ in some assets; notably M1014 #00 starts at 14.4 per pellet in the tweakable curve but 10 in the regular curve. The promoted curves preserve duplicate ranges and point order.

The count interpretation uses the shared `Field_db0fcea2` in the base shot configuration (16) and the direct integer ammunition modifiers (8 for #00, 1 for slugs). This is a configuration interpretation; the native consumer has not been inspected. Slug `Class_3e93759b.Field_1da7e9ad=4` and the dispersion modifier remain unresolved. This change does not establish complete slug velocity, dispersion or other modifier behavior.

Validation: damage tests cover all 16 weapon/ammunition combinations, the M1014 regular/tweakable distinction, repeated-range slug boundaries, unchanged base records and an unaffected rifle. The data validator checks the new projectile records and passes for all 63 weapons. No commit, push or deployment was made.

The follow-up source check confirms that all 16 selected projectiles have drag `0.0035` and gravity `-9.81`, which agree with the runtime catalog. Base pellet counts are now tied to exact objects in the four WB assets rather than copied from the site. Recheck the recorded paths with `python scripts/verify-shotgun-ammo.py --root "../BF6 Datamining"`. This read-only check passes for all 16 selections and 36 source hashes. It checks source counts, projectile replacement references, named tweakable curve bindings, ordered curve points, drag and gravity. It does not prove selection-graph completeness or native modifier arithmetic.

SDK inspection places the unresolved slug scalar `Field_1da7e9ad=4` in inherited `Class_dbd93b24`, below `Class_3e93759b`. The base class also contains vector fields and three other scalars. Its older-SDK name was not established. Neither the value 4 nor the projectile's separate `InitialSpeed=350` is sufficient evidence for changing the effective muzzle velocity supplied by the weapon's shot configuration.

## DB-12 rail selection check

The seven DB-12 bottom-rail files reported as unmatched do not occur in any progression branch in the exported ability, including embedded branches outside its root list. This is an observed source-reference gap, not evidence that the current site must remove lasers or lights. The ability has 86 root-listed branches and selects the site's six laser types through the top rail and its three light types through the right rail. Their named modifier selections and point costs agree with the site.

Two additional right-rail selections need further review: FN Elity costs 10 points on DB-12, while the inspected range-finder attachments on other weapons cost 15; AN/PEQ-16B selects a 20-point `LaserLight01` with separate standard, single-player and Darkness modifier records. The site's existing Combo Red/Green assumptions do not establish its behavior. Keep actual availability and active modifier conditions separate from the presence of these branches. No catalog or shared range-finder price was changed.

Evidence is in `reference-data/provenance/frosty-db12-rail-selection.json`. A fresh run of the existing `attachment_graph` function for DB-12 reproduced 53 attachment records and seven issues. All 13 recorded top/right-rail branches matched the current XML. The seven original issues remain visible; this check did not suppress them or claim full attachment coverage.

The laser/light follow-up resolves six component effects across the three modifier assets. The standard asset references red first-person laser FX with no third-person FX in that record, plus a separate flashlight FX pair. Its condition resolves to the named `MPFlashlights` categorization tag. The standard flashlight uses `Field_5aec774f`; the SP and MPDarkness flashlight records use `Field_2f4b15c8`. The inclusion/exclusion operations and active component selection are not yet established. There are no GS bindings for the selector in the current trace. A matching red laser color does not justify copying the existing Combo Red hipfire bonuses. Exact component and condition references are retained in the same evidence file. Current multiplayer availability of the two additional DB-12 choices has been requested from the operator.

## Selector gaps and action coverage

An unmatched selector does not mean its whole attachment action is unresolved. The RPK74M compact 30-round and fast 30-round actions each select both a correctly bound RPK74M unlock and an additional unmatched RPKM unlock. PP-19's compact action similarly selects its correctly bound PP19 unlock plus an unmatched UMP40 unlock. No name-based alias or magazine data correction is needed for these paths.

The M27IAR Zenitco RK-2 action also has one resolved sibling selector. The RagingHunter Match Trigger action has none in the current WB/GS trace. These are different evidence states. The graph producer now reports `actionGuid` and `resolvedSiblingSelectorCount` for unmatched selectors. All 24 issues remain visible; four of the five selector reports have a resolved sibling. The other reports concern missing files or unmatched ability branches.

`reference-data/provenance/frosty-selector-action-coverage.json` retains the five actions and source hashes. A fresh graph extraction for the four affected weapons verified the sibling counts (1, 1, 1, 0, 1). Existing typed-scalar tests pass. This change improves the research diagnostic; it does not change runtime magazine or attachment behavior.

## Exported attachment kill-switch defaults

The RagingHunter Match Trigger branch points to a named kill-switch record whose exported default is `True`; its two quickdraw branches point to `False`. The Match Trigger action contains only the unmatched unlock. A scan of the weapon's local XML files found no other reference to that unlock GUID, name or ID hash. This supplies activation context, but it does not prove a current game malfunction or establish a live enabled/disabled state.

The graph producer now retains each branch's local fallback, referenced kill-switch object, name and exported default. A full graph rebuild checked all 3,326 attachment records and preserved every prior selection path. The 3,315 recorded branches contain 32 `True` and 3,283 `False` defaults; the 11 unmatched attachment files have no branch. All 24 original issue reports remain visible. Existing typed-scalar tests pass.

`reference-data/provenance/frosty-attachment-killswitch-review.json` records the 16 M44/DB-12 comparison branches and all 32 `True`-default branches for further review. The additional DB-12 right-rail choices both have `False` defaults. The graph still states that availability is unresolved: the native condition evaluation and live overrides are not evaluated. Do not add or remove runtime choices solely from these defaults.

## Shotgun damage display

The damage chart now selects gradual falloff from the curve's points rather than the weapon class. Stock buckshot and #00 buckshot display their ramps; slug and rifle curves retain their stepped drops. The current 63 weapon curves and eight ammunition overrides contain no curve that combines ramps with repeated-range damage drops.

The Base Damage overview card now uses total shot damage, consistent with its tooltip and the chart. Its tooltip states that shotgun totals assume all pellets hit. A local browser check of 18.5KS-K showed gradual stock/#00 curves, 80.0 total #00 damage, and a stepped slug curve with 75.0 base damage. JavaScript syntax checks and the 14 focused damage tests pass. No release was made.

## Shotgun firing-rate and timing limits

The overview previously hid fire rate for every shotgun. It now shows the semi-automatic 18.5KS-K at 300 RPM and M1014 at 200 RPM while retaining their precise configured rates for calculation. Pump-action rates remain unavailable. The M87A1's raw firing rate is 1799.999 RPM, but its configuration also has bolt-action time, delay and completion-fraction fields. DB-12 has separate manual-cycle fields too. Raw RPM alone does not establish their effective cadence.

Multi-shot pump-action TTK is now unavailable in the chart and table instead of being calculated solely from raw RPM. First-shot kills retain zero firing time, with optional ADS and flight additions handled as before. The chart explains the missing cycling-time evidence. The estimated recoil pattern explicitly states that it does not model pump cycling; its timing model remains unfinished. Source defaults and hashes are retained in `reference-data/provenance/frosty-shotgun-fire-timing.json`.

Local browser checks showed 300 RPM for 18.5KS-K, 200 RPM and a 300 ms two-shot interval for M1014, and M87A1 first-shot TTK of 0 ms with multi-shot rows unavailable. The pump TTK view loaded without console errors. JavaScript syntax checks pass. This is an explicit timing limitation, not a completed pump-action model.

## Native executable timing probe

Frosty's configured installation points to `C:\Program Files\EA Games\Battlefield 6`. A read-only probe of its `bf6.exe` found the string `WeaponState_BoltActionDelay`, but did not identify a timing consumer. The checked absolute 64-bit pointers, 32-bit RVAs and selected RIP-relative `LEA`/`MOV` encodings supplied no direct reference to the string. This limited search is not proof that no references exist.

The executable has no COFF symbols. Its debug record names `BattlefieldGame.Main_Win64_retail.pdb`, which is not beside the executable. The entry point is an indirect jump in `.ooa`, not a weapon function. The probe did not establish any pump timing or modifier formula. `reference-data/provenance/frosty-native-timing-probe.json` records the executable hash, offsets, checked encodings and limits. The game executable was neither launched nor modified, and no game process was attached. Capstone 5.0.9 was installed only as a research tool under ignored `outputs/frosty/native-tools`.

## All graph-bound attachment effects

`scripts/research-attachment-modifiers.py --all-effects` now includes unnamed WB effects and ADS-time GS modifiers. All 495 starting objects resolved: 429 WB effects and 66 GS modifiers. The traversal resolved 30,258 objects in 437 source assets, with 308,926 serialized references. Registry back-references reach whole configuration tables, so these totals must not be presented as independent weapon effects or effective selections.

The traversal has 46 missing GUID targets in 37 XML assets. Their paths concern FX, sound, gameplay bones and cosmetic tags. No additional cosmetic or FX export was requested. These missing references and the input graph's 24 issues remain explicit gaps. This is not a complete reference closure or proof of runtime behavior. `reference-data/provenance/frosty-all-attachment-effect-boundary.json` retains the starting-object inventory, source hashes, missing targets and reproduction command. All 437 source hashes were rechecked, and the 69 objects from the earlier narrow trace match exactly.

## Slug scalar distinction

All 12 graph-bound `Class_3e93759b` objects were compared by exact GUID. Named muzzle-velocity and selected subsonic effects vary `Field_6a5c4efd` while keeping `Field_1da7e9ad=1`. All four slug effects instead have `Field_6a5c4efd=1` and `Field_1da7e9ad=4`. Thus the slug value of 4 is not in the same serialized field as the named velocity multiplier. Its meaning and native operation remain unknown; this comparison does not justify a fourfold velocity change. `reference-data/provenance/frosty-shotgun-slug-scalar-comparison.json` retains all 12 records and source hashes. Runtime values remain unchanged in this pass.

## VSSM fire-mode modifier check

The full-auto WB package has four effect objects, including `Class_582cbe36` with `Field_be31b12d=399.999`. Comparison against the named registry and raw WB files verifies 189 values across 63 weapons: `Field_14c4a054` corresponds to base `RateOfFire`, `Field_5bd8006c` to `RateOfFireForBurst`, and `Field_be31b12d` to `RateOfFireForSingleFire`. These mappings apply to the base fire-logic structure; the modifier uses the same field hashes. The 399.999 value therefore does not justify replacing the automatic rate with 400 RPM.

The VSSM base automatic rate is 799.999 and its base single-fire rate is 449.999. A direct resolver check retained semi 449.999 RPM without Folding Stock and auto 799.999 RPM with it. No runtime value changed. The meaning of modifier sentinels and the availability of a separate single-fire selection with Folding Stock remain unverified. `reference-data/provenance/frosty-vssm-fire-mode-review.json` retains the four effect records, base rate bindings, field-comparison counts and 65 source hashes.

## Current base-field coverage and BROD 3 remainder

The saved base comparison was checked against current state: all 4,275 recorded source-file hashes and all recorded site field values still agree. Its 3,654 matches, six bolt-action RPM differences and 57 unresolved BROD 3 registry fields remain current. These counts cover only the comparison's selected fields. They do not prove full weapon or attachment coverage. The bolt-action differences compare effective site rates with raw firing-cycle rates; they do not justify replacing the site rates with 299.999 RPM.

The separate BROD 3 raw review previously covered 43 of those 57 fields. All 43 now match the current site, including the eight corrected spread values. The additional 14 fields were checked in their ADS/hip structures. Four exponent values have unique cross-weapon candidates: amount exponent -3 and direction-variation exponent 0 in each aim state. Both raw fields are `System.Int32` in the currently installed SDK, so `0xfffffffd` decodes as -3. The other ten values agree with every candidate field, but their identities remain ambiguous. This does not create missing registry bindings or establish native formulas.

`reference-data/provenance/frosty-brod3-remaining-field-review.json` retains all 14 checks, exact raw paths, candidate ambiguity and the current SDK hash. No additional runtime value correction was found. Completion remains unproven: effective manual-cycle timing, modifier operations and stacking, factory/conditional activation, live option availability, and recoil/spread behavior still need evidence beyond these value comparisons.

## Composite category stat investigation

The current game cache contains serialized expression resources for the Control, Control1, Hipfire and Mobility attribute delegates. Seven delegate resources were exported for comparison, including RateOfFire, HeadshotMultiplier and CollateralMultiplier. Their hashes and resource IDs are retained in `outputs/frosty/composite-stats/resource-export-manifest.json`; the binary layout notes are in `graph-layout.json`. These are preliminary research outputs, not runtime formulas.

The Control graph is consistent with `77 / (RecoilAmount + 0.67)^1.75` under the inferred arithmetic function mapping. This mapping and the source of its input still require verification. Substitution of current site recoil values does not reproduce every older captured rating. Control1 has RecoilAmount and Variation inputs; its RateOfFire port is unused in the exported graph. The later current-capture comparison supports this graph as Control, not Precision: the sine interpretation reproduces all six reviewed baseline ratings. See `reference-data/provenance/composite-control-candidate-2026-09-06.json`. The later M433 grip check matches all 20 reviewed unmounted menu views, using the existing site recoil tiers without fitting coefficients. This supports that specific attachment calculation; active UI binding, native function semantics, other weapons and deployed bipod behavior remain unverified.

The Mobility graph is consistent with the index sum `WeaponDeployTimeIndex + 4*AnimationZoomSettingsIndex + SprintSettingsIndex + 2*WeaponZoomedMoveSpeedMultiplierIndex + 4*MovingZoomedMinAnglesIndex + 4*(CanFireWhileSprinting ? 1 : 0)`. Index construction and live UI rounding remain unresolved. Hipfire includes a constant lookup ladder and additional angle/fraction operations; decoding is incomplete.

A reverse-dependency query found no indexed parent for the Control delegate. The cache contains dependency records for 241,439 of 464,499 entries, so this result does not establish that the delegate is unused. The exported NumericalStatKey and WeaponStatsDBD assets did not establish the four active category bindings. No composite calculation was added to the site.


## Current capture results and research limits

The operator confirmed that the eight previously queried ergonomics options are unavailable. This request is closed. DB-12 screenshots show three right-rail lights (5, 15 and 10 points) and six top-rail lasers; FN Elity and AN/PEQ-16B are unavailable. Do not reopen these availability requests from the presence of exported branches. `reference-data/provenance/live-captures-2026-09-06.json` contains the current baseline transcriptions, source hashes and filename correction: the B36A4 20-round filenames show AK4D.

The two shotgun videos show alternating short/long DB-12 intervals and approximately 0.63-second M87A1 intervals. Reviewed HUD transition frames have verified presentation timestamps. Audio has no usable firing signal. Exact firing-event timing and attachment effects remain unverified; the current unavailable pump-action TTK behavior is retained. Timing evidence is in `reference-data/provenance/shotgun-capture-timing-2026-09-06.json`.

The Hipfire candidate matches five of six current baselines, with DB-12 predicted at 40 versus the captured 39. Its separate firing-dispersion input is unresolved. The Mobility graph coefficients were checked against XML port offsets and binary operands, but deploy-time and fire-while-sprinting inputs remain unresolved. No deploy/draw/switch entry for HK433 was found in the existing registry-linked-block artifact; this is a limit of that lookup, not proof that the game lacks a deploy field. Candidate details are in `composite-hipfire-decode-2026-09-06.json` and `composite-mobility-inputs-2026-09-06.json` under `reference-data/provenance/`. No composite runtime formulas have been promoted.

## M433 grip screenshot reconciliation and remaining composite gaps

The existing M433 grip screenshots were checked before requesting more captures. The audit JSON had 21 incorrect category-stat values across 11 records: three in Folding Vertical and 18 in ten other grip records. Those values are corrected. Review statuses remain unchanged; this local review does not validate the whole audit or establish the old screenshots' game version. The per-image readings and hashes are in `reference-data/provenance/m433-grip-screenshot-review-2026-09-06.json`; the separate Folding Vertical correction is recorded in the Control candidate file.

The Mobility delta calculation matches the same 20 unmounted menu views. In the site's field conventions it is `4*adsTimeTierMod - 2*sprintRecoveryTierShift - 2*adsMoveSpeedTierShift + 4*movingAdsSpreadTierMod`. The baseline rating is observed, not derived. This comparison does not resolve the absolute deploy-time index, the fire-while-sprinting input or other attachment families.

Direct inspection recovered 14 boxed defaults from WeaponAttributes and two from WeaponAttributes_ExtendedList. The XML exporter prints their types without their values. The recovered values concern layout, flags and a sound-style reference; they do not establish the Precision binding. The asset-name inventory found no standalone WeaponAttributesConfig. Name searches and incomplete cache dependencies cannot exclude an embedded configuration or runtime binding. `reference-data/provenance/composite-ui-binding-review-2026-09-06.json` records the bounded searches and source hashes.

The source timing candidate `60 / RateOfFire + BoltActionTime + BoltActionDelay`, at speed 1, gives approximately 0.633335 seconds for both the M87A1 interval and the DB-12 long interval. This is consistent with the reviewed HUD transitions. It does not establish native event timing, speed scaling, interruptions or attachment effects. Pump-action multi-shot TTK remains unavailable until those mechanics have sufficient evidence.
## Operator-directed Loadout and animation-state review

The local Interdictor already uses the six standard generic sight options, as requested by the operator: Iron Sights, Standard Optic, Variable Low, Variable High, Thermal and Thermal Hybrid. Its attachment record has no sight restriction; the shared loadout renderer therefore uses the full SIGHTS list. No additional optic data change is required.

The installed cache contains 104 assets under `Common/UI/Loadout/` and 1,641 under `Animations/Glacier/Global/Gamestates/`. Neither folder is present in the current datamining XML tree. Six selected assets were exported directly for inspection. LoadoutViewManagerConfig, LoadoutDetailsItemDBD and SoldierLoadoutItemDataBindingProvider did not establish a category formula in their readable values or external references; their hashed bindings remain unresolved.

The inspected animation-state assets are `FB.Wep.RecoilCompensationVelocity.Vec3`, `FB.Wep.RecoilDirectionAmount.Vec3` and `Wep.BoltActionSpeed.Float`. They contain typed state declarations with zero vector values and scalar value 1, respectively, rather than update equations. They supply concrete identifiers for finding consumers. They do not establish recoil compensation behavior or bolt-action speed scaling. Recoil animation and ballistic aim behavior must remain separate until a consumer connects them.

The six XML exports and their hashes are preserved in `outputs/frosty/composite-stats/user-path-export-manifest.json`. Folder inventories are `loadout-assets.json` and `gamestate-assets.json` in the same ignored research folder.
## Targeted executable disassembly — code accessibility

A second read-only probe of the installed bf6.exe checked PE section layout, byte entropy, exception-table function ranges and sampled x64 disassembly. The executable hash still matches the earlier timing probe. The .text, ctr, .data and typeinfo sections have entropy approximately 8 bits per byte; fieldinf is approximately 7.9999. Sampled main-code function starts produce short invalid or incoherent instruction sequences. Together these observations indicate that the main code and type metadata appear protected in the on-disk image. This is an inference, not identification of a particular protection scheme.

Six known graph/class/enum hashes were searched as little-endian literals. Only 1c07201f occurred, once in .pdata and once in .vlizer. Neither match establishes a graph-function registration or implementation. No recoil/spread or rating formula was recovered. The named retail PDB remains absent beside the executable.

Ordinary static disassembly of this file is therefore insufficient for the current investigation. A readable code image, relevant symbols, or a decoded asset graph would be needed to trace the missing implementation. Controlled game measurements remain an alternative for validating candidate behavior. The executable was not modified or launched, and no process was attached.

Exact section measurements, sample addresses, hash hits and limitations are in reference-data/provenance/frosty-native-code-layout-review-2026-09-06.json. The local inspection script and raw report are under ignored outputs/frosty/native-tools/.

## Public research follow-up

See [Online blocker review](BLOCKER_ONLINE_REVIEW_2026-09-06.md) for the public-source search, community experiment limits, circular-source exclusions, and the new Portal measurement lead. The inspected SDK exposes ammo, firing state, facing direction and match time; measurement precision and ballistic meaning are not yet validated. No formula was promoted.
