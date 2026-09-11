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
The review baseline produced 60 passing Node tests; discover tests through the runner
rather than treating that count as a permanent contract.

`validate-data.mjs` checks IDs/classes, required values, curves and acceptance policy,
attachment/ammo/default references, coverage and estimate disclosure, selected exact
array contracts, velocity/reload fields, and reload-exception agreement. The schema
files describe selected fragments; this is not a generic full-schema validator
for every JSON field. Projectile behavior/coverage also has focused tests below.

`validate-ship-surface.mjs` checks declared runtime paths/data, supported local
HTML/module references, and published historical folders. Informational references
to non-runtime evidence do not mean the browser imports it. The checker does not
validate all documentation links or assert that reference files are unpublished.

## Product test inventory

All paths in this table are under `scripts/`.

| Test file | Distinct behavior protected |
|---|---|
| [attachment-effects.test.mjs](../scripts/attachment-effects.test.mjs) | Supported ADS/hip composition, all 17 source Bolt muzzle exceptions, ordinary Smooth on the same rifle, base/catalog non-mutation, and ADS-only Heavy spread/recovery scaling. |
| [ballistics.test.mjs](../scripts/ballistics.test.mjs) | Projectile inputs/source policy, constants, flight/trajectory behavior and coverage decisions. |
| [barrel-velocity.test.mjs](../scripts/barrel-velocity.test.mjs) | Tier precedence, compatibility multiplier, selectable-barrel equivalence and display rounding. |
| [damage.test.mjs](../scripts/damage.test.mjs) | Curve endpoints/interpolation, hit zones, BTK, roster policy and damage evidence. |
| [draw-time.test.mjs](../scripts/draw-time.test.mjs) | Source timing tables, selection, independent shifts, final clamping and invalid-input behavior. |
| [estimated-weapons.test.mjs](../scripts/estimated-weapons.test.mjs) | Disclosure, cross-file coverage, reviewed weapon/ammo/reload decisions and compatibility cases. |
| [runtime-syntax.test.mjs](../scripts/runtime-syntax.test.mjs) | UI and simulation modules parse. This does not execute a browser. |
| [recoil.test.mjs](../scripts/recoil.test.mjs) | Analytic recovery, timed delivery, overlapping impulses, clock reset/burst pauses, compensation, aim-state factors, and deterministic seeds. Attachment tests also cover Smooth duration and receiver composition without base mutation. |
| [share-state.test.mjs](../scripts/share-state.test.mjs) | Distance round trips, legacy defaults and weapon-specific attachment validation. |
| [source-arrays.test.mjs](../scripts/source-arrays.test.mjs) | Exact row order/precision, hip/shotgun indexing, moving/ADS arrays and composition boundaries. |
| [spread-bar-scale.test.mjs](../scripts/spread-bar-scale.test.mjs) | Default and valid single-attachment spread outputs fit the shared axis across aim/stance contexts. |
| [target-geometry.test.mjs](../scripts/target-geometry.test.mjs) | Target coordinate/geometry and impact-summary behavior. |
| [target-stats.test.mjs](../scripts/target-stats.test.mjs) | Uncapped impact totals, pellet limitations and missing-image presentation. |

Tests protect the declared implementation and reviewed data decisions. They do not
independently validate native game arithmetic, every possible attachment combination,
real hitboxes, or visual correctness. Some files print an additional completion line;
that is not an additional test layer.

## Reference and research checks

The screenshot-backed attachment audit is explicitly maintained separately:

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
original local exports, metadata, captures or generated inputs. Follow the tools'
arguments and [source workflow](DATA_SOURCES.md); do not silently add those dependencies
to normal validation or rerun them merely to recreate old working sets.

## Manual UI verification

Serve the live root on port 5174. Check representative widths around 1440, 1000,
720 and 390 pixels: no horizontal page overflow, readable stat groups, resizing
charts and practical touch targets. Check loadout open/close, focus loop, Escape,
focus restoration, associated labels and pressed/selected ARIA state.

Exercise both loadouts, cloning, combined slots, a normal rifle, burst configuration,
a pellet shotgun and slug override, plus a timing/assumption exception. Check damage/
BTK/TTK options, recoil aim/stance/platform/control, both views, reroll, layers, target
aiming/pan/zero and impact disclosure. Confirm the target image is lazy on tab and
shared-link/popout entry, and unavailable-image behavior remains explicit.

Test link restore (including a legacy target link), Copy/Save Image and failure
feedback, panel collapse/resize, popout independence and all three historical links.
PNG capture should keep loadout identity and restore the original overview state.

## Documentation verification and test discipline

For documentation-only changes, check relative paths/anchors, source pointers,
array inventory against live JSON, exact table values and representative formula
examples. Validate Mermaid syntax where tooling is available and inspect changed
visual assets. Preserve archived body text; separately report intentional missing
local-only evidence links. Do not claim browser/physical validation from link checks.

Prefer a focused behavioral assertion over a duplicate formula implementation,
source-text regex pin, large generated witness matrix or repeated schema fixture.
Add coverage for a distinct regression risk; do not add a permanent documentation
or browser-test framework without a concrete maintenance benefit.
