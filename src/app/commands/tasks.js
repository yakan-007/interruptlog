import {
  completeTaskInState,
  createTaskAndStartInState,
  createTaskInState,
  deleteTaskInState,
  endRunningAtInState,
  moveTaskToIndexInState,
  restoreTaskAndStartInState,
  restoreTaskInState,
  saveTaskInState,
  startTaskInState,
  stopTaskInState,
} from '../../state';

export function createTaskCommands({ applyResult, createId, getState, mutate, mutateWith, now }) {
  const dependencies = { createId };
  return {
    startTask: (id) => mutate((state) => startTaskInState(state, id, now(), dependencies)),
    stopTask: (complete) => mutate((state) => stopTaskInState(state, complete, now(), dependencies)),
    completeTask: (id) => mutate((state) => completeTaskInState(state, id, now(), dependencies)),
    restoreTask: mutateWith(restoreTaskInState),
    deleteTask: (id) => mutate((state) => deleteTaskInState(state, id, now(), dependencies)),
    moveTaskToIndex: mutateWith(moveTaskToIndexInState),
    endRunningAt(at) {
      return applyResult(endRunningAtInState(getState(), at, now(), dependencies));
    },
    restoreTaskAndStart(id) {
      return applyResult(restoreTaskAndStartInState(getState(), id, now(), dependencies));
    },
    saveTask(data) {
      return applyResult(saveTaskInState(getState(), data, now(), dependencies));
    },
    createTask(data) {
      return applyResult(createTaskInState(getState(), data, now(), dependencies));
    },
    createTaskAndStart(data) {
      return applyResult(createTaskAndStartInState(getState(), data, now(), dependencies));
    },
  };
}
