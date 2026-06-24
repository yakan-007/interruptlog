import { describe, expect, it } from 'vitest';
import {
  beginPauseInState,
  calcStats,
  createInterruptFollowupTaskInState,
  createEmptyState,
  createTaskAndStartInState,
  createTaskInState,
  moveTaskToIndexInState,
  reorderTaskInState,
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

describe('personal tasks', () => {
  it('calculates remaining committed estimate and overflow against today’s end time', () => {
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

    expect(atTen).toMatchObject({ commitmentCount: 1, estimateRemainingMs: 90 * 60000, remainingMs: 120 * 60000, overflowMs: 0 });
    expect(atLate).toMatchObject({ estimateRemainingMs: 90 * 60000, remainingMs: 30 * 60000, overflowMs: 60 * 60000 });
  });

  it('creates an interrupt-origin follow-up task and resumes the interrupted task', () => {
    const started = createTaskAndStartInState(createEmptyState(), {
      name: '元の作業', categoryId: 'cat-dev', plannedDurationMinutes: 30,
    }, at(11, 9));
    const paused = beginPauseInState(started.state, 'interrupt', at(11, 9, 10));
    const created = createInterruptFollowupTaskInState(paused, {
      label: '確認依頼', who: '田中', urgency: 'med', categoryId: 'int-chat', memo: '調査が必要',
    }, {
      name: '確認依頼を調査', categoryId: 'cat-dev', plannedDurationMinutes: 20, dueAt: at(11, 17), memo: '',
    }, at(11, 9, 20));
    const followup = created.state.tasks.find((task) => task.id === created.taskId);
    const interrupt = created.state.events.find((event) => event.type === 'interrupt');

    expect(created.error).toBeNull();
    expect(followup?.interruptOriginId).toBe(interrupt?.id);
    expect(interrupt).toMatchObject({ label: '確認依頼', who: '田中', start: at(11, 9, 10), end: at(11, 9, 20) });
    expect(created.state.running).toMatchObject({ type: 'task', taskId: started.taskId, start: at(11, 9, 20) });
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
