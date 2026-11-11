# Game bug list rechecks

This file records how each entry in the [game bug list](ATTACHMENT_BUGS.md) was rechecked after each game update.
The newest build is first, with one section per build.
Resolved entries are in [ATTACHMENT_BUGS_RESOLVED.md](ATTACHMENT_BUGS_RESOLVED.md).

## 2.1.2.0 recheck, 10 November 2026

Update 2.1.2.0 (Casino Heist) is a new build with new type layouts, so every changed file was
decoded old against new with each build's own descriptors. Each entry was matched against the
5,263 changed and 2,874 removed routes and the patch-note lines; the entries whose files changed
were read field by field. Earlier in-game measurements were not repeated. Run folder:
`reports\weapon-analyzer-research\2026-11-10-update-2120-post` (`F-bugs`, `F-judge`).

| Entry | 2.1.2.0 result |
|---|---|
| 1 | **Resolved** (not in the patch notes). The Slim Angled action on PSR, SV-98, L115, Mini Scout, Interdictor and ELR-40 now selects only `U_WPM_BTM_FastBOLT02_W15`, the M2010 ESR package; the Full Angled action keeps `FastBOLT01_W05`. Confirm in game that the moving-ADS penalty is gone. |
| 2 | **Resolved for the M121 A2**: its three ammo selectors lost the FMJ step. **Still present on the M45A1.** |
| 3 | **Resolved: description corrected** (multiplayer copies, 10 Nov). All nine SMGs link `AD_MagpulAFG_PWD` (263642D4), which has no draw claim; the package is unchanged. The first reading of this row used the campaign copies of the name lists (see the note under this table). Confirm in game. |
| 4 | Untouched; retained. |
| 6 | `GS_PP19` changed by a shared camera-recoil addition only; still no smoothing binding for the Flash Comp package. Retained. |
| 7 | **Resolved: description corrected.** The 200-Round Belt Box text no longer claims the moving-ADS penalty. |
| 8 | **Resolved: description corrected** (multiplayer copies and operator in game, 10 Nov). `AD_MP7A2_MAG_030Fast` holds A4B86155, "Standard magazine with mag pull for faster reloads."; the magazine's only effect is still reload x1.13. The first reading of this row used the campaign copy, which still holds the Regular magazine text (45D0A836). |
| 9 | **Resolved: description corrected.** The SGX Extended Barrel text (`AD_MPX_BRL_Extended`, string C1F220B3) now reads "Long barrel that increases projectile velocity." without the ADS claim. (Corrected 10 Nov: the recoil-and-slower-ADS text first recorded here, D0910A6F, is the GRT-BC Extended Barrel's.) |
| 10 | **Re-judge in game.** Text link settled (AD-file scan, 10 Nov): description D86958EB, only in `AD_Ultimax_MAG_050Cpt2`, unchanged. The effects changed: the 50 Rnd lost its reload x1.13; against the default 60 Rnd it now improves sway (x0.667) only and adds moving-ADS dispersion +1 (draw and sprint equal the default's). Whether "improved handling" is still wrong needs the panel; in-game check listed. |
| 11 | Re-read from raw: `RPK74M_WB` and `L115A3_WB` still link the six base optic parts at 55; the WB change is one added sight import. Retained. |
| 12 | **Resolved.** `GS_L115A3` binds hip-spread +1 for the Standard Suppressor. |
| 13 | **Resolved for L115 and Interdictor** (`GRM_Recoil_AMO_Bolt_M10`, six steps). The Mini Scout still stacks seven: retained for it. |
| 14 | `GS_M16A3` and `GS_VSSM` changed by priority renumbering and the shared camera-recoil addition only. Retained; burst activation still open. |
| 15 | Re-read from raw: `ReloadTime` 3.284 s on both, unchanged. Retained. |
| 16 | Untouched; retained. |
| 17 | 75 m in-world and 150 m minimap unchanged on all four. Retained. |
| 18 | Hollow Point 5 and Frangible 20 unchanged; the "corrected" patch-note line has no stored effect. Retained. |
| 19 | **Resolved.** One ADS and one hip recoil step; the six-step binding is gone. |
| 20 | **M121 A2 case resolved** (Tungsten index 10 to 9). The ELR-40 Single Shot case is retained. |
| 21 | No binding of the three grips changed. Retained. Side find: `U_WPM_BTM_Vertical02_W30` (the Rubberized Vertical, live in this build) now binds `GRM_Recoil_BTM_P30` on the Mk 24 and Z84M. |
| 22 | Untouched; retained. |
| 23 | Untouched; retained. |
| 24 | `PD_.375EnABELR_API` decodes identically; the hash change is layout only. Retained. |
| 25 | Untouched; retained. |
| 26 | `GBM_NoIncrease_Semi_P00` still 0 in `GS_EF88`, `GS_BREN3` and `GS_MRGGA`. Retained. |
| 27 | Untouched; retained. |
| 28 | Untouched; retained. |

**Campaign copies (found 10 November 2026).** The capture held the campaign copy of 51 name lists (`AAM_*`), 741 attachment descriptors (`AD_*`) and the main UI metadata files; the multiplayer game reads another copy of the same name. Every text link in the rows above and in the earlier builds' sections was read from the campaign copies. The multiplayer copies are in `builds\2.1.2.0\reports\mp-copies-2026-11-10` (research repo `scripts/frosty-mp-copies.py`); rows 3 and 8 were re-read from them. Entries 4, 6, 10 and 16 keep the same description text in the multiplayer copies.

The multi-package scan drops from 16 to 9 actions: the Magpul AFG BOLT multi-package on CDX40,
Interdictor, L115 and Mini Scout and the MG5 Frangible, Hollow Point and Tungsten actions are gone.
The attachment wiring check lists 56 suspects gone and 43 new (`G-generators\diffs`), most from
the new attachments.

## 2.1.1.0 recheck, 13 October 2026

Update 2.1.1.0 (Season 5) is a new build. Entries 1 to 16 were rechecked against the raw
before/after comparison with 1.4.3.5; the earlier in-game measurements were not repeated.
None is resolved. Entries 17 to 21 and 23 are new in this build (23 added later on 13 October); entry 22
is older and newly listed. Entries 24 to 26 were added on 17 October.

What was compared:

- **Modifier packages.** No package behind any entry changed. The only changed package files
  in the build are `WPM_SCP_ElcanDR` and `GRM_Recoil_Controller_03`; neither belongs to an
  entry.
- **Weapon files.** The `GS_`, `_WB` and `_Ability` files of the listed weapons changed only
  by additions for two new foregrips (`WPM_BTM_Actuated_W10`, `WPM_BTM_VerticalGrip02_W30`)
  and the `GRM_Recoil_BTM_P30` binding, on the weapons that received them. Not every weapon
  did: the Actuated Module has an attachment record on 36 of the 63 existing weapons. `GS_L115A3` is
  byte-identical.
- **Descriptions.** 1,004 AD assets were resolved; 55 changed raw bytes and 4 changed a label
  or description. None of the 4 belongs to an entry: the three low-zoom variable optic
  accessories ("Low-Zoom" is now "Low-Zoom 4x") and the VSSM 10 Rnd magazine, whose
  description now reads "Compact magazine for improved handling at the cost of capacity."
- **Patch notes.** No fix line names a listed entry.

| Entry | 2.1.1.0 result |
|---|---|
| 1 | No source/text change; sniper selector status retained. |
| 2 | No source/text change; extra FMJ selector status retained. |
| 3 | No source/text change; absent SMG draw effect retained. |
| 4 | No source/text change; PP-19 fast-magazine reload status retained. |
| 6 | No source/text change; PP-19 smoothing omission retained. |
| 7 | Belt-box packages unchanged; moving-ADS status retained. `Minimi_WB` lost its `CMU_MatchTrigger` entry and its in-world spot base changed (entry 17); neither touches the belt box. |
| 8 | No source/text change; PW7A2 text mismatch retained. |
| 9 | No source/text change; SGX text mismatch retained. |
| 10 | No source/text change; KTS100 relative-to-default status retained. |
| 11 | Re-read from raw: all 23 optic-FOV source assets keep their links and values. The RPK-74M and L115 still link the six base optic parts at render FOV 55 where other long guns link riser parts at 40 (CQ RDS 44). The Mk 24, ELR-40, Z84M and RSPR link riser parts. Visual status retained. |
| 12 | `GS_L115A3` byte-identical; suppressor binding omission retained. |
| 13 | No source/text change; source-specific tungsten penalties retained. |
| 14 | No source/text change; burst activation remains open and still needs an in-game recheck. |
| 15 | Re-read from raw: both empty-reload entries still store `ReloadTime` 3.284 s against 3.2 s (SOR-300SC) and 3.034 s (GRT-CPS) in `ReloadTimeBulletsLeft` and at the end of the phase list. No reload value changed on any weapon; the four new weapons agree on all three values. Retained. |
| 16 | No source/text change; BROD 3 iron-sight sway omission retained. |
| 17 | New. See the entry. |
| 18 | New. See the entry. |
| 19 | New. See the entry. |
| 20 | New. See the entry. |
| 21 | New. See the entry. |
| 22 | Present before this build; listed now. The keyed row changed from 1 to 100, the panel did not. |
| 23 | New. See the entry. |
| 24 | New (17 October). See the entry. |
| 25 | New (17 October). See the entry. |
| 26 | New (17 October). See the entry. |

The multi-package scan returns the same 15 candidates, none with a changed input.
Re-reading 629 magazine operands supports 287 selections relative to their defaults, with
no change. The retained selector graph is built from the 1.4.3.0 export, so it does not
cover attachments added in this build.

Site values changed for this build that are not bug corrections: SVDM recoil direction 4 to 20
and recoil decrease time exponent 0.75 to 1.1; M39 EMR exponent 0.75 to 1.0; controller
recoil multiplier 0.8836 to 0.95; VSSM 10 Rnd description; in-world spot base 75 m on the
four weapons of entry 17.

## 1.4.3.5 recheck, 30 September 2026

Source and description status is unchanged for each row below. This retains the
existing classifications; it does not repeat the earlier in-game measurements.
The [dated receipt](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/provenance/frosty-update-1.4.3.5-2026-09-30.json)
pins `attachment-bug-recheck.json` and `raw-content-review.json` in the open build's
reports folder. They give the selected source routes and both raw hashes.

| Entry | 1.4.3.5 result |
|---|---|
| 1 | No source/text change; sniper selector status retained. |
| 2 | No source/text change; extra FMJ selector status retained. |
| 3 | No source/text change; absent SMG draw effect retained. |
| 4 | No source/text change; PP-19 fast-magazine reload status retained. |
| 6 | No source/text change; PP-19 smoothing omission retained. |
| 7 | No source/text change; belt-box moving-ADS status retained. |
| 8 | No source/text change; PW7A2 text mismatch retained. |
| 9 | No source/text change; SGX text mismatch retained. |
| 10 | No source/text change; KTS100 relative-to-default status retained. |
| 11 | No source change in the 23 retained optic-FOV source assets; visual status retained. The announced PS5 optic-edge change is separate. |
| 12 | No source/text change; L115 suppressor binding omission retained. |
| 13 | No source/text change; source-specific tungsten penalties retained. |
| 14 | No source/text change; burst activation remains open. |
| 15 | No source/text change; retained reload timing interpretation unchanged. |
| 16 | No source/text change; BROD 3 iron-sight sway omission retained. |

Current label/description roles were resolved for 1,004 AD assets. Their raw bytes
and the complete English localization file are unchanged. All AD metadata retains
layout ambiguity, so unchanged decoded fields alone do not prove correct decoding.
The multi-package scan returns 15 candidates, not new confirmed bugs. Re-reading
629 magazine operands supports 287 selections relative to their actual defaults;
KTS100 50 Rnd and default 60 Rnd match in all five checked handling fields. Reload
and sway were not newly measured. Three unrelated Blacklight inputs lack current
raw coverage in the retained selector graph. No site numeric value was changed.

## 1.4.3.0 recheck, 15 September 2026

**Source side: no entry changed.** Every asset behind entries 1 to 10 is byte-identical
to the 1.4.2.5 capture. Only three `GS_` assets changed in the whole build (`GS_VSSM`,
`GS_RagingHunter`, `GS_TRR8`) and none of them belongs to a listed bug. No Slim Angled,
magazine, ammo, barrel, Flash Comp or belt-box modifier changed. The one changed
`Attachment_` asset is the Interdictor iron sights, whose point cost moved from 5 to 15
as the patch notes state; that is a stated change, not a bug.

**Description side: also unchanged.** Frosty could not read the attachment metadata for
this build, because `SharedTypeDescriptors.ebx` changed while `BF6SDK.dll` did not and
`Class_535682be` no longer resolves. The raw EBX was decoded instead with
`scripts/frosty-ebx-decode.py`, which takes its layout from the build's own descriptors
and does not use the SDK. Result: **234 of the 248 changed `AD_*` assets have a
byte-identical set of string references**. The 14 that changed only removed references and
added none, and every removed string is a fixed magnification chip ("4.50", "3.00", "2.00",
"1.00", "1.00-6.00", "1.25") or a fire-mode or sight label ("Single Fire", "Burst",
"Full Auto", "Bolt Action", "Pump Action", "Iron Sights") — all among the 73 strings
deleted from `fs_us_loc` in this build.

On 16 September, the recorded attachment label and description IDs were also resolved
against both builds' English strings tables: none changed text or disappeared. This
supports retaining entries 8, 9 and 10. The string-reference comparison alone was not
sufficient, and no new live-panel captures were made for the three reviewed tooltips.

Neither conclusion depends on the stale SDK: the source side rests on unchanged asset
hashes, and the description side on an SDK-independent decode. Evidence:
`reference-data/provenance/frosty-1.4.3.0-source-comparison-2026-09-15.json` and
`reference-data/provenance/frosty-1.4.3.0-sdk-independent-decode-2026-09-15.json`.
