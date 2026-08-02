import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'ship-surface.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const informational = [];
const fail = message => errors.push(message);

const slash = value => value.replaceAll('\\', '/');
const cleanRelative = value => slash(value).replace(/^\.\//, '').replace(/\/$/, '');
const relativePath = absolute => slash(relative(root, absolute));

function repoPath(value) {
  const absolute = resolve(root, value);
  const rel = relativePath(absolute);
  if (rel === '..' || rel.startsWith('../') || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) {
    return null;
  }
  return rel || '.';
}

function validatePathGroup(name, paths) {
  if (!Array.isArray(paths)) {
    fail(`Manifest field ${name} must be an array of paths`);
    return [];
  }

  const normalized = [];
  for (const value of paths) {
    if (typeof value !== 'string' || value.length === 0) {
      fail(`Manifest field ${name} contains a non-empty string path requirement: ${JSON.stringify(value)}`);
      continue;
    }
    const rel = repoPath(value);
    if (!rel) {
      fail(`Manifest path ${name}:${value} escapes the repository`);
      continue;
    }
    normalized.push(rel);
    if (!existsSync(resolve(root, rel))) {
      fail(`Manifest path does not exist (${name}): ${value}`);
    }
  }
  return normalized;
}

const runtimePaths = validatePathGroup('runtimePaths', manifest.runtimePaths);
const runtimeData = validatePathGroup('runtimeData', manifest.runtimeData);
const publishedArchives = validatePathGroup('publishedArchives', manifest.publishedArchives);
const developmentOnly = validatePathGroup('developmentOnly', manifest.developmentOnly);

function isInside(paths, target) {
  const candidate = cleanRelative(target);
  return paths.some(path => candidate === path || candidate.startsWith(`${path}/`));
}

function walkFiles(pathValue) {
  const absolute = resolve(root, pathValue);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [relativePath(absolute)];

  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = resolve(absolute, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(relativePath(child)));
    else if (entry.isFile()) files.push(relativePath(child));
  }
  return files;
}

const runtimeFiles = [...new Set(runtimePaths.flatMap(walkFiles))].sort();
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs']);
const textFiles = runtimeFiles.filter(file => textExtensions.has(extname(file).toLowerCase()));

function isExternalReference(value) {
  return value.startsWith('#')
    || value.startsWith('//')
    || /^[a-z][a-z\d+.-]*:/i.test(value);
}

function resolveReference(source, value, { rootRelative = false } = {}) {
  const reference = value.split(/[?#]/, 1)[0];
  if (!reference || isExternalReference(reference)) return null;

  const absolute = reference.startsWith('/') || rootRelative
    ? resolve(root, reference.replace(/^\/+/, ''))
    : resolve(root, dirname(source), reference);
  const target = repoPath(relativePath(absolute));
  return target ? cleanRelative(target) : null;
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

const runtimeReferences = [];
const addRuntimeReference = (source, raw, kind, index) => {
  runtimeReferences.push({ source, raw, kind, index });
};

function inspectHtml(file) {
  const source = readFileSync(resolve(root, file), 'utf8');
  const attributePattern = /\b(src|href)\s*=\s*(["'])(.*?)\2/gi;
  for (const match of source.matchAll(attributePattern)) {
    const [, attribute, , raw] = match;
    const index = match.index ?? 0;
    const target = resolveReference(file, raw);
    if (!target) continue;

    const targetAbsolute = resolve(root, target);
    const targetExists = existsSync(targetAbsolute);
    const isDirectoryNavigation = attribute.toLowerCase() === 'href'
      && targetExists
      && statSync(targetAbsolute).isDirectory();
    if (isDirectoryNavigation) {
      if (!isInside(runtimePaths, target)) {
        informational.push({ source: file, raw, index, reason: 'local navigation outside runtime surface' });
      }
      continue;
    }
    addRuntimeReference(file, raw, `HTML ${attribute.toLowerCase()}`, index);
  }
}

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function inspectJavaScript(file) {
  const source = readFileSync(resolve(root, file), 'utf8');
  const code = withoutComments(source);
  const patterns = [
    { regex: /\bfrom\s*(["'])(.*?)\1/g, kind: 'module import' },
    { regex: /\bimport\s*(["'])(.*?)\1/g, kind: 'module import' },
    { regex: /\bimport\s*\(\s*(["'])(.*?)\1\s*\)/g, kind: 'dynamic import' },
    { regex: /\bnew\s+URL\s*\(\s*(["'])(.*?)\1/g, kind: 'URL asset' },
  ];
  if (file === 'ui/app.js') {
    patterns.push({ regex: /\b(?:fetch|fetchJson)\s*\(\s*(["'])(.*?)\1/g, kind: 'data fetch' });
  }

  for (const { regex, kind } of patterns) {
    for (const match of code.matchAll(regex)) {
      addRuntimeReference(file, match[2], kind, match.index ?? 0);
    }
  }
}

for (const file of runtimeFiles) {
  if (extname(file).toLowerCase() === '.html') inspectHtml(file);
}
for (const file of runtimeFiles) {
  if (file === 'ui/app.js' || file.startsWith('sim/')) {
    if (extname(file).toLowerCase() === '.js') inspectJavaScript(file);
  }
}

const checkedRuntimeReferences = new Set();
for (const reference of runtimeReferences) {
  const key = `${reference.source}|${reference.raw}|${reference.kind}`;
  if (checkedRuntimeReferences.has(key)) continue;
  checkedRuntimeReferences.add(key);

  const target = resolveReference(reference.source, reference.raw, {
    rootRelative: reference.kind === 'data fetch',
  });
  const label = `${reference.source}:${lineNumber(readFileSync(resolve(root, reference.source), 'utf8'), reference.index)} -> ${reference.raw}`;
  if (!target) {
    fail(`Runtime reference is not a local repository path: ${label}`);
    continue;
  }
  if (!existsSync(resolve(root, target))) {
    fail(`Runtime reference does not exist: ${label} (resolved ${target})`);
  } else if (!isInside(runtimePaths, target)) {
    fail(`Runtime reference leaves the runtime surface: ${label} (resolved ${target})`);
  }
}

const appDataReferences = runtimeReferences
  .filter(reference => reference.source === 'ui/app.js' && reference.kind === 'data fetch')
  .map(reference => resolveReference(reference.source, reference.raw, { rootRelative: true }))
  .filter(Boolean);
const expectedData = [...new Set(appDataReferences)].sort();
const declaredData = [...new Set(runtimeData)].sort();
if (JSON.stringify(expectedData) !== JSON.stringify(declaredData)) {
  fail(`runtimeData must exactly match ui/app.js fetches; declared ${declaredData.join(', ') || '(none)'}, fetched ${expectedData.join(', ') || '(none)'}`);
}
for (const dataPath of runtimeData) {
  if (!isInside(runtimePaths, dataPath)) {
    fail(`Manifest runtimeData path is outside runtimePaths: ${dataPath}`);
  }
}

const pathTokenPattern = /(["'])((?:\.\.?\/|[A-Za-z0-9_.-]+\/)[A-Za-z0-9_./-]+\.(?:css|html|js|json|mjs|png|svg|webp|woff2?))\1/g;
const runtimeReferenceKeys = new Set(runtimeReferences.map(reference => `${reference.source}|${reference.raw}`));
for (const file of textFiles) {
  const original = readFileSync(resolve(root, file), 'utf8');
  const source = extname(file).toLowerCase() === '.js' ? withoutComments(original) : original;
  for (const match of source.matchAll(pathTokenPattern)) {
    const raw = match[2];
    if (isExternalReference(raw) || runtimeReferenceKeys.has(`${file}|${raw}`)) continue;
    const target = resolveReference(file, raw, { rootRelative: !raw.startsWith('.') });
    if (target && !isInside(runtimePaths, target)) {
      informational.push({ source: file, raw, index: match.index ?? 0, reason: 'non-runtime path outside runtime surface' });
    }
  }
}

console.log('Ship-surface validation');
console.log(`- checked ${runtimePaths.length} runtime paths and ${runtimeData.length} declared runtime data files`);
console.log(`- checked ${publishedArchives.length} published archive paths and ${developmentOnly.length} development-only paths`);
console.log(`- checked ${checkedRuntimeReferences.size} runtime references from shipped HTML, ui/app.js, and sim/`);

if (informational.length) {
  console.log(`- informational: ${informational.length} non-runtime reference(s) outside the runtime surface:`);
  const seen = new Set();
  for (const finding of informational) {
    const key = `${finding.source}|${finding.raw}|${finding.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const source = readFileSync(resolve(root, finding.source), 'utf8');
    console.log(`  - ${finding.source}:${lineNumber(source, finding.index)} -> ${finding.raw} (${finding.reason})`);
  }
}

if (errors.length) {
  console.error(`Ship-surface validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Ship-surface validation passed.');
