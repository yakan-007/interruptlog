import { describe, expect, it, vi } from 'vitest';
import { buildBackup, createEmptyState } from '../state';
import { createAppActions } from './actions';

function task(id = 'task-1') {
  return {
    id,
    name: '仕様を確認する',
    memo: '',
    isCompleted: false,
    order: 0,
    categoryId: 'cat-dev',
    sourceTaskId: null,
    interruptOriginId: null,
    planning: { plannedDurationMinutes: 0, dueAt: null },
    createdAt: 1,
    completedAt: null,
  };
}

function createHarness(initial = createEmptyState(), overlapRepairPreview = null) {
  let tracked = initial;
  const mutate = vi.fn((recipe) => { tracked = recipe(tracked); });
  const setTrackedAppState = vi.fn((next) => { tracked = next; });
  const setLastError = vi.fn();
  const setOverlapRepairUi = vi.fn();
  const actions = createAppActions({
    currentState: initial,
    mutate,
    overlapRepairPreview,
    setTrackedAppState,
    setLastError,
    setOverlapRepairUi,
  });
  return { actions, mutate, setLastError, setOverlapRepairUi, setTrackedAppState, state: () => tracked };
}

describe('personal app commands', () => {
  it('creates, starts, stops, completes, and restores a task through the public commands', () => {
    const start = createHarness({ ...createEmptyState(), tasks: [task()] });
    start.actions.startTask('task-1');
    expect(start.state().running).toMatchObject({ type: 'task', taskId: 'task-1' });

    const stop = createHarness(start.state());
    stop.actions.stopTask();
    expect(stop.state().running).toBeNull();

    const complete = createHarness(stop.state());
    complete.actions.completeTask('task-1');
    expect(complete.state().tasks[0].isCompleted).toBe(true);

    const restore = createHarness(complete.state());
    restore.actions.restoreTask('task-1');
    expect(restore.state().tasks[0].isCompleted).toBe(false);
  });

  it('handles task and record commands that produce an action result', () => {
    const initial = { ...createEmptyState(), tasks: [task()] };
    const commands = createHarness(initial);

    expect(commands.actions.createTask({ name: '追加タスク', categoryId: 'cat-dev' })).toMatchObject({ ok: true, error: null });
    expect(commands.state().tasks).toHaveLength(2);
    expect(commands.actions.saveTask({ ...task(), name: '名前を更新' })).toMatchObject({ ok: true });
    expect(commands.state().tasks[0].name).toBe('名前を更新');
    expect(commands.actions.addMissedEvent({ type: 'interrupt', label: '電話', start: 1_000, end: 2_000 })).toMatchObject({ ok: true });
    expect(commands.state().events).toHaveLength(1);
  });

  it('records pause commands and keeps overlap repair state explicit', () => {
    const initial = { ...createEmptyState(), tasks: [task()], running: { type: 'task', taskId: 'task-1', start: 100, label: '仕様を確認する' } };
    const commands = createHarness(initial);

    commands.actions.beginInterrupt();
    expect(commands.state().running).toMatchObject({ type: 'interrupt', preTaskId: 'task-1' });
    commands.actions.setBreakTarget(15);
    commands.actions.cancelInterrupt();
    expect(commands.state().running).toMatchObject({ type: 'task', taskId: 'task-1' });

    expect(commands.actions.openOverlapRepair()).toEqual({ ok: false, error: null, preview: null });
    expect(commands.setOverlapRepairUi).toHaveBeenLastCalledWith({ sheetOpen: false, deferred: false });
    commands.actions.deferOverlapRepair();
    expect(commands.setOverlapRepairUi).toHaveBeenLastCalledWith({ sheetOpen: false, deferred: false });
  });

  it('updates personal preferences and resets only personal data', () => {
    const initial = {
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, onboardingDone: true },
      whoChips: ['田中'],
      tasks: [task()],
    };
    const commands = createHarness(initial);

    commands.actions.setDark(true);
    commands.actions.setLocale('en-US');
    commands.actions.setWorkSchedule({ start: '09:00', end: '17:00' });
    commands.actions.saveChips('who', ['田中', '佐藤']);
    expect(commands.state().preferences.dark).toBe(true);
    expect(commands.state().preferences.locale).toBe('en-US');
    expect(commands.state().whoChips).toEqual(['田中', '佐藤']);

    commands.actions.resetAll();
    expect(commands.state().tasks).toEqual([]);
    expect(commands.state().preferences.onboardingDone).toBe(true);
    expect(commands.setOverlapRepairUi).toHaveBeenLastCalledWith({ sheetOpen: false, deferred: false });
  });

  it('exports personal data, imports only valid v1 backups, and returns CSV text', () => {
    const state = { ...createEmptyState(), preferences: { ...createEmptyState().preferences, onboardingDone: true }, tasks: [task()] };
    const commands = createHarness(state);

    expect(JSON.parse(commands.actions.exportJson())).toMatchObject({ schemaVersion: 1 });
    expect(commands.actions.exportReportCsv('day')).toContain('reportDate,range,timezone');
    expect(commands.actions.exportAnalysisCsv('day')).toContain('sequenceIndex,durationMs,durationBucket');
    expect(commands.actions.importJson(JSON.stringify(buildBackup(state)))).toMatchObject({ ok: true, requiresRepair: false });
    expect(commands.actions.importJson('{bad json')).toMatchObject({ ok: false, error: 'JSONを読み込めませんでした' });
    expect(commands.setLastError).toHaveBeenLastCalledWith('JSONを読み込めませんでした');
  });
});
