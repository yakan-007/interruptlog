import type { Granularity } from './types';
import { startOfWeek, endOfWeek } from './range';

export const formatRangeLabel = (selectedDateKey: string, granularity: Granularity): string => {
  const date = new Date(`${selectedDateKey}T00:00:00`);
  switch (granularity) {
    case 'day':
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    case 'week': {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
    }
    case 'month':
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    case 'year':
    default:
      return `${date.getFullYear()}年`;
  }
};

export const formatMinutesLabel = (value: number) => `${Math.round(value)}分`;
