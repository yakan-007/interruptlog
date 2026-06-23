import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../state';
import RunningBar from './RunningBar';

afterEach(() => cleanup());

function stateForRunning(running) {
  const state = createEmptyState();
  state.running = running;
  state.runningTaskMeta = running.type === 'task'
    ? { variant: 'task', label: '設計レビュー', subLabel: '', task: { id: 'task-1', categoryId: 'cat-dev' } }
    : { variant: running.type, label: running.type === 'break' ? '休憩中' : '割り込み中', subLabel: running.type === 'break' ? '休憩' : '割り込み作業', task: null };
  return state;
}

describe('shared running timer bar', () => {
  it('opens task details and keeps action buttons from opening the card', async () => {
    const user = userEvent.setup();
    const actions = { openSheet: vi.fn() };
    render(<RunningBar state={stateForRunning({ type: 'task', taskId: 'task-1', start: Date.now() - 2000 })} actions={actions} />);

    const bar = screen.getByRole('button', { name: 'タスクを編集' });
    fireEvent.keyDown(bar, { key: 'Enter' });
    await user.click(screen.getByRole('button', { name: 'interrupt' }));
    await user.click(screen.getByRole('button', { name: 'break' }));
    await user.click(screen.getByRole('button', { name: '停止' }));

    expect(actions.openSheet).toHaveBeenNthCalledWith(1, 'editTask', expect.objectContaining({ id: 'task-1' }));
    expect(actions.openSheet).toHaveBeenNthCalledWith(2, 'interrupt');
    expect(actions.openSheet).toHaveBeenNthCalledWith(3, 'break');
    expect(actions.openSheet).toHaveBeenNthCalledWith(4, 'confirmStop');
  });

  it('uses the same detail and stop behavior for interruptions and breaks', async () => {
    const user = userEvent.setup();
    const actions = { openSheet: vi.fn() };
    const { rerender } = render(<RunningBar state={stateForRunning({ type: 'interrupt', start: Date.now() - 2000 })} actions={actions} />);

    await user.click(screen.getByRole('button', { name: '割り込み作業を記録' }));
    await user.click(screen.getByRole('button', { name: '停止' }));
    rerender(<RunningBar state={stateForRunning({ type: 'break', start: Date.now() - 180000, plannedBreakDurationMinutes: 1 })} actions={actions} compact raised />);
    await user.click(screen.getByRole('button', { name: '休憩記録' }));
    await user.click(screen.getByRole('button', { name: '停止' }));

    expect(actions.openSheet).toHaveBeenNthCalledWith(1, 'interrupt');
    expect(actions.openSheet).toHaveBeenNthCalledWith(2, 'resumeOrStop');
    expect(actions.openSheet).toHaveBeenNthCalledWith(3, 'break');
    expect(actions.openSheet).toHaveBeenNthCalledWith(4, 'resumeOrStop');
  });
});
