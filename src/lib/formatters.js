import {
  formatDateHeader as formatLocalizedDateHeader,
  formatDuration as formatLocalizedDuration,
  formatDurationShort as formatLocalizedDurationShort,
  formatRelative,
  getDuePresets,
} from '../i18n';

export function fmtDuration(ms, opts = {}) {
  return formatLocalizedDuration(ms, opts.locale ?? 'ja-JP', opts);
}

export function fmtDurationShort(ms, locale = 'ja-JP') {
  return formatLocalizedDurationShort(ms, locale);
}

export function fmtDurationMin(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtRel(ts, locale = 'ja-JP', now = Date.now()) {
  return formatRelative(ts, locale, now);
}

export function fmtDateHeader(ts, locale = 'ja-JP', now = Date.now()) {
  return formatLocalizedDateHeader(ts, locale, now);
}

export function getTaskDuePresets(base = new Date(), locale = 'ja-JP') {
  return getDuePresets(base, locale);
}
