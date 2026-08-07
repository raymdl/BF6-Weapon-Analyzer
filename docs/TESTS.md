# Test Suite

What each test file is for, what it would catch, and why it exists. Run everything with:

```bash
node --test
```

Node discovers `scripts/*.test.mjs` on its own. Don't pass the directory — `node --test scripts/`
tries to resolve it as a module and fails on Node 24.

**Current state on `main`: 151 tests, 150 pass, 1 fail, 0 skipped.** The single failure is
`grip-pod-reconciliation.test.mjs` → *standard Grip Pods are direct-paired tier 2 cards*, which
fails by design; see [Known failures](#known-failures).

`sym-import.test.mjs` resolves a pinned baseline commit, so it needs a **full clone**. A shallow
clone fails it with `fatal: Needed a single revision`.

---

## What kind of suite this is

Almost nothing here is a conventional unit test of a pure function. The site's risk is not that the
arithmetic breaks — it's that a **number is wrong**, and a wrong number looks exactly like a right
one. So the suite is mostly built to answer three questions:

1. **Does the model reproduce what the game actually displays?** Screenshots of every attachment on
   every weapon are transcribed into a corpus; tests replay them through the resolver and compare.
2. **Did a data edit change more than it was supposed to?** Full-enumeration baselines hash every
   weapon × magazine × grip × ergonomic × ammo combination so an unintended ripple is visible.
3. **Is every value attributable?** Provenance, source tags, and estimated-vs-measured markers are
   asserted, so nothing silently becomes fact.

Read failures with that in mind. A red test here usually means *a number disagrees with reality*,
not *a function threw*.

---

## Categories

### 1. Capture reconciliation — does the model match the game?

The screenshot corpus (`migration/1.3.3.0/attachment-audit/`, 62 weapons, 3,189 records) is the
ground truth. These tests replay it against the live catalogs.

| File | Tests | Purpose |
| --- | --- | --- |
| `audit-phase0.test.mjs` | 11 | The main sweep. Checks every transcribed stat against the model and fails on any warning that isn't in a reviewed inventory. |
| `grip-pod-reconciliation.test.mjs` | 7 | Grip Pods and grips specifically — recoil tiers, costs, sniper variants, and the correction register. |
| `attachment-screenshot-schema.test.mjs` | 2 | The corpus itself is well-formed and declares schema v4. |
| `attachment-screenshot-taxonomy.test.mjs` | 4 | Attachment subtype classification: shared Laser/Light slots, combined-slot weapons, ammo subtype fallbacks. |

**What they catch:** a catalog tier that doesn't reproduce the displayed value; a stat that drifted
when data was edited; an attachment mapped to the wrong subtype.

**Why the inventories exist.** `audit-phase0` doesn't assert "zero warnings" — it asserts the
warning set *exactly equals* a reviewed inventory. A new disagreement fails, a fixed one also fails.
That's deliberate: it forces every disagreement to be looked at once and recorded, rather than
accumulating unread noise.

> **Subtype is identity.** For magazines, barrels and ammo, the corpus joins on `attachmentSubtype`,
> never `attachmentName` — EA's per-weapon naming for those slots is inconsistent (40 distinct names
> map to the one `basic` barrel). Joining on name produces false "missing attachment" findings.

### 2. Enumeration baselines — did this change more than intended?

These build every reachable loadout combination, hash the result, and compare against a committed
baseline. They are the blast-radius detector.

| File | Tests | Purpose |
| --- | --- | --- |
| `reload-phase3.test.mjs` | 3 | Pins the full 87,834-case reload enumeration and asserts the derived reload schema is authoritative. |
| `reload-phase4.test.mjs` | 1 | The validator rejects malformed or reintroduced legacy reload shapes, checked against an isolated data copy. |
| `barrel-velocity-phase7.test.mjs` | 5 | Velocity tier table, the `velTierMod`/`velMult` dual-read, and a 101,812-case comparison against the legacy path. |

**What they catch:** an edit intended for one weapon that silently moved another; a refactor that
changes output; a schema migration that leaves a legacy shape behind.

**How to update one.** When a change *should* move the numbers — adding a weapon, for instance —
regenerate rather than loosen:

```bash
node scripts/reload-phase3.test.mjs --write-baseline
```

Then update the roster constants at the top of the test to the new counts. Never edit a baseline by
hand; the point is that it is machine-derived.

> Adding a weapon changes every one of these. That is the system working, not breaking. Expect to
> re-pin the roster counts as part of the change, and read the diff to confirm only the new weapon's
> cases appeared.

### 3. Ballistics and damage — is the maths right?

The genuinely computational tests. These *are* unit tests.

| File | Tests | Purpose |
| --- | --- | --- |
| `damage.test.mjs` | 11 | Breakpoint lookup, BTK across hit-zone combinations, interpolation and clamping, sniper sweet spots, hit-zone classification, and damage source provenance. |
| `ballistics.test.mjs` | assert-style | Flight time and drop against reference values, zeroing behaviour, and null-input handling. |
| `target.test.mjs` | assert-style | Target geometry: zone boundaries, aim offsets, marker scaling. |
| `heavy-barrel-spread.test.mjs` | 2 | Heavy barrels scale spread identically across aim states and stances, and never pin a weapon at minimum spread. |
| `spread-bar-scale.test.mjs` | 3 | The UI spread bar's scale covers the corpus range without being stranded far above what the model can reach. |

`ballistics.test.mjs` and `target.test.mjs` are plain top-level assertion scripts rather than
`test()` blocks — they pass or throw, and print a single line.

**What they catch:** an off-by-one in breakpoint selection; a BTK that changes with hit order when
it shouldn't; a clamp that stops applying past the end of a curve.

### 4. Data integrity — is every value attributable?

| File | Tests | Purpose |
| --- | --- | --- |
| `sym-import.test.mjs` | 13 | The Sym importer: normalization stability, loud failure on bad mappings, the exact effective-recoil formula, reload policy, and EA reconciliation. |
| `estimated-weapons.test.mjs` | 5 | Exactly which weapons are estimated, that each has complete cross-file coverage, and that estimated status is surfaced in the UI. |
| `pp19.test.mjs` | 10 | A worked example pinned end to end — one weapon's imported values, catalogs, derived reload, and serialization. |

**What they catch:** a value imported without provenance; an estimate promoted to fact without
review; a weapon added to `weapons.json` without its entries in `attachments.json`, `ammo.json`,
`recoil_decay.json` and `balance_tables.json`.

**On `sym-import.test.mjs`'s recoil formula test.** It pins
`recoilV = amount × amountMult^amountExp` and keeps the raw components alongside the derived value.
This matters more than it looks: the derived number is what the game displays, and the raw
components are what attachment tiers operate on. Losing either makes the other unverifiable.

**Why PP-19 has its own file.** It was the first weapon imported through the current pipeline, so it
is pinned exhaustively as a reference implementation. If a pipeline change breaks something subtle,
PP-19 usually fails first and most legibly.

### 5. Feature behaviour — do specific mechanics work end to end?

| File | Tests | Purpose |
| --- | --- | --- |
| `subsonic-velocity-surface.test.mjs` | 7 | Every subsonic load a weapon offers has a velocity treatment, no treatment is stranded on an unequippable ammo type, and the reduced velocity reaches flight time and drop. |
| `frangible-health-regen.test.mjs` | 7 | Frangible's 9s regen delay against the 5s baseline, that no other ammo overrides it, and that the UI renders the chip. |

**What they catch:** a mechanic wired into the data but not reaching the resolver, or reaching the
resolver but not the UI. Both files deliberately assert the *entrypoints* pass the right tables in —
the classic failure is data that is correct and simply never read.

### 6. Smoke

| File | Tests | Purpose |
| --- | --- | --- |
| `runtime-syntax.test.mjs` | 2 | `ui/app.js` and every `sim/` module parse. |

The site ships as static files with no build step, so a syntax error would otherwise only surface in
a browser. Cheap, and catches the most embarrassing failure.

---

## Known failures

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

The VSSM is the only weapon where two tier 2 cards disagree with each other. It hands out a tier 3
recoil benefit at tier 2 cost. Datamined changelist 28877515 lists tier 3 for BROD 3, EF88, M16A3,
RPK-74M and VSSM, but the captures show it only manifests on the VSSM.

The catalog keeps the intended tier 2 card, so this row cannot pass. **It will go green on its own
if EA fixes the grip.** The policy here is deliberate: attachments are modelled as they are
*supposed* to work, and no weapon-specific branch is added to accommodate a bug.

---

## Conventions

**Pinned constants are contracts, not conveniences.** A literal like `weaponCount: 62` at the top of
a test is there so that adding a weapon is a decision someone makes, not something that happens.
Update it deliberately, in the same commit as the change that justifies it.

**Prefer re-pinning to loosening.** If an assertion is too strict, the usual fix is to regenerate its
baseline against reviewed data — not to widen the assertion until it passes. A weakened check keeps
the suite green while quietly ending its usefulness.

**Registries carry reasons.** Where a test excludes a case — a known bug, a game-side exception, a
reviewed correction — the exclusion is named, dated, and explained inline. An unexplained exclusion
is indistinguishable from a bug being hidden.

**A red suite nobody expects to be green stops being read.** The one known failure above is
documented precisely so it stays legible. If a second long-lived failure appears, either fix it or
document it to the same standard.

## Adding tests

Keep them proportionate. This suite is large because the data is large and hard to verify by eye,
not because coverage is a goal in itself. Before adding one, ask what wrong number it would catch
that nothing else does. A test that restates fixture contents rather than exercising the sim is
maintenance cost without cover — several were removed for exactly that reason.

For a new weapon, the existing tests already cover it once its data lands: `estimated-weapons`
checks cross-file completeness, the enumeration baselines catch ripples, and the capture
reconciliation checks it against screenshots. Follow the New Weapon checklist in
[`MAINTENANCE.md`](../MAINTENANCE.md) rather than writing bespoke tests.
