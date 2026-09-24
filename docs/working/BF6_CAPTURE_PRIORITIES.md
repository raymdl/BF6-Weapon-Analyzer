# Ranked in-game capture plan

Updated 23 September 2026. This is the maintained capture list for the current
Frosty investigation. All rows are pending. The order reflects the value to the
Analyzer, the uncertainty that a capture can resolve, and the capture effort.
Source questions remain in [open questions](../frosty/OPEN_QUESTIONS.md).

If time is short tonight, start with **1 and 2 when an enemy helper is available**.
For solo work, start with **3 and the menu screenshots in 11**, then try the short
visibility pilot in 4. Do not record a large set until the required signal is visible.

| Rank | Capture | Main value | People / format |
|---|---|---|---|
| 1 | Spot-on-fire range: Standard, suppressor, Subsonic, both | Test the hardcoded 54/150 m bases and multiplier composition | Enemy helper; observer video plus loadout screenshots |
| 2 | Health regeneration: Standard, Frangible, Flechette; second-hit reset | Test the displayed 5/9/7 s model and reset rule | Enemy helper; damaged player's video |
| 3 | VSSM barrel ADS; Interdictor Full/Slim Angled control | Resolve separate GS/WB paths and duplicate selector composition | Solo; high frame rate video |
| 4 | Spread idle boundary and recoil return; visibility pilots first | Test the missing idle state and spring/recovery candidates | Solo; HUD video, then impacts if identifiable |
| 5 | Bipod undeployed/deployed; mounted control if available | Test state activation and the proposed deployed comparison | Solo; video and repeated impact groups |
| 6 | L115/M2010 ADS Bolt cadence; Mini Scout control; RPK-74M ammo commit | Separate firing gate, ADS return, bolt cycle and reload phase boundary | Solo; high frame rate video |
| 7 | M2010 zeroing and Rangefinder | Test effective zeroing states and impact correction | Solo; HUD/loadout screenshots and impact video |
| 8 | M2010 optic comparison; SGX suppressor sway | Resolve local/shared optic precedence, scope framing and sway activation | Solo; matched screenshots and repeated video traces |
| 9 | GRT-BC burst-mode recoil while firing | Resolve a fire-mode condition that menu panels do not establish | Solo; high frame rate video and repeated groups |
| 10 | Mouse/controller recoil with the same build | Test controller activation and the inferred recoil factor | Solo with both inputs; repeated video/groups |
| 11 | Current attachment menus and MagFlare ADS reload | Resolve branch availability and a utility-only attachment | Solo; screenshots plus short video |
| 12 | Underbarrel ammunition and reload traits | Test the separate Grenadier and Assault Gadget Reload selectors | Solo, if the game permits a controlled trait comparison; HUD video |

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

## 1. Spot-on-fire ranges

Use **SG 553R with its basic barrel** if those items are available in your current
menu. The repository maps both Subsonic ammo and Standard Suppressor to that weapon.
Keep the barrel, class and other attachments fixed. Compare:

1. Plain muzzle + Standard ammo.
2. Standard Suppressor + Standard ammo.
3. Plain muzzle + Subsonic ammo.
4. Standard Suppressor + Subsonic ammo.

If the current menu differs, save it and use another weapon that offers this exact
four-way comparison. M4A1 is not the default for this test: the current repository
does not list Subsonic ammo for it.

Record from the enemy observer. Keep the shooter still and fire single shots into
safe ground away from the observer. Start each trial with all prior spotting cleared.
Remove other spotting sources such as manual enemy tags, teammates, sensors and
spotting gadgets. Keep mode and round state fixed; avoid Breakthrough retreat phases,
which have separate source spotting settings. Keep stance, facing and line of sight
the same. Do not aim directly
at the shooter if that itself produces an identification marker; include a no-fire
control at each position.

Show distance to the shooter's location using a non-enemy reference if possible.
If a ping is needed to measure distance, clear it and wait before the trial. State
the method and its precision. Record world markers and minimap markers separately.
Make sure the shooter's location is within the visible map area. A minimap edge is
not a measured detection boundary; use a suitable map view and show its scale.

Find a visible case first. Move outward in coarse steps until the mark no longer
appears, then narrow the boundary. Keep the nearest non-visible and farthest visible
distances with three repeated shots at each, separated until markers clear. The
following values are **current model predictions, not target results**:

| Build | World prediction | Minimap prediction |
|---|---:|---:|
| Standard | 54 m | 150 m |
| Suppressor | 0 m | 21 m |
| Subsonic | 27 m | about 64.29 m |
| Both | 0 m | about 9 m |

EA's [1.2.1.0 patch notes](https://www.ea.com/games/battlefield/battlefield-6/news/battlefield-6-game-update-1-2-1-0)
give historical support for two controls: world range changed from 75 to 54 m
without a suppressor or flash hider, and suppressed minimap range changed from
15 to 21 m. Use these as published reference values, not targets to force from
the recording. Subsonic alone and the combined loadout remain the main composition
checks; the patch notes do not give their results.

Record unexpected results. In particular, do not call the world range zero merely
because no marker is visible. Preserve the tested distances and the no-fire control.
These four cases test both the bases and product-versus-other composition. Once
they are clear, a later matched M2010 Lightened or M39 CQB test can address the
separate shared/SP-prefixed package question; it is not required in the first set.
The exact candidates are M39 EMR/M417 A2 with CQB Suppressor and DRS-IAR/M2010 ESR
with Lightened Suppressor. Their site result is 21 m; the bound priority-9001
package carries 0.1, which gives 15 m if it controls the effect. After the controls,
test 14, 16, 20 and 22 m with Standard ammo. Preserve no-fire trials. A result can
distinguish active range but cannot by itself prove the native priority algorithm.

**Quick base check (optional, same session).** The bases are per weapon in the
blueprint ([source report](../../reference-data/provenance/frosty-spot-range-bases-2026-09-23.json)).
M45A1 stores 27 m world and about 64.29 m minimap on Standard ammo, while the site
shows 54/150. One unsuppressed M45A1 (or Skorpion) boundary check with the same
method would test whether the per-weapon value is active. For a quick distinction,
try 25 and 30 m for the world marker, then 60 and 70 m for the minimap marker.
Keep the no-fire control and repeated shots. Record both visible and non-visible
results; these distances bracket the source candidates, not guaranteed outcomes.

## 2. Regeneration and reset

Record the damaged player's health HUD continuously. Use one weapon with Standard
and Frangible ammo, if available. Take one nonlethal body hit, then stand still with
no further damage or healing. Keep enough missing health to see several healing
increments. Wait for full health before each trial. Keep class, traits and mode
fixed; remove healing gadgets and nearby healing sources.

Repeat five times per ammo type. The measurements are final damage to first visible
health increase, and then the healing sequence. The source-based model predicts
Standard 5 s and Frangible 9 s. These are hypotheses for testing, not instructions
to discard different timings.

For Flechette, record a separate Standard-versus-Flechette pair on the same shotgun
(M1014 if available). Do not compare a shotgun directly with the previous weapon
and attribute every difference to ammo. Current prediction: 5 s versus 7 s.

Then repeat a Standard and a Frangible trial with a second nonlethal hit about
2–3 seconds after the first. Capture both hits clearly. This tests whether the delay
starts again at the final hit. It does not require damage totals to be identical,
but record them. Health HUD update rate limits timing precision.

## 3. VSSM barrel ADS

Compare the regular barrel and 200MM ASM. Use the factory optic and identical ammo,
magazine and other attachments. Record the selected barrel and all FOV/PiP settings.
Stand still, wait for recovery, then enter ADS, hold briefly and leave ADS. Record
five transitions per barrel without firing or moving. Alternate barrels if practical.

An input overlay or another reliable input timestamp improves the measurement.
Without it, we can compare visible transition duration but cannot measure the delay
from button press. Keep animation completion and zoom completion separate. This
tests whether the separate GS +1 source tier changes the observed transition; it
does not assume a particular extra number of milliseconds.

The same recording also tests the idle-table exception. VSSM's `IdleDecreaseTargetDuration`
index is 2 (the 367 ms ADS step), while its ADS index is 4 (250 ms). In 62 of 64
weapons these indices match
([comparison](../../reference-data/provenance/frosty-idle-table-ads-comparison-2026-09-23.json)).
Note whether the transition is nearer 250 or 367 ms. If practical, repeat once
with the Interdictor. Its raw ADS index 0 gives 500 ms, but the default Basic barrel
already shifts the site result to 433.334 ms. A 433 ms default recording therefore
does not distinguish the IDA hypothesis from the existing attachment model.
Keep any visible spread settling separate from animation and zoom completion.
The literal IDA entries are 0.350001 for VSSM and 0.416667 for Interdictor;
the 367/433 ms figures above are the corresponding ADS ladder steps. These are
comparison candidates, not expected results or confirmed native IDA units.

For a distinct Interdictor test, keep Basic barrel, Standard ammo, 5 Rnd magazine
and optic fixed. Compare no grip, Full Angled and Slim Angled for five transitions
each. The site predicts 433.334, 366.667 and 366.667 ms. Slim Angled has two source
bindings where Full Angled has one. If both add, the Slim Angled candidate is
300 ms; if they deduplicate or select by priority, it can remain 366.667 ms.
Measure pose and FOV completion separately. The
[source and model receipt](../../reference-data/provenance/frosty-site-ads-2026-09-23.json)
retains exact selectors; the binding array's operation is not established.

## 4. Idle recovery pilot

The raw registry now identifies the two GS fields as stationary and moving indices.
Their values are equal in the inspected pairs. This resolves the field names but
does not establish the recovery-state switch or the table's units. The table itself
appears to be ADS-transition timing (see section 3), so this pilot should not assume
it controls idle recovery. Keep stationary
and moving trials separate if the pilot supports a longer test.

Use the [existing recoil/spread handoff](BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md)
for prior controls and known visibility limits. Start with one short recording of a
burst followed by at least two seconds with no input. Keep the relevant spread
indicator visible and the camera fixed. Record the weapon and aim state.

The pilot must show measurable excess spread beyond that state's idle boundary.
Earlier AK4D hipfire recovered before its 0.6 s boundary; repeating that same burst
does not test idle behavior. If the signal disappears or is already at minimum,
stop that set and retain the pilot. We can select the next weapon/state from it.
If a useful signal remains, repeat five times with fixed burst length and stance.
Do not infer projectile spread from a hidden HUD mark or equate the source table
float directly to the observed recovery time.

**Separate recoil pilot.** Record five single shots and five identical short
bursts with M433, then M87A1 as a spring-field outlier. Keep optic, FOV, range,
stance and input fixed. Track reticle, world aim direction and shot impacts as
separate channels. Measure the peak and return at 25, 50, 100, 200 and 400 ms.
For an assumed 1-degree displacement, the current M433 recovery model retains
0.990 degrees at 25 ms and 0.802 at 100 ms, with monotonic return. A spring model
can overshoot; its timing depends on whether the damping field is a coefficient
or ratio and on the output channel. The
[recoil receipt](../../reference-data/provenance/frosty-site-recoil-2026-09-23.json)
contains conditional numerical predictions, not fitted engine constants. A video
can reject a visible return model but cannot prove an internal spring equation
or hidden camera-versus-projectile composition from a single trace.

A source-outlier extension compares PP-19 Flash Comp with Flash Hider, keeping
all other selections fixed. The site predicts Flash Comp changes ADS/hip recoil
recovery factors from 1 to 1.2 and duration from the base 0.025 s to 0.05 s;
the inspected source binding provides only its spotting effect. Use single shots
and short bursts, then record the full return without input. Compare both the
kick duration and return curve. Similar-looking groups alone cannot resolve it.

For a settled hip-spread check, compare L115 Standard Suppressor with bare muzzle,
keeping ammo, barrel, stance and other selections fixed. The site's standing/moving
minima change from 3.352/4.19 to 4.848/6.06 degrees. Its inspected selector has no
corresponding spread index operand. Use many fully recovered shots per state;
recording can test this effective difference but cannot prove the native consumer.
See the [muzzle operand receipt](../../reference-data/provenance/frosty-site-muzzle-operands-2026-09-23.json).

For a later heavy-barrel control, use the same weapon with Basic and Heavy barrels,
fixed aim state, stance and remaining attachments. Compare per-shot ADS spread
growth and the firing/not-firing recovery phases separately. The source candidates
predict an increment factor of `0.666667`, firing decrease coefficient factor of
`1.837117`, and firing/not-firing offset factors of `0.666667`. These are parameter
ratios, not a claim that total spread or recovery time changes by the same ratio.
Use the current Analyzer curve for each exact loadout as the output prediction.
A readable indicator can test those curves; it cannot prove the native GS priority
or composition algorithm. Keep this behind the visibility pilot.

## 5. Bipod and mounted states

Use the same weapon and loadout, with a bipod that the menu offers. Record the
deployment indication and geometry. Compare undeployed and deployed with the same
stance, range, optic and target where possible. Keep movement and recoil input off.
Record five equal-length bursts in each state, with full recovery and a fresh patch
of target for each burst. A short video is more useful than one final group.

If supported, add a mounted state as a separate condition and show how it is entered.
Do not call all three states equivalent. Group size mixes spread, recoil and sway;
the video helps separate them. Start with one weapon before expanding the set.

## 6. Reload timing

The [23 September empty-reload capture](../../reference-data/provenance/frosty-empty-reload-capture-2026-09-23.json)
already resolves the competing SOR-300SC and GRT-CPS stored times. M4A1 and LMR27
are usable controls. Do not repeat these recordings to answer the same question.
For those four weapons under the recorded conditions, last-shot-to-next-shot time
is stored empty-reload time plus one fire interval. The current data corrections
are 3.2 seconds for SOR-300SC and 3.034 for GRT-CPS. This does not identify the
ammo-commit frame or establish every weapon's timing behavior.

Start with RPK-74M. Record five tactical reloads and five empty reloads, with ammo
count and weapon animation visible. For a separate set, request fire near the end
of the reload and show the input timing if possible. Measure reload start, ammo
count change and first accepted shot as separate events. Keep attachments fixed.

For RPK-74M empty reload, the source threshold candidate is
`0.78 * 3.1 = 2.418` seconds; the adjacent recorded phase markers are 1.583 and
2.55 seconds. Compare ammo-count changes and interruption results around 2.418
and 2.55 separately. Across 57 arrays, threshold times raw `Field_fc66e75e`
selects the penultimate marker as nearest on 47 weapons, with median
marker-minus-candidate residual −0.0495 seconds. The range is −0.84022 to
+1.1601 seconds, so this is a test candidate, not a proven commit rule.

Only after the normal reload is clear, try a few deliberate reload interruptions
just before/after the observed ammo update. Record whether ammunition remains
loaded. Do not identify the native commit frame from the HUD alone. M87A1, DB-12
and M1014 are later follow-ups because they also have nonzero source delay fields.

For bolt-cycle timing, record ten consecutive accepted shots while holding ADS
and requesting the next shot as early as possible. Use Mini Scout first, then
L115A3 as an outlier control. Keep barrel, magazine and other attachments fixed.
Compare Recon against a class without the Recon weapon trait, if the same weapon
and attachments can be held fixed. The second block has the exact
`WM_ReconTrait` selector GUID; this is now the primary activation test.
Site/primary-block candidates are 47.093 and 46.142 RPM; replacing the speed with
the second block gives 51.429 and 50.611 RPM. The dated Sym values are 51 and
46.35 RPM. Use the intervals between muzzle events or ammo decrements, not the
rounded menu RPM. Repeat with ADS released between shots to test a zoom selector.
Completion fractions may define a different accepted-shot boundary; record bolt
animation completion separately. These are competing predictions from the
[timing receipt](../../reference-data/provenance/frosty-site-timing-2026-09-23.json),
not proven active formulas.

The [six-rifle source table](../../reference-data/provenance/frosty-site-ads-bolt-cadence-2026-09-23.json)
gives competing cadence predictions. For an L115 pilot, current source-model RPM
is 46.142 (1.3003 s); treating the zoom fraction as a firing gate gives 55.542
(1.0803 s). With the default modeled ADS-in of 0.366667 s, a serial cycle plus
ADS-in is 1.6670 s **before adding unknown ADS-out**. This is a conditional serial
prediction, not a lower bound when phases can overlap. Recon-only speed substitution
instead gives 50.611 RPM. Fix the trait for the first comparison. Do not assign
IDA as ADS-out time or assume the 0.8 fraction describes an observable animation
event; compare its predicted boundary with the recorded events.

If a tested bolt rifle offers **DLC Bolt** (site ID `ads_bolt`), record four cases:
hipfire and held ADS, each with and without it. Keep class and traits fixed.
Measure at least five accepted shot intervals per case and mark zoom exit/entry
separately. Keep the fire input method fixed and show it; slow manual clicks can
measure the operator's timing rather than the weapon's firing gate. Repeat one
case to check that the observed interval is stable before comparing attachments.
For the proposed fully-ADS cadence output, also mark the earliest frame at which
ADS is fully restored for each shot. Without DLC Bolt the candidate sequence is
ADS exit, bolt cycle and ADS entry; with it, rechambering may occur while ADS stays
active. Record phase overlap instead of assuming that three full durations add.
Keep any pre-existing firing interval separate so it is not counted twice.
Its source selects the named ADS-bolt-rechamber effect with a true operand, while
the Analyzer's `noEffect` flag denotes an unmodeled capability. The capability
hypothesis predicts that the selected version can retain ADS through rechambering.
Compare zoom continuity and accepted-shot intervals separately. If both versions
retain ADS, the recording does not establish whether the modifier is redundant,
inactive or controlled by another condition; preserve that result without assigning
a timing bonus. A faster held-ADS interval with unchanged hipfire interval would
support a scoped cadence change; unchanged intervals with different zoom continuity
would support a capability change without a measured RPM change. Keep the Recon
trait comparison separate so a class modifier cannot be mistaken for DLC Bolt.

**Source update (23 September).** The DLC Bolt effect gives the four rifles Mini
Scout's bolt flags ([weapons](../frosty/WEAPONS.md#ads-bolt-and-scoped-shot-cadence-23-september-2026)),
so Mini Scout is the stay-in-ADS control and Interdictor the leave-ADS control.
Predicted: with DLC Bolt, the scope stays up through rechambering and the
accepted-shot interval is unchanged. A cheaper fraction test: fire M87A1 from the hip
as fast as it accepts shots. The full cycle predicts 94.74 RPM (0.633 s); a
hip-fraction firing gate predicts 138.46 RPM (0.433 s).

## 7. Zeroing and Rangefinder

First record the zeroing HUD immediately after a fresh spawn, before any zeroing
input. Repeat five fresh spawns with the same loadout. The site's initial 100 m
selection is a simulator setting; the inspected source does not establish the
game's selected spawn distance.

Use M2010 with fixed ammo, barrel and optic. Show the available zeroing controls,
displayed distance and the loadout with/without Rangefinder. Record which actions
change the displayed state and whether ADS is required.

At a measured fixed target distance, hold the same point of aim and fire several
well-separated shots for each displayed zeroing setting. Preserve the reticle and
impact in the frame; record one continuous switch-and-fire sequence. Use at least
two available settings before expanding the range. Record actual menu/HUD options,
even if they differ from the source list. This checks effective selection and
impact movement; source lists alone do not establish the ballistic formula.

Use a measured 100 m and 200 m target for the first impact pair. With M2010 ESR
base velocity 760 m/s and the standard projectile, the current Analyzer solver
predicts the following vertical offsets. Positive is above the reticle; sight
height is omitted. These are conditional model predictions, not expected game
results ([source and calculation](../../reference-data/provenance/frosty-site-zeroing-2026-09-23.json)).

| Selected model zero | At 100 m | At 200 m |
|---|---:|---:|
| 100 m | 0 cm | −35.62 cm |
| 200 m | +17.81 cm | 0 cm |

The 51 other site weapons have single stored zeroing candidates, although the
site shows bore-relative trajectories for them. A later fixed-loadout M4A1 test
at 100 m can distinguish the current −18.05 cm model from the −5.36 cm prediction
obtained with its stored 75 m candidate. Keep this separate from the selectable
zeroing test. A result can establish practical correction for the tested loadout;
it cannot identify the native consumer or establish all 51 weapons' behavior.

## 8. Optic framing and PiP

On M2010, compare SDO and LERT with the same optics on another compatible sniper.
Use one fixed target, distance, camera position, resolution and FOV. For each exact
optic, capture ADS with PiP off and on. Show the setting and optic name. Save full
frames that include the optic housing, target inside the optic and scenery outside.
Do not resize the screenshots independently.

[EA states](https://forums.ea.com/blog/battlefield-game-info-hub-en/battlefield-6-update-1-4-3-0/13707600) that PiP changes the distribution of zoom inside/outside the optic while
total magnification stays the same. This capture tests framing and the weapon-local
source values, not a predicted change in nominal magnification. If those optics are
unavailable, show the menu instead of substituting an unnamed optic category.

### SGX suppressor sway identity

Use SGX with the same optic, stance, FOV, magazine and attachments. Record repeated
stationary ADS periods with no breath hold or aim correction for bare muzzle,
Light Suppressor, CQB Suppressor and Long Suppressor. Show each selected menu item.
Track weapon/reticle movement relative to a fixed target separately from camera
movement. The [source identity proposal](../../reference-data/provenance/frosty-site-sgx-sway-lineage-2026-09-23.json)
predicts relative weapon-sway factors of 1, 1, 0.975282 and 1.462923. The current
site instead predicts 1, 0.975282, 1 and 1.462923. These are candidate amplitude
ratios, not established native equations. First test whether the large Long
Suppressor change is visible. The 2.47% Light/CQB difference needs repeated usable
traces and uncertainty below that difference; a short clip or menu rounding cannot
settle it. A result can test activation but cannot alone identify the native
selector-array operation.

## 9. Burst-mode activation

Use GRT-BC if its current menu offers the burst option. Show the selected attachment
and firing-mode indicator. Record five fully recovered bursts without recoil input,
then comparable short automatic groups with the same other attachments. If the
burst-equipped weapon still offers automatic fire, include that as a separate
condition; record only modes that the current weapon offers.

Keep optic, stance, range and target fixed. Preserve audio and individual shot
timing. A change in shot spacing can change recovery between shots, so group height
alone cannot establish a recoil multiplier. Existing hover/equipped panel captures
already show unchanged values; another panel screenshot alone will not resolve
runtime activation. Retain the video even if the groups appear similar.

The [23 September timing audit](../../reference-data/provenance/frosty-site-timing-leaves-final-2026-09-23.json)
adds a cadence test. The six shared Burst Training options bind to
`WPM_ERG_BurstFireEnabled_W10`. Its enum fields select a mode; they do not directly
supply a verified burst length or pause rate. The site stores two or three rounds
but no bursts-per-minute value for these six, so `sim/core.js` repeats the normal
shot interval with no added pause.

Record trigger holds and separate trigger presses at 240 fps or higher if available,
with the ammo counter visible. Measure accepted rounds per burst, intervals within
each burst and the interval from its last shot to the next burst's first shot.
The current site predicts these intervals repeat with no extra gap:

| Weapon | Site burst rounds | Repeated interval |
|---|---:|---:|
| KORD 6P67 | 2 | 66.667 ms |
| SG 553R | 3 | 83.333 ms |
| PW5A3 | 3 | 77.778 ms |
| UMG-40 | 2 | 94.444 ms |
| KV9 | 2 | 55.556 ms |
| CZ3A1 | 3 | 61.111 ms |

For comparison, the site predicts within-burst / last-to-next-burst intervals of
72.289 / 105.289 ms for GRT-BC, 77.821 / 99.957 ms for SL9,
77.778 / 111.112 ms for M16A4, and 166.667 / 633.335 ms for DB-12.
A recording can test effective cadence and round count. It cannot identify the
native meaning of an unnamed enum field or prove its execution path.

## 10. Controller activation

Use the same PC/build, M4A1 loadout, settings and target. Record repeated equal-length
bursts with mouse input and controller input, without recoil correction. Show which
input is active. Keep aim assist context fixed and state whether an enemy is near
the target. Add hipfire only after the ADS control is clear. A compatible sniper
is a later control because six source sniper records lack the controller binding.
Five groups can reveal a large change; random recoil may require more before a
small difference can be accepted.

L19 adds a separate recovery question. Record isolated shots and release after
equal-length bursts. Measure vertical and horizontal return separately from
weapon-model animation. Compare return rates at matched starting displacement
and elapsed time; smaller initial kick alone can shorten return time. The current
amount-only model predicts the same recovery law at matched state. A candidate
vertical-only factor of 0.8836 predicts a lower vertical recovery rate at matched
state under that model, with no corresponding horizontal factor. A common
change in both axes would reject this simple vertical-only interpretation.
Different aim-assist state, unresolved animation/camera separation or insufficient
resolution makes the result inconclusive. Do not assume this field multiplies
the site decFactor. See [L19 evidence](../../reference-data/provenance/frosty-2026-09-24-L19-controller-recovery-operand.json).

## 11. Fast menu and utility checks

These are useful low-effort additions between higher-ranked tests:

- BROD 3: show the full barrel menu and whether Cryo is offered, locked or absent.
- KTS100 MK8 (source name Ultimax): show the short-barrel entry, cost and description.
  Two source metadata records share its progression entry; Equipment selects the
  `ShortBarrel` record. The screenshot will check the live label and availability.
- M4A1: show Magwell/MagFlare labels, costs and descriptions. If MagFlare is offered,
  record a matched reload while holding ADS with and without it. Keep ammo in the
  magazine for the first comparison. The source flag does not imply faster reloads.
- Show the full ammo menu on weapons that offer Subsonic or Frangible, including
  locked entries. A combined Subsonic Frangible entry would resolve an availability
  question; absence on one weapon does not establish absence on all 15 source branches.

Include the weapon name and selected slot in each screenshot. Hover text alone
does not prove that an attachment is equipped or active.

For Control, Hipfire and Precision formula questions, reuse the exact loadouts and
predicted panel values in the [attribute model](../WEAPON_ATTRIBUTES_MODEL.md).
Screenshots can accept or reject those output predictions for the tested build.
They cannot identify an anonymous unary operation, distinguish formulas that round
to the same panel value, or prove which source delegate is active. Those questions
remain blocked on a native consumer or a loadout whose candidate predictions
separate. Do not repeat an existing matching panel merely to add sample count.

For a future loaded-capacity output, use M433 20 Fast, DB-12's default tubes and
M60 50 Rnd as a small pilot. Record HUD rounds at spawn, after firing dry and
reloading, and after a tactical reload. Nominal site counts are 20, 14 and 50;
raw configured counts are 21, 16 and 50. Count accepted shots if the HUD hides
chamber state. This distinguishes the site's nominal magazine label from loaded
rounds; it does not require changing that label.

**Laser visibility pilot.** Use M433 with 5 mW Red and 5 mW Green separately,
with the same remaining attachments, lighting, background, stance and aim direction.
Record shooter and enemy views at 5, 20 and 40 m, with on/off controls where available.
Score the beam and impact dot separately. The current tooltip predicts enemy-visible
Green and not Red. An enemy-visible Red result contradicts that false label under
the tested condition. Green visible with Red not visible supports the pair only
under those conditions; a missing beam or dot alone is not proof of global invisibility.
If range or lighting changes the result, the boolean needs a defined condition.
The [source flag](../../reference-data/provenance/frosty-site-laser-visible-2026-09-23.json)
is true across all types and has no established visibility consumer. Gameplay can
test the tooltip claim, but cannot identify that anonymous field's native role.

The earlier KSG shotgun-list request is retired: exact archive package evidence
now places its core records in campaign content. This clears that source-scope
question without requiring a gameplay capture.

**Optional damage regression check.** With an enemy helper, test M45A1 Standard
ammo at 60 m and 74 m on the chest against 100 health. Prevent healing between
shots, count accepted hits and retain the damage markers. The site's intentional
step predicts 14.3 damage and seven hits at both ranges. Linear interpolation of
the current raw curve predicts about 13.786/12.586 damage and eight hits. The
13 September gameplay test supported the step; this follow-up only checks whether
that behavior persists on the recorded current build. Do not change the model
from the raw curve alone.

## 12. Underbarrel trait comparison

Use one weapon with an M320 underbarrel that your current menu offers. Show the
weapon, underbarrel variant, class, specialization and active in-round traits.
First record ammunition immediately after a fresh spawn, before resupply or pickups.
Show both loaded and reserve counts. The source has a separate Grenadier-linked
ammunition part; its serialized values are not yet established live inventory counts.

If the game permits the same weapon and underbarrel with the tested trait inactive
and active, record that pair. Change only that trait where possible. Record five
reloads per state, including ammunition update and first accepted shot. Keep the
starting ammunition state fixed. The separate Assault Gadget Reload part contains
a `1.1` operand, but no measured timing percentage is established.

If changing a trait also changes other class bonuses, record those changes. Treat
the result as a combined comparison. Do not spend time forcing a matched control
that the game does not offer; the menu and one labeled baseline are still useful.

### Subsonic velocity precision

The [source velocity audit](../../reference-data/provenance/frosty-site-ammo-velocity-2026-09-23.json)
replaces no data, but provides fractional source candidates for five integer menu
transcriptions. Their differences are only 0.294–0.599 m/s (about 0.11–0.22%).
A repeat menu screenshot cannot expose discarded fractions. Ordinary 60 fps
flight-time recordings are too coarse to distinguish these candidates reliably
at normal test ranges. Keep this below the ranked mechanics captures; an exact
native velocity/operation trace is stronger evidence for the fractional value and
ammo/barrel composition.

## L14 - Alternate single-fire cadence (rank 9 follow-up)

Use unmodified M4A1 with its in-game single-fire toggle, if available. Show the
mode indicator and loadout; record accepted muzzle shots with audio and ammo HUD.
Compare fastest repeated manual single shots with automatic fire. Use several
short runs and record actual shot intervals, not mouse-click times. Slow manual
input cannot establish the engine cap; label such a result inconclusive.

Hypothesis A predicts a single-fire minimum interval near 0.150 s (about 400 RPM),
versus automatic 0.0667 s (about 900 RPM). Hypothesis B (main rate remains the
limit) permits single-fire intervals near 0.0667 s with sufficiently fast input.
A reproducible interval below 0.150 s rejects the simple single-rate cap; failure
to reach that interval does not confirm it. VSSM semi-auto near 450 RPM and an
automatic M4A1 run are timing controls. Keep loadout, frame rate, platform and
server settings fixed. Capture-only outcomes do not rename any unknown fields.

## L18 follow-up: Buffer visible movement (optional; no numeric result)

Use one weapon that offers Buffer. Record the selected weapon, build, input type,
FOV and all attachments. Compare bare baseline and Buffer with the same optic,
stance, range and aim point. Record repeated isolated shots and matched short
bursts in both hip and ADS, with no aim correction. Track weapon-model movement,
reticle movement, background movement and projectile impacts separately.

If Buffer changes only procedural weapon animation, weapon-model movement should
change without the same change in background or impact displacement. If it changes
aim recoil, repeatable impact/aim displacement should also change. If neither
changes within measurement error, this setup does not demonstrate an active
effect; it does not prove global absence. The source 0.75 vector is not a justified
25% prediction because its target and operation remain unnamed. This test cannot
alone assign a field name. See the [L18 source limit](../../reference-data/provenance/frosty-2026-09-24-L18-buffer-animation-context.json).

## L17 follow-up: Match Trigger in semi-auto and automatic modes (rank 9 follow-up)

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
and zero added bloom with unchanged minimum spread. If the attachment acts only
in semi-auto, the automatic control should lack those changes. If no differences
are resolved, the result is inconclusive about activation and global absence.
A different direction or magnitude can reject this simple composition. There is
no sourced cadence prediction; record timing to control the experiment. Native
operator order and broader weapon coverage remain separate questions. See
[L17 evidence](../../reference-data/provenance/frosty-2026-09-24-L17-match-trigger-indirect-effects.json).

## L20 follow-up: Pellet direction pilot (rank 14)

Use 18.5KS-K with standard ammunition and a fixed bare baseline. Record one shell
per clean wall area at a measured fixed range, returning to the same stance, aim
state and aim point with full recovery between shots. Keep all impacts visible;
overlapping or hidden marks are missing observations, not fewer pellets. Record
a Slug control to check aim/impact alignment. Repeat at a second range only after
the first set resolves individual impacts.

Compare each shell after removing its center displacement. A repeated pattern
should preserve relative pellet positions, possibly after rotation or scaling;
independent sampling should vary those relative positions between shots. Repeat
after respawn or weapon reselection to test a repeating seed. Neither a few
similar groups nor a few irregular groups proves the native algorithm. If marks
merge or disappear, stop the pilot and retain unavailable pellet statistics.
The source currently gives no justified numerical direction distribution; this
test must establish a usable signal before fitting one. See [L20 scope](../../reference-data/provenance/frosty-2026-09-24-L20-pellet-direction-scope.json).

## L22 follow-up: Projectile expiry and range (rank 13)

Use KS-18K with a recorded bare-equivalent setup. Change only standard buckshot
versus Slug. Use a cooperative target at measured 125, 150, 175 and 200 m, with
a repeatable aim point, stable stance and full recovery between shots. Record
health/hit confirmation and exact distance; wall marks are secondary evidence.
Use nearby shots to verify aim and the recording method, and Slug as a control
for target visibility and range. Preserve misses and unavailable marks separately.

If the source 0.5 value is a lifetime in seconds and the current flight model is
applicable, standard buckshot should expire near 151.61 m. A confirmed standard
buckshot hit beyond that boundary rejects this combined hypothesis. Missing hits
alone cannot confirm expiry because pellet spread, aim error and mark culling
can hide impacts. Slug's 2.0 value predicts reach beyond 200 m under the same
assumptions. Compare repeated confirmed outcomes before changing reachability;
source units, native equation and lifetime start remain open. See [L22 evidence](../../reference-data/provenance/frosty-2026-09-24-L22-projectile-lifetime.json).

### L25 extension: Subsonic expiry control (rank 13)

Use CZ3A1 with its recorded bare-equivalent barrel, Subsonic ammo, stable ADS and
single deliberate shots at 240, 255, 270 and 290 m. Current site inputs predict
about 262.3-262.4 m if source lifetime 2.0 means seconds and the flight model is
applicable. Repeat with Standard ammo as a same-weapon range and aim control.
Account for drop; record confirmed target health changes or hit confirmation,
not only wall marks. A confirmed Subsonic hit well beyond the predicted boundary
rejects the combined expiry/flight assumptions. Misses alone remain inconclusive.
Record exact barrel/ammo identity and any velocity-changing effect. Do not start
with USG-90's near-300 m boundary. [L25 evidence](../../reference-data/provenance/frosty-2026-09-24-L25-selected-projectile-lifetimes.json)
keeps source lifetimes separate from these conditional distances.

## L27 follow-up: Compact Handstop sprint firing (rank 11 follow-up)

Use CZ3A1 with a fixed bare-equivalent setup. Compare no grip and Compact
Handstop, changing only the grip. Start sustained forward sprint before firing;
record input, muzzle events/ammo decrement and movement against fixed distance
markers. Include standing fire and sprint-release-then-fire controls. Repeat
trials with the same sprint mode, class and field upgrades.

The description-based hypothesis predicts firing while sprint remains active
with Handstop. The alternative is that firing exits sprint or waits for sprint
recovery in both setups. Distinguish continued sprint speed from a held sprint
button or camera animation. A timing difference alone does not name the raw
boolean or establish a general sprint-recovery multiplier. Keep the true source
boolean, descriptive text and measured behavior separate. [L27 source scope](../../reference-data/provenance/frosty-2026-09-24-L27-handstop-boolean-scope.json).

## L32 follow-up: projectile velocity while strafing (rank 15)

Use a bare B36A4 (BREN3 source), standard ammo, fixed stance and ADS, with a static
flat target at measured range. Record isolated first shots while stationary,
then while moving left and right at matched steady speeds. Fire as the player
crosses the same marked firing position. Record the aim point and movement at
shot release. Repeat enough shots to separate a group-center shift from moving
spread; hold build, range, attachments and aiming method fixed.

Measure each impact relative to the aim ray at release, not the camera position
after the shot. A reproducible shift that reverses with strafe direction supports
lateral velocity inheritance; a centered distribution with wider spread supports
no measurable inherited component in this setup. Camera sway, inconsistent aim,
movement spread and muzzle offset can confound the result. Repeat at a second
range before assigning a coefficient. A null result bounds the tested setup; it
does not prove universal zero inheritance or cover moving platforms.

The [L32 source check](../../reference-data/provenance/frosty-2026-09-24-L32-inherited-velocity-scope.json)
did not identify the native setting or equation. Do not convert its unnamed zero
values into a sourced coefficient. Keep the site calculation unchanged pending
this test and operator review.

## L35 follow-up: DRS-IAR heat configuration (optional / low value)

Source values are HeatPerBullet 0.0025, HeatDropPerSecond 0.2, threshold 1,
delay 0 and penalty 0. Under a simple additive model with continuous cooling,
0.0025 * 771.428 / 60 = 0.03214 heat/s is below the 0.2 heat/s drop rate;
zero penalty supplies no timed lockout even at threshold. This is not a native
behavior claim. Defer this low-value test unless source evidence shows cooling
pauses during fire or the penalty is applied another way.

Use DRS-IAR (M27IAR source), standard ammo and a documented magazine. Record a
cold first-magazine baseline, then repeated sustained firing with the same build,
stance, aim state and attachments. Record shots, reload intervals and any forced
pause while ammo remains. Use a clearly longer idle interval as a reset control,
and M250 as the zero-HeatPerBullet source comparison. Do not infer zero heat from
an absent HUD indicator; that measurement is unavailable.

An active accumulating heat gate predicts a reproducible additional pause or
cadence change after sufficient firing, affected by idle/cooling time. A visual
heat mechanism can change the weapon image without altering shot timing. Ordinary
reloads must remain separate. Even without cooling, the zero-start source ratio
1 / 0.0025 is about 400 shots versus a maximum site magazine of 60; a null test
alone cannot settle native behavior.

The [L35 source scope](../../reference-data/provenance/frosty-2026-09-24-L35-lmg-heat-source-scope.json)
establishes names and configured values only. No site heat gate is proposed for
implementation without measured firing effects and operator review.

## Maintenance

Keep the ranks current as source work proceeds. After receiving files, record which
capture IDs are received, usable, inconclusive or resolved. Link the measured report
and update the topic page. Remove resolved work from the active list without losing
its dated evidence. Do not request repeats of a usable existing control without a
specific new uncertainty.
