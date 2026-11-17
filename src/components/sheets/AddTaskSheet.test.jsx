import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import { ERROR_CODES } from '../../domain/errors';
import AddTaskSheet from './AddTaskSheet';

afterEach(() => cleanup());

function actionsWith(result) {
  return {
    createTask: vi.fn(() => result),
    createTaskAndStart: vi.fn(() => result),
    saveTask: vi.fn(() => result),
    deleteTask: vi.fn(),
    createInterruptFollowupTask: vi.fn(() => result),
  };
}

describe('task detail sheet', () => {
  it('updates the quick-add draft and creates a task with details', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    const actions = actionsWith({ ok: true });
    const onClose = vi.fn();
    const onDraftChange = vi.fn();
    const onAfterSubmit = vi.fn();
    render(<AddTaskSheet state={state} actions={actions} onClose={onClose} onDraftChange={onDraftChange} onAfterSubmit={onAfterSubmit} draft={{ name: '', categoryId: 'cat-dev', plannedDurationMinutes: 0, dueAt: null, memo: '' }} />);

    await user.type(screen.getByRole('textbox', { name: 'タスク名' }), '設計を詰める');
    await user.click(screen.getByRole('button', { name: '30' }));
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '優先度を確認');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ name: '設計を詰める', plannedDurationMinutes: 30, memo: '優先度を確認' }));
    expect(onAfterSubmit).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenCalled();
  });

  it('saves, deletes, and reports an editing error without closing', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    const editing = {
      id: 'task-1', name: '既存タスク', memo: '', categoryId: 'cat-dev',
      planning: { plannedDurationMinutes: 15, dueAt: null },
    };
    const actions = actionsWith({ ok: false, errorCode: ERROR_CODES.CHECK_INPUT });
    const onClose = vi.fn();
    render(<AddTaskSheet state={state} actions={actions} onClose={onClose} editing={editing} />);

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('入力を確認してください')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('task-1');
  });

  it('creates a follow-up task and returns to the paused interruption', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.tasks = [{ id: 'task-1', name: '元のタスク', isCompleted: false, order: 0, categoryId: 'cat-dev', planning: {} }];
    state.running = { type: 'interrupt', preTaskId: 'task-1' };
    const actions = actionsWith({ ok: true });
    const onClose = vi.fn();
    const onBackToInterrupt = vi.fn();
    const interruptData = { label: '問い合わせ', who: '田中' };
    render(<AddTaskSheet state={state} actions={actions} onClose={onClose} followup interruptData={interruptData} onBackToInterrupt={onBackToInterrupt} draft={{ name: '確認する', categoryId: 'cat-dev', plannedDurationMinutes: 0, dueAt: null, memo: '' }} />);

    expect(screen.getByText('この割り込みから生まれたタスクとして記録します。作成後は戻り先のタスクを再開します。')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '作成して戻る' }));
    expect(actions.createInterruptFollowupTask).toHaveBeenCalledWith(interruptData, expect.objectContaining({ name: '確認する' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(onBackToInterrupt).toHaveBeenCalledTimes(1);
  });

  it('says the follow-up task starts when there is no task to return to', () => {
    const state = createEmptyState();
    state.running = { type: 'interrupt' };
    render(<AddTaskSheet state={state} actions={actionsWith({ ok: true })} onClose={vi.fn()} followup interruptData={{}} onBackToInterrupt={vi.fn()} />);

    expect(screen.getByText('この割り込みから生まれたタスクとして記録し、そのまま開始します。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '作成して開始' })).toBeTruthy();
  });
});
