# Phase 7 barrel-velocity inventory

This is the Phase 7 inventory for the normal barrel-velocity migration. The
evidence source is the tracked
`migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json`; that file is a
fixture and is intentionally not modified by this phase.

## Velocity disposition

The seven live barrel records retain `velMult` and now also carry
`velTierMod`. The resolver interprets the signed field as the attachment
effect direction:

`velocity multiplier = VELOCITY_LADDER ** -velTierMod`, with `VELOCITY_LADDER = 0.8`.

| Barrel ID | `velMult` | `velTierMod` | Evidence disposition |
|---|---:|---:|---|
| `none` | 1 | 0 | unchanged baseline |
| `basic` | 1 | 0 | unchanged baseline |
| `short` | 0.8 | -1 | normal velocity tier |
| `extended` | 1.25 | 1 | normal velocity tier |
| `heavy` | 1 | 0 | unchanged velocity tier; catalog marker retained |
| `heavy_ext` | 1.25 | 1 | changed velocity tier; catalog marker retained |
| `light` | 1 | 0 | unchanged baseline |

The corpus contains 230 barrel records with velocity readings. Comparing each
record with its weapon's modal barrel baseline identifies 94 changed records:
43 Extended, 20 Heavy Ext, 29 Short, one Ext Light, and one Short Light.
All 94 match the signed normal ladder with floor display (`94/94`, 100%). The
rounding rule is evidence-backed rather than assumed: 69 records have identical
floor and round results and therefore do not discriminate; 25 records differ,
and the panel matches floor in 25/25 and round in 0/25. The prior rounded
runtime result is therefore classified as an explained display correction, not
absorbed as a tolerance. The complete 25-row classification, including source
paths, is tracked in
[`scripts/barrel-velocity-phase7-manifest.json`](../../scripts/barrel-velocity-phase7-manifest.json).
Of those 25 evidence rows, 20 correspond to live selectable weapon/barrel
pairs; five are source-only rows (three EF88 rows and two L115 rows). `Ext
Light` and `Short Light` are source subtypes, not new global catalog entries;
they are included in verification by their observed normal tier and are not
promoted into the barrel catalog here.

The production stat-card resolver now applies the same floor rule. Its
floating-point guard corrects only a product less than `1e-9` below the next
integer, while values such as `837.5` still floor to `837`. The current live
weapon/barrel roster has no product inside that guard band; a focused test
asserts this remains true. The Phase 5 witness comparison reports zero
derived-versus-legacy-branch mismatches and classifies all 20 live historical
round-to-floor pairs against the 25-row corpus manifest. The existing reload
fixture remains byte-for-byte unchanged.

This is the normal velocity path only. Ammo velocity and the registered
subsonic treatments remain separate and were not changed or folded into the
global ladder.

## Assumed markers

`heavy` and `heavy_ext` carry the pre-existing `assumed: true` marker. Git
blame traces that marker to the original attachment-catalog extraction
(`54ba3d10`, 2026-05-09); the current schema has no more specific definition or
field-level source receipt for it. It is therefore retained as provenance and
is not treated as proof that every Heavy effect is source-backed.

The velocity tier itself is not guessed: all 18 Heavy corpus records retain
their weapon baseline, and all 20 Heavy Ext records read the +1 velocity tier.
Phase 7 promotes only this separately verified velocity field. It does not
remove `assumed`, rewrite the other Heavy fields, or treat them as derived.

## Other barrel-driven effects preserved

The existing catalog and resolver continue to carry these effects:

| Effect | Existing data | Existing runtime consumer |
|---|---|---|
| ADS time | `adsTimeTierMod`: Basic/Short/Extended/Light `+1`; None/Heavy/Heavy Ext `0` | `_adsTimeMs` table lookup |
| Moving ADS spread | `movingAdsSpreadTierMod`: Light `+1`, others `0` | `_movingAdsMinSpreadDeg` table lookup |
| Recoil-in-ADS increment | `adsSpreadIncMult`: Heavy/Heavy Ext `0.9`, others `1` | `recoilIncAds` |
| Hip spread | `hipSpreadTierMod`: Short `-1`, otherwise absent/`0` | `spread` override |
| Cost and catalog identity | `pts`, `id`, `name`, weapon-specific barrel lists/defaults | loadout and display code |
| Legacy velocity | `velMult` on all seven entries | dual-read fallback when `velTierMod` is absent |

The corpus also shows barrel-associated modal changes in ADS time (73), hipfire
(35), precision (63), and mobility (129) records; these remain represented by
the existing catalog effects and are outside this velocity-only cutover. The
corpus has no separate moving-ADS-spread or recoil-increment column with which
to promote those effects, so their current runtime fields are preserved as-is.

## Sprint-recovery anomalies (deferred)

All 230 barrel records have a sprint-recovery reading. Twenty differ from the
weapon modal baseline, and all twenty are Heavy Ext records. The current
attachment schema has no barrel sprint-recovery field, so this migration does
not model or normalize them. The current resolver likewise does not read a
barrel sprint-recovery shift; consequently the migration preserves current
runtime behavior while retaining this evidence for a separate barrel-catalog
or sprint-recovery migration.

| Weapon | Barrel | Observed | Modal baseline |
|---|---|---:|---:|
| AK4D | 600MM DMR | 200 | 167 |
| B36A4 | 510MM DMR | 200 | 167 |
| EF88 | 24\" HBAR | 200 | 167 |
| L85A3 | 646MM LSW | 200 | 167 |
| M16A4 | 20\" HBAR | 200 | 167 |
| SOR-556 MK2 | 18\" Custom | 200 | 167 |
| UMG-40 | 305MM CUSTOM-H | 133 | 100 |
| USG-90 | 407MM CIV-S | 133 | 100 |
| DRS-IAR | 20\" SDM-R | 233 | 200 |
| L110 | 465MM LB | 300 | 267 |
| M123K | 612MM VMW | 300 | 267 |
| M240L | 24\" Bravo | 300 | 267 |
| M250 | 556MM Prototype | 300 | 267 |
| M60 | 22\" E3 Long | 300 | 267 |
| RPKM | 590MM Factory | 233 | 200 |
| SL9 | 11\" Heavy | 133 | 100 |
| M277 | 16\" Custom | 167 | 133 |
| KTS100 MK8 | 508MM MK8 | 233 | 200 |
| M121 A2 | 660MM VMW | 300 | 267 |
| RPK-74M | 590MM Factory | 233 | 200 |

These rows are an inventory for future work, not exceptions that authorize a
velocity or sprint schema expansion in Phase 7.
