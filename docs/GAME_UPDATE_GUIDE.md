# Game update guide

What to do when Battlefield 6 updates: how to capture the new build, decide what really
changed, decode it correctly, and carry the result into the Analyzer.

This is the durable procedure. The 1.4.3.0 run is the worked example and is kept as a
one-time record in [FROSTY_1.4.3.0_UPDATE_PLAN.md](archive/FROSTY_1.4.3.0_UPDATE_PLAN.md);
read it for the specific paths, counts and decisions of that update, not as the procedure.

Tool commands are in [Frosty tools](frosty/TOOLS.md), field meanings in the
[field map](frosty/FIELD_MAP.md), and the asset watchlist and per-asset findings in
[`reference-data/frosty/`](../reference-data/frosty/README.md). Update them as you learn
things, in the same session ([Recording what you learn](#recording-what-you-learn)).

---

## Stage 0 — Before the update lands

This is the only irreversible step. Once the game files update, an unexported 1.4.2.5
asset is gone.

- Capture the full catalog and the raw EBX for every watched route with
  `scripts/frosty-collect-raw.ps1`. Keep the route list: reusing it on the next build is
  what makes raw hashes directly comparable.
- Retain `Profiles/BF6SDK.dll`, `FrostySdk.dll` and **`SharedTypeDescriptors.ebx`** from
  the runtime folder. The descriptor file is rewritten when the cache rebuilds, so a copy
  taken after the update is the new one — the old one cannot be recovered afterwards.
- Export strings (`fs_us_loc`) for the build.
- Record the executable hash and version, the Frosty archive Head and the SDK version.

Write everything to `research-<build>/`. Never overwrite a previous build's folder.

## Stage 1 — Identify the new build

```bash
# executable identity
powershell -c "$e='C:\Program Files\EA Games\Battlefield 6\bf6.exe'; (Get-Item $e).VersionInfo.FileVersion; (Get-FileHash $e -Algorithm SHA256).Hash"
```

**Do not order builds by the file-version string.** In 1.4.3.0 it went *down*
(`1, 0, 439, 36273` → `1, 0, 437, 12728`) while the hash changed. Use the hash for
identity and the Frosty archive Head for ordering.

Record whether `BF6SDK.dll` and `SharedTypeDescriptors.ebx` changed. They are independent:
the SDK is a local artefact, the descriptors ship with the game. **A descriptor change
with an unchanged SDK is the normal case and it breaks Frosty's decoding** — see Stage 4.

Rename `Caches\bf6.cache` before the first export so Frosty builds a full cache.

## Stage 2 — Capture the new build

Reuse the previous build's route list so the two captures are comparable.

```bash
powershell -File scripts/frosty-collect-raw.ps1 -FrostyDirectory <runtime> -GamePath <game> -OutputDirectory research-<build>/collection -RoutesFile research-<build>/raw-routes.txt
```

Then XML-export the changed subset with the batch command, and export strings. Full
command lines are in [Frosty tools](frosty/TOOLS.md#frostycmd).

Expect raw capture failures only for assets the catalog says were removed. Any other
failure is a real problem.

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
  --descriptors research-<build>/toolchain/SharedTypeDescriptors.ebx \
  --root research-<build>/collection/raw \
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
PiP setting binding were unannounced.

## Stage 8 — Recheck the attachment bug list

For each entry in [ATTACHMENT_BUGS.md](ATTACHMENT_BUGS.md):

1. **Source side.** Did any asset behind the entry change? This rests on hashes, not
   decoding, so it works even when the SDK is stale. If nothing changed, the entry stands.
2. **Description side.** Compare string sets per Stage 6. If the metadata does not decode
   with Frosty, decode it per Stage 4 rather than recording the entry as unverified.
3. Re-run the multi-package scan and the relative-to-default comparison.
4. Record the result in the document with the date, including "no change" results.

## Stage 9 — Update the Analyzer

1. Decide which source changes require site changes. Not every diff does.
2. Apply only those. Preserve the observed / fitted / native-confirmed evidence boundaries.
3. Run the narrow existing checks for the changed areas, not the whole suite.
4. Update source and build labels so retained old data is not presented as newly verified.
   Check the site header, footer, page description and `data/provenance/live-baseline.json`
   as well as per-weapon provenance. Verify the changed values in the local browser.
5. Record the implementation revision and the check results.

## Hazards

- **Material grids.** Never `export-ebx`, `export-ebx-list` or Editor-export a level
  `materialgrid_win32`. It has reached 49–52 GB and crashed the machine. Use the bounded
  reader. After any failed or slow export, check `Get-Process FrostyCmd` and stop it.
- **One FrostyCmd at a time.** Do not parallelise exports.
- **Batch, don't loop.** `export-ebx-list` loads the cache once; per-asset `export-ebx`
  costs ~14 s each, almost all cache load.
- **Never overwrite a previous build's export tree.**
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

## Recording what you learn

Every reusable fact goes into the shared pages in the session you find it. Do not
create a new document per investigation:

- **[`docs/frosty/`](frosty/README.md)** — the topic pages: new field meanings in the
  [field map](frosty/FIELD_MAP.md), asset links in the [data graph](frosty/DATA_GRAPH.md),
  results in [weapons](frosty/WEAPONS.md), [attachments](frosty/ATTACHMENTS.md) or
  [UI text](frosty/UI_TEXT.md), tool changes in [tools](frosty/TOOLS.md), and open items in
  [open questions](frosty/OPEN_QUESTIONS.md).
- **`reference-data/frosty/asset-findings.json`** — per-asset conclusions, with the question asked, the build
  inspected, the evidence pointer and the conditions that would require a revisit. Add a
  superseding finding rather than deleting an old one; mark blocked results
  `blocked-by-decoding` and supersede them when they are unblocked.
- **`reference-data/frosty/asset-watchlist.json`** — routes to capture next time, with dependencies.
- **`reference-data/provenance/`** — the dated report a finding points at.
