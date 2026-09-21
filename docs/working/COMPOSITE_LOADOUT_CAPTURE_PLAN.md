# Composite loadout validation captures — 21 September 2026

Purpose: test attachment composition after the 148 current single-attachment
panels matched. These are requested tests, not verified combined-loadout results.
Composite-stat integration into the site is on hold.

## Capture method

Take 12 screenshots: A and B for each pair below. Equip each complete build,
then capture the full expanded stat panel. Avoid a preview of an unequipped
attachment. Keep the optic and all unlisted slots unchanged within each pair.
Use no muzzle, grip, laser, light or ergonomic attachment unless listed.
Keep bipods/grip pods undeployed. Record the laser state if the panel lets you
change it. If the build screen does not show all selected parts, add an overview
or include the attachment list with the image.

For EF88 use Basic barrel, 30 Rnd magazine and FMJ unless overridden below.
For L115 explicitly select 27" Factory (Light), 5 Rnd and FMJ; do not rely on
the Default label. For 18.5KS-K use Basic barrel and standard buckshot. For VSSM
use the normal Suppressed barrel, 20 Rnd and the default Range Pen ammo; record
any automatic barrel change caused by Folding Stock. For M2010 ESR use Basic
barrel, 5 Rnd and FMJ unless overridden below.

| Pair | Weapon | A build | B: change only this from A | Purpose |
|---|---|---|---|---|
| EF | EF88 | Ribbed Vertical + Double-Port Brake | FMJ → Tungsten Core | Two recoil improvements with the normal ammo penalty; Control and Precision composition |
| HF | EF88 | Standard Suppressor + 5 MW Red laser | Red → 50 MW Blue laser | Hipfire penalty/bonus stacking and laser effects on Mobility |
| L | L115 | Light barrel + 50 MW Violet laser | Add QD Grip Pod | Moving-ADS improvements plus faster ADS without a grip spread penalty |
| KS | 18.5KS-K | 4 Rnd magazine + 50 MW Violet laser | Add Slim Angled | Magazine/laser/grip handling composition and the disputed binding |
| V | VSSM | Folding Stock | Add Folding Vertical | Fire-mode conversion combined with a recoil modifier |
| S | M2010 ESR | Double-Port Brake | FMJ → Tungsten Core | Six-step sniper penalty combined with recoil reduction |

All selections were checked against the site catalog and its point calculation.
Expected site costs A/B: EF 55/55, HF 55/65, L 55/65, KS 40/65, V 90/100,
S 45/45. A different equipped optic can change the total. If the game rejects a
combination or changes another slot, capture that state instead of substituting
an attachment silently.

Use labels `EF-A`, `EF-B`, `HF-A`, `HF-B`, `L-A`, `L-B`, `KS-A`, `KS-B`,
`V-A`, `V-B`, `S-A`, `S-B` in filenames or your message. Full site slot IDs are
saved in [the capture manifest](../../reference-data/attachment-audit/composite-combination-capture-plan-2026-09-21.json).

## Separate remaining question

The KS pair tests the composite panel. It cannot prove which gameplay spread
property `Field_b30a73ed` changes. The saved SDK identifies its type and offset,
but provides no semantic name. That question needs further engine-field evidence
or a controlled firing comparison; it is not resolved by a matching Mobility bar.
