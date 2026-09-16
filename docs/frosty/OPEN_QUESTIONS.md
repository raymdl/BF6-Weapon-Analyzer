# Open Frosty questions

[Frosty docs](README.md) · [Weapons](WEAPONS.md) · [Attachments](ATTACHMENTS.md) · [Attachment bugs](../ATTACHMENT_BUGS.md)

The single list of open questions about the game data. Add new questions here, not in
separate files. When a question is answered, move the result to the topic page and
delete the row (git history keeps it).

Most questions need either a decoded native consumer (not available: the game code was
not examined) or a controlled in-game test. The suggested test is given where one is
known.

Active investigations with their own files:

- [Recoil and spread recordings](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md)
- [Composite stats](../working/COMPOSITE_STATS_FINDINGS.md) (includes which native
  provider supplies Precision)

## Field meanings

| Question | Next step |
|---|---|
| The `Field_`/`Class_` hash algorithm | None known; see the [field map](FIELD_MAP.md). Name fields by value matching. |
| `Field_0ef83ce9`, `Field_6eb133f8`, `Field_c39698a3` | Find a registry value or a consumer. |
| `Field_149939ab` / `Field_e9129d03` (1.25–1.3 on some `_Riser` optic parts) | Compare an optic with and without the pair in game. |
| `Field_440ed7fa` (frame-quantized WB duration) | Compare with fire-mode or animation timings. |
| ZDA column states (`Field_6c73f45b`, `Field_624b1a88`, `Field_bd300f62`) and hip columns H1–H5 | In-game spread captures per stance. |

## Weapons

| Question | Suggested test |
|---|---|
| Controller recoil: activation and composition of 0.8836; six sniper rifles have no binding | Mouse and controller on the same PC and build, ADS and hip, identical M4A1 builds, plus a sniper. Separate amount, variation, growth and recovery. |
| Spotting: source of the 54 m and 150 m bases; product or minimum composition; the old 0.014 CQB/Lightened candidate (M39 EMR, M417 A2, DRS-IAR, M2010 ESR) | Standard, suppressor, subsonic and both; measure minimap and world range with an enemy observer. |
| Regeneration: native addition and reset of the 5 s base plus ammo delay | Standard, Frangible and Flechette from final hit to first heal; check whether a new hit resets the delay. |
| Spread: the switch rule between firing, not-firing and idle recovery; the site has no idle state | Recording scenario 4 in the recoil handoff. |
| `IdleDecreaseTargetDuration` target array | Trace the index into its array. |
| Unused recoil bounds (`VerticalRecoilMin/Max/Increase`, `HorizontalRecoilLeft/Right`) and the one non-polar weapon | Compare with recordings before modeling. |
| `ReloadThreshold`, `ReloadDelay`, `PostReloadDelay` | Reload captures. |
| Class traits: native activation | Compare a trait weapon with and without the class. |
| Bipod and mounted states (recoil, no per-shot spread increase) | Not modeled; decide whether to model. |
| Collateral: native lookup code (the clamp rule is confirmed) | None needed for the site. |

## Attachments

| Question | Suggested test |
|---|---|
| Lights: native on/off activation and idle recovery | Same 6P67 build without a light, light off and light on; stationary and moving hip growth and recovery; ADS as a control. |
| Sway and ADS: camera versus aim motion; VSSM regular barrel has a GS +1 ADS binding but no WB effect (site 250 ms on both barrels) | Keep the factory optic, magazine and barrel; measure VSSM ADS timing. |
| Sniper Tungsten: pending −6 amount candidate on M2010 ESR, PSR and SV-98 (Mini Scout uses −7) | Recoil captures with and without Tungsten. |
| Slim Angled on L115, Mini Scout, Interdictor: does the second `GID_ADSTime_BTM_P10` binding stack? | Panels show one ADS tier ([bug 1a](../ATTACHMENT_BUGS.md#1a-sniper-rifles-full-angled-package-selected)). |
| Order of several modifiers on one field | No record combines two operations, so it cannot be seen in the data. |
| BROD 3 `TreatedBarrel` (label **Cryo**): offered in game? The site has no Cryogenic option | Check the BROD 3 barrel menu. |
| M4A1 `ERG_Magwell`: name and purpose | Direct source or menu trace. |
| `AMO_SubsonicFrangible` on 15 weapons: no site selection (kill-switch default True) | Check the ammo menus after updates. |
| PP-19 25 Rnd and GRT-CPS burst fire: source-only branches | Recheck if a build offers them. |

The full list of Frosty records without a site match is the
[13 September inventory](../archive/FROSTY_UNMATCHED_WEAPONS_ATTACHMENTS.md).

## Optics

| Question | Suggested test |
|---|---|
| L115 optics at render FOV 55 (same as RPK-74M bug 11) | Compare R-MR, ROX or Mini Flex on the L115 and another sniper. |
| ES 5.7, GGH-22, P18, M45A1 optics at 55, while other pistols use 40 | Compare an optic on the P18 and the M44. |
| M2010 ESR inline model parts: SDO 55 and LERT 59 beside the shared parts (34, 20) | Compare the scope size with another sniper rifle. |
| SL9 iron sights at the default 55 | Checked 16 September: no visible effect found; the value may still be unset. |

## Game updates and collection

| Question | Next step |
|---|---|
| 1.4.3.0 `Aim_*_PiP` comparisons are layout-ambiguous (provisional) | Recheck with a decoder that resolves the ambiguous layout. |
| 1.4.3.0 patch note "incorrect impact visual effects": no matching asset change in the captured set | Widen the capture to impact effects. |
| Collections for 1.4.2.5 and 1.4.3.0 are partial | See [Tools](TOOLS.md#per-build-collection-rules). |

### Unresolved soldier file GUIDs

Confirmed references in `Class_25c12137/Field_a2734e52/member/Field_8cf424e7`. All
file/object pairs were already `BadRef` in 1.4.2.5 XML. Neither build catalog contains
the target files, and the 16,426 captured raw bodies have no matching objects. Caller
names do not identify the targets or prove runtime use.

| File GUID | Caller context | Caller assets | Pointer uses |
|---|---|---:|---:|
| `2631e8f8-a115-413d-a696-5ec194081d73` | Ladder, traversal, revive, melee, fire | 15 | 33 |
| `8f992c03-80cb-4ed5-8a6e-0274a57f659c` | In-air and parachute | 3 | 11 |
| `b4765624-c221-4138-b446-3b3aa155cf3b` | Overlay, melee, in-air | 3 | 3 |
| `d0a2de18-a7b2-4c3c-9e87-aff6ddc8a180` | Mandown, revive, rope, zipline | 8 | 16 |

Reopen only if a target body becomes available, a catalog resolves a GUID, the caller
pointers change, or a consumer can answer a specific question. Evidence:
[GUID trace](../../reference-data/provenance/frosty-1.4.3.0-unresolved-guid-trace-2026-09-16.json);
the 16 caller assets are indexed in `asset-findings.json`.
