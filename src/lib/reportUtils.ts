import { Event, MyTask } from '@/types';

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = MS_IN_SECOND * 60;
const MS_IN_HOUR = MS_IN_MINUTE * 60;
const MS_IN_DAY = MS_IN_HOUR * 24;

export const DEFAULT_TREND_DAYS = 7;

type EventType = Event['type'];

type AggregatedTotals = Record<EventType, { duration: number; count: number }>;

export interface SummaryItem {
  key: EventType;
  label: string;
  description: string;
  totalDuration: number;
  totalCount: number;
  deltaDuration: number;
  deltaCount: number;
}

export interface SummaryMetrics {
  items: SummaryItem[];
  totalSessions: number;
}

export interface InterruptionTypeSummary {
  label: string;
  totalDuration: number;
  count: number;
}

export interface InterruptionContributorSummary extends InterruptionTypeSummary {
  types: InterruptionTypeSummary[];
}

export interface InterruptionStats {
  totalDuration: number;
  totalCount: number;
  averageDuration: number;
  peakHourLabel: string | null;
  topContributors: InterruptionContributorSummary[];
  topTypes: InterruptionTypeSummary[];
}

export interface TrendDatum {
  dateKey: string;
  label: string;
  focusDuration: number;
  interruptDuration: number;
  breakDuration: number;
  totalDuration: number;
}

const EVENT_LABELS: Record<EventType, { label: string; description: string }> = {
  task: { label: 'フォーカス', description: 'タスクに集中した時間' },
  interrupt: { label: '割り込み', description: '対応に費やした時間' },
  break: { label: '休憩', description: 'リフレッシュに使った時間' },
};

const ensureEndTime = (event: Event): number => {
  if (typeof event.end === 'number') return event.end;
  // Fallback: treat ongoing event as now
  return Date.now();
};

export const getDuration = (event: Event): number => {
  return Math.max(0, ensureEndTime(event) - event.start);
};

export const formatDateKey = (date: Date): string => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const day = String(copy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDateFromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  // Interpret the stored date key in the user's local timezone so daily filters
  // align with what they see in the UI.
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const calculateTotalsByType = (events: Event[]): AggregatedTotals => {
  const totals: AggregatedTotals = {
    task: { duration: 0, count: 0 },
    interrupt: { duration: 0, count: 0 },
    break: { duration: 0, count: 0 },
  };

  const seenByType: Record<EventType, Set<string>> = {
    task: new Set(),
    interrupt: new Set(),
    break: new Set(),
  };

  events.forEach(event => {
    const duration = getDuration(event);
    totals[event.type].duration += duration;

    const identity = event.meta?.splitRefId ?? event.id;
    const seen = seenByType[event.type];
    if (!seen.has(identity)) {
      seen.add(identity);
      totals[event.type].count += 1;
    }
  });

  return totals;
};

export const computeSummaryMetrics = (
  currentEvents: Event[],
  previousEvents: Event[],
): SummaryMetrics => {
  const currentTotals = calculateTotalsByType(currentEvents);
  const previousTotals = calculateTotalsByType(previousEvents);

  const items: SummaryItem[] = (['task', 'interrupt', 'break'] as EventType[]).map(key => ({
    key,
    label: EVENT_LABELS[key].label,
    description: EVENT_LABELS[key].description,
    totalDuration: currentTotals[key].duration,
    totalCount: currentTotals[key].count,
    deltaDuration: currentTotals[key].duration - previousTotals[key].duration,
    deltaCount: currentTotals[key].count - previousTotals[key].count,
  }));

  const totalSessions = items.reduce((sum, item) => sum + item.totalCount, 0);

  return { items, totalSessions };
};

const toContributorLabel = (value: string | undefined): string => {
  if (!value || value.trim().length === 0) return '未記入';
  return value.trim();
};

export const computeInterruptionStats = (events: Event[]): InterruptionStats => {
  const interrupts = events.filter(event => event.type === 'interrupt' && event.end !== undefined);

  if (interrupts.length === 0) {
    return {
      totalDuration: 0,
      totalCount: 0,
      averageDuration: 0,
      peakHourLabel: null,
      topContributors: [],
      topTypes: [],
    };
  }

  const uniqueInterrupts = new Map<string, { duration: number; who: string; type: string }>();
  const hourBuckets: number[] = Array.from({ length: 24 }, () => 0);

  interrupts.forEach(event => {
    const duration = getDuration(event);
    const identity = event.meta?.splitRefId ?? event.id;
    const entry = uniqueInterrupts.get(identity);

    if (entry) {
      entry.duration += duration;
    } else {
      uniqueInterrupts.set(identity, {
        duration,
        who: toContributorLabel(event.who),
        type: toContributorLabel(event.interruptType),
      });
    }

    // Distribute duration into hour buckets for timeline insights
    const eventEnd = Math.max(event.start, ensureEndTime(event));
    let cursor = event.start;
    while (cursor < eventEnd) {
      const hourStart = new Date(cursor);
      hourStart.setMinutes(0, 0, 0);
      const nextHour = hourStart.getTime() + MS_IN_HOUR;
      const segmentEnd = Math.min(eventEnd, nextHour);
      const bucketDuration = Math.max(0, segmentEnd - cursor);
      const hourIndex = hourStart.getHours();
      hourBuckets[hourIndex] += bucketDuration;
      cursor = segmentEnd;
    }
  });

  const contributorMap = new Map<string, { duration: number; count: number }>();
  const typeMap = new Map<string, { duration: number; count: number }>();
  const contributorTypeMap = new Map<string, Map<string, { duration: number; count: number }>>();
  let totalDuration = 0;

  uniqueInterrupts.forEach(({ duration, who, type }) => {
    totalDuration += duration;
    const whoEntry = contributorMap.get(who) ?? { duration: 0, count: 0 };
    whoEntry.duration += duration;
    whoEntry.count += 1;
    contributorMap.set(who, whoEntry);

    const typeBreakdown = contributorTypeMap.get(who) ?? new Map();
    const contributorTypeEntry = typeBreakdown.get(type) ?? { duration: 0, count: 0 };
    contributorTypeEntry.duration += duration;
    contributorTypeEntry.count += 1;
    typeBreakdown.set(type, contributorTypeEntry);
    contributorTypeMap.set(who, typeBreakdown);

    const typeAggregateEntry = typeMap.get(type) ?? { duration: 0, count: 0 };
    typeAggregateEntry.duration += duration;
    typeAggregateEntry.count += 1;
    typeMap.set(type, typeAggregateEntry);
  });

  const toContributorList = (
    map: Map<string, { duration: number; count: number }>,
    detailMap: Map<string, Map<string, { duration: number; count: number }>>,
  ): InterruptionContributorSummary[] =>
    Array.from(map.entries())
      .map(([label, value]) => {
        const detail = detailMap.get(label) ?? new Map();
        const types: InterruptionTypeSummary[] = Array.from(detail.entries())
          .map(([typeLabel, metrics]) => ({
            label: typeLabel,
            totalDuration: metrics.duration,
            count: metrics.count,
          }))
          .sort((a, b) => b.totalDuration - a.totalDuration)
          .slice(0, 5);
        return {
          label,
          totalDuration: value.duration,
          count: value.count,
          types,
        };
      })
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 3);

  const peakHourIndex = hourBuckets.reduce(
    (acc, value, index) => (value > acc.value ? { value, index } : acc),
    { value: -1, index: -1 },
  ).index;

  const peakHourLabel = peakHourIndex >= 0 ? formatHourLabel(peakHourIndex) : null;

  return {
    totalDuration,
    totalCount: uniqueInterrupts.size,
    averageDuration: uniqueInterrupts.size > 0 ? totalDuration / uniqueInterrupts.size : 0,
    peakHourLabel,
    topContributors: toContributorList(contributorMap, contributorTypeMap),
    topTypes: Array.from(typeMap.entries())
      .map(([label, metrics]) => ({ label, totalDuration: metrics.duration, count: metrics.count }))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 5),
  };
};

const formatHourLabel = (hour: number): string => {
  if (hour === 0) return '0時 - 1時';
  if (hour === 23) return '23時 - 24時';
  return `${hour}時 - ${hour + 1}時`;
};

export const computeDailyTrend = (
  events: Event[],
  referenceDateKey: string,
  days = DEFAULT_TREND_DAYS,
): TrendDatum[] => {
  const trendMap = new Map<string, { task: number; interrupt: number; break: number }>();

  const referenceDate = createDateFromKey(referenceDateKey);
  referenceDate.setHours(0, 0, 0, 0);
  const startWindow = referenceDate.getTime() - (days - 1) * MS_IN_DAY;

  events.forEach(event => {
    const eventStart = event.start;
    if (eventStart < startWindow || eventStart > referenceDate.getTime() + MS_IN_DAY) {
      return;
    }
    const dateKey = formatDateKey(new Date(event.start));
    const entry = trendMap.get(dateKey) ?? { task: 0, interrupt: 0, break: 0 };
    entry[event.type] += getDuration(event);
    trendMap.set(dateKey, entry);
  });

  const data: TrendDatum[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(referenceDate.getTime() - i * MS_IN_DAY);
    const key = formatDateKey(date);
    const entry = trendMap.get(key) ?? { task: 0, interrupt: 0, break: 0 };

    data.push({
      dateKey: key,
      label: formatDisplayDate(key),
      focusDuration: entry.task,
      interruptDuration: entry.interrupt,
      breakDuration: entry.break,
      totalDuration: entry.task + entry.interrupt + entry.break,
    });
  }

  return data;
};

export const formatDuration = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / MS_IN_SECOND);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatDurationCompact = (ms: number): string => {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / MS_IN_MINUTE);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
};

const formatDisplayDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-');
  return `${Number(month)}月${Number(day)}日`;
};

export const shiftDateKey = (dateKey: string, offsetDays: number): string => {
  const date = createDateFromKey(dateKey);
  date.setTime(date.getTime() + offsetDays * MS_IN_DAY);
  return formatDateKey(date);
};

export const filterEventsByDateKey = (events: Event[], dateKey: string): Event[] => {
  const date = createDateFromKey(dateKey);
  const start = date.getTime();
  const end = start + MS_IN_DAY;

  return events
    .filter(event => {
      const eventEnd = ensureEndTime(event);
      return eventEnd > start && event.start < end;
    })
    .map(event => {
      const eventEnd = ensureEndTime(event);
      const clippedStart = Math.max(event.start, start);
      const clippedEnd = Math.min(eventEnd, end);

      if (clippedStart === event.start && clippedEnd === eventEnd) {
        const meta = event.meta ? { ...event.meta, splitRefId: event.meta.splitRefId ?? event.id } : { splitRefId: event.id };
        return { ...event, meta };
      }

      const meta = event.meta ? { ...event.meta, splitRefId: event.meta.splitRefId ?? event.id } : { splitRefId: event.id };
      return {
        ...event,
        id: `${event.id}:${dateKey}`,
        start: clippedStart,
        end: clippedEnd,
        meta,
      };
    })
    .sort((a, b) => a.start - b.start);
};

export const filterEventsByDateRange = (events: Event[], startKey: string, endKey: string): Event[] => {
  const startDate = createDateFromKey(startKey);
  const endDate = createDateFromKey(endKey);
  const start = startDate.getTime();
  const end = endDate.getTime() + MS_IN_DAY;
  return events
    .filter(event => {
      const eventEnd = ensureEndTime(event);
      return eventEnd > start && event.start < end;
    })
    .map(event => {
      const eventEnd = ensureEndTime(event);
      const clippedStart = Math.max(event.start, start);
      const clippedEnd = Math.min(eventEnd, end);

      if (clippedStart === event.start && clippedEnd === eventEnd) {
        const meta = event.meta ? { ...event.meta, splitRefId: event.meta.splitRefId ?? event.id } : { splitRefId: event.id };
        return { ...event, meta };
      }

      const meta = event.meta ? { ...event.meta, splitRefId: event.meta.splitRefId ?? event.id } : { splitRefId: event.id };
      return {
        ...event,
        id: `${event.id}:${clippedStart}`,
        start: clippedStart,
        end: clippedEnd,
        meta,
      };
    })
    .sort((a, b) => a.start - b.start);
};

export type EventsByDateIndex = Map<string, Event[]>;

const splitEventAcrossDays = (event: Event): Event[] => {
  const end = ensureEndTime(event);
  if (end <= event.start) {
    const meta: Event['meta'] = event.meta
      ? { ...event.meta, splitRefId: event.meta.splitRefId ?? event.id }
      : { splitRefId: event.id };
    return [{ ...event, meta }];
  }

  const segments: Event[] = [];
  const baseMeta: Event['meta'] = event.meta ? { ...event.meta } : {};
  const splitRefId = baseMeta.splitRefId ?? event.id;
  baseMeta.splitRefId = splitRefId;

  let segmentStart = event.start;
  let isFirstSegment = true;

  while (segmentStart < end) {
    const dayStart = new Date(segmentStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + MS_IN_DAY;
    const segmentEnd = Math.min(end, dayEnd);
    if (segmentEnd <= segmentStart) {
      break;
    }

    const dayKey = formatDateKey(dayStart);
    const segmentId = isFirstSegment && segmentEnd === end ? event.id : `${event.id}:${dayKey}`;
    const meta = { ...baseMeta };

    segments.push({
      ...event,
      id: segmentId,
      start: segmentStart,
      end: segmentEnd,
      meta,
    });

    segmentStart = segmentEnd;
    isFirstSegment = false;
  }

  return segments;
};

export const indexEventsByDate = (events: Event[]): EventsByDateIndex => {
  const index: EventsByDateIndex = new Map();

  events.forEach(event => {
    const segments = splitEventAcrossDays(event);
    segments.forEach(segment => {
      const key = formatDateKey(new Date(segment.start));
      const bucket = index.get(key);
      if (bucket) {
        bucket.push(segment);
      } else {
        index.set(key, [segment]);
      }
    });
  });

  index.forEach(bucket => bucket.sort((a, b) => a.start - b.start));

  return index;
};

export const collectEventsFromIndex = (index: EventsByDateIndex, range: { days: string[] }): Event[] => {
  const results: Event[] = [];
  range.days.forEach(dayKey => {
    const bucket = index.get(dayKey);
    if (bucket) {
      results.push(...bucket);
    }
  });
  return results.sort((a, b) => a.start - b.start);
};

export const getEventsForDateKey = (index: EventsByDateIndex, dateKey: string): Event[] => {
  const bucket = index.get(dateKey);
  return bucket ? [...bucket].sort((a, b) => a.start - b.start) : [];
};

export const formatDelta = (ms: number): { label: string; trend: 'up' | 'down' | 'flat' } => {
  if (ms === 0) return { label: '±0', trend: 'flat' };
  const sign = ms > 0 ? '+' : '-';
  const value = formatDurationCompact(Math.abs(ms));
  return { label: `${sign}${value}`, trend: ms > 0 ? 'up' : 'down' };
};

export const formatCountDelta = (count: number): { label: string; trend: 'up' | 'down' | 'flat' } => {
  if (count === 0) return { label: '±0件', trend: 'flat' };
  return { label: `${count > 0 ? '+' : ''}${count}件`, trend: count > 0 ? 'up' : 'down' };
};
