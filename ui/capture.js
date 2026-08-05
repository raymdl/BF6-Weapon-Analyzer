/**
 * ui/capture.js — Renders the current view to a PNG for "Copy Image".
 *
 * No library needed. Every style on this page lives in one inline <style>
 * block, every asset is same-origin or a data URI, and nothing is loaded
 * cross-origin — so the DOM can be serialised into an SVG <foreignObject> and
 * drawn with the browser's own renderer. That keeps backdrop-filter, CSS masks
 * and grid exact, which a canvas reimplementation would approximate at best.
 *
 * Three details that are not obvious:
 *   - <canvas> content does not survive cloneNode, so each live canvas is
 *     swapped for an <img> of its toDataURL() before serialising.
 *   - The capture root is a <div>, so `body { … }` rules never match it. The
 *     computed body typography is mirrored onto the root, otherwise the shot
 *     renders in the default serif with black text on a near-black panel.
 *   - Media queries inside a <foreignObject> resolve against the SVG's width,
 *     not the browser viewport. That is what lets a phone emit the desktop
 *     layout: build the SVG at CAPTURE_WIDTH and the wide rules simply apply.
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
 * Narrow viewports are widened to this before capture, so a phone shares the
 * same image a desktop would rather than a 12:1 ribbon of stacked panels.
 *
 * 1238 is what the main column measures on a 1440 desktop. The floor that
 * matters is 1078 — below it the overview stat cards wrap inside their groups
 * (nine 108px cards plus gaps in the first row). Anything from 1078 up is
 * safe; this leaves 160px of slack. Note that a stat field missing from
 * SEC_OF in ui/app.js falls through to Combat, which would raise that floor.
 */
const CAPTURE_WIDTH = 1280;

/**
 * Replaces each canvas with a bitmap of itself, sized for the target layout.
 *
 * Two cases, and they are not interchangeable:
 *   - The live page is already rendering the wide layout (a desktop). The
 *     capture is only marginally wider than the live column, so the measured
 *     rects hold their proportions; scale them and the layout is preserved.
 *   - The live page is narrow (a phone). The capture reflows to a layout the
 *     live page never rendered, so the rects mean nothing — the bitmap has to
 *     fill whatever slot the wide layout gives it, keeping its aspect ratio.
 *     It is upscaled from the small original, so charts go soft.
 *
 * Using the fluid form in the first case collapses the recoil plot, because
 * width:100% of a grid column bears no relation to the size it was drawn at.
 *
 * @param {number} ratio Target width ÷ live column width.
 * @param {boolean} wideLayout Whether the live page already renders wide.
 */
function snapshotCanvases(source, clone, ratio, wideLayout) {
  const live = [...source.querySelectorAll('canvas')];
  const shots = live.map(c => {
    try { return c.toDataURL('image/png'); } catch { return null; }
  });
  [...clone.querySelectorAll('canvas')].forEach((c, i) => {
    const rect = live[i].getBoundingClientRect();
    const img = document.createElement('img');
    if (shots[i]) img.src = shots[i];
    img.style.cssText = wideLayout
      ? `width:${rect.width * ratio}px;height:${rect.height * ratio}px;display:block`
      : `width:100%;height:auto;display:block;aspect-ratio:${rect.width}/${rect.height}`;
    c.replaceWith(img);
  });
}

/**
 * Measures the capture at its target width.
 *
 * An offscreen div would inherit the live viewport's media queries, so a phone
 * would measure the mobile layout even at 1238px wide. An iframe carries its
 * own viewport, which makes the wide rules apply and the height honest.
 */
function measureHeight(markup, css, rootCss, width) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:100px;border:0`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<style>*{margin:0;padding:0;box-sizing:border-box}</style><style>${css}</style>`
      + `<div style="width:${width}px;${rootCss}">${markup}</div>`);
    doc.close();
    // Reading scrollHeight forces layout synchronously. Sizes are all explicit
    // (px, or aspect-ratio), so nothing waits on an image decode.
    return Math.ceil(doc.body.scrollHeight);
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
 * @param {number} scale Device-pixel multiplier for the output bitmap.
 * @returns {Promise<Blob>} PNG blob.
 */
export async function captureView({ scale = 2 } = {}) {
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

  // Never narrow the layout: a wide desktop keeps its own width.
  const liveWidth = Math.round(main.clientWidth);
  const width = Math.max(liveWidth, CAPTURE_WIDTH);
  // Whether the live page is already rendering the layout the capture will.
  // Note this is the viewport, not the column: on a 1440 desktop the main
  // column is only 1238, yet the wide rules apply because media queries read
  // the viewport. The capture has no viewport but its own width, which is why
  // CAPTURE_WIDTH has to clear the 1279px breakpoint on its own.
  const wideLayout = window.matchMedia(`(min-width:${CAPTURE_WIDTH}px)`).matches;
  let svg;
  try {
    const mainClone = main.cloneNode(true);
    snapshotCanvases(main, mainClone, width / liveWidth, wideLayout);
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
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const markup = new XMLSerializer().serializeToString(shot);
    const height = measureHeight(markup, css, rootCss, width);

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
      + '<foreignObject width="100%" height="100%">'
      + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;${rootCss}">`
      + `<style>${css}</style>${markup}</div></foreignObject></svg>`;

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('could not render the view'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
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
