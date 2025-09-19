import type { Event } from '@/types';
import type { Category } from '@/types';
import type { DateRange, TaskRangeComputation } from './types';
import type { TaskLifecycleRecord } from '@/types';
import { getDuration } from '@/lib/reportUtils';
import { getDayBounds } from './range';

export interface CategoryStats {
  categoryId: string | null;
  categoryName: string;
  color?: string;
  newCount: number;
  completedCount: number;
  canceledCount: number;
  activeCount: number;
  focusDuration: number;
}

const DEFAULT_CATEGORY_NAME = '未分類';

const getCategoryLabel = (categoryId: string | null, categories: Category[], fallback?: string) => {
  if (!categoryId) return fallback || DEFAULT_CATEGORY_NAME;
  const category = categories.find(cat => cat.id === categoryId);
  return category?.name ?? fallback ?? DEFAULT_CATEGORY_NAME;
};

const ensureCategoryStats = (
  map: Map<string | null, CategoryStats>,
  categoryId: string | null,
  categories: Category[],
  fallbackName?: string,
) => {
  if (!map.has(categoryId)) {
    const category = categories.find(cat => cat.id === categoryId);
    map.set(categoryId, {
      categoryId,
      categoryName: category?.name ?? fallbackName ?? DEFAULT_CATEGORY_NAME,
      color: category?.color,
      newCount: 0,
      completedCount: 0,
      canceledCount: 0,
      activeCount: 0,
      focusDuration: 0,
    });
  }
  return map.get(categoryId)!;
};

const withinRange = (timestamp: number | null | undefined, range: DateRange) => {
  if (timestamp == null) return false;
  return timestamp >= range.start.getTime() && timestamp < range.end.getTime() + 1;
};

const isActiveAtRangeEnd = (record: TaskLifecycleRecord, range: DateRange) => {
  const endMs = range.end.getTime() + 1;
  if (record.completedAt != null && record.completedAt < endMs) {
    return false;
  }
  if (record.canceledAt != null && record.canceledAt < endMs) {
    return false;
  }
  return true;
};

export const computeCategoryStats = (
  ledger: Record<string, TaskLifecycleRecord>,
  categories: Category[],
  range: DateRange,
  events: Event[],
  taskRange: TaskRangeComputation,
): CategoryStats[] => {
  const statsMap = new Map<string | null, CategoryStats>();

  const entries = Object.values(ledger);

  entries.forEach(entry => {
    const createdCategoryId = entry.createdCategoryId ?? entry.latestCategoryId ?? null;
    const completedCategoryId = entry.completedCategoryId ?? entry.latestCategoryId ?? createdCategoryId ?? null;
    const canceledCategoryId = entry.canceledCategoryId ?? entry.latestCategoryId ?? createdCategoryId ?? null;
    const latestCategoryId = entry.latestCategoryId ?? createdCategoryId ?? null;

    if (withinRange(entry.createdAt, range)) {
      const stats = ensureCategoryStats(statsMap, createdCategoryId, categories, entry.createdCategoryName);
      stats.newCount += 1;
    }

    if (withinRange(entry.completedAt ?? null, range)) {
      const stats = ensureCategoryStats(statsMap, completedCategoryId, categories, entry.completedCategoryName);
      stats.completedCount += 1;
    }

    if (withinRange(entry.canceledAt ?? null, range)) {
      const stats = ensureCategoryStats(statsMap, canceledCategoryId, categories, entry.canceledCategoryName);
      stats.canceledCount += 1;
    }

    if (isActiveAtRangeEnd(entry, range)) {
      const stats = ensureCategoryStats(statsMap, latestCategoryId, categories, entry.latestCategoryName ?? entry.createdCategoryName);
      stats.activeCount += 1;
    }
  });

  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime() + 1;

  events.forEach(event => {
    if (event.start >= rangeEnd || (event.end ?? Date.now()) < rangeStart) {
      return;
    }

    const taskId = event.meta?.myTaskId;
    const record = taskId ? ledger[taskId] : undefined;
    const categoryId = event.categoryId ?? record?.latestCategoryId ?? record?.createdCategoryId ?? null;
    const stats = ensureCategoryStats(statsMap, categoryId, categories, record?.latestCategoryName ?? record?.createdCategoryName);
    stats.focusDuration += getDuration(event);
  });

  const totals = ensureCategoryStats(statsMap, 'TOTAL', categories, '合計');
  totals.categoryName = '合計';
  totals.color = undefined;
  totals.newCount = 0;
  totals.completedCount = 0;
  totals.canceledCount = 0;
  totals.activeCount = 0;
  totals.focusDuration = 0;

  statsMap.forEach((value, key) => {
    if (key === 'TOTAL') return;
    totals.newCount += value.newCount;
    totals.completedCount += value.completedCount;
    totals.canceledCount += value.canceledCount;
    totals.activeCount += value.activeCount;
    totals.focusDuration += value.focusDuration;
  });

  const result = Array.from(statsMap.entries())
    .filter(([key]) => key !== 'TOTAL')
    .map(([, value]) => value)
    .sort((a, b) => b.newCount - a.newCount || b.completedCount - a.completedCount);

  result.push(totals);

  return result;
};
