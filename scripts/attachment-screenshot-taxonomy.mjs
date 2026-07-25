import path from 'node:path';

const SHARED_LASER_LIGHT_WEAPONS = new Set(['GRT-BC', 'SL9']);

export const attachmentTypes = [
  'Overview', 'Muzzle', 'Barrel', 'Grip', 'Magazine', 'Ammo', 'Ergonomics',
  'Laser', 'Light', 'Laser/Light', 'Range Finder', 'Sight', 'Unknown',
];

export function weaponClassFromSourcePath(sourcePath) {
  const parts = path.resolve(String(sourcePath ?? '')).split(/[\\/]/);
  const rootIndex = parts.findIndex(part => part.toLowerCase() === 'weapon attachments');
  return rootIndex >= 0 ? parts[rootIndex + 1] ?? null : null;
}

export function usesSharedLaserLightType({ weaponName, sourcePath }) {
  return SHARED_LASER_LIGHT_WEAPONS.has(weaponName)
    || weaponClassFromSourcePath(sourcePath)?.toLowerCase() === 'sidearm';
}

export function canonicalAttachmentType({ weaponName, sourcePath, detectedType, attachmentName }) {
  if (/^range finder$/i.test(String(attachmentName ?? '').trim())) return 'Range Finder';
  if (usesSharedLaserLightType({ weaponName, sourcePath }) && ['Laser', 'Light', 'Accessory'].includes(detectedType)) return 'Laser/Light';
  if (detectedType === 'Accessory') return 'Unknown';
  return detectedType;
}

export function filenameAttachmentType(type) {
  return type === 'Laser/Light' ? 'Laser-Light' : type;
}

export function fallbackAttachmentSubtype({ weaponName, type, name, fullText = '' }) {
  const value = String(name ?? '').toUpperCase();
  const evidence = `${value} ${String(fullText ?? '').toUpperCase()}`;
  if (type === 'Ammo') {
    if (/\bSUB\.?\s*HP\b|\bSUBSONIC\s+HOLLOW\b/.test(evidence)) return 'Sub HP';
    if (/\bSUB\.?\s*PEN\.?\b|\bSUBSONIC\s+TUNGSTEN\b/.test(evidence)) return 'Sub Pen';
    if (/\bSUBSONIC\b/.test(evidence)) return 'Subsonic';
    if (/\bRANGE\s*PEN\.?\b/.test(evidence)) return 'Range Pen';
    if (/TUNGSTEN/.test(value)) return 'Penetration';
    if (/POLYMER|LIGHTWEIGHT/.test(value)) return 'Lightweight';
    if (/FRANGIBLE/.test(value)) return 'Frangible';
    if (/HOLLOW/.test(value)) return 'Hollow Point';
    if (/SYNTHETIC/.test(value)) return 'Synthetic';
    return 'Standard';
  }
  if (type === 'Barrel' && weaponName === 'VSSM') return 'Suppressed';
  if (type === 'Laser/Light') {
    if (/NONE/.test(value)) return 'None';
    if (/FLASHLIGHT|TACLIGHT|\bLIGHT\b/.test(value) && !/LASER/.test(value)) return 'Light';
    if (/VIOLET/.test(value)) return 'Violet Laser';
    if (/GREEN|COMBO G/.test(value)) return 'Green Laser';
    if (/BLUE/.test(value)) return 'Blue Laser';
    return 'Red Laser';
  }
  if (type === 'Range Finder') return 'Range Finder';
  return null;
}
