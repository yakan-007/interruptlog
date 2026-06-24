import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyState } from '../../state';
import InterruptSheet from './InterruptSheet';

afterEach(() => cleanup());

describe('interrupt timer sheet', () => {
  it('offers direct transitions to another unplanned response or a break', async () => {
    const user = userEvent.setup();
    const state = createEmptyState();
    state.running = { type: 'interrupt', start: Date.now() - 30_000, draft: {}, resumeStack: [] };
    const actions = { openSheet: vi.fn(), cancelInterrupt: vi.fn(), saveInterrupt: vi.fn() };
    const onDraftChange = vi.fn();
    render(<InterruptSheet state={state} actions={actions} onClose={vi.fn()} onDraftChange={onDraftChange} initialDraft={{}} />);

    await user.click(screen.getByRole('button', { name: '別の予定外対応' }));
    await user.click(screen.getByRole('button', { name: '休憩を始める' }));

    expect(actions.openSheet).toHaveBeenNthCalledWith(1, 'newInterrupt');
    expect(actions.openSheet).toHaveBeenNthCalledWith(2, 'newBreak');
    expect(onDraftChange).toHaveBeenCalled();
  });
});
