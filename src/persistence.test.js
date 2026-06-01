import { describe, expect, it, vi } from 'vitest';
import { createSerializedPersistenceController } from './persistence';

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
