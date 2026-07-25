import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { RESERVED_NEW_SITE_IDS, SYM_WEAPON_MAP } from './sym-weapon-map.mjs';
import { EA_BALLISTIC_CHECKS, EA_PATCH_NOTES_URL } from './ea-1.3.3.0-checks.mjs';

export const RELEASE = '1.3.3.0';
export const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_DIR = join(DEFAULT_ROOT, 'generated-data', 'sym', RELEASE);
export const DEFAULT_BASELINE_SPEC = 'git:2df4811:data/weapons.json';

const SOURCE_MANIFEST_IDS = Object.freeze({
  source: 'sym-bf6-json',
  patch: 'sym-before-after-payload',
});

const CLASS_MAP = Object.freeze({
  assaultrifle: 'Assault Rifle',
  carbine: 'Carbine',
  smg: 'SMG',
  mg: 'LMG',
  dmr: 'DMR',
  boltaction: 'Sniper Rifle',
  shotgun: 'Shotgun',
  secondary: 'Sidearm',
});

const EXCLUDED_PATCH_FIELDS = new Set(['damage.dmgs', 'damage.dists']);

// The patch UI calls the site's DB-12 "DP-12". Keep this source quirk
// explicit instead of weakening the unknown/missing mapping checks.
const PATCH_WEAPON_NAME_ALIASES = Object.freeze({ 'DP-12': 'dp12' });

// The live site has scalar full-magazine reload fields. Sym exposes shell
// timings for these tube-fed shotguns, which cannot be represented faithfully
// by tacRld/emptyRld. Keep both live scalar fields null until Phase 4 has a
// measured aggregate policy. M44 and M357 Trait retain their numeric tactical
// reload and normalize unsupported empty reload values to null.
export const SPECIAL_RELOAD_POLICY = Object.freeze({
  shellByShell: Object.freeze(['590a1', 'm1014', '185ksk', 'dp12']),
  unsupportedValue: 'null',
  note: 'Shell-by-shell reloads are not representable by scalar site timing fields; unsupported N/A values remain null.',
});

const EXCLUDED_SOURCE_FIELDS = Object.freeze([
  {
    field: 'gravity',
    decision: 'normalized-only',
    note: 'Retained in the versioned Sym snapshot; Phase 6 owns live schema/UI and flight behavior.',
  },
  {
    field: 'drag',
    decision: 'normalized-only',
    note: 'Retained in the versioned Sym snapshot; do not expose or simulate bullet flight in this phase.',
  },
  {
    field: 'damage.dmgs',
    decision: 'owned-by-damage-refresh',
    note: 'Live damage comes from the 2026-07-25 Sym snapshot via scripts/apply-sym-damage.mjs; this importer must not write it.',
  },
  {
    field: 'damage.dists',
    decision: 'owned-by-damage-refresh',
    note: 'Live damage breakpoints come from the 2026-07-25 Sym snapshot via scripts/apply-sym-damage.mjs; this importer must not write it.',
  },
  {
    field: 'ammo',
    decision: 'normalized-only',
    note: 'Sym ammo codenames are retained for reconciliation; the site caliber label is a display value, not this raw identifier.',
  },
  {
    field: 'mags.NumMags',
    decision: 'normalized-only',
    note: 'The current site schema does not expose Sym reserve-mag count.',
  },
  {
    field: 'reload.ReloadSpeed',
    decision: 'normalized-only',
    note: 'The current site schema has no reload-speed multiplier field.',
  },
  {
    field: 'reload.ReloadThrs',
    decision: 'normalized-only',
    note: 'The current site schema does not expose the raw reload threshold.',
  },
  {
    field: 'deploy.UnDeployTime',
    decision: 'normalized-only',
    note: 'The current site schema stores deploy time but has no undeploy-time field.',
  },
  {
    field: 'spread.*Crouch* / spread.*Prone*',
    decision: 'normalized-only',
    note: 'Full stance fields are retained in the raw normalized source record; the current simulator only consumes stand/move bounds.',
  },
]);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function splitGitBaselineSpec(spec) {
  const value = spec.slice('git:'.length);
  const separator = value.lastIndexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`Git baseline must use git:REF:PATH, received ${spec}`);
  }
  return { ref: value.slice(0, separator), path: value.slice(separator + 1) };
}

export function readBaselineWeapons(root, baselineSpec = DEFAULT_BASELINE_SPEC) {
  if (baselineSpec.startsWith('git:')) {
    const { ref, path } = splitGitBaselineSpec(baselineSpec);
    const commit = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const gitPath = `${commit}:${path}`;
    const weapons = JSON.parse(execFileSync('git', ['show', gitPath], { cwd: root, encoding: 'utf8' }));
    return {
      weapons,
      provenance: {
        type: 'git',
        requested: baselineSpec,
        commit,
        path,
      },
    };
  }
  const path = resolve(root, baselineSpec);
  const content = readFileSync(path);
  return {
    weapons: JSON.parse(content.toString('utf8')),
    provenance: {
      type: 'file',
      path: relative(root, path),
      bytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex').toUpperCase(),
    },
  };
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = clone(value);
}

function getPath(target, path) {
  return path.split('.').reduce((value, part) => value == null ? undefined : value[part], target);
}

function flattenObject(value, prefix = '', output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    output[prefix] = clone(value);
    return output;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenObject(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function numericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function valuesEqual(left, right) {
  const leftNumber = numericValue(left);
  const rightNumber = numericValue(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return Math.abs(leftNumber - rightNumber) <= 1e-9;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedPatchValue(value) {
  const number = numericValue(value);
  return Number.isFinite(number) ? number : value;
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex').toUpperCase();
}

function walkFiles(directory, fileName, matches = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(filePath, fileName, matches);
    else if (entry.name === fileName) matches.push(filePath);
  }
  return matches;
}

function resolvePinnedPath(root, manifestEntry, overridePath) {
  if (overridePath) {
    const candidate = resolve(root, overridePath);
    if (!statSync(candidate).isFile()) throw new Error(`Pinned input is not a file: ${candidate}`);
    return candidate;
  }
  const matches = walkFiles(join(root, 'outputs'), manifestEntry.downloadedFileName);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one local ${manifestEntry.downloadedFileName} under outputs; found ${matches.length}`);
  }
  return matches[0];
}

export function verifyPinnedFile(filePath, manifestEntry) {
  const bytes = statSync(filePath).size;
  const actualSha256 = sha256(filePath);
  const expectedSha256 = String(manifestEntry.sha256 ?? '').toUpperCase();
  const errors = [];
  if (manifestEntry.bytes != null && bytes !== manifestEntry.bytes) {
    errors.push(`${manifestEntry.id}: byte count ${bytes} != manifest ${manifestEntry.bytes}`);
  }
  if (actualSha256 !== expectedSha256) errors.push(`${manifestEntry.id}: SHA-256 ${actualSha256} != manifest ${expectedSha256}`);
  if (errors.length) throw new Error(`Pinned input verification failed:\n- ${errors.join('\n- ')}`);
  return { bytes, sha256: actualSha256 };
}

export function parsePatchDeltas(bundleText) {
  const arrayStartMarker = 'const P=';
  const arrayEndMarker = '],g=new Set';
  const start = bundleText.indexOf(arrayStartMarker);
  const end = start < 0 ? -1 : bundleText.indexOf(arrayEndMarker, start);
  if (start < 0 || end < 0) throw new Error('Could not locate the pinned Sym patch delta array');
  const source = bundleText.slice(start + arrayStartMarker.length, end + 1);
  const deltas = vm.runInNewContext(`(${source})`, Object.create(null));
  if (!Array.isArray(deltas)) throw new Error('Pinned Sym patch delta payload is not an array');
  return deltas;
}

export function loadPinnedInputs({ root = DEFAULT_ROOT, sourcePath, patchPath } = {}) {
  const manifestPath = join(root, 'data', 'provenance', `${RELEASE}.json`);
  const manifest = readJson(manifestPath);
  if (manifest.release !== RELEASE) throw new Error(`Provenance release ${manifest.release} does not match ${RELEASE}`);

  const sourceManifest = manifest.sources?.find(source => source.id === SOURCE_MANIFEST_IDS.source);
  const patchManifest = manifest.sources?.find(source => source.id === SOURCE_MANIFEST_IDS.patch);
  if (!sourceManifest || !patchManifest) throw new Error('Provenance manifest is missing one or more Sym source entries');

  const resolvedSourcePath = resolvePinnedPath(root, sourceManifest, sourcePath);
  const resolvedPatchPath = resolvePinnedPath(root, patchManifest, patchPath);
  const sourceIntegrity = verifyPinnedFile(resolvedSourcePath, sourceManifest);
  const patchIntegrity = verifyPinnedFile(resolvedPatchPath, patchManifest);
  const source = readJson(resolvedSourcePath);
  if (source.info?.version !== RELEASE) throw new Error(`Sym source declares ${source.info?.version}, expected ${RELEASE}`);
  if (source.info?.versionDate !== '30 JUN 2026') throw new Error(`Unexpected Sym source version date: ${source.info?.versionDate}`);
  const patchDeltas = parsePatchDeltas(readFileSync(resolvedPatchPath, 'utf8'));
  const patchRowCount = patchDeltas.reduce((count, entry) => count + (entry.changes?.length ?? 0), 0);
  if (Object.keys(source).filter(key => key !== 'info').length !== 59) throw new Error('Pinned Sym source must contain 59 weapon records');
  if (patchDeltas.length !== 58 || patchRowCount !== 1038) {
    throw new Error(`Pinned Sym patch coverage is ${patchDeltas.length} weapons/${patchRowCount} rows, expected 58/1038`);
  }
  return {
    manifest,
    source,
    patchDeltas,
    sourcePath: resolvedSourcePath,
    patchPath: resolvedPatchPath,
    sourceIntegrity,
    patchIntegrity,
  };
}

export function validateWeaponMap(source, currentWeapons = [], mapEntries = SYM_WEAPON_MAP) {
  const errors = [];
  const mapByCodename = new Map();
  const mapBySiteId = new Map();
  for (const entry of mapEntries) {
    if (!entry?.codename || !entry?.siteId) {
      errors.push(`mapping entry is missing codename or siteId: ${JSON.stringify(entry)}`);
      continue;
    }
    if (mapByCodename.has(entry.codename)) errors.push(`duplicate Sym codename mapping: ${entry.codename}`);
    if (mapBySiteId.has(entry.siteId)) errors.push(`duplicate site weapon ID mapping: ${entry.siteId}`);
    mapByCodename.set(entry.codename, entry);
    mapBySiteId.set(entry.siteId, entry);
  }

  const sourceEntries = Object.entries(source).filter(([key]) => key !== 'info');
  const sourceByCodename = new Map();
  for (const [sourceKey, row] of sourceEntries) {
    if (!row?.codename) errors.push(`source record ${sourceKey} is missing codename`);
    if (sourceByCodename.has(row.codename)) errors.push(`duplicate source codename: ${row.codename}`);
    sourceByCodename.set(row.codename, { sourceKey, row });
    const mapping = mapByCodename.get(row.codename);
    if (!mapping) {
      errors.push(`missing mapping for Sym codename ${row.codename}`);
      continue;
    }
    if (mapping.displayName && mapping.displayName !== row.displayname) {
      errors.push(`${row.codename}: mapped display name ${mapping.displayName} != source ${row.displayname}`);
    }
    if (!mapBySiteId.has(mapping.siteId)) errors.push(`${row.codename}: mapping did not register site ID ${mapping.siteId}`);
    if (!currentWeapons.some(weapon => weapon.id === mapping.siteId) && !RESERVED_NEW_SITE_IDS.has(mapping.siteId)) {
      errors.push(`${row.codename}: unknown site weapon ID ${mapping.siteId}`);
    }
  }
  for (const entry of mapEntries) {
    if (!sourceByCodename.has(entry.codename)) errors.push(`mapping has no source record for Sym codename ${entry.codename}`);
  }
  const mappedSiteIds = new Set([...mapByCodename.values()].map(entry => entry.siteId));
  for (const weapon of currentWeapons) {
    if (!mappedSiteIds.has(weapon.id)) errors.push(`missing Sym mapping for current site weapon ID ${weapon.id}`);
  }
  if (errors.length) throw new Error(`Sym weapon mapping validation failed:\n- ${errors.join('\n- ')}`);
  return { mapByCodename, mapBySiteId, sourceByCodename };
}

function sourceRecoilGroup(spread, prefix) {
  return {
    dir: spread[`${prefix}RecoilDirection`],
    amount: spread[`${prefix}RecoilAmount`],
    amountMult: spread[`${prefix}RecoilAmountMultiplier`],
    amountExp: spread[`${prefix}RecoilAmountMultiplierExponent`],
    dirVar: spread[`${prefix}RecoilDirectionVariation`],
    dirVarMult: spread[`${prefix}RecoilDirectionVariationMultiplier`],
    dirVarExp: spread[`${prefix}RecoilDirectionVariationMultiplierExponent`],
    decNorm: spread[`${prefix}RecoilDecreaseNorm`],
    decExp: spread[`${prefix}RecoilDecreaseExponent`],
    decTimeExp: spread[`${prefix}RecoilDecreaseTimeExponent`],
    decOffset: spread[`${prefix}RecoilDecreaseOffset`],
    duration: spread[`${prefix}RecoilDuration`],
    decFactor: spread[`${prefix}RecoilDecreaseFactor`],
    shootingDecScale: spread[`${prefix}ShootingRecoilDecreaseScale`],
  };
}

function sourceSpreadDynamics(spread, prefix) {
  const name = field => `${prefix}${field}`;
  return {
    inc: spread[name('BaseSpreadInc')],
    idleTime: spread[name('BaseSpreadIdleTime')],
    idleCoef: spread[name('BaseSpreadIdleDecCoef')],
    idleExp: spread[name('BaseSpreadIdleDecExp')],
    idleOffset: spread[name('BaseSpreadIdleDecOffset')],
    firingCoef: spread[name('BaseSpreadFiringDecCoef')],
    firingExp: spread[name('BaseSpreadFiringDecExp')],
    firingOffset: spread[name('BaseSpreadFiringDecOffset')],
    notFiringCoef: spread[name('BaseSpreadNotFiringDecCoef')],
    notFiringExp: spread[name('BaseSpreadNotFiringDecExp')],
    notFiringOffset: spread[name('BaseSpreadNotFiringDecOffset')],
    firstShotMul: spread[name(`BaseFirstShotMul`)],
    distExp: spread[name('BaseSpreadDistExp')],
  };
}

function numericOrNull(value) {
  const number = numericValue(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizedReloadFields(row) {
  if (SPECIAL_RELOAD_POLICY.shellByShell.includes(row.codename)) {
    return { tacRld: null, emptyRld: null, policy: 'shell-by-shell-null' };
  }
  return {
    tacRld: numericOrNull(row.reload?.ReloadLeft),
    emptyRld: numericOrNull(row.reload?.ReloadEmpty),
    policy: 'scalar-numeric-or-null',
  };
}

function sourceSiteFields(row) {
  const spread = row.spread ?? {};
  const adsRecoil = sourceRecoilGroup(spread, 'ADS');
  const hipRecoil = sourceRecoilGroup(spread, 'HIP');
  const adsDynamics = sourceSpreadDynamics(spread, 'ADS');
  const hipDynamics = sourceSpreadDynamics(spread, 'HIP');
  const reload = normalizedReloadFields(row);
  const fields = {
    rpm: row.rof?.RoF ?? null,
    mag: row.mags?.MagSize ?? null,
    tacRld: reload.tacRld,
    emptyRld: reload.emptyRld,
    deployT: row.deploy?.DeployTime ?? null,
    bulletVel: row.velocity ?? null,
    recoilV: adsRecoil.amount * (adsRecoil.amountMult ** adsRecoil.amountExp),
    recoilDir: adsRecoil.dir,
    recoilVar: adsRecoil.dirVar,
    recoilIncAds: adsDynamics.inc,
    spreadMax: spread.ADSStandBaseMax ?? null,
    recoil: { ads: adsRecoil, hip: hipRecoil },
    spread: {
      adsStand: [spread.ADSStandBaseMin, spread.ADSStandBaseMax],
      adsMove: [spread.ADSStandMoveMin, spread.ADSStandMoveMax],
      hipStand: [spread.HIPStandBaseMin, spread.HIPStandBaseMax],
      hipMove: [spread.HIPStandMoveMin, spread.HIPStandMoveMax],
    },
    spreadDyn: {
      ads: adsDynamics,
      hip: hipDynamics,
    },
  };
  if (row.pellets !== 1 && row.pellets != null) fields.pellets = row.pellets;
  return fields;
}

function sourceExcludedFields(row) {
  return {
    gravity: row.gravity,
    drag: row.drag,
    ammo: row.ammo,
    'mags.NumMags': row.mags?.NumMags,
    'reload.ReloadSpeed': row.reload?.ReloadSpeed,
    'reload.ReloadThrs': row.reload?.ReloadThrs,
    'deploy.UnDeployTime': row.deploy?.UnDeployTime,
    'damage.dmgs': clone(row.damage?.dmgs ?? null),
    'damage.dists': clone(row.damage?.dists ?? null),
  };
}

function mapSourceRecord(sourceKey, row, mapping, currentWeapons) {
  const siteClass = CLASS_MAP[row.class];
  if (!siteClass) throw new Error(`${row.codename}: unsupported Sym class ${row.class}`);
  const current = currentWeapons.find(weapon => weapon.id === mapping.siteId);
  return {
    siteId: mapping.siteId,
    codename: row.codename,
    sourceKey,
    displayName: row.displayname,
    sourceClass: row.class,
    siteClass,
    status: current ? 'existing' : 'new',
    reloadPolicy: normalizedReloadFields(row).policy,
    siteFields: sourceSiteFields(row),
    sourceExcluded: sourceExcludedFields(row),
    sourceRecord: clone(row),
  };
}

export function buildNormalizedSnapshot(source, currentWeapons = [], mapEntries = SYM_WEAPON_MAP, provenance = {}) {
  const maps = validateWeaponMap(source, currentWeapons, mapEntries);
  const records = Object.entries(source)
    .filter(([key]) => key !== 'info')
    .map(([sourceKey, row]) => mapSourceRecord(sourceKey, row, maps.mapByCodename.get(row.codename), currentWeapons))
    .sort((left, right) => left.siteId.localeCompare(right.siteId));
  return {
    schemaVersion: 1,
    release: RELEASE,
    sourceVersion: source.info?.version,
    sourceVersionDate: source.info?.versionDate,
    provenance: clone(provenance),
    weaponCount: records.length,
    weapons: records,
  };
}

function patchSourceValue(row, property) {
  if (property === 'velocity' || property === 'drag' || property === 'ammo') return row[property];
  if (property.startsWith('reload.')) return getPath(row.reload, property.slice('reload.'.length));
  if (property.startsWith('damage.')) return getPath(row.damage, property.slice('damage.'.length));
  return row.spread?.[property];
}

function patchSiteTarget(property) {
  if (property === 'velocity') return 'bulletVel';
  if (property === 'reload.ReloadEmpty') return 'emptyRld';
  if (property === 'ADSRecoilAmount') return 'recoil.ads.amount';
  if (property === 'ADSRecoilAmountMultiplierExponent') return 'recoil.ads.amountExp';
  if (property === 'ADSRecoilDirectionVariation') return 'recoil.ads.dirVar';
  if (property === 'ADSRecoilDirectionVariationMultiplier') return 'recoil.ads.dirVarMult';
  if (property === 'HIPRecoilAmount') return 'recoil.hip.amount';
  if (property === 'HIPRecoilAmountMultiplierExponent') return 'recoil.hip.amountExp';
  if (property === 'HIPRecoilDirectionVariation') return 'recoil.hip.dirVar';
  if (property === 'HIPRecoilDirectionVariationMultiplier') return 'recoil.hip.dirVarMult';
  const dynamics = property.startsWith('ADS') ? 'spreadDyn.ads' : property.startsWith('HIP') ? 'spreadDyn.hip' : null;
  if (!dynamics) return null;
  if (property.endsWith('SpreadInc')) return `${dynamics}.inc`;
  if (property.endsWith('SpreadFiringDecCoef')) return `${dynamics}.firingCoef`;
  if (property.endsWith('SpreadFiringDecOffset')) return `${dynamics}.firingOffset`;
  if (property.endsWith('SpreadDistExp')) return `${dynamics}.distExp`;
  return null;
}

function patchSourcePath(property) {
  if (property === 'velocity' || property === 'drag' || property === 'ammo') return property;
  if (property.startsWith('reload.') || property.startsWith('damage.')) return property;
  return `spread.${property}`;
}

function baselineStatus(currentValue, oldValue) {
  if (currentValue === undefined) return 'not-represented';
  if (valuesEqual(currentValue, normalizedPatchValue(oldValue))) return 'matched';
  if (Number.isFinite(numericValue(currentValue)) && Number.isFinite(numericValue(oldValue))) return 'different';
  return 'different';
}

export function reconcilePatchDeltas(source, currentWeapons, patchDeltas, mapEntries = SYM_WEAPON_MAP) {
  const maps = validateWeaponMap(source, currentWeapons, mapEntries);
  const sourceByDisplayName = new Map();
  const sourceByCodename = new Map();
  for (const row of Object.values(source).filter(value => value?.codename)) {
    sourceByDisplayName.set(row.displayname, row);
    sourceByCodename.set(row.codename, row);
  }
  const currentById = new Map(currentWeapons.map(weapon => [weapon.id, weapon]));
  const rows = [];
  for (const entry of patchDeltas) {
    const sourceRow = sourceByDisplayName.get(entry.weapon)
      ?? sourceByCodename.get(entry.weapon)
      ?? sourceByCodename.get(PATCH_WEAPON_NAME_ALIASES[entry.weapon]);
    const mapping = sourceRow ? maps.mapByCodename.get(sourceRow.codename) : null;
    if (!sourceRow || !mapping) {
      rows.push({ weapon: entry.weapon, status: 'mapping-failure', changes: clone(entry.changes ?? []) });
      continue;
    }
    const current = currentById.get(mapping.siteId);
    for (const change of entry.changes ?? []) {
      const excluded = EXCLUDED_PATCH_FIELDS.has(change.prop);
      const sourceValue = patchSourceValue(sourceRow, change.prop);
      const sourceExpected = normalizedPatchValue(change.new);
      const sourceMatch = excluded ? null : valuesEqual(sourceValue, sourceExpected);
      const target = patchSiteTarget(change.prop);
      const baselineValue = target && current ? getPath(current, target) : undefined;
      rows.push({
        weapon: entry.weapon,
        siteId: mapping.siteId,
        codename: sourceRow.codename,
        property: change.prop,
        sourcePath: patchSourcePath(change.prop),
        old: normalizedPatchValue(change.old),
        new: sourceExpected,
        sourceValue: clone(sourceValue),
        sourceStatus: excluded ? 'excluded' : sourceValue === undefined ? 'unmapped-source-field' : sourceMatch ? 'matched' : 'mismatch',
        siteTarget: target,
        baselineValue: clone(baselineValue),
        baselineStatus: excluded ? 'excluded' : baselineStatus(baselineValue, change.old),
      });
    }
  }
  const summary = {
    patchWeaponCount: patchDeltas.length,
    patchRowCount: rows.length,
    sourceMatched: rows.filter(row => row.sourceStatus === 'matched').length,
    sourceMismatches: rows.filter(row => row.sourceStatus === 'mismatch').length,
    sourceUnmapped: rows.filter(row => row.sourceStatus === 'unmapped-source-field' || row.sourceStatus === 'mapping-failure').length,
    excludedRows: rows.filter(row => row.sourceStatus === 'excluded').length,
    baselineMatched: rows.filter(row => row.baselineStatus === 'matched').length,
    baselineDifferent: rows.filter(row => row.baselineStatus === 'different').length,
    baselineNotRepresented: rows.filter(row => row.baselineStatus === 'not-represented').length,
  };
  return { schemaVersion: 1, release: RELEASE, summary, rows };
}

const EA_SOURCE_NAME_ALIASES = Object.freeze({
  'TR-7': 'TR7',
  M417A2: 'M417 A2',
});

function eaSourceRow(sourceByDisplayName, weaponName) {
  return sourceByDisplayName.get(EA_SOURCE_NAME_ALIASES[weaponName] ?? weaponName);
}

function eaPatchChange(patchDeltas, sourceRow, property) {
  const entry = patchDeltas.find(candidate => candidate.weapon === sourceRow.displayname);
  return entry?.changes?.find(change => change.prop === property);
}

export function buildEaReconciliation(source, currentWeapons, patchDeltas, mapEntries = SYM_WEAPON_MAP, provenance = {}) {
  const maps = validateWeaponMap(source, currentWeapons, mapEntries);
  const sourceByDisplayName = new Map(Object.values(source).filter(row => row?.displayname).map(row => [row.displayname, row]));
  const currentById = new Map(currentWeapons.map(weapon => [weapon.id, weapon]));
  const checks = [];
  const errors = [];

  for (const [category, entries] of Object.entries(EA_BALLISTIC_CHECKS)) {
    const property = category === 'muzzleVelocity' ? 'velocity' : 'ADSRecoilDirectionVariation';
    const sitePath = category === 'muzzleVelocity' ? 'bulletVel' : 'recoilVar';
    for (const expected of entries) {
      const sourceRow = eaSourceRow(sourceByDisplayName, expected.weapon);
      const mapping = sourceRow ? maps.mapByCodename.get(sourceRow.codename) : null;
      const patch = sourceRow ? eaPatchChange(patchDeltas, sourceRow, property) : null;
      const sourceValue = sourceRow
        ? property === 'velocity' ? sourceRow.velocity : sourceRow.spread?.ADSRecoilDirectionVariation
        : undefined;
      const current = mapping ? currentById.get(mapping.siteId) : undefined;
      const baselineValue = current ? current[sitePath] : undefined;
      const deferred = mapping && RESERVED_NEW_SITE_IDS.has(mapping.siteId);
      const sourceStatus = sourceRow && mapping && valuesEqual(sourceValue, expected.new) ? 'matched' : 'mismatch';
      const patchStatus = deferred && !patch
        ? 'deferred-no-patch-row'
        : patch
        && valuesEqual(patch.old, expected.old)
        && valuesEqual(patch.new, expected.new)
        ? 'matched'
        : 'mismatch';
      const baselineStatus = current == null
        ? 'not-represented'
        : valuesEqual(baselineValue, expected.old) ? 'matched' : 'different';
      const patchAcceptable = patchStatus === 'matched' || patchStatus === 'deferred-no-patch-row';
      const status = sourceStatus === 'matched' && patchAcceptable && (deferred || current != null)
        ? deferred ? 'deferred-new-record' : 'matched-existing'
        : 'mismatch';
      if (status === 'mismatch') {
        errors.push(`${category}/${expected.weapon}: source=${sourceValue ?? 'missing'} patch=${patch ? `${patch.old}->${patch.new}` : 'missing'} baseline=${baselineValue ?? 'missing'} expected=${expected.old}->${expected.new}`);
      }
      checks.push({
        category,
        weapon: expected.weapon,
        sourceWeapon: sourceRow?.displayname ?? null,
        siteId: mapping?.siteId ?? null,
        codename: sourceRow?.codename ?? null,
        property,
        sitePath,
        expectedOld: expected.old,
        expectedNew: expected.new,
        sourceValue: sourceValue ?? null,
        sourceStatus,
      patchOld: patch ? normalizedPatchValue(patch.old) : null,
      patchNew: patch ? normalizedPatchValue(patch.new) : null,
        patchStatus,
        baselineValue: baselineValue ?? null,
        baselineStatus,
        status,
        phase: deferred ? 'Phase 3' : 'Phase 2',
      });
    }
  }

  if (errors.length) throw new Error(`EA 1.3.3.0 reconciliation failed:\n- ${errors.join('\n- ')}`);
  const summarize = category => {
    const rows = checks.filter(row => row.category === category);
    return {
      listed: rows.length,
      sourceMatched: rows.filter(row => row.sourceStatus === 'matched').length,
      patchMatched: rows.filter(row => row.patchStatus === 'matched').length,
      patchDeferred: rows.filter(row => row.patchStatus === 'deferred-no-patch-row').length,
      baselineMatched: rows.filter(row => row.baselineStatus === 'matched').length,
      existingSiteCount: rows.filter(row => row.status === 'matched-existing').length,
      deferredCount: rows.filter(row => row.status === 'deferred-new-record').length,
    };
  };
  return {
    schemaVersion: 1,
    release: RELEASE,
    source: EA_PATCH_NOTES_URL,
    provenance: clone(provenance),
    summary: {
      listed: checks.length,
      muzzleVelocity: summarize('muzzleVelocity'),
      recoilVariation: summarize('recoilVariation'),
      mismatchCount: checks.filter(row => row.status === 'mismatch').length,
    },
    checks,
  };
}

export function buildDiff(normalizedSnapshot, currentWeapons) {
  const currentById = new Map(currentWeapons.map(weapon => [weapon.id, weapon]));
  const weapons = normalizedSnapshot.weapons.map(record => {
    const current = currentById.get(record.siteId);
    const candidate = flattenObject(record.siteFields);
    const changes = [];
    for (const [path, sourceValue] of Object.entries(candidate)) {
      const currentValue = current ? getPath(current, path) : undefined;
      if (!current || !valuesEqual(currentValue, sourceValue)) {
        changes.push({
          path,
          current: clone(currentValue),
          source: clone(sourceValue),
          policy: path === 'recoilV' ? 'Sym import; derived from raw ADS recoil components' : 'Sym import',
        });
      }
    }
    return {
      siteId: record.siteId,
      codename: record.codename,
      displayName: record.displayName,
      status: record.status,
      changes,
    };
  });
  const existing = weapons.filter(weapon => weapon.status === 'existing');
  return {
    schemaVersion: 1,
    release: RELEASE,
    summary: {
      sourceWeaponCount: normalizedSnapshot.weaponCount,
      existingWeaponCount: existing.length,
      newWeaponCount: weapons.filter(weapon => weapon.status === 'new').length,
      changedWeaponCount: existing.filter(weapon => weapon.changes.length > 0).length,
      changedFieldCount: weapons.reduce((count, weapon) => count + weapon.changes.length, 0),
      liveDataWriteCount: existing.reduce((count, weapon) => count + weapon.changes.length, 0),
      damageCurveWrites: 0,
      gravityDragWrites: 0,
    },
    weapons,
  };
}

export function buildExcludedFieldReport(normalizedSnapshot, reconciliation) {
  const sourceCount = normalizedSnapshot.weapons.length;
  const patchRowsByProperty = new Map();
  for (const row of reconciliation.rows) {
    if (row.property) patchRowsByProperty.set(row.property, (patchRowsByProperty.get(row.property) ?? 0) + 1);
  }
  return {
    schemaVersion: 1,
    release: RELEASE,
    reloadPolicy: clone(SPECIAL_RELOAD_POLICY),
    noGo: [
      'Do not write damage.dmgs or damage.dists from this importer; scripts/apply-sym-damage.mjs owns the live damage curves.',
      'Do not add gravity/drag to the live schema or implement flight-time behavior.',
      'Do not add PP-19 to live data during Phase 2; it remains a normalized new-record candidate for Phase 3.',
    ],
    fields: EXCLUDED_SOURCE_FIELDS.map(entry => ({
      ...entry,
      sourceRecordCount: sourceCount,
      reconciledPatchRowCount: patchRowsByProperty.get(entry.field) ?? 0,
    })),
  };
}

export function buildImportResult({ source, patchDeltas, currentWeapons, mapEntries = SYM_WEAPON_MAP, provenance = {} }) {
  const normalized = buildNormalizedSnapshot(source, currentWeapons, mapEntries, provenance);
  const diff = buildDiff(normalized, currentWeapons);
  const reconciliation = reconcilePatchDeltas(source, currentWeapons, patchDeltas, mapEntries);
  const ea = buildEaReconciliation(source, currentWeapons, patchDeltas, mapEntries, provenance);
  const excluded = buildExcludedFieldReport(normalized, reconciliation);
  diff.provenance = clone(provenance);
  reconciliation.provenance = clone(provenance);
  excluded.provenance = clone(provenance);
  return {
    mapping: {
      schemaVersion: 1,
      release: RELEASE,
      provenance: clone(provenance),
      entries: mapEntries.map(entry => ({
        ...entry,
        status: currentWeapons.some(weapon => weapon.id === entry.siteId) ? 'existing' : 'new-reserved',
      })),
    },
    normalized,
    diff,
    reconciliation,
    ea,
    excluded,
  };
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function writeArtifacts(result, outputDir = OUTPUT_DIR) {
  mkdirSync(outputDir, { recursive: true });
  writeJson(join(outputDir, 'mapping.json'), result.mapping);
  writeJson(join(outputDir, 'normalized.json'), result.normalized);
  writeJson(join(outputDir, 'diff.json'), result.diff);
  writeJson(join(outputDir, 'reconciliation.json'), result.reconciliation);
  writeJson(join(outputDir, 'ea-reconciliation.json'), result.ea);
  writeJson(join(outputDir, 'excluded-fields.json'), result.excluded);
  return outputDir;
}

function applySiteFields(currentWeapon, siteFields) {
  const merged = clone(currentWeapon);
  for (const [path, value] of Object.entries(flattenObject(siteFields))) setPath(merged, path, value);
  return merged;
}

export function buildLiveData(currentWeapons, currentRecoilDecay, currentBalance, normalizedSnapshot) {
  const existing = normalizedSnapshot.weapons.filter(record => record.status === 'existing');
  const byId = new Map(existing.map(record => [record.siteId, record]));
  const weapons = currentWeapons.map(weapon => {
    const record = byId.get(weapon.id);
    return record ? applySiteFields(weapon, record.siteFields) : weapon;
  });

  const recoilDecay = clone(currentRecoilDecay);
  const balance = clone(currentBalance);
  for (const record of existing) {
    const ads = record.siteFields.recoil.ads;
    recoilDecay.RECOIL_DEC[record.siteId] = ads.decFactor;
    recoilDecay.RECOIL_DEC_TEXP[record.siteId] = ads.decTimeExp;
    if (ads.decExp === 1) delete recoilDecay.RECOIL_DEC_EXP[record.siteId];
    else recoilDecay.RECOIL_DEC_EXP[record.siteId] = ads.decExp;
    balance.RECOIL_MULT[record.siteId] = ads.amountMult;
  }
  return { weapons, recoilDecay, balance };
}

function parseArgs(argv) {
  const options = { writeData: false, sourcePath: undefined, patchPath: undefined, baselinePath: undefined };
  for (const arg of argv) {
    if (arg === '--write-data') options.writeData = true;
    else if (arg.startsWith('--source=')) options.sourcePath = arg.slice('--source='.length);
    else if (arg.startsWith('--patch=')) options.patchPath = arg.slice('--patch='.length);
    else if (arg.startsWith('--baseline=')) options.baselinePath = arg.slice('--baseline='.length);
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node scripts/sym-import.mjs [--write-data] [--source=PATH] [--patch=PATH] [--baseline=git:REF:PATH]');
    console.log('Default mode writes only review artifacts under generated-data/sym/1.3.3.0.');
    console.log(`Default baseline is ${DEFAULT_BASELINE_SPEC}; git baselines are resolved to a full commit SHA in every artifact.`);
    console.log('--baseline=PATH compares against an explicit JSON file; --baseline=git:REF:PATH reads a git baseline without writing it.');
    console.log('--write-data applies only the safe Phase 2 fields after artifacts are generated.');
    return;
  }
  const root = DEFAULT_ROOT;
  const inputs = loadPinnedInputs({ root, sourcePath: options.sourcePath, patchPath: options.patchPath });
  const liveWeapons = readJson(join(root, 'data', 'weapons.json'));
  const baseline = readBaselineWeapons(root, options.baselinePath ?? DEFAULT_BASELINE_SPEC);
  const currentWeapons = baseline.weapons;
  const result = buildImportResult({
    source: inputs.source,
    patchDeltas: inputs.patchDeltas,
    currentWeapons,
    provenance: {
      sourcePath: relative(root, inputs.sourcePath),
      sourceBytes: inputs.sourceIntegrity.bytes,
      sourceSha256: inputs.sourceIntegrity.sha256,
      patchPath: relative(root, inputs.patchPath),
      patchBytes: inputs.patchIntegrity.bytes,
      patchSha256: inputs.patchIntegrity.sha256,
      baseline: baseline.provenance,
    },
  });
  writeArtifacts(result, join(root, 'generated-data', 'sym', RELEASE));
  if (options.writeData) {
    const currentRecoilDecay = readJson(join(root, 'data', 'recoil_decay.json'));
    const currentBalance = readJson(join(root, 'data', 'balance_tables.json'));
    const liveData = buildLiveData(liveWeapons, currentRecoilDecay, currentBalance, result.normalized);
    writeJson(join(root, 'data', 'weapons.json'), liveData.weapons);
    writeJson(join(root, 'data', 'recoil_decay.json'), liveData.recoilDecay);
    writeJson(join(root, 'data', 'balance_tables.json'), liveData.balance);
  }
  console.log(JSON.stringify({
    release: RELEASE,
    sourcePath: inputs.sourcePath,
    patchPath: inputs.patchPath,
    sourceSha256: inputs.sourceIntegrity.sha256,
    patchSha256: inputs.patchIntegrity.sha256,
    diff: result.diff.summary,
    reconciliation: result.reconciliation.summary,
    ea: result.ea.summary,
    baseline: baseline.provenance,
    wroteData: options.writeData,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
