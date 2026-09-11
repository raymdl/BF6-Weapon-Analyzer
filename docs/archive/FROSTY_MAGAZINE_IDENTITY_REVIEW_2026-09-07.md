# Magazine identity review — 7 September 2026

**Subsequent implementation:** the [magazine model update](FROSTY_MAGAZINE_MODEL_UPDATE_2026-09-07.md) applies the supported RPK-74M effects, completes the remaining magazine sweep, and records the bounded shotgun reload investigation. The identity findings below remain the basis for those changes.

The 13 ambiguous bindings are now separated into four resolved shotgun site identities, three extra unmatched selector bindings, and six source-only candidates absent from the captured menus. The two RPK-74M parent attachments are identified through their resolved sibling selectors. No magazine capacity, point, availability, or simulation value was changed.

[Structured evidence](../../reference-data/provenance/frosty-magazine-identity-review-2026-09-07.json) contains all 13 decisions, 12 directly inspected screenshots with hashes, source effect objects, Ability branches, and source hashes. The older audit JSON was used as an index, then each relevant image was inspected. Its provisional whole-row review status was not promoted.

## All 13 decisions

| Weapon | Source attachment / selector | Result | Site identity |
| --- | --- | --- | --- |
| PSR | Attachment_MRAD_MAG_Fast / U_WPM_MAG_Fast_W10 | source-only-not-observed-in-capture | No new site selection |
| SV-98 | Attachment_SV98M_MAG_Fast / U_WPM_MAG_Fast_W10 | source-only-not-observed-in-capture | No new site selection |
| SOR-300SC | Attachment_SCARSC_MAG_Extended3 / U_WPM_MAG_045Ext3_556_W35 | source-only-not-observed-in-capture | No new site selection |
| SOR-300SC | Attachment_SCARSC_MAG_Extended3Fast / U_WPM_MAG_045Ext3Fast_556_W40 | source-only-not-observed-in-capture | No new site selection |
| RPK-74M | Attachment_RPK74M_MAG_Compact1 / U_WPM_MAG_030Cpt1_RPKM_W05 | unresolved-extra-binding-parent-resolved | 30_rnd |
| RPK-74M | Attachment_RPK74M_MAG_Compact2 / U_WPM_MAG_030Cpt2_RPKM_W10 | unresolved-extra-binding-parent-resolved | 30_fast |
| ES 5.7 | Attachment_FiveSeven_MAG_Fast / U_WPM_MAG_Fast_W10 | source-only-not-observed-in-capture | No new site selection |
| M87A1 | Attachment_590A1_MAG_Compact1 / U_WPM_MAG_006Cpt1_590A1_W05 | resolved-site-identity | 5_rnd |
| M87A1 | Attachment_590A1_MAG_Compact3 / U_WPM_MAG_006Cpt3_590A1_W20 | resolved-site-identity | 5_fast |
| M1014 | Attachment_M1014_MAG_Compact1 / U_WPM_MAG_005Cpt1_M1014_W05 | resolved-site-identity | 4_rnd |
| M1014 | Attachment_M1014_MAG_Compact2 / U_WPM_MAG_005Cpt2_M1014_W05 | resolved-site-identity | 4_fast |
| PP-19 | Attachment_PP19_MAG_Compact1 / U_WPM_MAG_025Cpt1_PP19_W05 | source-only-not-observed-in-capture | No new site selection |
| PP-19 | Attachment_PP19_MAG_Compact1 / U_WPM_MAG_025Cpt1_UMP40_W05 | unresolved-extra-binding-parent-identified | No new site selection |

## M87A1 and M1014: identities resolved

| Weapon | Attachment | Source record | Points | Screenshot MAG | Reload | ADS | ADS move | Sprint recovery | Source variant field |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M87A1 | 5 Shell Tube | Compact1 | 5 | 6 | 1.334 s | 200 ms | 0.67 | 133 ms | 99 |
| M87A1 | 5Rnd Speedloader | Compact3 | 20 | 6 | 1.334 s | 200 ms | 0.67 | 133 ms | 5 |
| M1014 | 4 Shell Tube | Compact1 | 5 | 5 | 1.784 s | 200 ms | 0.67 | 133 ms | 99 |
| M1014 | 4Rnd Speedloader | Compact2 | 10 | 5 | 1.784 s | 200 ms | 0.67 | 133 ms | 4 |

The title identifies tube capacity, while the screenshot MAG field includes one additional chambered shell. Source capacity fields are 6 and 5 respectively. Both screenshots explicitly describe the speedloader as allowing rapid reloads on low ammo. Equal displayed reload times therefore do not make these duplicate identities.

The distinguishing source field is `Class_e7d2410a/Field_bd024e1d`: ordinary tube 99, speedloader 5 or 4. This is consistent with a reload-state/count setting, but its exact semantic name and native condition are not established. It is not evidence for a universal 1.13 reload-speed multiplier. The existing site correctly retains reloadSpeedTier 0 for these entries.

M1014 Compact2 has actual attachment cost 10 although the unlock filename ends W05. The screenshot card also shows 10. This is why filename suffixes cannot be used as prices.

## RPK-74M: parent identities resolved; extra bindings remain unmatched

Compact1 uses the resolved RPK74M 030Cpt1 selector and maps to 30 Rnd. Compact2 uses RPK74M 030Cpt2 and maps to 30 Fast. Each also has an RPKM-named selector with no matched effects. Those two extra links remain graph issues, but they no longer block identifying the parent magazine.

| Magazine | Points | Capacity | Reload | ADS | ADS move | Sprint recovery |
| --- | --- | --- | --- | --- | --- | --- |
| 30 Rnd | 5 | 30 | 2.784 s | 250 ms | 0.67 | 167 ms |
| 30 Fast | 10 | 30 | 2.464 s | 250 ms | 0.67 | 200 ms |

The resolved source capacities are 31 including chamber. The fast selector adds reload speed x1.13: 2.784 / 1.13 is approximately 2.464 s. The source also distinguishes sprint/draw tiers (-2 ordinary versus -1 fast). This agrees with the photographed sprint difference.

Both resolved selectors have moving-ADS spread tier +1 and sway tier -1. The subsequent magazine update applies those fields locally to 30 Rnd and 30 Fast. Neither effect is measured by the magazine screenshot numeric panel, and the extra unmatched binding is not assumed to contribute anything.

## SOR-300SC: 45-round records are additional variants

The captured selector has 20 Fast, 20 Rnd, 30 Rnd, 30 Fast, 36 Rnd, 40 Rnd, and 40 Fast. The 40-round selections already have exact source records:

| Captured selection | Source attachment | Selector family | Points | Reload |
| --- | --- | --- | --- | --- |
| 40 Rnd | Extended2 | 040Ext2_556 | 25 | 2.250 s |
| 40 Fast | Extended2Fast | 040Ext2Fast_556 | 30 | 1.991 s |

The two formerly ambiguous records are Extended3 / 045Ext3_556 (35 points) and Extended3Fast / 045Ext3Fast_556 (40 points). They encode capacity 46 including chamber, meaning 45 in the magazine convention used here. They are separate source-only candidates, not alternative mappings for the photographed 40-round magazines. The generic fast multiplier is x1.13, consistent with 2.250 / 1.13 = 1.991 s. No change from 40 to 45 or from 25/30 to 35/40 is justified for the current entries.

The screenshots prove the captured menu had no 45-round cards. They do not prove the variants are unavailable in the current game. Exported killswitch defaults are false, but that does not establish activation.

## PP-19: 20 Fast is not the 25-round source record

The captured 20Rnd Fast Mag maps to Attachment_PP19_MAG_Compact2 / 020Cpt3_PP19. The source capacity is 21 including chamber. Screenshot values are 5 points, 20 rounds, reload 2.467 s, ADS 167 ms, ADS move 1.00, and sprint recovery 133 ms. The source selector contains no reload-speed effect despite the Fast title, consistent with the existing site exception.

Attachment_PP19_MAG_Compact1 instead selects 025Cpt1_PP19, capacity 26 including chamber, plus an empty UMP40 selector. It is a separate 25-round source candidate, not a replacement for 20 Fast. Its source effects include ADS-move tier -2, draw/sprint tier -1, and moving-ADS spread tier +1. Its exported killswitch default is true; live overrides and the activation predicate are not established. The screenshot menu contains no 25-round card.

The empty UMP40 binding remains unmatched. It supplies no evidence for another magazine and must not be assigned the 20 Fast stats.

## PSR, SV-98 and ES 5.7: generic Fast candidates absent from captured menus

| Weapon | Complete magazine menu visible in capture | Selected baseline reload | Extra source record |
| --- | --- | --- | --- |
| PSR | 10 Rnd, 7 Rnd | 3.350 s | Fast, 10 points, reload speed x1.13 |
| SV-98 | 10 Rnd | 2.984 s | Fast, 10 points, reload speed x1.13 |
| ES 5.7 | 20 Rnd, 30 Rnd | 2.017 s | Fast, 10 points, reload speed x1.13 |

These generic Fast records supply a reload modifier, not a new capacity. There is no photographed Fast card to map. Treat them as source-only candidates absent from the historical capture, not missing site magazines. All three exported killswitch defaults are false; this alone does not prove availability.

## What remains uncertain

- Current-game availability of the six source-only candidates. The older screenshots establish the captured state only.
- The native reload condition and timing for shotgun speedloaders. Identity is resolved; mechanical implementation is not.
- The three extra unmatched bindings (two RPKM and one UMP40). Their parent records can be identified without inventing effects for these links.

## Screenshot evidence

- PSR — [10Rnd Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/PSR/31_PSR_Magazine_10Rnd_Magazine.png)
- SV-98 — [10Rnd Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/SV-98/30_SV-98_Magazine_10Rnd_Magazine.png)
- M1014 — [4Rnd Speedloader](../../reference-data/attachment-audit/Weapon%20Attachments/Shotgun/M1014/34_M1014_Magazine_4RND_SPEEDLOADER.png)
- M1014 — [4 Shell Tube](../../reference-data/attachment-audit/Weapon%20Attachments/Shotgun/M1014/35_M1014_Magazine_4_SHELL_TUBE.png)
- M87A1 — [5 Shell Tube](../../reference-data/attachment-audit/Weapon%20Attachments/Shotgun/M87A1/34_M87A1_Magazine_5_SHELL_TUBE.png)
- M87A1 — [5Rnd Speedloader](../../reference-data/attachment-audit/Weapon%20Attachments/Shotgun/M87A1/35_M87A1_Magazine_5RND_SPEEDLOADER.png)
- ES 5.7 — [20Rnd Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Sidearm/ES%205.7/17_ES%205.7_Magazine_20Rnd_Magazine.png)
- PP-19 — [20Rnd Fast Mag](../../reference-data/attachment-audit/Weapon%20Attachments/SMG/PP-19/39_PP-19_Magazine_20Rnd_Fast_Mag.png)
- SOR-300SC — [40Rnd Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Carbine/SOR-300SC/50_SOR-300SC_Magazine_40Rnd_Magazine.png)
- SOR-300SC — [40Rnd Fast Mag](../../reference-data/attachment-audit/Weapon%20Attachments/Carbine/SOR-300SC/51_SOR-300SC_Magazine_40Rnd_Fast_Mag.png)
- RPK-74M — [30Rnd Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/RPK-74M/48_RPK-74M_Magazine_30Rnd_Magazine.png)
- RPK-74M — [30Rnd Fast Mag](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/RPK-74M/49_RPK-74M_Magazine_30Rnd_Fast_Mag.png)

## Verification

Checked all 13 decisions, 12 screenshot files, and 77 referenced source files. Source files present in the earlier raw extraction hash register still match it. The current runtime data was read for comparison and left unchanged. No product test rerun is needed for this report-only analysis.
