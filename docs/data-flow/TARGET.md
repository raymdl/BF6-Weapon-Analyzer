# Target projection and impact results

[Atlas](README.md) · [Recoil and spread](RECOIL_SPREAD.md) · [Damage and ballistics](DAMAGE_BALLISTICS.md)

## Angular pattern to physical impact

```mermaid
flowchart TB
    P["RUN · main reference spray<br/>pre-shot recoil + sampled spread angles"]:::run
    D["USER · distance, aim preset/custom aim,<br/>supported zero distance"]:::src
    B["RUN · selected projectile + precise speed<br/>zeroRelativeVerticalOffset"]:::run
    C["RUN · angular projection<br/>100 × distance(m) × tan(angle) → cm"]:::run
    I["RUN · physical impact coordinates<br/>plus aim and vertical flight offset"]:::run
    H["RUN · alpha-mask body hit test<br/>and approximate zone partition"]:::run
    V["USER · magnification, pan/zoom,<br/>FOV and display resolution"]:::src
    O["OUT · target canvas and shot markers"]:::out
    A["ASM · point impacts and target geometry<br/>flight-law approximation · A06/A10"]:::asm
    P --> C
    D --> C
    C --> I
    B --> I
    I --> H
    I --> O
    V --> O
    A -.-> I
    A -.-> H
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

The physical position is derived before viewport scaling. Distance changes the
physical spread on the target; aim changes its offset; the selected projectile
model contributes drop/zeroing. Magnification, FOV, display resolution and plot
pan/zoom control the view of those coordinates. They do not make the underlying
projectile more accurate.

`ui/app.js` assembles the projectile from the generated weapon/ammo map and the
build's precise velocity, then calls [`sim/ballistics.js`](../../sim/ballistics.js).
A missing/non-finite target flight result currently yields zero vertical offset
in the display helper. That is a fallback drawing behavior, not evidence of a
flat real-world trajectory; unavailable TTK travel has a different path. See
[missing data](REGISTER.md#missing-data-and-fallbacks).

## Image, zone classification and summaries

```mermaid
flowchart TB
    A["CUR · assets/soldier-target.png<br/>project visual asset"]:::cur
    G["CUR · sim/target.js geometry<br/>180 cm height, partitions, aim metadata"]:::cur
    L["RUN · lazy image load<br/>offscreen canvas alpha mask"]:::run
    I["RUN · reference spray impact coordinates"]:::run
    H["RUN · alpha hit / miss<br/>then targetZoneAt"]:::run
    M["GEN · weapon/ammo head and limb factors"]:::gen
    D["RUN · selected damage curve at range"]:::run
    S["RUN · summarizeTargetImpacts<br/>zone damage, totals and first lethal"]:::run
    O["OUT · accuracy, hit regions, damage,<br/>first-lethal and assist styling"]:::out
    X["ASM · approximate body partitions,<br/>100 health; 75-damage styling · A10/A12"]:::asm
    A --> L
    L --> H
    G --> H
    I --> H
    H --> S
    M --> S
    D --> S
    S --> O
    X -.-> H
    X -.-> S
    X -.-> O
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

[`sim/target.js`](../../sim/target.js) treats the image as a project-maintained
visual asset and uses its alpha mask for silhouette hits. The code assumes a
180 cm soldier and supplies hand-maintained head/chest/torso/limb partitions and
aim offsets. No reproducible extraction of a native collision mesh is established
by this asset or those constants. The root `soldier-target-original.png` is a
reference asset, not the lazily fetched runtime target.

The image loads only when target view is needed, including entry through a shared
link or popout. Without the image, hit classification is disabled. The generated
head/limb damage multipliers are applied **after** the geometric zone decision;
source-backed multipliers do not validate the drawn zone boundaries.

| Result | Computed from | Interpretation limit |
|---|---|---|
| Hit count and accuracy | Reference spray zones versus misses. | One sampled finite sequence; not an expected hit probability. |
| Head, chest, stomach, arm and leg breakdown | Approximate zone partitions and generated selected multipliers. | Chest uses 1; non-head peripheral/lower zones use the selected limb factor. |
| Per-hit / total damage | Selected damage at range multiplied by the classified zone factor. | Totals can include later hits after a first lethal result. |
| First lethal shot / hit counts | Cumulative damage against 100 health. | No armor, healing, target movement or suppression response. |
| Critical-assist styling | Maintained 75-damage presentation threshold. | UI policy; it does not implement or validate game reward logic. |
| Multi-pellet ammo | Detailed target damage statistics are suppressed when `pellets > 1`. | Individual pellet paths are not generated. A single-projectile slug is not excluded by that condition. |

Presentation is in [`ui/target-stats.js`](../../ui/target-stats.js) and the target
orchestration in [`ui/app.js`](../../ui/app.js). The main reference spray is the
statistics input even if the user also draws the ten-run scatter layer. Overlay
visibility should not be used to infer which points were counted.

## What a target change affects

Replacing the target PNG can change silhouette hit tests. Changing the geometry
constants can change aim placement, body/zone decisions, accuracy and damage
summaries while leaving the weapon's damage and recoil inputs unchanged. Changing
only viewport magnification should leave physical impacts and hit summaries
unchanged. This distinction is useful when reviewing screenshot differences and
when deciding whether to rerun model tests, target tests or manual rendering checks.
