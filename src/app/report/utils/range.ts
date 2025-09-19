import type { Granularity, DateRange, RangeInfo } from './types';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const toDateKey = (date: Date): string => {
  const copy = startOfDay(date);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const day = String(copy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

export const addMonths = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
};

export const addYears = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + amount);
  return d;
};

export const startOfWeek = (date: Date): Date => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as start
  return addDays(d, -diff);
};

export const endOfWeek = (date: Date): Date => addDays(startOfWeek(date), 6);

export const startOfMonth = (date: Date): Date => {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
};

export const endOfMonth = (date: Date): Date => {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return startOfDay(d);
};

export const startOfYear = (date: Date): Date => {
  const d = startOfDay(date);
  d.setMonth(0, 1);
  return d;
};

export const endOfYear = (date: Date): Date => {
  const d = startOfYear(date);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(0);
  return startOfDay(d);
};

export const createRange = (start: Date, end: Date): DateRange => {
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const days: string[] = [];
  const cursor = new Date(startDay);
  while (cursor <= endDay) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    start: startDay,
    end: endDay,
    startKey: toDateKey(startDay),
    endKey: toDateKey(endDay),
    days,
  };
};

export const buildRangeInfo = (selectedDateKey: string, granularity: Granularity): RangeInfo => {
  const referenceDate = startOfDay(new Date(`${selectedDateKey}T00:00:00`));

  switch (granularity) {
    case 'day': {
      const current = createRange(referenceDate, referenceDate);
      const previousDay = addDays(referenceDate, -1);
      const previous = createRange(previousDay, previousDay);
      return { current, previous };
    }
    case 'week': {
      const currentStart = startOfWeek(referenceDate);
      const currentEnd = endOfWeek(referenceDate);
      const previousStart = addDays(currentStart, -7);
      const previousEnd = addDays(currentEnd, -7);
      return {
        current: createRange(currentStart, currentEnd),
        previous: createRange(previousStart, previousEnd),
      };
    }
    case 'month': {
      const currentStart = startOfMonth(referenceDate);
      const currentEnd = endOfMonth(referenceDate);
      const previousStart = startOfMonth(addMonths(currentStart, -1));
      const previousEnd = endOfMonth(addMonths(currentStart, -1));
      return {
        current: createRange(currentStart, currentEnd),
        previous: createRange(previousStart, previousEnd),
      };
    }
    case 'year':
    default: {
      const currentStart = startOfYear(referenceDate);
      const currentEnd = endOfYear(referenceDate);
      const previousStart = startOfYear(addYears(currentStart, -1));
      const previousEnd = endOfYear(addYears(currentStart, -1));
      return {
        current: createRange(currentStart, currentEnd),
        previous: createRange(previousStart, previousEnd),
      };
    }
  }
};

export const getDayBounds = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = new Date(year, month - 1, day).getTime();
  const end = start + MS_IN_DAY;
  return { start, end };
};
