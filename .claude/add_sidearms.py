"""Add sidearm weapon entries to data/weapons.json from sym.gg spreadsheet data."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def rv(amount, mult, exp):
    """recoilV = ADSRecoilAmount * ADSRecoilAmountMultiplier^ADSRecoilAmountMultiplierExponent"""
    return round(amount * math.pow(mult, exp), 3)

def recoil_group(dir_, amount, mult, mexp, dirVar, dvMult, dvExp, decTimeExp, decFactor, decExp=1):
    return {
        "dir": dir_, "amount": amount, "amountMult": mult, "amountExp": mexp,
        "dirVar": dirVar, "dirVarMult": dvMult, "dirVarExp": dvExp,
        "decNorm": 1, "decExp": decExp, "decTimeExp": decTimeExp,
        "decOffset": 0.06, "duration": 0.025, "decFactor": decFactor,
        "shootingDecScale": 1
    }

def ads_spread(inc, idleExp, idleOffset, firingCoef, firingExp, firingOffset, notFiringOffset):
    return {
        "inc": inc, "idleTime": 0.4,
        "idleCoef": 0, "idleExp": idleExp, "idleOffset": idleOffset,
        "firingCoef": firingCoef, "firingExp": firingExp, "firingOffset": firingOffset,
        "notFiringCoef": 0, "notFiringExp": 0.25, "notFiringOffset": notFiringOffset,
        "firstShotMul": 1, "distExp": 0.67
    }

def hip_spread(inc, firingCoef, firingExp, firingOffset):
    return {
        "inc": inc, "idleTime": 0.6,
        "idleCoef": 0, "idleExp": 0.25, "idleOffset": 25,
        "firingCoef": firingCoef, "firingExp": firingExp, "firingOffset": firingOffset,
        "notFiringCoef": 0, "notFiringExp": 0.25, "notFiringOffset": 12.96,
        "firstShotMul": 1, "distExp": 0.5
    }

def weapon(id_, name, cal, rpm, mag, tacRld, emptyRld, deployT, bulletVel,
           recoilAmount, recoilDir, recoilVar, recoilMult, recoilMexp, dvMult, dvExp,
           decTimeExp, decFactor,
           recoilIncAds, spreadMax, adsTime, fireMode,
           adsInc, adsIdleExp, adsIdleOffset, adsFiringCoef, adsFiringExp,
           adsFiringOffset, adsNotFiringOffset,
           hipInc, hipFiringCoef, hipFiringExp, hipFiringOffset,
           hipMin, hipMoveMin):
    rg = recoil_group(recoilDir, recoilAmount, recoilMult, recoilMexp,
                      recoilVar, dvMult, dvExp, decTimeExp, decFactor)
    return {
        "id": id_, "name": name, "cls": "Sidearm", "cal": cal,
        "rpm": rpm, "mag": mag, "tacRld": tacRld, "emptyRld": emptyRld,
        "deployT": deployT, "bulletVel": bulletVel,
        "recoilV": rv(recoilAmount, recoilMult, recoilMexp),
        "recoilDir": recoilDir, "recoilVar": recoilVar,
        "recoilIncAds": recoilIncAds, "spreadMax": spreadMax,
        "adsTime": adsTime, "fireMode": fireMode,
        "spreadDyn": {
            "ads": ads_spread(adsInc, adsIdleExp, adsIdleOffset,
                              adsFiringCoef, adsFiringExp, adsFiringOffset, adsNotFiringOffset),
            "hip": hip_spread(hipInc, hipFiringCoef, hipFiringExp, hipFiringOffset),
        },
        "recoil": {"ads": rg, "hip": rg},
        "spread": {
            "adsStand": [0.05, 6], "adsMove": [0.32, 6],
            "hipStand": [hipMin, 6], "hipMove": [hipMoveMin, 6],
        },
    }

# All values sourced from sym.gg spreadsheet (BF6 Sym.gg Weapon Data.xlsx)
# adsTime is estimated (ms) — not present in sym.gg dataset
# emptyRld = None for revolvers (no distinct empty-cylinder reload)
SIDEARMS = [
    weapon("p18", "P18", "9×19mm",
           400, 18, 1.934, 2.117, 0.267, 350,
           1.2, -5, 15.0, 0.94, 0, 0.920121, 0, 0.5555, 13.7,
           0.0, 6, 175, "semi",
           0.0, 1, 9.765, 0, 0.25, 6.6, 6.6,
           0.299, 0.19125, 2.5, 1.24125, 1.352, 1.69),
    weapon("es57", "ES 5.7", "5.7×28mm",
           450, 21, 2.017, 2.2, 0.233, 650,
           1.0, 5, 15.0, 0.94, 0, 0.920121, 0, 0.398, 12,
           0.0, 6, 175, "semi",
           0.0, 1, 13.02, 0, 0.25, 6.6, 6.6,
           0.299, 0.255, 2.5, 1.655, 1.352, 1.69),
    weapon("m45a1", "M45A1", ".45 ACP",
           327, 8, 1.867, 2.0, 0.267, 336,
           1.67, 0, 12.0, 0.94, 0, 0.920371, 0, 0.75, 16,
           0.0, 6, 200, "semi",
           0.0, 1, 9.765, 0, 0.25, 6.6, 6.6,
           0.378, 0.145714, 2.5, 0.945714, 1.352, 1.69),
    weapon("m44", "M44", ".44 Magnum",
           164, 6, 3.4, None, 0.4, 440,
           6.0, -8, 12.0, 0.94, 0, 0.920371, 0, 1.333, 21.5,
           0.0, 6, 225, "semi",
           0.0, 1, 7.812, 0, 0.25, 6.6, 6.6,
           0.486, 0.085, 2.5, 0.551667, 1.352, 1.69),
    weapon("ggh22", "GGH-22", "9×19mm",
           360, 16, 1.934, 2.25, 0.267, 400,
           1.5, -7, 12.0, 0.94, 0, 0.920371, 0, 0.5555, 13.7,
           0.0, 6, 175, "semi",
           0.0, 1, 9.765, 0, 0.25, 6.6, 6.6,
           0.299, 0.19125, 2.5, 1.24125, 1.352, 1.69),
    weapon("m357trait", "M357 Trait", ".357 Magnum",
           225, 8, 3.067, None, 0.35, 410,
           3.0, -10, 15.0, 0.94, 0, 0.920121, 0, 1.333, 21.5,
           0.0, 6, 225, "semi",
           0.0, 1, 9.765, 0, 0.25, 6.6, 6.6,
           0.486, 0.085, 2.5, 0.551667, 1.352, 1.69),
    weapon("vz61", "VZ. 61", "7.65×17mm",
           818, 11, 2.134, 2.667, 0.4, 326,
           0.4285, -10, 20.8, 0.9283, -2, 0.904055, 0, 0.84, 40,
           0.151, 6, 175, "auto",
           0.151, 0.25, 7.5, 1.22, 2.5, 1.84, 7.2,
           0.272, 0.51, 2.5, 3.31, 1.804, 2.255),
]

# Load existing weapons.json
weapons_path = ROOT / "data" / "weapons.json"
weapons = json.loads(weapons_path.read_text(encoding="utf-8"))

# Check for duplicates
existing_ids = {w["id"] for w in weapons}
added = []
for w in SIDEARMS:
    if w["id"] in existing_ids:
        print(f"  SKIP {w['id']} — already present")
    else:
        weapons.append(w)
        added.append(w["id"])
        print(f"  ADD  {w['id']} ({w['name']}): recoilV={w['recoilV']}, cls={w['cls']}")

weapons_path.write_text(
    json.dumps(weapons, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
print(f"\nWrote {weapons_path} ({weapons_path.stat().st_size / 1024:.1f} KB)")
print(f"Total weapons: {len(weapons)}  (added {len(added)})")
