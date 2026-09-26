# Open Frosty questions

[Frosty docs](README.md) · [Weapons](WEAPONS.md) · [Attachments](ATTACHMENTS.md) · [Attachment bugs](../ATTACHMENT_BUGS.md)

The single list of open questions about the game data. Add new questions here, not in
separate files. When a question is answered, move the result to the topic page and
delete the row (git history keeps it).

Most questions need either a decoded native consumer (not available: the game code was
not examined) or a controlled in-game test. The suggested test is given where one is
known.

Active investigations with their own files:

- [Ranked in-game capture plan](../working/BF6_CAPTURE_PRIORITIES.md) (current priorities and test steps)
- [Recoil and spread recordings](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md)
- [Composite stats](../archive/COMPOSITE_STATS_FINDINGS.md) (includes which native
  provider supplies Precision)

## Field meanings

| Question | Next step |
|---|---|
| The `Field_`/`Class_` hash algorithm | None known; see the [field map](FIELD_MAP.md). Use exact registry child/hash associations where available, then other stated name evidence. |
| `Field_0ef83ce9`, `Field_6eb133f8`, `Field_c39698a3` | Find a registry value or a consumer. |
| `Field_149939ab` / `Field_e9129d03` (non-unit Riser samples include 1.2 and 1.3) | Compare an optic with and without the pair in game. |
| `Field_440ed7fa` (frame-quantized WB duration) | Compare with fire-mode or animation timings. |
| WB firing `Field_c5d1c8fe/{Field_91121984,Field_0d926433}` | [All 63 weapon comparisons](WEAPONS.md#anonymous-wb-recoil-candidates) reject a direct substitution for named GS recoil bounds. Need a consumer or independent activation control; ordinary gameplay motion cannot name the anonymous source field. |
| Native ZDA/HDA state selection and H1 meaning | Ordered source rows and exact selectors reproduce all nine named Sym minima for 63/63 weapons ([receipt](../../reference-data/provenance/frosty-site-constants-2026-09-23.json)). This supports the ZDA stance columns and H2–H5 associations. H1 has no named Sym minimum. Use jump/sprint and stance captures or a native consumer to settle H1 and activation. |

## Source coverage

| Question | Next step |
|---|---|
| Complete source review of Analyzer inputs | Every input is classified in the final ledger, but about 1,176 rows remain blocked. Work the [active source leads](../working/FROSTY_RESEARCH_QUEUE.md#active-source-leads). All 63 site weapons are in scope; KSG is a source-only reference with proven campaign roots. Follow non-site branches only when they can affect a displayed or proposed value. Capture coverage is not semantic review. |
| Five imported object GUIDs absent from captured target files | [Verified caller report](../../reference-data/provenance/frosty-audit-object-targets-reviewed-2026-09-23.json): 15 raw pointer callers reach absent objects in PB_AT4, KST_Vehicles and SPC_RenderLayers. Need target definitions or resolution evidence; do not infer runtime failure. Keep shader caller mode scope unresolved. |
| Serialized expression resource format | [22 core-weapon resource bodies are captured](../../reference-data/provenance/frosty-audit-core-resources-2026-09-23.json). The [four-sample review](../../reference-data/provenance/frosty-audit-expression-resources-validation-2026-09-23.json) found no body reader in the inspected SDK source. Establish boundaries, fields and EBX metadata relationships before naming operations or treating embedded asset strings as runtime imports. |

## Weapons

| Question | Suggested test |
|---|---|
| Controller recoil: activation and composition of 0.8836; six sniper rifles have no binding | Mouse and controller on the same PC and build, ADS and hip, identical M4A1 builds, plus a sniper. Separate amount, variation, growth and recovery. |
| Spotting: product or minimum composition (bases found per weapon in WB `Field_5ebda408`; [review](WEAPONS.md#spot-on-fire-base-ranges-1430-23-september-2026)); M45A1/Skorpion built-in 27/64.29 base; the source 0.1 versus site 0.14 CQB/Lightened candidates (M39 EMR, M417 A2, DRS-IAR, M2010 ESR; [exact M39 chain](../../reference-data/provenance/frosty-2026-09-24-L47-selected-spotting-chain.json)). Do not infer their product without composition evidence | Standard, suppressor, subsonic and both; measure minimap and world range with an enemy observer. |
| Regeneration: native addition and reset of the 5 s base plus ammo delay | Standard, Frangible and Flechette from final hit to first heal; check whether a new hit resets the delay. |
| Spread: the switch rule between firing, not-firing and idle recovery; the site has no idle state | Recording scenario 4 in the recoil handoff. |
| `IdleDecreaseTargetDuration`: native use, and the VSSM/Interdictor index exceptions | [Source table link resolved](WEAPONS.md#idle-duration-table-1430-23-september-2026): the first eight values match the ADS-time ladder minus one 60 Hz frame within 0.001 ms when interpreted as seconds, and the index equals the ADS animation index in 62 of 64 weapons. Spread settling on entering ADS is a supported hypothesis; the native consumer is unresolved. Test with VSSM ADS timing; do not equate its floats to measured recovery times. |
| Unused recoil bounds (`VerticalRecoilMin/Max/Increase`, `HorizontalRecoilLeft/Right`) | Compare with recordings before modeling. [L33](../../reference-data/provenance/frosty-2026-09-24-L33-polar-recoil-build-separated.json) withdrew the non-polar outlier; native use of these bounds remains open. |
| `ReloadThreshold`, `ReloadDelay`, `PostReloadDelay`; phase list `Field_dc244b57` (threshold × time lands nearest its second-to-last entry on 47 of 57 weapons) | Reload captures that mark ammo commit. The effective empty time is settled ([capture](WEAPONS.md#reload-values-and-empty-reload-capture-23-september-2026)). |
| Class traits: native activation | Compare a trait weapon with and without the class. |
| DLC Bolt (`ads_bolt`): effective sniper fire rate while scoped | The site keeps base RPM and marks the attachment unmodeled. Trace the exact ADS-bolt effect against ordinary/zoomed completion fields for all six snipers, then compare scoped and unscoped shot intervals with/without it while holding Recon trait fixed. A true capability operand alone does not quantify the cadence change. |
| General soldier/class settings: FasterHealing, Flak/StanceFlak, DamageSpot, LowProfile and movement defaults | Exact source operands and links are retained in the topic notes. Need a standard MP class/loadout selection path and the compiled/native consumer before assigning effective bonuses. Record class/specialization and mode settings in captures. |
| Mode/map application of shared health, damage, regeneration and spotting settings | [Registry, Conquest/Breakthrough and two-map source checks](WEAPONS.md#mode-and-map-context) are complete within the bounded pass. Need compiled/inherited application or live server values; registry membership, tags and stored defaults do not establish effective rules. Keep mode and round state fixed in captures; avoid Breakthrough retreat phases for baseline spotting. |
| Bipod and mounted states (recoil, no per-shot spread increase) | Not modeled; decide whether to model. |
| Collateral: native lookup code (the clamp rule is confirmed) | None needed for the site. |

## Attachments

| Question | Suggested test |
|---|---|
| Lights: native on/off activation and idle recovery | Same 6P67 build without a light, light off and light on; stationary and moving hip growth and recovery; ADS as a control. |
| SGX CQB/Long and Mini Scout Short sway: source gates the site values on canted iron sights ([L94](../../reference-data/provenance/frosty-2026-09-26-L94-optic-accessory-and-local-sight-sway.json)); removal proposed | Optional: SGX CQB versus no muzzle with an optic, ADS sway pair. |
| Sway and ADS: camera versus aim motion; VSSM regular barrel has a GS +1 ADS binding but no WB effect (site 250 ms on both barrels) | [23 September source review](ATTACHMENTS.md#vssm-barrel-ads-follow-up-1430-23-september-2026) keeps the two paths separate. Measure regular/ASM barrel ADS with factory optic and fixed magazine, or decode the native GS consumer. |
| Sniper Tungsten: intended balance across weapons remains unknown; source-specific −6/−1/−7 steps are now implemented and panel-checked | Further gameplay captures can test shot behavior; they cannot establish design intent. |
| Slim Angled on L115, Mini Scout, Interdictor: does the second `GID_ADSTime_BTM_P10` binding stack? | Panels show one ADS tier ([bug 1a](../ATTACHMENT_BUGS.md#1a-sniper-rifles-full-angled-package-selected)). |
| Order of several modifiers on one field | No record combines two operations, so it cannot be seen in the data. |
| BROD 3 `TreatedBarrel` (label **Cryo**): offered in game? The site has no Cryogenic option | [Source identity/default confirmed](ATTACHMENTS.md#unmatched-branch-follow-up-1430-23-september-2026); check the BROD 3 barrel menu or active availability consumer. |
| M4A1 plain `ERG_Magwell`: player-facing purpose | Source branch selects an empty default part and is distinct from FlaredMagwell; [review](ATTACHMENTS.md#unmatched-branch-follow-up-1430-23-september-2026). A direct menu or consumer trace is still needed. |
| `AMO_SubsonicFrangible` on 15 weapons: no site selection (kill-switch default True) | All 15 branch defaults rechecked in1.4.3.0; live availability and overrides remain unresolved. Check the ammo menus after updates. |
| PP-19 25 Rnd and GRT-CPS burst fire: source-only branches | Recheck if a build offers them. |

The full list of Frosty records without a site match is the
[13 September inventory](../archive/FROSTY_UNMATCHED_WEAPONS_ATTACHMENTS.md).

## Optics

| Question | Suggested test |
|---|---|
| L115 optics at render FOV 55 (same as RPK-74M bug 11) | Compare R-MR, ROX or Mini Flex on the L115 and another sniper. |
| ES 5.7, GGH-22, P18, M45A1 optics at 55, while other pistols use 40 | Compare an optic on the P18 and the M44. |
| M2010 ESR inline model parts: SDO 55 and LERT 59 beside the shared parts (34, 20) | Exact raw paths and GRX structure reviewed; native precedence remains unknown. Compare scope size with another sniper at the same PiP/FOV settings. |
| SL9 iron sights at the default 55 | Checked 16 September: no visible effect found; the value may still be unset. |

| Breath control: duration, sway effect and standard multiplayer activation | [Source expression/channel link](ATTACHMENTS.md#sway) is resolved. Need a caller/compiled consumer trace or controlled measurements. |

| Zeroing: effective list selection, units, attachment activation and ballistic correction | [63 raw WB blocks](WEAPONS.md#zeroing-source-configuration-1430-23-september-2026) are recorded; 12 have named min/max/delay. Compare controlled impacts and displayed zeroing states before adding ballistic correction. |
| Glint: final selector application and visibility thresholds | M2010 iron-sight and decoy no-flare source chains are resolved. Need native composition or controlled observer tests for gameplay visibility. |

## Game updates and collection

| Question | Next step |
|---|---|
| 1.4.3.0 `Aim_*_PiP` comparisons retain provisional field semantics | [Bounded layout review](TOOLS.md#sdk-and-decoding) reproduces one pair through exact type keys and nested class references. Shared decoded values match; one import was added. Keep warnings until affected fields have independent layout/consumer evidence. |
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

## Weapon Attributes follow-up

- `Field_b30a73ed` / `Struct_a92e7ee4`: exact runtime target remains unknown.
  KS18K Slim Angled moving-ADS penalty is no longer pending: source collection,
  menu score and twelve indicator captures support zero. Trace the native consumer
  to name the alternate field; do not infer it from the modifier asset name.
- Hipfire `IncreasePerShotFraction`: confirm the native comparison behind the
  inferred conditional factor. Confirm the native Control sine operation and
  zero-variation behavior. Precision native provider and all fallback rules remain
  incompletely decoded.
- Mobility uses ADS animation index, not necessarily the zoom-transition index.
  L115 bases are 2 and 1 respectively. The runtime score now preserves this distinction.

Current scope and evidence: [Weapon Attributes model](../WEAPON_ATTRIBUTES_MODEL.md).

### Burst recoil activation (21 September 2026)

GRT-BC and SL9 captures show the same recoil values in the hover and equipped
states. KORD also has an equipped capture with unchanged recoil. SG 553R and
PW5A3 currently have hover evidence only. These observations do not establish
recoil behavior during firing.

The GRT-BC source chain resolves through `MSBSGROTB_WB.xml` objects
`...0028` (unlock binding), `...001e` (behavior operation), `...0033`
(behavior list), and `...0022` (fire-mode selector). The selector mask is
`0x8`, equal to `1 << 3`; SDK enum `Enum_16e6fa59.Field_c57b586e` is 3,
and the separate `WPM_ERG_BurstFireReplace_W10` operation selects that enum.
The selector GUID `588728fd-2ae7-4424-aa22-45d9b3c82ba0` matches all three
GS bindings: recoil conversion, recoil P20, and AutoIdentifier. No broken
reference or mask mismatch was found in this chain.

The shared `CMU_SemiAuto` uses the same selector class (`Class_9dfbb158`)
with mask `0x1`. This supports interpreting the burst selector as a fire-mode
condition. Linear Comp has direct attachment bindings instead. A menu provider
that does not evaluate this condition could therefore show the changed mode
list without applying burst recoil. This remains an explanation, not a confirmed
native execution trace. XML and SDK field types do not show which mode state the
menu provider evaluates or whether it evaluates these behavior lists at all.

Next evidence needed: native menu-provider/selector execution, or a controlled
firing comparison that separates actual recoil behavior from menu display.
Do not classify this as a gameplay attachment failure from panel captures alone.
