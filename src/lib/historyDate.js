import { normalizeLocale } from '../i18n';

const MINUTE_MS = 60000;

const RELATIVE_LABELS = {
  'ja-JP': {
    today: '今日',
    yesterday: '昨日',
    tomorrow: '明日',
  },
  'en-US': {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
  },
};

function pad(number) {
  return String(number).padStart(2, '0');
}

export function startOfHistoryDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function nextHistoryDayStart(dayStart) {
  const next = new Date(dayStart);
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

export function getHistoryDayBounds(timestamp = Date.now()) {
  const dayStart = startOfHistoryDay(timestamp);
  return { dayStart, dayEnd: nextHistoryDayStart(dayStart) };
}

export function shiftHistoryDay(timestamp, delta) {
  const date = new Date(startOfHistoryDay(timestamp));
  date.setDate(date.getDate() + delta);
  return date.getTime();
}

export function isSameHistoryDay(left, right) {
  return startOfHistoryDay(left) === startOfHistoryDay(right);
}

export function createDefaultMissedDraft(selectedDate, now = Date.now()) {
  const dayStart = startOfHistoryDay(selectedDate);
  const dayEnd = nextHistoryDayStart(dayStart);
  const todaySelected = startOfHistoryDay(now) === dayStart;
  const latestEnd = todaySelected
    ? Math.max(dayStart, Math.floor(now / MINUTE_MS) * MINUTE_MS)
    : dayEnd - MINUTE_MS;
  const end = Math.min(latestEnd, dayEnd - MINUTE_MS);
  const start = Math.max(dayStart, end - 30 * MINUTE_MS);
  return createMissedDraftFromRange(start, end);
}

export function createMissedDraftFromRange(start, end) {
  const dayStart = startOfHistoryDay(start);
  const dayEnd = nextHistoryDayStart(dayStart);
  const safeStart = Math.min(Math.max(start, dayStart), dayEnd - 2 * MINUTE_MS);
  const safeEnd = Math.min(Math.max(end, safeStart + MINUTE_MS), dayEnd - MINUTE_MS);
  return { start: safeStart, end: safeEnd };
}

export function formatHistoryDateParts(timestamp, now = Date.now(), locale = 'ja-JP') {
  const date = new Date(timestamp);
  const normalizedLocale = normalizeLocale(locale);
  const labels = RELATIVE_LABELS[normalizedLocale] ?? RELATIVE_LABELS['ja-JP'];
  const relative = isSameHistoryDay(timestamp, now)
    ? labels.today
    : isSameHistoryDay(timestamp, shiftHistoryDay(now, -1))
      ? labels.yesterday
      : isSameHistoryDay(timestamp, shiftHistoryDay(now, 1))
        ? labels.tomorrow
        : null;
  return {
    day: String(date.getDate()),
    month: formatHistoryMonth(date, normalizedLocale),
    year: String(date.getFullYear()),
    weekday: formatHistoryWeekday(date, normalizedLocale),
    relative,
  };
}

function formatHistoryMonth(date, locale) {
  if (locale === 'ja-JP') return `${date.getMonth() + 1}月`;
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
}

function formatHistoryWeekday(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: locale === 'ja-JP' ? 'narrow' : 'short' }).format(date);
}

export function toHistoryDateInputValue(timestamp) {
  const date = new Date(startOfHistoryDay(timestamp));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromHistoryDateInputValue(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}
