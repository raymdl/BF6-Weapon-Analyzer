# Game bug list: method and non-bug findings

This file holds the accepted text, the scan candidates that are not bugs, and the review method
for the [game bug list](ATTACHMENT_BUGS.md). Entry numbers refer to that list or to the [resolved entries](ATTACHMENT_BUGS_RESOLVED.md).

## Accepted text

These are not errors. The description leaves out an effect, but the game applies the
effect consistently with the game design.

| Attachment | Weapons | In-game text | Unstated effect | Reason accepted |
|---|---|---|---|---|
| Slugs | M87A1, M1014, 18.5KS-K, DB-12 | "Shotgun ammunition containing a single large projectile for greatly improved effective range." | −1 ADS/hip recoil (applied by the site) | Applied consistently |
| 53 Rnd | PP-19 | "Helical drum magazine with increased capacity. Prevents the use of underbarrel attachments." | Slower ADS movement | Expected for a larger magazine |
| 60 Rnd | SL9 | "Extended magazine with increased capacity at the cost of movement speed while aiming down sights (ADS)." | Slower weapon draw | Expected for a larger magazine |
| 95 Rnd drum | RPK-74M | "95 round drum magazine with greatly increased capacity at the cost of weapon draw speed and reload speed." | Slower ADS time (`WPM_MAG_095Ext3_RPK74M_W50`: `WME_ADSTime_Anim_M10`, `WME_ADSTime_FOV_M10`; applied by the site) | Expected for a larger magazine |
| Linear Comp | 48 weapons (2.1.1.0) | "Reduces horizontal recoil in favor of more stable vertical recoil. …" | −1 recoil amount | Implied: vertical recoil is amount, horizontal is variation |

## Multi-package scan candidates

`python scripts/frosty-multi-package-scan.py --root <Frosty-export-root>` lists
attachment actions that select more than one modifier package. The 1.4.2.5 export
has 15 hits: three sniper Slim Angled actions (entry 1), six M121 A2/M45A1 ammo
actions (entry 2), and the items below. PSR and SV-98 select only W05, so the scan
does not list them. Each hit is a candidate for a trace and an in-game check.

### BROD 3 Alloy Vertical (Zenitco RK-2) selects two recoil packages

- **Source.** Site Alloy Vertical links two source attachments on BROD 3 and
  DRS-IAR: `ZenitcoRK1` (`U_WPM_BTM_Vertical01_W20` only) and `ZenitcoRK2`
  (`Vertical01_W20` + `Vertical03_W20`). `GS_BREN3` binds both selectors to the
  same `GRM_Recoil_BTM_P20` (entries 7 and 11). `GS_M27IAR` has no binding for
  `Vertical03_W20`.
- **In-game.** 13 September BROD 3 preview: Alloy Vertical Control 40 (tier 2
  predicts 40.45); QD Grip Pod over Alloy Vertical 43 (tier 3 predicts 43.1)
  ([QD Grip Pod review](../reference-data/provenance/qd-grip-pod-screenshot-review-2026-09-13.json)).
- **Status.** Resolved: no stacking. Site +2 is correct.

### Traced without a gameplay effect (14 September)

| Source action | Extra package | Trace | Offered | Status |
|---|---|---|---|---|
| RPK-74M `MAG_Compact1` (30 Rnd) and `MAG_Compact2` (30 Fast) | `U_WPM_MAG_030Cpt1_RPKM_W05`, `U_WPM_MAG_030Cpt2_RPKM_W10` | No WB modifier in `RPK74M_WB` and no GS binding in `GS_RPK74M`. The RPK-74M packages supply all effects, and site values match them. | Yes | Leftover selector with no source effect |
| PP-19 `MAG_Compact1` (25 Rnd) | `U_WPM_MAG_025Cpt1_UMP40_W05` | No WB modifier and no GS binding on PP-19. The PP-19 package is otherwise the same as the UMP-40 25 Rnd package. | No: audit panels 36-40 show only 30, 30 Fast, 35, 20 Fast and 53 Rnd; not on the site | Source-only branch |
| GRT-CPS `ERG_BurstFireEnable` ("Burst Training") | `U_WPM_ERG_BurstFireActive` + `BurstFireReplace_W10` | `BurstFireActive` has no WB modifier; `GS_MSBSGROTCPS` binds it to `GRM_RecoilConversion_ERG_P10` and `GRM_Recoil_ERG_P20`, the recoil modifiers used by GRT-BC Burst Mode. | No: audit panels 57-58 show only None and Aftermarket Buffer; the site offers only the Buffer | Source-only branch |

None of these changes game or site behavior. Recheck them if a later build offers
the PP-19 25 Rnd magazine or GRT-CPS burst fire, or binds the extra packages.

### Wiring survey candidates that are not errors (17 October 2026)

The [wiring survey](../reference-data/provenance/attachment-wiring-survey-2026-10-17.md)
(section 3) lists attachments whose bindings differ from the same-named attachment on 10 or
more other weapons. Triage against the site data and the stat-screen audit:

| Candidate (survey section) | Finding | Status |
|---|---|---|
| AK4D Light Barrel; SOR-556 Mk2 M4QD Flash Hider; M2010 ESR `MZL_Muzzle`; M/60 Improved Mag Catch (3a) | The progression has no ability branch. The audit panels list no such choice: the AK4D has six barrels without a Light barrel, and the SOR-556 Mk2 and M2010 ESR Flash Hider panels show their own effects. The M/60 has no Ergonomics choices in the audit. | Unused source attachments; not offered, not on the site |
| DB-12 `BTM_CMR201`, `HolosunRMLt`, `LMDPEIR1`, `Perst1`, `SFX300`, `SFX400`, `X5LG3` (3a); DB-12 QBZ Grip Pod, GPS2 and QD Grip Pod without hip dispersion or bipod package (3c) | Bottom-rail lights, lasers and grip pods that the DB-12 does not offer. Its lasers and lights come from the RGT/TOP attachments, which bind effects (panels: Taclight and Flashlight hip-fire 39 to 42; lasers). The DB-12 has no grip pod in the audit. | Not offered |
| DB-12 50 MW Violet (ANPEQ16B) binds `WPM_RGT_LightLaser` instead of the TOP violet package (3c, 3d) | The package differs but the panel shows the benefit: Mobility rises 60 to 66 (moving-ADS accuracy is in the Mobility score; 45 other weapons rise 4). The site applies +1 moving-ADS accuracy. | Panel shows the effect; no change |
| M433 and M44 Match Trigger (3b, 3c); DEVGRU Match Trigger extra (3c) | In 2.1.1.0 the selector `U_WPM_ERG_MatchTrigger_W15` is bound by nothing on the M433 and M44, while 26 weapons bind a WB-local effect and the DEVGRU binds the two GS effects directly. The Frosty research traced the HK433 through a WB-local target to an embedded identifier (L17, L24, 24 September, 1.4.x builds), so whether the 2.1.1.0 gap is real or the survey misses that route was not re-traced here. Since 24 October the site applies the Match Trigger's `semiAuto` block while the selected fire mode is semi-automatic, on every weapon that offers it, the M433 included ([attachment model](ATTACHMENT_MODEL.md)); all 24 audited panels show no Match Trigger effect. | Known; not re-traced for 2.1.1.0; no site impact |
| DRS-IAR Zenitco RK2 (3b) | `GS_M27IAR` has no binding for `Vertical03_W20`. | Known; resolved above (BROD 3 Alloy Vertical) |
| RPK-74M 30 Rnd and 30 Fast; PP-19 25 Rnd (3b, 3c) | Leftover selectors from other weapons; the weapons' own packages supply all effects. | Known; see the traced table above |
| M121 A2 and M45A1 Hollow Point, Frangible (3c) | The extra FMJ penetration step. | Entry 2 |
| M121 A2 50 Fast (3c) | Lacks `WME_ReloadSpeedRegular` and carries its own `WPM_MAG_MG5_Fast`. Panel: reload 6.267 s to 5.55 s. | Applied; no change |
| Z84M 100 Agil (3c) | Binds moving-ADS accuracy only: no capacity, draw, sprint or ADS-time effect. The text names only moving-ADS accuracy, and the site (`WEAPON_MAG.z84m`) matches. Not in the audit. | Text matches source |
| M240L 75 Rnd and 100 Rnd; GGH-22 22 Rnd (3c) | Per-weapon magazine packages. The M240L 75 Rnd text names draw speed, moving-ADS accuracy and reload, and the GGH-22 22 Rnd text names draw speed; both match the package and the site. | Text matches source |
| Mini Scout Short Barrel (3c) | No `GID_ADSTime_BRL` binding. Panel ADS time 250 ms equals Basic (Extended 300 ms), so the benefit is applied and the site's tier (1) matches. | Panel shows the effect; no change |
| Mk 24 Hybrid Suppressor L, S, K (3c) | `GS_MRGGA` binds `GID_ADSTime_MZL_M10` for the three Magnus suppressor packages, which the same suppressors bind on none of 42 other weapons. Operator panels (17 October, `reference-data/attachment-audit/Weapon Attachments/Assault Rifle/Mk 24/Muzzle 2026-10-17/`): ADS time 250 ms with no muzzle and with each of the three; the other changes follow the texts (L: Hipfire 40 to 34, Mobility 52 to 50, sprint recovery 167 to 200 ms; S: Hipfire 34 only; K: none; all three Precision 24 to 25, Control 38 to 40, recoil 0.8° to 0.7°, spot ranges 0 and 21 m). A 120 fps recording of three hip-to-ADS transitions per muzzle with the Mini Flex ([measurement](../reference-data/provenance/mk24-hybrid-suppressor-ads-time-2026-10-17.md)) gives 40 frames (333 ms) to the settled frame for None, L, S and K alike, and 35 to 38 frames for ADS-to-hip; the offset from the panel's 250 ms is the settle criterion and is the same in all four. The site applies no muzzle ADS-time step. | Panel and recording show no effect; no change |
| 18.5KS-K Magpul AFG (3c) | Extra `GDM_Array_ADSMoveDispersion_BTM_M10`. The same finding as the Slim Angled candidate rejected on 21 September (see below). | Rejected earlier |
| M417 A2 and USG-90 Subsonic variants (3d) | `WPM_AMO_Subsonic` replaces `WME_MuzzleVelocity`. Panel velocity 560 to 273 m/s and 543 to 265 m/s. | Applied; no change |
| Bolt-action recoil and bipod substitutions (3d) | `*_Bolt` assets replace the generic ones by design. | Per-weapon rule |
| KORD 6P67 and M250 Classic Vertical; VCR-2 mission light; SV-98 5 MW laser; RPK-74M and RPKM Heavy Extended; PW7A2 Lightened Suppressor; M39 EMR and M417 A2 `SP_` suppressor assets; ELR-40 and other per-weapon magazine packages; PP-19 iron sights (3c) | Extra or relocated effects behind hash names with no visible stat. The panels equal the same attachments on other weapons, and the texts name no contradicted effect. The PW7A2 Lightened Suppressor extra hip-dispersion step is the hip-fire cost its text names. The PP-19 iron sights also list the `WM_PlaceHolder_IronSights` modifiers; their semantics are not read. | No evidence of an error |

The seven uncaptured WB modifier assets in the survey (section 1) are coverage gaps and were
not triaged.

## Review method and rejected findings

**First scan (14 September).** Compared moving-ADS spread penalties and recoil
smoothing with fixed wording. It found entry 1. It also flagged Slim Angled on the
18.5KS-K, rejected on 21 September: the modifier binds outside the moving-ADS collection,
and [ADS indicator captures](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/ks18k-ads-indicator-2026-09-21.json)
show no moving penalty.

**Wide review (14 September).** 333 groups of identical description plus resolved
site modifiers, covering every muzzle, barrel, grip, laser, light, magazine, ammo
and ergonomic choice. Seven Codex CLI batches (`gpt-5.6-luna`, medium effort,
read-only) returned 107 findings. Each kept item was checked against site data,
Frosty and operator in-game review.

Rubric limit: the review assumed default magazines have all shifts at 0. Default
Regular magazines usually have draw −1, so magazine findings were rechecked relative
to the default magazine. That recheck found entry 10 and showed that 128
non-default magazines lose the Regular draw bonus; this is a consistent design
pattern, not a text error.

**Collateral check (14 September).** Entry 2 values were compared with the
attachment audit ammo screenshots for M121 A2, M45A1, L110 and GGH-22.

Withdrawn or rejected:

- QBZ-192 40 Rnd and RPK-74M 95 Rnd draw penalties: present relative to the default
  (QBZ-192 133 → 167 ms; RPK-74M 200 → 233 ms, confirmed in game).
- 40 Rnd on 15 other weapons: their text names only ADS movement, which is present.
- M/60 50 Rnd and M240L 75 Rnd "improves weapon draw speed": the default magazines
  (M/60 100 Rnd, M240L 50 Rnd) state the same improvement and have the same draw
  bonus, so draw speed does not change between them. Screenshots show the same
  sprint recovery. Only the M240L 100 Rnd loses the bonus, and its text does not
  claim improved draw speed.
- 35/40 Rnd fast magazines (AK-205, CZ3A1, KORD 6P67): "at the cost of movement and
  weapon draw speed" covers the ADS movement penalty.
- Magazine sway, moving-ADS accuracy and reload benefits under "handling" (see below).
- Lower collateral on non-penetration ammo; shotgun pellet hip spread.
- Match Trigger and speedloader tubes (M1014 4
  Rnd fast, M87A1 5 Rnd fast: "rapid reloading on low ammo") are mechanics the site
  does not model.
- Codex readings that treated `movingAdsSpreadTierMod: +1` as worse.
- AK4D 20 Rnd fast and SV-98 Lightened Suppressor text claims: the site links were
  wrong, not the game text.
- Former entry 5, Subsonic and Sub HP on the P18, GGH-22 and ES 5.7 (removed
  14 October 2026). The site text claims "Marginally lowers recoil", but the in-game
  text on these sidearms makes no recoil claim (attachment audit screenshots, July 2026,
  and P18 panels of 14 October 2026), and recoil is unchanged against FMJ (P18 1.2°,
  Control 23). The site linked the shared SMG text; the game is consistent. Since
  14 October the site shows the panel text on the three sidearms (reviewed panel rows).

### "Handling" wording

All 61 current uses (2.1.1.0) are magazines. Across weapons, "improved handling"
covers any combination of faster sprint recovery (51 pairs), faster deploy (51),
faster ADS (47), faster ADS movement (47), less sway (47), better moving-ADS
accuracy (44) and faster reload (29); these sub-counts are from 1.4.x. Magnitudes differ by weapon. RPKM 75 Rnd says "at the
cost of weapon handling" but only has ADS move +1. These counts use absolute
magazine shifts, not values relative to the default magazine.
