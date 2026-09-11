# Live data reference

[Documentation index](README.md) · [Sources](DATA_SOURCES.md) · [Stat ladders](STAT_LADDERS.md)

This reference inventories the maintained live JSON at the review baseline. Angle
values are degrees, range/spotting are metres, velocity is metres/second, reload
and recoil-duration inputs are seconds, and handling ladders are milliseconds.
Indices and tier shifts are unitless. Schema files cover selected contracts; they
are not a complete schema for every current weapon/attachment field. The cross-file
[validator](../scripts/validate-data.mjs) and consumers define the remaining contract.

## File ownership

| File | Shape and consumer |
|---|---|
| [weapons.json](../data/weapons.json) | Ordered array of 63 base weapon records; UI, attachment resolver, simulation. IDs join all per-weapon maps. |
| [attachments.json](../data/attachments.json) | Seven ordered catalogs plus availability, ergonomics and magazine maps; loadout/attachment/share modules. |
| [ammo.json](../data/ammo.json) | Ordered `AMMO` catalog and `WEAPON_AMMO` availability, effects, velocity treatments and projectile overrides. |
| [balance_tables.json](../data/balance_tables.json) | Ordered stat arrays, geometric factors, per-weapon bases and damage-policy maps. |
| [recoil_decay.json](../data/recoil_decay.json) | `RECOIL_DEC`, `RECOIL_DEC_TEXP`, `RECOIL_DEC_EXP` maps used by legacy recoil-group fallback. Explicit per-aim groups take precedence. |
| [ballistics.json](../data/ballistics.json) | Projectile constants, source/donor ID registry and ammo drag overrides. |
| [reload-exceptions.json](../data/reload-exceptions.json) | Maintenance-only animation overrides, screenshot exceptions, composed-loadout evidence and derived counts. Runtime values are already promoted into magazine records. |
| [live-baseline.json](../data/provenance/live-baseline.json) | Maintenance-only source identity, roster and acceptance policy. |

## Weapon record

| Fields | Meaning / use |
|---|---|
| `id`, `name`, `cls`, `cal` | Stable join key, displayed name, class and caliber. Class drives menus, some policy and presentation. |
| `rpm`, `fireMode`, `burstRounds`, `burstRpm`, `burstBurstsPerMinute` | Precise fire timing inputs. Display RPM may be rounded separately. Burst fields describe within/between-burst cadence; they do not establish pump animation timing. |
| `mag`, `tacRld`, `emptyRld`, `reloadSpeed` | Base ammunition capacity and reload data. `mag` can include a chambered round; selected magazine capacity overrides it. `tacRld` is composed by the reload resolver; `emptyRld` and `reloadSpeed` are retained and not independently multiplied into tactical reload. |
| `bulletVel`, `adsTime` | Base projectile velocity and legacy ADS-time display fallback. Current handling uses indexed tables. |
| `recoilV`, `recoilDir`, `recoilVar` | Effective flat ADS amount and legacy direction/variation fields. `recoilV` already includes the base amount exponent. |
| `recoilIncAds`, `spreadMax` | Flat ADS per-shot increment and legacy maximum/fallback information. Per-context bounds and dynamics are used where present. |
| `recoil.ads`, `recoil.hip` | Raw per-aim recoil groups described below. |
| `spread`, `spreadDyn` | Per-context bounds and per-aim growth/recovery parameters described below. |
| `dmg`, `pellets` | Ordered range/damage curve and optional pellet count; damage is per pellet when pellets are present. |
| `damageStatus`, `damageSource`, `provenance` | Acceptance label, source narrative and field-level/historical evidence. These do not certify all model behavior. |

Recoil groups contain `dir`, `amount`, `amountMult`, `amountExp`, `dirVar`,
`dirVarMult`, `dirVarExp`, `decExp`, `decTimeExp`, `decOffset`, and `decFactor`.
The simulator consumes these for amount/variation and per-axis recovery.
`duration` supplies the time over which each impulse is delivered, with recovery
active during delivery. Muzzle overrides and ergonomic additions change that time.
All 126 base aim-state durations in the current 63-weapon dataset were checked
against Frosty and are 0.025 seconds; this is not a global simulator constant.
`decNorm` and `shootingDecScale` remain retained without separate native norm or
shooting-state behavior. See [recoil and spread](RECOIL_SPREAD_MODEL.md).

`spreadDyn.ads` and `.hip` contain `inc`; `firingCoef`, `firingExp`, `firingOffset`;
and `notFiringCoef`, `notFiringExp`, `notFiringOffset`. The simulator uses these for
per-shot growth and inter-shot recovery. `idleTime`, `idleCoef`, `idleExp`,
`idleOffset`, `firstShotMul`, and `distExp` are retained, not independently executed.
Impact sampling has its own fixed uniform-radius rule.

## Attachment and ammunition record fields

Catalog entries use `id`, `name`, `pts` where applicable, and optional `noEffect`,
`assumed`, or `assumedFields` annotations. An assumption annotation controls disclosure;
it is not an instruction to disable the effect. Ammo point costs come from each
weapon's availability map. Supported effect families are:

| Fields | Consumer / semantics |
|---|---|
| `adsRecoilTierMod`, `hipRecoilTierMod`, `adsRecoilVariationTierMod`, `hipRecoilVariationTierMod` | Integer exponent changes, separated by aim state. |
| `adsRecoilDecayMult`, `hipRecoilDecayMult` | Recovery-factor multipliers for the selected aim state. Smooth uses 1.2, with 1.728 for mapped Bolt selections, within the assumed recovery equation. |
| Muzzle `weaponOverrides[weaponId]` | Per-weapon fields merged over the selected muzzle record before effect composition. Contains source duration/recovery exceptions; does not change the shared catalog or base weapon. |
| `adsSpreadDecayBoost`, `hipSpreadDecayBoost` | Spread-offset adjustments. The hip boost is read from the resolved light, not a combined laser record. |
| `hipSpreadTierMod`, `movingAdsSpreadTierMod` | Source-array index shifts; signs and participating slots are specified in the ladder guide. |
| `adsSpreadIncMult`, `adsSpreadFiringDecCoefMult`, `adsSpreadFiringDecOffsetMult`, `adsSpreadNotFiringDecOffsetMult` | Source ADS-only Heavy-type barrel factors: 0.666667, 1.837117, 0.666667, 0.666667. Increment precision is retained. Missing not-firing fields keep their firing fallback. |
| `adsSpreadDynOverride`, `hipSpreadDynOverride` | Field-wise dynamics replacement; ergo overrides win over ammo on the ADS branch. |
| `adsTimeTierMod`, `adsTimeTierShift`, `adsMoveSpeedTierShift`, `sprintRecoveryTierShift`, `deployTimeTierShift` | Handling coordinates. `TierMod` and `TierShift` must not be assumed to share a sign convention. |
| `velTierMod`, `velMult` | Barrel velocity: tier field takes precedence; multiplier is compatibility fallback only when tier is absent. |
| `reloadSpeedTier`, `reloadSpeedMult`, `tacRldOverrideMs` | Magazine factor index, ergonomic multiplier, or direct tactical-animation time. |
| `setsFireModeAuto`, `setsFireModeBurst`, `autoRpm` | Receiver/ergonomic fire-mode selection; burst overrides are also supported by the resolver. |
| `recoilDurationOverride`, `recoilDurationAdd` | Seconds of impulse delivery. Selected Smooth source overrides duration to 0.05 or 0.066667, then ergonomics adds its adjustment; the result clamps at zero. Recovery acts during delivery. Native operation/order remain model assumptions. |
| `visualRecoil`, `sway`, `laserVisible` | Qualitative/display behavior; no separate camera, sway, visibility or aim-assist simulation. |
| `suppressor`, `worldSpot`, `minimapSpot`, `suppressedMinimapSpot` | Suppression selection and spot-on-fire distances. Zero is meaningful. |
| `hsMult`, `collateralMult`, `healthRegenDelayS` | Hit-zone policy, collateral display multiplier and regeneration-delay tag; no penetration/regen event simulation. |

`WEAPON_ATTS[id]` supplies slot ID arrays, `barrelDef`, optional `sightPoints`,
`laserLightCombined`, and `laserGripLightCombined`. `WEAPON_ERGO[id].avail` supplies
selectable ergonomics. `WEAPON_MAG[id]` supplies `def`, ordered `mags`, `defAds`,
`defAms`, `sprintRecoveryBaseIndex`, `deployBaseIndex`, and `deployTimeTable`.
Magazine records add capacity `mag`, handling effects, reload fields, and optional
`suspectedGameBug` evidence; the latter records expectations/observations without
silently substituting the expected fixed-game value.

`WEAPON_AMMO[id]` supplies default `def`, ammo-ID → point-cost object `ammo`,
per-ammo `effectOverrides`, `projectileOverrides`, and `velocityTreatments`.
Projectile overrides can replace `pellets` and `dmg`. Velocity treatment
`subsonic-tier` uses `subsonicVelocityTier`; absolute treatment records use
`subsonicVelocityMps`. Retained display/evidence annotations do not add another
velocity multiplication. See [attachment composition](ATTACHMENT_MODEL.md).

## Complete live array inventory

`[id]` below means a map key, and `[]` means an array element. Repeated instances
share one contract; scalar maps are listed separately afterward. This covers the
arrays in live `data/`, including metadata arrays, rather than every historical
research output or frozen site copy.

| Array path | Element / order contract | Active use |
|---|---|---|
| `weapons.json: []` | Weapon records with unique IDs. | Roster/UI iteration; joins use IDs. |
| `weapons[].dmg[]` | `{r,d,source?}` ordered nondecreasing ranges; duplicates encode discontinuities. | Damage, BTK, TTK, target damage. Never deduplicate equal ranges. |
| `weapons[].spread.adsStand[]`, `.adsMove[]`, `.hipStand[]`, `.hipMove[]` | Exactly `[minimum, maximum]` in degrees. | Selected aim/stance bounds; effective minima may be replaced by ladders. |
| `attachments: SIGHTS[]`, `MUZZLES[]`, `BARRELS[]`, `GRIPS[]`, `LASERS[]`, `LIGHTS[]`, `ERGOS[]` | Ordered ID-bearing catalogs. At review: 6, 18, 12, 49, 9, 5, 14 entries respectively. | Selection and positional share tokens; preserve existing order. |
| `WEAPON_ATTS[id].sight[]`, `.muzzle[]`, `.barrel[]`, `.grip[]`, `.laser[]`, `.light[]` | Allowed catalog IDs, possibly empty. | Availability and menu order/filtering; empty is not an unknown numeric zero. |
| `WEAPON_ERGO[id].avail[]` | Allowed ergonomic IDs. | Selection validation. |
| `ammo: AMMO[]` | Ordered catalog, 15 entries at review. | Selection, effects and positional share tokens. |
| `WEAPON_AMMO[id].projectileOverrides[ammo].dmg[]` | Same curve contract as weapon damage; eight curves at review. | Four shotguns' 00-buck/slug overrides. |
| `RELOAD_SPEED_MULTIPLIERS[]` | Three exact named reload factors. | Direct factor lookup; no extrapolated powers. |
| `HIP_SPREAD_TABLE[]` | Eighteen source rows, seven named/hashed numeric columns each. | First two columns select hip minima; other five retained. |
| `MOVING_ACC_TIERS[]` | Seven source-ordered moving-ADS minima. | Index lookup. |
| `ADS_SPD_TIERS[]` | Eight source-ordered ADS-in durations. | Index lookup, milliseconds. |
| `ADS_MOVE_TIERS[]` | Twelve source-ordered movement fractions, including repeated rows. | Index lookup; round only on display. |
| `DRAW_TIME_TABLES.sprint[]` | Twelve source-ordered durations. | Sprint recovery, milliseconds. |
| `DRAW_TIME_TABLES.primary.deploy[]`, `.undeploy[]` | Twelve entries each, common selected coordinate. | Primary draw/holster timing. |
| `DRAW_TIME_TABLES.sidearm.deploy[]`, `.undeploy[]` | Fifteen entries each, including repeated early rows. | Sidearm-table draw/holster timing. |
| `HP_HS_HIGH[]` | Weapon-ID membership set. | High-power headshot policy; order has no formula meaning. |
| `ballistics.weaponIds[]` | Sixty source/donor IDs at review. | Source selection, not a hard gate excluding every other weapon from ballistics. |
| `live-baseline.sources[]` | Source identity/version/evidence records. | Maintenance provenance, not runtime loading. |
| `live-baseline.dataPolicy.allowedDamagePointSources[]`, `.estimatedWeaponIds[]` | Allowed source labels and estimated-roster ID list. | Cross-file validation; estimated list is currently empty. |
| `weapons[].provenance.frosty.fields[]`, `.sourced.fields[]`, `.estimatedFields[]` | Source/estimated field-name lists. | Evidence/disclosure maintenance, not automatic field replacement. |
| `weapons[].provenance.measured.displayedDamageEndpoints[]` | Observed range/damage records. | Retained measurement evidence; not substituted for exact runtime curves. |
| `weapons[].provenance.donor.weaponIds[]`, `.donor.names[]`, `.notes[]` | Donor identity/name lists and narrative notes. | IDs can participate in projectile-source fallback; names/notes remain evidence. Older notes can describe superseded behavior. |

## Scalar maps and derived arrays

The balance maps `RECOIL_MULT`, `HIP_SPREAD_BASE_INDEX`,
`HIP_SPREAD_BASE_INDEX_OVERRIDES`, `BASE_HS_MULT`, `COLLATERAL_MULT_OVERRIDE`,
`LIMB_CLASS`, `LIMB_CLASS_MULT`, and `AUTO_HS_MULT` are keyed lookups, not positional
ladders. `VELOCITY_LADDER` and `HEALTH_REGEN_DELAY_S` are scalars.
The [ladder guide](STAT_LADDERS.md) and [damage guide](DAMAGE_BALLISTICS.md) explain
how these participate. `ammoDragPerMeter` is an ammo-ID map, not a flight-time array.

`WEAPON_MAG[id].mags` is an object whose **key order nevertheless forms a share-token
array**. `WEAPON_AMMO[id].ammo` is an ID/cost object. Do not convert either casually.

Code also creates arrays for recoil `{x,y}` points, pre-shot spread, sampled impact
zones, chart distance samples, and BTK table distances. These are derived display/
simulation products, not source data. UI arrays for class order, magnifications,
zero distances, spread-shot presets and target zone geometry are presentation/model
settings in [ui/app.js](../ui/app.js) and [sim/target.js](../sim/target.js).
They must not be presented as datamined weapon ladders. The fixed share-field order
and token catalogs are documented in [architecture](ARCHITECTURE.md).
