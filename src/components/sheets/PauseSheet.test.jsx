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
    await user.click(screen.getByRole('button', { name: '今から休憩に入る' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('break-rest', expect.objectContaining({
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

    expect(screen.queryByRole('button', { name: '今から休憩に入る' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '割り込みが入った' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('int-call', expect.objectContaining({ categoryId: 'break-lunch' }));
  });
});
