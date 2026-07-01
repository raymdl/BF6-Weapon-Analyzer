# BF6 Weapon Analyzer — Code Documentation

This document describes the current structure and behavior of the BF6 Weapon Analyzer project.
`index.html` is the primary app. `preview_bloom.html` and `preview_distance.html` are companion
tools used to test recoil/bloom visualization ideas and validate distance projections.

---

## High-Level Architecture

The site is a self-contained set of static files served via a local Python HTTP server
(`python -m http.server 5174`) and deployed on GitHub Pages. There is no build step, but pages
use `<script type="module">` so they require HTTP — opening the HTML files directly as `file://`
URLs will fail.

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
    weapons.json            ← All 58 weapon base stats (one object per weapon)
    attachments.json        ← Attachment catalogs + per-weapon availability
    ammo.json               ← Ammo types + per-weapon availability
    recoil_decay.json       ← Per-weapon ADS recoil decay table
    balance_tables.json     ← Tier tables (ADS speed, sprint recovery, spread, etc.)

  scripts/
    validate-data.mjs       ← Cross-file data validation used locally and by CI

  v1.2.3.0/                 ← Frozen archive of the v1.2.3.0 site (do not edit)
  v1.3.2.0/                 ← Frozen archive of the v1.3.2.0 site (do not edit)

  CODE_DOCUMENTATION.md     ← Architecture and behavior reference
  MAINTENANCE.md            ← Season/patch update checklist (data edits)
  TODO.md                   ← Open data gaps and follow-ups
  .gitignore
```

Local-only helper files are intentionally ignored and should not be committed:
`serve.bat`, `Open - *.url`, `.claude/`, `memory/`, and `outputs/`.

### Data Flow

1. Page loads → `<script type="module">` fetches all five JSON files via `Promise.all`.
   Each fetch goes through a `fetchJson` helper that rejects on non-OK responses; any
   failure renders a full-screen "Failed to load weapon data" message (mirroring the
   Chart.js load-failure fallback in `index.html`).
2. Data files are fetched without cache-busting query strings — GitHub Pages serves
   proper `ETag`/`Last-Modified` headers, so browsers revalidate and pick up new data
   automatically. The header's "Updated …" date is derived at runtime from the
   `Last-Modified` header on `weapons.json` (set by Pages from the file's last commit).
3. Data is pushed into `sim/core.js` via `setSimContext()` and `sim/applyAttachments.js`
   via `setAttachmentContext()`.
4. `sim/loadout.js` provides shared attachment defaults, point totals, assumed-stat
   detection, and sidebar rendering helpers.
5. User selects a weapon and attachments → `applyAttachments(rawWeapon, selectedAtts)`
   returns a derived weapon object.
6. All renderers (overview cards, chart, BTK table, recoil canvas) consume the derived object.

All three pages share the same `sim/` modules and the same `data/` JSON files. **One data edit applies to all pages.**

---

## Module Reference: `sim/`

### `sim/core.js`

Pure simulation math. Previously copy-pasted across all three pages; now imported by all of them.

**Context setter:**

```js
setSimContext({
  aimState,              // 'ads' | 'hip'
  stanceState,           // 'stand' | 'move'
  RECOIL_DEC,            // per-weapon recoil decay factor (from recoil_decay.json)
  RECOIL_DEC_EXP,        // per-weapon decay exponent
  RECOIL_DEC_TEXP,       // per-weapon decay time exponent
  compensationFn,        // () => number — page provides current compensation % (0–125)
  platformRecoilMultFn,  // () => number — 1 for PC, CONSOLE_RECOIL_MULT (0.89) for console
});
```

Call `setSimContext` once after JSON loads, then again whenever `aimState`/`stanceState` changes.

**Exports:**

| Export | Description |
|---|---|
| `setSimContext(updates)` | Merges updates into the module-level context |
| `mulberry32(seed)` | Returns a Mulberry32 PRNG closure emitting floats in `[0, 1)` |
| `whash(str)` | Stable 32-bit string hash (used to seed per-weapon RNG) |
| `uniformDev(rng, val)` | Uniform sample across the full range `[-val, +val]` |
| `applyRecoilDecay(r, decFactor, decExp, timeExp, interShotTime, decOffset)` | Steps recoil toward zero over one inter-shot interval |
| `recoilGroup(w)` | Returns `recoil.ads` or `recoil.hip` based on current aim state (legacy flat-field fallback) |
| `baseRecoilGroup(w)` | Always returns the ADS group — the attachment-scaling baseline |
| `recoilAmount(group)` | Effective amount from a group: `amount × amountMult^amountExp` |
| `recoilVariation(group)` | Effective variation from a group: `dirVar × dirVarMult^dirVarExp` |
| `selectedRecoilAmountFor(w)` | Recoil amount for current aim state, with attachment + platform scaling |
| `selectedRecoilAmountBeforePlatformFor(w)` | Same but without the platform multiplier (used by tooltips) |
| `selectedRecoilVariationFor(w)` | Recoil variation for current aim state, with attachment scaling |
| `spreadBounds(w)` | `[min, max]` spread for current aim+stance state |
| `spreadDynamics(w)` | Spread increase/decay model for current aim state |
| `selectedSpreadIncFor(w)` | Spread increase per shot for current aim state |
| `spreadRecoveries(w)` | `{ firing, notFiring }` recovery params (coef/exp/offset) with decay boosts applied |
| `applySpreadRecovery(spread, seconds, recovery, baseline, sMax, dt?)` | Steps spread recovery over a time interval |
| `simulateBloom(w, shots)` | Returns per-shot pre-fire spread array in degrees |
| `shotIntervalAfter(w, shotIndex)` | Seconds between shot N and N+1, burst-cadence aware |
| `isBurstGapAfter(w, shotIndex)` | True when the next interval is a post-burst pause |
| `genRecoilPts(w, seed, shots)` | Returns deterministic recoil point array `[{x, y}, …]` |

**`genRecoilPts(w, seed = 0, shots = 20)` argument order:** seed before shots.

**Attachment scaling convention:** `selectedRecoilAmountFor` / `selectedRecoilVariationFor`
expect an *attachment-applied* weapon. They derive the attachment multiplier as
`w.recoilV / effectiveBase` (resp. `w.recoilVar / effectiveBase`), where the effective base is
computed from the ADS recoil group (`amount × amountMult^amountExp` /
`dirVar × dirVarMult^dirVarExp`). This means `applyAttachments` must output **effective**
values in `recoilV`/`recoilVar` — including any exponent baked into the weapon itself —
or the baked exponent silently cancels out (this was a real bug for the M16A4, fixed
June 2026; see the Recoil Variation section below).

---

### `sim/applyAttachments.js`

Applies all attachment effects to a raw weapon object. Replaces the two separate inline
`applyAttachments` functions that previously lived in `index.html` and `preview_distance.html`.

**Context setter:**

```js
setAttachmentContext({
  MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS,
  WEAPON_MAG, WEAPON_ERGO,
  AMMO,
  RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
  BASE_HS_MULT, HP_HS_HIGH,
  MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
  ADS_SPD_TIERS, SPRINT_REC_TIERS, PRIMARY_SPRINT_REC_TIERS,
  SIDEARM_SPRINT_REC_TIERS, DEPLOY_TIME_TIERS, ADS_MOVE_TIERS,
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
| `_adsRecoilDecayMult` | ADS recoil decay multiplier from muzzle (1 = unchanged) |
| `_hipSpreadDecayBoost` | Extra hipfire bloom decay from light |
| `_worldSpot`, `_minimapSpot` | Firing exposure distances |
| `_movingAdsSpreadTierMod` | Total moving ADS accuracy tier shift |
| `_movingAdsMinSpreadDeg` | Final moving ADS minimum spread in degrees |
| `_adsTimeTierMod` | Combined grip + barrel ADS tier shift |
| `_adsTimeMs` | Final ADS time in ms (from balance table, `null` if no mag data) |
| `_sprintRecoveryMs` | Final sprint-to-fire recovery in ms (from sprint recovery tiers) |
| `_adsMoveSpeedMult` | Final ADS move speed multiplier |
| `_deployTimeMs` | Final deploy time in ms (from `DEPLOY_TIME_TIERS`) |
| `_hipSpreadTierMod` | Total hipfire spread tier shift |
| `_weaponSway` | Weapon sway delta (muzzle + iron-sight bonus) |
| `_visualRecoil` | Visual recoil modifier from ergo (negative = reduced, `0` = unchanged) |
| `_laserVisible` | Whether the selected laser is enemy-visible (`null` when no laser) |
| `_hsMult` | Final headshot multiplier |

**Combined-slot routing (`laserLightCombined` / `laserGripLightCombined`):**

Some weapons merge multiple physical slots into the Laser dropdown to match their
in-game UI. Two flags on `WEAPON_ATTS[id]` control this:

| Flag | Weapons | Behavior |
|---|---|---|
| `laserLightCombined` | Most sidearms, GRT-BC, SL9 | Light options appear in the Laser dropdown; the Light slot is disabled |
| `laserGripLightCombined` | VZ.61 | Grip, laser, and light options all appear in the Laser dropdown; Grip slot is disabled |

`applyAttachments` detects which physical category a selected laser-slot ID belongs to
by checking `GRIPS_BY_ID` and `LIGHTS_BY_ID` maps at runtime, then routes it to the
correct effect lookup (grip effects, light effects, or laser effects). This means the
combined-slot routing requires no separate data field beyond the flag — the attachment ID
itself determines which effect path is used.

**`applyAttachments` output — modified base fields:**

| Field | Modification |
|---|---|
| `recoilV` | ADS recoil amount tier formula: `w.recoilV × RECOIL_MULT[id]^(sum of adsRecoilTierMod)` |
| `recoilVar` | ADS variation tier ladder: `dirVar × dirVarMult^(dirVarExp + sum of adsRecoilVariationTierMod)` — always the *effective* value, including the weapon's baked-in exponent |
| `recoilIncAds` | Scaled by barrel `adsSpreadIncMult` |
| `bulletVel` | Scaled by barrel `velMult` |
| `spread` | Hip spread min shifted by tier if `hipSpreadTierMod ≠ 0` |
| `mag` | Replaced by selected magazine count |
| `tacRld` | Replaced by magazine reload or Mag Catch reload |
| `deployT` | Replaced by deploy tier lookup when available |
| `fireMode` | Overridden to `'auto'` (`setsFireModeAuto`) or `'burst'` (`setsFireModeBurst`) by ergos |
| `burstRounds`, `burstRpm`, `burstBurstsPerMinute` | Overridden by burst ergos; cleared when `setsFireModeAuto` is active |
| `rpm` | Replaced by `burstRpm` while a burst fire mode is active |

---

### `sim/attachments.js`

Single source of truth for attachment slot ordering and UI metadata. All three pages import
`ATTACHMENT_SLOT_KEYS` and iterate it to build their attachment sidebars. **Adding a new slot
type = one entry here, all pages pick it up.**

```js
export const ATTACHMENT_SLOT_KEYS = [
  { key: 'muzzle', label: 'Muzzle', dataKey: 'MUZZLES', noWeaponText: 'None' },
  { key: 'barrel', label: 'Barrel', dataKey: 'BARRELS', noWeaponText: 'Basic Barrel', isBarrel: true },
  { key: 'laser',  label: 'Laser',  dataKey: 'LASERS',  noWeaponText: 'None' },
  { key: 'light',  label: 'Light',  dataKey: 'LIGHTS',  noWeaponText: 'None' },
  { key: 'sight',  label: 'Sight',  dataKey: 'SIGHTS',  noWeaponText: 'Iron Sights' },
  { key: 'grip',   label: 'Grip',   dataKey: 'GRIPS',   noWeaponText: 'None' },
];
```

`dataKey` is resolved against each page's own attachment data source. `isBarrel: true`
marks the slot that always has at least one option (no 'None' choice). Slots are always
rendered — when unavailable they appear disabled/greyed rather than hidden.

Ammo, Mag, and Ergo are not in this list; they are rendered separately by
`renderAttachmentSection` from their per-weapon maps (`WEAPON_AMMO`, `WEAPON_MAG`,
`WEAPON_ERGO`).

---

### `sim/loadout.js`

Shared loadout UI and accounting helpers used by all three pages. The index page remains
the golden source for behavior and styling; the preview pages call the same helpers with
their own DOM class names.

**Exports:**

| Export | Description |
|---|---|
| `blankAtts()` | Returns a fresh attachment-selection object with neutral defaults |
| `resetAttsForWeapon(atts, weapon, data)` | Resets selections in place to the weapon's canonical defaults (default barrel/ammo/mag) |
| `getAttPts(a)` | Point cost of one attachment object (`pts ?? 0`) |
| `computeAttPts(atts, weapon, data)` | Sums attachment points across sight, muzzle, barrel, grip, laser, light, ammo, mag, and ergo (combined-slot aware) |
| `hasSelectedAssumedAtt(atts, data)` | Detects selected attachments with assumed attachment or field-level modifier data |
| `attDisplayName(a)` | Resolves an attachment object to display text, including the `*` assumed-data marker |
| `updateAttTotal(containerId, atts, weapon, data)` | Refreshes the point-total readout, flagging totals over 100 |
| `renderAttachmentSection(config)` | Builds the full attachment sidebar (slot dropdowns + ammo/mag/ergo rows) |

The module caches attachment catalog lookup maps with a `WeakMap` keyed by the
data bundle passed by each page.

---

## Data Reference: `data/`

### `data/weapons.json`

Array of 58 weapon objects. The `cls` field drives the class filter buttons in the UI.
Current classes: `Assault Rifle` (10), `LMG` (10), `SMG` (9), `Carbine` (8), `Sidearm` (7),
`DMR` (5), `Sniper Rifle` (5), `Shotgun` (4). Sidearms display under a `Pistol` button in
the class filter (`CLASS_SHORT` maps `"Sidearm"` → `"Pistol"`).

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
| `recoilV` | number | **Effective** ADS recoil per shot (= `ADSRecoilAmount × ADSRecoilAmountMultiplier^ADSRecoilAmountMultiplierExponent`) |
| `recoilDir` | number | Recoil direction angle from vertical (degrees) |
| `recoilVar` | number | **Raw** ADS recoil direction variation (= `ADSRecoilDirectionVariation`); the effective value is derived from the `recoil.ads` group at runtime |
| `recoilIncAds` | number | ADS bloom increase per shot |
| `spreadMax` | number | Fallback maximum spread |
| `adsTime` | number | Estimated ADS time in ms (fallback; balance table tiers take precedence) |
| `fireMode` | string | `auto`, `semi`, `burst`, `bolt`, or `pump` |
| `burstRounds` | number | *(burst weapons only)* Rounds per burst trigger pull |
| `burstBurstsPerMinute` | number | *(burst weapons only)* Bursts per minute; used by recoil sim for inter-burst timing |

**Optional but important fields:**

| Field | Description |
|---|---|
| `deployT` | Deploy/holster time in seconds |
| `pellets` | Shotgun pellet count |
| `dmg` | Stepped damage breakpoints as `[{r, d}, ...]` |
| `recoil.ads` / `recoil.hip` | Full formula inputs per aim state (maps to sym.gg `ADSRecoil*` / `HIPRecoil*`) |
| `spread.adsStand`, `.adsMove`, `.hipStand`, `.hipMove` | `[min, max]` spread in degrees |
| `spreadDyn.ads` / `spreadDyn.hip` | Spread increase/decay model per aim state (sym.gg `ADSBaseSpread*` / `HIPBaseSpread*`) |

**Recoil group fields** (`recoil.ads` / `recoil.hip`): `dir`, `amount`, `amountMult`,
`amountExp`, `dirVar`, `dirVarMult`, `dirVarExp`, `decFactor`, `decExp`, `decTimeExp`,
`decOffset`. The `*Mult`/`*Exp` pairs implement the in-game tier ladders (see the
Recoil Variation section). Every weapon currently has a `recoil.ads` group.

---

### `data/attachments.json`

Keys: `SIGHTS`, `MUZZLES`, `BARRELS`, `GRIPS`, `LASERS`, `LIGHTS`, `ERGOS`,
`WEAPON_ATTS`, `WEAPON_ERGO`, `WEAPON_MAG`.

**Attachment effect fields** (full reference in `MAINTENANCE.md`):

| Field | Neutral | Description |
|---|---|---|
| `adsRecoilTierMod` | `0` | Shifts ADS recoil amount tier |
| `adsRecoilVariationTierMod` | `0` | Shifts ADS recoil variation tier (uses per-weapon `dirVarMult`) |
| `adsRecoilDecayMult` | `1` | Multiplies ADS recoil decay factor (muzzle) |
| `hipSpreadTierMod` | `0` | Shifts hipfire min spread tier |
| `adsSpreadIncMult` | `1` | Multiplies ADS bloom per shot |
| `adsSpreadDecayBoost` | `0` | Extra ADS bloom decay coefficient |
| `movingAdsSpreadTierMod` | `0` | Shifts moving ADS min spread tier |
| `adsTimeTierMod` | `0` | Shifts ADS speed tier |
| `adsMoveSpeedTierShift` | `0` | Shifts ADS move speed tier |
| `velMult` | `1` | Multiplies bullet velocity |
| `sway` | `0` | Adds to weapon sway |
| `worldSpot` | `54` | World spotting distance override (muzzle only) |
| `minimapSpot` | `150` | Minimap spotting distance override (muzzle only) |

**Per-weapon maps:**

- `WEAPON_ATTS[id]` — allowed muzzle/barrel/laser/light/grip IDs, plus `barrelDef` and
  the combined-slot flags. An explicit empty array (e.g. USG-90 `grip: []`) means the
  weapon deliberately takes nothing in that slot; an *absent* key fails validation.
- `WEAPON_MAG[id]` — magazine variants with tier shift overrides, plus base tier indices
  (`defAds`, `defSpr`, `defAms`) and `sprintRecoveryTierTable` (`'sidearm'` to use the
  sidearm sprint table)
- `WEAPON_ERGO[id]` — ergonomics availability (`avail`) and Mag Catch reload times
  (`magCatchRld.reg` / `.fast`)

---

### `data/ammo.json`

Keys: `AMMO` (catalog array), `WEAPON_AMMO` (per-weapon availability + point costs +
default via `def`).

`AMMO` entries use `hsMult: null` to inherit the weapon's default, `hsMult: 'hp'` for the
hollow-point behavior (1.5× or 1.75× depending on `HP_HS_HIGH`), or a numeric override.
Ammo can also carry `adsRecoilTierMod` and `adsMoveSpeedTierShift`.

---

### `data/recoil_decay.json`

Three maps keyed by weapon ID (legacy fallbacks — per-weapon `recoil.ads` group values
take precedence when present):

| Map | Description |
|---|---|
| `RECOIL_DEC` | Decay factor (`ADSRecoilDecreaseFactor`) |
| `RECOIL_DEC_TEXP` | Decay time exponent (`ADSRecoilDecreaseTimeExponent`) |
| `RECOIL_DEC_EXP` | Decay exponent override when ≠ 1 (bolt-actions and some shotguns use 0.6) |

Decay formula (per 1/60 s frame, applied independently to each axis):

```
Δr = (|r|^decExp + decOffset) × decFactor × dt × t^decTimeExp
```

where `t` is time elapsed since the shot. Implemented in `sim/core.js → applyRecoilDecay`.

---

### `data/balance_tables.json`

Tier lookup tables used by `applyAttachments`:

| Key | Description |
|---|---|
| `ADS_SPD_TIERS` | ADS time in ms per tier |
| `SPRINT_REC_TIERS` | Legacy sprint-to-fire recovery table (fallback) |
| `PRIMARY_SPRINT_REC_TIERS` | Sprint-to-fire recovery in ms for primary weapons |
| `SIDEARM_SPRINT_REC_TIERS` | Sprint-to-fire recovery in ms for sidearms |
| `DEPLOY_TIME_TIERS` | Deploy time in ms per tier (placeholder universal scale) |
| `ADS_MOVE_TIERS` | ADS move speed multiplier per tier |
| `MOVING_ACC_TIERS` | Moving ADS min spread in degrees per tier |
| `DEFAULT_MOV_TIER` | Default moving-ADS tier index |
| `RECOIL_MULT` | Per-weapon ADS recoil amount tier multiplier |
| `HIP_SPREAD_TIERS` | Hip spread values by class and tier |
| `HIP_SPREAD_BASE_IDX` | Base tier indices for hip spread keys |
| `HIP_CLS` | Per-weapon hip spread class |
| `BASE_HS_MULT` | Per-weapon base headshot multiplier (default 1.34) |
| `HP_HS_HIGH` | Weapon IDs that use 1.75× HP headshot multiplier |

Tier indices are clamped to each table's actual length in `applyAttachments`, so
resizing a table is safe.

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
BTK = ceil(100 / dmg)        // body shots; pellets multiply dmg for shotguns
TTK = Σ shotIntervalAfter(w, i) for i in 1..btk-1, in ms   // null when rpm is null
```

TTK is burst-cadence aware: `shotIntervalAfter` returns the normal inter-shot interval
within a burst and the longer post-burst pause between bursts, so burst weapons get a
realistic stepped TTK rather than a naive `(btk-1)/rpm`.

`getBTKWithHS(w, range, headshots)` allocates headshots first, then finishes with body shots.
Uses `w._hsMult` (from `applyAttachments`) with fallback to 1.34.

### Recoil Amount and Variation Tier Ladders

Both ADS recoil stats use the same in-game tier system (confirmed against in-game
advanced-stat menus with SheetOnMyFace, June 2026):

```
effective amount    = ADSRecoilAmount × ADSRecoilAmountMultiplier ^ (baked exponent + tier mods)
effective variation = ADSRecoilDirectionVariation × ADSRecoilDirectionVariationMultiplier
                      ^ (baked exponent + tier mods)
```

- The multiplier and baked exponent are **per-weapon** (stored in the `recoil.ads` group
  as `amountMult`/`amountExp` and `dirVarMult`/`dirVarExp`).
- Attachments contribute integer tier mods (`adsRecoilTierMod`,
  `adsRecoilVariationTierMod`). The Linear Comp (in-game "Convertor") and the burst
  ergos are worth 3 variation tiers each.
- The M16A4 ships with `dirVarExp: 3` baked in (46.4° raw → 35.8° effective). In-game
  screenshots confirmed this exponent is **innate to the weapon, not tied to burst
  mode** — equipping the Full Auto ergo does not remove it.
- Validated cases: M16A4 base 35.8°, +Convertor 27.6°, ±Full Auto unchanged;
  M433 base 50.9°, +Convertor 39.5°. All match the model to 0.1°.

Note: `RECOIL_MULT` in `balance_tables.json` (per-weapon, ~0.94 default) is the amount
ladder multiplier used by `applyAttachments`; the variation ladder uses `dirVarMult`
from the weapon's recoil group directly.

---

## Recoil / Bloom Model

### Sources and Provenance

- **sym.gg** — all raw weapon and attachment stats; field naming conventions
- **Dr. Smiley Henry** — bloom/spread decay model reference
- **TheXclusiveAce** — in-game spray-pattern sanity checks
- **SORROW** — additional weapon data reference
- **SheetOnMyFace** — data validation; recoil variation tier-system discovery

Items sourced directly from data: damage breakpoints, RPM, mag, reload timings, bullet velocity,
recoil formula inputs, spread min/max, spread increase/decay inputs, attachment costs/effects.

Items that are visually calibrated: recoil chart scale defaults, scatter run count,
bloom bubble round schedule defaults (`1, 2, 3, 5, 8, 13, 20`), bloom cone rendering shape,
distance wall panel sizes and human target overlay.

### Recoil Path (`genRecoilPts`)

For each shot:
1. Select ADS or hipfire recoil inputs based on `aimState`.
2. Compute per-shot recoil amount, including attachment tier and platform scaling.
3. Sample direction variation uniformly across the full `[-recoilVar, +recoilVar]` range.
4. Add the horizontal and vertical delta to the running aim point.
5. Subtract the compensation vector (recoil control), scaled by the compensation %.
6. Apply inter-shot recoil decay toward zero before the next shot
   (`applyRecoilDecay`, using the weapon group's decay parameters and the
   muzzle's `_adsRecoilDecayMult` when aiming).

### Bloom / Spread (`simulateBloom`)

- Starts at the stance/aim spread minimum (`spreadBounds`).
- Adds `spreadInc` per shot.
- Between shots, applies recovery using `spreadRecoveries(w)` — separate firing and
  not-firing parameter sets; post-burst gaps split the interval into a firing segment
  and a not-firing segment.
- Clamps to `[baseline, spreadMax]` for the current state.
- Shot positions are sampled **uniform over radius** (not uniform over area):
  `r = spreadRadius × rng()` — this matches the franchise convention and makes shot
  distributions visually center-weighted (half the shots land in the inner 25% of the area).

### Recoil Control

- Off: compensation = 0, controls disabled.
- On: compensation % (default 85%, max 125%) subtracts the expected recoil vector per shot.
  Variation and bloom remain fully active.

### Platform

The recoil panel has a PC/Console toggle. Console applies `CONSOLE_RECOIL_MULT` (0.89)
to the recoil amount via `platformRecoilMultFn` in the sim context.

### Distance Projection (`preview_distance.html`)

`metersOnWall = Math.tan(radians) × distanceMeters`

Same angular model as the main app, different display units. Not a projectile simulator —
does not model bullet travel time, drag, sight height, or zeroing.

---

## Page Reference

### `index.html`

Primary app:

- **`index.html`**: metadata, local Chart.js include (with load-failure fallback), CSS,
  static HTML shell, and the `ui/app.js` module entry point.
- **`ui/app.js`**: JSON fetch (`Promise.all` with error fallback), context setup, app
  state, sidebar/loadout rendering, overview cards, chart rendering, recoil/bloom canvas,
  attachment effect chips, and event wiring.

**Class filter buttons** (`CLASSES` array): `Assault Rifle`, `Carbine`, `SMG`, `LMG`,
`DMR`, `Sniper Rifle`, `Shotgun`, `Sidearm`. Button labels come from `CLASS_SHORT`:
`AR`, `Carb`, `SMG`, `LMG`, `DMR`, `Sniper`, `SG`, `Pistol`.

**Attachment state shape:**
```js
{ sight: 'iron', muzzle: 'none', barrel: '<default>', grip: 'none',
  laser: 'none', light: 'none', ammo: 'standard', mag: null, ergo: 'none' }
```

**App state** is consolidated in `ui/app.js` as a single `state` object with three
sub-objects: `state.slots[0/1]` (class, weapon, atts per loadout), `state.chart`
(mode, btkHS, showAds), and `state.recoil` (aim, stance, layers, platform, control,
compensation, seed, scale, pan).

**Chart tooltips** use a single custom positioner (`smartFloat`) that floats the tooltip
near the weapon lines and ignores dashed datasets (BTK baselines, damage thresholds).

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

1. `<script type="module">` fetches all JSON files via `Promise.all` (`fetchJson` helper);
   a failure shows a full-screen error message and aborts.
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

Selecting a weapon resets to the canonical defaults with `resetAttsForWeapon()`.

### Attachment Point Counter (`computeAttPts`)

Sums points across sight, muzzle, barrel, grip, laser, light, ammo, magazine, and ergo.
Over-100 loadouts are marked with the `.over` class.

Attachment assumptions are tagged either with `assumed: true` for a whole attachment
entry or with `assumedFields` for specific modifier fields. Both forms trigger the
sidebar footnote when selected.

---

## Performance Notes

The app is static and render-on-change, but the busiest paths avoid avoidable rework:

- Attachment catalogs are indexed once in `sim/applyAttachments.js`.
- Shared loadout helpers cache their catalog indexes per page data bundle.
- Data JSON is fetched without cache-busting, so repeat visits revalidate via
  `ETag`/`Last-Modified` instead of re-downloading ~310 KB.
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
cross-file validation on every push and pull request.

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
in this document but not fully tagged in the data files themselves. Attachment entries can
use `assumed: true` or field-level `assumedFields`, but source/date metadata is absent
elsewhere.

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

### 5 — Assumed attachment stats need revisiting when datamined data arrives *(open, partially validated)*

Attachment effects marked with `assumed: true` or `assumedFields` are pending datamined
confirmation. The Linear Comp's recoil effects (−1 amount tier, +3 variation tiers) were
validated against in-game advanced stats in June 2026; its remaining fields and the other
assumed attachments are still unconfirmed.

**Action:** When updated data is available, clear `assumed: true` or the relevant
`assumedFields` entries, then update the effect fields and this document.

---

### 6 — M16A4/VZ.61 `amountExp: -2` anomaly *(open question)*

Among automatic-fire weapons, `recoil.ads.amountExp` is normally `-3`. The M16A4 and
VZ.61 are the only two automatics at `-2`. (Non-automatic weapons — bolt-action snipers
and semi-auto sidearms — use `0`.)

These two don't share a fire mode: the M16A4 is burst-by-default while the VZ.61 is
full-auto, so the `-2` is **not** explained by burst fire. In-game screenshots also
showed the Full Auto ergo does not move the M16A4's *variation* exponent. Whatever drives
`-2` for exactly these two weapons is unknown. Display rounding in the in-game menu
(1 decimal) makes the amount ladder hard to verify from screenshots alone.

---

### 7 — No automated tests beyond data validation *(partially addressed)*

`scripts/validate-data.mjs` checks the highest-risk data drift cases:
cross-file weapon and attachment IDs, `WEAPON_ATTS` barrel defaults, magazine and ammo
defaults, required fields for supported weapons, known classes, and per-slot attachment
coverage for non-sidearm weapons (an explicit `[]` is allowed as "deliberately no
options"; a missing slot key fails). CI runs the same script on every push.

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
3. **Verify remaining assumed attachment stats (note 5).** Block for the next reliable data drop; clear `assumed: true` or field-level `assumedFields` as values become source-backed.
4. **Improve `noEffect` attachment signaling (note 4).** Add a compact tooltip or legend only if user confusion shows up in testing.

### Longer-Term

1. **Further split `ui/app.js` only when needed.** Good next boundaries would be `ui/chart.js`, `ui/recoil.js`, and `ui/render.js`, but the current extraction already removed the worst `index.html` pressure.
2. **Expand validation if data churn increases.** JSON Schema or stricter effect-field checks would be useful once the data format stabilizes further.
3. **Add provenance metadata to data files (note 2).** Source/date tags become more valuable as assumed, screenshot-derived, and datamined values coexist.
4. **Track performance baselines.** The current caches reduce obvious rework, but larger dashboards or multi-state comparisons should measure render cost explicitly.
5. **Formalize visual regression screenshots.** Once Playwright smoke coverage exists, promote key screenshots into a baseline workflow before large recoil, bloom, or layout changes.
