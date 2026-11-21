import { isWorkSchedule, timestampAtClock } from '../lib/workday';
import { getLocaleConfig, normalizeLocale } from './localeConfig.js';
import { addDays, daysBetween, startOfDay } from '../lib/day.js';

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

export function formatDurationShort(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  // Same units as the rest ("1h 5m"): nothing reads "0秒", and under a minute is "23s".
  if (total === 0) return '0m';
  if (total < 60) return `${total}s`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// A target day: "今日", "明日", or "11/25(水)".
export function formatDayLabel(ts, locale = 'ja-JP', nowTs = Date.now()) {
  const dayDiff = daysBetween(nowTs, ts);
  const ja = locale === 'ja-JP';
  if (dayDiff === 0) return ja ? '今日' : 'Today';
  if (dayDiff === 1) return ja ? '明日' : 'Tomorrow';
  return formatDate(ts, locale, { weekday: 'short' });
}

// A due date as a day and clock time ("今日 18:00", "明日 9:00", "11/21 18:00"),
// so it cannot be mistaken for a remaining duration next to work times.
export function formatDueAt(ts, locale = 'ja-JP', nowTs = Date.now()) {
  const dayDiff = daysBetween(nowTs, ts);
  const time = new Intl.DateTimeFormat(normalizeLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: getLocaleConfig(locale).hourCycle,
  }).format(new Date(ts));
  const ja = locale === 'ja-JP';
  if (dayDiff === 0) return `${ja ? '今日' : 'Today'} ${time}`;
  if (dayDiff === 1) return `${ja ? '明日' : 'Tomorrow'} ${time}`;
  if (dayDiff === -1) return `${ja ? '昨日' : 'Yesterday'} ${time}`;
  return formatDateTime(ts, locale);
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

// Quick due dates, at the end of working days only: today (while it is a
// working day and not over), the next working day, and the last working day
// of this week — or of next week once this week has none left.
export function getDuePresets(base = new Date(), locale = 'ja-JP', workSchedule = null, workDays = [1, 2, 3, 4, 5]) {
  const ja = locale === 'ja-JP';
  const none = { label: ja ? 'なし' : 'None', value: null };
  if (!isWorkSchedule(workSchedule) || workDays.length === 0) return [none];

  const now = base.getTime();
  const isWorkday = (timestamp) => workDays.includes(new Date(timestamp).getDay());
  const endOn = (timestamp) => timestampAtClock(timestamp, workSchedule.end);
  const nextWorkday = (from) => {
    for (let offset = 1; offset <= 14; offset += 1) {
      const day = addDays(from, offset);
      if (isWorkday(day)) return day;
    }
    return null;
  };
  // Last working day of the Monday-to-Sunday week that contains `day`.
  const lastWorkdayOfWeek = (day) => {
    const sunday = addDays(startOfDay(day), (7 - new Date(day).getDay()) % 7);
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(sunday, -offset);
      if (isWorkday(candidate)) return candidate;
    }
    return null;
  };

  const presets = [];
  if (isWorkday(now) && now < endOn(now)) presets.push({ label: ja ? '今日中' : 'Today', value: endOn(now) });

  const next = nextWorkday(startOfDay(now));
  const weekday = new Intl.DateTimeFormat(normalizeLocale(locale), { weekday: 'short' }).format(new Date(next));
  const nextLabel = daysBetween(now, next) === 1
    ? (ja ? '明日中' : 'Tomorrow')
    : (ja ? `${weekday}曜中` : `By ${weekday}`);
  presets.push({ label: nextLabel, value: endOn(next) });

  const thisWeekEnd = lastWorkdayOfWeek(now);
  if (thisWeekEnd != null && daysBetween(next, thisWeekEnd) > 0) {
    presets.push({ label: ja ? '今週末' : 'End of week', value: endOn(thisWeekEnd) });
  } else {
    const nextWeekEnd = lastWorkdayOfWeek(addDays(startOfDay(now), 7));
    if (nextWeekEnd != null && daysBetween(next, nextWeekEnd) > 0) {
      presets.push({ label: ja ? '来週末' : 'End of next week', value: endOn(nextWeekEnd) });
    }
  }
  return [...presets, none];
}
