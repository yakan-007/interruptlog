import { describe, expect, it, vi } from 'vitest';
import { handleAppStateChange } from './lifecycle';

describe('app lifecycle', () => {
  it('persists the latest state when the app becomes inactive', () => {
    const persistNow = vi.fn(() => Promise.resolve());
    const resyncNow = vi.fn();

    handleAppStateChange({ isActive: false }, { persistNow, resyncNow });

    expect(persistNow).toHaveBeenCalledTimes(1);
    expect(resyncNow).not.toHaveBeenCalled();
  });

  it('resyncs timer displays when the app becomes active again', () => {
    const persistNow = vi.fn(() => Promise.resolve());
    const resyncNow = vi.fn();

    handleAppStateChange({ isActive: true }, { persistNow, resyncNow });

    expect(resyncNow).toHaveBeenCalledTimes(1);
    expect(persistNow).not.toHaveBeenCalled();
  });
});
