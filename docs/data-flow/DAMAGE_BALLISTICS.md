# Damage, hit zones and ballistics

[Atlas](README.md) · [Source generation](SOURCES.md#projectile-hit-zone-and-collateral-chain) · [Formula guide](../DAMAGE_BALLISTICS.md)

## Source curves and selected projectile

```mermaid
flowchart LR
    F["SRC · Frosty projectile damage curves<br/>and reviewed ammo selections"]:::src
    E["CUR · curve review and promoted<br/>range points; M45A1 step exception"]:::cur
    D["CUR · weapons[].dmg<br/>ammo projectileOverrides.dmg / pellets"]:::cur
    B["RUN · effective selected build"]:::run
    H["GEN · hit_zones.json<br/>base/ammo head and limb multipliers"]:::gen
    P["GEN · ballistics.json<br/>base/ammo projectile + gravity/drag"]:::gen
    V["RUN · precise selected velocity"]:::run
    R["RUN · damage and timing functions"]:::run
    T["RUN · trajectory functions"]:::run
    F --> E
    E --> D
    D --> B
    B --> R
    H --> R
    P --> T
    V --> T
    T -->|level flight time only| R
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

Current base curves are accepted Frosty curves. Their promotion/review is distinct
from the existing hit-zone and ballistics generators: do not infer an automatic
whole-weapon importer from a `damageSource` label. Selected ammo can replace the
curve and pellet count; eight retained override curves cover the four shotguns'
00-buck/slug alternatives. See [weapons.json](../../data/weapons.json),
[ammo.json](../../data/ammo.json), and the [curve review](../../reference-data/provenance/frosty-damage-curve-review-2026-09-13.json).

`dmg[]` keeps nondecreasing range order. Repeated ranges encode a discontinuity;
collapsing them into a unique-key map would change the model. Between distinct
ranges the code interpolates, and outside the range it uses the endpoint value.
Exact-boundary behavior is defined by [`damageAtRange`](../../sim/damage.js) and
its [tests](../../scripts/damage.test.mjs).

## Range outputs

```mermaid
flowchart TB
    C["CUR · selected curve and pellet count"]:::cur
    U["USER · range, chart mode,<br/>0–4 headshots, ADS/flight toggles"]:::src
    H["GEN · selected head/limb multipliers<br/>chest multiplier is 1"]:::gen
    D["RUN · damagePerShotAtRange<br/>interpolate then multiply by pellets"]:::run
    B["RUN · bulletsToKillAtRange<br/>100 health and selected hit scenario"]:::run
    I["RUN · shotIntervalAfter<br/>auto, semi, burst or manual cycle"]:::run
    K["RUN · TTK = intervals for BTK minus 1<br/>plus enabled ADS / level flight time"]:::run
    O["OUT · damage, BTK and TTK<br/>range chart and table"]:::out
    A["ASM · ideal hits, full pellet contribution,<br/>no misses/reloads/armor · A04"]:::asm
    C --> D
    U --> D
    D --> B
    H --> B
    U --> B
    B --> K
    I --> K
    U --> K
    D --> O
    B --> O
    K --> O
    A -.-> D
    A -.-> B
    A -.-> K
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

[`resolveHitMultipliers`](../../sim/damage.js) requires the explicit selected
weapon/ammo entry. Base/null ammo uses the explicit base record. Current supported
selections do not use a generic head/limb fallback. These multipliers are generated
from protection/material lookup; the target view's drawn anatomical regions have
a separate approximate origin (A05/A10).

| Calculation | Inputs and interpretation |
|---|---|
| Damage | Selected per-projectile curve; `pellets` multiplies per-shot damage for the ordinary range calculations. All pellets are assumed to contribute to the chosen zone. |
| BTK | 100 health, a selected number of headshots, and chest/limb scenario. Remaining health is divided by the relevant body damage with an integer ceiling and small boundary tolerance. |
| Firing time | The first shot occurs at time zero. Sum the next `BTK - 1` shot intervals; avoid a universal `(BTK-1) × 60/rpm` shortcut for burst/pump sequences. |
| Burst/manual cycle | `rpm`, `burstRpm`, `burstRounds` and `burstBurstsPerMinute` establish within/between-group cadence. DB-12's two-round pump cycle uses that route; bolt/single-pump base RPM already represents the effective cycle. |
| Optional ADS | Add the selected build's ADS milliseconds when enabled. This models sequential delay; it does not simulate partial ADS during firing. |
| Optional travel | Add drag-aware level flight time using precise selected velocity and the explicit projectile coefficient. Gravity is handled separately in the target trajectory. |

`ui/app.js` samples these functions for the chart and table, formats outputs and
uses the vendored Chart.js renderer. It does not fetch a precomputed TTK table.
No miss sequence, magazine exhaustion/reload, armor, healing, reaction time,
network delay or target motion enters ideal TTK. These are model-scope decisions,
not missing source columns to fill with zeros.

## Flight time, drop and zeroing

```mermaid
flowchart TB
    S["GEN · selected projectile GUID<br/>gravityMps2 and dragPerMeter"]:::gen
    V["RUN · _projectileVelocityMps<br/>after ammo and barrel treatment"]:::run
    M["RUN · explicit projectile model"]:::run
    F["RUN · flightTimeAtDistance<br/>analytic level drag approximation"]:::run
    T["RUN · trajectoryAtDistance<br/>2D RK4 integration"]:::run
    Z["USER · target range and<br/>supported zero distance"]:::src
    Q["RUN · zeroRelativeVerticalOffset<br/>solve launch angle then drop at range"]:::run
    C["OUT · optional flight time in TTK"]:::out
    P["OUT · vertical offset of target impacts"]:::out
    A["ASM · point projectile, drag law,<br/>2D zeroing and no sight height · A06"]:::asm
    S --> M
    V --> M
    M --> F
    M --> T
    T --> Q
    Z --> Q
    F --> C
    Q --> P
    A -.-> F
    A -.-> T
    A -.-> Q
    classDef src fill:#e8efff,stroke:#4463a6,color:#16284c
    classDef cur fill:#fff1d9,stroke:#9c6b17,color:#492f08
    classDef gen fill:#dcf4ef,stroke:#27806c,color:#123f35
    classDef run fill:#eef0f5,stroke:#616a80,color:#242938
    classDef asm fill:#fff0ef,stroke:#b34c46,color:#621f1b,stroke-dasharray:5 3
    classDef out fill:#eee8ff,stroke:#7958aa,color:#36244f
    classDef ev fill:#f7f7f7,stroke:#858585,color:#333333,stroke-dasharray:3 3
```

The scalar time approximation is `distance / velocity` at zero drag and
`expm1(drag × distance) / (drag × velocity)` otherwise. Target trajectories use
`dp/dt = v` and `dv/dt = (0, gravity) - drag × |v| × v`, with a 1/500 s RK4 step
and a finite integration horizon. The zero solver searches a launch angle to
intersect the selected zero plane; the UI offers supported zero distances for
DMR/sniper categories. See [`sim/ballistics.js`](../../sim/ballistics.js).

Source-backed gravity and drag establish operands. They do not prove this
particular flight law, numerical scheme, zeroing method or neglected sight height
matches the native engine. The [register](REGISTER.md#missing-data-and-fallbacks)
also distinguishes unavailable flight-time results from the target display's
zero-offset fallback when a trajectory cannot be resolved.

## Change impact

A changed curve affects base damage, BTK/TTK, target hit damage, first-lethal
summaries and comparison/effect displays. A changed hit-zone/material join affects
HS/limb cards and both range and target damage. A changed velocity/drag/gravity
selection affects travel/drop; gravity does not enter the level-time formula.
Regenerate the hit-zone trace and ballistics together when selection identities
change, and run the focused [damage](../../scripts/damage.test.mjs) and
[ballistics](../../scripts/ballistics.test.mjs) tests in addition to cross-file checks.
