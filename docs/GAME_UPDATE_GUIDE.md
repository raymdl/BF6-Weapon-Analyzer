# Game update guide

What to do when Battlefield 6 updates: capture the new build, find everything that changed in
the files, decode it correctly, and carry the result into the Analyzer. The work list is what
changed in the files; the patch notes are a watchlist read against it.

Frosty research tooling lives in the
[BF6-Frosty-Research](https://github.com/raymdl/BF6-Frosty-Research) repo (since 29 September
2026). Commands for `scripts/frosty-*.py` and the other research scripts run from a checkout of
that repo beside this one. Tool commands are in
[Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md),
field meanings in the
[field map](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/FIELD_MAP.md),
and the asset watchlist and per-asset findings in
[`reference-data/frosty/`](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/frosty/README.md).

Each update has a checklist in the research repo, `docs/updates/<version>-checklist.md`
(Stage 0): read the [2.1.2.0](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/updates/2.1.2.0-checklist.md)
and [2.1.1.0](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/updates/2.1.1.0-checklist.md)
checklists, and the 1.4.3.0
[plan](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/archive/FROSTY_1.4.3.0_UPDATE_PLAN.md),
for the paths, counts and decisions of those updates. They are records, not the procedure
(the 2.1.2.0 checklist predates the files-first rule: its rows start from the notes).
Claude's `bf6-game-update-check` skill runs this guide; the guide wins where they differ.

---

## Running unattended

One message starts the whole run, for example "Run the game update process for 2.1.3.0".
The session works out where it is (before the update: Stage 0; `guard` fails on a new
`bf6.exe`: Stage 1 onward) and carries on through every stage to the final report without
asking between steps.

- **Choices.** When the guide leaves a choice, take the low-risk option, write the choice and
  the reason in the checklist's "Decisions made during the run" section, and continue.
- **The only things that stop the run** (a closed list):
  1. pushing any repository;
  2. deleting anything outside the update's run folder (renaming the Frosty cache is fine;
     its deletion is offered in the report);
  3. a commit to any repository other than the Analyzer and the research repo (the KDM
     catalogue, Stage 9, new weapon step 11: its `main` is a production deploy);
  4. a `guard` failure, or a hotfix-or-new-build result, that Stage 1 does not cover;
  5. anything that needs the operator in the game: in-game checks, or closing the game
     before a capture.

  Only a hard blocker (the game running when a capture is needed; a Frosty run that fails in
  a way the guide does not explain) halts the run. Everything else on the list is **held**:
  the run continues with all work that does not depend on it and puts the item in the report.
- **One list at the end.** In-game checks go on [IN_GAME_CHECKS.md](IN_GAME_CHECKS.md); held
  decisions go in the checklist's "Held for the operator" section. Never ask mid-run.
- **The final report** is the one place the operator is asked anything: what changed on the
  site, the held items, the in-game checks, every test removed, updated or skipped (Stage 9,
  step 4), the cache file that can be deleted, and the commits ready to squash and push.
- **Permissions.** The 2.1.2.0 run (10 November 2026) ran in auto mode with no tool call
  that needed approval; the one denial in recent sessions was an unrequested `git push`,
  which item 1 stops anyway. If a prompt does appear, note the command in the report so the
  operator can allowlist it. Start the session with the site repo, the research repo and the
  datamining folder as session folders; otherwise edits in them need patch scripts.

## Ground rules

- **Builds.** Each data build lives in `BF6 Datamining\builds\<build>\` (`xml\`, `capture\`,
  `reports\`) with `BUILD.json` (identity, client versions, state) and `MANIFEST.tsv` (size
  and SHA-256 of every file), managed by `scripts/frosty-build.py`
  ([Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md#build-snapshots)).
  Write evidence only to the open build (`capture\` for baselines, `reports\` for checks) and
  run `record` after each export.
- **Captures.** Run every raw capture through `scripts/frosty-capture.py`, never the
  collector `frosty-collect-raw.ps1` by hand: it enforces one Frosty process at a time, runs
  `guard` and `record`, and fails loudly. Pass `--build <open build>` (its default is a sealed
  build).
- **One FrostyCmd at a time.** Do not parallelise exports. Before any Frosty step outside
  `frosty-capture.py`, check `Get-Process FrostyCmd`; after a failed or slow export, stop it.
  Batch, don't loop: `export-ebx-list` loads the cache once, while per-asset `export-ebx`
  costs about 14 s each, almost all cache load.
- **Material grids.** Never `export-ebx`, `export-ebx-list` or Editor-export a level
  `materialgrid_win32`: one has reached 49–52 GB and crashed the machine. Take them out of
  every routes file and read them only with `scripts/frosty-material-grid-inventory.py` (the
  bounded reader).
- **Updates arrive without notice.** The EA app installs updates and hotfixes automatically
  (the 16 September 2026 hotfix was found only because the executable hash changed). Start
  every Frosty session with `guard`, not only exports.
- **Generators.** Several `scripts/frosty-*.py` write into Analyzer data or provenance by
  default: pass explicit output paths. `frosty-attachment-tooltips.py` also writes pointers
  back into the `--mapping-json` file it is given; dated evidence files are immutable and
  referenced by hash, so copy the previous dated file to a new date and pass the copy. Check
  `git status` after any generator run.
- **Shell and files.** Here-documents with quotes fail in the Windows shells used here: write
  a script or message file and pass its path, and read `$LASTEXITCODE` for pass or fail. The
  site's data files use Windows line endings and `json.dumps(indent=2, ensure_ascii=False)`
  (`weapon_attributes.json` is compact); preserve both when a script rewrites a file.
  Decoding every held file in one process used over 5 GB: to find references to a GUID,
  search the raw bytes (little-endian GUID) and decode only the hits.
- **Names.** Use in-game names in every report to the operator; give the internal name only
  where the file name itself matters (Stage 7, "In-game names").

## Build snapshots

| State | Meaning | Rule |
|---|---|---|
| `open` | The installed data build | New exports may add files. Existing files must not change (`reports\` may). Run `guard` before each export and `record` after it. |
| `sealed` | No longer installed | Read-only. Compare new builds against it; never write to it (`guard` stops exports into it). NTFS compression after sealing is allowed (file bytes do not change). |

A build stays open while it is installed, so later investigations can add new Frosty paths.
It is sealed when the game updates, before the first export from the new client. A client
hotfix is not always a new data build: Stage 1, step 6 decides. (The 16 September 2026 hotfix
of 1.4.3.0 changed 2 of 467,208 catalog assets, a store UI button group and
`Systems/Gameplay/DataVersion`; a raw capture on 29 September confirmed only `DataVersion`
differed of 23,554 watched routes.)

```bash
python scripts/frosty-build.py --datamining "<datamining>" guard <open build> --game "<game>"   # before
python scripts/frosty-build.py --datamining "<datamining>" record <open build>                  # after
```

## Stage 0 — While a build is installed

The only irreversible part: once the game files update, an unexported asset of the old build
is gone.

1. **Baseline capture.** Capture the full catalog and the raw EBX for every watched route,
   and point the client's `preUpdateCapture` entry in `BUILD.json` at it:

   ```bash
   python scripts/frosty-capture.py pre-update-<client>-<date> --into capture/pre-update-<client>-<date>/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes-gameplay-shape-<date>.txt"
   ```

   The route list is derived from the catalog by path shape, not grown by hand (L4059): every
   route under `Common/Hardware` (weapons with `_Bullets`, `_WeaponModifiers`, `_Attachments`
   and the shared folders, gadgets, vehicles with their weapons and projectiles, and the
   `Common`, `Camera`, `World` and `AttributeDelegates` folders; not `_CosmeticsLibrary` or
   `CineProps`), all of `Common/Gameplay`, `Common/GameSetup/Tweakables`, every `GRX_*`,
   `KST_*`, `MUT_*` and `MutatorDatabase*` file, UI metadata (`Common/UI/Static/Metadata`,
   `Common/UI/MetaData`), the material-grid curve data (`Globals/Materials/MaterialGrid`), the
   expression-graph source assets, and the previous list's routes still in the catalog.
   Cosmetic trees are left out (`/Art/Skins/`, `_Textures/Decals/`, `_Charms/`, `U_MDV_*`
   skins, sound). Rebuild the list from the rebuilt-cache catalog when a build is opened.
   Level `materialgrid_win32` routes come out of the file (Ground rules).

   If the capture used a loaded cache, routes that only a rebuilt cache lists fail as "not in
   catalog" (243 on 9 November 2026): rename the cache and capture those into
   `collection-fresh-cache` with its catalog.
2. **Graph bodies.** Capture the compiled expression-graph bodies, which are resources, not
   EBX routes:

   ```bash
   python scripts/frosty-capture.py pre-update-<client>-<date>-graph-bodies --into capture/pre-update-<client>-<date>/graph-bodies --resource-ids-file "<datamining>/builds/<build>/capture/expression-graph-resource-ids.txt"
   ```

   The IDs file holds one 16-digit resource ID per line, read from the open build's graph
   sources (`Field_aa4fa860.$resourceRef`; L4019, L4057). A re-baked body gets a new ID, so
   derive the file again from the new build's decoded sources before capturing its bodies.
   Without the bodies a graph change shows only as a changed source record.
3. **Toolchain and strings.** Keep `Profiles/BF6SDK.dll`, `FrostySdk.dll`,
   **`SharedTypeDescriptors.ebx`**, `FrostyCmd.exe` and the collector script in the open
   build's `capture\toolchain\`: Frosty rewrites the runtime descriptor file when it first
   loads a new game version, so after an update the old one can no longer be copied.
   `BUILD.json` lists the descriptor file for each client. Export strings (`fs_us_loc`).
   Record the executable hash and version, the Frosty archive Head and the SDK version in
   `BUILD.json`.
4. **Keep the lists.** Reusing the route list and the IDs file on the next build is what makes
   raw hashes directly comparable. When a hotfix client is added to the open build, capture
   the watched routes again on that client; otherwise the next comparison mixes two updates.
5. **Checklist.** Write `docs/updates/<version>-checklist.md` in the research repo and add it
   to that folder's README index:
   - identity and baseline paths, and decisions made for this update;
   - a run-order table with a tick column and one row for every stage, 0 to 9 (Stage 9 one
     row per step), with that update's paths; a stage that does not apply says why;
   - the patch-note watchlist (brief A: one line per note item with the asset home it points
     at) and, the day before, the located "from" values (brief B). These locate fields; they
     do not define the rows;
   - empty sections for change rows (Stage 7), "announced, nothing stored", "Decisions made
     during the run", "Held for the operator" and the outcome.

   Change rows are created in Stage 7 from the scripted change lists. Each has: the change
   (in-game names), the change-list rows it covers, file and field, "from", "to", the
   patch-note line it carries (a label, or blank), **result** (what the files hold) and
   **site** (applied, not applicable, or not applied with the reason). "Confirmed" in the
   result column does not mean the site has the change; every applied row gets checks in
   `<version>-site-checks.json` (Stage 9, step 7). Working files stay in the run folders.
6. **Stale site data.** Read [STALE_SITE_DATA.md](STALE_SITE_DATA.md): site values already
   known to differ from the files are not changes in this update; list any the notes touch so
   the update can close them.
7. `record` and `verify` the open build.

**Gate:** baseline and graph bodies captured; failures only routes absent from the catalog
(compare with the last capture's); a sample of raw files re-hashed against
`raw-status.jsonl`; `verify` clean.

## Stage 1 — Identify the new build

Start here when `guard` stops because the installed `bf6.exe` is not a recorded client. The
game must be closed for steps 3 to 5.

1. **Executable identity.**

   ```bash
   powershell -c "$e='C:\Program Files\EA Games\Battlefield 6\bf6.exe'; (Get-Item $e).VersionInfo.FileVersion; (Get-FileHash $e -Algorithm SHA256).Hash"
   ```

   **Do not order builds by the file-version string** (in 1.4.3.0 it went down,
   `1, 0, 439, 36273` to `1, 0, 437, 12728`). Use the hash for identity and the Frosty archive
   Head for ordering.
2. **Fresh cache.** Rename `Caches\bf6.cache` (to `bf6-<previous client>.cache`) so Frosty
   builds a full cache. The cache is disposable (a rebuild plus the capture takes about 10
   minutes); offer its deletion in the final report.
3. **Capture the new client.** Frosty's first load of the new client also rewrites the
   runtime `SharedTypeDescriptors.ebx`. `--update-check` skips `guard` (it fails on the new
   client by design) and `record` (it follows the decision):

   ```bash
   python scripts/frosty-capture.py <client>-check-<date> --build <open build> --into reports/<client>-check-<date>/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes.txt" --update-check
   ```
4. **Compare the type layouts.**

   ```bash
   python scripts/frosty-build.py --datamining "<datamining>" client-check <open build> --game "<game>" --runtime "<runtime>"
   ```

   `BF6SDK.dll` and `SharedTypeDescriptors.ebx` are independent: the SDK is a local artefact,
   the descriptors ship with the game. **A descriptor change with an unchanged SDK is the
   normal case, and it breaks Frosty's decoding** (Stage 4). A changed file with identical
   layouts only reorders type entries.
5. **Compare the catalog and the raw watched routes** with the baseline:

   ```bash
   python scripts/frosty-capture-compare.py <baseline collection> <new collection> <check folder>/comparison.json --baseline-catalog <baseline rebuilt-cache collection>
   ```

   It compares paths, GUIDs, sizes and record hashes of the two catalogs and the raw SHA-256
   of each watched route, and re-hashes every compared file on disk on both sides. Compare a
   rebuilt-cache catalog only with a rebuilt-cache catalog: a loaded cache lists fewer assets
   (1,014 false "added" on client `1.0.443.60769`), so pass `--baseline-catalog` when the
   baseline raw came from a loaded cache. It exits 1 when coverage is incomplete (baseline
   routes missing, new failures, a file not matching its recorded hash); explain each before
   deciding. Record both results in the client entry (`catalogCheck`, `rawCheck`).

   Then the watched mutator values and the hotfix check (research repo, L4059), on every
   `guard` failure:

   ```bash
   python scripts/frosty-mutator-values.py <baseline collection> <new collection> --descriptors <baseline descriptors> <runtime SharedTypeDescriptors.ebx>
   python scripts/frosty-hotfix-check.py <baseline collection> <new collection> --out-dir <check folder>/hotfix-check --old-descriptors <baseline descriptors> --new-descriptors <runtime SharedTypeDescriptors.ebx> [--old-extra <capture folder>]... [--new-extra <capture folder>]... [--old-catalog <baseline rebuilt-cache collection>]
   ```

   The first prints default / min / max of the watched `MutatorDatabase_CH1` settings (the
   XP caps added in 2.1.1.0: `WeaponXpCap`, `VehicleXpCap`, `ClassXpCap`, `CareerXpCap`,
   `BattlepassXpCap`, all 300, and `Xp Cap Interval In Seconds`, 60; shipped defaults that
   servers can override). Save it as `<check folder>\watched-values.md` and report any change;
   to watch another mutator, add it to `WATCHED`. The hotfix check runs the registry diff over
   every registry (`GRX_*` including `GRX_Weapons`, `GRX_Vehicles`, `GRX_Gadgets_Glacier`,
   `GRX_Glacier_Soldier`; `KST_*`, `MUT_*`, `MutatorDatabase_*`), the watched mutators, and a
   catalog record diff of the route list's gameplay paths. Pass registries outside the main
   collection as `--old-extra` / `--new-extra` and a rebuilt-cache baseline catalog as
   `--old-catalog` (a loaded-cache one shows 243 false gameplay additions). Exit 0: nothing
   gameplay changed; 1: a registry row, watched mutator or gameplay path changed (listed);
   2: nothing changed but coverage is incomplete. Save the output as
   `<check folder>\hotfix-check.txt`.
6. **Decide.**
   - **Hotfix** (identical layouts; no added or removed assets; no gameplay-relevant change in
     the catalog or raw hashes; the hotfix check exits 0, or every path and row it lists is
     explained in the client entry as `hotfixCheck`): copy the runtime descriptors into the
     open build's `capture\toolchain\` under a dated name, add the entry `client-check`
     printed to `BUILD.json` `clients` with a `label`, `labelSource`, `catalogCheck`,
     `rawCheck` and `hotfixCheck`, then `record` and `verify`. Changes only in UI or store
     assets and `Systems/Gameplay/DataVersion` are the known non-gameplay pattern. Receipts at
     the previous Head carry forward. Run Stage 8 if the hotfix's notes list fixes; the run
     then ends with the report.
   - **New build** (layouts differ, or assets were added, removed or changed in gameplay
     data): `record <old build>` (it adds the step 3 capture), `seal <old build>`, compress it
     with `compact /c /s:"builds\<old build>" /exe:lzx /i /q` (bytes, read-only flags and
     manifest hashes are kept; 1.4.2.5 went from 2.85 GB to 0.71 GB), and `verify <old build>`.
     Create `builds\<new build>\` with a `BUILD.json` like this, copy the runtime descriptors
     into `capture\toolchain\`, and `record <new build>`:

     ```json
     {
       "build": "<label>",
       "label": "Update <label>",
       "state": "open",
       "labelSource": "User supplied; not embedded in the game files.",
       "clients": [{
         "label": "<label>",
         "exeSha256": "<bf6.exe SHA-256>",
         "exeFileVersion": "<file version>",
         "descriptorsFile": "capture/toolchain/SharedTypeDescriptors.ebx",
         "descriptorsSha256": "<SHA-256>",
         "frostyArchiveHead": 0,
         "sdkVersion": 0
       }]
     }
     ```

     For a new build, list which cited raw assets changed: a receipt at the previous build
     does not carry forward.
   - A result that fits neither is held (Running unattended, item 4).

**Gate:** client identity, layout result, comparison counts, watched values and hotfix-check
result recorded; the decision recorded in `BUILD.json`; `guard` passes on the build in use.

## Stage 2 — Capture the new build

Start from the previous build's newest route list (`capture\raw-routes*.txt`) and extend it
before the run. A reused list cannot name files that did not exist before (in 2.1.1.0 that
cost three extra Frosty runs). Add, from the Stage 1 comparison:

- every catalog-added route under `Common/Hardware/Weapons/` and
  `Common/UI/Static/Metadata/Attachments/` (new weapon folders, `AAM_*` maps, `AD_*`
  descriptors), and added gameplay routes under `Common/Hardware/` and `Common/Gameplay/`;
- the season's name metadata `Common/UI/Static/Metadata/S<n>/UI*MetaData*`;
- the availability tables: `Common/GameSetup/Tweakables/Killswitches/KST_*`,
  `GameConfigurations/CT_GLA_*` unlock tables, new `GRX_*` and `MUT_*` tweakables;
- every changed route the old list does not cover.

A watchlist filter cannot find added assets: a new asset is on no list. Scan additions by path
shape (`Attachment_`, `U_PRG_`, `WPM_`, `PD_`, `GS_`, `_WB`) as well; in 1.4.3.0 that found 12
assets carrying all of the update's new content.

Write the extended list as the new build's `capture\raw-routes.txt` and capture:

```bash
python scripts/frosty-capture.py collection --build <build> --into capture/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes.txt"
```

Then:

1. **Descriptors.** For each new weapon, read its `AAM_<weapon>` map and list every `AD_*`
   descriptor its records point to that the build does not hold. Shared descriptors under
   `Attachments/Shared/` are often older files, so not "catalog-added". Capture the missing
   ones (`frosty-capture.py <topic>-<date> --build <build> --routes-file <list>`, on a
   rebuilt cache). Without them the weapon's barrels, magazines, iron sights and own muzzles
   have no tooltip or label. Read labels only from captured descriptors; a string-table text
   match is not a link, so record such a choice as "not found".
2. **Follow-up route file.** After any follow-up capture, write `capture\raw-routes-<date>.txt`
   holding `raw-routes.txt` plus every route captured since, and name it in the `BUILD.json`
   notes as the list for the next update. Files under `capture\` never change, so do not edit
   `raw-routes.txt`.
3. **Strings and catalog files.** Export strings. Write the text catalog files:

   ```bash
   python scripts/frosty-catalog-files.py builds/<build>/capture/collection/asset-catalog.json builds/<build>/capture/catalog
   ```

   No XML export is needed: the generators read the raw capture
   ([raw mode](../MAINTENANCE.md#raw-mode)). XML-export a subset into `builds/<build>/xml/`
   only to read an asset by eye ([Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md#frostycmd)).
4. **Graph bodies** of the new build, from its own IDs file (Stage 0, step 2).
5. `record` and `verify`. Write comparison results (diffs, overlays, reviews) into the new
   build's `reports\` or `capture\`, never into the sealed build.

**Gate:** raw failures only for assets the catalog says were removed (any other failure is a
real problem); missing descriptors captured; next-update route file named; `verify` clean.

## Stage 3 — Decide what actually changed

| Signal | What it proves | Trap |
|---|---|---|
| Recomputed raw SHA-256 (Stage 1 comparison) | The extracted bytes differ | The strongest content signal; use this one |
| Catalog `sha1` diff | Frosty's recorded asset hash moved | **Not sufficient**: in 1.4.3.0, 142 assets kept their record SHA-1 with changed raw bytes |
| FrostyEditor patch summary (optional) | Which records the patch touched | Includes records whose content is identical |

Also compare catalogs for additions and removals, and treat a stable GUID with a changed path
as a **rename candidate**, never as proof of identical content. Where two signals are taken,
cross-check them: agreement (in 1.4.3.0 the patch summary's net count matched the catalog's
exactly) is what licenses trusting either.

**Gate:** the changed-route list by area, from raw SHA-256, with additions and removals.

## Stage 4 — Decode from the build's own descriptors

Decode with `scripts/frosty-ebx-decode.py`, which takes every class size, alignment, field
offset and field type from the build's own `SharedTypeDescriptors.ebx` and never touches the
SDK, so it cannot read a changed type with stale offsets:

```bash
python scripts/frosty-ebx-decode.py --descriptors builds/<build>/capture/toolchain/SharedTypeDescriptors.ebx --root builds/<build>/capture/collection/raw --ebx-list <file of .ebx paths> --out <out.json>
```

Decode **both** builds with **their own** descriptors and diff the JSON; field identity is the
`Field_<hash>` name, so the comparison survives offsets moving. Why not Frosty's XML, a
regenerated SDK or a name-based fallback: see [Appendix: the XML route](#appendix-the-xml-route).

**Overlay roots go stale where Frosty cannot decode.** When building a composite export root
for the generators, layer the new build's fully decoded assets over the previous tree and
record which routes were left behind. Any generator that reads one of those routes needs
`scripts/frosty-ebx-decode.py`, not the overlay.

**Validate the decoder after any change to it.** For value-decoding changes, compare a few
hundred old-build assets against Frosty's XML for the same assets; for warning-only changes,
use focused regression tests and compare decoded values before and after on retained
assets. Expected: most assets identical value for value; some **supersets** (fields the SDK
class lacks, which Frosty discards: correct); a few **disagreements**, only on type names with
more than one layout entry, tagged `$layoutAmbiguous` (with affected nested structs and their
containers). Treat those as provisional: which layout is right per asset is unsettled, and the
same decoder on both builds does not prove unchanged behaviour. Any other disagreement is a
decoder bug: fix it before using the output. Decoder changes are never delegated.

**Gate:** decoder unchanged since its last validation, or re-validated.

## Stage 5 — Diff correctly

1. **Match objects by identity** (GUID and type), resolving local references before
   comparing; keep unresolved identities as a limitation. Line multisets help triage but
   cannot prove semantic equality.
2. **Compare fields and ordered arrays** within each matched object, keeping array indices and
   distance/damage pairs together. "Reordered only" requires identities, values, references
   and array order to agree; exchanging values between objects or entries can change behaviour.
3. **Classify the noise** (about 20% of the 1.4.3.0 change set, none of it gameplay):
   string-id renumbering (`Field_8cf424e7`, `Field_fefe9de1`), FX reference swap
   (`Field_0679f638`), cosmetic list growth (`/Art/Skins/`, `_Textures/Decals/`, `_Charms/`),
   and in the semantic diff list-index shifts and layout fields new or dropped at their
   default.
4. **Keep a control group:** assets that changed in the catalog or patch summary but whose
   content is identical confirm the pipeline invents
   no differences.
5. **A compiled-expression re-bake is not noise.** When `Field_aa4fa860.$resourceRef` (with
   `Field_0c18a620` / `Field_c7ffe639`) changes on a `Class_25c12137` object, the graph body
   was rebuilt: "changed, read the listing". A source can be unchanged apart from these fields
   while its body changes in substance (2.1.1.0: contract graphs gained a game-mode case). An
   unchanged resource id means a byte-identical body. Capture the new bodies (Stage 2), list
   both sides with each build's own `SoldierMotionMachine` variable table (it renumbers), and
   diff the listings (method, classifier and worked example under L4057 in Frosty tools).

**Gate:** graph bodies diffed with a passing control; noise categories re-read for stat
changes.

## Stage 6 — Consistency scans

Diffing finds what changed; these scans find what is wrong, including defects sitting in the
data for builds. Run every scan on every new build, each with the previous build as a control,
and give each a run-order row.

- **Ladder checks.** Families that encode one value per magnification, tier or level: recover
  the intended ladder from the single-purpose members, then check every multi-member asset
  against it. The 34 `GCR_*` camera-recoil assets form a strictly increasing ladder from -0.5
  at 1.00x to 0.762266 at 10.00x; the check found the SU-230 LPVO's 1x state at 10 in 1.4.2.5
  (fixed in 1.4.3.0). Apply the same shape to any other per-tier family before trusting it.
- **Paired-field disagreement.** Where two fields are set together (`Field_7f1bb9d4` /
  `Field_9532eb28` in the camera-recoil blocks), a member where they disagree is a candidate
  defect (this isolated the SU-230).
- **Flag and value mismatch.** Where a value is gated by a flag (`Field_bbbfe9cc` by
  `Field_bbffe8bc`): flag `True` with a value outside the family's band; paired fields with
  different flags; a non-zero value on a `False` flag (inert, but an unfinished edit).
- **Index bounds and fallback rows.** Several stats are a row into a shared table: base row
  plus steps from attachments, magazine and ammunition. For every weapon, add up each offered
  loadout and list every combination outside the table (collateral rows 0 to 9, protection
  0 to 14). Known: ELR-40 Single Shot with Standard (10) and Tungsten (12); the M121 A2
  Tungsten row 10 went in 2.1.2.0 (ATTACHMENT_BUGS entry 20; past the last row the panel shows
  x0.00 while damage holds at the last row). Run it again for every new weapon and every new
  ammunition or magazine step. For tables chosen by keyed
  rows with a fallback row (Precision), list each weapon whose fallback differs from its
  class; the Interdictor's 0.5 against 100 is the known case (entry 22). The site shows 100
  for the Interdictor from its keyed row, which differs from its 1.4.3.0 source; nothing in `sim/` names it. On every new build check
  its Precision table in the raw files. Only when its keyed or fallback row changed, put
  the Interdictor's Precision panel reading on [IN_GAME_CHECKS.md](IN_GAME_CHECKS.md)
  (record the answer per Stage 8, "Recording in-game confirmations"); an unchanged table
  needs no reading. When a reading comes back:
  - **Panel shows 100:** set entry 22 to "Matches game: 100" with the build; no site change.
  - **Tables refreshed from the new build:** the keyed row has been 100 since 2.1.1.0, so
    remove the differing-row note in [SOURCES.md](data-flow/SOURCES.md) ("Weapon Attributes
    inputs").
  - **Keyed or fallback row changed:** take the new rows with the refresh, confirm the panel
    in game, and record both in entry 22.
- **Multi-package selection.** `python scripts/frosty-multi-package-scan.py` with the
  [raw mode](../MAINTENANCE.md#raw-mode) arguments (`--root <xml root>` for an XML tree). One
  action normally selects one shared `U_WPM_*` package; several can mean an incomplete
  selector assignment (it found ATTACHMENT_BUGS entries 1 and 2). Each hit is a candidate for
  a trace and an in-game check, not a confirmed bug.
- **Relative-to-default comparison.** Compare each option with its weapon's **default**
  option, never with zero (default Regular magazines usually carry draw -1). Redoing the
  magazine review this way produced entry 10 and reclassified 128 magazines as a consistent
  design pattern.
- **Description-versus-effect comparison.** Group attachments by identical description text
  plus resolved modifier set; flag groups whose text claims an effect the modifiers do not
  apply, or the reverse. This produced most of the bug list (14 September: seven read-only
  batches over 333 groups, 107 candidates, each checked against site data, Frosty and in-game
  review). Rubric traps: a `+1` tier modifier can be a benefit; an effect the site does not
  model (bipod deployment, match triggers, speedloader tubes) is not a missing effect.
- **String-reference and text comparison.** Compare string references by role and field path
  in each UI metadata asset, resolve each build's ids against its own strings table, and
  compare the text: a stable id can change wording and an unchanged set can hide reassigned
  label and description roles (1.4.3.0: 234 of 248 changed attachment metadata assets had an
  identical string set). Resolve a disappeared id against the **old** table. A generator that
  reads an old description file cannot verify new wording by reproducing its old output. To
  tie a changed string to its attachment, search the `AD_*` raw files for the id's
  little-endian bytes (2.1.2.0: this showed the recoil text was the GRT-BC's Extended Barrel,
  not the SGX's).

**Gate:** every scan run with its control, or its run-order row says why not.

## Stage 7 — Account for every changed row

The work list is the output of three scripts, run on every new build:

| List | Script (research repo) |
|---|---|
| Changed values in weapon, attachment, bullet and class-trait files | `frosty-weapon-semdiff.py` |
| Equipment lists: attachments added to or removed from a weapon | `frosty-equipment-list-diff.py` |
| Tweakable registry rows | `frosty-registry-diff.py` |

```bash
python -I scripts/frosty-weapon-semdiff.py --old-index <run>\raw-index-old.tsv --new-index <run>\raw-index-new.tsv --old-descriptors <baseline descriptors> --new-descriptors <new descriptors> --out <run>\sem-changes.tsv
python -I scripts/frosty-equipment-list-diff.py <baseline collection> <new collection> --old-descriptors <baseline descriptors> --new-descriptors <new descriptors> --old-extra <baseline fresh-cache collection> --new-extra <new fresh-cache collection> --out <run>\equipment-list-diff.tsv
python scripts/frosty-registry-diff.py <baseline collection> <new collection> --old-descriptors <baseline descriptors> --new-descriptors <new descriptors> --new-extra <each later reports\*\ capture folder> --out <run>\registry-diff.tsv
```

- The **semantic diff** decodes every changed weapon and class-trait file in both builds,
  drops the noise fields and compares lists as multisets, so an index shift is not a change.
  Its usage text gives the 2.1.1.0 to 2.1.2.0 reference result (871 changed routes, 447 kept,
  4,105 rows); `--controls 2.1.2.0` must pass (nine Match drag changes; the Ultimax 45-round
  reload import removal) before a new build's output is used. It leaves out the equipment
  lists.
- The **equipment-list diff** covers all weapons in about five seconds. Every "removed" row
  is an attachment taken out of the game even when its record, binding and kill-switch row
  stay: the DRS-IAR Synthetic Tip in 2.1.2.0 was first reported "not done" from those alone.
  **Removal control:** on the 2.1.1.0 to 2.1.2.0 pair it must list `M27IAR AMO_BallisticTip`
  as removed.
- The **registry diff** covers every file under a `Tweakables` folder plus every `GRX_*`,
  `MUT_*` and `MutatorDatabase*` file, compares decoded values (boxed values included, layout
  ignored) and flags REDSEC rows rather than dropping them. Review every added, removed and
  changed row outside REDSEC; do not set mutator rows aside as noise: in 2.1.1.0 the XP caps
  were, and went unreported until a community post found them
  (`builds\2.1.1.0\reports\registry-diff-2026-10-14\findings.md`).

Then:

1. **Assign every row** to exactly one of: a checklist row; noise, with its category (offset,
   index shift, string-id re-pairing, graph re-bake, layout field at its default); or out of
   scope (REDSEC, vehicles, gadgets, record only). Keep the assignment in the run folder, one
   file per list (row key, assignment). The checklist records each list's total and the
   unassigned count.
2. **Create the checklist rows from the changed rows.** Group rows that are one change (the
   same field on several weapons, a package with its bindings). For every change, read the
   same field on every other weapon and count the reach (Stage 9, "Reach of a shared
   package"): the count is what separates a deliberate change from an error (2.1.1.0: the
   spot-on-fire range became 75 m on four weapons only).
3. **Attach the patch notes as labels** to the rows that carry them. A row no note explains is
   a finding in its own right (unannounced so far: the SU-230 camera-recoil fix, the PiP
   setting binding, the 2.1.2.0 PA-SL 2.50x sight and L115 QD Grip Pod penalty).
4. **Read the notes once as a watchlist.** First save the full text of the notes in the
   research repo (`reference-data/patch-notes/<version>-notes.md`, with the URL and the date
   read) and number every line, gameplay or not. Each numbered line must end up attached to a
   row, listed as "announced, nothing stored", or listed as out of scope with the reason; the
   count of unaccounted lines is recorded and must be 0. (2.1.2.0: the notes were read from
   the web page and never saved, and the "could display as 99 damage" fix line was dropped
   without a trace; the operator noticed.) List every note line with no row attached as
   "announced, nothing stored". Check the wording against what was found ("incorrect impact
   visual effects" matched only muzzle-flash changes in 1.4.3.0: say so rather than force a
   match).

**A contradiction needs a second, different method.** When the files disagree with a note (a
line with nothing stored, or a stored change that differs), the row stays "unresolved" until an
independent route confirms it. It goes on [IN_GAME_CHECKS.md](IN_GAME_CHECKS.md) only when no
second route exists (Stage 8, "When an in-game check is allowed"). Re-running
the same check is not a second route; different routes are, for example, record, binding and
kill switch against the equipment list; the file against the registry row; a decoded value
against a raw byte search.

**A registry row overrides the file.** Read both. In 2.1.1.0 the anti-air velocity, lifetime,
drag, magazine and reload changes moved only the registry rows; a reader of the file alone
reports "no change". Exceptions: a registry row no file is bound to (the `PB_C4` rows), where
the file value stands; and a removed registry row, after which the file value applies again
(the IGLA rows, 2.1.1.0).

**Known homes** for locating the field a note points at (brief B, the watchlist pass). The
weapon blueprint is often not where a balance change lives (1.4.3.0: the Interdictor's `_WB`
changed only muzzle-flash FX; the damage changes were in the bullets and the material grid).

| Patch note says | Look in |
|---|---|
| Damage, falloff, sweet spot, minimum damage | `Common/Hardware/Weapons/_Bullets/PD_*`: the curve holds distance **and** damage together |
| Limb / chest / headshot multipliers | Level material grids, through `scripts/frosty-material-grid-inventory.py` only |
| Attachment point cost | `Attachment_*` → `Field_6ee865a5` |
| Recoil amount / direction variation | `GS_<weapon>` → `Field_22810b21`, `Field_865174fa` |
| Muzzle velocity | `<weapon>_WB` → `Shot.InitialSpeed.z` (`Field_32a99b9c` inside `Struct_739f3ac5`) |
| Camera shake / visual recoil | `_WeaponModifiers/CameraRecoil/GCR_*` |
| A new option or toggle | A new `Option*` asset, plus a new field on whatever consumes it |
| Any vehicle, weapon or gadget value | Its named registry row: `GRX_Vehicles`, `GRX_Weapons`, `GRX_Gadgets_Glacier`, `MutatorDatabase_*` |
| Game rules, XP, matchmaking, mode settings | `Common/GameSetup/Tweakables/Mutators/MutatorDatabase_*`, `MUT_*` |

### In-game names

Read the in-game names of every new weapon, gadget and attachment from the season's name
metadata (`UIWeaponAbilityMetaData_*`, `UIWeaponAttachmentMetadata_*`, the `AAM_*` maps) and
the strings table, and add the internal-to-in-game rows to
`reference-data/provenance/frosty-weapon-identities.json` in the research repo.

### Availability of new content

A record in the files does not mean the item is in the game. Classify every new attachment,
ammunition choice, weapon and gadget as live, switched off or future release:

| Needed for "live" | Where |
|---|---|
| An attachment record | `Attachment_<weapon>_*` in the weapon folder |
| An ability branch that binds it | `<weapon>_ability`, branch list `Field_d7605aab` |
| A modifier package in the weapon's list | `<weapon>_WB`, `Field_0cd9f20f` |
| Kill switch not set | `KST_*` row stored `false`; `true` means switched off |
| Listed in the weapon's equipment list | `Equipment_<weapon>` imports the `Attachment_*` file |

Check every equipment-list "added" row against this census (an added row alone does not prove
the item live) and every patch-note removal against the "removed" rows before calling it not
done. An item with all five that the roadmap dates later is a future release. Limits:

- **Ammunition:** the first four conditions are necessary, not sufficient; the equipment
  list decides. Nine older ammunition records meet the four and are in no list, and none is
  offered; "kill switch not true and in the list" reproduced the site's ammunition menu on 67
  of 68 weapons (10 November 2026; the M357 Trait is the exception). No in-game menu check
  is needed.
- **Not in the weapon's own `AAM_*` map:** the displayed name cannot be fixed from the files
  (no stored link joins a record to a name entry; names are label joins). Availability still
  follows the record, the list and the kill switch: the map clause fails on ergonomics known
  to be offered (Match Trigger on the M4A1 and RPKM). Do not count an item from kill-switch
  rows alone.
- **A whole weapon** has no stored on/off flag: an unreleased weapon passes all five
  conditions (the NSW4 in 2.1.1.0). Released weapons have `GRX_Weapons` rows and loot rows;
  an unreleased one has none (the Mk 1 Mod 0 in 2.1.2.0).

**Gate:** the three lists run with their controls; unassigned count 0; every note line
attached or listed as "announced, nothing stored"; every contradiction settled by a second
method, or on IN_GAME_CHECKS.md with what was tried;
the result column filled for every row.

## Stage 8 — Recheck the known-issue lists

Run on every new build, and on a hotfix whose notes list fixes.

### Attachment bug list

For each entry in [ATTACHMENT_BUGS.md](ATTACHMENT_BUGS.md):

1. **Patch notes.** A "fixed" or "corrected" line that matches makes the entry a candidate
   for resolved; it does not prove it.
2. **Source side.** Did any asset behind the entry change? This rests on hashes, not decoding.
3. **Description side.** Compare string sets (Stage 6); decode metadata per Stage 4 rather
   than recording the entry as unverified.
4. Re-run the multi-package scan and the relative-to-default comparison.
5. **Decide the status.**
   - Asset changed and the stored values now agree with the text: resolved, with the build and
     the changed asset.
   - No asset changed and no note matches: the entry stands.
   - No asset changed but a note matches, or the behaviour is decided in the executable: the
     data cannot show a fix. Mark it "needs in-game recheck", list the test on
     IN_GAME_CHECKS.md, and do not record it as unchanged.
6. Record the result in the document with the date, including "no change" results.

### Other lists

Check each the same way (note lines, then changed assets, then status):

| List | Where | What to recheck |
|---|---|---|
| Vehicle and gadget discrepancies and working proposals | Research repo `docs/working/VEHICLE_SITE_ADDITIONS.md`, `GADGET_SITE_ADDITIONS.md`; `docs/frosty/VEHICLES.md` and `GADGETS.md` | Rows where a stored value disagrees with UI text or an EA statement |
| Open questions | Research repo `docs/frosty/OPEN_QUESTIONS.md` | Questions whose cited assets changed |
| Leads with a reopen condition | `reference-data/frosty/lead-index.json`, field `reopenWhen` | Leads whose condition names a game update, a changed asset or a patch note |
| Model limits | [MODEL_LIMITATIONS.md](MODEL_LIMITATIONS.md), "What would justify an update" | Limits the update may have removed |

Reopen a lead whose cited raw asset changed: a receipt at the previous build does not carry
forward (hotfixes with no gameplay change excepted). Three inputs were skipped in 2.1.1.0
because they were not re-read: optic field-of-view assets (entry 11), reload timing entries
(entry 15), and the selector graph (still built from the 1.4.3.0 export, so missing later
attachments). Re-read them from the new raw files, or record them as out of scope in the
checklist and the report.

Report the outcome as three lists: resolved, still present, needs in-game recheck.

### When an in-game check is allowed

In-game checks cost the operator far more time than any file trace costs a worker, so they
are the last resort. An item goes on [IN_GAME_CHECKS.md](IN_GAME_CHECKS.md) only when all of
these hold, and its row says what was tried:

1. **The answer would change a site value.** Never ask the operator to confirm a value read
   from the files, a bug entry's wording, or something already applied. The files are the
   source; a confirmation changes nothing.
2. **The files cannot answer.** Try the route for the kind of question first:
   - *Is it offered, what is on the menu:* the five availability conditions with the
     equipment list (Stage 7, "Availability of new content").
   - *The files disagree with a panel, a note or the site:* a second method, then the
     existing captures (`reference-data/attachment-audit/`, the dated panel files the tests
     read), then check the tool. Two assets can share one file GUID: the Extended barrel's
     "+1 ADS step on 46 weapons" was a leftover asset resolved in place of the live one, and
     the July panels already showed the site was right.
   - *A time or speed the package does not state:* look for an override object in the
     package before calling it animation-only (the M/60 100-Round Fast stores its own
     reload; the M240L 75-Round Fast stores none and so reloads like the weapon).
3. **A worker has tried and failed**, and the report names the missing link (no row, no
   stored join, no flag).

Ask for the smallest reading that settles it, combine readings on one weapon into one row,
and prefer a menu or panel glance to a measurement. (10 November 2026: 15 rows became 3 this
way.)

### Recording in-game confirmations

Record every in-game check the operator reports as one line in the update's results file:
date, weapon (in-game name), screen or test (for example "loadout panel" or "firing range,
target at 50 m"), and the value seen. A confirmation without the weapon and screen cannot be
reused. Apply what it settles and remove the item from IN_GAME_CHECKS.md in the same commit.

**Gate:** every list rechecked; statuses recorded with dates.

## Stage 9 — Update the Analyzer

1. **Re-run the generators on the new build.** Run every generator with
   [raw mode](../MAINTENANCE.md#raw-mode) against the new capture, with explicit output paths,
   and diff each output against the committed site data; run each on the previous build's
   capture too. A difference on both builds is stale site data, not a game change: add it to
   [STALE_SITE_DATA.md](STALE_SITE_DATA.md), and remove rows the update fixes. (2.1.1.0: the
   stale sight exclusions were found this way, from `Equipment_*` required-accessory lists no
   checklist row pointed at.) Raw-mode arguments, including the wiring check's, take `--raw`
   once per capture folder, later folders winning, and `--catalog` once per catalog with the
   loaded-cache catalog (`collection/asset-catalog.json`) first: the rebuilt-cache catalog lists
   leftover assets that reuse a live file GUID (1,179 in 2.1.2.0), and a run given only that one
   stops on the first duplicate it needs. **One command runs every check, in order:**

   ```bash
   python scripts/frosty-check-all.py --build "<datamining>/builds/<build>" --research "<research repo>" [--raw "<later capture>/raw"]
   ```

   It runs ten checks against the committed data: tooltips, availability, compatibility,
   individual optics, optic tooltips, point costs, handling, barrel ADS, weapon records and
   ammunition with projectiles. When all ten pass, run it once more with `--stamp`: that writes
   `data/provenance/data-status.json` (the build each data file section was verified through)
   and is the only way those labels move.
   Run it on the new build before changing anything: its failures are the update's work list
   for those areas (cost changes, handling changes, what each weapon offers, weapon values,
   description texts), alongside the Stage 7 change lists. Apply the changes by running the
   generators that write (`--out` and the default outputs), not by hand; a new attachment or
   weapon first needs rows in new dated mapping files. Deliberate differences are rows in
   `data-src/overrides*.json`; a row the new build makes STALE, REDUNDANT or UNUSED fails the
   run and is reviewed, not silenced. All ten must exit 0 on the committed data at the end of
   Stage 9. The availability, weapon-record and ammunition scripts only check; they do not write yet.
   Three generators need refreshed inputs
   first; a run with the check turned off is not a result:
   - `frosty-sniper-brakes.py`: its trace hashes the source graphs (2.1.2.0: 298 differed after
     a re-bake). Refresh the trace on any update whose comparison shows changed graphs.
   - `frosty-ballistics.py`: needs a hit-zones trace taken on the new build (the current one is
     from the 2026-09 XML export and fails on 4,286 stale sources). Refresh it once the
     material grids of the new build are captured.
   - `frosty-hit-zones.py`: needs the material grids through the bounded reader; capture them
     on every new build whose comparison shows changed grids or bullet materials.
2. **Decide which source changes require site changes.** Not every diff does.
3. **Apply only those**, preserving the observed / fitted / native-confirmed evidence
   boundaries. **Reach of a shared package:** when a shared package (`WPM_*`, `WME_*`, `PD_*`)
   changes, count the weapons it reaches from the `Attachment_*` records and the equipment
   lists, not from one worker's rows (2.1.2.0: the Magwell Flare was first recorded on 11
   weapons; the lists give 15). Remove every override the change makes obsolete, in every
   file that holds one (2.1.2.0: the L115 QD Grip Pod override also sat in
   `weapon_attributes.json` `mobilityInputs`). Update the `index.html` header date in the same
   commit as any site data change.
4. **Run the narrow existing checks** for the changed areas, not the whole suite. When a game
   change makes a test fail, decide by what the test protects:
   - **A mechanism in the site code** (a per-weapon override path, a price reaching the
     loadout total, a tier resolving through a table, a dependency rule): keep it and update
     the expected value, naming the build in the title or a comment (2.1.2.0: the sniper
     iron-sight price, 15 to 10).
   - **Only a data value** whose mechanism another test covers: remove it; a pinned number the
     next patch changes again is a cost.
   - **The mechanism is gone** (an override deleted because the game fixed the bug): remove the
     test with the override. Do not write a new test for ordinary behaviour to keep the count.
     (2.1.2.0: the L115 QD Grip Pod test was kept and changed to assert the penalty, because
     no other test covers a grip pod's moving-ADS penalty on a bolt-action rifle.)
   - Never hide a changed case with a skip list or filter, unless the data is a dated record
     that must stay as captured; then say why in a comment at the filter.
   - The report lists each test removed, updated or skipped, with the reason.
5. **Labels.** Update source and build labels so retained old data is not presented as newly
   verified: site header, footer, page description, `data/provenance/live-baseline.json`,
   per-weapon provenance and `generatedFrom` in any data file a generator rewrote. Verified-through
   labels and the footer build come from the step 1 stamp (`data-status.json`), never from a hand
   edit; a section no check covers stays unverified there. Set `lastVerified` in `live-baseline.json` to the new build once the
   comparison is complete (a hotfix updates `hotfixesCheckedThrough`); unchanged values keep
   the build they were first read from. Verify the changed values in the local browser.
6. **Source records.** Review every record in `live-baseline.json`, not only the new build's
   (`ea-update-notes`, `sym-bf6-json`, each earlier Frosty record). A record the site no longer
   rests on is marked `status: historical` with a note; a new patch-notes page is adopted as a
   source only by an explicit decision (held for the operator), never by default.
7. **Validate after integration.** Re-run the part A, B and C validators and the raw-mode
   generators against the site data as committed, into a new folder. Every "changed in
   <build>" row must be gone, and only the known "site differs from both" rows may remain; any
   other row is a change dropped or mistyped during integration. Then check the Site column
   (research repo):

   ```bash
   python -I scripts/checklist-site-check.py docs/updates/<version>-checklist.md --site "<Analyzer repo>"
   ```

   It reads `<version>-site-checks.json` (file, key path and expected value per applied row;
   for availability, the weapon's list includes or excludes the attachment), exits 1 on any
   mismatch or on an applied row without checks, and lists every row not on the site with its
   reason. Write the checks from the result column, not from the site data.
8. **Record** the implementation revision and the check results in the checklist.
9. **Close the run.** Once the site changes are pushed, run the `bf6-run-cleanup` skill on the
   run folder (it removes uncited copies and large regenerable files and records what it
   removed; `reports\` had reached 22.5 GB by 2.1.1.0). This follows the push, so it is outside
   an unattended run.

**Gate:** validators clean apart from the known rows; site check exits 0; tests for the
changed areas pass; labels updated.

### Adding a new weapon

Finish the Stage 2 descriptor check and the Stage 7 availability census first.

1. **Split the site data into three parts**, one worker each, all reading raw files through
   `scripts/frosty-ebx-decode.py`: A, weapon records (fire rate, magazine, reloads, velocity,
   recoil and spread tables, fire modes, role tags, description, Precision table); B,
   ammunition, ballistics, hit zones, damage curves, collateral; C, attachments, magazines,
   optic categories, tooltips, dependencies. The readers are in the research repo under
   `scripts/update-readers/` (see its README): set the build label and a new working folder in
   `settings.json`, run `regnames.py`, then the parts.
2. **Each part proves its method first:** it reproduces the site's values for every existing
   weapon from the new files and names the cause of every mismatch. A method that cannot
   reproduce the roster is not used.
3. **Parts write proposals, not site files:** fragments keyed by target file and JSON path,
   with the route and field of each value, plus what was not found.
4. **The main session checks the proposals against the files**, resolves cross-part
   dependencies (magazine ids, reload exceptions), and integrates from a backup of the data
   files so the integration can be re-run.
5. **Site defaults:** basic barrel, standard ammunition, regular magazine, nothing else,
   whatever the in-game default is.
6. **Rows per weapon:** `reference-data/provenance/frosty-draw-time-*.json` and
   `frosty-optic-category-mapping-*.json` (two tests read them),
   `data/provenance/live-baseline.json`, and the weapon and ammunition counts in `README.md`
   and `docs/`.
7. **Check in the local site** that each weapon loads with its magazines, ammunition and
   attachments, and compare with the operator's in-game panel where the loadouts match.
8. **Operator list:** menus and default attachments come from the equipment list and the
   weapon files, not from an in-game look. Only what passes Stage 8, "When an in-game check
   is allowed" goes on IN_GAME_CHECKS.md; file values that look like game errors go to
   ATTACHMENT_BUGS.md.
9. **Wiring check, once part C is in the site** (the fire-mode test reads `data/weapons.json`):
   `python -I scripts/frosty-attachment-wiring-check.py --raw <raw root> [--raw <later capture> ...] --descriptors <SharedTypeDescriptors.ebx> --catalog <asset-catalog.json> --new <folders>`
   (usage at the top of the script). It lists attachment effects and gun-sway bindings the new weapons lack or add against the
   roster (bugs 25 and 26). Add findings to the operator list; record confirmed ones in
   ATTACHMENT_BUGS.md as suspected game errors.
10. **Soldier class.** The site applies a class's signature weapon trait by weapon type
    (`sim/soldier-classes.js`, `weaponClass`: assault rifles, SMGs, LMGs, sniper rifles), so a
    new weapon needs no class entry. Check by import-table GUID that its `_WB` imports the
    trait package of its type and no other (`WM_AssaultTrait`, `WPM_SupportTrait`,
    `WM_ReconTrait` with `WPM_SwayPenalty`; the Engineer trait is a `GS_` binding), as L4070
    did (2.1.2.0: the NSW4 carbine imports none; Mk 24 and ELR-40 were the controls). The
    trait files are in the semantic diff; the class and training-path texts come from the
    in-game Class Details screens, so a changed screen is the only signal for them.
11. **KDM stats site name** (held: a commit to the bot repo). The KDM bot takes weapon names
    from `config/bf6-equipment-catalogue.json` in the kdm-discord-bot repo and shows the
    internal code name for any weapon missing there. Add one entry per new weapon:
    `"wp_ar_mrgga": { "name": "Mk 24", "class": "ar" }`.
    - **Name:** the weapon's `name` in this repo's `data/weapons.json` (the in-game name from the
      UI metadata, Stage 7), copied exactly; never typed from memory or taken from GameTools.
    - **Id:** the GameTools id is the stat id in
      `Persistence/StatCategories/StatCategoryTrees/Category_Hardware`: list its `wp_*` strings
      and take the one added for the weapon, whose suffix is the weapon's internal code name
      (NSW4, internal Devgru: `wp_crb_devgru`). The class is the id's prefix. Stat ids can arrive
      builds before the weapon (1.4.3.5 added the four 2.1.1.0 weapons, the NSW4 and the
      unreleased Mk 1 Mod 0, each under its code name). Older ids do not follow it: 46 of the 67
      earlier weapons use other names (`wp_mg_kts100mk8` for Ultimax), so check new ids only.
    - **When:** prepare the entry on release day and hold the commit for the operator. Edit by
      hand (the repo tool takes names from GameTools, which may not have them yet). The commit
      goes on the bot repo `main` (the Mini PC pulls within five minutes). Afterwards compare the
      live `equipment-index.json` with the catalogue for any name still missing. (The 2.1.1.0
      weapons were missed until 18 October.)

## Stage 10 — Independent review

Run this on every new build, after Stage 9 and before the final report. The review is a
stage of the run, not something the operator has to start. (2.1.2.0: a review started by the
operator found the DRS-IAR Synthetic Tip removal, the Magwell Flare count and a second L115
override after the run had reported itself done.)

1. **Who.** One fresh Opus 5.5 worker (brief K) that has seen none of the run's reasoning. It
   gets the checklist, the three change lists with their assignments, `<version>-site-checks.json`,
   the site diff (`git diff <commit before the update>..HEAD` on the Analyzer) and the raw
   indexes. It writes a findings file in the run folder and edits nothing.
2. **What it checks.**
   - **Applied rows:** for every applied checklist row, read the value again from the new
     build's raw file and compare it with the site diff. It does not trust the Result column
     or the site checks, which were written by the run.
   - **Rows not applied:** for every "not applied", "held" and "not applicable" row, whether
     the reason holds in the files.
   - **Assignments:** every noise category and out-of-scope class, with a sample of at least
     20 rows from each (all rows when a class has fewer), looking for a real change filed as
     noise.
   - **Reach:** for every shared package that changed, count the weapons it reaches from the
     records and equipment lists and compare with the weapons changed on the site.
   - **Leftovers:** for every site value changed, search every data file and the `sim/` and
     `ui/` code for another copy or override of the same fact.
   - **Contradictions:** every row where the files and the notes disagree has a second method
     recorded (Stage 7), and the site follows the files.
   - **Tests and labels:** the report's list of tests removed, updated or skipped equals the
     diff of `scripts/*.test.*`; the header date and build labels are updated.
3. **Controls.** Plant one wrong site value and one real change filed as noise in the copies
   the worker is given; a review that reports neither is rerun.
4. **After it.** The main session fixes each finding or records why it stands, reruns the
   Stage 9 step 7 checks if the site changed, and records the findings count and the fixes in
   the run-order row.

**Gate:** both controls found; every finding fixed or answered in the checklist.

## Workers

Stages 0 to 2 are bounded by Frosty (one process at a time), so workers do not shorten them.
From Stage 3 on, most of the time is reading that splits into independent parts: hand those to
workers and keep the decisions in the main session. Briefs:
[game-update-haiku-briefs.md](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/working/game-update-haiku-briefs.md).

**Model per task type**, chosen by what a wrong answer costs:

| Task type | Model | Examples |
|---|---|---|
| A fixed script on fixed inputs with a mechanical output | Haiku 5.5 (`haiku-worker` or `haiku-reader`, Medium) | Strings diff, list rechecks, running a maintained script and reporting its counts |
| Decode and compare with a known method | Sonnet 5.5 | Parts A, B and C, registry review, generators, bug-entry judging, attachment graph diff, Stage 6 scans |
| Designs its own method, or its answer can be "nothing else changed" | Opus 5.5, or two independent Sonnet 5.5 workers compared | Assigning the change-list rows, reader blind-spot checks |
| Availability census | Sonnet 5.5, not Haiku | It must notice when its own rule is wrong (the DRS-IAR Synthetic Tip) |
| Site integration | Opus 5.5 (the main session) | Stage 9 |

A wrong "nothing found" is the costly failure, and an independent second pass catches more
than a larger model. **One deliverable per worker:** split broad tasks (2.1.2.0: a brief that
asked for the weapon diff, its classification and an equipment comparison ran over budget,
and the side task failed). Scripted steps stay scripts; workers assign or check their rows.

| When | Worker task | Brief | Model |
|---|---|---|---|
| The day before, once the notes are out | Locate the fields the notes point at in the files already held, and the same field on other items | B | Sonnet |
| While the Stage 1 capture runs | Turn the notes into the watchlist: one line per item with the asset home it points at | A | Haiku |
| Stage 3 | Cross-check catalog hash and raw hash (and a patch summary if taken); list disagreements | C | Haiku |
| Stage 5 | Diff triage in batches of about 40 changed files | D | Sonnet |
| Stage 6 | One consistency scan per worker, with the previous build as control | E | Sonnet |
| Stage 7 | Assign every row of one change list to a checklist row, noise or out of scope (one worker per list) | J | Opus, or two Sonnet compared |
| Stage 7, watchlist pass | For each note line, find the rows that carry it and compare EA's values with the stored ones | G | Sonnet |
| Stage 7, new content | Availability census of every added attachment, ammunition choice, weapon and gadget | H | Sonnet |
| Stage 8 | One known-issue list per worker | F | Haiku to match, Sonnet to judge |
| Stage 9, new weapons | One worker per part (A, B, C): reproduce the roster, then propose | I | Sonnet |
| Stage 10 | Independent review of the finished update, with two planted errors as controls | K | Opus |

Launch independent workers together; Stages 5, 6 and 8 can start as soon as the changed-route
list exists.

**Not delegated:** any Frosty run, the Stage 1 decision, `seal`, `record`, `BUILD.json`,
decoder changes and their validation, marking a known issue resolved, and Stage 9
integration. Check every worker result against the files before recording it, whatever the
model (about one Haiku run in four had a disclosed rule slip in the 7 October 2026 tests,
which covered bounded read-only tasks only).

**Controls.** Every diff or availability worker runs an addition and a removal control: a
known change on the previous build pair that its method must find. The permanent removal
control is the DRS-IAR Synthetic Tip (Stage 7). A failed control means the step is redone with
a corrected rule or a stronger model before the stage is ticked; pointing at another worker's
partial result does not cover it.

**Reconcile before reporting.** List every place where worker reports disagree (counts,
verdicts, row sets) and resolve or flag each one (2.1.2.0: the Rubberized Vertical was
reported on 50 weapons, every weapon and two weapons; the lists gave 54).

**Mark confidence.** In every operator summary, mark each line as confirmed by two routes or
resting on one worker (2.1.2.0: three corrections, each on a single-worker line: the NSW4
bullet speed, the Buffer change, the DRS-IAR Synthetic Tip).

## Recording what you learn

Every reusable fact goes into the shared pages in the session it is found. Do not create a
new document per investigation:

- **[`docs/frosty/`](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/README.md)**: new field meanings in the
  [field map](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/FIELD_MAP.md), asset links in the [data graph](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/DATA_GRAPH.md),
  results in [weapons](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/WEAPONS.md), [attachments](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/ATTACHMENTS.md) or
  [UI text](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/UI_TEXT.md), tool changes in [tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md), and open items in
  [open questions](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/OPEN_QUESTIONS.md).
- **`reference-data/frosty/asset-findings.json`**: per-asset conclusions, with the question
  asked, the build inspected, the evidence pointer and the conditions that would require a
  revisit. Add a superseding finding rather than deleting an old one; mark blocked results
  `blocked-by-decoding` and supersede them when unblocked. The file is generated: add findings
  as `record.assets` in a new receipt, then run `python scripts/frosty-records.py build`.
- **`reference-data/frosty/asset-watchlist.json`**: routes to capture next time, with
  dependencies.
- **`reference-data/provenance/`**: the dated report a finding points at.

## Appendix: the XML route

Why the raw decoder (Stage 4) replaced Frosty's XML export. Kept as history; none of it is a
step.

- **The failure mode.** `EbxReaderRiff` resolves a top-level instance by class GUID, which in
  BF6 is the type GUID's last 12 bytes plus a 4-byte layout signature, so any layout change
  moves it. The locally generated SDK has the old GUIDs, `TypeLibrary.GetType(guid)` returns
  null, and the exporter writes `<!-- Object could not be loaded (unknown type) -->`. A diff in
  such an asset is a decode failure, not a data change; when reading XML, count them first
  (`grep -rl "could not be loaded" <new xml root> | wc -l`). In 1.4.3.0 this hit 341 of 835
  exported assets, including every attachment `AD_*` and every `Aim_*_PiP`.
- **Regenerating the SDK** is not possible: Frosty's generator reads the running game process,
  which EA anticheat blocks. Treat the SDK as frozen until a third party publishes one.
- **A name-based fallback** is wrong: the type name hash does not change with the layout, so
  the stale offsets give plausible wrong values with no error (69 of 108 moved type keys in
  1.4.3.0 were real layout changes). Silent wrong numbers are worse than a visible gap.
