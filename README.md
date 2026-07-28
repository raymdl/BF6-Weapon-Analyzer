# BF6 Weapon Analyzer

An interactive weapon stats and ballistics analyzer for Battlefield 6 multiplayer. Compare two
loadouts side by side, see damage-over-range and bullets-to-kill curves, and inspect simulated
recoil and spread patterns with attachments applied.

Static site — no build step, no dependencies, no framework. HTML, CSS, and ES modules, with a
vendored copy of Chart.js.

## Status

**`main` is the live site and is pinned to Season 3 v1.3.1.0.**

The v1.3.3.0 update lives on the `codex/update-1.3.3.0` branch and **is not live yet.** That branch
carries the new Sym.gg damage data, the reworked recoil model, the PP-19 (bringing the roster from
58 to 59 weapons), and the 1.3.3.0 hit-zone multipliers. It is still a test build: several release
gates in [BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md](BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md) are open,
most notably the attachment-value refresh, the visible provisional-data disclaimer, and browser QA.
Anything in this README describing 1.3.3.0 behavior describes that branch, not what is published.

Older releases stay browsable as frozen archives under `v1.3.1.0/` and `v1.2.3.0/`, linked from the
site header. Those directories are deliberately untouched by later changes.

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
| `index.html` | The primary analyzer: loadout sidebar, overview cards, damage/BTK charts, recoil panel |
| `preview_spread.html` | Spread-visualization experiment tool — three chart approaches side by side |
| `preview_distance.html` | Distance-wall spray projection: 5 m, 10 m, 20 m, and custom distance panels |

The two preview pages are development tools for trying rendering ideas before porting them into the
main app. They share the same `sim/` modules and data files as `index.html`.

## Layout

```
index.html                ← Primary app shell
preview_spread.html       ← Spread chart experiment tool
preview_distance.html     ← Distance projection tool

ui/app.js                 ← App state, rendering, charts, recoil UI
vendor/chart.umd.min.js   ← Local Chart.js bundle

sim/
  core.js                 ← Shared simulation math (RNG, recoil, spread)
  damage.js               ← Damage falloff, hit zones, bullets-to-kill
  applyAttachments.js     ← Attachment effects and derived stats
  loadout.js              ← Loadout defaults, point totals, sidebar helpers
  attachments.js          ← Canonical attachment slot definitions
  target.js               ← Distance-target geometry
  share-state.js          ← URL-hash loadout sharing

data/                     ← weapons, attachments, ammo, balance tables, recoil decay, provenance
scripts/                  ← Sym.gg importers, data validator, tests
generated-data/sym/       ← Sym.gg import artifacts: mapping, normalized, diff, reconciliation
v1.3.1.0/, v1.2.3.0/      ← Frozen published archives
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

Scope note: the site models **multiplayer only.** REDSEC armor is out of scope. Projectile travel,
drag, and gravity are not simulated — damage, BTK, and TTK all assume a hit.

## Checks

Data validation (also run by CI on every push and pull request via
`.github/workflows/validate-data.yml`):

```bash
node scripts/validate-data.mjs
```

Unit tests, using the built-in Node test runner:

```bash
node --test
```

Node discovers the `scripts/*.test.mjs` files on its own. Don't pass the directory —
`node --test scripts/` tries to resolve it as a module and fails on Node 24.

On the `codex/update-1.3.3.0` branch as of this writing, the validator passes for 59/59 weapons and
the four test files pass 26/26.

## Documentation

- [CODE_DOCUMENTATION.md](CODE_DOCUMENTATION.md) — architecture, module APIs, data field reference,
  the recoil/spread model, rendering flow, and known-issue notes.
- [MAINTENANCE.md](MAINTENANCE.md) — practical "where do I change X" guide for data and stat updates.
- [BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md](BF6_UPDATE_1.3.3.0_SITE_UPDATE_PLAN.md) — the 1.3.3.0
  release plan, progress log, and open checklist.
The in-game attachment screenshot audit is a one-off exercise and is kept entirely local: its
instructions, OCR and workbook tooling, review schema, and the ~1.7 GB screenshot corpus are all
gitignored. Only values promoted out of it into `data/` come back to the repo.

## Deployment

GitHub Pages serves `main` at `https://raymdl.github.io/BF6-Weapon-Analyzer/`. There is no build
step; pushing to `main` publishes. Because of that, treat `main` as the released version and keep
in-progress release work on its own branch until the plan's gates pass.
