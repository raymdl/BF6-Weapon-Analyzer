# Battlefield 6 Update 1.3.3.0 — Site Update Plan

## Objective

Update the BF6 Weapon Analyzer from its current v1.3.1.0 data/model to a version-pinned v1.3.3.0 release without mixing confirmed EA mechanics, freshly datamined Sym.gg values, and still-unverified in-game damage values.

The release should add the PP-19, update recoil/bloom/velocity data across the existing arsenal, model the new hit-zone multipliers, show the revised sniper sweet spots, and clearly state any mechanic the site does not yet simulate (especially bullet drag and REDSEC armor).

## Working protocol for Codex and Luna sessions

This file is the shared handoff and progress ledger. Every implementation session must update it as work proceeds, not only at the end.

1. At session start, add a dated entry to **Progress log** naming the owner/session, task numbers being attempted, starting commit, and prerequisites checked.
2. Change a checklist item to `[x]` only after its code/data change and its listed validation have passed. Use `[~]` for partially completed work and `[!]` for a blocker; include the evidence or blocker under **Findings and open issues**.
3. Before stopping, record files changed, commands/tests run with results, unresolved questions, and the exact next task. Do not leave conclusions only in chat.
4. Work in the current `codex/update-1.3.3.0` worktree. Do not edit Claude's worktree or the frozen `v1.3.1.0/` archive.
5. Preserve unrelated untracked spreadsheets, videos, and analysis outputs. Stage/commit only the files owned by the assigned task.
6. Do not silently broaden scope. In particular, Phase 6 is deferred to a later release and must not be implemented in the current Luna sessions.

## Progress log

| Date | Owner | Tasks | Status and evidence |
|---|---|---|---|
| 2026-07-20 | Codex | 0.1-0.5 | Ported the focused hit-zone changes from `claude/bold-williamson-97fab6` into `codex/update-1.3.3.0`; preserved all unrelated untracked outputs; added `data/provenance/1.3.3.0.json`; confirmed no archive edits. |
| 2026-07-20 | Codex | 1.1-1.7 | Reviewed and stabilized hit-zone work. Added shared `sim/damage.js`, complete class validation, deterministic tests, preview-page context wiring, explicit unarmored-chest wording, and chart/target visual checks. Task 1.3 remains dependent on PP-19 creation in Phase 3. |

## Findings and open issues

- Claude's worktree started from the same commit as the Codex branch, so the port did not require conflict resolution.
- The Claude worktree also contained unrelated documentation diagrams/workflow text plus an untracked recoil-model SVG. Those were intentionally not adopted as part of the focused hit-zone port.
- The initial port passed the new tables only to the main page. Both preview pages would therefore have fallen back to `1.00×` limb damage; this is fixed.
- The expanded chart legend initially overlapped the x-axis title; it is now anchored at the top of the chart and was checked in single-weapon and comparison modes.
- Claude's damage-band rewrite removed the existing chest-BTK reference lines. They have been restored as non-tooltip baseline datasets underneath the new chest-to-limb bands.
- The distance-preview silhouette and its zone boundaries are illustrative, not datamined BF6 collision geometry. The page now states that limitation so its hit counts are not treated as authoritative hitbox measurements.
- PP-19 cannot be added to `LIMB_CLASS` until its `data/weapons.json` record lands: the strengthened validator correctly rejects mappings to unknown weapons. Phase 3 must add the weapon and its `auto` classification in the same change.
- Current damage curves are still pre-update/provisional. The hit-zone implementation is mathematically ready, but it does not make the existing 25/33-family base damage exact for v1.3.3.0.
- Phase 6 ballistics/drag simulation is explicitly deferred. Current BTK/TTK remains firing time after a hit, not time-to-impact.

## Evidence and current state

- EA patch notes: https://www.ea.com/games/battlefield/redsec/news/battlefield-6-game-update-1-3-3-0
- EA gunplay deep dive: https://www.ea.com/games/battlefield/battlefield-6/news/bf-combat-gunplay
- Sym.gg source JSON: https://sym.gg/legacy/pages/bf6/data/bf6.json
- Sym.gg before/after patch deltas: https://sym.gg/games/bf6/patch-notes
- Sym.gg comparison: https://sym.gg/legacy/index.html?game=bf6&page=comparison
- Sym.gg charts: https://sym.gg/legacy/index.html?game=bf6&page=charts
- Downloaded JSON reports `version: 1.3.3.0`, `versionDate: 30 JUN 2026`, contains 59 firearms, and has SHA-256 `129C2A552D508E864FF09A1593A4A705C11F0B5F4B19C925BC83F9A96F4B6A4B`.
- Sym.gg's patch page publishes 1,038 field deltas for the 58 weapons that existed in both v1.3.1.0 and v1.3.3.0. It is the preferred before/after source; PP-19 is absent because it is a new record rather than a delta.
- The live source tree currently contains 58 firearms. The only firearm in the downloaded Sym.gg JSON that is absent from `data/weapons.json` is the PP-19.
- The new EOD Bot Arm is a melee weapon. The analyzer does not model melee weapons, so it should remain out of scope unless melee support becomes a separate feature.
- Claude's `claude/bold-williamson-97fab6` worktree supplied the initial limb/headshot/UI work. Its focused changes have now been ported and stabilized on `codex/update-1.3.3.0`; it still does not supply the updated Sym.gg recoil, spread, velocity, damage, attachments, or PP-19 data.
- The Sym.gg JSON is not safe as the sole damage source. It still exposes legacy 25/33-style values and at least some old sniper sweet-spot endpoints (for example M2010 ESR still reaches its 100-damage tier through 120 m), while EA explicitly documents new sweet spots and minor base-damage adjustments.
- The Sym.gg patch page confirms the damage gap: its only damage delta is for L115 and it changes the upper endpoint to 150 m, while EA's live patch note says 133 m; it contains no matching damage deltas for SV-98, M2010 ESR, or PSR. That page is excellent for recoil/spread/velocity/drag deltas but not sufficient for live damage.

## Data authority rules

1. Use EA as the authority for the patch's declared mechanics and explicit numeric changes: hit-zone multipliers, automatic headshot multipliers, muzzle-velocity changes, drag percentage changes, recoil-variation changes, dispersion intent, and sniper sweet spots.
2. Use Sym.gg's 1.3.1.0-to-1.3.3.0 patch page as the before/after authority and the v1.3.3.0 JSON as the new-state authority for raw base weapon, recoil, spread/recovery, reload, deploy, magazine, gravity, and base-drag fields unless an EA value directly supersedes it.
3. Treat Sym.gg damage curves as provisional. Do not overwrite verified site damage with a legacy-looking Sym value merely because it is in the new file.
4. Treat observed 26/35 in-game damage as a hypothesis until the exact underlying values and rounding behavior are tested. Store provenance/status beside any temporary override.
5. Keep REDSEC armor separate from ordinary 100-health Multiplayer calculations. EA's automatic chest-vs-armor multiplier is 0.84, DMR is 0.91, and sniper is 0.67, but the current site has no armor model.
6. Pin every generated/imported artifact to `1.3.3.0`; do not silently mix data from any later update into this release.

## Weapon behavior analysis

### Recoil

- EA reduced recoil direction variation for 38 listed weapons. Against the site's current values, the average reduction is about 17.5%, with a range from 4.3% (SCW-10) to 26.6% (SOR-556 MK2).
- The largest predictability gains are SOR-556 MK2 (-26.6%), UMG-40 (-25.3%), B36A4 (-25.1%), M/60 and RPKM (both about -22.9%), and VCR-2 (-22.5%).
- The smallest gains are SCW-10 (-4.3%), AK-205 (-5.1%), M250 (-9.6%), and VZ.61 (-11.5%).
- This is not a blanket vertical-recoil reduction. Effective per-shot recoil amount is nearly flat across the arsenal: approximately -0.3% on average in the current-to-new comparison, with individual changes from about -5.4% (SCW-10) to +4.0% (B36A4). The practical change is a narrower, more learnable recoil direction, not universally lower kick.
- Attachment-tier behavior must be recalculated too. The new `ADSRecoilDirectionVariationMultiplier` values affect variation-reducing attachments even when the base exponent is zero.

### Bloom / dispersion

- Raw ADS spread increase per shot rises by roughly one-third for the affected automatic weapons in the JSON (for example 0.270 to 0.360 or 0.392 to 0.523). Hip spread increase also rises by roughly one-third across the file.
- The recovery model changes at the same time: ADS firing recovery offset moves from 1.84 to 2.70 for the affected automatics, the coefficient moves from 1.22 to 1.20, and spread-distance exponent changes from 0.67 to 0.50. Therefore raw per-shot bloom alone overstates the sustained-fire penalty.
- Running the site's present bloom simulation with the new inputs shows the intended split by weapon character. Representative 10-shot ADS spread changes are approximately: M433 +9%, TR7 +8%, VCR-2 +10%, M16A4 +30% (burst-cadence sensitive), while SOR-556 MK2 -6%, UMG-40 -14%, SL9 -15%, KTS100 MK8 -21%, and AK-205 -41%.
- The result matches EA's stated design: higher-output weapons demand more burst discipline, while low-output weapons can be equally or more forgiving. The site should present simulated shot-by-shot spread, not label every weapon as simply “more bloom.”

### Velocity and drag

- Forty-nine existing site weapons have a muzzle-velocity change in the new JSON. Median change is about -5.6%; average is about -5.6%.
- ES 5.7 is the major outlier at -21.5%; LMR27 is -9.1%. KV9 is the only listed velocity increase at +4.0%.
- EA increased base bullet drag by 40% and Match Grade drag by 100%. The current Sym.gg base records expose drag `0.0035`; the site currently stores/displays muzzle velocity but does not store or simulate gravity/drag/travel time.
- Close and ordinary mid-range engagements are affected mostly by modest extra lead. Past roughly 150 m, the higher drag compounds the lower muzzle velocity, increasing travel time, lead, and drop much more than the muzzle-velocity percentage alone suggests.
- Updating the velocity card is required for v1.3.3.0. A drag-aware flight solver should be a separate, validated site capability rather than an unverified formula inserted into damage/TTK calculations.

### Damage and hit zones

- Automatic primaries: head 1.40x standard, 1.57x Hollow Point, 1.80x Synthetic; chest 1.00x unarmored; stomach/arms/legs 0.84x.
- DMRs: head unchanged; chest 1.00x unarmored; stomach/arms/legs 0.91x.
- Sniper rifles: head unchanged at 1.75x; chest 1.00x unarmored; stomach/arms/legs 0.67x.
- Shotguns and sidearms keep 1.00x body-zone behavior.
- Automatic chest/head best-case TTK is intended to remain competitive while poor placement usually adds one bullet. A 26-damage automatic would remain 4 BTK to chest but become 5 BTK to limbs (26 x 0.84 = 21.84). A 35-damage automatic would remain 3 BTK to chest but become 4 BTK to limbs (35 x 0.84 = 29.4). These examples explain why the observed 26/35 values are plausible, but they do not prove exact underlying damage.
- Mixed-hit BTK now matters. The UI should distinguish chest, lower-body/limb, headshot-ammo, and armor cases instead of continuing to call every non-head hit a “body shot.”

### Sniper sweet spots

- SV-98: 54-75 m (was 54-90 m).
- M2010 ESR: 75-100 m (was 75-120 m).
- PSR: 90-120 m (was 100-150 m).
- L115: 100-133 m (was 120-175 m).
- Mini Scout remains without a sweet spot.
- These endpoints must be sourced from EA/live testing, not copied from the still-stale Sym.gg damage arrays.

## Ordered implementation checklist

### 0. Prerequisites and branch safety

- [x] 0.1 Use `codex/update-1.3.3.0` as the only implementation worktree. Focused Claude changes were ported from the same base commit; do not edit the Claude worktree further.
- [x] 0.2 Preserve all current untracked analysis/video outputs and the existing untracked `BF6_Update_1.3.3.0_Analysis.xlsx`.
- [x] 0.3 Save source URLs, declared version/date, byte count, and SHA-256 in `data/provenance/1.3.3.0.json`. Luna import scripts must read/verify this manifest before writing generated data.
- [x] 0.4 Confirm `v1.3.1.0/` is a frozen archive of the pre-update site. No archive file was modified during the port.
- [x] 0.5 Record the field policy (`EA override`, `Sym import`, `in-game required`, `deferred`) in the provenance manifest. New fields must be assigned to one category before import.

### 1. Review and stabilize Claude's hit-zone work

- [x] 1.1 Review the uncommitted diff in `claude/bold-williamson-97fab6` and port only the focused hit-zone/UI/documentation changes.
- [x] 1.2 Keep the confirmed class tables: automatic 0.84, DMR 0.91, sniper 0.67, shotgun/sidearm 1.00; automatic head tiers 1.40/1.57/1.80. `scripts/validate-data.mjs` now requires complete class coverage.
- [!] 1.3 Add PP-19 to the automatic hit-zone class in the same Phase 3 change that creates the weapon record. Do not add the mapping early and weaken the unknown-ID validator.
- [x] 1.4 Rename user-facing concepts from ambiguous “body” to explicit unarmored `chest` and `stomach/limbs`.
- [x] 1.5 State in the overview tooltips, chart legend, and documentation that chest values are unarmored and REDSEC armor is not modeled.
- [x] 1.6 Move multiplier resolution, range damage, zone selection, and mixed-hit BTK math into shared `sim/damage.js`; all pages receive the same balance tables.
- [x] 1.7 Add `scripts/damage.test.mjs` for pure chest, pure limb, mixed head/chest, mixed head/limb, shotgun/sidearm exceptions, automatic ammo tiers, boundaries, and all-current-weapon classification.

Validation completed for Phase 1:

- `node scripts/validate-data.mjs` — passed for 58/58 current weapons.
- `node --test scripts/damage.test.mjs` — 6/6 tests passed.
- Syntax checks passed for `sim/damage.js`, `sim/applyAttachments.js`, and `ui/app.js`.
- Browser checks passed for M433 standard/Hollow Point, LMR27, P18, single/comparison charts, distance target zone counts/multipliers, and bloom preview; no browser warnings/errors.

## Luna session assignments

Use one Luna session per assignment below. Each session must follow the working protocol above and stop at its no-go boundary.

### Luna A — Phase 2: version-pinned Sym importer and diff

- **Prerequisites:** Tasks 0.1-0.5 and 1.1-1.7; read `data/provenance/1.3.3.0.json` and verify the pinned JSON SHA-256 before parsing.
- **Primary files:** create a reusable importer under `scripts/`; write review artifacts under a clearly versioned generated-data folder; modify `data/*.json` only after producing and reviewing a dry-run diff.
- **Required outputs:** explicit Sym-codename-to-site-ID map; unknown/missing/duplicate mapping failures; normalized v1.3.3.0 snapshot; 1.3.1.0-to-1.3.3.0 diff; reconciliation summary for all 1,038 Sym patch rows; excluded-field report.
- **Tests:** deterministic importer test using the pinned local source; shuffled-input/order test; unknown-ID failure test; exact effective-recoil formula fixtures; `node scripts/validate-data.mjs` after any data write.
- **No-go:** do not write Sym damage curves; do not implement or expose gravity/drag/flight-time behavior; do not modify archive folders.

### Luna B — Phase 3: PP-19 base integration

- **Prerequisites:** Luna A importer merged or its normalized output reviewed; PP-19 in-game capture status recorded.
- **Primary files:** `data/weapons.json`, attachment/ammo/magazine maps, `data/balance_tables.json`, recoil-decay data, importer mappings, and validation fixtures.
- **Required outputs:** PP-19 visible as the 59th firearm; all cross-file IDs populated; `LIMB_CLASS.pp19 = "auto"`; default loadout and URL serialization work; every unknown attachment field explicitly marked `needs measurement` outside production data rather than guessed.
- **Tests:** validator must fail if any PP-19 cross-file entry is missing; selection/compare/share-link round trip; base-stat fixtures against the pinned Sym row.
- **No-go:** do not promote provisional PP-19 damage or attachment assumptions to confirmed production values.

### Luna C — Phase 4: existing-weapon behavior and attachment audit

- **Prerequisites:** Luna A importer and Luna B PP-19 base record complete; user-supplied in-game attachment captures available for any value being changed.
- **Primary files:** `data/weapons.json`, `data/attachments.json`, `data/ammo.json`, recoil-decay/balance tables, importer fixtures, and attachment coverage matrix.
- **Required outputs:** all recoil/spread/recovery/velocity changes applied; all 59 weapons have an attachment audit state; every barrel x ammo velocity combination is `verified`, `unchanged`, or `needs measurement` with provenance/date.
- **Tests:** before/after fixtures for high- and low-output weapons; attachment percentage-to-absolute-value checks; shared-link compatibility; representative class spot checks.
- **No-go:** do not infer attachment values from stat-bar shape, reuse another weapon's percentage without evidence, or replace a blank/unknown with zero.

### Luna D — Phase 5: damage and sweet spots

- **Prerequisites:** exact in-game damage evidence supplied for the affected damage families and breakpoints. EA sweet spots may be implemented independently because their endpoints are explicit.
- **Primary files:** damage data/overrides, provenance records, shared damage tests, and chart fixtures.
- **Required outputs:** EA sweet spots applied; every base-damage curve point tagged `EA`, `Sym`, or `in-game`; exact-vs-displayed damage and rounding conclusion documented; chest/stomach/arm/leg/head results covered.
- **Tests:** every breakpoint and both adjacent distances; mixed-hit BTK; all four sniper windows plus Mini Scout exception; no legacy/provisional value labeled confirmed.
- **No-go:** if exact 26/35 floats or rounding remain unresolved, keep them provisional and stop release rather than choosing a convenient value.

### Luna E — Phase 7: release UI, documentation, and archive

- **Prerequisites:** Phases 2-5 complete and their data contracts stable. Phase 6 remains deferred.
- **Primary files:** root HTML/UI/docs and a newly frozen archive copy of the last live version when required.
- **Required outputs:** v1.3.3.0/version date, 59-weapon count, provenance/help text, readable hit-zone charts at desktop/mobile widths, and explicit statement that projectile travel/REDSEC armor are not simulated.
- **Tests:** archive navigation, existing share URLs, desktop/mobile visual QA, comparison colors/bands/tooltips, cache/reload behavior.
- **No-go:** do not add ballistics calculations or edit the existing frozen `v1.3.1.0/` contents in place.

### Luna F — Phase 8: integration and release-candidate validation

- **Prerequisites:** all current-release tasks from Phases 2-5 and 7 marked complete with evidence.
- **Required outputs:** clean validation report, ID/coverage report, representative weapon matrix, provenance audit, and a release/no-release recommendation listing any blockers.
- **No-go:** Phase 8 validates and reports; it must not silently patch missing data, waive provisional damage, or pull Phase 6 into the release.

### 2. Build a reproducible Sym.gg importer/diff

- [ ] 2.1 Add a script that reads the pinned Sym.gg JSON and maps Sym codenames/display names to the site's stable weapon IDs.
- [ ] 2.2 Fail loudly on an unknown, missing, or duplicate weapon mapping.
- [ ] 2.3 Produce a reviewable diff report before writing `data/*.json`.
- [ ] 2.3a Reconcile the generated diff against all 1,038 rows on Sym.gg's patch page; differences should be explainable as site normalization/rounding or explicitly excluded damage.
- [ ] 2.4 Import top-level velocity, RoF, magazine, reload, deploy, recoil, spread, and recovery fields. Parse gravity/drag into the versioned normalized snapshot and diff for future use, but do not write them into the live site schema/UI while Phase 6 is deferred.
- [ ] 2.5 Recalculate top-level effective recoil values using `amount x multiplier^exponent`; retain raw components in `recoil.ads`/`recoil.hip`.
- [ ] 2.6 Update `data/recoil_decay.json` and relevant tier tables from the same source rather than hand-copying a subset.
- [ ] 2.7 Explicitly exclude `damage.dmgs`/`damage.dists` from the automatic write until the damage-resolution gate passes.
- [ ] 2.8 Compare the generated velocity and recoil-variation diffs with every explicit EA patch-note line.

### 3. Add PP-19 base weapon support

- [ ] 3.1 Add stable site ID `pp19` to `data/weapons.json` with Sym base values: ~720 RPM, 444 m/s muzzle velocity, 0.0035 drag, 31-round raw loaded count, 2.417 s tactical reload, 2.967 s empty reload, 0.466667 s deploy, and 0.166667 s undeploy.
- [ ] 3.2 Import its full recoil object (ADS direction +6 degrees, raw direction variation 18 degrees, raw amount 0.4418, amount multiplier 0.9333, exponent -3, recovery factor 55, time exponent 1.023).
- [ ] 3.3 Import its spread model (ADS increment 0.28; hip increment 0.547; all stance bounds and recovery fields).
- [ ] 3.4 Add PP-19 entries to `WEAPON_ATTS`, `WEAPON_MAG`, `WEAPON_AMMO`, `HIP_CLS`, `RECOIL_MULT`, movement/ADS/deploy tier mappings, recoil-decay tables, and limb class.
- [ ] 3.5 Keep the PP-19 damage curve provisional. Sym currently reports a legacy-looking 25-damage first tier through 9 m.
- [ ] 3.6 Verify the weapon appears in the correct SMG order, selection survives URL round-trip, and compare mode works in either slot.

### 4. Update existing v1.3.3.0 weapon behavior

- [ ] 4.1 Update all 49 velocity changes and the one KV9 increase.
- [ ] 4.2 Update all 38 recoil-direction-variation values plus their variation multipliers.
- [ ] 4.3 Update recoil amount, direction, multiplier, exponent, and recovery fields even when the patch-note headline only mentions variation; the JSON contains smaller per-weapon changes that affect the simulator.
- [ ] 4.4 Update ADS/hip spread increments, stance bounds, idle/firing/not-firing recovery coefficients, offsets, exponents, and spread-distance exponent.
- [ ] 4.5 Re-run attachment application for recoil-amount, recoil-variation, spread-growth, spread-recovery, and moving-spread modifiers.
- [ ] 4.6 Audit attachment data for **all 59 weapons**, not only PP-19. Treat existing attachment values as pre-patch until they have been checked against the v1.3.3.0 in-game stat panel or another source with explicit current-version provenance.
- [ ] 4.7 For every weapon/barrel/ammunition combination, capture the displayed muzzle velocity and calculate both the absolute value and modifier versus that weapon's updated base velocity. Include short, extended/long, fluted, and any weapon-unique barrels, plus Match Grade/Long Range and other ammo types that alter ballistics.
- [ ] 4.8 Refresh every attachment field used by the site: availability, attachment-point cost, recoil amount/direction/variation, spread/bloom growth and recovery, ADS and hip behavior, movement spread, ADS/deploy/sprint-to-fire handling, magazine capacity, reload times, projectile velocity, drag wording/effect, and any compatibility restrictions.
- [ ] 4.9 Produce a weapon-by-attachment coverage matrix with `verified`, `changed`, `unchanged`, `not available`, and `needs measurement` states. Preserve screenshots/video filenames and verification dates so a blank value cannot be mistaken for a zero modifier.
- [ ] 4.10 Add automated fixtures for attachments whose percentage modifier is applied to a changed base value; verify that the UI shows the resulting v1.3.3.0 absolute stat rather than a stale cached absolute value.
- [ ] 4.11 Add before/after fixtures for representative high-output and low-output weapons so future refactors preserve the new character split.

### 5. Resolve damage and sweet spots

- [ ] 5.1 Enter the EA-confirmed hit-zone/headshot multipliers independently of base damage.
- [ ] 5.2 Apply the four EA sweet-spot ranges as explicit, provenance-tagged overrides.
- [ ] 5.3 Perform the in-game damage test matrix below for every base-damage family that appears to have changed (at minimum the legacy 25 and 33/33.34 families).
- [ ] 5.4 Determine whether 26/35 are exact floats or rounded display values using repeated-shot totals and boundary cases, not a single hit marker.
- [ ] 5.5 Test chest, stomach, arm, leg, and head separately at the 5 m firing-range target added in this patch.
- [ ] 5.6 Repeat at every damage breakpoint and immediately on each side of the breakpoint.
- [ ] 5.7 Store the final curve with provenance (`EA`, `Sym`, or `in-game`) and a verification date.
- [ ] 5.8 Block release if the site would show the old sniper sweet spots or silently label provisional damage as confirmed.

### 6. Deferred — bullet drag and distance behavior (later release)

**Status:** deferred by the user on 2026-07-20. No current Luna session should implement Tasks 6.1-6.5. Preserve raw source fields/provenance so this phase can resume later without re-scraping.

- [ ] `[LATER]` 6.1 Add `gravity` and `drag` fields to the site schema and validator.
- [ ] `[LATER]` 6.2 Update the Bullet Velocity card/tooltips and include base drag in the advanced stat view.
- [ ] `[LATER]` 6.3 Map the in-game Match Grade ammo name to the site's ammo ID and add its verified drag effect.
- [ ] `[LATER]` 6.4 Reproduce authoritative travel-time/remaining-velocity/drop values at multiple distances with a documented numerical solver and tolerance.
- [ ] `[LATER]` 6.5 Add travel time, remaining velocity, target lead, and drop as a separate ballistics panel. Do not fold travel time into firing TTK; label it time-to-impact.
- [ ] 6.6 For the current release, state plainly that damage/BTK/TTK assumes a hit and does not simulate projectile travel. This wording belongs to Phase 7 even though the solver is deferred.

### 7. UI, documentation, and archive updates

- [ ] 7.1 Update the header/version date to Season 3 v1.3.3.0 / 30 JUN 2026.
- [ ] 7.2 Update the weapon count from 58 to 59 and document PP-19 data provenance.
- [ ] 7.3 Add hit-zone legend/help text that explains chest, stomach/limbs, head, and armor scope.
- [ ] 7.4 Ensure shaded chest-to-limb bands remain readable for two-weapon comparisons and color-blind/high-contrast usage.
- [ ] 7.5 Verify tooltips never combine chest and limb values into a misleading single number.
- [ ] 7.6 Update `MAINTENANCE.md` and `CODE_DOCUMENTATION.md` for hit zones, importer/diff flow, damage provenance, and the explicit deferral of drag/flight simulation.
- [ ] 7.7 Add or confirm the frozen v1.3.1.0 archive link before publishing the new root.

### 8. Validation gates

- [ ] 8.1 Run `node scripts/validate-data.mjs` and expand it to require PP-19 cross-file coverage, valid hit-zone classes, provenance presence, and matching damage distance/value array lengths. Gravity/drag live-schema validation belongs to deferred Phase 6.
- [ ] 8.2 Run unit tests for damage/BTK, recoil effective values, bloom fixtures, and attachment tiers. A ballistics-solver test suite belongs to deferred Phase 6.
- [ ] 8.3 Compare every weapon count and ID across weapons, attachments, magazines, ammo, recoil decay, and balance tables; require an attachment-audit status for every weapon.
- [ ] 8.4 Confirm existing shared URLs still resolve to the same attachments; only append to ordered attachment arrays and catalogs.
- [ ] 8.5 Spot-check at least one Assault Rifle, Carbine, SMG, LMG, DMR, sniper, shotgun, sidearm, burst weapon, and PP-19 in both comparison slots.
- [ ] 8.6 Verify chest/limb/head results at 0 m and around every relevant damage breakpoint.
- [ ] 8.7 Verify the four sniper sweet-spot windows and Mini Scout exception.
- [ ] 8.8 Test desktop/mobile layouts, chart bands, table ranges, tooltips, and version/archive links.
- [ ] 8.9 Perform a final provenance audit: no provisional 25/33 Sym values should be presented as confirmed v1.3.3.0 live damage.

## PP-19 in-game capture checklist

Sym.gg supplies the base PP-19 weapon record but not the weapon-specific attachment availability, attachment-point prices, magazine tier shifts, or every in-game label. Capture the following with the PP-19 reset to its default configuration.

### Required screenshots / recordings

- [ ] Weapon overview: class, description, default ammunition, fire modes, default magazine, reserve ammunition, and the complete default loadout.
- [ ] Every Muzzle option: exact name, attachment-point cost, pros/cons, and displayed stat changes.
- [ ] Every Barrel option: exact name, cost, weight, velocity/handling effects, and which barrel is the default.
- [ ] Every Grip/underbarrel option: exact name, cost, and displayed recoil/spread effects.
- [ ] Every Laser and Light option: exact name, cost, and whether Laser/Light are separate or combined in one menu.
- [ ] Sights only if the PP-19 restricts the global sight list or has a unique iron-sight option.
- [ ] Every Magazine option with Basic Barrel + Iron Sights: capacity, cost, displayed ADS time, draw/sprint recovery, ADS movement speed, and reload behavior.
- [ ] Every Ammo option: exact name, cost, penetration description, headshot behavior, velocity/drag wording, and default ammo.
- [ ] Any Ergonomics/fire-control option: exact name, cost, fire-mode change, recoil-variation change, and visual-recoil wording.
- [ ] A 60 fps or higher reload clip for each magazine showing tactical and empty reload from the first input/frame through weapon-ready frame.
- [ ] A short fire-rate clip in full auto and single fire if the in-game value differs from Sym's ~720 RPM / ~450 single-fire cap.

### PP-19 damage test matrix

- [ ] At 5 m, record separate chest, stomach, arm, leg, and head hits with Standard ammo.
- [ ] Repeat head tests for Hollow Point and Synthetic Tip if available.
- [ ] Repeat the body-zone tests with any ammo that claims to change damage or penetration.
- [ ] Test at 8/9/10 m, 20/21/22 m, 35/36/37 m, and 74/75/76 m because those bracket the provisional Sym curve.
- [ ] Record whether the HUD rounds, floors, or ceilings damage. Use repeated shots/remaining-health totals to solve the underlying float where possible.
- [ ] Record magazine loaded count separately from the UI's named capacity; Sym's `MagSize: 31` may represent a 30-round magazine plus one chambered round.

### Deliverable format

For each attachment screen, keep the weapon name, slot name, attachment name, AP cost, and displayed stat panel visible in the same image. Name files in a sortable form such as `pp19_03_mag_30-fast.png`. A single slow scroll video per slot is useful as backup, but still images are easier to transcribe and review.

## All-weapon attachment refresh checklist

This is a separate required pass from PP-19 onboarding. Run it for every existing weapon after its new base stats are loaded, because a correct attachment percentage applied to an obsolete base velocity still produces a wrong displayed result.

- [ ] Reset the weapon to its default configuration and record the base stat panel first.
- [ ] Capture every available Barrel and Ammo option with the weapon name, slot, attachment name, AP cost, and full stat panel visible.
- [ ] Record the displayed muzzle velocity for every ballistic-changing Barrel x Ammo combination; do not assume one global barrel percentage applies identically to all weapons.
- [ ] Capture Muzzle, Underbarrel/Grip, Laser/Light, Magazine, Ergonomic, and weapon-unique options wherever they change a simulator field or restrict another slot.
- [ ] Record exact magazine capacity (including whether the UI count includes a chambered round), tactical reload, empty reload, ADS time, deploy/draw time, sprint-to-fire time, and movement effects for each applicable option.
- [ ] Use a controlled firing-range measurement when the stat panel gives only qualitative bars or text. Store the measured value, method, clip/frame rate, uncertainty, and patch version separately from displayed values.
- [ ] Diff the completed matrix against `data/attachments.json`, `data/ammo.json`, `data/balance_tables.json`, and weapon-specific mapping tables; review every changed and previously unverified cell before import.

## Release acceptance criteria

- The site contains 59 firearms and PP-19 has complete cross-file attachment/magazine/ammo coverage.
- Recoil, spread/recovery, velocity, deploy/reload, and base drag are traceable to the pinned Sym.gg v1.3.3.0 JSON.
- Every weapon has an attachment-audit status, and every barrel/ammunition combination that changes velocity has a current v1.3.3.0 absolute value or an explicit `needs measurement` flag.
- Hit-zone and automatic headshot multipliers match EA's values.
- Sniper sweet spots match EA's revised ranges, not the stale JSON endpoints.
- No unverified 26/35 or legacy 25/33 damage value is presented as exact without provenance.
- Existing share links retain their attachment selections.
- All data validation, unit, UI, and archive checks pass.
