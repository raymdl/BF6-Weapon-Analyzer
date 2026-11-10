# In-game checks for the operator

The single running list of things only an in-game look can settle. Every update stage, worker
and doc adds its items here, not to a checklist's Outcome, `STALE_SITE_DATA.md` or chat
([GAME_UPDATE_GUIDE.md](GAME_UPDATE_GUIDE.md) points here). Before adding an item, apply the
capture-request test: ask only when the answer changes the site or a recorded verdict.

When the operator reports a result, record it as one line in the update's results file
(guide, "Recording in-game confirmations"), apply what it settles, and remove the item here
in the same commit.

| Check | Weapon(s) | What to read | Why | Added |
|---|---|---|---|---|
| Extended barrel ADS time against Basic | One Extended-barrel weapon, and the GRT-BC | ADS time on the loadout panel, Basic against Extended | Files give the Extended barrel +1 (GRT-BC -1 in 2.1.2.0); the site holds 0, and the Mini Scout panel (300 ms against 250 ms) disagrees with the files. Settles two [STALE_SITE_DATA.md](STALE_SITE_DATA.md) rows and checklist W5 | 2.1.2.0 |
| Fast belt reload times | M240L 75-Round Fast, M/60 100-Round Fast | Tactical and empty reload times against the regular belt | The packages store no reload change, so the Fast reload is animation-only; needed before the two belts are added (checklist C7) | 2.1.2.0 |
| Buckshot hit zones | DB-12, 18.5KS-K, M1014, M87A1 | Head and limb damage of one pellet hit | Material 280 has no head or limb row in either grid; site 1.0 / 1.0 unverified (checklist U13) | 2.1.1.0 |
| L115 QD Grip Pod moving-ADS accuracy | L115 | Moving-ADS accuracy with and without the pod | 2.1.2.0 binds the penalty; applied on the site from the files (checklist U18) | 2.1.2.0 |
| Slim Angled still offered | BROD 3, VSSM | Grip list | Patch note U3 implied a removal; the files keep it | 2.1.2.0 |
| Slim Angled moving-ADS on a bolt sniper | One of PSR, SV-98, L115, Mini Scout, Interdictor, ELR-40 | Moving-ADS accuracy with Slim Angled | Bug entry 1 resolved from the files | 2.1.2.0 |
| KTS100 MK8 draw | KTS100, against RPKM and RPK-74M | Draw time with default magazines | Checklist M-rows | 2.1.2.0 |
| KTS100 60 Fast reload | KTS100 | Reload time, 60 Fast against the 60 drum | The 60 Fast lost its reload import | 2.1.2.0 |
| NSW4 Carbine | NSW4 | Ammunition menu, spotting, iron-sight sway, single-fire bloom, no Harris bipod; Alloy Vertical still offered | New weapon values from the files; the Zenitco RK2 kill switch went false to true in 2.1.2.0 while RK1 stays false, and both map to the site's Alloy Vertical | 2.1.2.0 |
| M44 sights and trigger | M44 | S-VPS / NFX sight names; Match Trigger offered | The S-VPS 6x maps to the NX8-4 record, unresolved | 2.1.2.0 |
| Synthetic Tip on sidearms | ES 5.7, GGH-22 | Ammunition menu | Ammunition menus need an in-game look (2.1.1.0 limit) | 2.1.2.0 |
| Mk 1 Mod 0 | Mk 1 Mod 0 | Live or not | Records present, not on the site | 2.1.2.0 |
| Interdictor Precision | Interdictor | Precision on the loadout panel, default loadout | Asked on every new build (guide Stage 6, "Index bounds and fallback rows"): the site shows 100, the panel read 1 through 2.1.1.0 (bug entry 22); its 2.1.2.0 Precision table equals the site's | 2.1.2.0 |
| KTS100 MK8 50 Rnd handling | KTS100 MK8 | Loadout panel, 50 Rnd against the default 60 Rnd: ADS, draw, sprint recovery, ADS movement, moving-ADS accuracy | Bug entry 10: the 50 Rnd lost its reload bonus and gained moving-ADS dispersion +1; whether "improved handling" is still wrong | 2.1.2.0 |
| Slim Angled text on SMGs | PW7A2 (or SGX, PP-19, RSPR, CZ3A1) | Slim Angled description in the attachment menu | Bug entry 3: the files link these five to a text without the draw-speed claim; only SCW-10, PW5A3, UMG-40 and KV9 link the draw claim | 2.1.2.0 |
