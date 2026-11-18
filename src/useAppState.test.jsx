import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyState } from './state';
import { useAppState } from './useAppState';

afterEach(() => cleanup());

function fixedClock() {
  return { now: vi.fn(() => Date.parse('2026-07-14T09:30:00+09:00')) };
}

describe('useAppState ports', () => {
  it('hydrates and persists through an injected storage adapter', async () => {
    const stored = createEmptyState();
    stored.preferences.onboardingDone = true;
    const storage = {
      load: vi.fn(async () => ({ status: 'ok', state: stored })),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.actions.setDark(true));

    await waitFor(() => {
      expect(storage.save).toHaveBeenLastCalledWith(expect.objectContaining({
        preferences: expect.objectContaining({ dark: true }),
      }));
    });
    expect(storage.load).toHaveBeenCalledTimes(1);
  });

  it('takes over what another tab saved without writing it back', async () => {
    const stored = createEmptyState();
    stored.preferences.onboardingDone = true;
    let notifyOtherTab = null;
    const storage = {
      load: vi.fn(async () => ({ status: 'ok', state: stored })),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
      subscribe: vi.fn((callback) => {
        notifyOtherTab = callback;
        return () => {};
      }),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(notifyOtherTab).toBeTypeOf('function'));
    storage.save.mockClear();
    const fromOtherTab = { ...stored, whoChips: ['別タブ'] };
    act(() => notifyOtherTab(fromOtherTab));

    expect(result.current.state.whoChips).toEqual(['別タブ']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(storage.save).not.toHaveBeenCalled();

    act(() => result.current.actions.setDark(true));
    await waitFor(() => {
      expect(storage.save).toHaveBeenLastCalledWith(expect.objectContaining({
        whoChips: ['別タブ'],
        preferences: expect.objectContaining({ dark: true }),
      }));
    });
  });

  it('exposes only persistence failures and clears them after a successful retry', async () => {
    let shouldFail = true;
    const storage = {
      load: vi.fn(async () => ({ status: 'ok', state: createEmptyState() })),
      save: vi.fn(async () => {
        if (shouldFail) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }),
      clear: vi.fn(async () => {}),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(result.current.persistenceError).toBe('toasts.storageSaveFailed'));

    shouldFail = false;
    act(() => result.current.actions.setDark(true));

    await waitFor(() => expect(result.current.persistenceError).toBeNull());
  });

  it('holds corrupt JSON outside the app state until an explicit reset succeeds', async () => {
    const storage = {
      load: vi.fn(async () => ({ status: 'corrupt', raw: '{broken-json' })),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(result.current.storageRecovery?.raw).toBe('{broken-json'));
    expect(result.current.ready).toBe(false);
    expect(storage.save).not.toHaveBeenCalled();

    let resetResult;
    await act(async () => { resetResult = await result.current.storageRecovery.reset(); });

    expect(resetResult).toEqual({ ok: true });
    expect(storage.clear).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.storageRecovery).toBeNull();
  });

  it('keeps recovery active when corrupt storage cannot be cleared', async () => {
    const storage = {
      load: vi.fn(async () => ({ status: 'corrupt', raw: '{still-broken' })),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => { throw new DOMException('denied', 'SecurityError'); }),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(result.current.storageRecovery).not.toBeNull());
    let resetResult;
    await act(async () => { resetResult = await result.current.storageRecovery.reset(); });

    expect(resetResult).toEqual({ ok: false });
    expect(result.current.ready).toBe(false);
    expect(result.current.storageRecovery?.raw).toBe('{still-broken');
    expect(storage.save).not.toHaveBeenCalled();
  });
});
