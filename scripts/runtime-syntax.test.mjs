/**
 * The shipped runtime modules must parse.
 *
 * ui/app.js and sim/*.js are loaded straight from the page as ES modules — no
 * bundler, no build step, so nothing else in the toolchain ever parses them.
 * A malformed edit gets caught only when a browser loads the page, and the
 * data-driven tests keep passing meanwhile because they import sim/ directly
 * and never touch the entrypoint.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');

// `node --check` picks its goal (script vs module) from the file extension, so
// copy each source to a .mjs name before checking it.
function assertParses(relativePath) {
  const scratch = mkdtempSync(join(tmpdir(), 'bf6-syntax-'));
  try {
    const target = join(scratch, `${basename(relativePath, '.js')}.mjs`);
    copyFileSync(join(root, relativePath), target);
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
  } catch (error) {
    assert.fail(`${relativePath} does not parse as an ES module:\n${error.stderr?.toString() ?? error.message}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

test('ui/app.js parses', () => {
  assertParses('ui/app.js');
});

test('every sim module parses', () => {
  const modules = readdirSync(join(root, 'sim')).filter(file => file.endsWith('.js'));
  assert.ok(modules.length > 0, 'expected sim modules to check');
  for (const file of modules) assertParses(join('sim', file));
});
