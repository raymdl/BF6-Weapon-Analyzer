# Frosty Audit Ledger Tool Review

Review date: 2026-09-23

Scope: correctness review of `scripts/frosty-audit-coverage.py`, its read-only ledger state, and three representative raw EBX assets. This review does not certify a complete multiplayer asset audit.

## Findings

- **Closure must expose imports with no catalog target.** In the ledger snapshot inspected, 106 import rows (65 distinct target file GUIDs) did not join to `assets.file_guid`. The recursive `reachable` CTE joins imports through `assets`, so these edges disappear from traversal. They may be legitimate non-catalog targets, but the ledger does not classify them or count them as unresolved. Add an unresolved-import inventory/count (including source route, target file GUID, and object GUID) before treating dependency reachability as closed. No claim is made here that those targets are active gameplay assets.
- **Scope and decode states remain appropriately conservative.** The script retains every catalog asset, seeds a namespace as candidates, and widens scope from parsed imports. Its policy text explicitly says candidates are not multiplayer activation proof, and the `semanticReview` count remains independently pending. This supports an audit workflow but cannot, on its own, prove MP inclusion or justify cosmetic/SP-only/BR-only exclusions. Such dispositions still need evidence per asset or a documented evidence rule.
- **`$badString` needed to count as a decode warning.** The script now includes this marker in the warning-key list. At the earlier ledger snapshot checked, zero decoded bodies contained it. Other decoder markers (`$unknownType`, `$undecoded`, unresolved references/arrays, bad counts, boxed-value references, and ambiguous layouts) were already treated conservatively as provisional.
- **Reproducibility identity is recorded at initialization, but not enforced for the script itself.** `scriptAtInitSha256` is saved, while resume checks enforce catalog and decoder hashes only. If the audit script changes during a resumed run, metadata will still describe the initialization version. Record and validate a run/script identity or preserve a per-run code hash in the ledger before relying on it as a reproducible execution record.

## Representative identity checks

Read-only checks compared the raw EBX header, catalog GUID, corresponding XML `<File Guid>`, descriptor identity, and ledger rows:

- `Common/Hardware/Weapons/AssaultRifle/G36/AAM_G36`: raw/catalog/XML file GUIDs matched; raw hash matched the ledger; all 98 header import `(file GUID, object GUID)` pairs matched the ledger imports.
- `Common/Hardware/Weapons/AssaultRifle/G36/Attachment_G36_BRL_BasicBarrel`: identities and raw hash matched; both header imports matched ledger records and the XML references to the barrel program object (`e9e30cf5-0bfe-4767-81e2-900cb51f9cab`) and barrel category object (`9c0ba746-e08b-4fe8-8dad-ed7c63fdcc8c`).
- `Common/Hardware/Weapons/SimEx_SharedSoldierAbilityWeapon`: identities and raw hash matched; all 10 header imports matched ledger rows. Its five imports into `Common/GameSetup/GameConfigurations/DefaultCategorizationTags` referenced object GUIDs present in that target’s decoded object records.

These checks confirm identity and edge extraction for the selected assets only. They do not validate every asset, every decoded field layout, target semantics, or multiplayer activation.
