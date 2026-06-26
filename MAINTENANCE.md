# BF6 Weapon Analyzer — Maintenance Guide

Quick reference for updating the tool when the game patches.

---

## File Map

```
data/
  weapons.json          ← All weapon base stats (one object per weapon)
  attachments.json      ← All attachments + per-weapon availability/costs
  ammo.json             ← Ammo types + per-weapon availability/costs
  recoil_decay.json     ← Recoil recovery tables (RECOIL_DEC, _EXP, _TEXP)
  balance_tables.json   ← Tier tables (ADS speed, sprint recovery, spread, etc.)

sim/
  core.js               ← Shared simulation math (recoil, bloom, spread)
  applyAttachments.js   ← Applies attachment effects to a weapon object
  loadout.js            ← Shared loadout defaults, point totals, and attachment UI
  attachments.js        ← Ordered list of attachment slot types (UI metadata)

scripts/
  validate-data.mjs     ← Cross-file data integrity checks used by CI
```

All three pages (`index.html`, `preview_bloom.html`, `preview_distance.html`)
load from these files. **One edit → all pages updated.**

All eight weapon classes are fully supported in the UI, including `Sidearm` (displayed
as `Pistol` in the class filter). The `season-2/` directory is a frozen archive of the
previous season's site — never edit it during normal maintenance.

---

## Season / Patch Checklist

### New Weapon

1. Add entry to `data/weapons.json`
   - Copy the shape from an existing weapon of the same class
   - Required fields: `id`, `name`, `cls`, `cal`, `rpm`, `mag`, `tacRld`,
     `emptyRld`, `bulletVel`, `recoilV`, `recoilDir`, `recoilVar`,
     `recoilIncAds`, `spreadMax`, `adsTime`, `fireMode`
   - For burst weapons: also add `burstRounds` (rounds per trigger pull) and
     `burstBurstsPerMinute` (burst cadence; `rpm` stays as the average full-auto
     equivalent used for TTK; the burst sim uses `burstBurstsPerMinute`)
   - Strongly recommended: `recoil.ads` (and `.hip`) groups with the full sym.gg
     formula inputs — `amount`/`amountMult`/`amountExp`,
     `dirVar`/`dirVarMult`/`dirVarExp`, and decay fields. The recoil **variation**
     tier ladder reads `dirVarMult`/`dirVarExp` from this group; without it,
     variation tier attachments (Convertor, burst ergos) have no effect on the
     weapon. Every current weapon has a `recoil.ads` group.
   - Also important: `spread` (per-stance min/max), `spreadDyn` (bloom dynamics),
     `dmg` (range dropoff array)
   - Conventions: top-level `recoilV` is the **effective** value
     (`amount × amountMult^amountExp`); top-level `recoilVar` is the **raw**
     `ADSRecoilDirectionVariation` — the effective value is derived at runtime
2. Add entry to `data/attachments.json` → `WEAPON_ATTS`
   - Keys: `muzzle`, `barrel`, `barrelDef`, `laser`, `light`, `grip` (arrays of IDs)
   - Every slot key must be present for non-sidearm weapons (CI enforces this).
     Use an explicit empty array (e.g. `"grip": []` on the USG-90) when the weapon
     deliberately takes nothing in a slot
   - For weapons that merge light options into the Laser dropdown: add
     `laserLightCombined: true`
   - For the VZ.61 (grip+laser+light all in Laser dropdown): add
     `laserGripLightCombined: true`
3. Add magazine data to `data/attachments.json` → `WEAPON_MAG`
   - **Required per weapon**: `defAds`, `defSpr`, `defAms` (base tier indices), `def` (default mag ID),
     and a `mags` object with every available magazine
   - **Per magazine**: `name`, `pts`, `mag` (capacity), `tacRld` (ms), `adsTimeTierShift`,
     `sprintRecoveryTierShift`, `adsMoveSpeedTierShift`
   - Sidearms: set `sprintRecoveryTierTable: "sidearm"` to use `SIDEARM_SPRINT_REC_TIERS`
   - **Deriving `defSpr`**: look up the weapon's `UnDeployTime` from sym.gg, convert to ms
     (e.g. 0.233334 → 233 ms), find its tier in the sprint recovery table (1-indexed), then
     subtract 1 for the universal in-game draw speed adjustment: `defSpr = tier - 1`. Verify
     by confirming that the default magazine's displayed draw speed matches the table value.
   - Capture all magazine screenshots in-game (one per mag, with Basic barrel + Iron Sights)
     so tier shifts can be back-calculated from the displayed ADS time, sprint recovery, and
     ADS move speed multiplier values. Use `ADS_SPD_TIERS`, the sprint recovery tables, and
     `ADS_MOVE_TIERS` in `data/balance_tables.json` to map display values to tier indices.
   - Verify `defAds` by confirming the displayed ADS time on the default mag with a known
     barrel (e.g. Basic barrel adds `adsTimeTierMod: +1`)
4. Add ammo data to `data/ammo.json` → `WEAPON_AMMO` (if non-standard)
5. Add ergo data to `data/attachments.json` → `WEAPON_ERGO` (if applicable)
6. Add recoil decay values to `data/recoil_decay.json`
   - `RECOIL_DEC`, `RECOIL_DEC_EXP`, `RECOIL_DEC_TEXP` (keyed by weapon id)
7. Add hip spread class to `data/balance_tables.json` → `HIP_CLS`
8. Add headshot multiplier to `data/balance_tables.json` → `BASE_HS_MULT`
   (only if it differs from the default 1.34)

### Weapon Stat Changes (recoil, spread, damage, ADS time, etc.)

Edit the relevant weapon object in `data/weapons.json`.

- **Recoil per shot**: `recoilV` (effective) and `recoil.ads.amount` + multiplier/exponent
- **Recoil direction**: `recoilDir` and/or `recoil.ads.dir`
- **Recoil variation**: `recoilVar` (raw) and `recoil.ads.dirVar`; if the patch changes
  the weapon's tier multiplier or baked exponent, update `recoil.ads.dirVarMult` /
  `dirVarExp` — the app computes the effective value from these
- **Recoil decay**: `data/recoil_decay.json` → `RECOIL_DEC[weaponId]` etc., or the
  decay fields in the weapon's `recoil.ads` group
- **Bloom per shot**: `recoilIncAds` (ADS) or `spreadDyn.hip.inc` (hip)
- **Spread min/max**: `spread.adsStand`, `spread.adsMove`, `spread.hipStand`, `spread.hipMove`
- **Damage dropoff**: `dmg` array — `[{r: range_m, d: damage}, ...]`
- **Fire rate**: `rpm`
- **ADS time**: `adsTime` (base ms); tier offsets live in `data/attachments.json`

### New Attachment (new muzzle, barrel type, etc.)

1. Add the attachment object to the relevant array in `data/attachments.json`
   (`MUZZLES`, `BARRELS`, `GRIPS`, `LASERS`, `LIGHTS`, `ERGOS`)
   - Include the effect fields that apply (see reference table below); omit
     fields that don't apply — every reader defaults to the neutral value
2. Add the attachment ID to `WEAPON_ATTS[weaponId].muzzle/barrel/etc.` for
   every weapon that can equip it
3. If it's a **new slot type** (e.g. Underbarrel): add one entry to
   `sim/attachments.js` → `ATTACHMENT_SLOT_KEYS`, and add handling for its
   effects in `sim/applyAttachments.js`. If the slot should render in the
   shared sidebar or count toward attachment points, update `sim/loadout.js`
   as well.

### New Ammo Type

1. Add entry to `data/ammo.json` → `AMMO`
2. Add it to `data/ammo.json` → `WEAPON_AMMO[weaponId].ammo` for each
   applicable weapon, with its attachment point cost

### Balance Table Changes (ADS speed tiers, sprint recovery tiers, etc.)

Edit `data/balance_tables.json`:
- `ADS_SPD_TIERS` — ADS time in ms per tier
- `PRIMARY_SPRINT_REC_TIERS` / `SIDEARM_SPRINT_REC_TIERS` — sprint-to-fire recovery in ms
  (`SPRINT_REC_TIERS` is the legacy fallback)
- `DEPLOY_TIME_TIERS` — deploy time in ms per tier (placeholder scale)
- `ADS_MOVE_TIERS` — ADS move speed multiplier per tier
- `MOVING_ACC_TIERS` — moving ADS min spread in degrees per tier
- `RECOIL_MULT` — per-weapon ADS recoil **amount** tier multiplier
- `HIP_SPREAD_TIERS` — hip spread values by class and tier
- `BASE_HS_MULT` — per-weapon base headshot multiplier

Tier tables can be resized freely — `sim/applyAttachments.js` clamps indices to each
table's actual length.

---

## Attachment Effect Fields Reference

When adding a new attachment, these are the fields `sim/applyAttachments.js`
reads. Omit a field if the attachment has no effect there.

| Field | Type | Neutral | Effect |
|---|---|---|---|
| `adsRecoilTierMod` | int | `0` | Shifts ADS recoil **amount** tier (pos = less recoil, via per-weapon `RECOIL_MULT`) |
| `adsRecoilVariationTierMod` | int | `0` | Shifts ADS recoil **variation** tier (pos = less variation, via per-weapon `dirVarMult`) |
| `adsRecoilDecayMult` | float | `1` | *(muzzles)* Multiplies ADS recoil decay factor (>1 = recovers faster) |
| `hipSpreadTierMod` | int | `0` | Shifts hip spread tier (pos = worse) |
| `adsSpreadIncMult` | float | `1` | *(barrels)* Multiplies ADS bloom-per-shot (`recoilIncAds`) |
| `adsSpreadDecayBoost` | float | `0` | *(muzzles)* Extra ADS bloom decay coefficient |
| `movingAdsSpreadTierMod` | int | `0` | Shifts moving-ADS min spread tier |
| `adsTimeTierMod` | int | `0` | Shifts ADS speed tier (pos = faster) |
| `adsMoveSpeedTierShift` | int | `0` | Shifts ADS move speed tier |
| `velMult` | float | `1` | *(barrels)* Multiplies bullet velocity |
| `sway` | float | `0` | *(muzzles)* Adds to weapon sway |
| `worldSpot` | float | `54` | *(muzzles)* World spotting distance override |
| `minimapSpot` | float | `150` | *(muzzles)* Minimap spotting distance override |
| `hipSpreadDecayBoost` | float | `0` | *(lights)* Extra hipfire bloom decay coefficient |
| `laserVisible` | bool | — | *(lasers)* Whether the beam is visible to enemies |
| `sprintRecoveryTierShift` | int | `0` | *(grips, ergos)* Shifts sprint recovery tier |
| `visualRecoil` | int | `0` | *(ergos)* Visual recoil modifier; negative = reduced |
| `setsFireModeAuto` | bool | `false` | *(ergos)* Overrides burst weapon to full-auto fire mode |
| `setsFireModeBurst` | bool | `false` | *(ergos)* Overrides weapon to burst fire mode |
| `burstRounds` / `burstRpm` / `burstBurstsPerMinute` | num | — | *(burst ergos)* Burst cadence overrides applied while burst mode is active |
| `hsMult` | num \| `'hp'` \| `null` | `null` | *(ammo)* Headshot multiplier override; `'hp'` = 1.5×/1.75× per `HP_HS_HIGH` |
| `pts` | int | `0` | Attachment point cost |
| `noEffect` | bool | `false` | Renders greyed; present in-game but changes no modeled stat |
| `assumed` / `assumedFields` | bool / obj | — | Marks values pending datamined confirmation; triggers the sidebar footnote |

---

## In-Game Name Aliases

Some attachments have different names in-game vs. in our data IDs. Known mappings:

| Data ID / Name | In-Game Name |
|---|---|
| `ads_taclight` / Taclight - Aimed | "Taclight - Aimed" (also called "ADS Taclight") |
| `hip_taclight` / Taclight - Hipfire | "Taclight - Hipfire" (also called "HIP Taclight") |
| `linear_comp` / Linear Comp | "Convertor" (also appears as "Linear Compensator") |

---

## Where Simulation Logic Lives

If game mechanics change (not just data), edit the relevant module:

| Mechanic | File |
|---|---|
| Recoil path simulation | `sim/core.js` → `genRecoilPts` |
| Bloom/spread simulation | `sim/core.js` → `simulateBloom` |
| Spread recovery model | `sim/core.js` → `spreadRecoveries` / `applySpreadRecovery` |
| Recoil decay formula | `sim/core.js` → `applyRecoilDecay` |
| Attachment stat application | `sim/applyAttachments.js` → `applyAttachments` |
| Loadout defaults / point totals / sidebar UI | `sim/loadout.js` |
| Attachment slot order / new slot types | `sim/attachments.js` → `ATTACHMENT_SLOT_KEYS` |

---

## Recoil Variation Tier System (validated June 2026)

Recoil variation attachments work exactly like the recoil amount tier system —
**not** as flat percentage multipliers:

```
effective variation = dirVar × dirVarMult ^ (dirVarExp + Σ adsRecoilVariationTierMod)
```

- `dirVar`, `dirVarMult`, `dirVarExp` live in each weapon's `recoil.ads` group
  (sym.gg `ADSRecoilDirectionVariation[Multiplier[Exponent]]`)
- The Convertor (`linear_comp`) and the burst ergos are worth **+3 tiers** each
- The M16A4 ships with `dirVarExp: 3` baked in (46.4° raw → 35.8° effective).
  In-game testing confirmed this is **innate to the weapon** — equipping Full Auto
  does not remove it
- Validated against in-game advanced stats (with SheetOnMyFace): M16A4 35.8°/27.6°
  (base / +Convertor, unchanged by Full Auto), M433 50.9°/39.5°

Credit: tier-system discovery by SheetOnMyFace.

---

## Known Follow-Up Notes

- **Share links are catalog-index encoded (keep catalogs append-only):** the
  shareable loadout URL (in `ui/app.js`) encodes each attachment as its index in
  the catalog array (`SIGHTS`, `MUZZLES`, `BARRELS`, `GRIPS`, `LASERS`, `LIGHTS`,
  `AMMO`, `ERGOS`) and each mag as its index in the weapon's `mags`. To keep
  previously shared links resolving to the same attachment, **only append new
  entries to these arrays — never reorder or delete existing ones.** Weapon IDs
  are stored as strings, so reordering `weapons.json` is safe. The decoder also
  still understands the original dash-joined ID format (e.g.
  `a=iron-linear_comp-...`) so older links keep working.
- **Burst ergos:** `Burst Training` and `Burst Mode` both switch the weapon into
  burst fire and apply `adsRecoilVariationTierMod: 3` (3 tiers of the weapon's
  own `dirVarMult`). `Burst Mode` costs 10 points. Burst size and cadence are
  weapon-specific and should live on the weapon record. GRT-BC uses an internal
  `grtbc_burst_mode` entry with the same visible name because only GRT-BC's
  Burst Mode also applies a 1-tier ADS recoil amount improvement.
- **Burst timing fields:** leave `burstBurstsPerMinute` blank when a weapon has
  no extra post-burst delay in game. The sim treats that as normal shot cadence
  between every round, even while the weapon is labeled as burst fire.
- **GRT-BC Burst Mode timing:** modeled from the burst-mode recording as a
  3-round burst with `burstRpm: 830` and 33 ms of extra post-burst delay. This
  yields `burstBurstsPerMinute: 240.12729639809058` and an effective sustained
  fire rate of about 720 RPM while Burst Mode is selected.
- **`amountExp` anomaly (open question):** automatic-fire weapons normally have
  `recoil.ads.amountExp: -3`; the M16A4 and VZ.61 are the only automatics at `-2`
  (non-automatic weapons use `0`). These two don't share a fire mode — the M16A4
  is burst-by-default, the VZ.61 is full-auto — so the `-2` is not a burst effect.
  What drives it is unconfirmed; the in-game menu rounds recoil amount to 1 decimal,
  too coarse to verify the amount ladder from screenshots. The variation stat is the
  better field for tier-math checks.
- **Sprint recovery tiers:** primary weapons use `PRIMARY_SPRINT_REC_TIERS`;
  sidearms use `SIDEARM_SPRINT_REC_TIERS`. `WEAPON_MAG[weaponId].defSpr` stores
  the workbook's adjusted base sprint recovery tier after the weapon-specific
  tier adjustment. Magazine entries store the workbook's `Magazine Tier Modifier`
  as `sprintRecoveryTierShift`; do not apply a universal `-1` adjustment.
- **Deploy time tiers:** `DEPLOY_TIME_TIERS` is a placeholder universal scale
  until full deploy data is published on sym.gg. The app maps each weapon's base
  `deployT` to the closest deploy tier, then applies the selected magazine's
  `sprintRecoveryTierShift` as the deploy-time tier modifier.
- **Grip sprint modifiers:** normal `Slim Handstop`, `Adjustable Angled`,
  `Slim Angled`, and `Full Angled` grips each apply `sprintRecoveryTierShift: -1`.
  Class-specific variants with different stats use separate attachment IDs, such
  as `slim_angled_smg`, rather than runtime exclusion fields.

---

## Data Validation

Run the validation script after data edits and before committing season updates:

```bash
node scripts/validate-data.mjs
```

The script checks:
- Cross-file weapon and attachment IDs (every reference must resolve)
- Barrel, magazine, and ammo defaults exist in their own lists
- Required weapon fields and known classes
- Per-slot attachment coverage: every supported non-sidearm weapon must declare
  `muzzle`, `barrel`, `laser`, `light`, and `grip` in `WEAPON_ATTS`. An explicit
  `[]` means "deliberately no options" (e.g. USG-90 grip); an absent key fails.
  Light is skipped for combined-slot weapons and the DB-12.

The GitHub workflow runs the same script on every push and pull request so stale
IDs or incomplete weapons fail loudly instead of producing wrong UI stats.
