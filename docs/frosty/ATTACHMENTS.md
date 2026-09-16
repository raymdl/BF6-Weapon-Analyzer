# Attachment and optic data in Frosty

[Frosty docs](README.md) · [Field map](FIELD_MAP.md) · [Data graph](DATA_GRAPH.md) · [Attachment bugs](../ATTACHMENT_BUGS.md) · [Open questions](OPEN_QUESTIONS.md)

What the game data says about attachments and optics, and which site values are
generated from it. The site model is in the [attachment model](../ATTACHMENT_MODEL.md);
game data errors are in [attachment bugs](../ATTACHMENT_BUGS.md). The link path from a
site choice to its modifiers is in the [data graph](DATA_GRAPH.md).

## Composition rules

- A package's `WME_*` effects apply to a weapon only when that weapon's WB lists the
  package's part. M2010 ESR lists `WPM_BTM_FastBOLT02_W15`; L115, Mini Scout and
  Interdictor select that package but do not list its part.
- GS bindings are per weapon. `Vertical03_W20` has a recoil binding in `GS_BREN3` and
  none in `GS_M27IAR`.
- One action can select several packages; `scripts/frosty-multi-package-scan.py` lists
  them. Two such cases are game errors (Slim Angled, M121 A2/M45A1 ammo).
- `_W##` suffixes on `U_WPM_*` names are not costs; `Field_6ee865a5` is the only cost.
- WB animation and FOV ADS effects are parallel. When they agree they count once; a
  conflict stops generation. The GS ADS route is separate and not added.
- Magazine shifts on the site are relative to the default magazine. Regular packages
  (`U_WPM_MAG_Std_W05`) add draw +1 (site −1), so other magazines draw slower than the
  default even without a draw operand.

## Availability

- 5,542 attachment records; 11 have no branch in the ability root list. Of 5,531 linked
  branches, 5,388 have kill-switch default False and 143 True. These are exported
  defaults, not a live roster.
- A True default is good exclusion evidence (all 15 unmapped SubsonicFrangible assets
  are True). An unset switch does not prove availability.
- Source presence is not availability: SVK-8.6 Adjustable Angled and AK-205 Underslung
  Mount exist in the data but are not offered in game, and were removed.

## Generated site values

| Area | Generator | Result |
|---|---|---|
| Barrel ADS | `scripts/frosty-barrel-ads.py` | 233 unique weapon/barrel selections (234 records). Basic, Short, Light, Cryogenic, Extended Light, Short Light +1; Extended, Heavy, Heavy Extended and both VSSM barrels 0. M4A1 Basic 200 ms; both VSSM barrels 250 ms. |
| Grip, laser, magazine handling | `scripts/frosty-attachment-handling.py` | 1,487 selections, 5,489 fields. Grips and lasers store per-weapon `frostyModifiers`; magazines use their existing per-weapon fields. |
| Sniper brakes | `scripts/frosty-sniper-brakes.py` | 16 weapon/brake pairs, +6 amount tiers (`GRM_Recoil_MZL_Bolt_P10`). |
| Linear Comp and burst | `scripts/frosty-assumption-review.py` | 45 Linear Comp and 8 burst selections (below). |
| Slots and prerequisites | `scripts/frosty-attachment-compatibility.py` | See [data graph](DATA_GRAPH.md#slots-and-prerequisites). |
| Collateral, ballistics | `scripts/frosty-collateral.py`, `scripts/frosty-ballistics.py` | See [Weapons](WEAPONS.md). |
| Tooltips, optic categories | `scripts/frosty-attachment-tooltips.py` | See [UI text](UI_TEXT.md#current-site-mapping). |

All generators accept `--root <Frosty export root>`; most accept `--check` for a
read-only comparison. They stop when a generated field loses its source mapping or the
input hashes change. Commands: [maintenance](../../MAINTENANCE.md#regenerate-attachment-modifiers).

### Handling details

- **Coordinates, not effects.** M60 and PW7A2 base indices come from `GRX_Weapons`
  (M60 ADS 2 → 1, M60 ADS movement 6 → 4, PW7A2 ADS movement 10 → 8). Bases and magazine
  modifiers changed together, so results are unchanged
  ([proof](../../reference-data/provenance/frosty-handling-coordinate-proof.json)).
- **Unbound selectors.** DRS-IAR Alloy Vertical and both RPK-74M 30-round magazines
  generate from matched sibling modifiers; three extra selectors have no binding and are
  recorded, not assigned values
  ([evidence](../../reference-data/provenance/frosty-handling-unbound-selector-review.json)).
- **Green laser.** The normal LA-23 has the hip step; its `_IR_SP` single-player variant
  does not. The site maps only the normal attachment.
- **Shotgun tube variants.** M1014 4 Rnd / 4 Fast are `MAG_Compact1` / `Compact2`; M87A1
  5 Rnd / 5 Fast are `590A1 MAG_Compact1` / `Compact3`. Variant values (99 tube; 4 and 5
  speedloader) identify the variants; they are not reload multipliers.
- **VZ.61 "lasers".** Canted, Folding, Ribbed and Stippled Stubby and Compact Handstop
  are grips on a shared rail.
- **Belt boxes.** M240L 75 Rnd binds `GDM_Array_ADSMoveDispersion_MAG_P10` (+1: 0.32 →
  0.22°). The L110/M123K 200-round selector has no spread binding; the site uses 0
  (bug entry 7).
- **Suppressor identities.** `ImprvdSuppressor01` is CQB, `ImprvdSuppressor02` is
  Lightened.

### Recoil operands

| Attachment | ADS amount / variation steps | Hip amount / variation steps |
|---|---|---|
| Linear Comp | −1 / +3 | −1 / +3 |
| Burst Training; SL9 Burst Mode | 0 / +3 | 0 / +3 |
| GRT-BC Burst Training | +1 / +3 | +1 / +3 |

Burst attachments select a fire-mode modifier and a behavior node (mode mask 8 = enum
value 3) whose selector the GS recoil bindings use. The +1/−1 amount operands cancel on
ordinary burst attachments; GRT-BC has +2/−1.

Applied follow-ups:

- Smooth Bolt: −0.5 time-exponent addition on 17 muzzles.
- `GRM_AutoIdentifier_P00`: −0.0006 s duration addition on five weapons, after any muzzle
  duration override.
- Mini Scout Tungsten: −7 amount steps (combined −1/−6 links).
- Slim Angled: moving-ADS index −1 on PSR, SV-98, KS18K, L115, Mini Scout and
  Interdictor (bug entry 1).

## Lights

All twelve `GBM_Increase_Hip_{S1..S5,A30..A60}_RGT_P10` assets hold the same ten entries:
two hip branches (`Field_447d6d51`, `Field_0a160c57`), each with

| Target | Name | Operand |
|---|---|---|
| `Field_0084b1d1` | `IncreasePerShot` | ×0.666667 |
| `Field_2ca8533e` | `FiringDecreaseCoefficient` | ×1.837117 (= 0.666667^−1.5) |
| `Field_1b9eef5d` | `FiringDecreaseOffset` | ×0.666667 |
| `Field_4d3f0635` | `NotFiringDecreaseOffset` | ×0.666667 |
| `Field_aa558d2b` | `IdleDecreaseOffset` | ×0.666667 |

Links cover 62 weapons. The site applies these factors to 137 supported light
selections, treats a selected light as on, and does not model idle recovery. Native
activation is not decoded.

## Sway

206 weapon-sway and 3 camera-sway objects. Shared P05/M05/P10 factors are
0.6666667/1.5/0.4444444. The site shows muzzle and magazine amount changes as a
percentage against the default loadout (magazine strengths include −33.3% and −55.6%;
adverse muzzle factor 1.5 gives +50%). Optic and camera sway are not shown, because the
site's six sight categories do not identify one source optic. `WME_DynamicPivot` uses
`Field_f235e44f`/`Field_a4f104cc` multipliers; canted iron sights set only
`Field_f235e44f` (2.5 or 3).

## Spotting candidates

The old audit multiplies two linked values into 0.014 for M39 EMR/M417 A2 CQB and
DRS-IAR/M2010 ESR Lightened; the site uses 0.14 (21 m). This is a composition question,
not proof of 2.1 m ([open questions](OPEN_QUESTIONS.md)).

## Optic categories and costs

- The site keeps six sight categories: Iron Sights (5), Standard Optic (10), Variable
  Low (20), Variable High (25), Thermal (25), Thermal Hybrid (35).
  `WEAPON_ATTS[id].sight` restricts categories; `sightPoints` overrides cost (iron 15 on
  six bolt-actions, including the Interdictor since 1.4.3.0).
- `optic_category` in `scripts/frosty-attachment-tooltips.py` classifies each Frosty
  optic by its UI label only ("Basic Sight" = iron; variable ranges listed explicitly).
  It stops on an unknown label or two costs for one category on one weapon.
- `scripts/optic-costs.test.mjs` compares the newest
  `frosty-optic-category-mapping-*.json` with `data/attachments.json` (category set,
  `sightPoints`, default costs).
- 350 site optic choices map to 1,927 Frosty sight records. Optic names:
  [UI text](UI_TEXT.md#attachment-and-optic-names-aam-records).

## Optic render FOV and zoom

Evidence: [frosty-optic-render-fov-2026-09-16.json](../../reference-data/provenance/frosty-optic-render-fov-2026-09-16.json).
Field meanings come from values and in-game screenshots.

### Finding the part an attachment uses

Take the attachment's selector GUIDs (the `selectors` in
`frosty-optic-category-mapping-*.json`). In the WB, the part in `Field_0cd9f20f` whose
`Field_819acc98` lists the GUID is the part (an external `WPM_*` file or an inline
`Class_897c99a7`). Follow its local pointers to `Field_7768ebf2` (render FOV) and to any
`Class_fe7cd16a` (aim override). Ignore inline `U_ATT_*` model parts that list the same
selector without an aim; they caused about 35 false aim mismatches.

### Render FOV

`Field_7768ebf2` is the weapon render FOV in degrees; 55 is the default. It changes how
large the weapon, optic and arms are drawn, not the world zoom.

- **RPK-74M and L115 (bug entry 11).** They link the base
  `WPM_SCP_{RMR,RomeoX,EotechEFLX,AcroP2,TrijiconSRO,ShieldCQS}` parts (55). Other long
  guns use `_Riser` or `_LowRiser` parts at 40 (CQ RDS 44). Confirmed in game on the
  RPK-74M: the optic looks small and the arm stretched.
- **Consistency.** 57 of 63 optics have one value on every weapon. Riser, low-riser and
  mounted versions give the same value everywhere; only the six base parts differ.
- **Pistols.** ES 5.7, GGH-22, P18 and M45A1 use the base parts; M44, vz. 61 and M357
  Trait use `_LowRiser` (40). 55 on the four may be unintended; not checked in game.
- **Mounted parts.** `RMR_Mounted` (38), `AcroP2_Mounted` (42), `TrijiconSRO_Mounted`
  (42) and `EotechELFX_Mounted` (55) are not linked by any WB. `ShieldCQS_Short_Mounted`
  (44) is linked by one weapon.
- **M2010 ESR.** Inline model parts hold SDO 55 (shared part 34) and LERT 59 (shared 20).
  Which value applies is not known.
- **No formula.** Render FOV does not follow magnification (correlation about −0.6 with
  log magnification). 6× to 10× scopes use 16–28; red dots and low-power optics mostly
  28–44; at 3.50× the SDO has 34 and the MGO 48. Read the value per part.
- **Rejected causes.** Riser model height (same model and aim), the
  `Field_149939ab`/`Field_e9129d03` pair (1.25–1.3 on some riser parts; the MRO has no
  pair) and the zoom levels.

### Iron sights

- No iron-sight part overrides the aim, so every weapon uses `Aim_1x50` → `1_5xZoom`:
  **1.50×**. 1.00× optics (`Aim_01x00_PiP`) zoom less. The operator confirmed this in
  game; the site shows "Iron Sights (1.50x)".
- Iron render FOV is weapon specific: 18 (KTS100 MK8) to 50, except SL9 and four
  pistols at 55. The SL9 was checked in game with no visible effect found; the value may
  still be unset by mistake. Screenshots with very different values (SL9 55, KTS100 MK8
  18, PW7A2 50) show the same world zoom; only the weapon size differs.

### Zoom levels

| Asset | Camera FOV (°) | Zoom | PiP factor |
|---|---|---|---|
| `DefaultBase`, `1_0xZoom`, `Zoom_01x00_PiP` | 55 | 1.00 | 1 |
| `1_25xZoom` | 45.21893 | 1.25 | 1 |
| `1_5xZoom` | 38.27812 | 1.50 | 1 |
| `Zoom_01x50_PiP` | 39.2611 | 1.50 | 1.027778 |
| `Zoom_04x00_PiP` | 18.47956 | 4.00 | 1.25 |
| `Zoom_10x00_PiP` | 8.929769 | 10.00 | 1.5 |

Camera FOV = 2·atan(tan 27.5° × factor / zoom). All 36 levels are in the report
(`zoomLevels`). `Aim_Default_IronSight` (`1_25xZoom_IronSights`) exists, but no weapon
blueprint links it. The G36 built-in sights use `Aim_Fast_1x25` and
`Aim_300_6_1x00_8x00`.

### Recheck after an update

Compare `opticRenderFovByPart`, `riserFamilyLinksByWeapon` and `ironSights` in a new
dated report with this one. All 1,810 optic parts with their own aim zoom to the
magnification in their UI label.

## Evidence

- [frosty-attachment-handling-generated.json](../../reference-data/provenance/frosty-attachment-handling-generated.json),
  [frosty-barrel-ads-generated.json](../../reference-data/provenance/frosty-barrel-ads-generated.json),
  [frosty-sniper-brakes-generated.json](../../reference-data/provenance/frosty-sniper-brakes-generated.json),
  [frosty-assumption-review.json](../../reference-data/provenance/frosty-assumption-review.json)
- [frosty-barrel-ads-2026-09-13.json](../../reference-data/provenance/frosty-barrel-ads-2026-09-13.json):
  WB and GS ADS routes (24 selections differ; the site follows WB)
- [frosty-handling-mapping-followup.json](../../reference-data/provenance/frosty-handling-mapping-followup.json),
  [frosty-other-attachment-review-2026-09-13.json](../../reference-data/provenance/frosty-other-attachment-review-2026-09-13.json)
- [belt-box-moving-ads-2026-09-13.json](../../reference-data/provenance/belt-box-moving-ads-2026-09-13.json)
- [frosty-light-field-names-2026-09-13.json](../../reference-data/provenance/frosty-light-field-names-2026-09-13.json)
- History: [attachment generation review](../archive/FROSTY_ATTACHMENT_GENERATION_2026-09-13.md),
  [optic source plan](../archive/OPTIC_FROSTY_SOURCE_PLAN.md)
