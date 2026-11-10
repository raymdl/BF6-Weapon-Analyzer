# Known stale site data

Site values that differ from the game files in two builds running, so no update caused them.
Read this list first on every update (Stage 0 of [GAME_UPDATE_GUIDE.md](GAME_UPDATE_GUIDE.md)),
so these rows are not reported as new changes, and so the update can close some of them.

Each row says what is needed before the site changes. Remove a row in the commit that fixes it.
Add every new "site differs from both builds" row from the Stage 9 generator and reader runs.
Row evidence for 2.1.2.0 is in the research run folder
`reports\weapon-analyzer-research\2026-11-10-update-2120-post\` (`RUN` below).

| Item | Weapons | Site | Files (2.1.1.0 and 2.1.2.0) | Needed | Found |
|---|---|---|---|---|---|
| Extended barrel ADS step (`BARRELS[3].adsTimeTierModByWeapon`) | 46 (site ids): ak4d, b36a4, brod3, cz3a1, db12, drsiar, ef88, elr40, grtcps, interdictor, ks18k, kv9, l115, l85a3, lmr27, m1014, m16a4, m2010esr, m277, m39emr, m417a2, m433, m44, m4a1, m87a1, miniscout, mk24, nvo228e, pp19, psr, pw5a3, qbz192, rpkm, rspr, scw10, sg553r, sgx, sl9, sor300sc, sor556, sv98, svdm, svk86, tr7, umg40, vcr2 (grtbc changed in 2.1.2.0 as well) | 0 | +1 (`WME_ADSTime_Anim_P10`, `FOV_P10`) | In-game check on one Extended-barrel weapon; it may be a raw-mode artefact | 2.1.2.0, `RUN\G-generators\diffs\frosty-barrel-ads.tsv` |
| Shotgun tactical and empty reloads | DB-12, M87A1, M1014 | Site reload times | Per-shell reload entry | Find the convention the site used; cause not found in the readers | 2.1.2.0, `RUN\S9\A\mismatches.tsv` |
| DB-12 fire rate | DB-12 | 359.999 rpm | 94.737 rpm by the formula | Pump-action convention; confirm and document | 2.1.2.0, `RUN\S9\A\summary.txt` |
| Hip firing coefficient digits (`spreadDyn.hip.firingCoef`) | 18.5KS-K, DB-12, M44, SVK-8.6, M357 Trait | 0.0833333 | float32 0.083333 | Store the source value (full-precision rule) | 2.1.2.0, `RUN\S9\A\summary.txt` |
| Bolt-action fire rate last digits | M2010 ESR, Mini Scout, PSR | 43.90241, 47.092969, 38.663456 | 43.902402, 47.092978, 38.663459 | Recompute from the file values | 2.1.2.0, `RUN\S9\A\summary.txt` |
| Attachment-gated fire modes | CZ3A1, KORD 6P67, KV9, PW5A3, SG 553R, UMG-40, GRT-BC, SL9, M16A4, VSSM | Burst or auto listed | Not in the weapon file | Trace which attachment gates each mode | 2.1.2.0, `RUN\S9\A\summary.txt` |
| M45A1 damage curve | M45A1 | Extra 14.3 step at 75 m | 14.3 from 54 m, then 12.5 at 75 m | Remove the extra point | 2.1.2.0, `RUN\S9\B\mismatches.tsv` |
| Buckshot hit zones (material 280) | DB-12, 18.5KS-K, M1014, M87A1 | 1.0 / 1.0 | No head or limb row for material 280 in either grid | In-game check | 2.1.1.0 baseline, checklist U13 |
| Missing description strings | M2010 ESR, SV-98 | Description text | String ids 2DB86D4C, E8EA1B59 in neither strings table | Find where the site text came from | 2.1.2.0, `RUN\S9\A\summary.txt` |
| `PD_.375EnABELR_API` drag | (projectile key) | 0.004 | Key in neither build | Find which weapon cites it; drop or rename | 2.1.2.0, `RUN\S9\B\mismatches.tsv` |
| Reloads not on the site | M240L 75 Fast, M60 100 Fast | None | Not decoded | Decode and add | 2.1.2.0 checklist outcome |
| Attachment rows that differ from both builds | Many (344 rows) | | | Most are known 2.1.1.0 causes (kill-switched records the site still lists, single-weapon id variants, ACE module); review the rest | 2.1.2.0, `RUN\S9\C\mismatches.tsv` |

Reader gaps are not listed here (for example the Lightweight ammunition rows the part B reader
cannot map, and the leading 0 m point it drops from the M250, M277 and Mini Scout curves). They
are in `scripts/update-readers/README.md` in the research repo.
