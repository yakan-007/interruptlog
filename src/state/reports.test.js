import { describe, expect, it } from 'vitest';
import {
  addMissedEventInState,
  applyResolutionPreviewInState,
  buildAnalysisCsv,
  buildReportCsv,
  calcStats,
  createEmptyState,
  deleteInterruptCategoryInState,
  findOverlappingEvents,
  normalizeState,
  previewOverlapRepairInState,
  saveInterruptCategoryInState,
  selectHistoryDaySummary,
} from './index';
import { getHistoryDayItems } from '../lib/history';
import { at } from '../test/factories';

describe('personal reports', () => {
  it('normalizes, saves, and deletes editable interrupt categories', () => {
    const legacy = normalizeState({
      ...createEmptyState(),
      interruptCats: undefined,
    });
    const saved = saveInterruptCategoryInState(legacy, { name: '来客', icon: null }, 1000);
    const customId = saved.interruptCats.find((category) => category.name === '来客')?.id;
    const renamed = saveInterruptCategoryInState(saved, { id: customId, name: '来客対応', icon: 'bolt' }, 2000);
    const withEvent = {
      ...renamed,
      events: [{ id: 'e1', type: 'interrupt', label: '受付', categoryId: customId, start: 1, end: 2 }],
    };
    const deleted = deleteInterruptCategoryInState(withEvent, customId);

    expect(legacy.interruptCats.map((category) => category.id)).toEqual(['int-call', 'int-chat', 'int-q', 'int-other']);
    expect(customId).toBeTruthy();
    expect(saved.interruptCats.find((category) => category.id === customId)).toMatchObject({ name: '来客', icon: null });
    expect(renamed.interruptCats.find((category) => category.id === customId)).toMatchObject({ name: '来客対応', icon: 'bolt' });
    expect(deleted.interruptCats.some((category) => category.id === customId)).toBe(false);
    expect(deleted.events[0].categoryId).toBe(null);
  });

  it('falls back to task memo when exporting task events without an event memo', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 'task-with-memo',
        name: 'CSVタスク',
        memo: 'CSVへ出したいメモ',
        isCompleted: false,
        order: 0,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 0, dueAt: null },
        createdAt: 0,
        completedAt: null,
      }],
      events: [{ id: 'event-without-memo', type: 'task', taskId: 'task-with-memo', label: 'CSVタスク', categoryId: 'cat-dev', start: at(11, 10), end: at(11, 11) }],
    };

    expect(buildReportCsv(state, 'day', at(11, 12))).toContain('CSVへ出したいメモ');
  });

  it('creates unknown gaps only for actual empty time after normalization', () => {
    const overlappingState = {
      ...createEmptyState(),
      events: [{ id: 'old', type: 'task', label: '作業', start: 1000, end: 3000 }],
    };
    const overlapping = addMissedEventInState(overlappingState, {
      type: 'interrupt',
      label: '相談',
      start: 2000,
      end: 4000,
    }, { createGap: true }, 9000);
    expect(overlapping.state.events.some((event) => event.type === 'unknown')).toBe(false);

    const gapState = {
      ...createEmptyState(),
      events: [{ id: 'old', type: 'task', label: '前', start: 1000, end: 1500 }],
    };
    const gap = addMissedEventInState(gapState, {
      type: 'interrupt',
      label: 'あとから',
      start: 2000,
      end: 2600,
    }, { createGap: true }, 9000);
    expect(gap.state.events.map((event) => event.type)).toEqual(['task', 'unknown', 'interrupt']);
    expect(gap.state.events[1].start).toBe(1500);
    expect(gap.state.events[1].end).toBe(2000);
  });

  it('repairs existing overlaps and keeps totals single-counted afterward', () => {
    const state = {
      ...createEmptyState(),
      events: [
        { id: 'task', type: 'task', taskId: 't1', label: '打ち合わせ', start: at(11, 21, 57, 48), end: at(11, 21, 58, 47) },
        { id: 'interrupt', type: 'interrupt', label: 'interrupt', start: at(11, 21, 58, 0), end: at(11, 21, 59, 0) },
      ],
    };

    const preview = previewOverlapRepairInState(state, at(11, 22));
    expect(preview?.conflicts.map((event) => event.id).sort()).toEqual(['interrupt', 'task']);

    const repaired = applyResolutionPreviewInState(state, preview);
    const items = getHistoryDayItems(repaired.events, at(11, 0), at(11, 22));
    const summary = selectHistoryDaySummary(items);
    const stats = calcStats(repaired.events, at(11, 0), at(12, 0), at(11, 22));
    const csv = buildReportCsv(repaired, 'day', at(11, 22));

    expect(findOverlappingEvents(repaired.events)).toHaveLength(0);
    expect(summary.totalMs).toBe(items.reduce((sum, item) => sum + item.clippedDurationMs, 0));
    expect(stats.focus + stats.interrupt + stats.break + stats.unknown).toBe(
      stats.events.reduce((sum, event) => sum + event.durationMs, 0)
    );
    expect(csv.split('\n')).toHaveLength(repaired.events.length + 1);
  });

  it('exports personal report CSV columns without dropping personal event fields', () => {
    const state = {
      ...createEmptyState(),
      preferences: {
        ...createEmptyState().preferences,
        reportProfile: { affiliation: '開発部', name: '山田 太郎' },
      },
      events: [{
        id: 'int-1',
        type: 'interrupt',
        label: '仕様確認',
        who: '田中',
        urgency: 'med',
        memo: '画面の確認',
        start: at(11, 10),
        end: at(11, 10, 30),
      }],
    };

    const csv = buildReportCsv(state, 'day', at(11, 18));
    const [header, row] = csv.split('\n').map((line) => line.split(','));

    expect(header).toEqual(['reportDate', 'range', 'timezone', 'affiliation', 'memberName', 'start', 'end', 'type', 'label', 'category', 'categoryId', 'taskId', 'sourceTaskId', 'interruptOriginId', 'who', 'urgency', 'memo', 'durationMinutes']);
    expect(row[0]).toBe('2026-05-11');
    expect(row[1]).toBe('day');
    expect(row[2]).toBeTruthy();
    expect(row.slice(3, 5)).toEqual(['開発部', '山田 太郎']);
    expect(row[7]).toBe('interrupt');
    expect(row[8]).toBe('仕様確認');
    expect(row.slice(14)).toEqual(['田中', 'med', '画面の確認', '30.0']);
  });

  it('exports analysis CSV with derived sequence and short-event fields', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 'task-1',
        name: '設計',
        memo: '',
        isCompleted: false,
        order: 0,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 0, dueAt: null },
        createdAt: at(11, 9),
        completedAt: null,
      }],
      events: [
        { id: 'task-a', type: 'task', taskId: 'task-1', label: '設計', start: at(11, 10), end: at(11, 10, 5) },
        { id: 'int-return', type: 'interrupt', label: '確認', start: at(11, 10, 5), end: at(11, 10, 5, 20) },
        { id: 'task-b', type: 'task', taskId: 'task-1', label: '設計', start: at(11, 10, 5, 20), end: at(11, 10, 6) },
        { id: 'int-chain-a', type: 'interrupt', label: '電話', start: at(11, 10, 6), end: at(11, 10, 6, 10) },
        { id: 'int-chain-b', type: 'interrupt', label: 'チャット', start: at(11, 10, 6, 20), end: at(11, 10, 6, 40) },
      ],
    };

    const table = buildAnalysisCsv(state, 'day', at(11, 11))
      .split('\n')
      .map((line) => line.split(','));
    const header = table[0];
    const rows = table.slice(1);
    const column = (name) => header.indexOf(name);
    const rowByLabel = (label) => rows.find((row) => row[column('label')] === label);
    const returned = rowByLabel('確認');
    const chained = rowByLabel('電話');

    expect(header.slice(-10)).toEqual([
      'sequenceIndex',
      'durationMs',
      'durationBucket',
      'isMicroEvent',
      'previousEventType',
      'nextEventType',
      'gapFromPreviousMs',
      'gapToNextMs',
      'returnedToTask',
      'isFollowedByInterrupt',
    ]);
    expect(returned[column('sequenceIndex')]).toBe('2');
    expect(returned[column('durationMs')]).toBe('20000');
    expect(returned[column('durationBucket')]).toBe('10-30s');
    expect(returned[column('isMicroEvent')]).toBe('true');
    expect(returned[column('previousEventType')]).toBe('task');
    expect(returned[column('nextEventType')]).toBe('task');
    expect(returned[column('returnedToTask')]).toBe('true');
    expect(chained[column('nextEventType')]).toBe('interrupt');
    expect(chained[column('gapToNextMs')]).toBe('10000');
    expect(chained[column('isFollowedByInterrupt')]).toBe('true');
  });

  it('protects CSV cells that could be interpreted as spreadsheet formulas', () => {
    const state = {
      ...createEmptyState(),
      events: [{
        id: 'int-1',
        type: 'interrupt',
        label: '=IMPORTXML("https://example.com")',
        who: '+田中',
        urgency: 'med',
        memo: '@確認',
        start: at(11, 10),
        end: at(11, 10, 30),
      }],
    };

    const csv = buildReportCsv(state, 'day', at(11, 18));
    const row = csv.split('\n')[1].split(',');

    expect(row[8]).toBe(`"'=IMPORTXML(""https://example.com"")"`);
    expect(row[14]).toBe("'+田中");
    expect(row[16]).toBe("'@確認");
  });
});
