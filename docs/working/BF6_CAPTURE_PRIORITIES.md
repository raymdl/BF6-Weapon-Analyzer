# Ranked in-game capture plan

Rescoped 28 September 2026 by the operator: captures are for mechanics that change a
displayed number and cannot be settled from source, the in-game stat screen (which
is treated as accurate) or the screenshot audit. Everything else was removed; see
[Removed captures](#removed-captures-28-september-2026). Source questions remain in
[open questions](../frosty/OPEN_QUESTIONS.md).

**Capture rule (operator, 28 September 2026).** Request a recording only when all
four hold: (1) its result would change a displayed site number or decide a pending
enhancement proposal; (2) the source, the in-game stat screen (treated as accurate),
the screenshot audit, official EA text, Sym and the operator's own in-game knowledge
cannot answer it (ask the operator before requesting a recording); (3) the predicted
difference is large enough to see in a recording; (4) it is the smallest test: one
weapon and loadout, a stated prediction, and what changes on the site for each
outcome. Otherwise record the limit as unresolved; do not add a capture.

| # | Capture | Why | People / format |
|---|---|---|---|
| 1 | Match Trigger semi vs auto (M433; L17) | Site shows no effect; source binds about 16% less recoil and faster recovery on 24 weapons, probably semi-only | Solo; video, repeated groups |
| 2 | Optional: hit-capsule boundary (M433; L99) | Target-view chest/abdomen split; M433 chest aim 4 → 5 hits if the source capsules hold. Target view is already labelled approximate | Enemy helper standing still; damage numbers |

## Record once per session

- Show the game version and date. Record the mode, map and platform. Save custom
  server settings, including damage, health, regeneration and spotting changes.
  A custom-mode result does not by itself establish standard multiplayer behavior.
- Show the full loadout, class and specialization. Use exact attachment labels.
  Keep these fixed within each comparison except for the tested item.
- Show resolution, FOV, ADS FOV option, PiP option, input device and relevant HUD
  options. The earlier 1.4.2.5 / FOV 103 captures are historical; confirm current
  settings rather than carrying them forward silently.
- Keep the original video with audio and full HUD. Prefer 120 fps for short timing
  tests when practical; 60 fps is still useful. State the actual recording rate.
  Avoid interpolation, slow-motion exports, frame blending and cropped-only copies.
- Include a loadout card before each set. Keep each trial identifiable, for example
  `01_spotting_SG553R_standard_observer_trial01`. Five repetitions are a useful first
  timing set; threshold tests use three repeats on each side of the boundary.
- Report missing or hidden indicators as unavailable. Do not treat them as zero.
  Record failed or ambiguous trials as well as successful ones.

## 1. Match Trigger in semi-auto and automatic modes (L17)

**Why it matters.** Match Trigger can be selected on 24 weapons, and the site shows it
with no effect. On all 24, source binds recoil tier +3 (M433 per-shot recoil
×0.844, about 16% less), recovery ×1.728 (factor 72 → 124.4) and spread increase ×0
([L24](../../reference-data/provenance/frosty-2026-09-24-L24-match-trigger-family.json)).
The effects sit behind the same fire-mode condition class as the burst modifiers
(mask 1 = semi, [L31](../../reference-data/provenance/frosty-2026-09-24-L31-fire-mode-mask-candidate.json)),
so they are probably semi-only, which the stat screen does not reflect. If they
act, the site understates one of the stronger ergonomic choices; if they are
semi-only, they matter once the single-fire mode proposal (L14) exists. Only a
semi/auto recoil comparison answers both.

**Bloom done 25 September:** no bloom in semi with or without Match Trigger, so the
bloom operand cannot be isolated. Recoil and recovery comparisons are still open.

Use M433, matching the HK433 source trace. Compare the bare baseline with Match
Trigger, with all other choices fixed. Show the selected fire mode and attachment.
Run manually selected semi-auto first, then automatic as a condition control;
tapping an automatic trigger is not proof of selecting semi-auto. Record repeated
isolated shots and equal-cadence groups in ADS and hip, stationary first.

Measure initial aim displacement separately from weapon animation, recoil return
at matched displacement/time, and the spread indicator or repeated impact groups.
Use a cadence high enough that the baseline shows measurable bloom; full recovery
between taps cannot distinguish the zero-increase candidate. Match shot intervals
between paired trials. A missing/censored indicator is unavailable, not zero.

If all source operands act under the current model, the M433 candidate predicts
a per-shot recoil ratio of 0.843908625, a recovery factor of 124.416 instead of 72,
and zero added bloom with unchanged minimum spread. `GS_HK433` also binds the
semi-mode no-bloom modifier ([L63](../../reference-data/provenance/frosty-2026-09-25-L63-vssm-semi-bloom.json)),
so the bare semi baseline may already show no bloom. In that case the bloom
comparison cannot isolate Match Trigger; the recoil and recovery comparisons still can. If the attachment acts only
in semi-auto, the automatic control should lack those changes. If no differences
are resolved, the result is inconclusive about activation and global absence.
A different direction or magnitude can reject this simple composition. There is
no sourced cadence prediction; record timing to control the experiment. Native
operator order and broader weapon coverage remain separate questions. See
[L17 evidence](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json).

## 2. Optional: hit-capsule boundary (L99)

M433 single shots up the centre line of a standing helper in MP at 10 m. Record
loadout, target orientation, aim position and per-shot damage. Damage numbers
(26 versus about 22) decide the chest/abdomen boundary before any target-view
change. Shots above the helmet are exploratory only, and the range dummy is not a
validation target (different head length and materials). Keep site geometry
unchanged pending the result. See the
[L99 receipt](../../reference-data/provenance/frosty-2026-09-27-L99-soldier-hit-capsules.json).

## Removed captures (28 September 2026)

Full text of the removed sections is in git history (`git show ab9ca9c:docs/working/BF6_CAPTURE_PRIORITIES.md`).

| Former item | Decision and reason |
|---|---|
| Burst cadence and recoil (kept briefly on 28 Sep) | Closed without a recording: source BPM plus operator recordings support the site model (no delay on the six BPM-0 weapons, ~33 ms on M16A4/GRT-BC); the recoil part only served the cadence question. [Receipt](../../reference-data/provenance/frosty-2026-09-28-burst-cadence.json). |
| 1 Spot-on-fire ranges; 2 health regeneration | Not necessary (operator). |
| 3 VSSM barrel ADS; Interdictor grips | Stat screen is accurate and the site matches it (Mobility checker agrees on all captured panels, including 43 VSSM panels). The extra GS index likely feeds ADS-entry spread settling, which is not displayed. |
| 4 Idle recovery and recoil return | The site already uses Sym's firing/not-firing spread model and continuous recoil recovery; the missing Idle state (A16) only acts after long pauses. A video cannot pin the recovery equation. |
| 5 Bipod/mounted; 7 zeroing; 8 optic framing and SGX sway; 12 underbarrel traits | Not necessary (operator). |
| 6 Reload commit and bolt cadence | Ammo-commit timing is not displayed. Recon rechambering is the class trait (EA: "rechamber more quickly") and joins the trait proposal from source. |
| 10 Controller recoil | Not needed; the source vertical-recovery operand (L19) can be proposed directly if wanted. |
| 11 Menus, MagFlare, optic mobility, laser visibility, damage regression | Covered by the screenshot audit; optic mobility confirmed in game by the operator. |
| L14 single-fire cadence | Source `RateOfFireForSingleFire` (Sym SingleRoF) already supplies the rate; now a site enhancement proposal, no capture. |
| L18, L22, L25 | Not necessary (operator). |
| L20 pellet pattern; L32 strafe velocity | Pellet statistics stay unavailable; inherited strafe velocity is a few m/s against 300–900 m/s. |
| L27 Compact Handstop | Confirmed by the operator: it allows firing while sprinting (the site shows this chip). |
| L35 DRS-IAR heat | Heat build-up is visual only (operator). |
| L63 VSSM semi bloom | Done 25 September; rejected. |
| L103 sniper sway by class | Operator confirms snipers sway more on non-Recon classes. |
| Subsonic velocity precision | Differences of 0.3–0.6 m/s are below what recordings can resolve. |

## Maintenance

Keep the ranks current as source work proceeds. After receiving files, record which
capture IDs are received, usable, inconclusive or resolved. Link the measured report
and update the topic page. Remove resolved work from the active list without losing
its dated evidence. Do not request repeats of a usable existing control without a
specific new uncertainty.
