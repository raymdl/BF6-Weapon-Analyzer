const attributes = [
  { key: 'hipfire', label: 'Hipfire', cards: ['Hipfire Spread'], text: 'Hipfire uses standing hipfire spread and the hipfire spread-per-shot modifier. For shotguns, it includes the pellet dispersion angle.' },
  { key: 'precision', label: 'Precision', cards: ['Recoil Amount', 'Recoil Variation', 'Fire Rate', 'Spread Inc/Shot'], text: 'Precision uses a lookup table keyed by recoil amount, recoil variation, fire rate, ADS spread added per shot, recoil duration, and recoil recovery.' },
  { key: 'control', label: 'Control', cards: ['Recoil Amount', 'Recoil Variation'], text: 'Control uses recoil amount and recoil variation. Higher scores indicate easier recoil control.' },
  { key: 'mobility', label: 'Mobility', cards: ['ADS Time', 'Strafe Speed', 'Deploy Speed', 'Sprint Recovery', 'ADS Spread'], text: 'Mobility uses draw, sprint recovery, ADS movement, moving ADS spread, and animation inputs. ADS Time is related context; the score uses a separate animation input.' },
];
let selected = null;
const style = document.createElement('style');
style.textContent = `
.weapon-attributes{margin-bottom:2px}
.wa-heading{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px;font-size:.65rem;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
.wa-heading span:last-child{font-size:.6rem;letter-spacing:0;text-transform:none}
.wa-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.wa-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:3px 6px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:5px 8px;text-align:left;font:inherit;cursor:pointer}
.wa-card:hover,.wa-card[aria-pressed=true]{border-color:var(--accent);background:rgba(201,162,39,.06)}
.wa-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wa-label{font-size:.68rem;color:var(--muted);letter-spacing:.6px;text-transform:uppercase}
.wa-score{grid-column:2;display:flex;justify-content:flex-end;gap:4px;align-items:baseline;font-size:1.05rem;font-weight:600;line-height:1.15}
.wa-score small{font-size:.6rem;font-weight:400;color:var(--muted)}
.wa-track{grid-column:1 / -1;height:3px;background:var(--border);border-radius:2px;overflow:hidden}
.wa-fill{height:100%;background:var(--accent)}
.wa-fill.second{background:var(--accent2)}
.scard.wa-related{outline:1px solid var(--accent);outline-offset:1px;background:rgba(201,162,39,.06)}
@media(max-width:560px){.wa-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.wa-heading{align-items:flex-start;flex-direction:column}}
`;
document.head.appendChild(style);

export function renderWeaponAttributes(grid, state, calculate) {
  const slots = state.comparing ? state.slots : state.slots.slice(0, 1);
  const scores = slots.map(slot => slot.weapon ? calculate(slot.weapon, slot.atts) : null);
  const section = document.createElement('section');
  section.className = 'weapon-attributes';
  section.setAttribute('aria-label', 'Weapon Attributes');
  const score = (value, index) => `<div class="wa-score c${index + 1}">${value ?? '—'}<small>${value == null ? 'Unavailable' : ' / 100'}</small></div><div class="wa-track"><div class="wa-fill ${index ? 'second' : ''}" style="width:${value ?? 0}%"></div></div>`;
  section.innerHTML = `<div class="wa-heading"><span>Weapon Attributes</span></div><div class="wa-strip">${attributes.map(a => `<button type="button" class="wa-card" data-attribute="${a.key}" aria-pressed="${selected === a.key}"><div class="wa-label">${a.label}</div>${scores.map((s, i) => score(s?.[a.key], i)).join('')}</button>`).join('')}</div>`;
  section.querySelectorAll('button').forEach(button => {
    const attribute = attributes.find(a => a.key === button.dataset.attribute);
    const tooltip = `${attribute.text} Select to highlight related stats.${scores.some(s => s?.[attribute.key] == null) ? ' No verified model result is available for this loadout.' : ''}`;
    button.title = tooltip;
    button.setAttribute('aria-description', tooltip);
  });
  grid.prepend(section);
  const update = () => {
    const active = attributes.find(a => a.key === selected);
    section.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.attribute === selected)));
    grid.querySelectorAll('.scard').forEach(card => card.classList.toggle('wa-related', active?.cards.includes(card.querySelector('.slbl')?.textContent) ?? false));

  };
  section.addEventListener('click', event => {
    const button = event.target.closest('button[data-attribute]');
    if (!button) return;
    selected = selected === button.dataset.attribute ? null : button.dataset.attribute;
    update();
  });
  update();
}
