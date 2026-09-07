# Saved BF6 offsets thread: research review

Reviewed 2026-09-06 for the Weapon Analyzer mechanics investigation.

## Coverage and evidence limits

The operator supplied all 31 saved HTML pages in `C:/Users/royal/Documents/BF6 Datamining/Battlefield 6 Offsets HTML/`. The initial review covered 28 pages and 547 post records. The operator then added pages 14, 22 and 30, bringing coverage to **31 pages and 607 extracted post records**. All records were searched for weapon mechanics, projectile, recoil, spread, native type and executable-access leads; relevant posts were then inspected in context. All 31 source hashes were verified; the original 28 files were unchanged. This covers the supplied saved thread text, not linked external material or independently verified native behavior.

The local extraction and source-file SHA-256 manifest are in `outputs/frosty/online-blocker-review/offsets-thread/`. `posts.json` records author, date, page, position within page and HTML source line. Position within page is not the forum's global post ID. Quoted posts are retained and are not independent corroboration. Saved HTML scripts and forum code were not executed. These are community claims, not verified current-build native results.

## Findings

| Source in saved pages | Useful information | Limit and consequence |
| --- | --- | --- |
| Page 12, post 4; ErectBAN, 2025-10-28 | Posted velocity-update assembly and initial-velocity transform | Strongest mechanics lead. The posted routine implies quadratic drag; current-build identity and integration details remain unverified. |
| Page 21, posts 10–11; Rafael4096 and ErectBAN, 2025-12-17 | Projectile selection follows firing data, primary/secondary selection and a modifier override; reply identifies the data as usually `BulletEntityData` | Useful selection-order candidate. Author explicitly says offsets are for the November 11 build. It does not establish recoil modifier arithmetic or attachment stacking. |
| Page 17, post 1; ErectBAN, 2025-11-08 | Named weapon and projectile functions; an active-weapon lookup lead through `BFUICrosshairComponent::typeinfo` | Useful search anchors when readable, matching native code is available. Old addresses cannot be transferred to the current executable. |
| Page 27, posts 7 and 10; Blabla4545, 2026-04-28/29 | Type-name string references and GUIDs as ways to identify native type metadata | Useful metadata-identification lead. Claimed GUID stability is not verified across our builds. Metadata identification does not decode expression-function semantics. |
| Page 17, post 19; ImCytox, 2025-11-12; page 18, post 11; UtterlyTV, 2025-11-17 | Authors distinguish recoil angles, idle sway and update timing; one labels ammo/aim/recoil fields | Supports the need to validate what an observation measures. No recovery, spread sampling or reset formula is supplied. |
| Page 25, post 15; Blabla4545, 2026-03-14; page 26, post 3, 2026-03-18 | A shoot-space value is reported as unaffected by recoil; later weapon/aiming layouts changed | Reinforces the Portal facing-vector calibration requirement. Does not prove how the Portal getter behaves. |
| Page 31, posts 2, 3 and 5; 2026-08-27 | A reader reports unexpected renderer/shader objects; replies discuss the access result | This concerns a runtime memory read, not an on-disk executable decode. `ExpressionShader*` in this report is not evidence of the weapon expression evaluator. The supplied page 30 adds runtime memory-access discussion, not an executable decoder. |

## Follow-up: pages 14, 22 and 30

- **Page 14, posts 1–9 (2025-11-01/02):** discussion identifies `ClientSoldierAimingSimulation` as a class-instance pointer and offers ways to locate it. This is an old structure-location lead, not an aiming or recoil formula.
- **Page 22, posts 13 and 15 (ErectBAN, 2025-12-31 and 2026-01-01):** examples copy evaluated-camera transforms and translation. The author reports that rotation remains tied to soldier/vehicle look direction. This does not identify ballistic recoil, the spread cone or Portal getter semantics. A constant delta time in the author's camera-modification example is not evidence of the projectile simulation time step.
- **Page 30, post 12 (beck123x, 2026-08-12):** the posted wrapper computes projectile speed as the length of a returned three-component velocity vector. It also labels firing, ammunition, zoom, recoil and sway fields. This supplies named research leads, but no implementation of the underlying initial-speed function or recoil update rules.
- **The page 30 layout is internally inconsistent:** in the posted `ClientSoldierWeapon` definition, `0x94E8` bytes of padding, an 8-byte pointer and 104 bytes of padding place the next pointer at `0x9558`. Its comment claims `0x9568`. This is a 16-byte discrepancy under ordinary x64 layout. Do not treat the source as a verified structure definition.
- **The same post labels `reloadTimerNotAccurate` as triggered only on empty-magazine reloads.** It cannot establish general reload completion or pump timing. The recoil fields share storage with a value named `FiringFlag`; the union labels alone do not establish a reliable firing predicate or recoil semantics.
- **Page 30, posts 18–20 (2026-08-25):** disputed runtime address-translation/access claims provide the context for page 31. They do not explain the protected on-disk image, identify a weapon expression decoder or resolve a mechanics formula. No access method from these posts was implemented.

## Bullet-drag comparison

Reading the posted assembly, for a nonzero input velocity `v`, the three spatial components follow:

`v_next = v + (0, gravity * dt, 0) - drag * length(v) * v * dt`

The speed and drag vector use the input velocity. The routine first puts the gravity-adjusted Y value into its output, then subtracts the drag term. Its zero-speed branch leaves that gravity update in place. The separate initial-velocity helper transforms the input speed vector with the shoot-space basis.

This is consistent with the differential equation already used in `sim/ballistics.js`: `dv/dt = gravityVector - k * |v| * v`. It is **not** proof that the site's solver exactly reproduces the game. The site uses an RK4 trajectory solver and an analytic level-shot timing helper. The post does not establish the current game's position-update order, time step, substeps, coefficient units or patch continuity. It also credits an earlier drag discussion, so it is not a self-contained current native disassembly provenance chain. No solver change follows from this source alone.

## What remains unresolved

The inspected posts do not establish the native scalar modifier operators and stacking rules, recoil recovery/reset order, spread distribution and transitions, complete menu-score formulas, or pump/bolt timing and interruption rules. Old pointer-encryption discussion does not contradict the separate observation that our on-disk native image appears protected: they concern different objects and dates.

The saved-page coverage gap is now closed. For later native work, retain the named type/function anchors and the projectile-selection candidate. They require readable current-build code or controlled measurements before promotion into site behavior. The Portal timing and facing-vector calibration remains a separate viable measurement lead. The added pages do not justify a site mechanics change.

No site data or simulation behavior changed during this review.
