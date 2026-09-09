# BF6 Weapon Analyzer Code Review Remediation Plan

**Created:** 2026-08-12
**Status:** Proposed; implementation has not started
**Scope:** Current `BF6 Weapon Analyzer` checkout and its shipped static site, runtime modules, validators, tests, CI, and maintained documentation

## 1. Objective

Resolve the concrete issues found during the full code and UI review while keeping this personal project fast, understandable, and inexpensive to maintain.

The target outcome is:

- a clean, authoritative test and validation path locally and in CI;
- a responsive overview that does not clip or become unnecessarily tall;
- accessible loadout and simulator controls;
- less iterative-design residue and duplicated logic;
- faster initial site loading without adding a framework or build system;
- accurate documentation and local run instructions;
- the current live site treated as the permanent go-forward baseline rather than an unfinished migration;
- a small, reusable attachment-audit reference package that runs only when explicitly requested;
- one-time migration, OCR, correction, and capture artifacts removed from the working tree but retained in a gitignored local archive;
- the published `v1.3.1.0/` and `v1.2.3.0/` sites retained so visitors can compare older game behavior;
- no loss of useful reference data or unrelated local work.

This is a simplification and correctness effort, not a rewrite.

## 2. Verified starting point

The plan is based on the review performed against the current checkout on 2026-08-12. The implementation stage must re-check these facts before editing because the worktree may change after this plan is written.

| Area | Starting observation |
|---|---|
| Git scope | `main` matched `origin/main` during review. The literal untracked file `${simPath}` was present and is now authorized for preservation inside the planned gitignored local archive. |
| Runtime data | The current shipped roster contained 62 weapons. Data validation passed. |
| Tracked tests | 52 tests were discovered; 51 passed and one field-slot inventory test failed. |
| Local default discovery | An ignored local taxonomy test was also auto-discovered, producing 56 total tests and 55 passes on this machine. |
| Failing contract | `field-slot-asymmetry-inventory.test.mjs` expected 55 inventory entries while the current derived inventory contained 46. This is a stale migration-era audit pin, not a live-site contract; it should be archived rather than repinned into the normal suite. |
| Ship surface | The ship-surface validator passed. |
| Ammo rules | 3,127 attachment records were checked with no reported violations. |
| Responsive UI | The overview clips horizontally at intermediate widths around 721–1100 px. At narrow widths it becomes excessively tall because groups stack and the stat grid is forced to one column. |
| Accessibility | The mobile loadout overlay lacks complete dialog/focus behavior; loadout selects lack programmatic labels; several selected states are visual-only; some small secondary text has marginal contrast. |
| Initial loading | The soldier target PNG is eagerly requested and decoded even when the target view is never opened. |
| Iterative residue | `ui/app.js` contains a dead duplicate share codec and a redundant runtime mutation already represented in JSON. |
| Test design | Most tests protect useful behavior. `spread-bar-scale.test.mjs` duplicates production calculation logic and source-pattern checks rather than testing one shared implementation. |
| Documentation | README and test documentation contain stale roster, VSSM, and test-count statements. |
| Local server | `serve.bat` announces port 5174 but starts the server on 5175; README instructs users to open 5174. |
| Repository size | `migration/` contains 171 tracked files and approximately 35.36 MiB. The attachment-audit subtree contains 131 `.mjs` scripts, 21 JSON files, 10 Python scripts, and one workbook; most are dated one-time correction artifacts. |
| Published history | `v1.3.1.0/` and `v1.2.3.0/` are live GitHub Pages archives, linked from the current homepage and sitemap. They total approximately 1.4 MiB and must remain tracked and published. |
| Validation coupling | `scripts/validate-data.mjs` currently imports `capture-corpus-lib.mjs` and reads the migration attachment JSON, so the audit must be decoupled before the migration tree can leave the tracked working tree. |

## 3. Operating rules

These rules apply to every implementation stage:

1. Re-check `git status --short`, the current branch, and the relevant source before editing.
2. Preserve unrelated modified and untracked files. The user has authorized moving the literal `${simPath}` file into the gitignored local archive as part of this cleanup, but not deleting it.
3. Keep each stage bounded. Every changed line must trace to a task in this plan.
4. Stop at the review gate after each stage unless the user explicitly authorizes a combined implementation pass.
5. Treat the validated current live data as the baseline. Do not rerun a migration or change weapon/attachment values merely to satisfy an obsolete audit pin.
6. Prefer existing validators and tests. Add a test only when it protects distinct behavior that cannot be covered more simply.
7. Do not add a framework, bundler, component library, generalized browser harness, or new deployment infrastructure.
8. Do not broadly split `ui/app.js`. Extract only a small, stable pure function when doing so removes real duplication or makes a behavior directly testable.
9. Move superseded tracked artifacts into `/.local-archive/` only after recording their original paths, sizes, and hashes. Add the archive path to `.gitignore` before moving anything.
10. Keep the two published version directories intact and continue validating their public archive links.
11. Preserve source-version facts when they are meaningful provenance, but remove language that frames the current site as an in-progress migration.
12. Do not commit, push, open a pull request, merge, or deploy unless the user explicitly requests that publication step.

## 4. Responsibility and decision matrix

### 4.1 What Codex can do end-to-end

Codex can perform all of the following without additional technical information from the user:

- re-establish and record the implementation baseline;
- inventory and classify every tracked migration, OCR, capture, generated-data, and historical-output artifact;
- create a hash-indexed gitignored local archive and move superseded material into it without deleting the local copies;
- extract the final attachment audit into a small tracked `reference-data/attachment-audit/` package;
- decouple live validation from screenshot/OCR data and provide an explicit ad-hoc audit command;
- consolidate current provenance and remove obsolete phase/migration language without erasing source facts;
- update CI so it runs the authoritative local validation path;
- remove the dead share codec and redundant grip mutation;
- centralize the spread-bar calculation and simplify its test;
- repair responsive overview behavior;
- add dialog, keyboard, labeling, selected-state, touch-target, and contrast improvements;
- defer the soldier target asset until it is actually needed;
- reconcile README, maintenance, code documentation, test documentation, and server instructions;
- run focused checks after each stage and the complete agreed validation set at the end;
- provide screenshots and a concise before/after report for visual review.

### 4.2 What is required from the user

Only the following decisions or evidence can require the user:

| ID | Required input | When it is needed | Recommended choice | Blocking? |
|---|---|---|---|---|
| U1 | Approve the responsive-density direction. | Before Stage 4, unless approval of this plan is treated as approval of its defaults. | Keep two stat cards per row on normal phones, stack each stat group full-width, and use one card per row only on unusually narrow screens. | Yes for the final visual treatment. |
| U2 | Confirm whether the final attachment-audit workbook should remain tracked alongside the canonical JSON. | Before Stage 1 moves files, unless approval of this revised plan accepts the default. | Keep both: JSON is the machine-readable reference and the workbook is the convenient human review surface. | No; the recommended default is safe. |
| U3 | Decide whether an artifact classified as ambiguous during the retention inventory is still useful. | Only if Codex cannot classify it from imports, documentation, Git history, and current workflow. | Archive it locally rather than delete it or keep it tracked. | Only for the ambiguous artifact. |
| U4 | Historical published site directories. | Resolved 2026-08-12. | Keep `v1.3.1.0/` and `v1.2.3.0/` tracked, linked, indexed, and published. | Resolved. |
| U5 | Visually accept the final desktop and mobile result. | At the Stage 4/5 review gate or final handoff. | Review the supplied screenshots at representative widths and one keyboard walkthrough summary. | Yes before calling the UI design approved. |
| U6 | Authorize publication actions. | Only after the implementation is accepted. | Explicitly request the desired combination of commit, push, PR, merge, and/or deployment. | Yes for publication; not for local remediation. |

The user has already established the core cleanup policy: current live data is the baseline; migration/OCR intermediates leave the tracked tree; attachment auditing is ad hoc; `${simPath}` is preserved in the local archive; and both published version archives remain live. If the revised plan is approved without changing U1 or U2, implementation should use their recommended defaults.

### 4.3 What is not required from the user

The user does not need to:

- choose CSS properties, breakpoints, module boundaries, or ARIA implementation details;
- identify which tests to keep or remove;
- run commands or install tooling;
- diagnose or repair the stale field-slot inventory; it is being retired from the normal suite;
- identify every one-time migration/OCR artifact manually;
- provide new designs, mockups, or color values unless the recommended visual direction is rejected;
- decide whether to adopt a framework—the plan explicitly avoids one.

## 5. Target repository structure and disposition rules

The cleanup should classify files by present-day purpose, not by age alone.

### 5.1 Tracked live product

Keep the code and data required to run, validate, understand, and publish the current site:

- `index.html`, `ui/`, `sim/`, `assets/`, `vendor/`, and current `data/` files;
- current schemas and compact current-baseline provenance used by live validation;
- behavior-focused runtime tests and validators;
- CI, ship-surface manifest, sitemap, and current documentation;
- `v1.3.1.0/` and `v1.2.3.0/` as deliberately published historical game-version snapshots.

### 5.2 Tracked attachment-audit reference package

Create `reference-data/attachment-audit/` as a self-contained, explicitly invoked package containing only:

- the final canonical `attachment-screenshot-review.json`;
- `BF6_Attachment_Stats_Review.xlsx` as the human-readable reference, using the recommended U2 default;
- the attachment-review schema or a stable link to the shared schema;
- a short `README.md` describing purpose, source-path identity, update workflow, and explicit commands;
- the smallest reusable validator needed to check schema, unique record identity, valid status fields, and internal counts without pinning the old 62-weapon/3,189-record totals;
- the workbook builder if it can regenerate the workbook from the canonical JSON without importing the old correction pipeline.

The package must not be imported by the live application, `validate-data.mjs`, the default JavaScript test command, or CI. It is reference material and an operator-invoked check for future weapons/attachments.

### 5.3 Gitignored local archive

Create a root `/.local-archive/` path and add it to `.gitignore`. Use a dated subdirectory such as `/.local-archive/2026-08-12-live-baseline/` containing:

- the complete former `migration/1.3.3.0/` tree after the final audit reference files are extracted;
- one-time `apply-*`, `verify-*`, `repair-*`, `reconcile-*`, `render-*`, OCR, contact-sheet, recapture, and dated inventory tooling;
- obsolete phase/migration manifests, pre-migration snapshots, decision workbooks, and handoff plans;
- version-specific generated Sym reconciliation output no longer required by current validation;
- superseded generated workbooks and analysis outputs;
- the literal `${simPath}` provisional dataset;
- local-only taxonomy/OCR tests and helpers that no longer protect the live product;
- any preview or experiment that is confirmed to have no live, documentation, or maintained-development consumer.

The archive must include `ARCHIVE_MANIFEST.json` or `ARCHIVE_MANIFEST.md` with each moved item’s original repository-relative path, byte size, SHA-256, disposition reason, and replacement path if one exists. Git history remains the durable remote record; the ignored archive is a convenient local reference copy.

### 5.4 Remove from tracked history going forward, but do not locally delete

Once hash verification succeeds, the original tracked paths should be removed from the current tree through the move into `/.local-archive/`. This intentionally produces Git deletions for superseded material while retaining local copies. Do not use broad delete, reset, or clean commands.

### 5.5 Current provenance policy

- Consolidate migration-phase provenance needed by current validation into compact, present-tense records such as `data/provenance/live-baseline.json` and `data/provenance/estimated-weapons.json`.
- Preserve source version, retrieval date, URL, hash, and measured/estimated status when those facts remain relevant.
- Remove obsolete “phase,” “cutover,” “migration,” “partial no-go,” and superseded-workflow fields from the current contract; retain the full originals in the local archive.
- Replace pointers to dated correction scripts with stable evidence identities, such as an attachment-audit record key or `Weapon Attachments/...` suffix.
- Update `data/ballistics.json`, `data/reload-exceptions.json`, and validators so no current contract depends on an archived path.

## 6. Staged implementation plan

## Stage 0 — Reconfirm baseline and isolate scope

**Owner:** Codex
**User input:** None
**Purpose:** Ensure the implementation starts from the same project state as the review.

### Tasks

- [ ] Record the current branch, commit, upstream relationship, and `git status --short`.
- [ ] Confirm the literal `${simPath}` artifact is still untracked and record its size and SHA-256 before its planned archival.
- [ ] Recount the current runtime roster and verify the status/provenance fields for BROD 3, EF88, and VSSM.
- [ ] Run the existing baseline commands without changing files:
  - [ ] `node scripts/validate-data.mjs`
  - [ ] `node scripts/validate-ship-surface.mjs`
  - [ ] the tracked test set
  - [ ] the repository-default `node --test` discovery path
- [ ] Record command durations and failures so later performance claims use a comparable baseline.
- [ ] Confirm whether any new user changes overlap files named in later stages.
- [ ] Verify both published archives still resolve locally and at their GitHub Pages URLs.

### Acceptance criteria

- The implementation scope is documented and no unrelated file has changed.
- Any drift from the verified starting point is explained before proceeding.
- The exact authoritative test command is known for Stage 2.

### Stop condition

Stop if current data, schema, branch, or worktree state materially differs from the reviewed checkout and would change the remediation design.

---

## Stage 1 — Establish the live baseline and clean repository boundary

**Owner:** Codex; user only for an ambiguous retention decision
**User input:** U2 uses the recommended default; conditional U3
**Purpose:** Make the current live state the only normal development baseline while preserving useful history locally and retaining the published site archives.

### 1A. Build the retention inventory before moving files

- [ ] Enumerate every tracked file under `migration/`, `generated-data/`, `outputs/`, version-specific provenance, and phase/migration-named scripts.
- [ ] Trace imports, file reads, documentation links, CI references, ship-surface entries, and live HTML links for every candidate.
- [ ] Classify each item as:
  - **live product** — required by the current site or normal validation;
  - **published archive** — required for `v1.3.1.0/` or `v1.2.3.0/`;
  - **attachment reference** — final reusable audit data or a minimal ad-hoc tool;
  - **local historical archive** — useful context but no longer part of normal work;
  - **ambiguous** — purpose cannot be proven from current consumers or history.
- [ ] Produce the proposed disposition table before any move.
- [ ] Ask U3 only for ambiguous files; default to local archival rather than deletion.

### 1B. Create and verify the local archive

- [ ] Add `/.local-archive/` to `.gitignore` with a concise explanation.
- [ ] Create the dated archive directory and manifest outside any tracked runtime path.
- [ ] Record original path, size, SHA-256, reason, and replacement for every moved artifact.
- [ ] Move the complete one-time migration/OCR/correction workflow into the archive without deleting the local copy.
- [ ] Move `${simPath}` into the archive and verify its hash against the pre-move value.
- [ ] Move superseded generated reconciliation output, phase manifests, intermediate workbooks, and local-only OCR/taxonomy checks into the archive.
- [ ] Re-run the manifest verifier and confirm every listed archived file exists at the recorded destination.
- [ ] Do not move `v1.3.1.0/` or `v1.2.3.0/`.

### 1C. Create the final attachment reference package

- [ ] Move the final canonical JSON and workbook to `reference-data/attachment-audit/` using Git-aware moves.
- [ ] Retain or relocate the schema so the JSON `$schema` pointer resolves from the new path.
- [ ] Write a short package README that clearly labels the data as a completed reference snapshot, not a runtime dependency or normal test fixture.
- [ ] Retain only a generic reference validator and workbook builder; archive dated correction, OCR, recapture, and inventory scripts.
- [ ] Make future counts data-derived so adding weapons or attachments does not require repinning old totals.
- [ ] Document the future workflow: add captures locally, update/review the reference JSON, run the explicit audit command, regenerate/review the workbook, promote approved values into live `data/`, then run normal product validation.
- [ ] Update any temporary retained consumers to the new reference path within this stage so no command is left pointing at the removed migration tree; Stage 2 then removes that temporary product/audit coupling.

### 1D. Rebase current provenance and paths

- [ ] Consolidate current source/estimate metadata into compact go-forward provenance files.
- [ ] Preserve facts such as source version `1.3.3.0` where they identify the origin of a current value, but stop presenting the site as being in a 1.3.3.0 migration phase.
- [ ] Replace current references to archived correction scripts with stable reference-data record IDs or screenshot suffixes.
- [ ] Remove current code/document links to migration plans, phase manifests, and archived generated output.
- [ ] Update ship-surface classifications while preserving both published version archives.

### Acceptance criteria

- The current site and normal development workflow have no dependency on `migration/`.
- The migration tree and one-time OCR/correction artifacts are absent from the tracked working tree and present in the hash-verified local archive.
- `${simPath}` is preserved in the archive, not deleted.
- The attachment reference package is self-contained and ready for explicit use; any temporary product-validator dependency is documented for removal in Stage 2.
- Current provenance remains accurate without migration-phase framing.
- Both historical site versions remain tracked, linked, indexed, and locally valid.
- No weapon or attachment value changes as part of repository reorganization.
- The normal product checks are no worse than the recorded baseline, and no failure is caused by a missing moved path.

### Review artifact and stop condition

Provide the complete disposition summary: retained tracked files, new reference package, archived file count/size, path rewrites, and ambiguous items. Stop before moving any ambiguous item until U3 is resolved.

---

## Stage 2 — Separate product validation from the ad-hoc audit and align CI

**Owner:** Codex
**User input:** None
**Depends on:** Stage 1 disposition and reference paths are accepted
**Purpose:** Give the live product a small deterministic validation path while keeping the completed screenshot audit available only by explicit request.

### Tasks

- [ ] Remove attachment-corpus imports and screenshot fixture reads from `scripts/validate-data.mjs`.
- [ ] Extract only the current reload-exception parsing/cross-reference logic needed by product validation into a small current-purpose helper; do not retain the audit library under a new name.
- [ ] Keep live invariants in `validate-data.mjs`: schemas, IDs, cross-references, finite/range rules, current provenance states, attachment availability, and runtime data consistency.
- [ ] Move screenshot/model comparisons, field-slot discovery, OCR taxonomy, fixed corpus totals, recapture counts, and dated inventory pins to the ad-hoc reference command or the local archive.
- [ ] Retire `capture-corpus-integrity.test.mjs` and the failing field-slot inventory assertion from default test discovery rather than repinning them.
- [ ] Provide one explicit command, for example `node reference-data/attachment-audit/validate-reference.mjs`, that validates the retained audit snapshot only when requested.
- [ ] Keep `validate-ammo-stat-rules.py` with the reference package only if it remains generic and useful for future additions; otherwise archive it.
- [ ] Update `.github/workflows/validate-data.yml` to use the same supported Node version as the project’s local workflow.
- [ ] After retiring migration-baseline comparisons, use shallow checkout unless a retained product test demonstrably requires Git history. Do not fetch full history by default without that reason.
- [ ] Run these independent contracts in CI with clear step names:
  - [ ] `node scripts/validate-data.mjs`
  - [ ] `node scripts/validate-ship-surface.mjs`
  - [ ] the tracked JavaScript test command established in Stage 0
- [ ] Use an explicit product-test glob or file list so ignored/local audit tools cannot silently change the clean-checkout test count.
- [ ] Avoid adding browser automation or a second validation framework.
- [ ] Do not run the attachment reference validator, workbook builder, OCR tooling, or Python deep audit in CI.
- [ ] Validate the workflow syntax and run all referenced commands locally.

### Acceptance criteria

- A clean checkout runs the same required correctness contracts locally and in CI.
- CI fails when data validation, the ship surface, or a tracked test fails.
- The workflow does not depend on ignored files or machine-specific paths.
- `validate-data.mjs`, the default test command, and CI succeed when the optional attachment reference package is not invoked.
- The explicit attachment reference command succeeds against the retained canonical snapshot.
- The added runtime remains proportionate for a small personal project.

### Review gate

Show the workflow diff and local command results before moving to code simplification.

---

## Stage 3 — Remove iterative code residue and simplify low-value test duplication

**Owner:** Codex
**User input:** None
**Purpose:** Reduce maintenance cost without undertaking a risky architectural rewrite.

### 3A. Share-state duplication

- [ ] Confirm the runtime imports and uses `sim/share-state.js` for the current share codec.
- [ ] Remove the dead duplicate codec block from `ui/app.js`, including unused `encodeAtts`/`decodeAtts` helpers.
- [ ] Confirm all share URL round-trip, compatibility, and malformed-input tests still pass.
- [ ] Do not change the public share format in this stage.

### 3B. Redundant runtime data mutation

- [ ] Verify the four grip records already contain the same `adsMoveSpeedTierShift` value in canonical JSON.
- [ ] Remove the duplicate mutation in `ui/app.js`.
- [ ] Run the data validator and ADS-move/loadout tests.
- [ ] Do not migrate or rewrite the surrounding JSON.

### 3C. Spread-bar test design

- [ ] Identify the smallest stable home in the existing `sim` modules for the pure effective-spread-max calculation and its sample-count constant.
- [ ] Export that production implementation and have `ui/app.js` call it.
- [ ] Update `spread-bar-scale.test.mjs` to import and test the shared implementation.
- [ ] Remove the duplicate test-side algorithm and source-regex assertion.
- [ ] Compute any corpus-wide maximum once and reuse it for related assertions instead of rescanning the corpus.
- [ ] Keep assertions that prove distinct behavior: formula correctness at representative inputs and adequate scale headroom across the actual corpus.

### 3D. Residual migration/audit dependency check

- [ ] Search current runtime, validators, product tests, CI, and documentation for archived path names and migration-phase terminology.
- [ ] Confirm the ignored taxonomy test and related OCR helpers reside only in the local archive.
- [ ] Confirm the attachment reference command is not matched by default product-test discovery.
- [ ] Remove stale `.gitignore` exception rules for audit tests or migration artifacts that are no longer tracked.
- [ ] Do not replace archived tests with equivalent source-pattern-only tests.

### Acceptance criteria

- The application has one share-codec implementation and one spread-max implementation.
- The redundant grip mutation is gone with no behavior change.
- Default test discovery is deterministic on both a clean checkout and the current workstation.
- All retained tests have a distinct regression-protection purpose.
- No broad `ui/app.js` reorganization or cosmetic refactor is included.

### Review gate

Provide the deleted-line count, the new shared-function location, test timing, and a one-sentence reason for every test changed or retained in this stage.

---

## Stage 4 — Repair responsive overview layout

**Owner:** Codex
**User input:** U1 and later U5
**Purpose:** Eliminate clipping and excessive vertical growth while preserving the established desktop presentation.

### Recommended layout contract

- Desktop at 1280 px and wider should remain visually unchanged except for incidental overflow fixes.
- Intermediate widths should wrap or reflow complete stat groups before any card clips.
- At 720 px and below, each stat group should use the available width instead of remaining content-width because of `align-items: start`.
- Normal phone widths should retain a two-column stat-card grid where labels remain legible.
- Only unusually narrow widths should fall back to one card per row.
- No page-level horizontal scrolling should be introduced.

### Tasks

- [ ] Reproduce and capture the baseline at 1440, 1280, 1100, 1000, 981, 980, 900, 768, 721, 720, 430, and 390 px.
- [ ] Adjust `.sgrow`, `.sgroup`, and `.sgrid` sizing/wrapping rules so groups participate in the available width.
- [ ] Add the narrowest breakpoint needed for the intermediate-width transition; do not proliferate near-duplicate media queries.
- [ ] Replace the blanket phone single-column grid with the recommended two-column layout and a very-narrow fallback only if visual inspection demonstrates it is necessary.
- [ ] Check long labels, estimated-value markers, units, and help affordances for wrapping or overlap.
- [ ] Verify the overview height is materially reduced on phones without making cards cramped.
- [ ] Preserve the existing desktop visual hierarchy, colors, and information density.

### Acceptance criteria

- No stat card, label, or group is clipped at any listed viewport.
- There is no unintended horizontal overflow.
- Phone overview height is reduced relative to the baseline and remains readable.
- Desktop comparison screenshots show no material regression.
- No JavaScript layout measurement or new responsive library is introduced.

### Review artifact and gate

Provide paired screenshots at 1440, 1000, 720, and 390 px plus an overflow/height summary. User visual acceptance U5 is required before the UI is considered final.

---

## Stage 5 — Complete mobile loadout accessibility and small-control polish

**Owner:** Codex
**User input:** U5 for final appearance only
**Purpose:** Make the mobile experience keyboard- and screen-reader-usable without changing the product’s interaction model.

### 5A. Responsive loadout dialog

- [ ] Give the responsive overlay a dialog role, modal state, and accessible title relationship.
- [ ] When opened, move focus to the close control or first meaningful loadout control.
- [ ] Trap keyboard focus inside the modal while it is open.
- [ ] Close on Escape using the same state transition as the visible close control.
- [ ] Restore focus to the exact opener when closed.
- [ ] Prevent background content from remaining keyboard/screen-reader interactive while the modal is open, using supported `inert`/ARIA behavior with minimal fallback code.
- [ ] Preserve the desktop non-modal behavior.

### 5B. Form labels and selected states

- [ ] Associate every attachment select with its visible slot label using generated stable IDs and `<label for>`, or an equally direct programmatic relationship.
- [ ] Expose selected class, weapon, and simulator-mode states programmatically, using `aria-pressed`, `aria-selected`, or the correct native pattern for the existing control.
- [ ] Give related toggle sets a concise accessible group name where needed.
- [ ] Keep visible labels and interaction wording unchanged unless a correction is required for clarity.

### 5C. Contrast, type, and touch targets

- [ ] Increase contrast for marginal secondary text such as recoil subtitles and the target note while retaining the existing palette.
- [ ] Ensure mobile interactive controls have a practical touch target, preferably at least 44 CSS px in the narrow layout.
- [ ] Do not globally enlarge dense desktop controls.
- [ ] Preserve visible focus styles and verify they are not clipped.

### Validation

- [ ] Keyboard-only walkthrough: open, navigate, change selections, close with Escape, and confirm focus restoration.
- [ ] Screen-reader-oriented DOM inspection for names, roles, values, and selected states.
- [ ] Mobile pointer/touch walkthrough at 390 and 430 px.
- [ ] Contrast checks for changed color pairs.
- [ ] Existing loadout and simulator tests.

### Acceptance criteria

- Every select has a stable accessible name.
- The responsive overlay behaves as a modal dialog and does not strand focus.
- Selected states are not color-only.
- Changed secondary text meets WCAG AA normal-text contrast where applicable.
- Touch improvements do not materially reduce desktop information density.

### Review gate

Provide the keyboard walkthrough result, changed contrast ratios, and final mobile screenshots for U5.

---

## Stage 6 — Defer the soldier target asset until first use

**Owner:** Codex
**User input:** None
**Purpose:** Improve initial load and memory use with a small targeted change.

### Tasks

- [ ] Trace all calls to the target image readiness API and the initial application boot path.
- [ ] Change `sim/target.js` so importing the module does not start loading the soldier target image.
- [ ] Trigger the load only when the target view is first opened or target rendering first requires it.
- [ ] Keep a single cached load promise so repeated view changes do not issue duplicate requests.
- [ ] Render the current fallback state immediately and request one redraw when the image becomes ready.
- [ ] Preserve failure handling so a missing image does not break the rest of the simulator.
- [ ] Keep the PNG on the ship-surface allowlist; this is deferred loading, not asset removal.

### Validation

- [ ] Initial page load does not request the soldier target PNG.
- [ ] First opening of the target view requests it once.
- [ ] The target redraws correctly after the image loads.
- [ ] Reopening the target view does not reload the image.
- [ ] Target geometry, hit-zone, and rendering tests pass.
- [ ] Record the before/after initial transferred bytes and decoded-image memory estimate.

### Acceptance criteria

- Users who never open the target view do not pay its network/decode cost.
- Target behavior is unchanged after first use.
- No general asset loader, prefetch framework, or service worker is added.

### Review gate

Show a concise network comparison and the target-view functional check.

---

## Stage 7 — Reconcile documentation and local workflow

**Owner:** Codex
**User input:** None, unless the user prefers port 5175
**Depends on:** Functional stages are complete so documented numbers are final
**Purpose:** Describe the current site as the maintained baseline, with historical versions and the optional attachment reference clearly separated.

### Tasks

- [ ] Update README roster statements to the current validated weapon count.
- [ ] Correct the status/provenance wording for BROD 3, EF88, and VSSM so no current estimate is described as excluded or measured.
- [ ] Replace stale hard-coded test-count and pass-count claims with the verified final tracked-suite result, or describe the command contract without fragile counts where counts add no value.
- [ ] Update `docs/TESTS.md`, maintenance notes, and code documentation only where the implemented behavior changed.
- [ ] Document the authoritative local and CI commands in one primary location and link to it rather than duplicating long command lists.
- [ ] Rewrite the top-level project tree and data-flow descriptions around **live product**, **published historical versions**, **attachment reference**, and **local archive** rather than migration phases.
- [ ] Remove links to the 1.3.3.0 migration plan, derived-model phase documents, OCR correction receipts, and dated inventory workflows from normal maintenance documentation.
- [ ] Keep source-version facts where they explain the origin of current data, but describe the live values as the baseline now in use.
- [ ] Add a concise `reference-data/attachment-audit/README.md` with the explicit ad-hoc validation and workbook commands for future weapons/attachments.
- [ ] Document that `/.local-archive/` is intentionally local, ignored, recoverable from this workstation or Git history, and never required for build/test/deploy.
- [ ] Preserve and document the purpose of `v1.3.1.0/` and `v1.2.3.0/`: public comparisons of weapon behavior in older game versions.
- [ ] Make the local server port consistent. Recommended default: change `serve.bat` to actually use 5174 because README and the printed message already use it.
- [ ] Remove stale `.gitignore` commentary for tests or helpers that no longer exist, without changing unrelated ignore behavior.
- [ ] Do not expose `${simPath}` as a current project artifact; record its original identity only in the ignored archive manifest.

### Acceptance criteria

- All documented commands work from a clean checkout.
- Roster, status, test, and port statements match the final code and data.
- Normal documentation does not refer readers to a migration workflow.
- The documentation distinguishes runtime assets, published older versions, optional attachment reference data, and ignored local history.
- No duplicate or soon-to-drift validation instructions are introduced.

### Review gate

Show the documentation diff separately from code changes and identify every factual number that was refreshed.

---

## Stage 8 — Integrated verification and handoff

**Owner:** Codex
**User input:** U5 for UI acceptance; U6 only if publication is desired
**Purpose:** Prove the combined result without adding permanent validation machinery.

### Required checks

- [ ] `git diff --check`
- [ ] `node scripts/validate-data.mjs`
- [ ] `node scripts/validate-ship-surface.mjs`
- [ ] the final tracked JavaScript test command
- [ ] repository-default test discovery, confirming it is deterministic
- [ ] the explicit attachment-reference validator, run separately and clearly labeled ad hoc
- [ ] local-archive manifest verification, including `${simPath}`
- [ ] share-state round-trip and compatibility tests
- [ ] ADS-move/loadout tests affected by removal of the redundant mutation
- [ ] target rendering/loading tests
- [ ] responsive screenshot matrix from Stage 4
- [ ] keyboard/accessibility walkthrough from Stage 5
- [ ] initial-load network comparison from Stage 6
- [ ] local and live checks for `v1.3.1.0/` and `v1.2.3.0/`
- [ ] `git status --short` confirming only intended tracked changes and the ignored archive boundary

### Performance comparison

Record before/after values for:

- complete tracked test runtime;
- initial page transferred bytes;
- whether the target PNG is fetched on initial load;
- overview height at 390 and 720 px;
- presence of horizontal overflow at the tested widths;
- number of production implementations of the share codec and spread-max calculation.

These measurements should demonstrate the effect of the changes. They should not become a permanent benchmark suite unless a repeatable material regression is later observed.

### Final acceptance criteria

- All required validators and tracked tests pass.
- CI invokes the same required contracts.
- No reviewed responsive viewport clips or scrolls horizontally.
- The mobile loadout is keyboard- and screen-reader-operable.
- The target asset is loaded on demand.
- Dead duplicate logic and the redundant mutation are removed.
- Documentation matches the shipped state.
- No normal runtime, validator, product test, CI, or documentation path depends on `migration/` or the local archive.
- The final attachment audit remains available as an explicit reference check.
- One-time migration/OCR artifacts and `${simPath}` are preserved in the verified ignored archive.
- Both published historical version sites remain available.
- Unrelated local work remains unchanged.
- The user has accepted the visual result.

### Publication boundary

At this point Codex can prepare a precise file list and proposed commit message. No staging, commit, push, PR, merge, or deployment occurs until U6 is explicitly provided.

## 7. Test-retention policy

The review did **not** support a broad test purge. The suite is small and generally fast. The implementation should use this policy:

### Keep

- behavioral tests for ballistics, recoil, attachments, ammo mappings, target geometry, share-state compatibility, importers, and shipped data contracts;
- regression tests for calculations with multiple interacting inputs.
- compact live-data guards whose failure would indicate a real current product defect.

### Simplify

- tests that independently reimplement the same production formula;
- duplicate corpus scans inside one test module;
- brittle source-regex checks when the underlying exported behavior can be tested directly;
- documentation that duplicates exact test counts in several places.

### Remove or exclude from default discovery

- a test that provides no distinct assertion beyond another tracked test;
- capture-corpus, OCR, taxonomy, recapture, field-slot inventory, and dated warning-inventory tests from the completed migration workflow;
- fixed assertions for the old 62-weapon/3,189-record attachment snapshot;
- a local operator/audit script accidentally discovered as a product test;
- source-pattern assertions that only enforce a particular implementation shape and do not protect user-visible behavior.

### Keep as an explicit ad-hoc reference check

- schema validation of the final attachment reference JSON;
- unique stable record identity and internally consistent derived counts;
- status/provenance validity and source-path portability;
- generic ammo-stat or workbook consistency checks that will remain useful when new weapons/attachments are added.

These checks must be invoked by a named attachment-audit command and must not be part of `node --test`, `validate-data.mjs`, CI, or deployment validation.

### Do not add

- a browser automation stack solely for this remediation;
- snapshot tests for large HTML/CSS output;
- a second fixture representing data already covered by the canonical corpus;
- timing thresholds likely to be flaky across machines;
- tests that only assert supplied literal text or static numbers already checked by a validator.

Every added or materially expanded test must have a written one-sentence regression rationale in the stage handoff.

## 8. Explicitly out of scope

The following are deliberately excluded because their cost or risk exceeds their value for this project:

- migrating to React, Vue, Svelte, or another UI framework;
- introducing TypeScript, a bundler, or a build pipeline solely for organization;
- a wholesale breakup of the 2,864-line `ui/app.js` file;
- redesigning the desktop visual language;
- replacing the established Soldier Stats/loadout interaction model;
- deleting local historical evidence after it has been archived;
- removing, redirecting, or altering the published `v1.3.1.0/` and `v1.2.3.0/` sites;
- re-running the completed OCR/correction pipeline against current data;
- making the attachment reference check part of normal tests or CI;
- rewriting accurate source-version facts merely to remove the string `1.3.3.0`;
- changing weapon values without an evidence-backed defect;
- publishing changes or modifying remote state;
- adding analytics, monitoring, or new hosted services.

Future extraction from `ui/app.js` is justified only when a stable functional area must change for a real feature or when duplication demonstrably causes defects. File length alone is not sufficient justification.

## 9. Risk and rollback approach

| Risk | Mitigation | Rollback unit |
|---|---|---|
| Archiving a still-consumed file | Complete consumer scan and disposition table before moving anything | Stage 1 file group |
| Losing local historical material | Record SHA-256 and size before/after each move; never delete the archive | Stage 1 archive group |
| Weakening product validation while removing audit coupling | Promote current invariants into product validation before retiring corpus checks | Stage 2 validation diff |
| Breaking historical public URLs | Keep both version directories, homepage links, sitemap entries, and ship-surface declarations | Stage 1 published-archive check |
| Breaking old shared URLs | Retain compatibility tests and keep the wire format unchanged | Stage 3A share cleanup |
| Responsive fix regresses desktop | Screenshot comparison at 1440/1280 plus intermediate widths | Stage 4 CSS-only diff |
| Modal accessibility changes desktop behavior | Activate modal semantics only in responsive overlay mode | Stage 5 dialog diff |
| Lazy loading leaves target blank | Cached promise, fallback render, and one redraw on readiness | Stage 6 target-loading diff |
| Documentation drifts during implementation | Update docs after functional stages and verify every command | Stage 7 documentation diff |
| Unrelated local artifact is lost | Explicit archive manifest plus repeated `git status` checks | No unmanifested move permitted |

Each stage should remain separately reviewable in the working diff. If the user later requests commits, prefer one focused commit per accepted stage or one compact remediation commit only if the final diff remains easy to audit.

## 10. Proposed execution order and dependencies

```text
Stage 0: Baseline
    |
Stage 1: Live baseline, reference package, and local archive
    |
Stage 2: Product/audit validation split and authoritative CI
    |
Stage 3: Dead code and test simplification
    |
Stage 4: Responsive layout -----> User visual review
    |
Stage 5: Accessibility polish --> User visual/interaction acceptance
    |
Stage 6: Lazy target asset
    |
Stage 7: Documentation and local workflow
    |
Stage 8: Integrated verification --> Optional publication authorization
```

Stages 4 and 5 are intentionally adjacent so their mobile screenshots and user review can be combined. Documentation remains late in the sequence so it records the final behavior rather than being repeatedly rewritten. The published version directories remain outside the cleanup flow except for link verification.

## 11. Estimated implementation profile

This is a moderate, bounded cleanup rather than a large rebuild.

| Stage | Relative effort | Primary uncertainty |
|---|---:|---|
| 0. Baseline | Small | Worktree drift |
| 1. Live-baseline cleanup | Large | Classifying residual consumers before moving 35+ MiB of tracked history |
| 2. Validation/CI split | Medium | Preserving every current invariant while removing audit coupling |
| 3. Code/test simplification | Small–medium | Correct boundary for the shared spread calculation |
| 4. Responsive layout | Medium | Best breakpoint and density after real-browser inspection |
| 5. Accessibility | Medium | Focus management across responsive/desktop mode changes |
| 6. Lazy target asset | Small | Correct redraw timing on first load |
| 7. Documentation | Small | Final test counts and status wording after prior stages |
| 8. Verification | Medium | Cross-viewport manual checks |

The cleanup direction and published-archive policy are resolved. The likely Stage 1 blocker is only an artifact whose present-day purpose remains ambiguous after dependency and history inspection. The only expected subjective product decision is the mobile density direction in U1, with a recommended default already supplied.

## 12. Progress ledger

Update this section only while implementing the plan.

- [x] 2026-08-12 — Full code, test, efficiency, debt, and UI review completed.
- [x] 2026-08-12 — Remediation plan written; no application changes made.
- [x] 2026-08-12 — Cleanup direction added: live baseline, ad-hoc attachment reference, local archive for migration/OCR intermediates, and published older versions retained.
- [x] Stage 0 baseline recorded against `main` / `origin/main` at `7907352`.
- [x] Stage 1 completed: ignored hash-manifested archive, current reference package, and live provenance created.
- [x] Stage 2 completed: normal validation and CI no longer read attachment/capture history.
- [x] Stage 3 completed: duplicate share/spread logic and obsolete high-cost witnesses removed.
- [x] Stage 4 completed: responsive wrapping and phone two-card layout verified at 1440/1000/720/390 px.
- [x] Stage 5 completed: labels, pressed states, contrast, touch targets, and modal keyboard behavior verified.
- [x] Stage 6 completed: target image verified absent at startup and loaded on first target-view selection.
- [x] Stage 7 completed: normal documentation rewritten around the current product and reference boundary.
- [x] Stage 8 passed: data, ship-surface, 26 product tests, reference check, diff check, and browser walkthrough passed.
- [ ] Publication explicitly authorized, if desired.

## 13. User approval checklist

To begin implementation with the recommended defaults, the user only needs to confirm:

- [x] Proceed with this staged plan.
- [x] Use the recommended mobile layout: full-width groups, two stat cards per row on normal phones, one card per row only when necessary.
- [x] Treat the current live data as the go-forward baseline and remove migration framing from normal work.
- [x] Keep the final attachment audit as reference data with an explicit ad-hoc check, outside normal tests and CI.
- [x] Move superseded migration/OCR/capture artifacts and `${simPath}` into a gitignored, hash-manifested local archive rather than deleting them.
- [x] Keep `v1.3.1.0/` and `v1.2.3.0/` tracked and publicly available for historical comparison.
- [x] Use the recommended attachment-reference contents: canonical JSON, human-readable workbook, schema, README, minimal validator, and workbook builder.

During implementation, Codex will ask again only if Stage 1 finds a genuinely ambiguous artifact, or when visual acceptance/publication authorization is required.
