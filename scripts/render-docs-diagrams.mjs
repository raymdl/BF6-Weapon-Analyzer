// Render the mermaid sources embedded in docs/DATA_FLOW.md to committed SVGs.
//
// The diagrams are committed as images rather than left as live ```mermaid fences because
// GitHub's mermaid renderer lays subgraphs out differently from current mermaid: the same
// source that stacks into a readable vertical column on one produces a wide sprawl with
// overlapping cluster boxes on the other. Rendering once and committing the result means the
// diagram looks the same wherever it is read.
//
// Labels are rendered as SVG <text> (htmlLabels: false) because a <foreignObject> does not
// render when an SVG is loaded through an <img> tag, which is how GitHub embeds it. An opaque
// ground is painted behind each diagram so it stays legible in GitHub's dark theme.
//
// This is a docs tool, not part of the site: the repository has no package.json and the site
// has no build step. Install the two dependencies ad hoc before running:
//
//   npm install mermaid playwright
//   node scripts/render-docs-diagrams.mjs [--check]
//
// --check re-renders and reports whether the committed SVGs are current, without writing.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(ROOT, 'docs', 'DATA_FLOW.md');
const OUT_DIR = join(ROOT, 'docs', 'img');
const CHECK_ONLY = process.argv.includes('--check');

// Diagram order in the document. Adding a fence means adding a name here.
const NAMES = ['data-flow-pipeline', 'data-flow-pipeline-detail', 'data-flow-value-class'];

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

function resolveDependency(specifier) {
  try {
    return import(specifier);
  } catch {
    throw new Error(`Missing dependency "${specifier}". Run: npm install mermaid playwright`);
  }
}

const mermaidPath = join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const localMermaid = existsSync(mermaidPath) ? mermaidPath : null;

const doc = readFileSync(DOC, 'utf8');
const sources = [...doc.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(match => match[1]);
if (sources.length !== NAMES.length) {
  throw new Error(`Found ${sources.length} mermaid fences but ${NAMES.length} names are configured`);
}

const { chromium } = await resolveDependency('playwright');
const executablePath = CHROMIUM_CANDIDATES.find(candidate => existsSync(candidate));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
await page.setContent('<!doctype html><html><body style="margin:0"><div id="c"></div></body></html>');

if (localMermaid) await page.addScriptTag({ content: readFileSync(localMermaid, 'utf8') });
else await page.addScriptTag({ content: readFileSync(join(ROOT, '..', 'mermaid.min.js'), 'utf8') });

let stale = 0;
for (const [index, code] of sources.entries()) {
  const name = NAMES[index];
  const svg = await page.evaluate(async ({ code, index }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      htmlLabels: false,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      themeVariables: { fontSize: '15px', lineColor: '#5B6672', primaryTextColor: '#171B21' },
      flowchart: { htmlLabels: false, curve: 'basis', nodeSpacing: 38, rankSpacing: 50, useMaxWidth: false },
    });
    const rendered = await mermaid.render(`r${index}`, code, document.getElementById('c'));
    return typeof rendered === 'string' ? rendered : rendered.svg;
  }, { code, index });

  if (svg.includes('<foreignObject')) {
    throw new Error(`${name}: rendered with a foreignObject, which will not display through an <img> tag`);
  }

  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(' ').map(Number);
  if (!viewBox || viewBox.length !== 4) throw new Error(`${name}: could not read a viewBox`);
  const [x, y, width, height] = viewBox;
  const ground = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#FFFFFF"/>`;
  const withGround = svg.replace(/(<svg[^>]*>)/, `$1${ground}`);

  // Mermaid does not emit byte-identical edge geometry between runs: the bezier control points
  // of a few paths drift in the last decimals while the layout is unchanged. Comparing bytes
  // would report every diagram stale on every run, so drift is judged on what a reader would
  // actually notice — the canvas size and the full label text, in document order.
  const signature = svgText => JSON.stringify({
    viewBox: (svgText.match(/viewBox="([^"]+)"/)?.[1] ?? '')
      .split(' ').map(value => Math.round(Number(value))),
    labels: [...svgText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map(match => match[1].replace(/<[^>]+>/g, '').trim()),
  });

  const target = join(OUT_DIR, `${name}.svg`);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  const changed = current === null || signature(current) !== signature(withGround);
  if (changed) stale += 1;

  if (CHECK_ONLY) {
    console.log(`${name}: ${Math.round(width)}x${Math.round(height)} ${changed ? 'STALE' : 'current'}`);
  } else if (changed) {
    writeFileSync(target, withGround, 'utf8');
    console.log(`${name}: ${Math.round(width)}x${Math.round(height)} written`);
  } else {
    // Rewriting an unchanged diagram would commit pure geometry noise as a diff.
    console.log(`${name}: ${Math.round(width)}x${Math.round(height)} unchanged`);
  }
}

await browser.close();

if (CHECK_ONLY && stale > 0) {
  console.error(`${stale} committed diagram(s) are out of date; rerun without --check`);
  process.exitCode = 1;
}
