import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalAttachmentType,
  fallbackAttachmentSubtype,
  filenameAttachmentType,
  usesSharedLaserLightType,
} from './attachment-screenshot-taxonomy.mjs';

test('shared Laser/Light allowlist covers GRT-BC, SL9, and every Sidearm', () => {
  assert.equal(usesSharedLaserLightType({ weaponName: 'GRT-BC', sourcePath: 'C:/captures/Carbine/GRT-BC/a.png' }), true);
  assert.equal(usesSharedLaserLightType({ weaponName: 'SL9', sourcePath: 'C:/captures/SMG/SL9/a.png' }), true);
  assert.equal(usesSharedLaserLightType({ weaponName: 'M45A1', sourcePath: 'C:/repo/Weapon Attachments/Sidearm/M45A1/a.png' }), true);
  assert.equal(usesSharedLaserLightType({ weaponName: 'AK4D', sourcePath: 'C:/repo/Weapon Attachments/Assault Rifle/AK4D/a.png' }), false);
});

test('shared weapons collapse detected Laser and Light categories without storing a physical slot', () => {
  assert.equal(canonicalAttachmentType({ weaponName: 'GRT-BC', sourcePath: '', detectedType: 'Laser', attachmentName: '5 MW Red' }), 'Laser/Light');
  assert.equal(canonicalAttachmentType({ weaponName: 'GRT-BC', sourcePath: '', detectedType: 'Light', attachmentName: 'Flashlight' }), 'Laser/Light');
  assert.equal(canonicalAttachmentType({ weaponName: 'AK4D', sourcePath: '', detectedType: 'Light', attachmentName: 'Flashlight' }), 'Light');
  assert.equal(filenameAttachmentType('Laser/Light'), 'Laser-Light');
});

test('Mini Scout Range Finder remains its own type', () => {
  assert.equal(canonicalAttachmentType({ weaponName: 'Mini Scout', sourcePath: '', detectedType: 'Light', attachmentName: 'Range Finder' }), 'Range Finder');
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'Mini Scout', type: 'Range Finder', name: 'Range Finder' }), 'Range Finder');
});

test('new ammo and VSSM subtype fallbacks remain distinct', () => {
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'Any', type: 'Ammo', name: 'Unknown', fullText: 'SUBSONIC' }), 'Subsonic');
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'Any', type: 'Ammo', name: 'Unknown', fullText: 'SUB. HP' }), 'Sub HP');
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'PW7A2', type: 'Ammo', name: 'SUBSONIC TUNGSTEN', fullText: 'SUB. PEN.' }), 'Sub Pen');
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'VSSM', type: 'Ammo', name: 'Unknown', fullText: 'RANGE PEN.' }), 'Range Pen');
  assert.equal(fallbackAttachmentSubtype({ weaponName: 'VSSM', type: 'Barrel', name: 'Factory Suppressor' }), 'Suppressed');
});
