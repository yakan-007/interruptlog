import type { Event } from '@/types';

export const ANOMALY_FUTURE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
export const ANOMALY_MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export type AnomalyItem = {
  event: Event;
  duration: number;
  isFuture: boolean;
  isLong: boolean;
};

export const buildAnomalies = (
  events: Event[],
  options: { limit?: number; now?: number } = {},
): AnomalyItem[] => {
  const now = options.now ?? Date.now();
  const items = events
    .map(event => {
      const end = typeof event.end === 'number' ? event.end : now;
      const duration = Math.max(0, end - event.start);
      const isFuture = event.start > now + ANOMALY_FUTURE_BUFFER_MS || end > now + ANOMALY_FUTURE_BUFFER_MS;
      const isLong = duration > ANOMALY_MAX_DURATION_MS;
      return { event, duration, isFuture, isLong };
    })
    .filter(item => item.isFuture || item.isLong)
    .sort((a, b) => b.duration - a.duration);

  if (options.limit === undefined) {
    return items;
  }
  return items.slice(0, Math.max(0, options.limit));
};
