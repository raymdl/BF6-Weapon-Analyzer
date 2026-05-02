# BF6 Weapon Analyzer Code Documentation

This document describes the structure and behavior of `index.html`, the single-page BF6 Weapon Analyzer site. It also records code review notes found during the analysis so they can be reviewed separately from documentation work.

## High-Level Overview

The site is a self-contained HTML application:

- `index.html` contains the markup, styles, data tables, calculation logic, UI rendering, and initialization.
- Chart rendering uses Chart.js from `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`.
- No build step, module system, package manager, or local server is required for normal use.
- The application is driven by global state variables and direct DOM rendering.

At runtime, the user selects one primary weapon and optionally a comparison weapon. The app derives modified weapon stats from selected attachments, then renders:

- Overview stat cards.
- Damage, BTK, or TTK chart.
- BTK/TTK table.
- Recoil and bloom canvas simulation.
- Attachment effect chips.

## File Structure

`index.html` is organized into these major regions:

- Lines 1-7: document metadata and Chart.js import.
- Lines 8-122: CSS.
- Lines 124-221: static HTML shell.
- Lines 223-334: base weapon database.
- Lines 336-394: recoil tuning constants.
- Lines 396-599: attachment definitions and per-weapon attachment availability.
- Lines 601-613: mobility tier tables.
- Lines 614-944: per-weapon magazine data.
- Lines 955-1001: ergonomics definitions and per-weapon ergonomics availability.
- Lines 1005-1158: calculation helpers.
- Lines 1161-1168: app state.
- Lines 1171-1357: sidebar and attachment UI rendering.
- Lines 1360-1548: main stat rendering and UI controls.
- Lines 1550-1665: Chart.js rendering.
- Lines 1668-1686: BTK table rendering.
- Lines 1689-1932: recoil and bloom simulation/rendering.
- Lines 1936-1944: compare button setup and initial render.

## HTML Layout

The static body defines the containers that JavaScript later fills:

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
  - `#rcMain` is the custom recoil canvas.
  - `#rcStats`, `#rcLegend`, and `#attStats` are recoil and attachment summary containers.

Most UI interactions are attached either through inline `onclick` attributes in the HTML or by assigning `onclick` handlers in JavaScript.

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
- The recoil layout uses a three-column CSS grid with a fixed 380px recoil canvas column.

There is no explicit mobile layout breakpoint.

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
- `recoilV`: vertical recoil amount per shot.
- `recoilDir`: direction angle from vertical.
- `recoilVar`: recoil variation/spread width.
- `recoilIncAds`: ADS bloom increase per shot.
- `spreadMax`: maximum bloom/spread.
- `adsTime`: fallback/estimated ADS time in milliseconds.
- `fireMode`: display/model hint such as `auto`, `semi`, `bolt`, or `pump`.
- `pellets`: shotgun pellet count when applicable.
- `dmg`: stepped damage breakpoints as `{r, d}` objects.

Damage is treated as stepped zones, not interpolated between breakpoints.

### Recoil Constants

The recoil maps are keyed by weapon ID:

- `RECOIL_MULT`: per-weapon recoil multiplier used in the tier formula.
- `RECOIL_DEC`: recoil decrease factor used during inter-shot recovery.
- `RECOIL_DEC_TEXP`: time exponent for recoil recovery.
- `RECOIL_DEC_EXP`: position exponent override for specific weapons.

The core recoil formula in `applyAttachments()` is:

```js
effectiveRecoilV = recoilV * RECOIL_MULT[weaponId] ** totalTier
```

`totalTier` is the sum of:

- Grip recoil tier.
- Muzzle recoil tier modifier.
- Ammo recoil tier modifier.

### Attachment Catalogs

The global attachment catalogs define possible options and their effects:

- `MUZZLES`
  - `tierMod`: additive recoil tier modifier.
  - `spreadMult`: recoil variation multiplier.
  - `decayBoost`: bloom recovery boost.
  - `worldSpot`, `minimapSpot`: spotting exposure values.
  - `pts`: point cost.
- `BARRELS`
  - `vMult`: bullet velocity multiplier.
  - `adsSpd`: ADS speed tier shift.
  - `movAcc`: moving ADS accuracy tier shift.
  - `decayBoost`: currently present but not used directly in `applyAttachments()`.
  - `sIncMult`: bloom increase multiplier.
  - `pts`: point cost.
- `GRIPS`
  - `tier`: recoil tier contribution.
  - `movAcc`: moving ADS accuracy shift.
  - `adsSpd`: ADS speed shift.
  - `amsSh`: ADS movement speed tier shift, added after definition for some grips.
  - `weaponPts`: optional weapon-specific point overrides.
  - `noEffect`: marks options with tracked cost but unmodeled stats.
- `LASERS`
  - `movAcc`: moving ADS accuracy shift.
  - `pts`: point cost.
  - `noEffect`: tracked but unmodeled or visual-only.
- `AMMOS`
  - `hsMult`: headshot multiplier override, special `hp` behavior, or `null` for weapon default.
  - `tierMod`: recoil tier modifier.
  - `amsSh`: ADS move speed tier shift.
  - `noEffect`: available/costed, but no modeled stat effect.
- `ERGOS`
  - `sprSh`: sprint recovery tier shift.
  - `noEffect`: cost tracked but effect unknown/unmodeled.

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
- `_recoilR`: recoil reduction percentage for UI display.
- `_decayBoost`: bloom decay boost from muzzle.
- `_worldSpot`, `_minimapSpot`: firing exposure distances.
- `_movAccShift`: total moving accuracy shift.
- `_movAccDeg`: final moving ADS spread tier value.
- `_adsSpd`: combined grip/barrel ADS speed shift.
- `_adsTierMs`: final ADS time tier value, if magazine data exists.
- `_sprRecMs`: final sprint recovery tier value, if magazine data exists.
- `_adsMoveX`: final ADS move speed multiplier, if magazine data exists.
- `_hsMult`: final headshot multiplier.

Important modified base fields:

- `recoilV`: adjusted by recoil tier formula.
- `recoilVar`: adjusted by muzzle/grip spread multipliers.
- `recoilIncAds`: adjusted by barrel `sIncMult`.
- `bulletVel`: adjusted by barrel `vMult`.
- `mag`: replaced by selected magazine size.
- `tacRld`: replaced by selected magazine reload or Mag Catch reload.

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

### Main Stat Rendering

`renderStats()` controls top-level visibility, then calls:

1. `renderOverview()`
2. `renderChart()`
3. `renderBTK()`
4. `renderRecoil()`

Each function calls `applyAttachments()` again, so every panel works from current loadout state.

### Overview Rendering

`renderOverview()` fills:

- Weapon header.
- Weapon class badges.
- Stat cards for damage, headshot multiplier, fire rate, bullet velocity, mobility, reload, deploy, recoil, moving ADS accuracy, and spotting values.

When comparing, the second value is shown with a percentage or absolute delta. Delta color is based on whether higher or lower is better for that metric.

The `qFields` array exists but is empty, so qualitative mobility cards never render.

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

### Recoil and Bloom Rendering

Recoil rendering is custom canvas drawing rather than Chart.js.

`genRecoilPts()`:

- Generates a deterministic recoil path from weapon ID and seed.
- Adds vertical and horizontal recoil based on `recoilV`, `recoilDir`, and Gaussian variation.
- Applies inter-shot recoil decay between shots.

`drawRecoilFixed()`:

- Clears and redraws a fixed-scale recoil plot.
- Uses horizontal scale +/-6 degrees.
- Uses vertical scale -1 to 11 degrees.
- Draws grid lines, axes, origin crosshair, and labels.
- Simulates ADS bloom internally with `simulateBloom()`.
- Draws 12 faded spray-cloud runs.
- Draws one solid reference run.
- In `path` mode, draws a recoil-only line connecting reference points.

`renderRecoil()`:

- Applies attachments for selected weapons.
- Renders attachment effect chips.
- Calls `drawRecoilFixed()`.
- Updates legend, notes, and recoil stat bars.

## How To Add Or Update Data

### Add A Weapon

1. Add a base weapon object to `W`.
2. Add the weapon ID to recoil maps:
   - `RECOIL_MULT`
   - `RECOIL_DEC`
   - `RECOIL_DEC_TEXP`
   - `RECOIL_DEC_EXP`, only if it needs a non-default exponent.
3. Add `WEAPON_ATTS[weaponId]` with availability arrays and `barrelDef`.
4. Add `WEAPON_AMMO[weaponId]`.
5. Add `WEAPON_MAG[weaponId]`.
6. Add `WEAPON_ERGO[weaponId]` if it has ergonomics.
7. If the weapon has non-default headshot behavior, update `BASE_HS_MULT` or `HP_HS_HIGH`.

### Add An Attachment

1. Add the option to the correct global catalog.
2. Choose a stable `id`.
3. Add modeled effect fields where applicable.
4. Add `pts`, and `weaponPts` if point cost differs for specific weapons.
5. Add the attachment ID to relevant `WEAPON_ATTS` arrays.
6. If the attachment has no modeled effect yet, set `noEffect:true` so it appears greyed in selects.

### Change Attachment Availability

Edit only the relevant weapon entry in `WEAPON_ATTS`. The select controls use these arrays directly.

Example: the AK-205 Slim Handstop fix added `slim_handstop` to the AK-205 `grip` array at `index.html:561`.

### Add Magazine Variants

Edit `WEAPON_MAG[weaponId].mags`.

Each magazine entry can include:

- `name`
- `pts`
- `mag`
- `tacRld` in milliseconds
- `adsSh`
- `sprSh`
- `amsSh`

Then ensure `def` points to a valid magazine ID.

## Review Notes: Incorrect, Incomplete, Or Inconsistent Items

These are observations from code reading only. I did not change behavior while documenting.

### 1. Chart tooltip callbacks can break if only comparison weapon is selected

Locations:

- `index.html:1590`
- `index.html:1619`

BTK and TTK tooltip callbacks choose the displayed weapon with:

```js
const w = i.datasetIndex === 1 && w2 ? w2 : w1;
```

If comparison mode is enabled, a user can select weapon 2 without selecting weapon 1. In that case, `datasets` contains only weapon 2 at index 0, but the callback resolves `w` to `w1`, which is `null`. The next `w.name` or `getBTKWithHS(w, ...)` can throw.

Suggested fix: store the weapon object on each dataset, or derive from `datasets[i.datasetIndex]` metadata rather than assuming dataset index 0 is weapon 1 and index 1 is weapon 2.

### 2. Damage chart threshold generation can throw if no weapon reaches chart rendering

Location:

- `index.html:1639`

The damage chart code uses `const w = w1 || w2` and immediately calls `getBTK(w, r)`. `renderStats()` prevents this when no weapons are selected, so normal startup is safe. The risk is only if future code calls `renderChart()` directly while both weapons are null.

Suggested fix: guard with `if (!w1 && !w2) return;` at the top of `renderChart()`.

### 3. Attachment section for an empty compare slot falls back to primary ammo and magazine data

Locations:

- `index.html:1285`
- `index.html:1307-1310`

When `weapon` is null, the ammo and magazine controls fall back to `selW1`. This means an empty comparison slot can show the primary weapon's ammo/magazine options. It may be intentional as a placeholder, but it is confusing because those controls do not belong to a selected comparison weapon.

Suggested fix: if `weapon` is null, show disabled `None` controls or hide ammo/magazine controls until a comparison weapon is selected.

### 4. Some attachments are intentionally costed but not modeled

Locations:

- `index.html:429`
- `index.html:461`
- `index.html:463`
- `index.html:534-544`
- `index.html:958-961`

Several options use `noEffect:true`. They appear in the UI and add point cost, but do not change stats. This is useful for availability tracking, but users may assume all point-cost attachments affect displayed stats.

Examples:

- Compact Handstop
- Long-Range ammo
- Frangible ammo
- Several lasers/lights
- Mag Flare
- Match Trigger
- ADS Bolt

Suggested follow-up: decide whether the grey styling is enough, or add a small tooltip/legend for "effect not modeled".

### 5. Ergonomics TODOs confirm incomplete modeling

Locations:

- `index.html:949-952`

The code explicitly lists unknown effects:

- Mag Flare
- Match Trigger
- ADS Bolt

These should stay documented as incomplete until reliable data is available.

### 6. Heavy barrel bloom model is marked as placeholder

Location:

- `index.html:411`

The `sIncMult` comment says heavy barrels reduce spread buildup per shot and marks it as a placeholder. The model is active in `applyAttachments()` at `index.html:1075`, but the source comment signals uncertainty.

Suggested follow-up: verify heavy barrel spread behavior against the source data.

### 7. `BARRELS.decayBoost` exists but is not applied

Location:

- `index.html:411-418`

Barrel objects include `decayBoost`, but `applyAttachments()` only sets `_decayBoost` from the muzzle:

```js
_decayBoost: muz.decayBoost ?? 0
```

If barrel bloom recovery effects are expected, they are currently ignored.

Suggested fix: either remove `decayBoost` from barrel data if unused, or combine barrel and muzzle decay boost in `applyAttachments()`.

### 8. `drawRecoilFixed()` has unused variables

Locations:

- `index.html:1717`
- `index.html:1741`

`weapons` and `H_GRID` are assigned but not used. This is harmless, but it suggests leftover code from an earlier implementation.

Suggested fix: remove them during cleanup.

### 9. Bloom fallback references a variable outside its scope

Location:

- `index.html:1824`

Inside `drawRecoilFixed()`, this line appears in the spray cloud loop:

```js
const bloom = blooms[i] ?? baseline;
```

`baseline` is declared inside the nested `simulateBloom()` function, so it is not in scope here. In current loops, `blooms[i]` should always exist, so the fallback is not evaluated. Still, if that ever changes, this becomes a `ReferenceError`.

Suggested fix: replace the fallback with the literal `0.05` or hoist `baseline` into the outer scope.

### 10. `qFields` is always empty

Locations:

- `index.html:1413`
- `index.html:1450-1462`

`renderOverview()` has a qualitative fields rendering pass, but `qFields` is initialized as an empty array and never populated. This block currently does nothing.

Suggested fix: remove the block or populate `qFields` with actual qualitative fields.

### 11. Chart.js is loaded from CDN, so the app needs network access on first load

Location:

- `index.html:7`

The app depends on Chart.js from jsDelivr. If used offline or blocked by network policy, charts will fail and `renderChart()` will throw because `Chart` is undefined.

Suggested fix: vendor Chart.js locally or add a guard/fallback message.

### 12. Character encoding may be fragile in some tooling

Locations:

- `index.html:223` and many comments/text strings after it.

The file contains non-ASCII symbols such as degree signs, multiplication signs, box-drawing separators, and bullets. In the browser this is protected by `<meta charset="UTF-8">`, but some PowerShell output in this environment displayed mojibake for these characters.

Suggested follow-up: preserve UTF-8 when editing. Avoid tools that rewrite the file with a legacy Windows code page.

### 13. No automated tests or data validation exist

There is no test suite or schema validation for:

- Weapon IDs referenced across maps.
- Attachment IDs referenced in `WEAPON_ATTS`.
- Default magazine IDs.
- Default barrel IDs.
- Point costs and over-100 loadouts.
- Chart render behavior for unusual state combinations.

Suggested follow-up: add a small validation script that loads/extracts the JS data and checks ID integrity.

## Maintenance Recommendations

Near-term, high-value cleanups:

1. Fix compare-only tooltip handling in `renderChart()`.
2. Remove primary-slot fallback controls from an empty compare slot.
3. Hoist or replace the recoil bloom `baseline` fallback.
4. Add a lightweight data validation script for IDs and defaults.

Longer-term structural improvements:

1. Split `index.html` into `data.js`, `calculations.js`, `render.js`, and `styles.css`.
2. Add a data schema for weapons and attachment catalogs.
3. Store dataset metadata directly on Chart.js datasets to simplify tooltip callbacks.
4. Add a small UI note for unmodeled `noEffect` attachments.
5. Add responsive layout rules for smaller screens.
