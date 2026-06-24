import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import BreakSheet from './BreakSheet';

afterEach(() => cleanup());

describe('break timer sheet', () => {
  it('shows the paused task, updates the target, and saves either ending state', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.tasks = [{ id: 'task-1', name: '資料作成' }];
    state.running = { type: 'break', preTaskId: 'task-1', start: Date.now() - 90_000, plannedBreakDurationMinutes: 5 };
    const actions = { cancelInterrupt: vi.fn(), saveBreak: vi.fn(), setBreakTarget: vi.fn(), openSheet: vi.fn() };
    const onClose = vi.fn();
    render(<BreakSheet state={state} actions={actions} onClose={onClose} />);

    expect(screen.getByText('資料作成')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '15分' }));
    await user.click(screen.getByRole('button', { name: '保存して終了' }));
    await user.click(screen.getByRole('button', { name: '保存して再開' }));
    await user.click(screen.getByRole('button', { name: '別の予定外対応' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(actions.setBreakTarget).toHaveBeenCalledWith(15);
    expect(actions.saveBreak).toHaveBeenNthCalledWith(1, { breakDurationMinutes: 5, resume: false });
    expect(actions.saveBreak).toHaveBeenNthCalledWith(2, { breakDurationMinutes: 5, resume: true });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(actions.cancelInterrupt).toHaveBeenCalledTimes(1);
    expect(actions.openSheet).toHaveBeenCalledWith('newInterrupt');
  });
});
