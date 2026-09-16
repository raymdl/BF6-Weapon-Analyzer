# Optics from Frosty data: plan

Status (14 SEP 2026): stages 1 and 2 done, not committed. Stage 3 waits for the
1.4.3.0 export.

- `optic_category` in `scripts/frosty-attachment-tooltips.py` uses the label only.
  It reproduces all 1,926 stored labeled categories (1 unlabeled iron uses the name rule).
- `scripts/optic-costs.test.mjs` reads the newest `frosty-optic-category-mapping-*.json`.
  It passes on 1.4.2.5 and fails with `interdictor iron cost` when that cost is 15.

## Objective

Derive each weapon's optic categories and costs from the Frosty optics, not from
hand-set values. The site keeps its six categories. It does not show Frosty labels
or model names: optics are personal preference and do not change projectile
mechanics.

## Current state (1.4.2.5)

- `data/attachments.json` `SIGHTS`: iron 5, std_optic 10, var_low 20, var_high 25,
  thermal 25, therm_hyb 35. `WEAPON_ATTS[id].sight` restricts some weapons;
  `sightPoints` overrides cost (iron 15 on five snipers).
- `reference-data/provenance/frosty-optic-category-mapping-2026-09-13.json`:
  1,927 optics, all in a category. Every Frosty cost equals the site cost, and every
  weapon's category set equals the site's list (63 of 63).
- The mapping lists Frosty optics outside the site's categories
  (`membersOutsideSiteCategories`), but it does not compare costs, and no test
  compares the site with Frosty.

## Stages

1. **Generator.** Classify each Frosty optic from its label only (Variable ranges
   listed explicitly; Basic Sight = iron). Output per weapon: category -> cost.
   Stop with an error on an unknown label or two costs for one category on one weapon.
2. **Check.** A test compares the output with `attachments.json`: category set,
   `sightPoints`, and the default `SIGHTS` cost. It fails on any difference.
3. **Apply.** After a new export, apply differences to `attachments.json`
   (for example `interdictor.sightPoints.iron: 15` in 1.4.3.0).

No UI, share-link or `SIGHTS` order change.

## Remaining work

Stage 3: after the 1.4.3.0 export, run the generator with a new dated
`--optic-mapping-json` (command in `docs/working/FROSTY_DISPLAY_NAMES.md`), run the
test, and apply each reported difference to `data/attachments.json`.
