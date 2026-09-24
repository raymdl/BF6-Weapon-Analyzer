# Frosty research queue

[Research index](../frosty/README.md) · [Open questions](../frosty/OPEN_QUESTIONS.md) · [Capture plan](BF6_CAPTURE_PRIORITIES.md)

## Objective

Keep tracing Frosty source to find information that changes or explains Analyzer
values. Priority order:

1. Site values that are wrong, assumed or based only on screenshots.
2. Mechanics the site does not model that could change displayed stats.
3. Source evidence that narrows a question the capture plan would otherwise have
   to answer in game.

Scope is multiplayer weapons, attachments, optics and soldier mechanics. Check maps
and modes only for overrides of those mechanics. Exclude only supported cosmetic,
single-player-only and battle-royale-only content.

**This queue has no completion condition.** Classifying an item as "blocked" does
not end its tracing. After each lead, record the result in the owning topic page,
add any new leads it exposes, and move on to the next one. Mark a lead exhausted
only with a list of what was searched: fields, value searches, catalog scope and
callers. "Needs a native consumer" is a reason to look for one, not a stopping point.

## Working rules

- Research only: tools, evidence and docs. Production data changes need the
  operator's approval first. Do not push.
- Use float32/int32 value searches, then decoded-field and raw-byte checks. A missed
  name search does not show that something is absent. A byte match alone does not
  establish meaning. Source presence does not establish runtime use.
- Follow a dependency only when it can affect an Analyzer value. Broad catalog
  expansion (tasks E1–E4 in the [23 September snapshot](#history)) stays deferred.
- Record findings in the `docs/frosty/` topic pages, per-asset conclusions in
  `reference-data/frosty/asset-findings.json`, and values/hashes in a new dated JSON
  under `reference-data/provenance/`. Do not create per-investigation Markdown docs.
  Update this queue's lead list rather than appending progress narrative.
- Keep 1.4.3.0 (Head 4892017, descriptor `91c9ea7c…`) and 1.4.3.1 (Head 4892087,
  descriptor `99b49cfd…`) evidence separate. Use hashes, not file versions. The
  `builds/1.4.3.0` folder name is the retained identifier for both.

## Current run

- Started: 2026-09-23T23:43:35-04:00; branch `main`; initial working tree and index clean.
- External evidence: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-23T234335-0400`. Build and lead subdirectories keep evidence separate.
- Governing request: full attachment `C:\Users\royal\.codex\attachments\390edbdb-e690-495d-bf11-570030d5c7c9\Pasted text.txt`, including all leads, methods, evidence standards, expansion, persistence, scope, and handoff rules. The active goal is a summary; the full request controls this run.
- Work L12, L6 extension, L13, L1, L14 and unsourced-input discovery; then continue useful investigations across A–E: unsourced values, omitted mechanics, cross-weapon consistency, unnamed varying fields, and verified build changes. Initial leads or one finding do not complete the run. Continue while useful work and permitted resources remain until a user stop or explicit limit; no invented deadline or token budget.
- A blocked lead must retain exact scope, outputs and resume/reopen condition; move to other work. Reopen only with new evidence or a materially different route. If all useful routes need unavailable evidence/access, save a complete handoff and report the common blocker, subject to goal-tool rules.
- Site baseline (operator clarification, 24 September): use a bare weapon for cross-weapon comparisons. Game default attachments need not match site defaults; investigate them only when they can explain an observed unexplained stat difference.
- Research only: no shipped files; exact proposed site changes require separate user review. Separate observed source facts, inferred meaning, unresolved activation/composition and in-game observations. Preserve build identities and raw hashes. Raw captures and ledger remain read-only.
- Up to six bounded Luna medium workers may write only their unique external directories; the lead alone writes repository research files and independently verifies consequential claims. Persist partial evidence immediately and update queue checkpoints at least every 30 minutes.
- Commit reviewed research documentation, final receipts and necessary narrowly tested research scripts locally; preserve unrelated work; never push, amend or rewrite history. No new repository Markdown documents. Use existing topic pages and capture priorities. Keep the proposals table and final handoff usable at each checkpoint.

## Active source leads

Work these from source before handing them to the capture plan. Results from the
23 September pass are in the [receipt](../../reference-data/provenance/frosty-source-leads-2026-09-23.json). Each row says what is established and what is next.

| # | Lead | Established | Next source step |
|---|---|---|---|
| L1 | **Bolt flags - Exhausted within recorded scope** | [All-route decoded-release comparison](../../reference-data/provenance/frosty-2026-09-24-L1-bolt-flag-contrasts.json): only c2b88435 differs alone at vector level; timings/anchors/mechanisms remain confounded. Three vectors independently raw-checked. No individual names established. | No cadence change. Capture rank6 remains. Reopen with isolated same-weapon modifier, new consumer or typed association; no vehicle absence claimed. Exact queries and raw controls in external `1.4.3.0/L1`. |
| L2 | **Mini Scout and Interdictor** | Done. Mini Scout already has the DLC Bolt pattern; Interdictor has the leave-ADS pattern. | None; use them as capture controls. |
| L3 | **Bolt completion fractions** | Pumps separate the readings. M87A1 has hip fraction 0.6 and zoom fraction 1.0, and its site RPM equals the full cycle (94.74; a fraction gate would give 138.46). | Capture only: M87A1 hipfire maximum cadence. |
| L4 | **Recon `-1` time** | All nine `Class_582cbe36` instances use `-1` for fields they do not override, which supports inheritance. Recon also sets speed and both fractions. | Native activation is capture rank 6. |
| L5 | **Burst cadence** | Done. Bursts per minute, rounds per burst and the fire-mode enum are sourced. The six burst weapons store no BPM. GRT-BC and SL9 BPM corrected. | Capture rank 9 checks for a native pause. |
| L6 | **Local non-sway parts - Scoped finding; follow-up L16** | [Reviewed optic-offset route](../../reference-data/provenance/frosty-2026-09-24-L6-local-optic-offset-scope.json): RPK74M registry names Class_45930daa context Weapon Offset for Optics. No combat-stat substitution justified. Local bipod booleans and capacity differences do not establish new numeric changes. | M250 numeric bipod part transferred to L16. External `1.4.3.0/L6` stores inventory and partial worker traces, explicitly unreviewed outside the receipt. Reopen other classes only with a concrete site-relevant question; do not repeat known Recon or nominal-capacity routes. |
| L7 | **Spot-on-fire base consumer** | Exhausted. No serialized reader exists; `SimEx_WeaponFireSpotting` reads only the duration and allowed flags. | Capture rank 1. |
| L8 | **PP-19 and L115 muzzle gaps** | Done. The PP-19 Flash Comp binding omission is confirmed at the byte level (bug #6); L115 is bug #12. Both now follow in-game behavior and are marked as bugged. | None. |
| L9 | **Zeroing default** | Exhausted. No `WeaponZeroingModifier` instance exists in captured data; the default is probably the first list entry. | Capture rank 7. |
| L10 | **Tooltip string gaps** | Exhausted. Five IDs are absent from both English tables and three conflict with panel text. No site impact. | None. |
| L11 | **Blocker triage** | Done. Source-traceable: default selections (189 rows) and ergonomic recoil overrides (originally 19; current five leaves reviewed in L13). Capture only: magazine nominal versus loaded capacity (about 260), spot multipliers (40), collateral index (about 330). No source: caliber labels (62). | Work L12 and L13. |
| L12 | **Equipment subset recorded - Comparison scope clarified** | [Source subsets retained](../../reference-data/provenance/frosty-2026-09-24-L12-equipment-selection-candidates.json). Operator clarified 24 September: site defaults intentionally represent a bare-weapon baseline, not the game default loadout. M4A1 Short versus Basic is not a proposed correction. | No per-weapon default audit or capture needed. Reuse Equipment subsets only to explain an observed unexplained source/site stat difference; reopen with that concrete discrepancy. Previous default-change proposal and capture request withdrawn. External `1.4.3.0/L12` remains reproducible. |
| L13 | **Burst recoil duration - Site operands supported** | [Reviewed five current override leaves](../../reference-data/provenance/frosty-2026-09-24-L13-burst-duration-bindings.json): all bind the -0.0006 additive under BurstFireActive; base 0.025 in both aim states. Current registry names the target RecoilDuration. Original 19-row scope corrected. | Retain values; source prediction 0.0244 is conditional. Enabled-to-Active transition and runtime composition need rank9 capture or a new consumer. External `1.4.3.0/L13` retains raw offsets, binding checks and reproducers. |
| L14 | **Single-fire configured cadence - Site behavior supported** | [Reviewed registry/raw check](../../reference-data/provenance/frosty-2026-09-24-L14-single-fire-cadence.json): RateOfFireForSingleFire name established in exact context; all 14 primary-single site RPMs match. VSSM distinguishes 450 single from 800 main. Prior 300-450 range corrected to 150-1800 across release primary blocks. | No base RPM correction. Alternate-mode runtime cap needs L14 capture: M4A1 400 single versus 900 auto. Reopen source work for a new selected override or consumer; external `1.4.3.0/L14` contains reproduction and raw offsets. |
| L15 | **Shooting recoil decay scale - Non-neutral omission hypothesis rejected in scope** | [Fresh raw verification](../../reference-data/provenance/frosty-2026-09-24-L15-neutral-shooting-recoil-scale.json): both GS aim values are 1 and all captured Class_bb838ff6 scale operands neutral. Missing direct `shootingDecScale` consumer has no numeric effect under these source values. | No site change. Reopen for non-unit base, selected non-neutral effect in another class or new consumer. Native recovery equation remains unresolved; external `1.4.3.0/L15` retains every checked source and reproducer. |
| L16 | **M250 local bipod scaling - Exhausted within recorded scope** | [Raw review](../../reference-data/provenance/frosty-2026-09-24-L16-local-bipod-unmapped.json) confirms two 1.0375 operands under U_M250_Bipod. Selected class/inherited descriptor layout matches two separately verified hotfix vehicle instances with neutral 1.0 operands. Stinger owner context supplies no target or operation. | No site change. Reopen with typed consumer or independent same-class target name; values alone do not distinguish sway, recoil or presentation. External `1.4.3.0/L16/parent-raw-verification.json` and separate `1.4.3.1/L16` preserve hashes, offsets and source limits. |
| L17 | **Match Trigger indirect effects - Source finding; needs capture** | [Raw selected-path review](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json): HK433 WB embedded identifier joins GS to GBM_NoIncrease and GRM_MatchTrigger. Verified operands: per-shot bloom multiply 0, recoil amount-exponent add 3, recovery second-multiply 1.728. The site noEffect marker is not game no-effect evidence. | Proposed tested-mode M433 effects below; source does not prove activation or composition. Capture semi-auto versus automatic controls, then review wider coverage before implementation. External `1.4.3.0/L17` contains exact WB/GS/GRX raw checks; the earlier object-GUID negative is superseded by the embedded identifier route. |
| L18 | **Buffer animation context - Exhausted within recorded scope** | [Raw registry review](../../reference-data/provenance/frosty-2026-09-24-L18-buffer-animation-context.json) names same-class canted-optic proc-firing animation context. Exact member arrays name only Priority; the vector and selector-like integer remain unnamed. Buffer retains two 0.75 vectors with null anchors. | No numeric visual-recoil proposal. Reopen with typed vector mapping or native consumer. External `1.4.3.0/L18` holds parent raw checks and exact member-array checks. Author labels do not establish Buffer magnitude or operation. |
| L19 | **Controller recovery operand - Source finding; needs capture** | [Raw and named registry review](../../reference-data/provenance/frosty-2026-09-24-L19-controller-recovery-operand.json) confirms a separate 0.8836 multiply operand on VerticalRecoilDecreaseMultiplier in both aim states. Horizontal operands are neutral. The site platform factor scales amount only. | Proposed axis-specific recovery investigation added below and to capture10. Do not equate this field with decNorm/decFactor or apply a common x/y multiplier. Activation and native equation remain unresolved. External `1.4.3.0/L19` contains raw controller and registry checks. |
| L20 | **Pellet directions - Exhausted within recorded source scope** | [Reviewed selected-source trace](../../reference-data/provenance/frosty-2026-09-24-L20-pellet-direction-scope.json): 185KSK standard/slug PD and ShotConfig comparison did not identify a supported direction distribution. SDK direction names are clues; named InitialSpeedVariation does not map directions. | Keep pellet statistics unavailable. New typed direction/consumer or L20 impact pilot needed. Empty unnamed arrays do not prove absent patterns or random-only runtime. External `1.4.3.0/L20` preserves raw source/import checks, untyped fields and SDK limits. |
| L21 | **Base recovery axes - Numeric omission hypothesis rejected in scope** | [Raw audit](../../reference-data/provenance/frosty-2026-09-24-L21-neutral-base-recovery-axes.json) confirms vertical and horizontal GS base multipliers are 1.0 in both aim states for all 63 release site sources. | No base-value correction. Controller source modifier remains separate L19. Reopen with non-unit base or new typed consumer; no claim about native equation. External `1.4.3.0/L21` has source hashes, raw offsets and reproducer. |
| L22 | **Projectile lifetime - Source finding; needs capture** | [Current direct GRX/raw check](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json) names TimeToLive and verifies 0.5 standard / 2.0 Slug for selected 185KSK PDs. Site has no source lifetime gate. | Conditional current-model cutoffs are 151.61 / 381.35 m; these are not game range limits. Capture L22 tests confirmed hits across the buck boundary. Proposed reachability below; external `1.4.3.0/L22` holds raw checks and unchanged-site reproducer. |
| L23 | **Base speed variation - Numeric omission hypothesis rejected in scope** | [Independent raw check](../../reference-data/provenance/frosty-2026-09-24-L23-neutral-speed-variation.json) confirms named Shot.InitialSpeedVariation is 0.0 in all 63 release primary WB roots. | Deterministic site velocity omits no nonzero base value in this field. No change proposed. Reopen with nonzero selected modifier/base or typed consumer; external `1.4.3.0/L23` records hashes, offsets and reproducer. |
| L24 | **Match Trigger family consistency - In progress** | L17 establishes an indirect WB identifier -> GS effect route for HK433. The current ergo receipt lists 24 exact site/source Match Trigger selections. A global ERGOS change would affect this wider set. | Question: do those selections bind the same three operands or contain omissions/local variants? Leading explanation: shared effects; alternative: weapon-specific missing or different GS target. First bounded trace: the 24 existing exact selectors through their WB local targets to GS binding imports, comparing to reviewed shared GRM/GBM; raw-check outliers and same-path controls. External `1.4.3.0/L24`; activation remains capture-dependent, no new runtime claim. |

## Proposed Analyzer changes

These proposals come from completed source work. They need product review and
operator approval; none is implemented unless stated.

| Proposal | Affected data/code | Evidence and remaining validation |
|---|---|---|
| Projectile lifetime and reachability (L22) | `data/ballistics.json` projectile fields; `sim/ballistics.js`; dependent travel/damage display | Current integration guard is not source lifetime. Selected buck/Slug TimeToLive 0.5/2.0 could affect reach within supported range. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json). Needs capture before implementation; show unreachable separately from conditional damage, do not assume zero damage. |
| Match Trigger in an explicit tested mode (L17) | `ERGOS[id=match_trigger]`, `sim/applyAttachments.js`, recoil/spread calculations | Current choice has no modeled effects. HK433 source selects amount-exponent +3, recovery operand 1.728 and bloom multiplier 0. Candidate M433 model predicts recoil ratio 0.843908625 and recovery factor 124.416 from current inputs; conditional only. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json). Needs semi/auto capture and operator/activation validation; no blanket all-weapon change. |
| Controller vertical recovery (L19) | `ui/app.js` platform factor; `sim/core.js` `genRecoilPts` | Current factor changes amount only. Candidate separate vertical recovery control follows source 0.8836 multiplier; horizontal source operands are neutral. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L19-controller-recovery-operand.json). Needs capture10/native equation before implementation; not a common decay-factor correction. |
| Manual single-fire mode (L14) | `sim/core.js` shot spacing; `sim/applyAttachments.js` effective mode/RPM; current automatic M4A1 ~900 RPM | Candidate separate selectable mode using source ~400 RPM, only after availability/cadence capture. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L14-single-fire-cadence.json). Existing primary-semi values are supported; no correction proposed. |
| Burst pause | `data/weapons.json` | **Applied 23 September:** GRT-BC and SL9 BPM now use source 239.998993 and 327.272003. The six burst weapons store no BPM, so no change; rank 9 checks for a native pause. |
| Model sustained fully-ADS bolt-rifle cadence | Sniper RPM, shot spacing, TTK | DLC Bolt and Mini Scout keep ADS through rechambering (L1); other snipers add ADS exit and entry. Separate next accepted shot from next fully-ADS shot. [Candidate table](../frosty/WEAPONS.md#ads-bolt-and-scoped-shot-cadence-23-september-2026). Needs capture rank 6 for overlap. |
| Move SGX Light Suppressor sway override to CQB (L6) | `data/attachments.json` | **Applied 23 September.** Native activation still open; paired predictions in capture rank 8. |
| Generate per-weapon spot bases from WB | `sim/applyAttachments.js`, spotting display | M45A1 and Skorpion would differ from the current 54/150. Needs L7 and capture rank 1. [Official 1.2.1.0 context](../../reference-data/provenance/frosty-spotting-patch-context-2026-09-23.json) corroborates 54 m and 21 m. |
| Barrel sway (L6) | `data/attachments.json`, `sim/applyAttachments.js` | **Applied 23 September for Mini Scout Short (×1.033862).** GGH22's Short and Extended barrels are not offered in game. BROD3 is deferred until its two parts' composition is known. |
| In-game behavior for bugged attachments | `data/attachments.json` `GAME_BUGS`, `ui/loadout.js`, `ui/app.js` | **Applied 23 September:** L115 Standard Suppressor (#12) and PP-19 Flash Comp (#6) now follow the game; eight confirmed bugs are marked † in the menu and effects panel. |
| Correct GGH22 caliber label to `.40 S&W` | `data/weapons.json` `cal` | **Applied 23 September.** |
| Keep source precision for subsonic velocities | `data/ammo.json` | **Applied 23 September:** M417 A2 273.599203, PW7A2 341.567997 and USG-90 265.293513 m/s. [Receipt](../../reference-data/provenance/frosty-site-ammo-velocity-2026-09-23.json) |
| Test whether the idle-duration table controls ADS-entry spread timing | Not idle recovery in `sim/core.js` | The first eight values match the ADS ladder minus one 60 Hz frame; indices follow the ADS animation index on 62 of 64 weapons. Use the VSSM capture first. |
| Per-weapon deployed comparison using actual bipod operands | `sim/attachments.js`, `sim/core.js` | Deployment conditions and stacking unresolved; no mounted recoil reduction established. |
| Keep GS ADS tier and WB timing as separate coordinates | Handling data | Prevents VSSM double counting. |
| Utility indicator for MagFlare reload-while-ADS | `data/attachments.json`, `ui/loadout.js` | No reload-speed operand found. |
| Exact optic identity and PiP/FOV context | Attachment/display data | Resolve local/shared precedence first. PiP changes magnification distribution only (official). |
| Zeroing/Rangefinder aim-point correction | `sim/ballistics.js` | Needs L9 and capture rank 7. |
| Keep class and mode context in damage/regen comparisons | Provenance, scenario controls | Shared defaults are not universal match rules. |

Also applied: SOR-300SC and GRT-CPS empty reloads are 3.2 s and 3.034 s,
from the [23 September capture](../../reference-data/provenance/frosty-empty-reload-capture-2026-09-23.json).

## Parked questions

These need new source or consumer evidence before they are reopened. Reopen one
when an asset changes, a new target body becomes available, exact class/mode
selection is found, or a compiled/native consumer is identified. An unresolved
runtime question is not evidence that the source asset is unused.

| ID | Question | Status and blocker |
|---|---|---|
| W1 | Bipod/mounted modifiers and [idle table](../../reference-data/provenance/frosty-idle-duration-2026-09-23.json); [deployed review](../../reference-data/provenance/frosty-weapon-states-reviewed-2026-09-23.json) | Idle table associated across 63 GS blocks (BREN3 null). Values match the ADS ladder minus one frame; exceptions are VSSM and Interdictor. Need native use and stacking. No mounted recoil reduction established. |
| W2 | VSSM GS ADS +1 versus WB timing; [review](../../reference-data/provenance/frosty-vssm-ads-reviewed-2026-09-23.json) | GS +1 is separate from zero WB contribution. Need controlled ADS timing or a GS consumer. |
| W3 | M4A1 Magwell, BROD3 Cryo, SubsonicFrangible; [review](../../reference-data/provenance/frosty-attachment-branches-reviewed-2026-09-23.json) | Plain Magwell selects an empty default; BROD3 = BREN3. All 15 ammo branch defaults are true; no live-menu evidence. |
| W4 | Reload threshold/delays and WB frame duration (`Field_440ed7fa`) | 63 raw WB extracts. Need a timing consumer or commit/next-shot capture (rank 6). |
| W6 | Burst recoil, controller activation, lights, modifier order, unused recoil bounds, class traits, Slim Angled double ADS | Need native execution or controlled gameplay. Do not repeat exhausted operands. |
| W7 | Weapon Attributes native provider, sine/conditional rules, `Field_b30a73ed`; [model](../WEAPON_ATTRIBUTES_MODEL.md) | No native provider evidence. |
| O1 | Ambiguous PiP layouts; [decoder limits](../frosty/TOOLS.md#sdk-and-decoding) | One pair reproduced; added import targets OptionEnablePiPZoom. Need independent field/consumer evidence. |
| O2 | Riser fields, inline/shared model precedence, render FOV | M2010 inline 55/59 and shared 34/20 are distinct paths. RMR riser 1.3 versus 1.0 needs a consumer or view comparison. |
| O3 | Optic glint and breath control; [discovery](../../reference-data/provenance/frosty-optic-discovery-2026-09-23.json) | Source links documented; visibility and duration need native or controlled evidence. |
| M1 | Regen/spotting activation and base values | Base 5 s, ammo 4/2 chains verified. All 13 Subsonic packages link both spotting effects. Native composition and reset need captures (ranks 1–2). |
| M2 | Soldier settings, abilities, LowProfile, suppression, movement ([settings](../../reference-data/provenance/frosty-soldier-settings-reviewed-2026-09-23.json), [abilities](../../reference-data/provenance/frosty-multiplayer-ability-candidates-reviewed-2026-09-23.json), [movement](../../reference-data/provenance/frosty-movement-reviewed-2026-09-23.json)) | Named configuration only; activation and native equations unverified. Registry defaults are not active mode values. |
| M3 | Four soldier file GUIDs; [trace](../../reference-data/provenance/frosty-1.4.3.0-unresolved-guid-trace-2026-09-16.json) | Need target body or consumer evidence. |
| G1 | Standard MP mode/map overrides; [review](../frosty/WEAPONS.md#mode-and-map-context) | Breakthrough has retreater-specific spotting defaults. No general combat override established; need effective server settings. |

## Where things are

- **Site-input ledger.** The [input inventory](../../reference-data/provenance/frosty-site-input-inventory-v3-2026-09-23.json)
  covers every `data/*.json` leaf and `sim/*.js` line. The
  [final review](../../reference-data/provenance/frosty-site-input-review-final-v2-2026-09-23.json)
  classifies each one, and its [validation](../../reference-data/provenance/frosty-site-input-review-validation-2026-09-23.json)
  checks it. Use the review's blocker and next-step fields for L11.
- **Topic results.** Spread, recoil, precision, timing, ADS, zeroing, projectiles and
  spotting results are in [weapons](../frosty/WEAPONS.md) and
  [attachments](../frosty/ATTACHMENTS.md). Receipts are listed in the
  [provenance index](../../reference-data/provenance/README.md#site-input-audit--23-september-2026).
- **Catalog audit ledger.** `../BF6 Datamining/builds/1.4.3.0/reports/exhaustive-audit-2026-09-23/coverage-decoder-v5.sqlite`,
  used by `scripts/frosty-audit-coverage.py`. See [tools](../frosty/TOOLS.md#exhaustive-audit-coverage-ledger).
  Capture and decode coverage are not semantic review.
- **Capture work.** The [ranked capture plan](BF6_CAPTURE_PRIORITIES.md).

## History

The full 23 September handoff, with catalog-audit checkpoint counts, the per-topic
site comparison narrative and the E1–E4 catalog tasks, is in commit `b3040e7`
(`git show b3040e7:docs/working/FROSTY_RESEARCH_QUEUE.md`). Those counts describe
coverage, not findings. They were removed here so the queue lists work rather than
progress.
