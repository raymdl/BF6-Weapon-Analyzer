// First-party operator receipt for the PP-19 override-plus-Mag-Catch capture.
// This is composed-loadout evidence: the 53Rnd drum and Improved Mag Catch
// were selected together. It is not a single-attachment panel and does not
// modify the tracked screenshot corpus.

const capture = {
  kind: 'operator-in-game-composed-loadout-recapture',
  observedOn: '2026-08-01',
  weaponId: 'pp19',
  weaponName: 'PP-19',
  magazineId: '53_rnd',
  magazineName: '53Rnd drum',
  ergonomicId: 'mag_catch',
  ergonomicName: 'Improved Mag Catch',
  evidenceKind: 'composed-loadout',
  singleAttachmentPanel: false,
  observedReloadSeconds: 2.509,
  observedReloadMs: 2509,
  panel: {
    mag: 53,
    adsTimeMs: 167,
    sprintRecoveryMs: 133,
    adsMoveSpeedMultiplier: 0.67,
    muzzleVelocityMps: 444,
    damage: 26,
    rateOfFireRpm: 720,
    points: 70,
  },
  formula: '2.667 / 1.063 = 2.50894 s, displayed as 2.509 s',
  sourceNote: 'Operator captured the PP-19 stat panel with the 53Rnd drum and Improved Mag Catch equipped together; this is not a single-attachment panel.',
};

const expected = +(2.667 / 1.063).toFixed(3);
if (expected !== capture.observedReloadSeconds) {
  throw new Error(`PP-19 composed capture does not reproduce the registered value: ${expected}`);
}

console.log(JSON.stringify(capture, null, 2));
