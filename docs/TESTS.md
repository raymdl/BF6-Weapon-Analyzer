# Test Suite

Every test in the suite, what it asserts, and what it would catch. Run everything with:

```bash
node --test
```

Node discovers `scripts/*.test.mjs` on its own. Don't pass the directory — `node --test scripts/`
tries to resolve it as a module and fails on Node 24.

**Current state: 56 tests, 56 pass, 0 fail, 0 skipped** locally. A clean clone runs **52** — see [Local-only tests](#local-only-tests).

`sym-import.test.mjs` resolves a pinned baseline commit, so it needs a **full clone**. A shallow
clone fails it with `fatal: Needed a single revision`.

The runner reports 56: **54 named `test()` blocks** across 8 files, plus two assert-style scripts
that pass or throw as a unit.

---

## What kind of suite this is

Almost nothing here is a conventional unit test of a pure function. The site's risk is not that the
arithmetic breaks — it's that a **number is wrong**, and a wrong number looks exactly like a right
one. So most tests answer one of two questions:

1. **Did a data edit change more than intended?** Enumeration baselines hash every reachable
   combination, so unintended ripples are visible.
2. **Is every value attributable?** Provenance, source tags and estimated-vs-measured markers are
   asserted, so nothing silently becomes fact.

A red test here usually means *a number disagrees with reality*, not *a function threw*.

### What was removed, and why

The suite used to be three times this size. The bulk of it existed to drive one-time migrations —
the screenshot audit, the reload representation change, the ADS-move tier conversion — and those
migrations have shipped. Nine files were retired once the captured baseline data was complete:

`subsonic-velocity-surface` · `frangible-health-regen` · `pp19` · `grip-pod-reconciliation` ·
`attachment-screenshot-schema` · `reload-phase3` · `reload-phase4` ·
`heavy-barrel-spread`

They were scaffolding for getting the data right, not cover for keeping it right. Their job ended
when the data landed. What remains is what still earns its place on a normal working day.

> **The QD Grip Pod bug is no longer test-covered.** `grip-pod-reconciliation` was the thing that
> caught it. It stays recorded in `data/weapons.json` under the VSSM's `provenance.notes`: the card
> is a tier 2 card everywhere, but the VSSM applies a tier 3 recoil benefit at tier 2 cost, and the
> catalog deliberately models the intended behaviour.

---

## 1. Capture reconciliation

Ground truth is the screenshot corpus at `migration/1.3.3.0/attachment-audit/` — 62 weapons, 3,189
records, 3,127 with transcribed stats.

### `capture-corpus-integrity.test.mjs` — 11 tests

The main sweep, restored after the migration cull because it is the one thing that checks the model
still reproduces what the game displays. Formerly `audit-phase0.test.mjs`.

**`capture corpus fixtures are complete, full-roster, and path-portable`**
Corpus size (3,189 records, 3,127 stat rows, 62 weapons, 31 subsonic treatments), bulk-recapture
counts, and that `sourceIdentity()` treats absolute and repo-relative screenshot paths as the same
file while rejecting paths outside `Weapon Attachments/`. No audit script contains a hard-coded
machine path.
*Catches:* a fixture silently shrinking; a machine-specific path committed; the corpus and its
summary drifting apart.

**`sweep pins inventoried model-tier and name-effect warnings and rejects other warnings`**
Runs the full sweep and asserts the warning set *exactly equals* the reviewed inventory — 0
model-tier, 15 name-effect, 4 name-effect-coverage — plus exact severity counts.
*Catches:* any new model/capture disagreement, and equally any inventoried one that quietly went
away. Exact-set rather than "zero warnings" is deliberate: every disagreement gets adjudicated once
and recorded, instead of accumulating unread noise.

**`name-effect inventory rejects isolated new and disappearing reload-name findings`**
Injects a synthetic finding into a temp corpus copy and asserts drift reports it as unexpected, then
deletes an inventoried one and asserts it reports as missing.
*Catches:* the drift detector itself breaking. A guard that can no longer fail is worse than none.

**`cross-field consistency checks named capacity and every stat in duplicate identities`**
Pins the stat list the sweep walks, then plants a magazine whose named capacity contradicts its value
and a duplicate identity with divergent stats, asserting both are flagged.
*Catches:* a "30Rnd" card carrying capacity 20; two captures of the same card disagreeing.

**`recoil amount uses hidden recoilV and the pinned float32 round-half-up display rule`**
Pins the hidden recoil base for DB-12 and the display rounding for DB-12, M87A1 and SVK-8.6 at tiers
3–5, then walks every capture confirming each sits on its weapon's recoil ladder.
*Catches:* rounding drift, and any recoil reading that cannot be explained by an integer tier step.
This is the rule the VSSM grip analysis depended on.

**`scalar reload characterization covers all weapons, magazine/ergonomic combinations, and overrides`**
59 weapons use scalar reload, the three tube-fed shotguns are exactly DB-12/M1014/M87A1, and every
captured reload row matches a registered scalar combination.
*Catches:* a reload value that no tier/multiplier combination can produce — a transcription or model
error.

**`barrel velocity and every current ADS, sprint-recovery, and ADS-move table output stay in-table`**
Every captured ADS time, sprint recovery and ADS-move multiplier is a value present in its balance
ladder, with zero registered overrides.
*Catches:* an off-ladder value, meaning either a bad read or a ladder missing a rung.

**`impossible-zero gates are explicit for damage, sprint recovery, and ADS move`**
No capture carries 0 for those fields, and the sweep emits no zero-read finding.
*Catches:* OCR returning 0 for an unreadable field — a sentinel that would otherwise look like real
data.

**`attachment catalogs cover every weapon with explicit ergonomics-free exemptions`**
Every weapon has `WEAPON_ATTS`, `WEAPON_ERGO` and `WEAPON_MAG` entries except a named exemption
list, and each exempted weapon is confirmed to have no ergonomics captures.
*Catches:* a weapon added to `weapons.json` without its catalog entries; an exemption that stopped
being true.

**`default CLI checks are read-only, work outside the repository cwd, and fail on missing fixtures`**
Runs the audit scripts from a different cwd and asserts exit 0, no "wrote" output, unchanged file
mtimes, and that a missing fixture root throws.
*Catches:* an analysis script mutating tracked data as a side effect.

**`field-slot asymmetry inventory rejects isolated new and disappearing keys`**
The same injection/removal probe as the name-effect guard, for the field-slot inventory.
*Catches:* the field-slot drift detector silently failing open.

### `attachment-screenshot-taxonomy.test.mjs` — 4 tests *(local only)*

Attachment subtype classification — how a captured card is identified.

> **Subtype is identity.** For magazines, barrels and ammo the corpus joins on `attachmentSubtype`,
> never `attachmentName`. EA's per-weapon naming is inconsistent — 40 distinct in-game names map to
> the single `basic` barrel — so joining on name produces phantom "missing attachment" findings.

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
*Catches:* two distinct ammo subtypes collapsing into one — the bug that once hid `#00 BUCK` behind
a `Standard` default.

---

## 2. Enumeration baselines

### `barrel-velocity.test.mjs` — 5 tests

Builds every weapon × barrel combination and compares against the legacy path. The surviving
blast-radius detector.

> Adding a weapon or a barrel changes these. That's the system working. Re-pin the counts as part of
> the change and read the diff to confirm only the new entry's cases appeared.

**`the barrel catalog has all exact velocity tiers and retains velMult`**
`VELOCITY_LADDER` is 0.8, the barrel id set matches expectations exactly (including
`vssm_suppressed` and `vssm_suppressed_asm` at tier 0), and every barrel's `velMult` equals
`0.8^(-velTierMod)`.
*Catches:* a barrel added without a velocity tier, or the two fields disagreeing.

**`velocity dual-read prefers velTierMod and falls back to velMult`**
Branch selection across present, absent and null combinations.
*Catches:* the fallback path breaking for data that still carries only the old field.

**`derived and legacy barrel velocity are bit-identical for every selectable live barrel`**
Every weapon × barrel pair produces identical velocity down to the bit under both paths.
*Catches:* a change that moves a displayed number.

**`velocity flooring has a guarded floating-point edge`**
`floorVelocityDisplay(613.9999999999999) === 614` but `floorVelocityDisplay(837.5) === 837`.
*Catches:* two opposite failures in one test — a naive floor turning 614 m/s into 613, or an
over-eager epsilon rounding a genuine fractional value up.

**`the full witness enumeration covers an explicit legacy velocity path`**
101,812 cases compared, zero mismatches, 23 historical display-difference pairs all explained by 25
corpus records.
*Catches:* an unexplained divergence between the derived and legacy velocity paths.

---

## 3. Ballistics and damage

The genuinely computational tests — the only conventional unit tests here.

### `damage.test.mjs` — 11 tests

**`resolves automatic headshot ammo tiers and limb multiplier`**
Standard, hollow-point and synthetic head multipliers for automatic weapons (1.4 / 1.57 / 1.8).
*Catches:* an ammo head multiplier drifting from its balance table.

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
Exact curves for M433, AK4D, NVO-228E, PW5A3, M39 EMR, LMR27 and SVK-8.6, plus every weapon being
`provisional` and single-sourced (VSSM is `in-game`, the rest `Sym`).
*Catches:* a curve edited without going through the refresh.

**`steps every non-sniper class and reads the NVO-228E tiers at whole metres`**
Stepped, not interpolated, behaviour at exact metre boundaries.
*Catches:* a non-sniper curve becoming interpolated, which would misreport damage between tiers.

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

### `ballistics.test.mjs` — assert-style script

Flight time at 500 m for two drag coefficients against reference values (±1e-6), the solved
trajectory intersecting its selected zero, a 100 m zero dropping again beyond zero, and null inputs
returning `null` rather than a fallback.
*Catches:* drag model drift; a missing-input path inventing a plausible number.

### `target-geometry.test.mjs` — assert-style script

Target aspect ratio within 0.4–0.46, aim points (head 18, chest 66.5), zone boundaries for
head/chest/stomach/arms/legs, and marker radius scaling with view.
*Catches:* hit-zone geometry drifting from the reference figure; markers swamping the target at wide
zoom.

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
*Catches:* storing only the derived value. The derived number is what the game displays, the raw
components are what attachment tiers operate on, and losing either makes the other unverifiable.

**`keeps damage and gravity/drag outside the live write candidate`**
Zero damage-curve and gravity/drag writes; each excluded field carries an explicit decision.
*Catches:* the importer overwriting the separately-owned damage refresh.

**`uses an immutable resolved baseline provenance`**
The baseline resolves to a git commit SHA starting `2df4811`.
*Catches:* a moving baseline, which would make the diff meaningless. Also why this file needs a full
clone.

**`keeps reload timing fields numeric-or-null and applies special reload policy`**
59 weapons with finite positive `reloadSpeed`, and reload fields numeric or explicitly null.
*Catches:* a shell-by-shell weapon getting a scalar reload it can't have.

**`derives scalar reloads from ReloadSpeed and changes exactly the known 15 non-1.0 weapons`**
Exactly 15 weapons have a non-1.0 reload speed.
*Catches:* a reload-speed change reaching more weapons than intended.

**`ReloadSpeed defaults only when absent and rejects invalid present values`**
Absent → 1.0; present but zero, negative or non-numeric → throw.
*Catches:* a malformed value being coerced to a plausible default.

**`maps reload.ReloadSpeed to the live reloadSpeed target`**
Field mapping to the site schema.
*Catches:* a renamed source field silently not landing.

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
*Catches:* a weapon quietly promoted from estimated to fact, or added as estimated without saying
why.

**`estimated weapons have complete cross-file coverage and five attachment slots`**
Each estimated weapon has all five attachment slot arrays with ids resolving to real catalog entries,
plus `WEAPON_ERGO`, `WEAPON_MAG`, `WEAPON_AMMO`, `RECOIL_DEC`, `RECOIL_DEC_TEXP`, `RECOIL_MULT`,
`HIP_CLS` and a class-appropriate `LIMB_CLASS`.
*Catches:* a half-added weapon that renders but computes wrongly. **This is now the main guard for a
new weapon being complete** alongside the corpus integrity sweep.

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

---

## 5. Smoke

### `runtime-syntax.test.mjs` — 2 tests

**`ui/app.js parses`** and **`every sim module parses`** (the latter also asserting at least one
module was found).

The site ships as static files with no build step, so a syntax error would otherwise only surface in
a browser. Cheap, and catches the most embarrassing failure available.

---

## Local-only tests

`attachment-screenshot-taxonomy.test.mjs` is **gitignored** and does not exist on a clean clone. It
imports `attachment-screenshot-taxonomy.mjs`, which is part of the local screenshot-audit tooling and
is ignored by the `scripts/*attachment-screenshot*` rule. So:

| | Tests |
| --- | --- |
| Locally, with the audit tooling present | 56 |
| Clean clone | 52 |

That is deliberate — the tooling reads a ~1.7 GB local corpus that isn't committed — but it means the
suite is smaller in CI than it looks here. Don't rename that file without also updating `.gitignore`;
a name that stops matching the pattern would start tracking a test whose module isn't committed, and
it would fail for everyone else.

## Naming

Test files are named for what they check, not for the migration that produced them. Four were
renamed once their migrations shipped:

| Was | Now |
| --- | --- |
| `audit-phase0.test.mjs` | `capture-corpus-integrity.test.mjs` |
| `audit-phase0-lib.mjs` | `capture-corpus-lib.mjs` |
| `barrel-velocity-phase7.test.mjs` | `barrel-velocity.test.mjs` |
| `attachment-equivalence-phase5.mjs` | `attachment-equivalence.mjs` |
| `target.test.mjs` | `target-geometry.test.mjs` |

Test titles were renamed with them — `Phase 7 velocity flooring…` is now
`velocity flooring has a guarded floating-point edge`. If a name only makes sense to someone who
remembers a migration, it is the wrong name.

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

**The suite is green. Keep it that way.** A red suite nobody expects to be green stops being read. If
a failure appears, either fix it or document it precisely enough that the next person doesn't
re-investigate it.

## Adding tests

Keep them proportionate. Before adding one, ask what wrong number it would catch that nothing else
does. A test that restates fixture contents rather than exercising the sim is maintenance cost
without cover — that, and migration scaffolding outliving its migration, is why most of this suite
was retired.

For a new weapon the existing tests cover it once its data lands: `estimated-weapons` checks
cross-file completeness, `damage` checks hit-zone classification across the whole roster, and the
velocity enumeration catches ripples. Follow the New Weapon checklist in
[`MAINTENANCE.md`](../MAINTENANCE.md) rather than writing bespoke tests.
