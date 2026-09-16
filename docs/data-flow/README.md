# Data-flow atlas

[Documentation index](../README.md) · [Data sources](../DATA_SOURCES.md) · [Maintenance](../../MAINTENANCE.md)

**Scope:** the current root application, its maintained inputs, generation tools,
research boundary, calculations, displays, and publication. Reviewed against
[`d037503`](https://github.com/raymdl/BF6-Weapon-Analyzer/tree/d037503e1159ab8eb6533e292de5ed33206f0f30)
(main, 15 September 2026 in America/New_York). Counts below are that snapshot,
not automatically refreshed counters. Existing formula guides remain the detailed
specifications; this atlas shows how their inputs and outputs connect.

## Start here

```mermaid
flowchart TB
    S["SRC · Sym snapshot, EA notes,<br/>local Frosty XML, game captures"]:::src
    E["EVID · identities, hashes, source joins,<br/>panel review and unresolved findings"]:::ev
    C["CUR · reviewed base records,<br/>catalogs, mappings and model choices"]:::cur
    G["GEN · explicitly run extractors<br/>and field-scoped generators"]:::gen
    D["CUR + GEN · committed data/<br/>eight runtime JSON files"]:::cur
    M["ASM · mathematical and<br/>presentation assumptions · A01–A16"]:::asm
    R["RUN · normalize selected loadout<br/>and calculate effective build"]:::run
    V["OUT · overview and effects<br/>damage, recoil, spread, target"]:::out
    P["OUT · GitHub Pages<br/>current site and frozen versions"]:::out
    U["USER · selections, view state,<br/>URL fragment and local preferences"]:::src
    S --> E
    E --> C
    C --> G
    C --> D
    G -->|review generated diff| D
    D -->|committed static assets| P
    P -->|browser fetch| R
    U --> R
    M -.-> R
    R --> V
    V -->|partial state or rendered pixels| X["OUT · share URL, popout, PNG"]:::out
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

The browser consumes committed files. Extraction and review happen before
publication; the browser does not contact Frosty, Sym, a screenshot collection,
or an application database. Source operands and the simulator's interpretation
of those operands have separate evidence requirements.

## Reading the diagrams

| Label | Meaning | Important distinction |
|---|---|---|
| **SRC** | External/configuration input, or explicitly labeled user input. | A source label identifies origin; it does not certify activation or native arithmetic. |
| **CUR** | Human-maintained or human-approved records, joins, defaults, policies, assets. | A file can contain both curated fields and generated fields. |
| **GEN** | Data written by a named offline extractor/generator. | Generation is reproducible only with its required inputs and reviewed mappings. |
| **RUN** | Values computed in the browser or a reusable simulation module. | These are conditional model results, rather than independently measured game values. |
| **ASM** | Modeling approximation, empirical fit, fallback, or presentation policy. | IDs link to the [assumption register](REGISTER.md#assumptions-and-interpretation). |
| **EVID** | Provenance, review records, diagnostics, or retained research. | Evidence is not automatically an application input. |
| **OUT** | A published file, visible result, or export. | A published repository file may never be fetched by the application. |

Solid arrows show the named data/control dependency. Dashed arrows show evidence
or an assumption informing a decision/calculation. Colors reinforce the labels;
the labels carry the same meaning in monochrome. Some diagrams show evaluation
order; others show dependencies, as their captions explain. **CUR + GEN** means
mixed ownership, not a claim that every field can be regenerated.

## Map of the atlas

| Question | Diagram guide |
|---|---|
| Where do values come from, and which tools actually write them? | [Sources, ingestion and promotion](SOURCES.md) |
| How do menus, defaults, mounts, attachments, ladders and statistics connect? | [Loadouts and overview](LOADOUTS.md) |
| How do damage curves, ammo, hit zones, timing, drag and trajectories connect? | [Damage and ballistics](DAMAGE_BALLISTICS.md) |
| What produces recoil paths, spread growth, sampled shots and scatter? | [Recoil and spread](RECOIL_SPREAD.md) |
| How are shots projected onto the soldier and turned into hit/damage results? | [Target view](TARGET.md) |
| What is fetched, cached, shared, captured, validated and published? | [UI, state and publication](UI_PUBLISHING.md) |
| Which fields are manual/generated, where are assumptions, and what changes together? | [Ownership and assumption register](REGISTER.md) |

## Coverage by site surface

| Site surface | Trace |
|---|---|
| Weapon list, classes, labels and descriptions | [Selection and metadata](LOADOUTS.md#selection-and-metadata) |
| Attachment/ammo/magazine choices, rails, dependencies and points | [Valid loadout](LOADOUTS.md#valid-loadout) |
| Tooltips and text-versus-mechanics boundary | [Text pipeline](SOURCES.md#text-and-capture-review) |
| All overview statistics and comparison percentages | [Overview output inventory](LOADOUTS.md#overview-output-inventory) |
| Attachment-effect chips and assumption markers | [Default-relative effects](LOADOUTS.md#default-relative-effects) |
| Damage/BTK/TTK charts, table and headshot scenarios | [Range outputs](DAMAGE_BALLISTICS.md#range-outputs) |
| ADS, sprint, draw/holster, movement, hip spread and recoil ladders | [Ladders and timing](LOADOUTS.md#ladders-and-timing) |
| Recoil path, spray, spread circles, connected envelope, ten-run scatter and contextual bars | [Recoil/spread outputs](RECOIL_SPREAD.md#outputs-and-sampling) |
| Target distance, zeroing, aim, magnification, hit regions and impact statistics | [Target view](TARGET.md) |
| Compare mode, collapsed panels, data errors, responsive rendering | [Runtime startup](UI_PUBLISHING.md#runtime-startup) |
| Share link, legacy links, local preferences, popout and PNG | [State and exports](UI_PUBLISHING.md#state-and-exports) |
| Header/version links, root site, frozen versions and research visibility | [Publication](UI_PUBLISHING.md#publication-and-validation) |
| Reference-only weapon roles, game composite-stat research and legacy fields | [Non-executed material](REGISTER.md#retained-and-non-executed-material) |

At this baseline there are **63 weapons, 328 supported weapon/ammo selections,
64 projectile records, and eight startup JSON requests**. These are different
counts: many selections share a projectile, and a fetched file can contain legacy
fields that do not participate in the current equations.

## How to keep this atlas current

When a field changes, update its row in the [ownership register](REGISTER.md),
the affected feature diagram, and its existing formula/source guide. Preserve
this review commit as the historical audit point until the atlas is rechecked;
record a new commit when performing a new complete review. Do not reinterpret
old provenance hashes as hashes of a newly generated dataset.

Mermaid diagrams render in GitHub's Markdown view. This atlas adds no browser
runtime dependency, documentation build system, automatic source importer, or
new claim that CI remeasures the game. Relative links point to maintained code,
source evidence, and the existing guides; use the pinned review commit above to
inspect the exact audited versions.
