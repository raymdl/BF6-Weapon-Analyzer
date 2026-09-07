# Online blocker review — 6 September 2026

## Result

The public search found useful experimental work and a possible Portal measurement route. It did not establish the missing BF6 native formulas, the four category-score bindings, or a working decoder for the inspected expression resources. A failed search does not prove that no such work exists, especially in Discord discussions that search engines do not index.

No site formula or weapon value changed from this review. No messages were sent to researchers. No Portal experience was created or published.

## Most useful new lead: Portal measurements

The [community-maintained Portal SDK declaration file](https://github.com/battlefield-portal-community/PortalSDK/blob/main/example_mods/typedefs/mod/index.d.ts) exposes:

- `GetInventoryMagazineAmmo` and `SoldierStateNumber.CurrentWeaponMagazineAmmo`.
- `GetSoldierState`, including `IsFiring`, `IsReloading` and `IsZooming`.
- `SoldierStateVector.GetFacingDirection` and `EyePosition`.
- `GetMatchTimeElapsed`.

The inspected event declarations do not include a per-shot firing callback. Polling ammo changes is therefore a candidate measurement method, not an established exact firing-event timestamp. The declaration file does not establish timer precision, update frequency, networking delay, or whether facing direction includes ballistic recoil. Those properties must be measured before relying on collected results.

Possible use: compare recorded ammo transitions against video on a known semi-automatic weapon, then test alternating DB-12 intervals and M87A1 cycling. Separately test whether the facing vector responds to firing without look input. This could improve the existing measurement evidence without decoding the executable. It still needs a game session and calibration.

The downloaded declaration snapshot is under ignored `outputs/frosty/online-blocker-review/portal-mod-index.d.ts`. This is a community mirror; its compatibility with the installed game must be checked before implementation.

## Community experiments

[Dr. Smiley Henry's muzzle study, posted 21 March 2026](https://www.reddit.com/r/LowSodiumBattlefield/comments/1rzv6g2/data_scientist_debunks_muzzle_attachments_in_bf6/), reports repeated measurements and an additive percentage model for the tested grip/muzzle combination. It supplies a testable hypothesis for stacking. It does not establish the current native scalar operator, and total displacement can combine kick and recovery effects. The linked video and raw measurements were not independently remeasured in this pass.

[SheetOnMyFace's recoil/spread visualization, posted 7 May 2026](https://www.reddit.com/r/Battlefield/comments/1t69dbd/visual_guide_to_recoil_and_spread_in_battlefield_6/), supplies another model for comparison. The author's discussion explicitly asks how to calculate recovery; a relevant intervening reply is deleted. The public thread therefore does not provide a complete derivation of the recovery amount.

These are useful model and experiment leads. Neither closes the implementation blocker by itself.

## Sources that do not supply independent proof

[AntiPhysicsGames' attachment database](https://antiphysicsgames.github.io/battlefield6-attachment-database/) explicitly uses a BF1 recovery formula and omits spread decay during firing. It is evidence of that author's modeling choices, not verification of the BF6 recovery algorithm.

Searches also return the operator's [BF6 Weapon Analyzer posts](https://www.reddit.com/r/Battlefield6/comments/1ve2478/updated_my_weapon_analyzer_tool/). They must not be counted as independent support for this repository's calculations.

[EA's 25 June 2026 gunplay article](https://www.ea.com/games/battlefield/battlefield-6/news/bf-combat-gunplay) documents subsequent recoil and spread tuning for update 1.3.3.0. This establishes a version boundary for the March and May experiments; it does not publish recovery or summary-score equations.

## Search scope and remaining gaps

The search covered public web results for the specific recovery-field names, recoil duration, attachment stacking, pump/bolt timing, category-score formulas, and Frosty expression decoders. Public GitHub repository searches for Frosty node editors, Frostbite expressions and BF6 datamining supplied no matching repository lead. That is a search limitation, not a claim that no relevant decoder exists.

Still unresolved:

- Native scalar modifier operations and stacking.
- Recoil clock/reset order, recovery direction, spread sampling and state transitions.
- Absolute menu-score inputs and the Precision binding.
- Exact pump timing, speed scaling and interruption behavior.

The strongest new actionable lead is a calibrated Portal measurement experiment. The existing candidate formulas remain research-only.

## Detailed Portal follow-up

The [Portal SDK review](PORTAL_SDK_RESEARCH_2026-09-06.md) maps the available observations and experiment controls to each blocker. Both inspected public declaration mirrors date to October 2025 and omit DB-12 from their weapon enum. Current SDK/runtime validation is required. The proposed first experiment is timing calibration with ammo transitions, followed by a facing-vector check.

## Operator-supplied forum lead and access limit

The operator supplied screenshots and links for a BF6 type-information/dump discussion and a 31-page offsets thread. The type-registration example is a possible lead for identifying structures and consumers; the displayed vehicle example and old general offsets do not establish a weapon formula. Direct retrieval returned HTTP 403, and the browser site-safety policy explicitly blocked access. Do not attempt alternative retrieval methods to bypass that restriction.

The operator supplied all 31 saved HTML pages, including a later addition of pages 14, 22 and 30. The [saved offsets-thread review](OFFSETS_THREAD_REVIEW_2026-09-06.md) records the relevant findings from 607 extracted post records. All source hashes were verified. The strongest lead is a posted velocity-update routine consistent with the site's quadratic-drag equation, with current-build and integration limits. Other leads concern projectile selection and type metadata. The added weapon-state example has an internal offset discrepancy and an explicitly limited reload timer; it does not resolve the mechanics blockers. No forum code was executed, and no site behavior changed from these claims.
