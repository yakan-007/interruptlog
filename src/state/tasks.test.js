import { describe, expect, it } from 'vitest';
import {
  calcStats,
  createEmptyState,
  createTaskAndStartInState,
  createTaskInState,
  moveTaskToIndexInState,
  restoreTaskAndStartInState,
  restoreTaskInState,
  saveTaskInState,
  selectCompletedTasks,
  selectWorkdayStatus,
  setWorkScheduleInState,
  partitionCompletedTasks,
  selectActiveTasks,
} from './index';
import { at } from '../test/factories';
import { ERROR_CODES } from '../domain/errors';

describe('personal tasks', () => {
  it('reports the time left until today’s end', () => {
    const state = {
      ...setWorkScheduleInState(createEmptyState(), { start: '09:00', end: '12:00' }),
      tasks: [{
        id: 'commitment',
        name: '定時までの作業',
        isCompleted: false,
        categoryId: 'cat-dev',
        planning: { plannedDurationMinutes: 120, dueAt: at(11, 12) },
      }],
      events: [{ id: 'done', type: 'task', taskId: 'commitment', start: at(11, 9), end: at(11, 9, 30) }],
    };

    const atTen = selectWorkdayStatus(state, at(11, 10));
    const atLate = selectWorkdayStatus(state, at(11, 11, 30));

    expect(atTen).toMatchObject({ remainingMs: 120 * 60000, afterEnd: false });
    expect(atLate).toMatchObject({ remainingMs: 30 * 60000, afterEnd: false });
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
    expect(resumed.errorCode).toBe(null);
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
    state.events.unshift({
      id: 'previous-session', type: 'task', taskId: state.tasks[0].id, label: '以前のタスク名',
      categoryId: 'cat-dev', memo: '以前のメモ', start: 500, end: 900,
    });

    state = saveTaskInState(state, {
      id: state.tasks[0].id,
      name: '更新後のタスク名',
      categoryId: 'cat-doc',
      plannedDurationMinutes: 45,
      memo: '更新したメモ',
    }, 2000).state;

    expect(state.tasks[0]).toMatchObject({ memo: '更新したメモ', categoryId: 'cat-doc' });
    expect(state.events[0]).toMatchObject({ label: '更新後のタスク名', categoryId: 'cat-doc', memo: '更新したメモ' });
    expect(state.events[1]).toMatchObject({ label: '更新後のタスク名', memo: '更新したメモ', categoryId: 'cat-doc' });
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

  it('moves within the due-sorted list as shown and keeps that order once sorting is off', () => {
    const task = (id, order, dueAt) => ({ id, name: id, isCompleted: false, order, categoryId: null, planning: { plannedDurationMinutes: 0, dueAt }, createdAt: 0, completedAt: null });
    const state = {
      ...createEmptyState(),
      preferences: { ...createEmptyState().preferences, taskOrder: 'due' },
      tasks: [task('a', 0, 3000), task('b', 1, 1000), task('c', 2, 2000)],
    };

    expect(selectActiveTasks(state).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    const moved = moveTaskToIndexInState(state, 'a', 0);

    expect(moved.preferences.taskOrder).toBe('top');
    expect(selectActiveTasks(moved).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('creates a task without auto-starting', () => {
    const state = createEmptyState();
    const result = createTaskInState(state, { name: 'あとでやる', categoryId: 'cat-dev', plannedDurationMinutes: 30 }, 1000);

    expect(result.errorCode).toBe(null);
    expect(result.state.tasks).toHaveLength(1);
    expect(result.state.running).toBe(null);
    expect(result.state.events).toHaveLength(0);
  });

  it('creates and starts a task explicitly', () => {
    const state = createEmptyState();
    const result = createTaskAndStartInState(state, { name: '今やる', categoryId: 'cat-dev', plannedDurationMinutes: 45 }, 3000);

    expect(result.errorCode).toBe(null);
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

    expect(created.errorCode).toBe(ERROR_CODES.TASK_NAME_REQUIRED);
    expect(created.state).toBe(state);
    expect(edited.errorCode).toBe(ERROR_CODES.TASK_NAME_REQUIRED);
    expect(edited.state.tasks[0].name).toBe('既存タスク');
  });

  it('switches from the current running task when creating and starting a new one', () => {
    let state = createTaskAndStartInState(createEmptyState(), { name: '元の作業', categoryId: 'cat-dev', plannedDurationMinutes: 20 }, 1000).state;
    const result = createTaskAndStartInState(state, { name: '次の作業', categoryId: 'cat-doc', plannedDurationMinutes: 40 }, 5000);

    expect(result.errorCode).toBe(null);
    expect(result.state.tasks).toHaveLength(2);
    expect(result.state.events).toHaveLength(2);
    expect(result.state.events[0].label).toBe('元の作業');
    expect(result.state.events[0].end).toBe(5000);
    expect(result.state.events[1].label).toBe('次の作業');
    expect(result.state.events[1].start).toBe(5000);
    expect(result.state.running?.taskId).toBe(result.taskId);
  });

  it('ends the running pause and starts the new task on create-and-start', () => {
    const state = {
      ...createEmptyState(),
      running: { type: 'interrupt', taskId: null, start: 4000, label: '割り込み中', draft: { label: '電話の件' } },
    };
    const result = createTaskAndStartInState(state, { name: 'すぐ切り替える', categoryId: 'cat-dev', plannedDurationMinutes: 10 }, 5000);

    expect(result.errorCode).toBe(null);
    expect(result.state.events.map((event) => [event.type, event.label, event.start, event.end])).toEqual([
      ['interrupt', '電話の件', 4000, 5000],
      ['task', 'すぐ切り替える', 5000, null],
    ]);
    expect(result.state.running).toMatchObject({ type: 'task', taskId: result.taskId });
  });
});
