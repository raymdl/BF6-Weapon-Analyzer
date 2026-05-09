# BF6 Weapon Analyzer Code Documentation

This document describes the current structure and behavior of the BF6 Weapon Analyzer project. The primary app is `index.html`; `preview_bloom.html` and `preview_distance.html` are local experiment pages used to test recoil/bloom chart ideas before moving them into the main app.

## High-Level Overview

The site is a self-contained HTML application:

- `index.html` contains the markup, styles, weapon data, attachment data, calculations, rendering, and app initialization.
- `preview_bloom.html` is a standalone recoil/bloom preview tool that mirrors the main weapon data and chart calculations for faster visual experiments.
- `preview_distance.html` projects the same recoil/bloom model onto flat wall distances in meters and is used for distance-scale validation before main app changes.
- Chart rendering for damage, BTK, and TTK uses Chart.js from `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`.
- Recoil and bloom rendering uses custom canvas drawing.
- No build step, package manager, module system, or local server is required for normal use, though the preview helpers can fetch `index.html` only when opened from a local server.
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

### `preview_distance.html`

`preview_distance.html` is organized around the same idea as `preview_bloom.html`, but its output is in meters on a flat wall instead of chart degrees.

It includes:

- A local copy/fetch path for weapon and attachment data from `index.html`.
- Sidebar weapon and attachment selection.
- ADS/Hipfire, Standing/Moving, shot count, and recoil-control controls.
- Four wall-distance panels: 5 m, 10 m, 20 m, and custom distance.
- Per-panel zoom/pan state.
- Spray pattern, recoil path, and bloom bubble/outline renderers.
- Human target outline and hit-count logic.

The page is intentionally a review helper. Changes should be moved into `index.html` only after the behavior has been reviewed.

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

## Recoil/Bloom Model, Sources, And Derived Assumptions

The recoil/bloom model is a visualization model, not a full game-engine recreation. It combines source-backed weapon values, attachment-adjusted stat transforms, and screenshot-derived visual calibration so users can compare loadouts consistently.

### Source Provenance

Primary source inputs and references:

- [Sym.gg](https://sym.gg): baseline weapon data and field naming conventions. The footer currently cites Sym.gg v1.2.2.0 dated 17 MAR 2026.
- [Dr. Smiley Henry](https://www.youtube.com/@Dr.SmileyHenry): bloom/spread decay model reference used for the recoil/bloom panel notes.
- [TheXclusiveAce](https://www.youtube.com/@TheXclusiveAce): in-game spray-pattern reference source cited in the footer and used for visual sanity checks.
- [SORROW](https://www.youtube.com/@SORROW_Main): weapon data reference cited in the footer.

### Source-Backed Versus Screenshot-Derived

Source-backed or directly data-backed items:

- Base weapon stats such as damage breakpoints, RPM, magazine size, reload timings, bullet velocity, ADS time, recoil/shot, recoil direction, recoil variation, spread minimums/maximums, and spread increase/decrease inputs.
- Attachment availability, attachment point costs, and modeled stat deltas where fields are known.
- ADS versus hipfire and standing versus moving spread families, where the raw fields preserve that scope.

Screenshot-derived or visually calibrated items:

- The qualitative shape and scale of the displayed spray clouds compared with in-game spray-pattern screenshots.
- The choice to show faded scatter runs behind a solid reference run to communicate natural shot-to-shot variance.
- The main bloom bubble schedule defaults, especially `1, 2, 3, 5, 8, 13, 20`, which are chosen for readability rather than because those shot numbers are special engine events.
- The connected bloom cone/envelope rendering. It is a display abstraction built from the modeled per-shot spread circles so users can see the range of possible bloom across the burst.
- The `preview_distance.html` wall projection layout, human target overlay, hit counting, dot scaling, and panel distances. These are review aids for interpreting angular recoil/spread at flat-wall distances.

### Recoil Path Model

`genRecoilPts()` creates a deterministic recoil path for the selected weapon, aim state, stance, attachment loadout, and shot count.

For each shot:

1. Select ADS or hipfire recoil inputs.
2. Select standing or moving spread inputs.
3. Compute the expected recoil magnitude and recoil direction after attachments.
4. Add per-shot recoil direction variation around the displayed recoil direction.
5. Add the resulting horizontal and vertical recoil offset to the current aim point.
6. Apply inter-shot recoil decrease/decay before the next shot.

Recoil direction is treated as an angle from vertical in the app's chart coordinate system. Positive and negative directions are preserved in the stat bars, and direction bars are centered on zero so positive values extend right and negative values extend left.

The decay implementation is still a parameterized approximation:

```js
Decrease = (abs(recoil) ** decExp + 0.06) * decFactor * dt * time ** timeExp
```

A sym.gg developer comment on the Reddit says current recoil decrease is constant and tries to return the gun to the original point of aim. Our current code agrees directionally because decay pulls back toward zero, but the exact parameterized decay curve should be treated as a model assumption until validated against current game data.

### Recoil Control Model

Recoil control is an optional visualization layer that estimates a player pulling the mouse in the opposite direction of expected recoil.

When `Recoil Control` is off:

- Compensation level is displayed as zero.
- Compensation controls are greyed out and non-interactive.
- The recoil path uses only the modeled recoil, variation, decay, and spread/bloom.

When `Recoil Control` is on:

- The selected compensation percentage, defaulting to 85%, subtracts the expected recoil vector from every shot.
- Compensation can exceed perfect expected compensation up to 125% to show over-pull cases.
- Recoil variation remains active, so the compensated path still has randomness around the expected vector.
- Spread/bloom remains fully active. Recoil control does not reduce bloom.

The stat panel reports both recoil/shot compensation and recoil direction compensation. Direction compensation is signed as the opposite control direction: for example, a `+22 deg` recoil direction corresponds to a `-158 deg` compensation direction.

### Bloom And Spread Model

The app models spread/bloom as a per-shot cone around the current recoil point.

`simulateBloom()`:

- Starts from the selected spread minimum for ADS/hipfire and standing/moving state.
- Adds the selected spread increase per shot.
- Applies decay/recovery between shots using the weapon's spread dynamics.
- Clamps the result to the effective max spread for the selected state.

Shot landing inside the bloom cone uses uniform-over-radius sampling:

```js
radius = spreadRadius * rng()
angle = 2 * Math.PI * rng()
```

This intentionally differs from uniform-over-area sampling, which would use `sqrt(rng())`. A sym.gg developer comment on Reddit says the franchise has used uniform distribution over radius, which means shots are visually center-weighted by area: about half of the shots land inside the central half-radius circle, which is only 25% of the full area. This is why spread feels more center-biased than a mathematically uniform disk.

### Rendering Layers

The main recoil panel uses independent overlay toggles:

- `Scatter`: faded simulated spray runs showing natural variance.
- `Spray Pattern`: the solid reference shot dots.
- `Recoil Path`: a line-only recoil reference path, drawn with reduced opacity and no bullet dots.
- `Bloom: Bubbles`: individual per-shot spread circles for selected rounds.
- `Bloom: Cone`: one connected bloom envelope across the burst.

Rendering order from bottom to top is:

1. Scatter dots.
2. Bloom bubbles/cone.
3. Recoil path.
4. Spray dots.

The bloom cone is not a convex hull of all circles. It connects the modeled per-shot circles with interpolated circles and traces the exposed outer envelope, which better matches the desired "hug the bubbles" shape from review screenshots.

### Distance Projection Model

`preview_distance.html` projects the same angular recoil and bloom output onto a flat wall:

```js
metersOnWall = Math.tan(angleInRadians) * distanceMeters
```

It keeps the recoil/spread model unchanged and changes only the display units. The page uses four panels: 5 m, 10 m, 20 m, and one custom distance panel. The human target outline is scaled in wall meters, the origin is centered on the chest, and hit counts are computed against that target outline.

Distance preview output is useful for understanding practical engagement ranges, but it should not be confused with projectile simulation. It does not model bullet travel time, drag, target motion, sight height, zeroing, or surface geometry.

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
- `AMMO`
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
- Lightened Suppressor.
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
- ADS Spread Recovery.
- Move ADS.
- Hip Min.
- 3D Spot.
- Minimap Spot.
- HS Mult.
- Weapon Sway.

Each chip has a native `title` tooltip explaining what the delta means. No custom cursor is applied.

### Recoil and Bloom Rendering

Recoil rendering is custom canvas drawing rather than Chart.js.

The panel has independent overlay toggles rather than one mutually exclusive view:

- `Scatter`: faded simulated spray runs.
- `Spray Pattern`: solid reference shot dots.
- `Recoil Path`: line-only recoil path, with no bullet dots.
- `Bloom: Cone`: connected bloom envelope across all modeled shots.
- `Bloom: Bubbles`: individual bloom/spread circles on selected rounds.

The panel also has state toggles:

- `ADS` and `Hipfire`.
- `Standing` and `Moving`.

Defaults are ADS and Standing.

The panel includes a freeform shot count input. The default is 20 shots, and the renderer clamps the selected shot count to the supported range before drawing. The same shot count drives scatter, spray pattern, recoil path, bloom bubbles, bloom cone, title text, and chart notes.

The panel also includes `Recoil Control` controls. When enabled, the selected compensation level subtracts the expected recoil vector from each shot while leaving recoil variation and spread/bloom active.

`genRecoilPts()`:

- Generates a deterministic recoil path from weapon ID and seed.
- Uses selected ADS or hipfire recoil formula inputs.
- Adds vertical and horizontal recoil based on selected recoil amount, direction, and uniform variation.
- Applies inter-shot recoil decay between shots.
- Applies expected recoil compensation when recoil control is enabled.

`drawRecoilFixed()`:

- Clears and redraws the recoil plot.
- Uses adjustable horizontal scale and derived vertical scale.
- Defaults to +/-5 degrees horizontally and -1 to 9 degrees vertically.
- Keeps the X axis centered around the current pan value.
- Draws grid lines, 0-degree axes, origin crosshair, and both X/Y labels including `0`.
- Simulates bloom internally with `simulateBloom()`.
- Draws 10 faded scatter runs when `Scatter` is enabled.
- Draws one solid reference run when `Spray Pattern` is enabled.
- Draws a recoil-only line when `Recoil Path` is enabled.
- Draws bloom bubbles for parsed selected rounds when `Bloom: Bubbles` is enabled.
- Draws the connected bloom envelope when `Bloom: Cone` is enabled.

Bloom round selection:

- The default list is `1, 2, 3, 5, 8, 13, 20`.
- The parser supports comma/space-separated round numbers.
- It also supports shortcuts such as `all`, ranges like `1-5`, and intervals like `every 2` or `every 3`.
- The control is greyed out unless bloom bubbles are selected.

Pan and zoom helpers:

- `adjustRecoilScale('in'|'out')`: changes horizontal half-scale by 0.5 degrees.
- `resetRecoilView()`: restores +/-5 degrees H and -1 to 9 degrees V with zero pan.
- `panRecoilView(dir)`: moves the chart by 0.5 degrees per click.
- `recoilScaleYMax()`: derives vertical max as `recoilScaleH * 2 - 1`.
- `recoilXMin()`, `recoilXMax()`, `recoilYMin()`, `recoilYMax()`: combine scale and pan.

`renderRecoil()`:

- Applies attachments for selected weapons.
- Renders attachment effect chips.
- Updates overlay, bloom mode, aim, stance, shot count, and recoil-control state.
- Calls `drawRecoilFixed()`.
- Updates legend, chart note, and recoil stat bars.

## Preview Tools

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

The main app's default bubble schedule matches the older Approach B schedule, now labeled as bloom bubbles rather than `+Bloom`.

`preview_distance.html` exists to review how the same angular recoil/spread model appears on flat walls at practical distances.

It provides:

- Fixed 5 m, 10 m, and 20 m panels plus a custom-distance panel.
- ADS/Hipfire and Standing/Moving toggles.
- Shot count control.
- Recoil control with 0% to 125% compensation.
- Independent layer toggles for spray pattern, recoil path, and bloom bubbles.
- Individual bubble and outline/cone views.
- Per-panel zoom and pan controls.
- A 180 cm human target outline centered at chest level.
- Hit counts showing how many shots intersect the target outline.
- One-meter gridlines and meter-based axis labels.

The distance page is a preview/review tool. It intentionally reuses the same recoil and spread assumptions as the main app, then changes the display projection from degrees to meters on the wall.

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

These are observations from code reading and from the current model assumptions.

### 1. Recoil decrease model needs validation against current behavior

The sym.gg developer comment on Reddit says recoil decrease is constant now and always tries to return the weapon toward the original point of aim. The current app does return recoil toward zero, but it uses a parameterized decay curve with exponent, time exponent, offset, and factor inputs.

This is directionally plausible, but it is not yet proven to match the current game. Any conclusions that depend on exact post-shot recovery should be treated as model estimates until tested against current in-game footage or source data.

Suggested fix: add a documented validation pass for recoil decrease, including the source used, the tested weapon, fire rate, frame rate, and measured return curve.

### 2. Screenshot-derived assumptions are not yet encoded as explicit provenance

The documentation now separates source-backed fields from screenshot-derived visual calibration, but the data objects themselves do not carry provenance tags for every value.

Risk areas:

- Values copied from source data.
- Values estimated from in-game screenshots.
- Values selected for readability, such as default bloom bubble rounds.
- Assumed attachment stats awaiting datamined confirmation.

Suggested fix: add lightweight provenance metadata where practical, such as `source`, `sourceDate`, `assumed`, `derivedFromScreenshot`, or comments next to calibrated values.

### 3. Recoil/bloom logic is duplicated across preview and main pages

`index.html`, `preview_bloom.html`, and `preview_distance.html` each contain overlapping recoil/spread simulation and drawing logic. This made sense while experimenting, but it increases drift risk now that the model has become more specific.

Known drift risks:

- Uniform-over-radius spread sampling must stay consistent across pages.
- Recoil control math must stay consistent across pages.
- Bloom cone/envelope generation must stay consistent across pages.
- Bubble round parsing and defaults must stay consistent across pages.

Suggested fix: extract shared recoil, spread, bloom, and parsing helpers into a common script used by both the main app and preview pages.

### 4. Bloom cone is a visualization envelope, not a direct game primitive

The cone/outline view is useful because it hugs the modeled bloom bubbles and shows the potential range across the burst. It is not a separate game mechanic, a convex hull, or a guarantee that every point inside the shape is equally likely.

Suggested fix: keep chart notes clear that cone means "bloom envelope across modeled shots" and bubbles mean "per-shot potential spread circles."

### 5. Some attachments are intentionally costed but not modeled

Several options use `noEffect:true`. They appear in the UI and add point cost, but do not change stats. This is useful for availability tracking, but users may assume all point-cost attachments affect displayed stats.

Examples:

- Compact Handstop.
- Long-Range ammo.
- Frangible ammo.
- Several lasers/lights.
- Mag Flare.
- Match Trigger.
- ADS Bolt.

Suggested follow-up: grey styling is the current signal. Add a tooltip or legend later if users continue to miss that these options are present but not modeled.

### 6. Assumed attachment stats should be revisited when datamined data is available

Some attachment values are deliberately marked as assumed:

- Linear Compensator.
- Compensated Brake.
- Flash Compensator.
- Long Suppressor.
- Lightened Suppressor.
- Heavy Barrel.
- Heavy Extended Barrel.

Suggested follow-up: verify these against datamined attachment stats when available and update both the data and this documentation.

### 7. Chart tooltip callbacks can break if only comparison weapon is selected

Locations:

- `renderChart()` BTK tooltip callback.
- `renderChart()` TTK tooltip callback.

BTK and TTK tooltip callbacks choose the displayed weapon with:

```js
const w = i.datasetIndex === 1 && w2 ? w2 : w1;
```

If comparison mode is enabled, a user can select weapon 2 without selecting weapon 1. In that case, `datasets` contains only weapon 2 at index 0, but the callback resolves `w` to `w1`, which is `null`. The next `w.name` or `getBTKWithHS(w, ...)` can throw.

Suggested fix: store the weapon object on each dataset, or derive from `datasets[i.datasetIndex]` metadata rather than assuming dataset index 0 is weapon 1 and index 1 is weapon 2.

### 8. Damage chart threshold generation can throw if no weapon reaches chart rendering

Location:

- `renderChart()` damage threshold generation.

The damage chart code uses `const w = w1 || w2` and immediately calls `getBTK(w, r)`. `renderStats()` prevents this when no weapons are selected, so normal startup is safe. The risk is only if future code calls `renderChart()` directly while both weapons are null.

Suggested fix: guard with `if (!w1 && !w2) return;` at the top of `renderChart()`.

### 9. Chart.js is loaded from CDN, so the app needs network access on first load

Location:

- `index.html` Chart.js script import.

The app depends on Chart.js from jsDelivr. If used offline or blocked by network policy, damage/BTK/TTK charts will fail and `renderChart()` can throw because `Chart` is undefined.

Suggested fix: vendor Chart.js locally or add a guard/fallback message.

### 10. Character encoding may be fragile in some tooling

The file contains non-ASCII symbols such as degree signs, multiplication signs, en dashes, arrows, and bullets. In the browser this is protected by `<meta charset="UTF-8">`, but some PowerShell output in this environment displays mojibake for these characters.

Suggested follow-up: preserve UTF-8 when editing. Avoid tools that rewrite the file with a legacy Windows code page.

### 11. No automated tests, data validation, or visual regression checks exist

There is no test suite or schema validation for:

- Weapon IDs referenced across maps.
- Attachment IDs referenced in `WEAPON_ATTS`.
- Default magazine IDs.
- Default barrel IDs.
- Point costs and over-100 loadouts.
- Chart render behavior for unusual state combinations.
- ADS vs hipfire attachment scoping.
- Standing vs moving spread bounds.
- Uniform-over-radius spread sampling.
- Recoil control compensation math.
- Bloom cone/envelope behavior.
- Preview page drift from the main app.

Suggested follow-up: add validation and small statistical checks before making more recoil/bloom model changes.

## Maintenance Recommendations

Near-term, high-value cleanups:

1. Add a recoil/bloom validation script that checks uniform-over-radius sampling, bloom clamping, recoil control vector subtraction, and bubble round parsing.
2. Add provenance comments or metadata for source-backed, assumed, and screenshot-derived recoil/spread values.
3. Verify the recoil decrease model against current game data or updated sym.gg formulas.
4. Fix compare-only tooltip handling in `renderChart()`.
5. Add a lightweight data validation script for IDs, defaults, and attachment availability.
6. Add a guard/fallback if Chart.js fails to load.

Longer-term structural improvements:

1. Extract shared recoil, spread, bloom, recoil-control, and bubble parsing helpers into a common script used by `index.html`, `preview_bloom.html`, and `preview_distance.html`.
2. Split `index.html` into `data.js`, `calculations.js`, `render.js`, and `styles.css`.
3. Add a data schema for weapons, attachment catalogs, and source provenance.
4. Add visual regression screenshots for the main recoil overlays and the distance preview panels.
5. Store dataset metadata directly on Chart.js datasets to simplify tooltip callbacks.
6. Add a small UI note or tooltip for unmodeled `noEffect` attachments if grey styling is insufficient.
7. Add responsive layout rules for smaller screens.
8. Revisit this documentation whenever a recoil/bloom assumption changes, especially sampling distribution, recoil decrease, recoil control, and cone rendering.
