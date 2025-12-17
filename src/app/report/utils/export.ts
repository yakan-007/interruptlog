import type { Event, Category, TaskLifecycleRecord } from '@/types';
import type { DateRange, Granularity } from './types';
import { formatDateTimeLabel } from '@/utils/dateTime';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
};

export interface ReportExportRow {
  id: string;
  type: Event['type'];
  label: string;
  start: string;
  end: string;
  durationMinutes: number;
  category: string;
  taskName: string;
  who: string;
  interruptType: string;
  breakType: string;
  breakDurationMinutes: string | number;
  memo: string;
  originalStart: string;
  originalEnd: string;
}

export const buildExportRows = (
  events: Event[],
  range: DateRange,
  categories: Category[],
  taskLedger: Record<string, TaskLifecycleRecord>,
  now: number = Date.now(),
): ReportExportRow[] => {
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime() + MS_IN_DAY;
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
  const taskMap = new Map(Object.values(taskLedger).map(task => [task.id, task.name]));

  return events
    .filter(event => {
      const eventEnd = typeof event.end === 'number' ? event.end : now;
      return eventEnd > rangeStart && event.start < rangeEnd;
    })
    .map(event => {
      const eventEnd = typeof event.end === 'number' ? event.end : now;
      const effectiveStart = Math.max(event.start, rangeStart);
      const effectiveEnd = Math.min(eventEnd, rangeEnd);
      const durationMinutes = Math.max(0, (effectiveEnd - effectiveStart) / 60000);
      const categoryName = event.categoryId ? categoryMap.get(event.categoryId) : '';
      const taskName = event.meta?.myTaskId ? taskMap.get(event.meta.myTaskId) : '';

      return {
        id: event.id,
        type: event.type,
        label: event.label ?? '',
        start: formatDateTimeLabel(effectiveStart),
        end: formatDateTimeLabel(effectiveEnd),
        durationMinutes: Math.round(durationMinutes * 10) / 10,
        category: categoryName ?? '',
        taskName: taskName ?? '',
        who: event.who ?? '',
        interruptType: event.interruptType ?? '',
        breakType: event.breakType ?? '',
        breakDurationMinutes: event.breakDurationMinutes ?? '',
        memo: event.memo ?? '',
        originalStart: formatDateTimeLabel(event.start),
        originalEnd: event.end ? formatDateTimeLabel(event.end) : '',
      };
    })
    .sort((a, b) => (a.start > b.start ? 1 : -1));
};

export const buildCsvContent = (rows: ReportExportRow[]) => {
  const headers = [
    'event_id',
    'type',
    'label',
    'start',
    'end',
    'duration_minutes',
    'category',
    'task_name',
    'who',
    'interrupt_type',
    'break_type',
    'break_duration_minutes',
    'memo',
    'original_start',
    'original_end',
  ];

  const csvRows = rows.map(row => [
    row.id,
    row.type,
    row.label,
    row.start,
    row.end,
    row.durationMinutes,
    row.category,
    row.taskName,
    row.who,
    row.interruptType,
    row.breakType,
    row.breakDurationMinutes,
    row.memo,
    row.originalStart,
    row.originalEnd,
  ]);

  return [headers.map(toCsvValue).join(','), ...csvRows.map(row => row.map(toCsvValue).join(','))].join('\n');
};

export const buildCsvFilename = (dateKey: string, granularity: Granularity) =>
  `interruptlog-report-${dateKey}-${granularity}.csv`;
