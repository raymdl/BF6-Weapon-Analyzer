import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAttachments, setAttachmentContext } from '../../../sim/applyAttachments.js';
import { DEFAULT_ROOT, loadPhase0Inputs, modalValue, rowsWithStats, sourceRelativePath } from '../../../scripts/audit-phase0-lib.mjs';
import { STATS } from '../../../scripts/audit-sweep.mjs';

export const OUTPUT_RELATIVE_PATH = 'migration/1.3.3.0/attachment-audit/field-slot-asymmetry-inventory-20260801.json';
export const GENERATED_BY = 'migration/1.3.3.0/attachment-audit/build-20260801-field-slot-asymmetry-inventory.mjs';

const RESOLVER_OUTPUTS = Object.freeze({
  damage: 'dmg',
  longRangeDamage: 'dmg',
  muzzleVelocityMps: 'bulletVel',
  headshotMultiplier: '_hsMult',
  collateralMultiplier: '_collateralMult',
  spotOnFire3dM: '_worldSpot',
  spotOnFire2dM: '_minimapSpot',
  recoilAmountDegrees: 'recoilV',
  recoilVariationDegrees: 'recoilVar',
  adsTimeMs: '_adsTimeMs',
  sprintRecoveryMs: '_sprintRecoveryMs',
  adsMoveSpeedMultiplier: '_adsMoveSpeedMult',
  reloadTimeSeconds: 'tacRld',
  rateOfFireRpm: 'rpm',
  magazineSize: 'mag',
});

const SLOT_ORDER = ['Sight', 'Muzzle', 'Barrel', 'Grip', 'Laser', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Ammo', 'Magazine', 'Ergonomics'];
const INVENTORY_CLASSIFICATIONS = new Set([
  'known-deferral',
  'confirmed-corpus-error',
  'likely-corpus-error',
  'unadjudicated',
  'out-of-scope',
  'possible-dead-code',
]);

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function unique(values) {
  return [...new Set(values.filter(value => value != null))];
}

function stableStringify(value) {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]]));
  });
}

function valuesEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function makeResolverContext(attachments, ammo, balance) {
  return {
    MUZZLES: attachments.MUZZLES,
    BARRELS: attachments.BARRELS,
    GRIPS: attachments.GRIPS,
    LASERS: attachments.LASERS,
    LIGHTS: attachments.LIGHTS,
    ERGOS: attachments.ERGOS,
    WEAPON_MAG: attachments.WEAPON_MAG,
    WEAPON_ERGO: attachments.WEAPON_ERGO,
    AMMO: ammo.AMMO,
    RECOIL_MULT: balance.RECOIL_MULT,
    HIP_SPREAD_TIERS: balance.HIP_SPREAD_TIERS,
    HIP_SPREAD_BASE_IDX: balance.HIP_SPREAD_BASE_IDX,
    HIP_CLS: balance.HIP_CLS,
    BASE_HS_MULT: balance.BASE_HS_MULT,
    HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
    LIMB_CLASS: balance.LIMB_CLASS,
    LIMB_CLASS_MULT: balance.LIMB_CLASS_MULT,
    AUTO_HS_MULT: balance.AUTO_HS_MULT,
    MOVING_ACC_TIERS: balance.MOVING_ACC_TIERS,
    DEFAULT_MOV_TIER: balance.DEFAULT_MOV_TIER,
    ADS_SPD_TIERS: balance.ADS_SPD_TIERS,
    SPRINT_REC_TIERS: balance.SPRINT_REC_TIERS,
    PRIMARY_SPRINT_REC_TIERS: balance.PRIMARY_SPRINT_REC_TIERS,
    SIDEARM_SPRINT_REC_TIERS: balance.SIDEARM_SPRINT_REC_TIERS,
    DEPLOY_TIME_TIERS: balance.DEPLOY_TIME_TIERS,
    ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
    DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
    RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
    VELOCITY_LADDER: balance.VELOCITY_LADDER,
  };
}

function weaponRows(audit) {
  const byWeapon = new Map();
  for (const row of rowsWithStats(audit)) {
    const rows = byWeapon.get(row.weaponName) ?? [];
    rows.push(row);
    byWeapon.set(row.weaponName, rows);
  }
  return byWeapon;
}

export function deriveCorpusInventory(audit) {
  const slotsByField = new Map(STATS.map(field => [field, new Map()]));
  const examplesByKey = new Map();
  const evidenceByKey = new Map();
  const rowsBySourcePath = new Map();

  for (const [weaponName, rows] of [...weaponRows(audit).entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const field of STATS) {
      const baseline = modalValue(rows, field);
      if (baseline == null || baseline === 0) continue;
      for (const row of rows) {
        const observed = row.stats?.[field];
        if (observed == null || observed === baseline) continue;
        const slot = row.attachmentType;
        const key = `${field}|${slot}`;
        slotsByField.get(field).set(slot, true);
        const evidence = evidenceByKey.get(key) ?? [];
        evidence.push({
          weapon: weaponName,
          slot,
          attachment: row.attachmentName,
          observed,
          modalBaseline: baseline,
          sourcePath: sourceRelativePath(row.source.currentPath),
        });
        evidenceByKey.set(key, evidence);
        if (!examplesByKey.has(key)) {
          examplesByKey.set(key, evidence[0]);
        }
      }
    }
    for (const row of rows) {
      if (row.source?.currentPath) rowsBySourcePath.set(sourceRelativePath(row.source.currentPath), row);
    }
  }

  return { slotsByField, examplesByKey, evidenceByKey, rowsBySourcePath };
}

function catalogName(attachments, ammo, weaponMag, slot, id) {
  if (slot === 'Ammo') return ammo.AMMO.find(item => item.id === id)?.name ?? id;
  if (slot === 'Magazine') return weaponMag?.mags?.[id]?.name ?? id;
  const collection = slot === 'Muzzle' ? attachments.MUZZLES
    : slot === 'Barrel' ? attachments.BARRELS
      : slot === 'Grip' ? attachments.GRIPS
        : slot === 'Laser' ? attachments.LASERS
          : slot === 'Light' ? attachments.LIGHTS
            : slot === 'Ergonomics' ? attachments.ERGOS
              : [...attachments.GRIPS, ...attachments.LASERS, ...attachments.LIGHTS];
  return collection.find(item => item.id === id)?.name ?? id;
}

function resolverOptions(weapon, attachments, ammo) {
  const weaponAtts = attachments.WEAPON_ATTS[weapon.id] ?? {};
  const weaponMag = attachments.WEAPON_MAG[weapon.id] ?? {};
  const weaponAmmo = ammo.WEAPON_AMMO[weapon.id] ?? {};
  const weaponErgo = attachments.WEAPON_ERGO[weapon.id] ?? {};
  const combinedSlot = weaponAtts.laserGripLightCombined
    ? 'Grip/Laser/Light'
    : weaponAtts.laserLightCombined ? 'Laser/Light' : null;

  const entries = [];
  const add = (slot, ids) => entries.push({ slot, ids: unique(ids) });
  add('Sight', weaponAtts.sight ?? []);
  add('Muzzle', weaponAtts.muzzle ?? []);
  add('Barrel', weaponAtts.barrel ?? []);
  add('Grip', weaponAtts.grip ?? []);
  if (combinedSlot) add(combinedSlot, weaponAtts.laser ?? []);
  else {
    add('Laser', weaponAtts.laser ?? []);
    add('Light', weaponAtts.light ?? []);
  }
  add('Ammo', Object.keys(weaponAmmo.ammo ?? {}));
  add('Magazine', Object.keys(weaponMag.mags ?? {}));
  add('Ergonomics', weaponErgo.avail ?? []);
  return entries;
}

function resolverDefaults(weapon, attachments, ammo) {
  const weaponAtts = attachments.WEAPON_ATTS[weapon.id] ?? {};
  const weaponMag = attachments.WEAPON_MAG[weapon.id] ?? {};
  const weaponAmmo = ammo.WEAPON_AMMO[weapon.id] ?? {};
  const weaponErgo = attachments.WEAPON_ERGO[weapon.id] ?? {};
  const first = (values, fallback = 'none') => values?.[0] ?? fallback;
  const defaults = {
    sight: weaponAtts.sight?.includes('iron') ? 'iron' : first(weaponAtts.sight),
    muzzle: 'none',
    barrel: weaponAtts.barrelDef ?? first(weaponAtts.barrel, 'basic'),
    grip: 'none',
    laser: 'none',
    light: 'none',
    ammo: weaponAmmo.def ?? first(Object.keys(weaponAmmo.ammo ?? {}), 'standard'),
    mag: weaponMag.def ?? first(Object.keys(weaponMag.mags ?? {}), null),
    ergo: weaponErgo.avail?.includes('none') ? 'none' : first(weaponErgo.avail),
  };
  return defaults;
}

function resolverLabelForSelection(attachments, ammo, weaponMag, slot, id) {
  return catalogName(attachments, ammo, weaponMag, slot, id);
}

export function deriveResolverInventory(root) {
  const attachments = readJson(root, 'data/attachments.json');
  const ammo = readJson(root, 'data/ammo.json');
  const balance = readJson(root, 'data/balance_tables.json');
  const weapons = Object.values(readJson(root, 'data/weapons.json'));
  setAttachmentContext(makeResolverContext(attachments, ammo, balance));

  const slotsByField = new Map(STATS.map(field => [field, new Map()]));
  const examplesByKey = new Map();
  const outputKeys = new Set(Object.keys(RESOLVER_OUTPUTS));

  for (const weapon of weapons) {
    const weaponMag = attachments.WEAPON_MAG[weapon.id] ?? {};
    const options = resolverOptions(weapon, attachments, ammo);
    const defaults = resolverDefaults(weapon, attachments, ammo);
    const base = applyAttachments(weapon, defaults);

    for (const { slot, ids } of options) {
      for (const id of ids) {
        const output = applyAttachments(weapon, attsForSelection(defaults, slot, id));
        for (const field of outputKeys) {
          const outputKey = RESOLVER_OUTPUTS[field];
          if (valuesEqual(base[outputKey], output[outputKey])) continue;
          const fieldSlots = slotsByField.get(field);
          fieldSlots.set(slot, true);
          const key = `${field}|${slot}`;
          if (!examplesByKey.has(key)) {
            examplesByKey.set(key, {
              weapon: weapon.name,
              slot,
              attachment: resolverLabelForSelection(attachments, ammo, weaponMag, slot, id),
              selectedId: id,
              baseline: base[outputKey],
              resolved: output[outputKey],
              resolverOutput: outputKey,
            });
          }
        }
      }
    }
  }

  return { slotsByField, examplesByKey };
}

function attsForSelection(defaults, slot, id) {
  const selection = { ...defaults };
  const key = slot === 'Sight' ? 'sight'
    : slot === 'Muzzle' ? 'muzzle'
      : slot === 'Barrel' ? 'barrel'
        : slot === 'Grip' ? 'grip'
          : slot === 'Laser' || slot === 'Laser/Light' || slot === 'Grip/Laser/Light' ? 'laser'
            : slot === 'Light' ? 'light'
              : slot === 'Ammo' ? 'ammo'
                : slot === 'Magazine' ? 'mag'
                  : 'ergo';
  selection[key] = id;
  return selection;
}

function sortedSlots(slots) {
  return [...slots].sort((a, b) => (SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b)) || a.localeCompare(b));
}

function classificationFor(field, slot) {
  if (['hipfire', 'precision', 'control', 'mobility'].includes(field)) return 'out-of-scope';
  if ((field === 'muzzleVelocityMps' || field === 'spotOnFire2dM') && slot === 'Ammo') return 'known-deferral';
  if (field === 'sprintRecoveryMs' && slot === 'Barrel') return 'known-deferral';
  if ((field === 'collateralMultiplier' || field === 'sprintRecoveryMs') && slot === 'Laser/Light') return 'known-deferral';
  if (field === 'muzzleVelocityMps' && slot === 'Grip') return 'confirmed-corpus-error';
  if (field === 'recoilVariationDegrees' && slot === 'Ergonomics') return 'possible-dead-code';
  return 'unadjudicated';
}

function sourceFor(field, slot, classification) {
  if (classification === 'known-deferral') {
    if (field === 'sprintRecoveryMs' && slot === 'Barrel') return '../BARREL_VELOCITY_PHASE7_INVENTORY.md (§ Sprint-recovery anomalies (deferred))';
    if (field === 'collateralMultiplier' || field === 'sprintRecoveryMs') return 'migration/1.3.3.0/attachment-audit/sl9-detailed-recapture-20260731.json';
    return 'migration/1.3.3.0/attachment-audit/subsonic-velocity-treatments-20260731.json; data/ammo.json (no selectable subsonic ammo type)';
  }
  if (classification === 'out-of-scope') return 'ui/app.js (the site renders derived equivalents, not these raw corpus columns)';
  return null;
}

function noteFor(field, slot, classification) {
  if (field === 'damage' || field === 'longRangeDamage') {
    return 'The resolver exposes dmg, but no selectable ammo type changes that damage curve.';
  }
  if (classification === 'confirmed-corpus-error') {
    return 'One Grip velocity row is screenshot-confirmed as a locked, unequipped baseline transcription error; four matching Grip rows remain unverified.';
  }
  if (classification === 'possible-dead-code') {
    return 'The resolver changes this output for Ergonomics, but the corpus has no corresponding Ergonomics effect.';
  }
  if (classification === 'out-of-scope') {
    return 'The site does not render this raw corpus column as a selectable runtime stat; no live resolver field is expected.';
  }
  if (field === 'spotOnFire3dM') {
    return 'The corpus shows a non-muzzle difference while the resolver models spot-on-fire range from the muzzle only.';
  }
  return 'Corpus and resolver inventories differ; screenshot or operator adjudication is required before changing data or the model.';
}

function buildInventory(root = DEFAULT_ROOT) {
  const inputs = loadPhase0Inputs(root);
  const corpus = deriveCorpusInventory(inputs.audit);
  const resolver = deriveResolverInventory(root);
  const records = [];

  for (const field of STATS) {
    const corpusSlots = new Set(corpus.slotsByField.get(field).keys());
    const resolverSlots = new Set(resolver.slotsByField.get(field).keys());
    const asymmetricalSlots = sortedSlots(new Set([...corpusSlots, ...resolverSlots]
      .filter(slot => corpusSlots.has(slot) !== resolverSlots.has(slot))));
    for (const slot of asymmetricalSlots) {
      const classification = classificationFor(field, slot);
      assert.ok(INVENTORY_CLASSIFICATIONS.has(classification));
      const corpusExample = corpus.examplesByKey.get(`${field}|${slot}`) ?? null;
      const resolverExample = resolver.examplesByKey.get(`${field}|${slot}`) ?? null;
      const example = corpusExample ?? resolverExample;
      assert.ok(example, `missing example for ${field}/${slot}`);
      const evidenceCount = corpus.evidenceByKey.get(`${field}|${slot}`)?.length
        ?? (resolverExample ? 1 : 0);
      const corpusEvidence = corpus.evidenceByKey.get(`${field}|${slot}`) ?? [];
      const adjudicatedGripSourcePath = 'Weapon Attachments/Shotgun/18.5KS-K/23_18.5KS-K_Grip_Alloy_Vertical.png';
      const adjudicatedGripEvidence = classification === 'confirmed-corpus-error'
        ? corpusEvidence.find(item => item.sourcePath === adjudicatedGripSourcePath)
        : null;
      const correctedAdjudicatedGrip = classification === 'confirmed-corpus-error'
        ? corpus.rowsBySourcePath.get(adjudicatedGripSourcePath)
        : null;
      const adjudicatedGrip = adjudicatedGripEvidence ?? (correctedAdjudicatedGrip ? {
        sourcePath: adjudicatedGripSourcePath,
        observed: correctedAdjudicatedGrip.stats.muzzleVelocityMps,
      } : null);
      if (classification === 'confirmed-corpus-error') {
        assert.ok(adjudicatedGrip);
        assert.equal(correctedAdjudicatedGrip?.stats.muzzleVelocityMps, 400);
      }
      const adjudication = adjudicatedGrip ? {
        screenshotPath: adjudicatedGrip.sourcePath,
        panelValue: 400,
        recordedCorpusValue: adjudicatedGrip.observed,
        equipped: false,
        locked: true,
        note: 'Claude read the panel directly on 2026-08-01; the panel reads MUZZLE VELOCITY 400M/S and shows the grip locked at 18.5KS-K Mastery 2, so it is not equipped and the panel is the weapon baseline.',
      } : null;
      const unverifiedExamples = adjudication
        ? corpusEvidence.filter(item => item !== adjudicatedGrip).map(item => ({ ...item, status: 'unadjudicated' }))
        : [];
      records.push({
        field,
        slot,
        corpusObservedSlots: sortedSlots(corpusSlots),
        resolverModeledSlots: sortedSlots(resolverSlots),
        example,
        evidenceCount,
        resolverOutput: RESOLVER_OUTPUTS[field] ?? null,
        classification,
        source: sourceFor(field, slot, classification),
        note: noteFor(field, slot, classification),
        ...(adjudication ? { adjudication, unverifiedExamples } : {}),
      });
    }
  }

  const counts = Object.fromEntries([...INVENTORY_CLASSIFICATIONS].sort().map(classification => [
    classification,
    records.filter(record => record.classification === classification).length,
  ]));
  return {
    kind: 'field-slot-asymmetry-inventory',
    schemaVersion: 1,
    source: 'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json plus current resolver behavior',
    generatedBy: GENERATED_BY,
    policy: 'Corpus evidence is reported without rewriting data or screenshots; screenshots settle disagreements.',
    statColumns: [...STATS],
    counts: { total: records.length, byClassification: counts },
    records,
  };
}

export function fieldSlotAsymmetryKey(record) {
  if (!record || typeof record.field !== 'string' || typeof record.slot !== 'string') {
    throw new Error('Invalid field-slot asymmetry inventory record');
  }
  return `${record.field}|${record.slot}`;
}

export function loadFieldSlotAsymmetryInventory(root = DEFAULT_ROOT) {
  const file = path.join(root, OUTPUT_RELATIVE_PATH);
  const inventory = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(inventory.records)) throw new Error('Field-slot asymmetry inventory has no records array');
  const keys = inventory.records.map(fieldSlotAsymmetryKey);
  if (new Set(keys).size !== keys.length) throw new Error('Field-slot asymmetry inventory contains duplicate keys');
  return inventory;
}

export function fieldSlotAsymmetryDrift(root = DEFAULT_ROOT) {
  const expected = loadFieldSlotAsymmetryInventory(root);
  const actual = buildInventory(root);
  const expectedKeys = new Set(expected.records.map(fieldSlotAsymmetryKey));
  const actualKeys = actual.records.map(fieldSlotAsymmetryKey);
  const actualKeySet = new Set(actualKeys);
  return {
    unexpected: [...actualKeySet].filter(key => !expectedKeys.has(key)).sort(),
    missing: [...expectedKeys].filter(key => !actualKeySet.has(key)).sort(),
    duplicates: actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index).sort(),
    changed: actual.records.filter(record => {
      const expectedRecord = expected.records.find(candidate => fieldSlotAsymmetryKey(candidate) === fieldSlotAsymmetryKey(record));
      return expectedRecord && stableStringify(record) !== stableStringify(expectedRecord);
    }).map(fieldSlotAsymmetryKey).sort(),
  };
}

export function deriveFieldSlotAsymmetryInventory(root = DEFAULT_ROOT) {
  return buildInventory(root);
}

function main() {
  const inventory = buildInventory(DEFAULT_ROOT);
  const outputPath = path.join(DEFAULT_ROOT, OUTPUT_RELATIVE_PATH);
  fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`wrote ${outputPath}`);
  console.log(`inventory counts: ${JSON.stringify(inventory.counts)}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) main();
