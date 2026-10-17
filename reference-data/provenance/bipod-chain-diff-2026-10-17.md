# Bipod structural comparison, BF6 2.1.1.0 raw EBX

Facts only. Item keys use `WM:/` for `Common/Hardware/Weapons/_WeaponModifiers/`.

## Headline facts
- Bipod selector a5578cf4-546c-44ef-9a79-b84021406c17 (the guid of shared `U_WPM_BTM_Bipod01_W10`) is bound in every GS under `GRM_BipodDeployed_BTM_P50` (list Field_2296f84f).
- In VHS2, XM7 and MG5 GS the same selector a5578cf4 is ALSO bound in two more lists: Field_b53510be -> `HipDispersion/GDM_Array_HipDispersion_BTM_P20` (prio 10) and Field_ee32ca16 -> `DispersionIncrease/GBM_Increase_ADS_{40|35|30}_BTM_Bipod` (prio 10; VHS2=40, XM7=35, MG5=30).
- In MRGGA and EF88 GS the selector a5578cf4 appears only under `GRM_BipodDeployed_BTM_P50` (prio 6 and 21). Their Field_b53510be and Field_ee32ca16 lists contain no a5578cf4 entry.
- GS-wide diff (all bindings, not only keyword ones): bindings in VHS2+XM7+MG5 and in neither MRGGA nor EF88 are (route,selector): `GBM_NoIncrease_Semi_P00`@ba7bb6a2 (prio 100), `HipDispersion/GDM_Array_HipDispersion_BTM_P20`@a5578cf4, `Recoil/GRM_Recoil_BTM_P20`@99615ebe. In MRGGA+EF88 and none of the three: `Recoil/GRM_Recoil_BTM_P30`@99615ebe.
- `GBM_NoIncrease_ERG_P00`@15cff9ff is in MRGGA, EF88, VHS2, XM7 (not MG5); `GBM_NoIncrease_Semi_P00` is in VHS2, XM7, MG5 only.
- Same selector a5578cf4 in the WB: part `WPM_BTM_Bipod01_W10` (effects WME_EnableMountUp, WME_BipodTag) is in all five part lists (idx 13/29/46/59/27); this does not discriminate.
- Attachment_*Bipod* and U_PRG_*Bipod* files are structurally identical across MRGGA, VHS2, XM7, MG5 (only own guids/hashes differ; U_PRG Field_32cf19f5 is true only for MG5). They import no WPM/U_ATT/WM/CMU. EF88 has no Attachment_*Bipod* or U_PRG_*Bipod* file in its folder and its Equipment_EF88 references no bipod U_PRG.
- WPM_BipodActive (selector f6bad488): external in XM7 only (idx 111); MRGGA has an inline part (WB obj[38], list idx 118) with selector f6bad488 and the same four effect classes; VHS2, MG5, EF88 have neither. Condition object Class_e30e403c with f6bad488 exists in MRGGA, EF88, VHS2, XM7, not MG5.
- WB import-route diffs between groups are unrelated to bipod (e.g. RailCover W05 in MRGGA+EF88; Magnifier/Flashlight FX in the other three).

## Commands
```
python -I "<out>/bipod_diff.py"    # steps 1-2: decode WB/GS/Equipment/bipod Attachment+U_PRG, imports 2 levels, shared Bipod folder -> decoded_all.json, chains.json, tree.txt
python -I "<out>/bipod_diff2.py"   # steps 3-4: parts, GUID-prefix scan, GS bindings -> steps34.txt, items.json, gs_all_bindings.json
python -I "<out>/bipod_diff3.py"   # WB/Equipment import-route group diffs
python -I "<out>/bipod_diff4.py"   # builds report.md
```
Decoding uses the same frosty-ebx-decode.py Ebx class (loaded in-process via stage9/B/common.py, with SharedTypeDescriptors.ebx); import routes via common.imp. <out> = scratchpadipod-diff.

## Steps 1-2: import chains (bipod attachment -> imports -> imports)
```
== MRGGA
  Attachment_MRGGA_BTM_LT706QDHarrisBipod
    -> Common/Hardware/Weapons/_Attachments/AttachmentCategory_BottomRail
    -> Common/Hardware/Weapons/AssaultRifle/MRGGA/U_PRG_MRGGA_BTM_LT706QDHarrisBipod
  U_PRG_MRGGA_BTM_LT706QDHarrisBipod
== EF88
== VHS2
  Attachment_VHS2_BTM_LT706QDHarrisBipod
    -> Common/Hardware/Weapons/_Attachments/AttachmentCategory_BottomRail
    -> Common/Hardware/Weapons/AssaultRifle/VHS2/U_PRG_VHS2_BTM_LT706QDHarrisBipod
  U_PRG_VHS2_BTM_LT706QDHarrisBipod
== XM7
  Attachment_XM7_BTM_LT706QDHarrisBipod
    -> Common/Hardware/Weapons/_Attachments/AttachmentCategory_BottomRail
    -> Common/Hardware/Weapons/Carbine/XM7/U_PRG_XM7_BTM_LT706QDHarrisBipod
  U_PRG_XM7_BTM_LT706QDHarrisBipod
== MG5
  Attachment_MG5_BTM_MG5Bipod
    -> Common/Hardware/Weapons/_Attachments/AttachmentCategory_BottomRail
    -> Common/Hardware/Weapons/MG/MG5/U_PRG_MG5_BTM_MG5Bipod
  U_PRG_MG5_BTM_MG5Bipod
== shared Bipod folder
  CMU_BipodActive
  U_WPM_BTM_Bipod01_W10
  WME_BipodTag
    -> Common/GameSetup/GameConfigurations/CT_GLA_CH1_S0_Common
  WME_EnableMountUp
  WPM_BTM_Bipod01_W10
    -> Common/Hardware/Weapons/_WeaponModifiers/_BottomRail/Bipod/WME_EnableMountUp
    -> Common/Hardware/Weapons/_WeaponModifiers/_BottomRail/Bipod/WME_BipodTag
  WPM_BipodActive

NOTES
EF88: no Attachment_*Bipod* file exists in folder
EF88: no U_PRG_*Bipod* file exists in folder
```

Shared folder content (decoded): CMU_BipodActive (Class_e30e403c cond f6bad488, Field_b574fa40=true), U_WPM_BTM_Bipod01_W10 (guid a5578cf4), WME_BipodTag, WME_EnableMountUp, WPM_BTM_Bipod01_W10 (selector a5578cf4), WPM_BipodActive (selector f6bad488).

## Steps 3-4: per-weapon detail
```

## MRGGA WB part list: 130 entries
  PART idx 2 WM:/Recoil/WM_MountedHorizontal Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 3 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 4 WM:/Recoil/WM_MountedVertical Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 5 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'd37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 6 WM:/ADSReload/WM_MountedHorizontal_ADSReload Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline']
  PART idx 7 WM:/ADSReload/WM_MountedVertical_ADSReload Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline']
  PART idx 13 WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10 Class_897c99a7
     selectors: ['a5578cf4-546c-44ef-9a79-b84021406c17(U_WPM_BTM_Bipod01_W10)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 26 WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20 Class_897c99a7
     selectors: ['c933ce9f-19bb-4cde-850e-5789c4034d92(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 27 WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30 Class_897c99a7
     selectors: ['99615ebe-fbe7-4497-94a9-890c182036bf(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 28 WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30 Class_897c99a7
     selectors: ['592e539a-71ab-474b-8a9c-87ce7c64292c(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861', 'WM:/ADSTime/WME_ADSTime_Anim_P10#c157bb27', 'WM:/ADSTime/WME_ADSTime_FOV_P10#fa6ff00e', 'WM:/ADSMoveDispersion/WME_DynamicPivot_M10#961d6549']
  PART idx 95 Common/Hardware/Weapons/_Attachments/Reflex/CQS/WPM_SCP_ShieldCQS_Short_Mounted Class_897c99a7
     selectors: ['9739dfdd-613b-488e-be2d-9957186bab82(?)']
     effects: ['inline', 'inline', 'inline', 'inline', 'inline', 'inline', 'inline', 'inline', 'inline', 'inline']
  GUID-prefix scan (MRGGA):
     d37fbd7e in WB obj[25] $class=Class_e30e403c field path=Field_6d011165 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     f6bad488 in WB obj[26] $class=Class_e30e403c field path=Field_6d011165 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     c9d17854 in WB obj[27] $class=Class_e30e403c field path=Field_6d011165 value=c9d17854-c639-4652-80c2-6975eef5a432
     f6bad488 in WB obj[38] $class=Class_897c99a7 field path=Field_819acc98.0 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     c9d17854 in WM_MountedHorizontal obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedPlusHorizontal obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical obj[3] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedPlusVertical obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     c9d17854 in WM_MountedHorizontal_ADSReload obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical_ADSReload obj[1] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
  GS bindings (MRGGA):
     list Field_b53510be prio/idx=1 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=2 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=3 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=4 selector=791389cb-6ae9-45a8-9af9-cd70050f6302 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P10
     list Field_b53510be prio/idx=5 selector=4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=6 selector=b67934a8-c61a-40df-8111-59926aa54fe5 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=7 selector=6953686b-0815-4cb9-8286-6a6d70d4ff0c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=8 selector=341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=10 selector=276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=11 selector=3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=12 selector=bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=13 selector=e87969a3-ddef-48ce-b186-da20d9044667 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=14 selector=10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=14 selector=91d746ab-7de6-4c08-a7e7-df8911e03f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_ee32ca16 prio/idx=1 selector=15cff9ff-aab0-4230-9a53-5a2bb1606587 (?) -> WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00
     list Field_2296f84f prio/idx=6 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/Bipod/GRM_BipodDeployed_BTM_P50
     list Field_2296f84f prio/idx=20 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=22 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=24 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30

## EF88 WB part list: 117 entries
  PART idx 2 WM:/Recoil/WM_MountedHorizontal Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 3 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 4 WM:/Recoil/WM_MountedVertical Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 5 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'd37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 6 WM:/ADSReload/WM_MountedHorizontal_ADSReload Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline']
  PART idx 7 WM:/ADSReload/WM_MountedVertical_ADSReload Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline']
  PART idx 29 WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10 Class_897c99a7
     selectors: ['a5578cf4-546c-44ef-9a79-b84021406c17(U_WPM_BTM_Bipod01_W10)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 30 WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20 Class_897c99a7
     selectors: ['c933ce9f-19bb-4cde-850e-5789c4034d92(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 31 WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30 Class_897c99a7
     selectors: ['99615ebe-fbe7-4497-94a9-890c182036bf(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 32 WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30 Class_897c99a7
     selectors: ['592e539a-71ab-474b-8a9c-87ce7c64292c(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861', 'WM:/ADSTime/WME_ADSTime_Anim_P10#c157bb27', 'WM:/ADSTime/WME_ADSTime_FOV_P10#fa6ff00e', 'WM:/ADSMoveDispersion/WME_DynamicPivot_M10#961d6549']
  GUID-prefix scan (EF88):
     f6bad488 in WB obj[18] $class=Class_e30e403c field path=Field_6d011165 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     d37fbd7e in WB obj[19] $class=Class_e30e403c field path=Field_6d011165 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     c9d17854 in WB obj[20] $class=Class_e30e403c field path=Field_6d011165 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedHorizontal obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedPlusHorizontal obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical obj[3] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedPlusVertical obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     c9d17854 in WM_MountedHorizontal_ADSReload obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical_ADSReload obj[1] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
  GS bindings (EF88):
     list Field_b53510be prio/idx=1 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=2 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=3 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=4 selector=276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=5 selector=3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=6 selector=91d746ab-7de6-4c08-a7e7-df8911e03f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_b53510be prio/idx=7 selector=a8d95e89-ce0d-4422-95bf-9070c7cb03f2 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_b53510be prio/idx=8 selector=791389cb-6ae9-45a8-9af9-cd70050f6302 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P10
     list Field_b53510be prio/idx=9 selector=4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=10 selector=b67934a8-c61a-40df-8111-59926aa54fe5 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=11 selector=6953686b-0815-4cb9-8286-6a6d70d4ff0c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=12 selector=341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=13 selector=bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=14 selector=e87969a3-ddef-48ce-b186-da20d9044667 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=15 selector=10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_ee32ca16 prio/idx=5 selector=15cff9ff-aab0-4230-9a53-5a2bb1606587 (?) -> WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00
     list Field_2296f84f prio/idx=21 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/Bipod/GRM_BipodDeployed_BTM_P50
     list Field_2296f84f prio/idx=23 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=25 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=27 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30

## VHS2 WB part list: 120 entries
  PART idx 2 WM:/Recoil/WM_MountedHorizontal Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 3 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 4 WM:/Recoil/WM_MountedVertical Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 5 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'd37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 6 WM:/ADSReload/WM_MountedHorizontal_ADSReload Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline']
  PART idx 7 WM:/ADSReload/WM_MountedVertical_ADSReload Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline']
  PART idx 46 WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10 Class_897c99a7
     selectors: ['a5578cf4-546c-44ef-9a79-b84021406c17(U_WPM_BTM_Bipod01_W10)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 60 WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20 Class_897c99a7
     selectors: ['c933ce9f-19bb-4cde-850e-5789c4034d92(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 61 WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30 Class_897c99a7
     selectors: ['99615ebe-fbe7-4497-94a9-890c182036bf(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 62 WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30 Class_897c99a7
     selectors: ['592e539a-71ab-474b-8a9c-87ce7c64292c(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861', 'WM:/ADSTime/WME_ADSTime_Anim_P10#c157bb27', 'WM:/ADSTime/WME_ADSTime_FOV_P10#fa6ff00e', 'WM:/ADSMoveDispersion/WME_DynamicPivot_M10#961d6549']
  GUID-prefix scan (VHS2):
     c9d17854 in WB obj[29] $class=Class_e30e403c field path=Field_6d011165 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WB obj[30] $class=Class_e30e403c field path=Field_6d011165 value=c9d17854-c639-4652-80c2-6975eef5a432
     f6bad488 in WB obj[31] $class=Class_e30e403c field path=Field_6d011165 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     c9d17854 in WM_MountedHorizontal obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedPlusHorizontal obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical obj[3] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedPlusVertical obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     c9d17854 in WM_MountedHorizontal_ADSReload obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical_ADSReload obj[1] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
  GS bindings (VHS2):
     list Field_b53510be prio/idx=1 selector=791389cb-6ae9-45a8-9af9-cd70050f6302 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P10
     list Field_b53510be prio/idx=2 selector=4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=3 selector=b67934a8-c61a-40df-8111-59926aa54fe5 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=4 selector=6953686b-0815-4cb9-8286-6a6d70d4ff0c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=5 selector=341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=6 selector=91d746ab-7de6-4c08-a7e7-df8911e03f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_b53510be prio/idx=7 selector=276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=8 selector=3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=9 selector=bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=14 selector=e87969a3-ddef-48ce-b186-da20d9044667 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=15 selector=10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_ee32ca16 prio/idx=5 selector=15cff9ff-aab0-4230-9a53-5a2bb1606587 (?) -> WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00
     list Field_ee32ca16 prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod
     list Field_ee32ca16 prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod
     list Field_ee32ca16 prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod
     list Field_ee32ca16 prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod
     list Field_ee32ca16 prio/idx=100 selector=ba7bb6a2-22ed-462f-b701-badece5a4a6c (?) -> WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00
     list Field_2296f84f prio/idx=1 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/Bipod/GRM_BipodDeployed_BTM_P50
     list Field_2296f84f prio/idx=16 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=18 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=20 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30

## XM7 WB part list: 145 entries
  PART idx 54 WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20 Class_897c99a7
     selectors: ['c933ce9f-19bb-4cde-850e-5789c4034d92(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 55 WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30 Class_897c99a7
     selectors: ['99615ebe-fbe7-4497-94a9-890c182036bf(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 56 WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30 Class_897c99a7
     selectors: ['592e539a-71ab-474b-8a9c-87ce7c64292c(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861', 'WM:/ADSTime/WME_ADSTime_Anim_P10#c157bb27', 'WM:/ADSTime/WME_ADSTime_FOV_P10#fa6ff00e', 'WM:/ADSMoveDispersion/WME_DynamicPivot_M10#961d6549']
  PART idx 59 WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10 Class_897c99a7
     selectors: ['a5578cf4-546c-44ef-9a79-b84021406c17(U_WPM_BTM_Bipod01_W10)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 111 WM:/_BottomRail/Bipod/WPM_BipodActive Class_897c99a7
     selectors: ['f6bad488-a353-47f9-8c67-81f6cf7b625f(?)']
     effects: ['inline', 'inline', 'inline', 'inline']
  PART idx 112 WM:/Recoil/WM_MountedHorizontal Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 113 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 114 WM:/ADSReload/WM_MountedHorizontal_ADSReload Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline']
  PART idx 115 WM:/Recoil/WM_MountedVertical Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 116 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'd37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 117 WM:/ADSReload/WM_MountedVertical_ADSReload Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline']
  GUID-prefix scan (XM7):
     d37fbd7e in WB obj[26] $class=Class_e30e403c field path=Field_6d011165 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     f6bad488 in WB obj[27] $class=Class_e30e403c field path=Field_6d011165 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     c9d17854 in WB obj[28] $class=Class_e30e403c field path=Field_6d011165 value=c9d17854-c639-4652-80c2-6975eef5a432
     f6bad488 in WPM_BipodActive obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=f6bad488-a353-47f9-8c67-81f6cf7b625f
     c9d17854 in WM_MountedHorizontal obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedPlusHorizontal obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedHorizontal_ADSReload obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical obj[3] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedPlusVertical obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedVertical_ADSReload obj[1] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
  GS bindings (XM7):
     list Field_b53510be prio/idx=1 selector=791389cb-6ae9-45a8-9af9-cd70050f6302 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P10
     list Field_b53510be prio/idx=2 selector=4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=3 selector=b67934a8-c61a-40df-8111-59926aa54fe5 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=4 selector=6953686b-0815-4cb9-8286-6a6d70d4ff0c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=5 selector=341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=6 selector=91d746ab-7de6-4c08-a7e7-df8911e03f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_b53510be prio/idx=7 selector=276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=8 selector=3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=9 selector=bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=14 selector=e87969a3-ddef-48ce-b186-da20d9044667 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=15 selector=10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_ee32ca16 prio/idx=7 selector=15cff9ff-aab0-4230-9a53-5a2bb1606587 (?) -> WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00
     list Field_ee32ca16 prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod
     list Field_ee32ca16 prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod
     list Field_ee32ca16 prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod
     list Field_ee32ca16 prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod
     list Field_ee32ca16 prio/idx=100 selector=ba7bb6a2-22ed-462f-b701-badece5a4a6c (?) -> WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00
     list Field_2296f84f prio/idx=1 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/Bipod/GRM_BipodDeployed_BTM_P50
     list Field_2296f84f prio/idx=16 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=18 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=20 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30

## MG5 WB part list: 110 entries
  PART idx 2 WM:/Recoil/WM_MountedHorizontal Class_897c99a7
     selectors: ['c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 3 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'c9d17854-c639-4652-80c2-6975eef5a432(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 4 WM:/Recoil/WM_MountedVertical Class_897c99a7
     selectors: ['d37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 5 Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical Class_897c99a7
     selectors: ['b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc(?)', 'd37fbd7e-0624-4cbf-a842-0363de40a560(?)']
     effects: ['inline', 'inline', 'inline']
  PART idx 13 WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30 Class_897c99a7
     selectors: ['592e539a-71ab-474b-8a9c-87ce7c64292c(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861', 'WM:/ADSTime/WME_ADSTime_Anim_P10#c157bb27', 'WM:/ADSTime/WME_ADSTime_FOV_P10#fa6ff00e', 'WM:/ADSMoveDispersion/WME_DynamicPivot_M10#961d6549']
  PART idx 14 WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30 Class_897c99a7
     selectors: ['99615ebe-fbe7-4497-94a9-890c182036bf(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 15 WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20 Class_897c99a7
     selectors: ['c933ce9f-19bb-4cde-850e-5789c4034d92(?)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  PART idx 27 WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10 Class_897c99a7
     selectors: ['a5578cf4-546c-44ef-9a79-b84021406c17(U_WPM_BTM_Bipod01_W10)']
     effects: ['WM:/_BottomRail/Bipod/WME_EnableMountUp#c6f42158', 'WM:/_BottomRail/Bipod/WME_BipodTag#4bc07861']
  GUID-prefix scan (MG5):
     c9d17854 in WM_MountedHorizontal obj[2] $class=Class_897c99a7 field path=Field_819acc98.0 value=c9d17854-c639-4652-80c2-6975eef5a432
     c9d17854 in WM_MountedPlusHorizontal obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=c9d17854-c639-4652-80c2-6975eef5a432
     d37fbd7e in WM_MountedVertical obj[3] $class=Class_897c99a7 field path=Field_819acc98.0 value=d37fbd7e-0624-4cbf-a842-0363de40a560
     d37fbd7e in WM_MountedPlusVertical obj[4] $class=Class_897c99a7 field path=Field_819acc98.1 value=d37fbd7e-0624-4cbf-a842-0363de40a560
  GS bindings (MG5):
     list Field_b53510be prio/idx=1 selector=791389cb-6ae9-45a8-9af9-cd70050f6302 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P10
     list Field_b53510be prio/idx=2 selector=4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=3 selector=b67934a8-c61a-40df-8111-59926aa54fe5 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=4 selector=6953686b-0815-4cb9-8286-6a6d70d4ff0c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P20
     list Field_b53510be prio/idx=5 selector=341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_TOP_P30
     list Field_b53510be prio/idx=6 selector=91d746ab-7de6-4c08-a7e7-df8911e03f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BRL_P10
     list Field_b53510be prio/idx=7 selector=276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=8 selector=3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=9 selector=bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20
     list Field_b53510be prio/idx=14 selector=daf90edc-792e-4046-b80d-6eddc3af926c (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_BTM_P20_NoBipod
     list Field_b53510be prio/idx=15 selector=e87969a3-ddef-48ce-b186-da20d9044667 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_b53510be prio/idx=16 selector=10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?) -> Common/Hardware/weapons/_WeaponModifiers/HipDispersion/GDM_Array_HipDispersion_MZL_M10
     list Field_ee32ca16 prio/idx=10 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod
     list Field_ee32ca16 prio/idx=11 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod
     list Field_ee32ca16 prio/idx=12 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod
     list Field_ee32ca16 prio/idx=13 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod
     list Field_ee32ca16 prio/idx=100 selector=ba7bb6a2-22ed-462f-b701-badece5a4a6c (?) -> WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00
     list Field_2296f84f prio/idx=1 selector=a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10) -> WM:/Bipod/GRM_BipodDeployed_BTM_P50
     list Field_2296f84f prio/idx=16 selector=c933ce9f-19bb-4cde-850e-5789c4034d92 (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=18 selector=99615ebe-fbe7-4497-94a9-890c182036bf (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
     list Field_2296f84f prio/idx=20 selector=592e539a-71ab-474b-8a9c-87ce7c64292c (?) -> WM:/Grippod/GRM_GrippodDeployed_BTM_P30
```

## Step 5: comparison table
| item | MRGGA | EF88 | VHS2 | XM7 | MG5 |
|---|---|---|---|---|---|
| `effect:WM:/_BottomRail/Bipod/WME_BipodTag` | present | present | present | present | present |
| `effect:WM:/_BottomRail/Bipod/WME_EnableMountUp` | present | present | present | present | present |
| `gs:WM:/Bipod/GRM_BipodDeployed_BTM_P50|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | prio 6 | prio 21 | prio 1 | prio 1 | prio 1 |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | absent | absent | absent | absent | prio 13 |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)` | absent | absent | absent | absent | prio 12 |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | absent | absent | absent | absent | prio 10 |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | absent | absent | absent | absent | prio 11 |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | absent | absent | absent | prio 13 | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)` | absent | absent | absent | prio 12 | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | absent | absent | absent | prio 10 | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | absent | absent | absent | prio 11 | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | absent | absent | prio 13 | absent | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)` | absent | absent | prio 12 | absent | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | absent | absent | prio 10 | absent | absent |
| `gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | absent | absent | prio 11 | absent | absent |
| `gs:WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00|selector 15cff9ff-aab0-4230-9a53-5a2bb1606587 (?)` | prio 1 | prio 5 | prio 5 | prio 7 | absent |
| `gs:WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00|selector ba7bb6a2-22ed-462f-b701-badece5a4a6c (?)` | absent | absent | prio 100 | prio 100 | prio 100 |
| `gs:WM:/Grippod/GRM_GrippodDeployed_BTM_P30|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | prio 24 | prio 27 | prio 20 | prio 20 | prio 20 |
| `gs:WM:/Grippod/GRM_GrippodDeployed_BTM_P30|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)` | prio 22 | prio 25 | prio 18 | prio 18 | prio 18 |
| `gs:WM:/Grippod/GRM_GrippodDeployed_BTM_P30|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | prio 20 | prio 23 | prio 16 | prio 16 | prio 16 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BRL_P10|selector 91d746ab-7de6-4c08-a7e7-df8911e03f95 (?)` | prio 14 | prio 6 | prio 6 | prio 6 | prio 6 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BRL_P10|selector a8d95e89-ce0d-4422-95bf-9070c7cb03f2 (?)` | absent | prio 7 | absent | absent | absent |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20_NoBipod|selector daf90edc-792e-4046-b80d-6eddc3af926c (?)` | absent | absent | absent | absent | prio 14 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | prio 3 | prio 3 | prio 13 | prio 13 | prio 13 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)` | prio 2 | prio 2 | prio 12 | prio 12 | prio 12 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | absent | absent | prio 10 | prio 10 | prio 10 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | prio 1 | prio 1 | prio 11 | prio 11 | prio 11 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10|selector 10446e12-a6e5-41ec-a457-5bc7b4f70f82 (?)` | prio 14 | prio 15 | prio 15 | prio 15 | prio 16 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10|selector 276be3b0-2455-46b7-a85e-52c37aa5b3b8 (?)` | prio 10 | prio 4 | prio 7 | prio 7 | prio 7 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10|selector 3eda1130-c3d9-4df5-8d83-65ca7dd381f6 (?)` | prio 11 | prio 5 | prio 8 | prio 8 | prio 8 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10|selector bb26754b-fb9d-467b-96ac-ecd132bc3f95 (?)` | prio 12 | prio 13 | prio 9 | prio 9 | prio 9 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10|selector e87969a3-ddef-48ce-b186-da20d9044667 (?)` | prio 13 | prio 14 | prio 14 | prio 14 | prio 15 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P10|selector 791389cb-6ae9-45a8-9af9-cd70050f6302 (?)` | prio 4 | prio 8 | prio 1 | prio 1 | prio 1 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P20|selector 4e1b6d6d-f9ec-4b2a-a5eb-9f7750a11dbb (?)` | prio 5 | prio 9 | prio 2 | prio 2 | prio 2 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P20|selector 6953686b-0815-4cb9-8286-6a6d70d4ff0c (?)` | prio 7 | prio 11 | prio 4 | prio 4 | prio 4 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P30|selector 341ebfc1-3ec9-4a73-b0ce-371c21a70a6f (?)` | prio 8 | prio 12 | prio 5 | prio 5 | prio 5 |
| `gs:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P30|selector b67934a8-c61a-40df-8111-59926aa54fe5 (?)` | prio 6 | prio 10 | prio 3 | prio 3 | prio 3 |
| `gsroute:WM:/Bipod/GRM_BipodDeployed_BTM_P50` | prio 6 sel a5578cf4 | prio 21 sel a5578cf4 | prio 1 sel a5578cf4 | prio 1 sel a5578cf4 | prio 1 sel a5578cf4 |
| `gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod` | absent | absent | absent | absent | prio 13 sel 592e539a |
| `gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod` | absent | absent | absent | prio 13 sel 592e539a | absent |
| `gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod` | absent | absent | prio 13 sel 592e539a | absent | absent |
| `gsroute:WM:/DispersionIncrease/GBM_NoIncrease_ERG_P00` | prio 1 sel 15cff9ff | prio 5 sel 15cff9ff | prio 5 sel 15cff9ff | prio 7 sel 15cff9ff | absent |
| `gsroute:WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00` | absent | absent | prio 100 sel ba7bb6a2 | prio 100 sel ba7bb6a2 | prio 100 sel ba7bb6a2 |
| `gsroute:WM:/Grippod/GRM_GrippodDeployed_BTM_P30` | prio 24 sel 592e539a | prio 27 sel 592e539a | prio 20 sel 592e539a | prio 20 sel 592e539a | prio 20 sel 592e539a |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_BRL_P10` | prio 14 sel 91d746ab | prio 7 sel a8d95e89 | prio 6 sel 91d746ab | prio 6 sel 91d746ab | prio 6 sel 91d746ab |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20` | prio 3 sel 592e539a | prio 3 sel 592e539a | prio 13 sel 592e539a | prio 13 sel 592e539a | prio 13 sel 592e539a |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20_NoBipod` | absent | absent | absent | absent | prio 14 sel daf90edc |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_MZL_M10` | prio 14 sel 10446e12 | prio 15 sel 10446e12 | prio 15 sel 10446e12 | prio 15 sel 10446e12 | prio 16 sel 10446e12 |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P10` | prio 4 sel 791389cb | prio 8 sel 791389cb | prio 1 sel 791389cb | prio 1 sel 791389cb | prio 1 sel 791389cb |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P20` | prio 7 sel 6953686b | prio 11 sel 6953686b | prio 4 sel 6953686b | prio 4 sel 6953686b | prio 4 sel 6953686b |
| `gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_TOP_P30` | prio 8 sel 341ebfc1 | prio 12 sel 341ebfc1 | prio 5 sel 341ebfc1 | prio 5 sel 341ebfc1 | prio 5 sel 341ebfc1 |
| `guid:c9d17854|Class_897c99a7|Field_819acc98` | present | present | present | present | present |
| `guid:c9d17854|Class_e30e403c|Field_6d011165` | present | present | present | present | absent |
| `guid:d37fbd7e|Class_897c99a7|Field_819acc98` | present | present | present | present | present |
| `guid:d37fbd7e|Class_e30e403c|Field_6d011165` | present | present | absent | present | absent |
| `guid:f6bad488|Class_897c99a7|Field_819acc98` | present | absent | absent | present | absent |
| `guid:f6bad488|Class_e30e403c|Field_6d011165` | present | present | present | present | absent |
| `part:Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusHorizontal` | idx 3 | idx 3 | idx 3 | idx 113 | idx 3 |
| `part:Common/Gameplay/InRoundProgression/MountedPlus/WM_MountedPlusVertical` | idx 5 | idx 5 | idx 5 | idx 116 | idx 5 |
| `part:Common/Hardware/Weapons/_Attachments/Reflex/CQS/WPM_SCP_ShieldCQS_Short_Mounted` | idx 95 | absent | absent | absent | absent |
| `part:WM:/ADSReload/WM_MountedHorizontal_ADSReload` | idx 6 | idx 6 | idx 6 | idx 114 | absent |
| `part:WM:/ADSReload/WM_MountedVertical_ADSReload` | idx 7 | idx 7 | idx 7 | idx 117 | absent |
| `part:WM:/Recoil/WM_MountedHorizontal` | idx 2 | idx 2 | idx 2 | idx 112 | idx 2 |
| `part:WM:/Recoil/WM_MountedVertical` | idx 4 | idx 4 | idx 4 | idx 115 | idx 4 |
| `part:WM:/_BottomRail/Bipod/WPM_BTM_Bipod01_W10` | idx 13 | idx 29 | idx 46 | idx 59 | idx 27 |
| `part:WM:/_BottomRail/Bipod/WPM_BipodActive` | absent | absent | absent | idx 111 | absent |
| `part:WM:/_BottomRail/GripPod/WPM_BTM_GripPod01_W20` | idx 26 | idx 30 | idx 60 | idx 54 | idx 15 |
| `part:WM:/_BottomRail/GripPod/WPM_BTM_GripPod02_W30` | idx 27 | idx 31 | idx 61 | idx 55 | idx 14 |
| `part:WM:/_BottomRail/GripPod/WPM_BTM_GripPod03_W30` | idx 28 | idx 32 | idx 62 | idx 56 | idx 13 |
| `selector:592e539a-71ab-474b-8a9c-87ce7c64292c (?)` | idx 28 | idx 32 | idx 62 | idx 56 | idx 13 |
| `selector:9739dfdd-613b-488e-be2d-9957186bab82 (?)` | idx 95 | absent | absent | absent | absent |
| `selector:99615ebe-fbe7-4497-94a9-890c182036bf (?)` | idx 27 | idx 31 | idx 61 | idx 55 | idx 14 |
| `selector:a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)` | idx 13 | idx 29 | idx 46 | idx 59 | idx 27 |
| `selector:b9e5e8e5-1d51-45ec-99d2-2b77b0144dfc (?)` | idx 5 | idx 5 | idx 5 | idx 116 | idx 5 |
| `selector:c933ce9f-19bb-4cde-850e-5789c4034d92 (?)` | idx 26 | idx 30 | idx 60 | idx 54 | idx 15 |
| `selector:c9d17854-c639-4652-80c2-6975eef5a432 (?)` | idx 6 | idx 6 | idx 6 | idx 114 | idx 3 |
| `selector:d37fbd7e-0624-4cbf-a842-0363de40a560 (?)` | idx 7 | idx 7 | idx 7 | idx 117 | idx 5 |
| `selector:f6bad488-a353-47f9-8c67-81f6cf7b625f (?)` | absent | absent | absent | idx 111 | absent |

### (a) in both MRGGA and EF88, absent in VHS2/XM7/MG5
- (route,selector) from full GS diff: Recoil/GRM_Recoil_BTM_P30 @ 99615ebe

### (b) in all of VHS2/XM7/MG5, absent in MRGGA and EF88
- gs:WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00|selector ba7bb6a2-22ed-462f-b701-badece5a4a6c (?)
- gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)
- gsroute:WM:/DispersionIncrease/GBM_NoIncrease_Semi_P00
- selector a5578cf4 -> GDM_Array_HipDispersion_BTM_P20 (Field_b53510be) [in table above as gs: row]
- GBM_NoIncrease_Semi_P00 @ ba7bb6a2 (gs row above); GRM_Recoil_BTM_P20 @ 99615ebe (full GS diff)
- GBM_Increase_ADS_*_BTM_Bipod @ a5578cf4: present in all three but as three different route variants (40/35/30), so the per-route rows show one weapon each; as a class it is in (b).

### (c) in exactly one weapon
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)  [only MG5]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)  [only MG5]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)  [only MG5]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)  [only MG5]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)  [only XM7]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)  [only XM7]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)  [only XM7]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)  [only XM7]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector 592e539a-71ab-474b-8a9c-87ce7c64292c (?)  [only VHS2]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector 99615ebe-fbe7-4497-94a9-890c182036bf (?)  [only VHS2]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector a5578cf4-546c-44ef-9a79-b84021406c17 (U_WPM_BTM_Bipod01_W10)  [only VHS2]
- gs:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod|selector c933ce9f-19bb-4cde-850e-5789c4034d92 (?)  [only VHS2]
- gs:WM:/HipDispersion/GDM_Array_HipDispersion_BRL_P10|selector a8d95e89-ce0d-4422-95bf-9070c7cb03f2 (?)  [only EF88]
- gs:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20_NoBipod|selector daf90edc-792e-4046-b80d-6eddc3af926c (?)  [only MG5]
- gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_30_BTM_Bipod  [only MG5]
- gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_35_BTM_Bipod  [only XM7]
- gsroute:WM:/DispersionIncrease/GBM_Increase_ADS_40_BTM_Bipod  [only VHS2]
- gsroute:WM:/HipDispersion/GDM_Array_HipDispersion_BTM_P20_NoBipod  [only MG5]
- part:Common/Hardware/Weapons/_Attachments/Reflex/CQS/WPM_SCP_ShieldCQS_Short_Mounted  [only MRGGA]
- part:WM:/_BottomRail/Bipod/WPM_BipodActive  [only XM7]
- selector:9739dfdd-613b-488e-be2d-9957186bab82 (?)  [only MRGGA]
- selector:f6bad488-a353-47f9-8c67-81f6cf7b625f (?)  [only XM7]

Not resolved: selector GUIDs other than a5578cf4 show `(?)` (their owning assets are not in the held raw set); no decode failures in the files used.