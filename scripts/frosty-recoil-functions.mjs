import { pathToFileURL } from 'node:url';
import path from 'node:path';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const repo = path.resolve(process.argv[2]);
const { applyRecoilDecay, shotIntervalAfter } = await import(pathToFileURL(path.join(repo, 'sim', 'core.js')));
const cases = JSON.parse(input);
const out = cases.map(({ weapon, aim, amplitude, decFactor, decExp, timeExp, decOffset, sequenceShots }) => {
  const interval = shotIntervalAfter(weapon, 1);
  let state = 0;
  const repoSequence = [];
  for (let shot = 0; shot < sequenceShots; shot++) {
    state += amplitude;
    state = applyRecoilDecay(state, decFactor, decExp, timeExp, interval, decOffset, 0);
    repoSequence.push(state);
  }
  return { id: weapon.id, aim, shotIntervalSeconds: interval,
    repoResidual: applyRecoilDecay(amplitude, decFactor, decExp, timeExp, interval, decOffset, 0),
    repoSequence };
});
process.stdout.write(JSON.stringify(out));
