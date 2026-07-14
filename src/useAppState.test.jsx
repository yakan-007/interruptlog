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
      load: vi.fn(async () => stored),
      save: vi.fn(async () => {}),
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

  it('exposes only persistence failures and clears them after a successful retry', async () => {
    let shouldFail = true;
    const storage = {
      load: vi.fn(async () => createEmptyState()),
      save: vi.fn(async () => {
        if (shouldFail) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }),
    };
    const clock = fixedClock();
    const { result } = renderHook(() => useAppState({ clock, storage }));

    await waitFor(() => expect(result.current.persistenceError).toBe('toasts.storageSaveFailed'));

    shouldFail = false;
    act(() => result.current.actions.setDark(true));

    await waitFor(() => expect(result.current.persistenceError).toBeNull());
  });
});
