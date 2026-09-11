# BF6 Weapon Analyzer

[Open the analyzer](https://raymdl.github.io/BF6-Weapon-Analyzer/) · [User guide](docs/USER_GUIDE.md) · [Documentation index](docs/README.md)

A browser-based Battlefield 6 weapon and attachment comparison tool. Build a loadout,
compare two configurations, and explore how damage, handling, recoil, spread, and
projectile behavior change. Everything runs client-side from the repository's JSON
and JavaScript; there is no application backend or compilation step.

## What it does

- **Build and compare:** weapon-specific attachments, ammunition, magazines, point
  totals, overview statistics, and attachment-effect breakdowns.
- **Analyze damage:** damage-versus-range, bullets to kill, and time to kill, with
  headshot scenarios, chest/limb bands, and optional ADS/flight time.
- **Explore recoil and spread:** reproducible spray samples, recoil paths, spread
  overlays, standing/moving and ADS/hipfire contexts, and recoil-control settings.
- **Inspect target impacts:** project the pattern onto an approximate soldier at a
  chosen distance, change aim and magnification, and inspect single-projectile hit
  and damage outcomes.
- **Share results:** loadout/view links, PNG capture, and a recoil popout window.

The site combines reviewed game-file values, in-game observations, and explicit
modeling assumptions. A simulation result is conditional on those inputs. Target
geometry is approximate; shotgun pellets are not individually simulated. Start
with [model limitations](docs/MODEL_LIMITATIONS.md) when interpreting precision.

The recoil model delivers each shot over its selected Frosty duration while
recovery acts at the same time. Base duration is 25 ms for all 63 currently
supported weapons. Smooth attachments use 50 ms and a 1.2 recovery factor;
17 weapon–muzzle combinations use the source Bolt values of 66.667 ms and 1.728.
Heavy-type barrels now use source ADS spread and recovery factors, supported by
the AK4D recording comparison. These inputs improve the approximation; they do
not establish the native engine formulas. See [recoil and spread](docs/RECOIL_SPREAD_MODEL.md)
for the attachment exceptions, formulas, and evidence limits.

## Run locally

From the repository root, run `serve.bat` on Windows or:

```sh
node scripts/serve.mjs
```

Open <http://localhost:5174/>. Use HTTP rather than opening `index.html` through
`file://`, because the application fetches its JSON data.

## Documentation

| Purpose | Read |
|---|---|
| Use the site and interpret its displays | [User guide](docs/USER_GUIDE.md) |
| Understand modules, state, sharing, and rendering | [Architecture](docs/ARCHITECTURE.md) |
| Trace values to sources and review evidence | [Data sources](docs/DATA_SOURCES.md) |
| Look up file contracts, fields, and array families | [Data reference](docs/DATA_REFERENCE.md) |
| Understand every stat ladder and its indexing | [Stat ladders](docs/STAT_LADDERS.md) |
| Follow loadout calculations | [Attachment model](docs/ATTACHMENT_MODEL.md) |
| Inspect formulas and simulation assumptions | [Damage and ballistics](docs/DAMAGE_BALLISTICS.md) · [Recoil and spread](docs/RECOIL_SPREAD_MODEL.md) |
| Update or validate the project | [Maintenance](MAINTENANCE.md) · [Tests](docs/TESTS.md) |

VSSM hipfire uses source index 4 (1.804 degrees standing / 2.255 degrees moving), supported
by the [matched standing screenshot comparison](docs/VSSM_RECORDING_ANALYSIS_2026-09-11.md).
The moving value follows the source table.

## Current product and history

The root page and `data/`, `sim/`, and `ui/` contain the current product. The
header's version identifies the represented source/game version; it is not a
claim that every field was independently measured on that build.

`v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/` are frozen, published site snapshots.
[Archived research and implementation records](archive/README.md) explain past
work and decisions. Use the current guides above for present behavior.

Before submitting changes, run:

```sh
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node scripts/test.mjs
```
