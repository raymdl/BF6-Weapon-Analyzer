# Historical research and implementation archive

> **Historical material — not the current design specification.**
> Start with the [current documentation index](../README.md).
> Original report bodies are preserved as snapshots, including superseded claims,
> old test counts, local-only checkpoints and future-tense plans. The status and
> replacement links below govern how to read each record.

Some evidence links refer to local recordings, screenshots, or working audit files
that are not included in the published repository.

This archive was organized on 9 September 2026. Moving a report here does not
assert that every research question it raised was resolved. Current limitations
are summarized in [model limitations](../MODEL_LIMITATIONS.md); current data
and calculation contracts live in the focused guides. The records below retain
the evidence trail rather than serving as instructions to reimplement old work.

Local Frosty XML exports moved to `BF6 Datamining/Frosty` on 9 September 2026.
Old export paths and commands in these snapshots describe the earlier layout.
Use the [current location guide](../DATA_SOURCES.md#local-frosty-export-location)
to locate XML inputs; manifest and research paths did not move.

## September 2026 consolidated recording and source records

Open questions from these records are consolidated in the
[active handoff](../working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md). Archiving a
completed analysis does not mean every native mechanic is known.

| Record | Status / current reference |
|---|---|
| [Full recording history](BF6_RECOIL_SPREAD_RECORDING_HISTORY_2026-09-11.md) | Preserved pre-consolidation handoff, including today's cross-task status review. Use the active handoff for new work. |
| [Recoil implementation validation](RECOIL_MODEL_VALIDATION_2026-09-11.md) | Completed implementation and recording comparison; current formulas and exceptions are in the recoil/spread guide. |
| [AK4D Heavy analysis](AK4D_HEAVY_BARREL_RECORDING_ANALYSIS_2026-09-11.md) | Completed comparison and accepted source-factor correction. Transfer and idle questions remain in the active handoff. |
| [VSSM analysis](VSSM_RECORDING_ANALYSIS_2026-09-11.md) | Completed recording/screenshot analysis and accepted index-4 correction. Transition and angular-calibration limits remain open. |
| [Stored-spread source handoff](HANDOFF_FROSTY_SPREAD_2026-09-10.md) | Stored moving-ADS correction completed; later VSSM correction accepted. Current table rules are in stat ladders. |
| [Site Frosty review](FROSTY_SITE_REVIEW_2026-09-07.md) | Dated mixed review; some findings later implemented. Current open source/audit areas are summarized in the active handoff. |

## Completed implementation and change records

| Historical record | Status / present reference |
|---|---|
| [Code review remediation plan](CODE_REVIEW_REMEDIATION_PLAN.md) | August implementation completed through Stage 8 according to its ledger. Old unchecked task/publication boxes are historical, not current work orders. Replaced by [architecture](../ARCHITECTURE.md), [maintenance](../../MAINTENANCE.md), and [tests](../TESTS.md). |
| [Draw-time model](FROSTY_DRAW_TIME_MODEL.md) | Retained source/integration checkpoint; current equations, precision, table selection and bounds are in [stat ladders](../STAT_LADDERS.md). |
| [Array review and implementation](FROSTY_ARRAY_REVIEW_2026-09-09.md) | Contains a pre-integration comparison followed by implemented changes. Early references to old arrays are superseded by [stat ladders](../STAT_LADDERS.md) and [data reference](../DATA_REFERENCE.md). |
| [Magazine model update](FROSTY_MAGAZINE_MODEL_UPDATE_2026-09-07.md) | Completed reviewed update and bounded investigation. Current composition is in [attachment model](../ATTACHMENT_MODEL.md); timing uncertainties remain in [limitations](../MODEL_LIMITATIONS.md). |
| [Site data fixes](FROSTY_SITE_DATA_FIXES_2026-09-07.md) | Completed correction record. Consult maintained `data/` and [sources](../DATA_SOURCES.md) for the live contract. |

## Dated investigations and mixed progress logs

These documents mix findings, candidates, accepted changes and deferred work.
Their original date/snapshot matters; a candidate does not imply current behavior.

| Historical record | Scope / current reference |
|---|---|
| [Frosty integration log](FROSTY_INTEGRATION.md) | Long chronological integration/research trail with superseded checkpoints. Use [data sources](../DATA_SOURCES.md), [attachment model](../ATTACHMENT_MODEL.md) and [limitations](../MODEL_LIMITATIONS.md). |
| [Live review](FROSTY_LIVE_REVIEW_2026-09-06.md) | Capture/composite-stat and animation investigation; unresolved native arithmetic remains evidence, not implemented functionality. See [limitations](../MODEL_LIMITATIONS.md). |
| [Attachment comparison](FROSTY_ATTACHMENT_COMPARISON_2026-09-06.md) | Mixed correction/deferment ledger. Current aim-state effects and retained approximations are documented in [attachment model](../ATTACHMENT_MODEL.md). |
| [Attachment review details](FROSTY_ATTACHMENT_REVIEW_DETAILS_2026-09-06.md) | Detailed supporting records for the comparison; source instances are not a current defect count. See [evidence index](../../reference-data/provenance/README.md). |
| [Magazine identity review](FROSTY_MAGAZINE_IDENTITY_REVIEW_2026-09-07.md) | Identity decisions feeding the subsequent model update; original provisional statuses stay preserved. See [data sources](../DATA_SOURCES.md). |
| [Manifest second pass](FROSTY_MANIFEST_SECOND_PASS_2026-09-06.md) | Dated graph/dependency investigation, not a runtime manifest. See [architecture](../ARCHITECTURE.md). |
| [Online blocker review](BLOCKER_ONLINE_REVIEW_2026-09-06.md) | Historical search for evidence on unresolved behavior; no claim of current external re-verification. See [limitations](../MODEL_LIMITATIONS.md). |
| [Offsets thread review](OFFSETS_THREAD_REVIEW_2026-09-06.md) | Historical native-layout research. Layout candidates do not establish simulator formulas; see [sources](../DATA_SOURCES.md). |
| [Portal SDK research](PORTAL_SDK_RESEARCH_2026-09-06.md) | Historical feasibility research, not a shipped Portal integration or current SDK recommendation. See [sources](../DATA_SOURCES.md). |

## Evidence access and preservation

Relative links to tracked `reference-data/provenance/` remain usable. Links into
`reference-data/attachment-audit/Weapon Attachments/` require the original local
screenshot library and intentionally do not resolve in a clean clone. References
to old `outputs/`, `.local-archive/`, external export directories and research
workspaces describe original execution environments; those are not product dependencies.

Keep archived narrative/evidence bodies stable. Add new conclusions to current
guides and new dated evidence rather than rewriting old results into apparent
predictions of the current model. Frozen published site versions are separate:
`v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/` remain in their existing locations.
