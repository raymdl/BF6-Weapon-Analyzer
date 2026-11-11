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
| Attachment rows that differ from the Stage 9 reader in both builds | Canted Vertical hip spread (10 weapons: site -2, reader 0); Z-84M 100 Rnd and its Agile and Fast variants (7 rows) | | | None. Both groups were traced on 10 Nov 2026 and are reader limits; the site matches the files. Canted Vertical: the reader skips `GDM_Array_HipDispersion_BTM_P20_NoBipod` (hip spread 2 steps) because its name contains "bipod". Z-84M: the reader has no Agile magazine id, so the Compact1 and Regular records collapse onto 100 Rnd. The list (344 rows) compares the site with the part C update reader, not with the ten generator checks, which pass. Re-read on 10 Nov 2026 against the current site: 154 rows are records or identities the reader could not place (39 the ACE module), about 80 are descriptions the reader could not resolve (it read the campaign copies of the name lists), 39 the ACE module in grip lists, 25 burst-fire effects the reader does not read, 1 the M121 A2 row below | 2.1.2.0, `RUN\S9\C\mismatches.tsv` |
| Empty reload with a reload override | M240L 75 and 100, M/60 50, 75 and 100 Fast, PP-19 53, RPK-74M 95 | "Empty N/A" | Second override entry: 7.984 s, 5.034 s, 2.667 s, 3.300 s | Decide whether the second entry is the empty reload (inferred from order, not proven), then show it | 10 Nov 2026, `RUN\GEN-belts\` |
| M121 A2 50 Fast reload | M121 A2 | Reload tier 1: 6.267 / 1.13 = 5.546 s | The package holds its own reload override, 5.6 / 1.009009 = 5.550 s, in both builds | Store the override only after the empty-reload row below is settled: a magazine with an override shows "Empty N/A", so storing it now would remove this magazine's empty reload from the site for a 4 ms gain. Held as two pending rows in `data-src/overrides.json` | 10 Nov 2026, `RUN\GEN-handling\` |

Closed on 10 November 2026 by the multiplayer copies (`builds\2.1.2.0\reports\mp-copies-2026-11-10`,
guide Stage 2 step 5): the capture held the campaign copy of the weapon metadata and name lists.
The M2010 ESR and SV-98 descriptions resolve in the multiplayer copy (strings 5E0EAEEC, 97529B79),
and its name lists give "ST Prisim 5.00x" (1B975E23) and the PA-SL 2.50x entry on every weapon;
the site now shows "ST Prisim 5.00x".

Closed on 10 November 2026 by `scripts/frosty-weapons.py` (`RUN\GEN-weapons\differences.md`): the
shotgun reload, hip firing coefficient and attachment-gated fire mode rows were faults in the
part A reader, and the site was right; the DB-12 fire rate is the two-round pump convention and
the M45A1 75 m step is an in-game observation (operator test, 13 September 2026). Both are
recorded as rows in `data-src/overrides-weapons.json`.

Reader gaps are not listed here (for example the Lightweight ammunition rows the part B reader
cannot map, and the leading 0 m point it drops from the M250, M277 and Mini Scout curves). They
are in `scripts/update-readers/README.md` in the research repo.
