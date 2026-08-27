import { describe, expect, it, vi } from 'vitest';
import { createSerializedPersistenceController } from './persistence/controller';
import { browserStateStorage } from './persistence/storage';
import { STATE_KEY } from './constants';

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('serialized persistence', () => {
  it('persists only the latest queued snapshot', async () => {
    const writes = [];
    const controller = createSerializedPersistenceController(async (state) => {
      writes.push(state.id);
    });

    await Promise.all([
      controller.schedule({ id: 'a' }),
      controller.schedule({ id: 'b' }),
      controller.schedule({ id: 'c' }),
    ]);

    expect(writes).toEqual(['c']);
  });

  it('writes the newest pending snapshot after an in-flight save finishes', async () => {
    const writes = [];
    const deferred = createDeferred();
    const started = createDeferred();
    const writeState = vi.fn(async (state) => {
      writes.push(state.id);
      if (state.id === 'a') {
        started.resolve();
        await deferred.promise;
      }
    });
    const controller = createSerializedPersistenceController(writeState);

    const first = controller.schedule({ id: 'a' });
    await started.promise;
    const second = controller.schedule({ id: 'b' });
    const third = controller.schedule({ id: 'c' });

    deferred.resolve();
    await Promise.all([first, second, third]);

    expect(writes).toEqual(['a', 'c']);
    expect(writeState).toHaveBeenCalledTimes(2);
  });
});

describe('browser state storage', () => {
  it('returns a discriminated result for missing and valid state', async () => {
    localStorage.clear();
    await expect(browserStateStorage.load()).resolves.toEqual({ status: 'ok', state: null });

    localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, events: [] }));
    await expect(browserStateStorage.load()).resolves.toEqual({
      status: 'ok',
      state: { version: 1, events: [] },
    });
  });

  it('preserves malformed JSON and returns the exact raw payload', async () => {
    const raw = '{"events":[broken';
    localStorage.setItem(STATE_KEY, raw);

    await expect(browserStateStorage.load()).resolves.toEqual({ status: 'corrupt', raw });
    expect(localStorage.getItem(STATE_KEY)).toBe(raw);
  });

  it('clears only the current application state key', async () => {
    localStorage.setItem(STATE_KEY, '{broken');
    localStorage.setItem('unrelated-key', 'keep-me');

    await browserStateStorage.clear();

    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
    localStorage.clear();
  });
});
