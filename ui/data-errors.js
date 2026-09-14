/** Small, non-blocking notification; details are opened only on request. */
export function createDataErrorNotice(doc = document) {
  const errors = new Set();
  const notice = doc.createElement('aside');
  notice.className = 'data-error-notice';
  notice.hidden = true;
  notice.setAttribute('aria-live', 'polite');
  const label = doc.createElement('span');
  const view = doc.createElement('button'); view.textContent = 'View errors';
  const dismiss = doc.createElement('button'); dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss data error notification');
  notice.append(label, view, dismiss);
  const dialog = doc.createElement('dialog'); dialog.className = 'data-error-dialog';
  const title = doc.createElement('h2'); title.id = 'data-error-title'; title.textContent = 'Data errors';
  dialog.setAttribute('aria-labelledby', title.id);
  const explanation = doc.createElement('p');
  explanation.textContent = 'Affected values and calculations are unavailable. Other features remain usable.';
  const list = doc.createElement('ul');
  const close = doc.createElement('button'); close.textContent = 'Close';
  dialog.append(title, explanation, list, close);
  doc.body.append(notice, dialog);
  const main = doc.getElementById('main');
  const position = () => {
    const rect = main?.getBoundingClientRect();
    if (!rect) return;
    notice.style.top = Math.max(8, rect.top + 10) + 'px';
    notice.style.right = Math.max(10, doc.defaultView.innerWidth - rect.right + 10) + 'px';
  };
  position();
  if (main) new ResizeObserver(position).observe(main);
  doc.defaultView.addEventListener('resize', position);
  view.addEventListener('click', () => dialog.showModal());
  close.addEventListener('click', () => dialog.close());
  dismiss.addEventListener('click', () => { notice.hidden = true; });
  return error => {
    const message = error.message || String(error);
    if (errors.has(message)) return;
    errors.add(message);
    const row = doc.createElement('li'); row.textContent = message; list.append(row);
    label.textContent = errors.size + (errors.size === 1 ? ' data error' : ' data errors');
    notice.hidden = false;
  };
}
