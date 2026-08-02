# Next session — ADS-move witness re-baseline and the BROD 3 / EF88 estimate plug

Written 2026-08-02, after `f39c2ca`. Everything described here is uncommitted work that has not
started. The repository is clean at the time of writing and every gate passes.

## Where the branch stands

`codex/update-1.3.3.0` at `f39c2ca` — "1.3.3.0: corpus corrections, ship-surface gate, migration
reorg". Working tree clean. Nothing is pushed; per `CLAUDE.md`, do not push without being asked.

| Check | Command | State |
|---|---|---|
| Data validator | `node scripts/validate-data.mjs` | passes, 59/59 weapons |
| Ship surface | `node scripts/validate-ship-surface.mjs` | passes |
| Ammo stat rules | `python scripts/validate-ammo-stat-rules.py` | passes, **0 violations** across 3,115 records |
| Test suite | `node --test "scripts/*.test.mjs"` | **71 pass / 6 fail** |

The 6 failures are all accounted for and all live in two files:

- `scripts/ads-move-phase2b-iii.test.mjs` — 3 pass / 4 fail. **This is Task 1 below.**
- `scripts/audit-phase0.test.mjs` — 10 pass / 2 fail. Long-standing; see the appendix.

There are no other known-failing checks.

---

## Task 1 — re-baseline `ads-move-phase2b-iii`

### What the test is

`scripts/ads-move-phase2b-iii.test.mjs` is a characterization ("witness") test. It enumerates every
composed case of *weapon × magazine × selectable grip × selectable ergonomic × available ammo* —
currently tens of thousands of rows — resolves ADS time, sprint recovery, ADS move speed and deploy
time for each through the real `applyAttachments` resolver, canonicalises the rows, and SHA-256
hashes them. The hash is compared against `scripts/ads-move-phase2b-iii-baseline.json`.

That design is genuinely valuable: it is the only check that proves the tier-ladder resolver
produces identical output for every reachable loadout. It is also, by construction, hostile to
*intentional* data changes — any correct fix to attachment data breaks it until the baseline is
regenerated.

### Why it is failing now

Every failure traces to legitimate, screenshot-verified data changes made in this session:

| Failing test | Assertion | Cause |
|---|---|---|
| `reconstructs the complete post-migration enumeration` | digest `08d8da9b…` ≠ `166e2eba…`; `scope`/`counts` deep-equal | new `sor556` 45-Rnd magazine (`magazineEntryCount` 265 → 266) plus the PSR / M2010 ESR / SV98 tier corrections |
| `anchors the complete pre-migration digest` | `scope` deep-equal, `magazineEntryCount` 266 vs 265 | same |
| `records source fidelity and the 44-weapon live population` | `sourceEvidence` deep-equal | corpus transcription corrections changed the recorded grip panel readings |
| `Phase 2b-iv converts base indices with strict full-enumeration zero-diff` | digest ≠ `PRE_PHASE4_DIGEST` | same as row 1 |

None of these indicate a resolver bug. The three tests that still pass are the ones that check
*relationships* rather than frozen values, and they are the ones worth keeping strict.

### A design flaw to be aware of before touching it

The "pre-migration" enumeration is **not** frozen history. `prePhase3Attachments()` (line 404)
builds it by taking the *current* `data/attachments.json` and reverting four grip fields. So
`PRE_PHASE3_DIGEST` drifts every time live attachment data changes, even though it is named and
treated as a historical anchor. The same applies to `PRE_PHASE4_DIGEST`.

This means the two hardcoded digest constants are not history — they are stale copies of a derived
value. Worth deciding whether to keep them at all (see options below).

### The mechanism to regenerate

The test already ships a baseline writer:

```bash
node scripts/ads-move-phase2b-iii.test.mjs --write-baseline
```

Lines 494–495 rewrite `scripts/ads-move-phase2b-iii-baseline.json` from the current model. **This
alone will not make the suite green** — five hardcoded constants sit outside the baseline file and
must be updated by hand:

| Location | Constant | Note |
|---|---|---|
| line 27 | `PRE_PHASE3_DIGEST = 'c5a6c3d2…'` | asserted at line 535 |
| line 28 | `PRE_PHASE4_DIGEST = '08d8da9b…'` | asserted at lines 606–607; current actual is `166e2eba98841607fbb7c70b247e97e82906d9a195acc31ee2b4d1752630c6e2` |
| lines 544–546 | `sourceCompleteWeaponCount 49`, `sourceShiftedWeaponCount 45`, `liveShiftedWeaponIds.length 44` | population counts |
| line 564 | `new Set(diffs.map(d => d.weaponId)).size === 44` | same population |
| lines 592, 612 | `clampCounts { sprintRecovery: 40, adsMove: 0, adsTime: 0, deploy: 435 }` | changes whenever magazines or weapons are added |

### ⚠️ Task 1 and Task 2 collide — do Task 2 first

`ads-move-phase2b-iii` hardcodes the fact that BROD 3 and EF88 are **not** live:

```js
assert.deepEqual(source.sourceOnlyShiftedWeaponNames, ['BROD 3', 'EF88']);   // line 548, also 363
assert.equal(source.liveShiftedWeaponIds.length, 44);                        // line 546
assert.equal(new Set(diffs.map(diff => diff.weaponId)).size, 44);            // line 564
```

`sourceOnlyShiftedWeaponNames` is computed as "weapons with complete source grip evidence that have
no live record". The moment Task 2 lands, that list becomes `[]` and the live shifted population
goes 44 → 46. Re-baselining before adding the weapons means doing the whole exercise twice.

**Recommended order: Task 2, then a single re-baseline.** If the weapons slip, re-baseline anyway —
a suite with known-red tests stops catching real regressions.

(Also note line 553, `assert.equal(attachments.WEAPON_ATTS.vssm, undefined)` — this stays valid,
VSSM is deliberately not being added.)

### Recommended approach

1. Capture the current digest and counts before touching anything, so the diff is reviewable.
2. Run `--write-baseline`.
3. Update the five constant sites above from the regenerated baseline.
4. **Review the baseline diff, do not just accept it.** The point of the exercise is to confirm the
   only rows that moved are the ones the data changes should have moved: `sor556` 45-Rnd cases,
   `psr` / `m2010esr` / `sv98` tier cases, and (after Task 2) the new `brod3` / `ef88` cases.
   Anything else changing is a real finding.
5. Consider deleting `PRE_PHASE3_DIGEST` / `PRE_PHASE4_DIGEST` and asserting against
   `baseline.preMigration.digest.value` only. They add no protection the baseline file does not
   already give, and they are the reason the file needs hand-editing after every regeneration.

---

## Task 2 — add BROD 3 and EF88 as explicitly-labelled estimates

### Why this is a plug, not a completion

Sym.gg has not published weapon stats for either weapon; both were added to the game in late July
2026. Plan §4.14 documents the fields the attachment corpus cannot supply, and correctly says "do
not add these three until Sym publishes." The user has since overridden that for BROD 3 and EF88
specifically, on the precedent of the PP-19 modelled after the PW5A3, **on condition that the site
labels them as estimates.** VSSM stays out until Sym publishes.

### The donor model, and how well it holds up

**BROD 3 ← GRT-BC**, with the recoil direction flipped. In game, BROD 3 kicks up-and-right where
GRT-BC kicks up-and-left. Both are Carbines.

**EF88 ← the exact midpoint of B36A4 and L85A3.** Both are Assault Rifles, as is the EF88.

The corpus corroborates the donor choice strongly. Panel readings for the bare weapon:

| Panel stat | GRT-BC | **BROD 3** | B36A4 | L85A3 | **EF88** |
|---|---|---|---|---|---|
| ADS time (ms) | 200 | **200** | 250 | 250 | **250** |
| Recoil amount (°) | 0.8 | **0.8** | 0.7 | 0.7 | **0.7** |
| ADS move mult | 0.67 | **0.67** | 0.6 | 0.6 | **0.6** |
| Sprint recovery (ms) | 133 | **133** | 167 | 167 | **167** |
| RPM | 830 | **830** | 720 | 635 | **675** |
| Recoil variation (°) | 26.1 | **24.3** | 28 | 22.8 | **20.4** |
| Reload (s) | 2.5 | **2.217** | 2.384 | 2.767 | **2.416** |
| Muzzle velocity (m/s) | 563 | **580** | 740 | 778 | **670** |

Every mobility/handling tier matches its donor exactly. That is the strongest possible evidence for
reusing the donor's simulation internals.

**One place the midpoint rule would have been wrong:** EF88 `recoilVar`. The B36A4/L85A3 midpoint is
25.4°; the measured value is **20.4°**, outside both donors. Always prefer the measured corpus value
over the interpolation where the corpus has one.

RPM confirms the `10800/n` rule: BROD 3 830 → `10800/13 = 830.769`; EF88 675 → `10800/16 = 675`.

### Values that are settled

Confirmed with the user, do not re-derive:

- **BROD 3 `recoilDir` = −16** (GRT-BC is +16; sign flipped for the up-right kick).
- **EF88 `recoilDir` = +12** (matches L85A3; the B36A4 is −15, so this is not a midpoint).
- **Spread dynamics are class-consistent** apart from spread-increase-per-shot. B36A4 and L85A3 have
  byte-identical `spreadDyn` blocks, so EF88 copies the Assault Rifle block directly; BROD 3 copies
  the GRT-BC Carbine block. Note GRT-BC's `spreadDyn.ads.inc` is 0.304 vs the AR 0.36 — the
  per-shot increase is the field that does vary, so carry the donor's rather than a class default.
- **`emptyRld` does not matter** — the site does not display it. Carry the donor's value.
- **Headshot multiplier 1.40** for both. The stat screen showing otherwise is an EA-acknowledged
  bug, already handled by `BUGGED_HEADSHOT_SCREEN` in `scripts/validate-ammo-stat-rules.py`.
- **`mag`**: the panel reports 30 for both, but live records store the chambered round — B36A4,
  L85A3 and GRT-BC are all panel-30 / live-31. Use **31**.

### Values that need a judgement call

- **`recoilV`.** The panel gives one decimal only; this is the precision limit the user flagged.
  Live values are precise floats (GRT-BC 0.80702, B36A4 0.72648, L85A3 0.67407). BROD 3 reads 0.8
  and GRT-BC's live value rounds to 0.8, so **adopt GRT-BC's float**. EF88 reads 0.7 and both donors
  round to 0.7, so **use the donor midpoint** (≈0.70027) — flag it, do not present it as measured.
- **`recoil.*.dirVarMult` / `dirVarExp`.** Not derivable from the panel; not a simple function of
  `dirVar` (GRT-BC 0.918691, B36A4 0.918362, L85A3 0.913643 for `dirVar` 26.1 / 28 / 22.8). Carry
  the donor's and mark as estimated. The recoil-variation tier ladder reads these, so getting them
  wrong makes variation attachments behave wrongly — this is the single weakest link in the plug.
- **`dmg`.** The validator hard-fails on a missing or empty `dmg`. The panel gives close-range
  damage 26 and long-range damage (BROD 3 14, EF88 17), which brackets the curve but does not give
  the breakpoint distances. Carry the donor's full curve and override the endpoints to the measured
  values. Keep `damageStatus: "provisional"` — the validator only accepts `provisional` or
  `verified` (`scripts/validate-data.mjs:84`).

### Files to touch — complete list

Adding a weapon touches seven files. Verified by scanning for per-weapon-id keys:

| File | What to add |
|---|---|
| `data/weapons.json` | the two weapon records |
| `data/attachments.json` | `WEAPON_ATTS[id]`, `WEAPON_MAG[id]`, `WEAPON_ERGO[id]` |
| `data/ammo.json` | `WEAPON_AMMO[id]` |
| `data/balance_tables.json` | `RECOIL_MULT[id]`, `HIP_CLS[id]`, `LIMB_CLASS[id]` |
| `data/recoil_decay.json` | `RECOIL_DEC[id]`, `RECOIL_DEC_TEXP[id]` — note only **two** tables are keyed per weapon here, not the three plan §4.14 lists |
| `ui/app.js` | the estimate note (below) |
| `migration/1.3.3.0/BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md` + `README.md` | 59 → 61 weapons; supersede §4.14 for these two |

`data/reload-exceptions.json` has no per-weapon key for the donors, so it likely needs nothing —
confirm against the reload model before assuming.

`WEAPON_ATTS` needs all five slot arrays present (`muzzle`, `barrel`, `laser`, `light`, `grip`) —
`REQUIRED_ATT_SLOTS` at `scripts/validate-data.mjs:319`. Both weapons have a Muzzle slot in the
corpus, so neither needs the empty-array treatment VSSM would.

**Share-link codec:** `sim/share-state.js` uses positional catalog tokens. Catalogs are
**append-only** — any new magazine entries must be appended, never inserted, or existing share links
silently decode to different loadouts.

The attachment tables all derive from the corpus: 62 records for BROD 3, 63 for EF88, covering
Muzzle, Barrel, Grip, Magazine, Ammo, Ergonomics, Laser and Light. Magazine tier shifts
back-calculate from the displayed ADS time, sprint recovery and ADS move speed, exactly as they were
for the existing 59.

### Marking them as estimates in the UI

There is **no existing provenance badge**. `damageStatus` and `damageSource` are stored on every
weapon but referenced nowhere in `ui/app.js` or `index.html` — verified by grep. So this is net-new
UI work, not a flag flip.

Two patterns already in the file are worth copying rather than inventing something:

- `updateAssumedFootnote()` at `ui/app.js:555` — removes and re-inserts
  `.att-note.assumed-note`, rendering "*Assumed stats until datamined attachment values are
  available.*" when any selected attachment carries `assumed: true`. This is the closest analogue:
  add an `estimated: true` flag on the weapon record and a parallel footnote.
- The `.wbadge` spans at `ui/app.js:645–654` put the weapon class next to the name in the stat
  header. An "ESTIMATED" badge belongs here — it is visible without scrolling and appears in
  compare mode for both slots.

Recommend doing both: badge for glanceability, footnote for the explanation ("Stats estimated from
similar weapons until Sym publishes full data for this weapon").

### Suggested order of work

1. Derive the two weapon records and all cross-file entries; write them in one atomic pass.
2. `node scripts/validate-data.mjs` — expect 61/61.
3. `python scripts/validate-ammo-stat-rules.py` — expect 0 violations still. Both weapons are
   already in `BUGGED_HEADSHOT_SCREEN`, and their corpus records were already being checked, so
   this should not move.
4. `node scripts/validate-ship-surface.mjs`.
5. UI badge + footnote; verify in the browser preview.
6. **Then** Task 1's re-baseline, once, with both weapons live.
7. Docs: plan §4.14 supersession, README weapon count, and a note in `MAINTENANCE.md` about what
   has to be replaced when Sym publishes.

---

## Appendix — the two long-standing `audit-phase0` failures

Not part of Tasks 1 or 2, but they are the rest of the red in the suite. Both are inventory pins
that no longer match the regenerated inventories:

| Test | Assertion | Actual vs pinned |
|---|---|---|
| `sweep pins inventoried model-tier and name-effect warnings and rejects other warnings` | `scripts/audit-phase0.test.mjs:116` | 15 vs 16 |
| `field-by-slot discovery remains unresolved-free and keeps all 24 SL9 values path-scoped` | `scripts/audit-phase0.test.mjs:431` | 12 vs 24 |

The four inventories regenerate cleanly and their current counts are:

```bash
node migration/1.3.3.0/attachment-audit/build-20260801-model-tier-mismatch-inventory.mjs
node migration/1.3.3.0/attachment-audit/build-20260801-field-slot-asymmetry-inventory.mjs
node migration/1.3.3.0/attachment-audit/build-20260801-name-effect-consistency-inventory.mjs
```

- model-tier-mismatch: 68 total, all 68 unadjudicated
- field-slot-asymmetry: 58 total (1 confirmed-corpus-error, 4 known-deferral, 39 out-of-scope,
  1 possible-dead-code, 13 unadjudicated)
- name-effect-consistency: 15 records; name-effect-coverage: 4 records

Before simply re-pinning: the SL9 count dropping 24 → 12 is a halving, which looks more like a
scoping change than a data correction. Worth understanding rather than accepting.

---

## Things deliberately left alone

- **VSSM** — stays out until Sym publishes. It also needs `"muzzle": []` when it does land.
- **Phase 6 ballistics** (drag / gravity) — deferred by the user for this release.
- **Repo leftovers** — the two `.xlsx` under `migration/1.3.3.0/` are now committed;
  `scripts/make-ledger-orphan-decision-sheet.py` still has a stale default output path;
  `scripts/validate-data.mjs:493` still reads from `migration/`, which couples CI to research data.
- **286 ledger orphans, 513 dead evidence paths, 127 field conflicts** — the residue of the path
  reconciliation. 13 dead paths were left dead deliberately: reviving them would regress records.
- **M60 naming** — the corpus calls it `M60` on purpose, to keep `/` out of Windows paths. The id
  `m60` matches on both sides. **Join corpus to live data by id, never by name.**
