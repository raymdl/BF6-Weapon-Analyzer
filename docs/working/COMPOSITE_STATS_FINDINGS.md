# Composite stats findings

Snapshot: 14 September 2026, 1.4.2.5 local export. Active investigation.

The loadout panel shows four 0-100 bars: Hipfire, Precision, Control and Mobility.
This page collects every finding about them. The site does not display them yet.

## Name in the game data

Frosty calls them **Weapon Attributes**:

- Native calculation assets: `Common/Hardware/AttributeDelegates/WeaponAttributesConfig_<Stat>AttributeDelegate`
  (Hipfire, Mobility, Control, Control1, plus RateOfFire, HeadshotMultiplier and
  CollateralMultiplier for the extended list).
- UI widgets: `Common/UI/WeaponCustomization/Widgets/WeaponAttributes`, `WeaponAttributesCell`,
  `WeaponAttributeProgressBar`, `WeaponAttributesDelta`, `WeaponAttributes_ExtendedList`.
- English labels: `HIPFIRE` `4B1DA1C6`, `PRECISION` `2581C0EB`, `CONTROL` `D81D0800`,
  `MOBILITY` `F9880148`.

"Gunsmith Panel" is a Companion Battlefield label, not a game name. The older
Firepower/Accuracy/Range/Handling `NumericalStatKey` values are archetype templates
and are not these stats ([UI strings review](FROSTY_UI_STRINGS_REVIEW_2026-09-13.md#numerical-stat-block--do-not-use)).

## Status

| Stat | Source form | Status |
|---|---|---|
| Precision | Per-weapon lookup tables in game configuration data | Tables extracted; 2,719 of 3,010 comparable audit readings match |
| Control | Delegate `ControlAttributeDelegate1` | Formula candidate matches baselines and Companion's table |
| Hipfire | Delegate `HipfireAttributeDelegate` | Formula candidate for rows 1-15; branches unresolved |
| Mobility | Delegate `MobilityAttributeDelegate` | Weighted index candidate; two inputs unresolved |

## Precision

There is no Precision delegate. The values are pre-calculated tables in
`Common/GameSetup/GameConfigurations/GlacierGameConfiguration/settings`:

- Container `Class_fe5894b1.Field_d0874615` lists 63 `Class_0fd27406` objects, one per weapon.
- Each object holds base weapon values (RPM, reload, velocity, magazine, damage,
  ADS recoil amount and multiplier, recoil decrease, ADS minimum angle, duration),
  the base keys `Field_22ce7cf3` (recoil amount tier sum) and `Field_303e9335`
  (recoil variation tier sum), an 80-value ADS-time ladder, 105 attachment hashes
  and the table `Field_59491962`.
- Each row (`Struct_81d94d9f`) has: amount sum, variation sum, RPM, minimum angle,
  duration, decrease, panel value and six "key used" flags.
- `-1` in RPM, minimum angle, duration or decrease matches any value, with that
  key's flag false. DMR and sidearm tables do not use minimum angle; shotgun
  tables do not use RPM; the VSSM uses neither. A row with all flags false is a fallback.
- Bolt-action sniper tables have one row of 100. The Interdictor table value is 1.

### Row selection

For a resolved build:

| Key | Value |
|---|---|
| amount sum | table base sum + ADS recoil tier changes |
| variation sum | table base variation + ADS variation tier changes |
| RPM | resolved RPM |
| minimum angle | resolved ADS spread increase (`recoilIncAds`, including heavy-barrel multipliers) |
| duration | resolved ADS recoil duration |
| decrease | resolved ADS decrease factor × Smooth/Bolt recovery multiplier |

Examples, confirmed in-game on 13 SEP 2026:

- M16A4 default (Burst): sum -2, variation 3, duration 0.025 → 26.587 → **27**.
- M16A4 with A3 Receiver: sum -3, variation 3, duration 0.0244 → 23.507 → **24**.
- M16A4 barrel choice does not change Precision; no table key changes.

### Audit check

`scripts/frosty-precision-check.mjs` resolves every mapped record in
`reference-data/attachment-audit/frosty-panel-audit-2026-09-07.json` with the
site resolver and compares the rounded table value with the panel reading:

| Outcome | Records |
|---|---|
| match | 2,719 |
| differ | 237 |
| no row | 48 |
| ambiguous | 6 |
| invalid reading (BROD 3 and EF88 values of 0 or 1) | 117 |

Difference groups:

- Grips on several weapons read far above the table (for example 60 against 19.5).
  These readings are unlikely to be Precision; check the captures before changing
  data. Some grip screenshots compare against an equipped Alloy Vertical.
- Linear Comp and Burst Training give two matching rows (ambiguous).
- Heavy and Cryo barrels on AK-205 and USG-90 give a minimum angle with no row.
- Some DMR, sidearm and magazine records are one to five points off.

## Control

Candidate: `96 / (1.1 * R * sin(V) / V + 0.75)^2.25 + 4`, R = effective ADS recoil
amount, V = recoil variation in radians. Rounded to the nearest integer.

- Evidence: [control candidate](../../reference-data/provenance/composite-control-candidate-2026-09-06.json):
  four rifle baselines and two shotgun holdouts; M433 grips 20/20.
- `ControlAttributeDelegate1` arguments: `RecoilAmount`, `RecoilVariation`, `RateOfFire`.
  The older `ControlAttributeDelegate` takes only `RecoilAmount`.
- Companion's 2,276 Control table cells agree with the formula within 0.0001.
- Open: the native sine hash `3ee9cb97` is inferred from matches; zero-variation
  handling; whether `RateOfFire` changes the value.

## Hipfire

Candidate: `10 * sqrt(0.425 / tan(1.25 * H) * 83.333 / 40.924)`, H = standing hip
spread from `HIP_SPREAD_TABLE`, capped at 100.

- Evidence: [hipfire decode](../../reference-data/provenance/composite-hipfire-decode-2026-09-06.json):
  five of six baselines; DB-12 does not match.
- Delegate arguments: `MinAngleIndex`, `MinAngle`, `StandDispersionMinAngle`,
  `IncreasePerShotFraction`. The compiled resource has an 18-value lookup and a branch.
- Companion's shared 18-row table equals the candidate for rows 1-15; row 0 is 22.109
  against 23.052. Their light gate multiplies by 1.0954 (sqrt 1.2).
- Open: branch conditions, index clamp, row 0, shotguns, sidearms, light bonuses.

## Mobility

Candidate: `D + 4*A + S + 2*M + 4*Z + 4*canFireWhileSprinting`, with index inputs
D = `WeaponDeployTimeIndex`, A = `AnimationZoomSettingsIndex`, S = `SprintSettingsIndex`,
M = `WeaponZoomedMoveSpeedMultiplierIndex`, Z = `MovingZoomedMinAnglesIndex`.

- Evidence: [mobility inputs](../../reference-data/provenance/composite-mobility-inputs-2026-09-06.json):
  delegate operands support the weights; M433 attachment deltas 20/20.
- Open: the deploy index and `CanFireWhileSprinting` sourcing; a -10 cluster on carbine screenshots.

## UI and other sources

- The weapon-customization UI bindings (`NumericalStatsDBD`, `IconizedAttributesDBD`)
  receive finished name, value and delta. They contain no weights.
- Label ids for the four stats are not referenced in the exported UI, Portal or
  GameSetup assets ([string scan](FROSTY_UI_STRINGS_REVIEW_2026-09-13.md#string-usage-scan)).
- Companion Battlefield bundles the same Precision tables, a Control table and a
  Hipfire table ([summary](FROSTY_UI_STRINGS_REVIEW_2026-09-13.md#companion-battlefield-composite-models)).
  Treat it as third-party evidence.
- Earlier record: [composite category stat investigation](../archive/FROSTY_LIVE_REVIEW_2026-09-06.md#composite-category-stat-investigation).

## Files and commands

```sh
python scripts/frosty-precision-tables.py --root "PATH_TO_EXPORT" --out reference-data/provenance/frosty-precision-tables-2026-09-14.json
node scripts/frosty-precision-check.mjs
```

- [frosty-precision-tables-2026-09-14.json](../../reference-data/provenance/frosty-precision-tables-2026-09-14.json):
  63 tables, 4,946 rows, source hashes and field map. Weapon identity is matched on
  ten object fields because the object name hash is not decoded.

## Open questions

- Which native provider reads the Precision tables, and is the table used for all
  loadout states?
- Is the Interdictor's Precision really 1 in game?
- What do the ambiguous Linear Comp and Burst Training rows depend on?
- Should the site show the four stats, and from which source for each?
