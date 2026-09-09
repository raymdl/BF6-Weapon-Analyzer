# Maintenance guide

[Documentation index](docs/README.md) · [Data sources](docs/DATA_SOURCES.md) · [Tests](docs/TESTS.md)

Maintain the current root product with direct, reviewed changes to the smallest
relevant files. Preserve unrelated local work and confirm the intended branch
before editing. Distinguish live data/model changes, presentation, published
historical pages, and reference-only research.

## Routine validation

```sh
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node scripts/test.mjs
git diff --check
```

CI runs the first three using Node 20. The local server is
`node scripts/serve.mjs` (port 5174), or `serve.bat` on Windows. No dependency
installation is needed for the normal product suite. UI changes also require the
[manual walkthrough](docs/TESTS.md#manual-ui-verification).

## Update weapons, attachments, or calculations

Start with [file ownership and field contracts](docs/DATA_REFERENCE.md).
`weapons.json` owns base records; `attachments.json`, `ammo.json`, and
`balance_tables.json` own selectable effects and shared policies. `ballistics.json`
records projectile constants/source identity; its ID registry is not an exclusive
runtime applicability gate.

Preserve exact curve points and source decimals. Do not replace exact damage
curves with rounded panel observations. Record source version/path/GUID, field,
raw value, units, hash, and derivation where available. Separate confirmed source
literals from their activation and simulator interpretation. Mark fitted or
assumed effects and retain evidence that conflicts with the candidate.

Preserve existing attachment/ammo catalog order and IDs. **Magazine object-key
order also encodes share tokens.** Append compatible additions; use explicit codec
migration and tests for an intentional ordering change. Confirm availability,
combined slots, point totals, default-build normalization, and composed effects.
A modifier belongs in its actual aim-state/axis rather than in a generic catch-all.

For array changes, check [stat ladders](docs/STAT_LADDERS.md): retain all rows,
repeated endpoints, raw precision and unrelated hashed columns. Preserve the
catalog-to-source sign conversion; sum modifiers before one final clamp. Compare
at least a default build, an affected composed build, and a boundary/exception case.
Update the current guide's table/formula/example alongside the data change.

Run the data validator, the affected focused test, and the full product suite.
Inspect a representative affected build in the browser and its dependent chart/
table. Add a test only for a distinct regression not covered more simply.

## Reload exceptions and provenance

[data/reload-exceptions.json](data/reload-exceptions.json) records animation
identities/timings, screenshot exceptions, and composed-loadout observations.
Keep stable IDs and the evidence fields required by each record type. Runtime
magazine overrides must agree with the register; `validate-data.mjs` checks them
through `scripts/reload-exceptions.mjs`. Expected fixed-game behavior in a bug note
is not permission to overwrite an observed exception.

[data/provenance/live-baseline.json](data/provenance/live-baseline.json) owns
current source identity, roster and policy. Update it when those change. Keep
reviewed source arrays and input hashes in provenance when needed to explain a
mapping or reproduce a comparison; the maintained runtime numeric contract remains
in `data/`. Do not rewrite historical snapshot hashes to match current files.

## Research and reference work

The [attachment audit](reference-data/attachment-audit/README.md) is separate from
CI and the normal suite. Run its validator explicitly when modifying its records:

```sh
node reference-data/attachment-audit/validate-reference.mjs
```

The canonical JSON drives the review workbook. Raw screenshot paths under
`reference-data/attachment-audit/Weapon Attachments/` and `.local-archive/` are
ignored and not guaranteed on another machine. Retain source identity when adding
visually reviewed captures; OCR output alone is not an accepted value.

Frosty tools require the original local exports/SDK. For example, replace the
placeholder with your export root:

```sh
python scripts/frosty-configuration.py --root "PATH_TO_EXPORT" --out outputs/frosty/review
python scripts/frosty-configuration.test.py
```

The configuration comparison never writes live data. `--include-optics`,
`--sdk-metadata` and `--identities` select optional inputs. Run `--help` on
`scripts/research-attachment-modifiers.py` or `scripts/verify-shotgun-ammo.py` before
using them; do not promote generated candidates automatically. The SDK metadata
PowerShell helper requires `-FrostyDirectory` and `-OutputPath`.

## Documentation lifecycle and historical versions

The repository README stays high-level. The [documentation index](docs/README.md)
defines current guides and their audiences. Put accepted formulas/units/fallbacks
in the responsible guide, unresolved evidence in [limitations](docs/MODEL_LIMITATIONS.md),
and completed plans or dated investigations in [archive/](archive/README.md).
Every archived record must have an explicit status and current replacement in the
archive index. Do not mark all questions resolved just because a report is archived.

After moving documents, update Markdown links and machine-readable provenance
pointers. Check current document links/anchors, preserve historical evidence bodies,
and identify local-only capture references instead of pretending they ship. Existing
Mermaid diagrams render in GitHub; the SVG illustration remains self-contained.

Keep `v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/` frozen, with their header links and
ship-manifest entries. These published products are distinct from the narrative
research archive. Never make the current runtime import a historical copy.

## Shipping checklist

Review the final diff and scope; run all routine checks. For UI changes verify
responsive layout, keyboard/ARIA behavior, chart resizing, target-image loading,
sharing/capture and popout behavior. For documentation changes check destinations,
formulas/examples, array coverage and diagram syntax. Confirm archive links and
source pointers, and state which checks could not be performed. Keep numerical
changes, evidence decisions and presentation-only edits identifiable in the handoff.
