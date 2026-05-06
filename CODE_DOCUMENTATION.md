# BF6 Weapon Analyzer Code Documentation

This document describes the current structure and behavior of the BF6 Weapon Analyzer project. The primary app is `index.html`; `preview_bloom.html` is a local experiment page used to test recoil/bloom chart ideas before moving them into the main app.

## High-Level Overview

The site is a self-contained HTML application:

- `index.html` contains the markup, styles, weapon data, attachment data, calculations, rendering, and app initialization.
- `preview_bloom.html` is a standalone recoil/bloom preview tool that mirrors the main weapon data and chart calculations for faster visual experiments.
- Chart rendering for damage, BTK, and TTK uses Chart.js from `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`.
- Recoil and bloom rendering uses custom canvas drawing.
- No build step, package manager, module system, or local server is required for normal use, though `preview_bloom.html` can fetch `index.html` when opened from a local server.
- The app is driven by global state variables and direct DOM rendering.

At runtime, the user selects one primary weapon and optionally a comparison weapon. The app derives modified weapon stats from selected attachments, then renders:

- Overview stat cards.
- Damage, BTK, or TTK chart.
- BTK/TTK table.
- Recoil and bloom canvas simulation.
- Recoil stat bars.
- Attachment effect chips with hover tooltips.

## File Structure

### `index.html`

`index.html` is organized into these major regions:

- Lines 1-7: document metadata and Chart.js import.
- Lines 8-136: CSS.
- Lines 138-254: static HTML shell.
- Lines 256-477: base weapon database and weapon-level comments.
- Lines 478-542: global muzzle, barrel, grip, and ammo definitions.
- Lines 563-614: per-weapon ammo availability.
- Lines 616-696: laser definitions and per-weapon attachment availability.
- Lines 698-1037: per-weapon magazine data.
- Lines 1039-1087: ergonomics definitions and availability.
- Lines 1089-1191: attachment application and derived stat calculation.
- Lines 1194-1267: utility helpers and recoil simulation primitives.
- Lines 1269-1494: app state, sidebar rendering, and attachment controls.
- Lines 1497-1666: overview stats and chart mode controls.
- Lines 1669-1721: Attachment Effects panel rendering.
- Lines 1724-1859: Chart.js damage, BTK, and TTK rendering.
- Lines 1863-2155: recoil, bloom, pan/zoom, and canvas rendering.
- Lines 2157-2245: recoil panel orchestration and stat bars.
- Lines 2247-2248: startup render calls.

Line numbers will drift as the file changes, so use them as orientation rather than permanent anchors.

### `preview_bloom.html`

`preview_bloom.html` is organized into:

- Lines 1-268: metadata, CSS, and responsive layout.
- Lines 270-396: static preview UI.
- Lines 399-403: embedded weapon data copied from `index.html`.
- Lines 405-553: preview state, recoil/spread helpers, and axis scale helpers.
- Lines 556-733: canvas drawing, bloom bubbles, and simulated spray runs.
- Lines 735-760: per-bullet recoil/spread table.
- Lines 762-884: controls, data loading from `index.html`, and initialization.

The preview attempts to fetch `index.html` and parse `const W = [...]` so it can stay current with main app data. If that fetch fails, it falls back to embedded copied data.

## HTML Layout

The static body in `index.html` defines the containers that JavaScript later fills:

- Header:
  - `.logo` displays the app name.
  - `.hdr-tag` displays the source/version label.
- Sidebar:
  - `#cmpBtn` toggles comparison mode.
  - `#classFilter1` and `#wList1` are primary loadout controls.
  - `#attSection1` holds primary attachment controls.
  - `#cmpSection` contains the same controls for the comparison loadout.
- Main area:
  - `#emptyState` appears until any weapon is selected.
  - `#statsArea` contains all analysis panels.
  - `#wHeader` and `#sGrid` are filled by overview rendering.
  - `#dmgChart` is the Chart.js chart canvas.
  - `#btkArea` is the table container.
  - `#rcMain` is the custom recoil/bloom canvas.
  - `#rcStats`, `#rcLegend`, `#rcNote`, and `#attStats` are recoil and attachment summary containers.

Most UI interactions are attached either through inline `onclick` attributes in the HTML or by assigning handlers in JavaScript.

## Styling Model

CSS is inline in the page and uses custom properties for theme colors:

- `--bg`, `--bg2`, `--bg3`: dark panel/background colors.
- `--accent`: primary loadout color.
- `--accent2`: comparison loadout color.
- `--text`, `--muted`, `--border`: foreground and divider colors.
- `--green`, `--red`: positive/negative deltas.

The layout is desktop-oriented:

- The app body is fixed to `height:100vh`.
- The sidebar has a fixed width of `208px`.
- Main content scrolls vertically.
- The recoil layout uses a three-column CSS grid with a fixed recoil canvas column.
- The recoil canvas controls are positioned over the canvas: zoom/reset at the upper right, pan controls at the lower right.

There is no full mobile redesign in `index.html`. `preview_bloom.html` has a simple breakpoint that stacks panels on narrow screens.

## Core Data Model

### Weapons: `W`

`W` is the base weapon database. Each entry is an object with fields such as:

- `id`: stable internal weapon ID, used as the key for all other per-weapon maps.
- `name`: display name.
- `cls`: weapon class.
- `cal`: caliber display text.
- `rpm`: rounds per minute. `null` is used for weapons where TTK is not modeled normally, such as some shotguns.
- `mag`: base magazine size.
- `tacRld`, `emptyRld`, `deployT`: timings in seconds.
- `bulletVel`: bullet velocity in meters per second.
- `recoilV`: current displayed ADS recoil per shot after attachment processing.
- `recoilDir`: recoil direction angle from vertical.
- `recoilVar`: current displayed ADS recoil direction variation after attachment processing.
- `recoilIncAds`: ADS bloom/spread increase per shot.
- `spreadMax`: fallback maximum spread.
- `adsTime`: fallback/estimated ADS time in milliseconds.
- `fireMode`: display/model hint such as `auto`, `semi`, `bolt`, or `pump`.
- `pellets`: shotgun pellet count when applicable.
- `dmg`: stepped damage breakpoints as `{r, d}` objects.
- `recoil`: ADS and hipfire recoil formula inputs copied from Sym.gg style fields.
- `spread`: min/max spread by aim and movement state.
- `spreadDyn`: spread increase/decrease model inputs by aim state.

Damage is treated as stepped zones, not interpolated between breakpoints.

### Recoil and Spread Source Fields

The weapon objects preserve raw-ish formula inputs so ADS and hipfire can be calculated separately:

- `recoil.ads` and `recoil.hip` map to Sym.gg `ADSRecoil*` and `HIPRecoil*` families.
- `spreadDyn.ads` and `spreadDyn.hip` map to Sym.gg `ADSBaseSpread*` and `HIPBaseSpread*` behavior.
- `spread.adsStand`, `spread.adsMove`, `spread.hipStand`, and `spread.hipMove` store the state-specific min/max spread pairs.

The main app still keeps legacy display fields such as `recoilV`, `recoilVar`, and `recoilIncAds` because many overview and comparison panels use those values directly.

### Attachment Catalogs

The global attachment catalogs define possible options and their effects:

- `MUZZLES`
  - `adsRecoilTierMod`: additive ADS recoil tier modifier.
  - `adsRecoilVariationMult`: ADS recoil direction variation multiplier.
  - `adsSpreadDecayBoost`: ADS bloom recovery boost.
  - `hipSpreadTierMod`: hipfire spread tier modifier.
  - `sway`: weapon sway shift.
  - `worldSpot`, `minimapSpot`: spotting exposure values.
  - `assumed`: marks values that are assumed until datamined stats are available.
  - `pts`: point cost.
- `BARRELS`
  - `vMult`: bullet velocity multiplier.
  - `adsTimeTierMod`: ADS speed tier shift.
  - `movingAdsSpreadTierMod`: moving ADS accuracy tier shift.
  - `adsSpreadIncMult`: ADS bloom increase multiplier.
  - `assumed`: marks values that are assumed until datamined stats are available.
  - `pts`: point cost.
- `GRIPS`
  - `adsRecoilTierMod`: ADS recoil tier contribution.
  - `movingAdsSpreadTierMod`: moving ADS accuracy shift.
  - `adsTimeTierMod`: ADS speed shift.
  - `adsMoveSpeedTierShift`: ADS movement speed tier shift, added after definition for some grips.
  - `weaponPts`: optional weapon-specific point overrides.
  - `noEffect`: marks options with tracked cost but unmodeled stats.
- `LASERS`
  - `movingAdsSpreadTierMod`: moving ADS accuracy shift.
  - `pts`: point cost.
  - `noEffect`: tracked but unmodeled or visual-only.
- `AMMOS`
  - `hsMult`: headshot multiplier override, special `hp` behavior, or `null` for weapon default.
  - `adsRecoilTierMod`: ADS recoil tier modifier.
  - `adsMoveSpeedTierShift`: ADS move speed tier shift.
  - `noEffect`: available/costed, but no modeled stat effect.
- `ERGOS`
  - `sprintRecoveryTierShift`: sprint recovery tier shift.
  - `adsTimeTierShift`: ADS time tier shift.
  - `noEffect`: cost tracked but effect unknown/unmodeled.

The renamed fields intentionally specify whether an attachment effect is ADS-only, hipfire-only, or mobility-only. This matters because the recoil/bloom chart can now switch between ADS/Hipfire and Standing/Moving.

### Per-Weapon Availability Maps

Several maps connect global data to a specific weapon ID:

- `WEAPON_ATTS`
  - Lists allowed `muzzle`, `barrel`, `grip`, and `laser` IDs.
  - Includes `barrelDef`, the weapon's default barrel ID.
  - If a slot key is omitted, `buildAttachmentSection()` treats all global options for that slot as allowed.
- `WEAPON_AMMO`
  - Defines default ammo and per-ammo point costs.
- `WEAPON_MAG`
  - Defines default magazine and magazine variants.
  - `defAds`, `defSpr`, and `defAms` are the default magazine tier baselines.
  - Each magazine can override `mag`, `tacRld`, and tier shifts.
- `WEAPON_ERGO`
  - Defines available ergonomics per weapon.
  - `magCatchRld` defines Mag Catch tactical reload times for regular and fast magazines.

## Derived Weapon Flow

Most renderers do not use the raw weapon object directly. They call:

```js
applyAttachments(baseWeapon, selectedAttachments)
```

This returns a shallow copy of the weapon with modified public stats and private display/meta fields.

Important derived fields:

- `_label`: weapon name plus selected attachment tags.
- `_adsRecoilReductionPct`: ADS recoil reduction percentage for UI display.
- `_adsSpreadDecayBoost`: ADS bloom decay boost from muzzle.
- `_worldSpot`, `_minimapSpot`: firing exposure distances.
- `_movingAdsSpreadTierMod`: total moving ADS accuracy tier shift.
- `_movingAdsMinSpreadDeg`: final moving ADS minimum spread tier value.
- `_adsTimeTierMod`: combined grip/barrel ADS speed shift.
- `_adsTimeMs`: final ADS time tier value, if magazine data exists.
- `_sprintRecoveryMs`: final sprint recovery tier value, if magazine data exists.
- `_adsMoveSpeedMult`: final ADS move speed multiplier, if magazine data exists.
- `_hipSpreadTierMod`: hipfire spread tier shift.
- `_weaponSway`: weapon sway shift.
- `_hsMult`: final headshot multiplier.

Important modified base fields:

- `recoilV`: adjusted by the ADS recoil tier formula.
- `recoilVar`: adjusted by ADS-only variation multipliers.
- `recoilIncAds`: adjusted by barrel `adsSpreadIncMult`.
- `bulletVel`: adjusted by barrel `vMult`.
- `mag`: replaced by selected magazine size.
- `tacRld`: replaced by selected magazine reload or Mag Catch reload.

### ADS-Only vs Hipfire Effects

Current attachment scoping:

- Muzzle `adsRecoilTierMod`, `adsSpreadDecayBoost`, and `adsRecoilVariationMult` affect ADS recoil/spread only.
- Barrel `adsSpreadIncMult` affects ADS bloom increase only.
- Grip recoil control modifiers affect ADS recoil only.
- Penetration ammo recoil modifier affects ADS recoil only.
- `hipSpreadTierMod` affects hipfire minimum spread only.
- `movingAdsSpreadTierMod` affects ADS spread while moving only.

The recoil/bloom chart respects this scoping through selected-state helpers such as `selectedRecoilAmountFor()`, `selectedRecoilVariationFor()`, `selectedSpreadBoundsFor()`, `selectedSpreadDynamicsFor()`, and `selectedSpreadIncFor()`.

## Damage, BTK, and TTK Calculations

### `getDmg(weapon, range)`

Uses the weapon's stepped `dmg` breakpoints. It starts with the first damage value and walks forward, replacing the damage value whenever `range >= breakpoint.r`.

This means damage remains constant until the next breakpoint.

### `getBTK(weapon, range)`

Calculates body-shot bullets to kill:

```js
ceil(100 / damage)
```

For shotguns, damage is multiplied by `weapon.pellets`.

### `getBTKWithHS(weapon, range, headshots)`

Calculates bullets to kill when a fixed number of headshots are allowed. It:

1. Computes per-shot damage.
2. Uses `weapon._hsMult` or falls back to `1.34`.
3. Checks whether fewer pure headshots than requested are enough to kill.
4. Otherwise subtracts headshot damage and finishes with body shots.

### `getTTK(weapon, btk)`

Returns:

```js
round((btk - 1) / (rpm / 60) * 1000)
```

If `rpm` is falsy, it returns `null`.

### Chart Range Helpers

`maxRange()` chooses chart range based on class:

- Sniper Rifle: 275m.
- DMR: 130m.
- Shotgun: 55m.
- Other: 90m.

`btkRanges()` chooses compact table ranges by class mix.

## Attachment Point Calculation

`computeAttPts(atts, weapon)` sums:

- Muzzle points.
- Barrel points.
- Grip points.
- Laser points.
- Ammo points from `WEAPON_AMMO`.
- Magazine points from `WEAPON_MAG`.
- Ergonomics points from `ERGOS`.

`updateAttTotal()` displays the total and marks it with `.over` when the loadout exceeds 100 points.

`getAttPts()` handles global point values and `weaponPts` overrides.

The sidebar marks seven attachments with assumed stats using an asterisk:

- Linear Compensator.
- Compensated Brake.
- Flash Compensator.
- Long Suppressor.
- Light Suppressor.
- Heavy Barrel.
- Heavy Extended Barrel.

The assumed-stats footnote only appears when one of those attachments is selected. If one loadout is shown, it appears at the bottom of Loadout 1. If comparison mode is enabled, it appears at the bottom of Loadout 2 so it is not duplicated.

## App State

The app uses global mutable variables:

- `selClass1`, `selClass2`: selected class filters.
- `selW1`, `selW2`: selected primary and comparison weapons.
- `comparing`: whether comparison UI is visible.
- `dmgChart`: active Chart.js instance.
- `chartMode`: `dmg`, `btk`, or `ttk`.
- `btkHS`: selected headshot count for BTK/TTK modes.
- `showAds`: whether TTK chart/table includes ADS time.
- `recoilMode`: `bloom` or `path`.
- `recoilRefSeed`: deterministic/random recoil reference seed.
- `recoilBloomBubbles`: whether Recoil Path mode shows bloom bubbles.
- `recoilAim`: `ads` or `hip`.
- `recoilStance`: `stand` or `move`.
- `recoilScaleH`: horizontal recoil chart half-width in degrees.
- `recoilPanX`, `recoilPanY`: recoil chart pan offsets in degrees.
- `att1`, `att2`: selected attachment objects for primary and comparison loadouts.

The attachment object shape is:

```js
{
  muzzle: 'none',
  barrel: 'none',
  grip: 'none',
  laser: 'none',
  ammo: 'standard',
  mag: null,
  ergo: 'none'
}
```

## Rendering Flow

### Startup

At the bottom of the script:

1. The compare button click handler is installed.
2. `renderSidebar()` is called.
3. `renderStats()` is called.

With no selected weapon, `renderStats()` shows the empty state and stops.

### Sidebar Rendering

`renderSidebar()` builds:

- Class filter for primary slot.
- Weapon list for primary slot.
- Attachment section for primary slot.
- If comparison mode is enabled, the same three sections for comparison slot.

Selecting a weapon calls `validateAtts()` for that slot, then rerenders sidebar and stats.

### Attachment Rendering

`buildAttachmentSection()` creates select controls for:

- Muzzle.
- Barrel.
- Grip.
- Laser.
- Ammo.
- Magazine.
- Ergonomics.

For normal attachment slots, it filters global option catalogs through `WEAPON_ATTS[weapon.id]`.

Barrels are special:

- `none` is removed.
- The slot is hidden only if no barrel option exists.

Ammo, magazine, and ergonomics are built from their per-weapon maps.

### Overview Rendering

`renderOverview()` fills:

- Weapon header.
- Weapon class badges.
- Stat cards for damage, headshot multiplier, fire rate, bullet velocity, mobility, reload, deploy, recoil, moving ADS accuracy, and spotting values.

When comparing, the second value is shown with a percentage or absolute delta. Delta color is based on whether higher or lower is better for that metric.

The compact overview stat card uses `Recoil/Shot` to avoid label wrapping. The wider Attachment Effects chip uses `ADS Recoil/Shot` for clarity.

### Chart Rendering

`renderChart()` always destroys the existing Chart.js instance before creating a new one.

It registers a custom `smartFloat` tooltip positioner the first time it runs.

Modes:

- `dmg`
  - Shows stepped damage lines.
  - Adds faint BTK threshold lines.
  - Uses a y-axis maximum of 50 or 100 depending on max damage.
- `btk`
  - Shows stepped BTK lines.
  - Uses fixed y-axis range 1-8.
  - Supports headshot count from `btkHS`.
- `ttk`
  - Shows stepped TTK lines.
  - Can include ADS time when `showAds` is true.
  - y-axis max is rounded above the highest dataset value.

### BTK Table Rendering

`renderBTK()` builds an HTML table from `btkRanges(w1, w2)`.

It displays:

- Range.
- BTK.
- TTK, or ADS+TTK when `showAds` is true.

BTK changes from the previous row are highlighted.

### Attachment Effects Rendering

`renderAttachmentStats()` compares each current loadout against the same weapon with default attachments. It displays chips only for changed stats.

Current chip metrics include:

- ADS Time.
- ADS Move.
- Sprint Rec.
- Bullet Vel.
- Mag Size.
- Tac Reload.
- ADS Recoil/Shot.
- ADS Variation.
- ADS Spread/Shot.
- Move ADS.
- Hip Min.
- 3D Spot.
- Minimap Spot.
- HS Mult.
- Weapon Sway.

Each chip has a native `title` tooltip explaining what the delta means. No custom cursor is applied.

### Recoil and Bloom Rendering

Recoil rendering is custom canvas drawing rather than Chart.js.

The panel has two main modes:

- `Spray Pattern`: draws simulated spray runs with recoil and bloom scatter.
- `Recoil Path`: draws a recoil-only reference path. When `+Bloom` is enabled, spread bubbles are drawn on bullets 1, 2, 3, 5, 8, 13, and 20.

The panel also has state toggles:

- `ADS` and `Hipfire`.
- `Standing` and `Moving`.

Defaults are ADS and Standing.

`genRecoilPts()`:

- Generates a deterministic recoil path from weapon ID and seed.
- Uses selected ADS or hipfire recoil formula inputs.
- Adds vertical and horizontal recoil based on selected recoil amount, direction, and Gaussian variation.
- Applies inter-shot recoil decay between shots.

`drawRecoilFixed()`:

- Clears and redraws the recoil plot.
- Uses adjustable horizontal scale and derived vertical scale.
- Defaults to +/-5 degrees horizontally and -1 to 9 degrees vertically.
- Keeps the X axis centered around the current pan value.
- Draws grid lines, 0-degree axes, origin crosshair, and both X/Y labels including `0`.
- Simulates bloom internally with `simulateBloom()`.
- Draws 12 faded spray-cloud runs.
- Draws one solid reference run.
- In `path` mode, draws a recoil-only line connecting reference points.
- Optionally draws bloom bubbles for the selected milestone bullets.

Pan and zoom helpers:

- `adjustRecoilScale('in'|'out')`: changes horizontal half-scale by 0.5 degrees.
- `resetRecoilView()`: restores +/-5 degrees H and -1 to 9 degrees V with zero pan.
- `panRecoilView(dir)`: moves the chart by 0.5 degrees per click.
- `recoilScaleYMax()`: derives vertical max as `recoilScaleH * 2 - 1`.
- `recoilXMin()`, `recoilXMax()`, `recoilYMin()`, `recoilYMax()`: combine scale and pan.

`renderRecoil()`:

- Applies attachments for selected weapons.
- Renders attachment effect chips.
- Updates recoil mode, aim, stance, and `+Bloom` button state.
- Calls `drawRecoilFixed()`.
- Updates legend, chart note, and recoil stat bars.

## Preview Bloom Tool

`preview_bloom.html` exists to test recoil/bloom visualization changes before implementing them in `index.html`.

It provides:

- Three side-by-side chart approaches.
- Editable bubble bullet schedules for each approach.
- Preset buttons such as Sparse, Milestones, Even 6, Every 3-ish, and Every 2.
- Weapon selector populated from `index.html` data when possible.
- ADS/Hipfire and Standing/Moving toggles.
- Zoom and pan controls matching the main chart behavior.
- Per-bullet recoil and pre-shot spread table with deltas from the prior bullet.

Default bubble schedules:

- Approach A: `1, 2, 3, 10, 20`.
- Approach B: `1, 2, 3, 5, 8, 13, 20`.
- Approach C: `2, 4, 6, 8, 10, 12, 14, 16, 18, 20`.

The main app currently uses the Approach B schedule for `+Bloom` bubbles.

## How To Add Or Update Data

### Add A Weapon

1. Add a base weapon object to `W`.
2. Include ADS and hipfire recoil formula inputs in `recoil.ads` and `recoil.hip`.
3. Include ADS and hipfire spread dynamics in `spreadDyn.ads` and `spreadDyn.hip`.
4. Include spread bounds for `adsStand`, `adsMove`, `hipStand`, and `hipMove`.
5. Add the weapon ID to any legacy recoil maps still used as fallbacks.
6. Add `WEAPON_ATTS[weaponId]` with availability arrays and `barrelDef`.
7. Add `WEAPON_AMMO[weaponId]`.
8. Add `WEAPON_MAG[weaponId]`.
9. Add `WEAPON_ERGO[weaponId]` if it has ergonomics.
10. If the weapon has non-default headshot behavior, update `BASE_HS_MULT` or `HP_HS_HIGH`.

### Add An Attachment

1. Add the option to the correct global catalog.
2. Choose a stable `id`.
3. Add modeled effect fields with explicit scope in the field name.
4. Add `pts`, and `weaponPts` if point cost differs for specific weapons.
5. Add the attachment ID to relevant `WEAPON_ATTS` arrays.
6. If the attachment has no modeled effect yet, set `noEffect:true` so it appears greyed in selects.
7. If the values are assumed, set `assumed:true` so the sidebar can show the conditional footnote.

### Change Attachment Availability

Edit only the relevant weapon entry in `WEAPON_ATTS`. The select controls use these arrays directly.

### Add Magazine Variants

Edit `WEAPON_MAG[weaponId].mags`.

Each magazine entry can include:

- `name`
- `pts`
- `mag`
- `tacRld` in milliseconds
- `adsTimeTierShift`
- `sprintRecoveryTierShift`
- `adsMoveSpeedTierShift`

Then ensure `def` points to a valid magazine ID.

## Review Notes: Incorrect, Incomplete, Or Inconsistent Items

These are observations from code reading only.

### 1. Chart tooltip callbacks can break if only comparison weapon is selected

Locations:

- `renderChart()` BTK tooltip callback.
- `renderChart()` TTK tooltip callback.

BTK and TTK tooltip callbacks choose the displayed weapon with:

```js
const w = i.datasetIndex === 1 && w2 ? w2 : w1;
```

If comparison mode is enabled, a user can select weapon 2 without selecting weapon 1. In that case, `datasets` contains only weapon 2 at index 0, but the callback resolves `w` to `w1`, which is `null`. The next `w.name` or `getBTKWithHS(w, ...)` can throw.

Suggested fix: store the weapon object on each dataset, or derive from `datasets[i.datasetIndex]` metadata rather than assuming dataset index 0 is weapon 1 and index 1 is weapon 2.

### 2. Damage chart threshold generation can throw if no weapon reaches chart rendering

Location:

- `renderChart()` damage threshold generation.

The damage chart code uses `const w = w1 || w2` and immediately calls `getBTK(w, r)`. `renderStats()` prevents this when no weapons are selected, so normal startup is safe. The risk is only if future code calls `renderChart()` directly while both weapons are null.

Suggested fix: guard with `if (!w1 && !w2) return;` at the top of `renderChart()`.

### 3. Some attachments are intentionally costed but not modeled

Several options use `noEffect:true`. They appear in the UI and add point cost, but do not change stats. This is useful for availability tracking, but users may assume all point-cost attachments affect displayed stats.

Examples:

- Compact Handstop.
- Long-Range ammo.
- Frangible ammo.
- Several lasers/lights.
- Mag Flare.
- Match Trigger.
- ADS Bolt.

Suggested follow-up: the grey styling is currently the main signal. Add a tooltip or legend later if this is still unclear.

### 4. Ergonomics TODOs confirm incomplete modeling

The code explicitly lists unknown effects:

- Mag Flare.
- Match Trigger.
- ADS Bolt.

These should stay documented as incomplete until reliable data is available.

### 5. Assumed attachment stats should be revisited when datamined data is available

Some attachment values are deliberately marked as assumed:

- Linear Compensator.
- Compensated Brake.
- Flash Compensator.
- Long Suppressor.
- Light Suppressor.
- Heavy Barrel.
- Heavy Extended Barrel.

Suggested follow-up: verify these against datamined attachment stats when available and update both the data and this documentation.

### 6. Chart.js is loaded from CDN, so the app needs network access on first load

Location:

- `index.html` Chart.js script import.

The app depends on Chart.js from jsDelivr. If used offline or blocked by network policy, damage/BTK/TTK charts will fail and `renderChart()` can throw because `Chart` is undefined.

Suggested fix: vendor Chart.js locally or add a guard/fallback message.

### 7. Character encoding may be fragile in some tooling

The file contains non-ASCII symbols such as degree signs, multiplication signs, en dashes, and bullets. In the browser this is protected by `<meta charset="UTF-8">`, but some PowerShell output in this environment displays mojibake for these characters.

Suggested follow-up: preserve UTF-8 when editing. Avoid tools that rewrite the file with a legacy Windows code page.

### 8. No automated tests or data validation exist

There is no test suite or schema validation for:

- Weapon IDs referenced across maps.
- Attachment IDs referenced in `WEAPON_ATTS`.
- Default magazine IDs.
- Default barrel IDs.
- Point costs and over-100 loadouts.
- Chart render behavior for unusual state combinations.
- ADS vs hipfire attachment scoping.
- Standing vs moving spread bounds.

Suggested follow-up: add a small validation script that loads/extracts the JS data and checks ID integrity.

## Maintenance Recommendations

Near-term, high-value cleanups:

1. Fix compare-only tooltip handling in `renderChart()`.
2. Add a lightweight data validation script for IDs and defaults.
3. Add explicit tests or assertions for ADS-only vs hipfire-only attachment effects.
4. Add a guard/fallback if Chart.js fails to load.

Longer-term structural improvements:

1. Split `index.html` into `data.js`, `calculations.js`, `render.js`, and `styles.css`.
2. Add a data schema for weapons and attachment catalogs.
3. Store dataset metadata directly on Chart.js datasets to simplify tooltip callbacks.
4. Add a small UI note or tooltip for unmodeled `noEffect` attachments if grey styling is insufficient.
5. Add responsive layout rules for smaller screens.
