# Source and review evidence index

## Current September 13 evidence

| Accepted family | Evidence and limits |
|---|---|
| Projectile and hit-zone selections | [Hit-zone extraction](frosty-hit-zones-2026-09-13.json), [limb materials](frosty-limb-material-trace-2026-09-13.json), and [global operands](frosty-global-operands-2026-09-13.json). Current generated maps cover 63 weapons and 328 ammo choices; earlier traces can contain superseded counts. |
| Collateral table | [Compiled-resource trace](frosty-global-compiled-trace-2026-09-13.json) and [follow-up](frosty-light-spotting-collateral-followup-2026-09-13.json). The current generator uses the operator-confirmed final clamp; the trace's unresolved status is historical. |
| Sway, spotting and regeneration | [Follow-up decisions](frosty-global-followup-2026-09-13.json). Source operands are retained separately from model composition and activation. |
| Spread distribution | [Per-state exponents](frosty-distribution-exponents-2026-09-13.json). Source configuration and limited M39 capture support do not prove the native random-number consumer. |
| Light hipfire effects | [Decoded field names](frosty-light-field-names-2026-09-13.json) and [implementation coverage](frosty-light-implementation-2026-09-13.json). Twelve assets supply five operands on two hip branches; all 137 supported selections match. Idle operands remain unused. |

[Belt-box screenshots](belt-box-moving-ads-2026-09-13.json) support removal of the
L110/M123K estimated spread penalties. Description mismatches remain possible bugs
for future review. [Sniper Slim Angled captures](sniper-slim-angled-moving-ads-2026-09-14.json)
support the moving-ADS penalty on Interdictor and Mini Scout Slim Angled.

Current attachment generation:

- [Physical slots and equipment dependencies](frosty-attachment-compatibility.json) (14 September): 1,391 offered mount choices, 22 generated rules on four weapons, and all 285 inspected dependency entries, including 263 unsupported/unmapped secondary-sight entries. [PP-19 trace](../../docs/archive/PP19_53_ROUND_COMPATIBILITY_2026-09-14.md) and [curated asset findings](../../docs/frosty/DATA_GRAPH.md#slots-and-prerequisites) retain the source and observed-behavior boundaries.

- [Barrel ADS](frosty-barrel-ads-generated.json): 233 unique selections.
- [Grip/laser/magazine handling](frosty-attachment-handling-generated.json): 1,487 selections and 5,489 generated fields.
- [Mapping follow-up](frosty-handling-mapping-followup.json), [unbound-selector review](frosty-handling-unbound-selector-review.json), and [coordinate proof](frosty-handling-coordinate-proof.json): accepted identities, historical spread exceptions, and base/modifier conversion evidence.
- [Sniper brakes](frosty-sniper-brakes-generated.json): 16 per-weapon amount overrides.
- [Linear Comp/burst review](frosty-assumption-review.json) and [SDK types](frosty-assumption-sdk-types.json): 53 selections, source operands and unmodeled fields.
- [Other-attachment review](frosty-other-attachment-review-2026-09-13.json): dated comparison; the [current generation report](../../docs/frosty/ATTACHMENTS.md#generated-site-values) records later decisions.

See the [Frosty weapon notes](../../docs/frosty/WEAPONS.md)
for accepted changes and remaining boundaries. Evidence files below retain their
original snapshot status; they are not rewritten when an implementation changes.


These files record source snapshots and reviews. The browser does not fetch them.
File dates alone do not determine which values are accepted for runtime use. See
[data sources](../../docs/DATA_SOURCES.md) for promotion policy and
[model limitations](../../docs/MODEL_LIMITATIONS.md) for unresolved behavior.

| Family | Representative records and purpose |
|---|---|
| Source arrays and handling | [Array review](frosty-array-review-2026-09-09.json), [draw-time review](frosty-draw-time-2026-09-09.json): source rows, field identities, precision, coordinates, comparisons and hashes. |
| Weapon configuration and identities | [Weapon identities](frosty-weapon-identities.json), [SDK field types](frosty-sdk-field-types.json), `frosty-1.4.2.5-*`: identity, primitive decoding, weapon-specific accepted values. |
| Projectile and damage | [Shotgun ammo](frosty-shotgun-ammo.json), [ammo drag](frosty-1.4.2.5-ammo-drag.json), [Interdictor integration](frosty-interdictor-integration.json), [Sym Interdictor snapshot](sym-1.4.2.0-interdictor.json). |
| Attachment graph and effects | [Full pass](frosty-attachment-full-pass-2026-09-06.json), [all-effect boundary](frosty-all-attachment-effect-boundary.json), [approved updates](frosty-approved-attachment-updates-2026-09-06.json), follow-up/source-gap/selector/killswitch records. These retain candidates as well as approved changes. |
| Magazine identity and composition | [Identity review](frosty-magazine-identity-review-2026-09-07.json), [model update](frosty-magazine-model-update-2026-09-07.json), EF88 and magazine-cost records. |
| Recoil, spread and firing behavior | [Smooth recoil](frosty-smooth-recoil-review.json), [soldier aiming](frosty-soldier-aiming-review.json), [VSSM fire mode](frosty-vssm-fire-mode-review.json), [shotgun timing](frosty-shotgun-fire-timing.json). Source fields can remain deferred. |
| Captures and composite UI/native behavior | `live-captures-*`, `loadout-screen-stat-*`, `composite-*`, `animation-state-*`, `frosty-native-*`, attachment UI metadata and tracked PNGs: observations and exploratory interpretations. |
| External research and publication | [Offsets review](offsets-thread-review-2026-09-06.json), [Portal SDK review](portal-sdk-review-2026-09-06.json), [published 1.3.3.0 snapshot](site-archive-v1.3.3.0.json): historical review/publication identity. |

Evidence arrays contain raw rows, source hashes, identity candidates, comparisons,
observations, and decisions for their recorded snapshot. They are excluded from
runtime stat ladders. The complete live array inventory is in
[data reference](../../docs/DATA_REFERENCE.md), with all finite table values in
[stat ladders](../../docs/STAT_LADDERS.md).

For local XML paths recorded before the export move, see the
[current Frosty export location](../../docs/DATA_SOURCES.md#local-frosty-export-location).
Resolve those inputs under the new root; retain the original evidence records.

Source hashes identify original inputs. Site/comparison hashes can predate the
integration they motivated. Preserve those hashes when the current files change. The original local XML, SDK and capture directories
are not all present in a clean checkout. Narrative context is preserved in the
[research archive](../../docs/archive/README.md); screenshot-audit JSON/workbook and its
separate validator live in the [attachment audit package](../attachment-audit/README.md).
