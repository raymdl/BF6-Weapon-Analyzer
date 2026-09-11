# Frosty draw-time model

The runtime uses the full Frosty sprint, deploy and undeploy arrays and raw
per-weapon base indices. This replaces the derived shared coordinate and its
`+5/+7/+8/+9` offsets. The user confirmed that the timing endpoints are absolute
limits: further tier changes beyond the limits have no effect.

## Data and calculation

`data/balance_tables.json` stores `DRAW_TIME_TABLES` in source order, slow to fast.
Values retain the exported precision in milliseconds. Only the UI rounds to
whole milliseconds. The raw decimal seconds, field identifiers,
weapon selectors and XML SHA-256 hashes are retained in
[`frosty-draw-time-2026-09-09.json`](../../reference-data/provenance/frosty-draw-time-2026-09-09.json).

Each `WEAPON_MAG` record stores `sprintRecoveryBaseIndex`, `deployBaseIndex` and
`deployTimeTable`. Sprint recovery uses the shared 12-row array. Deploy and
undeploy use the same index in either the 12-row primary array or the 15-row
sidearm array. VZ. 61 selects the primary array. DB-12 has no special offset.
Interdictor has distinct sprint and deploy base indices.

Attachment values retain the catalog convention: negative tier shifts mean
faster timing. For each axis, the effective source index is the base index minus
the sum of applicable attachment shifts. Clamp that final index to the selected
array. Do not clamp individual contributions or infer an index from milliseconds:
the first eight sidearm deploy rows all contain 466.667 ms (467 ms on the panel).

`sprintRecoveryTierShift` and `deployTimeTierShift` are separate operands.
Reviewed Draw effects apply to both. This includes Rail Cover, Speed Holster
and Gunslinger; the old sprint-only ergonomics exception is removed.
VSSM magazine shifts are now source-relative rather than relative to its default
magazine, so the new raw base index does not change its captured sprint values.

`resolveDrawTime` returns all three resolved timings. `applyAttachments` exposes
`_sprintRecoveryMs`, `_deployTimeMs`, `_undeployTimeMs`, `deployT` and `undeployT`.
The latter two use seconds. Existing UI layout is unchanged.

## Verification and evidence limits

The runtime matched all 3,093 comparable sprint-recovery entries in the retained
attachment screenshot audit. This comparison uses the existing attachment
identity mapping, with one independently reviewed correction: KTS100 MK8 image
`50_KTS100 MK8_Magazine_60RND_MAGAZINE.png` selects **60 FAST**, not the regular
60-round magazine. Its 233 ms value matches the fast selector. The canonical
audit was not changed. The known Ribbed Vertical capture identity conflict is
excluded. This is not a new visual review of every screenshot.

The audit contains no deploy or undeploy timing fields. Those outputs are based
on the retained Frosty configuration and confirmed endpoint behavior; screenshot
agreement for sprint recovery does not independently validate them.

Focused tests cover the retained arrays and all 63 base selectors, equipped
magazines, VSSM conversion, Fast Deploy effects, both endpoint clamps, the
sidearm plateau, VZ. 61, independent axes and invalid selectors.
