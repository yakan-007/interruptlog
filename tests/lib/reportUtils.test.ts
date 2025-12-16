import { describe, expect, it } from 'vitest';
import { indexEventsByDate, collectEventsFromIndex, computeSummaryMetrics, computeInterruptionStats } from '@/lib/reportUtils';
import type { Event } from '@/types';

const buildEvent = (overrides: Partial<Event>): Event => ({
  id: 'event-1',
  type: 'task',
  start: new Date(2024, 0, 1, 23, 0, 0).getTime(),
  end: new Date(2024, 0, 2, 1, 0, 0).getTime(),
  ...overrides,
});

describe('indexEventsByDate', () => {
  it('splits events that span multiple days into day-scoped segments', () => {
    const crossDayEvent = buildEvent({});
    const index = indexEventsByDate([crossDayEvent]);

    const day1 = collectEventsFromIndex(index, {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 1),
      startKey: '2024-01-01',
      endKey: '2024-01-01',
      days: ['2024-01-01'],
    });
    const day2 = collectEventsFromIndex(index, {
      start: new Date(2024, 0, 2),
      end: new Date(2024, 0, 2),
      startKey: '2024-01-02',
      endKey: '2024-01-02',
      days: ['2024-01-02'],
    });

    expect(day1).toHaveLength(1);
    expect(day2).toHaveLength(1);
    expect(day1[0].end).toBe(new Date(2024, 0, 2, 0, 0, 0).getTime());
    expect(day2[0].start).toBe(new Date(2024, 0, 2, 0, 0, 0).getTime());
    expect(day1[0].meta?.splitRefId).toBe('event-1');
    expect(day2[0].meta?.splitRefId).toBe('event-1');
  });
});

describe('computeSummaryMetrics with split events', () => {
  it('counts multi-day events once while summing durations accurately', () => {
    const start = new Date(2024, 0, 1, 23, 0, 0).getTime();
    const end = new Date(2024, 0, 2, 1, 0, 0).getTime();
    const events: Event[] = [
      {
        id: 'task-1',
        type: 'task',
        start,
        end,
      },
    ];

    const index = indexEventsByDate(events);
    const range = {
      start: new Date(2024, 0, 2),
      end: new Date(2024, 0, 2),
      startKey: '2024-01-02',
      endKey: '2024-01-02',
      days: ['2024-01-02'],
    };

    const current = collectEventsFromIndex(index, range);
    const metrics = computeSummaryMetrics(current, []);

    const taskItem = metrics.items.find(item => item.key === 'task');
    expect(taskItem).toBeDefined();
    expect(taskItem?.totalCount).toBe(1);
    expect(taskItem?.totalDuration).toBe(60 * 60 * 1000);
  });
});

describe('computeInterruptionStats with split events', () => {
  it('deduplicates counts for interruptions spanning multiple days', () => {
    const events: Event[] = [
      {
        id: 'interrupt-1',
        type: 'interrupt',
        start: new Date(2024, 0, 1, 23, 30, 0).getTime(),
        end: new Date(2024, 0, 2, 0, 30, 0).getTime(),
        who: '佐藤',
      },
    ];

    const index = indexEventsByDate(events);
    const range = {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 2),
      startKey: '2024-01-01',
      endKey: '2024-01-02',
      days: ['2024-01-01', '2024-01-02'],
    };

    const current = collectEventsFromIndex(index, range);
    const stats = computeInterruptionStats(current);

    expect(stats.totalCount).toBe(1);
    expect(stats.topContributors[0]?.count).toBe(1);
    expect(stats.topContributors[0]?.types[0]?.label).toBe('未記入');
    expect(stats.topTypes[0]?.label).toBe('未記入');
    expect(stats.totalDuration).toBe(60 * 60 * 1000);
  });
});
