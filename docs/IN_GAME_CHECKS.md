# In-game checks for the operator

The single running list of things only an in-game look can settle. Every update stage, worker
and doc adds its items here, not to a checklist's Outcome, `KNOWN_SITE_DIFFERENCES.md` or chat
([GAME_UPDATE_GUIDE.md](GAME_UPDATE_GUIDE.md) points here). An item is added only when it passes the guide's "When an in-game check is allowed" (Stage 8):
the answer would change a site value, and a worker has tried the files and existing captures
and named the missing link.

When the operator reports a result, record it as one line in the update's results file
(guide, "Recording in-game confirmations"), apply what it settles, and remove the item here
in the same commit.

| Check | Weapon(s) | What to read | Why, and what was tried | Added |
|---|---|---|---|---|
| Descriptions read from the multiplayer copies | SCW-10, M433, AK-205, M4A1, PW7A2, KV9 | Description text of: SCW-10 Slim Angled (expected: no draw speed claim) and 20 Rnd magazine (expected: "... (ADS) and weapon draw speed."); M433 hip-fire flashlight (expected: "... except those using thermal optics ...") and AK-205 hip-fire flashlight (expected: "Automatically turns on in hip-fire ..."); M4A1 default iron sights (expected: "Modern, basic sights ...") and PW7A2 default iron sights (expected: "Basic aperture sight ..."); KV9 Burst Training (expected: "2-round burst ...") | On 10 Nov 2026 the site's attachment descriptions were regenerated from the multiplayer copies of the name lists and descriptors (103 lines changed). Three of those copies' texts were already seen in game (PW7A2 30 Rnd fast, ST Prisim 5.00x, PA-SL 2.50x); these six spot-check the rest, close bug entry 3, and confirm which of two iron-sight records is the default on the M4A1 and PW7A2 (chosen by file name, as on the M16A4 and UMG-40). A file cannot show which copy the menu reads | 10 Nov 2026 |
