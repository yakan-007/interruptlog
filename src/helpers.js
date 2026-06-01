import { useState, useEffect } from 'react';
const pad = (n) => String(n).padStart(2, '0');
const tickerListeners = new Set();

export function fmtHM(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDuration(ms, opts = {}) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (opts.showSec || total < 60) {
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  }
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

export function fmtDurationShort(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtDurationMin(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtRel(ts) {
  const now = Date.now();
  const d = ts - now;
  const abs = Math.abs(d);
  if (abs < 60 * 1000) return d < 0 ? '今' : 'あと少し';
  if (abs < 60 * 60 * 1000) {
    const m = Math.round(abs / 60000);
    return d < 0 ? `${m}分前` : `あと${m}分`;
  }
  if (abs < 24 * 60 * 60 * 1000) {
    const h = Math.round(abs / 3600000);
    return d < 0 ? `${h}時間前` : `あと${h}時間`;
  }
  const dd = Math.round(abs / 86400000);
  return d < 0 ? `${dd}日前` : `あと${dd}日`;
}

export function fmtDateHeader(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  if (sameDay(d, now)) return '今日';
  if (sameDay(d, yest)) return '昨日';
  return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
}

export function getTaskDuePresets(base = new Date()) {
  const todayEnd = new Date(base);
  todayEnd.setHours(23, 59, 0, 0);

  const tomorrow = new Date(base);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);

  const weekend = new Date(base);
  let daysUntilFriday = (5 - weekend.getDay() + 7) % 7;
  if (daysUntilFriday === 0 && weekend.getHours() >= 17) daysUntilFriday = 7;
  weekend.setDate(weekend.getDate() + daysUntilFriday);
  weekend.setHours(17, 0, 0, 0);

  return [
    { label: '今日中', value: todayEnd.getTime() },
    { label: '明日', value: tomorrow.getTime() },
    { label: '今週末', value: weekend.getTime() },
    { label: 'なし', value: null },
  ];
}

export function toDateTimeLocalValue(ts) {
  if (!Number.isFinite(ts)) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handleSync = (nextNow) => setNow(nextNow);
    tickerListeners.add(handleSync);
    const i = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      tickerListeners.delete(handleSync);
      clearInterval(i);
    };
  }, [intervalMs]);
  return now;
}

export function resyncTickersNow(now = Date.now()) {
  tickerListeners.forEach((listener) => listener(now));
}

export { pad };
