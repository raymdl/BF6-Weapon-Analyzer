"""Read-only Frosty panel-value candidates.

This module is deliberately independent of the site resolver.  It reads the
exported Frosty inventory/effect closure and the existing Frosty baseline
exports, then reports source values, selector composition, and fields that
cannot be decoded safely.  A returned ``value`` is a source candidate; it is
not a claim that the game displays that value or that the selector is live.

Typical use::

    from frosty_panel_values import derive_panel_values
    report = derive_panel_values("m433", {"slot": "muzzle", "id": "long_supp"})

The default root is the repository containing this file.  All paths may be
overridden by passing ``root`` or by constructing ``FrostyPanelSource``.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
RAW_FULL = ROOT / "outputs" / "attachment-full-pass" / "raw-full.json"
COMPARISON = ROOT / "outputs" / "attachment-full-pass" / "comparison.json"
IDENTITIES = ROOT / "reference-data" / "provenance" / "frosty-weapon-identities.json"
REGISTRY = ROOT / "outputs" / "frosty" / "1.4.2.5" / "registry-configuration.json"
PROJECTILES = ROOT / "outputs" / "frosty" / "1.4.2.5" / "base-projectile-configuration.json"


def _read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _number(raw: Any) -> Any:
    if isinstance(raw, (int, float)):
        return raw
    if not isinstance(raw, str):
        return raw
    try:
        if raw.lower().startswith("0x"):
            value = int(raw, 16)
            return value - (1 << 32) if value >= (1 << 31) else value
        return float(raw)
    except ValueError:
        return raw


def _leaf_scalars(effect: dict[str, Any]) -> dict[str, Any]:
    return {item["path"].split("/")[-1]: _number(item["raw"])
            for item in effect.get("scalars", [])}


def _jsonable(value: Any) -> Any:
    """Convert NaN and Path-like values before callers serialize a report."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    return value


# These names are source-side paths observed in the full-pass effect index.
_SPREAD = {
    "Field_0084b1d1": "inc", "Field_2ca8533e": "firingCoef",
    "Field_f37351e6": "firingExp", "Field_1b9eef5d": "firingOffset",
    "Field_4d3f0635": "notFiringOffset", "Field_aa558d2b": "idleOffset",
    "Field_0b26c028": "idleExp",
}
_RECOIL = {
    "Field_22ce7cf3": "amountTier", "Field_02433593": "variationTier",
    "Field_28df1cde": "decFactor", "Field_1d04f0f6": "decTimeExp",
    "Field_5a02dd65": "duration",
}
_WB_SCALARS = {
    "Class_03db7a68": ("sprintRecoveryTier", "Field_9540bd8e", True),
    "Class_4aac041b": ("deployTier", "Field_9540bd8e", True),
    "Class_303a33cc": ("adsMoveSpeedTier", "Field_c427eabf", True),
    "Class_9705264b": ("reloadSpeed", "Field_348b8cd1", False),
    "Class_3e93759b": ("velocity", "Field_6a5c4efd", False),
}


def _effect_candidates(effect_key: str, effect: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract typed source candidates without decoding native arithmetic."""
    out: list[dict[str, Any]] = []
    basename = Path(effect.get("sourceXml", "")).stem
    for operation in effect.get("operations", []):
        path = operation.get("path", "")
        values = operation.get("values", {})
        parts = path.split("/")
        field_name = parts[-2] if len(parts) >= 2 else ""
        state = "ads" if "Field_6b84de87" in parts else "hip" if "Field_7b609515" in parts else None
        field = None
        if effect.get("type") == "Class_bb838ff6" and field_name in _RECOIL and state:
            field = f"recoil.{state}.{_RECOIL[field_name]}"
        elif effect.get("type") == "Class_5e5631ff" and field_name in _SPREAD and state:
            field = f"spread.{state}.{_SPREAD[field_name]}"
        elif effect.get("type") == "Class_bb7f4ea1" and field_name == "Field_003a3ed7":
            field = "adsTimeTier"
        elif effect.get("type") == "Class_743a3ce0" and field_name == "Field_9540bd8e":
            field = "hipSpreadTier" if "HipDispersion" in basename else "movingAdsSpreadTier"
        if not field:
            continue
        if values.get("Field_bbffe8bc") == "True":
            kind, value = "set", _number(values.get("Field_bbbfe9cc"))
        elif values.get("Field_4692836a", "0") not in ("0", "0x00000000"):
            kind, value = "add", _number(values["Field_4692836a"])
        else:
            kind = "mult"
            value = _number(values.get("Field_98a799ba", "1"))
            other = _number(values.get("Field_5695ee1c", "1"))
            if isinstance(value, (int, float)) and isinstance(other, (int, float)):
                value *= other
        # The game-side tier has the opposite sign for these three ladders.
        if field == "hipSpreadTier" and kind == "add":
            value = -value
        out.append({"field": f"{field}.{kind}", "value": value,
                    "effect": effect_key, "path": path})

    scalars = _leaf_scalars(effect)
    if effect.get("type") in _WB_SCALARS:
        field, scalar, invert = _WB_SCALARS[effect["type"]]
        if scalar in scalars:
            value = scalars[scalar]
            if invert and isinstance(value, (int, float)):
                value = -value
            out.append({"field": field, "value": value, "effect": effect_key,
                        "path": scalar})
    if effect.get("type") == "Class_0045e7fa":
        for scalar, field in (("Field_d98b0371", "minimapSpotMult"),
                              ("Field_6f8d5f40", "worldSpotMult")):
            if scalar in scalars:
                out.append({"field": field, "value": scalars[scalar],
                            "effect": effect_key, "path": scalar})
    if effect.get("type") == "Class_5830cb87" and "Field_8359723e" in scalars:
        out.append({"field": "healthRegenDelayAdd", "value": scalars["Field_8359723e"],
                    "effect": effect_key, "path": "Field_8359723e"})
    if effect.get("type") == "Class_e7d2410a" and "Field_7f22bfb4" in scalars:
        out.append({"field": "magazineSize", "value": scalars["Field_7f22bfb4"],
                    "effect": effect_key, "path": "Field_7f22bfb4"})
    if effect.get("type") == "Class_2fea847d" and basename in {"WME_WSway_M05", "WME_WSway_P05"}:
        out.append({"field": "swayTier", "value": 1 if basename.endswith("M05") else -1,
                    "effect": effect_key, "path": "Field_90fd0310"})
    return out


def _selection_key(row: dict[str, Any]) -> tuple[str, str, str]:
    return (row.get("siteWeaponId", "").lower(), row.get("slot", ""), row.get("siteId", ""))


class FrostyPanelSource:
    """Loaded, immutable-in-practice view of the existing Frosty exports."""

    def __init__(self, root: Path | str = ROOT, *, raw_full: Path | str | None = None,
                 comparison: Path | str | None = None, registry: Path | str | None = None,
                 projectiles: Path | str | None = None):
        root = Path(root)
        self.raw = _read(Path(raw_full) if raw_full else root / RAW_FULL.relative_to(ROOT))
        self.comparison = _read(Path(comparison) if comparison else root / COMPARISON.relative_to(ROOT))
        self.registry = _read(Path(registry) if registry else root / REGISTRY.relative_to(ROOT))
        self.projectiles = _read(Path(projectiles) if projectiles else root / PROJECTILES.relative_to(ROOT))
        identities_path = root / IDENTITIES.relative_to(ROOT)
        identities = _read(identities_path).get("weapons", []) if identities_path.is_file() else []
        self.identities = {x.get("internalId", "").lower(): x.get("siteId") for x in identities}
        self.effects = self.raw.get("effects", {})
        self.raw_rows = self.raw.get("rows", [])
        self.comparison_rows = self.comparison.get("rows", [])
        self._comparison_index: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
        for row in self.comparison_rows:
            if row.get("status") == "mapped":
                self._comparison_index.setdefault(_selection_key(row), []).append(row)
        self._registry = {x.get("internalId", "").lower(): x for x in self.registry}
        self._projectiles = {x.get("internalId", "").lower(): x for x in self.projectiles}

    def _internal_id(self, site_weapon_id: str) -> str | None:
        site_weapon_id = site_weapon_id.lower()
        for internal, site in self.identities.items():
            if str(site).lower() == site_weapon_id:
                return internal
        # A caller may already have supplied the exported internal ID.
        return site_weapon_id if site_weapon_id in self._registry or site_weapon_id in self._projectiles else None

    def _baseline(self, site_weapon_id: str) -> dict[str, Any]:
        internal = self._internal_id(site_weapon_id)
        if not internal:
            return {"fields": {}, "projectile": None, "unsupported": {
                "baseline": "No Frosty internal identity maps to this site weapon."
            }}
        fields: dict[str, Any] = {}
        for row in self._registry.get(internal, {}).get("registry", []):
            name = row.get("name", "")
            value = row.get("value")
            if value is None:
                continue
            suffix = name.split(".", 1)[-1] if "." in name else name
            field = _registry_field(suffix)
            if field:
                fields[field] = {"value": value, "raw": row.get("raw"),
                                 "registryName": name, "registryGuid": row.get("registryGuid")}
        projectile = self._projectiles.get(internal)
        return {"internalId": internal, "fields": fields,
                "projectile": _projectile_candidates(projectile) if projectile else None,
                "unsupported": {} if projectile else {
                    "damage": "No exported base-projectile configuration for this internal ID."
                }}

    def derive(self, site_weapon_id: str, selection: dict[str, Any] | None = None) -> dict[str, Any]:
        """Return source candidates for one selection and direct unsupported reasons."""
        selection = selection or {}
        slot, site_id = selection.get("slot"), selection.get("id", selection.get("siteId"))
        if not slot or not site_id:
            raise ValueError("selection requires slot and id")
        key = (site_weapon_id.lower(), slot, site_id)
        matching_rows = self._comparison_index.get(key, [])
        if len(matching_rows) != 1:
            return {"siteWeaponId": site_weapon_id, "selection": {"slot": slot, "id": site_id},
                    "status": "no-unique-source-mapping" if not matching_rows else "ambiguous-source-mapping", "fields": {},
                    "baseline": self._baseline(site_weapon_id),
                    "unsupported": {"selection": ("No mapped Frosty selector for this site selection."
                                                     if not matching_rows else
                                                     "Multiple Frosty source selectors map to this site selection; provide the exact source XML for composition review.")}}
        row = matching_rows[0]

        raw_selectors = []
        for raw_row in self.raw_rows:
            if raw_row.get("attachmentXml") != row.get("attachmentXml"):
                continue
            for selector in raw_row.get("selectors", []):
                unlock = selector.get("unlock")
                if isinstance(unlock, dict):
                    unlock = unlock.get("asset")
                if unlock == row.get("unlock"):
                    raw_selectors.append(selector)
        candidates: list[dict[str, Any]] = []
        fields: dict[str, dict[str, Any]] = {}
        for comparison in row.get("comparisons", []):
            item = {"value": comparison.get("sourceValue"),
                    "status": comparison.get("status", "source-candidate"),
                    "reason": ("Decoded source candidate compared with the current site model."
                               if comparison.get("status") == "match"
                               else "Source value is decoded, but the site model differs or does not model it."),
                    "statusAgainstSite": comparison.get("status"),
                    "sources": comparison.get("sources", [])}
            fields[comparison["field"]] = item
        effects = []
        for selector in raw_selectors:
            effect_keys = selector.get("effects", [])
            for key_effect in effect_keys:
                effect = self.effects.get(key_effect)
                if not effect:
                    continue
                typed = _effect_candidates(key_effect, effect)
                effects.append({"key": key_effect, "sourceXml": effect.get("sourceXml"),
                                "type": effect.get("type"), "candidates": typed})
                if key_effect in row.get('conditionalEffects', []):
                    continue  # Keep the source, but do not apply a deployed-bipod branch to a preview.
                for candidate in typed:
                    fields.setdefault(candidate["field"], {"value": candidate["value"],
                        "status": "source-candidate", "reason": "Decoded directly from an exported effect.",
                        "statusAgainstSite": "not-compared", "sources": []})["sources"].append(candidate)
            candidates.append({"unlock": selector.get("unlock"),
                               "effects": effect_keys, "gsBindings": selector.get("gsBindings", [])})

        unsupported = {
            "precision": "No exported selector effect decodes the composite Precision panel score.",
            "control": "No exported selector effect decodes the composite Control panel score.",
            "mobility": "No exported selector effect decodes the composite Mobility panel score.",
            "hipfire": "No exported selector effect decodes the composite Hipfire panel score.",
            "damage": "Damage display requires projectile semantics and damage-curve selection; raw projectile candidates are returned separately.",
            "magazineSize": "Magazine display is a weapon/loadout composition value; no selector arithmetic is decoded here.",
            "fireModes": "Fire-mode activation is native/conditional and cannot be inferred from selector presence.",
            "description": "Names and descriptions are UI metadata, not effect values.",
        }
        if row.get("otherEffects"):
            unsupported["otherEffects"] = (
                "The selector has exported effects without a safe panel-field decoder; "
                "inspect the returned effects list and do not treat them as zero.")
        if row.get("conditionalEffects"):
            unsupported["conditionalEffects"] = "Conditional/bipod effects are present; activation state is unresolved."
        if row.get("requiresCompositionReview"):
            unsupported["composition"] = "The source row has multiple selectors; stacking/branch composition requires review."
        return _jsonable({"siteWeaponId": site_weapon_id, "selection": {"slot": slot, "id": site_id},
            "status": row.get("status"), "sourceAttachmentXml": row.get("attachmentXml"),
            "sourcePoints": row.get("sourcePoints"), "sitePoints": row.get("sitePoints"),
            "requiresCompositionReview": row.get("requiresCompositionReview", False),
            "selectors": candidates, "effects": effects, "fields": fields,
            "sourceHashes": {effect.get("sourceXml"): self.raw.get("hashes", {}).get(effect.get("sourceXml"))
                             for effect in effects if effect.get("sourceXml")},
            "baseline": self._baseline(site_weapon_id), "unsupported": unsupported,
            "limitations": ["Exported branch presence is not proof of runtime availability.",
                            "Values are source candidates; native consumers and UI rounding are not decoded."]})


def _registry_field(suffix: str) -> str | None:
    direct = {
        "WeaponEntityData.WeaponFiring.PrimaryFire.FireLogic.RateOfFire": "rpm",
        "WeaponEntityData.WeaponFiring.PrimaryFire.Shot.InitialSpeed.z": "bulletVel",
    }
    if suffix in direct:
        return direct[suffix]
    if suffix.endswith("WeaponFiring.PrimaryFire.Ammo.MagazineCapacity"):
        return "magazineSize"
    # Array index [0] is the tactical reload path used by the panel.  Empty
    # reload [1] remains available in the registry but is intentionally not
    # substituted for a tactical value.
    if "ReloadInfoArray[0].ReloadTimeBulletsLeft" in suffix:
        return "reloadTimeSeconds"
    # Registry names end with the same semantic component names used by the
    # baseline comparison.  Keep unknown paths out of the panel namespace.
    match = re.match(r"(?:Recoil|DispersionBehavior)\.(Zoomed|Unzoomed)\.(.+)", suffix)
    if not match:
        return None
    state = "ads" if match.group(1) == "Zoomed" else "hip"
    tail = match.group(2)
    moving = False
    if tail.startswith("Stationary."):
        tail = tail.removeprefix("Stationary.")
    elif tail.startswith("MovingJumpingSprinting."):
        moving = True
        tail = tail.removeprefix("MovingJumpingSprinting.")
    names = {
        "RecoilDirection": "dir", "RecoilAmount": "amount",
        "RecoilAmountMultiplier": "amountMult", "RecoilAmountMultiplierExponent": "amountExp",
        "RecoilDirectionVariation": "dirVar", "RecoilDirectionVariationMultiplier": "dirVarMult",
        "RecoilDirectionVariationMultiplierExponent": "dirVarExp", "RecoilDecreaseNorm": "decNorm",
        "RecoilDecreaseExponent": "decExp", "RecoilDecreaseTimeExponent": "decTimeExp",
        "RecoilDecreaseOffset": "decOffset", "RecoilDuration": "duration",
        "RecoilDecreaseFactor": "decFactor", "ShootingRecoilDecreaseScale": "shootingDecScale",
        "IncreasePerShot": "inc", "IdleTime": "idleTime",
        "IdleDecreaseCoefficient": "idleCoef", "IdleDecreaseExponent": "idleExp",
        "IdleDecreaseOffset": "idleOffset", "FiringDecreaseCoefficient": "firingCoef",
        "FiringDecreaseExponent": "firingExp", "FiringDecreaseOffset": "firingOffset",
        "NotFiringDecreaseCoefficient": "notFiringCoef", "NotFiringDecreaseExponent": "notFiringExp",
        "NotFiringDecreaseOffset": "notFiringOffset", "FirstShotIncreaseMultiplier": "firstShotMul",
        "DistributionExponent": "distExp", "DecreaseCoefficient": "decreaseCoef",
        "DecreaseExponent": "decreaseExp", "DecreaseOffset": "decreaseOffset",
    }
    leaf = tail.split(".")[-1]
    mapped = names.get(leaf)
    if not mapped:
        return None
    prefix = "recoil" if suffix.startswith("Recoil.") else "spreadDyn"
    return f"{prefix}.{state}.moving.{mapped}" if moving else f"{prefix}.{state}.{mapped}"


def _projectile_candidates(projectile: dict[str, Any]) -> dict[str, Any]:
    curves = []
    for curve in projectile.get("linkedCurves", []):
        points = [[_number(x), _number(y)] for x, y in curve.get("rawPoints", [])]
        curves.append({"referenceField": curve.get("referenceField"), "points": points,
                       "minY": min((p[1] for p in points), default=None),
                       "maxY": max((p[1] for p in points), default=None)})
    return {"projectileXml": projectile.get("projectileXml"),
            "projectileGuid": projectile.get("projectileGuid"),
            "rawScalars": projectile.get("rawScalars", {}),
            "linkedCurves": curves,
            "unsupported": {"damageLabel": "Curve identity (direct/limb/HS) is not semantically decoded from class fields.",
                            "longRangeDamage": "Range endpoint selection requires the game's projectile consumer."}}


def derive_panel_values(site_weapon_id: str, selection: dict[str, Any], *, root: Path | str = ROOT) -> dict[str, Any]:
    """Convenience function for one report using the repository exports."""
    return FrostyPanelSource(root).derive(site_weapon_id, selection)


def expected_panel(site_weapon_id: str, slot: str, site_id: str, *, root: Path | str = ROOT) -> dict[str, Any]:
    """Return field entries suitable for a read-only audit sweep.

    Entries combine direct registry baseline candidates with the selected
    attachment's source candidates.  Unsupported panel labels are included
    with ``value: None`` and an explicit reason, so a caller cannot silently
    treat an absent source field as zero or as a screenshot value.
    """
    report = derive_panel_values(site_weapon_id, {"slot": slot, "id": site_id}, root=root)
    entries: dict[str, Any] = {}
    baseline = report.get("baseline", {})
    for field, source in baseline.get("fields", {}).items():
        entries[field] = {"value": source.get("value"), "status": "baseline-candidate",
                          "reason": "Direct exported Frosty registry baseline; selector deltas are separate.",
                          "sources": [source]}
    for field, source in report.get("fields", {}).items():
        entries[field] = {"value": source.get("value"),
                          "status": source.get("status", "source-candidate"),
                          "reason": source.get("reason", "Decoded from exported Frosty selector effects."),
                          "sources": source.get("sources", [])}
    for field, reason in report.get("unsupported", {}).items():
        if field not in entries:
            entries[field] = {"value": None, "status": "unsupported", "reason": reason, "sources": []}
    return _jsonable(entries)


DISPLAY_FIELDS = (
    "damage", "rateOfFireRpm", "magazineSize", "hipfire", "precision", "control",
    "mobility", "fireModes", "reloadTimeSeconds", "muzzleVelocityMps", "adsTimeMs",
    "headshotMultiplier", "longRangeDamage", "spotOnFire3dM", "spotOnFire2dM",
    "opponentHealthRegenDelaySeconds", "collateralMultiplier", "reloadInAds",
    "adsMoveSpeedMultiplier", "sprintRecoveryMs", "recoilAmountDegrees",
    "recoilVariationDegrees",
)


def _display_entry(value: Any, status: str, reason: str, sources: Iterable[Any] = ()) -> dict[str, Any]:
    return {"value": value, "status": status, "reason": reason, "sources": list(sources)}


def _field_sources(report: dict[str, Any], name: str) -> list[Any]:
    return report.get("fields", {}).get(name, {}).get("sources", [])


def _field_value(report: dict[str, Any], name: str) -> Any:
    field = report.get("fields", {}).get(name)
    return field.get("value") if field else None


def derive_display_candidates(site_weapon_id: str, slot: str, site_id: str, *, root: Path | str = ROOT,
                              source: FrostyPanelSource | None = None) -> dict[str, Any]:
    """Derive the 22 screenshot panel labels from independent Frosty data.

    The result always contains the same 22 keys.  Values marked
    ``source-candidate`` or ``derived-source-candidate`` use exported Frosty
    baselines and selector operands only.  ``unsupported`` values remain null;
    screenshot/site values are never used as a fallback.
    """
    report = (source or FrostyPanelSource(root)).derive(site_weapon_id, {"slot": slot, "id": site_id})
    baseline = report.get("baseline", {})
    base_fields = baseline.get("fields", {})
    out = {field: _display_entry(None, "unsupported", "No safe Frosty mapping for this panel field.")
           for field in DISPLAY_FIELDS}
    if site_id != 'none' and report.get('status') != 'mapped':
        return {field: _display_entry(None, 'unsupported',
            'Attachment selector mapping is missing or ambiguous; no neutral effect is assumed.')
            for field in DISPLAY_FIELDS}

    def base(name: str) -> tuple[Any, list[Any]]:
        source = base_fields.get(name, {})
        return source.get("value"), ([source] if source else [])

    rpm, rpm_sources = base("rpm")
    bullet_vel, velocity_sources = base("bulletVel")
    mag, mag_sources = base("magazineSize")
    reload_time, reload_sources = base("reloadTimeSeconds")
    if rpm is not None:
        out["rateOfFireRpm"] = _display_entry(rpm, "baseline-candidate",
            "Direct exported Frosty weapon firing rate.", rpm_sources)
    if mag is not None:
        out["magazineSize"] = _display_entry(mag, "baseline-candidate",
            "Direct exported Frosty magazine capacity; source/display chamber convention remains a review point.", mag_sources)
    if reload_time is not None:
        out["reloadTimeSeconds"] = _display_entry(reload_time, "baseline-candidate",
            "Direct exported Frosty tactical reload time (ReloadInfoArray[0]).", reload_sources)
    if bullet_vel is not None:
        out["muzzleVelocityMps"] = _display_entry(bullet_vel, "baseline-candidate",
            "Direct exported Frosty projectile initial speed.", velocity_sources)

    # Fire-mode selectors can change the firing logic.  The registry rate is
    # retained only when no such selector effect is present.
    fire_mode_effects = [e for e in report.get("effects", [])
                         if re.search(r"firemode|burst|fullauto|autoidentifier", e.get("sourceXml", ""), re.I)]
    if fire_mode_effects:
        out["rateOfFireRpm"] = _display_entry(None, "unsupported",
            "A fire-mode effect is present; native firing-logic activation and RPM are unresolved.", fire_mode_effects)
        out["fireModes"] = _display_entry(None, "unsupported",
            "Fire-mode activation is native/conditional; exported selector presence is not runtime proof.", fire_mode_effects)
    else:
        out["fireModes"] = _display_entry(None, "unsupported",
            "Fire-mode labels and activation are not decoded from the exported selector graph.")

    # Direct selector operands.  These are retained as sources even when the
    # panel needs an unexported base or ladder conversion.
    source_velocity = _field_value(report, "velocity")
    if bullet_vel is not None and isinstance(source_velocity, (int, float)):
        out["muzzleVelocityMps"] = _display_entry(bullet_vel * source_velocity,
            "derived-source-candidate", "Frosty initial speed multiplied by the exported selector velocity operand.",
            velocity_sources + _field_sources(report, "velocity"))
    source_reload = _field_value(report, "reloadSpeed")
    if reload_time is not None and isinstance(source_reload, (int, float)) and source_reload != 0:
        out["reloadTimeSeconds"] = _display_entry(reload_time / source_reload,
            "derived-source-candidate", "Frosty tactical reload time divided by the exported selector reload-speed operand.",
            reload_sources + _field_sources(report, "reloadSpeed"))
    source_mag = _field_value(report, "magazineSize")
    if isinstance(source_mag, (int, float)):
        out["magazineSize"] = _display_entry(source_mag, "source-candidate",
            "Direct exported magazine-capacity operand; verify displayed chamber convention.",
            _field_sources(report, "magazineSize"))

    # Recoil panel values use the source-requested formula.  The registry
    # values are baseline operands; the selector contributes a tier exponent.
    amount, amount_sources = base("recoil.ads.amount")
    amount_mult, amount_mult_sources = base("recoil.ads.amountMult")
    amount_exp, amount_exp_sources = base("recoil.ads.amountExp")
    amount_tier = _field_value(report, "recoil.ads.amountTier.add")
    if all(isinstance(x, (int, float)) for x in (amount, amount_mult, amount_exp)):
        tier = amount_tier if isinstance(amount_tier, (int, float)) else 0
        out["recoilAmountDegrees"] = _display_entry(
            amount * amount_mult ** (amount_exp + tier), "derived-source-candidate",
            "Frosty ADS recoil amount baseline multiplied by the exported source tier exponent.",
            amount_sources + amount_mult_sources + amount_exp_sources + _field_sources(report, "recoil.ads.amountTier.add"))
    variation, variation_sources = base("recoil.ads.dirVar")
    variation_mult, variation_mult_sources = base("recoil.ads.dirVarMult")
    variation_exp, variation_exp_sources = base("recoil.ads.dirVarExp")
    variation_tier = _field_value(report, "recoil.ads.variationTier.add")
    if all(isinstance(x, (int, float)) for x in (variation, variation_mult, variation_exp)):
        tier = variation_tier if isinstance(variation_tier, (int, float)) else 0
        out["recoilVariationDegrees"] = _display_entry(
            variation * variation_mult ** (variation_exp + tier), "derived-source-candidate",
            "Frosty ADS recoil variation baseline multiplied by the exported source tier exponent.",
            variation_sources + variation_mult_sources + variation_exp_sources + _field_sources(report, "recoil.ads.variationTier.add"))

    # Preserve source operands for fields requiring a ladder or an absent base.
    operand_reasons = {
        "adsTimeMs": ("adsTimeTier.add", "ADS time tier is decoded, but the base milliseconds/ladder is not exported in the selected Frosty baseline."),
        "adsMoveSpeedMultiplier": ("adsMoveSpeedTier", "ADS movement tier is decoded, but the base multiplier/ladder is not exported here."),
        "sprintRecoveryMs": ("sprintRecoveryTier", "Sprint recovery tier is decoded, but the milliseconds ladder is not exported here."),
        "spotOnFire3dM": ("worldSpotMult", "World spotting multiplier is decoded, but the base range is not present in the Frosty registry export."),
        "spotOnFire2dM": ("minimapSpotMult", "Minimap spotting multiplier is decoded, but the base range is not present in the Frosty registry export."),
        "opponentHealthRegenDelaySeconds": ("healthRegenDelayAdd", "Health-regeneration delay delta is decoded, but the base seconds value is not exported here."),
    }
    for display, (operand, reason) in operand_reasons.items():
        sources = _field_sources(report, operand)
        if sources:
            out[display] = _display_entry(None, "unsupported", reason, sources)

    projectile = baseline.get("projectile")
    projectile_sources = [projectile] if projectile else []
    for field, reason in {
        "damage": "Projectile curves are present, but their direct/limb/headshot semantic identity is unresolved.",
        "longRangeDamage": "Projectile curve range endpoint selection is unresolved.",
        "headshotMultiplier": "Projectile headshot scalar identity is unresolved.",
        "collateralMultiplier": "Projectile collateral scalar identity is unresolved.",
    }.items():
        out[field] = _display_entry(None, "unsupported", reason, projectile_sources)
    return _jsonable(out)


__all__ = ["FrostyPanelSource", "derive_panel_values", "expected_panel", "derive_display_candidates"]
