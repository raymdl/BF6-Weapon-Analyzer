# Attachment wiring survey, BF6 2.1.1.0 raw EBX

Facts only. Signature = sorted set of (selector basename, effect asset basename, effect class, effect scalar operands) reached from the attachment's progression(s) through the weapon's ability branches, WB modifier lists and GS bindings. No balance interpretation.

## 1. Coverage

- Raw root: `C:\Users\royal\Documents\BF6 Datamining\builds\2.1.1.0\reports\client-new-check-2026-10-15\collection\raw` (capture client-new-check-2026-10-15, asset catalog from the same collection for import GUIDs).
- Weapon folders processed: **69** (all non-melee folders with one WB, one GS and attachments). Skipped: Melee/CombatKnife (wb 0, gs 0, att 0), Melee/DinoMachete (wb 0, gs 0, att 0), Melee/EODArm (wb 0, gs 0, att 0), Melee/GekoKnife (wb 0, gs 0, att 0), Melee/IceClimbingAxe (wb 0, gs 0, att 0), Melee/Machete (wb 0, gs 0, att 0), Melee/SledgeHammer (wb 0, gs 0, att 0), Shotgun/KSG (wb 0, gs 0, att 1).
- Attachment files processed: **6059**; EBX files decoded in total (attachments, U_PRG via import only, abilities, WB, GS, shared modifier/effect assets): 6950.
- Decode failures: **0**. Unresolved import GUIDs (not in the asset catalog): **0**.
- Attachments with no weapon-modifier effects at all: 2576 of 6059 (mostly SCP/SCA optics, which only unlock visual ATT assets).
- **Unresolved refs: WB modifier assets that exist in the game catalog but are not in this raw capture** (or any other 2.1.1.0 capture folder). Effects behind them cannot be read; selectors bound only by them are reported as coverage gaps, not findings:
  - `Common/Hardware/Weapons/_WeaponModifiers/_RightRail/Light/WPM_RGT_Flashlight02_W15` - listed in 62 weapon WBs
  - `Common/Hardware/Weapons/_Attachments/Offset/RedDot/WM_SCA_OffsetRedDot` - listed in 60 weapon WBs
  - `Common/Hardware/Weapons/_Attachments/Canted/RedDot/WPM_SCP_CantedRedDot` - listed in 55 weapon WBs
  - `Common/Hardware/Weapons/_WeaponModifiers/_Barrel/WPM_BRL_Extended_W15` - listed in 55 weapon WBs
  - `Common/Hardware/Weapons/_Attachments/Canted/RedDot/WPM_SCP_CantedRedDot_LongEyeRelief` - listed in 4 weapon WBs
  - `Common/Hardware/Weapons/_WeaponModifiers/_Ammo/_Shotgun/Buckshot/WPM_AMO_Buckshot_W10` - listed in 4 weapon WBs
  - `Common/Hardware/Weapons/_WeaponModifiers/_Magazine/ExtendedMagazine/WPM_MAG_200Ext1_556_W55` - listed in 2 weapon WBs
  - Selectors left with no binding because of these gaps: `U_WPM_BRL_Extended_W15` (40 weapons). Names affected: BRL Extended Barrel (effects unknown on 40 weapons), RGT/LFT SF300 (Flashlight02), MAG Extended1 on MG4K and Minimi (200Ext1 magazine), AMO Buckshot on all four shotguns.
- Normalisation: `Attachment_<Name>_<SLOT>_<Att>` -> `<SLOT>_<Att>`; case, `_`, `-` folded so spelling variants merge (e.g. `BTM_KAC_Vertical_Grip` / `BTM_KACVerticalGrip`); slot LFT added (present in data); where the file name has no slot token the progression name supplies it. Names offered by 3+ weapons: **216**.

## 3. Strongest outliers (whole modifier missing or extra on 1-2 weapons while 10+ others agree)

Detection is on a coarse key (effect class + asset name with step suffix, weapon/calibre token, digits and game-mode prefixes MPDarkness_/SP_ folded), so tier changes (P10 vs P20, recoil +2 vs +3) are not counted here. Known by-design per-weapon rules, so not listed as strong: recoil step magnitudes differ by class (grips +2/+3, muzzles vary); bolt-action rifles use `*_Bolt` recoil/bipod assets in place of the generic ones; bipod and grip-pod hip dispersion carries a bipod flag (`GDM_Array_HipDispersion_BTM_P20_NoBipod`); magazine assets are per-weapon (capacity). A scalar difference alone is weaker evidence than a missing effect asset.

### 3a. Attachments whose progression has no ability branch at all (attachment binds nothing on this weapon)

- G3A4 (AK4D) `Attachment_G3A4_BRL_LightBarrel` (progression `U_PRG_G3A4_BRL_LightBarrel`)
- SCARL (SOR-556 Mk2) `Attachment_SCARL_MZL_M4QDFlashHider` (progression `U_PRG_SCARL_MZL_M4QDFlashHider`)
- M2010ESR `Attachment_M2010ESR_MZL_Muzzle` (progression `U_PRG_M2010ESR_MZL_Muzzle`)
- M60E6 (M/60) `Attachment_M60E6_ERG_Improved_Mag_Catch` (progression `U_PRG_M60E6_ERG_ImprovedMagCatch`)
- DP12 (DB-12) `Attachment_DP12_BTM_CMR201` (progression `U_PRG_DP12_BTM_CMR201`)
- DP12 (DB-12) `Attachment_DP12_BTM_HolosunRMLt` (progression `U_PRG_DP12_BTM_HolosunRMLt`)
- DP12 (DB-12) `Attachment_DP12_BTM_LMDPEIR1` (progression `U_PRG_DP12_BTM_LMDPEIR1`)
- DP12 (DB-12) `Attachment_DP12_BTM_Perst1` (progression `U_PRG_DP12_BTM_Perst1`)
- DP12 (DB-12) `Attachment_DP12_BTM_SFX300` (progression `U_PRG_DP12_BTM_SFX300`)
- DP12 (DB-12) `Attachment_DP12_BTM_SFX400` (progression `U_PRG_DP12_BTM_SFX400`)
- DP12 (DB-12) `Attachment_DP12_BTM_X5LG3` (progression `U_PRG_DP12_BTM_X5LG3`)

### 3b. Selectors unlocked by the attachment but bound by no WB modifier and no GS binding on that weapon (not a capture gap)

- HK433 (M433) `Attachment_HK433_ERG_MatchTrigger` -> `U_WPM_ERG_MatchTrigger_W15`
- M27IAR (DRS-IAR) `Attachment_M27IAR_BTM_ZenitcoRK2` -> `U_WPM_BTM_Vertical03_W20`
- RPK74M (RPK-74M) `Attachment_RPK74M_MAG_Compact1` -> `U_WPM_MAG_030Cpt1_RPKM_W05`
- RPK74M (RPK-74M) `Attachment_RPK74M_MAG_Compact2` -> `U_WPM_MAG_030Cpt2_RPKM_W10`
- RagingHunter (M44) `Attachment_RagingHunter_ERG_MatchTrigger` -> `U_WPM_ERG_MatchTrigger_W15`
- PP19 (PP-19) `Attachment_PP19_MAG_Compact1` -> `U_WPM_MAG_025Cpt1_UMP40_W05`

### 3c. Whole effect missing / extra versus 10+ agreeing weapons

| Attachment | Weapons with name | Weapon | Kind | Effect class | Asset (coarse) | Agreeing | Example items |
|---|---|---|---|---|---|---|---|
| SCP_Iron_Sights | 68 | PP19 (PP-19) | extra | Class_2fea847d | WM_PlaceHolder_IronSights | 67 | U_WPM_IronSights>WM_PlaceHolder_IronSights[2fea847d] |
| SCP_Iron_Sights | 68 | PP19 (PP-19) | extra | Class_45930daa | WM_PlaceHolder_IronSights | 67 | U_WPM_IronSights>WM_PlaceHolder_IronSights[45930daa] |
| SCP_Iron_Sights | 68 | PP19 (PP-19) | extra | Class_8cdc5b63 | WM_PlaceHolder_IronSights | 67 | U_WPM_IronSights>WM_PlaceHolder_IronSights[8cdc5b63] |
| MAG_Regular | 67 | CDX40 (ELR-40) | extra | Class_0e676037 | WPM_MAG_Std | 66 | U_WPM_MAG_Std_CDX40_W05>WPM_MAG_Std_CDX40_W05[0e676037] |
| MAG_Regular | 67 | CDX40 (ELR-40) | extra | Class_e7d2410a | WPM_MAG_Std | 66 | U_WPM_MAG_Std_CDX40_W05>WPM_MAG_Std_CDX40_W05[e7d2410a] |
| AMO_Frangible | 64 | MG5 (M121 A2) | extra | Class_d11a23a2 | WME_Penetration | 62 | U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2] |
| AMO_Frangible | 64 | M45A1 | extra | Class_d11a23a2 | WME_Penetration | 62 | U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2] |
| AMO_HollowPoint | 56 | MG5 (M121 A2) | extra | Class_d11a23a2 | WME_Penetration | 54 | U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2] |
| AMO_HollowPoint | 56 | M45A1 | extra | Class_d11a23a2 | WME_Penetration | 54 | U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2] |
| MAG_Extended1 | 53 | M240L | extra | Class_743a3ce0 | GS:GDM_Array_ADSMoveDispersion_MAG | 52 | U_WPM_MAG_075Ext1_M240L_W10>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] |
| MAG_Extended1 | 53 | M240L | extra | Class_c42bd53b | WME_DynamicPivot | 52 | U_WPM_MAG_075Ext1_M240L_W10>WME_DynamicPivot_P10[c42bd53b] |
| MAG_Extended1 | 53 | M240L | extra | Class_7d916d6b | WPM_MAG_#Ext# | 52 | U_WPM_MAG_075Ext1_M240L_W10>WPM_MAG_075Ext1_M240L_W10[7d916d6b] |
| BTM_KAC_Vertical_Grip | 53 | 6p67 (KORD 6P67) | extra | Class_be3e57cd | WM_Foregrip | 51 | U_WPM_BTM_Vertical04_W35>WM_Foregrip[be3e57cd] |
| BTM_KAC_Vertical_Grip | 53 | 6p67 (KORD 6P67) | extra | Class_d209d775 | WM_Foregrip | 51 | U_WPM_BTM_Vertical04_W35>WM_Foregrip[d209d775] |
| BTM_KAC_Vertical_Grip | 53 | M250 | extra | Class_be3e57cd | WM_Foregrip | 51 | U_WPM_BTM_Vertical04_W35>WM_Foregrip[be3e57cd] |
| BTM_KAC_Vertical_Grip | 53 | M250 | extra | Class_d209d775 | WM_Foregrip | 51 | U_WPM_BTM_Vertical04_W35>WM_Foregrip[d209d775] |
| MAG_Fast | 50 | CDX40 (ELR-40) | extra | Class_0e676037 | WPM_MAG_Fast | 49 | U_WPM_MAG_Fast_CDX40_W05>WPM_MAG_Fast_CDX40_W05[0e676037] |
| MAG_Fast | 50 | CDX40 (ELR-40) | extra | Class_e7d2410a | WPM_MAG_Fast | 49 | U_WPM_MAG_Fast_CDX40_W05>WPM_MAG_Fast_CDX40_W05[e7d2410a] |
| MAG_Fast | 50 | MG5 (M121 A2) | extra | Class_7d916d6b | WPM_MAG_Fast | 49 | U_WPM_MAG_Fast_W10>WPM_MAG_MG5_Fast_W10[7d916d6b] |
| MAG_Fast | 50 | MG5 (M121 A2) | missing | Class_9705264b | WME_ReloadSpeedRegular | 49 | U_WPM_MAG_Fast_CDX40_W05>WME_ReloadSpeedRegular_P10[9705264b] ; U_WPM_MAG_Fast_W10>WME_ReloadSpeedRegular_P10[9705264b] |
| MZL_MagnusRR | 43 | MRGGA (Mk 24) | extra | Class_bb7f4ea1 | GS:GID_ADSTime_MZL | 42 | U_WPM_MZL_HybridSuppressor03_W25>GS:GID_ADSTime_MZL_M10[bb7f4ea1] |
| MZL_MagnusRRK | 43 | MRGGA (Mk 24) | extra | Class_bb7f4ea1 | GS:GID_ADSTime_MZL | 42 | U_WPM_MZL_HybridSuppressor01_W40>GS:GID_ADSTime_MZL_M10[bb7f4ea1] |
| MZL_MagnusRRS | 43 | MRGGA (Mk 24) | extra | Class_bb7f4ea1 | GS:GID_ADSTime_MZL | 42 | U_WPM_MZL_HybridSuppressor02_W30>GS:GID_ADSTime_MZL_M10[bb7f4ea1] |
| BRL_LightBarrel | 42 | G3A4 (AK4D) | missing | Class_743a3ce0 | GS:GDM_Array_ADSMoveDispersion_BRL | 41 | U_WPM_BRL_Fluted_W20>GS:GDM_Array_ADSMoveDispersion_BRL_P10[743a3ce0] |
| BRL_LightBarrel | 42 | G3A4 (AK4D) | missing | Class_bb7f4ea1 | GS:GID_ADSTime_BRL | 41 | U_WPM_BRL_Fluted_W20>GS:GID_ADSTime_BRL_P10[bb7f4ea1] |
| BRL_LightBarrel | 42 | G3A4 (AK4D) | missing | Class_016623ac | WME_ADSTime_Anim | 41 | U_WPM_BRL_Fluted_W20>WME_ADSTime_Anim_P10[016623ac] |
| BRL_LightBarrel | 42 | G3A4 (AK4D) | missing | Class_104c2294 | WME_ADSTime_FOV | 41 | U_WPM_BRL_Fluted_W20>WME_ADSTime_FOV_P10[104c2294] |
| BRL_LightBarrel | 42 | G3A4 (AK4D) | missing | Class_c42bd53b | WME_DynamicPivot | 41 | U_WPM_BRL_Fluted_W20>WME_DynamicPivot_P10[c42bd53b] |
| BTM_BT_Grippod_QD | 38 | DP12 (DB-12) | missing | Class_743a3ce0 | GS:GDM_Array_HipDispersion_BTM | 37 | U_WPM_BTM_GripPod02_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0] |
| BTM_Magpul_AFG | 38 | 185KSK (18.5KS-K) | extra | Class_743a3ce0 | GS:GDM_Array_ADSMoveDispersion_BTM | 37 | U_WPM_BTM_Fast02_W25>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0] |
| BTM_GPS2 | 37 | DP12 (DB-12) | missing | Class_743a3ce0 | GS:GDM_Array_HipDispersion_BTM | 36 | U_WPM_BTM_GripPod03_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0] |
| BTM_QBZ_Grippod | 37 | DP12 (DB-12) | missing | Class_743a3ce0 | GS:GDM_Array_HipDispersion_BTM | 36 | U_WPM_BTM_GripPod01_W20>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_0e676037 | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[0e676037] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_acc96a6e | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[acc96a6e] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_b1afeb65 | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[b1afeb65] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_d11a23a2 | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[d11a23a2] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_e85fff64 | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[e85fff64] |
| MAG_Compact1 | 36 | PKM (Z84M) | missing | Class_4aac041b | WME_Draw_Deploy | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WME_Draw_Deploy_P05[4aac041b] ; U_WPM_MAG_003Cpt1_DesertTechHTI_W05>WME_Draw_Deploy_P05[4aac041b] ; U_WPM_MAG_004Cpt1_185KSK_W05>WME_Draw_Deploy_P10[4aac041b] ; (+23) |
| MAG_Compact1 | 36 | PKM (Z84M) | missing | Class_03db7a68 | WME_Draw_Sprint | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WME_Draw_Sprint_P05[03db7a68] ; U_WPM_MAG_003Cpt1_DesertTechHTI_W05>WME_Draw_Sprint_P05[03db7a68] ; U_WPM_MAG_004Cpt1_185KSK_W05>WME_Draw_Sprint_P10[03db7a68] ; (+23) |
| MAG_Compact1 | 36 | PKM (Z84M) | missing | Class_e7d2410a | WPM_MAG_#Cpt# | 35 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[e7d2410a] ; U_WPM_MAG_003Cpt1_DesertTechHTI_W05>WPM_MAG_003Cpt1_DesertTechHTI_W05[e7d2410a] ; U_WPM_MAG_004Cpt1_185KSK_W05>WPM_MAG_004Cpt1_185KSK_W05[e7d2410a] ; (+23) |
| ERG_Improved_Mag_Catch | 35 | M60E6 (M/60) | missing | Class_9705264b | WME_ReloadSpeedSmall | 34 | U_WPM_ERG_ImprovedMagCatch_W05>WME_ReloadSpeedSmall_P05[9705264b] |
| MAG_Compact1 | 36 | CDX40 (ELR-40) | extra | Class_7d916d6b | WPM_MAG_#Cpt# | 34 | U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[7d916d6b] |
| MAG_Compact1 | 36 | M60E6 (M/60) | extra | Class_7d916d6b | WPM_MAG_#Cpt# | 34 | U_WPM_MAG_050Cpt1_M60E6_W05>WPM_MAG_050Cpt1_M60E6_W05[7d916d6b] |
| MAG_Compact1 | 36 | RPK74M (RPK-74M) | extra | NO_WB_GS_MATCH | - | 34 | U_WPM_MAG_030Cpt1_RPKM_W05>-[NO_WB_GS_MATCH] |
| MAG_Compact1 | 36 | PP19 (PP-19) | extra | NO_WB_GS_MATCH | - | 34 | U_WPM_MAG_025Cpt1_UMP40_W05>-[NO_WB_GS_MATCH] |
| RGT_TL_MissionLight | 34 | VHS2 (VCR-2) | extra | Class_98c02a2b | WB-local | 33 | U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b] |
| TOP_Perst4 | 33 | SV98M (SV-98) | extra | Class_98c02a2b | WB-local | 32 | U_WPM_TOP_5mWRed_W10>WB-local[98c02a2b] |
| TOP_Perst4 | 33 | SV98M (SV-98) | extra | Class_b1afeb65 | WB-local | 32 | U_WPM_TOP_5mWRed_W10>WB-local[b1afeb65] |
| BRL_ShortBarrel | 32 | MiniFix (Mini Scout) | missing | Class_bb7f4ea1 | GS:GID_ADSTime_BRL | 31 | U_WPM_BRL_Short_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1] |
| RGT_ANPEQ16B | 31 | DP12 (DB-12) | missing | Class_743a3ce0 | GS:GDM_Array_ADSMoveDispersion_TOP | 30 | U_WPM_TOP_50mWViolet_W10>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0] |
| MAG_Extended2 | 29 | M240L | extra | Class_7d916d6b | WPM_MAG_#Ext# | 28 | U_WPM_MAG_100Ext2_M240L_W20>WPM_MAG_100Ext2_M240L_W20[7d916d6b] |
| MAG_Extended2 | 29 | G22 (GGH-22) | extra | Class_4aac041b | WME_Draw_Deploy | 28 | U_WPM_MAG_022Ext2_G22_W30>WME_Draw_Deploy_M05[4aac041b] |
| MAG_Extended2 | 29 | G22 (GGH-22) | extra | Class_03db7a68 | WME_Draw_Sprint | 28 | U_WPM_MAG_022Ext2_G22_W30>WME_Draw_Sprint_M05[03db7a68] |
| ERG_MatchTrigger | 28 | DEVGRU | extra | Class_5e5631ff | GS:GBM_NoIncrease_ERG | 27 | U_WPM_ERG_MatchTriggerActive>GS:GBM_NoIncrease_ERG_P00[5e5631ff] |
| ERG_MatchTrigger | 28 | DEVGRU | extra | Class_bb838ff6 | GS:GRM_MatchTrigger_ERG | 27 | U_WPM_ERG_MatchTriggerActive>GS:GRM_MatchTrigger_ERG_P15[bb838ff6] |
| MAG_Extended2 | 29 | M240L | missing | Class_303a33cc | WME_ADSMoveSpeed | 27 | U_WPM_MAG_020Ext2_ARADMR_W45>WME_ADSMoveSpeed_M05[303a33cc] ; U_WPM_MAG_020Ext2_MiniFix_W55>WME_ADSMoveSpeed_M05[303a33cc] ; U_WPM_MAG_025Ext2_APC10_W45>WME_ADSMoveSpeed_M05[303a33cc] ; (+12) |
| MAG_Extended2 | 29 | G22 (GGH-22) | missing | Class_303a33cc | WME_ADSMoveSpeed | 27 | U_WPM_MAG_020Ext2_ARADMR_W45>WME_ADSMoveSpeed_M05[303a33cc] ; U_WPM_MAG_020Ext2_MiniFix_W55>WME_ADSMoveSpeed_M05[303a33cc] ; U_WPM_MAG_025Ext2_APC10_W45>WME_ADSMoveSpeed_M05[303a33cc] ; (+12) |
| ERG_MatchTrigger | 28 | HK433 (M433) | extra | NO_WB_GS_MATCH | - | 26 | U_WPM_ERG_MatchTrigger_W15>-[NO_WB_GS_MATCH] |
| ERG_MatchTrigger | 28 | HK433 (M433) | missing | Class_10713bed | WB-local | 26 | U_WPM_ERG_MatchTrigger_W15>WB-local[10713bed] |
| ERG_MatchTrigger | 28 | RagingHunter (M44) | extra | NO_WB_GS_MATCH | - | 26 | U_WPM_ERG_MatchTrigger_W15>-[NO_WB_GS_MATCH] |
| ERG_MatchTrigger | 28 | RagingHunter (M44) | missing | Class_10713bed | WB-local | 26 | U_WPM_ERG_MatchTrigger_W15>WB-local[10713bed] |
| MAG_Compact2 | 24 | CDX40 (ELR-40) | extra | Class_0e676037 | WPM_MAG_#Cpt# | 23 | U_WPM_MAG_005Cpt2_CDX40_W05>WPM_MAG_005Cpt2_CDX40_W05[0e676037] |
| MAG_Compact2 | 24 | RPK74M (RPK-74M) | extra | NO_WB_GS_MATCH | - | 23 | U_WPM_MAG_030Cpt2_RPKM_W10>-[NO_WB_GS_MATCH] |
| MZL_Sandman-SMILSuppressor | 18 | M39EMR | extra | Class_96bab3b8 | WPM_MZL_ImprvdSuppressor# | 17 | U_WPM_MZL_ImprvdSuppressor01_W30>SP_WPM_MZL_ImprvdSuppressor01_W30[96bab3b8] |
| BRL_HeavyExtendedBarrel | 16 | RPK74M (RPK-74M) | extra | Class_2fea847d | WB-local | 14 | U_WPM_BRL_HeavyExtended_W10>WB-local[2fea847d] |
| BRL_HeavyExtendedBarrel | 16 | RPKM | extra | Class_2fea847d | WB-local | 14 | U_WPM_BRL_HeavyExtended_W10>WB-local[2fea847d] |
| MZL_CompactStreamer | 12 | HK417A2 (M417 A2) | extra | Class_96bab3b8 | WPM_MZL_ImprvdSuppressor# | 11 | U_WPM_MZL_ImprvdSuppressor01_W30>SP_WPM_MZL_ImprvdSuppressor01_W30[96bab3b8] |
| MZL_CompactStreamer | 12 | MP7A2 (PW7A2) | extra | Class_743a3ce0 | GS:GDM_Array_HipDispersion_MZL | 11 | U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] |

### 3d. Weaker: same effect class present but through a different asset (substitution)

- RGT_ANPEQ16B on DP12 (DB-12): missing WPM_TOP_#mWViolet; has WPM_RGT_LightLaser#
- MZL_RSMicroTactical on MiniFix (Mini Scout): missing GS:GRM_Recoil_MZL; has GS:GRM_Recoil_MZL_Bolt
- BTM_AtlasV8 on M2010ESR: missing GS:GRM_BipodDeployed_BTM; has GS:GRM_BipodDeployed_Bolt_BTM
- BTM_AtlasV8 on MRAD (PSR): missing GS:GRM_BipodDeployed_BTM; has GS:GRM_BipodDeployed_Bolt_BTM
- MZL_QCherryBomb on MiniFix (Mini Scout): missing GS:GRM_SmoothRecoil_Compensator; has GS:GRM_SmoothRecoilBolt_Compensator
- MZL_TionMB58x24 on L115A3 (L115): missing GS:GRM_Recoil_MZL, GS:GRM_SmoothRecoil; has GS:GRM_Recoil_MZL_Bolt, GS:GRM_SmoothRecoilBolt
- MZL_TionMB58x24 on MRAD (PSR): missing GS:GRM_Recoil_MZL, GS:GRM_SmoothRecoil; has GS:GRM_Recoil_MZL_Bolt, GS:GRM_SmoothRecoilBolt
- MZL_LANTACDragonMB on M2010ESR: missing GS:GRM_Recoil_MZL, GS:GRM_SmoothRecoil; has GS:GRM_Recoil_MZL_Bolt, GS:GRM_SmoothRecoilBolt
- MZL_LANTACDragonMB on MiniFix (Mini Scout): missing GS:GRM_Recoil_MZL, GS:GRM_SmoothRecoil; has GS:GRM_Recoil_MZL_Bolt, GS:GRM_SmoothRecoilBolt
- AMO_Subsonic on HK417A2 (M417 A2): missing WME_MuzzleVelocity; has WPM_AMO_Subsonic
- AMO_Subsonic on P90 (USG-90): missing WME_MuzzleVelocity; has WPM_AMO_Subsonic
- AMO_SubsonicHollowPoint on HK417A2 (M417 A2): missing WME_MuzzleVelocity; has WPM_AMO_SubsonicJHP
- AMO_SubsonicHollowPoint on P90 (USG-90): missing WME_MuzzleVelocity; has WPM_AMO_SubsonicJHP
- AMO_SubsonicFrangible on HK417A2 (M417 A2): missing WME_MuzzleVelocity; has WPM_AMO_SubsonicFRNG
- AMO_SubsonicFrangible on P90 (USG-90): missing WME_MuzzleVelocity; has WPM_AMO_SubsonicFRNG
- MZL_SIGTaperedMB on M2010ESR: missing GS:GRM_Recoil_MZL; has GS:GRM_Recoil_MZL_Bolt

### 3e. Rows suppressed as coverage gaps (weapon's selector is named like an uncaptured WB modifier)

- MAG_Extended1 on MG4K (M123K): extra Class_bb7f4ea1 GS:GID_ADSTime_MAG
- MAG_Extended1 on MG4K (M123K): missing Class_e7d2410a WPM_MAG_#Ext#
- MAG_Extended1 on Minimi (L110): extra Class_bb7f4ea1 GS:GID_ADSTime_MAG
- MAG_Extended1 on Minimi (L110): missing Class_e7d2410a WPM_MAG_#Ext#

## 2. Per-attachment majority signature and differing weapons

Sorted by weapons sharing the name, descending. Item notation `selector>effect asset[class hash]`; GS: marks a GS binding, WB-local an effect object inside the WB. MISSING/EXTRA = whole item; CHANGED = paired item (same asset+class, or same coarse key) with the selector/asset/operand differences listed (operand keys are field hashes; at most 6 shown, all in outliers.csv). Majority = most common exact signature (a low majority count means the name is wired several ways). Full item lists and operand values: signatures.json (opsTable keyed by operand hash).

### SCP_ACROP2/SCP_ACRO_P2: 68 weapons, majority 68, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_Iron_Sights/SCP_IronSights/SCP_iron_sights: 68 weapons, majority 3, 66 distinct signatures
Majority: U_WPM_IronSights>GS:GCR_01x50_P00[219954e8]; U_WPM_IronSights>WME_CSway_P05[28d25398]; U_WPM_IronSights>WME_WSway_P05[2fea847d]
- 6p67 (KORD 6P67): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- ACE32 (NVO-228E): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- EF88: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- G36 (B36A4): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- G3A4 (AK4D): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- HK433 (M433): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- L85A3: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M16A3 (M16A4): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MRGGA (Mk 24): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- SCARL (SOR-556 Mk2): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- Tavor7 (TR-7): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- VHS2 (VCR-2): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- AK205 (AK-205): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- HK417A2 (M417 A2): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M4A1: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- QBZ192 (QBZ-192): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- SCARSC (SOR-300SC): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- SIG553R (SG 553R): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- XM7 (M277): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- ARADMR (LMR27): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M39EMR: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MSBSGROTCPS (GRT-CPS): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- SVCh (SVK-8.6): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- SVDM: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- VSSM: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M240L: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M250: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M27IAR (DRS-IAR): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M60E6 (M/60): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MG5 (M121 A2): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- Minimi (L110): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- PKM (Z84M): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- RPK74M (RPK-74M): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- RPKM: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- Ultimax (KTS100 MK8): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- APC10 (SCW-10): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- APDW (SL9): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MP5MLI (PW5A3): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MP7A2 (PW7A2): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MPX (SGX): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- P90 (USG-90): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- RSAR999 (RSPR): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- ScorpionEvo3 (CZ3A1): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- UMP40 (UMG-40): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- Vector (KV9): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- FiveSeven (ES 5.7): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M45A1: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- Skorpion (vz. 61): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- TRR8 (M357 Trait): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- 185KSK (18.5KS-K): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- 590A1 (M87A1): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- DP12 (DB-12): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- M1014: EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- MSBSGROTB (GRT-BC): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- G22 (GGH-22): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- DEVGRU: MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- CDX40 (ELR-40): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- DesertTechHTI (Interdictor): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- M2010ESR: MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- MRAD (PSR): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- BREN3 (BROD 3): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63]
- PP19 (PP-19): EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WM_PlaceHolder_IronSights[2fea847d] | EXTRA U_WPM_IronSights>WM_PlaceHolder_IronSights[45930daa] | EXTRA U_WPM_IronSights>WM_PlaceHolder_IronSights[8cdc5b63]
- MiniFix (Mini Scout): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- L115A3 (L115): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]
- SV98M (SV-98): MISSING U_WPM_IronSights>WME_CSway_P05[28d25398] | MISSING U_WPM_IronSights>WME_WSway_P05[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[2fea847d] | EXTRA U_WPM_IronSights>WB-local[45930daa] | EXTRA U_WPM_IronSights>WB-local[8cdc5b63] | EXTRA U_WPM_IronSights>WPM_NoScopeGlint[acc96a6e]

### MAG_Regular: 67 weapons, majority 66, 2 distinct signatures
Majority: U_WPM_MAG_Std_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_MAG_Std_W05>WME_Draw_Sprint_P05[03db7a68]
- CDX40 (ELR-40): CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_Std_W05->U_WPM_MAG_Std_CDX40_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_Std_W05->U_WPM_MAG_Std_CDX40_W05 | EXTRA U_WPM_MAG_Std_CDX40_W05>WPM_MAG_Std_CDX40_W05[0e676037] | EXTRA U_WPM_MAG_Std_CDX40_W05>WPM_MAG_Std_CDX40_W05[e7d2410a]

### SCP_EFLXMini: 67 weapons, majority 67, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_RMR: 67 weapons, majority 67, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_RomeoX: 67 weapons, majority 67, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_ShieldCQS/SCP_Shield_CQS: 67 weapons, majority 67, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_TrijiconSRO: 67 weapons, majority 67, 1 distinct signatures
Majority: (no weapon-modifier effects)

### AMO_FMJ: 64 weapons, majority 64, 1 distinct signatures
Majority: U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]

### AMO_Frangible: 64 weapons, majority 62, 2 distinct signatures
Majority: U_WPM_AMO_Frangible_W20>WME_HealthRegenDelay_P20[5830cb87]
- MG5 (M121 A2): EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]
- M45A1: EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]

### AMO_Tungsten: 64 weapons, majority 57, 4 distinct signatures
Majority: U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_M10[bb838ff6]; U_WPM_AMO_TungstenCore_W05>WME_Penetration_P15[d11a23a2]
- MiniFix (Mini Scout): EXTRA U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_Bolt_M10[bb838ff6]
- MG5 (M121 A2): EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]
- M45A1: EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]
- CDX40 (ELR-40): MISSING U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_M10[bb838ff6] | EXTRA U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_Bolt_M10[bb838ff6]
- M2010ESR: MISSING U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_M10[bb838ff6] | EXTRA U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_Bolt_M10[bb838ff6]
- MRAD (PSR): MISSING U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_M10[bb838ff6] | EXTRA U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_Bolt_M10[bb838ff6]
- SV98M (SV-98): MISSING U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_M10[bb838ff6] | EXTRA U_WPM_AMO_TungstenCore_W05>GS:GRM_Recoil_AMO_Bolt_M10[bb838ff6]

### SCP_TrijiconRCO: 63 weapons, majority 63, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_XPS3: 63 weapons, majority 63, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_Bravo3: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_COD2M: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_CompM5b/SCP_CompM5B: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_ELCANLDS: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_M145MGO: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_MeproM22: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_OPK7: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_PG350: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_QMK171A: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_Romeo4T: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_Spitfire: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_SteinerT536: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_TrijiconMRO: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_TrijiconSDO: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_VZOR3: 62 weapons, majority 62, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCA_CantedIronSights: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCA_OffsetRedDot: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_ANPAS35: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_ELCANDR: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_HolosunDRSTH: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_TrijiconREAPIR: 60 weapons, majority 60, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCA_CantedReflex: 59 weapons, majority 59, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_1P86: 59 weapons, majority 59, 1 distinct signatures
Majority: (no weapon-modifier effects)

### BRL_BasicBarrel: 57 weapons, majority 57, 1 distinct signatures
Majority: U_WPM_BRL_Basic_W10>GS:GID_ADSTime_BRL_P10[bb7f4ea1]; U_WPM_BRL_Basic_W10>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BRL_Basic_W10>WME_ADSTime_FOV_P10[104c2294]

### SCA_G43Magnifier: 57 weapons, majority 57, 1 distinct signatures
Majority: (no weapon-modifier effects)

### AMO_HollowPoint: 56 weapons, majority 54, 2 distinct signatures
Majority: U_WPM_AMO_JHP_W10>WME_Protection_P10[e85fff64]
- MG5 (M121 A2): EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]
- M45A1: EXTRA U_WPM_AMO_FMJ_W05>WME_Penetration_P05[d11a23a2]

### BTM_LWRCI_VFG/BTM_LWRCIVFG: 54 weapons, majority 54, 1 distinct signatures
Majority: U_WPM_BTM_FastAim01_W20>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastAim01_W20>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAim01_W20>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_FastAim01_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAim01_W20>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastAim01_W20>WME_DynamicPivot_M10[c42bd53b]

### BTM_Magpul_MVG/BTM_MagpulMVG: 54 weapons, majority 54, 1 distinct signatures
Majority: U_WPM_BTM_FastAim03_W35>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastAim03_W35>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAim03_W35>GS:GRM_Recoil_BTM_P40[bb838ff6]; U_WPM_BTM_FastAim03_W35>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_BTM_FastAim03_W35>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAim03_W35>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastAim03_W35>WME_DynamicPivot_M10[c42bd53b]

### BTM_MSBS_A2_Grip/BTM_MSBSA2Grip: 54 weapons, majority 54, 1 distinct signatures
Majority: U_WPM_BTM_FastAim02_W30>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastAim02_W30>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAim02_W30>GS:GRM_Recoil_BTM_P30[bb838ff6]; U_WPM_BTM_FastAim02_W30>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAim02_W30>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastAim02_W30>WME_DynamicPivot_M10[c42bd53b]

### BTM_Tango_Stubby/BTM_TangoStubby: 54 weapons, majority 54, 1 distinct signatures
Majority: U_WPM_BTM_FastAim01_W30>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAim01_W30>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_FastAim01_W30>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAim01_W30>WME_ADSTime_FOV_P10[104c2294]

### BTM_6Ch64_Vertical/BTM_6Ch64Vertical: 53 weapons, majority 53, 1 distinct signatures
Majority: U_WPM_BTM_Vertical03_W25>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Vertical03_W25>GS:GRM_Recoil_BTM_P40[bb838ff6]; U_WPM_BTM_Vertical03_W25>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_BTM_Vertical03_W25>WME_DynamicPivot_M10[c42bd53b]

### BTM_BCM_Stubby/BTM_BCMStubby: 53 weapons, majority 53, 1 distinct signatures
Majority: U_WPM_BTM_FastAim04_W45>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastAim04_W45>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAim04_W45>GS:GRM_Recoil_BTM_P50[bb838ff6]; U_WPM_BTM_FastAim04_W45>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_BTM_FastAim04_W45>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAim04_W45>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastAim04_W45>WME_DynamicPivot_M10[c42bd53b]

### BTM_KAC_Vertical_Grip/BTM_KACVerticalGrip/BTM_kac_Vertical_Grip/BTM_KAC_VerticalGrip: 53 weapons, majority 51, 2 distinct signatures
Majority: U_WPM_BTM_Vertical04_W35>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Vertical04_W35>GS:GRM_Recoil_BTM_P50[bb838ff6]; U_WPM_BTM_Vertical04_W35>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_BTM_Vertical04_W35>WME_DynamicPivot_M10[c42bd53b]
- 6p67 (KORD 6P67): EXTRA U_WPM_BTM_Vertical04_W35>WM_Foregrip[be3e57cd] | EXTRA U_WPM_BTM_Vertical04_W35>WM_Foregrip[d209d775]
- M250: EXTRA U_WPM_BTM_Vertical04_W35>WM_Foregrip[be3e57cd] | EXTRA U_WPM_BTM_Vertical04_W35>WM_Foregrip[d209d775]

### BTM_TangoDown_Vertical/BTM_TangoDownVertical: 53 weapons, majority 53, 1 distinct signatures
Majority: U_WPM_BTM_Vertical02_W20>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Vertical02_W20>GS:GRM_Recoil_BTM_P30[bb838ff6]; U_WPM_BTM_Vertical02_W20>WME_DynamicPivot_M10[c42bd53b]

### BTM_Zenitco_RK1/BTM_ZenitcoRK1: 53 weapons, majority 53, 1 distinct signatures
Majority: U_WPM_BTM_Vertical01_W20>GS:GRM_Recoil_BTM_P20[bb838ff6]

### MAG_Extended1: 53 weapons, majority 13, 37 distinct signatures
Majority: U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_036Ext1_556_W15>WPM_MAG_036Ext1_556_W15[e7d2410a]
- 6p67 (KORD 6P67): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_545_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_545_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_545_W15; operands {4614adfe: 6->7}
- ACE32 (NVO-228E): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_762AK_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_762AK_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_762AK_W15; operands {4614adfe: 6->5}
- G3A4 (AK4D): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_G3A4_W40 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_G3A4_W40; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_030Ext1_G3A4_W40; operands {4614adfe: 6->5, 7f22bfb4: 37->31}
- MRGGA (Mk 24): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_MRGGA_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_MRGGA_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_025Ext1_MRGGA_W20; operands {4614adfe: 6->7, 7f22bfb4: 37->26}
- Tavor7 (TR-7): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_762N_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_762N_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_025Ext1_762N_W20; operands {7f22bfb4: 37->26}
- DesertTechHTI (Interdictor): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_007Ext1_DesertTechHTI_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_007Ext1_DesertTechHTI_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_007Ext1_DesertTechHTI_W15; operands {4614adfe: 6->5, 7f22bfb4: 37->8, bd024e1d: -1->99}
- L115A3 (L115): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_007Ext1_L115A3_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_007Ext1_L115A3_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_007Ext1_L115A3_W20; operands {4614adfe: 6->5, 7f22bfb4: 37->8, bd024e1d: -1->99}
- M2010ESR: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_008Ext1_M2010ESR_W25 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_008Ext1_M2010ESR_W25; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_008Ext1_M2010ESR_W25; operands {4614adfe: 6->5, 7f22bfb4: 37->9}
- MiniFix (Mini Scout): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_015Ext1_MiniFix_W30 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_015Ext1_MiniFix_W30; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_015Ext1_MiniFix_W30; operands {4614adfe: 6->4, 7f22bfb4: 37->16}
- AK205 (AK-205): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_545_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_545_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_545_W15; operands {4614adfe: 6->7}
- HK417A2 (M417 A2): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_762N_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_762N_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_025Ext1_762N_W20; operands {7f22bfb4: 37->26}
- SIG553R (SG 553R): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_762AK_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_762AK_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_762AK_W15; operands {4614adfe: 6->5}
- XM7 (M277): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_XM7_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_XM7_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_025Ext1_XM7_W20; operands {4614adfe: 6->7, 7f22bfb4: 37->26}
- ARADMR (LMR27): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_015Ext1_ARADMR_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_015Ext1_ARADMR_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_015Ext1_ARADMR_W20; operands {4614adfe: 6->11, 7f22bfb4: 37->16}
- M39EMR: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_M39EMR_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_025Ext1_M39EMR_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_025Ext1_M39EMR_W20; operands {7f22bfb4: 37->26}
- MSBSGROTCPS (GRT-CPS): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_GrotC_W40 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_GrotC_W40; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_030Ext1_GrotC_W40; operands {4614adfe: 6->5, 7f22bfb4: 37->31}
- SVDM: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_SVDM_W45 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_SVDM_W45; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_020Ext1_SVDM_W45; operands {4614adfe: 6->7, 7f22bfb4: 37->21}
- VSSM: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_939_W40 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_939_W40; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_030Ext1_939_W40; operands {4614adfe: 6->5, 7f22bfb4: 37->31}
- RPK74M (RPK-74M): CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_050Ext1_RPK74M_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_050Ext1_RPK74M_W15; operands {4614adfe: 6->5, 7f22bfb4: 37->51} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc]
- RPKM: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_060Ext1_RPKM_W30 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_060Ext1_RPKM_W30; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_060Ext1_RPKM_W30; operands {4614adfe: 6->4, 7f22bfb4: 37->61}
- Ultimax (KTS100 MK8): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_Ultimax_W55 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_Ultimax_W55; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_100Ext1_Ultimax_W55; operands {4614adfe: 6->3, 7f22bfb4: 37->100}
- APC10 (SCW-10): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_APC10_W20 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_APC10_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_020Ext1_APC10_W20; operands {4614adfe: 6->9, 7f22bfb4: 37->21}
- MP5MLI (PW5A3): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_040Ext1_MP5MLI_W25 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_040Ext1_MP5MLI_W25; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_040Ext1_MP5MLI_W25; operands {7f22bfb4: 37->41}
- MP7A2 (PW7A2): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_040Ext1_MP7A2_W25 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_040Ext1_MP7A2_W25; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_040Ext1_MP7A2_W25; operands {4614adfe: 6->8, 7f22bfb4: 37->41}
- MPX (SGX): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_MPX_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_MPX_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_MPX_W15
- PP19 (PP-19): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_PP19_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_PP19_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_PP19_W15; operands {7f22bfb4: 37->36}
- ScorpionEvo3 (CZ3A1): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_035Ext1_ScorpionEvo3_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_035Ext1_ScorpionEvo3_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_035Ext1_ScorpionEvo3_W15; operands {7f22bfb4: 37->36}
- UMP40 (UMG-40): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_UMP40_W15 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_036Ext1_UMP40_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_036Ext1_UMP40_W15
- Vector (KV9): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_023Ext1_Vector_W25 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_023Ext1_Vector_W25; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_023Ext1_Vector_W25; operands {4614adfe: 6->9, 7f22bfb4: 37->24}
- MG4K (M123K): MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | MISSING U_WPM_MAG_036Ext1_556_W15>WPM_MAG_036Ext1_556_W15[e7d2410a] | EXTRA U_WPM_MAG_200Ext1_556_W55>GS:GID_ADSTime_MAG_M10[bb7f4ea1]
- Minimi (L110): MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | MISSING U_WPM_MAG_036Ext1_556_W15>WPM_MAG_036Ext1_556_W15[e7d2410a] | EXTRA U_WPM_MAG_200Ext1_556_W55>GS:GID_ADSTime_MAG_M10[bb7f4ea1]
- M250: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_M250_W55 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_M250_W55; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_100Ext1_M250_W55; operands {4614adfe: 6->2, 7f22bfb4: 37->100} | EXTRA U_WPM_MAG_100Ext1_M250_W55>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_100Ext1_M250_W55>WME_Draw_Sprint_M05[03db7a68]
- MG5 (M121 A2): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_MG5_W55 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_100Ext1_MG5_W55; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_100Ext1_MG5_W55; operands {4614adfe: 6->2, 7f22bfb4: 37->100} | EXTRA U_WPM_MAG_100Ext1_MG5_W55>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_100Ext1_MG5_W55>WME_Draw_Sprint_M05[03db7a68]
- APDW (SL9): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_060Ext1_APDW_W55 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_060Ext1_APDW_W55; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_060Ext1_APDW_W55; operands {4614adfe: 6->4, 7f22bfb4: 37->61} | EXTRA U_WPM_MAG_060Ext1_APDW_W55>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_060Ext1_APDW_W55>WME_Draw_Sprint_M05[03db7a68]
- FiveSeven (ES 5.7): CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_030Ext1_FiveSeven_W40; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_030Ext1_FiveSeven_W40; operands {4614adfe: 6->3, 7f22bfb4: 37->31} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_030Ext1_FiveSeven_W40>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_030Ext1_FiveSeven_W40>WME_Draw_Sprint_M05[03db7a68]
- G22 (GGH-22): CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_G22_W20; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_020Ext1_G22_W20; operands {4614adfe: 6->3, 7f22bfb4: 37->21} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_020Ext1_G22_W20>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_020Ext1_G22_W20>WME_Draw_Sprint_M05[03db7a68]
- M18 (P18): CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_021Ext1_M18_W15; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_021Ext1_M18_W15; operands {4614adfe: 6->4, 7f22bfb4: 37->22} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_021Ext1_M18_W15>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_021Ext1_M18_W15>WME_Draw_Sprint_M05[03db7a68]
- M45A1: CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_011Ext1_M45A1_W25; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_011Ext1_M45A1_W25; operands {4614adfe: 6->5, 7f22bfb4: 37->12} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_011Ext1_M45A1_W25>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_011Ext1_M45A1_W25>WME_Draw_Sprint_M05[03db7a68]
- Skorpion (vz. 61): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_Skorpion_W40 | CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_020Ext1_Skorpion_W40; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_020Ext1_Skorpion_W40; operands {4614adfe: 6->3, 7f22bfb4: 37->21} | EXTRA U_WPM_MAG_020Ext1_Skorpion_W40>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_020Ext1_Skorpion_W40>WME_Draw_Sprint_M05[03db7a68]
- M240L: CHANGED WPM_MAG_036Ext1_556_W15[e7d2410a]: selector U_WPM_MAG_036Ext1_556_W15->U_WPM_MAG_075Ext1_M240L_W10; asset WPM_MAG_036Ext1_556_W15->WPM_MAG_075Ext1_M240L_W10; operands {4614adfe: 6->3, 7f22bfb4: 37->75} | MISSING U_WPM_MAG_036Ext1_556_W15>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_075Ext1_M240L_W10>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | EXTRA U_WPM_MAG_075Ext1_M240L_W10>WME_Draw_Deploy_P05[4aac041b] | EXTRA U_WPM_MAG_075Ext1_M240L_W10>WME_Draw_Sprint_P05[03db7a68] | EXTRA U_WPM_MAG_075Ext1_M240L_W10>WME_DynamicPivot_P10[c42bd53b] | EXTRA U_WPM_MAG_075Ext1_M240L_W10>WPM_MAG_075Ext1_M240L_W10[7d916d6b]

### BTM_FAB_TFS/BTM_FABTFS: 52 weapons, majority 52, 1 distinct signatures
Majority: U_WPM_BTM_Vertical01_W10>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Vertical01_W10>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_Vertical01_W10>WME_DynamicPivot_M10[c42bd53b]

### MAG_Fast: 50 weapons, majority 48, 3 distinct signatures
Majority: U_WPM_MAG_Fast_W10>WME_ReloadSpeedRegular_P10[9705264b]
- MG5 (M121 A2): MISSING U_WPM_MAG_Fast_W10>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_Fast_W10>WPM_MAG_MG5_Fast_W10[7d916d6b]
- CDX40 (ELR-40): CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_Fast_W10->U_WPM_MAG_Fast_CDX40_W05 | EXTRA U_WPM_MAG_Fast_CDX40_W05>WPM_MAG_Fast_CDX40_W05[0e676037] | EXTRA U_WPM_MAG_Fast_CDX40_W05>WPM_MAG_Fast_CDX40_W05[e7d2410a]

### SCP_MarchFFPShorty: 50 weapons, majority 50, 1 distinct signatures
Majority: (no weapon-modifier effects)

### BTM_DDVertical: 49 weapons, majority 49, 1 distinct signatures
Majority: U_WPM_BTM_Vertical02_W30>GS:GRM_Recoil_BTM_P30[bb838ff6]; U_WPM_BTM_Vertical02_W30>WME_DynamicPivot_M10[c42bd53b]

### BRL_ExtendedBarrel/BRL_Extended_Barrel/BRL_extendedbarrel: 48 weapons, majority 40, 7 distinct signatures
Majority: U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER]
- EF88: MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1]
- CDX40 (ELR-40): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1]
- L115A3 (L115): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>WB-local[2fea847d]
- SV98M (SV-98): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>WB-local[2fea847d]
- BREN3 (BROD 3): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1]
- MSBSGROTB (GRT-BC): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>WB-local[2fea847d]
- RPKM: MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>WB-local[2fea847d]
- RagingHunter (M44): MISSING U_WPM_BRL_Extended_W15>WPM_BRL_Extended_W15[UNCAPTURED_WB_MODIFIER] | EXTRA U_WPM_BRL_Extended_W15>WB-local[2fea847d]

### BTM_BottomRail/BTM_Bottom_Rail: 46 weapons, majority 46, 1 distinct signatures
Majority: (no weapon-modifier effects)

### MZL_NoMuzzle: 46 weapons, majority 46, 1 distinct signatures
Majority: (no weapon-modifier effects)

### ERG_Ergonomic: 44 weapons, majority 44, 1 distinct signatures
Majority: (no weapon-modifier effects)

### MZL_KVPMachLinearComp: 44 weapons, majority 44, 1 distinct signatures
Majority: U_WPM_MZL_LinearComp_W10>GS:GRM_RecoilConversion_MZL_P10[bb838ff6]; U_WPM_MZL_LinearComp_W10>WME_MuzzleVFX_05_P00[d189fbaa]

### SCA_SecondarySight: 44 weapons, majority 44, 1 distinct signatures
Majority: (no weapon-modifier effects)

### MZL_MagnusRR: 43 weapons, majority 42, 2 distinct signatures
Majority: U_WPM_MZL_HybridSuppressor03_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_HybridSuppressor03_W25>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor03_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor03_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_HybridSuppressor03_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_HybridSuppressor03_W25>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_HybridSuppressor03_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_HybridSuppressor03_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_HybridSuppressor03_W25>WME_WSway_M05[2fea847d]; U_WPM_MZL_HybridSuppressor03_W25>WPM_MZL_HybridSuppressor03_W30[03db7a68]; U_WPM_MZL_HybridSuppressor03_W25>WPM_MZL_HybridSuppressor03_W30[4aac041b]
- MRGGA (Mk 24): EXTRA U_WPM_MZL_HybridSuppressor03_W25>GS:GID_ADSTime_MZL_M10[bb7f4ea1]

### MZL_MagnusRRK: 43 weapons, majority 42, 2 distinct signatures
Majority: U_WPM_MZL_HybridSuppressor01_W40>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor01_W40>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor01_W40>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_HybridSuppressor01_W40>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_HybridSuppressor01_W40>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_HybridSuppressor01_W40>WME_SuppressedSFX_P05[96bab3b8]
- MRGGA (Mk 24): EXTRA U_WPM_MZL_HybridSuppressor01_W40>GS:GID_ADSTime_MZL_M10[bb7f4ea1]

### MZL_MagnusRRS: 43 weapons, majority 42, 2 distinct signatures
Majority: U_WPM_MZL_HybridSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_HybridSuppressor02_W30>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_HybridSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_HybridSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_HybridSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_HybridSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- MRGGA (Mk 24): EXTRA U_WPM_MZL_HybridSuppressor02_W30>GS:GID_ADSTime_MZL_M10[bb7f4ea1]

### RGT_RightRail: 43 weapons, majority 43, 1 distinct signatures
Majority: (no weapon-modifier effects)

### BRL_LightBarrel: 42 weapons, majority 41, 2 distinct signatures
Majority: U_WPM_BRL_Fluted_W20>GS:GDM_Array_ADSMoveDispersion_BRL_P10[743a3ce0]; U_WPM_BRL_Fluted_W20>GS:GID_ADSTime_BRL_P10[bb7f4ea1]; U_WPM_BRL_Fluted_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BRL_Fluted_W20>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BRL_Fluted_W20>WME_DynamicPivot_P10[c42bd53b]
- G3A4 (AK4D): MISSING U_WPM_BRL_Fluted_W20>GS:GDM_Array_ADSMoveDispersion_BRL_P10[743a3ce0] | MISSING U_WPM_BRL_Fluted_W20>GS:GID_ADSTime_BRL_P10[bb7f4ea1] | MISSING U_WPM_BRL_Fluted_W20>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_BRL_Fluted_W20>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_BRL_Fluted_W20>WME_DynamicPivot_P10[c42bd53b]

### TOP_TopRail: 42 weapons, majority 42, 1 distinct signatures
Majority: (no weapon-modifier effects)

### BTM_ACEModule: 41 weapons, majority 41, 1 distinct signatures
Majority: U_WPM_BTM_Actuated_W10>WPM_BTM_Actuated_W10[28d25398]; U_WPM_BTM_Actuated_W10>WPM_BTM_Actuated_W10[2fea847d]; U_WPM_BTM_Actuated_W10>WPM_BTM_Actuated_W10[c42bd53b]

### BTM_Magpul_AFG2/BTM_MagpulAFG2: 41 weapons, majority 39, 2 distinct signatures
Majority: U_WPM_BTM_Fast03_W30>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Fast03_W30>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_Fast03_W30>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_Fast03_W30>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_Fast03_W30>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_Fast03_W30>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_Fast03_W30>WME_Draw_Sprint_P05[03db7a68]; U_WPM_BTM_Fast03_W30>WME_DynamicPivot_M10[c42bd53b]
- MRGGA (Mk 24): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3}
- PKM (Z84M): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3}

### BTM_Troy: 40 weapons, majority 40, 1 distinct signatures
Majority: U_WPM_BTM_HandStopRifle_W15>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_HandStopRifle_W15>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_HandStopRifle_W15>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_HandStopRifle_W15>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_HandStopRifle_W15>WME_Draw_Sprint_P05[03db7a68]

### BTM_BT_Grippod_QD/BTM_BTGrippodQD: 38 weapons, majority 9, 10 distinct signatures
Majority: U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]; U_WPM_BTM_GripPod02_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_GripPod02_W30>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]; U_WPM_BTM_GripPod02_W30>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_GripPod02_W30>WME_BipodTag[936532d0]; U_WPM_BTM_GripPod02_W30>WME_EnableMountUp[d79973ba]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_50_BTM_Bipod
- ACE32 (NVO-228E): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- G3A4 (AK4D): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- M16A3 (M16A4): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3}
- Tavor7 (TR-7): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- AK205 (AK-205): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- HK417A2 (M417 A2): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- M4A1: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_45_BTM_Bipod
- QBZ192 (QBZ-192): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_45_BTM_Bipod
- SCARSC (SOR-300SC): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- XM7 (M277): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- ARADMR (LMR27): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M39EMR: MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MSBSGROTCPS (GRT-CPS): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- SVCh (SVK-8.6): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- SVDM: MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M240L: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- M250: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- M60E6 (M/60): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- MG5 (M121 A2): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- RPKM: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- EF88: CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MRGGA (Mk 24): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- BREN3 (BROD 3): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- DEVGRU: CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- VSSM: CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- PKM (Z84M): CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3} | MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_50_BTM_Bipod | CHANGED GS:GRM_Recoil_BTM_P20[bb838ff6]: asset GS:GRM_Recoil_BTM_P20->GS:GRM_Recoil_BTM_P30; operands {6b84de87.22ce7cf3.4692836a: 2->3, 7b609515.22ce7cf3.4692836a: 2->3}
- DP12 (DB-12): MISSING U_WPM_BTM_GripPod02_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_GripPod02_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]

### BTM_Magpul_AFG/BTM_MagpulAFG: 38 weapons, majority 37, 2 distinct signatures
Majority: U_WPM_BTM_Fast02_W25>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_Fast02_W25>GS:GRM_Recoil_BTM_P10[bb838ff6]; U_WPM_BTM_Fast02_W25>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_Fast02_W25>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_Fast02_W25>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_Fast02_W25>WME_Draw_Sprint_P05[03db7a68]
- 185KSK (18.5KS-K): EXTRA U_WPM_BTM_Fast02_W25>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]

### SCP_Tango6T: 38 weapons, majority 38, 1 distinct signatures
Majority: (no weapon-modifier effects)

### BTM_GPS2: 37 weapons, majority 12, 7 distinct signatures
Majority: U_WPM_BTM_GripPod03_W30>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_GripPod03_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_GripPod03_W30>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_GripPod03_W30>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]; U_WPM_BTM_GripPod03_W30>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_GripPod03_W30>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_GripPod03_W30>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_GripPod03_W30>WME_BipodTag[936532d0]; U_WPM_BTM_GripPod03_W30>WME_DynamicPivot_M10[c42bd53b]; U_WPM_BTM_GripPod03_W30>WME_EnableMountUp[d79973ba]
- 6p67 (KORD 6P67): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_50_BTM_Bipod[5e5631ff]
- ACE32 (NVO-228E): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- G36 (B36A4): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- G3A4 (AK4D): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- HK433 (M433): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- L85A3: EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M16A3 (M16A4): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- SCARL (SOR-556 Mk2): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- Tavor7 (TR-7): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- VHS2 (VCR-2): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- HK417A2 (M417 A2): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M4A1: EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_45_BTM_Bipod[5e5631ff]
- QBZ192 (QBZ-192): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_45_BTM_Bipod[5e5631ff]
- XM7 (M277): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M240L: EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- M250: EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M27IAR (DRS-IAR): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M60E6 (M/60): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- MG4K (M123K): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MG5 (M121 A2): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- Minimi (L110): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- RPK74M (RPK-74M): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_50_BTM_Bipod[5e5631ff]
- RPKM: EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- Ultimax (KTS100 MK8): EXTRA U_WPM_BTM_GripPod03_W30>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- DP12 (DB-12): MISSING U_WPM_BTM_GripPod03_W30>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]

### BTM_QBZ_Grippod/BTM_QBZGrippod: 37 weapons, majority 12, 7 distinct signatures
Majority: U_WPM_BTM_GripPod01_W20>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_GripPod01_W20>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_GripPod01_W20>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]; U_WPM_BTM_GripPod01_W20>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_GripPod01_W20>WME_BipodTag[936532d0]; U_WPM_BTM_GripPod01_W20>WME_EnableMountUp[d79973ba]
- 6p67 (KORD 6P67): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_50_BTM_Bipod[5e5631ff]
- ACE32 (NVO-228E): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- G36 (B36A4): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- G3A4 (AK4D): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- HK433 (M433): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- L85A3: EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M16A3 (M16A4): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- SCARL (SOR-556 Mk2): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- Tavor7 (TR-7): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- VHS2 (VCR-2): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- HK417A2 (M417 A2): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M4A1: EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_45_BTM_Bipod[5e5631ff]
- QBZ192 (QBZ-192): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_45_BTM_Bipod[5e5631ff]
- XM7 (M277): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M240L: EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- M250: EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- M27IAR (DRS-IAR): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M60E6 (M/60): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- MG4K (M123K): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MG5 (M121 A2): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_30_BTM_Bipod[5e5631ff]
- Minimi (L110): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- RPK74M (RPK-74M): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_50_BTM_Bipod[5e5631ff]
- RPKM: EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff]
- Ultimax (KTS100 MK8): EXTRA U_WPM_BTM_GripPod01_W20>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- DP12 (DB-12): MISSING U_WPM_BTM_GripPod01_W20>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]

### SCP_TrijiconVCOG: 37 weapons, majority 37, 1 distinct signatures
Majority: (no weapon-modifier effects)

### MAG_Compact1: 36 weapons, majority 9, 27 distinct signatures
Majority: U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]; U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1]; U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc]; U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac]; U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294]; U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398]; U_WPM_MAG_020Cpt1_556_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_MAG_020Cpt1_556_W05>WME_Draw_Sprint_P05[03db7a68]; U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b]; U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]; U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d]; U_WPM_MAG_020Cpt1_556_W05>WPM_MAG_020Cpt1_556_W05[e7d2410a]
- ACE32 (NVO-228E): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_020Cpt1_762AK_W05; operands {4614adfe: 10->9}
- G3A4 (AK4D): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_G3A4_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_G3A4_W05; operands {4614adfe: 10->9, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- MRGGA (Mk 24): CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_MRGGA_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_MRGGA_W05; operands {7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b]
- Tavor7 (TR-7): CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_762N_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_762N_W05; operands {4614adfe: 10->9, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b]
- DesertTechHTI (Interdictor): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_003Cpt1_DesertTechHTI_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_003Cpt1_DesertTechHTI_W05; operands {4614adfe: 10->11, 7f22bfb4: 21->4} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- MRAD (PSR): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_007Cpt1_MRAD_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_007Cpt1_MRAD_W05; operands {4614adfe: 10->5, 7f22bfb4: 21->8} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- HK417A2 (M417 A2): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_HK417A2_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_010Cpt1_HK417A2_W05; operands {4614adfe: 10->13, 7f22bfb4: 21->11}
- SIG553R (SG 553R): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_762AK_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_020Cpt1_762AK_W05; operands {4614adfe: 10->9}
- XM7 (M277): CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_XM7_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_XM7_W05; operands {7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b]
- M39EMR: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_M39EMR_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_M39EMR_W05; operands {4614adfe: 10->9, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- MSBSGROTCPS (GRT-CPS): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_015Cpt1_GrotC_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_015Cpt1_GrotC_W05; operands {4614adfe: 10->11, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- SVDM: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_SVDM_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_005Cpt1_SVDM_W05; operands {4614adfe: 10->23, 7f22bfb4: 21->6}
- VSSM: CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05 | CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05; asset GS:GDM_Array_ADSMoveDispersion_MAG_P10->GS:GDM_Array_ADSMoveDispersion_MAG_P20 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05; asset WME_DynamicPivot_P10->WME_DynamicPivot_P20; operands {a4f104cc.32a99b9c: 0.75->0.5625, a4f104cc.3901db14: 0.75->0.5625, a4f104cc.42fc0f5e: 0.75->0.5625, f235e44f.32a99b9c: 0.75->0.5625, f235e44f.3901db14: 0.75->0.5625, f235e44f.42fc0f5e: 0.75->0.5625} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_010Cpt1_939_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_010Cpt1_939_W05; operands {4614adfe: 10->13, 7f22bfb4: 21->11} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- PKM (Z84M): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_100Cpt1_PKM_W05 | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_Draw_Deploy_P05[4aac041b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_Draw_Sprint_P05[03db7a68] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d] | MISSING U_WPM_MAG_020Cpt1_556_W05>WPM_MAG_020Cpt1_556_W05[e7d2410a]
- RPKM: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPKM_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_030Cpt1_RPKM_W05; operands {4614adfe: 10->7, 7f22bfb4: 21->31} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b]
- Ultimax (KTS100 MK8): CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_045Cpt1_Ultimax_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_045Cpt1_Ultimax_W05; operands {4614adfe: 10->5, 7f22bfb4: 21->45} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b]
- MP5MLI (PW5A3): CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05 | CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05; asset GS:GDM_Array_ADSMoveDispersion_MAG_P10->GS:GDM_Array_ADSMoveDispersion_MAG_P20 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05; asset WME_DynamicPivot_P10->WME_DynamicPivot_P20; operands {a4f104cc.32a99b9c: 0.75->0.5625, a4f104cc.3901db14: 0.75->0.5625, a4f104cc.42fc0f5e: 0.75->0.5625, f235e44f.32a99b9c: 0.75->0.5625, f235e44f.3901db14: 0.75->0.5625, f235e44f.42fc0f5e: 0.75->0.5625} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP5MLI_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_020Cpt1_MP5MLI_W05 | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294]
- MP7A2 (PW7A2): CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05 | CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05; asset GS:GDM_Array_ADSMoveDispersion_MAG_P10->GS:GDM_Array_ADSMoveDispersion_MAG_P20 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05; asset WME_DynamicPivot_P10->WME_DynamicPivot_P20; operands {a4f104cc.32a99b9c: 0.75->0.5625, a4f104cc.3901db14: 0.75->0.5625, a4f104cc.42fc0f5e: 0.75->0.5625, f235e44f.32a99b9c: 0.75->0.5625, f235e44f.3901db14: 0.75->0.5625, f235e44f.42fc0f5e: 0.75->0.5625} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_MP7A2_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_020Cpt1_MP7A2_W05; operands {4614adfe: 10->13} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294]
- ScorpionEvo3 (CZ3A1): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P15; operands {c427eabf: 2->3} | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_020Cpt1_ScorpionEvo3_W10; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_020Cpt1_ScorpionEvo3_W10 | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294]
- UMP40 (UMG-40): CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_UMP40_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_UMP40_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_UMP40_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_UMP40_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_UMP40_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_025Cpt1_UMP40_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->26} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d]
- 185KSK (18.5KS-K): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_004Cpt1_185KSK_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_004Cpt1_185KSK_W05; operands {7f22bfb4: 21->5} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d]
- 590A1 (M87A1): CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_006Cpt1_590A1_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_006Cpt1_590A1_W05; operands {4614adfe: 10->6, 7f22bfb4: 21->6, bd024e1d: -1->99} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d]
- M1014: CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_005Cpt1_M1014_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_005Cpt1_M1014_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->5, bd024e1d: -1->99} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d]
- M60E6 (M/60): CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_050Cpt1_M60E6_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_050Cpt1_M60E6_W05; operands {4614adfe: 10->3, 7f22bfb4: 21->50} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_050Cpt1_M60E6_W05>WPM_MAG_050Cpt1_M60E6_W05[7d916d6b]
- RPK74M (RPK-74M): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_030Cpt1_RPK74M_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_030Cpt1_RPK74M_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->31} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_030Cpt1_RPKM_W05>-[NO_WB_GS_MATCH]
- PP19 (PP-19): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05 | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_025Cpt1_PP19_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_025Cpt1_PP19_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->26} | MISSING U_WPM_MAG_020Cpt1_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_CSway_P05[28d25398] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_WSway_P05[2fea847d] | EXTRA U_WPM_MAG_025Cpt1_UMP40_W05>-[NO_WB_GS_MATCH]
- CDX40 (ELR-40): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_CSway_P05[28d25398]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_WSway_P05[2fea847d]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WPM_MAG_020Cpt1_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt1_556_W05->U_WPM_MAG_001Cpt1_CDX40_W05; asset WPM_MAG_020Cpt1_556_W05->WPM_MAG_001Cpt1_CDX40_W05; operands {4614adfe: 10->49, 7f22bfb4: 21->1} | MISSING U_WPM_MAG_020Cpt1_556_W05>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[0e676037] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[7d916d6b] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[acc96a6e] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[b1afeb65] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[d11a23a2] | EXTRA U_WPM_MAG_001Cpt1_CDX40_W05>WPM_MAG_001Cpt1_CDX40_W05[e85fff64]

### MZL_SFWarcomp: 36 weapons, majority 36, 1 distinct signatures
Majority: U_WPM_MZL_FlashCompensator_W15>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_FlashCompensator_W15>WME_MuzzleVFX_03_P00[d189fbaa]; U_WPM_MZL_FlashCompensator_W15>WME_SpotRange_3D_P10[0045e7fa]

### ERG_Improved_Mag_Catch/ERG_ImprovedMagCatch: 35 weapons, majority 34, 2 distinct signatures
Majority: U_WPM_ERG_ImprovedMagCatch_W05>WME_ReloadSpeedSmall_P05[9705264b]
- M60E6 (M/60): MISSING U_WPM_ERG_ImprovedMagCatch_W05>WME_ReloadSpeedSmall_P05[9705264b]

### RGT_SF300: 34 weapons, majority 4, 29 distinct signatures
Majority: U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]
- M16A3 (M16A4): EXTRA U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- VHS2 (VCR-2): EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- DesertTechHTI (Interdictor): EXTRA U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- BREN3 (BROD 3): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b]
- M27IAR (DRS-IAR): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b]
- G36 (B36A4): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- HK433 (M433): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- L85A3: EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SCARL (SOR-556 Mk2): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MiniFix (Mini Scout): EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- XM7 (M277): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M250: EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A50_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- Ultimax (KTS100 MK8): EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- APC10 (SCW-10): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A50_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- Tavor7 (TR-7): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SV98M (SV-98): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- HK417A2 (M417 A2): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M4A1: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MSBSGROTB (GRT-BC): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- QBZ192 (QBZ-192): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SCARSC (SOR-300SC): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- APDW (SL9): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MPX (SGX): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- P90 (USG-90): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A55_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- Vector (KV9): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MRAD (PSR): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- ARADMR (LMR27): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]

### RGT_TL_MissionLight/RGT_TLMissionLight: 34 weapons, majority 9, 15 distinct signatures
Majority: U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b]; U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]; U_WPM_RGT_Flashlight01_W10>WPM_RGT_Flashlight_W10[98c02a2b]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A50_RGT_P10
- M16A3 (M16A4): MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- Tavor7 (TR-7): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10
- DesertTechHTI (Interdictor): MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- DEVGRU: MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- HK417A2 (M417 A2): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10
- M4A1: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- MSBSGROTB (GRT-BC): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- QBZ192 (QBZ-192): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- SCARSC (SOR-300SC): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10
- APC10 (SCW-10): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10
- APDW (SL9): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- MPX (SGX): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- P90 (USG-90): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A55_RGT_P10
- RSAR999 (RSPR): MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- Vector (KV9): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- MRAD (PSR): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff]
- MiniFix (Mini Scout): MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff]
- ARADMR (LMR27): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A50_RGT_P10 | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff]
- EF88: MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- MRGGA (Mk 24): MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- SV98M (SV-98): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff]
- VHS2 (VCR-2): MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b]

### TOP_DBAL-A3/TOP_DBALA3: 33 weapons, majority 33, 1 distinct signatures
Majority: U_WPM_TOP_50mWGreen_W20>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0]; U_WPM_TOP_50mWGreen_W20>WPM_TOP_50mWGreen_W20[98c02a2b]

### TOP_Mepro_Sting/TOP_MeproSting: 33 weapons, majority 33, 1 distinct signatures
Majority: U_WPM_TOP_50mWBlue_W20>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_50mWBlue_W20>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_50mWBlue_W20>WME_DynamicPivot_P10[c42bd53b]; U_WPM_TOP_50mWBlue_W20>WPM_TOP_50mWBlue_W20[98c02a2b]

### TOP_Perst4: 33 weapons, majority 32, 2 distinct signatures
Majority: U_WPM_TOP_5mWRed_W10>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_5mWRed_W10>WPM_TOP_5mWRed_W10[98c02a2b]
- SV98M (SV-98): EXTRA U_WPM_TOP_5mWRed_W10>WB-local[98c02a2b] | EXTRA U_WPM_TOP_5mWRed_W10>WB-local[b1afeb65]

### TOP_RaidXe: 33 weapons, majority 33, 1 distinct signatures
Majority: U_WPM_TOP_120mWBlue_W30>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_120mWBlue_W30>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0]; U_WPM_TOP_120mWBlue_W30>WME_DynamicPivot_P10[c42bd53b]; U_WPM_TOP_120mWBlue_W30>WPM_TOP_120mWBlue_W30[98c02a2b]

### BRL_ShortBarrel/BRL_Short_Barrel: 32 weapons, majority 26, 7 distinct signatures
Majority: U_WPM_BRL_Short_W15>GS:GDM_Array_HipDispersion_BRL_P10[743a3ce0]; U_WPM_BRL_Short_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1]; U_WPM_BRL_Short_W15>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BRL_Short_W15>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BRL_Short_W15>WME_MuzzleVelocity_M05[3e93759b]
- L115A3 (L115): EXTRA U_WPM_BRL_Short_W15>WB-local[2fea847d]
- MiniFix (Mini Scout): MISSING U_WPM_BRL_Short_W15>GS:GID_ADSTime_BRL_P10[bb7f4ea1]
- SV98M (SV-98): EXTRA U_WPM_BRL_Short_W15>WB-local[2fea847d]
- RPK74M (RPK-74M): EXTRA U_WPM_BRL_Short_W15>WB-local[2fea847d]
- RPKM: EXTRA U_WPM_BRL_Short_W15>WB-local[2fea847d]
- RagingHunter (M44): EXTRA U_WPM_BRL_Short_W15>WB-local[2fea847d]

### ERG_RecoilBuffer: 32 weapons, majority 32, 1 distinct signatures
Majority: U_WPM_ERG_RecoilBuffer_W05>WPM_ERG_Buffer_W05[bfd4f199]; U_WPM_ERG_RecoilBuffer_W05>WPM_ERG_Buffer_W05[bfd4f199]; U_WPM_ERG_RecoilBuffer_W05>WPM_ERG_Buffer_W05[daaa7328]; U_WPM_ERG_RecoilBuffer_W05>WPM_ERG_Buffer_W05[daaa7328]

### LFT_ModuleMk3: 31 weapons, majority 5, 25 distinct signatures
Majority: U_WPM_RGT_TaclightADS_W05>WPM_RGT_TaclightADS_W05[98c02a2b]
- ACE32 (NVO-228E): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- G3A4 (AK4D): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- CDX40 (ELR-40): EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- L115A3 (L115): EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- MRAD (PSR): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MiniFix (Mini Scout): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- SV98M (SV-98): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- AK205 (AK-205): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- SIG553R (SG 553R): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- ARADMR (LMR27): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M39EMR: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- SVCh (SVK-8.6): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- SVDM: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- VSSM: EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- M240L: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M60E6 (M/60): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MG4K (M123K): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MG5 (M121 A2): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- RPKM: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MP5MLI (PW5A3): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MP7A2 (PW7A2): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- ScorpionEvo3 (CZ3A1): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- UMP40 (UMG-40): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- 185KSK (18.5KS-K): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- 590A1 (M87A1): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M1014: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]

### RGT_ANPEQ16B: 31 weapons, majority 30, 2 distinct signatures
Majority: U_WPM_TOP_50mWViolet_W10>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_50mWViolet_W10>WPM_TOP_50mWViolet_W10[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_TOP_50mWViolet_W10>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0] | MISSING U_WPM_TOP_50mWViolet_W10>WPM_TOP_50mWViolet_W10[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]

### AMO_Polymer_Case/AMO_PolymerCase: 30 weapons, majority 30, 1 distinct signatures
Majority: U_WPM_AMO_PolymerCase_W10>WME_ADSMoveSpeed_P05[303a33cc]; U_WPM_AMO_PolymerCase_W10>WME_Penetration_P05[d11a23a2]

### RGT_ModuleMk3: 30 weapons, majority 8, 21 distinct signatures
Majority: U_WPM_RGT_TaclightADS_W05>WPM_RGT_TaclightADS_W05[98c02a2b]
- 6p67 (KORD 6P67): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- G36 (B36A4): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- L85A3: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M16A3 (M16A4): EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- SCARL (SOR-556 Mk2): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- Tavor7 (TR-7): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- VHS2 (VCR-2): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- DesertTechHTI (Interdictor): EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- HK417A2 (M417 A2): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M4A1: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- MSBSGROTB (GRT-BC): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- QBZ192 (QBZ-192): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- SCARSC (SOR-300SC): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- XM7 (M277): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- M250: EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- RPK74M (RPK-74M): EXTRA U_WPM_RGT_TaclightADS_W05>MPDarkness_WPM_RGT_TaclightADS_W05[98c02a2b]
- Ultimax (KTS100 MK8): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- APC10 (SCW-10): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- APDW (SL9): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- P90 (USG-90): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- Vector (KV9): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- DP12 (DB-12): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]

### TOP_ANPEQ16B: 30 weapons, majority 30, 1 distinct signatures
Majority: U_WPM_TOP_50mWViolet_W10>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_50mWViolet_W10>WPM_TOP_50mWViolet_W10[98c02a2b]

### MAG_Extended2: 29 weapons, majority 11, 17 distinct signatures
Majority: U_WPM_MAG_040Ext2_556_W25>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_040Ext2_556_W25>WPM_MAG_040Ext2_556_W25[e7d2410a]
- 6p67 (KORD 6P67): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_545_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_545_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_040Ext2_545_W25; operands {4614adfe: 6->7}
- ACE32 (NVO-228E): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_762AK_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_762AK_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_040Ext2_762AK_W25
- EF88: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_042Ext2_556_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_042Ext2_556_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_042Ext2_556_W25; operands {7f22bfb4: 41->43}
- MRGGA (Mk 24): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_MRGGA_W40 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_MRGGA_W40; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_030Ext2_MRGGA_W40; operands {7f22bfb4: 41->31}
- Tavor7 (TR-7): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_762N_W40 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_762N_W40; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_030Ext2_762N_W40; operands {4614adfe: 6->5, 7f22bfb4: 41->31}
- MiniFix (Mini Scout): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_020Ext2_MiniFix_W55 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_020Ext2_MiniFix_W55; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_020Ext2_MiniFix_W55; operands {4614adfe: 6->3, 7f22bfb4: 41->21}
- AK205 (AK-205): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_545_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_545_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_040Ext2_545_W25; operands {4614adfe: 6->7}
- SIG553R (SG 553R): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_762AK_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_040Ext2_762AK_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_040Ext2_762AK_W25
- XM7 (M277): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_XM7_W40 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_030Ext2_XM7_W40; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_030Ext2_XM7_W40; operands {7f22bfb4: 41->31}
- ARADMR (LMR27): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_020Ext2_ARADMR_W45 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_020Ext2_ARADMR_W45; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_020Ext2_ARADMR_W45; operands {4614adfe: 6->8, 7f22bfb4: 41->21}
- RPK74M (RPK-74M): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_060Ext2_RPK74M_W30 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_060Ext2_RPK74M_W30; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_060Ext2_RPK74M_W30; operands {4614adfe: 6->4, 7f22bfb4: 41->61}
- RPKM: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_075Ext2_RPKM_W50 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_075Ext2_RPKM_W50; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_075Ext2_RPKM_W50; operands {4614adfe: 6->3, 7f22bfb4: 41->76}
- APC10 (SCW-10): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_025Ext2_APC10_W45 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_025Ext2_APC10_W45; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_025Ext2_APC10_W45; operands {4614adfe: 6->7, 7f22bfb4: 41->26}
- MPX (SGX): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_041Ext2_MPX_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_041Ext2_MPX_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_041Ext2_MPX_W25; operands {7f22bfb4: 41->42}
- RSAR999 (RSPR): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_028Ext2_RSAR999_W25 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_028Ext2_RSAR999_W25; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_028Ext1_RSAR999_W25; operands {4614adfe: 6->7, 7f22bfb4: 41->29}
- Vector (KV9): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_027Ext2_Vector_W45 | CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_027Ext2_Vector_W45; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_027Ext1_Vector_W45; operands {4614adfe: 6->8, 7f22bfb4: 41->28}
- M240L: CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_100Ext2_M240L_W20; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_100Ext2_M240L_W20; operands {4614adfe: 6->2, 7f22bfb4: 41->100} | MISSING U_WPM_MAG_040Ext2_556_W25>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_100Ext2_M240L_W20>WPM_MAG_100Ext2_M240L_W20[7d916d6b]
- G22 (GGH-22): CHANGED WPM_MAG_040Ext2_556_W25[e7d2410a]: selector U_WPM_MAG_040Ext2_556_W25->U_WPM_MAG_022Ext2_G22_W30; asset WPM_MAG_040Ext2_556_W25->WPM_MAG_022Ext2_G22_W30; operands {4614adfe: 6->3, 7f22bfb4: 41->23} | MISSING U_WPM_MAG_040Ext2_556_W25>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_022Ext2_G22_W30>WME_Draw_Deploy_M05[4aac041b] | EXTRA U_WPM_MAG_022Ext2_G22_W30>WME_Draw_Sprint_M05[03db7a68]

### ERG_MatchTrigger: 28 weapons, majority 23, 5 distinct signatures
Majority: U_WPM_ERG_MatchTrigger_W15>WB-local[10713bed]
- VHS2 (VCR-2): CHANGED WB-local[10713bed]: operands {238b47d7.4287ef66[3].6d011165: d37fbd7e-0624-4cbf-a842-0363de40a560->c9d17854-c639-4652-80c2-6975eef5a432, 238b47d7.4287ef66[3].93dd77b9: True->False, 238b47d7.4287ef66[3].b0057325: False->True}
- M27IAR (DRS-IAR): CHANGED WB-local[10713bed]: operands {238b47d7.4287ef66[3].6d011165: d37fbd7e-0624-4cbf-a842-0363de40a560->c9d17854-c639-4652-80c2-6975eef5a432}
- HK433 (M433): MISSING U_WPM_ERG_MatchTrigger_W15>WB-local[10713bed] | EXTRA U_WPM_ERG_MatchTrigger_W15>-[NO_WB_GS_MATCH]
- DEVGRU: EXTRA U_WPM_ERG_MatchTriggerActive>GS:GBM_NoIncrease_ERG_P00[5e5631ff] | EXTRA U_WPM_ERG_MatchTriggerActive>GS:GRM_MatchTrigger_ERG_P15[bb838ff6]
- RagingHunter (M44): MISSING U_WPM_ERG_MatchTrigger_W15>WB-local[10713bed] | EXTRA U_WPM_ERG_MatchTrigger_W15>-[NO_WB_GS_MATCH]

### MZL_RSMicroTactical: 28 weapons, majority 22, 3 distinct signatures
Majority: U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398]; U_WPM_MZL_Brake1_W05>WME_MuzzleVFX_08_P00[d189fbaa]; U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6]
- FiveSeven (ES 5.7): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10 | CHANGED WME_MuzzleVFX_08_P00[d189fbaa]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10; asset WME_MuzzleVFX_08_P00->WME_MuzzleVFX_09_P00; operands {ed7f6c09: 8->9} | MISSING U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- G22 (GGH-22): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10 | CHANGED WME_MuzzleVFX_08_P00[d189fbaa]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10; asset WME_MuzzleVFX_08_P00->WME_MuzzleVFX_09_P00; operands {ed7f6c09: 8->9} | MISSING U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- M18 (P18): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10 | CHANGED WME_MuzzleVFX_08_P00[d189fbaa]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10; asset WME_MuzzleVFX_08_P00->WME_MuzzleVFX_09_P00; operands {ed7f6c09: 8->9} | MISSING U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- M45A1: CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10 | CHANGED WME_MuzzleVFX_08_P00[d189fbaa]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10; asset WME_MuzzleVFX_08_P00->WME_MuzzleVFX_09_P00; operands {ed7f6c09: 8->9} | MISSING U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- Skorpion (vz. 61): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10 | CHANGED WME_MuzzleVFX_08_P00[d189fbaa]: selector U_WPM_MZL_Brake1_W05->U_WPM_MZL_Brake2_W10; asset WME_MuzzleVFX_08_P00->WME_MuzzleVFX_09_P00; operands {ed7f6c09: 8->9} | MISSING U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]

### LFT_SF300: 27 weapons, majority 3, 25 distinct signatures
Majority: U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]; U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- PKM (Z84M): MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- PP19 (PP-19): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b]
- MSBSGROTCPS (GRT-CPS): MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MG4K (M123K): MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MG5 (M121 A2): MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- Minimi (L110): MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- ScorpionEvo3 (CZ3A1): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- ACE32 (NVO-228E): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- G3A4 (AK4D): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- AK205 (AK-205): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A55_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SIG553R (SG 553R): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M240L: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M60E6 (M/60): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- RPKM: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MP5MLI (PW5A3): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- MP7A2 (PW7A2): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A60_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- UMP40 (UMG-40): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M2010ESR: MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M39EMR: MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S3_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SVCh (SVK-8.6): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- SVDM: MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S3_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- 185KSK (18.5KS-K): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- 590A1 (M87A1): MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]
- M1014: MISSING U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_FlashLight02_W15>MPDarkness_WPM_RGT_TaclightHIP_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_FlashLight02_W15>SP_WPM_RGT_Flashlight02_W15[98c02a2b] | EXTRA U_WPM_RGT_FlashLight02_W15>WB-local[98c02a2b]

### LFT_TL_MissionLight/LFT_TLMissionLight: 27 weapons, majority 4, 14 distinct signatures
Majority: U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b]; U_WPM_RGT_Flashlight01_W10>WPM_RGT_Flashlight_W10[98c02a2b]
- MG4K (M123K): EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- Minimi (L110): EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- PP19 (PP-19): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10
- ACE32 (NVO-228E): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- G3A4 (AK4D): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- AK205 (AK-205): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A55_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- SIG553R (SG 553R): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- M240L: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- M60E6 (M/60): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- RPKM: CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A35_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- MP5MLI (PW5A3): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- MP7A2 (PW7A2): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A60_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- UMP40 (UMG-40): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- M2010ESR: MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- M39EMR: MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S3_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- SVCh (SVK-8.6): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- SVDM: MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S3_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- 185KSK (18.5KS-K): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S2_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- 590A1 (M87A1): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- M1014: MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S1_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]
- MG5 (M121 A2): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A30_RGT_P10 | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b]
- MSBSGROTCPS (GRT-CPS): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b]
- ScorpionEvo3 (CZ3A1): CHANGED GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A40_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b]

### BTM_HFGA: 26 weapons, majority 24, 2 distinct signatures
Majority: U_WPM_BTM_Fast01_W25>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_Fast01_W25>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_Fast01_W25>GS:GRM_Recoil_BTM_P10[bb838ff6]; U_WPM_BTM_Fast01_W25>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_Fast01_W25>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_Fast01_W25>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_Fast01_W25>WME_Draw_Sprint_P05[03db7a68]; U_WPM_BTM_Fast01_W25>WME_DynamicPivot_M10[c42bd53b]
- MRGGA (Mk 24): CHANGED GS:GRM_Recoil_BTM_P10[bb838ff6]: asset GS:GRM_Recoil_BTM_P10->GS:GRM_Recoil_BTM_P20; operands {6b84de87.22ce7cf3.4692836a: 1->2, 7b609515.22ce7cf3.4692836a: 1->2}
- PKM (Z84M): CHANGED GS:GRM_Recoil_BTM_P10[bb838ff6]: asset GS:GRM_Recoil_BTM_P10->GS:GRM_Recoil_BTM_P20; operands {6b84de87.22ce7cf3.4692836a: 1->2, 7b609515.22ce7cf3.4692836a: 1->2}

### RGT_DBAL-A3/RGT_DBALA3: 26 weapons, majority 26, 1 distinct signatures
Majority: U_WPM_TOP_50mWGreen_W20>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0]; U_WPM_TOP_50mWGreen_W20>WPM_TOP_50mWGreen_W20[98c02a2b]

### RGT_Mepro_Sting/RGT_MeproSting: 26 weapons, majority 26, 1 distinct signatures
Majority: U_WPM_TOP_50mWBlue_W20>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_50mWBlue_W20>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_50mWBlue_W20>WME_DynamicPivot_P10[c42bd53b]; U_WPM_TOP_50mWBlue_W20>WPM_TOP_50mWBlue_W20[98c02a2b]

### RGT_Perst4: 26 weapons, majority 26, 1 distinct signatures
Majority: U_WPM_TOP_5mWRed_W10>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_5mWRed_W10>WPM_TOP_5mWRed_W10[98c02a2b]

### RGT_RaidXe: 26 weapons, majority 26, 1 distinct signatures
Majority: U_WPM_TOP_120mWBlue_W30>GS:GDM_Array_ADSMoveDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_120mWBlue_W30>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0]; U_WPM_TOP_120mWBlue_W30>WME_DynamicPivot_P10[c42bd53b]; U_WPM_TOP_120mWBlue_W30>WPM_TOP_120mWBlue_W30[98c02a2b]

### AMO_BallisticTip: 24 weapons, majority 24, 1 distinct signatures
Majority: U_WPM_AMO_BallisticTip_W20>WME_Protection_P20[e85fff64]

### MAG_Compact2: 24 weapons, majority 9, 15 distinct signatures
Majority: U_WPM_MAG_020Cpt2_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]; U_WPM_MAG_020Cpt2_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1]; U_WPM_MAG_020Cpt2_556_W05>WME_ADSMoveSpeed_P10[303a33cc]; U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_Anim_P10[016623ac]; U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_FOV_P10[104c2294]; U_WPM_MAG_020Cpt2_556_W05>WME_CSway_P10[28d25398]; U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b]; U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68]; U_WPM_MAG_020Cpt2_556_W05>WME_DynamicPivot_P10[c42bd53b]; U_WPM_MAG_020Cpt2_556_W05>WME_WSway_P10[2fea847d]; U_WPM_MAG_020Cpt2_556_W05>WPM_MAG_020Cpt2_556_W05[e7d2410a]
- ACE32 (NVO-228E): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_020Cpt2_762AK_W05; operands {4614adfe: 10->9}
- SIG553R (SG 553R): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05 | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt2_762AK_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_020Cpt2_762AK_W05; operands {4614adfe: 10->9}
- PP19 (PP-19): CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05 | CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05; asset GS:GDM_Array_ADSMoveDispersion_MAG_P10->GS:GDM_Array_ADSMoveDispersion_MAG_P20 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P15; operands {c427eabf: 2->3} | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_020Cpt3_PP19_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_020Cpt3_PP19_W05 | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68]
- 590A1 (M87A1): CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_007Cpt2_590A1_W05 | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_007Cpt2_590A1_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_007Cpt2_590A1_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_007Cpt2_590A1_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_007Cpt2_590A1_W05; operands {4614adfe: 10->5, 7f22bfb4: 21->7, bd024e1d: -1->99} | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_CSway_P10[28d25398] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_WSway_P10[2fea847d]
- M1014: CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05 | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05 | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_M1014_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_005Cpt2_M1014_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->5, bd024e1d: -1->4} | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_CSway_P10[28d25398] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_DynamicPivot_P10[c42bd53b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_WSway_P10[2fea847d]
- G3A4 (AK4D): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_G3A4_W10; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_015Cpt2_G3A4_W10; operands {4614adfe: 10->9, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68] | EXTRA U_WPM_MAG_015Cpt2_G3A4_W10>WME_ReloadSpeedRegular_P10[9705264b]
- Tavor7 (TR-7): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P15; operands {c427eabf: 2->3} | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WME_Draw_Deploy_P10->WME_Draw_Deploy_P05; operands {9540bd8e: 2->1} | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WME_Draw_Sprint_P10->WME_Draw_Sprint_P05; operands {9540bd8e: 2->1} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_762N_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_010Cpt2_762N_W05; operands {4614adfe: 10->13, 7f22bfb4: 21->11} | EXTRA U_WPM_MAG_010Cpt2_762N_W05>WME_ReloadSpeedRegular_P10[9705264b]
- M39EMR: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_015Cpt2_M39EMR_W10; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_015Cpt2_M39EMR_W05; operands {4614adfe: 10->9, 7f22bfb4: 21->16} | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68] | EXTRA U_WPM_MAG_015Cpt2_M39EMR_W10>WME_ReloadSpeedRegular_P10[9705264b]
- VSSM: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WME_Draw_Deploy_P10->WME_Draw_Deploy_P05; operands {9540bd8e: 2->1} | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WME_Draw_Sprint_P10->WME_Draw_Sprint_P05; operands {9540bd8e: 2->1} | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WME_DynamicPivot_P10->WME_DynamicPivot_P20; operands {a4f104cc.32a99b9c: 0.75->0.5625, a4f104cc.3901db14: 0.75->0.5625, a4f104cc.42fc0f5e: 0.75->0.5625, f235e44f.32a99b9c: 0.75->0.5625, f235e44f.3901db14: 0.75->0.5625, f235e44f.42fc0f5e: 0.75->0.5625} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_010Cpt2_939_W10; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_010Cpt2_939_W10; operands {4614adfe: 10->13, 7f22bfb4: 21->11} | EXTRA U_WPM_MAG_010Cpt2_939_W10>WME_ReloadSpeedRegular_P10[9705264b]
- RPKM: CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPKM_W10; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_030Cpt2_RPKM_W10; operands {4614adfe: 10->7, 7f22bfb4: 21->31} | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68] | EXTRA U_WPM_MAG_030Cpt2_RPKM_W10>WME_ReloadSpeedRegular_P10[9705264b]
- Ultimax (KTS100 MK8): CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_050Cpt2_Ultimax_W05; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_050Cpt2_Ultimax_W05; asset WME_Draw_Deploy_P10->WME_Draw_Deploy_P05; operands {9540bd8e: 2->1} | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_050Cpt2_Ultimax_W05; asset WME_Draw_Sprint_P10->WME_Draw_Sprint_P05; operands {9540bd8e: 2->1} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_050Cpt2_Ultimax_W05; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_050Cpt2_Ultimax_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_050Cpt2_Ultimax_W05; operands {4614adfe: 10->4, 7f22bfb4: 21->50} | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_DynamicPivot_P10[c42bd53b] | EXTRA U_WPM_MAG_050Cpt2_Ultimax_W05>WME_ReloadSpeedRegular_P10[9705264b]
- UMP40 (UMG-40): CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_025Cpt2_UMP40_W15 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_025Cpt2_UMP40_W15 | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_025Cpt2_UMP40_W15; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_025Cpt2_UMP40_W15; operands {4614adfe: 10->8, 7f22bfb4: 21->26} | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_020Cpt2_556_W05>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_Anim_P10[016623ac] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_ADSTime_FOV_P10[104c2294] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_CSway_P10[28d25398] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_WSway_P10[2fea847d] | EXTRA U_WPM_MAG_025Cpt2_UMP40_W15>WME_ReloadSpeedRegular_P10[9705264b]
- 185KSK (18.5KS-K): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05; asset WME_Draw_Deploy_P10->WME_Draw_Deploy_P05; operands {9540bd8e: 2->1} | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05; asset WME_Draw_Sprint_P10->WME_Draw_Sprint_P05; operands {9540bd8e: 2->1} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_004Cpt2_185KSK_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_004Cpt2_185KSK_W05; operands {7f22bfb4: 21->5} | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_CSway_P10[28d25398] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_WSway_P10[2fea847d] | EXTRA U_WPM_MAG_004Cpt2_185KSK_W05>WME_ReloadSpeedRegular_P10[9705264b]
- CDX40 (ELR-40): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_005Cpt2_CDX40_W05; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_005Cpt2_CDX40_W05; operands {4614adfe: 10->8, 7f22bfb4: 21->6} | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Deploy_P10[4aac041b] | MISSING U_WPM_MAG_020Cpt2_556_W05>WME_Draw_Sprint_P10[03db7a68] | EXTRA U_WPM_MAG_005Cpt2_CDX40_W05>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_005Cpt2_CDX40_W05>WPM_MAG_005Cpt2_CDX40_W05[0e676037]
- RPK74M (RPK-74M): CHANGED GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED GS:GID_ADSTime_MAG_P10[bb7f4ea1]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED WME_DynamicPivot_P10[c42bd53b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10 | CHANGED WME_CSway_P10[28d25398]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10; asset WME_CSway_P10->WME_CSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WME_Draw_Deploy_P10[4aac041b]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10; asset WME_Draw_Deploy_P10->WME_Draw_Deploy_P05; operands {9540bd8e: 2->1} | CHANGED WME_Draw_Sprint_P10[03db7a68]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10; asset WME_Draw_Sprint_P10->WME_Draw_Sprint_P05; operands {9540bd8e: 2->1} | CHANGED WME_WSway_P10[2fea847d]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10; asset WME_WSway_P10->WME_WSway_P05; operands {56d5fa13: 0.444444->0.666667, 88ce99fa: 0.444444->0.666667, 90fd0310: 0.444444->0.666667, a7f44bd7: 0.444444->0.666667, d2e1dc19: 0.444444->0.666667, ed08b49d: 0.444444->0.666667 (+1 more)} | CHANGED WPM_MAG_020Cpt2_556_W05[e7d2410a]: selector U_WPM_MAG_020Cpt2_556_W05->U_WPM_MAG_030Cpt2_RPK74M_W10; asset WPM_MAG_020Cpt2_556_W05->WPM_MAG_030Cpt2_RPK74M_W10; operands {4614adfe: 10->8, 7f22bfb4: 21->31} | EXTRA U_WPM_MAG_030Cpt2_RPK74M_W10>WME_ReloadSpeedRegular_P10[9705264b] | EXTRA U_WPM_MAG_030Cpt2_RPKM_W10>-[NO_WB_GS_MATCH]

### BRL_HeavyBarrel/BRL_Heavy_Barrel: 23 weapons, majority 9, 7 distinct signatures
Majority: U_WPM_BRL_Heavy_W10>GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- G3A4 (AK4D): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- AK205 (AK-205): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_55_BRL_P10
- XM7 (M277): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- M240L: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- M250: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- M60E6 (M/60): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- MG5 (M121 A2): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- RPKM: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- APDW (SL9): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- MP7A2 (PW7A2): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_60_BRL_P10
- P90 (USG-90): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_55_BRL_P10
- UMP40 (UMG-40): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_45_BRL_P10

### BRL_TreatedBarrel: 20 weapons, majority 7, 7 distinct signatures
Majority: U_WPM_BRL_Treated_W20>GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]; U_WPM_BRL_Treated_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BRL_Treated_W20>WME_ADSTime_FOV_P10[104c2294]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- ACE32 (NVO-228E): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- G3A4 (AK4D): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- AK205 (AK-205): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_55_BRL_P10
- HK417A2 (M417 A2): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- QBZ192 (QBZ-192): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_45_BRL_P10
- XM7 (M277): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- APDW (SL9): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- MP5MLI (PW5A3): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- MP7A2 (PW7A2): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_60_BRL_P10
- P90 (USG-90): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_55_BRL_P10
- PP19 (PP-19): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- UMP40 (UMG-40): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_45_BRL_P10

### BTM_AtlasV8/BTM_Atlas_V8: 20 weapons, majority 5, 7 distinct signatures
Majority: U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]; U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6]; U_WPM_BTM_Bipod01_W10>WME_BipodTag[936532d0]; U_WPM_BTM_Bipod01_W10>WME_EnableMountUp[d79973ba]
- 6p67 (KORD 6P67): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_50_BTM_Bipod
- ACE32 (NVO-228E): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- G3A4 (AK4D): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- Tavor7 (TR-7): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- L115A3 (L115): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- HK417A2 (M417 A2): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- SVCh (SVK-8.6): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- M240L: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_30_BTM_Bipod
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_50_BTM_Bipod
- RPKM: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- EF88: MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]
- VSSM: MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]
- DP12 (DB-12): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]
- M2010ESR: MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]
- MRAD (PSR): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]

### RGT_LA-23: 20 weapons, majority 20, 1 distinct signatures
Majority: U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]

### TOP_LA-23: 20 weapons, majority 20, 1 distinct signatures
Majority: U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]

### MZL_Sandman-SMILSuppressor/MZL_Sandman-S_MIL_Suppressor: 18 weapons, majority 11, 4 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]
- M39EMR: EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>SP_WPM_MZL_ImprvdSuppressor01_W30[96bab3b8] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00_SP[c6c66955] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00_SP[d189fbaa] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25_SP[0045e7fa] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05_SP[96bab3b8]
- G3A4 (AK4D): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]
- HK417A2 (M417 A2): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]
- MG5 (M121 A2): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]
- G36 (B36A4): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_14_P00; operands {3f680d24: 9000->-1, ed7f6c09: 13->14} | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- HK433 (M433): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_14_P00; operands {3f680d24: 9000->-1, ed7f6c09: 13->14} | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- MG4K (M123K): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor02_W25; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_14_P00; operands {3f680d24: 9000->-1, ed7f6c09: 13->14} | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_TionMB58x24: 18 weapons, majority 16, 2 distinct signatures
Majority: U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>WME_MuzzleVFX_10_P00[d189fbaa]
- L115A3 (L115): MISSING U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6] | MISSING U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]
- MRAD (PSR): MISSING U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6] | MISSING U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]

### MAG_Extended2Fast: 17 weapons, majority 10, 6 distinct signatures
Majority: U_WPM_MAG_025Ext1Fast_762N_W25>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_025Ext1Fast_762N_W25>WME_Draw_Deploy_M05[4aac041b]; U_WPM_MAG_025Ext1Fast_762N_W25>WME_Draw_Sprint_M05[03db7a68]; U_WPM_MAG_025Ext1Fast_762N_W25>WME_ReloadSpeedRegular_P10[9705264b]; U_WPM_MAG_025Ext1Fast_762N_W25>WPM_MAG_040Ext2Fast_556_W30[e7d2410a]
- 6p67 (KORD 6P67): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_040Ext2Fast_545_W30; operands {4614adfe: 6->7}
- ACE32 (NVO-228E): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_040Ext2Fast_762AK_W30; operands {4614adfe: 6->5}
- EF88: CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_042Ext2Fast_556_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_042Ext2Fast_556_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_042Ext2Fast_556_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_042Ext2Fast_556_W30 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_042Ext2Fast_556_W30; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_042Ext2Fast_556_W30; operands {7f22bfb4: 41->43}
- MiniFix (Mini Scout): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_MiniFix_W60 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_MiniFix_W60 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_MiniFix_W60 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_MiniFix_W60 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_MiniFix_W60; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_020Ext2Fast_MiniFix_W60; operands {4614adfe: 6->3, 7f22bfb4: 41->21}
- AK205 (AK-205): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_545_W30; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_040Ext2Fast_545_W30; operands {4614adfe: 6->7}
- SIG553R (SG 553R): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_040Ext2Fast_762AK_W30; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_040Ext2Fast_762AK_W30; operands {4614adfe: 6->5}
- ARADMR (LMR27): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_ARADMR_W50 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_ARADMR_W50 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_ARADMR_W50 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_ARADMR_W50 | CHANGED WPM_MAG_040Ext2Fast_556_W30[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_762N_W25->U_WPM_MAG_020Ext2Fast_ARADMR_W50; asset WPM_MAG_040Ext2Fast_556_W30->WPM_MAG_020Ext2Fast_ARADMR_W50; operands {4614adfe: 6->8, 7f22bfb4: 41->21}

### MZL_HXQDSuppressor/MZL_HXQD_Suppressor: 17 weapons, majority 17, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]

### MZL_LANTACDragonMB: 17 weapons, majority 15, 2 distinct signatures
Majority: U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>WME_MuzzleVFX_10_P00[d189fbaa]
- M2010ESR: MISSING U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6] | MISSING U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6] | MISSING U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]

### MZL_QCherryBomb: 17 weapons, majority 16, 2 distinct signatures
Majority: U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6]; U_WPM_MZL_Compensator_W10>WME_MuzzleVFX_06_P00[d189fbaa]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6] | EXTRA U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoilBolt_Compensator_P10[bb838ff6]

### AMO_Subsonic: 16 weapons, majority 6, 4 distinct signatures
Majority: U_WPM_AMO_Subsonic>GS:GRM_Recoil_AMO_P10[bb838ff6]; U_WPM_AMO_Subsonic>WME_MuzzleVelocity_M15[3e93759b]; U_WPM_AMO_Subsonic>WME_SpotRange_2D_P10[0045e7fa]; U_WPM_AMO_Subsonic>WME_SpotRange_3D_P05[0045e7fa]; U_WPM_AMO_Subsonic>WME_SubsonicSFX_1[96bab3b8]
- APC10 (SCW-10): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MP5MLI (PW5A3): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MPX (SGX): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- ScorpionEvo3 (CZ3A1): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- Vector (KV9): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- HK417A2 (M417 A2): MISSING U_WPM_AMO_Subsonic>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_Subsonic>WPM_AMO_Subsonic_W15_HK417[3e93759b]
- P90 (USG-90): MISSING U_WPM_AMO_Subsonic>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_Subsonic>WPM_AMO_Subsonic_W15_HK417[3e93759b]
- FiveSeven (ES 5.7): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_Subsonic>GS:GRM_Recoil_AMO_P10[bb838ff6]
- G22 (GGH-22): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_Subsonic>GS:GRM_Recoil_AMO_P10[bb838ff6]
- M18 (P18): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_Subsonic>GS:GRM_Recoil_AMO_P10[bb838ff6]

### AMO_SubsonicHollowPoint: 16 weapons, majority 6, 4 distinct signatures
Majority: U_WPM_AMO_SubsonicJHP>GS:GRM_Recoil_AMO_P10[bb838ff6]; U_WPM_AMO_SubsonicJHP>WME_MuzzleVelocity_M15[3e93759b]; U_WPM_AMO_SubsonicJHP>WME_Protection_P10[e85fff64]; U_WPM_AMO_SubsonicJHP>WME_SpotRange_2D_P10[0045e7fa]; U_WPM_AMO_SubsonicJHP>WME_SpotRange_3D_P05[0045e7fa]; U_WPM_AMO_SubsonicJHP>WME_SubsonicSFX_1[96bab3b8]
- APC10 (SCW-10): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MP5MLI (PW5A3): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MPX (SGX): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- ScorpionEvo3 (CZ3A1): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- Vector (KV9): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- HK417A2 (M417 A2): MISSING U_WPM_AMO_SubsonicJHP>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_SubsonicJHP>WPM_AMO_SubsonicJHP_W35_HK417[3e93759b]
- P90 (USG-90): MISSING U_WPM_AMO_SubsonicJHP>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_SubsonicJHP>WPM_AMO_SubsonicJHP_W35_HK417[3e93759b]
- FiveSeven (ES 5.7): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicJHP>GS:GRM_Recoil_AMO_P10[bb838ff6]
- G22 (GGH-22): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicJHP>GS:GRM_Recoil_AMO_P10[bb838ff6]
- M18 (P18): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicJHP>GS:GRM_Recoil_AMO_P10[bb838ff6]

### BRL_HeavyExtendedBarrel: 16 weapons, majority 5, 8 distinct signatures
Majority: U_WPM_BRL_HeavyExtended_W10>GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]; U_WPM_BRL_HeavyExtended_W10>WME_Draw_Deploy_M05[4aac041b]; U_WPM_BRL_HeavyExtended_W10>WME_Draw_Sprint_M05[03db7a68]; U_WPM_BRL_HeavyExtended_W10>WME_MuzzleVelocity_P05[3e93759b]
- G3A4 (AK4D): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- XM7 (M277): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- M240L: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- M250: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10
- M60E6 (M/60): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- MG5 (M121 A2): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_30_BRL_P10
- APDW (SL9): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10
- P90 (USG-90): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_55_BRL_P10
- UMP40 (UMG-40): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_45_BRL_P10
- RPK74M (RPK-74M): CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_50_BRL_P10 | EXTRA U_WPM_BRL_HeavyExtended_W10>WB-local[2fea847d]
- RPKM: CHANGED GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]: asset GS:GBM_Increase_ADS_40_BRL_P10->GS:GBM_Increase_ADS_35_BRL_P10 | EXTRA U_WPM_BRL_HeavyExtended_W10>WB-local[2fea847d]

### AMO_SubsonicFrangible: 15 weapons, majority 5 (tie), 4 distinct signatures
Majority: U_WPM_AMO_SubsonicFRNG>GS:GRM_Recoil_AMO_P10[bb838ff6]; U_WPM_AMO_SubsonicFRNG>WME_HealthRegenDelay_P10[5830cb87]; U_WPM_AMO_SubsonicFRNG>WME_MuzzleVelocity_M15[3e93759b]; U_WPM_AMO_SubsonicFRNG>WME_SpotRange_2D_P10[0045e7fa]; U_WPM_AMO_SubsonicFRNG>WME_SpotRange_3D_P05[0045e7fa]; U_WPM_AMO_SubsonicFRNG>WME_SubsonicSFX_1[96bab3b8]
- APC10 (SCW-10): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MP5MLI (PW5A3): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- MPX (SGX): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- ScorpionEvo3 (CZ3A1): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- Vector (KV9): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M10; operands {6a5c4efd: 0.512->0.64}
- HK417A2 (M417 A2): MISSING U_WPM_AMO_SubsonicFRNG>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_SubsonicFRNG>WPM_AMO_SubsonicFRNG_W25_HK417[3e93759b]
- P90 (USG-90): MISSING U_WPM_AMO_SubsonicFRNG>WME_MuzzleVelocity_M15[3e93759b] | EXTRA U_WPM_AMO_SubsonicFRNG>WPM_AMO_SubsonicFRNG_W25_HK417[3e93759b]
- FiveSeven (ES 5.7): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicFRNG>GS:GRM_Recoil_AMO_P10[bb838ff6]
- G22 (GGH-22): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicFRNG>GS:GRM_Recoil_AMO_P10[bb838ff6]
- M18 (P18): CHANGED WME_MuzzleVelocity_M15[3e93759b]: asset WME_MuzzleVelocity_M15->WME_MuzzleVelocity_M05; operands {6a5c4efd: 0.512->0.8} | MISSING U_WPM_AMO_SubsonicFRNG>GS:GRM_Recoil_AMO_P10[bb838ff6]

### MZL_RotexVSuppressor: 15 weapons, majority 12, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]
- G36 (B36A4): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]
- HK433 (M433): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]
- MG4K (M123K): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_15_P00; operands {ed7f6c09: 13->15} | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]

### BTM_EVOHandstop/BTM_EVO_Handstop: 14 weapons, majority 14, 1 distinct signatures
Majority: U_WPM_BTM_HandStopPDW_W10>WPM_BTM_HandStopPDW_W10[a00773e3]

### ERG_FlaredMagwell/ERG_Flared_Magwell: 14 weapons, majority 14, 1 distinct signatures
Majority: U_WPM_ERG_FlaredMagwell_W10>WME_ADSReload_P10[5872ef92]

### ERG_RailCover: 14 weapons, majority 14, 1 distinct signatures
Majority: U_WPM_ERG_RailCover_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_ERG_RailCover_W05>WME_Draw_Sprint_P05[03db7a68]

### MZL_M4QDMAMS: 13 weapons, majority 13, 1 distinct signatures
Majority: U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6]; U_WPM_MZL_Compensator_W10>WME_MuzzleVFX_06_P00[d189fbaa]

### MZL_SilentSteelMB/MZL_SilentSteel_MB: 13 weapons, majority 13, 1 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]

### SCA_Variable2x: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCA_Variable3x: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCA_Variable4x: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_1P885: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_M7Xi: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_Mark4M5A2: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_NFATACR: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_NX8-1: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_NX8-4: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_SBPMII: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_VortexM157: 13 weapons, majority 13, 1 distinct signatures
Majority: (no weapon-modifier effects)

### TOP_LA23PEQ: 13 weapons, majority 13, 1 distinct signatures
Majority: U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]

### BTM_LT706QDHarrisBipod: 12 weapons, majority 4, 5 distinct signatures
Majority: U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]; U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6]; U_WPM_BTM_Bipod01_W10>WME_BipodTag[936532d0]; U_WPM_BTM_Bipod01_W10>WME_EnableMountUp[d79973ba]
- M4A1: CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_45_BTM_Bipod
- SCARSC (SOR-300SC): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- XM7 (M277): CHANGED GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]: asset GS:GBM_Increase_ADS_40_BTM_Bipod->GS:GBM_Increase_ADS_35_BTM_Bipod
- M39EMR: MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MSBSGROTCPS (GRT-CPS): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff]
- MRGGA (Mk 24): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]
- DEVGRU: MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]
- DP12 (DB-12): MISSING U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_40_BTM_Bipod[5e5631ff] | MISSING U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]

### MZL_CompactStreamer/MZL_Compact_Streamer: 12 weapons, majority 10, 3 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]
- HK417A2 (M417 A2): EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>SP_WPM_MZL_ImprvdSuppressor01_W30[96bab3b8] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00_SP[c6c66955] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00_SP[d189fbaa] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25_SP[0045e7fa] | EXTRA U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05_SP[96bab3b8]
- MP7A2 (PW7A2): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_MuzzleVFX_13_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor01_W30->U_WPM_MZL_Suppressor01_W20; asset WME_MuzzleVFX_13_P00->WME_MuzzleVFX_12_P00; operands {3f680d24: 9000->-1, ed7f6c09: 13->12} | EXTRA U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]

### MZL_SIGTaperedMB/MZL_SIG_Tapered_MB: 12 weapons, majority 11, 2 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]
- M2010ESR: MISSING U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6]

### SCP_HISSHD: 12 weapons, majority 12, 1 distinct signatures
Majority: (no weapon-modifier effects)

### MZL_AACSDN6Suppressor/MZL_AAC_SDN6_Suppressor: 11 weapons, majority 9, 2 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- M39EMR: CHANGED GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED GS:GRM_SmoothRecoil_P10[bb838ff6]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_14_P00[d189fbaa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_14_P00->WME_MuzzleVFX_15_P00; operands {3f680d24: -1->9000, ed7f6c09: 14->15} | MISSING U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- SVDM: CHANGED GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED GS:GRM_SmoothRecoil_P10[bb838ff6]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30 | CHANGED WME_MuzzleVFX_14_P00[d189fbaa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor02_W30; asset WME_MuzzleVFX_14_P00->WME_MuzzleVFX_15_P00; operands {3f680d24: -1->9000, ed7f6c09: 14->15} | MISSING U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_SOCOMMB/MZL_SOCOM_MB: 11 weapons, majority 9, 2 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]
- M240L: CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20 | CHANGED WME_MuzzleVFX_09_P00[d189fbaa]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20; asset WME_MuzzleVFX_09_P00->WME_MuzzleVFX_10_P00; operands {ed7f6c09: 9->10} | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]
- MP7A2 (PW7A2): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20 | CHANGED WME_MuzzleVFX_09_P00[d189fbaa]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20; asset WME_MuzzleVFX_09_P00->WME_MuzzleVFX_10_P00; operands {ed7f6c09: 9->10} | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]

### AMO_Match: 10 weapons, majority 1 (tie), 10 distinct signatures
Majority: U_WPM_AMO_Match_W10>WME_Penetration_P05[d11a23a2]; U_WPM_AMO_Match_W10>WPM_AMO_Match_CDX40_W10[b1afeb65]
- DesertTechHTI (Interdictor): CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_DesertTechHTI_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_.416Barrett_Match}
- L115A3 (L115): CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_L115A3_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_.338LapuaMagnum2_Match}
- M2010ESR: CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_M2010_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_.300WinMag_Match}
- MRAD (PSR): CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_MRAD_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_.338NormaMagnum_Match}
- SV98M (SV-98): CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_SV98M_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_762x54mmR_Bolt_Match}
- M39EMR: CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_M39EMR_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_762x51mmNATO_Semi_Match}
- SVCh (SVK-8.6): CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_SVCh_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_.338LapuaMagnum_Semi_Match}
- SVDM: CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_SVDM_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_762x54mmR_Semi_Match}
- VSSM: CHANGED WPM_AMO_Match_CDX40_W10[b1afeb65]: asset WPM_AMO_Match_CDX40_W10->WPM_AMO_Match_VSSM_W10; operands {808dd66c: @PD_.375EnABELR_Match->@PD_9x39mm_Match}

### BTM_RK2B25U: 10 weapons, majority 10, 1 distinct signatures
Majority: U_WPM_BTM_CantedVertical_W30>GS:GDM_Array_HipDispersion_BTM_P20_NoBipod[743a3ce0]; U_WPM_BTM_CantedVertical_W30>WME_Draw_Deploy_P10[4aac041b]; U_WPM_BTM_CantedVertical_W30>WME_Draw_Sprint_P10[03db7a68]

### MZL_AACTitanMB: 10 weapons, majority 8, 2 distinct signatures
Majority: U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake1_W05>WME_CSway_M05[28d25398]; U_WPM_MZL_Brake1_W05>WME_MuzzleVFX_08_P00[d189fbaa]; U_WPM_MZL_Brake1_W05>WME_WSway_M05[2fea847d]
- M2010ESR: MISSING U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6]
- MRAD (PSR): MISSING U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake1_W05>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6]

### MZL_HX-QD556: 10 weapons, majority 10, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]

### BTM_Magpul_AFG_PDW/BTM_MagpulAFGPDW/BTM_MagpulAFG_PDW: 9 weapons, majority 9, 1 distinct signatures
Majority: U_WPM_BTM_FastPDW_W20>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastPDW_W20>GS:GRM_Recoil_BTM_P10[bb838ff6]; U_WPM_BTM_FastPDW_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastPDW_W20>WME_ADSTime_FOV_P10[104c2294]

### BTM_UGL_Mount/BTM_UGLMount: 9 weapons, majority 9, 1 distinct signatures
Majority: (no weapon-modifier effects)

### ERG_BurstFireEnable: 9 weapons, majority 6, 3 distinct signatures
Majority: U_WPM_ERG_BurstFireEnabled_W10>WB-local[10713bed]; U_WPM_ERG_BurstFireEnabled_W10>WPM_ERG_BurstFireEnabled_W10[032c7d25]
- MSBSGROTB (GRT-BC): CHANGED WB-local[10713bed]: selector U_WPM_ERG_BurstFireEnabled_W10->U_WPM_ERG_BurstFireReplace_W10 | MISSING U_WPM_ERG_BurstFireEnabled_W10>WPM_ERG_BurstFireEnabled_W10[032c7d25] | EXTRA U_WPM_ERG_BurstFireReplace_W10>WPM_ERG_BurstFireReplace_W10[032c7d25]
- APDW (SL9): CHANGED WB-local[10713bed]: selector U_WPM_ERG_BurstFireEnabled_W10->U_WPM_ERG_BurstFireReplace_W10 | MISSING U_WPM_ERG_BurstFireEnabled_W10>WPM_ERG_BurstFireEnabled_W10[032c7d25] | EXTRA U_WPM_ERG_BurstFireReplace_W10>WPM_ERG_BurstFireReplace_W10[032c7d25]
- MSBSGROTCPS (GRT-CPS): MISSING U_WPM_ERG_BurstFireEnabled_W10>WB-local[10713bed] | MISSING U_WPM_ERG_BurstFireEnabled_W10>WPM_ERG_BurstFireEnabled_W10[032c7d25] | EXTRA U_WPM_ERG_BurstFireActive>GS:GRM_RecoilConversion_ERG_P10[bb838ff6] | EXTRA U_WPM_ERG_BurstFireActive>GS:GRM_Recoil_ERG_P20[bb838ff6] | EXTRA U_WPM_ERG_BurstFireReplace_W10>WPM_ERG_BurstFireReplace_W10[032c7d25]

### MAG_Extended3: 9 weapons, majority 6, 3 distinct signatures
Majority: U_WPM_MAG_045Ext3_556_W35>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_045Ext3_556_W35>WPM_MAG_045Ext3_556_W35[e7d2410a]
- 6p67 (KORD 6P67): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_045Ext3_556_W35->U_WPM_MAG_045Ext3_545_W35 | CHANGED WPM_MAG_045Ext3_556_W35[e7d2410a]: selector U_WPM_MAG_045Ext3_556_W35->U_WPM_MAG_045Ext3_545_W35; asset WPM_MAG_045Ext3_556_W35->WPM_MAG_045Ext3_545_W35; operands {4614adfe: 5->6}
- AK205 (AK-205): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_045Ext3_556_W35->U_WPM_MAG_045Ext3_545_W35 | CHANGED WPM_MAG_045Ext3_556_W35[e7d2410a]: selector U_WPM_MAG_045Ext3_556_W35->U_WPM_MAG_045Ext3_545_W35; asset WPM_MAG_045Ext3_556_W35->WPM_MAG_045Ext3_545_W35; operands {4614adfe: 5->6}
- RPK74M (RPK-74M): CHANGED WPM_MAG_045Ext3_556_W35[e7d2410a]: selector U_WPM_MAG_045Ext3_556_W35->U_WPM_MAG_095Ext3_RPK74M_W50; asset WPM_MAG_045Ext3_556_W35->WPM_MAG_095Ext3_RPK74M_W50; operands {4614adfe: 5->3, 7f22bfb4: 46->96} | MISSING U_WPM_MAG_045Ext3_556_W35>WME_ADSMoveSpeed_M05[303a33cc] | EXTRA U_WPM_MAG_095Ext3_RPK74M_W50>GS:GID_ADSTime_MAG_M10[bb7f4ea1] | EXTRA U_WPM_MAG_095Ext3_RPK74M_W50>WME_ADSTime_Anim_M10[016623ac] | EXTRA U_WPM_MAG_095Ext3_RPK74M_W50>WME_ADSTime_FOV_M10[104c2294] | EXTRA U_WPM_MAG_095Ext3_RPK74M_W50>WPM_MAG_095Ext3_RPK74M_W50[7d916d6b]

### MZL_nt4qdsuppressor/MZL_NT4QDSuppressor/MZL_NT4_QD_Suppressor: 9 weapons, majority 9, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_SOCOM556RC3Suppressor: 9 weapons, majority 8, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]

### LFT_FNElity/LFT_FN_Elity: 8 weapons, majority 8, 1 distinct signatures
Majority: U_WPM_RGT_RangeFinder_W10>WPM_RGT_RangeFinder_W10[4e0a8f72]; U_WPM_RGT_RangeFinder_W10>WPM_RGT_RangeFinder_W10[936532d0]

### MAG_Extended3Fast: 8 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_MAG_045Ext3Fast_556_W40>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_045Ext3Fast_556_W40>WME_Draw_Deploy_M05[4aac041b]; U_WPM_MAG_045Ext3Fast_556_W40>WME_Draw_Sprint_M05[03db7a68]; U_WPM_MAG_045Ext3Fast_556_W40>WME_ReloadSpeedRegular_P10[9705264b]; U_WPM_MAG_045Ext3Fast_556_W40>WPM_MAG_045Ext3Fast_556_W40[e7d2410a]
- 6p67 (KORD 6P67): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WPM_MAG_045Ext3Fast_556_W40[e7d2410a]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40; asset WPM_MAG_045Ext3Fast_556_W40->WPM_MAG_045Ext3Fast_545_W40; operands {4614adfe: 5->6}
- AK205 (AK-205): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40 | CHANGED WPM_MAG_045Ext3Fast_556_W40[e7d2410a]: selector U_WPM_MAG_045Ext3Fast_556_W40->U_WPM_MAG_045Ext3Fast_545_W40; asset WPM_MAG_045Ext3Fast_556_W40->WPM_MAG_045Ext3Fast_545_W40; operands {4614adfe: 5->6}

### AMO_PolymerLinks: 7 weapons, majority 7, 1 distinct signatures
Majority: U_WPM_AMO_PolymerLinks_W10>WME_ADSMoveSpeed_P05[303a33cc]; U_WPM_AMO_PolymerLinks_W10>WME_Penetration_P05[d11a23a2]

### BTM_BCMStubbyBOLT/BTM_BCM_Stubby_BOLT: 7 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_BTM_FastAimBOLT_W10>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastAimBOLT_W10>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastAimBOLT_W10>WME_ADSTime_FOV_P10[104c2294]
- L115A3 (L115): MISSING U_WPM_BTM_FastAimBOLT_W10>GS:GID_ADSTime_BTM_P10[bb7f4ea1]

### BTM_BTGrippodQDBOLT/BTM_BT_Grippod_QD_BOLT: 7 weapons, majority 4, 4 distinct signatures
Majority: U_WPM_BTM_GripPodBOLT01_W10>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_GripPodBOLT01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_GripPodBOLT01_W10>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]; U_WPM_BTM_GripPodBOLT01_W10>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_GripPodBOLT01_W10>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_GripPodBOLT01_W10>WME_BipodTag[936532d0]; U_WPM_BTM_GripPodBOLT01_W10>WME_DynamicPivot_M10[c42bd53b]; U_WPM_BTM_GripPodBOLT01_W10>WME_EnableMountUp[d79973ba]
- CDX40 (ELR-40): EXTRA U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]
- DesertTechHTI (Interdictor): MISSING U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]
- L115A3 (L115): MISSING U_WPM_BTM_GripPodBOLT01_W10>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0] | MISSING U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_GripPodBOLT01_W10>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]

### BTM_CMR201: 7 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_TOP_5mWRed_W10>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0]; U_WPM_TOP_5mWRed_W10>WPM_TOP_5mWRed_W10[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_TOP_5mWRed_W10>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0] | MISSING U_WPM_TOP_5mWRed_W10>WPM_TOP_5mWRed_W10[98c02a2b]

### BTM_GPS2BOLT/BTM_GPS2_BOLT: 7 weapons, majority 4, 3 distinct signatures
Majority: U_WPM_BTM_GripPodBOLT02_W20>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_GripPodBOLT02_W20>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]; U_WPM_BTM_GripPodBOLT02_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_GripPodBOLT02_W20>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_GripPodBOLT02_W20>WME_BipodTag[936532d0]; U_WPM_BTM_GripPodBOLT02_W20>WME_EnableMountUp[d79973ba]
- CDX40 (ELR-40): EXTRA U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]
- DesertTechHTI (Interdictor): MISSING U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]
- L115A3 (L115): MISSING U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_GripPodBOLT02_W20>GS:GRM_GrippodDeployed_BTM_P30[bb838ff6]

### BTM_Holosun_RMLt/BTM_HolosunRMLt: 7 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0] | MISSING U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]

### BTM_LMDPEIR1: 7 weapons, majority 5, 3 distinct signatures
Majority: U_WPM_RGT_TaclightADS_W05>WPM_RGT_TaclightADS_W05[98c02a2b]
- Skorpion (vz. 61): EXTRA U_WPM_RGT_TaclightADS_W05>WB-local[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_RGT_TaclightADS_W05>WPM_RGT_TaclightADS_W05[98c02a2b]

### BTM_MagpulAFG2BOLT/BTM_Magpul_AFG2_BOLT: 7 weapons, majority 7, 1 distinct signatures
Majority: U_WPM_BTM_FastBOLT01_W05>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastBOLT01_W05>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastBOLT01_W05>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastBOLT01_W05>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastBOLT01_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_FastBOLT01_W05>WME_Draw_Sprint_P05[03db7a68]; U_WPM_BTM_FastBOLT01_W05>WME_DynamicPivot_M10[c42bd53b]

### BTM_MagpulAFGBOLT/BTM_Magpul_AFG_BOLT: 7 weapons, majority 4, 3 distinct signatures
Majority: U_WPM_BTM_FastBOLT01_W05>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0]; U_WPM_BTM_FastBOLT01_W05>GS:GID_ADSTime_BTM_P10[bb7f4ea1]; U_WPM_BTM_FastBOLT01_W05>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BTM_FastBOLT01_W05>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BTM_FastBOLT01_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_BTM_FastBOLT01_W05>WME_Draw_Sprint_P05[03db7a68]; U_WPM_BTM_FastBOLT01_W05>WME_DynamicPivot_M10[c42bd53b]; U_WPM_BTM_FastBOLT02_W15>GS:GID_ADSTime_BTM_P10[bb7f4ea1]
- MRAD (PSR): MISSING U_WPM_BTM_FastBOLT02_W15>GS:GID_ADSTime_BTM_P10[bb7f4ea1]
- SV98M (SV-98): MISSING U_WPM_BTM_FastBOLT02_W15>GS:GID_ADSTime_BTM_P10[bb7f4ea1]
- M2010ESR: CHANGED WME_ADSTime_Anim_P10[016623ac]: selector U_WPM_BTM_FastBOLT01_W05->U_WPM_BTM_FastBOLT02_W15 | CHANGED WME_ADSTime_FOV_P10[104c2294]: selector U_WPM_BTM_FastBOLT01_W05->U_WPM_BTM_FastBOLT02_W15 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_BTM_FastBOLT01_W05->U_WPM_BTM_FastBOLT02_W15 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_BTM_FastBOLT01_W05->U_WPM_BTM_FastBOLT02_W15 | MISSING U_WPM_BTM_FastBOLT01_W05>GS:GDM_Array_ADSMoveDispersion_BTM_M10[743a3ce0] | MISSING U_WPM_BTM_FastBOLT01_W05>GS:GID_ADSTime_BTM_P10[bb7f4ea1] | MISSING U_WPM_BTM_FastBOLT01_W05>WME_DynamicPivot_M10[c42bd53b]

### BTM_Perst1: 7 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_TOP_50mWGreen_W20>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0]; U_WPM_TOP_50mWGreen_W20>WPM_TOP_50mWGreen_W20[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_TOP_50mWGreen_W20>GS:GDM_Array_HipDispersion_TOP_P30[743a3ce0] | MISSING U_WPM_TOP_50mWGreen_W20>WPM_TOP_50mWGreen_W20[98c02a2b]

### BTM_SFX300: 7 weapons, majority 2, 6 distinct signatures
Majority: U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b]; U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b]; U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b]; U_WPM_RGT_Flashlight01_W10>WPM_RGT_Flashlight_W10[98c02a2b]
- FiveSeven (ES 5.7): CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S5_RGT_P10
- M45A1: CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S3_RGT_P10
- TRR8 (M357 Trait): CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S2_RGT_P10
- DP12 (DB-12): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>WPM_RGT_Flashlight_W10[98c02a2b]
- Skorpion (vz. 61): MISSING U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight02_W15[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>MPDarkness_WPM_RGT_Flashlight_W10[98c02a2b] | MISSING U_WPM_RGT_Flashlight01_W10>SP_WPM_RGT_Flashlight_W10[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b] | EXTRA U_WPM_RGT_Flashlight01_W10>WB-local[98c02a2b]

### BTM_SFX400: 7 weapons, majority 2, 6 distinct signatures
Majority: U_WPM_RGT_LaserLight01_W20>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]; U_WPM_RGT_LaserLight01_W20>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0]; U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]
- FiveSeven (ES 5.7): CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S5_RGT_P10
- M45A1: CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S3_RGT_P10
- TRR8 (M357 Trait): CHANGED GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S4_RGT_P10->GS:GBM_Increase_Hip_S2_RGT_P10
- Skorpion (vz. 61): MISSING U_WPM_RGT_LaserLight01_W20>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff] | EXTRA U_WPM_RGT_LaserLight01_W20>WB-local[98c02a2b] | EXTRA U_WPM_RGT_LaserLight01_W20>WB-local[98c02a2b]
- DP12 (DB-12): MISSING U_WPM_RGT_LaserLight01_W20>GS:GBM_Increase_Hip_S4_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_LaserLight01_W20>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]

### BTM_X5L_G3/BTM_X5LG3: 7 weapons, majority 1 (tie), 7 distinct signatures
Majority: U_WPM_RGT_LaserLight02_W30>GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff]; U_WPM_RGT_LaserLight02_W30>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b]; U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b]
- G22 (GGH-22): CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: Class_e923016e->None, 2f4b15c8.605f79af[0].6b28f68f: @DefaultCategorizationTags->None, 3f680d24: 1->2, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_Flashlight_1P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_1P, 5c15b40c.4084c303: True->False, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_Flashlight_3P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_3P (+194 more)} | CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: None->Class_e923016e, 2f4b15c8.605f79af[0].6b28f68f: None->@DefaultCategorizationTags, 3f680d24: 2->1, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_LaserSight_Green_1P->@FX_Weapon_Attachment_Flashlight_1P_Darkness, 5c15b40c.4084c303: False->True, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_LaserSight_Green_3P->@FX_Weapon_Attachment_Flashlight_3P_Darkness (+194 more)} | CHANGED GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S5_RGT_P10->GS:GBM_Increase_Hip_S4_RGT_P10
- M45A1: CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: Class_e923016e->None, 2f4b15c8.605f79af[0].6b28f68f: @DefaultCategorizationTags->None, 3f680d24: 1->2, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_Flashlight_1P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_1P, 5c15b40c.4084c303: True->False, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_Flashlight_3P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_3P (+194 more)} | CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: None->Class_e923016e, 2f4b15c8.605f79af[0].6b28f68f: None->@DefaultCategorizationTags, 3f680d24: 2->1, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_LaserSight_Green_1P->@FX_Weapon_Attachment_Flashlight_1P_Darkness, 5c15b40c.4084c303: False->True, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_LaserSight_Green_3P->@FX_Weapon_Attachment_Flashlight_3P_Darkness (+194 more)} | CHANGED GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S5_RGT_P10->GS:GBM_Increase_Hip_S3_RGT_P10
- TRR8 (M357 Trait): CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: Class_e923016e->None, 2f4b15c8.605f79af[0].6b28f68f: @DefaultCategorizationTags->None, 3f680d24: 1->2, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_Flashlight_1P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_1P, 5c15b40c.4084c303: True->False, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_Flashlight_3P_Darkness->@FX_Weapon_Attachment_LaserSight_Green_3P (+194 more)} | CHANGED WB-local[98c02a2b]: operands {2f4b15c8.$class: None->Class_e923016e, 2f4b15c8.605f79af[0].6b28f68f: None->@DefaultCategorizationTags, 3f680d24: 2->1, 5c15b40c.3ebc21d9: @FX_Weapon_Attachment_LaserSight_Green_1P->@FX_Weapon_Attachment_Flashlight_1P_Darkness, 5c15b40c.4084c303: False->True, 5c15b40c.b2ec59f7: @FX_Weapon_Attachment_LaserSight_Green_3P->@FX_Weapon_Attachment_Flashlight_3P_Darkness (+194 more)} | CHANGED GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S5_RGT_P10->GS:GBM_Increase_Hip_S2_RGT_P10
- M18 (P18): CHANGED GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_S5_RGT_P10->GS:GBM_Increase_Hip_S4_RGT_P10 | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | EXTRA U_WPM_RGT_LaserLight02_W30>MPDarkness_WPM_RGT_LightLaser02_W30[98c02a2b] | EXTRA U_WPM_RGT_LaserLight02_W30>MPDarkness_WPM_RGT_LightLaser02_W30[98c02a2b]
- Skorpion (vz. 61): CHANGED WB-local[98c02a2b]: operands {85755b51.3062d390[0].2e15621f: -3867718938415968795->1458639115183786940, 85755b51.3062d390[1].2e15621f: 7799786534941594892->-6097990838969450100, 85755b51.3062d390[2].2e15621f: -6590029948623180492->-8621804940736838918, 85755b51.3062d390[3].2e15621f: 7117716428721948485->3052381010086766754, 85755b51.3062d390[4].2e15621f: -895736998205707590->3966691817618653970, 85755b51.3062d390[5].2e15621f: -4025254574656008257->-4754984950948333616 (+1 more)} | CHANGED WB-local[98c02a2b]: operands {85755b51.3062d390[0].2e15621f: 139984134011305478->5217057155266610566, 85755b51.3062d390[1].2e15621f: 6007491394721804267->-2700979219798616062, 85755b51.3062d390[2].2e15621f: 2975062789770498135->-7047428146762377621, 85755b51.3062d390[3].2e15621f: 1245070651277772527->-5230536765881736664, 85755b51.3062d390[4].2e15621f: 8925536366219504895->8491051085173630063} | MISSING U_WPM_RGT_LaserLight02_W30>GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b] | EXTRA U_WPM_RGT_LaserLight02_W30>GS:GBM_Increase_Hip_A40_RGT_P10[5e5631ff]
- DP12 (DB-12): MISSING U_WPM_RGT_LaserLight02_W30>GS:GBM_Increase_Hip_S5_RGT_P10[5e5631ff] | MISSING U_WPM_RGT_LaserLight02_W30>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0] | MISSING U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>SP_WPM_RGT_LightLaser02_W30[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b]

### MAG_Extended1Fast: 7 weapons, majority 1 (tie), 7 distinct signatures
Majority: U_WPM_MAG_025Ext1Fast_MRGGA_W25>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_025Ext1Fast_MRGGA_W25>WME_Draw_Deploy_M05[4aac041b]; U_WPM_MAG_025Ext1Fast_MRGGA_W25>WME_Draw_Sprint_M05[03db7a68]; U_WPM_MAG_025Ext1Fast_MRGGA_W25>WME_ReloadSpeedRegular_P10[9705264b]; U_WPM_MAG_025Ext1Fast_MRGGA_W25>WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]
- Tavor7 (TR-7): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_762N_W25_ | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_762N_W25_ | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_762N_W25_ | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_762N_W25_ | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_762N_W25_; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_025Ext1Fast_762N_W25; operands {4614adfe: 7->6}
- L115A3 (L115): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_007Ext1Fast_L115A3_W30 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_007Ext1Fast_L115A3_W30 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_007Ext1Fast_L115A3_W30 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_007Ext1Fast_L115A3_W30 | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_007Ext1Fast_L115A3_W30; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_007Ext1Fast_L115A3_W30; operands {4614adfe: 7->5, 7f22bfb4: 26->8, bd024e1d: -1->99}
- MiniFix (Mini Scout): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_MiniFix_W35 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_MiniFix_W35 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_MiniFix_W35 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_MiniFix_W35 | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_MiniFix_W35; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_015Ext1Fast_MiniFix_W35; operands {4614adfe: 7->4, 7f22bfb4: 26->16}
- XM7 (M277): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_XM7_W25 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_XM7_W25 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_XM7_W25 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_XM7_W25 | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_025Ext1Fast_XM7_W25; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_025Ext1Fast_XM7_W25
- ARADMR (LMR27): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_ARADMR_W25 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_ARADMR_W25 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_ARADMR_W25 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_ARADMR_W25 | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_015Ext1Fast_ARADMR_W25; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_015Ext1Fast_ARADMR_W25; operands {4614adfe: 7->11, 7f22bfb4: 26->16}
- ScorpionEvo3 (CZ3A1): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_035Ext1Fast_ScorpionEvo3_W20 | CHANGED WME_Draw_Deploy_M05[4aac041b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_035Ext1Fast_ScorpionEvo3_W20 | CHANGED WME_Draw_Sprint_M05[03db7a68]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_035Ext1Fast_ScorpionEvo3_W20 | CHANGED WME_ReloadSpeedRegular_P10[9705264b]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_035Ext1Fast_ScorpionEvo3_W20 | CHANGED WPM_MAG_025Ext1Fast_MRGGA_W25[e7d2410a]: selector U_WPM_MAG_025Ext1Fast_MRGGA_W25->U_WPM_MAG_035Ext1Fast_ScorpionEvo3_W20; asset WPM_MAG_025Ext1Fast_MRGGA_W25->WPM_MAG_035Ext1Fast_ScorpionEvo3_W20; operands {4614adfe: 7->6, 7f22bfb4: 26->36}

### MZL_SIGSLXQD762Suppressor: 7 weapons, majority 6, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- SCARSC (SOR-300SC): EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>WB-local[b1afeb65]

### SCA_AGCoating: 7 weapons, majority 7, 1 distinct signatures
Majority: (no weapon-modifier effects)

### SCP_FML19: 7 weapons, majority 7, 1 distinct signatures
Majority: (no weapon-modifier effects)

### ERG_DLCBolt/ERG_DLC_Bolt: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_ERG_DLCBolt_W25>WME_ADSBoltRechamber_P25[20a02ed5]

### ERG_PistolQuickdraw: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_ERG_QuickDraw_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_ERG_QuickDraw_W05>WME_Draw_Sprint_P05[03db7a68]

### MZL_HXQD762Suppressor: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]

### MZL_KACNT4QDSuppressor: 6 weapons, majority 5, 2 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]

### MZL_Osprey2Suppressor/MZL_Osprey2_Suppressor: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]

### MZL_SakoSlimBrake: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6]; U_WPM_MZL_Compensator_W10>WME_MuzzleVFX_06_P00[d189fbaa]

### MZL_SFSOCOM556MB: 6 weapons, majority 5, 2 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]
- MiniFix (Mini Scout): MISSING U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6] | EXTRA U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_Bolt_P10[bb838ff6]

### MZL_SOCOMRC3/MZL_SOCOM_RC3: 6 weapons, majority 5, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- M27IAR (DRS-IAR): EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>SP_WPM_MZL_ImprvdSuppressor02_W30[96bab3b8] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00_SP[c6c66955] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00_SP[d189fbaa] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25_SP[0045e7fa] | EXTRA U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05_SP[96bab3b8]

### MZL_SRD9Suppressor/MZL_SRD9_Suppressor: 6 weapons, majority 4, 2 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- M18 (P18): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_MuzzleVFX_14_P00[d189fbaa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30; asset WME_MuzzleVFX_14_P00->WME_MuzzleVFX_13_P00; operands {3f680d24: -1->9000, ed7f6c09: 14->13} | MISSING U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | MISSING U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | MISSING U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]
- Skorpion (vz. 61): CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30 | CHANGED WME_MuzzleVFX_14_P00[d189fbaa]: selector U_WPM_MZL_Suppressor02_W25->U_WPM_MZL_ImprvdSuppressor01_W30; asset WME_MuzzleVFX_14_P00->WME_MuzzleVFX_13_P00; operands {3f680d24: -1->9000, ed7f6c09: 14->13} | MISSING U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0] | MISSING U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | MISSING U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | MISSING U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### RGT_LA23PEQ: 6 weapons, majority 6, 1 distinct signatures
Majority: U_WPM_TOP_5mWGreen_W10>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_TOP_5mWGreen_W10>WPM_TOP_5mWGreen_W10[98c02a2b]

### RGT_FN_Elity/RGT_FNElity: 5 weapons, majority 5, 1 distinct signatures
Majority: U_WPM_RGT_RangeFinder_W10>WPM_RGT_RangeFinder_W10[4e0a8f72]; U_WPM_RGT_RangeFinder_W10>WPM_RGT_RangeFinder_W10[936532d0]

### AMO_Buckshot: 4 weapons, majority 4, 1 distinct signatures
Majority: U_WPM_AMO_Buckshot_W10>GS:GDM_Array_HipDispersion_AMO_Shotgun_P10[743a3ce0]

### AMO_Flechette: 4 weapons, majority 1 (tie), 4 distinct signatures
Majority: U_WPM_AMO_Flechette_W30>GS:GDM_Array_HipDispersion_AMO_Shotgun_P10[743a3ce0]; U_WPM_AMO_Flechette_W30>WME_HealthRegenDelay_P10[5830cb87]; U_WPM_AMO_Flechette_W30>WME_Penetration_P10[d11a23a2]; U_WPM_AMO_Flechette_W30>WPM_AMO_Flechette_185KSK_W30[b1afeb65]
- 590A1 (M87A1): CHANGED WPM_AMO_Flechette_185KSK_W30[b1afeb65]: asset WPM_AMO_Flechette_185KSK_W30->WPM_AMO_Flechette_590A1_W30; operands {808dd66c: @PD_12gaFlechette275_Semi->@PD_12gaFlechette300_Pump}
- DP12 (DB-12): CHANGED WPM_AMO_Flechette_185KSK_W30[b1afeb65]: asset WPM_AMO_Flechette_185KSK_W30->WPM_AMO_Flechette_DP12_W30; operands {808dd66c: @PD_12gaFlechette275_Semi->@PD_12gaFlechette275_Pump}
- M1014: CHANGED WPM_AMO_Flechette_185KSK_W30[b1afeb65]: asset WPM_AMO_Flechette_185KSK_W30->WPM_AMO_Flechette_M1014_W30; operands {808dd66c: @PD_12gaFlechette275_Semi->@PD_12gaFlechette300_Semi}

### AMO_No00Buckshot: 4 weapons, majority 1 (tie), 4 distinct signatures
Majority: U_WPM_AMO_No00Buckshot_W20>GS:GDM_Array_HipDispersion_AMO_Shotgun_P10[743a3ce0]; U_WPM_AMO_No00Buckshot_W20>WPM_AMO_No00Buckshot_158KSK_W20[b1afeb65]; U_WPM_AMO_No00Buckshot_W20>WPM_AMO_No00Buckshot_158KSK_W20[ef0525cd]; U_WPM_AMO_No00Buckshot_W20>WPM_AMO_No00Buckshot_158KSK_W20[fea30c84]
- 590A1 (M87A1): CHANGED WPM_AMO_No00Buckshot_158KSK_W20[b1afeb65]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M590_W20; operands {808dd66c: @PD_12gaNo00Buck275_Semi->@PD_12gaNo00Buck300_Pump} | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[ef0525cd]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M590_W20 | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[fea30c84]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M590_W20
- DP12 (DB-12): CHANGED WPM_AMO_No00Buckshot_158KSK_W20[b1afeb65]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_DP12_W20; operands {808dd66c: @PD_12gaNo00Buck275_Semi->@PD_12gaNo00Buck275_Pump} | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[ef0525cd]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_DP12_W20 | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[fea30c84]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_DP12_W20
- M1014: CHANGED WPM_AMO_No00Buckshot_158KSK_W20[b1afeb65]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M1014_W20; operands {808dd66c: @PD_12gaNo00Buck275_Semi->@PD_12gaNo00Buck300_Semi} | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[ef0525cd]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M1014_W20 | CHANGED WPM_AMO_No00Buckshot_158KSK_W20[fea30c84]: asset WPM_AMO_No00Buckshot_158KSK_W20->WPM_AMO_No00Buckshot_M1014_W20

### AMO_Slugs: 4 weapons, majority 1 (tie), 4 distinct signatures
Majority: U_WPM_AMO_Slugs_W40>GS:GBM_Increase_ADS_SlugIdentifier[5e5631ff]; U_WPM_AMO_Slugs_W40>GS:GRM_Recoil_AMO_M10[bb838ff6]; U_WPM_AMO_Slugs_W40>WME_Protection_P10[e85fff64]; U_WPM_AMO_Slugs_W40>WPM_AMO_Slugs_185KSK_W40[3e93759b]; U_WPM_AMO_Slugs_W40>WPM_AMO_Slugs_185KSK_W40[b1afeb65]; U_WPM_AMO_Slugs_W40>WPM_AMO_Slugs_185KSK_W40[ef0525cd]; U_WPM_AMO_Slugs_W40>WPM_AMO_Slugs_185KSK_W40[fea30c84]
- 590A1 (M87A1): CHANGED WPM_AMO_Slugs_185KSK_W40[3e93759b]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_590A1_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[b1afeb65]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_590A1_W40; operands {808dd66c: @PD_12gaSlug275_Semi->@PD_12gaSlug300_Pump} | CHANGED WPM_AMO_Slugs_185KSK_W40[ef0525cd]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_590A1_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[fea30c84]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_590A1_W40
- DP12 (DB-12): CHANGED WPM_AMO_Slugs_185KSK_W40[3e93759b]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_DP12_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[b1afeb65]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_DP12_W40; operands {808dd66c: @PD_12gaSlug275_Semi->@PD_12gaSlug275_Pump} | CHANGED WPM_AMO_Slugs_185KSK_W40[ef0525cd]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_DP12_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[fea30c84]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_DP12_W40
- M1014: CHANGED WPM_AMO_Slugs_185KSK_W40[3e93759b]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_M1014_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[b1afeb65]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_M1014_W40; operands {808dd66c: @PD_12gaSlug275_Semi->@PD_12gaSlug300_Semi} | CHANGED WPM_AMO_Slugs_185KSK_W40[ef0525cd]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_M1014_W40 | CHANGED WPM_AMO_Slugs_185KSK_W40[fea30c84]: asset WPM_AMO_Slugs_185KSK_W40->WPM_AMO_Slugs_M1014_W40

### MAG_Compact3: 4 weapons, majority 1 (tie), 4 distinct signatures
Majority: U_WPM_MAG_036Cpt3_RPK74M_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0]; U_WPM_MAG_036Cpt3_RPK74M_W05>WME_ADSMoveSpeed_P10[303a33cc]; U_WPM_MAG_036Cpt3_RPK74M_W05>WME_Draw_Deploy_P05[4aac041b]; U_WPM_MAG_036Cpt3_RPK74M_W05>WME_Draw_Sprint_P05[03db7a68]; U_WPM_MAG_036Cpt3_RPK74M_W05>WME_DynamicPivot_P10[c42bd53b]; U_WPM_MAG_036Cpt3_RPK74M_W05>WPM_MAG_036Cpt3_RPK74M_W05[e7d2410a]
- RPKM: CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_036Cpt3_RPKM_W05 | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_036Cpt3_RPKM_W05 | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_036Cpt3_RPKM_W05 | CHANGED WPM_MAG_036Cpt3_RPK74M_W05[e7d2410a]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_036Cpt3_RPKM_W05; asset WPM_MAG_036Cpt3_RPK74M_W05->WPM_MAG_036Cpt3_RPKM_W05; operands {4614adfe: 7->5} | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_DynamicPivot_P10[c42bd53b] | EXTRA U_WPM_MAG_036Cpt3_RPKM_W05>WME_CSway_P05[28d25398] | EXTRA U_WPM_MAG_036Cpt3_RPKM_W05>WME_WSway_P05[2fea847d]
- 590A1 (M87A1): CHANGED WME_ADSMoveSpeed_P10[303a33cc]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_006Cpt3_590A1_W20; asset WME_ADSMoveSpeed_P10->WME_ADSMoveSpeed_P05; operands {c427eabf: 2->1} | CHANGED WME_Draw_Deploy_P05[4aac041b]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_006Cpt3_590A1_W20; asset WME_Draw_Deploy_P05->WME_Draw_Deploy_P10; operands {9540bd8e: 1->2} | CHANGED WME_Draw_Sprint_P05[03db7a68]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_006Cpt3_590A1_W20; asset WME_Draw_Sprint_P05->WME_Draw_Sprint_P10; operands {9540bd8e: 1->2} | CHANGED WPM_MAG_036Cpt3_RPK74M_W05[e7d2410a]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_006Cpt3_590A1_W20; asset WPM_MAG_036Cpt3_RPK74M_W05->WPM_MAG_006Cpt3_590A1_W20; operands {4614adfe: 7->6, 7f22bfb4: 37->6, bd024e1d: -1->5} | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_DynamicPivot_P10[c42bd53b] | EXTRA U_WPM_MAG_006Cpt3_590A1_W20>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | EXTRA U_WPM_MAG_006Cpt3_590A1_W20>WME_ADSTime_Anim_P10[016623ac] | EXTRA U_WPM_MAG_006Cpt3_590A1_W20>WME_ADSTime_FOV_P10[104c2294]
- Ultimax (KTS100 MK8): CHANGED WPM_MAG_036Cpt3_RPK74M_W05[e7d2410a]: selector U_WPM_MAG_036Cpt3_RPK74M_W05->U_WPM_MAG_045Cpt3_Ultimax_W10; asset WPM_MAG_036Cpt3_RPK74M_W05->WPM_MAG_045Cpt3_Ultimax_W10; operands {4614adfe: 7->5, 7f22bfb4: 37->45} | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>GS:GDM_Array_ADSMoveDispersion_MAG_P10[743a3ce0] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_ADSMoveSpeed_P10[303a33cc] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_Draw_Deploy_P05[4aac041b] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_Draw_Sprint_P05[03db7a68] | MISSING U_WPM_MAG_036Cpt3_RPK74M_W05>WME_DynamicPivot_P10[c42bd53b] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>GS:GID_ADSTime_MAG_P10[bb7f4ea1] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>WME_ADSTime_Anim_P10[016623ac] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>WME_ADSTime_FOV_P10[104c2294] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>WME_CSway_P05[28d25398] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>WME_ReloadSpeedDouble_P20[9705264b] | EXTRA U_WPM_MAG_045Cpt3_Ultimax_W10>WME_WSway_P05[2fea847d]

### MZL_Alaskan360Suppressor: 4 weapons, majority 4, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]

### MZL_HUXMB: 4 weapons, majority 4, 1 distinct signatures
Majority: U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>WME_MuzzleVFX_10_P00[d189fbaa]

### MZL_KVPMachTriLugLinearComp: 4 weapons, majority 4, 1 distinct signatures
Majority: U_WPM_MZL_LinearComp_W10>GS:GRM_RecoilConversion_MZL_P10[bb838ff6]; U_WPM_MZL_LinearComp_W10>WME_MuzzleVFX_05_P00[d189fbaa]

### MZL_M4QDFlashHider: 4 weapons, majority 3, 2 distinct signatures
Majority: U_WPM_MZL_FlashHider_W10>WME_MuzzleVFX_01_P00[d189fbaa]; U_WPM_MZL_FlashHider_W10>WME_SpotRange_3D_P10[0045e7fa]
- SCARL (SOR-556 Mk2): MISSING U_WPM_MZL_FlashHider_W10>WME_MuzzleVFX_01_P00[d189fbaa] | MISSING U_WPM_MZL_FlashHider_W10>WME_SpotRange_3D_P10[0045e7fa]

### MZL_SAICobraSuppressor: 4 weapons, majority 4, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]

### RGT_X5LG3: 4 weapons, majority 1 (tie), 4 distinct signatures
Majority: U_WPM_RGT_LaserLight02_W30>GS:GBM_Increase_Hip_A50_RGT_P10[5e5631ff]; U_WPM_RGT_LaserLight02_W30>GS:GDM_Array_HipDispersion_TOP_P20[743a3ce0]; U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b]; U_WPM_RGT_LaserLight02_W30>WPM_RGT_LightLaser02_W30[98c02a2b]
- MSBSGROTB (GRT-BC): CHANGED GS:GBM_Increase_Hip_A50_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A50_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10 | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]
- Ultimax (KTS100 MK8): CHANGED GS:GBM_Increase_Hip_A50_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A50_RGT_P10->GS:GBM_Increase_Hip_A40_RGT_P10 | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b] | MISSING U_WPM_RGT_LaserLight02_W30>WB-local[98c02a2b]
- APDW (SL9): CHANGED WB-local[98c02a2b]: operands {85755b51.3062d390[0].2e15621f: -8654463570223702224->6050081987341083199, 85755b51.3062d390[1].2e15621f: 1086472984756417621->-3642983704940006005, 85755b51.3062d390[2].2e15621f: -1530811351620434618->1766247637261578421, 85755b51.3062d390[3].2e15621f: -5536464935061771876->1491338773947267586, 85755b51.3062d390[4].2e15621f: -5401022281980721859->-7058489835790270861} | CHANGED WB-local[98c02a2b]: operands {85755b51.3062d390[0].2e15621f: -6873122596251878821->-749974057703092070, 85755b51.3062d390[1].2e15621f: 3712621167377339065->8751801235532678702, 85755b51.3062d390[2].2e15621f: -6655205170598863643->6424045937846963302, 85755b51.3062d390[3].2e15621f: -8766813237177253410->-2890102392518514929, 85755b51.3062d390[4].2e15621f: -9029280498760129636->3887826674704334599, 85755b51.3062d390[5].2e15621f: -2235572978349991831->-196086435695232656 (+1 more)} | CHANGED GS:GBM_Increase_Hip_A50_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A50_RGT_P10->GS:GBM_Increase_Hip_A45_RGT_P10

### BRL_Fluted_Barrel: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_BRL_Fluted_W20>GS:GDM_Array_ADSMoveDispersion_BRL_P10[743a3ce0]; U_WPM_BRL_Fluted_W20>GS:GID_ADSTime_BRL_P10[bb7f4ea1]; U_WPM_BRL_Fluted_W20>WME_ADSTime_Anim_P10[016623ac]; U_WPM_BRL_Fluted_W20>WME_ADSTime_FOV_P10[104c2294]; U_WPM_BRL_Fluted_W20>WME_DynamicPivot_P10[c42bd53b]

### BRL_HvyExtBarrel: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_BRL_HeavyExtended_W10>GS:GBM_Increase_ADS_40_BRL_P10[5e5631ff]; U_WPM_BRL_HeavyExtended_W10>WME_Draw_Deploy_M05[4aac041b]; U_WPM_BRL_HeavyExtended_W10>WME_Draw_Sprint_M05[03db7a68]; U_WPM_BRL_HeavyExtended_W10>WME_MuzzleVelocity_P05[3e93759b]

### BTM_AtlasV8BOLT: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]; U_WPM_BTM_Bipod01_W10>WME_BipodTag[936532d0]; U_WPM_BTM_Bipod01_W10>WME_EnableMountUp[d79973ba]

### BTM_Bipod: 3 weapons, majority 1 (tie), 3 distinct signatures
Majority: U_WPM_BTM_Bipod01_W10>GS:GDM_Array_HipDispersion_BTM_P20[743a3ce0]; U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6]; U_WPM_BTM_Bipod01_W10>WME_BipodTag[936532d0]; U_WPM_BTM_Bipod01_W10>WME_EnableMountUp[d79973ba]
- ARADMR (LMR27): MISSING U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6]
- M250: MISSING U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_Bolt_BTM_P50[bb838ff6] | EXTRA U_WPM_BTM_Bipod01_W10>GS:GBM_Increase_ADS_35_BTM_Bipod[5e5631ff] | EXTRA U_WPM_BTM_Bipod01_W10>GS:GRM_BipodDeployed_BTM_P50[bb838ff6]

### BTM_ZenitcoRK2: 3 weapons, majority 2, 2 distinct signatures
Majority: U_WPM_BTM_Vertical01_W20>GS:GRM_Recoil_BTM_P20[bb838ff6]; U_WPM_BTM_Vertical03_W20>GS:GRM_Recoil_BTM_P20[bb838ff6]
- M27IAR (DRS-IAR): MISSING U_WPM_BTM_Vertical03_W20>GS:GRM_Recoil_BTM_P20[bb838ff6] | EXTRA U_WPM_BTM_Vertical03_W20>-[NO_WB_GS_MATCH]

### MAG_Extended4: 3 weapons, majority 1 (tie), 3 distinct signatures
Majority: U_WPM_MAG_050Ext4_545_W45>WME_ADSMoveSpeed_M05[303a33cc]; U_WPM_MAG_050Ext4_545_W45>WPM_MAG_050Ext4_545_W45[e7d2410a]
- M27IAR (DRS-IAR): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_050Ext4_545_W45->U_WPM_MAG_050Ext4_556_W45 | CHANGED WPM_MAG_050Ext4_545_W45[e7d2410a]: selector U_WPM_MAG_050Ext4_545_W45->U_WPM_MAG_050Ext4_556_W45; asset WPM_MAG_050Ext4_545_W45->WPM_MAG_050Ext4_556_W45; operands {4614adfe: 6->5}
- PP19 (PP-19): CHANGED WME_ADSMoveSpeed_M05[303a33cc]: selector U_WPM_MAG_050Ext4_545_W45->U_WPM_MAG_053Ext4_PP19_W55 | CHANGED WPM_MAG_050Ext4_545_W45[e7d2410a]: selector U_WPM_MAG_050Ext4_545_W45->U_WPM_MAG_053Ext4_PP19_W55; asset WPM_MAG_050Ext4_545_W45->WPM_MAG_053Ext4_PP19_W55; operands {4614adfe: 6->4, 7f22bfb4: 51->54} | EXTRA U_WPM_MAG_053Ext4_PP19_W55>WPM_MAG_053Ext4_PP19_W55[7d916d6b]

### MZL_AACTitanQD: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]

### MZL_BushwackerSuppressor: 3 weapons, majority 2, 2 distinct signatures
Majority: U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor01_W20>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor01_W20>WME_MuzzleVFX_12_P00[d189fbaa]; U_WPM_MZL_Suppressor01_W20>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor01_W20>WME_SuppressedSFX_P05[96bab3b8]
- L115A3 (L115): MISSING U_WPM_MZL_Suppressor01_W20>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]

### MZL_DTK-2MB: 3 weapons, majority 2, 2 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]
- PP19 (PP-19): CHANGED GS:GRM_Recoil_MZL_P10[bb838ff6]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20 | CHANGED WME_MuzzleVFX_09_P00[d189fbaa]: selector U_WPM_MZL_Brake2_W10->U_WPM_MZL_Brake3_W20; asset WME_MuzzleVFX_09_P00->WME_MuzzleVFX_10_P00; operands {ed7f6c09: 9->10} | EXTRA U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]

### MZL_GAMicroComp: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6]; U_WPM_MZL_Compensator_W10>WME_MuzzleVFX_06_P00[d189fbaa]

### MZL_GARevMB: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Brake3_W20>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Brake3_W20>WME_MuzzleVFX_10_P00[d189fbaa]

### MZL_HKP3-lugMB: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Brake2_W10>GS:GRM_Recoil_MZL_P10[bb838ff6]; U_WPM_MZL_Brake2_W10>WME_MuzzleVFX_09_P00[d189fbaa]

### MZL_HKPComp3Lug: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Compensator_W10>GS:GRM_SmoothRecoil_Compensator_P10[bb838ff6]; U_WPM_MZL_Compensator_W10>WME_MuzzleVFX_06_P00[d189fbaa]

### MZL_HXQDMagnumTiSuppressor: 3 weapons, majority 2, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoilBolt_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- SVCh (SVK-8.6): CHANGED GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor02_W25 | CHANGED WME_MuzzleVFX_15_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor02_W25; asset WME_MuzzleVFX_15_P00->WME_MuzzleVFX_14_P00; operands {3f680d24: 9000->-1, ed7f6c09: 15->14} | MISSING U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoilBolt_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398] | EXTRA U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_JK195VersaxSuppressor: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]

### MZL_Lunar45Suppressor: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_MAShadowFH: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_FlashHider_W10>WME_MuzzleVFX_01_P00[d189fbaa]; U_WPM_MZL_FlashHider_W10>WME_SpotRange_3D_P10[0045e7fa]

### MZL_Obsidian459mmSuppressor: 3 weapons, majority 2, 2 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]
- MP5MLI (PW5A3): CHANGED GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_Flag_IsSilenced_P00[c6c66955]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_SpotRange_2D3D_P25[0045e7fa]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_SuppressedSFX_P05[96bab3b8]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor01_W20 | CHANGED WME_MuzzleVFX_15_P00[d189fbaa]: selector U_WPM_MZL_ImprvdSuppressor02_W30->U_WPM_MZL_Suppressor01_W20; asset WME_MuzzleVFX_15_P00->WME_MuzzleVFX_12_P00; operands {3f680d24: 9000->-1, ed7f6c09: 15->12} | MISSING U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]

### MZL_RotexIIaSuppressor/MZL_Rotex_IIA_Suppressor: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_Suppressor02_W25>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_Suppressor02_W25>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_Suppressor02_W25>WME_CSway_M05[28d25398]; U_WPM_MZL_Suppressor02_W25>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_Suppressor02_W25>WME_MuzzleVFX_14_P00[d189fbaa]; U_WPM_MZL_Suppressor02_W25>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_Suppressor02_W25>WME_SuppressedSFX_P05[96bab3b8]; U_WPM_MZL_Suppressor02_W25>WME_WSway_M05[2fea847d]

### MZL_Rotex_V/MZL_RotexV: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor01_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_MuzzleVFX_13_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor01_W30>WME_SuppressedSFX_P05[96bab3b8]

### MZL_Salvo12Suppressor: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]

### MZL_TitanFS-T1FLv2Suppressor: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_ImprvdSuppressor02_W30>GS:GDM_Array_HipDispersion_MZL_M10[743a3ce0]; U_WPM_MZL_ImprvdSuppressor02_W30>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_Flag_IsSilenced_P00[c6c66955]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_MuzzleVFX_15_P00[d189fbaa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SpotRange_2D3D_P25[0045e7fa]; U_WPM_MZL_ImprvdSuppressor02_W30>WME_SuppressedSFX_P05[96bab3b8]

### MZL_Wyssen: 3 weapons, majority 3, 1 distinct signatures
Majority: U_WPM_MZL_FlashCompensator_W15>GS:GRM_SmoothRecoil_P10[bb838ff6]; U_WPM_MZL_FlashCompensator_W15>WME_MuzzleVFX_03_P00[d189fbaa]; U_WPM_MZL_FlashCompensator_W15>WME_SpotRange_3D_P10[0045e7fa]

### RGT_SFX400: 3 weapons, majority 1 (tie), 3 distinct signatures
Majority: U_WPM_RGT_LaserLight01_W20>GS:GBM_Increase_Hip_A45_RGT_P10[5e5631ff]; U_WPM_RGT_LaserLight01_W20>GS:GDM_Array_HipDispersion_TOP_P10[743a3ce0]; U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]; U_WPM_RGT_LaserLight01_W20>WPM_RGT_LightLaser01_W20[98c02a2b]
- APDW (SL9): MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]
- Ultimax (KTS100 MK8): CHANGED GS:GBM_Increase_Hip_A45_RGT_P10[5e5631ff]: asset GS:GBM_Increase_Hip_A45_RGT_P10->GS:GBM_Increase_Hip_A40_RGT_P10 | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>MPDarkness_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b] | MISSING U_WPM_RGT_LaserLight01_W20>SP_WPM_RGT_LightLaser01_W20[98c02a2b]


## 4. Commands and runtime

All from the output folder; read-only on the project (decoder imported from `BF6 Weapon Analyzer/scripts/frosty-ebx-decode.py`, in-process, same Ebx class the CLI uses).

```
cd "C:/Users/royal/AppData/Local/Temp/claude/C--Users-royal-Documents-BF6-Datamining/d7ba6e97-39eb-4dc9-9d63-37248eaa6487/scratchpad/attachment-wiring-survey"
python -I extract.py > extract-log.txt   # first (cold) run 37.8 s wall; warm rerun 5.2 s walk after ~3 s raw-root/catalog indexing; 69 weapons, 6,950 EBX decoded in-process
python -I compare.py > compare-log.txt   # under 1 s
python -I report.py                      # under 1 s
```

Files: common2.py (loader adapted from stage9/B/common.py), extract.py (adapted from stage9/B/derive.py graph(), all slots), compare.py, report.py, extracted.json (per weapon, per attachment items), signatures.json, outliers.csv (one row per weapon x difference), family-outliers.csv (section 3 rows), report-body.md.