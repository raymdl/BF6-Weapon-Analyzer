/**
 * Apply the 2026-08-08 attachment consistency audit.
 *
 * WHY: the disagreements were resolved by reading each labeled stat crop and each highlighted
 * attachment card. This explicit list preserves those per-capture observations, including
 * rounded values that tie a baseline and therefore cannot be inferred from numbers alone.
 * It corrects only attachment-screenshot-review.json; it intentionally does not touch source
 * attachment data, UI files, or live-site data. Re-running it is a no-op.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const read = file => JSON.parse(fs.readFileSync(path.join(auditRoot, file), 'utf8'));
const review = read('attachment-screenshot-review.json');
const effectReadings = [
  {
    "weapon": "M417 A2",
    "attachmentType": "Muzzle",
    "attachment": "Double-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "04_M417 A2_Muzzle_Double-Port_Brake.png",
    "observedValue": 0.9,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SOR-300SC",
    "attachmentType": "Muzzle",
    "attachment": "Double-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "05_SOR-300SC_Muzzle_Double-Port_Brake.png",
    "observedValue": 0.7,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SG 553R",
    "attachmentType": "Muzzle",
    "attachment": "Double-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "05_SG 553R_Muzzle_Double-Port_Brake.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Muzzle",
    "attachment": "Double-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "05_KTS100 MK8_Muzzle_Double-Port_Brake.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "M121 A2",
    "attachmentType": "Muzzle",
    "attachment": "Double-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "04_M121 A2_Muzzle_Double-Port_Brake.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "M417 A2",
    "attachmentType": "Muzzle",
    "attachment": "Compensated Brake",
    "stat": "recoilAmountDegrees",
    "capture": "05_M417 A2_Muzzle_Compensated_Brake.png",
    "observedValue": 0.9,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SOR-300SC",
    "attachmentType": "Muzzle",
    "attachment": "Compensated Brake",
    "stat": "recoilAmountDegrees",
    "capture": "06_SOR-300SC_Muzzle_Compensated_Brake.png",
    "observedValue": 0.7,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SG 553R",
    "attachmentType": "Muzzle",
    "attachment": "Compensated Brake",
    "stat": "recoilAmountDegrees",
    "capture": "06_SG 553R_Muzzle_Compensated_Brake.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Muzzle",
    "attachment": "Compensated Brake",
    "stat": "recoilAmountDegrees",
    "capture": "06_KTS100 MK8_Muzzle_Compensated_Brake.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "M121 A2",
    "attachmentType": "Muzzle",
    "attachment": "Compensated Brake",
    "stat": "recoilAmountDegrees",
    "capture": "09_M121 A2_Muzzle_Compensated_Brake.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Muzzle",
    "attachment": "Linear Comp",
    "stat": "precision",
    "capture": "08_TR7_Muzzle_Linear_Comp.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "SVK-8.6",
    "attachmentType": "Muzzle",
    "attachment": "Linear Comp",
    "stat": "control",
    "capture": "06_SVK-8.6_Muzzle_Linear_Comp.png",
    "observedValue": 8,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Muzzle",
    "attachment": "Standard Suppressor",
    "stat": "hipfire",
    "capture": "03_L115_Muzzle_Standard_Suppressor.png",
    "observedValue": 34,
    "observedArrow": null
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Folding Vertical",
    "stat": "precision",
    "capture": "29_TR7_Grip_Folding_Vertical.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "GRT-CPS",
    "attachmentType": "Grip",
    "attachment": "Folding Vertical",
    "stat": "precision",
    "capture": "30_GRT-CPS_Grip_Folding_Vertical.png",
    "observedValue": 80,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Folding Vertical",
    "stat": "recoilAmountDegrees",
    "capture": "29_KTS100 MK8_Grip_Folding_Vertical.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Alloy Vertical",
    "stat": "precision",
    "capture": "30_TR7_Grip_Alloy_Vertical.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "GRT-CPS",
    "attachmentType": "Grip",
    "attachment": "Alloy Vertical",
    "stat": "precision",
    "capture": "32_GRT-CPS_Grip_Alloy_Vertical.png",
    "observedValue": 80,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Alloy Vertical",
    "stat": "recoilAmountDegrees",
    "capture": "30_KTS100 MK8_Grip_Alloy_Vertical.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Ribbed Vertical",
    "stat": "precision",
    "capture": "31_TR7_Grip_Ribbed_Vertical.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Ribbed Vertical",
    "stat": "mobility",
    "capture": "31_KTS100 MK8_Grip_Ribbed_Vertical.png",
    "observedValue": 40,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Ribbed Vertical",
    "stat": "recoilAmountDegrees",
    "capture": "31_KTS100 MK8_Grip_Ribbed_Vertical.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "LMR27",
    "attachmentType": "Grip",
    "attachment": "6H64 Vertical",
    "stat": "precision",
    "capture": "35_LMR27_Grip_6H64_Vertical.png",
    "observedValue": 75,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Classic Vertical",
    "stat": "control",
    "capture": "33_KTS100 MK8_Grip_Classic_Vertical.png",
    "observedValue": 75,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Folding Stubby",
    "stat": "precision",
    "capture": "34_TR7_Grip_Folding_Stubby.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "GRT-CPS",
    "attachmentType": "Grip",
    "attachment": "Folding Stubby",
    "stat": "precision",
    "capture": "31_GRT-CPS_Grip_Folding_Stubby.png",
    "observedValue": 80,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Folding Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "34_KTS100 MK8_Grip_Folding_Stubby.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Ribbed Stubby",
    "stat": "precision",
    "capture": "35_TR7_Grip_Ribbed_Stubby.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "GRT-CPS",
    "attachmentType": "Grip",
    "attachment": "Ribbed Stubby",
    "stat": "precision",
    "capture": "36_GRT-CPS_Grip_Ribbed_Stubby.png",
    "observedValue": 80,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Ribbed Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "35_KTS100 MK8_Grip_Ribbed_Stubby.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Canted Stubby",
    "stat": "precision",
    "capture": "36_TR7_Grip_Canted_Stubby.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "precision",
    "capture": "28_L115_Grip_Low-Profile_Stubby.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "precision",
    "capture": "27_M2010 ESR_Grip_Low-Profile_Stubby.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "precision",
    "capture": "29_Mini Scout_Grip_Low-Profile_Stubby.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "precision",
    "capture": "25_PSR_Grip_Low-Profile_Stubby.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "precision",
    "capture": "24_SV-98_Grip_Low-Profile_Stubby.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "28_L115_Grip_Low-Profile_Stubby.png",
    "observedValue": 12,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "27_M2010 ESR_Grip_Low-Profile_Stubby.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "29_Mini Scout_Grip_Low-Profile_Stubby.png",
    "observedValue": 28,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "25_PSR_Grip_Low-Profile_Stubby.png",
    "observedValue": 14,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "24_SV-98_Grip_Low-Profile_Stubby.png",
    "observedValue": 22,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "control",
    "capture": "38_KTS100 MK8_Grip_Low-Profile_Stubby.png",
    "observedValue": 75,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "mobility",
    "capture": "28_L115_Grip_Low-Profile_Stubby.png",
    "observedValue": 50,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "mobility",
    "capture": "27_M2010 ESR_Grip_Low-Profile_Stubby.png",
    "observedValue": 50,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "mobility",
    "capture": "29_Mini Scout_Grip_Low-Profile_Stubby.png",
    "observedValue": 60,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "mobility",
    "capture": "25_PSR_Grip_Low-Profile_Stubby.png",
    "observedValue": 42,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "mobility",
    "capture": "24_SV-98_Grip_Low-Profile_Stubby.png",
    "observedValue": 50,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "adsMoveSpeedMultiplier",
    "capture": "28_L115_Grip_Low-Profile_Stubby.png",
    "observedValue": 0.54,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "adsMoveSpeedMultiplier",
    "capture": "27_M2010 ESR_Grip_Low-Profile_Stubby.png",
    "observedValue": 0.54,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "adsMoveSpeedMultiplier",
    "capture": "29_Mini Scout_Grip_Low-Profile_Stubby.png",
    "observedValue": 0.67,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "adsMoveSpeedMultiplier",
    "capture": "25_PSR_Grip_Low-Profile_Stubby.png",
    "observedValue": 0.47,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "adsMoveSpeedMultiplier",
    "capture": "24_SV-98_Grip_Low-Profile_Stubby.png",
    "observedValue": 0.54,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "28_L115_Grip_Low-Profile_Stubby.png",
    "observedValue": 2,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "27_M2010 ESR_Grip_Low-Profile_Stubby.png",
    "observedValue": 1.5,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "29_Mini Scout_Grip_Low-Profile_Stubby.png",
    "observedValue": 1,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "25_PSR_Grip_Low-Profile_Stubby.png",
    "observedValue": 1.8,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Low-Profile Stubby",
    "stat": "recoilAmountDegrees",
    "capture": "24_SV-98_Grip_Low-Profile_Stubby.png",
    "observedValue": 1.3,
    "observedArrow": null
  },
  {
    "weapon": "M417 A2",
    "attachmentType": "Grip",
    "attachment": "Adjustable Angled",
    "stat": "recoilAmountDegrees",
    "capture": "40_M417 A2_Grip_Adjustable_Angled.png",
    "observedValue": 0.9,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "control",
    "capture": "29_L115_Grip_Slim_Angled.png",
    "observedValue": 12,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "control",
    "capture": "28_M2010 ESR_Grip_Slim_Angled.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "control",
    "capture": "30_Mini Scout_Grip_Slim_Angled.png",
    "observedValue": 28,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "control",
    "capture": "26_PSR_Grip_Slim_Angled.png",
    "observedValue": 14,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "control",
    "capture": "25_SV-98_Grip_Slim_Angled.png",
    "observedValue": 22,
    "observedArrow": null
  },
  {
    "weapon": "CZ3A1",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "38_CZ3A1_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "KV9",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "38_KV9_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PW5A3",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "38_PW5A3_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PW7A2",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "38_PW7A2_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SCW-10",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "38_SCW-10_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SGX",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "39_SGX_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "UMG-40",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "41_UMG-40_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PP-19",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "sprintRecoveryMs",
    "capture": "35_PP-19_Grip_Slim_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "29_L115_Grip_Slim_Angled.png",
    "observedValue": 2,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "28_M2010 ESR_Grip_Slim_Angled.png",
    "observedValue": 1.5,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "30_Mini Scout_Grip_Slim_Angled.png",
    "observedValue": 1,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "26_PSR_Grip_Slim_Angled.png",
    "observedValue": 1.8,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "25_SV-98_Grip_Slim_Angled.png",
    "observedValue": 1.3,
    "observedArrow": null
  },
  {
    "weapon": "M417 A2",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "41_M417 A2_Grip_Slim_Angled.png",
    "observedValue": 0.9,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SG 553R",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "39_SG 553R_Grip_Slim_Angled.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "40_KTS100 MK8_Grip_Slim_Angled.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "M121 A2",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "stat": "recoilAmountDegrees",
    "capture": "33_M121 A2_Grip_Slim_Angled.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "precision",
    "capture": "26_L115_Grip_Full_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "precision",
    "capture": "29_M2010 ESR_Grip_Full_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "precision",
    "capture": "31_Mini Scout_Grip_Full_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "precision",
    "capture": "27_PSR_Grip_Full_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "precision",
    "capture": "26_SV-98_Grip_Full_Angled.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "control",
    "capture": "26_L115_Grip_Full_Angled.png",
    "observedValue": 12,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "control",
    "capture": "29_M2010 ESR_Grip_Full_Angled.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "control",
    "capture": "31_Mini Scout_Grip_Full_Angled.png",
    "observedValue": 28,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "control",
    "capture": "27_PSR_Grip_Full_Angled.png",
    "observedValue": 14,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "control",
    "capture": "26_SV-98_Grip_Full_Angled.png",
    "observedValue": 22,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "26_L115_Grip_Full_Angled.png",
    "observedValue": 2,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "29_M2010 ESR_Grip_Full_Angled.png",
    "observedValue": 1.5,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "31_Mini Scout_Grip_Full_Angled.png",
    "observedValue": 1,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "27_PSR_Grip_Full_Angled.png",
    "observedValue": 1.8,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "26_SV-98_Grip_Full_Angled.png",
    "observedValue": 1.3,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "stat": "recoilAmountDegrees",
    "capture": "41_KTS100 MK8_Grip_Full_Angled.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "PTT Grip Pod",
    "stat": "precision",
    "capture": "40_TR7_Grip_PTT_Grip_Pod.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "PTT Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "43_KTS100 MK8_Grip_PTT_Grip_Pod.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "41_TR7_Grip_QD_Grip_Pod.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "30_L115_Grip_QD_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "31_M2010 ESR_Grip_QD_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "33_Mini Scout_Grip_QD_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "29_PSR_Grip_QD_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "precision",
    "capture": "28_SV-98_Grip_QD_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "control",
    "capture": "30_L115_Grip_QD_Grip_Pod.png",
    "observedValue": 12,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "control",
    "capture": "31_M2010 ESR_Grip_QD_Grip_Pod.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "control",
    "capture": "33_Mini Scout_Grip_QD_Grip_Pod.png",
    "observedValue": 28,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "control",
    "capture": "29_PSR_Grip_QD_Grip_Pod.png",
    "observedValue": 14,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "control",
    "capture": "28_SV-98_Grip_QD_Grip_Pod.png",
    "observedValue": 22,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "30_L115_Grip_QD_Grip_Pod.png",
    "observedValue": 2,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "31_M2010 ESR_Grip_QD_Grip_Pod.png",
    "observedValue": 1.5,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "33_Mini Scout_Grip_QD_Grip_Pod.png",
    "observedValue": 1,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "29_PSR_Grip_QD_Grip_Pod.png",
    "observedValue": 1.8,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "28_SV-98_Grip_QD_Grip_Pod.png",
    "observedValue": 1.3,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "QD Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "44_KTS100 MK8_Grip_QD_Grip_Pod.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "TR7",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "42_TR7_Grip_Classic_Grip_Pod.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "GRT-CPS",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "46_GRT-CPS_Grip_Classic_Grip_Pod.png",
    "observedValue": 80,
    "observedArrow": {
      "direction": "up",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "31_L115_Grip_Classic_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "32_M2010 ESR_Grip_Classic_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "34_Mini Scout_Grip_Classic_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "30_PSR_Grip_Classic_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "precision",
    "capture": "29_SV-98_Grip_Classic_Grip_Pod.png",
    "observedValue": 100,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "control",
    "capture": "31_L115_Grip_Classic_Grip_Pod.png",
    "observedValue": 12,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "control",
    "capture": "32_M2010 ESR_Grip_Classic_Grip_Pod.png",
    "observedValue": 17,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "control",
    "capture": "34_Mini Scout_Grip_Classic_Grip_Pod.png",
    "observedValue": 28,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "control",
    "capture": "30_PSR_Grip_Classic_Grip_Pod.png",
    "observedValue": 14,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "control",
    "capture": "29_SV-98_Grip_Classic_Grip_Pod.png",
    "observedValue": 22,
    "observedArrow": null
  },
  {
    "weapon": "L115",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "31_L115_Grip_Classic_Grip_Pod.png",
    "observedValue": 2,
    "observedArrow": null
  },
  {
    "weapon": "M2010 ESR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "32_M2010 ESR_Grip_Classic_Grip_Pod.png",
    "observedValue": 1.5,
    "observedArrow": null
  },
  {
    "weapon": "Mini Scout",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "34_Mini Scout_Grip_Classic_Grip_Pod.png",
    "observedValue": 1,
    "observedArrow": null
  },
  {
    "weapon": "PSR",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "30_PSR_Grip_Classic_Grip_Pod.png",
    "observedValue": 1.8,
    "observedArrow": null
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "29_SV-98_Grip_Classic_Grip_Pod.png",
    "observedValue": 1.3,
    "observedArrow": null
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Grip",
    "attachment": "Classic Grip Pod",
    "stat": "recoilAmountDegrees",
    "capture": "45_KTS100 MK8_Grip_Classic_Grip_Pod.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SOR-300SC",
    "attachmentType": "Muzzle",
    "attachment": "Single-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "04_SOR-300SC_Muzzle_Single-Port_Brake.png",
    "observedValue": 0.7,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "SG 553R",
    "attachmentType": "Muzzle",
    "attachment": "Single-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "04_SG 553R_Muzzle_Single-Port_Brake.png",
    "observedValue": 0.8,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Muzzle",
    "attachment": "Single-Port Brake",
    "stat": "recoilAmountDegrees",
    "capture": "04_KTS100 MK8_Muzzle_Single-Port_Brake.png",
    "observedValue": 0.5,
    "observedArrow": {
      "direction": "down",
      "effect": "buff",
      "color": "green"
    }
  }
];
const subtypeCorrections = [
  {
    "weapon": "GRT-BC",
    "attachmentType": "Ergonomics",
    "attachment": "Burst Training",
    "capture": "54_GRT-BC_Ergonomics_Burst_Training.png",
    "observedSubtype": "Burst Fire"
  },
  {
    "weapon": "SG 553R",
    "attachmentType": "Ergonomics",
    "attachment": "Burst Training",
    "capture": "59_SG 553R_Ergonomics_BURST_TRAINING.png",
    "observedSubtype": "Burst Fire"
  },
  {
    "weapon": "DRS-IAR",
    "attachmentType": "Ergonomics",
    "attachment": "Rail Cover",
    "capture": "67_DRS-IAR_Ergonomics_RAIL_COVER.png",
    "observedSubtype": "Rail Cover"
  },
  {
    "weapon": "KTS100 MK8",
    "attachmentType": "Ergonomics",
    "attachment": "Rail Cover",
    "capture": "60_KTS100 MK8_Ergonomics_RAIL_COVER.png",
    "observedSubtype": "Rail Cover"
  },
  {
    "weapon": "M240L",
    "attachmentType": "Ergonomics",
    "attachment": "Rail Cover",
    "capture": "50_M240L_Ergonomics_Rail_Cover.png",
    "observedSubtype": "Rail Cover"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Grip",
    "attachment": "Canted Stubby",
    "capture": "40_L85A3_Grip_Canted_Stubby.png",
    "observedSubtype": "Stubby"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Grip",
    "attachment": "Folding Stubby",
    "capture": "38_L85A3_Grip_Folding_Stubby.png",
    "observedSubtype": "Stubby"
  },
  {
    "weapon": "SV-98",
    "attachmentType": "Grip",
    "attachment": "Full Angled",
    "capture": "26_SV-98_Grip_Full_Angled.png",
    "observedSubtype": "Angled"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Grip",
    "attachment": "Ribbed Stubby",
    "capture": "39_L85A3_Grip_Ribbed_Stubby.png",
    "observedSubtype": "Stubby"
  },
  {
    "weapon": "M87A1",
    "attachmentType": "Grip",
    "attachment": "Slim Angled",
    "capture": "29_M87A1_Grip_Slim_Angled.png",
    "observedSubtype": "Angled"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Grip",
    "attachment": "Stippled Stubby",
    "capture": "41_L85A3_Grip_Stippled_Stubby.png",
    "observedSubtype": "Stubby"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Grip",
    "attachment": "Underslung Mount",
    "capture": "37_L85A3_Grip_UNDERSLUNG_MOUNT.png",
    "observedSubtype": "Mount"
  },
  {
    "weapon": "M433",
    "attachmentType": "Laser",
    "attachment": "120 MW Blue",
    "capture": "26_M433_Laser_120_MW_Blue.png",
    "observedSubtype": "Blue Laser"
  },
  {
    "weapon": "M433",
    "attachmentType": "Laser",
    "attachment": "5 MW Red",
    "capture": "21_M433_Laser_5_MW_Red.png",
    "observedSubtype": "Red Laser"
  },
  {
    "weapon": "KORD 6P67",
    "attachmentType": "Muzzle",
    "attachment": "CQB Suppressor",
    "capture": "10_KORD 6P67_Muzzle_CQB_Suppressor.png",
    "observedSubtype": "Suppressor"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "CQB Suppressor",
    "capture": "12_L85A3_Muzzle_CQB_Suppressor.png",
    "observedSubtype": "Suppressor"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "Flash Comp",
    "capture": "03_L85A3_Muzzle_Flash_Comp.png",
    "observedSubtype": "Flash Hider"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "Lightened Suppressor",
    "capture": "11_L85A3_Muzzle_Lightened_Suppressor.png",
    "observedSubtype": "Suppressor"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "Linear Comp",
    "capture": "08_L85A3_Muzzle_Linear_Comp.png",
    "observedSubtype": "Convertor"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "Long Suppressor",
    "capture": "10_L85A3_Muzzle_Long_Suppressor.png",
    "observedSubtype": "Suppressor"
  },
  {
    "weapon": "L85A3",
    "attachmentType": "Muzzle",
    "attachment": "Standard Suppressor",
    "capture": "09_L85A3_Muzzle_Standard_Suppressor.png",
    "observedSubtype": "Suppressor"
  }
];
const barrelCorrections = [
  {
    "weapon": "M433",
    "attachment": "14.5\" Standard",
    "stat": "spotOnFire3dM",
    "capture": "14_M433_Barrel_Short.png",
    "observedValue": 54,
    "observedArrow": null
  },
  {
    "weapon": "M433",
    "attachment": "16.5\" Fluted",
    "stat": "spotOnFire3dM",
    "capture": "15_M433_Barrel_Light.png",
    "observedValue": 54,
    "observedArrow": null
  }
];
const basename = value => path.basename(value).toLowerCase();
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const arrowShape = value => value ? { direction: value.direction, effect: value.effect, color: value.color } : null;
const findRecord = item => {
  const attachmentType = item.attachmentType ?? 'Barrel';
  const matches = review.records.filter(record => record.weaponName === item.weapon
    && record.attachmentType === attachmentType
    && record.attachmentName === item.attachment
    && basename(record.source?.currentPath ?? '') === basename(item.capture));
  if (matches.length !== 1) throw new Error(`Expected one record for ${item.weapon}/${item.attachment}/${item.capture}, got ${matches.length}`);
  return matches[0];
};
const summary = { effectValueCorrections: 0, effectAdded: 0, effectRemoved: 0, effectRedirected: 0, subtypeCorrections: 0, barrelCorrections: 0, unchanged: 0 };
const changes = [];
for (const item of effectReadings) {
  const record = findRecord(item);
  const comparisons = record.statComparisons ?? (record.statComparisons = {});
  const beforeValue = record.stats[item.stat];
  const beforeArrow = comparisons[item.stat] ?? null;
  const valueChanged = beforeValue !== item.observedValue;
  if (valueChanged) { record.stats[item.stat] = item.observedValue; summary.effectValueCorrections++; }
  const afterArrow = item.observedArrow;
  if (same(arrowShape(beforeArrow), afterArrow)) {
    if (valueChanged) changes.push({ weapon: item.weapon, attachment: item.attachment, stat: item.stat, action: 'value', beforeValue, afterValue: item.observedValue, beforeArrow, afterArrow });
    else summary.unchanged++;
    continue;
  }
  if (afterArrow === null) { delete comparisons[item.stat]; summary.effectRemoved++; }
  else if (beforeArrow === null) { comparisons[item.stat] = { ...afterArrow }; summary.effectAdded++; }
  else { comparisons[item.stat] = { ...afterArrow }; summary.effectRedirected++; }
  changes.push({ weapon: item.weapon, attachment: item.attachment, stat: item.stat, beforeValue, afterValue: item.observedValue, beforeArrow, afterArrow });
}
for (const item of subtypeCorrections) {
  const record = findRecord(item);
  if (record.attachmentSubtype === item.observedSubtype) { summary.unchanged++; continue; }
  changes.push({ weapon: item.weapon, attachment: item.attachment, beforeSubtype: record.attachmentSubtype, afterSubtype: item.observedSubtype });
  record.attachmentSubtype = item.observedSubtype;
  summary.subtypeCorrections++;
}
for (const item of barrelCorrections) {
  const record = findRecord(item);
  const comparisons = record.statComparisons ?? (record.statComparisons = {});
  const beforeValue = record.stats[item.stat];
  const beforeArrow = comparisons[item.stat] ?? null;
  let changed = false;
  if (beforeValue !== item.observedValue) { record.stats[item.stat] = item.observedValue; changed = true; }
  if (item.observedArrow === null && beforeArrow !== null) { delete comparisons[item.stat]; changed = true; }
  if (changed) { summary.barrelCorrections++; changes.push({ weapon: item.weapon, attachment: item.attachment, stat: item.stat, beforeValue, afterValue: item.observedValue, beforeArrow, afterArrow: item.observedArrow }); }
  else summary.unchanged++;
}
if (changes.length) { review.generatedAt = new Date().toISOString(); fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n'); }
console.log(JSON.stringify({ ...summary, changedRecords: changes.length, noOp: changes.length === 0 }, null, 2));
