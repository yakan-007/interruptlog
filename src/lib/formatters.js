import {
  formatDateHeader as formatLocalizedDateHeader,
  formatDurationShort as formatLocalizedDurationShort,
  formatDayLabel,
  formatDueAt,
  formatRelative,
  getDuePresets,
} from '../i18n';

export function fmtDurationShort(ms, locale = 'ja-JP') {
  return formatLocalizedDurationShort(ms, locale);
}

export function fmtDurationMin(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtDay(ts, locale = 'ja-JP', now = Date.now()) {
  return formatDayLabel(ts, locale, now);
}

export function fmtDue(ts, locale = 'ja-JP', now = Date.now()) {
  return formatDueAt(ts, locale, now);
}

export function fmtRel(ts, locale = 'ja-JP', now = Date.now()) {
  return formatRelative(ts, locale, now);
}

export function fmtDateHeader(ts, locale = 'ja-JP', now = Date.now()) {
  return formatLocalizedDateHeader(ts, locale, now);
}

export function getTaskDuePresets(base = new Date(), locale = 'ja-JP', workSchedule = null, workDays) {
  return getDuePresets(base, locale, workSchedule, workDays);
}
