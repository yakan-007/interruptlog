import { describe, expect, it } from 'vitest';
import {
  addMissedEventInState,
  applyResolutionPreviewInState,
  beginPauseInState,
  createEmptyState,
  createTaskAndStartInState,
  createTaskInState,
  deleteTaskInState,
  findOverlappingEvents,
  previewAddMissedEventInState,
  previewTaskRecordInState,
  previewReplaceTimeRangeInState,
  previewSaveEventInState,
  cancelPauseInState,
  saveBreakInState,
  saveEventInState,
  saveTaskRecordInState,
  replaceTimeRangeInState,
  saveInterruptInState,
  setBreakTargetInState,
  startTaskInState,
  stopTaskInState,
} from './index';
import { at } from '../test/factories';

describe('personal records and resolution', () => {
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

  it('moves a work record to an existing task without changing the task name', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'task-a', name: '元のタスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'task-b', name: '実際にした作業', isCompleted: false, order: 1, categoryId: 'cat-doc', interruptOriginId: 'origin-event', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
      events: [{ id: 'work', type: 'task', taskId: 'task-a', label: '元のタスク', categoryId: 'cat-dev', start: at(11, 9), end: at(11, 10) }],
    };

    const saved = saveTaskRecordInState(state, {
      id: 'work',
      type: 'task',
      start: at(11, 9),
      end: at(11, 10),
      workDetail: '構成を検討',
      taskTarget: { mode: 'existing', taskId: 'task-b' },
    });

    expect(saved.error).toBeNull();
    expect(saved.state.tasks.map((task) => task.name)).toEqual(['元のタスク', '実際にした作業']);
    expect(saved.state.events).toEqual([expect.objectContaining({
      id: 'work', taskId: 'task-b', label: '実際にした作業', categoryId: 'cat-doc', interruptOriginId: 'origin-event', workDetail: '構成を検討',
    })]);
  });

  it('previews before-and-after changes when a corrected record expands across another record', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'original', name: '元のタスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'actual', name: '実際のタスク', isCompleted: false, order: 1, categoryId: 'cat-doc', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
      events: [
        { id: 'work', type: 'task', taskId: 'original', label: '元のタスク', categoryId: 'cat-dev', start: at(11, 9), end: at(11, 10) },
        { id: 'call', type: 'interrupt', label: '電話', categoryId: 'int-call', start: at(11, 10), end: at(11, 10, 20) },
      ],
    };
    const record = {
      id: 'work',
      type: 'task',
      start: at(11, 9),
      end: at(11, 10, 20),
      taskTarget: { mode: 'existing', taskId: 'actual' },
    };
    const preview = previewTaskRecordInState(state, record);

    expect(preview.error).toBeNull();
    expect(preview.preview.conflicts).toEqual([expect.objectContaining({ id: 'call' })]);
    expect(preview.preview.changes).toEqual(expect.arrayContaining([expect.objectContaining({
      sourceEventId: 'call',
      before: expect.objectContaining({ label: '電話' }),
      after: null,
    })]));

    const saved = saveTaskRecordInState(state, record);
    expect(saved.state.events).toEqual([expect.objectContaining({ id: 'work', taskId: 'actual', start: at(11, 9), end: at(11, 10, 20) })]);
  });

  it('creates a completed task from an unassigned historical work record', () => {
    const saved = saveTaskRecordInState(createEmptyState(), {
      type: 'task',
      start: at(11, 13),
      end: at(11, 14),
      workDetail: '請求書を確認',
      taskTarget: { mode: 'new', name: '請求書の確認', categoryId: 'cat-adm', complete: true },
    });

    expect(saved.error).toBeNull();
    expect(saved.taskId).toBeTruthy();
    expect(saved.state.tasks).toEqual([expect.objectContaining({
      id: saved.taskId, name: '請求書の確認', categoryId: 'cat-adm', isCompleted: true, completedAt: at(11, 14),
    })]);
    expect(saved.state.events).toEqual([expect.objectContaining({
      type: 'task', taskId: saved.taskId, label: '請求書の確認', interruptOriginId: null, workDetail: '請求書を確認',
    })]);
  });

  it('re-records one same-day range over tasks, an interruption, and a break', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'old', name: '別タスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'actual', name: '資料作成', isCompleted: false, order: 1, categoryId: 'cat-doc', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
      events: [
        { id: 'a', type: 'task', taskId: 'old', label: '別タスク', categoryId: 'cat-dev', start: at(11, 9), end: at(11, 9, 20) },
        { id: 'b', type: 'interrupt', label: '電話', categoryId: 'int-call', start: at(11, 9, 20), end: at(11, 9, 40) },
        { id: 'c', type: 'break', label: '休憩', start: at(11, 9, 40), end: at(11, 9, 50) },
        { id: 'd', type: 'task', taskId: 'old', label: '別タスク', categoryId: 'cat-dev', start: at(11, 9, 50), end: at(11, 10) },
      ],
    };
    const record = {
      type: 'task',
      start: at(11, 9),
      end: at(11, 10),
      workDetail: '構成をまとめる',
      taskTarget: { mode: 'existing', taskId: 'actual' },
    };
    const preview = previewReplaceTimeRangeInState(state, record);
    const replaced = replaceTimeRangeInState(state, record);

    expect(preview.error).toBeNull();
    expect(preview.impact).toMatchObject({ unrecordedMs: 0 });
    expect(preview.impact.items.map((item) => item.type)).toEqual(['task', 'interrupt', 'break', 'task']);
    expect(replaced.error).toBeNull();
    expect(replaced.state.events).toEqual([expect.objectContaining({
      type: 'task', taskId: 'actual', label: '資料作成', workDetail: '構成をまとめる', start: at(11, 9), end: at(11, 10),
    })]);
    expect(findOverlappingEvents(replaced.state.events)).toHaveLength(0);
  });

  it('splits the edge records when re-recording only the middle of a time range', () => {
    const state = {
      ...createEmptyState(),
      tasks: [
        { id: 'a', name: 'A', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
        { id: 'b', name: 'B', isCompleted: false, order: 1, categoryId: 'cat-doc', planning: { plannedDurationMinutes: 0, dueAt: null }, createdAt: 0, completedAt: null },
      ],
      events: [{ id: 'a-work', type: 'task', taskId: 'a', label: 'A', categoryId: 'cat-dev', start: at(11, 9), end: at(11, 10) }],
    };

    const replaced = replaceTimeRangeInState(state, {
      type: 'task', start: at(11, 9, 20), end: at(11, 9, 40), taskTarget: { mode: 'existing', taskId: 'b' },
    });

    expect(replaced.error).toBeNull();
    expect(replaced.state.events.map((event) => `${event.taskId}:${event.start}-${event.end}`)).toEqual([
      `a:${at(11, 9)}-${at(11, 9, 20)}`,
      `b:${at(11, 9, 20)}-${at(11, 9, 40)}`,
      `a:${at(11, 9, 40)}-${at(11, 10)}`,
    ]);
  });

  it('does not allow a range replacement across calendar days', () => {
    const result = previewReplaceTimeRangeInState(createEmptyState(), {
      type: 'task',
      start: at(11, 23, 30),
      end: at(12, 0, 30),
      taskTarget: { mode: 'none', categoryId: 'cat-dev' },
    });

    expect(result.preview).toBeNull();
    expect(result.error).toContain('同じ日');
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
    expect(result.preview?.candidate.label).toBe('割り込み作業');
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

  it('discards a cancelled pause and resumes the previous task without creating an event', () => {
    const created = createTaskAndStartInState(createEmptyState(), { name: '再開する作業', categoryId: 'cat-dev' }, 500);
    const state = beginPauseInState(created.state, 'interrupt', 1000);
    const result = cancelPauseInState(state, 7000);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({ type: 'task', start: 500, end: 1000 });
    expect(result.events[1]).toMatchObject({ type: 'task', start: 7000, end: null });
    expect(result.running).toMatchObject({ type: 'task', taskId: created.taskId, start: 7000 });
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
});
