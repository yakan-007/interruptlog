import { describe, expect, it, vi } from 'vitest';
import { buildBackup, createEmptyState } from '../state';
import { ERROR_CODES } from '../domain/errors';
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

function createHarness(
  initial = createEmptyState(),
  overlapRepairPreview = null,
  clock = { now: () => Date.now() },
  idGenerator
) {
  let tracked = initial;
  const mutate = vi.fn((recipe) => { tracked = recipe(tracked); });
  const setTrackedAppState = vi.fn((next) => { tracked = next; });
  const setOverlapRepairUi = vi.fn();
  const actions = createAppActions({
    currentState: initial,
    clock,
    idGenerator,
    mutate,
    overlapRepairPreview,
    setTrackedAppState,
    setOverlapRepairUi,
  });
  return { actions, mutate, setOverlapRepairUi, setTrackedAppState, state: () => tracked };
}

describe('personal app commands', () => {
  it('uses an injected clock for deterministic application operations', () => {
    const fixedNow = Date.parse('2026-07-14T09:30:00+09:00');
    const clock = { now: vi.fn(() => fixedNow) };
    const commands = createHarness(createEmptyState(), null, clock);

    commands.actions.createTask({ name: '固定時刻のタスク', categoryId: 'cat-dev' });
    const backup = JSON.parse(commands.actions.exportJson());

    expect(commands.state().tasks[0].createdAt).toBe(fixedNow);
    expect(backup.exportedAt).toBe(new Date(fixedNow).toISOString());
    expect(clock.now).toHaveBeenCalledTimes(2);
  });

  it('uses an injected ID generator for every ID created by one command', () => {
    const fixedNow = Date.parse('2026-07-14T09:30:00+09:00');
    const clock = { now: () => fixedNow };
    const idGenerator = { next: vi.fn((prefix) => `${prefix}-fixed`) };
    const commands = createHarness(createEmptyState(), null, clock, idGenerator);

    commands.actions.createTaskAndStart({ name: '再現可能なタスク', categoryId: 'cat-dev' });

    expect(commands.state().tasks[0].id).toBe('tn-fixed');
    expect(commands.state().events[0].id).toBe('ev-fixed');
    expect(idGenerator.next.mock.calls).toEqual([
      ['tn', fixedNow],
      ['ev', fixedNow],
    ]);
  });

  it('does not spend a persisted ID while previewing a task record', () => {
    const fixedNow = Date.parse('2026-07-14T09:30:00+09:00');
    const idGenerator = { next: vi.fn((prefix) => `${prefix}-saved`) };
    const commands = createHarness(
      { ...createEmptyState(), tasks: [task()] },
      null,
      { now: () => fixedNow },
      idGenerator
    );
    const record = {
      type: 'task',
      taskTarget: { mode: 'existing', taskId: 'task-1' },
      start: fixedNow - 60_000,
      end: fixedNow - 30_000,
    };

    const preview = commands.actions.previewTaskRecord(record);
    expect(preview.preview.candidate.id).toBe('__record-preview__');
    expect(idGenerator.next).not.toHaveBeenCalled();

    commands.actions.saveTaskRecord(record);
    expect(commands.state().events[0].id).toBe('ev-saved');
    expect(idGenerator.next).toHaveBeenCalledOnce();
  });

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

    expect(commands.actions.createTask({ name: '追加タスク', categoryId: 'cat-dev' })).toMatchObject({ ok: true, errorCode: null });
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

    expect(commands.actions.openOverlapRepair()).toEqual({ ok: false, errorCode: null, preview: null });
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
    commands.actions.markBackupExported(1234);
    expect(commands.state().preferences.lastBackupExportAt).toBe(1234);
    expect(commands.actions.exportReportCsv('day')).toContain('reportDate,range,timezone');
    expect(commands.actions.exportAnalysisCsv('day')).toContain('sequenceIndex,durationMs,durationBucket');
    expect(commands.actions.importJson(JSON.stringify(buildBackup(state)))).toMatchObject({ ok: true, requiresRepair: false });
    expect(commands.actions.importJson('{bad json')).toMatchObject({ ok: false, errorCode: ERROR_CODES.INVALID_BACKUP });
  });

  it('exports both CSV formats using the requested report timestamp', () => {
    const appNow = Date.parse('2026-07-14T15:00:00+09:00');
    const reportNow = Date.parse('2026-07-13T23:59:59.999+09:00');
    const state = {
      ...createEmptyState(),
      events: [{
        id: 'yesterday',
        type: 'task',
        label: '前日の作業',
        start: Date.parse('2026-07-13T10:00:00+09:00'),
        end: Date.parse('2026-07-13T11:00:00+09:00'),
      }],
    };
    const commands = createHarness(state, null, { now: () => appNow });

    const reportCsv = commands.actions.exportReportCsv('day', reportNow);
    const analysisCsv = commands.actions.exportAnalysisCsv('day', reportNow);

    expect(reportCsv).toContain('2026-07-13,day');
    expect(reportCsv).toContain('前日の作業');
    expect(analysisCsv).toContain('2026-07-13,day');
    expect(analysisCsv).toContain('前日の作業');
  });
});
