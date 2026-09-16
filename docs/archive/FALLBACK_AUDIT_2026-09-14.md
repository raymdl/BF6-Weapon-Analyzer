# Runtime data validation - 2026-09-14

Scope: current sim/ and ui/ modules. Frozen releases are unchanged.

Required hit-zone, recoil, spread, RPM, burst-cycle, and recoil-tier data no longer receive generic game-value defaults. Scripts/tests remain strict. In the browser, validation errors are collected and deduplicated. Missing numeric results carry NaN internally to avoid treating them as zero; the UI displays an unavailable dash and omits dependent calculations.

A small floating notification uses the Analyzer theme and sits at the main panel's top right. View errors opens a keyboard-accessible dialog with the error list. Dismiss hides the notification; a new distinct error shows it again. Startup field-validation errors do not block the whole application. A failed essential JSON download is reported, but the application cannot operate without its required source files.

Missing RPM preserves damage, BTK, attachment controls and other independent stats; fire rate and TTK show unavailable. Invalid recoil/spread inputs suppress the combined simulation. Missing hit zones suppress affected damage/lethality calculations. The optional 0.025-second duration, moving-distribution inheritance, single-shot pump behavior, and neutral optional attachment modifiers remain intentional.

Verification:
- 102 tests pass, including strict validation and browser reporting tests.
- Browser fault injection checked missing RPM, recoil groups, spread bounds and hit zones: no uncaught page errors or NaN/undefined output, error details open, Escape closes, dismiss works, and another weapon can still be selected. The valid-data page shows no notification.
- Ship-surface validation passed.
- Public production JSON checked at 2026-09-14T18:38:41Z: all 63 weapons and 328 weapon/ammo combinations pass the new required-data checks. Production does not yet include the notification.
- The earlier combined-rail attachment test failure is no longer present in the current checkout; all 35 attachment-effects tests pass. No rail logic or that test was changed by this notification work.

No commit, push, or deployment was performed.
