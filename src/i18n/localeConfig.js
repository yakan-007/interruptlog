import { LOCALES } from './locales/index.js';

export { LOCALES };
export const SUPPORTED_LOCALES = Object.values(LOCALES).map(({ code, label }) => ({ code, label }));
export function normalizeLocale(value) { return LOCALES[value] ? value : 'ja-JP'; }
export function getLocaleConfig(locale) { return LOCALES[normalizeLocale(locale)]; }
