# Frosty documentation consolidation

Started 16 September 2026. Operator approved `docs/frosty/` and a staged cleanup;
the operator reviews at the end. Completed 16 September 2026; archived.

## Target

- `docs/frosty/`: durable topic pages, edited in place, not dated.
- `reference-data/frosty/`: JSON data (watchlist, findings) and a short README.
- `reference-data/provenance/`: dated evidence, not edited.
- `docs/working/`: open investigations only; `docs/archive/`: completed records.

## Stages

| Stage | Work | Status |
|---|---|---|
| 1 | `FIELD_MAP.md` and `TOOLS.md`; split from `reference-data/frosty/README.md` | done |
| 2 | `DATA_GRAPH.md`, `WEAPONS.md`, `ATTACHMENTS.md`, `UI_TEXT.md` | done |
| 3 | `OPEN_QUESTIONS.md`; archive the merged working files | done |
| 4 | Links, tool references, indexes, final checks | done |

## Decisions

- Keep `docs/GAME_UPDATE_GUIDE.md` as the update procedure; `TOOLS.md` holds tool use.
- Keep archive bodies unchanged except link targets.
- Watchlist evidence entries keep their `sha256AtSeed`; only paths change.
