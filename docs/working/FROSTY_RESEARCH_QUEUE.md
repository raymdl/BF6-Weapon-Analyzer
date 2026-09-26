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

## Closed run: 23-24 September 2026

Evidence: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-23T234335-0400`.
Covered L1, L6 and L12-L35; L36 was left for review and is now closed below.
Site comparisons use a bare weapon; game-default attachments are relevant only
when they explain an observed stat difference.

## Current run: 24 September 2026

Review fixes precede new leads L37 onward. Evidence root:
`C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-24T090117-0400`.
Research only on `main`; local commits, no push/amend/history rewrite, no new
Markdown documents or shipped changes. Preserve build identities and raw hashes;
keep source facts, inference, unresolved runtime behavior and observations separate.
Use Luna xhigh for new delegated work at the operator's request (24 September).
Update checkpoints at least every 30 minutes; use repository scripts with new external
output paths. Add captures only when arithmetic supports a useful test.
Review fixes 1-8 are reviewed. Repository methods now reproduce recorded field,
registry, selection, reference and lifetime checks; receipt commands identify the
remaining specialized external checks. Results are in `1.4.3.0/reproduction-*`
and the separate `1.4.3.1` directory under this run root.

Paused at the operator's request, 24 September 2026. Review fixes 1-8 and leads
L37-L58 are documented and locally committed. L56 closes the two-loadout recoil
precision check; L58 closes the remaining primary caliber-text screen. No worker
is still assigned work. No shipped site/data changes or pushes were made.

Resume at **L59**. Read the operator-review proposals below first; L45 and L53
were applied on 24 September. Prioritize an unsourced input or
non-neutral selected modifier with a concrete Analyzer consumer and a new source
discriminator. Loaded magazine state, spotting composition and native mechanics
remain unresolved; do not repeat neutral scans or bounded catalog negatives.
Use Luna xhigh if delegating. Receipts pin inputs, hashes, scripts and external
outputs; use new output paths on reruns. No new capture follows from L56/L58.

## Closed run: 24 September 2026 (evening)

Evidence: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-24T185356-0400`.
Covered L59, L61 and the first four L60 slot groups.

## Current run: 25 September 2026

Claude selects leads and reviews results; bounded checks go to Codex CLI workers
(GPT-6 Luna, xhigh), launched with `~/.claude/codex-bridge/run_worker.py`; every
brief starts with the shared preamble [frosty-worker-brief.txt](frosty-worker-brief.txt). Evidence root:
`C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-25T001054-0400`.
Lead selection rule: a lead needs a plausible route to change a displayed site number
or expose a site calculation defect. Skip self-consistency checks, catalog screens
and label wording unless requested. L60 and L62 (reverse coverage of attachment
effects) are closed; L62 left two sight proposals. L63 (VSSM semi bloom) was
rejected by capture; the M433 semi capture left L17 bloom unisolated.

## Current run: 26 September 2026

Evidence root: `C:\Users\royal\Documents\BF6 Datamining\reports\weapon-analyzer-research\2026-09-26-astra`; release evidence is under `1.4.3.0`, with existing-video analysis under `capture`. L69 is recorded as a scoped source candidate and omitted-feature proposal. Active leads: L68 selected damage routes; L70 M433 paired-video recoil feasibility; L71 M4A1 HE/AT underbarrel projectile profiles.

Raw-source checks and controls remain underway for active leads. L69 does not establish native activation or composition, or show that current standing values are incorrect. After blocked or exhausted leads, work may extend overnight to new site-relevant weapon or attachment paths. Claim each lead and reproduce its controls. Research only; commit locally, and propose site changes for review.

## Active source leads

Work these from source before handing them to the capture plan. Results from the
23 September pass are in the [receipt](../../reference-data/provenance/frosty-source-leads-2026-09-23.json). Each row says what is established and what is next.

| # | Lead | Established | Next source step |
|---|---|---|---|
| L1 | **Bolt flags - Exhausted within recorded scope** | [All-route decoded-release comparison](../../reference-data/provenance/frosty-2026-09-24-L1-bolt-flag-contrasts.json): Only c2b88435 differs alone at vector level; raw controls do not separate timings, anchors or mechanisms. | No cadence change; capture rank 6 remains. Reopen with an isolated modifier, typed association or new consumer. |
| L2 | **Mini Scout and Interdictor** | Done. Mini Scout already has the DLC Bolt pattern; Interdictor has the leave-ADS pattern. | None; use them as capture controls. |
| L3 | **Bolt completion fractions** | Pumps separate the readings. M87A1 has hip fraction 0.6 and zoom fraction 1.0, and its site RPM equals the full cycle (94.74; a fraction gate would give 138.46). | Capture only: M87A1 hipfire maximum cadence. |
| L4 | **Recon `-1` time** | All nine `Class_582cbe36` instances use `-1` for fields they do not override, which supports inheritance. Recon also sets speed and both fractions. | Native activation is capture rank 6. |
| L5 | **Burst cadence** | Done. Bursts per minute, rounds per burst and the fire-mode enum are sourced. The six burst weapons store no BPM. GRT-BC and SL9 BPM corrected. | Capture rank 9 checks for a native pause. |
| L6 | **Local non-sway parts - Scoped finding; follow-up L16** | [Reviewed optic-offset route](../../reference-data/provenance/frosty-2026-09-24-L6-local-optic-offset-scope.json): RPK74M registry names Class_45930daa as Weapon Offset for Optics; no combat-stat change follows. | M250 bipod part moved to L16. Reopen other classes only for a concrete site-relevant question. |
| L7 | **Spot-on-fire base consumer** | Exhausted. No serialized reader exists; `SimEx_WeaponFireSpotting` reads only the duration and allowed flags. | Capture rank 1. |
| L8 | **PP-19 and L115 muzzle gaps** | Done. The PP-19 Flash Comp binding omission is confirmed at the byte level (bug #6); L115 is bug #12. Both now follow in-game behavior and are marked as bugged. | None. |
| L9 | **Zeroing default** | Exhausted. No `WeaponZeroingModifier` instance exists in captured data; the default is probably the first list entry. | Capture rank 7. |
| L10 | **Tooltip string gaps** | Exhausted. Five IDs are absent from both English tables and three conflict with panel text. No site impact. | None. |
| L11 | **Blocker triage** | Done. Source-traceable: default selections (189 rows) and ergonomic recoil overrides (originally 19; current five leaves reviewed in L13). Capture only: magazine nominal versus loaded capacity (about 260), spot multipliers (40), collateral index (about 330). No source: caliber labels (62). | L12/L13 are closed; later text checks are L42, L50, L54 and L55. |
| L12 | **Equipment subset recorded - Comparison scope clarified** | [Source subsets retained](../../reference-data/provenance/frosty-2026-09-24-L12-equipment-selection-candidates.json): Equipment subsets are source facts, but site defaults intentionally use a bare-weapon baseline; the default-change candidate is withdrawn. | No default audit or capture needed. Reuse only to explain a specific observed stat difference. |
| L13 | **Burst recoil duration - Site operands supported** | [Reviewed five current override leaves](../../reference-data/provenance/frosty-2026-09-24-L13-burst-duration-bindings.json): All five current override leaves bind RecoilDuration add -0.0006 under BurstFireActive; both aim bases are 0.025. | Retain values; 0.0244 is conditional. Rank 9 capture or a new consumer must settle activation and composition. |
| L14 | **Single-fire configured cadence - Site behavior supported** | [Reviewed registry/raw check](../../reference-data/provenance/frosty-2026-09-24-L14-single-fire-cadence.json): Registry names RateOfFireForSingleFire; all 14 primary-single site RPMs match, including VSSM 450 versus main 800. | No base RPM correction. Rank 9 follow-up tests M4A1 single 400 versus auto 900; reopen source work for a selected override or consumer. |
| L15 | **Shooting recoil decay scale - Non-neutral omission hypothesis rejected in scope** | [Fresh raw verification](../../reference-data/provenance/frosty-2026-09-24-L15-neutral-shooting-recoil-scale.json): Both aim-state base values are 1 and captured Class_bb838ff6 operands are neutral; the missing direct consumer changes no number under these values. | Operator review: drop or document the unused neutral field below. Reopen mechanics only for non-unit selected values or a new consumer. |
| L16 | **M250 local bipod scaling - Exhausted within recorded scope** | [Raw review](../../reference-data/provenance/frosty-2026-09-24-L16-local-bipod-unmapped.json): M250 selected bipod has two raw 1.0375 operands; same-class hotfix controls do not establish their targets or operation. | No numeric change. Reopen with an independently typed target or consumer. |
| L17 | **Match Trigger indirect effects - Source finding; needs capture** | [Raw selected-path review](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json): HK433 selected chain binds bloom multiply 0, recoil exponent add 3 and recovery second-multiply 1.728. | Proposed M433 tested-mode effects below need semi/auto capture; selection does not prove native activation or composition. |
| L18 | **Buffer animation context - Exhausted within recorded scope** | [Raw registry review](../../reference-data/provenance/frosty-2026-09-24-L18-buffer-animation-context.json): Same-class registry context names canted-optic firing animation, but not Buffer's two 0.75 vectors or their operation. | No numeric proposal; optional visual capture cannot establish a coefficient. Reopen with typed vector mapping or a consumer. |
| L19 | **Controller recovery operand - Source finding; needs capture** | [Raw and named registry review](../../reference-data/provenance/frosty-2026-09-24-L19-controller-recovery-operand.json): Controller modifier has separate vertical recovery multiply 0.8836 in both aims; horizontal operands are neutral. | Rank 10 capture must test vertical recovery separately from amount; do not apply a common axis multiplier or assume decFactor identity. |
| L20 | **Pellet directions - Exhausted within recorded source scope** | [Reviewed selected-source trace](../../reference-data/provenance/frosty-2026-09-24-L20-pellet-direction-scope.json): Selected 185KSK standard/slug source trace does not identify a supported pellet-direction distribution. | Keep pellet statistics unavailable; rank 14 impact pilot or a typed consumer is needed. Empty unnamed arrays do not prove random-only behavior. |
| L21 | **Base recovery axes - Numeric omission hypothesis rejected in scope** | [Raw audit](../../reference-data/provenance/frosty-2026-09-24-L21-neutral-base-recovery-axes.json): Named vertical/horizontal base recovery multipliers are raw 1.0 in both aims on all 63 release roots. | No base correction; controller modifier remains L19. Reopen for a non-unit base or typed consumer. |
| L22 | **Projectile lifetime - Source finding; needs capture** | [Current direct GRX/raw check](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json): Direct registry/raw checks name TimeToLive: standard 0.5 and Slug 2.0 on selected 185KSK projectiles. | Conditional site cutoffs are 151.61/381.35 m, not native range limits. Rank 13 tests reachability before implementation. |
| L23 | **Base speed variation - Numeric omission hypothesis rejected in scope** | [Independent raw check](../../reference-data/provenance/frosty-2026-09-24-L23-neutral-speed-variation.json): Named Shot.InitialSpeedVariation is raw 0.0 on all 63 release primary roots. | No omitted nonzero base value. Reopen for a nonzero selected modifier/base or typed consumer. |
| L24 | **Match Trigger family - Shared source targets established; needs capture** | [Independent 24-WB/24-GS check](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json): All 24 selected Match Trigger WB/GS chains use the two reviewed effect imports; priorities differ. | Extends L17 coverage, not runtime proof. Capture activation/composition before any family-wide implementation. |
| L25 | **Selected projectile lifetimes - Conditional candidates; needs capture** | [Exact GUID/raw and unchanged-site function checks](../../reference-data/provenance/frosty-2026-09-24-L25-selected-projectile-lifetimes.json): Exact-GUID checks cover 64 site projectiles and 328 ammo selections; conditional expiry falls within 300 m for 12 shotgun and 20 subsonic choices. | Extends L22 rank 13 capture; CZ3A1 Subsonic has a useful conditional boundary near 262.3 m. Native expiry remains unresolved. |
| L26 | **Recovery-axis modifiers - Controller-only within recorded sample** | [Independent raw check](../../reference-data/provenance/frosty-2026-09-24-L26-controller-only-axis-sample.json): Both recovery axes/aims were raw-checked on 31 release modifiers; only the known controller vertical multiplier is non-neutral. | No additional proposal; L19 capture remains. Other classes and native activation are outside scope. |
| L27 | **Compact Handstop - Selected boolean; utility needs capture** | [Raw Ability/WB/shared-WPM check](../../reference-data/provenance/frosty-2026-09-24-L27-handstop-boolean-scope.json): Exact CZ3A1 Ability/WB/shared-WPM chain selects a true unnamed boolean versus false base; separate Burst selector is unrelated. | Rank 11 follow-up distinguishes continued sprint firing from sprint exit. Numeric tiers stay unchanged; description alone does not name the boolean. |
| L28 | **Subsonic compensation - Exhausted within recorded scope** | [Raw selected-chain check](../../reference-data/provenance/frosty-2026-09-24-L28-subsonic-compensation-scope.json): CZ3A1 Subsonic chain verifies velocity and base projectile identity; the SFX child resolves a Sound patch, not lifetime compensation. | L25 capture remains; unnamed fields and native compensation are unresolved. Reopen with a typed lifetime override or consumer. |
| L29 | **KS18K collection naming - Direct registry route exhausted in scope** | [Current raw root/dispersion-group check](../../reference-data/provenance/frosty-2026-09-24-L29-dispersion-registry-scope.json): Direct registry child/hash arrays name neither b30a73ed nor control collection 2ffeb6ac; a named camera scalar passes the raw control. | The direct child/hash-array lookup that recovered L22's omitted name was also tried here without resolving the target. Keep tier 0; reopen with a new named association or consumer. |
| L30 | **Handstop owner-registry naming - Exhausted within recorded scope** | [Current raw check](../../reference-data/provenance/frosty-2026-09-24-L30-handstop-registry-scope.json): Both WB owner anchors and linked groups resolve, but no name pairs with 18774676 and root pair arrays are empty. | L27 meaning and utility capture remain open. Reopen with a new named association; do not repeat the same owner/name search. |
| L31 | **Indirect fire-mode mask candidate - Source scope exhausted; needs capture** | [Raw records and independent VSSM control](../../reference-data/provenance/frosty-2026-09-24-L31-fire-mode-mask-candidate.json): Match Trigger 1 and Burst 8 fit an SDK fire-mode-mask class shape; VSSM instead binds its selector directly in GS. | No independent class identity, value-4 control or native mask rule. Retain L17 capture; reopen with typed identity or consumer. |
| L32 | **Shooter-velocity inheritance - Source routes exhausted; needs capture** | [Direct registry and candidate-structure checks](../../reference-data/provenance/frosty-2026-09-24-L32-inherited-velocity-scope.json): BREN3 Shot names do not identify inheritance; the SDK shape candidate supplies no independently named target. | Keep stationary launch; rank 15 compares stationary and opposite strafes. Reopen with independent member identity or consumer. |
| L33 | **Non-polar base outlier - Hypothesis rejected in current scope** | [Independent raw check](../../reference-data/provenance/frosty-2026-09-24-L33-polar-recoil-build-separated.json): UsePolarRecoil is raw true in both aims on every mapped release GS root, including BREN3; hotfix control remains separate. | No non-polar outlier or native equation proved. Reopen with a selected false override or consumer; site cleanup review below. |
| L34 | **Projectile spawn delay - Nonzero base omission hypothesis rejected** | [Raw primary-field check](../../reference-data/provenance/frosty-2026-09-24-L34-neutral-spawn-delay.json): Named SpawnDelay is raw float32 zero on all 63 release primary roots. | No base flight-delay term proposed. Reopen for a nonzero selected context or consumer; native time origin remains unresolved. |
| L35 | **LMG heat configuration - Capture optional / low value** | [Raw source check](../../reference-data/provenance/frosty-2026-09-24-L35-lmg-heat-source-scope.json): M250/M60E6/Minimi HeatPerBullet is 0; DRS-IAR has 0.0025, drop 0.2, threshold 1, delay 0 and penalty 0. | Simple additive/continuous-cooling model: 0.0025 * 771.428 / 60 = 0.03214 heat/s < 0.2 drop; zero penalty supplies no timed lockout, and no-cooling threshold takes about 400 shots. Native behavior is unresolved; prioritize capture only with source evidence of paused cooling or another penalty mechanism. |
| L36 | **Primary heat scope - Hypothesis rejected in scope** | [Raw 63-root scan](../../reference-data/provenance/frosty-2026-09-24-L36-primary-heat-scope.json): only DRS-IAR has nonzero HeatPerBullet; conditional gain 0.03214/s is below cooling 0.2/s, penalty is 0, and 60 rounds add only 0.15 without cooling against threshold 1. | No base heat gate proposed; native behavior remains unresolved. Reopen with paused cooling, another penalty mechanism, or a selected heat modifier that can affect site cadence. |
| L37 | **Loaded magazine capacity - source rule unresolved** | [Five-object raw check](../../reference-data/provenance/frosty-2026-09-24-L37-configured-magazine-counts.json) confirms configured pilot counts and `InitialAmmo=-1` on three base WBs. | Neither supplies a native chamber/loading rule; retain the existing capture pilot and reopen on a typed rule or controlled observation. |
| L38 | **Selected spotting operands - branch unresolved** | [Targeted raw recheck](../../reference-data/provenance/frosty-2026-09-24-L38-spotting-candidates.json) confirms ordinary/SP-prefixed 0.14/0.1 candidates for the four previously mapped suppressor choices. | Conditional 21/15 m arithmetic supports existing rank 1; no site replacement or new capture proposed without activation evidence. |
| L39 | **Release-to-hotfix site fields - three bodies unchanged** | [Fresh paired capture](../../reference-data/provenance/frosty-2026-09-24-L39-paired-build-raw.json) finds identical KORD 6P67 GS/WB/PD bytes across Heads 4892017 and 4892087. | Other weapons, selected modifiers and native behavior remain outside scope; reopen on a changed site-used hash or concrete gameplay difference. |
| L40 | **Collateral index selection - no new route** | [Prior-evidence review](../../reference-data/provenance/frosty-2026-09-24-L40-collateral-route-review.json) adds no native table-selection link; the operator-confirmed clamp remains separate. | Reopen on a typed link to the selected table/delegate or a discriminating capture; no new capture added. |
| L41 | **VSSM selected operands - source matched** | [Exact selector and raw fields](../../reference-data/provenance/frosty-2026-09-24-L41-vssm-selected-operands.json) support the existing dispersion, variation and recovery values, including factor 76/exponent 1.24 in both aim states. | Keep the native recovery assumption and layout warning; no new capture, and reopen on build divergence or controlled runtime evidence. |
| L42 | **Caliber description text - corroborated** | [Raw references and localized text](../../reference-data/provenance/frosty-2026-09-24-L42-caliber-text.json) support SOR-300SC `.300 BLK` and M45A1 `.45 ACP` label wording. | No typed caliber or mechanics claim; no capture needed, and reopen on a typed source or changed text. |
| L43 | **Ballistic calculation consistency - Checked** | [Comparison](../../reference-data/provenance/frosty-2026-09-24-L43-ballistic-consistency.json): 328 selections; scalar/vector time differs by at most 0.00389 ms within TTK charts and 2.786 ms at 300 m. | Distinct model assumptions, not native validation; no change or new capture. Reopen if the supported ranges or equations change. |
| L44 | **Nonlinear recoil integration - Checked** | [Raw inputs and numerical comparison](../../reference-data/provenance/frosty-2026-09-24-L44-recoil-integration.json): 64 fields, 16 aim groups; maximum one-interval error 0.002474 degrees and bounded scalar-sequence error 0.007623 degrees. | No change or new capture; proxy is not a full pattern or native validation. Reopen if inputs, equations or display precision change. |
| L45 | **Spread summary - Fixed 24 September** | [Raw inputs and model check](../../reference-data/provenance/frosty-2026-09-24-L45-spread-summary.json): DB-12 hip summary shows 1.44 degrees maximum, but its shot-2 tooltip shows 1.95 degrees. | Site now reports the peak pre-shot value; no new capture. Native equations remain unresolved. |
| L46 | **Build-change screen - No candidate in sample** | [Reproducible catalog comparison](../../reference-data/provenance/frosty-2026-09-24-L46-site-route-build-screen.json): 534 site-linked routes have equal asset-record SHA1/size/GUID across the two recorded builds. | Catalog evidence only; no new raw trace or capture. Reopen on a changed site-used route or a concrete discrepancy outside this sample. |
| L47 | **M39 EMR spotting chain - Exact import verified** | [Three raw-backed assertions](../../reference-data/provenance/frosty-2026-09-24-L47-selected-spotting-chain.json) link the WB import through the selector-matching SP wrapper to its recorded WME target. | Strengthens one prior association, not native activation or unique effective selection; keep the site factor and existing rank-1 capture. |
| L48 | **Loading fields - Meaning unresolved** | [Raw contrast](../../reference-data/provenance/frosty-2026-09-24-L48-loading-fields.json): unnamed ammo integer is 2 on DB12, 99 on M1014/M87A1, and -1 on three controls; named reload fields add no loaded-state rule. | Do not call it chamber count. Keep the existing magazine pilot; reopen with a name, consumer or relevant selected override. |
| L49 | **Spotting package context - No mode discriminator** | [Exact M39 source check](../../reference-data/provenance/frosty-2026-09-24-L49-spotting-package-context.json): ordinary and SP wrappers are both listed with the same selector; opaque metadata does not name an activation rule. | Keep the existing spotting test and site factor. Reopen with a named condition or evaluation trace; list membership is not eligibility. |
| L50 | **Shotgun caliber suffix - Operator review** | [M87A1 source choices](../../reference-data/provenance/frosty-2026-09-24-L50-shotgun-caliber-label.json) distinguish #01 Buckshot and #00 Buck; its fixed `cal` suffix says 00 Buck. | Consider removing that suffix; no direct current consumer found. No physical-size, typed-gauge or native-default claim; no new capture. |
| L51 | **Damage triage - Intended display** | [Review](../../reference-data/provenance/frosty-2026-09-24-L51-damage-triage.json): the 100-damage plot cap and uncapped underlying values are documented product behavior. | No calculation correction or capture; reopen only for a concrete defect or changed display requirement. |
| L52 | **Handling triage - Duplicate result** | [Review](../../reference-data/provenance/frosty-2026-09-24-L52-handling-triage.json): the M121 A2 50 Fast 5.550/5.546 s contrast is already documented in the magazine review. | No new finding or capture; reopen only with selection/consumer evidence. |
| L53 | **Zeroing bracket - Fixed 24 September** | [Raw inputs and 50-case check](../../reference-data/provenance/frosty-2026-09-24-L53-zeroing-bracket.json): VSSM Penetration/Frangible at 500 m zero returns null; the display substitutes zero instead of the same model's +10.73 m at 100 m. | Site bracket widened and unsolved zeros shown as unavailable. No new capture; native zeroing remains unresolved. |
| L54 | **Vz. 61 caliber text - Source wording verified** | [Exact metadata chain](../../reference-data/provenance/frosty-2026-09-24-L54-sidearm-caliber-text.json) says `.32 ACP`; the stored label is `7.65×17mm`. | Alternative source-backed wording for operator review; this text does not prove alias equivalence or an incorrect stored value. No capture. |
| L55 | **Rifle caliber text - Partial support** | [Raw text chains](../../reference-data/provenance/frosty-2026-09-24-L55-rifle-caliber-text.json) give M39 `7.62x51mm`, SVK `8.6x70mm`, and Interdictor `10.4x83mm`; two other exact StringIds lack retained English text. | Named aliases and NATO suffix remain unsupported by these texts. Source wording is an operator-review option; no capture. |
| L56 | **Full recoil-path precision** | Closed: reset ADS M87A1/DB-12 maximum pre-shot errors 0.006992°/0.009645° under the same assumed equation; [receipt](../../reference-data/provenance/frosty-2026-09-24-L56-full-recoil-path.json). | Two loadouts, seed 0, no impulse overlap; reopen for changed integration/loadout or native equation evidence. |
| L57 | **Muzzle build screen - No candidate** | [Nine additional operand routes](../../reference-data/provenance/frosty-2026-09-24-L57-muzzle-build-screen.json) have equal nonzero catalog SHA1, size and GUID across the recorded builds. | Catalog evidence only; no new raw capture. Reopen on a changed record or concrete field discrepancy. |
| L58 | **Remaining primary caliber text** | Closed: 39 descriptions screened; 12 exact text candidates raw-verified, including partial UMG-40 wording; [receipt](../../reference-data/provenance/frosty-2026-09-24-L58-remaining-caliber-text.json). | No label equivalence or mechanics claim; reopen for new localization or typed cartridge evidence. |
| L59 | **A3 Receiver and burst recoil tiers - Sourced** | [34 leaves matched](../../reference-data/provenance/frosty-2026-09-24-L59-ergo-recoil-tiers.json): A3 `GRM_Recoil_ERG_M10` amount −1; burst effects under `BurstFireActive` give variation +3 and amount sums 0 / +1 (GRT-BC). | No change. Sums assume additive composition; activation unresolved. |
| L60 | **Reverse coverage - Complete, no new effect** | [ERGOS, GRIPS, MUZZLES, LASERS, magazines](../../reference-data/provenance/frosty-2026-09-24-L60-reverse-coverage.json) and [sights, barrels, lights, ammo](../../reference-data/provenance/frosty-2026-09-25-L60-reverse-coverage-remaining.json): every selected recoil/bloom/dispersion effect is modeled or known (bipod step L61, idle state A16, camera recoil). Mini Scout lights bind two identical hip modifiers; no displayed change. | None. Reopen on a changed binding or a new site consumer (idle recovery, camera recoil). |
| L61 | **Bipod hip dispersion - Consistent with game** | [Assets differ only in `Field_b574fa40`](../../reference-data/provenance/frosty-2026-09-24-L61-bipod-hip-dispersion.json); EF88 panels show lasers change Hipfire but bipods/grip pods do not. | No change; deployed behavior stays with W1. |
| L62 | **Reverse coverage of handling, velocity and sway - Complete; two sight candidates** | [WME/GID sweep of all slots](../../reference-data/provenance/frosty-2026-09-25-L62-reverse-coverage-handling.json): grips, muzzles, barrels, ergos, magazines and ammo agree. Sights: var_high/thermal ADS move −1 and iron-sight sway ×0.667 are category-wide and unmodeled. GS-only barrel ADS index on EF88/BROD3 Extended joins W2. | Operator review of the two sight proposals; panel capture in the plan's L62 follow-up. |
| L63 | **VSSM default semi hip bloom - Source candidate; needs capture** | [Key census and raw decode](../../reference-data/provenance/frosty-2026-09-25-L63-vssm-semi-bloom.json): `GS_VSSM` binds `GBM_NoIncrease_Semi_P00` (IncreasePerShot ×0) to `CMU_SemiAuto` (mask 1). VSSM is the only site weapon whose default mode is semi that binds it; the site keeps 0.398° hip bloom (peak 3.679° vs 1.804°). | Capture: plan's L63 follow-up (bare VSSM hip taps, Folding Stock control). The same key confounds the L17 semi bloom comparison. |
| L64 | **Legacy WB parts - No effect established** | [WB part census and legacy trace](../../reference-data/provenance/frosty-2026-09-25-L64-legacy-wb-parts.json): KORD 6P67 and M250 blueprints import KingstonLegacy parts; `WM_Foregrip` is keyed to current Classic Vertical, but its two effect classes occur in no current asset. | None; reopen with a consumer for `Class_d209d775`/`Class_be3e57cd`. |
| L65 | **Optic Accessory slot - In progress** | Source has an unmodeled `SCA_` slot, labeled "Optic Accessory" in game (operator, 25 September): CantedIronSights (57 weapons), CantedReflex (55), OffsetRedDot "Piggyback Reflex" (57), G43Magnifier (53), SecondarySight (44), Variable 2x/3x/4x (12), AGCoating (6 snipers). Traced effects so far: GCR camera recoil, `WME_DynamicPivot` on canted irons, `WME_HighZoom_Magnifier_P00`. 263 of 285 dependency rules involve these choices. | Names, costs, availability and effect operands per choice; decide slot model. |
| L66 | **Scope glint visibility - In progress** | [Glint trace](../../reference-data/provenance/frosty-optic-glint-reviewed-2026-09-23.json): M2010 iron sights select `WPM_NoScopeGlint` → `WeaponLensFlareData_NoFlare`. Distance, angle and zoom dependence of the default flare are untraced. | Lens-flare data per optic/weapon and any distance/angle/ADS fields. |
| L67 | **Sniper Decoy anti-glint - In progress** | Same trace: `WPM_DecoyNoScopeGlint` (priority 999) → NoFlare, gated by `U_DecoyNoGlint`, applied by `Affector_DecoyAntiGlint` (hotfix capture). | Affector conditions: owner, radius, duration, deployed state. |
| L68 | **Selected damage modifiers outside ammo - In progress (Astra, 2026-09-26)** | The site takes damage curves, pellet counts and hit-zone selection from the base weapon and ammo. L60/L62 checked other effect families. Scope: M433, DB-12, Interdictor and VSSM selected non-ammo attachments only. | Trace selected WB/GS routes for projectile, damage and protection-index effects. Reproduce DB-12 Slug projectile/pellet selection and a named protection-step ammo control first; do not infer absence from names alone. |
| L69 | **Crouch/prone spread inputs - Scoped source candidate; proposal only (26 Sep)** | [Accepted source receipt](../../reference-data/provenance/frosty-2026-09-26-L69-posture-spread.json): for bare M433/HK433, M39 EMR/M39EMR and DB-12/DP12, six selected HDA/ZDA rows resolve to audited rows. Thirty-three raw words pass; hip standing/moving and ADS-moving minima reproduce the site. Posture labels use the named Sym crosswalk; equal numbers alone do not establish posture. | The site exposes standing/moving only. Optional crouch/prone posture is an omitted-feature proposal; keep current standing values. H1, native activation/composition, posture maxima and stationary ADS posture inputs remain unresolved. DB-12 pellet-direction statistics remain unavailable. |
| L70 | **Existing M433 Match Trigger recoil capture pilot - In progress (Astra, 2026-09-26)** | The 25 September paired semi-auto videos add evidence after L17's source trace. Their bloom cannot isolate Match Trigger; recoil was not measured. Only three trigger shots are reported after the recorder stall. | First reproduce the recorded shot timing and stable-frame controls. Check whether world-image motion can distinguish the conditional 0.843908625 recoil ratio; stop at a quantified capture limit if input motion or sampling prevents it. |
| L71 | **M4A1 underbarrel HE/AT projectile profiles - In progress (Astra, 2026-09-26)** | Prior work linked underbarrel secondary selectors to firing parts, but did not establish a numeric damage/trajectory profile for the site. Scope: M4A1 M320 HE and AT paths only, without class-trait selectors. | Reproduce the recorded parent-action/firing join and a named primary-projectile control. Trace the two selected projectile bodies for launch, gravity, direct damage and blast operands; keep selection precedence, arming and runtime damage composition unresolved. |
| L72 | **DB-12 pellet-count field identity - In progress (Astra, 2026-09-26)** | L68 controls verified Slug projectile selection and unnamed `Field_db0fcea2=1`. The same field hash holds 16 in the base primary firing block; numeric agreement alone does not identify an override. Scope: DB-12 base, Slug and #00 Buck only. | Test direct GRX child/hash naming for this field, using named `DamageProtectionMultiplierIndex=0` as control. Preserve raw counts and exact selected routes; do not revisit pellet directions or infer an operator from matching values. |

## Proposed Analyzer changes

These proposals come from completed source work. They need product review and
operator approval; none is implemented unless stated.

| Proposal | Affected data/code | Evidence and remaining validation |
|---|---|---|
| Sight ADS move speed (L62) | `data/attachments.json` SIGHTS var_high/thermal `adsMoveSpeedTierShift`; `sim/applyAttachments.js` ADS-move index | **Applied and confirmed 25 September:** var_high/thermal `adsMoveSpeedTierShift: 1`; M4A1 menu 0.82 → 0.75, Mobility −2. Every var_high and thermal optic on 56 weapons imports `WME_ADSMoveSpeed_M05` (−1 tier). Candidate: site shift +1 (the negated convention), for example AK205 ADS move 0.67 → 0.60 and Mobility −2. [Evidence](../../reference-data/provenance/frosty-2026-09-25-L62-reverse-coverage-handling.json). A menu Mobility capture can confirm it cheaply. |
| Iron-sight sway (L62) | `data/attachments.json` SIGHTS; `sim/applyAttachments.js` weapon sway; sway display | **Applied and confirmed 25 September:** `SIGHTS[iron].weaponSwayMultByWeapon` ×0.6666667 on 56 weapons; M4A1 recordings ratio 0.67; BROD 3 is bug 16. Iron sights on 56 weapons import `WPM_Sway_IronSights_P05` (weapon and camera sway ×0.666667); optics import no sway WME. With iron as the default sight, optics would show +50% weapon sway. Needs a sway measurement; the menu shows no sway value. |
| VSSM semi-auto hip bloom (L63) | `data/weapons.json` vssm `spreadDyn.hip.inc`, or a semi-mode rule in `sim/applyAttachments.js` | **Rejected by capture 25 September:** the bare VSSM hip reticle widens 68 → 121 px over 10 shots, so the semi condition is not active in its default mode; keep 0.398. The bare M433 in manually selected semi shows no bloom, so the condition does act after a mode switch, which matters for any future selectable single-fire mode (L14) on the 39 other bound weapons. [Source](../../reference-data/provenance/frosty-2026-09-25-L63-vssm-semi-bloom.json); [capture](../../reference-data/provenance/frosty-2026-09-25-L63-L17-semi-bloom-captures.json). |
| Zeroing solver and unavailable state (L53) | `sim/ballistics.js` and `ui/app.js` target projection | **Applied 24 September:** the launch-angle bracket widens up to 45° (VSSM Penetration/Frangible at 500 m zero now solve), and an unsolved zero shows "drop unavailable" instead of 0 m. [Receipt](../../reference-data/provenance/frosty-2026-09-24-L53-zeroing-bracket.json). No native-equation change. |
| **Operator review: source caliber wording (L54/L55)** | `data/weapons.json` caliber metadata | Exact text supplies vz. 61 `.32 ACP`, M39 `7.62x51mm`, SVK `8.6x70mm`, and Interdictor `10.4x83mm`. These are wording options, not proof that stored aliases are wrong; no current direct consumer was found in L50. |
| **Operator review: M87A1 caliber metadata** | `data/weapons.json` M87A1 `cal` | L50 supports removing fixed `(00 Buck)` from the stored label; selectable #01/#00 names are distinct. No direct current consumer found; remaining gauge text and other weapons need separate source support. |
| Neutral shooting decay field (L15) - operator review | `data/weapons.json` `recoil.{ads,hip}.shootingDecScale`; `sim/core.js` | All 126 stored values are 1 and core has no reader, consistent with [L15](../../reference-data/provenance/frosty-2026-09-24-L15-neutral-shooting-recoil-scale.json). Either remove the unused field or retain it as documented-neutral; no numeric change proposed and no site edit made. |
| Non-polar cleanup check (L33) - operator review | `data/`, `sim/`, `ui/`; `sim/core.js:genRecoilPts` | No polar/non-polar flag or alternate branch found by scoped search and recoil-path inspection; core already resolves direction/magnitude through sine/cosine. [L33](../../reference-data/provenance/frosty-2026-09-24-L33-polar-recoil-build-separated.json) supports no current outlier, but does not prove the native equation; no removable site branch identified or changed. |
| Compact Handstop utility indication (L27) | `GRIPS[id=cmpct_handstop].noEffect`; attachment effects display | **Applied 25 September:** Fire while Sprinting utility chip; no numeric change. Current direct numeric tiers are neutral and choice is dimmed. Exact CZ3A1 shared WPM has a true unnamed boolean; description suggests sprint firing. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L27-handstop-boolean-scope.json). Needs controlled sprint-fire capture before a gameplay claim; no numeric recoil or general sprint-recovery change proposed. |
| Spread cycle maximum (L45) | `sim/core.js` `effectiveSpreadMax`; `ui/app.js` spread summary | **Applied 24 September:** the summary uses the peak pre-shot value; DB-12 hip standing now reads 1.953° to match its shot-2 tooltip. [Receipt](../../reference-data/provenance/frosty-2026-09-24-L45-spread-summary.json). No native-equation change. |
| Crouch/prone spread posture (L69) | `ui/app.js` stance control; `sim/core.js` `spreadBounds`; per-weapon spread inputs | **Operator review: optional posture dimension.** The selected source rows contain crouch/prone minima outside the current standing/moving choice for M433, M39 EMR and DB-12. Keep current standing values. Posture labels use the named Sym crosswalk; native activation, composition, posture maxima and stationary ADS inputs remain unresolved. Needs operator review and native state evidence before implementation. [Evidence](../../reference-data/provenance/frosty-2026-09-26-L69-posture-spread.json). |
| Projectile lifetime and reachability (L22) | `data/ballistics.json` projectile fields; `sim/ballistics.js`; dependent travel/damage display | Current integration guard is not source lifetime. Selected buck/Slug TimeToLive 0.5/2.0 could affect reach within supported range. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json). [L25](../../reference-data/provenance/frosty-2026-09-24-L25-selected-projectile-lifetimes.json) adds subsonic candidates using actual ammo velocity. Needs capture before implementation; show unreachable separately from conditional damage, do not assume zero damage. |
| Match Trigger in an explicit tested mode (L17) | `ERGOS[id=match_trigger]`, `sim/applyAttachments.js`, recoil/spread calculations | Current choice has no modeled effects. HK433 source selects amount-exponent +3, recovery operand 1.728 and bloom multiplier 0. Candidate M433 model predicts recoil ratio 0.843908625 and recovery factor 124.416 from current inputs; conditional only. [Evidence](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json). [L24](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json) confirms shared source targets on all 24 selections, with differing priorities. Needs semi/auto capture and operator/activation validation; no blanket runtime change. |
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
| Utility indicator for MagFlare reload-while-ADS | `data/attachments.json`, `ui/loadout.js` | **Applied 25 September:** Reload in ADS utility chip. No reload-speed operand found. |
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
