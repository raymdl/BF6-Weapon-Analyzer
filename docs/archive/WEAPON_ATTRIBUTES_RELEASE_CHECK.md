# Weapon Attributes release check — 21 September 2026

Archived release investigation. The operator authorized publication on 21 September
2026. Earlier checkpoints below are retained as history; the superseding reviews
resolve the initial lookup gaps. Current behavior and limits are maintained in
[the model guide](../WEAPON_ATTRIBUTES_MODEL.md).

## Completed

- Runtime calculates scores from Frosty inputs, not screenshot values.
- 160 current panels / 640 values still match after the lookup fix.
- GRT-BC Burst Mode: the source table contains a row at amount -2, variation 3,
  RPM 830.769, spread 0.304, duration 0.0244, decrease 57, panel 35.688 (36).
  Rounded modeled RPM 830 forced broad matching, which also admitted duration
  0.025 and a different score. Prefer duration-exact matching before the broader
  fallback. This fixes the lookup without changing recoil operands.
- Existing Frosty assumption trace gives GRT-BC +1 recoil amount tier from
  conversion -1 plus weapon +2, compared with net zero for other burst selectors.
- Pair coverage: 71,166 unique normalized builds at <=100 points; five missing
  Precision results, all SL9 Burst Mode. This is not exhaustive full-loadout coverage.

## Remaining

1. SL9 Burst Mode with Compensated Brake, Linear Comp, Long Suppressor,
   Lightened Suppressor or Compensator has no matching row. Trace the table/provider
   handling of combined burst and muzzle modifiers; do not invent a fallback.
2. Validate equipped vs hovered Burst Mode. Useful captures: default SL9, Burst
   Mode equipped, and Burst Mode plus Compensated Brake. Capture a hover separately
   if equipping is unavailable. GRT-BC equipped Burst Mode is a useful independent
   check of the modeled 36, not the source of that value.
3. Hipfire conditional operation and Control sine/zero boundary remain inferred.
   Existing resource decode and XML do not establish native function semantics.
   Need native helper resolution or discriminating observations before claiming
   engine confirmation.
4. Extend beyond pairs after resolving these cases. No full-combination guarantee.

## Files

- [Current model](../WEAPON_ATTRIBUTES_MODEL.md)
- [Coverage evidence](../../reference-data/provenance/weapon-attributes-pair-coverage-2026-09-21.json)
- `sim/weapon-attributes.js`, `scripts/weapon-attributes.test.mjs`
- Reproducible local pair scan: `outputs/check-attribute-pairs.mjs` (not shipped).
- Source operands: `reference-data/provenance/frosty-assumption-review.json`.

## Superseding capture review

Eight supplied screenshots establish GRT-BC 26 Precision/37 Control with Burst
Mode equipped and SL9 78/55. Compensated Brake hover with Burst Mode equipped
reads GRT-BC 27/40 and SL9 80/59. The previous 36 GRT-BC prediction was a valid
row for the wrong panel inputs. The runtime now excludes only these two burst
selectors' recoil changes when calculating Precision and Control, retaining
selected RPM and all other attachments. Firing simulation remains unchanged.

The repeated 71,166-build pair scan now has zero missing Precision results.
The five SL9 gaps listed above are resolved by this input rule. Native-provider
confirmation, full-combination coverage and formula assumptions remain open.
Evidence: [burst panels](../../reference-data/provenance/burst-panel-inputs-2026-09-21.json).

## Burst Training follow-up

KORD equipped Burst Training retains 40/33/55/52. SG 553R and PW5A3 hover
captures retain 47/23/37/60 and 47/35/53/68. The panel rule now covers these
weapons; equipped parity on the latter two remains unverified. M16 A3 remains
separate: its preview changes Precision 27 to 24 and Control 41 to 39 while
variation stays 29.2 degrees. Regression tests cover all eight new panels.

The three-slot coverage scan returns scores for 866,440 normalized builds within
100 points, with zero missing Precision results. This is lookup availability,
not screenshot validation or exhaustive full-loadout coverage.

The saved Frosty assumption trace distinguishes direct Linear Comp selection
from burst recoil behind a nested fire-mode selector (mask 8). Both conversion
assets carry -1 amount and +3 variation tiers; burst adds +1 amount (GRT-BC +2).
A panel consumer may omit the nested selector. Misactivation during firing is
still a hypothesis, not an established attachment bug.
