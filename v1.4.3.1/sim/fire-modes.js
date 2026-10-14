/** Player modes are separate from the existing semi/bolt/pump mechanisms. */
export const selectorMode = mechanism => ['semi', 'bolt', 'pump'].includes(mechanism) ? 'single' : mechanism;

export function fireModeConfiguration(weapon, atts = {}) {
  return weapon?.fireModeAttachments?.[atts.ergo] ?? {
    modes: weapon?.availableFireModes ?? (weapon ? [selectorMode(weapon.fireMode)] : []),
    default: selectorMode(weapon?.fireMode),
  };
}

/** Missing selection means the legacy loadout default, including attachment changes. */
export function normalizeFireMode(atts, weapon) {
  const result = { ...atts };
  if (!fireModeConfiguration(weapon, atts).modes.includes(result.fireMode)) delete result.fireMode;
  return result;
}

export function selectedFireMode(weapon, atts = {}) {
  const config = fireModeConfiguration(weapon, atts);
  return config.modes.includes(atts.fireMode) ? atts.fireMode : config.default;
}

/** Apply source cadence only to an explicit, available selection. */
export function applySelectedFireMode(build, weapon, atts) {
  const config = fireModeConfiguration(weapon, atts);
  if (!config.modes.includes(atts.fireMode)) return build;
  const mode = weapon.fireModes?.[atts.fireMode];
  if (!mode) return build;
  // Source mode code 1 has rate slots, but bolt/pump timing uses separate cycle inputs.
  if (mode.mechanism === 'bolt' || mode.mechanism === 'pump') return build;
  const rpm = config.rpmOverrides?.[atts.fireMode] ?? mode.rpm;
  return {
    ...build,
    fireMode: mode.mechanism,
    rpm,
    burstRpm: atts.fireMode === 'burst' ? rpm : undefined,
    burstRounds: atts.fireMode === 'burst' ? mode.burstRounds : undefined,
    burstBurstsPerMinute: atts.fireMode === 'burst' ? mode.burstBurstsPerMinute : undefined,
    _manualSingleNoBloom: atts.fireMode === 'single' && mode.hipNoBloomOnSwitch === true,
  };
}
