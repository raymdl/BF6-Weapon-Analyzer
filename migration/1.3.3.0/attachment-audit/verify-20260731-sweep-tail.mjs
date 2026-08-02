import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const sweep = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'sweep-findings.json'), 'utf8'));
const fail = message => { throw new Error('sweep-tail verification: ' + message); };
const expectedCounts = { 'subsonic-treatment': 27, 'reviewed-exception': 6, 'fire-mode-ergo': 1 };
if (Object.keys(sweep.counts).length !== Object.keys(expectedCounts).length
    || Object.entries(expectedCounts).some(([check, count]) => sweep.counts[check] !== count)) {
  fail('expected only the registered informational findings; got ' + JSON.stringify(sweep.counts));
}
if (sweep.findings.length !== 34) fail('expected 34 informational findings, found ' + sweep.findings.length);
if (sweep.findings.some(item => item.severity !== 'info')) fail('the sweep still contains an error or warning');
const subsonic = sweep.findings.filter(item => item.check === 'subsonic-treatment');
const exceptions = sweep.findings.filter(item => item.check === 'reviewed-exception');
if (subsonic.length !== 27 || exceptions.length !== 6) fail('registered subsonic or exception rows are incomplete');
if (sweep.findings.some(item => /stale|mismatch|unregistered/.test(item.check))) fail('the sweep reported a stale, mismatched, or unregistered contract');
console.log('Sweep-tail verification passed (0 errors, 0 warnings, 27 subsonic treatments, 6 reviewed exceptions, 1 fire-mode exception).');
