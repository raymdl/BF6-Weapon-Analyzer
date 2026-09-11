# User guide

[Documentation index](README.md) · [Model limitations](MODEL_LIMITATIONS.md)

This guide describes the current root site. Published older versions preserve
older data and behavior and may not have the same controls.

## Build and compare loadouts

Select a class and weapon in the loadout panel, then select attachments, ammunition,
magazine, and ergonomics. Menus are filtered to the weapon's supported selections.
A combined rail slot can hold a laser, light, or grip; the corresponding separate
control is disabled where that space is shared. A new weapon resets its build to
that weapon's recorded defaults.

Attachment labels include point costs. **More than 100 points produces a warning;
it does not block calculation or sharing.** An asterisk marks an attachment with
assumed effects. Some listed attachments have no modeled stat effect; their
availability or point cost can still matter.

Enable comparison for a second independent loadout. Clone the first loadout to
compare attachment changes on the same weapon. Disabling comparison clears the
second slot. On smaller screens, the Loadout button opens a dialog; Escape closes
it and returns focus to the opener.

## Overview and attachment effects

Overview groups combat, ammunition, mobility, recoil, spread, and concealment
statistics. Use the attachment-effects breakdown to trace changes from the default
build. Values can move in opposite desirable directions: more damage and velocity
are usually helpful, while less reload time or dispersion is usually helpful.
A favorable indicator for one statistic is not an overall weapon ranking.

The overview's recoil values and ADS-related fields describe the selected build's
ADS baseline. Changing the recoil plot to hipfire changes that plot's simulation
and contextual recoil statistics; it does not redefine every overview card.
Source precision is retained for calculations even where cards round milliseconds,
velocity, or movement multipliers. Missing values are displayed as unavailable
where supported rather than being evidence of a measured zero.

## Damage, bullets to kill, and time to kill

| View | What it shows | Interpretation |
|---|---|---|
| Damage | Chest damage by distance, with a chest-to-limb band where multipliers differ. | The plotted damage is capped at 100; the underlying calculation and some tooltips retain higher damage. |
| Bullets to kill (BTK) | Shots required against 100 health, with 0–3 headshots and remaining chest/limb hits. | Headshots are a count within the lethal sequence, not a hit-rate percentage. A dashed 0-headshot baseline helps compare scenarios. |
| Time to kill (TTK) | Time from the first shot to the lethal shot. Optional ADS and projectile flight time are added. | No reaction time, misses, reload interruptions, armor, or target regeneration is included. |

The headshot setting affects BTK and TTK. Chest/limb bands describe alternative
hit placement, not statistical confidence. Shotgun damage/BTK assumes all pellets
hit the selected zone. Pump-action multi-shot TTK is unavailable because a validated
pump cycle is not modeled. Burst weapons use separate within-burst and between-burst
cadence. The range table complements the chart at class-appropriate distances.
See [damage and ballistics](DAMAGE_BALLISTICS.md) for the equations and endpoint rules.

## Recoil and spread

Choose **Angle Plot** for angular comparison or **Soldier Target** for a projected
pattern at distance. Choose ADS/hipfire, standing/moving, PC/console, and 1–100 shots.
These are model contexts; they do not add crouch, prone, player skill, or aim-assist simulation.

| Layer/control | Meaning |
|---|---|
| Scatter cloud | Ten fixed seeded runs showing variability around the modeled path. It is not a confidence region. |
| Spray | One sampled run, including random spread. Reroll selects another reference seed. |
| Recoil path | Aim displacement without the random spread sample. |
| Spread circles / cone | Angular spread envelopes, with selectable shot samples. They describe the model's bounds. |
| Recoil control | Subtracts 0–125% of the expected recoil vector; defaults to 0%. It leaves random variation and spread. Values above 100% overcompensate. |
| Zoom, pan, crosshair | Change inspection of the plot, not weapon accuracy. |

Spread-circle samples offer growth, early-shot, all-shot, and custom selections.
Custom examples: `1,2,5-8`, `every 3`, or `all`; `every 3` begins at shot 1.
The effective-spread statistic is the final value of a bounded 50-shot calculation,
not the highest transient spread or a proven infinite-fire equilibrium.
The [recoil guide](RECOIL_SPREAD_MODEL.md) explains each layer and the per-shot sequence.

Recoil is delivered over the selected weapon/attachment duration while recovery
acts at the same time. Smooth attachments use source duration and recovery values;
some weapon–muzzle pairs differ from the ordinary 50 ms/1.2 set. Heavy-type barrels
use source ADS spread factors supported by the AK4D recordings. These are model
inputs, not a guarantee that the displayed pattern matches every in-game shot.

## Soldier Target

Distance ranges from 5 to 300 metres and starts at 20 metres. The slider snaps to
coarser distance increments farther away. Magnification, display resolution/aspect,
and horizontal FOV change the viewing scale. Display resolution/FOV preferences
are saved locally when browser storage is available.

Aim at chest or head, or Ctrl+click the plot to place a custom aim point and fire a
new sample. Shift+drag pans the target view. The soldier remains fixed in world
space when the aim point changes. DMR/sniper builds expose zero distances from
100 to 500 metres; other weapons use the bore-relative trajectory in this model.

Target Impact Stats report hits, sampled hit rate, damage by body part, and the
hits/shots needed to reach lethal damage. Total damage includes subsequent hits
after the first lethal shot. The 180 cm figure and its hit zones are approximate;
results describe this sample, not expected player accuracy. If its image is missing,
hit statistics are unavailable. Pellet loads explicitly suppress hit-rate, damage,
and lethality results because the plot shows one direction per shell.

## Share, capture, and pop out

**Copy Link** saves the selected weapons, attachments, and supported chart/recoil
settings in the URL fragment. It does not save the reroll seed, plot layers, zoom/pan,
custom spread-circle selection, or local display preferences. Opening the same link
reconstructs the build and encoded settings; it need not reproduce a rerolled image.
Legacy target links with no stored distance open at 30 metres for compatibility.

**Copy Image / Save Image** captures the current main view with attribution. The
capture uses a consistent 1280 CSS-pixel layout and a 2× output bitmap. Overview is
expanded temporarily so loadout identity is included. Other collapsed panels remain
collapsed. Unsupported image-copy controls are disabled; a failed clipboard write
falls back to downloading the PNG. Capture failure is reported separately.

**Pop Out** opens the recoil view using the same share-state contract, not a live
synchronized mirror. Its Modify Loadout control lets that window change its own build.
The site logo returns to the bare root view. Panel-collapse buttons reduce clutter;
their state is included in share links.
