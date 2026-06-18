import { describe, expect, it } from 'vitest';
import {
  addMissedEventInState,
  addReportRowsToArchive,
  aggregateArchiveRows,
  aggregateTeamReportRows,
  applyTaskPackImport,
  applyResolutionPreviewInState,
  applyTeamArchiveImport,
  applyTeamSettingsImport,
  beginPauseInState,
  buildBackup,
  buildReportCsv,
  buildAmbientReplay,
  buildTaskPackExport,
  buildPublicPresence,
  buildTeamArchiveExport,
  buildTeamSettingsExport,
  calcStats,
  compareArchivePeriods,
  createEmptyState,
  createTaskAndStartInState,
  createTaskInState,
  deleteInterruptCategoryInState,
  deleteTaskInState,
  findOverlappingEvents,
  moveCategoryToIndexInState,
  moveChipToIndexInState,
  moveInterruptCategoryToIndexInState,
  moveTaskToIndexInState,
  normalizeState,
  parseBackup,
  parseReportCsvFiles,
  previewAddMissedEventInState,
  previewOverlapRepairInState,
  previewSaveEventInState,
  reorderTaskInState,
  restoreTaskAndStartInState,
  restoreTaskInState,
  cancelPauseInState,
  saveBreakInState,
  saveEventInState,
  saveInterruptCategoryInState,
  saveInterruptInState,
  saveTaskInState,
  selectCompletedTasks,
  selectHistoryDaySummary,
  setBreakTargetInState,
  startTaskInState,
  stopTaskInState,
  partitionCompletedTasks,
  selectActiveTasks,
  updateTeamWorkspaceInState,
} from './state';
import { getHistoryDayItems } from './lib/history';

const at = (day, hour, minute = 0, second = 0) =>
  new Date(2026, 4, day, hour, minute, second).getTime();

describe('state model', () => {
  it('keeps history view preference on valid values, normalizes invalid values, and drops autoStart', () => {
    const normalized = normalizeState({
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, historyView: 'list', autoStart: true, teamModeEnabled: true },
    });
    const fallback = parseBackup({
      schemaVersion: 2,
      state: {
        ...createEmptyState(),
        preferences: { ...createEmptyState().preferences, historyView: 'weird', autoStart: true },
      },
    });

    expect(normalized.version).toBe(2);
    expect(normalized.preferences.historyView).toBe('list');
    expect(normalized.preferences.onboardingDone).toBe(false);
    expect(normalized.preferences.teamModeEnabled).toBe(true);
    expect('autoStart' in normalized.preferences).toBe(false);
    expect(normalized.preferences.locale).toBe('ja-JP');
    expect(normalized.preferences.teamLightsEnabled).toBe(true);
    expect(fallback.preferences.historyView).toBe('timeline');
    expect(fallback.preferences.teamModeEnabled).toBe(false);
    expect('autoStart' in fallback.preferences).toBe(false);
  });

  it('normalizes locale and team operation defaults', () => {
    const state = normalizeState({
      ...createEmptyState(),
      preferences: { locale: 'en-US' },
      teamWorkspace: { focusWindow: { start: '09:30', end: '11:00' }, questionMode: 'open' },
    });

    expect(state.preferences.locale).toBe('en-US');
    expect(state.teamWorkspace.focusWindow).toEqual({ start: '09:30', end: '11:00' });
    expect(state.teamWorkspace.questionMode).toBe('open');
    expect(state.teamWorkspace.presence.anonymousMemberId).toBeTruthy();
  });

  it('marks legacy persisted data as already onboarded when imported or rehydrated', () => {
    const legacyState = {
      version: 2,
      tasks: [],
      events: [],
      categories: createEmptyState().categories,
      whoChips: [],
      subjectChips: [],
      preferences: {
        dark: false,
        accent: createEmptyState().preferences.accent,
        topAdd: true,
        sortDue: false,
        // Legacy key retained in the fixture to prove obsolete preferences are ignored safely.
        showTodayStrip: true,
        historyView: 'timeline',
      },
      running: null,
    };

    const rehydrated = normalizeState(legacyState, 0, { assumeOnboarded: true });
    const imported = parseBackup({ schemaVersion: 2, state: legacyState }, 0);

    expect(rehydrated.preferences.onboardingDone).toBe(true);
    expect(imported.preferences.onboardingDone).toBe(true);
  });

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

  it('clamps report stats to the selected range', () => {
    const stats = calcStats([
      { id: 'a', type: 'task', label: 'before overlap', start: 0, end: 10_000 },
      { id: 'b', type: 'task', label: 'after overlap', start: 12_000, end: 20_000 },
      { id: 'c', type: 'interrupt', label: 'outside', start: 0, end: 1000 },
    ], 5000, 15_000, 15_000);

    expect(stats.focus).toBe(8000);
    expect(stats.interrupt).toBe(0);
    expect(stats.events.map((event) => event.id)).toEqual(['a', 'b']);
  });

  it('closes the running task session when deleting the running task', () => {
    let state = createEmptyState();
    const saved = createTaskAndStartInState(state, { name: '消すタスク', categoryId: 'cat-dev', plannedDurationMinutes: 15 }, 2000);
    state = saved.state;
    state = deleteTaskInState(state, saved.taskId, 7000);

    expect(state.tasks).toHaveLength(0);
    expect(state.running).toBe(null);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].end).toBe(7000);
  });

  it('validates manual events and creates an unknown gap when requested', () => {
    const state = {
      ...createEmptyState(),
      events: [{ id: 'old', type: 'task', label: '前の作業', start: 1000, end: 2000 }],
    };

    const invalid = addMissedEventInState(state, { type: 'task', label: 'invalid', start: 3000, end: 2500 });
    expect(invalid.error).toBeTruthy();
    expect(invalid.state.events).toHaveLength(1);

    const valid = addMissedEventInState(state, { type: 'task', label: '後の作業', start: 5000, end: 6000 }, { createGap: true }, 7000);
    expect(valid.error).toBe(null);
    expect(valid.state.events.map((event) => event.type)).toEqual(['task', 'unknown', 'task']);
    expect(valid.state.events[1].start).toBe(2000);
    expect(valid.state.events[1].end).toBe(5000);
  });

  it('stores memos on manually added history events', () => {
    const result = addMissedEventInState(createEmptyState(), {
      type: 'interrupt',
      label: 'あとから相談を記録',
      who: '佐藤',
      urgency: 'med',
      categoryId: 'int-chat',
      memo: 'Slackで仕様確認。次回はまとめて聞く。',
      start: at(11, 10),
      end: at(11, 10, 12),
    });

    expect(result.error).toBe(null);
    expect(result.state.events[0]).toMatchObject({
      type: 'interrupt',
      label: 'あとから相談を記録',
      memo: 'Slackで仕様確認。次回はまとめて聞く。',
    });
  });

  it('previews and applies a split when a manual event interrupts an existing task', () => {
    const state = {
      ...createEmptyState(),
      events: [{ id: 'task-1', type: 'task', taskId: 't1', label: '見積API', start: 1000, end: 5000 }],
    };

    const result = previewAddMissedEventInState(state, { type: 'interrupt', label: '電話', start: 2000, end: 3000 }, {}, 9000);
    expect(result.error).toBe(null);
    expect(result.preview?.conflicts.map((event) => event.id)).toEqual(['task-1']);
    expect(result.preview?.changes.some((change) => change.sourceEventId === 'task-1' && change.action === 'split')).toBe(true);

    const applied = applyResolutionPreviewInState(state, result.preview);
    expect(applied.events.map((event) => event.type)).toEqual(['task', 'interrupt', 'task']);
    expect(applied.events[0].start).toBe(1000);
    expect(applied.events[0].end).toBe(2000);
    expect(applied.events[1].start).toBe(2000);
    expect(applied.events[1].end).toBe(3000);
    expect(applied.events[2].start).toBe(3000);
    expect(applied.events[2].end).toBe(5000);
    expect(findOverlappingEvents(applied.events)).toHaveLength(0);
  });

  it('trims and removes multiple events when a manual event spans across them', () => {
    const state = {
      ...createEmptyState(),
      events: [
        { id: 'a', type: 'task', label: '前半', start: 1000, end: 2000 },
        { id: 'b', type: 'interrupt', label: '相談', start: 2000, end: 3000 },
        { id: 'c', type: 'task', label: '後半', start: 3000, end: 4000 },
      ],
    };

    const result = previewAddMissedEventInState(state, { type: 'break', label: '外出', start: 1500, end: 3500 }, {}, 9000);
    expect(result.error).toBe(null);
    expect(result.preview?.changes.map((change) => change.action)).toEqual(expect.arrayContaining(['trim-end', 'remove', 'trim-start', 'insert']));

    const applied = applyResolutionPreviewInState(state, result.preview);
    expect(applied.events.map((event) => `${event.type}:${event.start}-${event.end}`)).toEqual([
      'task:1000-1500',
      'break:1500-3500',
      'task:3500-4000',
    ]);
    expect(findOverlappingEvents(applied.events)).toHaveLength(0);
  });

  it('merges only adjacent manual events whose non-time fields are identical', () => {
    const baseState = {
      ...createEmptyState(),
      events: [{ id: 'base', type: 'task', taskId: 't1', label: '仕様詰め', categoryId: 'cat-dev', start: 1000, end: 2000 }],
    };

    const merged = addMissedEventInState(baseState, {
      type: 'task',
      taskId: 't1',
      label: '仕様詰め',
      categoryId: 'cat-dev',
      start: 2000,
      end: 2600,
    }, {}, 9000);
    expect(merged.state.events).toHaveLength(1);
    expect(merged.state.events[0].start).toBe(1000);
    expect(merged.state.events[0].end).toBe(2600);

    const separated = addMissedEventInState(baseState, {
      type: 'task',
      taskId: 't1',
      label: '別ラベル',
      categoryId: 'cat-dev',
      start: 2000,
      end: 2600,
    }, {}, 9000);
    expect(separated.state.events).toHaveLength(2);
  });

  it('restores a completed task and can immediately resume tracking on the same task id', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 't1',
        name: 'アプリ開発',
        isCompleted: true,
        order: 0,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 15, dueAt: null },
        createdAt: 1000,
        completedAt: 5000,
      }],
      events: [{ id: 'e1', type: 'task', taskId: 't1', label: 'アプリ開発', categoryId: 'cat-dev', start: 1000, end: 4000 }],
      running: null,
    };

    const restored = restoreTaskInState(state, 't1');
    expect(restored.tasks[0].isCompleted).toBe(false);
    expect(restored.tasks[0].completedAt).toBe(null);

    const resumed = restoreTaskAndStartInState(state, 't1', 9000);
    expect(resumed.error).toBe(null);
    expect(resumed.state.tasks[0].isCompleted).toBe(false);
    expect(resumed.state.running?.taskId).toBe('t1');
    expect(resumed.state.events).toHaveLength(2);
    expect(resumed.state.events[1].taskId).toBe('t1');
    expect(resumed.state.events[1].start).toBe(9000);
    expect(resumed.state.events[1].end).toBe(null);
  });

  it('sorts completed tasks by completion time and splits today vs archived buckets', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'today', name: '今日', isCompleted: true, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: at(11, 13) },
        { id: 'old', name: '昔', isCompleted: true, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: at(8, 18) },
        { id: 'newer', name: 'さっき', isCompleted: true, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: at(11, 20) },
        { id: 'active', name: '未完了', isCompleted: false, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
    };

    const completed = selectCompletedTasks(state);
    expect(completed.map((task) => task.id)).toEqual(['newer', 'today', 'old']);

    const buckets = partitionCompletedTasks(completed, at(11, 22));
    expect(buckets.today.map((task) => task.id)).toEqual(['newer', 'today']);
    expect(buckets.archived.map((task) => task.id)).toEqual(['old']);
  });

  it('stores task memos and carries them into running task events', () => {
    let state = createTaskAndStartInState(createEmptyState(), {
      name: 'メモ付きタスク',
      categoryId: 'cat-dev',
      plannedDurationMinutes: 30,
      memo: '最初のメモ',
    }, 1000).state;

    expect(state.tasks[0].memo).toBe('最初のメモ');
    expect(state.events[0]).toMatchObject({ type: 'task', taskId: state.tasks[0].id, memo: '最初のメモ' });

    state = saveTaskInState(state, {
      id: state.tasks[0].id,
      name: 'メモ付きタスク',
      categoryId: 'cat-doc',
      plannedDurationMinutes: 45,
      memo: '更新したメモ',
    }, 2000).state;

    expect(state.tasks[0]).toMatchObject({ memo: '更新したメモ', categoryId: 'cat-doc' });
    expect(state.events[0]).toMatchObject({ memo: '更新したメモ', categoryId: 'cat-doc' });
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

  it('reorders active tasks and switches back to manual ordering', () => {
    const state = {
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, sortDue: true },
      tasks: [
        { id: 'a', name: 'A', isCompleted: false, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: 3000 }, createdAt: 0, completedAt: null },
        { id: 'b', name: 'B', isCompleted: false, order: 1, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: 1000 }, createdAt: 0, completedAt: null },
        { id: 'c', name: 'C', isCompleted: false, order: 2, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: 2000 }, createdAt: 0, completedAt: null },
        { id: 'done', name: 'Done', isCompleted: true, order: 99, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: 1 },
      ],
    };

    const moved = reorderTaskInState(state, 'b', 'down');

    expect(moved.preferences.sortDue).toBe(false);
    expect(selectActiveTasks(moved).map((task) => task.id)).toEqual(['a', 'c', 'b']);
    expect(moved.tasks.find((task) => task.id === 'done')?.order).toBe(99);
  });

  it('moves an active task to an insertion index', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'a', name: 'A', isCompleted: false, order: 0, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'b', name: 'B', isCompleted: false, order: 1, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'c', name: 'C', isCompleted: false, order: 2, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
    };

    const moved = moveTaskToIndexInState(state, 'a', 2);

    expect(selectActiveTasks(moved).map((task) => task.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves personal categories and chips without changing referenced ids', () => {
    const state = {
      ...createEmptyState(),
      tasks: [{
        id: 't1',
        name: 'カテゴリつき',
        isCompleted: false,
        order: 0,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 0, dueAt: null },
        createdAt: 0,
        completedAt: null,
      }],
      events: [{ id: 'e1', type: 'interrupt', label: '相談', categoryId: 'int-chat', who: '佐藤', start: 1000, end: 2000 }],
      whoChips: ['佐藤', '田中', '鈴木'],
      subjectChips: ['相談', '確認', '会議'],
    };

    const categoriesMoved = moveCategoryToIndexInState(state, 'cat-dev', 2);
    const interruptsMoved = moveInterruptCategoryToIndexInState(categoriesMoved, 'int-chat', 3);
    const whoMoved = moveChipToIndexInState(interruptsMoved, 'who', '佐藤', 2);
    const subjectMoved = moveChipToIndexInState(whoMoved, 'subject', '相談', 2);

    expect(categoriesMoved.categories.map((category) => category.id).slice(0, 3)).toEqual(['cat-doc', 'cat-mtg', 'cat-dev']);
    expect(interruptsMoved.interruptCats.map((category) => category.id)).toEqual(['int-call', 'int-q', 'int-other', 'int-chat']);
    expect(whoMoved.whoChips).toEqual(['田中', '鈴木', '佐藤']);
    expect(subjectMoved.subjectChips).toEqual(['確認', '会議', '相談']);
    expect(subjectMoved.tasks[0].categoryId).toBe('cat-dev');
    expect(subjectMoved.events[0].categoryId).toBe('int-chat');
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

  it('exports team-ready report CSV columns without dropping existing event fields', () => {
    const state = {
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, memberName: '佐藤' },
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

    expect(header).toEqual(['member', 'reportDate', 'range', 'timezone', 'start', 'end', 'type', 'label', 'category', 'categoryId', 'taskId', 'sourceTaskId', 'taskTemplateId', 'taxonomyVersion', 'who', 'urgency', 'memo', 'durationMinutes']);
    expect(row[0]).toBe('佐藤');
    expect(row[1]).toBe('2026-05-11');
    expect(row[2]).toBe('day');
    expect(row[3]).toBeTruthy();
    expect(row[6]).toBe('interrupt');
    expect(row[7]).toBe('仕様確認');
    expect(row[13]).toBeTruthy();
    expect(row.slice(14)).toEqual(['田中', 'med', '画面の確認', '30.0']);
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

    expect(row[7]).toBe(`"'=IMPORTXML(""https://example.com"")"`);
    expect(row[14]).toBe("'+田中");
    expect(row[16]).toBe("'@確認");
  });

  it('parses and aggregates multiple team report CSV files', () => {
    const first = [
      'member,reportDate,range,timezone,start,end,type,label,category,who,urgency,memo,durationMinutes',
      '佐藤,2026-05-11,day,Asia/Tokyo,2026-05-11T00:00:00.000Z,2026-05-11T01:00:00.000Z,task,開発,,,,,60',
      '佐藤,2026-05-11,day,Asia/Tokyo,2026-05-11T02:00:00.000Z,2026-05-11T02:15:00.000Z,interrupt,相談,,田中,,memo,15',
    ].join('\n');
    const second = [
      'member,reportDate,range,timezone,start,end,type,label,category,who,urgency,memo,durationMinutes',
      '鈴木,2026-05-11,day,Asia/Tokyo,2026-05-11T03:00:00.000Z,2026-05-11T03:30:00.000Z,break,休憩,,,,,30',
      '鈴木,2026-05-11,day,Asia/Tokyo,2026-05-11T04:00:00.000Z,2026-05-11T04:10:00.000Z,unknown,未分類,,,,,10',
    ].join('\n');

    const parsed = parseReportCsvFiles([
      { name: 'sato.csv', text: first },
      { name: 'suzuki.csv', text: second },
    ]);
    const summary = aggregateTeamReportRows(parsed.rows);

    expect(parsed.skipped).toBe(0);
    expect(summary.totals.task).toBe(60 * 60000);
    expect(summary.totals.interrupt).toBe(15 * 60000);
    expect(summary.totals.break).toBe(30 * 60000);
    expect(summary.totals.unknown).toBe(10 * 60000);
    expect(summary.members.map((member) => member.member).sort()).toEqual(['佐藤', '鈴木']);
    expect(summary.senders[0]).toMatchObject({ who: '田中', count: 1, time: 15 * 60000 });
  });

  it('builds anonymous ambient replay and public presence without task details', () => {
    const parsed = parseReportCsvFiles([{
      name: 'team.csv',
      text: [
        'member,reportDate,range,timezone,start,end,type,label,category,who,urgency,memo,durationMinutes',
        '佐藤,2026-05-11,day,Asia/Tokyo,2026-05-11T00:00:00.000Z,2026-05-11T01:00:00.000Z,task,秘密の作業,,,,,60',
        '鈴木,2026-05-11,day,Asia/Tokyo,2026-05-11T00:30:00.000Z,2026-05-11T00:45:00.000Z,interrupt,秘密の相談,,田中,,memo,15',
      ].join('\n'),
    }]);
    const replay = buildAmbientReplay(parsed.rows);
    const running = updateTeamWorkspaceInState({
      ...createEmptyState(),
      running: { type: 'task', taskId: 't1', start: at(11, 9), label: '秘密', preTaskId: null },
    }, { presence: { teamId: 'team-a' } });
    const presence = buildPublicPresence(running, at(11, 10));

    expect(replay.members).toHaveLength(2);
    expect(replay.members[0].label).toBe('Light 1');
    expect(JSON.stringify(replay)).not.toContain('秘密');
    expect(presence).toEqual(expect.objectContaining({
      teamId: 'team-a',
      status: 'focus',
    }));
    expect('label' in presence).toBe(false);
    expect('taskId' in presence).toBe(false);
  });

  it('reads legacy report CSV as unset member and skips invalid durations', () => {
    const legacy = [
      'start,end,type,label,category,who,urgency,memo,durationMinutes',
      '2026-05-11T00:00:00.000Z,2026-05-11T00:20:00.000Z,task,作業,,,,,20',
      '2026-05-11T01:00:00.000Z,2026-05-11T01:10:00.000Z,interrupt,相談,,田中,,memo,nope',
    ].join('\n');

    const parsed = parseReportCsvFiles([{ name: 'legacy.csv', text: legacy }]);
    const summary = aggregateTeamReportRows(parsed.rows);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.skipped).toBe(1);
    expect(parsed.rows[0].member).toBe('未設定');
    expect(summary.members[0]).toMatchObject({ member: '未設定', task: 20 * 60000 });
  });

  it('exports and imports team settings without replacing personal work', () => {
    const leader = {
      ...createEmptyState(),
      categories: [
        { id: 'cat-dev', name: '開発改善', color: 'oklch(0.5 0.1 220)' },
        { id: 'cat-ops', name: '運用', color: 'oklch(0.6 0.1 150)' },
      ],
      whoChips: ['田中'],
      subjectChips: ['週次確認'],
      teamWorkspace: { ...createEmptyState().teamWorkspace, taxonomyVersion: 'v2026.06' },
    };
    const recipient = {
      ...createEmptyState(),
      categories: [{ id: 'cat-dev', name: '開発', color: 'old' }],
      tasks: [{ id: 't1', name: '個人タスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 15, dueAt: null }, createdAt: 1, completedAt: null }],
      events: [{ id: 'e1', type: 'task', label: '個人タスク', start: 1, end: 2 }],
      whoChips: ['佐藤'],
    };

    const payload = buildTeamSettingsExport(leader, at(11, 9));
    const imported = applyTeamSettingsImport(recipient, JSON.stringify(payload));

    expect(imported.error).toBe(null);
    expect(imported.state.tasks).toHaveLength(1);
    expect(imported.state.events).toHaveLength(1);
    expect(imported.state.categories.find((category) => category.id === 'cat-dev')?.name).toBe('開発改善');
    expect(imported.state.categories.find((category) => category.id === 'cat-ops')?.name).toBe('運用');
    expect(imported.state.whoChips).toEqual(['佐藤', '田中']);
    expect(imported.state.subjectChips).toEqual(['週次確認']);
    expect(imported.state.teamWorkspace.taxonomyVersion).toBe('v2026.06');
  });

  it('imports task packs as local tasks and skips the same pack version on repeat import', () => {
    const leader = {
      ...createEmptyState(),
      teamWorkspace: { ...createEmptyState().teamWorkspace, taxonomyVersion: 'v2026.06' },
      tasks: [
        { id: 'personal-1', name: '個人タスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 10, dueAt: null }, createdAt: 1, completedAt: null },
      ],
      taskTemplates: [
        { id: 'tpl-leader-1', name: '月次レポート', categoryId: 'cat-dev', planning: { plannedDurationMinutes: 45, dueAt: null }, createdAt: 2 },
      ],
    };
    const pack = buildTaskPackExport(leader, at(11, 9));
    const first = applyTaskPackImport(createEmptyState(), JSON.stringify(pack), at(11, 10));
    const second = applyTaskPackImport(first.state, JSON.stringify(pack), at(11, 11));

    expect(first.error).toBe(null);
    expect(first.addedTasks).toBe(1);
    expect(pack.tasks).toHaveLength(1);
    expect(pack.tasks[0].name).toBe('月次レポート');
    expect(first.state.tasks[0]).toMatchObject({
      name: '月次レポート',
      sourceTaskId: 'tpl-leader-1',
      taskTemplateId: 'tpl-leader-1',
      packVersion: 'v2026.06',
    });
    expect(second.addedTasks).toBe(0);
    expect(second.skippedTasks).toBe(1);
    expect(second.state.tasks).toHaveLength(1);
  });

  it('archives report rows, aggregates by period, compares latest periods, and round-trips archive JSON', () => {
    const csv = [
      'member,reportDate,range,timezone,start,end,type,label,category,categoryId,taskId,sourceTaskId,taskTemplateId,taxonomyVersion,who,urgency,memo,durationMinutes',
      '佐藤,2026-05-11,day,Asia/Tokyo,2026-05-11T00:00:00.000Z,2026-05-11T01:00:00.000Z,task,開発,開発,cat-dev,t1,leader-1,tpl-1,v2026.06,,,,60',
      '佐藤,2026-06-11,day,Asia/Tokyo,2026-06-11T02:00:00.000Z,2026-06-11T02:20:00.000Z,interrupt,相談,運用,cat-ops,,,,v2026.06,田中,,,20',
    ].join('\n');
    const legacy = [
      'start,end,type,label,category,who,urgency,memo,durationMinutes',
      '2026-06-11T03:00:00.000Z,2026-06-11T03:30:00.000Z,task,旧CSV作業,開発,,,,30',
    ].join('\n');
    const parsed = parseReportCsvFiles([
      { name: 'new.csv', text: csv },
      { name: 'legacy.csv', text: legacy },
    ]);
    const archived = addReportRowsToArchive(createEmptyState(), parsed.rows, at(11, 12));
    const duplicate = addReportRowsToArchive(archived.state, parsed.rows, at(11, 13));
    const months = aggregateArchiveRows(archived.state.teamArchive.entries, 'month');
    const comparison = compareArchivePeriods(archived.state.teamArchive.entries, 'month');
    const exported = buildTeamArchiveExport(archived.state, at(11, 14));
    const imported = applyTeamArchiveImport(createEmptyState(), JSON.stringify(exported), at(11, 15));

    expect(archived.addedEntries).toBe(3);
    expect(duplicate.addedEntries).toBe(0);
    expect(months.map((month) => month.period)).toEqual(['2026-06', '2026-05']);
    expect(months[0].totals.task).toBe(30 * 60000);
    expect(months[0].totals.interrupt).toBe(20 * 60000);
    expect(months[0].members.map((member) => member.member).sort()).toEqual(['佐藤', '未設定']);
    expect(months[0].categories[0].name).toBeTruthy();
    expect(comparison.current.period).toBe('2026-06');
    expect(comparison.previous.period).toBe('2026-05');
    expect(imported.addedEntries).toBe(3);
  });

  it('rejects manual add/edit that overlap the current running session', () => {
    const state = {
      ...createEmptyState(),
      events: [{ id: 'running-task', type: 'task', taskId: 't1', label: '進行中', start: 5000, end: null }],
      running: { type: 'task', taskId: 't1', start: 5000, label: null, preTaskId: null },
    };

    const added = previewAddMissedEventInState(state, { type: 'interrupt', label: '差し込み', start: 5500, end: 6500 }, {}, 6000);
    const edited = previewSaveEventInState(state, { id: 'running-task', type: 'task', taskId: 't1', label: '進行中', start: 4500, end: 5500 }, 6000);

    expect(added.error).toBe('現在進行中の時間帯は、いったん停止してから編集してください');
    expect(edited.error).toBe('現在進行中の時間帯は、いったん停止してから編集してください');
  });

  it('uses localized default labels for manual events', () => {
    const result = previewAddMissedEventInState(createEmptyState(), {
      type: 'interrupt',
      label: '',
      start: 1000,
      end: 2000,
    }, {}, 9000);

    expect(result.error).toBe(null);
    expect(result.preview?.candidate.label).toBe('割り込み');
  });

  it('keeps task category changes when editing a history event', () => {
    const state = {
      ...createEmptyState(),
      events: [{ id: 'task-event', type: 'task', taskId: 't1', label: '作業', categoryId: 'cat-dev', memo: '古いメモ', start: 1000, end: 2000 }],
    };

    const result = saveEventInState(state, {
      id: 'task-event',
      type: 'task',
      taskId: 't1',
      label: '作業',
      categoryId: 'cat-doc',
      memo: '履歴から更新したメモ',
      start: 1000,
      end: 2000,
    });

    expect(result.error).toBe(null);
    expect(result.state.events[0]).toMatchObject({ type: 'task', categoryId: 'cat-doc', memo: '履歴から更新したメモ' });
  });

  it('does not create unknown records when cancelling a pause', () => {
    const state = beginPauseInState(createEmptyState(), 'interrupt', 1000);
    const result = cancelPauseInState(state, 7000);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: 'interrupt', label: 'キャンセルした割り込み', start: 1000, end: 7000 });
  });

  it('round-trips JSON backup payloads in v2 format', () => {
    const state = {
      ...createEmptyState(),
      events: [{ id: 'manual-note', type: 'task', label: 'バックアップ確認', memo: '復元後も残す', start: 1000, end: 2000 }],
    };
    const backup = buildBackup(state, 1234);
    const imported = parseBackup(JSON.stringify(backup), 5678);

    expect(backup.appName).toBe('InterruptLog');
    expect(backup.schemaVersion).toBe(2);
    expect(imported.version).toBe(2);
    expect(imported.categories.length).toBeGreaterThan(0);
    expect(imported.events[0]).toMatchObject({ id: 'manual-note', memo: '復元後も残す' });
  });

  it('supports the primary timer smoke flow', () => {
    let state = createEmptyState();
    const saved = createTaskAndStartInState(state, { name: '見積API', categoryId: 'cat-dev', plannedDurationMinutes: 30 }, 2000);
    state = saved.state;
    state = beginPauseInState(state, 'interrupt', 5000);
    state = saveInterruptInState(state, { who: '佐藤', label: '仕様確認', urgency: 'med', categoryId: 'int-chat', memo: '', resume: true }, 8000);
    state = stopTaskInState(state, false, 11_000);

    expect(state.running).toBe(null);
    expect(state.events).toHaveLength(3);
    expect(state.events.every((event) => event.end !== null)).toBe(true);
    expect(state.events.map((event) => event.type)).toEqual(['task', 'interrupt', 'task']);
    expect(state.whoChips).not.toContain('佐藤');
    const savedSenderState = saveInterruptInState(state, { who: '佐藤', saveWhoChip: true, label: '追加確認', urgency: 'med', categoryId: 'int-chat', memo: '', resume: false }, 12_000);
    expect(savedSenderState.whoChips).toContain('佐藤');
  });

  it('saves breaks without requiring a break type selection', () => {
    let state = createEmptyState();
    const saved = createTaskAndStartInState(state, { name: '外を見る', categoryId: 'cat-dev', plannedDurationMinutes: 25 }, 1000);
    state = beginPauseInState(saved.state, 'break', 3000);
    state = saveBreakInState(state, { breakDurationMinutes: 10, resume: true }, 5000);

    expect(state.events).toHaveLength(3);
    expect(state.events[1]).toMatchObject({
      type: 'break',
      label: '休憩',
      breakType: null,
      breakDurationMinutes: 10,
      start: 3000,
      end: 5000,
    });
    expect(state.events[2]).toMatchObject({
      type: 'task',
      taskId: saved.taskId,
      start: 5000,
      end: null,
    });
    expect(state.running?.type).toBe('task');
    expect(state.running?.taskId).toBe(saved.taskId);
  });

  it('updates the running break target in state', () => {
    const runningBreak = beginPauseInState(createEmptyState(), 'break', 4000);
    const updated = setBreakTargetInState(runningBreak, 15);

    expect(updated.running).toMatchObject({
      type: 'break',
      plannedBreakDurationMinutes: 15,
      start: 4000,
    });
  });

  it('switches from a pause timer to a task card without losing the pause event', () => {
    let state = createEmptyState();
    const first = createTaskInState(state, { name: '最初', categoryId: 'cat-dev', plannedDurationMinutes: 20 }, 1000);
    const second = createTaskInState(first.state, { name: '戻り先', categoryId: 'cat-doc', plannedDurationMinutes: 30 }, 1200);
    state = beginPauseInState(second.state, 'interrupt', 3000);
    state = startTaskInState(state, second.taskId, 4500);

    expect(state.events).toHaveLength(2);
    expect(state.events[0]).toMatchObject({
      type: 'interrupt',
      label: '未記録の割り込み',
      start: 3000,
      end: 4500,
    });
    expect(state.events[1]).toMatchObject({
      type: 'task',
      taskId: second.taskId,
      start: 4500,
      end: null,
    });
    expect(state.running).toMatchObject({ type: 'task', taskId: second.taskId });
  });

  it('creates a task without auto-starting', () => {
    const state = createEmptyState();
    const result = createTaskInState(state, { name: 'あとでやる', categoryId: 'cat-dev', plannedDurationMinutes: 30 }, 1000);

    expect(result.error).toBe(null);
    expect(result.state.tasks).toHaveLength(1);
    expect(result.state.running).toBe(null);
    expect(result.state.events).toHaveLength(0);
  });

  it('creates and starts a task explicitly', () => {
    const state = createEmptyState();
    const result = createTaskAndStartInState(state, { name: '今やる', categoryId: 'cat-dev', plannedDurationMinutes: 45 }, 3000);

    expect(result.error).toBe(null);
    expect(result.state.tasks).toHaveLength(1);
    expect(result.state.running?.type).toBe('task');
    expect(result.state.running?.taskId).toBe(result.taskId);
    expect(result.state.events).toHaveLength(1);
    expect(result.state.events[0].start).toBe(3000);
    expect(result.state.events[0].end).toBe(null);
  });

  it('rejects empty task names without mutating state', () => {
    const state = createEmptyState();
    const created = createTaskInState(state, { name: '   ', categoryId: 'cat-dev', plannedDurationMinutes: 30 }, 1000);
    const edited = saveTaskInState({
      ...state,
      tasks: [{ id: 't1', name: '既存タスク', categoryId: 'cat-dev', planning: { plannedDurationMinutes: 15, dueAt: null } }],
    }, { id: 't1', name: '   ', categoryId: 'cat-doc', plannedDurationMinutes: 30 }, 2000);

    expect(created.error).toBeTruthy();
    expect(created.state).toBe(state);
    expect(edited.error).toBeTruthy();
    expect(edited.state.tasks[0].name).toBe('既存タスク');
  });

  it('switches from the current running task when creating and starting a new one', () => {
    let state = createTaskAndStartInState(createEmptyState(), { name: '元の作業', categoryId: 'cat-dev', plannedDurationMinutes: 20 }, 1000).state;
    const result = createTaskAndStartInState(state, { name: '次の作業', categoryId: 'cat-doc', plannedDurationMinutes: 40 }, 5000);

    expect(result.error).toBe(null);
    expect(result.state.tasks).toHaveLength(2);
    expect(result.state.events).toHaveLength(2);
    expect(result.state.events[0].label).toBe('元の作業');
    expect(result.state.events[0].end).toBe(5000);
    expect(result.state.events[1].label).toBe('次の作業');
    expect(result.state.events[1].start).toBe(5000);
    expect(result.state.running?.taskId).toBe(result.taskId);
  });

  it('blocks create-and-start while an interrupt or break is active', () => {
    const state = {
      ...createEmptyState(),
      running: { type: 'interrupt', taskId: null, start: 4000, label: '割り込み中', preTaskId: 't1' },
    };
    const result = createTaskAndStartInState(state, { name: 'あとで切り替えたい', categoryId: 'cat-dev', plannedDurationMinutes: 10 }, 5000);

    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
    expect(result.state.tasks).toHaveLength(0);
  });
});
