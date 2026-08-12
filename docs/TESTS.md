# Validation and Tests

The normal validation path protects current product behavior and is intentionally fast:

```powershell
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node --test
```

CI runs those same three commands. The suite requires no dependency install, browser harness, generated
fixtures, raw captures, or Git history.

## Data validation

`scripts/validate-data.mjs` checks the maintained JSON as one current contract. Its checks include:

- JSON/schema basics, IDs, and supported 62-weapon roster;
- attachment/ammunition references and defaults;
- damage curves, class policies, and projectile-source coverage;
- estimated-weapon completeness and provenance;
- stable reload-exception records through `scripts/reload-exceptions.mjs`;
- current baseline source/policy metadata.

This validator does not read the attachment reference package.

## Ship-surface validation

`scripts/validate-ship-surface.mjs` checks `ship-surface.json`, existence of declared runtime paths/data,
local HTML/module references, and the published historical folders. It prevents a local-only artifact
from becoming an accidental runtime dependency.

## Product test files

| File | Distinct behavior protected |
| --- | --- |
| `ballistics.test.mjs` | Current projectile source set, constants, and coverage |
| `barrel-velocity.test.mjs` | Velocity tiers, compatibility read, selectable-barrel equivalence, rounding edge |
| `damage.test.mjs` | Hit zones, BTK sequences, curve interpolation, roster policy, provenance |
| `estimated-weapons.test.mjs` | Estimate disclosure, cross-file coverage, reviewed decisions, share-token compatibility |
| `runtime-syntax.test.mjs` | Browser entry module and every simulation module parse |
| `spread-bar-scale.test.mjs` | One corpus sweep proves the shared spread chart ceiling contains and uses the range |
| `target-geometry.test.mjs` | Target geometry and impact behavior |

Some files emit a simple completion line in addition to Node's test result; this is harmless legacy
output, not a second test layer.

## Why the suite stays small

Tests should protect a material regression, not memorialize how a value was once collected. Avoid:

- duplicated implementations of production formulas inside tests;
- source-text/regex pins when behavior can be imported directly;
- fixed totals for intermediate working sets;
- large generated witness matrices after a smaller equivalence test proves the same contract;
- duplicate schema, fixture, or browser layers for behavior already checked directly;
- tests for local-only historical tools.

If a literal value changes, prefer the direct data edit and the relevant saved-value or data-validator
check. Add a focused product test only if the value participates in behavior that could regress silently.

## Attachment reference check

The completed attachment audit is useful when the game adds weapons or attachments, but it is not part
of routine development:

```powershell
node reference-data/attachment-audit/validate-reference.mjs
```

That command checks reference structure, status/source identity, and derived counts. The workbook builder
and ammo-stat checker in the same folder are explicit maintenance tools. CI does not invoke them.

## UI verification

UI changes are checked against a locally served page on port 5174. Use representative widths around
1440, 1000, 720, and 390 pixels and confirm:

- no page-level horizontal overflow;
- stat groups and cards remain readable;
- charts resize after layout changes;
- loadout dialog open/close, Escape, focus loop, and focus restoration work;
- selected controls expose ARIA state;
- the Soldier Target asset is requested only after that view is selected;
- historical archive links remain reachable.

A permanent screenshot/browser test stack is not justified for this project today. Add one only when
repeated visual regressions make its maintenance cheaper than the current focused walkthrough.
