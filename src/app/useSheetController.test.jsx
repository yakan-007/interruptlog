import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyState } from '../state';
import { useSheetController } from './useSheetController';

afterEach(() => cleanup());

function createApp(running = null) {
  const state = createEmptyState();
  state.running = running;
  return {
    state,
    actions: {
      beginPause: vi.fn(),
      updateInterruptDraft: vi.fn(),
    },
    overlapRepair: { pending: null },
  };
}

describe('useSheetController', () => {
  it('starts and opens the canonical pause sheet', () => {
    const app = createApp();
    const { result } = renderHook(() => useSheetController(app, false));

    act(() => result.current.openSheet('newPause', { categoryId: 'int-call' }));

    expect(app.actions.beginPause).toHaveBeenCalledWith('int-call');
    expect(result.current.activeSheet).toBe('pause');
    expect(result.current.activeSheetArg).toBe(null);
  });

  it('reopens an active pause without starting another session', () => {
    const draft = { categoryId: 'int-chat', who: '田中' };
    const app = createApp({
      type: 'interrupt',
      start: 1000,
      draft,
      resumeStack: [],
    });
    const { result } = renderHook(() => useSheetController(app, false));

    act(() => result.current.openSheet('newPause'));

    expect(app.actions.beginPause).not.toHaveBeenCalled();
    expect(result.current.activeSheet).toBe('pause');
    expect(result.current.activeSheetArg).toBe(null);
  });

  it('keeps pause drafts in the running pause', () => {
    const app = createApp();
    const { result } = renderHook(() => useSheetController(app, false));
    const draft = { categoryId: 'int-call', label: '確認' };

    act(() => result.current.openSheet('pause'));
    act(() => result.current.updateInterruptDraft(draft));

    expect(app.actions.updateInterruptDraft).toHaveBeenCalledWith(draft);
    expect(result.current.activeSheetArg).toBeUndefined();
  });

  it('restores non-pause sheets without triggering domain actions', () => {
    const app = createApp();
    const { result } = renderHook(() => useSheetController(app, false));
    const draft = { id: 'event-1' };

    act(() => result.current.restoreSheet('editEvent', draft));

    expect(app.actions.beginPause).not.toHaveBeenCalled();
    expect(result.current.activeSheet).toBe('editEvent');
    expect(result.current.activeSheetArg).toEqual(draft);
  });
});
