import { createDataCommands } from './commands/data';
import { createPreferenceCommands } from './commands/preferences';
import { createRecordCommands } from './commands/records';
import { createTaskCommands } from './commands/tasks';
import { systemClock } from '../platform/clock';
import { systemIdGenerator } from '../platform/idGenerator';

function toActionResult(result) {
  return { ok: !result?.errorCode, errorCode: result?.errorCode ?? null, taskId: result?.taskId ?? null };
}

export function createAppActions(dependencies) {
  const {
    currentState,
    clock = systemClock,
    idGenerator = systemIdGenerator,
    mutate,
    overlapRepairPreview,
    setOverlapRepairUi,
    setTrackedAppState,
  } = dependencies;
  const getState = () => currentState;
  const now = () => clock.now();
  const createId = (prefix, timestamp) => idGenerator.next(prefix, timestamp);
  const mutateWith = (action) => (...args) => mutate((state) => action(state, ...args));
  const applyResult = (result) => {
    setTrackedAppState(result.state);
    return toActionResult(result);
  };
  const context = {
    applyResult,
    createId,
    getState,
    mutate,
    mutateWith,
    now,
    overlapRepairPreview,
    setOverlapRepairUi,
    setTrackedAppState,
  };

  return {
    ...createTaskCommands(context),
    ...createRecordCommands(context),
    ...createPreferenceCommands(context),
    ...createDataCommands(context),
  };
}
