# Attachment review details — 6 September 2026

This report answers the follow-up review. Live examples use the five downloaded files recorded in the evidence `liveSnapshot`. Source values come from the local Frosty 1.4.2.5 export. Source-parameter examples use the current site equation. They are not game measurements. The only new simulation change is the approved ADS-only barrel scope correction. This change is local and has not been published.

[Full structured evidence](../reference-data/provenance/frosty-attachment-followup-2026-09-06.json) includes exact paths, selector IDs, operations, graph branches, exported killswitch defaults, live hashes, and all numerical samples. The original full-pass JSON remains a historical snapshot.

## Corrections to the earlier audit

I reversed two suppressor labels in the audit mapping. `ImprvdSuppressor01_W30` is CQB; `ImprvdSuppressor02_W30` is Lightened. The alleged “CQB source grip modifiers” were muzzle suppressor modifiers assigned to the wrong site label. There is no supported CQB hip-penalty finding. The earlier list of 50 weapons is withdrawn. The corrected inventory has 57 mapped CQB paths without those recoil/hip effects, and 52 Lightened paths with hip tier +1 and smooth-recoil effects. Long and Lightened share these effects; the Long sway penalty is the relevant distinction. No CQB or Lightened runtime change is required by this label correction.

The six alleged ammunition conflicts are also withdrawn as conflicts. M121 A2 (MG5) and M45A1 each have Frangible, Hollow Point, and Tungsten attachment actions with the specialty selector plus an FMJ selector. The specialty selector is not replaced. FMJ supplies a penetration-category selection. Its raw enum value 1 is not a damage multiplier of 1.

The corrected inventory has 3,003 mapped comparisons, 242 without numeric selectors, 57 source-only, 13 ambiguous, two unmapped templates, six compound FMJ bindings, and 18 outside the roster. Nine mappings were recovered by the suppressor label correction: source-only falls from 66 to 57 and site-only from 31 to 22. These are audit categories, not defect counts.

## ADS-only barrel change

Heavy, Heavy Extended, and Cryo now apply their spread-increment and firing-recovery multipliers only to ADS. HIP retains the Basic barrel spread and recovery values. The existing numerical estimates (increment ×0.667, firing coefficient ×1.71, existing offset multiplier) are retained. The source proposes ×0.666667 for increment and all three recovery offsets, and ×1.837117 for firing coefficient; adopting those numbers is a separate decision. All barrel increment catalog fields now use an explicit ADS field name. UI recovery breakdowns use the same aim-state rule as the simulation.

For example, the old Heavy path changed an M16A4 HIP increment from 0.648 to approximately 0.432. The corrected HIP value stays 0.648. ADS still changes from 0.36 to approximately 0.24. A focused regression checks all three selectable B36A4 barrels in both stances, including unchanged HIP recovery.

## Recoil equation and the smooth-recoil name

Use **smooth recoil** for this attachment effect family. `Smooth` occurs in the modifier asset names; “smooth recoil and duration” is a description of its linked fields, not a verified in-game UI label. These are Long/Lightened suppressors.

The site derives kick amount from `amount × amountMult^amountExp` and attachment tiers. Each shot adds an immediate 2D vector at angle `−direction + random variation`. For each recovery step (up to 1/60 s), the site increases elapsed recovery time `t`, then subtracts `(abs(component)^decExp + decOffset) × decFactor × step × t^decTimeExp` from each component magnitude, clamped at zero. Recovery time restarts for each interval. Platform and compensation factors are held at 1 and 0 in these examples. Duration is stored but not consumed. Therefore this model cannot yet describe how the engine delivers a kick over its duration.

M433 base kick is `0.6695 × 0.945^−3 = 0.793332`, rounded to 0.793 ADS. It fires at approximately 830.769 RPM (0.072222 s per shot). Direction is −22°, variation starts at 41.4°, decay exponent is 1, offset is 0.06, and time exponent is 1.2. Current Long and Lightened use an estimated ADS decay multiplier of 1.1. Frosty normal Smooth uses ×1.2 in ADS and HIP and sets duration to 0.05 s.

| M433 scenario | ADS decay factor | HIP decay factor | Duration | Y before shot 2 | Y before shot 10 |
| --- | --- | --- | --- | --- | --- |
| Live Basic | 72 | 72 | 0.025 | 0.604614 | 3.244531 |
| Live Long | 79.2 | 72 | 0.025 | 0.596025 | 3.072685 |
| Live Lightened | 79.2 | 72 | 0.025 | 0.596025 | 3.072685 |
| Source constants in current equation | 86.4 | 86.4 | 0.05 | 0.587519 | 2.912407 |

These residuals use seed 0 and the current recoil generator. They show model output before each shot, not the instantaneous kick or measured game recoil. The source-constant row applies to both Long and Lightened. Supporting duration requires a validated impulse/update rule, not merely changing the stored field.

## VSSM Folding Stock

Live default ammunition is Tungsten, so ADS kick is 0.845 rather than the underlying approximately 0.800 base kick. Folding Stock changes the firing interval from approximately 0.133334 s (450 RPM) to 0.075 s (800 RPM). The already released variation correction is retained. Live decay factor is 13.7, time exponent 0.5555, decay exponent 1, offset 0.06, duration 0.025 s. Frosty sets decay factor to 76 and time exponent to 1.24 in both aim states.

| VSSM scenario | ADS kick | Factor | Time exponent | Y before shot 2 | Y before shot 10 |
| --- | --- | --- | --- | --- | --- |
| Live semi-auto | 0.845 | 13.7 | 0.5555 | 0.518401 | 1.453079 |
| Live Folding Stock | 0.845 | 13.7 | 0.5555 | 0.691282 | 3.143367 |
| Stock source constants in current equation | 0.845 | 76 | 1.24 | 0.732614 | 3.892637 |

The source-constant row leaves more residual recoil in this equation despite the larger factor. Increasing the time exponent reduces `t^exponent` while t is below one second. This is why factor 76 alone cannot be called a fixed percentage recovery improvement. Native timing and integration remain unverified. No decay change is implemented.

## Flashlight and combined-device examples

The source HIP modifier multiplies increment and firing/non-firing/idle offsets by 0.666667, and firing coefficient by 1.837117. In the site spread equation, recovery subtracts `step × (coefficient × max(spread − baseline, 0)^exponent + offset)`, clamped to bounds. Firing and non-firing groups are consumed; the idle group is not. A lower offset alone means less recovery in that equation, while the coefficient increases and shot growth decreases. The result depends on the whole combination.

### M433 Flashlight

| Scenario | HIP increment | Firing coefficient | Firing offset | Non-firing offset | Idle offset (unused) |
| --- | --- | --- | --- | --- | --- |
| Live Basic | 0.648 | 0.5 | 4.86 | 12.96 | 25 |
| Live selected | 0.648 | 0.5 | 5.589 | 12.96 | 25 |
| Source constants in current equation | 0.432 | 0.918559 | 3.240002 | 8.640004 | 16.666675 |

### VZ61 Combo Red

| Scenario | HIP increment | Firing coefficient | Firing offset | Non-firing offset | Idle offset (unused) |
| --- | --- | --- | --- | --- | --- |
| Live Basic | 0.376 | 0.5 | 4.86 | 12.96 | 25 |
| Live selected | 0.376 | 0.5 | 4.86 | 12.96 | 25 |
| Source constants in current equation | 0.250667 | 0.918559 | 3.240002 | 8.640004 | 16.666675 |

M433 Flashlight currently uses an assumed 15% firing-offset boost: 4.86 → 5.589. Source values instead give increment 0.648 → 0.432000216, coefficient 0.5 → 0.9185585, firing offset 4.86 → 3.24000162, non-firing offset 12.96 → 8.64000432, and idle offset 25 → 16.666675. VZ61 Combo Red already applies its laser HIP tier, but its stored light boost is not consumed from the laser slot. Source numbers would fit the HIP dynamic fields; activation and idle behavior still need validation. No light change is implemented.

## Bolt-action tier magnitudes

M2010 ESR uses ADS kick 1.5 and HIP kick 4, with tier multiplier 0.94. Current Double Port brake uses +1; the linked bolt source uses +6. Current Tungsten uses −1; the compared source uses −6.

| M2010 ESR loadout | Calculation | ADS kick | HIP kick |
| --- | --- | --- | --- |
| Basic | base | 1.5 | 4 |
| Live brake | base × 0.94^1 | 1.41 | 3.76 |
| Source brake | base × 0.94^6 | 1.035 | 2.759479 |
| Live Tungsten | base × 0.94^-1 | 1.596 | 4.255319 |
| Source Tungsten | base × 0.94^-6 | 2.174 | 5.798196 |

The 16 brake comparisons cover Interdictor, L115, M2010 ESR, Mini Scout, PSR, and SV-98. Source magnitude is consequential; it is not just a different tier name. Mini Scout has compound Tungsten links (+ composition uncertainty), so the −6 example is not a universal ammunition rule.

L115 Long uses live ADS factor 77 and HIP factor 70, time exponent 4, duration 0.025 s. Bolt Smooth source uses factor ×1.728 (70 → 120.96), time exponent −0.5 (4 → 3.5), and duration 0.066667 s in both aim states. At the normal bolt firing interval, this site model fully recovers before the next shot. A burst pattern therefore hides recovery-curve differences. The evidence includes residuals from a one-degree displacement at 0.075, 0.1, 0.25, and 1 second. No bolt-tier or smooth-recoil change is implemented.

## Six compound ammunition bindings: two weapons

The same Ability action contains the specialty and FMJ selectors. Frangible explicitly adds 4 seconds to health regeneration delay. Hollow Point selects a protection/headshot category; FMJ selects penetration category 1. Raw category enums must pass through their tables. Tungsten retains its recoil/penetration effects. Current resolved examples follow. Damage is at zero distance; collateral is the site multiplier, not the raw enum.

| Weapon | Ammo | Points | Damage | Headshot multiplier | Collateral | Regen delay s | ADS kick |
| --- | --- | --- | --- | --- | --- | --- | --- |
| m121a2 | standard | 5 | 35.22 | 1.4 | 0.75 | 5 | 0.806 |
| m121a2 | frangible | 20 | 35.22 | 1.4 | 0.75 | 9 | 0.806 |
| m121a2 | hollow_pt | 20 | 35.22 | 1.57 | 0.75 | 5 | 0.806 |
| m121a2 | penetration | 5 | 35.22 | 1.4 | 1 | 5 | 0.852 |
| m45a1 | standard | 5 | 33.4 | 1.34 | 0.57 | 5 | 1.67 |
| m45a1 | frangible | 20 | 33.4 | 1.34 | 0.57 | 9 | 1.67 |
| m45a1 | hollow_pt | 15 | 33.4 | 1.5 | 0.57 | 5 | 1.67 |
| m45a1 | penetration | 5 | 33.4 | 1.34 | 0.75 | 5 | 1.777 |

## Ambiguous magazine identities: all 13 bindings

**7 September follow-up:** the [screenshot-backed magazine review](FROSTY_MAGAZINE_IDENTITY_REVIEW_2026-09-07.md) supersedes the identity uncertainty below. Four shotgun site identities are resolved; the two RPK-74M parent magazines are identified despite their extra unmatched links. The six extra Fast/45-round/25-round candidates are absent from the captured menus. Three extra selector bindings remain unmatched. The original table below is retained to identify the 13 reviewed bindings, not as the current unresolved count.

There is enough data to continue the analysis, but not enough to promote every unresolved identity. PSR, SV-98, and ES 5.7 Fast selectors provide reload speed ×1.13 without a new capacity and lack a site fast selection. SOR-300SC Ext3 variants encode 46 including chamber (45 magazine), versus site 40-round entries; source costs are 35/40 versus site 25/30. RPK-74M has empty RPKM aliases beside resolved RPK74M selectors. PP-19 has a resolved 26-capacity field (25 magazine) beside an empty UMP40 alias; site has 20 Fast. M87 and M1014 same-capacity variants differ in opaque `Class_e7d2410a/Field_bd024e1d` (99 versus 5 or 4). That field must be identified before it can establish the fast variant.

### All ambiguous bindings

| Weapon | Attachment asset | Selector | Source points | Decoded effects / context |
| --- | --- | --- | --- | --- |
| PSR | Attachment_MRAD_MAG_Fast | U_WPM_MAG_Fast_W10 | 10 | reloadSpeed = 1.13 |
| SV-98 | Attachment_SV98M_MAG_Fast | U_WPM_MAG_Fast_W10 | 10 | reloadSpeed = 1.13 |
| SOR-300SC | Attachment_SCARSC_MAG_Extended3 | U_WPM_MAG_045Ext3_556_W35 | 35 | adsMoveSpeedTier = 1; raw capacity [46]; other: wpm_mag_045ext3_556_w35 |
| SOR-300SC | Attachment_SCARSC_MAG_Extended3Fast | U_WPM_MAG_045Ext3Fast_556_W40 | 40 | adsMoveSpeedTier = 1; reloadSpeed = 1.13; deployTier = 1; sprintRecoveryTier = 1; raw capacity [46]; other: wpm_mag_045ext3fast_556_w40 |
| RPK-74M | Attachment_RPK74M_MAG_Compact1 | U_WPM_MAG_030Cpt1_RPKM_W05 | 5 | No decoded numeric effect on this selector; see linked evidence. |
| RPK-74M | Attachment_RPK74M_MAG_Compact2 | U_WPM_MAG_030Cpt2_RPKM_W10 | 10 | No decoded numeric effect on this selector; see linked evidence. |
| ES 5.7 | Attachment_FiveSeven_MAG_Fast | U_WPM_MAG_Fast_W10 | 10 | reloadSpeed = 1.13 |
| M87A1 | Attachment_590A1_MAG_Compact1 | U_WPM_MAG_006Cpt1_590A1_W05 | 5 | adsTimeTier.add = 1; deployTier = -2; sprintRecoveryTier = -2; adsMoveSpeedTier = -1; raw capacity [6]; other: wpm_mag_006cpt1_590a1_w05 |
| M87A1 | Attachment_590A1_MAG_Compact3 | U_WPM_MAG_006Cpt3_590A1_W20 | 20 | adsTimeTier.add = 1; deployTier = -2; sprintRecoveryTier = -2; adsMoveSpeedTier = -1; raw capacity [6]; other: wpm_mag_006cpt3_590a1_w20 |
| M1014 | Attachment_M1014_MAG_Compact1 | U_WPM_MAG_005Cpt1_M1014_W05 | 5 | adsTimeTier.add = 1; deployTier = -2; sprintRecoveryTier = -2; adsMoveSpeedTier = -1; raw capacity [5]; other: wpm_mag_005cpt1_m1014_w05 |
| M1014 | Attachment_M1014_MAG_Compact2 | U_WPM_MAG_005Cpt2_M1014_W05 | 10 | adsTimeTier.add = 1; deployTier = -2; sprintRecoveryTier = -2; adsMoveSpeedTier = -1; raw capacity [5]; other: wpm_mag_005cpt2_m1014_w05 |
| PP-19 | Attachment_PP19_MAG_Compact1 | U_WPM_MAG_025Cpt1_PP19_W05 | 5 | movingAdsSpreadTier.add = 1; deployTier = -1; sprintRecoveryTier = -1; adsMoveSpeedTier = -2; raw capacity [26]; other: wpm_mag_025cpt1_pp19_w05; other: wme_dynamicpivot_p10 |
| PP-19 | Attachment_PP19_MAG_Compact1 | U_WPM_MAG_025Cpt1_UMP40_W05 | 5 | No decoded numeric effect on this selector; see linked evidence. |

### Two unmapped vertical templates

| Weapon | Attachment asset | Selector | Source points | Decoded effects / context |
| --- | --- | --- | --- | --- |
| BROD 3 | Attachment_BREN3_BTM_ZenitcoRK2 | U_WPM_BTM_Vertical03_W20 | 20 | recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2 |
| DRS-IAR | Attachment_M27IAR_BTM_ZenitcoRK2 | U_WPM_BTM_Vertical03_W20 | 20 | No decoded numeric effect on this selector; see linked evidence. |

BROD 3 / BREN3 Vertical01 and Vertical03 resolve to the same +2 ADS/HIP recoil effect object. Do not add it twice. DRS-IAR / M27IAR Vertical03 has no resolved effect, while the sibling Vertical01 supplies +2. This does not establish that the entire attachment is missing.

### All six compound bindings

| Weapon | Attachment asset | Selector | Source points | Decoded effects / context |
| --- | --- | --- | --- | --- |
| M121 A2 | Attachment_MG5_AMO_Frangible | U_WPM_AMO_FMJ_W05 | 20 | other: wme_penetration_p05 |
| M121 A2 | Attachment_MG5_AMO_HollowPoint | U_WPM_AMO_FMJ_W05 | 20 | other: wme_penetration_p05 |
| M121 A2 | Attachment_MG5_AMO_Tungsten | U_WPM_AMO_FMJ_W05 | 5 | other: wme_penetration_p05 |
| M45A1 | Attachment_M45A1_AMO_Frangible | U_WPM_AMO_FMJ_W05 | 20 | other: wme_penetration_p05 |
| M45A1 | Attachment_M45A1_AMO_HollowPoint | U_WPM_AMO_FMJ_W05 | 15 | other: wme_penetration_p05 |
| M45A1 | Attachment_M45A1_AMO_Tungsten | U_WPM_AMO_FMJ_W05 | 5 | other: wme_penetration_p05 |

### All 18 outside-roster records

| Weapon | Attachment asset | Selector | Source points | Decoded effects / context |
| --- | --- | --- | --- | --- |
| KSG | Attachment_KSG_BTM_6Ch64_Vertical | (multiple; evidence) | 25 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 4; recoil.hip.amountTier.add = 4 |
| KSG | Attachment_KSG_BTM_BCM_Stubby | (multiple; evidence) | 45 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 5; recoil.hip.amountTier.add = 5 |
| KSG | Attachment_KSG_BTM_FAB_TFS | (multiple; evidence) | 10 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2 |
| KSG | Attachment_KSG_BTM_KAC_Vertical_Grip | (multiple; evidence) | 35 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 5; recoil.hip.amountTier.add = 5 |
| KSG | Attachment_KSG_BTM_Magpul_AFG | (multiple; evidence) | 25 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2 |
| KSG | Attachment_KSG_BTM_Magpul_AFG2 | (multiple; evidence) | 25 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 3; recoil.hip.amountTier.add = 3 |
| KSG | Attachment_KSG_BTM_Magpul_MVG | (multiple; evidence) | 35 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 4; recoil.hip.amountTier.add = 4 |
| KSG | Attachment_KSG_BTM_MSBS_A2_Grip | (multiple; evidence) | 30 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 3; recoil.hip.amountTier.add = 3 |
| KSG | Attachment_KSG_BTM_Tango_Stubby | (multiple; evidence) | 30 | adsTimeTier.add = 1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2 |
| KSG | Attachment_KSG_BTM_TangoDown_Vertical | (multiple; evidence) | 20 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 3; recoil.hip.amountTier.add = 3 |
| KSG | Attachment_KSG_BTM_Zenitco_RK1 | (multiple; evidence) | 20 | recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2 |
| KSG | Attachment_KSG_RGT_SF300 | (multiple; evidence) | 15 | spread.hip.inc.mult = 0.666667; spread.hip.firingCoef.mult = 1.837117; spread.hip.firingOffset.mult = 0.666667; spread.hip.notFiringOffset.mult = 0.666667; spread.hip.idleOffset.mult = 0.666667 |
| KSG | Attachment_KSG_RGT_TL_MissionLight | (multiple; evidence) | 10 | spread.hip.inc.mult = 0.666667; spread.hip.firingCoef.mult = 1.837117; spread.hip.firingOffset.mult = 0.666667; spread.hip.notFiringOffset.mult = 0.666667; spread.hip.idleOffset.mult = 0.666667 |
| KSG | Attachment_KSG_TOP_DBAL-A3 | (multiple; evidence) | 20 | hipSpreadTier.add = -3 |
| KSG | Attachment_KSG_TOP_LA-23 | (multiple; evidence) | 10 | hipSpreadTier.add = -2 |
| KSG | Attachment_KSG_TOP_Mepro_Sting | (multiple; evidence) | 20 | hipSpreadTier.add = -2; movingAdsSpreadTier.add = 1 |
| KSG | Attachment_KSG_TOP_Perst4 | (multiple; evidence) | 10 | hipSpreadTier.add = -1 |
| KSG | Attachment_KSG_TOP_RaidXe | (multiple; evidence) | 30 | hipSpreadTier.add = -3; movingAdsSpreadTier.add = 1 |

### All 57 remaining source-only selectors

| Weapon | Attachment asset | Selector | Source points | Decoded effects / context |
| --- | --- | --- | --- | --- |
| AK4D | Attachment_G3A4_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| AK4D | Attachment_G3A4_ERG_Improved_Mag_Catch | U_WPM_ERG_ImprovedMagCatch_W05 | 5 | reloadSpeed = 1.063 |
| SOR-556 MK2 | Attachment_SCARL_BRL_LightBarrel | U_WPM_BRL_Fluted_W20 | 20 | movingAdsSpreadTier.add = 1; adsTimeTier.add = 1; other: wme_dynamicpivot_p10 |
| AK-205 | Attachment_AK205_BTM_BT_Grippod_QD | U_WPM_BTM_GripPod02_W30 | 30 | recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/hipdispersion/gdm_array_hipdispersion_btm_p20.xml#06e4b5c7-588a-45c7-8c24-3a91aef8468c; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| BROD 3 | Attachment_BREN3_BRL_TreatedBarrel | U_WPM_BRL_Treated_W20 | 20 | spread.ads.inc.mult = 0.666667; spread.ads.firingCoef.mult = 1.837117; spread.ads.firingOffset.mult = 0.666667; spread.ads.notFiringOffset.mult = 0.666667; spread.ads.idleOffset.mult = 0.666667 |
| M417 A2 | Attachment_HK417A2_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.48857; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| SOR-300SC | Attachment_SCARSC_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| SOR-300SC | Attachment_SCARSC_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.512; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| SOR-300SC | Attachment_SCARSC_BTM_BT_Grippod_QD | U_WPM_BTM_GripPod02_W30 | 30 | recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/hipdispersion/gdm_array_hipdispersion_btm_p20.xml#06e4b5c7-588a-45c7-8c24-3a91aef8468c; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| SOR-300SC | Attachment_SCARSC_BTM_GPS2 | U_WPM_BTM_GripPod03_W30 | 30 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/hipdispersion/gdm_array_hipdispersion_btm_p20.xml#06e4b5c7-588a-45c7-8c24-3a91aef8468c; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup; other: wme_dynamicpivot_m10 |
| SOR-300SC | Attachment_SCARSC_BTM_LT706QDHarrisBipod | U_WPM_BTM_Bipod01_W10 | 10 | conditional: common/hardware/weapons/_weaponmodifiers/hipdispersion/gdm_array_hipdispersion_btm_p20.xml#06e4b5c7-588a-45c7-8c24-3a91aef8468c; conditional: common/hardware/weapons/_weaponmodifiers/bipod/grm_bipoddeployed_btm_p50.xml#fd96b3ba-41ff-43dc-a05b-475a893d9376; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| SOR-300SC | Attachment_SCARSC_BTM_QBZ_Grippod | U_WPM_BTM_GripPod01_W20 | 20 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/hipdispersion/gdm_array_hipdispersion_btm_p20.xml#06e4b5c7-588a-45c7-8c24-3a91aef8468c; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| SOR-300SC | Attachment_SCARSC_ERG_Improved_Mag_Catch | U_WPM_ERG_ImprovedMagCatch_W05 | 5 | reloadSpeed = 1.063 |
| SG 553R | Attachment_SIG553R_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.512; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| GRT-CPS | Attachment_MSBSGROTCPS_ERG_BurstFireEnable | U_WPM_ERG_BurstFireActive | 15 | recoil.ads.variationTier.add = 3; recoil.ads.amountTier.add = 1; recoil.hip.variationTier.add = 3; recoil.hip.amountTier.add = 1 |
| GRT-CPS | Attachment_MSBSGROTCPS_ERG_BurstFireEnable | U_WPM_ERG_BurstFireReplace_W10 | 15 | other: wpm_erg_burstfirereplace_w10 |
| SVDM | Attachment_SVDM_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| VSSM | Attachment_VSSM_AMO_FMJ | U_WPM_AMO_FMJ_W05 | 5 | other: wme_penetration_p05 |
| M250 | Attachment_M250_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| M123K | Attachment_MG4K_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| L110 | Attachment_Minimi_ERG_RecoilBuffer | U_WPM_ERG_RecoilBuffer_W05 | 5 | other: wpm_erg_buffer_w05 |
| ES 5.7 | Attachment_FiveSeven_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 20 | minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.8; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| ES 5.7 | Attachment_FiveSeven_ERG_PistolQuickdraw | U_WPM_ERG_QuickDraw_W05 | 5 | deployTier = -1; sprintRecoveryTier = -1 |
| ES 5.7 | Attachment_FiveSeven_MZL_RSMicroTactical | U_WPM_MZL_Brake2_W10 | 10 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1 |
| GGH-22 | Attachment_G22_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 20 | minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.8; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| GGH-22 | Attachment_G22_BRL_ExtendedBarrel | U_WPM_BRL_Extended_W05 | 5 | velocity = 1.25 |
| GGH-22 | Attachment_G22_BRL_ShortBarrel | U_WPM_BRL_Short_W15 | 15 | hipSpreadTier.add = -1; adsTimeTier.add = 1; velocity = 0.8 |
| GGH-22 | Attachment_G22_MZL_RSMicroTactical | U_WPM_MZL_Brake2_W10 | 10 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1 |
| P18 | Attachment_M18_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 20 | minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.8; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| P18 | Attachment_M18_MZL_RSMicroTactical | U_WPM_MZL_Brake2_W10 | 10 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1 |
| M45A1 | Attachment_M45A1_MZL_RSMicroTactical | U_WPM_MZL_Brake2_W10 | 10 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1 |
| M44 | Attachment_RagingHunter_AMO_BallisticTip | U_WPM_AMO_BallisticTip_W20 | 30 | other: wme_protection_p20 |
| M44 | Attachment_RagingHunter_ERG_MatchTrigger | U_WPM_ERG_MatchTrigger_W15 | 15 | No decoded numeric effect on this selector; see linked evidence. |
| VZ. 61 | Attachment_Skorpion_MZL_RSMicroTactical | U_WPM_MZL_Brake2_W10 | 10 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1 |
| M357 Trait | Attachment_TRR8_AMO_Frangible | U_WPM_AMO_Frangible_W20 | 20 | healthRegenDelayAdd = 4.0; other: wme_healthregendelay_p20 |
| M357 Trait | Attachment_TRR8_AMO_Tungsten | U_WPM_AMO_TungstenCore_W05 | 5 | recoil.ads.amountTier.add = -1; recoil.hip.amountTier.add = -1; other: wme_penetration_p15 |
| DB-12 | Attachment_DP12_BTM_AtlasV8 | U_WPM_BTM_Bipod01_W10 | 10 | conditional: common/hardware/weapons/_weaponmodifiers/bipod/grm_bipoddeployed_btm_p50.xml#fd96b3ba-41ff-43dc-a05b-475a893d9376; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| DB-12 | Attachment_DP12_BTM_BTGrippodQD | U_WPM_BTM_GripPod02_W30 | 30 | recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| DB-12 | Attachment_DP12_BTM_EVOHandstop | U_WPM_BTM_HandStopPDW_W10 | 10 | other: wpm_btm_handstoppdw_w10 |
| DB-12 | Attachment_DP12_BTM_GPS2 | U_WPM_BTM_GripPod03_W30 | 30 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup; other: wme_dynamicpivot_m10 |
| DB-12 | Attachment_DP12_BTM_HFGA | U_WPM_BTM_Fast01_W25 | 15 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; deployTier = -1; sprintRecoveryTier = -1; other: wme_dynamicpivot_m10 |
| DB-12 | Attachment_DP12_BTM_LT706QDHarrisBipod | U_WPM_BTM_Bipod01_W10 | 10 | conditional: common/hardware/weapons/_weaponmodifiers/bipod/grm_bipoddeployed_btm_p50.xml#fd96b3ba-41ff-43dc-a05b-475a893d9376; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| DB-12 | Attachment_DP12_BTM_MagpulAFG2 | U_WPM_BTM_Fast03_W30 | 25 | movingAdsSpreadTier.add = -1; adsTimeTier.add = 1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; deployTier = -1; sprintRecoveryTier = -1; other: wme_dynamicpivot_m10 |
| DB-12 | Attachment_DP12_BTM_QBZGrippod | U_WPM_BTM_GripPod01_W20 | 20 | movingAdsSpreadTier.add = -1; recoil.ads.amountTier.add = 2; recoil.hip.amountTier.add = 2; conditional: common/hardware/weapons/_weaponmodifiers/grippod/grm_grippoddeployed_btm_p30.xml#e0b7dbb3-07fd-4188-8ff4-c433a470d663; conditional: common/hardware/weapons/_weaponmodifiers/_bottomrail/bipod/wme_bipodtag.xml#4bc07861-0b58-49cc-b7c6-918a3c2f37cb; other: wme_enablemountup |
| DB-12 | Attachment_DP12_RGT_ANPEQ16B | U_WPM_RGT_LaserLight01_W20 | 20 | other: sp_wpm_rgt_lightlaser01_w20; other: mpdarkness_wpm_rgt_lightlaser01_w20; other: wpm_rgt_lightlaser01_w20 |
| DB-12 | Attachment_DP12_RGT_FNElity | U_WPM_RGT_RangeFinder_W10 | 10 | other: wpm_rgt_rangefinder_w10 |
| M1014 | Attachment_M1014_ERG_RecoilBuffer | U_WPM_ERG_RecoilBuffer_W05 | 5 | other: wpm_erg_buffer_w05 |
| SCW-10 | Attachment_APC10_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.64; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| SL9 | Attachment_APDW_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.512; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| PW5A3 | Attachment_MP5MLI_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.64; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| SGX | Attachment_MPX_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.64; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| USG-90 | Attachment_P90_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.48857; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| PP-19 | Attachment_PP19_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.512; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| PP-19 | Attachment_PP19_MZL_RSMicroTactical | U_WPM_MZL_Brake1_W05 | 5 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; swayTier = 1; other: wme_wsway_m05; other: wme_csway_m05 |
| CZ3A1 | Attachment_ScorpionEvo3_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.64; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| UMG-40 | Attachment_UMP40_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.512; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |
| KV9 | Attachment_Vector_AMO_SubsonicFrangible | U_WPM_AMO_SubsonicFRNG | 25 | recoil.ads.amountTier.add = 1; recoil.hip.amountTier.add = 1; minimapSpotMult = 0.4285714; worldSpotMult = 0.5; velocity = 0.64; healthRegenDelayAdd = 2.0; other: wme_healthregendelay_p10; other: wme_subsonicsfx_1 |

## Original 31 site selections without a unique mapping

All original entries are listed here so the prior count can be reconciled. “Recovered” means the suppressor label correction supplies the mapping. The other 22 remain unresolved by this audit; no removal or new availability is implied.

| Weapon | Slot | Site ID | Status |
| --- | --- | --- | --- |
| M433 | grip | underslung_mount | Still unresolved |
| B36A4 | grip | underslung_mount | Still unresolved |
| SOR-556 MK2 | grip | underslung_mount | Still unresolved |
| L85A3 | grip | underslung_mount | Still unresolved |
| M16A4 | grip | underslung_mount | Still unresolved |
| M4A1 | grip | underslung_mount | Still unresolved |
| M277 | grip | underslung_mount | Still unresolved |
| AK-205 | grip | underslung_mount | Still unresolved |
| M417 A2 | grip | underslung_mount | Still unresolved |
| QBZ-192 | ergo | buffer | Still unresolved |
| PP-19 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| M/60 | ammo | lightweight | Still unresolved |
| M121 A2 | ammo | lightweight | Still unresolved |
| SVK-8.6 | grip | adj_angled | Still unresolved |
| SV-98 | muzzle | light_supp | Recovered by suppressor mapping correction |
| Interdictor | muzzle | light_supp | Recovered by suppressor mapping correction |
| M87A1 | mag | 5_rnd | Still unresolved |
| M87A1 | mag | 5_fast | Still unresolved |
| M1014 | mag | 4_rnd | Still unresolved |
| M1014 | mag | 4_fast | Still unresolved |
| DB-12 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| P18 | muzzle | sp_brake | Still unresolved |
| P18 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| ES 5.7 | muzzle | sp_brake | Still unresolved |
| ES 5.7 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| M45A1 | muzzle | sp_brake | Still unresolved |
| M45A1 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| GGH-22 | muzzle | sp_brake | Still unresolved |
| GGH-22 | muzzle | cqb_supp | Recovered by suppressor mapping correction |
| VZ. 61 | muzzle | sp_brake | Still unresolved |
| VZ. 61 | muzzle | cqb_supp | Recovered by suppressor mapping correction |

## All 25 incomplete graph links

### missing WB modifier asset

| Weapon | Source path | Missing reference / selector |
| --- | --- | --- |
| KORD 6P67 | Common/Hardware/Weapons/AssaultRifle/6p67/6P67_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_BRL__ARFlashSuppressor_01/WM_FlashSuppressor", "guid": "ec6bea15-eb37-4d37-b55c-9c42f797e4ee"}} |
| KORD 6P67 | Common/Hardware/Weapons/AssaultRifle/6p67/6P67_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_ANY__LaserSight_01/WM_LaserSight", "guid": "57ca503d-3a62-40b0-ac98-e80511e6982f"}} |
| KORD 6P67 | Common/Hardware/Weapons/AssaultRifle/6p67/6P67_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_GRP__ARForeGrip_01/WM_Foregrip", "guid": "0792d1c0-93ec-4b80-ab76-3ec9ad38e7a9"}} |
| KORD 6P67 | Common/Hardware/Weapons/AssaultRifle/6p67/6P67_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_ANY__Flashlight_01/WM_Flashlight", "guid": "cc7d0e5f-f600-4eaa-82b8-6e9eec2d6ad3"}} |
| KORD 6P67 | Common/Hardware/Weapons/AssaultRifle/6p67/6P67_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_GRP__ARBipod_01/WM_Bipod", "guid": "a23ea3e8-8c41-4e63-88f7-f31d4b09a641"}} |
| M250 | Common/Hardware/Weapons/MG/M250/M250_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_BRL__ARFlashSuppressor_01/WM_FlashSuppressor", "guid": "ec6bea15-eb37-4d37-b55c-9c42f797e4ee"}} |
| M250 | Common/Hardware/Weapons/MG/M250/M250_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_ANY__LaserSight_01/WM_LaserSight", "guid": "57ca503d-3a62-40b0-ac98-e80511e6982f"}} |
| M250 | Common/Hardware/Weapons/MG/M250/M250_WB.xml | {"reference": {"asset": "Game/KingstonLegacy/Mica/Hardware/Weapons/_WeaponAttachments/OB_WEPATT_GRP__ARForeGrip_01/WM_Foregrip", "guid": "0792d1c0-93ec-4b80-ab76-3ec9ad38e7a9"}} |
| DRS-IAR | Common/Hardware/Weapons/MG/M27IAR/M27IAR_WB.xml | {"reference": {"asset": "Test/TestData/Hardware/LPVODemo/Common/Hardware/Weapons/_WeaponAttachments/Zoom/WEPATT_VUDU/WM_VUDU", "guid": "2abbea7b-20e3-420e-b79b-013317add630"}} |

### no matching ability branch

| Weapon | Source path | Missing reference / selector |
| --- | --- | --- |
| AK4D | Common/Hardware/Weapons/AssaultRifle/G3A4/Attachment_G3A4_BRL_LightBarrel.xml | {} |
| SOR-556 MK2 | Common/Hardware/Weapons/AssaultRifle/SCARL/Attachment_SCARL_MZL_M4QDFlashHider.xml | {} |
| M2010 ESR | Common/Hardware/Weapons/BoltAction/M2010ESR/Attachment_M2010ESR_MZL_Muzzle.xml | {} |
| M/60 | Common/Hardware/Weapons/MG/M60E6/Attachment_M60E6_ERG_Improved_Mag_Catch.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_CMR201.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_HolosunRMLt.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_LMDPEIR1.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_Perst1.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_SFX300.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_SFX400.xml | {} |
| DB-12 | Common/Hardware/Weapons/Shotgun/DP12/Attachment_DP12_BTM_X5LG3.xml | {} |

### selector has no WB/GS modifier match

| Weapon | Source path | Missing reference / selector |
| --- | --- | --- |
| DRS-IAR | Common/Hardware/Weapons/MG/M27IAR/Attachment_M27IAR_BTM_ZenitcoRK2.xml | {"selector": {"asset": "Common/Hardware/Weapons/_WeaponModifiers/_BottomRail/Foregrip/Vertical/U_WPM_BTM_Vertical03_W20", "guid": "bce0e7b7-6076-4f31-b84d-cd016a99793b"}, "actionGuid": "6946d338-854f-4193-a84b-11df50bca172", "resolvedSiblingSelectorCount": 1} |
| RPK-74M | Common/Hardware/Weapons/MG/RPK74M/Attachment_RPK74M_MAG_Compact1.xml | {"selector": {"asset": "Common/Hardware/Weapons/_WeaponModifiers/_Magazine/CompactMagazine/U_WPM_MAG_030Cpt1_RPKM_W05", "guid": "89c6dcd7-ec28-4e79-8744-b0a04e1711b1"}, "actionGuid": "08451be6-ff24-419a-8e56-6eac7bab93e0", "resolvedSiblingSelectorCount": 1} |
| RPK-74M | Common/Hardware/Weapons/MG/RPK74M/Attachment_RPK74M_MAG_Compact2.xml | {"selector": {"asset": "Common/Hardware/Weapons/_WeaponModifiers/_Magazine/CompactMagazine/U_WPM_MAG_030Cpt2_RPKM_W10", "guid": "8c9b2a1b-b5c7-4e49-8ab0-0c1e7fe136ed"}, "actionGuid": "6d6d8580-c8b5-4625-bdfc-e777c4902ca6", "resolvedSiblingSelectorCount": 1} |
| M44 | Common/Hardware/Weapons/Secondary/RagingHunter/Attachment_RagingHunter_ERG_MatchTrigger.xml | {"selector": {"asset": "Common/Hardware/Weapons/_WeaponModifiers/_Ergo/MatchTrigger/U_WPM_ERG_MatchTrigger_W15", "guid": "3eaeac2e-a854-4cd1-90db-216da7845135"}, "actionGuid": "20c7e702-660b-4eeb-97cc-87def6607446", "resolvedSiblingSelectorCount": 0} |
| PP-19 | Common/Hardware/Weapons/SMG/PP19/Attachment_PP19_MAG_Compact1.xml | {"selector": {"asset": "Common/Hardware/Weapons/_WeaponModifiers/_Magazine/CompactMagazine/U_WPM_MAG_025Cpt1_UMP40_W05", "guid": "ede0a101-c5db-4444-9dc8-695c8abf82db"}, "actionGuid": "69d18188-d12f-445f-803c-2fd7d5d846f1", "resolvedSiblingSelectorCount": 1} |

Eight missing WB assets are KingstonLegacy references (five KORD 6P67, three M250); the ninth is DRS-IAR Test LPVO Demo. The latter is an export observation only. Detailed optics are outside the site scope. The 11 no-Ability records are AK4D Light Barrel, SOR-556 flash hider, M2010 ESR bare muzzle, M60E6 Improved Mag Catch, and seven DB12 laser/light devices. A file and point cost do not establish an active selection. Four of the five unmatched bindings have a resolved sibling (DRS-IAR vertical grip, two RPK-74M compact magazines, PP-19 compact magazine). Raging Hunter Match Trigger has no resolved sibling in this graph; its exported killswitch default is true. Exported defaults do not prove current live activation.

## Factory loadouts, deployed attachments, and scope

Factory package references and non-empty attachment lists exist for all 63 current weapons checked. However, the list field `Field_3538f6ad` has not been established as the canonical factory loadout. M433 lists XPS3, FMJ, Flash Hider, Regular Magazine, Short Barrel, and Classic Vertical; this differs from the site Basic/no-grip baseline. VSSM lists its barrel, regular magazine, Match Tungsten, and 1P86. The Factory unlock asset itself gives a package name, not a complete validated loadout. The evidence includes every candidate list and source hash. We must identify the list context and application order before using it to normalize default ammo or barrel effects.

Yes, deployed effects refer to deployed Bipod/Grippod support states, such as mounting the weapon for greater control. The export contains conditional spread, recovery, recoil-tier, and variation modifiers. We have enough information to design a separate deployed-state candidate, but not enough verified state/composition behavior to claim a correct full implementation. The site has no deployed-state control. Applying these modifiers continuously would be incorrect. The remaining work is to resolve the deployment condition, deduplicate shared effects, and check a deployed/undeployed example against the game or native update.

Detailed optics will not be added. Their export records are retained only for audit completeness. The 242 no-selector records are mostly empty rails/slot defaults (BTM 61, MZL 49, ERG 46, RGT 43, TOP 42, BRL 1), not 242 proven missing stat effects. Functional underslung mounts likewise need a relevant mechanic rather than invented numeric bonuses. All no-selector records and available branch context are in the structured evidence.

## Verification

All 44 Node product tests pass, including the ADS-only barrel regression for Heavy, Heavy Extended, and Cryo on B36A4 in both stances. The 63-weapon data validator, published-file validator, and git diff whitespace check pass. Numerical examples use the recorded live inputs; raw constants remain separate from implemented behavior.
