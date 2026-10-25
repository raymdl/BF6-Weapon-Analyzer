# Documentation review, 25 October 2026

> **Archived record.** Applied on 25 October 2026 on branch `ui-redesign`: the provenance record in `af612b3`, then the data-flow atlas, the site meta description and the Analyzer docs in the commits that follow it, the last of which archived this file. The research-repo findings (section 5 and the Frosty rows) are for that repo. Line numbers refer to the files before these changes.

Scope: every live document in the BF6 Weapon Analyzer repo (README, MAINTENANCE, docs/*.md, docs/data-flow/*.md, docs/working/*.md, index.html prose) and in the BF6 Frosty Research repo (README, CLAUDE.md, docs/frosty/*.md, docs/updates/*.md, docs/working/*.md). Archives were checked only for being indexed. Six reviewers (one Opus, five Sonnet) worked from a fact sheet of the current state: Frosty v2.1.1.0 (Season 5) reviewed 13 October, 67 weapons, sym.gg v1.4.2.0 baseline, the UI as it stands on branch `ui-redesign`. Every finding below names a file and line; the reviewers verified counts against the data files and code unless marked inferred. The six full reports are in the session scratchpad (`review-A` to `review-F`).

The data-flow atlas and `data/provenance/live-baseline.json` are being corrected on branch `ui-redesign` as part of this pass; the findings against them are listed for the record.

## 1. The root of the "1.3.3.0" problem

`data/provenance/live-baseline.json` still carries `ea-update-notes` at version 1.3.3.0 with the EA 1.3.3.0 notes URL. Every doc that names the 1.3.3.0 notes as a source (DATA_SOURCES.md:81, data-flow/SOURCES.md:12 and :39) only repeats that record, word for word. No data field cites the 1.3.3.0 notes; the only patch-notes citation in the data is the Interdictor curve, which cites the 1.4.3.0 notes. The same record's `frosty-update-2.1.1.0` entry has no `evidence` field (every other Frosty record has one) and its `authority` text says Season 5 weapons are not included, while the commit that wrote it added four 2.1.1.0 curves and set the weapon count to 67.

Fix in progress: mark the EA record historical (no later notes page has been adopted as a source, and none is invented), add the 2.1.1.0 evidence pointer, and correct the authority text. The docs then cite the record instead of restating versions. No 2.1.1.0 patch-notes page is recorded anywhere; the research repo's `patch-notes-inventory.json` still lists Season 5 as upcoming with no release date.

## 2. The source chain stops at 1.4.3.0 in most docs

The chain is sym.gg v1.4.2.0 → Frosty 1.4.2.5 (adopted 12 Aug) → 1.4.3.0 (16 Sep) → 1.4.3.5 (30 Sep, sealed) → 2.1.1.0 (13 Oct, open, read from raw). Docs that still end at 1.4.3.0 or call it the open build:

| Repo | File:line | Says |
|---|---|---|
| Analyzer | index.html:7 (meta description) | "reviewed Frosty v1.4.3.0 changes over the v1.4.2.5 baseline" |
| Analyzer | docs/DATA_SOURCES.md:75-83, 104, 117-150 | 63 weapons, three source records; source table lacks the 1.4.3.0 and 2.1.1.0 rows; every curve is 1.4.2.5; export roots only for 1.4.2.5 and 1.4.3.0 |
| Analyzer | docs/data-flow/SOURCES.md:14, 41, 56-59; REGISTER.md:37, 56, 87; README.md:68 | 1.4.3.0 is the open build; "site header shows v1.4.3.0"; baseline is "1.4.2.5 + 1.4.3.0" |
| Analyzer | docs/MODEL_LIMITATIONS.md:12; docs/DAMAGE_BALLISTICS.md:27; data-flow/DAMAGE_BALLISTICS.md:34-36 | every base curve is 1.4.2.5 (truth: 62 at 1.4.2.5, Interdictor and VSSM 1.4.3.0, SOR-300SC and GRT-CPS 1.4.3.1, the four new weapons 2.1.1.0) |
| Analyzer | docs/GAME_UPDATE_GUIDE.md:13-15 | the 1.4.3.0 run is "the worked example"; 2.1.1.0 has its own checklist, linked at line 84 |
| Analyzer | docs/ATTACHMENT_BUGS.md:27 | source references are to the 1.4.2.5 export "unless stated"; entries 17-28 cite 2.1.1.0 raw |
| Analyzer | docs/WEAPON_ATTRIBUTES_MODEL.md:32, 189 | tables come from 1.4.3.0; the tables now hold 67 weapons though `sourceVersion` stays 1.4.3.0 (the doc does not claim a re-derivation; it needs a 2.1.1.0 note) |
| Analyzer | all eight data-flow pages, line 5 or 15 | "Checked against b3e67bf on 22 September 2026" (being redone) |
| Frosty | docs/working/FROSTY_RESEARCH_QUEUE.md:61-62 | "New work uses the open build 1.4.3.5 (Head 4909002)" |
| Frosty | docs/frosty/GADGETS.md:89, 121; VEHICLES.md:225, 271; VEHICLE_SITE_ADDITIONS.md:680; GADGET_SITE_ADDITIONS.md:66, 174; SITE_AUDIT_TABLES.md:3; SOLDIER.md:3 | "current Head 4909002" / "current build 1.4.3.5" (4909002 is the 1.4.3.5 head; current is 5382784) |
| Frosty | docs/frosty/TOOLS.md:96-103, 474-477; OPEN_QUESTIONS.md:110 | build state "recorded 16 September" with 1.4.3.0 open; per-build collection table lists only 1.4.2.5 and 1.4.3.0 |
| Frosty | docs/frosty/UI_TEXT.md:7, 87-97, 711 | snapshot "1.4.2.5, rechecked on 1.4.3.0"; export list stops at S4B1 (2.1.1.0 adds S5B1); "pinned current table" SHA is the 1.4.3.5 table |
| Frosty | docs/frosty/WEAPONS.md:82, 202, 288, 313 | "current" field atlas and projectile audit are the 63-weapon 1.4.3.5 / 23 Sep runs |
| Frosty | docs/updates/README.md | ladder omits the 2.1.1.0 hotfix clients of 15 Oct (Head 5383474) and 22 Oct (Head 5383516) recorded in BUILD.json |

## 3. Counts that drifted (the data says the right-hand value)

| Figure | Stale value(s) | Current | Where stale |
|---|---|---|---|
| Weapons | 63 (and 64, 69) | 67 | Analyzer README:37; DATA_SOURCES:75; MODEL_LIMITATIONS:72, 173; TESTS:34; STAT_LADDERS:111-112, 244; USER_GUIDE:47; DATA_REFERENCE:64; RECOIL_SPREAD_MODEL:303; data-flow README:150, DAMAGE_BALLISTICS:116, RECOIL_SPREAD:43; ATTACHMENT_BUGS:768, 824 ("69 weapons" are 69 gun-sway files). Frosty: docs/frosty/README:46-47; OPEN_QUESTIONS:49; WEAPONS:1431, 1440, 1569-1572 (class counts now 12 AR, 11 LMG, 11 SMG, 7 sniper); UI_TEXT:143, 301, 312 |
| Ammo selections | 328 | 353 | MAINTENANCE:237; data-flow README:150; DAMAGE_BALLISTICS:116; Frosty WEAPONS:288 |
| Projectiles | 64, 68 | 69 | data-flow README:150; DAMAGE_BALLISTICS:116; DATA_REFERENCE:163 |
| Duration entries | 126 | 134 | DATA_REFERENCE:64; RECOIL_SPREAD_MODEL:304; data-flow RECOIL_SPREAD:43; working/BF6_RECOIL_SPREAD_RECORDING_HANDOFF:35 |
| Bolt (muzzle) overrides | 17 | 19 | MODEL_LIMITATIONS:70; ATTACHMENT_MODEL:340; data-flow RECOIL_SPREAD:45; RECORDING_HANDOFF:35 |
| Screenshot-backed tooltip panels | 15, 18 | 26 | USER_GUIDE:51; DATA_SOURCES:63-64; docs/README:23 |
| Frozen site versions | three | four (v1.2.3.0, v1.3.1.0, v1.3.3.0, v1.4.3.1) | ARCHITECTURE:34-35; UI_PUBLISHING:138, 160; TESTS:125; docs/archive/README:100 |
| Console recoil multiplier | 0.8836 | 0.95 (since 2.1.1.0) | README:43; data-flow REGISTER:63; data-flow RECOIL_SPREAD:56; Frosty WEAPONS:498-501 |
| Attribute-score panels / values | 160 / 640 | 203 / 812 (four ledgers) | MODEL_LIMITATIONS:193; TESTS:30-31; WEAPON_ATTRIBUTES_MODEL:36 |
| Mount choices / dependency entries / rules | 1,391 / 285 / 22 on 4 / 118 on 56 | 1,523 / 309 / 25 on 5 / 127 on 60 | DATA_SOURCES:50-52; data-flow SOURCES:184 |
| Grips | 49 | 50 | DATA_REFERENCE:182 |
| Reload animation records | four records, five entries | five, six (ELR-40) | ATTACHMENT_MODEL:225 |
| QD Grip Pod tier-3 weapons | 5 | 7 (adds Mk 24, Z84M); ATTACHMENT_BUGS:64, 598, 615 also omit BROD 3, RPK-74M, VSSM | ATTACHMENT_MODEL:94-98 |
| Slim Angled sniper rifles | five | six (ELR-40) | ATTACHMENT_MODEL:346-349 |
| Iron-sight sway weapons | 56 | 59 | ATTACHMENT_MODEL:274; ATTACHMENT_BUGS:413 |
| Sniper brakes | six rifles, 16 selections | seven, 17 (ELR-40), plus RSPR | RECOIL_SPREAD_MODEL:55-57 |
| ADS spread offset census | 40 / 22 weapons | 44 / 23 | RECOIL_SPREAD_MODEL:382-383 |
| Match Trigger selections | 24 | 26 (SGX and L110 lost the import at 2.1.1.0) | Frosty ATTACHMENTS:1176 |
| Vehicle leads | "latest L3300-L3304" | L3386, plus L4031-L4033, L4037 | Frosty docs/frosty/README:35 |
| Unannounced checklist rows | U1-U29 / U1-U46 | U1-U47; the outcome tallies count E2 twice | Frosty 2.1.1.0-checklist:69, 250, 331-336, 344 |

One generated file is also stale: `reference-data/provenance/frosty-barrel-ads-generated.json` has 234 rows over 63 weapons and none of the four new ones, while DATA_REFERENCE:78-83 presents it as current (live barrels hold 246 entries). Regenerate it or say it predates 2.1.1.0.

## 4. The user guide predates this branch's UI

docs/USER_GUIDE.md does not describe: the single chart read-out box and its target-distance line (lines 136, 147-200 still talk about tooltips); the kill table's title, weapon names, outline rule and hover link (132-145); the icon Swap and Clone beside the compare button and the Weapon 1 / Weapon 2 headings (82-86); the inline source line on chips (88-107); the empty-state example button; the Target Impact Stats tab's stacked cards (324-331). Its example wording is "loadout 1/2" in orange and blue where the app says "Weapon 1/2" in gold and blue (91, 151). Other outdated descriptions: ARCHITECTURE.md's URL table lacks the `fm`/`fm2` and `O` tokens (105-117), its module table lacks sim/fire-modes.js, ui/format.js and ui/recoil-touch.js (41-54), and ARCHITECTURE:136 with UI_PUBLISHING:71, 105 say local storage holds only resolution and FOV (it also holds mouse sensitivity, saved loadouts, locks and the lock hint). data-flow/TARGET.md:94 says pellet loads suppress detailed stats (they are scored per pellet unless unsampled); data-flow/LOADOUTS.md:14-16 still describes generic sight categories and an "Iron Sights (1.5x)" label. ATTACHMENT_MODEL.md:258 omits the spot-range exceptions (75 m on M433, SGX, L110, P18; 27 / 64.29 on M45A1 and vz. 61), ATTACHMENT_BUGS.md:1114 says no Match Trigger effect is applied (the semi-auto block applies since 24 Oct), and WEAPON_ATTRIBUTES_MODEL.md:128-133 asks for a zero-variation guard the sim already has.

## 5. Research repo: records and status lines out of step

- `python scripts/frosty-records.py check` fails with three errors, all from tip commit 80f045e: two 24 Oct receipts (`frosty-optic-category-mapping-2026-10-24.json`, `frosty-site-attachment-mapping-2026-10-24.json`) carry no `record`, and the committed 13 Sep receipt `frosty-attachment-identity-followup-2026-09-13.json` was edited (a screenshot path) instead of superseded. The repo's own rule is that `build && check` passes before the next close-out. 22 warnings besides (ledger drift on 19 of 21 pinned files, 6 stale `noEffect` pointers on bipod and match_trigger, one shared-script difference).
- Queue versus lead index (FROSTY_RESEARCH_QUEUE.md): L4008 is recorded as a proposal awaiting approval but the queue says implemented in site commit b6da447, which is on origin/main (not "local, not pushed", lines 102, 389); L15 and L33 are listed for operator review but are `rejected`; L63's statusNote still says "needs capture"; L4051-L4055 have had no receipts for six days.
- L99 (hit-capsule capture) is still "awaiting the operator" in the queue and in `status`, but BF6_CAPTURE_PRIORITIES.md:21 says it was done on 10 Oct (L4010) with no further capture needed; the same file's section 2 still says pending, and its row 3 (recoil recovery) is a pending capture although L4040 is `site-fixed`.
- OPEN_QUESTIONS.md has five questions that later leads answered: the native Hipfire comparison and Control operation (L4017, L4036), the expression-resource reader (L4019 and others, superseding L1004), bipod and mounted (L61, L108, L4038), the APHEI consumer (L3033, exhausted with a reopen condition), and the material-grid old-raw gap (partly, by the 13 Oct trace). It has a 1.4.3.5 section but no 2.1.1.0 section, while the checklist carries its own open items.
- SOLDIER.md contradicts itself on L865 (245 and 247 pending, 249 complete) and L844 (frontier open at 87, closed by L866 at 251-255); it and WEAPONS.md:1604-1606 present the five perk-description proposals as reviewable when the queue parks them (operator, 1 Oct). WEAPONS.md:1434 and :1830 say the fire-mode selector is hidden and that the site has no manual single-fire mode; both shipped. WEAPONS.md:2125-2129 lists L741, L745 and L746 as open questions that the top of the page closes.
- docs/frosty/README.md's page index omits SOLDIER.md and SITE_AUDIT_TABLES.md, against RESEARCH_PRACTICES.md:110, which also says the page set is fixed and no dated Markdown is added; docs/working now holds five dated notes and two review folders, five of them linked from no page.
- GADGETS.md:276 and GADGET_SITE_ADDITIONS.md:226, 313 label the Supply Pouch change two different ways; GADGETS.md:276, 294 annotate only two of nine changed Glacier registry rows; PROGRESSION.md:25-40 carries no build label; UI_TEXT.md:310 says the Interdictor string is 120-150 m where its own line 711 and WEAPONS:2123 say 160 m; ROSTER_VALUES.md does not point at the 2.1.1.0 roster refresh that partly supersedes it.

## 6. Broken references (few)

| Repo | File:line | Problem |
|---|---|---|
| Analyzer | docs/README.md:30-32 | describes a `docs/frosty/` folder that lives only in the research repo |
| Analyzer | docs/TESTS.md:38-59 | test table lacks `scripts/fire-modes.test.mjs` and `frosty-ebx-decode.test.py` |
| Analyzer | docs/DATA_REFERENCE.md:83 | cites `frosty-barrel-ads-2026-09-13.json`, which exists only in the research repo, unlinked |
| Analyzer | docs/RECOIL_SPREAD_MODEL.md:517 | cites a chatgpt.com conversation as the source of the M39 EMR analysis; not a repo artifact |
| Frosty | docs/working/VEHICLE_SITE_ADDITIONS.md:454; GADGET_SITE_ADDITIONS.md:174 | link to `GAME_UPDATE_GUIDE.md` as if in this repo (it is in the site repo) |
| Frosty | BREAKTHROUGH_SECTORS:9, 245, 289; GAME_MODES:14, 349 | cite extraction scripts and map text "in the session scratchpad"; `modes_extract.py` and `Operations-maps.txt` are not tracked |

Everything else resolved: all relative links and anchors in both repos, every provenance path, lead id, script and flag the reviewers checked.

## 7. Working notes: what is live

Analyzer: BF6_RECOIL_SPREAD_RECORDING_HANDOFF.md is mostly a record (header dated 12 Sep, 63 weapons and 17 Bolt pairs at line 35, scenarios 3-7 no longer a live capture list); GRTBC_RECOIL_PATTERN_REVIEW.md is a closed analysis that belongs in docs/archive.
Frosty: FROSTY_RESEARCH_QUEUE, BF6_CAPTURE_PRIORITIES, WEAPON_REGISTRY_RECHECK, SEASON5_ATTACHMENTS, GAME_MODES and BREAKTHROUGH_SECTORS are live (the last two have no lead, receipt or topic page yet); EXTERNAL_RECOIL_STATEMENTS should fold into WEAPONS.md; ROSTER_VALUES is a reference partly superseded by the 2.1.1.0 refresh; GADGET_ and VEHICLE_SITE_ADDITIONS carry live proposals over stale history blocks (GADGET lines 140-180) that belong in an archive.

## 8. What the reviewers found correct

GAME_UPDATE_GUIDE's scripts and paths all resolve and its Stage 9 list matches what the 2.1.1.0 commit touched (gap: it never says to update `ea-update-notes`); DATA_REFERENCE's file table matches `git ls-files data/`; the ladder tables match balance_tables.json; the recoil, spread, Control, Hipfire and Mobility formulas and the SVDM / M39 changes match the code; about 130 WEAPONS.md values and the ATTACHMENTS.md overrides match the site data; the UI_TEXT counts match the 24 Oct mapping files; docs/updates/README.md matches the build ladder; the Analyzer's archive index is complete.

## 9. Suggested order of work

1. Provenance record and data-flow atlas (in progress on `ui-redesign`).
2. Analyzer docs, one Opus pass: rewrite the top half of DATA_SOURCES.md around the source chain; rewrite the changed sections of USER_GUIDE.md; patch every count and version in sections 2 to 4 above; fix the six references; move GRTBC to the archive. Documentation only, so no header-date change.
3. Research repo, one Opus pass after the operator's calls: the three `check` errors need either record headers on the two 24 Oct receipts or a superseding receipt for the edited one (a records decision, not a wording one); L99, L4008, L15, L33 and L63 need their lead-index status re-recorded; then the "current build" lines, the README index, OPEN_QUESTIONS (answered rows and a 2.1.1.0 section), the checklist tallies, the queue rows, and the VEHICLES Rear-row value.
4. Operator decisions: whether to adopt a Season 5 patch-notes page as a source (none is recorded); whether to re-derive the attribute-score tables at 2.1.1.0 or keep the 1.4.3.0 label; whether to regenerate the barrel-ADS file; which working notes to fold or archive.
