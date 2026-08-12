# Code Documentation

## Architecture

The analyzer is a static ES-module application:

```text
index.html
  -> ui/app.js
       -> sim/* calculation modules
       -> ui/capture.js
       -> data/*.json (JSON module imports)
  -> vendor/chart.umd.min.js
```

There is no compilation or server-side runtime. `index.html` owns the visual system and stable markup;
`ui/app.js` owns state, rendering, browser events, charts, and responsive interactions; `sim/` owns
reusable domain calculations. Live numerical inputs are maintained under `data/`.

## State and sharing

The application keeps two loadout slots plus chart, recoil, and collapsed-panel state. URL persistence
is centralized in `sim/share-state.js`. Attachment tokens use catalog positions, so existing attachment
catalogs are append-only for compatibility. Legacy positional links are decoded there as well.

View-only details that do not describe a meaningful loadout are kept out of shared URLs where possible.
URL writes are debounced so frequent UI changes do not repeatedly update history.

## Loadouts

`sim/loadout.js` owns blank/default attachment state, available option construction, point totals,
assumed-data detection, and labeled select rendering. `sim/applyAttachments.js` transforms a base weapon
into the selected build. UI code should consume that result rather than reapplying individual modifiers.

Attachment lookup maps are created once in `ui/app.js` for display breakdowns. Source JSON is treated as
read-only at runtime; attachment behavior belongs in the data or the shared application function, not an
extra mutation after import.

## Damage and lethality

`sim/damage.js` resolves damage at range and hit-zone multipliers. Damage curves are piecewise linear
between declared breakpoints and clamp outside the recorded range. The site derives:

- damage per shot at a selected range;
- bullets to kill for chest, limb, or mixed hit sequences;
- time to kill from bullet count and shot timing;
- optional ADS and lethal-projectile flight-time additions;
- sniper sweet-spot behavior where supported.

Exact source curves take precedence over rounded display readings. Class/ammunition hit-zone policy is
validated against the entire current roster.

## Recoil and spread

`sim/core.js` owns recoil/spread primitives and current simulation context. It exports the shared spread
bar ceiling and `effectiveSpreadMax()`, preventing the UI and tests from maintaining separate copies of
the same simulation.

The effective maximum advances the selected build for a bounded 50-shot sequence, applying firing and
non-firing recovery across ordinary and burst gaps and clamping to the build's valid spread bounds. The
spread-scale test sweeps current weapons, stances, aim states, and relevant attachments once, then checks
both containment and useful chart utilization.

`ui/app.js` renders two recoil lenses:

- Angle Plot shows the weapon-space recoil/spread pattern independently of range.
- Soldier Target projects the same pattern into physical space at a selected distance and optic view.

`sim/target.js` owns target geometry, hit-zone classification, impact summaries, and target-image drawing.
The image and alpha map are loaded lazily only after the Soldier Target view is selected. Importing the
module does not fetch the image.

## Ballistics

`sim/ballistics.js` uses the declared weapon source set and projectile constants in
`data/ballistics.json`. Barrel velocity supports the current tier model and a compatibility fallback for
records that still expose the exact multiplier. Tests assert equivalent results for every selectable
current barrel.

Ballistic flight time is optional and appears only where the required projectile source data exists.
Missing coverage must not be silently invented.

## Rendering

`renderSidebar()` rebuilds class, weapon, and attachment controls from state. `renderStats()` coordinates
overview cards, charts, tables, recoil, and attachment effects. Chart.js objects are reused and updated.

Selected controls expose `aria-pressed` or `aria-selected`. Attachment select labels are associated with
their controls. On compact layouts the loadout sidebar becomes a modal dialog with focus trapping,
Escape dismissal, inert background content, and opener-focus restoration.

The stat-card layout uses content groups that wrap at intermediate widths. At phone widths groups become
full width while the card grid retains two columns down to very narrow screens.

## Capture

`ui/capture.js` renders a shareable image from the current view. Clipboard support is detected at runtime;
when image clipboard writing is unavailable or fails, the site downloads the PNG. Capture logic consumes
the current rendered state and does not own weapon calculations.

## Data and provenance

The current data boundary is:

- `weapons.json`: base roster and curves;
- `attachments.json`: attachment catalogs and effects;
- `ammo.json`: ammunition catalogs and weapon availability;
- `balance_tables.json`: shared tier/table rules;
- `recoil_decay.json`: recovery constants;
- `ballistics.json`: projectile source set and constants;
- `reload-exceptions.json`: explicit non-derived reload cases;
- `provenance/live-baseline.json`: source identity and current policy.

The completed attachment audit is a separate reference package under
`reference-data/attachment-audit/`. It is not read by the runtime, data validator, product tests, or CI.

## Performance characteristics

The shipped application has no dependency install or build cost. Data is imported once, lookup maps and
default applied builds are cached, charts are reused, URL writes are debounced, and the largest optional
visual asset is lazy. The product suite is designed to finish quickly enough for routine use.

For this project's size, keep optimization evidence-based. Prefer removing duplicate work, avoiding
unnecessary network/asset loads, and caching stable derived values over adding infrastructure.

## Extension rules

1. Put formulas in `sim/`, not inline copies in rendering or tests.
2. Put current source values in `data/` and record source policy in provenance.
3. Keep runtime imports inside the declared ship surface.
4. Preserve share-token ordering unless intentionally breaking compatibility.
5. Add the smallest test that protects a material new behavior; avoid source-pattern tests.
6. Treat historical version folders as frozen published pages.
