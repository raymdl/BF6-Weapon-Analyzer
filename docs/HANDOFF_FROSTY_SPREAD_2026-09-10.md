# Frosty source checks and stored spread bounds — handoff

Initial status recorded 10 September 2026 at `32800ef`. On 11 September 2026, the
operator approved including these stored-spread and source-recheck changes in the
timed-recoil release. The investigation and original validation below are retained
as evidence. Current behavior is documented in [recoil and spread](RECOIL_SPREAD_MODEL.md)
and [stat ladders](STAT_LADDERS.md).

## Objective and decisions

The operator asked us to compare a collaborator's weapon dataset, recheck BREN3
(BROD 3) and EF88 values inherited from Battlefield Companion, and remove the
global moving ADS minimum override in favor of each weapon's stored minimum.

- Use source-supported values. Agreement with a collaborator is not sufficient
  when the actual Frosty source disagrees.
- Keep attachment spread effects. Remove the global base and alternate bound,
  not the attachment tier calculation.
- Preserve unrelated attachment-audit work.

## Completed source investigation

The collaborator's input is `C:/Downloads/bf6_weapons_combined.json`.
All 63 `verified` blocks matched our saved
`outputs/frosty/1.4.2.5/sym-bf6-reference.json` in the comparison. This does not
establish how the collaborator obtained the data or independently verify it.
The fields labeled `novel` were already present in our registry extraction.

A targeted comparison of 2,750 scalar entries found 2,738 exact matches and 12
missing named BREN3 spread entries. Missing names are not necessarily new stats:
we have separate raw-field candidate research for BREN3. Results are retained in
`outputs/frosty-peer-comparison.json`; this is a scoped comparison, not a complete
validation of every field or native equation.

Frosty inputs were re-read from existing XML exports at:

```text
C:/Users/royal/Documents/BF6 Datamining/Frosty
```

No fresh export from the installed game was performed. The source build remains
the user-supplied `1.4.2.5` label. Manifests, scripts, and research outputs remain
in the parent datamining folder.

### BROD 3

The WB points to `Common/Hardware/Weapons/_Bullets/PD_556x45mmNATO_Carbine.xml`.
The projectile's `Field_2ad7e688` resolves to the named `TweakableDamageCurve`.
Its ordered curve exactly matches our retained damage, including tier values
`26.05 / 21.56 / 17.74 / 17.13 / 14.62`. The collaborator/Sym magnitudes differ.
Damage was therefore retained.

The moving ADS array selector is index 3, which gives `0.32` degrees. The stored
minimum was corrected from `0.35` to `0.32`. Runtime already selected `0.32`.

Evidence: [BROD 3 source recheck](../reference-data/provenance/frosty-brod3-source-recheck-2026-09-10.json).
It records source hashes, object GUIDs, curve references, and the spread selector.
BREN3's ambiguous raw recoil/spread identities remain unresolved; this check did
not decode them.

### EF88

The WB points to `Common/Hardware/Weapons/_Bullets/PD_556x45mmNATO.xml`.
Its named damage curve exactly matches our retained `26.05 / 20.67 / 17.13`
tiers and breakpoints. All 62 checked scalar values matched the named registry,
including recoil, spread dynamics, RPM, velocity, capacity, and reload times.

The moving ADS array selector is index 3, giving `0.32` degrees. The stored
minimum was corrected from `0.25` to `0.32`. The separate raw MinMaxDispersion
registry literal is `0.35`; it is not the selected table value. Runtime already
used the indexed table.

Evidence: [EF88 source recheck](../reference-data/provenance/frosty-ef88-source-recheck-2026-09-10.json).
Historical donor/source records remain in the weapon provenance. Legacy
`reloadSpeed` was not independently resolved by this check.

## Spread audit and implementation

Compared all 504 stored bounds for 63 weapons: minimum and maximum for ADS/hipfire,
stationary/moving. Before removal of the global override, Interdictor (`0.30`)
and VSSM (`0.35`) were the two remaining stale stored moving ADS minima. Both
have now been changed to `0.32`, consistent with the recorded source array review.

The four shotguns have intentional default-ammunition hipfire changes:
M87A1, M1014, 18.5KS-K, and DB-12 resolve stationary `2.432 -> 1.444` and moving
`3.04 -> 1.805`. These are attachment effects, not stale base data. They remain.

No stationary ADS minimum or maximum bound differed between stored data and
the default runtime. All 310 available named Frosty comparisons for stationary
ADS minima and all maxima matched. BREN3 lacks those five named bindings;
its raw records support the corresponding values.

Implementation changes:

- Removed `DEFAULT_MOV_TIER` from balance data and runtime context wiring.
- Removed `_movingAdsMinSpreadDeg` and the special override in `spreadBounds`.
- `applyAttachments` starts from `w.spread.adsMove[0]`. With a nonzero attachment
  shift and a matching table row, it shifts from that row, clamps to the table,
  and writes the result into the returned `spread.adsMove` pair. Maximum is preserved.
- With no shift, the stored minimum is preserved. If a base has no exact table
  match, the present implementation preserves it instead of inventing a tier.
  All current stored moving minima match the table. Revisit this explicit
  behavior if adding off-table source values and attachment shifts later.
- UI and simulation read the same spread bound. Hipfire logic is unchanged.
- Updated documentation and existing assertions. Added a regression check using
  a synthetic `0.43` base, attachment shift, clamping, source immutability, and
  all 63 default loadouts.

## VSSM hipfire follow-up � 11 September 2026

The former index-2 override retained the older class-based baseline while the
raw selector/default configuration was unresolved. Matched standing screenshots
now show VSSM and M4A1 at 81 px, AK4D at 103 px, and M39 EMR at 136 px. This
supports raw index 4. The override was removed and stored minima changed to
`1.804 / 2.255`; moving remains a source-row inference. See the
[VSSM recording analysis](VSSM_RECORDING_ANALYSIS_2026-09-11.md). This later
correction is separate from the completed global moving-ADS override removal.

For the collaborator, the useful follow-up is source paths, object GUIDs, raw
field mappings, game build, and decoded reload enum/timer payloads. Matching
numbers alone do not establish independent dehashing or native formula evidence.

## Files belonging to this change

- `data/weapons.json`
- `data/balance_tables.json`
- `sim/applyAttachments.js`
- `sim/core.js`
- `ui/app.js`
- `scripts/attachment-effects.test.mjs`
- `scripts/barrel-velocity.test.mjs`
- `scripts/source-arrays.test.mjs`
- `docs/DATA_REFERENCE.md`
- `docs/RECOIL_SPREAD_MODEL.md`
- `docs/STAT_LADDERS.md`
- `reference-data/provenance/frosty-brod3-source-recheck-2026-09-10.json`
- `reference-data/provenance/frosty-ef88-source-recheck-2026-09-10.json`
- This handoff.

Unrelated existing changes include the attachment-audit workbook/JSON, audit
scripts and schema, the September 7 site review and provenance, audit reports,
and `soldier-target-original.png`. Do not stage them with this work by default.

## Validation and resumption

Completed after the implementation:

```text
node scripts/test.mjs                 63 passed
node scripts/validate-data.mjs        passed, 63 weapons
node scripts/validate-ship-surface.mjs passed
node --check ui/app.js                passed
git diff --check (changed code/docs)  passed
```

No browser visual check or deployment was performed for these changes. The last
edit after runtime validation only corrected a stale formula in documentation.

Publication of this scope was approved on 11 September 2026 alongside the recoil
model update. The release checks cover the combined implementation. The earlier
export-location documentation release did not contain these data/runtime changes.
Unrelated attachment-audit work remains outside this release.

Shareable references created during the session remain local under `outputs/`:

- `BF6-Frosty-Weapon-Attachment-References.md`
- `BF6-Frosty-Stats-and-File-Locations.md` — includes field mappings and dehashing details.

The separate `audit_weapon_exports.py` still expects its manifest inside `--root`.
Changing only its root to the new `Frosty` subfolder is insufficient; that script
limitation was documented but not repaired in this work.
