// Strict by default for scripts/tests. The UI reports errors and carries NaN
// internally so missing numeric data cannot be mistaken for zero.
let reporter = null;
let errorCount = 0;
export function setDataErrorReporter(callback) { reporter = callback; }
export function dataErrorCount() { return errorCount; }
export function invalidData(message) {
  errorCount++;
  const error = new Error(message);
  if (!reporter) throw error;
  reporter(error);
  return NaN;
}
export function requireNumber(value, label) {
  return Number.isFinite(value) ? value : invalidData(`Missing or invalid ${label}`);
}
export function requireFields(record, fields, label) {
  const values = { ...record };
  for (const field of fields) values[field] = requireNumber(record?.[field], `${label}.${field}`);
  return values;
}
