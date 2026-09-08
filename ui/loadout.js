import { ATTACHMENT_SLOT_KEYS } from '../sim/attachments.js';
import { availableAttachments, computeAttPts, getAttPts, attDisplayName, isAssumedAtt } from '../sim/loadout.js';

let selectSequence = 0;

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
  const labelEl = document.createElement('label');
  labelEl.className = 'att-lbl';
  labelEl.textContent = label;
  const sel = document.createElement('select');
  sel.className = 'att-sel';
  sel.id = `att-select-${++selectSequence}`;
  labelEl.htmlFor = sel.id;
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
    sel.onchange = () => {
      onChange(sel.value);
    };
  }
  row.appendChild(labelEl);
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

    const visible = availableAttachments(weapon, key, data);
    if (key === 'muzzle') {
      // Sort the menu without changing historical share-token indices.
      const compensatorIndex = visible.findIndex(a => a.id === 'compensator');
      const linearIndex = visible.findIndex(a => a.id === 'linear_comp');
      if (compensatorIndex > linearIndex && linearIndex >= 0) {
        visible.splice(linearIndex, 0, ...visible.splice(compensatorIndex, 1));
      }
    }

    if (visible.length <= (isBarrel ? 0 : 1)) {
      const single = visible[0];
      appendSelectRow(container, {
        label,
        value: single?.id ?? '',
        options: [{ id: single?.id ?? '', text: single ? attDisplayName(single) : noWeaponText, assumed: isAssumedAtt(single) }],
        onChange: () => {},
        disabled: true,
      });
      return;
    }

    appendSelectRow(container, {
      label,
      value: atts[key],
      options: visible.map(a => {
        const pts = (key === 'sight' ? wa?.sightPoints?.[a.id] : null) ?? getAttPts(a);
        const name = attDisplayName(a);
        return { id: a.id, text: pts > 0 ? `${name} [${pts}]` : name, noEffect: a.noEffect, assumed: isAssumedAtt(a) };
      }),
      onChange: value => handleChange(key, value),
    });
  });

  const wAmmo = weapon ? (data.WEAPON_AMMO[weapon.id] ?? null) : null;
  const ammoList = availableAttachments(weapon, 'ammo', data);
  if (ammoList.length > 1) {
    appendSelectRow(container, {
      label: 'Ammo',
      value: atts.ammo ?? wAmmo.def,
      options: ammoList.map(a => {
        const pts = wAmmo.ammo[a.id] ?? 0;
        const name = attDisplayName(a);
        return { id: a.id, text: pts > 0 ? `${name} [${pts}]` : name, noEffect: a.noEffect, assumed: isAssumedAtt(a) };
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
        text: m.pts > 0 ? `${attDisplayName(m)} [${m.pts}]` : attDisplayName(m),
        assumed: isAssumedAtt(m),
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

  const visibleErgos = availableAttachments(weapon, 'ergo', data);
  if (visibleErgos.length > 1 && weapon) {
    appendSelectRow(container, {
        label: 'Ergo',
        value: atts.ergo ?? 'none',
        options: visibleErgos.map(e => ({
        id: e.id,
        text: e.pts > 0 ? `${attDisplayName(e)} [${e.pts}]` : attDisplayName(e),
        noEffect: e.noEffect,
        assumed: isAssumedAtt(e),
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
  if (wa?.coverageNote) {
    const note = document.createElement('div');
    note.className = 'att-note';
    note.textContent = wa.coverageNote;
    container.appendChild(note);
  }
  const pendingPp19Coverage = weapon?.id === 'pp19'
    && ['muzzle', 'barrel', 'grip', 'laser', 'light'].every(key => Array.isArray(wa?.[key]) && wa[key].length === 0);
  if (pendingPp19Coverage) {
    container.insertAdjacentHTML('beforeend', '<div class="att-note pp19-coverage-note">PP-19 attachment availability and effects: needs measurement.</div>');
  }
}
