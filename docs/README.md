# Documentation index

The guides were reviewed on 13 September 2026 against the data and runtime
modules, including Frosty hit zones, ballistics, collateral, spread distribution,
lights, generated per-weapon modifiers, and shared rails. Update affected guides
when implementation changes. Source-version labels record source identity;
validation limits are documented separately.

The [recoil guide](RECOIL_SPREAD_MODEL.md) covers timed delivery/recovery, Smooth
exceptions, Heavy ADS factors, light hipfire factors, controller scaling and
source-exponent sampling. [Damage and ballistics](DAMAGE_BALLISTICS.md) covers
per-weapon/ammo hit zones, manual-cycle timing, and explicit projectile selection.
The [attachment model](ATTACHMENT_MODEL.md) explains sway percentages, spotting,
regeneration, collateral, typed shared rails, generated handling, sniper brakes,
Linear Comp/burst recoil and belt-box description mismatches. Native arithmetic remains unverified where noted.

The 14 September compatibility update generates physical mount slots and equipment
dependencies from Frosty. See the [user controls](USER_GUIDE.md#build-and-compare-loadouts),
[data contract](DATA_REFERENCE.md), [regeneration commands](../MAINTENANCE.md#regenerate-attachment-modifiers),
and [curated source findings](../reference-data/frosty/README.md#shared-slots-and-attachment-dependencies).

The [description audit](working/FROSTY_DISPLAY_NAMES.md#current-site-mapping)
documents attachment tooltips and the 18 approved panel-text exceptions. The
[unmatched-record inventory](working/FROSTY_UNMATCHED_WEAPONS_ATTACHMENTS.md)
groups extra Frosty records by what is known about their menu identity.

## Folder roles

- `docs/`: live GitHub product and contributor guides.
- `docs/working/`: active investigations and handoffs; keep only current status,
  decisions, open questions, and next actions.
- `docs/archive/`: completed analyses, implementation records, and superseded handoffs.

When work closes, put the accepted behavior in the relevant live guide, carry
any remaining questions into an active handoff, and archive the completed record.

## Choose a guide

| Guide | Audience and scope |
|---|---|
| [Data-flow atlas](data-flow/README.md) | Data sources, import scripts, calculations, assumptions, publishing, and field maintenance, with diagrams. |
| [User guide](USER_GUIDE.md) | Players: controls, comparisons, outputs, and interpretation. |
| [Architecture](ARCHITECTURE.md) | Developers: module ownership, startup, state, URL compatibility, rendering, capture. |
| [Data sources](DATA_SOURCES.md) | Data maintainers: source authority, Frosty review pipeline, provenance, promotion rules. |
| [Data reference](DATA_REFERENCE.md) | Developers/data maintainers: JSON contracts, field meanings, units, all live array families. |
| [Stat ladders](STAT_LADDERS.md) | Model maintainers: complete finite tables, geometric factors, index signs, bounds, examples. |
| [Attachment model](ATTACHMENT_MODEL.md) | Model maintainers: selection, modifier composition, handling, reload, ammo, disclosure. |
| [Attachment bugs and mismatches](ATTACHMENT_BUGS.md) | All readers: attachment game data bugs, description errors and fixed site data errors, with evidence and status. |
| [Damage and ballistics](DAMAGE_BALLISTICS.md) | Model readers: curves, hit zones, BTK, firing cadence, TTK, drag, trajectory, target limits. |
| [Recoil and spread](RECOIL_SPREAD_MODEL.md) | Model readers: per-shot equations, recovery, sampling, calibration, visual interpretation. |
| [Model limitations](MODEL_LIMITATIONS.md) | All readers: retained-but-unused fields, estimates, unresolved composition and validation gaps. |
| [Maintenance](../MAINTENANCE.md) | Contributors: change procedures, evidence requirements, compatibility and shipping checks. |
| [Tests](TESTS.md) | Contributors: actual checks, their coverage, manual verification and research-tool boundaries. |

## Open research

[Active Frosty recoil and spread handoff](working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md)
contains current status, remaining source questions, and capture plans. Completed
recording analyses and implementation handoffs are in the
[archive index](archive/README.md), with links back to current guides.

The [global-candidates audit](working/FROSTY_GLOBAL_CANDIDATES_2026-09-13.md)
records accepted source-model changes and the remaining activation/composition
questions. Its early checkpoints are explicitly historical.

The [composite stats findings](working/COMPOSITE_STATS_FINDINGS.md) collect the
Hipfire, Precision, Control and Mobility evidence, including the Frosty Precision tables.

The [UI strings review](working/FROSTY_UI_STRINGS_REVIEW_2026-09-13.md) records
weapon descriptions, role tags, composite-stat UI assets and setting-label hashes.

## Authority and historical material

Implementation code and maintained `data/` define current behavior. Source records
document accepted values; historical proposals require confirmation against the
current implementation. Native engine arithmetic remains unverified where stated.

[Archive index](archive/README.md) separates completed implementation records
from dated investigations, with links to their current replacements. Historical records retain their original proposals and superseded checkpoints.
The archive index identifies their status and current replacements.

[Evidence index](../reference-data/provenance/README.md) locates source snapshots
and review outputs. The [attachment audit](../reference-data/attachment-audit/README.md)
is a separately maintained reference package. Neither is fetched by the browser.
Frozen published sites live in `v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/`;
local-only capture/migration material is ignored under `.local-archive/`.

## Keeping the documentation focused

Keep the repository README at overview depth. Document each formula in one guide
and link to it elsewhere. Put tables in the ladder/reference guides, controls in
the user guide, and completed work logs in the archive. Retain detailed research
as evidence and document accepted behavior in the current guides.

Use specific function names, inputs, outputs, units, and failure behavior.
Remove promotional language, rhetorical questions, and repeated explanations.
Keep source quotations, measured results, and uncertainty qualifications intact.

When a model changes, update its formula, units, fallback behavior, evidence boundary,
and at least one useful example. Check relative links and headings after moves.
Use GitHub's Markdown and Mermaid rendering without a separate documentation build.
