# Bipod selector a5578cf4 bindings across all 69 GS files

Selector: a5578cf4-546c-44ef-9a79-b84021406c17
Source: binding-survey/decoded.json (assets whose key contains "/GS_", 69 files). Basenames resolved with common.imp(). Sites from reference-data/provenance/spread-binding-survey-2026-10-17.csv (gs -> site).
Walk: same binding-walk as bipod-diff/bipod_diff2.py (dict with Field_6d011165 + Field_2f0e5b83 $import; list field name and Field_3f680d24 priority).

## Validation against bipod-diff/gs_all_bindings.json
Compared every binding (all selectors, all routes) for the five weapons, as (list field, selector, priority, resolved route):
- MRGGA: 131 / 131 identical
- EF88: 152 / 152 identical
- VHS2: 154 / 154 identical
- XM7: 152 / 152 identical
- MG5: 151 / 151 identical

## Counts
- GS files: 69
- Weapons with at least one binding under a5578cf4: 58
- Total bindings under a5578cf4: 122
- List A (none): 11; list B (GRM_BipodDeployed_BTM_P50 only): 18; list C (_BTM_Bipod or HipDispersion_BTM_P20): 40. A + B + C = 69.

Note: MRGGS has no binding under a5578cf4 (the table shows none).

## Table: one row per GS file (selector a5578cf4)

| # | Folder | Weapon | GS file | Site | Bindings (basename (list field, priority)) | n |
|---|---|---|---|---|---|---|
| 1 | 6p67 | 6P67 | GS_6P67 | KORD 6P67 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_50_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 2 | ACE32 | ACE32 | GS_ACE32 | NVO-228E | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_35_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 3 | EF88 | EF88 | GS_EF88 | EF88 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p21) | 1 |
| 4 | G36 | G36 | GS_G36 | B36A4 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 5 | G3A4 | G3A4 | GS_G3A4 | AK4D | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_30_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 6 | HK433 | HK433 | GS_HK433 | M433 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 7 | L85A3 | L85A3 | GS_L85A3 | L85A3 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 8 | M16A3 | M16A3 | GS_M16A3 | M16A4 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p13); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p7); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p25) | 3 |
| 9 | MRGGA | MRGGA | GS_MRGGA | Mk 24 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p6) | 1 |
| 10 | SCARL | SCARL | GS_SCARL | SOR-556 Mk2 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 11 | Tavor7 | Tavor7 | GS_Tavor7 | TR-7 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_30_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 12 | VHS2 | VHS2 | GS_VHS2 | VCR-2 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 13 | CDX40 | CDX40 | GS_CDX40 | ELR-40 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p1); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p12) | 2 |
| 14 | DesertTechHTI | DesertTechHTI | GS_DesertTechHTI | Interdictor | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p1); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p5) | 2 |
| 15 | L115A3 | L115A3 | GS_L115A3 | L115 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p11); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p9) | 2 |
| 16 | M2010ESR | M2010ESR | GS_M2010ESR | M2010 ESR | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p1) | 2 |
| 17 | MRAD | MRAD | GS_MRAD | PSR | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p1) | 2 |
| 18 | MiniFix | MiniFix | GS_MiniFix | Mini Scout | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p1) | 2 |
| 19 | SV98M | SV98M | GS_SV98M | SV-98 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_Bolt_BTM_P50 (Field_2296f84f, p1) | 2 |
| 20 | AK205 | AK205 | GS_AK205 | AK-205 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 21 | BREN3 | BREN3 | GS_BREN3 | BROD 3 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p36) | 1 |
| 22 | DEVGRU | Devgru | GS_Devgru | - | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p25) | 1 |
| 23 | HK417A2 | HK417A2 | GS_HK417A2 | M417 A2 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_35_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 24 | M4A1 | M4A1 | GS_M4A1 | M4A1 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_45_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 25 | MSBSGROTB | MSBSGROTB | GS_MSBSGROTB | GRT-BC | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 26 | QBZ192 | QBZ192 | GS_QBZ192 | QBZ-192 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_45_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 27 | SCARSC | SCARSC | GS_SCARSC | SOR-300SC | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 28 | SIG553R | SIG553R | GS_SIG553R | SG 553R | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 29 | XM7 | XM7 | GS_XM7 | M277 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_35_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 30 | ARADMR | ARADMR | GS_ARADMR | LMR27 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 31 | M39EMR | M39EMR | GS_M39EMR | M39 EMR | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 32 | MRGGS | MRGGS | GS_MRGGS | - | none | 0 |
| 33 | MSBSGROTCPS | MSBSGROTCPS | GS_MSBSGROTCPS | GRT-CPS | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 34 | SVCh | SVCh | GS_SVCh | SVK-8.6 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 35 | SVDM | SVDM | GS_SVDM | SVDM | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 2 |
| 36 | VSSM | VSSM | GS_VSSM | VSSM | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p21) | 1 |
| 37 | M240L | M240L | GS_M240L | M240L | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_30_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 38 | M250 | M250 | GS_M250 | M250 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_35_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 39 | M27IAR | M27IAR | GS_M27IAR | DRS-IAR | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 40 | M60E6 | M60E6 | GS_M60E6 | M/60 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_30_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 41 | MG4K | MG4K | GS_MG4K | M123K | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 42 | MG5 | MG5 | GS_MG5 | M121 A2 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_30_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 43 | Minimi | Minimi | GS_Minimi | L110 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 44 | PKM | PKM | GS_PKM | Z84M | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p26) | 1 |
| 45 | RPK74M | RPK74M | GS_RPK74M | RPK-74M | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_50_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p6) | 3 |
| 46 | RPKM | RPKM | GS_RPKM | RPKM | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_35_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 47 | Ultimax | Ultimax | GS_Ultimax | KTS100 MK8 | GDM_Array_HipDispersion_BTM_P20 (Field_b53510be, p10); GBM_Increase_ADS_40_BTM_Bipod (Field_ee32ca16, p10); GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 3 |
| 48 | APC10 | APC10 | GS_APC10 | SCW-10 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 49 | APDW | APDW | GS_APDW | SL9 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 50 | MP5MLI | MP5MLI | GS_MP5MLI | PW5A3 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 51 | MP7A2 | MP7A2 | GS_MP7A2 | PW7A2 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 52 | MPX | MPX | GS_MPX | SGX | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 53 | P90 | P90 | GS_P90 | USG-90 | none | 0 |
| 54 | PP19 | PP19 | GS_PP19 | PP-19 | none | 0 |
| 55 | RSAR999 | RSAR999 | GS_RSAR999 | RSPR | none | 0 |
| 56 | ScorpionEvo3 | ScorpionEvo3 | GS_ScorpionEvo3 | CZ3A1 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 57 | UMP40 | UMP40 | GS_UMP40 | UMG-40 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 58 | Vector | Vector | GS_Vector | KV9 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 59 | FiveSeven | FiveSeven | GS_FiveSeven | ES 5.7 | none | 0 |
| 60 | G22 | G22 | GS_G22 | GGH-22 | none | 0 |
| 61 | M18 | M18 | GS_M18 | P18 | none | 0 |
| 62 | M45A1 | M45A1 | GS_M45A1 | M45A1 | none | 0 |
| 63 | RagingHunter | RagingHunter | GS_RagingHunter | M44 | none | 0 |
| 64 | Skorpion | Skorpion | GS_Skorpion | vz. 61 | none | 0 |
| 65 | TRR8 | TRR8 | GS_TRR8 | M357 Trait | none | 0 |
| 66 | 185KSK | 185KSK | GS_185KSK | 18.5KS-K | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 67 | 590A1 | 590A1 | GS_590A1 | M87A1 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 68 | DP12 | DP12 | GS_DP12 | DB-12 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |
| 69 | M1014 | M1014 | GS_M1014 | M1014 | GRM_BipodDeployed_BTM_P50 (Field_2296f84f, p1) | 1 |

Total GS files: 69. Weapons with >=1 binding under a5578cf4: 58. Total bindings under a5578cf4: 122.

## (A) No binding under a5578cf4
Count: 11
- MRGGS (GS_MRGGS, -)
- P90 (GS_P90, USG-90)
- PP19 (GS_PP19, PP-19)
- RSAR999 (GS_RSAR999, RSPR)
- FiveSeven (GS_FiveSeven, ES 5.7)
- G22 (GS_G22, GGH-22)
- M18 (GS_M18, P18)
- M45A1 (GS_M45A1, M45A1)
- RagingHunter (GS_RagingHunter, M44)
- Skorpion (GS_Skorpion, vz. 61)
- TRR8 (GS_TRR8, M357 Trait)

## (B) Bound to GRM_BipodDeployed_BTM_P50 only
Count: 18
- EF88 (GS_EF88, EF88); bindings: 1
- MRGGA (GS_MRGGA, Mk 24); bindings: 1
- BREN3 (GS_BREN3, BROD 3); bindings: 1
- Devgru (GS_Devgru, -); bindings: 1
- VSSM (GS_VSSM, VSSM); bindings: 1
- PKM (GS_PKM, Z84M); bindings: 1
- APC10 (GS_APC10, SCW-10); bindings: 1
- APDW (GS_APDW, SL9); bindings: 1
- MP5MLI (GS_MP5MLI, PW5A3); bindings: 1
- MP7A2 (GS_MP7A2, PW7A2); bindings: 1
- MPX (GS_MPX, SGX); bindings: 1
- ScorpionEvo3 (GS_ScorpionEvo3, CZ3A1); bindings: 1
- UMP40 (GS_UMP40, UMG-40); bindings: 1
- Vector (GS_Vector, KV9); bindings: 1
- 185KSK (GS_185KSK, 18.5KS-K); bindings: 1
- 590A1 (GS_590A1, M87A1); bindings: 1
- DP12 (GS_DP12, DB-12); bindings: 1
- M1014 (GS_M1014, M1014); bindings: 1

## (C) Bind a route containing _BTM_Bipod or HipDispersion_BTM_P20 under a5578cf4
Count: 40
- 6P67 (GS_6P67, KORD 6P67): GBM_Increase_ADS_50_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- ACE32 (GS_ACE32, NVO-228E): GBM_Increase_ADS_35_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- G36 (GS_G36, B36A4): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- G3A4 (GS_G3A4, AK4D): GBM_Increase_ADS_30_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- HK433 (GS_HK433, M433): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- L85A3 (GS_L85A3, L85A3): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- M16A3 (GS_M16A3, M16A4): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- SCARL (GS_SCARL, SOR-556 Mk2): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- Tavor7 (GS_Tavor7, TR-7): GBM_Increase_ADS_30_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- VHS2 (GS_VHS2, VCR-2): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- CDX40 (GS_CDX40, ELR-40): GDM_Array_HipDispersion_BTM_P20
- DesertTechHTI (GS_DesertTechHTI, Interdictor): GDM_Array_HipDispersion_BTM_P20
- L115A3 (GS_L115A3, L115): GDM_Array_HipDispersion_BTM_P20
- M2010ESR (GS_M2010ESR, M2010 ESR): GDM_Array_HipDispersion_BTM_P20
- MRAD (GS_MRAD, PSR): GDM_Array_HipDispersion_BTM_P20
- MiniFix (GS_MiniFix, Mini Scout): GDM_Array_HipDispersion_BTM_P20
- SV98M (GS_SV98M, SV-98): GDM_Array_HipDispersion_BTM_P20
- AK205 (GS_AK205, AK-205): GDM_Array_HipDispersion_BTM_P20
- HK417A2 (GS_HK417A2, M417 A2): GBM_Increase_ADS_35_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- M4A1 (GS_M4A1, M4A1): GBM_Increase_ADS_45_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- MSBSGROTB (GS_MSBSGROTB, GRT-BC): GDM_Array_HipDispersion_BTM_P20
- QBZ192 (GS_QBZ192, QBZ-192): GBM_Increase_ADS_45_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- SCARSC (GS_SCARSC, SOR-300SC): GDM_Array_HipDispersion_BTM_P20
- SIG553R (GS_SIG553R, SG 553R): GDM_Array_HipDispersion_BTM_P20
- XM7 (GS_XM7, M277): GBM_Increase_ADS_35_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- ARADMR (GS_ARADMR, LMR27): GDM_Array_HipDispersion_BTM_P20
- M39EMR (GS_M39EMR, M39 EMR): GDM_Array_HipDispersion_BTM_P20
- MSBSGROTCPS (GS_MSBSGROTCPS, GRT-CPS): GDM_Array_HipDispersion_BTM_P20
- SVCh (GS_SVCh, SVK-8.6): GDM_Array_HipDispersion_BTM_P20
- SVDM (GS_SVDM, SVDM): GDM_Array_HipDispersion_BTM_P20
- M240L (GS_M240L, M240L): GBM_Increase_ADS_30_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- M250 (GS_M250, M250): GBM_Increase_ADS_35_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- M27IAR (GS_M27IAR, DRS-IAR): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- M60E6 (GS_M60E6, M/60): GBM_Increase_ADS_30_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- MG4K (GS_MG4K, M123K): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- MG5 (GS_MG5, M121 A2): GBM_Increase_ADS_30_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- Minimi (GS_Minimi, L110): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- RPK74M (GS_RPK74M, RPK-74M): GBM_Increase_ADS_50_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- RPKM (GS_RPKM, RPKM): GBM_Increase_ADS_35_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20
- Ultimax (GS_Ultimax, KTS100 MK8): GBM_Increase_ADS_40_BTM_Bipod, GDM_Array_HipDispersion_BTM_P20


## Command run
Working directory: C:/Users/royal/AppData/Local/Temp/claude/C--Users-royal-Documents-BF6-Datamining/d7ba6e97-39eb-4dc9-9d63-37248eaa6487/scratchpad/bipod-all
Command: python -I "C:/Users/royal/AppData/Local/Temp/claude/C--Users-royal-Documents-BF6-Datamining/d7ba6e97-39eb-4dc9-9d63-37248eaa6487/scratchpad/bipod-all/walk_bipod_all.py"

Script: bipod-all/walk_bipod_all.py. Outputs: bipod-all/table_and_lists.md, bipod-all/results.json (per-weapon bindings, under-selector and all), bipod-all/report.md (this file).
