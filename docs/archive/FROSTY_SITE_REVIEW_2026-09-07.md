# Site data and Frosty review — 7 September 2026

> Archived record. Current work is tracked in the [active handoff](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md); implemented behavior is documented in the [live guides](../README.md). Statements in this record describe their original analysis stage.

The current site agrees with most directly mapped Frosty data. It still has specific attachment differences and known simulation limits. The screenshot audit is a separate reference dataset; correcting it does not change the site.

This is a review of all 63 current weapons, the attachment inventory, current attachment operands, and all 3,127 captured detailed panels. It is not a claim that every native game equation has been decoded. Detailed optic effects and cosmetics are outside the existing multiplayer audit scope. The 158 pending capture rows have no screenshot evidence and are not counted as captured panels.

## Current baseline

Reviewed checkout: `9d98f2b439e80cefeaff805566572646f35c5471`. The seven public data JSON files and four simulation files had equivalent content to the local files at 2026-09-07 21:44 UTC. Byte hashes differ because of serialization or line endings. This verifies the data and simulation baseline, not all local UI files.

The previous 6 September reports are historical evidence. Their statements that changes were local or that the KSG export was unresolved are superseded by the current checks. The corrected KSG export and DB12 mapping are present. No site data, simulation files, or deployment were changed during this review.

## What matches

- Base weapon check: 3,780 scalar comparison rows across 63 weapons. All magazine, velocity, recoil, and checked dynamic-spread scalar rows match. This count includes alias fields, so it is not a count of independent native properties. The 4,275-file source hash manifest has no missing or changed XML files.
- Six direct fire-rate differences are bolt-action registry values near 300 RPM versus site values derived from timing. They do not establish six fire-rate defects. BROD 3 recoil/spread comparisons use raw source values; unresolved registry names limit semantic certainty.
- All 287 current site magazine selections have source bindings. The 296-binding inventory also contains six source-only candidates and three unmatched extra bindings. These nine are excluded from captured menu coverage. There are no unresolved current site magazine identities after the newer mapping evidence is applied.
- The initial comparison found 3,127 matching audit cost numbers. Direct review excludes two capture-identity conflicts, leaving 3,125 valid matching cost comparisons. The source inventory comparison also has no cost differences in its 3,003 mapped rows. These are two different coverage sets.
- Of the 157 corrected audit fields, 119 match the current site, 13 differ, 24 have no comparable resolver field, and one belongs to an excluded capture identity. The 13 differences are the 12 movement values and Mini Scout Full Angled sprint recovery. All 157 corrections remain applied to the audit. They are not 157 site defects.

## Supported site differences

| Area | Current site | Frosty and capture evidence | Scope |
| --- | --- | --- | --- |
| ADS movement with 6H64 Vertical, Classic Vertical, Stippled Stubby, and Low-Profile Stubby | SVK-8.6: 0.47; shotguns: 0.67 | SVK-8.6: 0.42; shotguns: 0.60. Native movement tier is +1; site-specific entries use 0. | 12 weapon/attachment combinations: SVK-8.6, 18.5KS-K, DB12 |
| Flechette opponent health regeneration delay | 5 seconds | 7 seconds. Native attachment adds 2 seconds to the 5-second baseline. All four captures show 7.0 seconds. | 18.5KS-K, DB12, M1014, M87A1 |
| Factory/Full Angled sprint recovery | LMR27: 200; L115, M2010 ESR, SV-98: 167; Mini Scout, DB12: 133; PSR: 200 ms | LMR27, L115, M2010 ESR, SV-98: 133; Mini Scout, DB12: 100; PSR: 167 ms | Seven captured combinations; all seven screenshots directly checked |

These are supported by source operands, current resolver output, and direct screenshot review. They are suitable for a separate scoped fix.

## Other source differences

The machine evidence lists all current operand difference groups. These counts are screening results, not defect counts: 6,762 operand matches, 682 operand differences, 1,755 unmodeled or non-comparable instances, 46 unresolved branch-composition instances, five display-rounding matches, and six factory-baseline-normalized matches.

- QD Grip Pod uses a native recoil tier of +3 on BROD 3, EF88, M16A4, RPK-74M, and VSSM. The site uses +2. The other 27 selectable weapons use native +2. A global +3 change would be incorrect. The low precision of capture recoil values limits independent confirmation of the magnitude.
- Factory/Full Angled grips have native sprint and deploy tier -1. DB12 and the six sniper source contexts use 0 on the site; LMR27 uses +1. Seven captured sprint values are confirmed in the table above. Deploy time has no corresponding detailed-panel measurement. Interdictor has source evidence but no captured panel in this set.
- Slim Angled has a native moving-ADS-spread tier -1 where current entries use 0 on 18.5KS-K, PSR, and SV-98. This is a source operand difference; the panel does not measure moving spread directly.
- Six VSSM magazine differences disappear when both source and site use selected-minus-default baselines. Four M60/PW7A2 raw differences remain documented screenshot-backed baseline exceptions. Chamber and dual-tube counts must also be kept separate from raw magazine counts.

## Known model limits retained

Heavy, Heavy Extended, and Cryo correctly limit their spread changes to ADS. Their estimated recovery coefficient is still 1.71 versus native 1.837117. Some native recovery-offset changes are not modeled. These affect 61 source contexts.

Flashlights and combined devices retain the estimated 15% recovery behavior instead of the full native spread/recovery operation set. The source review has 137 contexts, including 19 combined-device contexts. The combined-device catalog recovery boost is not consumed by the runtime. Conditional activation and native spread recovery are not fully verified.

Smooth recoil retains estimated recovery behavior. The source supplies recovery factors and duration/time fields that the current simulation does not fully consume. This affects 349 source contexts. VSSM Folding Stock also has native decay factor 76 and time exponent 1.24 in both aim states that are not modeled. A larger factor alone does not prove a fixed recovery improvement.

The previously deferred bolt-action muzzle recoil tiers remain deferred. Native +6/-6 and site +1/-1 are known differences. They must not be conflated with the separate QD Grip Pod finding.

## Capture and comparison limits

The VSSM Folding Stock capture shows 800 RPM, but the audit row still says 450. L115 Slim Angled shows 300 ms ADS time, not the audit's 367. M2010 ESR and SV-98 FMJ each show 300 ms, not 250. These four audit errors agree with current site output after transcription correction. The canonical audit remains unchanged during this review.

Two KTS100 files have identity conflicts. The file named Ribbed Vertical shows Classic Grip Pod. The file named 60RND Magazine highlights the 60 FAST tile, with cost 10, reload 2.876 seconds, and sprint recovery 233 ms. Comparing that image against site `60_rnd` would give false defects. Both rows are excluded across all 22 fields and their costs.

After this visual review, the broad screen retains 696 numeric differences, four audit errors, 158 range-context differences, and 44 field exclusions from the two identity conflicts. There are 48,952 matching or integer-display-compatible readings and 18,940 unsupported readings. These totals cover all 68,794 detailed-panel field checks. The 696 readings include repeated weapon baselines and known context/model differences; they are not 696 confirmed defects.

The broad panel comparison deliberately retains unresolved differences. Examples include historical EF88 values, bolt-action fire rates, spotting-distance context, collateral multipliers, and rounded recoil values. Each must be resolved against its source and capture context before a site change. Integer floor/round compatibility is screening evidence; it does not establish one universal game display rule.

Four sniper families show peak damage of 100 in their captures while the comparison evaluates site damage at zero range, where it is 80. These are range-context differences. Pump fire-rate cards are blank in the current UI and are excluded. Magazine/chamber and dual-tube differences are not automatically defects. Composite Hipfire, Precision, Control, and Mobility scores, Fire Modes, and Reload in ADS are not validated by this scalar resolver comparison.

Damage-curve selection, spread-array index semantics, and general animation-derived reload timing remain source-mapping limits. No blanket damage/reload mismatch count is claimed. Base ballistics and auxiliary model tables were included in the scope review, but direct scalar agreement does not validate their engine consumers. Source hashes establish provenance, not the correctness of every inference.

## Evidence and next action

[Structured review evidence](../../reference-data/provenance/frosty-site-review-2026-09-07.json) records the current hashes, source verification, inventory reconciliation, operand groups, panel results, correction impact, and confirmed findings. Full row-level working outputs and comparison scripts remain in `outputs/site-frosty-review/`; their hashes are recorded in the evidence.

The next implementation should start with the 23 supported panel differences: 12 movement, four Flechette, and seven sprint-recovery values. Keep native-model changes separate from these data fixes. This review makes no runtime change and does not publish anything.
