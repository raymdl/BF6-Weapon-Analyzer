# BF6 Weapon Analyzer — To Do

## Data Gaps (need in-game values)

### Sidearm ADS Move Speed (`defAms`)
All 7 sidearms currently have placeholder `defAms=4`. Need in-game values.


---

## Known Code / Mechanic Gaps

### SL9 Burst Timing
Sym.gg data shows `RoF = 674.999` and `BurstRoF = 771.428`. Frame-by-frame analysis confirms
3-round burst at ~78ms between shots (~771 RPM intra-burst). Currently stored as
`fireMode: "auto"` with `rpm: 675`.

**Action:** Add `burstRounds: 3` and `burstBurstsPerMinute` to the SL9 entry and verify the
burst badge displays correctly.

---

## Validation / Quality

- [ ] Verify assumed attachment stats (`assumed: true`) when datamined data becomes available —
  Linear Compensator, Compensated Brake, Flash Compensator, Long Suppressor, Lightened
  Suppressor, Heavy Barrel, Heavy Extended Barrel
- [ ] Validate recoil decay model against in-game footage for at least one auto weapon

---

## Deferred / Lower Priority

- [ ] Add Playwright visual smoke tests (desktop, tablet, mobile) for main app + preview pages
- [ ] Add provenance metadata (`source`, `sourceDate`) to data files where practical
- [ ] Expand `scripts/validate-data.mjs` coverage if data churn increases (JSON Schema, effect-field checks)
