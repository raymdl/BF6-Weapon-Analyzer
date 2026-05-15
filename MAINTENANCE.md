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

Sidearms are currently allowed in `data/weapons.json` as raw/incomplete data,
but they are intentionally unsupported in the UI until their damage and loadout
data is complete. `scripts/validate-data.mjs` enforces this by validating the
current supported classes while accepting `Sidearm` as explicitly hidden.

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
   - Optional but important: `recoil` (ads/hip groups), `spread` (per-stance
     min/max), `spreadDyn` (bloom dynamics), `dmg` (range dropoff array)
2. Add entry to `data/attachments.json` → `WEAPON_ATTS`
   - Keys: `muzzle`, `barrel`, `barrelDef`, `grip`, `laser` (arrays of IDs)
3. Add magazine data to `data/attachments.json` → `WEAPON_MAG`
4. Add ammo data to `data/ammo.json` → `WEAPON_AMMO` (if non-standard)
5. Add ergo data to `data/attachments.json` → `WEAPON_ERGO` (if applicable)
6. Add recoil decay values to `data/recoil_decay.json`
   - `RECOIL_DEC`, `RECOIL_DEC_EXP`, `RECOIL_DEC_TEXP` (keyed by weapon id)
7. Add hip spread class to `data/balance_tables.json` → `HIP_CLS`
8. Add headshot multiplier to `data/balance_tables.json` → `BASE_HS_MULT`
   (only if it differs from the default 1.34)

### Weapon Stat Changes (recoil, spread, damage, ADS time, etc.)

Edit the relevant weapon object in `data/weapons.json`.

- **Recoil per shot**: `recoilV` and/or `recoil.ads.amount`
- **Recoil direction**: `recoilDir` and/or `recoil.ads.dir`
- **Recoil variation**: `recoilVar` and/or `recoil.ads.dirVar`
- **Recoil decay**: `data/recoil_decay.json` → `RECOIL_DEC[weaponId]` etc.
- **Bloom per shot**: `recoilIncAds` (ADS) or `spreadDyn.hip.inc` (hip)
- **Spread min/max**: `spread.adsStand`, `spread.adsMove`, `spread.hipStand`, `spread.hipMove`
- **Damage dropoff**: `damage` array — `[{r: range_m, d: damage}, ...]`
- **Fire rate**: `rpm`
- **ADS time**: `adsTime` (base ms); tier offsets live in `data/attachments.json`

### New Attachment (new muzzle, barrel type, etc.)

1. Add the attachment object to the relevant array in `data/attachments.json`
   (`MUZZLES`, `BARRELS`, `GRIPS`, `LASERS`, `ERGOS`)
   - Include all effect fields: `adsRecoilTierMod`, `hipSpreadTierMod`,
     `adsSpreadIncMult`, `vMult`, `sway`, `adsSpreadDecayBoost`, etc.
     (copy shape from an existing attachment of the same type)
   - Set fields to `0` or `1` (neutral values) for effects that don't apply
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
- `ADS_SPD_TIERS` — ADS time in ms for tiers 1–8
- `SPRINT_REC_TIERS` — Sprint-to-fire recovery in ms for tiers 1–8
- `ADS_MOVE_TIERS` — ADS move speed multiplier for tiers 1–8
- `MOVING_ACC_TIERS` — Moving ADS min spread in degrees for tiers 1–8
- `RECOIL_MULT` — Per-weapon ADS recoil tier multiplier
- `HIP_SPREAD_TIERS` — Hip spread values by class and tier
- `BASE_HS_MULT` — Per-weapon base headshot multiplier

---

## Attachment Effect Fields Reference

When adding a new attachment, these are the fields `sim/applyAttachments.js`
reads. Omit a field (or set to neutral) if the attachment has no effect there.

| Field | Type | Neutral | Effect |
|---|---|---|---|
| `adsRecoilTierMod` | int | `0` | Shifts ADS recoil amount tier (neg = less recoil) |
| `adsRecoilVariationMult` | float | `1` | Multiplies recoil directional variation |
| `hipSpreadTierMod` | int | `0` | Shifts hip spread tier (pos = worse) |
| `adsSpreadIncMult` | float | `1` | Multiplies ADS bloom-per-shot (`recoilIncAds`) |
| `adsSpreadDecayBoost` | float | `0` | Extra ADS bloom decay coefficient |
| `movingAdsSpreadTierMod` | int | `0` | Shifts moving-ADS min spread tier |
| `adsTimeTierMod` | int | `0` | Shifts ADS speed tier (pos = faster) |
| `adsMoveSpeedTierShift` | int | `0` | Shifts ADS move speed tier |
| `vMult` | float | `1` | Multiplies bullet velocity |
| `sway` | float | `0` | Adds to weapon sway (from muzzle) |
| `worldSpot` | float | `54` | World spotting distance override (from muzzle) |
| `minimapSpot` | float | `150` | Minimap spotting distance override (from muzzle) |
| `sprintRecoveryTierShift` | int | `0` | *(ergos only)* Shifts sprint recovery tier |
| `visualRecoil` | int | `0` | *(ergos only)* Visual recoil modifier; negative = reduced, positive = increased |
| `setsFireModeAuto` | bool | `false` | *(ergos only)* Overrides burst weapon to full-auto fire mode |

---

## Where Simulation Logic Lives

If game mechanics change (not just data), edit the relevant module:

| Mechanic | File |
|---|---|
| Recoil path simulation | `sim/core.js` → `genRecoilPts` |
| Bloom/spread simulation | `sim/core.js` → `simulateBloom` |
| Recoil decay formula | `sim/core.js` → `applyRecoilDecay` |
| Attachment stat application | `sim/applyAttachments.js` → `applyAttachments` |
| Loadout defaults / point totals / sidebar UI | `sim/loadout.js` |
| Attachment slot order / new slot types | `sim/attachments.js` → `ATTACHMENT_SLOT_KEYS` |

---

## Known Follow-Up Notes

- **SL9 burst timing:** Season 3 sym.gg data shows `RoF = 674.999` and
  `BurstRoF = 771.428`. Screen-recording verification (frame-by-frame timestamp
  analysis across 5 full magazines) confirms a 3-round burst cadence of ~78 ms
  between shots (≈771 RPM intra-burst), with a post-burst delay that brings the
  sustained average to ~675 RPM. This mirrors the M16A4-style burst pattern.
  Currently, `weapons.json` stores the weapon as `fireMode: "auto"` with
  `rpm: 675`. The burst recoil/bloom timing model has not yet been applied.
  **Pending:** add `burstRounds: 3` and `burstBurstsPerMinute` to the SL9 entry
  and verify the burst badge displays correctly.

---

## Data Validation

Run the validation script after data edits and before committing season updates:

```bash
node scripts/validate-data.mjs
```

The script checks cross-file weapon and attachment IDs, barrel and magazine
defaults, supported weapon classes, required weapon fields, and sidearm hiding
rules. The GitHub workflow runs the same script on pull requests so stale IDs
or incomplete supported weapons fail loudly instead of producing wrong UI stats.
