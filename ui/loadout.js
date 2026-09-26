import { ATTACHMENT_SLOT_KEYS } from '../sim/attachments.js';
import { availableAttachments, attachmentSlots, normalizeAttachments, computeAttPts, getAttPts, attDisplayName, isAssumedAtt, gameBugsFor, GAME_BUG_MARK } from '../sim/loadout.js';

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
    const bugNotes = (optData.bugs ?? []).map(bug => `${GAME_BUG_MARK} ${bug.note}`);
    opt.textContent = bugNotes.length ? `${optData.text}${GAME_BUG_MARK}` : optData.text;
    const title = [optData.description, ...bugNotes].filter(Boolean).join('\n\n');
    if (title) opt.title = title;
    if (optData.noEffect) opt.style.color = '#666';
    if (optData.id === value) opt.selected = true;
    sel.appendChild(opt);
  });
  const updateTooltip = () => {
    const selected = options.find(option => option.id === sel.value);
    const tooltip = [selected?.description, ...(selected?.bugs ?? []).map(bug => `${GAME_BUG_MARK} ${bug.note}`)]
      .filter(Boolean).join('\n\n');
    row.title = tooltip;
    sel.title = tooltip;
    if (tooltip) sel.setAttribute('aria-description', tooltip);
    else sel.removeAttribute('aria-description');
  };
  updateTooltip();
  sel.addEventListener('input', updateTooltip);
  if (disabled) {
    sel.disabled = true;
  } else {
    sel.onchange = () => {
      updateTooltip();
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
  const normalizeSelection = () => {
    const normalized = normalizeAttachments(atts, weapon, data);
    for (const key of ['grip', 'laser', 'light', 'rail']) {
      if (!Object.hasOwn(normalized, key)) delete atts[key];
    }
    Object.assign(atts, normalized);
  };
  normalizeSelection();
  container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="sb-lbl" style="margin-bottom:0">Attachments</span><span class="att-total" id="${containerId}_total"></span></div>`;
  const wa = weapon ? (data.WEAPON_ATTS[weapon.id] ?? null) : null;
  const bugsFor = (slot, id) => (weapon ? gameBugsFor(data, weapon.id, slot, id) : []);
  const tooltipFor = (slot, id) => {
    const stringId = data.ATTACHMENT_TOOLTIPS?.byWeapon?.[weapon?.id]?.[slot]?.[id];
    return stringId ? data.ATTACHMENT_TOOLTIPS.descriptions[stringId] : undefined;
  };
  const attDataSource = {
    SIGHTS: data.SIGHTS,
    MUZZLES: data.MUZZLES,
    BARRELS: data.BARRELS,
    GRIPS: data.GRIPS,
    LASERS: data.LASERS,
    LIGHTS: data.LIGHTS,
  };

  const handleChange = (key, value) => {
    if (key === 'rail') {
      const [type, id] = value.split(':');
      atts.rail = value === 'none' ? null : { type, id };
    } else {
      atts[key] = value;
    }
    normalizeSelection();
    if (wa?.dependencies?.length) {
      renderAttachmentSection({ containerId, container, atts, weapon, data, onChange });
    } else {
      updateAttTotal(containerId, atts, weapon, data);
    }
    onChange({ key, value });
  };

  const mounts = attachmentSlots(weapon, data);
  const slots = ATTACHMENT_SLOT_KEYS.flatMap(slot => {
    if (!weapon || !['grip', 'laser', 'light'].includes(slot.key)) return [slot];
    if (slot.key === 'laser' && mounts.rail) return [{ ...slot, key: 'rail',
      label: mounts.rail.accepts.map(type => type[0].toUpperCase() + type.slice(1)).join(' / ') }];
    return mounts[slot.key] ? [slot] : [];
  });
  // The slot appears only on weapons with Optic Accessory choices. The sight
  // category decides which choices fit; the note names its optics that do not.
  const appendAccessoryRow = () => {
    const accessoryData = weapon ? data.WEAPON_ACCESSORY?.[weapon.id] : null;
    if (accessoryData) {
      const sight = atts.sight ?? 'iron';
      const options = availableAttachments(weapon, 'accessory', data, atts);
      const fitting = [...new Set((wa?.dependencies ?? []).filter(rule => rule.slot === 'accessory')
        .flatMap(rule => rule.requiresAny.map(required => required.attachment)))]
        .map(id => data.SIGHTS.find(s => s.id === id)?.name ?? id);
      appendSelectRow(container, {
        label: 'OPT ACC',
        value: atts.accessory ?? 'none',
        options: options.map(a => {
          const excluded = accessoryData.excludedSights?.[a.id]?.[sight];
          const hint = a.id === 'none' && options.length === 1 ? `Optic Accessories need one of: ${fitting.join(', ')}.` : null;
          return {
            id: a.id,
            text: a.pts > 0 ? `${attDisplayName(a, weapon.id)} [${a.pts}]` : attDisplayName(a, weapon.id),
            description: [a.description, excluded && `Not with: ${excluded.join(', ')}.`, hint].filter(Boolean).join('\n\n'),
          };
        }),
        onChange: value => handleChange('accessory', value),
      });
    }
  };

  const renderSlot = ({ key, label, dataKey, noWeaponText, isBarrel = false }) => {
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

    const visible = availableAttachments(weapon, key, data, atts);
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
      // A slot the weapon cannot use is left out rather than shown as a greyed "None".
      if (!single || single.id === 'none') return;
      appendSelectRow(container, {
        label,
        value: single?.id ?? '',
        options: [{ id: single?.id ?? '', text: single ? attDisplayName(single, weapon?.id) : noWeaponText,
          description: single && tooltipFor(key === 'rail' ? single.type : key, single.id), assumed: isAssumedAtt(single, weapon?.id),
          bugs: single ? bugsFor(key === 'rail' ? single.type : key, single.id) : [] }],
        onChange: () => {},
        disabled: true,
      });
      return;
    }

    appendSelectRow(container, {
      label,
      value: key === 'rail' ? (atts.rail ? `${atts.rail.type}:${atts.rail.id}` : 'none') : atts[key],
      options: visible.map(a => {
        const pts = (key === 'sight' ? wa?.sightPoints?.[a.id] : null) ?? getAttPts(a, weapon);
        const name = attDisplayName(a, weapon?.id);
        return { id: key === 'rail' && a.id !== 'none' ? `${a.type}:${a.id}` : a.id, text: pts > 0 ? `${name} [${pts}]` : name,
          description: tooltipFor(key === 'rail' ? a.type : key, a.id), noEffect: a.noEffect, assumed: isAssumedAtt(a, weapon?.id),
          bugs: bugsFor(key === 'rail' ? a.type : key, a.id) };
      }),
      onChange: value => handleChange(key, value),
    });
  };
  slots.forEach(slot => {
    renderSlot(slot);
    if (slot.key === 'sight') appendAccessoryRow();
  });

  const wAmmo = weapon ? (data.WEAPON_AMMO[weapon.id] ?? null) : null;
  const ammoList = availableAttachments(weapon, 'ammo', data, atts);
  if (ammoList.length > 1) {
    appendSelectRow(container, {
      label: 'Ammo',
      value: atts.ammo ?? wAmmo.def,
      options: ammoList.map(a => {
        const pts = wAmmo.ammo[a.id] ?? 0;
        const name = attDisplayName(a, weapon?.id);
        return { id: a.id, text: pts > 0 ? `${name} [${pts}]` : name,
          description: tooltipFor('ammo', a.id), noEffect: a.noEffect, assumed: isAssumedAtt(a, weapon?.id),
          bugs: bugsFor('ammo', a.id) };
      }),
      onChange: value => handleChange('ammo', value),
    });
  } else if (!weapon) {
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
      options: availableAttachments(weapon, 'mag', data, atts).map(m => ({
        id: m.id,
        text: m.pts > 0 ? `${attDisplayName(m, weapon?.id)} [${m.pts}]` : attDisplayName(m, weapon?.id),
        description: tooltipFor('mag', m.id),
        assumed: isAssumedAtt(m, weapon?.id),
        bugs: bugsFor('mag', m.id),
      })),
      onChange: value => handleChange('mag', value),
    });
  } else if (!weapon) {
    appendSelectRow(container, {
      label: 'Mag',
      value: 'none',
      options: [{ id: 'none', text: 'None' }],
      onChange: () => {},
      disabled: true,
    });
  }

  const visibleErgos = availableAttachments(weapon, 'ergo', data, atts);
  if (visibleErgos.length > 1 && weapon) {
    appendSelectRow(container, {
        label: 'Ergo',
        value: atts.ergo ?? 'none',
        options: visibleErgos.map(e => ({
        id: e.id,
        text: e.pts > 0 ? `${attDisplayName(e, weapon?.id)} [${e.pts}]` : attDisplayName(e, weapon?.id),
        description: tooltipFor('ergo', e.id),
        noEffect: e.noEffect,
        assumed: isAssumedAtt(e, weapon?.id),
        bugs: bugsFor('ergo', e.id),
      })),
      onChange: value => handleChange('ergo', value),
    });
  } else if (!weapon) {
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
