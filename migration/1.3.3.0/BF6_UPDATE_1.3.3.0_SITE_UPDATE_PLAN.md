# Battlefield 6 Update 1.3.3.0 — Site Update Plan

## Objective

Update the BF6 Weapon Analyzer from its current v1.3.1.0 data/model to a version-pinned v1.3.3.0 release without mixing confirmed EA mechanics, freshly datamined Sym.gg values, and still-unverified in-game damage values.

The release should add the PP-19, update recoil/spread/velocity data across the existing arsenal, model the new hit-zone multipliers, show the revised sniper sweet spots, and clearly state any mechanic the site does not yet simulate (especially bullet drag and REDSEC armor).

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
| 2026-07-20 | Codex | Luna A / Phase 2 (2.1-2.8) | Started from `2df4811` on `codex/update-1.3.3.0`. Checked the Phase 2 prerequisites, verified the pinned Sym JSON SHA-256 against `data/provenance/1.3.3.0.json`, and confirmed `node scripts/validate-data.mjs` plus the six damage tests pass. Importer/diff implementation is in progress; no live data write has been made yet. |
| 2026-07-20 | Codex | Luna A / Phase 2 (dry run) | Added the explicit 59-entry Sym-codename map, reusable pinned importer, normalized snapshot, diff, reconciliation, excluded-field report, and six importer tests. Dry run reconciles 1,038/1,038 patch rows: 1,036 source matches and 2 explicitly excluded L115 damage-distance rows; no mismatches or unmapped fields. Review artifacts are under `generated-data/sym/1.3.3.0/`; live data is still unchanged pending this review gate. |
| 2026-07-20 | Codex | Luna A / Phase 2 (complete) | Applied the reviewed safe import to 58 existing weapons, `data/recoil_decay.json`, and `data/balance_tables.json`; regenerated artifacts against read-only baseline `git:HEAD:data/weapons.json`. Validation passes, the importer is idempotent for existing weapons, damage arrays are unchanged, and no archive files were touched. Stopped before PP-19 live integration, Sym damage writes, and Phase 6 ballistics. |
| 2026-07-20 | Codex review | Luna A / Phase 2 review gate | Validation and all 12 tests pass, source hashes match, all 1,038 Sym rows reconcile, damage/drag remain excluded, and archive/unrelated files remain untouched. Review is **not approved yet**: special reload values are being written with the wrong site semantics, the review baseline is recorded as mutable `git:HEAD`, and the EA-line comparison has no generated checklist/artifact. Tasks 2.3, 2.4, and 2.8 are reopened below. |
| 2026-07-20 | Codex | Luna A / review remediation (2.3, 2.4, 2.8) | Corrected reload normalization and live writes, resolved the review baseline to immutable commit `2df4811cb29753f90770944c476d8000effbe962`, and added the generated `ea-reconciliation.json` plus automated per-line EA/Sym checks. The remediation dry run reports 50/50 velocity and 39/39 recoil-variation source matches, with PP-19 explicitly deferred to Phase 3. |
| 2026-07-20 | Codex review | Luna A remediation + Phase 3 prerequisite gate | **Phase 2 remediation approved:** validator and all 15 tests pass; special reloads remain null, every generated artifact records baseline commit `2df4811cb29753f90770944c476d8000effbe962`, and EA reconciliation covers all 89 lines with zero mismatches. **Phase 3 intentionally not started:** Luna correctly stopped because PP-19 in-game capture status remains an explicit prerequisite/no-go item; live data therefore correctly remains at 58 weapons with PP-19 deferred. |
| 2026-07-20 | Codex | Luna B / Phase 3 (3.1-3.6) | Started from `2df4811cb29753f90770944c476d8000effbe962`; reviewed the normalized PP-19 candidate and checked for the required in-game capture package. The Sym row is available, but no PP-19 capture status/evidence is recorded, so this session will integrate only source-supported base fields and fail closed on unknown attachment/magazine data. |
| 2026-07-20 | Codex | Luna B / Phase 3 partial implementation | Added PP-19 as the 59th firearm with pinned Sym base/recoil/spread values, `LIMB_CLASS.pp19 = "auto"`, required cross-file keys, and a fail-closed default loadout. Added `data/provenance/pp19-1.3.3.0.json` with the missing capture fields explicitly marked `needs measurement`; no live drag/gravity or confirmed damage write was made. Validator passes for 59/59 weapons and focused tests pass 19/19. |
| 2026-07-20 | Codex review | Luna B / Phase 3 partial review gate | Source-backed PP-19 base/recoil/spread data, fail-closed attachment maps, provisional damage omission, recoil/balance/limb entries, and the 59-weapon ordering are correct; validator and 19/19 tests pass. **Partial review not yet approved:** `validate-data.mjs` does not fail when the PP-19 weapon record itself is absent, and the share-link test does not exercise the application's real encode/restore path. Browser QA could not be completed in this review environment because local navigation was blocked; task 3.6 correctly remains partial. |
| 2026-07-20 | Codex | Luna B remediation + Luna D / Phase 5 safe pass | Started from `2df4811cb29753f90770944c476d8000effbe962`. Rechecked Fable's three findings, the Phase 5 prerequisites, and the EA sweet-spot endpoints. This session will add fail-closed negative validation, exercise the application share-state module, normalize PP-19 display data, and apply only the independently explicit EA sniper windows; exact base-damage floats remain blocked pending in-game evidence. |
| 2026-07-20 | Codex | Provisional damage unblock + Luna C handoff | Applied community-tested post-1.3.3.0 automatic and DMR upper-torso tiers to the existing weapon families while retaining current range breakpoints; recorded VZ.61 as tested unchanged and corrected its special automatic `0.84x` limb class; added PP-19 with the user-confirmed PW5A3 damage model; and kept every affected curve explicitly provisional. Sniper, shotgun, and untested sidearm values remain unchanged. Phase 4 may now continue at the attachment behavior/audit boundary; PP-19 attachment maps remain fail-closed and `needs measurement`. |
| 2026-07-20 | Codex review | Pre-test scope gate | Re-ran the current automated baseline: validator passes for 59/59 weapons, focused tests pass 24/24, syntax checks pass for the shared damage/loadout/attachment/share-state/UI modules, and `git diff --check` passes. With attachment refresh and Phase 6 deferred, the remaining pre-test work is the minimal Phase 7 version/disclaimer pass plus representative recoil/bloom regression fixtures. Hands-on browser QA is then the next gate. |
| 2026-07-21 → 08-01 | Codex + Claude | Derived Attachment Model, Phases 0-7 | Ran as a separate workstream under `DERIVED_ATTACHMENT_MODEL.md`. Completed the full attachment screenshot audit (3,177 records, 62 weapons, all classes), then replaced the hardcoded per-magazine reload tables and per-barrel velocity multipliers with derived models. **This is the first promotion of screenshot-derived values into live attachment data** — see [§4.12](#412-derived-attachment-model-integration--2026-08-01). Validator 59/59; suite 83/83. |
| 2026-08-01 | Claude | Derived model gate repairs + §7 checks | Fixed four gates that passed when they should have failed closed, then ran the model's four validation checks as executable gates. Surfaced 74 tier mismatches, of which six were adjudicated against original screenshots: **four are live site errors, two are corpus transcription errors.** All findings are pinned to tracked inventories; no `data/` value was changed. Commits `6e2ffa1`, `0e81dc9`, `719a4e5`, `62a4909`, `b14c394`, `984566a`. |

| 2026-08-02 | Codex | Task 2 — BROD 3 / EF88 estimate plug | Added both as the only `estimated: true` weapons, taking the live roster from 59 to 61. BROD 3 uses the GRT-BC model with `recoilDir: -16`; EF88 uses the B36A4/L85A3 midpoint with `recoilDir: +12`; both retain provisional donor-model damage and persistent UI estimate labelling. VSSM, Task 1 witness re-baseline, Phase 6, workbook rebuilds, and screenshot recapture remain excluded. |
| 2026-08-02 | Codex | Task 1 — ADS-move witness re-baseline after Task 2 | Regenerated the live `ads-move-phase2b-iii` witness for 61 weapons: 77,564 cases, Phase 3 digest `d9a45b66…`, Phase 4 digest `34987458…`, 46 shifted weapons, and clamps `{sprintRecovery: 55, adsMove: 0, adsTime: 0, deploy: 435}`. The committed 59-weapon baseline was already stale for the authorized SOR-556/PSR/M2010 ESR/SV-98 and corpus corrections; the new static runtime guard enumerates the current 59-weapon subset and isolates the 59→61 addition to `brod3` and `ef88`. Both remain explicitly estimated; VSSM is still excluded. |

## Findings and open issues

- Claude's worktree started from the same commit as the Codex branch, so the port did not require conflict resolution.
- The Claude worktree also contained unrelated documentation diagrams/workflow text plus an untracked recoil-model SVG. Those were intentionally not adopted as part of the focused hit-zone port.
- The initial port passed the new tables only to the main page. Both preview pages would therefore have fallen back to `1.00×` limb damage; this is fixed.
- The expanded chart legend initially overlapped the x-axis title; it is now anchored at the top of the chart and was checked in single-weapon and comparison modes.
- Claude's damage-band rewrite removed the existing chest-BTK reference lines. They have been restored as non-tooltip baseline datasets underneath the new chest-to-limb bands.
- The distance-preview silhouette and its zone boundaries are illustrative, not datamined BF6 collision geometry. The page now states that limitation so its hit counts are not treated as authoritative hitbox measurements.
- PP-19 cannot be added to `LIMB_CLASS` until its `data/weapons.json` record lands: the strengthened validator correctly rejects mappings to unknown weapons. Phase 3 must add the weapon and its `auto` classification in the same change.
- Automatic-primary and DMR curves now use community-tested post-1.3.3.0 upper-torso tier values mapped onto the existing weapon families. They remain provisional because the values are firing-range measurements/inferences rather than extracted game-file floats.
- Phase 6 ballistics/drag simulation is explicitly deferred. Current BTK/TTK remains firing time after a hit, not time-to-impact.
- The importer is intentionally baseline-aware: the review artifact uses immutable default `git:2df4811:data/weapons.json`, resolves and records the full baseline commit SHA in every artifact, and accepts an explicit baseline for later releases.
- The remediation candidate contains 942 field changes: 873 safe writes for the 58 existing weapons and 69 reserved PP-19 fields. It writes no `damage.*`, gravity, or drag fields; PP-19 remains absent from live data until Phase 3.
- Four existing shotguns receive a 400 m/s velocity candidate because the pinned source has a value where the pre-update site stored `null`; these are source-state normalization changes outside the 49 existing explicit Sym velocity rows.
- The EA line comparison is complete against the official 1.3.3.0 note: its 50 velocity entries include PP-19, and its 39 recoil-variation entries include PP-19. Sym's 1,038-row payload reconciles all 49 and 38 existing-site entries with zero source mismatches; the PP-19 rows remain reserved for Phase 3.
- **Resolved review blocker — reload semantics:** the importer now applies an explicit `shell-by-shell-null` policy to M87A1, M1014, 18.5KS-K, and DB-12; unsupported `N/A` values normalize to `null`. Importer and live-data tests plus `validate-data.mjs` enforce numeric-or-null timing fields.
- **Resolved review issue — immutable baseline:** generated artifacts now record full commit `2df4811cb29753f90770944c476d8000effbe962` and `data/weapons.json`, so the reviewed pre-import diff remains reproducible after `HEAD` moves.
- **Resolved review issue — EA comparison evidence:** `generated-data/sym/1.3.3.0/ea-reconciliation.json` and a fail-closed importer test cover all 50 velocity and 39 recoil-variation lines, including the two PP-19 rows explicitly deferred to Phase 3.
- **Phase 3 prerequisite history:** before this Luna B session, PP-19 integration was intentionally not attempted because the required in-game capture status had not been recorded. That earlier 58-weapon state was safe; the current partial implementation and remaining no-go are recorded below.
- **Phase 3 current gate:** the normalized PP-19 Sym row is reviewed and its source-supported base fields are now live, but the required in-game capture package is still absent. Any production cross-file entry added in this session is fail-closed (no unverified availability, magazine tier, cost, or attachment effect); the field-by-field status is recorded outside runtime data in `data/provenance/pp19-1.3.3.0.json`.
- **Phase 3 remaining no-go:** PP-19 attachment/magazine/ammo coverage and reload evidence remain blocked pending captures. Its user-confirmed PW5A3 damage model is now live with community-tested tiers and explicit provisional provenance; it must not be presented as a confirmed game-file curve.
- **Phase 3 implementation finding:** `WEAPON_ATTS.pp19` has empty fail-closed slot arrays, `WEAPON_MAG.pp19` has no production magazine definition, and `WEAPON_AMMO.pp19` exposes only the site Standard placeholder. These are safe absence states, not claims that the weapon has no attachments or alternate magazines.
- **Phase 3 review blocker — missing-record validation:** `validate-data.mjs` wraps every PP-19-specific requirement in `if (pp19)`. If `data/weapons.json` loses the PP-19 record, the block is skipped and the validator accepts a 58-weapon dataset. Add an unconditional release-specific assertion that PP-19 exists and the weapon count is 59, plus a negative fixture proving that removal fails validation.
- **Phase 3 review issue — share round-trip evidence:** the focused test constructs and reparses `new URLSearchParams({ w: "pp19", cmp: "1", w2: "pp19" })`; it does not call the application's `encodeState()` / `restoreFromUrl()` behavior or verify selected UI state after reload. Add an application-level round-trip test or complete the browser gate in both comparison slots. Local browser QA was attempted during review but the browser environment blocked localhost navigation, so no visual/runtime approval is claimed.
- **Phase 3 cleanup:** `ui/app.js` declares the Base Dmg formatter twice in the same object, and PP-19 uses `9x19mm` while every other 9 mm SMG uses the site's `9×19mm` display convention. Remove the duplicate property and normalize the display label while preserving raw source provenance.
- **Phase 3 remediation requirement:** the validator must fail when the PP-19 record is absent, the share-link fixture must run through the application-owned encode/restore path, and the duplicate formatter/caliber display cleanup must be covered by focused tests.
- **Phase 5 safe boundary:** EA explicitly supplies the four sniper sweet-spot windows. Community firing-range testing now supplies usable automatic/DMR tier estimates, but exact game-file floats, HUD rounding, and disputed 20.5/21.5 m and 35/35.5 m boundaries remain provisional.
- **Resolved Phase 3 review blocker — missing PP-19 record:** `validate-data.mjs` now requires exactly 59 release weapons and an unconditional `pp19` record; `scripts/pp19.test.mjs` removes PP-19 in a temporary fixture and proves validation fails.
- **Resolved Phase 3 review issue — share restoration:** `sim/share-state.js` is now the application-owned codec used by `ui/app.js`; the PP-19 test encodes a comparison state, restores it through that codec, and asserts both selections plus chart/recoil state.
- **Resolved Phase 3 cleanup:** the duplicate Base Dmg formatter was removed, PP-19 displays `9×19mm`, and the raw Sym provenance keeps the source `9x19mm` label.
- **Phase 5 implementation finding:** `data/provenance/damage-1.3.3.0.json` records the exact EA sniper windows and Mini Scout exception. Runtime sniper curves move to SV-98 75 m, M2010 ESR 100 m, PSR 90/120 m, and L115 100/133 m; each live breakpoint carries `EA` or `Sym` provenance and remains provisional pending exact in-game base-damage evidence.
- **Phase 5 remaining no-go:** community-tested tiers are sufficient for temporary live calculations, not final confirmation. Exact game-file floats/breakpoints plus sniper, shotgun, and untested sidearm base values remain unresolved. No provisional base damage is labeled confirmed.
- **Pre-test scope decision:** the all-weapon attachment refresh and Phase 6 drag/gravity solver may be deferred without blocking a base/default-configuration test build. Non-default attachment output must be labeled as pre-patch/unverified, or the test instructions must explicitly exclude it; PP-19 attachment slots remain fail-closed. This is a test-build allowance, not final attachment approval.
- **Pre-test UI issue:** the root header and footer still identify the live page as v1.3.1.0 even though the worktree contains v1.3.3.0 data. Update them before hands-on testing so screenshots and reports cannot be attributed to the wrong data version.
- **Pre-test regression gap:** the importer verifies source fields and effective recoil math, but the suite still lacks representative end-to-end recoil/spread output fixtures for the changed high-output, low-output, burst, and PP-19 behaviors. Add those fixtures before treating visual results as a release candidate.

The three review bullets immediately above preserve the original gate findings; the remediation status and evidence are recorded here.

### Luna A review remediation record (2026-07-20)

- Reload remediation is complete: M87A1, M1014, 18.5KS-K, and DB-12 use an explicit shell-by-shell-null policy; M44 and M357 Trait retain numeric tactical reloads; unsupported reload values are `null`; and validator/test coverage enforces numeric-or-null live timing fields.
- Baseline remediation is complete: generated artifacts record resolved commit `2df4811cb29753f90770944c476d8000effbe962` and `data/weapons.json`, rather than relying on mutable `git:HEAD`.
- EA evidence remediation is complete: `generated-data/sym/1.3.3.0/ea-reconciliation.json` identifies all 50 velocity and 39 recoil-variation lines and expected values. Automated checks report 50/50 and 39/39 pinned Sym matches with the two PP-19 rows explicitly deferred to Phase 3.
- Files changed for remediation: `scripts/ea-1.3.3.0-checks.mjs`, `scripts/sym-import.mjs`, `scripts/sym-import.test.mjs`, `scripts/validate-data.mjs`, `generated-data/sym/1.3.3.0/`, `data/weapons.json`, and this plan. Unrelated output artifacts and `v1.3.1.0/` remain untouched.
- Validation: `node scripts/sym-import.mjs --write-data` succeeded; `node scripts/validate-data.mjs` passed for 58 supported weapons; `node --test scripts/damage.test.mjs scripts/sym-import.test.mjs` passed 15/15; generated artifact summary reports 1,038 Sym rows with 1,036 matches, 2 excluded damage rows, and 0 mismatches; `git diff --check` passed.
- Unresolved questions remain intentionally outside this gate: exact post-patch damage floats/rounding, PP-19 attachment and in-game capture status, and Phase 6 gravity/drag/flight behavior.
- Exact next task: Luna B / Phase 3 prerequisite review, beginning with the normalized PP-19 record and a recorded in-game capture status. Do not promote PP-19 damage or attachment assumptions to production data.

### Luna B / Phase 3 partial implementation record (2026-07-20)

- Files changed: `data/weapons.json`, `data/attachments.json`, `data/ammo.json`, `data/recoil_decay.json`, `data/balance_tables.json`, `data/provenance/pp19-1.3.3.0.json`, `scripts/validate-data.mjs`, `scripts/pp19.test.mjs`, `sim/loadout.js`, `sim/applyAttachments.js`, `ui/app.js`, `scripts/sym-weapon-map.mjs`, and this plan. Existing Phase 2 generated artifacts and unrelated spreadsheet/video/output files were preserved.
- Implemented: PP-19 is the 59th weapon in SMG order; the pinned Sym base/recoil/spread fields are live; `RECOIL_DEC`, `RECOIL_DEC_TEXP`, `RECOIL_MULT`, `HIP_CLS`, `LIMB_CLASS`, and required cross-file keys are populated; the default loadout fails closed without a guessed barrel or magazine; the UI labels pending attachment coverage and unavailable damage.
- Validation: `node scripts/validate-data.mjs` passed for 59/59; `node --test scripts/damage.test.mjs scripts/sym-import.test.mjs scripts/pp19.test.mjs` passed 19/19; `node --check ui/app.js`, `node --check sim/loadout.js`, and `node --check sim/applyAttachments.js` passed; JSON parsing and `git diff --check` passed.
- Unresolved blocker: no recorded PP-19 in-game capture status/evidence exists for attachment availability, costs/effects, magazine tiers/reloads, alternate ammo, or damage breakpoints/rounding. `data/provenance/pp19-1.3.3.0.json` records each as `needs measurement` or provisional.
- Historical next task at this checkpoint: supply and review the PP-19 capture package before Luna C. The later provisional-damage handoff supersedes the Luna C start restriction; the remaining PP-19 attachment fields still stay fail-closed until evidence is captured.

### Luna B remediation + Luna D / Phase 5 safe pass record (2026-07-20)

- Files changed: `scripts/validate-data.mjs`, `scripts/pp19.test.mjs`, `sim/share-state.js`, `ui/app.js`, `data/weapons.json`, `data/provenance/damage-1.3.3.0.json`, `scripts/damage.test.mjs`, and this plan. The existing PP-19 fail-closed maps and unrelated artifacts were preserved.
- Remediation: release validation now requires 59 supported records and an unconditional PP-19 presence check; the negative fixture runs the validator against a temporary 58-weapon copy. The browser imports and uses `sim/share-state.js`, and the focused test exercises encode/restore for both comparison slots and analysis state. The Base Dmg duplicate was removed and PP-19's display caliber is normalized while raw source provenance remains unchanged.
- Phase 5 safe implementation: applied EA's SV-98 54-75 m, M2010 ESR 75-100 m, PSR 90-120 m, and L115 100-133 m sweet spots; retained Mini Scout's no-sweet-spot exception; tagged every live damage breakpoint with `EA` or `Sym`; and added `data/provenance/damage-1.3.3.0.json` plus UI warnings for provisional curves.
- Validation: `node scripts/validate-data.mjs` passed for 59/59; `node --test scripts/damage.test.mjs scripts/sym-import.test.mjs scripts/pp19.test.mjs` passed 22/22; `node --check ui/app.js` and `node --check sim/share-state.js` passed; `git diff --check` passed. Browser-level QA remains unverified because localhost navigation is blocked in this environment.
- Historical no-go at this checkpoint: exact damage-family floats, HUD rounding, PP-19 damage breakpoints, and the final in-game curve were blocked. This Luna C start restriction is superseded by the provisional-damage handoff immediately below; Phase 5 still cannot be called final.

### Provisional damage unblock and Luna C handoff record (2026-07-20)

- Evidence: the community firing-range report at `https://www.reddit.com/r/Battlefield6/comments/1urh1ag/limb_multipliers_for_dummies_with_new_post_patch/` supplies measured post-patch automatic, DMR, and VZ.61 upper-torso tiers. The user separately confirmed that PP-19 uses the PW5A3 damage dropoff model.
- Implemented: automatic primaries now use provisional `35.19`, `27.45`, `26`, `21.6`, `20.65`, `17.8`, `17.2`, `15`, `14.65`, and `12.8` tiers as applicable; DMRs use the corresponding measured tier table; VZ.61 is recorded as tested unchanged and assigned its documented special automatic `0.84x` limb/headshot behavior. Existing Sym range breakpoints are retained because the community range labels do not resolve the half-metre boundary discrepancy.
- PP-19: live provisional curve is `26 @ 0 m`, `20.65 @ 9.5 m`, `17.2 @ 20.5 m`, `14.65 @ 35.5 m`, and `12.8 @ 75 m`, matching PW5A3's runtime model. Its attachment, magazine, ammo-availability, and reload maps remain fail-closed and need measurement.
- Scope retained: sniper base floats, shotgun pellet curves, and untested sidearms remain on their prior provisional source values. EA sniper sweet-spot endpoints remain authoritative and unchanged.
- Provenance/test boundary: `data/provenance/damage-1.3.3.0.json` and `data/provenance/pp19-1.3.3.0.json` distinguish community-tested tiers, family inference, retained Sym ranges, and unresolved groups. `scripts/apply-provisional-damage.mjs` is the reproducible mapping step; validator and focused fixtures require PP-19's live/provenance curves to match.
- Validation: `node scripts/validate-data.mjs` passes for 59/59 weapons; `node --test scripts/damage.test.mjs scripts/sym-import.test.mjs scripts/pp19.test.mjs` passes 24/24; syntax checks and `git diff --check` pass.
- Luna C may continue with **Phase 4: existing-weapon behavior and attachment audit**, beginning at Tasks 4.5-4.10. Source-backed base velocity/recoil/spread work in 4.1-4.4 is already applied. Do not infer missing PP-19 attachments; record each as `needs measurement` until captured.

### Luna A historical pre-remediation stop record (2026-07-20)

- Files changed: `scripts/sym-weapon-map.mjs`, `scripts/sym-import.mjs`, `scripts/sym-import.test.mjs`, `generated-data/sym/1.3.3.0/` review artifacts, `data/weapons.json`, `data/recoil_decay.json`, `data/balance_tables.json`, and this plan. Untracked spreadsheet/video/analysis outputs were preserved; `v1.3.1.0/` was not edited.
- Commands/tests: `node scripts/sym-import.mjs --baseline=git:HEAD:data/weapons.json` (1,038 rows reconciled; 1,036 matched, 2 excluded, 0 mismatched); `node scripts/sym-import.mjs --write-data` (safe write); `node scripts/validate-data.mjs` (passed, 58 supported weapons); `node --test scripts/damage.test.mjs scripts/sym-import.test.mjs` (12/12 passed); `git diff --check` (passed); live parity check (0 damage-array changes, 0 recoil-table parity errors, PP-19 not live).
- Unresolved issues: exact post-patch damage floats/rounding, PP-19 attachment coverage and in-game captures, and all Phase 6 gravity/drag/flight behavior remain intentionally unresolved under their later gates.
- Exact next task: Luna A review remediation for reopened tasks 2.3, 2.4, and 2.8. Do not start Phase 3 from this worktree until the special-reload live writes are corrected and the Phase 2 review gate passes.

## Evidence and current state

- EA patch notes: https://www.ea.com/games/battlefield/redsec/news/battlefield-6-game-update-1-3-3-0
- EA gunplay deep dive: https://www.ea.com/games/battlefield/battlefield-6/news/bf-combat-gunplay
- Community post-1.3.3.0 firing-range damage tiers: https://www.reddit.com/r/Battlefield6/comments/1urh1ag/limb_multipliers_for_dummies_with_new_post_patch/
- Sym.gg source JSON: https://sym.gg/legacy/pages/bf6/data/bf6.json
- Sym.gg before/after patch deltas: https://sym.gg/games/bf6/patch-notes
- Sym.gg comparison: https://sym.gg/legacy/index.html?game=bf6&page=comparison
- Sym.gg charts: https://sym.gg/legacy/index.html?game=bf6&page=charts
- Downloaded JSON reports `version: 1.3.3.0`, `versionDate: 30 JUN 2026`, contains 59 firearms, and has SHA-256 `129C2A552D508E864FF09A1593A4A705C11F0B5F4B19C925BC83F9A96F4B6A4B`.
- Sym.gg's patch page publishes 1,038 field deltas for the 58 weapons that existed in both v1.3.1.0 and v1.3.3.0. It is the preferred before/after source; PP-19 is absent because it is a new record rather than a delta.
- The live source tree currently contains 61 firearms. BROD 3 and EF88 are explicitly labelled estimates from reviewed corpus data and donor models; VSSM remains absent pending Sym full statistics.
- The new EOD Bot Arm is a melee weapon. The analyzer does not model melee weapons, so it should remain out of scope unless melee support becomes a separate feature.
- Claude's `claude/bold-williamson-97fab6` worktree supplied the initial limb/headshot/UI work. Its focused changes have now been ported and stabilized on `codex/update-1.3.3.0`; it still does not supply the updated Sym.gg recoil, spread, velocity, damage, attachments, or PP-19 data.
- The Sym.gg JSON is not safe as the sole damage source. It still exposes legacy 25/33-style values and at least some old sniper sweet-spot endpoints (for example M2010 ESR still reaches its 100-damage tier through 120 m), while EA explicitly documents new sweet spots and minor base-damage adjustments.
- The Sym.gg patch page confirms the damage gap: its only damage delta is for L115 and it changes the upper endpoint to 150 m, while EA's live patch note says 133 m; it contains no matching damage deltas for SV-98, M2010 ESR, or PSR. That page is excellent for recoil/spread/velocity/drag deltas but not sufficient for live damage.

## Data authority rules

1. Use EA as the authority for the patch's declared mechanics and explicit numeric changes: hit-zone multipliers, automatic headshot multipliers, muzzle-velocity changes, drag percentage changes, recoil-variation changes, dispersion intent, and sniper sweet spots.
2. Use Sym.gg's 1.3.1.0-to-1.3.3.0 patch page as the before/after authority and the v1.3.3.0 JSON as the new-state authority for raw base weapon, recoil, spread/recovery, reload, deploy, magazine, gravity, and base-drag fields unless an EA value directly supersedes it.
3. Treat Sym.gg damage curves as provisional. Do not overwrite verified site damage with a legacy-looking Sym value merely because it is in the new file.
4. Use the recorded community firing-range tier table as a temporary `in-game` source for automatic-primary, DMR, and VZ.61 upper-torso values. Map it to existing weapon families only with explicit provisional/family-inferred provenance; retain current Sym range breakpoints until exact boundaries are confirmed.
5. Keep REDSEC armor separate from ordinary 100-health Multiplayer calculations. EA's automatic chest-vs-armor multiplier is 0.84, DMR is 0.91, and sniper is 0.67, but the current site has no armor model.
6. Pin every generated/imported artifact to `1.3.3.0`; do not silently mix data from any later update into this release.

## Weapon behavior analysis

### Recoil

- EA reduced recoil direction variation for 38 listed weapons. Against the site's current values, the average reduction is about 17.5%, with a range from 4.3% (SCW-10) to 26.6% (SOR-556 MK2).
- The largest predictability gains are SOR-556 MK2 (-26.6%), UMG-40 (-25.3%), B36A4 (-25.1%), M/60 and RPKM (both about -22.9%), and VCR-2 (-22.5%).
- The smallest gains are SCW-10 (-4.3%), AK-205 (-5.1%), M250 (-9.6%), and VZ.61 (-11.5%).
- This is not a blanket vertical-recoil reduction. Effective per-shot recoil amount is nearly flat across the arsenal: approximately -0.3% on average in the current-to-new comparison, with individual changes from about -5.4% (SCW-10) to +4.0% (B36A4). The practical change is a narrower, more learnable recoil direction, not universally lower kick.
- Attachment-tier behavior must be recalculated too. The new `ADSRecoilDirectionVariationMultiplier` values affect variation-reducing attachments even when the base exponent is zero.

### Spread / dispersion

- Raw ADS spread increase per shot rises by roughly one-third for the affected automatic weapons in the JSON (for example 0.270 to 0.360 or 0.392 to 0.523). Hip spread increase also rises by roughly one-third across the file.
- The recovery model changes at the same time: ADS firing recovery offset moves from 1.84 to 2.70 for the affected automatics, the coefficient moves from 1.22 to 1.20, and spread-distance exponent changes from 0.67 to 0.50. Therefore raw per-shot spread alone overstates the sustained-fire penalty.
- Running the site's present spread simulation with the new inputs shows the intended split by weapon character. Representative 10-shot ADS spread changes are approximately: M433 +9%, TR7 +8%, VCR-2 +10%, M16A4 +30% (burst-cadence sensitive), while SOR-556 MK2 -6%, UMG-40 -14%, SL9 -15%, KTS100 MK8 -21%, and AK-205 -41%.
- The result matches EA's stated design: higher-output weapons demand more burst discipline, while low-output weapons can be equally or more forgiving. The site should present simulated shot-by-shot spread, not label every weapon as simply “more spread.”

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
- Temporary automatic upper-torso tiers are `35.19`, `27.45`, `26`, `21.6`, `20.65`, `17.8`, `17.2`, `15`, `14.65`, and `12.8` as applicable to each existing family. Temporary DMR tiers are recorded in `data/provenance/damage-1.3.3.0.json`; VZ.61 is tested unchanged.
- PP-19 temporarily inherits PW5A3's exact runtime breakpoint model by user confirmation. The damage values are usable but provisional; attachment availability and behavior are not inferred from PW5A3.
- Remaining damage gaps are exact game-file floats/HUD rounding, the half-metre breakpoint disagreement, sniper base damage, shotgun pellet curves, and untested semi-automatic/revolver sidearms.
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
- [x] 1.3 Add PP-19 to the automatic hit-zone class in the same Phase 3 change that creates the weapon record. Do not add the mapping early and weaken the unknown-ID validator.
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

- **Prerequisites:** Luna A importer and Luna B PP-19 base record complete; provisional PP-19 damage available. Attachment captures are required before changing an attachment value, but Luna C may inventory coverage and mark `needs measurement` without them.
- **Primary files:** `data/weapons.json`, `data/attachments.json`, `data/ammo.json`, recoil-decay/balance tables, importer fixtures, and attachment coverage matrix.
- **Required outputs:** all recoil/spread/recovery/velocity changes applied; all 59 weapons have an attachment audit state; every barrel x ammo velocity combination is `verified`, `unchanged`, or `needs measurement` with provenance/date.
- **Tests:** before/after fixtures for high- and low-output weapons; attachment percentage-to-absolute-value checks; shared-link compatibility; representative class spot checks.
- **Start point:** Tasks 4.1-4.4 are already applied from the pinned source. Continue at 4.5 with calculated behavior checks, then 4.6-4.10 coverage/evidence work.
- **2026-07-20 capture progress:** M433 and PP-19 in-game attachment panels were captured and renamed (106 PNGs total: 104 detail panels plus two overview/context screens) under `Weapon Attachments/Assault Rifles/M433` and `Weapon Attachments/SMGs/PP-19`. Provisional transcription is stored in `migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json`; the reversible source-to-target map is `migration/1.3.3.0/attachment-audit/rename-manifest.json`, and raw OCR is retained in `migration/1.3.3.0/attachment-audit/raw-ocr.json`. Treat these values as review candidates, not authoritative live data, until the transcription is checked. Known gaps: no optics for either weapon, no PP-19 ammunition panels, PP-19 CQB Suppressor was captured twice, and a notification obscures some unchanged lower-right values in three M433 barrel panels. PP-19 None muzzle needs no separate capture because the user confirmed its baseline stats are represented by the Basic barrel screenshot.
- **No-go:** do not infer attachment values from stat-bar shape, reuse another weapon's percentage without evidence, infer PP-19 attachments from PW5A3, or replace a blank/unknown with zero.

### Luna D — Phase 5: damage and sweet spots

- **Prerequisites:** provisional community testing is sufficient for temporary automatic/DMR curves; exact game-file values and category-specific evidence remain required before final Phase 5 approval. EA sweet spots are independently authoritative.
- **Primary files:** damage data/overrides, provenance records, shared damage tests, and chart fixtures.
- **Required outputs:** EA sweet spots applied; every base-damage curve point tagged `EA`, `Sym`, or `in-game`; exact-vs-displayed damage and rounding conclusion documented; chest/stomach/arm/leg/head results covered.
- **Tests:** every breakpoint and both adjacent distances; mixed-hit BTK; all four sniper windows plus Mini Scout exception; no legacy/provisional value labeled confirmed.
- **No-go:** keep community-tested/family-inferred values provisional and stop final release approval if exact game-file floats or breakpoints remain unresolved.

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

- [x] 2.1 Add a script that reads the pinned Sym.gg JSON and maps Sym codenames/display names to the site's stable weapon IDs.
- [x] 2.2 Fail loudly on an unknown, missing, or duplicate weapon mapping.
- [x] 2.3 Produce a reviewable diff report before writing `data/*.json`. The generated artifacts record the resolved immutable baseline commit `2df4811cb29753f90770944c476d8000effbe962` and `data/weapons.json`.
- [x] 2.3a Reconcile the generated diff against all 1,038 rows on Sym.gg's patch page; differences should be explainable as site normalization/rounding or explicitly excluded damage.
- [x] 2.4 Import top-level velocity, RoF, magazine, reload, deploy, recoil, spread, and recovery fields. Parse gravity/drag into the versioned normalized snapshot and diff for future use, but do not write them into the live site schema/UI while Phase 6 is deferred. Reload normalization now uses the explicit shell-by-shell-null policy and numeric-or-null validator; velocity/recoil/spread/recovery imports remain live, and gravity/drag remain normalized-only.
- [x] 2.5 Recalculate top-level effective recoil values using `amount x multiplier^exponent`; retain raw components in `recoil.ads`/`recoil.hip`. Formula fixtures pass and live values now come from the importer.
- [x] 2.6 Update `data/recoil_decay.json` and relevant tier tables from the same source rather than hand-copying a subset. Existing-weapon decay and recoil multiplier tables were regenerated; PP-19 table entries remain Phase 3 work.
- [x] 2.7 Explicitly exclude `damage.dmgs`/`damage.dists` from the automatic write until the damage-resolution gate passes.
- [x] 2.8 Compare the generated velocity and recoil-variation diffs with every explicit EA patch-note line. The versioned `generated-data/sym/1.3.3.0/ea-reconciliation.json` and importer test cover all 50 velocity and 39 recoil-variation lines, with PP-19 explicitly deferred to Phase 3.

### 3. Add PP-19 base weapon support

- [x] 3.1 Add stable site ID `pp19` to `data/weapons.json` with Sym base values. Gravity/drag and undeploy remain outside the live schema under the Phase 6 deferral.
- [x] 3.2 Import its full recoil object (ADS direction +6 degrees, raw direction variation 18 degrees, raw amount 0.4418, amount multiplier 0.9333, exponent -3, recovery factor 55, time exponent 1.023).
- [x] 3.3 Import its spread model (ADS increment 0.28; hip increment 0.547; all site-represented stance bounds and recovery fields).
- [~] 3.4 Add PP-19 entries to the cross-file maps and tables. Required IDs are present and validator-covered; unknown attachment availability, magazine tiers, costs, and effects remain empty/fail-closed and are marked `needs measurement` in `data/provenance/pp19-1.3.3.0.json`.
- [x] 3.5 Add the PP-19 provisional live damage curve from the user-confirmed PW5A3 model and community-tested automatic tiers. Game-file floats and exact breakpoint confirmation remain a Phase 5 no-go for final approval.
- [~] 3.6 The data-driven SMG order, default selection state, comparison IDs, and the application-owned encode/restore codec are covered by focused tests; browser-level selection/compare/share verification remains unverified because localhost navigation is blocked in this environment.

### 4. Update existing v1.3.3.0 weapon behavior

- [x] 4.1 Update all 49 existing-weapon velocity changes and the one KV9 increase; PP-19's source-backed base velocity is also live.
- [x] 4.2 Update all 38 existing-weapon recoil-direction-variation values plus their variation multipliers; PP-19's source-backed values are also live.
- [x] 4.3 Update recoil amount, direction, multiplier, exponent, and recovery fields even when the patch-note headline only mentions variation; the pinned importer and fixtures cover the live source fields.
- [x] 4.4 Update ADS/hip spread increments, stance bounds, idle/firing/not-firing recovery coefficients, offsets, exponents, and spread-distance exponent from the pinned source.
- [ ] 4.5 Re-run attachment application for recoil-amount, recoil-variation, spread-growth, spread-recovery, and moving-spread modifiers.
- [x] 4.6 Audit attachment data for **all 59 weapons**, not only PP-19. **Complete as of 2026-08-01** — the corpus is 3,177 records across 62 weapons covering every class; see [§4.12](#412-derived-attachment-model-integration--2026-08-01). 201 rows are `reviewed`; the remainder are provisional, which still constrains which columns a future migration may consume. The paragraph below is the historical Assault-Rifle-only state and is superseded. *(Historical: 11 Assault Rifle folders, 701 retained screenshots, 629 detail records, L85A3 reviewed, 47 weapons then uncaptured.)*
- [~] 4.7 For every weapon/barrel/ammunition combination, capture the displayed muzzle velocity and calculate both the absolute value and modifier versus that weapon's updated base velocity. **Barrel half complete** — velocity is a signed tier on the `0.8` ladder across all 216 barrel records, and the migration corrected 20 weapon/barrel pairs that displayed 1 m/s high. **Ammo half deferred with cause**: no selectable ammo type carries a velocity field and there is no subsonic ammo id, so the 27 subsonic treatments describe an unimplemented feature rather than a missing measurement. Do not resolve this without lifting the Phase 6 / ammo-catalog deferral.
- [~] 4.8 Refresh every attachment field used by the site: availability, attachment-point cost, recoil amount/direction/variation, spread growth and recovery, ADS and hip behavior, movement spread, ADS/deploy/sprint-to-fire handling, magazine capacity, reload times, projectile velocity, drag wording/effect, and any compatibility restrictions. **Reload timing, magazine capacity, ADS-move tiers and barrel velocity are live and derived** as of 2026-08-01 — see [§4.12](#412-derived-attachment-model-integration--2026-08-01). **Recoil, spread, deploy/draw and empty reload remain on pre-patch values** and are the substantive remainder of this task. Empty reload is specifically blocked on `DERIVED_ATTACHMENT_MODEL.md` open question 1: whether attachment multipliers apply to `emptyRld` is untested, so it needs a handful of in-game captures before migration.
- [x] 4.9 Produce a weapon-by-attachment coverage matrix with `verified`, `changed`, `unchanged`, `not available`, and `needs measurement` states. **Superseded by something stronger**: coverage is now four machine-generated, deterministic inventories under `migration/1.3.3.0/attachment-audit/`, each pinned by a test assertion so a new finding fails the suite and a vanishing one fails too. A narrative matrix could go stale silently; these cannot. See [§4.12](#412-derived-attachment-model-integration--2026-08-01) for the open-item counts and their owners.
- [ ] 4.10 Add automated fixtures for attachments whose percentage modifier is applied to a changed base value; verify that the UI shows the resulting v1.3.3.0 absolute stat rather than a stale cached absolute value.
- [ ] 4.11 Add before/after fixtures for representative high-output and low-output weapons so future refactors preserve the new character split.

### Phase 4 attachment screenshot batch ledger (2026-07-23 rerun)

- **2026-07-26 LMG batch:** 10 LMG folders were captured and audited: 545 screenshots total (10 overview/context captures and 535 detail panels). All 545 source screenshots were renamed with the reversible LMG manifest, reconciled into the canonical review/OCR artifacts, and visually checked for attachment mapping. The KTS100 MK8 shared selector is represented as `Laser/Light` for all 12 options; no physical-slot field was added.
- **Inventory correction:** an earlier 546-screenshot statement was a counting error. The authoritative per-folder sum is 545: 69 + 57 + 51 + 47 + 49 + 51 + 51 + 52 + 60 + 58.
- **LMG review boundary:** LMG rows remain `provisional-review-required`; 0 LMG values are fully user-reviewed or promoted to live data. Nulls retain field-specific reasons, raw OCR remains separate from reviewed transcription, and the workbook/render previews were rebuilt with the LMG class palette.
- **LMG validation:** the recurring gate confirms 545 current paths, sequential capture order, no timestamp-named files, no `Unknown` mappings, no case-insensitive rename collisions, no promotions, workbook row/path alignment, and no formula errors. Semantic idempotence passed for review JSON, rename manifest, and coverage report.

- Captured/inventoried: 11 Assault Rifle folders; 701 retained screenshots; 690 detail captures plus 11 overview/context captures. EF88 is 63/63 with no deleted full-resolution evidence resurrected.
- Transcribed/generated: 745 screenshot-linked records in the refreshed JSON (including retained M433 and PP-19 reference records); 38 mapping fields were visually checked, but 0 records are manually reviewed and 0 values are considered promoted/final.
- Review state: 68 current manifest collisions, 245 unresolved mappings, and 106 retained legacy entries remain fail-closed; Unknown categories are 0; exact-heading benchmark is 12/12 workbook data sheets; focused attachment tests added: 0; validation/data tests passed (24/24), but the attachment-specific promotion gate remains pending for this batch.
- Description-quality rerun: 24 lowercase-leading/truncated OCR descriptions were visually corrected from their screenshots, including the verified AK4D Compensator/Lightened Suppressor/Long Suppressor text; 0 corrected records were promoted, and residual repeated-title, overlay, non-ASCII, and sentence-fragment risks remain explicitly flagged for review.
- Rename result: no renames were applied during this rerun; the 745-entry manifest was inspected for in-folder containment and collisions, and current retained screenshot count remains 701 before/after this rerun. The prior in-folder renames remain preserved; 210 timestamp-named current Assault Rifle screenshots, 2 approved unique renames, 68 collisions, and 245 unresolved mappings stay fail-closed.

### Phase 4 attachment screenshot audit handoff — 2026-07-23 evidence-bounded continuation

- Current authoritative inventory: 701 Assault Rifle screenshots across 11 folders plus 44 retained PP-19 records; EF88 remains exactly 63 screenshots with zero 2560x1440 copies. The refreshed artifacts contain 745 records and 629 new Assault Rifle detail records.
- Evidence-linked corrections: the AK4D barrel subtypes are recorded as 450MM FACTORY → Basic, 600MM CUT → Heavy, 600MM DMR → HEAVY EXT., and 409MM US → Short. Three parser-failure subtype corrections are counted; description cleanup leaves zero known ADS-token, `Default`, or `Unlock at` contamination in the active descriptions. No live attachment data changed.
- Review and transcription gate: 38 mapping fields are visually checked; 81 laser records are present, 16 have evidence-linked mapping review, and 65 remain explicitly blocked (74 AR laser records, 58 still blocked). New Assault Rifle typed-stat coverage is retained field-by-field with null reasons, including cost; 0/629 new detail records are fully transcribed, 0 records are fully reviewed, and 0 are promoted.
- Rename gate: no renames were applied in this rerun. The current 745-entry manifest reports 324 already-canonical entries, 2 approved unique renames still pending, 68 collisions, 245 unresolved mappings, and 106 retained legacy entries. Current paths have zero stale records, path escapes, or destination collisions.
- Validation: `node scripts/validate-data.mjs`, the 24 focused tests, syntax checks, exact-heading benchmark, `git diff --check`, workbook visual inspection, and semantic builder idempotence pass. Remaining Phase 4 blockers are visual review of the unresolved laser/rename batches, complete attachment-cost/stat transcription, description-quality cleanup, collision resolution, and attachment-specific promotion fixtures.

### Phase 4 Assault Rifle screenshot audit — 2026-07-24 transcription pass

- Inventory/renames: the authoritative Assault Rifle inventory remains 701 screenshots across 11 folders. Ammo and Barrel filenames now use the displayed attachment subtype; all other categories use the displayed name. The manifest is collision-free, folder-contained, and count-preserving, with zero timestamp-named current files and zero stale current paths after reconciliation.
- Transcription: 629 new Assault Rifle detail records are present. All 617 records outside the 12 NVO-228E overlay-obscured muzzle captures have complete displayed stat/cost transcription. The NVO rows retain field-specific null/recapture reasons; no cross-weapon values were substituted.
- Human review: L85A3 is the only fully reviewed weapon (67 detail rows). The all-Assault-Rifle scan captured 1,561 comparison indicators, including all 176 L85A3 indicators reconciled against screenshot color/arrow evidence. M16A4 and EF88 retain only the user's targeted subtype/cost corrections and are not represented as fully reviewed; NVO-228E has not received a user review.
- Screenshot corrections retained over shifted/missed workbook cells: L85A3 Tungsten Core is red `↓31` Precision and red `↓41` Control; 646MM CUT and 646MM LSW retain plain Control `44` and red Mobility `↓48`/`↓46`.
- Workbook/process: the canonical workbook uses the reviewed L85A3 formatting template (10-point body font, approved column widths, 85% zoom, four frozen header rows, and three frozen identifying columns). Comparison cells render `↑`/`↓` plus typed values in bold green/red font. The repeatable capture/OCR/reconciliation/rename/review workflow is documented in `BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md` for later weapon classes.
- Promotion/testing: 0 screenshot-derived values are promoted into live attachment data. Modifier derivation, barrel/ammunition combination verification, focused attachment fixtures, and full screenshot review of the remaining provisional weapons remain open Phase 4 gates.

### Phase 4 Carbine screenshot audit completion — 2026-07-24

- Inventory and filesystem: 521 Carbine PNGs across AK-205, BROD 3, GRT-BC, M277, M417 A2, M4A1, QBZ-192, SG 553R, and SOR-300SC were count-preserved and renamed with `0_` overview and sequential detail prefixes. Barrel/Ammo targets use subtype names; other targets use attachment names. The final manifest has 521 allowed, 0 blocked, 0 collisions, 0 stale targets, and 0 timestamp-named current files.
- Transcription: 512 Carbine detail rows contain 1,263 comparison indicators with arrow direction and buff/penalty effect, including the corrected AK-205 compact Laser indicators and Linear Comp recoil indicators. All 80 previously missing Carbine costs are visually transcribed; required fields remain explicit and fail-closed where the compact selector does not display the expanded lower panel. Unknown mappings are 0.
- Validation: current screenshot paths were reconciled after rename, `renameApplied` matches the filesystem for all 521 Carbine records, the workbook's 9 Carbine sheets plus Source Index and Read Me were visually inspected, and the builder is semantically idempotent across two runs. No screenshot-derived value was promoted into live site data.

### 4.12 Derived Attachment Model integration — 2026-08-01

A separate workstream, planned in `DERIVED_ATTACHMENT_MODEL.md`, ran between 2026-07-21 and
2026-08-01 and materially changes the state of Tasks 4.6 through 4.9. **Read this before picking up
any Phase 4 task**, because several statements elsewhere in this file predate it.

#### What changed, and the one claim that is now false

Every earlier Phase 4 record in this file says some variant of *"0 screenshot-derived values are
promoted into live attachment data."* **That is no longer true.** The derived-model workstream
promoted the following, and did so deliberately and under gates:

| Live data | Count | Replaced |
|---|---|---|
| `reloadSpeedTier` on magazines | 260 | 265 per-magazine `tacRld` values |
| `tacRldOverrideMs` on magazines | 5 | animation-override reloads, now in a register |
| `reloadSpeedMult` on ergonomics | 1 | 24 per-weapon `magCatchRld` blocks |
| `velTierMod` on barrels | 7 | per-barrel `velMult` (7 legacy occurrences remain for cleanup) |

The promotion gate the earlier records were protecting is still intact in spirit: nothing was
promoted from a raw OCR reading. Each value is a small integer tier on a shared ladder, derived
from the audit and then required to reproduce every affected screenshot reading exactly, with the
legacy and derived resolvers compared across 88,694 witness loadouts.

The migration also found live bugs the hardcoded tables had been hiding: AK-205 Mag Catch stored
the undiscounted base reload; six weapons offered Mag Catch with no data block, so it did nothing;
23 magazine reload transcriptions were wrong; and 20 weapon/barrel pairs displayed a velocity 1 m/s
high because the resolver rounded where the game floors.

#### Effect on the Phase 4 tasks

- **4.6** — the audit is no longer 12 of 59 weapons. The corpus is **3,177 records across 62
  weapons**, covering every class. The "other 47 weapons remain uncaptured" wording below is stale.
  201 rows carry `reviewStatus: reviewed`; the rest remain provisional, which still matters for any
  column a future migration wants to consume.
- **4.7** — the **barrel** half is done: barrel velocity is a signed tier on the `0.8` ladder across
  all 216 barrel records. The **ammo** half is not, and is blocked for a specific reason rather
  than an oversight: no selectable ammo type on the site carries a velocity field, and there is no
  subsonic ammo id at all. The 27 subsonic velocity treatments in the corpus describe an
  unimplemented feature. See the scope warning below.
- **4.8** — reload timing, magazine capacity, ADS-move tiers and barrel velocity are now live and
  derived. Recoil, spread, deploy/draw and empty-reload remain on their pre-patch values.
- **4.9** — coverage is now machine-generated and pinned rather than narrative. Four tracked
  inventories under `migration/1.3.3.0/attachment-audit/` record every open item, and each is asserted by the
  test suite so a new finding fails and a vanishing one fails too.

#### Release-relevant defects this surfaced

Running the model's value check as a *prediction* rather than a ladder-membership test surfaced 74
disagreements between the site and the screenshot corpus. Six were adjudicated by reading the
original panels, and they fall on both sides:

| Weapon / magazine | Field | Game panel | Site shows | Wrong side |
|---|---|---|---|---|
| PSR 7Rnd | ADS time | 300 ms | 367 ms | **site** |
| PSR 10Rnd | ADS move | 0.47 | 0.54 | **site** |
| M2010 ESR 8Rnd | ADS move | 0.47 | 0.54 | **site** |
| SV-98 10Rnd | ADS move | 0.54 | 0.67 | **site** |
| M2010 ESR 8Rnd | ADS time | 300 ms | 300 ms (corpus says 250) | corpus |
| M2010 ESR 5Rnd Fast | ADS time | 300 ms | 300 ms (corpus says 250) | corpus |

**Four are live site errors on shipping weapons.** PSR 10Rnd and SV-98 10Rnd are *default*
magazines, so those are wrong base indices rather than per-magazine shifts — they are what a user
sees before touching a single attachment. These are release-relevant and are called out in the
next-steps section below.

That both directions occur is the reason `DERIVED_ATTACHMENT_MODEL.md` §7 forbids resolving a
model-versus-reading disagreement by rule. Correcting either side automatically would have broken
working data. The same pattern recurred in the field-by-slot check, where the corpus recorded five
grips changing muzzle velocity: the one panel read directly showed the grip was *locked and never
equipped*, so the reading was a transcription error, not a grip effect.

#### Open items now tracked, with owners

| Item | Count | Where | Needs |
|---|---|---|---|
| Unadjudicated tier mismatches | 68 | `model-tier-mismatch-inventory-20260801.json` | operator captures |
| Unread grip-velocity rows | 4 | `field-slot-asymmetry-inventory-20260801.json` | operator captures |
| `adsTimeMs` corpus-only slot effects | 18 | same | operator captures |
| SOR-556 MK2 45Rnd with no `WEAPON_MAG` entry | 1 | `name-effect-coverage-inventory-20260801.json` | catalog mapping, not recapture |
| Possible dead `recoilVariationDegrees` ergonomic path | 1 | same | code review |

#### Scope warning for the next session

`DERIVED_ATTACHMENT_MODEL.md` §7.7 lists ammo effects on velocity, ADS time and spotting, including
several **Match Grade** rows. Those sit exactly on the boundary of deferred Phase 6 Task 6.3 and the
deferred ammo-catalog migration. **Recording them in an inventory is not authorization to start
Phase 6.** Working protocol rule 6 still governs: Phase 6 remains deferred and must not be
implemented in the current sessions.

### 4.13 Attachment cost and ammo-stat correction pass — 2026-08-01

304 transcription errors were corrected in the screenshot-review corpus, and two automated gates
were added. **No live data file was touched by this pass** — every change landed in
`migration/1.3.3.0/attachment-audit/`. The live implications are recorded below and are *not* yet applied.

#### What was corrected

| Class of error | Records |
|---|---|
| EF88 / BROD 3 headshot — EA-acknowledged stat-screen bug | 123 |
| `collateralMultiplier` of 0, never a valid value | 92 |
| Magazine costs against the stock-31 price ladder, and 6 Tier 2 re-reads | 17 |
| Regen delay bleeding between adjacent captures | 28 |
| Values misparsed as exactly `1` from the arrow glyph | 25 |
| Confirmed in game, no automatic signature | 13 |
| Match Grade subtype and cost read off the neighbouring PENETRATION tile | 3 |
| Barrel costs, sniper grip costs (earlier in the session) | 3 groups |

The reusable output is section 21 of `BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md`: the
headshot, collateral and regen rules by class, and the **per-weapon exceptions**, which matter more
than the rules. On the first run 213 of 494 rule violations were the rules being incomplete rather
than the data being wrong — a 43% false-positive rate. Do not mass-correct against a class rule.

Gate: `node scripts/validate-data.mjs` and `python scripts/validate-ammo-stat-rules.py`, the latter
of which must report zero violations.

#### Live-data implications — OPEN, none applied

`data/ammo.json` models `hsMult` and `collateralMult` **keyed by weapon class**. This session
established that several of those values are not class-uniform, so the current schema cannot
express the confirmed behaviour. Each item below is a discrepancy between live data and a
user-confirmed value, not a proposal:

| Live data | Holds | Confirmed | Note |
|---|---|---|---|
| `AMMO.synthetic.hsMult` | 1.75 scalar | 1.80 for full-auto/burst, 1.75 for GRT-CPS and LMR27 | a scalar cannot express both |
| `AMMO.*.collateralMult` SMG/Sidearm | class-uniform | PW7A2, USG-90 and ES 5.7 run one tier higher — 0.67 / 0.83 / 0.57 | needs a per-weapon override |
| `AMMO.frangible.collateralMult` | 0.67 AR / 0.50 Sidearm | M121 A2 is 0.75, M45A1 is 0.57 | two more per-weapon exceptions |
| `WEAPON_AMMO.grtcps.def` | `standard` | Hollow Point | its non-ammo captures show the HP row |
| `WEAPON_AMMO.svk86.ammo.hollow_pt` | 15 | 20 | |
| VSSM | absent from `weapons.json` and `ammo.json` | its ammo set is Tungsten Match, Tungsten Core, Match Grade, Frangible, all 1.80 headshot | one of the four weapons missing from `weapons.json`, with BROD 3, EF88 and M60 |

Two live values **corroborated** the corpus corrections rather than conflicting with them:
`WEAPON_AMMO` already had `long_range` at 10 for SVK-8.6, L115, M2010 ESR and SV-98, which is what
the Match Grade tile fix independently arrived at. That agreement is the strongest evidence in this
pass that the tile-misread diagnosis was right.

**Do not apply these to `data/` as part of Phase 4.** Ammo-catalog changes belong to the deferred
ammo migration, and working protocol rule 6 still governs. Recording them is not authorization.

#### Override-ledger reconciliation

The canonical-order renumbering had left **1,765 of 2,982** override entries keyed to filenames
that no longer existed, so their corrections could never apply on re-import. 1,479 were re-keyed
and 231 dead evidence references repaired. **286 ledger keys and 513 evidence paths remain
outstanding**, itemised in the drift reports beside the ledger.

The rule that prevents recurrence is in `MAINTENANCE.md`: the ledger is keyed on
`source.currentPath`, so any renumbering pass must re-key it in the same operation. 13 entries were
deliberately left dead because reviving them would have regressed the record with superseded
values — a revived stale override is worse than an orphaned one.

### 4.14 BROD 3, EF88 and VSSM — estimates and exclusion — 2026-08-02

Three weapons have a complete attachment corpus. Sym.gg has not published full weapon statistics
for any of them. The prior 4.14 instruction to not add all three is superseded only for BROD 3 and
EF88 by the bounded estimate decision recorded below; VSSM remains excluded.

| Weapon | Corpus records | Slots captured |
|---|---|---|
| EF88 | 63 | Muzzle, Barrel, Grip, Magazine, Ammo, Ergonomics, Laser, Light |
| BROD 3 | 62 | Muzzle, Barrel, Grip, Magazine, Ammo, Ergonomics, Laser, Light |
| VSSM | 44 | Barrel, Grip, Magazine, Ammo, Ergonomics, Laser, Light — **no Muzzle**, it is integrally suppressed; excluded |

#### Task 2 estimate decision

BROD 3 and EF88 are live as exactly two explicitly labelled estimates, bringing the release roster
from 59 to 61 weapons. BROD 3 uses GRT-BC as its donor/model, with `recoilDir: -16` as the
user-confirmed sign flip. EF88 uses the B36A4/L85A3 midpoint where needed, with `recoilDir: +12`;
its `recoilV` is the exact donor midpoint and its measured `recoilVar: 20.4` overrides any midpoint.
Both use measured `mag: 31`, headshot multiplier `1.40`, and the documented `10800/n` RPM rule.

Damage remains `provisional`: BROD 3 uses the GRT-BC dropoff model with measured endpoints 26 → 14;
EF88 uses the L85A3 model with measured endpoints 26 → 17. Every unknown donor-derived field is
marked estimated in `data/provenance/brod3-ef88-estimates-1.3.3.0.json`; no inferred value is a
direct measurement. The UI displays an ESTIMATED badge and the footnote “Similar-weapon estimate
pending Sym full statistics.” Replace the donor-derived fields and provisional curves when Sym
publishes full statistics.

Related but separate: the corpus calls the M/60 **`M60`**, deliberately, to keep `/` out of Windows
paths and Excel references. The weapon id `m60` matches on both sides, so **join corpus to live data
by id, never by name** — a name join silently drops this weapon.

#### What the screenshots already give us

Everything the attachment UI displays, for both estimates: `rpm`, `mag`, `tacRld`, `bulletVel`,
`adsTime`, `fireMode`, `recoilV` and `recoilVar`, plus enough to build every cross-file attachment
table — `WEAPON_ATTS`, `WEAPON_MAG` (tier shifts back-calculate from the displayed ADS time, sprint
recovery and ADS move speed), `WEAPON_AMMO` and `WEAPON_ERGO`. VSSM remains excluded from this
task and receives no live cross-file entry.

#### What is missing, and why the corpus cannot supply it

Every field below is present on all 61 live weapons, so none is optional. None is visible anywhere
in the attachment UI — these are simulation internals.

| Field | Notes |
|---|---|
| `dmg` | the range/damage breakpoint array. **The validator hard-fails on a missing or empty `dmg`** |
| `recoil` | 14 keys per stance: `dir`, `amount`, `amountMult`, `amountExp`, `dirVar`, `dirVarMult`, `dirVarExp`, `decNorm`, `decExp`, `decTimeExp`, `decOffset`, `duration`, `decFactor`, `shootingDecScale`. The recoil-variation tier ladder reads `dirVarMult`/`dirVarExp` from here, so without it variation attachments do nothing |
| `spread` | per-stance `adsStand`, `adsMove`, `hipStand`, `hipMove` |
| `spreadDyn` | `ads` and `hip` dynamics |
| `spreadMax`, `recoilDir`, `recoilIncAds` | scalars |
| `cal` | caliber string; a required key in the validator |
| `emptyRld` | empty reload; not on the stat panel. 56 of 61 live weapons carry it |
| `reloadSpeed` | tier value |
| `RECOIL_DEC`, `RECOIL_DEC_EXP`, `RECOIL_DEC_TEXP` | `data/recoil_decay.json`, keyed per weapon id |
| `RECOIL_MULT`, `HIP_CLS`, `LIMB_CLASS` | `data/balance_tables.json`, keyed per weapon id, not per class |

The minimum to merely pass validation is `cal`, `dmg`, `tacRld`, `emptyRld` and the cross-file
entries. BROD 3 and EF88 are the narrow exception to the prior no-add rule: their donor-derived
`recoil`, `spread`, reload and damage model are allowed only with the estimate badge, persistent
footnote and provenance above. **Do not add VSSM until Sym publishes.**

The corpus remains the source of truth for their attachment availability and tier shifts; do not
rebuild workbooks or recapture screenshots as part of this estimate plug.

### 5. Resolve damage and sweet spots

- [x] 5.1 Enter the EA-confirmed hit-zone/headshot multipliers independently of base damage.
- [x] 5.2 Apply the four EA sweet-spot ranges as explicit, provenance-tagged overrides.
- [~] 5.3 Community testing covers the changed automatic and DMR tier families sufficiently for temporary use; individual-weapon confirmation plus sniper, shotgun, and untested sidearm families remain open.
- [~] 5.4 Community testing reports inferred decimals and rounded first-hit HUD values. Exact game-file floats and the complete rounding rule remain unresolved.
- [~] 5.5 Community testing covers the new class multipliers and mixed-hit behavior, but the complete per-weapon chest/stomach/arm/leg/head matrix remains open.
- [~] 5.6 Existing Sym breakpoint distances are retained. Exact adjacent-distance captures remain open, especially the approximately 20.5/21.5 m and 35/35.5 m disagreement.
- [~] 5.7 Store the live provisional curves with provenance (`EA`, `Sym`, or `in-game`) and a verification date. Community-tested and family-inferred values are live but not final game-file values.
- [x] 5.8 Block release if the site would show the old sniper sweet spots or silently label provisional damage as confirmed. Validator, source-tag tests, UI notes, and the EA sweet-spot fixtures enforce the boundary.

### 6. Deferred — bullet drag and distance behavior (later release)

**Status:** deferred by the user on 2026-07-20. No current Luna session should implement Tasks 6.1-6.5. Preserve raw source fields/provenance so this phase can resume later without re-scraping.

- [ ] `[LATER]` 6.1 Add `gravity` and `drag` fields to the site schema and validator.
- [ ] `[LATER]` 6.2 Update the Bullet Velocity card/tooltips and include base drag in the advanced stat view.
- [ ] `[LATER]` 6.3 Map the in-game Match Grade ammo name to the site's ammo ID and add its verified drag effect.
- [ ] `[LATER]` 6.4 Reproduce authoritative travel-time/remaining-velocity/drop values at multiple distances with a documented numerical solver and tolerance.
- [ ] `[LATER]` 6.5 Add travel time, remaining velocity, target lead, and drop as a separate ballistics panel. Do not fold travel time into firing TTK; label it time-to-impact.
- [ ] 6.6 For the current release, state plainly that damage/BTK/TTK assumes a hit and does not simulate projectile travel. This wording belongs to Phase 7 even though the solver is deferred.

### 7. UI, documentation, and archive updates

#### Next steps — start here (set 2026-08-01)

Work these in order. N1 is new and jumped the queue because it ships wrong numbers on default
loadouts; T1-T4 were already the nearest release-relevant milestone and are unchanged.

- [ ] **N1 Fix the four confirmed live ADS errors.** PSR 7Rnd ADS time, and the ADS-move values for
      PSR 10Rnd, M2010 ESR 8Rnd and SV-98 10Rnd. All four are adjudicated against original panels
      in [§4.12](#412-derived-attachment-model-integration--2026-08-01) — no new captures needed.
      Two are *default* magazines, so they are wrong base `defAms` indices rather than per-magazine
      shifts; fix the base index, do not paper over it with a magazine shift. Expect the
      `model-tier-mismatch` inventory to shrink, which will fail its pin assertion until the
      inventory is regenerated — that is the gate working, not a break.
- [ ] **N2 Correct the two confirmed corpus transcription errors** (M2010 ESR 8Rnd and 5Rnd Fast
      ADS time, recorded as 250 where the panel reads 300) and the 18.5KS-K Alloy Vertical velocity
      row. Corpus edits need a written receipt under `migration/1.3.3.0/attachment-audit/`, per
      `DERIVED_ATTACHMENT_MODEL.md` §9.2 — a rebuild that silently re-derives curated values has
      already caused a regression once.
- [ ] **N3 Resolve the SOR-556 MK2 45Rnd mapping.** It is a supported magazine with a corpus
      screenshot but no `WEAPON_MAG` entry, which made it invisible to the prediction sweep. This
      is catalog work, not a recapture.
- [ ] **T1-T4 below** — the minimum gate before hands-on testing.

Blocked on operator captures, not on engineering: the 68 unadjudicated tier mismatches, the 4
unread grip-velocity rows, and the 18 `adsTimeMs` corpus-only rows. Each is pinned and inventoried,
so they can wait without decaying.

Do **not** start: Phase 6 ballistics, the ammo/subsonic velocity work, the deferred recoil or
magazine-catalog migrations, or `DERIVED_ATTACHMENT_MODEL.md` open questions 5, 10 and 11. All
remain deferred under working protocol rule 6.

#### Minimum gate before user hands-on testing

- [ ] T1 Update the root header/footer to v1.3.3.0 / 30 JUN 2026 and show 61 weapons; retain the working v1.3.1.0 archive link.
- [ ] T2 Add a visible test-build scope note: damage curves are provisional, REDSEC armor is not modeled, projectile travel/drag/gravity is not simulated, and non-default attachment values remain pre-patch/unverified pending the later attachment refresh.
- [ ] T3 Add representative deterministic recoil/spread fixtures covering one high-output automatic, one low-output automatic, one burst weapon, and PP-19; keep the existing 24-test baseline passing.
- [ ] T4 Run the automated gate again, then hand off to browser QA for both comparison slots, share-link restoration, charts/tooltips, breakpoint/zone checks, PP-19 base/default state, desktop, and mobile.

The full documentation refresh, all-weapon attachment audit, exact damage confirmation, and Phase 6 solver are not prerequisites for this hands-on test build. They remain release-follow-up work unless the test exposes a dependency.

- [ ] 7.1 Update the header/version date to Season 3 v1.3.3.0 / 30 JUN 2026.
- [ ] 7.2 Update the weapon count from 58 to 61 and document PP-19 plus the BROD 3/EF88 estimate provenance.
- [ ] 7.3 Add hit-zone legend/help text that explains chest, stomach/limbs, head, and armor scope.
- [ ] 7.4 Ensure shaded chest-to-limb bands remain readable for two-weapon comparisons and color-blind/high-contrast usage.
- [ ] 7.5 Verify tooltips never combine chest and limb values into a misleading single number.
- [ ] 7.6 Update `MAINTENANCE.md` and `CODE_DOCUMENTATION.md` for hit zones, importer/diff flow, damage provenance, and the explicit deferral of drag/flight simulation.
- [ ] 7.7 Add or confirm the frozen v1.3.1.0 archive link before publishing the new root.

### 8. Validation gates

- [ ] 8.1 Run `node scripts/validate-data.mjs` and expand it to require PP-19 cross-file coverage, valid hit-zone classes, provenance presence, and matching damage distance/value array lengths. Gravity/drag live-schema validation belongs to deferred Phase 6.
- [ ] 8.2 Run unit tests for damage/BTK, recoil effective values, spread fixtures, and attachment tiers. A ballistics-solver test suite belongs to deferred Phase 6.
- [ ] 8.3 Compare every weapon count and ID across weapons, attachments, magazines, ammo, recoil decay, and balance tables; require an attachment-audit status for every weapon.
- [ ] 8.4 Confirm existing shared URLs still resolve to the same attachments; only append to ordered attachment arrays and catalogs.
- [ ] 8.5 Spot-check at least one Assault Rifle, Carbine, SMG, LMG, DMR, sniper, shotgun, sidearm, burst weapon, and PP-19 in both comparison slots.
- [ ] 8.6 Verify chest/limb/head results at 0 m and around every relevant damage breakpoint.
- [ ] 8.7 Verify the four sniper sweet-spot windows and Mini Scout exception.
- [ ] 8.8 Test desktop/mobile layouts, chart bands, table ranges, tooltips, and version/archive links.
- [ ] 8.9 Perform a final provenance audit: no provisional 25/33 Sym values should be presented as confirmed v1.3.3.0 live damage.

## PP-19 in-game capture checklist — removed 2026-08-01

This section listed a full manual capture programme for the PP-19: every slot, an AP-cost
matrix, reload clips, and a body-zone damage test grid. It existed only because Sym.gg had not
yet published the weapon when the PP-19 was added, so its stats were going to be mocked up by
hand. Sym has since published them and the PP-19 is live and validator-covered, so the checklist
is obsolete rather than outstanding — it was removed to stop it reading as open work.

The same situation now applies to the BROD 3, EF88 and VSSM: captured in full but not yet
published by Sym. Do not restart a manual capture programme for them either. The attachment
corpus already holds everything the screenshots can give; what is missing is the simulation
internals only a datamine provides, itemised in section 4.14.

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

### Assault Rifle attachment audit checkpoint (2026-07-23)

- Captured: 11 Assault Rifles, 701 direct resized screenshots; EF88 has 63 resized screenshots and no retained full-resolution copies.
- Organized: canonical screenshot names applied with zero remaining rename moves, path escapes, stale paths, or collisions.
- Transcribed: 690 attachment-detail rows plus 11 overview rows. Enhanced field-specific OCR and exact visual-crop matching populate the workbook while retaining explicit null reasons for unreadable/obscured fields.
- Cleaned: known AK4D barrel subtype corrections, laser/light mappings, repeated descriptions, ADS artifacts, title leakage, and lowercase-start truncations are addressed.
- Review state: still provisional; no screenshot-derived Assault Rifle values have been promoted into live site data. Manual screenshot review, modifier derivation, and focused attachment tests remain open.

**Amended 2026-08-01** — two criteria below were written assuming no attachment value would be
promoted this release. Reload timing and barrel velocity now are, under the derived-model gates in
[§4.12](#412-derived-attachment-model-integration--2026-08-01). Add to the criteria:

- No known-wrong attachment value ships. The four confirmed live ADS errors in §4.12 are release
  blockers; the 68 unadjudicated tier mismatches are not, provided they remain inventoried and
  pinned rather than silently accepted.
- Every derived attachment value reproduces its screenshot reading, and the derived-versus-legacy
  equivalence and separability gates pass.

- The site contains 61 firearms: PP-19 has complete cross-file attachment/magazine/ammo coverage, and BROD 3/EF88 are the only explicitly labelled estimates.
- Recoil, spread/recovery, velocity, deploy/reload, and base drag are traceable to the pinned Sym.gg v1.3.3.0 JSON.
- Every weapon has an attachment-audit status, and every barrel/ammunition combination that changes velocity has a current v1.3.3.0 absolute value or an explicit `needs measurement` flag.
- Hit-zone and automatic headshot multipliers match EA's values.
- Sniper sweet spots match EA's revised ranges, not the stale JSON endpoints.
- No unverified 26/35 or legacy 25/33 damage value is presented as exact without provenance.
- Existing share links retain their attachment selections.
- All data validation, unit, UI, and archive checks pass.
