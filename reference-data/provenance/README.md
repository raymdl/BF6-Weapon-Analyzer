# Source and review evidence index

**Evidence archive with active provenance references.** Files here record specific
source snapshots and reviews. They are not fetched by the browser, and the newest
filename is not automatically the accepted runtime rule. Use
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

Many files contain arrays of raw rows, source hashes, identity candidates, comparisons,
observations or decisions. Their schemas and counts describe their own snapshot;
they are not additional live stat ladders. The complete live array inventory is in
[data reference](../../docs/DATA_REFERENCE.md), with all finite table values in
[stat ladders](../../docs/STAT_LADDERS.md).

For local XML paths recorded before the export move, see the
[current Frosty export location](../../docs/DATA_SOURCES.md#local-frosty-export-location).
Resolve those inputs under the new root; retain the original evidence records.

Source hashes identify original inputs. Site/comparison hashes can predate the
integration they motivated. Do not replace them with today's hashes to make a
historical report appear current. The original local XML, SDK and capture directories
are not all present in a clean checkout. Narrative context is preserved in the
[research archive](../../docs/archive/README.md); screenshot-audit JSON/workbook and its
separate validator live in the [attachment audit package](../attachment-audit/README.md).
