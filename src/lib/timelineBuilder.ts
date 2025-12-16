import { Event, Category } from '@/types';

export interface TimelineSegment {
  id: string;
  label: string;
  type: Event['type'];
  start: number;
  end: number;
  durationMinutes: number;
  categoryColor?: string;
}

export interface TimelineSummary {
  firstStart?: number;
  lastEnd?: number;
  longestFocus?: TimelineSegment;
  totalFocusMinutes: number;
  totalInterruptMinutes: number;
  totalBreakMinutes: number;
}

export interface TimelineData {
  segments: TimelineSegment[];
  totalTrackedMinutes: number;
  summary: TimelineSummary;
}

export function buildTimeline(
  events: Event[],
  categories?: Category[],
): TimelineData {
  if (events.length === 0) {
    return {
      segments: [],
      totalTrackedMinutes: 0,
      summary: {
        totalFocusMinutes: 0,
        totalInterruptMinutes: 0,
        totalBreakMinutes: 0,
      },
    };
  }

  const categoryColorMap: Record<string, string> = {};
  categories?.forEach(category => {
    categoryColorMap[category.id] = category.color;
  });

  const segments: TimelineSegment[] = [];
  let totalTrackedMinutes = 0;
  let firstStart: number | undefined;
  let lastEnd: number | undefined;
  let longestFocus: TimelineSegment | undefined;
  let totalFocusMinutes = 0;
  let totalInterruptMinutes = 0;
  let totalBreakMinutes = 0;

  events
    .filter(event => event.end)
    .sort((a, b) => a.start - b.start)
    .forEach(event => {
      const segment: TimelineSegment = {
        id: event.id,
        label: event.label ?? defaultLabel(event.type),
        type: event.type,
        start: event.start,
        end: event.end!,
        durationMinutes: Math.max(0, (event.end! - event.start) / 60000),
        categoryColor: event.categoryId ? categoryColorMap[event.categoryId] : undefined,
      };

      if (segment.durationMinutes <= 0) {
        return;
      }

      segments.push(segment);
      totalTrackedMinutes += segment.durationMinutes;

      if (!firstStart || segment.start < firstStart) {
        firstStart = segment.start;
      }
      if (!lastEnd || segment.end > lastEnd) {
        lastEnd = segment.end;
      }

      switch (segment.type) {
        case 'task':
          totalFocusMinutes += segment.durationMinutes;
          if (!longestFocus || segment.durationMinutes > longestFocus.durationMinutes) {
            longestFocus = segment;
          }
          break;
        case 'interrupt':
          totalInterruptMinutes += segment.durationMinutes;
          break;
        case 'break':
          totalBreakMinutes += segment.durationMinutes;
          break;
      }
    });

  return {
    segments,
    totalTrackedMinutes,
    summary: {
      firstStart,
      lastEnd,
      longestFocus,
      totalFocusMinutes,
      totalInterruptMinutes,
      totalBreakMinutes,
    },
  };
}

function defaultLabel(type: Event['type']): string {
  switch (type) {
    case 'task':
      return 'タスク';
    case 'interrupt':
      return '割り込み';
    case 'break':
      return '休憩';
  }
}
