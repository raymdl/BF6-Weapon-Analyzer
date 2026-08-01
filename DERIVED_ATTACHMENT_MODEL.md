# Derived Attachment Model — Implementation Plan

Replace the site's hardcoded per-weapon, per-attachment stat tables with derived models: a
sym-sourced anchor plus a small set of multipliers and integer tier steps, with an explicit
register of what the models provably do not cover.

Two models, one argument:

- **Reload** — a base time plus two speed multipliers ([§1.1](#11-reload)).
- **Tier-eligible stats** — velocity, recoil amount/variation, ADS time, sprint recovery, and ADS
  move speed appear to be integer steps on shared ladders. Absolute assignments and unresolved
  fields stay explicit rather than being forced into this model ([§1.2](#12-tier-ladders)).

Status: **Phase 0 through Phase 7 complete**, and the [§7](#7-validation) validation checks are now
executable rather than described. The audit tooling is portable and
fixture-gated, the Sym importer carries `ReloadSpeed` with `18.5KS-K` reclassified as scalar, and
the reload cutover is done — the derived branch is authoritative and both legacy representations
are rejected if reintroduced. Barrel velocity is a signed tier on the `0.8` ladder.

A 2026-08-01 review found four gates that passed when they should have failed closed, and fixing
them is recorded in [§7.6](#76-fail-closed-gate-repairs--2026-08-01). Running the four §7 checks
as executable gates then surfaced findings that are inventoried, pinned, and unresolved by design —
see [§7.7](#77-executable-check-results--2026-08-01). Two of those findings were adjudicated
against the original screenshots and confirm that **both** the site and the corpus are wrong in
places, which is why §7's rule against resolving a disagreement by rule is load-bearing rather than
cautionary. Written against `codex/update-1.3.3.0` at
the v1.3.3.0 data set. Verified against the current tracked attachment audit at **3,177 records,
3,115 carrying stats, 62 weapons**, re-checked 2026-07-31 after the intentional M1014
canonical-record dedupe and SL9 detailed recaptures.

Two findings from the 2026-07-31 review changed the plan's shape. `ADS_MOVE_TIERS` now begins with
the `1.0` top rung — confirmed by green-arrow readings on two weapons, and landed in the
output-identical [Phase 2b-i](#2b-i--ads-move-10-tier) index migration. And `PP-19 / 20Rnd Fast
Mag` is a named fast magazine that does not receive the reload
multiplier in game ([§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug)),
which cost the model its one clean sweep and produced three new validation gates.

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
- [8. Audit status — 2026-07-31](#8-audit-status--2026-07-31)
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

Reload validation has two categories:

- **Scalar magazine reloads** — every non-tube-fed weapon plus the box-magazine `18.5KS-K`.
  These use the formula above, shared reload tiers/classes, and explicit animation overrides.
- **Tube-fed shotgun reloads** — `DB-12`, `M1014`, and `M87A1`. Sym exposes a per-shell time,
  while the in-game panel exposes a different aggregate/display value. Keep these fail-closed and
  validate them in a shotgun-specific category until the simulator has an explicit tube-reload
  contract. Do not feed either value through the scalar magazine formula.

`emptyRld` takes the same treatment: `ReloadEmpty / ReloadSpeed`. Whether the attachment
multipliers apply to empty reload is **unverified** — see [§11](#11-open-questions).

**Why `ReloadSpeed` is required.** Phase 1 now retains the source value as live provenance and
uses it to derive the displayed base timing; raw `ReloadLeft` matches the in-game displayed value
for **zero** of the 15 weapons where `ReloadSpeed != 1.0`. Absent values default to `1.0`, while
invalid present values fail closed. All 59 live weapon records now carry a finite positive value.

Worked example — AK-205: `ReloadLeft` 2.384, `ReloadSpeed` 0.959742, displayed 2.484.
Mag Catch: 2.484 / 1.063 = 2.337, which is what the screenshot shows. Deriving from raw
`ReloadLeft` instead gives 2.243 — wrong by 94 ms, and wrong in a way that looks plausible.

### 1.2 Tier ladders

```
normalVelocity(barrel, ammo) = base_velocity x 0.8^n  # n = integer tier steps, global ladder
subsonicVelocity(ammo)      = velocityTreatment       # path-scoped tier or absolute assignment
recoil(attachments)    = base_recoil   x RECOIL_MULT[weapon]^n
recoilVar(attachments) = base_dirVar   x dirVarMult[weapon]^n
adsTime / sprintRec / adsMoveSpeed     = TABLE[base_index + n]
```

Three ladder kinds, one rule. `n` is a small signed integer contributed by each equipped
attachment and summed across slots.

- **Global geometric** — normal velocity, ratio exactly `0.8` per step (`1.25` upward).
- **Weapon-ammo-specific subsonic treatment** — a reviewed tier or absolute assignment that stays
  outside the normal ladder; see [§5.4](#54-velocity--subsonic-treatment-registered).
- **Per-weapon geometric** — recoil amount uses `RECOIL_MULT[weapon]`, recoil variation uses
  `recoil.ads.dirVarMult`. Both already exist for all 59 weapons.
- **Global lookup table** — ADS time, sprint recovery and ADS move speed index into
  `ADS_SPD_TIERS`, `PRIMARY_SPRINT_REC_TIERS` / `SIDEARM_SPRINT_REC_TIERS`, `ADS_MOVE_TIERS`.

Some effects are not ladders at all but **absolute assignments**, and forcing them into a ladder
would be wrong. Subsonic ammo sets spot-on-fire to a fixed 27 m / 64 m regardless of the weapon's
base 54 m / 150 m; Subsonic HP sets the headshot multiplier to 1.57. These are constants, not
multipliers — see [§4.4](#44-longer-term-velocity-ammo-and-recoil-targets).

---

## 2. Evidence

Verified against `outputs/attachment-audit/attachment-screenshot-review.json` and against
in-game re-captures.

### 2.1 Reload

| Claim | Result |
|---|---|
| `base = ReloadLeft / ReloadSpeed` | 56/56 scalar-capable weapons, including box-mag `18.5KS-K` |
| Mag Catch = `base / 1.063` | **27/27** |
| Fast mag = `base / 1.13` | **91/92**, including the one at `1.13^2` (KTS100 45Rnd Fast); the one miss is the registered `PP-19 20Rnd Fast Mag` in-game anomaly ([§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug)) |
| Raw `ReloadLeft` without `ReloadSpeed` | 0/15 affected weapons |

The updated audit contains 43 stat-bearing `18.5KS-K` records. Regular 4/8-round magazines read
`2.750`; both fast magazines read `2.434`, matching `2.750 / 1.13` after display rounding. This
confirms that `18.5KS-K` belongs in the scalar category even though the other three shotguns do
not.

The fast-mag and Mag Catch rows were 92/93 and 27/27 when first measured. The audit has since been
corrected, and the model reproduces every reload value in the scrape except the one registered
in-game anomaly in [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug).

Nine scrape values initially disagreed with the model and were corrected in one pass
(`apply-20260728-reload-and-sl9-corrections.mjs`). **Eight were scrape errors; one was not.**

| Weapon / attachment | Scraped | Corrected to | Source screenshot | Verdict |
|---|---|---|---|---|
| SL9 Improved Mag Catch | 2.650 | 2.493 | replacement capture | scrape error |
| M433 20/30/40Rnd Fast | 2.384 | 2.110 | `▼2.110S` | scrape error |
| SOR-556 MK2 20/40/45Rnd Fast | 2.000 | 2.110 | `▼2.110S` | scrape error |
| SGX 30Rnd Fast | 2.517 | 2.227 | `▼2.227S` | scrape error |
| **PP-19 20Rnd Fast** | **2.467** | ~~2.183~~ | **`2.467S`, no change arrow** | **correction reverted** — see [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug) |

Seven of the eight genuine errors scraped **exactly the weapon's base value** — the failure mode to
expect from OCR reading the wrong panel or a pre-selection state. It produces a plausible number,
so nothing downstream flags it.

**That heuristic is what produced the ninth row, and it is the lesson to carry forward.** "Reads
exactly the base" was treated as sufficient proof of an OCR error, so `PP-19 / 20Rnd Fast Mag` was
rewritten to the model's prediction even though the panel genuinely displays the base value. The
same script then stamped every corrected row with a `direction: 'down'` green comparison, so the
record ended up carrying a change indicator its own source image does not have. A magazine reading
exactly its weapon's base is *evidence for* an OCR error, never proof — the panel has to be read
before the value is replaced. This is the one place where the model overrode a correct reading, and
it is why [§7](#7-validation) check 1 alone is not a sufficient gate.

A tenth disagreement was a different and more dangerous class. The scrape held
`RPK-74M / 36Rnd Magazine` with `reloadTimeSeconds: 2.950` while its own `magazineSize` read
**95**. The stat block was transcribed correctly; the attachment *name* was misread. In game the
36Rnd is 2.784 and the 95Rnd drum is 2.950. Value errors are caught by checking the number
against the model; this one is not. Catching it needs cross-field consistency ([§7](#7-validation)),
and it is why Phase 3 must not auto-classify.

### 2.2 Tier ladders

| Claim | Result |
|---|---|
| Normal attachment-induced velocity change = integer step of `x0.8` | **99 / 99 records** |
| — barrels | 94 / 94 |
| — grips | 5 / 5 |
| — ordinary/non-subsonic ammo | 282 / 282 retain the weapon's panel baseline; no changed rows |
| — subsonic ammo | 27 / 27 use the separate treatment in [§5.4](#54-velocity--subsonic-treatment-registered) |
| Recoil amount = integer tier of `RECOIL_MULT[weapon]` | **100% when computed from the hidden-precision weapon base** |
| Recoil variation = integer tier of `dirVarMult[weapon]` | **100%** since the 2026-07-31 correction |
| ADS time / sprint recovery / ADS move are table members | current dispositions and exact overrides are in [§8](#8-audit-status--2026-07-31) |

The recoil result is the important one. It is not a curve fit — `RECOIL_MULT` is already in
`data/balance_tables.json`, sourced from Sym, and virtually all of nearly three thousand
independently transcribed screenshot readings land on integer powers of it.

**Recoil variation now sits at 100%.** It did not when this plan was written: the sweep reported
22 off-ladder readings across GRT-BC, LMR27, M277, M4A1 and VCR-2. Every one turned out to be a
transcription error, verified by magnifying the RECOIL VARIATION row of the source screenshots —
see [§9.2](#92-what-was-wrong-and-why-it-matters-here). The ladder was right and the data was
wrong in all five weapons, which is the same result as the nine reload disagreements.

M16A4 is an explicit baked-exponent check, not an exception. Sym supplies raw `dirVar = 37.5`,
`dirVarMult = 0.919722`, and `dirVarExp = 3`; the effective base is
`37.5 × 0.919722³ = 29.174`, displayed as `29.2`. Linear Comp contributes another +3 variation
tiers, producing `37.5 × 0.919722⁶ = 22.697`, displayed as `22.7`. Both values exactly match the
audit, so comparisons must use the effective value rather than comparing the panel directly with
raw `dirVar`.

### 2.3 Shotgun-specific audit pass

Treat shotguns as their own validation category, not as generic exceptions mixed into every
weapon-wide metric. The current audit contains **157 shotgun stat records** and **2,958
non-shotgun stat records**. Splitting the existing sweep findings this way produces:

- four direct-source shotgun recoil readings (`DB-12` and `M87A1`) remain explicit
  in the audit, but exact-base recomputation proves they are ordinary +3/+5 tier results rather
  than shotgun-specific ladder exceptions;
- the non-shotgun set has no unregistered recoil or velocity ladder error; all 27 Subsonic rows
  use their separate reviewed treatment;
- the former `M1014` and `M87A1` ADS-move/zero-read capture failures were source-corrected and are
  now covered by regression gates;
- `18.5KS-K` remains in the shotgun reporting category but uses the scalar reload policy described
  in [§1.1](#11-reload).

The split is a validation boundary, not permission to average or promote shotgun values. Tube-fed
reload, chambered-round capacity conventions, speedloaders, and burst/intra-burst rates remain
shotgun-specific contracts. Recoil uses the same per-weapon ladder contract as other classes.

### 2.4 A caveat on pinning the exact integer

Ladder *membership* is proven. The specific tier integer per attachment often is not, because the
in-game panel shows recoil to one decimal. A single 0.1 step frequently admits two adjacent
integers, so the same screenshot is consistent with e.g. `n = -1` and `n = 0`.

Grips still cluster unambiguously — the vertical/stubby family at roughly +2 and the
handstop/angled family at −1/0, matching what `adsRecoilTierMod` already encodes — but the
per-attachment integers must come from Sym or a finer capture, **not** from this scrape. Do not
let Phase 3 auto-assign them.

Where the ladder step is large relative to display precision the integers *are* pinnable.
Velocity is the clean case: a ±1 step moves 670 to 837 or 536, unmistakable at integer precision,
which is why 94/94 changed barrel records resolve exactly.

### 2.5 Worked example — PP-19

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

The normal PP-19 derivation needs no bespoke value beyond `RECOIL_MULT`, `ReloadSpeed` and one
reload override. Its Subsonic rows are separately source-registered as
`subsonicVelocityTier: 3`; that is an explicit ammo treatment, not a normal-velocity exception
silently absorbed by the barrel ladder.

### 2.6 Sym tier-table cross-check — 2026-07-31

A Sym Discord post published five raw tier ladders — Undeploy, Deploy, Sprint-to-Fire, ADS, and
ADS Strafe. It is a community source. The `1.0` ADS-move rung is now corroborated by the two
reviewed green-arrow readings and is landed in our table; any remaining ladder changes must be
confirmed against real Sym data before `data/balance_tables.json` is edited further. The checks
are decisive.

| Sym column | Our table | Result |
|---|---|---|
| ADS Speeds | `ADS_SPD_TIERS` | **exact match**, 8/8 |
| ADS Strafe Speeds | `ADS_MOVE_TIERS` | ours matches Sym's `1.0` top rung and now includes first-party `0.37`; `0.325` remains unsourced and out |
| Sprint to Fire Delays | `PRIMARY_` / `SIDEARM_SPRINT_REC_TIERS` | clean windows onto Sym's ladder **once two phantom values are removed** |
| Deploy Speeds | `DEPLOY_TIME_TIERS` | ours is a **merged primary+sidearm ladder**; Sym's column is primaries only |
| Undeploy Speeds | — | not modelled; no consumer |

**The float32 display contract is confirmed on a second, independent stat.** Sym publishes exact
values; our `ADS_MOVE_TIERS` holds panel-derived two-decimal values. The
[§5.6](#56-recoil-amount--shotgun-false-positives-resolved-by-exact-bases) rule —
`Math.round(Math.fround(v) * 100) / 100` — reproduces all eight of our entries. Plain double
rounding does not:

| Sym exact | double → 2dp | float32 → 2dp | ours |
|---|---|---|---|
| 0.825 | 0.83 | **0.82** | 0.82 |
| 0.475 | 0.48 | **0.47** | 0.47 |

That contract was derived from a single knife-edge recoil case at one decimal. It now reproduces a
different stat at two decimals across eleven values, so it is the project-wide panel-rounding rule,
not a shotgun-recoil special case.

**Two phantom tier values — removed in [2b-ii](#2b-ii--sprint-recovery-phantom-entries).**
`PRIMARY_SPRINT_REC_TIERS` contained `333` and `SIDEARM_SPRINT_REC_TIERS` contained `117`. Neither
is in Sym's Sprint-to-Fire ladder, and neither is observed in any of the 3,115 audit records — all
ten observed values are in Sym's list. Both *do* appear in Sym's Undeploy column, which suggests
they were cross-contaminated from the wrong ladder. Removing them made both tables exact contiguous
slices, which is their shipped shape today:

```
Sym:      50, 67, 83, 100, 133, 167, 200, 233, 267, 300, 350, 400
PRIMARY:          83, 100, 133, 167, 200, 233, 267, 300, ---, 350   <- 333 dropped
SIDEARM:      67, 83, 100, ---, 133, 167, 200, 233                  <- 117 dropped
```

#### Draw time is one stat behind two columns

A Sym team member's explanation in the same thread — draw time drives both sprint recovery and
unholster time — is a falsifiable claim, and our data confirms it. Taking each weapon's baseline
sprint recovery and its `deployT`, then indexing both into Sym's own two columns:

| Sprint-to-Fire | index | Deploy | index |
|---:|---:|---:|---:|
| 100 | 3 | 467 | 3 |
| 133 | 4 | 533 | 4 |
| 167 | 5 | 633 | 5 |
| 200 | 6 | 733 | 6 |
| 233 | 7 | 867 | 7 |
| 267 | 8 | 1000 | 8 |

**Identical index, 52 of 52 primaries, zero exceptions.** The two columns are not independent
ladders; they are two renderings of one underlying draw-time tier.

All seven weapons that break the rule are sidearms, and they are exactly the seven already flagged
`sprintRecoveryTierTable: 'sidearm'`:

| Weapon | Sprint rec | Deploy | Group |
|---|---:|---:|---|
| ES 5.7, GGH-22, P18, M45A1 | 67 / 83 | 233 / 267 | semi-auto pistols |
| M357 Trait, M44, VZ. 61 | 83 / 100 | 350 / 400 | two revolvers plus the only full-auto sidearm |

Sidearms therefore need their own deploy ladder, which does not exist —
`DEPLOY_TIME_TIERS` is `[200, 233, 267]` prepended to Sym's entire primary column, i.e. a merged
table whose three extra fast entries exist only to accommodate sidearms. The sidearm group splits
further into semi-auto pistols and a revolver/full-auto set, so the sidearm ladder must be derived
rather than assumed to be a fixed offset. See [§11](#11-open-questions).

---

## 3. What exists today

| Location | Content | Count |
|---|---|---|
| `data/weapons.json` | `tacRld`, `emptyRld` scalars | 55 / 53 of 59 weapons |
| `data/attachments.json` → `WEAPON_MAG[*].mags[*].tacRld` | per-magazine absolute ms | 265 magazines across 59 weapons |
| `data/attachments.json` → `WEAPON_ERGO[*].magCatchRld` | `{reg, fast}` ms pair | 24 weapons before Phase 6 cleanup |
| `data/attachments.json` → `BARRELS[*].velMult` | per-barrel absolute velocity multiplier | — |
| `data/attachments.json` → `MUZZLES[*].adsRecoilTierMod` | already a tier shift — the pattern to extend | — |
| `data/attachments.json` → `BARRELS[*].adsTimeTierMod` | already a tier shift | — |
| `data/attachments.json` → `WEAPON_MAG[*].mags[*].*TierShift` | tier shifts, but restated per weapon | — |
| `data/ammo.json` → `AMMO[*]` | 10 global entries; no velocity field, no subsonic entries | — |
| `data/balance_tables.json` | `RECOIL_MULT`, `ADS_SPD_TIERS`, `ADS_MOVE_TIERS`, sprint tables | — |
| `data/attachments.json` → `WEAPON_MAG[*].{defAds,defSpr,defAms}` | **0-based** stored tier indices, validator-bounded | 59 weapons, Phase 2b-iv |
| `data/attachments.json` → `WEAPON_MAG[*].{baseSprintRecoveryTier,weaponSprintRecoveryTierShift}` | present on all 59; read by **no** resolver or validator — see below | — |
| `data/attachments.json` → `GRIPS[*].adsMoveSpeedTierShift` | `+1` on the four shared grip IDs; suffixed `*_svk86` / `*_ks18k` / `*_db12` / `*_vssm` clones carry no shift | Phase 2b-iii |
| `sim/applyAttachments.js:185-192` | Mag Catch override; detects fast mags by matching `"fast"` in the display name | — |
| `sim/applyAttachments.js:275-277` | precedence: `magCatchTacRld` → `magTacRld` → `w.tacRld` | — |
| `scripts/sym-import.mjs` | `normalizedReloadFields()` — derives `ReloadLeft`/`ReloadEmpty` using `ReloadSpeed` and retains the provenance field | Phase 1 |
| `generated-data/sym/1.3.3.0/excluded-fields.json` | `reload.ReloadSpeed` is promoted to live `reloadSpeed`; it is no longer excluded | Phase 1 |

Roughly 280 hardcoded reload numbers, each an independent transcription with no cross-check. Two
are known wrong today: `M277` (2.183, should be 2.384) and `LMR27` (2.854, should be 3.034).

**One inert field pair survived 2b-iv on the old convention.** Every `WEAPON_MAG` entry carries
`baseSprintRecoveryTier` and `weaponSprintRecoveryTierShift`, but nothing reads them: the resolver
uses `defSpr`, and `validate-data.mjs` bounds only the three `def*` indices. They are currently
self-consistent for all 59 weapons under `defSpr === baseSprintRecoveryTier +
weaponSprintRecoveryTierShift - 1` — i.e. they are still **1-based** while `defSpr` is 0-based.
Nothing detects that divergence, which is the same silent-failure shape 2b-iv set out to remove.
Either bound them in the validator or delete them; do not let Phase 3/4 add a second reader that
picks the wrong convention.

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

### 4.2 Magazines — shared reload tier, weapon-specific option data

```jsonc
"30_fast": { "name": "30 Fast", "pts": 10, "mag": 30, "reloadSpeedTier": 1 },
"30_rnd":  { "name": "30 Rnd",  "pts": 0,  "mag": 30, "reloadSpeedTier": 0 },
"53_rnd":  { "name": "53 Rnd",  "pts": 10, "mag": 53, "tacRldOverrideMs": 2667 }
```

`reloadSpeedTier` is explicit data, not inferred from the name. Its shared ladder constant is
`1.13`; tier 2 means `1.13²`. This kills the substring match and makes the nine
capacity-for-speed magazines correct by construction. `tacRldOverrideMs` is a machine-readable,
unit-explicit escape hatch limited to the registered animation exceptions.

The name is unreliable in **both** directions, which is why neither the display string nor the
measured ratio may drive classification:

- nine magazines carry the 1.13 multiplier with no "Fast" in the name ([§5.3](#53-magazine-multiplier-classes-measured));
- `PP-19 / 20Rnd Fast Mag` is named a fast magazine and is `reloadSpeedTier: 0`
  ([§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug)).

Keep magazine capacity, attachment-point cost, ADS-time shift, sprint-recovery shift, ADS-move
shift, display name, availability, and default selection inside the weapon-specific `WEAPON_MAG`
entry. Current magazine IDs are not global effect classes: reused IDs have weapon-specific tier
and cost variants. Do not move those fields into a broad global magazine catalog in this
migration.

### 4.3 Ergonomics

After equivalence validation, delete all 24 `magCatchRld` blocks. Add one multiplier to the
`ERGOS` catalog entry:

```jsonc
{ "id": "mag_catch", "name": "Mag Catch", "pts": 5, "reloadSpeedMult": 1.063 }
```

One number replaces 48 — 24 blocks of `{reg, fast}`, of which 39 slots carried a value and 9
`fast` slots were null.

### 4.4 Longer-term velocity, ammo and recoil targets

Only barrel velocity is in the first implementation scope. Normal ammo velocity and subsonic
velocity are separate contracts: do not force Subsonic into the ordinary `0.8^n` barrel/ammo
ladder.

- `BARRELS[*].velMult` → `velTierMod`, against a global `0.8` ladder constant in
  `balance_tables.json`, for normal velocity behavior only.
- Put a future subsonic value on the weapon-specific option, not the global `AMMO` catalog:
  `velocityTreatment: { kind: "subsonic-tier", subsonicVelocityTier: 3, displayRounding: "floor" }`.
  The absolute forms are `subsonic-absolute` with `subsonicVelocityMps`, and
  `subsonic-tungsten-absolute` with `combinesWith: "penetration"`.
- The 27 source-backed instances live in
  `outputs/attachment-audit/subsonic-velocity-treatments-20260731.json`. They do **not**
  authorize adding unverified availability, cost, or live resolver behavior to `data/ammo.json`.
  An unlisted subsonic option must fail validation rather than inherit a generic normal-ammo tier.
- Barrel-plus-subsonic precedence is not yet measured. A future resolver must remain fail-closed
  for that combination until direct evidence specifies the order.
- `adsRecoilTierMod` extends to grips and ammo; add a sibling `recoilVarTierMod`.

### 4.5 `sim/applyAttachments.js`

```js
const hasDerivedReload = magData?.reloadSpeedTier != null
  || magData?.tacRldOverrideMs != null
  || ergoData?.reloadSpeedMult != null;
const magMult = 1.13 ** (magData?.reloadSpeedTier ?? 0);
const ergoMult = ergoData?.reloadSpeedMult ?? 1;
const derivedTacRld = magData?.tacRldOverrideMs != null
  ? +(magData.tacRldOverrideMs / 1000).toFixed(3)
  : w.tacRld != null
    ? +(w.tacRld / (magMult * ergoMult)).toFixed(3)
    : null;
const legacyTacRld = magCatchTacRld != null ? +(magCatchTacRld / 1000).toFixed(3)
  : magTacRld != null ? +(magTacRld / 1000).toFixed(3)
  : w.tacRld;
const unresolvedOverrideStack = magData?.tacRldOverrideMs != null
  && ergoData?.id === 'mag_catch';

tacRld: hasDerivedReload && !unresolvedOverrideStack ? derivedTacRld : legacyTacRld,
```

Rounding must stay `toFixed(3)` applied **once, at the end**. Rounding an intermediate then
dividing again reproduces the game's numbers only by luck; the stacked KTS100 case
(`base / 1.13 / 1.13`) is the one that will expose a mistake here.

Keep this dual-read path while old and new data coexist. Delete the `magCatchRld` lookup,
per-magazine `tacRld`, and `isFastMag` name match only after exhaustive old-versus-new loadout
equivalence passes.

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
the aggregate/display value recorded by the audit (2.348, 1.784, 1.334). They form the explicit
tube-fed-shotgun category (`shell-by-shell-null` in the current importer) and remain null in the
scalar site fields until a shotgun-specific runtime contract exists.

**18.5KS-K is not shell-by-shell in game** — it feeds from box magazines (4Rnd/8Rnd), displays a
normal scalar reload, and follows the 1.13 rule. The importer policy and characterization test now
classify it as `scalar-numeric-or-null`, producing `tacRld: 2.75` and `emptyRld: 3.7` from the
pinned Sym row. Do not add it back to the tube-fed exception set.

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

### 5.4 Velocity — subsonic treatment registered

All 27 Subsonic / Subsonic HP / Subsonic Tungsten source rows were directly reviewed from their
velocity strips and are registered in
`outputs/attachment-audit/subsonic-velocity-treatments-20260731.json`. The generic normal-ammo
velocity ladder excludes only those exact source paths; a new or renamed Subsonic capture remains
an error until it has its own reviewed treatment.

| Treatment | Rows | Direct result |
|---|---:|---|
| `subsonic-tier: 1` | 2 P18 rows | `floor(350 × 0.8) = 280` |
| `subsonic-tier: 2` | 10 CZ3A1, KV9, PW5A3, SCW-10 and SGX rows | ordinary floor-rounded `0.8²` |
| `subsonic-tier: 3` | 10 PP-19, SG 553R, SL9, SOR-300SC and UMG-40 rows | ordinary floor-rounded `0.8³` |
| `subsonic-absolute` | 2 M417 A2 rows | 560 → **273 m/s** |
| `subsonic-absolute` | 2 USG-90 rows | 543 → **265 m/s** |
| `subsonic-tungsten-absolute` | 1 PW7A2 row | 576 → **341 m/s**, explicitly composite with penetration |

This is a unique subsonic treatment, not a fractional normal-ammo velocity tier. It resolves the
five former off-ladder errors without widening the normal ladder or guessing a runtime precedence.
There is no class split: SMGs span tier 2, tier 3, an absolute treatment, and the Tungsten
composite, while Carbines span tier 3 and an absolute treatment.

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

### 5.6 Recoil amount — shotgun false positives resolved by exact bases

The four source readings are correct, but their “off-ladder” classification is not. The old sweep
anchored the ladder to the one-decimal modal panel value. Using the hidden-precision weapon base and
the attachment's existing tier gives the displayed result exactly:

- DB-12 Ribbed Vertical / Canted Stubby: `2.708937326 × 0.94³ = 2.250` → **2.3°**;
- M87A1 Classic Vertical / Low-Profile Stubby: `3.611916435 × 0.94⁵ = 2.650` → **2.7°**.

No shotgun-specific recoil ladder or absolute override is needed. The Phase 0 sweep now anchors
recoil checks to `data/weapons.json` hidden-precision bases, and the four stale entries have been
deleted from `sweep-reviewed-exceptions-20260731.json`.

**The display-rounding contract — project-wide, not just this check.** Calculate from the
hidden-precision base, convert the result to the game's float32 display domain (`Math.fround`
equivalent), then apply round-half-up at the panel's decimal count:

```js
const display = (value, dp) => Math.round(Math.fround(value) * 10 ** dp) / 10 ** dp;
```

This is a display contract, not a tolerance; floor and round-half-even are not interchangeable.
Here `2.708937326026026 × 0.94³ = 2.2500000000000004` becomes float32 `2.25` and displays **2.3°**
for DB-12, while M87A1's hidden-base result is approximately `2.6508` and displays **2.7°**.

The rule was derived from that single knife-edge case, but
[§2.6](#26-sym-tier-table-cross-check--2026-07-31) confirms it independently against a different
stat at two decimals: Sym's exact `ADS Strafe` values reproduce all eight of our `ADS_MOVE_TIERS`
entries under it, and `0.825 → 0.82` / `0.475 → 0.47` fail under plain double rounding. Apply it
wherever a computed value is compared with a panel reading.

### 5.7 Fire-mode ergonomics

`SL9 / Ergonomics / Burst Mode` reads 771 RPM against a 675 base. This is **correct** — the
ergonomic changes the fire mode, so rate of fire legitimately changes. Any invariant check on RPM
must exempt ergonomics matching `/burst|full auto/i`. The sweep does this; a naive check reports
it as an error.

### 5.8 Named fast magazine without fast-mag treatment — suspected game bug

`PP-19 / 20Rnd Fast Mag` is named and described as a fast magazine but **does not receive the
1.13 reload multiplier in game**. This is believed to be an EA-side bug, not a model exception and
not a scrape error.

| | Reload | Panel indicator |
|---|---|---|
| PP-19 base (30Rnd Magazine) | 2.467 | — |
| PP-19 30Rnd Fast Mag | 2.183 | `▼2.183S` green |
| **PP-19 20Rnd Fast Mag** | **2.467** | **no arrow** |
| Model prediction for a fast mag | 2.183 | — |

Evidence: `39_PP-19_Magazine_20Rnd_Fast_Mag.png` shows `RELOAD TIME 2.467S` in plain white with no
change arrow, while `37_PP-19_Magazine_30Rnd_Fast_Mag.png` on the same weapon and the same panel
shows `▼2.183S`. The panel demonstrably renders the reduction when it exists. The 20Rnd option does
receive its other fast-mag-class effects — sprint recovery moves to 133 ms and ADS move to
`x1.00` — so only the reload multiplier is missing. PP-19 has not changed in game since
2026-07-20, which postdates the capture, so the screenshot is current.

**Treatment.** Record the captured value. `reloadSpeedTier: 0` despite the name, with an explicit
register entry rather than a silent per-magazine absolute:

```jsonc
"20_fast": {
  "name": "20Rnd Fast Mag", "pts": 5, "mag": 20,
  "reloadSpeedTier": 0,
  "suspectedGameBug": {
    "field": "reloadSpeedTier",
    "expectedWhenFixed": 1,
    "expectedReloadSeconds": 2.183,
    "observedReloadSeconds": 2.467,
    "observedOn": "2026-07-20",
    "note": "Named/described as a fast magazine but does not receive the 1.13 reload multiplier in game."
  }
}
```

**Revert trigger.** At every Sym drop or game patch, re-capture this one panel. If it reads
`2.183`, set `reloadSpeedTier: 1`, delete the `suspectedGameBug` block, and drop the sweep register
entry — no other change is needed. If it still reads `2.467`, leave it and record the re-check
date. The validator fails if `reloadSpeedTier: 0` is ever paired with a reload that matches
`base / 1.13`, so a silent in-game fix cannot sit unnoticed — and since 2026-08-01 it also fails if
the derived reload *departs from* `observedReloadSeconds` without reaching the expected-fixed
value, so an unexplained edit cannot sit unnoticed either. See [§7.6](#76-fail-closed-gate-repairs--2026-08-01).

This is also the sharpest justification for [§4.2](#42-magazines--shared-reload-tier-weapon-specific-option-data)
making the tier explicit data. The eleven unnamed 1.13 magazines show the display name can *omit*
a speed effect; this one shows it can *assert* an effect that is not there. The current
substring `isFastMag` match gets this magazine wrong today, and a Phase 4 migration that classifies
by name or by measured ratio would bake the wrong tier in permanently.

---

## 6. Migration

No phase may delete or rename a field before every current consumer can read both schemas. The
tracked screenshot review is a required characterization fixture, not an optional local input.

### Phase 0 — characterization tests and portable validation

**Completed audit prerequisite:** Terra session `019fb8ed-c9b5-7e20-8367-4c3590d4db8e` closed the
former §8.1–§8.3 data issues: impossible-zero and bulk table failures are corrected, duplicate
canonical records are removed with provenance retained, and field-by-slot discovery has
`unresolvedCount: 0`.

1. Track `scripts/audit-sweep.mjs` and `scripts/audit-field-slot-discovery.mjs`, make both resolve
   paths relative to the repository, separate pure checks from report writing, and run read-only
   in CI on Windows and other platforms. Require the tracked review JSON and path-specific
   registers/receipts; a missing fixture must fail rather than produce an empty register.
2. Change recoil-ladder validation to use each weapon's hidden-precision `recoilV` base rather than
   the rounded panel mode. Use the §5.6 float32 round-half-up display contract explicitly. Remove
   the four now-stale shotgun exception receipts. The pre-Phase-2b-i baseline reported 30
   informational rows with no errors or warnings; the current sweep reports 28 after the
   ADS-move migration.
3. Add characterization tests before changing runtime data. Cover the current scalar reload
   result for every weapon/magazine/ergonomic combination, the shotgun categories in
   [§2.3](#23-shotgun-specific-audit-pass), registered animation overrides, barrel velocity, and
   all current tier-table outputs.
4. Require the tracked `attachment-screenshot-review.json` fixture in CI. Do not silently skip the
   full-roster comparison in a clean clone.
5. Derive weapon class from the source path or the canonical weapon map—the record schema has no
   class field—and report shotguns separately without changing their reload policy.
6. Keep explicit impossible-zero checks in addition to null checks. A fully populated stat object is
   not clean when fields such as damage, sprint recovery, or ADS move contain sentinel zeroes.
7. Track and run `scripts/audit-field-slot-discovery.mjs`; require its current
   `unresolvedCount: 0` receipt before assigning tier fields or consolidating catalogs.
8. Apply [§8](#8-audit-status--2026-07-31) only to columns used by the phase being implemented.
   Fail closed on unresolved values instead of widening tolerance.

### Phase 1 — importer correction and `ReloadSpeed` — completed 2026-07-31

1. **Completed prerequisite:** remove `18.5KS-K` from the tube-fed shotgun null policy and pin its
   scalar `2.75` / `3.7` importer characterization.
2. **Completed:** `normalizedReloadFields()` reads `reload.ReloadSpeed`, defaults it to 1.0 only
   when absent, fails closed for invalid present values, and emits `tacRld = ReloadLeft /
   ReloadSpeed`, `emptyRld = ReloadEmpty / ReloadSpeed`, and `reloadSpeed`. Only the three tube-fed
   shotguns retain both scalar timing fields as null; `18.5KS-K` remains scalar at `2.75` / `3.7`.
3. **Completed:** removed `reload.ReloadSpeed` from `EXCLUDED_SOURCE_FIELDS` and mapped it to the
   live field.
4. **Verified:** the importer changes base reload timing on exactly these 15 non-1.0 records:
   `AK-205`, `L85A3`, `M240L`, `M277`, `M4A1`, `M60`, `NVO-228E`, `PP-19`, `PW7A2`, `SCW-10`,
   `SG 553R`, `SL9`, `TR7`, `USG-90`, and `VCR-2`; all 59 live records carry `reloadSpeed`.
   PP-19 receives only the Phase 1 reload-field promotion because its other live fields are
   separately curated.

### Phase 1b — PP-19 attachment backfill

PP-19 shipped from Sym data before its attachments were captured, so it is a stub in **all three**
per-weapon catalogs: `WEAPON_ATTS.pp19` has five empty slot arrays, `WEAPON_ERGO.pp19` is
`{ "avail": [] }`, and `WEAPON_MAG.pp19` is `{ "def": null, "mags": {} }`. It is the only weapon
with no selectable attachments.

This must land before Phase 4, because two later gates are silently vacuous without it:

- **Phase 5** names PP-19 as a required equivalence case; enumerating "every valid currently
  selectable loadout" for a weapon with no attachments yields one loadout and proves nothing.
- **Phase 0 step 3** claims characterization covers "every weapon/magazine/ergonomic combination,"
  and its test passes — but that test iterates the audit review JSON, not `data/attachments.json`,
  so it never notices that the site data cannot produce those combinations.

The 51 captured PP-19 records cover Muzzle 7, Barrel 4, Grip 13, Laser 7, Light 4, Magazine 5,
Ergonomics 3, Ammo 7, and one Overview. Backfill the seven slots the current schema supports; Ammo
stays out because there is no `WEAPON_AMMO` catalog and its schema is a deferred prerequisite, which
leaves PP-19 with the same ammo gap every other weapon has.

The completed backfill was purely **additive** relative to the stub baseline: it added the first
selectable PP-19 loadouts without changing any other weapon. Its source mapping, captured values,
known legacy limitation, and verification evidence are retained in Appendix A.

The Phase 0 characterization test now asserts per-weapon attachment-catalog coverage against
`data/attachments.json`, so a stubbed weapon can never again pass as covered.

**Completed 2026-07-31.** PP-19 now has the seven supported attachment-slot catalogs: six muzzle,
four barrel, twelve grip, six laser, three light, two ergonomics, and five magazine entries. The
name-to-ID mapping uses existing global catalog IDs only; `barrelDef` is `basic`, and the magazine
baseline was `defAds / defSpr / defAms = 3 / 3 / 3` on the then-current 1-based convention with
`30_rnd` selected by default. Those stored values are now **2 / 2 / 3**: 2b-i incremented every
`defAms`, then 2b-iv made all three fields 0-based. The resolved panel readings are unchanged.
`magCatchRld`
is `{ reg: 2321, fast: 2054 }`, and the five legacy magazine reload values are `2467`, `2183`,
`2467`, `2467`, and the registered `2667` ms drum override. The `20Rnd Fast Mag` audit record was
corrected from the model-predicted `2.183` to its screenshot value `2.467`, with the fabricated
reload comparison removed.

The backfill itself did not add `adsMoveSpeedTierShift` to any shared grip entry. PP-19 uses the
standard SMG IDs `6h64_vert`, `classic_vert`, `stipp_stubby`, and `lp_stubby`, so those four grip
readings sat at `0.75` until [Phase 2b-iii](#2b-iii--grip-ads-move-shift) landed the `+1` shift on
the shared entries. Four weapons — `SVK-8.6`, `VSSM`, `18.5KS-K`, and `DB-12` — also use the
standard IDs but show no shift; 2b-iii resolved them with suffixed clones.
The eight weapons without ergonomics catalogs are explicit coverage exemptions, and Ammo remains
out of scope.

### Phase 2 — dual-read runtime support (completed 2026-07-31)

1. Teach `sim/applyAttachments.js` to prefer `reloadSpeedTier`, `reloadSpeedMult`, and
   `tacRldOverrideMs` when present, while preserving the existing `tacRld`, `magCatchRld`, and
   display-name fallback for legacy records.
2. Add telemetry/test assertions showing which branch each fixture uses. Missing derived fields
   must select the legacy path, not silently behave like a zero tier.
3. Keep override-plus-Mag-Catch combinations on the legacy path until their precedence is captured
   in game or explicitly prohibited by validation.

**Completed 2026-07-31.** A narrow resolver selects the derived branch only when an explicitly
present derived field selects it; otherwise it exactly preserves legacy Mag Catch, per-magazine,
and weapon-base precedence. Unsupported override-plus-Mag-Catch combinations remain legacy. No
production attachment record has a derived field yet, so all **1,024** current selectable
magazine/ergonomic cases remain legacy and retain their prior tactical reload result. Focused
coverage exercises numeric tiers 0/1/2, ergonomic multiplication, override-only, invalid inputs,
and the synthetic PP-19 20 Fast + Mag Catch result of 2.321 s. Completion gates at that
pre-Phase-2b-i point: 50/50 tests, 59/59 data validation, the 30-info/0-warning/0-error audit
sweep, and 24 confirmed/0 unresolved field-slot findings.

### Phase 2b — tier-table corrections

Three independent corrections from [§2.6](#26-sym-tier-table-cross-check--2026-07-31), grouped
because they share one hazard: each shifts stored indices or changes resolved output for many
weapons at once. All are independent of the reload migration. Do them after Phase 2 so a Phase 5
equivalence diff has one possible cause, not two, and land each as **its own commit**.

Confirm every ladder against real Sym data before editing `balance_tables.json`. The §2.6 source is
a community post; its claims are corroborated by our own readings, but the tables themselves are
not yet first-party.

#### 2b-i — ADS-move `1.0` tier (completed 2026-07-31)

1. Prepend `1.0` to `ADS_MOVE_TIERS`.
2. Increment all 59 populated `WEAPON_MAG[*].defAms` values by one. Leave every `adsMoveSpeedTierShift`
   untouched — the shifts are relative and must not move.
3. Set only CZ3A1 `20_fast` and PP-19 `20_fast` to `adsMoveSpeedTierShift: -3`. `-3` is in range: the existing
   shift distribution is `{-3:1, -2:31, -1:7, 0:133, 1:86, 2:1, 3:1}`.
4. **Gate:** preserve a before snapshot of all 260 pre-PP-19 magazine loadouts. Phase 1b added five
   PP-19 entries, so the current catalog contains 265. The table/index remap alone (prepend plus
   every defAms increment, before the two explicit overrides) must produce **zero** output changes
   across all 265 entries, including the documented 260-row set. After the two source-backed -3
   overrides, the final diff must contain **exactly two** changes: CZ3A1 and PP-19 20_fast change
   only their ADS-move result to 1.0. Any other difference means an index was missed or an unrelated
   behavior changed.
5. Delete the two ADS-move entries from `sweep-reviewed-exceptions-20260731.json`; the sweep falls
   from 30 to 28 informational rows.
6. Sym also lists `0.37` and `0.325` below our floor. An operator in-game capture dated
   2026-07-31 now provides first-party evidence for `0.37`: L110 + 200-round belt box + 6H64
   Vertical reads `X0.37`. It is appended to `ADS_MOVE_TIERS`; `0.325` remains unsourced and
   out. The `0.37` entry is therefore source-backed, not added merely to satisfy a composed case.

**Completed 2026-07-31.** `ADS_MOVE_TIERS` now begins with `1.0`; all 59 populated `defAms`
values were incremented exactly once. The reindex-only context was output-identical across all 265
current magazine entries, including the 260 pre-PP-19 entries. The final live-data diff contains
only CZ3A1/`20_fast` and PP-19/`20_fast`, each changing only `_adsMoveSpeedMult` from `0.75` to
`1.0`. The two source-backed exception rows were removed, leaving 28 informational sweep findings;
no global grip shift was added. The later Step A append of `0.37` is separately source-backed by
the operator's 2026-07-31 in-game L110 composed capture; `0.325` remains out.

#### 2b-ii — sprint-recovery phantom entries

**Completed 2026-07-31.** Removed `333` from `PRIMARY_SPRINT_REC_TIERS` and `117` from
`SIDEARM_SPRINT_REC_TIERS`. Neither phantom value occurs in the 3,115 source sprint-recovery
readings. The source-backed re-derivation changed nine magazine sprint shifts from `+2` to `+1`:

- primary 350-ms records: `l110/200_rnd`, `m121a2/100_rnd`, `m123k/200_rnd`, and `m250/100_rnd`;
- sidearm 133-ms records: `ggh22/20_rnd`, `ggh22/22_rnd`, `m45a1/11_rnd`, and `p18/21_rnd`;
- sidearm 167-ms record: `vz61/20_rnd`.

No `defSpr` values changed: every base reading still maps to the same 1-based stored base index
after the new ladder is considered. The tracked
`scripts/sprint-rec-phase2b-ii-baseline.json` pins both sides of the transition for all 70,634
bounded timing-effective cases, including the full migration diff list.

The revised gates pass:

- **Source fidelity:** all 3,115 source sprint readings remain on the new tables, with zero
  off-table readings; `validate-data.mjs` remains 59/59 and `audit-sweep.mjs` remains 28 info,
  0 warnings, 0 errors. The 151 phantom occupants are explicitly source-disposed: 135 primary
  cases become 300 (the 350 belt-box / 233 negative-grip evidence) and 16 sidearm cases become
  100 (the 133 large-magazine / 67 Speed Holster evidence).
- The 12 `l110/200_rnd/{full_angled,slim_angled,slim_handstop}/rail_cover/{frangible,hollow_pt,penetration,standard}` cases move from 300 to 267 as the source-correct re-derivation crosses the deleted 333 rung.
- **No new clamps:** the 40 pre-existing sprint clamp case keys are identical before and after.
  Deploy clamps decrease from 522 to 435, with no new deploy-clamp keys; 87 former deploy clamp
  keys leave the upper bound.
- **Enumerated diff:** 255 unique composed cases change value: 163 sprint-recovery values and
  108 deploy-time values. Every case, old/new raw index, old/new clamped index, value, and
  re-derivation cause is committed in the fixture.

Deploy time reuses the sprint magazine shift in the current resolver, so the nine source-backed
sprint re-derivations also change 108 composed deploy outputs. The audit corpus has no deploy-time
source field to contradict those changes; this is recorded as a model-coupling concern for the
later hardening work rather than distorting the source-correct sprint shifts.

#### 2b-iii — grip ADS-move shift

`6h64_vert`, `classic_vert`, `stipp_stubby` and `lp_stubby` shift ADS move by `+1` on 45 of 49
source-complete standard-grip weapons, with VZ. 61 providing an additional composite-grip source
reading, but no `GRIPS` entry defines `adsMoveSpeedTierShift`, so the resolver's
`grp.adsMoveSpeedTierShift ?? 0` currently returns 0 for all of them. Every one of those 45 weapons
is wrong against its panel today.

Add `adsMoveSpeedTierShift: 1` to the four catalog entries. This is **not** a per-weapon override
and needs no schema or resolver work: where a grip genuinely differs by class, the catalog already
uses a suffixed variant ID — `lp_stubby_sr` (referenced by exactly `m2010esr`, `sv98`, `psr`,
`miniscout`, `l115`), `slim_angled_smg`, `full_angled_sr`, and per-weapon forms such as
`factory_angled_sl9`. Follow that pattern for any divergence.

Four weapons — `SVK-8.6`, `VSSM`, `18.5KS-K`, `DB-12` — use the standard grip IDs yet show no
ADS-move shift, and are not explained by an existing variant. Two are shotguns and one is a
source-only weapon; resolve them with new suffixed variants before this lands, and do not
generalise from them. VSSM is source-covered but remains outside the 59-weapon runtime catalog.

Because this changes resolved output for 44 live weapons (45 source-complete standard-grip weapons,
with EF88 and BROD 3 source-only, plus the separately source-backed VZ. 61 composite grip), it must not ride along in
[Phase 1b](#phase-1b--pp-19-attachment-backfill), whose whole value is being purely additive.

**Completed 2026-07-31.** Step B added `adsMoveSpeedTierShift: 1` to the four shared grip entries.
The source-backed exceptions use suffixed clones without the shift: `*_svk86` referenced by
`svk86`, `*_ks18k` referenced by `ks18k`, and `*_db12` referenced by `db12`; the corresponding
`*_vssm` definitions are retained for source-only VSSM, which has no `WEAPON_ATTS` entry.
The full 70,634-case transition changes 15,680 composed cases across 44 live weapons; SVK-8.6,
18.5KS-K, DB-12, and source-only VSSM are excluded. VZ. 61 is included because its composite
`Stippled Stubby` panel reads `0.67` versus `0.75` for None.

The tracked ADS-move fixture anchors the pre-Phase-3 digest at
`c5a6c3d2c021a44dd04fd3e5bed4366a40674aca1c6e15e6578620be7049b5fe` and pins the post-transition
full digest and changed-case digest. The mirror-versus-resolver check passes for every case.
ADS-move clamps are zero; the 40 sprint clamp keys remain identical by identity, and deploy
clamps remain 435 with no new keys. The first-party L110 composed panel reproduces ADS move
`0.37`, sprint recovery `350 ms`, ADS time `500 ms`, and tactical reload `6.500 s`. The source
gates remain 59/59 validation, 28 info / 0 warn / 0 err audit sweep, and unresolved 0.

#### 2b-iv — index-base hardening

**Completed 2026-07-31.** All 59 `WEAPON_MAG` base indices were converted from 1-based to 0-based:
`defAds`, `defAms`, and `defSpr` each decreased by exactly one. `defAds` was included even though
the original item named only `defAms` and `defSpr`, because all three fields used the identical
`(value - 1)` resolver compensation; leaving ADS time on the old convention would preserve the
same representation inconsistency this hardening removes. The resolver now consumes all three
stored values directly, while retaining its runtime clamps as a last line of defence.

The bounded 70,634-case Phase 3 timing enumeration is strict zero-diff after the representation change:
the full SHA-256 digest remains
`08d8da9b78ad0429f292e60ee8808874c9f54b41a4612227d91b09e6b290ad29`, all 59 per-weapon digests
remain identical, and every raw index, resolved value, and clamp flag is unchanged. Clamp identity
also remains exact: 40 sprint lower-bound case keys, 435 deploy upper-bound case keys, zero ADS-move
clamps, and zero ADS-time clamps.

`scripts/validate-data.mjs` now fails loudly unless every stored base index is an integer in
`[0, table.length - 1]`, selecting the primary or sidearm sprint table through the same
`sprintRecoveryTierTable` rule as the resolver. A temporary out-of-range mutation was rejected by
the validator and then restored. The 40 sprint cases with composed raw index `-1` and the 435
deploy upper-bound cases remain pre-existing findings, not base-index failures: a valid base plus
an attachment shift can still compose outside a table. Resolving them requires source-backed
base/shift model work and is outside 2b-iv. The recommended later hardening is to turn runtime
clamping into a diagnostic assertion (or a development-mode throw) after those composed cases are
source-resolved; production clamping remains in place for now as a safety boundary.

The implementation plan was to make `defAms` and `defSpr` 0-based in the same pass, with a validator asserting each
against its table length. `balance_tables.json` already has this shape in `HIP_SPREAD_BASE_IDX`. A
hand-maintained 1-based index that must stay in lockstep with a table length is a silent-failure
hazard: one weapon added with an old-style index shifts every stat by a tier with nothing to catch
it — which is exactly how the two phantom entries in 2b-ii survived.

### Phase 3 — schema, shared reload tier, and exception register — completed 2026-08-01

**Gate state at Phase 3 entry (verified at HEAD `6936036`):** `node --test` 65/65 pass, 0 skip;
`validate-data.mjs` 59/59; `audit-sweep.mjs` 28 info / 0 warn / 0 error over 3,115 stat rows;
reload evidence re-measured at 91/92 fast-mag and 27/27 Mag Catch, the single miss being the
registered PP-19 screenshot exception.

1. Add the shared `1.13` magazine-speed ladder constant and the `reloadSpeedTier` integer.
2. Add `reloadSpeedMult: 1.063` to Mag Catch.
3. Define machine-readable animation exceptions keyed by weapon ID and magazine ID, using
   unit-explicit `tacRldOverrideMs`. Validate IDs, integer millisecond units, and membership in the
   exception register.
4. Preserve weapon-specific magazine capacity, point cost, ADS-time shift, sprint-recovery shift,
   ADS-move shift, availability, and default selection.
5. Validate `reloadSpeed`, tier bounds, and recomputed screenshot values with a 0.005-second
   display tolerance. Any unregistered miss is an error requiring review.
6. Add the `suspectedGameBug` block from [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug)
   to the schema, and assert its invariant: a magazine carrying one must **not** currently match its
   `expectedReloadSeconds`. That way an in-game fix fails the build instead of sitting unnoticed
   behind a stale tier.

#### Prerequisite — the regression instrument does not cover reload

**Do this before touching reload data.** The 70,634-case fixture built across 2b-ii/2b-iii/2b-iv
pins sprint recovery, ADS move, ADS time and deploy. It does **not** enumerate composed tactical
reload, so a Phase 3/4 change that moves a resolved reload value produces a clean digest and no
failing test. That is precisely the Phase-1 situation that motivated the fixture in the first
place; the instrument must cover the column being migrated *before* the migration, not after.

Build the reload-aware baseline over the same enumeration and pin, per case: resolved tactical
reload in ms, which resolver branch was selected (`magCatchTacRld` → `magTacRld` → `w.tacRld`
legacy versus derived), the tier integer, the multiplier, and whether an override was in force.
Branch identity matters as much as the value: the dual-read resolver from Phase 2 can return the
right number down the wrong path, and Phase 6 deletes the legacy path.

#### Exception-register contract — current tooling shape

The Phase 3 register wants **weapon-ID / magazine-ID keys with integer millisecond units**. The
existing tooling is the other shape: `RELOAD_ANIMATION_OVERRIDES` in
[audit-phase0-lib.mjs:20-30](scripts/audit-phase0-lib.mjs:20) is keyed by
`"<display weapon name>/<display attachment name>"` with float **seconds** values, and
`RELOAD_SCREENSHOT_EXCEPTIONS` immediately below it uses the same key shape. Phase 3 either
converts both or maintains a mapping; leaving two key conventions in place reintroduces the
display-name matching this migration is trying to delete.

Count the register carefully: there are **four** animation-override records but **five** map
entries, because M240L's 75Rnd and 100Rnd Belt Boxes both take 7.100. The [§5.1](#51-magazines-that-change-the-reload-animation)
table is per-record; the code map is per-magazine. A validator asserting "register size" must say
which one it means.

`PP-19 / 20Rnd Fast Mag` is a *separate* register from the animation overrides and must stay
separate — it is the `suspectedGameBug` case, not an override. It is still the single miss behind
the 91/92 fast-mag figure in [§2.1](#21-reload), re-verified at Phase 3 entry.

#### Carried-forward risks — none block Phase 3

The 40 sprint lower-bound clamps and 435 deploy upper-bound clamps from 2b-iv are pre-existing
composed-index findings, and the deploy/sprint coupling at
[applyAttachments.js:311](sim/applyAttachments.js:311) — deploy reuses the magazine *sprint* shift
— is a model-coupling concern for later hardening. Neither interferes with reload, **provided
Phase 3 leaves sprint fields alone and keeps deploy in the regression baseline.** If Phase 3 ever
needs to touch a sprint shift, that coupling silently moves deploy output too.

### Phase 4 — additive reload-data migration — completed 2026-08-01

Populate `reloadSpeedTier`, `reloadSpeedMult`, and `tacRldOverrideMs` without deleting legacy
`tacRld` or `magCatchRld`. The migration may classify only the known 1.0 / 1.13 / 1.13² groups and
registered overrides. Emit an exact, reviewable before/after manifest from the current HEAD.

**Do not classify by display name or by measured ratio alone.** `PP-19 / 20Rnd Fast Mag` measures
at exactly 1.0 and is named a fast magazine; both signals disagree, and only the screenshot
resolves it. Any magazine whose name and measured class conflict must halt the migration for a
human decision rather than defaulting either way. Requires [Phase 1b](#phase-1b--pp-19-attachment-backfill),
without which PP-19's five magazines are not in the site data to classify at all.

### Phase 5 — reduced old-versus-new equivalence/separability witness — completed 2026-08-01

Represent every currently selectable attachment dimension across reduced separability witnesses,
including point-limit and combined-slot rules. Run the legacy and derived resolvers over the same
inputs and compare every witness's user-visible output, not only reload. Require zero unexplained
differences. Include explicit cases for AK-205, SL9, KTS100 MK8, M60, M240L, PP-19, `18.5KS-K`,
and all three tube-fed shotguns.

**As built, and why it is a reduced separability witness.** The literal product is 525,687,124
selectable cases, which is not a viable standing test. The fixture retains that raw count and the
point distribution, but compares 88,694 reduced witnesses: a baseline crossing every magazine and
ergonomic choice, then one suite at a time crossing every choice in each remaining slot while
holding the other non-reload slots at representatives. Every individual slot choice, combined-slot
role, ammo, magazine and ergonomic is therefore run through the complete resolver output. Only
products varying two or more *non-reload* slots simultaneously are omitted, and those cannot move
either migrated property because reload resolves from weapon/magazine/ergonomic alone and velocity
from the barrel alone.

That separability argument is the load-bearing part of the claim, so as of 2026-08-01 it is
executed rather than asserted — see [§7.6](#76-fail-closed-gate-repairs--2026-08-01) — and it has
been checked against the game corpus, not only the resolver, in
[§7.7](#77-executable-check-results--2026-08-01). This paragraph is the precise coverage claim:
the suite is reduced, not the literal legal attachment Cartesian product.

### Phase 6 — reload cutover and cleanup — completed 2026-08-01

The derived branch is authoritative. The resolver now computes normal reloads as
`weapon.tacRld / (1.13 ** reloadSpeedTier * reloadSpeedMult)` and override reloads as
`tacRldOverrideMs / reloadSpeedMult`, rounding once at the displayed three-decimal boundary.
The PP-19 `53Rnd` drum plus Improved Mag Catch composes to `2.509 s` from the first-party
operator receipt `outputs/attachment-audit/apply-20260801-pp19-override-mag-catch-recapture.mjs`.
That receipt is explicitly composed-loadout evidence, not a single-attachment panel.

All 265 per-magazine `tacRld` fields, all 24 per-weapon `magCatchRld` blocks, and the resolver's
display-name fast-mag inference are deleted. Invalid scalar bases fail closed, so DB-12, M1014,
and M87A1 remain blank rather than surfacing a per-shell or aggregate legacy number. The validator
rejects either legacy representation if reintroduced.

The reload baseline now records the post-cutover digest while retaining the pre-migration digest.
The reduced attachment witness fixture retains the pre-cutover Phase 5 difference digest (`578` witness
differences) and records the post-cutover result (`658` witness differences: those same six keys
plus the single new PP-19 override-stack key, repeated across its separability witnesses). Its
comparison normalizes the three tube-fed shotguns to the explicit scalar-null contract while
retaining their historical values in the transition record.

### Phase 7 — barrel velocity as a separate migration — completed 2026-08-01

Barrel velocity is a signed tier on the `0.8` ladder. The migration found that 20 weapon/barrel
pairs displayed a velocity 1 m/s high, because the resolver rounded where the game floors; display
now floors. `velMult` removal remains deferred, as does ammo velocity — see the deferred list
below, and [§7.7](#77-executable-check-results--2026-08-01) for why subsonic is an unimplemented
feature rather than an unmodelled coupling.

The original plan follows. Treat barrel velocity as its own small change after reload is stable: add the `0.8` constant,
dual-read `velTierMod` with legacy `velMult`, populate the seven barrel tiers, verify all 94 changed
barrel records, then remove `velMult` in a later cleanup commit. Do not combine this with ammo velocity,
and do not use it to consolidate the broader barrel catalog. First inventory and preserve every
other barrel-driven effect; the current audit contains multiple barrel records whose sprint
recovery differs from the weapon modal baseline even though the current attachment schema does not
model a barrel sprint-recovery shift.

### Deferred independent migrations — subsonic, ammo catalogs, magazines, and recoil

Do not implement these as part of the reload or barrel-velocity migrations. Resume only after:

- `WEAPON_AMMO` has an explicit schema that separates point cost from weapon-specific effects;
- ammo/muzzle/barrel precedence for velocity and spotting is specified and captured;
- override-plus-ergonomic reload precedence is resolved;
- exact recoil tier integers and the canonical field name are sourced;
- any broader magazine catalog proves that weapon-specific movement, ADS, cost, and availability
  data remain lossless.

Subsonic is its own future resolver path, not an extension of normal velocity. The 22 tiered rows
may reuse the `0.8` arithmetic internally, but the four M417 A2/USG-90 absolute rows and PW7A2
Subsonic+Tungsten composite remain weapon-ammo-specific. Do not add `273`, `265`, or `341` as
members of a global velocity ladder, and do not add fractional normal tiers. The M417 A2 and
USG-90 ratios are both near `0.488` despite belonging to different classes; that is weak evidence
for a named subsonic profile, not for a class ladder. Keep the absolute form until more weapons or
source data establish the profile and its rounding/stacking precedence.

---

## 7. Validation

The scrape is a test fixture, not a data source. Run three checks, not one:

1. **Value check** — does the reading match the model? This caught eight of the nine reload errors
   in [§2.1](#21-reload) and the 22 recoil-variation errors in [§2.2](#22-tier-ladders).
2. **Cross-field consistency** — does the capacity in the attachment *name* match the record's
   `magazineSize`? Does the same name appear twice for one weapon with different stats? This needs
   no model at all, and it is what catches a mislabel like the RPK-74M 36Rnd, where the value was
   right and the *name* was wrong.
3. **Field-by-slot consistency** — for each stat, identify every slot that changes it and compare
   that inventory with the runtime resolver. This must discover effects before migration rather
   than assuming, for example, that only magazines, grips, and ergonomics change sprint recovery.
4. **Name-versus-effect consistency** — flag every magazine whose display name implies a speed
   effect it does not have, and every magazine that has one its name does not imply. Both
   directions occur: eleven unnamed 1.13 magazines, and the `PP-19 20Rnd Fast Mag` in
   [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug). A hit is a
   request for a screenshot read, never a licence to rewrite the value.

Checks 2, 3 and 4 are worth running across every stat column, not just reload. If magazine names
were misread once, they were misread elsewhere, and every other stat inherits the same wrong label.

**Check 1 may never rewrite a reading on its own.** A disagreement between the model and the panel
is a request to go read the screenshot, and the screenshot wins. The one time this was inverted —
rewriting `PP-19 / 20Rnd Fast Mag` to the model's prediction because it "read exactly the base" —
the model was wrong and the scrape was right, and the resulting record was invisible to every
subsequent sweep precisely because it now agreed with the model.

Manual stat-card QA after the runtime phase. The first group pins the analytical cases — one
weapon per interesting property, chosen so that a value which must *not* move is watched as
closely as one that must. The second group covers the figures this migration changed.

Structural cases:

- a `ReloadSpeed = 1.0` weapon with a fast mag (GRT-BC → 2.500 / 2.212)
- SL9, the only `ReloadSpeed > 1.0` weapon (base 2.650, Mag Catch 2.493)
- KTS100 MK8 45Rnd Fast, the sole `1.13²` magazine (2.545)
- `18.5KS-K` regular/fast magazines (2.750 / 2.434)
- M240L across all three magazines (4.250 / 7.100 / 7.100)
- each tube-fed shotgun: reload stays blank — never `null` text, `NaN`, `undefined`, a raw
  millisecond integer, or Sym's per-shell 0.866 / 0.400 / 0.700

Changed-value cases:

- AK-205 and the six Mag Catch backfills: L115, P18, ES 5.7, M45A1, GGH-22, and VZ. 61
- PP-19, including `53Rnd + Mag Catch = 2.509 s`
- LMR27, SV-98, M4A1, M277, and RPK-74M

`scripts/reload-phase6-stat-card-qa.mjs` executes both groups and asserts the rendered string, not
only the resolved number.

### 7.6 Fail-closed gate repairs — 2026-08-01

A review of the completed Phase 3–7 work found four gates that passed when they should have failed
closed. None had produced a wrong number yet; each would have accepted one silently. All four are
fixed and each is covered by a test that was verified to discriminate — the gate was disabled and
the test observed to fail, one gate at a time.

| Gate | Accepted before | Now |
|---|---|---|
| Reload override ⇔ register | Only that a register *key* existed | Values must match exactly; a dangling register record is also reported |
| `reloadSpeedTier` bound | Any non-negative integer | `[0, 2]`, citing the Phase 4 contract; `suspectedGameBug.expectedWhenFixed` too |
| `suspectedGameBug` staleness | Only the derived value *reaching* `expectedReloadSeconds` | Two-sided — leaving `observedReloadSeconds` is an unexplained drift |
| Phase 5 separability | Nothing; the premise was fixture prose | A standing test asserts the invariance |

The override gate mattered because the millisecond value is carried in **two** files: the runtime
reads `data/attachments.json` while screenshot validation reads the register. Editing either left
both gates green while the site rendered a number the screenshot gate believed it had validated.

The staleness gate mattered because [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug)
is the one record this document warns was once rewritten to match the model. Setting its tier to 2
yields 1.932 s — neither the observed 2.467 nor the expected-fixed 2.183 — and the old guard
accepted it. `observedReloadSeconds` is now also reconciled against the screenshot register, the
same two-source problem as the overrides.

The separability repair is the substantive one. Phase 5 compares 88,694 reduced witnesses against
525,687,124 raw selectable cases. That reduction is sound — reload resolves from weapon, magazine
and ergonomic alone, velocity from the barrel alone, and those dimensions stay fully crossed — but
the premise existed only as prose in the fixture. A future change coupling a muzzle or an ammo
choice to reload would have made that prose quietly false with every gate still passing. The
premise is now executed: reload output must be invariant across every non-reload slot, velocity
across every non-barrel slot. Verified by injecting an ammo-to-reload and a muzzle-to-velocity
coupling and observing both fail.

### 7.7 Executable check results — 2026-08-01

The four checks above were run as executable gates rather than described procedures. Findings are
inventoried, pinned, and deliberately unresolved: each inventory is generated by a committed
deterministic script and pinned by an assertion, so a **new** finding fails the suite and a
**vanishing** one fails too. A finding that disappears silently is the same invisibility problem
[§7](#7-validation) describes.

**Check 1 — value check.** For `adsTimeMs`, `sprintRecoveryMs` and `adsMoveSpeedMultiplier` the
check only asked whether a reading was a *member* of the correct ladder. A value on the wrong rung
of the right ladder passed, so three of the model's seven columns had a check that could not fail
for the error it existed to catch. It now predicts from base index plus tier shift. That surfaced
**74 disagreements across 27 weapons**, recorded in
`outputs/attachment-audit/model-tier-mismatch-inventory-20260801.json`.

Six sit on rows marked `reviewed`, and their panels were read directly. The result is why this
section forbids resolving a disagreement by rule:

| Weapon / magazine | Field | Game panel | Site | Corpus | Wrong side |
|---|---|---|---|---|---|
| PSR 7Rnd | ADS time | 300 | 367 | 300 | site |
| PSR 10Rnd | ADS move | 0.47 | 0.54 | 0.47 | site |
| M2010 ESR 8Rnd | ADS move | 0.47 | 0.54 | 0.47 | site |
| SV-98 10Rnd | ADS move | 0.54 | 0.67 | 0.54 | site |
| M2010 ESR 8Rnd | ADS time | 300 | 300 | 250 | corpus |
| M2010 ESR 5Rnd Fast | ADS time | 300 | 300 | 250 | corpus |

Four are live site errors and two are corpus transcription errors. Correcting either side by rule
would have broken working data. PSR 10Rnd and SV-98 10Rnd are *default* magazines, so those are
wrong base indices rather than per-magazine shifts. Because a third of the adjudicated sample is
corpus-side, the check reports at `warn` rather than accusing the data. The remaining 68 are
unadjudicated and need operator captures.

**Check 2 — cross-field consistency.** The name-capacity half matched only names containing `Rnd`,
so six shell-named shotgun rows were never checked at all. Shell names are now parsed with the two
tube conventions encoded as rules rather than whitelisted: a tube label excludes the chambered
round, and DB-12 carries two tubes and two chambered rounds. An error of any other size still
fails. The duplicate-identity half already spanned all nineteen stat columns; that list is now
pinned so a column cannot be dropped from the comparison silently. Zero findings.

**Check 3 — field-by-slot consistency.** The existing discovery pass checked seven fields against
modal values and never inspected the resolver, so it could not answer the question this section
poses. Both inventories are now derived independently — the corpus side from the screenshot
records, the resolver side by varying each slot through `applyAttachments` — and compared per stat
column, with all 59 asymmetries pinned in
`outputs/attachment-audit/field-slot-asymmetry-inventory-20260801.json`.

This was run specifically to test the Phase 5 separability premise against the *game*, not merely
against the resolver. Both halves hold. Reload's two inventories are exactly `Ergonomics` and
`Magazine`. Velocity holds for the implemented surface: the corpus shows ammo changing velocity,
but no selectable ammo type carries a velocity field and there is no subsonic ammo id at all —
`bulletVel` is 708 for AK-205 across every selectable ammo. Subsonic is an unimplemented feature,
not an unmodeled coupling.

One asymmetry was adjudicated. The corpus recorded five grips changing muzzle velocity, which is
implausible on its face. The `18.5KS-K Alloy Vertical` panel reads 400 M/S against the corpus's
500, and the grip is displayed *locked* — so it was never equipped and the panel was showing the
weapon baseline. A confirmed corpus transcription error, the same failure mode as Check 1. Four
others share the signature and remain unread. Twenty barrel sprint-recovery rows are the documented
Heavy Ext deferral in `docs/BARREL_VELOCITY_PHASE7_INVENTORY.md`, not new findings. Thirty-nine are
out of scope because the site renders derived equivalents rather than the raw corpus bar columns.

**Check 4 — name-versus-effect consistency.** Now executable in both directions. Eleven magazines
carry `reloadSpeedTier: 1` without a name implying it — this document previously said nine.
Five are named for speed without the tier; `PP-19 20Rnd Fast Mag` is detected and *explained* by
its register entry rather than suppressed, which is what the two-sided staleness guard in §7.6
exists to protect. The other four are annotated with structural context: M1014 and M87A1 are
tube-fed and carry no scalar reload at all under the Phase 6 contract, while M44 and M357 Trait are
scalar revolver reloads where tier 0 does apply. None is suppressed — a screenshot read is still
what would settle whether a speedloader confers an effect the model does not represent.

Extending name-versus-effect to the handling stats was assessed and **declined**: attachment
descriptions are prose, combine several effects, and carry OCR noise, so they cannot be mapped
reliably onto tier ladders. A check that fires on prose ambiguity is worse than no check.

The check also surfaced something that is not a name-versus-effect disagreement at all:
`SOR-556 MK2 / 45Rnd Magazine` is a supported magazine whose screenshot is mapped in the corpus but
which has no live `WEAPON_MAG` or Phase 4 manifest entry. That coverage hole made the magazine
invisible to Check 1's prediction sweep as well. It is filed under its own check and inventory
rather than buried in a consistency count, and it needs catalog mapping review, not a recapture.

**Open and requiring operator captures.** 68 unadjudicated tier mismatches; 4 unread grip-velocity
rows; 18 `adsTimeMs` corpus-only rows across Laser, Muzzle, Ammo and Ergonomics; 1 `spotOnFire2dM`
VSSM barrel case; one possible dead `recoilVariationDegrees` ergonomic path in the resolver; and
the SOR-556 MK2 mapping. No `data/` or corpus value was changed by any of this work.

---

## 8. Audit status — 2026-07-31

Runner: `scripts/audit-sweep.mjs` (default invocation is read-only; use `--write-report` to
materialize the report). Output: `outputs/attachment-audit/sweep-findings.json`.

**28 informational findings, 0 errors, 0 warnings** across 3,115 stat-bearing records in 62
weapons. The 28 are deliberate, path-specific audit contracts: 27 reviewed Subsonic velocity
treatments and the SL9 Burst Mode fire-mode change.
The four former shotgun recoil exception receipts were removed after hidden-precision recomputation
matched their source readings. This is the Phase 0 verified steady state, not a generic tolerance.

No informational row is a live-site promotion. A changed screenshot, source path, or saved value
invalidates its matching register entry and fails the sweep instead of inheriting a broad tolerance.

### 8.1 Bulk-suspect captures — resolved by source recapture

The eight former bulk groups were corrected only after direct screenshot review:

- 323 source-backed field corrections across M1014, SVDM, GRT-CPS, LMR27, M39 EMR, M87A1, PSR
  and SVK-8.6; two apparent M87A1 recoil defects were verified as unchanged source readings.
- Five isolated sprint-recovery zeroes (M2010 ESR and Mini Scout) were re-read as 200 ms.
- The 29 identical M1014 canonical JSON duplicates were excluded with a path ledger; their source
  PNGs were retained in the audit backup.

The correction and dedupe receipts are
`outputs/attachment-audit/bulk-suspect-recapture-summary-20260731.json` and
`outputs/attachment-audit/deduped-source-record-exclusions-20260731.json`. The sweep now has no
impossible-zero or off-table bulk failures.

### 8.2 Current tail and resolved regression cases

There is no unregistered current tail:

- **Subsonic:** 27 direct paths use the separate treatment in
  `subsonic-velocity-treatments-20260731.json`: 22 floor-rounded subsonic tiers, four
  weapon-specific absolute assignments, and one Subsonic+Tungsten composite. The five former
  velocity-ladder errors are resolved without treating a fractional normal-ammo step as valid.
- **Shotgun recoil:** DB-12 Ribbed Vertical / Canted Stubby and M87A1 Classic Vertical /
  Low-Profile Stubby retain their source-read 2.3° / 2.7° values. Exact weapon bases reproduce all
  four with the existing +3/+5 tiers under the pinned float32 round-half-up display rule; they are
  no longer exception receipts.
- **ADS move:** CZ3A1 and PP-19 20Rnd Fast Mag directly read `x1.00` and are two exact reviewed
  overrides. Both source panels show `▲X1.00` with a **green change arrow** against their equipped
  30Rnd baseline, so this is a real tier and not a placeholder or pre-selection read — a
  change-arrow is exactly what the [§9.2](#92-what-was-wrong-and-why-it-matters-here) wrong-panel
  failure mode cannot produce. `ADS_MOVE_TIERS` now includes the `1.0` top rung; the two
  source-backed rows are represented by the live overrides and were landed in the isolated
  [Phase 2b-i](#2b-i--ads-move-10-tier) migration.
- **Fire mode:** SL9 Burst Mode remains one informational ergonomic RPM change.

The earlier cross-slot magazine-capacity leaks, RPM digit drops, and M250 damage outlier are no
longer present in the updated JSON. Move them out of “remaining work,” but retain their checks as
regression gates. The 8 surviving magazine-name/capacity contradictions are the legitimate
shotgun chambered-round cases described in [§9.1](#91-current-state--2026-07-31).

### 8.3 Field-by-slot discovery findings

The modal-baseline pass is now fully dispositioned:

| Disposition | Records | Current handling |
|---|---:|---|
| Direct screenshot correction | 55 | Saved in the review JSON and durable manual overrides |
| Historical compact-panel null | 24 | Superseded by the SL9 detailed replacement captures |
| Screenshot-confirmed attachment effect | 22 | Retained without changing the current resolver contract |
| SL9 detailed slot-context value | 24 | Retained path-by-path; `None` also shows it, so it is **not** inferred as a Laser/Light modifier |
| Unresolved field-by-slot finding | **0** | Required before broad catalog consolidation |

The 24 SL9 values are deliberately classified as context, not effects: the detailed `None`
screen shares `collateralMultiplier: 0` and `sprintRecoveryMs: 167` with every option in the
selector. They remain visible and path-scoped in the review JSON, while the resolver contract is
left unchanged. This is why the discovery rule uses an exact receipt rather than widening the
allowed Laser/Light slots.

### 8.4 Cross-source conflicts — audit vs Sym

| Weapon | Field | Audit | Sym | Assessment |
|---|---|---|---|---|
| M4A1 | recoil variation | ~~40.7~~ **30.7** | 30.7 | **resolved** — screenshots confirm Sym; corrected 2026-07-31 |
| M16A4 | effective recoil variation | 29.2 | `37.5 × 0.919722³ = 29.174` | **resolved** — raw value, multiplier, and baked exponent reproduce the panel |

Explained, no action needed: DB-12 and M87A1 RPM (Sym stores intra-burst rate, panel stores the
usable rate), L115 velocity 742 vs 664, and ±1 rounding on M2010 ESR, M44, Mini Scout and M277.

That M4A1 resolved *through* the model — a corrupted baseline made a good attachment reading look
broken — is [§7](#7-validation) holding up again: the model is self-checking and the hardcoded
table is not.

### 8.5 Ongoing guardrails

1. For any newly recaptured row, update the exact source-path receipt first; never normalize it
   to a weapon modal value.
2. Re-run `scripts/audit-sweep.mjs` and require **zero errors and zero warnings**. Informational
   rows are allowed only when their direct source path is present in a treatment or exception
   register.
3. Re-run `scripts/audit-field-slot-discovery.mjs` and require `unresolvedCount: 0`. A new
   slot relationship needs either a direct correction, an explicit current-context disposition,
   or a measured resolver change.
4. Keep ammo/subsonic availability and barrel-plus-subsonic precedence out of live data until
   direct screenshots and focused runtime tests establish them.
5. Build the workbook once, only after all JSON gates pass, using
   `python scripts/build-attachment-workbook.py`; never use `@oai/artifact-tool`.
6. The portable Phase 0 runners must pass from a clean clone with all required fixtures present;
   their default invocations write no report and must not inspect the screenshot corpus.

The screenshot-audit correction work no longer blocks the scoped reload migration or a
velocity-only barrel-field conversion. The remaining boundary is evidence, not audit cleanliness:
do not promote the proposed subsonic treatment until option availability, stacking precedence, and
focused runtime behavior are all captured.

---

## 9. Scrape data quality

Whether this migration can lean on the screenshot audit depends on whether the audit is clean. It
was not when this plan was written; the reload, cost, null, duplicate and recoil-variation columns
now are.

### 9.1 Current state — 2026-07-31

Measured against `attachment-screenshot-review.json`, 3,177 records, 3,115 detail/stat rows,
62 weapons:

| Check | Result |
|---|---|
| Fast mag = `base / 1.13` | 92/92 |
| Mag Catch = `base / 1.063` | 27/27 |
| Recoil variation on the `dirVarMult` ladder | 100%, except no unregistered source reading |
| Magazine name capacity ⇔ `magazineSize` | 8 contradictions, **all legitimate** |
| Null stat cells | 0 |
| Impossible zero reads | 0 |
| Generic ADS-move tier misses | 0; 2 direct `x1.00` weapon-magazine overrides are registered |
| Generic recoil-amount ladder misses | 0; hidden-precision bases and the pinned display rule reproduce all source readings |
| Generic normal-ammo velocity misses | 0; 27 direct Subsonic treatments are separate |
| Non-Overview null costs | 0 |
| Duplicate identity groups with disagreeing stats | 0 |
| Barrel subtype ⇔ velocity multiplier | 0 disagreements |
| Field-by-slot unresolved findings | 0 |

The 8 remaining capacity contradictions are the shotgun tubes and speedloaders whose displayed
capacity excludes the chambered round — DB-12 `7 Shell Dual Tubes`→16, M1014 `6 Shell Tube`→7,
`4 Shell Tube`→5 and `4Rnd Speedloader`→5, M87A1 `7 Shell Tube`→8, `6 Shell Tube`→7,
`5 Shell Tube`→6 and `5Rnd Speedloader`→6. Correct as recorded, and now checked rather than
assumed: the name-capacity rule previously matched only `Rnd` names, so all six shell-named rows
were skipped outright until 2026-08-01.

**The scrape is usable as a required characterization fixture** for reload, recoil and barrel
velocity. “No nulls” is not a cleanliness result by itself: the impossible-zero, sweep-register,
and field-by-slot reports must gate whichever columns a migration consumes. The current sweep is
clean, while subsonic live behavior remains deferred for the separate evidence reasons in
[§4.4](#44-longer-term-velocity-ammo-and-recoil-targets).

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
9. **Impossible zeroes** — validate field semantics separately from null presence.
10. **Field-by-slot inventory** — report every stat change outside the runtime's expected modifying
    slots and require an explicit “legitimate effect” or “bad reading” disposition.
11. **Name-versus-effect** — a magazine named `/fast/i` whose reload equals its weapon's base, or an
    unnamed magazine whose reload equals `base / 1.13`. Both are screenshot-read requests. This is
    the gate that would have caught [§5.8](#58-named-fast-magazine-without-fast-mag-treatment--suspected-game-bug).
12. **Correction provenance** — every bulk correction pass must carry a per-record source receipt,
    and may not synthesize a `statComparisons` direction that the source screenshot does not show.
    The 2026-07-28 pass stamped a green `direction: 'down'` on all nine reload corrections, which
    made the one bad row look independently corroborated.
13. **Catalog coverage** — every weapon in `data/weapons.json` must have non-empty attachment
    entries in `WEAPON_ATTS`, `WEAPON_ERGO` and `WEAPON_MAG`, or an explicit registered exemption.
    PP-19 sat empty across all three while the characterization test reported full coverage,
    because that test reads the audit JSON rather than the site data.
14. **Draw-time lock** — for every primary, the `deployT` tier index must equal the sprint-recovery
    tier index ([§2.6](#26-sym-tier-table-cross-check--2026-07-31)). This holds 52/52 today with no
    exceptions, so any disagreement is a bad `deployT`, a bad sprint baseline, or a weapon that has
    been misclassified as a primary. Sidearms are exempt until their deploy ladder is derived.
    This is free cross-validation between two columns that currently have no relationship in the
    data, and it is the same shape as gate 7 — the kind that catches a uniformly wrong column.
15. **Tier-table membership** — every value in every ladder in `balance_tables.json` must be
    observed in the audit or backed by a first-party source. `333` and `117` were in shipped tables,
    matched no reading, and belonged to a different ladder entirely.

The existing sweep and verify scripts implement or assert the first nine checks. Phase 0 adds the
portable field-by-slot report before any broad schema inference; gates 11–13 are new and follow
from the 2026-07-31 review. The original eight gates are also restated in
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
| `recoilV`, `recoilVar` | Read directly, but only to 1 dp — see [§2.4](#24-a-caveat-on-pinning-the-exact-integer). |
| **`deployT`** (primaries only) | **New.** Deploy and sprint recovery share one tier index on 52/52 primaries ([§2.6](#26-sym-tier-table-cross-check--2026-07-31)), and sprint recovery is read directly from the panel. All three undocumented weapons are primaries — EF88 is an Assault Rifle, BROD 3 a Carbine, VSSM a DMR — so it applies to each. |

Still blocked, and not derivable from any ladder:

1. **Damage range breakpoints.** The panel gives close and long-range damage with no distances.
2. **`recoilIncAds`.** Confirmed not derivable from the control bar — control 43 maps to both 0.36
   and 0.409 among existing weapons.
3. **`spreadDyn`** — 12 parameters x two aim states.
4. **Recoil decay** — `decFactor`, `decTimeExp`, `decExp`, `decOffset`, `duration`.
5. **`recoilDir`**, **`emptyRld`**, **`spreadMax`**.

The tier model still does not unblock the three new weapons outright, but the draw-time lock takes
`deployT` off the blocked list for all three — one fewer field to wait on, and the first field this
model has recovered rather than merely compressed. When Sym publishes, only the anchors are needed
— no per-attachment capture work.

---

## 11. Open questions

Eleven of the twelve are resolved. The remaining open question — 1 — is empty-reload
multipliers.
**None of them blocks Phase 3**, but question 1 must be answered before `emptyRld` is migrated.
These questions do not authorize runtime or attachment-schema work on their own.

1. **Do the attachment multipliers apply to `emptyRld`?** Untested — the audit only captured
   tactical reload. Until confirmed, apply multipliers to `tacRld` only and derive `emptyRld` from
   `ReloadEmpty / ReloadSpeed` with no attachment scaling. Needs a handful of in-game captures.
2. ~~**RPK-74M 36Rnd at 2.950.**~~ **Resolved.** The 36Rnd is 2.784 (base class); 2.950 belongs to
   the 95Rnd drum. The scrape had it under the wrong magazine name.
3. ~~**Does Linear Comp use a flat 0.789 variation multiplier instead of the tier ladder?**~~
   **Resolved 2026-07-31** — it is a plain −3 tier step on all four weapons; four bad baselines
   created the illusion. See [§5.5](#55-recoil-variation--linear-comp--resolved-not-an-exception).
4. ~~**Is the velocity ladder anchored globally or per weapon?**~~ **Resolved for this migration.**
   Keep the base velocity per weapon and apply the global relative `0.8` step. The current audit
   provides no reason to replace `bulletVel` with a shared absolute index, and Subsonic remains a
   separate treatment.
5. ~~**Can recoil tier integers be sourced from Sym?**~~ **No — resolved 2026-08-01.** Sym has
   not published attachment data, so grip recoil integers are not Sym-sourced or datamined. The
   visible attachment-cost formula is instead a strong, independently reproducible check of the
   existing in-game tier observations. It supports the current grip values but does not by itself
   authorize the deferred recoil migration.

   **Manual cost-reconciliation test (for Luna; do not automate or promote data).** Use the
   first-party attachment cards as the sole input; transcribe the displayed attachment cost by
   direct visual review, never mastery unlock level or OCR alone. Test each distinct `GRIPS[*].id`
   that has a reviewed card, including weapon-specific variants as separate cases. Before reading
   its stored `adsRecoilTierMod`, total every *other* visible effect using the card's buff/debuff
   direction and the displayed point schedule: ADS-time and ADS-movement-accuracy effects are
   ±10 each; ADS-movement-speed and sprint-to-fire/weapon-swap effects are ±5 each; bipod,
   fire-while-sprinting, and auxiliary-mode functions are +10 each. Then calculate
   `impliedRecoilTier = (attachmentCost - nonRecoilPointTotal) / 10`.

   Acceptance requires an integer from 0 through 5 and an exact match to the stored grip recoil
   tier for every eligible card. Keep the raw cost, effect transcription, subtotal, implied tier,
   screenshot path, and review date with each result. Use Alloy Vertical (`20 - 0 = 2`) and
   Folding Stubby (`20 - 10 - (-10) = 2`) as initial control cases, then include at least one
   independently reviewed card for each populated tier 0–5. Any non-integer result, ambiguous
   card, missing effect, or mismatch is a failed/unresolved case: record it and leave the model
   unchanged. This validates the tier hypothesis against first-party UI economics; it does not
   turn the values into source-backed data.

   **2026-08-01 disposition — targeted Grip correction after the Draw-Time migration.** The
   evidence-only test is complete; it did not change live attachment data. Its result is not a
   global rejection of the point formula. It identified stale hand-entered Grip Pod fields and one
   prose-versus-panel discrepancy:

   - `slim_angled_smg` remains recoil `+1`, ADS-time `+1`, and Sprint-Recovery shift `0`. The
     shared card description incorrectly claims weapon-draw speed; all eight SMG cards cost `20`
     and retain their baseline Sprint Recovery, whereas the regular Slim Angled costs `25` and has
     the draw benefit. Keep the zero shift and pin it with a targeted regression assertion and a
     short provenance note here; do not add a speculative runtime metadata field.
   - The sniper-rifle Grip `attachmentCost` receipts have a broader normal-variant substitution
     defect: every non-`None` grip cost is stale, not only Slim/Full Angled. The operator directly
     verified the existing screenshots: for each of the five sniper rifles, Low-Profile Stubby is
     `10`, Slim Angled `15`, Full Angled `5`, Bipod `10`, QD Grip Pod `10`, and Classic Grip Pod
     `20` (`None: 0` is already correct). The live `slim_angled_sr` (`15`) and
     `full_angled_sr` (`5`) catalog values are already correct. Correct only the stale canonical
     review `attachmentCost` receipts and verify every saved row and screenshot path; do not copy
     normal-rifle values or infer prices.
   - Plain `bipod` and `bipod_sr` remain static recoil tier `0`: their cards preserve the unmounted
     panel recoil and describe a conditional mounted reduction that the current simulator does not
     model. Standard Grip Pods are different. Direct panel math matches recoil tier `+2` for all
     28 reviewed standard PTT rows, all 28 standard QD rows, and all 28 standard Classic rows.
     The sniper-specific `qd_grip_pod_sr` and `classic_grip_pod_sr` rows retain tier `0` (five
     reviewed rows each); they do not display the ordinary passive recoil reduction.

   **Scoped correction and validation record — implemented 2026-08-01.** The Draw-Time migration
   was reviewed independently before this focused reference-data correction landed:

   1. Preserve all Draw-Time files and make no workbook rebuild or broad audit regeneration. In
      `outputs/attachment-audit/attachment-screenshot-review.json`, restore all 30 stale non-None
      sniper Grip receipts: five rows each for Low-Profile Stubby `10`, Slim Angled `15`, Full
      Angled `5`, Bipod `10`, QD Grip Pod `10`, and Classic Grip Pod `20`. Verify every exact saved
      value, identity, and screenshot path; `None: 0` remains untouched. The listed costs are
      operator-verified from existing screenshots; no recapture is needed.
   2. Correct the standard live Grip Pod rows: `ptt_grip_pod`, `qd_grip_pod`, and
      `classic_grip_pod` receive recoil tier `+2`; retain `0` on `qd_grip_pod_sr`,
      `classic_grip_pod_sr`, `bipod`, and `bipod_sr`. Reconcile each Pod's directly reviewed point
      cost and visible ADS/ADS-moving-accuracy effects at the same time, including removal of the
      stale `classic_grip_pod.noEffect` marker. Do not copy a standard Pod effect onto a sniper
      variant.
   3. Add one narrowly scoped regression test that asserts all seven verified sniper Grip costs
      across all five weapons (including `None: 0`), the saved identities and screenshot paths,
      standard-Pod tier-2 panel reconstruction, sniper-variant and plain-Bipod tier-0
      reconstruction, and the `slim_angled_smg` no-draw contract. The test must use direct
      screenshot pairings and the recoil ladder, not an inferred generic auxiliary-function point
      price.
   4. Supersede the evidence-only reconciliation artifact's blanket "cost-formula rejected"
      conclusion. State instead that ordinary grips are corroborated, standard Grip Pods were stale
      catalog data confirmed by direct panel math, and conditional/sniper Pod functions are outside
      the generic cost-to-recoil proof.

   The completed regression uses
   `scripts/grip-pod-correction-delta-register.json` to enumerate all fourteen approved catalog
   deltas across `ptt_grip_pod`, `qd_grip_pod`, `classic_grip_pod`, `qd_grip_pod_sr`, and
   `classic_grip_pod_sr` (including the two sniper price-only corrections and the removed
   `classic_grip_pod.noEffect`). Draw-Time, Sprint, and Phase 5 preserve their frozen evidence and
   digests by restoring only these registered fields for their historical projections; the focused
   reconciliation test requires exact register/live-catalog agreement and rejects any extra delta.

   **Separate follow-up — sniper Slim Angled Mobility bug.** Do not change the global Slim Angled
   definition or infer a hidden field from the composite Mobility stat. The reviewed current cards
   show `M2010 ESR` in the expected order (Slim `52` > Low-Profile `50` > Full `46`), while the
   other four rifles are anomalous: Mini Scout Slim/Full `56`, Low-Profile `60`; L115 Slim `46`,
   Full `42`, Low-Profile `50`; SV-98 Slim `48`, Full `46`, Low-Profile `50`; PSR Slim `34`,
   Full/Low-Profile `38`. Preserve these raw readings as a named suspected in-game bug and schedule
   fresh current-patch side-by-side captures before any simulator behavior changes.
6. ~~**Does `ADS_MOVE_TIERS` need a 1.0 top tier?**~~ **Yes — resolved and landed 2026-07-31 in
   Phase 2b-i.** Both `x1.00` panels carry a green change arrow, so the tier is real. The former
   objection — that prepending shifts every stored `defAms` index — was measured and is not a
   blocker: incrementing all 59 `defAms` values alongside the table is output-identical across all
   **265** current magazine loadouts, including the **260** pre-PP-19 entries, because the tier
   shifts are relative and no loadout currently reaches either clamp (at the time of that
   measurement grips and ammo contributed no `adsMoveSpeedTierShift` at all; 2b-iii has since given
   the four shared grip IDs a `+1`, and ADS-move clamps remain zero after it). The PP-19 backfill
   and isolated-commit prerequisite are now
   satisfied; see [Phase 2b-i](#2b-i--ads-move-10-tier).
7. **Are `ReloadSpeed` and `RECOIL_MULT` stable across patches?** If `ReloadSpeed` moves while the
   M60/M240L alternate times track it, both magazines are scaled and each weapon needs one raw
   alternate time rather than one per magazine. `RECOIL_MULT` matters more — it anchors the recoil
   ladder for all 59 weapons. Only answerable at the next Sym drop.
8. **Are there magazine reload-speed steps other than 1.13?** Nothing in the current data suggests
   so once the SOR-556 scrape error is discounted, but validation must fail loudly rather than
   silently inventing another tier.
9. ~~**Which out-of-slot stat changes are legitimate attachment effects?**~~ **Resolved for the
   current audit.** Section 8.3 has `unresolvedCount: 0`; keep that report as a recurring gate rather
   than reopening the disposed rows during reload migration.
10. ~~**What is the sidearm deploy ladder?**~~ **Resolved 2026-08-01 — Sprint-to-Fire/Deploy
    Time Offset model.** The sidearms are not one group: `ES 5.7 / GGH-22 / P18 / M45A1` use a
    `+5` offset; `M357 Trait / M44 / VZ. 61` use `+7`. Standard primaries use `+8`; `DB-12` is
    the sole `+9` exception. These are offsets in **rungs on the shared Sprint-to-Fire/Deploy
    source axis**, never milliseconds and never a raw addition to an index in the current merged
    `DEPLOY_TIME_TIERS` array. The resolver must encode that axis explicitly rather than relying on
    nearest-value lookup.
11. ~~**Should `drawTimeTier` become a derived field?**~~ **Yes — approved as the next isolated
    migration.** One canonical integer plus the Sprint-to-Fire and Deploy lookup paths replaces
    duplicate independent baselines. It must cover all 59 weapons, including the three offset
    families and DB-12 exception, or not land at all.

    **Implementation plan — Draw-Time Offset migration.**

    1. Freeze a bounded timing-effective pre-migration fixture for every supported weapon across
       magazine, selectable grip, selectable ergonomic, and available ammo choices, using each
       weapon's default `barrelDef`. Record Sprint-to-Fire, Deploy, raw tier coordinates, clamp
       events, and a deterministic digest. Sight, muzzle, laser, and light cross-products are
       covered by the separately described reduced Phase 5 separability witness. Preserve the
       current 59 `deployT` readings as transition evidence; do not use a nearest-value calculation
       as the new source of truth.
    2. Define a named shared-axis contract in `data/balance_tables.json`: the Sprint-to-Fire and
       Deploy tables, their axis-coordinate conversion, and the four named offsets
       (`primary: 8`, `semiAutoSidearm: 5`, `revolverOrAutoSidearm: 7`, `db12: 9`). Keep the
       primary/sidearm sprint tables distinct. The conversion helper must make the coordinate
       origin explicit, so `+8` cannot accidentally mean `defSpr + 8` in a trimmed runtime table.
    3. Add a zero-based `drawTimeTier` and an explicit group/offset selection to every
       `WEAPON_MAG` entry. Map exactly 51 standard primaries, `DB-12`, the four named semi-auto
       pistols, and `M357 Trait`/`M44`/`VZ. 61`; reject unknown, duplicate, or uncovered weapons.
       During the transition, derive the legacy Sprint-to-Fire and Deploy baselines from this new
       representation and assert exact agreement with the preserved values before deleting live
       `weapons.json.deployT`.
    4. Replace the resolver's nearest-`DEPLOY_TIME_TIERS` search with a pure draw-time resolver.
       Compute one effective draw-time coordinate, apply every supported Sprint-to-Fire tier shift
       once, clamp independently at each rendered table boundary, and render both Sprint-to-Fire
       and Deploy from that coordinate plus the selected offset. Inventory magazine, grip, and
       ergonomics shifts explicitly; a source that changes one rendering but not the other needs
       direct evidence and a named exception, never an accidental omission.
    5. Add a focused `draw-time` characterization test and validator rules. They must verify all
       59 base weapons against the preserved readings, exact membership in the four groups,
       no nearest-value fallback, integer/bounded tier fields, no new unregistered clamps, and
       output equivalence for the bounded pre-migration timing fixture. Include direct boundary and
       attachment-shift cases for each group, particularly one standard primary, all four pistols,
       all three revolver/automatic sidearms, and DB-12.
    6. Run `node scripts/validate-data.mjs`, the existing sprint-recovery characterization suite,
       the new draw-time suite, and the reduced attachment-equivalence witness suite. Regenerate
       any baseline only through an explicit `--write-baseline` path after independently reviewing
       the complete diff and recording its digest. The migration is complete only when live `deployT` is removed,
       no legacy nearest-deploy code remains, validation passes, and the fixture proves no
       unintended player-visible change.
12. ~~**Do four weapons need grip class variants?**~~ **Resolved and landed 2026-07-31 in Phase
    2b-iii.** `SVK-8.6`, `VSSM`, `18.5KS-K` and `DB-12` use the standard `6h64_vert` /
    `classic_vert` / `stipp_stubby` / `lp_stubby` IDs but take no ADS-move shift, unlike the other
    45. The anticipated `_dmr` / `_shotgun` class families were **not** what the source supported:
    the split is not per class (`M39 EMR` and `SVDM` are also DMRs and *do* take the shift), so the
    four were resolved with **per-weapon suffixed clones** — `*_svk86`, `*_vssm`, `*_ks18k`,
    `*_db12` — following the existing `factory_angled_sl9` precedent. That is still catalog data
    referenced by `WEAPON_ATTS`, not a per-weapon override mechanism in the resolver, so the
    original prohibition holds. Anything similar in future should reuse this shape rather than
    inventing a class taxonomy the panels do not support.

---

## 12. Risk and rollback

Dual-read support lands before data migration, and legacy fields remain present through exhaustive
equivalence. That makes each preparatory phase revertible without leaving runtime and data on
different schemas. The user-visible cutover is isolated to Phase 6; barrel velocity follows in a
separate migration.

The dominant risk is a silent wrong number — the same failure mode as the current hardcoded
tables, but applied at scale. A wrong absolute affects one cell; a wrong **tier constant** affects
every weapon carrying that attachment, and a wrong **ladder ratio** affects every weapon. The
mitigations are Phase 0 portable characterization, column-specific evidence corrections, the
per-phase recompute gates, the tolerance gate in Phase 3, and the
[§2.4](#24-a-caveat-on-pinning-the-exact-integer) rule that unpinnable
integers are left absent rather than guessed.

Second risk is over-generalizing. [§5](#5-exceptions-register) exists because some effects do not
   fit — the two reload-animation drums, the M60/M240L belts, and the direct subsonic velocity
   treatments. A model that quietly absorbs its exceptions by widening tolerance is worse than
a hardcoded table, because it looks principled while being wrong. Note that the one apparent
counter-example that would have justified a whole new mechanism — Linear Comp on recoil variation
— turned out to be bad data, not a real exception. That cuts both ways: keep the register
explicit, keep the sweep in CI, and re-check the data before adding a mechanism to accommodate it.

Third risk is scope creep into the attachment audit. The first implementation needs only reload;
the subsequent barrel-only migration needs the barrel velocity column. Ammo and recoil evidence
remain deferred with their schemas.

Scoped net: roughly 280 hardcoded reload numbers become 59 base times, one shared magazine-speed
step, one Mag Catch multiplier, explicit per-magazine reload tiers, and five unit-explicit
overrides—without moving weapon-specific movement/ADS/cost data. Barrel velocity later replaces
seven multipliers with one constant plus seven integers. Ammo/subsonic, broad magazine catalogs,
and new recoil fields remain deferred. The tracked 3,115-detail-row fixture becomes a required,
portable regression gate before either legacy field set is removed.

---

## Appendix A — PP-19 attachment backfill (completed 2026-07-31)

This completed appendix replaces the standalone PP-19 backfill procedure. It retains the
evidence-bound result and remaining migration constraint, rather than leaving an actionable
instruction file that could be mistaken for unperformed work.

### Scope and source

PP-19 was the only weapon with empty attachment, ergonomics, and magazine catalogs. The completed
backfill used the 51 reviewed records under Weapon Attachments/SMG/PP-19/ in
outputs/attachment-audit/attachment-screenshot-review.json. Records named None remain a baseline
selection, not catalog entries. The seven Ammo records remain intentionally out of scope because
the current site has no WEAPON_AMMO catalog; this preserves the same bounded ammo gap as every
other weapon.

Every mapped attachment uses an existing global catalog ID:

- Muzzle: flash_hider, flash_comp, dp_brake, comp_brake, linear_comp, cqb_supp.
- Barrel: basic, light, extended, heavy; basic is the default.
- Grip: fold_vert, alloy_vert, ribbed_vert, 6h64_vert, classic_vert, fold_stubby, ribbed_stubby,
  canted_stubby, stipp_stubby, lp_stubby, cmpct_handstop, slim_angled_smg.
- Laser: 5mw_red, 50mw_violet, 5mw_green, 50mw_green, 50mw_blue, 120mw_blue.
- Light: ads_taclight, flashlight, hip_taclight.
- Ergonomics: mag_catch and buffer.

The reviewed baseline is 2.467 s tactical reload, 167 ms ADS time, 100 ms sprint recovery, 0.75
ADS-move multiplier, 444 m/s muzzle velocity, and a 30-round magazine. The stored magazine bases
were defAds/defSpr/defAms = 3/3/3 at backfill close, the default is 30_rnd, and Mag Catch uses
magCatchRld = { reg: 2321, fast: 2054 }. Those stored indices are 2/2/3 today, after the 2b-i
defAms increment and the 2b-iv 0-based conversion; the resolved readings above are unchanged.

| Magazine ID | Points | Capacity | Legacy tactical reload (ms) | ADS / sprint / ADS-move shifts at backfill close |
|---|---:|---:|---:|---|
| 30_rnd | 5 | 30 | 2467 | 0 / -1 / 0 |
| 30_fast | 5 | 30 | 2183 | 0 / 0 / 0 |
| 35_rnd | 15 | 35 | 2467 | 0 / 0 / +1 |
| 20_fast | 5 | 20 | 2467 | 0 / 0 / 0 |
| 53_rnd | 45 | 53 | 2667 | 0 / 0 / +1 |

### Screenshot correction and deferred migration

The source panel for 39_PP-19_Magazine_20Rnd_Fast_Mag.png shows a 2.467 s reload with no reload
change arrow. Its review record was corrected from the model-predicted 2.183 s and the fabricated
reload comparison was removed. The apply and verify receipts are
outputs/attachment-audit/apply-20260731-pp19-attachment-backfill.mjs and
outputs/attachment-audit/verify-20260731-pp19-attachment-backfill.mjs.

The legacy two-value Mag Catch shape cannot express this one combination correctly: the
name-based fast branch returns 2.054 s for 20_fast plus Mag Catch, while the screenshot-backed
value is 2.321 s. This was deliberately preserved rather than guessed around. Phase 2 proves the
future derived result with a synthetic reloadSpeedTier 0 and Mag Catch reloadSpeedMult 1.063
fixture; Phase 3/4 must add those reviewed fields before production PP-19 switches from its legacy
path.

No shared grip ADS-move shift was added during the backfill. The four standard IDs
6h64_vert, classic_vert, stipp_stubby, and lp_stubby were handled by the separately gated
Phase 2b-iii work, which landed the +1 shift on those four entries and resolved the four weapons
that use them without the shift — SVK-8.6, VSSM, 18.5KS-K, and DB-12 — via per-weapon suffixed
clones.

### Verification retained

The backfill verifier confirms the exact catalog counts (6 muzzle, 4 barrel, 12 grip, 6 laser,
3 light, 2 ergonomics, 5 magazines), the 3/3/3 magazine bases, the screenshot correction, the
known legacy mismatch, and the absence of a global grip shift. It is a dated receipt for the
backfill commit, not a live gate: the last three of those assertions describe the pre-2b state and
no longer hold at HEAD. The Phase 0 catalog-coverage test
also registers the eight ergonomics-free weapons explicitly, so an empty future weapon catalog
cannot pass silently.
