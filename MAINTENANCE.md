# Maintenance Guide

This guide describes the current live project. The default maintenance path is a direct, reviewed
change to the smallest relevant source file followed by the narrowest meaningful validation.

## Before editing

1. Confirm the checkout and branch you intend to change.
2. Inspect `git status` and preserve unrelated local work.
3. Identify whether the change affects live runtime data, simulation logic, presentation only,
   published historical pages, or the ad-hoc attachment reference.
4. Keep exact source provenance when changing supplied values.

## Routine commands

```powershell
node scripts/validate-data.mjs
node scripts/validate-ship-surface.mjs
node --test
```

For a UI change, serve the root on port 5174 and inspect the actual changed interaction at desktop,
intermediate, tablet, and phone widths. Test keyboard operation when controls or dialogs change.

## Updating weapon data

Edit the maintained JSON under `data/`. `data/weapons.json` owns base weapon behavior;
`data/attachments.json`, `data/ammo.json`, and `data/balance_tables.json` own selectable modifiers and
shared tables. Projectile source coverage is declared in `data/ballistics.json`.

After a weapon change:

1. Run `node scripts/validate-data.mjs`.
2. Run the focused test whose calculation changed.
3. Run `node --test` before handoff.
4. Open at least one representative weapon in the site and confirm the displayed value and dependent
   chart or table.

Do not copy rounded panel damage over exact damage curves. Do not present donor-derived or inferred
fields as direct measurements. Estimated records must retain their markers, source notes, and complete
cross-file coverage.

## Updating attachments

Attachment catalogs are used by saved/share URLs, so preserve existing item order and IDs. Append new
items unless a compatibility change is explicitly intended. Confirm point totals, availability, and
the affected calculation rather than adding a broad fixture.

When a game update introduces new weapons or attachments, the completed attachment reference can be
checked explicitly:

```powershell
node reference-data/attachment-audit/validate-reference.mjs
```

The reference package contains the canonical JSON, review workbook, validator, workbook builder, and
ammo-stat rule checker. It is not part of CI or the normal product suite. The sorted screenshot library
remains local under `reference-data/attachment-audit/Weapon Attachments/`; old correction tools and
intermediate analysis remain under `.local-archive/`. Both locations are ignored by Git.

## Reload exceptions

`data/reload-exceptions.json` is a small explicit register for reload behavior that cannot be derived
from the common model. Keep stable IDs and an `evidenceReference` for every entry. Validate with the
normal data validator, which uses `scripts/reload-exceptions.mjs`.

Prefer one clear exception record over a hidden UI override. If common behavior changes, remove an
exception only after confirming the shared model now produces the same result.

## Provenance

`data/provenance/live-baseline.json` is the current source/policy record. Version numbers inside it
identify where source values came from. Update it when the source snapshot, supported roster, or a
current derivation policy changes.

Avoid duplicating large source arrays in provenance. Record ownership, source identity, dates, and
policy; leave the maintained numerical contract in `data/`.

## Simulation and UI changes

Reusable calculations belong in `sim/`; rendering and browser interaction belong in `ui/`. Keep one
implementation of each formula. A UI-specific display scale may live beside the calculation when it
is exported and directly tested, but do not mirror calculation code inside a test.

The site intentionally uses plain modules and a static page. A framework, bundler, component library,
backend, or browser-test harness should be added only if a concrete product need outweighs the extra
maintenance for this personal project.

For responsive work, preserve these behaviors:

- stats wrap without horizontal page overflow;
- the phone view keeps two compact stat cards per row where space permits;
- the mobile loadout acts as a modal dialog, traps focus, closes with Escape, and restores focus;
- selected toggle, class, and weapon state is available through ARIA, not color alone;
- attachment selects have programmatic labels;
- touch controls retain practical target sizes.

## Historical versions

`v1.3.1.0/` and `v1.2.3.0/` are frozen published snapshots. Keep their links in `index.html` and their
paths in `ship-surface.json`. Do not make them dependencies of the current runtime.

## Shipping checklist

1. Run all three routine commands.
2. Run `git diff --check`.
3. Inspect `git status` and confirm every changed path belongs to the requested scope.
4. For UI work, verify the served source and capture representative viewport evidence.
5. Confirm archive links still resolve.
6. Commit, push, or deploy only when explicitly requested.
