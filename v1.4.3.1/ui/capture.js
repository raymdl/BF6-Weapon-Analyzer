/**
 * ui/capture.js — Renders the current view to a PNG for "Copy Image".
 *
 * No library needed. All stylesheets and assets are same-origin or data URIs,
 * and nothing needed by the capture is loaded
 * cross-origin — so the DOM can be serialised into an SVG <foreignObject> and
 * drawn with the browser's own renderer. That keeps backdrop-filter, CSS masks
 * and grid exact, which a canvas reimplementation would approximate at best.
 *
 * Three details that are not obvious:
 *   - <canvas> content does not survive cloneNode, so each live canvas is
 *     swapped for an <img> of its toDataURL() before serialising.
 *   - The capture body receives the live body's computed typography.
 *   - Media queries use the browser viewport width. The output is cropped to
 *     the main column's width, excluding the sidebar and its scrollbar.
 */

// Attribution stamped into the top-right of every shared image, where the
// archive links sit on the live page.
//
// Hardcoded deliberately: it must stay correct in images shared from a local
// checkout or a preview server, which `location.host` would stamp as
// "localhost:5175". If this ever moves off GitHub Pages — a custom domain, a
// different host — update this constant. Nothing else reads it, and images
// already in the wild will keep pointing at the old address.
const SITE_URL = 'raymdl.github.io/BF6-Weapon-Analyzer';

/** Controls are meaningless in a static image. .loadout-btn is mobile-only. */
const CHROME_SELECTOR = '.share-wrap,.panel-toggle,.rc-popout-btn,.loadout-btn';

/**
 * Sizes a canvas bitmap to the box the capture layout gives it.
 *
 * A wrap with a definite height (.chart-wrap is a fixed 225px) pins both axes,
 * so the bitmap fills it and takes whatever horizontal stretch that implies —
 * the same thing the live page does on resize, except the chart cannot redraw.
 * A wrap with no height of its own (.rc-canvas-wrap derives it from the canvas)
 * gets the width and keeps the live aspect.
 */
function canvasBoxCss(slot, aspect) {
  if (!slot?.width) return `width:100%;height:auto;display:block;aspect-ratio:${aspect}`;
  const height = slot.height || slot.width / aspect;
  return `width:${slot.width}px;height:${height}px;display:block`;
}

/**
 * Replaces each canvas with a bitmap of itself, positioned so it contributes
 * no size of its own.
 *
 * The capture reflows to a layout the live page may never have rendered — a
 * phone widening to 1280, a 2560 desktop narrowing to it — so the live rects
 * cannot be scaled into place. The bitmaps are measured against the real
 * capture layout instead (see measureCapture), which needs them out of the way
 * first: absolute inside the already-relative wraps, so each wrap is sized by
 * its surroundings rather than by the image it contains.
 *
 * @returns {number[]} Live aspect ratio per canvas, in document order.
 */
function snapshotCanvases(source, clone) {
  const live = [...source.querySelectorAll('canvas')];
  const shots = live.map(c => {
    try { return c.toDataURL('image/png'); } catch { return null; }
  });
  const aspects = [];
  [...clone.querySelectorAll('canvas')].forEach((c, i) => {
    const rect = live[i].getBoundingClientRect();
    aspects.push(rect.height ? rect.width / rect.height : 1);
    const img = document.createElement('img');
    if (shots[i]) img.src = shots[i];
    img.setAttribute('data-cap-slot', String(i));
    img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
    c.replaceWith(img);
  });
  return aspects;
}

/**
 * Lays the capture out at its target width and reports the height plus the box
 * each canvas slot ends up with.
 *
 * An offscreen div would inherit the live viewport's media queries, so a phone
 * would measure the mobile layout even at 1238px wide. An iframe carries its
 * own viewport, which makes the wide rules apply and the height honest.
 *
 * Two reads, because the height depends on the canvas sizes and the canvas
 * sizes depend on the layout: measure the slots while the bitmaps are still
 * out of flow, size them, then read the height.
 *
 * @returns {{height:number, slots:{width:number,height:number}[]}}
 */
function measureCapture(markup, css, rootCss, width, viewportWidth, aspects) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;left:-99999px;top:0;width:${viewportWidth}px;height:100px;border:0`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<style>*{margin:0;padding:0;box-sizing:border-box}</style><style>${css}</style>`
      + `<body style="width:${width}px;${rootCss};height:auto;min-height:0;overflow:visible;display:block">${markup}</body>`);
    doc.close();
    // Reading a rect forces layout synchronously. The bitmaps are out of flow,
    // so every wrap is measured on the surrounding layout alone.
    const imgs = [...doc.querySelectorAll('img[data-cap-slot]')];
    const slots = imgs.map(img => {
      const rect = img.parentElement.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    // Put them back in flow at their measured size so the height accounts for
    // the ones whose wrap had no height of its own.
    imgs.forEach((img, i) => { img.style.cssText = canvasBoxCss(slots[i], aspects[i]); });
    // Sizes are all explicit now, so nothing waits on an image decode.
    return { height: Math.ceil(doc.body.scrollHeight), slots };
  } finally {
    frame.remove();
  }
}

/** Header clone carrying attribution in place of the archive links. */
function buildHeader() {
  const header = document.querySelector('header');
  if (!header) return null;
  const clone = header.cloneNode(true);
  const attrib = document.createElement('span');
  attrib.style.cssText = 'margin-left:auto;font-size:.68rem;letter-spacing:.03em;color:var(--accent);font-weight:600';
  attrib.textContent = SITE_URL;
  const archives = clone.querySelector('.archive-group');
  if (archives) archives.replaceWith(attrib);
  else clone.appendChild(attrib);
  // The narrow layout puts a Loadout button in the header; strip it like any
  // other control, after the attribution has taken the archive links' place.
  clone.querySelectorAll(CHROME_SELECTOR).forEach(n => n.remove());
  return clone;
}

/**
 * Renders header + main column at full scroll height.
 * @returns {Promise<Blob>} PNG blob.
 */
export async function captureView() {
  const main = document.getElementById('main');
  if (!main) throw new Error('nothing to capture');

  // The loadout identity lives in the overview header; a collapsed panel would
  // produce an anonymous image. Expand for the shot, then put it back.
  const overview = document.getElementById('overviewPanel');
  const wasCollapsed = !!overview?.classList.contains('is-collapsed');
  if (wasCollapsed) overview.classList.remove('is-collapsed');
  // Wait for the expanded panel to lay out — but rAF never fires in a tab the
  // browser is not compositing (backgrounded, or an inactive window), which
  // would hang the capture forever. Race it against a timer.
  await Promise.race([
    new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    new Promise(r => setTimeout(r, 150)),
  ]);

  // clientWidth includes the main padding, but excludes its scrollbar.
  const width = main.clientWidth;
  const viewportWidth = window.innerWidth;
  let svg;
  try {
    const mainClone = main.cloneNode(true);
    const aspects = snapshotCanvases(main, mainClone);
    mainClone.querySelectorAll(CHROME_SELECTOR).forEach(n => n.remove());
    // The page never scrolls as a document — .main scrolls internally — so the
    // clone has to be unclamped for anything below the fold to render.
    Object.assign(mainClone.style, { overflow: 'visible', height: 'auto', flex: 'none' });

    const shot = document.createElement('div');
    shot.style.cssText = `width:${width}px;background:var(--bg)`;
    const header = buildHeader();
    if (header) shot.appendChild(header);
    shot.appendChild(mainClone);

    const body = getComputedStyle(document.body);
    // Quotes in the computed font-family would terminate the style attribute.
    const rootCss = [
      `font-family:${body.fontFamily}`, `font-size:${body.fontSize}`,
      `color:${body.color}`, `background:${body.backgroundColor}`,
      `line-height:${body.lineHeight}`,
    ].join(';').replace(/"/g, "'");
    const css = [...document.styleSheets]
      .filter(sheet => !sheet.href || new URL(sheet.href).origin === location.origin)
      .flatMap(sheet => [...sheet.cssRules].map(rule => rule.cssText)).join('\n');
    // Measured with the bitmaps out of flow, then re-serialised with the boxes
    // that measurement produced. The SVG has to carry the sized form.
    const { height, slots } = measureCapture(
      new XMLSerializer().serializeToString(shot), css, rootCss, width, viewportWidth, aspects);
    shot.querySelectorAll('img[data-cap-slot]').forEach((img, i) => {
      img.style.cssText = canvasBoxCss(slots[i], aspects[i]);
    });
    const markup = new XMLSerializer().serializeToString(shot);

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewportWidth}" height="${height}">`
      + '<foreignObject width="100%" height="100%">'
      + `<body xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;${rootCss};height:auto;min-height:0;overflow:visible;display:block">`
      + `<style>${css}</style>${markup}</body></foreignObject></svg>`;

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('could not render the view'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('could not encode the image'))), 'image/png');
    });
  } finally {
    if (wasCollapsed) overview.classList.add('is-collapsed');
  }
}

/** Filename for the download fallback, derived from the weapons on screen. */
export function captureFilename(labels) {
  const slug = labels
    .filter(Boolean)
    .map(n => n.replace(/\s*\(.*$/, '').trim().replace(/[^\w-]+/g, '-'))
    .join('-vs-');
  return `bf6-${slug || 'loadout'}.png`;
}
