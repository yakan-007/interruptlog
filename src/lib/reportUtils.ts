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

export interface InterruptionContributor {
  label: string;
  totalDuration: number;
  count: number;
}

export interface InterruptionStats {
  totalDuration: number;
  totalCount: number;
  averageDuration: number;
  peakHourLabel: string | null;
  topContributors: InterruptionContributor[];
  topTypes: InterruptionContributor[];
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

const formatDateKey = (date: Date): string => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split('T')[0];
};

const createDateFromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  const d = new Date();
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const calculateTotalsByType = (events: Event[]): AggregatedTotals => {
  const totals: AggregatedTotals = {
    task: { duration: 0, count: 0 },
    interrupt: { duration: 0, count: 0 },
    break: { duration: 0, count: 0 },
  };

  events.forEach(event => {
    const duration = getDuration(event);
    totals[event.type].duration += duration;
    totals[event.type].count += 1;
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

  const totalDuration = interrupts.reduce((sum, event) => sum + getDuration(event), 0);

  const contributorMap = new Map<string, { duration: number; count: number }>();
  const typeMap = new Map<string, { duration: number; count: number }>();
  const hourBuckets: number[] = Array.from({ length: 24 }, () => 0);

  interrupts.forEach(event => {
    const duration = getDuration(event);

    const whoKey = toContributorLabel(event.who);
    const whoEntry = contributorMap.get(whoKey) ?? { duration: 0, count: 0 };
    whoEntry.duration += duration;
    whoEntry.count += 1;
    contributorMap.set(whoKey, whoEntry);

    const typeKey = toContributorLabel(event.interruptType);
    const typeEntry = typeMap.get(typeKey) ?? { duration: 0, count: 0 };
    typeEntry.duration += duration;
    typeEntry.count += 1;
    typeMap.set(typeKey, typeEntry);

    const hour = new Date(event.start).getHours();
    hourBuckets[hour] += duration;
  });

  const toContributorList = (map: Map<string, { duration: number; count: number }>): InterruptionContributor[] =>
    Array.from(map.entries())
      .map(([label, value]) => ({ label, totalDuration: value.duration, count: value.count }))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 3);

  const peakHourIndex = hourBuckets.reduce(
    (acc, value, index) => (value > acc.value ? { value, index } : acc),
    { value: -1, index: -1 },
  ).index;

  const peakHourLabel = peakHourIndex >= 0 ? formatHourLabel(peakHourIndex) : null;

  return {
    totalDuration,
    totalCount: interrupts.length,
    averageDuration: totalDuration / interrupts.length,
    peakHourLabel,
    topContributors: toContributorList(contributorMap),
    topTypes: toContributorList(typeMap),
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
  return events.filter(event => event.start >= start && event.start < end);
};

export const filterEventsByDateRange = (events: Event[], startKey: string, endKey: string): Event[] => {
  const startDate = createDateFromKey(startKey);
  const endDate = createDateFromKey(endKey);
  const start = startDate.getTime();
  const end = endDate.getTime() + MS_IN_DAY;
  return events.filter(event => event.start >= start && event.start < end);
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
