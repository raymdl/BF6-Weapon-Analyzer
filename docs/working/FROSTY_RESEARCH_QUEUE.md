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

## Active source leads

Work these from source before handing them to the capture plan. Each lead lists
what was already established so it is not repeated.

| # | Lead | Already established | Next source step |
|---|---|---|---|
| L1 | **ADS Bolt consumer** | `ads_bolt` choices on M2010, SV-98, PSR and L115 select `WME_ADSBoltRechamber_P25` (class `Class_20a02ed5`, selector `ebf5fb27…`). The only operand is a one-byte true flag at `Field_68c40b57`; there is no numeric timing operand. The site treats it as `noEffect`. [Receipt](../../reference-data/provenance/frosty-site-ads-bolt-cadence-2026-09-23.json) | Find every other asset of `Class_20a02ed5` and every reader of selector `ebf5fb27…`. Check whether any other modifier sets `Field_68c40b57`. Look for the soldier/weapon state field that the flag gates. |
| L2 | **Mini Scout and Interdictor rechamber behavior** | Both are used as base-behavior controls; neither offers `ads_bolt`. | Check whether either base WB/GS already carries an ADS-rechamber flag or an equivalent selector, so the capture controls are known in advance. |
| L3 | **Bolt zoom completion fraction** | `Field_21f2d4ee` is 0.8–0.875 on the six bolt rifles. Two readings remain: it gates firing, or it gates ADS re-entry. | Compare the field across all scoped and non-bolt weapons. Look for a weapon where the two readings predict different menu RPM or where Sym's value distinguishes them. |
| L4 | **Recon second bolt block (`time = -1`)** | The owner chain and exact `WM_ReconTrait` selector (`89c5e29e…`) are confirmed for all six rifles. Inheritance of the unset time is a hypothesis. | Survey every `-1` float in timing blocks across all 64 WB bodies. Check whether other trait-bound blocks use `-1` as "inherit" where the resulting value is observable or matches Sym. |
| L5 | **Burst cadence for six burst weapons** | KORD 6P67, SG 553R, PW5A3, UMG-40, KV9 and CZ3A1 share `WPM_ERG_BurstFireEnabled_W10`. The site stores rounds but no burst rate, so it adds no pause between bursts. This affects TTK. DB-12's burst rate reproduces from its firing and cycle fields. | Apply the DB-12 derivation to these six weapons' firing/cycle fields. Trace the enum scalar and array under the selector to find burst count and inter-burst delay. |
| L6 | **SGX Light Suppressor override** | The local `0.975282` factor is linked by the exact ConditionalExtended selector to CQB and Long. Long's `1.462923` is `0.975282 × 1.5`. Proposal: move Light's override to CQB. [Receipt](../../reference-data/provenance/frosty-site-sgx-sway-lineage-2026-09-23.json) | Check the same suppressor-family selector pattern on every other weapon with Light/CQB/Long suppressors for the same stale-override shape. |
| L7 | **Spot-on-fire base consumer** | Per-weapon WB `Field_5ebda408` holds world `Field_9918e670` and minimap `Field_31022dc5`. 61 weapons are 54/150; M45A1 and Skorpion are 27/64.29; KSG is 75/150. [Receipt](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json) | Find readers of `Field_5ebda408` or its owning class. Trace the Subsonic and suppressor spotting effects to the same operands to establish product versus minimum composition. |
| L8 | **PP-19 Flash Comp and L115 Standard Suppressor gaps** | The exact selected WB/GS graphs do not supply the site's assumed PP-19 recovery multipliers or duration override, or L115's hip-spread tier. [Receipt](../../reference-data/provenance/frosty-site-muzzle-operands-2026-09-23.json) | Search for the assumed values by float32 across the PP-19 and L115 dependency sets, including the alternate cache payloads for their muzzle records. |
| L9 | **Zeroing default selection** | All 63 lists are checked; the 12 selectable lists match the site. 51 lists have a single value. | Find the field that selects the default entry and whether single-value lists imply fixed zero. |
| L10 | **Tooltip string gaps** | 18 exact choices still use screenshot descriptions because their bound English IDs are absent or conflicting. [Receipt](../../reference-data/provenance/frosty-site-tooltips-2026-09-23.json) | Check other localization tables and the 1.4.3.1 string export for these IDs before accepting the text found at other IDs. |
| L11 | **Blocker triage** | The [final input ledger](../../reference-data/provenance/frosty-site-input-review-final-v2-2026-09-23.json) has 748 source-blocker rows and 428 candidate rows with blockers. | Split these by next evidence: *source-traceable* (a field, caller or value search can still narrow them) or *capture-only*. Add the source-traceable groups to this table as leads. |

## Proposed Analyzer changes

These proposals come from completed source work. They need product review and
operator approval; none is implemented unless stated.

| Proposal | Affected data/code | Evidence and remaining validation |
|---|---|---|
| Model burst pause for the six burst weapons (L5) | `data/weapons.json`, timing in `sim/core.js` | Current TTK assumes no pause between bursts. Needs source derivation (L5) or the rank-9 capture. |
| Model sustained fully-ADS bolt-rifle cadence | Sniper RPM, shot spacing, TTK | Separate next accepted shot from next fully-ADS shot. [Candidate table](../frosty/WEAPONS.md#ads-bolt-and-scoped-shot-cadence-23-september-2026). Needs L1–L4 and capture rank 6. |
| Move SGX Light Suppressor sway override to CQB (L6) | `data/attachments.json` | Subject to native activation; paired predictions in capture rank 8. |
| Generate per-weapon spot bases from WB | `sim/applyAttachments.js`, spotting display | M45A1 and Skorpion would differ from the current 54/150. Needs L7 and capture rank 1. [Official 1.2.1.0 context](../../reference-data/provenance/frosty-spotting-patch-context-2026-09-23.json) corroborates 54 m and 21 m. |
| Correct GGH22 caliber label to `.40 S&W` | `data/weapons.json` `cal` | The localized description says `.40 caliber` and the WB selects `PD_.40SW`. Label only; ballistics already use this projectile. |
| Keep source precision for subsonic velocities | `data/attachments.json` | M417 A2 273.599203, PW7A2 341.567997 and USG-90 265.293513 m/s, versus integer menu values. [Receipt](../../reference-data/provenance/frosty-site-ammo-velocity-2026-09-23.json) |
| Test whether the idle-duration table controls ADS-entry spread timing | Not idle recovery in `sim/core.js` | The first eight values match the ADS ladder minus one 60 Hz frame; indices follow the ADS animation index on 62 of 64 weapons. Use the VSSM capture first. |
| Per-weapon deployed comparison using actual bipod operands | `sim/attachments.js`, `sim/core.js` | Deployment conditions and stacking unresolved; no mounted recoil reduction established. |
| Keep GS ADS tier and WB timing as separate coordinates | Handling data | Prevents VSSM double counting. |
| Utility indicator for MagFlare reload-while-ADS | `data/attachments.json`, `ui/loadout.js` | No reload-speed operand found. |
| Exact optic identity and PiP/FOV context | Attachment/display data | Resolve local/shared precedence first. PiP changes magnification distribution only (official). |
| Zeroing/Rangefinder aim-point correction | `sim/ballistics.js` | Needs L9 and capture rank 7. |
| Keep class and mode context in damage/regen comparisons | Provenance, scenario controls | Shared defaults are not universal match rules. |

Already applied: SOR-300SC and GRT-CPS empty reloads are 3.2 s and 3.034 s,
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
