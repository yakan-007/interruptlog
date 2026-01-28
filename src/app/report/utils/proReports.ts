import type { Event } from '@/types';
import type { DateRange } from './types';
import { getDayBounds } from './range';
import { getDuration } from '@/lib/reportUtils';
import { getEventDisplayLabel } from '@/utils/eventUtils';

export interface WeeklyProSummary {
  topFocusDay?: { dateKey: string; durationMs: number };
  mostInterruptDay?: { dateKey: string; count: number };
  longestFocus?: { label: string; durationMs: number; start: number; end?: number };
}

export const buildWeeklyProSummary = (
  events: Event[],
  range: DateRange,
  now: number = Date.now(),
): WeeklyProSummary => {
  const taskTotals = new Map<string, number>();
  const interruptCounts = new Map<string, number>();

  range.days.forEach(dayKey => {
    taskTotals.set(dayKey, 0);
    interruptCounts.set(dayKey, 0);
  });

  let longestFocus: WeeklyProSummary['longestFocus'];

  events.forEach(event => {
    const end = typeof event.end === 'number' ? event.end : now;

    if (event.type === 'task') {
      const duration = getDuration(event);
      if (!longestFocus || duration > longestFocus.durationMs) {
        longestFocus = {
          label: getEventDisplayLabel(event),
          durationMs: duration,
          start: event.start,
          end: event.end,
        };
      }

      range.days.forEach(dayKey => {
        const bounds = getDayBounds(dayKey);
        const overlapStart = Math.max(event.start, bounds.start);
        const overlapEnd = Math.min(end, bounds.end);
        if (overlapEnd <= overlapStart) return;
        const prev = taskTotals.get(dayKey) ?? 0;
        taskTotals.set(dayKey, prev + (overlapEnd - overlapStart));
      });
    }

    if (event.type === 'interrupt') {
      range.days.forEach(dayKey => {
        const bounds = getDayBounds(dayKey);
        if (event.start >= bounds.start && event.start < bounds.end) {
          const prev = interruptCounts.get(dayKey) ?? 0;
          interruptCounts.set(dayKey, prev + 1);
        }
      });
    }
  });

  const topFocusDay = Array.from(taskTotals.entries()).reduce<WeeklyProSummary['topFocusDay']>(
    (best, [dateKey, durationMs]) => {
      if (!best || durationMs > best.durationMs) {
        return { dateKey, durationMs };
      }
      return best;
    },
    undefined,
  );

  const mostInterruptDay = Array.from(interruptCounts.entries()).reduce<WeeklyProSummary['mostInterruptDay']>(
    (best, [dateKey, count]) => {
      if (!best || count > best.count) {
        return { dateKey, count };
      }
      return best;
    },
    undefined,
  );

  return {
    topFocusDay: topFocusDay && topFocusDay.durationMs > 0 ? topFocusDay : undefined,
    mostInterruptDay: mostInterruptDay && mostInterruptDay.count > 0 ? mostInterruptDay : undefined,
    longestFocus,
  };
};
