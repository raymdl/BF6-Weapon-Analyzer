"""Audit current site attachment identities and resolve source-backed UI text."""

import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess


REPO = Path(__file__).resolve().parent.parent
# The dated evidence files live in the research repository and the reviewed
# panel screenshots in the site repository, so a copy of this script in either
# one reads from the other when its own tree lacks the file.
SIBLINGS = (REPO.parent / "BF6 Frosty Research", REPO.parent / "BF6 Weapon Analyzer")


def local_file(relative):
    """A file of this repository, or of the sibling repository that holds it."""
    for root in (REPO, *SIBLINGS):
        if (root / relative).exists():
            return root / relative
    return REPO / relative
SLOT_CODE = r"(SCP|MZL|BRL|BTM|TOP|RGT|LFT|ERG|MAG|AMO)"


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def without_slot(value):
    return re.sub("_" + SLOT_CODE + "_", "_", value, flags=re.I)


def descriptor_name(value):
    """Retain the weapon and slot; AD barrel names sometimes omit 'Barrel'."""
    value = re.sub(r"^(Attachment_|AD_)", "", value, flags=re.I)
    value = re.sub(r"_MZL_FlashComp_", "_MZL_", value, flags=re.I)
    if "_brl_" in value.lower():
        value = re.sub(r"Barrel$", "", value, flags=re.I)
    return normalized(value)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def current_choices():
    # Use the same availability functions and physical-slot rules as the sidebar.
    script = """
import fs from 'node:fs';
import { availableAttachments, attachmentSlots, getAttPts } from './sim/loadout.js';
import { ATTACHMENT_SLOT_KEYS } from './sim/attachments.js';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const data = { ...read('data/attachments.json'), ...read('data/ammo.json') };
const choices = [];
for (const weapon of read('data/weapons.json')) {
  const mounts = attachmentSlots(weapon, data);
  const slots = ATTACHMENT_SLOT_KEYS.flatMap(({key}) =>
    !['grip', 'laser', 'light'].includes(key) ? [key] :
    key === 'laser' && mounts.rail ? ['rail'] : mounts[key] ? [key] : []);
  for (const mount of [...slots, 'ammo', 'mag', 'ergo']) {
    let items = availableAttachments(weapon, mount, data);
    // Optic evidence stays grouped by the legacy sight categories.
    if (mount === 'sight') {
      const ids = new Set(items.map(item => item.category ?? item.id));
      items = data.SIGHTS.filter(sight => ids.has(sight.id));
    }
    for (const item of items) {
      if (item.id === 'none') continue;
      const slot = mount === 'rail' ? item.type : mount;
      const points = slot === 'ammo' ? data.WEAPON_AMMO[weapon.id].ammo[item.id] :
        slot === 'sight' ? (data.WEAPON_ATTS[weapon.id]?.sightPoints?.[item.id] ?? getAttPts(item)) :
        getAttPts(item, weapon);
      choices.push({ weapon: weapon.id, slot, mount, attachment: item.id,
        siteName: item.name, sitePoints: points });
    }
  }
}
process.stdout.write(JSON.stringify(choices));
"""
    return json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", script], cwd=REPO, text=True))


def source_graph(export, include_optics=False, identities=None):
    base = export.root
    spec = importlib.util.spec_from_file_location("frosty_configuration", REPO / "scripts/frosty-configuration.py")
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    identities = identities or weapon_identities()
    gs_files = {p.stem[3:].lower(): p for p in (base / "Common/Hardware/Weapons").rglob("GS_*.xml")}
    weapons = []
    for identity in identities:
        gs = gs_files[identity["internalId"].lower()]
        wb, = gs.parent.glob("*_WB.xml")
        weapons.append({**identity, "gsXml": gs.relative_to(base).as_posix(),
                        "wbXml": wb.relative_to(base).as_posix()})
    cache, hashes = {}, {}

    def read_xml(path):
        if path not in cache:
            cache[path], hashes[path] = export.load(path)
        return cache[path]

    handling = read_json(local_file("reference-data/provenance/frosty-handling-mapping-followup.json"))
    progressions = defaultdict(list)
    for row in handling["rows"]:
        if "abilityProgression" in row:
            progressions[row["internalId"]].append(row["abilityProgression"])
    rows, issues = cfg.attachment_graph(base, weapons, read_xml, ability_progressions=progressions, include_optics=include_optics)
    return {row.get("sourceKey") or row["attachmentXml"]: row for row in rows}, hashes, issues


IDENTITY_MAPPING = REPO / "reference-data/provenance/frosty-point-cost-mapping-2026-11-10.json"
WEAPON_MAPPING = REPO / "reference-data/provenance/frosty-handling-mapping-2026-11-10.json"
FOLLOWUP = REPO / "reference-data/provenance/frosty-attachment-identity-followup-2026-11-10.json"
DESCRIPTOR_FOLDERS = ("Common/UI/Static/Metadata/Attachments", "Common/Hardware/Weapons")


def weapon_identities(path=WEAPON_MAPPING):
    """[{siteId, internalId}] of every site weapon, from a dated identity file of this repository:
    the handling mapping's identities list, or a file with a weapons list of the same rows."""
    document = read_json(Path(path))
    return [{"siteId": r["siteId"], "internalId": r["internalId"]}
            for r in document.get("identities") or document["weapons"]]


def mapped_identities(mapping=IDENTITY_MAPPING, export=None, slots=None):
    """Reviewed site identities from a dated identity mapping of this repository.

    Every row (weapon, slot, id) names the Attachment_* record(s) of one site entry; the rows of
    the point-cost mapping cover every site cost entry (the earlier full-pass audit, its
    follow-ups and the 2.1.2.0 additions). Returns the shape reviewed_identities returns:
    sources[(weapon, slot, id)] = {attachment .xml path: {mapping file name}}. With a raw
    export the path takes the capture's own letter case (the graph keys)."""
    mapping = Path(mapping)
    sources, reviews = defaultdict(lambda: defaultdict(set)), {}
    reviews[mapping.name] = hashlib.sha256(mapping.read_bytes()).hexdigest()
    for row in read_json(mapping)["rows"]:
        if slots and row["slot"] not in slots:
            continue
        for record in row["records"]:
            path = record if record.lower().endswith(".xml") else record + ".xml"
            if export is not None and export.export is not None:
                path = export.export.files.get(path.lower(), (path,))[0]
            sources[row["weapon"], row["slot"], row["id"]][path].add(mapping.name)
    return sources, reviews


def read_strings(path):
    strings = {}
    with Path(path).open(encoding="utf-8-sig") as source:
        for line in source:
            string_id, text = line.rstrip("\r\n").split("\t", 1)
            strings[string_id] = text
    return strings


def raw_descriptors(export, strings_path, folders=DESCRIPTOR_FOLDERS):
    """The attachment UI descriptor document (frosty-descriptions.py shape) read from the
    capture's AD_* assets and the build's English string table."""
    strings = read_strings(strings_path)

    def resolve(root, reference):
        value = root.findtext(f"Class_535682be/{reference}")
        if not value or not value.startswith("[Class_fbe1d3bc] "):
            return {"error": f"missing reference: {value}"}
        target = root.find(f"Class_fbe1d3bc[@Guid='{value.split(' ', 1)[1]}']")
        raw_id = target.findtext("Field_3d34898a") if target is not None else None
        if not raw_id or not raw_id.startswith("0x"):
            return {"error": f"missing string id: {raw_id}"}
        result = {"id": raw_id[2:].upper()}
        if result["id"] in strings:
            result["text"] = strings[result["id"]]
        else:
            result["error"] = "id absent from English string table"
        return result

    records = []
    for folder in folders:
        for path in sorted((export.root / folder).rglob("AD_*.xml")):
            root, digest = export.load(path.relative_to(export.root).as_posix())
            main = root.find("Class_535682be")
            record = {"asset": main.findtext("Field_0c59fa06") if main is not None else None, "xmlSha256": digest,
                      "label": resolve(root, "Field_33a358a7"), "description": resolve(root, "Field_490f0dd0")}
            if record["description"].get("error") == "id absent from English string table":
                record["reviewStatus"] = "description-review-required"
            records.append(record)
    return {"sourceStrings": Path(strings_path).name,
            "sourceStringsSha256": hashlib.sha256(Path(strings_path).read_bytes()).hexdigest(),
            "count": len(records), "attachments": records}


def reviewed_identities(audit_file="frosty-attachment-full-pass-2026-09-06.json",
                        barrel_file="frosty-barrel-ads-2026-09-13.json"):
    """audit_file and barrel_file: a name in reference-data/provenance, or a full path."""
    sources, reviews = defaultdict(lambda: defaultdict(set)), {}
    audit_name, barrel_name = Path(audit_file).name, Path(barrel_file).name

    def review(name):
        path = local_file(Path("reference-data/provenance") / name)
        reviews[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
        return read_json(path)

    audit = review(audit_file)
    handling_followup = review("frosty-handling-mapping-followup.json")
    excluded = {r["attachmentXml"] for r in handling_followup["excludedSourceAttachments"]}
    for row in audit["candidateComparisons"]:
        if row.get("status") != "mapped" or row.get("attachmentXml") in excluded:
            continue
        if not all(row.get(k) for k in ("siteWeaponId", "slot", "siteId")):
            continue
        option = row["siteId"]
        unlock = Path(row.get("unlock") or "").name
        if row["slot"] == "muzzle":
            # The later review corrected the old audit's reversed labels.
            if unlock.startswith("U_WPM_MZL_ImprvdSuppressor01_"):
                option = "cqb_supp"
            elif unlock.startswith("U_WPM_MZL_ImprvdSuppressor02_"):
                option = "light_supp"
        sources[row["siteWeaponId"], row["slot"], option][row["attachmentXml"]].add(audit_name)

    def replace(rows, name):
        grouped = defaultdict(lambda: defaultdict(set))
        for key, path in rows:
            grouped[key][path].add(name)
        sources.update(grouped)

    followup = review("frosty-attachment-followup-2026-09-06.json")
    replace([((r["weapon"], "muzzle", "cqb_supp"), r["attachmentXml"]) for r in followup["cqb"]],
            "frosty-attachment-followup-2026-09-06.json")
    barrels = review(barrel_file)
    replace([((r["weapon"], "barrel", r["barrel"]), r["attachment"]) for r in barrels["rows"]], barrel_name)
    handling = review("frosty-attachment-handling-generated.json")
    if handling["additionalIdentitiesSha256"] != reviews["frosty-handling-mapping-followup.json"]:
        raise ValueError("Handling identity review changed; regenerate its source mapping first")
    replace([((r["weapon"], r["slot"], r["attachment"]), path)
             for r in handling["rows"] for path in r["sourceAttachments"]],
            "frosty-attachment-handling-generated.json")
    identities = review("frosty-attachment-identity-followup-2026-10-25.json")
    replace([((r["weapon"], r["slot"], r["attachment"]), r["attachmentXml"])
             for r in identities["rows"]],
            "frosty-attachment-identity-followup-2026-10-25.json")
    return sources, reviews


def ui_indexes(aam_root, descriptors, load):
    names, rails, assets_by_name = defaultdict(set), defaultdict(set), defaultdict(set)
    records, hashes = defaultdict(list), {}
    files = sorted(aam_root.rglob("AAM_*.xml"))
    if not files:
        raise FileNotFoundError(f"No AAM_* XML files under {aam_root}")
    for path in files:
        root, digest = load(path)
        aam_asset = root.findtext("Class_d46324bc/Field_0c59fa06")
        hashes[aam_asset] = digest
        for record in root.findall("Class_ccf7da47"):
            name = record.findtext("Field_55aded8d") or ""
            pointer = record.findtext("Field_85b318a1") or ""
            if not pointer.startswith("[Ebx] "):
                continue
            asset = pointer[6:].split(" [", 1)[0].lower()
            names[normalized(name)].add(asset)
            rails[normalized(re.sub(r" - (RGT|LFT|TOP) - ", " - ", name))].add(asset)
            records[normalized(name)].append({
                "aamAsset": aam_asset, "recordGuid": record.get("Guid"), "name": name,
                "descriptionAsset": asset})
    for asset, record in descriptors.items():
        assets_by_name[descriptor_name(record["asset"].rsplit("/", 1)[-1])].add(asset)
        if "/shared/" in asset:
            model = re.sub(r"_(LeftRail|RightRail|TopRail)$", "", record["asset"].rsplit("/", 1)[-1], flags=re.I)
            model = re.sub(r"^AD_Shared_MZL_FlashComp_", "AD_", model, flags=re.I)
            model = re.sub(r"^AD_Shared_ERG_Quickdraw(Pistol|Revolver)$", r"AD_\1Quickdraw", model, flags=re.I)
            assets_by_name["shared:" + descriptor_name(model)].add(asset)
    return names, rails, assets_by_name, records, hashes


def weapon_ui(name, slot, indexes, slots_by_name):
    names, rails, assets_by_name, records, _ = indexes
    key = normalized(name)
    if names.get(key):
        return {"method": "aam-full-name", "assets": sorted(names[key]), "aamRecords": records[key]}
    short = normalized(without_slot(name))
    if len(slots_by_name.get(short, set())) == 1 and names.get(short):
        return {"method": "aam-without-slot", "assets": sorted(names[short]), "aamRecords": records[short]}
    rail = normalized(re.sub(r"_(RGT|LFT|TOP)_", "_", name, flags=re.I))
    if slot in ("laser", "light") and len(slots_by_name.get(rail, set())) == 1 and rails.get(rail):
        return {"method": "aam-without-rail-side", "assets": sorted(rails[rail])}
    direct = assets_by_name.get(descriptor_name(name), set())
    if direct:
        return {"method": "weapon-descriptor-asset-name", "assets": sorted(direct)}
    if slot in ("muzzle", "grip", "laser", "light", "ergo"):
        parts = re.split(r"_(?:MZL|BTM|RGT|LFT|TOP|ERG)_", name, maxsplit=1, flags=re.I)
        if len(parts) == 1 and slot == "grip":
            # Some grip attachment names omit BTM; the reviewed category supplies the slot.
            parts = name.split("_", 1)
        shared = assets_by_name.get("shared:" + normalized(parts[-1]), set()) if len(parts) == 2 else set()
        if shared:
            return {"method": "shared-hardware-descriptor-name", "assets": sorted(shared)}
    return None


def source_details(row):
    selectors = {}
    for branch in row["branches"]:
        for action in branch["actions"]:
            for selector in action["selectors"]:
                unlock = selector["unlock"]
                key = (unlock["asset"], unlock["guid"])
                selectors[key] = {**unlock, "bound": bool(selector["wbModifiers"] or selector["gsBindings"])}
    return {
        "kind": "attachment" if row["attachmentXml"] else "ability-progression",
        "attachmentGuid": row.get("attachmentGuid"), "category": row.get("category"),
        "progression": row.get("progression"), "rawPointCost": row.get("rawPointCost"),
        "abilityBranches": [{"asset": b["abilityXml"], "guid": b["guid"]} for b in row["branches"]],
        "selectors": [selectors[k] for k in sorted(selectors)],
    }


def source_name(row):
    path = row["attachmentXml"] or row["progression"]["asset"]
    return re.sub(r"^(Attachment_|U_PRG_)", "", Path(path).stem, flags=re.I)


def shared_model_key(name, slot, details):
    if slot not in ("muzzle", "grip", "laser", "light", "ergo", "ammo"):
        return None
    parts = re.split(r"_(?:MZL|BTM|RGT|LFT|TOP|ERG|AMO)_", name, maxsplit=1, flags=re.I)
    selectors = details["selectors"]
    if len(parts) != 2 or not selectors or not all(s["bound"] for s in selectors):
        return None
    return slot, normalized(parts[1]), tuple((s["asset"], s["guid"]) for s in selectors)


def magazine_label_link(internal_id, site_id, descriptors):
    """A magazine whose weapon AAM lists no record (the 2.1.2.0 belts and tubes): the one
    descriptor in the weapon's own UI folder whose MAG label reads the site id ("75 RND" is
    75_rnd, "100 FAST" is 100_fast). Used only when every AAM-based link fails."""
    folder = f"common/ui/static/metadata/attachments/{internal_id.lower()}/"
    matches = sorted(asset for asset, record in descriptors.items()
                     if asset.startswith(folder) and "_mag_" in asset.rsplit("/", 1)[-1]
                     and re.sub(r"\s+", "_", (record.get("label", {}).get("text") or "").strip().lower()) == site_id)
    return {"method": "weapon-magazine-descriptor-label", "assets": matches} if len(matches) == 1 else None


def description_consensus(assets, descriptors):
    if not assets:
        return None
    entries = [descriptors.get(asset, {}).get("description", {}) for asset in assets]
    texts = {entry.get("text") for entry in entries}
    if len(texts) != 1 or None in texts or "" in texts:
        return None
    return sorted({entry["id"] for entry in entries})


def audit(choices, graph, sources, indexes, descriptors, ui_reviews=()):
    reviewed_links = {(r["source"], r["slot"]): r for r in ui_reviews}
    slots_by_name = defaultdict(set)
    for (weapon, slot, option), paths in sources.items():
        for path in paths:
            if path in graph:
                slots_by_name[normalized(without_slot(source_name(graph[path])))].add(slot)
    links, details, shared = {}, {}, defaultdict(list)
    for (weapon, slot, option), paths in sources.items():
        for path in paths:
            if path not in graph:
                continue
            details[path] = source_details(graph[path])
            name = source_name(graph[path])
            link = weapon_ui(name, slot, indexes, slots_by_name)
            review = reviewed_links.get((path, slot))
            if review:
                current = set(link["assets"] if link else [])
                if not set(review["candidateAssets"]) <= current or (current and not review["candidateAssets"]):
                    raise ValueError(f"Reviewed UI candidates changed: {path}")
                if current - set(review["candidateAssets"]):
                    # A descriptor the reviewed descriptor batch lacked (the raw read lists every
                    # AD_* asset). The review still selects its asset by the panel text below.
                    print(f"note: reviewed UI link {path} has candidates the review did not list: "
                          f"{sorted(current - set(review['candidateAssets']))}")
                asset = review["descriptionAsset"]
                if (link and asset not in link["assets"]) or descriptors[asset]["description"].get("text") != review.get("sourceDescription", review["observedDescription"]):
                    raise ValueError(f"Reviewed UI text changed: {path}")
                method = "reviewed-source-alias-with-text-difference" if review.get("descriptionMismatch") else (
                    "screenshot-reviewed-ui-candidate" if link else "screenshot-reviewed-source-description")
                link = {"method": method,
                        "assets": [asset], "review": review}
            links[path, slot] = link
            model = shared_model_key(name, slot, details[path])
            # Include unresolved IDs: an incomplete or conflicting source must
            # not be hidden by a convenient peer with usable English text.
            if model and link:
                shared[model].append({"weapon": weapon, "source": path, **link})

    text_by_id = {r["description"]["id"]: r["description"]["text"] for r in descriptors.values()
                  if "text" in r["description"]}
    records, by_weapon, used_ids = [], {}, set()
    for choice in choices:
        key = choice["weapon"], choice["slot"], choice["attachment"]
        record = {**choice, "sources": []}
        if choice["slot"] == "sight":
            record["identityStatus"] = "category-not-audited"
            record["descriptionStatus"] = "category-not-audited"
            records.append(record)
            continue
        ids, failures = set(), []
        for path, reviews in sorted(sources.get(key, {}).items()):
            item = {"source": path, "identityReviews": sorted(reviews)}
            record["sources"].append(item)
            if path not in graph:
                item["status"] = "source-missing-from-current-graph"
                failures.append(item["status"])
                continue
            item.update(details[path])
            if not item["abilityBranches"]:
                item["status"] = "source-has-no-ability-branch"
                failures.append(item["status"])
                continue
            link = links[path, choice["slot"]]
            if not link:
                model = shared_model_key(source_name(graph[path]), choice["slot"], details[path])
                anchors = shared.get(model, [])
                assets = sorted({asset for anchor in anchors for asset in anchor["assets"]})
                if description_consensus(assets, descriptors):
                    link = {"method": "shared-model-and-selector-consensus", "assets": assets,
                            "anchors": sorted(anchors, key=lambda a: (a["weapon"], a["source"]))}
            if not link and choice["slot"] == "mag":
                link = magazine_label_link(graph[path]["weapon"], choice["attachment"], descriptors)
            if not link:
                item["status"] = "description-link-missing"
                failures.append(item["status"])
                continue
            item["uiLink"] = link
            if link["method"] not in ("shared-model-and-selector-consensus", "shared-hardware-descriptor-name") and len(link["assets"]) != 1:
                item["status"] = "ambiguous-description-link"
                failures.append(item["status"])
                continue
            resolved = description_consensus(link["assets"], descriptors)
            if not resolved:
                item["status"] = "english-description-missing-or-conflicting"
                if all(descriptors.get(a, {}).get("reviewStatus") == "description-review-required" for a in link["assets"]):
                    item["reviewStatus"] = "description-review-required"
                    item["reviewReason"] = "English description record deferred for later review; resolved source identity retained."
                failures.append(item["status"])
                continue
            item["status"] = "linked"
            ids.update(resolved)
        identity_failures = {"source-missing-from-current-graph", "source-has-no-ability-branch"}
        record["identityStatus"] = (
            "source-unmapped" if not record["sources"] else
            "source-unverified" if identity_failures.intersection(failures) else "source-linked")
        if not record["sources"]:
            record["descriptionStatus"] = "source-unmapped"
        elif failures:
            record["descriptionStatus"] = ";".join(sorted(set(failures)))
            failed_sources = [s for s in record["sources"] if s.get("status") != "linked"]
            if all(s.get("reviewStatus") == "description-review-required" for s in failed_sources):
                record["reviewStatus"] = "description-review-required"
        elif len({text_by_id[string_id] for string_id in ids}) != 1:
            record["descriptionStatus"] = "source-descriptions-conflict"
        else:
            record["descriptionStatus"] = "linked"
            record["descriptionIds"] = sorted(ids)
            selected_id = min(ids)
            by_weapon.setdefault(key[0], {}).setdefault(key[1], {})[key[2]] = selected_id
            used_ids.add(selected_id)
        records.append(record)
    return records, by_weapon, used_ids


def screenshot_matches(review):
    """The reviewed image still hashes to its recorded SHA-256. The images live in the ignored
    attachment-audit folder of the working copy that holds them; a checkout without the image
    keeps the recorded hash and text, so the check only runs where the image is present."""
    path = local_file(review["screenshot"])
    return not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() == review["screenshotSha256"]


def apply_screenshot_tooltips(records, by_weapon, reviews):
    """Use reviewed panel text per choice without replacing Frosty pointers or IDs."""
    choices = {(r["weapon"], r["slot"], r["attachment"]): r for r in records}
    descriptions = {}
    for review in reviews:
        key = review["weapon"], review["slot"], review["attachment"]
        record = choices[key]
        # A linked English string can still differ from the live panel (stale or
        # wrong pointer text). Only an explicit review flag may replace it.
        allowed = {"english-description-missing-or-conflicting"}
        if review.get("status") == "linked-text-differs-from-panel":
            allowed.add("linked")
        if record["identityStatus"] != "source-linked" or record["descriptionStatus"] not in allowed:
            raise ValueError(f"Screenshot tooltip no longer targets an unresolved description: {key}")
        if len(record["sources"]) != 1 or record["sources"][0]["source"] != review["source"]:
            raise ValueError(f"Screenshot tooltip source changed: {key}")
        if record["sources"][0]["uiLink"] != review["originalUiLink"]:
            raise ValueError(f"Screenshot tooltip UI link changed: {key}")
        if "screenshot" in review:
            if not screenshot_matches(review):
                raise ValueError(f"Screenshot tooltip image changed: {key}")
            evidence = {"screenshot": review["screenshot"], "screenshotSha256": review["screenshotSha256"]}
        elif review.get("operatorConfirmation"):
            # Text the operator read in game and confirmed, with no saved image.
            evidence = {"operatorConfirmation": review["operatorConfirmation"]}
        else:
            raise ValueError(f"Panel tooltip has neither an image nor an operator confirmation: {key}")
        text = review["observedDescription"]
        if not text.strip():
            raise ValueError(f"Screenshot tooltip is empty: {key}")
        # This is a runtime lookup key, never a recovered Frosty string ID.
        description_key = "screenshot:" + ":".join(key)
        descriptions[description_key] = text
        by_weapon.setdefault(key[0], {}).setdefault(key[1], {})[key[2]] = description_key
        record["descriptionStatus"] = "screenshot-verified"
        record.pop("reviewStatus", None)
        record["tooltipDescriptionKey"] = description_key
        record["tooltipSource"] = {
            "kind": "user-reviewed-game-panel", **evidence,
            "originalFrostyStringIds": sorted({r["descriptionStringId"] for r in review["pointerEvidence"]}),
            "note": "Panel text approved for this choice; it also resolves the missing string ID for the choices that link it. Original Frosty UI links and missing English IDs are retained in sources.",
        }
    return descriptions


def apply_string_id_tooltips(records, by_weapon, descriptors, panel_descriptions):
    """An approved panel also resolves the missing string ID it was captured for.

    The game renders one localized string per ID, so every choice whose linked
    descriptor carries that ID shows the panel text. Only IDs absent from the
    English string table are resolved, every approved panel for an ID has to
    agree, and the ID itself is the runtime key.
    """
    missing = {r["description"]["id"] for r in descriptors.values()
               if r["description"].get("id") and not r["description"].get("text")}
    texts, panels = defaultdict(set), defaultdict(list)
    for record in records:
        if record.get("descriptionStatus") != "screenshot-verified":
            continue
        ids = record["tooltipSource"]["originalFrostyStringIds"]
        if len(ids) == 1 and ids[0] in missing:
            texts[ids[0]].add(panel_descriptions[record["tooltipDescriptionKey"]])
            panels[ids[0]].append(":".join((record["weapon"], record["slot"], record["attachment"])))
    for string_id, observed in texts.items():
        if len(observed) != 1:
            raise ValueError(f"Approved panels disagree on string {string_id}: {sorted(observed)}")
    descriptions = {}
    for record in records:
        if record.get("descriptionStatus") != "english-description-missing-or-conflicting" or len(record["sources"]) != 1:
            continue
        link = record["sources"][0].get("uiLink") or {}
        ids = {descriptors.get(asset.lower(), {}).get("description", {}).get("id") for asset in link.get("assets", [])}
        if len(ids) != 1 or not ids & texts.keys():
            continue
        string_id, = ids
        text, = texts[string_id]
        descriptions[string_id] = text
        key = record["weapon"], record["slot"], record["attachment"]
        by_weapon.setdefault(key[0], {}).setdefault(key[1], {})[key[2]] = string_id
        record["descriptionStatus"] = "panel-resolved-string-id"
        record.pop("reviewStatus", None)
        record["descriptionIds"] = [string_id]
        record["tooltipDescriptionKey"] = string_id
        record["tooltipSource"] = {
            "kind": "user-reviewed-game-panel-string-id", "stringId": string_id, "panels": sorted(panels[string_id]),
            "note": "Text of the approved panels that resolve this missing string ID. Original Frosty UI links are retained in sources.",
        }
    return descriptions


def optic_category(label):
    label = label.strip()
    if label == "Basic Sight":
        return "iron"
    if label == "Thermal Hybrid":
        return "therm_hyb"
    if label.startswith("Thermal "):
        return "thermal"
    if label.startswith(("Sight ", "Scope ")):
        return "std_optic"
    # Classify from the label only, so the source cost stays an independent check.
    # A new Variable range needs review; do not infer a magnification threshold.
    return {"Variable 1-4x": "var_low", "Variable 1.5-4.5x": "var_low",
            "Variable 1-5x": "var_high", "Variable 1-6x": "var_high",
            "Variable 2-8x": "var_high", "Variable 3-10x": "var_high"}.get(label)


def optic_categories(choices, graph, indexes, descriptors, identities=None):
    identities = identities or weapon_identities()
    site_ids = {r["internalId"].lower(): r["siteId"] for r in identities}
    rows = [r for r in graph.values() if (r.get("category") or {}).get("asset", "").endswith("_Sight")]
    links, peers, token_assets = {}, defaultdict(set), defaultdict(set)
    for row in rows:
        name = source_name(row)
        link = weapon_ui(name, "sight", indexes, {normalized(without_slot(name)): {"sight"}})
        if not link and normalized(name.split("_SCP_", 1)[-1]) == "ironsights":
            weapon = row["weapon"].lower()
            asset = f"common/ui/static/metadata/attachments/{weapon}/ad_{weapon}_sight"
            if asset in descriptors:
                link = {"method": "same-weapon-iron-sight-descriptor", "assets": [asset]}
        details = source_details(row)
        key = (normalized(name.split("_SCP_", 1)[-1]),
               tuple((s["asset"], s["guid"]) for s in details["selectors"]))
        links[row["attachmentXml"]] = (link, key, details)
        if link and details["selectors"] and all(s["bound"] for s in details["selectors"]):
            peers[key].update(link["assets"])
        if link and link["method"] in ("aam-full-name", "aam-without-slot"):
            token_assets[key[0]].add(tuple(link["assets"]))
    members, unresolved = [], []
    for row in rows:
        path = row["attachmentXml"]
        link, key, details = links[path]
        if not link and peers[key] and details["selectors"] and all(s["bound"] for s in details["selectors"]):
            link = {"method": "same-optic-model-and-selector", "assets": sorted(peers[key])}
        if not link and len(token_assets.get(key[0], ())) == 1 and key[0] != "ironsights":
            # A weapon whose AAM lists no record for an optic every AAM-linked weapon links to one
            # and the same descriptor (the PA-SL 2.50x on the PSR and SV-98 in 2.1.2.0).
            link = {"method": "same-optic-record-token-aam-consensus", "assets": list(next(iter(token_assets[key[0]])))}
        assets = link["assets"] if link else []
        labels = {descriptors.get(a, {}).get("label", {}).get("text") for a in assets}
        point_cost = int(row["rawPointCost"], 16)
        label = next(iter(labels)) if len(labels) == 1 and None not in labels else None
        category = optic_category(label) if label else None
        classification = "English UI label and site point category"
        if not category and normalized(source_name(row).split("_SCP_", 1)[-1]) == "ironsights" and any(
                s["asset"].rsplit("/", 1)[-1] == "U_WPM_IronSights" and s["bound"] for s in details["selectors"]):
            category = "iron"
            classification = "Exact IronSights attachment name and bound U_WPM_IronSights selector; UI label unresolved"
        item = {"weapon": site_ids[row["weapon"].lower()], "source": path,
                **details, "sourcePointCost": point_cost, "label": label, "category": category,
                "classification": classification, "uiLink": link,
                "descriptions": [{"asset": a, **descriptors.get(a, {}).get("description", {})} for a in assets]}
        if not category or not details["abilityBranches"]:
            item["status"] = "category-review-required"
            unresolved.append(item)
        else:
            item["status"] = "category-member"
            members.append(item)
    categories = []
    for choice in choices:
        if choice["slot"] != "sight":
            continue
        matches = [r for r in members if r["weapon"] == choice["weapon"] and r["category"] == choice["attachment"]]
        categories.append({**choice, "status": "category-linked" if matches else "category-review-required",
                           "members": matches})
    return {"scope": "Individual source sights grouped under existing site categories; not one-to-one identities or live availability proof. Categories come from English UI labels only; Variable Low/High are explicit label lists, not a magnification threshold.",
            "coverage": {"siteCategories": len(categories), "linkedCategories": sum(bool(r["members"]) for r in categories),
                         "sourceSights": len(rows), "classifiedSights": len(members), "unresolvedSights": len(unresolved)},
            "categories": categories, "unresolvedSources": unresolved,
            "membersOutsideSiteCategories": [r for r in members if not any(c["weapon"] == r["weapon"] and c["attachment"] == r["category"] for c in categories)]}


def iron_sight_tooltips(optics, by_weapon):
    """Use source text, with the user-selected defaults for multi-variant irons."""
    defaults = {
        "m16a4": "common/ui/static/metadata/attachments/m16a3/ad_m16a3_ironsights",
        "umg40": "common/ui/static/metadata/attachments/ump40/ad_ump40_sight",
        # The multiplayer name lists (10 November 2026) give these two a second variant with other text.
        "m4a1": "common/ui/static/metadata/attachments/m4a1/ad_m4a1_sight",
        "pw7a2": "common/ui/static/metadata/attachments/mp7a2/ad_mp7a2_sight",
    }
    unconfirmed = {"m4a1", "pw7a2"}
    descriptions = {}
    for category in optics["categories"]:
        if category["attachment"] != "iron":
            continue
        rows = [d for member in category["members"] for d in member["descriptions"]]
        if category["weapon"] in defaults:
            rows = [d for d in rows if d["asset"] == defaults[category["weapon"]]]
            if not rows:
                raise ValueError(f"Default iron-sight descriptor missing: {category['weapon']}")
        if not rows or any(not d.get("text") for d in rows):
            continue
        texts = sorted({d["text"] for d in rows})
        if len(texts) != 1:
            continue
        ids = sorted({d["id"] for d in rows})
        key = ids[0]
        descriptions[key] = texts[0]
        by_weapon.setdefault(category["weapon"], {}).setdefault("sight", {})["iron"] = key
        category["tooltipDescriptionKey"] = key
        category["tooltipSourceIds"] = ids
        category["tooltipStatus"] = "source-linked"
        if category["weapon"] in defaults:
            category["tooltipDefaultDescriptor"] = defaults[category["weapon"]]
            category["tooltipDefaultReason"] = (
                "The weapon's plain iron-sight record (Attachment_*_SCP_IronSights), by the same rule as the user-selected M16A4 and UMG-40 defaults; not yet confirmed in game. Other category members are retained as evidence only."
                if category["weapon"] in unconfirmed else
                "User selected the default iron sights: Classic on M16A4; basic aperture on UMG-40. Other category members are retained as evidence only.")
    return descriptions


GENERATOR = "frosty-attachment-tooltips"
# Data sections this check compares, read by frosty-check-all.py --stamp (data/provenance/data-status.json):
# (file, section, fields); fields None = the whole section. None of its own: its output is the input of optic-tooltips.py,
# which compares data/attachment-tooltips.json.
COVERS = []


def owned_leaves(document):
    """{(weapon, slot, id): (key, text)} of the leaves this generator writes: every slot but the
    individual optics (scripts/optic-tooltips.py writes those); the sight slot's iron entry."""
    leaves = {}
    for weapon, slots in document["byWeapon"].items():
        for slot, items in slots.items():
            for item, key in items.items():
                if slot == "sight" and item != "iron":
                    continue
                leaves[weapon, slot, item] = (key, document["descriptions"].get(key))
    return leaves


def apply_deviations(by_weapon, descriptions, overrides, choices):
    """Rows of data-src/overrides-tooltips.json for this generator: the site keeps siteValue (a
    description key, null = no tooltip) where the files give sourceValue. siteText is the text of a
    siteValue key the files do not supply. Returns the report rows; every status but applied fails."""
    offered = {(c["weapon"], c["slot"], c["attachment"]) for c in choices}
    offered |= {(w, "sight", "iron") for w, _, _ in offered}
    report = []
    for row in overrides:
        key = row["weapon"], row["slot"], row["id"]
        generated = by_weapon.get(key[0], {}).get(key[1], {}).get(key[2])
        if key not in offered:
            status = "UNUSED"
        elif generated == row["siteValue"] and (row.get("siteText") is None or descriptions.get(generated) == row["siteText"]):
            status = "REDUNDANT"
        elif generated != row["sourceValue"]:
            status = "STALE"
        else:
            status = "applied"
            slot = by_weapon.setdefault(key[0], {}).setdefault(key[1], {})
            if row["siteValue"] is None:
                slot.pop(key[2], None)
            else:
                slot[key[2]] = row["siteValue"]
                if row.get("siteText") is not None:
                    descriptions[row["siteValue"]] = row["siteText"]
        report.append({"overrideId": row.get("overrideId"), "weapon": key[0], "slot": key[1], "id": key[2],
                       "status": status, "source": generated, "reviewedSource": row["sourceValue"],
                       "siteValue": row["siteValue"]})
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__ + """

Raw mode reads the capture: hardware graph, AAM_* records, AD_* descriptors (with --strings, the
build's fs_us_loc.strings.tsv) and the reviewed identities of this repository (--identity-mapping,
--weapon-identities, --followup). The output holds every non-optic tooltip and the iron sights;
scripts/optic-tooltips.py adds the individual optics and writes data/attachment-tooltips.json.
Deviations the site keeps are rows in data-src/overrides-tooltips.json, reported applied, STALE,
REDUNDANT or UNUSED. --check writes no site data (output_json, when given, is still written) and
exits 1 on any difference between the generated leaves and the committed file, or any deviation
row not applied.""",
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    spec = importlib.util.spec_from_file_location("frosty_raw_tree", REPO / "scripts/frosty-raw-tree.py")
    raw_tree = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(raw_tree)
    parser.add_argument("aam_xml_root", type=Path,
                        help="Folder holding the AAM_* XML files; with --raw, a folder inside the raw export")
    parser.add_argument("output_json", type=Path, nargs="?",
                        help="Generated non-optic and iron-sight tooltips (input of optic-tooltips.py)")
    parser.add_argument("--frosty-root", type=Path)
    raw_tree.add_raw_arguments(parser)
    parser.add_argument("--mapping-json", type=Path,
                        help="Write a source identity and description audit for every current site choice")
    parser.add_argument("--optic-mapping-json", type=Path,
                        help="Audit individual Frosty sights against the existing generic site categories")
    parser.add_argument("--strings", type=Path,
                        help="fs_us_loc.strings.tsv of the build: read the AD_* descriptors from the input "
                             "instead of a --descriptions file")
    parser.add_argument("--descriptions", type=Path,
                        help="Attachment UI labels and descriptions written by frosty-descriptions.py (without --strings)")
    parser.add_argument("--identity-mapping", type=Path, default=IDENTITY_MAPPING,
                        help="Dated identity mapping whose rows supply the attachment identities")
    parser.add_argument("--identity-audit", type=Path,
                        help="Legacy: research full-pass audit (with --barrel-mapping) in place of --identity-mapping")
    parser.add_argument("--barrel-mapping", type=Path, help="Legacy: reviewed barrel identity rows")
    parser.add_argument("--weapon-identities", type=Path, default=WEAPON_MAPPING,
                        help="Dated file whose identities (or weapons) list maps site ids to internal ids")
    parser.add_argument("--followup", type=Path, default=FOLLOWUP,
                        help="Identity follow-up with the UI-link reviews and approved panel texts")
    parser.add_argument("--overrides", type=Path, default=REPO / "data-src/overrides-tooltips.json",
                        help="Reviewed deviations; rows with generator frosty-attachment-tooltips are applied")
    parser.add_argument("--site", type=Path, default=REPO / "data/attachment-tooltips.json",
                        help="Committed tooltip file --check compares with")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not args.check and not args.output_json:
        parser.error("give output_json, or --check")
    export = raw_tree.open_input(parser, args, args.frosty_root)
    if args.raw:
        aam_root, load_aam = export.root / args.aam_xml_root, export.load
    else:
        # The AAM folder is separate from the export root; its paths are read as given.
        aam_root, load_aam = args.aam_xml_root, raw_tree.Input(xml_root=Path()).load
    if args.strings:
        descriptor_document = raw_descriptors(export, args.strings)
        descriptor_sha = hashlib.sha256(json.dumps(descriptor_document, sort_keys=True).encode()).hexdigest()
    else:
        if not args.descriptions:
            parser.error("give --strings (raw descriptors) or --descriptions")
        descriptor_document = read_json(args.descriptions)
        descriptor_sha = hashlib.sha256(args.descriptions.read_bytes()).hexdigest()
    descriptors = {r["asset"].lower(): r for r in descriptor_document["attachments"]}
    # MG5 stores its iron-sight descriptor with the weapon, outside the UI batch.
    extra_asset = "Common/Hardware/Weapons/MG/MG5/AD_MG5_IronSights"
    extra_root, extra_sha = export.load(extra_asset + ".xml")
    if extra_asset.lower() not in descriptors:
        pointer = extra_root.findtext("Class_535682be/Field_490f0dd0").split()[-1]
        string_id = extra_root.find(f"Class_fbe1d3bc[@Guid='{pointer}']/Field_3d34898a").text[2:].upper()
        text_by_id = {r["description"]["id"]: r["description"]["text"] for r in descriptors.values() if r["description"].get("text")}
        descriptors[extra_asset.lower()] = {"asset": extra_asset, "label": {},
            "xmlSha256": extra_sha,
            "description": {"id": string_id, "text": text_by_id[string_id]}}
    choices = current_choices()
    identities = weapon_identities(args.weapon_identities)
    if args.identity_audit:
        sources, review_hashes = reviewed_identities(args.identity_audit, args.barrel_mapping or "frosty-barrel-ads-2026-09-13.json")
    else:
        sources, review_hashes = mapped_identities(args.identity_mapping, export)
    review_hashes[args.weapon_identities.name] = hashlib.sha256(args.weapon_identities.read_bytes()).hexdigest()
    graph, graph_hashes, graph_issues = source_graph(export, include_optics=bool(args.optic_mapping_json), identities=identities)
    graph_hashes[extra_asset + ".xml"] = descriptors[extra_asset.lower()]["xmlSha256"]
    indexes = ui_indexes(aam_root, descriptors, load_aam)
    if args.optic_mapping_json:
        optics = optic_categories(choices, graph, indexes, descriptors, identities)
        optics.update({"graphSourceHashes": graph_hashes, "aamHashes": indexes[-1],
                       "descriptorSha256": descriptor_sha})
        print(json.dumps(optics["coverage"]))
    followup = read_json(args.followup)
    ui_reviews = followup.get("uiLinkReviews", [])
    for review in ui_reviews:
        if not screenshot_matches(review):
            raise ValueError(f"Reviewed screenshot changed: {review['screenshot']}")
    records, by_weapon, used_ids = audit(choices, graph, sources, indexes, descriptors, ui_reviews)
    panel_review = followup.get("panelLinkageInvestigation", {})
    screenshot_descriptions = apply_screenshot_tooltips(
        records, by_weapon, panel_review.get("rows", []) if panel_review.get("applyAsTooltips") is True else [])
    screenshot_descriptions.update(apply_string_id_tooltips(records, by_weapon, descriptors, screenshot_descriptions))
    if args.optic_mapping_json:
        iron_descriptions = iron_sight_tooltips(optics, by_weapon)
        optics["coverage"]["ironSightTooltips"] = sum(c.get("tooltipDescriptionKey") is not None for c in optics["categories"])
        args.optic_mapping_json.parent.mkdir(parents=True, exist_ok=True)
        args.optic_mapping_json.write_text(json.dumps(export.mark(optics), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        optic_choices = {(r["weapon"], r["attachment"]): r for r in optics["categories"]}
        for record in records:
            if record["slot"] == "sight":
                category = optic_choices[record["weapon"], record["attachment"]]
                record["identityStatus"] = category["status"]
                record["descriptionStatus"] = "category-member-descriptions"
                record["categorySources"] = [r["source"] for r in category["members"]]
                record["categoryReport"] = args.optic_mapping_json.name
                if category.get("tooltipDescriptionKey"):
                    record["tooltipDescriptionKey"] = category["tooltipDescriptionKey"]
                    record["tooltipSourceIds"] = category["tooltipSourceIds"]
                    record["descriptionStatus"] = category["tooltipStatus"]
    primary = [r for r in records if r["slot"] != "sight"]
    coverage = {
        "aamAssets": len(indexes[-1]), "nonSightChoices": len(primary),
        "mappedSelections": sum(r["descriptionStatus"] in ("linked", "screenshot-verified", "panel-resolved-string-id") for r in primary),
        "identityStatuses": dict(sorted(Counter(r["identityStatus"] for r in primary).items())),
        "descriptionStatuses": dict(sorted(Counter(r["descriptionStatus"] for r in primary).items())),
        "matchMethods": dict(sorted(Counter(s["uiLink"]["method"] for r in primary
            for s in r["sources"] if s.get("status") == "linked").items())),
    }
    coverage["ironSightTooltips"] = sum("iron" in slots.get("sight", {}) for slots in by_weapon.values())
    descriptions = dict(sorted(({r["description"]["id"]: r["description"]["text"]
        for r in descriptors.values() if r["description"].get("id") in used_ids} | screenshot_descriptions
        | (iron_descriptions if args.optic_mapping_json else {})).items()))
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in read_json(args.overrides)["overrides"] if o.get("generator") == GENERATOR]
    deviation_report = apply_deviations(by_weapon, descriptions, overrides, choices)
    used = {key for slots in by_weapon.values() for items in slots.values() for key in items.values()}
    descriptions = dict(sorted((k, v) for k, v in descriptions.items() if k in used))
    result = {
        "source": "Reviewed Frosty hardware identities and localized UI metadata, with approved game-panel text where English strings are missing: per captured choice, and for the missing string ID each capture resolves",
        "coverage": coverage,
        "descriptions": descriptions,
        "byWeapon": by_weapon,
    }
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.mapping_json:
        report = {
            "scope": "Current site choices mapped to reviewed hardware and UI descriptions; source identity does not prove live availability or engine behavior",
            "generatedBy": "scripts/frosty-attachment-tooltips.py",
            "coverage": coverage, "choices": records,
            "reviewHashes": review_hashes,
            "descriptorSha256": descriptor_sha,
            "englishStringsSha256": descriptor_document["sourceStringsSha256"],
            "siteHashes": {p: hashlib.sha256((REPO / p).read_bytes()).hexdigest()
                           for p in ("data/weapons.json", "data/attachments.json", "data/ammo.json")},
            "aamHashes": indexes[-1], "graphSourceHashes": graph_hashes,
            "graphIssues": graph_issues, "deviations": deviation_report,
        }
        args.mapping_json.parent.mkdir(parents=True, exist_ok=True)
        args.mapping_json.write_text(json.dumps(export.mark(report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(coverage, indent=2))
    print(f"deviations: {dict(Counter(d['status'] for d in deviation_report))}")
    failed = False
    for row in deviation_report:
        if row["status"] != "applied":
            failed = True
            print(f"DEVIATION {row['status']}: {row['overrideId']} {row['weapon']} {row['slot']} {row['id']} "
                  f"generated {row['source']}, reviewed {row['reviewedSource']}, site {row['siteValue']}")
    if args.site.exists():
        site = owned_leaves(read_json(args.site))
        generated = owned_leaves(result)
        differences = [(k, site.get(k), generated.get(k)) for k in sorted(set(site) | set(generated))
                       if site.get(k) != generated.get(k)]
        for key, old, new in differences:
            print("DIFF " + " ".join(key) + f": site {json.dumps(old, ensure_ascii=False)} -> generated "
                  f"{json.dumps(new, ensure_ascii=False)}")
        print(f"{len(generated)} generated leaves, {len(site)} site leaves, {len(differences)} differ")
        failed = failed or bool(differences)
    if args.check and failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
