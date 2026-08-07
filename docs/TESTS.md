# Test Suite

Every test in the suite, what it asserts, and what it would catch. Run everything with:

```bash
node --test
```

Node discovers `scripts/*.test.mjs` on its own. Don't pass the directory — `node --test scripts/`
tries to resolve it as a module and fails on Node 24.

**Current state on `main`: 151 tests, 150 pass, 1 fail, 0 skipped.** The single failure is
[`grip-pod-reconciliation` → *standard Grip Pods are direct-paired tier 2 cards*](#known-failure),
which fails by design.

`sym-import.test.mjs` resolves a pinned baseline commit, so it needs a **full clone**. A shallow
clone fails it with `fatal: Needed a single revision`.

The runner reports 151 because it counts subtests; there are **93 named `test()` blocks** across 16
files, plus two assert-style scripts that pass or throw as a unit.

---

## What kind of suite this is

Almost nothing here is a conventional unit test of a pure function. The site's risk is not that the
arithmetic breaks — it's that a **number is wrong**, and a wrong number looks exactly like a right
one. So most tests answer one of three questions:

1. **Does the model reproduce what the game displays?** Screenshots of every attachment on every
   weapon are transcribed into a corpus; tests replay them through the resolver and compare.
2. **Did a data edit change more than intended?** Full-enumeration baselines hash every
   weapon × magazine × grip × ergonomic × ammo case, so unintended ripples are visible.
3. **Is every value attributable?** Provenance, source tags and estimated-vs-measured markers are
   asserted, so nothing silently becomes fact.

A red test here usually means *a number disagrees with reality*, not *a function threw*.

---

## 1. Capture reconciliation

Ground truth is the screenshot corpus at `migration/1.3.3.0/attachment-audit/` — 62 weapons, 3,189
records, 3,127 with transcribed stats. These tests replay it against the live catalogs.

> **Subtype is identity.** For magazines, barrels and ammo the corpus joins on `attachmentSubtype`,
> never `attachmentName`. EA's per-weapon naming is inconsistent — 40 distinct in-game names map to
> the single `basic` barrel — so joining on name produces phantom "missing attachment" findings.

### `audit-phase0.test.mjs` — 11 tests

The main sweep. Compares every transcribed stat against the model and fails on any warning not in a
reviewed inventory.

**`Phase 0 fixtures are complete, full-roster, and path-portable`**
Pins corpus size (3,189 records, 3,127 stat rows, 62 weapons, 31 subsonic treatments), the
bulk-recapture counts, and that `sourceIdentity()` treats absolute and repo-relative screenshot paths
as the same file while rejecting paths outside `Weapon Attachments/`. Also asserts no audit script
contains a hard-coded `C:\Users\royal\...` path.
*Catches:* a fixture silently shrinking; a machine-specific path committed; the corpus and its
summary drifting apart.

**`sweep pins inventoried model-tier and name-effect warnings and rejects other warnings`**
Runs the full sweep and asserts the warning set *exactly equals* the reviewed inventory — 0
model-tier, 15 name-effect, 4 name-effect-coverage — plus exact severity counts.
*Catches:* any new model/capture disagreement, and equally any inventoried one that quietly went
away. Exact-set rather than "zero warnings" is deliberate: every disagreement gets adjudicated once
and recorded, instead of accumulating unread noise.

**`name-effect inventory rejects isolated new and disappearing reload-name findings`**
Injects a synthetic finding into a temp corpus copy, asserts drift reports it as `unexpected`, then
deletes an inventoried one and asserts it reports as `missing`.
*Catches:* the drift detector itself breaking — a guard that can no longer fail is worse than none.

**`cross-field consistency checks named capacity and every stat in duplicate identities`**
Pins the `STATS` list the sweep walks, then plants a magazine whose named capacity contradicts its
value and a duplicate identity with divergent stats, asserting both are flagged.
*Catches:* a "30Rnd" card carrying capacity 20; two captures of the same card disagreeing.

**`recoil amount uses hidden recoilV and the pinned float32 round-half-up display rule`**
Pins `hiddenRecoilAmountBase()` for DB-12 and checks the display rounding for DB-12, M87A1 and
SVK-8.6 at tiers 3–5, then walks every capture confirming each sits on its weapon's recoil ladder.
*Catches:* rounding drift, and any recoil reading that can't be explained by an integer tier step.

**`scalar reload characterization covers all weapons, magazine/ergonomic combinations, and overrides`**
Asserts 59 weapons use scalar reload, the three tube-fed shotguns are exactly DB-12/M1014/M87A1, and
every captured reload row matches a registered scalar combination.
*Catches:* a reload value that no tier/multiplier combination can produce — i.e. a transcription or
model error.

**`barrel velocity and every current ADS, sprint-recovery, and ADS-move table output stay in-table`**
Every captured ADS time, sprint recovery and ADS-move multiplier must be a value present in its
balance ladder, with zero registered overrides.
*Catches:* an off-ladder value, which means either a bad read or a ladder missing a rung.

**`impossible-zero gates are explicit for damage, sprint recovery, and ADS move`**
No capture may carry 0 for those fields, and the sweep emits no `zero-read` finding.
*Catches:* OCR returning 0 for an unreadable field — a sentinel that would otherwise look like real
data.

**`attachment catalogs cover every weapon with explicit ergonomics-free exemptions`**
Every weapon has `WEAPON_ATTS`, `WEAPON_ERGO` and `WEAPON_MAG` entries, except a named exemption list
(M123K, M250, M121 A2, SVK-8.6, Mini Scout, M87A1, M1014, DB-12) — and each exempted weapon is
confirmed to have no ergonomics captures.
*Catches:* a weapon added to `weapons.json` without its catalog entries; an exemption that stopped
being true.

**`default CLI checks are read-only, work outside the repository cwd, and fail on missing fixtures`**
Runs the audit scripts from a different cwd, asserts exit 0, no "wrote" output, unchanged file mtimes,
and that a missing fixture root throws.
*Catches:* an analysis script mutating tracked data as a side effect.

**`field-slot asymmetry inventory rejects isolated new and disappearing keys`**
Same injection/removal probe as the name-effect one, for the field-slot inventory. Includes a VSSM
barrel row.
*Catches:* the field-slot drift detector silently failing open.

### `grip-pod-reconciliation.test.mjs` — 7 tests

Grips and Grip Pods specifically, where captured recoil is the only evidence for tier values.

**`sniper grip receipts retain captured costs, identities, and screenshot paths`**
35 rows = 5 snipers × 7 grip cards, each appearing exactly once, with pinned per-card costs and
matching screenshot filenames.
*Catches:* a lost or duplicated capture; a renamed screenshot breaking traceability.

**`Grip Pod correction register exactly covers the approved live catalog diffs`**
Every difference between the shipped catalog and the pre-correction snapshot must appear in the
approved register with matching before/after values.
*Catches:* an unreviewed grip edit — the register is the audit trail.

**`standard Grip Pods are direct-paired tier 2 cards and preserve the four audit-only pairs`**
32 captures each for PTT/QD/Classic Grip Pod at pinned costs, each verified against its own weapon's
`None` baseline and required to resolve to tier 2. **This is the known failure.**
*Catches:* a Grip Pod whose displayed recoil doesn't match a tier 2 card.

**`sniper Grip Pods and bipods stay at static recoil tier 0`**
Sniper QD/Classic and all Bipods must show no recoil change (30 standard + 5 sniper Bipod rows).
*Catches:* a no-effect card acquiring an effect.

**`catalog Grip Pod fields use resolver signs and amended captured costs`**
Pins recoil/moving-ADS/ADS-time tiers and costs for all five Grip Pod cards.
*Catches:* a sign flip — the moving-ADS convention is inverted relative to recoil, and easy to get
backwards.

**`SMG Slim Angled retains its no-draw contract`**
`slim_angled_smg` keeps recoil 1, ADS-time 1, moving 0 and **sprint shift 0**, unlike the primary
variant's −1.
*Catches:* collapsing the SMG variant into the shared card and silently changing SMG draw times.

**`registered Grip Pod corrections are the only legal resolver deltas`**
Replays every weapon × magazine × ammo case with and without the corrections, asserting no output
field moves except those the register declares.
*Catches:* a grip edit with side effects beyond its declared fields.

### `attachment-screenshot-schema.test.mjs` — 2 tests

**`review document declares schema v4 and satisfies the core record contract`**
`$schema`, `schemaVersion: 4`, `recordCount` equals actual length, `attachmentDetailCount` equals the
number of records with stats, and every record's type is in the allowed set.
*Catches:* the hand-corrected corpus drifting from its declared contract.

**`schema exposes shared types and the new displayed subtype vocabulary without slot fields`**
`Laser/Light` and `Grip/Laser/Light` are valid types, `Range Finder` is not, and `attachmentSlot` does
not exist.
*Catches:* reintroducing a physical-slot field, which is what the shared-slot model exists to avoid.

### `attachment-screenshot-taxonomy.test.mjs` — 4 tests

**`shared Laser/Light allowlist covers GRT-BC, KORD 6P67, KTS100 MK8, SL9, and every Sidearm`**
Membership of the combined-slot allowlist, by weapon name and by capture path.
*Catches:* a weapon gaining or losing shared-slot treatment unnoticed.

**`shared weapons collapse detected Laser and Light categories without storing a physical slot`**
On shared weapons both detections canonicalise to `Laser/Light`; on normal weapons `Light` stays
`Light`. Filename encoding maps to `Laser-Light`.
*Catches:* a shared-slot weapon splitting into two slots, doubling its cards.

**`Range Finder is a Light attachment and VZ. 61 uses one combined Underbarrel type`**
Range Finder canonicalises to `Light` with subtype `Range Finder`; VZ. 61 collapses Grip, Laser and
Light into one type.
*Catches:* regression in the two irregular slot layouts.

**`new ammo and VSSM subtype fallbacks remain distinct`**
OCR fallbacks resolve `SUBSONIC` → `Subsonic`, `SUB. HP` → `Sub HP`, `SUB. PEN.` → `Sub Pen`,
`RANGE PEN.` → `Range Pen`, and a VSSM "Factory Suppressor" barrel → subtype `Suppressed`.
*Catches:* two distinct ammo subtypes collapsing into one — exactly the bug that once hid `#00 BUCK`
behind a `Standard` default.

---

## 2. Enumeration baselines

These build every reachable loadout, hash the result, and compare against a committed baseline. They
are the blast-radius detector.

> Adding a weapon changes all of these. That's the system working. Re-pin the roster counts as part
> of the change and read the diff to confirm only the new weapon's cases appeared.

### `reload-phase3.test.mjs` — 3 tests

**`Phase 3 reload baseline pins the complete 87,834-case live-roster enumeration`**
Enumerates 62 weapons × 283 magazine entries × grips × ergonomics × ammo, and asserts scope, counts,
SHA-256 digest, and that the only weapons whose cases changed since the pre-migration snapshot are
`brod3`, `ef88`, `vssm`.
*Catches:* any reload-affecting edit rippling beyond its intended weapon.

Regenerate rather than loosen:

```bash
node scripts/reload-phase3.test.mjs --write-baseline
```

Then update the roster constants at the top of the file. Never hand-edit a baseline — the point is
that it's machine-derived.

**`Phase 6 reload baseline is entirely authoritative derived output`**
Every case carries a recognised reason, derived cases exist, and `overrideApplied` is true exactly
when `reloadSpeedTier` is null.
*Catches:* an override applied without being recorded, or a case falling through to a legacy path.

**`Phase 6 deletes the legacy reload representation and retains the derived schema`**
The bug-exception schema shape, `reload-exceptions.json` counts, and that every magazine carries
either `reloadSpeedTier` or `tacRldOverrideMs`.
*Catches:* a magazine added with neither field, which would silently inherit the wrong reload.

### `reload-phase4.test.mjs` — 1 test

**`Phase 6 validator rejects malformed or reintroduced legacy reload shapes in an isolated data copy`**
22 mutations against a temp copy — negative tiers, non-integers, reintroduced legacy fields — each
must be rejected with its specific message.
*Catches:* the validator failing open. Deliberately runs on a copy so a bug can't corrupt tracked
data.

### `barrel-velocity-phase7.test.mjs` — 5 tests

**`Phase 7 data has all exact velocity tiers and retains velMult`**
`VELOCITY_LADDER` is 0.8, the barrel id set matches expectations exactly (including
`vssm_suppressed` and `vssm_suppressed_asm` at tier 0), and every barrel's `velMult` equals
`0.8^(-velTierMod)`.
*Catches:* a barrel added without a velocity tier, or the two fields disagreeing.

**`Phase 7 velocity dual-read prefers velTierMod and falls back to velMult`**
Branch selection across present/absent/null combinations.
*Catches:* the migration's fallback path breaking for un-migrated data.

**`Phase 7 derived and legacy barrel velocity are bit-identical for every selectable live barrel`**
Every weapon × barrel pair produces identical velocity down to the bit under both paths.
*Catches:* a migration that changes a displayed number.

**`Phase 7 velocity flooring has a guarded floating-point edge`**
`floorVelocityDisplay(613.9999999999999) === 614` but `floorVelocityDisplay(837.5) === 837`.
*Catches:* a naive floor turning 614 m/s into 613, or an over-eager epsilon rounding a genuine
fractional value up.

**`Phase 7 extends the Phase 5 witness comparison with an explicit legacy velocity path`**
101,812 cases compared, zero mismatches, 23 historical display-difference pairs all explained by 25
corpus records.
*Catches:* an unexplained divergence between derived and legacy velocity.

---

## 3. Ballistics and damage

The genuinely computational tests.

### `damage.test.mjs` — 11 tests

**`resolves automatic headshot ammo tiers and limb multiplier`**
Standard/hollow-point/synthetic head multipliers for automatic weapons (1.4 / 1.57 / 1.8).

**`preserves DMR headshot behavior and shotgun/sidearm limb exceptions`**
DMR hollow-point is 1.75, and shotguns and sidearms take no limb reduction.
*Catches:* applying the automatic ammo table to a class that uses its own.

**`calculates pure chest and limb BTK for the adjusted damage families`**
BTK across damage values and body multipliers — e.g. 26 damage is 4 to the chest but 5 to limbs.
*Catches:* a rounding error at a bullet boundary, the most player-visible failure possible.

**`calculates mixed head/chest and head/limb sequences independently of hit order`**
The same hits in any order give the same BTK.
*Catches:* accumulation order affecting the result.

**`handles breakpoint lookup, exact lethal boundaries, and zone aliases`**
Damage at 19.99 / 20 / 20.01 m across a breakpoint, plus zone alias resolution.
*Catches:* an off-by-one at the boundary — whether a breakpoint is inclusive of its own range.

**`interpolates linearly between distinct ranges and clamps outside the curve`**
Sniper curve interpolation and clamping past both ends.
*Catches:* extrapolation past the last breakpoint.

**`classifies every current site weapon according to the 1.3.3.0 hit-zone rules`**
Walks all 62 weapons asserting limb class, limb multiplier and head multiplier.
*Catches:* a new weapon missing a `LIMB_CLASS` entry and silently defaulting.

**`derives sniper sweet spots from the curve and preserves the Mini Scout exception`**
Sweet spots are derived from the curve, never stored; at least four bolt-actions have a plateau;
each ramps in and out; Mini Scout has none.
*Catches:* reintroducing a hand-maintained `sweetSpot` field that could contradict the curve.

**`every live damage breakpoint carries explicit source provenance`**
Every point's `source` is `EA`, `Sym` or `in-game`.
*Catches:* a hand-typed damage number with no origin.

**`uses the refreshed Sym game-file damage tiers`**
Exact curves for M433, AK4D, NVO-228E, PW5A3, M39 EMR, LMR27, SVK-8.6, plus every weapon being
`provisional` and single-sourced (VSSM is `in-game`, the rest `Sym`).
*Catches:* a curve edited without going through the refresh.

**`steps every non-sniper class and reads the NVO-228E tiers at whole metres`**
Stepped (not interpolated) behaviour at exact metre boundaries.
*Catches:* a non-sniper curve becoming interpolated, which would misreport damage between tiers.

### `ballistics.test.mjs` — assert-style

Flight time at 500 m for two drag coefficients against reference values (±1e-6), the solved
trajectory intersecting its selected zero, a 100 m zero dropping again beyond zero, and null inputs
returning `null` rather than a fallback.
*Catches:* drag model drift; a missing-input path inventing a plausible number.

### `target.test.mjs` — assert-style

Target aspect ratio within 0.4–0.46, aim points (head 18, chest 66.5), zone boundaries for
head/chest/stomach/arms/legs, and marker radius scaling with view.
*Catches:* hit-zone geometry drifting from the reference figure; markers swamping the target at wide
zoom.

### `heavy-barrel-spread.test.mjs` — 2 tests

**`heavy-type barrels never pin a weapon at its minimum spread`**
Simulating 20 shots with each heavy-type barrel, no weapon sits at minimum spread.
*Catches:* a spread multiplier strong enough to make sustained fire perfectly accurate.

**`heavy-type barrels scale spread identically in every aim state and stance`**
ADS and hip spread-per-shot both scale by `spreadIncMult`, and firing-decay coefficient and offset
scale by their multipliers.
*Catches:* a barrel effect applied to ADS but not hip, or to one stance only.

### `spread-bar-scale.test.mjs` — 3 tests

**`ui/app.js still declares the scale this test pins`**
`SPREAD_BAR_SCALE` is a single number matching the value under test.
*Catches:* the constant drifting away from its own test.

**`the bar scale contains every aim state and stance in the corpus`**
The worst corpus spread fits within the scale.
*Catches:* a bar clipping at 100% and hiding real differences.

**`the scale is not stranded far above what the model can reach`**
The worst value is at least 95% of the scale.
*Catches:* the opposite failure — every bar squashed into a sliver.

---

## 4. Data integrity and provenance

### `sym-import.test.mjs` — 13 tests

**`loads and verifies the pinned 1.3.3.0 Sym inputs`**
Version, SHA-256 of the source, 59 weapons, 58 patch deltas, 1,038 changes.
*Catches:* the source file being swapped or edited.

**`normalization and reconciliation are stable when source object order changes`**
Shuffling source key order produces identical normalized output, diff and reconciliation.
*Catches:* order-dependent output, which would make diffs untrustworthy.

**`fails loudly for a missing or unknown mapping`** / **`fails loudly for duplicate site IDs in the explicit map`**
Both throw rather than skipping.
*Catches:* a weapon silently dropped from an import, or two weapons overwriting each other.

**`uses the exact effective recoil formula and keeps raw components`**
`recoilV === amount × amountMult^amountExp` for M433 and PP-19, with raw components retained.
*Catches:* storing only the derived value. This matters more than it looks: the derived number is
what the game displays, the raw components are what attachment tiers operate on, and losing either
makes the other unverifiable.

**`keeps damage and gravity/drag outside the live write candidate`**
Zero damage-curve and gravity/drag writes; each excluded field carries an explicit decision.
*Catches:* the importer overwriting the separately-owned damage refresh.

**`uses an immutable resolved baseline provenance`**
The baseline resolves to a git commit SHA starting `2df4811`.
*Catches:* a moving baseline, which would make the diff meaningless. This is also why the file needs
a full clone.

**`keeps reload timing fields numeric-or-null and applies special reload policy`**
59 weapons with finite positive `reloadSpeed`, and reload fields numeric or explicitly null.
*Catches:* a shell-by-shell weapon getting a scalar reload it can't have.

**`derives scalar reloads from ReloadSpeed and changes exactly the known 15 non-1.0 weapons`**
Exactly 15 weapons have a non-1.0 reload speed.
*Catches:* a reload-speed change reaching more weapons than intended.

**`ReloadSpeed defaults only when absent and rejects invalid present values`**
Absent → 1.0; present but zero/negative/non-numeric → throw.
*Catches:* a malformed value being coerced to a plausible default.

**`maps reload.ReloadSpeed to the live reloadSpeed target`**
Field mapping to the site schema.

**`preserves the separate M60 and M240L alternate-magazine derived timing contract`**
Two LMGs with irregular alternate-magazine timing keep their separate treatment.
*Catches:* collapsing a special case into the general path.

**`reconciles every EA velocity and recoil-variation line to pinned Sym values`**
Every EA patch-note velocity and recoil-variation line matches the Sym source.
*Catches:* a divergence between the two upstreams — the strongest available check that both are
right.

### `estimated-weapons.test.mjs` — 5 tests

**`exactly BROD 3, EF88 and VSSM are estimated with explicit provenance`**
The estimated list is exactly those three; each is `provisional`; VSSM carries changelist 28877515
and non-empty notes; BROD 3 and EF88 carry donor ids and measured damage endpoints.
*Catches:* a weapon quietly promoted from estimated to fact, or added as estimated without saying why.

**`estimated weapons have complete cross-file coverage and five attachment slots`**
Each estimated weapon has all five attachment slot arrays with ids resolving to real catalog entries,
plus `WEAPON_ERGO`, `WEAPON_MAG`, `WEAPON_AMMO`, `RECOIL_DEC`, `RECOIL_DEC_TEXP`, `RECOIL_MULT`,
`HIP_CLS` and a class-appropriate `LIMB_CLASS`.
*Catches:* a half-added weapon that renders but computes wrongly.

**`reviewed handling decisions and measured endpoint contracts are pinned`**
BROD 3 and EF88 RPM as exact fractions (`10800/13`, `10800/16`), recoil directions, the internal
consistency of `recoilV`/`recoilVar`/`recoilIncAds` against their raw blocks, changelist provenance,
damage endpoints and specific magazine tier shifts.
*Catches:* a reviewed decision being undone by a later bulk edit.

**`new attachment tokens are append-only and share state round-trips`**
The last three barrel ids are pinned, ids are unique, and a share code encodes and decodes back to
the identical loadout.
*Catches:* inserting a catalog entry mid-array, which would silently repoint every existing share
link.

**`estimated and assumed statuses use markers and one consolidated note`**
The UI declares the badge, marker and exactly one footnote, and the old per-weapon estimate text is
gone.
*Catches:* estimated data rendering as if it were measured.

### `pp19.test.mjs` — 10 tests

PP-19 was the first weapon through the current pipeline, so it's pinned exhaustively as a reference
implementation. Pipeline regressions usually surface here first and most legibly.

**`PP-19 remains before the appended estimated firearms`**
62 weapons, PP-19 immediately after CZ3A1, with pinned name/class/calibre/fire mode.
*Catches:* roster reordering, which changes share-link indices.

**`PP-19 base values match the pinned normalized Sym row and damage stays provisional`**
26 assertions over RPM, magazine, reloads, velocity, recoil components, spread and the full damage
array — including that it equals PW5A3's curve, confirming the shared model.

**`PP-19 attachment catalogs contain the reviewed seven-slot backfill`**
Exact `WEAPON_ATTS`, `WEAPON_ERGO` and `WEAPON_MAG` contents, including the `20_fast`
`suspectedGameBug` record (named a fast magazine but not receiving the 1.13 multiplier in game).
*Catches:* an attachment list edited without review. Also the model for recording a game bug in data
rather than in code.

**`PP-19 magazine and ergonomic values resolve to the reviewed derived outputs`**
Each magazine resolves to its reviewed reload, capacity, ADS time, sprint recovery and ADS move.

**`Phase 6 derived reload preserves numeric tier and multiplier branch selection`** /
**`Phase 2 derived reload uses explicit numeric tiers and ergonomic multipliers`**
Tiers 0/1/2 give 2.467 / 2.183 / 1.932 via the derived branch, with ergonomic multipliers composing.
*Catches:* a tier silently falling back to an override.

**`Phase 6 override stacking and invalid-input guards fail closed`**
Override composition, and invalid inputs rejected rather than coerced.

**`PP-19 derived fixture resolves through applyAttachments after production cutover`**
The reviewed fixture reproduces through the live resolver, not just the test harness.
*Catches:* a fixture that only passes in isolation.

**`PP-19 default audited loadout and comparison input remain serializable`**
The default loadout round-trips and resolves to pinned outputs.

**`release validator rejects a 58-weapon fixture with PP-19 removed`**
Removing PP-19 makes the release validator exit non-zero with a specific message.
*Catches:* the release gate failing open.

---

## 5. Feature behaviour, end to end

Both files deliberately assert the **entrypoints** pass the right tables in. The classic failure is
data that is correct and simply never read.

### `subsonic-velocity-surface.test.mjs` — 7 tests

**`the live entrypoints hand WEAPON_AMMO to the attachment resolver`**
Every entrypoint's `setAttachmentContext` call includes `WEAPON_AMMO`.
*Catches:* correct data never reaching the resolver.

**`the corpus still carries subsonic velocity treatments to assert against`**
At least 20 treated pairs survive.
*Catches:* the evidence for the other tests disappearing, leaving them vacuously true.

**`every subsonic load a weapon offers carries a velocity treatment`**
No subsonic ammo without a treatment.
*Catches:* a subsonic load firing at full velocity.

**`no velocity treatment is stranded on an ammo type the weapon cannot equip`**
The converse.
*Catches:* dead configuration accumulating.

**`all three subsonic subtypes and all three treatment kinds stay exercised`**
Subsonic / Sub HP / Sub Pen and absolute / tier / tungsten-absolute all remain covered.

**`every treated ammo type resolves below its standard-load velocity`**
Each treated load resolves finite, lower than standard, and equal to the expected floored display.

**`the reduced velocity reaches flight time and bullet drop`**
The reduced velocity propagates into the ballistics model — longer flight time, more drop.
*Catches:* a velocity correct on the stat card but not in the trajectory.

### `frangible-health-regen.test.mjs` — 7 tests

**`the global baseline regeneration delay is 5s`** — the baseline constant.

**`frangible carries the 9s delay and is no longer flagged noEffect`** — the effect exists and is
marked as real.

**`no other ammo type overrides the regeneration delay`** — frangible is the only override.
*Catches:* the mechanic leaking onto other ammo.

**`every weapon offering frangible resolves 5s standard and 9s frangible`** — resolved per weapon
through `applyAttachments`, not just read from the table.

**`non-frangible loads leave the delay at the baseline, emitting no chip`** — no spurious UI chip.

**`the live entrypoints hand HEALTH_REGEN_DELAY_S to the attachment resolver`** — the entrypoint check.

**`the Attachment Effects panel renders the chip as a red -4s`** — label, negated delta, and red
colour.
*Catches:* an effect that computes correctly but never appears to the player.

---

## 6. Smoke

### `runtime-syntax.test.mjs` — 2 tests

**`ui/app.js parses`** and **`every sim module parses`**.

The site ships as static files with no build step, so a syntax error would otherwise only surface in
a browser. Cheap, and catches the most embarrassing failure available.

---

## Known failure

### `grip-pod-reconciliation.test.mjs` → *standard Grip Pods are direct-paired tier 2 cards*

**Expected to fail. Do not re-investigate.**

QD Grip Pod is bugged on the VSSM. QD and Alloy Vertical are both tier 2 cards, so on any given
weapon they must display the same recoil — and everywhere else they do:

| weapon | None | Alloy Vertical | QD Grip Pod | tier 2 predicts |
| --- | --- | --- | --- | --- |
| BROD 3 | 0.8 | 0.7 | 0.7 | 0.7 |
| EF88 | 0.7 | 0.6 | 0.6 | 0.6 |
| M16A4 | 0.7 | 0.6 | 0.6 | 0.6 |
| RPK-74M | 0.5 | 0.4 | 0.4 | 0.4 |
| **VSSM** | 0.8 | **0.8** | **0.7** | 0.8 |

The VSSM is the only weapon where two tier 2 cards disagree with each other: it hands out a tier 3
recoil benefit at tier 2 cost. Datamined changelist 28877515 lists tier 3 for BROD 3, EF88, M16A3,
RPK-74M and VSSM, but the captures show it only manifests on the VSSM.

The catalog keeps the intended tier 2 card, so this row cannot pass. **It will go green on its own if
EA fixes the grip.** The policy is deliberate: attachments are modelled as they are *supposed* to
work, and no weapon-specific branch is added to accommodate a bug.

---

## Conventions

**Pinned constants are contracts, not conveniences.** A literal like `weaponCount: 62` exists so that
adding a weapon is a decision someone makes, not something that happens. Update it deliberately, in
the same commit as the change that justifies it.

**Prefer re-pinning to loosening.** If an assertion is too strict, regenerate its baseline against
reviewed data — don't widen the assertion until it passes. A weakened check keeps the suite green
while quietly ending its usefulness.

**Registries carry reasons.** Where a test excludes a case — a known bug, a game-side exception, a
reviewed correction — the exclusion is named, dated and explained inline. An unexplained exclusion is
indistinguishable from a bug being hidden.

**Guards are themselves tested.** Several drift detectors have companion tests that inject a
synthetic finding and assert it's caught. A guard that can no longer fail is worse than no guard.

**A red suite nobody expects to be green stops being read.** The one known failure is documented
precisely so it stays legible. If a second long-lived failure appears, either fix it or document it
to the same standard.

## Adding tests

Keep them proportionate. This suite is large because the data is large and hard to verify by eye, not
because coverage is a goal in itself. Before adding one, ask what wrong number it would catch that
nothing else does. A test that restates fixture contents rather than exercising the sim is
maintenance cost without cover — several were removed for exactly that reason.

For a new weapon the existing tests cover it once its data lands: `estimated-weapons` checks
cross-file completeness, the enumeration baselines catch ripples, and capture reconciliation checks it
against screenshots. Follow the New Weapon checklist in [`MAINTENANCE.md`](../MAINTENANCE.md) rather
than writing bespoke tests.
