# BF6 Weapon Analyzer

An interactive weapon stats and ballistics analyzer for Battlefield 6 multiplayer. Compare two
loadouts side by side, see damage-over-range, bullets-to-kill and time-to-kill curves, and inspect
simulated recoil, spread and projectile drop with attachments applied.

Static site — no build step, no dependencies, no framework. HTML, CSS, and ES modules, with a
vendored copy of Chart.js.

## Status

**`main` is the live site and is on Season 4 v1.3.3.0.** Weapon data is pinned to the Sym.gg
v1.3.3.0 snapshot (30 JUN 2026); the site header carries its own last-updated date for changes made
after the data pin.

Older releases stay browsable as frozen archives under `v1.3.1.0/` and `v1.2.3.0/`, linked from the
site header. Those directories are deliberately untouched by later changes.

Release work continues in [BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md](migration/1.3.3.0/BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md),
which tracks what shipped and what is still open. Anything still open is listed under
[Known gaps](#known-gaps) below rather than left implied.

## What changed in 1.3.3.0

**Roster — 58 → 61 weapons.** PP-19 is fully sourced (base stats, recoil object, spread model,
cross-file attachment/magazine/ammo coverage). BROD 3 and EF88 are carried as explicit **estimates**:
their simulation fields are donor-derived and their damage curves provisional. The UI marks them with
an `Estimated` badge and an asterisk on affected stats, and they are excluded from the projectile
model rather than given a plausible-looking fallback. VSSM stays out of the roster until Sym
publishes it. Current split:

| Class | Count |  | Class | Count |
|---|---|---|---|---|
| Assault Rifle | 11 | | DMR | 5 |
| Carbine | 9 | | Sniper Rifle | 5 |
| SMG | 10 | | Shotgun | 4 |
| LMG | 10 | | Sidearm | 7 |

**Reworked recoil and spread.** Effective recoil is now recomputed by the importer as
`amount x multiplier^exponent` with the raw ADS/hip components retained, rather than hand-copied.
Recoil decay and multiplier tables were regenerated from the same pinned source, as were the ADS/hip
spread increments, stance bounds, and idle/firing/not-firing recovery coefficients.

**1.3.3.0 hit zones.** Limb multipliers are class-based — automatic `0.84`, DMR `0.91`, sniper
`0.67`, shotgun and sidearm `1.00` — and automatic headshots run the ammo-tier ladder
`1.40 / 1.57 / 1.80` (standard / hollow point / synthetic). Zone naming is explicit: **unarmored
chest** and **stomach/limbs** replace the old ambiguous "body". Sniper sweet spots are read off the
Sym damage curve rather than stored, so a later refresh that moves a window flows straight through;
the Mini Scout, which has no plateau, needs no exception to say so. All of this lives in
`sim/damage.js`, so every page resolves zones the same way.

**Projectile ballistics (new).** `sim/ballistics.js` and `data/ballistics.json` add level-flight
timing and target drop for the 59 source-backed weapons:

- **TTK `+VEL`** is an independent toggle beside `+ADS`. It adds the lethal projectile's flight time
  once, at each plotted range, across chart, tooltip, axis label and kill table. It is arrival timing
  for a level, stationary target — no moving-target lead, terrain, or elevation.
- **Soldier Target** is ballistic: spray dots, scatter, recoil path, bubbles, cone and the hit-zone
  summary all share one per-build projectile Y offset. DMRs and snipers get a 100/200/300/400/500 m
  zero selector (default 100 m) via a Zeroing button; other classes show bore-line drop until their
  zeroing inputs are sourced. Target distance runs 5–300 m.

Gravity is `-9.81 m/s²` and base drag `0.0035 /m`; Long-Range / Match Grade ammo uses `0.002`. A
build needs both a listed weapon ID and a resolved positive `bulletVel` or the feature reports
unavailable.

**Attachment data.** Barrel velocity and reload timing are now *derived* from the in-game screenshot
audit rather than assumed, under the gates in
[DERIVED_ATTACHMENT_MODEL.md](migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md) — each derived value has
to reproduce its screenshot reading and pass derived-versus-legacy equivalence. Alongside that:
attachment vocabulary and per-weapon availability were corrected, the light half of the combo
laser/light devices is now modelled, several attachment point costs were fixed, and 60 of 68 magazine
tier mismatches were resolved from screenshot evidence.

**Share links.** URL state now carries `vel` (TTK velocity toggle) and `rz` (zero distance) alongside
the existing weapon, attachment, chart, recoil and target parameters. Attachment arrays are only ever
appended to, so older share links keep resolving to the same build.

## Running it locally

Pages use `<script type="module">`, so opening the HTML files as `file://` URLs will fail. Serve the
directory over HTTP:

```bash
python -m http.server 5174
```

Then open `http://localhost:5174/`.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | The primary analyzer: loadout sidebar, overview cards, damage/BTK/TTK charts, recoil and target panel |
| `preview_spread.html` | Spread-visualization experiment tool — three chart approaches side by side |

The preview page is a development tool for trying rendering ideas before porting them into the
main app. It shares the same `sim/` modules and data files as `index.html`. It is recorded as
`developmentOnly` in `ship-surface.json` and is not loaded or linked by the live entrypoint.

## Layout

```
index.html                ← Primary app shell
preview_spread.html       ← Spread chart experiment tool

ui/app.js                 ← App state, rendering, charts, recoil/target UI
vendor/chart.umd.min.js   ← Local Chart.js bundle

sim/
  core.js                 ← Shared simulation math (RNG, recoil, spread)
  damage.js               ← Damage falloff, hit zones, bullets-to-kill
  ballistics.js           ← Flight time, RK4 trajectory, zero-relative drop
  applyAttachments.js     ← Attachment effects and derived stats
  loadout.js              ← Loadout defaults, point totals, sidebar helpers
  attachments.js          ← Canonical attachment slot definitions
  target.js               ← Distance-target geometry
  share-state.js          ← URL-hash loadout sharing

data/                     ← weapons, attachments, ammo, ballistics, balance tables,
                            recoil decay, reload exceptions, provenance
schemas/                  ← JSON schemas for the audit and reload-exception datasets
scripts/                  ← Sym.gg importers, validators, migration scripts, tests
generated-data/sym/       ← Sym.gg import artifacts: mapping, normalized, diff, reconciliation
migration/1.3.3.0/        ← Release plan, derived attachment model, audit inventories
v1.3.1.0/, v1.2.3.0/      ← Frozen published archives
ship-surface.json         ← Declares the live runtime boundary (paths + fetched data)
```

## Data

All weapon and attachment stats come from [sym.gg](https://sym.gg), with the spread decay model
referenced from Dr. Smiley Henry, spray-pattern sanity checks from TheXclusiveAce, additional weapon
data from SORROW, and validation plus the recoil variation tier-system discovery from SheetOnMyFace.

A handful of values are visually calibrated rather than sourced — chart scale defaults, scatter run
count, the spread bubble round schedule, cone rendering shape, and distance panel sizing. These are
presentation choices, not claims about game behavior.

Sym.gg imports run through `scripts/`, writing their mapping, normalized output, diff, and
reconciliation into `generated-data/sym/<release>/` so a data change can be reviewed before it
touches `data/`. Note that the sym.gg field names are mapped to site ids at import time
(`hk433` → `m433`, `g36` → `b36a4`, and so on); the mapping is data, not a rename in the code.

Scope note: the site models **multiplayer only.** REDSEC armor is out of scope and chest values are
unarmored. Projectile flight time and drop *are* now modelled for source-backed weapons (see above),
but firing TTK still assumes a hit — the model does not decide whether un-compensated drop, lead, or
terrain would make a shot miss.

## Checks

Data validation (also run by CI on every push and pull request via
`.github/workflows/validate-data.yml`):

```bash
node scripts/validate-data.mjs      # passes for 61/61 weapons
node scripts/validate-ship-surface.mjs
```

`validate-ship-surface.mjs` checks that the live runtime boundary declared in `ship-surface.json`
still matches what `index.html` actually loads — update that file whenever the entrypoint, its
modules, assets, or fetched data change.

Unit tests, using the built-in Node test runner:

```bash
node --test
```

Node discovers the `scripts/*.test.mjs` files on its own. Don't pass the directory —
`node --test scripts/` tries to resolve it as a module and fails on Node 24. The importer tests
resolve a pinned baseline commit, so run them against a **full clone**; a shallow clone fails
`sym-import.test.mjs` with `fatal: Needed a single revision`.

Current state on a full clone of `main`: **79 tests, 67 pass, 2 fail, 10 skip.**

- The 10 skips need the pinned `sym_bf6_1.3.3.0.json` under `outputs/`, which is gitignored. They
  cover importer normalization, mapping failure modes, the recoil formula, reload policy, and EA
  reconciliation.
- The 2 failures are stale pin assertions over the tracked attachment audit corpus, not site
  behavior: `audit-phase0.test.mjs` expects 24 field-by-slot findings and the corpus now yields 12,
  and `barrel-velocity-phase7.test.mjs` expects an evidence path with a leftover truncated prefix
  that the screenshot rename pass removed. Both predate the most recent data commits. These pins are
  designed to fail loudly when an inventory changes so the change gets adjudicated rather than
  silently absorbed — see the plan's §4.12.

Two of the passing tests check the tracked attachment-screenshot review data against its schema.
That dataset is hand-corrected rather than generated — see
[BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md](migration/1.3.3.0/BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md)
— so the test exists to catch it drifting from its declared contract.

## Known gaps

- **BROD 3 / EF88** carry donor-derived simulation fields and provisional damage curves. Replace them
  when Sym publishes full statistics; VSSM stays excluded until then.
- **Four confirmed live ADS errors** remain open (PSR 7Rnd ADS time; ADS-move for PSR 10Rnd,
  M2010 ESR 8Rnd, SV-98 10Rnd). Two are default magazines, so they are wrong base indices rather than
  per-magazine shifts.
- **Eight unadjudicated magazine tier mismatches**, four unread grip-velocity rows, and 18
  corpus-only `adsTimeMs` rows are blocked on operator captures. Each is pinned and inventoried under
  `migration/1.3.3.0/attachment-audit/`, so they can wait without decaying.
- **Deferred to a later release:** the full drag/gravity schema fields and validator coverage, the
  Match Grade ammo drag mapping, and a standalone ballistics panel with target lead and drop readouts.

## Documentation

- [CODE_DOCUMENTATION.md](CODE_DOCUMENTATION.md) — architecture, module APIs, data field reference,
  the recoil/spread/ballistics model, rendering flow, and known-issue notes.
- [MAINTENANCE.md](MAINTENANCE.md) — practical "where do I change X" guide for data and stat updates.
- [docs/DATA_FLOW.md](docs/DATA_FLOW.md) — where each number comes from: sources, staging, promotion
  gates, and which evidence is reference-only. Diagrams render on GitHub.
- [BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md](migration/1.3.3.0/BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md) — the 1.3.3.0
  release plan, progress log, and open checklist.
- [DERIVED_ATTACHMENT_MODEL.md](migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md) — how screenshot
  evidence becomes a shippable attachment value, and the gates it has to clear first.

The in-game attachment screenshot audit is a one-off exercise and is kept largely local: its OCR and
workbook tooling and the ~1.7 GB screenshot corpus are gitignored. The review dataset, inventories,
and apply scripts are tracked, but only values promoted out of them reach `data/`.

## Deployment

GitHub Pages serves `main` at `https://raymdl.github.io/BF6-Weapon-Analyzer/`. There is no build
step; pushing to `main` publishes. Because of that, treat `main` as the released version and keep
in-progress release work on its own branch until the plan's gates pass.
