# Maintenance guide

[Documentation index](docs/README.md) · [Data sources](docs/DATA_SOURCES.md) · [Tests](docs/TESTS.md)

Confirm the branch and affected files before editing. Preserve unrelated local
work. Review data/model changes, presentation changes, historical pages, and
reference research separately.

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
Apply each modifier only to its supported aim state and stat axis.

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
The [Frosty attachment notes](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/ATTACHMENTS.md#generated-site-values)
records accepted mappings and remaining exceptions.

The handling generator runs from this repository alone (raw mode as above). It owns
grip and laser per-weapon axes, grip and magazine moving-ADS spread (GS binding
collection `Field_2ffeb6ac` only), magazine draw/sprint/ADS axes, `weaponSwayMult`,
`reloadSpeedTier`, `reloadSpeedMult` and `tacRldOverrideMs`, and writes their copies in
`reload-exceptions.json` `animationOverrides` and `weapon_attributes.json`
`mobilityInputs`. Identities come from
`reference-data/provenance/frosty-handling-mapping-*.json`; a new grip, laser or
magazine needs a row in a new dated copy. Fields it does not own are listed in the
script (`NOT_OWNED`) and counted in its output; any other key stops the run. A value
the site keeps different from the files is a row in `data-src/overrides.json`
(generator `frosty-attachment-handling`, with `field`).

Shared rails, attachment dependencies, individual optics and tooltips come from
four generators that run from the capture and this repository alone. `<RAW>` is
the raw arguments of the point-cost command below; `<tmp>` is any scratch folder.
Run them in this order; each `--check` writes no site data and exits 1 on any
difference from the committed files:

```sh
python scripts/frosty-attachment-tooltips.py Common/Hardware/Weapons <tmp>/tooltips.json <RAW> --strings <capture>/fs_us_loc.strings.tsv --optic-mapping-json <tmp>/optic-mapping.json --check
python scripts/frosty-availability.py <RAW> --strings <capture>/fs_us_loc.strings.tsv --report-out <tmp>/availability.json --check
python scripts/frosty-attachment-compatibility.py <RAW> --report-out <tmp>/compatibility.json --check
python scripts/frosty-individual-optics.py --optic-mapping <tmp>/optic-mapping.json --compatibility <tmp>/compatibility.json --availability <tmp>/availability.json --report-out reference-data/provenance/frosty-individual-optics-<date>.json --check
python scripts/optic-tooltips.py --tooltips <tmp>/tooltips.json --mapping <tmp>/optic-mapping.json --individual reference-data/provenance/frosty-individual-optics-<date>.json --check
python scripts/frosty-point-costs.py <RAW> --check
```

To regenerate, drop `--check`: the tooltip generator still writes `<tmp>/tooltips.json`
(not site data); compatibility writes `data/attachments.json` (`--out`) and its
report (default `reference-data/provenance/frosty-attachment-compatibility.json`);
individual optics writes `data/attachments.json` and the dated report; optic
tooltips writes the site file with `--out data/attachment-tooltips.json`. Point costs
run last, because the optics step resets optic `pts`. Identities come from the
point-cost mapping (`--identity-mapping`) and the handling mapping's weapon list;
a new attachment needs its row there first. Compatibility reads the Optic Accessory
prerequisites from the latest committed individual-optics report, so after a new
optic rerun compatibility once the report is regenerated.

Individual optics take their in-game names from
`reference-data/provenance/frosty-optic-render-fov-*.json` and
`frosty-optic-names-*.json` (a new optic needs a row in a new dated names file), and
skip a sight the availability report does not offer. A difference the site keeps
on purpose, or that waits on an in-game check, is a row in
`data-src/overrides-tooltips.json` (its `generator` names the script, `sourceValue`
the generated value or state and `siteValue` the site's); each generator reports its
rows applied, `STALE`, `REDUNDANT` or `UNUSED`, and only applied rows pass `--check`.

New optics are appended to `SIGHTS`, so share-link indices stay stable; each
weapon's sight list and each accessory's `requiresAny` list are in display order
(low-end magnification, then name).
Missing or ambiguous offered slot identities stop generation. Dependencies use
reviewed attachment identities; unsupported source options remain in evidence.
Keep positional URL tokens stable. Check replacement, empty selection, point
costs, legacy links, prerequisite changes and weapon switching.

Point costs (catalogue `pts`, muzzle and ergonomics `weaponOverrides.pts`,
`sightPoints`, magazine `pts`, `WEAPON_AMMO` costs) come from each attachment
record's cost. Run it after the optics step, which resets optic `pts`:

```sh
python scripts/frosty-point-costs.py --raw <capture>/raw ... --descriptors <...> --catalog <...> --check
```

It joins every site cost entry to its records through
`reference-data/provenance/frosty-point-cost-mapping-*.json`; an entry without a
row, or a row without an entry, fails the run. A new attachment needs a row
(record, and the evidence for the identity) in a new dated copy. A cost the site
keeps different from the files belongs in `data-src/overrides.json` (generator
`frosty-point-costs`, with the reviewed source value); a row whose source value
has moved is reported `STALE`. Barrels, grips, lasers and lights hold one cost
for every weapon: a per-weapon source cost there stops the run.

Availability lists (`WEAPON_ATTS` slot and sight lists, `WEAPON_ERGO`,
`WEAPON_ACCESSORY`, `WEAPON_MAG` magazines, `WEAPON_AMMO`) have a checker, not a
generator: it writes no site data.

```sh
python scripts/frosty-availability.py --raw <capture>/raw ... --descriptors <...> --catalog <...> --strings <capture>/fs_us_loc.strings.tsv --check
```

A record is offered when it has an ability branch, no kill-switch row stored true
and an `Equipment_<weapon>` entry (the guide's "Availability of new content").
Site entries join to records through the point-cost mapping, so a new attachment
needs its row there first. The run lists records the files offer that the site
lacks (with the in-game name where the `AAM_*` map has one), site entries the
files do not offer (with the failing condition) and site entries with no record,
and prints the `GRX_Weapons` and loot row counts of weapons not on the site (none:
not released). Every difference the site keeps on purpose, or that waits on an
in-game check, is a row in `data-src/overrides-availability.json` (generator
`frosty-availability`, `sourceValue` the computed state); `--check` exits 0 only
when every difference has an applied row. Run it on the previous build too: the
differences between the two runs are the update's availability changes.

Weapon base records (`data/weapons.json`) have a checker too; it writes no site data:

```sh
python scripts/frosty-weapons.py --raw <capture>/raw ... --descriptors <...> --catalog <...> --strings <capture>/fs_us_loc.strings.tsv --check
```

It reads each weapon's `_WB`, `GS_`, bullet curve, `GRX_Weapons` rows and UI record
(identities in `reference-data/provenance/frosty-weapon-identities-*.json`; a new weapon
needs a row in a new dated copy) and compares every owned field, the attachment-gated
fire modes (`fireModeAttachments`, through the ergonomics record's ability branch) and the
per-weapon values in `recoil_decay.json`, `balance_tables.json` and `WEAPON_MAG` base
indices. Families it cannot read (`cal`, `damageStatus`, `damageSource`, `provenance`)
are listed in the script as `NOT_OWNED`; any other key stops the run. A value the site
keeps different from the files is a row in `data-src/overrides-weapons.json` (generator
`frosty-weapons`, `field` the printed leaf path, kinds `convention`, `observed`,
`pending-check`, `precision`). Run it on the previous build as well: the differences
between the two runs are the update's weapon changes.

After reviewing compatibility changes, update the
[Frosty asset findings](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/DATA_GRAPH.md#slots-and-prerequisites)
with source hashes, evidence pointers and limits. In the [research repo](https://github.com/raymdl/BF6-Frosty-Research), run
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

The tooltips come from the four-step raw chain in "Regenerate attachment modifiers"
above: `frosty-attachment-tooltips.py` writes every non-optic tooltip and the iron
sights (raw `AD_*` descriptors and the build's strings, joined to site choices
through the point-cost mapping), and `optic-tooltips.py` adds the individual optics
from the generated optic mapping and the individual-optics report and writes
`data/attachment-tooltips.json` (`--out`, CRLF, committed key order). Approved panel
text is enabled explicitly in `panelLinkageInvestigation` of
`reference-data/provenance/frosty-attachment-identity-followup-*.json` and checked
against the original hardware/UI link (and the screenshot hash when the ignored
capture library is present). A row with `status: linked-text-differs-from-panel` may
also replace a linked English string that differs from the live panel; record the
reason and keep the original pointer. Never replace a missing Frosty string ID with
an unrelated ID that has matching text; keep a removed string's old text only through
a `data-src/overrides-tooltips.json` row. An approved panel does resolve its own
missing string ID for every choice whose linked descriptor carries that ID: those
choices get status `panel-resolved-string-id` and the real ID as their key. A new
magazine with no `AAM_*` record links to the one `_MAG_` descriptor in its weapon's UI
folder whose label is its site id. Optic tooltips stop on any optic that resolves to
no string or to more than one (the game describes optics by class, so models of one
magnification share a string). The runtime JSON is part of the ship surface.

## Reload exceptions and provenance

[data/reload-exceptions.json](data/reload-exceptions.json) records animation
identities/timings, screenshot exceptions, and composed-loadout observations.
Keep stable IDs and the evidence fields required by each record type. Runtime
magazine overrides must agree with the register; `validate-data.mjs` checks them
through `scripts/reload-exceptions.mjs`. Keep observed exceptions until a fix is verified.

[data/provenance/live-baseline.json](data/provenance/live-baseline.json) records
current source identity, roster, and policy. Update it when those change. Keep
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
### Raw mode

Every `frosty-*` generator named in this file also reads the raw capture directly, so no XML
export is needed. Replace `--root <export root>` (or the tooltip generator's `--frosty-root`) with:

```sh
--raw <build>/capture/collection/raw [--raw <later capture>/raw ...] --descriptors <build>/capture/toolchain/SharedTypeDescriptors.ebx --catalog <build>/capture/collection/asset-catalog.json
```

Later `--raw` folders override earlier ones. When a `collection-fresh-cache` capture is overlaid, add
its catalog as a second `--catalog` after the loaded-cache one: the first catalog that lists a file
GUID decides it, because the fresh-cache catalog also lists leftover assets that reuse a live
asset's GUID, and a GUID that the deciding catalog lists twice stops the run when it is
dereferenced. Outputs written this way carry `"sourceForm": "raw"` and hashes of the raw files;
the key names (`sourceXml`, `xmlSha256`) are unchanged. Add `--known-fields-only` to leave out fields the old XML export never showed. For weapons added after
September 2026, pass the newest dated identity files with `--identity-audit`, `--barrel-mapping`,
`--optic-mapping` and `--descriptions` (research repo, `reference-data/provenance/*-2026-10-13.json`).

In XML mode, replace the placeholder with your XML export root:

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
this repository; [this patch](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frostycmd-string-tools-2026-09-13.patch)
adds both commands. See [weapon display names](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/UI_TEXT.md#weapon-names) for
the procedure.

```sh
powershell -NoProfile -File scripts/frosty-raw-assets.ps1 -FrostyDirectory "PATH_TO_FROSTY" -GamePath "PATH_TO_GAME" -OutputDirectory outputs/frosty-raw -Routes "game/glaciermp/levels/mp_abbasid/mp_abbasid/materialgrid_win32,game/glaciermp/levels/mp_badlands/mp_badlands/materialgrid_win32"
python scripts/frosty-hit-zones.py --root "PATH_TO_EXPORT" --descriptors "PATH_TO_FROSTY/SharedTypeDescriptors.ebx" --grid outputs/frosty-raw/game__glaciermp__levels__mp_abbasid__mp_abbasid__materialgrid_win32.ebx --grid outputs/frosty-raw/game__glaciermp__levels__mp_badlands__mp_badlands__materialgrid_win32.ebx
node scripts/validate-data.mjs
```

The XML export and the raw grids must come from the same game build. The extractor
stops on conflicting links or disagreement between grids, but can record a base
fallback for missing ammo attachments. Review those issues; the current 353 ammo
selections have no missing-attachment fallback. Review its dated evidence file
and every changed value before committing `data/hit_zones.json`.
The extractor writes `source.build` from `--build-label` (default 1.4.2.5) and writes no
`source.buildNote`. The committed label is the build the values were last checked against
(2.1.1.0, like `lastVerified` in `data/provenance/live-baseline.json`), so pass it explicitly
and restore the note's first-read history by hand.

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
[evidence index](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/README.md). Preserve the Interdictor
moving-ADS exponent and the light target fields. Do not apply the retained idle
light operand until an idle-state model has been reviewed.

## Documentation lifecycle and historical versions

The repository README stays high-level. The [documentation index](docs/README.md)
defines current guides and their audiences. Put accepted formulas/units/fallbacks
in the responsible guide, unresolved evidence in [limitations](docs/MODEL_LIMITATIONS.md),
and completed plans or dated investigations in [docs/archive/](docs/archive/README.md).
Every archived record must have an explicit status and current replacement in the
archive index. Keep unresolved questions identified when archiving a report.

After moving documents, update Markdown links and machine-readable provenance
pointers. Check current document links/anchors, preserve historical evidence bodies,
and label capture references that are available only locally. Existing
Mermaid diagrams render in GitHub; the SVG illustration remains self-contained.

Keep `v1.4.3.1/`, `v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/` frozen, with their header links and
ship-manifest entries. These published products are distinct from the narrative
research archive. Never make the current runtime import a historical copy.

## Shipping checklist

Review the final diff and scope; run all routine checks. For UI changes verify
responsive layout, keyboard/ARIA behavior, chart resizing, target-image loading,
sharing/capture and popout behavior. For documentation changes check destinations,
formulas/examples, array coverage and diagram syntax. Confirm archive links and
source pointers, and state which checks could not be performed. List numerical changes, evidence decisions, and presentation-only edits separately
in the handoff.
