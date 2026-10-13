# Game update guide

What to do when Battlefield 6 updates: how to capture the new build, decide what really
changed, decode it correctly, and carry the result into the Analyzer.

Frosty research tooling moved to the [BF6-Frosty-Research](https://github.com/raymdl/BF6-Frosty-Research) repo on 29 September 2026. Commands for `scripts/frosty-*.py` files that are not in this repo run from a checkout of that repo (beside this one; see its README).

Run every raw capture through `scripts/frosty-capture.py`, never the collector
(`frosty-collect-raw.ps1`) by hand: it enforces one Frosty process at a time, runs `guard`
and `record`, and fails loudly. The agents' game-update skills (Claude's `bf6-game-update-check`) run
Stages 0 and 1 in order with these scripts; this guide wins where they differ.

This is the durable procedure. The 1.4.3.0 run is the worked example and is kept as a
one-time record in [FROSTY_1.4.3.0_UPDATE_PLAN.md](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/archive/FROSTY_1.4.3.0_UPDATE_PLAN.md);
read it for the specific paths, counts and decisions of that update, not as the procedure.

Tool commands are in [Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md), field meanings in the
[field map](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/FIELD_MAP.md), and the asset watchlist and per-asset findings in
[`reference-data/frosty/`](https://github.com/raymdl/BF6-Frosty-Research/blob/main/reference-data/frosty/README.md). Update them as you learn
things, in the same session ([Recording what you learn](#recording-what-you-learn)).

---

## Build snapshots

Each data build lives in `BF6 Datamining\builds\<build>\` (`xml\`, `capture\`,
`reports\`) with `BUILD.json` (identity, client versions, state) and `MANIFEST.tsv` (size
and SHA-256 of every file). `scripts/frosty-build.py` manages them
([Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md#build-snapshots)).

| State | Meaning | Rule |
|---|---|---|
| `open` | The installed data build | New exports may add files. Existing files must not change (`reports\` may). Run `guard` before each export and `record` after it. |
| `sealed` | No longer installed | Read-only. Compare new builds against it; never write to it. |

A build stays open while it is installed, so later investigations can add new Frosty
paths. It is sealed when the game updates, before the first export from the new client.

A client hotfix is not always a new data build. If `client-check` finds identical type
layouts, the catalog comparison shows no added or removed assets, and neither the catalog nor
the raw SHA-256 comparison of the watched routes shows a gameplay-relevant change, add the
client version to the open build. Otherwise seal the open build and create a new one. The
16 September 2026 hotfix of 1.4.3.0 was accepted on the catalog alone: identical layouts,
and only 2 of 467,208 assets changed (a store UI button group and
`Systems/Gameplay/DataVersion`). A raw capture of 1.4.3.1 on 29 September confirmed it at
the byte level: of 23,554 watched routes, only `Systems/Gameplay/DataVersion` differs from
the 1.4.3.0 capture (`BUILD.json` `rawCheck`).

**Updates arrive without notice.** The EA app installs updates and hotfixes automatically;
the 16 September hotfix was found only because the executable hash had changed. Start every
Frosty session with `guard` (below), not only exports.

## Stage 0 — While a build is installed

This is the only irreversible part. Once the game files update, an unexported asset of the
old build is gone. Keep the open build complete while it is installed:

- Capture the full catalog and the raw EBX for every watched route into
  `capture\pre-update-<client>-<date>\collection` and point the client's
  `preUpdateCapture` entry in `BUILD.json` at it:

  ```bash
  python scripts/frosty-capture.py pre-update-<client>-<date> --into capture/pre-update-<client>-<date>/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes.txt"
  ```

  Keep the route list: reusing it on the next build is
  what makes raw hashes directly comparable. When a hotfix client is added to the open
  build, capture the watched routes again on that client; otherwise the next comparison
  runs against an older client and mixes two updates.
- Keep `Profiles/BF6SDK.dll`, `FrostySdk.dll` and **`SharedTypeDescriptors.ebx`** in the
  open build's `capture\toolchain\`. Frosty rewrites the runtime descriptor file when it
  first loads a new game version, so after an update the old file can no longer be copied.
  `BUILD.json` lists the descriptor file for each client.
- Export strings (`fs_us_loc`) for the build.
- Record the executable hash and version, the Frosty archive Head and the SDK version in
  `BUILD.json`.
- Once the patch notes are out, write a patch-specific checklist in the pre-trace run
  folder (`update-<version>-checklist.md`): identity and baseline paths, decisions made for
  this update, one row per expected change (source, file and field, "from", expected "to",
  result) and anything seen outside the notes. It holds only what is particular to the
  update and points here for method; its run-order table lists the stages with a tick
  column and that update's paths, without repeating the steps. Example: `2026-10-12-update-2110-pretrace`.

Write everything to the open build (`builds\<build>\capture\` or `xml\`), then run
`record` and `verify`. Never write to a sealed build.

```bash
python scripts/frosty-build.py --datamining "<datamining>" guard <open build> --game "<game>"   # before
python scripts/frosty-build.py --datamining "<datamining>" record <open build>                  # after
```

## Stage 1 — Identify the new build

Start here when `guard` stops because the installed `bf6.exe` is not a recorded client.

1. **Executable identity.**

   ```bash
   powershell -c "$e='C:\Program Files\EA Games\Battlefield 6\bf6.exe'; (Get-Item $e).VersionInfo.FileVersion; (Get-FileHash $e -Algorithm SHA256).Hash"
   ```

   **Do not order builds by the file-version string.** In 1.4.3.0 it went *down*
   (`1, 0, 439, 36273` → `1, 0, 437, 12728`) while the hash changed. Use the hash for
   identity and the Frosty archive Head for ordering.

2. **Fresh cache.** Rename or delete `Caches\bf6.cache` so Frosty builds a full cache. The
   cache is disposable (a full rebuild plus the capture took about 10 minutes on 3 Oct 2026), so
   do not keep the old file once the decision is recorded.

3. **Capture the new client.** This is Frosty's first load of the new client, so it also
   rewrites the runtime `SharedTypeDescriptors.ebx`. Capture the catalog and the open
   build's watched routes into a new folder under its `reports\`. `--update-check` skips
   `guard`, which fails on the new client by design, and `record`, which follows the
   decision:

   ```bash
   python scripts/frosty-capture.py <client>-check-<date> --into reports/<client>-check-<date>/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes.txt" --update-check
   ```

4. **Compare the type layouts.**

   ```bash
   python scripts/frosty-build.py --datamining "<datamining>" client-check <open build> --game "<game>" --runtime "<runtime>"
   ```

   `BF6SDK.dll` and `SharedTypeDescriptors.ebx` are independent: the SDK is a local
   artefact, the descriptors ship with the game. **A descriptor change with an unchanged
   SDK is the normal case and it breaks Frosty's decoding** (Stage 4). A changed file with
   identical layouts, as in the 16 September hotfix, only reorders type entries.

5. **Compare the asset catalog and the raw watched routes** with the pre-update baseline:

   ```bash
   python scripts/frosty-capture-compare.py <baseline collection> <new collection> <check folder>/comparison.json
   ```

   It compares paths, GUIDs, sizes and Frosty record hashes of the two catalogs, and the
   raw SHA-256 of each watched route as recorded in `raw-status.jsonl`. It also re-hashes
   every compared file on disk, on both sides, and lists any that does not match its
   recorded hash.

   The step 3 capture rebuilds the cache, and Frosty lists more assets in a run that
   rebuilds its cache than in one that loads a saved cache (1,014 more on client
   `1.0.443.60769` with unchanged game files). Compare its catalog only with a
   rebuilt-cache catalog. If the baseline's raw files came from a loaded-cache run, name
   the rebuilt-cache catalog folder separately:

   ```bash
   python scripts/frosty-capture-compare.py <baseline collection> <new collection> <check folder>/comparison.json --baseline-catalog <baseline rebuilt-cache collection>
   ```

   The catalog alone is not enough: record
   hashes can stay the same when the bytes change (Stage 3). It exits 1 when coverage is
   incomplete (baseline routes missing from the new capture, new failures, or a file that
   does not match its recorded hash); explain each
   before deciding. Record both results in the client entry (`catalogCheck`, `rawCheck`).

6. **Decide.**
   - **Hotfix (identical layouts; no added or removed assets; no gameplay-relevant change in the catalog or raw hashes):** copy the runtime
     `SharedTypeDescriptors.ebx` into the open build's `capture\toolchain\` under a dated
     name, add the entry that `client-check` printed to `BUILD.json` `clients`, and continue
     with that build, then run `record` and `verify`.
   - **New build (layouts differ, or assets were added, removed or changed in gameplay data):** run `record <old build>` (it adds the step 3 check capture), then `seal <old build>`. Create
     `builds\<new build>\` with a `BUILD.json` like this, copy the runtime descriptors into
     `capture\toolchain\`, and run `record <new build>`:

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

Run `guard <build> --game "<game>"` before every export from now on.

## Stage 2 — Capture the new build

Start from the previous build's newest route list (`capture\raw-routes*.txt`) so the two
captures are comparable, and extend it before the run. A reused list cannot name files that
did not exist before: in 2.1.1.0 that cost two extra Frosty runs (1,767 routes, then 24) and a
third for 43 attachment descriptors. Add, from the Stage 1 comparison's added and changed
routes:

- every catalog-added route under `Common/Hardware/Weapons/` and
  `Common/UI/Static/Metadata/Attachments/` (new weapon folders, `AAM_*` maps, `AD_*`
  descriptors), and added gameplay routes under `Common/Hardware/` and `Common/Gameplay/`;
- the season's name metadata: `Common/UI/Static/Metadata/S<n>/UI*MetaData*`;
- the season's availability tables: `Common/GameSetup/Tweakables/Killswitches/KST_*`,
  `GameConfigurations/CT_GLA_*` unlock tables, and new `GRX_*` and `MUT_*` tweakables;
- every changed route the old list does not cover.

Write the extended list as the new build's `capture\raw-routes.txt`.

```bash
python scripts/frosty-capture.py collection --build <build> --into capture/collection --catalog --routes-file "<datamining>/builds/<build>/capture/raw-routes.txt"
```

**Check the descriptors after the capture.** For each new weapon, read its `AAM_<weapon>`
map and list every `AD_*` descriptor its records point to that the build does not hold.
Shared descriptors under `Attachments/Shared/` are often older files and so are not
"catalog-added". Capture the missing ones with
`frosty-capture.py <topic>-<date> --build <build> --routes-file <list>`. Without them the
weapon's barrels, magazines, iron sights and own muzzles have no tooltip or label. Read labels
and descriptions only from captured descriptors; a string-table text match is not a link, so
record such a choice as "not found".

After any follow-up capture, write a new route file `capture\raw-routes-<date>.txt` holding
`raw-routes.txt` plus every route captured since, and name it in the `BUILD.json` notes as the
list for the next update. Existing files under `capture\` cannot change, so do not edit
`raw-routes.txt` itself. Then `record` and `verify`.

Then export strings. An XML export is no longer needed: the generator scripts read the raw
capture directly (see [raw mode](../MAINTENANCE.md#raw-mode)). XML-export a subset into
`builds/<build>/xml/` only if you want to read an asset by eye. Full command lines are in [Frosty tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md#frostycmd).

Write the text catalog files from the captured catalog:

```bash
python scripts/frosty-catalog-files.py builds/<build>/capture/collection/asset-catalog.json builds/<build>/capture/catalog
```

Expect raw capture failures only for assets the catalog says were removed. Any other
failure is a real problem. Finish with `record <build>` and `verify <build>`.

Write comparison results (diffs, overlays, reviews) into the new build's `reports\` or
`capture\` folder, never into the sealed build.

## Stage 3 — Decide what actually changed

Three independent signals. Use all three; they disagree in informative ways.

| Signal | What it proves | Trap |
|---|---|---|
| FrostyEditor patch summary | Which asset records the patch touched | Includes records whose content is identical |
| Catalog `sha1` diff | Frosty's recorded asset hash moved | **Not sufficient**: in 1.4.3.0, 142 assets had an unchanged record SHA1 but a different extracted raw stream, and all 142 decoded to changed XML |
| Recomputed raw SHA256 | The extracted bytes differ | The strongest content signal; use this one |

Also compare catalogs for additions and removals, and treat a stable GUID with a changed
path as a **rename candidate**, never as proof of identical content.

Cross-check the signals against each other. In 1.4.3.0 the patch summary's net asset count
matched the catalog's exactly, and every catalog hash change appeared in the summary; that
agreement is what licensed trusting either one.

## Stage 4 — Decode, and know when Frosty cannot

### The failure mode

`EbxReaderRiff` resolves a top-level instance **by class GUID**, and in BF6 that GUID is
the type GUID's last 12 bytes plus a **4-byte layout signature**. Any layout change moves
the GUID. The locally generated SDK has the old GUIDs, `TypeLibrary.GetType(guid)` returns
null, and the exporter writes:

```
<!-- Object could not be loaded (unknown type) -->
```

**A diff in such an asset is a decode failure, not a data change.** Always count them
before trusting any diff:

```bash
grep -rl "could not be loaded" <new xml root> | wc -l
```

In 1.4.3.0 this hit 341 of 835 exported assets, including every attachment `AD_*` and
every `Aim_*_PiP`.

### Why regenerating the SDK is not the answer

Frosty's SDK generator reads the running game process. EA anticheat blocks it. Treat the
SDK as frozen until a third party publishes an updated one.

### Why a name-based fallback is not the answer

The type *name* hash does not change when the layout does, so patching Frosty to fall back
to the name looks attractive. It is wrong: for types whose layout genuinely changed, the
SDK's stale field offsets produce plausible but incorrect values **with no error**. In
1.4.3.0, 69 of the 108 moved type keys were real layout changes. Silent wrong numbers are
worse than a visible gap.

### The answer: decode from the build's own descriptors

`scripts/frosty-ebx-decode.py` reads the RIFF EBX container and takes every class size,
alignment, field offset and field type from that build's `SharedTypeDescriptors.ebx`. It
never touches the SDK, so it cannot read a changed type with stale offsets.

```bash
python scripts/frosty-ebx-decode.py \
  --descriptors builds/<build>/capture/toolchain/SharedTypeDescriptors.ebx \
  --root builds/<build>/capture/collection/raw \
  --ebx-list <file of .ebx paths> \
  --out <out.json>
```

Decode **both** builds with **their own** descriptors, then diff the JSON. Field identity
is the `Field_<hash>` name, so the comparison survives offsets moving.

### Validate the decoder after any change to it

For changes to value decoding, compare a few hundred old-build assets against Frosty's
XML for the same assets. For warning-only changes, use focused regression tests and
compare decoded values before and after on representative retained assets. Expected result:

- most assets identical value-for-value;
- some **supersets**, where the decoder reports fields the SDK class lacks and Frosty
  therefore discards — this is correct and expected;
- a small number of **disagreements**, confined to type names that have more than one
  layout entry in the descriptors. The decoder follows the layout the asset declares
  through its own type key; Frosty follows the SDK's. Those objects are tagged
  `$layoutAmbiguous`, including affected nested structs and their containing objects.
  Which is right per asset is unsettled, so treat them as provisional. Using the same
  decoder for both builds does not resolve layout ambiguity or prove unchanged behavior.

A disagreement outside that last category means the decoder has a bug. Fix it before using
the output.

## Stage 5 — Diff correctly

Raw `diff` on Frosty XML is misleading. Objects get reordered between builds, which makes
a 10,000-line diff out of an identical asset.

1. **Match objects by identity.** Match exported objects by GUID and type. Resolve local
   references before comparing; retain unresolved identities as a limitation. Line
   multisets can help triage, but cannot prove semantic equality.
2. **Compare fields and ordered arrays.** Compare field paths within each matched object.
   Preserve array indices and distance/damage pair associations. Call a change
   "reordered only" only when object identities, values, references and array order agree;
   exchanging values between objects or array entries can change behavior.
3. **Classify the noise.** These categories carried ~20% of the 1.4.3.0 change set and
   none of them are gameplay:

   | Category | Marker |
   |---|---|
   | String-id renumbering | `Field_8cf424e7`, `Field_fefe9de1` |
   | Compiled-expression re-bake | `Field_0c18a620`, `Field_aa4fa860`, `Field_c7ffe639` |
   | FX reference swap | `Field_0679f638` |
   | Cosmetic list growth | paths under `/Art/Skins/`, `_Textures/Decals/`, `_Charms/` |

4. **Keep a control group.** Assets the patch summary touched but whose content is
   identical confirm the pipeline is not inventing differences.

## Stage 6 — Consistency scans

Diffing finds what changed. These scans find what is *wrong*, including defects that have
been sitting in the data for builds. Run them on every build, not only after a change.

### Ladder checks

Many families encode one value per magnification, tier or level. Read the single-purpose
members of the family to recover the intended ladder, then check every multi-member asset
against it.

Worked example: the 34 `GCR_*` camera-recoil assets form a strictly monotonic ladder from
`-0.5` at 1.00x to `0.762266` at 10.00x. Checking every member against it found exactly one
defect in 1.4.2.5 — the SU-230 LPVO's 1x state held `10`, far outside the whole ladder —
and it is fixed in 1.4.3.0. `scripts/frosty-ebx-decode.py` output or the XML both work as
input.

Apply the same shape to any other per-tier family before trusting its values.

### Paired-field disagreement

Where a struct carries two fields that are set together (`Field_7f1bb9d4` /
`Field_9532eb28` in the camera-recoil blocks), a member where the two disagree is a
candidate defect. This is what isolated the SU-230.

### Flag and value mismatch

Where a value is gated by an enable flag (`Field_bbbfe9cc` gated by `Field_bbffe8bc`),
check for:

- flag `True` with a value outside the family's plausible band;
- the two paired fields having different flags;
- a non-zero value left behind on a field whose flag is `False` — inert, but it signals an
  edit that was not finished.

### Multi-package selection

```bash
python scripts/frosty-multi-package-scan.py --root <xml root>
```

On a raw capture, replace `--root` with the [raw mode](../MAINTENANCE.md#raw-mode) arguments.

One attachment action normally selects one shared `U_WPM_*` package. Several packages in
one action can mean an incomplete selector assignment. This found the sniper Slim Angled
grips (ATTACHMENT_BUGS entry 1a) and the M121 A2 / M45A1 ammo packages (entry 2). Each hit
is a candidate for a trace and an in-game check, **not** a confirmed bug.

### Relative-to-default comparison

Compare each option against its weapon's **default** option, never against zero. The first
pass of the magazine review assumed defaults sit at zero; they do not (default Regular
magazines usually carry draw −1). Redoing it relative to the default produced ATTACHMENT_BUGS
entry 10 and reclassified 128 magazines from "bug" to a consistent design pattern.

### Description-versus-effect comparison

Group attachments by identical description text plus resolved modifier set, then look for
groups where the text claims an effect the modifiers do not apply, or applies one the text
does not state. This is the scan that produced most of the bug list. Batch it if the group
count is large; the 14 September pass used seven read-only Codex CLI batches over 333
groups and returned 107 candidates, each then checked against site data, Frosty and
in-game review.

Two rubric traps from that pass, both of which produced false positives:

- treating a `+1` tier modifier as a penalty when it is a benefit;
- assuming a missing effect is a bug when the effect is simply not modelled by the site
  (bipod deployment, match triggers, speedloader tubes).

### String-reference and text comparison

Compare string references by their role and field path in each UI metadata asset, then
resolve them against each build's own localization table and compare the text. A stable
ID can have changed wording, and an unchanged set can hide reassigned label/description
roles. In 1.4.3.0, 234 of 248 changed attachment metadata assets had an identical string
set; this alone did not verify wording. The 16 September review separately compared the
old and new localized text for the recorded attachment labels and descriptions and found
no changes or removed IDs. A generator that reads an old description file cannot verify
new-build wording by reproducing its old output.

When a reference disappears, resolve the id against the **old** strings table — removed
strings are absent from the new one by definition.

## Stage 7 — Map patch notes to assets

Patch-note wording rarely names the asset. Known homes:

| Patch note says | Look in |
|---|---|
| Damage, falloff, sweet spot, minimum damage | `Common/Hardware/Weapons/_Bullets/PD_*` — the curve holds distance **and** damage together |
| Limb / chest / headshot multipliers | Level material grids, via `scripts/frosty-material-grid-inventory.py` — never XML-export a grid |
| Attachment point cost | `Attachment_*` → `Field_6ee865a5` |
| Recoil amount / direction variation | `GS_<weapon>` → `Field_22810b21`, `Field_865174fa` |
| Muzzle velocity | `<weapon>_WB` → `Shot.InitialSpeed.z` (`Field_32a99b9c` inside `Struct_739f3ac5`) |
| Camera shake / visual recoil | `_WeaponModifiers/CameraRecoil/GCR_*` |
| A new option or toggle | A new `Option*` asset, plus a new field on whatever consumes it |

The weapon blueprint is often **not** where a weapon's balance change lives. In 1.4.3.0 the
Interdictor's `_WB` changed only muzzle-flash FX; every damage change was in the bullet
assets and the material grid.

Check the note's wording against what you found. "Incorrect impact visual effects were
corrected" matched only *muzzle-flash* changes in the captured set; say so rather than
forcing the match.

Also review changes the notes do **not** mention. Both the SU-230 camera-recoil fix and the
PiP setting binding were unannounced. Make this a pass of its own: list every changed value
in a weapon, attachment or bullet file that no patch-note line explains, then read the same
field on every other weapon. The count across weapons is what separates a deliberate change
from an error: in 2.1.1.0 the spot-on-fire range became 75 m on four weapons only (M433, SGX,
L110, P18), which no note mentioned.

### In-game names

Read the in-game names of every new weapon, gadget and attachment from the season's name
metadata (`UIWeaponAbilityMetaData_*`, `UIWeaponAttachmentMetadata_*`, the `AAM_*` maps) and
the strings table as a standard step, and add the internal-to-in-game rows to
`reference-data/provenance/frosty-weapon-identities.json` in the research repo. Use in-game
names in every report to the operator; give the internal name only where the file name
itself matters.

### Availability of new content

A record in the files does not mean the item is in the game. Run this census for every new
attachment, ammunition choice, weapon and gadget, and classify each as live, switched off or
future release:

| Needed for "live" | Where |
|---|---|
| An attachment record | `Attachment_<weapon>_*` in the weapon folder |
| An ability branch that binds it | `<weapon>_ability`, branch list `Field_d7605aab` |
| A modifier package in the weapon's list | `<weapon>_WB`, `Field_0cd9f20f` |
| Kill switch not set | `KST_*` row stored `false`; `true` means switched off |

Cross-check against the roadmap dates: an item with all four that the roadmap dates later is
a future release. Two limits found in 2.1.1.0:

- **Ammunition:** the four conditions are necessary, not sufficient. Nine older ammunition
  records meet all of them and are not offered in game. List new ammunition for an in-game
  menu check.
- **Not in the weapon's own `AAM_*` map:** an attachment with a record but no entry in the
  weapon's UI map is unconfirmed. List it for an in-game check; do not count it from
  kill-switch rows alone.

Record each result in the update's checklist (Stage 0): fill in the result column for every
row, add rows for unannounced changes, and complete its outcome section when the work closes.

## Stage 8 — Recheck the known-issue lists

Run this stage on every new build, and on a hotfix whose patch notes list fixes.

### Attachment bug list

For each entry in [ATTACHMENT_BUGS.md](ATTACHMENT_BUGS.md):

1. **Patch notes.** Compare every "fixed" or "corrected" line in the notes with the entry.
   A matching line makes the entry a candidate for resolved; it does not prove it.
2. **Source side.** Did any asset behind the entry change? This rests on hashes, not
   decoding, so it works even when the SDK is stale.
3. **Description side.** Compare string sets per Stage 6. If the metadata does not decode
   with Frosty, decode it per Stage 4 rather than recording the entry as unverified.
4. Re-run the multi-package scan and the relative-to-default comparison.
5. **Decide the status.**
   - Asset changed and the stored values now agree with the text: mark resolved, with the
     build and the changed asset.
   - No asset changed and no patch note matches: the entry stands.
   - No asset changed but a patch note matches, or the entry's behavior is decided in the
     executable (no stored value explains it): the data cannot show a fix. Mark it
     "needs in-game recheck" and list the test. Do not record it as unchanged.
6. Record the result in the document with the date, including "no change" results.

### Other lists

The attachment list is not the only place a known issue lives. Check each of these the same
way (patch-note lines first, then changed assets, then status):

| List | Where | What to recheck |
|---|---|---|
| Vehicle and gadget discrepancies and working proposals | Research repo `docs/working/VEHICLE_SITE_ADDITIONS.md`, `GADGET_SITE_ADDITIONS.md`; `docs/frosty/VEHICLES.md` and `GADGETS.md` | Rows where a stored value disagrees with UI text or an EA statement |
| Open questions | Research repo `docs/frosty/OPEN_QUESTIONS.md` | Questions whose cited assets changed |
| Leads with a reopen condition | `reference-data/frosty/lead-index.json`, field `reopenWhen` | Leads whose condition names a game update, a changed asset or a patch note |
| Model limits | [MODEL_LIMITATIONS.md](MODEL_LIMITATIONS.md), "What would justify an update" | Limits the update may have removed |

For a lead whose cited raw asset changed, reopen it; a receipt at the previous build does not
carry forward (hotfixes with no gameplay change excepted, per Stage 1).

Three parts of the recheck were skipped in 2.1.1.0 because their inputs were not re-read.
Either re-read them from the new raw files or tell the operator before starting that they
are out of scope:

- optic field-of-view assets (attachment bug entry 11);
- reload timing entries (entry 15);
- the selector graph, which is still built from the 1.4.3.0 export and so does not contain
  attachments added since.

Report the outcome to the operator as three lists: resolved, still present, and needs
in-game recheck.

### Recording in-game confirmations

Record every in-game check the operator reports as one line in the update's results file:
date, weapon (in-game name), screen or test (for example "loadout panel" or "firing range,
target at 50 m"), and the value seen. A confirmation without the weapon and screen cannot be
reused later.

## Stage 9 — Update the Analyzer

1. Decide which source changes require site changes. Not every diff does.
2. Apply only those. Preserve the observed / fitted / native-confirmed evidence boundaries.
3. Run the narrow existing checks for the changed areas, not the whole suite.
4. Update source and build labels so retained old data is not presented as newly verified.
   Check the site header, footer, page description and `data/provenance/live-baseline.json`
   as well as per-weapon provenance. Verify the changed values in the local browser.
5. Record the implementation revision and the check results.

### Adding a new weapon

Used for the Mk 24, ELR-40, Z84M and RSPR in 2.1.1.0. Finish the Stage 2 descriptor check and
the Stage 7 availability census first.

1. **Split the site data into three parts**, one worker each, all reading the new build's raw
   files through `scripts/frosty-ebx-decode.py` (no XML export):
   - A: weapon records: fire rate, magazine, reloads, velocity, recoil and spread tables,
     fire modes, role tags, description, Precision table;
   - B: ammunition, ballistics, hit zones, damage curves, collateral;
   - C: attachments, magazines, optic categories, tooltips, dependencies.
2. **Each part proves its method first.** It must reproduce the site's current values for
   every existing weapon from the new build's files, and name the cause of every mismatch,
   before it is run on the new weapons. A method that cannot reproduce the existing roster
   is not used.
3. **Parts write proposals, not site files:** fragments keyed by target file and JSON path,
   with the route and field each value came from, plus a list of what was not found.
4. **The main session checks the proposals against the files**, resolves cross-part
   dependencies (magazine ids, reload exceptions), and integrates from a backup of the data
   files so the integration can be re-run.
5. **Site defaults:** basic barrel, standard ammunition, regular magazine, nothing else,
   whatever the in-game default is.
6. **Things that need a row per weapon:** `reference-data/provenance/frosty-draw-time-*.json`
   and `frosty-optic-category-mapping-*.json` (two tests read them),
   `data/provenance/live-baseline.json`, and the weapon and ammunition counts in `README.md`
   and `docs/`.
7. **Check in the local site** that each weapon loads with its magazines, ammunition and
   attachments, and compare with the operator's in-game panel where the loadouts match.
8. **List for the operator:** values that need an in-game check (ammunition menus, default
   attachments, anything "not found"), and file values that look like game errors, which go
   to [ATTACHMENT_BUGS.md](ATTACHMENT_BUGS.md).

The readers written for 2.1.1.0 (attachment graph, names, kill switches, the three parts'
extractors) are in the research repo under `scripts/update-readers/` (`A/`, `B/`, `C/`; see
its README). For a new build, set the build label and a new working folder in its
`settings.json`, run `regnames.py`, then the parts.

## Haiku workers

Stages 0 to 2 are bounded by Frosty (one process at a time; about 10 minutes for a cache
rebuild plus capture), so workers do not shorten them. From Stage 3 on, most of the time is
mechanical reading that splits into independent parts. Hand those parts to Haiku workers
(`haiku-worker` or `haiku-reader`, Medium effort) and keep the decisions in the main session.
Ready briefs are in the research repo:
[game-update-haiku-briefs.md](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/working/game-update-haiku-briefs.md).

| When | Worker task | Brief |
|---|---|---|
| The day before, once the patch notes are out | Locate every "from" value in the files already held, and the same field on other items | B |
| While the Stage 1 capture runs | Turn the patch notes into a per-item checklist and a list of fixes | A |
| Stage 3, after the comparison | Cross-check patch summary, catalog hash and raw hash; list disagreements | C |
| Stage 5 | Diff triage in batches of about 40 changed files: match by GUID, label the noise categories, list the rest | D |
| Stage 6 | One consistency scan per worker, compared with the previous build's result | E |
| Stage 7 | Confirm each "to" value at the field located the day before | G |
| Stage 8 | One known-issue list per worker: which entries cite a changed asset or match a "fixed" line | F |
| Stage 7, new content | Availability census of every added attachment, ammunition choice, weapon and gadget | H |
| Stage 9, new weapons | One worker per part (A weapon records, B ammunition and ballistics, C attachments): reproduce the existing roster, then propose the new weapons | I |

Launch independent workers together; Stages 5, 6 and 8 can all start as soon as the changed
route list exists.

Not delegated: any Frosty run, the Stage 1 hotfix or new-build decision, `seal`, `record`,
`BUILD.json`, decoder changes and their validation (Stage 4), marking a known issue resolved,
and Stage 9. The 7 October 2026 tests covered Haiku on bounded read-only tasks with a written
brief and a checkable answer; they did not cover writing to the repos or judging models.
About one run in four had a disclosed rule slip, so check each result against the files
before recording it.

## Hazards

- **Material grids.** Never `export-ebx`, `export-ebx-list` or Editor-export a level
  `materialgrid_win32`. It has reached 49–52 GB and crashed the machine. Use the bounded
  reader. After any failed or slow export, check `Get-Process FrostyCmd` and stop it.
- **One FrostyCmd at a time.** Do not parallelise exports. `frosty-capture.py` enforces this
  for raw captures.
- **Batch, don't loop.** `export-ebx-list` loads the cache once; per-asset `export-ebx`
  costs ~14 s each, almost all cache load.
- **Never write to a sealed build.** Its files are read-only, and `guard` stops exports
  into it. Write only to the open build and run `record` after each export.
- **Generator defaults.** Several `scripts/frosty-*.py` write into Analyzer data or
  provenance by default. Pass explicit output paths.
- **Generators mutate their dated inputs.** `frosty-attachment-tooltips.py` writes updated
  pointers back into the `--mapping-json` file it is given. Dated evidence files are
  immutable and are referenced by hash elsewhere, so copy the previous dated file to a new
  date first and pass the copy. Check `git status` after any generator run.
- **A watchlist filter cannot find added assets.** Filtering the catalog diff by watchlist
  membership silently drops everything new, because a new asset is not on the list. Scan
  additions by path shape (`Attachment_`, `U_PRG_`, `WPM_`, `PD_`, `GS_`, `_WB`) as well.
  In 1.4.3.0 that was 12 assets, and they carried all of the update's new content.
- **Overlay roots go stale where Frosty cannot decode.** When building a composite export
  root for the generators, layer the new build's fully decoded assets over the previous
  tree and record which routes were left behind. Any generator that reads one of those
  routes needs `scripts/frosty-ebx-decode.py`, not the overlay.

- **Session folders.** Start the session with the site repo and the research repo as session
  folders as well as the datamining folder; otherwise file edits in them need patch scripts.
- **Line endings.** The site's data files use Windows line endings and
  `json.dumps(indent=2, ensure_ascii=False)` (`weapon_attributes.json` is compact). Preserve
  them when a script rewrites a file, or the diff covers every line.
- **Shell.** Here-documents with quotes fail in the Windows shells used here. Write a script
  or message file and pass its path. Read `$LASTEXITCODE` for pass or fail, not the output.
- **Decoding everything at once.** Decoding all held files in one process used over 5 GB.
  To find references to a GUID, search the raw bytes (little-endian GUID) and decode only
  the hits.

## Recording what you learn

Every reusable fact goes into the shared pages in the session you find it. Do not
create a new document per investigation:

- **[`docs/frosty/`](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/README.md)** — the topic pages: new field meanings in the
  [field map](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/FIELD_MAP.md), asset links in the [data graph](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/DATA_GRAPH.md),
  results in [weapons](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/WEAPONS.md), [attachments](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/ATTACHMENTS.md) or
  [UI text](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/UI_TEXT.md), tool changes in [tools](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/TOOLS.md), and open items in
  [open questions](https://github.com/raymdl/BF6-Frosty-Research/blob/main/docs/frosty/OPEN_QUESTIONS.md).
- **`reference-data/frosty/asset-findings.json`** — per-asset conclusions, with the question asked, the build
  inspected, the evidence pointer and the conditions that would require a revisit. Add a
  superseding finding rather than deleting an old one; mark blocked results
  `blocked-by-decoding` and supersede them when they are unblocked. The file is generated:
  add findings as `record.assets` in a new receipt, then run `python scripts/frosty-records.py build`.
- **`reference-data/frosty/asset-watchlist.json`** — routes to capture next time, with dependencies.
- **`reference-data/provenance/`** — the dated report a finding points at.
