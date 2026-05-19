import { ATTACHMENT_SLOT_KEYS } from './attachments.js';

const lookupCache = new WeakMap();

function byId(items) {
  return Object.fromEntries((items ?? []).map(item => [item.id, item]));
}

function getLookups(data) {
  let lookups = lookupCache.get(data);
  if (!lookups) {
    lookups = {
      SIGHTS: byId(data.SIGHTS),
      MUZZLES: byId(data.MUZZLES),
      BARRELS: byId(data.BARRELS),
      GRIPS: byId(data.GRIPS),
      LASERS: byId(data.LASERS),
      LIGHTS: byId(data.LIGHTS),
      AMMO: byId(data.AMMO),
      ERGOS: byId(data.ERGOS),
    };
    lookupCache.set(data, lookups);
  }
  return lookups;
}

export function blankAtts() {
  return {
    sight: 'iron',
    muzzle: 'none',
    barrel: 'none',
    grip: 'none',
    laser: 'none',
    light: 'none',
    ammo: 'standard',
    mag: null,
    ergo: 'none',
  };
}

export function resetAttsForWeapon(atts, weapon, data) {
  atts.sight = 'iron';
  atts.muzzle = 'none';
  atts.grip = 'none';
  atts.laser = 'none';
  atts.light = 'none';
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  atts.barrel = wa?.barrelDef ?? 'basic';
  atts.ammo = data.WEAPON_AMMO[weapon?.id]?.def ?? 'standard';
  atts.mag = data.WEAPON_MAG[weapon?.id]?.def ?? null;
  atts.ergo = 'none';
}

export function getAttPts(a, weaponId) {
  if (!a) return 0;
  return (weaponId && a.weaponPts?.[weaponId]) ?? a.pts ?? 0;
}

export function computeAttPts(atts, weapon, data) {
  const wid = weapon?.id;
  if (!wid) return 0;
  const lookups = getLookups(data);
  const wm = data.WEAPON_MAG[wid] ?? null;
  const magPts = wm?.mags?.[atts.mag ?? wm?.def]?.pts ?? 0;
  const ergoPts = lookups.ERGOS[atts.ergo ?? 'none']?.pts ?? 0;
  // Combined slot: atts.laser may hold a grip or light ID
  const laserGrip  = lookups.GRIPS?.[atts.laser] ?? null;
  const laserLight = !laserGrip ? (lookups.LIGHTS?.[atts.laser] ?? null) : null;
  return getAttPts(lookups.SIGHTS[atts.sight ?? 'iron'], wid)
    + getAttPts(lookups.MUZZLES[atts.muzzle], wid)
    + getAttPts(lookups.BARRELS[atts.barrel], wid)
    + getAttPts(laserGrip ?? lookups.GRIPS[atts.grip], wid)
    + getAttPts(laserGrip ? null : lookups.LASERS[atts.laser], wid)
    + getAttPts(laserLight ?? lookups.LIGHTS[atts.light], wid)
    + (data.WEAPON_AMMO[wid]?.ammo?.[atts.ammo ?? 'standard'] ?? 0)
    + magPts
    + ergoPts;
}

export function attDisplayName(a) {
  return a?.assumed ? `${a.name}*` : a.name;
}

export function hasSelectedAssumedAtt(atts, data) {
  if (!atts) return false;
  const lookups = getLookups(data);
  const slotSources = [
    ['sight', lookups.SIGHTS, 'iron'],
    ['muzzle', lookups.MUZZLES],
    ['barrel', lookups.BARRELS],
    ['grip', lookups.GRIPS],
    ['laser', lookups.LASERS],
    ['light', lookups.LIGHTS],
    ['ammo', lookups.AMMO],
    ['ergo', lookups.ERGOS],
  ];
  return slotSources.some(([key, source, fallback]) => source[atts[key] ?? fallback]?.assumed);
}

export function updateAttTotal(containerId, atts, weapon, data) {
  const el = document.getElementById(`${containerId}_total`);
  if (!el) return;
  const pts = computeAttPts(atts, weapon, data);
  el.textContent = `Total: ${pts} pts`;
  el.classList.toggle('over', pts > 100);
}

function appendSelectRow(container, { label, value, options, onChange, disabled = false }) {
  if (!options.length) return;
  const row = document.createElement('div');
  row.className = 'att-row';
  const span = document.createElement('span');
  span.className = 'att-lbl';
  span.textContent = label;
  const sel = document.createElement('select');
  sel.className = 'att-sel';
  options.forEach(optData => {
    const opt = document.createElement('option');
    opt.value = optData.id;
    opt.textContent = optData.text;
    if (optData.noEffect) opt.style.color = '#666';
    if (optData.id === value) opt.selected = true;
    sel.appendChild(opt);
  });
  if (disabled) {
    sel.disabled = true;
  } else {
    sel.onchange = () => onChange(sel.value);
  }
  row.appendChild(span);
  row.appendChild(sel);
  container.appendChild(row);
}

export function renderAttachmentSection({
  containerId,
  container = document.getElementById(containerId),
  atts,
  weapon,
  data,
  onChange = () => {},
  showAssumedFootnote = true,
}) {
  if (!container) return;
  container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="sb-lbl" style="margin-bottom:0">Attachments</span><span class="att-total" id="${containerId}_total"></span></div>`;
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  const attDataSource = {
    SIGHTS: data.SIGHTS,
    MUZZLES: data.MUZZLES,
    BARRELS: data.BARRELS,
    GRIPS: data.GRIPS,
    LASERS: data.LASERS,
    LIGHTS: data.LIGHTS,
  };

  const handleChange = (key, value) => {
    atts[key] = value;
    updateAttTotal(containerId, atts, weapon, data);
    onChange({ key, value });
  };

  ATTACHMENT_SLOT_KEYS.forEach(({ key, label, dataKey, noWeaponText, isBarrel = false }) => {
    // Combined laser/light slot: light dropdown is disabled (options live in Laser)
    if (key === 'light' && wa?.laserLightCombined) {
      appendSelectRow(container, { label, value: 'none', options: [{ id: 'none', text: 'None' }], onChange: () => {}, disabled: true });
      return;
    }
    // Combined grip+laser+light slot: grip dropdown is disabled (options live in Laser)
    if (key === 'grip' && wa?.laserGripLightCombined) {
      appendSelectRow(container, { label, value: 'none', options: [{ id: 'none', text: 'None' }], onChange: () => {}, disabled: true });
      return;
    }

    const source = attDataSource[dataKey];
    if (!weapon || !source) {
      appendSelectRow(container, {
        label,
        value: '',
        options: [{ id: '', text: noWeaponText }],
        onChange: () => {},
        disabled: true,
      });
      return;
    }

    // Combined laser/light slot: merge light (and optionally grip) options into the laser dropdown
    let allowedIds = wa?.[key];
    let effectiveSource = source;
    if (key === 'laser' && wa?.laserLightCombined) {
      const lightIds = wa?.light ?? [];
      allowedIds = allowedIds != null ? [...allowedIds, ...lightIds] : lightIds.length ? lightIds : null;
      if (wa?.laserGripLightCombined) {
        // VZ.61-style: none first, then grips, then lasers (skip none), then lights
        effectiveSource = [
          source[0], // 'none' laser entry
          ...(attDataSource.GRIPS ?? []).filter(a => a.id !== 'none'),
          ...source.slice(1),
          ...(attDataSource.LIGHTS ?? []).filter(a => a.id !== 'none'),
        ];
      } else {
        effectiveSource = [...source, ...(attDataSource.LIGHTS ?? []).filter(a => a.id !== 'none')];
      }
    }

    const allowedSet = allowedIds != null ? new Set([...(isBarrel ? [] : ['none']), ...allowedIds]) : null;
    let visible = allowedSet ? effectiveSource.filter(a => allowedSet.has(a.id)) : effectiveSource;
    if (isBarrel) visible = visible.filter(a => a.id !== 'none');

    if (visible.length <= (isBarrel ? 0 : 1)) {
      const single = visible[0];
      appendSelectRow(container, {
        label,
        value: single?.id ?? '',
        options: [{ id: single?.id ?? '', text: single?.name ?? noWeaponText }],
        onChange: () => {},
        disabled: true,
      });
      return;
    }

    appendSelectRow(container, {
      label,
      value: atts[key],
      options: visible.map(a => {
        const pts = getAttPts(a, weapon.id);
        const name = attDisplayName(a);
        return { id: a.id, text: pts > 0 ? `${name} [${pts}]` : name, noEffect: a.noEffect };
      }),
      onChange: value => handleChange(key, value),
    });
  });

  const wAmmo = weapon ? (data.WEAPON_AMMO[weapon.id] ?? null) : null;
  const ammoList = wAmmo ? data.AMMO.filter(a => a.id in wAmmo.ammo) : [];
  if (ammoList.length > 1) {
    appendSelectRow(container, {
      label: 'Ammo',
      value: atts.ammo ?? wAmmo.def,
      options: ammoList.map(a => {
        const pts = wAmmo.ammo[a.id] ?? 0;
        return { id: a.id, text: pts > 0 ? `${a.name} [${pts}]` : a.name, noEffect: a.noEffect };
      }),
      onChange: value => handleChange('ammo', value),
    });
  } else {
    appendSelectRow(container, {
      label: 'Ammo',
      value: 'standard',
      options: [{ id: 'standard', text: 'Standard' }],
      onChange: () => {},
      disabled: true,
    });
  }

  const wm = weapon ? (data.WEAPON_MAG[weapon.id] ?? null) : null;
  if (wm && Object.keys(wm.mags).length > 0) {
    appendSelectRow(container, {
      label: 'Mag',
      value: atts.mag ?? wm.def,
      options: Object.entries(wm.mags).map(([id, m]) => ({
        id,
        text: m.pts > 0 ? `${m.name} [${m.pts}]` : m.name,
      })),
      onChange: value => handleChange('mag', value),
    });
  } else {
    appendSelectRow(container, {
      label: 'Mag',
      value: 'none',
      options: [{ id: 'none', text: 'None' }],
      onChange: () => {},
      disabled: true,
    });
  }

  const we = weapon ? (data.WEAPON_ERGO[weapon.id] ?? null) : null;
  const availSet = we ? new Set(we.avail) : null;
  const visibleErgos = data.ERGOS.filter(e => e.id === 'none' || (availSet && availSet.has(e.id)));
  if (visibleErgos.length > 1 && weapon) {
    appendSelectRow(container, {
        label: 'Ergo',
        value: atts.ergo ?? 'none',
        options: visibleErgos.map(e => ({
        id: e.id,
        text: e.pts > 0 ? `${e.name} [${e.pts}]` : e.name,
        noEffect: e.noEffect,
      })),
      onChange: value => handleChange('ergo', value),
    });
  } else {
    appendSelectRow(container, {
      label: 'Ergo',
      value: 'none',
      options: [{ id: 'none', text: 'None' }],
      onChange: () => {},
      disabled: true,
    });
  }

  updateAttTotal(containerId, atts, weapon, data);
  if (showAssumedFootnote && hasSelectedAssumedAtt(atts, data)) {
    container.insertAdjacentHTML('beforeend', '<div class="att-note assumed-note">* Assumed stats until datamined attachment values are available.</div>');
  }
}
