"""Audit current site attachment identities and resolve source-backed UI text."""

import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET


REPO = Path(__file__).resolve().parent.parent
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
    for (const item of availableAttachments(weapon, mount, data)) {
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


def source_graph(base, include_optics=False):
    spec = importlib.util.spec_from_file_location("frosty_configuration", REPO / "scripts/frosty-configuration.py")
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    identities = read_json(REPO / "reference-data/provenance/frosty-weapon-identities.json")["weapons"]
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
            raw = (base / path).read_bytes()
            hashes[path] = hashlib.sha256(raw).hexdigest()
            cache[path] = ET.fromstring(raw)
        return cache[path]

    handling = read_json(REPO / "reference-data/provenance/frosty-handling-mapping-followup.json")
    progressions = defaultdict(list)
    for row in handling["rows"]:
        if "abilityProgression" in row:
            progressions[row["internalId"]].append(row["abilityProgression"])
    rows, issues = cfg.attachment_graph(base, weapons, read_xml, ability_progressions=progressions, include_optics=include_optics)
    return {row.get("sourceKey") or row["attachmentXml"]: row for row in rows}, hashes, issues


def reviewed_identities():
    sources, reviews = defaultdict(lambda: defaultdict(set)), {}

    def review(name):
        path = REPO / "reference-data/provenance" / name
        reviews[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        return read_json(path)

    audit = review("frosty-attachment-full-pass-2026-09-06.json")
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
        sources[row["siteWeaponId"], row["slot"], option][row["attachmentXml"]].add(
            "frosty-attachment-full-pass-2026-09-06.json")

    def replace(rows, name):
        grouped = defaultdict(lambda: defaultdict(set))
        for key, path in rows:
            grouped[key][path].add(name)
        sources.update(grouped)

    followup = review("frosty-attachment-followup-2026-09-06.json")
    replace([((r["weapon"], "muzzle", "cqb_supp"), r["attachmentXml"]) for r in followup["cqb"]],
            "frosty-attachment-followup-2026-09-06.json")
    barrels = review("frosty-barrel-ads-2026-09-13.json")
    replace([((r["weapon"], "barrel", r["barrel"]), r["attachment"]) for r in barrels["rows"]],
            "frosty-barrel-ads-2026-09-13.json")
    handling = review("frosty-attachment-handling-generated.json")
    if handling["additionalIdentitiesSha256"] != reviews["frosty-handling-mapping-followup.json"]:
        raise ValueError("Handling identity review changed; regenerate its source mapping first")
    replace([((r["weapon"], r["slot"], r["attachment"]), path)
             for r in handling["rows"] for path in r["sourceAttachments"]],
            "frosty-attachment-handling-generated.json")
    identities = review("frosty-attachment-identity-followup-2026-09-13.json")
    replace([((r["weapon"], r["slot"], r["attachment"]), r["attachmentXml"])
             for r in identities["rows"]],
            "frosty-attachment-identity-followup-2026-09-13.json")
    return sources, reviews


def ui_indexes(aam_root, descriptors):
    names, rails, assets_by_name = defaultdict(set), defaultdict(set), defaultdict(set)
    records, hashes = defaultdict(list), {}
    files = sorted(aam_root.rglob("AAM_*.xml"))
    if not files:
        raise FileNotFoundError(f"No AAM_* XML files under {aam_root}")
    for path in files:
        raw = path.read_bytes()
        root = ET.fromstring(raw)
        aam_asset = root.findtext("Class_d46324bc/Field_0c59fa06")
        hashes[aam_asset] = hashlib.sha256(raw).hexdigest()
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
                if sorted(link["assets"] if link else []) != sorted(review["candidateAssets"]):
                    raise ValueError(f"Reviewed UI candidates changed: {path}")
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
        if hashlib.sha256((REPO / review["screenshot"]).read_bytes()).hexdigest() != review["screenshotSha256"]:
            raise ValueError(f"Screenshot tooltip image changed: {key}")
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
            "kind": "user-reviewed-game-panel", "screenshot": review["screenshot"],
            "screenshotSha256": review["screenshotSha256"],
            "originalFrostyStringIds": sorted({r["descriptionStringId"] for r in review["pointerEvidence"]}),
            "note": "Panel text approved for this choice only. Original Frosty UI links and missing English IDs are retained in sources.",
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


def optic_categories(choices, graph, indexes, descriptors):
    identities = read_json(REPO / "reference-data/provenance/frosty-weapon-identities.json")["weapons"]
    site_ids = {r["internalId"].lower(): r["siteId"] for r in identities}
    rows = [r for r in graph.values() if (r.get("category") or {}).get("asset", "").endswith("_Sight")]
    links, peers = {}, defaultdict(set)
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
    members, unresolved = [], []
    for row in rows:
        path = row["attachmentXml"]
        link, key, details = links[path]
        if not link and peers[key] and details["selectors"] and all(s["bound"] for s in details["selectors"]):
            link = {"method": "same-optic-model-and-selector", "assets": sorted(peers[key])}
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
    }
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
            category["tooltipDefaultReason"] = "User selected the default iron sights: Classic on M16A4; basic aperture on UMG-40. Other category members are retained as evidence only."
    return descriptions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("aam_xml_root", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("--frosty-root", required=True, type=Path)
    parser.add_argument("--mapping-json", type=Path,
                        help="Write a source identity and description audit for every current site choice")
    parser.add_argument("--optic-mapping-json", type=Path,
                        help="Audit individual Frosty sights against the existing generic site categories")
    args = parser.parse_args()
    descriptor_path = REPO / "reference-data/provenance/frosty-attachment-descriptions-2026-09-13.json"
    descriptor_document = read_json(descriptor_path)
    descriptors = {r["asset"].lower(): r for r in descriptor_document["attachments"]}
    # MG5 stores its iron-sight descriptor with the weapon, outside the UI batch.
    extra_asset = "Common/Hardware/Weapons/MG/MG5/AD_MG5_IronSights"
    extra_path = args.frosty_root / (extra_asset + ".xml")
    extra_root = ET.fromstring(extra_path.read_bytes())
    pointer = extra_root.findtext("Class_535682be/Field_490f0dd0").split()[-1]
    string_id = extra_root.find(f"Class_fbe1d3bc[@Guid='{pointer}']/Field_3d34898a").text[2:].upper()
    text_by_id = {r["description"]["id"]: r["description"]["text"] for r in descriptors.values() if r["description"].get("text")}
    descriptors[extra_asset.lower()] = {"asset": extra_asset, "label": {},
        "xmlSha256": hashlib.sha256(extra_path.read_bytes()).hexdigest(),
        "description": {"id": string_id, "text": text_by_id[string_id]}}
    choices = current_choices()
    sources, review_hashes = reviewed_identities()
    graph, graph_hashes, graph_issues = source_graph(args.frosty_root, include_optics=bool(args.optic_mapping_json))
    graph_hashes[extra_asset + ".xml"] = descriptors[extra_asset.lower()]["xmlSha256"]
    indexes = ui_indexes(args.aam_xml_root, descriptors)
    if args.optic_mapping_json:
        optics = optic_categories(choices, graph, indexes, descriptors)
        optics.update({"graphSourceHashes": graph_hashes, "aamHashes": indexes[-1],
                       "descriptorSha256": hashlib.sha256(descriptor_path.read_bytes()).hexdigest()})
        print(json.dumps(optics["coverage"]))
    followup = read_json(REPO / "reference-data/provenance/frosty-attachment-identity-followup-2026-09-13.json")
    ui_reviews = followup.get("uiLinkReviews", [])
    for review in ui_reviews:
        if hashlib.sha256((REPO / review["screenshot"]).read_bytes()).hexdigest() != review["screenshotSha256"]:
            raise ValueError(f"Reviewed screenshot changed: {review['screenshot']}")
    records, by_weapon, used_ids = audit(choices, graph, sources, indexes, descriptors, ui_reviews)
    panel_review = followup.get("panelLinkageInvestigation", {})
    screenshot_descriptions = apply_screenshot_tooltips(
        records, by_weapon, panel_review.get("rows", []) if panel_review.get("applyAsTooltips") is True else [])
    if args.optic_mapping_json:
        iron_descriptions = iron_sight_tooltips(optics, by_weapon)
        optics["coverage"]["ironSightTooltips"] = sum(c.get("tooltipDescriptionKey") is not None for c in optics["categories"])
        args.optic_mapping_json.parent.mkdir(parents=True, exist_ok=True)
        args.optic_mapping_json.write_text(json.dumps(optics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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
        "mappedSelections": sum(r["descriptionStatus"] in ("linked", "screenshot-verified") for r in primary),
        "identityStatuses": dict(sorted(Counter(r["identityStatus"] for r in primary).items())),
        "descriptionStatuses": dict(sorted(Counter(r["descriptionStatus"] for r in primary).items())),
        "matchMethods": dict(sorted(Counter(s["uiLink"]["method"] for r in primary
            for s in r["sources"] if s.get("status") == "linked").items())),
    }
    coverage["ironSightTooltips"] = sum("iron" in slots.get("sight", {}) for slots in by_weapon.values())
    result = {
        "source": "Reviewed Frosty hardware identities and localized UI metadata, with explicitly approved per-choice game-panel text where English strings are missing",
        "coverage": coverage,
        "descriptions": dict(sorted(({r["description"]["id"]: r["description"]["text"]
            for r in descriptors.values() if r["description"].get("id") in used_ids} | screenshot_descriptions
            | (iron_descriptions if args.optic_mapping_json else {})).items())),
        "byWeapon": by_weapon,
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.mapping_json:
        report = {
            "scope": "Current site choices mapped to reviewed hardware and UI descriptions; source identity does not prove live availability or engine behavior",
            "generatedBy": "scripts/frosty-attachment-tooltips.py",
            "coverage": coverage, "choices": records,
            "reviewHashes": review_hashes,
            "descriptorSha256": hashlib.sha256(descriptor_path.read_bytes()).hexdigest(),
            "englishStringsSha256": descriptor_document["sourceStringsSha256"],
            "siteHashes": {p: hashlib.sha256((REPO / p).read_bytes()).hexdigest()
                           for p in ("data/weapons.json", "data/attachments.json", "data/ammo.json")},
            "aamHashes": indexes[-1], "graphSourceHashes": graph_hashes,
            "graphIssues": graph_issues,
        }
        args.mapping_json.parent.mkdir(parents=True, exist_ok=True)
        args.mapping_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(coverage, indent=2))


if __name__ == "__main__":
    main()
