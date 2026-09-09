export function formatMilliseconds(value) {
  return value == null ? '—' : Math.round(value);
}

export function formatMovementMultiplier(value) {
  // The captured panel rounds the source float32 value to two decimal places.
  return value == null ? '—' : Math.fround(value).toFixed(2);
}
