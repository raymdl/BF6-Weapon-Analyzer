"""Flag attachment and gun-sway bindings of new weapons that differ from the rest of the roster.

Usage (from the repo root):
  python -I scripts/frosty-attachment-wiring-check.py --raw <raw root> --descriptors <SharedTypeDescriptors.ebx>
      [--catalog <asset-catalog.json>] [--new MRGGA CDX40 PKM RSAR999]
  --raw          raw capture root (holds Common/Hardware/Weapons/...).
  --descriptors  the build's SharedTypeDescriptors.ebx.
  --catalog      asset-catalog.json that resolves import GUIDs; default: next to the raw folder.
  --new          weapon folders (Name or Class/Name) to report; default: every weapon.
Signatures are built for all weapons (about 40 s cold). For each reported weapon and attachment it prints
  MISSING: an effect shape that 10 or more other weapons with the same attachment name carry and this one lacks;
  EXTRA:   an effect shape none of those others carry.
Shapes fold weapon names, step numbers and game-mode prefixes, so tier and scalar differences are not reported,
nor the known per-weapon rules: recoil step size by class, *_Bolt assets, the _NoBipod hip-dispersion flag,
magazines (skipped). Attachments whose effect sits in a WB modifier absent from the capture are skipped.
Two selector-level checks follow: GBM_NoIncrease_Semi_P00 on a weapon that data/weapons.json lists with auto and single, and the
three bindings under the bipod selector on a weapon whose blueprint lists WPM_BTM_Bipod01_W10 (the hip-dispersion
and ADS ones only for weapons that fire auto).
Output is a list of suspects, not a verdict: confirm in game, then record in docs/ATTACHMENT_BUGS.md."""
import argparse, collections, importlib.util, json, pathlib, re, sys, time

REPO = pathlib.Path(__file__).resolve().parents[1]
WROOT = "common/hardware/weapons/"
SLOTS = "AMO|BRL|BTM|ERG|LFT|MAG|MZL|RGT|SCA|SCP|TOP"
BIPOD_SEL = "a5578cf4-546c-44ef-9a79-b84021406c17"
MIN_AGREE = 10


def load_decoder():
    spec = importlib.util.spec_from_file_location("dec", REPO / "scripts/frosty-ebx-decode.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


class Raw:
    def __init__(self, raw, descriptors, catalog):
        self.dec = load_decoder()
        self.types = self.dec.type_descriptors(pathlib.Path(descriptors))
        cat = json.load(open(catalog, encoding="utf-8"))
        rows = cat["assets"] if isinstance(cat, dict) and "assets" in cat else cat
        self.byguid = {str(r["guid"]).lower(): r["path"] for r in rows}
        self.held, self.proper, self.cache = {}, {}, {}
        for p in pathlib.Path(raw).rglob("*.ebx"):
            r = p.relative_to(raw).as_posix()[:-4]
            self.held[r.lower()] = str(p)
            self.proper[r.lower()] = r

    def load(self, route):
        k = route.lower()
        if k not in self.cache:
            try:
                objs = self.dec.Ebx(pathlib.Path(self.held[k]), self.types).decode()["objects"]
            except Exception as e:
                print("decode failure %s: %r" % (route, e), file=sys.stderr)
                objs = []
            self.cache[k] = (objs, {(o.get("$guid") or "").lower(): o for o in objs})
        return self.cache[k]

    def imp(self, x):
        if isinstance(x, dict) and "$import" in x:
            i = x["$import"]
            return self.byguid.get(i["fileGuid"].lower()), i["classGuid"].lower()
        return None

    def deref(self, x, objs):
        if isinstance(x, dict) and "$ref" in x:
            return None, objs[x["$ref"]]
        i = self.imp(x)
        if i and i[0] and i[0].lower() in self.held:
            return i[0], self.load(i[0])[1].get(i[1])
        return (i[0] if i else None), None

    def imports(self, tree):
        out = set()

        def walk(x):
            if isinstance(x, dict):
                if "$import" in x:
                    i = self.imp(x)
                    if i and i[0]:
                        out.add(i[0])
                    return
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(tree)
        return out


def base(r):
    return r.rsplit("/", 1)[-1] if r else None


def index_wb_gs(R, wb_objs, gs_objs, missing):
    mod_by_sel = collections.defaultdict(list)

    def find_lists(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "Field_0cd9f20f" and isinstance(v, list):
                    for m in v:
                        r, mo = R.deref(m, wb_objs)
                        if mo is None:
                            missing.append(r or "UNRESOLVED")
                            continue
                        for s in mo.get("Field_819acc98", []) or []:
                            mod_by_sel[str(s).lower()].append((r, mo))
                else:
                    find_lists(v)
        elif isinstance(x, list):
            for v in x:
                find_lists(v)
    find_lists(wb_objs)
    bind_by_sel = collections.defaultdict(list)

    def find_bind(x):
        if isinstance(x, dict):
            if "Field_2f0e5b83" in x and "Field_6d011165" in x:
                bind_by_sel[str(x["Field_6d011165"]).lower()].append(x)
            for v in x.values():
                find_bind(v)
        elif isinstance(x, list):
            for v in x:
                find_bind(v)
    find_bind(gs_objs)
    return mod_by_sel, bind_by_sel


def extract(R):
    """{label: {folder, wb, gs, uncaptured, attachments: {file name: {progs, items}}, bindings, wbRoutes, gsRoutes}}"""
    folders = collections.defaultdict(list)
    for k in R.held:
        if k.startswith(WROOT):
            p = k[len(WROOT):].split("/")
            if len(p) == 3 and not p[0].startswith("_"):
                folders[(p[0], p[1])].append(k)
    weapons = {}
    for (cls, name), files in sorted(folders.items()):
        folder = "%s%s/%s/" % (WROOT, cls, name)
        rel = {k[len(folder):]: k for k in files}
        wb = [k for n, k in rel.items() if n.endswith("_wb")]
        gs = [k for n, k in rel.items() if n.startswith("gs_")]
        atts = sorted(k for n, k in rel.items() if n.startswith("attachment_"))
        abil = sorted(k for n, k in rel.items() if n.endswith("_ability"))
        if len(wb) != 1 or len(gs) != 1 or not atts:
            continue
        wb_objs, gs_objs = R.load(wb[0])[0], R.load(gs[0])[0]
        missing = []
        mod_by_sel, bind_by_sel = index_wb_gs(R, wb_objs, gs_objs, missing)
        by_prog = collections.defaultdict(list)
        for ar in abil:
            ab_objs = R.load(ar)[0]
            for o in ab_objs:
                if o.get("$class") == "Class_74f6b9e4" and R.imp(o.get("Field_f86e0433")):
                    by_prog[R.imp(o["Field_f86e0433"])].append((o, ab_objs))
        W = {"folder": "%s/%s" % (cls, name), "wbName": base(R.proper[wb[0]]),
             "uncaptured": {base(r).lower() for r in missing}, "attachments": {},
             "wbRoutes": R.imports(wb_objs), "gsRoutes": R.imports(gs_objs),
             "bipodBindings": [R.imp(b["Field_2f0e5b83"])[0] for b in bind_by_sel.get(BIPOD_SEL, [])
                               if R.imp(b["Field_2f0e5b83"])]}
        for ar in atts:
            objs = R.load(ar)[0]
            if not objs:
                continue
            a = objs[0]
            progs = []
            for p in [a.get("Field_157a7d74")] + [x.get("Field_157a7d74") for x in a.get("Field_f6a09c90") or []]:
                i = R.imp(p)
                if i and i not in progs:
                    progs.append(i)
            items = set()
            for p in progs:
                for br, ab_objs in by_prog.get(p, []):
                    for am in br.get("Field_ffba60f0", []) or []:
                        _, act = R.deref(am, ab_objs)
                        for u in (act or {}).get("Field_7e54e22c", []) or []:
                            sel = R.imp(u)
                            if not sel or not sel[0] or "/_weaponmodifiers/" not in sel[0].lower():
                                continue
                            sb, hits = base(sel[0]), 0
                            for mr, mo in mod_by_sel.get(sel[1], []):
                                src = wb_objs if mr is None else R.load(mr)[0]
                                for e in mo.get("Field_9690d604", []) or []:
                                    er, eo = R.deref(e, src)
                                    er = er or mr
                                    hits += 1
                                    items.add((sb, base(er) or "WB-local", eo["$class"] if eo else "MISSING_EFFECT"))
                            for bd in bind_by_sel.get(sel[1], []):
                                gr, go = R.deref(bd["Field_2f0e5b83"], gs_objs)
                                hits += 1
                                items.add((sb, "GS:" + (base(gr) or "GS-local"), go["$class"] if go else "MISSING_GS_MODIFIER"))
                            if not hits:
                                items.add((sb, "-", "NO_WB_GS_MATCH"))
            W["attachments"][base(R.proper[ar])] = {"progs": [base(p[0]) for p in progs], "items": sorted(items)}
        weapons[W["folder"]] = W
    return weapons


def normkey(aname, progs):
    """Attachment_<Name>_<SLOT>_<Att> -> SLOT_att, case/_/- folded; the progression name supplies a missing slot."""
    m = re.match(r"Attachment_.+?_(%s)_(.+)$" % SLOTS, aname, re.I)
    for p in progs:
        if m:
            break
        m = re.match(r"U_PRG_.+?_(%s)_(.+)$" % SLOTS, p, re.I)
    if not m:
        return aname, aname
    return "%s_%s" % (m.group(1).upper(), re.sub(r"[^a-z0-9]", "", m.group(2).lower())), "%s_%s" % (m.group(1).upper(), m.group(2))


def make_shape(weapons):
    toks = {w.split("/")[1].lower() for w in weapons} | {W["wbName"][:-3].lower() for W in weapons.values()}
    wtok = re.compile("_(%s)(?=_|$)" % "|".join(map(re.escape, sorted(toks, key=len, reverse=True))), re.I)

    def shape(item, slot):
        a = wtok.sub("", item[1])
        gs = a.startswith("GS:")
        a = a[3:] if gs else a
        a = re.sub(r"^(MPDarkness_|SP_)", "", a)
        a = re.sub(r"(_SP|_Bolt|_NoBipod)$", "", a)
        a = re.sub(r"(_[A-Z]?\d+)+$", "", a)
        if a.startswith(("WPM_", "WM_")):
            a = "_".join(a.split("_")[:3])
        return item[2], ("GS:" if gs else "") + re.sub(r"\d+", "#", a)
    return shape


def site_records(weapons):
    """Folder -> (label with in-game name, site fire modes or None), from the site data via the WB name."""
    label, modes = {f: f for f in weapons}, {}
    try:
        sw = {w["id"]: w for w in json.load(open(REPO / "data/weapons.json", encoding="utf-8"))}
        hz = json.load(open(REPO / "reference-data/provenance/frosty-hit-zones-2026-09-15.json", encoding="utf-8"))["weapons"]
        wb2id = {pathlib.Path(v["wbXml"]).stem.lower(): i for i, v in hz.items() if i in sw and v.get("wbXml")}
        wb2id.update({n.lower(): i for i, n in {"mk24": "MRGGA_WB", "elr40": "CDX40_WB", "z84m": "PKM_WB", "rspr": "RSAR999_WB"}.items() if i in sw})
        for f, W in weapons.items():
            w = sw.get(wb2id.get(W["wbName"].lower()))
            if w:
                label[f] = "%s (%s)" % (f, w["name"])
                modes[f] = w.get("availableFireModes", [])
    except (OSError, KeyError, ValueError):
        pass
    return label, modes


def check_attachments(weapons, new, shape, label):
    groups = collections.defaultdict(dict)
    for f, W in weapons.items():
        for aname, r in W["attachments"].items():
            key, disp = normkey(aname, r["progs"])
            slot = key.split("_")[0]
            if slot == "MAG":
                continue  # magazine effects are per weapon (capacity)
            gap = any(it[0].lower().removeprefix("u_") in W["uncaptured"] for it in r["items"])
            groups[key][f] = (aname, slot, gap, {shape(it, slot) for it in r["items"] if it[2] != "NO_WB_GS_MATCH"})
    out = collections.defaultdict(list)
    for key, g in groups.items():
        for f in new:
            if f not in g:
                continue
            aname, slot, gap, mine = g[f]
            others = [v[3] for w, v in g.items() if w != f and not v[2]]
            if gap or len(others) < MIN_AGREE:
                continue
            have = collections.Counter(s for o in others for s in o)
            miss = {s for s, n in have.items() if n >= MIN_AGREE and s not in mine}
            extra = {s for s in mine if s not in have}
            # an effect class missing and extra at once is a substitution (weaker evidence): not reported
            both = {s[0] for s in miss} & {s[0] for s in extra}
            miss = {s for s in miss if s[0] not in both}
            extra = {s for s in extra if s[0] not in both}
            for s in sorted(miss):
                out[f].append("%s: MISSING %s %s (%d of %d other weapons carry it)" % (aname, s[0].replace("Class_", ""), s[1], have[s], len(others)))
            for s in sorted(extra):
                out[f].append("%s: EXTRA %s %s (none of %d other weapons carry it)" % (aname, s[0].replace("Class_", ""), s[1], len(others)))
    return out


def check_selectors(weapons, new, modes):
    out = collections.defaultdict(list)
    for f in new:
        W = weapons[f]
        gs, wb = [base(r) for r in W["gsRoutes"]], [base(r) for r in W["wbRoutes"]]
        if "GBM_NoIncrease_Semi_P00" not in gs:
            if f not in modes:
                out[f].append("gun sway lacks GBM_NoIncrease_Semi_P00; fire modes unknown (weapon not in data/weapons.json), check by hand")
            elif {"auto", "single"} <= set(modes[f]):
                out[f].append("auto and single, but gun sway lacks GBM_NoIncrease_Semi_P00")
        if "WPM_BTM_Bipod01_W10" in wb:
            b = [base(r) for r in W["bipodBindings"]]
            for what, test in (("GRM_BipodDeployed_BTM_P50", lambda n: n.startswith("GRM_BipodDeployed")),
                               ("GDM_Array_HipDispersion_BTM_P20", lambda n: "HipDispersion_BTM" in n),
                               ("GBM_Increase_ADS_xx_BTM_Bipod", lambda n: n.startswith("GBM_Increase_ADS") and "_BTM_Bipod" in n)):
                # bolt-action bipods use *_Bolt recoil and single-fire weapons carry no ADS/hip package
                lenient = any("_Bolt" in n for n in b) or (f in modes and "auto" not in modes[f])
                if not any(test(n) for n in b) and not (lenient and what != "GRM_BipodDeployed_BTM_P50"):
                    out[f].append("bipod selector %s lacks %s (binds: %s)" % (BIPOD_SEL[:8], what, ", ".join(sorted(b)) or "nothing"))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--raw", required=True)
    ap.add_argument("--descriptors", required=True)
    ap.add_argument("--catalog")
    ap.add_argument("--new", nargs="*", default=[])
    a = ap.parse_args()
    raw = pathlib.Path(a.raw)
    catalog = a.catalog or raw.parent / "asset-catalog.json"
    t0 = time.time()
    R = Raw(raw, a.descriptors, catalog)
    weapons = extract(R)
    by_low = {f.lower(): f for f in weapons} | {f.split("/")[1].lower(): f for f in weapons}
    new = sorted(weapons) if not a.new else []
    for n in a.new:
        if n.lower() not in by_low:
            sys.exit("unknown weapon folder: %s" % n)
        new.append(by_low[n.lower()])
    label, modes = site_records(weapons)
    shape = make_shape(weapons)
    att, sel = check_attachments(weapons, new, shape, label), check_selectors(weapons, new, modes)
    print("%d weapons read, %d reported (%.0f s)" % (len(weapons), len(new), time.time() - t0))
    print("\n== Selector-level checks ==")
    for f in new:
        for line in sel.get(f, []):
            print("%s: %s" % (label[f], line))
    print("\n== Attachment wiring vs %d+ other weapons with the same attachment ==" % MIN_AGREE)
    for f in new:
        for line in att.get(f, []):
            print("%s: %s" % (label[f], line))
    print("\n%d selector finding(s), %d attachment finding(s)" % (sum(map(len, sel.values())), sum(map(len, att.values()))))


if __name__ == "__main__":
    main()
