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
  it('can save the current interruption and start another unplanned response', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'interrupt', start: Date.now() - 30_000, draft: { categoryId: 'int-call' }, resumeStack: [] };
    const actions = baseActions();

    render(<PauseSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} initialDraft={{ categoryId: 'int-call' }} />);

    await user.type(screen.getByPlaceholderText('または自由記入'), '追加の確認');
    await user.click(screen.getByRole('button', { name: '別の予定外対応' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('int-call', expect.objectContaining({
      categoryId: 'int-call',
      label: '追加の確認',
      urgency: 'med',
    }));
  });

  it('can save the current interruption and switch into a break', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'interrupt', start: Date.now() - 30_000, draft: { categoryId: 'int-chat' }, resumeStack: [] };
    const actions = baseActions();

    render(<PauseSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={vi.fn()} initialDraft={{ categoryId: 'int-chat' }} />);

    await user.click(screen.getByRole('button', { name: '休憩を始める' }));

    expect(actions.beginNextPause).toHaveBeenCalledWith('break-rest', expect.objectContaining({
      categoryId: 'int-chat',
      label: 'チャット',
    }));
  });
});
