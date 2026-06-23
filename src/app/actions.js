import { createDataCommands } from './commands/data';
import { createPreferenceCommands } from './commands/preferences';
import { createRecordCommands } from './commands/records';
import { createTaskCommands } from './commands/tasks';

function toActionResult(result) {
  return { ok: !result?.error, error: result?.error ?? null, taskId: result?.taskId ?? null };
}

export function createAppActions(dependencies) {
  const {
    currentState,
    mutate,
    overlapRepairPreview,
    setLastError,
    setOverlapRepairUi,
    setTrackedAppState,
  } = dependencies;
  const getState = () => currentState;
  const mutateWith = (action) => (...args) => mutate((state) => action(state, ...args));
  const applyResult = (result) => {
    setTrackedAppState(result.state);
    setLastError(result.error ?? null);
    return toActionResult(result);
  };
  const context = {
    applyResult,
    getState,
    mutate,
    mutateWith,
    overlapRepairPreview,
    setLastError,
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
