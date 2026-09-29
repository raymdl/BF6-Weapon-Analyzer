# Frosty research queue

[Research index](../frosty/README.md) · [Open questions](../frosty/OPEN_QUESTIONS.md) · [Capture plan](BF6_CAPTURE_PRIORITIES.md)

## Objective

Keep tracing Frosty source to find information that changes or explains Analyzer
values. Priority order:

1. Site values that are wrong, assumed or based only on screenshots.
2. Mechanics the site does not model that could change displayed stats, and
   weapon/attachment/soldier stats it does not show yet but that matter for
   comparing weapons and loadouts (enhancement proposals, e.g. class traits).
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
- Closing a lead has three steps: (1) a new dated receipt in
  `reference-data/provenance/` with a `record` (lead status, assets, site pointers;
  `python scripts/frosty-records.py schema` prints the fields), (2) the `docs/frosty/`
  topic page, edited in place (current understanding only; history lives in
  receipts), (3) delete the lead's row from this queue. Then
  `python scripts/frosty-records.py build && python scripts/frosty-records.py check`
  must pass before committing. `asset-findings.json`, `lead-index.json`,
  `site-evidence.json` and the archive's Closed leads table are generated; do not
  hand-edit them. Do not create per-investigation Markdown docs or append progress
  narrative to this queue.
- Start every run with `python scripts/frosty-records.py status` instead of reading
  this queue and the archive whole.
- Captures: follow the four-part rule at the top of the
  [capture plan](BF6_CAPTURE_PRIORITIES.md). Ask the operator before requesting a
  recording; an unresolved runtime question is recorded as a limit, not a capture.
- Keep 1.4.3.0 (Head 4892017, descriptor `91c9ea7c…`) and 1.4.3.1 (Head 4892087,
  descriptor `99b49cfd…`) evidence separate. Use hashes, not file versions. The
  `builds/1.4.3.0` folder name is the retained identifier for both.

## Current run: 28 September 2026

Evidence: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-28T1435-0400`
(one folder per lead). Six Luna xhigh workers in parallel (operator allowance, 28 Sep).
New line: class weapon traits (L100–L104). The site does not model them; they
would change displayed ADS time, hip spread, deploy/sprint recovery and sway for
whole weapon classes. The 13 September trait table was never raw-verified in
1.4.3.0 or joined to site IDs. L105 checks the nonzero reload delays.

Results: L100–L105 closed. Class traits for Assault, Support and Engineer are
sourced and match the EA class guide (enhancement proposal below); L103 is confirmed by
the operator. Next leads: L106 (per-weapon sprint speed), then the
other InRoundProgression modifiers (Killshot, MountedPlus, WeaponSwap).

L107 (site data precision audit, evidence `…\2026-09-28T2130-L107`) is complete:
50,529 numeric leaves; 43,428 joined at full precision, 43,236 exact and 192
violations (127 proposed, 55 recoilV held, 10 `tacRldOverrideMs` blocked by the
integer contract). Under the amended float32-equivalence rule 38 beyond-f32 values
were fixed on 28 September (commit `88bc25d`); the sub-f32 groups are passes.

### Awaiting operator (28 Sep)

- Captures ([capture plan](BF6_CAPTURE_PRIORITIES.md)): Match Trigger semi vs auto
  (L17) and the optional L99 hit-capsule boundary. Burst cadence closed without a
  recording.
- Review the class-trait, single-fire rate (L14), RPK-74M reload and burst-rate
  precision proposals, plus the ADS-out time (L114) and stance-change penalty (L120)
  proposals.
- Mounted-state recoil (L108) and reserve-rounds / chambered-round (L110) proposals:
  deferred by the operator (28 Sep); keep them in the proposal table.

## Active source leads

Only open leads are listed here. Closed leads, past run blocks and applied proposals are in
[FROSTY_QUEUE_CLOSED.md](../archive/FROSTY_QUEUE_CLOSED.md); search them with
`python scripts/frosty-worker.py prior-work --terms ...` rather than reading the archive.
When a run closes a lead, delete its row here; `frosty-records.py build` adds it to the
archive's generated Closed leads table from its record.

Work these from source before handing them to the capture plan. The capture plan was rescoped on 28 September; "capture rank N" in older rows refers to the previous plan and most of those captures were [removed](BF6_CAPTURE_PRIORITIES.md#removed-captures-28-september-2026). Results from the
23 September pass are in the [receipt](../../reference-data/provenance/frosty-source-leads-2026-09-23.json). Each row says what is established and what is next.

| # | Lead | Established | Next source step |
|---|---|---|---|
| L17 | **Match Trigger indirect effects - Source finding; needs capture** | [Raw selected-path review](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json): HK433 selected chain binds bloom multiply 0, recoil exponent add 3 and recovery second-multiply 1.728. | Kept in the [capture plan](BF6_CAPTURE_PRIORITIES.md) (#2) with justification; the site shows no effect on 24 weapons, source suggests about 16% less recoil, probably semi-only. |
| L24 | **Match Trigger family - Shared source targets established; needs capture** | [Independent 24-WB/24-GS check](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json): All 24 selected Match Trigger WB/GS chains use the two reviewed effect imports; priorities differ. | Extends L17 coverage, not runtime proof. Capture activation/composition before any family-wide implementation. |
| L99 | **Soldier hit capsules vs target zones - Source candidate; needs capture (Claude, 27 Sep)** | [Receipt](../../reference-data/provenance/frosty-2026-09-27-L99-soldier-hit-capsules.json): 11 raw-verified capsules; chest 1.0 is material 115 (Neck) on all 328 selections, and the abdomen material is the Spine capsule. On the bind pose the Spine capsule covers the centre line from 108 to 136 cm, where the site draws chest, and the head capsule is about 40% larger than the artwork head. | Would change target-view zone counts and first-lethal hits (M433 chest aim 4 → 5 hits). Needs the Awaiting-operator capture; reopen geometry for a typed offset frame or an in-game pose. |

## Proposed Analyzer changes

These proposals come from completed source work. They need product review and
operator approval; none is implemented unless stated.

| Proposal | Affected data/code | Evidence and remaining validation |
|---|---|---|
| **Operator review: burst rate precision** | `data/weapons.json` grtbc/sl9 `burstRpm` | Store source 830.769 (GRT-BC) and 771.428 (SL9) instead of menu-rounded 830/771. Gap after a burst 105.289 → 105.557 ms and 99.957 → 100.000 ms; sustained burst RPM unchanged; TTK under 1 ms. [Receipt](../../reference-data/provenance/frosty-2026-09-28-burst-cadence.json). |
| **Operator review: class weapon traits (L100–L104)** | New "class trait" toggle (off by default); `data/` trait table; `sim/applyAttachments.js` ADS, hip-spread and draw/sprint indices | Sourced for Assault/Support/Engineer on exactly the site weapons of each class; matches EA's class guide. Conditional values in the [receipt](../../reference-data/provenance/frosty-2026-09-28-L100-L104-class-traits.json): AR deploy 633 → 533 ms and sprint recovery 200 → 167 ms; LMG ADS one step faster; SMG hip minimum 1.804° → 1.352°. Recon: sniper sway ×2.25 without the trait, ×1.0 with it (the site's current value; operator confirms non-Recon sway is higher), plus the Recon rechamber block (e.g. Mini Scout 47.1 → 51.4 RPM; [timing receipt](../../reference-data/provenance/frosty-site-timing-2026-09-23.json)). Activation is class + signature weapon per EA; native composition unverified. |
| **Operator review: ADS-out time per weapon (L114)** | New per-weapon ADS-out time in `data/` (with a UI stat); the sustained fully-ADS sniper cadence model | Sourced conditionally: all 63 weapon bodies select an `FZT_Weapons` `General_10` tier through the same `WeaponZoomTransitionIndex` as the site ADS-in index (`defAds` matches 63/63), giving 400/333.334/266.667/233.334/200/166.667/133.334/100 ms by index (e.g. 233.334 ms at index 3, the M4A1's 4 gives 200 ms). The ADS-out ladder differs from the ADS-in ladder at every index. Whether the selector drives ADS-out, and whether ADS-time attachments shift it (no traced modifier references FZT directly), is unresolved; do not apply ADS-in shifts to ADS-out. [Receipt](../../reference-data/provenance/frosty-2026-09-29-L114-ads-out-transition.json). |
| **Operator review: stance-change spread penalty (L120)** | Optional per-weapon stance-change context beside the static spread minima in `data/`, `sim/core.js` spread and the stance control (see the crouch/prone posture row) | Sourced, activation unresolved: every weapon body stores `StanceChangePenalties` (Zoomed/Unzoomed x six stance transitions x `MinAngleOffset` degrees and `Duration` seconds; 1,512 raw reads over 63 weapons): prone transitions are 6 degrees over 0.9 s on 54 weapons, with class outliers, and the crouch/stand leaves are 0.2-1 degree over 0.3 s under a candidate slot join. No site choice or verified modifier targets them. If a capture confirms a transient spread floor after changing stance, show angle and duration beside the static minima; do not add them to spread until composition is known. [Receipt](../../reference-data/provenance/frosty-2026-09-29-L120-stance-change-penalties.json). |
| **Deferred (operator, 28 Sep): mounted-state recoil (L108)** | New "mounted / MountedPlus" state toggle (off by default); `data/` state table; `sim/applyAttachments.js` recoil tiers | Source adds exponent +3/-2 for MountedPlus on all 63 weapons (amount x0.800-0.855, variation x1.161-1.223, conditional), and +10/-4 (amount x0.475-0.594) or +30/-5 (Bolt bipod, amount x0.107-0.209) when a bipod is deployed. The operator decided on 13 September to document mounted/bipod recoil without model changes; the MountedPlus operands were not known then. Activation, composition and the Vertical/Horizontal flags are unresolved. [Receipt](../../reference-data/provenance/frosty-2026-09-28-L106-L111-orchestrator-trial.json). |
| **Deferred (operator, 28 Sep): reserve rounds and chambered round (L110)** | `data/attachments.json` WEAPON_MAG, `data/weapons.json`; loadout stat row; `sim/core.js` mag-dump length | (1) Show carried rounds per magazine choice (capacity x `NumberOfMagazines`, e.g. M4A1 20 Rnd 210, 36 Rnd 222, 40 Rnd 246). (2) Treat the source +1 as a chambered round on tactical reloads for closed-bolt weapons (nominal for belt LMGs and revolvers). Runtime meaning of both is unresolved; the operator can confirm from the in-game HUD without a capture. [Receipt](../../reference-data/provenance/frosty-2026-09-28-L106-L111-orchestrator-trial.json). |
| **Operator review: RPK-74M empty reload (L105)** | `data/weapons.json` rpk74m `emptyRld` | 3.100 → 3.184 s if PostReloadDelay counts as the shotgun formula counts it. [Receipt](../../reference-data/provenance/frosty-2026-09-28-L105-reload-delays.json). Low value; a reload capture would settle it. |
| Optional underbarrel secondary profiles (L71/L75/L76/L76B/L78) | `data/attachments.json`; `sim/attachments.js`, `sim/damage.js`, `sim/ballistics.js` | **Operator review: optional feature only.** The current model has no underbarrel selector; primary damage uses the weapon curve and pellet count, and projectile overrides use the base weapon/ammo. L71/L75/L76/L78 source values do not establish underbarrel runtime behavior or show a defect in primary values. L76B gives a conditional capture-feasibility calculation, not a measurement. L78 records thermobaric Explosion fields but does not establish value precedence or runtime behavior. Consider a separate profile only after firing and owner semantics are established. [L71](../../reference-data/provenance/frosty-2026-09-26-L71-m320-he-at-source-profile.json); [L75](../../reference-data/provenance/frosty-2026-09-26-L75-m320-explosion-naming-limit.json); [L76](../../reference-data/provenance/frosty-2026-09-26-L76-m320-he-firing-inputs.json); [L76B](../../reference-data/provenance/frosty-2026-09-26-L76B-m320-he-capture-feasibility.json); [L78](../../reference-data/provenance/frosty-2026-09-26-L78-m320tb-explosion-profile.json). Parent code review: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-26-astra\astra-underbarrel-site-review.json` (SHA-256 `330ba41287d436932254ad3fbf8d00d01b8f27948a263799d78bd240a9f5ea5a`). No numeric implementation proposed. |
| VSSM semi-auto hip bloom (L63) | `data/weapons.json` vssm `spreadDyn.hip.inc`, or a semi-mode rule in `sim/applyAttachments.js` | **Rejected by capture 25 September:** the bare VSSM hip reticle widens 68 → 121 px over 10 shots, so the semi condition is not active in its default mode; keep 0.398. The bare M433 in manually selected semi shows no bloom, so the condition does act after a mode switch, which matters for any future selectable single-fire mode (L14) on the 39 other bound weapons. [Source](../../reference-data/provenance/frosty-2026-09-25-L63-vssm-semi-bloom.json); [capture](../../reference-data/provenance/frosty-2026-09-25-L63-L17-semi-bloom-captures.json). |
| **Operator review: source caliber wording (L54/L55)** | `data/weapons.json` caliber metadata | Exact text supplies vz. 61 `.32 ACP`, M39 `7.62x51mm`, SVK `8.6x70mm`, and Interdictor `10.4x83mm`. These are wording options, not proof that stored aliases are wrong; no current direct consumer was found in L50. |
| **Operator review: M87A1 caliber metadata** | `data/weapons.json` M87A1 `cal` | L50 supports removing fixed `(00 Buck)` from the stored label; selectable #01/#00 names are distinct. No direct current consumer found; remaining gauge text and other weapons need separate source support. |
| Neutral shooting decay field (L15) - operator review | `data/weapons.json` `recoil.{ads,hip}.shootingDecScale`; `sim/core.js` | All 126 stored values are 1 and core has no reader, consistent with [L15](../../reference-data/provenance/frosty-2026-09-24-L15-neutral-shooting-recoil-scale.json). Either remove the unused field or retain it as documented-neutral; no numeric change proposed and no site edit made. |
| Non-polar cleanup check (L33) - operator review | `data/`, `sim/`, `ui/`; `sim/core.js:genRecoilPts` | No polar/non-polar flag or alternate branch found by scoped search and recoil-path inspection; core already resolves direction/magnitude through sine/cosine. [L33](../../reference-data/provenance/frosty-2026-09-24-L33-polar-recoil-build-separated.json) supports no current outlier, but does not prove the native equation; no removable site branch identified or changed. |
| Source hit capsules for target zones (L99) | `sim/target.js` zone partitions and alpha mask; `ui/target-stats.js` | **Operator review; needs capture.** Replace the artwork partitions with the source capsule front view: larger head, and abdomen (limb multiplier) up to about 136-148 cm on the centre line. Chest 1.0 is now sourced (material 115). [Evidence](../../reference-data/provenance/frosty-2026-09-27-L99-soldier-hit-capsules.json). Arms need an in-game pose. |
| Crouch/prone spread posture (L69) | `ui/app.js` stance control; `sim/core.js` `spreadBounds`; per-weapon spread inputs | **Operator review: optional posture dimension.** The selected source rows contain crouch/prone minima outside the current standing/moving choice for M433, M39 EMR and DB-12. Keep current standing values. Posture labels use the named Sym crosswalk; native activation, composition, posture maxima and stationary ADS inputs remain unresolved. Needs operator review and native state evidence before implementation. [Evidence](../../reference-data/provenance/frosty-2026-09-26-L69-posture-spread.json). |
| Projectile lifetime and reachability (L22) | `data/ballistics.json` projectile fields; `sim/ballistics.js`; dependent travel/damage display | Current integration guard is not source lifetime. Selected buck/Slug TimeToLive 0.5/2.0 could affect reach within supported range. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json). [L25](../../reference-data/provenance/frosty-2026-09-24-L25-selected-projectile-lifetimes.json) adds subsonic candidates using actual ammo velocity. Needs capture before implementation; show unreachable separately from conditional damage, do not assume zero damage. |
| Match Trigger in an explicit tested mode (L17) | `ERGOS[id=match_trigger]`, `sim/applyAttachments.js`, recoil/spread calculations | Current choice has no modeled effects. HK433 source selects amount-exponent +3, recovery operand 1.728 and bloom multiplier 0. Candidate M433 model predicts recoil ratio 0.843908625 and recovery factor 124.416 from current inputs; conditional only. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json). [L24](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json) confirms shared source targets on all 24 selections, with differing priorities. L70 shows the existing M433 pair has insufficient capture observability; the conditional prediction remains open. [L70 capture limit](../../reference-data/provenance/frosty-2026-09-26-L70-match-trigger-capture-limit.json). Needs semi/auto capture and operator/activation validation; no blanket runtime change. |
| Controller vertical recovery (L19) | `ui/app.js` platform factor; `sim/core.js` `genRecoilPts` | Current factor changes amount only. Candidate separate vertical recovery control follows source 0.8836 multiplier; horizontal source operands are neutral. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L19-controller-recovery-operand.json). Needs capture10/native equation before implementation; not a common decay-factor correction. |
| **Future feature: fire-mode selector (auto / burst / single; L14, burst cadence)** | `data/weapons.json` per-weapon fire modes and rates; `sim/core.js` shot spacing; `sim/applyAttachments.js` mode selection | **Operator: planned, not a current priority (28 Sep).** Source data needed and where it is: `RateOfFire`, `RateOfFireForBurst`, `RateOfFireForSingleFire` (Sym SingleRoF, e.g. M4A1 400 vs 900 RPM; [L14](../../reference-data/provenance/frosty-2026-09-24-L14-single-fire-cadence.json)), `BurstsPerMinute` and rounds per burst ([burst cadence](../../reference-data/provenance/frosty-2026-09-28-burst-cadence.json)), base primary/alternate mode lists and the BurstFireEnabled/Replace attachment branches (WEAPONS.md, burst section). Burst timing is confirmed by operator recordings; semi no-bloom (L63) and Match Trigger (L17) effects are mode-conditioned. Store full source precision. |
| Model sustained fully-ADS bolt-rifle cadence | Sniper RPM, shot spacing, TTK | ADS-out (`Aout`) now has a conditional source (L114 row above). DLC Bolt and Mini Scout keep ADS through rechambering (L1); other snipers add ADS exit and entry. Separate next accepted shot from next fully-ADS shot. [Candidate table](../frosty/WEAPONS.md#ads-bolt-and-scoped-shot-cadence-23-september-2026). Needs capture rank 6 for overlap. |
| Generate per-weapon spot bases from WB | `sim/applyAttachments.js`, spotting display | M45A1 and Skorpion would differ from the current 54/150. Needs L7 and capture rank 1. [Official 1.2.1.0 context](../../reference-data/provenance/frosty-spotting-patch-context-2026-09-23.json) corroborates 54 m and 21 m. |
| Test whether the idle-duration table controls ADS-entry spread timing | Not idle recovery in `sim/core.js` | The first eight values match the ADS ladder minus one 60 Hz frame; indices follow the ADS animation index on 62 of 64 weapons. Use the VSSM capture first. |
| Per-weapon deployed comparison using actual bipod operands | `sim/attachments.js`, `sim/core.js` | Deployment conditions and stacking unresolved; no mounted recoil reduction established. |
| Keep GS ADS tier and WB timing as separate coordinates | Handling data | Prevents VSSM double counting. |
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
| W2 | VSSM GS ADS +1 versus WB timing; [review](../../reference-data/provenance/frosty-vssm-ads-reviewed-2026-09-23.json) | GS +1 is separate from zero WB contribution. L62 found the same GS-only `GID_ADSTime_BRL` on EF88 and BROD3 Extended; EF88 panel Mobility follows the WB index. Need controlled ADS timing or a GS consumer. |
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

- **Records.** `python scripts/frosty-records.py status` summarises live leads,
  what awaits the operator, the latest closed leads, ledger drift and stale
  pointers. The [lead index](../../reference-data/frosty/lead-index.json) lists every
  recorded lead with its status, receipts and what would reopen it;
  [site evidence](../../reference-data/frosty/site-evidence.json) maps site pointers
  to the receipts that bear on them; the [asset findings](../../reference-data/frosty/asset-findings.json)
  are generated from the frozen base plus each record's assets.
- **Site-input ledger.** The [input inventory](../../reference-data/provenance/frosty-site-input-inventory-v3-2026-09-23.json)
  covers every `data/*.json` leaf and `sim/*.js` line as of 23 September; [inventory v4 and its delta ledger](../../reference-data/provenance/frosty-site-input-inventory-v4-2026-09-28.json)
  (28 September) classify the 1,739 data leaves that changed since (sim drift is reported by `frosty-records.py ledger-drift`, not re-reviewed). The
  [final review](../../reference-data/provenance/frosty-site-input-review-final-v2-2026-09-23.json)
  classifies each one, and its [validation](../../reference-data/provenance/frosty-site-input-review-validation-2026-09-23.json)
  checks it. Use the review's blocker and next-step fields for L11.
- **Topic results.** Spread, recoil, precision, timing, ADS, zeroing, projectiles and
  spotting results are in [weapons](../frosty/WEAPONS.md) and
  [attachments](../frosty/ATTACHMENTS.md). Receipts are in
  `reference-data/provenance/`; the lead index above links each lead to its receipts.
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
