import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import PauseSheet from './PauseSheet';

afterEach(() => cleanup());

function baseActions() {
  return {
    beginNextPause: vi.fn(),
    cancelInterrupt: vi.fn(),
    openSheet: vi.fn(),
    saveBreak: vi.fn(),
    saveInterrupt: vi.fn(),
    selectPauseCategory: vi.fn(),
    setBreakTarget: vi.fn(),
  };
}

describe('pause sheet', () => {
  it('switches from an interruption to a break from now', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'interrupt', start: Date.now() - 30_000, draft: { categoryId: 'int-chat' }, resumeStack: [] };
    const actions = baseActions();

    render(<PauseSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} initialDraft={{ categoryId: 'int-chat' }} />);

    await user.type(screen.getByPlaceholderText('または自由記入'), '追加の確認');
    await user.click(screen.getByRole('button', { name: 'ここで区切って休憩に入る' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('break', expect.objectContaining({
      categoryId: 'int-chat',
      label: '追加の確認',
    }));
  });

  it('switches from a break to an interruption from now', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'break', start: Date.now() - 30_000, categoryId: 'break-lunch', resumeStack: [] };
    const actions = baseActions();

    render(<PauseSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'ここで区切って休憩に入る' })).toBeNull();
    expect(screen.getByRole('button', { name: '休憩', pressed: true })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'ここで区切って割り込みに移る' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('interrupt', expect.objectContaining({ label: '休憩' }));
  });

  it('re-labels the timer from the category row, including break', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'interrupt', start: new Date(2026, 10, 18, 10, 2).getTime(), draft: { categoryId: 'int-chat' }, resumeStack: [] };
    const actions = { ...baseActions(), setPauseKind: vi.fn(), selectPauseCategory: vi.fn() };

    const { rerender } = render(<PauseSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} />);

    expect(screen.getByText('10:02から')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'チャット', pressed: true })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '昼食' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '電話', pressed: false }));
    expect(actions.selectPauseCategory).toHaveBeenCalledWith('int-call');
    await user.click(screen.getByRole('button', { name: '休憩', pressed: false }));
    expect(actions.setPauseKind).toHaveBeenCalledWith('break');

    rerender(<PauseSheet state={{ ...state, running: { ...state.running, type: 'break', draft: null, categoryId: null } }} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '休憩', pressed: true })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '質問' }));
    expect(actions.setPauseKind).toHaveBeenLastCalledWith('interrupt', 'int-q');
  });
});
