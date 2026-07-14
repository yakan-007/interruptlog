const DEFAULT_LOCALE = 'ja-JP';
const SUPPORTED_LOCALE_CODES = Object.freeze(['ja-JP', 'en-US']);

export function normalizeLocale(value) {
  return SUPPORTED_LOCALE_CODES.includes(value) ? value : DEFAULT_LOCALE;
}
