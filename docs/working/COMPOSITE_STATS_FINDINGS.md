# Composite stats findings

Use **Weapon Attributes** (the game's terminology) for new documentation. The
current [Weapon Attributes model guide](../WEAPON_ATTRIBUTES_MODEL.md) explains
the four bar attributes. This file retains its historical name and dated findings.

Current review objective (21 SEP): calculate all four panel stats independently from source
inputs and match verified in-game readings. Historical review is complete for 472 selected
screenshots. Current EF88, BROD 3 and two KTS100 replacements are in the canonical audit.
All four research calculations match all 131 current attachment detail panels.
Research checkers now use reviewed values and source-backed rules. Production UI integration
and general multi-attachment validation remain open. Later dated results supersede earlier
match counts and hypotheses below.

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
| Precision | Per-weapon lookup tables in game configuration data | 2,962 / 3,004 comparable historical readings match; 123 historical 0/1 UI readings excluded. Remaining: VSSM 42. |
| Control | Delegate `ControlAttributeDelegate1` | 3,061 / 3,127 historical readings match. Most differences are old EF88 captures; current capture checks are separate. |
| Hipfire | Delegate `HipfireAttributeDelegate` | 3,127 / 3,127 historical readings match after screenshot/identity corrections, shotgun firing dispersion, inferred fraction gate, and the source-confirmed L115 missing suppressor binding. |
| Mobility | Delegate `MobilityAttributeDelegate` | 3,064 / 3,127 historical readings match, including Compact Handstop sprint-fire +4. Remaining differences concentrate in old EF88, L115 and one 18.5KS-K grip. |

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

### Follow-ups on the same day: laser classes, Mobility base inputs, shotgun lasers

9. **Mobility base inputs resolved.** With every index read from the resolved default build
   (deploy from the draw tables, ADS time, sprint, ADS move, moving ADS spread), the None panel
   equals `D + 4A + S + 2M + 4Z` exactly for 60 of 62 weapons; L115 and M44 read 4 high. The
   registry `MovingZoomedMinAnglesArrayIndex` is 3 for every weapon (0 for the Minigun), so Z
   does not explain the two. `Field_18774676` is false on all 63 table objects, so no weapon
   carries a fire-while-sprinting term at rest; the Compact Handstop +4 (finding 7) is the only
   evidence for that input. Absolute Mobility now checks 2,937 of 3,127 readings (L115 40,
   EF88 22 and BROD 3 17 of the 190 differences).
10. **Laser modifiers are generic.** `WPM_TOP_5mWRed_W10` and its siblings are single assets
   used by every weapon's laser attachment, and the site's per-weapon laser hip tiers are
   identical across classes. Nothing in the modifier gates snipers, SVK-8.6, VSSM or sidearms,
   whose panels show no laser Hipfire change (finding 5); the gate must sit in the weapon's
   dispersion binding or the delegate, and was not found.
11. **Shotgun lasers on the current build** (operator screenshots, 17 SEP, 1.4.3.0):

    | Shotgun | None | 5 mW Red | 5 mW Green | 50 mW Green (audit) |
    |---|---|---|---|---|
    | M87A1 | 40 | 45 | 49 | 52 |
    | M1014 | 40 | 45 | 49 | 52 |
    | 18.5KS-K | 42 | 47 | 52 | 56 |
    | DB-12 | 39 | 43 | 46 | 49 |

    The eight Red/Green readings were independently confirmed from operator screenshots in the
    21 SEP review below. The earlier claim that all equal the July audit was incorrect: the
    checker's corrected audit still reads 42/42 for 18.5KS-K Red/Green and 39 for DB-12 Green.
    The earlier claim that no constant fits DB-12 was also incorrect: +1.2 fits its entire
    listed series. See the source-backed candidate below; no historical audit values were changed.

### Implementation scope supported by this evidence

Control, Hipfire and Mobility: the 17 SEP candidates reproduce 94 to 97 per cent of the audit.
The verified transcription corrections support specific matches, but confirmed shotgun laser
screenshots also disagree with that checker. These totals do not establish complete class-wide
coverage. Mobility still needs the L115/M44 offsets, Compact Handstop, sidearm Fast Deploy,
and unresolved attachment families checked. Hipfire still needs the KTS100 laser exception,
sniper and sidearm laser behavior, and shotgun branches checked before implementation.

Precision lookup by the six keys reproduces 2,900 of 3,010 comparable readings and all
independently confirmed 13-14 SEP panels; the remaining differences are attributed to
transcription and capture build, not to the rule. A display would need: the burst-preview rule
(finding 3) or a note that burst ergonomics are shown as previewed; the `near` tolerance for the
two 0.239 weapons; the fallback row for the L115; and per-build tables (VSSM changed in 1.4.3.0).
Control's `RateOfFire` input and the native Precision provider remain unconfirmed.

## 21 September 2026 review: shotgun firing-dispersion candidate

Evidence: [source fields, hashes, calculations and eight saved screenshots](../../reference-data/provenance/composite-shotgun-hipfire-2026-09-21.json).
The screenshots confirm all eight Red/Green readings in finding 11. They show laser previews
with None equipped. Their capture date and build are not independently visible; the earlier
ledger attributes them to 17 SEP, 1.4.3.0. None and 50 mW Green are not newly verified captures.

The weapon firing-data assets contain a second dispersion component, separate from the
registry's gun-sway minimum. In each `_WB.xml`, `Class_35259f6b/Field_f40a1d28/Struct_f40a1d28`
contains three `Struct_8e53cf47` blocks. Their `Field_7baf4297` values are 1.0 for 590A1
(M87A1) and M1014, 0.8 for 185KSK, and 1.2 for DP12. These values agree in the 1.4.2.5
export and the 1.4.3.0 overlay. `Field_60e4e484` has the same values, so these observations
cannot distinguish which field supplies the input.

Using `H = shotgun row + firing-dispersion angle` in the existing Hipfire candidate gives:

| Weapon | Source angle | None prediction | Red prediction | Green prediction | 50 mW Green prediction |
|---|---|---|---|---|---|
| M87A1 | 1.0 | 40.268 -> 40 | 44.837 -> 45 | 48.932 -> 49 | 52.404 -> 52 |
| M1014 | 1.0 | 40.268 -> 40 | 44.837 -> 45 | 48.932 -> 49 | 52.404 -> 52 |
| 18.5KS-K | 0.8 | 42.028 -> 42 | 47.302 -> 47 | 52.188 -> 52 | 56.462 -> 56 |
| DB-12 | 1.2 | 38.712 -> 39 | 42.720 -> 43 | 46.218 -> 46 | 49.111 -> 49 |

Rows are 1.444, 0.972, 0.656 and 0.444. All eight screenshot-confirmed laser values match.
The source value 0.8 removes the need for the fitted 0.83 on 18.5KS-K; 1.2 explains DB-12.
This is consistent with the existing delegate decode, which adds `StandDispersionMinAngle`
after row selection. It is a source-backed candidate, not a verified native binding.

An in-memory experiment on the checker at `f222870` retained the resolved ammunition shift
for the four shotguns and added these angles. Hipfire matches rose from 2,955 to 3,035 of
3,127, leaving 92 differences. The unchanged audit and ledgers still contain discrepancies
against the supplied screenshots. This broad experiment also applies the candidate to
unverified ammunition, light and suppressor states; its total is not release validation.
The checked-in checker and production data remain unchanged.

Next source questions: trace the native `StandDispersionMinAngle` provider and shotgun row
construction, then check ammunition, lights and suppressors. The claim of 60/62 Mobility
None matches also still needs an explicit per-weapon baseline record list; several slots
have different readings for default-equivalent builds.

### Original screenshot review: 12 confirmed transcription errors

[Correction ledger with original screenshot paths and hashes](../../reference-data/attachment-audit/hipfire-screenshot-corrections-2026-09-21.json).
A targeted review of 12 of the 92 remaining Hipfire differences found 12 transcription
errors. All 12 screenshot readings match the exploratory candidate. The exact OCR or manual
process that produced each error is not established. The remaining 80 cases were not reviewed
in this pass; this selected sample must not be extrapolated to them.

| Weapon / attachment | Stored reading | Original screenshot |
|---|---|---|
| 18.5KS-K / 5 mW Red | 42 | 47 |
| 18.5KS-K / 5 mW Green | 42 | 52 |
| DB-12 / 5 mW Green | 39 | 46 |
| P18 / Standard ammunition | 11 | 54 |
| SL9 / Standard Suppressor | 11 | 40 |
| KTS100 / 50 mW Green | 47 | 54 |
| M2010 ESR / 50 mW Green | 34 | 54 |
| SVK-8.6 / 5 mW Green | 29 | 40 |
| ES 5.7 / 50 mW Green | 54 | 81 |
| M1014 / Flashlight | 40 | 44 |
| 18.5KS-K / Slugs | 11 | 35 |
| M87A1 / 50 mW Green | 34 | 52 |

This supersedes the KTS100 laser exception and the categorical laser-gate claims in findings
5 and 10 above: the reviewed sniper, DMR and sidearm laser panels show green increase arrows
and the candidate values. The audit transcriptions do not justify a class-specific gate.
The proposed gate investigation should start with the remaining original screenshots.

Applying only these 12 corrections to the exploratory result would give 3,047 matches and
80 differences out of 3,127. This ledger is not yet loaded by the existing checker. The
historical audit and production data are unchanged.

## 21 September 2026: complete targeted screenshot review

Luna read 472 selected historical screenshots without model predictions. The combined
[reading and correction ledger](../../reference-data/attachment-audit/composite-screenshot-corrections-2026-09-21.json)
records screenshot hashes, all four stat readings, attachment titles and Hipfire arrows.
It corrects 385 fields beyond the preceding ledgers: Hipfire 78, Control 110, Mobility 120,
and Precision 77. The earlier 12 Hipfire corrections remain a separate ledger. This was a
disagreement-selected sample, not a random accuracy estimate. Two shotgun magazine images
needed primary adjudication: Luna missed faint leading digits in four fields. Raw agent
values are retained beside those corrections.

Two [identity corrections](../../reference-data/attachment-audit/composite-identity-corrections-2026-09-21.json)
fix KTS100 Classic Grip Pod mislabeled as Ribbed Vertical, and the 60 Fast magazine mapped
to the default drum. Correct values must be compared with the attachment actually shown.

The research checkers now load these ledgers. Rules and limits are recorded in
[panel rule evidence](../../reference-data/provenance/composite-panel-rules-2026-09-21.json):

- Shotguns retain resolved ammunition shifts and add the WB firing-dispersion angle.
- Burst ergonomics preview non-burst recoil for Control, as already observed for Precision.
- Compact Handstop adds the delegate's +4 sprint-fire contribution to Mobility.
- The Hipfire fraction gate is inferred from resolved versus base hip increase per shot.
  It explains the lights and VSSM Folding Stock without attachment-name gates. The native
  comparator and provider remain unverified.

### L115 Standard Suppressor: missing hipfire binding

The [versioned trace](../../reference-data/provenance/l115-standard-suppressor-hipfire-2026-09-21.json)
links the L115 Bushwacker attachment through its ability branch to selector
`276be3b0-2455-46b7-a85e-52c37aa5b3b8` (`U_WPM_MZL_Suppressor01_W20`). The WB includes the
shared modifier, which provides suppression effects. The separate `GS_L115A3` hip-dispersion
bindings omit this selector. EF88 and M2010 ESR bind that same selector to
`GDM_Array_HipDispersion_MZL_M10`. Both inspected versions, 1.4.2.5 and 1.4.3.0, agree.
Thus the source-bound candidate leaves L115 Hipfire at 34, matching the screenshot, instead
of applying the generic penalty and predicting 29. This is a source-data omission or
exception; its design intent and actual firing behavior have not been established.
The research checker removes only this unbound muzzle shift. Production data is unchanged.

### Remaining limits

The historical comparison uses current model inputs against captures from several dates.
It must not be described as a current-build pass rate. EF88 current captures have recoil
variation 26.1 versus 20.3 in the old captures. VSSM's old recoil inputs explain its three
one-point Control differences; its 42 Precision differences still need current screenshots.
PP-19 Flash Comp reads 50 and now matches: its spread configuration has no recoil-smoothing binding for that selector, consistent with attachment bug 6. Three sniper Tungsten Core
Control cases and L115 / 18.5KS-K Mobility cases remain input/version investigations.

Only VSSM Precision table rows changed between the extracted 1.4.2.5 and 1.4.3.0 settings;
the updated table alone does not resolve its old screenshot differences. Use the changed
settings export, not the stale settings file in the overlay. General composed loadouts,
activation state and native provider bindings still need verification before UI promotion.

### Current capture update (21 SEP 2026)

Updated 133 canonical records and renamed 133 screenshots: EF88 66, BROD 3 65,
and KTS100 MK8 2. This includes six previously pending hybrid suppressors. Two
weapon overviews remain context-only; the other 131 records contain the full displayed
stat panel, attachment cost, description and colored comparisons. Old captures remain
in `Old` folders. The [capture manifest](../../reference-data/attachment-audit/current-capture-updates-2026-09-21.json)
preserves previous records, original filenames, current filenames and image hashes.

Direct execution of both research checkers against the [current panel input](../../reference-data/attachment-audit/composite-current-panels-2026-09-21.json)
matched **131/131 Hipfire, 131/131 Precision, 131/131 Control and 131/131 Mobility**.
This covers 65 EF88, 64 BROD 3 and 2 KTS100 detail panels; it excludes the two overviews.
[Results and input hashes](../../reference-data/provenance/composite-current-results-2026-09-21.json).

Luna helped with visual transcription. Primary review corrected transcription and identity
mapping errors before integration. In particular, BROD 3 Flashlight reads Hipfire 51,
and attachment identities must be joined by slot and catalog ID rather than capture order.
The current EF88 recoil variation is 26.1 degrees. These new captures replace the old
Precision 0/1 evidence for EF88 and BROD 3 in the canonical audit; the historical benchmark
retains its old observations and exclusions.

The KTS100 Ribbed Vertical replacement reads Hipfire 34, Precision 78, Control 67 and
Mobility 36. The 60-round fast magazine replacement reads 34, 75, 55 and 38, respectively,
with cost 10 and reload time 2.876 seconds. The old mislabeled captures remain historical
identity corrections, not verified measurements of the attachments named by their filenames.

Production composite-stat integration, general multi-attachment validation and the remaining
historical input/version differences are still open. The workbook was not regenerated;
these capture updates are in the canonical JSON.

### Remaining captures and sniper Tungsten Core (21 SEP 2026)

Captured and renamed 23 further images: 17 attachment panels and six overviews.
The [replacement manifest](../../reference-data/attachment-audit/remaining-capture-updates-2026-09-21.json)
preserves old records and image hashes. All old images remain in `Old` folders.
The L115 screenshot labels **27" Factory (Light)** as Default, while the equipped
checkmark is on **27" Full (Basic)**. These are different states; the Basic panel
still reads Mobility 46 versus the model's 42.

The 1.4.3.0 Precision table matches all 17 new panels, including the three VSSM
grips at 83. This resolves those current observations, not every historical VSSM
capture. Hipfire also matches 17/17.

The [two-version Tungsten Core trace](../../reference-data/provenance/sniper-tungsten-recoil-2026-09-21.json)
shows selector `68ba8281-7079-48a3-b53a-ff5bf30c63da` bound to
`GRM_Recoil_AMO_Bolt_M10` on M2010 ESR, PSR (`MRAD`) and SV-98 (`SV98M`).
Its ADS and hip recoil amount operands are signed **-6** (`0xfffffffa`), with
zero variation shifts. Normal `GRM_Recoil_AMO_M10` uses **-1** (`0xffffffff`).
The existing field mapping identifies `Field_6b84de87` as ADS and
`Field_7b609515` as hip, with amount index `Field_22ce7cf3` in each.
Both saved builds, 1.4.2.5 and 1.4.3.0, contain these bindings and operands.

With the three rifles' 0.94 recoil multiplier, six penalty steps give
`0.94^-6 = 1.449549`, approximately **44.95% more recoil**, versus **6.38%**
for one step. The research checker now uses these per-weapon source operands.
Calculated Control matches the new Tungsten panels: **M2010 ESR 11, PSR 9,
SV-98 14**. Control therefore matches 17/17 new panels. This is an input-mapping
error in our model, not an OCR error or a required change to the Control formula.

Do not apply this to all sniper rifles: L115 binds the normal one-step modifier;
EF88 does too. MiniFix contains both modifiers under different masks and needs
separate activation review. Production ammo data remains unchanged.

The [current results](../../reference-data/provenance/composite-remaining-results-2026-09-21.json)
leave six Mobility differences: five L115 panels and 18.5KS-K Slim Angled.
The earlier 131-panel batch still matches Hipfire, Control and Mobility after
the research input correction. General composed loadouts and native provider
execution remain unverified. The workbook was not regenerated.

### Source-input follow-up and site ammo correction (21 SEP 2026)

The three six-step Tungsten Core overrides are now in `data/ammo.json`. The
research-only injection was removed, so the checker uses the same ammo values
as the site. L115 and Interdictor retain one step. Mini Scout retains seven:
its saved Tungsten panel reads Control 17 and recoil 1.5°, supporting the sum
of its one-step and six-step bindings. Attachment bug 13 records the suspected
sniper inconsistency while separating confirmed values from intended balance.

The [Mobility source trace](../../reference-data/provenance/composite-mobility-source-trace-2026-09-21.json)
accounts for the six current differences:

- L115's animation-zoom base index is 2; its zoom-transition base index is 1.
  Mobility names the animation input. Reusing the resolver's ADS transition
  index loses four points on all five L115 panels.
- L115 QD Grip Pod has no moving-ADS penalty binding. Applying the generic
  penalty loses another four points on its panel.
- 18.5KS-K Slim Angled binds the dispersion modifier in `Field_b30a73ed`,
  not moving-ADS collection `Field_2ffeb6ac`. Treating it as a moving-ADS penalty
  loses four points. The other collection's runtime effect remains unverified.

The research checker uses the distinct animation index and excludes those two
unbound moving-ADS shifts. **All 17 current panels now match all four composite
stats.** The previous 131-panel batch still matches Control, Hipfire and Mobility.
These observations support the panel-input interpretation; they do not prove
the alternate KS dispersion field's gameplay behavior. Production spread and
ADS behavior were not changed. The old bug 1b interpretation is marked under review.

### Production spread follow-up and next validation

L115 QD Grip Pod now has a weapon-specific moving-ADS shift of zero in the
production catalog. Its ADS-time improvement remains. A regression check covers
the bare build, Light + Violet stacking, and the different M2010 binding.

18.5KS-K remains unresolved at the gameplay-effect level. SDK reflection confirms
`Field_b30a73ed` is field index 18, offset 1528, with `Struct_a92e7ee4` elements;
`Field_2ffeb6ac` is index 19, offset 1536, with `Struct_28529b7f` elements.
Neither exposes a semantic display name. This establishes separate collections,
not the first collection's effect. Production KS spread is therefore unchanged.

Composite integration is on hold at the operator's request. The next validation
is [six paired loadouts / 12 captures](COMPOSITE_LOADOUT_CAPTURE_PLAN.md).

### Paired loadout results (21 SEP 2026)

All six requested pairs were captured and reviewed: **12/12 panels match each
of Hipfire, Precision, Control and Mobility (48/48 displayed values)**.
The checkers now accept an explicit full loadout in each audit record; the
single-attachment path is unchanged and the previous 17-panel regression passes.

The user substituted 4 Rnd Fast for KS's locked 4 Rnd. KS-B previews locked
Slim Angled. Both L115 panels preview locked Violet, with QD Grip Pod equipped
only for B. S-B previews Tungsten Core; V-B previews Folding Vertical. The user
confirmed VSSM uses the 20-point 200 mm ASM Suppressed barrel, which explains
its 80/90-point totals rather than the planned 90/100.

Observed A-to-B deltas (Hipfire, Precision, Control, Mobility): EF (0, −1, −3, 0),
HF (+7, 0, 0, +4), L (0, 0, 0, +4), KS (0, 0, +1, +6),
V (0, +1, +4, −4), S (0, 0, −10, 0). These test specific combined menu builds,
not all combinations or gameplay activation. KS's other binding field remains
unresolved. Production composite integration remains on hold.

[Readings and loadouts](../../reference-data/attachment-audit/composite-combination-panels-2026-09-21.json)
and [results with source hashes](../../reference-data/provenance/composite-combination-results-2026-09-21.json).

### 18.5KS-K ADS indicator follow-up (21 September)

Twelve controlled captures support no Slim Angled moving-ADS penalty. No grip and
Slim Angled match within one pixel, while Folding Stubby widens the moving indicator.
Production now uses `movingAdsSpreadTierMod: 0` for `ks18k` Slim Angled, superseding
earlier statements that this production correction was pending. The alternate Frosty
field remains unidentified; this is indicator evidence, not a pellet-distribution test.
Evidence: `reference-data/provenance/ks18k-ads-indicator-2026-09-21.json`.
