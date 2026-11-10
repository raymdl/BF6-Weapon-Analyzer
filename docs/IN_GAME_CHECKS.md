# In-game checks for the operator

The single running list of things only an in-game look can settle. Every update stage, worker
and doc adds its items here, not to a checklist's Outcome, `STALE_SITE_DATA.md` or chat
([GAME_UPDATE_GUIDE.md](GAME_UPDATE_GUIDE.md) points here). An item is added only when it passes the guide's "When an in-game check is allowed" (Stage 8):
the answer would change a site value, and a worker has tried the files and existing captures
and named the missing link.

When the operator reports a result, record it as one line in the update's results file
(guide, "Recording in-game confirmations"), apply what it settles, and remove the item here
in the same commit.

| Check | Weapon(s) | What to read | Why, and what was tried | Added |
|---|---|---|---|---|
| Buckshot head and limb damage | Any one of DB-12, 18.5KS-K, M1014, M87A1 | One point-blank Buckshot shell each into head, chest and leg of a firing-range target: the three damage numbers | The site holds head 1.0 / limb 1.0, carried over from the old bullet material. Buckshot moved to material 280 in 2.1.1.0, which has no head or limb row in the grid; it is the only bullet material without one, so no other ammunition can serve as a control and no fallback rule is stored. Three equal numbers confirm 1.0 / 1.0 | 2.1.1.0 |
| Name of the M44's 8x scope | M44 | The scope names in the M44 sight list: is there an "S-VPS 6.00x", an "NFX 8.00x", or both | The new sight record on the M44 is the NX8-4, named "NFX 8.00x" on 16 other weapons, but the M44's own name list has only "S-VPS 6.00x". No stored link joins a record to a name, so the files cannot say which name the menu shows | 2.1.2.0 |
| M357 Trait ammunition menu | M357 Trait | The ammunition choices listed | The equipment list gives FMJ, Frangible, Hollow Point and Tungsten Core; the site lists Standard and Hollow Point. It is the one weapon of 68 where the list and the site disagree, and no record says where the site's menu came from | 2.1.2.0 |
| SOR-300SC sight list | SOR-300SC | Whether "Mars-F LPVO 1-5x" and "MC-CO LPVO 1-6x" are in the sight list | The site offers both; neither record is in the weapon's equipment list in 2.1.1.0 or 2.1.2.0, though both have a branch and a false kill switch. One of two places where the availability check and the site disagree (`scripts/frosty-availability.py`, rows AV-0006 and AV-0007) | 2.1.2.0 |
