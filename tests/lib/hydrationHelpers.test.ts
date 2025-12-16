import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as idbKeyval from 'idb-keyval';
import { hydrateTasksData } from '@/store/hydrationHelpers';
import type { MyTask } from '@/types';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

describe('hydrateTasksData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty collections when nothing is stored', async () => {
    (idbKeyval.get as Mock).mockResolvedValueOnce(undefined) // mytasks-store
      .mockResolvedValueOnce(undefined); // task-ledger

    const result = await hydrateTasksData();

    expect(result.myTasks).toHaveLength(0);
    expect(result.taskLedger).toEqual({});
    expect(idbKeyval.set).toHaveBeenCalledWith('task-ledger', {});
  });

  it('hydrates stored tasks even when ledger is missing and persists normalized data', async () => {
    const storedTask: MyTask = {
      id: 'task-1',
      name: 'Stored Task',
      isCompleted: false,
      order: 0,
      createdAt: Date.now() - 1_000,
    };

    (idbKeyval.get as Mock)
      .mockImplementation((key: string) => {
        if (key === 'mytasks-store') return Promise.resolve([storedTask]);
        if (key === 'task-ledger') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });

    const result = await hydrateTasksData();

    expect(result.myTasks).toHaveLength(1);
    expect(result.myTasks[0]).toMatchObject({ id: 'task-1', name: 'Stored Task' });
    expect(result.taskLedger['task-1']).toMatchObject({ id: 'task-1', name: 'Stored Task' });

    const setCalls = (idbKeyval.set as Mock).mock.calls;
    expect(setCalls).toEqual(
      expect.arrayContaining([
        ['mytasks-store', expect.any(Array)],
        ['task-ledger', expect.any(Object)],
      ]),
    );
  });
});
