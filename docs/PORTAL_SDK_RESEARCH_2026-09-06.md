# Portal SDK usefulness — 6 September 2026

## Conclusion

Portal is a candidate instrument for controlled game experiments. The inspected API declarations expose observable state and experiment controls, but not the underlying recoil/spread equations or the four category ratings. No game experiment has been run.

## Source freshness

Two public mirrors were inspected:

- [PortalSDK declaration snapshot](https://github.com/battlefield-portal-community/PortalSDK/blob/24b26d81fd5795db19fa1ded046e5bfda79b8a8f/example_mods/typedefs/mod/index.d.ts), last file change 16 October 2025. The repository version file reports 1.0.1.0.
- [The Sir Community declaration snapshot](https://github.com/The-Sir-Community/ts-bf6-portal/blob/8fc05900260148f4c7e916bbc1897bd473e72881/src/portalsdk/mod/index.d.ts), last file change 31 October 2025.

Both are older than the installed BF6 version. Both list M87A1, M1014 and 18.5KS-K; neither weapon enum lists DB-12. Absence here does not establish that the current Portal runtime lacks DB-12. Obtain current declarations or verify the runtime before implementation. Local declaration hashes are in `reference-data/provenance/portal-sdk-review-2026-09-06.json`.

## Useful capabilities

| Capability in the inspected declarations | Possible research use | Limit to test |
| --- | --- | --- |
| Magazine ammo and elapsed match time | Estimate intervals between consumed rounds; compare firing modes and pump cycles | No per-shot callback found; measure timer granularity, scheduling and observation delay |
| Facing direction and eye position | Record aim displacement and recovery | Determine whether facing includes ballistic recoil, camera motion, or only another orientation |
| Firing, reload, zoom and stance state | Label trial conditions and exclude mixed states | A zoom boolean does not identify exact ADS completion |
| Camera pitch/yaw and movement restrictions | Reduce unintended compensation and movement | Confirm restrictions do not change recoil itself |
| Weapon packages and attachment assignment | Repeat baseline, grip-only, muzzle-only and combined trials | Confirm actual equipped choices and valid weapon-specific combinations |
| Damage callbacks and health | Check controlled damage outcomes | Callback has no impact coordinate or numeric damage payload; concurrent damage can confound health differences |
| Ray casts | Place or measure targets and reference geometry | A scripted ray is not the path of a fired projectile |

The package APIs include `CreateNewWeaponPackage`, `AddAttachmentToWeaponPackage` and `AddEquipment`. The restriction API is `EnableInputRestriction`. The principal observation APIs are `GetSoldierState`, `GetInventoryMagazineAmmo` and `GetMatchTimeElapsed`.

## Logging and local testing

The author of [this Portal tutorial](https://github.com/florentpoujol/battlefield6_portal_tutorials#debug-scripts) reports that `console.log()` writes to a local `PortalLog.txt` when testing, and describes hosting an unpublished saved experience locally. This workflow is historical community evidence and needs current verification. No experience was created, uploaded or hosted during this review.

For an eventual experiment, buffer samples and write them after each trial. Compare runs with and without logging to detect measurement overhead. Keep the game version, actual loadout, stance, FOV, zoom and input settings with each record.

## Smallest useful first experiment

1. Verify the current SDK and run a short state/timer probe. Measure actual successive time increments rather than assuming `Wait()` provides a particular sampling rate.
2. Compare ammo changes with video for a known semi-automatic weapon. Bound each change between the preceding and current samples. If more than one round disappears between samples, do not invent individual firing times.
3. Repeat on M87A1. Proceed to DB-12 only after confirming current availability and the equipped weapon. Keep long and short intervals separate.
4. Test facing direction with no firing, with firing and no look input, and with camera input restricted. Proceed with recoil analysis only if the vector and video show compatible behavior.
5. Compare baseline and individual/combined attachments across repeated trials. These observations can distinguish candidate models; they do not automatically identify the native operator.

## What this does not currently solve

No inspected getter returns the recoil accumulator, spread cone, random spread sample, projectile impact coordinates, or Hipfire/Precision/Control/Mobility ratings. Spread distribution still needs an independent impact measurement method. Rating formulas still need UI/graph evidence or menu observations. Exact update order cannot be inferred from coarse state polling.

Priority: calibrate ammo timing first, validate facing-vector meaning second, then use those results to decide whether a larger experiment has value.
