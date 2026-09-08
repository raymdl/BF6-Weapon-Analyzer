import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Explicit paths keep local release copies and frozen archives out of the suite.
const files = readdirSync(import.meta.dirname).filter(name => name.endsWith('.test.mjs'))
  .sort().map(name => join(import.meta.dirname, name));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
