# Magazine model update — 7 September 2026

Implemented locally. Not published. Nine magazine entries on three weapons receive 11 field edits. The existing model and site controls are sufficient for these changes.

[Evidence JSON](../../reference-data/provenance/frosty-magazine-model-update-2026-09-07.json) contains the full 287-selection sweep, raw comparison operations, source hashes, 24 screenshot records, before/after resolver samples, and shotgun investigation.

## Implemented changes

| Weapon / magazines | Before | After | Evidence |
| --- | --- | --- | --- |
| RPK-74M 30 Rnd and 30 Fast | Moving ADS minimum spread 0.32°; no magazine sway contribution | 0.22°; magazine sway indicator tier -1 | Resolved source selectors; identities confirmed from original screenshots |
| Mini Scout 15 Rnd, 15 Fast, 20 Rnd, 20 Fast | ADS movement 0.67 | 0.60 | Source tier +1 and all four original screenshots |
| BROD 3 36 Rnd and 40 Rnd | Sprint recovery 200 ms; draw 633 ms | Sprint recovery 167 ms; draw 533 ms | Screenshots show 167 ms; source has no extra magazine draw/sprint penalty |
| BROD 3 40 Fast | Sprint recovery 233 ms; draw 733 ms | Sprint recovery 200 ms; draw 633 ms | Screenshot shows 200 ms; source draw/sprint tier +1 |

Draw values are model outputs from the existing shared draw/sprint resolver. The screenshot panel directly confirms sprint recovery, not draw time. RPK-74M moving spread and sway are source-backed effects; they are not displayed as numeric measurements in the screenshot panel. Capacity, price, and reload times are unchanged. Sway remains the existing qualitative indicator.

## Remaining magazine check

The check covers all 287 current site magazine selections across 296 source bindings: 287 mapped, six source-only candidates absent from the historical menus, and three unmatched extra bindings. It compares 717 explicitly decoded handling/reload/spread/sway fields. It also checks nonzero site fields with no corresponding direct source field. This is not a claim that every native magazine mechanism is modeled.

Ten direct field differences remain across VSSM, M60, and PW7A2. The current resolved values match the original screenshots; copying raw shifts into their current baselines would cause errors. They remain explicit baseline/composition conflicts rather than automatic corrections.

| Case | Screenshot and retained site value | Result if the compared raw shifts were copied directly |
| --- | --- | --- |
| VSSM 10 Rnd sprint | 100 ms | 83 ms |
| VSSM 10 Fast / 20 Rnd sprint | 133 ms | 100 ms |
| M60 50 Rnd ADS / ADS movement | 367 ms / 0.60 | 300 ms / 0.75 |
| PW7A2 20 Rnd ADS movement | 0.91 | 1.00 |
| PW7A2 40 Rnd ADS movement | 0.67 | 0.82 |

The reverse check retains these existing exceptions:

- VSSM 20 Fast and 30 Rnd sprint values are 167 ms in the screenshots and current model.
- M60 100 Rnd is 433 ms ADS and 0.47 ADS movement; the current baseline/relative-magazine arrangement reproduces both standard and loose-belt screenshots.
- PW7A2 30 Rnd and 30 Fast both show 0.75 ADS movement.
- M123K and L110 200-round descriptions explicitly state reduced ADS accuracy while moving. That supports the direction of the existing penalty, not its exact numerical tier; no new numeric measurement is claimed.
- M121 A2 50 Fast shows a faster reload (5.550 s versus 6.267 s), although its direct selector has no decoded reload-speed effect. The existing x1.13 approximation produces 5.546 s. The 4 ms difference remains recorded; exact selected reload-event timing must be established before replacing the approximation.

The six source-only candidates remain excluded. Their XML presence and exported killswitch defaults do not prove current availability.

## Shotgun speedloader investigation

The source ammo configuration has Field_bd024e1d = 99 on ordinary tubes, 5 on M87A1 speedloader, and 4 on M1014 speedloader. The BF6 type Struct_598cc52c shares its GUID with the older SDK AmmoConfigData type. Its first five field positions/types align, with older position 4 named StripperClipSize. The modifier also carries the same field alongside capacity and ammo-count fields.

This supports a batch-loading-size interpretation more strongly than a generic reload-speed multiplier. It remains a cross-version structural inference: field hashes differ, and the BF6 native consumer has not been established. Do not treat 99 as a confirmed disabled value, or 5/4 as a confirmed threshold comparison.

The named BF6 reload configurations independently distinguish nonempty (minimum ammo 1) and empty (minimum/maximum ammo 0) branches:

| Weapon / branch | ReloadTime | ReloadTimeBulletsLeft | ReloadDelay | PostReloadDelay |
| --- | --- | --- | --- | --- |
| M87A1 nonempty | 1.2 | 0.7 | 0.267 | 0.367 |
| M87A1 empty | 2.3666 | 0.7 | 1.184 | 0.767 |
| M1014 nonempty | 1.067 | 0.4 | 0.534 | 0.85 |
| M1014 empty | 1.1 | 0.4 | 1.334 | 0.75 |

These are named configuration values, not validated summed reload durations. Their scheduling, overlap, repeated shell loop, and interrupt points are unresolved. Simply adding them would not establish the time until firing can resume.

The manifest contains ten first-person speedloader animation/SeqFlow assets. None is present in the local XML export:

```text
Animations/Glacier/Assets/1P/Weapons/Shotguns/590A1/A_1P_590A1_Stand_ReloadEmpty_Speedloader_01
Animations/Glacier/Assets/1P/Weapons/Shotguns/590A1/A_1P_590A1_Stand_ReloadEmpty_Speedloader_01.SeqFlow
Animations/Glacier/Assets/1P/Weapons/Shotguns/590A1/A_1P_590A1_Stand_ReloadTactical_Speedloader_01
Animations/Glacier/Assets/1P/Weapons/Shotguns/590A1/A_1P_590A1_Stand_ReloadTactical_Speedloader_01.SeqFlow
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadEmpty_Speedloader_01
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadEmpty_Speedloader_01.SeqFlow
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadEmpty_Speedloader_ADS_01
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadEmpty_Speedloader_ADS_01.SeqFlow
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadTactical_Speedloader_01
Animations/Glacier/Assets/1P/Weapons/Shotguns/M1014/A_1P_M1014_Stand_ReloadTactical_Speedloader_01.SeqFlow
```

A useful next evidence step is to export these assets and follow their event/chooser dependencies. For an in-game check, compare the ordinary tube and speedloader on each weapon with 0, 1, 2, and capacity-minus-one rounds remaining. Record ammo count before/after each insertion, time until another shot is possible, and whether an interrupted reload retains loaded shells. Repeat in ADS where the animation path differs. These are proposed checks, not tests already performed.

No stateful reload or chamber-count code was added. The current tactical-reload display remains in place until the condition and event timing are supported.

## Verification

All 14 attachment-effect tests and the 63-weapon data validator pass. The new/extended tests check RPK-74M moving spread/sway without changing stationary dynamics or reload, plus all seven corrected Mini Scout/BROD 3 handling selections. The diff whitespace check passes. No unrelated runtime changes were made in this stage.

## Original screenshots inspected


- [37_Mini Scout_Magazine_15Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/Mini%20Scout/37_Mini%20Scout_Magazine_15Rnd_Magazine.png)
- [38_Mini Scout_Magazine_15Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/Mini%20Scout/38_Mini%20Scout_Magazine_15Rnd_Fast_Mag.png)
- [39_Mini Scout_Magazine_20Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/Mini%20Scout/39_Mini%20Scout_Magazine_20Rnd_Magazine.png)
- [40_Mini Scout_Magazine_20Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/Sniper%20Rifle/Mini%20Scout/40_Mini%20Scout_Magazine_20Rnd_Fast_Mag.png)
- [49_BROD 3_Magazine_36Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Carbine/BROD%203/49_BROD%203_Magazine_36Rnd_Magazine.png)
- [50_BROD 3_Magazine_40Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/Carbine/BROD%203/50_BROD%203_Magazine_40Rnd_Magazine.png)
- [51_BROD 3_Magazine_40Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/Carbine/BROD%203/51_BROD%203_Magazine_40Rnd_Fast_Mag.png)
- [32_VSSM_Magazine_20Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/DMR/VSSM/32_VSSM_Magazine_20Rnd_Magazine.png)
- [33_VSSM_Magazine_10Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/DMR/VSSM/33_VSSM_Magazine_10Rnd_Magazine.png)
- [34_VSSM_Magazine_10Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/DMR/VSSM/34_VSSM_Magazine_10Rnd_Fast_Mag.png)
- [35_VSSM_Magazine_20Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/DMR/VSSM/35_VSSM_Magazine_20Rnd_Fast_Mag.png)
- [36_VSSM_Magazine_30Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/DMR/VSSM/36_VSSM_Magazine_30Rnd_Magazine.png)
- [46_M60_Magazine_100RND_BELT_POUCH](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/M60/46_M60_Magazine_100RND_BELT_POUCH.png)
- [47_M60_Magazine_50RND_LOOSE_BELT](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/M60/47_M60_Magazine_50RND_LOOSE_BELT.png)
- [39_PW7A2_Magazine_30Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/SMG/PW7A2/39_PW7A2_Magazine_30Rnd_Magazine.png)
- [40_PW7A2_Magazine_20Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/SMG/PW7A2/40_PW7A2_Magazine_20Rnd_Magazine.png)
- [41_PW7A2_Magazine_30Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/SMG/PW7A2/41_PW7A2_Magazine_30Rnd_Fast_Mag.png)
- [42_PW7A2_Magazine_40Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/SMG/PW7A2/42_PW7A2_Magazine_40Rnd_Magazine.png)
- [44_M121 A2_Magazine_50RND_DRUM](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/M121%20A2/44_M121%20A2_Magazine_50RND_DRUM.png)
- [45_M121 A2_Magazine_50RND_BELT_POUCH](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/M121%20A2/45_M121%20A2_Magazine_50RND_BELT_POUCH.png)
- [44_M123K_Magazine_200RND_BELT_BOX](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/M123K/44_M123K_Magazine_200RND_BELT_BOX.png)
- [46_L110_Magazine_200RND_BELT_BOX](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/L110/46_L110_Magazine_200RND_BELT_BOX.png)
- [48_RPK-74M_Magazine_30Rnd_Magazine](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/RPK-74M/48_RPK-74M_Magazine_30Rnd_Magazine.png)
- [49_RPK-74M_Magazine_30Rnd_Fast_Mag](../../reference-data/attachment-audit/Weapon%20Attachments/LMG/RPK-74M/49_RPK-74M_Magazine_30Rnd_Fast_Mag.png)
