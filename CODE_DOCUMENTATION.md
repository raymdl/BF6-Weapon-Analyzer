# BF6 Weapon Analyzer — Code Documentation

This document describes the current structure and behavior of the BF6 Weapon Analyzer project.
`index.html` is the primary app. `preview_bloom.html` and `preview_distance.html` are companion
tools used to test recoil/bloom visualization ideas and validate distance projections.

---

## High-Level Architecture

The site is a self-contained set of static files served via a local dev server (Vite on
`localhost:5174` by default). There is no build step, but pages use `<script type="module">`
so they require HTTP — opening the HTML files directly as `file://` URLs will fail.

```
BF6 Project/
  index.html                ← Primary weapon analyzer app
  preview_bloom.html        ← Recoil/bloom chart experiment tool
  preview_distance.html     ← Distance-wall spray projection tool

  ui/
    app.js                  ← Primary app state, rendering, chart, and recoil UI logic

  vendor/
    chart.umd.min.js        ← Local Chart.js bundle used by index.html

  sim/
    core.js                 ← Shared simulation math (RNG, recoil, bloom)
    applyAttachments.js     ← Attachment effect application + derived stats
    loadout.js              ← Shared loadout defaults, point totals, and sidebar helpers
    attachments.js          ← Canonical ordered attachment slot definitions

  data/
    weapons.json            ← All 55 weapon base stats (one object per weapon)
    attachments.json        ← Attachment catalogs + per-weapon availability
    ammo.json               ← Ammo types + per-weapon availability
    recoil_decay.json       ← Per-weapon ADS recoil decay table
    balance_tables.json     ← Tier tables (ADS speed, sprint recovery, spread, etc.)

  scripts/
    validate-data.mjs       ← Cross-file data validation used locally and by CI

  CODE_DOCUMENTATION.md     ← Architecture and behavior reference
  MAINTENANCE.md            ← Season/patch update checklist (data edits)
  .gitignore
```

Local-only helper files are intentionally ignored and should not be committed:
`serve.bat`, `Open - *.url`, `gen_dmg.py`, `read_xlsx.py`, and `.claude/`.

### Data Flow

1. Page loads → `<script type="module">` fetches all relevant JSON files via `Promise.all`.
2. Data is pushed into `sim/core.js` via `setSimContext()` and `sim/applyAttachments.js` via `setAttachmentContext()`.
3. `sim/loadout.js` provides shared attachment defaults, point totals, assumed-stat detection, and sidebar rendering helpers.
4. User selects a weapon and attachments → `applyAttachments(rawWeapon, selectedAtts)` returns a derived weapon object.
5. All renderers (overview cards, chart, BTK table, recoil canvas) consume the derived object.

All three pages share the same `sim/` modules and the same `data/` JSON files. **One data edit applies to all pages.**

---

## Module Reference: `sim/`

### `sim/core.js`

Pure simulation math. Previously copy-pasted across all three pages; now imported by all of them.

**Context setter:**

```js
setSimContext({
  aimState,        // 'ads' | 'hip'
  stanceState,     // 'stand' | 'move'
  RECOIL_DEC,      // per-weapon recoil decay factor (from recoil_decay.json)
  RECOIL_DEC_EXP,  // per-weapon decay exponent
  RECOIL_DEC_TEXP, // per-weapon decay time exponent
  compensationFn,  // () => number — page provides current compensation level
});
```

Call `setSimContext` once after JSON loads, then again whenever `aimState`/`stanceState` changes.

**Exports:**

| Export | Description |
|---|---|
| `setSimContext(updates)` | Merges updates into the module-level context |
| `mulberry32(seed)` | Returns a Mulberry32 PRNG closure |
| `whash(str)` | Stable 32-bit string hash (used to seed per-weapon RNG) |
| `uniformDev(rng, range)` | Uniform sample in `[-range/2, +range/2]` |
| `applyRecoilDecay(recoil, dt, w)` | Decays recoil toward zero using per-weapon parameters |
| `recoilGroup(w)` | Returns `recoil.ads` or `recoil.hip` based on current aim state |
| `baseRecoilGroup(w)` | Same but always uses raw `w` (not attachment-modified) |
| `recoilAmount(w)` | Per-shot recoil amount for current aim state |
| `recoilVariation(w)` | Per-shot direction variation for current aim state |
| `selectedRecoilAmountFor(w)` | Recoil amount scoped to current aim state |
| `selectedRecoilVariationFor(w)` | Recoil variation scoped to current aim state |
| `spreadBounds(w)` | `[min, max]` spread for current aim+stance state |
| `spreadDynamics(w)` | Spread decay/increase model for current aim state |
| `selectedSpreadIncFor(w)` | Spread increase per shot for current aim state |
| `simulateBloom(w, shots)` | Returns per-shot bloom radius array |
| `genRecoilPts(w, seed, shots)` | Returns deterministic recoil point array |

**`genRecoilPts(w, seed = 0, shots = 20)` argument order:** seed before shots.

---

### `sim/applyAttachments.js`

Applies all attachment effects to a raw weapon object. Replaces the two separate inline
`applyAttachments` functions that previously lived in `index.html` and `preview_distance.html`.

**Context setter:**

```js
setAttachmentContext({
  MUZZLES, BARRELS, GRIPS, LASERS, ERGOS,
  WEAPON_MAG, WEAPON_ERGO,
  AMMO,
  RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
  BASE_HS_MULT, HP_HS_HIGH,
  MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
  ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS,
});
```

Call once after all JSON data is fetched.

`setAttachmentContext()` also builds per-catalog ID lookup maps. Hot paths in
`applyAttachments()` resolve selected attachments from those maps instead of
scanning catalog arrays on every render.

**Exports:**

| Export | Description |
|---|---|
| `setAttachmentContext(updates)` | Merges updates into the module-level context |
| `applyAttachments(w, atts)` | Returns a new weapon object with all attachment effects applied. Does not mutate `w`. |
| `wLabel(w)` | Returns `w._label` if set, otherwise `w.name` |

**`applyAttachments` output — private display fields (`_` prefix):**

| Field | Description |
|---|---|
| `_label` | Weapon name + attachment tags joined by ` · ` |
| `_adsRecoilReductionPct` | ADS recoil reduction % for UI display |
| `_adsSpreadDecayBoost` | Extra ADS bloom decay from muzzle |
| `_worldSpot`, `_minimapSpot` | Firing exposure distances |
| `_movingAdsSpreadTierMod` | Total moving ADS accuracy tier shift |
| `_movingAdsMinSpreadDeg` | Final moving ADS minimum spread in degrees |
| `_adsTimeTierMod` | Combined grip + barrel ADS tier shift |
| `_adsTimeMs` | Final ADS time in ms (from balance table, `null` if no mag data) |
| `_sprintRecoveryMs` | Final sprint recovery in ms (from balance table) |
| `_adsMoveSpeedMult` | Final ADS move speed multiplier |
| `_hipSpreadTierMod` | Total hipfire spread tier shift |
| `_weaponSway` | Weapon sway delta |
| `_hsMult` | Final headshot multiplier |

**`applyAttachments` output — modified base fields:**

| Field | Modification |
|---|---|
| `recoilV` | Scaled by ADS recoil tier formula: `w.recoilV × mult^tierMod` |
| `recoilVar` | Scaled by muzzle/grip `adsRecoilVariationMult` |
| `recoilIncAds` | Scaled by barrel `adsSpreadIncMult` |
| `bulletVel` | Scaled by barrel `vMult` |
| `spread` | Hip spread min shifted by tier if `hipSpreadTierMod ≠ 0` |
| `mag` | Replaced by selected magazine count |
| `tacRld` | Replaced by magazine reload or Mag Catch reload |

---

### `sim/attachments.js`

Single source of truth for attachment slot ordering and UI metadata. `index.html`,
`preview_bloom.html`, and `preview_distance.html` import `ATTACHMENT_SLOT_KEYS` and
iterate it to build their attachment sidebars. **Adding a new slot type = one entry here,
all pages pick it up.**

```js
export const ATTACHMENT_SLOT_KEYS = [
  { key: 'muzzle', label: 'Muzzle', dataKey: 'MUZZLES', noWeaponText: 'None' },
  { key: 'barrel', label: 'Barrel', dataKey: 'BARRELS', noWeaponText: 'Basic Barrel', isBarrel: true },
  { key: 'laser',  label: 'Laser',  dataKey: 'LASERS',  noWeaponText: 'None' },
  { key: 'sight',  label: 'Sight',  dataKey: 'SIGHTS',  noWeaponText: 'Iron Sights' },
  { key: 'grip',   label: 'Grip',   dataKey: 'GRIPS',   noWeaponText: 'None' },
];
```

`dataKey` is resolved against each page's own attachment data source. `isBarrel: true`
marks the slot that always has at least one option (no 'None' choice). Slots are always
rendered — when unavailable they appear disabled/greyed rather than hidden.

---

### `sim/loadout.js`

Shared loadout UI and accounting helpers used by `index.html`,
`preview_bloom.html`, and `preview_distance.html`. The index page remains the
golden source for behavior and styling; the preview pages call the same helper
with their own DOM class names.

**Exports:**

| Export | Description |
|---|---|
| `defaultAttsForWeapon(weapon)` | Returns the canonical default attachment selections for a weapon |
| `resetAttsForWeapon(weapon)` | Alias for default loadout reset on weapon switch |
| `validateAtts(weapon)` | Backwards-compatible alias retained for older page code |
| `computeAttPts(weapon, atts, data)` | Sums attachment points across sight, muzzle, barrel, grip, laser, ammo, mag, and ergo |
| `hasSelectedAssumedAtt(weapon, atts, data)` | Detects selected attachments flagged `assumed: true` |
| `attDisplayName(id, data)` | Resolves an attachment ID to display text |
| `renderAttachmentSection(config)` | Builds a slot dropdown row using the shared slot metadata |

The module caches attachment catalog lookup maps with a `WeakMap` keyed by the
data bundle passed by each page.

---

## Data Reference: `data/`

### `data/weapons.json`

Array of 55 weapon objects. The `cls` field drives the class filter buttons in the UI.
Current classes: `Assault Rifle`, `Carbine`, `SMG`, `LMG`, `DMR`, `Sniper Rifle`, `Shotgun`.

Seven sidearms (`cls: "Sidearm"`) are present in the file but intentionally hidden from the
UI — `"Sidearm"` is not in the `CLASSES` array in either page. They will surface once
attachment availability data is ready.

**Required fields per weapon object:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable internal key used across all data files |
| `name` | string | Display name |
| `cls` | string | Weapon class (drives filter buttons) |
| `cal` | string | Caliber display text |
| `rpm` | number \| null | Fire rate; `null` for bolt/pump weapons without meaningful auto-TTK |
| `mag` | number | Base magazine size |
| `tacRld` | number | Tactical reload in seconds |
| `emptyRld` | number \| null | Empty reload in seconds; `null` for revolvers |
| `bulletVel` | number | Muzzle velocity in m/s |
| `recoilV` | number | ADS recoil per shot (= `ADSRecoilAmount × ADSRecoilAmountMultiplier^ADSRecoilAmountMultiplierExponent`) |
| `recoilDir` | number | Recoil direction angle from vertical (degrees) |
| `recoilVar` | number | ADS recoil direction variation (degrees) |
| `recoilIncAds` | number | ADS bloom increase per shot |
| `spreadMax` | number | Fallback maximum spread |
| `adsTime` | number | Estimated ADS time in ms (fallback; balance table tiers take precedence) |
| `fireMode` | string | `auto`, `semi`, `bolt`, or `pump` |

**Optional but important fields:**

| Field | Description |
|---|---|
| `deployT` | Deploy/holster time in seconds |
| `pellets` | Shotgun pellet count |
| `dmg` | Stepped damage breakpoints as `[{r, d}, ...]` |
| `recoil.ads` / `recoil.hip` | Full formula inputs per aim state (maps to sym.gg `ADSRecoil*` / `HIPRecoil*`) |
| `spread.adsStand`, `.adsMove`, `.hipStand`, `.hipMove` | `[min, max]` spread in degrees |
| `spreadDyn.ads` / `spreadDyn.hip` | Spread increase/decay model per aim state (sym.gg `ADSBaseSpread*` / `HIPBaseSpread*`) |

---

### `data/attachments.json`

Keys: `SIGHTS`, `MUZZLES`, `BARRELS`, `GRIPS`, `LASERS`, `ERGOS`, `WEAPON_ATTS`,
`WEAPON_ERGO`, `WEAPON_MAG`.

**Attachment effect fields** (full reference in `MAINTENANCE.md`):

| Field | Neutral | Description |
|---|---|---|
| `adsRecoilTierMod` | `0` | Shifts ADS recoil amount tier |
| `adsRecoilVariationMult` | `1` | Multiplies ADS recoil direction variation |
| `hipSpreadTierMod` | `0` | Shifts hipfire min spread tier |
| `adsSpreadIncMult` | `1` | Multiplies ADS bloom per shot |
| `adsSpreadDecayBoost` | `0` | Extra ADS bloom decay coefficient |
| `movingAdsSpreadTierMod` | `0` | Shifts moving ADS min spread tier |
| `adsTimeTierMod` | `0` | Shifts ADS speed tier |
| `adsMoveSpeedTierShift` | `0` | Shifts ADS move speed tier |
| `vMult` | `1` | Multiplies bullet velocity |
| `sway` | `0` | Adds to weapon sway |
| `worldSpot` | `54` | World spotting distance override (muzzle only) |
| `minimapSpot` | `150` | Minimap spotting distance override (muzzle only) |

**Per-weapon maps:**

- `WEAPON_ATTS[id]` — allowed muzzle/barrel/grip/laser IDs, plus `barrelDef`
- `WEAPON_MAG[id]` — magazine variants with tier shift overrides
- `WEAPON_ERGO[id]` — ergonomics availability and Mag Catch reload times

---

### `data/ammo.json`

Keys: `AMMO` (catalog array), `WEAPON_AMMO` (per-weapon availability + point costs).

`AMMO` entries use `hsMult: null` to inherit the weapon's default, `hsMult: 'hp'` for the
hollow-point behavior (1.5× or 1.75× depending on `HP_HS_HIGH`), or a numeric override.

---

### `data/recoil_decay.json`

Three maps keyed by weapon ID:

| Map | Description |
|---|---|
| `RECOIL_DEC` | Decay factor (`ADSRecoilDecreaseFactor`) |
| `RECOIL_DEC_TEXP` | Decay time exponent (`ADSRecoilDecreaseTimeExponent`) |
| `RECOIL_DEC_EXP` | Decay exponent override when ≠ 1 (bolt-actions and some shotguns use 0.6) |

Decay formula: `retain = exp(-decFactor × decOffset × interShotTime^decTimeExp) ^ decExp`

---

### `data/balance_tables.json`

Tier lookup tables used by `applyAttachments`:

| Key | Description |
|---|---|
| `ADS_SPD_TIERS` | ADS time in ms for tiers 1–8 |
| `SPRINT_REC_TIERS` | Sprint-to-fire recovery in ms for tiers 1–8 |
| `ADS_MOVE_TIERS` | ADS move speed multiplier for tiers 1–8 |
| `MOVING_ACC_TIERS` | Moving ADS min spread in degrees for tiers 1–8 |
| `RECOIL_MULT` | Per-weapon ADS recoil tier multiplier |
| `HIP_SPREAD_TIERS` | Hip spread values by class and tier |
| `HIP_SPREAD_BASE_IDX` | Base tier indices for hip spread keys |
| `HIP_CLS` | Per-weapon hip spread class |
| `BASE_HS_MULT` | Per-weapon base headshot multiplier (default 1.34) |
| `HP_HS_HIGH` | Set of weapon IDs that use 1.75× HP headshot multiplier |

---

## Core Data Model

### Weapon Object Lifecycle

```
data/weapons.json
       │
       ▼
   rawWeapon (W array)
       │
       ▼
applyAttachments(rawWeapon, selectedAtts)   ← reads data from setAttachmentContext
       │
       ▼
 derivedWeapon (_label, modified recoilV, mag, tacRld, tier values…)
       │
       ├─► renderOverview()
       ├─► renderChart() / renderBTK()
       ├─► renderRecoil() → genRecoilPts() / simulateBloom()
       └─► renderAttachmentStats()
```

All renderers consume the derived object. The raw weapon is never mutated.

### Damage Model

Damage is **stepped zones**, not interpolated. `getDmg(w, range)` walks forward through the
`dmg` breakpoints and returns the value of the last breakpoint whose `r ≤ range`.

### BTK / TTK Calculations

```js
BTK  = ceil(100 / dmg)                         // body shots; pellets multiply dmg for shotguns
TTK  = round((btk - 1) / (rpm / 60) * 1000)   // ms; null when rpm is null
```

`getBTKWithHS(w, range, headshots)` allocates headshots first, then finishes with body shots.
Uses `w._hsMult` (from `applyAttachments`) with fallback to 1.34.

---

## Recoil / Bloom Model

### Sources and Provenance

- **sym.gg** — all raw weapon and attachment stats; field naming conventions
- **Dr. Smiley Henry** — bloom/spread decay model reference
- **TheXclusiveAce** — in-game spray-pattern sanity checks
- **SORROW** — additional weapon data reference

Items sourced directly from data: damage breakpoints, RPM, mag, reload timings, bullet velocity,
recoil formula inputs, spread min/max, spread increase/decay inputs, attachment costs/effects.

Items that are visually calibrated: recoil chart scale defaults, scatter run count,
bloom bubble round schedule defaults (`1, 2, 3, 5, 8, 13, 20`), bloom cone rendering shape,
distance wall panel sizes and human target overlay.

### Recoil Path (`genRecoilPts`)

For each shot:
1. Select ADS or hipfire recoil inputs based on `aimState`.
2. Compute per-shot recoil amount and direction, including attachment tier adjustments.
3. Sample direction variation uniformly in `[-recoilVar/2, +recoilVar/2]`.
4. Add the horizontal and vertical delta to the running aim point.
5. Apply optional compensation vector (recoil control).
6. Apply inter-shot recoil decay toward zero before the next shot.

Decay formula: `Δdecrease = (|recoil|^decExp + decOffset) × decFactor × dt × time^timeExp`

### Bloom / Spread (`simulateBloom`)

- Starts at the stance/aim spread minimum.
- Adds `spreadInc` per shot.
- Applies per-shot decay using `spreadDyn` inputs.
- Clamps to the spread maximum for the current state.
- Shot positions are sampled **uniform over radius** (not uniform over area):
  `r = spreadRadius × rng()` — this matches the franchise convention and makes shot
  distributions visually center-weighted (half the shots land in the inner 25% of the area).

### Recoil Control

- Off: compensation = 0, controls disabled.
- On: compensation % (default 85%, max 125%) subtracts the expected recoil vector per shot.
  Variation and bloom remain fully active.

### Distance Projection (`preview_distance.html`)

`metersOnWall = Math.tan(radians) × distanceMeters`

Same angular model as the main app, different display units. Not a projectile simulator —
does not model bullet travel time, drag, sight height, or zeroing.

---

## Page Reference

### `index.html`

Primary app. Major JS regions (line numbers approximate, drift as file changes):

- **`index.html`**: metadata, local Chart.js include, CSS, static HTML shell, and `ui/app.js` module entry point.
- **`ui/app.js`**: JSON fetch (`Promise.all`), context setup, app state, sidebar/loadout rendering, overview cards, chart rendering, recoil/bloom canvas, attachment effect chips, and event wiring.

**Class filter buttons** (`CLASSES` array): `Assault Rifle`, `Carbine`, `SMG`, `LMG`,
`DMR`, `Sniper Rifle`, `Shotgun`. Button labels come from `CLASS_SHORT`:
`AR`, `Carb`, `SMG`, `LMG`, `DMR`, `Sniper`, `SG`.

**Attachment state shape:**
```js
{ sight: 'iron', muzzle: 'none', barrel: '<default>', grip: 'none',
  laser: 'none', ammo: 'standard', mag: null, ergo: 'none' }
```

**App state** is consolidated in `ui/app.js` as a single `state` object with three sub-objects: `state.slots[0/1]` (class, weapon, atts per loadout), `state.chart` (mode, btkHS, showAds), and `state.recoil` (aim, stance, layers, control, compensation, seed, scale, pan).

---

### `preview_bloom.html`

Recoil/bloom chart experiment tool. Three side-by-side chart approaches with independent
bubble schedules, a class/weapon/attachment sidebar, and configurable shot count. Imports
all three `sim/` modules and all five `data/` JSON files. Attachment selections are applied
through `applyAttachments(rawWeapon, selectedAtts)`, matching the main app and distance
preview. `compensationFn` is still stubbed to `() => 0` because this preview has no recoil
control UI.

Useful for testing rendering changes before porting to the main app.

---

### `preview_distance.html`

Distance-wall spray projection tool. Full attachment sidebar (imports all three `sim/`
modules and all five `data/` JSON files). Panels: 5 m, 10 m, 20 m, custom distance.
Human target outline (180 cm) with hit count. Independent per-panel zoom/pan state.

Useful for validating how angular recoil/bloom translates to practical engagement distances.

---

## App State and Rendering Flow

### Startup

1. `<script type="module">` fetches all JSON files via `Promise.all`.
2. `setSimContext(...)` and `setAttachmentContext(...)` are called with fetched data.
3. Shared lookup maps are initialized for attachment and loadout resolution.
4. `renderSidebar()` and `renderStats()` are called. With no weapon selected, `renderStats`
   shows the empty state and returns.

### Attachment Sidebar (`renderAttachmentSection`)

`sim/loadout.js` iterates `ATTACHMENT_SLOT_KEYS` from `sim/attachments.js`. For each slot:
- **No weapon selected**: renders disabled placeholder (greyed, never hidden).
- **Weapon selected, one option**: renders disabled single-option row.
- **Weapon selected, multiple options**: renders interactive dropdown.

Ammo, Mag, and Ergo slots are built separately from their per-weapon maps using the same
always-render / disable-when-unavailable pattern.

Selecting a weapon resets to the canonical defaults with `resetAttsForWeapon()`; the
legacy `validateAtts()` name still exists as a compatibility wrapper.

### Attachment Point Counter (`computeAttPts`)

Sums points across sight, muzzle, barrel, grip, laser, ammo, magazine, and ergo. Over-100 loadouts
are marked with the `.over` class. Weapon-specific point overrides (`weaponPts`) are resolved
by `getAttPts()`.

Seven attachment stats are marked `assumed: true` and trigger a sidebar footnote when selected:
Linear Compensator, Compensated Brake, Flash Compensator, Long Suppressor, Lightened
Suppressor, Heavy Barrel, Heavy Extended Barrel.

---

## Performance Notes

The app is still static and render-on-change, but the busiest paths avoid avoidable
rework:

- Attachment catalogs are indexed once in `sim/applyAttachments.js`.
- Shared loadout helpers cache their catalog indexes per page data bundle.
- `renderChart()` reuses the existing Chart.js instance via `updateDmgChart()` and
  calls `chart.update('none')` instead of destroying/recreating the canvas state.
- `drawRecoilFixed()` computes recoil points, bloom radii, and spray points once per
  weapon per draw and reuses them across scatter, spray path, bloom, and cone layers.
- Default applied weapon baselines are cached per raw weapon object for attachment stat
  comparisons.

---

## How To Add or Update Data

See **`MAINTENANCE.md`** for the full season/patch checklist. Quick summary:

| Task | File(s) |
|---|---|
| New weapon | `data/weapons.json` + entries in all other `data/` files |
| Recoil/stat change | `data/weapons.json` + `data/recoil_decay.json` |
| New attachment | `data/attachments.json` (catalog + `WEAPON_ATTS` lists) |
| New attachment *slot type* | `sim/attachments.js` (one entry) + `sim/applyAttachments.js` (handler) + `sim/loadout.js` if it affects UI/accounting |
| New ammo type | `data/ammo.json` |
| Balance table change | `data/balance_tables.json` |

After data changes, run `node scripts/validate-data.mjs`. CI runs the same
cross-file validation on pull requests.

---

## Review Notes: Known Issues and Gaps

### 1 — Recoil decrease model is unvalidated *(open)*

The decay formula uses parameterized exponents from sym.gg fields. The directional behavior
(returns toward zero) is consistent with a Reddit comment from a sym.gg developer, but the
exact curve shape has not been tested against current in-game footage.

**Suggested fix:** Document a validation pass per weapon — tested weapon, fire rate, frame
rate, measured return curve, and source used.

---

### 2 — Provenance not encoded in data objects *(open)*

The distinction between source-backed, assumed, and screenshot-derived values is described
in this document but not tagged in the data files themselves. Attachment entries use
`assumed: true` for one category, but source/date metadata is absent elsewhere.

**Suggested fix:** Add lightweight provenance metadata (`source`, `sourceDate`,
`derivedFromScreenshot`) where practical, especially on calibrated attachment effect values.

---

### 3 — Bloom cone is a visualization envelope, not a game primitive *(informational)*

The cone/outline view hugs the modeled per-shot bloom circles. It is not a convex hull,
not a guarantee of uniform fill inside the envelope, and not a direct game mechanic.

Chart notes already say "bloom envelope across modeled shots" but this distinction should
stay prominent in any future user-facing documentation.

---

### 4 — `noEffect` attachments are present but unmodeled *(informational)*

Several options carry `noEffect: true` — they appear in dropdowns, add point cost, but
change no stat. Current signal is grey styling. Users who miss this may assume all
point-cost attachments are modeled.

Examples: Compact Handstop, Long-Range ammo, Frangible ammo, several lasers/lights,
Mag Flare, Match Trigger, ADS Bolt.

**Suggested follow-up:** Add a tooltip or legend if user confusion becomes a pattern.

---

### 5 — Assumed attachment stats need revisiting when datamined data arrives *(open)*

The seven `assumed: true` attachments listed in the sidebar footnote are pending
datamined confirmation. Values may be inaccurate.

**Action:** When updated data is available, clear `assumed: true` and update the
effect fields and this document.

---

### 6 — Chart tooltip callback can throw when only comparison weapon is selected *(fixed)*

Fixed in `renderChart()` by tagging each dataset with its source weapon metadata
and reading that metadata inside tooltip callbacks instead of assuming
dataset-index-to-slot correspondence.

---

### 7 — No guard if Chart.js CDN fails to load *(fixed)*

`index.html` now loads Chart.js from `vendor/chart.umd.min.js` and shows a clear
fallback message if the local bundle fails to initialize.

---

### 8 — No automated tests or data validation *(partially fixed)*

`scripts/validate-data.mjs` now checks the highest-risk data drift cases:
cross-file weapon and attachment IDs, `WEAPON_ATTS` barrel defaults, magazine
defaults, required fields for supported weapons, known classes, and the current
sidearm hiding rule. CI runs the same script on pull requests.

Remaining test gaps:
- Attachment effect field completeness beyond neutral/default behavior
- Uniform-over-radius sampling correctness
- Recoil control compensation math
- Bloom cone/envelope rendering consistency

---

## Maintenance Recommendations

### Near-Term

1. **Add Playwright visual smoke coverage.** Capture desktop, tablet, and mobile flows for the main app plus the two preview pages. This protects the responsive loadout overlay, Chart.js rendering, and recoil canvas from quiet regressions.
2. **Validate recoil decay (note 1).** Pick one auto weapon, record post-burst recovery at known RPM, compare to model output, and document the measured curve.
3. **Verify assumed attachment stats (note 5).** Block for the next reliable data drop; clear `assumed: true` as values become source-backed.
4. **Improve `noEffect` attachment signaling (note 4).** Add a compact tooltip or legend only if user confusion shows up in testing.

### Longer-Term

1. **Further split `ui/app.js` only when needed.** Good next boundaries would be `ui/chart.js`, `ui/recoil.js`, and `ui/render.js`, but the current extraction already removed the worst `index.html` pressure.
2. **Expand validation if data churn increases.** JSON Schema or stricter effect-field checks would be useful once the data format stabilizes further.
3. **Add provenance metadata to data files (note 2).** Source/date tags become more valuable as assumed, screenshot-derived, and datamined values coexist.
4. **Track performance baselines.** The current caches reduce obvious rework, but larger dashboards or multi-state comparisons should measure render cost explicitly.
5. **Formalize visual regression screenshots.** Once Playwright smoke coverage exists, promote key screenshots into a baseline workflow before large recoil, bloom, or layout changes.
