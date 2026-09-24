# Frosty research queue

[Research index](../frosty/README.md) · [Open questions](../frosty/OPEN_QUESTIONS.md)

## Objective and limits

Find and verify the Frosty source behind the Weapon Analyzer's numbers. Prioritize
site values that are wrong, assumed or based on screenshots, then missing mechanics
that could change displayed stats. Cover multiplayer weapons, attachments, optics
and soldier mechanics. Check maps and modes only for overrides to those mechanics.
Exclude only supported cosmetic, single-player-only and battle-royale-only content.

Work from `data/*.json` and constants or assumed equations in `sim/*.js` outward.
Compare source and site values across all 63 site weapons, with KSG as a reference.
Record source paths, per-weapon variance, mismatches and precise blockers. Follow a
dependency only when it can affect an Analyzer value; catalog coverage is supporting
evidence. Research tools, evidence and docs only: no production changes, commits,
publication or game-process changes. Preserve prior evidence and build boundaries.
Source presence does not establish runtime use.

## Current handoff (23 September 2026)

The site-focused source review has reached its stated completion condition for
the pinned current inventory: every input is sourced, has a mismatch proposal,
or has a precise source/runtime blocker. Software-only fields and metadata remain
explicitly accounted for. This is not a claim that every native mechanic is proved.
The earlier capture/index checkpoint remains valid. Do not repeat completed
captures or continue broad dependency expansion.

### Site input review

The [current input inventory](../../reference-data/provenance/frosty-site-input-inventory-v3-2026-09-23.json)
records 65,266 leaves or empty containers from all 11 top-level data JSON files,
plus 1,582 nonblank, non-comment simulation code lines from all 10 modules. It retains exact
JSON pointers, values, file hashes and the complete 63-weapon identity crosswalk.
Large details are outside the repository. The [simulation review](../../reference-data/provenance/frosty-site-sim-code-review-2026-09-23.json)
classifies all 1,582 code lines, including 347 numeric candidate lines and 520
numeric tokens. Its [equation receipt](../../reference-data/provenance/frosty-site-equations-2026-09-23.json)
keeps native equations and runtime limits explicit. Metadata and inactive reference
values remain distinct from gameplay inputs.

The earlier 65,258-row snapshot is retained. The current snapshot includes the
approved SOR-300SC and GRT-CPS empty-reload corrections (3.2 and 3.034 seconds)
and eight new provenance leaves. The
[capture receipt review](../../reference-data/provenance/frosty-site-reload-capture-review-2026-09-23.json)
verifies all four video hashes, recorded timestamp arithmetic and medians; it
does not claim an independent annotation of the muzzle flashes. Its fresh rerun
of the supplied site/source regression covers 52 field names and 3,391 comparisons.
Direct reload scalar differences must be evaluated after the ReloadSpeed division.

Build labels remain tied to archive and executable identity. Head 4892017 is
1.4.3.0. Head 4892087 (executable `95c61904…`, descriptors `99b49cfd…`) is now
labeled 1.4.3.1 from the user-supplied EA 18 September roundup reference. The
`builds/1.4.3.0` directory is unchanged. The reload recordings and their two site
provenance entries use 1.4.3.1; raw receipts from Head 4892017 retain 1.4.3.0.

- [Spread](../../reference-data/provenance/frosty-site-spread-reviewed-2026-09-23.json):
  3,276 source/site comparisons agree across all 63 weapons. Descriptor-offset
  checks cover 4,096 raw words in 64 GS bodies. Recovery-state semantics remain open.
- [Precision](../../reference-data/provenance/frosty-site-precision-2026-09-23.json):
  all 39,946 current base/row values agree with the captured settings objects.
  Native row selection and the retained multi-scalar weapon associations keep
  their existing limits.
- [Recoil](../../reference-data/provenance/frosty-site-recoil-2026-09-23.json):
  756 recovery-input comparisons agree. Descriptor offsets verify 3,964 selected
  scalar fields across 64 GS roots. Spring and recoil-bound outliers, neutral
  pattern fields and competing numerical predictions remain separate from native
  model proof.
- [Zeroing](../../reference-data/provenance/frosty-site-zeroing-2026-09-23.json):
  all 63 list pointers and exact weapon identities are checked. The 12 selectable
  lists match the site options. Default selection and the 51 single-value lists'
  possible fixed-zero behavior need the rank-7 capture. Source and bore-relative
  predictions are recorded; no production change is proposed without that evidence.
- The [final review ledger](../../reference-data/provenance/frosty-site-input-review-final-v2-2026-09-23.json)
  accounts for all 65,266 inventory pointers, with zero pending review rows.
  It records 57,891 sourced configuration rows, 4,403 sourced UI rows, eight
  mismatch/proposal rows, 748 precise source blockers and 428 source/model
  candidates with explicit blockers and next steps. Other rows describe software
  contracts, identity, metadata, retained observations or unused fields; they are
  not counted as proven game mechanics. These are leaf counts, not independent
  mechanic counts.
- The [independent validation](../../reference-data/provenance/frosty-site-input-review-validation-2026-09-23.json)
  checks all current pointer/value pairs, 121 report/detail hash pins and all
  1,582 reviewed simulation code lines. It finds no duplicate/missing input
  pointers or value differences. The 318 other nonblank simulation lines are
  comments. All 21 data/simulation file hashes still match the input inventory.
  Raw follow-up checks cover the ADS Bolt, ergonomic attachment, heavy-barrel
  and SGX findings. Field presence remains separate from native consumption.

The [ADS Bolt cadence supplement](../../reference-data/provenance/frosty-site-ads-bolt-cadence-2026-09-23.json)
checks all six bolt rifles and the four exact DLC Bolt choices. The current site
does not model this attachment's scoped cadence. The proposed model separates the
next accepted shot from the next fully-ADS shot; ADS exit, bolting and ADS entry
must not be summed until their overlap is measured. The zoom completion fraction
and Recon's separate timing selector have distinct predictions in capture rank 6.
ADS-out time is unknown; IDA is not assigned that meaning.

The [SGX sway lineage](../../reference-data/provenance/frosty-site-sgx-sway-lineage-2026-09-23.json)
identifies a likely stale Light Suppressor override: the exact ConditionalExtended
selector links the local `0.975282` factor to CQB and Long Suppressors. Propose moving
Light's override to CQB, subject to the stated native activation limit. Long's
`1.462923` is consistent with `0.975282 × 1.5`. Rank 8 now gives paired predictions.

Preserve KS18K Slim Angled's moving-ADS value of zero. Its named GDM modifier is
in a different GS collection (`Field_b30a73ed`, not `Field_2ffeb6ac`), and the
existing twelve indicator captures support the retained value. Do not turn a
filename match into a moving-ADS mismatch. See the
[owning attachment topic](../frosty/ATTACHMENTS.md#weapon-attributes-attachment-tracing-21-september-2026).

The [Sym reproduction](../../reference-data/provenance/frosty-site-sym-reproduction-2026-09-23.json)
pins the full 327,287-byte Sym 1.4.2.0 snapshot (SHA-256 `3a04f167…364b9`).
A fresh cache and rerun reproduce both supplied result JSONs exactly: 48 matched
fields, 55 near-constant fields, six ambiguous fields and 13 without a retained
WB/GS candidate. All 48 codes were already named. The matcher keeps the first
object per class/path/weapon; its refinement does not disambiguate moving/base
copies. These are candidate classifications, not proof of absence or runtime use.
The separate reusable regression script includes numeric array leaves and all
object candidates, so its 150-field result has a different denominator. Keep
Sym 1.4.2.0 separate from current 1.4.3.0 source evidence.

The [shared-table check](../../reference-data/provenance/frosty-site-constants-2026-09-23.json)
uses serialized HDA/ZDA row references and exact GS selectors. All nine named
spread minima and both DTA draw timings agree with Sym for 63/63 weapons each.
H1's state label and native table consumption remain open. The
[timing comparison](../../reference-data/provenance/frosty-site-timing-2026-09-23.json)
reproduces the six site bolt-rifle RPM values from the primary cycle block.
Secondary-block selection and completion fractions remain unresolved. Reload
time divided by ReloadSpeed matches the site, with delay composition for the
three shell-fed shotguns. The four recorded empty reloads support stored time
plus one fire interval for last-shot-to-next-shot predictions under their tested
conditions; do not extend that runtime result to every weapon or reload mode.

The [final timing leaves](../../reference-data/provenance/frosty-site-timing-leaves-final-2026-09-23.json)
record the corrected reload formulas and burst candidates. Six Burst Training
options have no site burst-rate value, so the simulator currently adds no pause
between bursts. Rank 9 now includes exact per-weapon cadence predictions. The
second bolt-action block shares the exact `WM_ReconTrait` selector; native trait
activation, inheritance and timing composition remain open.

The [ammo effect audit](../../reference-data/provenance/frosty-site-ammo-effects-2026-09-23.json)
checks 83 fields through 337 per-selection comparisons. All match. Its 77 shared
collateral fallbacks are inactive behind all 328 current per-weapon overrides.
The [subsonic velocity audit](../../reference-data/provenance/frosty-site-ammo-velocity-2026-09-23.json)
provides fractional source candidates for five integer menu transcriptions:
M417 A2 273.599203 versus 273, PW7A2 341.567997 versus 341, and USG-90
265.293513 versus 265 m/s. The integers match truncation; propose preserving source
precision without claiming the menu is wrong or native composition is established.

The [muzzle operand audit](../../reference-data/provenance/frosty-site-muzzle-operands-2026-09-23.json)
checks 172 leaves. It retains four source blockers: PP-19 Flash Comp's two recovery
multipliers and duration override, plus L115 Standard Suppressor's hip-spread tier.
Exact selected WB/GS graphs do not supply the site's assumed effects. Paired
recording predictions are in the capture plan; this does not prove native absence.

The [ADS comparison](../../reference-data/provenance/frosty-site-ads-2026-09-23.json)
records all 63 actual site defaults. Interdictor's Basic barrel already shifts its
500 ms base to 433.334 ms. Full Angled and Slim Angled both produce 366.667 ms in
the site; Slim Angled has two source selector bindings whose native composition
is unresolved. The [spotting comparison](../../reference-data/provenance/frosty-site-spotting-2026-09-23.json)
checks 1,214 choices and preserves four exact suppressor candidates for a 15 m
versus 21 m capture. VSSM's actual default is 0/9 m, not the neutral 54/150 m base.

AZTT Main and Alt provide a source timing candidate for the eight ADS tiers:
`Field_a89997ad * 1000 + two 60 Hz frames` matches within 0.000342 ms. The field
meaning and frame offset remain unresolved. SSA sprint rows match directly after
unit conversion, with exact selectors for all 63 weapons. These results do not
change the preserved IDA minus-one-frame comparison or prove idle recovery use.

The [projectile review](../../reference-data/provenance/frosty-site-projectile-2026-09-23.json)
checks 64 PD assets, 63 base curves and 328 ammo selections. It reproduces all
drag/gravity pairs; 41 assets have differing separately referenced health and
tweakable curves. Do not call these two copies of one curve object. M45A1's source/site
curve difference is the known gameplay-supported step. Keep that adjustment;
current-build revalidation can test it without treating raw interpolation as proof.
The [tooltip reproduction](../../reference-data/provenance/frosty-site-tooltips-2026-09-23.json)
matches all current values and verifies 1,003 descriptor XML hashes plus the
English string export. Eighteen exact choices still use screenshot descriptions
because their bound English IDs are absent or conflicting. Identical text at
other IDs is recorded as a lead, not a replacement binding.

- Latest [phase 1 checkpoint](../../reference-data/provenance/frosty-audit-phase1-checkpoint-2026-09-23.json):
  19,746 cosmetic and 19 single-player exclusions; 29,520 weapon-namespace,
  2,857 related-namespace and 16,512 dependency candidates. All 48,889 candidates
  have raw captures and decode results; no effective-catalog dependency target is missing.
  Whole-asset semantic review and graph closure remain open. Current source work
  has joined all 135 underbarrel actions to parent WB parts; native application
  remains open. The complete candidate package census is saved; its SP-only
  candidates and remaining skin-wrapper roles still need scope review. The [underbarrel receipt](../../reference-data/provenance/frosty-audit-underbarrel-parts-2026-09-23.json)
  records the exact selectors, firing references and limits.
- Layers 5–13 added 5,298 hash-checked raw bodies. The ledger now has 70,137
  captures. Eight candidate import GUIDs are absent from the effective catalog;
  the two boxed values in `WorldIconTrackingQueryGraph` now have validated layouts.
  Resume with the v5 ledger; earlier ledgers remain available.
- The cache has 1,014 skipped duplicate-GUID records, all with different catalog
  SHA1 values from their selected peers. The effective catalog omits their paths.
  Selected-record scope does not automatically apply to alternate payloads. A
  separate extraction pilot is verified below. The catalog hash comparison alone
  does not establish raw differences or native selection.
- The [duplicate extraction pilot](../../reference-data/provenance/frosty-audit-cache-variant-pilot-2026-09-23.json)
  now verifies three selected controls and three alternate raw bodies. The skipped
  extended-magazine record adds an exact `WME_DynamicPivot_M10` reference; the SVDM
  customization pair differs only in its decoded stored-name field. Enticer
  metadata also differs, with provisional layout limits. Native selection remains open.
- The first ten duplicate-record pairs have detailed comparisons, including [seven further modifier pairs](../../reference-data/provenance/frosty-audit-cache-variant-modifiers-2026-09-23.json).
  The alternate extended-barrel record adds ADS animation and FOV modifier imports.
  Four pairs have different layout keys; native record selection remains unknown.
- The [remaining capture](../../reference-data/provenance/frosty-audit-cache-variant-candidate-capture-2026-09-23.json)
  and [separate index](../../reference-data/provenance/frosty-audit-cache-variants-index-2026-09-23.json)
  now cover all 335 current candidate pairs (670 bodies). All selected controls match
  prior raw files; every alternate differs. The index has 482 decoded and 188
  provisional records, with no decode errors. Five pairs differ in root class and
  39 in root layout key. These are structural comparisons, not semantic closure.
- The [spotting base report](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json)
  now includes independent checks of all 64 raw files and 128 field words. M45A1 and
  Skorpion store 27/64.29 while their default site outputs remain 54/150. Native use
  and factor composition remain open. The main ledger has not gained 64 complete
  asset reviews from this narrow field check.
- All 12,086 nonzero candidate resource IDs have metadata. All 1,297 expression
  bodies are captured; the [full byte census](../../reference-data/provenance/frosty-audit-expression-structure-validation-2026-09-23.json)
  finds 1,111 distinct payloads but no graph grammar. All 40 animation resource
  callers were [checked](../../reference-data/provenance/frosty-audit-animation-resource-scope-validation-2026-09-23.json);
  their scope remains ambiguous, with no new exclusions.
- The [melee review](../../reference-data/provenance/frosty-audit-melee-cust-validation-2026-09-23.json)
  verifies seven Ability → CUST → WB → firing paths from 26 fresh raw decodes.
  Five use generic firing, EOD Arm and Sledgehammer use distinct targets. CUST
  remains a functional parent with a separate model branch.
- Narrow review of 3,169 skin-role proposals and 2,789 SP-named package candidates
  accepted no new exclusions. SRU membership was checked from 191 fresh raw bodies;
  native purpose and execution order remain unresolved.
- Phase 1 remains incomplete. Prior findings remain valid within their stated
  limits; broad catalog work is deferred in favor of source/site comparisons.
- The capture checkpoint passed `frosty-build.py guard 1.4.3.0`; that argument is
  the retained build-folder identifier, not the current client's marketing label.
- Release descriptor SHA-256 is `91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2`.
- Saved hotfix and current runtime descriptor SHA-256 is
  `99b49cfd8bdb5bb6f0181df8ac0d93a0396c1b7f07a1ba3ce8ca1cea45969640`.
- `BUILD.json` records archive Head 4892017 for release and 4892087 for hotfix;
  SDK 4414275. The marketing label is user supplied. Use hashes, not file version.
- The reader now decodes delegate type references, boxed scalar/struct values and
  36 validated empty boxed arrays and two count-one boxed structures. Twenty tests
  pass. The latest [comparison](../../reference-data/provenance/frosty-audit-populated-boxed-array-validation-2026-09-23.json)
  covers 2,818 boxed-bearing captures; only the two structures and a propagated
  layout warning change. Multi-element boxed arrays remain unsupported.
- Phase 1 review has resolved the idle table association and retained precise
  runtime blockers for VSSM ADS, deployed conditions and reload timing. W3 source
  branches in the earlier selected queue are reviewed. That queue's source work was exhausted;
  native/menu questions remain blocked. Optic source review/discovery is complete within the bounded pass; native
  questions remain blocked. General multiplayer regeneration/spotting source checks are complete; bounded discovery is reviewed;
  the selected map/mode and shared-registry source checks are also complete.
  The earlier queue rows have a source result or a precise evidence blocker. This is
  bounded coverage, not a complete decode of the 467,208-entry catalog.
- Independent review corrected field paths, alleged operation codes and
  two premature negative results. The [evidence index](../frosty/AUDIT_EVIDENCE_2026-09-23.md)
  links source records, explicit corrections and validation receipts. A filename
  suffix alone does not establish acceptance or supersession.
- Source checks: 62 named GRX index pairs match GS pairs; all 20 IDA floats match
  XML; three representative raw/XML GS checks include the null BREN3 anchor.
  Nine deployed-state raw assets decode with no unresolved type; six VSSM source
  hashes and file GUIDs match. Layout warnings remain.
- Datamining data is under `../BF6 Datamining/builds/`. The supplied BF6 Project
  and Downloads tools paths are absent. Current tools are under Datamining.
- Source collections remain partial. XML overlay entries on `xml-overlay-stale.txt`
  require raw decoding. Do not transfer baseline XML claims to the new build without
  hash or decoded evidence.

## Prioritized queue

Measure progress by Analyzer inputs, not captured catalog entries. For each input,
record its source field, values across the 63 site weapons (plus KSG as a reference),
site agreement and limits. Use float32/int32 value searches followed by decoded-field
and raw-byte checks; a name-search miss does not establish absence. A byte match
alone does not establish meaning.

| Rank | Work | Required result |
|---|---|---|
| 1 | Hardcoded constants in `sim/*.js` and `data/balance_tables.json`, then the remaining site-input inventory | Source path and variance, global-by-evidence, or a precise bounded not-found result. Prioritize health regeneration delay, spread idle timing and fixed multipliers. |
| 2 | WB/GS scalar outliers across 64 reference pairs | Field, outlier weapons, source value, site value and flagged mismatches; start with modeled blocks. |
| 3 | Recoil recovery and pattern fields | Map springs, fade-out, decrease multipliers and pattern seed to current recoil inputs; propose model differences and testable recording predictions. |
| 4 | Per-weapon spotting table and factor bindings | Generator-ready bases and applicable muzzle/barrel/ammo chains; check SP-prefixed 0.1 packages, priority, VSSM P35, Flash Hider and Flash Comp. Keep composition unresolved until supported. |
| 5 | IDA/ADS exceptions | Check other IDA/AZT consumers and VSSM/Interdictor selector or modifier shifts; explain exceptions or give a precise capture blocker. |
| 6 | Reload and timing outliers, including ADS Bolt | Compare ReloadInfoArray, scoped/unscoped BoltAction fields and Field_440ed7fa with site reload/RPM values. Explicitly audit DLC Bolt (`ads_bolt`) as a missing sniper cadence input; keep its selector separate from Recon trait modifiers. |
| 7 | Zeroing predictions | Establish default selection where possible, then calculate aim-point offsets for the 12 named DMR/bolt blocks and update capture priority 7. |

After each item, report findings, affected site values, proposals and the next step.
A runtime blocker must name a capture test with predicted outcomes, or explain why
capture cannot resolve it. Stop when every site-input inventory item is sourced,
mismatched with a proposal, or precisely blocked. Enumeration alone does not meet
that condition.

The older catalog tasks below are supporting context. Resume one only when needed
to answer a site-input question. Existing capture, decoding and review states remain
separate; none of the counts below establishes complete semantic review.

| ID | Work | Status | Completion condition |
|---|---|---|---|
| E1 | Full catalog scope and capture ledger | Deferred; site-driven only | Every catalog entry has an explicit scope status; every weapon/attachment candidate has capture, decode and review status. |
| E2 | Weapon/attachment namespace and exclusion review | Deferred; site-driven only | Candidate namespaces and representative exceptions verified; no blanket Art/SP/BR exclusions. |
| E3 | Reconcile existing field-specific evidence | Deferred; site-driven only | Link actual coverage without promoting narrow findings to full-asset completion. |
| E4 | Exhaustive weapon/attachment references and semantic review | Deferred; site-driven only | All relevant objects, fields, references and conditions reviewed or precisely blocked; uncaptured available assets collected. |

### Exhaustive audit checkpoint

The [capture receipt](../../reference-data/provenance/frosty-audit-capture-2026-09-23.json)
records 29,377 new raw captures, all successful and hash-checked. All 49,285 catalog
entries in the primary weapons namespace now have raw bodies. This includes
cosmetic candidates needed for classification, not just gameplay records. The
current catalog has the same paths and GUIDs as the release catalog; only the two
previously recorded non-weapon catalog SHA1 changes remain. The build manifest
recorded 92,761 files at this checkpoint. Original captures remain intact.

The [structural baseline](../../reference-data/provenance/frosty-audit-coverage-2026-09-23.json)
records 53,394 capture variants, 51,694 decoded candidates, 293,507 object bodies
and 514,005 header import entries. There are 4,974 candidate raw gaps outside the
primary weapons namespace and 65 distinct import file GUIDs absent from the catalog.
Those GUIDs remain explicit open targets; the catalog join does not resolve them.
Decoding does not close semantic review. All whole-asset review states remain pending;
earlier findings are linked only for the specific questions they answered.

The resumable SQLite ledger is at
`../BF6 Datamining/builds/1.4.3.0/reports/exhaustive-audit-2026-09-23/coverage.sqlite`.
Use `scripts/frosty-audit-coverage.py` for catalog/capture status and exact object
and reference queries. The snapshot pins its source and decoder hashes. It is a
research artifact outside the shipped repository data.

The next capture batch, `capture/weapon-related-audit-2026-09-23`, collected all
4,974 listed related targets without failure. Each raw size and SHA-256 was checked.
That checkpoint's build manifest records 97,741 files. Its working ledger is
`reports/exhaustive-audit-2026-09-23/coverage-working.sqlite`; the original database
is retained as a fixed reader snapshot. That database has 58,368 capture
variants, 56,726 decoded candidates, 323,423 objects and 530,373 import entries.
It has exposed another 1,378 available candidate targets without captures. Three
of the 65 unknown catalog GUIDs are reached from the current candidate graph.
These are already documented unresolved soldier targets. Scope and dependency
closure remain open.

The boxed reader check recovered 25,283 values and 789 null references across
903 captured assets. Comparing against the pinned delegate-only reader found no
changes outside the boxed fields. At that checkpoint boxed arrays remained unresolved.
The [accepted byte review](../../reference-data/provenance/frosty-audit-boxed-validation-2026-09-23.json)
and external `boxed-fields.jsonl` preserve full values. Independent implementation
review found unsupported-category/type and string-boundary gaps; these were fixed
and the 903-asset comparison was repeated successfully. Fourteen regression checks
pass. The original and working database snapshots retain the original reader;
`coverage-decoder-v2.sqlite` now retains per-capture reader hashes. Its 919 affected
captures were refreshed; other bodies retain the original reader hash.

The v3 continuation is preserved. The [empty boxed-array
review](../../reference-data/provenance/frosty-audit-empty-boxed-arrays-2026-09-23.json)
compares all 1,299 current boxed-bearing captures with the pinned v2 reader.
Two arrays are empty by direct pointer/count/sentinel checks; the other 1,297 bodies
are unchanged. Only those two derived rows were refreshed in v3. Nonempty boxed
arrays remain unsupported, and original v2 rows are preserved.

At the [layer 4 checkpoint](../../reference-data/provenance/frosty-audit-layer4-capture-2026-09-23.json),
2,704 hash-checked raw bodies (18,891,930 bytes) exposed 2,330
more available dependency targets and a [fourth unknown candidate file GUID](../../reference-data/provenance/frosty-audit-unknown-targets-layer4-2026-09-23.json)
in a vehicle ownership expression. That is an unresolved source target, not a game defect.
All captured candidates have a decode result. The [new empty-array review](../../reference-data/provenance/frosty-audit-empty-boxed-arrays-layer4-2026-09-23.json)
checks all 1,818 boxed-bearing captures; exactly 34 float/unsigned-integer defaults
in nine files change to empty arrays, with no other differences. V4 refreshes those
nine derived rows and links 70 assets to the narrow underbarrel structural review.
Whole-asset semantic states remain unchanged.

Layers 5–13 then captured another 5,298 bodies and exhausted known effective-catalog
dependency targets for the current candidate set. The [layer 13 receipt](../../reference-data/provenance/frosty-audit-layer13-capture-2026-09-23.json)
checks the final six bodies. The [eight unknown candidate GUIDs](../../reference-data/provenance/frosty-audit-unknown-targets-layer13-2026-09-23.json)
remain explicit gaps. V5 refreshes the two populated count-one boxed structures
in the world-icon query graph after raw fixup checks and a full boxed-corpus
comparison. The active ledger is `coverage-decoder-v5.sqlite`. The
[duplicate-record census](../../reference-data/provenance/frosty-audit-duplicate-census-validation-2026-09-23.json)
adds a separate alternate-payload review requirement. Raw graph completion does
not close those gaps or whole-asset semantic review.

The [mode membership census](../../reference-data/provenance/frosty-audit-mode-membership-2026-09-23.json)
covers all 43,497 candidates at that checkpoint, including 29,520 weapon-namespace
candidates. Of 2,789 weapon candidates assigned only to SP-named packages, 29 have
skipped duplicate GUID records that need review. Captured decoded callers do not
show MP/Portal package sources for this group, but that absence is bounded.
No new exclusions were applied. Both boxed-array mission assets also have all 17
GlacierMP map assignments, so their BR/Granite paths do not justify exclusion.

The current GS/WB field inventory covers 128 roots for all 64 candidate weapon
triples, including KSG. It contains 353,787 field/container/metadata entries and
2,419 class/path/type shapes. `weapon-fields-draft.json` and `weapon-fields.jsonl`
retain every value and source hash. This is review input, not semantic completion
or proof that all 64 candidates are enabled in multiplayer. The compact source
receipt is [field inventory](../../reference-data/provenance/frosty-audit-fields-2026-09-23.json).
The [raw registry binding review](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json)
checks 5,381 anchors and 16,889 equal scalar child/hash pairs, naming 126 field
hashes without a scalar mismatch. It resolves stationary/moving idle-index names;
native application stays unresolved. The primary ability branch census is now
validated below; later ability-root and skin-role results are recorded in the
following checkpoints.

The next dependency batch collected another 1,378 raw assets, with no failures and
all sizes/hashes checked. The [two dependency receipts](../../reference-data/provenance/frosty-audit-dependency-captures-2026-09-23.json)
record this batch and the previous 4,974. The manifest has 99,134 files.
The active v2 ledger now has 59,746 captures, 58,173 decoded candidates, 350,424
objects and 541,806 import entries. Another 2,389 candidate targets have no raw
capture. Review scope before expanding this graph further; reference reachability
can enter general vehicle/mode or cosmetic systems. All whole-asset semantic
review states remain pending. The [object-target review](../../reference-data/provenance/frosty-audit-object-targets-reviewed-2026-09-23.json)
checks five targets absent from their captured files and all 15 decoded pointer
callers. The target raw bytes also lack those GUIDs. This is a source-reference gap,
not proof of a runtime failure. The corrected SPC route is under Shaders/RenderLayers;
the historical SHA1 comparison is 1.4.2.5 to 1.4.3.0, not release to hotfix. Unknown file GUIDs remain separate from these object-level gaps.

The [core resource capture](../../reference-data/provenance/frosty-audit-core-resources-2026-09-23.json)
resolved and captured all 22 resource IDs found in the selected core weapon EBX
roots. Each is a `SerializedExpressionNodeGraph`; total raw size is 367,552 bytes.
All hashes and sizes pass. Their 192 embedded asset-like strings contain 31 distinct
GUID-pair/path triples. None matches the respective caller's EFIX import pair;
only three occurrences match both a current file and exported object GUID.
Six occurrences have a current route. These literals are provisional format
evidence, not automatic runtime dependency edges. The [four-sample format review](../../reference-data/provenance/frosty-audit-expression-resources-validation-2026-09-23.json)
confirms raw prefixes and generic SDK reference handling, but establishes no graph
grammar. It needs a reader/specification or independently validated structural
evidence. Parent checks corrected one SDK hash transcription and the catalog label.
The resource collector execution is pinned at
`collector-8438c105a8a6.ps1` in the external audit folder;
the later bundle-membership execution is pinned separately at
`collector-03dd11335d19.ps1`. The current collector adds the optional exact-route
`-BundleRoutesFile` query and matches that later snapshot.

Immediate work: finish the MP roster/root reconciliation, full attachment binding
census and cosmetic-role rules. Apply only reviewed scope dispositions, then
continue per-weapon fields, selectors, effects and relevant dependency review.
Do not turn a successful batch decode into an audited-asset count.

The [independent cosmetic validation](../../reference-data/provenance/frosty-audit-cosmetic-validation-2026-09-23.json)
checked 3,765 asset bodies, all 923 excluded assignment roots, their exact Equipment
imports and four named slot definitions. That checkpoint records 3,643 cosmetic
exclusions (2,367 charm, 507 camo, 769 decal). The 122 unresolved family records stay
candidates. Rebuilding dependency membership removed 30 targets reached only through
excluded branches from the current weapon candidate graph; their catalog and capture
records remain intact. It had 45,642 weapon-namespace, 2,857 additional-namespace
and 8,390 dependency candidates, with 2,389 candidate raw gaps. All in-scope
whole-asset semantic reviews remain pending. A retained stale read query briefly blocked a write; closing the query allowed
the retry to succeed.

The [accepted skin review](../../reference-data/provenance/frosty-audit-skin-validation-2026-09-23.json)
adds 16,103 exclusions after fresh raw validation of 19,334 catalog assets and four
unknown GUID targets. All 2,378 wrapper assignments and 10,109 visual collection
imports match exact file/object GUIDs. The 34 proposed functional-retain rows were
actually named `Camo_SPO` assignments. The 3,231 known unresolved roles remain
candidates; unknown target rows remain reference gaps. The v2 ledger now has 19,746
cosmetic exclusions and 29,539 weapon-namespace candidates. A first scope write
was interrupted and rolled back; SQLite recovery and `quick_check` passed. The
streaming retry committed successfully. Layout warnings remain.

The [third dependency batch](../../reference-data/provenance/frosty-audit-layer3-capture-2026-09-23.json)
captured all 2,389 remaining available targets (19,706,206 bytes), with no failures.
Every size and SHA-256 matches. The first collector attempt used PowerShell Core
and failed during SDK initialization; the required Windows PowerShell run succeeded.
Ledger ingestion and decoding completed: 62,135 capture variants, 404,598 objects,
563,396 imports, 50,756 decoded and 9,835 provisional bodies. The 1,544 pending
bodies are outside the current candidate graph. Header traversal exposes 2,704
further candidate raw gaps; closure remains open. The build manifest recorded
101,578 files at this capture checkpoint.

The [primary branch census](../../reference-data/provenance/frosty-audit-branches-reviewed-2026-09-23.json)
now covers 6,112 referenced branches, 6,111 actions and 14,015 selector references
across all 64 root triples. All 8,367 GS binding structures in eight types match
raw data; the earlier one-type subset is superseded. There are 6,007 WB and 5,089
GS selector joins. All eight XML-absent reference checks resolve to captured raw
objects. [Parent validation](../../reference-data/provenance/frosty-audit-branches-validation-2026-09-23.json)
freshly decodes every Ability/GS root and independently matches branch/action order,
selector identities and complete GS binding tuples. The ledger now holds 192 narrow
root-review links; it does not mark those assets completely reviewed. The
[additional Ability validation](../../reference-data/provenance/frosty-audit-additional-abilities-validation-2026-09-23.json)
freshly checks 142 other roots and their 34 caller files. These are 135 UBL-labelled
and seven melee-labelled roots. All have exact incoming references despite empty
branch arrays. Their remaining fields and selecting branches remain open. The
[Ultimax metadata follow-up](../../reference-data/provenance/frosty-audit-ultimax-metadata-2026-09-23.json)
resolves Equipment's `ShortBarrel` association while retaining the older `Short`
record as an unresolved usage question.

The [archive bundle context](../../reference-data/provenance/frosty-audit-weapon-bundle-context-2026-09-23.json)
adds current package membership for all 192 primary roots. A read-only cache parser
matches all 467,208 effective catalog entries and nine direct SDK bundle exports,
with duplicate GUID handling matched to SDK source. All 189 roots for the 63 mapped
weapons have multiplayer package assignments. KSG's three roots have only the
campaign assault package assignment. Scope review is per record: shared KSG art and
attachment assets prevent a whole-folder exclusion. Package context does not prove
live inventory or activation. Independent review and [parent scope validation](../../reference-data/provenance/frosty-audit-ksg-scope-validation-2026-09-23.json)
accepted 19 exact campaign-only records: five in the assault sublevel and 14 in
the campaign root package. The remaining 108 KSG-folder records retain prior
scope. The ledger now has 29,520 weapon-namespace, 2,857 additional-namespace and
11,120 dependency candidates, with 19,746 cosmetic and 19 single-player exclusions.

The [complete action-field census](../../reference-data/provenance/frosty-audit-action-fields-2026-09-23.json)
checks all 6,115 action objects in the 64 primary raw Ability bodies. The earlier
6,111 total is the referenced subset. Four additional objects (one M27IAR, three
MP7A2) have no internal decoded caller and remain unresolved. Secondary action
fields carry 191 selector-like imports, 135 SRU imports and 139 Ability imports;
the [underbarrel follow-up](../../reference-data/provenance/frosty-audit-underbarrel-parts-2026-09-23.json)
now joins 190 secondary selectors across 135 actions to 17 shared/inline parts.
The 393 single-selector matches preserve additional trait selectors and unresolved
native application rules. SRU function and the 40 unmatched UBL_Any references remain open.
The [fresh Ability ID check](../../reference-data/provenance/frosty-audit-action-ability-ids-2026-09-23.json)
matches all 139 nonzero action IDs to the exact linked Ability's ID; all 5,976 null
Ability pointers have zero IDs. This confirms serialized identity, not activation.

Delegate support is now verified in the shared reader: 8,601 raw type references
across 102 captured variants replace the old unsupported markers, with all other
decoded fields unchanged. [Evidence](../../reference-data/provenance/frosty-audit-delegate-review-2026-09-23.json).
The baseline ledger still uses its original reader, retained as
`reports/exhaustive-audit-2026-09-23/decoder-a414e4d46073.py`; pass that path with
`--decoder` when reading/resuming it. The v2 continuation carries the improved
scalar/struct fields; v3/v4 add validated empty boxed arrays, and v5 adds validated
count-one structures. Multi-element boxed arrays and the compiled resource format
remain open.

This queue comes from the maintained open questions, per-asset findings and watchlist.
Rows group questions with the same next evidence. Priority is local to each phase.

| ID | Phase / priority | Question and evidence | Status | Blocker or revisit condition |
|---|---|---|---|---|
| W1 | 1 / high | Bipod/mounted modifiers and [idle-table trace](../../reference-data/provenance/frosty-idle-duration-2026-09-23.json); [deployed review](../../reference-data/provenance/frosty-weapon-states-reviewed-2026-09-23.json) | Source trace reviewed; runtime blocked | Idle table association resolved across 63 GS blocks (62 named GRX anchors; BREN3 null). [ADS comparison](../../reference-data/provenance/frosty-idle-table-ads-comparison-2026-09-23.json): first eight values match ADS_SPD_TIERS minus one 60 Hz frame within 0.001 ms when interpreted as seconds; index = ADS animation index in 62/64 (exceptions VSSM, Interdictor). ADS/zoom-transition use is supported by this pattern; ADS-entry spread settling remains a hypothesis. Do not apply it to general idle recovery. Need native use, condition evaluation and stacking. Corrected deployed-only claim; no mounted recoil reduction established. |
| W2 | 1 / high | VSSM GS ADS +1 versus WB timing; [reviewed trace](../../reference-data/provenance/frosty-vssm-ads-reviewed-2026-09-23.json) | Source trace reviewed; runtime blocked | Six raw identities checked; GS +1 separate from zero WB package contribution. Need controlled ADS timing or native GS consumer. |
| W3 | 1 / medium | M4A1 Magwell, BROD3 Cryo, SubsonicFrangible; [review](../../reference-data/provenance/frosty-attachment-branches-reviewed-2026-09-23.json) | Source traces reviewed; availability blocked | Plain Magwell selects empty default; distinct FlaredMagwell metadata strings resolve. BROD3 = BREN3 confirmed. All 15 ammo branch defaults true; no live-menu/override evidence. |
| W4 | 1 / medium | Reload threshold/delays and WB frame duration; [timing follow-up](../frosty/WEAPONS.md#timing-follow-up-1430-23-september-2026) | Blocked | 63 raw WB extracts, three XML cross-checks; native timing consumer/controlled commit and next-shot measurements absent. Containing layouts remain provisional. |
| W5 | 1 / medium | Weapon/attachment discovery and pending collection records; [inventory](../../reference-data/provenance/frosty-research-inventory-2026-09-23.json) | Bounded pass done | All 6,659 mechanic-name candidates have raw or XML; 3,040 art/charm routes excluded. Watchlist pending rows are localization/grids with special capture formats, not new weapon traces. This is not full dependency closure. |
| W6 | 1 / retained | Burst recoil, controller activation, lights on/off, modifier order, unused recoil bounds, class traits, Slim Angled double ADS | Blocked | Existing notes require native execution or controlled gameplay. Reopen only for changed source/consumer evidence; do not repeat exhausted operands. |
| W7 | 1 / retained | Weapon Attributes native provider, sine/conditional rules, `Field_b30a73ed`; [model](../WEAPON_ATTRIBUTES_MODEL.md) | Blocked | Native consumer/provider evidence is absent; inferred formulas and panel observations retain their status. |
| O1 | 2 / high | Ambiguous PiP layouts; [decoder limits](../frosty/TOOLS.md#sdk-and-decoding) | Source comparison reviewed; semantics blocked | Exact old/new type keys and nested class references reproduce one PiP pair. Shared values match; added import targets OptionEnablePiPZoom. Need independent field/consumer evidence before clearing warnings or claiming a runtime change. |
| O2 | 2 / medium | Riser fields, inline/shared model precedence, unusual render FOV | Source trace reviewed; runtime blocked | M2010 inline 55/59 and shared 34/20 are distinct paths. GRX anchors identify modifier structure, not native precedence. RMR riser pair 1.3 differs from base/MRO 1.0; semantics need native consumer or controlled view/aim comparison. |
| O3 | 2 / medium | Gameplay optic discovery; [bounded inventory/breath trace](../../reference-data/provenance/frosty-optic-discovery-2026-09-23.json) | Bounded pass done; runtime blocked | PiP context, M2010 iron-sight/decoy glint and breath-control source links are documented. Glint visibility and breath duration/application need native/controlled evidence. Wider zeroing discovery moved to O4. |
| O4 | 2 / medium; returns to attachment utility | Zeroing / rangefinder links from the wider catalog pass | Source trace reviewed; runtime blocked | MP ZeroingDistance binding and Has Rangefinder entry resolved. All 63 WB zeroing blocks captured; 12 named anchors have min 100, max 1,000 and delay 0.4; 51 anchors are null. Lists group 60/75/100/100–500; units/effective selection and ballistic correction need validation. |
| M1 | 3 / high | Regen/spotting activation and base values; [weapons](../frosty/WEAPONS.md#regeneration-and-spotting) | Source trace reviewed; runtime blocked | Base 5/ammo 4/2 raw chains verified. All 13 Subsonic packages link both spotting effects. Current SimEx references duration 0.4/allowed true. Native ranges, composition and reset require captures or consumer evidence. |
| M2 | 3 / medium | Soldier/protection/penetration/movement/class-gadget source gaps | Source pass reviewed; runtime blocked | Discovery selected general soldier settings, suppression, LowProfile and five related ability families. Weapon damage/penetration remain covered by prior source work; no changed target requires repeating the material grids. |
| M2a | 3 / medium | General soldier settings; [review](../../reference-data/provenance/frosty-soldier-settings-reviewed-2026-09-23.json) | Source links reviewed; mode/runtime blocked | Named regen and per-team head/body bindings resolved. Registry defaults are not active mode values. Setup expressions do not supply the alleged health/rate application path; correction recorded. |
| M2b | 3 / medium | Healing/Flak/StanceFlak/DamageSpot/SilentMovement; [review](../../reference-data/provenance/frosty-multiplayer-ability-candidates-reviewed-2026-09-23.json) | Source pass reviewed; activation/native blocked | 17 fresh assets and 44 direct joins; StanceFlak caller extends breath trace. Native equations and standard MP class selection remain unverified. Partial 23,970-file caller scan found no FasterHealing/Flak callers. |
| M2c | 3 / medium | LowProfile and suppression exact feature/expression links | Source chain reviewed; native/activation blocked | LowProfile exact family chain and MP killswitch resolved; suppression PresEx named VFX distinct from SpotOnSuppression guidance-related imports. Native execution and class/mode selection unverified. |
| M2d | 3 / medium | Movement/protection root and registry; [review](../../reference-data/provenance/frosty-movement-reviewed-2026-09-23.json) | Source values reviewed; activation/native blocked | Jump cap 8, dive speed 1.5 and suppression resistance 0.75 are named configuration only. Large motion graph has no established MP activation/consumer join in inspected root layer. |
| M3 | 3 / retained | Four soldier file GUIDs; [prior trace](../../reference-data/provenance/frosty-1.4.3.0-unresolved-guid-trace-2026-09-16.json) | Blocked | Target body/catalog identity, changed callers, or specific consumer evidence required. No such trigger yet. |
| G1 | 4 / medium | Standard MP mode/map overrides of studied mechanics; [review](../frosty/WEAPONS.md#mode-and-map-context) | Source pass reviewed; application/runtime blocked | Five registry assets, two mode roots, two mode mutators, two map roots and three schematics reviewed. Mode links resolve to individual timeout properties. Breakthrough has retreater-specific spotting defaults. Need compiled/inherited application or effective server settings; no general combat override was established. Prior map material grids retained. |

## Proposed Analyzer improvements

Ranking after the source reviews and the operator capture request. These are
proposals for later product review, not approved implementation. Mode review retains
the need to validate active settings before treating shared defaults as match rules.

| Rank | Supported proposal | Benefit / affected code and data | Confidence / validation still needed |
|---|---|---|---|
| 1 | Make spotting base values and composition assumptions explicit and versioned | Make the current literal 54/150 m inputs traceable through reference data; `sim/applyAttachments.js` and spotting display | Current implementation and source factors verified. [Official 1.2.1.0 context](../../reference-data/provenance/frosty-spotting-patch-context-2026-09-23.json) corroborates 54 m unsuppressed world and 21 m suppressed minimap values. [Base fields found](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json): per-weapon WB `Field_5ebda408` (world `Field_9918e670`, minimap `Field_31022dc5`); 61 weapons 54/150, M45A1/Skorpion 27/64.29, KSG 75/150. Conditional proposal: generate per-weapon bases from WB if native consumption is confirmed; M45A1/vz61 would then differ from the current site defaults. Priority and Subsonic composition remain open; retain Standard/suppressor controls and test Subsonic/both before changing the model. The current code is unchanged. |
| 2 | Test whether the idle-duration table controls ADS-entry spread timing | Possible ADS-entry spread behavior; do not feed it into idle recovery in `sim/core.js` | The first eight table values match the ADS ladder minus one 60 Hz frame within 0.001 ms when interpreted as seconds, and indices follow the ADS animation index in 62 of 64 weapons ([comparison](../../reference-data/provenance/frosty-idle-table-ads-comparison-2026-09-23.json)). Use the VSSM ADS capture to test the VSSM exception before any model change. |
| 3 | Consider a per-weapon deployed comparison using actual bipod operands | Explain state-dependent recoil/spread; attachment data, `sim/attachments.js`, `sim/core.js` | Inspected operands are confirmed. Deployment conditions, stacking and eligibility remain unresolved; no mounted recoil reduction follows from the identity operands. |
| 4 | Preserve GS ADS tier and WB timing as separate source coordinates | Prevent VSSM ADS double counting; handling data/display | Six-asset chain reviewed. Measure regular versus 200MM ASM transition; current 250 ms is not contradicted. |
| 5 | Consider a utility indicator separate from numeric modifiers | Represent MagFlare's reload-while-ADS configuration; `data/attachments.json`, `ui/loadout.js` | Metadata and selected boolean package agree. Existing tooltip already has the description; confirm activation/eligibility and decide whether another indicator helps. No reload-speed operand was found. |
| 6 | Investigate reload commit and next-shot windows | Improve timing comparisons if independently established; reload data/display | Normalized time/speed now matches all current reload inputs; shell-fed tactical reloads also include their delays. Four recorded empty reloads support stored time plus one fire interval. Ammo-commit and broader runtime composition remain open. |
| 7 | Use exact optic identity and PiP/FOV context for presentation features | Avoid treating a magnification category as one source optic; attachment/display data | Source identities are mapped. Resolve local/shared precedence and distinguish sway, rendered view and nominal magnification. |
| 8 | Investigate zeroing/Rangefinder before aim-point correction | Could extend `sim/ballistics.js` and ballistic display | All 63 source blocks and 12 named anchors recorded. Effective selection, units and impact correction need controlled capture. |
| 9 | Preserve class and mode context in future damage/regen comparisons | Prevent shared defaults from being presented as universal match rules; data provenance and future scenario controls | Source has per-team health/damage/regen controls and distinct ability operands. Active class/mode selection and composition must be validated before adding selectable bonuses. |
| 10 | Correct GGH22 caliber label to `.40 S&W` | Descriptive `data/weapons.json` `cal` value currently says `9×19mm` | Exact localized description says `.40 caliber`; current WB selects `PD_.40SW`. Ballistics already use that projectile. Proposal only; no production edit. |
| 11 | Model sustained fully-ADS bolt-rifle cadence | Sniper RPM, shot spacing and dependent TTK/recovery | Four exact DLC Bolt choices select a named ADS-rechamber boolean; the site has no cadence branch. Separate accepted-shot timing from fully restored ADS. Measure exit/bolt/entry overlap and keep Recon fixed before selecting a formula. Six-rifle source and candidate tables are linked above. |

The 1.4.3.0 PiP switch has officially documented behavior: total magnification is
unchanged, while its distribution inside/outside the optic differs. Future optic
comparisons must record PiP/FOV settings. A later visual comparison feature should
include that input; no numeric weapon change follows from this finding.
[Evidence](../../reference-data/provenance/frosty-pip-setting-context-2026-09-23.json).

## Next steps

The operator's [ranked capture plan](BF6_CAPTURE_PRIORITIES.md) is maintained as
findings change. It starts with spotting and regeneration with an enemy helper;
VSSM ADS and attachment-menu screenshots are the first solo alternatives.

1. Use the final per-input ledger and its explicit blocker/next-step fields.
   Source review is complete for the pinned inventory. E1-E4 stay deferred unless
   a specific unresolved input requires them; do not restart broad catalog work.
2. Collect the ranked gameplay evidence. For spotting, compare all four loadouts
   on one weapon before changing either base values or multiplier composition.
   Keep mode and round state fixed; avoid Breakthrough retreat phases.
3. Reopen previously exhausted source questions only when a listed trigger is met: a changed asset,
   newly available target body, exact class/mode selection or compiled/native consumer.
   Keep layout warnings and release/hotfix boundaries. An unresolved runtime question
   is not evidence that the source asset is unused.
4. The latest capture manifest records 99,161 files after the resource capture. The three exhaustive-audit
   batches add 35,729 raw assets. All are registered under the hotfix build.
   Original captures remain intact.
5. Review the proposed product changes separately after the captures. This pass
   changed research tools, documentation and evidence; product behavior is unchanged.

## Checks

Prior selected-pass checks passed: 39 dated JSON reports parse; 24 indexed report hashes match;
220 current evidence pointers and 220 local Markdown links resolve. Five new research
scripts compile. At that earlier checkpoint the shared decoder was unchanged and its four
existing regression checks passed. The later exhaustive pass adds delegate and
boxed support, with 17 checks and the full captured-asset comparisons above. Consequential source claims were checked against raw identities,
fields, offsets and exact import targets, including the nine final mode/registry assets.
That earlier findings checkpoint had 428 findings across 355 assets. The current
index contains 547 findings across 465 assets; these remain question-specific results.

`git diff --check` passes. This audit changes only research tools, evidence and
documentation. Existing production edits, including the approved reload corrections,
are preserved; the 21 input-file hashes still match the current inventory. Earlier malformed hash transcriptions in
the initial movement and suppression reports remain immutable history; corrected
review reports and findings-index notes identify the accepted values.
