# Recoil, spread and sampled patterns

[Atlas](README.md) · [Recoil/spread formulas](../RECOIL_SPREAD_MODEL.md) · [Assumptions](REGISTER.md#assumptions-and-interpretation)

Checked against `b3e67bf` on 22 September 2026.

## Per-aim recoil path

```mermaid
flowchart TB
    W["CUR · weapon recoil.ads / recoil.hip<br/>amount, direction, variation, recovery, duration"]:::cur
    M["CUR + GEN · selected source amount steps,<br/>duration overrides and recovery factors"]:::cur
    U["USER · ADS/hip, stand/move,<br/>platform, control %, shots and seed"]:::src
    B["RUN · resolved recoil group<br/>and selected amount/variation"]:::run
    RNG["RUN · deterministic PRNG<br/>weapon hash + selected seed"]:::run
    I["RUN · shot impulse + expected-vector<br/>control subtraction"]:::run
    T["RUN · deliver impulse over duration<br/>while per-axis recovery acts"]:::run
    P["RUN · pre-shot angular offsets<br/>first point at zero"]:::run
    A["ASM · timed delivery, per-axis recovery,<br/>controller scope and control model · A07/A08"]:::asm
    W --> B
    M --> B
    U --> B
    U --> RNG
    B --> I
    RNG --> I
    I --> T
    T --> P
    A -.-> I
    A -.-> T
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
```

[`sim/core.js`](../../sim/core.js) selects the explicit ADS/hip group and consumes
amount/variation factors, exponents, direction and recovery fields. The attachment
resolver supplies field-scoped modifications. The `recoil_decay.json` maps are
still fetched at startup but are retained legacy data, not current recovery
fallbacks.

As of 22 September 2026 all 126 base aim-state durations (63 weapons × ADS/hip) are 25 ms. Ordinary
Smooth selections use 50 ms and a 1.2 recovery factor; 17 mapped Bolt-type pairs
use 66.667 ms and 1.728, plus their recovery-time exponent adjustment. Ergonomic
duration addition is applied after the muzzle override. The PP-19 Flash Comp
selector gap remains an explicit evidence limit. Source durations and factors
are documented in the [duration audit](../../reference-data/provenance/frosty-recoil-duration-audit-2026-09-11.json).

`genRecoilPts` seeds `mulberry32` from weapon hash and seed, samples direction
variation, and subtracts a fraction of the expected recoil vector for the chosen
control percentage. The random component remains. Delivery and recovery overlap;
unfinished impulses can continue across a subsequent shot, and recovery age
resets per shot. Integration uses at most 1 ms steps around impulse delivery (A07).

The console option applies the source `0.8836` amount factor through a shared
platform model (A08). Platform and control affect only the contextual recoil
displays, not the base values shown in the overview.

## Spread growth and inter-shot recovery

```mermaid
flowchart TB
    B["CUR · four aim/stance min-max pairs<br/>and selected minimum ladder rows"]:::cur
    D["CUR + GEN · per-aim dynamics<br/>increment, coefficients, exponents, offsets"]:::cur
    H["CUR + GEN · Heavy ADS factors<br/>and light/combo hip factors"]:::cur
    S["RUN · simulateSpread<br/>record current spread BEFORE each shot"]:::run
    G["RUN · add increment and clamp"]:::run
    I["RUN · shotIntervalAfter<br/>ordinary interval or split burst gap"]:::run
    R["RUN · recover toward minimum<br/>firing / not-firing branch as applicable"]:::run
    O["RUN · per-shot pre-shot spreads"]:::run
    E["OUT · effectiveSpreadMax<br/>one-magazine peak pre-shot spread"]:::out
    A["ASM · recovery equation, branch timing,<br/>selected lights active, idle omitted · A09"]:::asm
    B --> S
    D --> S
    H --> D
    S --> G
    S --> O
    G --> R
    I --> R
    R -->|next shot| S
    R --> E
    A -.-> R
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
```

All four `[min, max]` pairs are required: standing/moving for ADS/hipfire. Selected
finite-table changes replace applicable minima while preserving the source maximum.
`simulateSpread` records the spread **before** incrementing for that shot, then
recovers during the interval. The first sample therefore uses the settled minimum.

Ordinary shot intervals use firing recovery. An extended burst gap can split into
firing recovery over its firing interval and not-firing recovery over the remaining
gap. The bounded nonlinear equation uses spread above the selected minimum,
coefficient/exponent/offset and at most 1 ms steps. It is not simply a constant
spread decrement on every weapon.

Heavy-type barrels use source ADS factors: increment `0.666667`, firing coefficient
`1.837117`, firing and not-firing offsets `0.666667`. Light/combination selections
apply the corresponding source hipfire factors. Lights are modeled as active;
separately selected light and combo factors multiply. Recording-checked on the
AK4D Heavy barrel ([evidence](../archive/AK4D_HEAVY_BARREL_RECORDING_ANALYSIS_2026-09-11.md)).

The effective maximum shown by contextual statistics is the **peak simulated
pre-shot spread across one magazine**, rounded for display (A12). Idle fields and `firstShotMul`
are not executed (A16).

## Outputs and sampling

```mermaid
flowchart TB
    R["RUN · pre-shot recoil offsets"]:::run
    S["RUN · pre-shot spread radii"]:::run
    X["CUR · aim/movement distExp<br/>normally 0.5; Interdictor moving ADS 0.67"]:::cur
    U["RUN · uniform angle and U<br/>radius = spread × U^distExp"]:::run
    P["RUN · recoil offset + sampled spread<br/>reference spray impacts"]:::run
    M["OUT · main spray and target hit sample"]:::out
    C["OUT · recoil path, spread circles<br/>and connected envelope"]:::out
    Q["RUN · repeat with ten fixed seeds"]:::run
    T["OUT · scatter overlay"]:::out
    B["OUT · contextual stats and bars<br/>selected bounds + recovery endpoint"]:::out
    A["ASM · sampling interpretation and<br/>evidence scope · A09/A12"]:::asm
    R --> P
    S --> U
    X --> U
    U --> P
    P --> M
    R --> C
    S --> C
    R --> Q
    S --> Q
    Q --> T
    S --> B
    A -.-> U
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
```

Both the main spray and scatter use `sampleSpreadRadius`; a uniform angle plus
`U ** 0.5` gives a uniform-area disk. Recording-checked for M39 settled hipfire
only (A09). Interdictor's moving-ADS source exponent is `0.67`.

| View/layer | Dependency and meaning |
|---|---|
| Recoil path | Pre-shot angular recoil sequence without random spread offsets. |
| Main spray | One reproducible reference seed; add a sampled spread offset to each recoil point. Reroll changes this sample. |
| Spread circles | Selected pre-shot radius centered on the corresponding recoil point. |
| Connected envelope | Geometric connection of spread bounds; it is not a fitted probability contour. |
| Scatter | Ten fixed seeded runs; independent of the main spray reroll. It provides repeated examples, not a computed confidence interval. |
| Contextual statistics and bars | Aim/stance-specific amount, variation, bounds, increment and peak pre-shot spread across one magazine (50 increases when magazine size is unknown). Bar normalization uses UI scale constants, not extra source parameters. |
| Target impacts | The main reference spray projected into metres/centimetres. Target statistics do not pool the scatter overlay or count the envelope as shots. |

`ui/app.js` caches pattern/sequence results using their relevant inputs. Layer
visibility, pan/zoom and canvas scaling affect drawing, not the underlying
selected build. Target statistics can still use the reference spray when its
visual layer is hidden. Seeds and layer choices are not encoded in ordinary share
links; see [state and exports](UI_PUBLISHING.md#state-and-exports).

## Source fields without independent execution

`decNorm`, `shootingDecScale`, spread `idleTime/idleCoef/idleExp/idleOffset`,
`firstShotMul` and the light's idle-recovery operand are stored but not executed.
See the [register](REGISTER.md#retained-and-non-executed-material) and, for the
25 ms recoil-duration code fallback, [missing data](REGISTER.md#missing-data-and-fallbacks).
