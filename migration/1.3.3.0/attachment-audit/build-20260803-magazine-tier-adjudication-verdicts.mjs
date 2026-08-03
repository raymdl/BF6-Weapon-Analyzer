import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const worksheetPath = path.join(here, "magazine-tier-adjudication-worksheet.json");
const outputPath = path.join(here, "magazine-tier-adjudication-verdicts.json");

// These values were transcribed from the PNG stat panels before consulting the
// worksheet's model/corpus values. Arrows describe the direction of the
// coloured triangle visible beside each rendered value.
const READS = {
  "Weapon Attachments/Assault Rifle/B36A4/51_B36A4_Magazine_20Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 167, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "up" },
    magValue: { value: 20, arrow: "down" },
    hoveredTileName: "20RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/52_B36A4_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "up" },
    magValue: { value: 20, arrow: "down" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/53_B36A4_Magazine_30Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.6, arrow: "none" },
    magValue: { value: 30, arrow: "none" },
    hoveredTileName: "30RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/54_B36A4_Magazine_36Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 36, arrow: "up" },
    hoveredTileName: "36RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/55_B36A4_Magazine_40Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 40, arrow: "up" },
    hoveredTileName: "40RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/56_B36A4_Magazine_40Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 40, arrow: "up" },
    hoveredTileName: "40RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/57_B36A4_Magazine_45Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 45, arrow: "up" },
    hoveredTileName: "45RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/B36A4/58_B36A4_Magazine_45Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 45, arrow: "up" },
    hoveredTileName: "45RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/48_M433_Magazine_20Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 167, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "up" },
    magValue: { value: 20, arrow: "down" },
    hoveredTileName: "20RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/49_M433_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "up" },
    magValue: { value: 20, arrow: "down" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/50_M433_Magazine_30Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.6, arrow: "none" },
    magValue: { value: 30, arrow: "none" },
    hoveredTileName: "30RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/51_M433_Magazine_36Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 36, arrow: "up" },
    hoveredTileName: "36RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/52_M433_Magazine_40Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 40, arrow: "up" },
    hoveredTileName: "40RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/M433/53_M433_Magazine_40Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 40, arrow: "up" },
    hoveredTileName: "40RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/44_TR7_Magazine_15Rnd_Magazine.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 167, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.6, arrow: "none" },
    magValue: { value: 15, arrow: "down" },
    hoveredTileName: "15RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/45_TR7_Magazine_10Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 200, arrow: "down" },
    sprintRecovery: { value: 167, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "up" },
    magValue: { value: 10, arrow: "down" },
    hoveredTileName: "10RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/46_TR7_Magazine_20Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.6, arrow: "none" },
    magValue: { value: 20, arrow: "none" },
    hoveredTileName: "20RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/47_TR7_Magazine_25Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 25, arrow: "up" },
    hoveredTileName: "25RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/48_TR7_Magazine_25Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 25, arrow: "up" },
    hoveredTileName: "25RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Assault Rifle/TR7/49_TR7_Magazine_30Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 30, arrow: "up" },
    hoveredTileName: "30RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/GRT-CPS/48_GRT-CPS_Magazine_20Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.6, arrow: "none" },
    magValue: { value: 20, arrow: "none" },
    hoveredTileName: "20RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/GRT-CPS/50_GRT-CPS_Magazine_30Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "down" },
    magValue: { value: 30, arrow: "up" },
    hoveredTileName: "30RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/M39 EMR/47_M39 EMR_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 20, arrow: "none" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/M39 EMR/51_M39 EMR_Magazine_25Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.47, arrow: "down" },
    magValue: { value: 25, arrow: "up" },
    hoveredTileName: "25RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/SVDM/46_SVDM_Magazine_10Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 10, arrow: "none" },
    hoveredTileName: "10RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/DMR/SVDM/48_SVDM_Magazine_10Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 10, arrow: "none" },
    hoveredTileName: "10RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/KTS100 MK8/46_KTS100 MK8_Magazine_60RND_DRUM_MAG.png": {
    adsTimeIn: { value: 367, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 60, arrow: "none" },
    hoveredTileName: "60RND DRUM MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/KTS100 MK8/47_KTS100 MK8_Magazine_45Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "down" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 45, arrow: "down" },
    hoveredTileName: "45RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/KTS100 MK8/48_KTS100 MK8_Magazine_50Rnd_Magazine.png": {
    adsTimeIn: { value: 367, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 50, arrow: "down" },
    hoveredTileName: "50RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/KTS100 MK8/49_KTS100 MK8_Magazine_45Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 300, arrow: "down" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 45, arrow: "down" },
    hoveredTileName: "45RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/KTS100 MK8/51_KTS100 MK8_Magazine_100Rnd_Drum_Mag.png": {
    adsTimeIn: { value: 367, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.47, arrow: "down" },
    magValue: { value: 100, arrow: "up" },
    hoveredTileName: "100RND DRUM MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/M121 A2/45_M121 A2_Magazine_50RND_BELT_POUCH.png": {
    adsTimeIn: { value: 433, arrow: "none" },
    sprintRecovery: { value: 300, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.47, arrow: "none" },
    magValue: { value: 50, arrow: "none" },
    hoveredTileName: "50RND BELT POUCH",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/RPK-74M/50_RPK-74M_Magazine_36Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "up" },
    magValue: { value: 36, arrow: "down" },
    hoveredTileName: "36RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/RPK-74M/51_RPK-74M_Magazine_50Rnd_Magazine.png": {
    adsTimeIn: { value: 300, arrow: "none" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.54, arrow: "none" },
    magValue: { value: 50, arrow: "up" },
    hoveredTileName: "50RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/RPKM/49_RPKM_Magazine_30Rnd_Magazine.png": {
    adsTimeIn: { value: 250, arrow: "down" },
    sprintRecovery: { value: 200, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "up" },
    magValue: { value: 30, arrow: "down" },
    hoveredTileName: "30RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/LMG/RPKM/50_RPKM_Magazine_30Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 250, arrow: "down" },
    sprintRecovery: { value: 233, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "up" },
    magValue: { value: 30, arrow: "down" },
    hoveredTileName: "30RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/CZ3A1/42_CZ3A1_Magazine_35Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 35, arrow: "up" },
    hoveredTileName: "35RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/CZ3A1/43_CZ3A1_Magazine_35Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 167, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 35, arrow: "up" },
    hoveredTileName: "35RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/KV9/41_KV9_Magazine_23Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 23, arrow: "up" },
    hoveredTileName: "23RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/KV9/42_KV9_Magazine_27Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 27, arrow: "up" },
    hoveredTileName: "27RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/PW7A2/39_PW7A2_Magazine_30Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 100, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "none" },
    magValue: { value: 30, arrow: "none" },
    hoveredTileName: "30RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/PW7A2/41_PW7A2_Magazine_30Rnd_Fast_Mag.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "none" },
    magValue: { value: 30, arrow: "none" },
    hoveredTileName: "30RND FAST MAG",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/SCW-10/41_SCW-10_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 20, arrow: "up" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/SCW-10/42_SCW-10_Magazine_25Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 25, arrow: "up" },
    hoveredTileName: "25RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/SGX/42_SGX_Magazine_36Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 36, arrow: "up" },
    hoveredTileName: "36RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/SGX/43_SGX_Magazine_41Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 41, arrow: "up" },
    hoveredTileName: "41RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/SMG/SL9/44_SL9_Magazine_60Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 167, arrow: "down" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "down" },
    magValue: { value: 60, arrow: "up" },
    hoveredTileName: "60RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Shotgun/M87A1/36_M87A1_Magazine_6_SHELL_TUBE.png": {
    adsTimeIn: { value: 250, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.67, arrow: "up" },
    magValue: { value: 7, arrow: "down" },
    hoveredTileName: "6 SHELL TUBE",
    readConfidence: "high",
    readNotes: "Stale-panel contradiction: the hovered title/tile says 6 SHELL TUBE, but the rendered MAG value is 7; the other rows appear to be the equipped baseline panel.",
    internalContradiction: true
  },
  "Weapon Attachments/Sidearm/ES 5.7/17_ES 5.7_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 133, arrow: "none" },
    sprintRecovery: { value: 67, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 20, arrow: "none" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/ES 5.7/18_ES 5.7_Magazine_30Rnd_Magazine.png": {
    adsTimeIn: { value: 133, arrow: "none" },
    sprintRecovery: { value: 100, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 30, arrow: "up" },
    hoveredTileName: "30RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/GGH-22/17_GGH-22_Magazine_15Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 83, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 15, arrow: "none" },
    hoveredTileName: "15RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/GGH-22/18_GGH-22_Magazine_20Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 20, arrow: "up" },
    hoveredTileName: "20RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/GGH-22/19_GGH-22_Magazine_22Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 22, arrow: "up" },
    hoveredTileName: "22RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/M357 Trait/10_M357 Trait_Magazine_8RND_SPEEDLOADER.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 83, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 8, arrow: "none" },
    hoveredTileName: "8RND SPEEDLOADER",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/M357 Trait/11_M357 Trait_Magazine_8RND_MOON_CLIP.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 100, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 8, arrow: "none" },
    hoveredTileName: "8RND MOON CLIP",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/M44/04_M44_Magazine_6RND_SPEEDLOADER.png": {
    adsTimeIn: { value: 200, arrow: "none" },
    sprintRecovery: { value: 100, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "none" },
    magValue: { value: 6, arrow: "none" },
    hoveredTileName: "6RND SPEEDLOADER",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/M45A1/17_M45A1_Magazine_7Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 83, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 7, arrow: "none" },
    hoveredTileName: "7RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/M45A1/18_M45A1_Magazine_11Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 11, arrow: "up" },
    hoveredTileName: "11RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/P18/17_P18_Magazine_17RND_MAGAZINE.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 83, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 17, arrow: "none" },
    hoveredTileName: "17RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/P18/18_P18_Magazine_21RND_MAGAZINE.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 133, arrow: "up" },
    adsMoveSpeedMultiplier: { value: 0.82, arrow: "none" },
    magValue: { value: 21, arrow: "up" },
    hoveredTileName: "21RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  },
  "Weapon Attachments/Sidearm/VZ. 61/20_VZ. 61_Magazine_10Rnd_Magazine.png": {
    adsTimeIn: { value: 167, arrow: "none" },
    sprintRecovery: { value: 100, arrow: "none" },
    adsMoveSpeedMultiplier: { value: 0.75, arrow: "none" },
    magValue: { value: 10, arrow: "none" },
    hoveredTileName: "10RND MAGAZINE",
    readConfidence: "high",
    readNotes: ""
  }
};

const FIELD_READ_KEY = {
  adsTimeMs: "adsTimeIn",
  sprintRecoveryMs: "sprintRecovery",
  adsMoveSpeedMultiplier: "adsMoveSpeedMultiplier"
};

const FIELD_LABEL = {
  adsTimeMs: "ADS TIME IN",
  sprintRecoveryMs: "SPRINT RECOVERY",
  adsMoveSpeedMultiplier: "ADS MOVE SPEED MULTIPLIER"
};

const worksheet = JSON.parse(fs.readFileSync(worksheetPath, "utf8"));
const records = worksheet.records;
const worksheetPaths = [...new Set(records.map((record) => record.screenshotPath))];
const readPaths = Object.keys(READS);

if (records.length !== 68) {
  throw new Error(`Expected 68 worksheet records, got ${records.length}`);
}
if (worksheetPaths.length !== 61) {
  throw new Error(`Expected 61 unique worksheet screenshots, got ${worksheetPaths.length}`);
}
if (readPaths.length !== worksheetPaths.length || readPaths.some((screenshotPath) => !READS[screenshotPath])) {
  throw new Error("Visual-read map does not cover exactly the worksheet screenshot paths");
}

const screenshotReads = worksheetPaths.map((screenshotPath) => ({
  screenshotPath,
  ...READS[screenshotPath]
}));

function makeRecordKey(record) {
  return `${record.weaponId}/${record.magazineId}/${record.field}`;
}

function valueEqual(left, right) {
  return left === right;
}

function makeVerdict(record) {
  const read = READS[record.screenshotPath];
  const readKey = FIELD_READ_KEY[record.field];
  const visible = read[readKey];
  const screenshotValue = visible.value;
  let verdict = "unresolved";
  let rationale;

  if (read.readConfidence !== "high") {
    rationale = `The ${FIELD_LABEL[record.field]} value is ${screenshotValue}, but the image confidence is ${read.readConfidence}.`;
  } else if (read.internalContradiction) {
    rationale = `The ${FIELD_LABEL[record.field]} value is ${screenshotValue}, but the screenshot has an internal stale-panel contradiction: ${read.readNotes}`;
  } else if (valueEqual(screenshotValue, record.corpusValue) && !valueEqual(screenshotValue, record.modelValue)) {
    verdict = "data-wrong";
    rationale = `The visible ${FIELD_LABEL[record.field]} value ${screenshotValue} matches the corpus value and differs from the model value.`;
  } else if (valueEqual(screenshotValue, record.modelValue) && !valueEqual(screenshotValue, record.corpusValue)) {
    verdict = "corpus-wrong";
    rationale = `The visible ${FIELD_LABEL[record.field]} value ${screenshotValue} matches the model value and differs from the corpus value.`;
  } else {
    rationale = `The visible ${FIELD_LABEL[record.field]} value ${screenshotValue} matches neither candidate (model ${record.modelValue}, corpus ${record.corpusValue}).`;
  }

  const result = {
    recordKey: makeRecordKey(record),
    weaponName: record.weaponName,
    weaponId: record.weaponId,
    weaponClass: record.weaponClass,
    magazineId: record.magazineId,
    magazineName: record.magazineName,
    field: record.field,
    screenshotPath: record.screenshotPath,
    screenshotValue,
    screenshotArrow: visible.arrow,
    modelValue: record.modelValue,
    corpusValue: record.corpusValue,
    readConfidence: read.readConfidence,
    rationale
  };

  if (read.readNotes) result.readNotes = read.readNotes;
  if (verdict === "data-wrong") {
    result.requiredShiftChange = {
      currentShift: record.currentShift,
      requiredShift: record.effectiveRequiredShift,
      delta: record.effectiveShiftDelta,
      effectiveShiftMath: {
        corpusTierIndex: record.corpusTierIndex,
        baseTier: record.baseTier,
        barrelTierMod: record.modelTierFormula?.barrelTierMod ?? 0,
        effectiveRequiredShift: record.effectiveRequiredShift,
        effectiveShiftDelta: record.effectiveShiftDelta
      }
    };
  } else if (verdict === "corpus-wrong") {
    result.correctedValue = screenshotValue;
  }
  result.verdict = verdict;
  return result;
}

const verdicts = records.map(makeVerdict);

function summarizeShiftChanges(rows) {
  const values = new Map();
  for (const row of rows) {
    const change = row.requiredShiftChange;
    const key = String(change.delta);
    if (!values.has(key)) {
      values.set(key, {
        delta: change.delta,
        currentShifts: [],
        requiredShifts: [],
        recordKeys: []
      });
    }
    const summary = values.get(key);
    if (!summary.currentShifts.includes(change.currentShift)) summary.currentShifts.push(change.currentShift);
    if (!summary.requiredShifts.includes(change.requiredShift)) summary.requiredShifts.push(change.requiredShift);
    summary.recordKeys.push(row.recordKey);
  }
  return [...values.values()];
}

function buildFieldConsistency(rows) {
  const dataRows = rows.filter((row) => row.verdict === "data-wrong");
  const changes = summarizeShiftChanges(dataRows);
  const verdictTypes = [...new Set(rows.map((row) => row.verdict))];
  const modalDelta = dataRows.length
    ? [...dataRows.reduce((counts, row) => {
        const delta = row.requiredShiftChange.delta;
        counts.set(delta, (counts.get(delta) ?? 0) + 1);
        return counts;
      }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
    : null;

  const breakers = [];
  for (const row of rows) {
    if (row.verdict === "data-wrong" && row.requiredShiftChange.delta !== modalDelta) {
      breakers.push({ recordKey: row.recordKey, reason: "different-required-shift-change", verdict: row.verdict });
    } else if (row.verdict !== "data-wrong" && dataRows.length) {
      breakers.push({ recordKey: row.recordKey, reason: `verdict-${row.verdict}`, verdict: row.verdict });
    }
  }

  return {
    rowCount: rows.length,
    verdictTypes,
    verdictCounts: Object.fromEntries(verdictTypes.map((type) => [type, rows.filter((row) => row.verdict === type).length])),
    requiredShiftChanges: changes,
    uniform: dataRows.length ? changes.length === 1 : null,
    modalRequiredShiftDelta: modalDelta,
    patternBreakers: breakers
  };
}

const weaponGroups = new Map();
for (const row of verdicts) {
  const key = `${row.weaponId}|${row.weaponName}`;
  if (!weaponGroups.has(key)) weaponGroups.set(key, []);
  weaponGroups.get(key).push(row);
}

const ladderConsistency = [...weaponGroups.values()].map((rows) => {
  const fields = {};
  for (const field of Object.keys(FIELD_READ_KEY)) {
    const fieldRows = rows.filter((row) => row.field === field);
    if (fieldRows.length) fields[field] = buildFieldConsistency(fieldRows);
  }

  const irregularities = [];
  for (const [field, consistency] of Object.entries(fields)) {
    if (consistency.patternBreakers.length) {
      irregularities.push({ field, patternBreakers: consistency.patternBreakers });
    }
  }

  return {
    weaponName: rows[0].weaponName,
    weaponId: rows[0].weaponId,
    weaponClass: rows[0].weaponClass,
    fields,
    irregularities
  };
});

const counts = {
  verdicts: Object.fromEntries(["data-wrong", "corpus-wrong", "unresolved"].map((verdict) => [
    verdict,
    verdicts.filter((row) => row.verdict === verdict).length
  ])),
  screenshots: screenshotReads.length,
  readConfidence: Object.fromEntries(["high", "low", "unreadable"].map((confidence) => [
    confidence,
    screenshotReads.filter((read) => read.readConfidence === confidence).length
  ]))
};

const output = {
  phase: 2,
  generatedAt: "2026-08-03",
  sourceWorksheet: "migration/1.3.3.0/attachment-audit/magazine-tier-adjudication-worksheet.json",
  readMethod: "Direct visual transcription from each PNG stat panel, completed before candidate comparison.",
  counts,
  screenshotReads,
  verdicts,
  ladderConsistency
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, counts, weapons: ladderConsistency.length }, null, 2));
