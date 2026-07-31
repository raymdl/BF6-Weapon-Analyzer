# Derived Attachment Model — Implementation Plan

Replace the site's hardcoded per-weapon, per-attachment stat tables with derived models: a
sym-sourced anchor plus a small set of multipliers and integer tier steps, with an explicit
register of what the models provably do not cover.

Two models, one argument:

- **Reload** — a base time plus two speed multipliers ([§1.1](#11-reload)).
- **Everything else** — every numeric attachment effect appears to be an **integer step on a
  shared ladder**, so the site can store one tier integer per attachment instead of a stat block
  per weapon-attachment pair ([§1.2](#12-tier-ladders)).

Status: **proposal, not started.** No code or data has changed. Written against
`codex/update-1.3.3.0` at the v1.3.3.0 data set. Verified against the attachment audit at
**3,206 records, 3,144 carrying stats, 62 weapons**, re-checked 2026-07-31.

Consolidates the former `RELOAD_MODEL_IMPLEMENTATION.md` and
`ATTACHMENT_TIER_MODEL_IMPLEMENTATION.md`. Audit process, naming rules and correction history
live in `BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md`. The triage runner is
`scripts/audit-sweep.mjs`; its output is `outputs/attachment-audit/sweep-findings.json`.

---

## Contents

- [1. The models](#1-the-models)
- [2. Evidence](#2-evidence)
- [3. What exists today](#3-what-exists-today)
- [4. Target data model](#4-target-data-model)
- [5. Exceptions register](#5-exceptions-register)
- [6. Migration](#6-migration)
- [7. Validation](#7-validation)
- [8. Remaining scrape errors](#8-remaining-scrape-errors)
- [9. Scrape data quality](#9-scrape-data-quality)
- [10. What this unlocks for undocumented weapons](#10-what-this-unlocks-for-undocumented-weapons)
- [11. Open questions](#11-open-questions)
- [12. Risk and rollback](#12-risk-and-rollback)

---

## 1. The models

### 1.1 Reload

```
base(weapon)      = ReloadLeft / ReloadSpeed          # both from the sym reload block
tacRld(mag, ergo) = base / (magMult x ergoMult)

magMult  = 1.13   for fast-mag-class magazines, else 1.0   (stacks: 1.13^2 where both apply)
ergoMult = 1.063  for Mag Catch, else 1.0
```

Multipliers are **reload speed** multipliers and stack multiplicatively. Expressed as time
reduction: fast mag −11.504%, Mag Catch −5.927%, both −16.749%. Never add the percentages;
1.13 x 1.063 = 1.20119, not 1.193.

`emptyRld` takes the same treatment: `ReloadEmpty / ReloadSpeed`. Whether the attachment
multipliers apply to empty reload is **unverified** — see [§11](#11-open-questions).

**Why `ReloadSpeed` is required.** It is currently discarded by the importer, and it is not
cosmetic: raw `ReloadLeft` matches the in-game displayed value for **zero** of the 15 weapons
where `ReloadSpeed != 1.0`. 15 of 59 weapons (25%) are affected, across every class.

Worked example — AK-205: `ReloadLeft` 2.384, `ReloadSpeed` 0.959742, displayed 2.484.
Mag Catch: 2.484 / 1.063 = 2.337, which is what the screenshot shows. Deriving from raw
`ReloadLeft` instead gives 2.243 — wrong by 94 ms, and wrong in a way that looks plausible.

### 1.2 Tier ladders

```
velocity(barrel, ammo) = base_velocity x 0.8^n         # n = integer tier steps, global ladder
recoil(attachments)    = base_recoil   x RECOIL_MULT[weapon]^n
recoilVar(attachments) = base_dirVar   x dirVarMult[weapon]^n
adsTime / sprintRec / adsMoveSpeed     = TABLE[base_index + n]
```

Three ladder kinds, one rule. `n` is a small signed integer contributed by each equipped
attachment and summed across slots.

- **Global geometric** — velocity, ratio exactly `0.8` per step (`1.25` upward).
- **Per-weapon geometric** — recoil amount uses `RECOIL_MULT[weapon]`, recoil variation uses
  `recoil.ads.dirVarMult`. Both already exist for all 59 weapons.
- **Global lookup table** — ADS time, sprint recovery and ADS move speed index into
  `ADS_SPD_TIERS`, `PRIMARY_SPRINT_REC_TIERS` / `SIDEARM_SPRINT_REC_TIERS`, `ADS_MOVE_TIERS`.

Some effects are not ladders at all but **absolute assignments**, and forcing them into a ladder
would be wrong. Subsonic ammo sets spot-on-fire to a fixed 27 m / 64 m regardless of the weapon's
base 54 m / 150 m; Subsonic HP sets the headshot multiplier to 1.57. These are constants, not
multipliers — see [§4.4](#44-velocity-ammo-and-recoil-become-tier-shifts).

---

## 2. Evidence

Verified against `outputs/attachment-audit/attachment-screenshot-review.json` and against
in-game re-captures.

### 2.1 Reload

| Claim | Result |
|---|---|
| `base = ReloadLeft / ReloadSpeed` | 55/55 non-shell weapons, each backed by 35–52 screenshots |
| Mag Catch = `base / 1.063` | **27/27** |
| Fast mag = `base / 1.13` | **92/92**, including the one at `1.13^2` (KTS100 45Rnd Fast) |
| Raw `ReloadLeft` without `ReloadSpeed` | 0/15 affected weapons |

The fast-mag and Mag Catch rows were 92/93 and 27/27 when first measured; the audit has since
been corrected, and the model now reproduces **every** reload value in the scrape with no
exceptions outside [§5](#5-exceptions-register).

Nine scrape values initially disagreed with the model. All nine were re-checked in game and
**all nine were scrape errors** — the model's prediction was correct every time:

| Weapon / attachment | Scraped | Actual |
|---|---|---|
| SL9 Improved Mag Catch | 2.650 | 2.493 |
| M433 20/30/40Rnd Fast | 2.384 | 2.110 |
| SOR-556 MK2 20/40/45Rnd Fast | 2.000 | 2.110 |
| PP-19 20Rnd Fast | 2.467 | 2.183 |
| SGX 36Rnd Fast | 2.517 | 2.227 |

Five of the nine scraped **exactly the weapon's base value** — the failure mode to expect from
OCR reading the wrong panel or a pre-selection state. It produces a plausible number, so nothing
downstream flags it.

A tenth disagreement was a different and more dangerous class. The scrape held
`RPK-74M / 36Rnd Magazine` with `reloadTimeSeconds: 2.950` while its own `magazineSize` read
**95**. The stat block was transcribed correctly; the attachment *name* was misread. In game the
36Rnd is 2.784 and the 95Rnd drum is 2.950. Value errors are caught by checking the number
against the model; this one is not. Catching it needs cross-field consistency ([§7](#7-validation)),
and it is why Phase 3 must not auto-classify.

### 2.2 Tier ladders

| Claim | Result |
|---|---|
| Velocity change = integer step of `x0.8` | 115 / 118 records |
| — barrels | 88 / 88, every one exactly ±1 step |
| — grips | 5 / 5 |
| — ammo | 22 / 25 (3 exceptions, [§5](#5-exceptions-register)) |
| Recoil amount = integer tier of `RECOIL_MULT[weapon]` | **99.8%** |
| Recoil variation = integer tier of `dirVarMult[weapon]` | **100%** since the 2026-07-31 correction |
| ADS time / sprint recovery / ADS move are table members | all but the errors in [§8](#8-remaining-scrape-errors) |

The recoil result is the important one. It is not a curve fit — `RECOIL_MULT` is already in
`data/balance_tables.json`, sourced from Sym, and virtually all of nearly three thousand
independently transcribed screenshot readings land on integer powers of it.

**Recoil variation now sits at 100%.** It did not when this plan was written: the sweep reported
22 off-ladder readings across GRT-BC, LMR27, M277, M4A1 and VCR-2. Every one turned out to be a
transcription error, verified by magnifying the RECOIL VARIATION row of the source screenshots —
see [§9.2](#92-what-was-wrong-and-why-it-matters-here). The ladder was right and the data was
wrong in all five weapons, which is the same result as the nine reload disagreements.

### 2.3 A caveat on pinning the exact integer

Ladder *membership* is proven. The specific tier integer per attachment often is not, because the
in-game panel shows recoil to one decimal. A single 0.1 step frequently admits two adjacent
integers, so the same screenshot is consistent with e.g. `n = -1` and `n = 0`.

Grips still cluster unambiguously — the vertical/stubby family at roughly +2 and the
handstop/angled family at −1/0, matching what `adsRecoilTierMod` already encodes — but the
per-attachment integers must come from Sym or a finer capture, **not** from this scrape. Do not
let Phase 3 auto-assign them.

Where the ladder step is large relative to display precision the integers *are* pinnable.
Velocity is the clean case: a ±1 step moves 670 to 837 or 536, unmistakable at integer precision,
which is why 88/88 barrels resolve exactly.

### 2.4 Worked example — PP-19

The whole point of a derived model is that a weapon with no bespoke data still resolves. PP-19
with `RECOIL_MULT = 0.9333`, base recoil 0.5, base velocity 444:

| Attachment | Model | Panel |
|---|---|---|
| Subsonic, Subsonic HP | 444 x 0.8³ = 227.3 | 227 ✓ |
| Barrel 367MM CIV | 444 x 1.25 = 555 | 555 ✓ |
| Reload base (`ReloadLeft / ReloadSpeed`) | 2.417 / 0.979732 = 2.4670 | 2.467 ✓ |
| Mag Catch (`base / 1.063`) | 2.3208 | 2.321 ✓ |
| Fast mag (`base / 1.13`) | 2.1832 | 2.183 ✓ |
| 53Rnd drum | registered override | 2.667 ✓ |

Zero PP-19-specific numbers were needed beyond `RECOIL_MULT`, `ReloadSpeed` and one override.

---

## 3. What exists today

| Location | Content | Count |
|---|---|---|
| `data/weapons.json` | `tacRld`, `emptyRld` scalars | 55 / 53 of 59 weapons |
| `data/attachments.json` → `WEAPON_MAG[*].mags[*].tacRld` | per-magazine absolute ms | 260 magazines |
| `data/attachments.json` → `WEAPON_ERGO[*].magCatchRld` | `{reg, fast}` ms pair | 17 weapons |
| `data/attachments.json` → `BARRELS[*].velMult` | per-barrel absolute velocity multiplier | — |
| `data/attachments.json` → `MUZZLES[*].adsRecoilTierMod` | already a tier shift — the pattern to extend | — |
| `data/attachments.json` → `BARRELS[*].adsTimeTierMod` | already a tier shift | — |
| `data/attachments.json` → `WEAPON_MAG[*].mags[*].*TierShift` | tier shifts, but restated per weapon | — |
| `data/ammo.json` → `AMMO[*]` | 10 global entries; no velocity field, no subsonic entries | — |
| `data/balance_tables.json` | `RECOIL_MULT`, `ADS_SPD_TIERS`, `ADS_MOVE_TIERS`, sprint tables | — |
| `sim/applyAttachments.js:185-192` | Mag Catch override; detects fast mags by matching `"fast"` in the display name | — |
| `sim/applyAttachments.js:275-277` | precedence: `magCatchTacRld` → `magTacRld` → `w.tacRld` | — |
| `scripts/sym-import.mjs:349-357` | `normalizedReloadFields()` — writes raw `ReloadLeft`/`ReloadEmpty`, no `ReloadSpeed` | — |
| `generated-data/sym/1.3.3.0/excluded-fields.json` | `reload.ReloadSpeed` marked `normalized-only` | — |

Roughly 280 hardcoded reload numbers, each an independent transcription with no cross-check. Two
are known wrong today: `M277` (2.183, should be 2.384) and `LMR27` (2.854, should be 3.034).

The current fast-mag detection is a substring match on the magazine's display name. That is
already insufficient — nine magazines carry the 1.13 multiplier without "Fast" in the name
([§5](#5-exceptions-register)).

The site is already half-committed to the tier model. `adsRecoilTierMod`, `adsTimeTierMod` and the
magazine `*TierShift` fields are exactly the right shape. What is inconsistent is that some
effects are tier shifts and others (velocity via `velMult`, magazine reloads via absolute ms) are
per-weapon absolutes, and that the magazine tier shifts are repeated inside every `WEAPON_MAG`
entry rather than stated once on the attachment. `AMMO` has no velocity mechanism at all, which
is what blocks adding subsonic rounds.

---

## 4. Target data model

### 4.1 `data/weapons.json`

Add one field; change the meaning of two.

```jsonc
{
  "id": "ak205",
  "reloadSpeed": 0.959742,   // NEW — sym reload.ReloadSpeed, default 1.0
  "tacRld": 2.484,           // CHANGED — now ReloadLeft / ReloadSpeed (was raw ReloadLeft)
  "emptyRld": 2.917          // CHANGED — now ReloadEmpty / ReloadSpeed
}
```

Store `tacRld`/`emptyRld` pre-divided rather than dividing at runtime. The displayed base is what
every consumer wants, `reloadSpeed` is retained for provenance and for the validator, and nothing
downstream needs to know the formula.

### 4.2 Magazines — reload class and tier shifts

```jsonc
"30_fast": { "name": "30 Fast", "pts": 10, "mag": 30, "reloadMult": 1.13 },
"30_rnd":  { "name": "30 Rnd",  "pts": 0,  "mag": 30 },                      // omitted = 1.0
"53_rnd":  { "name": "53 Rnd",  "pts": 10, "mag": 53, "tacRldOverride": 2667 }
```

`reloadMult` is explicit data, not inferred from the name. This kills the substring match and
makes the nine capacity-for-speed magazines correct by construction. Magazine tier shifts move
onto the magazine class in the same catalog rather than being restated inside every `WEAPON_MAG`.

### 4.3 Ergonomics

Delete all 17 `magCatchRld` blocks. Add one multiplier to the `ERGOS` catalog entry:

```jsonc
{ "id": "mag_catch", "name": "Mag Catch", "pts": 5, "reloadMult": 1.063 }
```

One number replaces 34.

### 4.4 Velocity, ammo and recoil become tier shifts

- `BARRELS[*].velMult` → `velTierMod`, against a global `0.8` ladder constant in
  `balance_tables.json`.
- `AMMO` gains `velTierMod`, plus the absolute-assignment fields `spotOnFire3d` / `spotOnFire2d`
  and a headshot override, so subsonic rounds can be expressed at all.
- `adsRecoilTierMod` extends to grips and ammo; add a sibling `recoilVarTierMod`.

### 4.5 `sim/applyAttachments.js`

```js
const magMult  = magData?.reloadMult ?? 1;
const ergoMult = ergoData?.reloadMult ?? 1;
const override = magData?.tacRldOverride ?? null;

tacRld: override != null ? +(override / 1000).toFixed(3)
      : w.tacRld != null ? +(w.tacRld / (magMult * ergoMult)).toFixed(3)
      : null,
```

Rounding must stay `toFixed(3)` applied **once, at the end**. Rounding an intermediate then
dividing again reproduces the game's numbers only by luck; the stacked KTS100 case
(`base / 1.13 / 1.13`) is the one that will expose a mistake here.

Delete the `magCatchRld` lookup and the `isFastMag` name match entirely.

---

## 5. Exceptions register

Ladder-shaped models need an explicit register of what they do not cover.

### 5.1 Magazines that change the reload *animation*

| Weapon | Magazine | Time | Note |
|---|---|---|---|
| M240L | 75/100Rnd Belt Box | 7.100 | base (loose belt) is 4.250 |
| M60 | 50Rnd Loose Belt | 4.534 | base (belt pouch) is 7.350 |
| PP-19 | 53Rnd drum | 2.667 | base 2.467; 1.08107, slower not faster |
| RPK-74M | 95Rnd drum | 2.950 | base 2.784; 1.05963, slower not faster |

The two drums are both penalties and both weapon-specific — 1.08107 and 1.05963 share no constant,
and neither is the inverse of any multiplier in use. Capacity does not drive them either:
RPK-74M's 30, 36, 45, 50 and 60Rnd magazines all sit at the same 2.784 base.

M60 and M240L are the only two LMGs with `ReloadSpeed != 1.0`, and the only two whose alternate
magazine fits no multiplier class. Their slow/fast ratios differ (1.62109 vs 1.67059) and
`ReloadSpeed` cannot reconcile them — it is a weapon-level scalar, so it cancels out of any
within-weapon ratio. Their alternate times are irreducibly per-magazine data.

For contrast, `M121 A2` has three magazines, `ReloadSpeed` 1.0, and its belt pouch sits at 1.1292
— ordinary fast-mag class. `L110` has two magazines both at 6.500.

### 5.2 Shell-by-shell reloads

`DB-12`, `M1014`, `M87A1` — sym's `ReloadLeft` is a **per-shell** time (0.866, 0.400, 0.700), not
a full reload. Already handled by `SPECIAL_RELOAD_POLICY.shellByShell` in
`scripts/sym-import.mjs:42-46`, which nulls these. Leave that behavior exactly as is.

**18.5KS-K is listed under that policy in sym but is not shell-by-shell in game** — it feeds from
box magazines (4Rnd/8Rnd), displays a normal scalar reload, and follows the 1.13 rule. It must not
be excluded.

### 5.3 Magazine multiplier classes, measured

| Class | Count |
|---|---|
| 1.0 — no change | 169 |
| 1.13 — fast-mag class | 102 |
| 1.13² — stacked (KTS100 45Rnd Fast) | 1 |
| Explicit override required | 5 |

The nine non-"Fast"-named magazines in the 1.13 class: TR7 15Rnd, M277 15Rnd, PW5A3 20Rnd,
PW7A2 20Rnd, SVDM 5Rnd, M417 A2 20Rnd, M357 Trait 8Rnd Moon Clip, KTS100 45Rnd & 60Rnd,
M121 A2 50Rnd Belt Pouch. All measure 1.1292–1.1302, i.e. 1.13 within display rounding.

### 5.4 Velocity — unresolved

| Weapon / attachment | Reading | Model predicts | Note |
|---|---|---|---|
| USG-90 Subsonic | 543 → 265 | 278 (−3 steps) | 3.21 steps; off-ladder |
| USG-90 Subsonic HP | 543 → 265 | 278 | same reading |
| PW7A2 Subsonic Tungsten | 576 → 341 | 369 (−2) or 295 (−3) | combined item, 2.35 steps |

All three are **unresolved**, not registered exceptions. PW7A2's is a combined Subsonic+Tungsten
item, so it plausibly stacks two effects; USG-90 has no such explanation. Re-capture all three
before writing anything. Do not invent a fractional step to accommodate them.

### 5.5 Recoil variation — Linear Comp — **resolved, not an exception**

This was the model's most serious apparent counter-example and it is now closed. Linear Comp
looked off-ladder on four weapons at a suspiciously consistent ≈0.789 ratio, which reads like a
second flat multiplier. It was four bad baselines.

| Weapon | Was | Corrected | Ladder |
|---|---|---|---|
| GRT-BC | 26.1 → 20.6 | 26.1 → **20.2** | `0.918691³` = 0.7753 → 20.24 ✓ |
| M277 | 34.0 → 26.9 | **34.4** → 26.9 | `0.921523³` = 0.7825 → 26.92 ✓ |
| VCR-2 | 50.4 → 39.5 | **50.3** → 39.5 | `0.922964³` = 0.7862 → 39.55 ✓ |
| M4A1 | 40.7 → 24.0 | **30.7** → 24.0 | `0.921205³` = 0.7817 → 24.00 ✓ |

Linear Comp is a plain **−3 tier step** on all four. Every corrected value was read directly from
the magnified RECOIL VARIATION row of the source screenshot on 2026-07-31; the applier is
`outputs/attachment-audit/apply-20260731-open-item-fixes.mjs`. `recoilVarTierMod` does **not**
need a flat-multiplier sibling.

### 5.6 Recoil amount

DB-12 and M87A1 each have two grip readings off the `x0.94` ladder (2.7 → 2.3, 3.6 → 2.7). Both
are shotguns, both appear in other error classes in [§8](#8-remaining-scrape-errors), and both sit
inside otherwise-suspect captures. Re-capture before deciding whether these are exceptions or
errors.

### 5.7 Fire-mode ergonomics

`SL9 / Ergonomics / Burst Mode` reads 771 RPM against a 675 base. This is **correct** — the
ergonomic changes the fire mode, so rate of fire legitimately changes. Any invariant check on RPM
must exempt ergonomics matching `/burst|full auto/i`. The sweep does this; a naive check reports
it as an error.

---

## 6. Migration

Each phase is independently committable and leaves the site working. Phase 0 is not optional.

### Phase 0 — correct the scrape

Apply [§8](#8-remaining-scrape-errors). The scrape is the fixture every later phase validates
against; migrating first would bake its errors into shared multipliers, where one bad value
affects a whole class rather than one cell. A wrong tier constant is worse than a wrong absolute.

### Phase 1 — importer carries `ReloadSpeed`

1. `scripts/sym-import.mjs`: extend `normalizedReloadFields()` to read `reload.ReloadSpeed`,
   default 1.0 when absent, and emit `tacRld = ReloadLeft / ReloadSpeed`,
   `emptyRld = ReloadEmpty / ReloadSpeed`, `reloadSpeed`. Keep the shell-by-shell null path ahead
   of the division.
2. Remove the `reload.ReloadSpeed` entry from `EXCLUDED_SOURCE_FIELDS` (line ~80) and add
   `'reload.ReloadSpeed': 'reloadSpeed'` to the property→site-field map (line ~474).
3. Re-run the importer. Expect the diff to touch `tacRld` and `emptyRld` on exactly 15 weapons and
   add `reloadSpeed` to all 59.

**Gate:** the generated diff lists 15 weapons and no others. Any weapon outside the known 15 means
the division was applied where `ReloadSpeed` was absent rather than 1.0.

### Phase 2 — schema and validator

1. `scripts/validate-data.mjs`: extend the numeric-or-null loop (line 49) to cover `reloadSpeed`;
   assert `0.5 < reloadSpeed <= 1.5` when present.
2. Assert every magazine `reloadMult` is an allowed value, and every `tacRldOverride` names a
   weapon in the exceptions register.
3. Add a consistency check: for weapons without an override, recomputing
   `tacRld / (magMult x ergoMult)` must reproduce the recorded value.

### Phase 3 — reload data conversion

1. One-shot migration reading the current absolute magazine `tacRld` values, computing
   `base / value`, classifying each into 1.0 / 1.13 / 1.13² / override.
2. **Fail on any magazine outside a tolerance of 0.005 of a known class** that is not already in
   the register. This forces a human decision instead of silently inventing a multiplier.
   (0.002 was too tight — `M121 A2 / 50Rnd Belt Pouch` misses it by 4 ms, inside display rounding.)
3. Emit `reloadMult` / `tacRldOverride`; delete `tacRld` from magazines and `magCatchRld` from
   `WEAPON_ERGO`.
4. Fix `M277` (→ 2.384) and `LMR27` (→ 3.034), currently stale.

### Phase 4 — velocity

1. Add the global `0.8` ladder constant to `balance_tables.json`.
2. Convert `BARRELS[*].velMult` → `velTierMod`. All 88 barrel readings are ±1, so this is
   mechanical.
3. Gate: recomputing every barrel's velocity from `bulletVel x 0.8^n` reproduces the scrape for
   all 88 records.

### Phase 5 — ammo, including subsonic

1. Add `velTierMod`, `spotOnFire3d`, `spotOnFire2d` to the `AMMO` schema.
2. Add `subsonic` and `subsonic_hp` entries per [§4.4](#44-velocity-ammo-and-recoil-become-tier-shifts).
3. Populate `WEAPON_AMMO[*].ammo.subsonic.velTierMod`.
4. Gate: USG-90 and PW7A2 must be resolved or explicitly registered first — do not ship a
   fractional step.

### Phase 6 — recoil tier shifts

1. Extend `adsRecoilTierMod` to grips and ammo; add `recoilVarTierMod`.
2. **Do not auto-derive the integers from the scrape** ([§2.3](#23-a-caveat-on-pinning-the-exact-integer)).
   Source them from Sym, or capture at finer precision. Where neither is available, leave the
   attachment's tier absent and fall back to current behaviour rather than guessing.
3. Gate: every populated tier reproduces the scrape to display rounding for every weapon carrying
   that attachment.

### Phase 7 — runtime and magazine catalog

Apply the `sim/applyAttachments.js` change from [§4.5](#45-simapplyattachmentsjs) and delete the
dead `magCatchRld` and `isFastMag` code. Move magazine tier shifts to the class catalog, only
after the ADS-move column is re-captured.

### Phase 8 — regression test

Add `scripts/reload.test.mjs` and extend the same pattern to the ladders:

- Assert the four canonical reload combinations for a representative weapon per pattern: TR7
  (plain), AK-205 (`ReloadSpeed != 1`), SL9 (`ReloadSpeed > 1`), KTS100 MK8 (stacked 1.13²),
  M240L (override), M1014 (shell-by-shell null).
- Assert the exact multipliers `1.13`, `1.063`, their product `1.20119`, and the `0.8` velocity
  ladder constant.
- Assert one weapon per ladder kind, including PP-19 as the no-bespoke-data case
  ([§2.4](#24-worked-example--pp-19)).
- Cross-check the whole roster against the screenshot scrape **when present**, and skip cleanly
  when it is not — `outputs/` is gitignored, so a clean clone must not fail. Follow the pattern in
  `scripts/sym-import.test.mjs`.

---

## 7. Validation

The scrape is a test fixture, not a data source. Run two checks, not one:

1. **Value check** — does the reading match the model? This caught the nine reload errors in
   [§2.1](#21-reload) and the 22 recoil-variation errors in [§2.2](#22-tier-ladders).
2. **Cross-field consistency** — does the capacity in the attachment *name* match the record's
   `magazineSize`? Does the same name appear twice for one weapon with different stats? This needs
   no model at all, and it is what catches a mislabel like the RPK-74M 36Rnd, where the value was
   right and the *name* was wrong.

Check 2 is worth running across every stat column, not just reload. If magazine names were misread
once, they were misread elsewhere, and every other stat inherits the same wrong label.

Manual QA after the runtime phase — check the reload figure in the stat card for:

- a `ReloadSpeed = 1.0` weapon with a fast mag (GRT-BC)
- a `ReloadSpeed != 1.0` weapon with Mag Catch (AK-205 → 2.337)
- SL9 (the only `ReloadSpeed > 1.0`; base 2.650, Mag Catch 2.493)
- KTS100 MK8 45Rnd Fast (2.545)
- M240L across all three magazines (4.250 / 7.100 / 7.100)
- a shotgun (reload stays blank, not 0.400)

---

## 8. Remaining scrape errors

Runner: `scripts/audit-sweep.mjs`. Output: `outputs/attachment-audit/sweep-findings.json`.

**392 findings (362 errors) across 331 distinct records, in 17 of 62 weapons** as of 2026-07-31,
down from 445 findings in 29 weapons when this plan was written. The recoil-variation and
NVO-228E classes have since been cleared.

The distribution is the useful part: 377 of the 392 fall in **eight weapons**, and within those
they cluster by slot or by column. This is not scattered OCR noise — these are localized capture
failures, so re-capture fixes them wholesale rather than cell by cell.

### 8.1 Bulk-suspect captures — re-capture, do not repair

| Weapon | Findings | Dominant failure |
|---|---|---|
| M1014 | 85 | `adsMoveSpeedMultiplier` off-table x46, plus 29 benign duplicates |
| SVDM | 61 | `sprintRecoveryMs` = 0 x61 |
| GRT-CPS | 52 | `adsMoveSpeedMultiplier` off-table x40 |
| LMR27 | 51 | `adsMoveSpeedMultiplier` off-table x42 |
| M39 EMR | 46 | `sprintRecoveryMs` = 0 x46 |
| M87A1 | 35 | `adsMoveSpeedMultiplier` off-table x28 |
| PSR | 31 | `sprintRecoveryMs` = 0 x31 |
| SVK-8.6 | 16 | `sprintRecoveryMs` = 0 x16 |

Two systematic column failures account for most of it:

- **`sprintRecoveryMs` = 0** on six weapons — M2010 ESR, M39 EMR, Mini Scout, PSR, SVDM, SVK-8.6.
  All DMR/sniper. 0 is not a possible value; the parser is reading a field that renders
  differently on these weapons' panels.
- **`adsMoveSpeedMultiplier` = 0.5** on GRT-CPS, LMR27, M1014, M87A1. `0.5` is not in
  `ADS_MOVE_TIERS` (`0.54` and `0.47` bracket it).

Because both failures are per-weapon and total within that weapon, the affected columns carry no
usable information for those weapons and must not be averaged, interpolated, or promoted.

### 8.2 Tail — individually correctable

**`magazineSize` leaking across slots.** A muzzle, laser, light, barrel, ammo or ergonomic cannot
change capacity, so every one of these is a misread:

```
ES 5.7   Barrel/122MM Factory        30 -> base 20
GGH-22   Muzzle/Standard Suppressor  20 -> base 15
GGH-22   Muzzle/CQB Suppressor       22 -> base 15
M2010    Ergonomics/DLC Bolt          8 -> base 5
M433     Light/None, Taclight-Aimed  40 -> base 30
M433     Light/Flashlight            36 -> base 30
M433     Laser/50 MW Violet, Green   20 -> base 30
MiniScout Ammo/Frangible             15 -> base 10
MiniScout Laser/None                 15 -> base 10
MiniScout Laser/5 MW Red, 50 Violet  20 -> base 10
SOR-556  Grip/Underslung Mount       14 -> base 30
VSSM     Ammo/Match Grade            70 -> base 20
VSSM     Ammo/Frangible              10 -> base 20
VSSM     Ergonomics/Improved MagCatch 52 -> base 20
VZ. 61   Ergonomics/Improved MagCatch 20 -> base 10
```

The three **VSSM** entries matter — it is one of the three weapons with no Sym data, and its
capacity column is already known-bad. VSSM's magazine capacities are not trustworthy as captured.

**Digit drops in RPM:** `PSR / Muzzle / Compensated Brake` reads 8, should be 38;
`SV-98 / Muzzle / Lightened Suppressor` the same.

**Other single cells:**

```
M250     Grip/None                  damage 5, base 26
CZ3A1    Magazine/20Rnd Fast Mag    adsMoveSpeedMultiplier 1 (not a table member)
PP-19    Magazine/20Rnd Fast Mag    adsMoveSpeedMultiplier 1 (not a table member)
```

The two `adsMoveSpeedMultiplier = 1` readings are both on a 20Rnd Fast Mag. `1.0` sits above the
table's top entry of `0.91`. Either the table is missing a no-penalty tier or both are misreads;
one in-game check on PP-19's 20Rnd Fast Mag settles it.

**Shotgun speedloaders** — `M1014 4Rnd Speedloader -> 5`, `M87A1 5Rnd Speedloader -> 6`, all off by
exactly one. This is the chambered-round convention rather than an error, since live `mag` counts
the chamber and the panel does not. Confirm once, then exempt speedloaders from the check.

### 8.3 Cross-source conflicts — audit vs Sym

| Weapon | Field | Audit | Sym | Assessment |
|---|---|---|---|---|
| M4A1 | recoil variation | ~~40.7~~ **30.7** | 30.7 | **resolved** — screenshots confirm Sym; corrected 2026-07-31 |
| M16A4 | recoil variation | 29.2 | 37.5 | **unresolved**, needs an in-game read |

Explained, no action needed: DB-12 and M87A1 RPM (Sym stores intra-burst rate, panel stores the
usable rate), L115 velocity 742 vs 664, and ±1 rounding on M2010 ESR, M44, Mini Scout and M277.

That M4A1 resolved *through* the model — a corrupted baseline made a good attachment reading look
broken — is [§7](#7-validation) holding up again: the model is self-checking and the hardcoded
table is not.

### 8.4 Recommended order

1. Re-capture the eight weapons in [§8.1](#81-bulk-suspect-captures--re-capture-do-not-repair) as
   whole captures.
2. Fix the tail cells in [§8.2](#82-tail--individually-correctable); confirm the two `amv = 1` and
   the speedloader readings in game first.
3. Read M16A4 recoil variation in game ([§8.3](#83-cross-source-conflicts--audit-vs-sym)).
4. Resolve USG-90 Subsonic and PW7A2 Subsonic Tungsten ([§5.4](#54-velocity--unresolved)).
5. Re-run `scripts/audit-sweep.mjs` and require the error count to fall to the registered
   exceptions only.

Nothing here blocks Phase 1–4 — the reload and barrel columns are clean. It does block Phase 5
(ammo, gated on USG-90/PW7A2) and Phase 7 (magazine classes, gated on the ADS-move column).

---

## 9. Scrape data quality

Whether this migration can lean on the screenshot audit depends on whether the audit is clean. It
was not when this plan was written; the reload, cost, null, duplicate and recoil-variation columns
now are.

### 9.1 Current state — 2026-07-31

Measured against `attachment-screenshot-review.json`, 3,206 records, 62 weapons:

| Check | Result |
|---|---|
| Fast mag = `base / 1.13` | 92/92 |
| Mag Catch = `base / 1.063` | 27/27 |
| Recoil variation on the `dirVarMult` ladder | 100% |
| Magazine name capacity ⇔ `magazineSize` | 11 contradictions, **all legitimate** |
| Null stat cells | 0 |
| Non-Overview null costs | 0 |
| Duplicate identity groups with disagreeing stats | 0 |
| Barrel subtype ⇔ velocity multiplier | 0 disagreements |

The 11 remaining capacity contradictions are the shotgun tubes and speedloaders whose displayed
capacity excludes the chambered round — DB-12 `7 Shell Dual Tubes`→16, M1014 `6 Shell Tube`→7 and
`4Rnd Speedloader`→5, M87A1 `7 Shell Tube`→8, `5Rnd Speedloader`→6. Correct as recorded.

**The scrape is usable as a Phase 8 fixture** for reload, recoil and velocity. It is not usable
for `sprintRecoveryMs` or `adsMoveSpeedMultiplier` on the weapons in
[§8.1](#81-bulk-suspect-captures--re-capture-do-not-repair).

### 9.2 What was wrong, and why it matters here

Every defect below reached a published artifact and none was caught by an automated check at the
time. They are listed because the *shapes* recur.

- **Values silently replaced with the weapon's base.** 36 fast-magazine and Mag Catch records had
  been overwritten with the unaffected base reload; 25 read exactly the base. Five of the nine
  confirmed scrape errors in [§2.1](#21-reload) had the same shape. This is the failure mode to
  expect from OCR reading the wrong panel or a pre-selection state — it produces a plausible
  number, so nothing downstream flags it. **This is the strongest argument for derived models:
  they are self-checking and hardcoded tables are not.**
- **A value filed under the wrong name.** The RPK-74M 36Rnd case in [§2.1](#21-reload). Only
  cross-field consistency catches it.
- **A whole column wrong on one weapon, with no internal disagreement to flag it.** M4A1 read
  recoil variation 40.7 on 53 records and 30.7 on its 12 muzzle records. The *majority* was the
  wrong one, so any modal-baseline check picked the error as truth; only the ladder exposed it.
  Both M277 (34 vs 34.4, a dropped decimal on 56 records) and VCR-2 (50.4 vs 50.3 on 60) were the
  same shape. **A uniform per-weapon error is invisible to every within-weapon check** — it takes
  a model, a cross-source comparison, or a screenshot.
- **One stat stuck across a whole group.** 30 weapon/type groups carried a single
  `recoilAmountDegrees` value across 115 records that had visible change-arrows. Separately, 482
  values were null because the parser paired labels and numbers positionally and dropped the last
  two panel rows — seven belt-fed LMGs were 100% null.
- **A silent fallback masquerading as data.** `Basic` was the barrel-subtype fallback whenever the
  subtype text could not be read, producing eight mislabels. Velocity proved the intent in every
  case (all 216 barrels sit on exactly 0.80× / 1.00× / 1.25×), but velocity cannot separate
  `Extended` from `Heavy Ext` — both are 1.25×. Read the highlighted tile.
- **A whole weapon's capture being suspect rather than individual cells.** M433 reported
  `magazineSize: 30` for all five magazines regardless of name, and produced three of the nine
  confirmed reload errors. Repaired from screenshots on 2026-07-31, but the lesson holds: when
  every magazine on a weapon reports the same capacity, suspect the capture, not the cell.
- **A rebuild undoing curated values.** The 2026-07-31 rebuild re-derived 39 hand-corrected stat
  values from a noisier OCR pass, including M433's magazines collapsing back to 30. Any pass that
  rebuilds the audit must diff against the previous artifact and allowlist what it intended to
  change.

### 9.3 Gates that would have caught these

1. **Cross-field** — barrel subtype ⇔ measured velocity multiplier.
2. **Within-group variance** — a weapon/type group with change-arrows on a field but only one
   distinct value across every record is stuck.
3. **Duplicate consistency** — identical weapon + type + name must yield identical stats.
4. **Null-after-OCR** — a null stat whose numeric pattern is present in `rawFullScreenOcr` is a
   parse failure, not a missing value.
5. **Cost presence** — non-`Overview` records must carry a cost.
6. **Cross-type reload consistency** — within one weapon, Muzzle/Grip/Laser/Light/Barrel/Ammo must
   share a reload; only Magazine and Ergonomics may differ.
7. **Ladder membership** — the only check that catches a uniformly wrong column.
8. **No silent field regressions** — diff every pass against the previous artifact.

All eight are implemented or asserted by `scripts/audit-sweep.mjs` and the verify scripts under
`outputs/attachment-audit/`. They are restated in
`BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md` §15.

---

## 10. What this unlocks for undocumented weapons

EF88, BROD 3 and VSSM have no Sym data. A derived model narrows what must be measured, because
anything ladder-derived needs only an anchor plus a tier integer.

Already determinable from the audit panel alone:

| Field | How |
|---|---|
| `HIP_CLS` | The displayed hipfire bar maps 1:1 — 54→A, 47→B, 40→C, 34→D, 29→E, verified on all 59 weapons. EF88 = C, BROD 3 = B, VSSM = B. |
| `spread.hipStand` / `hipMove` | Follows from `HIP_CLS` via `HIP_SPREAD_TIERS`. |
| `spread.adsStand` / `adsMove` | Universal constants 0.05 / 0.32 (0 for the four bolt snipers). |
| `rpm`, `mag`, `bulletVel`, ADS time, sprint recovery, ADS move | Read directly; calibrated exact against all 59 existing weapons. |
| `recoilV`, `recoilVar` | Read directly, but only to 1 dp — see [§2.3](#23-a-caveat-on-pinning-the-exact-integer). |

Still blocked, and not derivable from any ladder:

1. **Damage range breakpoints.** The panel gives close and long-range damage with no distances.
2. **`recoilIncAds`.** Confirmed not derivable from the control bar — control 43 maps to both 0.36
   and 0.409 among existing weapons.
3. **`spreadDyn`** — 12 parameters x two aim states.
4. **Recoil decay** — `decFactor`, `decTimeExp`, `decExp`, `decOffset`, `duration`.
5. **`recoilDir`**, **`emptyRld`**, **`deployT`**, **`spreadMax`**.

So the tier model does not unblock the three new weapons. It does mean that when Sym publishes,
only the anchors are needed — no per-attachment capture work.

---

## 11. Open questions

Resolve before or during Phase 1; none blocks starting.

1. **Do the attachment multipliers apply to `emptyRld`?** Untested — the audit only captured
   tactical reload. Until confirmed, apply multipliers to `tacRld` only and derive `emptyRld` from
   `ReloadEmpty / ReloadSpeed` with no attachment scaling. Needs a handful of in-game captures.
2. ~~**RPK-74M 36Rnd at 2.950.**~~ **Resolved.** The 36Rnd is 2.784 (base class); 2.950 belongs to
   the 95Rnd drum. The scrape had it under the wrong magazine name.
3. ~~**Does Linear Comp use a flat 0.789 variation multiplier instead of the tier ladder?**~~
   **Resolved 2026-07-31** — it is a plain −3 tier step on all four weapons; four bad baselines
   created the illusion. See [§5.5](#55-recoil-variation--linear-comp--resolved-not-an-exception).
4. **Is the velocity ladder anchored globally or per weapon?** The `0.8` step is confirmed.
   Whether every weapon's base velocity sits on one shared absolute ladder is not tested, and it
   changes whether `bulletVel` stays a float or becomes an index.
5. **Can recoil tier integers be sourced from Sym?** If yes,
   [§2.3](#23-a-caveat-on-pinning-the-exact-integer) stops being a limitation and Phase 6 becomes
   mechanical. If no, the site keeps per-weapon recoil and gains nothing on that column.
6. **Does `ADS_MOVE_TIERS` need a 1.0 top tier?** Two 20Rnd Fast Mag readings say maybe
   ([§8.2](#82-tail--individually-correctable)).
7. **Are `ReloadSpeed` and `RECOIL_MULT` stable across patches?** If `ReloadSpeed` moves while the
   M60/M240L alternate times track it, both magazines are scaled and each weapon needs one raw
   alternate time rather than one per magazine. `RECOIL_MULT` matters more — it anchors the recoil
   ladder for all 59 weapons. Only answerable at the next Sym drop.
8. **Are there `reloadMult` values other than 1.13?** Nothing in the current data suggests so once
   the SOR-556 scrape error is discounted, but Phase 3 should fail loudly rather than assume.

---

## 12. Risk and rollback

Each phase touches `data/` plus one function in `sim/applyAttachments.js`, and each is separately
revertible. Only the runtime phase has user-visible effect.

The dominant risk is a silent wrong number — the same failure mode as the current hardcoded
tables, but applied at scale. A wrong absolute affects one cell; a wrong **tier constant** affects
every weapon carrying that attachment, and a wrong **ladder ratio** affects every weapon. The
mitigations are Phase 0 (fix the scrape first), the per-phase recompute gates, the tolerance gate
in Phase 3, and the [§2.3](#23-a-caveat-on-pinning-the-exact-integer) rule that unpinnable
integers are left absent rather than guessed.

Second risk is over-generalizing. [§5](#5-exceptions-register) exists because some effects do not
fit — the two reload-animation drums, the M60/M240L belts, and possibly the three subsonic
velocity outliers. A model that quietly absorbs its exceptions by widening tolerance is worse than
a hardcoded table, because it looks principled while being wrong. Note that the one apparent
counter-example that would have justified a whole new mechanism — Linear Comp on recoil variation
— turned out to be bad data, not a real exception. That cuts both ways: keep the register
explicit, keep the sweep in CI, and re-check the data before adding a mechanism to accommodate it.

Third risk is scope creep into the attachment audit. This work needs the reload, recoil and
velocity columns; the audit's other open items are independent.

Net: roughly 280 hardcoded reload numbers become 59 base times, 2 shared multipliers, ~102
magazine class tags and 5 overrides. Velocity collapses from 7 per-barrel multipliers plus
per-weapon anchors to one global constant plus 7 integers. Recoil variation and amount move from
per-weapon-per-attachment readings to one integer per attachment against multipliers already in
the data. And the whole thing is checkable against 3,144 in-game readings by a script that already
exists.
