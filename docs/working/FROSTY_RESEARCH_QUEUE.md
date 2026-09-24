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
| L1 | **Bolt behavior flags - In progress** | Prior DLC Bolt/keep-ADS pattern retained, individual names unresolved. | Question: which of six bolt flags controls ADS exit/return or chamber behavior affecting scoped cadence in `sim/core.js`? Leading explanation: separable input/zoom gates; alternative: correlated flags with other roles. Distinguishing evidence: one-flag differences in comparable bolt blocks and independent registry/member evidence. First bounded search: release weapon/vehicle weapon blocks containing `Field_168e57d5`, `65310f94`, `c2b88435`, `85df0c4a`, `a60870ff`, `3ff462cc`; compare closest flag vectors with surrounding timing fields. External `1.4.3.0/L1`; no infantry runtime inference from vehicles. |
| L2 | **Mini Scout and Interdictor** | Done. Mini Scout already has the DLC Bolt pattern; Interdictor has the leave-ADS pattern. | None; use them as capture controls. |
| L3 | **Bolt completion fractions** | Pumps separate the readings. M87A1 has hip fraction 0.6 and zoom fraction 1.0, and its site RPM equals the full cycle (94.74; a fraction gate would give 138.46). | Capture only: M87A1 hipfire maximum cadence. |
| L4 | **Recon `-1` time** | All nine `Class_582cbe36` instances use `-1` for fields they do not override, which supports inheritance. Recon also sets speed and both fractions. | Native activation is capture rank 6. |
| L5 | **Burst cadence** | Done. Bursts per minute, rounds per burst and the fire-mode enum are sourced. The six burst weapons store no BPM. GRT-BC and SL9 BPM corrected. | Capture rank 9 checks for a native pause. |
| L6 | **Weapon-local conditional effects — In progress** | Prior findings remain in the 23 September receipt; no new conclusion yet. | Do local WB parts add non-sway effects missing from `data/attachments.json` and `sim/applyAttachments.js`? Leading explanation: local effects override generic package operands; alternative: inactive or redundant parts. Distinguishing observation: attachment selector, local part target and operation chain. First search: 64 WB bodies for `Class_897c99a7` and non-sway effect references. Output: `1.4.3.0/L6`. Resume: extract bounded local-part inventory. |
| L7 | **Spot-on-fire base consumer** | Exhausted. No serialized reader exists; `SimEx_WeaponFireSpotting` reads only the duration and allowed flags. | Capture rank 1. |
| L8 | **PP-19 and L115 muzzle gaps** | Done. The PP-19 Flash Comp binding omission is confirmed at the byte level (bug #6); L115 is bug #12. Both now follow in-game behavior and are marked as bugged. | None. |
| L9 | **Zeroing default** | Exhausted. No `WeaponZeroingModifier` instance exists in captured data; the default is probably the first list entry. | Capture rank 7. |
| L10 | **Tooltip string gaps** | Exhausted. Five IDs are absent from both English tables and three conflict with panel text. No site impact. | None. |
| L11 | **Blocker triage** | Done. Source-traceable: default selections (189 rows) and ergonomic recoil overrides (originally 19; current five leaves reviewed in L13). Capture only: magazine nominal versus loaded capacity (about 260), spot multipliers (40), collateral index (about 330). No source: caliber labels (62). | Work L12 and L13. |
| L12 | **Equipment subset recorded - Comparison scope clarified** | [Source subsets retained](../../reference-data/provenance/frosty-2026-09-24-L12-equipment-selection-candidates.json). Operator clarified 24 September: site defaults intentionally represent a bare-weapon baseline, not the game default loadout. M4A1 Short versus Basic is not a proposed correction. | No per-weapon default audit or capture needed. Reuse Equipment subsets only to explain an observed unexplained source/site stat difference; reopen with that concrete discrepancy. Previous default-change proposal and capture request withdrawn. External `1.4.3.0/L12` remains reproducible. |
| L13 | **Burst recoil duration - Site operands supported** | [Reviewed five current override leaves](../../reference-data/provenance/frosty-2026-09-24-L13-burst-duration-bindings.json): all bind the -0.0006 additive under BurstFireActive; base 0.025 in both aim states. Current registry names the target RecoilDuration. Original 19-row scope corrected. | Retain values; source prediction 0.0244 is conditional. Enabled-to-Active transition and runtime composition need rank9 capture or a new consumer. External `1.4.3.0/L13` retains raw offsets, binding checks and reproducers. |
| L14 | **Single-fire configured cadence - Site behavior supported** | [Reviewed registry/raw check](../../reference-data/provenance/frosty-2026-09-24-L14-single-fire-cadence.json): RateOfFireForSingleFire name established in exact context; all 14 primary-single site RPMs match. VSSM distinguishes 450 single from 800 main. Prior 300-450 range corrected to 150-1800 across release primary blocks. | No base RPM correction. Alternate-mode runtime cap needs L14 capture: M4A1 400 single versus 900 auto. Reopen source work for a new selected override or consumer; external `1.4.3.0/L14` contains reproduction and raw offsets. |
| L15 | **Shooting recoil decay scale - In progress** | Discovery from `data/weapons.json` recoil `shootingDecScale` versus no direct use in `sim/core.js`. Existing input review leaves native recovery equation unresolved. | Question: does a selected GRM effect change `Field_9b46e71d` (registry-named ShootingRecoilDecreaseScale), making the omitted multiplier affect displayed recoil paths? Leading explanation: all selected values neutral; alternative: non-neutral modifier omitted from simulation. New route: inspect only release `Class_bb838ff6` operands at this exact recoil field and base GS values; trace a non-neutral selector if found. Do not reopen general native recovery equations without evidence. External `1.4.3.0/L15`. |
| L16 | **M250 local bipod scaling - In progress** | L6 inventory exposed a new local `Class_8b80c794` under `U_M250_Bipod`, with two 1.0375 operands and one 1.0 operand. Not covered by the existing generic deployed GRM receipt. | Question: does this part affect weapon sway, recoil or another modeled value missing from `GRIPS.bipod` and `sim/applyAttachments.js`? Leading explanation: local numeric bipod effect; alternative: camera/presentation parameter. Distinguishing evidence: independently named same-class WME or target/registry links, then selector semantics. First search: exact class instances in release ledger and their asset names/field structures. External `1.4.3.0/L16`; no runtime inference from operand alone. |

## Proposed Analyzer changes

These proposals come from completed source work. They need product review and
operator approval; none is implemented unless stated.

| Proposal | Affected data/code | Evidence and remaining validation |
|---|---|---|
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
