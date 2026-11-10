# Known site differences

Site values that differ from the game files in two builds running, so no update caused them.
Read this list first on every update (Stage 0 of [GAME_UPDATE_GUIDE.md](GAME_UPDATE_GUIDE.md)),
so these rows are not reported as new changes, and so the update can close some of them.

Each row says what is needed before the site changes. Remove a row in the commit that fixes it.
A row that needs an in-game check has its check on [IN_GAME_CHECKS.md](IN_GAME_CHECKS.md),
the one list the operator works from.
Add every new "site differs from both builds" row from the Stage 9 generator and reader runs.
Row evidence for 2.1.2.0 is in the research run folder
`reports\weapon-analyzer-research\2026-11-10-update-2120-post\` (`RUN` below).

| Item | Weapons | Site | Files (2.1.1.0 and 2.1.2.0) | Needed | Found |
|---|---|---|---|---|---|
| Missing description strings | M2010 ESR, SV-98 | Description text | String ids 2DB86D4C, E8EA1B59 in neither strings table | The site text is right: the in-game weapon cards show it word for word (operator, 10 Nov 2026). Open: which table holds these two strings, so the checker can read them | 2.1.2.0, `RUN\S9\A\summary.txt` |
| Attachment rows that differ from both builds | Many (344 rows) | | | Most are known 2.1.1.0 causes (kill-switched records the site still lists, single-weapon id variants, ACE module); review the rest | 2.1.2.0, `RUN\S9\C\mismatches.tsv` |
| "ST Prism 5.00x" sight name | 44 weapons whose name list did not change in 2.1.2.0 (M433 checked) | ST Prism 5.00x | String 149AA226 read "ST Prism 5.00x" in 2.1.1.0 and reads "PA-SL 2.50x" in 2.1.2.0; a new string 1B975E23 reads "ST Prisim 5.00x". 17 weapons' name lists (`AAM_*`) were updated to the new string and gained a PA-SL entry; the other 44, the M433 among them, are byte-identical to 2.1.1.0, still point the 5x at 149AA226 and have no PA-SL entry. Both ids occur only in `AAM_*` files across the 42,319 captured files | In game the M433 sight list shows "ST Prisim 5.00x" and "PA-SL 2.50x" (operator, 10 Nov 2026), which its captured name list cannot produce. Open: find what the menu reads (a newer copy of the name list that the capture does not surface, or a table outside these files). The M2010 ESR and SV-98 description strings below may share the cause. Then decide whether the site copies the game's "Prisim" spelling | 10 Nov 2026, `RUN\IGC-avail\summary.txt`; scan of 10 Nov (evening) |
| Empty reload with a reload override | M240L 75 and 100, M/60 50, 75 and 100 Fast, PP-19 53, RPK-74M 95 | "Empty N/A" | Second override entry: 7.984 s, 5.034 s, 2.667 s, 3.300 s | Decide whether the second entry is the empty reload (inferred from order, not proven), then show it | 10 Nov 2026, `RUN\GEN-belts\` |
| M121 A2 50 Fast reload | M121 A2 | Reload tier 1: 6.267 / 1.13 = 5.546 s | The package holds its own reload override, 5.6 / 1.009009 = 5.550 s, in both builds | Store the override only after the empty-reload row below is settled: a magazine with an override shows "Empty N/A", so storing it now would remove this magazine's empty reload from the site for a 4 ms gain. Held as two pending rows in `data-src/overrides.json` | 10 Nov 2026, `RUN\GEN-handling\` |

Closed on 10 November 2026 by `scripts/frosty-weapons.py` (`RUN\GEN-weapons\differences.md`): the
shotgun reload, hip firing coefficient and attachment-gated fire mode rows were faults in the
part A reader, and the site was right; the DB-12 fire rate is the two-round pump convention and
the M45A1 75 m step is an in-game observation (operator test, 13 September 2026). Both are
recorded as rows in `data-src/overrides-weapons.json`.

Reader gaps are not listed here (for example the Lightweight ammunition rows the part B reader
cannot map, and the leading 0 m point it drops from the M250, M277 and Mini Scout curves). They
are in `scripts/update-readers/README.md` in the research repo.
