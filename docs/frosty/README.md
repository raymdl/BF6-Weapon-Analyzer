# Frosty game data

What the project knows about the BF6 game data exported with Frosty: how to export it,
what the hashed fields mean, how the assets link to site values, and what is still open.

| Page | Contents |
|---|---|
| [Field map](FIELD_MAP.md) | Every hashed `Field_`/`Class_`/`Struct_` with a known or probable meaning. |
| [Data graph](DATA_GRAPH.md) | How attachments, abilities, selectors, parts, bindings, projectiles, aim and UI assets link. |
| [Weapons](WEAPONS.md) | Damage curves, hit zones, ballistics, collateral, spread and recoil laws, camera recoil, traits. |
| [Attachments](ATTACHMENTS.md) | Composition rules, generated site values, lights, sway, optic categories, render FOV and zoom. |
| [UI text](UI_TEXT.md) | Strings table, weapon and attachment names, labels, descriptions, site tooltip mapping. |
| [Tools](TOOLS.md) | FrostyCmd, safety rules, SDK and decoder, export coverage, per-build collection, generators. |
| [Open questions](OPEN_QUESTIONS.md) | Everything still unresolved, with the suggested test. |

## Where to record new work

Do not create a new document for each investigation. In the same session:

| What you found | Where it goes |
|---|---|
| A field or class meaning | A row in the [field map](FIELD_MAP.md), with its confidence |
| A link between assets | [Data graph](DATA_GRAPH.md) |
| A result about weapons, attachments or UI text | The matching topic page, edited in place |
| A tool, command or safety rule | [Tools](TOOLS.md) |
| An unanswered question | A row in [open questions](OPEN_QUESTIONS.md); delete it when answered |
| A conclusion about one asset | `reference-data/frosty/asset-findings.json` (append; do not delete old findings) |
| The values and hashes behind a result | A new dated JSON file in `reference-data/provenance/` (never edit it later) |
| A game data error | [Attachment bugs](../ATTACHMENT_BUGS.md) |

Use `docs/working/` only for work that spans several sessions, and archive the file when
the work is done. Topic pages are not dated; state the build or date next to a result
when it matters.

## Related

- [Game update guide](../GAME_UPDATE_GUIDE.md): the step order after a game update.
- [Data sources](../DATA_SOURCES.md): how Frosty data becomes site data.
- [Attachment bugs](../ATTACHMENT_BUGS.md): game data errors found with Frosty.
- [`reference-data/frosty/`](../../reference-data/frosty/README.md): asset watchlist and
  per-asset findings (JSON).
- [`reference-data/provenance/`](../../reference-data/provenance/README.md): dated
  evidence reports.
- [Archive](../archive/README.md): the dated investigation records these pages replace.
