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
and are not these stats ([UI strings review](../frosty/UI_TEXT.md#numerical-stat-block--do-not-use)).

## Status

| Stat | Source form | Status |
|---|---|---|
| Precision | Per-weapon lookup tables in game configuration data | Tables extracted; 2,900 of 3,010 comparable audit readings match after the 17 SEP transcription corrections (14 SEP record: 2,719) |
| Control | Delegate `ControlAttributeDelegate1` | Formula matches 2,946 of 3,127 audit readings (17 SEP); RateOfFire input shows no effect in the one controlled comparison |
| Hipfire | Delegate `HipfireAttributeDelegate` | Formula with the delegate ladder and √1.2 light gate matches 2,955 of 3,127; shotgun and sidearm lasers unresolved |
| Mobility | Delegate `MobilityAttributeDelegate` | Weighted index reproduces 2,507 of 2,636 attachment deltas; base inputs and `CanFireWhileSprinting` (Compact Handstop) unresolved |

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
  The in-game panel shows 1 with the Light and Basic barrels (14 SEP 2026).

### New-weapon Precision bug

New weapons often show Precision 0 or 1 on the loadout panel. The operator reports
that this is a loadout UI problem only and does not change in-game weapon behavior.
The Interdictor table in this export stores 1, so the wrong value is in the shipped
table. The BROD 3 (1) and EF88 (0) audit readings were captured when those weapons
were new; their tables in this export have normal values (26.795 and 27.932).
Current panels (14 SEP 2026) confirm the fix: EF88 shows 28 with the Light and Basic
barrels, and BROD 3 shows 27 with the Basic and Extended barrels. The 07 SEP audit
values for these two weapons are out of date.
Do not use a 0 or 1 panel reading as evidence for a Precision model.

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
| new-weapon UI bug reading (BROD 3 and EF88 values of 0 or 1) | 117 |

Difference groups (14 SEP observations; each is resolved or reclassified in the 17 SEP continuation below):

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
  GameSetup assets ([string scan](../frosty/UI_TEXT.md#string-usage-scan)).
- Companion Battlefield bundles the same Precision tables, a Control table and a
  Hipfire table ([summary](../frosty/UI_TEXT.md#companion-battlefield-composite-models)).
  Treat it as third-party evidence.
- Earlier record: [composite category stat investigation](../archive/FROSTY_LIVE_REVIEW_2026-09-06.md#composite-category-stat-investigation).

## Files and commands

```sh
python scripts/frosty-precision-tables.py --root "PATH_TO_EXPORT" --out reference-data/provenance/frosty-precision-tables-2026-09-14.json
node scripts/frosty-precision-check.mjs --out reference-data/provenance/frosty-precision-check-2026-09-17.json
node scripts/frosty-composite-check.mjs --out reference-data/provenance/frosty-composite-check-2026-09-17.json
```

- [frosty-precision-tables-2026-09-14.json](../../reference-data/provenance/frosty-precision-tables-2026-09-14.json):
  63 tables, 4,946 rows, source hashes and field map. Weapon identity is matched on
  ten object fields because the object name hash is not decoded.

## Open questions

- Which native provider reads the Precision tables, and is the table used for all
  loadout states?
- Should the site show the four stats, and from which source for each?

## 17 September 2026 continuation: Precision lookup selection

Branch `research/precision-lookup-2026-09-17` from `a5d8227` (clean tree). Tables:
1.4.2.5 export (`settings.xml` sha256 `5aff20a2…`, identical bytes in the 1.4.3.0 overlay,
which lists the asset as stale). Live data: `data/` at `a5d8227` (VSSM and L115 fields moved to
1.4.3.0 on 16 SEP; the VSSM change only rescales `recoilV`, so the tier keys are unchanged).
Audit: `frosty-panel-audit-2026-09-07.json` (3,347 records). The 14 SEP counts above are
historical observations, not targets. Machine-readable result:
[frosty-precision-check-2026-09-17.json](../../reference-data/provenance/frosty-precision-check-2026-09-17.json).

### Baseline and result

| Population | match | differ | no row | ambiguous | excluded (0/1 readings) |
|---|---|---|---|---|---|
| 14 SEP record | 2,719 | 237 | 48 | 6 | 117 |
| Checker at `a5d8227`, before any change (one reading moved by the 16 SEP data update) | 2,720 | 236 | 48 | 6 | 117 |
| Revised lookup, original transcriptions | 2,775 | 235 | 0 | 0 | 117 |
| Revised lookup, screenshot-corrected transcriptions | 2,900 | 110 | 0 | 0 | 117 |

Both revised populations are reported by the checker; the audit file itself is unchanged.

### Findings, in order of evidence strength

1. **Stale transcriptions (audit/capture problem, resolved).** The 439-item ledger
   [screenshot-stat-corrections-2026-09-17.json](../../reference-data/attachment-audit/screenshot-stat-corrections-2026-09-17.json)
   was applied to the canonical review file, not to the audit file the checker reads. All 439
   entries align with the checker's records by screenshot path and none had been applied. Its 102
   Precision corrections move 102 records from differ to match with no regressions. A further 23
   readings re-read from the screenshots this session
   ([precision-screenshot-corrections-2026-09-17.json](../../reference-data/attachment-audit/precision-screenshot-corrections-2026-09-17.json))
   move 23 more. Every one of the 25 screenshots opened this session showed the rounded table row on
   the panel; where the transcription differed, the transcribed value was not on the panel (for example KORD 6P67 Linear Comp shows
   35, not 45; KV9, SCW-10 and M121 A2 grips show 25, not 65). The grip group of the 14 SEP record
   is this family, not a Precision-model problem, and no equipped Alloy Vertical was involved in the
   screenshots opened.
2. **Capture build.** The audit screenshots were taken 23 JUL to 6 AUG 2026 (dates in the
   canonical review's source filenames); `sourceVersion: 1.4.2.5` names the comparison export
   (5 SEP), not the capture build. Readings of weapons retuned since then cannot judge the
   September tables: BROD 3 lasers read 31 (24 JUL), the 1.4.2.5 row is 26.795, and the 14 SEP
   in-game panel shows 27. The VSSM table differs again in 1.4.3.0 (default row 78.111 → 77.507).
3. **Burst-selector operands are not previewed (supported panel behaviour).** All eight burst
   readings (Burst Training on KORD 6P67, KV9, UMG-40, PW5A3, SG 553R, CZ3A1; SL9 Burst Mode;
   GRT-BC Burst Training) equal the weapon's non-burst row, and the KORD 6P67 screenshot shows no
   delta arrow and unchanged Recoil Variation 28.9. SL9 Burst Mode does change the displayed RPM
   (675 → 771) and Precision (61 → 78), and 78 is the row with the burst RPM and variation sum 0
   (77.924); the +3 variation row would give 82. The A3 Receiver, whose amount operand is not
   behind the burst selector, is previewed (M16A4 27 → 24). The checker therefore keys burst
   ergonomics with the non-burst recoil values and the ergonomic's RPM. Not established: whether
   the operands apply in play (the site model keeps them) and which native selector the preview
   leaves inactive.
4. **Duplicate rows (checker classification, resolved).** Tables with two members in
   `Field_9b956c3d` (`c57b586e`, `97a738a9`: KORD 6P67, KV9, UMG-40, PW5A3, SG 553R, CZ3A1) carry
   a second 80-row block. Where the burst duration change does not apply (KORD 6P67, KV9, UMG-40)
   the block repeats 18 keys; the largest output difference among duplicates in all 63 tables is
   0.012, so every duplicate pair rounds to the same panel value. The six "ambiguous" results were
   three Linear Comp readings (two match, one transcription error) and three burst readings
   (finding 3). Row flags: in all 63 tables the six flags are true exactly where the row value is
   not -1; only the fallback rows differ. File order carries no other precedence information.
5. **Fallback rows (checker defect, resolved).** The L115 table has one row with all flags false,
   keys 0 and panel 100; the extractor marks it `valid: false` and the old checker discarded it,
   giving 42 no-row results for readings of 100. The Interdictor and the three bolt-action tables
   also carry a fallback row (0.5 or 100); every other table's fallback panel is 0. The checker
   now uses a lone fallback row only when the table has no keyed rows.
6. **AK-205 and USG-90 heavy rows (source literal, resolved with a documented tolerance).** The
   heavy-barrel rows store minimum angle 0.159133 for both weapons; the object's base angle is
   0.239 and every other table's heavy value equals base × 0.666667 exactly (0.28 → 0.186667,
   0.304 → 0.202667, 0.36 → 0.24). The weapon asset `GS_AK205.xml` holds 0.239 and the settings
   asset contains no 0.2387. The panels read the 0.159133 rows (AK-205 heavy and Cryogenic 90 =
   89.77; USG-90 heavy, Heavy Extended and Cryogenic 37 = 36.926). The checker reports these as
   `near` (relative tolerance 2e-3) rather than exact; whether the game compares with a tolerance
   or selects rows by index is not established.
7. **Rounded catalog burst RPMs (checker key precision).** `burstRpm` is 771 for SL9 and 830 for
   GRT-BC; the tables store 771.428 and 830.769. These also resolve as `near`. Shipped data is
   unchanged.
8. **Rail-slot reconstruction (checker defect, resolved).** For weapons whose rail accepts the
   slot (VZ. 61 grips; lasers and lights on ten weapons) `resetAttsForWeapon` leaves `rail: null`,
   so a plain `atts.grip` selection was ignored and VZ. 61 grips were keyed without their recoil
   tiers. Selecting through `atts.rail` matches the Canted and Stippled Stubby readings (69, 72)
   and, after re-reading the shifted screenshot rows, the Folding and Ribbed Stubby (67).

### Remaining 110 differences

VSSM 42, SVDM 16, DB-12 10, SVK-8.6 8, 18.5KS-K 8, BROD 3 6, M87A1 5, VZ. 61 3, M433 2,
ES 5.7 2, P18 2, KTS100 2, M45A1 2, RPKM 1, PP-19 1. VSSM and BROD 3 are capture-build
mismatches (finding 2). The DMR, shotgun and sidearm groups are one to five points off with
inconsistent readings across identical default loadouts (SVDM default-equivalent captures read
50, 55, 57 and 60; the two opened show 55 = table). These are unadjudicated transcriptions, not
evidence for a different lookup rule; the next step is to re-read those screenshots, starting
with SVDM and SVK-8.6. No remaining case has a matching-rule hypothesis worth testing first.

### Control: RateOfFire input

The audit holds one controlled comparison: SL9 Burst Mode changes the displayed RPM from 675 to
771 with Recoil Amount 0.5 and Variation 13 unchanged, and Control stays 55 (the candidate gives
55.27 for the SL9 base). One weapon, one reading: the `RateOfFire` argument has no observable
effect at panel precision here. It cannot exclude an effect hidden by the burst-selector preview
behaviour (finding 3) or a branch outside this input range. No roster weapon has zero variation
(minimum 4°), so the zero-variation question has no in-game observable and stays as recorded in
the 6 SEP evidence.

### Smallest next observations

- Burst preview: on the current build, equip Burst Training on the KORD 6P67, switch the fire
  mode to burst in the range, and read the loadout panel again. Prediction if the preview follows
  the selected fire mode: Precision 36 (row 35.535/35.54) and Recoil Variation 22.4; otherwise 33.
- Heavy rows: read the AK-205 Basic and Heavy panels on the current build; both tables still hold
  0.159133, so Heavy should read 90 and Basic 88.
- Remaining differences: re-read the SVDM and SVK-8.6 screenshots (24 records) before any rule
  work; a change to the lookup is not justified by the current evidence.

### Control, Hipfire and Mobility against the full audit (17 SEP, same branch)

`scripts/frosty-composite-check.mjs` resolves every mapped record, applies the ledgers, and tests
Control and Hipfire absolutely and all three as deltas against the same-slot None/default capture
(the delta test needs no Mobility base inputs). Result file:
[frosty-composite-check-2026-09-17.json](../../reference-data/provenance/frosty-composite-check-2026-09-17.json).

| Stat | Absolute match | Delta match | Main remaining families |
|---|---|---|---|
| Control | 2,946 of 3,127 | 2,535 of 2,636 | EF88, BROD 3 and VSSM capture build (finding 2); KV9 and RPK-74M barrel/ergonomics sessions transcribed 50 for 60; M87A1 grips read 7 for a candidate 8 (flat curve at R above 3) |
| Hipfire | 2,955 of 3,127 | 2,561 of 2,636 | shotgun lasers; lasers on snipers, SVK-8.6, VSSM and sidearms show no change; readings of 11 (transcription) |
| Mobility | not tested | 2,507 of 2,636 | Compact Handstop +4 on 12 weapons; laser readings inconsistent per weapon; sniper and shotgun magazines |

Rules established or corrected by this check:

1. **Control uses unrounded recoil.** The resolver rounds `recoilV` to three decimals; recomputing
   R and V from the tier ladders moves 30 readings across a .5 boundary in the observed direction
   (2,914 → 2,944) with no regressions. The delegate is therefore evaluated on the exact ladder
   product. Two more moved with ledger corrections.
2. **Hipfire ladder.** The delegate's 18-value ladder has 8.032 at row 0 where the site's spread
   table holds 7.4: suppressed LMGs, SVK-8.6 and PSR read 22 (8.032 → 22.1), not 23 (7.4 → 23.1).
   Suppressors on rifles read 34 from 40 and 40 from 47, one row up the ladder, as the site models.
3. **Hipfire light gate.** Flashlight and hip tac light multiply by √1.2 (ADS tac light does not):
   96 readings of +4 on 48 weapons. Laser/light combos apply the laser tiers and the gate
   (KORD 6P67 Combo Green 40 → 59, ES 5.7 Combo Green 54 → 78). The ES 5.7 flashlight screenshot
   shows 59 where the audit had 50.
4. **Shotgun Hipfire base.** All four shotguns read about 40 (M1014 and M87A1 40, KS-18K 42,
   DB-12 39), which is ladder row 3 (2.432 → 40.37), the registry `UnzoomedMinAnglesArrayIndex`;
   the site's -9 ammunition shift into the shotgun rows (1.444 → 52.4) is not what the panel uses.
   Shotgun laser previews rise 40 → 45 → 49 → 52 for one to three tiers (M87A1 screenshot 45
   confirmed); the main ladder predicts 47, 54, 62. Unresolved.
5. **Laser Hipfire by class.** Lasers change Hipfire on rifles, carbines, SMGs and most LMGs as
   the site's tiers predict, but not on the bolt-action snipers, SVK-8.6, VSSM or the sidearms
   (readings unchanged), and KTS100 50 mW Green moves one row, not three. The site's laser hip
   tiers are rifle-class values; per-class source modifiers were not traced.
6. **Mobility weights hold.** With site index deltas (deploy, ADS-time, sprint, ADS-move, moving
   ADS spread) the candidate `D + 4A + S + 2M + 4Z` reproduces the delta families: ribbed stubby
   +4 (63 of 69), heavy barrels -4 (52 of 58), light barrels +4 (33 of 38), lasers +4 (144 of
   165), 6H64 and Classic Vertical -6 (93 of 98), 20-round magazines +14 (12 of 14). The M433
   Extended screenshot reads 48 from 52 where the audit had 52.
7. **Compact Handstop and `CanFireWhileSprinting`.** The Compact Handstop reads +4 on all twelve
   PDW weapons with no ADS-time, sprint or ADS-move change. Its only source payload is
   `WPM_BTM_HandStopPDW_W10` → `Class_a00773e3` `7e6751a8…` with one boolean `Field_18774676 = True`;
   no other modifier uses that class, and every Precision table object carries
   `Field_18774676 = False`. This fits the delegate's `CanFireWhileSprinting` input at weight 4.
   Supported hypothesis; the hash is not decoded. The site catalog marks the handstop `noEffect`.
8. **Controlled RateOfFire comparison** (Control section above) stands.

Rejected or unresolved: sidearm Fast Deploy ergonomics predict +2 and read 0 (five sidearms,
flat sidearm deploy table); shotgun grips change the recoil readout but not Control on the
M87A1 (candidate 8 against 7); laser Mobility readings vary +14, +12, +6 and 0 for the same
laser on different weapons (M433 screenshot: +4, as predicted, audit 66). Transcription is the
likely cause of most single-weapon outliers; none was adjudicated beyond the screenshots listed
in the ledger.

### Implementation scope supported by this evidence

Control, Hipfire and Mobility: the candidates reproduce 94 to 97 per cent of the audit, and
every screenshot opened against a disagreement showed the candidate value. A display could
support rifles, carbines, SMGs and LMGs for all three stats with the rules above; shotgun and
sidearm Hipfire with lasers, sniper and sidearm laser effects, and the Mobility base inputs
(deploy index, `CanFireWhileSprinting`) need source work first.

Precision lookup by the six keys reproduces 2,900 of 3,010 comparable readings and all
independently confirmed 13-14 SEP panels; the remaining differences are attributed to
transcription and capture build, not to the rule. A display would need: the burst-preview rule
(finding 3) or a note that burst ergonomics are shown as previewed; the `near` tolerance for the
two 0.239 weapons; the fallback row for the L115; and per-build tables (VSSM changed in 1.4.3.0).
Control's `RateOfFire` input and the native Precision provider remain unconfirmed.
