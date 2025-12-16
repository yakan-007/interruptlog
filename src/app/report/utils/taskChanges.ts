import type { TaskLifecycleRecord } from '@/types';
import type { DateRange } from './types';
import type { Category } from '@/types';
import type { Event } from '@/types';
import { getDuration } from '@/lib/reportUtils';
import { getDayBounds } from './range';

export interface TaskChangeEntry {
  taskId: string;
  name: string;
  categoryName: string;
  categoryColor?: string;
  plannedMinutes?: number | null;
  dueAt?: number | null;
  focusDurationMs: number;
}

export interface TaskDailyChanges {
  created: TaskChangeEntry[];
  completed: TaskChangeEntry[];
}

const isWithinDay = (timestamp: number | null | undefined, dayRange: { start: number; end: number }) => {
  if (timestamp == null) {
    return false;
  }
  return timestamp >= dayRange.start && timestamp < dayRange.end;
};

const buildChangeEntry = (
  record: TaskLifecycleRecord,
  categories: Category[],
  categoryId: string | null | undefined,
  fallbackName?: string,
): { name: string; categoryName: string; categoryColor?: string } => {
  const category = categoryId ? categories.find(cat => cat.id === categoryId) : undefined;
  return {
    name: record.name,
    categoryName: category?.name ?? fallbackName ?? '未分類',
    categoryColor: category?.color,
  };
};

const sumFocusDurationForTask = (events: Event[], taskId: string, dayRange: { start: number; end: number }) => {
  return events
    .filter(event => event.type === 'task' && event.meta?.myTaskId === taskId)
    .reduce((acc, event) => {
      const eventStart = Math.max(event.start, dayRange.start);
      const eventEnd = Math.min(event.end ?? Date.now(), dayRange.end);
      if (eventEnd <= eventStart) {
        return acc;
      }
      return acc + (eventEnd - eventStart);
    }, 0);
};

export const buildTaskDailyChanges = (
  ledger: Record<string, TaskLifecycleRecord>,
  categories: Category[],
  range: DateRange,
  events: Event[],
): TaskDailyChanges => {
  const dayRange = getDayBounds(range.startKey);

  const createdEntries: TaskChangeEntry[] = [];
  const completedEntries: TaskChangeEntry[] = [];

  const eventsInDay = events.filter(event => {
    const end = event.end ?? Date.now();
    return end > dayRange.start && event.start < dayRange.end;
  });

  Object.values(ledger).forEach(record => {
    if (isWithinDay(record.createdAt, dayRange)) {
      const info = buildChangeEntry(record, categories, record.createdCategoryId, record.createdCategoryName);
      createdEntries.push({
        taskId: record.id,
        name: info.name,
        categoryName: info.categoryName,
        categoryColor: info.categoryColor,
        plannedMinutes: record.createdPlannedMinutes ?? record.latestPlannedMinutes ?? null,
        dueAt: record.latestDueAt ?? record.createdDueAt ?? null,
        focusDurationMs: sumFocusDurationForTask(eventsInDay, record.id, dayRange),
      });
    }

    if (isWithinDay(record.completedAt ?? null, dayRange)) {
      const info = buildChangeEntry(record, categories, record.completedCategoryId ?? record.latestCategoryId, record.completedCategoryName ?? record.latestCategoryName);
      completedEntries.push({
        taskId: record.id,
        name: info.name,
        categoryName: info.categoryName,
        categoryColor: info.categoryColor,
        plannedMinutes: record.completedPlannedMinutes ?? record.latestPlannedMinutes ?? null,
        dueAt: record.completedDueAt ?? record.latestDueAt ?? null,
        focusDurationMs: sumFocusDurationForTask(eventsInDay, record.id, dayRange),
      });
    }
  });

  const sortByDuration = (a: TaskChangeEntry, b: TaskChangeEntry) => b.focusDurationMs - a.focusDurationMs;

  return {
    created: createdEntries.sort(sortByDuration),
    completed: completedEntries.sort(sortByDuration),
  };
};
