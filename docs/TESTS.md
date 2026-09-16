# Validation and test boundaries

[Documentation index](README.md) · [Maintenance](../MAINTENANCE.md)

## Routine checks and CI

```sh
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node scripts/test.mjs
```

[CI](../.github/workflows/validate-data.yml) runs these on pushes and pull requests
using Node 20. The runner selects the top-level `scripts/*.test.mjs` files and
passes them to Node's test runner. It excludes frozen site copies and Python research
tests. No dependency install, browser harness, raw captures or Git history is required.
The runner reports the current test count.

`validate-data.mjs` checks IDs/classes, required values, curves and acceptance policy,
attachment/ammo/default references, coverage and estimate disclosure, selected exact
array contracts, all four spread `[min, max]` pairs, velocity/reload fields, and
reload-exception agreement. Schema files cover selected fragments; validation does not cover every JSON field. Projectile behavior/coverage also has focused tests below.

`validate-ship-surface.mjs` checks declared runtime paths/data, supported local
HTML/module references, and published historical folders. The checker excludes documentation-wide link validation and does not determine
whether reference files are published. Evidence links are not browser imports.

## Product test inventory

All paths in this table are under `scripts/`.

| Test file | Distinct behavior protected |
|---|---|
| [attachment-compatibility.test.mjs](../scripts/attachment-compatibility.test.mjs) | Frosty physical-slot grouping, PP-19 grip and magazine-ergonomic dependencies, chained removals, valid alternatives, points/effects, and old shared links. |
| [attachment-effects.test.mjs](../scripts/attachment-effects.test.mjs) | Generated handling and burst hip effects, shared-rail replacement/points/assumptions, ADS/hip composition, 17 source Bolt muzzle exceptions, Smooth/Heavy behavior, light hip growth/recovery and combined slots, collateral clamping, sway, spotting, regeneration, and base/catalog non-mutation. |
| [ballistics.test.mjs](../scripts/ballistics.test.mjs) | Explicit projectile selection for 63 weapons and 328 ammo choices, source coefficients, and flight/trajectory behavior. |
| [barrel-velocity.test.mjs](../scripts/barrel-velocity.test.mjs) | Tier precedence, compatibility multiplier, selectable-barrel equivalence and display rounding. |
| [damage.test.mjs](../scripts/damage.test.mjs) | Curve endpoints/interpolation, hit zones, BTK, roster policy and damage evidence. |
| [draw-time.test.mjs](../scripts/draw-time.test.mjs) | Source timing tables, selection, independent shifts, final clamping and invalid-input behavior. |
| [estimated-weapons.test.mjs](../scripts/estimated-weapons.test.mjs) | No estimated or donor weapons, Frosty-sourced BROD 3/EF88/VSSM values, cross-file coverage and compatibility cases. |
| [optic-costs.test.mjs](../scripts/optic-costs.test.mjs) | Each weapon's optic categories and point costs equal the latest Frosty optic mapping. |
| [required-data.test.mjs](../scripts/required-data.test.mjs) | Missing/non-finite source fields, strict callers, and non-blocking browser reporting with independent stats preserved. |
| [runtime-syntax.test.mjs](../scripts/runtime-syntax.test.mjs) | UI and simulation modules parse. This does not execute a browser. |
| [recoil.test.mjs](../scripts/recoil.test.mjs) | Analytic recovery, timed delivery, overlapping impulses, clock reset/burst pauses, compensation, aim-state factors, and deterministic seeds. Attachment tests also cover Smooth duration and receiver composition without base mutation. |
| [share-state.test.mjs](../scripts/share-state.test.mjs) | Distance round trips, legacy defaults, every shared-rail option with indexed/legacy tokens, and weapon-specific attachment validation. |
| [source-arrays.test.mjs](../scripts/source-arrays.test.mjs) | Exact row order/precision, hip/shotgun indexing, moving/ADS arrays and composition boundaries. |
| [spread-bar-scale.test.mjs](../scripts/spread-bar-scale.test.mjs) | Default and valid single-attachment spread outputs fit the shared axis across aim/stance contexts. |
| [spread-distribution.test.mjs](../scripts/spread-distribution.test.mjs) | Source exponents by aim/stance, uniform-area sampling, the Interdictor exception, and deterministic output. |
| [target-geometry.test.mjs](../scripts/target-geometry.test.mjs) | Target coordinate/geometry and impact-summary behavior. |
| [target-stats.test.mjs](../scripts/target-stats.test.mjs) | Uncapped impact totals, pellet limitations and missing-image presentation. |

Tests protect the declared implementation and reviewed data decisions. They do not
independently validate native game arithmetic, every possible attachment combination,
real hitboxes, or visual correctness. Additional completion messages printed by individual files do not count as tests.

The four attachment-generator `--check` commands are listed in
[maintenance](../MAINTENANCE.md#regenerate-attachment-modifiers). They need the
local Frosty export and are separate from normal CI. They compare source-derived
fields with the catalog; they do not establish native runtime behavior.

## Reference and research checks

`python scripts/frosty-attachment-tooltips.test.py` checks descriptor ambiguity,
optic grouping, and the approved panel-text path. It verifies source/image guards,
preserves original UI pointers, and prevents panel text from filling peer choices.
Full tooltip regeneration needs the local Frosty export, AAM XML and saved captures;
see the [regeneration commands](working/FROSTY_DISPLAY_NAMES.md#regeneration-and-verification).

Validate the screenshot-backed attachment audit separately:

```sh
node reference-data/attachment-audit/validate-reference.mjs
```

It checks reference structure, source identity/status and derived counts, not the
physical correctness of every observed panel or existence of all ignored images.
Workbook generation and ammo-stat rule checking in that package are ad-hoc tools,
not the runtime or CI.

`scripts/frosty-configuration.test.py` checks research scalar conversion behavior:

```sh
python scripts/frosty-configuration.test.py
```

Full configuration, modifier, recoil-model and shotgun investigations can require
original local exports, metadata, captures or generated inputs. Use each tool's documented arguments and the [source workflow](DATA_SOURCES.md).
Keep local research dependencies out of normal validation.

## Manual UI verification

Inject a missing RPM, recoil group, spread bounds or hit-zone record into a local
browser response. Confirm the data-error notification, details, Escape and dismissal.
Affected output must show unavailable without NaN/undefined text or blocking another
weapon. With valid data, no notification should appear.


Serve the live root on port 5174. Check representative widths around 1440, 1000,
720 and 390 pixels: no horizontal page overflow, readable stat groups, resizing
charts and practical touch targets. Check loadout open/close, focus loop, Escape,
focus restoration, associated labels and pressed/selected ARIA state.

Exercise both loadouts, cloning, combined slots, a normal rifle, burst configuration,
a pellet shotgun and slug override, plus a timing/assumption exception. Check damage/
BTK/TTK options, recoil aim/stance/platform/control, both views, reroll, layers, target
aiming/pan/zero and impact disclosure. Confirm lazy target-image loading on tab, shared-link, and popout entry, and
check the missing-image behavior.

For compatibility changes, select a PP-19 grip, switch to the 53-round magazine,
and verify the grip clears, its menu disables, and its points/effects disappear.
Switch back and check that choices return. Check a restricted magazine ergonomic
on AK-205, RPK-74M or RPKM. KORD and KTS100 must each have one Laser / Light menu;
switching devices must replace the selection, including restored older links.

Test link restore (including a legacy target link), Copy/Save Image and failure
feedback, panel collapse/resize, popout independence and all three historical links.
PNG capture should keep loadout identity and restore the original overview state.

## Documentation verification and test discipline

For documentation-only changes, check relative paths/anchors, source pointers,
array inventory against live JSON, exact table values and representative formula
examples. Validate Mermaid syntax where tooling is available and inspect changed
visual assets. Preserve archived text and identify links to unavailable local evidence.
Report link checks separately from browser checks and in-game validation.

Add tests for distinct behavioral regressions. Avoid duplicating formulas,
asserting source-text spelling, or repeating equivalent parameter and schema
cases. Add permanent documentation or browser-test infrastructure only for an
identified maintenance need.
