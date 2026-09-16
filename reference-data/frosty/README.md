# Frosty asset collection

`asset-watchlist.json` is the shared collection plan. It is an initial seed, not a completed export or proof that all listed references affect gameplay.

After a game update, follow [docs/GAME_UPDATE_GUIDE.md](../../docs/GAME_UPDATE_GUIDE.md) and record what you learn back here.

## Current seed

- 8,062 asset paths matched against the saved 464,499-entry EBX catalog. Codex seeded 7,639; the earlier merge added 354 from 21 more research sources. The 14 September compatibility merge adds 69 paths and cites 5,480 source assets for physical slots and equipment dependencies.
- Evidence comes from the sources listed under `evidence`. Source-hash sections were used where available (including hash keys that are unique file names); otherwise catalog-matched path mentions were used. This includes broad inputs read by the attachment generators, not only operands approved for the site.
- Direct external EBX references were read from existing XML files. Three assets are still `pending-export`.
- The two known material grids use raw EBX only. `fs_us_loc` also needs a `strings` export: its text is in binary chunks that XML does not contain. Other entries request raw EBX and XML.
- Dependencies are structural references, not proof that a branch is active. Targets outside the asset list still need collection and recursive inspection. No recursive dependency closure has been claimed. For example, `AttachmentCategory_Sight` is only a dependency, but the optic generator classifies sights through it.
- Claude research reports from 6-14 September 2026 are merged. Superseded early passes (`frosty-attachment-followup-2026-09-06`, `frosty-attachment-full-pass-2026-09-06`, `ebx-manifest-second-pass-2026-09-06`) and the animation-state review are not evidence sources. The label `1.4.2.5` does not independently verify the build of every existing file.

The full catalog stays in the external BF6 Datamining directory. The watchlist records its hash so a replacement catalog cannot silently change the baseline. Do not copy the full catalog into the watchlist.

As of 14 September 2026, `datamining` resolves to `C:\Users\royal\Documents\BF6 Datamining`. The 1.4.2.5 XML root is `Frosty Exports\1.4.2.5` beneath that directory. The tools root is `FrostyToolsuite-battlefield6`, with no repeated nested folder; its runtime is `FrostyEditor\bin\Release\Final`, which also holds `SharedTypeDescriptors.ebx`.

## Maintaining the list

Use the internal asset path, without `.xml`, as the identifier. Match case-insensitively and retain catalog spelling. Sort assets and dependencies by path. Each asset must cite at least one evidence ID; the evidence entry explains its purpose and identifies the report or consumer.

Add new findings after their collection finishes. To add a research report, add an entry to `EVIDENCE` in `scripts/frosty-watchlist-merge.py` and run it (dry run without `--write`). The script stops if the catalog hash changed, adds new paths, keeps existing dependencies, and scans a `pending-export` entry once its XML is in the export root. Retain missing paths as explicit review items rather than inventing replacements. Re-scan references from new exports: the current dependencies are a baseline, not a permanent override.

Discovery rules are instructions for a future collector, not executable automation. Review new candidates before expanding required collection. Compare the complete old and new catalogs as well, so discoveries outside these prefixes are still visible.

## Research findings

`asset-findings.json` stores curated findings keyed by internal Frosty path. It contains 217 findings across 171 assets, including 62 ability and 56 equipment findings from the compatibility investigation, 26 selector-package findings from the 14 September description review and 19 optic render FOV findings from 16 September. The material-grid record inventory (`scripts/frosty-material-grid-inventory.py`) names grid types by GUID from Frosty's `FrostyPlugin/Sdk/ClassGuids.txt`; BF6 field-name hashes do not match standard hash algorithms, so hashing names from other sources does not work. It records contents, the question investigated, the result, evidence pointers, inspected asset hashes where available, build limits and revisit conditions.

Check this file before repeating an investigation. Results apply to the stated question and method. `inconclusive` does not mean the asset is unrelated; `blocked-by-decoding` does not mean it lacks useful data. A `useful` result does not establish native runtime behavior beyond the cited evidence. There is no permanent exclusion flag.

Add new findings as separate entries. Preserve earlier results and explicitly link later evidence that supersedes them. Do not assign an inspection date or verified build without supporting evidence. Evidence pointers are JSON Pointers into the cited reports; a null pointer refers to the cited script or document as a whole.

Compare hashes only within the recorded format: raw EBX and XML hashes are different evidence. Asset or dependency changes, improved decoding and new consumer evidence are reasons to review a finding. These review triggers are documented rules, not active automation.

## Shared slots and attachment dependencies

The [compatibility report](../provenance/frosty-attachment-compatibility.json)
records 1,391 offered grip/laser/light choices and all 285 inspected equipment
dependency entries. Twenty-two rules map to offered attachments on PP-19,
AK-205, RPK-74M and RPKM. The other 263 entries concern secondary sights outside
the offered choices or reviewed mapping; they remain explicit source evidence.

- **Physical slots:** follow ability root `Field_d7605aab` to its listed branches.
  `Field_f86e0433` identifies the attachment progression; `Field_64ef48eb` identifies
  its slot category. Attachment types assigned to the same slot share one choice.
  This corrects KORD and KTS100 to one laser/light slot; PP-19 retains separate
  side slots. Do not restore the earlier hand-maintained combined-slot flags.
- **Prerequisites:** equipment `Field_e70ce6be` holds `Struct_4f9523cc` records.
  `Field_399fae20` names the dependent attachment and `Field_f4142987` lists allowed
  prerequisite IDs. Resolve those IDs against attachment `Field_de6f63b3` values.
  These integer links are not discovered by searching external EBX GUIDs alone.
- **PP-19 proof:** every one of its 12 underbarrels lists the other five magazine
  source IDs and excludes 53-round Extended4 (`0x81260446`). The supplied 30/53-round
  screenshots corroborate the restriction. See the [operand trace](../../docs/archive/PP19_53_ROUND_COMPATIBILITY_2026-09-14.md).
- **Limits:** the other compatibility rules are source-backed, without equivalent
  new in-game tests. Findings identify existing XML hashes in the 1.4.2.5 export
  directory, not a newly verified game build or decoded native condition engine.

Regenerate with [frosty-attachment-compatibility.py](../../scripts/frosty-attachment-compatibility.py)
and the [maintenance command](../../MAINTENANCE.md#regenerate-attachment-modifiers).
After reviewing a new result, merge its collection evidence with
`scripts/frosty-watchlist-merge.py` and append affected asset findings. Review
changed slot categories, prerequisite IDs and site identity mappings after updates.
The watchlist includes the files read by the generator; it does not claim a full
recursive dependency closure or approval of every operand in those files.

## Tools, decoding and per-build collection

Moved to [Frosty tools](../../docs/frosty/TOOLS.md): FrostyCmd commands, safety rules,
SDK and decoder notes, export coverage, per-build collection rules and status, and the
generators to rerun after an update. Field meanings are in the
[field map](../../docs/frosty/FIELD_MAP.md).

## Structural findings that help comparisons (15 September 2026)

**Generic structs.** `Struct_cb53a662` is a three-member struct (`Field_3901db14`,
`Field_42fc0f5e`, `Field_32a99b9c`) reused throughout the data. A field hash inside it
means nothing on its own; the *containing* field gives the meaning. `Field_32a99b9c`
carries muzzle velocity only inside `Struct_739f3ac5` (`Shot.InitialSpeed.z`); elsewhere it
is just the third member. Check the enclosing struct before reading any of these three.

**Damage curves** live in `Common/Hardware/Weapons/_Bullets/PD_*`, not the weapon
blueprint. Each curve stores distance and damage together: `Field_3901db14` is the
distance, `Field_42fc0f5e` the damage at it. The same curve is stored twice per object, as
a point list (`Field_edfc6df6` of `Struct_c45202f2`) and as a flat interleaved array
(`Field_5279388d`). **The two can disagree** — in 1.4.2.5 the Interdictor's differed on the
fourth distance, 170 in the point list against 175 in the flat array. Read both and
reconcile.

**Hit-zone multipliers** are in the level material grids, not in any weapon asset.

**Camera recoil (`GCR_*`) is a magnification ladder.** `Field_bbbfe9cc`, active only where
`Field_bbffe8bc` is `True`, takes one value per magnification, strictly monotonic:

| Zoom | Value | Zoom | Value |
|---|---|---|---|
| 1.00x | -0.5 | 3.50x | 0.449399 |
| 1.25x | -0.254767 | 4.00x | 0.505185 |
| 1.50x | -0.084472 | 4.50x | 0.54968 |
| 1.75x | 0.041348 | 5.00x | 0.586081 |
| 2.00x | 0.138476 | 6.00x | 0.642258 |
| 2.50x | 0.279325 | 8.00x | 0.715803 |
| 3.00x | 0.377135 | 10.00x | 0.762266 |

`Field_7f1bb9d4` and `Field_9532eb28` are a pair and should hold the same value in a given
member. All 34 assets were checked against the ladder: the only defect was the SU-230 LPVO
(`GCR_LPVO_4x00_1x00_P00`) whose **1x** state held `10`, fixed in 1.4.3.0. A higher value
appears to mean less camera shake, from the operator's in-game report plus the ladder's
shape; the unit is not decoded.

**Field identities confirmed so far:** attachment point cost `Field_6ee865a5`; recoil
amount `Field_22810b21`; recoil direction variation `Field_865174fa`; muzzle velocity
`Shot.InitialSpeed.z` = `Field_32a99b9c` in `Struct_739f3ac5`.

**`Field_440ed7fa` is a frame-quantised duration.** All 15 distinct values across 64 weapon blueprints are exact whole 1/60 s frames (4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 24 and 0); the apparent error is 3-decimal rounding of n/60. It is **not** the rate of fire: `GRX_Weapons` names RateOfFire separately and the two disagree on at least nine weapons (590A1 0.4 against 60/RateOfFire 0.033, DP12 0.4 against 0.167, Desert Tech HTI 0.4 against 0.2, and the ACE32, APC10, BREN3, HK433, EF88 and HK417A2 one or two frames above cadence). Where they agree it equals 60/RateOfFire rounded to a frame. It is not a named registry leaf: value-matching against every GRX_Weapons leaf returned only CustomZeroingDelay at 7 of 12 weapons, and that leaf is a constant 0.4 on the DMRs where it disagrees. Reading: a timing window that tracks cadence but is clamped, most likely animation or input rather than cadence. 1.4.3.0 put the ScorpionEvo3 and Skorpion on 4 frames from unset. Not semantically named, not applied to the site.

The neighbouring `Field_52a8ad43` is a constant 0.067 (four frames) on every weapon.

**Known unexplained:** `Field_c39698a3` moved from `0xffffffff` to a small integer in 241
of 248 attachment metadata assets in 1.4.3.0. `Field_6eb133f8` (a per-zoom view block in
`Class_76a3b0eb`) has no semantic name; 222 occurrences across weapon XML, 90 of them
`(0,0,0)` and 64 `(0,0,-99.8)`, so `-99.8` is a common standard value rather than an
outlier.

## Anomaly scans

Diffing finds change; these find defects, including ones that predate the current build.
Described with worked examples in
[the game update guide](../../docs/GAME_UPDATE_GUIDE.md#stage-6--consistency-scans):
ladder checks, paired-field disagreement, flag/value mismatch, multi-package selection
(`scripts/frosty-multi-package-scan.py`), relative-to-default comparison,
description-versus-effect grouping, and string-set comparison.

## Attachment modifier fields (14 September 2026)

Observed in the 1.4.2.5 XML export while tracing Slim Angled grips, magazines, ammo
and vertical grips ([description mismatch list](../../docs/ATTACHMENT_BUGS.md)).
Meanings come from operand patterns that match site values. Native consumers are not
decoded.

| Asset / class | Field | Meaning |
|---|---|---|
| `Attachment_*` (`Class_a9b2eb87`) | `Field_157a7d74` | Progression (`U_PRG_*`) reference |
| | `Field_fe77e9a9` | Attachment category |
| | `Field_6ee865a5` | Point cost. The only cost field; package names do not set cost |
| | `Field_de6f63b3` | Attachment ID hash used by equipment prerequisites |
| Ability branch (`Class_74f6b9e4`) | `Field_ffba60f0` | Action list (`Class_4ed159fb`) |
| | `Field_def7f8dd/Struct_181e89a5` | Killswitch: registry reference `Field_e0b43a29/Struct_9bc51bd0/Field_6b28f68f`, local fallback `Field_043d7a08` |
| Action (`Class_4ed159fb`) | `Field_7e54e22c` | Unlocks: `U_WPM_*` modifier-package selectors and art unlocks. One action can list several packages |
| WB modifier (`Class_897c99a7`) | `Field_819acc98` / `Field_9690d604` | Selector GUIDs / `WME_*` effect assets |
| GS binding (`Struct_3e61171a`) | `Field_6d011165` / `Field_2f0e5b83` / `Field_3f680d24` | Selector GUID / bound modifier (`GRM_*`, `GID_*`, `GDM_*`) / entry index |
| `GDM_Array_*Dispersion_*` (`Class_743a3ce0`) | `Field_94752c29`; `Field_9540bd8e/Struct_d204f959/Field_4692836a` | Target array (`Field_84e57075`); signed index step (`0xffffffff` = -1) |
| `WME_ADSTime_FOV_*` (`Class_104c2294`), `WME_ADSTime_Anim_*` (`Class_016623ac`) | `Field_9540bd8e` | ADS step; the two must agree |
| `WME_Draw_Deploy_*` (`Class_4aac041b`), `WME_Draw_Sprint_*` (`Class_03db7a68`) | `Field_9540bd8e` | Draw step (`P05` = 1, `P10` = 2) |
| `WME_ADSMoveSpeed_*` (`Class_303a33cc`) | `Field_c427eabf` | ADS movement step (`M05` = -1, `P10` = 2) |
| `WME_ReloadSpeedRegular_P10` (`Class_9705264b`) | `Field_348b8cd1` | Reload multiplier 1.13 (site `reloadSpeedTier` 1) |
| `WME_WSway_*` (`Class_2fea847d`), `WME_CSway_*` (`Class_28d25398`) | `Field_90fd0310` and following floats | Weapon / camera sway multipliers (1.5, 0.6666667) |
| `WME_Penetration_*` (`Class_d11a23a2`), `WME_Protection_*` (`Class_e85fff64`) | `Field_fbfacac9` | Penetration or protection steps (`P05` = 1, `P15` = 3) |
| `WME_HealthRegenDelay_*` (`Class_5830cb87`) | `Field_8359723e` | Seconds added (Frangible 4) |
| `WME_SpotRange_*` (`Class_0045e7fa`) | `Field_d98b0371` / `Field_6f8d5f40` | Minimap / in-world spot range factors (suppressors 0.14 / 0) |
| `WME_Flag_IsSilenced_P00` (`Class_c6c66955`) | `Field_ffba8126` | Silenced flag |
| Magazine package (`Class_e7d2410a`) | `Field_7f22bfb4` | Capacity including the chambered round (40 Rnd = `0x29`) |

Composition observations:

- A package's `WME_*` effects apply to a weapon only when that weapon's `*_WB.xml`
  lists the package's WB modifier. M2010 ESR lists `WPM_BTM_FastBOLT02_W15`; L115,
  Mini Scout and Interdictor select that package but do not list its WB modifier.
- GS bindings are per weapon. `Vertical03_W20` has a recoil binding in `GS_BREN3`
  but none in `GS_M27IAR`.
- `_W##` suffixes on `U_WPM_*` names are not costs: 334 of 3,016 suffixed actions
  have a different `Field_6ee865a5`.
- Magazine shifts on the site are relative to the default magazine. Regular packages
  (`U_WPM_MAG_Std_W05`) add draw +1 (site -1), so other magazines are slower to draw
  than the default even without a draw operand.
- `scripts/frosty-multi-package-scan.py` lists actions with several packages.

## Optic render FOV, aim zoom and names (16 September 2026)

From the RPK-74M report that optics look held further out. Full values, method and
asset hashes: [optic render FOV report](../provenance/frosty-optic-render-fov-2026-09-16.json).
Bug entry: [Attachment bugs](../../docs/ATTACHMENT_BUGS.md#visual-errors). Field
meanings come from values and in-game screenshots; the field names are not decoded.

| Asset / class | Field | Meaning |
|---|---|---|
| Optic part (`Class_3a930efc`), WB (`Class_76a3b0eb`) | `Field_7768ebf2` | Weapon render FOV in degrees. 55 is the default; the WB object at 59 is hip fire (links `DefaultHipFireRenderFovScale`) |
| WB aim object (`Class_542ac52c`) | `Field_4f917af5` | Weapon default aim. All 63 weapons: `Aim_1x50` (`1_5xZoom`) |
| Part aim override (`Class_fe7cd16a`) | `Field_4f917af5` | Optic aim, for example `Aim_01x00_PiP`. Iron-sight parts have none |
| Zoom level (`Class_86ce0d70`) | `Field_65ad1346` / `Field_3edbd391` / `Field_28ae4fd6` | Camera FOV = 2·atan(tan 27.5° × factor / zoom) / 1/zoom / PiP main-camera factor |
| AAM record (`Class_ccf7da47`) | `Field_fd698f51` → `Class_fbe1d3bc.Field_3d34898a` | In-game name string id (`0xadd3ecaf` = "R-MR 1.00x") |
| | `Field_85b318a1` | AD asset: label and description string ids |

**Find the part an attachment uses.** Take the attachment's selector GUIDs (already in
`frosty-optic-category-mapping-*.json` `selectors`). In the WB, the part in
`Field_0cd9f20f` whose `Field_819acc98` lists that GUID as a bare string is the part. It
is an external `WPM_*` file or an inline `Class_897c99a7`. Follow its local pointers to
`Field_7768ebf2` and to any `Class_fe7cd16a`. Ignore inline `U_ATT_*` model parts that
list the same selector without an aim.

**Results.**

- **Base optic parts.** RPK-74M and L115 link the base `WPM_SCP_` RMR, RomeoX, EotechEFLX,
  AcroP2, TrijiconSRO and ShieldCQS parts (render FOV 55). The other long guns use the
  `_Riser` or `_LowRiser` parts (40; ShieldCQS 44). The four pistols with optics also use
  the base parts.
- **In-game check.** Confirmed on the RPK-74M: the optic looks smaller and the arm
  stretched.
- **Other optics.** No other optic has a different render FOV between weapons. The
  Trijicon MRO base and `_Tall` parts are both 34.
- **Iron sights.** No iron-sight part overrides the aim, so all iron sights zoom 1.50×.
  1.00× optics zoom less; the operator confirmed this in game. The iron render FOV is 18
  to 50 per weapon, except SL9 and four pistols at 55. The SL9 was checked in game: no
  visible effect was found, but the value may still be unset by mistake.
- **Consistency.** 57 of 63 optics have one render FOV on every weapon. Riser,
  low-riser and mounted versions give the same value everywhere; only the six base parts
  differ. The M44, vz. 61 and M357 Trait use the low-riser parts (40), so 55 on the other
  four pistols may also be unintended.
- **No formula.** Render FOV does not follow magnification. There is only a loose trend
  (6× to 10× scopes 16 to 28; correlation about −0.6 with log magnification). Read the
  value per part.
- **M2010 ESR.** Two inline model parts hold their own value next to the shared parts:
  SDO 55 (shared 34) and LERT 59 (shared 20). Which value applies is not known.
- **Rejected causes.** Riser model height, the `Field_149939ab`/`Field_e9129d03` pair
  (1.25–1.3 on some riser parts) and the zoom levels do not cause the difference.

## Scope

These shared JSON files define the collection plan and findings. The separate collector has captured the pre-update raw set; no complete dependency inventory is claimed. Preparation did not resume the broad backup or change Analyzer data.

## Known unresolved soldier GUIDs (16 September 2026)

The [GUID trace](../provenance/frosty-1.4.3.0-unresolved-guid-trace-2026-09-16.json)
records all object GUIDs, callers, pointer counts and local evidence hashes. The
16 caller assets are also indexed in `asset-findings.json`.

| File GUID | Caller context | Caller assets | Decoded pointer uses |
|---|---|---:|---:|
| `2631e8f8-a115-413d-a696-5ec194081d73` | Ladder, traversal, revive, melee, fire | 15 | 33 |
| `8f992c03-80cb-4ed5-8a6e-0274a57f659c` | In-air and parachute | 3 | 11 |
| `b4765624-c221-4138-b446-3b3aa155cf3b` | Overlay, melee, in-air | 3 | 3 |
| `d0a2de18-a7b2-4c3c-9e87-aff6ddc8a180` | Mandown, revive, rope, zipline | 8 | 16 |

These are confirmed references in `Class_25c12137 / Field_a2734e52 / member /
Field_8cf424e7`. All file/object pairs were already `BadRef` in the corresponding
1.4.2.5 XML. Neither build catalogue contains the target files; the 16,426 captured
raw object bodies contain no matching target objects. Exact target identities and
contents remain unknown. Caller names do not identify the targets or prove runtime
use. Keep the dependency review partial.

Reuse this result if the same pairs recur. Reopen the trace only if a target body
becomes available, a catalogue resolves the GUID, the caller pointers change, or
new consumer evidence can answer a specific question. The linked report retains
the local decoded evidence path and hash; the raw captures remain outside Git.
