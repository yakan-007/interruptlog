export const clone = (value) => JSON.parse(JSON.stringify(value));
export const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
export const asArray = (value) => Array.isArray(value) ? value : [];
export const asNumber = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const cleanText = (value) => String(value ?? '').trim();

export function uniqueTexts(values) {
  return [...new Set(asArray(values).map(cleanText).filter(Boolean))];
}

export function startOfDay(ts) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function csvCell(value) {
  const text = protectCsvFormula(String(value ?? ''));
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function protectCsvFormula(text) {
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}
