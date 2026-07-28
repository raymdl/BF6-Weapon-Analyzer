# BF6 Weapon Analyzer

An interactive weapon stats and ballistics analyzer for Battlefield 6 multiplayer. Compare two
loadouts side by side, see damage-over-range and bullets-to-kill curves, and inspect simulated
recoil and spread patterns with attachments applied.

Static site — no build step, no dependencies, no framework. HTML, CSS, and ES modules, with a
vendored copy of Chart.js.

## Status

This branch is the live site: **Season 3 v1.3.1.0**, 58 weapons.

Work on the v1.3.3.0 update — new Sym.gg damage data, a reworked recoil model, the PP-19, and the
1.3.3.0 hit-zone multipliers — is in progress on a separate branch and is **not published yet.**
It stays off `main` until its release gates pass, because pushing here deploys.

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
| `preview_bloom.html` | Spread-visualization experiment tool — three chart approaches side by side |
| `preview_distance.html` | Distance-wall spray projection: 5 m, 10 m, 20 m, and custom distance panels |

The two preview pages are development tools for trying rendering ideas before porting them into the
main app. They share the same `sim/` modules and data files as `index.html`.

## Layout

```
index.html                ← Primary app shell
preview_bloom.html        ← Spread chart experiment tool
preview_distance.html     ← Distance projection tool

ui/app.js                 ← App state, rendering, charts, recoil UI
vendor/chart.umd.min.js   ← Local Chart.js bundle

sim/
  core.js                 ← Shared simulation math (RNG, recoil, spread)
  applyAttachments.js     ← Attachment effects and derived stats
  loadout.js              ← Loadout defaults, point totals, sidebar helpers
  attachments.js          ← Canonical attachment slot definitions

data/                     ← weapons, attachments, ammo, balance tables, recoil decay
docs/img/                 ← Architecture and spray-model diagrams
scripts/validate-data.mjs ← Cross-file data validation
v1.3.1.0/, v1.2.3.0/      ← Frozen published archives
```

## Data

All weapon and attachment stats come from [sym.gg](https://sym.gg), with the spread decay model
referenced from Dr. Smiley Henry, spray-pattern sanity checks from TheXclusiveAce, additional weapon
data from SORROW, and validation plus the recoil variation tier-system discovery from SheetOnMyFace.

A handful of values are visually calibrated rather than sourced — chart scale defaults, scatter run
count, the spread bubble round schedule, cone rendering shape, and distance panel sizing. These are
presentation choices, not claims about game behavior.

Scope note: the site models **multiplayer only.** REDSEC armor is out of scope. Projectile travel,
drag, and gravity are not simulated — damage, BTK, and TTK all assume a hit.

## Checks

Data validation, also run by CI on every push and pull request via
`.github/workflows/validate-data.yml`:

```bash
node scripts/validate-data.mjs
```

## Documentation

- [CODE_DOCUMENTATION.md](CODE_DOCUMENTATION.md) — architecture, module APIs, data field reference,
  the recoil/spread model, rendering flow, and known-issue notes.
- [MAINTENANCE.md](MAINTENANCE.md) — practical "where do I change X" guide for data and stat updates.

## Deployment

GitHub Pages serves `main` at `https://raymdl.github.io/BF6-Weapon-Analyzer/`. There is no build
step; pushing to `main` publishes. Treat `main` as the released version and keep in-progress release
work on its own branch until its gates pass.
