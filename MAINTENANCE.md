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
`balance_tables.json` own selectable effects and shared policies. Generated
`hit_zones.json` and `ballistics.json` resolve weapon/ammo selections to source
multipliers and projectile records. Ballistics requires an explicit selection;
there is no global coefficient fallback. `COLLATERAL_MULT_OVERRIDE` contains all
supported weapon/ammo collateral values generated from the retained source table.

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

Run checks proportionate to the change: affected focused tests and data validation
for behavior/data edits, with the full product suite before a combined release.
Inspect an affected UI build when presentation changes. Documentation-only edits
need link, formula and example checks rather than a repeated product suite.
Add a test only for a distinct regression not covered more simply.

## Regenerate attachment modifiers

Use the reviewed Frosty export root with these checks before changing generated
attachment fields:

```sh
python scripts/frosty-barrel-ads.py --root <Frosty-export-root> --check
python scripts/frosty-attachment-handling.py --root <Frosty-export-root> --check
python scripts/frosty-sniper-brakes.py --root <Frosty-export-root> --check
python scripts/frosty-assumption-review.py --root <Frosty-export-root> --check
```

For generation, omit `--check` on the first three; replace it with `--apply` on
the assumption review. Inspect catalog and evidence diffs together. Keep
per-weapon overrides, source base coordinates and magazine shifts consistent.
Do not promote unresolved fields or source-only attachment availability.
The [generation report](docs/working/FROSTY_ATTACHMENT_GENERATION_2026-09-13.md)
records accepted mappings and remaining exceptions.

Regenerate shared rails and attachment dependencies from Frosty rather than
editing `WEAPON_ATTS.slots` or `dependencies` by hand:

```sh
python scripts/frosty-attachment-compatibility.py --root <Frosty-export-root> --check
```

Omit `--check` to regenerate. Review the catalog and
`reference-data/provenance/frosty-attachment-compatibility.json` together.
Missing or ambiguous offered slot identities stop generation. Dependencies use
reviewed attachment identities; unsupported source options remain in evidence.
Keep positional URL tokens stable. Check replacement, empty selection, point
costs, legacy links, prerequisite changes and weapon switching.

After reviewing compatibility changes, update the
[Frosty asset findings](reference-data/frosty/README.md#shared-slots-and-attachment-dependencies)
with source hashes, evidence pointers and limits. Run
`python scripts/frosty-watchlist-merge.py --datamining <datamining-root>` to review
collection changes, then add `--write` to save them. Preserve earlier findings.

After a game update, list attachment actions that select more than one modifier
package:

```sh
python scripts/frosty-multi-package-scan.py --root <Frosty-export-root>
```

Add `--out <file>` for JSON. Each hit is a candidate for a full trace and an
in-game check; record confirmed cases in
[attachment bugs and mismatches](docs/ATTACHMENT_BUGS.md).

## Regenerate attachment tooltips

Follow the [description audit commands](docs/working/FROSTY_DISPLAY_NAMES.md#regeneration-and-verification)
to regenerate `data/attachment-tooltips.json` and both mapping reports together.
Keep `--optic-mapping-json` in the command. The generator requires the original
local AAM XML, Frosty export, and ignored capture library; the small mapper tests
do not. Approved panel text is enabled explicitly in `panelLinkageInvestigation`
and checked against the original hardware/UI link and screenshot hash. A row with
`status: linked-text-differs-from-panel` may also replace a linked English string
that differs from the live panel; record the reason and keep the original pointer. Never
replace a missing Frosty string ID with an unrelated ID that has matching text.
Review the 2,948 source-text, 18 panel-text and 45 deferred choice counts, and
retain the per-choice source distinction. Also check all 63 iron-sight tooltips,
including the Classic M16A4 and aperture UMG-40 defaults. The generator reads the
MG5 iron-sight descriptor directly from the weapon export outside the UI batch.
The runtime JSON is part of the ship surface.

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

Frosty tools require the original local exports/SDK. See the
[current export location and layout](docs/DATA_SOURCES.md#local-frosty-export-location).
For example, replace the placeholder with your XML export root:

```sh
python scripts/frosty-configuration.py --root "PATH_TO_EXPORT" --out outputs/frosty/review
python scripts/frosty-configuration.test.py
```

The configuration comparison never writes live data. `--include-optics`,
`--sdk-metadata` and `--identities` select optional inputs. Run `--help` on
`scripts/research-attachment-modifiers.py` or `scripts/verify-shotgun-ammo.py` before
using them; do not promote generated candidates automatically. The SDK metadata
PowerShell helper requires `-FrostyDirectory` and `-OutputPath`.

Headshot and limb multipliers are generated from Frosty. After a game update, dump
the raw level material grids, then regenerate `data/hit_zones.json`. Never open a
material grid with FrostyCmd `export-ebx` or the Frosty editor: the decoder can
exhaust memory. If an export fails or stalls, stop leftover `FrostyCmd`/`FrostyEditor`
processes.

The local FrostyCmd also has `export-strings` (decode a localization language
asset to `id<TAB>text`) and `scan-string-usage` (find string ids in EBX assets under
path prefixes, with level assets skipped and a 12 GB stop). FrostyCmd is not part of
this repository; [this patch](reference-data/provenance/frostycmd-string-tools-2026-09-13.patch)
adds both commands. See [weapon display names](docs/working/FROSTY_DISPLAY_NAMES.md) for
the procedure.

```sh
powershell -NoProfile -File scripts/frosty-raw-assets.ps1 -FrostyDirectory "PATH_TO_FROSTY" -GamePath "PATH_TO_GAME" -OutputDirectory outputs/frosty-raw -Routes "game/glaciermp/levels/mp_abbasid/mp_abbasid/materialgrid_win32,game/glaciermp/levels/mp_badlands/mp_badlands/materialgrid_win32"
python scripts/frosty-hit-zones.py --root "PATH_TO_EXPORT" --descriptors "PATH_TO_FROSTY/SharedTypeDescriptors.ebx" --grid outputs/frosty-raw/game__glaciermp__levels__mp_abbasid__mp_abbasid__materialgrid_win32.ebx --grid outputs/frosty-raw/game__glaciermp__levels__mp_badlands__mp_badlands__materialgrid_win32.ebx
node scripts/validate-data.mjs
```

The XML export and the raw grids must come from the same game build. The extractor
stops on conflicting links or disagreement between grids, but can record a base
fallback for missing ammo attachments. Review those issues; the current 328 ammo
selections have no missing-attachment fallback. Review its dated evidence file
and every changed value before committing `data/hit_zones.json`.

After regenerating hit zones, pass that exact dated trace to the ballistics
generator. Replace `YYYY-MM-DD` below with the date in the trace filename:

```sh
python scripts/frosty-ballistics.py --root "PATH_TO_EXPORT" --trace reference-data/provenance/frosty-hit-zones-YYYY-MM-DD.json
python scripts/frosty-collateral.py
```

Ballistics checks the trace's XML hashes and ammo roster before writing projectile
inputs; missing attachments and unresolved SP projectile selections stop generation.
The collateral tool rebuilds values from the retained compiled-table trace, not
fresh XML. After a game update, refresh and review that trace first. It sums base
and ammo index shifts, clamps to the ten-row table, and checks roster coverage.

Distribution exponents and light factors have separate source evidence in the
[evidence index](reference-data/provenance/README.md). Preserve the Interdictor
moving-ADS exponent and the light target fields. Do not apply the retained idle
light operand until an idle-state model has been reviewed.

## Documentation lifecycle and historical versions

The repository README stays high-level. The [documentation index](docs/README.md)
defines current guides and their audiences. Put accepted formulas/units/fallbacks
in the responsible guide, unresolved evidence in [limitations](docs/MODEL_LIMITATIONS.md),
and completed plans or dated investigations in [docs/archive/](docs/archive/README.md).
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
