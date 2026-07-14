import { LOCALES } from './locales/index.js';
import { normalizeLocale } from '../domain/locale.js';

export { LOCALES };
export const SUPPORTED_LOCALES = Object.values(LOCALES).map(({ code, label }) => ({ code, label }));
export { normalizeLocale };
export function getLocaleConfig(locale) { return LOCALES[normalizeLocale(locale)]; }
