import type { Event, Category } from '@/types';
import type { TaskLifecycleRecord } from '@/types';
import type { DateRange } from './types';
import { getDayBounds, toDateKey } from './range';

export interface CategorySeriesMeta {
  id: string | null;
  name: string;
  color?: string;
}

export interface CategorySeriesDatum {
  dateKey: string;
  label: string;
  values: Record<string, number>;
  totalMinutes: number;
}

export interface CategorySeriesResult {
  categories: CategorySeriesMeta[];
  data: CategorySeriesDatum[];
}

const minutesBetween = (start: number, end: number) => Math.max(0, (end - start) / 60000);

const resolveCategory = (
  event: Event,
  taskRecord: TaskLifecycleRecord | undefined,
  categories: Category[],
): CategorySeriesMeta => {
  const categoryId = event.categoryId ?? taskRecord?.latestCategoryId ?? taskRecord?.createdCategoryId ?? null;
  const category = categoryId ? categories.find(cat => cat.id === categoryId) : undefined;
  return {
    id: categoryId,
    name: category?.name ?? taskRecord?.latestCategoryName ?? taskRecord?.createdCategoryName ?? '未分類',
    color: category?.color,
  };
};

export const buildWeeklyCategorySeries = (
  events: Event[],
  ledger: Record<string, TaskLifecycleRecord>,
  categories: Category[],
  range: DateRange,
): CategorySeriesResult => {
  const categoryIndexMap = new Map<string | null, CategorySeriesMeta>();
  const data: CategorySeriesDatum[] = range.days.map(dayKey => ({
    dateKey: dayKey,
    label: ['日', '月', '火', '水', '木', '金', '土'][new Date(`${dayKey}T00:00:00`).getDay()],
    values: {},
    totalMinutes: 0,
  }));

  events.forEach(event => {
    if (event.type !== 'task') return;

    const taskRecord = event.meta?.myTaskId ? ledger[event.meta.myTaskId] : undefined;
    const meta = resolveCategory(event, taskRecord, categories);
    if (!categoryIndexMap.has(meta.id)) {
      categoryIndexMap.set(meta.id, meta);
    }

    const eventStart = event.start;
    const eventEnd = event.end ?? Date.now();
    for (const datum of data) {
      const { start, end } = getDayBounds(datum.dateKey);
      if (eventEnd <= start || eventStart >= end) {
        continue;
      }
      const minutes = minutesBetween(Math.max(eventStart, start), Math.min(eventEnd, end));
      if (minutes <= 0) {
        continue;
      }
      datum.values[meta.id ?? 'uncategorized'] = (datum.values[meta.id ?? 'uncategorized'] ?? 0) + minutes;
      datum.totalMinutes += minutes;
    }
  });

  // Ensure every datum has all category keys for consistent stacking
  const categoriesList = Array.from(categoryIndexMap.values());
  data.forEach(datum => {
    categoriesList.forEach(meta => {
      datum.values[meta.id ?? 'uncategorized'] = datum.values[meta.id ?? 'uncategorized'] ?? 0;
    });
  });

  return {
    categories: categoriesList,
    data,
  };
};
