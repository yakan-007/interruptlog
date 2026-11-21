export { startOfDay } from '../lib/day';
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
export const asArray = (value) => Array.isArray(value) ? value : [];
export const asNumber = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const asPositiveTimestamp = (value, fallback = null) => {
  const timestamp = asNumber(value, null);
  return timestamp != null && timestamp > 0 ? timestamp : fallback;
};
export const cleanText = (value) => String(value ?? '').trim();

export function uniqueTexts(values) {
  return [...new Set(asArray(values).map(cleanText).filter(Boolean))];
}


export function csvCell(value) {
  const text = protectCsvFormula(String(value ?? ''));
  // CR counts as a line break too; leaving it unquoted splits the row in some readers.
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function protectCsvFormula(text) {
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}
