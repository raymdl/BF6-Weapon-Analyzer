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

Research status: [active source leads, proposals and parked questions](../working/FROSTY_RESEARCH_QUEUE.md).

## What is already known, and where

Check these before starting new tracing. `python scripts/frosty-worker.py prior-work --terms <names>`
searches all of the Markdown and JSON layers below except the external ledger.

| Question | Where the answer lives |
|---|---|
| Is this site value sourced, and from what? | The site-input ledger: every `data/*.json` leaf and `sim/*.js` input with a review status and evidence receipt ([summary receipt](../../reference-data/provenance/frosty-site-input-review-final-v2-2026-09-23.json); rows in the external `site-input-reviewed.jsonl`). It is a 23 September snapshot; later data changes are in dated receipts. |
| Has this asset been traced, for what question, and with what result? | [`asset-findings.json`](../../reference-data/frosty/asset-findings.json) (per-asset question, result and conclusion). |
| What does this hashed field mean? | [Field map](FIELD_MAP.md). |
| How does this mechanic work, and what does the site do with it? | The topic pages above. |
| What exactly was measured, from which bytes? | Dated receipts in `reference-data/provenance/` ([index](../../reference-data/provenance/README.md)). |
| Is it being worked on, proposed, or waiting on the operator? | The [research queue](../working/FROSTY_RESEARCH_QUEUE.md); closed leads and past runs are in [FROSTY_QUEUE_CLOSED.md](../archive/FROSTY_QUEUE_CLOSED.md). |
| Was it captured or decoded at all? | The coverage ledger (`coverage-decoder-v5.sqlite`, see [Tools](TOOLS.md)). Capture and decoding are not semantic review. |

A lead is not closed until its topic page, receipt, `asset-findings.json` entries and queue
row are updated.
Capture work: [ranked in-game capture plan](../working/BF6_CAPTURE_PRIORITIES.md).

The current audit starts from every `data/*.json` entry and `sim/*.js` input or
equation across all 63 site weapons. The queue links the current per-input review
and its remaining work. Topic pages explain findings; compact JSON receipts in
`reference-data/provenance/` pin field paths, builds and hashes. Large comparison
tables and raw evidence stay in the external Datamining reports directory.
The catalog coverage below is supporting context, not the completion condition.

## Exhaustive audit coverage

The 23 September pass audits multiplayer source assets, starting with weapons and
attachments. Cosmetics and content proven exclusive to single player or battle
royale are excluded. Shared or ambiguous records remain candidates. Capture,
decoding, field interpretation and runtime proof are separate states.

The [catalog census](../../reference-data/provenance/frosty-audit-namespace-2026-09-23.json)
contains 467,208 entries, including 49,285 under `Common/Hardware/Weapons`.
All entries in that primary namespace now have raw captures. Related definitions,
equipment, launchers, presentation and UI records also occur outside it. Neither
an `Art` directory nor an `SP` substring proves an exclusion. Positive cosmetic
assignment can exclude a purely cosmetic branch; it does not exclude independent
functional targets shared with that branch.
Once a pure cosmetic role is established, its model, material, physics and animation
branch is excluded. Possible visual differences do not reopen that branch. Retain
independently functional weapon, compatibility, ammunition, modifier or optic nodes.

The first [validated cosmetic dispositions](../../reference-data/provenance/frosty-audit-cosmetic-validation-2026-09-23.json)
exclude 3,643 charm, camo and decal records. Another 122 records in those families
remain unresolved. All 3,765 raw bodies and 923 exact assignment roots were checked;
slot tags match the named Charm, Camo_SPO or Sticker definition records. Typed
same-key cosmetic members inherit that role. This does not exclude independent
functional consumers or classify every weapon skin. Detailed reasons stay in the
ledger and the reviewed per-asset report.

The [skin validation](../../reference-data/provenance/frosty-audit-skin-validation-2026-09-23.json)
adds 16,103 supported exclusions, bringing the cosmetic total to 19,746. It checks
raw identities, exact model assignments and named camo slots. Unresolved wrapper
roles remain candidates.

The [prior coverage review](../../reference-data/provenance/frosty-audit-prior-coverage-2026-09-23.json)
separates previous field-specific passes from complete asset review. Its initial
capture census had 23,975 unique routes across three raw trees, with no overlap.
The [root census](../../reference-data/provenance/frosty-audit-roster-2026-09-23.json)
identifies 64 GS/WB/primary-ability triples. KSG is the additional candidate outside
the site's 63 identities. The later [package review](../../reference-data/provenance/frosty-audit-ksg-scope-validation-2026-09-23.json)
excludes 19 exact KSG records with sole campaign package assignments, including its
three primary roots. Shared KSG-folder content remains in scope. The root census
and package membership do not prove live multiplayer availability.

The [full GS/WB field inventory](../../reference-data/provenance/frosty-audit-fields-2026-09-23.json)
and [raw registry associations](../../reference-data/provenance/frosty-audit-registry-bindings-2026-09-23.json)
now cover those roots. Ability branches, non-site attachments, scope exclusions,
resource bodies and unresolved references still require review. The external audit
ledger preserves every catalog row and source variant. No whole-asset completion
is inferred from a successful export or a named field. Use the maintained queue
for current counts and the next exact work items.

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

- [Weapon Attributes model](../WEAPON_ATTRIBUTES_MODEL.md): four-bar calculations, current evidence and site-card mapping.

- [Game update guide](../GAME_UPDATE_GUIDE.md): the step order after a game update.
- [Data sources](../DATA_SOURCES.md): how Frosty data becomes site data.
- [Attachment bugs](../ATTACHMENT_BUGS.md): game data errors found with Frosty.
- [`reference-data/frosty/`](../../reference-data/frosty/README.md): asset watchlist and
  per-asset findings (JSON).
- [`reference-data/provenance/`](../../reference-data/provenance/README.md): dated
  evidence reports.
- [Archive](../archive/README.md): the dated investigation records these pages replace.
