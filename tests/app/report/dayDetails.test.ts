import { describe, expect, it } from 'vitest';
import { buildDailyInterruptionDetails, buildDailyTaskDetails } from '@/app/report/utils/dayDetails';
import type { Event, TaskLifecycleRecord } from '@/types';

describe('buildDailyTaskDetails', () => {
  const baseTimestamp = Date.now();
  const createEvent = (overrides: Partial<Event>): Event => ({
    id: `event-${Math.random()}`,
    type: 'task',
    start: baseTimestamp,
    end: baseTimestamp + 30 * 60 * 1000,
    ...overrides,
  });

  const ledger: Record<string, TaskLifecycleRecord> = {
    'task-1': {
      id: 'task-1',
      name: 'コードレビュー',
      createdAt: baseTimestamp,
    },
    'task-2': {
      id: 'task-2',
      name: '設計メモ',
      createdAt: baseTimestamp,
    },
  };

  it('aggregates task durations and sorts by focus time then session count', () => {
    const events: Event[] = [
      createEvent({ meta: { myTaskId: 'task-1' }, start: baseTimestamp, end: baseTimestamp + 60 * 60 * 1000 }),
      createEvent({ meta: { myTaskId: 'task-1' }, start: baseTimestamp + 70 * 60 * 1000, end: baseTimestamp + 100 * 60 * 1000 }),
      createEvent({ meta: { myTaskId: 'task-2' }, start: baseTimestamp, end: baseTimestamp + 60 * 60 * 1000 }),
      createEvent({ label: '資料読み' }),
    ];

    const details = buildDailyTaskDetails(events, ledger);

    expect(details).toHaveLength(3);
    expect(details[0]).toMatchObject({ id: 'task-1', name: 'コードレビュー', eventCount: 2 });
    expect(details[1]).toMatchObject({ id: 'task-2', name: '設計メモ', eventCount: 1 });
    expect(details[2]).toMatchObject({ id: 'label:資料読み', name: '資料読み', eventCount: 1 });
    expect(details[0].totalDurationMs).toBeGreaterThan(details[1].totalDurationMs);
  });

  it('falls back to a default label when no metadata is available', () => {
    const events: Event[] = [
      createEvent({ label: undefined }),
    ];

    const details = buildDailyTaskDetails(events, ledger);

    expect(details).toEqual([
      {
        id: 'label:未記入タスク',
        name: '未記入タスク',
        totalDurationMs: 30 * 60 * 1000,
        eventCount: 1,
      },
    ]);
  });
});

describe('buildDailyInterruptionDetails', () => {
  const baseTimestamp = Date.now();
  const createEvent = (overrides: Partial<Event>): Event => ({
    id: `event-${Math.random()}`,
    type: 'interrupt',
    start: baseTimestamp,
    end: baseTimestamp + 5 * 60 * 1000,
    ...overrides,
  });

  it('aggregates interruptions by sender and sorts by count then duration', () => {
    const events: Event[] = [
      createEvent({ who: '佐藤', end: baseTimestamp + 10 * 60 * 1000 }),
      createEvent({ who: '佐藤', end: baseTimestamp + 15 * 60 * 1000 }),
      createEvent({ who: '田中', end: baseTimestamp + 5 * 60 * 1000 }),
      createEvent({ who: ' ', end: baseTimestamp + 20 * 60 * 1000 }),
    ];

    const details = buildDailyInterruptionDetails(events);

    expect(details).toHaveLength(3);
    expect(details[0]).toMatchObject({ label: '佐藤', count: 2 });
    expect(details[1]).toMatchObject({ label: '未記入', count: 1 });
    expect(details[2]).toMatchObject({ label: '田中', count: 1 });
    expect(details[1].totalDurationMs).toBeGreaterThan(details[2].totalDurationMs);
  });
});
