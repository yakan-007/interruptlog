import type { Event } from '@/types';
import { getDuration, computeDailyTrend } from '@/lib/reportUtils';
import type { DateRange } from './types';
import { filterEventsByDateKey } from '@/lib/reportUtils';
import { startOfDay, addDays, getDayBounds, toDateKey } from './range';
import type { HeatmapRow, HourlyTrendPoint, WeeklyActivityPoint } from './types';

const MS_IN_MINUTE = 60 * 1000;
const HOURS_IN_DAY = 24;

type HourlyBucket = {
  task: number;
  interrupt: number;
  break: number;
};

const buildHourlyBuckets = (events: Event[]): HourlyBucket[] => {
  const buckets: HourlyBucket[] = Array.from({ length: HOURS_IN_DAY }, () => ({ task: 0, interrupt: 0, break: 0 }));

  events.forEach(event => {
    const end = Math.max(event.start, getDuration(event) + event.start);
    let cursor = event.start;

    while (cursor < end) {
      const hourStart = startOfDay(new Date(cursor));
      hourStart.setHours(new Date(cursor).getHours(), 0, 0, 0);
      const hourIndex = new Date(cursor).getHours();
      const nextHour = hourStart.getTime() + 60 * 60 * 1000;
      const segmentEnd = Math.min(end, nextHour);
      const duration = Math.max(0, segmentEnd - cursor);
      buckets[hourIndex][event.type] += duration;
      cursor = segmentEnd;
    }
  });

  return buckets;
};

export const buildHourlyTrend = (events: Event[]): HourlyTrendPoint[] => {
  const buckets = buildHourlyBuckets(events);
  return buckets.map((bucket, hour) => ({
    hourLabel: `${String(hour).padStart(2, '0')}:00`,
    focusMinutes: bucket.task / MS_IN_MINUTE,
    interruptMinutes: bucket.interrupt / MS_IN_MINUTE,
    breakMinutes: bucket.break / MS_IN_MINUTE,
  }));
};

export const buildHeatmapData = (events: Event[], selectedDateKey: string, days = 7): HeatmapRow[] => {
  const endDate = startOfDay(new Date(`${selectedDateKey}T00:00:00`));
  const startDate = addDays(endDate, -(days - 1));

  const rows: HeatmapRow[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dayKey = toDateKey(cursor);
    const dayEvents = filterEventsByDateKey(events, dayKey);
    const buckets = buildHourlyBuckets(dayEvents);
    rows.push({
      dayKey,
      label: ['日', '月', '火', '水', '木', '金', '土'][cursor.getDay()],
      values: buckets.map(bucket => (bucket.task + bucket.interrupt) / MS_IN_MINUTE),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
};

export const buildWeeklyActivityPoints = (events: Event[], range: DateRange): WeeklyActivityPoint[] => {
  const dailyTrend = computeDailyTrend(events, range.endKey, range.days.length);

  return dailyTrend.map(item => {
    const total = item.focusDuration + item.interruptDuration + item.breakDuration;
    const focusHours = item.focusDuration / (60 * 60 * 1000);
    const interruptHours = item.interruptDuration / (60 * 60 * 1000);
    const focusRate = total > 0 ? (item.focusDuration / total) * 100 : 0;
    const date = new Date(`${item.dateKey}T00:00:00`);
    const weekdayLabel = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return {
      label: weekdayLabel,
      focusHours,
      interruptHours,
      focusRate: Math.round(focusRate),
    };
  });
};
