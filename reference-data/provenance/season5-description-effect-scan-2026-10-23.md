# Description-versus-effect scan, Season 5 weapons (23 October 2026, client 2.1.1.0)

The Stage 6 description-versus-effect comparison was not run on the four Season 5
weapons in the 2.1.1.0 update (the 2.1.1.0 checklist, Stage 6 row: "the new attachments
and weapons are not captured and were not scanned"). This pass covers the Mk 24, ELR-40,
Z84M and RSPR from the site data those weapons were built from (stage 9 worker C,
`2026-10-13-update-2110-post\stage9\C`).

## Method

For every selectable attachment on the four weapons: the in-game description
(`data/attachment-tooltips.json`, by weapon) against the attachment's own effect, taken
as the difference between the bare weapon and the bare weapon with only that attachment
(`sim/applyAttachments.js`, the same baseline the Attachment Effects panel uses; magazines
keep their handling fields). Items were grouped by slot, identical description text and
the set of changed fields with their direction, as the 14 September pass grouped them,
then each group was read for a claim the effects do not apply or an effect the text does
not state. The two rubric traps from the guide were applied: a +1 tier is a benefit, and an
effect the site does not model (bipod deployment, match triggers, stance sway) is not a
mismatch.

344 items, 205 with description text, in 88 groups. 139 items have no text: 130 optics
(optics carry no descriptions in the data) and 9 optic accessories (Canted Iron Sights,
Secondary Optic, Anti-Glare Coating), for which no weapon in the data carries a tooltip.

## Result

Every group matches its text, or is already recorded in `docs/ATTACHMENT_BUGS.md`, except
the two candidates below.

Already recorded, seen again here: entry 1 (ELR-40 Slim Angled, unstated moving-ADS
penalty), entry 3 (RSPR Slim Angled, draw speed stated but not applied, with the other
SMGs), entry 21 (Mk 24 and Z84M angled grips and QD Grip Pod stronger recoil steps),
entry 24 (ELR-40 Single Shot sweet spot), entry 25 (deployed bipods), entry 27 (ELR-40 CQB
Suppressor recoil package).

Patterns the 14 September pass already accepted, seen again on these weapons: Hollow Point,
Subsonic, Sub HP and Frangible reduce the collateral multiplier without saying so; the
hip-fire taclight and Flashlight reduce hip bloom per shot as well as improving recovery;
the Linear Comp's "more stable vertical recoil" is a vertical increase.

### Candidate 1: ELR-40 CQB Suppressor (entry 27)

Text promises spotting effects only; the record carries the bolt-action recoil package.
Recorded as entry 27 before this scan; the firing-range recordings of 23 October are in
[elr40-cqb-suppressor-recoil-2026-10-23.md](elr40-cqb-suppressor-recoil-2026-10-23.md).

### Candidate 2: ELR-40 Single Shot magazine, unstated handling and hit-zone changes

Text: "Blocked magwell for individually loading custom 9.52x70mm rounds, dealing massive
damage between 30m and 60m but at the detriment of long-range ballistics." Entry 24 covers
the damage window. The magazine record (`WEAPON_MAG.elr40.mags["1_rnd"]`) also carries,
against the default 7 Rnd:

| Field | 7 Rnd | Single Shot | Site panel value |
|---|---:|---:|---|
| ADS time tier shift | 0 | -1 | ADS time 433 ms to 367 ms |
| ADS move speed tier shift | 0 | -1 | x0.47 to x0.54 |
| Moving ADS spread tier | 0 | +1 | 0.32 deg to 0.22 deg (Mobility 34 to 44) |
| Weapon sway | 1 | x0.667 | not on the panel |
| Reload | 2.400 s | 3.166 s (override) | Reload time |
| Headshot multiplier (own bullet) | 1.75 | 1.34 | Headshot multiplier |
| Limb multiplier (own bullet) | 0.67 | 0.84 | not on the panel |
| Collateral multiplier (own bullet) | 0.75 | 0.00 (was 1.00 until the 23 October test) | Collateral multiplier |

The handling shifts are the compact-magazine set (the 5 Rnd carries the same ADS and
movement shifts and says "improved handling"); the Single Shot text says nothing about
handling, reload, sway or hit zones. The slower reload and the magwell are plausibly the
same design, and at 120 damage a 1.34 headshot still kills. Not a confirmed error: the
in-game panel with the Single Shot fitted would show ADS time, ADS move speed, reload
time, headshot and collateral multipliers and the Mobility score, which decides whether
the site's values are right and leaves the text question to the bug list.

Panel check (operator screenshots, 23 October 2026, Single Shot fitted): DMG 120, Mobility
44, reload 3.166 s, ADS time 367 ms, headshot x1.34, long-range damage 80, ADS move speed
x0.54, sprint recovery 200 ms, Hipfire 34, Precision 100, Control 15: every site value
above is confirmed. Two panel figures differ from the site by design: the magazine reads 0
where the site stores 1 (the panel shows stored capacity minus one for every ELR-40
magazine; the site keeps one round so the simulation fires once before reloading, stage 9
worker C judgement call 6), and the collateral multiplier reads x0.00, which the firing-range test of the same day
confirmed (no damage to a second target; entry 20), so the site now applies x0.00. The
values are right. Operator reading of the text (23 October 2026): not an error. The Single
Shot is a special-case magazine that changes the weapon's behaviour, and its description is
less descriptive rather than wrong. No bug entry; candidate closed.

## Coverage gaps

- Optics: no description text exists, so the LPVO and thermal ADS move-speed changes on
  the Mk 24 (x0.60 to x0.535) cannot be checked against text.
- Optic accessories: no tooltips in the data for any weapon.
- Worker C could not find descriptions for the ELR-40 muzzles and barrels in the stage 9
  capture (REPORT.md line 158); the texts used here come from the later 13 October
  descriptions file and match the in-game panel of 23 October for the muzzles.
