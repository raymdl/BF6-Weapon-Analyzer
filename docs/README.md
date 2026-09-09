# Documentation index

**Current implementation reference.** This documentation was reviewed against
`8dcd25ae5de268fb660c5bdd1c0ff92bb0e373dd` on 9 September 2026. Later changes
should update the affected guide alongside the implementation. Source-version
labels describe evidence provenance, not an independent certification of all game behavior.

## Choose a guide

| Guide | Audience and scope |
|---|---|
| [User guide](USER_GUIDE.md) | Players: controls, comparisons, outputs, and interpretation. |
| [Architecture](ARCHITECTURE.md) | Developers: module ownership, startup, state, URL compatibility, rendering, capture. |
| [Data sources](DATA_SOURCES.md) | Data maintainers: source authority, Frosty review pipeline, provenance, promotion rules. |
| [Data reference](DATA_REFERENCE.md) | Developers/data maintainers: JSON contracts, field meanings, units, all live array families. |
| [Stat ladders](STAT_LADDERS.md) | Model maintainers: complete finite tables, geometric factors, index signs, bounds, examples. |
| [Attachment model](ATTACHMENT_MODEL.md) | Model maintainers: selection, modifier composition, handling, reload, ammo, disclosure. |
| [Damage and ballistics](DAMAGE_BALLISTICS.md) | Model readers: curves, hit zones, BTK, firing cadence, TTK, drag, trajectory, target limits. |
| [Recoil and spread](RECOIL_SPREAD_MODEL.md) | Model readers: per-shot equations, recovery, sampling, calibration, visual interpretation. |
| [Model limitations](MODEL_LIMITATIONS.md) | All readers: retained-but-unused fields, estimates, unresolved composition and validation gaps. |
| [Maintenance](../MAINTENANCE.md) | Contributors: change procedures, evidence requirements, compatibility and shipping checks. |
| [Tests](TESTS.md) | Contributors: actual checks, their coverage, manual verification and research-tool boundaries. |

## Authority and historical material

Current behavior is established by the implementation and maintained `data/`.
The guides explain that behavior; source records explain why a value was accepted.
A historical report's proposed change does not establish that the change shipped.
An accepted source value does not prove the simulator reproduces native engine arithmetic.

[Archive index](../archive/README.md) separates completed implementation records
from dated investigations, with links to their current replacements. Historical
records are preserved, including their original future-tense statements and
superseded checkpoints. Read the archive index before treating a finding as current.

[Evidence index](../reference-data/provenance/README.md) locates source snapshots
and review outputs. The [attachment audit](../reference-data/attachment-audit/README.md)
is a separately maintained reference package. Neither is fetched by the browser.
Frozen published sites live in `v1.3.3.0/`, `v1.3.1.0/`, and `v1.2.3.0/`;
local-only capture/migration material is ignored under `.local-archive/`.

## Keeping the documentation focused

Keep the repository README at overview depth. Give each current guide one primary
purpose; cross-link shared formulas instead of maintaining duplicate explanations.
Tables belong in the ladder/reference guides, user interaction in the user guide,
and completed work logs in the archive. Long source investigations can remain long
when their evidence is useful; they must not become the current specification.

When a model changes, update its formula, units, fallback behavior, evidence boundary,
and at least one useful example. Check relative links and headings after moves.
Do not introduce a documentation build system merely to render these Markdown guides.
