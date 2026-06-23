import { getFridayAtClock, isWorkSchedule, timestampAtClock, timestampAtClockForOffset } from '../lib/workday';
import { getLocaleConfig, normalizeLocale } from './localeConfig.js';

export function formatDate(ts, locale = 'ja-JP', options = {}) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: options.month ?? 'numeric',
    day: options.day ?? 'numeric',
    weekday: options.weekday,
  }).format(new Date(ts));
}

export function formatDateHeader(ts, locale = 'ja-JP', nowTs = Date.now()) {
  const date = new Date(ts);
  const now = new Date(nowTs);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (sameDay(date, now)) return locale === 'ja-JP' ? '今日' : 'Today';
  if (sameDay(date, yest)) return locale === 'ja-JP' ? '昨日' : 'Yesterday';
  return formatDate(ts, locale, { weekday: 'short' });
}

export function formatDateTime(ts, locale = 'ja-JP') {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: getLocaleConfig(locale).hourCycle,
  }).format(new Date(ts));
}

export function formatDuration(ms, locale = 'ja-JP', opts = {}) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (opts.showSec || total < 60) {
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (locale === 'ja-JP') return h > 0 ? `${h}時間${m}分` : `${m}分`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDurationShort(ms, locale = 'ja-JP') {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (total < 60) return locale === 'ja-JP' ? `${total}秒` : `${total}s`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatRelative(ts, locale = 'ja-JP', nowTs = Date.now()) {
  const diff = ts - nowTs;
  const abs = Math.abs(diff);
  if (locale === 'ja-JP') {
    if (abs < 60 * 1000) return diff < 0 ? '今' : 'あと少し';
    if (abs < 60 * 60 * 1000) {
      const m = Math.round(abs / 60000);
      return diff < 0 ? `${m}分前` : `あと${m}分`;
    }
    if (abs < 24 * 60 * 60 * 1000) {
      const h = Math.round(abs / 3600000);
      return diff < 0 ? `${h}時間前` : `あと${h}時間`;
    }
    const d = Math.round(abs / 86400000);
    return diff < 0 ? `${d}日前` : `あと${d}日`;
  }
  if (abs < 60 * 1000) return diff < 0 ? 'now' : 'soon';
  const unit = abs < 60 * 60 * 1000 ? 'minute' : abs < 24 * 60 * 60 * 1000 ? 'hour' : 'day';
  const value = unit === 'minute' ? Math.round(abs / 60000) : unit === 'hour' ? Math.round(abs / 3600000) : Math.round(abs / 86400000);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diff < 0 ? -value : value, unit);
}

export function getDuePresets(base = new Date(), locale = 'ja-JP', workSchedule = null) {
  const ja = locale === 'ja-JP';
  const none = { label: ja ? 'なし' : 'None', value: null };
  if (!isWorkSchedule(workSchedule)) return [none];

  const now = base.getTime();
  const todayEnd = timestampAtClock(now, workSchedule.end);
  const tomorrow = timestampAtClockForOffset(now, workSchedule.end, 1);
  const weekend = getFridayAtClock(now, workSchedule.end);
  return [
    ...(now < todayEnd ? [{ label: ja ? '今日の終了まで' : 'By end of day', value: todayEnd }] : []),
    { label: ja ? '明日の終了まで' : 'Tomorrow EOD', value: tomorrow },
    { label: ja ? '今週末' : 'This Friday', value: weekend },
    none,
  ];
}
