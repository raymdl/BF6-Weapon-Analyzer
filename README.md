# BF6 Weapon Analyzer

A static, client-side Battlefield 6 weapon comparison and recoil-analysis site. The current `main`
branch is the live product baseline. It loads JSON data directly in the browser and has no build step,
application server, database, or framework runtime.

The header identifies the game/source version represented by the data. That version is provenance,
not a development phase. Older published behavior remains available from the versioned archive links
in the site header.

## Run locally

Run `serve.bat`, or from the repository root:

```powershell
node scripts/serve.mjs
```

Then open <http://localhost:5174/>. A local server is required because browsers block the JSON
`fetch()` calls when the page is opened with `file://`.

## Project layout

```text
index.html                         Live page, styles, and accessible markup
ui/                                Rendering, interaction, URL sharing, image capture
sim/                               Weapon calculations and reusable domain logic
data/                              Current live weapon and attachment data
data/provenance/live-baseline.json Current source and policy record
schemas/                            Schemas for maintained data contracts
scripts/                            Product validation and focused regression tests
reference-data/attachment-audit/   Completed attachment audit and ad-hoc tools
assets/ and vendor/                 Shipped images and vendored browser dependency
v1.3.1.0/ and v1.2.3.0/            Frozen, published historical site versions
.local-archive/                     Ignored local-only historical working material
```

`.local-archive/` is deliberately not published or committed. The current archive includes a
SHA-256 manifest so locally retained material can be checked before use.

## Validation

Run the checks that protect the current product:

```powershell
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node --test
```

The normal suite is intentionally small. It covers current data integrity, damage and ballistics,
attachment behavior, URL-state compatibility, estimated-weapon disclosure, runtime syntax, target
geometry, and spread-scale bounds. It does not rerun completed capture/OCR work.

The attachment audit is retained as reference data. Run it only when attachments or weapons change:

```powershell
node reference-data/attachment-audit/validate-reference.mjs
```

See [docs/TESTS.md](docs/TESTS.md) for the exact boundaries and
[MAINTENANCE.md](MAINTENANCE.md) for update workflows.

## Data policy

- `data/` is the current live contract. Do not regenerate it merely to reproduce old intermediate work.
- Preserve exact source facts and provenance. Estimated weapons remain visibly marked and documented.
- Rounded UI readings are display evidence, not a replacement for exact source curves.
- Keep source arrays and attachment catalogs stable where share-link compatibility depends on ordering.
- Add a test only when it protects distinct product behavior that is not already covered more simply.

## Published historical versions

The folders `v1.3.1.0/` and `v1.2.3.0/` are intentionally published. They let visitors compare how
weapons behaved in older versions of the game. Treat them as frozen pages: fix the live site in the
current root unless the historical page itself is broken.

## Further documentation

- [CODE_DOCUMENTATION.md](CODE_DOCUMENTATION.md) — architecture and calculation boundaries
- [docs/DATA_FLOW.md](docs/DATA_FLOW.md) — current source-to-browser flow
- [docs/TESTS.md](docs/TESTS.md) — focused validation inventory
- [MAINTENANCE.md](MAINTENANCE.md) — common update procedures
- [reference-data/attachment-audit/README.md](reference-data/attachment-audit/README.md) — ad-hoc audit package
