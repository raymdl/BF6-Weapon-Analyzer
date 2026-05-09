/**
 * sim/attachments.js — Canonical ordered list of attachment slot definitions.
 *
 * Adding a new slot type (e.g. Underbarrel) means adding one entry here.
 * All pages import this and resolve `dataKey` against their own data source.
 *
 * Fields:
 *   key          — matches the property name in atts / selectedAtts objects
 *   label        — display label shown in the sidebar
 *   dataKey      — property name on the page's attachment data source
 *                  (e.g. 'SIGHTS' → dataSource.SIGHTS)
 *   noWeaponText — placeholder text shown when the slot is disabled
 *   isBarrel     — barrel slot is required (never includes a 'none' option)
 */
export const ATTACHMENT_SLOT_KEYS = [
  { key: 'sight',  label: 'Sight',  dataKey: 'SIGHTS',  noWeaponText: 'Iron Sights' },
  { key: 'muzzle', label: 'Muzzle', dataKey: 'MUZZLES', noWeaponText: 'None' },
  { key: 'barrel', label: 'Barrel', dataKey: 'BARRELS', noWeaponText: 'Basic Barrel', isBarrel: true },
  { key: 'grip',   label: 'Grip',   dataKey: 'GRIPS',   noWeaponText: 'None' },
  { key: 'laser',  label: 'Laser',  dataKey: 'LASERS',  noWeaponText: 'None' },
];
